/* Players: how they move, jump, dive and serve, and which drawing shows it.
   The AI and the person at the keys only set an intent (ix, iy) and start
   the actions here; what a touch does with the ball is the rally's
   (rally.js), which asks volZone where each player can reach it.

   States: move, pass (a bump or a set, waiting on the ball), jump (a spike
   or a block), serve, dive, down (lying after a dive), getup, pose.
   Everything is drawn facing the net: a side's `dir` is the way it faces,
   and the sheet, drawn facing right, is mirrored for the right-hand side.

   A jump, a serve and a dive pick their drawing from what the body is
   doing rather than from a clock (p.fr), so the arm comes through at the
   moment of contact however early or late that is. */
function volPlayer(team, i, sheet) {
  return {
    team, i, sheet, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    face: team.dir, ix: 0, iy: 0, boost: 1,
    st: 'move', an: 'ready', at: 0, stT: 0, act: {}, fr: null,
    human: false, lvl: null, relax: false, call: 0, name: '', idx: 0, walked: 0
  };
}

function volSetAn(p, an) { if (p.an !== an) { p.an = an; p.at = 0; } }
function volState(p, st, an, act) {
  p.st = st; p.stT = 0; p.act = act || {}; p.fr = null;
  if (an) { p.an = an; p.at = 0; }
}
function volAnimDur(p, an) { const a = p.sheet.meta.anims[an || p.an]; return a.frames * a.t; }
function volFrame(p) {
  if (p.fr !== null && p.fr !== undefined) return p.fr;
  const a = p.sheet.meta.anims[p.an];
  if (a.loop) return Math.floor(p.at / a.t) % a.frames;
  const i = Math.floor(p.at / a.t);
  /* a tail: played through once, then the last few frames go round */
  if (a.tail && i >= a.frames) return a.frames - a.tail + Math.floor((p.at - a.frames * a.t) / Math.max(a.t, .18)) % a.tail;
  return Math.min(a.frames - 1, i);
}
const volOnGround = p => p.z <= 0 && p.vz <= 0;

/* ---- actions ---------------------------------------------------------- */

/* A bump or a set, ready for the ball: the arms go up into position and
   wait up to `win` seconds for it (rally.js makes the contact). */
function volPass(p, kind, win) {
  volState(p, 'pass', kind, { kind, win: win || .42, hit: false });
}
/* off the ground: a spike or a block */
function volJump(p, kind) {
  volState(p, 'jump', kind, { kind, up: false, hit: false, hitT: 0, landT: -1 });
  if (kind === 'block') { p.vx *= .2; p.vy *= .2; }
}
/* full length along (dx, dy) for a ball out of reach */
function volDive(p, dx, dy) {
  const m = Math.hypot(dx, dy) || 1;
  volState(p, 'dive', 'dive', { dx: dx / m, dy: dy / m, hit: false, landT: -1 });
  p.vx = dx / m * 200; p.vy = dy / m * 200; p.vz = 42;
}
/* A serve: 'float' from a toss at head height, or 'jump', tossed high and
   hit at the top of a jump. fire(ball) sends it on its way at the contact. */
const VOL_SERVE = {
  float: { fire: .41, end: .72, frames: [[.06, 0], [.24, 1], [.36, 2], [.48, 3], [.6, 4], [9, 5]] },
  jump: { fire: .81, jumpAt: .47, stepAt: .3, end: 1.28, frames: [[.06, 0], [.3, 1], [.45, 2]] }
};
function volServe(p, kind, fire) {
  volState(p, 'serve', kind === 'jump' ? 'jumpserve' : 'serve', { kind, fire, done: false });
  p.vx = p.vy = 0;
}
/* a pose held until the next serve: a celebration, a lament, or just standing */
function volPose(p, an) { volState(p, 'pose', an); }

/* ---- the step --------------------------------------------------------- */

function volPlayerStep(p, dt, W) {
  p.stT += dt;
  let adv = dt;
  const damp = k => { const f = Math.exp(-k * dt); p.vx *= f; p.vy *= f; };
  /* steer toward the intent at `sp` (the player's own top speed, scaled) */
  const steer = sp => {
    let ix = p.ix, iy = p.iy;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const tx = ix * sp, ty = iy * sp, ex = tx - p.vx, ey = ty - p.vy, e = Math.hypot(ex, ey), acc = VOL.ACC * dt;
    if (e <= acc) { p.vx = tx; p.vy = ty; } else { p.vx += ex / e * acc; p.vy += ey / e * acc; }
  };
  switch (p.st) {
    case 'move': {
      if (!p.remote) steer(VOL.RUN * p.boost);
      const sp = Math.hypot(p.vx, p.vy);
      /* in a rally everyone faces the net; walking back to their places
         between points, the way they are going */
      if (p.relax && Math.abs(p.vx) > 10) p.face = Math.sign(p.vx);
      else if (!p.relax) p.face = p.team.dir;
      if (sp < 10) volSetAn(p, p.relax ? 'stand' : 'ready');
      else if (!p.relax && p.vx * p.face < -24 && Math.abs(p.vx) > Math.abs(p.vy) * .5) { volSetAn(p, 'backpedal'); adv = dt * Math.max(.6, sp / (VOL.RUN * .8)); }
      else { volSetAn(p, 'run'); adv = dt * Math.max(.5, sp / VOL.RUN); }
      break;
    }
    case 'pass': {
      /* planted, with a little shuffle left in the feet, and the feet find
         the last step or two to the ball by themselves */
      if (!p.remote) steer(VOL.RUN * .3);
      damp(4);
      const a = p.act;
      if (!a.hit && !p.remote) {
        const C = volComing(W.ball, a.kind === 'set' ? VOL_AT.set : VOL_AT.bump);
        if (C && !W.ball.held) {
          const tx = C.x - p.face * (a.kind === 'set' ? 3 : 5), dx = tx - p.x, dy = C.y - p.y, d = Math.hypot(dx, dy);
          if (d > .5 && d < 16) { const k = Math.min(1, d / 3) * 70; p.vx += (dx / d * k - p.vx) * .25; p.vy += (dy / d * k - p.vy) * .25; }
        }
      }
      a.win -= dt;
      if (!a.hit && a.win <= 0) { a.hit = 'whiff'; a.hitT = p.stT; }
      if (!a.hit) p.fr = Math.min(2, Math.floor(p.stT / .05));
      else {
        const k = p.stT - a.hitT;
        p.fr = k < .1 ? 3 : 4;
        if (k > .2) volState(p, 'move');
      }
      break;
    }
    case 'jump': {
      const a = p.act, spike = a.kind === 'spike';
      if (!a.up) {
        /* the load before take-off: a spike carries its run-up into the air */
        damp(spike ? 3 : 14);
        p.fr = spike ? (p.stT < .035 ? 0 : 1) : 0;
        if (p.stT >= .07) {
          a.up = true; p.vz = VOL.JUMP * (spike ? 1 : .94);
          if (spike) { p.vx *= .55; p.vy *= .55; } else { p.vx = p.vy = 0; }
        }
        break;
      }
      damp(.6);
      /* in the air for a spike, the body drifts in under the ball a little */
      const b = W.ball;
      if (spike && !a.hit && !p.remote && !b.held && !b.down && a.landT < 0) {
        const tx = b.x - p.face * 4, dx = tx - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
        if (d > .5 && d < 28 && volSide(b.x) === p.team.i) { const k = Math.min(1, d / 4) * 60; p.vx += (dx / d * k - p.vx) * .12; p.vy += (dy / d * k - p.vy) * .12; }
      }
      if (a.landT < 0 && p.z <= 0 && p.vz <= 0) { a.landT = p.stT; W.puff(p.x, p.y, 1); }
      if (a.landT >= 0) {
        damp(12);
        const k = p.stT - a.landT;
        if (spike) p.fr = k < .07 ? 6 : 7; else p.fr = 4;
        if (k > (spike ? .17 : .13)) volState(p, 'move');
      } else if (spike) {
        if (a.hit) p.fr = p.stT - a.hitT < .08 ? 4 : 5;
        else p.fr = p.vz > 70 ? 2 : 3;
      } else p.fr = p.vz > 60 ? 1 : p.vz > -20 ? 2 : 3;
      break;
    }
    case 'serve': {
      const a = p.act, S = VOL_SERVE[a.kind], t = p.stT;
      if (a.kind === 'float') {
        damp(20);
        p.fr = S.frames.find(f => t < f[0])[1];
      } else {
        /* toss, a step in, and up */
        if (t < S.stepAt) { damp(20); p.fr = t < .06 ? 0 : 1; }
        else if (!a.up) {
          p.fr = 2; p.vx = p.face * 70; p.vy = 0;
          if (t >= S.jumpAt) { a.up = true; p.vz = VOL.JUMP; p.vx = p.face * 34; }
        } else if (p.z > 0 || p.vz > 0) {
          damp(.5);
          p.fr = a.done ? (t - a.doneT < .08 ? 5 : 6) : t < S.fire - .06 ? 4 : 5;
        } else {
          if (a.landT === undefined) { a.landT = t; W.puff(p.x, p.y, 1); }
          damp(12); p.fr = t - a.landT < .08 ? 6 : 7;
        }
      }
      if (!a.done && t >= S.fire) { a.done = true; a.doneT = t; a.fire(W.ball); }
      if (t >= S.end && p.z <= 0) volState(p, 'move');
      break;
    }
    case 'dive': {
      const a = p.act;
      if (a.landT < 0 && p.stT > .05 && p.z <= 0 && p.vz <= 0) { a.landT = p.stT; W.puff(p.x + a.dx * 8, p.y + a.dy * 8, 2); W.mark('dive', p.x, p.y, p.face); }
      if (a.landT < 0) { p.fr = p.stT < .05 ? 0 : p.vz > 0 ? 1 : 2; damp(.4); }
      else {
        damp(p.stT - a.landT < .12 ? 3 : 9);
        const k = p.stT - a.landT;
        p.fr = k < .12 ? 3 : 4;
        if (k > .5) volState(p, 'getup', 'getup');
      }
      break;
    }
    case 'getup':
      damp(12);
      if (p.stT >= volAnimDur(p)) volState(p, 'move');
      break;
    case 'pose':
      damp(9);
      break;
  }
  p.at += adv;
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.z > 0 || p.vz > 0) {
    p.vz -= VOL.PG * dt; p.z += p.vz * dt;
    if (p.z <= 0) { p.z = 0; p.vz = 0; }
  }
  /* footprints, a pair every few steps on the sand */
  if (p.z <= 0 && (p.st === 'move' || p.st === 'pass')) {
    p.walked += Math.hypot(p.vx, p.vy) * dt;
    if (p.walked > 11) { p.walked = 0; W.mark('step', p.x, p.y, p.face); }
  }
  /* The free zone round the court, and each side keeps to its own half:
     nobody runs under the net. */
  const { NX, CL, CD, FREE } = VOL, own = p.team.i === 0;
  p.y = volClamp(p.y, -24, CD + 30);
  /* and nobody leaves the picture: with the view leaning, how far out that
     is depends on how far across */
  const lean = VOL.OX + VOL.SH * (CD / 2 - p.y);
  p.x = volClamp(p.x, own ? Math.max(-FREE, 12 - lean) : NX + 5, own ? NX - 5 : Math.min(CL + FREE, VOL.VW - 12 - lean));
}
