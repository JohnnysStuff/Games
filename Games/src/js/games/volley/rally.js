/* ============================================================================
   The rally: who may play the ball, where each of them can reach it, what a
   touch does with it, and who wins the point.

   Every touch is aimed for the player: a first touch goes up to the setter
   near the net, a second is set for the hitter, a third goes over. What
   the player chooses is the kind of touch (Z: bump or set; X: jump for a
   spike or a block; a dive when it is out of reach), when, and on an
   attack, where (the arrow keys held as they hit it). How good the touch
   is (q, 0 to 1) moves the ball off its mark: a clean pass lands on the
   setter, a shanked one anywhere.
   ========================================================================== */

/* the other side */
const volOpp = (W, t) => W.teams[1 - t.i];
/* the setter's spot: a step off the net, in front of whoever is setting */
function volSetSpot(t, setter) {
  const y = setter ? VOL.CD / 2 + (setter.y - VOL.CD / 2) * .5 : VOL.CD / 2;
  return { x: VOL.NX - t.dir * 20, y: volClamp(y, 30, VOL.CD - 30) };
}
/* where a hitter wants the set: tight to the net, in front of him */
function volHitSpot(t, hitter) {
  return { x: VOL.NX - t.dir * 13, y: volClamp(hitter ? hitter.y : VOL.CD / 2, 22, VOL.CD - 22) };
}
/* The emptiest place on side t's court to put the ball: of a few that a
   player would think of, the one furthest from anyone who could get to it.
   `care` (0 to 1) is how well it is chosen; below 1, sometimes worse. */
function volOpenSpot(W, t, care, deep) {
  const { NX, CL, CD } = VOL, s = t.dir;             // t's side: from the net toward its end line is -s
  const xs = deep ? [.72, .92] : [.22, .55, .9], ys = [.13, .5, .87];
  let best = null, bs = -1;
  for (const fx of xs) for (const fy of ys) {
    const x = NX - s * fx * (CL / 2), y = fy * CD;
    let d = 1e9;
    for (const q of t.players) d = Math.min(d, volDist(q.x, q.y, x, y) * (q.st === 'jump' ? 1.6 : 1));
    const score = d + volRand(0, 60) * (1 - (care ?? 1));
    if (score > bs) { bs = score; best = { x, y }; }
  }
  return best;
}
/* the touch this would be for p's side: 1, 2 or 3 */
const volTouchNo = (b, t) => b.team === t.i ? b.tc + 1 : 1;

/* May p play the ball now? Only on his own side of the net (a block
   reaches over it), no side more than three times, and two-a-side nobody
   twice running, unless the first was a block. A serve cannot be blocked. */
function volMayPlay(W, p, block) {
  const b = W.ball, t = p.team;
  if (W.phase !== 'rally' || b.down || b.held || W.ruled) return false;
  if (block) return b.team !== t.i && b.kind !== 'serve';
  if (b.team === t.i && b.tc >= 3) return false;
  if (b.team === t.i && b.last === p && !b.block && !W.solo) return false;
  return volSide(b.x) === t.i || Math.abs(b.x - VOL.NX) < VOL.R + 1;
}

/* Where p can reach the ball this step, from what he is doing:
     pass   the forearms (bump) or the hands above the head (set)
     jump   the hitting hand at the top of a spike, or the hands over the
            net in a block
     dive   along the ground, from the chest to the fingers
     move   nowhere, but a hard-hit ball straight into him comes off him */
function volZone(p) {
  const f = p.face;
  if (p.st === 'pass' && !p.act.hit) {
    return p.act.kind === 'set' ? { kind: 'set', x: p.x + f * 3, y: p.y, z: p.z + 44, r: 10, h: 10 }
                                : { kind: 'bump', x: p.x + f * 5, y: p.y, z: p.z + 15, r: 11, h: 10 };
  }
  if (p.st === 'jump' && p.act.up && !p.act.hit && p.z > 3) {
    if (p.act.kind === 'block') return { kind: 'block', x: VOL.NX - p.team.dir * 1.5, y: p.y, z: p.z + 50, r: 9, h: 12, flat: true };
    return { kind: 'spike', x: p.x + f * 4, y: p.y, z: p.z + 52, r: 12, h: 10 };
  }
  if (p.st === 'dive' && !p.act.hit && p.stT > .03 && p.stT < .36) return { kind: 'dig', seg: [p.x, p.y, p.x + p.act.dx * 25, p.y + p.act.dy * 25], z: 6, h: 9, r: 8 };
  if (p.st === 'move' || (p.st === 'pass' && p.act.hit === 'whiff')) return { kind: 'body', x: p.x, y: p.y, z: p.z + 18, r: 7, h: 16 };
  return null;
}
/* how far the ball is from the middle of a zone, 0 at the middle and 1 at
   its edge, or null if it is outside */
function volInZone(b, Z) {
  let d;
  if (Z.seg) {
    const [x0, y0, x1, y1] = Z.seg, dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
    const u = volClamp(((b.x - x0) * dx + (b.y - y0) * dy) / L, 0, 1);
    d = volDist(b.x, b.y, x0 + dx * u, y0 + dy * u) / Z.r;
  } else if (Z.flat) {
    /* a block's hands: a wall along the net, as wide as the arms */
    if (Math.abs(b.x - Z.x) > 5) return null;
    d = Math.abs(b.y - Z.y) / Z.r;
  } else d = volDist(b.x, b.y, Z.x, Z.y) / Z.r;
  const dz = Math.abs(b.z - Z.z) / Z.h;
  if (d > 1 || dz > 1) return null;
  return Math.max(d, dz);
}

/* ---- contact ----
   Each step of a rally: anyone who can reach the ball and may play it plays
   it. A ball driven hard into someone standing comes off them whether they
   meant it or not. */
function volContacts(W) {
  const b = W.ball;
  if (W.phase !== 'rally' || b.down || b.held || W.ruled) return;
  const pace = Math.hypot(b.vx, b.vy, b.vz);
  for (const p of W.players) {
    const Z = volZone(p);
    if (!Z) continue;
    if (Z.kind === 'body' && (pace < 160 || b.team === p.team.i)) continue;
    if (!volMayPlay(W, p, Z.kind === 'block')) continue;
    /* a block meets an attack going its way, not a ball dropping on its own side */
    if (Z.kind === 'block' && (b.vx * p.team.dir > 0 || b.kind === 'serve')) continue;
    let off = volInZone(b, Z);
    /* a set called for a ball that has dropped below the hands is dug instead */
    if (off === null && Z.kind === 'set') {
      const B = { kind: 'bump', x: p.x + p.face * 5, y: p.y, z: p.z + 15, r: 11, h: 10 };
      off = volInZone(b, B);
      if (off !== null) { Z.kind = 'bump'; volSetAn(p, 'bump'); }
    }
    if (off === null) continue;
    volTouch(W, p, Z.kind, off, pace);
    return;
  }
}

/* How good a touch is: how cleanly it was met (off: 0 dead centre, 1 the
   edge of the reach), how hard the ball came (pace), and the player (a
   computer player's level; a person is steady, and dead-on is theirs to
   earn). */
function volQuality(p, off, pace, kind) {
  const L = p.lvl, skill = L ? (kind === 'set' ? L.set : L.pass) : .92;
  const hard = volClamp((pace - 170) / 230, 0, 1);
  let q = skill - off * .28 - hard * (kind === 'bump' || kind === 'dig' || kind === 'body' ? .45 : .2) + volRand(-.12, .1);
  return volClamp(q, 0, 1);
}

/* p plays the ball: `kind` the touch, `off` how cleanly (volInZone) */
function volTouch(W, p, kind, off, pace) {
  const b = W.ball, t = p.team, o = volOpp(W, t), { NX, CL, CD, NET, R } = VOL;
  const s = t.dir;
  /* the count: a block counts, but the blocker may play it again */
  if (kind === 'block') { b.team = t.i; b.tc = 1; b.block = true; }
  else if (b.team !== t.i) { b.team = t.i; b.tc = 1; b.block = false; }
  else { b.tc++; b.block = false; }
  const n = b.tc;
  b.last = p; b.id++; b.pace = 0;
  if (p.st === 'pass' || p.st === 'jump' || p.st === 'dive') { p.act.hit = true; p.act.hitT = p.stT; }
  W.touches[t.i]++;
  const q = volQuality(p, off, pace, kind);
  const mates = t.players.filter(m => m !== p);
  /* aim somewhere, knocked off it by (1 - q) */
  const miss = (x, y, spread) => { const e = (1 - q) * spread, a = Math.random() * Math.PI * 2; return { x: x + Math.cos(a) * e * Math.random(), y: y + Math.sin(a) * e * Math.random() }; };
  let aim = null, tz = 0, T = 1, sound = 'bump', loud = 1;

  if (kind === 'block') {
    /* Stuffed straight down on their side, softened up onto ours, or off
       the hands and out. A block that is well placed and well timed (its
       q) stuffs it more often. */
    const r = Math.random(), sq = volClamp(q * .9 + (1 - off) * .3, 0, 1) * (p.lvl ? p.lvl.blockSkill : .7);
    b.kind = 'block';
    if (r < sq) { aim = { x: NX + s * volRand(10, 46), y: b.y + volRand(-22, 22) }; tz = R; T = volRand(.32, .42); W.stat('block', p); }
    else if (r < sq + .6) { aim = { x: NX - s * volRand(30, 60), y: volClamp(b.y + volRand(-30, 30), 20, CD - 20) }; tz = 44; T = volRand(1.05, 1.25); }
    else { aim = { x: NX - s * volRand(185, 240), y: b.y + volRand(-60, 60) }; tz = R; T = volRand(.55, .75); }
    sound = 'block';
  } else if (kind === 'spike' || (kind === 'shot')) {
    /* the attack: over the net, hard and down if it was met high enough */
    const A = volAttack(W, p, kind);
    aim = A.at; tz = R; T = A.T; b.kind = A.kind; sound = A.kind === 'spike' ? 'spike' : 'set'; loud = A.pow;
    if (A.kind === 'spike') W.stat('spike', p);
  } else if (kind === 'dig' || kind === 'body') {
    /* dug up off a dive or a body: up, roughly back toward the middle of our side */
    b.kind = 'dig';
    const good = q > .3;
    aim = good ? miss(NX - s * volRand(45, 90), volRand(40, CD - 40), 50) : { x: b.x + volRand(-70, 70), y: b.y + volRand(-60, 60) };
    tz = 30; T = volRand(.75, 1.05) * (good ? 1 : .8);
    sound = 'bump'; loud = .8;
  } else {
    /* a bump or a set: up for the next touch, or over on the third */
    const solo = W.solo || !mates.length;
    if (n >= 3) {
      const A = volAttack(W, p, 'shot');
      aim = A.at; tz = R; T = A.T; b.kind = 'shot';
    } else if (n === 1) {
      /* to the setter; alone, up in front of yourself toward the net, as
         far as you can run in the time it is up */
      const at = solo ? { x: volToward(p.x, NX - s * 28, s, 56), y: volClamp(p.y, 26, CD - 26) } : volSetSpot(t, mates[0]);
      aim = miss(at.x, at.y, 46); tz = solo ? 64 : 44; T = (solo ? 1.25 : 1.12) * volRand(.94, 1.06) + (1 - q) * volRand(-.15, .2);
      b.kind = 'pass';
    } else {
      /* the set: up for the hitter, tight to the net where he is */
      const hitter = solo ? p : mates[0], at = volHitSpot(t, hitter);
      if (hitter.human && !solo) at.y = volClamp(hitter.y, 22, CD - 22);
      if (solo) at.x = volToward(p.x, at.x, s, 44);
      aim = miss(at.x, at.y, kind === 'set' ? 30 : 44); tz = 70; T = (solo ? 1.1 : 1.0) * volRand(.95, 1.05) + (1 - q) * volRand(-.1, .15);
      b.kind = 'set';
      if (kind === 'bump' && !solo) { tz = 64; }
    }
    sound = kind === 'set' ? 'set' : 'bump';
  }
  /* nothing but an attack goes into the net on purpose: a pass aimed at our
     own side stays on it */
  if (b.kind === 'pass' || b.kind === 'set' || (b.kind === 'dig' && q > .3)) aim.x = s > 0 ? Math.min(aim.x, NX - 6) : Math.max(aim.x, NX + 6);
  volLaunch(b, aim.x, aim.y, tz, Math.max(.2, T));
  b.spinV = (b.kind === 'spike' ? 26 : b.kind === 'set' ? 3 : 10) * s * volRand(.8, 1.2);
  W.sound(sound, loud);
  if (sound === 'spike') W.shake = .12;
  W.onTouch(p, b.kind);
}

/* An attack: where it goes and how fast. A person aims with the keys held
   as they hit it (up and down for the far and near sidelines, toward the
   net deep, away short); the computer picks the emptiest spot. Met well
   above the tape it is driven down; met low it has to be looped over. */
function volAttack(W, p, kind) {
  const b = W.ball, t = p.team, o = volOpp(W, t), { NX, CL, CD, NET, R } = VOL, s = t.dir;
  let at;
  if (p.human && p.aim) {
    const a = p.aim;
    const deep = a.x * s > 0 ? .9 : a.x * s < 0 ? .32 : .66;
    at = { x: NX + s * deep * (CL / 2), y: a.y < 0 ? CD * .12 : a.y > 0 ? CD * .88 : volOpenSpot(W, o, 1).y };
    at.x += volRand(-8, 8); at.y += volRand(-8, 8);
  } else {
    const L = p.lvl || VOL_LEVELS.normal;
    at = volOpenSpot(W, o, L.aim, kind === 'spike' && Math.random() < .5);
    /* a block up in front: hit the other way from it, or loop it over */
    const wall = o.players.find(q => Math.abs(q.x - NX) < 16 && (q.st === 'jump' || q.st === 'move') && Math.abs(q.y - b.y) < 30);
    if (wall && Math.random() < L.aim) {
      const away = wall.y > b.y ? -1 : 1;
      at.y = volClamp(b.y + away * volRand(40, 70), 12, CD - 12);
      if (Math.random() < .3) kind = 'shot';
    }
    /* now and then a computer player goes for the line and misses it */
    if (Math.random() < L.err) { if (Math.random() < .5) at.x = NX + s * volRand(CL / 2 + 6, CL / 2 + 26); else at.y = Math.random() < .5 ? volRand(-24, -5) : volRand(CD + 5, CD + 24); }
    else { at.x += volRand(-10, 10); at.y += volRand(-10, 10); }
  }
  const high = b.z - NET, pow = kind === 'spike' ? volClamp((high - 2) / 14, 0, 1) : 0;
  const d = volDist(b.x, b.y, at.x, at.y);
  const L = p.lvl;
  if (kind === 'spike' && pow > .15) {
    /* driven: the harder, the higher it was met */
    const v = (150 + 125 * pow) * (L ? L.pow : 1);
    let T = d / v;
    const need = volClearT(b.x, b.z, at.x, R, NET + R + 2);
    if (need !== null && need > T) T = need;                  // not steep enough to clear: flattened out
    return { at, T, kind: T > d / 150 ? 'shot' : 'spike', pow: .6 + pow * .4 };
  }
  /* a shot: looped over the net into space, clearing it well */
  const need = volClearT(b.x, b.z, at.x, R, NET + R + volRand(9, 18));
  return { at, T: Math.max(.9, need || 0), kind: 'shot', pow: .6 };
}

/* ---- the ball's own events: the net, the lines, the sand ---- */
function volBallEvent(W, ev) {
  const b = W.ball;
  if (!ev || W.ruled) return;
  /* the net shows it: it gives where it was hit */
  if (ev.tape || ev.net) W.netFx = { y: b.y, at: W.t, hit: true, dir: b.vx > 0 ? -1 : 1 };
  if (ev.tape) { W.sound('tape'); return; }
  if (ev.net) {
    W.sound('net');
    /* a serve into the net is over at once */
    if (b.kind === 'serve') volRule(W, 1 - b.team, 'net', b.x, b.y);
    return;
  }
  if (ev.under) { volRule(W, 1 - b.team, 'under', b.x, b.y); return; }
  if (ev.wide) { volRule(W, 1 - b.team, 'wide', b.x, b.y); return; }
  if (ev.land) {
    W.sound('sand', volClamp(ev.pace / 250, .4, 1));
    W.spray(ev.x, ev.y, ev.pace);
    W.mark('ball', ev.x, ev.y);
    const side = volSide(ev.x);
    if (ev.in) {
      /* in: whoever's side it came down on loses the point */
      const why = b.team === side ? 'down' : b.kind === 'serve' ? 'ace' : b.kind === 'spike' ? 'kill' : b.kind === 'block' ? 'stuff' : 'point';
      volRule(W, 1 - side, why, ev.x, ev.y, true);
    } else volRule(W, 1 - b.team, 'out', ev.x, ev.y, false);
  }
}
/* the rally is over: side `win` has the point */
function volRule(W, win, why, x, y, inn) {
  if (W.ruled) return;
  W.ruled = { win, why, x, y, in: inn, t: 0 };
}
