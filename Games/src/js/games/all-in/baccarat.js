/* ================================================== ALL IN: BACCARAT ===
   Punto banco. Put chips on the player, the banker or the tie, and the
   hands are dealt by the book: two cards each, a natural 8 or 9 stands,
   and the third-card rules decide the rest. The player pays 2×, the banker
   1.95× (the 5% commission), a tie 9× — and a tie hands back what was on
   the player and the banker. Eight decks' worth of odds from a fresh card
   every time. */
ALLIN_TABLES.push({
  id: 'baccarat', name: 'Baccarat',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="5" width="10" height="14" rx="2"/><rect x="11" y="3" width="10" height="14" rx="2" fill="currentColor" fill-opacity=".18"/></svg>',
  css: `
.bc-board{background:radial-gradient(90% 70% at 50% 45%,rgba(23,120,86,.36),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%);display:flex;flex-direction:column;padding:14px;gap:10px}
.bc-hands{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:center}
.bc-hand{display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px;border-radius:16px;transition:background .3s,box-shadow .3s}
.bc-hand.win{background:rgba(255,201,63,.06);box-shadow:0 0 0 1px rgba(255,201,63,.5),0 0 40px -10px rgba(255,201,63,.6)}
.bc-hand .lb{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.bc-hand .tot{min-width:34px;height:26px;padding:0 9px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;
  letter-spacing:0;background:var(--rs);border:1px solid var(--ln2);color:#fff;transition:background .3s,color .3s}
.bc-hand.win .tot{background:var(--gd);color:#2a1a00;border-color:transparent}
.bc-cards{--cw:clamp(64px,9vw,92px);display:flex;min-height:calc(var(--cw) * 1.42)}
.bc-cards .cs-cardc+.cs-cardc{margin-left:calc(var(--cw) * -.46)}
/* the third card goes in sideways, the way a dealer lays it */
.bc-cards .cs-cardc.third{margin-left:calc(var(--cw) * .28);margin-right:calc(var(--cw) * .21)}
.bc-cards .cs-cardc.third .in{transform:rotate(90deg)}
.bc-mid{flex:none;display:flex;justify-content:center}
.bc-rib{padding:5px 18px;border-radius:6px;background:rgba(6,30,20,.6);box-shadow:inset 0 0 0 1px rgba(255,201,63,.35);font-size:10.5px;font-weight:800;
  letter-spacing:.2em;color:#e8c766;text-transform:uppercase}
.bc-say{font-size:clamp(22px,3.2vw,30px);line-height:1;color:#fff;text-align:center;min-height:30px}
.bc-say.w{color:var(--gr)}.bc-say.pop{animation:csPop .45s var(--sp)}
.bc-zones{flex:none;display:grid;grid-template-columns:1fr .8fr 1fr;gap:10px}
.bc-z{position:relative;height:clamp(86px,14vh,112px);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;
  background:rgba(6,30,20,.5);box-shadow:inset 0 0 0 2px rgba(255,255,255,.12);transition:box-shadow .2s,background .2s,transform .12s var(--ez)}
.bc-z:hover{background:rgba(10,45,30,.6);box-shadow:inset 0 0 0 2px rgba(255,255,255,.28)}
.bc-z:active{transform:scale(.98)}
.bc-z b{font-size:clamp(17px,2.2vw,22px);color:#fff}
.bc-z span{font-size:11px;font-weight:800;letter-spacing:.14em;color:#8fd4b0;text-transform:uppercase}
.bc-z em{font-style:normal;font-size:12.5px;font-weight:800;color:#dbe6ee;min-height:16px}
.bc-z.pl b{color:#7cc0ff}.bc-z.bk b{color:#ff8597}.bc-z.ti b{color:#7dffb8}
.bc-z.win{box-shadow:inset 0 0 0 2px #ffc93f,0 0 30px -6px rgba(255,201,63,.8)}
.bc-z .ak-chip{position:absolute;right:10px;top:10px;transform:scale(.8);pointer-events:none;animation:akDrop .3s var(--sp)}
.bc-zones.busy .bc-z{pointer-events:none}
.bc-shoe{position:absolute;right:16px;top:14px;width:46px;height:34px;border-radius:6px;background:linear-gradient(180deg,#3a2a18,#22160b);
  box-shadow:0 8px 16px -6px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,201,63,.3)}
.bc-shoe::after{content:"";position:absolute;left:8px;top:-6px;width:30px;height:12px;border-radius:3px;background:repeating-linear-gradient(45deg,#2a64a8 0 4px,#23579a 4px 8px);
  box-shadow:inset 0 0 0 2px #fff}
`,
  bot(C) {
    const r = C.rnd(), side = C.rint(3);
    const pw = .4462, bw = .4586;
    if (side === 2) return r < .0952 ? 900 : 0;
    if (r < .0952) return 100;
    if (side === 0) return r < .0952 + pw ? 200 : 0;
    return r < .0952 + bw ? 195 : 0;
  },
  make(C) {
    const ZONES = { pl: { l: 'Player', x: 200 }, ti: { l: 'Tie', x: 900 }, bk: { l: 'Banker', x: 195 } };
    const val = c => c.r >= 10 ? 0 : c.r;
    const tot = cs => cs.reduce((s, c) => s + val(c), 0) % 10;
    let amt, kTot, go, undoB, clrB, board, zonesEl, zEl = {}, hands = {}, sayEl, res, hist;
    const bets = { pl: 0, ti: 0, bk: 0 }, moves = [];
    let deal = null;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board bc-board"><div class="bc-shoe"></div>' +
        '<div class="bc-hands">' +
          '<div class="bc-hand" data-h="pl"><div class="lb">Player <span class="tot num">–</span></div><div class="bc-cards"></div></div>' +
          '<div class="bc-hand" data-h="bk"><div class="lb">Banker <span class="tot num">–</span></div><div class="bc-cards"></div></div>' +
        '</div><div class="bc-say cn">Place your bets</div><div class="bc-mid"><div class="bc-rib">Tie pays 8 to 1</div></div>' +
        '<div class="bc-zones">' + Object.keys(ZONES).map(k => '<div class="bc-z ' + k + '" data-z="' + k + '"><b class="cn">' + ZONES[k].l + '</b><span>pays ' +
          (ZONES[k].x / 100) + '×</span><em class="num"></em></div>').join('') + '</div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField('Chip value'); ctl.appendChild(amt.el);
      kTot = C.kv('Total on the table'); ctl.appendChild(kTot);
      const btns = C.mk('div', 'ak-btns');
      undoB = C.mk('button', 'cs-btn2', 'Undo'); clrB = C.mk('button', 'cs-btn2', 'Clear');
      undoB.onclick = undo; clrB.onclick = clear;
      btns.appendChild(undoB); btns.appendChild(clrB); ctl.appendChild(btns);
      go = C.mk('button', 'cs-go', 'Deal'); go.onclick = bet; ctl.appendChild(go);
      ctl.appendChild(C.mk('div', 'cs-note', 'Click the player, the banker or the tie to put a chip on it. The banker pays 1.95× after commission; a tie pays 9× and hands back the player and banker bets.'));
      zonesEl = view.querySelector('.bc-zones');
      zonesEl.querySelectorAll('.bc-z').forEach(z => { zEl[z.dataset.z] = z; });
      zonesEl.addEventListener('click', e => { const z = e.target.closest('.bc-z'); if (z) place(z.dataset.z); });
      view.querySelectorAll('.bc-hand').forEach(h => { hands[h.dataset.h] = { el: h, cards: h.querySelector('.bc-cards'), tot: h.querySelector('.tot') }; });
      sayEl = view.querySelector('.bc-say');
      hist = C.mk('div', 'cs-lhist'); hist.style.right = '76px'; board.appendChild(hist);
      res = AIK.res(C, board);
      refresh();
    }
    const total = () => bets.pl + bets.ti + bets.bk;
    function paintZone(k) {
      const z = zEl[k], v = bets[k];
      const old = z.querySelector('.ak-chip'); if (old) old.remove();
      z.querySelector('em').textContent = v ? C.money(v) : '';
      if (v) z.appendChild(AIK.stackEl(C, v));
    }
    function place(k) {
      if (deal) return;
      const v = C.betAmt;
      if (total() + v > C.me.bal) { C.toast('Not enough chips for another <b>' + C.money(v) + '</b>.', 'info', C.I.chip); C.sfx('nope'); return; }
      unmark();
      bets[k] += v; moves.push([k, v]);
      paintZone(k); C.sfx('csChip'); refresh();
    }
    function undo() { if (deal || !moves.length) return; const [k, v] = moves.pop(); bets[k] -= v; unmark(); paintZone(k); C.sfx('blip'); refresh(); }
    function clear() { if (deal || !total()) return; bets.pl = bets.ti = bets.bk = 0; moves.length = 0; unmark(); Object.keys(bets).forEach(paintZone); C.sfx('blip'); refresh(); }
    function unmark() { Object.values(zEl).forEach(z => z.classList.remove('win')); Object.values(hands).forEach(h => h.el.classList.remove('win')); }
    function refresh() {
      if (!go) return;
      const t = total();
      C.setText(kTot.v, C.money(t));
      go.disabled = !!deal;
      go.innerHTML = deal ? 'Dealing…' : t ? 'Deal<small class="num">' + C.money(t) + ' on the table</small>' : 'Deal';
      undoB.disabled = clrB.disabled = !!deal;
      zonesEl.classList.toggle('busy', !!deal);
    }
    /* the hand, by the book */
    function play() {
      const P = [C.newCard(), C.newCard()], B = [C.newCard(), C.newCard()];
      const seq = [['pl', P[0]], ['bk', B[0]], ['pl', P[1]], ['bk', B[1]]];
      let p = tot(P), b = tot(B);
      if (p < 8 && b < 8) {
        let p3 = null;
        if (p <= 5) { p3 = C.newCard(); P.push(p3); seq.push(['pl', p3, 1]); p = tot(P); }
        let draw;
        if (!p3) draw = b <= 5;
        else {
          const v = val(p3);
          draw = b <= 2 || (b === 3 && v !== 8) || (b === 4 && v >= 2 && v <= 7) || (b === 5 && v >= 4 && v <= 7) || (b === 6 && (v === 6 || v === 7));
        }
        if (draw) { const b3 = C.newCard(); B.push(b3); seq.push(['bk', b3, 1]); b = tot(B); }
      }
      return { seq, p, b, out: p > b ? 'pl' : b > p ? 'bk' : 'ti' };
    }
    function bet() {
      if (deal) { finish(deal); return; }
      const t = total();
      if (!t) { C.toast('Put a chip on the player, the banker or the tie.', 'info', C.I.chip); C.sfx('nope'); return; }
      const b = C.takeBet(amt, t);
      if (!b) return;
      unmark();
      const h = play();
      let pay = 0;
      if (h.out === 'ti') pay = C.payOf(bets.ti, 900) + bets.pl + bets.bk;
      else pay = C.payOf(bets[h.out], ZONES[h.out].x);
      deal = { bet: b, h, pay, t0: performance.now(), shown: 0, done: false };
      Object.values(hands).forEach(x => { x.cards.innerHTML = ''; C.setText(x.tot, '–'); });
      C.setText(sayEl, 'No more bets'); sayEl.className = 'bc-say cn';
      refresh();
    }
    function show(d, i) {
      const [side, card, third] = d.h.seq[i];
      const H = hands[side];
      const el = C.cardEl(card, false, 220, -160);
      if (third) el.classList.add('third');
      H.cards.appendChild(el);
      const cards = d.h.seq.slice(0, i + 1).filter(s => s[0] === side).map(s => s[1]);
      C.setText(H.tot, String(tot(cards)));
      C.sfx('csCard');
    }
    function finish(d) {
      if (!d || d.done) return;
      d.done = true;
      if (deal === d) deal = null;
      for (let i = d.shown; i < d.h.seq.length; i++) show(d, i);
      d.shown = d.h.seq.length;
      C.credit(d.pay);
      const mx = Math.floor(d.pay * 100 / d.bet);
      C.record('baccarat', d.bet, mx, d.pay);
      const { p, b, out } = d.h;
      zEl[out].classList.add('win');
      if (out !== 'ti') hands[out].el.classList.add('win');
      else { hands.pl.el.classList.add('win'); hands.bk.el.classList.add('win'); }
      const net = d.pay - d.bet;
      C.setText(sayEl, out === 'ti' ? 'Tie, ' + p + ' all' : (out === 'pl' ? 'Player' : 'Banker') + ' wins ' + Math.max(p, b) + ' to ' + Math.min(p, b));
      sayEl.className = 'bc-say cn pop' + (net > 0 ? ' w' : '');
      C.pushPill(hist, out === 'pl' ? 'P ' + p : out === 'bk' ? 'B ' + b : 'T ' + p, out === 'pl' ? 'g' : out === 'bk' ? 'r' : 'gd', 6);
      if (net > 0) C.sfx('csCash', Math.max(1.2, mx / 100)); else if (d.pay) C.sfx('csDraw'); else C.sfx('csLose');
      if (out === 'ti' && bets.ti) { res.show(true, 900, net, 'Tie!', '9× on the tie'); AIK.burst(C, board, .5, .45); }
      refresh();
    }
    /* the cards come out of the shoe at a dealer's pace */
    function draw(now) {
      const d = deal; if (!d) return;
      const t = now - d.t0;
      const at = i => i < 4 ? 120 + i * 330 : 120 + 4 * 330 + 350 + (i - 4) * 480;
      while (d.shown < d.h.seq.length && t >= at(d.shown)) { show(d, d.shown); d.shown++; }
      if (d.shown >= d.h.seq.length && t >= at(d.h.seq.length - 1) + 500) finish(d);
    }
    function tick() { if (deal && performance.now() - deal.t0 > 3600) finish(deal); }
    function settle() { if (deal) finish(deal); }
    return { build, draw, tick, settle, refresh, hotkey: bet, busy: () => !!deal,
      /* autobet deals the same bets, hand after hand */
      auto: { noAmount: true, gap: 900, act(P) {
        if (P.tried) return;
        if (!total()) { P.why = 'put a chip on the player, the banker or the tie first'; return; }
        P.tried = true; bet();
      } } };
  }
});
