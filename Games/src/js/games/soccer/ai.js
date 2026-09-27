/* Team play. Every player the human is not steering is run here, keepers
   included. The human's controls are at the bottom.

   A team is { i, dir, gx, ox, players, gk, human, ... }: dir +1 attacks
   toward x = PL, gx is its own goal line, ox the one it attacks, gk its
   keeper (there is none in 1v1) and human the one player a person steers
   the whole match, if any. */

/* Where each position stands, in team-frame fractions of the pitch (x out
   from its own goal line, y across). One outfield player each in 1v1; from
   2v2 up every side has a keeper, and in 3v3 a defender behind a striker. */
const SOC_FORMS = {
  1: [{ role: 'fw', pos: 'STRIKER', fx: .30, fy: .5 }],
  2: [{ role: 'gk', pos: 'KEEPER', fx: .015, fy: .5 }, { role: 'fw', pos: 'STRIKER', fx: .36, fy: .5 }],
  3: [{ role: 'gk', pos: 'KEEPER', fx: .015, fy: .5 }, { role: 'df', pos: 'DEFENDER', fx: .22, fy: .42 },
      { role: 'fw', pos: 'STRIKER', fx: .44, fy: .6 }]
};
/* a team-frame x (0 = own goal line) to world x, and back */
const socWX = (t, fx) => t.dir > 0 ? fx : SOC.PL - fx;
const socTX = (t, x) => t.dir > 0 ? x : SOC.PL - x;

function socOpp(W, t) { return W.teams[1 - t.i]; }
function socMoveTo(p, x, y, slow = 26) {
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d < 3) { p.ix = p.iy = 0; return true; }
  const m = Math.min(1, d / slow);
  p.ix = dx / d * m; p.iy = dy / d * m;
  return false;
}

/* how long p needs to reach the ball, following it */
function socReachTime(p, b) {
  let t = socDist(p.x, p.y, b.x, b.y) / SOC.RUN;
  for (let k = 0; k < 3; k++) { const q = socBallAt(b, Math.min(t, 1.6)); t = socDist(p.x, p.y, q.x, q.y) / SOC.RUN; }
  if (p.st !== 'move') t += .5;
  return t;
}
function socChaser(t, W, except) {
  let best = null, bt = 1e9;
  for (const p of t.players) {
    if (p.gk || p === except || p.st === 'down' || p.st === 'getup') continue;
    const r = socReachTime(p, W.ball);
    if (r < bt) { bt = r; best = p; }
  }
  return best;
}

/* how close the nearest opponent comes to the line from p to (x, y) */
function socLane(p, W, x, y) {
  const dx = x - p.x, dy = y - p.y, d2 = dx * dx + dy * dy || 1;
  let lane = 1e9;
  for (const o of socOpp(W, p.team).players) {
    const u = socClamp(((o.x - p.x) * dx + (o.y - p.y) * dy) / d2, 0, 1);
    lane = Math.min(lane, socDist(o.x, o.y, p.x + dx * u, p.y + dy * u));
  }
  return lane;
}
/* the best teammate to pass to: open, forward, with a clear lane. With a
   direction (the human's stick), only teammates roughly that way count. The
   human is always worth a little more: a CPU side that never gives the ball
   to the person playing is no fun to be on. */
function socBestPass(p, W, dirx, diry) {
  const t = p.team, opp = socOpp(W, t).players;
  let best = null, bs = -1e9;
  for (const q of t.players) {
    if (q === p || q.gk || q.st === 'down') continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    if (d < 24 || d > 280) continue;
    let align = 0;
    if (dirx !== undefined) {
      const c = (dx * dirx + dy * diry) / d;
      if (c < .45) continue;
      align = c * 90;
    }
    let open = 70;
    for (const o of opp) open = Math.min(open, socDist(o.x, o.y, q.x, q.y));
    const lane = Math.min(50, socLane(p, W, q.x, q.y));
    const adv = dx * t.dir;
    const s = adv * .5 + open * .9 + Math.min(lane, 30) * 1.2 - d * .12 + align + (q.human ? 22 : 0);
    if (s > bs) { bs = s; best = { q, score: s, lane, d }; }
  }
  return best;
}

/* ---- actions the AI and the human share -------------------------------- */

function socDoPass(p, W, q, tx, ty) {
  if (q) p.face = Math.sign(q.x - p.x) || p.face;
  else if (Math.abs(tx - p.x) > 2) p.face = Math.sign(tx - p.x);
  socStartKick(p, 'pass', .07, b => {
    let x = tx, y = ty;
    if (q) {
      /* lead the receiver by where they are running */
      const d0 = socDist(b.x, b.y, q.x, q.y), lead = Math.min(.6, d0 / 200);
      x = q.x + q.vx * lead + q.team.dir * 4; y = q.y + q.vy * lead;
    }
    const d = socDist(b.x, b.y, x, y);
    let blocked = false;
    for (const o of socOpp(W, p.team).players) {
      const u = socClamp(((o.x - b.x) * (x - b.x) + (o.y - b.y) * (y - b.y)) / (d * d || 1), .1, .9);
      if (socDist(o.x, o.y, b.x + (x - b.x) * u, b.y + (y - b.y) * u) < 9) blocked = true;
    }
    if (d > 170 || (blocked && d > 50)) socKick(b, p, x, y, { kind: 'loft', T: socClamp(d / 200, .55, 1.15), h: q ? 4 : 0, target: q });
    else socKick(b, p, x, y, { kind: 'ground', arrive: 85 + d * .2, target: q });
    W.sound('pass');
  });
}
/* aim: -1 far post .. +1 near post (the stick's up/down) */
function socDoShoot(p, W, aim, noise) {
  const t = p.team;
  p.face = t.dir;
  socStartKick(p, 'shoot', .12, b => {
    const gy = SOC.PD / 2 + aim * (SOC.POST - 9) + socRand(-noise, noise);
    const d = Math.abs(t.ox - b.x);
    socKick(b, p, t.ox, gy, { kind: 'drive', v: socRand(285, 330), vz: d < 70 ? socRand(15, 60) : socRand(40, 110), shot: true });
    W.sound('kick', 1); W.spark(b.x, b.y - 5);
  });
}
/* a lob at goal, up over whoever is in front of it and down under the bar */
function socDoChip(p, W, aim) {
  const t = p.team;
  p.face = t.dir;
  socStartKick(p, 'shoot', .12, b => {
    const gy = SOC.PD / 2 + aim * (SOC.POST - 14), d = Math.abs(t.ox - b.x);
    socKick(b, p, t.ox + t.dir * 6, gy, { kind: 'loft', T: socClamp(d / 190, .55, 1.3), h: SOC.BAR - 12, shot: true });
    W.sound('kick', .8);
  });
}
/* a long ball upfield, away from trouble */
function socDoClear(p, W) {
  const t = p.team, q = socBestPass(p, W);
  const tx = q && q.q.x * t.dir > p.x * t.dir ? q.q.x : socWX(t, socTX(t, p.x) + 170), ty = q ? q.q.y : socClamp(p.y + socRand(-60, 60), 30, SOC.PD - 30);
  p.face = t.dir;
  socStartKick(p, 'shoot', .12, b => {
    socKick(b, p, tx, ty, { kind: 'loft', T: .95, target: q ? q.q : null });
    W.sound('kick', .8);
  });
}
function socHeadable(p, b) {
  if (b.owner || p.st !== 'move') return false;
  const a = socBallAt(b, .16);
  return a.z > 11 && a.z < 38 && Math.hypot(a.x - p.x, (a.y - p.y) * 1.3) < 20;
}
/* header: at goal when near it, else to a teammate or upfield */
function socDoHeader(p, W, toGoal, aim = 0) {
  const t = p.team;
  if (Math.abs(W.ball.x - p.x) > 2) p.face = Math.sign(W.ball.x - p.x);
  socHeader(p, b => {
    if (toGoal) {
      const gy = SOC.PD / 2 + aim * (SOC.POST - 10) + socRand(-6, 6);
      socKick(b, p, t.ox, gy, { kind: 'drive', v: 235, vz: b.z > 16 ? -20 : 25, shot: true });
      return;
    }
    const q = socBestPass(p, W);
    if (q) socKick(b, p, q.q.x, q.q.y, { kind: 'loft', T: socClamp(q.d / 190, .4, .8), target: q.q });
    else socKick(b, p, socWX(t, socTX(t, p.x) + 90), p.y, { kind: 'loft', T: .6 });
  });
}

/* ---- the AI ------------------------------------------------------------ */

function socTeamAI(t, W, dt) {
  const b = W.ball, o = b.owner, has = o && o.team === t, hp = t.human;
  if (t.call && (t.call.t -= dt) <= 0) t.call = null;
  /* A human playing outfield does their side's chasing: the CPU teammates
     only go for the ball when they are clearly nearer to it, or it is deep
     in their own third. A human in goal chases nothing, so the outfield in
     front of them plays as a full CPU side. */
  let chaser = has ? null : socChaser(t, W, hp);
  if (chaser && hp && !hp.gk && hp.st !== 'down' && hp.st !== 'getup') {
    if (!(socReachTime(chaser, b) < socReachTime(hp, b) * .7 || socTX(t, b.x) < SOC.PL * .3)) chaser = null;
  }
  t.chaser = chaser;
  for (const p of t.players) {
    if (p.human) continue;
    if (p.gk) { socKeeperAI(p, W, dt); continue; }
    if (p.st !== 'move') continue;
    p.faceTo = 0; p.boost = 1;
    if (!t.gk && socBlock(p, W, dt)) continue;
    if (o === p) socCarrierAI(p, W, dt);
    else if (!o && b.target === p) socReceive(p, W);
    else if (chaser === p) socChase(p, W, dt);
    else socSupport(p, W, has);
    if (!o && socHeadable(p, b) && (chaser === p || b.target === p) && Math.random() < dt * 12) {
      socDoHeader(p, W, Math.abs(t.ox - p.x) < 150);
    }
  }
}

/* With nobody in goal (1v1), a shot has to get past you: read it after a
   moment, like a keeper does, and if it is going to pass close enough,
   slide across its path. True while that is what this player is doing. */
function socBlock(p, W, dt) {
  const b = W.ball, t = p.team;
  if (!b.shot || b.owner || !b.kick || b.kick.by.team === t || b.vx * t.dir >= 0) { p.blk = null; return false; }
  if (!p.blk || p.blk.kick !== b.kick) p.blk = { kick: b.kick, t: socRand(.05, .11) };
  const tc = (p.x - b.x) / b.vx;                     // when it comes level with us
  if (tc < 0 || tc > .6) return false;
  const at = socBallAt(b, tc), dy = at.y - p.y;
  if (Math.abs(dy) > 30 || at.z > 14) return false;
  if ((p.blk.t -= dt) > 0) return true;              // still reading it: stand
  /* close to its line: a step across is enough; further: slide across */
  if (Math.abs(dy) < 12) socMoveTo(p, p.x, at.y, 2);
  else if (p.slideCd <= 0) socSlide(p, (b.x - p.x) * .15, dy);
  return true;
}

function socSupport(p, W, has) {
  const t = p.team, b = W.ball, f = p.form, PL = SOC.PL, PD = SOC.PD;
  const bx = socTX(t, b.x);
  let x = f.fx * PL + (bx - PL * .5) * .55 + (has ? 55 : -15);
  if (f.role === 'df') x = socClamp(x, 40, has ? PL * .62 : Math.max(40, bx - 16));
  else x = socClamp(has ? Math.max(x, bx + 24) : x, PL * .28, PL - 60);
  let y = f.fy * PD + (b.y - PD / 2) * .42;
  if (has && b.owner) {
    /* give the carrier an angle: not level with them, not on top of them */
    const c = b.owner, dy = y - c.y;
    if (Math.abs(dy) < 36) y = c.y + (dy >= 0 ? 36 : -36);
  }
  y = socClamp(y, 16, PD - 16);
  if (socMoveTo(p, socWX(t, x), y)) p.faceTo = Math.sign(b.x - p.x) || t.dir;
}

function socReceive(p, W) {
  const b = W.ball, sp = Math.hypot(b.vx, b.vy);
  /* a lofted ball: be where it comes down */
  if (b.z > 8 && b.kick && b.kick.kind === 'loft') { if (socMoveTo(p, b.kick.to[0], b.kick.to[1], 8)) p.faceTo = Math.sign(b.x - p.x) || p.face; return; }
  if (sp < 25) { socMoveTo(p, b.x, b.y, 8); return; }
  const ux = b.vx / sp, uy = b.vy / sp, s = (p.x - b.x) * ux + (p.y - b.y) * uy;
  if (s < 0) { socMoveTo(p, b.x, b.y, 8); return; }
  /* step onto the ball's line, a little toward it */
  const cx = b.x + ux * Math.max(0, s - 6), cy = b.y + uy * Math.max(0, s - 6);
  if (socMoveTo(p, cx, cy, 10)) p.faceTo = Math.sign(b.x - p.x) || p.face;
}

function socChase(p, W, dt) {
  const b = W.ball, t = p.team, o = b.owner;
  if (o && o.team !== t) {
    if (o.holding) { socSupport(p, W, false); return; }
    /* With nobody in goal behind you, you are the last line: stay between
       the ball and the goal, backing off as it comes, so every shot has to
       get past you, and only go in when the tackle is on. */
    if (!t.gk) {
      const gx = t.gx, gy = SOC.PD / 2, dG = socDist(o.x, o.y, gx, gy) || 1;
      const ux = (o.x - gx) / dG, uy = (o.y - gy) / dG;                      // from our goal toward the ball
      /* beaten, with the ball between you and your own goal: flat out to
         get back goal-side, a little quicker than anyone can dribble */
      p.boost = socDist(p.x, p.y, gx, gy) > dG - 4 ? 1.2 : 1;
      if (dG > 190) {
        /* far out: press, a step goal-side of it */
        const back = socClamp(dG * .28, 13, 44);
        socMoveTo(p, o.x - ux * back + o.vx * .2, o.y - uy * back + o.vy * .2, 8);
      } else if (dG > 60) {
        /* in range: stand on the line to goal, out toward the ball, where a
           body covers most of the angle a small goal leaves to shoot at */
        const stand = socClamp(dG * SOC.STAND, 18, 110);
        socMoveTo(p, gx + ux * stand, gy + uy * stand, 8);
      } else socMoveTo(p, o.x - ux * 8, o.y - uy * 8, 5);      // right on top of goal: go and take it
      const near = socDist(p.x, p.y, b.x, b.y);
      if (near < 16 && p.slideCd <= 0 && Math.random() < dt * (t.slide ?? 1.2) * 1.3) {
        const a = socBallAt(b, .1);
        socSlide(p, a.x - p.x, (a.y - p.y) * .7);
      }
      return;
    }
    /* stand goal-side of the carrier, then take it */
    const gx = t.gx, gy = SOC.PD / 2, d = socDist(o.x, o.y, gx, gy) || 1;
    const tx = o.x + (gx - o.x) / d * 5 + o.vx * .15, ty = o.y + (gy - o.y) / d * 5 + o.vy * .15;
    socMoveTo(p, tx, ty, 6);
    const near = socDist(p.x, p.y, b.x, b.y);
    if (near < 20 && near > 7 && p.slideCd <= 0 && Math.random() < dt * (t.slide ?? 1.2)) {
      const a = socBallAt(b, .12);
      socSlide(p, a.x - p.x, (a.y - p.y) * .7);
    }
    return;
  }
  const r = socReachTime(p, b), a = socBallAt(b, Math.min(r, 1.6));
  socMoveTo(p, a.x, a.y, 6);
}

function socCarrierAI(p, W, dt) {
  const t = p.team, b = W.ball, PD = SOC.PD, mid = PD / 2;
  p.think = (p.think || 0) - dt;
  const opp = socOpp(W, t).players, k = socOpp(W, t).gk;
  const gdx = t.ox - p.x, gdy = mid - p.y, dG = Math.hypot(gdx, gdy);
  /* the far side of the goal from the keeper; with no keeper, either */
  const aimFar = () => (k ? (k.y < mid ? 1 : -1) : Math.random() < .5 ? 1 : -1);
  /* the nearest opponent ahead of the ball */
  let threat = null, td = 1e9;
  for (const q of opp) {
    if (q.st === 'down') continue;
    const dx = (q.x - p.x) * t.dir, d = socDist(p.x, p.y, q.x, q.y);
    if (dx > -8 && d < td) { td = d; threat = q; }
  }
  /* A slide coming in at the ball: a quick cut away from its line, more
     often than not, so a tackle has to be timed and a mistimed one leaves
     the tackler on the grass while the ball goes on without them. */
  for (const q of opp) {
    if (q.st !== 'slide' || q.stT > .22 || q.act.seen) continue;
    const hx = q.x + q.act.dx * 11, hy = q.y + q.act.dy * 7;
    if (socDist(hx, hy, b.x, b.y) > 30) continue;
    q.act.seen = true;
    if (Math.random() < (t.dodge ?? .5)) {
      const nx = -q.act.dy, ny = q.act.dx, s = ((b.x - q.x) * nx + (b.y - q.y) * ny) >= 0 ? 1 : -1;
      p.ix = nx * s * .9 + t.dir * .3; p.iy = ny * s * .9; p.think = .28;
      return;
    }
  }
  /* a teammate calling for it (the human, on Z) gets it whenever the lane
     is anything like open */
  const call = t.call;
  if (call && call.p !== p && call.p.st === 'move' && socDist(p.x, p.y, call.p.x, call.p.y) > 20 && socLane(p, W, call.p.x, call.p.y) > 9) {
    t.call = null; socDoPass(p, W, call.p); return;
  }
  if (p.think <= 0) {
    p.think = socRand(.12, .22);
    const inOwnThird = socTX(t, p.x) < SOC.PL * .3;
    if (!k) {
      /* nobody in goal: shoot as soon as either side of it is open, at that side */
      const lanes = [-1, 1].map(s => socLane(p, W, t.ox, mid + s * (SOC.POST - 6)));
      const side = lanes[0] > lanes[1] ? -1 : 1, open = Math.max(lanes[0], lanes[1]);
      if (open > 8 && Math.abs(gdy) < 90 && Math.random() < (dG < 150 ? .6 : dG < 230 ? .18 : 0)) {
        socDoShoot(p, W, side * socRand(.5, .95), t.shotNoise ?? 10); return;
      }
    } else {
      if (dG < 118 && Math.abs(gdy) < 100 && Math.random() < .75) {
        socDoShoot(p, W, aimFar() * (Math.random() < .75 ? 1 : -1) * socRand(.6, 1.08), t.shotNoise ?? 10); return;
      }
      if (dG < 170 && Math.abs(gdy) < 80 && Math.random() < .18) {
        socDoShoot(p, W, aimFar() * socRand(.5, 1), (t.shotNoise ?? 10) + 4); return;
      }
    }
    if (threat && td < 26) {
      const q = socBestPass(p, W);
      if (inOwnThird && (!q || q.score < 20) && Math.random() < .5) { socDoClear(p, W); return; }
      if (q && q.score > 10 && Math.random() < .7) { socDoPass(p, W, q.q); return; }
    } else if (Math.random() < (t.passRate ?? .07)) {
      const q = socBestPass(p, W);
      if (q && q.score > 45 && (q.q.x - p.x) * t.dir > 20) { socDoPass(p, W, q.q); return; }
    }
    /* dribble at goal, veering from whoever is in the way */
    let dx = gdx / dG, dy = gdy / dG * .6;
    if (threat && td < 50) {
      const side = (p.y - threat.y) || (p.y < mid ? -1 : 1);
      dy += Math.sign(side) * (1 - td / 50) * 1.3;
    }
    if (p.y < 20) dy = Math.max(dy, .3);
    if (p.y > PD - 20) dy = Math.min(dy, -.3);
    const m = Math.hypot(dx, dy); p.ix = dx / m; p.iy = dy / m;
  }
}

function socKeeperAI(k, W, dt) {
  const t = k.team, b = W.ball, PD = SOC.PD, mid = PD / 2;
  k.faceTo = t.dir;
  if (k.st === 'hold') {
    k.act.t = (k.act.t || 0) + dt;
    k.ix = k.iy = 0;
    if (k.act.t > (W.phase === 'play' ? .7 : 1e9)) socKeeperDistribute(k, W);
    return;
  }
  if (k.st !== 'move' || k.human) return;
  /* the ball at his feet out of his area: no hands, so get rid of it */
  if (b.owner === k) { socDoClear(k, W); return; }
  const sp = Math.hypot(b.vx, b.vy);
  /* A shot, or anything fast, coming at goal. The keeper reads it after a
     moment, shuffles across while it is still far, and only then commits:
     a catch if it is at him, else a dive timed to arrive with the ball. */
  const coming = !b.owner && b.vx * t.dir < -60 && socTX(t, b.x) < 280;
  if (coming && W.phase === 'play') {
    const tk = (k.x - b.x) / (b.vx || 1e-6);
    const cross = socBallAt(b, Math.max(0, (t.gx - b.x) / b.vx));
    const at = socBallAt(b, Math.max(0, tk));
    if (tk > 0 && tk < 1.4 && (Math.abs(cross.y - mid) < SOC.POST + 8 || Math.abs(at.y - k.y) < 22)) {
      if (k.react === undefined) k.react = socRand(t.gkReact?.[0] ?? .15, t.gkReact?.[1] ?? .24);
      k.react -= dt;
      if (k.react > 0) return;                       // still reading it
      if (k.react < -5) { socMoveTo(k, k.x, at.y, 6); return; }   // beaten: watch it go
      const dy = at.y - k.y;
      if (tk > .42) { socMoveTo(k, socWX(t, 7), at.y, 5); return; }
      if (Math.abs(dy) < 7) { socCatch(k, at.z > 17); k.react = undefined; return; }
      /* dive at the speed that gets the gloves there in time; if that is
         more than he has, he still goes, flat out, and may fall short */
      if (Math.abs(dy) < 64) { socDive(k, dy < 0 ? 'up' : 'down', at.z < 5, Math.max(50, (Math.abs(dy) - 12) / Math.max(tk, .1))); k.react = undefined; return; }
      k.react = -9;
      return;
    }
  } else k.react = undefined;
  /* loose in the box and slow: go and claim it */
  if (!b.owner && sp < 90 && socInBox(k, b) && b.z < 10) {
    const oppNear = socOpp(W, t).players.some(q => socDist(q.x, q.y, b.x, b.y) < socDist(k.x, k.y, b.x, b.y) * .8);
    if (!oppNear || socDist(k.x, k.y, b.x, b.y) < 30) { socMoveTo(k, b.x, b.y, 4); return; }
  }
  /* one on one: an opponent running in on goal with the ball */
  const o = b.owner;
  if (o && o.team !== t && socInBox(k, b)) {
    const d = socDist(k.x, k.y, o.x, o.y);
    if (d < 20 && Math.random() < dt * 4) { k.face = Math.sign(o.x - k.x) || t.dir; socDive(k, 'fwd', true, 30); return; }
    socMoveTo(k, (k.x + o.x) / 2, o.y, 6); return;
  }
  /* on the line between ball and goal, further out as the ball comes near */
  const dBall = socDist(b.x, b.y, t.gx, mid), out = socClamp(1 - dBall / 220, 0, 1);
  const tx = socWX(t, 7 + out * 14), ty = mid + socClamp((b.y - mid) * (.3 + out * .25), -(SOC.POST - 8), SOC.POST - 8);
  socMoveTo(k, tx, ty, 14);
}

/* a keeper with the ball in his hands: thrown to someone near and open, or
   punted long. A human keeper picks which, and roughly where. */
function socKeeperDistribute(k, W) {
  const q = socBestPass(k, W);
  if (q && q.d < 150 && q.lane > 16) socKeeperThrow(k, W, q.q);
  else socKeeperPunt(k, W);
}
function socKeeperThrow(k, W, q) {
  socRelease(k, 'throw', b => {
    b.x = k.x + k.face * 6; b.z = 18;
    const d = socDist(b.x, b.y, q.x, q.y);
    socKick(b, k, q.x + q.vx * .3, q.y + q.vy * .3, { kind: 'loft', T: socClamp(d / 230, .35, .7), target: q });
    W.sound('pass');
  });
}
function socKeeperPunt(k, W, aimY) {
  const t = k.team, far = t.players.filter(p => !p.gk).sort((a, c) => (c.x - a.x) * t.dir)[0];
  socRelease(k, 'punt', b => {
    b.x = k.x + k.face * 7; b.z = 6;
    let tx = far ? far.x : socWX(t, SOC.PL * .6), ty = far ? far.y : SOC.PD / 2;
    if (aimY !== undefined) { tx = socWX(t, SOC.PL * .62); ty = SOC.PD / 2 + aimY * SOC.PD * .3; }
    socKick(b, k, tx, ty, { kind: 'loft', T: 1.2, target: aimY === undefined ? far || null : null });
    W.sound('kick', .9);
  });
}

/* ---- the human ---------------------------------------------------------- */

/* The human steers one player the whole match: the position picked on the
   menu. inp: { x, y } stick, pass / shoot pressed this step. */
function socHuman(t, W, inp, dt) { if (t.human) socHumanPlayer(t.human, W, inp, dt); }
/* Online there is a human on each screen, several to a side: each is run
   by the same controls, for their own player. */
function socHumanPlayer(c, W, inp, dt) {
  const t = c.team, b = W.ball, o = b.owner;
  const sm = Math.hypot(inp.x, inp.y), sx = sm ? inp.x / sm : 0, sy = sm ? inp.y / sm : 0;
  c.shout = Math.max(0, (c.shout || 0) - dt);
  if (c.gk && !(o === c && !c.holding)) { socHumanKeeper(c, W, inp, sm, sx, sy, dt); return; }
  if (c.st === 'move') {
    /* a pass on its way to you: run onto it unless you are steering */
    if (!sm && !o && b.target === c) socReceive(c, W);
    else { c.ix = inp.x; c.iy = inp.y; }
  }
  const mates = t.players.some(p => p !== c && !p.gk);
  if (inp.pass) {
    if (o === c && c.st === 'move') {
      const dx = sm ? sx : c.face, dy = sm ? sy : 0, q = socBestPass(c, W, dx, dy);
      if (q) socDoPass(c, W, q.q);
      else if (mates) socDoPass(c, W, null, c.x + dx * 90, c.y + dy * 90);
      else socDoChip(c, W, inp.y);                 // nobody to pass to: a lob at goal
    } else if (socHeadable(c, b)) socDoHeader(c, W, false);
    else if (o && o.team === t && o !== c) { t.call = { p: c, t: 1.2 }; c.shout = 1.1; }   // "here!"
  }
  if (inp.shoot) {
    if (o === c && c.st === 'move') socDoShoot(c, W, inp.y, 4);
    else if (socHeadable(c, b)) socDoHeader(c, W, true, inp.y);
    else if (c.st === 'move' && c.slideCd <= 0 && o !== c) socSlide(c, sm ? sx : c.face, sm ? sy : 0);
  }
}

/* In goal: move anywhere, X to dive (the stick says which way; without it,
   toward where the ball is going), and once it is in your hands Z throws it
   to a teammate and X punts it long. Hold on too long and it goes anyway. */
function socHumanKeeper(k, W, inp, sm, sx, sy, dt) {
  const t = k.team, b = W.ball, mid = SOC.PD / 2;
  if (k.st === 'hold') {
    k.ix = k.iy = 0;
    k.act.t = (k.act.t || 0) + dt;
    if (inp.pass || k.act.t > 3) {
      const q = socBestPass(k, W, sm ? sx : t.dir, sm ? sy : 0) || socBestPass(k, W);
      if (q) socKeeperThrow(k, W, q.q); else socKeeperPunt(k, W, sy);
    } else if (inp.shoot) socKeeperPunt(k, W, sy);
    return;
  }
  if (k.st !== 'move') return;
  k.ix = inp.x; k.iy = inp.y; k.faceTo = t.dir;
  if (!inp.shoot) return;
  let dir = null;
  if (sm && Math.abs(sy) > .35) dir = sy < 0 ? 'up' : 'down';
  else if (sm && sx * t.dir > .35) dir = 'fwd';
  else {
    /* no stick: at the ball's line where it will pass him */
    const tk = !b.owner && Math.abs(b.vx) > 20 ? (k.x - b.x) / b.vx : -1;
    const at = tk > 0 && tk < 1.5 ? socBallAt(b, tk) : { x: b.x, y: b.y, z: b.z };
    const dy = at.y - k.y;
    if (Math.abs(dy) < 8) { socCatch(k, at.z > 17); return; }
    dir = dy < 0 ? 'up' : 'down';
  }
  k.face = t.dir;
  const low = b.z < 8;
  socDive(k, dir, low, dir === 'fwd' ? 80 : 100);
  if (dir !== 'fwd' && Math.abs(k.y - mid) > SOC.POST + 30) k.vy *= .6;   // well wide of goal, a shorter dive
}
