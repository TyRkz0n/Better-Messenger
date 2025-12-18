const { app, BrowserWindow } = require('electron');

let win;
let loginComplete = false;

/**
 * Facebook paths required for login / security flows
 */
const ALLOWED_PATH_PREFIXES = [
  '/messages',
  '/login',
  '/login.php',
  '/checkpoint',
  '/security',
  '/cookie',
  '/consent',
  '/privacy',
  '/recover',
  '/ajax'
];

function isAllowedUrl(url) {
  try {
    const u = new URL(url);

    // Only allow Facebook domains
    if (!u.hostname.endsWith('facebook.com')) {
      return false;
    }

    // Before login: allow login/security paths
    if (!loginComplete) {
      return ALLOWED_PATH_PREFIXES.some(p =>
        u.pathname.startsWith(p)
      );
    }

    // After login: strictly allow messages only
    return u.pathname.startsWith('/messages');
  } catch {
    return false;
  }
}

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

  /**
   * Detect successful login when Messages loads
   */
  win.webContents.on('did-navigate', (_, url) => {
    if (url.includes('/messages')) {
      loginComplete = true;
    }
  });

  /**
   * Block navigation attempts
   */
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
    }
  });

  /**
   * Block popup / new window navigation
   */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedUrl(url)) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Auto-start on Windows login
  app.setLoginItemSettings({
    openAtLogin: true
  });
});
