/* ============================================================================
   CLEAN — turns an image generator's sprite sheet into real pixel art.

   A generated sheet looks like pixel art but isn't: its "pixels" are soft
   blocks about 3.5 image pixels wide, not on any exact grid, with blended
   edges and a haze of near-duplicate colours. This recovers the art under
   it:

     1. cut the sheet into rows (one animation each) and frames
     2. reduce every colour on every sheet to one shared palette (k-means)
     3. for each frame, find where its pixel grid lies (the offset at which
        the blocks come out most uniform) and read one art pixel per block
        by majority vote
     4. tidy stray pixels, fix the faces (fixFace), line the frames up on
        the ground and on the head, and pack them into one clean sheet with
        a JSON of the animations
     5. rows delivered later, on sheets of their own, go into the sheet
        they belong to (MERGE)

   node tools/soccer/clean.mjs            every sheet in art/soccer/GameReady that
                                          has a layout below
   node tools/soccer/clean.mjs --palette  work the shared palette out again (see run())
   Output goes to art/soccer/clean/: <name>.png (1x) and <name>.json, and
   from there into the game (embed.mjs).
   ========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng, writePng } from './png.mjs';
import { embed } from './embed.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* the delivered sheets live in art/soccer/GameReady: new art goes there */
const ART = join(ROOT, 'art', 'soccer'), OUT = join(ART, 'clean');
const SRC = existsSync(join(ART, 'GameReady')) ? join(ART, 'GameReady') : ART;

/* What each sheet holds, row by row: the animation, how many frames the
   brief asked for, seconds per frame, and whether it loops. */
const PLAYER = [
  ['idle', 4, .2, true], ['run', 8, .08, true], ['dribble', 8, .08, true], ['shoot', 6, .07, false],
  ['pass', 4, .07, false], ['slide', 5, .09, false], ['header', 6, .08, false], ['knocked', 5, .1, false],
  ['getup', 4, .1, false], ['celebrate', 6, .1, true], ['throwin', 5, .1, false], ['chest', 3, .1, false],
  ['dejected', 2, .4, true]
];
const KEEPER = [
  ['ready', 4, .2, true], ['shuffle', 6, .1, true], ['run', 8, .08, true], ['dive', 6, .07, false],
  ['lowdive', 5, .07, false], ['highcatch', 5, .08, false], ['chestcatch', 3, .1, false], ['hold', 2, .4, true],
  ['throw', 5, .08, false], ['punt', 6, .07, false], ['celebrate', 4, .12, true], ['knocked', 5, .1, false]
];
/* The celebration and sad rows. A fifth entry is a tail: after playing
   through once, the last that many frames loop (a knee slide ends yelling
   with fists pumping; sinking to the knees ends rocking). cel_* rows are
   what the side that scored or won does, sad_* the other side. */
const CELEBRATE = [
  ['cel_floss', 8, .08, true], ['cel_kneeslide', 6, .09, false, 2], ['cel_backflip', 8, .07, false, 2],
  ['cel_airplane', 8, .08, true], ['cel_robot', 6, .13, true], ['cel_flex', 4, .16, true]
];
const SAD = [
  ['sad_knees', 6, .12, false, 2], ['sad_flat', 4, .2, false, 2], ['sad_headhands', 4, .22, true],
  ['sad_stomp', 6, .1, true], ['sad_cry', 4, .16, true]
];
const KEEPER_EMOTES = [
  ['cel_roar', 6, .1, true], ['cel_kneeslide', 6, .09, false, 2], ['sad_post', 4, .25, false, 2], ['sad_punch', 6, .1, true]
];
const BODY = ['cel_backflip', 'cel_kneeslide', 'sad_flat', 'sad_knees', 'sad_post', 'sad_punch'];
const STAND_ROW = ['stand', 1, 1, true];
/* The referee and the crowd, briefed 2026-09-26. The referee is a player's
   size and works the far touchline, so like a fan he faces the viewer; he
   gets about by sidestepping along it, and whatever he does one way (the
   step, a point, a card, play on) goes to the image's right, mirrored in
   the game for the left (referee_front.png, which replaced a side view). A
   fan faces the pitch too, sits in the stands and is a little over half a
   player's height. */
const REFEREE = [
  STAND_ROW, ['watch', 1, .5, true], ['sidestep', 8, .065, true], ['whistle', 4, .12, false], ['point', 3, .1, false],
  ['yellow', 6, .1, false], ['red', 6, .1, false], ['playon', 3, .12, false]
];
const FANS = [
  STAND_ROW, ['sit', 2, .5, true], ['clap', 2, .14, true], ['cheer', 4, .1, false, 2], ['scarf', 4, .16, true],
  ['flag', 4, .14, true], ['groan', 2, .4, true], ['standclap', 2, .14, true]
];
/* `stand` is a frame of the player standing upright ([row, frame]): the
   sheet is read at whatever scale makes that frame STAND art pixels tall,
   so a keeper the generator happened to draw bigger comes out the same
   size as everyone else. The other haircuts are edits of the short-hair
   sheet with the same bodies, and a taller haircut must not shrink them,
   so they take its scale (`like`) instead. */
const LAYOUTS = {
  player_short: { rows: PLAYER, stand: [0, 0] },
  player_spiky: { rows: PLAYER, like: 'player_short' },
  player_afro: { rows: PLAYER, like: 'player_short' },
  player_long: { rows: PLAYER, like: 'player_short' },
  keeper: { rows: KEEPER, stand: [7, 0], hands: ['divefar', 'divenear'] },
  /* Later deliveries (`extra`): rows for the sheets above, read the same
     way at their own scale, then merged in (MERGE). A dive across the goal
     is lined up on the body (`body`), not the head: at full stretch the
     top of the frame is the gloves or the boots. */
  keeper_moves: {
    rows: [['ready', 2, .5, true], ['hold', 2, .5, true], ['divefar', 8, .06, false], ['divenear', 8, .06, false]],
    stand: [1, 0], extra: true, body: ['divefar', 'divenear']
  },
  player_idle: {
    rows: [['short', 2, .5, true], ['spiky', 2, .5, true], ['afro', 2, .5, true], ['long', 2, .5, true]],
    stand: [0, 0], extra: true
  },
  /* Celebrations and their opposite, briefed 2026-09-26: a sheet of each
     for the short-haired player (the one you play), the same sheets edited
     to each other haircut if they come (player_celebrate_spiky and so on,
     cut along the short-hair one's frames), and the keeper's. Each opens
     with a row of one frame, the ordinary standing pose, which is what the
     scale is read from (a looping row cannot start standing); only the
     named rows go into the game. Flips, slides and lying down are lined up
     on the body. */
  player_celebrate: { rows: [STAND_ROW, ...CELEBRATE], stand: [0, 0], extra: true, body: BODY },
  player_sad: { rows: [STAND_ROW, ...SAD], stand: [0, 0], extra: true, body: BODY },
  ...Object.fromEntries(['spiky', 'afro', 'long'].flatMap(h => [
    ['player_celebrate_' + h, { rows: [STAND_ROW, ...CELEBRATE], like: 'player_celebrate', extra: true, body: BODY }],
    ['player_sad_' + h, { rows: [STAND_ROW, ...SAD], like: 'player_sad', extra: true, body: BODY }]
  ])),
  keeper_emotes: { rows: [STAND_ROW, ...KEEPER_EMOTES], stand: [0, 0], extra: true, body: BODY },
  /* `steady`: a loop whose head is drawn once, that many rows deep from its
     top (see the packing in run()) */
  referee_front: { rows: REFEREE, stand: [0, 0], steady: { sidestep: 13 } },
  /* A fan stands 17 art pixels (`standPx`): the generator drew him in
     blocks of about 6 image pixels, a little coarser than the players'. The
     other two are edits of the first, cut along it and read at its scale. */
  fans: { rows: FANS, stand: [0, 0], standPx: 17 },
  fans_long: { rows: FANS, like: 'fans' },
  fans_cap: { rows: FANS, like: 'fans' },
  /* The stands: three pieces, not frames (a straight run that repeats, the
     same with a stairway through it, and the left end), read at a set
     scale, since nothing in them stands up to measure it by: their blocks
     are about 5.5 image pixels. `plain`: no faces to fix. `boxes`: each
     piece's own size goes into the JSON, for laying them end to end. */
  stands: { rows: [['straight', 1, 1, true], ['aisle', 1, 1, true], ['end', 1, 1, true]], scale: 5.5, plain: true, boxes: true }
};
/* Where a later delivery's rows go: [sheet, its row, the row it becomes,
   how]. 'bob' keeps only the first frame and makes the second from it (see
   bob()): the generator redraws every frame of a pair, and a redrawn pair
   crawls when it loops. Without a how, every frame as it is. A sheet that
   has not been delivered is skipped. */
const rowsOf = (src, list) => list.map(([n]) => [src, n, n]);
const MERGE = {
  keeper: [['keeper_moves', 'ready', 'ready', 'bob'], ['keeper_moves', 'hold', 'hold', 'bob'], ['keeper_moves', 'divefar', 'divefar'], ['keeper_moves', 'divenear', 'divenear'],
    ...rowsOf('keeper_emotes', KEEPER_EMOTES)],
  player_short: [['player_idle', 'short', 'idle', 'bob'], ...rowsOf('player_celebrate', CELEBRATE), ...rowsOf('player_sad', SAD)],
  player_spiky: [['player_idle', 'spiky', 'idle', 'bob'], ...rowsOf('player_celebrate_spiky', CELEBRATE), ...rowsOf('player_sad_spiky', SAD)],
  player_afro: [['player_idle', 'afro', 'idle', 'bob'], ...rowsOf('player_celebrate_afro', CELEBRATE), ...rowsOf('player_sad_afro', SAD)],
  player_long: [['player_idle', 'long', 'idle', 'bob'], ...rowsOf('player_celebrate_long', CELEBRATE), ...rowsOf('player_sad_long', SAD)],
  /* a breath made from the first frame, as for the players' idle */
  referee_front: [['referee_front', 'watch', 'watch', 'bob']],
  ...Object.fromEntries(['fans', 'fans_long', 'fans_cap'].map(n => [n, [[n, 'sit', 'sit', 'bob']]]))
};
/* The colours the face fix and the merge work with, by value (they must be
   in the palette, which is kept from run to run): the same roles as
   soc-art.js, which recolours kits, skin and hair by them. */
export const COLOURS = {
  skin: ['#f9c49c', '#f8af84', '#f2a073', '#e58d60', '#d27c53', '#c86543'],
  hair: ['#9e663b', '#7f4e2c', '#593b28', '#472822', '#371f1a', '#251715'],
  shirt: ['#fad911', '#f8ca0b', '#f3ba06', '#e1a709', '#cb8d07', '#a09226'],
  shorts: ['#153a89'],
  grey: ['#5f6372', '#9b949a', '#ccc7d1'],
  black: ['#040202'], ink: '#120b0b', white: '#f6f1ef'
};
const scaleOf = {};
export const STAND = 28;             // art pixels, boots to hair (the outfield sheet's own size: 98 image px / 3.5)
export const PALETTE_K = 30;         // colours in the shared palette
let S = 3.5;                  // image pixels per art pixel; set per sheet from its standing frame
/* The helpers here are shared: tools/volley/clean.mjs reads Beach Volley's
   sheets with them, setting the scale each is read at through this. */
export const setScale = s => { S = s; };

/* --------------------------------------------------------------- cutting */
export function cut(img, rows) {
  const { w, h, px } = img;
  const on = (x, y) => px[(y * w + x) * 4 + 3] > 128;
  /* rows: bands of lines with anything opaque; slivers are specks, not rows */
  const bands = [];
  let s = -1;
  for (let y = 0; y <= h; y++) {
    let any = false;
    if (y < h) for (let x = 0; x < w; x++) if (on(x, y)) { any = true; break; }
    if (any && s < 0) s = y;
    if (!any && s >= 0) { if (y - s > 12) bands.push([s, y - 1]); s = -1; }
  }
  /* two rows touching (a spike of hair reaching up into the row above):
     split the tallest band at its thinnest line, until the count is right */
  const lineCount = y => { let c = 0; for (let x = 0; x < w; x++) if (on(x, y)) c++; return c; };
  while (bands.length < rows.length) {
    let k = 0;
    bands.forEach((b, i) => { if (b[1] - b[0] > bands[k][1] - bands[k][0]) k = i; });
    const [y0, y1] = bands[k], a0 = y0 + Math.round((y1 - y0) * .3), a1 = y0 + Math.round((y1 - y0) * .7);
    let best = a0, bc = 1e9;
    for (let y = a0; y <= a1; y++) { const c = lineCount(y); if (c < bc) { bc = c; best = y; } }
    bands.splice(k, 1, [y0, best], [best + 1, y1]);
  }
  if (bands.length !== rows.length) throw new Error(`expected ${rows.length} rows, found ${bands.length}`);
  return bands.map(([y0, y1], r) => {
    const colOn = x => { for (let y = y0; y <= y1; y++) if (on(x, y)) return true; return false; };
    let segs = [], a = -1;
    for (let x = 0; x <= w; x++) {
      const c = x < w && colOn(x);
      if (c && a < 0) a = x;
      if (!c && a >= 0) { segs.push([a, x - 1]); a = -1; }
    }
    /* a sliver next to a frame is a speck or a loose bit of it: fold it into the nearer neighbour */
    const med = () => { const ws = segs.map(q => q[1] - q[0] + 1).sort((p, q) => p - q); return ws[ws.length >> 1]; };
    for (let guard = 0; guard < 20; guard++) {
      const m = med(), k = segs.findIndex(q => q[1] - q[0] + 1 < m * .35);
      if (k < 0 || segs.length === 1) break;
      const L = k > 0 ? segs[k][0] - segs[k - 1][1] : 1e9, R = k < segs.length - 1 ? segs[k + 1][0] - segs[k][1] : 1e9;
      if (L > 60 && R > 60) { segs.splice(k, 1); continue; }           // far from anything: a speck
      const j = L <= R ? k - 1 : k + 1;
      const merged = [Math.min(segs[j][0], segs[k][0]), Math.max(segs[j][1], segs[k][1])];
      segs.splice(Math.min(j, k), 2, merged);
    }
    /* two frames touching: split the widest at its thinnest column, until the count is right */
    const want = rows[r][1];
    while (segs.length < want) {
      let k = 0;
      segs.forEach((q, i) => { if (q[1] - q[0] > segs[k][1] - segs[k][0]) k = i; });
      const [x0, x1] = segs[k], a0 = x0 + Math.round((x1 - x0) * .3), a1 = x0 + Math.round((x1 - x0) * .7);
      let best = a0, bc = 1e9;
      for (let x = a0; x <= a1; x++) { let c = 0; for (let y = y0; y <= y1; y++) if (on(x, y)) c++; if (c < bc) { bc = c; best = x; } }
      segs.splice(k, 1, [x0, best], [best + 1, x1]);
    }
    /* each frame's own box, top to bottom */
    return segs.map(([x0, x1]) => {
      let t = y1, b = y0;
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (on(x, y)) { if (y < t) t = y; if (y > b) b = y; }
      return { x0, x1, y0: t, y1: b };
    });
  });
}

/* --------------------------------------------------------------- palette */
export function kmeans(samples, k) {
  /* k-means++ seeding, then Lloyd's; colours are [r, g, b] */
  const d2 = (a, b) => (a[0] - b[0]) ** 2 * .3 + (a[1] - b[1]) ** 2 * .59 + (a[2] - b[2]) ** 2 * .11;
  const cents = [samples[Math.floor(samples.length / 2)]];
  let rnd = 12345; const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const dist = samples.map(s => d2(s, cents[0]));
  while (cents.length < k) {
    const tot = dist.reduce((a, b) => a + b, 0); let r = rand() * tot, i = 0;
    for (; i < samples.length - 1; i++) { r -= dist[i]; if (r <= 0) break; }
    cents.push(samples[i].slice());
    for (let j = 0; j < samples.length; j++) dist[j] = Math.min(dist[j], d2(samples[j], cents[cents.length - 1]));
  }
  for (let it = 0; it < 16; it++) {
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (const s of samples) { let bi = 0, bd = 1e18; cents.forEach((c, i) => { const d = d2(s, c); if (d < bd) { bd = d; bi = i; } }); const q = sum[bi]; q[0] += s[0]; q[1] += s[1]; q[2] += s[2]; q[3]++; }
    cents.forEach((c, i) => { const q = sum[i]; if (q[3]) { c[0] = q[0] / q[3]; c[1] = q[1] / q[3]; c[2] = q[2] / q[3]; } });
  }
  return cents.map(c => c.map(v => Math.round(v)));
}
export function nearest(pal, r, g, b) {
  let bi = 0, bd = 1e18;
  for (let i = 0; i < pal.length; i++) { const c = pal[i], d = (c[0] - r) ** 2 * .3 + (c[1] - g) ** 2 * .59 + (c[2] - b) ** 2 * .11; if (d < bd) { bd = d; bi = i; } }
  return bi;
}

/* -------------------------------------------------------- one frame's art */
/* the sheet as palette indices, -1 where it is see-through */
export function indexImage(img, pal) {
  const { w, h, px } = img, idx = new Int16Array(w * h), memo = new Map();
  for (let i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] <= 128) { idx[i] = -1; continue; }
    const key = (px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2];
    let v = memo.get(key);
    if (v === undefined) { v = nearest(pal, px[i * 4], px[i * 4 + 1], px[i * 4 + 2]); memo.set(key, v); }
    idx[i] = v;
  }
  return idx;
}
/* Which frame every opaque pixel belongs to: the frame box it is nearest
   (within `margin`). With margin 0 that is just the box it is in; with a
   margin, a haircut that grew past the box it was drawn in still goes with
   its own head and not with the row above. Each frame comes back as its
   own crop of palette indices, -1 wherever it is empty or someone else's. */
export function own(img, idx, rows, margin) {
  const { w, h } = img, flat = [];
  rows.forEach((row, r) => row.forEach((b, i) => flat.push({ r, i, b })));
  const owner = new Int32Array(w * h).fill(-1), dist = new Float32Array(w * h).fill(1e9);
  flat.forEach(({ b }, k) => {
    for (let y = Math.max(0, b.y0 - margin); y <= Math.min(h - 1, b.y1 + margin); y++)
      for (let x = Math.max(0, b.x0 - margin); x <= Math.min(w - 1, b.x1 + margin); x++) {
        const p = y * w + x;
        if (idx[p] < 0) continue;
        const dx = x < b.x0 ? b.x0 - x : x > b.x1 ? x - b.x1 : 0, dy = y < b.y0 ? b.y0 - y : y > b.y1 ? y - b.y1 : 0;
        const d = Math.hypot(dx, dy);
        if (d < dist[p]) { dist[p] = d; owner[p] = k; }
      }
  });
  const crops = flat.map(() => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
  for (let p = 0; p < w * h; p++) {
    const k = owner[p]; if (k < 0) continue;
    const x = p % w, y = (p / w) | 0, c = crops[k];
    if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
  }
  for (const c of crops) { c.w = c.x1 - c.x0 + 1; c.h = c.y1 - c.y0 + 1; c.idx = new Int16Array(Math.max(0, c.w * c.h)).fill(-1); }
  for (let p = 0; p < w * h; p++) {
    const k = owner[p]; if (k < 0) continue;
    const c = crops[k];
    c.idx[((p / w | 0) - c.y0) * c.w + (p % w) - c.x0] = idx[p];
  }
  const out = rows.map(row => row.map(() => null));
  flat.forEach((q, k) => { out[q.r][q.i] = crops[k]; });
  return out;
}
/* Read a frame one art pixel per block of S x S, with the blocks laid at
   offset (fx, fy); each block votes, its middle only, since its edges are
   where the generator blended one block into the next. */
export function sample(c, fx, fy, npal) {
  const m = .55, ox = -S + fx, oy = -S + fy;
  const cw = Math.ceil((c.w - ox) / S) + 1, ch = Math.ceil((c.h - oy) / S) + 1;
  const out = new Int16Array(cw * ch).fill(-1), votes = new Int32Array(npal + 1);
  let pure = 0, count = 0;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const xa = Math.ceil(ox + i * S + m), xb = Math.floor(ox + (i + 1) * S - m), ya = Math.ceil(oy + j * S + m), yb = Math.floor(oy + (j + 1) * S - m);
    votes.fill(0); let n = 0;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const v = x < 0 || y < 0 || x >= c.w || y >= c.h ? -1 : c.idx[y * c.w + x];
      votes[v < 0 ? npal : v]++; n++;
    }
    if (!n) continue;
    let bi = npal; for (let v = 0; v <= npal; v++) if (votes[v] > votes[bi]) bi = v;
    out[j * cw + i] = bi === npal ? -1 : bi;
    if (votes[npal] < n) { pure += votes[bi] / n; count++; }
  }
  return { w: cw, h: ch, px: out, score: count ? pure / count : 0 };
}
export function bestSample(c, npal) {
  let best = null;
  for (let fy = 0; fy < S; fy += .25) for (let fx = 0; fx < S; fx += .25) {
    const s = sample(c, fx, fy, npal);
    if (!best || s.score > best.score) best = s;
  }
  return best;
}
/* Stray pixels: a speck floating on its own goes, a pinhole in the middle
   of a shape is filled, and a small scrap that isn't joined to anything —
   a glove left behind where two frames touched — is dropped (a ball, being
   bigger, stays). */
export function tidy(f) {
  const { w, h, px } = f, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : px[y * w + x];
  const out = px.slice();
  const seen = new Uint8Array(w * h), parts = [];
  for (let s = 0; s < w * h; s++) {
    if (px[s] < 0 || seen[s]) continue;
    const list = [s]; seen[s] = 1;
    for (let k = 0; k < list.length; k++) {
      const x = list[k] % w, y = (list[k] / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (px[n] >= 0 && !seen[n]) { seen[n] = 1; list.push(n); }
      }
    }
    parts.push(list);
  }
  if (parts.length > 1) for (const p of parts) if (p.length < 18) for (const i of p) out[i] = -1;
  const a2 = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : out[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = [a2(x + 1, y), a2(x - 1, y), a2(x, y + 1), a2(x, y - 1)];
    if (out[y * w + x] >= 0 && n.every(v => v < 0)) out[y * w + x] = -1;
    else if (out[y * w + x] < 0 && px[y * w + x] < 0 && n.every(v => v >= 0)) {
      const c = {}; n.forEach(v => { c[v] = (c[v] || 0) + 1; });
      out[y * w + x] = +Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  /* trim to what is left */
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out[y * w + x] >= 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const tw = x1 - x0 + 1, th = y1 - y0 + 1, t = new Int16Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) t[y * tw + x] = out[(y + y0) * w + x + x0];
  return { w: tw, h: th, px: t };
}

/* ----------------------------------------------------------------- pack */
/* Where a frame stands: its feet on the row's ground (so a jump keeps its
   height) and, if it is upright, its head over the same spot as every other
   frame (the head is the steadiest thing in a drawing); a lying or diving
   frame is centred on its body instead. */
export function place(frames, boxes, body) {
  /* a dive toward the viewer reaches lower down the screen than the feet
     it took off from, so there the ground is the first frame's, stood on it */
  const ground = body ? boxes[0].y1 : Math.max(...boxes.map(b => b.y1));
  return frames.map((f, i) => {
    const lift = Math.round((ground - boxes[i].y1) / S);
    let cx;
    if (body) {
      /* the middle of the shirt: where the body is, whichever way it points */
      let sx = 0, n = 0;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (body.has(f.px[y * f.w + x])) { sx += x + .5; n++; }
      cx = n ? sx / n : f.w / 2;
    }
    else if (f.w > f.h * 1.15) cx = f.w / 2;
    else {
      let sx = 0, n = 0;
      const rows = Math.min(f.h, 12);
      for (let y = 0; y < rows; y++) for (let x = 0; x < f.w; x++) if (f.px[y * f.w + x] >= 0) { sx += x + .5; n++; }
      cx = n ? sx / n : f.w / 2;
    }
    return { dx: Math.round(cx), lift };
  });
}

/* ------------------------------------------------------------ the faces */
/* Palette indices for the colours in COLOURS */
export function roles(pal) {
  const at = h => {
    const c = hexRgb(h), i = pal.findIndex(p => p[0] === c[0] && p[1] === c[1] && p[2] === c[2]);
    if (i < 0) throw new Error(`${h} is not in the palette: the roles in COLOURS (and soc-art.js) need working out again`);
    return i;
  };
  const set = list => new Set(list.map(at));
  return {
    skin: set(COLOURS.skin), hair: COLOURS.hair.map(at), hairSet: set(COLOURS.hair), shirt: set(COLOURS.shirt),
    shorts: set(COLOURS.shorts), grey: set(COLOURS.grey), black: set(COLOURS.black), ink: at(COLOURS.ink), white: at(COLOURS.white)
  };
}
export const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const rgbHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
export const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;

/* 8-connected patches of the pixels `keep` says yes to */
export function patches(f, keep) {
  const { w, h, px } = f, seen = new Uint8Array(w * h), out = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !keep(px[s])) continue;
    const list = [s]; seen[s] = 1;
    for (let k = 0; k < list.length; k++) {
      const x = list[k] % w, y = (list[k] / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, n = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[n] || !keep(px[n])) continue;
        seen[n] = 1; list.push(n);
      }
    }
    out.push(list);
  }
  return out;
}
/* The hair: the big patch of hair colours on the head (a ponytail or a
   spike cut off by the outline still counts, a stray brown pixel doesn't) */
export function hairOf(f, R) {
  const ps = patches(f, v => R.hairSet.has(v)), big = Math.max(0, ...ps.map(p => p.length));
  const mask = new Uint8Array(f.w * f.h);
  for (const p of ps) if (p.length >= Math.max(6, big * .15)) for (const i of p) mask[i] = 1;
  return mask;
}
/* The generator's weakest spot is the eyes: from frame to frame it draws
   them black, grey or in the hair's own browns, so they flickered, and a
   player given blond hair got blond eyes. Near the hair, anything inside
   the face (skin either side of it, across or up and down) that isn't skin
   is an eye, a brow or the mouth: the dark of it becomes the outline's
   black and the light becomes white, which nothing recolours. And a pixel
   of the hair's browns that isn't part of the hair (in a boot, a glove,
   the shirt) goes onto a twin of its colour that no haircut recolours
   (twins()). */
export function fixFace(f, R, pal) {
  const { w, h, px } = f, out = px.slice();
  const hair = hairOf(f, R);
  /* how far each pixel is from the hair (chessboard), capped */
  const far = new Uint8Array(w * h).fill(99);
  for (let i = 0; i < w * h; i++) if (hair[i]) far[i] = 0;
  for (let pass = 0; pass < 8; pass++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let d = far[y * w + x];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && far[ny * w + nx] + 1 < d) d = far[ny * w + nx] + 1;
    }
    far[y * w + x] = d;
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : px[y * w + x];
  /* skin within n steps that way, through anything but see-through */
  const skin = (x, y, dx, dy, n) => {
    for (let k = 1; k <= n; k++) { const v = at(x + dx * k, y + dy * k); if (v < 0) return false; if (R.skin.has(v)) return true; }
    return false;
  };
  const eyeish = v => R.hairSet.has(v) || R.grey.has(v) || R.black.has(v) || v === R.ink;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = px[i];
    if (v < 0 || !eyeish(v) || far[i] > 7) continue;
    if ((skin(x, y, -1, 0, 3) && skin(x, y, 1, 0, 3)) || (skin(x, y, 0, -1, 3) && skin(x, y, 0, 1, 3)))
      out[i] = lum(pal[v]) < 128 ? R.ink : R.white;
  }
  /* what is left in the hair's colours but not in the hair: its twin */
  const f2 = { w, h, px: out }, hair2 = hairOf(f2, R);
  for (let i = 0; i < w * h; i++) {
    const k = R.hair.indexOf(out[i]);
    if (k >= 0 && !hair2[i]) out[i] = pal.length + k;
  }
  return { w, h, px: out };
}
/* A twin for each hair colour, one step off in blue: it looks the same,
   but soc-art.js recolours by exact colour, so a haircut leaves it alone.
   They go after the palette, at pal.length + k. */
export function twins(pal, R) {
  return R.hair.map(i => { const c = pal[i].slice(); c[2] += c[2] < 255 ? 1 : -1; return c; });
}
/* A breath: everything above the waist (the top of the shorts) one pixel
   lower, over the top of the shorts; the legs stay put */
export function bob(q, R) {
  const { w, h, px } = q.f;
  let waist = -1;
  for (let y = 0; y < h && waist < 0; y++) { let n = 0; for (let x = 0; x < w; x++) if (R.shorts.has(px[y * w + x])) n++; if (n >= 2) waist = y; }
  /* no blue shorts (the referee's are charcoal): the chibi waist is a
     little below the middle */
  if (waist < 0) waist = Math.round(h * .6);
  if (waist < 1) return q;
  const out = px.slice();
  for (let x = 0; x < w; x++) out[x] = -1;
  for (let y = waist; y >= 1; y--) for (let x = 0; x < w; x++) {
    const v = px[(y - 1) * w + x];
    if (v >= 0 || y < waist) out[y * w + x] = v;
  }
  return { ...q, f: { w, h, px: out } };
}
/* Where the gloves are in a frame, from the anchor: the middle of the
   white that comes in patches big enough to be a glove (an eye's white
   isn't) */
export function glovesOf(q, R) {
  const f = q.f, ps = patches(f, v => v === R.white || R.grey.has(v)).filter(p => p.length >= 4);
  let sx = 0, sy = 0, n = 0;
  for (const p of ps) for (const i of p) { sx += i % f.w + .5; sy += ((i / f.w) | 0) + .5; n++; }
  if (!n) return null;
  return [Math.round(sx / n - q.dx), Math.round(sy / n - q.lift - f.h)];
}

function run() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const names = Object.keys(LAYOUTS).filter(n => existsSync(join(SRC, n + '.png')));
  if (!names.length) { console.log('no sheets in ' + SRC + ' yet'); return; }
  const imgs = Object.fromEntries(names.map(n => [n, readPng(readFileSync(join(SRC, n + '.png')))]));

  /* One palette for every sheet, so the same shirt is the same colour
     everywhere. Once worked out it is kept: soc-art.js recolours kits by
     palette colour, and a palette worked out afresh (which any new sheet
     would change) would scramble every kit. --palette works it out again,
     from the first sheets only; then the roles in COLOURS and soc-art.js
     need checking. --raw leaves out the face fix and the merges. */
  const raw = process.argv.includes('--raw'), palFile = join(OUT, 'palette.json');
  let pal;
  if (existsSync(palFile) && !process.argv.includes('--palette')) {
    pal = JSON.parse(readFileSync(palFile, 'utf8')).slice(0, PALETTE_K).map(hexRgb);
    console.log(`palette: ${pal.length} colours, kept from clean/palette.json`);
  } else {
    const samples = [];
    for (const n of names.filter(n => !LAYOUTS[n].extra)) {
      const { w, h, px } = imgs[n];
      for (let i = 0; i < w * h; i += 7) if (px[i * 4 + 3] > 200) samples.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
    }
    pal = kmeans(samples, PALETTE_K);
    console.log(`palette: ${pal.length} colours from ${samples.length} samples`);
  }
  const R = raw ? null : roles(pal);

  /* read every sheet, then merge the later rows in and write */
  const boxesOf = {}, read = {};
  for (const n of names) {
    if (raw && LAYOUTS[n].extra) continue;
    const img = imgs[n], rows = LAYOUTS[n].rows, like = LAYOUTS[n].like, idx = indexImage(img, pal);
    /* An edited sheet has every frame where its original has it, so it is
       cut along the original's frames (with room for the new hair) rather
       than searched afresh, which could let rows that now touch run
       together; and it is read at the original's scale. */
    const template = like && boxesOf[like];
    const boxes = template || cut(img, rows);
    boxesOf[n] = boxes;
    const crops = own(img, idx, boxes, template ? 24 : 0);
    if (like && scaleOf[like]) S = scaleOf[like];
    else if (LAYOUTS[n].scale) S = LAYOUTS[n].scale;
    else {
      const [sr, sf] = LAYOUTS[n].stand || [0, 0], sb = crops[sr][sf];
      S = sb.h / (LAYOUTS[n].standPx || STAND);
    }
    scaleOf[n] = S;
    console.log(`${n}: ${S.toFixed(2)} image px per art pixel${template ? ', cut along ' + like : ''}`);
    crops.forEach((row, r) => { if (row.length !== rows[r][1]) console.log(`  ${rows[r][0]}: ${row.length} frames (the brief asked for ${rows[r][1]})`); });
    const anims = {};
    crops.forEach((row, r) => {
      const [name, , t, loop, tail] = rows[r];
      const frames = row.map(c => tidy(bestSample(c, pal.length))).map(f => R && !LAYOUTS[n].plain ? fixFace(f, R, pal) : f);
      const at = place(frames, row, R && (LAYOUTS[n].body || []).includes(name) ? R.shirt : null);
      anims[name] = { row: r, t, loop, tail, frames: frames.map((f, i) => ({ f, ...at[i] })) };
    });
    read[n] = anims;
  }
  const full = R ? [...pal, ...twins(pal, R)] : pal;
  for (const n of names) {
    if (LAYOUTS[n].extra) continue;
    const anims = read[n];
    if (R) for (const [src, from, to, how] of MERGE[n] || []) {
      const a = read[src] && read[src][from];
      if (!a) continue;
      const row = anims[to] ? anims[to].row : Math.max(...Object.values(anims).map(q => q.row)) + 1;
      anims[to] = { row, t: a.t, loop: a.loop, tail: a.tail, frames: how === 'bob' ? [a.frames[0], bob(a.frames[0], R)] : a.frames };
      console.log(`  ${n}: ${to} from ${src} (${from}${how ? ', ' + how : ''})`);
    }
    const all = Object.values(anims).sort((p, q) => p.row - q.row).flatMap(a => a.frames);
    const nrows = Math.max(...Object.values(anims).map(q => q.row)) + 1;
    /* one cell size and anchor for the whole sheet: room for the widest pose */
    const left = Math.max(...all.map(q => q.dx)), right = Math.max(...all.map(q => q.f.w - q.dx));
    const up = Math.max(...all.map(q => q.f.h + q.lift)), down = Math.max(0, ...all.map(q => -q.lift));
    const CW = left + right + 2, CH = up + down + 3, AX = left + 1, AY = up + 1;
    const cols = Math.max(...Object.values(anims).map(a => a.frames.length));
    const W = cols * CW, H = nrows * CH, px = new Uint8Array(W * H * 4);
    for (const a of Object.values(anims)) a.frames.forEach((q, i) => {
      const ox = i * CW + AX - q.dx, oy = a.row * CH + AY - q.lift - q.f.h;
      for (let y = 0; y < q.f.h; y++) for (let x = 0; x < q.f.w; x++) {
        const v = q.f.px[y * q.f.w + x];
        if (v < 0) continue;
        const o = ((oy + y) * W + ox + x) * 4, c = full[v];
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    });
    /* The generator redraws the face in every frame, and in a loop that
       plays all the time (the referee's sidestep) the eyes, and the grey at
       his temples, flickered as he went. So in a `steady` loop the first
       frame's head, that many rows from the top of it, is every frame's:
       the frames are lined up on the head, so it sits in the same rows of
       each cell. */
    for (const [name, deep] of Object.entries(LAYOUTS[n].steady || {})) {
      const a = anims[name];
      if (!a) continue;
      const q0 = a.frames[0], top = a.row * CH + AY - q0.lift - q0.f.h;
      for (let i = 1; i < a.frames.length; i++) for (let y = top; y < top + deep; y++)
        px.copyWithin((y * W + i * CW) * 4, y * W * 4, (y * W + CW) * 4);
    }
    writeFileSync(join(OUT, n + '.png'), writePng({ w: W, h: H, px }));
    /* `hands`: where the gloves are in each frame, from the anchor, for the
       rows a caught ball has to sit in */
    const meta = {
      cell: [CW, CH], anchor: [AX, AY], cols,
      anims: Object.fromEntries(Object.entries(anims).sort((p, q) => p[1].row - q[1].row).map(([k, a]) => {
        const m = { row: a.row, frames: a.frames.length, t: a.t, loop: a.loop };
        if (a.tail) m.tail = a.tail;
        if (R && (LAYOUTS[n].hands || []).includes(k)) m.hands = a.frames.map(q => glovesOf(q, R));
        /* a piece's own width and height, and where it sits from the anchor */
        if (LAYOUTS[n].boxes) { const q = a.frames[0]; m.box = [q.f.w, q.f.h, q.dx, q.lift]; }
        return [k, m];
      }))
    };
    writeFileSync(join(OUT, n + '.json'), JSON.stringify(meta, null, 1));
    const stand = all[0].f;
    console.log(`${n}: ${Object.keys(anims).length} animations, ${all.length} frames, cell ${CW}x${CH}, standing ${stand.w}x${stand.h} art px -> clean/${n}.png`);
  }
  writeFileSync(palFile, JSON.stringify(full.map(rgbHex)));
  /* and into the arcade's page (raw output is only for checking) */
  if (!raw) embed();
}
/* run when called as a script, not when another tool imports the helpers */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
