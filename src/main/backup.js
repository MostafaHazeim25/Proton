'use strict';

/* ============================================================
   Proton — Backup system
   - Manual export / import (backup.json)
   - Automatic daily backup into %APPDATA%/Proton/backups/
   - Keeps the latest 30 backups
   ============================================================ */

const fs = require('fs');
const path = require('path');

let BACKUP_DIR = null;
let dbModule = null;

function init(backupDir, db) {
  BACKUP_DIR = backupDir;
  dbModule = db;
  try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch (_) {}
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/* Write a backup file; returns its path */
function writeBackup(prefix) {
  const data = dbModule.exportAll();
  const file = path.join(BACKUP_DIR, `${prefix || 'backup'}-${stamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

/* Manual export to a user-chosen path */
function exportTo(targetPath) {
  const data = dbModule.exportAll();
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
  return targetPath;
}

/* Import from a chosen file (Proton or legacy PathBoard web JSON) */
function importFrom(sourcePath) {
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const data = JSON.parse(raw);
  // safety: snapshot current state before overwriting
  try { writeBackup('pre-import'); } catch (_) {}
  dbModule.importAll(data);
  return true;
}

/* Run at most once per calendar day */
function runDaily() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const last = dbModule.getSetting('last_daily_backup');
    if (last === today) return null;
    const file = writeBackup('daily');
    dbModule.setSetting('last_daily_backup', today);
    prune(30);
    return file;
  } catch (e) {
    console.error('[backup] daily failed', e);
    return null;
  }
}

/* Keep only the newest `keep` backups */
function prune(keep) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    files.slice(keep).forEach((x) => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, x.f)); } catch (_) {}
    });
  } catch (_) {}
}

function list() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, path: path.join(BACKUP_DIR, f), size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
}

function dir() { return BACKUP_DIR; }

module.exports = { init, writeBackup, exportTo, importFrom, runDaily, prune, list, dir };
