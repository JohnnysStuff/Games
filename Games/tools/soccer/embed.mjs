/* ============================================================================
   EMBED — soccer's art, packed into the arcade.

   games.html is one file, and a copy is kept and opened straight off the
   disk, where nothing beside it can be fetched. So the sheets clean.mjs
   makes go into the page itself: this writes src/js/games/soccer/art-data.js
   (SOC_ART), holding the cleaned sheets and their animation tables, the
   small pieces as delivered, the palette the kits are recoloured by, and
   the hub card, which it paints here from those same sprites (card()).

   node tools/soccer/embed.mjs     (clean.mjs runs it too, after every clean)
   ========================================================================== */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ART = join(ROOT, 'art', 'soccer'), CLEAN = join(ART, 'clean'), PIECES_DIR = join(ART, 'GameReady');
const OUT = join(ROOT, 'src', 'js', 'games', 'soccer', 'art-data.js');
const SHEETS = ['player_short', 'player_spiky', 'player_afro', 'player_long', 'keeper', 'referee_front', 'fans', 'fans_long', 'fans_cap', 'stands'];
const PIECES = ['ball', 'shadows', 'dust', 'spark', 'markers', 'grass', 'goal_back', 'goal_front', 'corner_flag'];

/* ------------------------------------------------------------- the card */
/* The kit recolouring, as src/js/games/soccer/art.js does it (the same
   roles and the same shading by ratio), for the few players on the card. */
const ROLES = { shirt: [[26, 0, 9, 24, 20, 21], 9], trim: [[23, 18], 23], shorts: [[8], 8], socks: [[14, 7], 14] };
const SKIN = [5, 29, 17, 10, 25, 19], HAIR = [2, 22, 12, 1, 15, 13];
const TONES = { light: [1, 1, 1], brown: [.74, .56, .46] };
const HAIRS = { black: ['#5a4a4e', '#433638', '#30272a', '#241d1f', '#1a1517', '#110d0e'] };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;
const shade = (b, r) => b.map(v => Math.round(Math.max(0, Math.min(255, r <= 1 ? v * r : v + (255 - v) * (r - 1) * .9))));
function lookMap(pal, look) {
  const m = new Map(), key = c => (c[0] << 16) | (c[1] << 8) | c[2];
  for (const [role, [idx, base]] of Object.entries(ROLES)) {
    if (!look[role]) continue;
    const to = hex(look[role]), b = lum(pal[base]);
    for (const i of idx) m.set(key(pal[i]), shade(to, lum(pal[i]) / b));
  }
  const tone = TONES[look.tone || 'light'];
  if (tone[0] !== 1) for (const i of SKIN) m.set(key(pal[i]), pal[i].map((v, k) => Math.round(v * tone[k])));
  if (look.hair && HAIRS[look.hair]) HAIR.forEach((i, k) => m.set(key(pal[i]), hex(HAIRS[look.hair][k])));
  return m;
}

/* a picture to paint into, with see-through blending */
function surface(w, h) {
  const px = new Uint8Array(w * h * 4);
  const put = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
    const o = (y * w + x) * 4, k = a / 255, ka = px[o + 3] / 255, out = k + ka * (1 - k);
    if (out <= 0) return;
    px[o] = Math.round((r * k + px[o] * ka * (1 - k)) / out);
    px[o + 1] = Math.round((g * k + px[o + 1] * ka * (1 - k)) / out);
    px[o + 2] = Math.round((b * k + px[o + 2] * ka * (1 - k)) / out);
    px[o + 3] = Math.round(out * 255);
  };
  /* part of an image at (dx, dy), mirrored if asked, recoloured by map, faded by alpha */
  const draw = (img, sx, sy, sw, sh, dx, dy, o = {}) => {
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * img.w + sx + (o.flip ? sw - 1 - x : x)) * 4;
      let r = img.px[i], g = img.px[i + 1], b = img.px[i + 2], a = img.px[i + 3];
      if (!a) continue;
      const c = o.map && o.map.get((r << 16) | (g << 8) | b);
      if (c) [r, g, b] = c;
      put(dx + x, dy + y, r, g, b, a * (o.alpha ?? 1));
    }
  };
  const fill = (x, y, fw, fh, c, a = 255) => { for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) put(x + i, y + j, c[0], c[1], c[2], a); };
  return { w, h, px, put, draw, fill };
}

/* The hub card: a keeper at full stretch toward the top corner, the ball
   just past his gloves, the striker who hit it following through, on the
   arena's own grass and lines, in front of the (1v1) goal. 160×90 art
   pixels; the card shows it at twice that, square-pixelled. */
export function card() {
  const pal = JSON.parse(readFileSync(join(CLEAN, 'palette.json'), 'utf8')).map(hex);
  const sheet = n => ({ meta: JSON.parse(readFileSync(join(CLEAN, n + '.json'), 'utf8')), img: readPng(readFileSync(join(CLEAN, n + '.png'))) });
  const piece = n => readPng(readFileSync(join(PIECES_DIR, n + '.png')));
  const W = 160, H = 90, S = surface(W, H);
  /* the world under the card: x from the goal line, y from the middle */
  const camX = -44, camY = -45, sx = x => Math.round(x - camX), sy = y => Math.round(y - camY);

  /* grass, as the pitch lays it: 16 px tiles, bands 32 wide, a few textured */
  const grass = piece('grass');
  for (let y = 0; y < H + 16; y += 16) for (let x = 0; x < W + 16; x += 16) {
    const wx = x + camX, band = Math.floor((wx + 1024) / 32) & 1;
    const hh = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, variant = hh - Math.floor(hh) < .22 ? 2 : 0;
    S.draw(grass, (band + variant) * 16, 0, 16, 16, x - ((camX % 16) + 16) % 16, y);
  }
  const LINE = [244, 247, 240], la = 235;
  const line = (x, y, w, h) => S.fill(sx(x), sy(y), w, h, LINE, la);
  line(-1, -45, 2, 90);                                   // the goal line
  line(0, -37, 18, 2); line(0, 35, 18, 2); line(17, -37, 2, 74);   // the small box
  line(0, -65, 46, 2); line(45, -65, 2, 130);             // the penalty box's edge
  S.fill(sx(33), sy(-1), 3, 3, LINE, la);                 // the spot
  for (let a = -1.1; a <= 1.1; a += .02) {                // the D, outside the box
    const x = 34 + Math.cos(a) * 22, y = Math.sin(a) * 22;
    if (x > 47) S.fill(sx(x), sy(y), 2, 2, LINE, la);
  }

  /* the goal: the 1v1 one, 42 rows of net lifted out of its middle */
  const cut = (img, n) => {
    const h = img.h - n, at = 40, out = { w: img.w, h, px: new Uint8Array(img.w * h * 4) };
    for (let y = 0; y < h; y++) { const from = y < at ? y : y + n; out.px.set(img.px.subarray(from * img.w * 4, (from + 1) * img.w * 4), y * img.w * 4); }
    return out;
  };
  const back = cut(piece('goal_back'), 42), front = cut(piece('goal_front'), 42), gy = sy(Math.round(-back.h / 2));
  S.draw(back, 0, 0, back.w, back.h, sx(-41), gy);

  /* The players, in card pixels: a frame with its feet (the sheet's
     anchor) at (x, y), and a shadow on the grass `z` below. Far to near,
     as the game sorts them. */
  const shadows = piece('shadows');
  const frame = (s, an, f, x, y, face, map) => {
    const [CW, CH] = s.meta.cell, [AX, AY] = s.meta.anchor, a = s.meta.anims[an];
    S.draw(s.img, f * CW, a.row * CH, CW, CH, x - (face < 0 ? CW - 1 - AX : AX), y - AY, { flip: face < 0, map });
  };
  const shadow = (x, y) => S.draw(shadows, 0, 0, 16, 5, x - 8, y - 2, { alpha: .28 });
  const keeper = sheet('keeper'), striker = sheet('player_short'), marker = sheet('player_afro');
  const gk = lookMap(pal, { shirt: '#8b5cf6', trim: '#1f2330', shorts: '#1f2330', socks: '#8b5cf6' });
  const red = lookMap(pal, { shirt: '#d8262e', trim: '#f4f4f4', shorts: '#f4f4f4', socks: '#d8262e', tone: 'brown', hair: 'black' });
  const ball = piece('ball');
  /* the keeper a stride off his line, 10 up, reaching for the far corner;
     the ball just past his gloves, its shadow down on the grass */
  const K = { x: 54, y: 52, z: 10 }, hands = keeper.meta.anims.divefar.hands[3];
  const bx = K.x + hands[0] + 7, by = K.y - K.z + hands[1] - 6;
  shadow(K.x, K.y);
  S.draw(shadows, 16, 1, 8, 3, bx - 4, 34, { alpha: .28 });
  frame(keeper, 'divefar', 3, K.x, K.y - K.z, 1, gk);
  S.draw(ball, 0, 0, 10, 10, bx - 5, by - 5);
  shadow(138, 70); frame(striker, 'shoot', 4, 138, 70, -1);
  shadow(106, 84); frame(marker, 'run', 2, 106, 84, -1, red);
  S.draw(front, 0, 0, front.w, front.h, sx(-41), gy);
  return writePng(S);
}

/* ------------------------------------------------------------ the module */
export function embed() {
  const uri = buf => 'data:image/png;base64,' + buf.toString('base64');
  const palette = JSON.parse(readFileSync(join(CLEAN, 'palette.json'), 'utf8'));
  const sheets = {};
  for (const n of SHEETS) sheets[n] = { meta: JSON.parse(readFileSync(join(CLEAN, n + '.json'), 'utf8')), png: uri(readFileSync(join(CLEAN, n + '.png'))) };
  const pieces = {};
  for (const n of PIECES) pieces[n] = uri(readFileSync(join(PIECES_DIR, n + '.png')));
  const cardPng = card();
  writeFileSync(join(ART, 'card.png'), cardPng);
  const js =
    '/* GENERATED by tools/soccer/embed.mjs from art/soccer: do not edit, run\n' +
    '   node tools/soccer/clean.mjs (or embed.mjs) instead. Soccer\'s art, in the\n' +
    '   page so games.html stays one file: the cleaned sheets and their animation\n' +
    '   tables, the small pieces as delivered, the palette the kits are recoloured\n' +
    '   by, and the hub card. */\n' +
    'const SOC_ART = {\n' +
    '  palette: ' + JSON.stringify(palette) + ',\n' +
    '  sheets: {\n' + SHEETS.map(n => '    ' + n + ': { meta: ' + JSON.stringify(sheets[n].meta) + ',\n      png: \'' + sheets[n].png + '\' }').join(',\n') + '\n  },\n' +
    '  pieces: {\n' + PIECES.map(n => '    ' + n + ': \'' + pieces[n] + '\'').join(',\n') + '\n  },\n' +
    '  card: \'' + uri(cardPng) + '\'\n' +
    '};\n';
  writeFileSync(OUT, js);
  console.log(`embedded ${SHEETS.length} sheets, ${PIECES.length} pieces and the card -> ${OUT} (${(js.length / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) embed();
