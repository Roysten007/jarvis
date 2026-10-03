import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const AUTH_DIR = path.join(process.cwd(), '.data', 'baileys_auth');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let currentQr = null;
let currentQrDataUrl = null;
let isConnected = false;
let userInfo = null;
let lastPairingCode = null;

async function startWhatsAppGateway() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n=================================================`);
  console.log(`⚡ J.A.R.V.I.S // PASSERELLE WHATSAPP AUTONOME v1.1`);
  console.log(`=================================================`);
  console.log(`[JARVIS-WA] Version Baileys: v${version.join('.')}`);
  console.log(`[JARVIS-WA] Empreinte navigateur certifiée: Windows Desktop`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
    browser: Browsers.windows('Desktop'),
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      try {
        currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
      } catch (e) {}

      console.log('\n[JARVIS-WA] 📱 NOUVEAU QR CODE PRÊT !');
      console.log('Scannez avec WhatsApp ou utilisez le code d\'association sur : http://localhost:' + PORT);
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[JARVIS-WA] Déconnexion (code: ${statusCode}). Reconnexion : ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startWhatsAppGateway, 3000);
      } else {
        console.log('[JARVIS-WA] Déconnecté de WhatsApp. Nettoyage des credentials.');
        currentQr = null;
        currentQrDataUrl = null;
        lastPairingCode = null;
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        } catch (e) {}
        setTimeout(startWhatsAppGateway, 2000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      currentQrDataUrl = null;
      lastPairingCode = null;
      userInfo = sock.user;
      console.log('\n=================================================');
      console.log('✅ JARVIS EST CONNECTÉ À VOTRE COMPTE WHATSAPP !');
      console.log(`Identifiant : ${sock.user?.id || 'Actif'}`);
      console.log(`Nom : ${sock.user?.name || 'Roysten'}`);
      console.log('Tous les messages WhatsApp seront expédiés en tâche de fond.');
      console.log('=================================================\n');
    }
  });
}

// Micro-serveur HTTP pour recevoir les ordres de JARVIS
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // 1. Statut de la passerelle
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        connected: isConnected,
        user: userInfo,
        qrAvailable: !isConnected && !!currentQr,
        pairingCode: lastPairingCode,
      })
    );
  }

  // 2. Demande de code d'association (Pairing Code à 8 chiffres)
  if (req.method === 'POST' && req.url === '/pairing-code') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { phone } = JSON.parse(body);
        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Numéro requis' }));
        }

        let cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 8) cleanPhone = '229' + cleanPhone;
        else if (cleanPhone.length === 10 && cleanPhone.startsWith('01')) cleanPhone = '229' + cleanPhone;

        if (!sock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Socket non initialisé' }));
        }

        console.log(`[JARVIS-WA] Demande de code d'association pour : ${cleanPhone}...`);
        const code = await sock.requestPairingCode(cleanPhone);
        lastPairingCode = code;

        console.log(`\n=================================================`);
        console.log(`🔑 CODE D'ASSOCIATION WHATSAPP : ${code}`);
        console.log(`Sur votre téléphone : WhatsApp ➔ Appareils connectés ➔ Lier avec un numéro de téléphone ➔ Tapez : ${code}`);
        console.log(`=================================================\n`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, code, phone: cleanPhone }));
      } catch (err) {
        console.error('[JARVIS-WA] Erreur pairing code:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 3. Réinitialiser la session
  if (req.method === 'POST' && req.url === '/reset') {
    try {
      if (sock) {
        try { sock.logout(); } catch (e) {}
        try { sock.end(); } catch (e) {}
      }
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      isConnected = false;
      currentQr = null;
      currentQrDataUrl = null;
      lastPairingCode = null;
      setTimeout(startWhatsAppGateway, 1000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Session réinitialisée.' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // 4. Page Web interactive avec Pairing Code & QR Code
  if (req.method === 'GET' && (req.url === '/' || req.url === '/qr')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JARVIS // Passerelle WhatsApp</title>
        <style>
          body {
            background-color: #030712;
            color: #f1f5f9;
            font-family: monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 16px;
            box-sizing: border-box;
          }
          .card {
            background: #060c1d;
            border: 1px solid #00f0ff50;
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.2);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            max-width: 480px;
            width: 100%;
          }
          h1 { color: #00f0ff; margin-bottom: 6px; font-size: 1.2rem; letter-spacing: 2px; }
          p { color: #94a3b8; font-size: 0.85rem; line-height: 1.4; margin-bottom: 16px; }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-bottom: 16px;
          }
          .online { background: #064e3b; color: #34d399; border: 1px solid #10b981; }
          .waiting { background: #78350f; color: #fbbf24; border: 1px solid #f59e0b; }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          
          .pairing-box {
            background: #0a1329;
            border: 1px solid #00f0ff40;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .input-row {
            display: flex;
            gap: 8px;
            margin-top: 10px;
          }
          input {
            flex: 1;
            background: #030712;
            border: 1px solid #334155;
            color: #f8fafc;
            padding: 10px 12px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9rem;
            outline: none;
          }
          input:focus { border-color: #00f0ff; }
          button.btn-primary {
            background: #0284c7;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: bold;
            font-family: monospace;
            cursor: pointer;
            transition: all 0.2s;
          }
          button.btn-primary:hover { background: #00f0ff; color: #000; }
          .code-display {
            margin-top: 14px;
            padding: 14px;
            background: #022c22;
            border: 1px solid #10b981;
            border-radius: 8px;
            color: #34d399;
            font-size: 1.4rem;
            font-weight: bold;
            letter-spacing: 4px;
          }
          .qr-box {
            background: white;
            padding: 14px;
            border-radius: 12px;
            display: inline-block;
            margin: 10px 0;
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
          }
          .qr-img { width: 230px; height: 230px; display: block; }
          .divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 18px 0;
            color: #64748b;
            font-size: 0.75rem;
          }
          .divider::before, .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid #1e293b;
          }
          .divider span { padding: 0 10px; }
          .reset-btn {
            background: transparent;
            border: 1px solid #475569;
            color: #94a3b8;
            font-size: 0.75rem;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 16px;
          }
          .reset-btn:hover { border-color: #ef4444; color: #f87171; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>J.A.R.V.I.S // WHATSAPP GATEWAY</h1>
          <p>Passerelle autonome sécurisée avec empreinte Windows certifiée.</p>

          ${
            isConnected
              ? `
              <div class="status-badge online">
                <span class="dot"></span>
                <span>CONNECTÉ // ${userInfo?.name || 'ROYSTEN'} (${userInfo?.id?.split(':')[0] || 'Actif'})</span>
              </div>
              <p style="color: #34d399; font-size: 0.95rem;">
                ✅ Votre compte WhatsApp est connecté à JARVIS.<br>
                Tous les ordres d'envoi s'exécutent en arrière-plan sans fenêtre.
              </p>
              <button class="reset-btn" onclick="resetSession()">Déconnecter & Réinitialiser</button>
            `
              : `
              <div class="status-badge waiting">
                <span class="dot"></span>
                <span>EN ATTENTE DE CONNEXION</span>
              </div>

              <!-- OPTION A : CODE D'ASSOCIATION 100% FIABLE -->
              <div class="pairing-box">
                <div style="font-weight: bold; color: #00f0ff; font-size: 0.85rem; text-align: left;">
                  ⚡ OPTION 1 : Associer avec un code (Zéro caméra)
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-align: left; margin-top: 4px;">
                  Idéal si le QR code refuse de scanner sur votre téléphone.
                </div>
                <div class="input-row">
                  <input type="text" id="phoneInput" placeholder="Ex: 229XXXXXXXX ou 01XXXXXXXX" value="229" />
                  <button class="btn-primary" onclick="requestPairing()">Recevoir Code</button>
                </div>
                <div id="codeResult" style="display: none;"></div>
              </div>

              <div class="divider"><span>OU SCANNER LE QR CODE</span></div>

              <!-- OPTION B : SCAN QR AVEC NOUVELLE EMPREINTE WINDOWS -->
              ${
                currentQrDataUrl
                  ? `
                  <div class="qr-box">
                    <img class="qr-img" src="${currentQrDataUrl}" alt="QR Code WhatsApp" />
                  </div>
                  <p style="font-size: 0.8rem;">WhatsApp ➔ <b>Appareils connectés</b> ➔ <b>Connecter un appareil</b></p>
                `
                  : `
                  <p style="color: #fbbf24;">Génération du QR Code certifié en cours...</p>
                `
              }

              <div>
                <button class="reset-btn" onclick="resetSession()">Nettoyer le cache & Réinitialiser</button>
              </div>
            `
          }
        </div>

        <script>
          async function requestPairing() {
            const phone = document.getElementById('phoneInput').value.trim();
            if (!phone || phone.length < 8) {
              alert('Veuillez entrer un numéro de téléphone valide');
              return;
            }
            const resDiv = document.getElementById('codeResult');
            resDiv.style.display = 'block';
            resDiv.innerHTML = '<div style="margin-top: 10px; color: #38bdf8;">Génération du code officiel WhatsApp...</div>';

            try {
              const r = await fetch('/pairing-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
              });
              const data = await r.json();
              if (data.success && data.code) {
                resDiv.innerHTML = \`
                  <div class="code-display">\${data.code}</div>
                  <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 8px; text-align: left;">
                    Sur votre téléphone :<br>
                    1. Ouvrez <b>WhatsApp</b> ➔ <b>Appareils connectés</b><br>
                    2. Touchez <b>Connecter un appareil</b><br>
                    3. Touchez en bas : <b>« Associer avec un numéro de téléphone »</b><br>
                    4. Saisissez ce code à 8 chiffres : <b style="color: #34d399">\${data.code}</b>
                  </div>
                \`;
              } else {
                resDiv.innerHTML = '<div style="color: #ef4444; margin-top: 8px;">Erreur : ' + (data.error || 'Échec') + '</div>';
              }
            } catch (e) {
              resDiv.innerHTML = '<div style="color: #ef4444; margin-top: 8px;">Erreur réseau : ' + e.message + '</div>';
            }
          }

          async function resetSession() {
            if (!confirm('Voulez-vous réinitialiser la session WhatsApp ?')) return;
            await fetch('/reset', { method: 'POST' });
            alert('Session réinitialisée. Rechargement...');
            location.reload();
          }

          setInterval(async () => {
            try {
              const r = await fetch('/status');
              const d = await r.json();
              if (d.connected) location.reload();
            } catch (e) {}
          }, 4000);
        </script>
      </body>
      </html>
    `);
  }

  // 5. Envoi de message via POST /send
  if (req.method === 'POST' && req.url === '/send') {
    if (!isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: false,
          error: "La passerelle WhatsApp n'est pas encore connectée. Veuillez vous associer sur http://localhost:3001",
        })
      );
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { phone, message } = payload;

        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Champs phone et message requis' }));
        }

        let cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 8) cleanPhone = '229' + cleanPhone;
        else if (cleanPhone.length === 10 && cleanPhone.startsWith('01')) cleanPhone = '229' + cleanPhone;

        const jid = `${cleanPhone}@s.whatsapp.net`;

        console.log(`[JARVIS-WA] Envoi en cours vers ${jid}...`);
        const result = await sock.sendMessage(jid, { text: message.trim() });

        console.log(`[JARVIS-WA] ✅ Message expédié avec succès vers ${cleanPhone} (ID: ${result.key.id})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            success: true,
            messageId: result.key.id,
            to: cleanPhone,
            message: message.trim(),
            timestamp: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.error('[JARVIS-WA] Erreur lors de l\'envoi:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route introuvable' }));
});

server.listen(PORT, () => {
  console.log(`[JARVIS-WA] Serveur API en écoute sur http://localhost:${PORT}`);
  console.log(`[JARVIS-WA] Interface de connexion : http://localhost:${PORT}`);
  startWhatsAppGateway();
});
