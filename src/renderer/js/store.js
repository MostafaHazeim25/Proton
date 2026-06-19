'use strict';

/* ============================================================
   Proton — Store
   Holds an in-memory mirror of the database for instant UI, and
   persists every change automatically through window.proton.*
   (which writes to SQLite). No save button anywhere.

   - Structural ops (add/remove path|course|section|note) reload
     the lightweight tree afterwards so the mirror stays exact.
   - Hot ops (toggle, star, rename, collapse) patch the mirror
     locally and persist in the background.
   ============================================================ */

const P = window.proton;

const Store = {
  state: { goals: [], log: {}, settings: {}, ui: null },
  ready: false,

  async boot() {
    const s = await P.getState();
    this.state.goals = s.paths || [];
    this.state.log = s.log || {};
    this.state.settings = s.settings || {};
    this.state.ui = (s.settings && s.settings.ui) || {
      view: 'dashboard', goalId: null, boardGoal: 'all', openCourses: {}, notes: {},
    };
    if (!this.state.ui.openCourses) this.state.ui.openCourses = {};
    if (!this.state.ui.notes) this.state.ui.notes = {};
    this.ready = true;
  },

  async reload() {
    const s = await P.getState();
    this.state.goals = s.paths || [];
    this.state.log = s.log || {};
  },

  /* ---------- UI state (persisted, debounced) ---------- */
  _uiTimer: null,
  saveUI() {
    clearTimeout(this._uiTimer);
    this._uiTimer = setTimeout(() => {
      P.setSetting('ui', this.state.ui).catch(() => {});
    }, 250);
  },

  /* ---------- helpers ---------- */
  findCourse(id) {
    for (const g of this.state.goals) { const c = g.courses.find((c) => c.id === id); if (c) return { g, c }; }
    return null;
  },
  findTask(id) {
    for (const g of this.state.goals) for (const c of g.courses) for (const s of c.sections) {
      const t = s.tasks.find((t) => t.id === id); if (t) return { g, c, s, t };
    }
    return null;
  },
  findSection(id) {
    for (const g of this.state.goals) for (const c of g.courses) {
      const s = c.sections.find((s) => s.id === id); if (s) return { g, c, s };
    }
    return null;
  },
  courseProgress(c) {
    const t = c.sections.flatMap((s) => s.tasks);
    if (!t.length) return 0;
    return Math.round((t.filter((x) => x.done).length / t.length) * 100);
  },
  _syncStatus(c) {
    const t = c.sections.flatMap((s) => s.tasks);
    if (!t.length) return;
    const p = this.courseProgress(c);
    c.status = p === 100 ? 'done' : p === 0 ? 'todo' : 'progress';
  },

  /* ---------- PATHS ---------- */
  async addPath(data) {
    const id = await P.createPath(data);
    this.state.goals.push({ id, title: data.title, description: data.description || '', color: data.color, courses: [] });
    return id;
  },
  updatePath(id, data) {
    const g = this.state.goals.find((g) => g.id === id);
    if (g) { g.title = data.title; g.description = data.description || ''; g.color = data.color; }
    P.updatePath(id, data).catch(() => {});
  },
  async delPath(id) {
    this.state.goals = this.state.goals.filter((g) => g.id !== id);
    await P.deletePath(id);
  },

  /* ---------- COURSES ---------- */
  async addCourse(pathId, data) {
    const id = await P.createCourse(pathId, data);
    await this.reload(); // DB auto-creates a starter section
    return id;
  },
  updateCourse(id, data) {
    const f = this.findCourse(id);
    if (f) { if (data.title !== undefined) f.c.title = data.title; if (data.description !== undefined) f.c.description = data.description; if (data.status !== undefined) f.c.status = data.status; }
    P.updateCourse(id, data).catch(() => {});
  },
  setCourseStatus(id, status) {
    const f = this.findCourse(id);
    if (f) f.c.status = status;
    P.setCourseStatus(id, status).catch(() => {});
  },
  async delCourse(id) {
    const f = this.findCourse(id);
    if (f) f.g.courses = f.g.courses.filter((c) => c.id !== id);
    await P.deleteCourse(id);
  },

  /* ---------- SECTIONS ---------- */
  async addSection(courseId, title) {
    const id = await P.createSection(courseId, { title: title || 'New section' });
    const f = this.findCourse(courseId);
    if (f) f.c.sections.push({ id, title: title || 'New section', collapsed: false, tasks: [], notes: [] });
    return id;
  },
  updateSection(id, data) {
    const f = this.findSection(id);
    if (f && data.title !== undefined) f.s.title = data.title;
    P.updateSection(id, data).catch(() => {});
  },
  async delSection(id) {
    const f = this.findSection(id);
    if (f) f.c.sections = f.c.sections.filter((s) => s.id !== id);
    await P.deleteSection(id);
  },
  reorderCourses(pathId, orderedIds) {
    const g = this.state.goals.find((x) => x.id === pathId);
    if (!g) return;
    const map = new Map(g.courses.map((c) => [c.id, c]));
    g.courses = orderedIds.map((id) => map.get(id)).filter(Boolean);
    P.reorderCourses(pathId, orderedIds).catch(() => {});
  },
  reorderSections(courseId, orderedIds) {
    const f = this.findCourse(courseId);
    if (!f) return;
    const map = new Map(f.c.sections.map((s) => [s.id, s]));
    f.c.sections = orderedIds.map((id) => map.get(id)).filter(Boolean);
    P.reorderSections(courseId, orderedIds).catch(() => {});
  },

  /* ---------- TASKS ---------- */
  async addTask(sectionId) {
    const id = await P.createTask(sectionId, { text: 'New task' });
    const f = this.findSection(sectionId);
    if (f) { f.s.tasks.push({ id, text: 'New task', done: false, today: false }); this._syncStatus(f.c); }
    return id;
  },
  toggleTask(id) {
    const f = this.findTask(id);
    if (!f) return;
    f.t.done = !f.t.done;
    if (f.t.done) { f.t.doneAt = Date.now(); const k = new Date().toISOString().slice(0, 10); this.state.log[k] = (this.state.log[k] || 0) + 1; }
    this._syncStatus(f.c);
    P.updateTask(id, { done: f.t.done }).catch(() => {});
  },
  starTask(id) {
    const f = this.findTask(id);
    if (!f) return;
    f.t.today = !f.t.today;
    P.updateTask(id, { today: f.t.today }).catch(() => {});
  },
  editTask(id, text) {
    const f = this.findTask(id);
    if (f) f.t.text = text;
    P.updateTask(id, { text }).catch(() => {});
  },
  delTask(id) {
    const f = this.findTask(id);
    if (f) { f.s.tasks = f.s.tasks.filter((t) => t.id !== id); this._syncStatus(f.c); }
    P.deleteTask(id).catch(() => {});
  },

  /* ---------- NOTES (metadata kept in mirror; bodies fetched on open) ---------- */
  async addNote(courseId, sectionId, data) {
    const id = await P.createNote(courseId, sectionId, data || {});
    const f = this.findSection(sectionId);
    if (f) f.s.notes.push({ id, title: (data && data.title) || 'Untitled', updatedAt: new Date().toISOString() });
    return id;
  },
  async getNote(id) { return P.getNote(id); },
  updateNoteMeta(id, title) {
    for (const g of this.state.goals) for (const c of g.courses) for (const s of c.sections) {
      const n = s.notes.find((n) => n.id === id); if (n) { n.title = title; n.updatedAt = new Date().toISOString(); return; }
    }
  },
  async delNote(id) {
    for (const g of this.state.goals) for (const c of g.courses) for (const s of c.sections) {
      const i = s.notes.findIndex((n) => n.id === id);
      if (i > -1) { s.notes.splice(i, 1); break; }
    }
    await P.deleteNote(id);
  },
  async moveNote(id, courseId, sectionId) {
    await P.moveNote(id, courseId, sectionId);
    await this.reload();
  },
};

window.Store = Store;
