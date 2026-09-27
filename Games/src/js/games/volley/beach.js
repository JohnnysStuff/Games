/* ============================================================================
   The beach round the court: the props, the crowd on the sand behind it,
   the umpire on her chair at the far post, and the gulls and a crab.

   None of it touches the match. The crowd reacts to what happens (W.crowd,
   set on every screen alike): a point gets the winners' fans up cheering
   and waving their towels while the others groan, a long rally gets a clap.
   The umpire blows for every point, signals it in or out, and points to
   the side that serves next (volUmpDo, from the match). A gull pecking at
   the sand takes off when the ball lands near it or someone runs at it,
   and another comes down somewhere else later; a crab now and then crosses
   the near side of the court. Everything here runs on the render clock.

   World positions, like the players': x along the court, y across it (the
   far sideline at 0), so each thing is drawn in its place in depth.
   ========================================================================== */
/* the props: which piece, and where it stands. The water's edge is at about
   y -50; the far sideline at 0. */
const VOL_PROPS = [
  { an: 'tall', f: 0, x: -108, y: -24, face: 1 },         // palm, left
  { an: 'tall', f: 0, x: 318, y: -30, face: -1 },         // palm, right
  { an: 'tall', f: 1, x: -40, y: -46, face: 1 },          // lifeguard tower
  { an: 'tall', f: 3, x: 40, y: -30, face: 1 },           // umbrella
  { an: 'tall', f: 3, x: 238, y: -40, face: -1 },         // umbrella
  { an: 'small', f: 0, x: -72, y: -38, face: 1 },         // surfboard, stuck in the sand
  { an: 'small', f: 1, x: 200, y: -22, face: 1 },         // cool box
  { an: 'small', f: 3, x: 290, y: -46, face: 1 },         // life ring
  { an: 'small', f: 2, x: -8, y: 190, face: 1 }           // sandcastle, near side
];
/* the umpire's chair at the far post, and where she sits on it (her feet
   dangle this high over the sand) */
const VOL_UMP = { x: VOL.NX + 1, y: -17, seat: 24 };

/* An umpire's action: an animation played through and held `hold` seconds
   more, `wait` seconds from now, facing `face` (her gestures are drawn to
   her left, the picture's right; -1 mirrors them) */
function volUmpDo(u, an, wait = 0, face = 1, hold = 0) { if (u) u.q.push({ an, wait, face, hold }); }

function volBeach(W) {
  const S = { props: [], fans: [], gulls: [], crab: null, flyers: [], ump: null, lastEv: 0, lastMs: 0, crabIn: volRand(6, 14), flyIn: volRand(4, 10) };
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const HAIR = ['brown', 'brown', 'black', 'black', 'blond', 'ginger'], TONE = ['light', 'light', 'tan', 'brown', 'dark'];
  const NEUTRAL = ['#ececec', '#e2616a', '#8a6fd8', '#2fb3a4', '#f08a3c'];

  function build() {
    S.props = VOL_PROPS.map(p => Object.assign({ piece: VolArt.piece('beach_props', p.an, p.f) }, p));
    S.chair = VolArt.piece('beach_props', 'tall', 2);
    S.ump = { an: 'sit', at: 0, face: 1, act: null, q: [], sheet: VolArt.dress('volley_umpire', {}) };
    /* The crowd: sitting on towels in a loose band behind the court, the
       home side's fans to the left and the visitors' to the right in their
       colours, a few neutrals, and a couple standing by each palm */
    const T = W.teams, looks = [[], [], []];
    const kitShirt = k => k.shirt || '#f3ba06';
    for (let i = 0; i < 6; i++) {
      looks[0].push(VolArt.dress('beach_fans', { shirt: kitShirt(T[0].kit), trim: T[0].kit.trim, hair: pick(HAIR), tone: pick(TONE) }));
      looks[1].push(VolArt.dress('beach_fans', { shirt: kitShirt(T[1].kit), trim: T[1].kit.trim, hair: pick(HAIR), tone: pick(TONE) }));
      looks[2].push(VolArt.dress('beach_fans', { shirt: pick(NEUTRAL), trim: '#f4f4f4', shorts: pick(['#1f2a4a', '#3a3a52', '#153a89']), hair: pick(HAIR), tone: pick(TONE) }));
    }
    const busy = S.props.filter(p => p.y < 0).map(p => ({ x: p.x, y: p.y, r: p.an === 'tall' ? 16 : 10 })).concat([{ x: VOL_UMP.x, y: VOL_UMP.y, r: 20 }]);
    S.fans = [];
    for (const [row, y0] of [[0, -44], [1, -35], [2, -26]]) {
      for (let x = -132 + row * 7; x < 336; x += volRand(13, 22)) {
        const y = y0 + volRand(-2, 2);
        if (busy.some(b => Math.abs(b.x - x) < b.r && Math.abs(b.y - y) < 12)) continue;
        if (Math.random() < .22) continue;
        const side = Math.random() < .14 ? 2 : Math.abs(x - VOL.NX) < 24 ? (Math.random() < .5 ? 0 : 1) : x < VOL.NX ? 0 : 1;
        S.fans.push({ x: Math.round(x), y, side, sheet: pick(looks[side]), face: Math.random() < .5 ? 1 : -1, an: 'sit', t: Math.random() * 2, plan: [], until: 0, wait: 0,
          towel: pick(['#e2616a', '#2f8fd6', '#f3ba06', '#7bc47f', '#f4f4f4', '#b36be0']), sit: true });
      }
    }
    /* standing by the palms */
    for (const [x, y, side] of [[-100, -14, 0], [-84, -6, 0], [300, -16, 1], [330, -10, 1]]) {
      S.fans.push({ x, y, side, sheet: pick(looks[side]), face: x < 0 ? 1 : -1, an: 'stand', t: 0, plan: [], until: 0, wait: 0, sit: false });
    }
    /* gulls on the sand at the edges */
    S.gulls = [];
    for (const [x, y] of [[0, 178], [380, 110], [-100, -6]]) S.gulls.push(gull(x, y));
    S.crab = null;
  }
  function gull(x, y) { return { x, y, z: 0, vx: 0, vz: 0, face: Math.random() < .5 ? 1 : -1, an: 'gull_stand', t: Math.random() * 2, next: volRand(1, 4), flying: false }; }

  /* ---- the crowd ---- */
  function plan(f, list, delay) { f.plan = list.map(q => q.slice()); f.wait = delay || 0; f.until = 0; }
  const rest = f => (f.sit ? 'sit' : 'stand');
  function react(e) {
    const [kind, side] = e;
    for (const f of S.fans) {
      const r = Math.random(), d = r * .35;
      if (kind === 'rally') { if (r < .5) plan(f, [[f.sit ? 'clap' : 'standclap', 1 + r * 1.5]], d); }
      else if (kind === 'point' || kind === 'win') {
        const long = kind === 'win' ? 9 : 2.6;
        if (f.side === side) plan(f, [['cheer', 1.2 + r * .6], [pick(['wave', 'towel', 'standclap']), long]], d);
        else if (f.side === 2) plan(f, [[f.sit ? 'clap' : 'standclap', 1.4 + r]], d + .3);
        else plan(f, [['groan', kind === 'win' ? 9 : 1.8 + r]], d + .15);
      }
    }
  }
  function frameOf(sheet, an, t) {
    const a = sheet.meta.anims[an], i = Math.floor(t / a.t);
    if (a.loop) return i % a.frames;
    if (a.tail && i >= a.frames) return a.frames - a.tail + Math.floor((t - a.frames * a.t) / Math.max(a.t, .18)) % a.tail;
    return Math.min(a.frames - 1, i);
  }

  /* ---- the step, on the render clock ---- */
  function step(dt) {
    const ev = W.crowd;
    if (ev && ev.id !== S.lastEv) { S.lastEv = ev.id; react(ev.e); }
    for (const f of S.fans) {
      f.t += dt;
      if (f.wait > 0) { f.wait -= dt; continue; }
      if (f.plan.length && !f.until) { const [an, d] = f.plan.shift(); f.an = an; f.t = 0; f.until = d; }
      if (f.until) { f.until -= dt; if (f.until <= 0) { f.until = 0; if (!f.plan.length) { f.an = rest(f); f.t = Math.random(); } } }
      else if (f.an === rest(f) && Math.random() < dt * .012) plan(f, [[f.sit ? 'clap' : 'standclap', 1 + Math.random()]]);
    }
    umpStep(dt);
    gullsStep(dt);
    crabStep(dt);
  }
  function umpStep(dt) {
    const u = S.ump;
    if (!u) return;
    if (!u.act && u.q.length) {
      const q = u.q[0];
      q.wait -= dt;
      if (q.wait <= 0) {
        u.q.shift();
        const a = u.sheet.meta.anims[q.an];
        u.act = { t: 0, dur: a.frames * a.t + q.hold }; u.an = q.an; u.at = 0; u.face = q.face;
      }
    }
    u.at += dt;
    if (u.act) { u.act.t += dt; if (u.act.t >= u.act.dur) { u.act = null; u.an = 'sit'; u.at = 0; u.face = 1; } }
  }
  /* A gull pecks about, and takes off when the ball comes down near it or
     someone runs at it; it flaps up, glides off the side of the picture,
     and another comes back down a while later. */
  function gullsStep(dt) {
    const b = W.ball;
    for (const g of S.gulls) {
      g.t += dt;
      if (!g.flying) {
        const near = W.players.some(p => volDist(p.x, p.y, g.x, g.y) < 26) || (b && !b.held && b.z < 30 && volDist(b.x, b.y, g.x, g.y) < 34);
        if (near) { g.flying = true; g.an = 'gull_fly'; g.t = 0; g.face = g.x < VOL.NX ? -1 : 1; g.vx = g.face * volRand(60, 90); g.vz = 55; if (Math.random() < .5) W.sound('gull'); continue; }
        g.next -= dt;
        if (g.next <= 0) { g.an = g.an === 'gull_stand' ? 'gull_peck' : 'gull_stand'; g.t = 0; g.next = volRand(1.5, 4); if (Math.random() < .3) g.face = -g.face; }
      } else {
        g.x += g.vx * dt; g.z += g.vz * dt; g.vz = Math.max(8, g.vz - 60 * dt);
        if (g.z > 40 && g.an === 'gull_fly' && g.t > .6) { g.an = 'gull_glide'; g.t = 0; }
        if (g.x < -150 || g.x > 470) { g.gone = true; }
      }
    }
    /* one gone is replaced after a while, landing somewhere quiet */
    for (let i = 0; i < S.gulls.length; i++) {
      const g = S.gulls[i];
      if (!g.gone) continue;
      g.back = (g.back ?? volRand(6, 14)) - dt;
      if (g.back > 0) continue;
      const spots = [[0, 178], [380, 110], [-100, -6], [-40, 150], [320, -8], [400, 150]];
      const [x, y] = pick(spots);
      S.gulls[i] = Object.assign(gull(x, y), { z: 30, landing: true, an: 'gull_glide', flying: false });
    }
    for (const g of S.gulls) if (g.landing) { g.z = Math.max(0, g.z - 30 * dt); if (g.z <= 0) { g.landing = false; g.an = 'gull_stand'; } }
  }
  /* now and then a crab crosses the near side, stopping to snap */
  function crabStep(dt) {
    if (!S.crab) {
      S.crabIn -= dt;
      if (S.crabIn <= 0) { const l = Math.random() < .5; S.crab = { x: l ? -130 : 450, y: volRand(174, 196), dir: l ? 1 : -1, an: 'crab_walk', t: 0, stop: volRand(2, 5) }; }
      return;
    }
    const c = S.crab;
    c.t += dt;
    if (c.an === 'crab_walk') {
      c.x += c.dir * 16 * dt; c.stop -= dt;
      if (c.stop <= 0) { c.an = 'crab_snap'; c.t = 0; c.stop = volRand(1, 2); }
    } else { c.stop -= dt; if (c.stop <= 0) { c.an = 'crab_walk'; c.t = 0; c.stop = volRand(3, 6); } }
    if (W.players.some(p => volDist(p.x, p.y, c.x, c.y) < 20)) { c.an = 'crab_walk'; c.x += c.dir * 50 * dt; }
    if (c.x < -140 || c.x > 460) { S.crab = null; S.crabIn = volRand(18, 40); }
  }

  /* ---- drawing ----
     items(list, draw) puts everything that stands up into the match's
     depth-sorted list; each is drawn by g at the picture's own pixels. */
  function items(list, g) {
    const ms = performance.now(), dt = S.lastMs ? Math.min(.1, (ms - S.lastMs) / 1000) : 0;
    S.lastMs = ms;
    step(dt);
    const X = (x, y) => Math.round(volSX(x, y)), Y = (y, z) => Math.round(volSY(y, z));
    for (const p of S.props) list.push({ y: p.y, d: () => VolArt.put(g, p.piece, X(p.x, p.y), Y(p.y, 0), p.face) });
    /* the chair, then her on it */
    const U = VOL_UMP, u = S.ump;
    list.push({ y: U.y, d: () => {
      VolArt.put(g, S.chair, X(U.x, U.y), Y(U.y, 0), 1);
      SocArt.frame(g, u.sheet, u.an, frameOf(u.sheet, u.an, u.at), X(U.x, U.y) + 1, Y(U.y, U.seat), u.face);
    } });
    for (const f of S.fans) list.push({ y: f.y, d: () => {
      const x = X(f.x, f.y), y = Y(f.y, 0);
      /* a towel under a sitting fan */
      if (f.sit) { g.fillStyle = f.towel; g.fillRect(x - 7, y - 2, 14, 3); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x - 7, y - 2, 14, 1); }
      SocArt.frame(g, f.sheet, f.an, frameOf(f.sheet, f.an, f.t), x, y, f.face);
    } });
    const crit = VolArt.A.sheets.beach_critters && VolArt.dress('beach_critters');
    if (!crit) return;
    for (const q of S.gulls) if (!q.gone) list.push({ y: q.flying ? -1e9 : q.y, sky: q.flying, d: () => SocArt.frame(g, crit, q.an, frameOf(crit, q.an, q.t), X(q.x, q.y), Y(q.y, q.z), q.face) });
    if (S.crab) { const c = S.crab; list.push({ y: c.y, d: () => SocArt.frame(g, crit, c.an, frameOf(crit, c.an, c.t), X(c.x, c.y), Y(c.y, 0), 1) }); }
  }
  return { build, items, get ump() { return S.ump; } };
}
