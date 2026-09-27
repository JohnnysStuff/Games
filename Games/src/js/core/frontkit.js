/* ============================================================================
   FRONTKIT — the machinery under a game's own front page

   What every game's own front page needs underneath its look, so each game
   only has to draw itself: buttons that can be pointed at, pressed and
   keyed; option chips that write one of the game's `options`; Play (in
   place, or a fresh mount for settings a game only reads once); Friends;
   Escape to the hub; the pointer cursor; and eased values for hover and
   press that run on the render clock, since update() is a fixed step and a
   tween advanced there judders.

     const FK = FrontKit(api, { online: !!RACE, remount: true, onStart() {} });
     render():  FK.frame(); ...draw, registering clickables with FK.btn()...; FK.cursor();
     update():  if (FK.on) { FK.input(api.input); return; }
     instance:  escape: FK.escape,  and FK.done() in destroy()

   FK.on is true while the menu is up, and FK.out runs 0 -> 1 as it leaves.
   A clickable's key does the work: 'play' starts, 'party' opens the party
   list, 'opt:<id>:<value>' sets that option, anything else goes to onClick.
   ========================================================================== */
function FrontKit(api, o) {
  o = o || {};
  let last = 0, leaving = false;
  /* menu: false is a game that draws its own front page and wants the kit
     only for its results */
  const K = { on: api.entry === 'menu' && !o.online && o.menu !== false, t: 0, dt: 0, hits: [], M: {}, cur: '' };
  K.out = K.on ? 0 : 1;
  /* a game mounted afresh from its own menu fades in from it */
  K.intro = api.fromMenu ? 0 : 1;
  K.frame = () => {
    const n = performance.now() / 1000;
    K.dt = last ? Math.min(.1, n - last) : 0;
    last = n;
    K.t += K.dt;
    if (leaving && K.out < 1) K.out = Math.min(1, K.out + K.dt / (o.outTime || .45));
    if (K.intro < 1) K.intro = Math.min(1, K.intro + K.dt / .5);
    K.hits.length = 0;
  };
  K.glide = (k, to, rate) => {
    const s = K.M[k] || (K.M[k] = { x: to, v: 0 });
    s.x += (to - s.x) * (1 - Math.exp(-(rate || 14) * K.dt));
    return s.x;
  };
  K.spring = (k, to, stiff, damp) => {
    const s = K.M[k] || (K.M[k] = { x: to, v: 0 });
    let t = K.dt;
    while (t > 1e-6) {
      const h = Math.min(t, 1 / 240);
      s.v += ((to - s.x) * (stiff || 600) - s.v * (damp || 26)) * h;
      s.x += s.v * h; t -= h;
    }
    return s.x;
  };
  K.kick = (k, v) => { const s = K.M[k] || (K.M[k] = { x: 0, v: 0 }); s.v += v; };
  K.eo = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  K.bo = k => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  /* entrance: 0 -> 1 for a piece that arrives `d` seconds in */
  K.in = (d, dur) => clamp((K.t - (d || 0)) / (dur || .5), 0, 1);
  K.over = (x, y, w, h) => {
    const p = api.input.pointer;
    return p.inside && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  };
  /* a clickable: registered for this frame, and how pointed-at (h, 0..1) and
     how pressed (p, a spring that dips negative on a click) it is */
  K.btn = (key, x, y, w, h, live) => {
    const on = (K.on || !!K.R) && live !== false && !api.covered;
    if (on) K.hits.push({ key, x, y, w, h });
    return { h: K.glide('h' + key, on && K.over(x, y, w, h) ? 1 : 0, 16), p: K.spring('p' + key, 0, 700, 30), live: on };
  };
  K.hitAt = (x, y) => {
    for (let i = K.hits.length - 1; i >= 0; i--) {
      const r = K.hits[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.key;
    }
    return '';
  };
  K.opt = (id, def) => api.opt(id) || def;
  K.setOpt = (id, v) => {
    if (api.opt(id) === v) return;
    api.setOpt(id, v);
    K.kick('o' + id, -8);
    try { Sound.blip(); } catch (e) {}
    if (o.onOpt) o.onOpt(id, v);
  };
  K.party = () => { try { Sound.blip(); } catch (e) {} api.openParty(); };
  /* what the big button should say: your own round, a host's start, a guest's wait */
  K.mode = () => { const P = api.party; return !P.inRoom ? 'solo' : P.isHost ? 'host' : 'guest'; };
  K.go = () => {
    if (!K.on) return;
    /* what a front page hands the round it starts (read by the next mount only) */
    if (o.carry) api.carry = o.carry();
    if (!api.play(o.remount ? { remount: true } : undefined)) return;   // started for a party, or mounted afresh
    K.on = false; leaving = true;
    try { if (o.goSound) o.goSound(); else Sound.jump(); } catch (e) {}
    if (o.onStart) o.onStart();
  };
  K.input = (I, keys) => {
    if (!K.on) return;
    /* the party list can be open over the menu; what is typed there is not for us */
    if (api.covered) { while (I.takeClick()) {} I.takeSwipe(); return; }
    let c;
    while ((c = I.takeClick())) {
      if (c.btn) continue;
      const k = K.hitAt(c.x, c.y);
      if (!k) { if (o.onBackdrop) o.onBackdrop(c); continue; }
      K.kick('p' + k, -40);
      if (k === 'play') { K.go(); return; }
      if (k === 'party') { K.party(); continue; }
      if (k.slice(0, 4) === 'opt:') { const i = k.indexOf(':', 4); K.setOpt(k.slice(4, i), k.slice(i + 1)); continue; }
      if (o.onClick) o.onClick(k);
      if (!K.on) return;
    }
    if (keys !== false) {
      if (I.anyPressed('Space', 'Enter', 'NumpadEnter')) { K.kick('pplay', -40); K.go(); return; }
      if (I.anyPressed('KeyP') && o.mp) K.party();
    }
  };
  K.escape = () => { if (K.on) { api.hub(); return true; } return false; };
  K.cursor = () => {
    const p = api.input.pointer;
    const want = (K.on || K.R) && p.inside && !api.covered && K.hitAt(p.x, p.y) ? 'pointer' : '';
    if (want !== K.cur) { K.cur = want; try { cv.style.cursor = want; } catch (e) {} }
  };
  K.done = () => { if (K.cur) { K.cur = ''; try { cv.style.cursor = ''; } catch (e) {} } K.resDone(); };

  /* ---- drawing, themed by each game ----
     A theme is a handful of colours and a face; everything below reads it,
     so two games' buttons can share their behaviour and nothing else. */
  K.font = (th, size, w) => (th.italic === false ? '' : 'italic ') + (w || th.weight || 800) + ' ' + size + 'px ' + (th.face || Hud.FAM.cond);
  K.text = (ctx, s, x, y, size, col, align, th, o2) => {
    o2 = o2 || {};
    ctx.save();
    ctx.font = K.font(th || {}, size, o2.w);
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = (o2.track || 0) + 'px'; } catch (e) {}
    if (o2.alpha !== undefined) ctx.globalAlpha *= o2.alpha;
    if (o2.shadow) { ctx.fillStyle = o2.shadow; ctx.fillText(s, x + (o2.sx || 0), y + (o2.sy === undefined ? 3 : o2.sy)); }
    if (o2.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o2.lw || size * .16; ctx.strokeStyle = o2.stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    ctx.restore();
  };
  K.caps = (ctx, s, x, y, size, col, align, o2) => {
    o2 = o2 || {};
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + (o2.face || Hud.FAM.sans);
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = (size * (o2.track === undefined ? .16 : o2.track)).toFixed(2) + 'px'; } catch (e) {}
    if (o2.alpha !== undefined) ctx.globalAlpha *= o2.alpha;
    ctx.fillStyle = col; ctx.fillText(String(s).toUpperCase(), x, y);
    ctx.restore();
  };
  /* a button: rises under the pointer, squashes when pressed */
  K.button = (ctx, key, x, y, w, h, label, th, o2) => {
    o2 = o2 || {};
    const b = K.btn(key, x, y, w, h, o2.live);
    const r = th.r === undefined ? h / 2 : th.r, lift = b.h * 2.5, sc = 1 + b.h * .025;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 - lift);
    ctx.scale(sc - b.p * .03, sc + b.p * .05);
    if (th.shadow !== false) { ctx.fillStyle = th.shadow || 'rgba(0,0,0,.35)'; rr(ctx, -w / 2, -h / 2 + 5 + lift, w, h, r); ctx.fill(); }
    const fill = o2.fill || th.fill;
    if (Array.isArray(fill)) {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = fill;
    rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
    if (th.gloss !== false) {
      const s2 = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      s2.addColorStop(0, 'rgba(255,255,255,' + (.2 + b.h * .1).toFixed(3) + ')'); s2.addColorStop(.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = s2; rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
    }
    if (th.edge) { ctx.strokeStyle = th.edge; ctx.lineWidth = th.edgeW || 1.5; rr(ctx, -w / 2 + .75, -h / 2 + .75, w - 1.5, h - 1.5, r); ctx.stroke(); }
    if (o2.draw) o2.draw(ctx, w, h, b);
    else {
      K.text(ctx, label, 0, o2.sub ? -h * .1 : 1, o2.size || h * .42, o2.ink || th.ink || '#fff', 'center', th, { track: o2.track });
      if (o2.sub) K.caps(ctx, o2.sub, 0, h * .26, Math.max(8, h * .16), o2.subInk || th.subInk || 'rgba(255,255,255,.75)', 'center');
    }
    ctx.restore();
    return b;
  };
  /* A row of choices for one option, with the chosen one's highlight
     sliding between them. choices: [[value, label], ...] */
  K.chips = (ctx, id, x, y, w, h, choices, th, o2) => {
    o2 = o2 || {};
    const cur = K.opt(id, o2.def), n = choices.length, gap = th.chipGap === undefined ? 5 : th.chipGap, pad = th.chipPad === undefined ? 4 : th.chipPad;
    const cw = (w - pad * 2 - gap * (n - 1)) / n, ch = h - pad * 2;
    const idx = Math.max(0, choices.findIndex(c => c[0] === cur));
    const r = th.chipR === undefined ? h / 2 : th.chipR;
    ctx.save();
    ctx.fillStyle = th.track || 'rgba(0,0,0,.28)'; rr(ctx, x, y, w, h, r); ctx.fill();
    if (th.trackEdge) { ctx.strokeStyle = th.trackEdge; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, r); ctx.stroke(); }
    const sx = K.spring('chip' + id, x + pad + idx * (cw + gap), 420, 32), sp = K.spring('o' + id, 0, 520, 24);
    ctx.fillStyle = th.chip || 'rgba(255,255,255,.95)';
    ctx.save(); ctx.translate(sx + cw / 2, y + h / 2); ctx.scale(1 - sp * .1, 1 + sp * .16);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, Math.max(0, r - pad)); ctx.fill();
    ctx.restore();
    choices.forEach((c, i) => {
      const cx = x + pad + i * (cw + gap);
      const b = K.btn('opt:' + id + ':' + c[0], cx, y, cw, h, o2.live);
      const on = K.glide('ol' + id + i, i === idx ? 1 : 0, 12);
      const col = on > .5 ? (th.chipInk || '#111') : (th.chipOff || 'rgba(255,255,255,.72)');
      K.text(ctx, c[1], cx + cw / 2, y + h / 2 + 1 - b.h, o2.size || h * .38, col, 'center', o2.face ? { face: o2.face, italic: o2.italic, weight: o2.weight } : th, { track: o2.track });
    });
    if (o2.live === false) { ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x, y, w, h, r); ctx.fill(); }
    ctx.restore();
  };
  /* A word in the pixel face with one small image per letter, at the
     screen's own resolution, so a title can move letter by letter and glide
     between pixels instead of stepping. st: { px, fill(i), side(i), edge,
     depth, glow(i) } */
  const glyphs = {};
  K.pixWord = (key, word, st) => {
    const sc = Math.max(1, Stage.scale * Stage.dpr), ck = key + '|' + sc.toFixed(3);
    if (glyphs[ck]) return glyphs[ck];
    const px = st.px, t = st.edge === false ? 0 : Math.max(1, Math.round(px * (st.edgeK || 1)));
    const D = st.depth || 0, gl = st.glow ? Math.ceil(px * 2.4) : 0;
    const cw = 6 * px + 2 * t + 2 * gl, ch = 8 * px + D + 2 * t + 2 * gl;
    const out = [...word].map((c, i) => {
      if (c === ' ') return null;
      const img = document.createElement('canvas');
      img.width = Math.ceil(cw * sc); img.height = Math.ceil(ch * sc);
      const g = img.getContext('2d');
      g.scale(img.width / cw, img.height / ch);
      const ox = t + gl, oy = t + gl, O = { thick: true };
      if (gl) { g.save(); g.shadowColor = st.glow(i); g.shadowBlur = px * 2.2; O.fill = st.glow(i); Hud.pix(g, c, ox, oy + D / 2, px, O); g.restore(); }
      if (t) { O.fill = st.edgeCol || '#0a0a12'; for (let dy = -t; dy <= D + t; dy += Math.max(1, t / 2)) for (const dx of [-t, 0, t]) Hud.pix(g, c, ox + dx, oy + dy, px, O); }
      if (D) { O.fill = st.side(i); for (let dy = D; dy >= 1; dy--) Hud.pix(g, c, ox, oy + dy, px, O); }
      O.fill = st.fill(i); Hud.pix(g, c, ox, oy, px, O);
      return img;
    });
    return (glyphs[ck] = { out, cw, ch, pad: t + gl, px });
  };
  /* lays such a word out centred on cx with its letters' tops at `top`;
     fn(i) may return { dy, sx, sy, a, rot } to move each letter */
  K.drawWord = (ctx, G, cx, top, fn) => {
    const n = G.out.length, step = 7 * G.px, inkW = (n * 7 - 1) * G.px;
    G.out.forEach((img, i) => {
      if (!img) return;
      const m = fn ? fn(i) || {} : {};
      if (m.a !== undefined && m.a <= 0) return;
      const lx = cx - inkW / 2 + i * step - G.pad + G.cw / 2, base = top - G.pad + G.ch;
      ctx.save();
      if (m.a !== undefined) ctx.globalAlpha *= m.a;
      ctx.translate(lx, base + (m.dy || 0));
      if (m.rot) ctx.rotate(m.rot);
      ctx.scale(m.sx || 1, m.sy || 1);
      ctx.drawImage(img, -G.cw / 2, -G.ch, G.cw, G.ch);
      ctx.restore();
    });
  };
  /* Outlined type cannot be faded as it is drawn - the outline shows through
     the fill - so anything coming or going is drawn whole into a layer, and
     the layer is what fades. */
  let layerCv = null;
  K.layer = (ctx, a, fn) => {
    if (a <= .002) return;
    if (a >= .998) { fn(ctx); return; }
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!layerCv) layerCv = document.createElement('canvas');
    if (layerCv.width !== cw || layerCv.height !== ch) { layerCv.width = cw; layerCv.height = ch; }
    const g = layerCv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
    g.setTransform(ctx.getTransform());
    g.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
    fn(g);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(layerCv, 0, 0); ctx.restore();
  };

  /* ================================================ the results page ===
     The other end of a round. When it is over the shell hands the game
     everything its card has to say — the verdict, the numbers, every coin
     the round paid, the level bar, a race's standings — and a game that
     answers `results(R)` draws that itself, in its own look, instead of the
     shell's generic card:

       instance:  results(R) { FK.showResults(R); }
       render():  ...the scene...; if (FK.R) drawResults(ctx);

     The page reads the timeline back (K.rs, K.count, K.lvl, K.ledger) and
     registers its buttons with K.btn like any other: 'again', 'menu' and
     'hub' do what they say. The round has stopped, so update() no longer
     runs; K.resInput() takes the clicks from render instead, and Space or
     Enter comes in through a key listener of its own. The first press or
     click lands every animation at its end, the next one plays again. */
  K.R = null;
  let RT = null, rt0 = 0, fired = {}, onKey = null;
  /* When each piece arrives, in seconds after the page opens. The rhythm is
     the shell card's: a heading, the numbers one at a time, the coins read
     back line by line, the total counting up, then the level bar. */
  function plan(R) {
    const S = .075, T = { title: 0, sub: S, purse: 2 * S, tag: 3 * S, stat: [], row: [], std: [] };
    let t = 4 * S + .08;
    R.stats.forEach((s, i) => T.stat.push(t + i * S));
    t += R.stats.length * S + .12;
    (R.standings || []).forEach((s, i) => T.std.push(t + i * S));
    t += (R.standings || []).length * S + (R.standings ? .1 : 0);
    R.paid.forEach((l, i) => T.row.push(t + i * .11));
    t += R.paid.length * .11 + .14;
    T.total = t;
    t += R.paid.length ? .5 : .1;
    T.xp = t; T.up = t + .42;
    t += .8;
    T.note = t;
    T.bar = t + (R.claimable ? .12 : 0);
    T.end = T.bar + .45;
    return T;
  }
  K.showResults = (R, opt) => {
    K.resDone();
    opt = opt || {};
    K.R = R; RT = plan(R); rt0 = K.t; fired = {};
    K.rsnd = Object.assign({
      row: () => Sound.blip(), total: () => Sound.coin(), up: () => Sound.clearEnd(3)
    }, opt.sounds || {});
    onKey = e => {
      if (!K.R || api.covered) return;
      if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (!K.resFinished()) K.skip(); else K.act('again');
    };
    addEventListener('keydown', onKey, true);
  };
  K.resDone = () => {
    if (onKey) { removeEventListener('keydown', onKey, true); onKey = null; }
    K.R = null;
  };
  /* seconds since the page opened */
  K.rt = () => K.t - rt0;
  K.resFinished = () => !!RT && K.rt() >= RT.end;
  K.skip = () => {
    if (!RT) return;
    rt0 = K.t - RT.end - .01;
    /* the landed pieces make no noise of their own on the way past */
    for (let i = 0; i < K.R.paid.length; i++) fired['row' + i] = 1;
    fired.total = fired.up = 1;
  };
  /* entrance, 0 -> 1, of a piece of the page: rs('title'), rs('stat', 2) */
  K.rs = (name, i, dur) => {
    if (!RT) return 1;
    const at = i === undefined ? RT[name] : (RT[name] || [])[i];
    if (at === undefined) return 1;
    return clamp((K.rt() - at) / (dur || .35), 0, 1);
  };
  /* a number counting from `a` to `b` as the named piece arrives */
  K.count = (a, b, name, dur) => Math.round(a + (b - a) * K.eo(K.rs(name || 'total', undefined, dur || .6)));
  K.purse = () => K.count(K.R.purse0, K.R.purse, 'total');
  K.total = () => K.count(0, K.R.earned, 'total');
  /* the level bar: filling from where the round found it, and on a level-up
     filling to the end, turning over, and filling again */
  K.lvl = () => {
    const L = K.R.level, a = L.before, b = L.after;
    const fa = a.into / Math.max(1, a.need), fb = b.into / Math.max(1, b.need);
    const k = K.rs('xp', undefined, .8);
    if (!L.up) return { lvl: b.lvl, frac: fa + (fb - fa) * K.eo(k), into: b.into, need: b.need, up: 0 };
    if (k < .5) return { lvl: a.lvl, frac: fa + (1 - fa) * K.eo(k * 2), into: a.into, need: a.need, up: 0 };
    return { lvl: b.lvl, frac: fb * K.eo((k - .5) * 2), into: b.into, need: b.need, up: K.rs('up', undefined, .5) };
  };
  K.act = k => {
    const R = K.R;
    if (!R) return;
    /* In someone else's party the host starts the next one: saying so is
       all Play again can do, and the page stays up until they do, rather
       than going and leaving the finished round standing still. */
    if (k === 'again' && K.mode() === 'guest') { try { Sound.blip(); } catch (e) {} R.act(k); return; }
    if (k === 'again' || k === 'menu' || k === 'hub') {
      if (k === 'menu' && !R.menuOk) return;
      try { Sound.blip(); } catch (e) {}
      K.resDone();
      R.act(k);
    } else if (o.onClick) o.onClick(k);
  };
  /* the page's clicks: a button does its job, anywhere else lands the lot */
  K.resInput = () => {
    if (!K.R) return;
    const I = api.input;
    if (api.covered) { while (I.takeClick()) {} return; }
    let c;
    while ((c = I.takeClick())) {
      if (c.btn) continue;
      const k = K.hitAt(c.x, c.y);
      if (k) { K.kick('p' + k, -40); K.act(k); if (!K.R) return; }
      else if (!K.resFinished()) K.skip();
    }
  };
  /* the sounds the page makes as its pieces land, on the render clock */
  K.resSounds = () => {
    const R = K.R;
    if (!R || !RT) return;
    const t = K.rt();
    R.paid.forEach((l, i) => { if (!fired['row' + i] && t >= RT.row[i]) { fired['row' + i] = 1; K.rsnd.row(i); } });
    if (!fired.total && R.paid.length && t >= RT.total) { fired.total = 1; K.rsnd.total(); }
    if (!fired.up && R.level.up && t >= RT.up) { fired.up = 1; K.rsnd.up(); }
  };

  /* The coins, the level and the quest note, laid out in a column `w` wide
     at (x, y), in the look `st` gives them. Returns the height it used, and
     K.ledgerH(st) says in advance how much that will be.
       st: { text(ctx, s, x, y, size, col, align), label(...same...),
             measure(ctx, s, size), ink, mute, gold, rule, bar, fill,
             rowH, size, lsize, totalH, xpH, barH, barR } */
  K.ledgerH = st => {
    const R = K.R, rh = st.rowH || 26;
    return (R.paid.length ? R.paid.length * rh + 12 + (st.totalH || 40) : 0) + (st.xpH || 40) + (R.claimable ? (st.noteH || 22) : 0);
  };
  K.ledger = (ctx, x, y, w, st) => {
    const R = K.R, rh = st.rowH || 26, sz = st.size || 15, ls = st.lsize || 11;
    const ink = st.ink || '#fff', mute = st.mute || 'rgba(255,255,255,.55)', gold = st.gold || '#f5c542';
    const lab = st.label || st.text;
    let cy = y;
    R.paid.forEach((l, i) => {
      const k = K.eo(K.rs('row', i, .3));
      if (k <= 0) { cy += rh; return; }
      ctx.save(); ctx.globalAlpha *= k;
      const yy = cy + rh / 2 + (1 - k) * 8;
      st.text(ctx, l.label, x, yy, sz, ink, 'left');
      const amt = '+' + fmt(l.coins);
      st.text(ctx, amt, x + w, yy, sz, gold, 'right');
      if (l.note) st.text(ctx, l.note, x + w - (st.noteGap || 90), yy, sz * .85, mute, 'right');
      if (st.leader !== false) {
        ctx.fillStyle = st.rule || 'rgba(255,255,255,.12)';
        const lx0 = x + (st.measure ? st.measure(ctx, l.label, sz) : l.label.length * sz * .55) + 12;
        const lx1 = x + w - (l.note ? (st.noteGap || 90) + 60 : 70);
        for (let px = lx0; px < lx1; px += 6) ctx.fillRect(px, yy + sz * .3, 2, 2);
      }
      ctx.restore();
      cy += rh;
    });
    if (R.paid.length) {
      cy += 12;
      const th = st.totalH || 40, k = K.eo(K.rs('total', undefined, .3));
      ctx.save(); ctx.globalAlpha *= k;
      ctx.fillStyle = st.rule || 'rgba(255,255,255,.12)'; ctx.fillRect(x, cy - 6, w, st.ruleW || 1);
      lab(ctx, st.totalLabel || 'TOTAL', x, cy + th / 2, ls, mute, 'left');
      const pop = 1 + Math.sin(Math.min(1, K.rs('total', undefined, .45)) * Math.PI) * .12;
      ctx.translate(x + w, cy + th / 2); ctx.scale(pop, pop);
      st.text(ctx, '+' + fmt(K.total()), 0, 0, st.totalSize || sz * 1.8, gold, 'right');
      ctx.restore();
      cy += th;
    }
    /* the level bar */
    const xh = st.xpH || 40, L = K.lvl(), kx = K.eo(K.rs('xp', undefined, .3));
    ctx.save(); ctx.globalAlpha *= kx;
    const bh = st.barH || 8, by = cy + 8;
    ctx.fillStyle = st.bar || 'rgba(255,255,255,.12)';
    if (st.barR === 0) ctx.fillRect(x, by, w, bh); else { rr(ctx, x, by, w, bh, bh / 2); ctx.fill(); }
    if (L.frac > .002) {
      ctx.fillStyle = st.fill || gold;
      if (st.barR === 0) ctx.fillRect(x, by, w * L.frac, bh); else { rr(ctx, x, by, Math.max(bh, w * L.frac), bh, bh / 2); ctx.fill(); }
    }
    const lp = 1 + Math.sin(L.up * Math.PI) * .25;
    ctx.save(); ctx.translate(x, by + bh + 12); ctx.scale(lp, lp);
    lab(ctx, 'LEVEL ' + L.lvl + (L.up > 0 ? '  UP!' : ''), 0, 0, ls, L.up > 0 ? gold : mute, 'left');
    ctx.restore();
    lab(ctx, fmt(L.into) + ' / ' + fmt(L.need) + ' XP', x + w, by + bh + 12, ls, mute, 'right');
    ctx.restore();
    cy += xh;
    if (R.claimable) {
      const kn = K.eo(K.rs('note', undefined, .35));
      ctx.save(); ctx.globalAlpha *= kn;
      lab(ctx, R.claimable + (R.claimable === 1 ? ' QUEST READY TO CLAIM' : ' QUESTS READY TO CLAIM'), x, cy + 10, ls, gold, 'left');
      ctx.restore();
      cy += st.noteH || 22;
    }
    return cy - y;
  };
  /* a ledger style in a canvas face rather than the pixel one */
  K.ledgerStyle = st => {
    const face = st.face || Hud.FAM.sans, it = st.italic ? 'italic ' : '', w = st.weight || 600;
    const font = size => it + w + ' ' + size + 'px ' + face;
    return Object.assign({
      text(ctx, s, x, y, size, col, align) {
        ctx.save(); ctx.font = font(size); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = col; ctx.fillText(String(s), x, y); ctx.restore();
      },
      label(ctx, s, x, y, size, col, align) { K.caps(ctx, s, x, y, size, col, align, { face: st.labelFace || face, track: st.track }); },
      measure(ctx, s, size) { ctx.save(); ctx.font = font(size); const m = ctx.measureText(String(s)).width; ctx.restore(); return m; }
    }, st);
  };

  /* The page most games want, laid out once: the game's own heading on top
     (T.hero draws it and says how tall it was), then two columns — what the
     round reached as tiles, and a race's field under them, beside the card
     with the coins and the level — and the buttons along the bottom. Every
     piece is drawn by the theme T, so the layout is shared and the look is
     not:
       T.hero(ctx, cx, top) -> height     T.stat(ctx, s, x, y, w, h, i, k)
       T.card(ctx, x, y, w, h)            T.ls   (a ledger style)
       T.button(ctx, key, label, x, y, w, h, primary)
       T.veil(ctx, k), T.head(ctx, x, y, w) (the card's heading and purse),
       T.hint(ctx, cx, y), T.std (standings colours, and std.fmt for the
       scores), T.stdCard (the standings' own card, if not T.card),
       T.stats (which of the round's numbers get a tile), T.colL, T.colR */
  K.resultsPage = (ctx, W, H, T) => {
    const R = K.R;
    if (!R) return;
    K.resSounds();
    const cx = W / 2;
    if (T.veil) T.veil(ctx, K.eo(K.rs('title', undefined, .45)));
    const top = T.top === undefined ? 26 : T.top;
    const heroH = T.hero(ctx, cx, top);
    const n = R.paid.length;
    const ls = Object.assign({}, T.ls, { rowH: n > 5 ? (T.ls.rowH || 24) - 6 : n > 4 ? (T.ls.rowH || 24) - 3 : (T.ls.rowH || 24) });
    const colL = T.colL || 220, colR = T.colR || 440, gap = 22;
    const stats = (T.stats ? T.stats(R.gameStats) : R.gameStats).slice(0, R.standings ? 2 : 4);
    const hasL = stats.length || R.standings;
    const lx = hasL ? cx - (colL + gap + colR) / 2 : 0, rx = hasL ? lx + colL + gap : cx - colR / 2;
    const y0 = top + heroH + (T.gap === undefined ? 18 : T.gap);
    /* the left column: the round's own numbers, as tiles */
    let leftH = 0, sy0 = y0;
    stats.forEach((s, i) => {
      const th = typeof T.statH === 'function' ? T.statH(s, i) : (T.statH || 52);
      const k = K.rs('stat', i + 1, .35), y = sy0;
      sy0 += th + 10;
      leftH = y + th - y0;
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2);
      T.stat(ctx, s, lx, y - (1 - K.bo(k)) * 24, colL, th, i, k);
      ctx.restore();
    });
    if (R.standings) {
      const sy = y0 + leftH + (leftH ? 14 : 0), rh = 26, sh = 42 + R.standings.length * rh;
      const S = T.std || {};
      ctx.save(); ctx.globalAlpha *= K.eo(K.rs('std', 0, .4));
      (T.stdCard || T.card)(ctx, lx, sy, colL, sh);
      ls.label(ctx, 'RACE', lx + 16, sy + 20, ls.lsize || 11, ls.mute, 'left');
      R.standings.forEach((p, i) => {
        const k = K.eo(K.rs('std', i, .3)), yy = sy + 44 + i * rh, col = p.me ? (S.me || ls.gold) : (S.ink || ls.ink);
        ctx.save(); ctx.globalAlpha *= k;
        ls.text(ctx, (i + 1) + '. ' + String(p.name).slice(0, 12), lx + 16, yy, ls.size || 14, col, 'left');
        ls.text(ctx, (S.fmt || fmt)(p.score), lx + colL - 16, yy, ls.size || 14, col, 'right');
        ctx.restore();
      });
      ctx.restore();
      leftH = sy + sh - y0;
    }
    /* the right column: the arcade's card */
    const pad = T.pad || 20, headH = T.headH || 44;
    const ch = headH + K.ledgerH(ls) + pad - 6;
    const kc = K.eo(K.rs(n ? 'row' : 'xp', n ? 0 : undefined, .4));
    ctx.save(); ctx.globalAlpha *= kc;
    const cy = y0 + (1 - kc) * 18;
    T.card(ctx, rx, cy, colR, ch);
    if (T.head) T.head(ctx, rx + pad, cy + 22, colR - pad * 2);
    else {
      ls.label(ctx, 'COINS', rx + pad, cy + 22, ls.lsize || 11, ls.mute, 'left');
      ls.text(ctx, fmt(K.purse()), rx + colR - pad, cy + 22, (ls.size || 14) * 1.15, ls.gold, 'right');
    }
    K.ledger(ctx, rx + pad, cy + headH, colR - pad * 2, ls);
    ctx.restore();
    /* the buttons */
    const kb = K.eo(K.rs('bar', undefined, .4));
    const bh = T.btnH || 50, by = Math.min(H - bh - (T.foot || 30), y0 + Math.max(leftH, ch) + 20) + (1 - kb) * 20;
    if (kb > 0) {
      const acts = [['again', T.againLabel || 'PLAY AGAIN', true, T.wide || 230]];
      if (R.menuOk) acts.push(['menu', 'MENU', false, T.narrow || 140]);
      acts.push(['hub', 'HUB', false, T.narrow || 140]);
      const tw = acts.reduce((a, b) => a + b[3], 0) + (acts.length - 1) * 14;
      let bx = cx - tw / 2;
      ctx.save(); ctx.globalAlpha *= kb;
      for (const a of acts) { T.button(ctx, a[0], a[1], bx, by, a[3], bh, a[2]); bx += a[3] + 14; }
      ctx.restore();
      if (T.hint && K.resFinished()) T.hint(ctx, cx, by + bh + 18);
    }
    K.resInput();
    K.cursor();
  };
  return K;
}

