/* ============================================================================
   SESSION — a game, open

   The api every game is handed, opening and closing a game, and the
   shell's own panels over the stage: start, pause, and a game's way back
   to its front page.
   ========================================================================== */
let cur = null, inst = null, running = false, paused = false, over = false;
let acc = 0, lastT = 0, rafId = 0, hudCache = '';
let hudNow = {}, hudLit = {};
const fx = new FX();
const STEP = 1 / 120, MAXDT = 0.25;

const api = {
  fx,
  sound: Sound,
  input: Input,
  /* Every game draws its own score, in its own lettering, on its own canvas —
     there is no bar above the stage to put one in any more. What a game hands
     over here is kept rather than painted: `api.read(key)` gives it back, and
     `api.lit(key)` says how recently it changed, which is what a readout needs
     to flash the frame a point lands. */
  hud(obj) {
    const s = JSON.stringify(obj);
    if (s === hudCache) return;
    let prev = null;
    try { prev = JSON.parse(hudCache || 'null'); } catch (e) {}
    hudCache = s;
    const tn = performance.now();
    for (const k in obj) {
      if (prev && k in prev && prev[k] !== obj[k] && tn - (hudLit[k] || 0) > 220) hudLit[k] = tn;
    }
    hudNow = obj;
  },
  /* what the game last said, for anything that wants to read it back */
  read(k) { return k === undefined ? hudNow : hudNow[k]; },
  /* 1 the instant a readout changed, falling to 0 over `ms` */
  lit(k, ms) {
    const t = hudLit[k]; if (!t) return 0;
    return Math.max(0, 1 - (performance.now() - t) / (ms || 420));
  },
  shake(a) { fx.shake(a); },
  opt(id) { return (cur && cur._opts && cur._opts[id]) || null; },
  /* ---- a game's own front page ----
     A game registered with `front: true` opens on a main menu it draws
     itself, in its own style, instead of the shell's start panel. It is
     mounted straight away with `entry` set to 'menu'; a restart or a Play
     again mounts it with 'play' and it goes straight into the round. The
     settings it offers are the same `options` the card would have shown,
     read with opt() and written with setOpt(), so a party the player hosts
     later starts with them too. */
  entry: 'play',
  setOpt(id, v) {
    if (!cur) return;
    cur._opts = cur._opts || {};
    cur._opts[id] = String(v);
    Store.opt(cur.id, id, String(v));
  },
  /* Play, pressed on the front page. On your own the round begins where it
     stands (true comes back), or with { remount: true } the game is mounted
     afresh, for settings it only reads when it is dealt. In a party the
     host's press starts the match on every screen instead, and a guest is
     told that the host starts it. */
  play(o) {
    if (!cur || over) return false;
    if (cur.mp && partyState().inRoom) { start(); return false; }
    if (o && o.remount) { frontIntro = true; mountGame(); return false; }
    try { Meta.roundStart(cur); } catch (e) {}
    return true;
  },
  menu() { if (frontReady()) showFront(); },
  hub() { location.hash = ''; },
  get party() { return partyState(); },
  openParty() {
    const mo = el('mpov');
    if (mo && !mo.classList.contains('on')) { try { el('mpBtn').click(); } catch (e) {} }
  },
  /* A front page's shop: spend the coins, open the crate, and hold the
     ceremony over the stage. `after(res)` runs once it has been closed. */
  buyCrate(slotId, after) {
    const slot = cur && Cos.SLOTS.find(q => q.id === slotId);
    if (!slot) return false;
    if (!Meta.spend(slot.cost)) {
      Meta.toast('Not enough coins', 'You need ' + (slot.cost - Meta.coins) + ' more', '', 'coin');
      return false;
    }
    crateCeremony(cur, Cos.openCrate(cur.id, slotId), slot, el('stagewrap'), after || (() => {}));
    return true;
  },
  /* Something of the shell's is over the stage (the party list, a sheet),
     and keys typed into it would otherwise reach the menu underneath. */
  get covered() {
    if (modalOpen()) return true;
    const mo = el('mpov');
    return !!(mo && mo.classList.contains('on'));
  },
  /* A fluid game is told how wide the stage actually became, not how wide it
     was declared. Returning the registry width made every `resize() { W =
     api.W }` handler a no-op, so those games painted a 960-wide world into a
     wider clip and left the remainder holding whatever the last frame put
     there — the ghosting down the right-hand side. */
  get W() { return cur ? (cur.fluid ? Stage.w : cur.w) : 960; },
  get H() { return cur ? cur.h : 600; },

  /* ---- what a game is allowed to keep ----
     `opt` is what the player chose on the start panel and is gone when they
     leave. `save`/`load` is the game's own scratch space and is not: levels
     cleared, things unlocked, where a long run had got to. A game asked for
     it by needing it — there was previously exactly one number (the high
     score) a game could remember about itself, which is fine for an arcade
     score and useless for anything with progress in it. */
  save(key, val) { return cur ? Store.gameSet(cur.id, key, val) : val; },
  load(key, def) { return cur ? Store.gameGet(cur.id, key, def) : def; },
  wipe() { if (cur) Store.gameClear(cur.id); },

  /* the player's own best, which a game may want to show in its own HUD
     rather than leaving to the shell's readout bar */
  best() { return cur ? Store.best(cur.id) : 0; },
  plays() { return cur ? Store.plays(cur.id) : 0; },

  /* A game that runs its own menus needs to be able to stop the clock without
     the shell's pause card on top of it, and to put it back. */
  suspend(v) { running = !v && !over; },
  get paused() { return !running; },

  gameOver(res) {
    if (over) return;
    over = true; running = false;
    /* the shell has stopped stepping, but an embedded build has its own loop
       and would keep playing behind the end card */
    if (isEmbed(cur)) { try { Embed.signal('pause'); } catch (e) {} }
    // in an online match the result waits until everyone has finished
    if (endHook && endHook(res || {})) return;
    showEnd(res || {});
  }
};
let endHook = null, pauseNote = '';
/* the way into a `front` game the next mount takes: its own menu, or a round */
let frontEntry = 'play';
/* the next mount follows a front page's Play, so it can fade in from it */
let frontIntro = false;

function isEmbed(g) { return !!(g && g.kind === 'embed'); }

function openGame(g) {
  cur = g;
  playEl.dataset.game = g.id;
  /* fit() decides the width — fluid games widen to the window */
  Stage.w = g.w; Stage.h = g.h;
  document.body.classList.add('in-game');
  document.body.classList.toggle('embed-mode', isEmbed(g));
  playEl.classList.add('on');
  el('backBtn').style.display = '';
  hdrTitle.textContent = g.title;
  Store.touch(g.id);
  Stage.fit();
  /* An embedded build reads its own keyboard inside the frame. Claiming the
     arrow keys out here would only fight it for the presses that land on the
     shell before the frame takes focus. */
  Input.setActive(!isEmbed(g));
  /* a game with a front page of its own opens on that instead of the bare
     options panel; everything else is unchanged */
  if (g.front) openFront(g); else showStart();
  sayTheKey();
}
/* Escape is the only way to pause now, so it is said once — the first game
   opened in a session — and then never again. */
function sayTheKey() {
  let told = true;
  try { told = sessionStorage.getItem('arcadeEscHint') === '1'; } catch (e) {}
  if (told) return;
  try { sessionStorage.setItem('arcadeEscHint', '1'); } catch (e) {}
  const n = el('keyHint'); if (!n) return;
  setTimeout(() => n.classList.add('on'), 600);
  setTimeout(() => n.classList.remove('on'), 4600);
}

function closeGame() {
  if (inst && inst.destroy) { try { inst.destroy(); } catch (e) {} }
  inst = null; cur = null; running = false; paused = false; over = false;
  cancelAnimationFrame(rafId); rafId = 0;
  fx.clear(); hudCache = ''; hudNow = {}; hudLit = {};
  ovEl.classList.remove('lg-ov'); ovEl.onclick = null;
  Input.setActive(false);
  document.body.classList.remove('in-game', 'embed-mode', 'embed-live');
  el('keyHint').classList.remove('on');
  playEl.classList.remove('on');
  delete playEl.dataset.game;
  el('backBtn').style.display = 'none';
  hdrTitle.textContent = '';
  ovEl.classList.remove('on');
  renderHub();
}

/* ---- overlays ---- */
/* Two shapes of setting, because one does not fit both jobs.
   A `seg` is the old pill row: fine for two or three short words like a
   difficulty. A `cards` option is a grid of tiles with a name and a line of
   explanation, which is what a list of game modes actually needs — nobody can
   guess what "Hunger" means from a pill three characters wide. */
function optionsHTML(g) {
  if (!g.options) return '';
  return g.options.map(o => {
    const saved = Store.opt(g.id, o.id) || o.def;
    g._opts = g._opts || {}; g._opts[o.id] = saved;
    const head = '<div class="opt-l">' + o.label + '</div>';

    if (o.type === 'cards') {
      return '<div class="opt">' + head +
        '<div class="optcards" data-opt="' + o.id + '">' +
        o.choices.map(c =>
          '<button class="optcard" data-v="' + c.v + '" aria-pressed="' + (c.v === saved) + '">' +
          (c.icon ? '<span class="oc-ico">' + c.icon + '</span>' : '') +
          '<b>' + c.l + '</b>' +
          (c.desc ? '<span class="oc-d">' + c.desc + '</span>' : '') +
          '</button>').join('') +
        '</div></div>';
    }

    /* a pill row that has outgrown one line wraps rather than squashing every
       label into three illegible characters */
    return '<div class="opt">' + head +
      '<div class="seg' + (o.choices.length > 3 ? ' wrap' : '') + '" data-opt="' + o.id + '">' +
      o.choices.map(c => '<button data-v="' + c.v + '" aria-pressed="' + (c.v === saved) + '"' +
        (c.desc ? ' title="' + c.desc + '"' : '') + '>' + c.l + '</button>').join('') +
      '</div></div>';
  }).join('');
}
/* Neither the start panel nor the pause card lists the controls any more.
   Every game here is played with the arrow keys, WASD or the mouse; a box
   repeating that for the twenty-seventh time is furniture, and it was pushing
   the settings that DO matter towards the fold. `g.controls` stays declared on
   every game — it is the one place the bindings are written down, and the
   games that need saying print their own keys on the screen they are used on. */
function showStart() {
  const g = cur, best = Store.best(g.id);
  /* Play sits outside the scrolling body. A panel with six modes and four
     settings is taller than a laptop screen, and a start button you have to
     scroll to find is the single most annoying thing a start panel can do. */
  panelEl.innerHTML =
    '<div class="start-head">' +
      '<h2>' + g.title + '</h2>' +
      '<p class="sub">' + g.tagline + (best ? ' · Best ' + fmt(best) : '') + '</p></div>' +
    '<div class="start-body scrolls">' + optionsHTML(g) + '</div>' +
    '<button class="btn" id="playBtn">Play</button>';
  wireOpts();
  el('playBtn').onclick = start;
  ovEl.classList.remove('lg-ov'); ovEl.onclick = null;
  ovEl.classList.add('on');
  /* the global board used to be injected here, but it made this panel tall
     enough to push Play off the bottom on short screens — it lives in its own
     Leaderboards tab in the header now */
}
function wireOpts() {
  panelEl.querySelectorAll('.optcards').forEach(box => {
    box.onclick = e => {
      const b = e.target.closest('.optcard'); if (!b) return;
      cur._opts[box.dataset.opt] = b.dataset.v;
      Store.opt(cur.id, box.dataset.opt, b.dataset.v);
      [...box.children].forEach(c => c.setAttribute('aria-pressed', c === b));
      Sound.blip();
      /* a mode change can rewrite the rest of the panel — a maze has no
         "wrap walls" setting to offer — so let the game say so */
      if (cur.onOption) { try { cur.onOption(box.dataset.opt, b.dataset.v); } catch (err) {} }
    };
  });
  panelEl.querySelectorAll('.seg').forEach(seg => {
    seg.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      cur._opts[seg.dataset.opt] = b.dataset.v;
      Store.opt(cur.id, seg.dataset.opt, b.dataset.v);
      [...seg.children].forEach(c => c.setAttribute('aria-pressed', c === b));
      Sound.blip();
      if (cur.onOption) { try { cur.onOption(seg.dataset.opt, b.dataset.v); } catch (err) {} }
    };
  });
}
/* ---- a game's own front page ----
   The options a card would have shown are loaded all the same, because the
   game reads them (and an online launch passes them on). An online launch
   mounts the match itself a moment later, so no menu is put up for it. */
function loadOpts(g) {
  g._opts = g._opts || {};
  for (const o of g.options || []) g._opts[o.id] = Store.opt(g.id, o.id) || o.def;
}
function openFront(g) {
  loadOpts(g);
  ovEl.classList.remove('on', 'lg-ov'); ovEl.onclick = null;
  if (getSession(g.id) || getRace(g.id)) return;
  showFront();
}
function showFront() {
  if (!cur) return;
  frontEntry = 'menu';
  mountGame();
}
/* the menu can be gone back to from a round of your own, not from the middle
   of an online match */
function frontReady() { return !!(cur && cur.front && !getSession(cur.id) && !getRace(cur.id)); }
function partyState() {
  try { return { inRoom: !!MP.inRoom, isHost: !!MP.isHost, size: MP.partySize || 1 }; }
  catch (e) { return { inRoom: false, isHost: false, size: 1 }; }
}
/* Pause is where the shell lives now. The bar above the stage used to hold
   the way out, the restart, the screenshot and the fullscreen toggle; all four
   are here instead, each with the key that does it, and the arrow keys walk
   the list so a pad or a keyboard can drive it without the mouse. */
function showPause() {
  const note = pauseNote;   // set by the multiplayer layer when the host pauses
  const act = (id, label, key, prim) =>
    '<button class="pz-act' + (prim ? ' prim' : '') + '" id="' + id + '"><span>' + label + '</span><kbd>' + key + '</kbd></button>';
  panelEl.innerHTML =
    '<h2>' + (note ? 'Host paused' : 'Paused') + '</h2>' +
    '<p class="sub">' + (note || cur.title) + '</p>' +
    (note
      ? '<div class="waitnote"><span class="spinner"></span>Waiting for the host to resume…</div>'
      : '<div class="pz-acts">' +
          act('resBtn', 'Resume', 'Esc', true) +
          act('rsBtn', 'Restart', 'R') +
          (frontReady() ? act('fmBtn', 'Main menu', 'M') : '') +
          act('fsBtn2', 'Fullscreen', 'F') +
          act('shotBtn2', 'Screenshot', 'S') +
          act('quitBtn', 'Quit to hub', '⌫') +
        '</div>') +
    (note ? '<div class="pz-acts"><button class="pz-act" id="quitBtn"><span>Quit to hub</span><kbd>⌫</kbd></button></div>' : '');
  if (el('resBtn')) el('resBtn').onclick = resume;
  if (el('rsBtn')) el('rsBtn').onclick = start;
  if (el('fmBtn')) el('fmBtn').onclick = showFront;
  if (el('fsBtn2')) el('fsBtn2').onclick = toggleFullscreen;
  if (el('shotBtn2')) el('shotBtn2').onclick = screenshot;
  el('quitBtn').onclick = () => { location.hash = ''; };
  ovEl.classList.remove('lg-ov'); ovEl.onclick = null;
  ovEl.classList.add('on');
  const items = [...panelEl.querySelectorAll('.pz-act')];
  if (items[0]) items[0].focus();
  panelEl.onkeydown = e => {
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    const n = items[(i + (e.code === 'ArrowDown' ? 1 : items.length - 1) + items.length) % items.length];
    if (n) { n.focus(); Sound.blip(); }
  };
}
