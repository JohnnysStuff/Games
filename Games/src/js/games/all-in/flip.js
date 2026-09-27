/* ====================================================== ALL IN: FLIP ===
   Call the coin. Every call you get right doubles what the stake pays, less
   2%; cash out whenever you like, or keep going — up to twenty in a row.
   The coin is real CSS 3D: two faces and a milled edge built from thin
   discs, tossed on the render clock. */
ALLIN_TABLES.push({
  id: 'flip', name: 'Flip',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<ellipse cx="11" cy="12" rx="5.5" ry="9"/><path d="M11 3c4.4 0 8.5 4 8.5 9s-4.1 9-8.5 9"/><path d="M11 8.5v7"/></svg>',
  css: `
.fl-board{--cs:clamp(118px,25vh,184px);
  background:radial-gradient(60% 50% at 50% 34%,rgba(255,201,63,.09),transparent 70%),
             radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.fl-stage{position:absolute;left:0;right:0;top:0;height:60%}
.fl-coin{position:absolute;left:calc(50% - var(--cs) / 2);top:calc(54% - var(--cs) / 2);width:var(--cs);height:var(--cs);perspective:900px}
.fl-spin{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
.fl-face,.fl-edge{position:absolute;inset:0;border-radius:50%}
.fl-face{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.fl-face svg{width:100%;height:100%}
.fl-face.h{transform:translateZ(7px)}
.fl-face.t{transform:rotateX(180deg) translateZ(7px)}
.fl-edge{background:#8c6508}
.fl-edge.k{background:#6f4f06}
.fl-shadow{position:absolute;left:calc(50% - var(--cs) * .42);top:calc(54% + var(--cs) / 2 + 10px);width:calc(var(--cs) * .84);
  height:calc(var(--cs) * .16);border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),rgba(0,0,0,0));will-change:transform,opacity}
.fl-info{position:absolute;left:0;right:0;top:61%;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none}
.fl-x{font-size:clamp(40px,6.4vw,62px);line-height:1;color:#fff;transition:color .25s,text-shadow .3s}
.fl-x.w{color:var(--gr);text-shadow:0 0 40px rgba(31,220,124,.4)}
.fl-x.l{color:var(--rd);text-shadow:0 0 40px rgba(255,77,104,.3)}
.fl-x.pop{animation:csPop .5s var(--sp)}
.fl-l{font-size:11.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
.fl-seq{display:flex;gap:5px;min-height:18px;margin-top:6px;max-width:92%;overflow:hidden}
.fl-seq i{width:16px;height:16px;border-radius:50%;flex:none;animation:csKd .35s var(--sp);
  background:radial-gradient(circle at 35% 30%,#fff1b8,#ffc93f 55%,#b07a00);box-shadow:0 2px 6px -2px rgba(0,0,0,.6)}
.fl-seq i.t{background:radial-gradient(circle at 35% 30%,#d6ecff,#48a8ff 55%,#1f5fa0)}
.fl-seq i.x{box-shadow:0 0 0 2px var(--rd),0 0 10px var(--rd)}
.fl-lad{position:absolute;left:8px;right:8px;bottom:10px}
.fl-picks{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fl-pick{height:60px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:15px;
  background:var(--rs);border:1px solid var(--ln2);transition:background .15s,transform .15s var(--ez),border-color .2s,box-shadow .2s}
.fl-pick:hover{background:#244157;transform:translateY(-1px)}
.fl-pick:active{transform:scale(.97)}
.fl-pick:disabled{opacity:.45;cursor:default;transform:none}
.fl-pick.on{border-color:var(--gd);box-shadow:0 0 0 1px rgba(255,201,63,.35),0 8px 20px -12px rgba(255,201,63,.8)}
.fl-pick i{width:28px;height:28px;border-radius:50%;flex:none;box-shadow:0 3px 8px -2px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.25);
  background:radial-gradient(circle at 35% 30%,#fff1b8,#ffc93f 55%,#b07a00)}
.fl-pick.t i{background:radial-gradient(circle at 35% 30%,#d6ecff,#48a8ff 55%,#1f5fa0)}
@keyframes flLand{0%{transform:translateY(0)}30%{transform:translateY(5px) scaleY(.96)}60%{transform:translateY(-3px)}100%{transform:none}}
.fl-coin.land{animation:flLand .38s var(--ez)}
`,
  /* a house player calls a few in a row and takes it */
  bot(C) {
    const n = 1 + C.rint(4);
    for (let i = 0; i < n; i++) if (C.rnd() < .5) return 0;
    return Math.floor(98 * Math.pow(2, n) + 1e-7);
  },
  make(C) {
    const MAXF = 20;
    const mxOf = n => Math.floor(98 * Math.pow(2, n) + 1e-7);       // hundredths
    let amt, go, picks, bRnd, kNext, kProfit, board, coin, spin, shadow, xEl, lEl, seqEl, hist, lad, res;
    let st = null, anim = null, rot = 0, lastPick = 'h';

    /* the two faces: a gold crown, and a blue enamel star in a gold rim, so
       the rim and the edge are one metal whichever way up it lands */
    function star(cx, cy, R, r) {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R;
        d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2);
      }
      return d + 'Z';
    }
    const rim = id => '<radialGradient id="' + id + 'r" cx=".3" cy=".25" r="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#f2b624"/><stop offset="1" stop-color="#9c6c04"/></radialGradient>';
    const ticks = () => {
      let s = '';
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        s += 'M' + (50 + Math.cos(a) * 44).toFixed(2) + ' ' + (50 + Math.sin(a) * 44).toFixed(2) + 'L' + (50 + Math.cos(a) * 47.5).toFixed(2) + ' ' + (50 + Math.sin(a) * 47.5).toFixed(2);
      }
      return '<path d="' + s + '" stroke="#8a5f04" stroke-opacity=".55" stroke-width="1.3"/>';
    };
    const HEADS = '<svg viewBox="0 0 100 100"><defs>' + rim('flH') +
      '<radialGradient id="flHc" cx=".35" cy=".3" r=".95"><stop offset="0" stop-color="#fff6d0"/><stop offset=".5" stop-color="#ffcf4a"/><stop offset="1" stop-color="#c48a06"/></radialGradient></defs>' +
      '<circle cx="50" cy="50" r="49.5" fill="url(#flHr)"/>' + ticks() +
      '<circle cx="50" cy="50" r="40" fill="url(#flHc)" stroke="#a87708" stroke-width="1.6"/>' +
      '<circle cx="50" cy="50" r="35" fill="none" stroke="#fff3c4" stroke-opacity=".55" stroke-width="1.1" stroke-dasharray="1.6 3.2"/>' +
      '<g transform="translate(1.2 1.8)" fill="#9c6c04" fill-opacity=".55"><path d="M29 63L25 37l12 10 13-17 13 17 12-10-4 26z"/><rect x="29" y="65" width="42" height="7" rx="2"/></g>' +
      '<g fill="#fff3c4"><path d="M29 63L25 37l12 10 13-17 13 17 12-10-4 26z"/><rect x="29" y="65" width="42" height="7" rx="2"/></g>' +
      '<g fill="#e0a012"><circle cx="25" cy="36" r="3.2"/><circle cx="50" cy="29" r="3.6"/><circle cx="75" cy="36" r="3.2"/><circle cx="40" cy="56" r="2.6"/><circle cx="50" cy="56" r="2.6"/><circle cx="60" cy="56" r="2.6"/></g>' +
      '<path d="M22 28a33 33 0 0126-14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/></svg>';
    const TAILS = '<svg viewBox="0 0 100 100"><defs>' + rim('flT') +
      '<radialGradient id="flTc" cx=".35" cy=".3" r=".95"><stop offset="0" stop-color="#cfe8ff"/><stop offset=".5" stop-color="#3f9cf5"/><stop offset="1" stop-color="#174f8e"/></radialGradient></defs>' +
      '<circle cx="50" cy="50" r="49.5" fill="url(#flTr)"/>' + ticks() +
      '<circle cx="50" cy="50" r="40" fill="url(#flTc)" stroke="#a87708" stroke-width="1.6"/>' +
      '<circle cx="50" cy="50" r="35" fill="none" stroke="#d6ecff" stroke-opacity=".5" stroke-width="1.1" stroke-dasharray="1.6 3.2"/>' +
      '<path d="' + star(51.2, 52.4, 24, 10) + '" fill="#0d3a6e" fill-opacity=".55"/>' +
      '<path d="' + star(50, 50.5, 24, 10) + '" fill="#ffe38a" stroke="#fff6d0" stroke-width="1"/>' +
      '<path d="M22 28a33 33 0 0126-14" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/></svg>';
    function coinHTML() {
      let edge = '';
      for (let i = 0; i < 13; i++) edge += '<div class="fl-edge' + (i % 2 ? ' k' : '') + '" style="transform:translateZ(' + (-6 + i) + 'px)"></div>';
      return '<div class="fl-face t">' + TAILS + '</div>' + edge + '<div class="fl-face h">' + HEADS + '</div>';
    }

    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board fl-board"><div class="cs-lhist"></div>' +
        '<div class="fl-stage"><div class="fl-shadow"></div><div class="fl-coin"><div class="fl-spin">' + coinHTML() + '</div></div></div>' +
        '<div class="fl-info"><div class="fl-x cn num">1.00×</div><div class="fl-l">Heads or tails?</div><div class="fl-seq"></div></div>' +
        '<div class="fl-lad"></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const pf = C.mk('div', 'cs-fld ak-manual', '<div class="lab"><span class="cap">Call it</span><span class="aux">each right call ×1.96</span></div>');
      picks = C.mk('div', 'fl-picks',
        '<button class="fl-pick h" data-s="h"><i></i>Heads</button><button class="fl-pick t" data-s="t"><i></i>Tails</button>');
      pf.appendChild(picks); ctl.appendChild(pf);
      picks.onclick = e => { const b = e.target.closest('.fl-pick'); if (b && !b.disabled) flip(b.dataset.s); };
      bRnd = C.mk('button', 'cs-btn2 ak-manual', 'Random call'); bRnd.onclick = () => flip(C.rnd() < .5 ? 'h' : 't');
      ctl.appendChild(bRnd);
      kNext = C.kv('Next right call pays'); kProfit = C.kv('Profit on cash out', 'g');
      ctl.appendChild(kNext); ctl.appendChild(kProfit);
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
      ctl.appendChild(C.mk('div', 'cs-note', 'Pick heads or tails. Every right call doubles the payout, less 2% — cash out any time, up to twenty flips.'));
      coin = view.querySelector('.fl-coin'); spin = view.querySelector('.fl-spin'); shadow = view.querySelector('.fl-shadow');
      xEl = view.querySelector('.fl-x'); lEl = view.querySelector('.fl-l'); seqEl = view.querySelector('.fl-seq');
      hist = view.querySelector('.cs-lhist');
      lad = AIK.ladder(C, view.querySelector('.fl-lad'));
      lad.set(Array.from({ length: MAXF }, (_, i) => ({ x: mxOf(i + 1), sub: (i + 1) + (i ? ' flips' : ' flip') })));
      res = AIK.res(C, board);
      pose(0, 0);
      refresh();
    }
    function pose(y, lift) {
      spin.style.transform = 'translateY(' + y.toFixed(1) + 'px) rotateX(' + rot.toFixed(1) + 'deg) scale(' + (1 + lift * .14).toFixed(3) + ')';
      shadow.style.transform = 'scale(' + (1 - lift * .45).toFixed(3) + ')';
      shadow.style.opacity = (1 - lift * .6).toFixed(3);
    }
    function start() {
      const bet = C.takeBet(amt);
      if (!bet) return false;
      st = { bet, n: 0, mx: 100 };
      seqEl.innerHTML = '';
      lad.to(-1);
      res.hide();
      setX('1.00×', '', 'Heads or tails?');
      refresh();
      return true;
    }
    function press() {
      if (anim) return;
      if (!st) { start(); return; }
      if (st.n) cashOut();
    }
    function flip(side) {
      if (anim) return;
      if (!st && !start()) return;
      lastPick = side;
      const out = C.rnd() < .5 ? 'h' : 't';
      /* the coin turns a whole number of half turns and lands with the
         called-for face up: heads is 0° mod 360, tails 180° */
      const want = out === 'h' ? 0 : 180;
      const cur = ((rot % 360) + 360) % 360;
      let d = want - cur; if (d <= 0) d += 360;
      const turns = 3 + C.rint(2);
      anim = { side, out, win: out === side, from: rot, to: rot + d + turns * 360, t0: performance.now(), dur: 1050 };
      coin.classList.remove('land');
      setX(xEl.textContent, '', 'Flipping…');
      C.sfx('csFlip');
      refresh();
    }
    function land() {
      const a = anim; if (!a) return;
      anim = null;
      rot = a.to % 360; pose(0, 0);
      coin.classList.remove('land'); void coin.offsetWidth; coin.classList.add('land');
      C.sfx('csCoinLand');
      const dot = C.mk('i', a.out === 't' ? 't' : '');
      seqEl.appendChild(dot);
      while (seqEl.children.length > MAXF) seqEl.firstChild.remove();
      C.pushPill(hist, a.out === 'h' ? 'Heads' : 'Tails', a.win ? 'g' : 'r', 6);
      if (!st) return;
      if (a.win) {
        st.n++; st.mx = mxOf(st.n);
        lad.to(st.n - 1);
        setX(C.mxs(st.mx), 'w', a.out === 'h' ? 'Heads — right!' : 'Tails — right!');
        C.sfx('csGem', st.n);
        if (st.n >= MAXF) cashOut();
      } else {
        const s = st; st = null;
        dot.classList.add('x');
        lad.to(s.n - 1, true);
        setX('Bust', 'l', a.out === 'h' ? 'It came up heads' : 'It came up tails');
        C.shake(board);
        C.sfx('csLose');
        C.record('flip', s.bet, 0, 0);
        res.show(false, 0, -s.bet, 'Bust');
      }
      refresh();
    }
    function cashOut(quiet) {
      const s = st; if (!s) return;
      st = null;
      const pay = C.payOf(s.bet, s.mx);
      C.credit(pay);
      C.record('flip', s.bet, s.mx, pay);
      if (!quiet) {
        C.sfx('csCash', s.mx / 100);
        res.show(true, s.mx, pay - s.bet);
        if (s.mx >= 1000) AIK.burst(C, board, .5, .3);
        setX(C.mxs(s.mx), 'w', 'Cashed out');
      }
      refresh();
    }
    function setX(t, cls, label) {
      C.setText(xEl, t);
      xEl.className = 'fl-x cn num' + (cls ? ' ' + cls + ' pop' : '');
      C.setText(lEl, label);
    }
    function refresh() {
      if (!go) return;
      const n = st ? st.n : 0;
      C.setText(kNext.v, n >= MAXF ? '—' : C.mxs(mxOf(n + 1)));
      const bet = st ? st.bet : C.betAmt;
      C.setText(kProfit.v, '+' + C.money(C.payOf(bet, st ? st.mx : 100) - bet));
      if (st && st.n) {
        go.className = 'cs-go cash'; go.disabled = !!anim;
        go.innerHTML = 'Cash out<small class="num">' + C.money(C.payOf(st.bet, st.mx)) + '</small>';
      } else if (st) {
        go.className = 'cs-go'; go.disabled = true; go.innerHTML = 'Make your call<small>Heads or tails</small>';
      } else { go.className = 'cs-go'; go.disabled = !!anim; go.textContent = 'Bet'; }
      picks.querySelectorAll('.fl-pick').forEach(b => { b.disabled = !!anim; b.classList.toggle('on', !!st && b.dataset.s === lastPick); });
      bRnd.disabled = !!anim;
      amt.lock(!!st);
    }
    function draw(now) {
      if (!anim) {
        /* at rest the coin breathes a little, so the table looks alive */
        const b = Math.sin(now / 700) * 3;
        spin.style.transform = 'translateY(' + b.toFixed(1) + 'px) rotateX(' + rot.toFixed(1) + 'deg)';
        return;
      }
      const k = Math.min(1, (now - anim.t0) / anim.dur);
      const H = Math.min(130, board.clientHeight * .19);
      const arc = 4 * k * (1 - k);
      rot = anim.from + (anim.to - anim.from) * (1 - Math.pow(1 - k, 1.6));
      pose(-H * arc, arc);
      if (k >= 1) land();
    }
    function tick() { if (anim && performance.now() - anim.t0 > anim.dur + 60) land(); }
    function settle() {
      if (anim) land();
      if (!st) return;
      if (st.n) cashOut(true);
      else { C.refund(st.bet); st = null; refresh(); }
    }
    function hotkey() {
      if (anim) return;
      if (st && !st.n) flip(lastPick);
      else press();
    }
    return { build, draw, tick, settle, refresh, hotkey, busy: () => !!st || !!anim,
      /* autobet calls that many flips in a row, then cashes out */
      auto: { gap: 550, steps: { label: 'Flips per round', max: () => MAXF, def: 2 },
        opts: [{ id: 'call', label: 'Call', choices: [['r', 'Random'], ['h', 'Heads'], ['t', 'Tails']], def: 'r' }],
        act(P) {
          if (!st) { if (!P.tried) { P.tried = true; start(); } return; }
          if (anim) return;
          if (st.n >= P.n) { cashOut(); return; }
          flip(P.opts.call === 'r' ? (C.rnd() < .5 ? 'h' : 't') : P.opts.call);
        } } };
  }
});
