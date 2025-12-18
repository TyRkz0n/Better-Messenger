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

    if (!u.hostname.endsWith('facebook.com')) {
      return false;
    }

    if (!loginComplete) {
      return ALLOWED_PATH_PREFIXES.some(p =>
        u.pathname.startsWith(p)
      );
    }

    return u.pathname.startsWith('/messages');
  } catch {
    return false;
  }
}

/**
 * Extract unread count from Facebook page title
 * Example: "(3) Messenger"
 */
function extractUnreadCount(title) {
  const match = title.match(/^\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
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
   * Detect successful login
   */
  win.webContents.on('did-navigate', (_, url) => {
    if (url.includes('/messages')) {
      loginComplete = true;
    }
  });

  /**
   * Unread badge handling (Windows taskbar)
   */
  win.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();

    const unread = extractUnreadCount(title);

    // Windows 10/11 supports numeric taskbar badges
    app.setBadgeCount(unread);
  });

  /**
   * Navigation lockdown
   */
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedUrl(url)) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.setLoginItemSettings({
    openAtLogin: true
  });
});
