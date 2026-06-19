'use strict';

/* ============================================================
   Proton — cosmic background
   A very light particle field ("universe") with faint linked
   nodes that drift slowly. Capped particle count, pauses when
   the window is hidden, and turns itself off for reduced-motion.
   ============================================================ */

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'proton-cosmos';
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let raf = null, running = true;

  const TEAL = [45, 212, 191];
  const AMBER = [243, 172, 64];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    // density scales with area but is hard-capped for performance
    const target = Math.min(70, Math.round((W * H) / 26000));
    particles = [];
    for (let i = 0; i < target; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.6 + 0.5,
        amber: Math.random() < 0.18,
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // links between nearby particles (the "cosmic web")
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 19000) {
          const alpha = (1 - d2 / 19000) * 0.10;
          ctx.strokeStyle = `rgba(${TEAL[0]},${TEAL[1]},${TEAL[2]},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // particles
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      const c = p.amber ? AMBER : TEAL;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.amber ? 0.5 : 0.35})`;
      ctx.fill();
    }

    if (running) raf = requestAnimationFrame(step);
  }

  function start() { if (!running) { running = true; raf = requestAnimationFrame(step); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  window.addEventListener('resize', resize);

  resize();
  raf = requestAnimationFrame(step);

  // expose a tiny control so settings can toggle it
  window.protonCosmos = {
    enable() { canvas.style.display = ''; start(); },
    disable() { stop(); canvas.style.display = 'none'; },
  };
})();
