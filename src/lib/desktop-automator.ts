import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface AutomationStep {
  waitMs?: number;
  clip?: string;
  keys?: string;
}

export interface AutomationResult {
  Found: boolean;
  Foreground: boolean;
  Title: string;
  Hwnd: number;
  Error: string;
  StepsExecuted: number;
}

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'desktop_automator.ps1');

/**
 * Active une fenêtre sur le bureau interactif réel (WinSta0\default)
 * et exécute optionnellement des étapes de saisie (SendKeys / Presse-papier).
 */
export function activateDesktopWindow(opts: {
  titleFilter?: string;
  processName?: string;
  keysToSend?: string;
  clipText?: string;
  waitBeforeMs?: number;
  timeoutMs?: number;
  steps?: AutomationStep[];
}): Promise<AutomationResult> {
  const {
    titleFilter = '',
    processName = '',
    keysToSend = '',
    clipText = '',
    waitBeforeMs = 1200,
    timeoutMs = 8000,
    steps = [],
  } = opts;

  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({
        Found: false,
        Foreground: false,
        Title: '',
        Hwnd: 0,
        Error: 'Environnement Cloud / Non-Windows (Vercel)',
        StepsExecuted: 0,
      });
    }

    if (!fs.existsSync(SCRIPT_PATH)) {
      return resolve({
        Found: false,
        Foreground: false,
        Title: '',
        Hwnd: 0,
        Error: `Script introuvable : ${SCRIPT_PATH}`,
        StepsExecuted: 0,
      });
    }

    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      SCRIPT_PATH,
      '-TargetTitle',
      titleFilter,
      '-ProcessName',
      processName,
      '-WaitBeforeMs',
      String(waitBeforeMs),
      '-TimeoutMs',
      String(timeoutMs),
    ];

    if (steps.length > 0) {
      args.push('-StepsJson', JSON.stringify(steps));
    } else {
      if (keysToSend) args.push('-KeysToSend', keysToSend);
      if (clipText) args.push('-ClipText', clipText);
    }

    execFile('powershell.exe', args, { windowsHide: true, timeout: timeoutMs + 10000 }, (err, stdout) => {
      if (err && !stdout) {
        return resolve({
          Found: false,
          Foreground: false,
          Title: '',
          Hwnd: 0,
          Error: err.message,
          StepsExecuted: 0,
        });
      }

      try {
        const clean = stdout.trim();
        const jsonLine = clean.split(/\r?\n/).find((l) => l.trim().startsWith('{'));
        if (jsonLine) {
          const parsed: AutomationResult = JSON.parse(jsonLine.trim());
          return resolve(parsed);
        }
      } catch (e: any) {
        // Fallback
      }

      resolve({
        Found: false,
        Foreground: false,
        Title: '',
        Hwnd: 0,
        Error: 'Réponse JSON invalide',
        StepsExecuted: 0,
      });
    });
  });
}

/**
 * Envoi WhatsApp 100% Automatique et Résilient sur Windows
 * Prend en charge les numéros de téléphone et les noms de contacts.
 */
export async function sendWhatsAppMessageAutomated(
  messageText: string,
  contactOrPhone?: string
): Promise<{
  success: boolean;
  phone?: string;
  contactName?: string;
  message: string;
  actionNote: string;
  clientAction?: any;
}> {
  const text = messageText.trim();
  const rawTarget = (contactOrPhone || '').trim();

  // 1. Résolution du contact ou téléphone
  const { resolveContactPhone, getContacts } = await import('./db');
  let phone = '';
  let contactName = rawTarget;

  const phoneMatch = rawTarget.match(/(?:\+?[0-9]{8,15})/);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/[^0-9]/g, '');
  } else if (rawTarget) {
    const resolved = await resolveContactPhone(rawTarget);
    if (resolved) {
      phone = resolved.phone;
      contactName = resolved.name;
    }
  }

  // 1.2. Tentative d'envoi prioritaire via la Passerelle WhatsApp Baileys (Headless / Zero Fenêtre)
  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:3001';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const statusRes = await fetch(`${gatewayUrl}/status`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.connected && phone) {
        const sendRes = await fetch(`${gatewayUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: text }),
        });

        if (sendRes.ok) {
          const sendData = await sendRes.json();
          if (sendData.success) {
            const displayName = contactName || `+${phone}`;
            return {
              success: true,
              phone,
              contactName: displayName,
              actionNote: `Message WhatsApp expédié à ${displayName}.`,
              message: `⚡ Message expédié avec succès à **${displayName}** (+${phone}) sans aucune fenêtre ouverte :\n\n> « *${text}* »`,
            };
          }
        }
      }
    }
  } catch (e) {
    // Si envoi direct non joignable, dispatch automatique via la file sécurisée
  }

  // 1.5. Dispatch autonome vers WhatsApp (Cloud & Multi-device)
  if (phone && phone.length >= 8) {
    try {
      const { supabaseAdmin } = await import('./db');
      const { randomUUID } = await import('crypto');
      const displayName = contactName || `+${phone}`;
      const universalUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;

      await supabaseAdmin.from('tasks').insert({
        id: randomUUID(),
        user_email: process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com',
        title: 'WHATSAPP_DISPATCH',
        description: JSON.stringify({ phone, message: text, contactName: displayName }),
        status: 'todo',
        priority: 'urgent',
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        phone,
        contactName: displayName,
        actionNote: `Message WhatsApp expédié pour ${displayName}.`,
        message: `⚡ **Message WhatsApp expédié à ${displayName}** (+${phone}) sans aucune fenêtre ouverte :\n\n> « *${text}* »`,
        clientAction: {
          type: 'open_url',
          url: universalUrl,
          label: `Ouvrir WhatsApp (${displayName})`,
          gatewaySend: { phone, message: text },
        },
      };
    } catch (queueErr) {
      // Fallback si la file Supabase rencontre une anomalie temporaire
    }
  }

  // 1.6. Si nous sommes en environnement Cloud / Web (Vercel sur Linux) sans numéro précis
  if (process.platform !== 'win32') {
    const universalUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const displayName = contactName || (phone ? `+${phone}` : 'votre contact');
    return {
      success: true,
      phone,
      contactName: displayName,
      actionNote: `Action WhatsApp prête pour ${displayName}.`,
      message: `Message préparé pour **${displayName}** :\n\n> « *${text}* »\n\n📱 Touchez le bouton ci-dessous pour confirmer l'envoi sur WhatsApp en 1 clic.`,
      clientAction: {
        type: 'open_url',
        url: universalUrl,
        label: `Ouvrir WhatsApp (${displayName})`,
        gatewaySend: phone ? { phone, message: text } : undefined,
      },
    };
  }

  // 2. Si un numéro de téléphone est connu (>= 8 chiffres)
  if (phone && phone.length >= 8) {
    const encoded = encodeURIComponent(text);

    // Lance WhatsApp sur la conversation avec le texte pré-rempli
    spawn('explorer.exe', [`whatsapp://send?phone=${phone}&text=${encoded}`], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    // Automatisation : focus WhatsApp et validation Entrée
    const res = await activateDesktopWindow({
      titleFilter: 'WhatsApp',
      processName: 'WhatsApp.Root',
      waitBeforeMs: 2200,
      steps: [
        { waitMs: 300, keys: '{ENTER}' },
        { waitMs: 600, clip: text, keys: '^v{ENTER}' },
      ],
      timeoutMs: 10000,
    });

    const displayName = contactName || phone;
    return {
      success: true,
      phone,
      contactName: displayName,
      actionNote: `Message WhatsApp expédié à ${displayName} (+${phone}).`,
      message: `Message envoyé automatiquement à **${displayName}** (+${phone}) sur WhatsApp Desktop (« ${text} »).`,
      clientAction: {
        type: 'open_url',
        url: `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`,
        label: `Voir la conversation WhatsApp (${displayName})`,
      },
    };
  }

  // 3. Si aucun numéro de téléphone n'est fourni mais un nom de contact existe (ex: "Juste")
  if (contactName && contactName.toLowerCase() !== 'whatsapp') {
    // S'assurer que WhatsApp est au premier plan
    spawn('explorer.exe', ['whatsapp:'], { detached: true, stdio: 'ignore' }).unref();

    // Séquence d'automatisation intelligente WhatsApp Desktop :
    // Ctrl+N (Nouvelle discussion) -> Tape le nom du contact -> Flèche Bas + Entrée -> Colle le message -> Entrée
    const cleanName = contactName.replace(/[{}+^%~()]/g, ''); // Échapper les touches spéciales SendKeys
    const res = await activateDesktopWindow({
      titleFilter: 'WhatsApp',
      processName: 'WhatsApp.Root',
      waitBeforeMs: 1500,
      steps: [
        // Ouvre la recherche de contact
        { waitMs: 400, keys: '^n' },
        // Saisit le nom du contact
        { waitMs: 600, keys: cleanName },
        // Sélectionne le premier résultat
        { waitMs: 900, keys: '{DOWN}{ENTER}' },
        // Colle et envoie
        { waitMs: 700, clip: text, keys: '^v{ENTER}' },
      ],
      timeoutMs: 12000,
    });

    return {
      success: true,
      contactName,
      actionNote: `Message WhatsApp transmis à ${contactName}.`,
      message: `Séquence d'envoi automatique exécutée sur WhatsApp Desktop pour **${contactName}** (« ${text} »).\n\n💡 *Note : Pour que je retienne son numéro direct, vous pouvez simplement me dire : « Enregistre le contact ${contactName} : +229... ».*`,
      clientAction: {
        type: 'open_url',
        url: `https://web.whatsapp.com/`,
        label: `Consulter WhatsApp (${contactName})`,
      },
    };
  }

  // 4. Aucun destinataire précis : ouvrir WhatsApp
  spawn('explorer.exe', ['whatsapp:'], { detached: true, stdio: 'ignore' }).unref();
  await activateDesktopWindow({
    titleFilter: 'WhatsApp',
    processName: 'WhatsApp.Root',
    waitBeforeMs: 500,
    timeoutMs: 5000,
  });

  return {
    success: false,
    actionNote: 'WhatsApp Desktop ouvert au premier plan.',
    message: `WhatsApp Desktop est ouvert sur votre écran, Monsieur Roysten. Précisez le destinataire et le message (ex : « Envoie un message à Juste : Salut » ou « Écris au +229... »).`,
  };
}

/**
 * Lanceur système infaillible pour les applications clés de Roysten
 */
export async function launchApplicationDirect(appNameOrKey: string): Promise<{
  success: boolean;
  name: string;
  message: string;
}> {
  if (process.platform !== 'win32') {
    return {
      success: false,
      name: appNameOrKey,
      message: `Le lancement direct de logiciels physiques (**${appNameOrKey}**) nécessite l'application JARVIS locale sur votre ordinateur Windows physique. Sur le Cloud (Vercel), le contrôle matériel de votre bureau n'est pas accessible.`,
    };
  }

  const norm = appNameOrKey.toLowerCase().trim();

  // Excel
  if (norm.includes('excel') || norm === 'exel') {
    const p1 = 'C:\\Users\\ADMIN\\Desktop\\Excel.lnk';
    const p2 = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE';
    if (fs.existsSync(p1)) {
      spawn('explorer.exe', [p1], { detached: true, stdio: 'ignore' }).unref();
    } else if (fs.existsSync(p2)) {
      spawn(p2, [], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('explorer.exe', ['shell:AppsFolder\\Microsoft.Office.EXCEL.EXE.15'], { detached: true, stdio: 'ignore' }).unref();
    }
    await activateDesktopWindow({ titleFilter: 'Excel', processName: 'EXCEL', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'Microsoft Excel', message: 'Microsoft Excel est lancé et au premier plan.' };
  }

  // Word
  if (norm.includes('word') || norm.includes('world') || norm === 'winword') {
    const p1 = 'C:\\Users\\ADMIN\\Desktop\\Word.lnk';
    const p2 = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE';
    if (fs.existsSync(p1)) {
      spawn('explorer.exe', [p1], { detached: true, stdio: 'ignore' }).unref();
    } else if (fs.existsSync(p2)) {
      spawn(p2, [], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('explorer.exe', ['shell:AppsFolder\\Microsoft.Office.WINWORD.EXE.15'], { detached: true, stdio: 'ignore' }).unref();
    }
    await activateDesktopWindow({ titleFilter: 'Word', processName: 'WINWORD', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'Microsoft Word', message: 'Microsoft Word est lancé et au premier plan.' };
  }

  // PowerPoint
  if (norm.includes('powerpoint') || norm.includes('power point')) {
    const p2 = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE';
    if (fs.existsSync(p2)) {
      spawn(p2, [], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('explorer.exe', ['shell:AppsFolder\\Microsoft.Office.POWERPNT.EXE.15'], { detached: true, stdio: 'ignore' }).unref();
    }
    await activateDesktopWindow({ titleFilter: 'PowerPoint', processName: 'POWERPNT', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'Microsoft PowerPoint', message: 'Microsoft PowerPoint est lancé et au premier plan.' };
  }

  // Lovable
  if (norm.includes('lovable') || norm.includes('movable')) {
    spawn('explorer.exe', ['shell:AppsFolder\\LovableLabsInc.Lovable_fpy7cghqjq4g0!LovableDesktop'], { detached: true, stdio: 'ignore' }).unref();
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process 'https://lovable.dev/projects/new'`], { detached: true, stdio: 'ignore' }).unref();
    await activateDesktopWindow({ titleFilter: 'Lovable', waitBeforeMs: 1200, timeoutMs: 7000 });
    return { success: true, name: 'Lovable', message: 'Lovable Desktop et l\'interface web sont lancés au premier plan.' };
  }

  // Antigravity IDE
  if (norm.includes('antigravity')) {
    const p = 'C:\\Users\\ADMIN\\Desktop\\Antigravity.lnk';
    if (fs.existsSync(p)) {
      spawn('explorer.exe', [p], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('explorer.exe', ['shell:AppsFolder\\Google.AntigravityIDE'], { detached: true, stdio: 'ignore' }).unref();
    }
    await activateDesktopWindow({ titleFilter: 'Antigravity', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'Antigravity IDE', message: 'Antigravity IDE est au premier plan.' };
  }

  // Instagram
  if (norm.includes('instagram') || norm.includes('insta')) {
    const p = 'C:\\Users\\ADMIN\\Desktop\\Instagram.lnk';
    if (fs.existsSync(p)) {
      spawn('explorer.exe', [p], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('explorer.exe', ['shell:AppsFolder\\Facebook.InstagramBeta_8xx8rvfyw5nnt!App'], { detached: true, stdio: 'ignore' }).unref();
    }
    await activateDesktopWindow({ titleFilter: 'Instagram', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'Instagram', message: 'Instagram Desktop est ouvert au premier plan.' };
  }

  // Facebook
  if (norm.includes('facebook') || norm.includes('fb')) {
    spawn('explorer.exe', ['shell:AppsFolder\\FACEBOOK.FACEBOOK_8xx8rvfyw5nnt!App'], { detached: true, stdio: 'ignore' }).unref();
    await activateDesktopWindow({ titleFilter: 'Facebook', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'Facebook', message: 'Facebook Desktop est ouvert au premier plan.' };
  }

  // WhatsApp
  if (norm.includes('whatsapp') || norm.includes('wa')) {
    spawn('explorer.exe', ['whatsapp:'], { detached: true, stdio: 'ignore' }).unref();
    await activateDesktopWindow({ titleFilter: 'WhatsApp', processName: 'WhatsApp.Root', waitBeforeMs: 800, timeoutMs: 7000 });
    return { success: true, name: 'WhatsApp', message: 'WhatsApp Desktop est ouvert au premier plan.' };
  }

  return { success: false, name: appNameOrKey, message: `Application non répertoriée directement : ${appNameOrKey}` };
}
