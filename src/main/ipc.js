'use strict';

/* ============================================================
   Proton — IPC handlers (the secure data API for the renderer)
   Everything the UI does goes through window.proton.* which
   invokes these handlers. better-sqlite3 is synchronous, so the
   handlers return immediately.
   ============================================================ */

const { ipcMain, dialog, shell, app } = require('electron');
const fs = require('fs');
const db = require('./db');
const files = require('./files');
const backup = require('./backup');

function register(getWindow) {
  const ok = (data) => ({ ok: true, data });
  const fail = (e) => ({ ok: false, error: String(e && e.message ? e.message : e) });
  const h = (channel, fn) =>
    ipcMain.handle(channel, (_evt, ...args) => {
      try { return ok(fn(...args)); }
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

  /* ---------- sections ---------- */
  h('section:create', (courseId, data) => db.createSection(courseId, data));
  h('section:update', (id, data) => db.updateSection(id, data));
  h('section:delete', (id) => db.deleteSection(id));

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
    const abs = filePathOrUrl.startsWith('protonfile://')
      ? files.resolveUrl(filePathOrUrl.replace('protonfile://', ''))
      : filePathOrUrl;
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

  h('backup:list', () => backup.list());
  h('backup:openFolder', () => { shell.openPath(backup.dir()); return true; });
  h('app:openDataFolder', () => { shell.openPath(app.getPath('userData')); return true; });
}

module.exports = { register };
