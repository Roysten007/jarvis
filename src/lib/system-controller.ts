import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Exécution d'une application ou URL en processus Windows détaché
export function launchDetached(target: string, args: string[] = []): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    try {
      const fullArgs = ['/c', 'start', '', target, ...args];
      const p = spawn('cmd.exe', fullArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      p.unref();
      resolve({ success: true, message: `Lancé avec succès : ${target}` });
    } catch (err: any) {
      resolve({ success: false, message: `Erreur de lancement : ${err.message}` });
    }
  });
}

// Chemins d'exécutables vérifiés sur Windows
const KNOWN_PATHS = {
  chrome: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
    `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
  ],
  vscode: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`,
    `C:\\Program Files\\Microsoft VS Code\\Code.exe`,
  ],
  edge: [
    `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`,
    `C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
  spotify: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Microsoft\\WindowsApps\\Spotify.exe`,
    `C:\\Users\\ADMIN\\AppData\\Roaming\\Spotify\\Spotify.exe`,
  ],
  canva: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Canva\\Canva.exe`,
  ],
  claude: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Microsoft\\WindowsApps\\claude-desktop.exe`,
  ],
};

function findExistingExe(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 1. OUVRIR UNE APPLICATION SUR L'ORDINATEUR
export async function launchApp(appName: string, targetPath?: string): Promise<{ success: boolean; message: string }> {
  const name = appName.toLowerCase().trim();

  // Visual Studio Code
  if (name.includes('code') || name.includes('vs')) {
    const p = findExistingExe(KNOWN_PATHS.vscode);
    return p ? launchDetached(p, targetPath ? [targetPath] : []) : launchDetached('code', targetPath ? [targetPath] : []);
  }

  // Google Chrome
  if (name.includes('chrome')) {
    const p = findExistingExe(KNOWN_PATHS.chrome);
    if (p) return launchDetached(p, targetPath ? [targetPath] : []);
    const edge = findExistingExe(KNOWN_PATHS.edge);
    if (edge) return launchDetached(edge, targetPath ? [targetPath] : []);
    return launchDetached('start', ['chrome']);
  }

  // Microsoft Edge / Navigateur
  if (name.includes('edge') || name.includes('navigateur') || name.includes('internet')) {
    const p = findExistingExe(KNOWN_PATHS.edge) || findExistingExe(KNOWN_PATHS.chrome);
    return p ? launchDetached(p, targetPath ? [targetPath] : []) : launchDetached('msedge', targetPath ? [targetPath] : []);
  }

  // WhatsApp Desktop (via package Windows Store ou Web)
  if (name.includes('whatsapp')) {
    try {
      const p = spawn('powershell.exe', [
        '-Command',
        `Start-Process 'explorer.exe' 'shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App'`,
      ], { detached: true, stdio: 'ignore' });
      p.unref();
      return { success: true, message: 'WhatsApp Desktop lancé sur votre écran.' };
    } catch {
      return openUrl('https://web.whatsapp.com');
    }
  }

  // Spotify
  if (name.includes('spotify') || name.includes('musique')) {
    const p = findExistingExe(KNOWN_PATHS.spotify);
    if (p) {
      const sp = spawn(p, [], { detached: true, stdio: 'ignore' });
      sp.unref();
      return { success: true, message: 'Spotify lancé.' };
    }
    return openUrl('https://open.spotify.com');
  }

  // Canva
  if (name.includes('canva')) {
    const p = findExistingExe(KNOWN_PATHS.canva);
    if (p) return launchDetached(p);
    return openUrl('https://canva.com');
  }

  // Bloc-notes
  if (name.includes('notepad') || name.includes('bloc')) {
    return launchDetached('notepad', targetPath ? [targetPath] : []);
  }

  // Calculatrice
  if (name.includes('calc')) {
    return launchDetached('calc.exe');
  }

  // Explorateur de fichiers
  if (name.includes('explorer') || name.includes('dossier') || name.includes('fichier') || name.includes('document')) {
    const p = targetPath || path.join(os.homedir(), 'Documents');
    return launchDetached('explorer', [p]);
  }

  // Terminal
  if (name.includes('terminal') || name.includes('powershell') || name.includes('cmd')) {
    return launchDetached('powershell');
  }

  // Paint
  if (name.includes('paint') || name.includes('dessin')) {
    return launchDetached('mspaint.exe');
  }

  // Défaut
  return launchDetached(appName, targetPath ? [targetPath] : []);
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
      return launchDetached(chrome, [validUrl]);
    }
    const edge = findExistingExe(KNOWN_PATHS.edge);
    if (edge) {
      return launchDetached(edge, [validUrl]);
    }
    return launchDetached(validUrl);
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
