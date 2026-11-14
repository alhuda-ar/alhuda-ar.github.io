// الهدى — تطبيق الويندوز (Electron)
// بيفتح موقع الهدى الحي، فأي تحديث على الموقع بيوصل للتطبيق تلقائياً.
const { app, BrowserWindow, Tray, Menu, shell, ipcMain, nativeImage, session } = require('electron');
const path = require('path');

const SITE = 'https://alhuda-ar.github.io';
const SITE_HOST = new URL(SITE).host;
const BG = '#12281f';
const MIN_SPLASH_MS = 2600;

let win = null, splash = null, tray = null, quitting = false;

app.setAppUserModelId('com.alhuda.desktop');          // لازم عشان إشعارات ويندوز
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => showMain());
  app.whenReady().then(start);
}

function asset(...p) { return path.join(__dirname, 'assets', ...p); }

function start() {
  Menu.setApplicationMenu(null);
  createSplash();
  createMain();
  createTray();

  // السماح بالإشعارات فقط لموقع الهدى
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    let ok = false;
    try { ok = new URL(wc.getURL()).host === SITE_HOST && ['notifications', 'fullscreen', 'media'].includes(permission); } catch (e) {}
    cb(ok);
  });
}

function createSplash() {
  splash = new BrowserWindow({
    width: 460, height: 320, frame: false, resizable: false, movable: true, show: false,
    transparent: false, backgroundColor: BG, alwaysOnTop: true, skipTaskbar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.once('ready-to-show', () => splash && splash.show());
}

function createMain() {
  const t0 = Date.now();
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600, show: false,
    backgroundColor: BG, autoHideMenuBar: true, title: 'الهدى',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,                    // عشان الإشعارات توصل والتطبيق مصغّر
      spellcheck: false,
    },
  });
  win.webContents.setUserAgent(win.webContents.getUserAgent() + ' AlHudaApp AlHudaDesktop');

  let first = true;
  win.webContents.on('did-finish-load', () => {
    if (!first) return; first = false;
    const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - t0));
    setTimeout(() => {
      if (splash) { splash.destroy(); splash = null; }
      win.maximize(); win.show(); win.focus();
    }, wait);
  });

  // مفيش نت: صفحة "النت قاطع" المحلية مع إعادة محاولة تلقائية
  win.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;          // -3 = إلغاء عادي
    win.loadFile(path.join(__dirname, 'offline.html'), { query: { to: SITE } });
  });

  // الروابط الخارجية تتفتح في المتصفح، مش جوه التطبيق
  const isInternal = (u) => { try { return new URL(u).host === SITE_HOST; } catch (e) { return false; } };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) return { action: 'allow' };
    safeExternal(url); return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file://') || isInternal(url)) return;
    e.preventDefault(); safeExternal(url);
  });

  // الإغلاق بيصغّر للـ Tray عشان الإشعارات تفضل توصل
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });

  win.loadURL(SITE);
}

function createTray() {
  const img = nativeImage.createFromPath(asset('tray.png')).resize({ width: 20, height: 20 });
  tray = new Tray(img);
  tray.setToolTip('الهدى');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'فتح الهدى', click: showMain },
    { type: 'separator' },
    { label: 'إغلاق التطبيق', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', showMain);
}

function showMain() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

function safeExternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:' || u.protocol === 'tel:') shell.openExternal(u.toString());
  } catch (e) {}
}

ipcMain.handle('alhuda:open-external', (e, url) => { safeExternal(url); });
ipcMain.handle('alhuda:focus', () => { showMain(); });

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { /* الأبلكيشن بيفضل شغال في الـ Tray */ });
