/* =============================================== ALL IN: VIDEO POKER ===
   Jacks or Better, dealt from a real 52-card deck. Deal five, hold the ones
   you want (click them), draw the rest, and the hand pays off the table:
   a royal flush 800×, a straight flush 60×, four of a kind 22×, a full
   house 9×, a flush 6×, a straight 4×, three of a kind 3×, two pair 2×, a
   pair of jacks or better your stake back. Played well it returns about
   99%; the table lights up whatever you are already holding. */
ALLIN_TABLES.push({
  id: 'poker', name: 'Video Poker',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><path d="M12 7.2c-1.9 2.3-3.7 3.4-3.7 5.2a1.9 1.9 0 003.3 1.3L11 16.6h2l-.6-2.9a1.9 1.9 0 003.3-1.3c0-1.8-1.8-2.9-3.7-5.2z" fill="currentColor" stroke="none"/></svg>',
  css: `
.vp-board{background:radial-gradient(90% 70% at 50% 60%,rgba(72,168,255,.10),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%);display:flex;flex-direction:column;padding:14px;gap:12px}
.vp-pay{flex:none;display:grid;grid-template-columns:1fr auto auto;gap:2px 0;padding:8px;border-radius:14px;background:rgba(6,14,20,.55);
  box-shadow:inset 0 0 0 1px var(--ln2)}
.vp-pay div{display:contents}
.vp-pay span{height:clamp(20px,3vh,26px);display:flex;align-items:center;padding:0 12px;font-size:clamp(11px,1.3vw,13px);font-weight:800;color:#b1c6d6;
  text-transform:uppercase;letter-spacing:.06em;transition:background .2s,color .2s}
.vp-pay span.m{justify-content:flex-end;color:#ffc93f;letter-spacing:0}
.vp-pay span.p{justify-content:flex-end;min-width:96px;color:#dbe6ee;letter-spacing:0}
.vp-pay div.on span{background:rgba(31,220,124,.16);color:#fff}
.vp-pay div.on span:first-child{border-radius:7px 0 0 7px}.vp-pay div.on span:last-child{border-radius:0 7px 7px 0}
.vp-pay div.hit span{background:var(--gr);color:#05301a}
.vp-say{flex:none;text-align:center;font-size:clamp(22px,3.2vw,32px);line-height:1;color:#fff;min-height:32px}
.vp-say.w{color:var(--gr)}.vp-say.l{color:var(--mu)}.vp-say.pop{animation:csPop .45s var(--sp)}
.vp-hand{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;gap:12px;--cw:90px}
.vp-slot{display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer}
.vp-slot .hold{height:22px;padding:0 10px;border-radius:11px;display:flex;align-items:center;font-size:10.5px;font-weight:800;letter-spacing:.16em;
  background:var(--gd);color:#2a1a00;opacity:0;transform:translateY(6px) scale(.8);transition:opacity .2s,transform .3s var(--sp)}
.vp-slot.held .hold{opacity:1;transform:none}
.vp-slot.held .cs-cardc{transform:translateY(-10px)}
.vp-slot .cs-cardc{transition:transform .25s var(--ez)}
.vp-slot .cs-cardc .fa{box-shadow:0 12px 26px -10px rgba(0,0,0,.75)}
.vp-slot.held .cs-cardc .fa{box-shadow:0 0 0 3px var(--gd),0 16px 30px -10px rgba(255,201,63,.6)}
.vp-slot.dim .cs-cardc{opacity:.45}
.vp-hand.locked .vp-slot{cursor:default}
`,
  bot(C) {
    const T = [[.000025, 80000], [.00011, 6000], [.00236, 2200], [.0115, 900], [.011, 600], [.0112, 400], [.0744, 300], [.1293, 200], [.2146, 100]];
    let r = C.rnd();
    for (const [p, x] of T) { r -= p; if (r < 0) return x; }
    return 0;
  },
  make(C) {
    const PAY = [
      ['Royal flush', 80000], ['Straight flush', 6000], ['Four of a kind', 2200], ['Full house', 900], ['Flush', 600],
      ['Straight', 400], ['Three of a kind', 300], ['Two pair', 200], ['Jacks or better', 100]
    ];
    let amt, go, note, board, payEl, rows = [], sayEl, handEl, slots = [], hist, res;
    let st = null, busy = 0;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board vp-board"><div class="vp-pay">' +
        PAY.map(p => '<div><span>' + p[0] + '</span><span class="m num">' + (p[1] / 100) + '×</span><span class="p num"></span></div>').join('') +
        '</div><div class="vp-say cn">Jacks or better</div><div class="vp-hand locked">' +
        '<div class="vp-slot"><span class="hold">HOLD</span></div>'.repeat(5) + '</div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      go = C.mk('button', 'cs-go', 'Deal'); go.onclick = press; ctl.appendChild(go);
      note = C.mk('div', 'cs-note', 'Deal five cards, click the ones to keep, then draw. A pair of jacks or better gets your stake back.');
      ctl.appendChild(note);
      payEl = view.querySelector('.vp-pay'); rows = [...payEl.children];
      sayEl = view.querySelector('.vp-say'); handEl = view.querySelector('.vp-hand');
      slots = [...view.querySelectorAll('.vp-slot')];
      slots.forEach((s, i) => { s.onclick = () => hold(i); });
      hist = C.mk('div', 'cs-lhist'); hist.style.top = 'auto'; hist.style.bottom = '14px'; board.appendChild(hist);
      res = AIK.res(C, board);
      /* a hand face down on the table to start with */
      slots.forEach((s, i) => s.appendChild(C.cardEl({ r: 1 + i, s: i % 4 }, true)));
      /* five cards have to fit the hand's box whatever the board's shape */
      const fit = () => {
        const W = handEl.clientWidth, H = handEl.clientHeight;
        const cw = Math.max(44, Math.floor(Math.min(118, (W - 4 * 12 - 8) / 5, (H - 40) / 1.42)));
        handEl.style.setProperty('--cw', cw + 'px');
      };
      new ResizeObserver(fit).observe(handEl);
      fit();
      refresh();
    }
    function deck() {
      const d = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s });
      for (let i = d.length - 1; i > 0; i--) { const j = C.rint(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
      return d;
    }
    /* the hand's rank, as an index into PAY, or -1 */
    function rank(cards) {
      const cnt = {}, suits = new Set();
      for (const c of cards) { cnt[c.r] = (cnt[c.r] || 0) + 1; suits.add(c.s); }
      const n = Object.values(cnt).sort((a, b) => b - a).join('');
      const flush = suits.size === 1;
      const rs = [...new Set(cards.map(c => c.r))].sort((a, b) => a - b);
      const royal = rs.length === 5 && rs.join() === '1,10,11,12,13';
      const straight = rs.length === 5 && (rs[4] - rs[0] === 4 || royal);
      if (straight && flush) return royal ? 0 : 1;
      if (n === '41') return 2;
      if (n === '32') return 3;
      if (flush) return 4;
      if (straight) return 5;
      if (n === '311') return 6;
      if (n === '221') return 7;
      if (n === '2111') { const r = +Object.keys(cnt).find(k => cnt[k] === 2); if (r === 1 || r >= 11) return 8; }
      return -1;
    }
    function lay(i, card, down) {
      const s = slots[i];
      const old = s.querySelector('.cs-cardc'); if (old) old.remove();
      const el = C.cardEl(card, down, 0, -120);
      s.appendChild(el);
      return el;
    }
    function press() {
      if (busy) return;
      if (!st) deal(); else drawCards();
    }
    function deal() {
      const b = C.takeBet(amt);
      if (!b) return;
      const d = deck();
      st = { bet: b, d, hand: d.splice(0, 5), held: [false, false, false, false, false] };
      res.hide();
      rows.forEach(r => r.classList.remove('on', 'hit'));
      slots.forEach(s => s.classList.remove('held', 'dim'));
      busy = 1;
      st.hand.forEach((c, i) => setTimeout(() => { if (!st) return; lay(i, c, false); C.sfx('csCard'); if (i === 4) { busy = 0; hint(); refresh(); } }, 90 + i * 110));
      C.setText(sayEl, 'Hold the cards you want'); sayEl.className = 'vp-say cn';
      refresh();
    }
    function hold(i) {
      if (!st || busy) return;
      st.held[i] = !st.held[i];
      slots[i].classList.toggle('held', st.held[i]);
      C.sfx(st.held[i] ? 'csChip' : 'blip');
      refresh();
    }
    /* what the cards already make, lit on the table */
    function hint() {
      if (!st) return;
      const k = rank(st.hand);
      rows.forEach((r, j) => r.classList.toggle('on', j === k));
    }
    function drawCards() {
      if (!st || busy) return;
      const s = st;
      const redraw = [];
      s.hand = s.hand.map((c, i) => { if (s.held[i]) return c; redraw.push(i); return s.d.shift(); });
      busy = 1;
      if (!redraw.length) { busy = 0; settleHand(s); return; }
      redraw.forEach((i, n) => setTimeout(() => { if (st !== s) return; lay(i, s.hand[i], false); C.sfx('csCard'); if (n === redraw.length - 1) { busy = 0; settleHand(s); } }, 80 + n * 120));
      refresh();
    }
    function settleHand(s, quiet) {
      if (st !== s) return;
      st = null;
      const k = rank(s.hand), mx = k >= 0 ? PAY[k][1] : 0;
      const pay = C.payOf(s.bet, mx);
      C.credit(pay);
      C.record('poker', s.bet, mx, pay);
      rows.forEach((r, j) => { r.classList.remove('on'); r.classList.toggle('hit', j === k); });
      slots.forEach(sl => sl.classList.remove('held'));
      if (k < 0) slots.forEach(sl => sl.classList.add('dim'));
      if (!quiet) {
        const net = pay - s.bet;
        C.setText(sayEl, k >= 0 ? PAY[k][0] + ' · ' + C.mxs(mx) : 'No win');
        sayEl.className = 'vp-say cn pop ' + (net > 0 ? 'w' : k >= 0 ? '' : 'l');
        C.pushPill(hist, k >= 0 ? C.mxs(mx) : '0.00×', k >= 0 ? C.mxCls(mx) || 'g' : 'r', 6);
        if (net > 0) C.sfx('csCash', mx / 100); else if (pay) C.sfx('csDraw'); else C.sfx('csLose');
        if (mx >= 900) { res.show(true, mx, net, null, PAY[k][0]); AIK.burst(C, board, .5, .6); }
      }
      refresh();
    }
    function refresh() {
      if (!go) return;
      const bet = st ? st.bet : C.betAmt;
      rows.forEach((r, j) => { const p = r.querySelector('.p'); C.setText(p, C.money(C.payOf(bet, PAY[j][1]))); });
      if (st) {
        go.className = 'cs-go cash'; go.disabled = !!busy;
        const n = st.held.filter(Boolean).length;
        go.innerHTML = 'Draw<small>' + (n ? 'keeping ' + n + (n === 1 ? ' card' : ' cards') : 'replacing all five') + '</small>';
      } else { go.className = 'cs-go'; go.disabled = !!busy; go.textContent = 'Deal'; }
      handEl.classList.toggle('locked', !st);
      amt.lock(!!st);
    }
    function settle() {
      if (!st) return;
      /* the buzzer draws with what is held */
      const s = st;
      s.hand = s.hand.map((c, i) => s.held[i] ? c : s.d.shift());
      s.hand.forEach((c, i) => lay(i, c, false));
      busy = 0;
      settleHand(s, true);
    }
    return { build, settle, refresh, hotkey: press, busy: () => !!st };
  }
});
