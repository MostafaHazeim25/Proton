'use strict';

/* ============================================================
   Proton — Data Layer (SQLite via better-sqlite3)
   - Creates pathboard.db on first launch
   - Schema: learning_paths, courses, sections, tasks, notes,
     note_images, note_attachments, streaks, statistics, settings
   - Safe transactions, integrity checks, FTS search, migrations
   ============================================================ */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;
let DB_PATH = null;

const nowISO = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- schema ---------- */
const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#F3AC40',
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'todo',
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  legacy_notes TEXT DEFAULT '',
  collapsed INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  text TEXT DEFAULT '',
  done INTEGER DEFAULT 0,
  today INTEGER DEFAULT 0,
  done_at INTEGER,
  due_at INTEGER,
  remind_before INTEGER DEFAULT 0,
  reminded INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  course_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_images (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  name TEXT DEFAULT '',
  size INTEGER DEFAULT 0,
  created_at TEXT,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS streaks (
  day TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS statistics (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  minutes INTEGER DEFAULT 0,
  day TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_courses_path ON courses(path_id);
CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_tasks_section ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_notes_section ON notes(section_id);
CREATE INDEX IF NOT EXISTS idx_notes_course ON notes(course_id);
CREATE INDEX IF NOT EXISTS idx_nimg_note ON note_images(note_id);
CREATE INDEX IF NOT EXISTS idx_natt_note ON note_attachments(note_id);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  note_id UNINDEXED, title, body
);
`;

/* ============================================================
   Open / init
   ============================================================ */
function open(dbPath) {
  DB_PATH = dbPath;
  let needsRecovery = false;

  // 1) open (create file if missing)
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // crash-safe + fast
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // 2) integrity check — detect a corrupted database
  try {
    const r = db.pragma('integrity_check', { simple: true });
    if (r !== 'ok') needsRecovery = true;
  } catch (e) {
    needsRecovery = true;
  }

  if (needsRecovery) {
    db = recoverCorrupt(dbPath, db);
  }

  // 3) build schema (idempotent)
  db.exec(SCHEMA);
  runMigrations();

  // 4) first launch: start empty so each user builds their own universe
  //    (the welcome screen in the UI guides them to create their first path)
  setMeta('schema_version', String(SCHEMA_VERSION));
  return db;
}

/* Move aside a corrupt DB and start a fresh one so the app never
   refuses to launch because of a damaged file. */
function recoverCorrupt(dbPath, badDb) {
  try { badDb.close(); } catch (_) {}
  try {
    if (fs.existsSync(dbPath)) {
      const broken = dbPath + '.corrupt-' + Date.now() + '.bak';
      fs.renameSync(dbPath, broken);
      console.warn('[db] corrupt database moved to', broken);
    }
  } catch (e) {
    console.error('[db] could not move corrupt file', e);
  }
  const fresh = new Database(dbPath);
  fresh.pragma('journal_mode = WAL');
  fresh.pragma('foreign_keys = ON');
  return fresh;
}

const SCHEMA_VERSION = 2;
function runMigrations() {
  const v = parseInt(getMeta('schema_version') || '0', 10);
  if (v < 1) {
    // baseline
  }
  if (v < 2) {
    // add deadline/reminder columns to existing tasks tables
    const cols = db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name);
    if (!cols.includes('due_at')) db.exec('ALTER TABLE tasks ADD COLUMN due_at INTEGER');
    if (!cols.includes('remind_before')) db.exec('ALTER TABLE tasks ADD COLUMN remind_before INTEGER DEFAULT 0');
    if (!cols.includes('reminded')) db.exec('ALTER TABLE tasks ADD COLUMN reminded INTEGER DEFAULT 0');
    // focus sessions (Pomodoro / timer) for the achievements dashboard
    db.exec(`CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY, task_id TEXT, minutes INTEGER DEFAULT 0,
      day TEXT, created_at TEXT
    )`);
  }
}

/* ---------- meta helpers ---------- */
function getMeta(key) {
  const r = db.prepare('SELECT value FROM meta WHERE key=?').get(key);
  return r ? r.value : null;
}
function setMeta(key, value) {
  db.prepare(
    'INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
  ).run(key, value);
}

/* ============================================================
   Seed (first run example — Network Security path)
   ============================================================ */
function seedInitial() {
  const tx = db.transaction(() => {
    const pid = uid();
    insertPathRow({
      id: pid, title: 'Network Security Engineer', color: '#F3AC40',
      description: 'Foundation → CCNP Security → vendor firewalls → identity & cloud security.',
      position: 0,
    });

    const courses = [
      { title: 'CCNA', status: 'done', description: 'Routing & switching foundation',
        sections: [
          { title: 'Network Fundamentals', notes: 'OSI vs TCP/IP, encapsulation, cabling.',
            tasks: [['OSI & TCP/IP models', 1], ['IPv4 addressing & subnetting', 1], ['Switching concepts (MAC, VLAN)', 1]] },
          { title: 'Routing', notes: '',
            tasks: [['Static routing lab', 1], ['OSPF single-area', 1]] },
        ] },
      { title: 'CCNP Security — SCOR (350-701)', status: 'progress', description: 'Core security technologies',
        sections: [
          { title: 'Network Security Concepts', notes: 'Firewalls, IPS, segmentation, NetFlow.',
            tasks: [['Common attacks & mitigations', 1], ['Security on network devices', 0], ['NGFW vs IPS roles', 0]] },
          { title: 'Secure Network Access (VPN)', notes: '',
            tasks: [['Site-to-site IPsec lab (GNS3)', 0], ['Remote-access VPN', 0]] },
        ] },
      { title: 'FortiGate Firewall — NSE 4', status: 'todo', description: 'Vendor firewall (strong in the Gulf market)',
        sections: [
          { title: 'Firewall Policies', notes: 'Build in EVE-NG.',
            tasks: [['Interfaces & zones', 0], ['Policy & NAT', 0], ['Security profiles (AV, web filter)', 0]] },
        ] },
    ];

    courses.forEach((c, ci) => {
      const cid = uid();
      insertCourseRow({ id: cid, path_id: pid, title: c.title, description: c.description, status: c.status, position: ci });
      c.sections.forEach((s, si) => {
        const sid = uid();
        insertSectionRow({ id: sid, course_id: cid, title: s.title, legacy_notes: '', position: si });
        s.tasks.forEach((t, ti) => {
          insertTaskRow({ id: uid(), section_id: sid, text: t[0], done: t[1], today: 0, position: ti });
        });
        // turn the legacy section note into a first real note page
        if (s.notes && s.notes.trim()) {
          const nid = uid();
          insertNoteRow({
            id: nid, course_id: cid, section_id: sid,
            title: s.title + ' — Notes',
            content: '<p>' + escapeHtml(s.notes) + '</p>',
            position: 0,
          });
        }
      });
    });
  });
  tx();
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ============================================================
   Low-level row inserts
   ============================================================ */
function insertPathRow(p) {
  db.prepare(`INSERT INTO learning_paths(id,title,description,color,position,created_at,updated_at)
              VALUES(@id,@title,@description,@color,@position,@t,@t)`)
    .run({ ...p, description: p.description || '', color: p.color || '#F3AC40', position: p.position || 0, t: nowISO() });
}
function insertCourseRow(c) {
  db.prepare(`INSERT INTO courses(id,path_id,title,description,status,position,created_at,updated_at)
              VALUES(@id,@path_id,@title,@description,@status,@position,@t,@t)`)
    .run({ ...c, description: c.description || '', status: c.status || 'todo', position: c.position || 0, t: nowISO() });
}
function insertSectionRow(s) {
  db.prepare(`INSERT INTO sections(id,course_id,title,legacy_notes,collapsed,position,created_at,updated_at)
              VALUES(@id,@course_id,@title,@legacy_notes,@collapsed,@position,@t,@t)`)
    .run({ ...s, legacy_notes: s.legacy_notes || '', collapsed: s.collapsed ? 1 : 0, position: s.position || 0, t: nowISO() });
}
function insertTaskRow(t) {
  db.prepare(`INSERT INTO tasks(id,section_id,text,done,today,done_at,due_at,remind_before,reminded,position,created_at,updated_at)
              VALUES(@id,@section_id,@text,@done,@today,@done_at,@due_at,@remind_before,@reminded,@position,@t,@t)`)
    .run({ ...t, text: t.text || '', done: t.done ? 1 : 0, today: t.today ? 1 : 0,
           done_at: t.done_at || null, due_at: t.due_at || null,
           remind_before: t.remind_before || 0, reminded: t.reminded ? 1 : 0,
           position: t.position || 0, t: nowISO() });
}
function insertNoteRow(n) {
  db.prepare(`INSERT INTO notes(id,title,content,course_id,section_id,position,created_at,updated_at)
              VALUES(@id,@title,@content,@course_id,@section_id,@position,@t,@t)`)
    .run({ ...n, title: n.title || 'Untitled', content: n.content || '', position: n.position || 0, t: nowISO() });
  ftsUpsert(n.id, n.title || 'Untitled', n.content || '');
}

/* ============================================================
   FTS helpers
   ============================================================ */
function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function ftsUpsert(noteId, title, content) {
  db.prepare('DELETE FROM notes_fts WHERE note_id=?').run(noteId);
  db.prepare('INSERT INTO notes_fts(note_id,title,body) VALUES(?,?,?)')
    .run(noteId, title || '', stripHtml(content));
}
function ftsDelete(noteId) {
  db.prepare('DELETE FROM notes_fts WHERE note_id=?').run(noteId);
}
// turn arbitrary user input into a safe FTS5 MATCH expression
function ftsQuery(q) {
  const tokens = (q || '').toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];
  if (!tokens.length) return null;
  return tokens.map((t) => '"' + t.replace(/"/g, '') + '"*').join(' ');
}

/* ============================================================
   Hydrate full tree (note bodies excluded for speed)
   ============================================================ */
function getState() {
  const paths = db.prepare('SELECT * FROM learning_paths ORDER BY position, created_at').all();
  const courses = db.prepare('SELECT * FROM courses ORDER BY position, created_at').all();
  const sections = db.prepare('SELECT * FROM sections ORDER BY position, created_at').all();
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY position, created_at').all();
  const noteMeta = db.prepare('SELECT id,title,course_id,section_id,position,updated_at FROM notes ORDER BY position, created_at').all();

  const taskBySection = groupBy(tasks, 'section_id');
  const notesBySection = groupBy(noteMeta, 'section_id');
  const sectionsByCourse = groupBy(sections, 'course_id');
  const coursesByPath = groupBy(courses, 'path_id');

  const tree = paths.map((p) => ({
    id: p.id, title: p.title, description: p.description, color: p.color,
    createdAt: p.created_at,
    courses: (coursesByPath[p.id] || []).map((c) => ({
      id: c.id, title: c.title, description: c.description, status: c.status,
      sections: (sectionsByCourse[c.id] || []).map((s) => ({
        id: s.id, title: s.title, collapsed: !!s.collapsed,
        tasks: (taskBySection[s.id] || []).map((t) => ({
          id: t.id, text: t.text, done: !!t.done, today: !!t.today, doneAt: t.done_at,
          dueAt: t.due_at || null, remindBefore: t.remind_before || 0, reminded: !!t.reminded,
        })),
        notes: (notesBySection[s.id] || []).map((n) => ({
          id: n.id, title: n.title, updatedAt: n.updated_at,
        })),
      })),
    })),
  }));

  const log = {};
  db.prepare('SELECT day,count FROM streaks').all().forEach((r) => { log[r.day] = r.count; });

  const settings = {};
  db.prepare('SELECT key,value FROM settings').all().forEach((r) => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });

  return { paths: tree, log, settings };
}

function groupBy(arr, key) {
  const m = {};
  for (const it of arr) (m[it[key]] = m[it[key]] || []).push(it);
  return m;
}

/* ============================================================
   PATHS
   ============================================================ */
function createPath(data) {
  const id = uid();
  const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM learning_paths');
  insertPathRow({ id, title: data.title, description: data.description, color: data.color, position: pos });
  return id;
}
function updatePath(id, data) {
  db.prepare('UPDATE learning_paths SET title=@title,description=@description,color=@color,updated_at=@t WHERE id=@id')
    .run({ id, title: data.title, description: data.description || '', color: data.color || '#F3AC40', t: nowISO() });
}
function deletePath(id) {
  collectNoteIdsForPath(id).forEach(ftsDelete);
  db.prepare('DELETE FROM learning_paths WHERE id=?').run(id);
}

/* ============================================================
   COURSES
   ============================================================ */
function createCourse(pathId, data) {
  const id = uid();
  const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM courses WHERE path_id=?', pathId);
  insertCourseRow({ id, path_id: pathId, title: data.title, description: data.description, status: data.status || 'todo', position: pos });
  // every new course starts with one section so notes/tasks have a home
  if (data.withSection !== false) {
    insertSectionRow({ id: uid(), course_id: id, title: 'Part 1', position: 0 });
  }
  return id;
}
function updateCourse(id, data) {
  const cur = db.prepare('SELECT * FROM courses WHERE id=?').get(id);
  if (!cur) return;
  db.prepare('UPDATE courses SET title=@title,description=@description,status=@status,updated_at=@t WHERE id=@id')
    .run({ id, title: data.title ?? cur.title, description: data.description ?? cur.description,
           status: data.status ?? cur.status, t: nowISO() });
}
function deleteCourse(id) {
  collectNoteIdsForCourse(id).forEach(ftsDelete);
  db.prepare('DELETE FROM courses WHERE id=?').run(id);
}

/* ============================================================
   SECTIONS
   ============================================================ */
function createSection(courseId, data) {
  const id = uid();
  const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM sections WHERE course_id=?', courseId);
  insertSectionRow({ id, course_id: courseId, title: (data && data.title) || 'New section', position: pos });
  return id;
}
function updateSection(id, data) {
  const cur = db.prepare('SELECT * FROM sections WHERE id=?').get(id);
  if (!cur) return;
  db.prepare('UPDATE sections SET title=@title,collapsed=@collapsed,updated_at=@t WHERE id=@id')
    .run({ id, title: data.title ?? cur.title,
           collapsed: data.collapsed === undefined ? cur.collapsed : (data.collapsed ? 1 : 0), t: nowISO() });
}
function deleteSection(id) {
  db.prepare('SELECT id FROM notes WHERE section_id=?').all(id).forEach((r) => ftsDelete(r.id));
  db.prepare('DELETE FROM sections WHERE id=?').run(id);
}
function reorderCourses(pathId, orderedIds) {
  const stmt = db.prepare('UPDATE courses SET position=@pos,updated_at=@t WHERE id=@id AND path_id=@pid');
  const tx = db.transaction((ids) => {
    ids.forEach((id, i) => stmt.run({ id, pid: pathId, pos: i, t: nowISO() }));
  });
  tx(orderedIds);
}
function reorderSections(courseId, orderedIds) {
  const stmt = db.prepare('UPDATE sections SET position=@pos,updated_at=@t WHERE id=@id AND course_id=@cid');
  const tx = db.transaction((ids) => {
    ids.forEach((id, i) => stmt.run({ id, cid: courseId, pos: i, t: nowISO() }));
  });
  tx(orderedIds);
}

/* ============================================================
   TASKS
   ============================================================ */
function createTask(sectionId, data) {
  const id = uid();
  const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM tasks WHERE section_id=?', sectionId);
  insertTaskRow({ id, section_id: sectionId, text: (data && data.text) || 'New task', position: pos });
  syncCourseStatusForSection(sectionId);
  return id;
}
function updateTask(id, data) {
  const cur = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  if (!cur) return;
  const done = data.done === undefined ? cur.done : (data.done ? 1 : 0);
  const doneAt = done && !cur.done ? Date.now() : (done ? cur.done_at : null);
  const dueAt = data.due_at === undefined ? cur.due_at : (data.due_at || null);
  const remindBefore = data.remind_before === undefined ? cur.remind_before : (data.remind_before || 0);
  // reset reminded when the schedule changes (so a new reminder can fire)
  let reminded = data.reminded === undefined ? cur.reminded : (data.reminded ? 1 : 0);
  if (data.due_at !== undefined || data.remind_before !== undefined) reminded = data.reminded ? 1 : 0;
  db.prepare('UPDATE tasks SET text=@text,done=@done,today=@today,done_at=@done_at,due_at=@due_at,remind_before=@remind_before,reminded=@reminded,updated_at=@t WHERE id=@id')
    .run({ id, text: data.text ?? cur.text, done,
           today: data.today === undefined ? cur.today : (data.today ? 1 : 0),
           done_at: doneAt, due_at: dueAt, remind_before: remindBefore, reminded, t: nowISO() });
  if (done && !cur.done) logActivity();
  syncCourseStatusForTask(id);
}
function deleteTask(id) {
  const t = db.prepare('SELECT section_id FROM tasks WHERE id=?').get(id);
  db.prepare('DELETE FROM tasks WHERE id=?').run(id);
  if (t) syncCourseStatusForSection(t.section_id);
}
/* Reorder tasks inside a section, AND move a task to a different section.
   orderedIds is the full, final list of task ids for the target section. */
function reorderTasks(sectionId, orderedIds) {
  const affected = new Set([sectionId]);
  const stmt = db.prepare('UPDATE tasks SET section_id=@sid,position=@pos,updated_at=@t WHERE id=@id');
  const prev = db.prepare('SELECT section_id FROM tasks WHERE id=?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, i) => {
      const cur = prev.get(id);
      if (cur && cur.section_id !== sectionId) affected.add(cur.section_id);
      stmt.run({ id, sid: sectionId, pos: i, t: nowISO() });
    });
  });
  tx(orderedIds);
  affected.forEach((sid) => { try { syncCourseStatusForSection(sid); } catch (_) {} });
}

/* auto status: done(100%) / progress(any) / todo(0) */
function syncCourseStatusForSection(sectionId) {
  const s = db.prepare('SELECT course_id FROM sections WHERE id=?').get(sectionId);
  if (s) syncCourseStatus(s.course_id);
}
function syncCourseStatusForTask(taskId) {
  const r = db.prepare(`SELECT s.course_id cid FROM tasks t JOIN sections s ON s.id=t.section_id WHERE t.id=?`).get(taskId);
  if (r) syncCourseStatus(r.cid);
}
function syncCourseStatus(courseId) {
  const agg = db.prepare(`
    SELECT COUNT(*) n, SUM(t.done) d
    FROM tasks t JOIN sections s ON s.id=t.section_id
    WHERE s.course_id=?`).get(courseId);
  if (!agg || !agg.n) return;
  const pct = Math.round((agg.d / agg.n) * 100);
  let status;
  if (pct === 100) status = 'done';
  else if (pct === 0) status = 'todo';
  else status = 'progress';
  db.prepare('UPDATE courses SET status=?, updated_at=? WHERE id=?').run(status, nowISO(), courseId);
}

/* used by the Board view when a card is dragged to a column */
function setCourseStatus(courseId, status) {
  db.prepare('UPDATE courses SET status=?, updated_at=? WHERE id=?').run(status, nowISO(), courseId);
}

/* ============================================================
   NOTES
   ============================================================ */
function listNotes(sectionId) {
  return db.prepare('SELECT id,title,course_id,section_id,position,updated_at,created_at FROM notes WHERE section_id=? ORDER BY position, created_at').all(sectionId);
}
function getNote(id) {
  const n = db.prepare('SELECT * FROM notes WHERE id=?').get(id);
  if (!n) return null;
  n.images = db.prepare('SELECT * FROM note_images WHERE note_id=?').all(id);
  n.attachments = db.prepare('SELECT * FROM note_attachments WHERE note_id=?').all(id);
  return n;
}
function createNote(courseId, sectionId, data) {
  const id = uid();
  const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM notes WHERE section_id=?', sectionId);
  insertNoteRow({ id, course_id: courseId, section_id: sectionId,
                  title: (data && data.title) || 'Untitled', content: (data && data.content) || '', position: pos });
  return id;
}
function updateNote(id, data) {
  const cur = db.prepare('SELECT * FROM notes WHERE id=?').get(id);
  if (!cur) return;
  const title = data.title ?? cur.title;
  const content = data.content ?? cur.content;
  db.prepare('UPDATE notes SET title=@title,content=@content,updated_at=@t WHERE id=@id')
    .run({ id, title, content, t: nowISO() });
  ftsUpsert(id, title, content);
}
function deleteNote(id) {
  ftsDelete(id);
  db.prepare('DELETE FROM notes WHERE id=?').run(id);
}
function moveNote(id, courseId, sectionId) {
  const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM notes WHERE section_id=?', sectionId);
  db.prepare('UPDATE notes SET course_id=?, section_id=?, position=?, updated_at=? WHERE id=?')
    .run(courseId, sectionId, pos, nowISO(), id);
}

function addNoteImage(noteId, filePath) {
  const id = uid();
  db.prepare('INSERT INTO note_images(id,note_id,file_path,created_at) VALUES(?,?,?,?)')
    .run(id, noteId, filePath, nowISO());
  return id;
}
function addNoteAttachment(noteId, filePath, name, size) {
  const id = uid();
  db.prepare('INSERT INTO note_attachments(id,note_id,file_path,name,size,created_at) VALUES(?,?,?,?,?,?)')
    .run(id, noteId, filePath, name || '', size || 0, nowISO());
  return id;
}

function collectNoteIdsForCourse(courseId) {
  return db.prepare('SELECT id FROM notes WHERE course_id=?').all(courseId).map((r) => r.id);
}
function collectNoteIdsForPath(pathId) {
  return db.prepare(`SELECT n.id FROM notes n JOIN courses c ON c.id=n.course_id WHERE c.path_id=?`).all(pathId).map((r) => r.id);
}

/* ============================================================
   SEARCH (notes via FTS + titles via LIKE)
   ============================================================ */
function search(query) {
  const q = (query || '').trim();
  if (!q) return [];
  const like = '%' + q.toLowerCase() + '%';
  const out = [];

  // paths
  db.prepare('SELECT id,title FROM learning_paths WHERE LOWER(title) LIKE ?').all(like)
    .forEach((r) => out.push({ type: 'path', name: r.title, path: 'Path', pathId: r.id }));

  // courses
  db.prepare(`SELECT c.id,c.title,c.path_id,p.title ptitle
              FROM courses c JOIN learning_paths p ON p.id=c.path_id
              WHERE LOWER(c.title) LIKE ?`).all(like)
    .forEach((r) => out.push({ type: 'course', name: r.title, path: r.ptitle, pathId: r.path_id, courseId: r.id }));

  // sections
  db.prepare(`SELECT s.id,s.title,c.id cid,c.title ctitle,p.id pid,p.title ptitle
              FROM sections s JOIN courses c ON c.id=s.course_id JOIN learning_paths p ON p.id=c.path_id
              WHERE LOWER(s.title) LIKE ?`).all(like)
    .forEach((r) => out.push({ type: 'section', name: r.title, path: r.ptitle + ' · ' + r.ctitle, pathId: r.pid, courseId: r.cid }));

  // tasks
  db.prepare(`SELECT t.id,t.text,c.id cid,c.title ctitle,p.id pid,p.title ptitle
              FROM tasks t JOIN sections s ON s.id=t.section_id JOIN courses c ON c.id=s.course_id
              JOIN learning_paths p ON p.id=c.path_id
              WHERE LOWER(t.text) LIKE ?`).all(like)
    .forEach((r) => out.push({ type: 'task', name: r.text, path: r.ptitle + ' · ' + r.ctitle, pathId: r.pid, courseId: r.cid }));

  // notes (FTS over title + body)
  const fq = ftsQuery(q);
  if (fq) {
    let ids = [];
    try {
      ids = db.prepare('SELECT note_id FROM notes_fts WHERE notes_fts MATCH ? LIMIT 60').all(fq).map((r) => r.note_id);
    } catch (e) { ids = []; }
    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      db.prepare(`SELECT n.id,n.title,n.course_id,n.section_id,c.title ctitle,p.title ptitle,p.id pid
                  FROM notes n JOIN courses c ON c.id=n.course_id JOIN learning_paths p ON p.id=c.path_id
                  WHERE n.id IN (${ph})`).all(...ids)
        .forEach((r) => out.push({ type: 'note', name: r.title, path: r.ptitle + ' · ' + r.ctitle,
                                   pathId: r.pid, courseId: r.course_id, sectionId: r.section_id, noteId: r.id }));
    }
  }
  return out.slice(0, 60);
}

/* ============================================================
   STREAK / STATS
   ============================================================ */
function logActivity() {
  const k = today();
  db.prepare('INSERT INTO streaks(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1').run(k);
}

function logFocus(taskId, minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  if (!m) return;
  db.prepare('INSERT INTO focus_sessions(id,task_id,minutes,day,created_at) VALUES(?,?,?,?,?)')
    .run(uid(), taskId || null, m, today(), nowISO());
}

/* Achievements / report for a date range [startMs, endMs).
   Returns totals, per-path breakdown, daily activity, streak, focus minutes. */
function getAchievements(startMs, endMs) {
  const s = Number(startMs) || 0;
  const e = Number(endMs) || Date.now();
  // completed tasks in range (done_at is ms)
  const doneTasks = db.prepare(
    `SELECT t.id, t.text, t.done_at, s.course_id, c.path_id
       FROM tasks t JOIN sections s ON s.id=t.section_id
       JOIN courses c ON c.id=s.course_id
      WHERE t.done=1 AND t.done_at>=? AND t.done_at<?`
  ).all(s, e);

  const pathName = {};
  db.prepare('SELECT id,title,color FROM learning_paths').all().forEach((p) => { pathName[p.id] = { title: p.title, color: p.color }; });

  const byPath = {};
  const byDay = {};
  doneTasks.forEach((t) => {
    byPath[t.path_id] = (byPath[t.path_id] || 0) + 1;
    const d = new Date(t.done_at).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
  });

  // courses fully completed in range (all tasks done, last completion in range)
  const courses = db.prepare(
    `SELECT c.id, c.title, c.path_id,
            COUNT(t.id) total, SUM(t.done) done, MAX(t.done_at) last_done
       FROM courses c
       JOIN sections s ON s.course_id=c.id
       JOIN tasks t ON t.section_id=s.id
      GROUP BY c.id`
  ).all();
  const coursesCompleted = courses.filter((c) => c.total > 0 && c.done === c.total && c.last_done >= s && c.last_done < e)
    .map((c) => ({ title: c.title, path: (pathName[c.path_id] || {}).title || '' }));

  // focus minutes in range
  const focus = db.prepare('SELECT COALESCE(SUM(minutes),0) m, COUNT(*) n FROM focus_sessions WHERE created_at>=? AND created_at<?')
    .get(new Date(s).toISOString(), new Date(e).toISOString());

  // streak (current, all-time)
  const allDays = db.prepare('SELECT day,count FROM streaks WHERE count>0 ORDER BY day').all();
  const daySet = new Set(allDays.map((d) => d.day));
  let streak = 0; const dt = new Date();
  for (let i = 0; i < 800; i++) {
    const key = dt.toISOString().slice(0, 10);
    if (daySet.has(key)) { streak++; dt.setDate(dt.getDate() - 1); }
    else if (i === 0) { dt.setDate(dt.getDate() - 1); }
    else break;
  }

  return {
    range: { start: s, end: e },
    tasksCompleted: doneTasks.length,
    coursesCompleted,
    byPath: Object.keys(byPath).map((pid) => ({ title: (pathName[pid] || {}).title || 'Unknown', color: (pathName[pid] || {}).color || '#2DD4BF', count: byPath[pid] })).sort((a, b) => b.count - a.count),
    byDay,
    focusMinutes: focus.m || 0,
    focusSessions: focus.n || 0,
    streak,
    activeDays: Object.keys(byDay).length,
  };
}
function getStats() {
  const paths = db.prepare('SELECT COUNT(*) n FROM learning_paths').get().n;
  const courses = db.prepare('SELECT COUNT(*) n FROM courses').get().n;
  const tasks = db.prepare('SELECT COUNT(*) n, SUM(done) d FROM tasks').get();
  const notes = db.prepare('SELECT COUNT(*) n FROM notes').get().n;
  return {
    paths, courses, notes,
    tasks: tasks.n || 0, tasksDone: tasks.d || 0,
  };
}

/* ============================================================
   Import / Export of the whole database (backup.json)
   ============================================================ */
function exportAll() {
  return {
    proton: true, version: 1, exportedAt: nowISO(),
    learning_paths: db.prepare('SELECT * FROM learning_paths').all(),
    courses: db.prepare('SELECT * FROM courses').all(),
    sections: db.prepare('SELECT * FROM sections').all(),
    tasks: db.prepare('SELECT * FROM tasks').all(),
    notes: db.prepare('SELECT * FROM notes').all(),
    note_images: db.prepare('SELECT * FROM note_images').all(),
    note_attachments: db.prepare('SELECT * FROM note_attachments').all(),
    streaks: db.prepare('SELECT * FROM streaks').all(),
    settings: db.prepare('SELECT * FROM settings').all(),
  };
}

/* Accepts either a Proton backup OR an old PathBoard web export
   ({goals:[...]} with section.notes strings). */
/* ---- single-path export / import (share one path as a .json file) ---- */
function exportPath(pathId) {
  const p = db.prepare('SELECT * FROM learning_paths WHERE id=?').get(pathId);
  if (!p) throw new Error('Path not found');
  const courses = db.prepare('SELECT * FROM courses WHERE path_id=? ORDER BY position,created_at').all(pathId);
  const ph = (arr) => arr.map(() => '?').join(',');
  // Build a clean, nested, AI-friendly structure.
  const path = {
    title: p.title, description: p.description || '', color: p.color || '#F3AC40',
    courses: courses.map((c) => {
      const secs = db.prepare('SELECT * FROM sections WHERE course_id=? ORDER BY position,created_at').all(c.id);
      return {
        title: c.title, description: c.description || '', status: c.status || 'todo',
        sections: secs.map((s) => ({
          title: s.title,
          tasks: db.prepare('SELECT text,done FROM tasks WHERE section_id=? ORDER BY position,created_at').all(s.id)
            .map((t) => ({ text: t.text, done: !!t.done })),
          notes: db.prepare('SELECT title,content FROM notes WHERE section_id=? ORDER BY position,created_at').all(s.id)
            .map((n) => ({ title: n.title, content: n.content || '' })),
        })),
      };
    }),
  };
  return { protonPath: true, version: 2, exportedAt: nowISO(), path };
}

/* Tolerant import: accepts the nested format, the old flat format
   ({path,courses[],sections[],tasks[]} with FKs), and is lenient about
   missing fields so slightly different files still import cleanly. */
function importPath(data) {
  if (!data || typeof data !== 'object') throw new Error('This is not a Proton path file.');
  // unwrap common shapes
  let root = data;
  if (data.path && (Array.isArray(data.path.courses) || data.path.title)) root = data.path;
  else if (Array.isArray(data.courses) && !data.sections && !data.tasks) root = data; // nested at top level

  const isFlat = Array.isArray(data.courses) && (Array.isArray(data.sections) || Array.isArray(data.tasks));
  let newPathId;
  const tx = db.transaction(() => {
    newPathId = uid();
    const pos = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM learning_paths');

    if (isFlat) {
      const idMap = new Map();
      const mid = (old) => { if (!idMap.has(old)) idMap.set(old, uid()); return idMap.get(old); };
      const p = data.path || {};
      insertPathRow({ id: newPathId, title: p.title || data.title || 'Imported path', description: p.description || '', color: p.color || '#F3AC40', position: pos });
      (data.courses || []).forEach((c, i) => insertCourseRow({ id: mid(c.id), path_id: newPathId, title: c.title || 'Course', description: c.description || '', status: c.status || 'todo', position: c.position != null ? c.position : i }));
      (data.sections || []).forEach((s, i) => insertSectionRow({ id: mid(s.id), course_id: mid(s.course_id), title: s.title || 'Section', legacy_notes: '', collapsed: s.collapsed ? 1 : 0, position: s.position != null ? s.position : i }));
      (data.tasks || []).forEach((t, i) => insertTaskRow({ id: uid(), section_id: mid(t.section_id), text: t.text || '', done: t.done ? 1 : 0, today: t.today ? 1 : 0, done_at: t.done_at || null, position: t.position != null ? t.position : i }));
      (data.notes || []).forEach((n, i) => { const nid = uid(); insertNoteRow({ id: nid, title: n.title || 'Untitled', content: n.content || '', course_id: mid(n.course_id), section_id: n.section_id != null ? mid(n.section_id) : null, position: n.position != null ? n.position : i }); ftsUpsert(nid, n.title || 'Untitled', n.content || ''); });
      return;
    }

    // nested format
    const pathTitle =
      (root.title && String(root.title).trim()) ||
      (root.name && String(root.name).trim()) ||
      (data.title && String(data.title).trim()) ||
      (data.name && String(data.name).trim()) ||
      (data.path && data.path.title && String(data.path.title).trim()) ||
      (data.pathName && String(data.pathName).trim()) ||
      'Imported path';
    insertPathRow({ id: newPathId, title: pathTitle, description: root.description || data.description || '', color: root.color || data.color || '#F3AC40', position: pos });
    const courses = Array.isArray(root.courses) ? root.courses : [];
    courses.forEach((c, ci) => {
      const cid = uid();
      insertCourseRow({ id: cid, path_id: newPathId, title: (c && c.title) || 'Course', description: (c && c.description) || '', status: (c && c.status) || 'todo', position: ci });
      const sections = Array.isArray(c && c.sections) ? c.sections : [];
      sections.forEach((s, si) => {
        const sid = uid();
        insertSectionRow({ id: sid, course_id: cid, title: (s && s.title) || 'Section', legacy_notes: '', collapsed: 0, position: si });
        const tasks = Array.isArray(s && s.tasks) ? s.tasks : [];
        tasks.forEach((t, ti) => {
          const text = typeof t === 'string' ? t : (t && t.text) || '';
          if (!String(text).trim()) return;
          insertTaskRow({ id: uid(), section_id: sid, text: String(text).slice(0, 500), done: (t && t.done) ? 1 : 0, today: 0, done_at: null, position: ti });
        });
        const notes = Array.isArray(s && s.notes) ? s.notes : [];
        notes.forEach((n, ni) => {
          const nid = uid();
          insertNoteRow({ id: nid, title: (n && n.title) || 'Untitled', content: (n && n.content) || '', course_id: cid, section_id: sid, position: ni });
          ftsUpsert(nid, (n && n.title) || 'Untitled', (n && n.content) || '');
        });
      });
    });
  });
  tx();
  return newPathId;
}

function importAll(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup');
  const tx = db.transaction(() => {
    wipeAll();
    if (Array.isArray(data.goals)) importLegacyWeb(data);
    else importProton(data);
    setMeta('seeded', '1');
  });
  tx();
}

function wipeAll() {
  ['note_attachments', 'note_images', 'notes', 'tasks', 'sections', 'courses', 'learning_paths', 'streaks', 'settings']
    .forEach((t) => db.prepare('DELETE FROM ' + t).run());
  db.prepare('DELETE FROM notes_fts').run();
}

/* Full reset — wipes everything and returns the app to a brand-new, empty state. */
function resetAll() {
  const tx = db.transaction(() => { wipeAll(); });
  tx();
  checkpoint();
  return getState();
}

/* Bulk-add many tasks to one section (used by playlist / AI import). */
function bulkCreateTasks(sectionId, texts) {
  if (!Array.isArray(texts) || !texts.length) return 0;
  let base = nextPos('SELECT COALESCE(MAX(position),-1)+1 p FROM tasks WHERE section_id=?', sectionId);
  const tx = db.transaction((list) => {
    list.forEach((txt) => {
      const t = String(txt || '').trim();
      if (!t) return;
      insertTaskRow({ id: uid(), section_id: sectionId, text: t.slice(0, 500), position: base++ });
    });
  });
  tx(texts);
  syncCourseStatusForSection(sectionId);
  return texts.length;
}

function importProton(d) {
  const ins = (table, rows, cols) => {
    if (!Array.isArray(rows)) return;
    const ph = cols.map((c) => '@' + c).join(',');
    const stmt = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${ph})`);
    rows.forEach((r) => stmt.run(pick(r, cols)));
  };
  ins('learning_paths', d.learning_paths, ['id', 'title', 'description', 'color', 'position', 'created_at', 'updated_at']);
  ins('courses', d.courses, ['id', 'path_id', 'title', 'description', 'status', 'position', 'created_at', 'updated_at']);
  ins('sections', d.sections, ['id', 'course_id', 'title', 'legacy_notes', 'collapsed', 'position', 'created_at', 'updated_at']);
  ins('tasks', d.tasks, ['id', 'section_id', 'text', 'done', 'today', 'done_at', 'position', 'created_at', 'updated_at']);
  ins('notes', d.notes, ['id', 'title', 'content', 'course_id', 'section_id', 'position', 'created_at', 'updated_at']);
  ins('note_images', d.note_images, ['id', 'note_id', 'file_path', 'created_at']);
  ins('note_attachments', d.note_attachments, ['id', 'note_id', 'file_path', 'name', 'size', 'created_at']);
  ins('streaks', d.streaks, ['day', 'count']);
  ins('settings', d.settings, ['key', 'value']);
  // rebuild FTS
  db.prepare('SELECT id,title,content FROM notes').all().forEach((n) => ftsUpsert(n.id, n.title, n.content));
}

function importLegacyWeb(d) {
  (d.goals || []).forEach((g, gi) => {
    const pid = uid();
    insertPathRow({ id: pid, title: g.title || 'Path', description: g.description || '', color: g.color || '#F3AC40', position: gi });
    (g.courses || []).forEach((c, ci) => {
      const cid = uid();
      insertCourseRow({ id: cid, path_id: pid, title: c.title || 'Course', description: c.description || '', status: c.status || 'todo', position: ci });
      (c.sections || []).forEach((s, si) => {
        const sid = uid();
        insertSectionRow({ id: sid, course_id: cid, title: s.title || 'Section', legacy_notes: '', position: si });
        (s.tasks || []).forEach((t, ti) => {
          insertTaskRow({ id: uid(), section_id: sid, text: t.text || '', done: t.done ? 1 : 0, today: t.today ? 1 : 0, done_at: t.doneAt || null, position: ti });
        });
        if (s.notes && String(s.notes).trim()) {
          insertNoteRow({ id: uid(), course_id: cid, section_id: sid, title: (s.title || 'Section') + ' — Notes',
                          content: '<p>' + escapeHtml(String(s.notes)).replace(/\n/g, '</p><p>') + '</p>', position: 0 });
        }
      });
    });
  });
  if (d.log && typeof d.log === 'object') {
    Object.entries(d.log).forEach(([day, count]) => {
      db.prepare('INSERT INTO streaks(day,count) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET count=excluded.count').run(day, count | 0);
    });
  }
}

function pick(obj, cols) {
  const o = {};
  cols.forEach((c) => { o[c] = obj[c] === undefined ? null : obj[c]; });
  return o;
}

/* ============================================================
   Settings
   ============================================================ */
function getSetting(key) {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  if (!r) return null;
  try { return JSON.parse(r.value); } catch { return r.value; }
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}

/* ---------- misc ---------- */
function nextPos(sql, param) {
  const r = param === undefined ? db.prepare(sql).get() : db.prepare(sql).get(param);
  return r ? r.p : 0;
}
function integrityCheck() {
  try { return db.pragma('integrity_check', { simple: true }) === 'ok'; }
  catch { return false; }
}
function checkpoint() {
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
}
function close() {
  if (db) { try { checkpoint(); db.close(); } catch (_) {} db = null; }
}
function getPath() { return DB_PATH; }

module.exports = {
  open, close, getState, getStats, integrityCheck, checkpoint, getPath, uid,
  createPath, updatePath, deletePath,
  createCourse, updateCourse, deleteCourse, setCourseStatus,
  createSection, updateSection, deleteSection, reorderCourses, reorderSections,
  createTask, updateTask, deleteTask, reorderTasks, bulkCreateTasks,
  listNotes, getNote, createNote, updateNote, deleteNote, moveNote,
  addNoteImage, addNoteAttachment,
  search, logActivity, logFocus, getAchievements,
  getSetting, setSetting,
  exportAll, importAll, exportPath, importPath, resetAll,
};
