/* ============================================================================
   LOOP — mounting a round, the frame loop, the router, and boot
   ========================================================================== */

/* ---- loop control ---- */
/* The mount itself. start() is the name the rest of the shell calls, and the
   one the multiplayer layer wraps; a front page mounts through here directly,
   because opening a menu must never start a party's match. */
function mountGame() {
  if (inst && inst.destroy) { try { inst.destroy(); } catch (e) {} }
  fx.clear(); hudCache = ''; hudNow = {}; hudLit = {};
  over = false; paused = false;
  /* a fresh run is clean until it reads a flag of its own */
  try { Cheats.beginRun(cur.id); } catch (e) {}
  Sound.unlock();
  Stage.fit();
  /* one mount on the menu; every mount after it is a round */
  const entry = cur.front ? frontEntry : 'play';
  frontEntry = 'play';
  api.entry = entry;
  api.fromMenu = frontIntro;
  frontIntro = false;
  inst = cur.mount(api);
  /* a front page's hand-off is for the one round it started */
  api.carry = null;
  if (isEmbed(cur)) { try { el('embedFrame').focus(); } catch (e) {} }
  ovEl.classList.remove('on', 'lg-ov');
  ovEl.onclick = null;
  running = true; acc = 0; lastT = performance.now();
  barTint = ""; barFor = "";
  /* sitting on a menu is not playing; api.play() starts the clock */
  if (entry !== 'menu') { try { Meta.roundStart(cur); } catch (e) {} }
  if (!rafId) rafId = requestAnimationFrame(frame);
}
function start() { mountGame(); }
/* An embedded build keeps running unless it is told to stop, so the pause
   state has to be forwarded rather than just enforced by not stepping it. */
function pause() {
  if (!running || over) return;
  running = false; paused = true;
  if (isEmbed(cur)) { try { Embed.signal('pause'); } catch (e) {} }
  showPause();
}
function resume() {
  if (!paused) return;
  paused = false; running = true; lastT = performance.now(); acc = 0;
  ovEl.classList.remove('on');
  if (isEmbed(cur)) {
    try { Embed.signal('resume'); } catch (e) {}
    try { el('embedFrame').focus(); } catch (e) {}
  }
}
function togglePause() { if (over || !inst) return; paused ? resume() : pause(); }

el('pauseFab').onclick = togglePause;

/* ---- the tools the pause card offers ----
   A screenshot has to come off the canvas rather than the page: the stage is
   letterboxed inside a larger backing store, so the visible frame is a crop
   of it, not the whole thing. An embedded build paints into its own document
   and cannot be read at all — cross-origin or not, it is not our canvas. */
function shotName() {
  const t = new Date();
  const p = n => String(n).padStart(2, '0');
  return (cur ? cur.id : 'arcade') + '-' + t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) +
    '-' + p(t.getHours()) + p(t.getMinutes()) + p(t.getSeconds()) + '.png';
}
function screenshot() {
  if (!cur) return;
  if (isEmbed(cur)) { try { Meta.toast('Can’t capture this one', 'Embedded builds paint in their own frame', "", "camera"); } catch (e) {} return; }
  try {
    const s = Stage.scale * Stage.dpr;
    const w = Math.round(Stage.w * s), h = Math.round(Stage.h * s);
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').drawImage(cv, Math.round(Stage.ox * Stage.dpr), Math.round(Stage.oy * Stage.dpr), w, h, 0, 0, w, h);
    out.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = shotName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 20000);
      try { Meta.toast('Screenshot saved', a.download, 'good', '📷'); } catch (e) {}
    }, 'image/png');
  } catch (e) {
    try { Meta.toast('Screenshot failed', 'The canvas refused to be read', "", "camera"); } catch (_) {}
  }
}
function toggleFullscreen() {
  const box = el('stagewrap');
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
  const go = box.requestFullscreen || box.webkitRequestFullscreen;
  if (go) { try { go.call(box); } catch (e) {} }
}
document.addEventListener('fullscreenchange', () => { if (cur) { Stage.fit(); if (inst && inst.resize) inst.resize(); } });
// Escape is shared with the account panel. That closes itself
// on Escape, so without this guard one press would both dismiss the panel and
// pause the match underneath it.
function modalOpen() {
  return ['acctOv', 'lbOv', 'pfOv', 'keysOv', 'cmdOv', 'updOv'].some(id => { const n = el(id); return n && n.classList.contains('on'); }) ||
    !!document.querySelector('.gm-box');         // a crate being opened
}
addEventListener('keydown', e => {
  if (!cur || modalOpen()) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Escape') {
    e.preventDefault();
    /* A game on its own front page answers Escape itself: back a screen,
       or out to the hub, since nothing is running behind a menu. The party
       list, which a front page can open over itself, closes first. */
    if (!paused && !over && inst && inst.escape) {
      const mo = el('mpov');
      if (mo && mo.classList.contains('on')) { mo.classList.remove('on'); return; }
      if (inst.escape()) return;
    }
    togglePause();
  }
  else if (e.code === 'KeyR' && (paused || over)) { e.preventDefault(); start(); }
  else if (e.code === 'KeyM' && (paused || over) && frontReady()) { e.preventDefault(); showFront(); }
  else if (e.code === 'KeyF' && (paused || over)) { e.preventDefault(); toggleFullscreen(); }
  else if (e.code === 'KeyS' && (paused || over)) { e.preventDefault(); screenshot(); }
  else if (e.code === 'Backspace' && (paused || over)) { e.preventDefault(); location.hash = ''; }
});
// deliberately no pause-on-blur: clicking away (or into chat) must never
// pause a live match. dt is clamped in frame(), so a backgrounded tab
// resumes without a physics jump.
addEventListener('resize', () => { if (cur) { Stage.fit(); barTint = ""; barFor = ""; if (inst && inst.resize) inst.resize(); } });

/* One step of the game. Split out of the rAF callback because a hidden tab
   stops firing rAF entirely — which froze the whole simulation. In an online
   match that is not a cosmetic problem: a frozen host stops running the timer
   and stops answering anyone, so tabbing away broke the game for the party. */
function step(now, allowDraw) {
  if (!cur) return;
  let dt = (now - lastT) / 1000; lastT = now;
  if (dt > MAXDT) dt = MAXDT;

  if (running && inst) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 8) {
      acc -= STEP;
      if (inst.update) inst.update(STEP);
      if (!running) break;
      Input.endFrame();
    }
    fx.update(dt);
  }
  if (allowDraw) draw();                 // nothing to show while hidden
}
function frame(now) {
  rafId = requestAnimationFrame(frame);
  step(now, true);
}

/* A worker's timer keeps running at full rate in a background tab, where a
   page timer would be clamped to about once a second. It only drives the loop
   while the tab is actually hidden, so it never double-steps alongside rAF. */
const bgTicker = (() => {
  try {
    const src = 'var id=0;onmessage=function(e){' +
      'if(e.data===1){if(!id)id=setInterval(function(){postMessage(0)},16)}' +
      'else{clearInterval(id);id=0}};';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = () => { if (document.hidden && cur) step(performance.now(), false); };
    w.postMessage(1);
    return w;
  } catch (e) { return null; }
})();
/* coming back from a hidden tab: reset the clock so the catch-up guard does
   not try to replay the whole time we were away */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { lastT = performance.now(); acc = 0; }
});

/* A game with a fixed board cannot fill every window shape, and the leftover
   used to be painted black — which reads as a broken screen rather than a
   frame. The first drawn frame of each round is sampled down the left edge of
   the board and the average becomes the surround, so the letterbox is the
   game's own colour and the seam stops being visible. */
/* The games wearing the house chrome ask for `bars: 'hub'` instead of a
   sampled surround. Sampling a bright course put two cream slabs either side
   of a dark UI — and the frame round a game should belong to the hub, not to
   whatever happened to be on screen when the round began. It follows the
   light/dark theme, so it is the same colour as the shelf you came from. */
let barTint = '', barFor = '', barHub = '', barHubFor = null;
function hubBar() {
  const k = document.documentElement.getAttribute('data-theme') || '';
  if (k !== barHubFor) {
    barHubFor = k;
    barHub = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0c10';
  }
  return barHub;
}
function sampleTint() {
  if (!cur || cur.bars === 'hub' || barFor === cur.id + (Stage.ox > 0 ? 'x' : 'y')) return;
  try {
    const x = Math.round(Stage.ox * Stage.dpr) + 2;
    const h = Stage.h * Stage.scale * Stage.dpr;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 1; i <= 4; i++) {
      const y = Math.round(Stage.oy * Stage.dpr + h * (i / 5));
      const d = ctx.getImageData(x, y, 1, 1).data;
      r += d[0]; g += d[1]; b += d[2]; n++;
    }
    if (!n) return;
    barTint = 'rgb(' + Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n) + ')';
    barFor = cur.id + (Stage.ox > 0 ? 'x' : 'y');
  } catch (e) { barTint = ''; barFor = cur.id; }   // tainted canvas — keep the void
}

function draw() {
  const s = Stage.scale * Stage.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = cur && cur.bars === 'hub' ? hubBar()
                : barTint || getComputedStyle(document.documentElement).getPropertyValue('--void').trim() || '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  if (!inst) return;
  if (cur && cur.kind === 'embed') return;         // the build paints its own frame

  let sx = 0, sy = 0;
  if (fx.shakeAmt > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sx = rand(-fx.shakeAmt, fx.shakeAmt); sy = rand(-fx.shakeAmt, fx.shakeAmt);
  }
  ctx.setTransform(s, 0, 0, s, Stage.ox * Stage.dpr + sx * s, Stage.oy * Stage.dpr + sy * s);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, Stage.w, Stage.h); ctx.clip();
  if (inst.render) inst.render(ctx);
  fx.render(ctx);
  ctx.restore();
  sampleTint();
}

/* ---- router ---- */
/* Playing requires an account. The Account module (shell/accounts.js) loads
   after this one, so the first synchronous route() below runs while it is
   still in its temporal dead zone — that reads as "not ready", and
   Account.init() re-routes once the stored session has been restored.
   Without that a signed-in player following a deep link would be bounced to
   the sign-in box on every reload. */
function acctReady() { try { return !!Account; } catch (e) { return false; } }
function acctSignedIn() { try { return !!Account.signedIn; } catch (e) { return false; } }

function route() {
  const id = (location.hash || '').replace(/^#\/?/, '');
  const g = byId[id];
  if (g) {
    if (cur && cur.id === id) return;
    if (!acctReady()) return;                       // boot — decided after restore
    if (!acctSignedIn()) {
      /* the link is kept, not cleared: Account calls route() again the moment
         the gate lifts, and the player lands in the game they asked for */
      Account.open('Sign in to play ' + g.title + '.');
      return;
    }
    if (cur) closeGame();
    openGame(g);
  }
  else if (cur) closeGame();
}
addEventListener('hashchange', route);
el('backBtn').onclick = () => { location.hash = ''; };

renderHub();
route();
if (!rafId) rafId = requestAnimationFrame(frame);

