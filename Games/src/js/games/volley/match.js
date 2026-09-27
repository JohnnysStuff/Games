/* The match: one game of beach volleyball, one or two a side, rally scoring
   to 11, 15 or 21, win by two. It opens on its own menu (VolUI.menu): the
   size of the sides, how good the computer is, the points, and your side's
   colours; the computer plays everyone else, your partner included.
   volMount(api, host) is shaped like an arcade game's mount(): update(dt)
   on the fixed 1/120 s step and render(ctx) in 960×600 units.

   `host` is whatever runs it. The arcade (games/volley.js) keeps the
   settings as the game's options, starts and ends rounds through its api
   and draws the results itself; the test page gives nothing, and the match
   keeps its settings in localStorage and shows its own full-time card.
     entry        'play' goes straight into a match with the saved settings
     saved(), save(cfg), cursor(c)
     play(cfg)    Play pressed: false if the match can't start
     end(result)  game over, once the celebrations have had a moment
     hub()        Escape on the menu

   The flow: serve (everyone in place, the ball in the server's hand; you
   hold Z or X and let go to serve when it is yours), rally (until the
   ball is down or a fault), point (the umpire's whistle and signals, the
   crowd, the score), and at the end, over. The side that wins a rally
   serves the next; two a side, a side's players take turns each time it
   wins the serve back. */
function volCfg(o) {
  o = o || {};
  const mode = +o.mode === 1 ? 1 : 2, kit = +o.kit >= 0 && +o.kit < VOL_KITS.length ? +o.kit : 0;
  const lvl = ['easy', 'normal', 'hard'].includes(o.lvl) ? o.lvl : 'normal';
  const pts = [11, 15, 21].includes(+o.pts) ? +o.pts : 11;
  return { mode, lvl, pts, kit, opp: kit === 1 ? 0 : 1 };
}
const VOL_KITS = [
  { name: 'SUNS', short: 'SUN', chip: '#f3ba06' },                                                   // the art's own
  { name: 'CORALS', short: 'COR', chip: '#e8503a', shirt: '#e8503a', trim: '#f4f4f4', shorts: '#f4f4f4' },
  { name: 'WAVES', short: 'WAV', chip: '#1c9fd6', shirt: '#1c9fd6', trim: '#f4f4f4', shorts: '#15325e' },
  { name: 'PALMS', short: 'PLM', chip: '#3fae4e', shirt: '#3fae4e', trim: '#f6f1ef', shorts: '#1f2330' }
];
/* You always look the same: brown hair, as drawn. Everyone else from these. */
const VOL_HERO = { hair: 'brown', tone: 'light' };
const VOL_LOOKS = [[{ hair: 'blond', tone: 'tan' }], [{ hair: 'black', tone: 'brown' }, { hair: 'ginger', tone: 'light' }]];
/* Your serve: how hard is how long you hold the key (the meter fills in
   about a second and runs on into the red). Below `net` it goes into the
   net; to `good` it clears it low; past `long` it sails out. */
const VOL_SERVE_MAX = 1.25;
const VOL_SERVE_BANDS = { float: { net: .2, good: .45, long: 1.02 }, jump: { net: .3, good: .6, long: .98 } };

/* the side that wins with the next point, or -1 */
function volMatchPoint(W) {
  const [a, b] = W.score, n = W.cfg ? W.cfg.pts : 11;
  if (a + 1 >= n && a + 1 - b >= 2) return 0;
  if (b + 1 >= n && b + 1 - a >= 2) return 1;
  return -1;
}
function volWinner(W) {
  const [a, b] = W.score, n = W.cfg.pts;
  if (a >= n && a - b >= 2) return 0;
  if (b >= n && b - a >= 2) return 1;
  return -1;
}

function volMount(api, host) {
  host = host || {};
  const keep = host.saved ? host : {
    saved() { try { return JSON.parse(localStorage.getItem('volMenu') || '{}') || {}; } catch (e) { return {}; } },
    save(c) { try { localStorage.setItem('volMenu', JSON.stringify({ mode: c.mode, lvl: c.lvl, pts: c.pts, kit: c.kit })); } catch (e) {} }
  };
  const cursor = c => { if (host.cursor) host.cursor(c); else if (api.cursor) api.cursor(c); };
  let crowdN = 0;
  const W = {
    t: 0, phase: 'menu', cfg: null, score: [0, 0], ball: volBall(), players: [], teams: [], fx: [], marks: [],
    banner: null, trans: null, deadT: 0, menu: null, resHits: null, resSel: 'again', hosted: !!host.end, ended: false,
    ui: {}, keys: {}, hudOff: false, serving: 0, server: null, ruled: null, shake: 0, squash: 0, tips: 0,
    crowd: null, stats: null, touches: [0, 0], crossings: 0, solo: false, me: null, waveT: 3,
    sound: (n, ...a) => VolSound.play(n, ...a),
    puff: (x, y, k, face) => W.fx.push({ k: k === 2 ? 'splash' : 'puff', x, y, t: 0, face }),
    spray: (x, y) => W.fx.push({ k: 'spray', x, y, t: 0 }),
    mark: (k, x, y, face) => { W.marks.push({ k, x, y, face, t: 0 }); if (W.marks.length > 160) W.marks.shift(); },
    stat: () => {},
    onTouch: (p, kind) => {
      if (kind === 'spike' || kind === 'serve') W.squash = .06;
      if (kind === 'serve') { W.phase = 'rally'; W.crossings = 0; }
    }
  };
  const view = volView(W);
  let T0 = null, T1 = null;
  const cheer = e => { W.crowd = { id: ++crowdN, e }; };

  /* ---- the sides ---- */
  const kitLook = (kit, look) => ({ shirt: kit.shirt, trim: kit.trim, shorts: kit.shorts, hair: look.hair, tone: look.tone });
  const heroSheet = kit => VolArt.dress('volley_player', kitLook(VOL_KITS[kit], VOL_HERO));
  function build(cfg) {
    W.cfg = cfg; W.solo = cfg.mode === 1;
    W.players = []; W.teams = []; W.me = null;
    for (let i = 0; i < 2; i++) {
      const kit = VOL_KITS[i ? cfg.opp : cfg.kit];
      const t = { i, dir: i ? -1 : 1, kit, players: [], nextSrv: 0, plan: null, seen: null };
      for (let k = 0; k < cfg.mode; k++) {
        const hero = i === 0 && k === 0;
        const look = hero ? VOL_HERO : VOL_LOOKS[i][(i ? k : k - 1) % VOL_LOOKS[i].length];
        const p = volPlayer(t, k, hero ? heroSheet(cfg.kit) : VolArt.dress('volley_player', kitLook(kit, look)));
        p.idx = W.players.length;
        if (hero) { p.human = true; W.me = p; }
        else p.lvl = VOL_LEVELS[i === 0 ? 'mate' : cfg.lvl];
        t.players.push(p); W.players.push(p);
      }
      W.teams.push(t);
    }
    [T0, T1] = W.teams;
    view.arena();
    W.serving = 0; W.server = T0.players[0];
    place();
  }
  /* everyone to their places for a serve: the server behind the end line,
     his partner up at the net, the other side back to receive */
  function place() {
    const { NX, CL, CD } = VOL, s = W.serving, srv = W.server;
    for (const t of W.teams) for (const p of t.players) {
      volState(p, 'move', 'ready'); p.vx = p.vy = p.vz = p.z = 0; p.ix = p.iy = 0; p.relax = false; p.face = t.dir; p.call = 0;
      const d = t.dir;
      if (p === srv) { p.x = t.i ? CL + 16 : -16; p.y = p.human ? (p.srvY ?? CD / 2 + 24) : volRand(34, CD - 34); p.face = d; }
      else if (t.i === s) { p.x = NX - d * 16; p.y = srv.y < CD / 2 ? CD / 2 + 32 : CD / 2 - 32; }
      else if (t.players.length === 1) { p.x = NX - d * 104; p.y = CD / 2; }
      else { p.x = NX - d * 110; p.y = p.i === 0 ? CD * .34 : CD * .68; }
      t.plan = null;
    }
    const b = W.ball;
    Object.assign(b, { vx: 0, vy: 0, vz: 0, held: srv, team: s, tc: 3, last: null, block: false, down: false, kind: 'serve', hidden: false, spinV: 0 });
    b.id++;
    holdBall();
  }
  /* the ball in the server's hand, and in the air through his toss */
  function holdBall() {
    const b = W.ball, p = W.server;
    if (!p || !b.held) return;
    const f = p.face;
    if (p.st === 'serve' && p.act.kind) {
      const t = p.stT, k = Math.max(0, t - .06);
      if (p.act.x0 === undefined) p.act.x0 = p.x - f;
      if (p.act.kind === 'float') { b.x = p.x + f * (5 + 6 * k); b.y = p.y + .5; b.z = t < .06 ? 22 : 24 + 118 * k - 150 * k * k; }
      else { b.x = p.act.x0 + f * (6 + 30 * k); b.y = p.y + .5; b.z = t < .06 ? 22 : 26 + 175 * k - 150 * k * k; }
      b.spin += .2;
    } else { b.x = p.x + f * 5; b.y = p.y + 1; b.z = 20; }
  }

  function fade(fn, dur = .7) { W.trans = { t: 0, dur, fn, fired: false }; }

  /* ---- the flow ---- */
  function start(cfg) {
    build(cfg);
    W.score = [0, 0]; W.fx = []; W.marks = []; W.ui = {}; W.hudOff = false; W.ended = false; W.over = false;
    W.stats = { kill: [0, 0], ace: [0, 0], stuff: [0, 0] }; W.touches = [0, 0]; W.tips = 3;
    /* who serves first: a toss of a coin */
    W.serving = Math.random() < .5 ? 0 : 1;
    const t = W.teams[W.serving]; W.server = t.players[t.nextSrv++ % t.players.length];
    serveUp();
    W.banner = { text: 'PLAY!', sub: `${T0.kit.name}  VS  ${T1.kit.name}`, chips: [T0.kit.chip, T1.kit.chip], t: 0, dur: 1.5 };
    cheer(['rally']);
    W.sound('whistle', 1);
  }
  function serveUp() {
    place();
    W.phase = 'serve'; W.serveT = 0; W.ruled = null; W.mood = null;
    W.serveWait = volRand(1.1, 1.7);
    const mp = volMatchPoint(W);
    if (mp >= 0 && W.score[0] + W.score[1] > 0) W.banner = { text: 'MATCH POINT', sub: W.teams[mp].kit.name, chips: [W.teams[mp].kit.chip, W.teams[mp].kit.chip], t: 0, dur: 1.4 };
  }
  function toMenu() {
    fade(() => { W.banner = null; W.ui = {}; W.phase = 'menu'; W.menu = VolUI.menu(api, hooks); }, .6);
  }
  const myTeam = () => (W.me ? W.me.team : T0);
  const WORDS = { ace: 'ACE!', kill: 'KILL!', stuff: 'BLOCK!', out: 'OUT!', net: 'NET!', wide: 'WIDE!', under: 'FAULT', down: 'POINT', point: 'POINT' };
  /* the rally is over: the point, the whistle, the signals, the crowd */
  function pointStart() {
    const R = W.ruled, win = R.win, t = W.teams[win];
    W.phase = 'point'; W.deadT = 0;
    W.score[win]++;
    W.callAt = SocUI.clock();
    if (R.why === 'ace') W.stats.ace[win]++;
    if (R.why === 'kill') W.stats.kill[win]++;
    if (R.why === 'stuff') W.stats.stuff[win]++;
    /* the serve goes to the side that won it; two a side, turn and turn about */
    if (win !== W.serving) { W.serving = win; W.server = t.players[t.nextSrv++ % t.players.length]; }
    const ours = t === myTeam();
    W.banner = { text: WORDS[R.why] || 'POINT', sub: `${T0.kit.short}  ${W.score[0]} - ${W.score[1]}  ${T1.kit.short}`, chips: [T0.kit.chip, T1.kit.chip], t: 0, dur: 1.7,
                 face: ours ? '#fad911' : '#ccc7d1', side: ours ? '#9a5a06' : '#4a4d5c', hi: ours ? '#fdf07a' : '#f6f1ef', band: t.kit.chip, rim: t.kit.chip };
    W.ui.ptAt = SocUI.clock(); W.ui.ptTeam = win; W.ui.ptCol = t.kit.chip;
    W.sound('whistle', 1);
    W.sound(ours ? 'cheer' : 'groan', ours ? .8 : 1);
    cheer(['point', win]);
    /* the umpire: whistle, in or out where it came down, then the side to serve */
    const u = view.ump;
    if (u) {
      u.q = [];
      volUmpDo(u, 'whistle', .1, 1, 0);
      if (R.why === 'out' || R.why === 'wide') volUmpDo(u, 'out', .05, 1, .35);
      else if (R.in) volUmpDo(u, 'in', .05, R.x > VOL.NX ? 1 : -1, .35);
      volUmpDo(u, 'point', .1, win ? 1 : -1, .6);
    }
    W.tips = Math.max(0, W.tips - 1);
    W.over = volWinner(W) >= 0;
    W.mood = { win, end: W.over, done: new Set() };
  }
  /* Who celebrates, and how: two a side, the winners high-five, alone a
     cheer; at the end the losers take it badly. Anyone mid-dive or in the
     air joins in when they are back on their feet. */
  function mood() {
    const M = W.mood;
    if (!M) return;
    for (const p of W.players) {
      if (p.st !== 'move' || M.done.has(p) || p.z > 0) continue;
      M.done.add(p);
      p.relax = true; p.ix = p.iy = 0;
      const mate = p.team.players.find(q => q !== p);
      if (p.team.i === M.win) {
        if (mate && volDist(p.x, p.y, mate.x, mate.y) < 60 && !M.end) { p.face = Math.sign(mate.x - p.x) || p.face; volPose(p, 'highfive'); }
        else volPose(p, 'cheer');
      } else if (M.end) volPose(p, 'sad');
    }
  }
  function overStart() {
    W.phase = 'over'; W.deadT = 0; W.resSel = 'again';
    const win = volWinner(W), t = W.teams[win], ours = t === myTeam();
    W.banner = { text: ours ? 'YOU WIN!' : 'GAME', sub: `${T0.kit.name}  ${W.score[0]} - ${W.score[1]}  ${T1.kit.name}`, chips: [T0.kit.chip, T1.kit.chip], t: 0, dur: 2.2,
                 face: ours ? '#fad911' : '#ccc7d1', side: ours ? '#9a5a06' : '#4a4d5c', band: t.kit.chip, rim: t.kit.chip };
    if (ours) SocUI.burst(W, [t.kit.chip, '#fad911', '#f6f1ef', '#2f6fd6']);
    W.sound('whistle', 3);
    cheer(['win', win]);
    W.mood = { win, end: true, done: new Set() };
    for (const p of W.players) if (p.st === 'pose') { volState(p, 'move'); }
  }
  /* The game as the arcade's results page tells it, from your side */
  function result() {
    const my = myTeam().i, a = W.score[my], c = W.score[1 - my];
    return { mine: a, theirs: c, win: a > c, mode: W.cfg.mode, lvl: W.cfg.lvl, pts: W.cfg.pts, us: W.teams[my].kit, them: W.teams[1 - my].kit,
             kills: [W.stats.kill[my], W.stats.kill[1 - my]], aces: [W.stats.ace[my], W.stats.ace[1 - my]], blocks: [W.stats.stuff[my], W.stats.stuff[1 - my]] };
  }

  /* the menu's view of the sides, and its ways out */
  const hooks = {
    preview(cfg) { build(cfg); for (const p of W.players) p.relax = false; },
    start(cfg) {
      if (host.play && host.play(cfg) === false) return false;
      fade(() => start(cfg), .8);
    },
    saved: () => keep.saved(),
    save: c => keep.save(c),
    cursor,
    sheet: kit => heroSheet(kit)
  };

  /* ---- the keys ---- */
  function input() {
    const k = api.input, d = c => k.down(c), pr = c => k.pressed(c);
    return {
      x: (d('ArrowRight') || d('KeyD') ? 1 : 0) - (d('ArrowLeft') || d('KeyA') ? 1 : 0),
      y: (d('ArrowDown') || d('KeyS') ? 1 : 0) - (d('ArrowUp') || d('KeyW') ? 1 : 0),
      pass: pr('KeyZ') || pr('KeyJ'), jump: pr('KeyX') || pr('KeyK') || pr('Space'),
      passDown: d('KeyZ') || d('KeyJ'), jumpDown: d('KeyX') || d('KeyK') || d('Space')
    };
  }
  /* Your player: move, and Z to pass (a dive if it is out of reach), X to
     jump (a block if it is coming from their side of the net at you, a
     spike otherwise). The keys held as you hit it aim it. */
  function human(me, inp) {
    const b = W.ball, t = me.team, { NX } = VOL;
    me.ix = inp.x; me.iy = inp.y;
    me.aim = { x: inp.x, y: inp.y };
    if (me.st !== 'move') return;
    if (inp.pass) {
      if (!volMayPlay(W, me) && b.team === t.i) return;            // not yours to play (you just did)
      const n = volTouchNo(b, t);
      const kind = n === 1 || volApex(b) < 40 || b.vz < -240 ? 'bump' : 'set';
      /* out of reach, and about to come down: go full length for it */
      const C = volComing(b, 8), R = volComing(b, kind === 'set' ? VOL_AT.set : VOL_AT.bump);
      if (C && C.t < .5 && volSide(C.x) === t.i) {
        const d = volDist(me.x, me.y, C.x, C.y), dr = R ? volDist(me.x + me.face * 5, me.y, R.x, R.y) : d;
        if (dr > 13 && d < 40) { volDive(me, C.x - me.x, C.y - me.y); W.sound('dive'); return; }
      }
      volPass(me, kind, .45);
    } else if (inp.jump) {
      const block = b.team !== t.i && volSide(b.x) !== t.i && Math.abs(me.x - NX) < 34 && b.kind !== 'serve';
      volJump(me, block ? 'block' : 'spike');
    }
  }
  /* your serve: hold to fill the meter, let go to hit it */
  function humanServe(me, inp, dt) {
    const a = me.act;
    if (me.st !== 'move') return;
    if (a.charge === undefined) {
      me.ix = inp.x; me.iy = inp.y;
      if ((inp.pass || inp.jump) && W.serveT > .35) { a.charge = 0; a.kind = inp.jump ? 'jump' : 'float'; }
      return;
    }
    me.ix = me.iy = 0;
    a.charge = Math.min(VOL_SERVE_MAX, a.charge + dt / .95);
    const held = a.kind === 'jump' ? inp.jumpDown : inp.passDown;
    if (held) return;
    /* let go: the depth from how hard, the side from the keys held */
    const { NX, CL, CD } = VOL, s = me.team.dir, B = VOL_SERVE_BANDS[a.kind], pw = a.charge, jump = a.kind === 'jump';
    const deep = Math.min(pw, 1) / 1, over = pw > B.long ? (pw - B.long) * 130 + 8 : 0;
    const at = { x: NX + s * (26 + (CL / 2 - 30) * deep + over), y: CD / 2 + inp.y * (CD / 2 - 26) };
    at.x += volRand(-6, 6) * (jump ? 1.6 : 1); at.y += volRand(-7, 7) * (jump ? 1.6 : 1);
    const margin = pw < B.net ? -14 + pw / B.net * 11 : pw < B.good ? (jump ? 2 : 3) + (pw - B.net) / (B.good - B.net) * (jump ? 4 : 9) : jump ? volRand(6, 9) : volRand(12, 17);
    me.srvY = me.y;
    volServe(me, a.kind, () => volServeLaunch(W, me, a.kind, at, margin));
    if (jump) me.act.x0 = W.ball.x - s * 6;
  }

  /* the full-time card on the test page: again, or back to the menu */
  function resultsInput() {
    const k = api.input, pr = c => k.pressed(c);
    if (pr('ArrowLeft') || pr('KeyA')) { W.resSel = 'again'; W.sound('tick'); }
    if (pr('ArrowRight') || pr('KeyD')) { W.resSel = 'menu'; W.sound('tick'); }
    let pick = null;
    if (pr('KeyZ') || pr('Enter') || pr('NumpadEnter') || pr('Space')) pick = W.resSel;
    if (pr('KeyM')) pick = 'menu';
    let c;
    while (k.takeClick && (c = k.takeClick())) {
      const h = (W.resHits || []).find(q => c.x >= q.x && c.x <= q.x + q.w && c.y >= q.y && c.y <= q.y + q.h);
      if (h) pick = h.id;
    }
    const p = k.pointer, hv = p && p.inside && (W.resHits || []).find(q => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
    if (hv) W.resSel = hv.id;
    cursor(hv ? 'pointer' : '');
    if (!pick) return;
    W.deadT = -99;
    if (pick === 'again') { const cfg = W.cfg; fade(() => start(cfg), .8); }
    else toMenu();
  }

  /* ---- the step ---- */
  function update(dt) {
    W.t += dt;
    if (W.trans) {
      W.trans.t += dt;
      if (!W.trans.fired && W.trans.t >= W.trans.dur / 2) { W.trans.fired = true; W.trans.fn(); }
      if (W.trans.t >= W.trans.dur) W.trans = null;
    }
    if (W.banner) { W.banner.t += dt; if (W.banner.t > W.banner.dur) W.banner = null; }
    W.shake = Math.max(0, W.shake - dt); W.squash = Math.max(0, W.squash - dt);
    for (const f of W.fx) f.t += dt;
    W.fx = W.fx.filter(f => f.t < .5);
    for (const m of W.marks) m.t += dt;
    if (W.marks.length && W.marks[0].t > 15) W.marks.shift();
    /* the sea */
    W.waveT -= dt;
    if (W.waveT <= 0) { W.waveT = volRand(6, 10); W.sound('wave'); }
    const b = W.ball;
    if (W.phase === 'menu') {
      if (!W.trans && W.menu) W.menu.update(dt);
      for (const p of W.players) { p.ix = p.iy = 0; volPlayerStep(p, dt, W); }
      holdBall();
      return;
    }
    const inp = input(), dn = c => api.input.down(c);
    W.keys = { u: dn('ArrowUp') || dn('KeyW'), d: dn('ArrowDown') || dn('KeyS'), l: dn('ArrowLeft') || dn('KeyA'), r: dn('ArrowRight') || dn('KeyD'),
               Z: dn('KeyZ') || dn('KeyJ'), X: dn('KeyX') || dn('KeyK') || dn('Space') };
    if (!W.hosted) W.hudOff = W.phase === 'over' && W.deadT > 1.4;
    const me = W.me;
    if (W.phase === 'serve') {
      W.serveT += dt;
      for (const p of W.players) if (p !== me) { p.ix = p.iy = 0; }
      if (me && me !== W.server) { me.ix = inp.x; me.iy = inp.y; }
      if (!W.trans) {
        if (W.server === me) humanServe(me, inp, dt);
        else if (W.server.st === 'move' && W.serveT > W.serveWait) volCpuServe(W, W.server);
      }
    } else if (W.phase === 'rally') {
      if (me) human(me, inp);
      volTeamAI(W, T0, dt); volTeamAI(W, T1, dt);
    } else {
      for (const p of W.players) { p.ix = p.iy = 0; }
      W.deadT += dt;
      if (W.ruled) W.ruled.t += dt;
      mood();
      if (W.phase === 'point' && W.deadT > 2.1 && !W.trans) {
        W.deadT = -99;
        if (W.over) overStart();
        else fade(serveUp, .6);
      }
      if (W.phase === 'over' && W.deadT > 1.6 && !W.trans) {
        if (!W.hosted) resultsInput();
        else if (!W.ended) { W.ended = true; host.end(result()); }
      }
    }
    for (const p of W.players) volPlayerStep(p, dt, W);
    /* the server stays behind his end line until it is struck */
    if (W.phase === 'serve' && W.server && W.server.st === 'move') {
      const p = W.server, { CL, CD } = VOL;
      p.x = p.team.i ? volClamp(p.x, CL + 8, CL + 40) : volClamp(p.x, -40, -8); p.y = volClamp(p.y, 10, CD - 10);
    }
    if (b.held) holdBall();
    else {
      const px = b.x;
      const ev = volBallStep(b, dt);
      if (W.phase === 'rally') {
        if ((px - VOL.NX) * (b.x - VOL.NX) < 0) {
          W.crossings++; if (W.crossings === 6) cheer(['rally']);
          /* over: the tape lights up where it went across */
          if (!W.netFx || !W.netFx.hit || W.t - W.netFx.at > .1) W.netFx = { y: b.y, at: W.t, hit: false };
        }
        volBallEvent(W, ev);
        volContacts(W);
        if (W.ruled) pointStart();
      }
    }
  }

  /* a round the arcade mounted to play (Restart, Play again) skips the menu */
  if (host.entry === 'play') { W.phase = 'serve'; start(volCfg(keep.saved())); }
  else W.menu = VolUI.menu(api, hooks);
  return {
    update, render: ctx => view.render(ctx), world: W, pix: view.pix, destroy() { cursor(''); },
    start: cfg => start(cfg), toMenu,
    /* Escape: from a match back to the menu is the pause card's job; on the
       menu there is nowhere further back but the hub */
    escape() {
      if (W.phase === 'menu' && host.hub) { host.hub(); return true; }
      return false;
    }
  };
}
