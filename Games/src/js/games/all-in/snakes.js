/* ==================================================== ALL IN: SNAKES ===
   A ring of twelve tiles round two dice. Roll, and the token walks the
   total: land on a multiplier and your payout is multiplied by it, land on
   a snake and it is gone. Cash out between rolls, up to five of them.
   The ring repeats every six tiles, and a roll of two dice lands on each
   of the six kinds of tile exactly one time in six whatever tile you start
   from — so every roll is worth 0.99× on average, from anywhere on the
   board. The harder boards have more snakes and bigger tiles. */
ALLIN_TABLES.push({
  id: 'snakes', name: 'Snakes',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 3l6.5 2q3 1.4 2.5 4.2l-3.4 5q-2.8 2.4-4 4.2h-3.2q-1.2-1.8-4-4.2L3 9.2Q2.5 6.4 5.5 5z"/>' +
        '<path d="M7.3 8.5q2-.3 3 2.1-2 .4-3-2.1zM16.7 8.5q-2-.3-3 2.1 2 .4 3-2.1z" fill="currentColor" stroke="none"/>' +
        '<path d="M12 18.4v2.3M12 20.7l-1.2 1.6M12 20.7l1.2 1.6" stroke-width="1.6"/></svg>',
  css: `
.sn-board{background:radial-gradient(60% 55% at 50% 50%,rgba(31,220,124,.08),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.sn-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px}
.sn-grid{position:relative;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:clamp(6px,1vw,10px);
  width:min(100%,calc(100vh - 230px),520px);aspect-ratio:1}
.sn-t{position:relative;border-radius:clamp(9px,1.2vw,14px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  background:linear-gradient(180deg,#2a4a62,#203a4e);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 5px 0 #152a38,0 8px 16px -6px rgba(0,0,0,.7);
  font-weight:800;color:#dbe6ee;font-size:clamp(14px,2vw,20px);transition:background .25s,box-shadow .25s,transform .3s var(--sp)}
.sn-t small{font-size:clamp(8px,1vw,10px);font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8ba3b6}
.sn-t svg{width:58%;height:auto}
.sn-t.snake{background:linear-gradient(180deg,#4a2230,#35182a);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 5px 0 #24101b,0 8px 16px -6px rgba(0,0,0,.7)}
.sn-t svg.sn-snake{width:62%;overflow:visible}
.sn-t.bite svg.sn-snake{animation:snLunge .45s var(--ez)}
@keyframes snLunge{30%{transform:translateY(-8%) scale(1.16)}100%{transform:none}}
.sn-t.start{background:linear-gradient(180deg,#244a6e,#1b3a58)}
.sn-t.start svg{width:36%}
.sn-t.hit{background:linear-gradient(180deg,#5cf3a5,var(--gr));color:#062313;box-shadow:0 0 22px -2px rgba(31,220,124,.8),0 5px 0 #0b8f4d;transform:translateY(-3px)}
.sn-t.hit small{color:rgba(6,35,19,.7)}
.sn-t.bite{background:linear-gradient(180deg,#ff7b8f,var(--rd));box-shadow:0 0 26px -2px rgba(255,77,104,.9),0 5px 0 #a8203a;animation:csShake .45s}
.sn-mid{grid-area:2/2/4/4;border-radius:16px;background:rgba(6,14,20,.55);box-shadow:inset 0 2px 14px rgba(0,0,0,.55);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer}
.sn-dice{display:flex;gap:12px}
.sn-die{width:clamp(38px,5.4vw,54px);aspect-ratio:1;border-radius:22%;background:linear-gradient(180deg,#ffffff,#dfe6ec);
  box-shadow:0 5px 0 #9fb1c1,0 10px 18px -6px rgba(0,0,0,.6);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:14%}
.sn-die i{border-radius:50%;margin:14%;background:transparent}
.sn-die i.on{background:#0f1f2b}
.sn-die.roll{animation:snRoll .5s linear}
@keyframes snRoll{0%{transform:rotate(0) translateY(0)}25%{transform:rotate(-18deg) translateY(-12px)}50%{transform:rotate(14deg) translateY(0)}
  75%{transform:rotate(-8deg) translateY(-6px)}100%{transform:none}}
.sn-x{font-size:clamp(26px,3.8vw,38px);line-height:1;color:#fff}
.sn-x.w{color:var(--gr)}.sn-x.l{color:var(--rd)}.sn-x.pop{animation:csPop .45s var(--sp)}
.sn-dots{display:flex;gap:6px}
.sn-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.14);transition:background .25s}
.sn-dots i.on{background:var(--gr);box-shadow:0 0 8px var(--gr)}
.sn-tok{position:absolute;left:0;top:0;width:12%;aspect-ratio:1;pointer-events:none;z-index:3;transition:none;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))}
.sn-tok svg{width:100%;height:100%}
.sn-tok.sink{transition:transform .5s var(--ez),opacity .5s;opacity:0}
`,
  bot(C) {
    const P = [[100, 120, 130, 0, 114, 130], [100, 220, 154, 0, 120, 0], [100, 300, 0, 194, 0, 0], [100, 0, 494, 0, 0, 0]][C.rint(4)];
    const n = 1 + C.rint(3);
    let pos = 0, x = 100;
    for (let i = 0; i < n; i++) {
      pos = (pos + 2 + C.rint(6) + C.rint(6)) % 12;
      const v = P[pos % 6];
      if (!v) return 0;
      x = Math.floor(x * v / 100);
    }
    return x;
  },
  make(C) {
    /* each board is six tiles repeated twice round the ring: what each pays
       in hundredths, 0 for a snake; the first is the start tile */
    const DIFF = {
      easy:   { l: 'Easy',   p: [100, 120, 130, 0, 114, 130] },
      medium: { l: 'Medium', p: [100, 220, 154, 0, 120, 0] },
      hard:   { l: 'Hard',   p: [100, 300, 0, 194, 0, 0] },
      expert: { l: 'Expert', p: [100, 0, 494, 0, 0, 0] },
      master: { l: 'Master', p: [594, 0, 0, 0, 0, 0] }
    };
    const MAXR = 5;
    /* the ring, clockwise from the top left corner, as grid rows/columns */
    const RC = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [3, 1], [2, 1]];
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    /* a viper's head, face on and flat: a wedge that narrows to the snout,
       two slanted eye slits, and the forked tongue hanging under it */
    const SNAKE = '<svg viewBox="0 0 50 50" class="sn-snake">' +
      '<path d="M25 5L39.5 9.2Q45.6 11.8 44.6 18.2L37.4 29.2Q31.6 34.4 28.8 38.6H21.2Q18.4 34.4 12.6 29.2L5.4 18.2Q4.4 11.8 10.5 9.2Z" fill="#ff7086"/>' +
      '<path d="M25 5L39.5 9.2Q45.6 11.8 44.6 18.2L37.4 29.2Q31.6 34.4 28.8 38.6H25Z" fill="#000" fill-opacity=".08"/>' +
      '<path d="M13.4 16.2Q18.4 15.6 21.2 21.6Q16 22.4 13.4 16.2Z" fill="#2a0c14"/><path d="M36.6 16.2Q31.6 15.6 28.8 21.6Q34 22.4 36.6 16.2Z" fill="#2a0c14"/>' +
      '<circle cx="23" cy="34.6" r="1" fill="#2a0c14"/><circle cx="27" cy="34.6" r="1" fill="#2a0c14"/>' +
      '<path d="M25 38.6V43.4M25 43.4L22.4 47M25 43.4L27.6 47" fill="none" stroke="#ff7086" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="#9fd0ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
    let amt, diffSeg, go, cash, kNext, kGain, board, grid, tiles = [], mid, dice = [], xEl, dotsEl, tok, hist, res;
    let diff = 'medium', st = null, anim = null, tokPos = 0;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board sn-board"><div class="cs-lhist"></div><div class="sn-wrap"><div class="sn-grid">' +
        RC.map(() => '<div class="sn-t"></div>').join('') +
        '<div class="sn-mid"><div class="sn-dice"><div class="sn-die"></div><div class="sn-die"></div></div><div class="sn-x cn num">1.00×</div><div class="sn-dots">' +
        '<i></i>'.repeat(MAXR) + '</div></div><div class="sn-tok">' + C.I.chip + '</div></div></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      grid = view.querySelector('.sn-grid');
      tiles = [...view.querySelectorAll('.sn-t')];
      tiles.forEach((t, i) => { t.style.gridRow = RC[i][0]; t.style.gridColumn = RC[i][1]; });
      mid = view.querySelector('.sn-mid'); dice = [...view.querySelectorAll('.sn-die')];
      xEl = view.querySelector('.sn-x'); dotsEl = view.querySelector('.sn-dots'); tok = view.querySelector('.sn-tok');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const df = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Difficulty</span><span class="aux num"></span></div>');
      diffSeg = C.seg(Object.keys(DIFF).map(d => [d, DIFF[d].l]), diff, v => { diff = v; paint(); refresh(); });
      df.appendChild(diffSeg.el); ctl.appendChild(df);
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
      cash = C.mk('button', 'cs-go cash', 'Cash out'); cash.onclick = () => { if (st && st.rolls && !anim) cashOut(); }; ctl.appendChild(cash);
      kNext = C.kv('Snakes on the board'); kGain = C.kv('Total net gain', 'g');
      ctl.appendChild(kNext); ctl.appendChild(kGain);
      ctl.appendChild(C.mk('div', 'cs-note', 'Roll two dice and walk the total round the ring. A multiplier multiplies your payout, a snake takes it. Every roll is worth 0.99× on average.'));
      mid.onclick = () => { if (st) press(); };
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      faces(3, 4);
      paint();
      new ResizeObserver(() => place(tokPos)).observe(grid);
      refresh();
    }
    function paint() {
      const P = (st ? DIFF[st.d] : DIFF[diff]).p;
      tiles.forEach((t, i) => {
        const v = P[i % 6];
        t.className = 'sn-t' + (i === 0 ? ' start' : v ? '' : ' snake');
        t.innerHTML = i === 0 ? FLAG + '<small>Start · ' + (v / 100) + '×</small>' : v ? '<span class="num">' + (v / 100).toFixed(2) + '×</span>' : SNAKE;
      });
      const snakes = P.filter(v => !v).length * 2;
      C.setText(kNext.v, snakes + ' of 12');
      C.setText(diffSeg.el.parentNode.querySelector('.aux'), 'best tile ' + C.mxs(Math.max(...P)));
    }
    function faces(a, b) {
      [a, b].forEach((n, i) => { dice[i].innerHTML = [...Array(9).keys()].map(k => '<i class="' + (PIPS[n].includes(k) ? 'on' : '') + '"></i>').join(''); });
    }
    /* the token sits on a tile's centre, in the grid's own layout sizes */
    function place(i, lift) {
      const t = tiles[i]; if (!t) return;
      const w = tok.offsetWidth || grid.offsetWidth * .12;
      const x = t.offsetLeft + t.offsetWidth / 2 - w / 2, y = t.offsetTop + t.offsetHeight / 2 - w / 2 - (lift || 0);
      tok.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' + (lift ? ' scale(' + (1 + lift / 120).toFixed(3) + ')' : '');
    }
    function press() {
      if (anim) return;
      if (!st) {
        const b = C.takeBet(amt);
        if (!b) return;
        st = { bet: b, d: diff, pos: 0, mx: 100, rolls: 0 };
        res.hide();
        tok.classList.remove('sink'); tokPos = 0; place(0);
        paint();
        setX('1.00×', '');
        [...dotsEl.children].forEach(d => d.classList.remove('on'));
        refresh();
        return;
      }
      roll();
    }
    function roll() {
      if (!st || anim || st.rolls >= MAXR) return;
      const a = 1 + C.rint(6), b = 1 + C.rint(6);
      anim = { a, b, s: a + b, from: st.pos, t0: performance.now(), stage: 0, hops: 0 };
      tiles.forEach(t => t.classList.remove('hit', 'bite'));
      dice.forEach(d => { d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll'); });
      C.sfx('csRoll');
      refresh();
    }
    const HOP = 120;
    function step(now) {
      const a = anim; if (!a) return;
      const t = now - a.t0;
      if (a.stage === 0) {
        if (t < 480) { if (Math.floor(t / 70) !== a.face) { a.face = Math.floor(t / 70); faces(1 + C.rint(6), 1 + C.rint(6)); } return; }
        a.stage = 1; faces(a.a, a.b); a.t1 = now;
      }
      if (a.stage === 1) {
        const k = (now - a.t1) / HOP;
        const n = Math.min(a.s, Math.floor(k));
        while (a.hops < n) { a.hops++; C.sfx('csTock'); }
        const i = (a.from + Math.min(a.s, Math.floor(k))) % 12;
        const lift = a.hops < a.s ? Math.sin((k % 1) * Math.PI) * 14 : 0;
        tokPos = i; place(i, lift);
        if (k >= a.s) { a.stage = 2; land(a); }
      }
    }
    function land(a) {
      anim = null;
      if (!st) return;
      st.pos = (a.from + a.s) % 12;
      tokPos = st.pos; place(st.pos);
      st.rolls++;
      dotsEl.children[st.rolls - 1].classList.add('on');
      const v = DIFF[st.d].p[st.pos % 6];
      const t = tiles[st.pos];
      if (!v) {
        t.classList.add('bite');
        tok.classList.add('sink');
        const s = st; st = null;
        setX('Bitten', 'l');
        C.shake(board);
        C.sfx('csHiss');
        C.pushPill(hist, 'Snake', 'r', 6);
        C.record('snakes', s.bet, 0, 0);
        res.show(false, 0, -s.bet, 'Bitten');
      } else {
        t.classList.add('hit');
        st.mx = Math.floor(st.mx * v / 100 + 1e-7);
        setX(C.mxs(st.mx), 'w');
        C.sfx('csGem', st.rolls);
        C.pushPill(hist, (v / 100) + '×', v >= 100 ? 'g' : '', 6);
        if (st.rolls >= MAXR) cashOut();
      }
      refresh();
    }
    function cashOut(quiet) {
      const s = st; if (!s) return;
      st = null;
      const pay = C.payOf(s.bet, s.mx);
      C.credit(pay);
      C.record('snakes', s.bet, s.mx, pay);
      if (!quiet) {
        C.sfx(pay > s.bet ? 'csCash' : 'csLose', s.mx / 100);
        res.show(pay >= s.bet, s.mx, pay - s.bet);
        if (s.mx >= 1000) AIK.burst(C, board, .5, .45);
      }
      refresh();
    }
    function setX(t, cls) {
      C.setText(xEl, t);
      xEl.className = 'sn-x cn num' + (cls ? ' ' + cls + ' pop' : '');
    }
    function refresh() {
      if (!go) return;
      const bet = st ? st.bet : C.betAmt;
      C.setText(kGain.v, (st && st.mx < 100 ? '−' : '+') + C.money(Math.abs(C.payOf(bet, st ? st.mx : 100) - bet)));
      if (st) {
        go.className = 'cs-go'; go.disabled = !!anim;
        go.innerHTML = 'Roll<small>' + (MAXR - st.rolls) + ' of ' + MAXR + ' rolls left · Space</small>';
        cash.style.display = ''; cash.disabled = !!anim || !st.rolls;
        cash.innerHTML = 'Cash out<small class="num">' + C.money(C.payOf(st.bet, st.mx)) + '</small>';
      } else {
        go.className = 'cs-go'; go.disabled = false; go.textContent = 'Bet';
        cash.style.display = 'none';
      }
      diffSeg.lock(!!st); amt.lock(!!st);
    }
    function draw(now) { step(now); }
    function tick() { if (anim && performance.now() - anim.t0 > 480 + HOP * 13 + 200) { anim.stage = anim.stage || 1; anim.t1 = anim.t1 || anim.t0 + 480; faces(anim.a, anim.b); land(anim); } }
    function settle() {
      if (anim) { faces(anim.a, anim.b); land(anim); }
      if (!st) return;
      if (st.rolls) cashOut(true);
      else { C.refund(st.bet); st = null; refresh(); }
    }
    return { build, draw, tick, settle, refresh, hotkey: press, busy: () => !!st || !!anim,
      /* autobet rolls that many times, then cashes out */
      auto: { gap: 700, steps: { label: 'Rolls per round', max: () => MAXR, def: 2 }, act(P) {
        if (!st) { if (!P.tried) { P.tried = true; press(); } return; }
        if (anim) return;
        if (st.rolls >= P.n) { cashOut(); return; }
        roll();
      } } };
  }
});
