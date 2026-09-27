/* ===================================================== ALL IN: SLIDE ===
   A shared table, like Crash. Every thirteen seconds a strip of multiplier
   cards slides past the pointer and stops on one; pick a target, and if the
   card that stops reaches it you are paid your target. Each round's cards
   come from the match seed and its timing from the match clock, so every
   screen slides the same strip to the same card. The stopping card is drawn
   like Crash's crash point, 99% over the long run. */
ALLIN_TABLES.push({
  id: 'slide', name: 'Slide', tag: 'NEW',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="2.5" y="7" width="5.5" height="10" rx="1.4"/><rect x="9.25" y="5" width="5.5" height="14" rx="1.4"/><rect x="16" y="7" width="5.5" height="10" rx="1.4"/>' +
        '<path d="M12 22v-2"/></svg>',
  css: `
.sl-wrap{display:flex;flex-direction:column;height:100%}
.sl-say{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:6%;pointer-events:none}
.sl-say .x{font-size:clamp(40px,6.4vw,70px);line-height:.95;color:#fff;transition:color .2s}
.sl-say .x.w{color:var(--gr);text-shadow:0 0 40px rgba(31,220,124,.4)}.sl-say .x.l{color:var(--rd)}.sl-say .x.pop{animation:csPop .5s var(--sp)}
.sl-say .t{font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--mu)}
.sl-say .bar{width:min(300px,60%);height:6px;border-radius:6px;margin-top:10px;background:rgba(255,255,255,.08);overflow:hidden}
.sl-say .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gr),var(--bl));border-radius:6px}
.sl-say.run .bar{visibility:hidden}
.sl-reel{position:relative;flex:1;min-height:150px;overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.sl-strip{position:absolute;left:0;top:50%;display:flex;gap:10px;transform:translateY(-50%);will-change:transform}
.sl-c{--c1:#3a5266;--c2:#2b4052;flex:none;width:78px;height:112px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  background:linear-gradient(180deg,var(--c1),var(--c2));box-shadow:0 12px 24px -12px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.18);
  transition:transform .4s var(--sp),box-shadow .3s,opacity .3s}
.sl-c svg{width:40%;height:auto;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}
.sl-c b{font-size:14px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.sl-strip.done .sl-c:not(.hit){opacity:.45}
.sl-c.hit{transform:scale(1.14);box-shadow:0 0 0 2px #fff,0 16px 36px -10px var(--c1),0 0 40px -6px var(--c1)}
.sl-ptr{position:absolute;left:50%;top:50%;width:3px;height:150px;margin:-75px 0 0 -1.5px;border-radius:3px;background:var(--gd);box-shadow:0 0 14px var(--gd);
  pointer-events:none;z-index:2}
.sl-ptr::before,.sl-ptr::after{content:"";position:absolute;left:50%;margin-left:-8px;border:8px solid transparent}
.sl-ptr::before{top:-4px;border-top-color:var(--gd)}.sl-ptr::after{bottom:-4px;border-bottom-color:var(--gd)}
`,
  make(C) {
    const BET_MS = 6000, SLIDE_MS = 4400, POST_MS = 2600, PERIOD = BET_MS + SLIDE_MS + POST_MS;
    const N = 44, WIN_AT = 36;
    const TIER = [[150, '#3a5266', '#2b4052', 'tri'], [200, '#35507a', '#28406a', 'tri'], [500, '#1fae66', '#138a4f', 'dia'],
                  [1000, '#2a7fe0', '#1d62b8', 'pent'], [5000, '#8a5cf6', '#6a3fd1', 'hex'], [10000, '#e9b12a', '#c28c0c', 'star'], [Infinity, '#ff4d68', '#c21f3d', 'star']];
    const SHAPE = {
      tri: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z" fill="#fff" fill-opacity=".85"/></svg>',
      dia: '<svg viewBox="0 0 24 24"><path d="M12 3l8 9-8 9-8-9z" fill="#fff" fill-opacity=".85"/></svg>',
      pent: '<svg viewBox="0 0 24 24"><path d="M12 3l9 6.5-3.4 10.5H6.4L3 9.5z" fill="#fff" fill-opacity=".85"/></svg>',
      hex: '<svg viewBox="0 0 24 24"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="#fff" fill-opacity=".85"/></svg>',
      star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#fff" fill-opacity=".9"/></svg>'
    };
    const tierOf = x => TIER.find(t => x < t[0]);
    /* round k, from the seed alone: its stopping card, the cards round it,
       and exactly where under the pointer it stops */
    const rounds = new Map();
    function round(k) {
      let r = rounds.get(k);
      if (r) return r;
      const g = mulberry(((C.SEED ^ Math.imul(k + 11, 0x85EBCA6B)) >>> 0) || 13);
      g(); g();
      const draw1 = () => Math.min(100000, Math.max(100, Math.floor(99 / (1 - g()))));
      const cards = Array.from({ length: N }, draw1);
      r = { k, start: k * PERIOD, slide: k * PERIOD + BET_MS, stop: k * PERIOD + BET_MS + SLIDE_MS, end: (k + 1) * PERIOD,
            cards, x: cards[WIN_AT], jit: g() - .5 };
      rounds.set(k, r);
      if (rounds.size > 40) rounds.delete(rounds.keys().next().value);
      return r;
    }
    const roundAt = c => round(Math.max(0, Math.floor(Math.max(0, c) / PERIOD)));
    let amt, tIn, kChance, kProfit, go, liveRows, liveN, liveT, board, hist, reel, strip, sayEl, sayX, sayT, barI, res;
    let target = 200, mine = null, done = null, histK = 0, builtK = -1, lastPhase = '', listSig = '', btnSig = '', lastIdx = -1;
    const botBets = new Map();                                  // round k → [{ b, bet, target }]
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="sl-wrap"><div class="cs-hist"><span class="cs-pl">First round coming up</span></div>' +
        '<div class="sl-say"><div class="x cn num">—</div><div class="t">Next round in</div><div class="bar"><i></i></div></div>' +
        '<div class="sl-reel"><div class="sl-strip"></div><div class="sl-ptr"></div></div></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const f = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Target multiplier</span></div><input class="cs-in" inputmode="decimal" aria-label="Target multiplier">');
      tIn = f.querySelector('input'); tIn.value = '2.00';
      tIn.addEventListener('change', () => {
        const x = parseFloat(String(tIn.value).replace(/[^0-9.]/g, ''));
        target = isFinite(x) ? Math.round(Math.max(1.01, Math.min(1000, x)) * 100) : target;
        tIn.value = (target / 100).toFixed(2);
        refresh();
      });
      ctl.appendChild(f);
      kChance = C.kv('Win chance'); kProfit = C.kv('Profit on win', 'g');
      ctl.appendChild(kChance); ctl.appendChild(kProfit);
      go = C.mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
      const lv = C.mk('div', 'cs-live', '<div class="lh"><span><b class="n num">0</b> in this round</span><span class="num t">0.00</span></div><div class="rows"></div>');
      ctl.appendChild(lv);
      liveRows = lv.querySelector('.rows'); liveN = lv.querySelector('.n'); liveT = lv.querySelector('.t');
      hist = view.querySelector('.cs-hist');
      reel = view.querySelector('.sl-reel'); strip = view.querySelector('.sl-strip');
      sayEl = view.querySelector('.sl-say'); sayX = sayEl.querySelector('.x'); sayT = sayEl.querySelector('.t'); barI = sayEl.querySelector('.bar i');
      res = AIK.res(C, board);
      refresh();
    }
    function refresh() {
      if (!go) return;
      C.setText(kChance.v, (99 / target * 100).toFixed(2) + '%');
      C.setText(kProfit.v, '+' + C.money(C.payOf(C.betAmt, target) - C.betAmt));
    }
    function press() {
      const c = C.clock(), r = roundAt(c);
      if (!C.live()) { C.takeBet(amt); return; }
      if (mine) {
        if (c < round(mine.k).slide) { C.refund(mine.bet); mine = null; listSig = ''; C.sfx('blip'); }
        return;
      }
      const bet = C.takeBet(amt);
      if (!bet) return;
      mine = { k: c < r.slide - 150 ? r.k : r.k + 1, bet, target, cash: 0, lost: false };
      listSig = '';
    }
    function resolve(r) {
      if (mine && mine.k === r.k) {
        const b = mine; mine = null;
        const win = r.x >= b.target;
        b.cash = win ? b.target : 0; b.lost = !win; done = b;
        const pay = win ? C.payOf(b.bet, b.target) : 0;
        C.credit(pay);
        C.record('slide', b.bet, b.cash, pay);
        if (win) { C.sfx('csCash', b.target / 100); if (b.target >= 1000) { res.show(true, b.target, pay - b.bet); AIK.burst(C, board, .5, .5); } }
        listSig = '';
      }
      const list = botBets.get(r.k);
      if (list) for (const e of list) {
        if (e.done) continue;
        const win = r.x >= e.target, pay = win ? C.payOf(e.bet, e.target) : 0;
        e.b.bal += pay; e.done = true; e.cash = win ? e.target : 0;
        C.pushFeed(e.b, { g: 'slide', b: e.bet, m: e.cash, p: pay });
        C.markLB();
      }
    }
    /* the house players sit in on a round now and then, while the table is open */
    let botK = -1, resK = -1;
    function tick(c) {
      const r = roundAt(c);
      if (r.k !== botK && c < r.slide - 400) {
        botK = r.k;
        const list = [];
        for (const b of C.bots) {
          if (b.bal < C.MIN_BET || C.rnd() > .35) continue;
          const bet = Math.min(b.bal, Math.max(C.MIN_BET, Math.round(b.bal * [.02, .05, .1][b.style] * (.5 + C.rnd()) / 10) * 10));
          const tg = [120, 150, 200, 300, 500, 1000, 2000][Math.min(6, C.rint(3 + b.style * 2))];
          b.bal -= bet;
          list.push({ b, bet, target: tg, done: false, cash: 0 });
        }
        botBets.set(r.k, list);
        if (botBets.size > 6) botBets.delete(botBets.keys().next().value);
        C.markLB();
        listSig = '';
      }
      /* every round that has stopped is settled once, in order */
      while (resK < r.k - 1 || (resK < r.k && c >= r.stop)) {
        resK++;
        if (resK >= 0) resolve(round(resK));
      }
    }
    function settle(c) {
      tick(c);
      if (mine) {
        const r = round(mine.k);
        if (c < r.slide) { C.refund(mine.bet); mine = null; }
        else resolve(r);
      }
      for (const [k, list] of botBets) {
        const r = round(k);
        for (const e of list) if (!e.done) {
          e.done = true;
          if (c < r.slide) e.b.bal += e.bet;
          else { const win = r.x >= e.target; e.b.bal += win ? C.payOf(e.bet, e.target) : 0; }
        }
      }
      C.markLB();
    }
    function cardHTML(x) {
      const t = tierOf(x);
      return '<div class="sl-c" style="--c1:' + t[1] + ';--c2:' + t[2] + '">' + SHAPE[t[3]] + '<b class="num">' + C.mxs(x) + '</b></div>';
    }
    function buildStrip(r) {
      strip.innerHTML = r.cards.map(cardHTML).join('');
      strip.classList.remove('done');
      builtK = r.k; lastIdx = -1;
    }
    const cw = () => (strip.firstChild ? strip.firstChild.offsetWidth : 78) + 10;
    function posOf(r, k) {
      /* from a few cards in, sliding left until the stopping card sits
         under the pointer (a little off-centre, the same on every screen) */
      const w = cw(), mid = reel.clientWidth / 2;
      const from = -(4 * w + w / 2 - mid), to = -(WIN_AT * w + (w - 10) / 2 + r.jit * (w - 10) * .7 - mid);
      return from + (to - from) * (1 - Math.pow(1 - k, 3.2));
    }
    function draw(now, dt, c) {
      const r = roundAt(c);
      const phase = c < r.slide ? 'bet' : c < r.stop ? 'run' : 'post';
      /* the history is logic, not decoration: it fills in for rounds that
         stopped while you were at another table */
      while (histK < r.k || (histK === r.k && c >= r.stop)) {
        const hr = round(histK);
        if (histK === 0) hist.innerHTML = '';
        C.pushPill(hist, C.mxs(hr.x), C.mxCls(hr.x), 14);
        histK++;
      }
      if (phase === 'bet') {
        /* between rounds the last round's strip stays where it stopped */
        const pr = r.k > 0 ? round(r.k - 1) : null;
        if (pr && builtK !== pr.k) { buildStrip(pr); strip.classList.add('done'); const w = strip.children[WIN_AT]; if (w) w.classList.add('hit'); }
        if (pr) strip.style.transform = 'translate(' + posOf(pr, 1).toFixed(1) + 'px,-50%)';
        else if (builtK !== -2) { buildStrip(r); builtK = -2; strip.style.transform = 'translate(' + posOf(r, 0).toFixed(1) + 'px,-50%)'; }
        C.setText(sayX, Math.max(0, (r.slide - c) / 1000).toFixed(1) + 's');
        C.setText(sayT, 'Next round in');
        barI.style.width = Math.max(0, Math.min(100, (c - r.start) / BET_MS * 100)) + '%';
        if (lastPhase !== 'bet') { sayX.className = 'x cn num'; sayEl.classList.remove('run'); }
      } else {
        if (builtK !== r.k) buildStrip(r);
        const k = Math.min(1, (c - r.slide) / SLIDE_MS);
        strip.style.transform = 'translate(' + posOf(r, k).toFixed(1) + 'px,-50%)';
        const idx = Math.floor((reel.clientWidth / 2 - posOf(r, k)) / cw());
        if (phase === 'run' && idx !== lastIdx) { if (lastIdx >= 0) C.sfx('csTock'); lastIdx = idx; }
        sayEl.classList.add('run');
        if (phase === 'run') {
          if (lastPhase !== 'run') { sayX.className = 'x cn num'; C.sfx('csLaunch'); }
          C.setText(sayX, C.mxs(r.cards[Math.max(0, Math.min(N - 1, idx))]));
          C.setText(sayT, 'Sliding…');
        } else if (lastPhase !== 'post') {
          strip.classList.add('done');
          const w = strip.children[WIN_AT]; if (w) w.classList.add('hit');
          C.setText(sayX, C.mxs(r.x));
          const b = done && done.k === r.k ? done : null;
          sayX.className = 'x cn num pop' + (b ? (b.cash ? ' w' : ' l') : '');
          C.setText(sayT, b ? (b.cash ? 'You hit ' + C.mxs(b.target) : 'Short of ' + C.mxs(b.target)) : 'Stopped');
          if (!b) C.sfx('csLand', r.x / 100);
          else if (!b.cash) C.sfx('csLose');
        }
      }
      lastPhase = phase;
      paintList(r, c);
      paintBtn(r, c);
    }
    function paintList(r, c) {
      const rows = [];
      const mb = mine && mine.k === r.k ? mine : done && done.k === r.k ? done : null;
      const stopped = c >= r.stop;
      if (mb) rows.push({ n: C.me.name, bet: mb.bet, tg: mb.target, cash: mb.cash, lost: stopped && !mb.cash, me: true });
      for (const e of botBets.get(r.k) || []) rows.push({ n: e.b.name, bet: e.bet, tg: e.target, cash: stopped ? e.cash : 0, lost: stopped && !e.cash });
      rows.sort((a, b) => b.bet - a.bet);
      const sig = r.k + '|' + stopped + '|' + rows.map(x => x.n + x.bet + x.cash).join(',');
      if (sig === listSig) return;
      listSig = sig;
      C.setText(liveN, String(rows.length));
      C.setText(liveT, C.money(rows.reduce((a, x) => a + x.bet, 0)));
      liveRows.innerHTML = rows.length ? rows.map(x => '<div class="cs-lv' + (x.cash ? ' won' : x.lost ? ' lost' : '') + (x.me ? ' me' : '') + '">' +
        '<span class="n">' + C.esc(x.n) + '</span><span class="b num">' + C.money(x.bet) + '</span><span class="c num">' + (x.cash ? C.mxs(x.cash) : x.lost ? 'miss' : C.mxs(x.tg)) + '</span></div>').join('')
        : '<div class="cs-empty">No bets in this round yet.</div>';
    }
    function paintBtn(r, c) {
      let cls = 'cs-go', txt, sub = '', dis = false;
      if (!C.live()) { txt = 'Bet'; dis = true; }
      else if (mine) {
        const mr = round(mine.k);
        if (c < mr.slide) { cls += ' red'; txt = 'Cancel bet'; sub = (mine.k === r.k ? 'In this round' : 'Queued for the next') + ' · target ' + C.mxs(mine.target); }
        else { txt = 'Sliding…'; dis = true; sub = 'Target ' + C.mxs(mine.target); }
      } else txt = c < r.slide - 150 ? 'Bet' : 'Bet next round';
      const sig = cls + txt + sub + dis;
      if (sig === btnSig) return;
      btnSig = sig;
      go.className = cls; go.disabled = dis;
      go.innerHTML = C.esc(txt) + (sub ? '<small class="num">' + C.esc(sub) + '</small>' : '');
      amt.lock(!!mine); tIn.disabled = !!mine;
    }
    return { build, draw, tick, settle, refresh, hotkey: press, busy: () => !!mine,
      /* autobet joins every round at the target set */
      auto: { gap: 250, act(P) { if (!P.tried && !mine) { P.tried = true; press(); } } } };
  }
});
