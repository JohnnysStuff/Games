/* ============================================================================
   CRATES — the ceremony a crate is opened with

   A game's front page sells crates (see FrontLocker); the shell opens them.
   api.buyCrate() spends the coins, draws the item out of Cos, and calls
   crateCeremony(), which holds the reveal over the stage: the case drops,
   the lid lifts on the rarity's light, the item rises out of it and its name
   comes up underneath. The case is real 3D where WebGL2 is available
   (makeChest3D) and a CSS-built box where it is not. Space or a click lands
   the animation, a second press (or Escape) closes it, and the page that
   asked hears about it through `after(res)`.
   ========================================================================== */
/* The swatch draws the thing the game draws. A pool set gets its three balls
   from Cos.ballSet, which is the same rule the table racks with, so the icon
   cannot say one thing and the felt another. Everything else is laid out in
   per cent inside a square, so nothing walks out of its own tile. */
function crateSwatch(it, size) {
  const s = size || 44;
  const st = 'width:' + s + 'px;height:' + s + 'px';
  const pair = (l, d) => '--l:' + l + ';--d:' + d;
  let kind, inner;
  if (it.slot === 'ball' && it.game === 'pool') {
    /* a three, an eleven and the cue ball: a solid, a stripe and the one you
       hit, which between them show everything a set changes */
    const B = Cos.ballSet(it.id), one = B.col(3), two = B.col(11);
    kind = 'set';
    inner = '<i class="bl s1" style="' + pair(Cos.lit(one), Cos.shade(one)) + '"></i>' +
            '<i class="bl s2" style="--l:' + two + ';--iv:#efe7d2"></i>' +
            '<i class="bl cue" style="' + pair(Cos.lit(B.cue), Cos.shade(B.cue)) +
            ';--p:' + (B.pip || 'transparent') + '"></i>';
  } else if (it.slot === 'ball') {
    kind = 'golf';
    inner = '<i class="bl" style="' + pair(Cos.lit(it.a), it.b) + '"></i>';
  } else if (it.slot === 'cue') {
    kind = 'cue'; inner = '<i class="st"></i>';
  } else if (it.slot === 'trail') {
    kind = it.s === 'none' ? 'none' : 'trail';
    inner = '<i class="rb"></i>' + (kind === 'none' ? '' : '<i class="hd"></i>');
  } else {
    kind = 'plate'; inner = '<i class="pl"></i>';
  }
  return '<i class="sw ' + kind + '" style="' + st + ';' + pair(it.a, it.b) + '">' + inner + '</i>';
}
/* ---- the case, as an object ----
   A hard transport case, the kind a scope travels in: a moulded shell with
   ribs standing off the faces, graphite bumpers down the four corners, a grab
   handle across the lid, two over-centre latches on the front and a padlock
   hung on the staple between them. Built and lit by the same renderer that
   draws the pool table and the golf course — one warm key light, and the
   rarity's colour pouring out of the lid as it lifts.

   It lives on its own canvas over the stage. A machine without WebGL gets the
   flat crate in the markup below instead, which is why this returns null
   rather than throwing when there is nothing to draw with.

   Geometry, in the renderer's axes (x right, y away, z up). The case is a
   clamshell 216 x 140 x 112, standing on the table at z = 0 and split at
   z = 76. The lid is modelled around its hinge, and where the pin goes is the
   whole of it: on the OUTER BACK corner of the seam, at y = 71, z = 77, so
   every part of the lid is at local z >= 0. Nothing of the lid can then sweep
   down through the tub as it opens, and the barrels sit across the join
   rather than hovering above it — which is the difference between a lid and a
   lid-shaped thing floating over a box, which is what this was. The two
   latches share a pin line, so they share a mesh; the padlock is drawn in a
   frame of its own, because it is the one part that leaves. */
function makeChest3D(host, rarHex) {
  let G = null;
  try { G = Gfx3D.get(); } catch (e) { G = null; }
  if (!G) return null;
  const K = Gfx3D.K, Geo = Gfx3D.Geo, M4 = Gfx3D.M4, Q = Gfx3D.Q, L = Gfx3D.lin;
  const VW = 470, VH = 430, dpr = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.className = 'chest-cv';
  cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  const c2 = cv.getContext('2d');
  host.append(cv);

  const S = G.scope();
  const RAR = L(rarHex || '#c9a24a');
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const dim = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  /* The shell is the case's own colour with the rarity stirred through it,
     not the rarity on its own: a flat purple box is a swatch, a purple-tinted
     polymer one is a case. The badge on the front carries the rarity neat. */
  const SHELL = mix(L('#c2681f'), RAR, .17), SHELL_D = dim(SHELL, .5);
  const GRAPH = L('#23262b'), GRAPH_L = L('#3a404a'), STEEL = L('#8e97a3');
  const FOAM = L('#15161a');
  /* What burns inside is a lamp with the rarity's colour in it, not the
     rarity's colour on its own: the common grey emitted by itself came out as
     a slab of white paint on the floor of the case rather than as light. */
  const IN = mix(RAR, L('#ffb066'), .34);

  const X = 104, Y = 66, W = 9, SP = 76;   // half width, half depth, wall, seam

  /* Nothing here shares a plane with anything else, and that is deliberate.
     Every part that sits on another sinks a few units into it, and no two
     sink by the same amount. Two faces at the same depth are a coin toss per
     pixel per frame, and with a camera that drifts the whole time that shows
     up as parts crawling through each other — which is what "glitching out"
     looked like. Overlap is invisible; touching is not. */

  /* ---- the tub: four walls and a floor, so it is hollow when it opens ---- */
  let g = Geo();
  g.box(-X, -Y, 0, -X + W, Y, SP, SHELL, 3);
  g.box(X - W, -Y, 0, X, Y, SP, SHELL, 3);
  g.box(-X + 5, -Y, 0, X - 5, -Y + W, SP, SHELL, 3);
  g.box(-X + 5, Y - W, 0, X - 5, Y, SP, SHELL, 3);
  g.box(-X + 5, -Y + 5, 0, X - 5, Y - 5, 12, SHELL_D, 0);
  /* The flange round the seam, which is what the lid closes down onto. It
     stops short of the wall tops so the two do not share the seam plane. */
  g.box(-X - 4, -Y - 4, 60, X + 4, -Y + 3, SP - 2, SHELL, 2);
  g.box(-X - 4, Y - 3, 60, X + 4, Y + 4, SP - 2, SHELL, 2);
  g.box(-X - 4, -Y - 4, 60, -X + 3, Y + 4, SP - 2, SHELL, 2);
  g.box(X - 3, -Y - 4, 60, X + 4, Y + 4, SP - 2, SHELL, 2);
  /* ribs standing off the long faces, and a pair on each end */
  for (const x of [-74, -44, 44, 74]) {
    g.box(x - 7, -Y - 3, 6, x + 7, -Y + 4, 58, SHELL, 1);
    g.box(x - 7, Y - 4, 6, x + 7, Y + 3, 58, SHELL, 1);
  }
  for (const y of [-28, 28]) {
    g.box(-X - 3, y - 9, 6, -X + 4, y + 9, 58, SHELL, 1);
    g.box(X - 4, y - 9, 6, X + 3, y + 9, 58, SHELL, 1);
  }
  const mTub = S.mesh(g);

  /* ---- what is bolted to the tub: bumpers, latch plates, the staple ---- */
  g = Geo();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    g.box(sx < 0 ? -X - 4 : X - 13, sy < 0 ? -Y - 4 : Y - 13, 1,
          sx < 0 ? -X + 13 : X + 4, sy < 0 ? -Y + 13 : Y + 4, 64, GRAPH, 3);
  }
  for (const x of [-52, 52]) g.box(x - 17, -Y - 5, 34, x + 17, -Y + 3, 62, GRAPH, 2);
  /* the staple: a bar on a web, with daylight round it for the shackle */
  g.box(-20, -Y - 4, 38, 20, -Y + 2, 68, GRAPH, 2);
  g.box(-4, -78, 58, 4, -Y - 2, 68, GRAPH, 1);
  g.box(-11, -78, 58, 11, -74, 64, GRAPH, 1);
  const mTubFit = S.mesh(g);

  /* ---- the floor it stands on ----
     Without one the case hung in a void, which is most of what "no shadows"
     means: there was no shadow because there was nothing to throw one onto.
     This is a fan whose colour falls to black, so the canvas still has no
     edge of its own and composites onto the stage the way it always did.

     It is an ellipse, not a circle. The camera looks along the ground at a
     shallow angle, so a circle out there projects to a wide flat ellipse: the
     fade finishes far off the sides of the canvas and gets cut square by it,
     and a hard-edged brown rectangle is worse than no floor at all. Stretched
     along the line of sight by 1/sin(pitch), it projects to a circle instead
     and the fade finishes inside the frame on every side. */
  g = Geo();
  {
    const R0 = 95, R1 = 178, SEG = 60, KF = 3.4, KN = .5;
    const FLOOR = L('#3d2b1c'), OFF = [0, 0, 0];
    const yw = Math.PI + .52, DX = Math.sin(yw), DY = -Math.cos(yw);
    const RX = -DY, RY = DX;
    /* and short on the near side, where there is barely a finger of canvas
       below the case before the frame runs out */
    const at = (r, a) => {
      const ca = Math.cos(a), sa = Math.sin(a), k = r * (sa >= 0 ? KF : KN);
      return [RX * ca * r + DX * sa * k, RY * ca * r + DY * sa * k];
    };
    const mid = g.v(0, 0, 0, 0, 0, 1, FLOOR, 0, 0);
    const inn = [], rim = [];
    for (let i = 0; i <= SEG; i++) {
      const a = i / SEG * Math.PI * 2;
      const p0 = at(R0, a), p1 = at(R1, a);
      inn.push(g.v(p0[0], p0[1], 0, 0, 0, 1, FLOOR, 0, 0));
      rim.push(g.v(p1[0], p1[1], 0, 0, 0, 1, OFF, 0, 0));
    }
    for (let i = 0; i < SEG; i++) {
      g.t(mid, inn[i], inn[i + 1]);
      g.q(inn[i], rim[i], rim[i + 1], inn[i + 1]);
    }
  }
  const mGround = S.mesh(g);

  /* the foam in the bottom, cut as a well — it is what the light pools in */
  g = Geo();
  g.box(-92, -54, 8, 92, 54, 24, FOAM, 0);
  g.box(-92, -54, 21, 92, -38, 42, FOAM, 4);
  g.box(-92, 38, 21, 92, 54, 42, FOAM, 4);
  g.box(-92, -54, 21, -74, 54, 42, FOAM, 4);
  g.box(74, -54, 21, 92, 54, 42, FOAM, 4);
  const mFoam = S.mesh(g);

  /* ---- the lid, modelled around its hinge at (0, 71, 77) ----
     The slab is a unit inside the skirts all round, so their outer faces
     never line up where the two overlap. */
  g = Geo();
  g.box(-107, -140, 25, 107, -2, 35, SHELL, 4);        // the top slab
  g.box(-108, -141, 0, 108, -130, 27, SHELL, 2);       // front skirt
  g.box(-108, -12, 0, 108, -1, 27, SHELL, 2);          // back skirt
  g.box(-108, -141, 0, -97, -1, 27, SHELL, 2);
  g.box(97, -141, 0, 108, -1, 27, SHELL, 2);
  for (const x of [-74, -44, 44, 74]) {
    g.box(x - 7, -144, 3, x + 7, -137, 24, SHELL, 1);
    g.box(x - 7, -5, 3, x + 7, 2, 24, SHELL, 1);
  }
  const mLid = S.mesh(g);

  g = Geo();
  /* the barrels, centred on the pin: they turn about their own axis, so they
     sit still across the join while everything else on the lid swings */
  for (const x of [-76, 0, 76]) g.sphere(x, 0, 0, 9, 14, 9, GRAPH, 1, 2.6);
  for (const x of [-52, 52]) g.box(x - 13, -146, 3, x + 13, -138, 15, GRAPH, 2);
  g.box(-40, -86, 31, -26, -58, 40, GRAPH, 3);         // handle posts
  g.box(26, -86, 31, 40, -58, 40, GRAPH, 3);
  g.box(-42, -84, 38, 42, -60, 48, GRAPH, 4);          // and the grip
  /* The liner. Open, the lid turns its whole underside to the camera, and
     bare shell there is 216 by 140 of flat colour filling the top of the
     frame — the case reads as a board leaning on a box. Dark foam with three
     ribs across it gives that surface something to be. */
  g.box(-92, -132, 16, 92, -10, 27, FOAM, 0);
  for (const y of [-108, -71, -34]) g.box(-88, y - 5, 12, 88, y + 5, 17.5, GRAPH_L, 2);
  const mLidFit = S.mesh(g);

  g = Geo(); g.box(-34, -145, 6, 34, -139, 21, RAR, 2);
  const mBadge = S.mesh(g);
  /* Open, the lid turns the badge away and the rarity has nothing on the case
     but the light inside. A line of it under the seam keeps the colour on the
     shell from the first frame to the last. */
  g = Geo();
  g.box(-92, -Y - 4.5, 61, 92, -Y - 1, 69, RAR, 1);
  const mTubBadge = S.mesh(g);

  /* ---- the latches: one pin line, so one mesh ----
     Pinned at (0, -73, 54), high enough up the plate that the lever only has
     to be long enough to cross the seam. A lever long enough to reach the
     keeper from the bottom of the plate swings out a hand's length in front
     of the case when it lets go, and reads as two legs rather than a catch. */
  g = Geo();
  for (const x of [-52, 52]) {
    g.box(x - 15, -7, -7, x + 15, 1, 3, GRAPH, 2);     // the knuckle
    g.box(x - 13, -6, 0, x + 13, -1, 32, GRAPH_L, 2);  // the lever
    g.box(x - 11, -5, 26, x + 11, 5, 34, GRAPH, 2);    // the hook over the keeper
  }
  const mLatch = S.mesh(g);

  /* ---- the padlock ----
     The shackle is a line of beads, because `torus` rings about z and this
     one has to stand in the x-z plane. They have to be crowded: at one radius
     of spacing the scallops between them read as a coil spring rather than a
     bar, so they go on at a third of that. */
  g = Geo();
  for (let i = 0; i <= 26; i++) {
    const a = -.3 + (Math.PI + .6) * i / 26;
    g.sphere(Math.cos(a) * 14, 0, Math.sin(a) * 14, 4.6, 10, 7, STEEL);
  }
  g.box(-16, -15, -38, 16, 1, -3, STEEL, 5);
  g.sphere(0, -15.5, -20, 4, 10, 7, GRAPH);
  const mLock = S.mesh(g);

  const mShell = G.mat({ kind: K.PLAIN, spec: .34, gloss: 26, wrap: .34 });
  /* It takes the shadow and does not throw one. Little wrap, because wrap
     is what softens a shadow away to nothing, and a contact ring under the
     footprint so the case is planted rather than hovering a finger above its
     own shadow. */
  const mFloor = G.mat({ kind: K.PLAIN, spec: .06, gloss: 8, wrap: .2, cast: false,
                         ao: [[0, 0, -1, 96]] });
  const mDark  = G.mat({ kind: K.PLAIN, spec: .22, gloss: 18, wrap: .44 });
  const mSteel = G.mat({ kind: K.METAL, spec: .62, gloss: 52, wrap: .3, c1: L('#8e97a3') });
  const mPaint = G.mat({ kind: K.PLAIN, spec: .5, gloss: 44, wrap: .3, emit: dim(RAR, .12) });
  /* the foam takes the rarity's light as the lid comes up */
  const mGlow  = G.mat({ kind: K.PLAIN, spec: .1, gloss: 8, wrap: .5, emit: [0, 0, 0] });

  const cam = Gfx3D.camera(VW, VH);
  const env = {
    sun: Gfx3D.norm([-.5, -.62, .85]), sunC: L('#ffe6c4', .98), sunSpec: .3,
    sky: L('#20242b', .18), gnd: L('#0a0806', .18), rim: L('#c2b39c', .16), fill: L('#ffd9a8', .08),
    /* nothing behind it: the case is composited straight onto the stage,
       so the canvas never shows as a rectangle of its own */
    fogC: [0, 0, 0], fog: [900, 2200], expo: .96, vig: 0, clear: [0, 0, 0, 0],
    /* wide enough that the shadow is still on the map while the case is up in
       the air — it slides in from the side as the thing comes down, which is
       most of what sells the drop */
    shadow: { x: 0, y: 0, z: 0, r: 330 },
    /* uGlowR is an origin and a size, not a centre and a half-size. Written
       as a centred rect this sat from (0,0) to (34,76)  14 a lamp buried in
       the back right corner of the case, throwing a lopsided orange wash up
       the outside of the shell behind the lid. It is the foam well. */
    glow: [[-74, -38, 148, 76]], glowC: [0, 0, 0]
  };

  const T = M4.make(), TL = M4.make(), TA = M4.make(), TK = M4.make(), TG = M4.make(), QI = Q.make();
  const out = t => 1 - Math.pow(1 - t, 3);
  const back = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  let t0 = performance.now(), raf = 0, dead = false;
  function frame() {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    draw((performance.now() - t0) / 1000);
  }

  function draw(t) {
    /* ---- the drop, and the knocks it settles through ----
       Two wrong ways round before this one. `back` carried the case a hand's
       depth THROUGH the floor on the way down and held it there for a fifth
       of a second, which reads as sinking rather than landing. Real gravity,
       t squared, then keeps it up near the ceiling for most of the fall and
       leaves the frame empty for a third of a second. It arrives on an ease
       out, which is fast where it should be fast, and it stops at the floor.
       Every hop after that is above it. */
    const fall = clamp01(t / .42);
    let dz = (1 - out(fall)) * 380;
    if (t > .42 && t < .88) {
      const k = (t - .42) / .46;
      dz += Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k) * 7;
    }
    /* and the flinch when the shackle lets go */
    if (t > .74 && t < .96) {
      const k = (t - .74) / .22;
      dz += Math.sin(k * Math.PI * 2) * (1 - k) * 3;
    }

    /* ---- the lock drops off the front and lands short of the case ---- */
    const lp = clamp01((t - .74) / .34), bo = clamp01((t - 1.08) / .30);
    const lockZ = 58 - 50 * lp * lp + Math.sin(bo * Math.PI) * 12 * (1 - bo);
    const lockY = -74 - 46 * out(lp);
    const lockX = -18 * out(lp);

    /* ---- the latches flip, then the lid goes over ---- */
    /* right over, so each lever ends hanging down the front rather than
       sticking out of it */
    const latch = back(clamp01((t - 1.02) / .22)) * 2.3;
    const open = clamp01((t - 1.10) / .68);
    /* Past upright and leaning away. Short of vertical the lid tips its
       underside toward the eye and blocks the case; too far and it is a plank
       lying on the floor behind. */
    const ang = back(open) * 1.72;
    const lit = clamp01((t - 1.12) / .5);

    /* The foam carries the colour and the lamp only lifts it. Turned up the
       other way round, the point light sitting a hand's breadth off the foam
       drove it past the top of the tone curve and the inside of a gold case
       came out the same cream as the inside of a green one. */
    env.glowC = [IN[0] * lit * .22, IN[1] * lit * .22, IN[2] * lit * .22];
    mGlow.emit = [IN[0] * lit * .62, IN[1] * lit * .62, IN[2] * lit * .62];

    /* Low and close, and level with it — not up on a ladder looking down into
       the box, which shows you what is inside before the thing has finished
       coming out of it and leaves you outside the moment rather than in it.
       The case sits a little below the middle of the frame: the item comes up
       through the air above it and the caption sits under the whole lot, so
       neither is ever printed across the shell. */
    const yaw = (Math.PI + .06) + out(clamp01(t / 1.5)) * .44 + Math.sin(t * .38) * .05;
    /* The target sits off the case's own centre because the turn is: at this
       yaw the open lid reaches further to one side than the other, and the
       eye moves with the target, so a target to the RIGHT of the case puts
       the case right of centre too. */
    cam.orbit(22, 0, 117, 625, .30, yaw);

    G.size(VW, VH);
    G.begin(cam, env, t);
    /* a hair below zero: the case stands ON z = 0, and a floor at the same
       height fights it along every edge where the two meet */
    G.draw(mGround, M4.quat(TG, QI, 1, 0, 0, -1.2), mFloor);
    const mt = M4.quat(T, QI, 1, 0, 0, dz);
    G.draw(mTub, mt, mShell);
    G.draw(mTubFit, mt, mDark);
    G.draw(mTubBadge, mt, mPaint);
    G.draw(mFoam, mt, mGlow);
    const ql = Q.make(); Q.turn(ql, 1, 0, 0, -ang);
    const ml = M4.quat(TL, ql, 1, 0, 71, 77 + dz);
    G.draw(mLid, ml, mShell);
    G.draw(mLidFit, ml, mDark);
    G.draw(mBadge, ml, mPaint);
    const qa = Q.make(); Q.turn(qa, 1, 0, 0, latch);
    G.draw(mLatch, M4.quat(TA, qa, 1, 0, -73, 54 + dz), mDark);
    /* it hangs with the case until it lets go, and falls on its own after */
    const qk = Q.make();
    Q.turn(qk, 1, 0, 0, -1.55 * lp * lp - .42 * out(bo));
    Q.turn(qk, 0, 0, 1, .55 * out(lp));
    G.draw(mLock, M4.quat(TK, qk, 1, lockX, lockY, lockZ + dz * (1 - lp)), mSteel);
    G.end();

    c2.clearRect(0, 0, cv.width, cv.height);
    c2.drawImage(G.canvas, 0, 0, cv.width, cv.height);
  }
  frame();

  return {
    skip() { t0 = Math.min(t0, performance.now() - 2400); },
    seek(s) { t0 = performance.now() - s * 1000; draw(s); },
    stop() { dead = true; cancelAnimationFrame(raf); try { S.dispose(); } catch (e) {} }
  };
}

/* The crate, opened properly: a box drops onto the table, rocks on its base,
   the seam lights up in the rarity's colour, the lid flings back on its hinge
   and the item rises out of it on a shaft of light.

   It is a real box — the lid hinges on its back edge in perspective, and the
   card comes up from behind the front panel, which is what sells the thing as
   opening rather than as two rectangles fading. The timing lives in CSS so the
   whole sequence can be jumped with one class; a click or a key does that. */
function crateCeremony(g, res, slot, host, after) {
  const it = res.item, R = Cos.RAR[it.r];
  const wrap = document.createElement('div');
  wrap.className = 'gm-box';
  wrap.style.setProperty('--rar', R.col);
  /* four sparks on their own drifts, so the light has something in it */
  const sparks = [-90, -34, 38, 86].map((dx, i) =>
    '<i class="bspark" style="--dx:' + dx + 'px;animation-delay:' + (1.15 + i * .22) + 's;left:' +
    (50 + dx / 9) + '%"></i>').join('');
  wrap.innerHTML =
    '<div class="gm-boxin">' +
      '<div class="scene3d">' +
        '<div class="crate-fall"><div class="crate3d">' +
          '<div class="cf back"></div>' +
          '<div class="cf left"></div>' +
          '<div class="cf right"></div>' +
          '<div class="cf bottom"></div>' +
          '<div class="cf inner"></div>' +
          '<div class="lid">' +
            '<div class="lf lback"></div>' +
            '<div class="lf lleft"></div>' +
            '<div class="lf lright"></div>' +
            '<div class="lf under"></div>' +
            '<div class="lf top"></div>' +
            '<div class="lf lfront"></div>' +
          '</div>' +
          '<div class="cf front"><span class="crate-label">' + Cos.crateName(slot.id, g.id) + '</span>' +
            '<i class="clasp"></i></div>' +
        '</div></div>' +
        '<div class="prize">' +
          '<div class="prize-rays"></div>' +
          '<div class="prize-glow"></div>' +
          sparks +
          '<div class="prize-item">' + crateSwatch(it, 88) + '</div>' +
        '</div>' +
      '</div>' +
      /* the caption lives under the chest, not over it: the box is close
         enough now that a name printed across the lid is a name printed
         across the lid */
      '<div class="prize-cap">' +
        '<span class="prize-rar">' + R.n + '</span>' +
        '<div class="prize-name">' + it.name + '</div>' +
        '<span class="prize-slot">' + Cos.slotName(it.slot, g.id) + (res.dupe ? ' · already yours' : '') + '</span>' +
        (res.dupe ? '<span class="prize-shards">+' + res.shards + ' shards</span>' : '') +
      '</div>' +
      '<button class="lg-act prim" id="gmDone">CONTINUE <kbd>space</kbd></button>' +
    '</div>';
  host.append(wrap);
  /* the real thing if the machine can draw it, the flat one if it cannot */
  const chest = makeChest3D(wrap.querySelector('.scene3d'), R.col);
  if (chest) wrap.classList.add('lit');
  const done = el('gmDone');
  /* the noises, on the beats the CSS keeps */
  const beats = [
    [520, () => Sound.thud()],
    [770, () => Sound.blip()],
    [1040, () => Sound.thud()],
    [1320, () => (res.dupe ? Sound.blip() : Sound.coin())]
  ];
  const timers = beats.map(([ms, fn]) => setTimeout(() => { try { fn(); } catch (e) {} }, ms));
  const skip = () => {
    if (wrap.classList.contains('skip')) return false;
    wrap.classList.add('skip');
    if (chest) chest.skip();
    timers.forEach(clearTimeout);
    try { res.dupe ? Sound.blip() : Sound.coin(); } catch (e) {}
    return true;
  };
  const shut = () => {
    timers.forEach(clearTimeout);
    if (chest) chest.stop();
    wrap.remove(); removeEventListener('keydown', k, true);
    try { after(res); } catch (e) {}
  };
  const k = e => {
    if (!wrap.isConnected) { removeEventListener('keydown', k, true); return; }
    if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'Escape') return;
    /* the crate has these keys: nothing underneath it hears them */
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape') { shut(); return; }
    if (!skip()) shut();                     // opened already: the second press closes it
  };
  addEventListener('keydown', k, true);
  /* anywhere but the button lands the animation; the button is the way out */
  wrap.onclick = e => { if (!e.target.closest('#gmDone')) skip(); };
  done.onclick = shut;
}
