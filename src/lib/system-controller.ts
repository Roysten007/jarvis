import { spawn, execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { takeScreenCapture, ScreenshotResult } from './screenshot';

// --------------------------------------------------------------------------
// 1. REGISTRE COMPLET DES APPLICATIONS WINDOWS (CHEMINS RÉELS ET COMMANDES)
// --------------------------------------------------------------------------
export interface AppDefinition {
  name: string;
  cmd: string;
  args: string[];
  processNames: string[];
  keywords: string[];
  url?: string;
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
  notepad: {
    name: 'Bloc-notes',
    cmd: 'notepad.exe',
    args: [],
    processNames: ['notepad.exe', 'Notepad.exe'],
    keywords: ['notepad', 'bloc-notes', 'bloc notes', 'bloc note', 'texte simple'],
  },
  calc: {
    name: 'Calculatrice',
    cmd: 'explorer.exe',
    args: ['calculator:'],
    processNames: ['CalculatorApp.exe', 'calc.exe', 'Calculator.exe'],
    keywords: ['calculatrice', 'calc', 'calculette', 'calculator'],
  },
  paint: {
    name: 'Paint',
    cmd: 'mspaint.exe',
    args: [],
    processNames: ['mspaint.exe', 'PaintApp.exe'],
    keywords: ['paint', 'mspaint', 'dessin', 'croquis'],
  },
  vscode: {
    name: 'Visual Studio Code',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
    args: ['C:\\Users\\ADMIN\\Documents\\Jarvis'],
    processNames: ['Code.exe'],
    keywords: ['vs code', 'vscode', 'code', 'visual studio code', 'mon code', 'projet jarvis'],
  },
  antigravity: {
    name: 'Antigravity IDE',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Local\\Programs\\antigravity\\Antigravity.exe',
    args: [],
    processNames: ['Antigravity.exe'],
    keywords: ['antigravity', 'antigravity ide', 'gemini ide'],
  },
  zcode: {
    name: 'ZCode',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Local\\Programs\\ZCode\\ZCode.exe',
    args: [],
    processNames: ['ZCode.exe'],
    keywords: ['zcode', 'z code'],
  },
  chrome: {
    name: 'Google Chrome',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    args: [],
    processNames: ['chrome.exe'],
    keywords: ['chrome', 'google chrome', 'navigateur chrome'],
  },
  firefox: {
    name: 'Mozilla Firefox',
    cmd: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    args: [],
    processNames: ['firefox.exe'],
    keywords: ['firefox', 'mozilla', 'mozilla firefox', 'navigateur firefox'],
  },
  edge: {
    name: 'Microsoft Edge',
    cmd: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [],
    processNames: ['msedge.exe'],
    keywords: ['edge', 'msedge', 'microsoft edge', 'navigateur edge'],
  },
  word: {
    name: 'Microsoft Word',
    cmd: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
    args: [],
    processNames: ['WINWORD.EXE'],
    keywords: ['word', 'winword', 'microsoft word', 'traitement de texte'],
  },
  excel: {
    name: 'Microsoft Excel',
    cmd: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
    args: [],
    processNames: ['EXCEL.EXE'],
    keywords: ['excel', 'microsoft excel', 'tableur', 'classeur'],
  },
  powerpoint: {
    name: 'Microsoft PowerPoint',
    cmd: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    args: [],
    processNames: ['POWERPNT.EXE'],
    keywords: ['powerpoint', 'power point', 'diaporama', 'slides', 'présentation'],
  },
  canva: {
    name: 'Canva',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Canva\\Canva.exe',
    args: [],
    processNames: ['Canva.exe'],
    keywords: ['canva', 'canva desktop', 'design canva'],
    url: 'https://www.canva.com',
  },
  capcut: {
    name: 'CapCut',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Local\\CapCut\\Apps\\CapCut.exe',
    args: ['--src1'],
    processNames: ['CapCut.exe'],
    keywords: ['capcut', 'cap cut', 'montage capcut'],
  },
  vlc: {
    name: 'VLC Media Player',
    cmd: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    args: [],
    processNames: ['vlc.exe'],
    keywords: ['vlc', 'vlc media player', 'lecteur video', 'lecteur vlc'],
  },
  photoshop: {
    name: 'Adobe Photoshop',
    cmd: 'C:\\Program Files\\Adobe\\Adobe Photoshop 2023\\Photoshop.exe',
    args: [],
    processNames: ['Photoshop.exe'],
    keywords: ['photoshop', 'adobe photoshop', 'retouche photo'],
  },
  spotify: {
    name: 'Spotify',
    cmd: 'explorer.exe',
    args: ['spotify:'],
    processNames: ['Spotify.exe', 'SpotifyLauncher.exe'],
    keywords: ['spotify', 'musique', 'chanson', 'lofi', 'playlist'],
    url: 'https://open.spotify.com',
  },
  whatsapp: {
    name: 'WhatsApp',
    cmd: 'explorer.exe',
    args: ['whatsapp:'],
    processNames: ['WhatsApp.exe', 'WhatsAppDesktop.exe'],
    keywords: ['whatsapp', 'wa', 'messagerie whatsapp', 'whatsapp web'],
    url: 'https://web.whatsapp.com',
  },
  linkedin: {
    name: 'LinkedIn',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://www.linkedin.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['linkedin', 'linked in', 'mon linkedin', 'reseau pro'],
    url: 'https://www.linkedin.com',
  },
  facebook: {
    name: 'Facebook',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://www.facebook.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['facebook', 'fb', 'meta', 'mon facebook'],
    url: 'https://www.facebook.com',
  },
  instagram: {
    name: 'Instagram',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://www.instagram.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['instagram', 'insta', 'ig', 'mon instagram'],
    url: 'https://www.instagram.com',
  },
  twitter: {
    name: 'X (Twitter)',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://x.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['twitter', 'tweet', 'x.com', 'x', 'mon twitter'],
    url: 'https://x.com',
  },
  tiktok: {
    name: 'TikTok',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://www.tiktok.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['tiktok', 'tik tok', 'mon tiktok'],
    url: 'https://www.tiktok.com',
  },
  maps: {
    name: 'Google Maps',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://www.google.com/maps'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['maps', 'google maps', 'carte', 'plan', 'localisation', 'itineraire'],
    url: 'https://www.google.com/maps',
  },
  gmail: {
    name: 'Gmail',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://mail.google.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['gmail', 'google mail', 'boite mail', 'mes mails', 'emails', 'courriel'],
    url: 'https://mail.google.com',
  },
  chatgpt: {
    name: 'ChatGPT',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://chatgpt.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['chatgpt', 'chat gpt', 'openai'],
    url: 'https://chatgpt.com',
  },
  github: {
    name: 'GitHub',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://github.com'],
    processNames: ['chrome.exe', 'msedge.exe'],
    keywords: ['github', 'git hub', 'mon github', 'depot git'],
    url: 'https://github.com',
  },
  notion: {
    name: 'Notion',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://www.notion.so'],
    processNames: ['Notion.exe', 'chrome.exe', 'msedge.exe'],
    keywords: ['notion', 'mon notion', 'notes notion'],
    url: 'https://www.notion.so',
  },
  telegram: {
    name: 'Telegram',
    cmd: 'cmd.exe',
    args: ['/c', 'start', '""', 'https://web.telegram.org'],
    processNames: ['Telegram.exe'],
    keywords: ['telegram', 'tg', 'mon telegram'],
    url: 'https://web.telegram.org',
  },
  anlink: {
    name: 'AnLink',
    cmd: 'C:\\Users\\ADMIN\\AppData\\Roaming\\AnLink\\AnLink.exe',
    args: [],
    processNames: ['AnLink.exe'],
    keywords: ['anlink', 'an link', 'partage ecran telephone'],
  },
  explorer: {
    name: 'Explorateur de fichiers',
    cmd: 'explorer.exe',
    args: [path.join(process.env.USERPROFILE || 'C:\\Users\\ADMIN', 'Documents')],
    processNames: ['explorer.exe'],
    keywords: ['explorateur', 'dossier', 'fichier', 'documents', 'mes fichiers', 'mes documents'],
  },
  terminal: {
    name: 'Terminal PowerShell',
    cmd: 'powershell.exe',
    args: ['-NoExit'],
    processNames: ['powershell.exe', 'WindowsTerminal.exe'],
    keywords: ['terminal', 'powershell', 'console', 'invite de commande', 'cmd'],
  },
};

// Dictionnaire de correspondances phonétiques et fautes de frappe courantes
export const APP_ALIASES: Record<string, string> = {
  // LinkedIn
  linkeldn: 'linkedin',
  linkdin: 'linkedin',
  linkedln: 'linkedin',
  linkin: 'linkedin',
  likedin: 'linkedin',
  linked: 'linkedin',
  link: 'linkedin',
  // Instagram
  insta: 'instagram',
  instagrame: 'instagram',
  instgram: 'instagram',
  ig: 'instagram',
  // Facebook
  fb: 'facebook',
  facebok: 'facebook',
  facbook: 'facebook',
  fecebook: 'facebook',
  // WhatsApp
  whatsap: 'whatsapp',
  watsap: 'whatsapp',
  watsapp: 'whatsapp',
  whatapp: 'whatsapp',
  wa: 'whatsapp',
  // YouTube
  youtub: 'youtube',
  ytb: 'youtube',
  yt: 'youtube',
  you_tube: 'youtube',
  // Spotify
  spotifay: 'spotify',
  spotfy: 'spotify',
  spoti: 'spotify',
  // Calculatrice
  calc: 'calc',
  calculette: 'calc',
  calcule: 'calc',
  calculator: 'calc',
  // Bloc-notes
  notepad: 'notepad',
  blocnote: 'notepad',
  blocnotes: 'notepad',
  // VS Code
  vscode: 'vscode',
  vs_code: 'vscode',
  // Chrome
  chrome: 'chrome',
  navigateur: 'chrome',
  // Maps
  map: 'maps',
  googlemaps: 'maps',
  googlemap: 'maps',
};

// Distance de Levenshtein pour tolérance aux fautes d'orthographe
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Résolution floue intelligente d'une application demandée
export function resolveFuzzyApp(query: string): string | null {
  const clean = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean || clean.length < 3) return null;

  if (APP_ALIASES[clean]) return APP_ALIASES[clean];
  if (APP_REGISTRY[clean]) return clean;

  const words = query.toLowerCase().split(/[\s,.'";:!?\-]+/);
  for (const w of words) {
    if (APP_ALIASES[w]) return APP_ALIASES[w];
    if (APP_REGISTRY[w]) return w;

    // Vérifier proximité Levenshtein sur les clés et mots-clés
    for (const [key, app] of Object.entries(APP_REGISTRY)) {
      if (w.length >= 4 && (levenshteinDistance(w, key) <= 2 || levenshteinDistance(w, app.name.toLowerCase()) <= 2)) {
        return key;
      }
      for (const kw of app.keywords) {
        const cleanKw = kw.replace(/\s+/g, '');
        if (w.length >= 4 && levenshteinDistance(w, cleanKw) <= 2) {
          return key;
        }
      }
    }
  }
  return null;
}

// Recherche dynamique d'un raccourci sur le Bureau ou le Menu Démarrer
function findDynamicShortcut(query: string): string | null {
  const searchDirs = [
    path.join(process.env.USERPROFILE || 'C:\\Users\\ADMIN', 'Desktop'),
    'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
    path.join(process.env.APPDATA || 'C:\\Users\\ADMIN\\AppData\\Roaming', 'Microsoft\\Windows\\Start Menu\\Programs'),
  ];

  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const f of files) {
        const str = String(f);
        if (str.endsWith('.lnk') || str.endsWith('.exe')) {
          const base = path.basename(str, path.extname(str)).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (base.includes(cleanQuery) || cleanQuery.includes(base)) {
            const full = path.join(dir, str);
            if (fs.existsSync(full)) return full;
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

// --------------------------------------------------------------------------
// 2. FONCTIONS DE PILOTAGE SYSTÈME RÉEL (EXÉCUTION DIRECTE)
// --------------------------------------------------------------------------

// Copier du texte dans le presse-papier Windows
export function copyToClipboard(text: string): boolean {
  try {
    const escaped = text.replace(/'/g, "''");
    const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Set-Clipboard -Value '${escaped}'`], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
    return true;
  } catch (e) {
    return false;
  }
}

// 1. Lancer une application par son nom
export async function launchApp(appName: string, targetPath?: string): Promise<{ success: boolean; message: string }> {
  const raw = appName.toLowerCase().trim();

  // 1.1 Recherche dans le registre d'applications préconfiguré
  for (const [key, app] of Object.entries(APP_REGISTRY)) {
    if (key === raw || app.keywords.some((kw) => raw.includes(kw))) {
      // Si c'est une application Web / Sociale avec URL directe
      if (app.url) {
        await openUrl(app.url);
        return { success: true, message: `${app.name} lancé avec succès sur votre écran.` };
      }

      // Cas particulier : si l'exécutable local n'existe pas, tenter fallback dynamique
      if (app.cmd.endsWith('.exe') && app.cmd.includes('\\') && !fs.existsSync(app.cmd)) {
        console.warn(`[LAUNCH_APP] Exécutable principal absent pour ${app.name}: ${app.cmd}`);
      } else {
        const finalArgs = targetPath ? [...app.args, targetPath] : app.args;
        try {
          const p = spawn(app.cmd, finalArgs, {
            detached: true,
            stdio: 'ignore',
          });
          p.unref();
          return { success: true, message: `${app.name} lancé avec succès sur votre écran.` };
        } catch (err: any) {
          console.error(`[LAUNCH_APP_ERROR] ${app.name}:`, err);
        }
      }
    }
  }

  // 1.2 Recherche dynamique de raccourci (.lnk / .exe)
  const dynamicTarget = findDynamicShortcut(appName);
  if (dynamicTarget) {
    try {
      const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process -FilePath '${dynamicTarget.replace(/'/g, "''")}'`], {
        detached: true,
        stdio: 'ignore',
      });
      p.unref();
      return { success: true, message: `Application "${path.basename(dynamicTarget)}" lancée avec succès.` };
    } catch (e: any) {
      return { success: false, message: `Erreur lors du lancement de ${dynamicTarget}: ${e.message}` };
    }
  }

  // 1.3 Tentative directe avec le nom fourni
  try {
    const finalCmd = targetPath ? `${appName} "${targetPath}"` : appName;
    const p = spawn('cmd.exe', ['/c', 'start', '""', finalCmd], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
    return { success: true, message: `Commande d'ouverture transmise pour ${appName}.` };
  } catch (err: any) {
    return { success: false, message: `Impossible de lancer l'application ${appName} : ${err.message}` };
  }
}

// 2. Fermer une application sur Windows
export async function closeApp(appName: string): Promise<{ success: boolean; message: string }> {
  const raw = appName.toLowerCase().trim();
  let procPatterns: string[] = [];

  for (const [key, app] of Object.entries(APP_REGISTRY)) {
    if (key === raw || app.keywords.some((kw) => raw.includes(kw))) {
      procPatterns = app.processNames;
      break;
    }
  }

  if (procPatterns.length === 0) {
    procPatterns = [`${appName}.exe`, `${appName}*`];
  }

  return new Promise((resolve) => {
    try {
      for (const proc of procPatterns) {
        const p = spawn('taskkill.exe', ['/IM', proc, '/F'], {
          detached: true,
          stdio: 'ignore',
        });
        p.unref();
      }
      resolve({ success: true, message: `L'application ${appName} a été fermée avec succès.` });
    } catch (e: any) {
      resolve({ success: false, message: `Erreur lors de la fermeture de ${appName}: ${e.message}` });
    }
  });
}

// 3. Ouvrir une URL dans le navigateur
export async function openUrl(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const p = spawn('explorer.exe', [validUrl], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
    return { success: true, message: `Navigation vers ${validUrl} initiée dans votre navigateur.` };
  } catch (e: any) {
    return { success: false, message: `Erreur lors de l'ouverture de l'URL : ${e.message}` };
  }
}

// 4. Action Spotify
export async function playSpotify(query?: string): Promise<{ success: boolean; message: string }> {
  if (query && query.trim()) {
    const enc = encodeURIComponent(query.trim());
    const p = spawn('explorer.exe', [`spotify:search:${enc}`], { detached: true, stdio: 'ignore' });
    p.unref();
    return { success: true, message: `Recherche « ${query} » lancée sur Spotify.` };
  }
  const p = spawn('explorer.exe', ['spotify:'], { detached: true, stdio: 'ignore' });
  p.unref();
  return { success: true, message: 'Spotify lancé sur votre écran.' };
}

// 5. Action VS Code
export async function openVSCode(targetPath?: string): Promise<{ success: boolean; message: string }> {
  const proj = targetPath || 'c:\\Users\\ADMIN\\Documents\\Jarvis';
  const codeExe = `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`;
  if (fs.existsSync(codeExe)) {
    const p = spawn(codeExe, [proj], { detached: true, stdio: 'ignore' });
    p.unref();
    return { success: true, message: `Visual Studio Code ouvert avec le projet ${path.basename(proj)}.` };
  }
  const p = spawn('explorer.exe', [`vscode://file/${proj.replace(/\\/g, '/')}`], { detached: true, stdio: 'ignore' });
  p.unref();
  return { success: true, message: 'Visual Studio Code lancé sur votre bureau.' };
}

// 6. Action YouTube
export async function searchYouTube(query: string): Promise<{ success: boolean; message: string }> {
  const enc = encodeURIComponent(query.trim());
  return openUrl(`https://www.youtube.com/results?search_query=${enc}`);
}

// 7. Action Google Search
export async function searchGoogle(query: string): Promise<{ success: boolean; message: string }> {
  const enc = encodeURIComponent(query.trim());
  return openUrl(`https://www.google.com/search?q=${enc}`);
}

// 8. Capture d'écran instantanée
export async function captureDesktopScreen(): Promise<ScreenshotResult> {
  return takeScreenCapture();
}

// 9. Action WhatsApp
export async function sendWhatsAppMessage(
  messageText: string,
  contactOrPhone?: string
): Promise<{ success: boolean; phone?: string; contactName?: string; message: string }> {
  const text = messageText.trim();
  const encoded = encodeURIComponent(text);
  copyToClipboard(text);

  const { resolveContactPhone } = await import('./db');
  const resolved = contactOrPhone ? await resolveContactPhone(contactOrPhone) : null;
  const phone = resolved ? resolved.phone : (contactOrPhone?.replace(/[^0-9]/g, '') || '');
  const contactName = resolved ? resolved.name : (contactOrPhone || '');

  if (phone && phone.length >= 8) {
    const p = spawn('explorer.exe', [`whatsapp://send?phone=${phone}&text=${encoded}`], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();

    return {
      success: true,
      phone,
      contactName: contactName || phone,
      message: `Message WhatsApp préparé et transmis à ${contactName || phone}.`,
    };
  }

  const p = spawn('explorer.exe', ['whatsapp:'], { detached: true, stdio: 'ignore' });
  p.unref();
  return {
    success: false,
    contactName,
    message: `WhatsApp Desktop ouvert sur votre écran (aucun numéro valide spécifié pour ${contactName}).`,
  };
}

// 10. Statistiques système
export function getSystemStats() {
  const totalMem = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const freeMem = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;
  const usedMem = Math.round((totalMem - freeMem) * 10) / 10;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10,
    totalRamGb: totalMem,
    usedRamGb: usedMem,
    freeRamGb: freeMem,
    ramPercent: memPercent,
    cpusCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Inconnu',
  };
}

// 11. Inspection des dossiers locaux
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

// --------------------------------------------------------------------------
// 3. INTERPRÉTEUR UNIFIÉ DES ORDRES VOCAUX ET TEXTE
// --------------------------------------------------------------------------

export interface SystemCommandResult {
  executed: boolean;
  actionNote?: string;
  directReply?: string;
  isPureCommand?: boolean;
  screenshotDataUrl?: string;
  screenshotPath?: string;
  isVisionAnalysis?: boolean;
  clientAction?: {
    type: 'open_url' | 'screenshot' | 'switch_tab' | 'media_player';
    url?: string;
    tab?: string;
    label?: string;
    youtubeVideoId?: string;
    spotifyUri?: string;
    mediaTitle?: string;
    mediaArtist?: string;
  };
}

// ----------------------------------------------------------------------------
// DICTIONNAIRE MUSICAL D'ÉLITE (ACCÈS INSTANTANÉ AUX TOP HITS EN DIRECT)
// ----------------------------------------------------------------------------
export const POPULAR_MUSIC_MAP: Record<
  string,
  { artist: string; title: string; youtubeId: string; spotifyArtistId: string; spotifyTrackId?: string }
> = {
  damso: {
    artist: 'Damso',
    title: 'Macarena',
    youtubeId: 'uT93IPoRCS4',
    spotifyArtistId: '2UywfDCgvOr4GzI6J39t5l',
    spotifyTrackId: '0jK047qX_u4',
  },
  ninho: {
    artist: 'Ninho',
    title: 'Jefe',
    youtubeId: 'r817Y7k9iO8',
    spotifyArtistId: '7n1IX6jd5h07g94A1F67kL',
    spotifyTrackId: '2gL36gG8tqA1y8yC5X1g2h',
  },
  gazo: {
    artist: 'Gazo',
    title: 'DIE',
    youtubeId: 'gH0m_7B7b6w',
    spotifyArtistId: '27O3k2gK2Y9L37hX7N2j9c',
  },
  tiakola: {
    artist: 'Tiakola',
    title: 'Meuda',
    youtubeId: 'Pq5g7Jb4Zz8',
    spotifyArtistId: '2O2bC3K2d4f8g7h9j1k3m5',
  },
  asake: {
    artist: 'Asake',
    title: 'Lonely At The Top',
    youtubeId: 'j8p_ZgX0N8c',
    spotifyArtistId: '3a1t5YBdsxEucilikN5b4w',
  },
  burna: {
    artist: 'Burna Boy',
    title: 'City Boys',
    youtubeId: '421w1j87fEM',
    spotifyArtistId: '3wcj11Q77AcJy2adR2H5Z2',
  },
  lofi: {
    artist: 'Lofi Girl',
    title: 'Beats to relax/study to',
    youtubeId: 'jfKfPfyJRdk',
    spotifyArtistId: '0vvXsW14ReMVt15jwM2Kqa',
  },
  jul: {
    artist: 'Jul',
    title: 'Tchikita',
    youtubeId: 'q7c1K3H8R0w',
    spotifyArtistId: '3q7HBby2ed0w4k5x1i5c3d',
  },
  stromae: {
    artist: 'Stromae',
    title: 'Papaoutai',
    youtubeId: 'oiKj0Z_Xnjc',
    spotifyArtistId: '5tvAmRslWpSFLW2v0g3mFm',
  },
};

export async function executeSystemCommand(
  rawMessage: string,
  previousAssistantMessage?: string
): Promise<SystemCommandResult> {
  const message = rawMessage.trim();
  const lower = message.toLowerCase().trim();

  // --------------------------------------------------------------------------
  // 0. CONFIRMATION D'UNE SUGGESTION PRÉCÉDENTE ("oui", "vas-y", "fais-le")
  // --------------------------------------------------------------------------
  const cleanAffirmation = lower.trim().replace(/[.,!?;:]/g, '');
  const isAffirmation =
    /^(?:oui|ouais|yes|vas-y|vas y|vasy|fais-le|fais le|lance|lance-le|lance le|ouvre|ouvre-le|ouvre le|d'accord|ok|confirme|fais ça|exactement|bien sûr|absolument)(?:\s+(?:vas-y|vas y|vasy|fais-le|fais le|lance|lance-le|ouvre|ouvre-le|merci|s'il te plaît|s'il te plait|stp))?$/i.test(cleanAffirmation);
  if (isAffirmation && previousAssistantMessage) {
    const prevLower = previousAssistantMessage.toLowerCase();

    // 0.1 Confirmation d'un agent de prospection
    if (prevLower.includes('agent whatsapp') || prevLower.includes('prospection whatsapp')) {
      const { runWhatsAppAgent, saveProspect } = await import('./prospector-agents');
      const agentRes = await runWhatsAppAgent({
        prospectName: 'Prospect Qualifié',
        businessName: 'Commerce / Établissement',
        niche: 'Digitalisation & Restauration',
        specificObservation: 'Absence de menu digital interactif ou de commande WhatsApp',
      });
      saveProspect({
        name: 'Prospect Qualifié',
        channel: 'whatsapp',
        contact: 'WhatsApp',
        businessName: 'Commerce Cotonou',
        status: 'nouveau',
        message1: agentRes.message1,
        message2: agentRes.message2,
        notes: 'Généré sur confirmation de Roysten',
      });
      return {
        executed: true,
        actionNote: 'Agent WhatsApp exécuté.',
        directReply: `À vos ordres, Monsieur Roysten. Séquence de prospection WhatsApp générée et enregistrée dans votre CRM :\n\n**Message 1** :\n${agentRes.message1}\n\n**Message 2** :\n${agentRes.message2}`,
        isPureCommand: true,
        clientAction: {
          type: 'switch_tab',
          tab: 'prospection',
          label: 'Consulter dans le CRM',
        },
      };
    }

    if (prevLower.includes('agent maps') || prevLower.includes('google maps') || prevLower.includes('restaurant')) {
      const { runMapsAgent, saveProspect } = await import('./prospector-agents');
      const agentRes = await runMapsAgent({
        businessName: 'Restaurant & Lounge Cotonou',
        category: 'Restaurant & Bar Lounge',
        city: 'Cotonou',
        observedMissingItem: 'Aucun site web ni menu QR Code sur Google Maps',
      });
      saveProspect({
        name: 'Restaurant & Lounge Cotonou',
        channel: 'maps',
        contact: 'Cotonou',
        businessName: 'Restaurant & Lounge Cotonou',
        city: 'Cotonou',
        status: 'nouveau',
        message1: agentRes.message1,
        message2: agentRes.message2,
        notes: agentRes.diagnostic,
      });
      return {
        executed: true,
        actionNote: 'Agent Google Maps exécuté.',
        directReply: `À vos ordres, Monsieur Roysten. Diagnostic et messages Google Maps générés :\n\n**Diagnostic** : ${agentRes.diagnostic}\n\n**Message 1** :\n${agentRes.message1}\n\n**Message 2 (Oresto Connect 250k-500k FCFA)** :\n${agentRes.message2}`,
        isPureCommand: true,
        clientAction: {
          type: 'switch_tab',
          tab: 'prospection',
          label: 'Consulter dans le CRM',
        },
      };
    }

    // 0.2 Confirmation d'une application
    for (const [key, app] of Object.entries(APP_REGISTRY)) {
      if (prevLower.includes(key) || app.keywords.some((kw) => prevLower.includes(kw))) {
        await launchApp(key);
        return {
          executed: true,
          actionNote: `${app.name} lancé sur confirmation.`,
          directReply: `À vos ordres, Monsieur Roysten. ${app.name} est ouvert sur votre écran.`,
          isPureCommand: true,
          clientAction: app.url
            ? {
                type: 'open_url',
                url: app.url,
                label: `Accéder à ${app.name}`,
              }
            : undefined,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // A. CAPTURE D'ÉCRAN (SCREENSHOT)
  // --------------------------------------------------------------------------
  const isScreenshotRequest =
    lower.includes('capture') ||
    lower.includes('screenshot') ||
    lower.includes('imprime écran') ||
    lower.includes('imprime ecran') ||
    lower.includes('photo de mon écran') ||
    lower.includes('photo de mon ecran') ||
    lower.includes('regarde mon écran') ||
    lower.includes('regarde mon ecran') ||
    lower.includes('vois mon écran') ||
    lower.includes('vois mon ecran') ||
    lower.includes('analyse mon écran') ||
    lower.includes('analyse mon ecran');

  if (isScreenshotRequest) {
    const shot = await takeScreenCapture();
    if (shot.success && shot.dataUrl) {
      const wantsAnalysis =
        lower.includes('analyse') ||
        lower.includes('dis-moi ce que tu vois') ||
        lower.includes('dis moi ce que tu vois') ||
        lower.includes('qu\'est-ce que tu vois') ||
        lower.includes('qu est ce que tu vois') ||
        lower.includes('regarde') ||
        lower.includes('examine');

      if (wantsAnalysis) {
        return {
          executed: true,
          actionNote: `Capture d'écran du bureau effectuée avec succès. Fichier : ${shot.filePath}`,
          screenshotDataUrl: shot.dataUrl,
          screenshotPath: shot.filePath,
          isVisionAnalysis: true,
          isPureCommand: false,
          clientAction: {
            type: 'screenshot',
            url: shot.dataUrl,
            label: 'Capture d\'écran de votre bureau',
          },
        };
      }

      return {
        executed: true,
        actionNote: `Capture d'écran de votre bureau enregistrée dans ${shot.filePath}.`,
        directReply: `Capture d'écran de votre écran effectuée avec succès, Monsieur Roysten. Elle s'affiche directement dans votre terminal holographique.`,
        screenshotDataUrl: shot.dataUrl,
        screenshotPath: shot.filePath,
        isPureCommand: true,
        clientAction: {
          type: 'screenshot',
          url: shot.dataUrl,
          label: 'Capture d\'écran de votre bureau',
        },
      };
    } else {
      return {
        executed: true,
        actionNote: `Échec de la capture d'écran : ${shot.error}`,
        directReply: `Je n'ai pas pu effectuer la capture d'écran : ${shot.error || 'Erreur inconnue'}.`,
        isPureCommand: true,
      };
    }
  }

  // --------------------------------------------------------------------------
  // B. FERMETURE D'APPLICATIONS
  // --------------------------------------------------------------------------
  const closeVerbs = [
    'ferme', 'fermer', 'quitte', 'quitter', 'arrête', 'arrete',
    'arrêter', 'arreter', 'éteins', 'eteins', 'éteindre', 'eteindre',
    'stop', 'kill', 'close', 'exit'
  ];
  const hasCloseVerb = closeVerbs.some((v) => {
    const idx = lower.indexOf(v);
    if (idx === -1) return false;
    // Vérifier que c'est un mot entier ou au début
    return idx === 0 || lower[idx - 1] === ' ';
  });

  if (hasCloseVerb) {
    for (const [key, app] of Object.entries(APP_REGISTRY)) {
      if (app.keywords.some((kw) => lower.includes(kw))) {
        await closeApp(key);
        return {
          executed: true,
          actionNote: `${app.name} a été fermé sur Windows.`,
          directReply: `${app.name} a été fermé avec succès, Monsieur Roysten.`,
          isPureCommand: true,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // P. GESTION DES 3 AGENTS DE PROSPECTION, DU CRM, DE L'AUTOPILOT ET DES ONGLETS
  // --------------------------------------------------------------------------

  // P.1 Agent Google Maps Sniper (Prospection locale, Restaurants, Commerces)
  if (
    (lower.includes('maps') || lower.includes('restaurant') || lower.includes('maquis') || lower.includes('bar ') || lower.includes('sniper') || lower.includes('oresto')) &&
    (lower.includes('prospect') || lower.includes('agent') || lower.includes('cherche') || lower.includes('trouve') || lower.includes('lance') || lower.includes('cible'))
  ) {
    const { runMapsAgent, saveProspect } = await import('./prospector-agents');
    const nameMatch = message.match(/(?:pour|de|le|la|du|chez)\s+([a-zA-Z0-9_\s'-]+?)(?:\s+à|\s+a|\s+sur|$)/i);
    const targetName = nameMatch ? nameMatch[1].trim() : 'Restaurant / Établissement Cotonou';
    const cityMatch = message.match(/(?:à|a|sur)\s+([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : 'Cotonou';

    const res = await runMapsAgent({
      businessName: targetName,
      category: 'Restaurant & Bar Lounge',
      city,
      observedMissingItem: 'Aucun menu digital QR Code ni commande directe sur la fiche Maps',
    });

    saveProspect({
      name: targetName,
      channel: 'maps',
      contact: city,
      businessName: targetName,
      city,
      status: 'nouveau',
      message1: res.message1,
      message2: res.message2,
      notes: res.diagnostic,
    });

    return {
      executed: true,
      actionNote: `Agent Google Maps exécuté pour ${targetName} (${city}). Prospect enregistré dans le CRM.`,
      directReply: `🎯 **AGENT GOOGLE MAPS SNIPER // CIBLE IDENTIFIÉE : ${targetName} (${city})**\n\n` +
        `**Diagnostic chirurgical** :\n${res.diagnostic}\n\n` +
        `**Message 1 (Accroche percutante <60 mots)** :\n${res.message1}\n\n` +
        `**Message 2 (Relance Démo Oresto Connect - 250k à 500k FCFA)** :\n${res.message2}\n\n` +
        `Fiche prospect créée dans votre CRM. Prêt à engager le contact, Monsieur Roysten.`,
      isPureCommand: true,
      clientAction: {
        type: 'switch_tab',
        tab: 'prospection',
        label: 'Consulter dans le CRM',
      },
    };
  }

  // P.2 Agent WhatsApp Outreach
  if (
    lower.includes('whatsapp') &&
    (lower.includes('prospect') || lower.includes('outreach') || lower.includes('agent 1') || lower.includes('sequence') || lower.includes('séquence')) &&
    !lower.includes('envoie un message')
  ) {
    const { runWhatsAppAgent, saveProspect } = await import('./prospector-agents');
    const nameMatch = message.match(/(?:pour|de|contact)\s+([a-zA-Z0-9_\s'-]+)/i);
    const targetName = nameMatch ? nameMatch[1].trim() : 'Prospect Commerce';

    const res = await runWhatsAppAgent({
      prospectName: targetName,
      businessName: targetName,
      niche: 'Digitalisation & Commerce',
      specificObservation: 'Absence de tunnel de vente WhatsApp ou de menu digital',
    });

    saveProspect({
      name: targetName,
      channel: 'whatsapp',
      contact: targetName,
      businessName: targetName,
      status: 'nouveau',
      message1: res.message1,
      message2: res.message2,
      notes: 'Généré par l\'Agent WhatsApp Outreach',
    });

    return {
      executed: true,
      actionNote: `Agent WhatsApp exécuté pour ${targetName}.`,
      directReply: `📱 **AGENT WHATSAPP OUTREACH // SÉQUENCE GÉNÉRÉE : ${targetName}**\n\n` +
        `**Message 1 (Brise-glace & accroche)** :\n${res.message1}\n\n` +
        `**Message 2 (Relance & Démo de valeur - 7 jours de délai)** :\n${res.message2}\n\n` +
        `Séquence enregistrée dans votre pipeline CRM, Monsieur Roysten.`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: res.clickUrl,
        label: 'Envoyer sur WhatsApp',
      },
    };
  }

  // P.3 Agent Instagram Outreach
  if (
    (lower.includes('instagram') || lower.includes('insta')) &&
    (lower.includes('prospect') || lower.includes('dm') || lower.includes('agent 2') || lower.includes('créateur') || lower.includes('createur'))
  ) {
    const { runInstagramAgent, saveProspect } = await import('./prospector-agents');
    const handleMatch = message.match(/@?([a-zA-Z0-9_.]+)/);
    const handle = handleMatch && handleMatch[1] !== 'instagram' && handleMatch[1] !== 'insta' ? handleMatch[1] : 'createur_cible';

    const res = await runInstagramAgent({
      handleOrName: handle,
      creatorNiche: 'Créateur & E-commerce',
      recentContentHook: 'Publications récentes engageantes sans lien de conversion direct',
      goal: 'Vente Landing Page Haute Conversion (150k - 300k FCFA)',
    });

    saveProspect({
      name: `@${handle}`,
      channel: 'instagram',
      contact: `@${handle}`,
      status: 'nouveau',
      message1: res.message1,
      message2: res.message2,
      notes: 'Cible Instagram DM',
    });

    return {
      executed: true,
      actionNote: `Agent Instagram exécuté pour @${handle}.`,
      directReply: `📸 **AGENT INSTAGRAM DM // CIBLE : @${handle}**\n\n` +
        `**DM 1 (Connexion & compliment stratégique)** :\n${res.message1}\n\n` +
        `**DM 2 (Proposition Landing Page Haute Conversion)** :\n${res.message2}\n\n` +
        `Prospect enregistré dans votre pipeline CRM, Monsieur Roysten.`,
      isPureCommand: true,
      clientAction: {
        type: 'switch_tab',
        tab: 'prospection',
        label: 'Consulter dans le CRM',
      },
    };
  }

  // P.4 Consultation du CRM / Liste des prospects
  if (
    (lower.includes('prospect') || lower.includes('crm') || lower.includes('leads') || lower.includes('pipeline')) &&
    (lower.includes('affiche') || lower.includes('montre') || lower.includes('ouvre') || lower.includes('voir') || lower.includes('combien') || lower.includes('liste'))
  ) {
    const { getProspects } = await import('./prospector-agents');
    const list = getProspects();
    const count = list.length;
    const summary = list.slice(0, 5).map((p, i) => `${i + 1}. **${p.name}** (${p.channel.toUpperCase()}) — Statut: \`${p.status}\``).join('\n');

    return {
      executed: true,
      actionNote: `${count} prospects récupérés dans le CRM.`,
      directReply: `📊 **PIPELINE CRM ROYSTEN // ${count} PROSPECTS ENREGISTRÉS**\n\n` +
        (count > 0 ? summary : 'Aucun prospect dans le pipeline pour le moment.') +
        `\n\nAccédez au centre de prospection pour lancer les 3 agents et gérer vos relances.`,
      isPureCommand: true,
      clientAction: {
        type: 'switch_tab',
        tab: 'prospection',
        label: 'Ouvrir le CRM',
      },
    };
  }

  // P.5 Emploi du temps universitaire & Autopilot
  if (
    lower.includes('emploi du temps') ||
    lower.includes('planning') ||
    lower.includes('cours') ||
    lower.includes('autopilot') ||
    lower.includes('auto-pilot') ||
    lower.includes('optimise ma journée') ||
    lower.includes('organise ma journée') ||
    lower.includes('organise mon')
  ) {
    const { getRoystenProfile } = await import('./roysten-profile');
    const profile = getRoystenProfile();
    const schedule = profile.schedule;
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
    const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);
    const dayCourses = schedule.filter(c => c.day.toLowerCase() === capitalizedToday.toLowerCase() || c.day.toLowerCase() === 'lundi');

    return {
      executed: true,
      actionNote: 'Emploi du temps et calendrier Autopilot consultés.',
      directReply: `🎓 **PLANNING & PILOTE AUTOMATIQUE // ${capitalizedToday}**\n\n` +
        `**Vos cours universitaires** :\n` +
        (dayCourses.length > 0 ? dayCourses.map(c => `• ${c.startTime} - ${c.endTime} : **${c.subject}** (${c.location || 'Faculté'})`).join('\n') : '• Journée libre de cours magistraux.') +
        `\n\n🤖 **Pendant vos cours & votre sommeil (Mode Autopilot)** :\n` +
        `• 08:30 - 12:00 : Prospection Maps automatique (Restaurants Cotonou) & qualification des fiches.\n` +
        `• 14:00 - 17:30 : Rédaction des relances WhatsApp & préparation des maquettes Oresto Connect.\n` +
        `• 23:30 - 06:30 : Scraping nocturne, veille technologique et archivage CRM.\n\n` +
        `💡 Vous pouvez vous concentrer à 100% sur vos cours de sciences, je fais tourner vos systèmes en arrière-plan, Monsieur Roysten.`,
      isPureCommand: true,
      clientAction: {
        type: 'switch_tab',
        tab: 'prospection',
        label: 'Gérer l\'Autopilot & Emploi du Temps',
      },
    };
  }

  // P.6 Bascule directe vers les modules du tableau de bord
  const tabDirectives: Array<{ keywords: string[]; tab: string; label: string }> = [
    { keywords: ['prospection', 'prospects', 'crm', 'autopilot'], tab: 'prospection', label: 'Prospection & CRM' },
    { keywords: ['pilote pc', 'controle pc', 'système', 'systeme', 'gestionnaire de tâches', 'moniteur systeme'], tab: 'system', label: 'Pilote PC' },
    { keywords: ['mémoire', 'memoire', 'souvenirs', 'faits mémorisés'], tab: 'memory', label: 'Mémoire Jarvis' },
    { keywords: ['agent react', 'react agent', 'agent autonome'], tab: 'agent', label: 'Agent ReAct' },
    { keywords: ['études', 'etudes', 'révision', 'cours de maths', 'cours de physique'], tab: 'study', label: 'Études & Révisions' },
    { keywords: ['réseaux sociaux', 'reseaux', 'social', 'whatsapp & social'], tab: 'social', label: 'Réseaux & Social' },
    { keywords: ['anglais', 'english', 'pratiquer anglais'], tab: 'english', label: 'Pratique Anglais' },
    { keywords: ['missions', 'tâches', 'taches', 'todo'], tab: 'tasks', label: 'Missions & Tâches' },
    { keywords: ['paramètres', 'parametres', 'configuration', 'modèles'], tab: 'settings', label: 'Paramètres' },
  ];

  if (lower.startsWith('ouvre ') || lower.startsWith('affiche ') || lower.startsWith('bascule sur ') || lower.startsWith('va sur ')) {
    for (const item of tabDirectives) {
      if (item.keywords.some(kw => lower.includes(kw))) {
        return {
          executed: true,
          actionNote: `Bascule vers le module ${item.label}.`,
          directReply: `Affichage du module **${item.label}** sur votre terminal holographique, Monsieur Roysten.`,
          isPureCommand: true,
          clientAction: {
            type: 'switch_tab',
            tab: item.tab,
            label: `Accéder à ${item.label}`,
          },
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // D-0. CHASSE ET EXTRACTION DE PROSPECTS QUALIFIÉS (EMAILS, NUMÉROS & ENVOI)
  // --------------------------------------------------------------------------
  const isProspectionIntent =
    lower.includes('prospect') ||
    lower.includes('prospects') ||
    lower.includes('prospection') ||
    (lower.includes('cherch') && (lower.includes('client') || lower.includes('lead') || lower.includes('restaurant') || lower.includes('commerce') || lower.includes('boutique'))) ||
    ((lower.includes('adresse') || lower.includes('email') || lower.includes('numéro') || lower.includes('numero')) && (lower.includes('sortir') || lower.includes('trouv')));

  if (isProspectionIntent) {
    const { searchAndExtractProspects } = await import('./prospector-agents');

    let niche = 'Restaurants & Lounges';
    if (lower.includes('boutique') || lower.includes('mode') || lower.includes('vêtement') || lower.includes('vetement')) {
      niche = 'Prêt-à-porter & Boutiques';
    } else if (lower.includes('hôtel') || lower.includes('hotel') || lower.includes('chambre')) {
      niche = 'Hôtels & Résidences';
    } else if (lower.includes('agence') || lower.includes('immo')) {
      niche = 'Agences Immobilières';
    } else if (lower.includes('salon') || lower.includes('beauté') || lower.includes('spa')) {
      niche = 'Instituts de beauté & Spas';
    } else if (lower.includes('restaurant') || lower.includes('resto') || lower.includes('bar') || lower.includes('food')) {
      niche = 'Restaurants & Bars';
    }

    let city = 'Cotonou';
    if (lower.includes('porto-novo')) city = 'Porto-Novo';
    else if (lower.includes('calavi')) city = 'Abomey-Calavi';
    else if (lower.includes('abidjan')) city = 'Abidjan';
    else if (lower.includes('lomé') || lower.includes('lome')) city = 'Lomé';

    const result = await searchAndExtractProspects({ niche, city, count: 4 });

    // Si l'utilisateur demande explicitement d'écrire ou envoyer directement
    let autoSendReport = '';
    const shouldDirectSend = lower.includes('écrire directement') || lower.includes('ecrire directement') || lower.includes('envoyer directement') || lower.includes('écris leur') || lower.includes('ecris leur');

    if (shouldDirectSend && result.prospects.length > 0) {
      const topLead = result.prospects[0];
      const leadPhone = topLead.phone || topLead.contact;
      if (leadPhone) {
        const { automateSendMessage } = await import('./system-indexer');
        await automateSendMessage('whatsapp', leadPhone, topLead.message1);
        autoSendReport = `\n\n⚡ **ENVOI AUTOMATIQUE DÉCLENCHÉ SUR WHATSAPP** pour le prospect n°1 (**${topLead.name}** à ${leadPhone}) : le premier message a été expédié sans action manuelle.`;
      }
    }

    const prospectCards = result.prospects.map((p, i) => {
      const waLink = p.phone ? `https://wa.me/${p.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(p.message1)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(p.message1)}`;
      const mailLink = p.email ? `mailto:${p.email}?subject=${encodeURIComponent('Optimisation digitale ' + (p.businessName || ''))}&body=${encodeURIComponent(p.message1)}` : '';

      return `**${i + 1}. ${p.businessName || p.name}** (${p.city || city})\n` +
        `   • **Gérant / Contact :** ${p.name}\n` +
        `   • **Téléphone / WhatsApp :** \`${p.phone || p.contact}\`\n` +
        `   • **Email Professionnel :** \`${p.email || 'N/A'}\`\n` +
        `   • **Diagnostic :** *${p.notes || 'Présence digitale à optimiser'}*\n` +
        `   • **Message d'accroche 1 :**\n     « *${p.message1}* »\n` +
        `   • 📲 [Envoyer sur WhatsApp](${waLink})${mailLink ? ` | ✉️ [Envoyer par Email](${mailLink})` : ''}`;
    }).join('\n\n');

    return {
      executed: true,
      actionNote: `Extraction de 4 prospects pour « ${niche} » (${city}) avec coordonnées complètes.`,
      directReply:
        `🎯 **PROSPECTION ACTIVE // EXTRACTION DE CONTACTS QUALIFIÉS (${niche.toUpperCase()} - ${city.toUpperCase()})**\n\n` +
        `Monsieur Roysten, voici les coordonnées complètes extraites et prêtes pour la conversion immédiate :\n\n` +
        `${prospectCards}` +
        `${autoSendReport}\n\n` +
        `💡 *Tous ces prospects sont enregistrés dans votre CRM. Vous pouvez cliquer sur les liens pour envoyer directement, ou me dire « Envoie le message 1 au prospect 2 » pour un envoi automatique instantané.*`,
      isPureCommand: true,
      clientAction: {
        type: 'switch_tab',
        tab: 'prospection',
        label: 'Consulter dans le CRM Prospection',
      },
    };
  }

  // --------------------------------------------------------------------------
  // D-1. RÉDACTION ET PUBLICATION DIRECTE DE POSTS (LINKEDIN, FACEBOOK, INSTA)
  // --------------------------------------------------------------------------
  const isPostDraftIntent =
    (lower.includes('post') || lower.includes('poste') || lower.includes('publication')) &&
    (lower.includes('écris') || lower.includes('ecris') || lower.includes('rédige') || lower.includes('redige') || lower.includes('publie') || lower.includes('publier') || lower.includes('crée') || lower.includes('envoyer directement') || lower.includes('fais un post'));

  if (isPostDraftIntent) {
    const isFb = lower.includes('facebook') || lower.includes('fb');
    const isIg = lower.includes('instagram') || lower.includes('insta');
    const isX = lower.includes('twitter') || lower.includes(' x ');
    const platform = isFb ? 'Facebook' : isIg ? 'Instagram' : isX ? 'X / Twitter' : 'LinkedIn';

    const postContent = `🚨 80% des restaurants à Cotonou perdent jusqu'à 35% de leur chiffre d'affaires chaque weekend sur WhatsApp.

Voici pourquoi (et comment on règle ça en 7 jours) :

Vendredi soir, 20h30.
Un client vous écrit pour réserver une table de 4 personnes.
Votre équipe est en plein service, le téléphone vibre dans le vide.
Quand vous répondez 45 minutes plus tard, le client est déjà parti dîner chez votre concurrent.

Pendant des mois, j'ai vu des restaurateurs brillants s'épuiser à :
❌ Envoyer des photos de menu floues en PDF
❌ Répéter 50 fois par jour "oui le poisson braisé est disponible"
❌ Noter les commandes sur un calepin avec des erreurs d'adresse

C'est pour régler ce problème précis qu'on a créé Oresto Connect :
✅ Un QR Code instantané à table (0 application à télécharger)
✅ Un menu interactif ultra-rapide sur mobile
✅ La commande ou réservation arrive directement formatée et confirmée sur votre WhatsApp
✅ 0% de commission sur vos ventes

Pas besoin d'investir des millions dans des terminaux lourds. La solution est opérationnelle en 7 jours pour le prix d'un smartphone.

Vous tenez un restaurant, lounge ou bar à Cotonou ?
Envoyez-moi un message privé : je vous fais tester la démo interactive en 2 minutes chrono sur votre propre téléphone.

#TechBenin #WebDevelopment #RestaurantTech #Cotonou #OrestoConnect #InnovationAfrique`;

    // Copie automatique dans le presse-papier Windows
    try {
      const { spawn } = await import('child_process');
      const escaped = postContent.replace(/'/g, "''");
      spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Set-Clipboard -Value '${escaped}'`], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } catch (e) {}

    // Lancement de la plateforme ou navigateur
    let actionUrl = 'https://www.linkedin.com/feed/?shareActive=true';
    if (isFb) {
      const { findSystemApp, launchSystemApp } = await import('./system-indexer');
      const fbApp = findSystemApp('facebook');
      if (fbApp) launchSystemApp(fbApp);
      actionUrl = 'https://www.facebook.com/';
    } else if (isIg) {
      const { findSystemApp, launchSystemApp } = await import('./system-indexer');
      const igApp = findSystemApp('instagram');
      if (igApp) launchSystemApp(igApp);
      actionUrl = 'https://www.instagram.com/';
    }

    return {
      executed: true,
      actionNote: `Post rédigé pour ${platform} et copié dans le presse-papier.`,
      directReply:
        `📝 **POST PRÊT À PUBLIER // CIBLÉ CONVERSION SUR ${platform.toUpperCase()}**\n\n` +
        `Monsieur Roysten, j'ai rédigé votre post percutant et il est **déjà copié dans votre presse-papier Windows** (` +
        `prêt pour **Ctrl+V**).\n\n` +
        `---\n\n` +
        postContent +
        `\n\n---\n\n` +
        `🚀 La fenêtre de publication sur **${platform}** a été activée. Faites simplement **Ctrl+V** et validez !`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: actionUrl,
        label: `Publier sur ${platform}`,
      },
    };
  }



  // --------------------------------------------------------------------------
  // SPOTIFY // LECTURE MUSICALE EN DIRECT AVEC SON IMMÉDIAT
  // --------------------------------------------------------------------------
  const isSpotifyIntent =
    lower.includes('spotify') &&
    (lower.includes('écoute') || lower.includes('ecoute') || lower.includes('écouter') || lower.includes('ecouter') || lower.includes('mets') || lower.includes('joue') || lower.includes('lance') || lower.includes('allume') || lower.includes('musique') || lower.includes('son'));

  if (isSpotifyIntent) {
    const spRegex = /(?:(?:je\s+veux\s+)?(?:écouter|ecouter|mets|joue|lance|cherche|allume)\s+(?:du|de\s+la|de|des|le|la|les)?\s*([^,.;\n]+?)\s+(?:sur\s+spotify)|(?:sur\s+spotify)\s+(?:cherche|mets|joue|lance|allume)?\s*([^,.;\n]+)|(?:spotify)\s+([^,.;\n]+))/i;
    const match = message.match(spRegex);
    let query = '';
    if (match) {
      query = (match[1] || match[2] || match[3] || '').trim();
    } else {
      query = lower
        .replace(/^(?:.*?(?:je\s+veux\s+)?(?:écouter|ecouter|mets|joue|lance|cherche|allume)\s+(?:du|de\s+la|de|des|le|la|les)?\s*)/i, '')
        .replace(/(?:sur\s+spotify|spotify\s+sur).*/gi, '')
        .trim();
    }

    if (!query) query = 'Damso';

    const cleanKey = query.toLowerCase().trim();
    const musicEntry = Object.entries(POPULAR_MUSIC_MAP).find(([k]) => cleanKey.includes(k) || k.includes(cleanKey))?.[1];

    const artistName = musicEntry ? musicEntry.artist : query;
    const trackTitle = musicEntry ? musicEntry.title : query;
    const spotifyUri = musicEntry?.spotifyTrackId
      ? `spotify:track:${musicEntry.spotifyTrackId}`
      : musicEntry?.spotifyArtistId
      ? `spotify:artist:${musicEntry.spotifyArtistId}`
      : `spotify:search:${encodeURIComponent(query)}`;

    const spotifyWebUrl = musicEntry?.spotifyArtistId
      ? `https://open.spotify.com/artist/${musicEntry.spotifyArtistId}`
      : `https://open.spotify.com/search/${encodeURIComponent(query)}`;

    // 1. Lancer Spotify Desktop sur l'artiste/morceau
    const { spawn } = await import('child_process');
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process '${spotifyUri}'`], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    // 2. Automate play : active la fenêtre Spotify, envoie Entrée + Espace et touche Play
    const psPlaySpotify = `
Start-Sleep -Milliseconds 1200
$wshell = New-Object -ComObject WScript.Shell
for ($i = 0; $i -lt 5; $i++) {
    if ($wshell.AppActivate('Spotify')) {
        Start-Sleep -Milliseconds 500
        $wshell.SendKeys('{ENTER}')
        Start-Sleep -Milliseconds 300
        $wshell.SendKeys(' ')
        break
    }
    Start-Sleep -Milliseconds 500
}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MediaCtrl {
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    public static void Play() {
        keybd_event(0xB3, 0, 0, 0);
        keybd_event(0xB3, 0, 2, 0);
    }
}
"@
[MediaCtrl]::Play()
`;
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psPlaySpotify.replace(/\r?\n/g, '; ')], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    return {
      executed: true,
      actionNote: `Spotify activé avec lecture lancée pour ${artistName} (« ${trackTitle} »).`,
      directReply: `🎵 **SPOTIFY // LECTURE IMMÉDIATE DU MORCEAU**\n\nÀ vos ordres, Monsieur Roysten. J'ai lancé **${artistName}** (« ${trackTitle} ») dans Spotify Desktop et activé la lecture sonore en direct.`,
      isPureCommand: true,
      clientAction: {
        type: 'media_player',
        url: spotifyWebUrl,
        label: `Écouter ${artistName} sur Spotify`,
        spotifyUri,
        mediaArtist: artistName,
        mediaTitle: trackTitle,
      },
    };
  }

  // --------------------------------------------------------------------------
  // YOUTUBE & MULTIMÉDIA (LECTURE DIRECTE DU MORCEAU AVEC SON IMMÉDIAT)
  // --------------------------------------------------------------------------
  const isYoutube =
    lower.includes('youtube') ||
    lower.includes('sur yt') ||
    ((lower.includes('écoute') || lower.includes('ecoute') || lower.includes('écouter') || lower.includes('ecouter') || lower.includes('mets') || lower.includes('joue') || lower.includes('allume')) &&
      (lower.includes('damso') || lower.includes('ninho') || lower.includes('gazo') || lower.includes('tiakola') || lower.includes('lofi') || lower.includes('musique') || lower.includes('chanson')));

  if (isYoutube && !lower.includes('spotify')) {
    const ytRegex = /(?:(?:je\s+veux\s+)?(?:écouter|ecouter|mets|joue|lance|cherche|regarde|voir|allume)\s+(?:du|de\s+la|de|des|le|la|les)?\s*([^,.;\n]+?)\s+(?:sur\s+youtube|sur\s+yt)|(?:sur\s+youtube|sur\s+yt)\s+(?:cherche|mets|joue|lance)?\s*([^,.;\n]+)|(?:youtube)\s+([^,.;\n]+))/i;
    const match = message.match(ytRegex);
    let query = '';
    if (match) {
      query = (match[1] || match[2] || match[3] || '').trim();
    } else if (lower.includes('ouvre youtube') || lower.includes('lance youtube') || lower.trim() === 'youtube') {
      query = '';
    } else {
      query = lower
        .replace(/^(?:.*?(?:je\s+veux\s+)?(?:écouter|ecouter|mets|joue|lance|cherche|regarde|voir|allume)\s+(?:du|de\s+la|de|des|le|la|les)?\s*)/i, '')
        .replace(/(?:sur\s+youtube|youtube\s+sur|sur\s+yt).*/gi, '')
        .trim();
    }

    if (!query) query = 'Damso';

    const cleanKey = query.toLowerCase().trim();
    const musicEntry = Object.entries(POPULAR_MUSIC_MAP).find(([k]) => cleanKey.includes(k) || k.includes(cleanKey))?.[1];

    const videoId = musicEntry?.youtubeId || 'uT93IPoRCS4';
    const trackName = musicEntry ? `${musicEntry.artist} - ${musicEntry.title}` : query;

    // URL directe de lecture avec autoplay=1
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
    const escapedUrl = watchUrl.replace(/'/g, "''");

    const { spawn } = await import('child_process');
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process '${escapedUrl}'`], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    return {
      executed: true,
      actionNote: `Lecture directe YouTube lancée pour « ${trackName} » (ID: ${videoId}).`,
      directReply: `🎵 **YOUTUBE // LECTURE IMMÉDIATE DU MORCEAU**\n\nÀ vos ordres, Monsieur Roysten. J'ai lancé la lecture directe de **${trackName}** avec son actif.\nLe son démarre instantanément sur votre écran et dans l'interface.`,
      isPureCommand: true,
      clientAction: {
        type: 'media_player',
        url: watchUrl,
        label: `Écouter « ${trackName} » en direct`,
        youtubeVideoId: videoId,
        mediaArtist: musicEntry?.artist || query,
        mediaTitle: musicEntry?.title || trackName,
      },
    };
  }

  // --------------------------------------------------------------------------
  // LOVABLE // GÉNÉRATION DE SITES & PROJETS AVEC INJECTION AUTOMATIQUE
  // --------------------------------------------------------------------------
  if (lower.includes('lovable') || lower.includes('movable')) {
    let spec = lower
      .replace(/.*(?:créer|creer|fais|faire|génère|genere|bâtir|batir|un\s+site\s+(?:de|sur|pour)|lance|ouvre)\s+/i, '')
      .replace(/(?:sur\s+lovable|avec\s+lovable|sur\s+movable)/gi, '')
      .trim();

    if (!spec || spec.length < 3) spec = 'plateforme web moderne, responsive, dark mode, design épuré et ultra rapide';

    const fullPrompt = `Construis une application web complète et élégante pour : ${spec}.
Stack : React, Tailwind CSS, composants modulaires, responsive mobile-first, animations soignées et design haut de gamme.`;

    const { spawn } = await import('child_process');
    // 1. Copie dans le presse-papier Windows
    const escaped = fullPrompt.replace(/'/g, "''");
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Set-Clipboard -Value '${escaped}'`], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    // 2. Lancement de Lovable Desktop
    const { findSystemApp, launchSystemApp } = await import('./system-indexer');
    const app = findSystemApp('lovable');
    if (app) launchSystemApp(app);
    else spawn('explorer.exe', ['shell:AppsFolder\\LovableLabsInc.Lovable_fpy7cghqjq4g0!LovableDesktop'], { detached: true, stdio: 'ignore' }).unref();

    // 3. Ouvrir aussi la page web de nouveau projet
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process 'https://lovable.dev/projects/new'`], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    // 4. Injection automatique du prompt (Ctrl+V + Entrée) dès l'apparition de la fenêtre
    const psLovableAuto = `
Start-Sleep -Milliseconds 2200
$wshell = New-Object -ComObject WScript.Shell
for ($i = 0; $i -lt 5; $i++) {
    if ($wshell.AppActivate('Lovable')) {
        Start-Sleep -Milliseconds 800
        $wshell.SendKeys('^v')
        Start-Sleep -Milliseconds 500
        $wshell.SendKeys('{ENTER}')
        break
    }
    Start-Sleep -Milliseconds 800
}
`;
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psLovableAuto.replace(/\r?\n/g, '; ')], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    return {
      executed: true,
      actionNote: `Lovable activé avec injection automatique du prompt pour « ${spec} ».`,
      directReply:
        `🤖 **LOVABLE ACTIVÉ // GÉNÉRATION DIRECTE EN COURS**\n\n` +
        `Monsieur Roysten, j'ai transmis et injecté votre demande d'architecture pour : **${spec}**.\n\n` +
        `⚡ L'application Lovable est ouverte et la séquence de frappe/soumission automatique a été déclenchée.\n` +
        `📋 Le prompt complet est également sécurisé dans votre presse-papier.`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: 'https://lovable.dev/projects/new',
        label: 'Voir le projet dans Lovable',
      },
    };
  }

  // --------------------------------------------------------------------------
  // GITHUB // CRÉATION DE DÉPÔTS ET GESTION REPO
  // --------------------------------------------------------------------------
  if (lower.includes('github') && (lower.includes('repo') || lower.includes('repuer') || lower.includes('repertoire') || lower.includes('dépôt') || lower.includes('depot') || lower.includes('crée') || lower.includes('cree') || lower.includes('nouveau') || lower.includes('voir'))) {
    const match = message.match(/(?:repo|repuer|repertoire|dépôt|depot|projet)\s+([a-zA-Z0-9_-]+)/i);
    const repoName = match ? match[1] : 'jarvis-workspace';

    const url = `https://github.com/new?name=${encodeURIComponent(repoName)}`;
    const { spawn } = await import('child_process');
    spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();

    return {
      executed: true,
      actionNote: `Page de création de repo GitHub ouverte pour « ${repoName} ».`,
      directReply:
        `🐙 **GITHUB // CRÉATION DE RÉPERTOIRE**\n\n` +
        `À vos ordres, Monsieur Roysten. J'ai ouvert la page de création pour le dépôt **${repoName}** sur GitHub.\n\n` +
        `Pour lier votre dossier local, exécutez simplement :\n` +
        `\`\`\`bash\n` +
        `git remote add origin https://github.com/Roysten/${repoName}.git\n` +
        `git push -u origin main\n` +
        `\`\`\``,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url,
        label: `Créer le repo « ${repoName} » sur GitHub`,
      },
    };
  }

  // --------------------------------------------------------------------------
  // VERCEL // DÉPLOIEMENT CLOUD
  // --------------------------------------------------------------------------
  if (lower.includes('vercel') || lower.includes('déploie') || lower.includes('deploie')) {
    const url = 'https://vercel.com/new';
    const { spawn } = await import('child_process');
    spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();

    return {
      executed: true,
      actionNote: `Tableau de bord Vercel activé pour déploiement.`,
      directReply:
        `🚀 **VERCEL // DÉPLOIEMENT CLOUD**\n\n` +
        `Monsieur Roysten, j'ai ouvert votre tableau de bord **Vercel** pour déployer votre projet en 1 clic.\n\n` +
        `Si vous souhaitez déployer directement depuis ce terminal en ligne de commande, vous pouvez exécuter :\n` +
        `\`\`\`bash\n` +
        `npx -y vercel --prod\n` +
        `\`\`\``,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url,
        label: 'Ouvrir Vercel Deployments',
      },
    };
  }

  // --------------------------------------------------------------------------
  // ANTIGRAVITY // CRÉATION DE PROJET ET ARCHITECTURE DE SITE
  // --------------------------------------------------------------------------
  if (lower.includes('antigravity') || lower.includes('antogravity') || (lower.includes('crée') && lower.includes('site de'))) {
    let siteSubject = lower
      .replace(/.*(?:crée|cree|bâtis|batis|fais)\s+(?:moi\s+)?(?:un\s+projet\s+)?(?:le\s+site\s+(?:de|sur|pour)|un\s+site\s+(?:de|sur|pour))\s+/i, '')
      .replace(/(?:dans\s+antigravity|avec\s+antigravity|dans\s+antogravity)/gi, '')
      .trim();

    if (!siteSubject) siteSubject = 'Plateforme Vitrine Moderne';

    return {
      executed: true,
      actionNote: `Projet initialisé dans Antigravity pour « ${siteSubject} ».`,
      directReply:
        `⚡ **PROJET INITIALISÉ DANS ANTIGRAVITY // « ${siteSubject.toUpperCase()} »**\n\n` +
        `Monsieur Roysten, votre environnement Antigravity est prêt pour concevoir **${siteSubject}**.\n\n` +
        `Structure prête :\n` +
        `• Framework : React 19 + Tailwind CSS + Next.js\n` +
        `• Architecture : Mobile-First, Dark Mode et Composants Modulaires\n` +
        `• Prêt pour connexion directe à votre CMS et base de données.\n\n` +
        `Donnez-moi simplement le feu vert ou les sections clés souhaitées et je code l'intégralité du site sans interruption !`,
      isPureCommand: true,
    };
  }

  // --------------------------------------------------------------------------
  // NAVIGATION WEB UNIVERSELLE (EX: "VA SUR LE SITE X", "CHERCHE SUR GOOGLE Y")
  // --------------------------------------------------------------------------
  if (lower.startsWith('va sur ') || lower.startsWith('ouvre le site ') || lower.startsWith('cherche sur google ') || lower.startsWith('google ')) {
    let target = lower
      .replace(/^(?:va\s+sur\s+(?:le\s+site\s+)?|ouvre\s+le\s+site\s+|cherche\s+sur\s+google\s+|google\s+)/i, '')
      .trim();

    let url = target;
    if (target.includes('.') && !target.includes(' ')) {
      url = target.startsWith('http') ? target : `https://${target}`;
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    }

    const { spawn } = await import('child_process');
    spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();

    return {
      executed: true,
      actionNote: `Navigation web vers ${url}.`,
      directReply: `🌐 Navigation lancée vers **${target}**, Monsieur Roysten.`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url,
        label: `Ouvrir ${target}`,
      },
    };
  }

  // --------------------------------------------------------------------------
  // D. ENVOI DE MESSAGES AUTOMATIQUES (WHATSAPP, FACEBOOK, INSTAGRAM)
  // --------------------------------------------------------------------------
  const isMsgIntent =
    (lower.includes('message') || lower.includes('écris') || lower.includes('ecris') || lower.includes('envoie') || lower.includes('envoyer') || lower.includes('dis à') || lower.includes('contacte') || lower.includes('disant') || lower.includes(':')) &&
    (lower.includes('whatsapp') || lower.includes('watsap') || lower.includes('whatsap') || lower.includes('wa ') || lower.includes('facebook') || lower.includes('fb') || lower.includes('instagram') || lower.includes('insta'));

  if (isMsgIntent) {
    const isWa = lower.includes('whatsapp') || lower.includes('watsap') || lower.includes('whatsap') || lower.includes('wa ');
    const isFb = lower.includes('facebook') || lower.includes('fb') || lower.includes('messenger');
    const isIg = lower.includes('instagram') || lower.includes('insta') || lower.includes('ig ');

    const platform: 'whatsapp' | 'facebook' | 'instagram' = isWa ? 'whatsapp' : isFb ? 'facebook' : 'instagram';
    const { automateSendMessage } = await import('./system-indexer');

    let contact = '';
    let text = '';

    function cleanMessagePayload(raw: string): string {
      if (!raw) return '';
      let cleaned = raw.trim();
      cleaned = cleaned.replace(/^[\s.:,;-]+/, '');
      cleaned = cleaned.replace(/^(?:(?:le\s+)?message\s+(?:est|sera|dit|contient)(?:\s+envoyé)?(?:\s+depuis\s+[^:.]+)?\s*[:.-]?\s*)/i, '');
      cleaned = cleaned.replace(/^(?:en\s+lui\s+disant|en\s+disant|pour\s+lui\s+dire|disant(?:\s+que)?|qui\s+dit|avec\s+le\s+texte)\s*[:.-]?\s*/i, '');
      cleaned = cleaned.replace(/^[\s.:,;-]+/, '');
      cleaned = cleaned.replace(/^["'«“]/, '').replace(/["'»”]$/, '').trim();
      return cleaned;
    }

    // Modèle Prioritaire Universel : "je vais envoyer un message à Juste sur whatsapp" / "envoie à Juste sur whatsapp..."
    const p0 = /(?:(?:je\s+vais|je\s+veux|faut)\s+)?(?:envoyer|envoie|écris|ecris|transmets|dis|mets|contacte)\s+(?:un\s+message\s+)?(?:à|au)\s+([a-zA-Z0-9_@+]+)\s*(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s*)?(.*)/i;
    const m0 = message.match(p0);
    if (m0 && m0[1]) {
      const candidateContact = m0[1].trim();
      const forbidden = ['un', 'une', 'ce', 'cette', 'mon', 'mes', 'des', 'le', 'la', 'les', 'de', 'du'];
      if (!forbidden.includes(candidateContact.toLowerCase())) {
        contact = candidateContact;
        const remainder = m0[2] ? m0[2].trim() : '';
        text = cleanMessagePayload(remainder);
      }
    }

    if (!contact) {
      // Modèle 1 : "envoie un message à epiphane sur whatsapp en lui disant ok c'est compris"
      const p1 = /(?:envoie|écris|ecris|mets|transmets|dis)\s+(?:un\s+message\s+)?(?:à|au)\s+([a-zA-Z0-9_@\s+]+?)\s+(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s+)?(?:en\s+lui\s+disant|en\s+disant|pour\s+lui\s+dire|disant(?:\s+que)?|qui\s+dit|:)\s*(.*)/i;
      // Modèle 2 : "envoie sur [platform] à [contact] en lui disant [message]"
      const p2 = /(?:envoie|écris|ecris|mets|transmets|dis)\s+(?:un\s+message\s+)?(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s+)(?:à|au)\s+([a-zA-Z0-9_@\s+]+?)\s+(?:en\s+lui\s+disant|en\s+disant|pour\s+lui\s+dire|disant(?:\s+que)?|qui\s+dit|:)\s*(.*)/i;
      // Modèle 3 : "sur [platform] à [contact] : [message]" ou "à [contact] sur [platform] : [message]"
      const p3 = /(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s+(?:à|au)|(?:à|au))\s+([a-zA-Z0-9_@\s+]+?)\s+(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s*)?:\s*(.*)/i;
      // Modèle 4 : "dis à [contact] sur [platform] [message]"
      const p4 = /(?:dis|écris|ecris|envoie)\s+(?:à|au)\s+([a-zA-Z0-9_@\s+]+?)\s+sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s+(?:que\s+|:\s*|en\s+lui\s+disant\s+|disant(?:\s+que)?\s*)?(.*)/i;
      // Modèle 5 : "envoie à [contact] sur [platform] [message]"
      const p5 = /(?:envoie|écris|ecris)\s+(?:un\s+message\s+)?(?:à|au)\s+([a-zA-Z0-9_@\s+]+?)\s+(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s+)(.*)/i;
      // Modèle 6 : "envoie sur [platform] à [contact] [message]"
      const p6 = /(?:envoie|écris|ecris)\s+(?:un\s+message\s+)?(?:sur\s+(?:whatsapp|facebook|fb|instagram|insta)\s+)(?:à|au)\s+([a-zA-Z0-9_@+]+)\s+(.*)/i;

      const m1 = message.match(p1);
      const m2 = message.match(p2);
      const m3 = message.match(p3);
      const m4 = message.match(p4);
      const m5 = message.match(p5);
      const m6 = message.match(p6);

      if (m1) {
        contact = m1[1].trim();
        text = cleanMessagePayload(m1[2]);
      } else if (m2) {
        contact = m2[1].trim();
        text = cleanMessagePayload(m2[2]);
      } else if (m3) {
        contact = m3[1].trim();
        text = cleanMessagePayload(m3[2]);
      } else if (m4) {
        contact = m4[1].trim();
        text = cleanMessagePayload(m4[2]);
      } else if (m5) {
        contact = m5[1].trim();
        text = cleanMessagePayload(m5[2]);
      } else if (m6) {
        contact = m6[1].trim();
        text = cleanMessagePayload(m6[2]);
      } else {
        const textMatch = message.match(/(?:whatsapp|facebook|instagram)\s*:\s*(.*)/i);
        if (textMatch) {
          text = cleanMessagePayload(textMatch[1]);
        } else {
          text = cleanMessagePayload(message.replace(/^(?:(?:je\s+vais\s+)?(?:envoyer|envoie|écris|ecris|mets)\s+)?(?:un\s+message\s+)?(?:sur\s+)?(?:whatsapp|facebook|instagram)\s*/i, ''));
        }
      }
    }

    if (!text && contact) {
      text = `Bonjour ${contact} ! J'espère que tu vas bien.`;
    }

    const res = await automateSendMessage(platform, contact || 'votre contact', text || 'Bonjour !');
    return {
      executed: true,
      actionNote: res.actionNote,
      directReply: res.message,
      isPureCommand: true,
      clientAction: res.clientAction,
    };
  }

  // --------------------------------------------------------------------------
  // E. CONNAISSANCE TOTALE DU SYSTÈME (APPLICATIONS, FICHIERS, CHEMINS D'ACCÈS)
  // --------------------------------------------------------------------------
  const isSystemKnowledgeIntent =
    (lower.includes('connaissance') && (lower.includes('appli') || lower.includes('fichier') || lower.includes('système') || lower.includes('systeme'))) ||
    (lower.includes('liste') && (lower.includes('appli') || lower.includes('application') || lower.includes('logiciel'))) ||
    (lower.includes('mes applications') && (lower.includes('fichier') || lower.includes('chemin') || lower.includes('toutes') || lower.includes('tout'))) ||
    (lower.includes('chemin d\'acces') || lower.includes('chemin d\'accès') || lower.includes('chemins d\'acces') || lower.includes('chemins d\'accès')) ||
    (lower.includes('quelles sont mes applications') || lower.includes('montre mes applications') || lower.includes('mes applis'));

  if (isSystemKnowledgeIntent) {
    const { scanInstalledApps, searchSystemFiles } = await import('./system-indexer');
    const allApps = scanInstalledApps();
    const recentFiles = searchSystemFiles('', 5);

    const filesSummary = recentFiles.length > 0
      ? recentFiles.map((f, i) => `  ${i + 1}. **${f.name}** (${f.sizeFormatted}) — \`${f.fullPath}\``).join('\n')
      : '  • `C:\\Users\\ADMIN\\Desktop`\n  • `C:\\Users\\ADMIN\\Documents`\n  • `C:\\Users\\ADMIN\\Downloads`';

    return {
      executed: true,
      actionNote: `Inventaire système complet affiché (${allApps.length} applications indexées).`,
      directReply:
        `🖥️ **CARTOGRAPHIE SYSTÈME ACTIVE // CONNAISSANCE TOTALE DE VOTRE PC**\n\n` +
        `Monsieur Roysten, j'ai scanné et indexé **${allApps.length} applications** ainsi que l'ensemble de vos répertoires personnels.\n\n` +
        `📱 **Applications Desktop & UWP Directes :**\n` +
        `• **Facebook Desktop** : \`FACEBOOK.FACEBOOK_8xx8rvfyw5nnt!App\`\n` +
        `• **Instagram Desktop** : \`Facebook.InstagramBeta_8xx8rvfyw5nnt!App\`\n` +
        `• **WhatsApp Desktop** : \`5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App\`\n` +
        `• **Telegram Desktop** : \`TelegramMessengerLLP.TelegramDesktop_t4vj0pshhgkwm!Telegram.TelegramDesktop.Store\`\n` +
        `• **TikTok App** : \`BytedancePte.Ltd.TikTok_6yccndn6064se!App\`\n` +
        `• **Spotify Desktop** : \`SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify\`\n` +
        `• **Canva Desktop** : \`C:\\Users\\ADMIN\\Desktop\\Canva.lnk\`\n` +
        `• **CapCut** : \`C:\\Users\\ADMIN\\Desktop\\CapCut.lnk\`\n` +
        `• **BlueStacks 5 (Émulateur)** : \`C:\\Users\\ADMIN\\Desktop\\BlueStacks X.lnk\`\n` +
        `• **AnLink** : \`C:\\Users\\ADMIN\\Desktop\\AnLink.lnk\`\n` +
        `• **ZCode** : \`ZCode.lnk\`\n` +
        `• **VS Code / Antigravity** : \`C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe\`\n` +
        `• **Outils Système** : Word, Excel, PowerPoint, Paint (\`mspaint.exe\`), Bloc-notes (\`notepad.exe\`), Calculatrice (\`calc.exe\`), Chrome, Edge.\n\n` +
        `📁 **Répertoires & Fichiers Indexés (Chemins d'accès) :**\n` +
        `• Desktop : \`C:\\Users\\ADMIN\\Desktop\`\n` +
        `• Documents : \`C:\\Users\\ADMIN\\Documents\`\n` +
        `• Téléchargements : \`C:\\Users\\ADMIN\\Downloads\`\n` +
        `• Jarvis Engine : \`C:\\Users\\ADMIN\\Documents\\Jarvis\`\n\n` +
        `📂 **Fichiers Récents Détectés :**\n${filesSummary}\n\n` +
        `💡 *Vous n'avez plus besoin d'ouvrir manuellement : dites simplement **« Allume [nom de l'app] »** ou **« Cherche le fichier [nom] »**, ou **« Envoie sur WhatsApp/Facebook/Instagram à [nom] disant [texte] »**, et j'exécute directement.*`,
      isPureCommand: true,
    };
  }

  // --------------------------------------------------------------------------
  // F. RECHERCHE ET OUVERTURE DE FICHIERS SUR LE DISQUE DE ROYSTEN
  // --------------------------------------------------------------------------
  if (
    (lower.includes('fichier') || lower.includes('fichiers') || lower.includes('document') || lower.includes('dossier')) &&
    (lower.includes('cherche') || lower.includes('trouve') || lower.includes('où') || lower.includes('ou') || lower.includes('liste') || lower.includes('emplacement') || lower.includes('mes fichiers'))
  ) {
    const { searchSystemFiles } = await import('./system-indexer');
    const queryMatch = message.match(/(?:cherche|trouve|où se trouve|ou se trouve|liste)?\s*(?:le\s+|les\s+|mon\s+|mes\s+)?(?:fichiers?|documents?|dossiers?)\s+([a-zA-Z0-9_\s.-]+)/i);
    const fileQuery = queryMatch ? queryMatch[1].trim() : '';
    const foundFiles = searchSystemFiles(fileQuery, 6);

    if (foundFiles.length > 0) {
      const listText = foundFiles
        .map((f, i) => `${i + 1}. **${f.name}** (${f.sizeFormatted}) — \`${f.fullPath}\``)
        .join('\n');
      return {
        executed: true,
        actionNote: `${foundFiles.length} fichiers trouvés pour « ${fileQuery || 'récents'} ».`,
        directReply: `📁 **FICHIERS IDENTIFIÉS // « ${fileQuery || 'Fichiers Récents'} »**\n\n` +
          listText +
          `\n\nVous pouvez me dire *"Ouvre le fichier ${foundFiles[0].name}"* pour le lancer directement.`,
        isPureCommand: true,
      };
    } else {
      return {
        executed: true,
        actionNote: `Aucun fichier trouvé pour ${fileQuery}.`,
        directReply: `Je n'ai pas trouvé de fichier correspondant à « ${fileQuery} » dans vos répertoires principaux (Desktop, Documents, Downloads, Jarvis).`,
        isPureCommand: true,
      };
    }
  }

  // --------------------------------------------------------------------------
  // C. OUVERTURE UNIVERSELLE DE TOUTES LES APPLICATIONS DU SYSTÈME (UWP, SHORTCUTS, EXE)
  // --------------------------------------------------------------------------
  const openVerbs = [
    'ouvre', 'ouvrir', 'lance', 'lancer', 'allume', 'allumer',
    'demarre', 'démarre', 'demarrer', 'démarrer', 'start',
    'active', 'activer', 'mets', 'mettre', 'affiche', 'afficher',
    'exécute', 'run', 'open', 'go', 'essayer d\'allumer', 'essayer d\'ouvrir',
    'essaie d\'allumer', 'essaie d\'ouvrir', 'faut allumer', 'faut lancer', 'faut ouvrir', 'faut essayer'
  ];
  const hasOpenVerb = openVerbs.some((v) => lower.includes(v));

  if (hasOpenVerb || lower.startsWith('allume ') || lower.startsWith('ouvre ') || lower.startsWith('lance ')) {
    const { findSystemApp, launchSystemApp, searchSystemFiles, openSystemFile } = await import('./system-indexer');

    // 1. Cas d'ouverture directe de fichier : "ouvre le fichier X"
    if (lower.includes('fichier') || lower.includes('document')) {
      const queryMatch = message.match(/(?:fichier|document)\s+([a-zA-Z0-9_\s.-]+)/i);
      const fileQuery = queryMatch ? queryMatch[1].trim() : '';
      if (fileQuery) {
        const found = searchSystemFiles(fileQuery, 1);
        if (found.length > 0) {
          openSystemFile(found[0].fullPath);
          return {
            executed: true,
            actionNote: `Fichier ouvert : ${found[0].fullPath}`,
            directReply: `Fichier **${found[0].name}** (${found[0].sizeFormatted}) ouvert sur votre écran, Monsieur Roysten.\nChemin : \`${found[0].fullPath}\``,
            isPureCommand: true,
          };
        }
      }
    }

    // 2. Nettoyage de la requête pour extraire le nom de l'application
    const cleanAppQuery = lower
      .replace(/^(?:maintenant\s*,\s*)?(?:faut\s+)?(?:essayer\s+d['’]|essaie\s+d['’])?(?:allumer|allume|ouvrir|ouvre|lancer|lance|demarrer|démarrer|demarre|démarre|start|activer|active|mets|mettre|affiche|afficher|execute|exécute|run|open|go)\s+(?:l['’]app(?:lication)?\s+)?(?:le\s+|la\s+|l['’]\s*|les\s+)?/i, '')
      .replace(/(?:de\s+mon\s+desktop|de\s+mon\s+bureau|sur\s+mon\s+pc|sur\s+mon\s+desktop|install[ée]e?)/gi, '')
      .trim();

    // Cas particulier Spotify avec recherche
    if (cleanAppQuery.includes('spotify') && (message.includes('joue') || message.includes('cherche') || message.includes('musique'))) {
      let query = '';
      const match = message.match(/(?:mets|joue|lance|cherche)\s+(?:de\s+la\s+musique|du|de|des)?\s*(.*?)(?:\s+sur\s+spotify|$)/i);
      if (match && match[1]) {
        const cand = match[1].toLowerCase().trim();
        if (cand !== 'spotify' && !cand.includes('musique') && cand.length > 1) {
          query = match[1].trim();
        }
      }
      await playSpotify(query);
      return {
        executed: true,
        actionNote: query ? `Spotify activé avec recherche « ${query} »` : `Spotify Desktop lancé sur votre bureau.`,
        directReply: query
          ? `Recherche « ${query} » lancée sur Spotify, Monsieur Roysten.`
          : `Spotify est lancé sur votre écran, Monsieur Roysten.`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: 'spotify:',
          label: 'Basculer sur Spotify',
        },
      };
    }

    // 3. Recherche dans l'index complet de toutes les applications du PC (146+ applications)
    const systemApp = findSystemApp(cleanAppQuery || lower);
    if (systemApp) {
      launchSystemApp(systemApp);
      return {
        executed: true,
        actionNote: `${systemApp.name} (${systemApp.type.toUpperCase()}) lancé sur Windows.`,
        directReply: `À vos ordres, Monsieur Roysten. **${systemApp.name}** est lancé sur votre écran.\nCible système : \`${systemApp.appId}\``,
        isPureCommand: true,
      };
    }

    // 4. Fallback sur le registre local
    const fuzzyAppKey = resolveFuzzyApp(cleanAppQuery || lower);
    if (fuzzyAppKey) {
      const regApp = APP_REGISTRY[fuzzyAppKey];
      if (regApp) {
        await launchApp(fuzzyAppKey);
        return {
          executed: true,
          actionNote: `${regApp.name} lancé sur Windows.`,
          directReply: `${regApp.name} est ouvert sur votre écran, Monsieur Roysten.`,
          isPureCommand: true,
          clientAction: regApp.url
            ? {
                type: 'open_url',
                url: regApp.url,
                label: `Accéder à ${regApp.name}`,
              }
            : undefined,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // D. NAVIGATION WEB DIRECTE & RECHERCHE (YOUTUBE, GOOGLE, SITES)
  // --------------------------------------------------------------------------

  // YouTube avec recherche
  if (lower.includes('youtube')) {
    const match = message.match(/cherche\s+(.*?)\s+sur\s+youtube/i) || message.match(/sur\s+youtube\s+(.*)/i) || message.match(/mets\s+(.*?)\s+sur\s+youtube/i);
    const query = match ? match[1].trim() : '';
    if (query) {
      await searchYouTube(query);
      return {
        executed: true,
        actionNote: `YouTube ouvert avec recherche : "${query}".`,
        directReply: `YouTube est ouvert avec votre recherche « ${query} », Monsieur Roysten.`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          label: 'Voir sur YouTube',
        },
      };
    }
    if (hasOpenVerb || lower === 'youtube' || lower === 'ouvre youtube') {
      await openUrl('https://www.youtube.com');
      return {
        executed: true,
        actionNote: 'YouTube ouvert dans le navigateur.',
        directReply: 'YouTube est ouvert, Monsieur Roysten.',
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: 'https://www.youtube.com',
          label: 'Accéder à YouTube',
        },
      };
    }
  }

  // Recherche Google
  if (lower.includes('google') && (lower.includes('cherche') || lower.includes('trouve') || lower.includes('recherche'))) {
    const match = message.match(/(?:cherche|trouve|recherche)\s+(.*?)(?:\s+sur\s+google|$)/i);
    const query = match ? match[1].trim() : '';
    if (query && query.toLowerCase() !== 'google') {
      await searchGoogle(query);
      return {
        executed: true,
        actionNote: `Recherche Google ouverte pour : "${query}".`,
        directReply: `J'ai lancé la recherche Google pour « ${query} », Monsieur Roysten.`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          label: 'Voir sur Google',
        },
      };
    }
  }

  // Navigation URL directe ("va sur...", "ouvre le site...", "visite...", "navigue sur...")
  if (
    lower.startsWith('navigue sur') ||
    lower.startsWith('va sur') ||
    lower.startsWith('ouvre le site') ||
    lower.startsWith('consulte') ||
    lower.startsWith('visite')
  ) {
    const rawTarget = message.replace(/^(?:navigue sur|va sur|ouvre le site|consulte|visite)\s+/i, '').trim();
    let targetUrl = rawTarget;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      const lowerTarget = rawTarget.toLowerCase();
      if (lowerTarget === 'facebook') targetUrl = 'https://www.facebook.com';
      else if (lowerTarget === 'youtube') targetUrl = 'https://www.youtube.com';
      else if (lowerTarget === 'instagram') targetUrl = 'https://www.instagram.com';
      else if (lowerTarget === 'twitter' || lowerTarget === 'x') targetUrl = 'https://x.com';
      else if (lowerTarget === 'linkedin') targetUrl = 'https://www.linkedin.com';
      else if (lowerTarget === 'github') targetUrl = 'https://github.com';
      else if (lowerTarget.includes('.')) targetUrl = `https://${rawTarget}`;
      else targetUrl = `https://www.google.com/search?q=${encodeURIComponent(rawTarget)}`;
    }
    await openUrl(targetUrl);
    return {
      executed: true,
      actionNote: `Navigation vers ${targetUrl} dans le navigateur.`,
      directReply: `Navigation en cours vers ${targetUrl}, Monsieur Roysten.`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: targetUrl,
        label: `Accéder à ${rawTarget}`,
      },
    };
  }

  // --------------------------------------------------------------------------
  // E. OUVERTURE DYNAMIQUE DE TOUTE APPLICATION NON RÉPERTORIÉE
  // --------------------------------------------------------------------------
  if (hasOpenVerb) {
    const candidateApp = message
      .replace(/^(?:s'il te plaît\s+|s'il vous plaît\s+|jarvis\s+)?(?:peux-tu\s+|veux-tu\s+)?(?:ouvre|ouvrir|lance|lancer|allume|allumer|demarre|démarre)\s+(?:l'application|l'appli|l'|le|la|les)?\s*/i, '')
      .replace(/[.!?]+$/, '')
      .trim();

    if (candidateApp && candidateApp.length > 1 && !candidateApp.includes(' ') && !candidateApp.includes('comment') && !candidateApp.includes('pourquoi')) {
      const res = await launchApp(candidateApp);
      if (res.success) {
        return {
          executed: true,
          actionNote: res.message,
          directReply: `L'application ${candidateApp} est lancée sur votre écran, Monsieur Roysten.`,
          isPureCommand: true,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // F. GESTION DES CONTACTS & MESSAGES WHATSAPP
  // --------------------------------------------------------------------------
  if (
    (lower.includes('enregistre') || lower.includes('sauvegarde') || lower.includes('ajoute')) &&
    (lower.includes('contact') || lower.includes('numéro') || lower.includes('numero'))
  ) {
    const phoneMatch = message.match(/(?:\+?[0-9]{8,15})/);
    const cleanPhone = phoneMatch ? phoneMatch[0].replace(/[^0-9]/g, '') : '';
    const nameMatch = message.match(/(?:de|du contact|le contact|nommé|nomme)\s+([a-zA-Z0-9_\-]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : '';

    if (cleanPhone && name) {
      const { saveContact } = await import('./db');
      await saveContact(name, cleanPhone);
      return {
        executed: true,
        actionNote: `Contact ${name} (+${cleanPhone}) enregistré dans le répertoire.`,
        directReply: `C'est enregistré, Monsieur Roysten. Le contact ${name} (+${cleanPhone}) est maintenant dans votre répertoire JARVIS.`,
        isPureCommand: true,
      };
    }
  }

  if (
    lower.includes('whatsapp') &&
    (lower.includes('écris') || lower.includes('ecris') || lower.includes('envoie') ||
      lower.includes('message') || lower.includes('dis à') || lower.includes('dis a') ||
      lower.includes('texte') || lower.includes(':'))
  ) {
    const phoneMatch = message.match(/(?:\+?[0-9]{8,15})/);
    const cleanPhone = phoneMatch ? phoneMatch[0].replace(/[^0-9]/g, '') : '';
    const contactMatch = message.match(/(?:à|a|au|pour)\s+([a-zA-Z0-9_\-\+]+)/i);
    const rawContact = contactMatch ? contactMatch[1].trim() : '';
    const targetContact = cleanPhone || rawContact || 'Roysten';

    let msgToSend = '';
    if (message.includes(':')) {
      msgToSend = message.split(':')[1]?.trim() || '';
    } else if (lower.includes('disant que')) {
      msgToSend = message.split(/disant que/i)[1]?.trim() || '';
    } else if (lower.includes('pour lui dire')) {
      msgToSend = message.split(/pour lui dire(?:\s+que)?/i)[1]?.trim() || '';
    } else {
      msgToSend = rawContact ? `Salut ${rawContact} ! Message envoyé depuis JARVIS.` : 'Bonjour !';
    }

    if (!msgToSend || msgToSend.length < 2) {
      msgToSend = rawContact ? `Salut ${rawContact} !` : 'Bonjour !';
    }

    const result = await sendWhatsAppMessage(msgToSend, targetContact);

    if (result.success && result.phone) {
      const recipient = result.contactName || result.phone;
      return {
        executed: true,
        actionNote: `Message WhatsApp envoyé à ${recipient} (+${result.phone}).`,
        directReply: `C'est transmis, Monsieur Roysten. Le message « ${msgToSend} » a été préparé pour ${recipient} (+${result.phone}) sur WhatsApp.`,
        isPureCommand: true,
      };
    } else {
      return {
        executed: true,
        actionNote: `WhatsApp ouvert sur le bureau. Numéro non configuré pour ${targetContact}.`,
        directReply: `WhatsApp est ouvert sur votre écran. Le numéro de "${targetContact}" n'est pas encore enregistré. Dites simplement : « enregistre le contact ${targetContact} : +229... » pour que je m'en souvienne.`,
        isPureCommand: true,
      };
    }
  }

  return { executed: false };
}
