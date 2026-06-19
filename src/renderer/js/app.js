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
          <div style="flex:1"></div>
          <button class="icon-btn" data-action="rename-section" data-id="${s.id}" title="Rename section">${ICON.edit}</button>
          <button class="icon-btn danger" data-action="del-section" data-id="${s.id}" title="Delete section">${ICON.trash}</button>
        </div>
        <button class="section-notes-link" data-action="open-notes" data-c="${c.id}" data-s="${s.id}">${ICON.note}${ncount? ncount+' note'+(ncount!==1?'s':'')+' · open' : 'Open notes'}</button>`;
      s.tasks.forEach(t=>{
        html+=`<div class="task">
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
}
function onContentDragOver(e){
  if(dndType!=='course'||!dndEl) return;
  e.preventDefault();
  const after=dragAfter(content, e.clientY, '.course');
  const anchor=content.querySelector('.add-course-btn');
  if(after==null) content.insertBefore(dndEl, anchor); else content.insertBefore(dndEl, after);
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

/* ============== Today ============== */
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
