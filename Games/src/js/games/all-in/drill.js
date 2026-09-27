/* ===================================================== ALL IN: DRILL ===
   Three drills, and you back one of them to get past a depth: set a target
   multiplier, pick the diamond, the circle or the triangle, and all three
   bore down together. Each stops at a depth drawn like Limbo's number, at
   98%: your drill reaching 2× is a 49% shot. The other two are only there
   to show you what might have been. The strata are drawn on a log scale, so
   1× to 100× all fit down the board. */
ALLIN_TABLES.push({
  id: 'drill', name: 'Drill',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="8" y="2.5" width="8" height="5" rx="1.2"/><path d="M7 7.5h10l-2 5.5H9z"/><path d="M9.5 13h5L12 21.5z"/><path d="M10 15.5l4-1M10.8 18l2.6-.8"/></svg>',
  css: `
.dr-board{background:#0b1720}
.dr-board canvas{cursor:pointer}
.dr-picks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dr-pick{height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--rs);border:1px solid var(--ln2);
  transition:background .15s,transform .15s var(--ez),border-color .2s,box-shadow .2s}
.dr-pick svg{width:22px;height:22px}
.dr-pick:hover{background:#244157;transform:translateY(-1px)}
.dr-pick.on{border-color:var(--gd);box-shadow:0 0 0 1px rgba(255,201,63,.4),0 8px 20px -12px rgba(255,201,63,.9)}
.dr-pick:disabled{opacity:.5;cursor:default;transform:none}
.dr-top{position:absolute;left:14px;top:12px;display:flex;flex-direction:column;gap:2px;pointer-events:none}
.dr-top .x{font-size:clamp(22px,3vw,30px);line-height:1;color:#fff}
.dr-top .x.w{color:var(--gr)}.dr-top .x.l{color:var(--rd)}.dr-top .x.pop{animation:csPop .45s var(--sp)}
.dr-top .t{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--mu)}
`,
  bot(C) {
    const t = [150, 200, 300, 500, 1000][C.rint(5)];
    return C.rnd() < 98 / t ? t : 0;
  },
  make(C) {
    const SYM = [
      { n: 'Diamond', c: '#2fd6e8', svg: '<svg viewBox="0 0 24 24"><path d="M12 3l8 9-8 9-8-9z" fill="#2fd6e8"/></svg>' },
      { n: 'Circle', c: '#ffc93f', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#ffc93f"/></svg>' },
      { n: 'Triangle', c: '#1fdc7c', svg: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z" fill="#1fdc7c"/></svg>' }
    ];
    /* the ground, top to bottom */
    const STRATA = [['#5a3d25', '#4a321e'], ['#6b4a2c', '#5a3e25'], ['#4d4f57', '#3f4148'], ['#3a3d47', '#30333c'], ['#2c2a38', '#24222f'], ['#3a1f24', '#4a1c1f']];
    let amt, tIn, kChance, kProfit, go, picks, board, G, xEl, tEl, hist, res;
    let target = 200, pick = 1, anim = null, last = null, parts = [];
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board dr-board"><div class="cs-lhist"></div>' +
        '<div class="dr-top"><div class="x cn num">Pick a drill</div><div class="t">Your drill has to reach the line</div></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const f = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Target multiplier</span></div><input class="cs-in" inputmode="decimal" aria-label="Target multiplier">');
      tIn = f.querySelector('input'); tIn.value = '2.00';
      tIn.addEventListener('change', () => {
        const x = parseFloat(String(tIn.value).replace(/[^0-9.]/g, ''));
        target = isFinite(x) ? Math.round(Math.max(1.01, Math.min(10000, x)) * 100) : target;
        tIn.value = (target / 100).toFixed(2);
        refresh();
      });
      ctl.appendChild(f);
      const pf = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Your drill</span><span class="aux"></span></div>');
      picks = C.mk('div', 'dr-picks', SYM.map((s, i) => '<button class="dr-pick" data-i="' + i + '" aria-label="' + s.n + '">' + s.svg + '</button>').join(''));
      picks.onclick = e => { const b = e.target.closest('.dr-pick'); if (!b || anim) return; pick = +b.dataset.i; refresh(); C.sfx('blip'); G.dirty = true; };
      pf.appendChild(picks); ctl.appendChild(pf);
      kChance = C.kv('Win chance'); kProfit = C.kv('Profit on win', 'g');
      ctl.appendChild(kChance); ctl.appendChild(kProfit);
      go = C.mk('button', 'cs-go', 'Drill'); go.onclick = bet; ctl.appendChild(go);
      ctl.appendChild(C.mk('div', 'cs-note', 'All three drills bore down; only yours counts. If it gets past your target, you are paid the target.'));
      G = C.canvasIn(board);
      board.insertBefore(G.cv, board.firstChild);
      G.cv.addEventListener('click', e => {
        if (anim) return;
        const r = G.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
        const i = x < 1 / 3 ? 0 : x < 2 / 3 ? 1 : 2;
        if (i !== pick) { pick = i; refresh(); C.sfx('blip'); G.dirty = true; }
      });
      xEl = view.querySelector('.dr-top .x'); tEl = view.querySelector('.dr-top .t');
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      refresh();
    }
    function refresh() {
      if (!go) return;
      C.setText(kChance.v, (98 / target * 100).toFixed(target > 98000 ? 5 : 2) + '%');
      C.setText(kProfit.v, '+' + C.money(C.payOf(C.betAmt, target) - C.betAmt));
      picks.querySelectorAll('.dr-pick').forEach(b => { b.classList.toggle('on', +b.dataset.i === pick); b.disabled = !!anim; });
      C.setText(picks.parentNode.querySelector('.aux'), SYM[pick].n);
      tIn.disabled = !!anim;
      if (G) G.dirty = true;
    }
    /* a depth like Limbo's number: 98 / (1 − u), in hundredths */
    const depthOf = () => Math.min(1000000, Math.max(100, Math.floor(98 / (1 - C.rnd()))));
    function bet() {
      if (anim) finish(anim);
      const b = C.takeBet(amt);
      if (!b) return;
      const res3 = [depthOf(), depthOf(), depthOf()];
      const mine = res3[pick];
      const win = mine >= target;
      const top = Math.max(target * 1.5, 300, ...res3.map(v => Math.min(v, target * 4)));
      anim = { bet: b, res3, pick, target, win, mx: win ? target : 0, top, t0: performance.now(),
               dur: res3.map(v => 900 + Math.min(1300, Math.log(v / 100) * 320)), done: false, stopped: [false, false, false] };
      res.hide();
      C.setText(xEl, 'Drilling…'); xEl.className = 'x cn num';
      C.setText(tEl, 'Target ' + C.mxs(target));
      refresh();
    }
    function finish(a) {
      if (!a || a.done) return;
      a.done = true;
      if (anim === a) anim = null;
      last = a;
      const pay = C.payOf(a.bet, a.mx);
      C.credit(pay);
      C.record('drill', a.bet, a.mx, pay);
      C.setText(xEl, C.mxs(a.res3[a.pick]));
      xEl.className = 'x cn num pop ' + (a.win ? 'w' : 'l');
      C.setText(tEl, a.win ? 'Past the line — paid ' + C.mxs(a.mx) : 'Stopped short of ' + C.mxs(a.target));
      C.pushPill(hist, C.mxs(a.res3[a.pick]), a.win ? 'g' : 'r', 6);
      C.sfx(a.win ? 'csCash' : 'csLose', a.mx / 100);
      if (a.win && a.mx >= 1000) { res.show(true, a.mx, pay - a.bet, null, 'Struck it rich'); AIK.burst(C, board, .5, .4); }
      refresh();
      G.dirty = true;
    }
    /* ------------------------------------------------------------ drawing */
    function geom(top) {
      const W = G.W, H = G.H;
      const sky = Math.max(112, H * .21), bottom = H - 26;
      const lg = Math.log(Math.max(200, top) / 100);
      const yOf = m => sky + 18 + (bottom - sky - 18) * Math.min(1, Math.log(Math.max(100, m) / 100) / lg);
      return { W, H, sky, bottom, yOf, xs: [W / 6, W / 2, W * 5 / 6], cw: Math.min(W / 3 - 18, 120) };
    }
    function draw(now, dt) {
      if (!G) return;
      const a = anim || last;
      const busy = !!anim || parts.length;
      if (!busy && !G.dirty) return;
      G.dirty = false;
      const top = a ? a.top : Math.max(target * 1.5, 300);
      const gm = geom(top), g = G.g, { W, H, sky, yOf } = gm;
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      /* the ground: strata getting darker and hotter as they go down */
      const band = (H - sky) / STRATA.length;
      STRATA.forEach(([c1, c2], i) => {
        const y0 = sky + i * band;
        const gr = g.createLinearGradient(0, y0, 0, y0 + band);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2);
        g.fillStyle = gr; g.fillRect(0, y0, W, band + 1);
        g.fillStyle = 'rgba(0,0,0,.12)';
        for (let k = 0; k < 14; k++) {
          const px = ((k * 97 + i * 53) % 100) / 100 * W, py = y0 + ((k * 37 + i * 11) % 100) / 100 * band;
          g.beginPath(); g.ellipse(px, py, 6 + (k % 3) * 4, 3 + (k % 2) * 2, 0, 0, Math.PI * 2); g.fill();
        }
      });
      const glow = g.createLinearGradient(0, H * .75, 0, H);
      glow.addColorStop(0, 'rgba(255,90,40,0)'); glow.addColorStop(1, 'rgba(255,90,40,.28)');
      g.fillStyle = glow; g.fillRect(0, H * .75, W, H * .25);
      /* the surface */
      g.fillStyle = '#0f1f2b'; g.fillRect(0, 0, W, sky);
      g.fillStyle = '#2f5a2a'; g.fillRect(0, sky - 6, W, 8);
      g.fillStyle = '#3f7a37'; g.fillRect(0, sky - 6, W, 3);
      /* depth marks down the side: 1×, 2×, 5×, 10×… */
      g.font = '700 11px ui-sans-serif,system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      for (const m of [150, 200, 300, 500, 1000, 2500, 5000, 10000, 50000, 100000]) {
        if (m > top * 1.02) break;
        const y = yOf(m);
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, Math.round(y), W, 1);
        g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText((m / 100) + '×', 6, y - 7);
      }
      /* the target line */
      const tgt = a ? a.target : target;
      const ty = yOf(tgt);
      g.save(); g.setLineDash([10, 7]); g.strokeStyle = '#ffc93f'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, ty); g.lineTo(W, ty); g.stroke(); g.restore();
      g.fillStyle = '#ffc93f'; C.rrect(g, W - 94, ty - 12, 88, 24, 12); g.fill();
      g.fillStyle = '#2a1a00'; g.font = '800 12px ui-sans-serif,system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('Target ' + C.mxs(tgt), W - 50, ty + 1);
      /* the three drills */
      for (let i = 0; i < 3; i++) {
        const x = gm.xs[i], mine = a ? a.pick === i : pick === i;
        let m = 100, done = false;
        if (a) {
          const k = anim === a ? Math.min(1, (now - a.t0) / a.dur[i]) : 1;
          m = Math.round(100 * Math.pow(a.res3[i] / 100, 1 - Math.pow(1 - k, 3)));
          done = k >= 1;
          if (anim === a && done && !a.stopped[i]) { a.stopped[i] = true; C.sfx('csThunk', mine ? 1 : .5); }
          if (anim === a && !done && Math.random() < .5) dust(x, yOf(m) + 22, mine);
        }
        const y = a ? yOf(m) : gm.sky + 18;
        drawShaft(g, x, gm.sky, y, mine);
        drawRig(g, x, gm.sky, SYM[i], mine);
        drawBit(g, x, y, now, mine, a && anim === a && !done, SYM[i]);
        /* what this drill is showing, riding down with it */
        if (a) {
          const won = m >= tgt;
          const lab = C.mxs(m);
          g.font = 'italic 800 ' + (mine ? 18 : 14) + 'px "Barlow Condensed",ui-sans-serif,sans-serif';
          const tw = g.measureText(lab).width + 16;
          g.fillStyle = mine ? (won ? '#1fdc7c' : done ? '#ff4d68' : '#ffffff') : 'rgba(18,34,46,.92)';
          C.rrect(g, x + 26, y - 12, tw, 24, 12); g.fill();
          g.fillStyle = mine ? (won ? '#05301a' : done ? '#fff' : '#0f1f2b') : '#b1c6d6';
          g.textAlign = 'center';
          g.fillText(lab, x + 26 + tw / 2, y + 1);
        }
      }
      drawParts(g, dt);
      if (anim) {
        const k = Math.max(...anim.dur.map(d => (now - anim.t0) / d));
        const any = anim.dur.some(d => now - anim.t0 < d);
        if (any) C.sfx('csDrill', Math.min(1, k));
        if (!any) finish(anim);
      }
    }
    function drawShaft(g, x, sky, y, mine) {
      if (y <= sky + 4) return;
      g.fillStyle = 'rgba(6,10,14,.78)';
      g.fillRect(x - 13, sky, 26, y - sky);
      g.fillStyle = mine ? 'rgba(255,201,63,.22)' : 'rgba(255,255,255,.06)';
      g.fillRect(x - 13, sky, 3, y - sky); g.fillRect(x + 10, sky, 3, y - sky);
    }
    function drawRig(g, x, sky, S, mine) {
      /* a little derrick over each hole, with its symbol on a badge */
      g.strokeStyle = mine ? '#ffc93f' : '#5d7487'; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x - 24, sky - 4); g.lineTo(x, sky - 52); g.lineTo(x + 24, sky - 4);
      g.moveTo(x - 16, sky - 18); g.lineTo(x + 16, sky - 18); g.moveTo(x - 10, sky - 32); g.lineTo(x + 10, sky - 32); g.stroke();
      const bx = x + 38, by = sky - 20;
      g.fillStyle = mine ? '#2a2408' : '#12222e';
      g.beginPath(); g.arc(bx, by, 14, 0, Math.PI * 2); g.fill();
      g.strokeStyle = mine ? '#ffc93f' : '#2c4a62'; g.lineWidth = 2; g.stroke();
      g.fillStyle = S.c;
      g.save(); g.translate(bx, by);
      if (S.n === 'Diamond') { g.beginPath(); g.moveTo(0, -8); g.lineTo(7, 0); g.lineTo(0, 8); g.lineTo(-7, 0); g.closePath(); g.fill(); }
      else if (S.n === 'Circle') { g.beginPath(); g.arc(0, 0, 6.5, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.moveTo(0, -7); g.lineTo(7.5, 6); g.lineTo(-7.5, 6); g.closePath(); g.fill(); }
      g.restore();
    }
    function drawBit(g, x, y, now, mine, spinning, S) {
      /* the motor block and the spiral bit, its grooves running while it turns */
      g.save(); g.translate(x, y);
      g.fillStyle = mine ? '#ffc93f' : '#8ba3b6';
      C.rrect(g, -15, -26, 30, 16, 4); g.fill();
      g.fillStyle = S.c; g.beginPath(); g.arc(0, -18, 4, 0, Math.PI * 2); g.fill();
      const bg = g.createLinearGradient(-12, 0, 12, 0);
      bg.addColorStop(0, '#6f8394'); bg.addColorStop(.5, '#dfe7ee'); bg.addColorStop(1, '#5a6b78');
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(-12, -10); g.lineTo(12, -10); g.lineTo(0, 22); g.closePath(); g.fill();
      g.save(); g.beginPath(); g.moveTo(-12, -10); g.lineTo(12, -10); g.lineTo(0, 22); g.closePath(); g.clip();
      g.strokeStyle = 'rgba(30,40,50,.55)'; g.lineWidth = 2.2;
      const off = spinning ? (now / 18) % 8 : 0;
      for (let k = -2; k < 7; k++) { const yy = -10 + k * 5.5 + off * .7; g.beginPath(); g.moveTo(-14, yy - 3); g.lineTo(14, yy + 3); g.stroke(); }
      g.restore();
      g.restore();
    }
    function dust(x, y, mine) {
      if (parts.length > 120) return;
      parts.push({ x: x + (Math.random() - .5) * 16, y, vx: (Math.random() - .5) * 160, vy: -Math.random() * 180 - 40, t: 0, life: .5 + Math.random() * .4,
                   s: 2 + Math.random() * 3, c: mine ? '#c8a36a' : '#8a6a44' });
    }
    function drawParts(g, dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        if (p.t > p.life) { parts.splice(i, 1); continue; }
        p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.max(0, 1 - p.t / p.life);
        g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        g.globalAlpha = 1;
      }
    }
    function tick() { if (anim && performance.now() - anim.t0 > Math.max(...anim.dur) + 120) finish(anim); }
    function settle() { if (anim) finish(anim); }
    return { build, draw, tick, settle, refresh, hotkey: bet, busy: () => !!anim,
      auto: { gap: 650, act(P) { if (!P.tried) { P.tried = true; bet(); } } } };
  }
});
