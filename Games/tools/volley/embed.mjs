/* ============================================================================
   EMBED — Beach Volley's art, packed into the arcade.

   games.html is one file that also has to work opened straight off the
   disk, so the sheets clean.mjs makes go into the page itself: this writes
   src/js/games/volley/art-data.js (VOL_ART), holding the cleaned sheets and
   their animation tables, the backdrop, both shared palettes (the people's
   with what each colour is for), and the hub card, painted here from those
   same sprites (card()).

   node tools/volley/embed.mjs     (clean.mjs runs it too, after every clean)
   ========================================================================== */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from '../soccer/png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLEAN = join(ROOT, 'art', 'volley', 'clean');
const OUT = join(ROOT, 'src', 'js', 'games', 'volley', 'art-data.js');
const SHEETS = ['volley_player', 'volley_umpire', 'beach_fans', 'beach_props', 'beach_critters', 'beach_ball', 'beach_net'];

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;
const shade = (b, r) => b.map(v => Math.round(Math.max(0, Math.min(255, r <= 1 ? v * r : v + (255 - v) * (r - 1) * .9))));

/* a picture to paint into, with see-through blending */
function surface(w, h) {
  const px = new Uint8Array(w * h * 4);
  const put = (x, y, r, g, b, a = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
    const o = (y * w + x) * 4, k = a / 255, ka = px[o + 3] / 255, out = k + ka * (1 - k);
    px[o] = Math.round((r * k + px[o] * ka * (1 - k)) / out);
    px[o + 1] = Math.round((g * k + px[o + 1] * ka * (1 - k)) / out);
    px[o + 2] = Math.round((b * k + px[o + 2] * ka * (1 - k)) / out);
    px[o + 3] = Math.round(out * 255);
  };
  const fill = (x, y, fw, fh, c, a = 255) => { for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) put(x + i, y + j, c[0], c[1], c[2], a); };
  /* part of an image at (dx, dy), mirrored if asked, recoloured by map */
  const draw = (img, sx, sy, sw, sh, dx, dy, o = {}) => {
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * img.w + sx + (o.flip ? sw - 1 - x : x)) * 4;
      let r = img.px[i], g = img.px[i + 1], b = img.px[i + 2];
      const a = img.px[i + 3];
      if (!a) continue;
      const c = o.map && o.map.get((r << 16) | (g << 8) | b);
      if (c) [r, g, b] = c;
      put(dx + x, dy + y, r, g, b, a);
    }
  };
  return { w, h, px, put, fill, draw };
}

/* The hub card: a spike at the net. A player in the air on the left, arm
   through the ball just over the tape, the other side's blocker up with
   both hands, the net leaning away like the game's, and the backdrop's own
   sky, sea and sand behind, a palm at the edge. 160x90 art pixels; the
   card shows it at twice that. */
function card(pal) {
  const W = 160, H = 90, S = surface(W, H);
  const sheet = n => ({ meta: JSON.parse(readFileSync(join(CLEAN, n + '.json'), 'utf8')), img: readPng(readFileSync(join(CLEAN, n + '.png'))) });
  /* the backdrop, a piece of it with the horizon a third of the way down */
  const bd = readPng(readFileSync(join(CLEAN, 'beach_backdrop.png')));
  S.draw(bd, 96, 50, W, H, 0, 0);
  const frame = (s, an, f, x, y, face, map) => {
    const [CW, CH] = s.meta.cell, [AX, AY] = s.meta.anchor, a = s.meta.anims[an];
    S.draw(s.img, f * CW, a.row * CH, CW, CH, x - (face < 0 ? CW - 1 - AX : AX), y - AY, { flip: face < 0, map });
  };
  /* one piece of a sheet of pieces, its foot at (x, y) */
  const piece = (s, an, fi, x, y, face) => {
    const m = s.meta, a = m.anims[an], [w, h, dx, lift] = a.boxes[fi];
    const sx = fi * m.cell[0] + m.anchor[0] - dx, sy = a.row * m.cell[1] + m.anchor[1] - lift - h;
    S.draw(s.img, sx, sy, w, h, face < 0 ? x - (w - dx) : x - dx, y - h - lift, { flip: face < 0 });
  };
  const props = sheet('beach_props'), net = sheet('beach_net'), ball = sheet('beach_ball');
  piece(props, 'tall', 0, 14, 80, 1);
  piece(props, 'tall', 3, 150, 74, -1);
  /* The net, leaning away as it does in the game: the far post up to the
     right, the near one down to the left, the mesh between the tape and the
     bottom band, a column at a time */
  const near = [68, 93], far = [98, 66], TAPE = 46, LOW = 26;
  piece(net, 'post', 0, far[0], far[1], 1);
  for (let c = near[0] + 1; c < far[0]; c++) {
    const k = (c - near[0]) / (far[0] - near[0]), g = near[1] + (far[1] - near[1]) * k, t = Math.round(g - TAPE), b = Math.round(g - LOW);
    for (let y = t + 2; y < b; y++) S.put(c, y, 16, 20, 34, (y - t + c) % 3 === 0 ? 120 : c & 1 ? 70 : 40);
    S.fill(c, t - 1, 1, 1, [27, 47, 110]); S.fill(c, t, 1, 2, [244, 244, 244]); S.fill(c, b, 1, 1, [226, 226, 226]);
  }
  piece(net, 'post', 1, far[0] - 3, far[1] - TAPE + 2, 1);
  /* the kits: the left side as drawn, the right in red */
  const roles = pal.roles, P = pal.colours.map(hex);
  const red = new Map(), key = c => (c[0] << 16) | (c[1] << 8) | c[2];
  for (const [role, to] of [['shirt', '#e8503a'], ['trim', '#f4f4f4'], ['shorts', '#f4f4f4']]) {
    const { idx, base } = roles[role], b = lum(P[base]);
    for (const i of idx) red.set(key(P[i]), shade(hex(to), lum(P[i]) / b));
  }
  const pl = sheet('volley_player');
  /* shadows on the sand under where each will come down */
  for (const [x, y, w] of [[54, 88, 12], [92, 83, 12]]) for (let i = 0; i < w; i++) for (const d of [0, 1]) S.put(x - w / 2 + i + d, y + d, 120, 84, 40, 90);
  frame(pl, 'block', 3, 92, 69, -1, red);
  piece(net, 'post', 0, near[0], near[1], 1);
  piece(net, 'post', 1, near[0] - 3, near[1] - TAPE + 2, 1);
  frame(pl, 'spike', 4, 54, 73, 1);
  /* the ball, just over the tape */
  piece(ball, 'ball', 1, 64, 27, 1);
  return 'data:image/png;base64,' + Buffer.from(writePng({ w: W, h: H, px: S.px })).toString('base64');
}

export function embed() {
  const people = JSON.parse(readFileSync(join(CLEAN, 'people_palette.json'), 'utf8'));
  const things = JSON.parse(readFileSync(join(CLEAN, 'things_palette.json'), 'utf8'));
  /* whichever sheets have been cleaned so far */
  const names = SHEETS.filter(n => existsSync(join(CLEAN, n + '.png'))), sheets = {};
  for (const n of names) {
    sheets[n] = {
      meta: JSON.parse(readFileSync(join(CLEAN, n + '.json'), 'utf8')),
      png: 'data:image/png;base64,' + readFileSync(join(CLEAN, n + '.png')).toString('base64')
    };
  }
  const bd = join(CLEAN, 'beach_backdrop.png');
  const backdrop = existsSync(bd) ? 'data:image/png;base64,' + readFileSync(bd).toString('base64') : null;
  const body = '/* GENERATED by tools/volley/embed.mjs from art/volley: do not edit, run\n' +
    '   node tools/volley/clean.mjs (or embed.mjs) instead. Beach Volley\'s art, in\n' +
    '   the page so games.html stays one file: the cleaned sheets and their\n' +
    '   animation tables, the backdrop, the palettes (the people\'s with what each colour is\n' +
    '   for, which the kits are recoloured by), and the hub card. */\n' +
    'const VOL_ART = ' + JSON.stringify({ people, things, sheets, backdrop, card: card(people) }) + ';\n';
  writeFileSync(OUT, body);
  console.log(`embedded ${names.length} sheets${backdrop ? ', the backdrop' : ''} and the card -> ${OUT} (${Math.round(body.length / 1024)} KB)`);
}
if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) embed();
