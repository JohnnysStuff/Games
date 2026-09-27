/* Test helpers for tests/soccer.html?debug: scripted shots at a keeper, and
   whole CPU-against-CPU matches in any mode, run as fast as the machine
   allows. */
const SocDebug = {
  /* start a match in `mode` with nobody steering: both sides on the CPU */
  cpu(game, mode = 2, min = 3, pos = 'fw') {
    const W = game.world;
    game.start({ mode, pos, kit: 0, opp: 1, min });
    const t = W.teams[0];
    if (t.human) { t.human.human = false; t.human = null; }
    W.me = null;                        // the player a person would steer: the CPU's too
    W.hudOff = false;
    W.banner = null; W.trans = null; W.hint = 0;
    return W;
  },
  /* clear the pitch and fire one shot at team 0's goal; returns the outcome */
  shot(game, { x = 120, y = 112, toY = 90, v = 300, vz = 50, keeperY = null } = {}) {
    const W = game.world, b = W.ball, t = W.teams[0], k = t.gk;
    W.phase = 'play'; W.banner = null; W.trans = null; W.ko = null;
    W.clock = 999;
    for (const p of W.players) {
      socState(p, 'move', p.gk ? 'ready' : 'idle');
      p.vx = p.vy = p.vz = p.z = 0; p.holding = false; p.react = undefined; p.cd = 0;
      if (!p.gk) { p.x = SOC.PL - 60 + p.i * 8; p.y = 20 + p.team.i * 150; }
    }
    const mid = SOC.PD / 2;
    if (k) { k.x = 7; k.y = keeperY ?? mid + (y - mid) * .3; k.face = 1; }
    Object.assign(b, { x, y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, inNet: 0, hidden: false, target: null });
    socKick(b, W.teams[1].players.find(p => !p.gk), 0, toY, { kind: 'drive', v, vz, shot: true });
    const score = W.score.join('-');
    for (let i = 0; i < 240; i++) {
      game.update(1 / 120);
      if (W.score.join('-') !== score) return 'goal';
      if (k && b.owner === k) return 'caught';
      if (k && b.last === k && !b.owner && b.kickT > .3) return 'parried';
    }
    return 'stopped';
  },
  /* many shots from a distance band at random spots on target */
  shots(game, n, d0, d1) {
    const tally = {};
    for (let i = 0; i < n; i++) {
      const d = socRand(d0, d1), a = socRand(-.9, .9);
      const x = Math.cos(a) * d, y = SOC.PD / 2 + Math.sin(a) * d * .7;
      const toY = SOC.PD / 2 + socRand(-1, 1) * (SOC.POST - 8);
      const r = this.shot(game, { x, y: socClamp(y, 10, SOC.PD - 10), toY, v: socRand(285, 330), vz: socRand(30, 100) });
      tally[r] = (tally[r] || 0) + 1;
    }
    return tally;
  },
  /* a whole CPU match in `mode`: goals, shots, possession, and whether the
     ball ever sat still in play for five seconds */
  match(game, mode = 2, minutes = 3) {
    const W = this.cpu(game, mode, minutes);
    const log = { mode, goals: [], stuck: 0, phases: {}, walls: 0 };
    let lastBall = [0, 0], still = 0;
    const snd = W.sound;
    W.sound = (n, ...a) => { if (n === 'board') log.walls++; };
    try {
      for (let i = 0; i < minutes * 60 * 120 * 3 && W.phase !== 'fulltime'; i++) {
        const ph = W.phase;
        game.update(1 / 120);
        log.phases[W.phase] = (log.phases[W.phase] || 0) + 1;
        if (ph !== 'goal' && W.phase === 'goal') log.goals.push(`${(minutes * 60 - W.clock).toFixed(0)}s ${W.score.join('-')}`);
        const b = W.ball;
        if (Math.hypot(b.x - lastBall[0], b.y - lastBall[1]) < .01 && W.phase === 'play' && !(b.owner && b.owner.holding)) still++; else still = 0;
        if (still === 600) log.stuck++;
        lastBall = [b.x, b.y];
      }
    } finally { W.sound = snd; }
    log.score = W.score.join('-');
    log.shots = W.shots.join('-');
    const tot = W.poss[0] + W.poss[1] || 1;
    log.possession = Math.round(W.poss[0] / tot * 100) + '%';
    for (const k in log.phases) log.phases[k] = +(log.phases[k] / 120).toFixed(1);
    return log;
  },
  /* A stand-in human steering team 0's own player: chases the ball, dribbles
     at goal, shoots from range, slides at carriers. Plays through
     api.input, so it exercises the same path as the keyboard. */
  /* o.human: play like a person rather than a machine: look again only
     every 0.15-0.3 s (holding the same keys in between), and aim a shot
     at a corner only some of the time */
  autoHuman(game, api, seconds, o = {}) {
    const W = game.world, t = W.teams[0], real = api.input, stats = { passes: 0, shots: 0, slides: 0, dives: 0 };
    let held = new Set(), pressed = new Set(), wait = 0;
    api.input = { down: c => held.has(c), pressed: c => pressed.has(c), pointer: real.pointer, takeClick: () => null };
    try {
      for (let i = 0; i < seconds * 120 && W.phase !== 'fulltime'; i++) {
        if (o.human) {
          pressed = new Set();
          if ((wait -= 1 / 120) > 0) { game.update(1 / 120); continue; }
          wait = socRand(.15, .3);
        }
        held = new Set(); pressed = new Set();
        const c = t.human, b = W.ball;
        if (c && (W.phase === 'play' || W.phase === 'kickoff')) {
          let tx, ty;
          if (c.gk) {
            tx = 7; ty = SOC.PD / 2 + socClamp((b.y - SOC.PD / 2) * .4, -40, 40);
            if (b.owner === c && c.holding) { if (Math.random() < .02) pressed.add('KeyZ'); }
            else if (!b.owner && b.vx < -150 && b.x < 120 && Math.random() < .08) { pressed.add('KeyX'); stats.dives++; }
          } else if (b.owner === c) {
            tx = SOC.PL; ty = SOC.PD / 2 + (c.y < SOC.PD / 2 ? 30 : -30);
            if (SOC.PL - c.x < (o.range || 120) && Math.random() < (o.human ? .3 : .05)) {
              pressed.add('KeyX'); stats.shots++;
              if (!o.human || Math.random() < .5) held.add(c.y < SOC.PD / 2 ? 'ArrowDown' : 'ArrowUp');
            }
            else if (W.teams[1].players.some(q => !q.gk && socDist(q.x, q.y, c.x, c.y) < 20 && (q.x - c.x) > 0) && Math.random() < (o.human ? .3 : .04)) { pressed.add('KeyZ'); stats.passes++; }
          } else {
            const a = socBallAt(b, .2); tx = a.x; ty = a.y;
            if (b.owner && b.owner.team !== t && socDist(c.x, c.y, b.x, b.y) < 18 && c.slideCd <= 0 && Math.random() < (o.human ? .35 : .03)) { pressed.add('KeyX'); stats.slides++; }
          }
          if (tx !== undefined) {
            const dx = tx - c.x, dy = ty - c.y;
            if (dx > 3) held.add('ArrowRight'); if (dx < -3) held.add('ArrowLeft');
            if (dy > 3) held.add('ArrowDown'); if (dy < -3) held.add('ArrowUp');
          }
        }
        game.update(1 / 120);
      }
    } finally { api.input = real; }
    return { score: W.score.join('-'), shots: W.shots.join('-'), ...stats };
  }
};
