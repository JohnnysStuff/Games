/* ================================================== ALL IN: ROULETTE ===
   European roulette: one zero, thirty-seven pockets. Put chips on the table
   — any number pays 36×, a column or a dozen 3×, red, black, odd, even, low
   or high 2× — and spin. The chips stay on the table for the next spin
   until you clear them. The wheel and the ball are drawn on a canvas: the
   ball runs round the track against the wheel, drops, rattles over the
   frets and settles in its pocket. The house keeps 1/37, like a real one. */
ALLIN_TABLES.push({
  id: 'roulette', name: 'Roulette', tag: 'NEW',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v5.8M12 15.2V21M3 12h5.8M15.2 12H21"/>' +
        '<circle cx="17.2" cy="6.8" r="1.3" fill="currentColor" stroke="none"/></svg>',
  css: `
.rl-board{background:radial-gradient(90% 60% at 50% 30%,rgba(23,120,86,.30),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%);display:flex;flex-direction:column;padding:12px 12px 14px;gap:10px}
.rl-top{position:relative;flex:1;min-height:0}
.rl-top canvas{position:absolute;inset:0;width:100%;height:100%}
.rl-past{position:absolute;right:4px;top:4px;display:flex;flex-direction:column;gap:5px;align-items:flex-end;z-index:1}
.rl-past i{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:12.5px;color:#fff;
  box-shadow:0 3px 8px -2px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.18);animation:csPill .45s var(--sp)}
.rl-past i:first-child{width:36px;height:36px;font-size:14px;box-shadow:0 0 0 2px #ffc93f,0 3px 10px -2px rgba(0,0,0,.6)}
.rl-past i.r{background:#d9304a}.rl-past i.b{background:#1b2530}.rl-past i.g{background:#1b9e5a}
.rl-say{position:absolute;left:4px;top:4px;display:flex;flex-direction:column;gap:2px;pointer-events:none;z-index:1}
.rl-say .x{font-size:clamp(24px,3.4vw,34px);line-height:1;color:#fff}
.rl-say .x.w{color:var(--gr)}.rl-say .x.pop{animation:csPop .45s var(--sp)}
.rl-say .t{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8ba3b6}
.rl-table{flex:none;display:grid;grid-template-columns:1.1fr repeat(12,1fr) 1.1fr;grid-template-rows:repeat(3,clamp(30px,5.2vh,42px)) clamp(28px,4.6vh,38px) clamp(28px,4.6vh,38px);
  gap:3px;padding:6px;border-radius:12px;background:rgba(6,30,20,.55);box-shadow:inset 0 0 0 1px rgba(255,201,63,.25)}
.rl-c{position:relative;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:clamp(11px,1.35vw,14px);color:#fff;
  cursor:pointer;user-select:none;transition:filter .15s,box-shadow .2s,transform .12s var(--ez)}
.rl-c:hover{filter:brightness(1.18)}
.rl-c:active{transform:scale(.96)}
.rl-c.r{background:#d9304a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
.rl-c.b{background:#1b2530;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35)}
.rl-c.g{background:#1b9e5a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
.rl-c.o{background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);font-size:clamp(10px,1.2vw,12.5px)}
.rl-c.o.re{background:#d9304a}.rl-c.o.bl{background:#1b2530}
.rl-c.win{box-shadow:0 0 0 2px #ffc93f,0 0 22px -2px rgba(255,201,63,.9);z-index:1}
.rl-c.hot{animation:rlHot .9s ease-in-out 3}
@keyframes rlHot{50%{filter:brightness(1.5)}}
.rl-c .ak-chip{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.74);pointer-events:none;z-index:2;animation:akDrop .3s var(--sp)}
.rl-c.lost .ak-chip{transition:transform .5s var(--ez),opacity .5s;transform:translate(-50%,-160%) scale(.4);opacity:0}
.rl-c.paid .ak-chip{box-shadow:0 2px 0 var(--e),0 0 0 2px #fff,0 0 18px 3px #ffc93f}
.rl-table.busy .rl-c{pointer-events:none}
`,
  bot(C) {
    const k = C.rint(3), n = C.rint(37);
    if (k === 0) return n === C.rint(37) ? 3600 : 0;
    if (k === 1) { const d = C.rint(3); return n && Math.floor((n - 1) / 12) === d ? 300 : 0; }
    return n && n % 2 === C.rint(2) ? 200 : 0;
  },
  make(C) {
    const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const colOf = n => n === 0 ? 'g' : RED.has(n) ? 'r' : 'b';
    /* every bet on the table: what it covers and what it pays */
    const BETS = {};
    for (let n = 0; n <= 36; n++) BETS['n' + n] = { x: 3600, win: m => m === n };
    Object.assign(BETS, {
      c1: { x: 300, win: m => m > 0 && m % 3 === 1 }, c2: { x: 300, win: m => m > 0 && m % 3 === 2 }, c3: { x: 300, win: m => m > 0 && m % 3 === 0 },
      d1: { x: 300, win: m => m >= 1 && m <= 12 }, d2: { x: 300, win: m => m >= 13 && m <= 24 }, d3: { x: 300, win: m => m >= 25 && m <= 36 },
      lo: { x: 200, win: m => m >= 1 && m <= 18 }, hi: { x: 200, win: m => m >= 19 },
      ev: { x: 200, win: m => m > 0 && m % 2 === 0 }, od: { x: 200, win: m => m % 2 === 1 },
      re: { x: 200, win: m => RED.has(m) }, bl: { x: 200, win: m => m > 0 && !RED.has(m) }
    });
    let amt, kTot, kWin, go, undoB, clrB, board, table, G, past, sayX, sayT, cells = {}, res;
    const bets = new Map(), moves = [];
    let spin = null, wheelA = 0, lastN = null, lastBounce = 0;
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board rl-board"><div class="rl-top"><div class="rl-past"></div>' +
        '<div class="rl-say"><div class="x cn num">Place your chips</div><div class="t">then spin</div></div></div><div class="rl-table"></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      table = view.querySelector('.rl-table');
      amt = C.amountField('Chip value'); ctl.appendChild(amt.el);
      kTot = C.kv('Total on the table'); kWin = C.kv('Biggest possible win', 'g');
      ctl.appendChild(kTot); ctl.appendChild(kWin);
      const btns = C.mk('div', 'ak-btns');
      undoB = C.mk('button', 'cs-btn2', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>Undo');
      clrB = C.mk('button', 'cs-btn2', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 01-15.5 6.2L3 16M3 21v-5h5"/></svg>Clear');
      undoB.onclick = undo; clrB.onclick = clear;
      btns.appendChild(undoB); btns.appendChild(clrB); ctl.appendChild(btns);
      go = C.mk('button', 'cs-go', 'Spin'); go.onclick = bet; ctl.appendChild(go);
      ctl.appendChild(C.mk('div', 'cs-note', 'Click the table to put a chip of the value above on it. A number pays 36×, a column or a dozen 3×, the even-money bets 2×. Chips stay for the next spin.'));
      /* the table: zero, twelve columns of three, the column bets, the
         dozens, and the even-money bets along the bottom */
      const add = (key, cls, html, col, row) => {
        const c = C.mk('div', 'rl-c ' + cls, html);
        c.style.gridColumn = col; c.style.gridRow = row;
        c.dataset.k = key;
        table.appendChild(c); cells[key] = c;
      };
      add('n0', 'g', '0', '1', '1 / 4');
      for (let col = 0; col < 12; col++) for (let r = 0; r < 3; r++) {
        const n = 3 * (col + 1) - r;
        add('n' + n, colOf(n), String(n), String(col + 2), String(r + 1));
      }
      add('c3', 'o', '2:1', '14', '1'); add('c2', 'o', '2:1', '14', '2'); add('c1', 'o', '2:1', '14', '3');
      add('d1', 'o', '1 to 12', '2 / 6', '4'); add('d2', 'o', '13 to 24', '6 / 10', '4'); add('d3', 'o', '25 to 36', '10 / 14', '4');
      add('lo', 'o', '1 to 18', '2 / 4', '5'); add('ev', 'o', 'Even', '4 / 6', '5'); add('re', 'o re', '', '6 / 8', '5');
      add('bl', 'o bl', '', '8 / 10', '5'); add('od', 'o', 'Odd', '10 / 12', '5'); add('hi', 'o', '19 to 36', '12 / 14', '5');
      table.addEventListener('click', e => { const c = e.target.closest('.rl-c'); if (c) place(c.dataset.k); });
      table.addEventListener('contextmenu', e => { const c = e.target.closest('.rl-c'); if (!c) return; e.preventDefault(); takeOff(c.dataset.k); });
      G = C.canvasIn(view.querySelector('.rl-top'));
      view.querySelector('.rl-top').insertBefore(G.cv, view.querySelector('.rl-top').firstChild);
      past = view.querySelector('.rl-past');
      sayX = view.querySelector('.rl-say .x'); sayT = view.querySelector('.rl-say .t');
      res = AIK.res(C, board);
      refresh();
    }
    const total = () => { let s = 0; for (const v of bets.values()) s += v; return s; };
    function paintCell(key) {
      const c = cells[key], v = bets.get(key) || 0;
      let chip = c.querySelector('.ak-chip');
      if (!v) { if (chip) chip.remove(); return; }
      const nc = AIK.stackEl(C, v);
      if (chip) chip.replaceWith(nc); else c.appendChild(nc);
    }
    function clearMarks() { for (const k in cells) cells[k].classList.remove('win', 'hot', 'lost', 'paid'); }
    function place(key) {
      if (spin) return;
      clearMarks();
      const v = C.betAmt;
      if (total() + v > C.me.bal) { C.toast('Not enough chips for another <b>' + C.money(v) + '</b>.', 'info', C.I.chip); C.sfx('nope'); return; }
      bets.set(key, (bets.get(key) || 0) + v);
      moves.push([key, v]);
      paintCell(key);
      C.sfx('csChip');
      refresh();
    }
    function takeOff(key) {
      if (spin || !bets.get(key)) return;
      clearMarks();
      bets.delete(key);
      for (let i = moves.length - 1; i >= 0; i--) if (moves[i][0] === key) moves.splice(i, 1);
      paintCell(key);
      C.sfx('blip');
      refresh();
    }
    function undo() {
      if (spin || !moves.length) return;
      clearMarks();
      const [key, v] = moves.pop();
      const left = (bets.get(key) || 0) - v;
      if (left > 0) bets.set(key, left); else bets.delete(key);
      paintCell(key);
      C.sfx('blip');
      refresh();
    }
    function clear() {
      if (spin || !bets.size) return;
      clearMarks();
      const keys = [...bets.keys()];
      bets.clear(); moves.length = 0;
      keys.forEach(paintCell);
      C.sfx('blip');
      refresh();
    }
    function refresh() {
      if (!go) return;
      const t = total();
      C.setText(kTot.v, C.money(t));
      /* the most one number could pay back */
      let best = 0;
      for (let n = 0; n <= 36; n++) {
        let p = 0;
        for (const [k, v] of bets) if (BETS[k].win(n)) p += C.payOf(v, BETS[k].x);
        best = Math.max(best, p);
      }
      C.setText(kWin.v, t ? '+' + C.money(Math.max(0, best - t)) : '—');
      go.disabled = !!spin;
      go.innerHTML = spin ? 'Spinning…' : t ? 'Spin<small class="num">' + C.money(t) + ' on the table</small>' : 'Spin';
      undoB.disabled = clrB.disabled = !!spin;
      table.classList.toggle('busy', !!spin);
    }
    function bet() {
      if (spin) { finish(spin); return; }
      const t = total();
      if (!t) { C.toast('Put some chips on the table first.', 'info', C.I.chip); C.sfx('nope'); return; }
      const b = C.takeBet(amt, t);
      if (!b) return;
      clearMarks();
      const n = C.rint(37);
      let pay = 0;
      const won = [];
      for (const [k, v] of bets) if (BETS[k].win(n)) { pay += C.payOf(v, BETS[k].x); won.push(k); }
      /* the wheel turns a turn and a half and a bit, and the ball runs the
         other way until it drops into the pocket that is under it then */
      const p = ORDER.indexOf(n), seg = Math.PI * 2 / 37;
      const T = 4600, w0 = wheelA, w1 = wheelA + Math.PI * 2 * (1.3 + C.rnd() * .5);
      const tc = 3500;
      const wAtC = w0 + (w1 - w0) * easeW(tc / T);
      const ballEnd = wAtC + p * seg - Math.PI / 2;
      const b0 = ballEnd + Math.PI * 2 * (5 + C.rint(2)) + C.rnd() * Math.PI * 2;
      spin = { bet: b, n, pay, won, t0: performance.now(), T, tc, w0, w1, b0, ballEnd, p, seg, done: false };
      lastBounce = -2;
      C.setText(sayX, 'No more bets'); sayX.className = 'x cn num';
      C.setText(sayT, C.money(t) + ' on the table');
      C.sfx('csLaunch');
      refresh();
    }
    const easeW = t => 1 - Math.pow(1 - Math.min(1, t), 3);
    function finish(s) {
      if (!s || s.done) return;
      s.done = true;
      if (spin === s) spin = null;
      wheelA = s.w1;
      lastN = s.n;
      C.credit(s.pay);
      const t = s.bet, mx = t ? Math.floor(s.pay * 100 / t) : 0;
      C.record('roulette', t, mx, s.pay);
      const c = colOf(s.n);
      const dot = C.mk('i', c, String(s.n));
      past.insertBefore(dot, past.firstChild);
      while (past.children.length > 8) past.lastChild.remove();
      cells['n' + s.n].classList.add('win');
      for (const k of bets.keys()) cells[k].classList.add(s.won.includes(k) ? 'paid' : 'lost');
      for (const k of s.won) cells[k].classList.add('hot');
      const net = s.pay - t;
      C.setText(sayX, String(s.n) + ' ' + (c === 'r' ? 'Red' : c === 'b' ? 'Black' : 'Green'));
      sayX.className = 'x cn num pop' + (net > 0 ? ' w' : '');
      C.setText(sayT, s.pay ? (net >= 0 ? 'Won +' : 'Back ') + C.money(net >= 0 ? net : s.pay) : 'Nothing on it');
      if (net > 0) C.sfx('csCash', Math.max(1.2, mx / 100)); else C.sfx('csLose');
      if (mx >= 1000) { res.show(true, mx, net, null, 'Straight up on ' + s.n); AIK.burst(C, board, .5, .3); }
      /* the losing chips are swept; the rest stay for the next spin */
      setTimeout(() => {
        if (spin) return;
        for (const k of [...bets.keys()]) if (!s.won.includes(k)) cells[k].classList.remove('lost');
        for (const k of [...bets.keys()]) paintCell(k);
      }, 900);
      refresh();
      G.dirty = true;
    }
    /* ------------------------------------------------------------ drawing */
    function draw(now) {
      if (!G) return;
      const s = spin;
      if (!s && !G.dirty) return;
      G.dirty = false;
      const g = G.g, W = G.W, H = G.H;
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const R = Math.max(40, Math.min(W * .44, H * .5 - 6)), cx = W / 2, cy = H / 2;
      let wa = wheelA, ba = null, br = 0;
      const Rtrack = R * .9, Rpocket = R * .62;
      if (s) {
        const t = now - s.t0;
        wa = s.w0 + (s.w1 - s.w0) * easeW(t / s.T);
        if (t < s.tc) {
          const u = t / s.tc;
          ba = s.b0 + (s.ballEnd - s.b0) * (1 - Math.pow(1 - u, 2.2));
          const drop = Math.max(0, (u - .62) / .38);
          br = Rtrack - (Rtrack - Rpocket) * drop * drop + Math.abs(Math.sin(drop * Math.PI * 4)) * (1 - drop) * R * .05;
          if (drop > 0 && Math.floor(drop * 8) !== lastBounce) { lastBounce = Math.floor(drop * 8); C.sfx('csBall', 1 - drop * .6); }
          C.sfx('csBallRun', Math.max(0, 1 - u * 1.25));
        } else {
          ba = wa + s.p * s.seg - Math.PI / 2;
          br = Rpocket;
          if (lastBounce !== -1) { lastBounce = -1; C.sfx('csBall', .5); }
        }
        if (t >= s.T) { finish(s); }
      } else if (lastN != null) {
        ba = wa + ORDER.indexOf(lastN) * (Math.PI * 2 / 37) - Math.PI / 2;
        br = Rpocket;
      }
      wheel(g, cx, cy, R, wa);
      if (ba != null) {
        const bx = cx + Math.cos(ba) * br, by = cy + Math.sin(ba) * br, rr = Math.max(4, R * .045);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(bx + 2, by + 3, rr, 0, Math.PI * 2); g.fill();
        const bg = g.createRadialGradient(bx - rr * .35, by - rr * .35, rr * .1, bx, by, rr);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#b9c6d1');
        g.fillStyle = bg; g.beginPath(); g.arc(bx, by, rr, 0, Math.PI * 2); g.fill();
      }
    }
    function wheel(g, cx, cy, R, wa) {
      const seg = Math.PI * 2 / 37;
      /* the bowl and its wooden rim */
      g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
      g.fillStyle = '#2a1a0c'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); g.restore();
      const rim = g.createRadialGradient(cx, cy, R * .82, cx, cy, R);
      rim.addColorStop(0, '#6b4524'); rim.addColorStop(.6, '#4a2e15'); rim.addColorStop(1, '#2a1a0c');
      g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c9a23a'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 1, 0, Math.PI * 2); g.stroke();
      /* the ball track */
      const tr = g.createRadialGradient(cx, cy, R * .74, cx, cy, R * .86);
      tr.addColorStop(0, '#0c1822'); tr.addColorStop(1, '#1b3040');
      g.fillStyle = tr; g.beginPath(); g.arc(cx, cy, R * .86, 0, Math.PI * 2); g.fill();
      /* the pockets, turning with the wheel */
      g.save(); g.translate(cx, cy); g.rotate(wa);
      for (let i = 0; i < 37; i++) {
        const n = ORDER[i], a0 = -Math.PI / 2 + i * seg - seg / 2;
        g.fillStyle = n === 0 ? '#1b9e5a' : RED.has(n) ? '#d9304a' : '#1b2530';
        g.beginPath(); g.arc(0, 0, R * .74, a0, a0 + seg); g.arc(0, 0, R * .52, a0 + seg, a0, true); g.closePath(); g.fill();
      }
      g.strokeStyle = '#c9a23a'; g.lineWidth = 1.2;
      for (let i = 0; i < 37; i++) {
        const a = -Math.PI / 2 + i * seg - seg / 2;
        g.beginPath(); g.moveTo(Math.cos(a) * R * .52, Math.sin(a) * R * .52); g.lineTo(Math.cos(a) * R * .74, Math.sin(a) * R * .74); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, R * .74, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0, 0, R * .52, 0, Math.PI * 2); g.stroke();
      /* the numbers, round the outside of the pockets */
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 ' + Math.max(8, Math.round(R * .065)) + 'px ui-sans-serif,system-ui,sans-serif';
      for (let i = 0; i < 37; i++) {
        const a = -Math.PI / 2 + i * seg;
        g.save(); g.rotate(a + Math.PI / 2); g.translate(0, -R * .675); g.fillText(String(ORDER[i]), 0, 0); g.restore();
      }
      /* the cone and the turret */
      const cone = g.createRadialGradient(-R * .1, -R * .12, R * .04, 0, 0, R * .52);
      cone.addColorStop(0, '#2b4a62'); cone.addColorStop(.7, '#13232f'); cone.addColorStop(1, '#0b1720');
      g.fillStyle = cone; g.beginPath(); g.arc(0, 0, R * .5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e8c766'; g.lineWidth = Math.max(3, R * .04); g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * .3, Math.sin(a) * R * .3); g.stroke();
        g.fillStyle = '#ffc93f'; g.beginPath(); g.arc(Math.cos(a) * R * .31, Math.sin(a) * R * .31, R * .04, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffc93f'; g.beginPath(); g.arc(0, 0, R * .07, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(-R * .02, -R * .02, R * .03, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    function tick() { if (spin && performance.now() - spin.t0 > spin.T + 120) finish(spin); }
    function settle() { if (spin) finish(spin); }
    return { build, draw, tick, settle, refresh, hotkey: bet, busy: () => !!spin,
      /* autobet spins the chips on the table, as they lie, every time */
      auto: { noAmount: true, gap: 900, act(P) {
        if (P.tried) return;
        if (!total()) { P.why = 'put some chips on the table first'; return; }
        P.tried = true; bet();
      } } };
  }
});
