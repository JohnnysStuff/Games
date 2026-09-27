/* The pitch, the ball, and the maths of a kick.

   World units are art pixels. x runs along the pitch (goal lines at 0 and
   PL), y across it (touchlines at 0 and PD, larger y nearer the camera), z
   up. The ball's z is the bottom of the ball. Team 0 defends x = 0.

   The arena is walled, like an indoor five-a-side cage: the ball comes
   back off the boards instead of going out, so the only thing that stops
   play is a goal. Its size goes with the teams (socArena). */
const SOC = {
  PL: 480, PD: 224, MX: 80, MY: 64,
  POST: 48,          // half the goal mouth: posts at PD/2 ± POST
  BAR: 30,           // crossbar height
  NET: 32,           // depth of the net behind the line
  G: 420,            // gravity, px/s²
  ROLL_K: .9, ROLL_C: 26,   // rolling: dv/dt = -k·v - c
  AIR_K: .12,
  RUN: 76, DRIB: 68, GK_RUN: 72, SHUFFLE: 44,
  BOXD: 54, BOXH: 70,       // the keeper's area: its depth from the goal line, and half its height
  WALL_E: .72, CUT: 16,     // what the boards give back, and how much each corner is cut off
  STAND: .6,                // 1v1: how far out along the ball's line to goal a lone defender stands
  VW: 480, VH: 300, SCALE: 2   // the view: 480×300 world pixels, drawn 2× onto the 960×600 stage
};
/* The arena for each size of side, 1v1 to 3v3: longer as the teams grow,
   always the same depth, so the whole width is on screen at once. A 1v1
   arena fits the view with both goals in it, so its camera never moves; the
   bigger ones pan a little to keep the nearer goal in shot. */
const SOC_ARENAS = {
  1: { PL: 384, PD: 224, BOXD: 46, BOXH: 64, GCUT: 42 },
  2: { PL: 448, PD: 224, BOXD: 52, BOXH: 68, GCUT: 0 },
  3: { PL: 528, PD: 224, BOXD: 56, BOXH: 72, GCUT: 0 }
};
/* GCUT: rows of net lifted out of the middle of the goal art (it repeats
   every 21), for a smaller goal where nobody keeps it; the mouth shrinks
   by as much, so the posts come in by half of it each side */
function socArena(n) {
  Object.assign(SOC, SOC_ARENAS[n] || SOC_ARENAS[2]);
  SOC.POST = 48 - SOC.GCUT / 2;
}

const socDist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const socClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const socRand = (a, b) => a + Math.random() * (b - a);

/* The speed a rolling ball must start at to cover d and still be moving at
   `arrive` when it gets there. Solved by bisection on the closed form of
   dv/dt = -k·v - c. */
function socGroundSpeed(d, arrive = 60) {
  const k = SOC.ROLL_K, c = SOC.ROLL_C, q = c / k;
  const dist = v0 => ((v0 - arrive) - q * Math.log((v0 + q) / (arrive + q))) / k;
  let lo = arrive, hi = 900;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (dist(m) < d) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/* A lofted ball, struck from height z0, that arrives at height h at
   distance d after T s: horizontal speed corrected for air drag, and the
   upward speed. */
function socLoft(d, T, h = 0, z0 = 0) {
  const k = SOC.AIR_K;
  return { v: d * k / (1 - Math.exp(-k * T)), vz: (h - z0 + SOC.G * T * T / 2) / T };
}

function socBall() {
  return { x: SOC.PL / 2, y: SOC.PD / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, target: null, roll: 0, inNet: 0, hidden: false, shot: 0, kickT: 0, bounced: 0 };
}

/* One step of a free ball. Returns an event for the match to act on:
   { goal: side } | { post } | { wall } | null. `side` is the goal the ball
   went into: -1 left (team 0's), 1 right (team 1's). */
function socBallStep(b, dt, sound) {
  const { PL, PD, POST, BAR, NET, G } = SOC, mid = PD / 2;
  b.kickT += dt;
  if (b.owner) return null;
  const px = b.x, py = b.y;
  const airborne = b.z > 0 || b.vz > 0;
  if (airborne) {
    b.vz -= G * dt;
    const f = Math.exp(-SOC.AIR_K * dt); b.vx *= f; b.vy *= f;
  } else {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0) {
      const ns = Math.max(0, sp * Math.exp(-SOC.ROLL_K * dt) - SOC.ROLL_C * dt);
      b.vx *= ns / sp; b.vy *= ns / sp;
    }
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.z <= 0 && b.vz < 0) {
    b.z = 0;
    /* a steep landing kills more of the pace than a skim does */
    if (b.vz < -40) { const keep = .86 - Math.min(.3, -b.vz / 700); b.vz = -b.vz * .48; b.vx *= keep; b.vy *= keep; b.bounced++; sound('bounce', Math.min(1, b.vz / 150)); }
    else b.vz = 0;
  }
  b.roll += Math.hypot(b.x - px, b.y - py);

  /* Already in a net: the net holds it, soaks up its pace and lets it drop.
     Kept low and inside the frame, so it is never drawn up over the
     crossbar or outside the goal's own art. */
  if (b.inNet) {
    const gx = b.inNet < 0 ? 0 : PL, back = gx + b.inNet * (NET - 6);
    const soak = Math.exp(-5 * dt); b.vx *= soak; b.vy *= soak;
    if (b.inNet < 0 ? b.x < back : b.x > back) { b.x = back; b.vx = -b.vx * .15; b.vy *= .5; }
    if (b.inNet < 0 ? b.x > gx - 2 : b.x < gx + 2) { b.x = gx + b.inNet * 2; b.vx = 0; }
    if (b.y < mid - POST + 5) { b.y = mid - POST + 5; b.vy = Math.abs(b.vy) * .3; }
    if (b.y > mid + POST - 5) { b.y = mid + POST - 5; b.vy = -Math.abs(b.vy) * .3; }
    if (b.z > 10) { b.z += (10 - b.z) * (1 - Math.exp(-30 * dt)); b.vz = Math.min(0, b.vz) * .2; }
    return null;
  }

  /* crossing a goal line this step */
  for (const side of [-1, 1]) {
    const gx = side < 0 ? 0 : PL;
    const crossed = side < 0 ? (px >= gx && b.x < gx) : (px <= gx && b.x > gx);
    if (!crossed) continue;
    const t = (gx - px) / (b.x - px || 1e-6), cy = py + (b.y - py) * t;
    const off = Math.abs(cy - mid);
    /* the posts are 3 px round: hitting one sends the ball back out */
    if (Math.abs(off - POST) < 3.5 && b.z < BAR + 2) {
      b.x = gx - side * 1; b.vx = -b.vx * .55; b.vy += (cy < mid ? -1 : 1) * (off > POST ? 40 : -40) * .5;
      sound('post'); b.shot = 0; return { post: true };
    }
    /* the bar: a ball just at its height clips it and drops */
    if (off < POST && b.z >= BAR - 3 && b.z < BAR + 4) {
      b.x = gx - side * 1; b.vx = -b.vx * .4; b.vz = -Math.abs(b.vz) * .3 - 30;
      sound('post'); b.shot = 0; return { post: true };
    }
    if (off < POST - 2 && b.z < BAR - 3) {
      b.inNet = side; b.shot = 0;
      sound('net');
      return { goal: side };
    }
    /* wide of the posts, or over the bar: the boards (and the netting
       above the goal) send it back */
    b.x = gx - side * .5;
    socWallHit(b, 'x', sound);
    return { wall: true };
  }
  /* the side boards */
  if (b.y < 2) { b.y = 2; if (b.vy < 0) socWallHit(b, 'y', sound); }
  else if (b.y > PD - 2) { b.y = PD - 2; if (b.vy > 0) socWallHit(b, 'y', sound); }
  /* The goal's frame either side of the mouth is solid: its art stands a
     few pixels out onto the pitch, and a ball that rolled along the boards
     into it used to sit drawn on top of the net. */
  const off = Math.abs(b.y - mid), GH = 60 - SOC.GCUT / 2;
  if (off > POST + 1 && off < GH) {
    if (b.x < 8) { b.x = 8; if (b.vx < 0) socWallHit(b, 'x', sound); }
    else if (b.x > PL - 8) { b.x = PL - 8; if (b.vx > 0) socWallHit(b, 'x', sound); }
  }
  /* The corners are cut off at 45°, so a ball can never sit wedged in one
     with players crowding it: whatever runs into a corner comes back out. */
  const C = SOC.CUT;
  for (const [cx, cy] of [[0, 0], [PL, 0], [0, PD], [PL, PD]]) {
    const sx = cx ? -1 : 1, sy = cy ? -1 : 1;              // the inward normal is (sx, sy)/√2
    const inX = (b.x - cx) * sx, inY = (b.y - cy) * sy;
    if (inX + inY >= C || inX > C || inY > C) continue;
    const pen = (C - inX - inY) / 2;
    b.x += sx * pen; b.y += sy * pen;
    const vn = (b.vx * sx + b.vy * sy) / 2;
    if (vn < 0) {
      b.vx -= (1 + SOC.WALL_E) * vn * sx; b.vy -= (1 + SOC.WALL_E) * vn * sy;
      sound('board', Math.min(1, -vn / 120));
    }
  }
  return null;
}
/* the ball off a board: back the way it came along `axis`, a little slower,
   and a little slower along the board too (the boards are not ice) */
function socWallHit(b, axis, sound) {
  const v = axis === 'x' ? b.vx : b.vy;
  if (axis === 'x') { b.vx = -b.vx * SOC.WALL_E; b.vy *= .9; }
  else { b.vy = -b.vy * SOC.WALL_E; b.vx *= .9; }
  b.shot = 0; b.target = null;
  if (Math.abs(v) > 30) sound('board', Math.min(1, Math.abs(v) / 260));
}

/* where the ball will be in t seconds if nobody touches it (drag and
   rolling friction, bounces ignored): for interceptions and keepers */
function socBallAt(b, t) {
  if (b.owner) return { x: b.x, y: b.y, z: b.z };
  const airborne = b.z > 0 || b.vz > 0;
  const k = airborne ? SOC.AIR_K : SOC.ROLL_K;
  let s = (1 - Math.exp(-k * t)) / k;
  if (!airborne) {
    const sp = Math.hypot(b.vx, b.vy); if (sp < 1) return { x: b.x, y: b.y, z: 0 };
    /* the rolling ball stops when -k·v - c brings it to 0 */
    const q = SOC.ROLL_C / SOC.ROLL_K, tStop = Math.log((sp + q) / q) / SOC.ROLL_K, tt = Math.min(t, tStop);
    const dist = ((sp + q) * (1 - Math.exp(-SOC.ROLL_K * tt)) / SOC.ROLL_K) - q * tt;
    return { x: b.x + b.vx / sp * dist, y: b.y + b.vy / sp * dist, z: 0 };
  }
  const z = Math.max(0, b.z + b.vz * t - SOC.G * t * t / 2);
  return { x: b.x + b.vx * s, y: b.y + b.vy * s, z };
}

/* launch the ball from player p toward (tx, ty):
   kind 'ground' (arrive at speed `arrive`), 'loft' (flight time T, arrive
   at height h) or 'drive' (speed v, lift vz) */
function socKick(b, p, tx, ty, o) {
  /* nothing is ever aimed off the pitch except a shot */
  if (!o.shot) { tx = socClamp(tx, 10, SOC.PL - 10); ty = socClamp(ty, 10, SOC.PD - 10); }
  const d = Math.max(1, socDist(b.x, b.y, tx, ty)), ux = (tx - b.x) / d, uy = (ty - b.y) / d;
  let v, vz;
  if (o.kind === 'ground') { v = socGroundSpeed(d, o.arrive ?? 60); vz = 0; }
  else if (o.kind === 'loft') { const L = socLoft(d, o.T, o.h || 0, Math.max(b.z, o.z || 0)); v = L.v; vz = L.vz; }
  else { v = o.v; vz = o.vz || 0; }
  b.owner = null; b.vx = ux * v; b.vy = uy * v; b.vz = vz; b.z = Math.max(b.z, o.z || 0);
  b.last = p; b.target = o.target || null; b.kickT = 0; b.shot = o.shot ? 1 : 0; b.bounced = 0;
  /* every kick numbered: online, whether the ball has been kicked again
     since a guest saw it is what decides whether their touch stands */
  b.kick = { kind: o.kind, from: [b.x, b.y], to: [tx, ty], by: p, id: b.kicks = (b.kicks || 0) + 1 };
}
