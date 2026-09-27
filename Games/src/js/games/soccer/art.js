/* SocArt: loads the cleaned sheets and the GameReady pieces, dresses a sheet
   in a team's kit (a palette swap by colour role), and paints the pitch.

   The roles come from art/clean/palette.json, the 30 colours every sheet
   shares. Shirt, trim, shorts and socks are recoloured by ratio, so a new
   kit keeps the art's own shading: each shade is the new base colour scaled
   by how much lighter or darker that shade was than the art's base. */
const SocArt = (() => {
  const SHEETS = ['player_short', 'player_spiky', 'player_afro', 'player_long', 'keeper', 'referee_front', 'fans', 'fans_long', 'fans_cap', 'stands'];
  const PIECES = ['ball', 'shadows', 'dust', 'spark', 'markers', 'grass', 'goal_back', 'goal_front', 'corner_flag'];
  /* palette indices by role, and which one is the base the others are measured against */
  const ROLES = {
    shirt: { idx: [26, 0, 9, 24, 20, 21], base: 9 },
    trim: { idx: [23, 18], base: 23 },
    shorts: { idx: [8], base: 8 },
    socks: { idx: [14, 7], base: 14 }
  };
  const SKIN = [5, 29, 17, 10, 25, 19];
  const HAIR = [2, 22, 12, 1, 15, 13];               // highlight to outline
  const TONES = { light: [1, 1, 1], tan: [.93, .82, .72], brown: [.74, .56, .46], dark: [.52, .39, .33] };
  const HAIRS = {
    brown: null,                                     // as drawn
    black: ['#5a4a4e', '#433638', '#30272a', '#241d1f', '#1a1517', '#110d0e'],
    blond: ['#f6dc8a', '#e8c46a', '#d0a650', '#c08f3c', '#96692a', '#5c3f1a'],
    ginger: ['#f09a5a', '#d97a3c', '#c0602c', '#a84e24', '#83391a', '#4f2210']
  };

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;
  /* a shade of `base`: r < 1 darkens, r > 1 moves toward white */
  function shade(base, r) {
    return base.map(v => Math.round(Math.max(0, Math.min(255, r <= 1 ? v * r : v + (255 - v) * (r - 1) * .9))));
  }

  let PAL = null;
  const A = { sheets: {}, pieces: {} };

  function image(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('missing ' + src)); i.src = src; });
  }
  /* The sheets come with the page (SOC_ART, written by
     tools/soccer/clean.mjs from art/soccer), since games.html is one file
     that also has to work opened straight off the disk. A page without them
     (with `base` pointing at art/soccer/) reads the files instead. */
  let loading = null;
  function load(base) { return loading || (loading = read(base)); }
  async function read(base) {
    const D = typeof SOC_ART !== 'undefined' ? SOC_ART : null;
    PAL = (D ? D.palette : await (await fetch(base + 'clean/palette.json')).json()).map(hex);
    await Promise.all([
      ...SHEETS.map(async n => {
        const [meta, img] = D ? [D.sheets[n].meta, await image(D.sheets[n].png)]
                              : await Promise.all([fetch(base + 'clean/' + n + '.json').then(r => r.json()), image(base + 'clean/' + n + '.png')]);
        A.sheets[n] = { name: n, meta, img };
      }),
      ...PIECES.map(async n => { A.pieces[n] = await image(D ? D.pieces[n] : base + 'GameReady/' + n + '.png'); })
    ]);
    A.pieces.goal_back_r = mirror(A.pieces.goal_back);
    A.pieces.goal_front_r = mirror(A.pieces.goal_front);
    A.pieces.corner_flag_r = mirrorFrames(A.pieces.corner_flag, 8);
    A.ready = true;
    return A;
  }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function mirror(src) {
    const c = canvas(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }
  /* mirror each frame in place, so frame i stays at column i */
  function mirrorFrames(src, fw) {
    const c = canvas(src.width, src.height), g = c.getContext('2d');
    for (let x = 0; x < src.width; x += fw) { g.save(); g.translate(x + fw, 0); g.scale(-1, 1); g.drawImage(src, x, 0, fw, src.height, 0, 0, fw, src.height); g.restore(); }
    return c;
  }

  /* look: { shirt, trim, shorts, socks: '#hex', tone: key of TONES, hair: key of HAIRS } */
  function lookMap(look) {
    const m = new Map(), key = c => (c[0] << 16) | (c[1] << 8) | c[2];
    for (const [role, { idx, base }] of Object.entries(ROLES)) {
      if (!look[role]) continue;
      const to = hex(look[role]), b = lum(PAL[base]);
      for (const i of idx) m.set(key(PAL[i]), shade(to, lum(PAL[i]) / b));
    }
    const tone = TONES[look.tone || 'light'];
    if (tone[0] !== 1) for (const i of SKIN) m.set(key(PAL[i]), PAL[i].map((v, k) => Math.round(v * tone[k])));
    const hair = HAIRS[look.hair || 'brown'];
    if (hair) HAIR.forEach((i, k) => m.set(key(PAL[i]), hex(hair[k])));
    return m;
  }

  const dressed = new Map();
  /* a sheet in a kit: the recoloured sheet, and its mirror image */
  function dress(name, look) {
    const id = name + JSON.stringify(look);
    if (dressed.has(id)) return dressed.get(id);
    const { img, meta } = A.sheets[name], [CW, CH] = meta.cell, [AX, AY] = meta.anchor;
    const cv = canvas(img.width, img.height), g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data, map = lookMap(look);
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const c = map.get((p[i] << 16) | (p[i + 1] << 8) | p[i + 2]);
      if (c) { p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; }
    }
    g.putImageData(d, 0, 0);
    const s = { name, meta, cv, fl: mirror(cv), CW, CH, AX, AY, W: img.width };
    dressed.set(id, s);
    return s;
  }
  /* draw frame fi of anim `an` with the feet at (x, y); face -1 mirrors */
  function frame(g, s, an, fi, x, y, face) {
    const a = s.meta.anims[an], sy = a.row * s.CH;
    if (face >= 0) g.drawImage(s.cv, fi * s.CW, sy, s.CW, s.CH, x - s.AX, y - s.AY, s.CW, s.CH);
    else g.drawImage(s.fl, s.W - (fi + 1) * s.CW, sy, s.CW, s.CH, x - (s.CW - 1 - s.AX), y - s.AY, s.CW, s.CH);
  }

  /* The arena, painted once: grass bands, the lines, and the boards round
     it. World (0,0) is the top-left corner of the pitch; the canvas adds a
     margin round it, darkened, so the arena is what reads. The sizes of the
     keeper's area and the cut corners come from SOC, which is set for the
     mode before this is called. */
  function pitch(PL, PD, MX, MY) {
    const c = canvas(PL + MX * 2, PD + MY * 2), g = c.getContext('2d'), grass = A.pieces.grass;
    for (let y = 0; y < c.height; y += 16) for (let x = 0; x < c.width; x += 16) {
      const wx = x - MX, band = Math.floor((wx + 1024) / 32) & 1;
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, variant = h - Math.floor(h) < .22 ? 2 : 0;
      g.drawImage(grass, (band + variant) * 16, 0, 16, 16, x, y, 16, 16);
    }
    const rect = (x, y, w, h, col) => { if (col) g.fillStyle = col; g.fillRect(MX + x, MY + y, w, h); };
    const LINE = 'rgba(244,247,240,.92)';
    g.fillStyle = LINE;
    /* a 2 px ring, only where keep(dx, dy) says so */
    const ring = (cx, cy, r, keep) => {
      g.fillStyle = LINE;
      for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
        if (d < r - 1 || d >= r + 1 || (keep && !keep(dx, dy))) continue;
        rect(x, y, 1, 1);
      }
    };
    const mid = PD / 2, BOX = SOC.BOXD, BH = SOC.BOXH, CUT = SOC.CUT;
    rect(-1, -1, PL + 2, 2); rect(-1, PD - 1, PL + 2, 2);            // touchlines
    rect(-1, -1, 2, PD + 2); rect(PL - 1, -1, 2, PD + 2);            // goal lines
    rect(PL / 2 - 1, 0, 2, PD);                                      // halfway
    ring(PL / 2, mid, Math.round(PD * .13));
    rect(PL / 2 - 2, mid - 2, 4, 4);
    for (const [gx, s] of [[0, 1], [PL, -1]]) {
      const box = (depth, half) => {
        g.fillStyle = LINE;
        const x0 = s > 0 ? gx : gx - depth;
        rect(x0, mid - half - 1, depth, 2); rect(x0, mid + half - 1, depth, 2);
        rect(gx + s * depth - 1, mid - half - 1, 2, half * 2 + 2);
      };
      box(BOX, BH); box(18, SOC.POST + 10);
      rect(gx + s * (BOX - 12) - 1, mid - 1, 3, 3, LINE);           // penalty spot
      ring(gx + s * (BOX - 12), mid, 22, dx => s * dx > 13);         // the D, outside the box only
    }

    /* ---- outside the boards: the same grass, in shadow ----
       Everything off the playing area, right up to the lines; the boards
       are painted over the edge of it next, so no sliver of lit grass is
       left between a board and the dark. */
    g.fillStyle = 'rgba(8,12,10,.5)';
    g.fillRect(0, 0, c.width, MY - 1); g.fillRect(0, MY + PD + 1, c.width, c.height - (MY + PD + 1));
    g.fillRect(0, MY - 1, MX - 1, PD + 2); g.fillRect(MX + PL + 1, MY - 1, c.width - (MX + PL + 1), PD + 2);
    /* the cut corners, a stair at a time */
    for (let i = 0; i < CUT; i++) {
      const w = CUT - i;
      rect(-1, i, w, 1, 'rgba(8,12,10,.5)'); rect(PL - w + 1, i, w, 1);
      rect(-1, PD - 1 - i, w, 1); rect(PL - w + 1, PD - 1 - i, w, 1);
    }

    /* ---- the boards ----
       The far one shows its face, panelled like a row of LED boards; the
       ends are seen from above as a rim; the near one is a low rail, so it
       never hides a player's feet. The goal mouths are left open. */
    const INK = '#120b0b', RIM = '#ccc7d1', RIM2 = '#9b949a', FACE = '#252538', FACE2 = '#2c2c46';
    const STRIPE = ['#153a89', '#f3ba06'], BH2 = 11;               // face height, in rows
    /* the far board: along the top, between the cut corners, and up the cuts */
    const farCol = (x, base) => {
      const panel = Math.floor((x + 1024) / 40) & 1, seam = ((x + 1024) % 40) === 0;
      rect(x, base - BH2 - 2, 1, 1, INK);
      rect(x, base - BH2 - 1, 1, 1, RIM);
      rect(x, base - BH2, 1, BH2, seam ? INK : panel ? FACE2 : FACE);
      if (!seam) rect(x, base - 7, 1, 2, STRIPE[panel]);
      rect(x, base, 1, 1, INK);
      rect(x, base + 1, 1, 2, 'rgba(8,6,12,.35)');                   // its shadow on the grass
    };
    for (let x = CUT - 1; x <= PL - CUT + 1; x++) farCol(x, -2);
    for (let i = 0; i < CUT; i++) { farCol(i - 1, CUT - i - 2); farCol(PL - i + 1, CUT - i - 2); }
    /* the ends: a rim seen from above, from the far cut down to the near
       one, open across the goal mouth (the goal's own art fills it) */
    const endCol = (x, y0, y1, s) => {
      for (let y = y0; y <= y1; y++) {
        rect(x - s * 4, y, 1, 1, INK); rect(x - s * 3, y, 1, 1, RIM2); rect(x - s * 2, y, 1, 1, RIM); rect(x - s, y, 1, 1, INK);
      }
    };
    const gapA = mid - SOC.POST - 10, gapB = mid + SOC.POST + 8;
    for (const [x, s] of [[-1, 1], [PL + 1, -1]]) { endCol(x, CUT - 2, gapA, s); endCol(x, gapB, PD - CUT + 1, s); }
    /* the near rail, and its cuts */
    const nearCol = (x, top) => {
      rect(x, top, 1, 1, INK); rect(x, top + 1, 1, 1, RIM); rect(x, top + 2, 1, 1, RIM2);
      rect(x, top + 3, 1, 4, ((x + 1024) % 40) === 0 ? INK : FACE); rect(x, top + 7, 1, 1, INK);
    };
    for (let x = CUT - 1; x <= PL - CUT + 1; x++) nearCol(x, PD + 1);
    for (let i = 0; i < CUT; i++) { nearCol(i - 1, PD - CUT + i + 1); nearCol(PL - i + 1, PD - CUT + i + 1); }
    /* Above the far boards (whose top is at y -15) the arena is left open:
       the stands and their crowd are drawn there, behind this (crowd.js) */
    g.clearRect(0, 0, c.width, MY - 15);
    return { cv: c, MX, MY };
  }

  /* The goal with `cut` rows of net taken out of its middle, for a smaller
     mouth. The net repeats exactly every 21 rows between rows 24 and 104 of
     both halves of the art, so lifting out 21 or 42 rows at row 40 leaves no
     seam: it is the same goal, narrower, not a redrawn one. */
  const cutGoals = {};
  function goals(cut) {
    if (cutGoals[cut]) return cutGoals[cut];
    const P = A.pieces, h = 128 - cut, at = 40;
    const shrink = img => {
      if (!cut) return img;
      const c = canvas(img.width, h), g = c.getContext('2d');
      g.drawImage(img, 0, 0, img.width, at, 0, 0, img.width, at);
      g.drawImage(img, 0, at + cut, img.width, 128 - at - cut, 0, at, img.width, 128 - at - cut);
      return c;
    };
    const back = shrink(P.goal_back), front = shrink(P.goal_front);
    return (cutGoals[cut] = { back, front, back_r: mirror(back), front_r: mirror(front), h });
  }

  return { load, dress, frame, pitch, goals, A, TONES, HAIRS };
})();
