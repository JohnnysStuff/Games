/* ====================================================== ALL IN: BARS ===
   Thirty tiles, each hiding gold bars and a multiplier. Pick one to five of
   them and play: every tile turns over and you are paid what your picks
   show added up. The fewer you pick, the bigger each one's multiplier —
   every tile is worth its bar divided by how many you picked — so one pick
   is the long shot and five the steady one. Every tile averages 0.98×, so
   every choice returns 98%; the harder tables hide more empty tiles and
   bigger bars. Your picks stay where they are between rounds. */
ALLIN_TABLES.push({
  id: 'bars', name: 'Bars',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 20h18"/><path d="M4.5 16.5h7l1.5 3.5H3z"/><path d="M11 16.5h7l1.5 3.5h-10z"/><path d="M7.5 11h7l1.5 3.5H6z"/></svg>',
  css: `
.ba-board{background:radial-gradient(60% 55% at 50% 50%,rgba(255,201,63,.08),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.ba-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px}
.ba-top{display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;min-height:58px}
.ba-x{font-size:clamp(30px,4.4vw,44px);line-height:1;color:#fff}
.ba-x.w{color:var(--gr);text-shadow:0 0 36px rgba(31,220,124,.35)}.ba-x.l{color:var(--mu)}.ba-x.pop{animation:csPop .5s var(--sp)}
.ba-t2{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--mu)}
.ba-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(5px,.9vw,9px);width:min(100%,calc((100vh - 280px) * .86),520px)}
.ba-grid .cs-t{aspect-ratio:1.05}
.ba-grid .cs-t.pk .fr{background:linear-gradient(180deg,#5a4a17,#3f3410);box-shadow:inset 0 0 0 2px var(--gd),0 5px 0 #2a2208,0 8px 16px -6px rgba(0,0,0,.7)}
.ba-grid .cs-t .ck{display:none;width:38%;height:38%;color:var(--gd);filter:drop-shadow(0 0 8px rgba(255,201,63,.6))}
.ba-grid .cs-t.pk .ck{display:block}
.ba-grid .cs-t .bk{flex-direction:column;gap:2px}
.ba-grid .cs-t .bk svg{width:58%;height:52%}
.ba-grid .cs-t .bk b{font-size:clamp(10px,1.3vw,13px);font-weight:800;color:#dbe6ee}
.ba-grid .cs-t.z .bk b{color:#5d7487}
.ba-grid .cs-t.rev.pk .bk{box-shadow:inset 0 0 0 2px var(--gd),0 0 18px -4px rgba(255,201,63,.7);background:radial-gradient(circle at 50% 40%,rgba(255,201,63,.25),#0c1822 72%)}
.ba-grid .cs-t.rev:not(.pk) .bk{opacity:.72}
.ba-grid.busy .cs-t{pointer-events:none}
`,
  bot(C) {
    const D = [[[.3, 30], [.2, 60], [.22, 100], [.15, 150], [.09, 200], [.03, 300], [.01, 550]],
               [[.4, 0], [.2, 50], [.17, 100], [.13, 200], [.065, 300], [.025, 500], [.009, 1000], [.001, 4000]]][C.rint(2)];
    const k = 1 + C.rint(5);
    let s = 0;
    for (let i = 0; i < k; i++) s += AIK.pick(C, D);
    return Math.floor(s / k);
  },
  make(C) {
    /* what a tile's bar is worth for one pick, [chance, hundredths]; with k
       picks every tile shows a k-th of it */
    const DIFF = {
      easy:   { l: 'Easy',   t: [[.3, 30], [.2, 60], [.22, 100], [.15, 150], [.09, 200], [.03, 300], [.01, 550]] },
      medium: { l: 'Medium', t: [[.4, 0], [.2, 50], [.17, 100], [.13, 200], [.065, 300], [.025, 500], [.009, 1000], [.001, 4000]] },
      hard:   { l: 'Hard',   t: [[.64, 0], [.14, 50], [.11, 150], [.07, 300], [.028, 600], [.008, 1500], [.0035, 4300], [.0005, 20000]] },
      expert: { l: 'Expert', t: [[.84, 0], [.08, 100], [.045, 300], [.025, 730], [.0075, 2500], [.00245, 10000], [.00005, 300000]] }
    };
    const MAXP = 5;
    /* a stack of ingots: bronze, silver, then gold in piles of one to three */
    function barsSvg(raw) {
      if (!raw) return '<svg viewBox="0 0 48 40"></svg>';
      const [c1, c2, c3] = raw < 100 ? ['#f0b98a', '#c07a3c', '#8a5226'] : raw < 200 ? ['#f2f6f9', '#b9c6d1', '#7f909e'] : ['#ffe38a', '#ffc93f', '#c9920a'];
      const n = raw < 500 ? 1 : raw < 2000 ? 2 : 3;
      const one = (x, y) => '<path d="M' + (x - 13) + ' ' + y + 'h26l-5-7h-16z" fill="' + c1 + '"/><path d="M' + (x - 13) + ' ' + y + 'h26v7h-26z" fill="' + c2 + '"/>' +
        '<path d="M' + (x - 13) + ' ' + (y + 5) + 'h26v2h-26z" fill="' + c3 + '"/>';
      let s = '';
      if (n === 1) s = one(24, 24);
      else if (n === 2) s = one(15, 28) + one(33, 28);
      else s = one(15, 30) + one(33, 30) + one(24, 21);
      if (raw >= 2000) s += '<path d="M40 6l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5zM8 8l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#fff"/>';
      return '<svg viewBox="0 0 48 40">' + s + '</svg>';
    }
    let amt, diffSeg, go, rb, clr, kPicks, kTop, board, grid, tiles = [], xEl, tEl, hist, res;
    let diff = 'medium', picks = new Set(), anim = null;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board ba-board"><div class="cs-lhist"></div><div class="ba-wrap">' +
        '<div class="ba-top"><div class="ba-x cn num">Pick 1 – 5 bars</div><div class="ba-t2">then play to turn them all over</div></div>' +
        '<div class="ba-grid"></div></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      grid = view.querySelector('.ba-grid');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const df = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Difficulty</span><span class="aux num"></span></div>');
      diffSeg = C.seg(Object.keys(DIFF).map(d => [d, DIFF[d].l]), diff, v => { diff = v; refresh(); });
      df.appendChild(diffSeg.el); ctl.appendChild(df);
      const row = C.mk('div', 'cs-row2');
      rb = C.mk('button', 'cs-btn2', 'Random pick'); rb.onclick = randomPick;
      clr = C.mk('button', 'cs-btn2', 'Clear table'); clr.onclick = () => { if (anim) return; picks.clear(); paintPicks(); refresh(); C.sfx('blip'); };
      row.appendChild(rb); row.appendChild(clr); ctl.appendChild(row);
      kPicks = C.kv('Bars picked'); kTop = C.kv('Best one tile can pay', 'g');
      ctl.appendChild(kPicks); ctl.appendChild(kTop);
      go = C.mk('button', 'cs-go', 'Play'); go.onclick = play; ctl.appendChild(go);
      ctl.appendChild(C.mk('div', 'cs-note', 'Each tile you picked pays its bar divided by how many you picked. Every tile averages 0.98×, so every choice returns 98%.'));
      for (let i = 0; i < 30; i++) {
        const t = C.mk('button', 'cs-t', '<span class="f fr"><svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="f bk"></span>');
        t.setAttribute('aria-label', 'Bar ' + (i + 1));
        t.onclick = () => toggle(i);
        grid.appendChild(t); tiles.push(t);
      }
      xEl = view.querySelector('.ba-x'); tEl = view.querySelector('.ba-t2');
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      refresh();
    }
    function toggle(i) {
      if (anim) return;
      unreveal();
      if (picks.has(i)) picks.delete(i);
      else if (picks.size < MAXP) picks.add(i);
      else { C.sfx('nope'); return; }
      paintPicks(); refresh();
      C.sfx('blip');
    }
    function randomPick() {
      if (anim) return;
      unreveal();
      picks.clear();
      const n = 1 + C.rint(MAXP);
      while (picks.size < n) picks.add(C.rint(30));
      paintPicks(); refresh();
      C.sfx('csChip');
    }
    function paintPicks() { tiles.forEach((t, i) => t.classList.toggle('pk', picks.has(i))); }
    /* the last round's tiles go back face down when the table is touched */
    function unreveal() {
      tiles.forEach(t => {
        if (!t.classList.contains('rev')) return;
        t.classList.remove('rev', 'z');
        clearTimeout(t._clr);
        t._clr = setTimeout(() => { if (!t.classList.contains('rev')) t.querySelector('.bk').innerHTML = ''; }, 450);
      });
    }
    function refresh() {
      if (!go) return;
      const k = picks.size, T = DIFF[diff].t;
      C.setText(kPicks.v, k + ' / ' + MAXP);
      C.setText(kTop.v, k ? C.mxs(Math.floor(T[T.length - 1][1] / k)) : '—');
      C.setText(diffSeg.el.parentNode.querySelector('.aux'), 'top bar ' + C.mxs(T[T.length - 1][1]));
      go.disabled = !!anim || !k;
      go.innerHTML = k ? 'Play' : 'Play<small>Pick 1 – 5 bars first</small>';
      rb.disabled = clr.disabled = !!anim;
      diffSeg.lock(!!anim); amt.lock(!!anim);
      grid.classList.toggle('busy', !!anim);
    }
    function play() {
      if (anim) { finish(anim); return; }
      const k = picks.size;
      if (!k) { C.sfx('nope'); return; }
      const b = C.takeBet(amt);
      if (!b) return;
      const T = DIFF[diff].t;
      const raw = Array.from({ length: 30 }, () => AIK.pick(C, T));
      const pk = [...picks];
      const sum = pk.reduce((s, i) => s + raw[i], 0);
      const mx = Math.floor(sum / k + 1e-7);
      /* picks turn over first, one at a time; then the rest of the table */
      const order = pk.concat([...Array(30).keys()].filter(i => !picks.has(i)));
      anim = { bet: b, raw, k, mx, order, t0: performance.now(), shown: 0, run: 0, done: false };
      res.hide();
      unreveal();
      setX('0.00×', '', 'Turning your ' + (k > 1 ? k + ' bars' : 'bar') + ' over…');
      refresh();
    }
    function show(a, n) {
      const i = a.order[n], t = tiles[i], v = Math.floor(a.raw[i] / a.k + 1e-7);
      clearTimeout(t._clr);
      t.querySelector('.bk').innerHTML = barsSvg(a.raw[i]) + '<b class="num">' + (v / 100).toFixed(2) + '×</b>';
      t.classList.toggle('z', !a.raw[i]);
      t.classList.add('rev');
      if (picks.has(i)) {
        a.run += v;
        setX(C.mxs(a.run), '', 'Bar ' + (n + 1) + ' of ' + a.k);
        C.sfx(a.raw[i] ? (a.raw[i] >= 2000 ? 'csShine' : 'csGem') : 'csDraw', a.raw[i] >= 2000 ? 4 : n + 1);
      }
    }
    function finish(a) {
      if (!a || a.done) return;
      a.done = true;
      if (anim === a) anim = null;
      for (let n = a.shown; n < 30; n++) show(a, n);
      a.shown = 30;
      const pay = C.payOf(a.bet, a.mx);
      C.credit(pay);
      C.record('bars', a.bet, a.mx, pay);
      const win = pay > a.bet;
      setX(C.mxs(a.mx), win ? 'w' : 'l', (pay - a.bet >= 0 ? '+' : '−') + C.money(Math.abs(pay - a.bet)));
      xEl.classList.add('pop');
      C.pushPill(hist, C.mxs(a.mx), a.mx >= 100 ? C.mxCls(a.mx) : 'r', 6);
      if (win) C.sfx('csCash', a.mx / 100); else C.sfx('csLose');
      if (a.mx >= 1000) { res.show(true, a.mx, pay - a.bet, null, 'Gold!'); AIK.burst(C, board, .5, .45); }
      refresh();
    }
    function setX(t, cls, sub) {
      C.setText(xEl, t);
      xEl.className = 'ba-x cn num' + (cls ? ' ' + cls : '');
      C.setText(tEl, sub);
    }
    function draw(now) {
      const a = anim; if (!a) return;
      const t = now - a.t0;
      /* your picks at a walk, the rest of the table at a run */
      const at = n => n < a.k ? 120 + n * 260 : 120 + a.k * 260 + 120 + (n - a.k) * 28;
      while (a.shown < 30 && t >= at(a.shown)) { show(a, a.shown); a.shown++; }
      if (a.shown >= 30 && t >= at(29) + 350) finish(a);
    }
    function tick() { if (anim && performance.now() - anim.t0 > 3200) finish(anim); }
    function settle() { if (anim) finish(anim); }
    return { build, draw, tick, settle, refresh, hotkey: play, busy: () => !!anim,
      /* autobet plays the bars picked on the board, round after round */
      auto: { gap: 800, act(P) {
        if (P.tried) return;
        if (!picks.size) { P.why = 'pick 1 to 5 bars first'; return; }
        P.tried = true; play();
      } } };
  }
});
