const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window-get-always-on-top'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  launchApp: (appName, targetPath) => ipcRenderer.invoke('launch-app', { appName, targetPath }),
  sendSystemNotification: (title, body) => ipcRenderer.send('system-notification', { title, body }),
  onToggleWindow: (callback) => ipcRenderer.on('toggle-window', callback),
});
