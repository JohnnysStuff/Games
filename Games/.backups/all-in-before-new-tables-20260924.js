/* ================================================================ ALL IN === */
/* A casino as a party game. Everyone sits down with 1,000 chips, the house
   drips 25 more to everybody every thirty seconds so a bad run is never the
   end, and whoever holds the most when the clock runs out wins.

   Online it is a race like Tetris or Flappy: every player runs their own
   tables and reports a balance, so nobody waits on anybody. The one table that
   is genuinely shared is Crash — every screen flies the same rocket, because
   the crash points come from the match seed and the round timing comes from
   the host's clock, and everybody's bets and cash-outs show up in the same
   live list. Offline, a few house players sit in so the feed and the
   standings have somebody in them. */
registerGame({
  id: 'casino',
  title: 'All In',
  tagline: 'Crash, Mines, Plinko, Chicken, Blackjack and six more tables. Everyone starts with 1,000 chips and the same clock — most chips at the buzzer wins. Up to 8 online.',
  tags: ['Casino', 'Online', 'Versus', 'Party'],
  scoreLabel: 'Chips',
  mp: 'race', mpMin: 2, mpMax: 8,
  front: true,
  controls: [['Bet / cash out', 'Space'], ['Pause', 'Esc']],
  options: [
    { id: 'time', label: 'Match length', def: '5', choices: [
      { v: '2', l: '2 min' }, { v: '5', l: '5 min' }, { v: '10', l: '10 min' },
      { v: '15', l: '15 min' }, { v: '20', l: '20 min' }
    ] },
    { id: 'house', label: 'House players', def: '3', choices: [
      { v: '0', l: 'None', desc: 'Just you against the clock.' },
      { v: '3', l: 'Three', desc: 'Offline only. Online, the table is your friends.' },
      { v: '7', l: 'Seven', desc: 'A full table of eight.' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs>' +
    '<radialGradient id="csArtBg" cx=".72" cy=".1" r="1"><stop offset="0" stop-color="#1d4460"/><stop offset=".55" stop-color="#0f2130"/><stop offset="1" stop-color="#070f16"/></radialGradient>' +
    '<linearGradient id="csArtLine" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1fdc7c"/><stop offset=".7" stop-color="#7dffb8"/><stop offset="1" stop-color="#ffc93f"/></linearGradient>' +
    '<linearGradient id="csArtFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1fdc7c" stop-opacity=".38"/><stop offset="1" stop-color="#1fdc7c" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="csArtGem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9ffd9"/><stop offset=".5" stop-color="#1fdc7c"/><stop offset="1" stop-color="#087a40"/></linearGradient>' +
    '<radialGradient id="csArtChip" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffe38a"/><stop offset="1" stop-color="#e3a514"/></radialGradient>' +
    '</defs><rect width="320" height="180" fill="url(#csArtBg)"/>' +
    '<g stroke="#ffffff" stroke-opacity=".05"><path d="M0 45h320M0 90h320M0 135h320M64 0v180M128 0v180M192 0v180M256 0v180"/></g>' +
    '<g fill="#8fb3cc" fill-opacity=".35"><circle cx="232" cy="120" r="2.4"/><circle cx="220" cy="136" r="2.4"/><circle cx="244" cy="136" r="2.4"/><circle cx="208" cy="152" r="2.4"/><circle cx="232" cy="152" r="2.4"/><circle cx="256" cy="152" r="2.4"/></g>' +
    '<path d="M24 164 C110 160 170 140 214 92 S266 34 286 22 L286 168 L24 168 Z" fill="url(#csArtFill)"/>' +
    '<path d="M24 164 C110 160 170 140 214 92 S266 34 286 22" fill="none" stroke="url(#csArtLine)" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="286" cy="22" r="11" fill="#ffc93f" fill-opacity=".25"/><circle cx="286" cy="22" r="5.5" fill="#fff4c8"/>' +
    '<text x="22" y="104" font-family="Barlow Condensed,ui-sans-serif,system-ui,sans-serif" font-style="italic" font-weight="800" font-size="44" fill="#ffffff">12.84×</text>' +
    '<text x="24" y="122" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="700" font-size="9.5" letter-spacing="2.2" fill="#8ba3b6">CASH OUT +1,184.00</text>' +
    '<g transform="translate(206 134) rotate(-8) scale(.9)"><path d="M-17 -9h34l10 12-27 30-27-30z" fill="url(#csArtGem)"/><path d="M-27 3h54L0 33z" fill="#0b8a47" fill-opacity=".5"/><path d="M-17 -9l6 12 11-12 11 12 6-12M-11 3l11 30 11-30" fill="none" stroke="#eafff3" stroke-opacity=".6" stroke-width="1.3"/></g>' +
    '<g transform="translate(150 146) scale(.8)"><ellipse cx="0" cy="22" rx="24" ry="6" fill="#000" fill-opacity=".35"/>' +
    '<ellipse cx="0" cy="14" rx="22" ry="8" fill="#b3800d"/><ellipse cx="0" cy="10" rx="22" ry="8" fill="url(#csArtChip)"/>' +
    '<ellipse cx="0" cy="4" rx="22" ry="8" fill="#b3800d"/><ellipse cx="0" cy="0" rx="22" ry="8" fill="url(#csArtChip)"/>' +
    '<ellipse cx="0" cy="0" rx="13" ry="4.6" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-dasharray="4 3"/></g>' +
    '</svg>',
  w: 960, h: 600,
  mount(api) {
    /* ------------------------------------------------------------ style ---
       The casino is HTML, not canvas: it is a wall of buttons, inputs and
       numbers that change, and those want real text, real focus and CSS
       transitions. It sits over the stage canvas below the shell's pause and
       results panels (z 5), so Escape and the end card still land on top. */
    const CSS = `
.csino{--bg0:#0a141c;--pn:#12222e;--pn2:#162a38;--rs:#1c3344;--rs2:#23405400;--ln:#20374a;--ln2:#2c4a62;
  --tx:#eaf2f8;--mu:#8ba3b6;--mu2:#5d7487;--gr:#1fdc7c;--gr2:#10b964;--grg:rgba(31,220,124,.35);
  --gd:#ffc93f;--rd:#ff4d68;--bl:#48a8ff;--vi:#a07dff;--or:#ff8a3d;
  --ez:cubic-bezier(.2,.8,.2,1);--sp:cubic-bezier(.34,1.56,.64,1);
  position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;overflow:hidden;
  background:radial-gradient(900px 520px at 78% -12%,rgba(38,94,140,.28),transparent 62%),
             radial-gradient(700px 420px at 8% 110%,rgba(31,220,124,.07),transparent 60%),
             linear-gradient(180deg,#0d1a24,#09131b);
  color:var(--tx);font:500 14px/1.35 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;letter-spacing:.005em}
.csino *{box-sizing:border-box}
:where(.csino) button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
:where(.csino) input,:where(.csino) select{font:inherit;color:inherit}
.csino .num{font-variant-numeric:tabular-nums}
.csino .cn{font-family:"Barlow Condensed",ui-sans-serif,system-ui,sans-serif;font-style:italic;font-weight:800;letter-spacing:.01em}
.csino .cap{font-size:10.5px;font-weight:650;letter-spacing:.13em;text-transform:uppercase;color:var(--mu)}
.csino svg{display:block}

/* ---- top bar ---- */
.cs-top{flex:none;display:flex;align-items:center;gap:10px;padding:10px 14px;
  background:linear-gradient(180deg,rgba(18,34,46,.96),rgba(14,27,37,.92));border-bottom:1px solid var(--ln);
  box-shadow:0 10px 30px -18px rgba(0,0,0,.8);position:relative;z-index:3}
.cs-brand{display:flex;align-items:center;gap:9px;margin-right:auto;min-width:0}
.cs-brand .logo{width:34px;height:34px;flex:none;filter:drop-shadow(0 4px 10px rgba(31,220,124,.35))}
.cs-brand .col{display:flex;flex-direction:column;gap:3px;min-width:0}
.cs-brand b{font-size:23px;line-height:1;white-space:nowrap}
.cs-brand .mode{font-size:11px;color:var(--mu);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-stat{display:flex;align-items:center;gap:9px;padding:6px 13px 6px 9px;border-radius:12px;background:var(--pn);
  border:1px solid var(--ln);min-height:46px;position:relative}
.cs-stat .v{font-size:19px;font-weight:750;line-height:1.05}
.cs-stat .col{display:flex;flex-direction:column;gap:1px}
.cs-ring{width:30px;height:30px;flex:none;transform:rotate(-90deg)}
.cs-ring circle{fill:none;stroke-width:3.4}
.cs-ring .bg{stroke:rgba(255,255,255,.08)}
.cs-ring .fg{stroke:var(--gr);stroke-linecap:round;transition:stroke .3s}
.cs-clock.warn .fg{stroke:var(--gd)}
.cs-clock.hot .fg{stroke:var(--rd)}
.cs-clock.hot .v{color:var(--rd);animation:csPulse 1s ease-in-out infinite}
.cs-bal{min-width:190px;padding-right:16px;background:linear-gradient(180deg,#143042,#112634);border-color:#26506c}
.cs-bal .chip{width:28px;height:28px;flex:none}
.cs-bal .v{font-size:22px;transition:color .5s}
.cs-bal.up .v{color:var(--gr);transition:none}
.cs-bal.down .v{color:var(--rd);transition:none}
.cs-drip .fg{stroke:var(--bl)}
.cs-rank .v{font-size:19px}
.cs-sideBtn{display:none;height:40px;padding:0 13px;border-radius:11px;background:var(--rs);border:1px solid var(--ln2);
  font-weight:700;font-size:13px;align-items:center;gap:7px}
.cs-sideBtn svg{width:17px;height:17px}
.cs-float{position:absolute;right:12px;top:-4px;font-weight:800;font-size:14px;pointer-events:none;white-space:nowrap;
  animation:csFloat 1.25s var(--ez) forwards;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.cs-float.p{color:var(--gr)}.cs-float.n{color:var(--rd)}.cs-float.d{color:var(--bl)}
@keyframes csFloat{0%{opacity:0;transform:translateY(8px) scale(.8)}15%{opacity:1;transform:translateY(0) scale(1.08)}
  70%{opacity:1}100%{opacity:0;transform:translateY(-26px) scale(1)}}
@keyframes csPulse{50%{opacity:.55}}
@media (hover:none) and (pointer:coarse){.cs-top{padding-right:60px}}

/* ---- main grid ---- */
.cs-main{flex:1;min-height:0;display:grid;grid-template-columns:196px minmax(0,1fr) 304px;gap:12px;padding:12px}
.cs-nav{display:flex;flex-direction:column;gap:4px;min-height:0;overflow:auto;padding:6px;border-radius:16px;
  background:var(--pn);border:1px solid var(--ln);scrollbar-width:none}
.cs-nav::-webkit-scrollbar{display:none}
.cs-nav .h{padding:8px 10px 6px}
.cs-nb{position:relative;display:flex;align-items:center;gap:11px;height:42px;padding:0 11px;border-radius:11px;
  color:var(--mu);font-weight:650;font-size:14px;transition:background .18s,color .18s,transform .18s var(--ez);flex:none}
.cs-nb svg{width:20px;height:20px;flex:none;transition:transform .3s var(--sp)}
.cs-nb:hover{background:rgba(255,255,255,.04);color:var(--tx)}
.cs-nb:hover svg{transform:scale(1.12) rotate(-4deg)}
.cs-nb:active{transform:scale(.97)}
.cs-nb.on{background:linear-gradient(90deg,rgba(31,220,124,.16),rgba(31,220,124,.04));color:#fff}
.cs-nb.on::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--gr);
  box-shadow:0 0 12px var(--gr)}
.cs-nb.on svg{color:var(--gr)}
.cs-nb .dot{margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--gd);box-shadow:0 0 10px var(--gd);
  transform:scale(0);transition:transform .3s var(--sp)}
.cs-nb.live .dot{transform:scale(1)}
.cs-nb .tag{margin-left:auto;font-size:9.5px;font-weight:800;letter-spacing:.1em;color:#08131b;background:var(--gd);
  padding:2px 6px;border-radius:5px}
.cs-nb.live .tag{display:none}
.cs-nb .tag.new{background:var(--bl);color:#04121f}

.cs-stagearea{position:relative;min-width:0;min-height:0}
.cs-view{position:absolute;inset:0;display:grid;grid-template-columns:292px minmax(0,1fr);gap:12px;
  opacity:0;visibility:hidden;transform:translateY(10px) scale(.992);transition:opacity .26s var(--ez),transform .32s var(--ez),visibility 0s .26s}
.cs-view.on{opacity:1;visibility:visible;transform:none;transition:opacity .26s var(--ez),transform .32s var(--ez),visibility 0s}
.cs-ctl{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto;padding:14px;border-radius:16px;
  background:var(--pn);border:1px solid var(--ln);scrollbar-width:thin;scrollbar-color:var(--ln2) transparent}
.cs-board{position:relative;min-width:0;min-height:0;border-radius:16px;overflow:hidden;
  background:radial-gradient(120% 90% at 50% 0%,#15293a 0%,#0e1c27 60%,#0b1720 100%);border:1px solid var(--ln);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}

/* ---- controls ---- */
.cs-fld{display:flex;flex-direction:column;gap:6px}
.cs-fld .lab{display:flex;justify-content:space-between;align-items:baseline}
.cs-fld .lab .aux{font-size:12px;color:var(--mu);font-weight:600}
.cs-amt{display:flex;align-items:stretch;height:44px;border-radius:11px;background:var(--bg0);border:1px solid var(--ln2);
  overflow:hidden;transition:border-color .18s,box-shadow .18s}
.cs-amt:focus-within{border-color:var(--gr);box-shadow:0 0 0 3px rgba(31,220,124,.14)}
.cs-amt.bad{animation:csShake .38s;border-color:var(--rd)}
.cs-amt .ic{width:34px;display:flex;align-items:center;justify-content:center;flex:none}
.cs-amt .ic svg{width:18px;height:18px}
.cs-amt input{flex:1;min-width:0;background:none;border:0;outline:0;font-weight:700;font-size:15px;padding:0 2px;
  font-variant-numeric:tabular-nums}
.cs-amt .qb{width:42px;flex:none;border-left:1px solid var(--ln);font-weight:750;font-size:12.5px;color:var(--mu);
  transition:background .15s,color .15s}
.cs-amt .qb:hover{background:rgba(255,255,255,.05);color:var(--tx)}
.cs-amt .qb:active{background:rgba(255,255,255,.1)}
.cs-in{height:40px;border-radius:10px;background:var(--bg0);border:1px solid var(--ln2);padding:0 12px;outline:0;
  font-weight:700;font-variant-numeric:tabular-nums;width:100%;transition:border-color .18s,box-shadow .18s}
.cs-in:focus{border-color:var(--gr);box-shadow:0 0 0 3px rgba(31,220,124,.14)}
.cs-in:disabled{opacity:.55}
.cs-seg{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;border-radius:11px;
  background:var(--bg0);border:1px solid var(--ln2);isolation:isolate}
.cs-seg button{position:relative;z-index:1;height:32px;border-radius:8px;font-size:12.5px;font-weight:700;color:var(--mu);
  transition:color .2s;white-space:nowrap;padding:0 4px}
.cs-seg button.on{color:#fff}
.cs-seg .pill{position:absolute;z-index:0;top:3px;bottom:3px;left:3px;border-radius:8px;background:var(--rs);
  box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.07);transition:transform .32s var(--ez),width .32s var(--ez)}
.cs-seg.lock{opacity:.5;pointer-events:none}
.cs-sel{position:relative}
.cs-sel select{appearance:none;-webkit-appearance:none;width:100%;height:40px;border-radius:10px;background:var(--bg0);
  border:1px solid var(--ln2);padding:0 34px 0 12px;font-weight:700;outline:0;cursor:pointer;transition:border-color .18s}
.cs-sel select:focus{border-color:var(--gr)}
.cs-sel select:disabled{opacity:.55;cursor:default}
.cs-sel::after{content:"";position:absolute;right:14px;top:50%;width:7px;height:7px;border-right:2px solid var(--mu);
  border-bottom:2px solid var(--mu);transform:translateY(-70%) rotate(45deg);pointer-events:none}
.cs-sel option{background:#10202b}
.cs-go{position:relative;height:52px;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:.02em;color:#062313;
  background:linear-gradient(180deg,#39f08f,var(--gr) 55%,var(--gr2));flex:none;overflow:hidden;
  box-shadow:0 10px 26px -10px rgba(31,220,124,.75),inset 0 1px 0 rgba(255,255,255,.45),inset 0 -2px 0 rgba(0,0,0,.14);
  transition:transform .12s var(--ez),box-shadow .2s,filter .2s,background .3s}
.cs-go:hover{filter:brightness(1.07);box-shadow:0 14px 32px -10px rgba(31,220,124,.9),inset 0 1px 0 rgba(255,255,255,.45)}
.cs-go:active{transform:translateY(1px) scale(.985)}
.cs-go::after{content:"";position:absolute;top:0;bottom:0;width:60%;left:-70%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent);transform:skewX(-18deg)}
.cs-go:hover::after{animation:csSheen .9s var(--ez)}
.cs-go:disabled{filter:grayscale(.75) brightness(.72);cursor:default;box-shadow:none;transform:none}
.cs-go.cash{color:#2a1a00;background:linear-gradient(180deg,#ffe07a,var(--gd) 55%,#e9a912);
  box-shadow:0 10px 30px -10px rgba(255,201,63,.85),inset 0 1px 0 rgba(255,255,255,.5);animation:csGlow 1.1s ease-in-out infinite}
.cs-go.red{color:#fff;background:linear-gradient(180deg,#ff7b8f,var(--rd) 60%,#d8324d);box-shadow:0 10px 26px -10px rgba(255,77,104,.8)}
.cs-go small{display:block;font-size:12px;font-weight:700;opacity:.8;margin-top:1px}
@keyframes csSheen{to{left:130%}}
@keyframes csGlow{50%{box-shadow:0 12px 36px -8px rgba(255,201,63,1),inset 0 1px 0 rgba(255,255,255,.5)}}
.cs-btn2{height:38px;border-radius:10px;background:var(--rs);border:1px solid var(--ln2);font-weight:700;font-size:13px;
  transition:background .15s,transform .12s var(--ez)}
.cs-btn2:hover{background:#244157}
.cs-btn2:active{transform:scale(.97)}
.cs-btn2:disabled{opacity:.45;cursor:default}
.cs-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cs-kv{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;background:var(--bg0);
  border:1px solid var(--ln);font-size:13px}
.cs-kv b{font-size:14px}
.cs-kv b.g{color:var(--gr)}
.cs-note{font-size:12px;color:var(--mu);line-height:1.45}
@keyframes csShake{15%,55%{transform:translateX(-5px)}35%,75%{transform:translateX(5px)}}

/* ---- side: standings + feed ---- */
.cs-side{display:flex;flex-direction:column;gap:12px;min-height:0}
.cs-card{border-radius:16px;background:var(--pn);border:1px solid var(--ln);min-height:0;display:flex;flex-direction:column}
.cs-card .hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px}
.cs-card .hd .t{font-weight:800;font-size:13.5px;letter-spacing:.02em;display:flex;align-items:center;gap:7px}
.cs-card .hd .t svg{width:16px;height:16px;color:var(--gd)}
.cs-lb{flex:none}
.cs-lbrows{position:relative;margin:0 8px 10px}
.cs-lr{position:absolute;left:0;right:0;height:46px;display:flex;align-items:center;gap:9px;padding:0 10px;border-radius:11px;
  transition:transform .55s var(--ez),background .3s,opacity .3s;will-change:transform}
.cs-lr.me{background:linear-gradient(90deg,rgba(72,168,255,.16),rgba(72,168,255,.04));box-shadow:inset 0 0 0 1px rgba(72,168,255,.28)}
.cs-lr.left{opacity:.45}
.cs-lr .rk{width:20px;text-align:center;font-weight:800;color:var(--mu);font-size:13px}
.cs-lr.first .rk{color:var(--gd)}
.cs-lr .av{width:30px;height:30px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:12px;color:#fff;position:relative}
.cs-lr .crown{position:absolute;top:-10px;left:50%;width:16px;height:12px;transform:translateX(-50%) rotate(-8deg);color:var(--gd);
  filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));opacity:0;transition:opacity .3s,transform .4s var(--sp)}
.cs-lr.first .crown{opacity:1;transform:translateX(-50%) rotate(-8deg) scale(1)}
.cs-lr .nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cs-lr .nm b{display:flex;align-items:center;gap:6px;min-width:0;font-size:13.5px;font-weight:700}
.cs-lr .nm b .tx{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-lr .nm b i{flex:none;font-style:normal;font-size:9px;font-weight:800;letter-spacing:.08em;padding:1px 5px;border-radius:4px;
  line-height:1.4;background:rgba(72,168,255,.2);color:#9fd0ff}
.cs-lr .nm b i.bot{background:rgba(255,255,255,.08);color:var(--mu)}
.cs-lr .bar{height:3px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden}
.cs-lr .bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--bl),var(--gr));
  transition:width .6s var(--ez)}
.cs-lr .bv{font-weight:750;font-size:13.5px;text-align:right;min-width:78px;transition:color .4s}
.cs-lr .bv.up{color:var(--gr);transition:none}.cs-lr .bv.dn{color:var(--rd);transition:none}
.cs-feed{flex:1;min-height:0}
.cs-tabs{position:relative;display:flex;gap:2px;padding:3px;margin:0 10px 8px;border-radius:10px;background:var(--bg0);border:1px solid var(--ln)}
.cs-tabs button{flex:1;height:28px;border-radius:7px;font-size:12px;font-weight:700;color:var(--mu);transition:color .2s,background .2s}
.cs-tabs button.on{background:var(--rs);color:#fff}
.cs-fhead,.cs-fr{display:grid;grid-template-columns:minmax(0,1fr) 20px 58px 78px;gap:6px;align-items:center;padding:0 14px}
.cs-fhead{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu2);padding-bottom:6px}
.cs-fhead span:nth-child(3),.cs-fhead span:nth-child(4){text-align:right}
.cs-frows{flex:1;min-height:0;overflow:hidden auto;padding-bottom:70px;scrollbar-width:thin;scrollbar-color:var(--ln2) transparent;
  -webkit-mask-image:linear-gradient(180deg,#000 88%,transparent);mask-image:linear-gradient(180deg,#000 88%,transparent)}
.cs-fr{height:34px;font-size:12.5px;border-top:1px solid rgba(255,255,255,.035);animation:csIn .45s var(--ez)}
.cs-fr .who{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-fr .gm{display:flex;align-items:center;justify-content:center;color:var(--mu)}
.cs-fr .gm svg{width:15px;height:15px;flex:none}
.cs-fr.big .gm{color:var(--gd)}
.cs-fr .mx{text-align:right;font-weight:700;color:var(--mu)}
.cs-fr .py{text-align:right;font-weight:750}
.cs-fr.w .mx{color:#cfe}.cs-fr.w .py{color:var(--gr)}.cs-fr.l .py{color:var(--mu2)}
.cs-fr.big{background:linear-gradient(90deg,rgba(255,201,63,.13),transparent 80%)}
.cs-fr.big .mx{color:var(--gd)}
.cs-fr.me .who{color:#9fd0ff}
.cs-feed[data-f="me"] .cs-fr:not(.me),.cs-feed[data-f="big"] .cs-fr:not(.big){display:none}
.cs-empty{padding:18px 14px;color:var(--mu2);font-size:12.5px;text-align:center}
@keyframes csIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}

/* ---- toasts, cover ---- */
.cs-toasts{position:absolute;top:74px;left:50%;transform:translateX(-50%);z-index:6;display:flex;flex-direction:column;gap:8px;
  align-items:center;pointer-events:none;width:min(520px,92%)}
.cs-toast{display:flex;align-items:center;gap:11px;padding:10px 16px 10px 12px;border-radius:14px;
  background:linear-gradient(180deg,rgba(40,33,10,.96),rgba(26,22,8,.96));border:1px solid rgba(255,201,63,.45);
  box-shadow:0 18px 40px -14px rgba(0,0,0,.8),0 0 0 1px rgba(0,0,0,.3),0 0 30px -8px rgba(255,201,63,.45);
  animation:csToast 3.6s var(--ez) forwards;font-size:13.5px;font-weight:600;max-width:100%}
.cs-toast .ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none;
  background:rgba(255,201,63,.18);color:var(--gd)}
.cs-toast .ic svg{width:18px;height:18px}
.cs-toast b{color:var(--gd)}
.cs-toast.me{border-color:rgba(31,220,124,.5);background:linear-gradient(180deg,rgba(10,40,25,.96),rgba(8,26,18,.96));
  box-shadow:0 18px 40px -14px rgba(0,0,0,.8),0 0 30px -8px rgba(31,220,124,.5)}
.cs-toast.me b{color:var(--gr)}.cs-toast.me .ic{background:rgba(31,220,124,.18);color:var(--gr)}
.cs-toast.info{border-color:var(--ln2);background:rgba(18,34,46,.97);box-shadow:0 18px 40px -14px rgba(0,0,0,.8)}
.cs-toast.info b{color:var(--bl)}.cs-toast.info .ic{background:rgba(72,168,255,.16);color:var(--bl)}
@keyframes csToast{0%{opacity:0;transform:translateY(-18px) scale(.94)}8%{opacity:1;transform:translateY(0) scale(1.02)}
  12%{transform:none}86%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-10px) scale(.98)}}
.cs-cover{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;flex-direction:column;
  background:radial-gradient(60% 60% at 50% 45%,rgba(9,19,27,.72),rgba(6,12,18,.94));backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);opacity:0;visibility:hidden;transition:opacity .35s,visibility 0s .35s}
.cs-cover.on{opacity:1;visibility:visible;transition:opacity .35s,visibility 0s}
.cs-count{font-size:clamp(90px,16vw,190px);line-height:.9;color:#fff;text-shadow:0 10px 50px rgba(31,220,124,.45)}
.cs-count.pop{animation:csPop .9s var(--sp)}
.cs-cover .sub{margin-top:14px;font-size:14px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--mu)}
.cs-cover .sub b{color:var(--gr)}
@keyframes csPop{0%{opacity:0;transform:scale(1.9)}30%{opacity:1;transform:scale(.94)}55%{transform:scale(1.03)}100%{transform:scale(1)}}
.cs-end{display:flex;flex-direction:column;align-items:center;gap:6px;width:min(640px,94%)}
.cs-end .ttl{font-size:clamp(56px,9vw,104px);line-height:.9;color:#fff;animation:csPop .8s var(--sp);text-shadow:0 10px 40px rgba(255,201,63,.35)}
.cs-pod{display:flex;align-items:flex-end;justify-content:center;gap:12px;margin-top:22px;width:100%}
.cs-pd{flex:1;max-width:180px;display:flex;flex-direction:column;align-items:center;gap:6px;opacity:0;animation:csRise .7s var(--ez) forwards}
.cs-pd .av{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;
  color:#fff;box-shadow:0 10px 24px -8px rgba(0,0,0,.7)}
.cs-pd .nm{font-weight:750;font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-pd .bv{font-weight:750;color:var(--mu);font-size:13px}
.cs-pd .blk{width:100%;border-radius:12px 12px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:10px;
  font-size:30px;color:rgba(255,255,255,.9);background:linear-gradient(180deg,var(--rs),var(--pn));border:1px solid var(--ln2);border-bottom:0}
.cs-pd.p1 .blk{height:120px;background:linear-gradient(180deg,#5b4a12,#2a2208);border-color:rgba(255,201,63,.55);color:var(--gd)}
.cs-pd.p2 .blk{height:88px}.cs-pd.p3 .blk{height:64px}
.cs-pd.me .nm{color:#9fd0ff}
.cs-end .you{margin-top:18px;font-size:15px;font-weight:700;color:var(--mu)}
.cs-end .you b{color:#fff}
@keyframes csRise{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}

/* ---- game: crash ---- */
.cs-crash{display:flex;flex-direction:column;height:100%}
.cs-hist{flex:none;display:flex;gap:6px;padding:12px 14px 0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);
  mask-image:linear-gradient(90deg,#000 85%,transparent)}
.cs-pl{flex:none;height:26px;padding:0 10px;border-radius:8px;display:flex;align-items:center;font-weight:800;font-size:12.5px;
  background:var(--rs);color:var(--mu);animation:csPill .5s var(--sp)}
.cs-pl.g{background:rgba(31,220,124,.14);color:var(--gr)}.cs-pl.gd{background:rgba(255,201,63,.16);color:var(--gd)}
.cs-pl.r{background:rgba(255,77,104,.12);color:#ff8597}
@keyframes csPill{from{opacity:0;transform:translateX(-14px) scale(.8)}to{opacity:1;transform:none}}
.cs-graph{position:relative;flex:1;min-height:0;margin:8px}
.cs-graph canvas{position:absolute;inset:0;width:100%;height:100%}
.cs-cm{position:absolute;left:0;right:0;top:40%;transform:translateY(-50%);text-align:center;pointer-events:none}
.cs-cm .x{font-size:clamp(54px,9vw,112px);line-height:.9;color:#fff;text-shadow:0 8px 40px rgba(0,0,0,.55);transition:color .2s}
.cs-cm .l{margin-top:8px;font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--mu)}
.cs-cm.bust .x{color:var(--rd);animation:csBust .55s var(--ez)}
.cs-cm.bust .l{color:#ff8597}
.cs-cm.wait .x{font-size:clamp(34px,5vw,56px);color:var(--tx)}
.cs-cm .bar{width:min(300px,60%);height:6px;border-radius:6px;margin:12px auto 0;background:rgba(255,255,255,.08);overflow:hidden}
.cs-cm .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gr),var(--bl));border-radius:6px}
.cs-cm:not(.wait) .bar{visibility:hidden}
@keyframes csBust{0%{transform:scale(1.25)}40%{transform:scale(.94) translateX(-6px)}60%{transform:translateX(6px)}100%{transform:none}}
.cs-board.shake{animation:csShake .45s}
.cs-live{display:flex;flex-direction:column;min-height:0;flex:1;border-radius:12px;background:var(--bg0);border:1px solid var(--ln);overflow:hidden}
.cs-live .lh{display:flex;justify-content:space-between;padding:9px 12px;font-size:12px;font-weight:700;color:var(--mu);border-bottom:1px solid var(--ln)}
.cs-live .lh b{color:var(--tx)}
.cs-live .rows{overflow:auto;min-height:60px;flex:1;scrollbar-width:thin;scrollbar-color:var(--ln2) transparent}
.cs-lv{display:grid;grid-template-columns:minmax(0,1fr) 70px 58px;gap:6px;align-items:center;height:30px;padding:0 12px;font-size:12.5px;
  border-bottom:1px solid rgba(255,255,255,.03);animation:csIn .35s var(--ez);transition:background .3s}
.cs-lv .n{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-lv .b,.cs-lv .c{text-align:right;font-weight:700}
.cs-lv .c{color:var(--mu2)}
.cs-lv.won{background:rgba(31,220,124,.08)}.cs-lv.won .c{color:var(--gr)}
.cs-lv.lost .c,.cs-lv.lost .b{color:#ff8597}
.cs-lv.me .n{color:#9fd0ff}

/* ---- game: mines / tower tiles ---- */
.cs-mboard{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px}
.cs-mgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(6px,1.2vw,12px);width:min(100%,calc(100vh - 230px),560px);aspect-ratio:1}
.cs-t{position:relative;border-radius:clamp(8px,1vw,13px);perspective:600px;cursor:pointer}
.cs-t .f{position:absolute;inset:0;border-radius:inherit;display:flex;align-items:center;justify-content:center;
  transition:transform .5s var(--ez),background .3s,box-shadow .3s,opacity .4s;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.cs-t .fr{background:linear-gradient(180deg,#2a4a62,#203a4e);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 5px 0 #152a38,0 8px 16px -6px rgba(0,0,0,.7)}
.cs-t:hover .fr{transform:translateY(-3px);background:linear-gradient(180deg,#33597a,#274660)}
.cs-t .bk{transform:rotateY(180deg);background:#0c1822;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
.cs-t.rev .fr{transform:rotateY(-180deg)}
.cs-t.rev .bk{transform:rotateY(0)}
.cs-t .bk svg{width:62%;height:62%}
.cs-t.gem .bk{background:radial-gradient(circle at 50% 40%,rgba(31,220,124,.22),#0c1822 70%)}
.cs-t.gem .bk svg{animation:csGemIn .6s var(--sp)}
.cs-t.mine .bk{background:radial-gradient(circle at 50% 50%,rgba(255,77,104,.5),#2a0c14 72%)}
.cs-t.mine.hit .bk{animation:csBoom .6s var(--ez)}
.cs-t.dim{opacity:.4;pointer-events:none}
.cs-t.dim .bk svg{animation:none}
.cs-mgrid.idle .cs-t,.cs-mgrid.done .cs-t{cursor:default}
.cs-mgrid.idle .cs-t:hover .fr{transform:none}
@keyframes csGemIn{0%{transform:scale(.2) rotate(-30deg);opacity:0}60%{transform:scale(1.18) rotate(6deg);opacity:1}100%{transform:none}}
@keyframes csBoom{0%{transform:scale(.6)}35%{transform:scale(1.2);box-shadow:0 0 50px 10px rgba(255,77,104,.7)}100%{transform:none}}
.cs-res{position:absolute;left:50%;top:50%;z-index:3;min-width:170px;padding:14px 22px;border-radius:16px;text-align:center;
  background:rgba(9,20,28,.9);border:2px solid var(--gr);box-shadow:0 20px 50px -10px rgba(0,0,0,.8),0 0 40px -10px var(--gr);
  transform:translate(-50%,-50%) scale(.6);opacity:0;pointer-events:none;transition:transform .45s var(--sp),opacity .25s}
.cs-res.on{transform:translate(-50%,-50%) scale(1);opacity:1}
.cs-res .x{font-size:40px;line-height:1;color:var(--gr)}
.cs-res .p{margin-top:6px;font-weight:750;font-size:14px}
.cs-res.lose{border-color:var(--rd);box-shadow:0 20px 50px -10px rgba(0,0,0,.8),0 0 40px -10px var(--rd)}
.cs-res.lose .x{color:var(--rd)}

/* ---- game: plinko / wheel canvases ---- */
.cs-cv{position:absolute;inset:0;width:100%;height:100%}

/* ---- game: dice ---- */
.cs-dice{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:30px;padding:30px clamp(20px,5vw,70px)}
.cs-dhist{position:absolute;top:14px;right:14px;display:flex;gap:6px}
.cs-dtrack{position:relative;height:74px;padding:25px 24px;border-radius:40px;background:var(--pn2);border:1px solid var(--ln2);
  box-shadow:inset 0 2px 10px rgba(0,0,0,.35)}
.cs-dbar{position:relative;height:12px;border-radius:12px;cursor:pointer}
.cs-dbar .lo,.cs-dbar .hi{position:absolute;top:0;bottom:0;border-radius:12px;transition:width .15s}
.cs-dbar .lo{left:0;background:var(--rd)}.cs-dbar .hi{right:0;background:var(--gr)}
.cs-dbar.under .lo{background:var(--gr)}.cs-dbar.under .hi{background:var(--rd)}
.cs-dhandle{position:absolute;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:9px;cursor:grab;
  background:linear-gradient(180deg,#8fc6ff,var(--bl));box-shadow:0 6px 16px -4px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.6);
  display:flex;align-items:center;justify-content:center;gap:3px;transition:transform .15s var(--sp)}
.cs-dhandle:active{cursor:grabbing;transform:scale(1.1)}
.cs-dhandle i{width:2px;height:13px;border-radius:2px;background:rgba(10,40,70,.5)}
.cs-dmark{position:absolute;bottom:100%;margin-bottom:18px;width:0;transition:left .5s var(--sp);opacity:0}
.cs-dmark.on{opacity:1}
.cs-dmark span{position:absolute;left:50%;bottom:0;transform:translateX(-50%);min-width:74px;height:44px;border-radius:12px;display:flex;
  align-items:center;justify-content:center;font-size:23px;background:#fff;color:#0b1b26;box-shadow:0 12px 26px -8px rgba(0,0,0,.7)}
.cs-dmark span::after{content:"";position:absolute;left:50%;top:100%;border:8px solid transparent;border-top-color:#fff;transform:translateX(-50%)}
.cs-dmark.w span{color:var(--gr2)}.cs-dmark.l span{color:var(--rd)}
.cs-dmark.pop span{animation:csDiceIn .5s var(--sp)}
@keyframes csDiceIn{0%{transform:translateX(-50%) scale(.5) rotate(-12deg)}60%{transform:translateX(-50%) scale(1.12) rotate(4deg)}100%{transform:translateX(-50%)}}
.cs-dticks{position:absolute;left:24px;right:24px;top:100%;margin-top:6px;display:flex;justify-content:space-between;
  font-size:11px;font-weight:700;color:var(--mu2)}
.cs-dfields{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cs-dfields .cs-fld{padding:10px 12px;border-radius:12px;background:var(--pn2);border:1px solid var(--ln)}
.cs-dfields .cs-in{height:36px}
.cs-dfields .cs-btn2{height:36px;font-variant-numeric:tabular-nums}

/* ---- game: limbo ---- */
.cs-limbo{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.cs-limbo .x{font-size:clamp(70px,12vw,150px);line-height:.9;color:#fff;transition:color .2s,text-shadow .3s}
.cs-limbo .x.w{color:var(--gr);text-shadow:0 0 60px rgba(31,220,124,.45)}
.cs-limbo .x.l{color:var(--rd);text-shadow:0 0 50px rgba(255,77,104,.3)}
.cs-limbo .x.pop{animation:csPop .5s var(--sp)}
.cs-limbo .t{font-size:14px;font-weight:700;color:var(--mu)}
.cs-limbo .t b{color:var(--tx)}
.cs-lhist{position:absolute;top:14px;right:14px;display:flex;gap:6px}
.cs-rays{position:absolute;inset:-20%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.035) 0 8deg,transparent 8deg 22deg);
  animation:csSpin 30s linear infinite;pointer-events:none;-webkit-mask-image:radial-gradient(circle,#000 10%,transparent 60%);
  mask-image:radial-gradient(circle,#000 10%,transparent 60%)}
@keyframes csSpin{to{transform:rotate(360deg)}}

/* ---- game: keno ---- */
.cs-keno{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:18px}
.cs-kgrid{display:grid;grid-template-columns:repeat(8,1fr);gap:clamp(5px,.8vw,9px);width:min(100%,640px)}
.cs-k{position:relative;aspect-ratio:1;border-radius:10px;font-weight:800;font-size:clamp(13px,1.5vw,17px);
  background:linear-gradient(180deg,#2a4a62,#203a4e);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 4px 0 #152a38;
  transition:transform .2s var(--ez),background .2s,box-shadow .2s,color .2s;color:#cfe0ee}
.cs-k:hover{transform:translateY(-2px)}
.cs-k.pick{background:linear-gradient(180deg,#b48cff,var(--vi));color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 0 #5b3fb0,0 0 18px -4px var(--vi)}
.cs-k.drawn{background:#0c1822;color:var(--mu2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);animation:csKd .35s var(--sp)}
.cs-k.hit{background:linear-gradient(180deg,#5cf3a5,var(--gr));color:#062313;box-shadow:0 0 22px -2px rgba(31,220,124,.8),0 4px 0 #0b8f4d;animation:csKd .45s var(--sp)}
.cs-k.hit::after{content:"";position:absolute;inset:-3px;border-radius:12px;border:2px solid var(--gr);animation:csRing .7s var(--ez) forwards}
.cs-kgrid.busy .cs-k{pointer-events:none}
@keyframes csKd{0%{transform:scale(.6)}60%{transform:scale(1.12)}100%{transform:none}}
@keyframes csRing{from{opacity:1;transform:scale(.9)}to{opacity:0;transform:scale(1.35)}}
.cs-kpay{display:flex;gap:4px;width:min(100%,640px);overflow:auto hidden;scrollbar-width:none}
.cs-kpay div{flex:1;min-width:52px;border-radius:9px;background:var(--pn2);border:1px solid var(--ln);text-align:center;padding:6px 2px;
  transition:background .25s,border-color .25s,transform .3s var(--sp)}
.cs-kpay div b{display:block;font-size:12.5px}
.cs-kpay div span{font-size:10.5px;color:var(--mu);font-weight:700}
.cs-kpay div.on{background:rgba(31,220,124,.16);border-color:var(--gr);transform:translateY(-3px)}
.cs-ctl .cs-kpay{flex-wrap:wrap;overflow:visible}
.cs-ctl .cs-kpay div{flex:1 1 calc(33% - 4px);min-width:64px}

/* ---- game: hilo & blackjack cards ---- */
.cs-cardc{position:relative;width:var(--cw,110px);height:calc(var(--cw,110px) * 1.42);perspective:900px;flex:none}
.cs-cardc .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s var(--ez)}
.cs-cardc.down .in{transform:rotateY(180deg)}
.cs-cardc .fa,.cs-cardc .ba{position:absolute;inset:0;border-radius:calc(var(--cw,110px) * .09);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.cs-cardc .fa{background:linear-gradient(180deg,#ffffff,#e9eef3);box-shadow:0 12px 26px -10px rgba(0,0,0,.75);color:#1b2530;
  display:flex;flex-direction:column;justify-content:space-between;padding:calc(var(--cw,110px) * .08)}
.cs-cardc .fa.red{color:#e0344f}
.cs-cardc .fa .r{font-size:calc(var(--cw,110px) * .3);line-height:.9}
.cs-cardc .fa .s{width:calc(var(--cw,110px) * .22);height:calc(var(--cw,110px) * .22)}
.cs-cardc .fa .big{position:absolute;right:12%;bottom:10%;width:44%;height:44%;opacity:.95}
.cs-cardc .ba{transform:rotateY(180deg);background:repeating-linear-gradient(45deg,#2a64a8 0 6px,#23579a 6px 12px);
  box-shadow:0 12px 26px -10px rgba(0,0,0,.75),inset 0 0 0 4px #fff,inset 0 0 0 6px #1d4d8a}
.cs-cardc.deal{animation:csDeal .5s var(--ez) both}
@keyframes csDeal{from{opacity:0;transform:translate(var(--dx,160px),var(--dy,-160px)) rotate(18deg) scale(.8)}to{opacity:1;transform:none}}
.cs-hilo{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px}
.cs-hmain{display:flex;align-items:center;gap:clamp(14px,3vw,40px)}
.cs-hside{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--mu);text-align:center;min-width:90px}
.cs-hside b{font-size:18px;color:var(--tx)}
.cs-hside svg{width:26px;height:26px}
.cs-hstrip{display:flex;gap:8px;max-width:100%;overflow:auto hidden;padding:8px 4px 4px;scrollbar-width:none;--cw:52px}
.cs-hstrip .st{position:relative;flex:none}
.cs-hstrip .st .tg{position:absolute;left:50%;top:-8px;transform:translateX(-50%);font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:5px;
  background:var(--rs);color:var(--mu);white-space:nowrap}
.cs-hstrip .st.w .tg{background:var(--gr);color:#062313}.cs-hstrip .st.l .tg{background:var(--rd);color:#fff}
.cs-guess{display:grid;gap:8px}
.cs-guess .cs-btn2{height:50px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;font-size:13px}
.cs-guess .cs-btn2 b{white-space:nowrap}
.cs-guess .cs-btn2 span{font-size:11.5px;color:var(--mu);white-space:nowrap}
.cs-guess .cs-btn2 svg{width:18px;height:18px}
.cs-bj{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-around;align-items:center;padding:16px;
  background:radial-gradient(90% 70% at 50% 55%,rgba(23,120,86,.35),transparent 70%)}
.cs-bjrow{display:flex;flex-direction:column;align-items:center;gap:10px;min-height:calc(var(--cw) * 1.42 + 34px)}
.cs-bjhands{display:flex;gap:28px;justify-content:center}
.cs-bjhand{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px;border-radius:14px;transition:background .3s,box-shadow .3s}
.cs-bjhand.act{background:rgba(255,255,255,.04);box-shadow:0 0 0 1px rgba(255,201,63,.45)}
.cs-bjcards{display:flex;min-height:calc(var(--cw) * 1.42)}
.cs-bjcards .cs-cardc+.cs-cardc{margin-left:calc(var(--cw) * -.52)}
.cs-bjv{min-width:44px;height:26px;padding:0 10px;border-radius:13px;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:13px;background:var(--rs);border:1px solid var(--ln2);transition:background .3s,color .3s}
.cs-bjv.w{background:var(--gr);color:#062313;border-color:transparent}.cs-bjv.l{background:var(--rd);color:#fff;border-color:transparent}
.cs-bjv.p{background:var(--gd);color:#2a1a00;border-color:transparent}
.cs-bjlabel{font-size:11px;font-weight:800;letter-spacing:.2em;color:rgba(255,255,255,.35)}
.cs-bjbtns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cs-bjbtns .cs-btn2{height:44px;font-size:14px}

/* ---- game: dragon tower ---- */
.cs-tower{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:14px}
.cs-tgrid{display:flex;flex-direction:column-reverse;gap:clamp(4px,.7vh,8px);width:min(100%,580px);height:100%;max-height:640px;padding-left:60px}
.cs-trow{flex:1;display:grid;gap:clamp(5px,.8vw,9px);position:relative;border-radius:12px;padding:3px;transition:background .3s,box-shadow .3s}
.cs-trow.act{background:rgba(255,201,63,.07);box-shadow:0 0 0 1px rgba(255,201,63,.4)}
.cs-trow .ml{position:absolute;right:calc(100% + 8px);top:50%;transform:translateY(-50%);font-size:11.5px;font-weight:800;color:var(--mu2);
  white-space:nowrap;transition:color .3s}
.cs-trow.act .ml{color:var(--gd)}.cs-trow.past .ml{color:var(--gr)}
.cs-trow .cs-t{min-height:0}
.cs-trow .cs-t .bk svg{width:50%;height:70%}
.cs-trow .cs-t.gem .bk{background:radial-gradient(circle at 50% 45%,rgba(255,201,63,.28),#0c1822 70%)}
.cs-tgrid.idle .cs-t{cursor:default}
.cs-trow:not(.act) .cs-t:not(.rev){cursor:default}
.cs-trow:not(.act) .cs-t:not(.rev) .fr{filter:brightness(.72)}
.cs-trow:not(.act) .cs-t:hover .fr{transform:none}

/* ---- layout breakpoints ---- */
@media (max-width:1280px){.cs-main{grid-template-columns:62px minmax(0,1fr) 284px}
  .cs-nb{justify-content:center;padding:0}.cs-nb span,.cs-nb .tag,.cs-nav .h{display:none}.cs-nb .dot{position:absolute;right:8px;top:8px}
  .cs-view{grid-template-columns:268px minmax(0,1fr)}}
@media (max-width:1040px){.cs-main{grid-template-columns:62px minmax(0,1fr)}
  .cs-side{position:absolute;top:0;right:0;bottom:0;z-index:5;width:min(330px,92vw);padding:12px;background:rgba(9,18,25,.97);
    border-left:1px solid var(--ln);box-shadow:-20px 0 50px -20px rgba(0,0,0,.9);transform:translateX(105%);transition:transform .35s var(--ez)}
  .csino.side .cs-side{transform:none}
  .cs-sideBtn{display:inline-flex}.cs-rank{display:none}}
@media (max-width:760px){
  .cs-top{flex-wrap:wrap;gap:8px;padding:8px 10px}.cs-brand .mode{display:none}.cs-brand b{font-size:20px}
  .cs-stat{min-height:40px;padding:4px 10px 4px 7px}.cs-stat .v{font-size:16px}.cs-bal{min-width:0;flex:1}.cs-bal .v{font-size:18px}
  .cs-drip{display:none}.cs-ring{width:24px;height:24px}
  .cs-main{display:flex;flex-direction:column;overflow:auto;padding:8px;gap:8px}
  .cs-nav{flex-direction:row;flex:none;overflow:auto hidden;padding:4px}.cs-nb{width:48px;height:42px}
  .cs-stagearea{flex:none;height:auto}
  .cs-view{position:relative;display:none;grid-template-columns:1fr;grid-template-rows:auto auto}
  .cs-view.on{display:grid}
  .cs-board{order:-1;height:min(64vh,520px)}
  .cs-ctl{overflow:visible}
  .cs-dfields{grid-template-columns:1fr}
  .cs-trow .ml{display:none}.cs-tgrid{padding-left:0}}

/* ---- the front page: the lobby before a match ---- */
.cs-fp{overflow:auto;scrollbar-width:none}
.cs-fp::-webkit-scrollbar{display:none}
.cs-fp .fp-chart{position:absolute;left:0;right:0;bottom:0;width:100%;height:76%;pointer-events:none;opacity:.5}
.cs-fp .fp-chart .ar{fill:url(#fpFill);opacity:0;animation:fpArea 7s var(--ez) infinite}
.cs-fp .fp-chart .ln{fill:none;stroke:url(#fpLine);stroke-width:3;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;
  animation:fpLine 7s var(--ez) infinite;filter:drop-shadow(0 0 7px rgba(31,220,124,.6))}
@keyframes fpLine{0%{stroke-dashoffset:1;opacity:1}62%,80%{stroke-dashoffset:0;opacity:1}94%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes fpArea{0%,24%{opacity:0}62%,80%{opacity:1}94%,100%{opacity:0}}
.cs-fp .fp-chips{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cs-fp .fp-chip{position:absolute;left:var(--x);bottom:-70px;width:calc(46px * var(--s));height:calc(46px * var(--s));opacity:0;
  animation:fpChip 12s linear infinite;animation-delay:var(--d);filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.cs-fp .fp-chip svg{width:100%;height:100%}
@keyframes fpChip{0%{transform:translateY(0) rotate(0);opacity:0}12%{opacity:.42}78%{opacity:.3}100%{transform:translateY(-820px) rotate(320deg);opacity:0}}
.cs-fp .fp-in{position:relative;z-index:1;width:min(1120px,100%);margin:0 auto;min-height:100%;display:flex;flex-direction:column;
  gap:14px;padding:18px 22px 12px;transition:opacity .17s,transform .2s var(--ez)}
.cs-fp.go .fp-in{opacity:0;transform:scale(.985)}
.cs-fp .fp-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;animation:csIn .5s var(--ez) backwards}
.cs-fp .fp-hd .cs-brand .logo{width:46px;height:46px;animation:fpSpin 1s .05s var(--sp) backwards}
@keyframes fpSpin{from{transform:rotate(-220deg) scale(.4);opacity:0}}
.cs-fp .fp-hd .cs-brand b{font-size:31px}
.cs-fp .fp-fr{display:flex;align-items:center;gap:9px;height:42px;padding:0 16px 0 13px;border-radius:12px;background:var(--rs);
  border:1px solid var(--ln2);font-weight:750;font-size:13.5px;white-space:nowrap;
  transition:background .15s,transform .15s var(--ez),border-color .15s}
.cs-fp .fp-fr svg{width:19px;height:19px;color:var(--bl)}
.cs-fp .fp-fr:hover{background:#244157;border-color:#3a6284;transform:translateY(-1px)}
.cs-fp .fp-fr:active{transform:scale(.97)}
.cs-fp .fp-main{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start;align-content:center}
.cs-fp .fp-left{display:flex;flex-direction:column;gap:13px;min-width:0}
.cs-fp .fp-h{margin:2px 0 0;font-size:clamp(40px,5.4vw,66px);line-height:.92;color:#fff;text-transform:uppercase}
.cs-fp .fp-h span,.cs-fp .fp-h em{display:inline-block;animation:csRise .7s var(--ez) backwards}
.cs-fp .fp-h span:nth-child(2){animation-delay:.08s}
.cs-fp .fp-h em{font-style:inherit;color:var(--gr);animation-delay:.16s;text-shadow:0 0 34px rgba(31,220,124,.45)}
.cs-fp .fp-p{margin:0;max-width:580px;color:var(--mu);font-size:14.5px;line-height:1.5;font-weight:550;animation:csRise .7s .22s var(--ez) backwards}
.cs-fp .fp-p b{color:#fff}
.cs-fp .fp-tables{animation:csRise .7s .3s var(--ez) backwards}
.cs-fp .fp-tbl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:2px 12px 12px}
.cs-fp .fp-t{position:relative;display:flex;align-items:center;gap:10px;height:46px;padding:0 11px;border-radius:11px;min-width:0;
  background:rgba(255,255,255,.025);border:1px solid var(--ln);color:var(--mu);font-weight:700;font-size:13.5px;text-align:left;
  animation:fpPop .5s var(--sp) backwards;animation-delay:calc(.42s + var(--i) * .035s);
  transition:background .18s,color .18s,border-color .18s,transform .18s var(--ez),box-shadow .2s}
.cs-fp .fp-t svg{width:20px;height:20px;flex:none;transition:transform .3s var(--sp),color .18s}
.cs-fp .fp-t span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-fp .fp-t .tag{margin-left:auto;flex:none;font-size:9px;font-weight:800;letter-spacing:.1em;color:#08131b;background:var(--gd);padding:2px 5px;border-radius:5px}
.cs-fp .fp-t .tag.new{background:var(--bl);color:#04121f}
.cs-fp .fp-t:hover{background:rgba(255,255,255,.05);color:var(--tx);transform:translateY(-2px)}
.cs-fp .fp-t:hover svg{transform:scale(1.14) rotate(-6deg)}
.cs-fp .fp-t:active{transform:scale(.97)}
.cs-fp .fp-t.on{background:linear-gradient(180deg,rgba(31,220,124,.17),rgba(31,220,124,.05));border-color:rgba(31,220,124,.55);color:#fff;
  box-shadow:0 0 0 1px rgba(31,220,124,.22),0 10px 24px -14px rgba(31,220,124,.85)}
.cs-fp .fp-t.on svg{color:var(--gr)}
@keyframes fpPop{from{opacity:0;transform:translateY(10px) scale(.92)}}
.cs-fp .fp-set{animation:fpSlide .7s .16s var(--ez) backwards}
@keyframes fpSlide{from{opacity:0;transform:translateX(26px)}}
.cs-fp .fp-mode{text-transform:none;letter-spacing:.02em;font-size:11.5px}
.cs-fp .fp-body{display:flex;flex-direction:column;gap:14px;padding:4px 14px 14px}
.cs-fp .fp-rules{list-style:none;margin:0;padding:11px 12px;border-radius:12px;background:var(--bg0);border:1px solid var(--ln);
  display:flex;flex-direction:column;gap:9px}
.cs-fp .fp-rules li{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--mu)}
.cs-fp .fp-rules b{color:#fff}
.cs-fp .fp-rules .ic{width:24px;height:24px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:7px}
.cs-fp .fp-rules .ic svg{width:22px;height:22px}
.cs-fp .fp-rules .ic.dr{background:rgba(72,168,255,.14);color:var(--bl)}
.cs-fp .fp-rules .ic.dr svg{width:14px;height:14px}
.cs-fp .fp-rules .ic.tr{background:rgba(255,201,63,.14);color:var(--gd)}
.cs-fp .fp-rules .ic.tr svg{width:15px;height:12px}
.cs-fp .fp-seat{height:60px;font-size:19px;animation:fpBreathe 2.4s ease-in-out infinite}
.cs-fp .fp-seat .l{display:block}
.cs-fp .fp-seat:disabled{animation:none}
@keyframes fpBreathe{50%{box-shadow:0 14px 36px -8px rgba(31,220,124,.95),inset 0 1px 0 rgba(255,255,255,.45)}}
.cs-fp .fp-best{text-align:center;font-size:12px;font-weight:650;color:var(--mu)}
.cs-fp .fp-best b{color:var(--gd)}
.cs-fp .fp-foot{display:flex;justify-content:center;gap:24px;padding-top:2px;color:var(--mu2);font-size:10px;animation:csIn .5s .6s var(--ez) backwards}
.cs-fp .fp-foot b{color:var(--mu);font-weight:800;margin-right:5px}
@media (max-width:900px){.cs-fp .fp-main{grid-template-columns:1fr}.cs-fp .fp-tbl{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:560px){.cs-fp .fp-tbl{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-fp .fp-foot{display:none}}
`;

    /* ============================================================ setup === */
    const R = getRace('casino');
    const ONLINE = !!R;
    const optOf = (id, def) => {
      const v = ONLINE ? (R.cfg && R.cfg[id]) : api.opt(id);
      return v == null || v === '' ? def : v;
    };
    const MINUTES = Math.max(1, +optOf('time', '5') || 5);
    const MATCH_MS = MINUTES * 60000;
    const HOUSE = ONLINE ? 0 : Math.max(0, Math.min(7, parseInt(optOf('house', '3'), 10) || 0));

    /* Everything that is money is an integer number of cents. A float balance
       drifts a hundredth at a time over a few hundred Plinko balls, and a
       leaderboard that disagrees with itself by a cent is a leaderboard
       nobody trusts. */
    const START = 100000;                // 1,000.00
    const DRIP = 2500, DRIP_MS = 30000;  // +25.00 every thirty seconds
    const MIN_BET = 10;                  // 0.10
    const COUNT_MS = 3600;               // the 3-2-1 before the first bet
    const SEED = ONLINE ? ((R.seed >>> 0) || 1) : ((Math.random() * 4294967296) >>> 0);
    const MY_ID = ONLINE ? R.me : 'me';
    const HOST_ID = ONLINE ? (R.cfg.host || null) : MY_ID;
    const AM_HOST = !ONLINE || HOST_ID === MY_ID;

    const mk = (tag, cls, html) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    /* Outcomes come from the browser's cryptographic generator, not
       Math.random: nobody should be able to read the next roll off a seed. */
    const u32 = new Uint32Array(1);
    const rnd = () => { try { crypto.getRandomValues(u32); return u32[0] / 4294967296; } catch (e) { return Math.random(); } };
    const rint = n => Math.floor(rnd() * n);
    const money = c => {
      c = Math.round(c);
      const s = c < 0 ? '−' : '';
      c = Math.abs(c);
      return s + Math.floor(c / 100).toLocaleString('en-US') + '.' + String(c % 100).padStart(2, '0');
    };
    const mxs = x => (x / 100).toFixed(2) + '×';       // x is a multiplier in hundredths
    const payOf = (bet, x) => Math.floor(bet * x / 100);
    const hueOf = s => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
    const initials = s => String(s || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
    const sfx = (n, a) => { try { const f = api.sound && api.sound[n]; if (f) f.call(api.sound, a); } catch (e) {} };
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeOut4 = t => 1 - Math.pow(1 - t, 4);

    /* ---------------------------------------------------------- icons --- */
    const SV = (vb, body, extra) => '<svg viewBox="' + vb + '"' + (extra || ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '>' + body + '</svg>';
    const I = {
      logo: '<svg class="logo" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="url(#csChipG)"/><circle cx="20" cy="20" r="18" fill="none" stroke="#0b8a47" stroke-width="1.5"/>' +
            '<g stroke="#eafff3" stroke-width="3.6" stroke-linecap="round"><path d="M20 3v5M20 32v5M3 20h5M32 20h5M8 8l3.5 3.5M28.5 28.5L32 32M8 32l3.5-3.5M28.5 11.5L32 8"/></g>' +
            '<circle cx="20" cy="20" r="10.5" fill="#0d2a1c" stroke="#7dffb8" stroke-width="1.4"/><path d="M15.5 24.5l4.5-10 4.5 10M17.2 21h5.6" fill="none" stroke="#7dffb8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      chip: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="url(#csGoldG)"/><circle cx="16" cy="16" r="14" fill="none" stroke="#a87708" stroke-width="1.4"/>' +
            '<g stroke="#fff7d8" stroke-width="3" stroke-linecap="round"><path d="M16 2.8v3.6M16 25.6v3.6M2.8 16h3.6M25.6 16h3.6M6.7 6.7l2.5 2.5M22.8 22.8l2.5 2.5M6.7 25.3l2.5-2.5M22.8 9.2l2.5-2.5"/></g>' +
            '<circle cx="16" cy="16" r="8" fill="#ffd968" stroke="#c28f12" stroke-width="1.3"/></svg>',
      crash: SV('0 0 24 24', '<path d="M3 20.5h18"/><path d="M4 17c6.5-.4 10.4-4.3 12.6-10.6"/><path d="M13.3 6.1l3.4-.3.9 3.3"/>'),
      mines: SV('0 0 24 24', '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M12 20L8.4 9 12 4l3.6 5z"/>'),
      plinko: SV('0 0 24 24', '<g fill="currentColor" stroke="none"><circle cx="12" cy="4.5" r="1.7"/><circle cx="8" cy="9.5" r="1.7"/><circle cx="16" cy="9.5" r="1.7"/><circle cx="4" cy="14.5" r="1.7"/><circle cx="12" cy="14.5" r="1.7"/><circle cx="20" cy="14.5" r="1.7"/></g><path d="M3 20h18"/>'),
      dice: SV('0 0 24 24', '<rect x="4" y="4" width="16" height="16" rx="4"/><g fill="currentColor" stroke="none"><circle cx="9" cy="9" r="1.4"/><circle cx="15" cy="15" r="1.4"/><circle cx="15" cy="9" r="1.4"/><circle cx="9" cy="15" r="1.4"/><circle cx="12" cy="12" r="1.4"/></g>'),
      limbo: SV('0 0 24 24', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><path d="M16.5 7.5L21 3M18 3h3v3"/>'),
      keno: SV('0 0 24 24', '<rect x="3" y="3" width="18" height="18" rx="3"/><g fill="currentColor" stroke="none"><circle cx="8.5" cy="8.5" r="1.9"/><circle cx="15.5" cy="12" r="1.9"/><circle cx="9.5" cy="15.8" r="1.9"/></g>'),
      wheel: SV('0 0 24 24', '<circle cx="12" cy="13" r="8.5"/><path d="M12 4.5v17M3.5 13h17M6 7l12 12M18 7L6 19"/><path d="M9.8 1.5h4.4L12 4.6z" fill="currentColor"/>'),
      hilo: SV('0 0 24 24', '<rect x="2.5" y="4" width="11" height="16" rx="2.2"/><path d="M17.5 8l2.5-3 2.5 3M20 5v5.5M17.5 16l2.5 3 2.5-3M20 19v-5.5"/>'),
      blackjack: SV('0 0 24 24', '<rect x="9" y="3" width="12" height="16.5" rx="2.2"/><path d="M6.3 6.2l-2.2.7A2 2 0 002.7 9.4l2.7 9.9a2 2 0 002.4 1.4l4.3-1.2"/><path d="M12.6 14.4L15 8.2l2.4 6.2M13.4 12.4h3.2"/>'),
      chicken: SV('0 0 24 24', '<path d="M6.5 20.5C4 19.4 2.5 16.8 2.5 14c0-4.2 3.3-7.4 7.6-7.4.5-2.3 2.4-4.1 4.7-4.1 2.6 0 4.7 2.1 4.7 4.7v.9l2.5 1.3-2.6 1.2c-.5 5.6-4 9.9-9.4 9.9z"/><circle cx="15.6" cy="6.4" r="1" fill="currentColor" stroke="none"/><path d="M8.5 20.5v2M12.5 20.5v2"/>'),
      tower: SV('0 0 24 24', '<rect x="4.5" y="15" width="15" height="6" rx="1.6"/><rect x="6.5" y="9" width="11" height="6" rx="1.6"/><rect x="8.5" y="3" width="7" height="6" rx="1.6"/>'),
      trophy: SV('0 0 24 24', '<path d="M7 4h10v5a5 5 0 01-10 0V4z" fill="currentColor"/><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8"/>'),
      bolt: SV('0 0 24 24', '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/>'),
      crown: '<svg class="crown" viewBox="0 0 24 18"><path d="M2 16h20l2-12-6.5 5L12 1 6.5 9 0 4z" fill="currentColor"/></svg>',
      users: SV('0 0 24 24', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 016 5.3"/>'),
      gem: '<svg viewBox="0 0 64 64"><path d="M17 10h30l13 16-28 31L4 26z" fill="url(#csGemG)"/><path d="M4 26h56L32 57z" fill="#0b8a47" fill-opacity=".45"/>' +
           '<path d="M17 10l7 16 8-16 8 16 7-16M24 26l8 31 8-31" fill="none" stroke="#eafff3" stroke-opacity=".6" stroke-width="1.6" stroke-linejoin="round"/><path d="M18 13l-7 9h9z" fill="#fff" fill-opacity=".55"/></svg>',
      bomb: '<svg viewBox="0 0 64 64"><circle cx="29" cy="37" r="19" fill="url(#csBombG)"/><path d="M41 22l7-7" stroke="#8a7a66" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M49 12l3-4M53 16l5-1M48 8l1-5" stroke="#ffc93f" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="29" r="5.5" fill="#fff" fill-opacity=".32"/></svg>',
      egg: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="37" rx="18" ry="23" fill="url(#csEggG)"/><ellipse cx="25" cy="27" rx="5" ry="8.5" fill="#fff" fill-opacity=".5"/>' +
           '<path d="M16 40l6-4 5 5 6-5 5 5 6-5 5 3" fill="none" stroke="#b07a00" stroke-opacity=".5" stroke-width="2"/></svg>',
      skull: '<svg viewBox="0 0 64 64"><path d="M32 7C19 7 10 16 10 28c0 7 3 12 8 15v9h28v-9c5-3 8-8 8-15C54 16 45 7 32 7z" fill="#e9edf2"/>' +
             '<circle cx="23" cy="30" r="6.5" fill="#2a0c14"/><circle cx="41" cy="30" r="6.5" fill="#2a0c14"/><path d="M28.5 43l3.5-6 3.5 6z" fill="#2a0c14"/>' +
             '<path d="M25 52v-6M31 52v-6M37 52v-6" stroke="#2a0c14" stroke-width="2.2"/></svg>',
      up: SV('0 0 24 24', '<path d="M12 19V5M5 12l7-7 7 7"/>'),
      down: SV('0 0 24 24', '<path d="M12 5v14M5 12l7 7 7-7"/>'),
      eq: SV('0 0 24 24', '<path d="M5 9h14M5 15h14"/>')
    };
    const SUIT = [
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8 7 3 9.5 3 14a4.5 4.5 0 008 2.8L9.5 22h5L13 16.8A4.5 4.5 0 0021 14c0-4.5-5-7-9-12z"/></svg>',
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-8.5-5.4-8.5-11.4A4.9 4.9 0 0112 6.8a4.9 4.9 0 018.5 2.8C20.5 15.6 12 21 12 21z"/></svg>',
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l8 10-8 10-8-10z"/></svg>',
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a4.6 4.6 0 00-4.4 5.9A4.6 4.6 0 1010.6 16L9.5 22h5l-1.1-6a4.6 4.6 0 102.9-8.1A4.6 4.6 0 0012 2z"/></svg>'
    ];
    const DEFS =
      '<linearGradient id="csChipG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#48f29a"/><stop offset="1" stop-color="#0c9a51"/></linearGradient>' +
      '<radialGradient id="csGoldG" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#ffe895"/><stop offset="1" stop-color="#e2a312"/></radialGradient>' +
      '<linearGradient id="csGemG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9ffd9"/><stop offset=".5" stop-color="#1fdc7c"/><stop offset="1" stop-color="#087a40"/></linearGradient>' +
      '<radialGradient id="csBombG" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#5a3440"/><stop offset=".55" stop-color="#2a1018"/><stop offset="1" stop-color="#120509"/></radialGradient>' +
      '<radialGradient id="csEggG" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#ffc93f"/><stop offset="1" stop-color="#c98a06"/></radialGradient>';

    /* --------------------------------------------------- payout tables --- */
    /* Plinko and Keno are the published tables for those games; every row
       returns 98.7-99.2% over the long run, which was checked rather than
       assumed. Wheel repeats a ten-segment pattern that returns exactly 99%. */
    const PLINKO = {
      8:  { low: [5.6, 2.1, 1.1, 1, .5, 1, 1.1, 2.1, 5.6], med: [13, 3, 1.3, .7, .4, .7, 1.3, 3, 13], high: [29, 4, 1.5, .3, .2, .3, 1.5, 4, 29] },
      9:  { low: [5.6, 2, 1.6, 1, .7, .7, 1, 1.6, 2, 5.6], med: [18, 4, 1.7, .9, .5, .5, .9, 1.7, 4, 18], high: [43, 7, 2, .6, .2, .2, .6, 2, 7, 43] },
      10: { low: [8.9, 3, 1.4, 1.1, 1, .5, 1, 1.1, 1.4, 3, 8.9], med: [22, 5, 2, 1.4, .6, .4, .6, 1.4, 2, 5, 22], high: [76, 10, 3, .9, .3, .2, .3, .9, 3, 10, 76] },
      11: { low: [8.4, 3, 1.9, 1.3, 1, .7, .7, 1, 1.3, 1.9, 3, 8.4], med: [24, 6, 3, 1.8, .7, .5, .5, .7, 1.8, 3, 6, 24], high: [120, 14, 5.2, 1.4, .4, .2, .2, .4, 1.4, 5.2, 14, 120] },
      12: { low: [10, 3, 1.6, 1.4, 1.1, 1, .5, 1, 1.1, 1.4, 1.6, 3, 10], med: [33, 11, 4, 2, 1.1, .6, .3, .6, 1.1, 2, 4, 11, 33], high: [170, 24, 8.1, 2, .7, .2, .2, .2, .7, 2, 8.1, 24, 170] },
      13: { low: [8.1, 4, 3, 1.9, 1.2, .9, .7, .7, .9, 1.2, 1.9, 3, 4, 8.1], med: [43, 13, 6, 3, 1.3, .7, .4, .4, .7, 1.3, 3, 6, 13, 43], high: [260, 37, 11, 4, 1, .2, .2, .2, .2, 1, 4, 11, 37, 260] },
      14: { low: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, .5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1], med: [58, 15, 7, 4, 1.9, 1, .5, .2, .5, 1, 1.9, 4, 7, 15, 58], high: [420, 56, 18, 5, 1.9, .3, .2, .2, .2, .3, 1.9, 5, 18, 56, 420] },
      15: { low: [15, 8, 3, 2, 1.5, 1.1, 1, .7, .7, 1, 1.1, 1.5, 2, 3, 8, 15], med: [88, 18, 11, 5, 3, 1.3, .5, .3, .3, .5, 1.3, 3, 5, 11, 18, 88], high: [620, 83, 27, 8, 3, .5, .2, .2, .2, .2, .5, 3, 8, 27, 83, 620] },
      16: { low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, .5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], med: [110, 41, 10, 5, 3, 1.5, 1, .5, .3, .5, 1, 1.5, 3, 5, 10, 41, 110], high: [1000, 130, 26, 9, 4, 2, .2, .2, .2, .2, .2, 2, 4, 9, 26, 130, 1000] }
    };
    const KENO = {
      classic: { 1: [0, 3.96], 2: [0, 1.9, 4.5], 3: [0, 1, 3.1, 10.4], 4: [0, .8, 1.8, 5, 22.5], 5: [0, .25, 1.4, 4.1, 16.5, 36],
        6: [0, 0, 1, 3.68, 7, 16.5, 40], 7: [0, 0, .47, 3, 4.5, 14, 31, 60], 8: [0, 0, 0, 2.2, 4, 13, 22, 55, 70],
        9: [0, 0, 0, 1.55, 3, 8, 15, 44, 60, 85], 10: [0, 0, 0, 1.4, 2.25, 4.5, 8, 17, 50, 80, 100] },
      low: { 1: [.7, 1.85], 2: [0, 2, 3.8], 3: [0, 1.1, 1.38, 26], 4: [0, 0, 2.2, 7.9, 90], 5: [0, 0, 1.5, 4.2, 13, 300],
        6: [0, 0, 1.1, 2, 6.2, 100, 700], 7: [0, 0, 1.1, 1.6, 3.5, 15, 225, 700], 8: [0, 0, 1.1, 1.5, 2, 5.5, 39, 100, 800],
        9: [0, 0, 1.1, 1.3, 1.7, 2.5, 7.5, 50, 250, 1000], 10: [0, 0, 1.1, 1.2, 1.3, 1.8, 3.5, 13, 50, 250, 1000] },
      med: { 1: [.4, 2.75], 2: [0, 1.8, 5.1], 3: [0, 0, 2.8, 50], 4: [0, 0, 1.7, 10, 100], 5: [0, 0, 1.4, 4, 14, 390],
        6: [0, 0, 0, 3, 9, 180, 710], 7: [0, 0, 0, 2, 7, 30, 400, 800], 8: [0, 0, 0, 2, 4, 11, 67, 400, 900],
        9: [0, 0, 0, 2, 2.5, 5, 15, 100, 500, 1000], 10: [0, 0, 0, 1.6, 2, 4, 7, 26, 100, 500, 1000] },
      high: { 1: [0, 3.96], 2: [0, 0, 17.1], 3: [0, 0, 0, 81.5], 4: [0, 0, 0, 10, 259], 5: [0, 0, 0, 4.5, 48, 450],
        6: [0, 0, 0, 0, 11, 350, 710], 7: [0, 0, 0, 0, 7, 90, 400, 800], 8: [0, 0, 0, 0, 5, 20, 270, 600, 900],
        9: [0, 0, 0, 0, 4, 11, 56, 500, 800, 1000], 10: [0, 0, 0, 0, 3.5, 8, 13, 63, 500, 800, 1000] }
    };
    const WHEEL_PAT = { low: [1.5, 1.2, 1.2, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0], med: [0, 1.9, 0, 1.5, 0, 2, 0, 1.5, 0, 3] };
    function wheelSegs(risk, n) {
      if (risk === 'high') { const a = new Array(n).fill(0); a[0] = +(n * .99).toFixed(2); return a; }
      const p = WHEEL_PAT[risk], a = [];
      for (let i = 0; i < n; i++) a.push(p[i % 10]);
      return a;
    }
    /* Mines: each safe tile pays the odds of having found it, less 1%. */
    function minesMx(m, n) {
      let x = .99;
      for (let i = 0; i < n; i++) x *= (25 - i) / (25 - m - i);
      return Math.floor(x * 100 + 1e-7);
    }
    const TOWER = {
      easy: { c: 4, e: 3, l: 'Easy' }, medium: { c: 3, e: 2, l: 'Medium' }, hard: { c: 2, e: 1, l: 'Hard' },
      expert: { c: 3, e: 1, l: 'Expert' }, master: { c: 4, e: 1, l: 'Master' }
    };
    const towerMx = (d, lvl) => Math.floor(.99 * Math.pow(TOWER[d].c / TOWER[d].e, lvl) * 100 + 1e-7);

    /* ========================================================= front page ===
       Opened from the hub, All In starts in its own lobby rather than on the
       shell's start panel: the rules, the tables, the two settings and a
       seat. Taking the seat mounts the casino afresh with those settings,
       because the clock and the house players are fixed when a match is
       dealt. Online there is no lobby: the match is already on. Everything
       here runs before the state below is declared, so it touches none of it. */
    if (!ONLINE && api.entry === 'menu') return frontPage();
    function frontPage() {
      if (!document.getElementById('csStyle')) {
        const st = document.createElement('style');
        st.id = 'csStyle'; st.textContent = CSS;
        document.head.appendChild(st);
      }
      const TABLES = [['crash', 'Crash', 'HOT'], ['mines', 'Mines', 'HOT'], ['plinko', 'Plinko', 'HOT'], ['chicken', 'Chicken', 'NEW'],
        ['blackjack', 'Blackjack'], ['dice', 'Dice'], ['limbo', 'Limbo'], ['keno', 'Keno'], ['wheel', 'Wheel'], ['hilo', 'Hilo'],
        ['tower', 'Dragon Tower']];
      const HOUSE_TXT = { '0': 'just you against the clock', '3': 'three house players to beat', '7': 'a full table of eight' };
      let table = 'crash', gone = false;
      try { table = api.load('table', 'crash') || 'crash'; } catch (e) {}
      if (!TABLES.some(t => t[0] === table)) table = 'crash';
      const chips = [[7, 0, 1], [21, 3.4, .7], [36, 7.9, .55], [63, 1.8, .8], [79, 5.6, .62], [92, 9.2, .9]]
        .map(c => '<i class="fp-chip" style="--x:' + c[0] + '%;--d:' + c[1] + 's;--s:' + c[2] + '">' + I.chip + '</i>').join('');
      const fp = mk('div', 'csino cs-fp');
      fp.innerHTML =
        '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + DEFS +
          '<linearGradient id="fpLine" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1fdc7c"/><stop offset=".72" stop-color="#7dffb8"/><stop offset="1" stop-color="#ffc93f"/></linearGradient>' +
          '<linearGradient id="fpFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1fdc7c" stop-opacity=".2"/><stop offset="1" stop-color="#1fdc7c" stop-opacity="0"/></linearGradient>' +
        '</defs></svg>' +
        /* a crash line drawing itself behind everything, over and over */
        '<svg class="fp-chart" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">' +
          '<path class="ar" d="M0 592 C380 588 610 530 770 372 S935 96 1000 34 L1000 600 L0 600Z"/>' +
          '<path class="ln" pathLength="1" d="M0 592 C380 588 610 530 770 372 S935 96 1000 34"/>' +
        '</svg>' +
        '<div class="fp-chips" aria-hidden="true">' + chips + '</div>' +
        '<div class="fp-in">' +
          '<header class="fp-hd">' +
            '<div class="cs-brand">' + I.logo + '<div class="col"><b class="cn">ALL IN</b><span class="mode">The casino party · up to 8 players</span></div></div>' +
            '<button class="fp-fr">' + I.users + '<span></span></button>' +
          '</header>' +
          '<div class="fp-main">' +
            '<div class="fp-left">' +
              '<h1 class="fp-h cn"><span>Most chips</span> <span>at the buzzer</span> <em>wins.</em></h1>' +
              '<p class="fp-p">Everyone sits down with <b>1,000</b> chips and the same clock. Eleven tables, one leaderboard — ' +
                'and the house slides everybody <b>+25</b> every thirty seconds, so a bad run is never the end of you.</p>' +
              '<section class="cs-card fp-tables">' +
                '<div class="hd"><span class="t">' + I.bolt + 'Pick your first table</span><span class="cap">switch any time</span></div>' +
                '<div class="fp-tbl">' + TABLES.map((t, i) =>
                  '<button class="fp-t" data-g="' + t[0] + '" style="--i:' + i + '">' + I[t[0]] + '<span>' + t[1] + '</span>' +
                  (t[2] ? '<b class="tag' + (t[2] === 'NEW' ? ' new' : '') + '">' + t[2] + '</b>' : '') + '</button>').join('') +
                '</div>' +
              '</section>' +
            '</div>' +
            '<section class="cs-card fp-set">' +
              '<div class="hd"><span class="t">' + I.trophy + 'The match</span><span class="cap fp-mode"></span></div>' +
              '<div class="fp-body">' +
                '<div class="cs-fld fp-time"><div class="lab"><span class="cap">Match length</span><span class="aux">most chips wins</span></div></div>' +
                '<div class="cs-fld fp-house"><div class="lab"><span class="cap">House players</span><span class="aux fp-hx"></span></div></div>' +
                '<ul class="fp-rules">' +
                  '<li><span class="ic">' + I.chip + '</span><span><b>1,000</b> chips each to start</span></li>' +
                  '<li><span class="ic dr">' + I.up + '</span><span><b>+25</b> for everyone every 30s</span></li>' +
                  '<li><span class="ic tr">' + I.crown + '</span><span>Top balance at the buzzer wins</span></li>' +
                '</ul>' +
                '<button class="cs-go fp-seat"><span class="l"></span><small></small></button>' +
                '<div class="fp-best"></div>' +
              '</div>' +
            '</section>' +
          '</div>' +
          '<div class="fp-foot cap"><span class="k1"><b>Space</b> <span class="t">take a seat</span></span><span><b>P</b> play with friends</span><span><b>Esc</b> back to the hub</span></div>' +
        '</div>';
      document.getElementById('stagewrap').insertBefore(fp, document.getElementById('embedWrap'));
      const $f = s => fp.querySelector(s);

      /* the settings: the same two the shell's card offered, kept the same way */
      const timeSeg = seg([['2', '2 min'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min'], ['20', '20 min']], String(MINUTES),
                          v => { api.setOpt('time', v); paint(); });
      const houseSeg = seg([['0', 'None'], ['3', 'Three'], ['7', 'Seven']], String(HOUSE), v => { api.setOpt('house', v); paint(); });
      $f('.fp-time').appendChild(timeSeg.el);
      $f('.fp-house').appendChild(houseSeg.el);
      const best = api.best();
      $f('.fp-best').innerHTML = best > 0 ? 'Your best finish <b class="num">' + fmt(best) + '</b> chips' : 'No finish on the board yet';

      /* the table you sit down at first */
      const tbl = $f('.fp-tbl');
      const pick = id => {
        table = id;
        tbl.querySelectorAll('.fp-t').forEach(b => b.classList.toggle('on', b.dataset.g === id));
        try { api.save('table', id); } catch (e) {}
      };
      pick(table);
      tbl.onclick = e => { const b = e.target.closest('.fp-t'); if (!b || b.dataset.g === table) return; pick(b.dataset.g); sfx('blip'); };

      /* A party changes what the seat does: the host starts the match for
         everyone, a guest waits, and house players only sit in offline. */
      function paint() {
        if (gone) return;
        const P = api.party, guest = P.inRoom && !P.isHost;
        const mins = api.opt('time') || '5', house = api.opt('house') || '3';
        const who = P.inRoom ? 'Party of ' + P.size : +house ? 'vs ' + house + ' house players' : 'Solo';
        $f('.fp-mode').textContent = who + ' · ' + mins + ' min';
        $f('.fp-hx').textContent = P.inRoom ? 'online, the table is your friends' : HOUSE_TXT[house] || '';
        houseSeg.lock(P.inRoom); timeSeg.lock(guest);
        const seatB = $f('.fp-seat');
        seatB.disabled = guest;
        seatB.querySelector('.l').textContent = !P.inRoom ? 'Take a seat' : guest ? 'Waiting for the host' : 'Start the match';
        seatB.querySelector('small').textContent = !P.inRoom ? 'Space' : guest ? 'The host deals everyone in'
          : P.size + (P.size === 1 ? ' player' : ' players') + ' · Space';
        $f('.fp-fr span').textContent = P.inRoom ? 'Party · ' + P.size : 'Play with friends';
        const k1 = $f('.fp-foot .k1');
        k1.style.display = guest ? 'none' : '';
        k1.querySelector('.t').textContent = P.inRoom ? 'start the match' : 'take a seat';
      }
      paint();
      const pt = setInterval(paint, 500);

      /* the lobby fades as the table is dealt */
      const seat = () => {
        if (gone || api.covered || $f('.fp-seat').disabled || fp.classList.contains('go')) return;
        sfx('csChip');
        fp.classList.add('go');
        setTimeout(() => { if (!gone) api.play({ remount: true }); if (!gone) fp.classList.remove('go'); }, 170);
      };
      $f('.fp-seat').onclick = seat;
      $f('.fp-fr').onclick = () => { sfx('blip'); api.openParty(); };
      /* a clicked button keeps focus, and Space on a focused button clicks it */
      fp.addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.blur(); });
      const onKey = e => {
        if (e.repeat || gone || api.covered) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); seat(); }
        else if (e.code === 'KeyP') { e.preventDefault(); sfx('blip'); api.openParty(); }
      };
      addEventListener('keydown', onKey);

      return {
        update() {},
        render() {},              // it is all DOM; the frame hook has nothing to paint
        resize() {},
        escape() { api.hub(); return true; },
        destroy() { gone = true; clearInterval(pt); removeEventListener('keydown', onKey); fp.remove(); }
      };
    }

    /* ============================================================ state === */
    const players = new Map();
    const me = { id: MY_ID, name: 'You', bal: START, me: true, bot: false, left: false, seq: 0, crash: null };
    if (ONLINE) {
      const mine = (R.cfg.players || []).find(p => p.id === MY_ID);
      if (mine && mine.name) me.name = mine.name;
    }
    players.set(MY_ID, me);
    if (ONLINE) for (const p of R.cfg.players || []) {
      if (p.id === MY_ID) continue;
      players.set(p.id, { id: p.id, name: p.name || 'Player', bal: START, me: false, bot: false, left: false, seq: 0, crash: null });
    }
    const BOT_NAMES = ['Lucky Lou', 'Vegas Val', 'Chip Chen', 'Dice Daisy', 'Martingale Mo', 'Big Stack Sam', 'Card Shark Kai'];
    const bots = [];
    for (let i = 0; i < HOUSE; i++) {
      const b = { id: 'bot' + i, name: BOT_NAMES[i], bal: START, me: false, bot: true, left: false,
                  style: i % 3, next: 900 + rnd() * 3500, cr: null, crDone: null };
      players.set(b.id, b); bots.push(b);
    }
    const stats = { bets: 0, wagered: 0, wins: 0, bestX: 0, bigWin: 0 };
    let dead = false, started = false, ended = false, lbDirty = true;
    let curGame = null;

    /* ------------------------------------------------------------ clock ---
       Solo, the clock is whatever update() has stepped, so Escape pauses the
       whole table. Online, it is the host's wall clock: every client learns
       the host's epoch and how far its own clock is off the host's from the
       host's posts, keeping the largest estimate — that one had the shortest
       trip, so it is the closest to the truth. Crash rounds, the drip and the
       buzzer all read this one number, so eight screens agree on them. */
    const t0 = Date.now();
    let ep = t0, off = 0, offKnown = AM_HOST, soloMs = 0, lastHn = 0;
    const clock = () => (ONLINE ? Date.now() + off - ep : soloMs) - COUNT_MS;
    const live = () => started && !ended;

    /* ------------------------------------------------------- crash plan ---
       The crash point of round k is a pure function of the match seed and k,
       and a round's length is a pure function of its crash point, so the whole
       evening's schedule can be computed by anyone holding the seed. */
    const CR_BET = 6000, CR_POST = 3400, CR_K = .00008, CR_MAX = 100000;
    const crashRounds = [];
    function crashPoint(k) {
      const r = mulberry(((SEED ^ Math.imul(k + 1, 0x9E3779B1)) >>> 0) || 7);
      r(); r();
      return Math.min(CR_MAX, Math.max(100, Math.floor(99 / (1 - r()))));
    }
    function crRound(k) {
      while (crashRounds.length <= k) {
        const i = crashRounds.length, prev = crashRounds[i - 1];
        const start = prev ? prev.end : 0, cp = crashPoint(i);
        const fly = Math.log(cp / 100) / CR_K;
        crashRounds.push({ k: i, start, fly: start + CR_BET, bust: start + CR_BET + fly, end: start + CR_BET + fly + CR_POST, cp });
      }
      return crashRounds[k];
    }
    let crCursor = 0;
    function crAt(c) {
      let k = crCursor;
      if (c < crRound(k).start) k = 0;
      while (crRound(k).end <= c) k++;
      crCursor = k;
      return crRound(k);
    }
    const crMult = (r, c) => c <= r.fly ? 100 : Math.min(r.cp, Math.floor(100 * Math.exp(CR_K * (c - r.fly)) + 1e-9));

    /* ============================================================ layout === */
    if (!document.getElementById('csStyle')) {
      const st = document.createElement('style');
      st.id = 'csStyle'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    const stageEl = document.getElementById('stagewrap');
    const root = mk('div', 'csino');
    const ringSvg = cls => '<svg class="cs-ring" viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15"/><circle class="fg" cx="18" cy="18" r="15" stroke-dasharray="94.25" stroke-dashoffset="0"/></svg>';
    const modeTxt = (ONLINE ? players.size + ' players online' : HOUSE ? 'vs ' + HOUSE + ' house players' : 'Solo') + ' · ' + MINUTES + ' min';
    root.innerHTML =
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + DEFS + '</defs></svg>' +
      '<div class="cs-top">' +
        '<div class="cs-brand">' + I.logo + '<div class="col"><b class="cn">ALL IN</b><span class="mode">' + esc(modeTxt) + '</span></div></div>' +
        '<div class="cs-stat cs-clock">' + ringSvg() + '<div class="col"><span class="cap">Time left</span><b class="v num cn">' + MINUTES + ':00</b></div></div>' +
        '<div class="cs-stat cs-bal"><span class="chip">' + I.chip + '</span><div class="col"><span class="cap">Balance</span><b class="v num">' + money(START) + '</b></div></div>' +
        '<div class="cs-stat cs-drip">' + ringSvg() + '<div class="col"><span class="cap">+25 chips in</span><b class="v num">30s</b></div></div>' +
        '<div class="cs-stat cs-rank"><div class="col"><span class="cap">Rank</span><b class="v num cn">#1</b></div></div>' +
        '<button class="cs-sideBtn">' + I.trophy + '<span>Standings</span></button>' +
      '</div>' +
      '<div class="cs-main">' +
        '<nav class="cs-nav"><div class="h cap">Tables</div></nav>' +
        '<section class="cs-stagearea"></section>' +
        '<aside class="cs-side">' +
          '<div class="cs-card cs-lb"><div class="hd"><span class="t">' + I.trophy + 'Standings</span><span class="cap lbn"></span></div><div class="cs-lbrows"></div></div>' +
          '<div class="cs-card cs-feed" data-f="all"><div class="hd"><span class="t">' + I.bolt + 'Live bets</span></div>' +
            '<div class="cs-tabs"><button class="on" data-f="all">All</button><button data-f="me">Mine</button><button data-f="big">Big wins</button></div>' +
            '<div class="cs-fhead"><span>Player</span><span></span><span>Multi</span><span>Profit</span></div>' +
            '<div class="cs-frows"><div class="cs-empty">No bets yet — somebody has to go first.</div></div></div>' +
        '</aside>' +
      '</div>' +
      '<div class="cs-toasts"></div>' +
      '<div class="cs-cover on"><div class="cs-count cn">Ready</div><div class="sub">Everyone starts with <b>1,000</b> chips</div></div>';
    stageEl.insertBefore(root, document.getElementById('embedWrap'));
    const $ = s => root.querySelector(s);
    const navEl = $('.cs-nav'), areaEl = $('.cs-stagearea'), lbBox = $('.cs-lbrows'), feedEl = $('.cs-feed'), frowsEl = $('.cs-frows');
    const toastsEl = $('.cs-toasts'), coverEl = $('.cs-cover');
    const balEl = $('.cs-bal'), balV = $('.cs-bal .v');
    const clockEl = $('.cs-clock'), clockV = $('.cs-clock .v'), clockFg = $('.cs-clock .fg');
    const dripV = $('.cs-drip .v'), dripFg = $('.cs-drip .fg'), rankV = $('.cs-rank .v');

    /* Inputs live inside the stage, and the shell's key handling would
       otherwise eat Backspace and Space out of them — so keystrokes aimed at
       a field stop here. Enter and Escape just let go of the field. */
    root.addEventListener('keydown', e => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) {
        if (e.key === 'Enter' || e.key === 'Escape') { t.blur(); e.preventDefault(); }
        e.stopPropagation();
      }
    });
    $('.cs-sideBtn').onclick = () => { root.classList.toggle('side'); sfx('blip'); };
    $('.cs-main').addEventListener('pointerdown', e => {
      if (root.classList.contains('side') && !e.target.closest('.cs-side')) root.classList.remove('side');
    });
    feedEl.querySelector('.cs-tabs').onclick = e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      feedEl.dataset.f = b.dataset.f;
      feedEl.querySelectorAll('.cs-tabs button').forEach(x => x.classList.toggle('on', x === b));
      sfx('blip');
    };

    /* ====================================================== money moves === */
    let balShown = START, balFlashT = 0;
    function floatDelta(d, kind) {
      const n = mk('div', 'cs-float num ' + (kind || (d > 0 ? 'p' : 'n')), (d > 0 ? '+' : '−') + money(Math.abs(d)));
      balEl.appendChild(n);
      setTimeout(() => n.remove(), 1300);
      balEl.classList.remove('up', 'down'); void balEl.offsetWidth;
      balEl.classList.add(d > 0 ? 'up' : 'down');
      clearTimeout(balFlashT);
      balFlashT = setTimeout(() => balEl.classList.remove('up', 'down'), 650);
    }
    function balChanged() { lbDirty = true; netDirty = true; refreshAux(); for (const g of GAMES) if (g.built && g.refresh) g.refresh(); }
    function credit(c, kind) {
      if (c <= 0) return;
      me.bal += c; balChanged();
      floatDelta(c, kind);
    }
    function refund(c) { if (c > 0) { me.bal += c; stats.bets = Math.max(0, stats.bets - 1); stats.wagered = Math.max(0, stats.wagered - c); balChanged(); } }

    /* ------------------------------------------------ the shared bet box --
       One bet amount for every table, the way a stack in front of you is the
       same stack whichever game you turn to. */
    let betAmt = 1000;
    const amtFields = new Set();
    function amountField(label) {
      const f = mk('div', 'cs-fld');
      f.innerHTML = '<div class="lab"><span class="cap">' + (label || 'Bet amount') + '</span><span class="aux num"></span></div>' +
        '<div class="cs-amt"><span class="ic">' + I.chip + '</span><input inputmode="decimal" spellcheck="false" autocomplete="off" aria-label="Bet amount">' +
        '<button class="qb" data-q="h" title="Halve">½</button><button class="qb" data-q="d" title="Double">2×</button><button class="qb" data-q="m" title="Everything">Max</button></div>';
      const inp = f.querySelector('input'), box = f.querySelector('.cs-amt'), aux = f.querySelector('.aux');
      inp.value = (betAmt / 100).toFixed(2);
      inp.addEventListener('change', () => setAmt(parseAmt(inp.value)));
      inp.addEventListener('blur', () => { inp.value = (betAmt / 100).toFixed(2); });
      inp.addEventListener('focus', () => { try { inp.select(); } catch (e) {} });
      f.querySelectorAll('.qb').forEach(b => b.onclick = () => {
        const q = b.dataset.q;
        setAmt(q === 'h' ? Math.floor(betAmt / 2) : q === 'd' ? betAmt * 2 : me.bal);
        sfx('csChip');
      });
      const o = {
        el: f, inp, box, aux,
        lock(v) { inp.disabled = v; f.querySelectorAll('.qb').forEach(b => { b.disabled = v; }); },
        bad() { box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad'); sfx('nope'); }
      };
      amtFields.add(o);
      refreshAux();
      return o;
    }
    function parseAmt(s) {
      const v = parseFloat(String(s).replace(/[^0-9.]/g, ''));
      return isFinite(v) ? Math.round(v * 100) : betAmt;
    }
    function setAmt(c) {
      betAmt = Math.max(MIN_BET, Math.min(Math.max(MIN_BET, me.bal), Math.round(c) || MIN_BET));
      for (const a of amtFields) if (document.activeElement !== a.inp) a.inp.value = (betAmt / 100).toFixed(2);
      refreshAux();
      for (const g of GAMES) if (g.built && g.refresh) g.refresh();
    }
    function refreshAux() {
      const pct = me.bal > 0 ? betAmt / me.bal * 100 : 100;
      const txt = betAmt >= me.bal ? 'all in' : (pct < 1 ? '<1' : Math.round(pct)) + '% of stack';
      for (const a of amtFields) if (a.aux.textContent !== txt) a.aux.textContent = txt;
    }
    /* Take a stake off the balance, or say why not. Returns the stake. */
    function takeBet(field, amount) {
      if (amount == null) amount = betAmt;
      if (!live()) { if (!started) toast('The tables open when the countdown ends.', 'info', I.bolt); return 0; }
      if (amount < MIN_BET || amount > me.bal) {
        if (field) field.bad();
        if (me.bal < MIN_BET) toast('Out of chips — <b>+25</b> lands every thirty seconds.', 'info', I.chip);
        return 0;
      }
      const allIn = amount === me.bal && amount >= 20000;
      me.bal -= amount;
      stats.bets++; stats.wagered += amount;
      balChanged();
      sfx('csChip');
      if (allIn) toast('You went <b>all in</b> with ' + money(amount) + '.', 'me', I.bolt);
      return amount;
    }

    /* ============================================================= feed === */
    const GAME_IDS = ['crash', 'mines', 'plinko', 'dice', 'limbo', 'keno', 'wheel', 'hilo', 'blackjack', 'tower', 'chicken'];
    const GAME_NAMES = { crash: 'Crash', mines: 'Mines', plinko: 'Plinko', dice: 'Dice', limbo: 'Limbo', keno: 'Keno', wheel: 'Wheel', hilo: 'Hilo', blackjack: 'Blackjack', tower: 'Dragon Tower', chicken: 'Chicken' };
    const myFeed = [];
    let mySeq = 0, feedCount = 0;
    /* The feed shows profit, not payout: "+120.00" says what the bet did,
       where "payout 130.00" makes you do the subtraction. */
    function pushFeed(p, ev) {
      if (!ev || !GAME_NAMES[ev.g]) return;
      const profit = ev.p - ev.b;
      const big = profit >= 50000 || (ev.m >= 1000 && profit >= 5000);
      const row = mk('div', 'cs-fr' + (p.me ? ' me' : '') + (profit > 0 ? ' w' : ' l') + (big ? ' big' : ''));
      row.innerHTML = '<span class="who">' + esc(p.name) + '</span>' +
        '<span class="gm" title="' + esc(GAME_NAMES[ev.g]) + '">' + I[ev.g] + '</span>' +
        '<span class="mx num">' + mxs(ev.m) + '</span>' +
        '<span class="py num">' + (profit > 0 ? '+' : profit < 0 ? '−' : '') + money(Math.abs(profit)) + '</span>';
      if (!feedCount++) frowsEl.innerHTML = '';
      frowsEl.insertBefore(row, frowsEl.firstChild);
      while (frowsEl.children.length > 60) frowsEl.lastChild.remove();
      if (big) {
        toast('<b>' + esc(p.me ? 'You' : p.name) + '</b> hit ' + mxs(ev.m) + ' on ' + GAME_NAMES[ev.g] + ' for <b>+' + money(profit) + '</b>',
              p.me ? 'me' : '', I.bolt);
        if (p.me) sfx('csBig');
      }
    }
    /* Every settled bet of mine goes to the feed here, and rides the next
       network post to everyone else. */
    function record(gid, bet, mx, pay) {
      mySeq++;
      myFeed.push([mySeq, GAME_IDS.indexOf(gid), bet, mx, pay]);
      if (myFeed.length > 10) myFeed.shift();
      if (pay > bet) { stats.wins++; stats.bigWin = Math.max(stats.bigWin, pay - bet); }
      if (pay > 0) stats.bestX = Math.max(stats.bestX, mx);
      pushFeed(me, { g: gid, b: bet, m: mx, p: pay });
      netDirty = true; lbDirty = true;
    }
    function toast(html, kind, icon) {
      const t = mk('div', 'cs-toast ' + (kind || ''), '<span class="ic">' + (icon || I.bolt) + '</span><span>' + html + '</span>');
      toastsEl.appendChild(t);
      setTimeout(() => t.remove(), 3700);
      while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    }

    /* ====================================================== standings ==== */
    const lbRows = new Map();
    const ROW_H = 50;
    function standings() {
      return [...players.values()].sort((a, b) => (b.bal - a.bal) || (a.me ? -1 : b.me ? 1 : String(a.name).localeCompare(b.name)));
    }
    function paintLB() {
      const arr = standings();
      lbBox.style.height = arr.length * ROW_H + 'px';
      const top = Math.max(1, arr.length ? arr[0].bal : 1);
      arr.forEach((p, i) => {
        let r = lbRows.get(p.id);
        if (!r) {
          r = mk('div', 'cs-lr' + (p.me ? ' me' : ''));
          if (p.bot) r.title = 'House player';
          r.innerHTML = '<span class="rk num"></span><span class="av" style="background:hsl(' + hueOf(p.name) + ' 55% 40%)">' + I.crown + esc(initials(p.name)) + '</span>' +
            '<span class="nm"><b><span class="tx">' + esc(p.name) + '</span>' + (p.me ? '<i>YOU</i>' : '') + '</b><span class="bar"><i></i></span></span>' +
            '<span class="bv num"></span>';
          r.style.transform = 'translateY(' + (i * ROW_H) + 'px)';
          lbBox.appendChild(r); lbRows.set(p.id, r);
          r._bal = null;
        }
        r.style.transform = 'translateY(' + (i * ROW_H) + 'px)';
        r.classList.toggle('first', i === 0 && arr.length > 1);
        r.classList.toggle('left', !!p.left);
        r.querySelector('.rk').textContent = i + 1;
        r.querySelector('.bar i').style.width = Math.max(2, p.bal / top * 100) + '%';
        if (r._bal !== p.bal) {
          const bv = r.querySelector('.bv');
          bv.textContent = money(p.bal);
          if (r._bal != null) {
            bv.classList.remove('up', 'dn'); void bv.offsetWidth;
            bv.classList.add(p.bal > r._bal ? 'up' : 'dn');
            clearTimeout(r._t); r._t = setTimeout(() => bv.classList.remove('up', 'dn'), 600);
          }
          r._bal = p.bal;
        }
      });
      const rank = arr.indexOf(me) + 1;
      const rt = '#' + rank + (arr.length > 1 ? ' / ' + arr.length : '');
      if (rankV.textContent !== rt) rankV.textContent = rt;
      const n = $('.lbn'); const nt = arr.length + (arr.length === 1 ? ' player' : ' players');
      if (n.textContent !== nt) n.textContent = nt;
    }

    /* ============================================================ network ===
       Posts are rate-limited to one every 550ms however fast you bet — the
       feed batches up behind that — with a heartbeat every 2.5s so a quiet
       player does not fall out of everybody's peers list. The last ten
       settled bets ride every post, so a lost packet only delays the feed. */
    let netDirty = true, netLast = 0;
    function crashNet() {
      const b = Crash.netState();
      return b || 0;
    }
    function netTick() {
      if (!ONLINE) return;
      const t = Date.now();
      if ((netDirty && t - netLast >= 550) || t - netLast >= 2500) {
        netLast = t; netDirty = false;
        const o = { b: me.bal, f: myFeed.slice(), c: crashNet() };
        if (AM_HOST) { o.ep = ep; o.hn = Date.now(); }
        try { R.post(o, true); } catch (e) {}
        try { R.report(Math.round(me.bal / 100), true, null); } catch (e) {}
      }
      const peers = R.peers || {};
      for (const id in peers) {
        const q = peers[id];
        if (!q || id === MY_ID) continue;
        let p = players.get(id);
        if (!p) {
          const b = R.board && R.board[id];
          p = { id, name: (b && b.name) || 'Player', bal: START, me: false, bot: false, left: false, seq: 0, crash: null };
          players.set(id, p);
        }
        if (typeof q.b === 'number' && q.b !== p.bal) { p.bal = q.b; lbDirty = true; }
        if (Array.isArray(q.f)) for (const e of q.f) {
          if (!Array.isArray(e) || e[0] <= p.seq) continue;
          p.seq = e[0];
          pushFeed(p, { g: GAME_IDS[e[1]], b: e[2], m: e[3], p: e[4] });
        }
        p.crash = Array.isArray(q.c) ? q.c : null;
        if (id === HOST_ID && !AM_HOST && q.hn && q.ep && q.hn !== lastHn) {
          lastHn = q.hn;
          const s = q.hn - (q._t || Date.now());      // _t is when it arrived, not when we read it
          if (!offKnown || s > off) off = s;
          ep = q.ep; offKnown = true;
        }
      }
      if (R.board) for (const id in R.board) {
        const b = R.board[id], p = players.get(id);
        if (p && !p.me && b.gone && !p.left) { p.left = true; lbDirty = true; }
      }
    }

    /* =============================================================== bots ===
       The house players really play: they pick a table, size a bet off their
       stack and their temperament, and are paid at the true odds of whatever
       they chose. At Crash they sit in the same round you are watching, with a
       cash-out target, and appear in its live list like anyone else. */
    function botOutcome() {
      if (rnd() < .1) {
        const m = [1, 3, 5, 10][rint(4)], n = 1 + rint(m === 1 ? 10 : m === 3 ? 6 : 4);
        for (let i = 0; i < n; i++) if (rnd() < m / (25 - i)) return { g: 'chicken', m: 0 };
        return { g: 'chicken', m: minesMx(m, n) };
      }
      const w = rnd();
      if (w < .2) {
        const ch = [49.5, 66, 80, 25, 90, 10][rint(6)];
        return { g: 'dice', m: rnd() * 100 < ch ? Math.floor(9900 / ch + 1e-7) : 0 };
      }
      if (w < .34) {
        const t = [150, 200, 300, 500, 1000, 5000][rint(6)];
        return { g: 'limbo', m: rnd() < 99 / t ? t : 0 };
      }
      if (w < .52) {
        const rows = 8 + rint(9), risk = ['low', 'med', 'high'][rint(3)];
        let k = 0; for (let i = 0; i < rows; i++) if (rnd() < .5) k++;
        return { g: 'plinko', m: Math.round(PLINKO[rows][risk][k] * 100) };
      }
      if (w < .65) {
        const m = [1, 3, 5, 10][rint(4)], n = 1 + rint(5);
        for (let i = 0; i < n; i++) if (rnd() < m / (25 - i)) return { g: 'mines', m: 0 };
        return { g: 'mines', m: minesMx(m, n) };
      }
      if (w < .75) {
        const n = 1 + rint(10), risk = ['classic', 'low', 'med', 'high'][rint(4)];
        let left = n, pool = 40, hits = 0;
        for (let d = 0; d < 10; d++) { if (rnd() < left / pool) { hits++; left--; } pool--; }
        return { g: 'keno', m: Math.round(KENO[risk][n][hits] * 100) };
      }
      if (w < .84) {
        const segs = wheelSegs(['low', 'med', 'high'][rint(3)], [10, 20, 30][rint(3)]);
        return { g: 'wheel', m: Math.round(segs[rint(segs.length)] * 100) };
      }
      if (w < .93) {
        const v = rnd();
        return { g: 'blackjack', m: v < .045 ? 250 : v < .47 ? 200 : v < .555 ? 100 : 0 };
      }
      if (w < .97) {
        let x = 1;
        const steps = 1 + rint(3);
        for (let i = 0; i < steps; i++) { const p = .5 + rnd() * .42; if (rnd() >= p) return { g: 'hilo', m: 0 }; x *= .99 / p; }
        return { g: 'hilo', m: Math.floor(x * 100) };
      }
      const d = rnd() < .6 ? 'easy' : 'medium', L = 1 + rint(4);
      return { g: 'tower', m: rnd() < Math.pow(TOWER[d].e / TOWER[d].c, L) ? towerMx(d, L) : 0 };
    }
    function botsTick(c) {
      for (const b of bots) {
        if (b.cr) {
          const r = crRound(b.cr.k);
          if (c >= r.fly) {
            if (b.cr.auto <= r.cp) {
              if (c >= r.fly + Math.log(b.cr.auto / 100) / CR_K) {
                const pay = payOf(b.cr.bet, b.cr.auto);
                b.bal += pay; b.crDone = { k: b.cr.k, bet: b.cr.bet, cash: b.cr.auto };
                pushFeed(b, { g: 'crash', b: b.cr.bet, m: b.cr.auto, p: pay });
                b.cr = null; lbDirty = true;
              }
            } else if (c >= r.bust) {
              b.crDone = { k: b.cr.k, bet: b.cr.bet, cash: 0 };
              pushFeed(b, { g: 'crash', b: b.cr.bet, m: 0, p: 0 });
              b.cr = null; lbDirty = true;
            }
          }
        }
        if (c < b.next) continue;
        b.next = c + [3900, 2700, 1500][b.style] * (.55 + rnd());
        if (b.bal < MIN_BET) continue;
        let bet = Math.max(MIN_BET, Math.round(b.bal * [.02, .05, .11][b.style] * (.4 + rnd() * 1.2) / 10) * 10);
        if (b.style === 2 && b.bal < 30000 && rnd() < .12) bet = b.bal;
        bet = Math.min(bet, b.bal);
        const r = crAt(c);
        if (rnd() < .3 && !b.cr && c < r.fly - 500) {
          const auto = [120, 150, 200, 250, 400, 800][Math.min(5, rint(3 + b.style))];
          b.bal -= bet; b.cr = { k: r.k, bet, auto };
          lbDirty = true;
          continue;
        }
        const o = botOutcome();
        b.bal -= bet;
        const pay = payOf(bet, o.m);
        b.bal += pay;
        pushFeed(b, { g: o.g, b: bet, m: o.m, p: pay });
        lbDirty = true;
      }
    }
    function settleBots(c) {
      for (const b of bots) if (b.cr) {
        const r = crRound(b.cr.k);
        if (c < r.fly) b.bal += b.cr.bet;                       // never flew: stake back
        else if (b.cr.auto <= crMult(r, c)) b.bal += payOf(b.cr.bet, b.cr.auto);
        else if (c < r.bust) b.bal += payOf(b.cr.bet, crMult(r, c));
        b.cr = null;
      }
      lbDirty = true;
    }

    /* ======================================================= the drip ==== */
    let dripPaid = 0;
    function dripTick(c) {
      const due = Math.floor(Math.min(c, MATCH_MS - 1) / DRIP_MS);
      if (due <= dripPaid) return;
      const n = due - dripPaid;
      dripPaid = due;
      for (const b of bots) b.bal += DRIP * n;
      me.bal += DRIP * n;
      balChanged();
      floatDelta(DRIP * n, 'd');
      sfx('csDrip');
    }

    /* ============================================================ games === */
    const GAMES = [];
    let GBY = {};

    /* Canvases resize with their box; one observer for all of them. */
    const ro = new ResizeObserver(list => { for (const e of list) if (e.target._fit) e.target._fit(); });
    function canvasIn(host) {
      const cv = mk('canvas', 'cs-cv');
      host.appendChild(cv);
      const o = { cv, g: cv.getContext('2d'), W: 1, H: 1, dpr: 1, dirty: true };
      cv._fit = () => {
        const r = cv.getBoundingClientRect();
        o.dpr = Math.min(2, devicePixelRatio || 1);
        o.W = Math.max(1, r.width); o.H = Math.max(1, r.height);
        cv.width = Math.round(o.W * o.dpr); cv.height = Math.round(o.H * o.dpr);
        o.dirty = true;
      };
      ro.observe(cv);
      return o;
    }
    const kv = (label, cls) => {
      const e = mk('div', 'cs-kv', '<span class="cap">' + label + '</span><b class="num ' + (cls || '') + '">—</b>');
      e.v = e.querySelector('b');
      return e;
    };
    const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
    function pill(txt, cls) { return mk('span', 'cs-pl num ' + (cls || ''), txt); }
    function pushPill(box, txt, cls, max) {
      box.insertBefore(pill(txt, cls), box.firstChild);
      while (box.children.length > (max || 8)) box.lastChild.remove();
    }
    const mxCls = x => x >= 1000 ? 'gd' : x >= 200 ? 'g' : x < 100 ? 'r' : '';

    /* ============================================================ CRASH ===
       The shared table. The rocket is the same rocket on every screen; what
       each player owns is only their own stake in it. */
    const Crash = (() => {
      let amt, autoIn, go, goSub, liveRows, liveN, liveT, hist, G, cm, cmX, cmL, cmBar, board;
      let auto = 0, mine = null, done = null;
      let lastPhase = '', lastK = -1, histK = 0, listAt = 0, listSig = '', btnSig = '', lastC = -1;
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div>' +
          '<div class="cs-board"><div class="cs-crash"><div class="cs-hist"><span class="cs-pl">First round coming up</span></div>' +
          '<div class="cs-graph"><div class="cs-cm wait"><div class="x cn num">—</div><div class="l">Next round in</div><div class="bar"><i></i></div></div></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        board = view.querySelector('.cs-board');
        amt = amountField(); ctl.appendChild(amt.el);
        const af = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Auto cash out</span><span class="aux">optional</span></div>' +
          '<input class="cs-in" inputmode="decimal" placeholder="Off — e.g. 2.00" aria-label="Auto cash out multiplier">');
        ctl.appendChild(af);
        autoIn = af.querySelector('input');
        autoIn.addEventListener('change', () => {
          const x = parseFloat(String(autoIn.value).replace(/[^0-9.]/g, ''));
          auto = isFinite(x) && x >= 1.01 ? Math.round(Math.min(x, 1000) * 100) : 0;
          autoIn.value = auto ? (auto / 100).toFixed(2) : '';
        });
        go = mk('button', 'cs-go', 'Bet'); ctl.appendChild(go);
        go.onclick = press;
        const lv = mk('div', 'cs-live', '<div class="lh"><span><b class="n num">0</b> in this round</span><span class="num t">0.00</span></div><div class="rows"></div>');
        ctl.appendChild(lv);
        liveRows = lv.querySelector('.rows'); liveN = lv.querySelector('.n'); liveT = lv.querySelector('.t');
        hist = view.querySelector('.cs-hist');
        const graph = view.querySelector('.cs-graph');
        G = canvasIn(graph);
        graph.insertBefore(G.cv, graph.firstChild);
        cm = view.querySelector('.cs-cm'); cmX = cm.querySelector('.x'); cmL = cm.querySelector('.l'); cmBar = cm.querySelector('.bar i');
      }
      function press() {
        const c = clock(), r = crAt(c);
        if (!live()) { takeBet(amt); return; }
        if (mine) {
          const mr = crRound(mine.k);
          if (c < mr.fly) { refund(mine.bet); mine = null; netDirty = true; sfx('blip'); return; }
          if (c < mr.bust) cashOut(crMult(mr, c));
          return;
        }
        const bet = takeBet(amt);
        if (!bet) return;
        mine = { k: c < r.fly - 150 ? r.k : r.k + 1, bet, auto, cash: 0, lost: false };
        netDirty = true; listSig = '';
      }
      function cashOut(m) {
        if (!mine) return;
        const b = mine; mine = null;
        b.cash = m; done = b;
        const pay = payOf(b.bet, m);
        credit(pay);
        record('crash', b.bet, m, pay);
        sfx('csCash', m / 100);
        netDirty = true; listSig = '';
      }
      function tick(c) {
        const r = crAt(c);
        /* the history strip is logic, not decoration: it has to be right
           even for rounds that flew while you were on another table */
        while (histK < r.k || (histK === r.k && c >= r.bust)) {
          const hr = crRound(histK);
          if (histK === 0) hist.innerHTML = '';
          pushPill(hist, mxs(hr.cp), mxCls(hr.cp), 14);
          histK++;
        }
        if (!mine) return;
        const mr = crRound(mine.k);
        if (c < mr.fly) return;
        if (mine.auto && mine.auto <= mr.cp && c >= mr.fly + Math.log(mine.auto / 100) / CR_K) { cashOut(mine.auto); return; }
        if (c >= mr.bust) {
          const b = mine; mine = null;
          b.lost = true; done = b;
          record('crash', b.bet, 0, 0);
          netDirty = true; listSig = '';
        }
      }
      function settle(c) {
        if (!mine) return;
        const mr = crRound(mine.k);
        if (c < mr.fly) { refund(mine.bet); mine = null; }
        else if (c < mr.bust) cashOut(crMult(mr, c));
      }
      function netState() {
        const b = mine || done;
        return b ? [b.k, b.bet, b.cash || 0] : null;
      }
      function entries(r, c) {
        const out = [];
        const add = (p, bet, cash, isMe) => out.push({ name: p.name, bet, cash, lost: !cash && c >= r.bust, isMe, id: p.id });
        const mb = mine && mine.k === r.k ? mine : done && done.k === r.k ? done : null;
        if (mb) add(me, mb.bet, mb.cash, true);
        for (const b of bots) {
          const x = b.cr && b.cr.k === r.k ? { bet: b.cr.bet, cash: 0 } : b.crDone && b.crDone.k === r.k ? b.crDone : null;
          if (x) add(b, x.bet, x.cash, false);
        }
        const m = crMult(r, c);
        for (const p of players.values()) {
          if (p.me || p.bot || !p.crash || p.crash[0] !== r.k) continue;
          /* someone else's cash-out is only shown once YOUR rocket has
             passed it — otherwise a clock a hair behind theirs would learn
             how high this round goes before it got there */
          const cash = p.crash[2] || 0;
          add(p, p.crash[1], cash && (c >= r.bust || m >= cash) ? cash : 0, false);
        }
        out.sort((a, b) => b.bet - a.bet);
        return out;
      }
      function paintList(r, c) {
        const list = entries(r, c);
        const sig = r.k + '|' + (c >= r.bust ? 1 : 0) + '|' + list.map(e => e.id + ':' + e.bet + ':' + e.cash).join(',');
        if (sig === listSig) return;
        listSig = sig;
        setText(liveN, String(list.length));
        setText(liveT, money(list.reduce((a, e) => a + e.bet, 0)));
        liveRows.innerHTML = list.length ? list.map(e =>
          '<div class="cs-lv' + (e.cash ? ' won' : e.lost ? ' lost' : '') + (e.isMe ? ' me' : '') + '">' +
          '<span class="n">' + esc(e.name) + '</span><span class="b num">' + money(e.bet) + '</span>' +
          '<span class="c num">' + (e.cash ? mxs(e.cash) : e.lost ? 'bust' : '—') + '</span></div>').join('')
          : '<div class="cs-empty">No bets in this round yet.</div>';
      }
      function paintBtn(r, c) {
        let cls = 'cs-go', txt, sub = '', dis = false;
        if (!live()) { txt = 'Bet'; dis = true; }
        else if (mine) {
          const mr = crRound(mine.k);
          if (c < mr.fly) { cls += ' red'; txt = 'Cancel bet'; sub = mine.k === r.k ? 'Waiting for take-off' : 'Queued for the next round'; }
          else { cls += ' cash'; txt = 'Cash out'; sub = money(payOf(mine.bet, crMult(mr, c))); }
        } else { txt = c < r.fly - 150 ? 'Bet' : 'Bet next round'; }
        const sig = cls + txt + sub + dis;
        if (sig === btnSig) return;
        btnSig = sig;
        go.className = cls; go.disabled = dis;
        go.innerHTML = esc(txt) + (sub ? '<small class="num">' + esc(sub) + '</small>' : '');
        amt.lock(!!mine); autoIn.disabled = !!mine;
      }
      function draw(now, dt, c) {
        const r = crAt(c);
        const phase = c < r.fly ? 'bet' : c < r.bust ? 'fly' : 'post';
        if (phase !== lastPhase || r.k !== lastK) {
          if (phase === 'post' && lastPhase === 'fly' && r.k === lastK) {
            board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
            sfx('csCrash');
          }
          if (phase === 'fly' && lastPhase === 'bet') sfx('csLaunch');
          cm.className = 'cs-cm' + (phase === 'bet' ? ' wait' : phase === 'post' ? ' bust' : '');
          lastPhase = phase; lastK = r.k;
        }
        if (phase === 'bet') {
          setText(cmX, Math.max(0, (r.fly - c) / 1000).toFixed(1) + 's');
          setText(cmL, 'Next round in');
          cmBar.style.width = Math.max(0, Math.min(100, (c - r.start) / CR_BET * 100)) + '%';
        } else if (phase === 'fly') {
          const m = crMult(r, c);
          /* the engine runs only while the clock does, so a paused solo
             round freezes the rocket and its sound together */
          if (c !== lastC) { lastC = c; sfx('csEngine', m / 100); }
          setText(cmX, mxs(m));
          setText(cmL, mine && mine.k === r.k ? 'Cash out ' + money(payOf(mine.bet, m)) : 'Current payout');
        } else {
          setText(cmX, mxs(r.cp));
          setText(cmL, 'Crashed');
        }
        if (now - listAt > 180) { listAt = now; paintList(r, c); }
        paintBtn(r, c);
        drawGraph(now, r, c, phase);
      }
      function drawGraph(now, r, c, phase) {
        const g = G.g, W = G.W, H = G.H;
        g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const L = 46, B = 26, T = 14, RR = 22;
        const gw = Math.max(10, W - L - RR), gh = Math.max(10, H - T - B);
        const el = phase === 'bet' ? 0 : Math.min(c, r.bust) - r.fly;
        const m = Math.exp(CR_K * el);
        const tMax = Math.max(9000, el * 1.16), mMax = Math.max(2, 1 + (m - 1) * 1.25);
        const X = t => L + t / tMax * gw, Y = x => T + gh - (x - 1) / (mMax - 1) * gh;
        const ys = [.2, .5, 1, 2, 5, 10, 25, 50, 100, 250, 500].find(s => (mMax - 1) / s <= 5) || 1000;
        g.font = '600 11px ui-sans-serif,system-ui,sans-serif';
        g.lineWidth = 1;
        g.textAlign = 'right'; g.textBaseline = 'middle';
        for (let y = 1; y <= mMax + 1e-9; y += ys) {
          const py = Math.round(Y(y)) + .5;
          g.strokeStyle = 'rgba(255,255,255,.05)';
          g.beginPath(); g.moveTo(L, py); g.lineTo(L + gw, py); g.stroke();
          g.fillStyle = '#5d7487';
          g.fillText((ys < 1 ? y.toFixed(1) : Math.round(y)) + '×', L - 8, py);
        }
        const xs = [1, 2, 5, 10, 15, 30, 60].find(s => tMax / 1000 / s <= 7) || 120;
        g.textAlign = 'center'; g.textBaseline = 'top';
        for (let s = xs; s * 1000 <= tMax; s += xs) { g.fillStyle = '#5d7487'; g.fillText(s + 's', X(s * 1000), T + gh + 8); }
        if (phase === 'bet') return;
        const bust = phase === 'post';
        const N = 90, pts = [];
        for (let i = 0; i <= N; i++) { const t = el * i / N; pts.push([X(t), Y(Math.exp(CR_K * t))]); }
        const fill = g.createLinearGradient(0, T, 0, T + gh);
        fill.addColorStop(0, bust ? 'rgba(255,77,104,.28)' : 'rgba(31,220,124,.32)');
        fill.addColorStop(1, bust ? 'rgba(255,77,104,0)' : 'rgba(31,220,124,0)');
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) g.lineTo(p[0], p[1]);
        g.lineTo(pts[N][0], Y(1)); g.closePath();
        g.fillStyle = fill; g.fill();
        const line = g.createLinearGradient(L, 0, pts[N][0] + 1, 0);
        if (bust) { line.addColorStop(0, '#ff8597'); line.addColorStop(1, '#ff4d68'); }
        else { line.addColorStop(0, '#1fdc7c'); line.addColorStop(.75, '#7dffb8'); line.addColorStop(1, m > 10 ? '#ffc93f' : '#b8ffd8'); }
        g.save();
        g.shadowColor = bust ? 'rgba(255,77,104,.8)' : 'rgba(31,220,124,.85)'; g.shadowBlur = 16;
        g.strokeStyle = line; g.lineWidth = 4.5; g.lineJoin = 'round'; g.lineCap = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) g.lineTo(p[0], p[1]);
        g.stroke();
        g.restore();
        const [hx, hy] = pts[N], [px, py] = pts[N - 3];
        const ang = Math.atan2(hy - py, hx - px);
        if (bust) {
          /* the burst where it gave out, fading over the pause */
          const k = Math.min(1, (c - r.bust) / 900);
          g.save(); g.translate(hx, hy);
          g.globalAlpha = 1 - k;
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU + r.k, d0 = 8 + k * 26, d1 = 16 + k * 46;
            g.strokeStyle = i % 2 ? '#ffc93f' : '#ff4d68'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); g.lineTo(Math.cos(a) * d1, Math.sin(a) * d1); g.stroke();
          }
          g.restore();
          return;
        }
        g.save(); g.translate(hx, hy); g.rotate(ang);
        const fl = 11 + Math.sin(now / 45) * 3 + Math.sin(now / 17) * 1.5;
        const fg = g.createLinearGradient(-10 - fl, 0, -8, 0);
        fg.addColorStop(0, 'rgba(255,90,40,0)'); fg.addColorStop(1, 'rgba(255,201,63,.95)');
        g.fillStyle = fg;
        g.beginPath(); g.moveTo(-8, -4.5); g.quadraticCurveTo(-10 - fl, 0, -8, 4.5); g.closePath(); g.fill();
        g.fillStyle = '#ff4d68';
        g.beginPath(); g.moveTo(-9, -3); g.lineTo(-13, -8.5); g.lineTo(-4, -4); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-9, 3); g.lineTo(-13, 8.5); g.lineTo(-4, 4); g.closePath(); g.fill();
        g.fillStyle = '#eef5fb';
        g.beginPath(); g.ellipse(1, 0, 12, 5.6, 0, 0, TAU); g.fill();
        g.fillStyle = '#ff4d68';
        g.beginPath(); g.moveTo(8, -4.6); g.quadraticCurveTo(16, 0, 8, 4.6); g.closePath(); g.fill();
        g.fillStyle = '#48a8ff';
        g.beginPath(); g.arc(2, 0, 2.3, 0, TAU); g.fill();
        g.restore();
      }
      return { id: 'crash', name: 'Crash', icon: I.crash, hot: true, build, tick, draw, settle, netState,
               hotkey: press, busy: () => !!mine };
    })();

    /* ============================================================ MINES === */
    const Mines = (() => {
      let amt, sel, go, rndBtn, kNext, kProfit, grid, resEl, board, tiles = [];
      let count = 3, st = null, resT = 0;
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-mboard"><div class="cs-mgrid idle"></div></div>' +
          '<div class="cs-res"><div class="x cn num"></div><div class="p num"></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        board = view.querySelector('.cs-board');
        amt = amountField(); ctl.appendChild(amt.el);
        const f = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Mines</span><span class="aux num"></span></div><div class="cs-sel"><select aria-label="Mines"></select></div>');
        sel = f.querySelector('select');
        for (let i = 1; i <= 24; i++) sel.appendChild(new Option(i + (i === 1 ? ' mine' : ' mines'), i));
        sel.value = count;
        sel.onchange = () => { count = +sel.value; refresh(); sfx('blip'); };
        ctl.appendChild(f);
        kNext = kv('Next tile'); kProfit = kv('Profit', 'g');
        ctl.appendChild(kNext); ctl.appendChild(kProfit);
        go = mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
        rndBtn = mk('button', 'cs-btn2', 'Pick a random tile');
        rndBtn.onclick = () => {
          if (!st) return;
          const free = [];
          for (let i = 0; i < 25; i++) if (!st.open.has(i)) free.push(i);
          if (free.length) pick(free[rint(free.length)]);
        };
        ctl.appendChild(rndBtn);
        ctl.appendChild(mk('div', 'cs-note', 'Every gem raises the multiplier. Cash out whenever you like — hit a mine and the stake is gone.'));
        grid = view.querySelector('.cs-mgrid'); resEl = view.querySelector('.cs-res');
        for (let i = 0; i < 25; i++) {
          const t = mk('button', 'cs-t', '<span class="f fr"></span><span class="f bk"></span>');
          t.setAttribute('aria-label', 'Tile ' + (i + 1));
          t.onclick = () => pick(i);
          grid.appendChild(t); tiles.push(t);
        }
        refresh();
      }
      function face(t, kind) {
        clearTimeout(t._clr);
        t.querySelector('.bk').innerHTML = kind === 'gem' ? I.gem : I.bomb;
        t.classList.add('rev', kind === 'gem' ? 'gem' : 'mine');
      }
      function reset() {
        for (const t of tiles) {
          t.classList.remove('rev', 'gem', 'mine', 'hit', 'dim');
          clearTimeout(t._clr);
          t._clr = setTimeout(() => { t.querySelector('.bk').innerHTML = ''; }, 480);
        }
        resEl.classList.remove('on');
      }
      function press() {
        if (st) { if (st.open.size) cashOut(); return; }
        const bet = takeBet(amt);
        if (!bet) return;
        reset();
        const mines = new Set();
        while (mines.size < count) mines.add(rint(25));
        st = { bet, n: count, mines, open: new Set(), mx: 100 };
        refresh();
      }
      function pick(i) {
        if (!st || st.open.has(i)) return;
        const t = tiles[i];
        if (st.mines.has(i)) {
          const s = st; st = null;
          face(t, 'mine'); t.classList.add('hit');
          board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
          sfx('csBoom');
          record('mines', s.bet, 0, 0);
          revealRest(s);
          showRes(false, 0, -s.bet);
          refresh();
          return;
        }
        st.open.add(i);
        face(t, 'gem');
        sfx('csGem', st.open.size);
        st.mx = minesMx(st.n, st.open.size);
        if (st.open.size === 25 - st.n) cashOut();
        else refresh();
      }
      function cashOut(quiet) {
        const s = st; st = null;
        const pay = payOf(s.bet, s.mx);
        credit(pay);
        record('mines', s.bet, s.mx, pay);
        if (!quiet) { sfx('csCash', s.mx / 100); revealRest(s); showRes(true, s.mx, pay - s.bet); }
        refresh();
      }
      function revealRest(s) {
        let d = 0;
        tiles.forEach((t, i) => {
          if (t.classList.contains('rev')) return;
          const kind = s.mines.has(i) ? 'mine' : 'gem';
          setTimeout(() => { face(t, kind); t.classList.add('dim'); }, 120 + (d++) * 22);
        });
      }
      function showRes(win, mx, profit) {
        resEl.className = 'cs-res' + (win ? '' : ' lose');
        resEl.querySelector('.x').textContent = win ? mxs(mx) : 'Boom';
        resEl.querySelector('.p').textContent = (profit >= 0 ? '+' : '−') + money(Math.abs(profit));
        requestAnimationFrame(() => resEl.classList.add('on'));
        clearTimeout(resT);
        resT = setTimeout(() => resEl.classList.remove('on'), 1900);
      }
      function refresh() {
        if (!go) return;
        const n = st ? st.n : count;
        const opened = st ? st.open.size : 0;
        setText(kNext.v, opened >= 25 - n ? '—' : mxs(minesMx(n, opened + 1)));
        const bet = st ? st.bet : betAmt;
        setText(kProfit.v, '+' + money(payOf(bet, st ? st.mx : 100) - bet));
        sel.parentNode.previousSibling.querySelector('.aux').textContent = (25 - count) + ' gems';
        if (st) {
          go.className = 'cs-go cash'; go.disabled = !opened;
          go.innerHTML = 'Cash out<small class="num">' + money(payOf(st.bet, st.mx)) + '</small>';
        } else { go.className = 'cs-go'; go.disabled = false; go.textContent = 'Bet'; }
        sel.disabled = !!st; amt.lock(!!st); rndBtn.disabled = !st;
        grid.classList.toggle('idle', !st);
      }
      function settle() {
        if (!st) return;
        if (st.open.size) cashOut(true);
        else { refund(st.bet); st = null; refresh(); }
      }
      return { id: 'mines', name: 'Mines', icon: I.mines, hot: true, build, settle, refresh, hotkey: press, busy: () => !!st };
    })();

    /* =========================================================== PLINKO === */
    const Plinko = (() => {
      let amt, go, riskSeg, rowsSel, G, lockEl;
      let risk = 'med', rows = 16;
      const balls = [], floats = [];
      let glow = {}, hitAt = [], lastPing = 0, idleDrawn = false;
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"></div>';
        const ctl = view.querySelector('.cs-ctl');
        amt = amountField(); ctl.appendChild(amt.el);
        const rf = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Risk</span></div>');
        riskSeg = seg([['low', 'Low'], ['med', 'Medium'], ['high', 'High']], risk, v => { risk = v; idleDrawn = false; });
        rf.appendChild(riskSeg.el); ctl.appendChild(rf);
        const sf = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Rows</span></div><div class="cs-sel"><select aria-label="Rows"></select></div>');
        rowsSel = sf.querySelector('select');
        for (let n = 8; n <= 16; n++) rowsSel.appendChild(new Option(n + ' rows', n));
        rowsSel.value = rows;
        rowsSel.onchange = () => { rows = +rowsSel.value; glow = {}; hitAt = []; idleDrawn = false; sfx('blip'); };
        ctl.appendChild(sf);
        go = mk('button', 'cs-go', 'Drop ball'); go.onclick = drop; ctl.appendChild(go);
        lockEl = mk('div', 'cs-note', 'Drop as many as you like. Risk and rows lock while balls are falling.');
        ctl.appendChild(lockEl);
        G = canvasIn(view.querySelector('.cs-board'));
      }
      function drop() {
        if (balls.length >= 40) return;
        const bet = takeBet(amt);
        if (!bet) return;
        const path = [];
        let k = 0;
        for (let i = 0; i < rows; i++) { const d = rnd() < .5 ? 1 : 0; path.push(d); k += d; }
        const tbl = PLINKO[rows][risk];
        balls.push({ path, k, n: rows, risk, bet, mx: Math.round(tbl[k] * 100), t0: performance.now(), seg: 0,
                     D: Math.max(105, Math.min(190, 2000 / rows)), jx: (rnd() - .5) * .3 });
        lock();
      }
      function lock() { const on = balls.length > 0; riskSeg.lock(on); rowsSel.disabled = on; }
      function land(b, now) {
        const pay = payOf(b.bet, b.mx);
        credit(pay);
        record('plinko', b.bet, b.mx, pay);
        hitAt[b.k] = now;
        floats.push({ k: b.k, t: now, txt: mxs(b.mx), good: b.mx >= 100 });
        if (now) sfx('csLand', b.mx / 100);
      }
      function tick() {
        const now = performance.now();
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          if (now - b.t0 >= (b.n + 1) * b.D) { balls.splice(i, 1); land(b, now); }
        }
        if (!balls.length) lock();
      }
      function settle() { while (balls.length) land(balls.shift(), 0); lock(); }
      function geo() {
        const W = G.W, H = G.H, n = rows;
        const s = Math.max(8, Math.min((W - 28) / (n + 2), (H - 26) / (n + 1.7)));
        const bh = Math.min(s * .78, 34);
        const contentH = s * (n + .6) + bh;
        const y0 = Math.max(s * 1.1, (H - contentH) / 2 + s * .9);
        return { s, bh, cx: W / 2, y0, yb: y0 + (n - 1) * s + s * .95, pr: Math.max(2.2, s * .1), br: Math.max(4, s * .25), n };
      }
      function bucketColor(k, n) {
        const f = Math.abs(k - n / 2) / (n / 2);
        const A = [255, 201, 63], M = [255, 138, 61], Z = [255, 59, 92];
        const lerp3 = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
        const c = f < .5 ? lerp3(A, M, f * 2) : lerp3(M, Z, (f - .5) * 2);
        return c;
      }
      function ballPos(b, now, q) {
        const e = now - b.t0;
        const j = Math.min(b.n, Math.floor(e / b.D));
        const u = Math.min(1, (e - j * b.D) / b.D);
        const pt = i => {
          if (i === 0) return [q.cx + b.jx * q.s, q.y0 - q.s * 1.05];
          const r = i - 1;
          let R = 0; for (let t = 0; t < Math.min(r, b.n); t++) R += b.path[t];
          if (i <= b.n) return [q.cx + (R - r / 2) * q.s, q.y0 + r * q.s - q.pr - q.br * .9];
          return [q.cx + (b.k - b.n / 2) * q.s, q.yb - q.br];
        };
        const a = pt(j), c = pt(j + 1);
        const x = a[0] + (c[0] - a[0]) * u;
        const hop = j === 0 ? 0 : q.s * .32 * 4 * u * (1 - u);
        const y = a[1] + (c[1] - a[1]) * u * u - hop;
        return { x, y, seg: j };
      }
      function draw(now) {
        const busy = balls.length || floats.length || hitAt.some(t => t && now - t < 500) || Object.keys(glow).length;
        if (!busy && idleDrawn && !G.dirty) return;
        idleDrawn = !busy; G.dirty = false;
        const g = G.g, q = geo();
        g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        g.clearRect(0, 0, G.W, G.H);
        /* pegs */
        for (let r = 0; r < q.n; r++) for (let k = 0; k < r + 3; k++) {
          const x = q.cx + (k - (r + 2) / 2) * q.s, y = q.y0 + r * q.s;
          const key = r * 32 + k, gt = glow[key];
          let a = 0;
          if (gt) { a = 1 - (now - gt) / 380; if (a <= 0) { delete glow[key]; a = 0; } }
          if (a > 0) {
            g.fillStyle = 'rgba(255,255,255,' + (a * .22) + ')';
            g.beginPath(); g.arc(x, y, q.pr * (2.6 + a * 1.6), 0, TAU); g.fill();
          }
          g.fillStyle = a > 0 ? '#ffffff' : '#c9d6e2';
          g.beginPath(); g.arc(x, y, q.pr * (1 + a * .35), 0, TAU); g.fill();
        }
        /* buckets */
        const tbl = PLINKO[q.n][risk];
        const fsz = Math.max(8, Math.min(13, q.s * .34));
        g.font = '800 ' + fsz + 'px ui-sans-serif,system-ui,sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let k = 0; k <= q.n; k++) {
          const x = q.cx + (k - q.n / 2) * q.s, w = q.s * .88;
          const ht = hitAt[k] ? (now - hitAt[k]) / 420 : 1;
          const bounce = ht < 1 ? Math.sin(ht * Math.PI) * q.bh * .32 * (1 - ht) : 0;
          const [cr, cg, cb] = bucketColor(k, q.n);
          const y = q.yb - q.bh / 2 + bounce;
          g.fillStyle = 'rgb(' + Math.round(cr * .55) + ',' + Math.round(cg * .55) + ',' + Math.round(cb * .55) + ')';
          rrect(g, x - w / 2, y + 3, w, q.bh, 5); g.fill();
          g.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
          if (ht < 1) { g.save(); g.shadowColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',.9)'; g.shadowBlur = 18 * (1 - ht); }
          rrect(g, x - w / 2, y, w, q.bh, 5); g.fill();
          if (ht < 1) g.restore();
          const v = tbl[k];
          g.fillStyle = '#2a1204';
          g.fillText(v >= 100 ? String(v) : String(+v.toFixed(1)) + (q.s > 34 ? '×' : ''), x, y + q.bh / 2 + .5);
        }
        /* balls */
        for (const b of balls) {
          if (b.n !== q.n) continue;
          const p = ballPos(b, now, q);
          if (p.seg > b.seg) {
            for (let s2 = b.seg + 1; s2 <= Math.min(p.seg, b.n); s2++) {
              const r = s2 - 1;
              let R = 0; for (let t = 0; t < r; t++) R += b.path[t];
              glow[r * 32 + R + 1] = now;
              if (now - lastPing > 45) { lastPing = now; sfx('csPeg', r); }
            }
            b.seg = p.seg;
          }
          const gr = g.createRadialGradient(p.x - q.br * .35, p.y - q.br * .4, q.br * .1, p.x, p.y, q.br);
          gr.addColorStop(0, '#ffd1dd'); gr.addColorStop(.5, '#ff5a86'); gr.addColorStop(1, '#d11c4c');
          g.save(); g.shadowColor = 'rgba(255,70,120,.7)'; g.shadowBlur = 12;
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, q.br, 0, TAU); g.fill();
          g.restore();
        }
        /* what each landing paid, rising off its bucket */
        for (let i = floats.length - 1; i >= 0; i--) {
          const f = floats[i], k = (now - f.t) / 900;
          if (k >= 1 || !f.t) { floats.splice(i, 1); continue; }
          const x = q.cx + (f.k - q.n / 2) * q.s;
          g.globalAlpha = 1 - k * k;
          g.fillStyle = f.good ? '#1fdc7c' : '#8ba3b6';
          g.font = '800 ' + Math.round(fsz * 1.25) + 'px ui-sans-serif,system-ui,sans-serif';
          g.fillText(f.txt, x, q.yb - q.bh - 6 - easeOut(k) * 34);
          g.globalAlpha = 1;
        }
      }
      return { id: 'plinko', name: 'Plinko', icon: I.plinko, hot: true, build, tick, draw, settle,
               hotkey: drop, busy: () => balls.length > 0 };
    })();
    function rrect(g, x, y, w, h, r) {
      g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
      g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
    }
    /* A segmented control whose highlight slides to the choice. */
    function seg(opts, val, on) {
      const el = mk('div', 'cs-seg');
      const pillEl = mk('span', 'pill'); el.appendChild(pillEl);
      const btns = opts.map(([v, l]) => { const b = mk('button', v === val ? 'on' : '', esc(l)); b.dataset.v = v; el.appendChild(b); return b; });
      const place = () => {
        const b = btns.find(x => x.classList.contains('on')); if (!b) return;
        pillEl.style.width = b.offsetWidth + 'px';
        pillEl.style.transform = 'translateX(' + (b.offsetLeft - 3) + 'px)';
      };
      el.onclick = e => {
        const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return;
        btns.forEach(x => x.classList.toggle('on', x === b));
        place(); sfx('blip'); on(b.dataset.v);
      };
      new ResizeObserver(place).observe(el);
      return { el, lock(v) { el.classList.toggle('lock', v); }, set(v) { btns.forEach(x => x.classList.toggle('on', x.dataset.v === v)); place(); } };
    }

    /* ============================================================= DICE === */
    const Dice = (() => {
      let amt, go, kProfit, bar, loEl, hiEl, handle, mark, markV, inMult, btnOver, inChance, histEl;
      let over = true, target = 5050, drag = false;
      const chance = () => over ? 10000 - target : target;             // hundredths of a percent
      const multX = () => Math.floor(990000 / chance() + 1e-7);       // hundredths
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-dice">' +
          '<div class="cs-dhist"></div>' +
          '<div class="cs-dtrack"><div class="cs-dbar"><span class="lo"></span><span class="hi"></span>' +
          '<div class="cs-dmark"><span class="cn num">50.00</span></div><div class="cs-dhandle"><i></i><i></i><i></i></div></div>' +
          '<div class="cs-dticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>' +
          '<div class="cs-dfields">' +
            '<div class="cs-fld"><span class="cap">Multiplier</span><input class="cs-in mu" inputmode="decimal"></div>' +
            '<div class="cs-fld"><span class="cap">Roll over / under</span><button class="cs-btn2 ou"></button></div>' +
            '<div class="cs-fld"><span class="cap">Win chance</span><input class="cs-in ch" inputmode="decimal"></div>' +
          '</div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        amt = amountField(); ctl.appendChild(amt.el);
        kProfit = kv('Profit on win', 'g'); ctl.appendChild(kProfit);
        go = mk('button', 'cs-go', 'Roll'); go.onclick = roll; ctl.appendChild(go);
        ctl.appendChild(mk('div', 'cs-note', 'Drag the slider or type a multiplier. The lower the chance, the bigger the payout.'));
        bar = view.querySelector('.cs-dbar'); loEl = bar.querySelector('.lo'); hiEl = bar.querySelector('.hi');
        handle = bar.querySelector('.cs-dhandle'); mark = bar.querySelector('.cs-dmark'); markV = mark.querySelector('span');
        inMult = view.querySelector('.mu'); btnOver = view.querySelector('.ou'); inChance = view.querySelector('.ch');
        histEl = view.querySelector('.cs-dhist');
        const fromX = e => {
          const r = bar.getBoundingClientRect();
          let p = Math.round((e.clientX - r.left) / r.width * 10000);
          p = Math.max(200, Math.min(9800, p));
          target = over ? Math.max(200, Math.min(9800, p)) : p;
          paint();
        };
        bar.addEventListener('pointerdown', e => { drag = true; bar.setPointerCapture(e.pointerId); fromX(e); });
        bar.addEventListener('pointermove', e => { if (drag) fromX(e); });
        bar.addEventListener('pointerup', () => { drag = false; sfx('blip'); });
        btnOver.onclick = () => { over = !over; target = 10000 - target; paint(); sfx('blip'); };
        inMult.addEventListener('change', () => {
          const x = parseFloat(inMult.value);
          if (isFinite(x) && x > 1) { const ch = Math.max(200, Math.min(9800, Math.round(9900 / x))); target = over ? 10000 - ch : ch; }
          paint();
        });
        inChance.addEventListener('change', () => {
          const x = parseFloat(inChance.value);
          if (isFinite(x)) { const ch = Math.max(200, Math.min(9800, Math.round(x * 100))); target = over ? 10000 - ch : ch; }
          paint();
        });
        paint();
      }
      function paint() {
        const t = target / 100;
        loEl.style.width = t + '%'; hiEl.style.width = (100 - t) + '%';
        bar.classList.toggle('under', !over);
        handle.style.left = t + '%';
        if (document.activeElement !== inMult) inMult.value = (multX() / 100).toFixed(4);
        if (document.activeElement !== inChance) inChance.value = (chance() / 100).toFixed(2);
        btnOver.textContent = (over ? 'Over ' : 'Under ') + t.toFixed(2);
        refresh();
      }
      function refresh() { if (kProfit) setText(kProfit.v, '+' + money(payOf(betAmt, multX()) - betAmt)); }
      function roll() {
        const bet = takeBet(amt);
        if (!bet) return;
        const res = rint(10001);
        const win = over ? res > target : res < target;
        const mx = win ? multX() : 0, pay = payOf(bet, mx);
        mark.classList.add('on');
        mark.style.left = res / 100 + '%';
        markV.textContent = (res / 100).toFixed(2);
        mark.classList.remove('w', 'l', 'pop'); void mark.offsetWidth;
        mark.classList.add(win ? 'w' : 'l', 'pop');
        pushPill(histEl, (res / 100).toFixed(2), win ? 'g' : 'r', 6);
        sfx('csRoll');
        credit(pay);
        record('dice', bet, mx, pay);
        if (win) sfx('csCash', mx / 100);
      }
      return { id: 'dice', name: 'Dice', icon: I.dice, build, refresh, hotkey: roll };
    })();

    /* ============================================================ LIMBO === */
    const Limbo = (() => {
      let amt, go, tIn, kChance, kProfit, xEl, tEl, histEl;
      let target = 200, anim = null;
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-limbo"><div class="cs-rays"></div>' +
          '<div class="cs-lhist"></div><div class="x cn num">1.00×</div><div class="t">Target <b class="num">2.00×</b></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        amt = amountField(); ctl.appendChild(amt.el);
        const f = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Target multiplier</span></div><input class="cs-in" inputmode="decimal" aria-label="Target multiplier">');
        tIn = f.querySelector('input'); tIn.value = '2.00';
        tIn.addEventListener('change', () => {
          const x = parseFloat(String(tIn.value).replace(/[^0-9.]/g, ''));
          target = isFinite(x) ? Math.round(Math.max(1.01, Math.min(1000000, x)) * 100) : target;
          tIn.value = (target / 100).toFixed(2);
          refresh();
        });
        ctl.appendChild(f);
        kChance = kv('Win chance'); kProfit = kv('Profit on win', 'g');
        ctl.appendChild(kChance); ctl.appendChild(kProfit);
        go = mk('button', 'cs-go', 'Bet'); go.onclick = bet; ctl.appendChild(go);
        ctl.appendChild(mk('div', 'cs-note', 'Pick a multiplier. If the number that comes up reaches it, you are paid it.'));
        xEl = view.querySelector('.cs-limbo .x'); tEl = view.querySelector('.cs-limbo .t b'); histEl = view.querySelector('.cs-lhist');
        refresh();
      }
      function refresh() {
        if (!kChance) return;
        setText(kChance.v, (99 / (target / 100)).toFixed(target > 99000 ? 6 : 2) + '%');
        setText(kProfit.v, '+' + money(payOf(betAmt, target) - betAmt));
        setText(tEl, mxs(target));
      }
      function finish(a) {
        if (!a || a.done) return;
        a.done = true;
        xEl.textContent = mxs(a.res);
        xEl.classList.remove('w', 'l', 'pop'); void xEl.offsetWidth;
        xEl.classList.add(a.win ? 'w' : 'l', 'pop');
        pushPill(histEl, mxs(a.res), a.win ? 'g' : 'r', 6);
        credit(a.pay);
        record('limbo', a.bet, a.mx, a.pay);
        sfx(a.win ? 'csCash' : 'csLose', a.mx / 100);
        if (anim === a) anim = null;
      }
      function bet() {
        if (anim) finish(anim);
        const b = takeBet(amt);
        if (!b) return;
        const res = Math.min(100000000, Math.max(100, Math.floor(99 / (1 - rnd()))));
        const win = res >= target;
        anim = { bet: b, res, win, mx: win ? target : 0, pay: win ? payOf(b, target) : 0,
                 t0: performance.now(), dur: 420 + Math.min(520, Math.log(res / 100) * 110), done: false };
        xEl.classList.remove('w', 'l', 'pop');
        sfx('csRise', anim.dur / 1000);
      }
      function draw(now) {
        if (!anim) return;
        const k = Math.min(1, (now - anim.t0) / anim.dur);
        const v = Math.round(100 * Math.pow(anim.res / 100, easeOut4(k)));
        setText(xEl, mxs(k >= 1 ? anim.res : v));
        if (k >= 1) finish(anim);
      }
      function tick() { if (anim && performance.now() - anim.t0 > anim.dur + 60) finish(anim); }
      function settle() { if (anim) finish(anim); }
      return { id: 'limbo', name: 'Limbo', icon: I.limbo, build, draw, tick, settle, refresh, hotkey: bet, busy: () => !!anim };
    })();

    /* ============================================================= KENO === */
    const Keno = (() => {
      let amt, go, riskSel, kPicks, grid, pay, resEl, tiles = [];
      let risk = 'classic', picks = new Set(), draw = null;
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-keno"><div class="cs-kgrid"></div><div class="cs-kpay"></div></div>' +
          '<div class="cs-res"><div class="x cn num"></div><div class="p num"></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        amt = amountField(); ctl.appendChild(amt.el);
        const f = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Risk</span></div><div class="cs-sel"><select aria-label="Risk"></select></div>');
        riskSel = f.querySelector('select');
        [['classic', 'Classic'], ['low', 'Low'], ['med', 'Medium'], ['high', 'High']].forEach(([v, l]) => riskSel.appendChild(new Option(l, v)));
        riskSel.value = risk;
        riskSel.onchange = () => { risk = riskSel.value; paintPay(); sfx('blip'); };
        ctl.appendChild(f);
        kPicks = kv('Picked'); ctl.appendChild(kPicks);
        const row = mk('div', 'cs-row2');
        const ab = mk('button', 'cs-btn2', 'Auto pick'), cb = mk('button', 'cs-btn2', 'Clear');
        ab.onclick = () => { if (draw) return; clearMarks(); picks = new Set(); while (picks.size < 10) picks.add(1 + rint(40)); paintPicks(); sfx('csChip'); };
        cb.onclick = () => { if (draw) return; picks = new Set(); clearMarks(); paintPicks(); sfx('blip'); };
        row.appendChild(ab); row.appendChild(cb); ctl.appendChild(row);
        go = mk('button', 'cs-go', 'Bet'); go.onclick = bet; ctl.appendChild(go);
        ctl.appendChild(mk('div', 'cs-note', 'Pick up to ten numbers. Ten are drawn; the more of yours come up, the more it pays.'));
        grid = view.querySelector('.cs-kgrid'); pay = view.querySelector('.cs-kpay'); resEl = view.querySelector('.cs-res');
        for (let n = 1; n <= 40; n++) {
          const t = mk('button', 'cs-k num', String(n));
          t.onclick = () => {
            if (draw) return;
            clearMarks();
            if (picks.has(n)) picks.delete(n); else if (picks.size < 10) picks.add(n); else return;
            paintPicks(); sfx('csChip');
          };
          grid.appendChild(t); tiles.push(t);
        }
        paintPicks();
      }
      function clearMarks() { for (const t of tiles) t.classList.remove('drawn', 'hit'); resEl.classList.remove('on'); }
      function paintPicks() {
        tiles.forEach((t, i) => t.classList.toggle('pick', picks.has(i + 1)));
        setText(kPicks.v, picks.size + ' / 10');
        go.disabled = !picks.size;
        paintPay();
      }
      function paintPay(hits) {
        const n = picks.size;
        if (!n) { pay.innerHTML = '<div style="flex:1"><span>Pick numbers to see what they pay</span></div>'; return; }
        const t = KENO[risk][n];
        pay.innerHTML = t.map((x, h) => '<div' + (h === hits ? ' class="on"' : '') + '><b class="num">' + (x ? x + '×' : '0×') + '</b><span>' + h + ' hit' + (h === 1 ? '' : 's') + '</span></div>').join('');
      }
      function bet() {
        if (draw || !picks.size) return;
        const b = takeBet(amt);
        if (!b) return;
        clearMarks();
        const pool = []; for (let i = 1; i <= 40; i++) pool.push(i);
        for (let i = 39; i > 0; i--) { const j = rint(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const drawn = pool.slice(0, 10), n = picks.size;
        const hits = drawn.filter(x => picks.has(x)).length;
        const mx = Math.round(KENO[risk][n][hits] * 100);
        draw = { bet: b, drawn, hits, mx, pay: payOf(b, mx), i: 0, seen: 0, t: 0 };
        grid.classList.add('busy'); riskSel.disabled = true; amt.lock(true); go.disabled = true;
        step();
      }
      function step() {
        const d = draw; if (!d) return;
        if (d.i >= d.drawn.length) { finish(); return; }
        const n = d.drawn[d.i++], t = tiles[n - 1];
        const hit = picks.has(n);
        if (hit) d.seen++;
        t.classList.add(hit ? 'hit' : 'drawn');
        paintPay(d.seen);
        sfx(hit ? 'csGem' : 'csDraw', d.seen);
        d.t = setTimeout(step, 115);
      }
      function finish(quiet) {
        const d = draw; if (!d) return;
        clearTimeout(d.t);
        draw = null;
        if (quiet) for (; d.i < d.drawn.length; d.i++) tiles[d.drawn[d.i] - 1].classList.add(picks.has(d.drawn[d.i]) ? 'hit' : 'drawn');
        credit(d.pay);
        record('keno', d.bet, d.mx, d.pay);
        if (!quiet) {
          resEl.className = 'cs-res' + (d.mx >= 100 ? '' : ' lose');
          resEl.querySelector('.x').textContent = mxs(d.mx);
          resEl.querySelector('.p').textContent = d.hits + ' of ' + picks.size + ' · ' + (d.pay - d.bet >= 0 ? '+' : '−') + money(Math.abs(d.pay - d.bet));
          requestAnimationFrame(() => resEl.classList.add('on'));
          setTimeout(() => resEl.classList.remove('on'), 1800);
          sfx(d.mx > 100 ? 'csCash' : 'csLose', d.mx / 100);
        }
        grid.classList.remove('busy'); riskSel.disabled = false; amt.lock(false); go.disabled = !picks.size;
      }
      return { id: 'keno', name: 'Keno', icon: I.keno, build, settle: () => finish(true), hotkey: bet, busy: () => !!draw };
    })();

    /* ============================================================ WHEEL === */
    const Wheel = (() => {
      let amt, go, riskSel, segSel, legend, G;
      let risk = 'med', n = 30, segs = wheelSegs(risk, n), rot = 0, spin = null, lastTick = -1, flash = 0, flashK = -1;
      const colOf = x => x === 0 ? '#2b3f51' : x < 1.4 ? '#d6dee6' : x < 1.8 ? '#1fdc7c' : x < 2.5 ? '#ffc93f' : x < 5 ? '#a07dff' : '#ff4d68';
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"></div>';
        const ctl = view.querySelector('.cs-ctl');
        amt = amountField(); ctl.appendChild(amt.el);
        const f1 = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Risk</span></div><div class="cs-sel"><select aria-label="Risk"></select></div>');
        riskSel = f1.querySelector('select');
        [['low', 'Low'], ['med', 'Medium'], ['high', 'High']].forEach(([v, l]) => riskSel.appendChild(new Option(l, v)));
        riskSel.value = risk;
        const f2 = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Segments</span></div><div class="cs-sel"><select aria-label="Segments"></select></div>');
        segSel = f2.querySelector('select');
        [10, 20, 30, 40, 50].forEach(v => segSel.appendChild(new Option(v + ' segments', v)));
        segSel.value = n;
        const upd = () => { risk = riskSel.value; n = +segSel.value; segs = wheelSegs(risk, n); rot = 0; paintLegend(); G.dirty = true; sfx('blip'); };
        riskSel.onchange = upd; segSel.onchange = upd;
        ctl.appendChild(f1); ctl.appendChild(f2);
        go = mk('button', 'cs-go', 'Spin'); go.onclick = bet; ctl.appendChild(go);
        legend = mk('div', 'cs-kpay'); ctl.appendChild(legend);
        G = canvasIn(view.querySelector('.cs-board'));
        paintLegend();
      }
      function paintLegend() {
        const u = [...new Set(segs)].sort((a, b) => a - b);
        legend.innerHTML = u.map(x => {
          const c = segs.filter(v => v === x).length;
          return '<div style="border-color:' + colOf(x) + '66"><b class="num" style="color:' + colOf(x) + '">' + x.toFixed(2) + '×</b><span>' + (c / segs.length * 100).toFixed(0) + '%</span></div>';
        }).join('');
      }
      function bet() {
        if (spin) return;
        const b = takeBet(amt);
        if (!b) return;
        const k = rint(n), w = TAU / n;
        const want = -(k * w) - (rnd() - .5) * w * .7;
        const cur = rot % TAU;
        let delta = want - cur; while (delta < 0) delta += TAU;
        const turns = 4 + rint(2);
        spin = { bet: b, k, mx: Math.round(segs[k] * 100), from: rot, to: rot + delta + turns * TAU, t0: performance.now(), dur: 3200 + rnd() * 500 };
        riskSel.disabled = segSel.disabled = true; amt.lock(true); go.disabled = true;
      }
      function finish() {
        const s = spin; if (!s) return;
        spin = null; rot = s.to;
        const pay = payOf(s.bet, s.mx);
        credit(pay);
        record('wheel', s.bet, s.mx, pay);
        flash = performance.now(); flashK = s.k;
        sfx(s.mx > 100 ? 'csCash' : 'csLose', s.mx / 100);
        riskSel.disabled = segSel.disabled = false; amt.lock(false); go.disabled = false;
        G.dirty = true;
      }
      function tick() { if (spin && performance.now() - spin.t0 >= spin.dur) finish(); }
      function draw(now) {
        if (spin) {
          const k = Math.min(1, (now - spin.t0) / spin.dur);
          rot = spin.from + (spin.to - spin.from) * easeOut4(k);
          const seg = Math.floor(((-rot % TAU) + TAU) % TAU / (TAU / n) + .5);
          if (seg !== lastTick) { lastTick = seg; if (k < .97) sfx('csSpin'); }
          if (k >= 1) finish();
        } else if (!G.dirty && now - flash > 1400) return;
        G.dirty = false;
        const g = G.g, W = G.W, H = G.H;
        g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const R = Math.max(40, Math.min(W, H) / 2 - 34), cx = W / 2, cy = H / 2 + 12, w = TAU / n;
        g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30;
        g.fillStyle = '#0b1720'; g.beginPath(); g.arc(cx, cy, R + 12, 0, TAU); g.fill(); g.restore();
        for (let i = 0; i < n; i++) {
          const a0 = -Math.PI / 2 + rot + i * w - w / 2, a1 = a0 + w;
          g.fillStyle = colOf(segs[i]);
          g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0 + .004, a1 - .004); g.closePath(); g.fill();
        }
        /* the landed segment glows for a moment after the stop */
        if (flashK >= 0 && now - flash < 1400) {
          const a0 = -Math.PI / 2 + rot + flashK * w - w / 2;
          g.save(); g.globalAlpha = .55 * (1 - (now - flash) / 1400);
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R + 8, a0, a0 + w); g.closePath(); g.fill(); g.restore();
        }
        g.fillStyle = '#0e1c27'; g.beginPath(); g.arc(cx, cy, R * .72, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R * .72, 0, TAU); g.stroke();
        const last = spin ? null : segs[flashK];
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'italic 800 ' + Math.round(R * .3) + 'px "Barlow Condensed",ui-sans-serif,sans-serif';
        g.fillStyle = last == null ? '#8ba3b6' : colOf(last) === '#2b3f51' ? '#8ba3b6' : colOf(last);
        g.fillText(last == null ? (spin ? '' : 'SPIN') : last.toFixed(2) + '×', cx, cy + 2);
        /* the pointer */
        g.save(); g.translate(cx, cy - R - 6);
        const wob = spin ? Math.sin(now / 30) * .12 * (1 - Math.min(1, (now - spin.t0) / spin.dur)) : 0;
        g.rotate(wob);
        g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
        g.fillStyle = '#ff4d68';
        g.beginPath(); g.moveTo(-13, -16); g.lineTo(13, -16); g.lineTo(0, 12); g.closePath(); g.fill();
        g.restore();
      }
      return { id: 'wheel', name: 'Wheel', icon: I.wheel, build, draw, tick, settle: finish, hotkey: bet, busy: () => !!spin };
    })();

    /* ------------------------------------------------------------ cards --- */
    const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newCard = () => ({ r: 1 + rint(13), s: rint(4) });
    function cardEl(c, down, dx, dy) {
      const red = c.s === 1 || c.s === 2;
      const e = mk('div', 'cs-cardc deal' + (down ? ' down' : ''));
      if (dx != null) { e.style.setProperty('--dx', dx + 'px'); e.style.setProperty('--dy', dy + 'px'); }
      e.innerHTML = '<div class="in"><div class="fa' + (red ? ' red' : '') + '"><span class="r cn">' + RANKS[c.r] + '</span><span class="s">' + SUIT[c.s] + '</span>' +
        '<span class="big">' + SUIT[c.s] + '</span></div><div class="ba"></div></div>';
      return e;
    }

    /* ============================================================= HILO === */
    const Hilo = (() => {
      let amt, go, skipBtn, gBox, kMult, kProfit, main, strip, board, resEl;
      let card = newCard(), st = null, gSig = '';
      function opts(r) {
        if (r === 1) return [{ k: 'hi', l: 'Higher', ic: I.up, p: 12 / 13, t: n => n > r }, { k: 'eq', l: 'Same', ic: I.eq, p: 1 / 13, t: n => n === r }];
        if (r === 13) return [{ k: 'lo', l: 'Lower', ic: I.down, p: 12 / 13, t: n => n < r }, { k: 'eq', l: 'Same', ic: I.eq, p: 1 / 13, t: n => n === r }];
        return [{ k: 'hi', l: 'Higher or same', ic: I.up, p: (14 - r) / 13, t: n => n >= r }, { k: 'lo', l: 'Lower or same', ic: I.down, p: r / 13, t: n => n <= r }];
      }
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-hilo">' +
          '<div class="cs-hmain"><div class="cs-hside">' + I.up + '<span>King is the highest</span></div><div class="slot" style="--cw:clamp(96px,11vw,150px)"></div>' +
          '<div class="cs-hside">' + I.down + '<span>Ace is the lowest</span></div></div><div class="cs-hstrip"></div></div>' +
          '<div class="cs-res"><div class="x cn num"></div><div class="p num"></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        board = view.querySelector('.cs-board');
        amt = amountField(); ctl.appendChild(amt.el);
        gBox = mk('div', 'cs-guess'); ctl.appendChild(gBox);
        skipBtn = mk('button', 'cs-btn2', 'Skip card'); skipBtn.onclick = skip; ctl.appendChild(skipBtn);
        kMult = kv('Total multiplier'); kProfit = kv('Profit', 'g');
        ctl.appendChild(kMult); ctl.appendChild(kProfit);
        go = mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
        main = view.querySelector('.slot'); strip = view.querySelector('.cs-hstrip'); resEl = view.querySelector('.cs-res');
        show(card, true);
        refresh();
      }
      function show(c, instant) {
        const e = cardEl(c, !instant, 0, -40);
        main.innerHTML = ''; main.appendChild(e);
        if (!instant) setTimeout(() => e.classList.remove('down'), 90);
        sfx('csCard');
      }
      function addStrip(c, tag, cls) {
        const e = mk('div', 'st ' + (cls || ''));
        e.appendChild(cardEl(c, false));
        e.appendChild(mk('span', 'tg', tag));
        strip.appendChild(e);
        e.scrollIntoView && strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
      }
      function press() {
        if (st) { if (st.mx > 100) cashOut(); return; }
        const b = takeBet(amt);
        if (!b) return;
        st = { bet: b, x: 1, mx: 100, n: 0 };
        strip.innerHTML = '';
        addStrip(card, 'Start');
        resEl.classList.remove('on');
        refresh();
      }
      function skip() {
        if (st && st.busy) return;
        const prev = card;
        card = newCard();
        if (st) addStrip(prev, 'Skip');
        show(card);
        refresh();
      }
      function guess(o) {
        if (!st || st.busy) return;
        const next = newCard();
        const ok = o.t(next.r);
        st.busy = true;
        card = next;
        show(next);
        setTimeout(() => {
          if (!st) return;
          st.busy = false;
          if (ok) {
            st.x *= .99 / o.p; st.n++;
            st.mx = Math.floor(st.x * 100 + 1e-7);
            addStrip(next, mxs(st.mx), 'w');
            sfx('csGem', st.n);
          } else {
            const s = st; st = null;
            addStrip(next, 'Bust', 'l');
            record('hilo', s.bet, 0, 0);
            board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
            sfx('csLose');
            res(false, 0, -s.bet);
          }
          refresh();
        }, 420);
        refresh();
      }
      function cashOut(quiet) {
        const s = st; st = null;
        const pay = payOf(s.bet, s.mx);
        credit(pay);
        record('hilo', s.bet, s.mx, pay);
        if (!quiet) { sfx('csCash', s.mx / 100); res(true, s.mx, pay - s.bet); }
        refresh();
      }
      function res(win, mx, profit) {
        resEl.className = 'cs-res' + (win ? '' : ' lose');
        resEl.querySelector('.x').textContent = win ? mxs(mx) : 'Bust';
        resEl.querySelector('.p').textContent = (profit >= 0 ? '+' : '−') + money(Math.abs(profit));
        requestAnimationFrame(() => resEl.classList.add('on'));
        setTimeout(() => resEl.classList.remove('on'), 1700);
      }
      function refresh() {
        if (!gBox) return;
        const list = opts(card.r);
        const sig = card.r + '|' + (st ? (st.busy ? 'b' : 'a') : 'i');
        if (sig !== gSig) { gSig = sig; gBox.innerHTML = ''; for (const o of list) {
          const b = mk('button', 'cs-btn2', '<b style="display:flex;align-items:center;gap:8px">' + o.ic + esc(o.l) + '</b><span class="num">' +
            (o.p * 100).toFixed(1) + '% · ' + mxs(Math.floor(.99 / o.p * 100)) + '</span>');
          b.disabled = !st || !!st.busy;
          b.onclick = () => guess(o);
          gBox.appendChild(b);
        } }
        skipBtn.disabled = !!(st && st.busy);
        setText(kMult.v, st ? mxs(st.mx) : '1.00×');
        setText(kProfit.v, st ? '+' + money(payOf(st.bet, st.mx) - st.bet) : '+0.00');
        if (st) { go.className = 'cs-go cash'; go.disabled = st.mx <= 100 || !!st.busy; go.innerHTML = 'Cash out<small class="num">' + money(payOf(st.bet, st.mx)) + '</small>'; }
        else { go.className = 'cs-go'; go.disabled = false; go.textContent = 'Bet'; }
        amt.lock(!!st);
      }
      function settle() {
        if (!st) return;
        if (st.mx > 100) cashOut(true);
        else { refund(st.bet); st = null; refresh(); }
      }
      return { id: 'hilo', name: 'Hilo', icon: I.hilo, build, settle, refresh, hotkey: press, busy: () => !!st };
    })();

    /* ======================================================== BLACKJACK ===
       Infinite shoe, dealer stands on all 17s and peeks for blackjack,
       blackjack pays 3 to 2, double on any first two, split once. */
    const Blackjack = (() => {
      let amt, go, btnHit, btnStand, btnDbl, btnSplit, dRow, dCards, dVal, pWrap, board;
      let st = null, busy = false, q = [];
      const val = cards => {
        let t = 0, aces = 0;
        for (const c of cards) { const v = c.r === 1 ? 11 : Math.min(10, c.r); t += v; if (c.r === 1) aces++; }
        while (t > 21 && aces) { t -= 10; aces--; }
        return { t, soft: aces > 0 };
      };
      const isBJ = cards => cards.length === 2 && val(cards).t === 21;
      const v10 = r => Math.min(10, r);
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-bj" style="--cw:clamp(70px,8vw,104px)">' +
          '<div class="cs-bjrow dealer"><div class="cs-bjlabel">DEALER</div><div class="cs-bjcards"></div><div class="cs-bjv num">0</div></div>' +
          '<div class="cs-bjrow"><div class="cs-bjhands"></div><div class="cs-bjlabel">YOU</div></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        board = view.querySelector('.cs-board');
        amt = amountField(); ctl.appendChild(amt.el);
        const grid = mk('div', 'cs-bjbtns');
        btnHit = mk('button', 'cs-btn2', 'Hit'); btnStand = mk('button', 'cs-btn2', 'Stand');
        btnDbl = mk('button', 'cs-btn2', 'Double'); btnSplit = mk('button', 'cs-btn2', 'Split');
        [btnHit, btnStand, btnDbl, btnSplit].forEach(b => grid.appendChild(b));
        btnHit.onclick = () => act('hit'); btnStand.onclick = () => act('stand');
        btnDbl.onclick = () => act('double'); btnSplit.onclick = () => act('split');
        ctl.appendChild(grid);
        go = mk('button', 'cs-go', 'Deal'); go.onclick = deal; ctl.appendChild(go);
        ctl.appendChild(mk('div', 'cs-note', 'Blackjack pays 3 to 2. Dealer stands on 17 and checks for blackjack first.'));
        dCards = view.querySelector('.dealer .cs-bjcards'); dVal = view.querySelector('.dealer .cs-bjv');
        pWrap = view.querySelector('.cs-bjhands');
        refresh();
      }
      /* a little queue so cards land one after another rather than in a heap */
      function later(fn, ms) { q.push(setTimeout(() => { q.shift(); fn(); }, ms)); }
      function flush() { for (const t of q) clearTimeout(t); q = []; }
      function handEl(h, i) {
        const e = mk('div', 'cs-bjhand');
        e.innerHTML = '<div class="cs-bjcards"></div><div class="cs-bjv num">0</div>';
        h.el = e; h.cardsEl = e.querySelector('.cs-bjcards'); h.valEl = e.querySelector('.cs-bjv');
        pWrap.appendChild(e);
        return e;
      }
      function give(h, down) {
        const c = newCard();
        h.cards.push(c);
        h.cardsEl.appendChild(cardEl(c, down, 220, -180));
        sfx('csCard');
        paintVals();
        return c;
      }
      function paintVals() {
        if (!st) return;
        for (const h of st.hands) {
          const v = val(h.cards);
          h.valEl.textContent = isBJ(h.cards) && st.hands.length === 1 ? 'BJ' : (v.soft && v.t < 21 ? (v.t - 10) + '/' + v.t : v.t);
          h.el.classList.toggle('act', st.phase === 'play' && st.hands[st.at] === h);
        }
        const hidden = st.phase === 'deal' || st.phase === 'play';
        const shown = hidden ? st.dealer.cards.slice(0, 1) : st.dealer.cards;
        const dv = val(shown);
        dVal.textContent = dv.soft && dv.t < 21 && hidden ? (dv.t - 10) + '/' + dv.t : dv.t;
      }
      function deal() {
        if (st && st.phase !== 'done') return;
        const b = takeBet(amt);
        if (!b) return;
        flush();
        dCards.innerHTML = ''; pWrap.innerHTML = '';
        dVal.className = 'cs-bjv num';
        st = { hands: [], at: 0, phase: 'deal', dealer: { cards: [], el: null } };
        const h = { cards: [], bet: b, done: false, doubled: false };
        st.hands.push(h); handEl(h, 0);
        st.dealer.cardsEl = dCards; st.dealer.valEl = dVal;
        busy = true; refresh();
        later(() => give(h), 60);
        later(() => { const c = newCard(); st.dealer.cards.push(c); dCards.appendChild(cardEl(c, false, 220, -120)); sfx('csCard'); paintVals(); }, 340);
        later(() => give(h), 620);
        later(() => { const c = newCard(); st.dealer.cards.push(c); dCards.appendChild(cardEl(c, true, 220, -120)); sfx('csCard'); }, 900);
        later(afterDeal, 1180);
      }
      function afterDeal() {
        busy = false;
        const up = st.dealer.cards[0];
        const pbj = isBJ(st.hands[0].cards);
        const dbj = isBJ(st.dealer.cards);
        if ((up.r === 1 || v10(up.r) === 10) && dbj) { reveal(); finish(); return; }     // the peek
        if (pbj) { reveal(); finish(); return; }
        st.phase = 'play';
        paintVals(); refresh();
      }
      function reveal() {
        const hole = dCards.children[1];
        if (hole) hole.classList.remove('down');
        st.phase = 'dealer';
        paintVals();
      }
      function act(a) {
        if (!st || st.phase !== 'play' || busy) return;
        const h = st.hands[st.at];
        if (a === 'hit') {
          give(h);
          if (val(h.cards).t >= 21) next();
        } else if (a === 'stand') {
          next();
        } else if (a === 'double') {
          if (h.cards.length !== 2) return;
          const extra = takeBet(amt, h.bet);
          if (!extra) return;
          h.bet += extra; h.doubled = true;
          give(h);
          next();
        } else if (a === 'split') {
          if (st.hands.length > 1 || h.cards.length !== 2 || v10(h.cards[0].r) !== v10(h.cards[1].r)) return;
          const extra = takeBet(amt, h.bet);
          if (!extra) return;
          const h2 = { cards: [h.cards.pop()], bet: extra, done: false };
          st.hands.push(h2);
          h.cardsEl.lastChild.remove();
          handEl(h2, 1);
          h2.cardsEl.appendChild(cardEl(h2.cards[0], false, -80, 0));
          busy = true;
          later(() => give(h), 200);
          later(() => { give(h2); busy = false; if (h.cards[0].r === 1) { st.at = 1; next(); } else refresh(); paintVals(); }, 480);
        }
        refresh();
      }
      function next() {
        st.hands[st.at].done = true;
        if (st.at < st.hands.length - 1) { st.at++; paintVals(); refresh(); return; }
        reveal();
        busy = true; refresh();
        const live = st.hands.some(h => val(h.cards).t <= 21);
        const drawTo = () => {
          const d = val(st.dealer.cards);
          if (live && d.t < 17) {
            later(() => { const c = newCard(); st.dealer.cards.push(c); dCards.appendChild(cardEl(c, false, 220, -120)); sfx('csCard'); paintVals(); drawTo(); }, 520);
          } else later(finish, 420);
        };
        later(drawTo, 380);
      }
      function finish() {
        busy = false;
        const d = val(st.dealer.cards).t, dbj = isBJ(st.dealer.cards);
        let bet = 0, pay = 0;
        for (const h of st.hands) {
          const p = val(h.cards).t, bj = isBJ(h.cards) && st.hands.length === 1;
          let x;
          if (p > 21) x = 0;
          else if (bj && !dbj) x = 250;
          else if (dbj && !bj) x = 0;
          else if (bj && dbj) x = 100;
          else if (d > 21 || p > d) x = 200;
          else if (p === d) x = 100;
          else x = 0;
          const hp = payOf(h.bet, x);
          bet += h.bet; pay += hp;
          h.valEl.classList.add(x > 100 ? 'w' : x === 100 ? 'p' : 'l');
        }
        if (d > 21) dVal.classList.add('l');
        st.phase = 'done';
        const mx = bet ? Math.floor(pay * 100 / bet) : 0;
        credit(pay);
        record('blackjack', bet, mx, pay);
        sfx(pay > bet ? 'csCash' : pay === bet ? 'blip' : 'csLose', mx / 100);
        paintVals(); refresh();
      }
      function refresh() {
        if (!go) return;
        const play = st && st.phase === 'play' && !busy;
        const h = play ? st.hands[st.at] : null;
        btnHit.disabled = btnStand.disabled = !play;
        btnDbl.disabled = !(play && h.cards.length === 2 && me.bal >= h.bet);
        btnSplit.disabled = !(play && st.hands.length === 1 && h.cards.length === 2 && v10(h.cards[0].r) === v10(h.cards[1].r) && me.bal >= h.bet);
        const idle = !st || st.phase === 'done';
        go.disabled = !idle; amt.lock(!idle);
        go.textContent = 'Deal';
      }
      /* the buzzer stands every open hand and lets the dealer finish */
      function settle() {
        if (!st || st.phase === 'done') return;
        flush();
        if (st.phase === 'deal') {
          while (st.hands[0].cards.length < 2) st.hands[0].cards.push(newCard());
          while (st.dealer.cards.length < 2) st.dealer.cards.push(newCard());
        }
        for (const h of st.hands) h.done = true;
        const live = st.hands.some(h => val(h.cards).t <= 21);
        while (live && val(st.dealer.cards).t < 17) st.dealer.cards.push(newCard());
        finish();
      }
      return { id: 'blackjack', name: 'Blackjack', icon: I.blackjack, build, settle, refresh, hotkey: deal, busy: () => !!st && st.phase !== 'done' };
    })();

    /* ===================================================== DRAGON TOWER === */
    const Tower = (() => {
      let amt, sel, go, rndBtn, kNext, kProfit, tg, board, resEl, rowEls = [];
      let diff = 'easy', st = null;
      const LEVELS = 9;
      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board"><div class="cs-tower"><div class="cs-tgrid idle"></div></div>' +
          '<div class="cs-res"><div class="x cn num"></div><div class="p num"></div></div></div>';
        const ctl = view.querySelector('.cs-ctl');
        board = view.querySelector('.cs-board');
        amt = amountField(); ctl.appendChild(amt.el);
        const f = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Difficulty</span></div><div class="cs-sel"><select aria-label="Difficulty"></select></div>');
        sel = f.querySelector('select');
        for (const k in TOWER) sel.appendChild(new Option(TOWER[k].l + ' · ' + TOWER[k].e + ' of ' + TOWER[k].c + ' safe', k));
        sel.value = diff;
        sel.onchange = () => { diff = sel.value; layout(); refresh(); sfx('blip'); };
        ctl.appendChild(f);
        kNext = kv('Next row'); kProfit = kv('Profit', 'g');
        ctl.appendChild(kNext); ctl.appendChild(kProfit);
        go = mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
        rndBtn = mk('button', 'cs-btn2', 'Pick a random tile');
        rndBtn.onclick = () => { if (st) pick(st.lvl, rint(TOWER[st.d].c)); };
        ctl.appendChild(rndBtn);
        ctl.appendChild(mk('div', 'cs-note', 'Climb one row at a time. Eggs are safe, a skull ends the climb. Cash out on any row.'));
        tg = view.querySelector('.cs-tgrid'); resEl = view.querySelector('.cs-res');
        layout(); refresh();
      }
      function layout() {
        tg.innerHTML = ''; rowEls = [];
        const c = TOWER[diff].c;
        for (let r = 0; r < LEVELS; r++) {
          const row = mk('div', 'cs-trow');
          row.style.gridTemplateColumns = 'repeat(' + c + ',1fr)';
          row.appendChild(mk('span', 'ml num', mxs(towerMx(diff, r + 1))));
          const cells = [];
          for (let i = 0; i < c; i++) {
            const t = mk('button', 'cs-t', '<span class="f fr"></span><span class="f bk"></span>');
            t.onclick = () => pick(r, i);
            row.appendChild(t); cells.push(t);
          }
          row.cells = cells;
          tg.appendChild(row); rowEls.push(row);
        }
      }
      function face(t, egg, dim) {
        t.querySelector('.bk').innerHTML = egg ? I.egg : I.skull;
        t.classList.add('rev', egg ? 'gem' : 'mine');
        if (dim) t.classList.add('dim');
      }
      function press() {
        if (st) { if (st.lvl) cashOut(); return; }
        const b = takeBet(amt);
        if (!b) return;
        layout();
        const T = TOWER[diff], safe = [];
        for (let r = 0; r < LEVELS; r++) {
          const idx = []; for (let i = 0; i < T.c; i++) idx.push(i);
          for (let i = idx.length - 1; i > 0; i--) { const j = rint(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
          safe.push(new Set(idx.slice(0, T.e)));
        }
        st = { bet: b, d: diff, safe, lvl: 0, mx: 100 };
        resEl.classList.remove('on');
        refresh();
      }
      function pick(r, i) {
        if (!st || r !== st.lvl) return;
        const row = rowEls[r], t = row.cells[i];
        if (st.safe[r].has(i)) {
          face(t, true);
          row.classList.add('past');
          st.lvl++;
          st.mx = towerMx(st.d, st.lvl);
          sfx('csGem', st.lvl);
          if (st.lvl >= LEVELS) cashOut();
          else refresh();
        } else {
          const s = st; st = null;
          face(t, false); t.classList.add('hit');
          board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
          sfx('csFire');
          record('tower', s.bet, 0, 0);
          revealAll(s);
          res(false, 0, -s.bet);
          refresh();
        }
      }
      function revealAll(s) {
        let d = 0;
        rowEls.forEach((row, r) => row.cells.forEach((t, i) => {
          if (t.classList.contains('rev')) return;
          setTimeout(() => face(t, s.safe[r].has(i), true), 100 + (d++) * 14);
        }));
      }
      function cashOut(quiet) {
        const s = st; st = null;
        const pay = payOf(s.bet, s.mx);
        credit(pay);
        record('tower', s.bet, s.mx, pay);
        if (!quiet) { sfx('csCash', s.mx / 100); revealAll(s); res(true, s.mx, pay - s.bet); }
        refresh();
      }
      function res(win, mx, profit) {
        resEl.className = 'cs-res' + (win ? '' : ' lose');
        resEl.querySelector('.x').textContent = win ? mxs(mx) : 'Burnt';
        resEl.querySelector('.p').textContent = (profit >= 0 ? '+' : '−') + money(Math.abs(profit));
        requestAnimationFrame(() => resEl.classList.add('on'));
        setTimeout(() => resEl.classList.remove('on'), 1800);
      }
      function refresh() {
        if (!go) return;
        const lvl = st ? st.lvl : 0, d = st ? st.d : diff;
        rowEls.forEach((row, r) => row.classList.toggle('act', !!st && r === lvl));
        setText(kNext.v, lvl < LEVELS ? mxs(towerMx(d, lvl + 1)) : '—');
        const bet = st ? st.bet : betAmt;
        setText(kProfit.v, '+' + money(payOf(bet, st ? st.mx : 100) - bet));
        if (st) { go.className = 'cs-go cash'; go.disabled = !lvl; go.innerHTML = 'Cash out<small class="num">' + money(payOf(st.bet, st.mx)) + '</small>'; }
        else { go.className = 'cs-go'; go.disabled = false; go.textContent = 'Bet'; }
        sel.disabled = !!st; amt.lock(!!st); rndBtn.disabled = !st;
        tg.classList.toggle('idle', !st);
      }
      function settle() {
        if (!st) return;
        if (st.lvl) cashOut(true);
        else { refund(st.bet); st = null; refresh(); }
      }
      return { id: 'tower', name: 'Dragon Tower', icon: I.tower, build, settle, refresh, hotkey: press, busy: () => !!st };
    })();

    /* ========================================================== CHICKEN ===
       Across the road one lane at a time. Every lane pays more than the last
       and is likelier to have a car in it, and the chicken can step off the
       road whenever you like. Underneath it is Mines with one tile per step:
       a shuffled deck of 25 slots with 1, 3, 5 or 10 cars in it, so a lane
       pays exactly the odds of the slot you turn over, less 1%. */
    const Chicken = (() => {
      const DIFF = {
        easy: { m: 1, l: 'Easy' }, medium: { m: 3, l: 'Medium' },
        hard: { m: 5, l: 'Hard' }, hardcore: { m: 10, l: 'Hardcore' }
      };
      const CAR_COLS = ['#ff4d68', '#48a8ff', '#ffc93f', '#a07dff', '#1fdc7c', '#ff8a3d', '#e3e8ee'];
      const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const lanesOf = d => 25 - DIFF[d].m;
      let amt, sel, go, cashBtn, kNext, kProfit, G, board;
      let diff = 'easy', st = null, scene = null;
      let camX = 0, cars = [], parts = [], spawnAt = 0;

      function build(view) {
        view.innerHTML = '<div class="cs-ctl"></div><div class="cs-board cs-road"></div>';
        const ctl = view.querySelector('.cs-ctl');
        board = view.querySelector('.cs-board');
        amt = amountField(); ctl.appendChild(amt.el);
        const f = mk('div', 'cs-fld', '<div class="lab"><span class="cap">Difficulty</span></div><div class="cs-sel"><select aria-label="Difficulty"></select></div>');
        sel = f.querySelector('select');
        for (const k in DIFF) sel.appendChild(new Option(DIFF[k].l + ' · ' + lanesOf(k) + ' lanes', k));
        sel.value = diff;
        sel.onchange = () => { diff = sel.value; if (!st) resetScene(); refresh(); sfx('blip'); };
        ctl.appendChild(f);
        kNext = kv('Next lane'); kProfit = kv('Profit', 'g');
        ctl.appendChild(kNext); ctl.appendChild(kProfit);
        go = mk('button', 'cs-go', 'Bet'); go.onclick = press; ctl.appendChild(go);
        cashBtn = mk('button', 'cs-go cash', 'Cash out'); cashBtn.onclick = () => cashOut(); ctl.appendChild(cashBtn);
        ctl.appendChild(mk('div', 'cs-note', 'Every lane pays more than the last and is more likely to have a car in it. Step off the road whenever you like.'));
        G = canvasIn(board);
        /* tapping the next lane is the same as pressing Go */
        G.cv.addEventListener('pointerdown', e => {
          if (!st || st.busy) return;
          const r = G.cv.getBoundingClientRect(), q = geo();
          const lane = Math.floor((e.clientX - r.left + camX - q.SW) / q.LW) + 1;
          if (lane === st.pos + 1) step();
        });
        resetScene();
        refresh();
      }
      function resetScene() {
        scene = { lanes: st ? st.lanes : lanesOf(diff), m: st ? st.m : DIFF[diff].m, pos: 0, mode: st ? 'run' : 'idle',
                  hop: null, barrier: [], landAt: 0, deathCar: null, honked: false };
        cars = []; parts = [];
      }
      function press() {
        if (st) { step(); return; }
        const b = takeBet(amt);
        if (!b) return;
        const m = DIFF[diff].m, lanes = 25 - m;
        /* where the car is, decided now: lane i is a car with the chance of
           turning a mine over with i slots already gone */
        let deathAt = Infinity;
        for (let i = 0; i < lanes; i++) if (rnd() < m / (25 - i)) { deathAt = i + 1; break; }
        st = { bet: b, d: diff, m, lanes, deathAt, pos: 0, mx: 100, busy: false };
        resetScene();
        sfx('csCluck');
        refresh();
      }
      function step() {
        if (!st || st.busy || !live() || st.pos >= st.lanes) return;
        const q = geo(), now = performance.now();
        const to = st.pos + 1, dies = to === st.deathAt;
        st.busy = true;
        scene.hop = { from: st.pos, to, t0: now, dur: 380, dies, landed: false };
        if (dies) {
          scene.hop.hitAt = now + 380 + 170;
          scene.deathCar = { lane: to, hitAt: scene.hop.hitAt, v: q.H * 2.6, col: CAR_COLS[rint(3)] };
          scene.honked = false;
        } else {
          /* The barrier drops as it lands, and anything already coming down
             that lane either stops behind it or is well clear by then. */
          scene.barrier[to] = now + 140;
          const bar = q.y0 - q.LW * .95;
          for (const c of cars) if (c.lane === to) {
            if (c.y < bar - q.LW * .5) c.stopY = bar - q.LW * .52;
            else c.v = Math.max(c.v, q.H * 3);
          }
        }
        sfx('csHop');
        refresh();
      }
      function advance(now) {
        const h = scene && scene.hop;
        if (!h) return;
        if (!h.landed && now >= h.t0 + h.dur) {
          h.landed = true;
          scene.pos = h.to; scene.landAt = now;
          if (!h.dies && st && !h.cosmetic) {
            st.pos = h.to; st.mx = minesMx(st.m, st.pos); st.busy = false;
            sfx('csGem', st.pos); sfx('csCluck');
            if (st.pos >= st.lanes) cashOut(false, true);
            refresh();
          }
          if (!h.dies && scene.hop === h) scene.hop = null;      // a finish may have queued its own hop
        }
        if (h.dies && !scene.honked && now >= h.hitAt - 320) { scene.honked = true; sfx('csHonk'); }
        if (h.dies && h.landed && !h.hit && now >= h.hitAt) {
          h.hit = true;
          scene.hop = null;
          const s = st; st = null;
          scene.mode = 'dead'; scene.deadAt = now;
          if (s) record('chicken', s.bet, 0, 0);
          const q = geo();
          burst(q.SW + (h.to - .5) * q.LW, q.y0 - q.LW * .2, 22, 'f');
          board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
          sfx('csSmack');
          refresh();
        }
      }
      function cashOut(quiet, finish) {
        if (!st || (st.busy && !finish) || st.pos < 1) return;
        const s = st; st = null;
        const pay = payOf(s.bet, s.mx);
        credit(pay);
        record('chicken', s.bet, s.mx, pay);
        scene.mode = 'won'; scene.wonAt = performance.now();
        if (!quiet) {
          sfx(finish ? 'csBig' : 'csCash', s.mx / 100);
          const q = geo();
          burst(q.SW + (s.pos - .5) * q.LW, q.y0 - q.LW * .3, 36, 'c');
          /* made it all the way: one more hop, onto the far pavement */
          if (finish) scene.hop = { from: s.pos, to: s.pos + 1, t0: performance.now(), dur: 420, dies: false, landed: false, cosmetic: true };
        }
        refresh();
      }
      function settle() {
        if (!st) return;
        const h = scene.hop;
        if (h && h.dies) {                       // the step was taken; the car was coming
          const s = st; st = null; scene.mode = 'dead'; scene.hop = null;
          record('chicken', s.bet, 0, 0);
          refresh();
          return;
        }
        if (h && !h.landed) { st.pos = h.to; st.mx = minesMx(st.m, st.pos); scene.pos = h.to; scene.hop = null; }
        st.busy = false;
        if (st.pos >= 1) cashOut(true);
        else { refund(st.bet); st = null; scene.mode = 'idle'; refresh(); }
      }
      const shortX = x => { const v = x / 100; return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M×' : v >= 10000 ? Math.round(v / 1000) + 'K×' : v >= 1000 ? (v / 1000).toFixed(1) + 'K×' : v.toFixed(2) + '×'; };
      function refresh() {
        if (!go) return;
        const m = st ? st.m : DIFF[diff].m, pos = st ? st.pos : 0, lanes = 25 - m;
        setText(kNext.v, pos < lanes ? shortX(minesMx(m, pos + 1)) : '—');
        const bet = st ? st.bet : betAmt;
        setText(kProfit.v, '+' + money(payOf(bet, st ? st.mx : 100) - bet));
        if (st) {
          go.className = 'cs-go'; go.disabled = st.busy;
          go.innerHTML = 'Go<small class="num">next lane pays ' + shortX(minesMx(m, pos + 1)) + '</small>';
          cashBtn.style.display = '';
          cashBtn.disabled = st.busy || pos < 1;
          cashBtn.innerHTML = 'Cash out<small class="num">' + money(payOf(st.bet, st.mx)) + '</small>';
        } else {
          go.className = 'cs-go'; go.disabled = false; go.textContent = 'Bet';
          cashBtn.style.display = 'none';
        }
        sel.disabled = !!st; amt.lock(!!st);
      }

      /* ---------------------------------------------------------- scene -- */
      function geo() {
        const W = G.W, H = G.H;
        const LW = Math.max(76, Math.min(132, H * .21));
        const SW = LW * 1.4;
        const n = scene ? scene.lanes : lanesOf(diff);
        return { W, H, LW, SW, n, y0: H * .56, worldW: SW * 2 + n * LW };
      }
      const laneMid = (q, i) => i <= 0 ? q.SW * .5 : i > q.n ? q.SW + q.n * q.LW + q.SW * .45 : q.SW + (i - .5) * q.LW;
      function chickenX(q, now) {
        const h = scene.hop;
        if (h && !h.landed) {
          const u = Math.min(1, (now - h.t0) / h.dur);
          return laneMid(q, h.from) + (laneMid(q, h.to) - laneMid(q, h.from)) * eio(u);
        }
        return laneMid(q, scene.pos);
      }
      function burst(x, y, n, kind) {
        for (let i = 0; i < n; i++) parts.push({
          x, y, vx: (rnd() - .5) * (kind === 'c' ? 520 : 380), vy: -rnd() * (kind === 'c' ? 520 : 300) - 60,
          r: rnd() * TAU, vr: (rnd() - .5) * 9, t: 0, life: 1.1 + rnd() * .9, kind,
          col: kind === 'c' ? CAR_COLS[rint(CAR_COLS.length)] : '#f6f8fa'
        });
      }
      function draw(now, dt) {
        advance(now);
        if (!G || G.W < 2) return;
        const g = G.g, W = G.W, H = G.H, q = geo();
        const target = q.worldW <= W ? (q.worldW - W) / 2 : Math.max(0, Math.min(q.worldW - W, chickenX(q, now) - W * .32));
        camX += (target - camX) * Math.min(1, dt * 5);
        if (Math.abs(target - camX) < .5) camX = target;
        g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        g.save(); g.translate(-Math.round(camX), 0);
        drawRoad(g, q, now);
        drawCars(g, q, now, dt);
        drawHero(g, q, now);
        drawParts(g, dt);
        g.restore();
        /* the road fades out at the top and bottom into the board */
        const fade = g.createLinearGradient(0, 0, 0, H);
        fade.addColorStop(0, 'rgba(11,23,32,.85)'); fade.addColorStop(.14, 'rgba(11,23,32,0)');
        fade.addColorStop(.86, 'rgba(11,23,32,0)'); fade.addColorStop(1, 'rgba(11,23,32,.85)');
        g.fillStyle = fade; g.fillRect(0, 0, W, H);
      }
      function pavement(g, q, x, w, finish) {
        const H = q.H;
        g.fillStyle = '#353d4a'; g.fillRect(x, 0, w, H);
        g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1;
        const slab = w / 2.2;
        for (let yy = (x * .37) % slab; yy < H; yy += slab) { g.beginPath(); g.moveTo(x, yy + .5); g.lineTo(x + w, yy + .5); g.stroke(); }
        g.beginPath(); g.moveTo(x + w * .5 + .5, 0); g.lineTo(x + w * .5 + .5, H); g.stroke();
        const kx = finish ? x : x + w - 9;
        g.fillStyle = '#6b7788'; g.fillRect(kx, 0, 9, H);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(kx + (finish ? 7 : 0), 0, 2, H);
        if (!finish) return;
        /* chequered line and the golden egg waiting on the far side */
        const cs = 9;
        for (let r = 0; r * cs < H; r++) for (let c = 0; c < 2; c++) {
          g.fillStyle = (r + c) % 2 ? '#e9eef3' : '#1b2027';
          g.fillRect(x + 12 + c * cs, r * cs, cs, cs);
        }
        const ex = x + w * .64, ey = q.y0 - q.LW * .18, er = q.LW * .2;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(ex, q.y0 + q.LW * .12, er * 1.1, er * .32, 0, 0, TAU); g.fill();
        const eg = g.createRadialGradient(ex - er * .3, ey - er * .5, er * .1, ex, ey, er * 1.4);
        eg.addColorStop(0, '#fff3b8'); eg.addColorStop(.55, '#ffc93f'); eg.addColorStop(1, '#b8820a');
        g.fillStyle = eg; g.beginPath(); g.ellipse(ex, ey, er * .82, er * 1.05, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(ex - er * .28, ey - er * .38, er * .16, er * .28, -.3, 0, TAU); g.fill();
      }
      function drawRoad(g, q, now) {
        const { H, LW, SW, n, y0 } = q;
        pavement(g, q, 0, SW, false);
        const running = !!st;
        for (let i = 1; i <= n; i++) {
          const x = SW + (i - 1) * LW;
          if (x - camX > q.W + LW || x + LW - camX < -LW) continue;
          g.fillStyle = i % 2 ? '#22272e' : '#252a32';
          g.fillRect(x, 0, LW, H);
          if (i > 1) {
            g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 3; g.setLineDash([H * .055, H * .045]);
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
            g.setLineDash([]);
          }
          /* the cover in the middle of the lane, carrying what it pays */
          const passed = i <= scene.pos && !(scene.mode === 'dead' && i === scene.pos);
          const next = running && i === scene.pos + 1 && !scene.hop;
          const deadHere = scene.mode === 'dead' && i === scene.pos;
          const cx = x + LW / 2, cy = y0 + LW * .22, rx = LW * .37, ry = LW * .17;
          if (next) {
            const p = .5 + .5 * Math.sin(now / 220);
            g.fillStyle = 'rgba(31,220,124,' + (.14 + p * .16) + ')';
            g.beginPath(); g.ellipse(cx, cy, rx * (1.25 + p * .1), ry * (1.35 + p * .1), 0, 0, TAU); g.fill();
          }
          const cg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
          if (passed) { cg.addColorStop(0, '#ffe38a'); cg.addColorStop(1, '#d99a0f'); }
          else if (deadHere) { cg.addColorStop(0, '#ff7b8f'); cg.addColorStop(1, '#b0213a'); }
          else { cg.addColorStop(0, '#4a5463'); cg.addColorStop(1, '#2c333e'); }
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx, cy + 4, rx, ry, 0, 0, TAU); g.fill();
          g.fillStyle = cg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
          g.strokeStyle = passed ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.12)'; g.lineWidth = 1.5;
          g.beginPath(); g.ellipse(cx, cy, rx * .82, ry * .78, 0, 0, TAU); g.stroke();
          g.font = '800 ' + Math.round(LW * .16) + 'px ui-sans-serif,system-ui,sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = passed ? '#3a2600' : deadHere ? '#fff' : next ? '#eafff3' : '#aab6c3';
          g.fillText(shortX(minesMx(scene.m, i)), cx, cy + 1);
          const bt = scene.barrier[i];
          if (bt && now >= bt) barrier(g, x, y0 - LW * .95, LW, now - bt);
        }
        pavement(g, q, SW + n * LW, SW, true);
      }
      function barrier(g, x, y, LW, age) {
        const k = Math.min(1, age / 260), drop = (1 - easeOut(k)) * -LW * .6;
        const by = y + drop, w = LW * .84, x0 = x + (LW - w) / 2;
        g.save();
        g.globalAlpha = Math.min(1, age / 120);
        g.fillStyle = '#2b2f36';
        g.fillRect(x0 + 3, by - 4, 5, LW * .26); g.fillRect(x0 + w - 8, by - 4, 5, LW * .26);
        g.save();
        rrect(g, x0, by - LW * .09, w, LW * .13, 4); g.clip();
        g.fillStyle = '#f4f6f8'; g.fillRect(x0, by - LW * .09, w, LW * .13);
        g.fillStyle = '#ff4d68';
        for (let s = -LW; s < w + LW; s += LW * .2) {
          g.beginPath(); g.moveTo(x0 + s, by + LW * .04); g.lineTo(x0 + s + LW * .1, by + LW * .04);
          g.lineTo(x0 + s + LW * .2, by - LW * .09); g.lineTo(x0 + s + LW * .1, by - LW * .09); g.closePath(); g.fill();
        }
        g.restore();
        g.fillStyle = '#ffc93f';
        g.beginPath(); g.arc(x0 + 5, by - LW * .12, 3.2, 0, TAU); g.arc(x0 + w - 5, by - LW * .12, 3.2, 0, TAU); g.fill();
        g.restore();
      }
      function car(g, x, y, LW, col) {
        const w = LW * .5, h = LW * .86;
        g.save(); g.translate(x, y);
        const lg = g.createLinearGradient(0, h * .5, 0, h * .5 + LW * .7);
        lg.addColorStop(0, 'rgba(255,244,190,.26)'); lg.addColorStop(1, 'rgba(255,244,190,0)');
        g.fillStyle = lg;
        g.beginPath(); g.moveTo(-w * .42, h * .48); g.lineTo(w * .42, h * .48); g.lineTo(w * .8, h * .5 + LW * .7); g.lineTo(-w * .8, h * .5 + LW * .7); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,.4)'; rrect(g, -w / 2 + 4, -h / 2 + 7, w, h, w * .3); g.fill();
        g.fillStyle = col; rrect(g, -w / 2, -h / 2, w, h, w * .3); g.fill();
        g.fillStyle = 'rgba(255,255,255,.16)'; rrect(g, -w * .34, -h * .2, w * .68, h * .36, w * .18); g.fill();
        g.fillStyle = '#131c25'; rrect(g, -w * .37, h * .1, w * .74, h * .19, w * .12); g.fill();
        g.fillStyle = '#131c25'; rrect(g, -w * .32, -h * .36, w * .64, h * .12, w * .08); g.fill();
        g.fillStyle = '#fff5c4'; g.fillRect(-w * .42, h * .44, w * .22, h * .05); g.fillRect(w * .2, h * .44, w * .22, h * .05);
        g.fillStyle = '#ff3b5c'; g.fillRect(-w * .42, -h * .49, w * .2, h * .04); g.fillRect(w * .22, -h * .49, w * .2, h * .04);
        g.restore();
      }
      function drawCars(g, q, now, dt) {
        /* traffic only in lanes the chicken has not reached, and never the
           lane right in front of it — a car there would look like a verdict */
        if (now >= spawnAt) {
          spawnAt = now + 320 + rnd() * 620;
          const first = Math.max(scene.pos + 2, Math.floor((camX - q.SW) / q.LW) + 1);
          const last = Math.min(q.n, Math.ceil((camX + q.W - q.SW) / q.LW) + 1);
          if (first <= last) {
            const lane = first + rint(last - first + 1);
            if (!scene.barrier[lane] && !cars.some(c => c.lane === lane && c.y < q.LW * 1.6))
              cars.push({ lane, y: -q.LW, v: q.H * (.8 + rnd() * .8), col: CAR_COLS[rint(CAR_COLS.length)] });
          }
        }
        for (let i = cars.length - 1; i >= 0; i--) {
          const c = cars[i];
          c.y += c.v * dt;
          if (c.stopY != null && c.y > c.stopY) { c.y = c.stopY; c.v = 0; }
          if (c.y > q.H + q.LW || (c.lane <= scene.pos && c.v === 0 && !scene.barrier[c.lane])) { cars.splice(i, 1); continue; }
          car(g, q.SW + (c.lane - .5) * q.LW, c.y, q.LW, c.col);
        }
        const dc = scene.deathCar;
        if (dc) {
          const y = q.y0 - (dc.hitAt - now) / 1000 * dc.v;
          if (y > q.H + q.LW) scene.deathCar = null;
          else if (y > -q.LW) car(g, q.SW + (dc.lane - .5) * q.LW, y, q.LW, dc.col);
        }
      }
      function drawHero(g, q, now) {
        const h = scene.hop, s = q.LW * .62;
        const x = chickenX(q, now);
        let y = q.y0 + q.LW * .16, sx = 1, sy = 1, mode = scene.mode;
        if (h && !h.landed) {
          const u = Math.min(1, (now - h.t0) / h.dur);
          y -= Math.sin(u * Math.PI) * q.LW * .5;
          sx = 1 - Math.sin(u * Math.PI) * .06; sy = 1 + Math.sin(u * Math.PI) * .1;
        } else if (now - scene.landAt < 240) {
          const k = (now - scene.landAt) / 240;
          sx = 1 + Math.sin(k * Math.PI) * .12; sy = 1 - Math.sin(k * Math.PI) * .14;
        }
        if (mode === 'won' && !(h && !h.landed)) {
          const e = now - scene.wonAt;
          y -= Math.abs(Math.sin(e / 170)) * q.LW * .16 * Math.max(0, 1 - e / 2600);
        }
        chicken(g, x, y, s, now, mode, sx, sy);
      }
      function chicken(g, x, y, s, now, mode, sx, sy) {
        g.save(); g.translate(x, y);
        g.fillStyle = 'rgba(0,0,0,.3)';
        g.beginPath(); g.ellipse(0, 2, s * .34 * (mode === 'dead' ? 1.5 : 1), s * .08, 0, 0, TAU); g.fill();
        if (mode === 'dead') { g.scale(1.45, .3); sx = sy = 1; }
        g.scale(sx, sy);
        const bob = mode === 'idle' || mode === 'run' ? Math.sin(now / 280) * s * .015 : 0;
        g.translate(0, -s * .4 + bob);
        /* legs and feet */
        g.strokeStyle = '#f59e0b'; g.lineWidth = Math.max(2, s * .055); g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(-s * .07, s * .2); g.lineTo(-s * .09, s * .38); g.lineTo(-s * .01, s * .39);
        g.moveTo(s * .08, s * .2); g.lineTo(s * .07, s * .38); g.lineTo(s * .15, s * .39);
        g.stroke();
        /* tail */
        g.fillStyle = '#e4e8ee';
        g.beginPath(); g.moveTo(-s * .26, -s * .06); g.lineTo(-s * .47, -s * .25); g.lineTo(-s * .4, -s * .07);
        g.lineTo(-s * .5, -s * .12); g.lineTo(-s * .34, s * .06); g.closePath(); g.fill();
        /* body */
        const bg = g.createRadialGradient(-s * .06, -s * .12, s * .04, 0, 0, s * .4);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#dde3ea');
        g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, s * .33, s * .27, 0, 0, TAU); g.fill();
        /* wing */
        g.fillStyle = '#d3dae3';
        const flap = mode === 'won' ? Math.sin(now / 60) * .5 : 0;
        g.save(); g.translate(-s * .05, s * .02); g.rotate(-.35 + flap);
        g.beginPath(); g.ellipse(0, 0, s * .17, s * .1, 0, 0, TAU); g.fill(); g.restore();
        /* head, comb, beak, wattle, eye */
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(s * .2, -s * .27, s * .155, 0, TAU); g.fill();
        g.fillStyle = '#ef3b54';
        g.beginPath(); g.arc(s * .13, -s * .42, s * .055, 0, TAU); g.arc(s * .2, -s * .44, s * .06, 0, TAU); g.arc(s * .27, -s * .41, s * .05, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(s * .31, -s * .17, s * .035, s * .055, 0, 0, TAU); g.fill();
        g.fillStyle = '#f59e0b';
        g.beginPath(); g.moveTo(s * .33, -s * .3); g.lineTo(s * .46, -s * .25); g.lineTo(s * .33, -s * .21); g.closePath(); g.fill();
        if (mode === 'dead') {
          g.strokeStyle = '#1b2027'; g.lineWidth = Math.max(1.5, s * .03);
          g.beginPath(); g.moveTo(s * .2, -s * .33); g.lineTo(s * .27, -s * .26); g.moveTo(s * .27, -s * .33); g.lineTo(s * .2, -s * .26); g.stroke();
        } else {
          const blink = (now % 3400) < 110 ? .15 : 1;
          g.fillStyle = '#1b2027';
          g.beginPath(); g.ellipse(s * .245, -s * .3, s * .028, s * .028 * blink, 0, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(s * .252, -s * .308, s * .009, 0, TAU); g.fill();
        }
        g.restore();
      }
      function drawParts(g, dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt;
          if (p.t > p.life) { parts.splice(i, 1); continue; }
          if (p.kind === 'f') { p.vy = Math.min(p.vy + 300 * dt, 70); p.vx *= Math.pow(.2, dt); p.x += Math.sin(p.t * 7 + p.r) * 30 * dt; }
          else { p.vy += 620 * dt; p.vx *= Math.pow(.5, dt); }
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r);
          g.globalAlpha = Math.max(0, Math.min(1, (p.life - p.t) * 2));
          g.fillStyle = p.col;
          if (p.kind === 'f') { g.beginPath(); g.ellipse(0, 0, 8, 2.8, 0, 0, TAU); g.fill(); }
          else g.fillRect(-4.5, -2.5, 9, 5);
          g.restore();
        }
      }
      return { id: 'chicken', name: 'Chicken', icon: I.chicken, tag: 'NEW', build, draw, refresh, settle,
               tick: () => { if (scene) advance(performance.now()); }, hotkey: press, busy: () => !!st };
    })();

    /* =========================================================== wiring === */
    GAMES.push(Crash, Mines, Plinko, Chicken, Dice, Limbo, Keno, Wheel, Hilo, Blackjack, Tower);
    GBY = {};
    for (const g of GAMES) GBY[g.id] = g;
    for (const g of GAMES) {
      const b = mk('button', 'cs-nb', g.icon + '<span>' + esc(g.name) + '</span>' + (g.tag || g.hot ? '<b class="tag' + (g.tag ? ' new' : '') + '">' + (g.tag || 'HOT') + '</b>' : '') + '<i class="dot"></i>');
      b.title = g.name;
      b.onclick = () => { if (curGame !== g) { open(g.id); sfx('blip'); } root.classList.remove('side'); };
      navEl.appendChild(b); g.nb = b;
      const v = mk('div', 'cs-view'); v.dataset.g = g.id; areaEl.appendChild(v); g.view = v;
    }
    function open(id) {
      const g = GBY[id] || Crash;
      if (!g.built) { g.build(g.view); g.built = true; }
      for (const x of GAMES) { x.view.classList.toggle('on', x === g); x.nb.classList.toggle('on', x === g); }
      curGame = g;
      try { api.save('table', g.id); } catch (e) {}
      if (g.refresh) g.refresh();
    }
    let firstTable = 'crash';
    try { firstTable = api.load('table', 'crash') || 'crash'; } catch (e) {}
    open(firstTable);
    /* a clicked button keeps focus, and Space on a focused button clicks it —
       which, with Space also being the bet key, would bet twice */
    root.addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.blur(); });

    /* ======================================================= the match ==== */
    const countEl = coverEl.querySelector('.cs-count');
    const pop = e => { e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); };
    const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
    function begin() {
      started = true;
      countEl.textContent = 'GO!'; pop(countEl);
      coverEl.querySelector('.sub').innerHTML = MINUTES + (MINUTES === 1 ? ' minute' : ' minutes') + ' on the clock — <b>most chips wins</b>';
      sfx('csGo');
      setTimeout(() => { if (!ended) coverEl.classList.remove('on'); }, 850);
      lbDirty = true;
    }
    function endMatch(c) {
      if (ended) return;
      ended = true;
      const cEnd = Math.min(c, MATCH_MS);
      /* The buzzer settles everything on the table: a climb in progress is
         cashed at its current multiplier, a rocket still in the air pays
         where it is, a hand still open stands, falling balls land. Nobody
         loses a stake to the clock and nobody wins one from it. */
      for (const g of GAMES) if (g.built && g.settle) { try { g.settle(cEnd); } catch (e) {} }
      if (!Crash.built) { try { Crash.settle(cEnd); } catch (e) {} }
      settleBots(cEnd);
      netDirty = true; netLast = 0; netTick();
      paintLB();
      sfx('csEnd');
      showEnd();
      setTimeout(finish, 4300);
    }
    function showEnd() {
      const arr = standings();
      const place = arr.indexOf(me) + 1;
      const top = arr.slice(0, 3);
      const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
      coverEl.innerHTML = '<div class="cs-end"><div class="ttl cn">TIME!</div><div class="cs-pod">' +
        order.map(p => {
          const i = arr.indexOf(p);
          return '<div class="cs-pd p' + (i + 1) + (p.me ? ' me' : '') + '" style="animation-delay:' + (.35 + (2 - i) * .2) + 's">' +
            '<span class="av" style="background:hsl(' + hueOf(p.name) + ' 55% 40%)">' + esc(initials(p.name)) + '</span>' +
            '<span class="nm">' + esc(p.me && p.name !== 'You' ? p.name + ' (you)' : p.name) + '</span><span class="bv num">' + money(p.bal) + '</span>' +
            '<div class="blk cn">' + (i + 1) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="you">' + (arr.length > 1 ? 'You finished <b>' + ordinal(place) + '</b> with ' : 'You finished with ') +
        '<b>' + money(me.bal) + '</b> chips</div></div>';
      coverEl.classList.add('on');
    }
    function finish() {
      if (dead) return;
      const arr = standings();
      const place = arr.indexOf(me) + 1;
      const score = Math.max(0, Math.round(me.bal / 100));
      if (ONLINE) { try { R.finish(score); } catch (e) {} }
      const net = me.bal - START;
      api.gameOver({
        score,
        win: arr.length > 1 && place === 1,
        title: arr.length > 1 ? (place === 1 ? 'You win' : 'Finished ' + ordinal(place)) : 'Time!',
        message: 'Final balance ' + money(me.bal) + ' chips',
        stats: [
          { label: 'Net', value: (net >= 0 ? '+' : '−') + money(Math.abs(net)) },
          { label: 'Biggest win', value: stats.bigWin ? '+' + money(stats.bigWin) : '—' },
          { label: 'Best multi', value: stats.bestX ? mxs(stats.bestX) : '—' },
          { label: 'Bets', value: String(stats.bets) }
        ]
      });
    }

    /* ============================================================ loop ==== */
    let lastF = performance.now(), lbAt = 0, lastSec = -1, lastBeep = -1, tickAt = 0;
    function tick() {
      if (dead) return;
      const c = clock();
      if (!started && c >= 0) begin();
      if (started && !ended) {
        dripTick(c);
        botsTick(c);
        for (const g of GAMES) if (g.built && g.tick) g.tick(c);
        if (c >= MATCH_MS) endMatch(c);
      }
      netTick();
    }
    function frame() {
      if (dead) return;
      tick();
      const now = performance.now(), dt = Math.min(.1, (now - lastF) / 1000);
      lastF = now;
      const c = clock();
      if (!started) {
        const n = Math.ceil(-c / 1000);
        if (n !== lastSec && n >= 1 && n <= 3) { lastSec = n; countEl.textContent = n; pop(countEl); sfx('csTick', n); }
      }
      if (balShown !== me.bal) {
        const d = me.bal - balShown;
        balShown = Math.abs(d) < 1 ? me.bal : balShown + d * Math.min(1, dt * 10);
        setText(balV, money(balShown));
      }
      const left = Math.max(0, MATCH_MS - Math.max(0, c));
      const s = Math.ceil(left / 1000);
      setText(clockV, Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
      clockFg.style.strokeDashoffset = (94.25 * (1 - left / MATCH_MS)).toFixed(2);
      clockEl.classList.toggle('warn', started && left < 60000 && left >= 15000);
      clockEl.classList.toggle('hot', started && !ended && left < 15000);
      if (started && !ended && left <= 10000 && s !== lastBeep) { lastBeep = s; sfx('csTick', 0); }
      const dn = started && !ended ? DRIP_MS - (Math.max(0, c) % DRIP_MS) : DRIP_MS;
      setText(dripV, Math.ceil(dn / 1000) + 's');
      dripFg.style.strokeDashoffset = (94.25 * dn / DRIP_MS).toFixed(2);
      if (curGame && curGame.built && curGame.draw) curGame.draw(now, dt, c);
      for (const g of GAMES) if (g.busy) g.nb.classList.toggle('live', !!g.busy());
      if (lbDirty && now - lbAt > 200) { lbAt = now; lbDirty = false; paintLB(); }
    }
    /* a paused or hidden tab still has to hear the buzzer and keep posting */
    const tickT = setInterval(tick, 400);

    const onKey = e => {
      if (e.code !== 'Space' || e.repeat || dead || !live()) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!ONLINE && api.paused) return;
      if (curGame && curGame.hotkey) { e.preventDefault(); curGame.hotkey(); }
    };
    addEventListener('keydown', onKey);
    paintLB();

    return {
      update(dt) {
        if (!ONLINE) soloMs += dt * 1000;
        if (document.hidden) { const n = performance.now(); if (n - tickAt > 100) { tickAt = n; tick(); } }
      },
      /* the casino draws itself in the DOM; the frame hook only drives it */
      render() { frame(); },
      resize() {},
      destroy() {
        dead = true;
        clearInterval(tickT);
        removeEventListener('keydown', onKey);
        try { ro.disconnect(); } catch (e) {}
        root.remove();
      },
      _dev: {
        get me() { return me; }, players, clock, crRound, crAt, open: id => open(id),
        get game() { return curGame && curGame.id; }, GBY: () => GBY,
        skip(ms) { if (ONLINE) ep -= ms; else soloMs += ms; tick(); },
        give(c) { me.bal += c; balChanged(); }
      }
    };
  }
});

