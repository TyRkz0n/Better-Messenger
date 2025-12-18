

// Prevent multiple instances (must be after app is required)
const { app, BrowserWindow, Notification } = require('electron');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
}

let win;
let loginComplete = false;

// Removed duplicate require statement
// const { app, BrowserWindow, Notification } = require('electron');

let lastNotifiedUnread = 0;
let unreadZeroTimer = null;
let unreadZeroSince = null;
let pendingNotifyUnread = 0;

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

/**
 * Show a push notification for new messages
 */
function showNotification(unread) {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: 'Better Messenger',
      body: `You have ${unread} unread message${unread > 1 ? 's' : ''}.`
    });
    notif.on('click', () => {
      if (win) {
        win.show();
        win.focus();
      }
      if (app) {
        app.focus({ steal: true });
      }
    });
    notif.show();
  }
}

const { Tray, Menu } = require('electron');
let tray = null;
let minimizeToTray = process.env.MINIMIZE_TO_TRAY !== 'false';

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: __dirname + '/assets/icon.ico',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false // Allow exposing debug function for devtools
    }
  });

  // Build application menu with minimize to tray toggle
  const appMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Minimize to Tray',
          type: 'checkbox',
          checked: minimizeToTray,
          click: (menuItem) => {
            minimizeToTray = menuItem.checked;
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(appMenu);

  win.loadURL('https://www.facebook.com/messages');

  // Expose debug function for notifications in DevTools
  win.webContents.once('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      window.debugNotification = function() {
        new window.Notification('Debug Notification', { body: 'This is a test notification.' }).show && window.Notification.prototype.show.call(this);
      };
    `);
  });

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

    // Track when unread count stays 0 for more than 3 seconds
    if (unread === 0) {
      if (!unreadZeroSince) {
        unreadZeroSince = Date.now();
      }
      if (unreadZeroTimer) {
        clearTimeout(unreadZeroTimer);
      }
      unreadZeroTimer = setTimeout(() => {
        unreadZeroSince = Date.now();
        unreadZeroTimer = null;
      }, 3000); // 3 seconds
    } else {
      // Only notify if unread > 0 and we were at 0 for at least 3 seconds
      const now = Date.now();
      if (
        unread !== lastNotifiedUnread &&
        unread > 0 &&
        unread > lastUnreadCount &&
        unreadZeroSince &&
        now - unreadZeroSince >= 3000
      ) {
        showNotification(unread);
        lastNotifiedUnread = unread;
      }
      // Reset zero timer if unread > 0
      if (unreadZeroTimer) {
        clearTimeout(unreadZeroTimer);
        unreadZeroTimer = null;
      }
      unreadZeroSince = null;
    }
    // Reset lastNotifiedUnread if unread goes to 0
    if (unread === 0) {
      lastNotifiedUnread = 0;
    }
    lastUnreadCount = unread;
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

  // Minimize to tray on close (if enabled)
  win.on('close', (event) => {
    if (minimizeToTray && !app.isQuiting) {
      event.preventDefault();
      win.hide();
      if (!tray) {
        tray = new Tray(__dirname + '/assets/icon.ico');
        const contextMenu = Menu.buildFromTemplate([
          { label: 'Show Messenger', click: () => { win.show(); } },
          { label: 'Quit', click: () => {
              app.isQuiting = true;
              app.quit();
            }
          }
        ]);
        tray.setToolTip('Better Messenger');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => {
          win.show();
        });
      }
    }
  });
}

if (gotTheLock) {
  app.whenReady().then(() => {
  // Set AppUserModelId for notifications on Windows during development only
  if (process.platform === 'win32' && !app.isPackaged) {
    app.setAppUserModelId('com.tyrkzon.bettermessenger.dev');
  }

  createWindow();

  app.setLoginItemSettings({
    openAtLogin: true
  });
  });
}