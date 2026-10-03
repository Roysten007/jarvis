const { app, BrowserWindow, ipcMain, shell, Tray, Menu, globalShortcut, Notification } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

process.on('uncaughtException', (err) => {
  console.error('[ELECTRON CRITICAL ERROR]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ELECTRON UNHANDLED REJECTION]', reason);
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

const PORT = 3000;
const DEV_URL = `http://localhost:${PORT}`;

// Assurer une seule instance de JARVIS
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[ELECTRON] Une autre instance tourne déjà. Quitter.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Vérifier si le serveur Next.js tourne déjà
function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(DEV_URL, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1500, () => {
      req.abort();
      resolve(false);
    });
  });
}

// Attendre que le serveur Next.js soit prêt
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const isRunning = await checkServerRunning();
    if (isRunning) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function createWindow() {
  console.log('[ELECTRON] Création de la fenêtre principale Desktop...');
  
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    frame: true, // Contrôles Windows natifs (Minimiser, Agrandir, Fermer)
    icon: iconPath,
    backgroundColor: '#030712',
    title: 'JARVIS - Assistant Personnel de Roysten',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permet les chargements multimédias locaux et appels API fluides
    },
    show: true, // Afficher immédiatement
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[ELECTRON] Interface Next.js chargée avec succès.');
    mainWindow.setTitle('JARVIS - Assistant Personnel de Roysten');
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error(`[ELECTRON] Échec du chargement de l'URL (${code}): ${desc}`);
  });

  console.log('[ELECTRON] Chargement de:', DEV_URL);
  mainWindow.loadURL(DEV_URL);

  mainWindow.focus();

  // Au clic sur la croix : masquer dans la barre des tâches au lieu de quitter
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      try {
        if (Notification.isSupported()) {
          new Notification({
            title: 'JARVIS en veille',
            body: 'JARVIS reste actif. Appuyez sur Ctrl+Shift+J ou cliquez sur l\'icône pour le rouvrir.',
          }).show();
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.warn('[ELECTRON] Tray icon error, fallback:', e.message);
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Afficher JARVIS (Ctrl+Shift+J)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Toujours au premier plan',
      type: 'checkbox',
      checked: false,
      click: (item) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(item.checked);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Ouvrir VS Code',
      click: () => {
        spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process code .'], { detached: true, stdio: 'ignore' }).unref();
      },
    },
    {
      label: 'Lancer Spotify',
      click: () => {
        spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process explorer.exe spotify:'], { detached: true, stdio: 'ignore' }).unref();
      },
    },
    { type: 'separator' },
    {
      label: 'Quitter définitivement',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('JARVIS - Assistant de Roysten');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function setupIpc() {
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.handle('window-toggle-always-on-top', () => {
    if (!mainWindow) return false;
    const current = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!current);
    return !current;
  });

  ipcMain.handle('window-get-always-on-top', () => {
    return mainWindow ? mainWindow.isAlwaysOnTop() : false;
  });

  ipcMain.handle('open-external', async (_, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'URL non sécurisée' };
  });

  ipcMain.handle('launch-app', async (_, { appName, targetPath }) => {
    if (mainWindow && !mainWindow.isAlwaysOnTop()) {
      mainWindow.minimize();
    }
    return new Promise((resolve) => {
      const psCommand = targetPath ? `Start-Process "${targetPath}"` : `Start-Process "${appName}"`;
      const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCommand], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      resolve({ success: true, message: `Application ${appName} lancée avec succès.` });
    });
  });

  ipcMain.on('system-notification', (_, { title, body }) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    } catch (e) {
      console.error('Notification error:', e);
    }
  });
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.jarvis.roysten');
  }

  setupIpc();

  // Raccourci global : Ctrl + Shift + J pour invoquer/masquer JARVIS n'importe où
  try {
    const registered = globalShortcut.register('CommandOrControl+Shift+J', () => {
      if (mainWindow) {
        if (mainWindow.isVisible() && mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    console.log('[ELECTRON] Raccourci Ctrl+Shift+J enregistré:', registered);
  } catch (err) {
    console.warn('[ELECTRON] Impossible d\'enregistrer le raccourci global:', err.message);
  }

  const ready = await waitForServer(15);
  if (!ready) {
    console.log('[ELECTRON] Serveur Next.js non détecté, démarrage automatique...');
    const nextProc = spawn('node', ['./node_modules/next/dist/bin/next', 'dev', '--port', '3000'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'ignore',
      detached: true,
    });
    nextProc.unref();
    await waitForServer(30);
  }

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
