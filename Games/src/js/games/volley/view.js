/* ============================================================================
   Drawing a match: the beach at 1x into a 480×300 picture, blown up 2× onto
   the 960×600 stage, then the scoreboard, banners, controls and menus on
   top at the stage's own resolution (VolUI, in SocUI's pixel lettering).

   The picture: the backdrop (sky, sea and sand, from the art), the court's
   tape, and the net's shadow, painted once; then the marks in the sand,
   the shadows and the ball's landing ring; then everything that stands up,
   far to near: the crowd, the props, the umpire, the players, the ball,
   and the net, which is drawn a column at a time, each column in its own
   place in depth, so a player at the net is behind the part of it nearer
   the camera and in front of the rest.
   ========================================================================== */
const VOL_VIEW = { DROP: 14 };                     // the backdrop is drawn this far up: its horizon at 62

function volView(W) {
  const pix = document.createElement('canvas');
  pix.width = VOL.VW; pix.height = VOL.VH;
  const g = pix.getContext('2d');
  let bg = null, cols = null;
  const beach = volBeach(W);
  const X = (x, y) => Math.round(volSX(x, y)), Y = (y, z) => Math.round(volSY(y, z));

  /* ---- painted once ---- */
  function paint() {
    const c = document.createElement('canvas'); c.width = VOL.VW; c.height = VOL.VH;
    const b = c.getContext('2d');
    const bd = VolArt.A.backdrop;
    if (bd) b.drawImage(bd, 0, -VOL_VIEW.DROP);
    else { b.fillStyle = '#5cc6f0'; b.fillRect(0, 0, VOL.VW, 62); b.fillStyle = '#1f8fd0'; b.fillRect(0, 62, VOL.VW, 38); b.fillStyle = '#efd29a'; b.fillRect(0, 100, VOL.VW, 200); }
    const { CL, CD, NX, POST } = VOL;
    /* The line the net stands on, drawn into the sand like its shadow.
       Which side of it the ball comes down is whose side it is, and with
       the view leaning that reads more surely off the sand than off the
       net up in the air. */
    const under = new Map();
    for (let y = -POST; y <= CD + POST; y += .25) under.set(X(NX, y) + ',' + Y(y, 0), [X(NX, y), Y(y, 0)]);
    for (const [sx, sy] of under.values()) {
      b.fillStyle = 'rgba(110,74,30,.16)'; b.fillRect(sx - 2, sy, 5, 1);
      b.fillStyle = 'rgba(96,62,24,.3)'; b.fillRect(sx - 1, sy, 2, 1);
    }
    /* The tape: blue, pegged at the corners, with a line of shadow on the
       sand under it. The sidelines run straight across the picture, the
       end lines lean with the view. */
    const TAPE = '#2f6fd6', HI = '#6a9df0', SH = 'rgba(90,60,20,.18)';
    for (const y of [0, CD]) {
      const y0 = Y(y, 0);
      b.fillStyle = SH; b.fillRect(X(0, y), y0 + 1, CL + 1, 1);
      b.fillStyle = TAPE; b.fillRect(X(0, y), y0, CL + 1, 1);
    }
    for (const x of [0, CL]) {
      for (let y = 0; y <= CD; y += .25) {
        const sx = X(x, y), sy = Y(y, 0);
        b.fillStyle = SH; b.fillRect(sx + 2, sy, 1, 1);
        b.fillStyle = TAPE; b.fillRect(sx, sy, 2, 1);
        b.fillStyle = HI; b.fillRect(sx, sy, 1, 1);
      }
    }
    /* the corner pegs */
    for (const [x, y] of [[0, 0], [CL, 0], [0, CD], [CL, CD]]) { b.fillStyle = '#1b3f86'; b.fillRect(X(x, y) - 1, Y(y, 0) - 1, 3, 3); b.fillStyle = TAPE; b.fillRect(X(x, y), Y(y, 0), 1, 1); }
    return c;
  }
  /* The net, a column of the picture at a time: which part of it (the world
     y across the court each column shows) and where its top, cords and
     bottom fall in that column. The view leans the net over, so one column
     holds about four units of it. */
  function netCols() {
    const { NX, CD, NET, NETB, SH } = VOL, out = [];
    const c0 = Math.floor(volSX(NX, CD)), c1 = Math.ceil(volSX(NX, 0));
    for (let c = c0; c <= c1; c++) {
      const y = CD / 2 - (c + .5 - VOL.OX - NX) / SH, h = .5 / SH;
      if (y < -h * .5 || y > CD + h * .5) continue;
      const ya = Math.max(0, y - h), yb = Math.min(CD, y + h);
      out.push({ c, y, top: [volSY(ya, NET + .5), volSY(yb, NET - 1.5)], bot: [volSY(ya, NETB + .5), volSY(yb, NETB - .5)],
        cords: [NETB + 5, NETB + 10, NETB + 15].map(z => volSY(y, z)), odd: c & 1 });
    }
    return out;
  }
  function netCol(k) {
    const o = cols[k];
    const t0 = Math.round(o.top[0]), t1 = Math.round(o.top[1]), b0 = Math.round(o.bot[0]), b1 = Math.round(o.bot[1]);
    /* Where the ball has just gone over, the tape lights up; where it has
       hit the net, the net gives, pushed back a pixel or two, and shakes */
    const F = W.netFx, age = F ? W.t - F.at : 9, near = F && Math.abs(o.y - F.y) < (F.hit ? 16 : 9);
    const give = near && F.hit && age < .45 ? Math.round(F.dir * (1 - age / .45) * (2 - Math.abs(o.y - F.y) / 10) * (Math.floor(age * 30) % 2 ? .6 : 1)) : 0;
    const c = o.c + give, lit = near && !F.hit && age < .3 ? '#fad911' : near && F.hit && age < .3 ? '#ffffff' : '#f4f4f4';
    /* the mesh: see-through, a little dark, with its cords */
    g.fillStyle = 'rgba(16,20,34,.2)'; g.fillRect(c, t1 + 1, 1, Math.max(0, b0 - t1 - 1));
    g.fillStyle = 'rgba(16,20,34,.55)';
    for (const cy of o.cords) g.fillRect(c, Math.round(cy), 1, 1);
    if (o.odd) { g.fillStyle = 'rgba(16,20,34,.28)'; g.fillRect(c, t1 + 1, 1, Math.max(0, b0 - t1 - 1)); }
    /* the tape along the top, navy edged, and the band along the bottom */
    g.fillStyle = lit; g.fillRect(c, t0, 1, Math.max(1, t1 - t0 + 1));
    g.fillStyle = '#1b2f6e'; g.fillRect(c, t0 - 1, 1, 1);
    g.fillStyle = '#e6e6e6'; g.fillRect(c, b0, 1, Math.max(1, b1 - b0 + 1));
  }
  function arena() {
    bg = paint();
    cols = netCols();
    beach.build();
  }

  /* ---- the things in it ---- */
  function drawPlayer(p) {
    SocArt.frame(g, p.sheet, p.an, volFrame(p), X(p.x, p.y), Y(p.y, p.z), p.face);
  }
  function drawBall(b) {
    const squash = W.squash > 0;
    const pc = squash ? VolArt.piece('beach_ball', 'squash', 0) : VolArt.piece('beach_ball', 'ball', ((Math.floor(b.spin) % 8) + 8) % 8);
    VolArt.put(g, pc, X(b.x, b.y), Math.round(volSY(b.y, b.z) + pc.h / 2), 1);
  }
  const ellipse = (cx, cy, rx, ry, col) => {
    g.fillStyle = col;
    for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(1 - (j * j) / ((ry + .5) * (ry + .5)))); g.fillRect(cx - w, cy + j, w * 2 + 1, 1); }
  };
  /* a ring on the sand where the ball will come down */
  function ring(cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let a = 0; a < 40; a++) {
      const t = a / 40 * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1);
    }
  }
  function marks() {
    const L = W.marks;
    for (const m of L) {
      const life = m.k === 'step' ? 7 : m.k === 'ball' ? 12 : 14, a = volClamp(1 - m.t / life, 0, 1) * (m.k === 'step' ? .45 : .7);
      if (a <= .01) continue;
      g.globalAlpha = a;
      VolArt.put(g, VolArt.piece('beach_ball', 'marks', m.k === 'step' ? 0 : m.k === 'ball' ? 1 : 2), X(m.x, m.y), Y(m.y, 0) + (m.k === 'step' ? 2 : 1), m.face || 1);
    }
    g.globalAlpha = 1;
  }
  /* sea glints that come and go over the backdrop's own */
  function twinkle() {
    const t = Math.floor(W.t * 3);
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 16; i++) {
      const h = Math.sin(i * 91.7 + t * 12.9898) * 43758.5453, r = h - Math.floor(h);
      if (r < .5) continue;
      const x = Math.floor(((i * 37 + t * 13) % 97) / 97 * VOL.VW), y = 66 + Math.floor(((i * 53) % 29));
      g.fillRect(x, y, r > .8 ? 2 : 1, 1);
    }
  }

  function world() {
    const b = W.ball, { NX, CD, POST, NET } = VOL;
    g.imageSmoothingEnabled = false;
    g.drawImage(bg, 0, 0);
    twinkle();
    marks();
    /* shadows */
    for (const p of W.players) {
      const r = p.st === 'dive' ? 9 : 7 - Math.min(3, p.z / 8);
      ellipse(X(p.x, p.y), Y(p.y, 0), Math.round(r), 1, 'rgba(92,60,24,.26)');
    }
    const live = W.phase === 'rally' && !b.down && !b.held && !W.ruled;
    /* The ball's shadow, dark enough to find at a glance: it is where the
       ball really is, whatever the view makes of it up in the air. Near the
       net a dotted line joins the two. */
    if (!b.hidden) {
      const s = volClamp(b.z / 90, 0, 1);
      ellipse(X(b.x, b.y), Y(b.y, 0), Math.round(5 - s * 2), s > .6 ? 0 : 1, `rgba(70,44,16,${(.5 - s * .22).toFixed(2)})`);
      if (live && b.z > 14 && Math.abs(b.x - NX) < 48) {
        const x = X(b.x, b.y), y0 = Math.round(volSY(b.y, b.z)) + 6, y1 = Y(b.y, 0) - 2;
        for (let y = y0; y < y1; y += 4) { g.fillStyle = 'rgba(70,44,16,.35)'; g.fillRect(x + 1, y + 1, 1, 2); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x, y, 1, 2); }
      }
    }
    /* where the last point came down: a ring on the spot, the umpire's call over it */
    const R = W.ruled;
    if (R && R.in !== undefined && (W.phase === 'point' || W.phase === 'over')) {
      const k = volClamp(R.t / .25, 0, 1), r = 6 + Math.round(Math.sin(W.t * 9) * 1.2);
      ring(X(R.x, R.y), Y(R.y, 0), Math.round(r * k) + 1, Math.round(r * .55 * k) + 1, R.in ? '#ffffff' : '#ff5a4a');
    }
    /* the landing ring: where the ball comes down, while it is in the air */
    if (live && b.vz < 120) {
      const L = volLanding(b), mine = W.me && volSide(L.x) === W.me.team.i;
      const flash = L.t < .45 && Math.floor(W.t * 14) % 2 === 0;
      ring(X(L.x, L.y), Y(L.y, 0), 6, 3, mine ? (flash ? '#ffffff' : '#fad911') : 'rgba(255,255,255,.55)');
    }
    /* everything that stands up, far to near */
    const list = [];
    beach.items(list, g);
    for (const p of W.players) list.push({ y: p.y, d: () => drawPlayer(p) });
    if (!b.hidden) list.push({ y: b.y + .05, d: () => drawBall(b) });
    const post = VolArt.A.sheets.beach_net ? VolArt.piece('beach_net', 'post', 0) : null, ant = post ? VolArt.piece('beach_net', 'post', 1) : null;
    cols.forEach((o, k) => list.push({ y: o.y, d: () => netCol(k) }));
    for (const [y, ay] of [[-POST, 0], [CD + POST, CD]]) {
      list.push({ y, d: () => {
        if (post) VolArt.put(g, post, X(NX, y), Y(y, 0), 1);
        else { g.fillStyle = '#9aa0ac'; g.fillRect(X(NX, y) - 1, Y(y, NET + 4), 3, NET + 4); }
        /* the ropes from the net's ends to the post */
        g.fillStyle = '#f4f4f4';
        const x0 = X(NX, ay), x1 = X(NX, y);
        for (const z of [NET, VOL.NETB]) { const y0 = Y(ay, z), y1 = Y(y, z + 2); for (let k = 0; k <= 4; k++) g.fillRect(Math.round(x0 + (x1 - x0) * k / 4), Math.round(y0 + (y1 - y0) * k / 4), 1, 1); }
      } });
      list.push({ y: ay + (ay ? .02 : -.02), d: () => { if (ant) VolArt.put(g, ant, X(NX, ay), Y(ay, NET - 2), 1); } });
    }
    list.sort((a, c) => a.y - c.y);
    for (const o of list) o.d();
    /* sand thrown up */
    for (const f of W.fx) {
      const a = f.k === 'spray' ? 'spray' : f.k === 'splash' ? 'splash' : 'puff', A = VolArt.A.sheets.beach_ball.meta.anims[a];
      const i = Math.floor(f.t / A.t);
      if (i >= A.frames) continue;
      VolArt.put(g, VolArt.piece('beach_ball', a, i), X(f.x, f.y), Y(f.y, 0) + 1, f.face || 1);
    }
    /* the 1P tag over the player you steer */
    const me = W.me;
    if (me && (W.phase === 'rally' || W.phase === 'serve') && me.st !== 'serve') {
      const x = X(me.x, me.y), y = Y(me.y, me.z) - 44 + Math.round(Math.sin(W.t * 7) * 1.2);
      g.fillStyle = '#120b0b'; g.fillRect(x - 4, y - 1, 9, 2); g.fillRect(x - 3, y + 1, 7, 1); g.fillRect(x - 2, y + 2, 5, 1); g.fillRect(x - 1, y + 3, 3, 1); g.fillRect(x, y + 4, 1, 1);
      g.fillStyle = '#fad911'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x - 2, y + 1, 5, 1); g.fillRect(x - 1, y + 2, 3, 1); g.fillRect(x, y + 3, 1, 1);
    }
  }

  /* world to stage */
  const sx = (x, y) => volSX(x, y) * VOL.SCALE, sy = (y, z) => volSY(y, z) * VOL.SCALE;

  function render(ctx) {
    const U = SocUI;
    U.frame();
    world();
    ctx.imageSmoothingEnabled = false;
    /* a spike shakes the picture a pixel or two */
    const sh = W.shake > 0 ? Math.round(Math.sin(W.t * 90) * 2) : 0;
    ctx.drawImage(pix, sh, 0, VOL.VW * VOL.SCALE, VOL.VH * VOL.SCALE);
    if (W.phase === 'menu') { W.menu && W.menu.render(ctx); fade(ctx); return; }
    const b = W.ball, me = W.me;
    /* your partner calling for it */
    for (const p of W.players) if (p.call && W.t - p.call < .9 && p !== me && p.team === (me && me.team)) VolUI.call(ctx, sx(p.x, p.y), sy(p.y, p.z + 44), W.t - p.call);
    /* online, everyone else a person steers has their name over them */
    if (W.phase !== 'over') for (const p of W.players) if (p.name && p !== me) U.nameTag(ctx, p.name, sx(p.x, p.y), sy(p.y, p.z + 46), p.team.kit.chip);
    /* the ball off the top or the sides of the picture: a pointer on the edge */
    if (W.phase === 'rally' && !b.down) {
      const bx = sx(b.x, b.y), by = sy(b.y, b.z);
      if (by < 0) U.edgeArrow(ctx, volClamp(bx, 26, 934), 70, -Math.PI / 2, '#fad911');
      else if (bx < 0 || bx > 960) U.edgeArrow(ctx, volClamp(bx, 26, 934), volClamp(by, 90, 540), bx < 0 ? Math.PI : 0, '#fad911');
    }
    VolUI.serveMeter(ctx, W, sx, sy);
    /* the call on the spot where it came down: in or out */
    const R = W.ruled;
    if (R && R.in !== undefined && W.phase === 'point') VolUI.lineCall(ctx, sx(R.x, R.y), sy(R.y, 0) - 26, R.in, R.t);
    U.confetti(ctx, W);
    U.banner(ctx, W);
    VolUI.scoreboard(ctx, W);
    VolUI.controls(ctx, W);
    VolUI.hint(ctx, W);
    if (W.phase === 'over' && W.deadT > 1.6 && !W.hosted) W.resHits = VolUI.results(ctx, W, W.deadT - 1.6, W.resSel);
    else W.resHits = null;
    fade(ctx);
  }
  function fade(ctx) {
    if (!W.trans) return;
    const T = W.trans, a = 1 - Math.abs(T.t - T.dur / 2) / (T.dur / 2);
    ctx.fillStyle = `rgba(12,10,22,${Math.max(0, Math.min(1, a * 1.15))})`; ctx.fillRect(0, 0, 960, 600);
  }
  return { render, arena, pix, get ump() { return beach.ump; } };
}
