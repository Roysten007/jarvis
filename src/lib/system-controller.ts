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

      if (windowTitleHints.length > 0) {
        const activateCode = windowTitleHints
          .map((h) => `$ws.AppActivate('${h.replace(/'/g, "''")}');`)
          .join(' ');
        psCommand += `; Start-Sleep -Milliseconds 600; $ws = New-Object -ComObject WScript.Shell; ${activateCode}`;
      }

      const p = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
        detached: true,
        stdio: 'ignore',
      });
      p.unref();

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

// Action WhatsApp : Rédiger ou envoyer un message directement
export async function sendWhatsAppMessage(
  messageText: string,
  contactOrPhone?: string
): Promise<{ success: boolean; message: string }> {
  const text = messageText.trim();
  const encoded = encodeURIComponent(text);

  // Copier le texte dans le presse-papier Windows
  copyToClipboard(text);

  // Si un numéro est détecté (+229..., 00229...)
  const cleanPhone = contactOrPhone?.replace(/[^0-9]/g, '');
  if (cleanPhone && cleanPhone.length >= 8) {
    return launchForeground(`whatsapp://send?phone=${cleanPhone}&text=${encoded}`, [], ['WhatsApp']);
  }

  // Ouvrir WhatsApp Desktop natif avec le message prêt
  return launchForeground(`whatsapp://send?text=${encoded}`, [], ['WhatsApp']);
}

// Action Spotify : Lancer l'application native Spotify au premier plan
export async function playSpotify(query?: string): Promise<{ success: boolean; message: string }> {
  if (query && query.trim()) {
    const enc = encodeURIComponent(query.trim());
    return launchForeground(`spotify:search:${enc}`, [], ['Spotify']);
  }
  // Lancement direct de l'application native Spotify Windows
  const res = await launchForeground('spotify:', [], ['Spotify']);
  if (!res.success) {
    return launchForeground('shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', [], ['Spotify']);
  }
  return res;
}

// Action VS Code / Antigravity / ZCode : Ouvrir un projet ou fichier au premier plan
export async function openVSCode(targetPath?: string): Promise<{ success: boolean; message: string }> {
  const proj = targetPath || 'c:\\Users\\ADMIN\\Documents\\Jarvis';
  if (fs.existsSync(`C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk`)) {
    launchForeground(`C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk`, [proj], ['Antigravity', 'Visual Studio Code', 'Code']);
  }
  if (fs.existsSync(`C:\\Users\\ADMIN\\Desktop\\ZCode.lnk`)) {
    launchForeground(`C:\\Users\\ADMIN\\Desktop\\ZCode.lnk`, [proj], ['ZCode', 'Visual Studio Code', 'Code']);
  }
  const p = findExistingExe(KNOWN_PATHS.vscode);
  if (p) {
    launchForeground(p, [proj], ['Visual Studio Code', 'Code', 'Antigravity', 'ZCode']);
  }
  launchForeground(`vscode://file/${proj.replace(/\\/g, '/')}`, [], ['Visual Studio Code', 'Code']);
  return { success: true, message: 'VS Code / Antigravity activé avec le projet.' };
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
  ],
  vscode: [
    `C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk`,
    `C:\\Users\\ADMIN\\Desktop\\ZCode.lnk`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Programs\\ZCode\\ZCode.exe`,
  ],
  spotify: [
    `spotify:`,
    `shell:AppsFolder\\SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify`,
    `C:\\Users\\ADMIN\\AppData\\Local\\Microsoft\\WindowsApps\\Spotify.exe`,
  ],
  whatsapp: [
    `whatsapp:`,
    `shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App`,
  ],
  instagram: [
    `C:\\Users\\ADMIN\\Desktop\\Instagram.lnk`,
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
    const contactName = cleanPhone || rawContact;

    let msgToSend = '';
    if (message.includes(':')) {
      msgToSend = message.split(':')[1]?.trim() || '';
    } else if (lower.includes('disant que')) {
      msgToSend = message.split(/disant que/i)[1]?.trim() || '';
    } else if (lower.includes('pour lui dire')) {
      msgToSend = message.split(/pour lui dire(?:\s+que)?/i)[1]?.trim() || '';
    } else {
      msgToSend = rawContact ? `Salut ${rawContact} ! Message rédigé depuis JARVIS.` : 'Bonjour ! Message envoyé depuis JARVIS Assistant.';
    }

    if (!msgToSend || msgToSend.length < 2) {
      msgToSend = rawContact ? `Salut ${rawContact} !` : 'Bonjour !';
    }

    const hasPhone = cleanPhone && cleanPhone.length >= 8;
    const waProtocolUrl = hasPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msgToSend)}`
      : `whatsapp://send?text=${encodeURIComponent(msgToSend)}`;

    await sendWhatsAppMessage(msgToSend, hasPhone ? cleanPhone : contactName);
    const target = hasPhone ? cleanPhone : (rawContact || 'votre contact');

    const replyMsg = hasPhone
      ? `C'est fait, Monsieur Roysten. WhatsApp est ouvert directement sur la conversation avec ${cleanPhone} avec votre message :\n\n« ${msgToSend} »\n\n📋 *Copié dans le presse-papier Windows. Appuyez sur Entrée dans WhatsApp pour envoyer.*`
      : `C'est fait, Monsieur Roysten. WhatsApp Desktop est ouvert avec votre message pour ${target} :\n\n« ${msgToSend} »\n\n📋 *Copié dans le presse-papier Windows.*\n💡 *Pour ouvrir directement la discussion d'un contact précis, précisez son numéro (ex : « envoie un message au +229XXXXXXXX : salut »).*`;

    return {
      executed: true,
      actionNote: `Message préparé dans WhatsApp Desktop pour ${target}.`,
      directReply: replyMsg,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: waProtocolUrl,
        label: 'Ouvrir WhatsApp',
      },
    };
  }

  // 2. WhatsApp Simple (Ouvrir / Fermer)
  if (lower.includes('whatsapp')) {
    if (hasCloseVerb) {
      await closeApp('whatsapp');
      return {
        executed: true,
        actionNote: 'WhatsApp a été fermé.',
        directReply: 'WhatsApp a été fermé, Monsieur.',
        isPureCommand: true,
      };
    }
    if (hasOpenVerb || lower === 'whatsapp' || lower === 'ouvre whatsapp' || lower === 'allume whatsapp') {
      await launchApp('whatsapp');
      const waProto = 'whatsapp://';
      return {
        executed: true,
        actionNote: 'WhatsApp Desktop a été ouvert directement au premier plan sur votre écran.',
        directReply: `WhatsApp Desktop est ouvert directement sur votre bureau Windows, Monsieur.\n\n👉 [💬 Activer WhatsApp](${waProto})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: waProto,
          label: 'Ouvrir WhatsApp',
        },
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
        directReply: 'Visual Studio Code a été fermé, Monsieur.',
        isPureCommand: true,
      };
    }
    await openVSCode();
    const vsCodeProto = 'vscode://file/c:/Users/ADMIN/Documents/Jarvis';
    return {
      executed: true,
      actionNote: 'Visual Studio Code a été lancé au premier plan sur votre écran avec le projet Jarvis.',
      directReply: `À vos ordres, Monsieur Roysten. Visual Studio Code est ouvert au premier plan sur votre écran avec le projet Jarvis.\n\n👉 [💻 Basculer sur VS Code](${vsCodeProto})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: vsCodeProto,
        label: 'Basculer sur VS Code',
      },
    };
  }

  // 4. Spotify & Musique (LANCEMENT NOUVEAU : Application native Windows UNIQUEMENT)
  if (
    lower.includes('spotify') ||
    (hasOpenVerb && (lower.includes('musique') || lower.includes('chanson') || lower.includes('morceau') || lower.includes('lofi') || lower.includes('afrobeat') || lower.includes('son')))
  ) {
    if (hasCloseVerb) {
      await closeApp('spotify');
      return {
        executed: true,
        actionNote: 'Spotify a été arrêté.',
        directReply: 'Spotify a été arrêté, Monsieur.',
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
    const spotifyProto = query
      ? `spotify:search:${encodeURIComponent(query)}`
      : 'spotify:';
    return {
      executed: true,
      actionNote: query
        ? `L'application native Spotify a été activée avec recherche « ${query} ».`
        : `L'application native Spotify a été lancée sur votre écran Windows.`,
      directReply: query
        ? `Tout de suite Monsieur. L'application native Spotify est activée sur votre PC avec « ${query} ».\n\n👉 [🎵 Activer Spotify](${spotifyProto})`
        : `Très bien Monsieur Roysten, l'application native Spotify est lancée directement sur votre bureau.\n\n👉 [🎵 Activer Spotify](${spotifyProto})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: spotifyProto,
        label: 'Activer Spotify',
      },
    };
  }

  // 5. Canva (Application bureau ou web)
  if (lower.includes('canva')) {
    if (hasCloseVerb) {
      await closeApp('canva');
      return { executed: true, actionNote: 'Canva a été fermé.', directReply: 'Canva a été fermé, Monsieur.', isPureCommand: true };
    }
    await launchApp('canva');
    const canvaUrl = 'https://www.canva.com';
    return {
      executed: true,
      actionNote: 'Canva a été ouvert sur votre écran.',
      directReply: `Canva a été lancé sur votre écran, Monsieur.\n\n👉 [🎨 Accéder à Canva](${canvaUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: canvaUrl,
        label: 'Ouvrir Canva',
      },
    };
  }

  // 6. CapCut (Application bureau ou web)
  if (lower.includes('capcut') || lower.includes('cap cut')) {
    if (hasCloseVerb) {
      await closeApp('capcut');
      return { executed: true, actionNote: 'CapCut a été fermé.', directReply: 'CapCut a été fermé, Monsieur.', isPureCommand: true };
    }
    await launchApp('capcut');
    const capcutUrl = 'https://www.capcut.com';
    return {
      executed: true,
      actionNote: 'CapCut a été ouvert au premier plan sur votre écran.',
      directReply: `CapCut est lancé au premier plan sur votre écran pour vos montages, Monsieur.\n\n👉 [🎬 Accéder à CapCut](${capcutUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: capcutUrl,
        label: 'Ouvrir CapCut',
      },
    };
  }

  // === NOUVEAU MODULE : RÉSEAUX SOCIAUX & WEB AUTOMATION ===

  // A. Facebook (Post, Commentaire ou Simple Ouverture)
  if (lower.includes('facebook') || lower === 'fb' || lower === 'ouvre fb') {
    if (hasCloseVerb) {
      await closeApp('facebook');
      return { executed: true, actionNote: 'Facebook a été fermé.', directReply: 'Facebook a été fermé, Monsieur.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('poste') || lower.includes('publie') || lower.includes('statut') ||
      lower.includes('écris') || lower.includes('ecris') || lower.includes('commente') || lower.includes('commentaire')
    ) {
      const isComment = lower.includes('commente') || lower.includes('commentaire');
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:facebook|post|poste|publie|commente|statut)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Tech et Intelligence Artificielle au Bénin';
      const result = await generateSocialContent('facebook', isComment ? 'comment' : 'post', topic);
      return {
        executed: true,
        actionNote: `Publication Facebook rédigée et copiée dans le presse-papier Windows.`,
        directReply: `Monsieur Roysten, voici votre publication Facebook rédigée avec soin :\n\n${result.content}\n\n📋 **Le texte a été copié automatiquement dans votre presse-papier Windows.**\n👉 Ouvrez Facebook et collez (**Ctrl + V**) pour publier !\n\n👉 [🌐 Ouvrir Facebook](${result.actionUrl})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: result.actionUrl,
          label: 'Ouvrir Facebook',
        },
      };
    }
    const fbUrl = 'https://www.facebook.com';
    await openUrl(fbUrl);
    return {
      executed: true,
      actionNote: 'Facebook a été ouvert dans votre navigateur.',
      directReply: `Facebook est ouvert, Monsieur Roysten.\n\n👉 [🌐 Ouvrir Facebook](${fbUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: fbUrl,
        label: 'Ouvrir Facebook',
      },
    };
  }

  // B. Twitter / X (Tweet, Réponse ou Simple Ouverture)
  if (
    lower.includes('twitter') || lower.includes('tweet') ||
    lower === 'x' || lower === 'ouvre x' || lower === 'lance x' || lower.includes('sur x') || lower.includes('sur twitter')
  ) {
    if (hasCloseVerb) {
      await closeApp('twitter');
      return { executed: true, actionNote: 'Twitter a été fermé.', directReply: 'Twitter a été fermé, Monsieur.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('tweet') || lower.includes('écris') || lower.includes('ecris') ||
      lower.includes('publie') || lower.includes('commente') || lower.includes('réponds') || lower.includes('reponds')
    ) {
      const isComment = lower.includes('commente') || lower.includes('réponse') || lower.includes('réponds');
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:twitter|tweet|sur x|sur twitter|post|poste|publie|commente)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Vibe coding et intelligence artificielle';
      const result = await generateSocialContent('twitter', isComment ? 'comment' : 'post', topic);
      return {
        executed: true,
        actionNote: `Tweet rédigé et interface de publication X (Twitter) ouverte avec le texte prérempli.`,
        directReply: `Voici le tweet rédigé pour vous, Monsieur Roysten :\n\n« ${result.content} »\n\n🚀 **La fenêtre X (Twitter) est prête avec votre tweet déjà inscrit !**\n\n👉 [🐦 Publier sur X (Twitter)](${result.actionUrl})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: result.actionUrl,
          label: 'Publier sur X',
        },
      };
    }
    const xUrl = 'https://x.com';
    await openUrl(xUrl);
    return {
      executed: true,
      actionNote: 'X (Twitter) a été ouvert.',
      directReply: `X (Twitter) est ouvert, Monsieur Roysten.\n\n👉 [🐦 Ouvrir X (Twitter)](${xUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: xUrl,
        label: 'Ouvrir X (Twitter)',
      },
    };
  }

  // C. LinkedIn (Post, Commentaire ou Simple Ouverture)
  if (lower.includes('linkedin')) {
    if (hasCloseVerb) {
      await closeApp('linkedin');
      return { executed: true, actionNote: 'LinkedIn a été fermé.', directReply: 'LinkedIn a été fermé, Monsieur.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('poste') || lower.includes('écris') || lower.includes('ecris') ||
      lower.includes('publie') || lower.includes('commente') || lower.includes('article')
    ) {
      const isComment = lower.includes('commente') || lower.includes('commentaire');
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:linkedin|post|poste|publie|commente)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Retour d\'expérience tech, études et vibe coding';
      const result = await generateSocialContent('linkedin', isComment ? 'comment' : 'post', topic);
      return {
        executed: true,
        actionNote: `Publication LinkedIn rédigée et copiée dans le presse-papier Windows.`,
        directReply: `Monsieur Roysten, voici votre publication LinkedIn professionnelle :\n\n${result.content}\n\n📋 **Le texte a été copié dans votre presse-papier Windows.**\n👉 LinkedIn est ouvert au premier plan, collez (**Ctrl + V**) pour publier !\n\n👉 [💼 Accéder à LinkedIn](${result.actionUrl})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: result.actionUrl,
          label: 'Ouvrir LinkedIn',
        },
      };
    }
    const inUrl = 'https://www.linkedin.com';
    await openUrl(inUrl);
    return {
      executed: true,
      actionNote: 'LinkedIn a été ouvert.',
      directReply: `LinkedIn est ouvert, Monsieur Roysten.\n\n👉 [💼 Ouvrir LinkedIn](${inUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: inUrl,
        label: 'Ouvrir LinkedIn',
      },
    };
  }

  // D. Instagram (Légende, Post, ou Simple Lancement)
  if (lower.includes('instagram') || lower === 'insta' || lower === 'ouvre insta' || lower === 'lance insta') {
    if (hasCloseVerb) {
      await closeApp('instagram');
      return { executed: true, actionNote: 'Instagram a été fermé.', directReply: 'Instagram a été fermé, Monsieur.', isPureCommand: true };
    }
    if (
      lower.includes('post') || lower.includes('légende') || lower.includes('legende') || lower.includes('caption') ||
      lower.includes('photo') || lower.includes('publie') || lower.includes('reel')
    ) {
      const { generateSocialContent } = await import('@/lib/social-controller');
      const topic = message.replace(/.*(?:instagram|post|légende|legende|caption|photo)(?:\s+sur|\s+de|\s+pour|\s*:)?/i, '').trim() || 'Création digitale et lifestyle développeur';
      const result = await generateSocialContent('instagram', 'post', topic);
      return {
        executed: true,
        actionNote: `Légende Instagram rédigée et copiée dans le presse-papier Windows.`,
        directReply: `Voici votre légende Instagram optimisée, Monsieur Roysten :\n\n${result.content}\n\n📋 **Copiée dans votre presse-papier.**\n\n👉 [📸 Ouvrir Instagram](${result.actionUrl})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: result.actionUrl,
          label: 'Ouvrir Instagram',
        },
      };
    }
    await launchApp('instagram');
    const instaUrl = 'https://www.instagram.com';
    return {
      executed: true,
      actionNote: 'Instagram a été lancé sur votre ordinateur.',
      directReply: `L'application Instagram a été lancée sur votre ordinateur, Monsieur Roysten.\n\n👉 [📸 Ouvrir Instagram](${instaUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: instaUrl,
        label: 'Ouvrir Instagram',
      },
    };
  }

  // E. Navigation Web Directe (navigue sur..., va sur..., ouvre le site...)
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
      directReply: `Navigation en cours vers ${targetUrl}, Monsieur Roysten.\n\n👉 [🌐 Ouvrir le site](${targetUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: targetUrl,
        label: 'Accéder au site',
      },
    };
  }

  // 7. Suite Office (Word, Excel, PowerPoint)
  if (lower.includes('word') || lower.includes('winword') || lower.includes('traitement de texte')) {
    if (hasCloseVerb) {
      await closeApp('word');
      return { executed: true, actionNote: 'Word a été fermé.', directReply: 'Microsoft Word a été fermé, Monsieur.', isPureCommand: true };
    }
    await launchApp('word');
    return {
      executed: true,
      actionNote: 'Microsoft Word a été ouvert au premier plan sur votre écran.',
      directReply: 'Microsoft Word est ouvert au premier plan sur votre écran, Monsieur.',
      isPureCommand: true,
    };
  }

  if (lower.includes('excel') || lower.includes('tableur')) {
    if (hasCloseVerb) {
      await closeApp('excel');
      return { executed: true, actionNote: 'Excel a été fermé.', directReply: 'Microsoft Excel a été fermé, Monsieur.', isPureCommand: true };
    }
    await launchApp('excel');
    return {
      executed: true,
      actionNote: 'Microsoft Excel a été ouvert au premier plan sur votre écran.',
      directReply: 'Microsoft Excel est ouvert au premier plan sur votre écran, Monsieur.',
      isPureCommand: true,
    };
  }

  if (lower.includes('powerpoint') || lower.includes('power point') || lower.includes('diaporama') || lower.includes('slide')) {
    if (hasCloseVerb) {
      await closeApp('powerpoint');
      return { executed: true, actionNote: 'PowerPoint a été fermé.', directReply: 'PowerPoint a été fermé, Monsieur.', isPureCommand: true };
    }
    await launchApp('powerpoint');
    return {
      executed: true,
      actionNote: 'Microsoft PowerPoint a été ouvert au premier plan sur votre écran.',
      directReply: 'Microsoft PowerPoint est ouvert au premier plan sur votre écran, Monsieur.',
      isPureCommand: true,
    };
  }

  // 8. YouTube & Google Search
  if (lower.includes('youtube')) {
    const match = message.match(/cherche\s+(.*?)\s+sur\s+youtube/i) || message.match(/sur\s+youtube\s+(.*)/i);
    const query = match ? match[1].trim() : '';
    const ytUrl = query
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      : 'https://youtube.com';
    if (query) {
      await searchYouTube(query);
      return {
        executed: true,
        actionNote: `YouTube a été ouvert avec la recherche : "${query}".`,
        directReply: `J'ai ouvert YouTube avec votre recherche « ${query} », Monsieur.\n\n👉 [▶️ Regarder sur YouTube](${ytUrl})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: ytUrl,
          label: 'Ouvrir YouTube',
        },
      };
    }
    if (hasOpenVerb || lower === 'youtube') {
      await openUrl('https://youtube.com');
      return {
        executed: true,
        actionNote: 'YouTube a été ouvert dans votre navigateur.',
        directReply: `YouTube est ouvert dans votre navigateur, Monsieur.\n\n👉 [▶️ Accéder à YouTube](${ytUrl})`,
        isPureCommand: true,
        clientAction: {
          type: 'open_url',
          url: ytUrl,
          label: 'Ouvrir YouTube',
        },
      };
    }
  }

  if (lower.includes('google') && (lower.includes('cherche') || lower.includes('trouve'))) {
    const match = message.match(/cherche\s+(.*?)\s+sur\s+google/i);
    const query = match ? match[1].trim() : '';
    const gUrl = query
      ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
      : 'https://google.com';
    await searchGoogle(query);
    return {
      executed: true,
      actionNote: `Google a été ouvert avec la recherche : "${query}".`,
      directReply: `Google Chrome est ouvert avec votre recherche « ${query} », Monsieur.\n\n👉 [🔍 Voir sur Google](${gUrl})`,
      isPureCommand: true,
      clientAction: {
        type: 'open_url',
        url: gUrl,
        label: 'Ouvrir Google',
      },
    };
  }

  // 9. Chrome / Navigateur
  if (lower.includes('chrome') || (hasOpenVerb && (lower.includes('navigateur') || lower.includes('internet')))) {
    if (hasCloseVerb) {
      await closeApp('chrome');
      return { executed: true, actionNote: 'Google Chrome a été fermé.', directReply: 'Google Chrome a été fermé, Monsieur.', isPureCommand: true };
    }
    await launchApp('chrome');
    return {
      executed: true,
      actionNote: 'Google Chrome a été lancé au premier plan.',
      directReply: 'Google Chrome est ouvert au premier plan, Monsieur.',
      isPureCommand: true,
    };
  }

  // 10. Explorateur de fichiers
  if (lower.includes('explorateur') || lower.includes('mes documents') || lower.includes('dossier')) {
    await launchApp('explorer');
    return {
      executed: true,
      actionNote: "L'explorateur de fichiers a été ouvert.",
      directReply: "L'explorateur de fichiers est ouvert, Monsieur.",
      isPureCommand: true,
    };
  }

  // 11. Terminal
  if (lower.includes('terminal') || lower.includes('powershell') || lower.includes('console')) {
    await launchApp('terminal');
    return {
      executed: true,
      actionNote: 'Le terminal PowerShell a été ouvert sur votre écran.',
      directReply: 'Le terminal PowerShell est ouvert sur votre écran, Monsieur.',
      isPureCommand: true,
    };
  }

  return { executed: false };
}

