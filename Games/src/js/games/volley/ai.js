/* ============================================================================
   The computer players: whose ball it is, where to stand, and when to go.

   Each side makes a plan whenever the ball has been played (after its
   reaction time, so a slow side is caught out by a quick attack), and each
   of its computer players carries out his part of it every step: a role
   and a place. Timing comes from the ball's own arc, which is known
   exactly: a player arms a bump or a set a moment before the ball comes
   down to him, and jumps for a spike or a block so that he is at the top
   when it arrives.

   Two-a-side is played the beach way: whoever takes the first touch hits
   the third, the other sets. Beside a person, the computer player takes
   the first touch only when it is plainly his (and calls for it), sets for
   the person, and hits what the person sets. One-a-side, the one player
   passes up to himself and attacks.
   ========================================================================== */
/* speed (of top speed), react (s), pass/set (skill, 0 to 1), pow (spike
   pace), aim (how well a target is chosen), err (attacks hit out), block
   (how often he goes up) and blockSkill (how often it stuffs), serveErr,
   jumpServe (how often a serve is a jump serve), dive (how far he will go
   for one), judge (how often he leaves a ball going out) */
const VOL_LEVELS = {
  easy:   { speed: .8, react: .3, pass: .62, set: .68, pow: .8, aim: .3, err: .09, block: .3, blockSkill: .35, serveErr: .13, jumpServe: 0, dive: .5, judge: .55 },
  normal: { speed: .9, react: .2, pass: .77, set: .84, pow: .92, aim: .65, err: .07, block: .6, blockSkill: .5, serveErr: .08, jumpServe: .25, dive: .75, judge: .8 },
  hard:   { speed: .98, react: .12, pass: .88, set: .93, pow: 1, aim: .9, err: .05, block: .85, blockSkill: .62, serveErr: .06, jumpServe: .5, dive: .9, judge: .92 },
  /* a person's partner: good, but never better than the person */
  mate:   { speed: .95, react: .12, pass: .86, set: .93, pow: .94, aim: .8, err: .04, block: .7, blockSkill: .55, serveErr: .05, jumpServe: .2, dive: .85, judge: .9 }
};
/* the heights things are played at: the forearms, the hands for a set, the
   hand at the top of a jump */
const VOL_AT = { bump: 15, set: 44, hit: 74 };
/* from the press to the top of a jump: the load, then rising */
const VOL_JUMP_LEAD = .07 + VOL.JUMP / VOL.PG;

/* where the ball will be when it comes down through height h, or null */
function volComing(b, h) {
  const t = volDown(b, h);
  if (t < 0) return null;
  const q = volAt(b, t);
  return { x: q.x, y: q.y, t };
}
/* how long p takes to get to (x, y) */
function volEta(p, x, y) {
  return volDist(p.x, p.y, x, y) / (VOL.RUN * (p.lvl ? p.lvl.speed : 1)) + (p.st === 'move' ? 0 : .25);
}

function volTeamAI(W, t, dt) {
  const b = W.ball, cpu = t.players.filter(p => !p.human && !p.remote);
  if (!cpu.length) return;
  if (W.phase !== 'rally') return;
  /* a new plan once the ball has been played, a reaction time later */
  if (!t.plan || t.plan.id !== b.id) {
    if (!t.seen || t.seen.id !== b.id) t.seen = { id: b.id, at: W.t };
    const L = cpu[0].lvl || VOL_LEVELS.normal, read = b.kind === 'spike' || b.kind === 'shot' ? .55 : 1;
    if (!t.plan || W.t - t.seen.at >= L.react * read) t.plan = volPlan(W, t);
  }
  const P = t.plan;
  /* beside a person: if the person is plainly not getting to a ball that
     was theirs, the computer player goes for it after all */
  if (P.rescue && !P.rescued) {
    const h = P.rescue, C = volComing(b, VOL_AT.bump), mate = cpu[0];
    if (C && C.t < .5 && volDist(h.x, h.y, C.x, C.y) > 22 && volEta(mate, C.x, C.y) < C.t + .1 && volMayPlay(W, mate)) {
      P.rescued = true; P.roles.set(mate, { do: 'recv', h: VOL_AT.bump }); mate.call = W.t;
    }
  }
  for (const p of cpu) volBrain(W, t, p, P.roles.get(p) || { do: 'base' }, dt);
}

/* ---- the plan ---- */
function volPlan(W, t) {
  const b = W.ball, o = volOpp(W, t), P = { id: b.id, roles: new Map() };
  const { NX, CD } = VOL, s = t.dir, ps = t.players, solo = ps.length === 1;
  const set = (p, r) => { if (!p.human && !p.remote) P.roles.set(p, r); };
  const L = (ps.find(p => p.lvl) || {}).lvl || VOL_LEVELS.normal;
  const ours = b.team === t.i;
  /* over the net: an attack or a serve that crosses it; a pass or set of our
     own that would float on over it is still ours to play first */
  const cross = volNetZ(b), building = ours && b.tc < 3 && ['pass', 'set', 'dig', 'block'].includes(b.kind);
  const over = cross && cross.z > VOL.NETB && !building;
  const land = volLanding(b), landsHere = volSide(land.x) === t.i;
  /* base: one up at the net, one back; alone, back in the middle */
  const base = () => {
    if (solo) { set(ps[0], { do: 'go', x: NX - s * 92, y: CD / 2 }); return; }
    const front = ps.slice().sort((a, c) => Math.abs(a.x - NX) - Math.abs(c.x - NX));
    set(front[0], { do: 'go', x: NX - s * 12, y: volClamp(front[0].y, 40, CD - 40) });
    set(front[1], { do: 'go', x: NX - s * 100, y: CD / 2 });
  };

  if (!ours && (landsHere || (over && volSide(b.x) !== t.i) || volSide(b.x) === t.i)) {
    /* ---- it is coming to us: whoever gets there first takes it ---- */
    const C = volComing(b, VOL_AT.bump) || { x: land.x, y: land.y, t: land.t };
    /* a ball going well out is left, if he reads it right */
    if (!volIn(land.x, land.y, 4) && Math.random() < L.judge) {
      for (const p of ps) set(p, { do: 'go', x: volClamp(p.x, NX - s * 150, NX - s * 20), y: volClamp(p.y, 10, CD - 10), leave: true });
      return P;
    }
    const byEta = ps.slice().sort((a, c) => volEta(a, C.x, C.y) - volEta(c, C.x, C.y));
    let recv = byEta[0];
    const human = ps.find(p => p.human || p.remote);
    /* beside a person, it is theirs unless it is plainly not */
    if (human && recv !== human && volEta(recv, C.x, C.y) + .15 > volEta(human, C.x, C.y)) recv = human;
    if (!recv.human && !recv.remote) { set(recv, { do: 'recv', h: VOL_AT.bump }); if (human) recv.call = W.t; }
    else if (human) P.rescue = human;
    for (const p of ps) if (p !== recv) { const at = volSetSpot(t, p); set(p, { do: 'go', x: at.x, y: at.y }); }
    return P;
  }
  if (!ours) {
    /* ---- they are building an attack: one up to block, one back ---- */
    if (solo) { set(ps[0], { do: 'go', x: NX - s * 90, y: CD / 2 }); return P; }
    const S = b.tc >= 2 || b.kind === 'set' ? volComing(b, VOL_AT.hit) : null;
    const front = ps.slice().sort((a, c) => Math.abs(a.x - NX) - Math.abs(c.x - NX));
    /* the blocker takes away the line or the angle, and leaves the other */
    const by = S ? volClamp(S.y + (Math.random() < .5 ? -7 : 7), 16, CD - 16) : volClamp(b.y, 30, CD - 30);
    set(front[0], { do: 'block', x: NX - s * 7, y: by, go: Math.random() < L.block, err: volRand(-.06, .08) * (1.2 - L.blockSkill) });
    /* the defender covers the half the block does not */
    set(front[1], { do: 'go', x: NX - s * 104, y: by < CD / 2 ? CD * .62 : CD * .38 });
    return P;
  }
  if (b.tc < 3 && !over) {
    /* ---- ours, and still on our side: set it and hit it ---- */
    let other = solo ? ps[0] : ps.find(p => p !== b.last) || ps[0];
    /* off our own block, whoever is nearer plays it: the blocker may */
    if (b.block && !solo) { const C = volComing(b, VOL_AT.set); if (C) other = ps.slice().sort((a, c) => volEta(a, C.x, C.y) - volEta(c, C.x, C.y))[0]; }
    /* can he get up to it in time, or is it better played safe */
    const canHit = p => { const S = volComing(b, VOL_AT.hit); return S && volApex(b) > 62 && volEta(p, S.x - s * 4, S.y) < S.t - VOL_JUMP_LEAD * .5; };
    if (b.tc === 1) {
      if (solo) set(ps[0], canHit(ps[0]) ? { do: 'hit' } : { do: 'recv', h: VOL_AT.bump });
      else {
        set(other, { do: 'recv', h: VOL_AT.set, kind: 'set' });
        const hitter = ps.find(p => p !== other), at = volHitSpot(t, hitter);
        set(hitter, { do: 'go', x: NX - s * 46, y: volClamp(hitter.y + (at.y - hitter.y) * .5, 24, CD - 24), wait: true });
      }
    } else {
      /* the third: the hitter goes up for it; the setter backs off to cover */
      if (canHit(other)) set(other, { do: 'hit' });
      else set(other, { do: 'recv', h: VOL_AT.bump });                       // too low or too far to hit: play it over
      if (!solo) set(b.last, { do: 'go', x: NX - s * 44, y: volClamp(b.last.y, 30, CD - 30) });
    }
    return P;
  }
  /* ---- on its way over: back to base ---- */
  base();
  return P;
}

/* ---- carrying it out ---- */
function volGo(p, x, y, fast) {
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d < 1.5) { p.ix = p.iy = 0; return true; }
  const k = Math.min(1, d / (fast ? 6 : 12));
  p.ix = dx / d * k; p.iy = dy / d * k;
  return false;
}
function volBrain(W, t, p, r, dt) {
  const b = W.ball, s = t.dir, L = p.lvl || VOL_LEVELS.normal;
  p.boost = L.speed;
  p.ix = p.iy = 0;
  if (p.st !== 'move') return;
  if (r.do === 'go') { volGo(p, r.x, r.y); return; }
  if (r.do === 'recv') {
    /* under it, the forearms (or the hands) where it will come down; a set
       he cannot get under in time he lets drop to bump height instead */
    let h = r.h || VOL_AT.bump, C = volComing(b, h);
    if (C && h > VOL_AT.bump && volEta(p, C.x, C.y) > C.t + .04) { const D = volComing(b, VOL_AT.bump); if (D) { h = VOL_AT.bump; C = D; } }
    if (!C) { volGo(p, b.x, b.y, true); return; }
    const f = p.team.dir, sx = C.x - f * (h === VOL_AT.set ? 3 : 5), sy = C.y;
    const far = volDist(p.x, p.y, sx, sy);
    /* a person going for it has it: back off to set for them (a person
       armed for it, or plainly nearer) */
    const mate = t.players.find(q => q !== p && (q.human || q.remote));
    if (mate && volMayPlay(W, mate) && mate.st !== 'dive') {
      const md = volDist(mate.x + mate.face * 5, mate.y, C.x, C.y);
      if ((mate.st === 'pass' && !mate.act.hit) || md < 10 || md < far - 8) {
        const at = volSetSpot(t, p); volGo(p, at.x, at.y); p.call = 0; return;
      }
    }
    volGo(p, sx, sy, true);
    if (!volMayPlay(W, p)) return;
    if (C.t < .2 && far < 13) volPass(p, h === VOL_AT.set ? r.kind || 'set' : 'bump', .32);
    /* out of reach: a dive for it, if he is the diving sort */
    else if (C.t < .32 && far >= 13 && far < 44 && Math.random() < L.dive * dt * 12) {
      const G = volComing(b, 7) || C;
      volDive(p, G.x - p.x, G.y - p.y);
    }
    return;
  }
  if (r.do === 'hit') {
    /* the approach: to where the set comes down through hitting height,
       and up so as to be at the top as it arrives */
    const S = volComing(b, VOL_AT.hit);
    if (!S) { const C = volComing(b, VOL_AT.bump); if (C) volGo(p, C.x - s * 5, C.y, true); return; }
    const hx = s > 0 ? Math.min(S.x - s * 4, VOL.NX - 6) : Math.max(S.x - s * 4, VOL.NX + 6);
    volGo(p, hx, S.y, true);
    if (volMayPlay(W, p) && S.t < VOL_JUMP_LEAD + .01 && volDist(p.x, p.y, hx, S.y) < 16) volJump(p, 'spike');
    return;
  }
  if (r.do === 'block') {
    volGo(p, r.x, r.y, true);
    if (!r.go) return;
    /* up as their hitter is: when their set is about to reach him */
    const S = volComing(b, VOL_AT.hit);
    if (S && b.team !== t.i && (b.tc >= 2 || b.kind === 'set') && volSide(S.x) !== t.i && Math.abs(S.x - VOL.NX) < 40 &&
        S.t < VOL_JUMP_LEAD - .05 + r.err && Math.abs(p.x - r.x) < 10) { volJump(p, 'block'); r.go = false; }
    return;
  }
  if (r.do === 'base') return;
}

/* ---- the serve ----
   A computer player's: a float or a jump serve at a spot the receivers will
   find awkward, now and then into the net or long. */
function volCpuServe(W, p) {
  const L = p.lvl || VOL_LEVELS.normal, t = p.team, o = volOpp(W, t), s = t.dir, { NX, CL } = VOL;
  const kind = Math.random() < L.jumpServe ? 'jump' : 'float';
  let at = volOpenSpot(W, o, L.aim, true), margin = kind === 'jump' ? volRand(3, 9) : volRand(7, 18);
  if (kind === 'float' && Math.random() < .22) { at = { x: NX + s * volRand(30, 62), y: volRand(30, VOL.CD - 30) }; margin = volRand(4, 9); }
  at.x += volRand(-12, 12); at.y += volRand(-10, 10);
  if (Math.random() < L.serveErr) { if (Math.random() < .5) margin = volRand(-12, -4); else at.x = NX + s * volRand(CL / 2 + 6, CL / 2 + 26); }
  volServe(p, kind, ball => volServeLaunch(W, p, kind, at, margin));
}
/* The serve leaves the hand for `at`, over the net with `margin` to spare
   (below 0: into it). A jump serve is struck higher and flatter, and so
   comes faster. */
function volServeLaunch(W, p, kind, at, margin) {
  const b = W.ball, { NET, R } = VOL;
  b.held = null;
  const need = volClearT(b.x, b.z, at.x, R, NET + R + margin);
  const d = volDist(b.x, b.y, at.x, at.y);
  let T = need === null ? d / 200 : Math.max(need, d / (kind === 'jump' ? 330 : 260));
  volLaunch(b, at.x, at.y, R, Math.max(.35, T));
  b.team = p.team.i; b.tc = 3; b.last = p; b.block = false; b.kind = 'serve'; b.id++;
  b.spinV = kind === 'jump' ? 22 * p.team.dir : volRand(-2, 2);
  W.sound('serve', kind === 'jump' ? 1 : .8);
  W.onTouch(p, 'serve');
}
