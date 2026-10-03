import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
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
let isStarting = false;

async function startWhatsAppGateway() {
  if (isStarting) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version;
    try {
      const waWeb = await fetchLatestWaWebVersion();
      version = waWeb.version;
    } catch (e) {
      const bVer = await fetchLatestBaileysVersion();
      version = bVer.version;
    }

    console.log(`\n=================================================`);
    console.log(`⚡ J.A.R.V.I.S // PASSERELLE WHATSAPP OFFICIELLE v2.0`);
    console.log(`=================================================`);
    console.log(`[JARVIS-WA] Version Web WhatsApp en direct : v${version.join('.')}`);
    console.log(`[JARVIS-WA] Empreinte certifiée : Ubuntu Chrome (Haute compatibilité)`);

    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.end();
      } catch (e) {}
      sock = null;
    }

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        } catch (e) {}

        console.log('\n[JARVIS-WA] 📱 QR CODE DISPONIBLE !');
        console.log(`Ouvrez http://localhost:${PORT} sur votre écran pour scanner avec WhatsApp.`);
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === 'close') {
        isConnected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[JARVIS-WA] Connexion fermée (statut: ${statusCode}).`);

        isStarting = false;

        if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
          console.log('[JARVIS-WA] 🔄 Redémarrage WhatsApp requis (515) -> Reconnexion automatique...');
          setTimeout(startWhatsAppGateway, 1000);
        } else if (statusCode === DisconnectReason.loggedOut) {
          console.log('[JARVIS-WA] Déconnexion demandée par l\'utilisateur. Nettoyage de la session...');
          currentQr = null;
          currentQrDataUrl = null;
          lastPairingCode = null;
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch (e) {}
          setTimeout(startWhatsAppGateway, 2000);
        } else {
          console.log('[JARVIS-WA] Reconnexion automatique dans 3 secondes...');
          setTimeout(startWhatsAppGateway, 3000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQr = null;
        currentQrDataUrl = null;
        lastPairingCode = null;
        userInfo = sock.user;
        isStarting = false;

        console.log('\n=================================================');
        console.log('✅ JARVIS EST CONNECTÉ AVEC SUCCÈS À WHATSAPP !');
        console.log(`Utilisateur : ${sock.user?.name || 'Roysten'}`);
        console.log(`Identifiant : ${sock.user?.id || 'Actif'}`);
        console.log('Toutes les requêtes de messages seront exécutées en tâche de fond.');
        console.log('=================================================\n');
      }
    });
  } catch (err) {
    console.error('[JARVIS-WA] Erreur initialisation:', err);
    isStarting = false;
    setTimeout(startWhatsAppGateway, 5000);
  }
}

// Micro-serveur HTTP
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // 1. Statut
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

  // 2. Demande de code d'association (Pairing Code)
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
        // Formatage intelligent Bénin
        if (cleanPhone.length === 8) cleanPhone = '229' + cleanPhone;
        else if (cleanPhone.length === 10 && cleanPhone.startsWith('01')) cleanPhone = '229' + cleanPhone;

        if (!sock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Socket en cours d\'initialisation, réessayez dans 3 secondes' }));
        }

        console.log(`[JARVIS-WA] Demande de code d'association pour : ${cleanPhone}...`);
        const code = await sock.requestPairingCode(cleanPhone);
        lastPairingCode = code;

        console.log(`\n=================================================`);
        console.log(`🔑 CODE D'ASSOCIATION OFFICIEL : ${code}`);
        console.log(`Pour le numéro : ${cleanPhone}`);
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
      isStarting = false;
      setTimeout(startWhatsAppGateway, 1000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Session réinitialisée proprement.' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // 4. Page Web de gestion
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: #0b1329;
            border: 1px solid #00f0ff50;
            box-shadow: 0 0 35px rgba(0, 240, 255, 0.15);
            border-radius: 16px;
            padding: 28px;
            text-align: center;
            max-width: 520px;
            width: 100%;
          }
          h1 { color: #00f0ff; margin-bottom: 6px; font-size: 1.3rem; letter-spacing: 2px; }
          p.subtitle { color: #94a3b8; font-size: 0.85rem; line-height: 1.4; margin-bottom: 20px; }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 18px;
            border-radius: 9999px;
            font-size: 0.82rem;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .online { background: #064e3b; color: #34d399; border: 1px solid #10b981; }
          .waiting { background: #78350f; color: #fbbf24; border: 1px solid #f59e0b; }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          
          .method-box {
            background: #0f1c3f;
            border: 1px solid #38bdf840;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 18px;
            text-align: left;
          }
          .method-title {
            font-weight: bold;
            color: #38bdf8;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .method-desc {
            font-size: 0.8rem;
            color: #94a3b8;
            margin-top: 4px;
            margin-bottom: 12px;
          }
          .qr-container {
            background: white;
            padding: 12px;
            border-radius: 12px;
            display: inline-block;
            margin: 10px auto;
            text-align: center;
          }
          .qr-img { width: 220px; height: 220px; display: block; margin: 0 auto; }
          
          .steps-list {
            margin: 8px 0;
            padding-left: 20px;
            font-size: 0.82rem;
            color: #cbd5e1;
            line-height: 1.5;
          }
          
          .button-row {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          button {
            cursor: pointer;
            border: none;
            border-radius: 8px;
            padding: 10px 14px;
            font-weight: bold;
            font-size: 0.8rem;
            transition: all 0.2s;
          }
          .btn-primary {
            background: #0284c7;
            color: white;
            flex: 1;
          }
          .btn-primary:hover { background: #00f0ff; color: #000; }
          .btn-secondary {
            background: #1e293b;
            color: #38bdf8;
            border: 1px solid #38bdf850;
          }
          .btn-secondary:hover { background: #38bdf8; color: #000; }
          
          .code-box {
            margin-top: 12px;
            padding: 14px;
            background: #022c22;
            border: 1px solid #10b981;
            border-radius: 8px;
            color: #34d399;
            font-size: 1.4rem;
            font-weight: bold;
            letter-spacing: 4px;
            text-align: center;
          }
          .reset-btn {
            background: transparent;
            border: 1px solid #475569;
            color: #94a3b8;
            font-size: 0.75rem;
            padding: 6px 12px;
            border-radius: 6px;
            margin-top: 12px;
          }
          .reset-btn:hover { border-color: #ef4444; color: #f87171; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚡ JARVIS // PASSERELLE WHATSAPP</h1>
          <p class="subtitle">Connexion directe pour l'envoi de messages autonomes en arrière-plan.</p>

          ${
            isConnected
              ? `
              <div class="status-badge online">
                <span class="dot"></span>
                <span>CONNECTÉ // ${userInfo?.name || 'ROYSTEN'} (${userInfo?.id?.split(':')[0] || 'Actif'})</span>
              </div>
              <p style="color: #34d399; font-size: 0.95rem; line-height: 1.6;">
                ✅ <b>Votre compte WhatsApp est opérationnel avec JARVIS.</b><br>
                Vous pouvez envoyer des messages directement depuis l'interface JARVIS ou dire à JARVIS :<br>
                <i style="color: #38bdf8">« Envoie un message à Juste sur WhatsApp : Salut »</i>
              </p>
              <button class="reset-btn" onclick="resetSession()">Déconnecter cette session</button>
            `
              : `
              <div class="status-badge waiting">
                <span class="dot"></span>
                <span>EN ATTENTE D'ASSOCIATION</span>
              </div>

              <!-- MÉTHODE 1 : SCAN DU QR CODE (100% FIABLE) -->
              <div class="method-box">
                <div class="method-title">
                  📷 MÉTHODE 1 (Recommandée & Infaillible) : Scanner le QR Code
                </div>
                <div class="method-desc">
                  Cette méthode ne dépend pas du format du numéro (8 vs 10 chiffres). Elle se connecte immédiatement.
                </div>
                
                <div style="text-align: center;">
                  ${
                    currentQrDataUrl
                      ? `
                      <div class="qr-container">
                        <img class="qr-img" src="${currentQrDataUrl}" alt="QR Code WhatsApp" />
                      </div>
                    `
                      : `
                      <div style="padding: 30px; color: #fbbf24; font-size: 0.9rem;">
                        ⏳ Génération du QR Code WhatsApp officiel en cours...
                      </div>
                    `
                  }
                </div>

                <ol class="steps-list">
                  <li>Ouvrez <b>WhatsApp</b> sur votre téléphone portable.</li>
                  <li>Allez dans les <b>3 points</b> (en haut à droite) ou <b>Réglages</b>.</li>
                  <li>Touchez <b>Appareils connectés</b> ➔ <b>Connecter un appareil</b>.</li>
                  <li>Pointez la caméra de votre téléphone sur le QR Code ci-dessus !</li>
                </ol>
              </div>

              <!-- MÉTHODE 2 : CODE D'ASSOCIATION -->
              <div class="method-box">
                <div class="method-title">
                  🔢 MÉTHODE 2 : Code d'association par numéro
                </div>
                <div class="method-desc">
                  Si vous préférez taper un code à 8 chiffres dans WhatsApp au lieu de scanner.
                </div>

                <div style="font-size: 0.78rem; color: #cbd5e1; margin-bottom: 8px;">
                  Choisissez le format de votre compte WhatsApp :
                </div>

                <div class="button-row">
                  <button class="btn-secondary" onclick="requestForPhone('2290143405361')">
                    Format 10 chiffres (01 43 40 53 61)
                  </button>
                  <button class="btn-secondary" onclick="requestForPhone('22943405361')">
                    Format 8 chiffres (43 40 53 61)
                  </button>
                </div>

                <div id="codeResult" style="display: none;"></div>
              </div>

              <div>
                <button class="reset-btn" onclick="resetSession()">Réinitialiser complètement la session</button>
              </div>
            `
          }
        </div>

        <script>
          async function requestForPhone(phone) {
            const resDiv = document.getElementById('codeResult');
            resDiv.style.display = 'block';
            resDiv.innerHTML = '<div style="margin-top: 10px; color: #38bdf8;">Génération du code officiel en cours...</div>';

            try {
              const r = await fetch('/pairing-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
              });
              const data = await r.json();
              if (data.success && data.code) {
                resDiv.innerHTML = \`
                  <div class="code-box">\${data.code}</div>
                  <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 8px;">
                    Sur WhatsApp téléphone : <b>Appareils connectés</b> ➔ <b>Connecter un appareil</b> ➔ <b>Associer avec un numéro de téléphone</b> ➔ Tapez <b>\${data.code}</b>
                  </div>
                \`;
              } else {
                resDiv.innerHTML = '<div style="color: #ef4444; margin-top: 8px;">Erreur : ' + (data.error || 'Échec') + '</div>';
              }
            } catch (e) {
              resDiv.innerHTML = '<div style="color: #ef4444; margin-top: 8px;">Erreur : ' + e.message + '</div>';
            }
          }

          async function resetSession() {
            if (!confirm('Voulez-vous réinitialiser la session ?')) return;
            await fetch('/reset', { method: 'POST' });
            location.reload();
          }

          setInterval(async () => {
            try {
              const r = await fetch('/status');
              const d = await r.json();
              if (d.connected) {
                location.reload();
              }
            } catch (e) {}
          }, 3000);
        </script>
      </body>
      </html>
    `);
  }

  // 5. Envoi de message
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

        console.log(`[JARVIS-WA] Envoi autonome vers ${jid}...`);
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
        console.error('[JARVIS-WA] Erreur envoi:', err);
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
