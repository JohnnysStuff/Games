/* ============================================================================
   BALL BRAWL — the picture

   Two passes of the shared renderer (Gfx3D) a frame. The arena pass is the
   box, the balls, their weapons and everything flying about, seen from a
   camera that glides between poses (the menu's slow turn, the fight, a push
   in on a knockout). The preview pass draws balls on their own, lit like a
   studio shot, wherever the screen's cards and panels want one: each is put
   on the ground plane under its spot on the screen, so a ball can sit in a
   card and follow it as it lifts, flips and flies. The screen draws its
   panels first, then the previews over them, then its words.

   The fight's numbers are the sim's; the view only mirrors them (each
   player sees their own ball on the left, so the guest's picture is the
   sim's flipped left to right), rolls the balls, turns their faces the way
   they are going, and makes the sparks.
   ========================================================================== */
function bbView() {
  const R3 = (() => { try { return Gfx3D.get(); } catch (e) { return null; } })();
  if (!R3) return null;
  const { M4, Q, K, FX } = Gfx3D, L = Gfx3D.lin;
  const SC = R3.scope();
  const W = 960, H = 600;
  const T = M4.make(), T2 = M4.make(), T3 = M4.make(), ID = M4.make();
  const TEAM = ['#39c8ff', '#ff4d6d'];
  const TEAM3 = TEAM.map(h => Gfx3D.srgb(h));
  const NOROLL = BBModels.NOROLL;

  /* ---- meshes ---- */
  const AG = BBModels.arenaGeo(BBSim.HALF0);
  const M = {};
  for (const k in AG) M[k] = SC.mesh(AG[k]);
  const ARW = BBModels.arrowGeo();
  M.arrowP = SC.mesh(ARW.plain); M.arrowM = SC.mesh(ARW.metal);
  M.bomb = SC.mesh(BBModels.bombGeo());
  const STR = BBModels.starGeo();
  M.starM = SC.mesh(STR.metal); M.starP = SC.mesh(STR.plain);
  M.needle = SC.mesh(BBModels.needleGeo());
  const segG = Gfx3D.Geo(); segG.sphere(0, 0, 0, 1, 18, 12, [1, 1, 1]);
  M.seg = SC.mesh(segG);
  /* each ball's body, face and weapon at the size it starts, made when
     first wanted. A weapon's layers are keyed by the material each is drawn
     in; its parts (the flail's head, the saw's blade) likewise. */
  const layers = o => { const m = {}; for (const k in o) if (o[k] && o[k].n) m[k] = SC.mesh(o[k]); return m; };
  const BM = {};
  function kit(id) {
    if (BM[id]) return BM[id];
    const def = BB_BY[id], bp = BBModels.ballParts(def), w = BBModels.weapon(def, BBModels.start(def)), face = BBModels.faceGeo(def);
    const parts = {};
    for (const k in w.parts) parts[k] = layers(w.parts[k]);
    return (BM[id] = {
      ball: SC.mesh(bp.plain), ballMetal: bp.metal ? SC.mesh(bp.metal) : null, metalC: bp.metalC, ballGlow: bp.glow ? SC.mesh(bp.glow) : null,
      face: face ? SC.mesh(face) : null,
      rig: layers({ metal: w.metal, plain: w.plain, glow: w.glow, iron: w.iron, brass: w.brass }), parts
    });
  }
  /* the two fighters' weapons, rebuilt when a hit makes them grow */
  const live = [0, 1].map(() => ({ key: '', rig: {}, dyn: {} }));
  function liveKit(i, b) {
    const L2 = live[i], key = b.id + ':' + BBModels.shapeKey(b.def, b);
    if (L2.key !== key) {
      const w = BBModels.weapon(b.def, { len: b.len, hw: b.hw, sr: b.sr });
      L2.rig = {};
      for (const k of ['metal', 'plain', 'glow', 'iron', 'brass']) {
        if (!w[k].n) continue;
        const d = L2.dyn[k] || (L2.dyn[k] = SC.dyn());
        d.set(w[k]); L2.rig[k] = d;
      }
      L2.key = key;
    }
    return L2.rig;
  }
  const trails = [SC.dyn(), SC.dyn(), SC.dyn(), SC.dyn()];
  const tails = [SC.dyn(), SC.dyn()];
  const bolts = [0, 1, 2, 3, 4, 5, 6, 7].map(() => SC.dyn());
  const aimM = { beam: SC.dyn(), chev: SC.dyn(), path: SC.dyn(), bounce: SC.dyn(), laser: [SC.dyn(), SC.dyn()] };
  M.aimHead = SC.mesh(BBModels.aimHeadGeo());

  /* ---- materials ---- */
  const plain = R3.mat({ kind: K.PLAIN, spec: .35, gloss: 40, wrap: .3 });
  const floorM = R3.mat({ kind: K.PLAIN, spec: .38, gloss: 70, wrap: .25 });
  const darkM = R3.mat({ kind: K.PLAIN, spec: 0, wrap: .2, cast: false });
  const platM = R3.mat({ kind: K.PLAIN, spec: .12, gloss: 30, wrap: .3, cast: false });
  const edgeM = R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [1.5, .15, 0, 0], cast: false });
  const marksM = R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [1.05, .12, 0, 0], cast: false });
  const railM = R3.mat({ kind: K.PLAIN, spec: .8, gloss: 110, wrap: .3 });
  /* the polished metals, each in its own colour: the shader's metal ignores
     a mesh's own colours, so a colour is a material */
  const metals = {};
  const metalOf = k => metals[k] || (metals[k] = R3.mat({ kind: K.METAL, c1: L(BBModels.METALS[k] || k), spec: 1.1, gloss: 140, wrap: .2 }));
  const metalM = metalOf('steel');
  const trimM = R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [2.4, 0, 0, 0], cast: false });
  const capM = [R3.mat({ kind: K.GLOW, tint: L(BBModels.TEAM_A), p1: [2.6, .3, 0, 0], cast: false }),
                R3.mat({ kind: K.GLOW, tint: L(BBModels.TEAM_B), p1: [2.6, .3, 0, 0], cast: false })];
  const headM = R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [1.8, .25, 0, 0], cast: false });
  /* a material per fighter, because each carries its own flash and fade */
  const ballMats = [0, 1, 2, 3].map(() => R3.mat({ kind: K.PLAIN, spec: .95, gloss: 120, wrap: .3 }));
  const ghostMats = [0, 1].map(() => R3.mat({ kind: K.PLAIN, spec: .9, gloss: 90, wrap: .5, alpha: .7, cast: false }));
  const faceMats = [0, 1].map(() => R3.mat({ kind: K.PLAIN, spec: 1, gloss: 160, wrap: .3 }));
  const glowMats = [0, 1].map(() => R3.mat({ kind: K.GLOW, spec: .8, gloss: 90, p1: [.8, .25, 0, 0], alpha: .9 }));
  const bodyGlow = [0, 1].map(() => R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [1, .35, 0, 0] }));
  const segMats = [R3.mat({ kind: K.PLAIN, tint: L('#8bd83a'), spec: .7, gloss: 80 }), R3.mat({ kind: K.PLAIN, tint: L('#ffe066'), spec: .7, gloss: 80 })];
  /* what flies and lights itself: a spell, a laser's charge */
  const spellM = R3.mat({ kind: K.GLOW, tint: L('#ffae14'), p1: [1.1, .4, 0, 0], cast: false });
  const chargeM = R3.mat({ kind: K.GLOW, tint: L('#bffcff'), p1: [2.2, .5, 0, 0], cast: false });
  /* unlit overlays come from pools: a queued draw keeps its material, so
     each one on screen at once needs its own */
  function pool(o) { const L2 = []; let n = 0; return { reset() { n = 0; }, get() { return L2[n] || (L2[n] = R3.fxMat(o)), L2[n++]; } }; }
  const ringP = pool({ fx: FX.RING }), blobP = pool({ fx: FX.BLOB, add: true }), shadeP = pool({ fx: FX.BLOB }),
        solidP = pool({ fx: FX.SOLID }), trailP = pool({ fx: FX.TRAIL, add: true }), dashP = pool({ fx: FX.DASH, add: true }),
        arrowP = pool({ fx: FX.ARROW, add: true }), chevP = pool({ fx: FX.CHEVRON, add: true });
  const pools = [ringP, blobP, shadeP, solidP, trailP, dashP, arrowP, chevP];

  /* ---- light ---- */
  const SUN = Gfx3D.norm([-.42, .38, .82]);
  const env = {
    sun: SUN, sunC: L('#fff1dc', 1.2), sunSpec: 1,
    sky: L('#aab9ff', .4), gnd: L('#3a2e52', .28), rim: L('#86a8ff', .45), fill: L('#ffffff', .05),
    fogC: L('#0b0e1d'), fog: [1500, 3800], expo: 1, vig: .3,
    clear: Gfx3D.srgb('#0b0e1d'), shadow: { x: 0, y: 0, z: 0, r: 290 },
    lamps: [{ p: [-300, 40, 170], c: L(TEAM[0], 1.2) }, { p: [300, 40, 170], c: L(TEAM[1], 1.2) }, { p: [0, 160, 460], c: L('#e8ecff', .55) }],
    lampK: 1.6e-5
  };
  const penv = {
    sun: Gfx3D.norm([-.5, .55, .66]), sunC: L('#ffffff', 1.25), sunSpec: 1,
    sky: L('#c9d4ff', .55), gnd: L('#40385a', .35), rim: L('#bcd0ff', .9), fill: L('#ffffff', .08),
    fogC: [0, 0, 0], fog: [1e6, 2e6], expo: 1, vig: 0, clear: [0, 0, 0, 0]
  };
  const PS = Gfx3D.particles(1600);

  /* ---- cameras ----
     A pose is where the arena camera wants to be; the camera itself eases
     toward it on the render clock, so a change of screen is a glide. */
  const cam = Gfx3D.camera(W, H);
  cam.fov = .5; cam.near = 30; cam.far = 9000;
  const pcam = Gfx3D.camera(W, H);
  pcam.fov = .24; pcam.near = 100; pcam.far = 20000;
  pcam.orbit(0, 0, 0, 5000, .6, 0);
  const box = BBSim.HALF0 + BBModels.WALL + 4;
  const fitPts = [[-box, -box, 0], [box, -box, 0], [box, box, 0], [-box, box, 0], [-box, -box, 30], [box, -box, 30]];
  function poseOf(rect, pitch, yaw, shift) {
    const c = Gfx3D.camera(W, H);
    c.fov = cam.fov; c.shift = shift || null;
    c.fit(fitPts, rect, pitch, yaw || 0);
    return { x: c.tgt[0], y: c.tgt[1], dist: c.dist, pitch, yaw: yaw || 0, sx: shift ? shift[0] : 0, sy: shift ? shift[1] : 0 };
  }
  const POSES = {
    fight: poseOf([250, 88, 710, 588], 1.02),
    pick:  poseOf([230, 120, 730, 600], 1.12),
    menu:  poseOf([500, 70, 930, 560], .86, 0),
    high:  poseOf([300, 150, 660, 470], 1.32),
    wide:  poseOf([180, 60, 780, 590], .98)
  };
  const C = Object.assign({}, POSES.menu), goal = { p: POSES.menu, rate: 3 };
  let shakeA = 0, punchA = 0, focus = null, yawSway = 0;

  /* the sim's x on screen: each player sees their own ball on the left */
  let MX = 1;
  const wx = x => x * MX;

  /* ---- per-fighter render state: rolling, the way it faces, flashes,
     knockouts, the path behind it ---- */
  const look = [0, 1].map(i => ({ q: Q.make(), flash: 0, heal: 0, ko: 0, gone: false, bob: Math.random() * 6, lastWa: 0, spinV: 0, tip: [], face: 0,
                                   yaw: i ? Math.PI : 0, saw: 0, hist: [] }));

  /* ---- effects that live in the arena for a moment ---- */
  const rings = [], flashes = [], beams = [], zaps = [];
  function ring(x, y, col, r0, r1, life, w) { rings.push({ x, y, col: Gfx3D.srgb(col), r0, r1, t: 0, life, w: w || .18 }); }
  function burst(o) { PS.burst(o); }

  const V = {
    ok: true, cam, pcam, TEAM,
    set mirror(m) { MX = m; }, get mirror() { return MX; },
    /* glide to a pose ('fight', 'pick', 'menu', 'high', 'wide'), or cut to it */
    pose(name, rate) { goal.p = POSES[name] || POSES.fight; goal.rate = rate || 3; },
    cut(name) { Object.assign(C, POSES[name] || POSES.fight); goal.p = POSES[name] || POSES.fight; },
    shake(a) { shakeA = Math.min(14, shakeA + a); },
    punch(a) { punchA = Math.min(.06, punchA + a); },
    focusOn(x, y, k) { focus = k > 0 ? { x, y, k } : null; },
    look,
    reset() {
      PS.clear(); rings.length = 0; flashes.length = 0; beams.length = 0; zaps.length = 0; focus = null; shakeA = 0; punchA = 0;
      for (const l of look) { l.flash = 0; l.heal = 0; l.ko = 0; l.gone = false; l.q[0] = 0; l.q[1] = 0; l.q[2] = 0; l.q[3] = 1; l.hist.length = 0; }
      look[0].yaw = 0; look[1].yaw = Math.PI;
    },
    /* where a spot in the fight is on the screen, and back */
    toScreen(x, y, z) { return cam.toScreen(wx(x), y, z || 0); },
    toSim(sx, sy) { const g = cam.toGround(sx, sy, 30); return { x: g.x * MX, y: g.y }; },

    /* ---- once a frame, before anything is drawn ---- */
    frame(dt, t) {
      const g = goal.p, k = 1 - Math.exp(-goal.rate * dt);
      for (const f of ['x', 'y', 'dist', 'pitch', 'yaw', 'sx', 'sy']) C[f] += (g[f] - C[f]) * k;
      shakeA *= Math.exp(-dt * 9); if (shakeA < .05) shakeA = 0;
      punchA *= Math.exp(-dt * 7);
      for (const l of look) { l.flash = Math.max(0, l.flash - dt * 7); l.heal = Math.max(0, l.heal - dt * 2); }
      for (const L2 of [rings, flashes, beams, zaps]) for (let i = L2.length - 1; i >= 0; i--) { L2[i].t += dt; if (L2[i].t >= L2[i].life) L2.splice(i, 1); }
      /* motes drifting up through the lights over the stage */
      if (Math.random() < dt * 16) {
        const e = BBSim.HALF0 + 90, mx = (Math.random() * 2 - 1) * e;
        PS.burst({ x: mx, y: (Math.random() * 2 - 1) * e, z: 8 + Math.random() * 60, n: 1, speed: 8, up: [10, 26],
                   life: 3.4, size: 2.6 + Math.random() * 2, color: Math.random() < .5 ? TEAM[mx < 0 ? 0 : 1] : '#c8d4ff', alpha: .5, grav: 3, drag: .1, add: true });
      }
      PS.step(dt);
    },
    sway(a) { yawSway = a; },

    /* ---- the arena pass ----
       F: { S: the fight (or a staged one), a: 0..1 between the last two
       steps, t: seconds, idle: weapons turn on their own (before a fight),
       drop: [k, k] how far each ball has fallen in (1 = landed), aim:
       { x, y, ang, locked, bounce } the player's arrow, hide: [b, b],
       bright: 0..1 how lit the arena is } */
    arena(ctx, F) {
      const S = F.S, a = F.a === undefined ? 1 : F.a, t = F.t;
      let cx = C.x, cy = C.y, dist = C.dist * (1 - punchA);
      if (focus) { cx += (wx(focus.x) - cx) * focus.k * .6; cy += (focus.y - cy) * focus.k * .6; dist *= 1 - .28 * focus.k; }
      if (shakeA > 0) { cx += (Math.random() - .5) * shakeA * 2; cy += (Math.random() - .5) * shakeA * 2; }
      cam.shift = C.sx || C.sy ? [C.sx, C.sy] : null;
      cam.orbit(cx, cy, 0, dist, C.pitch, C.yaw + yawSway);
      env.vig = .3; env.expo = F.bright === undefined ? 1 : .55 + .45 * F.bright;
      R3.size(W, H);
      R3.begin(cam, env, t);
      for (const p of pools) p.reset();
      R3.draw(M.dark, ID, darkM);
      R3.draw(M.plat, ID, platM);
      R3.draw(M.edge, ID, edgeM);
      R3.draw(M.floor, ID, floorM);
      R3.draw(M.marks, ID, marksM);
      /* The walls close in during overtime, and their neon runs hot as they
         do. The south wall is the north one turned round and flipped end to
         end, so its colours still run from the left side's to the right's. */
      const half = S ? S.half : BBSim.HALF0, hot = S ? clamp((BBSim.HALF0 - S.half) / 30, 0, 1) : 0;
      trimM.tint = Gfx3D.mixc([1, 1, 1], [1.5, .35, .2], hot);
      trimM.p1 = [2.4 + hot * 1.6, hot * .7, 0, 0];
      for (let s = 0; s < 4; s++) {
        const rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][s];
        const ox = [0, half, 0, -half][s], oy = [-half, 0, half, 0][s];
        M4.place(T, ox, oy, 0, rot, s === 2 ? -half * 2 : half * 2, 1, 1);
        R3.draw(M.rail, T, railM);
        R3.draw(s === 1 ? M.trimB : s === 3 ? M.trimA : M.trimAB, T, trimM);
      }
      /* the pylons, each lit in the colour of its side, sending a beam up */
      const pr = half + BBModels.POST_AT;
      for (const [px, py] of [[-pr, -pr], [pr, -pr], [pr, pr], [-pr, pr]]) {
        R3.draw(M.post, M4.place(T, px, py, 0, 0), railM);
        R3.draw(M.cap, M4.place(T, px, py, 0, 0), capM[px < 0 ? 0 : 1]);
        const bm = trailP.get(), bc = TEAM3[px < 0 ? 0 : 1], fl = .8 + .2 * Math.sin(t * 2.3 + px * .01 + py * .02);
        bm.color = [bc[0], bc[1], bc[2], .2 * fl * (1 + hot * .6)];
        R3.fx(M.beam, M4.place(T, px, py, BBModels.WALL_H + 13, 0, 13, 1, 300), bm);
      }
      if (hot > 0) {
        /* the floor the walls have taken back, in red */
        const H0 = BBSim.HALF0, m = solidP.get();
        m.color = [.9, .12, .08, .24 * hot];
        const band = (x0, y0, x1, y1) => R3.fx(M.decal, M4.place(T, (x0 + x1) / 2, (y0 + y1) / 2, .6, 0, (x1 - x0) / 2, (y1 - y0) / 2, 1), m);
        band(-H0, -H0, H0, -half); band(-H0, half, H0, H0); band(-H0, -half, -half, half); band(half, -half, H0, half);
      }
      if (S) {
        for (let i = 0; i < 2; i++) if (S.b[i].fl && !(F.hide && F.hide[i]) && !look[i].gone) drawFlames(S, S.b[i], t, F.dt);
        drawBombs(S, t);
        drawShots(S, a, t);
        for (let i = 0; i < 2; i++) if (!(F.hide && F.hide[i]) && !look[i].gone) drawBall(S, i, a, F, t);
        drawBolts(t);
        if (F.aim) drawAim(S, F.aim, t);
      }
      for (const r of rings) {
        const k = r.t / r.life, e = 1 - (1 - k) * (1 - k), rad = r.r0 + (r.r1 - r.r0) * e, m = ringP.get();
        m.color = [r.col[0], r.col[1], r.col[2], (1 - k) * .9]; m.p = [.9, Math.min(.5, r.w * 60 / Math.max(10, rad)), 0, 0]; m.add = true;
        R3.fx(M.decal, M4.place(T, wx(r.x), r.y, 1.2, 0, rad), m);
      }
      for (const f of flashes) {
        const k = f.t / f.life, m = blobP.get();
        m.color = [f.col[0], f.col[1], f.col[2], (1 - k) * f.a]; m.p = [1.6, 0, 0, 0];
        R3.fx(M.decal, M4.place(T, wx(f.x), f.y, f.z, 0, f.r * (1 + k * .4)), m);
      }
      R3.parts(PS);
      R3.end();
      ctx.drawImage(R3.canvas, 0, 0, W, H);
    }
  };

  /* ---- drawing a rig: each of its layers in its own material ---- */
  function rig(Rg, M2, mats) {
    for (const k in Rg) if (mats[k]) R3.draw(Rg[k], M2, mats[k]);
  }
  /* the arena's materials for fighter i's weapon */
  const armMats = [0, 1].map(i => ({ metal: metalM, plain, glow: glowMats[i], iron: metalOf('iron'), brass: metalOf('brass') }));

  /* ---- a fighter ---- */
  function lerpA(a0, a1, k) { return a0 + BBM.wrap(a1 - a0) * k; }
  function drawBall(S, i, a, F, t) {
    const b = S.b[i], o = S.b[1 - i], lk = look[i], def = b.def, id = def.id, w = def.w, K3 = kit(id);
    const x = b.px + (b.x - b.px) * a, y = b.py + (b.y - b.py) * a, r = b.pr + (b.r - b.pr) * a;
    const X = wx(x), vx = b.vx * MX, vy = b.vy;
    const drop = F.drop ? F.drop[i] : 1;
    const dz = drop >= 1 ? 0 : (1 - drop) * (1 - drop) * 420 + Math.abs(Math.sin(drop * Math.PI * 3)) * (1 - drop) * 24;
    let z = r + dz;
    /* shadow-side team ring on the floor */
    const tr = ringP.get(), tc = TEAM3[F.team ? F.team[i] : i];
    tr.color = [tc[0], tc[1], tc[2], .75 * Math.min(1, drop * 1.5)]; tr.p = [.86, .1, 0, 0];
    R3.fx(M.decal, M4.place(T, X, y, .8, 0, r + 11), tr);
    /* the ball itself */
    const mat = id === 'ghost' ? ghostMats[i] : ballMats[i], fm = faceMats[i];
    const fl = lk.flash, slow = b.slow || 0;
    mat.emit = [fl * .9 + lk.heal * .05, fl * .9 + lk.heal * .5, fl * .9 + lk.heal * .1];
    mat.tint = slow ? Gfx3D.mixc([1, 1, 1], [.75, 1.05, 1.35], Math.min(1, slow / 4)) : [1, 1, 1];
    fm.emit = mat.emit; fm.alpha = 1; fm.blend = false;
    if (id === 'ghost') {
      const faded = b.ghost === 1, charged = b.ghost === 2;
      mat.alpha = faded ? .18 + .08 * Math.sin(t * 30) : 1;
      mat.blend = faded;
      z = r + 9 + Math.sin(t * 3 + lk.bob) * 3 + dz;
      mat.emit = charged ? [.55 + fl, .25 + fl, .9 + fl] : [.16 + fl, .13 + fl, .3 + fl];
      if (faded) { fm.alpha = mat.alpha * 1.5; fm.blend = true; }
    }
    const sp = Math.hypot(vx, vy);
    /* which way it is going, for its face, eased so a bounce turns its head
       rather than snapping it */
    if (sp > 1) lk.yaw = lerpA(lk.yaw, Math.atan2(vy, vx), F.dt ? 1 - Math.exp(-F.dt * 9) : 1);
    if (NOROLL[id]) {
      /* these do not roll: they lean the way they are going */
      lk.q[0] = 0; lk.q[1] = 0; lk.q[2] = 0; lk.q[3] = 1;
      if (id !== 'ghost' && sp > 1) Q.turn(lk.q, -vy / sp, vx / sp, 0, (id === 'bomber' ? .18 : .11) + Math.sin(t * 14 + i) * .03);
    } else if (F.roll !== false && sp > 1 && F.dt) Q.turn(lk.q, -vy / sp, vx / sp, 0, sp * F.dt / r);
    M4.quat(T, lk.q, r, X, y, z);
    R3.draw(K3.ball, T, mat);
    if (K3.ballMetal) R3.draw(K3.ballMetal, T, metalOf(K3.metalC));
    if (K3.ballGlow) {
      const gm = bodyGlow[i];
      if (id === 'blaze') {
        /* the flames on top flicker taller and shorter */
        gm.p1 = [1.05, .3, 0, 0];
        M4.quat(T2, lk.q, 1, X, y, z);
        M4.mul(T3, T2, M4.place(T, 0, 0, 0, t * .7, r, r, r * (1 + .12 * Math.sin(t * 17 + i) + .06 * Math.sin(t * 29))));
        R3.draw(K3.ballGlow, T3, gm);
        M4.quat(T, lk.q, r, X, y, z);
        if (Math.random() < .5) burst({ x: X + (Math.random() - .5) * r * .6, y: y + (Math.random() - .5) * r * .6, z: z + r * 1.3, n: 1, speed: 20, up: [60, 140], life: .5, size: 7, color: Math.random() < .5 ? '#ffb030' : '#ff6a13', add: true, grav: 80, drag: 1.5 });
      } else {
        gm.p1 = [id === 'bomber' ? 1.6 : 1, id === 'laser' ? .5 : .3, 0, 0];
        R3.draw(K3.ballGlow, T, gm);
      }
    }
    if (id === 'bomber') {
      const tip = Q.rot(lk.q, BBModels.FUSE_TIP[0], BBModels.FUSE_TIP[1], BBModels.FUSE_TIP[2]);
      const m = blobP.get(), fk = .7 + .3 * Math.sin(t * 40);
      m.color = [1, .7 * fk, .25, .95]; m.p = [1.4, 0, 0, 0]; m.depth = false;
      R3.fx(M.decal, M4.place(T2, X + tip[0] * r, y + tip[1] * r, z + tip[2] * r, 0, 9 * fk), m);
      if (Math.random() < .5) burst({ x: X + tip[0] * r, y: y + tip[1] * r, z: z + tip[2] * r, n: 1, speed: 60, up: [40, 120], life: .35, size: 4, color: '#ffc24a', add: true, grav: -200 });
    }
    if (id === 'tesla') {
      const tip = Q.rot(lk.q, 0, 0, 1.75), m = blobP.get(), fk = .75 + .25 * Math.sin(t * 23 + i);
      m.color = [.6, 1, 1, .7]; m.p = [1.5, 0, 0, 0]; m.depth = false;
      R3.fx(M.decal, M4.place(T2, X + tip[0] * r, y + tip[1] * r, z + tip[2] * r, 0, 12 * fk), m);
      /* how far it reaches, faintly on the floor */
      const rg = ringP.get(), kk = .5 + .5 * Math.sin(t * 4);
      rg.color = [.35, 1, .85, .16 + .08 * kk]; rg.p = [.93, .04, 0, 0]; rg.add = true;
      R3.fx(M.decal, M4.place(T2, X, y, 1, t * .5, r + b.range), rg);
    }
    if (K3.face) {
      /* the face: turned to look where the ball is going, and leaning with it */
      M4.quat(T2, lk.q, r, X, y, z);
      M4.mul(T3, T2, M4.place(T, 0, 0, 0, lk.yaw, 1));
      R3.draw(K3.face, T3, fm);
    }
    if (id === 'comet' || (w.dash && b.dashing > 0) || (w.dash && lk.hist.length)) streak(i, b, X, y, z, r, F, t);
    /* the weapon */
    let ang = lerpA(b.pwa, b.wa, a);
    const turns = w.kind === 'blade' || w.kind === 'orb' || w.kind === 'arc' || w.kind === 'saw' || w.kind === 'flail';
    if (F.idle !== undefined && turns) ang = -Math.PI / 2 + b.dir * (w.spin || w.drive || 2) * .55 * F.idle;
    const wa = MX < 0 ? Math.PI - ang : ang;
    if (w.kind === 'lance') {
      let dx = vx, dy = vy;
      if (F.aim && F.aim.seat === i && !F.aim.hidden) { dx = Math.cos(F.aim.ang) * MX; dy = Math.sin(F.aim.ang); }
      lk.face = lerpA(lk.face, Math.atan2(dy, dx), F.dt ? 1 - Math.exp(-F.dt * 24) : 1);
    }
    /* the bow, the boomerang in hand and the wizard's staff are turned to
       the other ball; the laser points where the fight says it does */
    if (w.kind === 'bow' || w.kind === 'rang' || w.kind === 'spell') lk.face = lerpA(lk.face, Math.atan2(o.y - y, wx(o.x) - X), F.dt ? 1 - Math.exp(-F.dt * 10) : 1);
    if (w.kind === 'laser') lk.face = Math.atan2(b.la.vy, b.la.vx * MX);
    const face = w.kind === 'lance' || w.kind === 'bow' || w.kind === 'rang' || w.kind === 'spell' || w.kind === 'laser' ? lk.face : wa;
    const R4 = BBModels.grows(def) ? liveKit(i, b) : K3.rig, mats = armMats[i];
    glowMats[i].tint = [1, 1, 1]; glowMats[i].alpha = .92;
    const my = MX;
    if (w.kind === 'orb') {
      for (let k = 0; k < w.n; k++) {
        const aa = wa + k * TAU / w.n * (MX < 0 ? -1 : 1), d = r + w.dist;
        M4.place(T, X + Math.cos(aa) * d, y + Math.sin(aa) * d, z + Math.sin(t * 4 + k * 2) * 2, t * 2.5 + k, 1);
        rig(R4, T, mats);
        const bl = blobP.get(); bl.color = [.45, .85, 1, .35]; bl.p = [1.5, 0, 0, 0];
        R3.fx(M.decal, M4.place(T2, X + Math.cos(aa) * d, y + Math.sin(aa) * d, 2, 0, 20), bl);
      }
    } else if (w.kind === 'tail') drawTail(S, b, x, y, a);
    else if (w.kind === 'flail') drawFlail(i, b, X, y, z, ang, wa, t, F);
    else if (w.kind === 'saw') {
      M4.place(T, X, y, z, wa, 1, my, 1);
      rig(R4, T, mats);
      /* the blade, whirring on the hub */
      const d = b.r + w.gap + b.sr, s = b.sr / w.sr;
      lk.saw += (F.dt || .016) * 32 * (b.dir * MX);
      M4.place(T, X + Math.cos(wa) * d, y + Math.sin(wa) * d, z, lk.saw, s, s, 1);
      rig(K3.parts.disc, T, mats);
    } else if (w.kind === 'rang') {
      if (b.held) { M4.place(T, X, y, z, face + Math.sin(t * 3) * .15, 1, my, 1); rig(R4, T, mats); }
    } else if (w.kind === 'laser') {
      M4.place(T, X, y, z, face, 1, my, 1);
      rig(R4, T, mats);
      drawCharge(i, b, X, y, z, face, t, S);
    } else if (w.kind === 'spell') {
      M4.place(T, X, y, z, face - .9, 1, my, 1);
      rig(R4, T, mats);
      /* the stone on the staff pulses as the next spell comes */
      const k = clamp(1 - b.timer / BBSim.ticks(w.every), 0, 1), sx = r + 9;
      const ox = X + Math.cos(face - .9) * sx, oy = y + Math.sin(face - .9) * sx, bl = blobP.get();
      bl.color = [1, .85, .4, .25 + .45 * k * k]; bl.p = [1.5, 0, 0, 0]; bl.depth = false;
      R3.fx(M.decal, M4.place(T2, ox, oy, z + 42.8, 0, 12 + 10 * k), bl);
    } else if (w.kind !== 'bomb' && w.kind !== 'ghost' && w.kind !== 'body' && w.kind !== 'star' && w.kind !== 'fire' && w.kind !== 'zap' && w.kind !== 'spines' && w.kind !== 'comet') {
      M4.place(T, X, y, z, face, 1, my, 1);
      rig(R4, T, mats);
      if (w.kind === 'blade') swoosh(i, b, X, y, z, wa, a, F, def);
    }
  }
  /* The flail: the eye on the ball pointing at the head, the chain in links
     out to it, and the spiked head where the fight has it, tumbling. */
  function drawFlail(i, b, X, y, z, ang, wa, t, F) {
    const w = b.def.w, K3 = kit(b.id), mats = armMats[i], L0 = b.r + b.len;
    M4.place(T, X, y, z, wa, 1, MX, 1);
    rig(K3.rig, T, mats);
    const c = Math.cos(wa), s = Math.sin(wa), hx = X + c * L0, hy = y + s * L0;
    const x0 = X + c * (b.r + 4), y0 = y + s * (b.r + 4), len = L0 - w.hr * .6 - b.r - 4, n = Math.max(2, Math.round(len / 4.2));
    for (let k = 0; k < n; k++) {
      const u = (k + .5) / n, px = x0 + (hx - x0) * u * (len / (L0 - b.r - 4)), py = y0 + (hy - y0) * u * (len / (L0 - b.r - 4));
      const sag = Math.sin(u * Math.PI) * -1.5;
      if (k & 1) M4.axes(T, [c, s, 0], [0, 0, 1], [s, -c, 0], [px, py, z + sag]);
      else M4.axes(T, [c, s, 0], [-s, c, 0], [0, 0, 1], [px, py, z + sag]);
      rig(K3.parts.link, T, mats);
    }
    M4.place(T2, hx, hy, z, wa * 2 + t * 3, 1);
    rig(K3.parts.head, T2, mats);
    const sh = shadeP.get(); sh.color = [0, 0, 0, .35]; sh.p = [1.2, 0, 0, 0];
    R3.fx(M.decal, M4.place(T3, hx, hy, .7, 0, w.hr * 1.4), sh);
  }
  /* the laser charging: light gathering at its muzzle, and a thin line along
     where it will fire */
  function drawCharge(i, b, X, y, z, face, t, S) {
    if (b.lph !== 1) return;
    const k = clamp(1 - b.timer / Math.max(1, b.lchg), 0, 1), c = Math.cos(face), s = Math.sin(face), mz = b.r + 37;
    const mx = X + c * mz, my2 = y + s * mz;
    R3.draw(M.seg, M4.place(T, mx, my2, z, 0, 1.5 + 5.5 * k), chargeM);
    const bl = blobP.get(); bl.color = [.5, 1, 1, .35 + .5 * k]; bl.p = [1.5, 0, 0, 0]; bl.depth = false;
    R3.fx(M.decal, M4.place(T2, mx, my2, z, t * 3, 14 + 26 * k), bl);
    if (Math.random() < .6) burst({ x: mx + (Math.random() - .5) * 40, y: my2 + (Math.random() - .5) * 40, z: z + (Math.random() - .5) * 30, n: 1, speed: 10,
                                   life: .25, size: 3, color: '#bffcff', add: true, to: [mx, my2, z] });
    /* where it points, out to the wall */
    const h = S.half, ux = c, uy = s;
    let far = 900;
    const sx0 = mx * MX, sy0 = my2, sux = ux * MX;
    if (sux > 1e-6) far = Math.min(far, (h - sx0) / sux); else if (sux < -1e-6) far = Math.min(far, (-h - sx0) / sux);
    if (uy > 1e-6) far = Math.min(far, (h - sy0) / uy); else if (uy < -1e-6) far = Math.min(far, (-h - sy0) / uy);
    const g = Gfx3D.Geo();
    stripUV(g, mx, my2, mx + ux * far, my2 + uy * far, 3 + 4 * k, z, 0, Math.max(1, far));
    aimM.laser[i].set(g);
    const dm = dashP.get(); dm.color = [.55, 1, 1, .2 + .5 * k]; dm.p = [10, .5, 2, 0];
    R3.fx(aimM.laser[i], ID, dm);
  }
  /* The path behind a ball, as a streak of light: the comet's fiery tail, as
     long and bright as it is fast, and the katana's dash. */
  function streak(i, b, X, y, z, r, F, t) {
    const lk = look[i], H2 = lk.hist, dashing = !!b.def.w.dash;
    if (F.dt) { H2.unshift([X, y]); if (H2.length > 14) H2.length = 14; }
    if (dashing && !(b.dashing > 0)) { H2.length = Math.max(0, H2.length - 2); if (H2.length < 2) return; }
    if (H2.length < 3) return;
    const w = b.def.w, k = dashing ? 1 : clamp((b.mult - 1) / (w.max - 1), 0, 1);
    const g = Gfx3D.Geo(), n = H2.length;
    for (let j = 0; j < n; j++) {
      const p = H2[j], q = H2[Math.min(n - 1, j + 1)], pp = H2[Math.max(0, j - 1)];
      let dx = pp[0] - q[0], dy = pp[1] - q[1];
      const l = Math.hypot(dx, dy) || 1, u = j / (n - 1), wd = r * (dashing ? .8 : .7 + .5 * k) * (1 - u * .8);
      dx /= l; dy /= l;
      g.v(p[0] - dy * wd, p[1] + dx * wd, z, 0, 0, 1, [1, 1, 1, 1], 1 - u, 1);
      g.v(p[0] + dy * wd, p[1] - dx * wd, z, 0, 0, 1, [1, 1, 1, 1], 1 - u, -1);
    }
    for (let j = 0; j < n - 1; j++) { const q = j * 2; g.q(q, q + 2, q + 3, q + 1); }
    tails[i].set(g);
    const m = trailP.get();
    m.color = dashing ? [1, .92, .92, .55] : [1, .62, .22, .25 + .5 * k];
    R3.fx(tails[i], ID, m);
    if (!dashing && Math.random() < .3 + k * .6) burst({ x: X + (Math.random() - .5) * r, y: y + (Math.random() - .5) * r, z: z, n: 1, speed: 30, up: [10, 40], life: .4 + k * .3, size: 5 + k * 5, color: Math.random() < .5 ? '#ffb347' : '#ff7a2a', add: true, grav: 20, drag: 2 });
  }
  /* A blade spinning fast leaves a smear of light behind its tip. */
  function swoosh(i, b, X, y, z, wa, a, F, def) {
    const w = def.w, lk = look[i];
    let spin = Math.abs(BBM.wrap(wa - lk.lastWa)) / Math.max(1e-3, F.dt || .016);
    lk.lastWa = wa;
    if (F.idle !== undefined) spin = 3;
    lk.spinV += (spin - lk.spinV) * .3;
    const k = clamp((lk.spinV - 3) / 8, 0, 1);
    if (k <= .02) return;
    const dirS = Math.sign(b.dir * (MX < 0 ? -1 : 1)) || 1;
    const len = b.len, arc = .35 + k * .9, n = 14;
    for (let bl = 0; bl < w.n; bl++) {
      const g = Gfx3D.Geo(), base = wa + bl * TAU / w.n;
      const r0 = b.r + len * .35, r1 = b.r + len + 2;
      for (let j = 0; j <= n; j++) {
        const u = j / n, an = base - dirS * arc * (1 - u), c = Math.cos(an), s = Math.sin(an);
        g.v(X + c * r0, y + s * r0, z, 0, 0, 1, [1, 1, 1, 1], u, -1);
        g.v(X + c * r1, y + s * r1, z, 0, 0, 1, [1, 1, 1, 1], u, 1);
      }
      for (let j = 0; j < n; j++) { const q = j * 2; g.q(q, q + 2, q + 3, q + 1); }
      const m = trails[i * 2 + bl];
      m.set(g);
      const fm = trailP.get(), ac = Gfx3D.srgb(def.id === 'katana' ? '#ffffff' : def.acc);
      fm.color = [ac[0], ac[1], ac[2], .5 * k];
      R3.fx(m, ID, fm);
    }
  }
  /* the Snake's tail, smoothed between the samples the sim keeps */
  function drawTail(S, b, hx, hy, a) {
    const n = b.tailN, f = ((S.tick % 5) + a) / 5;
    for (let j = n - 1; j >= 0; j--) {
      const k0 = ((b.tn - j - 2) & 63) * 2, k1 = ((b.tn - j - 1) & 63) * 2;
      const x = b.trail[k0] + (b.trail[k1] - b.trail[k0]) * f, y = b.trail[k0 + 1] + (b.trail[k1 + 1] - b.trail[k0 + 1]) * f;
      const rr = 13 - 5 * j / Math.max(1, n - 1);
      M4.place(T, wx(x), y, rr, 0, rr);
      R3.draw(M.seg, T, segMats[j & 1]);
    }
  }
  /* the Blaze's flames on the floor: each glows on the ground and gives off
     fire, less as it burns out */
  function drawFlames(S, b, t, dt) {
    const n = Math.min(64, b.fln), T1 = BBSim.T;
    for (let j = 0; j < n; j++) {
      const k = j * 3, left = (b.fl[k + 2] - S.tick) * T1;
      if (left <= 0) continue;
      const f = clamp(left / .6, 0, 1), X = wx(b.fl[k]), Y = b.fl[k + 1], fk = .8 + .2 * Math.sin(t * 19 + j * 1.7);
      const m = blobP.get(); m.color = [1, .5, .12, .8 * f * fk]; m.p = [1.2, 0, 0, 0];
      R3.fx(M.decal, M4.place(T, X, Y, 1.4, 0, (20 + 8 * f) * fk), m);
      if (dt && Math.random() < dt * 18 * f) burst({ x: X + (Math.random() - .5) * 16, y: Y + (Math.random() - .5) * 16, z: 4, n: 1, speed: 14, up: [60, 130], life: .45 + Math.random() * .3,
        size: 12 + Math.random() * 9, color: Math.random() < .5 ? '#ff7a14' : '#ffc43a', add: true, grav: 60, drag: 1.6, grow: -14 });
    }
  }
  function drawShots(S, a, t) {
    const K0 = BBSim;
    for (const s of S.shots) {
      const x = s.px + (s.x - s.px) * a, y = s.py + (s.y - s.py) * a, X = wx(x);
      const ang = Math.atan2(s.vy, s.vx * MX);
      if (s.k === K0.ARROW) {
        M4.place(T, X, y, 30, ang, 1.15);
        R3.draw(M.arrowP, T, plain); R3.draw(M.arrowM, T, metalM);
      } else if (s.k === K0.NEEDLE) {
        R3.draw(M.needle, M4.place(T, X, y, 30, ang, 1.1), plain);
      } else if (s.k === K0.STAR) {
        M4.place(T, X, y, 30, t * 28 + x * .1, 1);
        R3.draw(M.starM, T, metalM); R3.draw(M.starP, T, plain);
        const bl = blobP.get(); bl.color = [1, .45, .5, .22]; bl.p = [1.5, 0, 0, 0];
        R3.fx(M.decal, M4.place(T2, X, y, 30, 0, 13), bl);
      } else if (s.k === K0.SPELL) {
        const pul = 1 + .12 * Math.sin(t * 22 + x);
        R3.draw(M.seg, M4.place(T, X, y, 30, 0, s.rad * .85 * pul), spellM);
        const bl = blobP.get(); bl.color = [1, .8, .35, .6]; bl.p = [1.5, 0, 0, 0];
        R3.fx(M.decal, M4.place(T2, X, y, 30, t * 4, s.rad * 3.2), bl);
        if (Math.random() < .7) burst({ x: X, y, z: 30, n: 1, speed: 30, life: .45, size: 4 + s.rad * .3, color: Math.random() < .5 ? '#ffe58a' : '#b89cff', add: true, grav: 10, drag: 2 });
      } else if (s.k === K0.RANG) {
        const K3 = kit('boomerang');
        M4.place(T, X, y, 28, t * 24 * (s.ts < 0 ? -1 : 1) * MX, s.rad / 10);
        rig(K3.parts.rang, T, { plain });
        const sh = shadeP.get(); sh.color = [0, 0, 0, .3]; sh.p = [1.2, 0, 0, 0];
        R3.fx(M.decal, M4.place(T2, X, y, .7, 0, 18), sh);
      }
      if (s.refl) {
        const m = blobP.get(); m.color = [1, .8, .3, .7]; m.p = [1.5, 0, 0, 0];
        R3.fx(M.decal, M4.place(T2, X, y, 30, 0, 14), m);
      }
    }
  }
  function drawBombs(S, t) {
    for (const q of S.bombs) {
      const k = 1 - q.t / q.fuse, X = wx(q.x);
      const bob = 1 + Math.sin(k * k * 40) * .04 * k;
      M4.place(T, X, q.y, 12, 0, 12 * bob);
      R3.draw(M.bomb, T, plain);
      const blink = (Math.sin(k * k * 60) > 0) ? 1 : .25;
      const m = blobP.get(); m.color = [1, .25, .15, .9 * blink]; m.p = [1.4, 0, 0, 0];
      R3.fx(M.decal, M4.place(T2, X, q.y, 32, 0, 8), m);
      const rm = ringP.get(); rm.color = [1, .3, .2, .25 + .5 * k]; rm.p = [.9, .06, 0, 0];
      R3.fx(M.decal, M4.place(T2, X, q.y, 1, 0, q.rad + 30), rm);
      const fm = shadeP.get(); fm.color = [1, .2, .1, .12 * k]; fm.p = [1, 0, 0, 0];
      R3.fx(M.decal, M4.place(T2, X, q.y, .9, 0, (q.rad + 30) * k), fm);
    }
  }
  /* The laser's beams and the tesla's shocks, for the moment each lasts: a
     beam is a bar of light with a white core, a shock a crooked line that
     jumps about while it lasts. */
  function drawBolts(t) {
    let n = 0;
    for (const e of beams) {
      if (n >= bolts.length - 1) break;
      const k = e.t / e.life, x0 = wx(e.x0), x1 = wx(e.x1);
      for (const [wd, col, al] of [[22, [1, .3, 1], .55], [7, [.85, 1, 1], 1]]) {
        const g = Gfx3D.Geo();
        stripUV(g, x0, e.y0, x1, e.y1, wd * (1 - k * .6), 30, 1, 1);
        bolts[n].set(g);
        const m = trailP.get(); m.color = [col[0], col[1], col[2], al * (1 - k)];
        R3.fx(bolts[n++], ID, m);
      }
    }
    for (const e of zaps) {
      if (n >= bolts.length - 1) break;
      const x0 = wx(e.x0), x1 = wx(e.x1), dx = x1 - x0, dy = e.y1 - e.y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const k = e.t / e.life, steps = 8, pts = [[x0, e.y0, e.z0]];
      /* a crooked path, jumping about for as long as it lasts */
      for (let j = 1; j <= steps; j++) {
        const u = j / steps, off = j === steps ? 0 : (Math.random() - .5) * 22 * Math.sin(u * Math.PI);
        pts.push([x0 + dx * u + nx * off, e.y0 + dy * u + ny * off, e.z0 + (30 - e.z0) * u + (j === steps ? 0 : (Math.random() - .5) * 12)]);
      }
      for (const [wd, col, al] of [[13, [.3, .9, 1], .55], [3.6, [.92, 1, 1], 1]]) {
        const g = Gfx3D.Geo();
        for (let j = 1; j < pts.length; j++) {
          const p = pts[j - 1], c = pts[j], sx = c[0] - p[0], sy = c[1] - p[1], sl = Math.hypot(sx, sy) || 1, w2 = wd * (1 - k * .5) / 2, qx = -sy / sl * w2, qy = sx / sl * w2, b0 = g.n;
          g.v(p[0] + qx, p[1] + qy, p[2], 0, 0, 1, [1, 1, 1, 1], 1, 1); g.v(c[0] + qx, c[1] + qy, c[2], 0, 0, 1, [1, 1, 1, 1], 1, 1);
          g.v(c[0] - qx, c[1] - qy, c[2], 0, 0, 1, [1, 1, 1, 1], 1, -1); g.v(p[0] - qx, p[1] - qy, p[2], 0, 0, 1, [1, 1, 1, 1], 1, -1);
          g.q(b0, b0 + 1, b0 + 2, b0 + 3);
        }
        bolts[n].set(g);
        const m = trailP.get(); m.color = [col[0], col[1], col[2], al * (1 - k)];
        R3.fx(bolts[n++], ID, m);
      }
    }
  }
  /* The player's arrow: a dashed line to the first wall it will meet, and
     a fainter one on from there. */
  /* a flat strip on the floor, its u running u0..u1 along it and its v
     -1..1 across, which is what the trail, dash and chevron overlays read */
  function stripUV(g, x0, y0, x1, y1, w, z, u0, u1) {
    const ddx = x1 - x0, ddy = y1 - y0, l = Math.hypot(ddx, ddy) || 1, px = -ddy / l * w / 2, py = ddx / l * w / 2, n = g.n, c = [1, 1, 1, 1];
    g.v(x0 + px, y0 + py, z, 0, 0, 1, c, u0, 1); g.v(x1 + px, y1 + py, z, 0, 0, 1, c, u1, 1);
    g.v(x1 - px, y1 - py, z, 0, 0, 1, c, u1, -1); g.v(x0 - px, y0 - py, z, 0, 0, 1, c, u0, -1);
    g.q(n, n + 1, n + 2, n + 3);
  }
  const linC = c => [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)];
  /* The player's aim, all of it lying on the floor: a pool of light and a
     turning ring round the ball, a beam running out from it with chevrons
     streaming along it, a solid arrowhead that lights itself at its end,
     then dots on to the wall, a ghost of the ball where it will meet the
     wall, and fainter dots where it goes from there. Locked in, the lot
     turns gold and stops moving, and a ring bursts off the ball.
     A: { seat, ang (the sim's), locked, k (0..1 as it comes in), lockT } */
  function drawAim(S, A, t) {
    if (A.hidden) return;
    const b = S.b[A.seat], x0 = b.x, y0 = b.y, dx = Math.cos(A.ang), dy = Math.sin(A.ang);
    const h = S.half - b.r;
    let tx = Infinity, ty = Infinity;
    if (dx > 1e-6) tx = (h - x0) / dx; else if (dx < -1e-6) tx = (-h - x0) / dx;
    if (dy > 1e-6) ty = (h - y0) / dy; else if (dy < -1e-6) ty = (-h - y0) / dy;
    const d = Math.max(0, Math.min(tx, ty)), hx = x0 + dx * d, hy = y0 + dy * d;
    const bx = tx < ty ? -dx : dx, by = tx < ty ? dy : -dy;
    const k = A.k === undefined ? 1 : clamp(A.k, 0, 1), ke = 1 - (1 - k) * (1 - k);
    const col = A.locked ? [1, .8, .3] : TEAM3[0], still = A.locked;
    const at = u => [wx(x0 + dx * u), y0 + dy * u];
    const ang = Math.atan2(dy, dx * MX);
    /* round the ball */
    const pl = blobP.get(); pl.color = [col[0], col[1], col[2], .26 * ke]; pl.p = [1.1, 0, 0, 0];
    R3.fx(M.decal, M4.place(T, wx(x0), y0, .9, 0, b.r + 30), pl);
    const rg = ringP.get(); rg.color = [col[0], col[1], col[2], .9 * ke]; rg.p = [.84, .07, 0, 0]; rg.add = true;
    R3.fx(M.decal, M4.place(T, wx(x0), y0, 1.1, still ? 0 : t * 1.5, b.r + 16), rg);
    if (A.lockT !== undefined && A.lockT < .6) {
      const q = A.lockT / .6, lr = ringP.get();
      lr.color = [1, .85, .4, (1 - q) * .95]; lr.p = [.9, .1, 0, 0]; lr.add = true;
      R3.fx(M.decal, M4.place(T, wx(x0), y0, 1.3, 0, b.r + 16 + q * 70), lr);
    }
    /* the beam, and the chevrons streaming along it */
    const s0 = b.r + 4, len = Math.max(20, Math.min(d + b.r - 4, 170) * ke), s1 = s0 + len;
    const p0 = at(s0), p1 = at(s1);
    let g = Gfx3D.Geo();
    stripUV(g, p0[0], p0[1], p1[0], p1[1], 52, 1.4, 0, 1);
    aimM.beam.set(g);
    const bm = trailP.get(); bm.color = [col[0], col[1], col[2], .5 * ke];
    R3.fx(aimM.beam, ID, bm);
    g = Gfx3D.Geo();
    stripUV(g, p0[0], p0[1], p1[0], p1[1], 30, 1.6, 0, len);
    aimM.chev.set(g);
    const cm = chevP.get(); cm.color = [.55 + col[0] * .45, .55 + col[1] * .45, .55 + col[2] * .45, .95 * ke]; cm.p = [26, still ? 0 : 1.7, 11, 0];
    R3.fx(aimM.chev, ID, cm);
    /* the head, lit from within, breathing until it is locked */
    headM.tint = linC([.55 + col[0] * .45, .55 + col[1] * .45, .55 + col[2] * .45]);
    headM.p1 = [still ? 3 : 2.4, still ? 0 : .2, 0, 0];
    const pul = still ? 1 : 1 + Math.sin(t * 7) * .07, hp = at(s1 - 10);
    const hs = shadeP.get(); hs.color = [0, 0, 0, .55 * ke]; hs.p = [1.3, 0, 0, 0];
    R3.fx(M.decal, M4.place(T2, hp[0], hp[1], 1.7, 0, 30), hs);
    const hg = blobP.get(); hg.color = [col[0], col[1], col[2], .7 * ke]; hg.p = [1.5, 0, 0, 0];
    R3.fx(M.decal, M4.place(T2, hp[0], hp[1], 1.9, 0, 44), hg);
    R3.draw(M.aimHead, M4.place(T, hp[0], hp[1], 7, ang, 1.7 * pul * ke, 1.7 * pul * ke, 1.4), headM);
    if (k < .98) return;
    /* on to the wall in dots, the ball's ghost where it meets it, and the
       bounce, fainter */
    if (d + b.r - 4 > s1 - s0 + 12) {
      g = Gfx3D.Geo();
      const q0 = at(s1 + 14);
      stripUV(g, q0[0], q0[1], wx(hx), hy, 7, 1.5, 0, Math.max(1, d - s1 - 14));
      aimM.path.set(g);
      const dm = dashP.get(); dm.color = [col[0], col[1], col[2], .7]; dm.p = [15, .28, still ? 0 : .9, 0];
      R3.fx(aimM.path, ID, dm);
    }
    const gh = ringP.get(); gh.color = [col[0], col[1], col[2], .5]; gh.p = [.9, .08, 0, 0]; gh.add = true;
    R3.fx(M.decal, M4.place(T, wx(hx), hy, 1.4, 0, b.r), gh);
    const gs = shadeP.get(); gs.color = [col[0] * .6, col[1] * .6, col[2] * .6, .18]; gs.p = [1, 0, 0, 0];
    R3.fx(M.decal, M4.place(T, wx(hx), hy, 1.2, 0, b.r), gs);
    const l2 = Math.min(120, Math.max(40, d * .6));
    g = Gfx3D.Geo();
    stripUV(g, wx(hx + bx * (b.r * .4)), hy + by * (b.r * .4), wx(hx + bx * l2), hy + by * l2, 6, 1.5, 0, l2);
    aimM.bounce.set(g);
    const dm2 = dashP.get(); dm2.color = [col[0], col[1], col[2], .32]; dm2.p = [15, .28, still ? 0 : .9, 0];
    R3.fx(aimM.bounce, ID, dm2);
  }

  /* ---- effects from what the sim reports ----
     Returns how hard the screen should feel it (hit-stop steps). */
  const HITCOL = { burn: '#ff9a2a', zap: '#9ffcff', beam: '#ff7af0', spell: '#ffe58a', saw: '#fff0a0', slash: '#ffffff', thorn: '#c8ff8a', needle: '#fff0c0', star: '#ff9aa6' };
  V.fx = (e, S) => {
    const X = wx(e.x || 0), Y = e.y || 0;
    switch (e.k) {
      case 'hit': {
        const on = S.b[e.on], by = S.b[e.by], big = e.dmg >= 12, small = e.kind === 'burn';
        look[e.on].flash = small ? .55 : 1;
        const hc = on.def.col, spark = HITCOL[e.kind] || '#fff3c4';
        burst({ x: X, y: Y, z: 30, n: big ? 22 : small ? 6 : 12, speed: big ? 420 : 280, up: [60, 260], life: .45, size: big ? 7 : 5, color: spark, add: true, grav: -500, drag: 2.4 });
        if (!small) burst({ x: X, y: Y, z: 30, n: big ? 12 : 6, speed: 220, up: [80, 300], life: .8, size: 6, color: hc, shape: 1, spin: 14, grav: -900, floor: 2, drag: 1.2 });
        flashes.push({ x: e.x, y: e.y, z: 32, r: big ? 46 : 30, col: [1, .95, .8], a: big ? 1 : small ? .35 : .7, t: 0, life: .16 });
        if (!small) ring(e.x, e.y, big ? '#ffffff' : '#ffe9a8', 8, big ? 70 : 44, big ? .4 : .3, .14);
        if (e.heal > .5) {
          look[e.by].heal = 1;
          burst({ x: wx(by.x), y: by.y, z: 40, n: 10, speed: 40, up: [60, 140], life: .9, size: 7, color: '#6dff9a', add: true, grav: 60, drag: 1 });
        }
        if (e.kind === 'orb') burst({ x: X, y: Y, z: 30, n: 10, speed: 160, up: [40, 200], life: .7, size: 6, color: '#bff4ff', shape: 1, spin: 10, grav: -700, drag: 1.4 });
        if (e.kind === 'burn') burst({ x: X, y: Y, z: 20, n: 8, speed: 60, up: [60, 160], life: .6, size: 9, color: '#ff7a1a', add: true, grav: 80, drag: 1.5 });
        if (e.kind === 'bomb' || small) break;
        V.shake(big ? 5 : 2.2); if (big) V.punch(.02);
        return big ? 7 : 3;
      }
      case 'clash':
        burst({ x: X, y: Y, z: 30, n: 16, speed: 380, up: [80, 320], life: .4, size: 4.5, color: '#ffffff', add: true, grav: -600, drag: 2.2 });
        flashes.push({ x: e.x, y: e.y, z: 32, r: 26, col: [.8, .9, 1], a: 1, t: 0, life: .12 });
        ring(e.x, e.y, '#cfe4ff', 4, 34, .25, .12);
        V.shake(1.2);
        return 2;
      case 'block':
        burst({ x: X, y: Y, z: 30, n: 14, speed: 300, up: [80, 260], life: .45, size: 5, color: '#ffd34d', add: true, grav: -500, drag: 2 });
        ring(e.x, e.y, '#ffd34d', 6, 40, .3, .14);
        V.shake(1);
        return 2;
      case 'deflect':
        burst({ x: X, y: Y, z: 30, n: 8, speed: 260, up: [40, 200], life: .3, size: 3.5, color: '#fff4c9', add: true, grav: -600 });
        return 0;
      case 'wall': {
        const s = S.b[e.i];
        burst({ x: X, y: Y, z: 10, n: 5, speed: 90, up: [20, 90], life: .45, size: 7, color: '#8d9ac0', alpha: .5, grav: -200, drag: 3 });
        flashes.push({ x: e.x, y: e.y, z: 24, r: 22, col: Gfx3D.srgb(s.def.col), a: .9, t: 0, life: .22 });
        if (s.def.w.kind === 'comet' && s.mult > 1.2) burst({ x: X, y: Y, z: 20, n: 8, speed: 200, up: [40, 160], life: .5, size: 6, color: '#ffb347', add: true, grav: -300, drag: 2 });
        return 0;
      }
      case 'bump':
        burst({ x: X, y: Y, z: 30, n: e.big ? 16 : 6, speed: e.big ? 320 : 160, up: [40, 200], life: .35, size: 5, color: '#ffffff', add: true, grav: -500, drag: 2.5 });
        ring(e.x, e.y, '#ffffff', 6, e.big ? 60 : 30, .3, .12);
        V.shake(e.big ? 3 : .8);
        return e.big ? 4 : 1;
      case 'shoot': {
        const b = S.b[e.i];
        burst({ x: wx(b.x + e.dx * 36), y: b.y + e.dy * 36, z: 30, n: 4, speed: 80, up: [20, 60], life: .3, size: 5, color: '#e8d9b8', alpha: .7, grav: -100 });
        return 0;
      }
      case 'throw': {
        const b = S.b[e.i], col = e.what === 'spell' ? '#ffe58a' : e.what === 'star' ? '#ffd0d6' : '#fff0d6';
        burst({ x: wx(b.x + e.dx * 40), y: b.y + e.dy * 40, z: 30, n: e.what === 'spell' ? 12 : 5, speed: 90, up: [20, 70], life: .35, size: 5, color: col, add: e.what === 'spell', alpha: .7, grav: -60 });
        return 0;
      }
      case 'catch':
        ring(e.x, e.y, '#fff0d6', 4, 26, .25, .16);
        return 0;
      case 'charge': {
        const b = S.b[e.i];
        ring(b.x, b.y, '#bffcff', b.r, b.r + 22, .35, .12);
        return 0;
      }
      case 'beam': {
        beams.push({ x0: e.x0, y0: e.y0, x1: e.x, y1: e.y, t: 0, life: .22, hit: e.hit });
        burst({ x: X, y: Y, z: 30, n: e.hit === 3 ? 26 : 12, speed: e.hit === 3 ? 420 : 240, up: [60, 280], life: .45, size: 6, color: e.hit === 3 ? '#ffb0f8' : '#bffcff', add: true, grav: -400, drag: 2.2 });
        flashes.push({ x: e.x, y: e.y, z: 30, r: e.hit === 3 ? 56 : 30, col: [1, .7, 1], a: 1, t: 0, life: .2 });
        flashes.push({ x: e.x0, y: e.y0, z: 30, r: 34, col: [.7, 1, 1], a: .9, t: 0, life: .15 });
        V.shake(e.hit === 3 ? 4 : 1.5);
        return e.hit === 3 ? 5 : 1;
      }
      case 'zap': {
        /* from the top of the coil to the ball it shocks */
        const b = S.b[e.i];
        zaps.push({ x0: b.x, y0: b.y, z0: b.r * 2.78, x1: e.x, y1: e.y, t: 0, life: .18 });
        burst({ x: X, y: Y, z: 30, n: 10, speed: 260, up: [40, 200], life: .35, size: 4, color: '#bffcff', add: true, grav: -400, drag: 2.4 });
        flashes.push({ x: e.x, y: e.y, z: 30, r: 28, col: [.6, 1, 1], a: .9, t: 0, life: .12 });
        V.shake(1.2);
        return 1;
      }
      case 'spray': {
        const b = S.b[e.i];
        ring(b.x, b.y, '#c8ff8a', b.r, b.r + 40, .3, .12);
        burst({ x: wx(b.x), y: b.y, z: 30, n: 10, speed: 160, up: [20, 90], life: .4, size: 5, color: '#9be06a', alpha: .8, grav: -200, drag: 2 });
        return 0;
      }
      case 'dash': {
        const b = S.b[e.i];
        ring(b.x, b.y, '#ffffff', b.r, b.r + 36, .28, .14);
        look[e.i].hist.length = 0;
        return 0;
      }
      case 'ping':
        burst({ x: X, y: Y, z: 28, n: 4, speed: 140, up: [20, 80], life: .25, size: 3.5, color: e.n === BBSim.SPELL ? '#ffe58a' : '#ffffff', add: true, grav: -300 });
        return 0;
      case 'fizzle':
        burst({ x: X, y: Y, z: 30, n: 12, speed: 90, up: [30, 110], life: .6, size: 5, color: '#ffe58a', add: true, grav: 40, drag: 2 });
        return 0;
      case 'drop':
        ring(e.x, e.y, '#ff6a4a', 4, 26, .3, .2);
        return 0;
      case 'boom': {
        burst({ x: X, y: Y, z: 20, n: 36, speed: 360, up: [120, 520], life: .7, size: 11, color: '#ffb640', add: true, grav: -400, drag: 2.2 });
        burst({ x: X, y: Y, z: 20, n: 14, speed: 160, up: [100, 260], life: 1.4, size: 22, color: '#4a4d5a', alpha: .55, grav: 40, drag: 2, grow: 20 });
        burst({ x: X, y: Y, z: 10, n: 16, speed: 300, up: [100, 400], life: 1, size: 5, color: '#2a2c35', shape: 1, spin: 12, grav: -1000, floor: 2 });
        flashes.push({ x: e.x, y: e.y, z: 26, r: e.rad + 20, col: [1, .75, .35], a: 1, t: 0, life: .28 });
        ring(e.x, e.y, '#ffb640', 10, e.rad + 34, .45, .2);
        V.shake(e.hit ? 7 : 4); V.punch(.025);
        return e.hit ? 6 : 2;
      }
      case 'fade': {
        const b = S.b[e.i];
        burst({ x: wx(b.x), y: b.y, z: 34, n: 14, speed: 120, up: [20, 120], life: .7, size: 10, color: '#b9a9ff', alpha: .6, grav: 40, drag: 2, add: true });
        return 0;
      }
      case 'grow': {
        const b = S.b[e.i];
        ring(b.x, b.y, '#ffd88a', b.r, b.r + 50, .45, .16);
        burst({ x: wx(b.x), y: b.y, z: 4, n: 14, speed: 200, up: [20, 90], life: .6, size: 9, color: '#9b8a70', alpha: .5, grav: -200, drag: 2.4 });
        return 0;
      }
      case 'ko': {
        if (e.on < 0) return 0;
        const b = S.b[e.on], L2 = look[e.on];
        L2.gone = true;
        const X2 = wx(b.x), c = b.def.col;
        burst({ x: X2, y: b.y, z: b.r, n: 44, speed: 460, up: [150, 620], life: 1.6, size: 12, color: c, shape: 1, spin: 16, grav: -1200, floor: 3, drag: .8, jit: b.r });
        burst({ x: X2, y: b.y, z: b.r, n: 30, speed: 520, up: [100, 500], life: .7, size: 9, color: '#fff6d8', add: true, grav: -300, drag: 2 });
        burst({ x: X2, y: b.y, z: b.r, n: 12, speed: 200, up: [80, 300], life: 1.2, size: 8, color: b.def.acc, shape: 1, spin: 10, grav: -1000, floor: 3 });
        flashes.push({ x: b.x, y: b.y, z: 30, r: 110, col: [1, .95, .85], a: 1, t: 0, life: .4 });
        ring(b.x, b.y, '#ffffff', 20, 190, .7, .1);
        ring(b.x, b.y, c, 10, 130, .9, .2);
        V.shake(12); V.punch(.05);
        return 0;
      }
    }
    return 0;
  };
  V.confetti = (x, y, cols) => {
    for (const c of cols) burst({ x: wx(x), y, z: 60, n: 40, speed: 380, up: [300, 700], life: 2.4, size: 8, color: c, shape: 1, spin: 18, grav: -700, drag: 1.2, floor: 1 });
  };

  /* ---- the preview pass ----
     items: [{ id, x, y, size, turn (the weapon's angle), roll, flip (1 =
     face on, 0 = edge on), alpha, glow }] — size is about the width in
     pixels the ball and its weapon take up. */
  const pmats = [];
  function pmat(n, alpha) {
    const m = pmats[n] || (pmats[n] = {
      ball: R3.mat({ kind: K.PLAIN, spec: 1, gloss: 120, wrap: .35 }),
      face: R3.mat({ kind: K.PLAIN, spec: 1, gloss: 160, wrap: .3 }),
      plain: R3.mat({ kind: K.PLAIN, spec: .4, gloss: 40, wrap: .3 }),
      metal: R3.mat({ kind: K.METAL, c1: L(BBModels.METALS.steel), spec: 1.1, gloss: 140, wrap: .2 }),
      iron: R3.mat({ kind: K.METAL, c1: L(BBModels.METALS.iron), spec: 1.1, gloss: 140, wrap: .2 }),
      brass: R3.mat({ kind: K.METAL, c1: L(BBModels.METALS.brass), spec: 1.1, gloss: 140, wrap: .2 }),
      bmetal: R3.mat({ kind: K.METAL, c1: L(BBModels.METALS.steel), spec: 1.1, gloss: 140, wrap: .2 }),
      glow: R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [.8, .2, 0, 0], alpha: .92 }),
      bglow: R3.mat({ kind: K.GLOW, tint: [1, 1, 1], p1: [1, .3, 0, 0] }),
      seg: R3.mat({ kind: K.PLAIN, tint: L('#8bd83a'), spec: .7, gloss: 80 }),
      seg2: R3.mat({ kind: K.PLAIN, tint: L('#ffe066'), spec: .7, gloss: 80 })
    });
    for (const k in m) { m[k].alpha = (k === 'glow' ? .92 : 1) * alpha; m[k].blend = m[k].alpha < .99; }
    return m;
  }
  const pq = Q.make();
  /* A ball held in something (a card, a tile, a portrait) comes with
     `clip`, a function that traces its holder's outline, and `bb`, the box
     round that outline, and is shown only inside it. Those are drawn in a
     pass of their own, so the loose ones (the VS screen's, the results')
     can be laid on without one. `fit` is the most any of the ball and its
     weapon may reach from the middle, in pixels: a ball with a long weapon
     is drawn a little smaller rather than poke out. */
  V.preview = (ctx, items, t) => {
    const list = items.filter(it => (it.alpha === undefined || it.alpha > .01) && BB_BY[it.id]);
    if (!list.length) return;
    const held = list.filter(it => it.clip), loose = list.filter(it => !it.clip);
    if (loose.length) { pass(loose, t); ctx.drawImage(R3.canvas, 0, 0, W, H); }
    if (!held.length) return;
    pass(held, t);
    const base = ctx.getTransform(), kx = R3.canvas.width / W, ky = R3.canvas.height / H;
    for (const it of held) {
      const bb = it.bb || [0, 0, W, H];
      const x0 = clamp(Math.floor(bb[0]) - 2, 0, W), y0 = clamp(Math.floor(bb[1]) - 2, 0, H);
      const x1 = clamp(Math.ceil(bb[0] + bb[2]) + 2, 0, W), y1 = clamp(Math.ceil(bb[1] + bb[3]) + 2, 0, H);
      if (x1 - x0 < 1 || y1 - y0 < 1) continue;
      ctx.save();
      ctx.beginPath();
      it.clip(ctx);
      ctx.clip();
      ctx.setTransform(base);
      ctx.drawImage(R3.canvas, x0 * kx, y0 * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }
  };
  function pass(items, t) {
    R3.begin(pcam, penv, t);
    for (const p of pools) p.reset();
    items.forEach((it, n) => {
      const def = BB_BY[it.id], w = def.w, id = def.id;
      const g = pcam.toGround(it.x, it.y, 0), g2 = pcam.toGround(it.x + 10, it.y, 0);
      const upp = Math.hypot(g2.x - g.x, g2.y - g.y) / 10;
      /* every ball the same size for its radius, whatever it carries (a ball
         of 30 fills a little under half the width asked for), unless its
         weapon would then reach past `fit` */
      const s = Math.min(it.size * .235 * upp / 30, it.fit ? it.fit * upp / BBModels.reach(def) : Infinity);
      const r = def.r * s, K3 = kit(id), m = pmat(n, it.alpha === undefined ? 1 : it.alpha);
            const gl = it.glow ? it.glow * .5 : 0;
      m.ball.emit = id === 'ghost' ? [.16 + gl, .13 + gl, .3 + gl] : [gl, gl, gl];
      m.face.emit = [gl, gl, gl];
      pq[0] = 0; pq[1] = 0; pq[2] = 0; pq[3] = 1;
      Q.turn(pq, 0, 0, 1, it.roll || 0);
      if (!NOROLL[id]) Q.turn(pq, 1, 0, 0, .5);
      const flip = it.flip === undefined ? 1 : it.flip;
      const squash = mm => { mm[0] *= flip; mm[4] *= flip; mm[8] *= flip; mm[12] = g.x + (mm[12] - g.x) * flip; return mm; };
      const bz = id === 'ghost' ? r * .12 : 0;
      M4.quat(T, pq, r, g.x, g.y, bz);
      squash(T);
      R3.draw(K3.ball, T, m.ball);
      if (K3.ballMetal) { m.bmetal.c1 = L(BBModels.METALS[K3.metalC]); R3.draw(K3.ballMetal, T, m.bmetal); }
      if (K3.ballGlow) R3.draw(K3.ballGlow, T, m.bglow);
      if (K3.face) {
        /* faces look out of the card, glancing about */
        const yaw = Math.PI / 2 + .38 * Math.sin((it.roll || 0) * 1.7);
        R3.draw(K3.face, squash(M4.place(T, g.x, g.y, bz, yaw, r)), m.face);
      }
      const ang = it.turn === undefined ? -Math.PI / 2 : it.turn;
      const mats = { metal: m.metal, plain: m.plain, glow: m.glow, iron: m.iron, brass: m.brass };
      if (w.kind === 'orb') {
        for (let k = 0; k < w.n; k++) {
          const aa = ang + k * TAU / w.n, d = (def.r + w.dist) * s;
          rig(K3.rig, squash(M4.place(T, g.x + Math.cos(aa) * d, g.y + Math.sin(aa) * d, 0, t * 2 + k, s)), mats);
        }
      } else if (w.kind === 'tail') {
        /* the tail curled round behind it */
        for (let j = 0; j < 7; j++) {
          const rr = (12 - j * .9) * s, aa = ang + Math.PI * .55 + j * .36, d = (def.r + 9 + j * 1.6) * s;
          R3.draw(M.seg, squash(M4.place(T, g.x + Math.cos(aa) * d, g.y + Math.sin(aa) * d, -r + rr, 0, rr)), j & 1 ? m.seg2 : m.seg);
        }
      } else if (w.kind === 'bomb') {
        R3.draw(M.bomb, squash(M4.place(T, g.x + r * 1.1, g.y + r * .55, -r + 12 * s, 0, 12 * s)), m.plain);
      } else if (w.kind === 'flail') {
        /* the head swung out a little behind its chain */
        rig(K3.rig, squash(M4.place(T, g.x, g.y, 0, ang, s)), mats);
        const L0 = (def.r + w.len) * s, c = Math.cos(ang), sn = Math.sin(ang), n2 = 7;
        for (let k = 0; k < n2; k++) {
          const u = (k + .5) / n2, d = (def.r + 4) * s + (L0 - (def.r + 4) * s - w.hr * .6 * s) * u;
          const px = g.x + c * d, py = g.y + sn * d;
          if (k & 1) M4.axes(T, [c * s, sn * s, 0], [0, 0, s], [sn * s, -c * s, 0], [px, py, 0]);
          else M4.axes(T, [c * s, sn * s, 0], [-sn * s, c * s, 0], [0, 0, s], [px, py, 0]);
          rig(K3.parts.link, squash(T), mats);
        }
        rig(K3.parts.head, squash(M4.place(T, g.x + c * L0, g.y + sn * L0, 0, t * 1.5, s)), mats);
      } else if (w.kind === 'saw') {
        rig(K3.rig, squash(M4.place(T, g.x, g.y, 0, ang, s)), mats);
        const d = (def.r + w.gap + w.sr) * s;
        rig(K3.parts.disc, squash(M4.place(T, g.x + Math.cos(ang) * d, g.y + Math.sin(ang) * d, 0, t * 9, s)), mats);
      } else if (w.kind === 'comet') {
        /* its tail, streaming away behind */
        const bk = ang + Math.PI, al = it.alpha === undefined ? 1 : it.alpha;
        [[1, [1, .58, .16, 1]], [.5, [1, .92, .6, 1]]].forEach(([k, col], layer) => {
          const gg = Gfx3D.Geo(), n2 = 10;
          for (let j = 0; j <= n2; j++) {
            const u = j / n2, d = r * (.1 + u * 3.2 * k), wd = r * (1.05 - u * .9) * k, px = g.x + Math.cos(bk) * d, py = g.y + Math.sin(bk) * d;
            gg.v(px - Math.sin(bk) * wd, py + Math.cos(bk) * wd, 0, 0, 0, 1, [1, 1, 1, 1], 1 - u, 1);
            gg.v(px + Math.sin(bk) * wd, py - Math.cos(bk) * wd, 0, 0, 0, 1, [1, 1, 1, 1], 1 - u, -1);
          }
          for (let j = 0; j < n2; j++) { const q = j * 2; gg.q(q, q + 2, q + 3, q + 1); }
          const dm = previewTail(n * 2 + layer);
          dm.set(gg);
          const fm = trailP.get(); fm.color = [col[0], col[1], col[2], col[3] * al];
          R3.fx(dm, ID, fm);
        });
      } else if (K3.rig && Object.keys(K3.rig).length) {
        const off = w.kind === 'spell' ? -.9 : 0;
        rig(K3.rig, squash(M4.place(T, g.x, g.y, 0, ang + off, s)), mats);
      }
    });
    R3.end();
  }
  const ptails = [];
  const previewTail = n => ptails[n] || (ptails[n] = SC.dyn());
  V.dispose = () => { SC.dispose(); };
  V.particles = PS;
  return V;
}
