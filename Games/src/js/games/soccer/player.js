/* Players: movement, animation and actions. The AI and the human only set
   an intent (ix, iy) and call the actions; everything physical is here.

   States: move, kick, slide, header, chest, down, getup, pose, throwin,
   and for keepers dive, catch, hold, release. */
function socPlayer(team, i, gk, sheet) {
  return {
    team, i, gk, sheet, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    face: team.dir, dx: team.dir, dy: 0, ix: 0, iy: 0,
    st: 'move', an: gk ? 'ready' : 'idle', at: 0, stT: 0, act: {},
    cd: 0, slideCd: 0, holding: false, home: { x: 0, y: 0 }, human: false, look: 0
  };
}

function socSetAn(p, an) { if (p.an !== an) { p.an = an; p.at = 0; } }
function socAnimDur(p, an) { const a = p.sheet.meta.anims[an || p.an]; return a.frames * a.t; }
/* Standing still (idle, ready, hold) is a breath: one drawing and the
   same drawing a pixel lower above the waist, made in tools/clean.mjs,
   since two generated frames never matched each other and crawled. */
function socFrame(p) {
  /* online, a dive on another screen is drawn at the frame that screen chose */
  if (p.nf !== undefined) return p.nf;
  const a = p.sheet.meta.anims[p.an];
  if (p.st === 'dive' && p.act.dir !== 'fwd') return socDiveFrame(p, a);
  if (a.loop) return Math.floor(p.at / a.t) % a.frames;
  const i = Math.floor(p.at / a.t);
  /* a tail: played through once, then the last few frames go round (a knee
     slide ends pumping its fists), at an easier pace than a flip's own */
  if (a.tail && i >= a.frames) return a.frames - a.tail + Math.floor((p.at - a.frames * a.t) / Math.max(a.t, .18)) % a.tail;
  return Math.min(a.frames - 1, i);
}
/* A save across the goal goes by what the body is doing, not the clock:
   the spring, then (in the air) stretched out rising, full stretch at the
   top, dropping; then lying where he landed, onto a knee and up for the
   end of the dive. A low dive goes flat at once. Frames of divefar and
   divenear: 0 crouch, 1 spring, 2 flight, 3 full stretch, 4 falling,
   5 landed, 6 knee, 7 ready. */
const SOC_DIVE_END = .95;
function socDiveFrame(p, a) {
  if (a.frames < 8) return Math.min(a.frames - 1, Math.floor(p.at / a.t));
  const A = p.act;
  if (A.landT === undefined) {
    if (p.stT < .05) return 1;
    if (A.low) return 4;
    return p.vz > 30 ? 2 : p.vz > -30 ? 3 : 4;
  }
  if (p.stT < SOC_DIVE_END - .2) return 5;
  return p.stT < SOC_DIVE_END - .08 ? 6 : 7;
}
function socState(p, st, an, act) {
  p.st = st; p.stT = 0; p.act = act || {};
  if (an) { p.an = an; p.at = 0; }
}

/* ---- actions ---------------------------------------------------------- */

/* a kick with the ball at the feet: the ball leaves at the contact frame,
   and fire(ball) decides where it goes then (the target may have moved) */
function socStartKick(p, an, at, fire) {
  socState(p, 'kick', an, { at, fire, done: false });
}
function socSlide(p, dx, dy) {
  const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
  socState(p, 'slide', 'slide', { dx, dy, hit: false });
  p.vx = dx * 158; p.vy = dy * 158;
  if (Math.abs(dx) > .2) p.face = Math.sign(dx);
}
function socHeader(p, fire) {
  socState(p, 'header', 'header', { fire, done: false });
  p.vz = 120;
}
function socChest(p, b) {
  socState(p, 'chest', 'chest');
  p.vx *= .2; p.vy *= .2;
  if (Math.abs(b.x - p.x) > 1) p.face = Math.sign(b.x - p.x);
  b.vx *= .08; b.vy *= .08; b.vz = Math.min(b.vz, 0) - 20;
  b.x = p.x + p.face * 5; b.y = p.y + 1; b.last = p; b.shot = 0;
}
function socFall(p, dx, dy, W) {
  const b = W.ball;
  if (b.owner === p) { b.owner = null; p.holding = false; }
  socState(p, 'down', 'knocked', {});
  p.vx = dx * 70; p.vy = dy * 70; p.vz = 0;
  if (Math.abs(dx) > .2) p.face = -Math.sign(dx);       // knocked backwards
  W.puff(p.x, p.y);
}
/* A pose held until the next kickoff: a celebration, a lament, or just
   standing. A knee slide sets off skidding forward on the knees (the rest
   of its moving, and the airplane's and the backflip's, is in the 'pose'
   step). */
function socPose(p, an) {
  socState(p, 'pose', an); p.vx = p.vy = 0;
  if (an === 'cel_kneeslide') p.vx = p.face * 120;
}
/* How a player takes a goal or the final whistle: one of the celebrations
   (cel_* and the sheet's own celebrate) or the sad ones (sad_* and
   dejected) their sheet has, at random. `taken` is what their teammates
   are already doing: each picks something different while there is enough
   to go round. A keeper with nothing sad to do stays ready (null). */
function socMood(p, kind, taken) {
  const A = p.sheet.meta.anims, own = kind === 'cel' ? 'celebrate' : p.gk ? null : 'dejected';
  const names = Object.keys(A).filter(n => n.startsWith(kind + '_'));
  if (own && A[own]) names.push(own);
  if (!names.length) return own;
  const fresh = taken ? names.filter(n => !taken.has(n)) : [], pool = fresh.length ? fresh : names;
  const an = pool[Math.floor(Math.random() * pool.length)];
  if (taken) taken.add(an);
  return an;
}

/* keeper: dive toward dir ('up', 'down' or 'fwd'), low along the ground or
   in the air, at `speed` px/s (the AI works out what gets there in time).
   Out at an attacker's feet ('fwd') is the side-on dive; across the goal
   it is the dive to the far post (up the screen) or the near one (down). */
function socDive(p, dir, low, speed) {
  const an = dir === 'fwd' ? (low ? 'lowdive' : 'dive') : dir === 'up' ? 'divefar' : 'divenear';
  socState(p, 'dive', p.sheet.meta.anims[an] ? an : 'highcatch', { dir, low, done: false });
  const sp = socClamp(speed, 40, p.team.gkDive ?? 100);
  if (dir === 'fwd') { p.vx = p.face * sp; p.vy = 0; p.vz = low ? 0 : 70; }
  else { p.vy = (dir === 'up' ? -1 : 1) * sp; p.vx = p.face * 10; p.vz = low ? 45 : 95; }
}
function socCatch(p, high) {
  socState(p, 'catch', high ? 'highcatch' : 'chestcatch', { high, done: false });
  p.vx *= .2; p.vy *= .2;
  if (high) p.vz = 105;
}
/* keeper lets go of a held ball: 'throw' or 'punt' */
function socRelease(p, kind, fire) {
  socState(p, 'release', kind, { at: kind === 'throw' ? .16 : .21, fire, done: false });
}

/* ---- per-step physics ------------------------------------------------- */

function socPlayerStep(p, dt, W) {
  const b = W.ball;
  p.stT += dt; p.cd = Math.max(0, p.cd - dt); p.slideCd = Math.max(0, p.slideCd - dt);
  let adv = dt;                                             // anim clock advance
  const damp = k => { const f = Math.exp(-k * dt); p.vx *= f; p.vy *= f; };
  switch (p.st) {
    case 'move': {
      const owner = b.owner === p;
      /* A player steered from another screen online (`remote`) moves where
         that screen says it is: its velocity is set by the follow in net.js,
         not worked out here from a stick. */
      if (!p.remote) {
        const sp = p.gk ? SOC.GK_RUN : owner ? SOC.DRIB : SOC.RUN * (p.boost || 1);
        let ix = p.ix, iy = p.iy; const m = Math.hypot(ix, iy);
        if (m > 1) { ix /= m; iy /= m; }
        const tx = ix * sp, ty = iy * sp, ex = tx - p.vx, ey = ty - p.vy, e = Math.hypot(ex, ey), acc = 720 * dt;
        if (e <= acc) { p.vx = tx; p.vy = ty; } else { p.vx += ex / e * acc; p.vy += ey / e * acc; }
        if (m > .2) { const n = Math.hypot(ix, iy); p.dx = ix / n; p.dy = iy / n; }
      }
      if (Math.abs(p.vx) > 8) p.face = Math.sign(p.vx);
      else if (p.faceTo) p.face = p.faceTo;
      const spd = Math.hypot(p.vx, p.vy);
      if (spd < 8) socSetAn(p, p.gk ? (p.holding ? 'hold' : 'ready') : 'idle');
      else if (p.gk) { socSetAn(p, Math.abs(p.vy) > Math.abs(p.vx) * 1.2 && spd < 60 ? 'shuffle' : 'run'); adv = dt * Math.max(.6, spd / SOC.GK_RUN); }
      else { socSetAn(p, owner ? 'dribble' : 'run'); adv = dt * Math.max(.5, spd / SOC.RUN); }
      break;
    }
    case 'kick': {
      damp(9);
      const a = p.act;
      if (!a.done && p.stT >= a.at) {
        a.done = true;
        const near = !b.owner && socDist(p.x, p.y, b.x, b.y) < 14 && b.z < 12;
        if (b.owner === p || near) { a.fire(b); p.cd = .3; }
      }
      if (p.stT >= socAnimDur(p)) socState(p, 'move');
      break;
    }
    case 'slide': {
      if (p.stT > .12) damp(p.stT > .3 ? 7 : 3.2);
      const a = p.act;
      /* a slide from another screen online (`remote`) is not judged here:
         that screen says what it met and how the ball left (net.js 't') */
      if (!a.hit && !p.remote && p.stT > .04 && p.stT < .36) {
        const hx = p.x + a.dx * 11, hy = p.y + a.dy * 7;
        if (b.z < 10 && socDist(hx, hy, b.x, b.y) < 11) {
          const o = b.owner;
          if (!o || o.team !== p.team) {
            a.hit = true;
            if (o) { if (o.gk && o.holding) { a.hit = false; } else { socFall(o, a.dx, a.dy, W); if (W.onFoul) W.onFoul(p, o); } }
            if (a.hit) {
              const ang = Math.atan2(a.dy, a.dx) + socRand(-.5, .5), sp = socRand(95, 135);
              b.owner = null; b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.vz = 20; b.last = p; b.target = null; b.shot = 0;
              p.cd = .25; W.sound('tackle'); W.puff(hx, hy);
            }
          }
        }
      }
      if (p.stT >= socAnimDur(p) + .06) { socState(p, 'move'); p.slideCd = .9; }
      break;
    }
    case 'header': {
      damp(3);
      const a = p.act;
      if (!a.done && p.stT > .05 && p.stT < .36 && !b.owner) {
        const hz = p.z + 25, bz = b.z + 5;
        if (socDist(p.x + p.face * 2, p.y, b.x, b.y) < 13 && Math.abs(bz - hz) < 11) {
          a.done = true; a.fire(b); b.last = p; p.cd = .3; W.sound('header');
        }
      }
      if (p.stT >= socAnimDur(p) && p.z <= 0) socState(p, 'move');
      break;
    }
    case 'chest':
      damp(10);
      if (p.stT >= socAnimDur(p)) socState(p, 'move');
      break;
    case 'down':
      damp(5);
      if (p.stT > (p.gk ? 1.1 : .95)) { if (p.gk) socState(p, 'move'); else socState(p, 'getup', 'getup'); }
      break;
    case 'getup':
      damp(10);
      if (p.stT >= socAnimDur(p)) socState(p, 'move');
      break;
    case 'pose': {
      const a = p.act;
      if (p.an === 'cel_airplane') {
        /* arms out, banking round a loop, turning as it goes */
        if (a.ang === undefined) a.ang = -p.face * Math.PI / 2;
        a.ang += dt * 2.6;
        p.vx = -Math.sin(a.ang) * 60; p.vy = Math.cos(a.ang) * 34;
        if (Math.abs(p.vx) > 6) p.face = Math.sign(p.vx);
      } else if (p.an === 'cel_kneeslide' && p.stT < .6) damp(2.4);        // skidding on the knees
      else {
        damp(8);
        /* the backflip leaves the ground on the jump frame and lands on its crouch */
        if (p.an === 'cel_backflip' && !a.hop && p.stT > .07) { a.hop = true; p.vz = 80; }
      }
      break;
    }
    case 'throwin': {
      p.vx = p.vy = 0;
      const a = p.act;
      if (!a.go) { adv = 0; p.at = 0; }
      else if (!a.done && p.stT >= .2) { a.done = true; a.fire(b); p.cd = .4; }
      if (a.go && p.stT >= socAnimDur(p)) socState(p, 'move');
      break;
    }
    case 'dive': {
      if (p.stT > .3) damp(6);
      const a = p.act;
      /* (a keeper from another screen: that screen says what his gloves did, net.js) */
      if (!a.done && !p.holding && !p.remote && p.stT > .02 && p.stT < .55 && !b.owner) {
        /* stretched out from feet to gloves: along y for a sideways dive */
        const s = a.dir === 'up' ? -1 : 1;
        const seg = a.dir === 'fwd' ? [p.x - p.face * 8, p.y, p.x + p.face * 17, p.y] : [p.x, p.y - s * 10, p.x, p.y + s * 16];
        socTryCatch(p, W, seg, a.low ? 3 : Math.min(12, p.z + 4));
      }
      /* when he comes down (the frames follow it, socDiveFrame) */
      if (a.up && p.z <= 0 && a.landT === undefined) a.landT = p.stT;
      a.up = a.up || p.z > 0;
      if (p.stT > SOC_DIVE_END) {
        if (p.holding) { socState(p, 'hold', 'hold'); p.act.t = 0; } else socState(p, 'move');
      }
      break;
    }
    case 'catch': {
      damp(8);
      const a = p.act;
      if (!a.done && !p.holding && !p.remote && p.stT < .36 && !b.owner) socTryCatch(p, W, [p.x - p.face * 2, p.y - 6, p.x + p.face * 5, p.y + 6], a.high ? 28 : 12, true);
      if (p.stT >= socAnimDur(p) + (a.high ? .1 : 0) && p.z <= 0) {
        if (p.holding) socState(p, 'hold', 'hold'); else socState(p, 'move');
      }
      break;
    }
    case 'hold':
      damp(10);
      break;
    case 'release': {
      damp(10);
      const a = p.act;
      if (!a.done && p.stT >= a.at) { a.done = true; p.holding = false; a.fire(b); p.cd = .5; }
      if (p.stT >= socAnimDur(p)) socState(p, 'move');
      break;
    }
  }
  p.at += adv;
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.z > 0 || p.vz > 0) {
    p.vz -= SOC.G * dt; p.z += p.vz * dt;
    if (p.z <= 0) { p.z = 0; p.vz = 0; }
  }
  /* Inside the boards, and nobody walks into a net. A keeper never leaves
     his own area, whatever he is doing: diving, rushing out, or steered. */
  const { PL, PD } = SOC;
  if (p.gk) {
    const mid = PD / 2, own = p.team.dir > 0;
    p.x = socClamp(p.x, own ? 2 : PL - SOC.BOXD, own ? SOC.BOXD : PL - 2);
    p.y = socClamp(p.y, mid - SOC.BOXH, mid + SOC.BOXH);
  } else { p.x = socClamp(p.x, 5, PL - 5); p.y = socClamp(p.y, 5, PD - 4); }
}

/* The keeper's body as a segment [x0,y0 → x1,y1], gloves at the far end,
   at height hz. The ball caught near the gloves; off the body, or struck
   too hard to hold, it is palmed away. */
function socTryCatch(p, W, [x0, y0, x1, y1], hz, allGloves) {
  const b = W.ball, s = b, dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
  const u = socClamp(((s.x - x0) * dx + (s.y - y0) * dy) / L, 0, 1);
  const d = Math.hypot(s.x - (x0 + dx * u), (s.y - (y0 + dy * u)) * 1.2);
  if (d > 6 || Math.abs(s.z + 5 - (p.z + hz)) > 12) return;
  p.act.done = true;
  const sp = Math.hypot(b.vx, b.vy), gloves = allGloves || u > .55;
  const clean = gloves && (sp < 150 || Math.random() < (p.team.gkSure ?? .72) * (sp < 260 ? 1 : .6));
  if (clean) {
    b.owner = p; b.vx = b.vy = b.vz = 0; b.last = p; b.target = null; b.shot = 0;
    p.holding = true; W.sound('catch'); W.onCatch && W.onCatch(p);
  } else {
    /* a palm or a block: back out and wide, or tipped on round the post */
    const side = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : (b.y < p.y ? -1 : 1);
    if (Math.random() < .4) { b.vx *= socRand(.35, .55); b.vy = side * socRand(80, 130); b.vz = socRand(20, 60); }
    else { b.vx = -b.vx * socRand(.2, .4) + p.face * 40; b.vy = side * socRand(50, 110); b.vz = socRand(30, 80); }
    b.last = p; b.shot = 0; b.target = null; W.sound(gloves ? 'catch' : 'bounce', 1);
  }
}

/* the ball at a carrier's feet, or in a keeper's hands */
function socCarry(W, dt) {
  const b = W.ball, o = b.owner;
  if (!o) { b.hidden = false; return; }
  if (o.st === 'down' || o.st === 'getup') { b.owner = null; o.holding = false; return; }
  if (o.holding) {
    /* lying after a forward dive: at the gloves on the ground; after a dive
       across the goal: in the gloves as the frame draws them (the sheet's
       `hands`, from its anchor), so it flies and lands with him */
    const lying = o.st === 'dive' && o.act.dir === 'fwd', across = o.st === 'dive' && o.act.dir !== 'fwd';
    const f = socFrame(o), hands = across && o.sheet.meta.anims[o.an].hands, hd = hands && hands[f];
    b.x = o.x + o.face * (hd ? hd[0] : across ? 3 : 5); b.y = o.y + 1;
    /* the ball is drawn centred 4 above b.y - b.z: put that on the gloves */
    b.z = hd ? o.z - hd[1] - 3 : lying ? 2 : across ? o.z + 30 : 14; b.vx = b.vy = b.vz = 0;
    b.hidden = !lying && !across && !(o.st === 'catch' && o.an === 'highcatch' && f < 2) && !(o.st === 'release' && o.act.done);
    return;
  }
  /* at the feet, and never through a board: run at one and the ball stays
     on your side of it. One taken off a bounce or the chest drops the last
     few pixels to the foot rather than landing there in one frame. */
  const tx = socClamp(o.x + o.dx * 8, 3, SOC.PL - 3), ty = socClamp(o.y + o.dy * 6 + 1, 3, SOC.PD - 3), k = 1 - Math.exp(-22 * dt);
  const px = b.x, py = b.y;
  b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; b.z = Math.max(0, b.z - Math.max(110, b.z * 14) * dt);
  b.vx = o.vx; b.vy = o.vy; b.vz = 0;
  b.roll += Math.hypot(b.x - px, b.y - py);
  b.hidden = o.st === 'throwin' && socFrame(o) < 2;
  if (o.st === 'throwin') { b.x = o.x; b.y = o.y; b.z = 24; }
}

/* who touches a free ball, tackles on a carrier, and players shouldering
   each other apart */
function socContacts(W, dt) {
  const b = W.ball, P = W.players;
  const free = p => (p.st === 'move' || p.st === 'chest') && p.cd <= 0;
  if (!b.owner && !b.inNet) {
    const sp = Math.hypot(b.vx, b.vy);
    if (b.z < 7) {
      let best = null, bd = 9;
      for (const p of P) {
        if (!free(p)) continue;
        const d = Math.hypot(b.x - p.x, (b.y - p.y) * 1.4);
        if (d < bd && (b.last !== p || b.kickT > .25)) { bd = d; best = p; }
      }
      if (best) {
        const p = best;
        if (p.gk && socInBox(p, b)) { socCatch(p, false); p.holding = true; b.owner = p; b.last = p; b.target = null; b.shot = 0; W.sound('catch'); W.onCatch && W.onCatch(p); }
        else if (sp > 240 && b.target !== p && Math.random() < .45) {
          const ang = Math.atan2(b.vy, b.vx) + Math.PI + socRand(-1, 1);
          b.vx = Math.cos(ang) * sp * .3; b.vy = Math.sin(ang) * sp * .3; b.vz = 30; b.last = p; b.shot = 0; p.cd = .3;
          W.sound('bounce', .8);
        } else { b.owner = p; b.last = p; b.target = null; b.shot = 0; b.vz = 0; W.onTouch && W.onTouch(p); }   // it settles to the foot (socCarry)
      }
    } else if (b.shot && b.z < 24 && sp > 150) {
      /* A shot into a body at knee or chest height comes off it. Without
         this a rising shot passed straight through anyone in its way, and
         a defender stood in the line of a shot did nothing to stop it. */
      for (const p of P) {
        if (p.gk || (b.last && p.team === b.last.team) || (p.st !== 'move' && p.st !== 'slide')) continue;
        if (Math.hypot(b.x - p.x, b.y - p.y) < 10) {                  // the ball's own size and the body's
          const ang = Math.atan2(b.vy, b.vx) + Math.PI + socRand(-.9, .9);
          b.vx = Math.cos(ang) * sp * .35; b.vy = Math.sin(ang) * sp * .35; b.vz = Math.max(20, b.vz * .3);
          b.last = p; b.shot = 0; b.target = null; p.cd = .2;
          W.sound('bounce', 1); W.puff(b.x, b.y);
          break;
        }
      }
    } else if (b.z < 20 && b.vz <= 60) {
      /* chest height: outfield players take it down */
      for (const p of P) {
        if (p.gk || p.st !== 'move' || p.cd > 0 || (b.last === p && b.kickT < .3)) continue;
        if (Math.hypot(b.x - p.x, (b.y - p.y) * 1.4) < 7) { socChest(p, b); p.cd = .15; break; }
      }
    }
  } else if (b.owner && !b.owner.holding) {
    const o = b.owner;
    for (const p of P) {
      if (p.team === o.team || p.gk || !free(p)) continue;
      if (Math.hypot(b.x - p.x, (b.y - p.y) * 1.4) < 7) {
        const chance = p.human ? .5 : (p.team.steal ?? .35);
        if (Math.random() < chance) { b.owner = p; b.last = p; o.cd = .5; W.sound('tackle'); W.onTouch && W.onTouch(p); break; }
        p.cd = .35;
      }
    }
  }
  /* shoulder to shoulder */
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const p = P[i], q = P[j];
    if (p.st === 'dive' || q.st === 'dive' || p.st === 'down' || q.st === 'down') continue;
    const dx = q.x - p.x, dy = (q.y - p.y) * 1.6, d = Math.hypot(dx, dy);
    if (d >= 9 || d < .001) continue;
    const push = (9 - d) / 2, ux = dx / d, uy = dy / d / 1.6;
    p.x -= ux * push; p.y -= uy * push; q.x += ux * push; q.y += uy * push;
  }
}
function socInBox(p, b) {
  const own = p.team.dir > 0 ? b.x < SOC.BOXD : b.x > SOC.PL - SOC.BOXD;
  return own && Math.abs(b.y - SOC.PD / 2) < SOC.BOXH;
}
