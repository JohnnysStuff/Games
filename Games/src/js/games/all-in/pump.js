/* ====================================================== ALL IN: PUMP ===
   Pump the balloon. Each stroke raises what it pays; any stroke can be the
   one that bursts it. It is Mines in disguise: 25 strokes, some of which
   are the pop, and every safe one pays the odds of having got there, less
   1%. The balloon, the pump and the burst are drawn on a canvas. */
ALLIN_TABLES.push({
  id: 'pump', name: 'Pump', tag: 'NEW',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 2.5c3.6 0 6.5 2.9 6.5 6.6 0 4.3-3.6 7.6-6.5 8.4-2.9-.8-6.5-4.1-6.5-8.4 0-3.7 2.9-6.6 6.5-6.6z"/>' +
        '<path d="M11 17.5l1-.2 1 .2-.4 1.3h-1.2zM12 19c-1 1.2 1 1.8 0 3"/></svg>',
  css: `
.pu-board{background:radial-gradient(55% 55% at 46% 42%,rgba(72,168,255,.08),transparent 70%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.pu-board canvas{cursor:pointer}
.pu-lad{position:absolute;left:8px;right:8px;bottom:10px}
.pu-btns{display:flex;flex-direction:column;gap:8px}
.pu-btns .cs-go.cash{display:none}
.pu-btns.on .cs-go.cash{display:block}
.pu-btns .cs-go.cash:disabled{animation:none}
`,
  bot(C) {
    const k = [1, 3, 5, 10][C.rint(4)], n = 1 + C.rint(k === 1 ? 10 : k === 3 ? 6 : 4);
    let x = .99;
    for (let i = 0; i < n; i++) { if (C.rnd() < k / (25 - i)) return 0; x *= (25 - i) / (25 - k - i); }
    return Math.floor(x * 100 + 1e-7);
  },
  make(C) {
    const DIFF = { easy: { k: 1, l: 'Easy', c: ['#9dffc9', '#1fdc7c', '#08743e'] }, medium: { k: 3, l: 'Medium', c: ['#bfe2ff', '#48a8ff', '#15528f'] },
                   hard: { k: 5, l: 'Hard', c: ['#ffd2b0', '#ff8a3d', '#a3430a'] }, expert: { k: 10, l: 'Expert', c: ['#ffc2cc', '#ff4d68', '#9c1c33'] } };
    const mxOf = (k, n) => { let x = .99; for (let i = 0; i < n; i++) x *= (25 - i) / (25 - k - i); return Math.floor(x * 100 + 1e-7); };
    let amt, diffSeg, kNext, kPop, go, cash, btns, board, G, lad, res, hist;
    let diff = 'medium', st = null;
    /* what the canvas is showing: the balloon's size eases toward where the
       strokes have taken it, and wobbles after each one */
    let r = 0, rv = 0, wob = 0, stroke = -1e9, popT = -1e9, popCol = null, parts = [], gone = false, shown = 100;

    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board pu-board"><div class="cs-lhist"></div><div class="pu-lad"></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const df = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Difficulty</span><span class="aux num"></span></div>');
      diffSeg = C.seg(Object.keys(DIFF).map(d => [d, DIFF[d].l]), diff, v => { diff = v; paintLadder(); refresh(); });
      df.appendChild(diffSeg.el); ctl.appendChild(df);
      kNext = C.kv('Next pump pays'); kPop = C.kv('Chance it pops');
      ctl.appendChild(kNext); ctl.appendChild(kPop);
      btns = C.mk('div', 'pu-btns');
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = press;
      cash = C.mk('button', 'cs-go cash', 'Cash out'); cash.onclick = () => { if (st && st.n) cashOut(); };
      btns.appendChild(go); btns.appendChild(cash); ctl.appendChild(btns);
      ctl.appendChild(C.mk('div', 'cs-note', 'Every pump raises the payout. Somewhere in the next twenty-five strokes is the one that bursts it — cash out before you find it.'));
      G = C.canvasIn(board);
      board.insertBefore(G.cv, board.firstChild);
      G.cv.addEventListener('click', () => { if (st) press(); });
      hist = view.querySelector('.cs-lhist');
      lad = AIK.ladder(C, view.querySelector('.pu-lad'));
      res = AIK.res(C, board);
      paintLadder();
      refresh();
    }
    function paintLadder() {
      const k = DIFF[st ? st.d : diff].k;
      lad.set(Array.from({ length: 25 - k }, (_, i) => ({ x: mxOf(k, i + 1), sub: 'pump ' + (i + 1) })));
      if (st) lad.to(st.n - 1);
    }
    function press() {
      if (!st) {
        const bet = C.takeBet(amt);
        if (!bet) return;
        const k = DIFF[diff].k;
        /* the pops are k of the 25 strokes, drawn now: the balloon was always
           going to burst on the first of them */
        const pos = new Set();
        while (pos.size < k) pos.add(C.rint(25));
        st = { bet, d: diff, k, pop: Math.min(...pos), n: 0, mx: 100 };
        res.hide();
        gone = false;                                  // a fresh balloon on the nozzle
        paintLadder();
        refresh();
        return;
      }
      pump();
    }
    function pump() {
      if (!st) return;
      const now = performance.now();
      if (now - stroke < 230) return;                 // one stroke at a time
      stroke = now;
      if (st.n === st.pop) { burst(); return; }
      st.n++;
      st.mx = mxOf(st.k, st.n);
      lad.to(st.n - 1);
      rv += 180; wob = 1;
      C.sfx('csPump', st.n);
      if (st.n >= 25 - st.k) cashOut();
      else refresh();
    }
    function burst() {
      const s = st; st = null;
      const now = performance.now();
      popT = now; gone = true;
      const col = DIFF[s.d].c;
      popCol = col;
      /* the rubber goes everywhere */
      const g = geom();
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, sp = 220 + Math.random() * 520;
        parts.push({ x: g.bx + Math.cos(a) * r * .6, y: g.by + Math.sin(a) * r * .6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
                     rot: Math.random() * 6, vr: (Math.random() - .5) * 18, s: 5 + Math.random() * 11, t: 0, life: .8 + Math.random() * .6,
                     c: col[Math.random() < .6 ? 1 : 2] });
      }
      lad.to(s.n - 1, true);
      C.shake(board);
      C.sfx('csPop');
      C.record('pump', s.bet, 0, 0);
      C.pushPill(hist, 'Pop ' + (s.n + 1), 'r', 6);
      res.show(false, 0, -s.bet, 'Popped');
      refresh();
    }
    function cashOut(quiet) {
      const s = st; if (!s) return;
      st = null;
      const pay = C.payOf(s.bet, s.mx);
      C.credit(pay);
      C.record('pump', s.bet, s.mx, pay);
      if (!quiet) {
        C.sfx('csCash', s.mx / 100);
        C.pushPill(hist, C.mxs(s.mx), C.mxCls(s.mx), 6);
        res.show(true, s.mx, pay - s.bet);
        if (s.mx >= 1000) AIK.burst(C, board, .5, .35);
      }
      refresh();                                     // and the air goes gently back out of it
    }
    function refresh() {
      if (!go) return;
      const k = st ? st.k : DIFF[diff].k, n = st ? st.n : 0;
      C.setText(kNext.v, n >= 25 - k ? '—' : C.mxs(mxOf(k, n + 1)));
      C.setText(kPop.v, (k / (25 - n) * 100).toFixed(1) + '%');
      C.setText(diffSeg.el.parentNode.querySelector('.aux'), 'up to ' + C.mxs(mxOf(k, 25 - k)));
      if (st) {
        go.className = 'cs-go'; go.innerHTML = 'Pump<small>Space</small>';
        cash.disabled = !st.n;
        cash.innerHTML = 'Cash out<small class="num">' + C.money(C.payOf(st.bet, st.mx)) + '</small>';
      } else { go.className = 'cs-go'; go.textContent = 'Bet'; }
      btns.classList.toggle('on', !!st);
      diffSeg.lock(!!st); amt.lock(!!st);
    }

    /* ------------------------------------------------------------ drawing */
    function geom() {
      const W = G.W, H = G.H;
      const floor = H - 84;
      const cx = W * .47;
      const nozY = floor - 58;
      const rMax = Math.max(40, Math.min(W * .29, (nozY - 24) / 2.2));
      const rMin = rMax * .44;
      return { W, H, floor, cx, nozY, rMax, rMin, bx: cx, by: nozY - 16 - r * 1.02 };
    }
    function draw(now, dt) {
      if (!G) return;
      const gm = geom();
      /* where the balloon should be: its size follows the strokes, eased so
         a big multiplier never gets too big for the board */
      const k = st ? st.k : DIFF[diff].k, n = st ? st.n : 0, max = 25 - k;
      const target = gone ? 0 : gm.rMin + (gm.rMax - gm.rMin) * Math.pow(n / max, .55);
      /* a spring, so each stroke overshoots a little and settles */
      const ks = 140, kd = 13;
      rv += ((target - r) * ks - rv * kd) * dt;
      r += rv * dt;
      if (gone) r = 0;
      wob = Math.max(0, wob - dt * 1.6);
      const want = st ? st.mx : 100;
      shown += (want - shown) * Math.min(1, dt * 12);
      if (Math.abs(want - shown) < .5) shown = want;

      const g = G.g, W = G.W, H = G.H;
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      /* the floor and its shadow */
      const fl = g.createLinearGradient(0, gm.floor, 0, H);
      fl.addColorStop(0, 'rgba(255,255,255,.035)'); fl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = fl; g.fillRect(0, gm.floor, W, H - gm.floor);
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, gm.floor + .5); g.lineTo(W, gm.floor + .5); g.stroke();

      const col = DIFF[st ? st.d : diff].c;
      const px = Math.min(W - 70, gm.cx + gm.rMax * 1.25 + 30);
      const sk = Math.max(0, Math.min(1, (now - stroke) / 380));
      const push = sk < .35 ? easeIn(sk / .35) : 1 - easeOutQ((sk - .35) / .65);
      drawHose(g, gm, px);
      drawPump(g, gm, px, push);
      drawNozzle(g, gm);
      if (!gone && r > 2) {
        const w = Math.sin(now / 55) * .07 * wob;
        const bob = st ? 0 : Math.sin(now / 900) * 3;
        drawBalloon(g, gm.cx, gm.nozY - 12 + bob, r, col, 1 + w, 1 - w, n / max);
      } else if (gone) drawShred(g, gm, popCol || col);
      /* the burst: a ring of air and the rubber flying */
      const pk = (now - popT) / 1000;
      if (pk >= 0 && pk < .5) {
        g.save(); g.globalAlpha = (1 - pk / .5) * .8;
        g.strokeStyle = '#fff'; g.lineWidth = 6 * (1 - pk / .5) + 1;
        g.beginPath(); g.arc(gm.cx, gm.nozY - 12 - gm.rMin * 1.4, 20 + pk * 520, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        if (p.t > p.life) { parts.splice(i, 1); continue; }
        p.vy += 900 * dt; p.vx *= Math.pow(.25, dt);
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = Math.max(0, Math.min(1, (p.life - p.t) * 3));
        g.fillStyle = p.c;
        g.beginPath(); g.moveTo(-p.s, -p.s * .3); g.quadraticCurveTo(0, -p.s * .9, p.s, -p.s * .2);
        g.quadraticCurveTo(p.s * .2, p.s * .5, -p.s, -p.s * .3); g.fill();
        g.restore();
      }
    }
    const easeIn = t => t * t;
    const easeOutQ = t => 1 - (1 - t) * (1 - t);
    function drawBalloon(g, x, knotY, R, col, sx, sy, tension) {
      g.save();
      g.translate(x, knotY); g.scale(sx, sy); g.translate(0, -R * 1.02);
      /* its shadow on the floor goes wider and fainter as it swells */
      const body = g.createRadialGradient(-R * .38, -R * .5, R * .06, -R * .1, -R * .12, R * 1.28);
      body.addColorStop(0, col[0]); body.addColorStop(.32, col[1]); body.addColorStop(1, col[2]);
      g.fillStyle = body;
      g.shadowColor = col[1]; g.shadowBlur = 24 + tension * 30;
      g.beginPath();
      g.moveTo(0, -R * 1.06);
      g.bezierCurveTo(R * 1.08, -R * 1.06, R * 1.1, R * .38, R * .16, R * .98);
      g.quadraticCurveTo(0, R * 1.06, -R * .16, R * .98);
      g.bezierCurveTo(-R * 1.1, R * .38, -R * 1.08, -R * 1.06, 0, -R * 1.06);
      g.fill();
      g.shadowBlur = 0;
      /* the knot */
      g.fillStyle = col[2];
      g.beginPath(); g.moveTo(-R * .1, R * 1.07); g.lineTo(R * .1, R * 1.07); g.lineTo(R * .06, R * 1.0); g.lineTo(-R * .06, R * 1.0); g.fill();
      g.beginPath(); g.ellipse(0, R * 1.1, R * .09, R * .045, 0, 0, Math.PI * 2); g.fill();
      /* the shine, tighter and brighter as the rubber stretches */
      const hl = g.createRadialGradient(-R * .42, -R * .55, 0, -R * .42, -R * .55, R * (.42 - tension * .12));
      hl.addColorStop(0, 'rgba(255,255,255,' + (.55 + tension * .3).toFixed(2) + ')'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hl;
      g.beginPath(); g.ellipse(-R * .42, -R * .55, R * .34, R * .24, -.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.beginPath(); g.ellipse(R * .5, R * .35, R * .07, R * .16, -.5, 0, Math.PI * 2); g.fill();
      /* the multiplier, printed on the rubber */
      const fs = Math.max(14, R * .46);
      g.font = 'italic 800 ' + fs.toFixed(0) + 'px "Barlow Condensed",ui-sans-serif,sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fillText(C.mxs(Math.round(shown)), 2, -R * .02 + 3);
      g.fillStyle = '#fff';
      g.fillText(C.mxs(Math.round(shown)), 0, -R * .02);
      g.restore();
    }
    function drawShred(g, gm, col) {
      /* what is left on the nozzle after a pop */
      g.save(); g.translate(gm.cx, gm.nozY - 12);
      g.fillStyle = col[2];
      g.beginPath(); g.moveTo(-7, 0); g.quadraticCurveTo(-14, -10, -6, -16); g.quadraticCurveTo(-2, -9, 2, -18);
      g.quadraticCurveTo(12, -12, 7, 0); g.closePath(); g.fill();
      g.restore();
    }
    function drawNozzle(g, gm) {
      const x = gm.cx, y = gm.nozY;
      const mg = g.createLinearGradient(x - 12, 0, x + 12, 0);
      mg.addColorStop(0, '#5e7384'); mg.addColorStop(.45, '#c9d6e0'); mg.addColorStop(1, '#4a5c6b');
      g.fillStyle = mg;
      C.rrect(g, x - 7, y - 14, 14, 18, 3); g.fill();
      C.rrect(g, x - 13, y + 2, 26, 9, 4); g.fill();
      /* the stand it sits on */
      g.fillStyle = '#1b2d3b';
      C.rrect(g, x - 26, y + 10, 52, gm.floor - y - 10, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.05)';
      g.fillRect(x - 26, y + 10, 52, 3);
    }
    function drawHose(g, gm, px) {
      g.save();
      g.lineCap = 'round';
      g.strokeStyle = '#0b141b'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(px - 22, gm.floor - 8);
      g.bezierCurveTo(px - 70, gm.floor + 10, gm.cx + 60, gm.floor - 6, gm.cx + 26, gm.nozY + 20);
      g.stroke();
      g.strokeStyle = '#2b3f51'; g.lineWidth = 6;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5;
      g.stroke();
      g.restore();
    }
    function drawPump(g, gm, px, push) {
      const baseY = gm.floor, bh = Math.min(150, (gm.floor - 40) * .5), bw = 30;
      const top = baseY - bh;
      /* the foot plate */
      g.fillStyle = '#16222c';
      C.rrect(g, px - 44, baseY - 10, 88, 12, 5); g.fill();
      /* the barrel */
      const bg = g.createLinearGradient(px - bw / 2, 0, px + bw / 2, 0);
      bg.addColorStop(0, '#9c1c33'); bg.addColorStop(.35, '#ff6b81'); bg.addColorStop(.6, '#ff4d68'); bg.addColorStop(1, '#8a1629');
      g.fillStyle = bg;
      C.rrect(g, px - bw / 2, top, bw, bh - 8, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(px - bw / 2 + 5, top + 8, 3, bh - 26);
      /* the gauge */
      g.fillStyle = '#e9eef3'; g.beginPath(); g.arc(px, baseY - bh * .38, 9, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1b2530'; g.lineWidth = 2;
      const k = st ? st.n / (25 - st.k) : 0;
      const a = -Math.PI * .8 + k * Math.PI * 1.6;
      g.beginPath(); g.moveTo(px, baseY - bh * .38); g.lineTo(px + Math.sin(a) * 6.5, baseY - bh * .38 - Math.cos(a) * 6.5); g.stroke();
      /* the rod and the T-handle, driven down by a stroke */
      const rod = bh * .42, down = push * rod * .8;
      const hy = top - rod + down;
      g.fillStyle = '#c9d6e0'; g.fillRect(px - 3, hy, 6, top - hy + 2);
      const hg = g.createLinearGradient(0, hy - 10, 0, hy + 4);
      hg.addColorStop(0, '#3a4e5f'); hg.addColorStop(1, '#1b2833');
      g.fillStyle = hg;
      C.rrect(g, px - 34, hy - 10, 68, 13, 6.5); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(px - 28, hy - 8, 56, 2);
      /* the collar */
      g.fillStyle = '#6a1020'; C.rrect(g, px - bw / 2 - 3, top - 4, bw + 6, 8, 3); g.fill();
    }
    function tick() {}
    function settle() {
      if (!st) return;
      if (st.n) cashOut(true);
      else { C.refund(st.bet); st = null; refresh(); }
    }
    return { build, draw, tick, settle, refresh, hotkey: press, busy: () => !!st,
      /* autobet pumps that many times, then cashes out */
      auto: { gap: 650, steps: { label: 'Pumps per round', max: () => 25 - DIFF[diff].k, def: 3 }, act(P) {
        if (!st) { if (!P.tried) { P.tried = true; press(); } return; }
        if (performance.now() - stroke < 320) return;
        if (st.n >= Math.min(P.n, 25 - st.k)) { cashOut(); return; }
        pump();
      } } };
  }
});
