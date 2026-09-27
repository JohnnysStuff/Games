/* ======================================== ALL IN: ROCK PAPER SCISSORS ===
   You against the house, best of one, again and again. Each win doubles the
   payout less 2%, a draw is thrown again for nothing, a loss ends the run.
   Cash out whenever you like, up to twenty wins. */
ALLIN_TABLES.push({
  id: 'rps', name: 'Rock Paper Scissors',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M8.3 8.2L20.5 18M8.3 15.8L20.5 6"/></svg>',
  css: `
.rp-board{background:radial-gradient(70% 60% at 50% 42%,rgba(160,125,255,.09),transparent 70%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.rp-arena{position:absolute;left:0;right:0;top:0;bottom:84px;display:flex;align-items:center;justify-content:center;gap:clamp(12px,3vw,40px);padding:16px}
.rp-side{display:flex;flex-direction:column;align-items:center;gap:10px}
.rp-who{font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--mu)}
.rp-card{position:relative;width:clamp(120px,19vw,176px);aspect-ratio:.8;border-radius:20px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;background:linear-gradient(180deg,#1d3446,#152838);border:1px solid var(--ln2);
  box-shadow:0 18px 40px -18px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.06);transition:border-color .3s,box-shadow .3s,transform .3s var(--ez)}
.rp-card svg{width:66%;height:auto;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45))}
.rp-card .nm{font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.rp-card .q{font-size:clamp(60px,9vw,96px);line-height:1;color:rgba(255,255,255,.14)}
.rp-card.shake{animation:rpShake .9s var(--ez)}
.rp-card.hs.shake{animation-delay:.03s}
@keyframes rpShake{0%,33.3%,66.6%,100%{transform:translateY(0) rotate(0)}16%{transform:translateY(-22px) rotate(-6deg)}
  49%{transform:translateY(-22px) rotate(-6deg)}82%{transform:translateY(-22px) rotate(-6deg)}}
.rp-card.hs.shake{animation-name:rpShakeR}
@keyframes rpShakeR{0%,33.3%,66.6%,100%{transform:translateY(0) rotate(0)}16%{transform:translateY(-22px) rotate(6deg)}
  49%{transform:translateY(-22px) rotate(6deg)}82%{transform:translateY(-22px) rotate(6deg)}}
.rp-card.show svg{animation:csGemIn .5s var(--sp)}
.rp-card.w{border-color:var(--gr);box-shadow:0 0 0 1px var(--gr),0 18px 50px -14px rgba(31,220,124,.7);transform:translateY(-6px) scale(1.03)}
.rp-card.l{border-color:var(--rd);box-shadow:0 0 0 1px rgba(255,77,104,.6),0 18px 40px -18px rgba(0,0,0,.9);transform:scale(.96);filter:saturate(.6)}
.rp-card.d{border-color:var(--mu2)}
.rp-vs{display:flex;flex-direction:column;align-items:center;gap:10px}
.rp-vs .b{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;
  background:linear-gradient(180deg,#b48cff,var(--vi));box-shadow:0 10px 26px -8px rgba(160,125,255,.8),inset 0 1px 0 rgba(255,255,255,.4)}
.rp-vs .x{font-size:clamp(30px,4.6vw,46px);line-height:1;color:#fff;min-width:2.6em;text-align:center;transition:color .25s}
.rp-vs .x.w{color:var(--gr)}.rp-vs .x.l{color:var(--rd)}
.rp-vs .t{font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--mu);min-height:14px;text-align:center}
.rp-lad{position:absolute;left:8px;right:8px;bottom:10px}
.rp-picks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rp-pick{height:78px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-weight:800;font-size:12.5px;
  background:var(--rs);border:1px solid var(--ln2);transition:background .15s,transform .15s var(--ez),border-color .2s,box-shadow .2s}
.rp-pick svg{width:36px;height:36px}
.rp-pick:hover{background:#244157;transform:translateY(-2px)}
.rp-pick:active{transform:scale(.96)}
.rp-pick:disabled{opacity:.45;cursor:default;transform:none}
.rp-pick.on{border-color:var(--vi);box-shadow:0 0 0 1px rgba(160,125,255,.4),0 8px 20px -12px rgba(160,125,255,.9)}
`,
  bot(C) {
    const n = 1 + C.rint(4);
    for (let i = 0; i < n; i++) if (C.rnd() < .5) return 0;
    return Math.floor(98 * Math.pow(2, n) + 1e-7);
  },
  make(C) {
    const MAXW = 20;
    const mxOf = n => Math.floor(98 * Math.pow(2, n) + 1e-7);
    const NAMES = ['Rock', 'Paper', 'Scissors'];
    /* three objects rather than three hands: they read at a glance and at
       any size */
    const GLYPH = [
      '<svg viewBox="0 0 100 100"><defs><linearGradient id="rpR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9d4de"/><stop offset=".55" stop-color="#8596a6"/><stop offset="1" stop-color="#4d5d6c"/></linearGradient></defs>' +
        '<path d="M18 64l6-26 18-16 22 2 16 16 4 22-10 16-26 6-22-6z" fill="url(#rpR)"/>' +
        '<path d="M24 38l18-16 6 20-24-4zM42 42l22-18 16 16-14 6zM48 42l18 4 4 26-22 8zM18 64l6-26 24 4-12 24z" fill="#fff" fill-opacity=".13"/>' +
        '<path d="M36 66l12-24 22 30-22 8zM70 72l14-10-4-22-14 6z" fill="#1b2530" fill-opacity=".2"/>' +
        '<path d="M42 22l6 20 18 4M24 38l24 4-12 24M48 42l-12 24 12 14 22-8" fill="none" stroke="#2b3947" stroke-opacity=".35" stroke-width="1.5"/></svg>',
      '<svg viewBox="0 0 100 100"><path d="M26 14h36l16 16v56H26z" fill="#f4f7fa"/><path d="M62 14v16h16z" fill="#c9d4de"/>' +
        '<path d="M26 14h36l16 16v56H26z" fill="none" stroke="#9fb0bf" stroke-width="1.5"/>' +
        '<g stroke="#9fc3e6" stroke-width="2.4" stroke-linecap="round"><path d="M34 42h34M34 51h34M34 60h34M34 69h22"/></g>' +
        '<path d="M34 30h18" stroke="#ff4d68" stroke-width="3" stroke-linecap="round"/></svg>',
      '<svg viewBox="0 0 100 100"><g transform="rotate(-8 50 50)"><path d="M47 50L84 16l4 4-35 36z" fill="#dfe6ec"/><path d="M47 50L84 16l2 2-37 34z" fill="#fff"/>' +
        '<path d="M53 50L16 16l-4 4 35 36z" fill="#b9c6d1"/><circle cx="50" cy="52" r="3.4" fill="#5d7487"/>' +
        '<g fill="none" stroke-width="7.5"><ellipse cx="30" cy="74" rx="11" ry="13" stroke="#ff4d68" transform="rotate(35 30 74)"/><ellipse cx="70" cy="74" rx="11" ry="13" stroke="#ff4d68" transform="rotate(-35 70 74)"/></g>' +
        '<path d="M46 57l-8 7M54 57l8 7" stroke="#d8324d" stroke-width="7" stroke-linecap="round"/></g></svg>'
    ];
    let amt, go, picks, bRnd, kNext, kProfit, board, you, house, xEl, tEl, hist, lad, res;
    let st = null, anim = null, last = 0;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board rp-board"><div class="cs-lhist"></div>' +
        '<div class="rp-arena"><div class="rp-side"><div class="rp-who">You</div><div class="rp-card ys"><span class="q cn">?</span></div></div>' +
        '<div class="rp-vs"><div class="x cn num">1.00×</div><div class="b cn">VS</div><div class="t">Rock, paper or scissors</div></div>' +
        '<div class="rp-side"><div class="rp-who">House</div><div class="rp-card hs"><span class="q cn">?</span></div></div></div>' +
        '<div class="rp-lad"></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const pf = C.mk('div', 'cs-fld ak-manual', '<div class="lab"><span class="cap">Throw</span><span class="aux">a draw is thrown again</span></div>');
      picks = C.mk('div', 'rp-picks', NAMES.map((n, i) => '<button class="rp-pick" data-i="' + i + '">' + GLYPH[i] + n + '</button>').join(''));
      pf.appendChild(picks); ctl.appendChild(pf);
      picks.onclick = e => { const b = e.target.closest('.rp-pick'); if (b && !b.disabled) play(+b.dataset.i); };
      bRnd = C.mk('button', 'cs-btn2 ak-manual', 'Random throw'); bRnd.onclick = () => play(C.rint(3)); ctl.appendChild(bRnd);
      kNext = C.kv('Next win pays'); kProfit = C.kv('Profit on cash out', 'g');
      ctl.appendChild(kNext); ctl.appendChild(kProfit);
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
      ctl.appendChild(C.mk('div', 'cs-note', 'Beat the house to double the payout, less 2%. Rock blunts scissors, scissors cut paper, paper wraps rock.'));
      you = view.querySelector('.rp-card.ys'); house = view.querySelector('.rp-card.hs');
      xEl = view.querySelector('.rp-vs .x'); tEl = view.querySelector('.rp-vs .t');
      hist = view.querySelector('.cs-lhist');
      lad = AIK.ladder(C, view.querySelector('.rp-lad'));
      lad.set(Array.from({ length: MAXW }, (_, i) => ({ x: mxOf(i + 1), sub: (i + 1) + (i ? ' wins' : ' win') })));
      res = AIK.res(C, board);
      refresh();
    }
    function start() {
      const bet = C.takeBet(amt);
      if (!bet) return false;
      st = { bet, n: 0, mx: 100 };
      lad.to(-1); res.hide();
      setX('1.00×', '', 'Your throw');
      face(you, -1); face(house, -1);
      refresh();
      return true;
    }
    function press() {
      if (anim) return;
      if (!st) { start(); return; }
      if (st.n) cashOut();
    }
    function play(i) {
      if (anim) return;
      if (!st && !start()) return;
      last = i;
      const h = C.rint(3);
      const out = h === i ? 'd' : (i - h + 3) % 3 === 1 ? 'w' : 'l';
      anim = { i, h, out, t0: performance.now(), beats: 0 };
      [you, house].forEach(c => { c.className = c.className.replace(/\b(w|l|d|show)\b/g, '').trim(); face(c, -1); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); });
      setX(xEl.textContent, '', 'Rock…');
      C.sfx('csTock');
      refresh();
    }
    function face(card, i) {
      card.innerHTML = i < 0 ? '<span class="q cn">?</span>' : GLYPH[i] + '<span class="nm">' + NAMES[i] + '</span>';
    }
    function reveal() {
      const a = anim; if (!a) return;
      anim = null;
      you.classList.remove('shake'); house.classList.remove('shake');
      face(you, a.i); face(house, a.h);
      you.classList.add('show'); house.classList.add('show');
      if (!st) { refresh(); return; }
      if (a.out === 'd') {
        you.classList.add('d'); house.classList.add('d');
        setX(xEl.textContent, '', 'Draw — throw again');
        C.sfx('csLose');
        C.pushPill(hist, 'Draw', '', 6);
      } else if (a.out === 'w') {
        you.classList.add('w'); house.classList.add('l');
        st.n++; st.mx = mxOf(st.n);
        lad.to(st.n - 1);
        setX(C.mxs(st.mx), 'w', NAMES[a.i] + ' beats ' + NAMES[a.h].toLowerCase());
        C.sfx('csGem', st.n);
        C.pushPill(hist, 'Win', 'g', 6);
        if (st.n >= MAXW) cashOut();
      } else {
        you.classList.add('l'); house.classList.add('w');
        const s = st; st = null;
        lad.to(s.n - 1, true);
        setX('Bust', 'l', NAMES[a.h] + ' beats ' + NAMES[a.i].toLowerCase());
        C.shake(board);
        C.sfx('csLose');
        C.pushPill(hist, 'Loss', 'r', 6);
        C.record('rps', s.bet, 0, 0);
      }
      refresh();
    }
    function cashOut(quiet) {
      const s = st; if (!s) return;
      st = null;
      const pay = C.payOf(s.bet, s.mx);
      C.credit(pay);
      C.record('rps', s.bet, s.mx, pay);
      if (!quiet) {
        C.sfx('csCash', s.mx / 100);
        res.show(true, s.mx, pay - s.bet);
        if (s.mx >= 1000) AIK.burst(C, board, .5, .4);
        setX(C.mxs(s.mx), 'w', 'Cashed out');
      }
      refresh();
    }
    function setX(t, cls, label) {
      C.setText(xEl, t);
      xEl.className = 'x cn num' + (cls ? ' ' + cls : '');
      C.setText(tEl, label);
    }
    function refresh() {
      if (!go) return;
      const n = st ? st.n : 0;
      C.setText(kNext.v, n >= MAXW ? '—' : C.mxs(mxOf(n + 1)));
      const bet = st ? st.bet : C.betAmt;
      C.setText(kProfit.v, '+' + C.money(C.payOf(bet, st ? st.mx : 100) - bet));
      if (st && st.n) {
        go.className = 'cs-go cash'; go.disabled = !!anim;
        go.innerHTML = 'Cash out<small class="num">' + C.money(C.payOf(st.bet, st.mx)) + '</small>';
      } else if (st) { go.className = 'cs-go'; go.disabled = true; go.innerHTML = 'Throw<small>Rock, paper or scissors</small>'; }
      else { go.className = 'cs-go'; go.disabled = !!anim; go.textContent = 'Bet'; }
      picks.querySelectorAll('.rp-pick').forEach(b => { b.disabled = !!anim; b.classList.toggle('on', !!st && +b.dataset.i === last); });
      bRnd.disabled = !!anim;
      amt.lock(!!st);
    }
    /* "rock… paper… scissors… shoot!" on the beat of the shake */
    function draw(now) {
      if (!anim) return;
      const t = now - anim.t0, beat = Math.floor(t / 300);
      if (beat > anim.beats && beat < 3) {
        anim.beats = beat;
        C.setText(tEl, beat === 1 ? 'Paper…' : 'Scissors…');
        C.sfx('csTock');
      }
      if (t >= 900) reveal();
    }
    function tick() { if (anim && performance.now() - anim.t0 > 960) reveal(); }
    function settle() {
      if (anim) reveal();
      if (!st) return;
      if (st.n) cashOut(true);
      else { C.refund(st.bet); st = null; refresh(); }
    }
    function hotkey() {
      if (anim) return;
      if (st && !st.n) play(last);
      else press();
    }
    return { build, draw, tick, settle, refresh, hotkey, busy: () => !!st || !!anim,
      /* autobet plays until it has that many wins (draws are thrown again), then cashes out */
      auto: { gap: 550, steps: { label: 'Wins per round', max: () => MAXW, def: 2 },
        opts: [{ id: 'hand', label: 'Throw', choices: [['r', 'Random'], ['0', 'Rock'], ['1', 'Paper'], ['2', 'Scissors']], def: 'r' }],
        act(P) {
          if (!st) { if (!P.tried) { P.tried = true; start(); } return; }
          if (anim) return;
          if (st.n >= P.n) { cashOut(); return; }
          play(P.opts.hand === 'r' ? C.rint(3) : +P.opts.hand);
        } } };
  }
});
