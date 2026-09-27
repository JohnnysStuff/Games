/* ===================================================== ALL IN: CASES ===
   Open a case: a reel of prizes spins past the marker and stops on one. The
   prizes come in six rarities, and each case trades a safe floor for a
   longer shot at the top one; every case returns 98%. The reel is filled
   from the same odds the prize is drawn from, so what spins past is an
   honest picture of what is inside. */
ALLIN_TABLES.push({
  id: 'cases', name: 'Cases', tag: 'NEW',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M3 12.5h18M9 7V5.2A1.2 1.2 0 0110.2 4h3.6A1.2 1.2 0 0115 5.2V7"/><path d="M10.5 12.5v2h3v-2"/></svg>',
  css: `
.ca-board{background:radial-gradient(70% 50% at 50% 46%,rgba(160,125,255,.08),transparent 72%),
  radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%)}
.ca-head{position:absolute;left:0;right:0;top:7%;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}
.ca-head .nm{display:flex;align-items:center;gap:10px;font-size:clamp(24px,3.4vw,34px);line-height:1;color:#fff}
.ca-head .nm svg{width:34px;height:34px;color:var(--cc);filter:drop-shadow(0 0 12px var(--cc))}
.ca-head .t{font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
.ca-win{position:absolute;left:0;right:0;top:25%;text-align:center;pointer-events:none;min-height:40px}
.ca-win .x{font-size:clamp(28px,4vw,40px);line-height:1;color:#fff}
.ca-win .x.pop{animation:csPop .5s var(--sp)}
.ca-reel{position:absolute;left:0;right:0;top:50%;height:clamp(128px,21vh,158px);transform:translateY(-50%);overflow:hidden;
  background:linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.12));border-top:1px solid var(--ln);border-bottom:1px solid var(--ln);
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.ca-strip{position:absolute;left:0;top:10px;bottom:10px;display:flex;gap:8px;will-change:transform}
.ca-it{--c:#8ba3b6;position:relative;flex:none;width:clamp(96px,14vw,124px);height:100%;border-radius:12px;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  background:radial-gradient(90% 70% at 50% 40%,color-mix(in srgb,var(--c) 26%,transparent),transparent 72%),linear-gradient(180deg,#1b3143,#132433);
  border:1px solid rgba(255,255,255,.06);transition:transform .45s var(--sp),opacity .4s,filter .4s}
.ca-it svg{width:46%;height:auto;color:var(--c);filter:drop-shadow(0 6px 12px rgba(0,0,0,.5))}
.ca-it b{font-size:15px;font-weight:800;color:#fff}
.ca-it i{position:absolute;left:0;right:0;bottom:0;height:4px;background:var(--c);box-shadow:0 0 14px var(--c)}
.ca-it.win{transform:scale(1.1);z-index:2;border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 0 36px -4px var(--c)}
.ca-strip.done .ca-it:not(.win){opacity:.35;filter:saturate(.4)}
.ca-mark{position:absolute;left:50%;top:50%;height:calc(clamp(128px,21vh,158px) + 26px);width:3px;margin-left:-1.5px;transform:translateY(-50%);
  background:var(--gd);box-shadow:0 0 14px var(--gd);border-radius:3px;pointer-events:none;z-index:3}
.ca-mark::before,.ca-mark::after{content:"";position:absolute;left:50%;margin-left:-8px;border:8px solid transparent}
.ca-mark::before{top:-3px;border-top-color:var(--gd)}.ca-mark::after{bottom:-3px;border-bottom-color:var(--gd)}
.ca-drops{position:absolute;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.ca-dr{--c:#8ba3b6;padding:8px 4px 7px;border-radius:11px;background:var(--pn2);border:1px solid var(--ln);text-align:center;position:relative;overflow:hidden;
  transition:background .25s,border-color .25s,transform .3s var(--sp)}
.ca-dr::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--c)}
.ca-dr b{display:block;font-size:13.5px;font-weight:800}
.ca-dr span{font-size:10px;font-weight:750;color:var(--mu)}
.ca-dr.off{opacity:.3}
.ca-dr.on{border-color:var(--c);transform:translateY(-4px);background:color-mix(in srgb,var(--c) 16%,var(--pn2))}
@media (max-width:760px){.ca-drops{grid-template-columns:repeat(3,minmax(0,1fr))}}
`,
  bot(C) {
    const T = [[[.52, 40], [.30, 120], [.13, 180], [.04, 300], [.01, 580]],
               [[.55, 20], [.25, 110], [.13, 200], [.05, 350], [.015, 600], [.005, 1400]],
               [[.6, 0], [.22, 120], [.10, 250], [.05, 400], [.025, 600], [.005, 2320]],
               [[.7, 0], [.15, 100], [.09, 250], [.04, 500], [.015, 1300], [.005, 4200]]][C.rint(4)];
    return AIK.pick(C, T.map(t => [t[0], t[1]]));
  },
  make(C) {
    const TIERS = [
      { n: 'Common', c: '#8ba3b6' }, { n: 'Uncommon', c: '#48a8ff' }, { n: 'Rare', c: '#a07dff' },
      { n: 'Epic', c: '#ff5fc8' }, { n: 'Legendary', c: '#ff4d68' }, { n: 'Mythic', c: '#ffc93f' }
    ];
    /* [chance, multiplier in hundredths] per rarity; a case without a rarity
       has none of it */
    const CASES = {
      easy:   { l: 'Starter', cc: '#48a8ff', t: [[.52, 40], [.30, 120], [.13, 180], [.04, 300], [.01, 580]] },
      medium: { l: 'Classic', cc: '#a07dff', t: [[.55, 20], [.25, 110], [.13, 200], [.05, 350], [.015, 600], [.005, 1400]] },
      hard:   { l: 'Elite',   cc: '#ff4d68', t: [[.6, 0], [.22, 120], [.10, 250], [.05, 400], [.025, 600], [.005, 2320]] },
      expert: { l: 'Legend',  cc: '#ffc93f', t: [[.7, 0], [.15, 100], [.09, 250], [.04, 500], [.015, 1300], [.005, 4200]] }
    };
    const ICON = [
      '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="currentColor"/><circle cx="24" cy="24" r="12" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><path d="M24 17v14M20 20.5h6a3 3 0 010 6h-4a3 3 0 000 6h6" stroke="#fff" stroke-opacity=".8" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M14 12h20l8 10-18 18L6 22z" fill="currentColor"/><path d="M6 22h36M24 40l-6-18 6-10 6 10z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/><path d="M14 12l-3 6h7z" fill="#fff" fill-opacity=".5"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M24 4l15 9v22l-15 9-15-9V13z" fill="currentColor"/><path d="M24 4v14M39 13l-15 5-15-5M24 18v26M9 35l15-17 15 17" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/><path d="M13 14l6 2.4-6 7z" fill="#fff" fill-opacity=".45"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M8 36L5 14l10 8 9-13 9 13 10-8-3 22z" fill="currentColor"/><rect x="8" y="37" width="32" height="6" rx="2" fill="currentColor"/><g fill="#fff" fill-opacity=".75"><circle cx="5" cy="13" r="2.6"/><circle cx="24" cy="8" r="3"/><circle cx="43" cy="13" r="2.6"/><circle cx="24" cy="28" r="3.4"/></g></svg>',
      '<svg viewBox="0 0 48 48"><path d="M14 6h20v12a10 10 0 01-20 0z" fill="currentColor"/><path d="M14 10H7a7 7 0 007 9M34 10h7a7 7 0 01-7 9" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M24 28v8" stroke="currentColor" stroke-width="4"/><rect x="14" y="36" width="20" height="7" rx="2" fill="currentColor"/><path d="M19 10v7" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M24 2l5.6 13.2L44 16.4l-10.8 9.6 3.2 14.4L24 33l-12.4 7.4 3.2-14.4L4 16.4l14.4-1.2z" fill="currentColor"/><path d="M24 11l3 7 7.6.6-5.8 5 1.8 7.6L24 27.4l-6.6 3.8 1.8-7.6-5.8-5 7.6-.6z" fill="#fff" fill-opacity=".5"/></svg>'
    ];
    const CASE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.2" fill="currentColor" fill-opacity=".18"/><path d="M3 12.5h18M9 7V5.2A1.2 1.2 0 0110.2 4h3.6A1.2 1.2 0 0115 5.2V7"/><path d="M10.5 12.5v2h3v-2"/></svg>';
    const N = 64, WIN_AT = 56;
    let amt, diffSeg, go, legend, board, reel, strip, headEl, headT, winX, drops, hist, res;
    let diff = 'medium', spin = null, pos = 0, itemW = 110, lastIdx = -1;
    function draw1(d) { return AIK.pick(C, CASES[d].t.map((t, i) => [t[0], i])); }
    function itemHTML(d, ti) {
      const t = CASES[d].t[ti];
      return '<div class="ca-it" style="--c:' + TIERS[ti].c + '">' + ICON[ti] + '<b class="num">' + C.mxs(t[1]) + '</b><i></i></div>';
    }
    function build(view) {
      view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board ca-board"><div class="cs-lhist"></div>' +
        '<div class="ca-head"><div class="nm cn"></div><div class="t">Open it — the marker picks your prize</div></div>' +
        '<div class="ca-win"><div class="x cn num"></div></div>' +
        '<div class="ca-reel"><div class="ca-strip"></div></div><div class="ca-mark"></div><div class="ca-drops"></div></div>';
      const ctl = view.querySelector('.cs-ctl');
      board = view.querySelector('.cs-board');
      amt = C.amountField(); ctl.appendChild(amt.el);
      const df = C.mk('div', 'cs-fld', '<div class="lab"><span class="cap">Case</span><span class="aux num"></span></div>');
      diffSeg = C.seg(Object.keys(CASES).map(d => [d, CASES[d].l]), diff, v => { diff = v; paint(); fill(); });
      df.appendChild(diffSeg.el); ctl.appendChild(df);
      go = C.mk('button', 'cs-go', 'Open case'); go.onclick = open; ctl.appendChild(go);
      legend = C.mk('div', 'ak-pay'); ctl.appendChild(legend);
      ctl.appendChild(C.mk('div', 'cs-note', 'Rarer prizes pay more. The reel is stocked at the real odds, and every case returns 98%.'));
      reel = view.querySelector('.ca-reel'); strip = view.querySelector('.ca-strip');
      headEl = view.querySelector('.ca-head .nm'); headT = view.querySelector('.ca-head .t');
      winX = view.querySelector('.ca-win .x');
      drops = view.querySelector('.ca-drops');
      hist = view.querySelector('.cs-lhist');
      res = AIK.res(C, board);
      paint();
      fill();
    }
    function paint() {
      const K = CASES[diff];
      headEl.innerHTML = CASE_ICON + '<span>' + K.l + ' case</span>';
      headEl.style.setProperty('--cc', K.cc);
      drops.innerHTML = TIERS.map((t, i) => {
        const e = K.t[i];
        return '<div class="ca-dr' + (e ? '' : ' off') + '" style="--c:' + t.c + '"><b class="num">' + (e ? C.mxs(e[1]) : '—') + '</b><span>' + (e ? (e[0] * 100).toFixed(e[0] < .01 ? 1 : 0) + '%' : t.n) + '</span></div>';
      }).join('');
      legend.innerHTML = K.t.map((e, i) => '<div><span style="color:' + TIERS[i].c + '">' + TIERS[i].n + '</span><b class="num">' + C.mxs(e[1]) + '</b></div>').join('');
      C.setText(diffSeg.el.parentNode.querySelector('.aux'), 'top prize ' + C.mxs(K.t[K.t.length - 1][1]));
    }
    /* a reel of random prizes, sitting centred */
    function fill(win) {
      let html = '';
      for (let i = 0; i < N; i++) html += itemHTML(diff, i === WIN_AT && win != null ? win : draw1(diff));
      strip.innerHTML = html;
      strip.classList.remove('done');
      /* layout sizes, not screen ones: the view may still be scaling in */
      const it = strip.firstChild;
      itemW = it ? it.offsetWidth + 8 : 118;
      pos = -(8 * itemW + (itemW - 8) / 2 - reel.clientWidth / 2);
      strip.style.transform = 'translateX(' + pos.toFixed(1) + 'px)';
      lastIdx = -1;
    }
    function open() {
      if (spin) finish(spin);
      const b = C.takeBet(amt);
      if (!b) return;
      const ti = draw1(diff), mx = CASES[diff].t[ti][1];
      fill(ti);
      /* land somewhere on the winning prize, not always dead centre */
      const w = strip.children[WIN_AT];
      const jitter = (C.rnd() - .5) * w.offsetWidth * .72;
      const to = -(w.offsetLeft + w.offsetWidth / 2 - reel.clientWidth / 2 + jitter);
      spin = { bet: b, ti, mx, d: diff, from: pos, to, t0: performance.now(), dur: 3000 + C.rnd() * 500, done: false };
      res.hide();
      C.setText(winX, '');
      [...drops.children].forEach(e => e.classList.remove('on'));
      [...legend.children].forEach(e => e.classList.remove('on'));
      diffSeg.lock(true);
      C.setText(headT, 'Opening…');
      C.sfx('csChip');
    }
    function finish(s) {
      if (!s || s.done) return;
      s.done = true;
      if (spin === s) spin = null;
      pos = s.to;
      strip.style.transform = 'translateX(' + pos.toFixed(1) + 'px)';
      const it = strip.children[WIN_AT];
      if (it) it.classList.add('win');
      strip.classList.add('done');
      const pay = C.payOf(s.bet, s.mx);
      C.credit(pay);
      C.record('cases', s.bet, s.mx, pay);
      const T = TIERS[s.ti];
      winX.innerHTML = '<span style="color:' + T.c + '">' + T.n + '</span> · ' + C.mxs(s.mx);
      winX.classList.remove('pop'); void winX.offsetWidth; winX.classList.add('pop');
      C.setText(headT, (pay - s.bet >= 0 ? '+' : '−') + C.money(Math.abs(pay - s.bet)));
      drops.children[s.ti].classList.add('on');
      if (legend.children[s.ti]) legend.children[s.ti].classList.add('on');
      C.pushPill(hist, C.mxs(s.mx), s.mx >= 100 ? C.mxCls(s.mx) : 'r', 6);
      if (s.ti >= 3) C.sfx('csShine', s.ti);
      if (pay > s.bet) C.sfx('csCash', s.mx / 100); else C.sfx('csLose');
      if (s.ti >= 4) { res.show(true, s.mx, pay - s.bet, null, T.n); AIK.burst(C, board, .5, .5); }
      diffSeg.lock(false);
    }
    function draw(now) {
      if (!spin) return;
      const k = Math.min(1, (now - spin.t0) / spin.dur);
      const e = 1 - Math.pow(1 - k, 4.2);
      pos = spin.from + (spin.to - spin.from) * e;
      strip.style.transform = 'translateX(' + pos.toFixed(1) + 'px)';
      /* a tick for every prize that crosses the marker */
      const idx = Math.floor((reel.clientWidth / 2 - pos) / itemW);
      if (idx !== lastIdx) { if (lastIdx >= 0 && k < .995) C.sfx('csTock'); lastIdx = idx; }
      if (k >= 1) finish(spin);
    }
    function tick() { if (spin && performance.now() - spin.t0 > spin.dur + 80) finish(spin); }
    function settle() { if (spin) finish(spin); }
    return { build, draw, tick, settle, hotkey: open, busy: () => !!spin,
      auto: { gap: 700, act(P) { if (!P.tried) { P.tried = true; open(); } } } };
  }
});
