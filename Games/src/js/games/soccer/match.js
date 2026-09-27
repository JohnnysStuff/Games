/* The match: small-sided — 1v1, 2v2 or 3v3 — in a walled arena, so the
   ball never goes out and nothing stops play but a goal. It opens on its
   own menu (SocUI.menu): the size of the sides, your position, your team
   and how long; the CPU plays everyone else. socMount(api, host) is shaped
   like an arcade game's mount(): update(dt) on the fixed 1/120 s step and
   render(ctx) in 960×600 units.

   `host` is whatever runs it. The arcade (games/soccer.js) keeps the
   settings as the game's options, starts and ends rounds through its api
   and draws the results itself; the test page gives nothing, and the match
   keeps its settings in localStorage and shows its own full-time card.
     entry        'play' goes straight into a match with the saved settings
     saved(), save(cfg), cursor(c)
     play(cfg)    Kick off pressed: false if the match can't start
     end(result)  full time, once the whistle has gone
     hub()        Escape on the menu */
/* a match's settings, from whatever was kept: anything missing or out of
   range falls back (the arcade keeps options as strings) */
function socCfg(o) {
  o = o || {};
  const mode = [1, 2, 3].includes(+o.mode) ? +o.mode : 2, kit = +o.kit >= 0 && +o.kit < SOC_KITS.length ? +o.kit : 0;
  const pos = SOC_FORMS[mode].some(f => f.role === o.pos) ? o.pos : 'fw';
  return { mode, pos, kit, opp: kit === 1 ? 0 : 1, min: [2, 3, 5].includes(+o.min) ? +o.min : 3 };
}
const SOC_KITS = [
  { name: 'SUNS', short: 'SUN', chip: '#f3ba06' },                                                   // the art's own
  { name: 'REDS', short: 'RED', chip: '#d8262e', shirt: '#d8262e', trim: '#f4f4f4', shorts: '#f4f4f4', socks: '#d8262e' },
  { name: 'BLUES', short: 'BLU', chip: '#2f6fe0', shirt: '#2f6fe0', trim: '#f4f4f4', shorts: '#1f2a4a', socks: '#2f6fe0' },
  { name: 'WHITES', short: 'WHT', chip: '#ececec', shirt: '#ececec', trim: '#1f2330', shorts: '#1f2330', socks: '#ececec' }
];
const SOC_GK_KITS = [
  { shirt: '#8b5cf6', trim: '#1f2330', shorts: '#1f2330', socks: '#8b5cf6' },
  { shirt: '#14b8a6', trim: '#1f2330', shorts: '#1f2330', socks: '#14b8a6' }
];
/* Your player always looks the same, whichever position you pick: short
   brown hair, like the keeper sheet. Everyone else is drawn from the rest. */
const SOC_HERO = { sheet: 'player_short', hair: 'brown', tone: 'light' };
const SOC_LOOKS = [
  [{ sheet: 'player_afro', hair: 'black', tone: 'brown' }, { sheet: 'player_spiky', hair: 'blond', tone: 'light' }, { sheet: 'player_long', hair: 'black', tone: 'tan' }],
  [{ sheet: 'player_spiky', hair: 'black', tone: 'tan' }, { sheet: 'player_long', hair: 'brown', tone: 'dark' }, { sheet: 'player_short', hair: 'ginger', tone: 'light' }]
];
/* Online, everyone a person steers looks different, the same on every
   screen: the party's host as your player always does, the rest from these. */
const SOC_PEOPLE = [SOC_HERO, { sheet: 'player_spiky', hair: 'black', tone: 'brown' }, { sheet: 'player_afro', hair: 'black', tone: 'dark' },
  { sheet: 'player_long', hair: 'blond', tone: 'light' }, { sheet: 'player_short', hair: 'ginger', tone: 'tan' }, { sheet: 'player_spiky', hair: 'blond', tone: 'light' }];

function socMount(api, host) {
  host = host || {};
  /* online: the party's session (games/soccer.js hands it over), and what
     runs this screen's side of it, SocNet's host or guest */
  const S = host.net || null;
  let NET = null;
  const keep = host.saved ? host : {
    saved() { try { return JSON.parse(localStorage.getItem('socMenu') || '{}') || {}; } catch (e) { return {}; } },
    save(c) { try { localStorage.setItem('socMenu', JSON.stringify({ mode: c.mode, pos: c.pos, kit: c.kit, min: c.min })); } catch (e) {} }
  };
  const cursor = c => { if (host.cursor) host.cursor(c); else if (api.cursor) api.cursor(c); };
  const W = {
    t: 0, phase: 'menu', cfg: null, score: [0, 0], clock: 0, ball: socBall(), players: [], teams: [], fx: [],
    cam: { x: 0, y: 0 }, banner: null, trans: null, deadT: 0, hint: 0, poss: [0, 0], shots: [0, 0], lastKick: null,
    menu: null, resHits: null, resSel: 'again', ko: null, goalFor: null, hosted: !!host.end, ended: false,
    ui: {}, keys: {}, hudOff: false,
    sound: (n, ...a) => SocSound.play(n, ...a),
    puff: (x, y) => W.fx.push({ k: 'dust', x, y, t: 0 }),
    spark: (x, y) => W.fx.push({ k: 'spark', x, y, t: 0 }),
    /* a tackle that put someone down: the referee has a view on it (ref.js) */
    onFoul: (by, on) => socRefFoul(W, by, on)
  };
  const view = socView(W);
  let T0 = null, T1 = null;

  /* ---- the sides ---- */
  const kitLook = (kit, look) => ({ shirt: kit.shirt, trim: kit.trim, shorts: kit.shorts, socks: kit.socks, hair: look.hair, tone: look.tone });
  /* the sheet your player wears in a position: in goal, the keeper's */
  function heroSheet(cfg, role) {
    return role === 'gk' ? SocArt.dress('keeper', kitLook(SOC_GK_KITS[0], { hair: 'brown', tone: 'light' }))
                         : SocArt.dress(SOC_HERO.sheet, kitLook(SOC_KITS[cfg.kit], SOC_HERO));
  }
  function build(cfg) {
    socArena(cfg.mode);
    W.cfg = cfg;
    const form = SOC_FORMS[cfg.mode], seats = S && W.seats ? W.seats.list : null;
    W.players = []; W.teams = []; W.me = null;
    for (let i = 0; i < 2; i++) {
      const kit = SOC_KITS[i ? cfg.opp : cfg.kit];
      const t = { i, dir: i ? -1 : 1, gx: i ? SOC.PL : 0, ox: i ? 0 : SOC.PL, players: [], kit, gk: null, human: null, call: null,
        /* one on one, the CPU's tackles are surer: it is the only thing between you and the goal */
        steal: i ? (cfg.mode === 1 ? .42 : .3) : .35, slide: i ? 1.1 : 1.2, gkSure: .72, shotNoise: 13, passRate: .06 };
      const mine = !seats && i === 0 ? (form.find(f => f.role === cfg.pos) || form.find(f => f.role !== 'gk')) : null;
      let o = 0;
      form.forEach((f, k) => {
        const gk = f.role === 'gk', seat = seats && seats.find(s => s.team === i && s.role === f.role);
        let sheet;
        if (seat) { const look = SOC_PEOPLE[seat.k % SOC_PEOPLE.length]; sheet = SocArt.dress(gk ? 'keeper' : look.sheet, kitLook(gk ? SOC_GK_KITS[i] : kit, look)); }
        else if (f === mine) sheet = heroSheet(cfg, f.role);
        else if (gk) sheet = SocArt.dress('keeper', kitLook(SOC_GK_KITS[i], { hair: i ? 'black' : 'brown', tone: i ? 'brown' : 'light' }));
        else { const look = SOC_LOOKS[i][o++]; sheet = SocArt.dress(look.sheet, kitLook(kit, look)); }
        const p = socPlayer(t, k, gk, sheet);
        p.form = f; p.idx = W.players.length;
        t.players.push(p); W.players.push(p);
        if (gk) t.gk = p;
        if (seat) {
          /* a person: this screen's, or another's (on the host, `remote`:
             moved by what that screen reports) */
          p.human = true; p.pid = seat.pid; p.name = seat.name;
          if (seat.pid === S.me) W.me = p;
          else if (S.role === 'host') { p.remote = true; p.net = {}; }
        } else if (f === mine) { p.human = true; W.me = p; }
      });
      /* the one the CPU teammates leave the chasing to */
      t.human = t.players.find(p => p.human && !p.gk) || t.players.find(p => p.human) || null;
      W.teams.push(t);
    }
    [T0, T1] = W.teams;
    W.ref = socRef();
    view.arena();
    lineUp(T0);
    W.cam.x = (SOC.PL - SOC.VW) / 2; W.cam.y = camY();
  }

  function reset(p) {
    socState(p, 'move', p.gk ? 'ready' : 'idle');
    p.vx = p.vy = p.vz = p.z = 0; p.ix = p.iy = 0; p.holding = false; p.cd = 0; p.faceTo = 0; p.react = undefined; p.shout = 0;
    p.face = p.team.dir; p.dx = p.team.dir; p.dy = 0;
    if (p.net) { p.net.go = false; p.net.rep = null; }
  }
  function freeBall(x, y) {
    Object.assign(W.ball, { x, y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, target: null, inNet: 0, shot: 0, hidden: false, kick: null });
  }
  /* everyone in their own half and the kicking side's forward on the ball
     (you, if you play outfield); returns the one taking it */
  function lineUp(team) {
    const { PL, PD } = SOC, mid = PD / 2;
    /* online, every screen puts its own player back when this goes up */
    W.ep = (W.ep || 0) + 1;
    for (const t of W.teams) for (const p of t.players) {
      reset(p);
      const f = p.form;
      p.x = socWX(t, f.role === 'gk' ? 7 : Math.min(f.fx * PL, PL / 2 - 34)); p.y = f.fy * PD;
    }
    freeBall(PL / 2, mid);
    socRefPlace(W.ref);
    const outs = team.players.filter(p => !p.gk);
    const tk = team.human && !team.human.gk ? team.human : outs.sort((a, c) => c.form.fx - a.form.fx)[0];
    tk.x = PL / 2 - team.dir * 7; tk.y = mid;
    W.ball.owner = tk; W.ball.last = tk;
    return tk;
  }

  function fade(fn, dur = .7) { W.trans = { t: 0, dur, fn, fired: false }; }

  /* ---- the flow ---- */
  function kickoff(team) {
    W.mood = null;
    const tk = lineUp(team);
    W.ko = { team, taker: tk, t: 0, wait: socRand(.55, .8) };
    W.phase = 'kickoff';
    socRefDo(W.ref, 'whistle', .15, 0, .15);
  }
  /* what the crowd reacts to, on every screen (crowd.js) */
  let crowdN = 0;
  const cheer = e => { W.crowd = { id: ++crowdN, e }; };
  function start(cfg) {
    /* online: who plays where, from the party the host started with; the
       sides grow to fit everyone */
    if (S && !W.seats) W.seats = SocNet.seats(cfg, S.players || []);
    if (S) cfg = Object.assign({}, cfg, { mode: W.seats.mode });
    build(cfg);
    W.score = [0, 0]; W.clock = cfg.min * 60; W.fx = []; W.poss = [0, 0]; W.shots = [0, 0]; W.lastKick = null;
    W.hint = 6; W.goalFor = null; W.ended = false; W.ui = {}; W.hudOff = false;
    if (S && !NET) {
      NET = S.role === 'host' ? SocNet.host(W, S) : SocNet.guest(W, S);
      /* a guest shows the host's moments when its picture of the match reaches them */
      if (S.role !== 'host') W.ev = { kickoff: kickShow, goal: (ti, own, sc) => goalShow(W.teams[ti], own, sc), full: () => fullShow(W.score) };
    }
    kickoff(T0);
    if (NET && NET.pull) return;                    // a guest: the host says when it starts
    kickShow();
    W.sound('whistle', 1);
    if (NET) NET.event(['k']);
  }
  function toMenu() {
    fade(() => { W.banner = null; W.ui = {}; W.phase = 'menu'; W.menu = SocUI.menu(api, hooks); }, .6);
  }
  /* the moments every screen shows, from the side of whoever is watching */
  const myTeam = () => (W.me ? W.me.team : T0);
  function kickShow() {
    W.banner = { text: 'KICK OFF', sub: `${T0.kit.name}  VS  ${T1.kit.name}`, chips: [T0.kit.chip, T1.kit.chip], t: 0, dur: 1.6 };
    cheer(['kick']);
  }
  function goalShow(scorers, own, sc) {
    const ours = scorers === myTeam();
    W.banner = { text: own ? 'OWN GOAL' : 'GOAL!', sub: `${T0.kit.name}  ${sc[0]} - ${sc[1]}  ${T1.kit.name}`, chips: [T0.kit.chip, T1.kit.chip], t: 0, dur: 1.9,
                 face: ours ? '#fad911' : '#ccc7d1', side: ours ? '#9a5a06' : '#4a4d5c', hi: ours ? '#fdf07a' : '#f6f1ef', band: scorers.kit.chip, rim: scorers.kit.chip };
    /* the scoreboard flashes the scorers' colour; a goal of yours rains confetti in it */
    W.ui.goalAt = SocUI.clock(); W.ui.goalTeam = scorers.i; W.ui.goalCol = scorers.kit.chip;
    if (ours) SocUI.burst(W, [scorers.kit.chip, '#fad911', '#f6f1ef', '#5c873a']);
    cheer(['goal', scorers.i]);
  }
  function fullShow(sc) {
    W.banner = { text: 'FULL TIME', sub: `${T0.kit.name}  ${sc[0]} - ${sc[1]}  ${T1.kit.name}`, chips: [T0.kit.chip, T1.kit.chip], t: 0, dur: 1.5 };
    cheer(sc[0] === sc[1] ? ['draw'] : ['win', sc[0] > sc[1] ? 0 : 1]);
  }
  function onGoal(side) {
    const scorers = side < 0 ? T1 : T0;
    W.score[scorers.i]++;
    W.phase = 'goal'; W.deadT = 0; W.goalFor = scorers;
    const own = W.ball.last && W.ball.last.team !== scorers;
    goalShow(scorers, own, W.score);
    if (NET) NET.event(['g', scorers.i, own ? 1 : 0, W.score[0], W.score[1]]);
    W.sound('cheer'); W.sound('whistle', 1);
    moods(scorers, W.teams[1 - scorers.i]);
    /* the referee blows, then points back to the middle */
    const r = W.ref;
    if (r) { r.q = []; socRefDo(r, 'whistle'); socRefDo(r, 'point', .35, Math.sign(SOC.PL / 2 - r.x) || 1, .8); }
  }
  /* Who celebrates and who takes it badly, from a goal or the final whistle
     until the next kickoff. Anyone busy at that moment (the scorer is
     usually still mid-kick) joins in as soon as they are free, so it runs
     every step of those phases (mood()). Each side's players pick
     different celebrations while there are enough to go round. */
  function moods(cel, sad) {
    W.mood = { cel, sad, done: new Set(), taken: [new Set(), new Set()] };
    mood();
  }
  function mood() {
    const M = W.mood;
    if (!M) return;
    for (const p of W.players) {
      if (p.st !== 'move' || M.done.has(p)) continue;
      M.done.add(p);
      const kind = p.team === M.cel ? 'cel' : p.team === M.sad ? 'sad' : null;
      const an = kind ? socMood(p, kind, M.taken[p.team.i]) : p.gk ? 'ready' : 'idle';
      if (an) socPose(p, an);
    }
  }
  function fullTime() {
    W.phase = 'fulltime'; W.deadT = 0; W.resSel = 'again';
    W.sound('whistle', 3);
    const [a, c] = W.score, win = a === c ? null : a > c ? T0 : T1;
    fullShow(W.score);
    if (NET) NET.event(['f']);
    moods(win, win ? W.teams[1 - win.i] : null);
    W.ball.owner = null; W.ball.target = null;
    if (W.ref) { W.ref.q = []; socRefDo(W.ref, 'whistle', 0, 0, .8); }
  }
  /* The match as the arcade's results page tells it, from the side of
     whoever is watching. A guest gets the numbers from the host (o). */
  function result(o) {
    const sc = o ? o.sc : W.score, shots = o ? o.shots : W.shots, poss = o ? o.poss : W.poss;
    const my = myTeam().i, a = sc[my], c = sc[1 - my], tot = (poss[0] + poss[1]) || 1, pc = Math.round(poss[my] / tot * 100);
    return { mine: a, theirs: c, win: a > c, draw: a === c, mode: W.cfg.mode, pos: W.me ? W.me.form.role : 'fw',
             us: W.teams[my].kit, them: W.teams[1 - my].kit, shots: [shots[my], shots[1 - my]], poss: [pc, 100 - pc], online: !!S };
  }

  /* the menu's view of the sides, and its ways out */
  const hooks = {
    preview(cfg) { build(cfg); },
    start(cfg) {
      if (host.play && host.play(cfg) === false) return false;
      fade(() => start(cfg), .8);
    },
    saved: () => keep.saved(),
    save: c => keep.save(c),
    cursor,
    me: () => W.me,
    party: () => (host.party ? host.party() : null),
    openParty: () => { if (host.openParty) host.openParty(); },
    them: () => T1 && (T1.players.find(p => !p.gk) || T1.players[0]),
    sheet: (role, kit) => heroSheet(kit === undefined ? (W.cfg || { kit: 0 }) : { kit }, role),
    /* someone in the party, for a guest's waiting card: as they will look, in white */
    person: k => { const look = SOC_PEOPLE[k % SOC_PEOPLE.length]; return SocArt.dress(look.sheet, kitLook(SOC_KITS[3], look)); },
    player: (ti, role) => W.teams[ti] && W.teams[ti].players.find(p => p.form.role === role)
  };

  /* ---- the camera ----
     It follows your player, pulled a little toward the ball so the play
     stays in shot, and only moves when that point leaves the middle of the
     view: the view is wide enough to hold most of the arena, so for most
     of a match it sits still. Up and down it never moves at all. */
  const camY = () => Math.round((SOC.PD - SOC.VH) / 2) - 8;
  function camStep(dt) {
    const { PL, VW } = SOC, b = W.ball, me = W.me;
    const lo = -52, hi = PL + 52 - VW;
    let tx = (lo + hi) / 2;
    if (hi > lo && me) {
      const w = me.gk ? .55 : .3, fx = me.x + socClamp(b.x - me.x, -VW * .4, VW * .4) * w;
      const c = W.cam.x + VW / 2, dz = VW * .12;
      tx = W.cam.x;
      if (fx > c + dz) tx = fx - dz - VW / 2; else if (fx < c - dz) tx = fx + dz - VW / 2;
      tx = socClamp(tx, lo, hi);
    }
    W.cam.x += (tx - W.cam.x) * (1 - Math.exp(-3.2 * dt));
    W.cam.y = camY();
  }

  /* ---- the step ---- */
  function input() {
    const k = api.input, d = c => k.down(c), pr = c => k.pressed(c);
    return {
      x: (d('ArrowRight') || d('KeyD') ? 1 : 0) - (d('ArrowLeft') || d('KeyA') ? 1 : 0),
      y: (d('ArrowDown') || d('KeyS') ? 1 : 0) - (d('ArrowUp') || d('KeyW') ? 1 : 0),
      pass: pr('KeyZ') || pr('KeyJ'),
      shoot: pr('KeyX') || pr('KeyK') || pr('Space')
    };
  }
  /* the full-time card: again, or back to the menu */
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
    if (pick === 'again') { W.sound('whistle', 1); const cfg = W.cfg; fade(() => start(cfg), .8); }
    else toMenu();
  }

  function update(dt) {
    W.t += dt;
    if (W.trans) {
      W.trans.t += dt;
      if (!W.trans.fired && W.trans.t >= W.trans.dur / 2) { W.trans.fired = true; W.trans.fn(); }
      if (W.trans.t >= W.trans.dur) W.trans = null;
    }
    if (W.banner) { W.banner.t += dt; if (W.banner.t > W.banner.dur) W.banner = null; }
    const b = W.ball;
    if (W.phase === 'menu') {
      if (!W.trans) W.menu.update(dt);
      for (const p of W.players) { p.ix = p.iy = 0; socPlayerStep(p, dt, W); }
      socCarry(W, dt);
      return;
    }
    if (W.phase === 'lineup') { lineupStep(dt); return; }
    const inp = input(), dn = c => api.input.down(c);
    /* what the controls panel shows held down */
    W.keys = { u: dn('ArrowUp') || dn('KeyW'), d: dn('ArrowDown') || dn('KeyS'), l: dn('ArrowLeft') || dn('KeyA'), r: dn('ArrowRight') || dn('KeyD'),
               Z: dn('KeyZ') || dn('KeyJ'), X: dn('KeyX') || dn('KeyK') || dn('Space') };
    /* the test page's own full-time card takes the screen from the HUD (in the arcade, the host says when) */
    if (!W.hosted) W.hudOff = W.phase === 'fulltime' && W.deadT > 1.2;
    /* online as a guest, this screen mirrors the host's match */
    if (NET && NET.pull) { guestStep(dt, inp); return; }
    if (NET) NET.input();
    if (W.phase === 'play') {
      W.clock -= dt;
      W.hint = Math.max(0, W.hint - dt);
      /* (a goal still waiting on a keeper's save online is settled first) */
      if (W.clock <= 0) { W.clock = 0; if (!(NET && NET.pending)) fullTime(); }
    }
    if (W.phase === 'play') {
      if (W.me) socHumanPlayer(W.me, W, inp, dt);
      socTeamAI(T0, W, dt); socTeamAI(T1, W, dt);
    } else if (W.phase === 'kickoff') {
      /* A quick one: the CPU goes as soon as it is set, and if it is yours,
         any key goes — run with it, or pass or shoot straight away. Online,
         a guest's kickoff goes when their screen says they have moved. */
      const K = W.ko;
      K.t += dt;
      for (const p of W.players) if (p !== K.taker) { p.ix = p.iy = 0; p.faceTo = Math.sign(b.x - p.x) || p.team.dir; }
      const mine = K.taker === W.me;
      const go = !W.trans && (mine ? (inp.x || inp.y || inp.pass || inp.shoot || K.t > 3) : K.taker.remote ? (NET.go(K.taker) || K.t > 3) : K.t > K.wait);
      if (go) { W.phase = 'play'; W.ko = null; if (W.me) socHumanPlayer(W.me, W, inp, dt); socTeamAI(T0, W, dt); socTeamAI(T1, W, dt); }
      else { K.taker.ix = K.taker.iy = 0; }
    } else {
      for (const p of W.players) { p.ix *= .9; p.iy *= .9; }
      W.deadT += dt;
      if (W.phase === 'goal' && W.deadT > 1.9 && !W.trans) { const t = W.teams[1 - W.goalFor.i]; fade(() => { kickoff(t); W.sound('whistle', 1); }, .55); W.deadT = -9; }
      if (W.phase === 'fulltime' && W.deadT > 1.6 && !W.trans) {
        if (!W.hosted) resultsInput();
        else if (!W.ended) {
          W.ended = true;
          if (NET) NET.over({ sc: W.score.slice(), shots: W.shots.slice(), poss: W.poss.slice() });
          host.end(result());
        }
      }
    }
    for (const p of W.players) socPlayerStep(p, dt, W);
    socRefStep(W, dt);
    if (W.phase === 'goal' || W.phase === 'fulltime') mood();
    socCarry(W, dt);
    let ev = socBallStep(b, dt, W.sound);
    /* online: a guest's kick making up the time it took to get here (net.js) */
    if (NET && W.phase === 'play' && !(ev && ev.goal)) ev = NET.catchUp(dt) || ev;
    if (W.phase === 'play') {
      socContacts(W, dt);
      /* online, a goal against a keeper on another screen waits for his save */
      if (ev && ev.goal) { if (NET) NET.goal(ev.goal, onGoal); else onGoal(ev.goal); }
      if (b.owner) W.poss[b.owner.team.i] += dt;
      if (b.kick && b.kick !== W.lastKick) { W.lastKick = b.kick; if (b.shot && b.kick.by) W.shots[b.kick.by.team.i]++; }
    }
    if (NET) NET.output(dt);
    tail(dt);
  }
  /* dust off a slide, the effects' clocks, and the camera */
  function tail(dt) {
    for (const p of W.players) {
      if (p.st === 'slide' && Math.hypot(p.vx, p.vy) > 60 && Math.floor(W.t * 12) !== Math.floor((W.t - dt) * 12)) W.puff(p.x - p.face * 4, p.y);
    }
    for (const f of W.fx) f.t += dt;
    W.fx = W.fx.filter(f => f.t < (f.k === 'dust' ? .32 : .18));
    if (W.phase !== 'fulltime') camStep(dt);
  }
  /* One step on a guest's screen: the host's match as it has arrived,
     your own player run here and now (the kickoff too, the moment you move
     if it is yours), and the result when the host sends it. */
  function guestStep(dt, inp) {
    const me = W.me;
    if (S.hostLeft && !W.ended) { W.ended = true; if (host.left) host.left(); return; }
    if (!NET.pull()) return;                          // nothing from the host yet
    NET.adopt();
    if (W.phase === 'play') W.hint = Math.max(0, W.hint - dt);
    const mineKo = W.phase === 'kickoff' && W.ko && W.ko.taker === me;
    if (mineKo && !NET.went && (inp.x || inp.y || inp.pass || inp.shoot)) NET.go();
    NET.mark();                                       // what your player was doing before the controls
    if (W.phase === 'play' || (mineKo && NET.went)) socHumanPlayer(me, W, inp, dt);
    else { me.ix = me.iy = 0; }
    NET.step(dt);
    if (W.over && !W.ended && host.end) { W.ended = true; host.end(result(W.over)); }
    tail(dt);
  }

  /* ---- online: the lineup (lineup.js) ----
     Before the kickoff everyone picks where they play, over the arena as
     it will be; the match is then built with the seats it settles on. */
  let LU = null;
  function lineup() {
    const cfg = Object.assign(socCfg(S.cfg), { quick: !!S.cfg.quick });      // quick: the test bench's
    LU = S.role === 'host' ? SocLineup.host(S, cfg) : SocLineup.guest(S, cfg);
    build(Object.assign({}, cfg, { mode: LU.mode }));
    W.me = null; W.phase = 'lineup';
    W.lineup = SocUI.lineup(api, { view: () => LU.view(), sheet: slotSheet, kits: () => [T0.kit, T1.kit], cursor });
  }
  function lineupStep(dt) {
    if (S.hostLeft && !W.ended) { W.ended = true; if (host.left) host.left(); return; }
    const seats = LU.step(dt, W.trans ? undefined : W.lineup.update());
    /* the host made room for everyone at a bigger size than this screen guessed */
    if (!seats && LU.mode !== W.cfg.mode) { build(Object.assign({}, W.cfg, { mode: LU.mode })); W.me = null; }
    for (const p of W.players) { p.ix = p.iy = 0; socPlayerStep(p, dt, W); }
    socCarry(W, dt);
    if (seats && !W.trans) { W.seats = seats; fade(() => { W.lineup = null; start(socCfg(S.cfg)); }, .6); }
  }
  /* the player on a lineup card: a person as they will look (by their place
     in the party, SOC_PEOPLE), or the computer's, in the side's kit */
  function slotSheet(team, role, k) {
    const cfg = W.cfg, kit = SOC_KITS[team ? cfg.opp : cfg.kit], gk = role === 'gk';
    let look;
    if (k !== undefined && k !== null) look = SOC_PEOPLE[k % SOC_PEOPLE.length];
    else if (gk) look = { hair: team ? 'black' : 'brown', tone: team ? 'brown' : 'light' };
    else look = SOC_LOOKS[team][Math.max(0, SOC_FORMS[cfg.mode].filter(f => f.role !== 'gk').findIndex(f => f.role === role))];
    return SocArt.dress(gk ? 'keeper' : look.sheet, kitLook(gk ? SOC_GK_KITS[team] : kit, look));
  }

  /* a round the arcade mounted to play (Restart, Play again) skips the menu;
     online it opens on the lineup */
  if (host.entry === 'play') {
    if (S) lineup();
    else { W.phase = 'kickoff'; start(socCfg(keep.saved())); }
  } else W.menu = SocUI.menu(api, hooks);
  return {
    update, render: ctx => view.render(ctx), world: W, pix: view.pix, destroy() { cursor(''); },
    get net() { return NET; },
    start: cfg => start(cfg), toMenu,
    /* Escape: from a match back to the menu is the pause card's job; on the
       menu there is nowhere further back but the hub */
    escape() {
      if (W.phase === 'menu' && host.hub) { host.hub(); return true; }
      return false;
    }
  };
}
