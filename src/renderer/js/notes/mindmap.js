'use strict';

/* ============================================================
   Proton — Mind map (XMind-style)
   Interactive SVG graph of a Course → Sections → Notes. Supports
   expand/collapse, open a note, add a note under a section, move
   a note to another section by dragging, plus pan & zoom. Always
   bound to the real Course/Section structure in the database.
   ============================================================ */

const MindMap = (function () {
  let host, ctx, course, activeId;
  const collapsed = {};            // sectionId -> true if collapsed
  let view = { x: 40, y: 0, k: 1 };
  let nodes = [];                  // {type,id,x,y,w,h,label,sectionId}

  function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function trunc(s,n){ s=s||''; return s.length>n? s.slice(0,n-1)+'…' : s; }

  function initView(){
    const map = host && host.querySelector('#mm');
    const h = (map && map.clientHeight) || 460;
    return { x: 150, y: Math.round(h/2), k: 1, _init: course.id };
  }

  function render(hostEl, data, context){
    host = hostEl; course = data.course; activeId = data.activeNoteId; ctx = context;
    if (view._init !== course.id) { view = { x: 150, y: 230, k: 1, _init: course.id }; }
    draw();
  }

  function layout(){
    nodes = [];
    const ROW=44, NOTE_H=34, GAPY=14, COL1=210, COL2=200;
    // measure total height
    let blocks = course.sections.map(s=>{
      const open = !collapsed[s.id];
      const notes = s.notes||[];
      const noteCount = open ? notes.length + 1 : 0; // +1 for the add node
      const h = Math.max(ROW, noteCount*(NOTE_H+10));
      return { s, open, notes, h };
    });
    let totalH = blocks.reduce((a,b)=>a+b.h+GAPY,0) - GAPY;
    if(!blocks.length) totalH = ROW;
    let y = -totalH/2;
    const courseY = 0;
    // course node
    nodes.push({ type:'course', id:course.id, x:0, y:courseY-ROW/2, w:180, h:ROW, label:course.title });

    blocks.forEach(b=>{
      const secY = y + b.h/2;
      nodes.push({ type:'section', id:b.s.id, x:COL1, y:secY-ROW/2, w:178, h:ROW, label:b.s.title,
                   open:b.open, hasNotes:(b.notes.length>0)||true });
      if(b.open){
        const items=b.notes;
        const innerH=(items.length+1)*(NOTE_H+10)-10;
        let ny=secY-innerH/2;
        items.forEach(n=>{
          nodes.push({ type:'note', id:n.id, x:COL1+COL2, y:ny, w:188, h:NOTE_H, label:n.title, sectionId:b.s.id });
          ny+=NOTE_H+10;
        });
        nodes.push({ type:'add', id:'add-'+b.s.id, x:COL1+COL2, y:ny, w:188, h:NOTE_H, label:'New note', sectionId:b.s.id });
      }
      y += b.h + GAPY;
    });
  }

  function nodeById(id){ return nodes.find(n=>n.id===id); }

  function draw(){
    layout();
    const links=[];
    const course0=nodeById(course.id);
    nodes.filter(n=>n.type==='section').forEach(sec=>{
      links.push(linkPath(course0, sec));
      nodes.filter(n=>(n.type==='note'||n.type==='add') && n.sectionId===sec.id).forEach(leaf=>{
        links.push(linkPath(sec, leaf));
      });
    });

    host.innerHTML = `
      <div class="nt-map" id="mm">
        <svg id="mm-svg"><g id="mm-root">${links.join('')}${nodes.map(nodeSVG).join('')}</g></svg>
        <div class="nt-map-hint">Click a note to open · drag a note onto another section to move it · drag canvas to pan</div>
        <div class="nt-map-zoom"><button id="mm-in">+</button><button id="mm-out">−</button><button id="mm-fit" title="Reset">⤢</button></div>
      </div>`;
    applyView();
    wire();
  }

  function linkPath(a,b){
    const x1=a.x+a.w/2, y1=a.y+a.h/2, x2=b.x-b.w/2, y2=b.y+b.h/2;
    const mx=(x1+x2)/2;
    return `<path class="mm-link" d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}"/>`;
  }

  function nodeSVG(n){
    const cx=n.x - n.w/2;   // section/notes use x as center for col; course centered at 0
    const X = (n.type==='course')? -n.w/2 : (n.type==='section')? n.x-n.w/2 : n.x-n.w/2;
    const Y = n.y;
    if(n.type==='course'){
      return `<g class="mm-node mm-course"><rect class="mm-rect" x="${-n.w/2}" y="${Y}" width="${n.w}" height="${n.h}" rx="9"/>
        <text class="mm-text" x="0" y="${Y+n.h/2+5}" text-anchor="middle" font-size="14">${esc(trunc(n.label,22))}</text></g>`;
    }
    if(n.type==='section'){
      const tog = `<g class="mm-toggle" data-toggle="${n.id}"><circle cx="${n.x+n.w/2+2}" cy="${Y+n.h/2}" r="9"/>
        <path d="${n.open?`M ${n.x+n.w/2-3} ${Y+n.h/2} h 10`:`M ${n.x+n.w/2-3} ${Y+n.h/2} h 10 M ${n.x+n.w/2+2} ${Y+n.h/2-5} v 10`}" fill="none"/></g>`;
      return `<g class="mm-node mm-section" data-open-sec="${n.id}"><rect class="mm-rect" x="${n.x-n.w/2}" y="${Y}" width="${n.w}" height="${n.h}" rx="9"/>
        <text class="mm-text" x="${n.x}" y="${Y+n.h/2+5}" text-anchor="middle" font-size="13">${esc(trunc(n.label,20))}</text></g>${tog}`;
    }
    if(n.type==='add'){
      return `<g class="mm-node mm-plus" data-add="${n.sectionId}"><circle cx="${n.x-n.w/2+16}" cy="${Y+n.h/2}" r="11"/>
        <path d="M ${n.x-n.w/2+16} ${Y+n.h/2-5} v 10 M ${n.x-n.w/2+11} ${Y+n.h/2} h 10" fill="none"/>
        <text class="mm-badge" x="${n.x-n.w/2+34}" y="${Y+n.h/2+4}" font-size="12">New note</text></g>`;
    }
    // note
    const active = n.id===activeId ? ' active':'';
    return `<g class="mm-node mm-note${active}" data-note="${n.id}" data-sec="${n.sectionId}" data-w="${n.w}" data-h="${n.h}">
      <rect class="mm-rect" x="${n.x-n.w/2}" y="${Y}" width="${n.w}" height="${n.h}" rx="8"/>
      <text class="mm-text" x="${n.x-n.w/2+12}" y="${Y+n.h/2+4}" font-size="12.5">${esc(trunc(n.label,22))}</text></g>`;
  }

  function applyView(){
    const root=host.querySelector('#mm-root');
    if(root) root.setAttribute('transform',`translate(${view.x},${view.y}) scale(${view.k})`);
  }

  function wire(){
    const map=host.querySelector('#mm'); const svg=host.querySelector('#mm-svg');

    // pan
    let panning=false, sx=0, sy=0, ox=0, oy=0, movedFlag=false;
    map.addEventListener('pointerdown',e=>{
      if(e.target.closest('.mm-node')||e.target.closest('.mm-toggle')||e.target.closest('.mm-plus')) return;
      panning=true; movedFlag=false; sx=e.clientX; sy=e.clientY; ox=view.x; oy=view.y; map.classList.add('dragging');
    });
    window.addEventListener('pointermove',e=>{ if(!panning) return; view.x=ox+(e.clientX-sx); view.y=oy+(e.clientY-sy); applyView(); });
    window.addEventListener('pointerup',()=>{ panning=false; map.classList.remove('dragging'); });

    // zoom (wheel + buttons)
    map.addEventListener('wheel',e=>{ e.preventDefault(); const f=e.deltaY<0?1.1:0.9; view.k=Math.max(0.4,Math.min(2.2,view.k*f)); applyView(); }, {passive:false});
    host.querySelector('#mm-in').onclick=()=>{ view.k=Math.min(2.2,view.k*1.15); applyView(); };
    host.querySelector('#mm-out').onclick=()=>{ view.k=Math.max(0.4,view.k*0.87); applyView(); };
    host.querySelector('#mm-fit').onclick=()=>{ view=initView(); applyView(); };

    // toggles
    host.querySelectorAll('[data-toggle]').forEach(g=>g.addEventListener('click',e=>{
      e.stopPropagation(); const id=g.dataset.toggle; collapsed[id]=!collapsed[id]; draw();
    }));
    host.querySelectorAll('[data-open-sec]').forEach(g=>g.addEventListener('click',e=>{
      const id=g.dataset.openSec; collapsed[id]=!collapsed[id]; draw();
    }));
    // add note
    host.querySelectorAll('[data-add]').forEach(g=>g.addEventListener('click',async e=>{
      e.stopPropagation(); await ctx.addNote(g.dataset.add); course=ctx.getCourse(); draw();
    }));

    // notes: click to open, drag to move
    host.querySelectorAll('.mm-note').forEach(g=>{
      let down=false, moved=false, startX=0, startY=0, ghost=null;
      g.addEventListener('pointerdown',e=>{ down=true; moved=false; startX=e.clientX; startY=e.clientY; });
      g.addEventListener('pointermove',e=>{
        if(!down) return;
        if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>6){ moved=true;
          if(!ghost){ ghost=document.createElement('div'); ghost.className='nt-chip'; ghost.style.cssText='position:fixed;z-index:90;pointer-events:none;opacity:.9'; ghost.textContent=trunc(g.querySelector('text').textContent,24); document.body.appendChild(ghost); }
          ghost.style.left=(e.clientX+10)+'px'; ghost.style.top=(e.clientY+10)+'px';
        }
      });
      g.addEventListener('pointerup',async e=>{
        down=false;
        if(ghost){ ghost.remove(); ghost=null; }
        if(!moved){ ctx.openNote(g.dataset.note); return; }
        // dropped — find a section under the cursor
        const el=document.elementFromPoint(e.clientX,e.clientY);
        const secG=el && el.closest('[data-open-sec]');
        if(secG){ const newSec=secG.dataset.openSec; if(newSec!==g.dataset.sec){ await ctx.moveNote(g.dataset.note, newSec); course=ctx.getCourse(); draw(); } }
      });
    });
  }

  return { render };
})();

window.MindMap = MindMap;
