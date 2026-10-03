import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Exécution directe d'un processus Windows sans intermédiaire cmd.exe
// Exécution d'un processus Windows avec forçage de focus au premier plan de l'écran
// Exécution d'un script en session interactive Windows utilisateur via schtasks /IT
export function runInteractiveHelper(psScriptContent: string): void {
  try {
    const tmpDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpScript = path.join(tmpDir, 'interactive_action.ps1');
    fs.writeFileSync(tmpScript, psScriptContent, 'utf8');

    const cmd = `schtasks /Create /TN 'JarvisInteractiveRunner' /TR 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${tmpScript}"' /SC ONCE /ST 00:00 /F /IT; schtasks /Run /TN 'JarvisInteractiveRunner'`;
    const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
  } catch (e) {
    console.warn('[INTERACTIVE RUNNER ERROR]', e);
  }
}

// Exécution d'un processus Windows avec forçage de focus au premier plan de l'écran
export function launchForeground(
  target: string,
  args: string[] = [],
  windowTitleHints: string[] = []
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    try {
      const isProtocolOrUrl = /^(https?|spotify|whatsapp|vscode):/i.test(target);
      const isLnk = target.toLowerCase().endsWith('.lnk');
      const isShell = target.toLowerCase().startsWith('shell:');

      let psCommand = '';
      const escapedTarget = target.replace(/'/g, "''");

      if (isProtocolOrUrl || isShell) {
        psCommand = `Start-Process explorer.exe -ArgumentList '${escapedTarget}'`;
      } else if (isLnk) {
        if (args.length > 0) {
          const psArgs = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
          psCommand = `Start-Process -FilePath '${escapedTarget}' -ArgumentList @(${psArgs})`;
        } else {
          psCommand = `Start-Process explorer.exe -ArgumentList '${escapedTarget}'`;
        }
      } else if (args.length > 0) {
        const psArgs = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
        psCommand = `Start-Process -FilePath '${escapedTarget}' -ArgumentList @(${psArgs}) -WindowStyle Normal`;
      } else {
        psCommand = `Start-Process -FilePath '${escapedTarget}' -WindowStyle Normal`;
      }

      const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
        detached: true,
        stdio: 'ignore',
      });
      p.unref();

      // Forcer l'activation de la fenêtre au premier plan sur le bureau interactif de Roysten
      if (windowTitleHints.length > 0) {
        const activateCode = windowTitleHints
          .map((h) => `$ws.AppActivate('${h.replace(/'/g, "''")}');`)
          .join('\n');
        runInteractiveHelper(`
Start-Sleep -Milliseconds 700
$ws = New-Object -ComObject WScript.Shell
${activateCode}
`);
      }

      resolve({ success: true, message: `Lancé et activé au premier plan : ${path.basename(target)}` });
    } catch (err: any) {
      resolve({ success: false, message: `Erreur : ${err.message}` });
    }
  });
}

// Copier du texte dans le presse-papier Windows
export function copyToClipboard(text: string): boolean {
  try {
    const escaped = text.replace(/'/g, "''");
    const p = spawn('powershell.exe', ['-NoProfile', '-Command', `Set-Clipboard -Value '${escaped}'`], {
      detached: true,
      stdio: 'ignore',
    });
    p.unref();
    return true;
  } catch (e) {
    return false;
  }
}

// Action WhatsApp : Rédiger et expédier un message réellement sur WhatsApp Desktop
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
    // 1. Lancement de la conversation WhatsApp ciblée
    await launchForeground(`whatsapp://send?phone=${phone}&text=${encoded}`, [], ['WhatsApp']);

    // 2. Frappe automatique de la touche Entrée sur WhatsApp dans la session interactive après 2.3s
    runInteractiveHelper(`
Start-Sleep -Milliseconds 2300
$ws = New-Object -ComObject WScript.Shell
$act = $ws.AppActivate('WhatsApp')
if ($act) {
    Start-Sleep -Milliseconds 400
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WaSenderKey {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    public static void PressEnter() {
        keybd_event(0x0D, 0, 0, 0);
        System.Threading.Thread.Sleep(50);
        keybd_event(0x0D, 0, 2, 0);
    }
}
"@
    [WaSenderKey]::PressEnter()
}
`);

    return {
      success: true,
      phone,
      contactName: contactName || phone,
      message: `Message envoyé à ${contactName || phone} sur WhatsApp.`,
    };
  }

  // Si aucun numéro trouvé, lancer WhatsApp Desktop
  await launchForeground('shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App', [], ['WhatsApp']);
  return {
    success: false,
    contactName,
    message: `WhatsApp Desktop ouvert, numéro non renseigné pour ${contactName}.`,
  };
}

// Action Spotify : Lancer l'application native Spotify au premier plan
export async function playSpotify(query?: string): Promise<{ success: boolean; message: string }> {
  if (query && query.trim()) {
    const enc = encodeURIComponent(query.trim());
    return launchForeground(`spotify:search:${enc}`, [], ['Spotify']);
  }
  return launchForeground('shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', [], ['Spotify']);
}

// Action VS Code : Ouvrir un projet ou fichier au premier plan
export async function openVSCode(targetPath?: string): Promise<{ success: boolean; message: string }> {
  const proj = targetPath || 'c:\\Users\\ADMIN\\Documents\\Jarvis';
  const codeExe = `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`;
  if (fs.existsSync(codeExe)) {
    return launchForeground(codeExe, [proj], ['Visual Studio Code', 'Code']);
  }
  if (fs.existsSync(`C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk`)) {
    return launchForeground(`C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk`, [proj], ['Antigravity', 'Code']);
  }
  return launchForeground(`vscode://file/${proj.replace(/\\/g, '/')}`, [], ['Visual Studio Code', 'Code']);
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
  firefox: [
    `C:\\Users\\ADMIN\\Desktop\\Firefox.exe`,
    `C:\\Program Files\\Mozilla Firefox\\firefox.exe`,
  ],
  edge: [
    `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
  vscode: [
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`,
    `C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk`,
    `C:\\Users\\ADMIN\\Desktop\\ZCode.lnk`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\ZCode\\ZCode.exe`,
  ],
  spotify: [
    `shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify`,
    `spotify:`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Microsoft\\WindowsApps\\Spotify.exe`,
  ],
  whatsapp: [
    `shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App`,
    `whatsapp:`,
  ],
  instagram: [
    `shell:AppsFolder\\Facebook.InstagramBeta_8xx8rvfyw5nnt!App`,
    `C:\\Users\\ADMIN\\Desktop\\Instagram.lnk`,
  ],
  canva: [
    `shell:AppsFolder\\com.canva.CanvaDesktop`,
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
    if (p.startsWith('shell:') || p.endsWith(':')) return p;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 1. OUVRIR UNE APPLICATION SUR L'ORDINATEUR AVEC FOCUS ÉCRAN
export async function launchApp(appName: string, targetPath?: string): Promise<{ success: boolean; message: string }> {
  const name = appName.toLowerCase().trim();

  // Visual Studio Code / Antigravity / ZCode
  if (name.includes('code') || name.includes('vs') || name.includes('zcode') || name.includes('antigravity')) {
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
    return launchForeground('whatsapp:', [], ['WhatsApp']);
  }

  // Spotify
  if (name.includes('spotify') || name.includes('musique')) {
    return playSpotify();
  }

  // Instagram
  if (name.includes('instagram') || name.includes('insta')) {
    const p = findExistingExe(KNOWN_PATHS.instagram);
    if (p) return launchForeground(p, [], ['Instagram']);
    return openUrl('https://www.instagram.com');
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

  if (name.includes('code') || name.includes('vs') || name.includes('zcode')) procName = 'Code*';
  else if (name.includes('chrome')) procName = 'chrome.exe';
  else if (name.includes('edge')) procName = 'msedge.exe';
  else if (name.includes('notepad') || name.includes('bloc')) procName = 'notepad.exe';
  else if (name.includes('calc')) procName = 'CalculatorApp.exe';
  else if (name.includes('spotify')) procName = 'Spotify*';
  else if (name.includes('whatsapp')) procName = 'WhatsApp*';
  else if (name.includes('instagram')) procName = 'msedge_proxy*';
  else if (name.includes('canva')) procName = 'Canva*';
  else if (name.includes('capcut')) procName = 'CapCut*';
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

// 5. INTERPRÉTEUR UNIFIÉ ET EXÉCUTEUR DES ORDRES SYSTÈME SUR WINDOWS
export interface SystemCommandResult {
  executed: boolean;
  actionNote?: string;
  directReply?: string;
  isPureCommand?: boolean;
  clientAction?: {
    type: 'open_url';
    url: string;
    label?: string;
  };
}

export async function executeSystemCommand(rawMessage: string): Promise<SystemCommandResult> {
  const message = rawMessage.trim();
  const lower = message.toLowerCase().trim();

  const openVerbs = [
    'ouvre', 'ouvrir', 'lance', 'lancer', 'allume', 'allumer',
    'demarre', 'démarre', 'demarrer', 'démarrer', 'start',
    'active', 'activer', 'mets', 'mettre', 'joue', 'jouer',
    'affiche', 'afficher', 'exécute', 'run', 'open', 'go', 'play'
  ];

  const closeVerbs = [
    'ferme', 'fermer', 'quitte', 'quitter', 'arrête', 'arrete',
    'arrêter', 'arreter', 'éteins', 'eteins', 'éteindre', 'eteindre',
    'stop', 'kill', 'close', 'exit'
  ];

  const hasOpenVerb = openVerbs.some((v) => lower.includes(v));
  const hasCloseVerb = closeVerbs.some((v) => lower.includes(v));

  // 0. Enregistrer ou mettre à jour un contact WhatsApp
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
        directReply: `C'est enregistré, Roysten. Le contact ${name} (+${cleanPhone}) est maintenant dans ton répertoire JARVIS.`,
        isPureCommand: true,
      };
    }
  }

  // 1. WhatsApp Action (Rédiger / Envoyer message)
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
        directReply: `C'est envoyé, Roysten. Le message « ${msgToSend} » a été transmis à ${recipient} (+${result.phone}) sur WhatsApp.`,
        isPureCommand: true,
      };
    } else {
      return {
        executed: true,
        actionNote: `WhatsApp ouvert sur le bureau. Numéro non configuré pour ${targetContact}.`,
        directReply: `WhatsApp est ouvert sur ton écran. Je n'ai pas encore le numéro de "${targetContact}" en mémoire. Dis-moi par exemple : « enregistre le numéro de ${targetContact} : +229... » pour que je puisse lui envoyer automatiquement à chaque fois !`,
        isPureCommand: true,
      };
    }
  }

  // 2. WhatsApp Simple (Ouvrir / Fermer)
  if (lower.includes('whatsapp')) {
    if (hasCloseVerb) {
      await closeApp('whatsapp');
      return {
        executed: true,
        actionNote: 'WhatsApp a été fermé.',
        directReply: 'WhatsApp a été fermé.',
        isPureCommand: true,
      };
    }
    if (hasOpenVerb || lower === 'whatsapp' || lower === 'ouvre whatsapp' || lower === 'allume whatsapp') {
      await launchApp('whatsapp');
      return {
        executed: true,
        actionNote: 'WhatsApp Desktop a été ouvert.',
        directReply: 'WhatsApp est lancé sur ton écran, Roysten.',
        isPureCommand: true,
      };
    }
  }

  // 3. Visual Studio Code / ZCode / Projet
  if (
    lower.includes('vs code') ||
    lower.includes('vscode') ||
    lower.includes('zcode') ||
    lower.includes('mon code') ||
    lower === 'code' ||
    ((hasOpenVerb || hasCloseVerb) && (lower.includes('code') || lower.includes('projet')))
  ) {
    if (hasCloseVerb) {
      await closeApp('vscode');
      return {
        executed: true,
        actionNote: 'Visual Studio Code a été fermé.',
        directReply: 'Visual Studio Code a été fermé.',
        isPureCommand: true,
      };
    }
    await openVSCode();
    return {
      executed: true,
      actionNote: 'Visual Studio Code a été lancé au premier plan sur votre écran avec le projet Jarvis.',
      directReply: 'Visual Studio Code est ouvert au premier plan avec ton projet Jarvis.',
      isPureCommand: true,
    };
  }

  // 4. Spotify & Musique
  if (
    lower.includes('spotify') ||
    (hasOpenVerb && (lower.includes('musique') || lower.includes('chanson') || lower.includes('morceau') || lower.includes('lofi') || lower.includes('afrobeat') || lower.includes('son')))
  ) {
    if (hasCloseVerb) {
      await closeApp('spotify');
      return {
        executed: true,
        actionNote: 'Spotify a été arrêté.',
        directReply: 'Spotify a été arrêté.',
        isPureCommand: true,
      };
    }
    let query = '';
    const match = message.match(/(?:mets|joue|lance|cherche)\s+(?:de\s+la\s+musique|du|de|des)?\s*(.*?)(?:\s+sur\s+spotify|$)/i);
    if (match && match[1]) {
      const candidate = match[1].toLowerCase().trim();
      if (candidate !== 'spotify' && !candidate.includes('musique') && candidate.length > 1) {
        query = match[1].trim();
      }
    }
    await playSpotify(query);
    return {
      executed: true,
      actionNote: query
        ? `L'application native Spotify a été activée avec recherche « ${query} ».`
        : `L'application native Spotify a été lancée sur votre écran Windows.`,
      directReply: query
        ? `Spotify est lancé avec la recherche « ${query} ».`
        : `Spotify est lancé sur ton bureau, Roysten.`,
      isPureCommand: true,
    };
  }

  // 5. Canva (Application native Windows)
  if (lower.includes('canva')) {
    if (hasCloseVerb) {
      await closeApp('canva');
      return { executed: true, actionNote: 'Canva a été fermé.', directReply: 'Canva a été fermé.', isPureCommand: true };
    }
    await launchApp('canva');
    return {
      executed: true,
      actionNote: 'Canva Desktop a été ouvert.',
      directReply: 'Canva est lancé sur ton écran, Roysten.',
      isPureCommand: true,
    };
  }

  // 6. CapCut (Application bureau)
  if (lower.includes('capcut') || lower.includes('cap cut')) {
    if (hasCloseVerb) {
      await closeApp('capcut');
      return { executed: true, actionNote: 'CapCut a été fermé.', directReply: 'CapCut a été fermé.', isPureCommand: true };
    }
    await launchApp('capcut');
    return {
      executed: true,
      actionNote: 'CapCut a été ouvert au premier plan.',
      directReply: 'CapCut est lancé au premier plan pour tes montages, Roysten.',
      isPureCommand: true,
    };
  }

  // 7. Instagram (Application native Windows)
  if (lower.includes('instagram') || lower === 'insta' || lower === 'ouvre insta' || lower === 'lance insta') {
    if (hasCloseVerb) {
      await closeApp('instagram');
      return { executed: true, actionNote: 'Instagram a été fermé.', directReply: 'Instagram a été fermé.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('légende') || lower.includes('legende') || lower.includes('caption') ||
      lower.includes('photo') || lower.includes('publie') || lower.includes('reel')
    ) {
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:instagram|post|légende|legende|caption|photo)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Création digitale et lifestyle développeur';
      const result = await generateSocialContent('instagram', 'post', topic);
      await launchApp('instagram');
      return {
        executed: true,
        actionNote: `Légende Instagram rédigée et copiée dans le presse-papier Windows.`,
        directReply: `Voici ta légende Instagram :\n\n${result.content}\n\n📋 **Copié dans ton presse-papier Windows.** L'application Instagram est ouverte, fais simplement **Ctrl + V** pour coller !`,
        isPureCommand: true,
      };
    }
    await launchApp('instagram');
    return {
      executed: true,
      actionNote: 'Instagram a été lancé sur votre ordinateur.',
      directReply: `L'application Instagram est ouverte sur ton écran, Roysten.`,
      isPureCommand: true,
    };
  }

  // 8. Facebook (Post, Commentaire ou Ouverture)
  if (lower.includes('facebook') || lower === 'fb' || lower === 'ouvre fb') {
    if (hasCloseVerb) {
      await closeApp('facebook');
      return { executed: true, actionNote: 'Facebook a été fermé.', directReply: 'Facebook a été fermé.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('poste') || lower.includes('publie') || lower.includes('statut') ||
      lower.includes('écris') || lower.includes('ecris') || lower.includes('commente') || lower.includes('commentaire')
    ) {
      const isComment = lower.includes('commente') || lower.includes('commentaire');
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:facebook|post|poste|publie|commente|statut)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Tech et Intelligence Artificielle au Bénin';
      const result = await generateSocialContent('facebook', isComment ? 'comment' : 'post', topic);
      await openUrl('https://www.facebook.com');
      return {
        executed: true,
        actionNote: `Publication Facebook rédigée et copiée dans le presse-papier Windows.`,
        directReply: `Voici ta publication Facebook :\n\n${result.content}\n\n📋 **Copié dans ton presse-papier Windows.** Facebook est ouvert dans ton navigateur, fais **Ctrl + V** pour publier !`,
        isPureCommand: true,
      };
    }
    await openUrl('https://www.facebook.com');
    return {
      executed: true,
      actionNote: 'Facebook a été ouvert dans votre navigateur.',
      directReply: `Facebook est ouvert, Roysten.`,
      isPureCommand: true,
    };
  }

  // 9. Twitter / X (Tweet, Réponse ou Ouverture)
  if (
    lower.includes('twitter') || lower.includes('tweet') ||
    lower === 'x' || lower === 'ouvre x' || lower === 'lance x' || lower.includes('sur x') || lower.includes('sur twitter')
  ) {
    if (hasCloseVerb) {
      await closeApp('twitter');
      return { executed: true, actionNote: 'Twitter a été fermé.', directReply: 'Twitter a été fermé.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('tweet') || lower.includes('écris') || lower.includes('ecris') ||
      lower.includes('publie') || lower.includes('commente') || lower.includes('réponds') || lower.includes('reponds')
    ) {
      const isComment = lower.includes('commente') || lower.includes('réponse') || lower.includes('réponds');
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:twitter|tweet|sur x|sur twitter|post|poste|publie|commente)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Vibe coding et intelligence artificielle';
      const result = await generateSocialContent('twitter', isComment ? 'comment' : 'post', topic);
      await openUrl(result.actionUrl);
      return {
        executed: true,
        actionNote: `Tweet rédigé et interface de publication X (Twitter) ouverte avec le texte prérempli.`,
        directReply: `Voici ton tweet prêt à être envoyé :\n\n« ${result.content} »\n\n🚀 La fenêtre X (Twitter) est ouverte avec ton tweet déjà prérempli.`,
        isPureCommand: true,
      };
    }
    await openUrl('https://x.com');
    return {
      executed: true,
      actionNote: 'X (Twitter) a été ouvert.',
      directReply: `X (Twitter) est ouvert, Roysten.`,
      isPureCommand: true,
    };
  }

  // 10. LinkedIn (Post, Commentaire ou Ouverture)
  if (lower.includes('linkedin')) {
    if (hasCloseVerb) {
      await closeApp('linkedin');
      return { executed: true, actionNote: 'LinkedIn a été fermé.', directReply: 'LinkedIn a été fermé.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('poste') || lower.includes('écris') || lower.includes('ecris') ||
      lower.includes('publie') || lower.includes('commente') || lower.includes('article')
    ) {
      const isComment = lower.includes('commente') || lower.includes('commentaire');
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:linkedin|post|poste|publie|commente)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Retour d\'expérience tech, études et vibe coding';
      const result = await generateSocialContent('linkedin', isComment ? 'comment' : 'post', topic);
      await openUrl('https://www.linkedin.com/feed/');
      return {
        executed: true,
        actionNote: `Publication LinkedIn rédigée et copiée dans le presse-papier Windows.`,
        directReply: `Voici ton post LinkedIn :\n\n${result.content}\n\n📋 **Copié dans ton presse-papier Windows.** LinkedIn est ouvert, fais **Ctrl + V** pour publier !`,
        isPureCommand: true,
      };
    }
    await openUrl('https://www.linkedin.com');
    return {
      executed: true,
      actionNote: 'LinkedIn a été ouvert.',
      directReply: `LinkedIn est ouvert, Roysten.`,
      isPureCommand: true,
    };
  }

  // 11. Navigation Web Directe (navigue sur..., va sur..., ouvre le site...)
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
      directReply: `Navigation en cours vers ${targetUrl}, Roysten.`,
      isPureCommand: true,
    };
  }

  // 12. Suite Office (Word, Excel, PowerPoint)
  if (lower.includes('word') || lower.includes('winword') || lower.includes('traitement de texte')) {
    if (hasCloseVerb) {
      await closeApp('word');
      return { executed: true, actionNote: 'Word a été fermé.', directReply: 'Microsoft Word a été fermé.', isPureCommand: true };
    }
    await launchApp('word');
    return {
      executed: true,
      actionNote: 'Microsoft Word a été ouvert au premier plan sur votre écran.',
      directReply: 'Microsoft Word est ouvert sur ton écran, Roysten.',
      isPureCommand: true,
    };
  }

  if (lower.includes('excel') || lower.includes('tableur')) {
    if (hasCloseVerb) {
      await closeApp('excel');
      return { executed: true, actionNote: 'Excel a été fermé.', directReply: 'Microsoft Excel a été fermé.', isPureCommand: true };
    }
    await launchApp('excel');
    return {
      executed: true,
      actionNote: 'Microsoft Excel a été ouvert au premier plan sur votre écran.',
      directReply: 'Microsoft Excel est ouvert sur ton écran, Roysten.',
      isPureCommand: true,
    };
  }

  if (lower.includes('powerpoint') || lower.includes('power point') || lower.includes('diaporama') || lower.includes('slide')) {
    if (hasCloseVerb) {
      await closeApp('powerpoint');
      return { executed: true, actionNote: 'PowerPoint a été fermé.', directReply: 'PowerPoint a été fermé.', isPureCommand: true };
    }
    await launchApp('powerpoint');
    return {
      executed: true,
      actionNote: 'Microsoft PowerPoint a été ouvert au premier plan sur votre écran.',
      directReply: 'Microsoft PowerPoint est ouvert sur ton écran, Roysten.',
      isPureCommand: true,
    };
  }

  // 13. YouTube & Google Search
  if (lower.includes('youtube')) {
    const match = message.match(/cherche\s+(.*?)\s+sur\s+youtube/i) || message.match(/sur\s+youtube\s+(.*)/i);
    const query = match ? match[1].trim() : '';
    if (query) {
      await searchYouTube(query);
      return {
        executed: true,
        actionNote: `YouTube a été ouvert avec la recherche : "${query}".`,
        directReply: `YouTube est ouvert avec ta recherche « ${query} », Roysten.`,
        isPureCommand: true,
      };
    }
    if (hasOpenVerb || lower === 'youtube') {
      await openUrl('https://youtube.com');
      return {
        executed: true,
        actionNote: 'YouTube a été ouvert dans le navigateur.',
        directReply: 'YouTube est ouvert, Roysten.',
        isPureCommand: true,
      };
    }
  }

  if (lower.includes('google') && (lower.includes('cherche') || lower.includes('trouve'))) {
    const match = message.match(/cherche\s+(.*?)\s+sur\s+google/i);
    const query = match ? match[1].trim() : '';
    if (query) {
      await searchGoogle(query);
      return {
        executed: true,
        actionNote: `Google a été ouvert avec la recherche : "${query}".`,
        directReply: `Google est ouvert avec ta recherche « ${query} », Roysten.`,
        isPureCommand: true,
      };
    }
  }

  // 14. Chrome / Navigateur
  if (lower.includes('chrome') || (hasOpenVerb && (lower.includes('navigateur') || lower.includes('internet')))) {
    if (hasCloseVerb) {
      await closeApp('chrome');
      return { executed: true, actionNote: 'Google Chrome a été fermé.', directReply: 'Google Chrome a été fermé.', isPureCommand: true };
    }
    await launchApp('chrome');
    return {
      executed: true,
      actionNote: 'Google Chrome a été lancé au premier plan.',
      directReply: 'Google Chrome est ouvert, Roysten.',
      isPureCommand: true,
    };
  }

  // 15. Explorateur de fichiers
  if (lower.includes('explorateur') || lower.includes('mes documents') || lower.includes('dossier')) {
    await launchApp('explorer');
    return {
      executed: true,
      actionNote: "L'explorateur de fichiers a été ouvert.",
      directReply: "L'explorateur de fichiers est ouvert, Roysten.",
      isPureCommand: true,
    };
  }

  // 16. Terminal
  if (lower.includes('terminal') || lower.includes('powershell') || lower.includes('console')) {
    await launchApp('terminal');
    return {
      executed: true,
      actionNote: 'Le terminal PowerShell a été ouvert sur votre écran.',
      directReply: 'Le terminal PowerShell est ouvert sur ton écran, Roysten.',
      isPureCommand: true,
    };
  }

  return { executed: false };
}

