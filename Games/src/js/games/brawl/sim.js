/* ============================================================================
   BALL BRAWL — the fight

   Two balls in a box and nobody steering: each keeps its own speed, bounces
   off the walls and off the other ball, and fights with whatever it was
   built with (core.js, BB_BALLS). Everything is decided here in fixed steps
   of 1/120 s from five things: the two balls, the two aims and a seed.
   Nothing else goes in and nothing here reads a clock, the page or
   Math.random, so the same five things make the same fight on every screen.
   That is how an online round is played: the players swap picks and aims,
   and each screen runs the fight itself (net.js).

   The arena is 380 across with its middle at 0, 0; x runs right and y runs
   down the screen. The balls start 100 either side of the middle, seat 0 on
   the left. After 22 s the walls start closing in, and after 36 s both
   balls start losing health, so no round can go on for long.

   step() leaves what happened in S.ev (hits, clashes, bounces, blasts) for
   the screen to turn into sparks, numbers and sounds; with `quiet` it keeps
   nothing, which is how the computer player and the balance tool run
   thousands of fights.
   ========================================================================== */
const BBSim = (() => {
  const T = 1 / 120;
  const HALF0 = 190, SHRINK_AT = 22, SHRINK_TO = 120, SHRINK_FOR = 12, POISON_AT = 36, POISON = 4, LIMIT = 90;
  const SPEED = 300, START = 100;
  const BODY_DMG = 3, BODY_CD = .3, HIT_CD = .3, CLASH_CD = .12, DMG = 1.3;
  const WOB = .06, MINAX = .22;              // a bounce's wobble, and how square to a wall a ball may run
  const sin = BBM.sin, cos = BBM.cos, sqrt = Math.sqrt;
  const ticks = s => Math.round(s / T);
  const TK = { hit: ticks(HIT_CD), body: ticks(BODY_CD), clash: ticks(CLASH_CD) };

  /* ---- the closest points of two segments (a point is a segment of no
     length); Ericson, Real-Time Collision Detection, 5.1.9 ---- */
  const SC = { px: 0, py: 0, qx: 0, qy: 0 };
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
    const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, rx = ax - cx, ry = ay - cy;
    const a = ux * ux + uy * uy, e = vx * vx + vy * vy, f = vx * rx + vy * ry;
    let s, t;
    if (a <= 1e-9 && e <= 1e-9) { s = 0; t = 0; }
    else if (a <= 1e-9) { s = 0; t = c01(f / e); }
    else {
      const c = ux * rx + uy * ry;
      if (e <= 1e-9) { t = 0; s = c01(-c / a); }
      else {
        const b = ux * vx + uy * vy, den = a * e - b * b;
        s = den !== 0 ? c01((b * f - c * e) / den) : 0;
        t = (b * s + f) / e;
        if (t < 0) { t = 0; s = c01(-c / a); }
        else if (t > 1) { t = 1; s = c01((b - c) / a); }
      }
    }
    const px = ax + ux * s, py = ay + uy * s, qx = cx + vx * t, qy = cy + vy * t;
    SC.px = px; SC.py = py; SC.qx = qx; SC.qy = qy;
    return (px - qx) * (px - qx) + (py - qy) * (py - qy);
  }

  /* part kinds: what a weapon is made of, each a capsule (a segment with a
     radius) so that every test is segSeg */
  const BLADE = 1, ORB = 2, ARC = 3, LANCE = 4, TAIL = 5, FLAIL = 6, SAW = 7;
  /* and what flies: S.shots holds all of them, each with its own k */
  const ARROW = 0, STAR = 1, NEEDLE = 2, SPELL = 3, RANG = 4;
  const SHOT_KIND = ['arrow', 'star', 'needle', 'spell', 'rang'];
  const FMAX = 18;                            // the fastest a flail's head may go round, radians a second

  function makeBall(S, i, id, aim) {
    const def = BB_BY[id] || BB_BALLS[0], w = def.w;
    const ang = BBM.aimAngle(aim);
    const b = {
      i, id: def.id, def, x: i ? START : -START, y: 0, vx: 0, vy: 0,
      px: 0, py: 0, r: def.r, pr: def.r, m: 1, hp: def.hp, max: def.hp,
      speed: SPEED * def.spd, wa: -BBM.HALF, pwa: -BBM.HALF, dir: i ? -1 : 1,
      spin: w.spin || 0, len: w.len || 0, hw: w.hw || 0, brad: w.rad || 0, ldmg: w.dmg || 0,
      cd: [0, 0, 0, 0], slow: 0, slowK: 0, thawT: 0, thawEvery: 0,
      timer: ticks(w.first || 0), ghost: 0, gT: ticks(w.solid || 0), fade: w.fade || 0,
      trail: new Float64Array(128), tn: 0, tailN: w.n || 0, tailT: ticks(w.every || 1),
      parts: [], np: 0, reach: 0, shotHits: 0,
      /* the flail: its head's turn rate, and the ball's velocity at the last
         step, so the head feels every jolt */
      fw: 0, fvx: 0, fvy: 0,
      /* a boomerang in hand; a spell's or a boomerang's size and blow */
      held: 1, srad: w.rad || 0, sdmg: w.dmg || 0,
      /* the laser: where it points (a unit vector), charging or cooling,
         and how long a charge takes */
      la: { vx: i ? -1 : 1, vy: 0 }, lph: 0, lchg: ticks(w.charge || 0),
      /* the blaze's flames (x, y, the step each goes out), and how long
         they last */
      fl: w.kind === 'fire' ? new Float64Array(64 * 3) : null, fln: 0, life: w.life || 0,
      range: w.range || 0,                 // the tesla's reach
      nn: w.n || 0,                        // the cactus's needles in its next spray
      mult: 1,                             // the comet's speed
      sr: w.sr || 0,                       // the saw's radius
      /* the katana: steps to the next dash, steps of this one left, and
         how often it dashes */
      dashT: w.dash ? ticks(w.dash.every * .6) : 0, dashing: 0, dashEvery: w.dash ? w.dash.every : 0,
      /* for the round's card */
      dealt: 0, landed: 0, big: 0, healed: 0, blocked: 0
    };
    b.m = (b.r / 30) * (b.r / 30);
    b.vx = cos(ang) * b.speed; b.vy = sin(ang) * b.speed;
    b.fvx = b.vx; b.fvy = b.vy;
    b.px = b.x; b.py = b.y;
    for (let k = 0; k < 64; k++) { b.trail[k * 2] = b.x; b.trail[k * 2 + 1] = b.y; }
    return b;
  }

  /* setup: { seed, balls: [id, id], aims: [q, q] (BBM aims), quiet } */
  function create(o) {
    const S = {
      tick: 0, half: HALF0, rng: BBM.rng(o.seed), b: [], shots: [], bombs: [], ev: [],
      quiet: !!o.quiet, over: false, winner: -1, clashCd: 0, bodyCd: 0, poison: false
    };
    S.b.push(makeBall(S, 0, o.balls[0], o.aims[0]), makeBall(S, 1, o.balls[1], o.aims[1]));
    return S;
  }
  const emit = (S, e) => { if (!S.quiet) { e.t = S.tick; S.ev.push(e); } };

  /* ---- motion ---- */
  function renorm(b) {
    const l = sqrt(b.vx * b.vx + b.vy * b.vy);
    if (l < 1e-6) { b.vx = b.speed; b.vy = 0; return; }
    const k = b.speed / l;
    b.vx *= k; b.vy *= k;
  }
  function turn(b, a) {
    const c = cos(a), s = sin(a), vx = b.vx;
    b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c;
  }
  /* steer toward (nx, ny) by k, a heavier ball less, and keep the speed */
  function knock(b, nx, ny, k) {
    const s = sqrt(b.vx * b.vx + b.vy * b.vy) || 1, kk = k / b.m;
    let vx = b.vx / s + nx * kk, vy = b.vy / s + ny * kk;
    const l = sqrt(vx * vx + vy * vy);
    if (l < 1e-6) { vx = nx; vy = ny; } else { vx /= l; vy /= l; }
    b.vx = vx * b.speed; b.vy = vy * b.speed;
  }
  /* A ball running nearly square to the walls could go back and forth for
     ever without meeting the other one, so a bounce always leaves it some
     way across, and a little wobble keeps two fights from ever being alike. */
  function walls(S, b, quietWall) {
    const h = S.half, r = b.r;
    let hit = 0, nx = 0, ny = 0;
    if (b.x < -h + r) { b.x = -h + r; if (b.vx < 0) { b.vx = -b.vx; hit = 1; nx = 1; } }
    else if (b.x > h - r) { b.x = h - r; if (b.vx > 0) { b.vx = -b.vx; hit = 1; nx = -1; } }
    if (b.y < -h + r) { b.y = -h + r; if (b.vy < 0) { b.vy = -b.vy; hit = 1; ny = 1; } }
    else if (b.y > h - r) { b.y = h - r; if (b.vy > 0) { b.vy = -b.vy; hit = 1; ny = -1; } }
    if (!hit) return 0;
    turn(b, (S.rng() - .5) * 2 * WOB);
    const m = b.speed * MINAX;
    if (Math.abs(b.vx) < m) b.vx = b.vx < 0 || (b.vx === 0 && nx < 0) ? -m : m;
    if (Math.abs(b.vy) < m) b.vy = b.vy < 0 || (b.vy === 0 && ny < 0) ? -m : m;
    renorm(b);
    if (!quietWall) emit(S, { k: 'wall', i: b.i, x: b.x + (nx ? -nx * r : 0), y: b.y + (ny ? -ny * r : 0), nx, ny });
    return 1;
  }
  /* turn o's velocity toward the unit vector (tx, ty) by no more than the
     angle whose cosine and sine are c and s, keeping its length: how a
     spell homes, a boomerang comes back and the laser follows its mark */
  function steer(o, tx, ty, c, s) {
    const l = sqrt(o.vx * o.vx + o.vy * o.vy) || 1, ux = o.vx / l, uy = o.vy / l;
    if (ux * tx + uy * ty >= c) { o.vx = tx * l; o.vy = ty * l; return; }
    const sg = ux * ty - uy * tx >= 0 ? s : -s;
    o.vx = (ux * c - uy * sg) * l; o.vy = (ux * sg + uy * c) * l;
  }
  const slowF = b => 1 - b.slowK * b.slow;

  /* ---- each ball's own clockwork: timers, cadences, growth ---- */
  function think(S, b, o) {
    const w = b.def.w;
    if (b.slow > 0 && --b.thawT <= 0) { b.slow--; b.thawT = b.thawEvery; }
    const f = slowF(b);
    let k = f * b.mult;
    if (w.dash) {
      /* the katana turns straight at the other ball and goes for it */
      if (b.dashing > 0) b.dashing--;
      else if ((b.dashT -= f) <= 0) {
        b.dashT += ticks(b.dashEvery); b.dashing = ticks(w.dash.time);
        const dx = o.x - b.x, dy = o.y - b.y, l = sqrt(dx * dx + dy * dy) || 1;
        b.vx = dx / l * b.speed; b.vy = dy / l * b.speed;
        emit(S, { k: 'dash', i: b.i, x: b.x, y: b.y });
      }
      if (b.dashing > 0) k *= w.dash.speed;
    }
    b.speed = SPEED * b.def.spd * k;
    if (w.kind === 'bow') {
      b.timer -= f;
      if (b.timer <= 0) { b.timer += ticks(w.every); fire(S, b, o); }
    } else if (w.kind === 'bomb') {
      b.timer -= f;
      if (b.timer <= 0) {
        b.timer += ticks(w.every);
        S.bombs.push({ x: b.x, y: b.y, own: b.i, t: ticks(w.fuse), fuse: ticks(w.fuse), rad: b.brad });
        emit(S, { k: 'drop', i: b.i, x: b.x, y: b.y });
      }
    } else if (w.kind === 'tail') {
      if (--b.tailT <= 0 && b.tailN < w.max) { b.tailN++; b.tailT = ticks(w.every); }
    } else if (w.kind === 'ghost') {
      if (--b.gT <= 0) {
        if (b.ghost === 0) { b.ghost = 1; b.gT = ticks(b.fade); emit(S, { k: 'fade', i: b.i, on: 1 }); }
        else if (b.ghost === 1) { b.ghost = 2; b.gT = ticks(w.charge); emit(S, { k: 'fade', i: b.i, on: 0 }); }
        else { b.ghost = 0; b.gT = ticks(w.solid); }
      }
    } else if (w.kind === 'star') {
      b.timer -= f;
      if (b.timer <= 0) { b.timer += ticks(w.every); stars(S, b, o); }
    } else if (w.kind === 'spell') {
      b.timer -= f;
      if (b.timer <= 0) { b.timer += ticks(w.every); cast(S, b, o); }
    } else if (w.kind === 'rang') {
      if (b.held && (b.timer -= f) <= 0) toss(S, b, o);
    } else if (w.kind === 'laser') laser(S, b, o, f);
    else if (w.kind === 'fire') {
      b.timer -= f;
      if (b.timer <= 0) {
        b.timer += ticks(w.every);
        const j = (b.fln % 64) * 3;
        b.fl[j] = b.x; b.fl[j + 1] = b.y; b.fl[j + 2] = S.tick + ticks(b.life);
        b.fln++;
      }
    } else if (w.kind === 'zap') {
      if (b.timer > 0) b.timer -= f; else zap(S, b, o);
    } else if (w.kind === 'spines') {
      b.timer -= f;
      if (b.timer <= 0) { b.timer += ticks(w.every); spray(S, b); }
    }
  }
  function fire(S, b, o) {
    const w = b.def.w, n = Math.min(w.max, 1 + Math.floor(b.shotHits / w.per));
    let dx = o.x - b.x, dy = o.y - b.y;
    const l = sqrt(dx * dx + dy * dy) || 1;
    dx /= l; dy /= l;
    for (let j = 0; j < n; j++) {
      const a = (j - (n - 1) / 2) * w.spread, c = cos(a), s = sin(a);
      const ux = dx * c - dy * s, uy = dx * s + dy * c;
      S.shots.push({ k: ARROW, x: b.x + ux * (b.r + 6), y: b.y + uy * (b.r + 6), px: b.x + ux * b.r, py: b.y + uy * b.r,
                     vx: ux * w.speed, vy: uy * w.speed, own: b.i, dmg: w.dmg, rad: 3, refl: 0, from: b.i });
    }
    emit(S, { k: 'shoot', i: b.i, n, x: b.x, y: b.y, dx, dy });
  }
  /* a unit vector from b toward o, in UV */
  const UV = { x: 0, y: 0 };
  function toward(b, o) {
    const dx = o.x - b.x, dy = o.y - b.y, l = sqrt(dx * dx + dy * dy) || 1;
    UV.x = dx / l; UV.y = dy / l;
    return UV;
  }
  /* the ninja's stars: a fan of them at the other ball, bouncing off the
     walls as many times as it has earned */
  function stars(S, b, o) {
    const w = b.def.w, n = w.n, bn = Math.min(w.max, w.bounce + Math.floor(b.shotHits / w.per)), u = toward(b, o);
    for (let j = 0; j < n; j++) {
      const a = (j - (n - 1) / 2) * w.spread, c = cos(a), s = sin(a);
      const ux = u.x * c - u.y * s, uy = u.x * s + u.y * c;
      S.shots.push({ k: STAR, x: b.x + ux * (b.r + 6), y: b.y + uy * (b.r + 6), px: b.x + ux * b.r, py: b.y + uy * b.r,
                     vx: ux * w.speed, vy: uy * w.speed, own: b.i, dmg: w.dmg, rad: 6, refl: 0, from: b.i, bn });
    }
    emit(S, { k: 'throw', i: b.i, what: 'star', x: b.x, y: b.y, dx: u.x, dy: u.y });
  }
  /* the wizard's spell: slower than a ball, but it turns after its mark */
  function cast(S, b, o) {
    const w = b.def.w, u = toward(b, o);
    S.shots.push({ k: SPELL, x: b.x + u.x * (b.r + 8), y: b.y + u.y * (b.r + 8), px: b.x + u.x * b.r, py: b.y + u.y * b.r,
                   vx: u.x * w.speed, vy: u.y * w.speed, own: b.i, dmg: b.sdmg, rad: b.srad, refl: 0, from: b.i,
                   life: ticks(w.life), tc: cos(w.turn * T), ts: sin(w.turn * T) });
    emit(S, { k: 'throw', i: b.i, what: 'spell', x: b.x, y: b.y, dx: u.x, dy: u.y });
  }
  /* the boomerang: thrown a little to one side of the other ball, it bends
     back across the line to it, then turns for home */
  function toss(S, b, o) {
    const w = b.def.w, u = toward(b, o), sg = S.rng() < .5 ? 1 : -1;
    const a = -sg * .7, c = cos(a), s = sin(a), ux = u.x * c - u.y * s, uy = u.x * s + u.y * c;
    b.held = 0;
    S.shots.push({ k: RANG, x: b.x + ux * (b.r + 8), y: b.y + uy * (b.r + 8), px: b.x + ux * b.r, py: b.y + uy * b.r,
                   vx: ux * w.speed, vy: uy * w.speed, own: b.i, dmg: b.sdmg, rad: b.srad, refl: 0, from: b.i,
                   t: 0, ph: 0, hc: 0, tc: cos(w.curve * T), ts: sin(w.curve * T) * sg });
    emit(S, { k: 'throw', i: b.i, what: 'rang', x: b.x, y: b.y, dx: ux, dy: uy });
  }
  /* The laser follows the other ball round, charges, and fires straight
     along where it points. For the last moments of a charge it holds
     still, so a ball that sees it coming can be gone by the time it fires. */
  function laser(S, b, o, f) {
    const w = b.def.w;
    if (!(b.lph === 1 && b.timer <= ticks(w.lock))) {
      const u = toward(b, o), a = w.turn * T * f;
      steer(b.la, u.x, u.y, cos(a), sin(a));
    }
    b.timer -= f;
    if (b.timer > 0) return;
    if (b.lph === 0) { b.lph = 1; b.timer = b.lchg; emit(S, { k: 'charge', i: b.i }); }
    else { b.lph = 0; b.timer = ticks(w.cool); beam(S, b, o); }
  }
  /* the beam: it stops at the first thing in its way, a weapon (a shield
     takes it) or the other ball, or else at the wall */
  function beam(S, b, o) {
    const w = b.def.w, ux = b.la.vx, uy = b.la.vy;
    const x0 = b.x + ux * (b.r + 12), y0 = b.y + uy * (b.r + 12);
    const h = S.half;
    let far = 2000;
    if (ux > 1e-9) far = Math.min(far, (h - x0) / ux); else if (ux < -1e-9) far = Math.min(far, (-h - x0) / ux);
    if (uy > 1e-9) far = Math.min(far, (h - y0) / uy); else if (uy < -1e-9) far = Math.min(far, (-h - y0) / uy);
    far = Math.max(0, far);
    const x1 = x0 + ux * far, y1 = y0 + uy * far;
    let best = far, what = 0, hx = x1, hy = y1;
    if (o.ghost !== 1) {
      for (let j = 0; j < o.np; j++) {
        const p = o.parts[j], rr = p.r + w.wid;
        if (segSeg(x0, y0, x1, y1, p.ax, p.ay, p.bx, p.by) > rr * rr) continue;
        const t = (SC.px - x0) * ux + (SC.py - y0) * uy;
        if (t < best) { best = t; what = p.k === ARC ? 2 : 1; hx = SC.px; hy = SC.py; }
      }
      const rr = o.r + w.wid, d2 = segSeg(x0, y0, x1, y1, o.x, o.y, o.x, o.y);
      if (d2 <= rr * rr) {
        const t = (SC.px - x0) * ux + (SC.py - y0) * uy - sqrt(rr * rr - d2);
        if (t < best) { best = Math.max(0, t); what = 3; hx = x0 + ux * best; hy = y0 + uy * best; }
      }
    }
    if (what === 3) {
      if (hurt(S, b, o, w.dmg, 'beam', hx, hy)) b.lchg = Math.max(ticks(w.min), b.lchg - ticks(w.less));
      knock(o, ux, uy, w.knock);
    } else if (what === 2) block(S, o, b, hx, hy);
    emit(S, { k: 'beam', i: b.i, x0, y0, x: hx, y: hy, hit: what });
  }
  /* the tesla's shock: whenever the other ball is in reach and it has
     charged again; a shield turned to it takes the shock */
  function zap(S, b, o) {
    if (o.ghost === 1) return;
    const w = b.def.w;
    let nx = o.x - b.x, ny = o.y - b.y;
    const d = sqrt(nx * nx + ny * ny) || 1;
    if (d - b.r - o.r > b.range) return;
    nx /= d; ny /= d;
    b.timer = ticks(w.every);
    const hx = o.x - nx * o.r, hy = o.y - ny * o.r;
    if (guarded(o, -nx, -ny)) block(S, o, b, hx, hy);
    else {
      hurt(S, b, o, w.dmg, 'zap', hx, hy);
      knock(o, nx, ny, w.knock);
      b.range = Math.min(w.max, b.range + w.grow);
    }
    emit(S, { k: 'zap', i: b.i, x0: b.x + nx * b.r, y0: b.y + ny * b.r, x: hx, y: hy });
  }
  /* the cactus's spray: needles every way at once, as many as it has been
     hit since the last one, and more */
  function spray(S, b) {
    const w = b.def.w, n = b.nn, a0 = S.rng() * BBM.TWO;
    for (let j = 0; j < n; j++) {
      const a = a0 + j * BBM.TWO / n, c = cos(a), s = sin(a);
      S.shots.push({ k: NEEDLE, x: b.x + c * (b.r + 4), y: b.y + s * (b.r + 4), px: b.x + c * b.r, py: b.y + s * b.r,
                     vx: c * w.speed, vy: s * w.speed, own: b.i, dmg: w.dmg, rad: 2.5, refl: 0, from: b.i });
    }
    b.nn = w.n;
    emit(S, { k: 'spray', i: b.i, n, x: b.x, y: b.y });
  }
  /* the blaze's flames burn the other ball when it rolls through them */
  function flames(S, b, o) {
    if (o.ghost === 1 || b.cd[0] > 0) return;
    const w = b.def.w, rr = (o.r + w.fr) * (o.r + w.fr), n = Math.min(64, b.fln);
    for (let j = 0; j < n; j++) {
      const k = j * 3;
      if (b.fl[k + 2] <= S.tick) continue;
      const dx = o.x - b.fl[k], dy = o.y - b.fl[k + 1], d2 = dx * dx + dy * dy;
      if (d2 > rr) continue;
      const d = sqrt(d2) || 1;
      hurt(S, b, o, w.dmg, 'burn', o.x - dx / d * o.r, o.y - dy / d * o.r);
      b.cd[0] = ticks(w.cd);
      b.life = Math.min(w.max, b.life + w.grow);
      return;
    }
  }

  function move(S, b) {
    renorm(b);
    b.x += b.vx * T; b.y += b.vy * T;
    /* the comet comes off every wall faster */
    if (walls(S, b) && b.def.w.kind === 'comet') b.mult = Math.min(b.def.w.max, b.mult + b.def.w.grow);
    if (b.def.w.kind === 'tail' && S.tick % 5 === 0) {
      /* the tail follows the path the head took, one sample every 5 steps */
      b.tn = (b.tn + 1) & 63;
      b.trail[b.tn * 2] = b.x; b.trail[b.tn * 2 + 1] = b.y;
    }
  }

  /* ---- the weapon, turned and laid out as capsules for this step ---- */
  function part(b) {
    let p = b.parts[b.np];
    if (!p) p = b.parts[b.np] = { ax: 0, ay: 0, bx: 0, by: 0, r: 0, k: 0, g: 0 };
    b.np++;
    return p;
  }
  function arm(S, b) {
    const w = b.def.w, f = slowF(b);
    b.np = 0; b.reach = b.r;
    if (w.kind === 'blade') {
      let spin = b.spin;
      if (w.rage) spin = w.spin * (1 + w.rage * (1 - Math.max(0, b.hp) / b.max));
      b.wa = BBM.wrap(b.wa + b.dir * spin * f * T);
      for (let k = 0; k < w.n; k++) {
        const a = b.wa + k * BBM.TWO / w.n, c = cos(a), s = sin(a), p = part(b);
        p.ax = b.x + c * (b.r - 4); p.ay = b.y + s * (b.r - 4);
        p.bx = b.x + c * (b.r + b.len); p.by = b.y + s * (b.r + b.len);
        p.r = w.th / 2; p.k = BLADE; p.g = k;
      }
      b.reach = b.r + b.len + w.th;
    } else if (w.kind === 'orb') {
      b.wa = BBM.wrap(b.wa + b.dir * w.spin * f * T);
      for (let k = 0; k < w.n; k++) {
        const a = b.wa + k * BBM.TWO / w.n, p = part(b), d = b.r + w.dist;
        p.ax = p.bx = b.x + cos(a) * d; p.ay = p.by = b.y + sin(a) * d;
        p.r = w.or; p.k = ORB; p.g = k;
      }
      b.reach = b.r + w.dist + w.or;
    } else if (w.kind === 'arc') {
      b.wa = BBM.wrap(b.wa + b.dir * w.spin * f * T);
      const R = b.r + w.gap, m = Math.max(3, Math.ceil(2 * b.hw / .3)), st = 2 * b.hw / m;
      let a0 = b.wa - b.hw, c0 = cos(a0), s0 = sin(a0);
      for (let j = 0; j < m; j++) {
        const a1 = a0 + st, c1 = cos(a1), s1 = sin(a1), p = part(b);
        p.ax = b.x + c0 * R; p.ay = b.y + s0 * R; p.bx = b.x + c1 * R; p.by = b.y + s1 * R;
        p.r = w.th / 2; p.k = ARC; p.g = 0;
        a0 = a1; c0 = c1; s0 = s1;
      }
      b.reach = R + w.th;
    } else if (w.kind === 'lance') {
      const l = sqrt(b.vx * b.vx + b.vy * b.vy) || 1, c = b.vx / l, s = b.vy / l, p = part(b);
      p.ax = b.x + c * (b.r - 4); p.ay = b.y + s * (b.r - 4);
      p.bx = b.x + c * (b.r + b.len); p.by = b.y + s * (b.r + b.len);
      p.r = w.th / 2; p.k = LANCE; p.g = 0;
      b.reach = b.r + b.len + w.th;
    } else if (w.kind === 'tail') {
      const n = b.tailN;
      for (let j = 0; j < n; j++) {
        const k = ((b.tn - j - 2) & 63) * 2, p = part(b);
        p.ax = p.bx = b.trail[k]; p.ay = p.by = b.trail[k + 1];
        p.r = 13 - 5 * j / Math.max(1, n - 1); p.k = TAIL; p.g = 0;
      }
    } else if (w.kind === 'flail') {
      /* The head swings on its chain: pushed round by w.drive, and flung by
         every jolt the ball takes (a bounce, a blow), which the head feels
         as the change in the ball's velocity since the last step. */
      const L = b.r + b.len, ax = (b.vx - b.fvx) / T, ay = (b.vy - b.fvy) / T;
      b.fvx = b.vx; b.fvy = b.vy;
      const c = cos(b.wa), s = sin(b.wa);
      const al = (ax * s - ay * c) / L + (b.dir * w.drive * f - b.fw) * 3;
      b.fw += al * T;
      if (b.fw > FMAX) b.fw = FMAX; else if (b.fw < -FMAX) b.fw = -FMAX;
      b.wa = BBM.wrap(b.wa + b.fw * T);
      const p = part(b);
      p.ax = p.bx = b.x + cos(b.wa) * L; p.ay = p.by = b.y + sin(b.wa) * L;
      p.r = w.hr; p.k = FLAIL; p.g = 0;
      b.reach = L + w.hr;
    } else if (w.kind === 'saw') {
      b.wa = BBM.wrap(b.wa + b.dir * w.spin * f * T);
      const d = b.r + w.gap + b.sr, p = part(b);
      p.ax = p.bx = b.x + cos(b.wa) * d; p.ay = p.by = b.y + sin(b.wa) * d;
      p.r = b.sr; p.k = SAW; p.g = 0;
      b.reach = d + b.sr;
    }
  }

  /* ---- damage ---- */
  function hurt(S, a, v, dmg, kind, x, y) {
    if (v.ghost === 1 || dmg <= 0) return 0;
    dmg *= DMG;
    v.hp -= dmg;
    a.dealt += dmg; a.landed++;
    if (dmg > a.big) a.big = dmg;
    const w = a.def.w;
    let heal = 0;
    if (w.drain && a !== v) {
      heal = Math.min(a.max - Math.max(0, a.hp), dmg * (w.drain + w.thirst * (1 - Math.max(0, a.hp) / a.max)));
      if (heal > 0) { a.hp += heal; a.healed += heal; }
    }
    if (kind === 'orb') {
      if (v.slow < w.stacks) v.slow++;
      v.slowK = w.slow; v.thawEvery = ticks(w.thaw); v.thawT = v.thawEvery;
    }
    /* a cactus stores up every blow for its next spray */
    const vw = v.def.w;
    if (vw.kind === 'spines' && a !== v) v.nn = Math.min(vw.max, v.nn + vw.grow);
    emit(S, { k: 'hit', by: a.i, on: v.i, x, y, dmg, kind, heal, slow: v.slow });
    return dmg;
  }

  /* ---- everything thrown and shot ----
     Arrows and needles fly straight and stick in the wall. Stars come off
     the walls as many times as they were thrown to, spells turn after their
     mark until they burn out, and the boomerang bends out and comes home.
     Anything the other ball holds out stops them (a boomerang it knocks
     back toward home), and a shield sends them back: then they are the
     shield's. */
  function shots(S) {
    const L = S.shots;
    for (let i = L.length - 1; i >= 0; i--) {
      const s = L[i];
      s.px = s.x; s.py = s.y;
      if ((s.k === SPELL || s.k === RANG) && !fly(S, s)) { L.splice(i, 1); continue; }
      s.x += s.vx * T; s.y += s.vy * T;
      if (s.k === ARROW || s.k === NEEDLE) {
        const h = S.half + 12;
        if (s.x < -h || s.x > h || s.y < -h || s.y > h) {
          emit(S, { k: 'stick', x: Math.max(-S.half, Math.min(S.half, s.x)), y: Math.max(-S.half, Math.min(S.half, s.y)), n: s.k });
          L.splice(i, 1); continue;
        }
      } else if (bounce(S, s)) {
        if (s.k === STAR && --s.bn < 0) { emit(S, { k: 'stick', x: s.x, y: s.y, n: s.k }); L.splice(i, 1); continue; }
        emit(S, { k: 'ping', x: s.x, y: s.y, n: s.k });
      }
      if (s.k === RANG && s.hc > 0) continue;              // just knocked away: let it get clear
      const o = S.b[1 - s.own];
      if (o.ghost === 1) continue;
      let gone = false;
      for (let j = 0; j < o.np; j++) {
        const p = o.parts[j], pr = p.r + s.rad;
        /* anything the other ball holds out stops an arrow, a shield sends
           it back, and a snake's tail takes it in its scales */
        if (segSeg(s.px, s.py, s.x, s.y, p.ax, p.ay, p.bx, p.by) > pr * pr) continue;
        if (s.k === RANG) {
          /* knocked back off it, and heading home at once */
          let nx = s.x - SC.qx, ny = s.y - SC.qy;
          const l = sqrt(nx * nx + ny * ny) || 1;
          nx /= l; ny /= l;
          const d = s.vx * nx + s.vy * ny;
          if (d < 0) { s.vx -= 2 * d * nx; s.vy -= 2 * d * ny; }
          s.ph = 1; s.hc = ticks(.2);
          if (p.k === ARC) block(S, o, S.b[1 - o.i], SC.qx, SC.qy); else emit(S, { k: 'deflect', x: SC.qx, y: SC.qy, n: s.k });
        } else if (p.k === ARC) {
          /* a shield sends it back where it came from, and it is the
             shield's now */
          let nx = s.x - o.x, ny = s.y - o.y;
          const l = sqrt(nx * nx + ny * ny) || 1;
          nx /= l; ny /= l;
          const d = s.vx * nx + s.vy * ny;
          if (d < 0) { s.vx -= 2 * d * nx; s.vy -= 2 * d * ny; }
          s.own = o.i; s.refl = 1;
          block(S, o, S.b[1 - o.i], SC.qx, SC.qy);
        } else {
          emit(S, { k: 'deflect', x: SC.qx, y: SC.qy, n: s.k });
          L.splice(i, 1);
          gone = true;
        }
        break;
      }
      if (gone || s.own === o.i) continue;
      const rr = o.r + s.rad;
      if (segSeg(s.px, s.py, s.x, s.y, o.x, o.y, o.x, o.y) <= rr * rr) {
        const a = S.b[s.own], l = sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
        if (hurt(S, a, o, s.dmg, s.refl ? 'reflect' : SHOT_KIND[s.k], SC.px, SC.py) && !s.refl) landed(a, s);
        knock(o, s.vx / l, s.vy / l, s.k === SPELL ? .8 : s.k === RANG ? .7 : .45);
        if (s.k === RANG) { s.ph = 1; s.hc = ticks(.3); }
        else L.splice(i, 1);
      }
    }
  }
  /* what a thrower gets for a shot that lands */
  function landed(a, s) {
    const w = a.def.w;
    if ((s.k === ARROW && w.kind === 'bow') || (s.k === STAR && w.kind === 'star')) a.shotHits++;
    else if (s.k === SPELL && w.kind === 'spell') { a.sdmg = Math.min(w.max, a.sdmg + w.grow); a.srad = Math.min(w.max, a.srad + w.grow); }
    else if (s.k === RANG && w.kind === 'rang') { a.sdmg = Math.min(w.max, a.sdmg + w.grow); a.srad = Math.min(18, a.srad + 1); s.dmg = a.sdmg; s.rad = a.srad; }
  }
  /* a star, a spell or a boomerang coming off the walls */
  function bounce(S, s) {
    const h = S.half - s.rad;
    let hit = 0;
    if (s.x < -h) { s.x = -h; if (s.vx < 0) s.vx = -s.vx; hit = 1; }
    else if (s.x > h) { s.x = h; if (s.vx > 0) s.vx = -s.vx; hit = 1; }
    if (s.y < -h) { s.y = -h; if (s.vy < 0) s.vy = -s.vy; hit = 1; }
    else if (s.y > h) { s.y = h; if (s.vy > 0) s.vy = -s.vy; hit = 1; }
    return hit;
  }
  /* a spell's and a boomerang's steering; false once it is gone (a spell
     burnt out, a boomerang caught) */
  function fly(S, s) {
    if (s.k === SPELL) {
      if (--s.life <= 0) { emit(S, { k: 'fizzle', x: s.x, y: s.y }); return false; }
      const o = S.b[1 - s.own];
      if (o.ghost !== 1) { const u = toward(s, o); steer(s, u.x, u.y, s.tc, s.ts); }
      return true;
    }
    const b = S.b[s.from], w = b.def.w;
    if (s.hc > 0) s.hc--;
    s.t++;
    if (s.ph === 0) {
      /* bending out */
      const vx = s.vx;
      s.vx = vx * s.tc - s.vy * s.ts; s.vy = vx * s.ts + s.vy * s.tc;
      if (s.t >= ticks(w.out)) s.ph = 1;
      return true;
    }
    const tx = b.x - s.x, ty = b.y - s.y, d = sqrt(tx * tx + ty * ty) || 1;
    if (d <= b.r + s.rad + 2) {
      b.held = 1; b.timer = ticks(w.every);
      emit(S, { k: 'catch', i: b.i, x: s.x, y: s.y });
      return false;
    }
    /* home, turning harder the longer it has been on its way back */
    const a = w.back * T * Math.max(1, Math.min(4, 1 + (s.t - ticks(w.out)) * T));
    steer(s, tx / d, ty / d, cos(a), sin(a));
    const l = sqrt(s.vx * s.vx + s.vy * s.vy) || 1, k = w.speed * 1.1 / l;
    s.vx *= k; s.vy *= k;
    return true;
  }
  /* ---- bombs ---- */
  function bombs(S) {
    const L = S.bombs;
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i], h = S.half - 8;
      if (q.x < -h) q.x = -h; if (q.x > h) q.x = h; if (q.y < -h) q.y = -h; if (q.y > h) q.y = h;
      const a = S.b[q.own], o = S.b[1 - q.own], w = a.def.w;
      let dx = o.x - q.x, dy = o.y - q.y;
      const d = sqrt(dx * dx + dy * dy);
      /* it blows when its fuse runs out, or as soon as the other ball
         rolls into it once it has settled */
      const touch = o.ghost !== 1 && q.fuse - q.t >= ticks(w.arm || 0) && d <= o.r + 12;
      if (--q.t > 0 && !touch) continue;
      let hit = 0;
      if (o.ghost !== 1 && d <= q.rad + o.r) {
        if (d > 1e-6) { dx /= d; dy /= d; } else { dx = 1; dy = 0; }
        /* a shield turned to the blast takes half of it */
        const half = guarded(o, -dx, -dy);
        if (half) block(S, o, a, o.x - dx * o.r, o.y - dy * o.r);
        hit = hurt(S, a, o, half ? w.dmg / 2 : w.dmg, 'bomb', o.x - dx * o.r, o.y - dy * o.r) ? 1 : 0;
        knock(o, dx, dy, w.knock);
        if (hit) a.brad = Math.min(w.max, a.brad + w.grow);
      }
      emit(S, { k: 'boom', i: q.own, x: q.x, y: q.y, rad: q.rad, hit });
      L.splice(i, 1);
    }
  }

  /* ---- weapon on weapon ---- */
  const spins = b => { const k = b.def.w.kind; return k === 'blade' || k === 'orb' || k === 'arc' || k === 'saw' || k === 'flail'; };
  /* a weapon going round turns back the other way; a flail's head rebounds */
  function reverse(b) {
    b.dir = -b.dir;
    if (b.def.w.kind === 'flail') b.fw = -b.fw * .6;
  }
  function block(S, sh, o, x, y) {
    const w = sh.def.w;
    sh.hw = Math.min(w.max, sh.hw + w.grow);
    sh.blocked++;
    emit(S, { k: 'block', i: sh.i, x, y, hw: sh.hw });
  }
  function clash(S, A, B) {
    if (S.clashCd > 0 || !A.np || !B.np) return;
    const dx = B.x - A.x, dy = B.y - A.y, rr = A.reach + B.reach;
    if (dx * dx + dy * dy > rr * rr) return;
    for (let i = 0; i < A.np; i++) {
      const p = A.parts[i];
      if (p.k === TAIL) continue;
      for (let j = 0; j < B.np; j++) {
        const q = B.parts[j];
        if (q.k === TAIL) continue;
        const r = p.r + q.r;
        if (segSeg(p.ax, p.ay, p.bx, p.by, q.ax, q.ay, q.bx, q.by) > r * r) continue;
        const x = (SC.px + SC.qx) / 2, y = (SC.py + SC.qy) / 2;
        S.clashCd = TK.clash;
        if (p.k === ARC && q.k !== ARC) guard(S, A, B, x, y);
        else if (q.k === ARC && p.k !== ARC) guard(S, B, A, x, y);
        else {
          for (const b of [A, B]) {
            if (spins(b)) reverse(b);
            else if (b.def.w.kind === 'lance') { const o = b === A ? B : A; away(b, o, .9); }
          }
          emit(S, { k: 'clash', x, y, a: A.def.w.kind, b: B.def.w.kind });
        }
        return;
      }
    }
  }
  /* a blow on a shield: the blow comes off worse */
  function guard(S, sh, o, x, y) {
    if (spins(o)) reverse(o); else away(o, sh, 1.1);
    block(S, sh, o, x, y);
  }
  function away(b, o, k) {
    let nx = b.x - o.x, ny = b.y - o.y;
    const l = sqrt(nx * nx + ny * ny) || 1;
    knock(b, nx / l, ny / l, k);
  }

  /* ---- weapon on body: A's weapon into B ---- */
  function strike(S, A, B) {
    if (!A.np || B.ghost === 1) return;
    const w = A.def.w;
    if (w.kind !== 'tail') {
      const dx = B.x - A.x, dy = B.y - A.y, rr = A.reach + B.r;
      if (dx * dx + dy * dy > rr * rr) return;
    }
    for (let i = 0; i < A.np; i++) {
      const p = A.parts[i];
      if (A.cd[p.g] > 0) continue;
      const rr = p.r + B.r;
      if (segSeg(p.ax, p.ay, p.bx, p.by, B.x, B.y, B.x, B.y) > rr * rr) continue;
      if (p.k === TAIL && B.def.w.kind === 'arc') {
        if (shielded(S, B, A, p)) break;
        segSeg(p.ax, p.ay, p.bx, p.by, B.x, B.y, B.x, B.y);      // SC again, for the blow itself
      }
      let nx = B.x - SC.px, ny = B.y - SC.py;
      const l = sqrt(nx * nx + ny * ny) || 1;
      nx /= l; ny /= l;
      const hx = B.x - nx * B.r, hy = B.y - ny * B.r;
      let dmg = w.dmg, kind = 'blade', kn = w.knock || 1;
      if (p.k === BLADE) {
        dmg = A.ldmg;                                    // a hammer's blows get heavier
        if (A.dashing > 0) { dmg *= w.dash.cut; kind = 'slash'; }    // the katana's dash cuts deeper
      }
      else if (p.k === ORB) kind = 'orb';
      else if (p.k === ARC) kind = 'bash';
      else if (p.k === TAIL) kind = 'tail';
      else if (p.k === LANCE) {
        kind = 'lance'; dmg = A.ldmg;
        /* head-on: the other ball was coming at the point */
        const ux = p.bx - p.ax, uy = p.by - p.ay;
        if (B.vx * ux + B.vy * uy < 0) { dmg *= w.head; kind = 'lance2'; }
      } else if (p.k === FLAIL) {
        /* as hard as the head is going, into the ball it meets */
        kind = 'flail';
        const L = A.r + A.len, c = cos(A.wa), s = sin(A.wa);
        const rx = A.vx - s * A.fw * L - B.vx, ry = A.vy + c * A.fw * L - B.vy;
        dmg = w.dmg * Math.min(2.2, Math.max(.5, sqrt(rx * rx + ry * ry) / 450));
      } else if (p.k === SAW) kind = 'saw';
      hurt(S, A, B, dmg, kind, hx, hy);
      knock(B, nx, ny, kn);
      if (p.k !== TAIL && p.k !== SAW) knock(A, -nx, -ny, .3);
      A.cd[p.g] = p.k === TAIL || p.k === SAW ? ticks(w.cd) : TK.hit;
      /* growing with every hit */
      if (w.kind === 'blade' && w.grow && w.max) {
        if (w.n === 1) A.len = Math.min(w.max, A.len + w.grow);
        else A.spin = Math.min(w.max, A.spin + w.grow);
      } else if (w.kind === 'lance') A.len = Math.min(w.max, A.len + w.grow);
      else if (w.kind === 'flail') { A.len = Math.min(w.max, A.len + w.grow); A.fw = -A.fw * .5; }
      else if (w.kind === 'saw') A.sr = Math.min(w.max, A.sr + w.grow);
      if (w.heavy) A.ldmg = Math.min(w.heavyMax, A.ldmg + w.heavy);
      if (w.dash) A.dashEvery = Math.max(w.dash.min, A.dashEvery - w.dash.less);
      if (p.k === TAIL) break;
    }
  }

  /* A tail runs into a shield rather than past it: the shield's face takes
     it, though a tail is no blow and the shield does not grow from it. */
  function shielded(S, B, A, p) {
    for (let j = 0; j < B.np; j++) {
      const q = B.parts[j];
      if (q.k !== ARC) continue;
      const r = p.r + q.r;
      if (segSeg(p.ax, p.ay, p.bx, p.by, q.ax, q.ay, q.bx, q.by) > r * r) continue;
      A.cd[p.g] = ticks(A.def.w.cd);
      emit(S, { k: 'block', i: B.i, x: (SC.px + SC.qx) / 2, y: (SC.py + SC.qy) / 2, hw: B.hw });
      return true;
    }
    return false;
  }

  /* whether a blow arriving from (nx, ny), seen from b's middle, meets
     b's shield */
  function guarded(b, nx, ny) {
    if (b.def.w.kind !== 'arc') return false;
    return nx * cos(b.wa) + ny * sin(b.wa) >= cos(b.hw);
  }

  /* ---- body on body ---- */
  function bodyDmg(S, b) {
    const w = b.def.w;
    if (w.kind === 'body') return w.dmg + w.more * b.landed;
    if (w.kind === 'ghost') return b.ghost === 2 ? w.dmg : 4;
    if (w.kind === 'comet') return w.dmg * b.mult * b.mult;
    if (w.kind === 'spines') return w.thorn;
    return BODY_DMG;
  }
  const slamKind = (b, charged) => { const k = b.def.w.kind; return k === 'body' || k === 'comet' ? 'slam' : k === 'spines' ? 'thorn' : charged ? 'haunt' : 'body'; };
  function bump(S, A, B) {
    if (A.ghost === 1 || B.ghost === 1) return;
    const dx = B.x - A.x, dy = B.y - A.y, rr = A.r + B.r, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    let d = sqrt(d2), nx, ny;
    if (d < 1e-6) { nx = 1; ny = 0; d = 0; } else { nx = dx / d; ny = dy / d; }
    const ov = rr - d, tot = A.m + B.m;
    A.x -= nx * ov * B.m / tot; A.y -= ny * ov * B.m / tot;
    B.x += nx * ov * A.m / tot; B.y += ny * ov * A.m / tot;
    const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if (rv < 0) {
      const j = -2 * rv / (1 / A.m + 1 / B.m);
      A.vx -= j / A.m * nx; A.vy -= j / A.m * ny;
      B.vx += j / B.m * nx; B.vy += j / B.m * ny;
    }
    renorm(A); renorm(B);
    walls(S, A, true); walls(S, B, true);
    const x = A.x + nx * A.r, y = A.y + ny * A.r;
    if (S.bodyCd > 0) return;
    S.bodyCd = TK.body;
    let da = bodyDmg(S, A), db = bodyDmg(S, B);
    /* a slam that lands on a shield's face does half */
    if (guarded(B, -nx, -ny)) { da /= 2; block(S, B, A, x, y); }
    if (guarded(A, nx, ny)) { db /= 2; block(S, A, B, x, y); }
    const ka = A.def.w.kind === 'ghost' && A.ghost === 2, kb = B.def.w.kind === 'ghost' && B.ghost === 2;
    const heavy = b => b.def.w.kind === 'body' || (b.def.w.kind === 'comet' && b.mult > 1.3);
    const big = ka || kb || heavy(A) || heavy(B);
    emit(S, { k: 'bump', x, y, big: big ? 1 : 0 });
    hurt(S, A, B, da, slamKind(A, ka), x, y);
    hurt(S, B, A, db, slamKind(B, kb), x, y);
    for (const [b, o, charged] of [[A, B, ka], [B, A, kb]]) {
      const w = b.def.w;
      if (charged) {
        away(o, b, w.knock);
        b.ghost = 0; b.gT = ticks(w.solid); b.fade = Math.min(w.max, b.fade + w.grow);
      }
      if (w.kind === 'comet') {
        /* it spends its speed on the blow */
        away(o, b, .4 + (b.mult - 1));
        b.mult = 1 + (b.mult - 1) * .35;
      }
      if (w.kind === 'body') {
        b.r = Math.min(w.max, b.r + w.grow);
        b.m = (b.r / 30) * (b.r / 30);
        away(o, b, 1.2);
        emit(S, { k: 'grow', i: b.i, r: b.r });
      }
    }
  }

  /* ---- one step of 1/120 s ---- */
  function step(S) {
    if (S.over) return;
    S.tick++;
    const now = S.tick * T;
    if (now > SHRINK_AT) {
      const k = Math.min(1, (now - SHRINK_AT) / SHRINK_FOR);
      S.half = HALF0 + (SHRINK_TO - HALF0) * k;
    }
    const A = S.b[0], B = S.b[1];
    for (const b of S.b) { b.px = b.x; b.py = b.y; b.pwa = b.wa; b.pr = b.r; }
    think(S, A, B); think(S, B, A);
    move(S, A); move(S, B);
    arm(S, A); arm(S, B);
    shots(S);
    bombs(S);
    if (A.fl) flames(S, A, B);
    if (B.fl) flames(S, B, A);
    clash(S, A, B);
    strike(S, A, B); strike(S, B, A);
    bump(S, A, B);
    if (now > POISON_AT) {
      if (!S.poison) { S.poison = true; emit(S, { k: 'poison' }); }
      A.hp -= POISON * T; B.hp -= POISON * T;
    }
    if (S.clashCd > 0) S.clashCd--;
    if (S.bodyCd > 0) S.bodyCd--;
    for (const b of S.b) for (let g = 0; g < 4; g++) if (b.cd[g] > 0) b.cd[g]--;
    const da = A.hp <= 0, db = B.hp <= 0;
    if (da || db || now >= LIMIT) {
      S.over = true;
      if (da && db) S.winner = 2;
      else if (da) S.winner = 1;
      else if (db) S.winner = 0;
      else { const fa = A.hp / A.max, fb = B.hp / B.max; S.winner = fa > fb ? 0 : fb > fa ? 1 : 2; }
      const L = S.winner === 2 ? null : S.b[1 - S.winner];
      emit(S, { k: 'ko', on: L ? L.i : -1, x: L ? L.x : 0, y: L ? L.y : 0 });
    }
  }

  /* A whole fight, start to finish, for the computer player and the tools.
     stop(S) may end it early (a look far enough ahead to judge by). */
  function run(o, maxTicks, stop) {
    const S = create(Object.assign({ quiet: true }, o));
    const lim = maxTicks || ticks(LIMIT) + 1;
    while (!S.over && S.tick < lim) { step(S); if (stop && stop(S)) break; }
    return S;
  }
  /* what both screens compare after a round, to be sure they saw the same
     fight: the last step, where each ball ended up, and what it had left */
  function hash(S) {
    let h = 2166136261 >>> 0;
    const mix = v => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
    mix(S.tick); mix(S.winner);
    for (const b of S.b) { mix(Math.round(b.x * 64)); mix(Math.round(b.y * 64)); mix(Math.round(b.hp * 256)); mix(b.landed); }
    return h;
  }
  return { T, HALF0, SHRINK_AT, POISON_AT, LIMIT, SPEED, START, DMG, create, step, run, hash, ticks, BLADE, ORB, ARC, LANCE, TAIL, FLAIL, SAW,
           ARROW, STAR, NEEDLE, SPELL, RANG };
})();
