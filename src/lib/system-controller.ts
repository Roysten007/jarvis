import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Exécution d'une commande shell avec promesse
export function runCommandAsync(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({ stdout, stderr: error.message || stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// 1. OUVRIR UNE APPLICATION SUR L'ORDINATEUR
export async function launchApp(appName: string, targetPath?: string): Promise<{ success: boolean; message: string }> {
  const name = appName.toLowerCase().trim();
  let command = '';

  const target = targetPath ? `"${targetPath}"` : '';

  if (name.includes('code') || name.includes('vs')) {
    command = target ? `start "" code ${target}` : `start "" code`;
  } else if (name.includes('chrome')) {
    command = target ? `start chrome ${target}` : `start chrome`;
  } else if (name.includes('edge')) {
    command = target ? `start msedge ${target}` : `start msedge`;
  } else if (name.includes('bloc') || name.includes('note') || name.includes('pad')) {
    command = target ? `start notepad ${target}` : `start notepad`;
  } else if (name.includes('calc')) {
    command = `start calc`;
  } else if (name.includes('explorer') || name.includes('dossier') || name.includes('fichier')) {
    const p = targetPath || path.join(os.homedir(), 'Documents');
    command = `start explorer "${p}"`;
  } else if (name.includes('terminal') || name.includes('powershell')) {
    command = `start powershell`;
  } else if (name.includes('spotify')) {
    command = `start spotify:`;
  } else if (name.includes('whatsapp')) {
    command = `start whatsapp:`;
  } else {
    // Tentative d'ouverture générique Windows
    command = `start "" "${appName}"`;
  }

  try {
    await runCommandAsync(command);
    return {
      success: true,
      message: `Application "${appName}" lancée avec succès sur votre ordinateur.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Impossible de lancer l'application : ${err.message}`,
    };
  }
}

// 2. OUVRIR UNE URL DANS LE NAVIGATEUR
export async function openUrl(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    await runCommandAsync(`start "" "${validUrl}"`);
    return { success: true, message: `URL "${validUrl}" ouverte sur l'ordinateur.` };
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
