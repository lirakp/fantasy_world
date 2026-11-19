// Desktop-Hülle (Electron): startet das Spiel in einem eigenen Fenster ohne Browser
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#0b0807',
    title: 'Codex des Blutmondes',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // F11 = Vollbild umschalten
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  // Externe Links im normalen Browser öffnen, nie im Spielfenster
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
}

// Nur eine Instanz des Spiels gleichzeitig
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
