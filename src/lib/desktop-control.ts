import { execFile, spawn } from 'child_process';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ----------------------------------------------------------------------------
// CONTRÔLE RÉEL DU BUREAU WINDOWS
//
// Principe : on ne déclare JAMAIS « ouvert » sans preuve. Après chaque
// lancement, on énumère les fenêtres du bureau interactif (EnumWindows), on
// restaure / amène la fenêtre au premier plan, puis on VÉRIFIE que c'est bien
// elle qui a le focus. Les frappes clavier (Ctrl+V, Entrée…) ne sont envoyées
// que si cette vérification réussit, et sont interrompues si le focus change.
// ----------------------------------------------------------------------------

export interface WindowTarget {
  /** Noms de processus (sans .exe, insensibles à la casse). */
  processNames: string[];
  /** Regex appliquée au titre de fenêtre. */
  titleRegex?: string;
  /** Si vrai, le titre doit aussi correspondre pour les processus listés (navigateurs). */
  strictTitle?: boolean;
}

export interface KeyStep {
  /** Pause en millisecondes avant l'action. */
  wait?: number;
  /** Place ce texte dans le presse-papier Windows. */
  clip?: string;
  /** Touches au format WScript SendKeys (ex: "^v", "{ENTER}"). */
  send?: string;
}

export interface ActivationResult {
  found: boolean;
  foreground: boolean;
  title: string;
  processName: string;
  pid: number;
  stepsDone: number;
  stepsTotal: number;
  aborted: boolean;
  abortReason: string;
  waitedMs: number;
  error?: string;
}

const PS_SCRIPT = String.raw`
param([Parameter(Mandatory=$true)][string]$PayloadB64)
$ErrorActionPreference = 'Stop'
$result = [ordered]@{ found=$false; foreground=$false; title=''; processName=''; pid=0; stepsDone=0; stepsTotal=0; aborted=$false; abortReason=''; waitedMs=0 }
try {
  $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PayloadB64))
  $payload = $json | ConvertFrom-Json
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class JW {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int idx);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte sc, uint fl, UIntPtr ex);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();

  public class Win { public long H; public string Title; public string Proc; public uint Pid; public bool Visible; }

  public static List<Win> All() {
    List<Win> list = new List<Win>();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      int len = GetWindowTextLength(h);
      if (len <= 0) return true;
      if (GetWindow(h, 4) != IntPtr.Zero) return true;
      int ex = GetWindowLong(h, -20);
      if ((ex & 0x80) != 0 && (ex & 0x40000) == 0) return true;
      StringBuilder sb = new StringBuilder(len + 1);
      GetWindowText(h, sb, sb.Capacity);
      uint pid; GetWindowThreadProcessId(h, out pid);
      string pn = "";
      try { pn = Process.GetProcessById((int)pid).ProcessName; } catch (Exception) { }
      Win w = new Win();
      w.H = h.ToInt64(); w.Title = sb.ToString(); w.Proc = pn; w.Pid = pid; w.Visible = IsWindowVisible(h);
      list.Add(w);
      return true;
    }, IntPtr.Zero);
    return list;
  }

  public static long Foreground() { return GetForegroundWindow().ToInt64(); }

  public static bool Focus(long hv) {
    IntPtr h = new IntPtr(hv);
    keybd_event(0x12, 0, 0, UIntPtr.Zero);
    keybd_event(0x12, 0, 2, UIntPtr.Zero);
    if (IsIconic(h)) ShowWindow(h, 9); else ShowWindow(h, 5);
    IntPtr fg = GetForegroundWindow();
    uint tmp; uint fgT = GetWindowThreadProcessId(fg, out tmp);
    uint me = GetCurrentThreadId();
    if (fgT != me) AttachThreadInput(me, fgT, true);
    BringWindowToTop(h);
    SetForegroundWindow(h);
    if (fgT != me) AttachThreadInput(me, fgT, false);
    System.Threading.Thread.Sleep(150);
    return GetForegroundWindow() == h;
  }
}
"@

  $names = @($payload.processNames | ForEach-Object { ([string]$_).ToLower() })
  $rx = [string]$payload.titleRegex
  $strict = [bool]$payload.strictTitle

  function Find-Target {
    $cands = @()
    foreach ($w in [JW]::All()) {
      $p = $w.Proc.ToLower()
      $byProc = $names -contains $p
      $byFrame = ($p -eq 'applicationframehost') -and $rx -and ($w.Title -match $rx)
      if ($byProc -and $strict -and $rx -and -not ($w.Title -match $rx)) { continue }
      if ($byProc -or $byFrame) { $cands += $w }
    }
    if ($cands.Count -eq 0) { return $null }
    $vis = @($cands | Where-Object { $_.Visible })
    if ($vis.Count -gt 0) { return $vis[0] }
    return $cands[0]
  }

  $sw = [Diagnostics.Stopwatch]::StartNew()
  $target = $null
  $attempts = 0
  while ($sw.ElapsedMilliseconds -lt [int]$payload.timeoutMs) {
    $target = Find-Target
    if ($target) {
      $result.found = $true
      $result.title = $target.Title
      $result.processName = $target.Proc
      $result.pid = [int]$target.Pid
      $attempts++
      if ([JW]::Focus($target.H)) { $result.foreground = $true; break }
      if ($attempts -ge 5) { break }
    }
    Start-Sleep -Milliseconds 400
  }

  $steps = @($payload.steps)
  if ($steps.Count -eq 1 -and $steps[0] -eq $null) { $steps = @() }
  $result.stepsTotal = $steps.Count
  if ($result.foreground -and $steps.Count -gt 0) {
    $ws = New-Object -ComObject WScript.Shell
    foreach ($s in $steps) {
      if ($s.wait) { Start-Sleep -Milliseconds ([int]$s.wait) }
      if ($s.clip -ne $null) { Set-Clipboard -Value ([string]$s.clip) }
      if ($s.send) {
        if ([JW]::Foreground() -ne $target.H) {
          if (-not [JW]::Focus($target.H)) { $result.aborted = $true; $result.abortReason = 'focus_lost'; break }
        }
        $ws.SendKeys([string]$s.send)
      }
      $result.stepsDone++
    }
    $now = Find-Target
    if ($now) { $result.title = $now.Title }
  }
  $result.waitedMs = [int]$sw.ElapsedMilliseconds
} catch {
  $result.error = $_.Exception.Message
}
$result | ConvertTo-Json -Compress
`;

let scriptPathCache: string | null = null;

function ensureScript(): string {
  if (scriptPathCache && fs.existsSync(scriptPathCache)) return scriptPathCache;
  const p = path.join(os.tmpdir(), 'jarvis-desktop-control.ps1');
  fs.writeFileSync(p, PS_SCRIPT, 'utf8');
  scriptPathCache = p;
  return p;
}

const EMPTY_RESULT: ActivationResult = {
  found: false,
  foreground: false,
  title: '',
  processName: '',
  pid: 0,
  stepsDone: 0,
  stepsTotal: 0,
  aborted: false,
  abortReason: '',
  waitedMs: 0,
};

/**
 * Attend l'apparition d'une fenêtre, l'amène au premier plan, VÉRIFIE le focus,
 * puis exécute (optionnellement) des frappes protégées par ce focus.
 */
export function activateWindow(
  target: WindowTarget,
  opts: { timeoutMs?: number; steps?: KeyStep[] } = {}
): Promise<ActivationResult> {
  const timeoutMs = opts.timeoutMs ?? 9000;
  const payload = {
    processNames: target.processNames,
    titleRegex: target.titleRegex || '',
    strictTitle: !!target.strictTitle,
    timeoutMs,
    steps: opts.steps || [],
  };
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');

  return new Promise((resolve) => {
    let script: string;
    try {
      script = ensureScript();
    } catch (e: any) {
      return resolve({ ...EMPTY_RESULT, error: `Écriture du script impossible : ${e.message}` });
    }

    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', script, '-PayloadB64', b64],
      { timeout: timeoutMs + 20000, windowsHide: true, maxBuffer: 1024 * 1024, encoding: 'utf8' },
      (err, stdout, stderr) => {
        const lines = String(stdout || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const last = lines[lines.length - 1];
        if (last && last.startsWith('{')) {
          try {
            return resolve({ ...EMPTY_RESULT, ...JSON.parse(last) });
          } catch {
            /* tombe sur l'erreur ci-dessous */
          }
        }
        resolve({ ...EMPTY_RESULT, error: (err && err.message) || String(stderr || 'Sortie PowerShell illisible') });
      }
    );
  });
}

/** Lance un processus détaché dans le bureau de l'utilisateur. */
export function startDetached(cmd: string, args: string[] = []): void {
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

/** Ouvre une URL dans le navigateur par défaut (sans passer par cmd, donc sans casse sur « & »). */
export function openInDefaultBrowser(url: string): void {
  startDetached('explorer.exe', [url]);
}

// ----------------------------------------------------------------------------
// CIBLES DE FENÊTRES CONNUES
// ----------------------------------------------------------------------------

export const BROWSER_PROCESSES = ['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi'];

const KNOWN_TARGETS: Record<string, WindowTarget> = {
  whatsapp: { processNames: ['whatsapp.root', 'whatsapp', 'whatsappdesktop'], titleRegex: '^WhatsApp' },
  spotify: { processNames: ['spotify'], titleRegex: 'Spotify' },
  lovable: { processNames: ['lovable'], titleRegex: '' },
  excel: { processNames: ['excel'] },
  word: { processNames: ['winword'] },
  powerpoint: { processNames: ['powerpnt'] },
  notepad: { processNames: ['notepad'] },
  paint: { processNames: ['mspaint', 'paintapp'] },
  calculator: { processNames: ['calculatorapp', 'calculator', 'calc'], titleRegex: 'Calculatrice|Calculator' },
  chrome: { processNames: ['chrome'] },
  edge: { processNames: ['msedge'] },
  vscode: { processNames: ['code'] },
  antigravity: { processNames: ['antigravity ide', 'antigravity'] },
  canva: { processNames: ['canva'] },
  capcut: { processNames: ['capcut', 'capcut-bin'] },
  vlc: { processNames: ['vlc'] },
  telegram: { processNames: ['telegram'], titleRegex: '^Telegram' },
  facebook: { processNames: ['facebook'], titleRegex: '^Facebook' },
  instagram: { processNames: ['instagram'], titleRegex: '^Instagram' },
  tiktok: { processNames: ['tiktok'], titleRegex: '^TikTok' },
  bluestacks: { processNames: ['hd-player', 'bluestacks', 'bluestacksx'] },
};

const NAME_TO_KEY: Array<[RegExp, string]> = [
  [/whatsapp/i, 'whatsapp'],
  [/spotify/i, 'spotify'],
  [/lovable|movable/i, 'lovable'],
  [/excel/i, 'excel'],
  [/word/i, 'word'],
  [/powerpoint/i, 'powerpoint'],
  [/bloc.?notes?|notepad/i, 'notepad'],
  [/paint/i, 'paint'],
  [/calculatrice|calculator/i, 'calculator'],
  [/chrome/i, 'chrome'],
  [/edge/i, 'edge'],
  [/visual studio code|^code$/i, 'vscode'],
  [/antigravity/i, 'antigravity'],
  [/canva/i, 'canva'],
  [/capcut/i, 'capcut'],
  [/vlc/i, 'vlc'],
  [/telegram/i, 'telegram'],
  [/facebook/i, 'facebook'],
  [/instagram/i, 'instagram'],
  [/tiktok/i, 'tiktok'],
  [/bluestacks/i, 'bluestacks'],
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function windowTargetFor(appName: string): WindowTarget {
  for (const [rx, key] of NAME_TO_KEY) {
    if (rx.test(appName)) return KNOWN_TARGETS[key];
  }
  const compact = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    processNames: [compact, appName.toLowerCase().trim()],
    titleRegex: '^' + escapeRegex(appName.trim()),
  };
}

export const SPOTIFY_TARGET = KNOWN_TARGETS.spotify;
export const WHATSAPP_TARGET = KNOWN_TARGETS.whatsapp;

// ----------------------------------------------------------------------------
// COMPTE-RENDU HONNÊTE (le texte reflète uniquement ce qui a été constaté)
// ----------------------------------------------------------------------------

export function describeActivation(label: string, r: ActivationResult): string {
  if (r.error && !r.found) {
    return `❌ Je n'ai pas pu vérifier l'ouverture de **${label}** (erreur de contrôle de fenêtre : ${r.error}).`;
  }
  if (r.foreground) {
    return `✅ **${label}** est ouvert et au premier plan (fenêtre « ${r.title} » détectée et vérifiée).`;
  }
  if (r.found) {
    return `⚠️ **${label}** est lancé (fenêtre « ${r.title} » détectée) mais Windows a refusé de la passer au premier plan : elle est dans votre barre des tâches.`;
  }
  return `❌ J'ai envoyé l'ordre de lancement de **${label}**, mais aucune fenêtre n'est apparue en ${Math.round(r.waitedMs / 1000)} s. L'application est peut-être absente, bloquée ou encore en démarrage.`;
}

// ----------------------------------------------------------------------------
// RÉSOLUTION D'UNE VRAIE VIDÉO YOUTUBE (aucun identifiant inventé)
// ----------------------------------------------------------------------------

export function resolveYouTubeVideo(query: string, timeoutMs = 9000): Promise<{ id: string } | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { id: string } | null) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Cookie: 'CONSENT=YES+1',
        },
      },
      (res) => {
        let html = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          html += c;
          const m = html.match(/"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"/);
          if (m) {
            finish({ id: m[1] });
            res.destroy();
          }
        });
        res.on('end', () => finish(null));
        res.on('error', () => finish(null));
      }
    );
    req.on('error', () => finish(null));
    setTimeout(() => {
      req.destroy();
      finish(null);
    }, timeoutMs);
  });
}
