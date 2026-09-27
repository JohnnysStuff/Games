/* ===================================================== ALL IN: MOLES ===
   Seven holes, and you say how many moles come up. Pick a hole: catch a
   mole and the payout climbs by the odds of it (seven holes over the moles
   that came up), less 2% once; pick an empty hole and the run is over. Cash
   out between picks. The multipliers are Stake's own table, 0.98 × (7/k)ⁿ,
   and so is the look: flat slate tubes on navy, round yellow moles that
   rise out of them. It is all one canvas, so a mole can sink into its hole
   (clipped by the hole's front edge) rather than just fade. */
ALLIN_TABLES.push({
  id: 'moles', name: 'Moles',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<ellipse cx="12" cy="19" rx="9" ry="3"/><path d="M7.5 18.5V9.5a4.5 4.5 0 019 0v9"/><circle cx="10.2" cy="10" r=".7" fill="currentColor"/>' +
        '<circle cx="13.8" cy="10" r=".7" fill="currentColor"/></svg>',
  css: `
.mo-board{background:#0f1f2b}
.mo-board canvas{cursor:default}
.mo-board.pick canvas{cursor:pointer}
.mo-pills{position:absolute;left:0;right:0;bottom:18px;display:flex;justify-content:center;gap:8px;pointer-events:none}
.mo-pill{display:flex;align-items:center;gap:9px;height:40px;padding:0 18px 0 14px;border-radius:20px;background:#1c2f3d;
  font-weight:800;font-size:16px;color:#fff;box-shadow:0 8px 20px -12px rgba(0,0,0,.8);transition:background .3s,color .3s,transform .3s var(--sp)}
.mo-pill svg{width:18px;height:18px;color:#b1c6d6}
.mo-pill.cur{background:rgba(31,220,124,.16);color:var(--gr)}
.mo-pill.cur svg{color:var(--gr)}
.mo-pill.off{display:none}
.mo-pill.bump{animation:csKd .45s var(--sp)}
`,
  bot(C) {
    const k = 1 + C.rint(6), n = 1 + C.rint(3);
    for (let i = 0; i < n; i++) if (C.rnd() >= k / 7) return 0;
    return Math.floor(98 * Math.pow(7 / k, n) + 1e-7);
  },
  make(C) {
    /* the honeycomb: two, three, two; the middle row is where the preview
       moles stand, the way the real board shows them */
    const HOLES = [[-1, -1], [1, -1], [-2, 0], [0, 0], [2, 0], [-1, 1], [1, 1]];
    const PREVIEW = [3, 2, 4, 0, 1, 5, 6];
    const MAXH = k => k === 1 ? 8 : 9;
    const mxOf = (k, n) => Math.floor(98 * Math.pow(7 / k, n) + 1e-7);
    /* flat colours, Stake-style: body, cheeks and belly, eyes */
    const SKIN = {
      gold:  { b: '#f7c43c', c: '#f08a2b', e: '#1d2b37' },
      green: { b: '#2fd872', c: '#13a650', e: '#123322' },
      grey:  { b: '#5f7485', c: '#46596a', e: '#1d2b37' }
    };
    let amt, molesSeg, kNext, kGain, go, rb, board, G, pNext, pCur, hist, res;
    let k = 3, st = null, anim = null, hover = -1, lastHit = -1;
    /* what each hole is showing: how far its mole is up (0..1), its skin,
       and the little reactions */
    const hole = HOLES.map(() => ({ up: 0, from: 0, to: 0, t0: 0, dur: 1, skin: 'gold', squash: -1e9, stars: -1e9, bob: -1e9, flash: -1e9, flashCol: '', ring: -1e9 }));
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board mo-board"><div class="cs-lhist"></div>' +
        '<div class="mo-pills"><div class="mo-pill cur off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="num"></span></div>' +
        '<div class="mo-pill nx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12h12M11 7l5 5-5 5M20 5v14"/></svg><span class="num"></span></div></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const mf = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Moles</span><span class="aux num"></span></div>');
      molesSeg = C.seg([1, 2, 3, 4, 5, 6].map(n => [String(n), String(n)]), String(k), v => { k = +v; preview(); refresh(); });
      mf.appendChild(molesSeg.el); ctl.appendChild(mf);
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
      rb = C.mk('button', 'cs-btn2 ak-manual', 'Random pick'); rb.onclick = () => pick(C.rint(7)); ctl.appendChild(rb);
      kNext = C.kv('Next hit pays'); kGain = C.kv('Total net gain', 'g');
      ctl.appendChild(kNext); ctl.appendChild(kGain);
      ctl.appendChild(C.mk('div', 'cs-note', 'Pick a hole. If a mole comes up in it, the payout climbs — fewer moles, bigger climb. An empty hole ends the run; cash out whenever you like.'));
      G = C.canvasIn(board);
      board.insertBefore(G.cv, board.firstChild);
      G.cv.addEventListener('pointermove', e => { const i = holeAt(e); if (i !== hover) hover = i; });
      G.cv.addEventListener('pointerleave', () => { hover = -1; });
      G.cv.addEventListener('click', e => { const i = holeAt(e); if (i >= 0) pick(i); });
      pNext = view.querySelector('.mo-pill.nx'); pCur = view.querySelector('.mo-pill.cur');
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      preview(true);
      refresh();
    }
    /* ------------------------------------------------------------ layout */
    function geom() {
      const W = G.W, H = G.H - 70;
      const R = Math.max(22, Math.min(W / 10.6, H / 7.4));
      const dx = R * 1.92, dy = R * 2.02;
      const cx = W / 2, cy = H / 2 + R * .55;
      return { R, pos: HOLES.map(([c, r]) => [cx + c * dx, cy + r * dy]) };
    }
    function holeAt(e) {
      const rc = G.cv.getBoundingClientRect(), x = (e.clientX - rc.left) * (G.W / rc.width), y = (e.clientY - rc.top) * (G.H / rc.height);
      const gm = geom();
      for (let i = 0; i < 7; i++) {
        const [hx, hy] = gm.pos[i];
        if (Math.hypot(x - hx, (y - hy) * 1.05) < gm.R * 1.02) return i;
        /* a mole standing in the hole is part of the target too */
        if (hole[i].up > .5 && Math.abs(x - hx) < gm.R * .64 && y < hy && y > hy - gm.R * 1.6) return i;
      }
      return -1;
    }
    /* ------------------------------------------------------------ moles */
    function rise(i, to, delay, dur, skin) {
      const h = hole[i], now = performance.now();
      h.from = h.up; h.to = to; h.t0 = now + (delay || 0); h.dur = dur || 240;
      if (skin) h.skin = skin;
    }
    function preview(instant) {
      if (st || anim) return;
      const set = new Set(PREVIEW.slice(0, k));
      hole.forEach((h, i) => {
        if (instant) { h.up = h.from = h.to = set.has(i) ? 1 : 0; h.skin = 'gold'; }
        else if (set.has(i) !== (h.to > .5)) rise(i, set.has(i) ? 1 : 0, set.has(i) ? 60 + Math.random() * 80 : 0, set.has(i) ? 260 : 170, 'gold');
        else if (set.has(i)) h.skin = 'gold';
      });
    }
    function allDown(skinAfter) { hole.forEach((h, i) => { if (h.to > 0) rise(i, 0, Math.random() * 60, 170); if (skinAfter) h.skin = skinAfter; }); }
    /* ------------------------------------------------------------ play */
    function start() {
      const bet = C.takeBet(amt);
      if (!bet) return false;
      st = { bet, k, n: 0, mx: 100 };
      res.hide();
      allDown();
      refresh();
      return true;
    }
    function press() {
      if (anim) return;
      if (!st) { start(); return; }
      if (st.n) cashOut();
    }
    function pick(i) {
      if (anim || i < 0) return;
      if (!st && !start()) return;
      /* where the moles come up is drawn as you pick */
      const up = new Set();
      while (up.size < st.k) up.add(C.rint(7));
      const got = up.has(i);
      anim = { i, up, got, t0: performance.now(), stage: 0 };
      const now = performance.now();
      hole[i].ring = now;
      hole.forEach((h, j) => {
        h.squash = h.stars = h.bob = h.flash = -1e9;
        if (up.has(j)) { h.up = 0; rise(j, 1, 40 + Math.random() * 90, 250, j === i ? 'green' : got ? 'grey' : 'gold'); }
        else if (h.to > 0) rise(j, 0, 0, 150);
      });
      C.sfx('csPeek');
      refresh();
    }
    function step(now) {
      const a = anim; if (!a) return;
      const t = now - a.t0;
      if (a.stage === 0 && t >= 330) { a.stage = 1; resolve(a); }
      if (a.stage === 1 && t >= (a.got ? 1000 : 700)) {
        a.stage = 2;
        anim = null;
        /* after a catch they duck back down for the next pick; after a miss
           they stay up, laughing, until the next round */
        if (a.got && st) hole.forEach((h, j) => { if (h.to > 0) rise(j, 0, j === a.i ? 60 : Math.random() * 60, 190); });
        refresh();
      }
    }
    function resolve(a) {
      const h = hole[a.i], now = performance.now();
      C.sfx('csWhack', a.got);
      if (!st) return;
      if (a.got) {
        h.squash = now; h.stars = now;
        st.n++; st.mx = mxOf(st.k, st.n);
        lastHit = a.i;
        pCur.classList.remove('bump'); void pCur.offsetWidth; pCur.classList.add('bump');
        C.sfx('csGem', st.n);
        C.pushPill(hist, 'Hit', 'g', 6);
        if (st.n >= MAXH(st.k)) cashOut();
      } else {
        h.flash = now; h.flashCol = '#ff4d68';
        a.up.forEach(j => { hole[j].bob = now + Math.random() * 120; });
        const s = st; st = null;
        C.shake(board);
        C.sfx('csLose');
        C.pushPill(hist, 'Miss', 'r', 6);
        C.record('moles', s.bet, 0, 0);
        res.show(false, 0, -s.bet, 'Missed');
      }
      refresh();
    }
    function cashOut(quiet) {
      const s = st; if (!s) return;
      st = null;
      const pay = C.payOf(s.bet, s.mx);
      C.credit(pay);
      C.record('moles', s.bet, s.mx, pay);
      if (!quiet) {
        C.sfx('csCash', s.mx / 100);
        res.show(true, s.mx, pay - s.bet);
        if (s.mx >= 1000) AIK.burst(C, board, .5, .4);
        setTimeout(() => preview(), 700);
      }
      refresh();
    }
    function refresh() {
      if (!go) return;
      const kk = st ? st.k : k, n = st ? st.n : 0, max = MAXH(kk);
      const next = n >= max ? 0 : mxOf(kk, n + 1);
      C.setText(kNext.v, next ? C.mxs(next) : '—');
      const bet = st ? st.bet : C.betAmt;
      C.setText(kGain.v, '+' + C.money(C.payOf(bet, st ? st.mx : 100) - bet));
      C.setText(molesSeg.el.parentNode.querySelector('.aux'), (kk / 7 * 100).toFixed(1) + '% a hit');
      C.setText(pNext.querySelector('span'), next ? C.mxs(next) : 'Max');
      C.setText(pCur.querySelector('span'), C.mxs(st ? st.mx : 100));
      pCur.classList.toggle('off', !(st && st.n));
      if (st && st.n) {
        go.className = 'cs-go cash'; go.disabled = !!anim;
        go.innerHTML = 'Cash out<small class="num">' + C.money(C.payOf(st.bet, st.mx)) + '</small>';
      } else if (st) { go.className = 'cs-go'; go.disabled = true; go.innerHTML = 'Pick a hole<small>or Random pick</small>'; }
      else { go.className = 'cs-go'; go.disabled = !!anim; go.textContent = 'Bet'; }
      rb.disabled = !!anim;
      molesSeg.lock(!!st || !!anim); amt.lock(!!st);
      board.classList.toggle('pick', !anim);
    }
    /* ------------------------------------------------------------ drawing */
    const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    function draw(now) {
      if (!G) return;
      step(now);
      const g = G.g, W = G.W, H = G.H, gm = geom(), R = gm.R;
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const order = [0, 1, 2, 3, 4, 5, 6];            // back row first, so the front row's moles overlap
      for (const i of order) {
        const h = hole[i], [x, y] = gm.pos[i];
        /* ease the mole toward where it is going */
        const k01 = Math.max(0, Math.min(1, (now - h.t0) / h.dur));
        if (now >= h.t0) h.up = h.from + (h.to - h.from) * (h.to > h.from ? backOut(k01) : k01 * k01);
        drawHole(g, x, y, R, i, now);
        if (h.up > .01) drawMole(g, x, y, R, h, now);
        drawFx(g, x, y, R, h, now);
      }
    }
    function drawHole(g, x, y, R, i, now) {
      const h = hole[i];
      const hot = i === hover && !anim;
      /* the tube: its side, its top face, the hole in it */
      g.fillStyle = '#1b2a36';
      g.beginPath(); g.arc(x, y + R * .15, R, 0, Math.PI * 2); g.fill();
      let top = hot ? '#3f566a' : '#33475a';
      if (anim && anim.i === i && now - h.ring < 340) top = '#2f6fb8';
      g.fillStyle = top;
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#16232e';
      g.beginPath(); g.arc(x, y + R * .03, R * .74, 0, Math.PI * 2); g.fill();
      g.save();
      g.beginPath(); g.arc(x, y + R * .03, R * .74, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#213241';
      g.beginPath(); g.arc(x, y + R * .15, R * .74, 0, Math.PI * 2); g.fill();
      g.restore();
      /* a picked hole that was empty flashes red */
      const fk = (now - h.flash) / 700;
      if (fk >= 0 && fk < 1) {
        g.save(); g.globalAlpha = (1 - fk) * .9;
        g.strokeStyle = h.flashCol; g.lineWidth = R * .12;
        g.beginPath(); g.arc(x, y, R * .87, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
    }
    function drawMole(g, x, y, R, h, now) {
      const w = R * 1.27, ht = R * 1.87;
      const yb = y + R * .42 + (1 - h.up) * (ht + R * .5);   // where its bottom is, sinking as it goes down
      /* clip: everything above the hole's middle, plus the hole itself —
         so a mole sinking out of sight goes behind the hole's front edge */
      g.save();
      g.beginPath();
      g.rect(x - R * 1.6, y - R * 4, R * 3.2, R * 4.03);
      g.arc(x, y + R * .03, R * .74, 0, Math.PI * 2);
      g.clip('nonzero');
      const S = SKIN[h.skin] || SKIN.gold;
      let sx = 1, sy = 1, dy = 0;
      const sq = (now - h.squash) / 380;
      if (sq >= 0 && sq < 1) { const e = Math.sin(sq * Math.PI) * (1 - sq); sx = 1 + .16 * e; sy = 1 - .2 * e; }
      const bb = (now - h.bob) / 1000;
      if (bb >= 0 && bb < 1.4) dy = -Math.abs(Math.sin(bb * Math.PI * 3)) * R * .1;
      g.translate(x, yb + dy); g.scale(sx, sy);
      const r = w / 2, top = -ht;
      g.fillStyle = S.b;
      g.beginPath(); g.moveTo(-r, top + r); g.arc(0, top + r, r, Math.PI, 0); g.lineTo(r, -r); g.arc(0, -r, r, 0, Math.PI); g.closePath(); g.fill();
      /* the shine on its head */
      g.fillStyle = 'rgba(255,255,255,.92)';
      g.beginPath(); g.ellipse(0, top + ht * .09, w * .17, ht * .047, 0, 0, Math.PI * 2); g.fill();
      const ouch = sq >= 0 && sq < 2.2;
      /* eyes: open, or squeezed shut when it has just been caught */
      g.fillStyle = S.e;
      if (ouch) {
        g.strokeStyle = S.e; g.lineWidth = w * .05; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-w * .23, top + ht * .225); g.lineTo(-w * .1, top + ht * .255); g.lineTo(-w * .23, top + ht * .285);
        g.moveTo(w * .23, top + ht * .225); g.lineTo(w * .1, top + ht * .255); g.lineTo(w * .23, top + ht * .285);
        g.stroke();
      } else {
        g.beginPath(); g.arc(-w * .157, top + ht * .246, w * .094, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(w * .157, top + ht * .246, w * .094, 0, Math.PI * 2); g.fill();
      }
      /* the mouth, under the cheeks, and its tooth */
      g.beginPath(); g.arc(0, top + ht * .43, w * .082, 0, Math.PI * 2); g.fill();
      g.fillStyle = S.c;
      g.beginPath(); g.arc(-w * .107, top + ht * .362, w * .115, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(w * .107, top + ht * .362, w * .115, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(-w * .032, top + ht * .405, w * .064, ht * .05);
      /* the belly */
      g.fillStyle = S.c;
      g.beginPath(); g.ellipse(0, top + ht * .805, w * .277, ht * .119, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    function drawFx(g, x, y, R, h, now) {
      /* the pick: a ring going out from the hole you chose */
      const rk = (now - h.ring) / 420;
      if (rk >= 0 && rk < 1) {
        g.save(); g.globalAlpha = (1 - rk) * .7;
        g.strokeStyle = '#fff'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x, y, R * (1 + rk * .5), R * (1 + rk * .5) * .98, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      /* stars round a caught mole's head */
      const sk = (now - h.stars) / 1100;
      if (sk >= 0 && sk < 1 && h.up > .5) {
        const top = y + R * .42 - R * 1.87;
        g.save(); g.globalAlpha = Math.min(1, (1 - sk) * 3);
        for (let s = 0; s < 3; s++) {
          const a = sk * Math.PI * 2.4 + s * Math.PI * 2 / 3;
          star(g, x + Math.cos(a) * R * .62, top - R * .12 + Math.sin(a) * R * .16, R * .13);
        }
        g.restore();
      }
    }
    function star(g, x, y, r) {
      g.fillStyle = '#ffc93f';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r;
        g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      }
      g.closePath(); g.fill();
    }
    /* off the screen the pick still resolves: the stages run on the clock */
    function tick() { if (anim && performance.now() - anim.t0 > 1100) step(performance.now()); }
    function settle() {
      if (anim) step(anim.t0 + 5000);
      if (!st) return;
      if (st.n) cashOut(true);
      else { C.refund(st.bet); st = null; refresh(); }
    }
    function hotkey() {
      if (anim) return;
      if (st && !st.n) pick(C.rint(7));
      else press();
    }
    return { build, draw, tick, settle, refresh, hotkey, busy: () => !!st || !!anim,
      /* autobet picks random holes until it has that many hits, then cashes out */
      auto: { gap: 700, steps: { label: 'Hits per round', max: () => MAXH(k), def: 2 }, act(P) {
        if (!st) { if (!P.tried) { P.tried = true; start(); } return; }
        if (anim) return;
        if (st.n >= Math.min(P.n, MAXH(st.k))) { cashOut(); return; }
        pick(C.rint(7));
      } } };
  }
});
