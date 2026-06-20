'use strict';

/* ============================================================
   Proton — main UI controller
   Ported from the original PathBoard renderer. The views and
   markup are unchanged; persistence now goes through Store →
   SQLite (auto-save), the Notes view is the new knowledge system,
   and Export/Import use real files via the backup system.
   ============================================================ */

/* ============== Icons ============== */
const ICON = {
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  caret:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m12 2 2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z"/></svg>',
  starOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 2 2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
  trending:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>',
  grip:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 15V4"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 5v14l11-7z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/></svg>',
};

/* ============== Constants ============== */
const COLORS = ['#F3AC40','#2DD4BF','#60A5FA','#A78BFA','#F472B6','#34D399','#FB923C','#F87171'];
const STATUSES = [
  {key:'todo',     label:'To Do',       dot:'#8CA0B8'},
  {key:'progress', label:'In Progress', dot:'#2DD4BF'},
  {key:'done',     label:'Done',        dot:'#F3AC40'},
];

const today = ()=> new Date().toISOString().slice(0,10);

/* state is the Store's in-memory mirror (kept in sync with SQLite) */
let state = null;
function save(){ Store.saveUI(); }   // only UI state needs explicit persistence

/* ============== Derived ============== */
function courseTasks(c){ return c.sections.flatMap(s=>s.tasks); }
function courseProgress(c){ const t=courseTasks(c); if(!t.length) return 0; return Math.round(t.filter(x=>x.done).length/t.length*100); }
function goalTasks(g){ return g.courses.flatMap(courseTasks); }
function goalProgress(g){ const t=goalTasks(g); if(!t.length) return 0; return Math.round(t.filter(x=>x.done).length/t.length*100); }
function allTasksToday(){
  const out=[];
  state.goals.forEach(g=>g.courses.forEach(c=>c.sections.forEach(s=>s.tasks.forEach(t=>{ if(t.today) out.push({t,c,g}); }))));
  return out;
}
function findCourse(id){
  for(const g of state.goals){ const c=g.courses.find(c=>c.id===id); if(c) return {g,c}; }
  return null;
}
function streak(){
  let n=0; let d=new Date();
  for(let i=0;i<400;i++){
    const key=d.toISOString().slice(0,10);
    if(state.log[key] && state.log[key]>0){ n++; d.setDate(d.getDate()-1); }
    else if(i===0){ d.setDate(d.getDate()-1); }
    else break;
  }
  return n;
}

/* ============== DOM helpers ============== */
const $ = s=>document.querySelector(s);
let content;
function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function ring(pct,size=46,sw=5,color='var(--amber)'){
  const r=(size-sw)/2, c=2*Math.PI*r, off=c*(1-pct/100);
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${sw}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .6s"/></svg>
    <div class="ring-pct">${pct}<span style="font-size:.7em">%</span></div></div>`;
}
function statusTag(s){ const m={todo:'tag-todo',progress:'tag-progress',done:'tag-done'}; const l={todo:'To Do',progress:'In Progress',done:'Done'}; return `<span class="course-tag ${m[s]}">${l[s]}</span>`; }

/* ============== Toast (with optional Undo) ============== */
function toast(msg){
  const w=$('#toast-wrap');
  const t=document.createElement('div');
  t.className='toast';
  t.innerHTML=ICON.check+`<span>${esc(msg)}</span>`;
  w.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 2200);
}
function toastUndo(msg, onUndo){
  const w=$('#toast-wrap');
  const t=document.createElement('div');
  t.className='toast';
  t.innerHTML=ICON.trash+`<span>${esc(msg)}</span><button class="toast-undo">Undo</button>`;
  w.appendChild(t);
  let done=false;
  const close=()=>{ if(done) return; done=true; t.style.opacity='0'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); };
  t.querySelector('.toast-undo').onclick=async ()=>{ done=true; t.remove(); try{ await onUndo(); }catch(e){ toast('Could not undo'); } };
  setTimeout(close, 5000);
}
function notifyError(msg){
  const w=$('#toast-wrap');
  const t=document.createElement('div');
  t.className='toast toast-error';
  t.innerHTML=`<span>${esc(msg)}</span>`;
  w.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 3000);
}

/* ============== Navigation ============== */
function go(view, goalId){
  state.ui.view=view;
  if(goalId!==undefined) state.ui.goalId=goalId;
  save(); render();
  content.scrollTop=0;
  closeSidebar();
}
function closeSidebar(){ $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); }

/* ============== Render root ============== */
function render(){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===state.ui.view && state.ui.view!=='goal'));
  $('#nav-goal-count').textContent=state.goals.length;
  const tc=allTasksToday(); $('#nav-today-count').textContent=tc.filter(x=>!x.t.done).length;
  $('#streak-num').textContent=streak();

  const v=state.ui.view;
  if(v==='dashboard') renderDashboard();
  else if(v==='paths') renderPaths();
  else if(v==='goal') renderGoal();
  else if(v==='board') renderBoard();
  else if(v==='notes') NotesView.render(content);
  else if(v==='today') renderToday();
  else if(v==='focus') renderFocus();
  else if(v==='achievements') renderAchievements();
}

/* breadcrumb */
function crumb(parts){
  $('#crumb').innerHTML = parts.map((p,i)=>{
    const sep = i>0 ? '<span class="crumb-sep">/</span>' : '';
    if(p.view) return sep+`<button class="crumb-link" data-nav="${p.view}" ${p.goalId?`data-goal="${p.goalId}"`:''}>${esc(p.label)}</button>`;
    return sep+`<span class="page-title">${esc(p.label)}</span>`;
  }).join('');
}

/* ============== Dashboard ============== */
function renderDashboard(){
  crumb([{label:'Dashboard'}]);
  const goals=state.goals;
  const allCourses=goals.flatMap(g=>g.courses);
  const allT=goals.flatMap(goalTasks);
  const doneT=allT.filter(t=>t.done).length;
  const overall=allT.length?Math.round(doneT/allT.length*100):0;
  const coursesDone=allCourses.filter(c=>courseProgress(c)===100&&courseTasks(c).length).length;
  const dateStr=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const todayTasks=allTasksToday();

  let html=`
  <div class="dash-head">
    <div>
      <div class="dash-hello">Your learning command center</div>
      <div class="dash-date">${dateStr} · ${overall}% across all paths</div>
    </div>
    <button class="btn btn-primary" data-action="new-goal">${ICON.plus}New path</button>
  </div>
  <div class="stat-row">
    <div class="stat"><div class="stat-top">${ICON.target}Active paths</div><div class="stat-val">${goals.length}</div><div class="stat-sub">learning goals</div></div>
    <div class="stat"><div class="stat-top">${ICON.book}Courses</div><div class="stat-val">${coursesDone}<small>/${allCourses.length}</small></div><div class="stat-sub">completed</div></div>
    <div class="stat"><div class="stat-top">${ICON.check}Tasks done</div><div class="stat-val">${doneT}<small>/${allT.length}</small></div><div class="stat-sub">${allT.length-doneT} remaining</div></div>
    <div class="stat"><div class="stat-top">${ICON.trending}Overall</div><div class="stat-val">${overall}<small>%</small></div><div class="stat-sub">total progress</div></div>
  </div>
  <div class="dash-grid">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">${ICON.target}Path progress</div><button class="btn btn-ghost btn-sm" data-nav="paths">View all</button></div>`;
  if(!goals.length){
    html+=`<div class="empty">${ICON.target}<p>No paths yet</p><p class="sub">Create your first learning goal to get started.</p></div>`;
  }else{
    goals.forEach(g=>{
      const p=goalProgress(g), nc=g.courses.length, nt=goalTasks(g).length;
      html+=`<div class="goal-prog" data-open-goal="${g.id}">
        ${ring(p,48,5,g.color||'var(--amber)')}
        <div class="gp-body">
          <div class="gp-name"><span class="gp-dot" style="background:${g.color}"></span>${esc(g.title)}</div>
          <div class="gp-meta">${nc} course${nc!==1?'s':''} · ${nt} task${nt!==1?'s':''}</div>
          <div class="gp-bar"><i style="width:${p}%;background:linear-gradient(90deg,${g.color},#ffffff55)"></i></div>
        </div></div>`;
    });
  }
  html+=`</div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">${ICON.star}Today's targets</div><button class="btn btn-ghost btn-sm" data-nav="today">Open</button></div>`;
  if(!todayTasks.length){
    html+=`<div class="empty">${ICON.star}<p>Nothing pinned for today</p><p class="sub">Star tasks inside a course to focus on them today.</p></div>`;
  }else{
    todayTasks.slice(0,6).forEach(({t,c,g})=>{
      html+=`<div class="today-item">
        <div class="check ${t.done?'on':''}" data-toggle="${t.id}">${ICON.check}</div>
        <div style="flex:1;min-width:0"><div class="task-text ${t.done?'done':''}" style="font-size:13.5px">${esc(t.text)}</div>
        <div class="today-meta">${esc(g.title)} · ${esc(c.title)}</div></div></div>`;
    });
  }
  html+=`</div></div>`;
  content.innerHTML=html;
}

/* ============== Paths ============== */
function renderPaths(){
  crumb([{label:'Paths'}]);
  let html=`<div class="paths-grid">`;
  state.goals.forEach(g=>{
    const p=goalProgress(g), nc=g.courses.length, nt=goalTasks(g).length, nd=goalTasks(g).filter(t=>t.done).length;
    html+=`<div class="goal-card" style="--c:${g.color}" data-open-goal="${g.id}">
      <div class="gc-head">
        <div class="gc-title">${esc(g.title)}</div>
        <button class="icon-btn" data-action="edit-goal" data-id="${g.id}" title="Edit">${ICON.edit}</button>
      </div>
      <div class="gc-desc">${esc(g.description||'')}</div>
      <div class="gc-stats">
        <div class="gc-stat"><div class="n">${nc}</div><div class="l">courses</div></div>
        <div class="gc-stat"><div class="n">${nd}/${nt}</div><div class="l">tasks done</div></div>
      </div>
      <div class="gc-prog-row"><div class="gc-bar"><i style="width:${p}%"></i></div><div class="gc-pct">${p}%</div></div>
    </div>`;
  });
  html+=`<button class="add-goal-card" data-action="new-goal">${ICON.plus}<span>New learning path</span></button>
  <button class="add-goal-card import-path-card" data-action="import-path">${ICON.download}<span>Import a path file</span></button></div>`;
  content.innerHTML=html;
}

/* ============== Goal detail ============== */
function renderGoal(){
  const g=state.goals.find(x=>x.id===state.ui.goalId);
  if(!g){ go('paths'); return; }
  crumb([{label:'Paths',view:'paths'},{label:g.title}]);
  const p=goalProgress(g), nc=g.courses.length, nt=goalTasks(g).length, nd=goalTasks(g).filter(t=>t.done).length;
  let html=`
  <div class="gd-head">
    <div class="gd-icon" style="background:linear-gradient(135deg,${g.color},${g.color}aa)">${ICON.target}</div>
    <div style="flex:1">
      <div class="gd-title">${esc(g.title)}</div>
      <div class="gd-desc">${esc(g.description||'')}</div>
    </div>
    <button class="icon-btn" data-action="export-path" data-id="${g.id}" title="Export / share this path">${ICON.share}</button>
    <button class="icon-btn" data-action="edit-goal" data-id="${g.id}" title="Edit path">${ICON.edit}</button>
    <button class="icon-btn danger" data-action="del-goal" data-id="${g.id}" title="Delete path">${ICON.trash}</button>
  </div>
  <div class="gd-meta-row">
    <div class="gd-meta"><div class="n">${p}%</div><div class="l">complete</div></div>
    <div class="gd-meta"><div class="n">${nc}</div><div class="l">courses</div></div>
    <div class="gd-meta"><div class="n">${nd}/${nt}</div><div class="l">tasks done</div></div>
    <div class="gd-meta-bar"><div class="l" style="color:var(--faint);font-size:11.5px">Path progress</div><div class="gp-bar"><i style="width:${p}%;background:linear-gradient(90deg,${g.color},#ffffff55)"></i></div></div>
  </div>`;

  g.courses.forEach(c=>{
    const cp=courseProgress(c), open=!!state.ui.openCourses[c.id];
    html+=`<div class="course ${open?'open':''}" data-course="${c.id}">
      <div class="course-head" data-toggle-course="${c.id}">
        <span class="drag-grip course-grip" title="Drag to reorder">${ICON.grip}</span>
        <span class="course-caret">${ICON.caret}</span>
        <div class="course-info">
          <div class="course-name">${esc(c.title)} ${statusTag(c.status)}</div>
          ${c.description?`<div class="course-desc">${esc(c.description)}</div>`:''}
        </div>
        <div class="course-prog">
          <div class="course-bar"><i style="width:${cp}%"></i></div>
          <span class="course-pct">${cp}%</span>
          <button class="icon-btn" data-action="edit-course" data-id="${c.id}" title="Edit course">${ICON.edit}</button>
          <button class="icon-btn danger" data-action="del-course" data-id="${c.id}" title="Delete course">${ICON.trash}</button>
        </div>
      </div>
      <div class="course-body">`;
    c.sections.forEach(s=>{
      const sd=s.tasks.filter(t=>t.done).length;
      const ncount=s.notes.length;
      html+=`<div class="section" data-section="${s.id}">
        <div class="section-head">
          <span class="drag-grip sec-grip" title="Drag to reorder">${ICON.grip}</span>
          <span class="section-name" contenteditable="true" data-edit-section="${s.id}">${esc(s.title)}</span>
          <span class="section-count">${sd}/${s.tasks.length}</span>
          <button class="section-notes-link inline" data-action="open-notes" data-c="${c.id}" data-s="${s.id}" title="Open notes">${ICON.note}${ncount? ncount+'' : ''}<span class="snl-label">Notes</span></button>
          <div style="flex:1"></div>
          <button class="icon-btn" data-action="rename-section" data-id="${s.id}" title="Rename section">${ICON.edit}</button>
          <button class="icon-btn danger" data-action="del-section" data-id="${s.id}" title="Delete section">${ICON.trash}</button>
        </div>`;
      s.tasks.forEach(t=>{
        html+=`<div class="task" data-task="${t.id}">
          <span class="drag-grip task-grip" title="Drag to reorder / move">${ICON.grip}</span>
          <div class="check ${t.done?'on':''}" data-toggle="${t.id}">${ICON.check}</div>
          <span class="task-text ${t.done?'done':''}" contenteditable="true" data-edit-task="${t.id}">${esc(t.text)}</span>
          <button class="icon-btn task-today-btn ${t.today?'on':''}" data-action="star-task" data-id="${t.id}" title="Pin to today">${t.today?ICON.star:ICON.starOff}</button>
          <button class="icon-btn danger" data-action="del-task" data-id="${t.id}" title="Delete task">${ICON.trash}</button>
        </div>`;
      });
      html+=`<button class="add-inline" data-action="add-task" data-id="${s.id}">${ICON.plus}Add task</button></div>`;
    });
    html+=`<button class="add-inline add-section-btn" data-action="add-section" data-id="${c.id}">${ICON.plus}Add section</button>`;
    html+=`</div></div>`;
  });
  html+=`<button class="btn add-course-btn" data-action="new-course" data-id="${g.id}">${ICON.plus}Add course / sub-goal</button>`;
  content.innerHTML=html;
  bindGoalDnD(g);
}

/* ====== Drag-to-reorder (courses within a path, sections within a course) ====== */
let dndEl=null, dndType=null, dndParent=null;
function dragAfter(container, y, selector){
  const els=[...container.querySelectorAll(':scope > '+selector+':not(.dragging)')];
  let best={offset:-Infinity, el:null};
  for(const child of els){
    const box=child.getBoundingClientRect();
    const offset=y - box.top - box.height/2;
    if(offset<0 && offset>best.offset) best={offset, el:child};
  }
  return best.el;
}
function bindGoalDnD(g){
  // ---- courses ----
  content.querySelectorAll(':scope > .course').forEach(el=>{
    const grip=el.querySelector('.course-grip');
    if(grip){
      grip.addEventListener('mousedown',e=>{ e.stopPropagation(); el.draggable=true; });
      grip.addEventListener('click',e=>e.stopPropagation());
    }
    el.addEventListener('dragstart',e=>{ dndEl=el; dndType='course'; el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    el.addEventListener('mouseup',()=>{ if(!el.classList.contains('dragging')) el.draggable=false; });
    el.addEventListener('dragend',()=>{
      el.draggable=false; el.classList.remove('dragging');
      if(dndType==='course'){ const ids=[...content.querySelectorAll(':scope > .course')].map(x=>x.dataset.course); Store.reorderCourses(g.id, ids); }
      dndEl=null; dndType=null;
    });
  });
  content.addEventListener('dragover', onContentDragOver);

  // ---- sections (within their own course-body) ----
  content.querySelectorAll('.section').forEach(el=>{
    const grip=el.querySelector('.sec-grip');
    if(grip){ grip.addEventListener('mousedown',e=>{ e.stopPropagation(); el.draggable=true; }); grip.addEventListener('click',e=>e.stopPropagation()); }
    el.addEventListener('dragstart',e=>{ e.stopPropagation(); dndEl=el; dndType='section'; dndParent=el.parentElement; el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    el.addEventListener('mouseup',()=>{ if(!el.classList.contains('dragging')) el.draggable=false; });
    el.addEventListener('dragend',()=>{
      el.draggable=false; el.classList.remove('dragging');
      if(dndType==='section' && dndParent){
        const courseEl=dndParent.closest('.course'); const cid=courseEl&&courseEl.dataset.course;
        const ids=[...dndParent.querySelectorAll(':scope > .section')].map(x=>x.dataset.section);
        if(cid) Store.reorderSections(cid, ids);
      }
      dndEl=null; dndType=null; dndParent=null;
    });
  });
  content.querySelectorAll('.course-body').forEach(body=>{
    body.addEventListener('dragover',e=>{
      if(dndType!=='section'||!dndEl||dndEl.parentElement!==body) return;
      e.preventDefault(); e.stopPropagation();
      const after=dragAfter(body, e.clientY, '.section');
      const anchor=body.querySelector('.add-section-btn');
      if(after==null) body.insertBefore(dndEl, anchor); else body.insertBefore(dndEl, after);
    });
  });

  // ---- tasks (reorder within a section AND move across sections) ----
  content.querySelectorAll('.task').forEach(el=>{
    const grip=el.querySelector('.task-grip');
    if(grip){ grip.addEventListener('mousedown',e=>{ e.stopPropagation(); el.draggable=true; }); grip.addEventListener('click',e=>e.stopPropagation()); }
    el.addEventListener('dragstart',e=>{ e.stopPropagation(); dndEl=el; dndType='task'; el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    el.addEventListener('mouseup',()=>{ if(!el.classList.contains('dragging')) el.draggable=false; });
    el.addEventListener('dragend',()=>{
      el.draggable=false; el.classList.remove('dragging');
      if(dndType==='task'){
        const sec=el.closest('.section'); const sid=sec&&sec.dataset.section;
        if(sid){ const ids=[...sec.querySelectorAll('.task')].map(x=>x.dataset.task); Store.reorderTasks(sid, ids); render(); }
      }
      dndEl=null; dndType=null;
    });
  });
  content.querySelectorAll('.section').forEach(sec=>{
    sec.addEventListener('dragover',e=>{
      if(dndType!=='task'||!dndEl) return;
      e.preventDefault(); e.stopPropagation();
      const after=dragAfterTasks(sec, e.clientY);
      const anchor=sec.querySelector('.add-inline');
      if(after==null) sec.insertBefore(dndEl, anchor); else sec.insertBefore(dndEl, after);
    });
  });
}
function dragAfterTasks(sec, y){
  const els=[...sec.querySelectorAll('.task:not(.dragging)')];
  let best={offset:-Infinity, el:null};
  for(const child of els){ const box=child.getBoundingClientRect(); const off=y-box.top-box.height/2; if(off<0 && off>best.offset) best={offset:off, el:child}; }
  return best.el;
}
function onContentDragOver(e){
  if(dndType!=='course'||!dndEl) return;
  e.preventDefault();
  const after=dragAfter(content, e.clientY, '.course');
  const anchor=content.querySelector('.add-course-btn');
  if(after==null) content.insertBefore(dndEl, anchor); else content.insertBefore(dndEl, after);
}

/* ====== Focus page (Pomodoro + atom timer + task chooser) ====== */
const Focus={ taskId:null, mode:'focus', remaining:0, total:0, timer:null, running:false,
  focusMin:25, breakMin:5, elapsedFocus:0, subject:'Focus session', items:[], started:false };

function focusReset(keepTarget){
  pauseFocus&&pauseFocus();
  Focus.mode='focus';
  Focus.total=Focus.focusMin*60; Focus.remaining=Focus.total; Focus.running=false; Focus.elapsedFocus=0; Focus.started=false;
  if(!keepTarget){ Focus.taskId=null; Focus.subject='Focus session'; Focus.items=[]; }
}

function renderFocus(){
  crumb([{label:'Focus'}]);
  const hasItems=Focus.items.length>0;
  const checklist = hasItems
    ? Focus.items.map((it,i)=>`<div class="fc-item ${it.done?'done':''}" data-fi="${i}">
        <div class="check ${it.done?'on':''}">${ICON.check}</div><span>${esc(it.text)}</span></div>`).join('')
    : `<div class="fc-empty">Nothing added yet. Type what you're working on, or pick from your paths.</div>`;
  content.innerHTML=`
  <div class="focus-page">
    <div class="focus-left">
      <div class="fp-card">
        <div class="fp-title">What are you working on?</div>
        <div class="fp-input-row">
          <input id="fp-subject" placeholder="e.g. Static Routing lab…" value="${Focus.subject==='Focus session'?'':esc(Focus.subject)}">
          <button class="btn btn-ghost btn-sm" id="fp-add" title="Add to checklist">${ICON.plus}</button>
        </div>
        <button class="btn btn-ghost btn-sm fp-choose" id="fp-choose">${ICON.layers} Choose from my paths</button>
      </div>
      <div class="fp-card">
        <div class="fp-title">Session checklist</div>
        <div class="fc-list" id="fc-list">${checklist}</div>
        ${hasItems?`<button class="btn btn-ghost btn-sm" id="fp-clear" style="margin-top:8px">Clear list</button>`:''}
      </div>
    </div>
    <div class="focus-right">
      <div class="focus-subject" id="focus-subject">${esc(Focus.subject)}</div>
      <div class="focus-mode"><button id="fm-focus" class="${Focus.mode==='focus'?'on':''}">Focus</button><button id="fm-break" class="${Focus.mode==='break'?'on':''}">Break</button></div>
      <div class="focus-ring" id="focus-ring"></div>
      <div class="focus-readout"><div class="focus-time" id="f-time">${fmtClock(Focus.remaining)}</div><div class="focus-label" id="f-lbl">${Focus.mode==='focus'?'FOCUS':'BREAK'}</div></div>
      <div class="focus-controls">
        <button class="btn btn-ghost btn-sm" id="f-reset">Reset</button>
        <button class="btn btn-primary" id="f-toggle">${Focus.running?ICON.pause+' Pause':ICON.play+' Start'}</button>
      </div>
      <div class="focus-presets">
        <span>Focus:</span>
        <button data-fmin="15" class="${Focus.focusMin===15?'on':''}">15</button>
        <button data-fmin="25" class="${Focus.focusMin===25?'on':''}">25</button>
        <button data-fmin="50" class="${Focus.focusMin===50?'on':''}">50</button>
        <span style="margin-left:10px">Break:</span>
        <button data-bmin="5" class="${Focus.breakMin===5?'on':''}">5</button>
        <button data-bmin="10" class="${Focus.breakMin===10?'on':''}">10</button>
      </div>
    </div>
  </div>`;
  if(!Focus.started){ Focus.total=(Focus.mode==='focus'?Focus.focusMin:Focus.breakMin)*60; if(!Focus.running) Focus.remaining=Focus.total; }
  rebuildFocus();
  wireFocus();
}

function wireFocus(){
  const subj=$('#fp-subject');
  if(subj){
    subj.addEventListener('input',()=>{ Focus.subject=subj.value.trim()||'Focus session'; const fs=$('#focus-subject'); if(fs) fs.textContent=Focus.subject; });
    subj.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addFocusItem(subj.value); subj.value=''; } });
  }
  const add=$('#fp-add'); if(add) add.onclick=()=>{ const v=$('#fp-subject').value; addFocusItem(v); $('#fp-subject').value=''; };
  const choose=$('#fp-choose'); if(choose) choose.onclick=focusChooser;
  const clear=$('#fp-clear'); if(clear) clear.onclick=()=>{ Focus.items=[]; Focus.taskId=null; renderFocus(); };
  // checklist toggles
  document.querySelectorAll('#fc-list .fc-item').forEach(el=>el.onclick=()=>{
    const i=+el.dataset.fi; const it=Focus.items[i]; if(!it) return;
    it.done=!it.done;
    if(it.id){ Store.toggleTask(it.id); }
    renderFocus();
  });
  // timer controls
  const setMode=(m)=>{ Focus.mode=m; pauseFocus(); Focus.started=false; Focus.total=(m==='focus'?Focus.focusMin:Focus.breakMin)*60; Focus.remaining=Focus.total; $('#fm-focus').classList.toggle('on',m==='focus'); $('#fm-break').classList.toggle('on',m==='break'); rebuildFocus(); };
  $('#fm-focus').onclick=()=>setMode('focus');
  $('#fm-break').onclick=()=>setMode('break');
  $('#f-toggle').onclick=()=> Focus.running? pauseFocus() : startFocus();
  $('#f-reset').onclick=()=>{ pauseFocus(); Focus.started=false; Focus.remaining=Focus.total; drawFocus(); };
  document.querySelectorAll('[data-fmin]').forEach(b=>b.onclick=()=>{ Focus.focusMin=+b.dataset.fmin; document.querySelectorAll('[data-fmin]').forEach(x=>x.classList.toggle('on',x===b)); if(Focus.mode==='focus'){ pauseFocus(); Focus.started=false; Focus.total=Focus.focusMin*60; Focus.remaining=Focus.total; rebuildFocus(); } });
  document.querySelectorAll('[data-bmin]').forEach(b=>b.onclick=()=>{ Focus.breakMin=+b.dataset.bmin; document.querySelectorAll('[data-bmin]').forEach(x=>x.classList.toggle('on',x===b)); if(Focus.mode==='break'){ pauseFocus(); Focus.started=false; Focus.total=Focus.breakMin*60; Focus.remaining=Focus.total; rebuildFocus(); } });
}

function addFocusItem(text){
  const t=(text||'').trim(); if(!t) return;
  Focus.items.push({ text:t, done:false });
  if(Focus.subject==='Focus session') Focus.subject=t;
  renderFocus();
}

function focusChooser(){
  const goals=state.goals;
  if(!goals.length){ toast('Create a path first'); return; }
  let gId=goals[0].id;
  const build=()=>{
    const g=goals.find(x=>x.id===gId)||goals[0]; gId=g.id;
    const courses=g.courses;
    const cId=(window._fcC && courses.find(c=>c.id===window._fcC))?window._fcC:(courses[0]&&courses[0].id);
    window._fcC=cId;
    const c=courses.find(x=>x.id===cId);
    const sections=c?c.sections:[];
    const sId=(window._fcS && sections.find(s=>s.id===window._fcS))?window._fcS:(sections[0]&&sections[0].id);
    window._fcS=sId;
    const sct=sections.find(x=>x.id===sId);
    const gOpts=goals.map(x=>`<option value="${x.id}" ${x.id===gId?'selected':''}>${esc(x.title)}</option>`).join('');
    const cOpts=courses.map(x=>`<option value="${x.id}" ${x.id===cId?'selected':''}>${esc(x.title)}</option>`).join('')||'<option>—</option>';
    const sOpts=sections.map(x=>`<option value="${x.id}" ${x.id===sId?'selected':''}>${esc(x.title)}</option>`).join('')||'<option>—</option>';
    const tasks=sct?sct.tasks:[];
    const tOpts=`<option value="__section">▶ Whole section (${tasks.length} task${tasks.length!==1?'s':''})</option>`+
      tasks.map(t=>`<option value="${t.id}">${esc(t.text)}</option>`).join('');
    openModal(`
      <div class="modal-head"><div class="modal-title">Choose what to focus on</div></div>
      <div class="modal-body">
        <div class="field"><label>Path</label><div class="np-sel"><select id="fc-g">${gOpts}</select></div></div>
        <div class="field"><label>Course</label><div class="np-sel"><select id="fc-c">${cOpts}</select></div></div>
        <div class="field"><label>Section</label><div class="np-sel"><select id="fc-s">${sOpts}</select></div></div>
        <div class="field"><label>Task</label><div class="np-sel"><select id="fc-t">${tOpts}</select></div></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
        <button class="btn btn-primary" id="fc-go">Start focusing</button>
      </div>`);
    $('#fc-g').onchange=e=>{ gId=e.target.value; window._fcC=null; window._fcS=null; build(); };
    $('#fc-c').onchange=e=>{ window._fcC=e.target.value; window._fcS=null; build(); };
    $('#fc-s').onchange=e=>{ window._fcS=e.target.value; build(); };
    $('#fc-go').onclick=()=>{
      const sel=$('#fc-t').value;
      if(sel==='__section'){
        Focus.subject=(sct?sct.title:'Section');
        Focus.items=tasks.map(t=>({id:t.id,text:t.text,done:t.done}));
        Focus.taskId=null;
      }else{
        const t=tasks.find(x=>x.id===sel);
        Focus.subject=t?t.text:'Focus session';
        Focus.items=t?[{id:t.id,text:t.text,done:t.done}]:[];
        Focus.taskId=t?t.id:null;
      }
      closeModal(); renderFocus();
    };
  };
  build();
}

function fmtClock(s){ const m=Math.floor(s/60), ss=s%60; return m+':'+(ss<10?'0':'')+ss; }

/* ---- Animated atom (canvas): real-ish nucleus (protons+neutrons jitter)
   + 3 electrons orbiting tilted elliptical paths at different speeds, with trails.
   A thin progress ring around it tracks the timer. ---- */
const Atom={ raf:null, t:0, dpr:1, size:250,
  orbits:[
    { rx:80, ry:28, tilt:0,             speed:1.70, phase:0 },
    { rx:80, ry:28, tilt:Math.PI/5,     speed:1.30, phase:1.3 },
    { rx:80, ry:28, tilt:2*Math.PI/5,   speed:1.95, phase:2.6 },
    { rx:80, ry:28, tilt:3*Math.PI/5,   speed:1.05, phase:3.9 },
    { rx:80, ry:28, tilt:4*Math.PI/5,   speed:1.50, phase:5.2 },
  ],
  trails:[[],[],[],[],[]] };

function buildAtomCanvas(){
  const el=$('#focus-ring'); if(!el) return;
  if(el.dataset.built) return;
  const S=Atom.size;
  el.innerHTML=`<canvas id="atom-canvas" width="${S}" height="${S}" style="width:${S}px;height:${S}px;display:block"></canvas>`;
  el.dataset.built='1';
  Atom.dpr=Math.min(2, window.devicePixelRatio||1);
  const cv=$('#atom-canvas');
  cv.width=S*Atom.dpr; cv.height=S*Atom.dpr;
  cv.getContext('2d').scale(Atom.dpr, Atom.dpr);
  Atom.trails=[[],[],[],[],[]];
  if(!Atom.raf) Atom.raf=requestAnimationFrame(atomFrame);
}
function stopAtom(){ if(Atom.raf){ cancelAnimationFrame(Atom.raf); Atom.raf=null; } }

function atomFrame(){
  const cv=$('#atom-canvas');
  if(!cv){ Atom.raf=null; return; }   // user left the Focus page
  const ctx=cv.getContext('2d');
  const S=Atom.size, cx=S/2, cy=S/2;
  const focusMode=Focus.mode==='focus';
  const nucCol=focusMode?'#F3AC40':'#2DD4BF';
  const eCol=focusMode?'#2DD4BF':'#F3AC40';
  const running=Focus.running;
  const dt = running ? 0.016 : 0.004;   // slow drift when paused, lively when running
  Atom.t += dt;

  ctx.clearRect(0,0,S,S);

  /* progress ring */
  const pct=Focus.total? (1-Focus.remaining/Focus.total) : 0;
  const r=S/2-6;
  ctx.lineWidth=6; ctx.lineCap='round';
  ctx.strokeStyle='rgba(255,255,255,.06)';
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  if(pct>0){ ctx.strokeStyle=nucCol; ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*pct); ctx.stroke(); }

  /* orbit paths (faint) */
  Atom.orbits.forEach(o=>{
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(o.tilt);
    ctx.strokeStyle=focusMode?'rgba(45,212,191,.28)':'rgba(243,172,64,.28)';
    ctx.lineWidth=1.4; ctx.beginPath(); ctx.ellipse(0,0,o.rx,o.ry,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  });

  /* electrons with trails (drawn so some pass BEHIND nucleus for 3D feel) */
  const positions=Atom.orbits.map((o,i)=>{
    const ang=o.phase + Atom.t*o.speed;
    const lx=Math.cos(ang)*o.rx, ly=Math.sin(ang)*o.ry;
    const x=cx + lx*Math.cos(o.tilt) - ly*Math.sin(o.tilt);
    const y=cy + lx*Math.sin(o.tilt) + ly*Math.cos(o.tilt);
    const behind=Math.sin(ang)<0;   // back half of the ellipse
    const tr=Atom.trails[i]; tr.push({x,y}); if(tr.length>14) tr.shift();
    return {x,y,behind,tr};
  });
  const drawElectron=(p)=>{
    for(let k=0;k<p.tr.length;k++){ const a=k/p.tr.length; ctx.globalAlpha=a*0.5; ctx.fillStyle=eCol; ctx.beginPath(); ctx.arc(p.tr[k].x,p.tr[k].y, 1+a*3.2,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1; ctx.fillStyle=eCol; ctx.shadowColor=eCol; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  };
  positions.filter(p=>p.behind).forEach(drawElectron);

  /* nucleus: clustered protons (accent) + neutrons (grey), gentle jitter */
  const nucReal=[
    {dx:0,dy:0,proton:true},{dx:-9,dy:-4,proton:false},{dx:9,dy:-5,proton:true},
    {dx:-6,dy:7,proton:true},{dx:7,dy:7,proton:false},{dx:0,dy:-11,proton:false},
    {dx:-12,dy:3,proton:false},{dx:12,dy:2,proton:true},{dx:2,dy:12,proton:true},
  ];
  const glowR=26+Math.sin(Atom.t*2)*2;
  const g=ctx.createRadialGradient(cx,cy,2,cx,cy,glowR+14);
  g.addColorStop(0, focusMode?'rgba(243,172,64,.38)':'rgba(45,212,191,.38)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,glowR+14,0,Math.PI*2); ctx.fill();
  nucReal.forEach((n,idx)=>{
    const j=running?1.4:0.5;
    const jx=Math.sin(Atom.t*3+idx)*j, jy=Math.cos(Atom.t*2.6+idx*1.3)*j;
    const x=cx+n.dx+jx, y=cy+n.dy+jy, rr=6.2;
    const rg=ctx.createRadialGradient(x-2,y-2,1,x,y,rr);
    if(n.proton){ rg.addColorStop(0,'#FFE6B0'); rg.addColorStop(.5,'#F3AC40'); rg.addColorStop(1,'#9c5e14'); }
    else { rg.addColorStop(0,'#dfe7f0'); rg.addColorStop(.5,'#9fb2c8'); rg.addColorStop(1,'#5c6f86'); }
    ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2); ctx.fill();
  });

  /* electrons in front */
  positions.filter(p=>!p.behind).forEach(drawElectron);

  /* readout text */
  const tEl=$('#f-time'); if(tEl) tEl.textContent=fmtClock(Focus.remaining);
  const lEl=$('#f-lbl'); if(lEl) lEl.textContent=focusMode?'FOCUS':'BREAK';

  Atom.raf=requestAnimationFrame(atomFrame);
}

function drawFocus(){ buildAtomCanvas(); }
function rebuildFocus(){ const el=$('#focus-ring'); if(el){ el.dataset.built=''; } buildAtomCanvas(); }
function startFocus(){
  if(Focus.running) return; Focus.running=true;
  const tg=$('#f-toggle'); if(tg) tg.innerHTML=ICON.pause+' Pause';
  Focus.timer=setInterval(()=>{
    Focus.remaining--;
    if(Focus.mode==='focus') Focus.elapsedFocus++;
    if(Focus.remaining<=0){ finishFocusPhase(); }
    drawFocus();
  },1000);
}
function pauseFocus(){ Focus.running=false; if(Focus.timer){ clearInterval(Focus.timer); Focus.timer=null; } const tg=$('#f-toggle'); if(tg) tg.innerHTML=ICON.play+' Start'; }
function commitFocus(){ const mins=Math.round(Focus.elapsedFocus/60); if(mins>0){ Store.logFocus(Focus.taskId, mins); Focus.elapsedFocus=Focus.elapsedFocus%60; } }
function finishFocusPhase(){
  pauseFocus();
  if(Focus.mode==='focus'){
    commitFocus();
    window.proton.notify('✅ Focus session done', 'Time for a '+Focus.breakMin+'-minute break.');
    Focus.mode='break'; Focus.total=Focus.breakMin*60; Focus.remaining=Focus.total;
    $('#fm-focus')&&$('#fm-focus').classList.remove('on'); $('#fm-break')&&$('#fm-break').classList.add('on');
  }else{
    window.proton.notify('Break over', 'Ready for another focus session?');
    Focus.mode='focus'; Focus.total=Focus.focusMin*60; Focus.remaining=Focus.total;
    $('#fm-break')&&$('#fm-break').classList.remove('on'); $('#fm-focus')&&$('#fm-focus').classList.add('on');
  }
  rebuildFocus();
}

/* ============== Board ============== */
let dragId=null;
let boardAddCol=null;

function renderBoard(){
  crumb([{label:'Board'}]);
  const goals=state.goals;
  const filter=state.ui.boardGoal||'all';
  const filterPath = filter!=='all' ? goals.find(g=>g.id===filter) : null;
  if(filter!=='all' && !filterPath){ state.ui.boardGoal='all'; return renderBoard(); }
  let courses=[];
  goals.forEach(g=>{ if(filter==='all'||filter===g.id) g.courses.forEach(c=>courses.push({c,g})); });

  let opts=`<option value="all">All paths</option>`+goals.map(g=>`<option value="${g.id}" ${filter===g.id?'selected':''}>${esc(g.title)}</option>`).join('');
  let html=`<div class="board-bar">
    <div class="page-title" style="font-family:'Space Grotesk'">Board</div>
    <div style="flex:1"></div>
    ${goals.length?`<button class="btn btn-primary btn-sm" data-add-col="todo">${ICON.plus}Add course</button>`:''}
    <div class="goal-filter"><span style="color:var(--muted);font-size:13px">Path:</span><select id="board-filter">${opts}</select></div>
  </div>`;

  if(!goals.length){
    html+=`<div class="empty" style="margin-top:40px">${ICON.layers}<p>No paths yet</p><p class="sub">Create a learning path first, then design and stage its courses here.</p>
      <button class="btn btn-primary btn-sm" data-action="new-goal" style="margin-top:14px">${ICON.plus}New path</button></div>`;
    content.innerHTML=html; return;
  }

  html+=`<div class="board-context">Designing road for: <b style="color:${filterPath?filterPath.color:'var(--amber)'}">${filterPath?esc(filterPath.title):'All paths'}</b> — drag cards across columns as you progress.</div>`;

  html+=`<div class="board">`;
  STATUSES.forEach(st=>{
    const items=courses.filter(x=>x.c.status===st.key);
    html+=`<div class="column" data-col="${st.key}">
      <div class="col-head"><span class="col-dot" style="background:${st.dot}"></span><span class="col-name">${st.label}</span><span class="col-count">${items.length}</span></div>`;
    items.forEach(({c,g})=>{
      const cp=courseProgress(c);
      html+=`<div class="bcard" draggable="true" data-card="${c.id}">
        ${cp===100&&courseTasks(c).length?`<div class="bcard-done-badge">${ICON.check}</div>`:''}
        <div class="bcard-goal" style="color:${g.color}"><span class="dot" style="background:${g.color}"></span>${esc(g.title)}</div>
        <div class="bcard-title">${esc(c.title)}</div>
        <div class="bcard-foot"><div class="bcard-bar"><i style="width:${cp}%"></i></div><span class="bcard-pct">${cp}%</span></div>
      </div>`;
    });
    if(boardAddCol===st.key){
      const sel = filter==='all'
        ? `<select class="board-add-path" id="board-add-path">${goals.map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select>`
        : `<div class="board-add-in">adding to <b style="color:${filterPath.color}">${esc(filterPath.title)}</b></div>`;
      html+=`<div class="add-box">
        <input type="text" class="add-box-input" id="board-add-input" placeholder="Course / sub-goal name…" autocomplete="off">
        ${sel}
        <div class="add-box-actions">
          <button class="btn btn-primary btn-sm" data-board-add="${st.key}">${ICON.plus}Add</button>
          <button class="btn btn-ghost btn-sm" data-board-cancel="1">Cancel</button>
        </div>
      </div>`;
    }else{
      if(!items.length) html+=`<div class="col-empty">Nothing here yet</div>`;
      html+=`<button class="col-add" data-add-col="${st.key}">${ICON.plus}Add a card</button>`;
    }
    html+=`</div>`;
  });
  html+=`</div>`;
  content.innerHTML=html;
  bindBoard();
}

async function submitBoardAdd(col){
  const inp=$('#board-add-input'); if(!inp) return;
  const title=inp.value.trim(); if(!title){ inp.focus(); return; }
  const filter=state.ui.boardGoal||'all';
  const gid = filter!=='all' ? filter : ($('#board-add-path')?.value || (state.goals[0]&&state.goals[0].id));
  const g=state.goals.find(x=>x.id===gid); if(!g){ toast('Pick a path first'); return; }
  await Store.addCourse(gid, {title, status:col});
  boardAddCol=col;
  renderBoard();
  toast('Added to '+STATUSES.find(s=>s.key===col).label);
}

function bindBoard(){
  $('#board-filter')?.addEventListener('change',e=>{ state.ui.boardGoal=e.target.value; boardAddCol=null; save(); renderBoard(); });
  document.querySelectorAll('[data-add-col]').forEach(b=>b.addEventListener('click',()=>{ boardAddCol=b.dataset.addCol; renderBoard(); }));
  document.querySelectorAll('[data-board-add]').forEach(b=>b.addEventListener('click',()=>submitBoardAdd(b.dataset.boardAdd)));
  document.querySelectorAll('[data-board-cancel]').forEach(b=>b.addEventListener('click',()=>{ boardAddCol=null; renderBoard(); }));
  if(boardAddCol){
    const inp=$('#board-add-input');
    if(inp){
      inp.focus();
      inp.addEventListener('keydown',e=>{
        if(e.key==='Enter'){ e.preventDefault(); submitBoardAdd(boardAddCol); }
        else if(e.key==='Escape'){ boardAddCol=null; renderBoard(); }
      });
    }
  }
  document.querySelectorAll('.bcard').forEach(card=>{
    card.addEventListener('dragstart',()=>{ dragId=card.dataset.card; card.classList.add('dragging'); });
    card.addEventListener('dragend',()=>{ card.classList.remove('dragging'); dragId=null; document.querySelectorAll('.column').forEach(c=>c.classList.remove('drag-over')); });
    card.addEventListener('click',e=>{ if(e.target.closest('.bcard')&&!card.classList.contains('dragging')) openCourseFromBoard(card.dataset.card); });
  });
  document.querySelectorAll('.column').forEach(col=>{
    col.addEventListener('dragover',e=>{ e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
    col.addEventListener('drop',e=>{
      e.preventDefault(); col.classList.remove('drag-over');
      if(!dragId) return;
      const f=findCourse(dragId); if(f){ Store.setCourseStatus(dragId, col.dataset.col); renderBoard(); }
    });
  });
}
function openCourseFromBoard(cid){
  const f=findCourse(cid); if(!f) return;
  state.ui.openCourses[cid]=true;
  go('goal', f.g.id);
}

/* ============== Achievements dashboard ============== */
let achMonth = null;
async function renderAchievements(){
  crumb([{label:'Achievements'}]);
  const now=new Date();
  const y = achMonth? achMonth.y : now.getFullYear();
  const m = achMonth? achMonth.m : now.getMonth();
  const start=new Date(y, m, 1).getTime();
  const end=new Date(y, m+1, 1).getTime();
  const monthName=new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});

  content.innerHTML=`<div class="ach-loading">Loading your achievements…</div>`;
  let a=null;
  try{ a=await window.proton.getAchievements(start, end); }catch(_){ a=null; }
  if(!a){ content.innerHTML=`<div class="empty" style="margin-top:60px">${ICON.trophy}<p>Could not load achievements</p></div>`; return; }

  const focusH=Math.floor(a.focusMinutes/60), focusM=a.focusMinutes%60;
  const focusStr = a.focusMinutes>=60 ? `${focusH}h ${focusM}m` : `${a.focusMinutes}m`;
  const maxDay=Math.max(1, ...Object.values(a.byDay||{}));
  const daysInMonth=new Date(y,m+1,0).getDate();
  let heat='';
  for(let d=1; d<=daysInMonth; d++){
    const key=new Date(y,m,d).toISOString().slice(0,10);
    const v=(a.byDay||{})[key]||0;
    const lvl = v===0?0 : v/maxDay>0.66?3 : v/maxDay>0.33?2 : 1;
    heat+=`<div class="heat-cell heat-${lvl}" title="${key}: ${v} task${v!==1?'s':''}"></div>`;
  }
  const maxPath=Math.max(1, ...(a.byPath||[]).map(p=>p.count));
  const pathBars=(a.byPath||[]).length
    ? a.byPath.map(p=>`<div class="ach-bar-row"><span class="ach-bar-label">${esc(p.title)}</span>
        <div class="ach-bar"><i style="width:${Math.round(p.count/maxPath*100)}%;background:${p.color}"></i></div>
        <span class="ach-bar-n">${p.count}</span></div>`).join('')
    : `<div class="ach-empty">No tasks completed yet this month.</div>`;
  const courseList=(a.coursesCompleted||[]).length
    ? a.coursesCompleted.map(c=>`<div class="ach-course">${ICON.check}<span>${esc(c.title)}</span>${c.path?`<span class="ach-course-path">${esc(c.path)}</span>`:''}</div>`).join('')
    : `<div class="ach-empty">No courses fully completed this month — keep going!</div>`;

  achData=a; achCtx={y,m,monthName,focusStr};
  content.innerHTML=`
  <div class="ach-toolbar no-print">
    <div class="board-bar" style="margin:0">
      <button class="btn btn-ghost btn-sm" id="ach-prev">Prev</button>
      <div class="page-title" style="font-family:'Space Grotesk';min-width:160px;text-align:center">${monthName}</div>
      <button class="btn btn-ghost btn-sm" id="ach-next">Next</button>
      <div class="ach-mode">
        <button id="am-report" class="on">Report</button>
        <button id="am-bang">✨ Big Bang</button>
      </div>
      <div style="flex:1"></div>
      <button class="btn btn-ghost btn-sm" id="ach-png">${ICON.share} Save image</button>
      <button class="btn btn-primary btn-sm" id="ach-print">${ICON.download} Save PDF / Print</button>
    </div>
  </div>
  <div class="ach-sheet" id="ach-sheet">
    <div class="ach-head">
      <div class="ach-head-mark">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <g fill="none" stroke="#1a1206" stroke-width="4" opacity="0.85">
            <ellipse cx="50" cy="50" rx="40" ry="15"/>
            <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(60 50 50)"/>
            <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(120 50 50)"/>
          </g>
          <circle cx="50" cy="50" r="11" fill="#1a1206"/>
        </svg>
      </div>
      <div><div class="ach-head-title">Achievements Report</div><div class="ach-head-sub">${monthName} · Proton — make your own universe</div></div>
    </div>
    <div class="ach-stats">
      <div class="ach-stat"><div class="n">${a.tasksCompleted}</div><div class="l">tasks completed</div></div>
      <div class="ach-stat"><div class="n">${a.coursesCompleted.length}</div><div class="l">courses finished</div></div>
      <div class="ach-stat"><div class="n">${focusStr}</div><div class="l">focus time</div></div>
      <div class="ach-stat"><div class="n">${a.streak}</div><div class="l">day streak</div></div>
      <div class="ach-stat"><div class="n">${a.activeDays}</div><div class="l">active days</div></div>
    </div>
    <div class="ach-grid">
      <div class="ach-panel">
        <div class="ach-panel-title">Progress by path</div>
        ${pathBars}
      </div>
      <div class="ach-panel">
        <div class="ach-panel-title">Courses completed</div>
        <div class="ach-courses">${courseList}</div>
      </div>
    </div>
    <div class="ach-panel">
      <div class="ach-panel-title">Daily activity — ${a.tasksCompleted} task${a.tasksCompleted!==1?'s':''} this month</div>
      <div class="heatmap">${heat}</div>
      <div class="heat-legend"><span>Less</span><i class="heat-cell heat-0"></i><i class="heat-cell heat-1"></i><i class="heat-cell heat-2"></i><i class="heat-cell heat-3"></i><span>More</span></div>
    </div>
    <div class="ach-foot">Generated by Proton · ${new Date().toLocaleDateString()} · github.com/MostafaHazeim25/Proton</div>
  </div>`;

  $('#ach-prev').onclick=()=>{ achMonth={y: m===0?y-1:y, m: m===0?11:m-1}; renderAchievements(); };
  $('#ach-next').onclick=()=>{ const nm=m===11?0:m+1, ny=m===11?y+1:y; const t=new Date(); if(new Date(ny,nm,1)>new Date(t.getFullYear(),t.getMonth(),1)) return; achMonth={y:ny,m:nm}; renderAchievements(); };
  $('#am-bang').onclick=renderBigBang;
  $('#ach-print').onclick=()=>{ window.print(); };
  $('#ach-png').onclick=async ()=>{
    const el=$('#ach-sheet'); const r=el.getBoundingClientRect();
    try{ const p=await window.proton.captureRegion(Math.floor(r.x),Math.floor(r.y),Math.ceil(r.width),Math.ceil(r.height)); if(p) toast('Image saved'); }
    catch(err){ notifyError('Could not save image'); }
  };
}

/* ============== Big Bang — cosmic achievements ============== */
let achData=null, achCtx=null, Bang={ raf:null, parts:[], phase:'idle', t:0, started:0 };
function renderBigBang(){
  const a=achData; if(!a){ renderAchievements(); return; }
  crumb([{label:'Achievements'}]);
  content.innerHTML=`
  <div class="ach-toolbar no-print">
    <div class="board-bar" style="margin:0">
      <button class="btn btn-ghost btn-sm" id="bb-back">${ICON.caret} Back to report</button>
      <div class="ach-mode" style="margin-left:8px">
        <button id="am-report">Report</button>
        <button id="am-bang" class="on">✨ Big Bang</button>
      </div>
      <div style="flex:1"></div>
      <button class="btn btn-ghost btn-sm" id="bb-replay">↻ Replay</button>
      <button class="btn btn-primary btn-sm" id="bb-png">${ICON.share} Save image</button>
    </div>
  </div>
  <div class="bb-stage" id="bb-stage">
    <canvas id="bb-canvas"></canvas>
    <div class="bb-overlay" id="bb-overlay">
      <div class="bb-proton" id="bb-proton" title="Click to ignite">
        <span class="bb-core"></span>
      </div>
      <div class="bb-hint">Click the proton to ignite your universe</div>
    </div>
    <div class="bb-legend" id="bb-legend" style="opacity:0">
      <div><i style="background:#FFD98A"></i> star = task done</div>
      <div><i style="background:#8fd0ff"></i> planet = course finished</div>
      <div><i style="background:#c9a6ff"></i> galaxy = a path</div>
    </div>
    <div class="bb-readout" id="bb-readout" style="opacity:0"></div>
  </div>`;
  $('#bb-back').onclick=()=>{ stopBang(); renderAchievements(); };
  $('#am-report').onclick=()=>{ stopBang(); renderAchievements(); };
  $('#bb-replay').onclick=()=>{ igniteBang(true); };
  $('#bb-png').onclick=async ()=>{
    const el=$('#bb-stage'); const r=el.getBoundingClientRect();
    try{ const p=await window.proton.captureRegion(Math.floor(r.x),Math.floor(r.y),Math.ceil(r.width),Math.ceil(r.height)); if(p) toast('Image saved'); }
    catch(_){ notifyError('Could not save image'); }
  };
  $('#bb-proton').onclick=()=>igniteBang(false);
  setupBangCanvas();
}

function setupBangCanvas(){
  const stage=$('#bb-stage'), cv=$('#bb-canvas'); if(!cv) return;
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const resize=()=>{ if(!document.body.contains(cv)){ if(Bang._resize){ window.removeEventListener('resize',Bang._resize); Bang._resize=null; } return; } const r=stage.getBoundingClientRect(); cv.width=r.width*dpr; cv.height=r.height*dpr; cv.style.width=r.width+'px'; cv.style.height=r.height+'px'; const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); Bang.w=r.width; Bang.h=r.height; };
  resize(); Bang._resize=resize; window.addEventListener('resize', resize);
  Bang.phase='idle'; Bang.parts=[]; drawBangIdle();
}
function drawBangIdle(){
  const cv=$('#bb-canvas'); if(!cv){ Bang.raf=null; return; }
  const ctx=cv.getContext('2d'); ctx.clearRect(0,0,Bang.w,Bang.h);
  // faint starfield backdrop
  starfield(ctx);
  if(Bang.phase==='idle'){ Bang.raf=requestAnimationFrame(drawBangIdle); }
}
let _stars=null;
function starfield(ctx){
  if(!_stars){ _stars=[]; for(let i=0;i<90;i++) _stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.3+0.2,tw:Math.random()*6}); }
  ctx.save();
  _stars.forEach(s=>{ const a=0.3+0.5*Math.abs(Math.sin(Bang.t*0.6+s.tw)); ctx.globalAlpha=a*0.5; ctx.fillStyle='#cfe9e4'; ctx.beginPath(); ctx.arc(s.x*Bang.w, s.y*Bang.h, s.r,0,Math.PI*2); ctx.fill(); });
  ctx.restore();
}

function igniteBang(replay){
  const a=achData; if(!a) return;
  const ov=$('#bb-overlay'); if(ov) ov.classList.add('gone');
  const cv=$('#bb-canvas'); if(!cv) return;
  const cx=Bang.w/2, cy=Bang.h/2;
  // Build particles from real achievements
  const parts=[];
  const palette=(a.byPath&&a.byPath.length)?a.byPath.map(p=>p.color):['#2DD4BF'];
  const mk=(type,color,size)=>{
    const ang=Math.random()*Math.PI*2;
    const spd=(type==='galaxy'?1.1:type==='planet'?1.9:2.6)*(0.6+Math.random()*0.9);
    // target ring radius by type
    const ring=type==='galaxy'? (70+Math.random()*40) : type==='planet'? (120+Math.random()*70) : (150+Math.random()*120);
    const ta=Math.random()*Math.PI*2;
    parts.push({ x:cx,y:cy, vx:Math.cos(ang)*spd*60, vy:Math.sin(ang)*spd*60,
      tx:cx+Math.cos(ta)*ring, ty:cy+Math.sin(ta)*ring*0.62, color, size, type, tw:Math.random()*6, spin:ta, ring, sp:(0.2+Math.random()*0.5)*(Math.random()<.5?-1:1) });
  };
  // galaxies (paths)
  (a.byPath||[]).forEach((p,i)=> mk('galaxy', p.color, 3.2));
  // planets (courses completed)
  for(let i=0;i<a.coursesCompleted.length;i++) mk('planet', '#8fd0ff', 4.2);
  // stars (tasks completed) — cap for perf
  const starN=Math.min(400, a.tasksCompleted);
  for(let i=0;i<starN;i++) mk('star', palette[i%palette.length], 1.6+Math.random()*1.4);
  // a little extra cosmic dust so even small months feel alive
  for(let i=0;i<120;i++) mk('star', '#cfe9e4', 0.8+Math.random()*1.2);
  // comet for streak
  if(a.streak>0){ parts.push({comet:true, x:cx, y:cy, vx:(Math.random()<.5?-1:1)*220, vy:-120, color:'#FFE6B0', size:2.6, tail:[] }); }
  Bang.parts=parts; Bang.phase='boom'; Bang.started=performance.now();
  // flash
  flashBang();
  if(Bang.raf) cancelAnimationFrame(Bang.raf);
  Bang.raf=requestAnimationFrame(bangFrame);
  // reveal numbers after the dust settles
  setTimeout(()=>{ const r=$('#bb-readout'); if(r){ r.innerHTML=bangReadout(a); r.style.opacity='1'; } const lg=$('#bb-legend'); if(lg) lg.style.opacity='1'; }, 2600);
}
function flashBang(){ const s=$('#bb-stage'); if(!s) return; const f=document.createElement('div'); f.className='bb-flash'; s.appendChild(f); setTimeout(()=>f.remove(),700); }
function bangReadout(a){
  const fh=Math.floor(a.focusMinutes/60), fm=a.focusMinutes%60; const fs=a.focusMinutes>=60?`${fh}h ${fm}m`:`${a.focusMinutes}m`;
  return `<div class="bb-title">Your universe · ${achCtx?achCtx.monthName:''}</div>
    <div class="bb-nums">
      <div><b>${a.tasksCompleted}</b><span>stars (tasks)</span></div>
      <div><b>${a.coursesCompleted.length}</b><span>planets (courses)</span></div>
      <div><b>${(a.byPath||[]).length}</b><span>galaxies (paths)</span></div>
      <div><b>${fs}</b><span>focus energy</span></div>
      <div><b>${a.streak}</b><span>day streak comet</span></div>
    </div>`;
}
function bangFrame(){
  const cv=$('#bb-canvas'); if(!cv){ Bang.raf=null; return; }
  const ctx=cv.getContext('2d'); const W=Bang.w,H=Bang.h, cx=W/2, cy=H/2;
  Bang.t+=0.016;
  const el=performance.now()-Bang.started; const settle=Math.min(1, el/2200); // 0..1 ease to targets
  ctx.clearRect(0,0,W,H);
  // nebula glow
  const ng=ctx.createRadialGradient(cx,cy,10,cx,cy,Math.max(W,H)*0.6);
  ng.addColorStop(0,'rgba(243,172,64,'+(0.10*(1-settle)+0.03)+')');
  ng.addColorStop(0.4,'rgba(45,212,191,0.04)');
  ng.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ng; ctx.fillRect(0,0,W,H);
  starfield(ctx);
  const ease=1-Math.pow(1-settle,3);
  Bang.parts.forEach(p=>{
    if(p.comet){
      p.x+=p.vx*0.016; p.y+=p.vy*0.016; p.vy+=20*0.016;
      p.tail.push({x:p.x,y:p.y}); if(p.tail.length>22) p.tail.shift();
      for(let k=0;k<p.tail.length;k++){ const al=k/p.tail.length; ctx.globalAlpha=al*0.6; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.tail[k].x,p.tail[k].y,al*2.4,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      return;
    }
    // explode then ease toward target ring
    const ex=cx+(p.x===cx?0:0); // unused
    // free-fly position
    p.fx=(p.fx==null?p.x:p.fx)+p.vx*0.016*(1-settle);
    p.fy=(p.fy==null?p.y:p.fy)+p.vy*0.016*(1-settle);
    // orbit angle for settled galaxies/planets
    p.spin+=p.sp*0.016;
    const ringX=cx+Math.cos(p.spin)*p.ring, ringY=cy+Math.sin(p.spin)*p.ring*0.62;
    const x=p.fx*(1-ease)+ringX*ease;
    const y=p.fy*(1-ease)+ringY*ease;
    const tw=0.6+0.4*Math.sin(Bang.t*2+p.tw);
    ctx.globalAlpha=1;
    if(p.type==='galaxy'){ ctx.shadowColor=p.color; ctx.shadowBlur=18; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(x,y,p.size+1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    else if(p.type==='planet'){ ctx.shadowColor=p.color; ctx.shadowBlur=10; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    else { ctx.globalAlpha=tw; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fill(); }
  });
  ctx.globalAlpha=1;
  Bang.raf=requestAnimationFrame(bangFrame);
}
function stopBang(){ if(Bang.raf){ cancelAnimationFrame(Bang.raf); Bang.raf=null; } if(Bang._resize){ window.removeEventListener('resize', Bang._resize); Bang._resize=null; } Bang.phase='idle'; }

function renderToday(){
  crumb([{label:'Today'}]);
  const items=allTasksToday();
  const done=items.filter(x=>x.t.done).length;
  const open=items.length-done;

  let html=`<div class="today-wrap">
    <div class="today-banner">
      <div class="tb-num">${open}</div>
      <div class="tb-text"><div class="t">${open===0?(items.length?'All targets cleared 🎉':'No targets yet'):open+' target'+(open!==1?'s':'')+' to go'}</div>
      <div class="s">${items.length?done+' of '+items.length+' done today':'Pick what you’ll study today from the list below.'}</div></div>
    </div>`;

  if(items.length){
    html+=`<div class="section-label">Today’s targets</div><div class="today-card">`;
    items.forEach(({t,c,g})=>{
      html+=`<div class="today-task">
        <div class="check ${t.done?'on':''}" data-toggle="${t.id}">${ICON.check}</div>
        <div class="tt-body"><div class="tt-text ${t.done?'done':''}">${esc(t.text)}</div>
        <div class="tt-path"><span class="dot" style="background:${g.color}"></span>${esc(g.title)} · ${esc(c.title)}</div></div>
        <button class="icon-btn task-today-btn on" data-action="star-task" data-id="${t.id}" title="Remove from today">${ICON.star}</button>
      </div>`;
    });
    html+=`</div>`;
  }

  const hasOpen = g => g.courses.some(c=>c.sections.some(s=>s.tasks.some(t=>!t.done)));
  const eligibleGoals = state.goals.filter(hasOpen);

  html+=`<div class="section-label">Add to today</div>`;
  if(!eligibleGoals.length){
    html+=`<div class="empty" style="margin-top:2px">${ICON.target}<p>${state.goals.length?'Everything is complete 🎉':'No paths yet'}</p>
      <p class="sub">${state.goals.length?'No remaining tasks to study right now — finished paths don’t appear here.':'Create a path and add some tasks first.'}</p></div></div>`;
    content.innerHTML=html; return;
  }

  if(!state.ui.todayPick) state.ui.todayPick={};
  const tp=state.ui.todayPick;
  const g = eligibleGoals.find(x=>x.id===tp.g) || eligibleGoals[0]; tp.g=g.id;
  const eligCourses = g.courses.filter(c=>c.sections.some(s=>s.tasks.some(t=>!t.done)));
  const c = eligCourses.find(x=>x.id===tp.c) || eligCourses[0]; tp.c=c.id;

  const gOpts=eligibleGoals.map(x=>`<option value="${x.id}" ${x.id===g.id?'selected':''}>${esc(x.title)}</option>`).join('');
  const cOpts=eligCourses.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.title)} · ${courseProgress(x)}%</option>`).join('');

  html+=`<div class="today-picker">
    <div class="notes-pickers" style="margin-top:0">
      <div class="np"><label>Path</label><div class="np-sel"><select id="tp-g">${gOpts}</select></div></div>
      <span class="np-arrow">${ICON.caret}</span>
      <div class="np"><label>Course</label><div class="np-sel"><select id="tp-c">${cOpts}</select></div></div>
    </div>
    <div class="pick-list">`;
  c.sections.forEach(s=>{
    const pend=s.tasks.filter(t=>!t.done);
    if(!pend.length) return;
    html+=`<div class="pick-sec">${esc(s.title)}</div>`;
    pend.forEach(t=>{
      html+=`<div class="pick-task ${t.today?'added':''}">
        <span class="pick-text">${esc(t.text)}</span>
        <button class="pick-add ${t.today?'on':''}" data-action="star-task" data-id="${t.id}">${t.today?ICON.check+'Added':ICON.plus+'Add'}</button>
      </div>`;
    });
  });
  html+=`</div></div></div>`;
  content.innerHTML=html;
  $('#tp-g')?.addEventListener('change',e=>{ state.ui.todayPick={g:e.target.value,c:null}; save(); renderToday(); });
  $('#tp-c')?.addEventListener('change',e=>{ state.ui.todayPick.c=e.target.value; save(); renderToday(); });
}

/* ============== Mutations (via Store → SQLite) ============== */
function toggleTask(id){ Store.toggleTask(id); render(); }
function starTask(id){ Store.starTask(id); render(); }
function addTask(sid){ Store.addTask(sid).then(render); }
function delTask(id){
  const f=Store.findTask(id); if(!f) return;
  const snap={text:f.t.text, done:f.t.done, today:f.t.today};
  Store.delTask(id); render();
  toastUndo('Task deleted', async ()=>{
    const nid=await Store.addTask(f.s.id);
    Store.editTask(nid, snap.text);
    if(snap.done) Store.toggleTask(nid);
    if(snap.today) Store.starTask(nid);
    render();
  });
}
function addSection(cid){ Store.addSection(cid).then(render); }
function delSection(id){
  const f=Store.findSection(id); if(!f) return;
  confirmDel('Delete this section and its tasks & notes?',async ()=>{ await Store.delSection(id); render(); });
}

/* ============== Modals ============== */
function openModal(html){ $('#modal').innerHTML=html; $('#modal-overlay').classList.add('show'); }
function closeModal(){ $('#modal-overlay').classList.remove('show'); }

let modalColor=COLORS[0];
function goalModal(existing){
  modalColor = existing? existing.color : COLORS[0];
  const colorRow=COLORS.map(c=>`<div class="color-opt ${c===modalColor?'sel':''}" data-color="${c}" style="background:${c}"></div>`).join('');
  openModal(`
    <div class="modal-head"><div class="modal-title">${existing?'Edit path':'New learning path'}</div></div>
    <div class="modal-body">
      <div class="field"><label>Goal / path name</label><input id="m-title" placeholder="e.g. Network Security Engineer" value="${esc(existing?existing.title:'')}"></div>
      <div class="field"><label>Description (optional)</label><textarea id="m-desc" placeholder="What does reaching this goal look like?">${esc(existing?existing.description:'')}</textarea></div>
      <div class="field"><label>Accent color</label><div class="color-row" id="m-colors">${colorRow}</div></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-goal" ${existing?`data-id="${existing.id}"`:''}>${existing?'Save changes':'Create path'}</button>
    </div>`);
  setTimeout(()=>$('#m-title')?.focus(),50);
}
function courseModal(goalId, existing){
  openModal(`
    <div class="modal-head"><div class="modal-title">${existing?'Edit course':'New course / sub-goal'}</div></div>
    <div class="modal-body">
      <div class="field"><label>Course name</label><input id="m-title" placeholder="e.g. CCNP Security — SCOR (350-701)" value="${esc(existing?existing.title:'')}"></div>
      <div class="field"><label>Description (optional)</label><textarea id="m-desc" placeholder="Short note about this course">${esc(existing?existing.description:'')}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-course" data-goal="${goalId}" ${existing?`data-id="${existing.id}"`:''}>${existing?'Save changes':'Add course'}</button>
    </div>`);
  setTimeout(()=>$('#m-title')?.focus(),50);
}
function renameSectionModal(id){
  const f=Store.findSection(id); if(!f) return;
  openModal(`
    <div class="modal-head"><div class="modal-title">Rename section</div></div>
    <div class="modal-body">
      <div class="field"><label>Section name</label><input id="m-title" value="${esc(f.s.title)}" placeholder="e.g. Secure Network Access (VPN)"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" id="rename-sec-save">Save</button>
    </div>`);
  setTimeout(()=>{ const i=$('#m-title'); if(i){ i.focus(); i.select(); } },50);
  const save=()=>{ const t=$('#m-title').value.trim(); if(!t){ $('#m-title').focus(); return; } Store.updateSection(id,{title:t}); closeModal(); render(); toast('Section renamed'); };
  $('#rename-sec-save').onclick=save;
  $('#m-title').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); save(); } });
}
function confirmDel(msg,onYes){
  openModal(`
    <div class="modal-head"><div class="modal-title">Are you sure?</div></div>
    <div class="modal-body"><p style="color:var(--muted);font-size:14px">${esc(msg)}</p></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" id="confirm-yes" style="background:var(--red);color:#fff;box-shadow:none">Delete</button>
    </div>`);
  $('#confirm-yes').onclick=()=>{ closeModal(); onYes(); };
}

/* ============== Search (via SQLite, opens notes directly) ============== */
let searchTimer=null;
function openSearch(){ $('#search-overlay').classList.add('show'); $('#search-input').value=''; $('#search-results').innerHTML=''; setTimeout(()=>$('#search-input').focus(),50); }
function closeSearch(){ $('#search-overlay').classList.remove('show'); }

function wireSearch(){
  $('#search-overlay').addEventListener('click',e=>{ if(e.target.id==='search-overlay') closeSearch(); });
  $('#search-input').addEventListener('input',e=>{
    const q=e.target.value.trim();
    const res=$('#search-results');
    if(!q){ res.innerHTML=''; return; }
    clearTimeout(searchTimer);
    searchTimer=setTimeout(async ()=>{
      let out=[];
      try{ out=await window.proton.search(q); }catch(err){ out=[]; }
      const clsByType={path:'sr-goal',course:'sr-course',section:'sr-course',task:'sr-task',note:'sr-note'};
      if(!out.length){ res.innerHTML=`<div style="padding:24px;text-align:center;color:var(--faint);font-size:13.5px">No matches for "${esc(q)}"</div>`; return; }
      res.innerHTML=out.slice(0,40).map((r,i)=>`<div class="sresult" data-sr="${i}"><span class="sr-type ${clsByType[r.type]||''}">${r.type}</span><div class="sr-body"><div class="sr-name">${esc(r.name)}</div><div class="sr-path">${esc(r.path)}</div></div></div>`).join('');
      res.querySelectorAll('.sresult').forEach((el,i)=>el.onclick=()=>{
        const r=out[i]; closeSearch();
        if(r.type==='note'){
          state.ui.notes={g:r.pathId,c:r.courseId,s:r.sectionId,openNote:r.noteId};
          go('notes');
        }else{
          if(r.courseId) state.ui.openCourses[r.courseId]=true;
          go('goal', r.pathId);
        }
      });
    }, 160);
  });
}

/* ============== Click handlers ============== */
function wireClicks(){
  content.addEventListener('click',e=>{
    const toggle=e.target.closest('[data-toggle]'); if(toggle){ toggleTask(toggle.dataset.toggle); return; }
    const tc=e.target.closest('[data-toggle-course]'); if(tc && !e.target.closest('[data-action]') && !e.target.closest('.drag-grip')){ const id=tc.dataset.toggleCourse; state.ui.openCourses[id]=!state.ui.openCourses[id]; save(); render(); return; }
    const og=e.target.closest('[data-open-goal]'); if(og && !e.target.closest('[data-action]')){ go('goal', og.dataset.openGoal); return; }
    const nav=e.target.closest('[data-nav]'); if(nav){ go(nav.dataset.nav, nav.dataset.goal); return; }

    const act=e.target.closest('[data-action]'); if(!act) return;
    const a=act.dataset.action, id=act.dataset.id;
    if(a==='new-goal') goalModal(null);
    else if(a==='edit-goal'){ e.stopPropagation(); goalModal(state.goals.find(g=>g.id===id)); }
    else if(a==='del-goal'){ confirmDel('Delete this entire path and all its courses?',async ()=>{ await Store.delPath(id); go('paths'); }); }
    else if(a==='export-path'){ e.stopPropagation(); exportPathFlow(id); }
    else if(a==='import-path'){ importPathFlow(); }
    else if(a==='new-course') courseModal(id,null);
    else if(a==='edit-course'){ e.stopPropagation(); const f=findCourse(id); if(f) courseModal(f.g.id,f.c); }
    else if(a==='del-course'){ e.stopPropagation(); confirmDel('Delete this course and everything in it?',async ()=>{ await Store.delCourse(id); render(); }); }
    else if(a==='add-section') addSection(id);
    else if(a==='rename-section'){ e.stopPropagation(); renameSectionModal(id); }
    else if(a==='del-section') delSection(id);
    else if(a==='add-task') addTask(id);
    else if(a==='del-task') delTask(id);
    else if(a==='star-task') starTask(id);
    else if(a==='open-notes'){
      const f=findCourse(act.dataset.c);
      const nt=state.ui.notes||{};
      state.ui.notes={ g: f? f.g.id : nt.g, c: act.dataset.c, s: act.dataset.s, mode:'doc', tree: nt.tree||{} };
      go('notes');
    }
  });

  document.addEventListener('click',e=>{
    const cr=e.target.closest('[data-nav]'); if(cr && cr.closest('#crumb')){ go(cr.dataset.nav, cr.dataset.goal); return; }
    const nb=e.target.closest('.nav-item'); if(nb){ go(nb.dataset.view); return; }
    const act=e.target.closest('[data-action]'); if(!act) return;
    const a=act.dataset.action;
    if(a==='close-modal') closeModal();
    else if(a==='save-goal'){
      const title=$('#m-title').value.trim(); if(!title){ $('#m-title').focus(); return; }
      const desc=$('#m-desc').value.trim(); const id=act.dataset.id;
      if(id){ Store.updatePath(id,{title,description:desc,color:modalColor}); toast('Path updated'); closeModal(); render(); }
      else{ Store.addPath({title,description:desc,color:modalColor}).then(nid=>{ closeModal(); go('goal',nid); toast('Path created'); }); }
    }
    else if(a==='save-course'){
      const title=$('#m-title').value.trim(); if(!title){ $('#m-title').focus(); return; }
      const desc=$('#m-desc').value.trim(); const gid=act.dataset.goal, id=act.dataset.id;
      if(id){ Store.updateCourse(id,{title,description:desc}); toast('Course updated'); closeModal(); render(); }
      else{ Store.addCourse(gid,{title,description:desc,status:'todo'}).then(nid=>{ state.ui.openCourses[nid]=true; closeModal(); render(); toast('Course added'); }); }
    }
  });
  $('#modal-overlay').addEventListener('click',e=>{ if(e.target.id==='modal-overlay') closeModal(); });
  document.addEventListener('click',e=>{ const c=e.target.closest('[data-color]'); if(c){ modalColor=c.dataset.color; document.querySelectorAll('.color-opt').forEach(o=>o.classList.toggle('sel',o.dataset.color===modalColor)); } });
}

/* ============== Inline editing (delegation) ============== */
function wireInlineEditing(){
  content.addEventListener('blur',e=>{
    const ts=e.target.closest('[data-edit-task]');
    if(ts){ const id=ts.dataset.editTask, txt=ts.textContent.trim()||'Untitled task'; const f=Store.findTask(id); if(f && f.t.text!==txt) Store.editTask(id,txt); }
    const sec=e.target.closest('[data-edit-section]');
    if(sec){ const id=sec.dataset.editSection, txt=sec.textContent.trim()||'Untitled section'; const f=Store.findSection(id); if(f && f.s.title!==txt){ Store.updateSection(id,{title:txt}); } }
  },true);
  content.addEventListener('keydown',e=>{
    if(e.key==='Enter' && (e.target.dataset.editTask!==undefined || e.target.dataset.editSection!==undefined)){ e.preventDefault(); e.target.blur(); }
  });
}

/* ============== Sidebar / topbar / shortcuts ============== */
function wireChrome(){
  $('#hamburger').onclick=()=>{ $('#sidebar').classList.toggle('open'); $('#scrim').classList.toggle('show'); };
  $('#scrim').onclick=closeSidebar;
  $('#search-trigger').onclick=openSearch;
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ closeModal(); closeSearch(); }
    if(e.key==='/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable){ e.preventDefault(); openSearch(); }
  });

  /* Export / Import → real files via the backup system */
  $('#export-btn').onclick=async ()=>{
    try{ const p=await window.proton.exportBackup(); if(p) toast('Backup exported'); }
    catch(err){ notifyError('Export failed: '+err.message); }
  };
  $('#import-btn').onclick=async ()=>{
    confirmDel('Importing a backup will replace ALL current data. A safety snapshot is saved first. Continue?', async ()=>{
      try{
        const newState=await window.proton.importBackup();
        if(newState){ await Store.boot(); state=Store.state; go('dashboard'); toast('Backup imported'); }
      }catch(err){ notifyError('Import failed: '+err.message); }
    });
  };
  const ub=$('#updates-btn'); if(ub) ub.onclick=()=>{ toast('Checking for updates…'); checkUpdates(true); };
  const rb=$('#reset-btn'); if(rb) rb.onclick=resetFlow;
}

/* ====== Reset everything (back to a brand-new state) ====== */
function resetFlow(){
  openModal(`
    <div class="modal-head"><div class="modal-title">Reset everything?</div></div>
    <div class="modal-body">
      <p style="color:var(--muted);font-size:14px;line-height:1.6">This permanently deletes <b>all</b> your paths, courses, tasks, and notes, and returns Proton to a brand-new, empty state. This cannot be undone.</p>
      <p style="color:var(--muted);font-size:13px;margin-top:10px">Tip: use <b>Export</b> first if you want a backup you can re-import later.</p>
      <div class="field" style="margin-top:14px"><label>Type <b>RESET</b> to confirm</label><input id="reset-confirm" placeholder="RESET" autocomplete="off"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" id="reset-go" style="background:var(--red);color:#fff;box-shadow:none" disabled>Reset everything</button>
    </div>`);
  const inp=$('#reset-confirm'), btn=$('#reset-go');
  setTimeout(()=>inp&&inp.focus(),50);
  inp.addEventListener('input',()=>{ btn.disabled = inp.value.trim().toUpperCase()!=='RESET'; });
  btn.onclick=async ()=>{
    if(inp.value.trim().toUpperCase()!=='RESET') return;
    try{
      await window.proton.resetApp();
      await Store.boot(); state=Store.state;
      closeModal(); go('dashboard'); toast('Everything was reset');
      if(!state.goals.length) setTimeout(welcomeModal, 300);
    }catch(err){ notifyError('Reset failed: '+(err.message||err)); }
  };
}

/* ============== Boot ============== */
async function boot(){
  content=$('#content');
  $('#brand-name') && ($('#brand-name').textContent='Proton');
  try{
    await Store.boot();
    state=Store.state;
  }catch(err){
    content.innerHTML=`<div class="empty" style="margin-top:80px">${ICON.target}<p>Could not load your data</p><p class="sub">${esc(err.message||'Unknown error')}</p></div>`;
    return;
  }
  wireSearch(); wireClicks(); wireInlineEditing(); wireChrome();
  // expose a few helpers the Notes module uses
  window.App = { render, go, toast, toastUndo, notifyError, confirmDel, openModal, closeModal, esc, ICON, COLORS, state:()=>state };
  render();
  const bl=$('#boot-loader'); if(bl){ bl.style.opacity='0'; bl.style.transition='.35s'; setTimeout(()=>bl.remove(),360); }
  if(!state.goals.length) setTimeout(welcomeModal, 400);   // first-run welcome
  setTimeout(()=>checkUpdates(false), 2500);   // silent check shortly after launch
}

/* ====== First-run welcome ====== */
function welcomeModal(){
  if($('#modal-overlay').classList.contains('show')) return;
  openModal(`
    <div class="welcome">
      <div class="welcome-atom">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <g fill="none" stroke="var(--teal)" stroke-width="2.4" opacity="0.9">
            <ellipse cx="50" cy="50" rx="44" ry="17"/>
            <ellipse cx="50" cy="50" rx="44" ry="17" transform="rotate(60 50 50)"/>
            <ellipse cx="50" cy="50" rx="44" ry="17" transform="rotate(120 50 50)"/>
          </g>
          <circle cx="50" cy="50" r="13" fill="var(--amber)"/>
        </svg>
      </div>
      <div class="welcome-title">Welcome to Proton</div>
      <div class="welcome-sub">Make your own universe. Start by creating your first learning path — a goal you want to reach. You can add courses, tasks, and notes inside it.</div>
      <div class="welcome-actions">
        <button class="btn btn-primary" id="welcome-start">${ICON.plus}Create your first path</button>
        <button class="btn btn-ghost" id="welcome-import">${ICON.layers}Import a path file</button>
      </div>
    </div>`);
  $('#welcome-start').onclick=()=>{ closeModal(); goalModal(null); };
  $('#welcome-import').onclick=()=>{ closeModal(); importPathFlow(); };
}

/* ====== Share a path (export / import a single path as .json) ====== */
async function exportPathFlow(id){
  try{ const p=await window.proton.exportPath(id); if(p) toast('Path exported'); }
  catch(err){ notifyError('Export failed: '+(err.message||err)); }
}
async function importPathFlow(){
  try{
    const r=await window.proton.importPath();
    if(r && r.state){ await Store.boot(); state=Store.state; go('goal', r.pathId); toast('Path imported'); }
  }catch(err){ notifyError('Import failed: '+(err.message||err)); }
}

/* ====== Update check ====== */
async function checkUpdates(manual){
  let r=null;
  try{ r=await window.proton.checkForUpdates(); }catch(_){ r=null; }
  if(!r || !r.ok){ if(manual) toast('Could not check (no internet?)'); return; }
  if(r.updateAvailable){ showUpdateBanner(r.latestVersion, r.url); }
  else if(manual){ toast('You’re on the latest version ('+r.current+')'); }
}
function showUpdateBanner(version, url){
  if($('#update-banner')) return;
  const b=document.createElement('div');
  b.id='update-banner';
  b.innerHTML=`<span class="ub-dot"></span><div class="ub-text"><b>Update available — v${esc(version)}</b><span>A newer version of Proton is ready to download.</span></div>
    <button class="btn btn-primary btn-sm" id="ub-get">Download</button>
    <button class="icon-btn" id="ub-x" title="Dismiss">${ICON.plus}</button>`;
  document.body.appendChild(b);
  $('#ub-get').onclick=()=>{ window.proton.openExternal(url); };
  $('#ub-x').onclick=()=>b.remove();
}

document.addEventListener('DOMContentLoaded', boot);
