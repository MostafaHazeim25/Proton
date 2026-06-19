'use strict';

/* ============================================================
   Proton — Note block editor (custom, no libraries)
   A Notion-style contenteditable editor: headings, bold/italic/
   underline, bullet/numbered/checklist lists, quotes, code blocks,
   callouts, tables, internal note links, drag/paste/resizable
   images, attachments, a slash (/) command menu, and debounced
   auto-save. Serializes to plain HTML stored in SQLite.
   ============================================================ */

const NoteEditor = (function () {
  const I = (window.ICON_NOTES = {
    text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    h1:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><text x="2" y="18" font-size="16" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none">H1</text></svg>',
    h2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><text x="2" y="18" font-size="15" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none">H2</text></svg>',
    h3:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><text x="2" y="18" font-size="14" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none">H3</text></svg>',
    bullet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="4" cy="6" r="1.4" fill="currentColor"/><circle cx="4" cy="12" r="1.4" fill="currentColor"/><circle cx="4" cy="18" r="1.4" fill="currentColor"/><path d="M9 6h11M9 12h11M9 18h11"/></svg>',
    number:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M3 5l1.5-.5V9M3 17h2.2L3 19.5V21h3"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8M3 6h7M3 12h4M3 18h6"/></svg>',
    quote:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 7H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2H4V9h3zm9 0h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2h-2V9h3z"/></svg>',
    code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>',
    callout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c.5.5 1 1.5 1 3h6c0-1.5.5-2.5 1-3a7 7 0 0 0-4-12z"/></svg>',
    table:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L5 21"/></svg>',
    attach:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.4 11.1-9.2 9.2a5 5 0 0 1-7-7l9.1-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.1 9.1a1.7 1.7 0 0 1-2.4-2.4l8.5-8.4"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>',
    bold:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/></svg>',
    italic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 4h-9M14 20H5M15 4 9 20"/></svg>',
    underline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4v6a6 6 0 0 0 12 0V4M4 21h16"/></svg>',
    divider:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  });

  let host, note, ctx, ed, titleEl, savedEl, attachEl, saveTimer, slashEl;

  function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  /* ---- public ---- */
  function open(hostEl, noteObj, context){
    host = hostEl; note = noteObj; ctx = context;
    render();
  }

  function render(){
    host.innerHTML = `
      <div class="nt-doc">
        <div class="nt-toolbar" id="nt-toolbar"></div>
        <div class="nt-doc-inner">
          <input class="nt-title-in" id="nt-title" placeholder="Untitled" value="${esc(note.title==='Untitled'?'':note.title)}">
          <div class="nt-saved" id="nt-saved">Saved</div>
          <div class="nt-editor" id="nt-editor" contenteditable="true" spellcheck="true"
               data-placeholder="Start writing… press “/” for commands"></div>
          <div class="nt-attach" id="nt-attach"></div>
        </div>
      </div>`;
    ed = host.querySelector('#nt-editor');
    titleEl = host.querySelector('#nt-title');
    savedEl = host.querySelector('#nt-saved');
    attachEl = host.querySelector('#nt-attach');
    ed.innerHTML = note.content || '';
    buildToolbar(host.querySelector('#nt-toolbar'));
    renderAttachments();
    bindChecklists();
    bindImages();
    wire();
    setTimeout(()=>{ titleEl.value ? ed.focus() : titleEl.focus(); }, 30);
  }

  /* ---- toolbar ---- */
  function buildToolbar(bar){
    const btn=(ico,title,fn,id)=>{ const b=document.createElement('button'); b.className='nt-tb'; b.title=title; b.innerHTML=ico; b.onmousedown=e=>{e.preventDefault();}; b.onclick=fn; if(id) b.dataset.cmd=id; return b; };
    const sep=()=>{ const s=document.createElement('div'); s.className='nt-tb-sep'; return s; };
    bar.append(
      btn(I.bold,'Bold (Ctrl+B)',()=>exec('bold'),'bold'),
      btn(I.italic,'Italic (Ctrl+I)',()=>exec('italic'),'italic'),
      btn(I.underline,'Underline (Ctrl+U)',()=>exec('underline'),'underline'),
      sep(),
      btn(I.h1,'Heading 1',()=>block('H1')),
      btn(I.h2,'Heading 2',()=>block('H2')),
      btn(I.h3,'Heading 3',()=>block('H3')),
      btn(I.text,'Paragraph',()=>block('P')),
      sep(),
      btn(I.bullet,'Bullet list',()=>exec('insertUnorderedList')),
      btn(I.number,'Numbered list',()=>exec('insertOrderedList')),
      btn(I.check,'Checklist',()=>insertChecklist()),
      sep(),
      btn(I.quote,'Quote',()=>insertQuote()),
      btn(I.code,'Code block',()=>insertCode()),
      btn(I.callout,'Callout',()=>insertCallout()),
      btn(I.table,'Table',()=>insertTable()),
      btn(I.divider,'Divider',()=>{ insertBlockHTML('<hr>'); }),
      sep(),
      btn(I.image,'Image',()=>pickImage()),
      btn(I.attach,'Attachment',()=>pickAttachment()),
      btn(I.link,'Link to note',()=>linkToNote()),
    );
  }

  function exec(cmd,val){ ed.focus(); document.execCommand(cmd,false,val||null); touch(); refreshActive(); }
  function block(tag){ ed.focus(); document.execCommand('formatBlock',false,tag); touch(); }
  function refreshActive(){
    host.querySelectorAll('.nt-tb[data-cmd]').forEach(b=>{
      try{ b.classList.toggle('active', document.queryCommandState(b.dataset.cmd)); }catch(_){}
    });
  }

  /* ---- block inserts ---- */
  function insertBlockHTML(html){ ed.focus(); document.execCommand('insertHTML',false,html); touch(); }
  function insertQuote(){ ed.focus(); document.execCommand('formatBlock',false,'BLOCKQUOTE'); touch(); }
  function insertCode(){ insertBlockHTML('<pre class="code"><code>code…</code></pre><p><br></p>'); }
  function insertCallout(){ insertBlockHTML('<div class="callout"><span class="cl-emoji">💡</span><div class="cl-body">Callout text…</div></div><p><br></p>'); }
  function insertTable(){
    let h='<table><thead><tr><th>Column</th><th>Column</th><th>Column</th></tr></thead><tbody>';
    for(let r=0;r<2;r++){ h+='<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>'; }
    h+='</tbody></table><p><br></p>';
    insertBlockHTML(h);
  }
  function insertChecklist(){
    const html='<div class="cl-item" data-checked="false"><span class="cl-box" contenteditable="false">'+window.ICON_NOTES.checkSmall()+'</span><span class="cl-text">To-do…</span></div>';
    insertBlockHTML(html+'<p><br></p>');
    bindChecklists();
    // place caret in the new item text
    const items=ed.querySelectorAll('.cl-item .cl-text'); const last=items[items.length-1];
    if(last) placeCaret(last);
  }

  // small inline check icon used inside checklist boxes
  window.ICON_NOTES.checkSmall = ()=> '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';

  function placeCaret(el){
    const r=document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); el.focus&&el.focus();
  }

  /* ---- checklists ---- */
  function bindChecklists(){
    ed.querySelectorAll('.cl-item .cl-box').forEach(box=>{
      if(box.dataset.bound) return; box.dataset.bound='1';
      if(!box.innerHTML.trim()) box.innerHTML=window.ICON_NOTES.checkSmall();
      box.addEventListener('click',()=>{
        const item=box.closest('.cl-item');
        item.dataset.checked = item.dataset.checked==='true'?'false':'true';
        touch();
      });
    });
  }

  /* ---- images: pick / paste / drag + resize ---- */
  function pickImage(){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async ()=>{ const f=inp.files[0]; if(f) await addImageFile(f); };
    inp.click();
  }
  async function addImageFile(file){
    try{
      const dataUrl=await fileToDataUrl(file);
      const res=await window.proton.saveNoteImage(note.id, dataUrl);
      insertImage(res.url);
    }catch(err){ ctx.error && ctx.error('Could not add image'); }
  }
  function insertImage(url){
    const html=`<span class="img-wrap" contenteditable="false"><img src="${url}" style="width:520px;max-width:100%"><span class="img-handle"></span></span>`;
    insertBlockHTML(html);
    bindImages();
  }
  function bindImages(){
    ed.querySelectorAll('.img-wrap').forEach(w=>{
      if(w.dataset.bound) return; w.dataset.bound='1';
      let handle=w.querySelector('.img-handle');
      if(!handle){ handle=document.createElement('span'); handle.className='img-handle'; w.appendChild(handle); }
      const img=w.querySelector('img');
      handle.addEventListener('pointerdown',e=>{
        e.preventDefault(); e.stopPropagation();
        const startX=e.clientX, startW=img.getBoundingClientRect().width;
        const move=ev=>{ const nw=Math.max(120, startW+(ev.clientX-startX)); img.style.width=nw+'px'; };
        const up=()=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); touch(); };
        document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
      });
    });
  }

  /* ---- attachments ---- */
  function pickAttachment(){
    const inp=document.createElement('input'); inp.type='file';
    inp.onchange=async ()=>{ const f=inp.files[0]; if(f) await addAttachmentFile(f); };
    inp.click();
  }
  async function addAttachmentFile(file){
    try{
      const dataUrl=await fileToDataUrl(file);
      const res=await window.proton.saveNoteAttachment(note.id, file.name, dataUrl);
      note.attachments=note.attachments||[]; note.attachments.push(res);
      renderAttachments();
    }catch(err){ ctx.error && ctx.error('Could not add attachment'); }
  }
  function renderAttachments(){
    const list=note.attachments||[];
    if(!list.length){ attachEl.innerHTML=''; return; }
    attachEl.innerHTML=list.map((a,i)=>`<div class="nt-chip" data-att="${i}">${I.file}<span>${esc(a.name||'file')}</span><span class="x" data-rm="${i}">${I.x}</span></div>`).join('');
    attachEl.querySelectorAll('.nt-chip').forEach(ch=>{
      ch.addEventListener('click',e=>{
        if(e.target.closest('[data-rm]')){ const i=+e.target.closest('[data-rm]').dataset.rm; note.attachments.splice(i,1); renderAttachments(); return; }
        const a=list[+ch.dataset.att]; window.proton.openAttachment(a.url||a.file_path);
      });
    });
  }

  /* ---- internal note link ---- */
  function linkToNote(){
    saveSelection();
    ctx.pickNote(target=>{
      restoreSelection();
      if(!target) return;
      insertBlockHTML(`<a class="note-link" data-note="${target.id}" contenteditable="false">${esc(target.title||'Untitled')}</a>&nbsp;`);
    });
  }
  let savedRange=null;
  function saveSelection(){ const s=window.getSelection(); if(s.rangeCount) savedRange=s.getRangeAt(0).cloneRange(); }
  function restoreSelection(){ if(savedRange){ const s=window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); } ed.focus(); }

  /* ---- slash menu ---- */
  const SLASH=[
    {k:'Text',sub:'Plain paragraph',ico:'text',fn:()=>block('P')},
    {k:'Heading 1',sub:'Big section title',ico:'h1',fn:()=>block('H1')},
    {k:'Heading 2',sub:'Medium title',ico:'h2',fn:()=>block('H2')},
    {k:'Heading 3',sub:'Small title',ico:'h3',fn:()=>block('H3')},
    {k:'Bullet list',sub:'Unordered list',ico:'bullet',fn:()=>exec('insertUnorderedList')},
    {k:'Numbered list',sub:'Ordered list',ico:'number',fn:()=>exec('insertOrderedList')},
    {k:'Checklist',sub:'To-do items',ico:'check',fn:()=>insertChecklist()},
    {k:'Quote',sub:'Highlighted quote',ico:'quote',fn:()=>insertQuote()},
    {k:'Code',sub:'Code block',ico:'code',fn:()=>insertCode()},
    {k:'Callout',sub:'Boxed note',ico:'callout',fn:()=>insertCallout()},
    {k:'Table',sub:'3-column table',ico:'table',fn:()=>insertTable()},
    {k:'Divider',sub:'Horizontal line',ico:'divider',fn:()=>insertBlockHTML('<hr>')},
    {k:'Image',sub:'Upload an image',ico:'image',fn:()=>pickImage()},
    {k:'Attachment',sub:'Attach a file',ico:'attach',fn:()=>pickAttachment()},
    {k:'Link to note',sub:'Reference another note',ico:'link',fn:()=>linkToNote()},
  ];
  let slashFiltered=[], slashSel=0;
  function openSlash(){
    closeSlash();
    slashEl=document.createElement('div'); slashEl.className='nt-slash';
    document.body.appendChild(slashEl);
    positionSlash();
    filterSlash('');
  }
  function positionSlash(){
    const sel=window.getSelection(); if(!sel.rangeCount) return;
    const rect=sel.getRangeAt(0).getBoundingClientRect();
    const x=rect.left||120, y=(rect.bottom||120)+6;
    slashEl.style.left=Math.min(x, window.innerWidth-260)+'px';
    slashEl.style.top=y+'px';
  }
  function filterSlash(q){
    slashFiltered=SLASH.filter(s=>s.k.toLowerCase().includes(q.toLowerCase()));
    slashSel=0; drawSlash();
  }
  function drawSlash(){
    if(!slashEl) return;
    if(!slashFiltered.length){ slashEl.innerHTML='<div class="nt-slash-item">No matches</div>'; return; }
    slashEl.innerHTML=slashFiltered.map((s,i)=>`<div class="nt-slash-item ${i===slashSel?'sel':''}" data-i="${i}"><span class="si-ico">${I[s.ico]}</span><div><div>${s.k}</div><div class="si-sub">${s.sub}</div></div></div>`).join('');
    slashEl.querySelectorAll('.nt-slash-item[data-i]').forEach(el=>{
      el.addEventListener('mousedown',e=>{ e.preventDefault(); chooseSlash(+el.dataset.i); });
    });
  }
  function chooseSlash(i){
    const item=slashFiltered[i]; closeSlash();
    deleteSlashToken();
    if(item) item.fn();
  }
  function closeSlash(){ if(slashEl){ slashEl.remove(); slashEl=null; } }
  function isSlashOpen(){ return !!slashEl; }
  // remove the "/query" the user typed to trigger the menu
  let slashQuery='';
  function deleteSlashToken(){
    const sel=window.getSelection(); if(!sel.rangeCount) return;
    const range=sel.getRangeAt(0); const node=range.startContainer;
    if(node.nodeType===3){
      const text=node.textContent; const idx=text.lastIndexOf('/');
      if(idx>-1){ node.textContent=text.slice(0,idx)+text.slice(range.startOffset); 
        const r=document.createRange(); r.setStart(node, idx); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
    }
  }

  /* ---- wiring ---- */
  function wire(){
    titleEl.addEventListener('input',()=>{ note.title=titleEl.value.trim()||'Untitled'; saving(); clearTimeout(saveTimer); saveTimer=setTimeout(persist,500); ctx.onTitleLive&&ctx.onTitleLive(note.title); });
    titleEl.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); ed.focus(); } });

    ed.addEventListener('input',()=>{
      handleSlashTyping();
      touch();
    });
    ed.addEventListener('keyup',refreshActive);
    ed.addEventListener('mouseup',refreshActive);

    ed.addEventListener('keydown',e=>{
      if(isSlashOpen()){
        if(e.key==='ArrowDown'){ e.preventDefault(); slashSel=Math.min(slashSel+1,slashFiltered.length-1); drawSlash(); return; }
        if(e.key==='ArrowUp'){ e.preventDefault(); slashSel=Math.max(slashSel-1,0); drawSlash(); return; }
        if(e.key==='Enter'){ e.preventDefault(); chooseSlash(slashSel); return; }
        if(e.key==='Escape'){ closeSlash(); return; }
      }
    });

    // internal links + checklist clicks
    ed.addEventListener('click',e=>{
      const link=e.target.closest('.note-link');
      if(link){ e.preventDefault(); ctx.openNote && ctx.openNote(link.dataset.note); }
    });

    // paste images
    ed.addEventListener('paste',async e=>{
      const items=e.clipboardData && e.clipboardData.items;
      if(!items) return;
      for(const it of items){
        if(it.type && it.type.startsWith('image/')){ e.preventDefault(); const f=it.getAsFile(); if(f) await addImageFile(f); return; }
      }
    });
    // drag & drop images / files
    ed.addEventListener('dragover',e=>{ e.preventDefault(); });
    ed.addEventListener('drop',async e=>{
      if(!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      for(const f of e.dataTransfer.files){
        if(f.type.startsWith('image/')) await addImageFile(f); else await addAttachmentFile(f);
      }
    });

    document.addEventListener('click',outsideSlash, true);
    window.addEventListener('resize',()=>{ if(isSlashOpen()) positionSlash(); });
  }
  function outsideSlash(e){ if(slashEl && !slashEl.contains(e.target)) closeSlash(); }

  function handleSlashTyping(){
    const sel=window.getSelection(); if(!sel.rangeCount){ closeSlash(); return; }
    const node=sel.getRangeAt(0).startContainer;
    const off=sel.getRangeAt(0).startOffset;
    if(node.nodeType!==3){ if(isSlashOpen()) closeSlash(); return; }
    const text=node.textContent.slice(0,off);
    const m=/(?:^|\s)\/([\w]*)$/.exec(text);
    if(m){ slashQuery=m[1]; if(!isSlashOpen()) openSlash(); else positionSlash(); filterSlash(slashQuery); }
    else if(isSlashOpen()) closeSlash();
  }

  /* ---- save ---- */
  function touch(){ saving(); clearTimeout(saveTimer); saveTimer=setTimeout(persist,600); }
  function saving(){ if(savedEl){ savedEl.textContent='Saving…'; savedEl.classList.add('saving'); } }
  function saved(){ if(savedEl){ savedEl.textContent='Saved'; savedEl.classList.remove('saving'); } }
  function serialize(){
    const clone=ed.cloneNode(true);
    return clone.innerHTML;
  }
  async function persist(){
    try{
      note.content=serialize();
      await window.proton.updateNote(note.id,{title:note.title,content:note.content});
      ctx.onSaved && ctx.onSaved(note);
      saved();
    }catch(err){ if(savedEl){ savedEl.textContent='Save failed'; } ctx.error && ctx.error('Auto-save failed'); }
  }

  function fileToDataUrl(file){
    return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
  }

  function destroy(){
    clearTimeout(saveTimer); closeSlash();
    document.removeEventListener('click',outsideSlash,true);
  }

  return { open, destroy };
})();

window.NoteEditor = NoteEditor;
