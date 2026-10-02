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

// 1. OUVRIR UNE APPLICATION SUR L'ORDINATEUR
export async function launchApp(appName: string, targetPath?: string): Promise<{ success: boolean; message: string }> {
  const name = appName.toLowerCase().trim();
  const vscodePath = `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`;

  if (name.includes('code') || name.includes('vs')) {
    if (fs.existsSync(vscodePath)) {
      return launchDetached(vscodePath, targetPath ? [targetPath] : []);
    } else {
      return launchDetached('code', targetPath ? [targetPath] : []);
    }
  } else if (name.includes('chrome')) {
    return launchDetached('chrome', targetPath ? [targetPath] : []);
  } else if (name.includes('edge')) {
    return launchDetached('msedge', targetPath ? [targetPath] : []);
  } else if (name.includes('notepad') || name.includes('bloc')) {
    return launchDetached('notepad', targetPath ? [targetPath] : []);
  } else if (name.includes('calc')) {
    return launchDetached('calc.exe');
  } else if (name.includes('explorer') || name.includes('dossier') || name.includes('fichier')) {
    const p = targetPath || path.join(os.homedir(), 'Documents');
    return launchDetached('explorer', [p]);
  } else if (name.includes('terminal') || name.includes('powershell')) {
    return launchDetached('powershell');
  } else if (name.includes('spotify')) {
    return launchDetached('spotify:');
  } else if (name.includes('whatsapp')) {
    return launchDetached('whatsapp:');
  } else {
    return launchDetached(appName, targetPath ? [targetPath] : []);
  }
}

// 2. OUVRIR UNE URL DANS LE NAVIGATEUR
export async function openUrl(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
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
