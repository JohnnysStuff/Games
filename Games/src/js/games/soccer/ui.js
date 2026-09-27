/* SocUI: the game's own screens — the menu, the scoreboard, the banners, the
   controls and the full-time card — drawn in the look of the art rather than
   over it: the arcade's 5×7 pixel face (Hud.pix), hard-edged boxes in the
   sprites' own palette with a dark outline and a light rim, like the panels
   on an old cartridge, and the players themselves standing in them. Stage
   units (960×600) throughout; one art pixel is P = 2 of them, as on the pitch.

   Every tween here runs on the render clock. frame() is called once per
   drawn frame and moves `now` on; anything a player watches move is timed
   from that, never from the fixed 120 Hz update step, which judders on a
   display whose rate is not a multiple of it. Nothing that holds lettering
   is ever scaled by a fraction for long: pieces slide, drop and fade, and a
   fade goes through layer() so an outline never shows through its fill. */
const SocUI = (() => {
  const P = 2;
  /* all from the art's palette, so the lettering and the boxes are the same
     colours the players are painted in */
  const C = {
    ink: '#120b0b', navy: '#252538', deep: '#171726', rim: '#f6f1ef', mist: '#ccc7d1', grey: '#9b949a', steel: '#5f6372',
    yel: '#fad911', gold: '#f3ba06', ochre: '#cb8d07', red: '#de0e1c', wine: '#9c0919', blue: '#153a89', leaf: '#5c873a', moss: '#396930'
  };

  /* ---- the render clock, and easing ---- */
  let now = 0, dt = 0, lastMs = 0;
  function frame() {
    const ms = performance.now();
    dt = lastMs ? Math.min(.1, Math.max(0, (ms - lastMs) / 1000)) : 0;
    lastMs = ms; now += dt;
  }
  const clock = () => now;
  const k01 = k => k < 0 ? 0 : k > 1 ? 1 : k;
  const eo = k => 1 - Math.pow(1 - k01(k), 3);                    // ease out
  const ei = k => Math.pow(k01(k), 3);                            // ease in
  /* ease out past the end and back: a landing */
  const back = (k, s = 1.8) => { k = k01(k) - 1; return 1 + (s + 1) * k * k * k + s * k * k; };
  /* a number easing toward `to` at the same speed at any frame rate */
  function glide(o, key, to, rate, from) {
    const v = o[key] === undefined ? (from === undefined ? to : from) : o[key];
    return (o[key] = v + (to - v) * (1 - Math.exp(-rate * dt)));
  }
  const snap = v => Math.round(v / P) * P;

  /* ---- drawing, snapped to the screen's own pixels ----
     The stage is scaled by whatever fits the window, so a rectangle at a
     whole stage unit can still land between two real pixels and come out
     soft. Worked out in screen space its edges fall on pixels, the way the
     pixel face does it (Hud.pix crisp). */
  function rect(ctx, x, y, w, h, col) {
    const m = ctx.getTransform();
    ctx.fillStyle = col;
    if (m.b || m.c) { ctx.fillRect(x, y, w, h); return; }
    const X0 = Math.round(x * m.a + m.e), Y0 = Math.round(y * m.d + m.f);
    const X1 = Math.round((x + w) * m.a + m.e), Y1 = Math.round((y + h) * m.d + m.f);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0); ctx.restore();
  }
  /* a rectangle with its corner squares knocked out */
  function notch(ctx, x, y, w, h, col) { rect(ctx, x + P, y, w - 2 * P, h, col); rect(ctx, x, y + P, w, h - 2 * P, col); }
  /* a box: a shadow, the dark outline, a light rim, the fill, and a lit top
     edge over a shaded bottom one, like a moulded plastic button */
  function box(ctx, x, y, w, h, o) {
    o = o || {};
    x = snap(x); y = snap(y); w = snap(w); h = snap(h);
    if (o.shadow !== false) notch(ctx, x + P, y + 2 * P, w, h, 'rgba(8,6,12,.45)');
    notch(ctx, x, y, w, h, C.ink);
    notch(ctx, x + P, y + P, w - 2 * P, h - 2 * P, o.rim || C.rim);
    rect(ctx, x + 2 * P, y + 2 * P, w - 4 * P, h - 4 * P, o.fill || C.navy);
    if (o.shine) rect(ctx, x + 2 * P, y + 2 * P, w - 4 * P, P, o.shine);
    if (o.base) rect(ctx, x + 2 * P, y + h - 3 * P, w - 4 * P, P, o.base);
  }
  function text(ctx, s, x, y, px, col, o) {
    return Hud.pix(ctx, s, x, y, px, Object.assign({ crisp: true, align: 'center', baseline: 'middle', fill: col, outline: C.ink }, o));
  }
  /* Big lettering as a solid: the face over a darker side a few squares
     deep, with one dark outline round the whole of it, so the depth reads
     as the letter's own and not as a shadow under it. `hi` lights the top
     three rows of the face, like a printed arcade logo. `edge` draws a fine
     dark line round the face itself: without it the side of a letter shows
     through its own gaps, and a C, filled in below, reads as an O. */
  function block(ctx, s, x, y, px, face, side, depth, thin, hi, edge) {
    /* the bold face for words with no small gaps in them; the regular one
       where a one-square gap has to stay open (the stroke and dot of a "!") */
    const o = { crisp: true, thick: !thin, align: 'center', baseline: 'middle' };
    for (let d = depth; d >= 0; d--) Hud.pix(ctx, s, x, y + d * px, px, Object.assign({}, o, { fill: C.ink, outline: d === 0 || d === depth ? C.ink : null }));
    for (let d = depth; d >= 1; d--) Hud.pix(ctx, s, x, y + d * px, px, Object.assign({}, o, { fill: side }));
    Hud.pix(ctx, s, x, y, px, Object.assign({}, o, edge ? { fill: face, outline: C.ink, ow: .25 } : { fill: face }));
    if (hi) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 4000, y - px * 5, 8000, px * 4.5); ctx.clip();
      Hud.pix(ctx, s, x, y, px, Object.assign({}, o, { fill: hi }));
      ctx.restore();
    }
  }
  /* A word in block letters, stamped in a letter at a time: each drops from
     above and lands a little low before settling. Only ever moved, never
     scaled, so every square stays square; t is the seconds since the first
     letter began to fall. */
  function stamp(ctx, s, cx, y, px, face, side, depth, t, hi, thin = true) {
    let x = cx - Hud.pixWidth(s, px, !thin) / 2;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], cw = Hud.pixWidth(ch, px, !thin), k = (t - i * .045) / .34;
      if (k > 0 && ch !== ' ') block(ctx, ch, x + cw / 2, y + snap(-96 * (1 - back(k, 2.4))), px, face, side, depth, thin, hi, true);
      x += cw + (thin ? px : 2 * px);
    }
  }
  /* Fading outlined lettering square by square lets the outline show
     through the fill. Drawn whole into a layer and faded as one picture it
     stays solid. Layers can sit inside layers. */
  const pool = [];
  let depth = 0;
  function layer(ctx, a, fn) {
    if (a >= .995) { fn(ctx); return; }
    if (a <= .005) return;
    const src = ctx.canvas, cv = pool[depth] || (pool[depth] = document.createElement('canvas'));
    if (cv.width !== src.width || cv.height !== src.height) { cv.width = src.width; cv.height = src.height; }
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(ctx.getTransform()); g.imageSmoothingEnabled = false;
    depth++;
    try { fn(g); } finally { depth--; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, 0, 0); ctx.restore();
  }
  /* a sprite frame at k times its size, feet at (x, y) */
  function sprite(ctx, sheet, an, t, x, y, k, face = 1) {
    const A = sheet.meta.anims, name = A[an] ? an : A.idle ? 'idle' : 'ready', a = A[name];
    const f = a.loop ? Math.floor(t / a.t) % a.frames : Math.min(a.frames - 1, Math.floor(t / a.t));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
    SocArt.frame(ctx, sheet, name, f, 0, 0, face);
    ctx.restore();
  }
  /* a team's colour as a little square, outlined */
  function chip(ctx, x, y, s, col) { rect(ctx, x - P, y - P, s + 2 * P, s + 2 * P, C.ink); rect(ctx, x, y, s, s, col); rect(ctx, x, y, s, P, 'rgba(255,255,255,.35)'); }

  /* ---- keys ----
     A key cap: its face, lit along the top, on a side you can see, inside a
     dark outline. Held down, it sinks onto its side. */
  function cap(ctx, x, y, w, h, s, down, dim) {
    const d = down ? P : 0;
    x = snap(x); y = snap(y);
    notch(ctx, x, y + d, w, h + 2 * P - d, C.ink);
    rect(ctx, x + P, y + h - P + d, w - 2 * P, 2 * P - d, dim ? '#3a3a52' : C.grey);
    rect(ctx, x + P, y + P + d, w - 2 * P, h - 2 * P, dim ? C.steel : down ? '#e6e1ea' : C.mist);
    rect(ctx, x + P, y + P + d, w - 2 * P, P, dim ? '#7a7e8c' : C.rim);
    if (s) text(ctx, s, x + w / 2, y + h / 2 + d, 2, C.ink, { outline: null });
  }
  /* the arrow keys: four caps in a row, left, up, down, right, each with its
     arrow a five-square triangle, big enough to read at a glance */
  function dpad(ctx, x, y, keys) {
    const w = 18, h = 16, arrow = (cx, cy, dir) => {
      for (let i = 0; i < 3; i++) {
        const len = (i * 2 + 1) * P;
        if (dir === 'u') rect(ctx, cx - len / 2, cy - 3 + i * P, len, P, C.ink);
        if (dir === 'd') rect(ctx, cx - len / 2, cy + 1 - i * P, len, P, C.ink);
        if (dir === 'l') rect(ctx, cx - 3 + i * P, cy - len / 2, P, len, C.ink);
        if (dir === 'r') rect(ctx, cx + 1 - i * P, cy - len / 2, P, len, C.ink);
      }
    };
    ['l', 'u', 'd', 'r'].forEach((dir, i) => {
      const kx = x + i * (w + P), down = !!keys[dir];
      cap(ctx, kx, y, w, h, '', down);
      arrow(kx + w / 2, y + h / 2 + (down ? P : 0), dir);
    });
    return DPAD_W;
  }
  const DPAD_W = 4 * 18 + 3 * P;
  /* A panel of keys and what they do, its right edge at `right`: rows are
     [key, label], key 'move' for the arrow keys. Used on the menu, where it
     sits still, and in the match, where controls() animates it. */
  const labW = s => Hud.pixWidth(s, 2);
  const keyW = k => k === 'move' ? DPAD_W : Math.max(24, Hud.pixWidth(k, 2) + 12);
  function keyPanelW(rows) { return rows.reduce((s, [k, l]) => s + keyW(k) + 8 + labW(l), 0) + (rows.length - 1) * 16 + 28; }
  function keyPanel(ctx, rows, right, y, keys) {
    const w = rows.reduce((s, [k, l]) => s + keyW(k) + 8 + labW(l), 0) + (rows.length - 1) * 16 + 28;
    let x = snap(right - w);
    box(ctx, x, y, w, 36, { fill: C.deep, rim: C.steel, shine: '#2c2c44', base: '#101018' });
    x += 14;
    for (const [k, l] of rows) {
      if (k === 'move') dpad(ctx, x, y + 8, keys || {});
      else cap(ctx, x, y + 6, keyW(k), 20, k, keys && keys[k]);
      x += keyW(k) + 8;
      text(ctx, l, x, y + 18, 2, C.rim, { align: 'left', outline: null });
      x += labW(l) + 16;
    }
    return w;
  }

  /* a mini pitch with the formation on it, for the mode cards */
  function miniPitch(ctx, x, y, w, h, mode, colA, colB) {
    rect(ctx, x - P, y - P, w + 2 * P, h + 2 * P, C.ink);
    for (let i = 0; i < w; i += 12) rect(ctx, x + i, y, Math.min(6, w - i), h, C.leaf), rect(ctx, x + i + 6, y, Math.min(6, Math.max(0, w - i - 6)), h, C.moss);
    const L = 'rgba(246,241,239,.75)';
    rect(ctx, x, y, w, P, L); rect(ctx, x, y + h - P, w, P, L); rect(ctx, x, y, P, h, L); rect(ctx, x + w - P, y, P, h, L);
    rect(ctx, x + w / 2 - 1, y, P, h, L);
    rect(ctx, x - 2 * P, y + h / 2 - 8, 2 * P, 16, C.rim); rect(ctx, x + w, y + h / 2 - 8, 2 * P, 16, C.rim);
    for (const f of SOC_FORMS[mode]) for (const s of [0, 1]) {
      const fx = f.role === 'gk' ? .05 : f.fx * .95, px = s ? x + w - fx * w : x + fx * w, py = y + f.fy * h;
      rect(ctx, px - 4, py - 4, 8, 8, C.ink); rect(ctx, px - 2, py - 2, 4, 4, s ? colB : colA);
    }
  }
  /* the focus cursor: four corner brackets round a rectangle, breathing
     out and in; `burst` (seconds since Kick off, or -1) throws them wide */
  function brackets(ctx, r, t, burst) {
    const out = burst >= 0 ? eo(burst / .3) : 0;
    const g = 6 + snap((Math.sin(t * 7) + 1) * 1.5) + snap(out * 18);
    const x0 = r.x - g, y0 = r.y - g, x1 = r.x + r.w + g, y1 = r.y + r.h + g, L = 16, T = 4;
    ctx.save(); ctx.globalAlpha *= 1 - out;
    for (const col of [C.ink, C.yel]) {
      const e = col === C.ink ? 2 : 0;
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        rect(ctx, (sx > 0 ? x : x - L) - e, (sy > 0 ? y : y - T) - e, L + 2 * e, T + 2 * e, col);
        rect(ctx, (sx > 0 ? x : x - T) - e, (sy > 0 ? y : y - L) - e, T + 2 * e, L + 2 * e, col);
      }
    }
    ctx.restore();
  }

  /* ---- the menu ----
     Mode, position, how long, and your team, over the arena itself with the
     sides stood in it, and a big KICK OFF. Arrows and Z/Enter, or the mouse.
     It comes in piece by piece (title, panels from the sides, the button
     from below), a cursor glides to whatever has focus, and changing team
     swaps the kit on a carousel.
     hooks: preview(cfg) rebuilds the arena behind; start(cfg) plays (false
     if it can't); sheet(role, kit) hands over your player to draw, and
     person(k) someone in the party; saved() and save(cfg) keep the choices
     (socCfg reads them back); party() and openParty(); cursor(c) shows the
     hand over a button. */
  const POS_NAME = { gk: 'KEEPER', df: 'DEFENDER', fw: 'STRIKER' };
  const POS_ORDER = ['gk', 'df', 'fw'];
  function menu(api, hooks) {
    const S = Object.assign(socCfg(hooks.saved()), { row: 0, t: 0, hits: [], hover: '', popAt: {}, go: 0, kitAt: -9, kitDir: 1, kitPrev: 0, cur: null });
    const positions = () => POS_ORDER.filter(r => SOC_FORMS[S.mode].some(f => f.role === r));
    const cfg = () => socCfg(S);
    /* In a party the host sets the size, the length and the kits, and
       everyone picks a position after, on the lineup (lineup.js): so no
       position row, and no size with fewer places than people. A guest
       waits for the host. */
    const party = () => { const pt = hooks.party ? hooks.party() : null; return pt && pt.inRoom ? pt : null; };
    const guest = () => { const pt = party(); return !!(pt && !pt.isHost); };
    const rows = () => party() ? ['mode', 'min', 'kit', 'go'] : ['mode', 'pos', 'min', 'kit', 'go'];
    const least = () => { const pt = party(); return pt ? Math.min(3, Math.ceil(pt.size / 2)) : 1; };
    function changed(what) {
      if (!positions().includes(S.pos)) S.pos = 'fw';
      S.popAt[what] = S.t;
      hooks.save(cfg());
      hooks.preview(cfg());
    }
    function setKit(k, d) { if (k === S.kit) return; S.kitPrev = S.kit; S.kitDir = d; S.kitAt = S.t; S.kit = k; }
    function step(row, d) {
      if (guest()) return;
      if (row === 'mode') { const i = [1, 2, 3].indexOf(S.mode); const n = socClamp(i + d, least() - 1, 2); if (n === i) return; S.mode = n + 1; }
      else if (row === 'pos') { const l = positions(), i = l.indexOf(S.pos), n = socClamp(i + d, 0, l.length - 1); if (n === i) return; S.pos = l[n]; }
      else if (row === 'min') { const l = [2, 3, 5], i = l.indexOf(S.min), n = socClamp(i + d, 0, 2); if (n === i) return; S.min = l[n]; }
      else if (row === 'kit') setKit((S.kit + d + SOC_KITS.length) % SOC_KITS.length, d);
      else return;
      SocSound.play('tick'); changed(row);
    }
    function go() { if (S.go || hooks.start(cfg()) === false) return; S.go = S.t; SocSound.play('whistle', 1); }
    hooks.preview(cfg());

    function update() {
      const I = api.input, pr = c => I.pressed(c), R = rows();
      if (S.go) return;
      /* a friend joined: the size grows to have a place for everyone */
      if (!guest() && S.mode < least()) { S.mode = least(); changed('mode'); }
      S.row = Math.min(S.row, R.length - 1);
      if (!guest()) {
        if (pr('ArrowUp') || pr('KeyW')) { S.row = Math.max(0, S.row - 1); SocSound.play('tick'); }
        if (pr('ArrowDown') || pr('KeyS')) { S.row = Math.min(R.length - 1, S.row + 1); SocSound.play('tick'); }
        if (pr('ArrowLeft') || pr('KeyA')) step(R[S.row], -1);
        if (pr('ArrowRight') || pr('KeyD')) step(R[S.row], 1);
      }
      if (pr('Enter') || pr('NumpadEnter') || pr('Space') || pr('KeyZ') || pr('KeyX')) go();
      if (pr('KeyP') && hooks.openParty) hooks.openParty();       // friends: the party panel
      let c;
      while (I.takeClick && (c = I.takeClick())) {
        const h = S.hits.find(q => c.x >= q.x && c.x <= q.x + q.w && c.y >= q.y && c.y <= q.y + q.h);
        if (h) h.run();
      }
      const p = I.pointer, h = p && p.inside ? S.hits.find(q => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) : null;
      S.hover = h ? h.id : '';
      hooks.cursor(h ? 'pointer' : '');
      const d = c => I.down(c);
      S.keys = { u: d('ArrowUp') || d('KeyW'), d: d('ArrowDown') || d('KeyS'), l: d('ArrowLeft') || d('KeyA'), r: d('ArrowRight') || d('KeyD'), Z: d('KeyZ') || d('Enter'), P: d('KeyP') };
    }

    function render(ctx) {
      S.t += dt;
      const t = S.t;
      /* the entrance, piece by piece: k of each from 0 to 1 */
      const e = (delay, dur) => k01((t - delay) / dur);
      layer(ctx, eo(e(0, .3)), c => draw(c, t, e));
    }
    function draw(ctx, t, e) {
      const hits = S.hits = [];
      let HX = 0, HY = 0;                                            // how far the piece being drawn has slid
      const hit = (id, x, y, w, h, run) => hits.push({ id, x: x + HX, y: y + HY, w, h, run });
      const pop = what => { const k = (t - (S.popAt[what] ?? -9)) / .22; return k < 1 ? 1 + Math.sin(k01(k) * Math.PI) * .06 : 1; };
      const R = rows(), focus = r => R[S.row] === r, pt = party(), inParty = !!pt, waiting = guest();
      const K = SOC_KITS, mine = K[S.kit], theirs = K[cfg().opp];
      const targets = {};
      const scaled = (cx, cy, k, fn) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); fn(); ctx.restore(); };

      /* the arena shows through, dimmed */
      rect(ctx, 0, 0, 960, 600, 'rgba(12,10,22,.62)');
      /* the name drops in; what it is fades up under it */
      const ty = snap(-120 * (1 - back(e(0, .6), 1.4)) + Math.sin(t * 2.2) * 2);
      block(ctx, 'SOCCER', 480, 50 + ty, 7, C.yel, C.ochre, 2, false, '#fdf07a');
      ctx.save(); ctx.globalAlpha *= eo(e(.3, .4));
      text(ctx, 'SMALL-SIDED AND NON-STOP: NO THROW-INS, NO CORNERS', 480, 106, 2, C.mist, { outline: null });
      ctx.restore();
      const label = (s, x, y, r) => text(ctx, s, x, y, 2, focus(r) ? C.yel : C.mist, { align: 'left', outline: null });

      /* ---- left: mode, position, length; in from the left ---- */
      const lx = snap(-110 * (1 - eo(e(.08, .5))));
      ctx.save(); ctx.translate(lx, 0); HX = lx;
      box(ctx, 48, 126, 484, 364, { fill: C.navy, shine: '#34344e', base: C.deep });
      if (waiting) waitCard();
      else {
        modeRow();
        if (inParty) positionsNote(); else positionRow();
        lengthRow();
      }
      ctx.restore(); HX = 0;

      /* ---- right: your team (online, the home side's), or, waiting in
         someone else's party, who is in it; in from the right ---- */
      const rx = snap(110 * (1 - eo(e(.14, .5))));
      ctx.save(); ctx.translate(rx, 0); HX = rx;
      box(ctx, 548, 126, 364, 364, { fill: C.navy, shine: '#34344e', base: C.deep });
      if (waiting) partyCard(); else kitRow();
      ctx.restore(); HX = 0;

      /* ---- kick off: up from below ---- */
      const gy = snap(90 * (1 - back(e(.24, .5))));
      ctx.save(); ctx.translate(0, gy); HY = gy;
      /* in a party the host starts it, for everyone; a guest's button says so, and waits */
      const gf = focus('go'), gh = S.hover === 'go', since = S.go ? t - S.go : -1;
      const k = since >= 0 ? 1 + Math.sin(k01(since / .2) * Math.PI) * .07 : gf && !waiting ? 1 + (Math.sin(t * 6) + 1) * .015 : 1;
      scaled(480, 531, k, () => {
        if (waiting) {
          box(ctx, 330, 502, 300, 58, { fill: gh ? '#3a3a58' : C.deep, rim: C.steel, shine: '#34344e', base: '#101018' });
          text(ctx, 'HOST STARTS', 480, 529 + snap(Math.sin(t * 3) * 1), 3, C.mist, { thick: true });
        } else {
          box(ctx, 330, 502, 300, 58, { fill: since >= 0 && since < .12 ? C.rim : gf || gh ? C.yel : C.gold, rim: C.rim, shine: '#fdf07a', base: C.ochre });
          text(ctx, inParty ? 'START' : 'KICK OFF', 480, 529, 4, C.ink, { thick: true, outline: null });
        }
      });
      targets.go = { x: 330, y: 502 + gy, w: 300, h: 58 };
      hit('go', 330, 502, 300, 58, () => go());
      ctx.restore(); HY = 0;

      /* ---- the keys, bottom right, in from the right ---- */
      const hx = snap(360 * (1 - eo(e(.4, .45))));
      keyPanel(ctx, waiting ? [['ESC', 'HUB']] : [['move', 'CHOOSE'], ['Z', inParty ? 'START' : 'KICK OFF']], 950 + hx, 560, S.keys);
      /* and friends, bottom left: open a party, or who is in yours */
      const fr = [['P', inParty ? (pt.isHost ? 'PARTY OF ' + pt.size : 'IN A PARTY') : 'PLAY ONLINE']];
      keyPanel(ctx, fr, 10 + keyPanelW(fr) - hx, 560, S.keys);
      hit('party', 10 - hx, 560, keyPanelW(fr), 36, () => hooks.openParty && hooks.openParty());

      /* ---- the cursor, gliding to whatever has focus ---- */
      const tg = waiting ? null : targets[R[S.row]];
      if (tg) {
        const cur = S.cur || (S.cur = Object.assign({}, tg));
        for (const q of ['x', 'y', 'w', 'h']) glide(cur, q, tg[q], 20);
        brackets(ctx, cur, t, since);
      }

      /* ---- the pieces ---- */
      function modeRow() {
        label('MODE', 76, 152, 'mode');
        [1, 2, 3].forEach((m, i) => {
          const x = 74 + i * 150, y = 166, w = 138, h = 94, sel = S.mode === m, hov = S.hover === 'mode' + m, lift = hov && !sel ? -P : 0;
          /* too few places for everyone in the party: shown, but not for picking */
          const off = m < least();
          scaled(x + w / 2, y + h / 2, sel ? pop('mode') : 1, () => layer(ctx, off ? .35 : 1, c => {
            box(c, x, y + lift, w, h, { fill: sel ? '#3a3a58' : C.navy, rim: sel ? C.yel : hov && !off ? C.mist : C.steel, shine: sel ? '#4a4a6a' : '#303048', base: C.deep });
            miniPitch(c, x + 14, y + 14 + lift, w - 28, 42, m, mine.chip, theirs.chip);
            text(c, m + 'V' + m, x + w / 2, y + 74 + lift, 3, sel ? C.yel : C.rim, { thick: true });
          }));
          if (sel) targets.mode = { x: x + lx, y, w, h };
          hit('mode' + m, x, y, w, h, () => { S.row = 0; if (!off && S.mode !== m) { S.mode = m; SocSound.play('tick'); changed('mode'); } });
        });
      }
      function positionRow() {
        label('POSITION', 76, 284, 'pos');
        const pl = positions();
        pl.forEach((r, i) => {
          const x = 74 + i * 150, y = 298, w = 138, h = 118, sel = S.pos === r, hov = S.hover === 'pos' + r, lift = hov && !sel ? -P : 0;
          scaled(x + w / 2, y + h / 2, sel ? pop('pos') : 1, () => {
            box(ctx, x, y + lift, w, h, { fill: sel ? '#3a3a58' : C.navy, rim: sel ? C.yel : hov ? C.mist : C.steel, shine: sel ? '#4a4a6a' : '#303048', base: C.deep });
            /* you, in that position: in goal, in the keeper's kit */
            sprite(ctx, hooks.sheet(r), r === 'gk' ? 'ready' : r === 'fw' && sel ? 'run' : 'idle', t + i * .3, x + w / 2, y + 88 + lift, 2, 1);
            text(ctx, POS_NAME[r], x + w / 2, y + 104 + lift, 2, sel ? C.yel : C.rim);
            if (sel) drawMarker(ctx, x + w / 2, y + 30 + snap(Math.sin(t * 7) * 2));
          });
          if (sel) targets.pos = { x: x + lx, y, w, h };
          hit('pos' + r, x, y, w, h, () => { S.row = 1; if (S.pos !== r) { S.pos = r; SocSound.play('tick'); changed('pos'); } });
        });
        /* what the position row means for this mode, in the room left over */
        const note = pl.length === 1 ? ['NO KEEPERS IN 1V1:', 'YOU ATTACK AND', 'DEFEND ALONE'] : pl.length === 2 ? ['EACH SIDE:', '1 KEEPER', '1 STRIKER'] : null;
        if (note) {
          const nx = pl.length === 1 ? 366 : 443;
          note.forEach((s, i) => text(ctx, s, nx, 336 + i * 24, 2, i ? C.rim : C.grey, { outline: null }));
        }
      }
      /* online, where each person plays is picked on the lineup, after this */
      function positionsNote() {
        text(ctx, 'POSITIONS', 76, 284, 2, C.mist, { align: 'left', outline: null });
        ['EVERYONE PICKS THEIR OWN', 'ON THE NEXT SCREEN:', 'FIRST COME, FIRST SERVED.'].forEach((s, i) =>
          text(ctx, s, 290, 330 + i * 28, 2, i === 2 ? C.yel : C.rim, { outline: null }));
      }
      function lengthRow() {
        label('LENGTH', 76, 450, 'min');
        const mx = 300, my = 450;
        text(ctx, '<', mx - 70, my, 3, S.min > 2 ? C.rim : C.steel, { thick: true });
        scaled(mx, my, pop('min'), () => text(ctx, S.min + ' MIN', mx, my, 3, focus('min') ? C.yel : C.rim, { thick: true }));
        text(ctx, '>', mx + 70, my, 3, S.min < 5 ? C.rim : C.steel, { thick: true });
        targets.min = { x: mx - 92 + lx, y: my - 20, w: 184, h: 40 };
        hit('minL', mx - 90, my - 18, 40, 36, () => { S.row = R.indexOf('min'); step('min', -1); });
        hit('minR', mx + 50, my - 18, 40, 36, () => { S.row = R.indexOf('min'); step('min', 1); });
      }
      /* someone else's party: the host is choosing, then everyone picks a place */
      function waitCard() {
        text(ctx, 'WAITING FOR THE HOST', 290, 186 + snap(Math.sin(t * 3) * 1), 3, C.rim, { thick: true });
        ['THE HOST PICKS THE SIZE,', 'THE LENGTH AND THE KITS.', '', 'THEN EVERYONE PICKS WHERE', 'THEY PLAY: FIRST COME,', 'FIRST SERVED.']
          .forEach((s, i) => { if (s) text(ctx, s, 290, 244 + i * 26, 2, i < 2 ? C.mist : C.rim, { outline: null }); });
        miniPitch(ctx, 150, 412, 280, 46, 2, C.mist, C.steel);
      }
      /* The kit on a carousel: the old one slides off one way as the new one
         slides in from the other, player, name and all. Online it is the
         home side's: who plays on which side is picked on the lineup. */
      function kitRow() {
        label(inParty ? 'HOME SIDE' : 'YOUR TEAM', 576, 152, 'kit');
        /* a spotlight of grass under the player */
        rect(ctx, 650, 350, 160, 14, 'rgba(92,135,58,.55)'); rect(ctx, 666, 346, 128, 4, 'rgba(92,135,58,.4)');
        const role = inParty ? 'fw' : S.pos;
        ctx.save(); ctx.beginPath(); ctx.rect(560, 168, 340, 312); ctx.clip();
        const kk = eo((t - S.kitAt) / .34);
        const side = (ki, dx) => {
          const kit = K[ki], opp = K[socCfg(Object.assign({}, S, { kit: ki })).opp], x = snap(730 + dx);
          sprite(ctx, hooks.sheet(role, ki), role === 'gk' ? 'ready' : 'idle', t, x, 360, 4, 1);
          const nw = Hud.pixWidth(kit.name, 4, true);
          chip(ctx, x - nw / 2 - 30, 396, 18, kit.chip);
          text(ctx, kit.name, x + 12, 404, 4, focus('kit') ? C.yel : C.rim, { thick: true });
          const vs = 'VS ' + opp.name, vw = Hud.pixWidth(vs, 2);
          chip(ctx, x - vw / 2 - 20, 446, 10, opp.chip);
          text(ctx, vs, x + 6, 451, 2, C.mist);
        };
        if (kk < 1) side(S.kitPrev, -S.kitDir * kk * 200);
        side(S.kit, S.kitDir * (1 - kk) * 200);
        ctx.restore();
        const ax = snap(Math.sin(t * 4) * 2);
        text(ctx, '<', 598 - ax, 280, 4, S.hover === 'kitL' ? C.yel : C.rim, { thick: true });
        text(ctx, '>', 862 + ax, 280, 4, S.hover === 'kitR' ? C.yel : C.rim, { thick: true });
        hit('kitL', 572, 240, 56, 80, () => { S.row = R.indexOf('kit'); step('kit', -1); });
        hit('kitR', 832, 240, 56, 80, () => { S.row = R.indexOf('kit'); step('kit', 1); });
        targets.kit = { x: 580 + rx, y: 228, w: 300, h: 240 };
      }
      /* who is in the party, standing on the grass: everyone here plays */
      function partyCard() {
        const n = pt.size, gap = Math.min(52, 300 / Math.max(1, n));
        text(ctx, 'IN THIS PARTY', 576, 152, 2, C.mist, { align: 'left', outline: null });
        text(ctx, n + (n === 1 ? ' PLAYER' : ' PLAYERS'), 730, 222, 4, C.rim, { thick: true });
        rect(ctx, 578, 350, 304, 14, 'rgba(92,135,58,.55)'); rect(ctx, 594, 346, 272, 4, 'rgba(92,135,58,.4)');
        for (let i = 0; i < n; i++) sprite(ctx, hooks.person(i), 'idle', t + i * .31, snap(730 + (i - (n - 1) / 2) * gap), 360, 2, i % 2 ? -1 : 1);
        text(ctx, 'EVERYONE HERE PLAYS', 730, 420, 2, C.mist, { outline: null });
      }
    }
    return { update, render, state: S };
  }

  /* the 1P tag over a player, from the art's own markers */
  function drawMarker(ctx, x, y) {
    const m = SocArt.A.pieces.markers;
    if (!m) return;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(m, 0, 0, 16, 16, Math.round(x - 16), Math.round(y - 16), 32, 32);
    ctx.restore();
  }

  /* ---- the lineup ----
     Online, before the kickoff (lineup.js): both sides' positions as cards,
     home on the left, away on the right, each with the player as they will
     look, the position, and who has it (CPU until someone does). Everyone
     takes one, first come, first served: yours is lit and has your 1P tag
     over it, one you have asked for pulses until the host says it is
     yours. Arrows or the mouse to choose, Z to take, X to give it back.
     Under the cards: who is still choosing, then the countdown.
     hooks: view() (lineup.js), sheet(team, role, k), kits(), cursor(c). */
  function lineup(api, hooks) {
    const S = { t: 0, team: 0, row: 0, hits: [], hover: '', cur: null, keys: {}, cdAt: -9, cdN: -1, nope: { at: -9, i: -1 } };
    const rowsOf = (v, team) => v.places.map((q, i) => Object.assign({ i }, q)).filter(q => q.team === team);
    /* this screen's choice this step: a place, -1 to give it back, or nothing */
    function update() {
      const I = api.input, pr = c => I.pressed(c), v = hooks.view();
      const R = [rowsOf(v, 0), rowsOf(v, 1)], n = R[0].length;
      let pick;
      S.row = socClamp(S.row, 0, n - 1);
      const move = (team, row) => { if (team === S.team && row === S.row) return; S.team = team; S.row = row; SocSound.play('tick'); };
      if (pr('ArrowUp') || pr('KeyW')) move(S.team, Math.max(0, S.row - 1));
      if (pr('ArrowDown') || pr('KeyS')) move(S.team, Math.min(n - 1, S.row + 1));
      if (pr('ArrowLeft') || pr('KeyA')) move(0, S.row);
      if (pr('ArrowRight') || pr('KeyD')) move(1, S.row);
      const take = q => {
        if (q.pid && q.pid !== v.me) { S.nope = { at: S.t, i: q.i }; return; }        // someone else's
        if (q.pid === v.me) return;
        pick = q.i; SocSound.play('tick');
      };
      if (pr('KeyZ') || pr('Enter') || pr('NumpadEnter') || pr('Space')) take(R[S.team][S.row]);
      if ((pr('KeyX') || pr('Backspace')) && v.mine !== undefined) { pick = -1; SocSound.play('tick'); }
      let c;
      while (I.takeClick && (c = I.takeClick())) {
        const h = S.hits.find(q => c.x >= q.x && c.x <= q.x + q.w && c.y >= q.y && c.y <= q.y + q.h);
        if (h) { S.team = h.team; S.row = h.row; take(R[h.team][h.row]); }
      }
      const p = I.pointer, h = p && p.inside ? S.hits.find(q => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) : null;
      if (h && h.id !== S.hover) move(h.team, h.row);
      S.hover = h ? h.id : '';
      hooks.cursor(h ? 'pointer' : '');
      const d = k => I.down(k);
      S.keys = { u: d('ArrowUp') || d('KeyW'), d: d('ArrowDown') || d('KeyS'), l: d('ArrowLeft') || d('KeyA'), r: d('ArrowRight') || d('KeyD'),
        Z: d('KeyZ') || d('Enter') || d('Space'), X: d('KeyX') || d('Backspace') };
      return pick;
    }

    function render(ctx) {
      S.t += dt;
      const t = S.t, e = (delay, dur) => k01((t - delay) / dur);
      layer(ctx, eo(e(0, .3)), c => draw(c, hooks.view(), t, e));
    }
    function draw(ctx, v, t, e) {
      const hits = S.hits = [], K = hooks.kits();
      rect(ctx, 0, 0, 960, 600, 'rgba(12,10,22,.62)');
      stamp(ctx, 'PICK YOUR POSITION', 480, 54, 5, C.yel, C.ochre, 2, t, '#fdf07a');
      ctx.save(); ctx.globalAlpha *= eo(e(.45, .4));
      text(ctx, v.mode + 'V' + v.mode + '   ' + v.min + ' MIN   FIRST COME, FIRST SERVED', 480, 100, 2, C.mist, { outline: null });
      ctx.restore();

      /* ---- the two sides, sliding in from their own edges ---- */
      let target = null;
      for (const team of [0, 1]) {
        const sx = snap((team ? 1 : -1) * 110 * (1 - eo(e(.08 + team * .06, .5))));
        const x0 = team ? 492 : 48, y0 = 122, w = 420, h = 366, kit = K[team];
        ctx.save(); ctx.translate(sx, 0);
        box(ctx, x0, y0, w, h, { fill: C.navy, shine: '#34344e', base: C.deep });
        chip(ctx, x0 + 22, y0 + 17, 16, kit.chip);
        text(ctx, kit.name, x0 + 50, y0 + 25, 3, C.rim, { align: 'left', thick: true });
        text(ctx, team ? 'AWAY' : 'HOME', x0 + w - 22, y0 + 25, 2, C.grey, { align: 'right', outline: null });
        const rows = rowsOf(v, team), n = rows.length, gap = 10, avail = h - 64;
        const rh = Math.min(96, Math.floor((avail - (n - 1) * gap) / n)), top = y0 + 50 + Math.floor((avail - (n * rh + (n - 1) * gap)) / 2);
        rows.forEach((q, r) => {
          const x = x0 + 14, y = top + r * (rh + gap), cw = w - 28;
          const mine = q.pid === v.me, other = !!q.pid && !mine, asking = v.pending === q.i && !q.pid;
          const nope = S.nope.i === q.i ? k01((t - S.nope.at) / .3) : 1, shake = nope < 1 ? snap(Math.sin(nope * Math.PI * 4) * 4 * (1 - nope)) : 0;
          const lit = mine || (asking && Math.floor(t * 6) % 2 === 0);
          ctx.save(); ctx.translate(shake, 0);
          box(ctx, x, y, cw, rh, { fill: mine ? '#3a3a58' : C.deep, rim: lit ? C.yel : other ? C.mist : C.steel, shine: '#2c2c44', base: '#101018', shadow: false });
          /* the player: the person who has it, or the computer's */
          const k = q.pid !== undefined ? v.k[q.pid] : null, feet = y + rh - 12;
          sprite(ctx, hooks.sheet(team, q.role, k), q.role === 'gk' ? 'ready' : 'idle', t + r * .37 + team * .2, x + 50, feet, 2, team ? -1 : 1);
          if (mine) drawMarker(ctx, x + 50, feet - 72 + snap(Math.sin(t * 7) * 2));
          text(ctx, q.pos, x + 102, y + 24, 2, C.grey, { align: 'left', outline: null });
          const who = mine ? v.names[q.pid] : other ? v.names[q.pid] : asking ? 'TAKING...' : 'CPU';
          text(ctx, who, x + 102, y + rh / 2 + 10, 3, mine ? C.yel : other ? C.rim : asking ? C.mist : C.steel, { align: 'left', thick: mine || other });
          if (mine) text(ctx, 'YOU', x + cw - 16, y + 24, 2, C.yel, { align: 'right', outline: null });
          ctx.restore();
          hits.push({ id: team + ':' + r, team, row: r, x: x + sx, y, w: cw, h: rh });
          if (S.team === team && S.row === r) target = { x: x + sx, y, w: cw, h: rh };
        });
        ctx.restore();
      }
      /* the cursor, gliding to the card this screen is on */
      if (target) {
        const cur = S.cur || (S.cur = Object.assign({}, target));
        for (const q of ['x', 'y', 'w', 'h']) glide(cur, q, target[q], 20);
        brackets(ctx, cur, t, -1);
      }

      /* ---- under the cards: the countdown, or who is still choosing ---- */
      const fk = eo(e(.5, .4)), yS = 520;
      if (v.cd >= 0) {
        const nNow = Math.max(1, Math.ceil(v.cd));
        if (nNow !== S.cdN) { S.cdN = nNow; S.cdAt = t; }
        const pk = k01((t - S.cdAt) / .25), dy = snap(-10 * (1 - back(pk, 2)));
        block(ctx, 'KICK OFF IN ' + nNow, 480, yS + dy, 4, C.yel, C.ochre, 2, false, '#fdf07a', true);
      } else {
        S.cdN = -1;
        const all = new Set(v.places.map(q => q.pid).filter(Boolean));
        const left = v.players.filter(id => !all.has(id) && id !== v.me).map(id => v.names[id]);
        const line = v.mine === undefined ? 'CHOOSE A POSITION, THEN Z TO TAKE IT'
          : left.length === 1 ? 'WAITING FOR ' + left[0] : left.length ? 'WAITING FOR ' + left.length + ' PLAYERS' : '';
        ctx.save(); ctx.globalAlpha *= fk;
        if (line) text(ctx, line, 480, yS, 3, v.mine === undefined ? C.yel : C.rim, { thick: v.mine === undefined });
        if (v.tl >= 0 && v.tl <= 10) text(ctx, 'EVERYONE LEFT GETS A PLACE IN ' + v.tl, 480, yS + 26, 2, C.grey, { outline: null });
        ctx.restore();
      }
      const hx = snap(360 * (1 - eo(e(.4, .45))));
      keyPanel(ctx, [['move', 'CHOOSE'], ['Z', 'TAKE'], ['X', 'LEAVE']], 950 + hx, 560, S.keys);
    }
    return { update, render };
  }

  /* ---- in the match ----
     W.ui holds what the match screens animate: set to {} at every kickoff
     of a new match, so the scoreboard and the controls come in again. */

  /* The scoreboard: each side's colour and name either side of the score,
     and the clock on a tab hanging under it, all above the far boards. It
     drops in when a match starts and lifts away for the results. A goal
     bumps the scorers' number and flashes the rim in their colour. */
  function scoreboard(ctx, W) {
    const U = W.ui, [t0, t1] = W.teams;
    const show = !W.hudOff;
    if (show) { if (U.sbIn === undefined) U.sbIn = now; U.sbOut = undefined; }
    else if (U.sbIn !== undefined && U.sbOut === undefined) U.sbOut = now;
    if (U.sbIn === undefined) return;
    const kin = back((now - U.sbIn) / .55, 1.6), kout = U.sbOut === undefined ? 0 : ei((now - U.sbOut) / .3);
    if (kout >= 1) return;
    ctx.save(); ctx.translate(0, snap(-80 * (1 - kin) - 80 * kout));
    const cx = 480, w = 336, h = 38, x = cx - w / 2, y = 2;
    const s = Math.max(0, Math.ceil(W.clock)), clock = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const late = W.clock <= 10 && W.phase === 'play', blink = late && W.clock % 1 > .5;
    box(ctx, cx - 44, y + h - 6, 88, 26, { fill: blink ? C.wine : C.deep, shine: '#2c2c44', shadow: false });
    text(ctx, clock, cx, y + h + 9, 2, late ? C.rim : C.yel, { outline: null });
    const g = U.goalAt === undefined ? 9 : now - U.goalAt, flash = g < 1.2 && Math.floor(g * 8) % 2 === 0;
    box(ctx, x, y, w, h, { fill: C.navy, rim: flash ? U.goalCol : C.rim, shine: '#34344e', base: C.deep });
    chip(ctx, x + 14, y + 12, 14, t0.kit.chip);
    chip(ctx, x + w - 28, y + 12, 14, t1.kit.chip);
    text(ctx, t0.kit.short, x + 38, y + h / 2, 3, C.rim, { align: 'left' });
    text(ctx, t1.kit.short, x + w - 38, y + h / 2, 3, C.rim, { align: 'right' });
    rect(ctx, cx - 48, y + 6, 96, h - 12, C.deep);
    for (const i of [0, 1]) {
      const mine = U.goalTeam === i && g < 1.2;
      const bump = mine && g < .45 ? Math.round(Math.sin(g / .45 * Math.PI) * 2) : 0;
      text(ctx, String(W.score[i]), cx + (i ? 24 : -24), y + h / 2, 3 + bump, mine && flash ? C.yel : C.rim, { thick: true });
    }
    text(ctx, '-', cx, y + h / 2, 2, C.steel, { outline: null });
    ctx.restore();
  }

  /* A banner: the word stamped in in the title's block letters, high over
     the pitch so it never covers the players at a kickoff, and a small plate
     under it with the rest. A goal adds a band of the scorers' colour behind
     it. It lifts and fades as one picture. */
  function banner(ctx, W) {
    const B = W.banner;
    if (!B) return;
    if (B.at === undefined) B.at = now;
    const t = now - B.at, end = B.dur > 1e8 ? 1e9 : B.dur, out = k01((t - (end - .32)) / .32);
    /* high enough that the plate clears the 1P tag over a kickoff */
    const px = B.text.length <= 5 ? 10 : 8, depth = 3, y = 124;
    if (B.band) {
      const kb = eo(t / .16), fb = 1 - k01((t - .3) / .9), hh = snap(130 * kb);
      if (fb > 0) { ctx.save(); ctx.globalAlpha *= .26 * fb; rect(ctx, 0, y + 12 - hh / 2, 960, hh, B.band); ctx.restore(); }
    }
    layer(ctx, 1 - out, c => {
      c.save(); c.translate(0, snap(-out * 28));
      stamp(c, B.text, 480, y, px, B.face || C.yel, B.side || '#9a5a06', depth, t, B.hi === undefined ? '#fdf07a' : B.hi);
      if (B.sub) plate(c, B, 480, y + px * 3.5 + depth * px + 30, t);
      c.restore();
    });
  }
  /* the plate under a banner's word: a line of text with a team's chip at
     each end, rising into place */
  function plate(ctx, B, cx, cy, t) {
    const k = eo((t - .24) / .3);
    if (k <= 0) return;
    const tw = Hud.pixWidth(B.sub, 3), w = snap(tw + (B.chips ? 84 : 44)), h = 32;
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, snap((1 - k) * 14));
    box(ctx, cx - w / 2, cy - h / 2, w, h, { fill: C.deep, rim: B.rim || C.steel, shine: '#2c2c44', base: '#101018' });
    if (B.chips) { chip(ctx, cx - w / 2 + 16, cy - 6, 12, B.chips[0]); chip(ctx, cx + w / 2 - 28, cy - 6, 12, B.chips[1]); }
    text(ctx, B.sub, cx, cy, 3, C.rim, { outline: null });
    ctx.restore();
  }

  /* ---- the controls, bottom right, all match long ----
     Below the near boards, so they never cover play. Z and X say what they
     do now (it changes with the ball), and each key sinks while it is held.
     A word that changes slides out as the new one slides in; a key with
     nothing to do folds away and the panel closes up round it. */
  function controlList(W, hp) {
    const b = W.ball, o = b.owner, t = hp.team, mates = t.players.some(p => p !== hp && !p.gk);
    if (hp.gk && !(o === hp && !hp.holding)) return o === hp ? { Z: 'THROW', X: 'PUNT' } : { Z: null, X: 'DIVE' };
    if (o === hp) return { Z: mates ? 'PASS' : 'LOB', X: 'SHOOT' };
    if (socHeadable(hp, b)) return { Z: 'HEAD ON', X: 'HEADER' };
    if (o && o.team === t) return { Z: 'CALL', X: 'SLIDE' };
    return { Z: null, X: 'TACKLE' };
  }
  function controls(ctx, W) {
    const U = W.ui, hp = W.me;
    const live = !!hp && !W.hudOff && (W.phase === 'play' || W.phase === 'kickoff' || W.phase === 'goal');
    const k = glide(U, 'ctK', live ? 1 : 0, live ? 6 : 9, 0);
    if (k < .005 || !hp) return;
    const want = controlList(W, hp), slots = U.slots || (U.slots = { Z: { k: 0 }, X: { k: 0 } });
    for (const key of ['Z', 'X']) {
      const s = slots[key], w = want[key];
      /* a word holds for a moment before it can change, so a ball bobbing
         in and out of heading range does not make it flicker */
      if (w && s.label !== w && (s.label === undefined || now - s.at > .25)) { s.prev = s.label; s.label = w; s.at = now; }
      glide(s, 'k', w ? 1 : 0, 14, 0);
    }
    const keys = W.keys || {};
    /* the width each slot takes: its key, and its word (between the old
       word's width and the new one's while they swap) */
    const slotW = key => {
      const s = slots[key];
      if (!s.label) return 0;
      const kx = eo((now - s.at) / .2), lw = s.prev ? labW(s.prev) + (labW(s.label) - labW(s.prev)) * kx : labW(s.label);
      return (keyW(key) + 8 + lw + 16) * eo(s.k);
    };
    const inner = DPAD_W + 8 + labW('MOVE') + 16 + slotW('Z') + slotW('X') - 16;
    const w = snap(glide(U, 'ctW', inner + 28, 18));
    const right = 950 + snap((1 - eo(k)) * (w + 20)), y = 560, x0 = snap(right - w);
    box(ctx, x0, y, w, 36, { fill: C.deep, rim: C.steel, shine: '#2c2c44', base: '#101018' });
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 4, y + 4, w - 8, 28); ctx.clip();
    let x = x0 + 14;
    dpad(ctx, x, y + 8, keys);
    x += DPAD_W + 8;
    text(ctx, 'MOVE', x, y + 18, 2, C.rim, { align: 'left', outline: null });
    x += labW('MOVE') + 16;
    for (const key of ['Z', 'X']) {
      const s = slots[key], sw = slotW(key);
      if (!s.label || sw < 1) continue;
      /* a slot folding away keeps inside its own shrinking width */
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, sw, 36); ctx.clip(); ctx.globalAlpha *= eo(s.k);
      cap(ctx, x, y + 6, keyW(key), 20, key, keys[key]);
      const lx = x + keyW(key) + 8, kx = eo((now - s.at) / .2);
      if (kx < 1 && s.prev) {
        ctx.save(); ctx.globalAlpha *= 1 - kx;
        text(ctx, s.prev, lx, y + 18 - snap(kx * 12), 2, C.rim, { align: 'left', outline: null });
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha *= s.prev ? kx : 1;
      text(ctx, s.label, lx, y + 18 + (s.prev ? snap((1 - kx) * 12) : 0), 2, key === 'X' ? C.yel : C.rim, { align: 'left', outline: null });
      ctx.restore();
      ctx.restore();
      x += sw;
    }
    ctx.restore();
  }

  /* ---- confetti, for a goal of yours ---- */
  function burst(W, cols) {
    const U = W.ui, list = U.conf || (U.conf = []);
    for (let i = 0; i < 150; i++) list.push({
      x: socRand(-20, 980), y: socRand(-180, -8), vx: socRand(-50, 50), vy: socRand(40, 170), t: 0,
      life: socRand(2, 3.2), w: socRand(4, 9), ph: Math.random() * 6, c: cols[i % cols.length], s: Math.random() < .35 ? 8 : 6
    });
  }
  function confetti(ctx, W) {
    const U = W.ui;
    if (!U.conf || !U.conf.length) return;
    for (const q of U.conf) { q.t += dt; q.vy = Math.min(q.vy + 150 * dt, 190); q.x += (q.vx + Math.sin(q.t * q.w + q.ph) * 46) * dt; q.y += q.vy * dt; }
    U.conf = U.conf.filter(q => q.t < q.life && q.y < 610);
    for (const q of U.conf) {
      const face = Math.sin(q.t * q.w * 1.4 + q.ph) > 0;
      ctx.save(); ctx.globalAlpha *= k01((q.life - q.t) / .5);
      rect(ctx, snap(q.x), snap(q.y), q.s, face ? q.s : P, q.c);
      ctx.restore();
    }
  }

  /* a person's name over their player, online: on a dark tab with their
     side's colour under it (the pixel face has capitals, figures and a
     little punctuation, so anything else goes) */
  function nameTag(ctx, s, x, y, col) {
    s = String(s).toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').trim().slice(0, 10);
    if (!s) return;
    const w = snap(Hud.pixWidth(s, 2) + 12);
    x = snap(x); y = snap(y);
    rect(ctx, x - w / 2, y - 10, w, 20, 'rgba(18,11,11,.66)');
    rect(ctx, x - w / 2, y + 8, w, P, col);
    text(ctx, s, x, y - 1, 2, C.rim, { outline: null });
  }

  /* "HERE!" over your head when you call for the ball */
  function shout(ctx, x, y, k) {
    const s = 'HERE!', w = Hud.pixWidth(s, 2) + 16, pop = 1 + Math.max(0, k - .8) * .8;
    ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
    box(ctx, -w / 2, -26, w, 24, { fill: C.rim, rim: C.rim, shadow: false });
    rect(ctx, -2, -4, 4, 4, C.rim); rect(ctx, -4, -4, 2, 2, C.ink); rect(ctx, 2, -4, 2, 2, C.ink); rect(ctx, -2, 0, 4, 2, C.ink);
    text(ctx, s, 0, -14, 2, C.ink, { outline: null });
    ctx.restore();
  }

  /* the ball off the edge of the view: a pointer on the edge, toward it */
  function edgeArrow(ctx, x, y, ang, col) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
    /* a triangle a column at a time, tip first, over a dark one a size up */
    for (let i = 0; i < 7; i++) ctx.fillStyle = C.ink, ctx.fillRect(-P - i * P, -(i + 1) * P, P, (2 * i + 2) * P);
    for (let i = 0; i < 5; i++) ctx.fillStyle = col, ctx.fillRect(-2 * P - i * P, -i * P, P, (2 * i + 1) * P);
    ctx.restore();
  }

  /* ---- full time, on the test page ----
     In the arcade the results page is the arcade's own, in these boxes and
     letters (games/soccer.js); a page with no arcade round it gets this:
     the result, the score, a couple of numbers, and the two ways on.
     Returns its buttons for the match to hit-test. */
  function results(ctx, W, t, sel) {
    const [t0, t1] = W.teams, [a, b] = W.score, won = a > b, lost = a < b;
    const k = k01(t / .35), e = eo(k);
    const hits = [];
    layer(ctx, k, c => {
      rect(c, 0, 0, 960, 600, 'rgba(12,10,22,.7)');
      c.save(); c.translate(0, snap((1 - e) * 40));
      const x = 250, y = 168, w = 460, h = 320;
      stamp(c, won ? 'YOU WIN!' : lost ? 'YOU LOSE' : 'DRAW', 480, 104, 6, won ? C.yel : lost ? C.mist : C.rim, won ? C.ochre : C.steel, 3, t, won ? '#fdf07a' : null);
      box(c, x, y, w, h, { fill: C.navy, shine: '#34344e', base: C.deep });
      text(c, 'FULL TIME', 480, y + 30, 2, C.grey, { outline: null });
      const row = (tm, sc, yy, win) => {
        chip(c, x + 40, yy - 8, 16, tm.kit.chip);
        text(c, tm.kit.name, x + 72, yy, 3, win ? C.yel : C.rim, { align: 'left' });
        text(c, String(sc), x + w - 50, yy, 4, win ? C.yel : C.rim, { thick: true });
      };
      row(t0, a, y + 70, won); row(t1, b, y + 112, lost);
      rect(c, x + 24, y + 140, w - 48, P, C.steel);
      const tot = (W.poss[0] + W.poss[1]) || 1, pc = Math.round(W.poss[0] / tot * 100);
      const stat = (lab, v0, v1, yy) => {
        text(c, String(v0), x + 70, yy, 3, C.rim, { thick: true });
        text(c, lab, 480, yy, 2, C.grey, { outline: null });
        text(c, String(v1), x + w - 70, yy, 3, C.rim, { thick: true });
      };
      stat('SHOTS', W.shots[0], W.shots[1], y + 170);
      stat('POSSESSION', pc + '%', (100 - pc) + '%', y + 204);
      const by = y + 232, bh = 50, BTN = [['again', 'PLAY AGAIN', 'Z / ENTER', true], ['menu', 'MENU', 'M', false]];
      const bw = BTN.map(([, lab]) => Math.max(150, Hud.pixWidth(lab, 3, true) + 36)), gap = 16;
      let bx = x + (w - bw[0] - gap - bw[1]) / 2;
      BTN.forEach(([id, lab, cp, prim], i) => {
        const on = sel === id, bw_ = bw[i];
        box(c, bx, by, bw_, bh, { fill: prim ? (on ? C.yel : C.gold) : (on ? '#3a3a58' : C.deep), rim: prim ? C.rim : on ? C.yel : C.steel, shine: prim ? '#fdf07a' : '#34344e', base: prim ? C.ochre : '#101018' });
        text(c, lab, bx + bw_ / 2, by + 22, 3, prim ? C.ink : C.rim, prim ? { thick: true, outline: null } : { thick: true });
        text(c, cp, bx + bw_ / 2, by + bh + 18, 2, C.grey, { outline: null });
        hits.push({ id, x: bx, y: by + (1 - e) * 40, w: bw_, h: bh });
        bx += bw_ + gap;
      });
      c.restore();
    });
    return hits;
  }

  /* the pieces Beach Volley builds its own screens from are here too:
     the look is the same, the screens are its own (games/volley/ui.js) */
  return {
    P, C, frame, clock, eo, ei, back, glide, layer, snap, k01,
    rect, box, text, block, stamp, sprite, chip, cap, dpad, keyW, labW, DPAD_W, keyPanel, keyPanelW, brackets,
    menu, lineup, drawMarker, nameTag,
    scoreboard, banner, controls, burst, confetti, shout, edgeArrow, results
  };
})();
