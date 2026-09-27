/* ============================================================================
   INPUT — keyboard, pointer and touch, as the games read them each step
   ========================================================================== */
const Input = (() => {
  const held = new Set(), pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, rdown: false, inside: false };
  let clicks = [], swipe = null, tStart = null, chars = [];
  const moves = [];                      // flat x,y pairs since the last drain
  const BLOCK = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','Tab','Backspace']);
  let active = false;

  addEventListener('keydown', e => {
    // typed text is collected separately so word games can read real characters
    if (active) {
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) chars.push(e.key);
      else if (e.code === 'Backspace') chars.push('\b');
      if (chars.length > 64) chars.splice(0, chars.length - 64);
    }
    if (e.repeat) return;
    if (active && BLOCK.has(e.code)) e.preventDefault();
    held.add(e.code); pressed.add(e.code);
  });
  addEventListener('keyup', e => { held.delete(e.code); });
  addEventListener('blur', () => { held.clear(); pointer.down = false; pointer.rdown = false; });

  function bind(el, toLogical) {
    const upd = e => {
      const p = toLogical(e.clientX, e.clientY);
      pointer.x = p.x; pointer.y = p.y; pointer.inside = p.inside;
    };
    /* Polling the pointer once per frame throws away every position between
       frames, which is exactly what made freehand strokes look faceted. The
       full path is recorded here instead — including the sub-frame samples the
       browser coalesced into one event — for anything that wants to trace it. */
    const track = e => {
      if (!pointer.down) return;
      /* an empty coalesced list is still an array, so it has to be length-checked
         — `|| [e]` alone silently dropped every sample */
      let list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!list || !list.length) list = [e];
      for (const ev of list) {
        const p = toLogical(ev.clientX, ev.clientY);
        moves.push(p.x, p.y);
      }
      if (moves.length > 4096) moves.splice(0, moves.length - 4096);
    };
    el.addEventListener('pointermove', e => { track(e); upd(e); });
    el.addEventListener('pointerdown', e => {
      // capture is a nice-to-have; never let it break the actual input handling
      try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (err) {}
      upd(e);
      // `down` means the primary button only, so right-click never reads as "fire"
      if (e.button === 2) pointer.rdown = true; else pointer.down = true;
      moves.length = 0;
      clicks.push({ x: pointer.x, y: pointer.y, btn: e.button || 0 });
      if (e.pointerType === 'touch') tStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener('pointerup', e => {
      if (e.button === 2) pointer.rdown = false; else pointer.down = false;
      if (tStart) {
        const dx = e.clientX - tStart.x, dy = e.clientY - tStart.y;
        if (Math.hypot(dx, dy) > 26 && performance.now() - tStart.t < 700)
          swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        tStart = null;
      }
    });
    el.addEventListener('pointercancel', () => { pointer.down = false; pointer.rdown = false; tStart = null; });
    el.addEventListener('pointerleave', () => { pointer.inside = false; });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  return {
    bind,
    setActive(v) { active = v; if (!v) { held.clear(); pressed.clear(); clicks = []; chars = []; moves.length = 0; swipe = null; pointer.down = false; pointer.rdown = false; } },
    down: c => held.has(c),
    pressed: c => pressed.has(c),
    any(...c) { return c.some(k => held.has(k)); },
    anyPressed(...c) { return c.some(k => pressed.has(k)); },
    pointer,
    get clicks() { return clicks; },
    takeClick() { return clicks.length ? clicks.shift() : null; },
    takeChars() { const c = chars; chars = []; return c; },
    /* every pointer position since the last call, oldest first */
    takeMoves() { const m = moves.slice(); moves.length = 0; return m; },
    takeSwipe() { const s = swipe; swipe = null; return s; },
    endFrame() { pressed.clear(); clicks.length = 0; }
  };
})();

