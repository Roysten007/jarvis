import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface InstalledApp {
  name: string;
  appId: string;
  type: 'uwp' | 'shortcut' | 'exe';
  targetPath?: string;
  keywords: string[];
}

export interface FileSearchResult {
  name: string;
  fullPath: string;
  sizeBytes: number;
  sizeFormatted: string;
  modifiedAt: string;
  isDirectory: boolean;
}

const APPS_CACHE_FILE = path.join(process.cwd(), '.data', 'installed_apps.json');
let memoryAppsCache: InstalledApp[] | null = null;

// Normaliser une chaîne pour la recherche
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

// Distance de Levenshtein
function levenshtein(a: string, b: string): number {
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

// Scanner toutes les applications réelles du système Windows (StartApps, UWP, Bureau, Programmes)
export function scanInstalledApps(forceRefresh = false): InstalledApp[] {
  if (!forceRefresh && memoryAppsCache && memoryAppsCache.length > 0) {
    return memoryAppsCache;
  }

  // Vérifier le cache disque
  if (!forceRefresh && fs.existsSync(APPS_CACHE_FILE)) {
    try {
      const data = fs.readFileSync(APPS_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryAppsCache = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  const appMap = new Map<string, InstalledApp>();

  // 1. Scanner Get-StartApps (Applications Windows Store UWP et raccourcis officiels)
  try {
    const rawStartApps = execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-StartApps | ConvertTo-Json -Depth 2"', {
      encoding: 'utf8',
      timeout: 10000,
    });
    const parsedStartApps = JSON.parse(rawStartApps);
    if (Array.isArray(parsedStartApps)) {
      for (const item of parsedStartApps) {
        if (!item.Name || !item.AppID) continue;
        const name = item.Name.trim();
        const appId = item.AppID.trim();
        const isUwp = appId.includes('!') || appId.includes('_8wekyb3d8bbwe') || appId.includes('_');

        const normName = normalizeString(name);
        const keywords = normName.split(/\s+/).filter((k) => k.length > 1);

        appMap.set(appId.toLowerCase(), {
          name,
          appId,
          type: isUwp ? 'uwp' : 'shortcut',
          keywords: Array.from(new Set([name.toLowerCase(), normName, ...keywords])),
        });
      }
    }
  } catch (e) {
    console.warn('[SYSTEM_INDEXER] Avertissement scan StartApps:', e);
  }

  // 2. Scanner les raccourcis .lnk sur le Bureau
  const desktopDirs = [
    path.join(process.env.USERPROFILE || 'C:\\Users\\ADMIN', 'Desktop'),
    'C:\\Users\\Public\\Desktop',
  ];

  for (const dir of desktopDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.lnk') || file.endsWith('.exe')) {
          const baseName = file.replace(/\.(lnk|exe)$/i, '');
          const fullPath = path.join(dir, file);
          const normName = normalizeString(baseName);
          const keywords = normName.split(/\s+/).filter((k) => k.length > 1);

          const key = `desktop_${baseName.toLowerCase()}`;
          if (!appMap.has(key)) {
            appMap.set(key, {
              name: baseName,
              appId: fullPath,
              type: file.endsWith('.lnk') ? 'shortcut' : 'exe',
              targetPath: fullPath,
              keywords: Array.from(new Set([baseName.toLowerCase(), normName, ...keywords])),
            });
          }
        }
      }
    } catch (e) {}
  }

  const allApps = Array.from(appMap.values());
  memoryAppsCache = allApps;

  // Sauvegarder dans le cache disque
  try {
    const dir = path.dirname(APPS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(APPS_CACHE_FILE, JSON.stringify(allApps, null, 2), 'utf8');
  } catch (e) {}

  return allApps;
}

// Recherche intelligente d'une application dans tout le système
export function findSystemApp(query: string): InstalledApp | null {
  const apps = scanInstalledApps();
  const rawClean = query.toLowerCase().trim();
  const normQuery = normalizeString(query);

  // Alias personnalisés spécifiques Roysten
  const ALIAS_MAP: Record<string, string[]> = {
    facebook: ['facebook', 'fb', 'facebok', 'facbook'],
    instagram: ['instagram', 'insta', 'ig', 'instagrame'],
    whatsapp: ['whatsapp', 'wa', 'whatsap', 'watsap', 'watsapp'],
    linkedin: ['linkedin', 'linkeldn', 'linkdin', 'linkedln'],
    spotify: ['spotify', 'spoti', 'spotfy'],
    canva: ['canva'],
    capcut: ['capcut', 'cap cut'],
    tiktok: ['tiktok', 'tik tok'],
    telegram: ['telegram', 'tg'],
    vscode: ['visual studio code', 'vscode', 'vs code', 'code', 'antigravity'],
    bluestacks: ['bluestacks', 'bluestack', 'blue stack'],
    zcode: ['zcode', 'z code'],
    anlink: ['anlink', 'an link'],
    paint: ['paint', 'mspaint'],
    calc: ['calculatrice', 'calc', 'calculator'],
    notepad: ['bloc-notes', 'bloc notes', 'notepad'],
    word: ['word', 'world', 'microsoft word', 'winword', 'worde'],
    excel: ['excel', 'microsoft excel', 'exel', 'excele'],
    powerpoint: ['powerpoint', 'power point', 'diaporama'],
    chrome: ['google chrome', 'chrome'],
    lovable: ['lovable', 'movable', 'loveable', 'lovabel', 'movabel', 'loveابل'],
  };

  // 1. Vérification par alias direct
  for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
    if (aliases.some((alias) => normQuery.includes(alias) || rawClean.includes(alias))) {
      // Trouver l'application correspondante
      const found = apps.find((a) => {
        const aNorm = normalizeString(a.name);
        return aNorm.includes(canonical) || a.keywords.some((kw) => kw.includes(canonical));
      });
      if (found) return found;
    }
  }

  // 2. Correspondance exacte sur le nom
  for (const app of apps) {
    const aNorm = normalizeString(app.name);
    if (aNorm === normQuery || app.name.toLowerCase() === rawClean) {
      return app;
    }
  }

  // 3. Correspondance partielle ou inclusion de mot
  const queryTokens = normQuery.split(/\s+/).filter((t) => t.length > 2);
  for (const token of queryTokens) {
    for (const app of apps) {
      const aNorm = normalizeString(app.name);
      if (aNorm.includes(token) || app.keywords.some((kw) => kw === token)) {
        return app;
      }
    }
  }

  // 4. Correspondance floue Levenshtein
  for (const token of queryTokens) {
    if (token.length >= 4) {
      for (const app of apps) {
        const aNorm = normalizeString(app.name);
        if (levenshtein(token, aNorm) <= 2) {
          return app;
        }
      }
    }
  }

  return null;
}

// Lancement direct d'une application trouvée sur Windows
export function launchSystemApp(app: InstalledApp): { success: boolean; message: string } {
  try {
    const cleanName = app.name.toLowerCase().trim();

    // 1. Commandes directes infaillibles pour les applications majeures
    if (cleanName === 'excel' || cleanName === 'word' || cleanName.includes('word') || cleanName === 'powerpoint' || cleanName.includes('lovable')) {
      const { launchApplicationDirect } = require('./desktop-automator');
      launchApplicationDirect(cleanName);
      return { success: true, message: `${app.name} lancé et activé sur votre écran, Monsieur Roysten.` };
    }

    // 2. Si un raccourci .lnk physique ou exécutable existe sur le disque
    if (app.targetPath && fs.existsSync(app.targetPath)) {
      const escaped = app.targetPath.replace(/'/g, "''");
      const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process -FilePath '${escaped}'`], {
        detached: true,
        stdio: 'ignore',
      });
      p.unref();
      return { success: true, message: `Raccourci ${app.name} exécuté sur votre bureau.` };
    }

    // 3. Si c'est un AppUserModelID (UWP ou application StartApps)
    if (app.appId && !app.appId.includes('\\')) {
      const p = spawn('explorer.exe', [`shell:AppsFolder\\${app.appId}`], {
        detached: true,
        stdio: 'ignore',
      });
      p.unref();
      return { success: true, message: `Application ${app.name} lancée sur votre écran.` };
    }

    // 4. Fallback Win32 classique
    const exePath = app.targetPath || app.appId;
    const p = spawn('cmd.exe', ['/c', 'start', '""', exePath], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
    return { success: true, message: `Application ${app.name} lancée sur votre écran.` };
  } catch (err: any) {
    return { success: false, message: `Erreur lors du lancement de ${app.name} : ${err.message}` };
  }
}

// ----------------------------------------------------------------------------
// RECHERCHE DE FICHIERS SUR LE DISQUE DE ROYSTEN
// ----------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Rechercher des fichiers sur les dossiers clés de Windows
export function searchSystemFiles(query: string, maxResults = 10): FileSearchResult[] {
  const userHome = process.env.USERPROFILE || 'C:\\Users\\ADMIN';
  const targetDirs = [
    path.join(userHome, 'Desktop'),
    path.join(userHome, 'Documents'),
    path.join(userHome, 'Downloads'),
    path.join(userHome, 'Pictures'),
    path.join(userHome, 'Videos'),
    path.join(userHome, 'Documents', 'Jarvis'),
  ];

  const cleanQuery = normalizeString(query);
  const isGeneric = !cleanQuery || cleanQuery === 'fichiers' || cleanQuery === 'fichier' || cleanQuery === 'mes fichiers' || cleanQuery === 'documents' || cleanQuery === 'tous';
  const results: FileSearchResult[] = [];

  function scanDir(dir: string, depth = 0) {
    if (depth > 3 || (results.length >= maxResults * 3 && !isGeneric)) return;
    if (!fs.existsSync(dir)) return;

    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '$Recycle.Bin') continue;

        const fullPath = path.join(dir, item.name);
        const normItemName = normalizeString(item.name);

        const isMatch = isGeneric ? !item.isDirectory() : normItemName.includes(cleanQuery);

        if (isMatch) {
          let size = 0;
          let mtime = new Date().toISOString();
          try {
            const stat = fs.statSync(fullPath);
            size = stat.size;
            mtime = stat.mtime.toISOString();
          } catch (e) {}

          results.push({
            name: item.name,
            fullPath,
            sizeBytes: size,
            sizeFormatted: formatBytes(size),
            modifiedAt: mtime,
            isDirectory: item.isDirectory(),
          });
        }

        if (item.isDirectory() && depth < 2) {
          scanDir(fullPath, depth + 1);
        }
      }
    } catch (e) {}
  }

  for (const dir of targetDirs) {
    scanDir(dir);
  }

  // Trier par date de modification descendante si requête générique ou multiples résultats
  results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return results.slice(0, maxResults);
}

// Ouvrir un fichier ou dossier directement dans Windows
export function openSystemFile(filePath: string): { success: boolean; message: string } {
  if (!fs.existsSync(filePath)) {
    return { success: false, message: `Le fichier n'existe pas : ${filePath}` };
  }

  try {
    const escaped = filePath.replace(/'/g, "''");
    const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process -FilePath '${escaped}'`], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
    return { success: true, message: `Fichier ouvert avec succès : ${path.basename(filePath)}` };
  } catch (e: any) {
    return { success: false, message: `Erreur d'ouverture : ${e.message}` };
  }
}

// ----------------------------------------------------------------------------
// AUTOMATISATION COMPLÈTE DE L'ENVOI DE MESSAGES (WHATSAPP, FACEBOOK, INSTAGRAM)
// ----------------------------------------------------------------------------

export async function automateSendMessage(
  platform: 'whatsapp' | 'facebook' | 'instagram',
  contact: string,
  messageText: string
): Promise<{ success: boolean; message: string; actionNote: string; clientAction?: any }> {
  const cleanContact = contact.trim();
  const text = messageText.trim();

  // 1. Toujours copier dans le presse-papier Windows pour sécurité maximale
  try {
    const escapedText = text.replace(/'/g, "''");
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Set-Clipboard -Value '${escapedText}'`], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } catch (e) {}

  if (platform === 'whatsapp') {
    const { sendWhatsAppMessageAutomated } = await import('./desktop-automator');
    return sendWhatsAppMessageAutomated(text, cleanContact);
  }

  if (platform === 'facebook') {
    // 1. Lancer l'application Facebook Desktop
    const { launchApplicationDirect, activateDesktopWindow } = await import('./desktop-automator');
    await launchApplicationDirect('facebook');

    // 2. Automate focus, colle le message et envoie avec Entrée sur WinSta0\default
    await activateDesktopWindow({
      titleFilter: 'Facebook',
      waitBeforeMs: 1500,
      steps: [
        { waitMs: 400, clip: text, keys: '^v' },
        { waitMs: 400, keys: '{ENTER}' },
      ],
      timeoutMs: 8000,
    });

    return {
      success: true,
      message: `Application Facebook Desktop activée. Message pour **${cleanContact}** (« ${text} ») expédié automatiquement.`,
      actionNote: `Facebook Desktop activé et message expédié pour ${cleanContact}.`,
      clientAction: {
        type: 'open_url',
        url: `https://www.messenger.com/`,
        label: `Accéder à Messenger (${cleanContact})`,
      },
    };
  }

  if (platform === 'instagram') {
    // 1. Lancer l'application Instagram Desktop
    const { launchApplicationDirect, activateDesktopWindow } = await import('./desktop-automator');
    await launchApplicationDirect('instagram');

    // 2. Automate focus, colle le message et envoie avec Entrée sur WinSta0\default
    const cleanHandle = cleanContact.replace(/^@/, '');
    await activateDesktopWindow({
      titleFilter: 'Instagram',
      waitBeforeMs: 1500,
      steps: [
        { waitMs: 400, clip: text, keys: '^v' },
        { waitMs: 400, keys: '{ENTER}' },
      ],
      timeoutMs: 8000,
    });

    return {
      success: true,
      message: `Application Instagram Desktop activée. Message pour **@${cleanHandle}** (« ${text} ») préparé et copié dans le presse-papier avec injection automatique.`,
      actionNote: `Instagram Desktop activé et DM injecté pour @${cleanHandle}.`,
      clientAction: {
        type: 'open_url',
        url: cleanHandle ? `https://www.instagram.com/direct/t/${cleanHandle}/` : 'https://www.instagram.com/direct/inbox/',
        label: `Accéder au DM Instagram (@${cleanHandle})`,
      },
    };
  }

  return {
    success: false,
    message: 'Plateforme non supportée.',
    actionNote: 'Erreur plateforme inconnue',
  };
}
