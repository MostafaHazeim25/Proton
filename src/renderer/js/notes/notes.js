'use strict';

/* ============================================================
   Proton — Notes view controller
   Left tree (Path → Course → Section → Notes) + main area that
   shows either the block editor (Document) or the Mind map for
   the current course. Create / open / delete / move notes; the
   search box can open a note directly.
   ============================================================ */

const NotesView = (function () {
  let host, A, state;
  function S(){ return window.App.state(); }
  function esc(s){ return window.App.esc(s); }
  const ICON = ()=>window.App.ICON;

  function nv(){
    const st=S();
    if(!st.ui.notes) st.ui.notes={};
    if(!st.ui.notes.tree) st.ui.notes.tree={};
    if(!st.ui.notes.mode) st.ui.notes.mode='doc';
    return st.ui.notes;
  }

  /* resolve current path / course / section / note from ui + fallbacks */
  function resolve(){
    const st=S(); const goals=st.goals; const v=nv();
    const g = goals.find(x=>x.id===v.g) || goals[0]; if(g) v.g=g.id;
    const c = g ? (g.courses.find(x=>x.id===v.c) || g.courses[0] || null) : null; v.c=c?c.id:null;
    const s = c ? (c.sections.find(x=>x.id===v.s) || c.sections[0] || null) : null; v.s=s?s.id:null;
    let note=null;
    if(s){
      note = (v.openNote && s.notes.find(n=>n.id===v.openNote)) || s.notes[0] || null;
      v.openNote = note ? note.id : null;
    }
    return { g, c, s, note };
  }

  function render(hostEl){
    host = hostEl; A = window.App; state = S();
    if(window.NoteEditor) window.NoteEditor.destroy();
    const goals=state.goals;

    if(!goals.length){
      host.innerHTML = `<div class="empty" style="margin-top:60px">${ICON().note}<p>No paths yet</p><p class="sub">Create a path and a course first, then come here to write notes.</p>
        <button class="btn btn-primary btn-sm" data-action="new-goal" style="margin-top:14px">${ICON().plus}New path</button></div>`;
      return;
    }

    const { g, c, s, note } = resolve();

    host.innerHTML = `
      <div class="notes-shell">
        <div class="nt-tree">
          <div class="nt-tree-head"><div class="t">Knowledge tree</div></div>
          <div class="nt-tree-scroll" id="nt-tree-scroll">${buildTree(g,c,s)}</div>
        </div>
        <div class="nt-main" id="nt-main"></div>
      </div>`;
    bindTree();
    renderMain(g,c,s,note);
  }

  /* ---------- tree ---------- */
  function buildTree(curG,curC,curS){
    const v=nv(); const tree=v.tree;
    let h='';
    S().goals.forEach(g=>{
      const open = tree['g:'+g.id] ?? (g.id===(curG&&curG.id));
      h+=`<div class="nt-row ${open?'open':''}" data-tg="${g.id}">
        <span class="nt-caret">${ICON().caret}</span>
        <span class="nt-dot" style="background:${g.color}"></span>
        <span class="nt-label">${esc(g.title)}</span></div>`;
      if(open){
        h+='<div class="nt-children">';
        if(!g.courses.length) h+=`<div class="nt-empty-tree" style="text-align:left;padding:6px 8px">No courses</div>`;
        g.courses.forEach(c=>{
          const co = tree['c:'+c.id] ?? (c.id===(curC&&curC.id));
          h+=`<div class="nt-row ${co?'open':''}" data-tc="${c.id}" data-tcg="${g.id}">
            <span class="nt-caret">${ICON().caret}</span>
            <span class="nt-ico">${ICON().book}</span>
            <span class="nt-label">${esc(c.title)}</span></div>`;
          if(co){
            h+='<div class="nt-children">';
            if(!c.sections.length) h+=`<div class="nt-empty-tree" style="text-align:left;padding:6px 8px">No parts</div>`;
            c.sections.forEach(s=>{
              const so = tree['s:'+s.id] ?? (s.id===(curS&&curS.id));
              h+=`<div class="nt-row ${so?'open':''}" data-ts="${s.id}" data-tsc="${c.id}" data-tsg="${g.id}">
                <span class="nt-caret">${ICON().caret}</span>
                <span class="nt-ico">${ICON().layers}</span>
                <span class="nt-label">${esc(s.title)}</span></div>`;
              if(so){
                h+='<div class="nt-children">';
                s.notes.forEach(n=>{
                  const active = n.id===nv().openNote && (curS&&s.id===curS.id);
                  h+=`<div class="nt-row nt-note-row ${active?'active':''}" data-tn="${n.id}" data-tns="${s.id}" data-tnc="${c.id}" data-tng="${g.id}">
                    <span class="nt-ico">${ICON().note}</span>
                    <span class="nt-label">${esc(n.title||'Untitled')}</span></div>`;
                });
                h+=`<div class="nt-add" data-newnote="${s.id}" data-nnc="${c.id}" data-nng="${g.id}">${ICON().plus} New note</div>`;
                h+='</div>';
              }
            });
            h+='</div>';
          }
        });
        h+='</div>';
      }
    });
    return h;
  }

  function bindTree(){
    const scroll=host.querySelector('#nt-tree-scroll'); const v=nv();
    scroll.addEventListener('click',async e=>{
      const tg=e.target.closest('[data-tg]'); if(tg && e.target.closest('.nt-caret')){ toggle('g:'+tg.dataset.tg); return; }
      const tc=e.target.closest('[data-tc]'); if(tc && e.target.closest('.nt-caret')){ toggle('c:'+tc.dataset.tc); return; }
      const ts=e.target.closest('[data-ts]'); if(ts && e.target.closest('.nt-caret')){ toggle('s:'+ts.dataset.ts); return; }

      const tn=e.target.closest('[data-tn]');
      if(tn){ v.g=tn.dataset.tng; v.c=tn.dataset.tnc; v.s=tn.dataset.tns; v.mode='doc'; await openNote(tn.dataset.tn); return; }
      const nn=e.target.closest('[data-newnote]');
      if(nn){ v.g=nn.dataset.nng; v.c=nn.dataset.nnc; v.s=nn.dataset.newnote; await newNote(nn.dataset.newnote, nn.dataset.nnc); return; }

      // clicking a row body (not caret) selects/expands it
      if(tg){ v.g=tg.dataset.tg; toggle('g:'+tg.dataset.tg, true); return; }
      if(tc){ v.g=tc.dataset.tcg; v.c=tc.dataset.tc; toggle('c:'+tc.dataset.tc, true); return; }
      if(ts){ v.g=ts.dataset.tsg; v.c=ts.dataset.tsc; v.s=ts.dataset.ts; rerender(); return; }
    });
  }
  function toggle(key, forceOpen){
    const t=nv().tree; t[key]= forceOpen? true : !t[key]; window.Store.saveUI(); rerender();
  }

  function rerender(){ render(host); }

  /* ---------- main area ---------- */
  function renderMain(g,c,s,note){
    const main=host.querySelector('#nt-main'); const v=nv();
    if(!c){
      main.innerHTML=`<div class="nt-blank"><div class="inner">${ICON().book}<p>“${esc(g.title)}” has no courses yet.</p>
        <button class="btn btn-primary btn-sm" data-action="new-course" data-id="${g.id}">${ICON().plus}Add course</button></div></div>`;
      return;
    }
    if(!s){
      main.innerHTML=`<div class="nt-blank"><div class="inner">${ICON().layers}<p>“${esc(c.title)}” has no parts yet.</p>
        <button class="btn btn-primary btn-sm" id="nt-addpart">${ICON().plus}Add part</button></div></div>`;
      main.querySelector('#nt-addpart').onclick=async ()=>{ const id=await window.Store.addSection(c.id); v.s=id; rerender(); };
      return;
    }

    const bar=`<div class="nt-bar">
      <div class="nt-loc"><span class="np-dot" style="background:${g.color}"></span><b>${esc(g.title)}</b>
        <span class="sep">/</span>${esc(c.title)}<span class="sep">/</span><span style="color:var(--teal)">${esc(s.title)}</span></div>
      <div class="nt-spacer"></div>
      <div class="nt-mode">
        <button class="${v.mode==='doc'?'on':''}" id="nt-mode-doc">${ICON().note}Document</button>
        <button class="${v.mode==='map'?'on':''}" id="nt-mode-map">${ICON().layers}Mind map</button>
      </div>
      <button class="btn btn-primary btn-sm" id="nt-new">${ICON().plus}New note</button>
      ${note?`<button class="icon-btn danger" id="nt-del" title="Delete note">${ICON().trash}</button>`:''}
    </div>`;

    main.innerHTML = bar + `<div id="nt-body" style="flex:1;display:flex;flex-direction:column;min-height:0"></div>`;
    const body=main.querySelector('#nt-body');

    main.querySelector('#nt-mode-doc').onclick=()=>{ v.mode='doc'; window.Store.saveUI(); renderMain(g,c,s,note); };
    main.querySelector('#nt-mode-map').onclick=()=>{ v.mode='map'; window.Store.saveUI(); renderMain(g,c,s,note); };
    main.querySelector('#nt-new').onclick=()=>newNote(s.id, c.id);
    if(note) main.querySelector('#nt-del').onclick=()=>delNote(note.id);

    if(v.mode==='map'){
      renderMap(body, c, note);
    }else{
      if(!note){
        body.innerHTML=`<div class="nt-blank"><div class="inner">${ICON().note}<p>No notes in “${esc(s.title)}” yet.</p>
          <button class="btn btn-primary btn-sm" id="nt-first">${ICON().plus}Create first note</button></div></div>`;
        body.querySelector('#nt-first').onclick=()=>newNote(s.id, c.id);
      }else{
        openEditor(body, note.id);
      }
    }
  }

  function renderMap(body, c, note){
    window.MindMap.render(body, { course:c, activeNoteId: nv().openNote }, {
      getCourse:()=>{ const f=findCourse(c.id); return f?f.c:c; },
      openNote:(id)=>{ const v=nv(); v.mode='doc'; const loc=locateNote(id); if(loc){ v.g=loc.g.id; v.c=loc.c.id; v.s=loc.s.id; } openNote(id); },
      addNote: async (sectionId)=>{ await createNote(sectionId, c.id); },
      moveNote: async (id, sectionId)=>{ await window.Store.moveNote(id, c.id, sectionId); A.toast('Note moved'); },
      error:(m)=>A.notifyError(m),
    });
  }

  /* ---------- editor ---------- */
  async function openEditor(body, noteId){
    let full;
    try{ full=await window.proton.getNote(noteId); }
    catch(err){ body.innerHTML=`<div class="nt-blank"><div class="inner">${ICON().note}<p>Could not load this note.</p></div></div>`; return; }
    if(!full){ rerender(); return; }
    window.NoteEditor.open(body, full, {
      onTitleLive:(title)=>{ window.Store.updateNoteMeta(noteId, title); updateTreeLabel(noteId, title); },
      onSaved:(n)=>{ window.Store.updateNoteMeta(noteId, n.title); updateTreeLabel(noteId, n.title); },
      openNote:(id)=>{ const loc=locateNote(id); const v=nv(); if(loc){ v.g=loc.g.id; v.c=loc.c.id; v.s=loc.s.id; } openNote(id); },
      pickNote:(cb)=>pickNote(cb),
      error:(m)=>A.notifyError(m),
    });
  }

  async function openNote(id){
    nv().openNote=id; window.Store.saveUI();
    // refresh tree active highlight + main
    const { g,c,s,note }=resolve();
    // ensure the path is expanded in tree
    const t=nv().tree; if(g) t['g:'+g.id]=true; if(c) t['c:'+c.id]=true; if(s) t['s:'+s.id]=true;
    rerender();
  }

  async function newNote(sectionId, courseId){
    const id=await createNote(sectionId, courseId);
    const loc=locateNote(id); const v=nv();
    if(loc){ v.g=loc.g.id; v.c=loc.c.id; v.s=loc.s.id; }
    v.mode='doc';
    await openNote(id);
  }
  async function createNote(sectionId, courseId){
    const id=await window.Store.addNote(courseId, sectionId, { title:'Untitled', content:'' });
    return id;
  }

  function delNote(id){
    const loc=locateNote(id); if(!loc) return;
    A.confirmDel('Delete this note? Its images and attachments will be removed too.', async ()=>{
      let snap=null;
      try{ snap=await window.proton.getNote(id); }catch(_){}
      await window.Store.delNote(id);
      if(nv().openNote===id) nv().openNote=null;
      rerender();
      if(snap){
        A.toastUndo('Note deleted', async ()=>{
          const nid=await window.Store.addNote(loc.c.id, loc.s.id, { title:snap.title, content:snap.content });
          nv().openNote=nid; rerender();
        });
      }
    });
  }

  /* ---------- note picker (internal links) ---------- */
  function pickNote(cb){
    const g=S().goals.find(x=>x.id===nv().g);
    const items=[];
    if(g) g.courses.forEach(c=>c.sections.forEach(s=>s.notes.forEach(n=>items.push({n,c,s}))));
    const list = items.length
      ? items.map((it,i)=>`<div class="nt-pick-item" data-pi="${i}"><div>${esc(it.n.title||'Untitled')}</div><div class="sub">${esc(it.c.title)} · ${esc(it.s.title)}</div></div>`).join('')
      : `<div class="nt-empty-tree">No other notes in this path yet.</div>`;
    A.openModal(`
      <div class="modal-head"><div class="modal-title">Link to a note</div></div>
      <div class="modal-body"><div class="nt-picker" id="nt-picker">${list}</div></div>
      <div class="modal-foot"><button class="btn btn-ghost" data-action="close-modal">Cancel</button></div>`);
    const pick=document.querySelector('#nt-picker');
    pick.querySelectorAll('[data-pi]').forEach(el=>el.onclick=()=>{ const it=items[+el.dataset.pi]; A.closeModal(); cb({ id:it.n.id, title:it.n.title }); });
  }

  /* ---------- helpers ---------- */
  function findCourse(id){ for(const g of S().goals){ const c=g.courses.find(c=>c.id===id); if(c) return {g,c}; } return null; }
  function locateNote(id){
    for(const g of S().goals) for(const c of g.courses) for(const s of c.sections){
      if(s.notes.find(n=>n.id===id)) return {g,c,s};
    }
    return null;
  }
  function updateTreeLabel(id,title){
    const el=host && host.querySelector(`[data-tn="${id}"] .nt-label`);
    if(el) el.textContent=title||'Untitled';
  }

  return { render };
})();

window.NotesView = NotesView;
