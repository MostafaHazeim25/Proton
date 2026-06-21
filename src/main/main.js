'use strict';

/* ============================================================
   Proton — Electron main process
   - Creates %APPDATA%/Proton/ (db, settings.json, backups/, notes/)
   - Opens the SQLite database safely (crash recovery built in)
   - Registers a secure protocol for local note images/files
   - Restores window size/position, runs the daily backup
   ============================================================ */

const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const db = require('./db');
const files = require('./files');
const backup = require('./backup');
const windowState = require('./window-state');
const ipc = require('./ipc');

// %APPDATA%/Proton  (Electron resolves userData to this when productName = Proton)
const USER_DIR = app.getPath('userData');
const DB_FILE = path.join(USER_DIR, 'pathboard.db');
const SETTINGS_FILE = path.join(USER_DIR, 'settings.json');
const BACKUP_DIR = path.join(USER_DIR, 'backups');
const NOTES_DIR = path.join(USER_DIR, 'notes');

let mainWindow = null;
const getWindow = () => mainWindow;

// single-instance lock so two copies don't fight over one database
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // allow our custom protocol to load like a normal local resource
  protocol.registerSchemesAsPrivileged([
    { scheme: 'protonfile', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false } },
  ]);

  // make notifications & taskbar show "Proton" instead of "electron.app.Proton"
  app.setName('Proton');
  if (process.platform === 'win32') app.setAppUserModelId('com.mostafahazem.proton');

  app.whenReady().then(init);
}

function ensureDirs() {
  [USER_DIR, BACKUP_DIR, NOTES_DIR].forEach((d) => {
    try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
  });
}

function init() {
  ensureDirs();

  // local file protocol for note images / attachments
  protocol.handle('protonfile', (request) => {
    try {
      const url = new URL(request.url); // protonfile://notes/<id>/file
      const rel = url.host + url.pathname; // host="notes"
      const abs = files.resolveUrl(rel);
      if (!abs || !fs.existsSync(abs)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(abs).toString());
    } catch (e) {
      return new Response('Error', { status: 500 });
    }
  });

  // storage layers
  windowState.init(SETTINGS_FILE);
  files.init(NOTES_DIR);

  // database (with crash/corruption recovery)
  try {
    db.open(DB_FILE);
  } catch (e) {
    console.error('[main] failed to open database', e);
    // last-ditch: move file aside and retry once
    try { if (fs.existsSync(DB_FILE)) fs.renameSync(DB_FILE, DB_FILE + '.fatal-' + Date.now()); } catch (_) {}
    db.open(DB_FILE);
  }

  backup.init(BACKUP_DIR, db);
  backup.runDaily(); // at most once per day

  ipc.register(getWindow);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

function createWindow() {
  const ws = windowState.read();
  mainWindow = new BrowserWindow({
    width: ws.width, height: ws.height, x: ws.x, y: ws.y,
    minWidth: 480, minHeight: 560,
    backgroundColor: '#0A1320',
    show: false,
    title: 'Proton',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0A1320', symbolColor: '#E6EDF5', height: 62 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  if (ws.maximized) mainWindow.maximize();
  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // ---- security: lock down navigation & new windows ----
  // Block the app window from ever navigating away from the local app.
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https:\/\//.test(url)) shell.openExternal(url); // open real links in the user's browser
    }
  });
  // Never open child windows in-app; send http(s) to the external browser, deny the rest.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // Block any attempt to attach a <webview>.
  mainWindow.webContents.on('will-attach-webview', (e) => e.preventDefault());

  mainWindow.once('ready-to-show', () => mainWindow.show());
  windowState.manage(mainWindow);

  mainWindow.on('closed', () => { mainWindow = null; });
}

// flush WAL + close DB cleanly so nothing is lost on quit
app.on('before-quit', () => { try { db.checkpoint(); } catch (_) {} });
app.on('window-all-closed', () => {
  try { db.close(); } catch (_) {}
  if (process.platform !== 'darwin') app.quit();
});
