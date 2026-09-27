/* ============================================================================
   TWEEN — how the shell's own UI moves

   One place decides how this UI moves, because a house style is mostly a
   small number of numbers applied consistently. Two curves and nothing else:
   things arrive on `out`, and anything that should land with weight uses
   `back`. Nothing is ever linear.

   Every tween registers itself, so one click can finish the lot. An
   animation you cannot skip is a tax on the second time you see it.
   ========================================================================== */
const Tween = (() => {
  const live = new Set();
  const out = p => 1 - Math.pow(1 - p, 3);
  const back = p => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function run(ms, delay, ease, step) {
    const t = { finish() { if (t.over) return; t.over = true; live.delete(t); step(1); } };
    if (still() || ms <= 0) { step(1); t.over = true; return t; }
    live.add(t);
    step(0);
    const t0 = performance.now() + (delay || 0);
    requestAnimationFrame(function frame(now) {
      if (t.over) return;
      if (now >= t0) {
        const p = Math.min(1, (now - t0) / ms);
        step(ease(p));
        if (p >= 1) { t.over = true; live.delete(t); return; }
      }
      requestAnimationFrame(frame);
    });
    return t;
  }
  return {
    still, STAGGER: 60,
    /* the entrance everything uses: up and in, or in from the side */
    rise(node, delay, dy, dx, ms) {
      if (!node) return null;
      dy = dy === undefined ? 10 : dy; dx = dx || 0;
      return run(ms || 260, delay, out, p => {
        node.style.opacity = p;
        node.style.transform = p >= 1 ? '' : 'translate(' + (dx * (1 - p)).toFixed(2) + 'px,' + (dy * (1 - p)).toFixed(2) + 'px)';
      });
    },
    /* for the things that should feel like they landed rather than appeared */
    pop(node, delay, ms) {
      if (!node) return null;
      return run(ms || 400, delay, back, p => {
        node.style.opacity = Math.min(1, p * 2.2);
        node.style.transform = p >= 1 ? '' : 'scale(' + (.84 + .16 * p).toFixed(3) + ')';
      });
    },
    wipe(node, delay, ms) {
      if (!node) return null;
      return run(ms || 300, delay, out, p => { node.style.transform = 'scaleX(' + p.toFixed(4) + ')'; });
    },
    width(node, to, delay, ms) {
      if (!node) return null;
      return run(ms || 620, delay, out, p => { node.style.width = (to * p).toFixed(2) + '%'; });
    },
    /* A number never snaps, and a bigger jump takes longer — so a big win
       feels big without anyone having to say that it is. */
    count(node, from, to, delay, pre) {
      if (!node) return null;
      const ms = Math.round(clamp(230 + Math.abs(to - from) * 1.5, 230, 900));
      return run(ms, delay, out, p => { node.textContent = (pre || '') + fmt(from + (to - from) * p); });
    },
    finishAll() { [...live].forEach(t => t.finish()); }
  };
})();

