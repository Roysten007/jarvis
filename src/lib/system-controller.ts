import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Exécution directe d'un processus Windows sans intermédiaire cmd.exe
// Exécution d'un processus Windows avec forçage de focus au premier plan de l'écran
export function launchForeground(
  target: string,
  args: string[] = [],
  windowTitleHints: string[] = []
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    try {
      const escapedTarget = target.replace(/'/g, "''");
      const argsArray = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(',');
      const activateCode = windowTitleHints
        .map((h) => `$ws.AppActivate('${h.replace(/'/g, "''")}');`)
        .join(' ');

      const psScript = `
        $t = '${escapedTarget}';
        if ($t.StartsWith('shell:') -or $t.StartsWith('whatsapp:') -or $t.StartsWith('spotify:') -or $t.StartsWith('http:') -or $t.StartsWith('https:')) {
          Start-Process $t;
        } elseif (Test-Path $t -PathType Leaf -Filter *.lnk) {
          Invoke-Item $t;
        } elseif ('${argsArray}') {
          Start-Process $t -ArgumentList @(${argsArray});
        } else {
          Start-Process $t;
        }
        Start-Sleep -Milliseconds 600;
        $ws = New-Object -ComObject WScript.Shell;
        ${activateCode}
      `;

      const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      p.unref();

      resolve({ success: true, message: `Lancé et activé au premier plan : ${path.basename(target)}` });
    } catch (err: any) {
      resolve({ success: false, message: `Erreur : ${err.message}` });
    }
  });
}

// Action WhatsApp : Rédiger ou envoyer un message directement
export async function sendWhatsAppMessage(
  messageText: string,
  contactOrPhone?: string
): Promise<{ success: boolean; message: string }> {
  const text = messageText.trim();
  const encoded = encodeURIComponent(text);

  // Si un numéro est détecté (+229..., 00229...)
  const cleanPhone = contactOrPhone?.replace(/[^0-9]/g, '');
  if (cleanPhone && cleanPhone.length >= 8) {
    return launchForeground(`whatsapp://send?phone=${cleanPhone}&text=${encoded}`, [], ['WhatsApp']);
  }

  return launchForeground(`whatsapp://send?text=${encoded}`, [], ['WhatsApp']);
}

// Action Spotify : Lancer Spotify et rechercher/jouer un morceau ou artiste
export async function playSpotify(query?: string): Promise<{ success: boolean; message: string }> {
  if (query && query.trim()) {
    const enc = encodeURIComponent(query.trim());
    launchForeground(`spotify:search:${enc}`, [], ['Spotify']);
    return openUrl(`https://open.spotify.com/search/${enc}`);
  }
  launchForeground('shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', [], ['Spotify']);
  return openUrl('https://open.spotify.com');
}

// Action VS Code : Ouvrir un projet ou fichier au premier plan
export async function openVSCode(targetPath?: string): Promise<{ success: boolean; message: string }> {
  const proj = targetPath || 'c:\\Users\\ADMIN\\Documents\\Jarvis';
  const p = findExistingExe(KNOWN_PATHS.vscode);
  if (p) {
    return launchForeground(p, ['-n', proj], ['Visual Studio Code', 'Code', 'ZCode']);
  }
  return launchForeground('cmd.exe', ['/c', 'code', '-n', proj], ['Visual Studio Code', 'Code']);
}

// Action YouTube : Recherche et lancement de vidéo
export async function searchYouTube(query: string): Promise<{ success: boolean; message: string }> {
  const enc = encodeURIComponent(query.trim());
  return openUrl(`https://www.youtube.com/results?search_query=${enc}`);
}

// Action Google : Recherche Web directe
export async function searchGoogle(query: string): Promise<{ success: boolean; message: string }> {
  const enc = encodeURIComponent(query.trim());
  return openUrl(`https://www.google.com/search?q=${enc}`);
}

// Chemins d'exécutables vérifiés sur Windows
const KNOWN_PATHS = {
  chrome: [
    `C:\\Users\\ADMIN\\Desktop\\Google Chrome.lnk`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
  ],
  edge: [
    `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`,
    `C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
  vscode: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\ZCode\\ZCode.exe`,
    `C:\\Users\\ADMIN\\Desktop\\ZCode.lnk`,
  ],
  spotify: [
    `shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Microsoft\\WindowsApps\\Spotify.exe`,
  ],
  canva: [
    `C:\\Users\\ADMIN\\Desktop\\Canva.lnk`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Canva\\Canva.exe`,
  ],
  capcut: [
    `C:\\Users\\ADMIN\\Desktop\\CapCut.lnk`,
    `C:\\Users\\ADMIN\\AppData\\Local\\CapCut\\Apps\\CapCut.exe`,
  ],
  word: [
    `C:\\Users\\ADMIN\\Desktop\\Word.lnk`,
    `C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE`,
  ],
  excel: [
    `C:\\Users\\ADMIN\\Desktop\\Excel.lnk`,
    `C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE`,
  ],
  powerpoint: [
    `C:\\Users\\ADMIN\\Desktop\\PowerPoint.lnk`,
    `C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE`,
  ],
};

function findExistingExe(paths: string[]): string | null {
  for (const p of paths) {
    if (p.startsWith('shell:')) return p;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 1. OUVRIR UNE APPLICATION SUR L'ORDINATEUR AVEC FOCUS ÉCRAN
export async function launchApp(appName: string, targetPath?: string): Promise<{ success: boolean; message: string }> {
  const name = appName.toLowerCase().trim();

  // Visual Studio Code / ZCode
  if (name.includes('code') || name.includes('vs') || name.includes('zcode')) {
    return openVSCode(targetPath);
  }

  // Google Chrome
  if (name.includes('chrome')) {
    const p = findExistingExe(KNOWN_PATHS.chrome);
    const url = targetPath || 'https://google.com';
    if (p) return launchForeground(p, [url], ['Google Chrome', 'Chrome']);
    return openUrl(url);
  }

  // WhatsApp Desktop
  if (name.includes('whatsapp')) {
    return launchForeground('shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App', [], ['WhatsApp']);
  }

  // Spotify
  if (name.includes('spotify') || name.includes('musique')) {
    return playSpotify();
  }

  // Canva
  if (name.includes('canva')) {
    const p = findExistingExe(KNOWN_PATHS.canva);
    if (p) return launchForeground(p, [], ['Canva']);
    return openUrl('https://canva.com');
  }

  // CapCut
  if (name.includes('capcut')) {
    const p = findExistingExe(KNOWN_PATHS.capcut);
    if (p) return launchForeground(p, [], ['CapCut']);
  }

  // Word
  if (name.includes('word') || name.includes('texte')) {
    const p = findExistingExe(KNOWN_PATHS.word);
    if (p) return launchForeground(p, [], ['Word']);
  }

  // Excel
  if (name.includes('excel') || name.includes('tableur')) {
    const p = findExistingExe(KNOWN_PATHS.excel);
    if (p) return launchForeground(p, [], ['Excel']);
  }

  // PowerPoint
  if (name.includes('powerpoint') || name.includes('slide')) {
    const p = findExistingExe(KNOWN_PATHS.powerpoint);
    if (p) return launchForeground(p, [], ['PowerPoint']);
  }

  // Bloc-notes
  if (name.includes('notepad') || name.includes('bloc')) {
    return launchForeground('notepad.exe', targetPath ? [targetPath] : [], ['Bloc-notes', 'Notepad']);
  }

  // Calculatrice
  if (name.includes('calc')) {
    return launchForeground('calc.exe', [], ['Calculatrice', 'Calculator']);
  }

  // Explorateur de fichiers
  if (name.includes('explorer') || name.includes('dossier') || name.includes('fichier') || name.includes('document')) {
    const p = targetPath || path.join(os.homedir(), 'Documents');
    return launchForeground('explorer.exe', [p], ['Explorateur', 'Documents']);
  }

  // Terminal
  if (name.includes('terminal') || name.includes('powershell') || name.includes('cmd')) {
    return launchForeground('powershell.exe', [], ['PowerShell', 'Terminal']);
  }

  // Paint
  if (name.includes('paint') || name.includes('dessin')) {
    return launchForeground('mspaint.exe', [], ['Paint']);
  }

  // Défaut
  return launchForeground(appName, targetPath ? [targetPath] : []);
}

// 2. FERMER UNE APPLICATION SUR WINDOWS
export async function closeApp(appName: string): Promise<{ success: boolean; message: string }> {
  const name = appName.toLowerCase().trim();
  let procName = '';

  if (name.includes('code') || name.includes('vs')) procName = 'Code.exe';
  else if (name.includes('chrome')) procName = 'chrome.exe';
  else if (name.includes('edge')) procName = 'msedge.exe';
  else if (name.includes('notepad') || name.includes('bloc')) procName = 'notepad.exe';
  else if (name.includes('calc')) procName = 'CalculatorApp.exe';
  else if (name.includes('spotify')) procName = 'Spotify.exe';
  else if (name.includes('whatsapp')) procName = 'WhatsApp.exe';
  else procName = `${appName}.exe`;

  return new Promise((resolve) => {
    try {
      const p = spawn('taskkill.exe', ['/IM', procName, '/F'], {
        detached: true,
        stdio: 'ignore',
      });
      p.unref();
      resolve({ success: true, message: `Application ${appName} (${procName}) fermée avec succès.` });
    } catch (e: any) {
      resolve({ success: false, message: `Erreur fermeture: ${e.message}` });
    }
  });
}

// 3. OUVRIR UNE URL DANS LE NAVIGATEUR
export async function openUrl(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    const chrome = findExistingExe(KNOWN_PATHS.chrome);
    if (chrome) {
      return launchForeground(chrome, [validUrl], ['Google Chrome', 'Chrome']);
    }
    const edge = findExistingExe(KNOWN_PATHS.edge);
    if (edge) {
      return launchForeground(edge, [validUrl], ['Microsoft Edge', 'Edge']);
    }
    return launchForeground(validUrl, [], ['Google Chrome', 'Chrome', 'Edge']);
  } catch (e: any) {
    return { success: false, message: `Erreur ouverture URL : ${e.message}` };
  }
}

// 3. STATISTIQUES MATÉRIELLES DU PC (RAM, CPU, UPTIME)
export function getSystemStats() {
  const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10;
  const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10;
  const usedMem = Math.round((totalMem - freeMem) * 10) / 10;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    uptimeHours: Math.round(os.uptime() / 3600 * 10) / 10,
    totalRamGb: totalMem,
    usedRamGb: usedMem,
    freeRamGb: freeMem,
    ramPercent: memPercent,
    cpusCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Inconnu',
  };
}

// 4. GESTION DES FICHIERS LOCAUX
export function inspectDirectory(dirPath?: string) {
  const targetDir = dirPath || path.join(os.homedir(), 'Documents');
  if (!fs.existsSync(targetDir)) {
    return { error: `Le dossier n'existe pas : ${targetDir}` };
  }

  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  return {
    directory: targetDir,
    items: items.slice(0, 30).map((it) => ({
      name: it.name,
      isDirectory: it.isDirectory(),
    })),
  };
}
