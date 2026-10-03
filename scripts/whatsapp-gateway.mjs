import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
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

async function startWhatsAppGateway() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n=================================================`);
  console.log(`⚡ J.A.R.V.I.S // PASSERELLE WHATSAPP AUTONOME v1.0`);
  console.log(`=================================================`);
  console.log(`[JARVIS-WA] Démarrage avec Baileys v${version.join('.')}`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
    browser: ['JARVIS AI', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      try {
        currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
      } catch (e) {}

      console.log('\n[JARVIS-WA] 📱 NOUVEAU QR CODE DISPONIBLE !');
      console.log('Scannez avec WhatsApp (Appareils connectés) sur votre smartphone :\n');
      qrcodeTerminal.generate(qr, { small: true });
      console.log(`\nOu ouvrez votre navigateur sur : http://localhost:${PORT}/qr\n`);
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[JARVIS-WA] Connexion fermée (statut: ${statusCode}). Reconnexion : ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startWhatsAppGateway, 3000);
      } else {
        console.log('[JARVIS-WA] Session déconnectée manuellement. Nouveau scan nécessaire.');
        currentQr = null;
        currentQrDataUrl = null;
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQr = null;
      currentQrDataUrl = null;
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
        qrDataUrl: currentQrDataUrl,
      })
    );
  }

  // 2. Page Web interactive avec le QR Code ou Statut
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
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: #060c1d;
            border: 1px solid #00f0ff50;
            box-shadow: 0 0 25px rgba(0, 240, 255, 0.2);
            border-radius: 16px;
            padding: 28px;
            text-align: center;
            max-width: 440px;
            width: 100%;
          }
          h1 { color: #00f0ff; margin-bottom: 8px; font-size: 1.25rem; letter-spacing: 2px; }
          p { color: #94a3b8; font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px; }
          .qr-box {
            background: white;
            padding: 16px;
            border-radius: 12px;
            display: inline-block;
            margin: 10px 0;
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
          }
          .qr-img { width: 260px; height: 260px; display: block; }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-top: 15px;
          }
          .online { background: #064e3b; color: #34d399; border: 1px solid #10b981; }
          .waiting { background: #78350f; color: #fbbf24; border: 1px solid #f59e0b; }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        </style>
        <script>
          setTimeout(() => {
            fetch('/status').then(r => r.json()).then(data => {
              if (data.connected !== ${isConnected}) {
                location.reload();
              }
            });
          }, 3000);
        </script>
      </head>
      <body>
        <div class="card">
          <h1>J.A.R.V.I.S // WHATSAPP GATEWAY</h1>
          <p>Passerelle autonome et chiffrée pour l'envoi de messages sans fenêtre.</p>

          ${
            isConnected
              ? `
              <div class="status-badge online">
                <span class="dot"></span>
                <span>CONNECTÉ // ${userInfo?.name || 'ROYSTEN'} (${userInfo?.id?.split(':')[0] || 'Actif'})</span>
              </div>
              <p style="margin-top: 20px; color: #34d399;">
                ✅ Votre compte WhatsApp est synchronisé avec JARVIS.<br>
                Tous les ordres d'envoi s'exécutent instantanément en arrière-plan.
              </p>
            `
              : currentQrDataUrl
              ? `
              <div class="status-badge waiting">
                <span class="dot"></span>
                <span>ATTENTE DU SCAN DU SMARTPHONE</span>
              </div>
              <div class="qr-box">
                <img class="qr-img" src="${currentQrDataUrl}" alt="QR Code WhatsApp" />
              </div>
              <p>Ouvrez WhatsApp sur votre téléphone ➔ <b>Appareils connectés</b> ➔ <b>Connecter un appareil</b> ➔ Scannez ce QR Code.</p>
            `
              : `
              <div class="status-badge waiting">
                <span class="dot"></span>
                <span>INITIALISATION DE BAILEYS...</span>
              </div>
              <p>Génération du QR Code en cours, veuillez patienter quelques secondes...</p>
              <script>setTimeout(() => location.reload(), 2000);</script>
            `
          }
        </div>
      </body>
      </html>
    `);
  }

  // 3. Envoi de message via POST /send
  if (req.method === 'POST' && req.url === '/send') {
    if (!isConnected || !sock) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: false,
          error: "La passerelle WhatsApp n'est pas encore connectée. Veuillez scanner le QR code.",
        })
      );
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { phone, message } = payload;

        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Champs phone et message requis' }));
        }

        // Nettoyer le numéro
        let cleanPhone = String(phone).replace(/[^0-9]/g, '');

        // Si format Bénin local sans indicatif (8 chiffres ex: 97000000 ou 10 chiffres sans 229)
        if (cleanPhone.length === 8) {
          cleanPhone = '229' + cleanPhone;
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('01')) {
          cleanPhone = '229' + cleanPhone;
        }

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
  console.log(`[JARVIS-WA] Visualisez le QR code sur : http://localhost:${PORT}/qr`);
  startWhatsAppGateway();
});
