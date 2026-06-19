'use strict';

/* ============================================================
   Proton — File storage layer
   Stores note images & attachments locally under
   %APPDATA%/Proton/notes/<noteId>/ . Returns app:// URLs the
   renderer can display offline.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let NOTES_DIR = null;

function init(notesDir) {
  NOTES_DIR = notesDir;
  ensureDir(NOTES_DIR);
}

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch (_) {}
}

const EXT_BY_MIME = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg',
  'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
};

function parseDataUrl(dataUrl) {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isB64 = !!m[2];
  const buf = isB64 ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
  return { mime, buf };
}

function safeName(name) {
  return (name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
}

/* Save an image (data URL from paste/drag) → returns { filePath } absolute */
function saveImage(noteId, dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Bad image data');
  const dir = path.join(NOTES_DIR, noteId);
  ensureDir(dir);
  const ext = EXT_BY_MIME[parsed.mime] || '.png';
  const fname = 'img-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex') + ext;
  const filePath = path.join(dir, fname);
  fs.writeFileSync(filePath, parsed.buf);
  return { filePath };
}

/* Save an arbitrary attachment from a data URL */
function saveAttachment(noteId, name, dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Bad attachment data');
  const dir = path.join(NOTES_DIR, noteId);
  ensureDir(dir);
  const clean = safeName(name);
  const fname = Date.now().toString(36) + '-' + clean;
  const filePath = path.join(dir, fname);
  fs.writeFileSync(filePath, parsed.buf);
  return { filePath, name: clean, size: parsed.buf.length };
}

/* Convert an absolute stored path to an app:// URL for the renderer */
function toUrl(absPath) {
  if (!absPath) return '';
  const rel = path.relative(NOTES_DIR, absPath).split(path.sep).join('/');
  return 'protonfile://notes/' + rel;
}

/* Resolve an app:// notes URL back to an absolute path (for the protocol handler) */
function resolveUrl(urlPath) {
  // urlPath like "notes/<id>/img-xxx.png"
  const clean = urlPath.replace(/^\/+/, '').replace(/^notes\//, '');
  const abs = path.normalize(path.join(NOTES_DIR, clean));
  if (!abs.startsWith(NOTES_DIR)) return null; // path traversal guard
  return abs;
}

function deleteFile(absPath) {
  try { if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (_) {}
}

function dir() { return NOTES_DIR; }

module.exports = { init, saveImage, saveAttachment, toUrl, resolveUrl, deleteFile, dir };
