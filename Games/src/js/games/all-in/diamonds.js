/* ================================================== ALL IN: DIAMONDS ===
   Five gems fall into the tray, each one of seven kinds, and they pay like a
   poker hand: five of a kind 50×, four 5×, a full house 4×, three 3×, two
   pairs 2×, a pair 0.10×. Over the long run it returns 98.3% — every hand
   was counted, not guessed (7^5 = 16,807 of them). */
ALLIN_TABLES.push({
  id: 'diamonds', name: 'Diamonds',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 10l2.8-4h7.4l2.8 4-6.5 9z"/><path d="M3 10h13M9.5 19L7.3 10l2.2-4 2.2 4z"/><path d="M19 3.5v4M17 5.5h4M19.5 13v3M18 14.5h3"/></svg>',
  css: `
.di-board{background:radial-gradient(60% 50% at 50% 42%,rgba(160,125,255,.11),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.di-top{position:absolute;left:0;right:0;top:9%;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none}
.di-hand{font-size:clamp(30px,4.6vw,50px);line-height:1;color:#fff;transition:color .25s}
.di-hand.w{color:var(--gr);text-shadow:0 0 36px rgba(31,220,124,.4)}.di-hand.l{color:var(--mu)}
.di-hand.pop{animation:csPop .5s var(--sp)}
.di-sub{font-size:11.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
.di-tray{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);display:flex;gap:clamp(7px,1.3vw,14px);
  padding:clamp(10px,1.7vw,18px);border-radius:24px;background:linear-gradient(180deg,#0f1f2b,#0a1720);border:1px solid var(--ln2);
  box-shadow:inset 0 2px 16px rgba(0,0,0,.65),0 26px 50px -26px rgba(0,0,0,.9)}
.di-slot{--gc:#1fdc7c;position:relative;width:clamp(58px,10.4vw,106px);aspect-ratio:1;border-radius:17px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 50% 36%,#1d3446,#101f2b 72%);box-shadow:inset 0 3px 12px rgba(0,0,0,.65),inset 0 -1px 0 rgba(255,255,255,.05);
  transition:box-shadow .3s,transform .35s var(--sp)}
.di-slot svg{width:80%;height:80%;overflow:visible;transition:transform .35s var(--sp),filter .3s,opacity .3s}
.di-slot svg.drop{animation:diDrop .52s cubic-bezier(.3,1.45,.55,1) backwards}
@keyframes diDrop{from{transform:translateY(-190%) scale(.7) rotate(-14deg);opacity:0}45%{opacity:1}}
.di-slot svg.out{animation:diOut .18s ease-in forwards}
@keyframes diOut{to{transform:translateY(40%) scale(.6);opacity:0}}
.di-slot.hit{transform:translateY(-4px);box-shadow:inset 0 3px 12px rgba(0,0,0,.65),0 0 0 2px var(--gc),0 14px 30px -10px var(--gc)}
.di-slot.hit svg{transform:scale(1.1);filter:drop-shadow(0 0 14px var(--gc))}
.di-slot.dim svg{opacity:.32;filter:saturate(.3)}
.di-pay{position:absolute;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.di-pc{padding:9px 4px 8px;border-radius:12px;background:var(--pn2);border:1px solid var(--ln);text-align:center;
  transition:background .25s,border-color .25s,transform .3s var(--sp)}
.di-pc .dots{display:flex;justify-content:center;gap:3px;margin-bottom:6px}
.di-pc .dots i{width:8px;height:8px;border-radius:50%;background:#2b3f51}
.di-pc .dots i.a{background:#1fdc7c}.di-pc .dots i.b{background:#a07dff}
.di-pc b{display:block;font-size:14px;font-weight:800}
.di-pc span{display:block;font-size:9.5px;color:var(--mu);font-weight:750;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.di-pc.on{background:rgba(31,220,124,.16);border-color:var(--gr);transform:translateY(-4px)}
.di-pc.on b{color:var(--gr)}
@media (max-width:760px){.di-pay{grid-template-columns:repeat(3,minmax(0,1fr))}}
`,
  bot(C) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) c[C.rint(7)]++;
    const s = c.filter(Boolean).sort((a, b) => b - a).join('');
    return { 5: 5000, 41: 500, 32: 400, 311: 300, 221: 200, 2111: 10 }[s] || 0;
  },
  make(C) {
    /* seven kinds, each its own colour and its own cut, so no two can be told
       apart by colour alone */
    const KINDS = [
      { n: 'Emerald', c: ['#c8ffe2', '#1fdc7c', '#086b3a'], o: 'M21 7h22l14 14v22L43 57H21L7 43V21z', t: 'M25 17h14l8 8v14l-8 8H25l-8-8V25z',
        f: 'M21 7l4 10M43 7l-4 10M57 21l-10 4M57 43l-10-4M43 57l-4-10M21 57l4-10M7 43l10-4M7 21l10 4' },
      { n: 'Amethyst', c: ['#ece2ff', '#a07dff', '#4f2bb0'], o: 'M32 6a26 26 0 110 52 26 26 0 010-52z', t: 'M32 18l10 4 4 10-4 10-10 4-10-4-4-10 4-10z',
        f: 'M32 6v12M58 32H46M32 58V46M6 32h12M13.6 13.6l8.4 8.4M50.4 13.6L42 22M50.4 50.4L42 42M13.6 50.4L22 42' },
      { n: 'Citrine', c: ['#fff6c4', '#ffc93f', '#a87300'], o: 'M17 7h30a10 10 0 0110 10v30a10 10 0 01-10 10H17A10 10 0 017 47V17A10 10 0 0117 7z', t: 'M32 15l17 17-17 17-17-17z',
        f: 'M10 10l12 12M54 10L42 22M54 54L42 42M10 54l12-12M32 7v8M57 32h-8M32 57v-8M7 32h8' },
      { n: 'Ruby', c: ['#ffd0d8', '#ff4d68', '#961830'], o: 'M32 57L9.5 34.5A13 13 0 0132 16.3a13 13 0 0122.5 18.2z', t: 'M32 45L19 32a6.5 6.5 0 0113-9 6.5 6.5 0 0113 9z',
        f: 'M32 16.3V23M9.5 34.5L19 32M54.5 34.5L45 32M32 57V45M17 17l5 7M47 17l-5 7' },
      { n: 'Aquamarine', c: ['#d2fcff', '#2fd6e8', '#08707c'], o: 'M32 6l27 48H5z', t: 'M32 24l11 20H21z',
        f: 'M32 6v18M59 54L43 44M5 54l16-10M18.5 30L27 34M45.5 30L37 34M32 54V44' },
      { n: 'Topaz', c: ['#ffe2c8', '#ff8a3d', '#a0420a'], o: 'M32 5l23 22-23 32L9 27z', t: 'M32 14l12 13-12 19-12-19z',
        f: 'M9 27h46M32 5v9M20.5 16L26 21M43.5 16L38 21M32 59V46' },
      { n: 'Sapphire', c: ['#d8e8ff', '#3b82f6', '#173f96'], o: 'M32 5c10 12 22 22 22 35a22 22 0 01-44 0C10 27 22 17 32 5z', t: 'M32 22c5 6 10 11 10 18a10 10 0 01-20 0c0-7 5-12 10-18z',
        f: 'M32 5v17M54 40H42M10 40h12M32 62V50M16 55l9-8M48 55l-9-8' }
    ];
    const HANDS = [
      { k: '5', n: 'Five of a kind', x: 5000, d: 'aaaaa' }, { k: '41', n: 'Four of a kind', x: 500, d: 'aaaa-' },
      { k: '32', n: 'Full house', x: 400, d: 'aaabb' }, { k: '311', n: 'Three of a kind', x: 300, d: 'aaa--' },
      { k: '221', n: 'Two pair', x: 200, d: 'aabb-' }, { k: '2111', n: 'Pair', x: 10, d: 'aa---' }
    ];
    const gemSvg = i => {
      const g = KINDS[i];
      return '<svg viewBox="0 0 64 64"><path d="' + g.o + '" fill="url(#diG' + i + ')"/>' +
        '<path d="' + g.t + '" fill="' + g.c[0] + '" fill-opacity=".38"/>' +
        '<path d="' + g.f + '" stroke="' + g.c[0] + '" stroke-opacity=".7" stroke-width="1.3" fill="none"/>' +
        '<path d="' + g.o + '" fill="none" stroke="' + g.c[2] + '" stroke-width="1.5"/>' +
        '<ellipse cx="24" cy="21" rx="6" ry="3.2" fill="#fff" fill-opacity=".6" transform="rotate(-35 24 21)"/></svg>';
    };
    const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + KINDS.map((g, i) =>
      '<linearGradient id="diG' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + g.c[0] + '"/><stop offset=".45" stop-color="' + g.c[1] + '"/>' +
      '<stop offset="1" stop-color="' + g.c[2] + '"/></linearGradient>').join('') + '</defs></svg>';
    let amt, go, board, slots, handEl, subEl, payEls, hist, res, anim = null;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board di-board">' + DEFS + '<div class="cs-lhist"></div>' +
        '<div class="di-top"><div class="di-hand cn">Five gems</div><div class="di-sub">Match them like a poker hand</div></div>' +
        '<div class="di-tray">' + '<div class="di-slot"></div>'.repeat(5) + '</div>' +
        '<div class="di-pay">' + HANDS.map(h => '<div class="di-pc"><div class="dots">' + [...h.d].map(ch => '<i class="' + (ch === '-' ? '' : ch) + '"></i>').join('') +
          '</div><b class="num">' + C.mxs(h.x) + '</b><span>' + h.n + '</span></div>').join('') + '</div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = bet; ctl.appendChild(go);
      const pay = C.mk('div', 'ak-pay', HANDS.map(h => '<div><span>' + h.n + '</span><b class="num">' + C.mxs(h.x) + '</b></div>').join('') +
        '<div><span>Nothing</span><b class="num">0.00×</b></div>');
      ctl.appendChild(pay);
      ctl.appendChild(C.mk('div', 'cs-note', 'Seven kinds of gem, five in the tray. Returns 98.3% over the long run.'));
      slots = [...view.querySelectorAll('.di-slot')];
      handEl = view.querySelector('.di-hand'); subEl = view.querySelector('.di-sub');
      payEls = [...view.querySelectorAll('.di-pc')].concat([...pay.children]);
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      /* the tray starts with a hand in it, so it never looks empty */
      const demo = [3, 0, 1, 5, 6];
      slots.forEach((s, i) => { s.innerHTML = gemSvg(demo[i]); });
    }
    function evaluate(gems) {
      const cnt = {};
      gems.forEach(g => { cnt[g] = (cnt[g] || 0) + 1; });
      const groups = Object.entries(cnt).map(([g, n]) => ({ g: +g, n })).sort((a, b) => b.n - a.n || a.g - b.g);
      const key = groups.map(x => x.n).join('');
      const hand = HANDS.find(h => h.k === key) || null;
      /* which gems light up: the biggest group, and a second pair or the
         pair of a full house */
      const lit = new Map();
      if (hand) {
        lit.set(groups[0].g, KINDS[groups[0].g].c[1]);
        if (key === '32' || key === '221') lit.set(groups[1].g, KINDS[groups[1].g].c[1]);
      }
      return { hand, mx: hand ? hand.x : 0, lit, idx: hand ? HANDS.indexOf(hand) : -1 };
    }
    function bet() {
      if (anim) finish(anim);
      const b = C.takeBet(amt);
      if (!b) return;
      const gems = Array.from({ length: 5 }, () => C.rint(7));
      const ev = evaluate(gems);
      anim = { bet: b, gems, ev, t0: performance.now(), landed: 0, done: false };
      res.hide();
      payEls.forEach(p => p.classList.remove('on'));
      slots.forEach((s, i) => {
        s.classList.remove('hit', 'dim');
        const old = s.querySelector('svg');
        if (old) old.classList.add('out');
        setTimeout(() => {
          if (!anim || anim.gems !== gems) return;
          s.innerHTML = gemSvg(gems[i]);
          const sv = s.querySelector('svg');
          sv.classList.add('drop');
        }, 150 + i * 85);
      });
      C.setText(handEl, '…'); handEl.className = 'di-hand cn';
      C.setText(subEl, 'Drawing');
    }
    function finish(a) {
      if (!a || a.done) return;
      a.done = true;
      if (anim === a) anim = null;
      /* if it was cut short, the gems go straight into the tray */
      slots.forEach((s, i) => {
        if (!s.querySelector('svg') || s.querySelector('svg.out')) s.innerHTML = gemSvg(a.gems[i]);
        const c = a.ev.lit.get(a.gems[i]);
        s.classList.toggle('hit', !!c);
        s.classList.toggle('dim', a.ev.mx > 0 && !c);
        if (c) s.style.setProperty('--gc', c);
      });
      const pay = C.payOf(a.bet, a.ev.mx);
      C.credit(pay);
      C.record('diamonds', a.bet, a.ev.mx, pay);
      const win = pay > a.bet;
      C.setText(handEl, a.ev.hand ? a.ev.hand.n : 'No match');
      handEl.className = 'di-hand cn pop ' + (a.ev.mx >= 100 ? 'w' : 'l');
      C.setText(subEl, a.ev.hand ? C.mxs(a.ev.mx) + ' · ' + (pay - a.bet >= 0 ? '+' : '−') + C.money(Math.abs(pay - a.bet)) : 'Better luck next time');
      if (a.ev.idx >= 0) { payEls[a.ev.idx].classList.add('on'); payEls[a.ev.idx + 6].classList.add('on'); }
      else payEls[12].classList.add('on');
      C.pushPill(hist, C.mxs(a.ev.mx), a.ev.mx >= 100 ? C.mxCls(a.ev.mx) : 'r', 6);
      if (win) {
        C.sfx('csShine', a.ev.mx >= 5000 ? 5 : a.ev.mx >= 400 ? 4 : a.ev.mx >= 300 ? 3 : 2);
        C.sfx('csCash', a.ev.mx / 100);
        if (a.ev.mx >= 400) { res.show(true, a.ev.mx, pay - a.bet, null, a.ev.hand.n); AIK.burst(C, board, .5, .45); }
      } else if (a.ev.mx > 0) C.sfx('csDraw');
      else C.sfx('csLose');
    }
    function draw(now) {
      if (!anim) return;
      const t = now - anim.t0;
      /* a clink as each gem lands */
      const landed = Math.min(5, Math.floor((t - 150 - 300) / 85) + 1);
      while (anim.landed < landed) { anim.landed++; C.sfx('csGem', anim.landed); }
      if (t >= 150 + 4 * 85 + 520) finish(anim);
    }
    function tick() { if (anim && performance.now() - anim.t0 > 1200) finish(anim); }
    function settle() { if (anim) finish(anim); }
    return { build, draw, tick, settle, hotkey: bet, busy: () => !!anim,
      auto: { gap: 450, act(P) { if (!P.tried) { P.tried = true; bet(); } } } };
  }
});
