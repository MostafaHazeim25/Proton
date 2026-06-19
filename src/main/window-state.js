'use strict';

/* ============================================================
   Proton — Window state persistence
   Remembers window size, position and maximized state in
   settings.json and restores them on startup.
   ============================================================ */

const fs = require('fs');

let FILE = null;
const DEFAULTS = { width: 1280, height: 820, x: undefined, y: undefined, maximized: false };

function init(settingsFile) {
  FILE = settingsFile;
}

function read() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const obj = JSON.parse(raw);
    return { ...DEFAULTS, ...(obj.window || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function readAll() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

function save(win) {
  try {
    const all = readAll();
    const maximized = win.isMaximized();
    const b = win.getNormalBounds ? win.getNormalBounds() : win.getBounds();
    all.window = { width: b.width, height: b.height, x: b.x, y: b.y, maximized };
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2), 'utf8');
  } catch (e) {
    console.error('[window-state] save failed', e);
  }
}

/* attach listeners that persist on resize/move/close */
function manage(win) {
  let t = null;
  const debounced = () => { clearTimeout(t); t = setTimeout(() => save(win), 400); };
  win.on('resize', debounced);
  win.on('move', debounced);
  win.on('close', () => save(win));
}

module.exports = { init, read, save, manage };
