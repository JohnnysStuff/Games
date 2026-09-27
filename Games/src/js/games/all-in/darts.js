/* ===================================================== ALL IN: DARTS ===
   Throw a dart at a board of rings. Every point on the board is equally
   likely to be hit, so each ring's share of the board IS its chance — the
   rings are sized from the odds, and what you see is honest. The difficulty
   trades small safe rings for a tiny bull that pays a fortune; every setting
   returns 98%. */
ALLIN_TABLES.push({
  id: 'darts', name: 'Darts',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="10.5" cy="13.5" r="8"/><circle cx="10.5" cy="13.5" r="4"/><path d="M10.5 13.5L20 4M17 3.5l3 .5.5 3"/></svg>',
  css: `
.da-board{background:radial-gradient(60% 55% at 50% 44%,rgba(255,201,63,.07),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.da-board canvas{cursor:crosshair}
.da-top{position:absolute;left:14px;top:12px;display:flex;flex-direction:column;gap:2px;pointer-events:none}
.da-top .x{font-size:clamp(30px,4.4vw,44px);line-height:1;color:#fff;transition:color .25s}
.da-top .x.w{color:var(--gr)}.da-top .x.l{color:var(--rd)}.da-top .x.pop{animation:csPop .45s var(--sp)}
.da-top .t{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--mu)}
.da-leg div{position:relative;padding-left:22px}
.da-leg div::before{content:"";position:absolute;left:8px;top:50%;width:9px;height:9px;margin-top:-4.5px;border-radius:3px;background:var(--c)}
.da-leg small{color:var(--mu2);font-weight:700;margin-left:6px}
`,
  bot(C) {
    const d = [[.04, .16, .30, .30, .20], [.02, .08, .20, .30, .40], [.01, .04, .15, .30, .50], [.005, .02, .08, .30, .595]];
    const m = [[400, 200, 120, 40, 10], [1000, 400, 155, 50, 0], [3000, 800, 200, 20, 0], [10000, 1200, 300, 0, 0]];
    const k = C.rint(4);
    let r = C.rnd();
    for (let i = 0; i < 5; i++) { r -= d[k][i]; if (r < 0) return m[k][i]; }
    return m[k][4];
  },
  make(C) {
    const DIFF = {
      easy:   { l: 'Easy',   p: [.04, .16, .30, .30, .20],   m: [400, 200, 120, 40, 10] },
      medium: { l: 'Medium', p: [.02, .08, .20, .30, .40],   m: [1000, 400, 155, 50, 0] },
      hard:   { l: 'Hard',   p: [.01, .04, .15, .30, .50],   m: [3000, 800, 200, 20, 0] },
      expert: { l: 'Expert', p: [.005, .02, .08, .30, .595], m: [10000, 1200, 300, 0, 0] }
    };
    const RING = ['Bull', 'Inner ring', 'Middle ring', 'Outer ring', 'Edge'];
    const colOf = x => x === 0 ? ['#1a2a36', '#15222c'] : x < 100 ? ['#34506a', '#2b4459'] : x < 200 ? ['#3b82f6', '#3171d8'] :
      x < 500 ? ['#1fdc7c', '#17bf6a'] : x < 2000 ? ['#ffc93f', '#e9af1f'] : ['#ff4d68', '#e23a55'];
    let amt, diffSeg, go, legend, board, G, xEl, tEl, hist, res;
    let diff = 'medium', darts = [], fly = null, flash = null;
    const radii = d => { let c = 0; return DIFF[d].p.map(p => Math.sqrt(c += p)); };
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board da-board"><div class="cs-lhist"></div>' +
        '<div class="da-top"><div class="x cn num">Throw</div><div class="t">Every point is equally likely</div></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const df = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Difficulty</span><span class="aux num"></span></div>');
      diffSeg = C.seg(Object.keys(DIFF).map(d => [d, DIFF[d].l]), diff, v => { diff = v; darts = []; paintLegend(); G.dirty = true; });
      df.appendChild(diffSeg.el); ctl.appendChild(df);
      go = C.mk('button', 'cs-go', 'Throw'); go.onclick = throwDart; ctl.appendChild(go);
      legend = C.mk('div', 'ak-pay da-leg'); ctl.appendChild(legend);
      ctl.appendChild(C.mk('div', 'cs-note', 'Each ring is exactly as big as its chance of being hit. Every difficulty returns 98%.'));
      G = C.canvasIn(board);
      board.insertBefore(G.cv, board.firstChild);
      G.cv.addEventListener('click', throwDart);
      xEl = view.querySelector('.da-top .x'); tEl = view.querySelector('.da-top .t');
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      paintLegend();
    }
    function paintLegend() {
      const D = DIFF[diff];
      legend.innerHTML = D.m.map((m, i) => '<div style="--c:' + colOf(m)[0] + '"><span>' + RING[i] + '<small>' + (D.p[i] * 100).toFixed(D.p[i] < .01 ? 1 : 0) + '%</small></span><b class="num">' + C.mxs(m) + '</b></div>').join('');
      C.setText(diffSeg.el.parentNode.querySelector('.aux'), 'bull ' + C.mxs(D.m[0]));
    }
    function geom() {
      const W = G.W, H = G.H;
      const R = Math.max(60, Math.min(W * .42, (H - 40) * .44));
      return { W, H, R, cx: W / 2, cy: H / 2 + 14 };
    }
    function throwDart() {
      if (fly) land(fly);
      const b = C.takeBet(amt);
      if (!b) return;
      /* a point uniform over the disc: radius from the square root */
      const D = DIFF[diff], rr = radii(diff);
      const u = C.rnd(), a = C.rnd() * Math.PI * 2, r = Math.sqrt(u);
      let ring = rr.findIndex(q => r <= q); if (ring < 0) ring = 4;
      const mx = D.m[ring];
      fly = { bet: b, r, a, ring, mx, d: diff, t0: performance.now(), dur: 380, done: false, side: C.rnd() < .5 ? -1 : 1 };
      diffSeg.lock(true);
      C.sfx('csThrow');
      C.setText(tEl, 'In the air…');
    }
    function land(f) {
      if (!f || f.done) return;
      f.done = true;
      if (fly === f) fly = null;
      darts.push({ r: f.r, a: f.a, t: performance.now(), side: f.side });
      if (darts.length > 7) darts.shift();
      flash = { ring: f.ring, t: performance.now(), mx: f.mx, r: f.r, a: f.a };
      const pay = C.payOf(f.bet, f.mx);
      C.credit(pay);
      C.record('darts', f.bet, f.mx, pay);
      C.sfx('csThunk', f.ring === 0 ? 1.3 : 1);
      const win = pay > f.bet;
      C.setText(xEl, C.mxs(f.mx));
      xEl.className = 'x cn num pop ' + (win ? 'w' : f.mx >= 100 ? '' : 'l');
      C.setText(tEl, RING[f.ring] + (f.ring === 0 ? '!' : ''));
      C.pushPill(hist, C.mxs(f.mx), f.mx >= 100 ? C.mxCls(f.mx) : 'r', 6);
      [...legend.children].forEach((e, i) => e.classList.toggle('on', i === f.ring));
      if (win) C.sfx('csCash', f.mx / 100);
      if (f.ring === 0) { C.sfx('csShine', f.mx >= 3000 ? 5 : 4); res.show(true, f.mx, pay - f.bet, null, 'Bullseye'); AIK.burst(C, board, .5, .5); }
      diffSeg.lock(false);
      G.dirty = true;
    }
    function draw(now) {
      if (!G) return;
      if (fly && now - fly.t0 >= fly.dur) land(fly);
      const live = fly || (flash && now - flash.t < 1600) || darts.some(d => now - d.t < 400);
      if (!live && !G.dirty) return;
      G.dirty = false;
      const g = G.g, gm = geom(), { R, cx, cy } = gm;
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      g.clearRect(0, 0, gm.W, gm.H);
      const D = DIFF[diff], rr = radii(diff);
      /* the cabinet: a dark ring with the numbers, like a real board */
      g.save();
      g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 40; g.shadowOffsetY = 14;
      g.fillStyle = '#0b1319'; g.beginPath(); g.arc(cx, cy, R * 1.16, 0, Math.PI * 2); g.fill();
      g.restore();
      const rim = g.createRadialGradient(cx, cy, R, cx, cy, R * 1.16);
      rim.addColorStop(0, '#121c24'); rim.addColorStop(1, '#1d2b36');
      g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R * 1.16, 0, Math.PI * 2); g.fill();
      const NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
      g.fillStyle = 'rgba(234,242,248,.55)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 ' + Math.max(9, Math.round(R * .075)) + 'px ui-sans-serif,system-ui,sans-serif';
      NUMS.forEach((n, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 10;
        g.fillText(String(n), cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.08);
      });
      /* the rings, outside in, each split into twenty alternating wedges */
      for (let i = 4; i >= 0; i--) {
        const [c1, c2] = colOf(D.m[i]);
        const ro = rr[i] * R;
        for (let s = 0; s < 20; s++) {
          const a0 = -Math.PI / 2 - Math.PI / 20 + s * Math.PI / 10;
          g.fillStyle = s % 2 ? c2 : c1;
          g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, ro, a0, a0 + Math.PI / 10); g.closePath(); g.fill();
        }
      }
      /* the flash on the ring that was hit */
      if (flash && now - flash.t < 1600) {
        const k = (now - flash.t) / 1600;
        const ri = rr[flash.ring] * R, r0 = flash.ring ? rr[flash.ring - 1] * R : 0;
        g.save(); g.globalAlpha = .45 * (1 - k) * (1 - k);
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(cx, cy, ri, 0, Math.PI * 2); if (r0) g.arc(cx, cy, r0, 0, Math.PI * 2, true); g.fill('evenodd');
        g.restore();
      }
      /* the wire */
      g.strokeStyle = 'rgba(214,224,232,.55)'; g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx, cy, rr[i] * R, 0, Math.PI * 2); g.stroke(); }
      g.strokeStyle = 'rgba(214,224,232,.22)'; g.lineWidth = 1;
      g.beginPath();
      for (let s = 0; s < 20; s++) {
        const a = -Math.PI / 2 - Math.PI / 20 + s * Math.PI / 10;
        g.moveTo(cx + Math.cos(a) * rr[0] * R, cy + Math.sin(a) * rr[0] * R);
        g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      }
      g.stroke();
      /* what each ring pays, printed in it where there is room */
      g.font = 'italic 800 ' + Math.max(11, Math.round(R * .085)) + 'px "Barlow Condensed",ui-sans-serif,sans-serif';
      for (let i = 0; i < 5; i++) {
        const ro = rr[i] * R, ri = i ? rr[i - 1] * R : 0, mid = i ? (ro + ri) / 2 : 0;
        if (ro - ri < R * .09 && i) continue;
        const txt = (D.m[i] / 100) + '×';
        const x = cx, y = cy - mid;
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(txt, x + 1, y + 1.5);
        g.fillStyle = D.m[i] >= 500 && D.m[i] < 2000 ? '#3a2600' : '#fff';
        g.fillText(txt, x, y);
      }
      /* the darts already in the board */
      for (const d of darts) drawDart(g, cx + Math.cos(d.a) * d.r * R, cy + Math.sin(d.a) * d.r * R, 1, d.side, now - d.t, d === darts[darts.length - 1] ? 1 : .55);
      /* and the one in the air */
      if (fly) {
        const k = Math.min(1, (now - fly.t0) / fly.dur), e = 1 - Math.pow(1 - k, 2);
        const tx = cx + Math.cos(fly.a) * fly.r * R, ty = cy + Math.sin(fly.a) * fly.r * R;
        const sx = gm.W * (.5 + fly.side * .42), sy = gm.H + 90;
        const x = sx + (tx - sx) * e, y = sy + (ty - sy) * e - Math.sin(k * Math.PI) * 60;
        drawDart(g, x, y, 2.6 - 1.6 * e, fly.side, -1, 1);
      }
      /* the payout pops off the point it landed */
      if (flash && now - flash.t < 1300) {
        const k = (now - flash.t) / 1300;
        const x = cx + Math.cos(flash.a) * flash.r * R, y = cy + Math.sin(flash.a) * flash.r * R - 18 - easeOutC(k) * 34;
        g.globalAlpha = Math.min(1, (1 - k) * 2.5);
        g.font = 'italic 800 22px "Barlow Condensed",ui-sans-serif,sans-serif';
        g.lineWidth = 4; g.strokeStyle = 'rgba(6,14,20,.85)'; g.strokeText(C.mxs(flash.mx), x, y);
        g.fillStyle = flash.mx >= 100 ? '#1fdc7c' : '#ff8597'; g.fillText(C.mxs(flash.mx), x, y);
        g.globalAlpha = 1;
      }
    }
    const easeOutC = t => 1 - Math.pow(1 - t, 3);
    /* A dart seen from in front and a little below: the point in the board,
       the barrel coming back out toward you, the flights at the end. */
    function drawDart(g, x, y, s, side, age, alpha) {
      g.save();
      g.globalAlpha = alpha;
      g.translate(x, y);
      const quiver = age >= 0 && age < 380 ? Math.sin(age / 18) * .09 * (1 - age / 380) : 0;
      g.rotate((side < 0 ? -.55 : .55) + quiver);
      g.scale(s, s);
      /* shadow on the board */
      if (age >= 0) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(4, 26, 4, 22, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#c9d6e0'; g.fillRect(-1, -2, 2, 10);                    // the point
      const bar = g.createLinearGradient(-4, 0, 4, 0);
      bar.addColorStop(0, '#5a6b78'); bar.addColorStop(.5, '#e6edf2'); bar.addColorStop(1, '#4a5a66');
      g.fillStyle = bar; C.rrect(g, -3.2, 8, 6.4, 20, 3); g.fill();          // the barrel
      g.fillStyle = '#2b3947'; g.fillRect(-3.2, 13, 6.4, 1.6); g.fillRect(-3.2, 18, 6.4, 1.6);
      g.fillStyle = '#1b2530'; g.fillRect(-1.3, 28, 2.6, 12);                // the shaft
      g.fillStyle = '#ffc93f';                                               // the flights
      g.beginPath(); g.moveTo(0, 34); g.lineTo(-9, 50); g.lineTo(-2, 47); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, 34); g.lineTo(9, 50); g.lineTo(2, 47); g.closePath(); g.fill();
      g.fillStyle = '#e9a912'; g.beginPath(); g.moveTo(0, 34); g.lineTo(-1.6, 50); g.lineTo(1.6, 50); g.closePath(); g.fill();
      g.restore();
    }
    function tick() { if (fly && performance.now() - fly.t0 > fly.dur + 80) land(fly); }
    function settle() { if (fly) land(fly); }
    return { build, draw, tick, settle, hotkey: throwDart, busy: () => !!fly,
      auto: { gap: 420, act(P) { if (!P.tried) { P.tried = true; throwDart(); } } } };
  }
});
