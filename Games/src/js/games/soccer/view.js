/* Drawing a match: the world at 1x into a 480×300 buffer, blown up 2× onto
   the 960×600 stage (wide enough to see most of the arena at once), then
   the scoreboard, banners, controls and menus on top at stage resolution, in
   the game's own pixel lettering (SocUI). Every tween in those is timed on
   the render clock (SocUI.frame), not on the fixed update step. */
function socView(W) {
  const A = SocArt.A.pieces;
  const pix = document.createElement('canvas');
  const g = pix.getContext('2d');
  let field = null, G = null;
  const crowd = socCrowd(W);

  /* the arena for the mode being played, and its stands and crowd:
     repainted when it changes */
  function arena() {
    pix.width = SOC.VW; pix.height = SOC.VH;
    field = SocArt.pitch(SOC.PL, SOC.PD, SOC.MX, SOC.MY);
    G = SocArt.goals(SOC.GCUT);
    crowd.build();
  }

  function drawPlayer(p, cx, cy) {
    const x = Math.round(p.x) - cx, y = Math.round(p.y) - cy, z = Math.round(p.z);
    SocArt.frame(g, p.sheet, p.an, socFrame(p), x, y - z, p.face);
  }
  function drawBall(b, cx, cy) {
    const f = Math.floor(b.roll / 7) % 4;
    g.drawImage(A.ball, f * 10, 0, 10, 10, Math.round(b.x) - 5 - cx, Math.round(b.y - b.z) - 9 - cy, 10, 10);
  }
  const ballShadow = (b, cx, cy) => g.drawImage(A.shadows, 16, 1, 8, 3, Math.round(b.x) - 4 - cx, Math.round(b.y) - 1 - cy, 8, 3);

  function world() {
    const { PL, PD, MX, MY } = SOC, mid = PD / 2;
    g.imageSmoothingEnabled = false;
    const cx = Math.round(W.cam.x), cy = Math.round(W.cam.y), b = W.ball;
    g.fillStyle = '#0c120e'; g.fillRect(0, 0, pix.width, pix.height);
    /* the stands and their crowd, then the arena over their foot */
    crowd.draw(g, cx, cy);
    g.drawImage(field.cv, -MX - cx, -MY - cy);
    /* Over the line, the ball is inside the goal, under the net: the goal
       art is seen from above, so its back piece is the roof and the back of
       the net at once. Drawn first, the mesh then crosses it. */
    const inGoal = !b.hidden && (b.inNet || b.x < 0 || b.x > PL);
    if (inGoal) {
      g.globalAlpha = .28; ballShadow(b, cx, cy); g.globalAlpha = 1;
      drawBall(b, cx, cy);
    }
    const gy = Math.round(mid - G.h / 2) - cy;
    g.drawImage(G.back, -41 - cx, gy);
    g.drawImage(G.back_r, PL - 7 - cx, gy);
    /* shadows on the grass under everything */
    const r = W.ref;
    g.globalAlpha = .28;
    for (const p of W.players) g.drawImage(A.shadows, 0, 0, 16, 5, Math.round(p.x) - 8 - cx, Math.round(p.y) - 2 - cy, 16, 5);
    if (r) g.drawImage(A.shadows, 0, 0, 16, 5, Math.round(r.x) - 8 - cx, Math.round(r.y) - 2 - cy, 16, 5);
    if (!b.hidden && !inGoal) ballShadow(b, cx, cy);
    g.globalAlpha = 1;
    /* everything that stands up, far to near; the referee, on the far
       touchline, behind them all, even someone nearer the boards than him */
    const list = W.players.map(p => ({ y: p.y, d: () => drawPlayer(p, cx, cy) }));
    if (r) list.push({ y: -1e9, d: () => drawPlayer(r, cx, cy) });
    if (!b.hidden && !inGoal) list.push({ y: b.y + .1, d: () => drawBall(b, cx, cy) });
    list.push({ y: mid + SOC.POST + .5, d: () => { g.drawImage(G.front, -41 - cx, gy); g.drawImage(G.front_r, PL - 7 - cx, gy); } });
    list.sort((a, c) => a.y - c.y);
    for (const o of list) o.d();
    for (const f of W.fx) {
      if (f.k === 'dust') g.drawImage(A.dust, Math.min(4, Math.floor(f.t / .064)) * 16, 0, 16, 16, Math.round(f.x) - 8 - cx, Math.round(f.y) - 14 - cy, 16, 16);
      else g.drawImage(A.spark, Math.min(2, Math.floor(f.t / .06)) * 16, 0, 16, 16, Math.round(f.x) - 8 - cx, Math.round(f.y) - 8 - cy, 16, 16);
    }
    /* the 1P tag over the player you steer */
    const c = W.me;
    if (c && W.phase !== 'goal' && W.phase !== 'fulltime') {
      const bob = Math.round(Math.sin(W.t * 7) * 1.2);
      g.drawImage(A.markers, 0, 0, 16, 16, Math.round(c.x) - 8 - cx, Math.round(c.y - c.z) - 46 - cy + bob, 16, 16);
    }
  }

  /* world to stage */
  const sx = x => (x - W.cam.x) * SOC.SCALE, sy = y => (y - W.cam.y) * SOC.SCALE;

  function render(ctx) {
    const U = SocUI;
    U.frame();
    world();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pix, 0, 0, SOC.VW * SOC.SCALE, SOC.VH * SOC.SCALE);
    if (W.phase === 'menu') { W.menu && W.menu.render(ctx); fade(ctx); return; }
    if (W.phase === 'lineup') { if (W.lineup) W.lineup.render(ctx); fade(ctx); return; }
    const b = W.ball, hp = W.me;
    /* online, everyone else a person steers has their name over their head */
    if (W.phase !== 'fulltime') for (const p of W.players) if (p.name && p !== hp) U.nameTag(ctx, p.name, sx(p.x), sy(p.y - p.z - 36), p.team.kit.chip);
    /* "HERE!" over you when you call for it */
    if (hp && hp.shout > 0 && W.phase === 'play') U.shout(ctx, sx(hp.x), sy(hp.y - hp.z - 50), hp.shout);
    /* the ball off the edge of the view: a pointer on the edge */
    if (W.phase === 'play' || W.phase === 'kickoff') {
      const bx = sx(b.x), by = sy(b.y - b.z);
      if (bx < 0 || bx > 960) {
        const ex = socClamp(bx, 26, 934), ey = socClamp(by, 90, 540);
        U.edgeArrow(ctx, ex, ey, bx < 0 ? Math.PI : 0, '#fad911');
      }
    }
    U.confetti(ctx, W);
    U.banner(ctx, W);
    U.scoreboard(ctx, W);
    U.controls(ctx, W);
    /* the full-time card is the test page's; in the arcade the results page is */
    if (W.phase === 'fulltime' && W.deadT > 1.2 && !W.hosted) W.resHits = U.results(ctx, W, W.deadT - 1.2, W.resSel);
    else W.resHits = null;
    fade(ctx);
  }
  function fade(ctx) {
    if (!W.trans) return;
    const T = W.trans, a = 1 - Math.abs(T.t - T.dur / 2) / (T.dur / 2);
    ctx.fillStyle = `rgba(12,10,22,${Math.max(0, Math.min(1, a * 1.15))})`; ctx.fillRect(0, 0, 960, 600);
  }
  return { render, arena, pix };
}
