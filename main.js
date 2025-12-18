const { app, BrowserWindow } = require('electron');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: __dirname + '/assets/icon.ico',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.loadURL('https://www.facebook.com/messages');

  // Prevent navigation outside /messages
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('/messages')) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('/messages')) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Auto-start on login
  app.setLoginItemSettings({
    openAtLogin: true
  });
});
