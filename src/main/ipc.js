'use strict';

/* ============================================================
   Proton — IPC handlers (the secure data API for the renderer)
   Everything the UI does goes through window.proton.* which
   invokes these handlers. better-sqlite3 is synchronous, so the
   handlers return immediately.
   ============================================================ */

const { ipcMain, dialog, shell, app, Notification } = require('electron');
const fs = require('fs');
const db = require('./db');
const files = require('./files');
const backup = require('./backup');

function register(getWindow) {
  const ok = (data) => ({ ok: true, data });
  const fail = (e) => ({ ok: false, error: String(e && e.message ? e.message : e) });
  const h = (channel, fn) =>
    ipcMain.handle(channel, async (_evt, ...args) => {
      try { return ok(await fn(...args)); }
      catch (e) { console.error('[ipc] ' + channel, e); return fail(e); }
    });

  /* ---------- state ---------- */
  h('state:get', () => db.getState());
  h('stats:get', () => db.getStats());
  h('integrity:check', () => db.integrityCheck());

  /* ---------- paths ---------- */
  h('path:create', (data) => db.createPath(data));
  h('path:update', (id, data) => db.updatePath(id, data));
  h('path:delete', (id) => db.deletePath(id));

  /* ---------- courses ---------- */
  h('course:create', (pathId, data) => db.createCourse(pathId, data));
  h('course:update', (id, data) => db.updateCourse(id, data));
  h('course:delete', (id) => db.deleteCourse(id));
  h('course:setStatus', (id, status) => db.setCourseStatus(id, status));
  h('course:reorder', (pathId, ids) => db.reorderCourses(pathId, ids));

  /* ---------- sections ---------- */
  h('section:create', (courseId, data) => db.createSection(courseId, data));
  h('section:update', (id, data) => db.updateSection(id, data));
  h('section:delete', (id) => db.deleteSection(id));
  h('section:reorder', (courseId, ids) => db.reorderSections(courseId, ids));
  h('task:reorder', (sectionId, ids) => db.reorderTasks(sectionId, ids));
  h('task:bulkCreate', (sectionId, texts) => db.bulkCreateTasks(sectionId, texts));
  h('focus:log', (taskId, minutes) => { db.logFocus(taskId, minutes); return true; });
  h('achievements:get', (start, end) => db.getAchievements(start, end));
  ipcMain.handle('app:captureRegion', async (_evt, x, y, w, hgt) => {
    try {
      const win = getWindow();
      const img = await win.webContents.capturePage({ x: Math.max(0, x | 0), y: Math.max(0, y | 0), width: w | 0, height: hgt | 0 });
      const res = await dialog.showSaveDialog(win, {
        title: 'Save achievements image', defaultPath: 'proton-achievements.png',
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });
      if (res.canceled || !res.filePath) return ok(null);
      fs.writeFileSync(res.filePath, img.toPNG());
      return ok(res.filePath);
    } catch (e) { return fail(e); }
  });
  h('notify:show', (title, body) => {
    try {
      if (Notification.isSupported()) {
        const n = new Notification({ title: String(title || 'Proton'), body: String(body || ''), silent: false });
        n.on('click', () => { const w = getWindow(); if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } });
        n.show();
      }
    } catch (_) {}
    return true;
  });
  h('app:reset', () => db.resetAll());

  /* ---------- tasks ---------- */
  h('task:create', (sectionId, data) => db.createTask(sectionId, data));
  h('task:update', (id, data) => db.updateTask(id, data));
  h('task:delete', (id) => db.deleteTask(id));

  /* ---------- notes ---------- */
  h('note:list', (sectionId) => db.listNotes(sectionId));
  h('note:get', (id) => {
    const n = db.getNote(id);
    if (!n) return null;
    // attach displayable URLs
    n.images = (n.images || []).map((im) => ({ ...im, url: files.toUrl(im.file_path) }));
    n.attachments = (n.attachments || []).map((a) => ({ ...a, url: files.toUrl(a.file_path) }));
    return n;
  });
  h('note:create', (courseId, sectionId, data) => db.createNote(courseId, sectionId, data));
  h('note:update', (id, data) => db.updateNote(id, data));
  h('note:delete', (id) => db.deleteNote(id));
  h('note:move', (id, courseId, sectionId) => db.moveNote(id, courseId, sectionId));

  /* ---------- note files ---------- */
  h('note:saveImage', (noteId, dataUrl) => {
    const { filePath } = files.saveImage(noteId, dataUrl);
    const id = db.addNoteImage(noteId, filePath);
    return { id, url: files.toUrl(filePath) };
  });
  h('note:saveAttachment', (noteId, name, dataUrl) => {
    const { filePath, name: clean, size } = files.saveAttachment(noteId, name, dataUrl);
    const id = db.addNoteAttachment(noteId, filePath, clean, size);
    return { id, name: clean, size, url: files.toUrl(filePath) };
  });
  h('note:openAttachment', (filePathOrUrl) => {
    // Only ever open files inside our notes folder — prevents a crafted/imported
    // attachment record from pointing shell.openPath at an arbitrary file.
    const s = String(filePathOrUrl || '');
    const rel = s.startsWith('protonfile://') ? s.replace('protonfile://', '') : null;
    const abs = rel ? files.resolveUrl(rel) : null;   // resolveUrl confines to NOTES_DIR
    if (abs && fs.existsSync(abs)) shell.openPath(abs);
    return true;
  });

  /* ---------- search ---------- */
  h('search:run', (query) => db.search(query));

  /* ---------- streak / settings ---------- */
  h('activity:log', () => { db.logActivity(); return true; });
  h('setting:get', (key) => db.getSetting(key));
  h('setting:set', (key, value) => { db.setSetting(key, value); return true; });

  /* ---------- backups (async dialogs) ---------- */
  ipcMain.handle('backup:export', async () => {
    try {
      const win = getWindow();
      const def = 'proton-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      const res = await dialog.showSaveDialog(win, {
        title: 'Export Backup', defaultPath: def,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (res.canceled || !res.filePath) return ok(null);
      backup.exportTo(res.filePath);
      return ok(res.filePath);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const win = getWindow();
      const res = await dialog.showOpenDialog(win, {
        title: 'Import Backup', properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (res.canceled || !res.filePaths[0]) return ok(null);
      backup.importFrom(res.filePaths[0]);
      return ok(db.getState());
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('path:export', async (_evt, pathId) => {
    try {
      const win = getWindow();
      const data = db.exportPath(pathId);
      const safe = (data.path.title || 'path').replace(/[^\w\- ]+/g, '').trim().slice(0, 40) || 'path';
      const res = await dialog.showSaveDialog(win, {
        title: 'Export Path', defaultPath: 'proton-path-' + safe + '.json',
        filters: [{ name: 'Proton Path', extensions: ['json'] }],
      });
      if (res.canceled || !res.filePath) return ok(null);
      fs.writeFileSync(res.filePath, JSON.stringify(data, null, 2), 'utf8');
      return ok(res.filePath);
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('path:import', async () => {
    try {
      const win = getWindow();
      const res = await dialog.showOpenDialog(win, {
        title: 'Import Path', properties: ['openFile'],
        filters: [{ name: 'Proton Path', extensions: ['json'] }],
      });
      if (res.canceled || !res.filePaths[0]) return ok(null);
      const raw = fs.readFileSync(res.filePaths[0], 'utf8');
      const data = JSON.parse(raw);
      const newId = db.importPath(data);
      return ok({ pathId: newId, state: db.getState() });
    } catch (e) { return fail(e); }
  });

  h('backup:list', () => backup.list());
  h('backup:openFolder', () => { shell.openPath(backup.dir()); return true; });
  h('app:openDataFolder', () => { shell.openPath(app.getPath('userData')); return true; });
  h('app:openExternal', (url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return true; });
  h('updates:check', () => checkForUpdates());
}

/* ============================================================
   Update check — asks GitHub for the latest published release and
   compares it to the running version. Fully optional: it only runs
   when the user (or the app on launch) asks, fails silently with no
   internet, and never sends any user data — just a read request.
   ============================================================ */
const https = require('https');
const UPDATE_REPO = 'MostafaHazeim25/Proton';

function cmpVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) > (pb[i] || 0)) return 1; if ((pa[i] || 0) < (pb[i] || 0)) return -1; }
  return 0;
}

function checkForUpdates() {
  return new Promise((resolve) => {
    const current = app.getVersion();
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${UPDATE_REPO}/releases/latest`,
      headers: { 'User-Agent': 'Proton-App', Accept: 'application/vnd.github+json' },
      timeout: 6000,
    };
    const req = https.get(opts, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const latest = json.tag_name || json.name;
          if (!latest) return resolve({ ok: true, updateAvailable: false, current });
          const newer = cmpVersions(latest, current) > 0;
          resolve({
            ok: true, current,
            updateAvailable: newer,
            latestVersion: String(latest).replace(/^v/, ''),
            url: json.html_url || `https://github.com/${UPDATE_REPO}/releases/latest`,
          });
        } catch (e) { resolve({ ok: false, updateAvailable: false, current, error: 'parse' }); }
      });
    });
    req.on('error', () => resolve({ ok: false, updateAvailable: false, current, error: 'offline' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, updateAvailable: false, current, error: 'timeout' }); });
  });
}

module.exports = { register };
