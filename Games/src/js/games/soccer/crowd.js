/* ============================================================================
   The stands along the far side of the pitch, and the crowd in them.

   The stands are the generated art's three pieces (tools/soccer/clean.mjs:
   a straight run that repeats, the same with a stairway, and an end), laid
   end to end once per arena and drawn behind the far boards, which hide
   their foot. The fans sit on the tiers: the home side's to the left and
   the visitors' to the right, in their colours (fans are drawn in the
   players' yellow kit so the kit recolouring dresses them), with a few
   neutrals, and they react to what happens on every screen alike: a
   kickoff gets a clap, a goal gets its own side up cheering and then
   waving scarves and flags while the other side holds its head, and in
   between the odd few clap along. It all runs on the render clock and
   touches nothing in the match.
   ========================================================================== */
/* TIERS: where each tier's fans have their feet, in rows from the top of a
   stands piece, back to front. SINK: how far the stands' foot sits behind
   the far boards (whose top is at y -15). EDGE: how far past each goal line
   they run. SEAT: the spacing along a tier. */
const SOC_STAND = { TIERS: [16, 24, 32, 39], SINK: 10, EDGE: 44, SEAT: 10 };

function socCrowd(W) {
  let stand = null, fans = [], lastMs = 0, lastEv = 0;
  /* one of the stands' pieces, in the cleaned sheet */
  function piece(s, an) {
    const m = s.meta, a = m.anims[an], [w, h, dx, lift] = a.box;
    return { sx: m.anchor[0] - dx, sy: a.row * m.cell[1] + m.anchor[1] - lift - h, w, h };
  }
  /* The stands for this arena, painted once: straight runs from end to
     end, the stairway on the halfway line, and an end at each side (the
     left one mirrored for the right). All bottoms level. */
  function paint() {
    const s = SocArt.dress('stands', {}), st = piece(s, 'straight'), ai = piece(s, 'aisle'), en = piece(s, 'end');
    const x0 = -SOC_STAND.EDGE, w = SOC.PL + 2 * SOC_STAND.EDGE, h = Math.max(st.h, ai.h, en.h);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const put = (p, x, sx = p.sx, sw = p.w) => g.drawImage(s.cv, sx, p.sy, sw, p.h, x, h - p.h, sw, p.h);
    for (let x = 0; x < w; x += st.w) put(st, x);
    /* only the middle of the stairway piece: the seats either side of it
       are the straight run's already */
    const aw = 44, ax = Math.round(SOC.PL / 2 - x0 - aw / 2);
    put(ai, ax, ai.sx + Math.round(ai.w / 2 - aw / 2), aw);
    put(en, 0);
    g.save(); g.translate(w, 0); g.scale(-1, 1); put(en, 0); g.restore();
    return { cv, x0, w, h, top: st.h, aisle: [ax + x0, ax + x0 + aw], ends: en.w };
  }
  /* A few looks for each side and for the neutrals, shared out (every look
     is a recoloured copy of a sheet, so there are not hundreds) */
  const SHEETS = ['fans', 'fans', 'fans_long', 'fans_cap'];
  const HAIR = ['brown', 'brown', 'black', 'black', 'blond', 'ginger'], TONE = ['light', 'light', 'tan', 'brown', 'dark'];
  const NEUTRAL = [{ shirt: '#8b8f9c', trim: '#5f6372' }, { shirt: '#ececec', trim: '#9b949a' }, { shirt: '#3b4a6b', trim: '#252538' }];
  const pick = l => l[Math.floor(Math.random() * l.length)];
  function looks(kit, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(SocArt.dress(pick(SHEETS), { shirt: kit.shirt, trim: kit.trim, hair: pick(HAIR), tone: pick(TONE) }));
    return out;
  }
  function build() {
    stand = paint();
    const T = W.teams, L = [looks(T[0].kit, 8), looks(T[1].kit, 8), NEUTRAL.flatMap(k => looks(k, 2))];
    fans = [];
    const x1 = stand.x0 + stand.w, gap = SOC_STAND.SEAT;
    SOC_STAND.TIERS.forEach((ty, tier) => {
      const y = -15 + SOC_STAND.SINK - stand.top + ty;
      for (let x = stand.x0 + stand.ends * .3 + (tier % 2) * gap / 2; x < x1 - stand.ends * .3; x += gap + socRand(-1, 1)) {
        if (x > stand.aisle[0] - 5 && x < stand.aisle[1] + 5) continue;    // the stairway
        if (Math.random() < .12) continue;                                 // an empty seat
        /* the home end to the left, the visitors' to the right, mixed in the middle */
        const side = Math.random() < .1 ? 2 : Math.abs(x - SOC.PL / 2) < 40 ? (Math.random() < .5 ? 0 : 1) : x < SOC.PL / 2 ? 0 : 1;
        fans.push({ x: Math.round(x), y, tier, side, sheet: pick(L[side]), face: Math.random() < .5 ? 1 : -1,
          prop: pick(['scarf', 'scarf', 'flag', 'standclap']), an: 'sit', t: Math.random() * 2, plan: [], until: 0 });
      }
    });
  }
  /* what a fan does next: a list of [animation, seconds], after a moment */
  function plan(f, list, delay) { f.plan = list.map(([an, d]) => [an, d]); f.wait = delay || 0; f.until = 0; }
  function react(e) {
    const [kind, side] = e;
    for (const f of fans) {
      const r = Math.random(), d = r * .35;
      if (kind === 'kick') { if (r < .55) plan(f, [['clap', 1 + r * 1.5]], d); }
      else if (kind === 'goal' || kind === 'win') {
        const long = kind === 'win' ? 9 : 4;
        if (f.side === side) plan(f, [['cheer', 1.6 + r], [f.prop, long]], d);
        else if (f.side === 2) plan(f, [['standclap', 1.5 + r]], d + .3);
        else plan(f, [['groan', kind === 'win' ? 9 : 2.5 + r * 1.5]], d + .15);
      } else if (kind === 'draw') plan(f, [['standclap', 2 + r * 2]], d);
    }
  }
  /* the frame of a fan's animation: loops go round, a tail repeats its end */
  function frameOf(f) {
    const a = f.sheet.meta.anims[f.an], i = Math.floor(f.t / a.t);
    if (a.loop) return i % a.frames;
    if (a.tail && i >= a.frames) return a.frames - a.tail + Math.floor((f.t - a.frames * a.t) / Math.max(a.t, .18)) % a.tail;
    return Math.min(a.frames - 1, i);
  }
  function step(dt) {
    /* the match's moments (W.crowd, set on every screen) */
    const ev = W.crowd;
    if (ev && ev.id !== lastEv) { lastEv = ev.id; react(ev.e); }
    for (const f of fans) {
      f.t += dt;
      if (f.wait > 0) { f.wait -= dt; continue; }
      if (f.plan.length && !f.until) { const [an, d] = f.plan.shift(); f.an = an; f.t = 0; f.until = d; }
      if (f.until) { f.until -= dt; if (f.until <= 0) { f.until = 0; if (!f.plan.length) { f.an = 'sit'; f.t = Math.random(); } } }
      /* now and then a few clap along */
      else if (f.an === 'sit' && Math.random() < dt * .02) plan(f, [['clap', 1 + Math.random() * 1.5]]);
    }
  }
  /* The stands and everyone in them, at the camera, before the pitch is
     drawn over their foot */
  function draw(g, cx, cy) {
    if (!stand) return;
    const ms = performance.now(), dt = lastMs ? Math.min(.1, (ms - lastMs) / 1000) : 0;
    lastMs = ms;
    step(dt);
    const top = -15 + SOC_STAND.SINK - stand.h;
    g.drawImage(stand.cv, stand.x0 - cx, top - cy);
    const lo = cx - 16, hi = cx + SOC.VW + 16;
    for (const f of fans) {
      if (f.x < lo || f.x > hi) continue;
      SocArt.frame(g, f.sheet, f.an, frameOf(f), f.x - cx, f.y - cy, f.face);
    }
  }
  return { build, draw };
}
