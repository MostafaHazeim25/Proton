'use strict';

/* ============================================================
   Proton — preload (secure bridge)
   Exposes window.proton with a small, explicit API. The renderer
   has no direct Node / database access (contextIsolation = true).
   Every call returns a Promise that resolves to the data or
   throws with a readable error message.
   ============================================================ */

const { contextBridge, ipcRenderer } = require('electron');

async function call(channel, ...args) {
  const res = await ipcRenderer.invoke(channel, ...args);
  if (res && res.ok === false) throw new Error(res.error || 'Operation failed');
  return res ? res.data : undefined;
}

const api = {
  // state
  getState: () => call('state:get'),
  getStats: () => call('stats:get'),
  integrityCheck: () => call('integrity:check'),

  // paths
  createPath: (data) => call('path:create', data),
  updatePath: (id, data) => call('path:update', id, data),
  deletePath: (id) => call('path:delete', id),

  // courses
  createCourse: (pathId, data) => call('course:create', pathId, data),
  updateCourse: (id, data) => call('course:update', id, data),
  deleteCourse: (id) => call('course:delete', id),
  setCourseStatus: (id, status) => call('course:setStatus', id, status),
  reorderCourses: (pathId, ids) => call('course:reorder', pathId, ids),

  // sections
  createSection: (courseId, data) => call('section:create', courseId, data),
  updateSection: (id, data) => call('section:update', id, data),
  deleteSection: (id) => call('section:delete', id),
  reorderSections: (courseId, ids) => call('section:reorder', courseId, ids),
  reorderTasks: (sectionId, ids) => call('task:reorder', sectionId, ids),
  bulkCreateTasks: (sectionId, texts) => call('task:bulkCreate', sectionId, texts),
  logFocus: (taskId, minutes) => call('focus:log', taskId, minutes),
  getAchievements: (start, end) => call('achievements:get', start, end),
  captureRegion: (x, y, w, h) => call('app:captureRegion', x, y, w, h),
  notify: (title, body) => call('notify:show', title, body),
  resetApp: () => call('app:reset'),

  // tasks
  createTask: (sectionId, data) => call('task:create', sectionId, data),
  updateTask: (id, data) => call('task:update', id, data),
  deleteTask: (id) => call('task:delete', id),

  // notes
  listNotes: (sectionId) => call('note:list', sectionId),
  getNote: (id) => call('note:get', id),
  createNote: (courseId, sectionId, data) => call('note:create', courseId, sectionId, data),
  updateNote: (id, data) => call('note:update', id, data),
  deleteNote: (id) => call('note:delete', id),
  moveNote: (id, courseId, sectionId) => call('note:move', id, courseId, sectionId),
  saveNoteImage: (noteId, dataUrl) => call('note:saveImage', noteId, dataUrl),
  saveNoteAttachment: (noteId, name, dataUrl) => call('note:saveAttachment', noteId, name, dataUrl),
  openAttachment: (pathOrUrl) => call('note:openAttachment', pathOrUrl),

  // search
  search: (q) => call('search:run', q),

  // activity / settings
  logActivity: () => call('activity:log'),
  getSetting: (key) => call('setting:get', key),
  setSetting: (key, value) => call('setting:set', key, value),

  // backups
  exportBackup: () => call('backup:export'),
  importBackup: () => call('backup:import'),
  listBackups: () => call('backup:list'),
  openBackupsFolder: () => call('backup:openFolder'),
  openDataFolder: () => call('app:openDataFolder'),
  openExternal: (url) => call('app:openExternal', url),
  checkForUpdates: () => call('updates:check'),
  exportPath: (pathId) => call('path:export', pathId),
  importPath: () => call('path:import'),
};

contextBridge.exposeInMainWorld('proton', api);
