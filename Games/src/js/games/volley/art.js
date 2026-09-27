/* VolArt: Beach Volley's pictures (VOL_ART, written by tools/volley/clean.mjs
   from art/volley), loaded, and the people dressed in a side's colours the
   way Soccer's are: a palette swap by colour role, each shade scaled from
   the art's own, so a new kit keeps the shading.

   The people (the players, the umpire, the fans) share one palette, and its
   roles come with the art (VOL_ART.people.roles): shirt, trim and shorts
   for a kit, skin for a tone, hair for a colour (Soccer's TONES and HAIRS,
   since it is Soccer's palette). The props, the animals, the ball and the
   net are drawn as they come. SocArt.frame draws a frame of any of them. */
const VolArt = (() => {
  const A = { sheets: {}, backdrop: null, ready: false };
  let PAL = null, R = null;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;
  /* a shade of `base`: r < 1 darkens, r > 1 moves toward white */
  const shade = (base, r) => base.map(v => Math.round(Math.max(0, Math.min(255, r <= 1 ? v * r : v + (255 - v) * (r - 1) * .9))));
  function image(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing ' + src)); i.src = src; });
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function mirror(src) {
    const c = canvas(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }

  /* the pictures come with the page, but still take a moment to decode */
  let loading = null;
  function load() { return loading || (loading = read()); }
  async function read() {
    const D = VOL_ART;
    PAL = D.people.colours.map(hex); R = D.people.roles;
    await Promise.all(Object.keys(D.sheets).map(async n => { A.sheets[n] = { name: n, meta: D.sheets[n].meta, img: await image(D.sheets[n].png) }; }));
    if (D.backdrop) A.backdrop = await image(D.backdrop);
    A.ready = true;
    return A;
  }

  /* look: { shirt, trim, shorts: '#hex', tone: a key of SocArt.TONES, hair: a key of SocArt.HAIRS } */
  function lookMap(look) {
    const m = new Map(), key = c => (c[0] << 16) | (c[1] << 8) | c[2];
    for (const role of ['shirt', 'trim', 'shorts']) {
      if (!look[role]) continue;
      const { idx, base } = R[role], to = hex(look[role]), b = lum(PAL[base]);
      for (const i of idx) m.set(key(PAL[i]), shade(to, lum(PAL[i]) / b));
    }
    const tone = SocArt.TONES[look.tone || 'light'];
    if (tone && tone[0] !== 1) for (const i of R.skin) m.set(key(PAL[i]), PAL[i].map((v, k) => Math.round(v * tone[k])));
    const hair = SocArt.HAIRS[look.hair || 'brown'];
    if (hair) R.hair.forEach((i, k) => m.set(key(PAL[i]), hex(hair[k])));
    return m;
  }
  const dressed = new Map();
  /* a sheet as SocArt.frame draws it, dressed in a look (nothing for the
     props and animals), and its mirror image */
  function dress(name, look) {
    const id = name + JSON.stringify(look || {});
    if (dressed.has(id)) return dressed.get(id);
    const { img, meta } = A.sheets[name], [CW, CH] = meta.cell, [AX, AY] = meta.anchor;
    const cv = canvas(img.width, img.height), g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    if (look) {
      const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data, map = lookMap(look);
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const c = map.get((p[i] << 16) | (p[i + 1] << 8) | p[i + 2]);
        if (c) { p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; }
      }
      g.putImageData(d, 0, 0);
    }
    const s = { name, meta, cv, fl: mirror(cv), CW, CH, AX, AY, W: img.width };
    dressed.set(id, s);
    return s;
  }
  /* One piece of a sheet of pieces (props, the ball, the net: each frame
     has its own box), cut out on its own: { cv, fl, w, h, ax, ay }, drawn
     with its foot at (x, y) as g.drawImage(cv, x - ax, y - ay). */
  const pieces = new Map();
  function piece(name, an, fi) {
    const id = name + ':' + an + ':' + fi;
    if (pieces.has(id)) return pieces.get(id);
    const { img, meta } = A.sheets[name], a = meta.anims[an], [w, h, dx, lift] = a.boxes[fi];
    const sx = fi * meta.cell[0] + meta.anchor[0] - dx, sy = a.row * meta.cell[1] + meta.anchor[1] - lift - h;
    const cv = canvas(Math.max(1, w), Math.max(1, h));
    if (w && h) cv.getContext('2d').drawImage(img, sx, sy, w, h, 0, 0, w, h);
    const p = { cv, fl: mirror(cv), w, h, ax: dx, ay: h + lift };
    pieces.set(id, p);
    return p;
  }
  /* draw a piece with its foot at (x, y); face -1 mirrors it */
  function put(g, p, x, y, face) {
    if (face < 0) g.drawImage(p.fl, Math.round(x - (p.w - p.ax)), Math.round(y - p.ay));
    else g.drawImage(p.cv, Math.round(x - p.ax), Math.round(y - p.ay));
  }
  return { load, dress, piece, put, A };
})();
