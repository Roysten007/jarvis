export interface ElectronAPI {
  isElectron: boolean;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  launchApp: (appName: string, targetPath?: string) => Promise<{ success: boolean; message: string }>;
  sendSystemNotification: (title: string, body: string) => void;
  onToggleWindow: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
