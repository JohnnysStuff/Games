/* ============================================================================
   VolUI: Beach Volley's own screens, in Soccer's look (SocUI's boxes, keys
   and pixel lettering, so the two games sit together): the menu, the
   scoreboard, the controls, the serve meter, a partner's call, the tips at
   the start of a match, and the test page's full-time card. Stage units
   (960×600) throughout; every tween runs on the render clock.
   ========================================================================== */
const VolUI = (() => {
  const U = SocUI, C = U.C, P = U.P;
  const snap = U.snap, k01 = U.k01, eo = U.eo, back = U.back;
  let last = 0;
  /* seconds since the last drawn frame, on SocUI's clock (view.js moves it) */
  const tick = () => { const n = U.clock(), d = Math.min(.1, Math.max(0, n - last)); last = n; return d; };

  /* a mini court for the mode cards: sand, the tape, the net, and a dot
     for each player */
  function miniCourt(ctx, x, y, w, h, mode, colA, colB) {
    U.rect(ctx, x - P, y - P, w + 2 * P, h + 2 * P, C.ink);
    U.rect(ctx, x, y, w, h, '#efd29a');
    U.rect(ctx, x, y, w, P, '#f6e2b4');
    const T = '#2f6fd6';
    U.rect(ctx, x + 6, y + 6, w - 12, P, T); U.rect(ctx, x + 6, y + h - 8, w - 12, P, T);
    U.rect(ctx, x + 6, y + 6, P, h - 12, T); U.rect(ctx, x + w - 8, y + 6, P, h - 12, T);
    U.rect(ctx, x + w / 2 - 1, y + 2, P, h - 4, C.rim);
    const ys = mode === 1 ? [.5] : [.3, .72];
    for (const fy of ys) for (const s of [0, 1]) {
      const px = x + w / 2 + (s ? 1 : -1) * w * .28, py = y + fy * h;
      U.rect(ctx, px - 4, py - 4, 8, 8, C.ink); U.rect(ctx, px - 2, py - 2, 4, 4, s ? colB : colA);
    }
  }

  /* ---- the menu ----
     Mode, level, points, and your side, over the beach with the players
     stood on the court, and a big PLAY. Arrows and Z/Enter, or the mouse.
     hooks: preview(cfg), start(cfg) (false if it can't), sheet(kit),
     saved(), save(cfg), cursor(c). */
  const LVLS = ['easy', 'normal', 'hard'], PTS = [11, 15, 21];
  function menu(api, hooks) {
    const S = Object.assign(volCfg(hooks.saved()), { row: 0, t: 0, hits: [], hover: '', popAt: {}, go: 0, kitAt: -9, kitDir: 1, kitPrev: 0, cur: null, keys: {} });
    const cfg = () => volCfg(S);
    const rows = ['mode', 'lvl', 'pts', 'kit', 'go'];
    function changed(what) { S.popAt[what] = S.t; hooks.save(cfg()); hooks.preview(cfg()); }
    function setKit(k, d) { if (k === S.kit) return; S.kitPrev = S.kit; S.kitDir = d; S.kitAt = S.t; S.kit = k; }
    function step(row, d) {
      if (row === 'mode') { const n = volClamp(S.mode + d, 1, 2); if (n === S.mode) return; S.mode = n; }
      else if (row === 'lvl') { const i = LVLS.indexOf(S.lvl), n = volClamp(i + d, 0, 2); if (n === i) return; S.lvl = LVLS[n]; }
      else if (row === 'pts') { const i = PTS.indexOf(S.pts), n = volClamp(i + d, 0, 2); if (n === i) return; S.pts = PTS[n]; }
      else if (row === 'kit') setKit((S.kit + d + VOL_KITS.length) % VOL_KITS.length, d);
      else return;
      VolSound.play('tick'); changed(row);
    }
    function go() { if (S.go || hooks.start(cfg()) === false) return; S.go = S.t; VolSound.play('whistle', 1); }
    hooks.preview(cfg());

    function update() {
      const I = api.input, pr = c => I.pressed(c);
      if (S.go) return;
      if (pr('ArrowUp') || pr('KeyW')) { S.row = Math.max(0, S.row - 1); VolSound.play('tick'); }
      if (pr('ArrowDown') || pr('KeyS')) { S.row = Math.min(rows.length - 1, S.row + 1); VolSound.play('tick'); }
      if (pr('ArrowLeft') || pr('KeyA')) step(rows[S.row], -1);
      if (pr('ArrowRight') || pr('KeyD')) step(rows[S.row], 1);
      if (pr('Enter') || pr('NumpadEnter') || pr('Space') || pr('KeyZ') || pr('KeyX')) go();
      let c;
      while (I.takeClick && (c = I.takeClick())) {
        const h = S.hits.find(q => c.x >= q.x && c.x <= q.x + q.w && c.y >= q.y && c.y <= q.y + q.h);
        if (h) h.run();
      }
      const p = I.pointer, h = p && p.inside ? S.hits.find(q => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) : null;
      S.hover = h ? h.id : '';
      hooks.cursor(h ? 'pointer' : '');
      const d = c => I.down(c);
      S.keys = { u: d('ArrowUp') || d('KeyW'), d: d('ArrowDown') || d('KeyS'), l: d('ArrowLeft') || d('KeyA'), r: d('ArrowRight') || d('KeyD'), Z: d('KeyZ') || d('Enter') };
    }

    function render(ctx) {
      S.t += tick();
      const t = S.t, e = (delay, dur) => k01((t - delay) / dur);
      U.layer(ctx, eo(e(0, .3)), c => draw(c, t, e));
    }
    function draw(ctx, t, e) {
      const hits = S.hits = [];
      let HX = 0, HY = 0;
      const hit = (id, x, y, w, h, run) => hits.push({ id, x: x + HX, y: y + HY, w, h, run });
      const pop = what => { const k = (t - (S.popAt[what] ?? -9)) / .22; return k < 1 ? 1 + Math.sin(k01(k) * Math.PI) * .06 : 1; };
      const focus = r => rows[S.row] === r, K = VOL_KITS, mine = K[S.kit], theirs = K[cfg().opp], targets = {};
      const scaled = (cx, cy, k, fn) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); fn(); ctx.restore(); };
      U.rect(ctx, 0, 0, 960, 600, 'rgba(12,10,22,.55)');
      /* the name drops in; what it is fades up under it */
      const ty = snap(-120 * (1 - back(e(0, .6), 1.4)) + Math.sin(t * 2.2) * 2);
      U.block(ctx, 'BEACH VOLLEY', 480, 50 + ty, 7, C.yel, C.ochre, 2, false, '#fdf07a');
      ctx.save(); ctx.globalAlpha *= eo(e(.3, .4));
      U.text(ctx, (S.mode === 1 ? 'ONE ON ONE' : 'TWO ON TWO') + ' IN THE SAND: FIRST TO ' + S.pts + ', WIN BY 2', 480, 106, 2, C.mist, { outline: null });
      ctx.restore();
      const label = (s, x, y, r) => U.text(ctx, s, x, y, 2, focus(r) ? C.yel : C.mist, { align: 'left', outline: null });

      /* ---- left: mode, level, points; in from the left ---- */
      const lx = snap(-110 * (1 - eo(e(.08, .5))));
      ctx.save(); ctx.translate(lx, 0); HX = lx;
      U.box(ctx, 48, 126, 484, 364, { fill: C.navy, shine: '#34344e', base: C.deep });
      label('MODE', 76, 152, 'mode');
      [1, 2].forEach((m, i) => {
        const x = 74 + i * 226, y = 166, w = 212, h = 94, sel = S.mode === m, hov = S.hover === 'mode' + m, lift = hov && !sel ? -P : 0;
        scaled(x + w / 2, y + h / 2, sel ? pop('mode') : 1, () => {
          U.box(ctx, x, y + lift, w, h, { fill: sel ? '#3a3a58' : C.navy, rim: sel ? C.yel : hov ? C.mist : C.steel, shine: sel ? '#4a4a6a' : '#303048', base: C.deep });
          miniCourt(ctx, x + 16, y + 14 + lift, w - 32, 42, m, mine.chip, theirs.chip);
          U.text(ctx, m + ' ON ' + m, x + w / 2, y + 74 + lift, 3, sel ? C.yel : C.rim, { thick: true });
        });
        if (sel) targets.mode = { x: x + lx, y, w, h };
        hit('mode' + m, x, y, w, h, () => { S.row = 0; if (S.mode !== m) { S.mode = m; VolSound.play('tick'); changed('mode'); } });
      });
      label('COMPUTER', 76, 290, 'lvl');
      LVLS.forEach((l, i) => {
        const x = 74 + i * 150, y = 304, w = 138, h = 50, sel = S.lvl === l, hov = S.hover === 'lvl' + l, lift = hov && !sel ? -P : 0;
        scaled(x + w / 2, y + h / 2, sel ? pop('lvl') : 1, () => {
          U.box(ctx, x, y + lift, w, h, { fill: sel ? '#3a3a58' : C.navy, rim: sel ? C.yel : hov ? C.mist : C.steel, shine: sel ? '#4a4a6a' : '#303048', base: C.deep });
          U.text(ctx, l.toUpperCase(), x + w / 2, y + h / 2 - 1 + lift, 3, sel ? C.yel : C.rim, { thick: true });
        });
        if (sel) targets.lvl = { x: x + lx, y, w, h };
        hit('lvl' + l, x, y, w, h, () => { S.row = 1; if (S.lvl !== l) { S.lvl = l; VolSound.play('tick'); changed('lvl'); } });
      });
      label('POINTS', 76, 420, 'pts');
      {
        const mx = 300, my = 420;
        U.text(ctx, '<', mx - 70, my, 3, S.pts > 11 ? C.rim : C.steel, { thick: true });
        scaled(mx, my, pop('pts'), () => U.text(ctx, 'TO ' + S.pts, mx, my, 3, focus('pts') ? C.yel : C.rim, { thick: true }));
        U.text(ctx, '>', mx + 70, my, 3, S.pts < 21 ? C.rim : C.steel, { thick: true });
        U.text(ctx, 'WIN BY 2', mx, my + 32, 2, C.grey, { outline: null });
        targets.pts = { x: mx - 92 + lx, y: my - 20, w: 184, h: 40 };
        hit('ptsL', mx - 90, my - 18, 40, 36, () => { S.row = 2; step('pts', -1); });
        hit('ptsR', mx + 50, my - 18, 40, 36, () => { S.row = 2; step('pts', 1); });
      }
      ctx.restore(); HX = 0;

      /* ---- right: your side, on a carousel; in from the right ---- */
      const rx = snap(110 * (1 - eo(e(.14, .5))));
      ctx.save(); ctx.translate(rx, 0); HX = rx;
      U.box(ctx, 548, 126, 364, 364, { fill: C.navy, shine: '#34344e', base: C.deep });
      label('YOUR SIDE', 576, 152, 'kit');
      /* a patch of sand under the player */
      U.rect(ctx, 650, 350, 160, 14, 'rgba(239,210,154,.55)'); U.rect(ctx, 666, 346, 128, 4, 'rgba(239,210,154,.4)');
      ctx.save(); ctx.beginPath(); ctx.rect(560, 168, 340, 312); ctx.clip();
      const kk = eo((t - S.kitAt) / .34);
      const side = (ki, dx) => {
        const kit = K[ki], opp = K[volCfg(Object.assign({}, S, { kit: ki })).opp], x = snap(730 + dx);
        U.sprite(ctx, hooks.sheet(ki), 'ready', t, x, 360, 4, 1);
        const nw = Hud.pixWidth(kit.name, 4, true);
        U.chip(ctx, x - nw / 2 - 30, 396, 18, kit.chip);
        U.text(ctx, kit.name, x + 12, 404, 4, focus('kit') ? C.yel : C.rim, { thick: true });
        const vs = 'VS ' + opp.name, vw = Hud.pixWidth(vs, 2);
        U.chip(ctx, x - vw / 2 - 20, 446, 10, opp.chip);
        U.text(ctx, vs, x + 6, 451, 2, C.mist);
      };
      if (kk < 1) side(S.kitPrev, -S.kitDir * kk * 200);
      side(S.kit, S.kitDir * (1 - kk) * 200);
      ctx.restore();
      const ax = snap(Math.sin(t * 4) * 2);
      U.text(ctx, '<', 598 - ax, 280, 4, S.hover === 'kitL' ? C.yel : C.rim, { thick: true });
      U.text(ctx, '>', 862 + ax, 280, 4, S.hover === 'kitR' ? C.yel : C.rim, { thick: true });
      hit('kitL', 572, 240, 56, 80, () => { S.row = 3; step('kit', -1); });
      hit('kitR', 832, 240, 56, 80, () => { S.row = 3; step('kit', 1); });
      targets.kit = { x: 580 + rx, y: 228, w: 300, h: 240 };
      ctx.restore(); HX = 0;

      /* ---- play: up from below ---- */
      const gy = snap(90 * (1 - back(e(.24, .5))));
      ctx.save(); ctx.translate(0, gy); HY = gy;
      const gf = focus('go'), gh = S.hover === 'go', since = S.go ? t - S.go : -1;
      const k = since >= 0 ? 1 + Math.sin(k01(since / .2) * Math.PI) * .07 : gf ? 1 + (Math.sin(t * 6) + 1) * .015 : 1;
      scaled(480, 531, k, () => {
        U.box(ctx, 330, 502, 300, 58, { fill: since >= 0 && since < .12 ? C.rim : gf || gh ? C.yel : C.gold, rim: C.rim, shine: '#fdf07a', base: C.ochre });
        U.text(ctx, 'PLAY', 480, 529, 4, C.ink, { thick: true, outline: null });
      });
      targets.go = { x: 330, y: 502 + gy, w: 300, h: 58 };
      hit('go', 330, 502, 300, 58, () => go());
      ctx.restore(); HY = 0;

      const hx = snap(360 * (1 - eo(e(.4, .45))));
      U.keyPanel(ctx, [['move', 'CHOOSE'], ['Z', 'PLAY']], 950 + hx, 560, S.keys);

      /* the cursor, gliding to whatever has focus */
      const tg = targets[rows[S.row]];
      if (tg) {
        const cur = S.cur || (S.cur = Object.assign({}, tg));
        for (const q of ['x', 'y', 'w', 'h']) U.glide(cur, q, tg[q], 20);
        U.brackets(ctx, cur, t, since);
      }
    }
    return { update, render, state: S };
  }

  /* ---- the scoreboard ----
     Each side's colour, name and points in its own top corner, clear of the
     sky over the net where the ball goes; a ball beside whoever is serving.
     It drops in when a match starts and lifts away for the results; a
     point bumps the number and flashes the rim in the winners' colour. */
  function scoreboard(ctx, W) {
    const Q = W.ui, now = U.clock(), [t0, t1] = W.teams;
    const show = !W.hudOff && W.phase !== 'menu';
    if (show) { if (Q.sbIn === undefined) Q.sbIn = now; Q.sbOut = undefined; }
    else if (Q.sbIn !== undefined && Q.sbOut === undefined) Q.sbOut = now;
    if (Q.sbIn === undefined) return;
    const kin = back((now - Q.sbIn) / .55, 1.6), kout = Q.sbOut === undefined ? 0 : U.ei((now - Q.sbOut) / .3);
    if (kout >= 1) return;
    ctx.save(); ctx.translate(0, snap(-80 * (1 - kin) - 80 * kout));
    const g = Q.ptAt === undefined ? 9 : now - Q.ptAt, flash = g < 1.1 && Math.floor(g * 8) % 2 === 0;
    const w = 200, h = 40, y = 6;
    [t0, t1].forEach((t, i) => {
      const x = i ? 960 - 10 - w : 10, won = Q.ptTeam === i;
      U.box(ctx, x, y, w, h, { fill: C.navy, rim: won && flash ? Q.ptCol : C.rim, shine: '#34344e', base: C.deep });
      const cx = i ? x + w - 28 : x + 14;
      U.chip(ctx, cx, y + 13, 14, t.kit.chip);
      U.text(ctx, t.kit.short, i ? x + w - 40 : x + 40, y + h / 2, 3, C.rim, { align: i ? 'right' : 'left' });
      const bump = won && g < .45 ? Math.round(Math.sin(g / .45 * Math.PI) * 2) : 0;
      const sx = i ? x + 40 : x + w - 40;
      U.rect(ctx, sx - 26, y + 6, 52, h - 12, C.deep);
      U.text(ctx, String(W.score[i]), sx, y + h / 2, 3 + bump, won && flash ? C.yel : C.rim, { thick: true });
      /* the serve: a ball by the side serving */
      if (W.serving === i && W.phase !== 'over') {
        const bx = i ? x - 22 : x + w + 6, by = y + 10, pc = VolArt.piece('beach_ball', 'ball', 0);
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(pc.cv, bx, by, pc.w * 2, pc.h * 2); ctx.restore();
      }
    });
    /* match point, under the side that has it */
    const mp = W.phase === 'serve' ? volMatchPoint(W) : -1;
    if (mp >= 0) {
      const x = mp ? 960 - 10 - 150 : 10, blink = Math.floor(now * 3) % 2 === 0;
      U.box(ctx, x, y + h - 4, 150, 26, { fill: blink ? C.wine : C.deep, shine: '#2c2c44', shadow: false });
      U.text(ctx, 'MATCH POINT', x + 75, y + h + 9, 2, C.yel, { outline: null });
    }
    ctx.restore();
  }

  /* ---- the controls, bottom right ----
     What Z and X do now (it changes with the ball), each key sinking while
     held. A word that changes slides out as the new one slides in; a key
     with nothing to do folds away and the panel closes up round it. */
  function controlList(W, me) {
    const b = W.ball, t = me.team;
    if (W.phase === 'serve') return W.server === me && me.st !== 'serve' ? { Z: me.act.charge ? 'LET GO' : 'SERVE', X: me.act.charge ? null : 'JUMP SERVE' } : { Z: null, X: null };
    if (W.phase !== 'rally' || b.held || b.down || W.ruled) return { Z: null, X: null };
    const theirs = b.team !== t.i, n = volTouchNo(b, t);
    if (theirs && volSide(b.x) !== t.i && Math.abs(me.x - VOL.NX) < 34 && b.kind !== 'serve') return { Z: null, X: 'BLOCK' };
    if (!theirs && b.last === me && !b.block && !W.solo) return { Z: null, X: null };
    const high = volApex(b) > 60 && Math.abs(me.x - VOL.NX) < 60;
    return { Z: n === 1 ? 'PASS' : n === 2 ? 'SET' : 'SHOT', X: n === 1 && !high ? 'DIVE' : 'SPIKE' };
  }
  function controls(ctx, W) {
    const Q = W.ui, me = W.me, now = U.clock();
    const live = !!me && !W.hudOff && (W.phase === 'rally' || W.phase === 'serve' || W.phase === 'point');
    const k = U.glide(Q, 'ctK', live ? 1 : 0, live ? 6 : 9, 0);
    if (k < .005 || !me) return;
    const want = W.phase === 'point' ? (Q.lastWant || { Z: null, X: null }) : controlList(W, me);
    Q.lastWant = want;
    const slots = Q.slots || (Q.slots = { Z: { k: 0 }, X: { k: 0 } });
    for (const key of ['Z', 'X']) {
      const s = slots[key], w = want[key];
      if (w && s.label !== w && (s.label === undefined || now - s.at > .2)) { s.prev = s.label; s.label = w; s.at = now; }
      U.glide(s, 'k', w ? 1 : 0, 14, 0);
    }
    const keys = W.keys || {};
    const slotW = key => {
      const s = slots[key];
      if (!s.label) return 0;
      const kx = eo((now - s.at) / .2), lw = s.prev ? U.labW(s.prev) + (U.labW(s.label) - U.labW(s.prev)) * kx : U.labW(s.label);
      return (U.keyW(key) + 8 + lw + 16) * eo(s.k);
    };
    const inner = U.DPAD_W + 8 + U.labW('MOVE') + 16 + slotW('Z') + slotW('X') - 16;
    const w = snap(U.glide(Q, 'ctW', inner + 28, 18));
    const right = 950 + snap((1 - eo(k)) * (w + 20)), y = 560, x0 = snap(right - w);
    U.box(ctx, x0, y, w, 36, { fill: C.deep, rim: C.steel, shine: '#2c2c44', base: '#101018' });
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 4, y + 4, w - 8, 28); ctx.clip();
    let x = x0 + 14;
    U.dpad(ctx, x, y + 8, keys);
    x += U.DPAD_W + 8;
    U.text(ctx, 'MOVE', x, y + 18, 2, C.rim, { align: 'left', outline: null });
    x += U.labW('MOVE') + 16;
    for (const key of ['Z', 'X']) {
      const s = slots[key], sw = slotW(key);
      if (!s.label || sw < 1) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, sw, 36); ctx.clip(); ctx.globalAlpha *= eo(s.k);
      U.cap(ctx, x, y + 6, U.keyW(key), 20, key, keys[key]);
      const lx = x + U.keyW(key) + 8, kx = eo((now - s.at) / .2);
      if (kx < 1 && s.prev) {
        ctx.save(); ctx.globalAlpha *= 1 - kx;
        U.text(ctx, s.prev, lx, y + 18 - snap(kx * 12), 2, C.rim, { align: 'left', outline: null });
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha *= s.prev ? kx : 1;
      U.text(ctx, s.label, lx, y + 18 + (s.prev ? snap((1 - kx) * 12) : 0), 2, key === 'X' ? C.yel : C.rim, { align: 'left', outline: null });
      ctx.restore();
      ctx.restore();
      x += sw;
    }
    ctx.restore();
  }

  /* The serve meter, beside you while you hold the key: how hard. Too soft
     and it goes into the net, too hard and it sails long; between, the
     harder the deeper. A jump serve's good band is narrower. */
  function serveMeter(ctx, W, sx, sy) {
    const me = W.me;
    if (!me || W.phase !== 'serve' || W.server !== me) return;
    const a = me.act, show = a && a.charge !== undefined && me.st === 'move';
    const Q = W.ui, k = U.glide(Q, 'smK', show ? 1 : 0, show ? 14 : 8, 0);
    if (k < .02) return;
    const pw = show ? a.charge : (Q.smLast || 0);
    if (show) Q.smLast = pw;
    const jump = a && a.kind === 'jump', band = VOL_SERVE_BANDS[jump ? 'jump' : 'float'];
    const x = snap(sx(me.x, me.y) - me.face * 44) - 9, h = 96, y = snap(sy(me.y, 0)) - 116, w = 18;
    ctx.save(); ctx.globalAlpha *= k;
    U.box(ctx, x - 6, y - 6, w + 12, h + 12, { fill: C.deep, rim: C.steel, shine: '#2c2c44', base: '#101018' });
    const Y = v => y + h - Math.round(volClamp(v / VOL_SERVE_MAX, 0, 1) * h);
    U.rect(ctx, x, Y(VOL_SERVE_MAX), w, Y(band.long) - Y(VOL_SERVE_MAX), C.wine);
    U.rect(ctx, x, Y(band.long), w, Y(band.good) - Y(band.long), C.leaf);
    U.rect(ctx, x, Y(band.good), w, Y(band.net) - Y(band.good), C.gold);
    U.rect(ctx, x, Y(band.net), w, y + h - Y(band.net), C.wine);
    /* the needle */
    const ny = Y(pw);
    U.rect(ctx, x - 6, ny - 2, w + 12, 4, C.ink); U.rect(ctx, x - 4, ny - 1, w + 8, 2, C.rim);
    U.text(ctx, jump ? 'JUMP' : 'SERVE', x + w / 2, y + h + 20, 2, C.rim);
    ctx.restore();
  }

  /* The call where the ball came down, like a line judge's: IN in white,
     OUT in red, popping up over the spot and fading as the next serve
     comes round */
  function lineCall(ctx, x, y, inn, age) {
    const s = inn ? 'IN' : 'OUT', w = Hud.pixWidth(s, 3, true) + 20, k = k01(age / .18), a = 1 - k01((age - 1.6) / .3);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(snap(x), snap(y - (1 - eo(k)) * 12));
    U.box(ctx, -w / 2, -16, w, 30, { fill: inn ? C.rim : C.red, rim: inn ? C.rim : '#ff8a80', shadow: false });
    U.text(ctx, s, 0, -2, 3, inn ? C.ink : C.rim, { thick: true, outline: null });
    ctx.restore();
  }
  /* "MINE!" over your partner when he calls for it */
  function call(ctx, x, y, age) {
    const s = 'MINE!', w = Hud.pixWidth(s, 2) + 16, pop = 1 + Math.max(0, .12 - age) * 2.5, a = 1 - k01((age - .7) / .2);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(pop, pop);
    U.box(ctx, -w / 2, -26, w, 24, { fill: C.rim, rim: C.rim, shadow: false });
    U.rect(ctx, -2, -4, 4, 4, C.rim); U.rect(ctx, -4, -4, 2, 2, C.ink); U.rect(ctx, 2, -4, 2, 2, C.ink); U.rect(ctx, -2, 0, 4, 2, C.ink);
    U.text(ctx, s, 0, -14, 2, C.ink, { outline: null });
    ctx.restore();
  }

  /* the tips at the start of a match: how to serve, then how to play it */
  function hint(ctx, W) {
    const Q = W.ui, me = W.me;
    let s = null;
    if (me && W.tips > 0 && !W.hudOff && !W.banner) {
      if (W.phase === 'serve' && W.server === me) s = 'HOLD Z AND LET GO TO SERVE    OR HOLD X FOR A JUMP SERVE';
      else if (W.phase === 'rally' || (W.phase === 'serve' && W.server !== me)) s = 'Z  PASS AND SET      X  JUMP TO SPIKE OR BLOCK      ARROWS AIM A SPIKE';
    }
    const k = U.glide(Q, 'hK', s ? 1 : 0, 8, 0);
    if (s) Q.hS = s;
    if (k < .02 || !Q.hS) return;
    const tw = Hud.pixWidth(Q.hS, 2), w = snap(tw + 40);
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, snap(-(1 - k) * 16));
    U.box(ctx, 480 - w / 2, 58, w, 32, { fill: C.deep, rim: C.steel, shine: '#2c2c44', base: '#101018' });
    U.text(ctx, Q.hS, 480, 74, 2, C.rim, { outline: null });
    ctx.restore();
  }

  /* ---- the full-time card, on the test page ----
     (the arcade has its own results page: games/volley.js). Returns its
     buttons for the match to hit-test. */
  function results(ctx, W, t, sel) {
    const [t0, t1] = W.teams, [a, b] = W.score, my = W.me ? W.me.team.i : 0, won = W.score[my] > W.score[1 - my];
    const k = k01(t / .35), e = eo(k), hits = [];
    U.layer(ctx, k, c => {
      U.rect(c, 0, 0, 960, 600, 'rgba(12,10,22,.7)');
      c.save(); c.translate(0, snap((1 - e) * 40));
      const x = 250, y = 168, w = 460, h = 320;
      U.stamp(c, won ? 'YOU WIN!' : 'YOU LOSE', 480, 104, 6, won ? C.yel : C.mist, won ? C.ochre : C.steel, 3, t, won ? '#fdf07a' : null);
      U.box(c, x, y, w, h, { fill: C.navy, shine: '#34344e', base: C.deep });
      U.text(c, 'GAME, FIRST TO ' + W.cfg.pts, 480, y + 30, 2, C.grey, { outline: null });
      const row = (tm, sc, yy, win) => {
        U.chip(c, x + 40, yy - 8, 16, tm.kit.chip);
        U.text(c, tm.kit.name, x + 72, yy, 3, win ? C.yel : C.rim, { align: 'left' });
        U.text(c, String(sc), x + w - 50, yy, 4, win ? C.yel : C.rim, { thick: true });
      };
      row(t0, a, y + 70, a > b); row(t1, b, y + 112, b > a);
      U.rect(c, x + 24, y + 140, w - 48, P, C.steel);
      const stat = (lab, v0, v1, yy) => {
        U.text(c, String(v0), x + 70, yy, 3, C.rim, { thick: true });
        U.text(c, lab, 480, yy, 2, C.grey, { outline: null });
        U.text(c, String(v1), x + w - 70, yy, 3, C.rim, { thick: true });
      };
      stat('KILLS', W.stats.kill[0], W.stats.kill[1], y + 170);
      stat('ACES  BLOCKS', W.stats.ace[0] + ' ' + W.stats.stuff[0], W.stats.ace[1] + ' ' + W.stats.stuff[1], y + 204);
      const by = y + 232, bh = 50, BTN = [['again', 'PLAY AGAIN', 'Z / ENTER', true], ['menu', 'MENU', 'M', false]];
      const bw = BTN.map(([, lab]) => Math.max(150, Hud.pixWidth(lab, 3, true) + 36)), gap = 16;
      let bx = x + (w - bw[0] - gap - bw[1]) / 2;
      BTN.forEach(([id, lab, cp, prim], i) => {
        const on = sel === id, bw_ = bw[i];
        U.box(c, bx, by, bw_, bh, { fill: prim ? (on ? C.yel : C.gold) : (on ? '#3a3a58' : C.deep), rim: prim ? C.rim : on ? C.yel : C.steel, shine: prim ? '#fdf07a' : '#34344e', base: prim ? C.ochre : '#101018' });
        U.text(c, lab, bx + bw_ / 2, by + 22, 3, prim ? C.ink : C.rim, prim ? { thick: true, outline: null } : { thick: true });
        U.text(c, cp, bx + bw_ / 2, by + bh + 18, 2, C.grey, { outline: null });
        hits.push({ id, x: bx, y: by + (1 - e) * 40, w: bw_, h: bh });
        bx += bw_ + gap;
      });
      c.restore();
    });
    return hits;
  }

  return { menu, scoreboard, controls, serveMeter, call, lineCall, hint, results, miniCourt };
})();
