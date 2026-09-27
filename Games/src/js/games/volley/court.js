/* ============================================================================
   The court, the ball, and the maths of a touch.

   World units are a twentieth of a metre, the same along all three axes, so
   a player is 37 tall, like his sprite. x runs along the court (team 0 plays
   on the left, the net at NX), y across it (0 the far sideline, CD the near
   one), z up. The ball's z is its middle.

   The camera looks from the near side and a little from the right: depth
   is squashed (YS) and the far side leans over to the right (SH). Seen
   straight from the side, a net across the middle of the court is edge-on,
   a single line; leaned over, its face shows. volSX and volSY put a world
   point on the 480×300 picture.

   The ball only falls: no drag, so every arc is a parabola and where it
   will be is known exactly. Every touch is aimed the same way, by a place
   to arrive at and how long to take (volLaunch); volClearT finds how long
   a ball must take to pass the net at a given height.
   ========================================================================== */
const VOL = {
  CL: 320, CD: 160, NX: 160,     // the court's length and depth, and the net's place along it
  NET: 46, NETB: 26,             // the top of the tape, and the bottom edge of the net
  ANT: 18, POST: 9,              // the antennas above the tape; the posts outside the sidelines
  R: 3.5, G: 300,                // the ball's radius, and gravity on it
  PG: 460, JUMP: 150,            // gravity on a jumping player, and his take-off speed (apex 24)
  RUN: 118, ACC: 1000,           // a player's top speed, and how quickly he gets there
  FREE: 70,                      // how far past the lines anyone goes
  YS: .8, SH: .32,               // the view: depth squashed, and leaning
  OX: 80, OY: 140,               // the court's middle, left to right, and its far sideline, on the picture
  VW: 480, VH: 300, SCALE: 2     // the picture, drawn twice the size onto the 960×600 stage
};
const volSX = (x, y) => VOL.OX + x + VOL.SH * (VOL.CD / 2 - y);
const volSY = (y, z) => VOL.OY + y * VOL.YS - (z || 0);
const volClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const volRand = (a, b) => a + Math.random() * (b - a);
const volDist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
/* which side of the net a point is on: 0 the left, 1 the right */
const volSide = x => x < VOL.NX ? 0 : 1;
/* from x toward `to` (the way s points), but no more than `most` */
const volToward = (x, to, s, most) => (to - x) * s > most ? x + s * most : to;
/* inside the lines (the tape is part of the court: a ball touching it is in) */
const volIn = (x, y, m = 0) => x >= -m && x <= VOL.CL + m && y >= -m && y <= VOL.CD + m;

function volBall() {
  return {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, spinV: 0,
    held: null,            // in a server's hand, before it is struck
    team: -1, tc: 0,       // the side that touched it last, and how many times in a row
    last: null,            // who touched it last
    block: false,          // the last touch was a block (the blocker may play it again)
    down: false,           // it has hit the sand: the rally is over
    kind: '',              // what sent it on its way: serve, pass, set, spike, shot, block, dig
    id: 0,                 // every touch numbered, so a plan can tell the ball has been played since
    pace: 0                // how hard it was struck, for whoever has to take it
  };
}

/* ---- where it goes ---- */

/* where a free ball will be in t seconds */
function volAt(b, t) {
  return { x: b.x + b.vx * t, y: b.y + b.vy * t, z: b.z + b.vz * t - VOL.G * t * t / 2 };
}
/* how long until a free ball comes down through height h, or -1 if it
   never will (it is below and falling, or never climbs that high) */
function volDown(b, h) {
  const d = b.vz * b.vz - 2 * VOL.G * (h - b.z);
  if (d < 0) return -1;
  const t = (b.vz + Math.sqrt(d)) / VOL.G;
  return t >= 0 ? t : -1;
}
/* the highest it will get */
function volApex(b) { return b.vz > 0 ? b.z + b.vz * b.vz / (2 * VOL.G) : b.z; }
/* send it from where it is to arrive at (tx, ty, tz) in T seconds */
function volLaunch(b, tx, ty, tz, T) {
  b.vx = (tx - b.x) / T; b.vy = (ty - b.y) / T;
  b.vz = (tz - b.z + VOL.G * T * T / 2) / T;
  b.held = null;
}
/* How long a ball struck at (x0, z0), arriving at (x1, z1), must take to be
   at height H over the net. The height of the arc a fraction f of the way
   along is z0 + (z1 - z0)f + G·T²·f(1 - f)/2, so T comes straight out.
   0: a straight line already clears it; null: it never crosses. */
function volClearT(x0, z0, x1, z1, H) {
  const f = (VOL.NX - x0) / (x1 - x0);
  if (!(f > 0 && f < 1)) return null;
  const n = H - z0 - (z1 - z0) * f;
  return n > 0 ? Math.sqrt(2 * n / (VOL.G * f * (1 - f))) : 0;
}
/* the height the ball will be at when it crosses the net, or null */
function volNetZ(b) {
  if (!b.vx || (VOL.NX - b.x) / b.vx <= 0) return null;
  const t = (VOL.NX - b.x) / b.vx;
  return { t, y: b.y + b.vy * t, z: b.z + b.vz * t - VOL.G * t * t / 2 };
}
/* where it will come down on the sand, and when */
function volLanding(b) {
  const t = volDown(b, VOL.R);
  if (t < 0) return { x: b.x, y: b.y, t: 0 };
  return { x: b.x + b.vx * t, y: b.y + b.vy * t, t };
}

/* ---- one step of a free ball ----
   Returns what happened, for the rally to rule on:
     { net }      it went into the mesh and drops back
     { tape }     it clipped the top and carried on over, or fell back
     { under }    it crossed under the net (a fault)
     { wide }     it crossed outside the antennas (a fault)
     { land, in } it came down on the sand, in or out */
function volBallStep(b, dt) {
  const { NX, NET, NETB, R, G, CD } = VOL;
  b.spin += b.spinV * dt;
  if (b.held) return null;
  const px = b.x, py = b.y, pz = b.z;
  if (b.down) {
    /* in the sand: it sinks its speed into it and stops */
    const k = Math.exp(-7 * dt);
    b.vx *= k; b.vy *= k; b.spinV *= k;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.z > R || b.vz > 0) { b.vz -= G * dt; b.z += b.vz * dt; if (b.z < R) { b.z = R; b.vz = 0; } }
    return null;
  }
  b.vz -= G * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  let ev = null;
  /* the net, where the ball's path crosses its plane this step */
  if ((px - NX) * (b.x - NX) < 0 || (px !== NX && b.x === NX)) {
    const f = (NX - px) / (b.x - px), cy = py + (b.y - py) * f, cz = pz + (b.z - pz) * f, s = Math.sign(b.x - px);
    if (cy < 0 || cy > CD) ev = { wide: true, y: cy, z: cz };
    else if (cz - R > NET) ev = null;                               // clean over
    else if (cz + R < NETB) ev = { under: true };
    else if (cz > NET - R * .45) {
      /* the tape: it carries on over, slowed and popped up, or falls back */
      if (Math.random() < .62) { b.vx *= .45; b.vy *= .6; b.vz = Math.max(b.vz, 0) * .4 + volRand(35, 70); ev = { tape: true, over: true }; }
      else { b.x = NX - s * (R + .6); b.vx = -b.vx * .2; b.vy *= .5; b.vz = Math.abs(b.vz) * .2 + 25; ev = { tape: true, over: false }; }
    } else {
      /* the mesh gives, takes the pace off it and drops it on the side it came from */
      b.x = NX - s * (R + .6); b.vx = -b.vx * .12; b.vy *= .45; b.vz = Math.min(b.vz, 0) * .3;
      ev = { net: true };
    }
  }
  /* the sand */
  if (b.z <= R && b.vz < 0) {
    const pace = Math.hypot(b.vx, b.vy, b.vz);
    b.z = R; b.down = true;
    b.vz = -b.vz * .16; b.vx *= .3; b.vy *= .3; b.spinV *= .3;
    return { land: true, in: volIn(b.x, b.y, R * .8), x: b.x, y: b.y, pace };
  }
  return ev;
}
