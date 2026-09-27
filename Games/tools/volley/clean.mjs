/* ============================================================================
   CLEAN — Beach Volley's sprite sheets, as real pixel art.

   The same job as tools/soccer/clean.mjs, with its own helpers (cutting a
   sheet into rows and frames, reading one art pixel per generated block,
   tidying, fixing the faces, packing), for the sheets in art/volley:

     volley_player   the player: stand, ready, run, backpedal, bump, set,
                     with the rows of volley_attack (spike, block, serve,
                     jumpserve) and volley_emotes (dive, getup, cheer,
                     highfive, sad) merged in, one sheet the game dresses in
                     each side's colours
     volley_umpire   the umpire, from the front, sitting (her chair is a prop)
     beach_fans      a spectator, from the front
     beach_props     palm, lifeguard tower, umpire's chair, umbrella, and a
                     surfboard, cool box, sandcastle and life ring
     beach_critters  a seagull and a crab
     beach_ball      the ball turning, squashed by a hit, the sand it throws
                     up, a player's landing and dive, and marks in the sand
     beach_net       the net's post and antenna, and a length of the net
     beach_backdrop  the sky, the sea and the beach behind the court: one
                     picture, not a sheet, read down to the 480 art pixels
                     the game's view is wide

   The people (players, umpire, fans) are read into Soccer's own palette,
   since they are drawn in its kit yellows and greens, blue shorts, skin and
   hair: so its roles (what a kit recolours, what the face fix knows as
   skin and hair) hold here too, and go into the game with the art. The
   props and critters have a palette of their own (things), worked out once
   and kept, like Soccer's; the ball, the net and the backdrop have one each
   (<name>_palette.json).

   Each sheet is read at a scale (image pixels per art pixel) set by one of
   its frames' size: the players at the size the generator drew them, blocks
   of about 3 image pixels, 37 art pixels tall; the umpire, the fans and the
   critters, drawn bigger than the brief asked, read down to their places
   beside the players; the props at their own blocks of 8.

   node tools/volley/clean.mjs           every sheet there is
   node tools/volley/clean.mjs --palette work the kept palettes out again
   Output: art/volley/clean/<name>.png (1x) and <name>.json, then
   src/js/games/volley/art-data.js (embed.mjs).
   ========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from '../soccer/png.mjs';
import { cut, kmeans, indexImage, own, bestSample, tidy, place, roles, fixFace, twins, bob, hexRgb, rgbHex, setScale, PALETTE_K } from '../soccer/clean.mjs';
import { embed } from './embed.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ART = join(ROOT, 'art', 'volley'), OUT = join(ART, 'clean');
const SRC = existsSync(join(ART, 'GameReady')) ? join(ART, 'GameReady') : ART;

/* rows: [name, frames, seconds a frame, loops, tail (frames that loop at
   the end of a one-shot)] */
const STAND_ROW = ['stand', 1, 1, true];
const LAYOUTS = {
  /* size: [row, frame, art pixels tall]: the sheet is read at whatever
     scale makes that frame that tall */
  volley_player: {
    rows: [STAND_ROW, ['ready', 4, .45, true], ['run', 8, .075, true], ['backpedal', 6, .09, true], ['bump', 5, .06, false], ['set', 5, .06, false]],
    size: [0, 0, 37], people: true
  },
  /* later deliveries for the same player, read the same way and merged in */
  volley_attack: {
    rows: [STAND_ROW, ['spike', 8, .05, false], ['block', 5, .07, false], ['serve', 6, .07, false], ['jumpserve', 8, .06, false]],
    size: [0, 0, 37], people: true, extra: true
  },
  /* the dive is lined up on the body, not the head: it is lying down */
  volley_emotes: {
    rows: [STAND_ROW, ['dive', 6, .06, false], ['getup', 4, .09, false], ['cheer', 6, .1, false, 2], ['highfive', 4, .09, false], ['sad', 4, .2, true]],
    size: [0, 0, 37], people: true, extra: true, body: ['dive', 'getup']
  },
  /* she stands 40, sitting on her chair a little over 30 */
  volley_umpire: {
    rows: [STAND_ROW, ['sit', 2, .5, true], ['whistle', 4, .12, false], ['point', 3, .1, false], ['in', 3, .1, false], ['out', 3, .1, false]],
    size: [0, 0, 40], people: true
  },
  /* a spectator is a little over half a player's height, as in Soccer */
  beach_fans: {
    rows: [STAND_ROW, ['sit', 2, .5, true], ['clap', 2, .14, true], ['cheer', 4, .1, false, 2], ['wave', 4, .16, true], ['towel', 4, .14, true], ['groan', 2, .4, true], ['standclap', 2, .14, true]],
    size: [0, 0, 22], people: true
  },
  /* pieces, not frames: each one's own box goes into the JSON, and it
     stands on the middle of its foot */
  beach_props: {
    rows: [['tall', 4, 1, true], ['small', 4, 1, true]],
    scale: 8, things: true, plain: true, props: true
  },
  /* a gull stands 12 art pixels, a crab 7 */
  beach_critters: {
    rows: [['gull_stand', 2, .5, true], ['gull_peck', 2, .22, true], ['gull_fly', 4, .09, true], ['gull_glide', 1, 1, true], ['crab_walk', 4, .1, true], ['crab_snap', 2, .25, true]],
    size: [0, 0, 12], things: true, plain: true
  },
  /* The ball is 9 art pixels across, a little bigger than life so it reads,
     and the sand effects are read at the same scale; the marks a size down
     again, since a footprint is smaller than a hand. Each piece keeps its
     own box, as the props do. */
  beach_ball: {
    rows: [['ball', 8, .05, true], ['squash', 2, .05, false], ['spray', 6, .055, false], ['puff', 5, .06, false], ['splash', 5, .06, false], ['marks', 3, 1, true]],
    size: [0, 0, 9], rowScale: { marks: 1.6 }, own: 20, plain: true, props: true, bits: true
  },
  /* the post stands 50 art pixels, a little over the tape at 46 */
  beach_net: {
    rows: [['post', 2, 1, true], ['net', 1, 1, true]],
    size: [0, 0, 50], own: 16, plain: true, props: true
  }
};
/* the backdrop: one picture, read to this many art pixels wide */
const BACKDROP = { name: 'beach_backdrop', w: 480, own: 40 };
/* Where the later rows go: [sheet, its row, the row it becomes, how]. 'bob'
   keeps only the first frame and makes the second from it, a breath: the
   generator redraws every frame, and a redrawn pair crawls when it loops. */
const rowsOf = (src, list) => list.map(([n]) => [src, n, n]);
const MERGE = {
  volley_player: [['volley_player', 'ready', 'ready', 'bob'],
    ...rowsOf('volley_attack', LAYOUTS.volley_attack.rows.slice(1)), ...rowsOf('volley_emotes', LAYOUTS.volley_emotes.rows.slice(1))],
  volley_umpire: [['volley_umpire', 'sit', 'sit', 'bob']],
  beach_fans: [['beach_fans', 'sit', 'sit', 'bob']]
};
const THINGS_K = 40;

/* A burst of sand is a cloud of grains with gaps between them, so a row
   of them cuts into more pieces than it has frames: the nearest pieces
   are joined until the count is right (frames are further apart than the
   grains in one). */
function gather(rows, layout) {
  return rows.map((row, r) => {
    row = row.slice();
    while (row.length > layout[r][1]) {
      let k = 0;
      for (let i = 1; i < row.length - 1; i++) if (row[i + 1].x0 - row[i].x1 < row[k + 1].x0 - row[k].x1) k = i;
      const a = row[k], b = row[k + 1];
      row.splice(k, 2, { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });
    }
    return row;
  });
}
/* Cut down to what is drawn, and nothing more: tidy() would take a thrown
   grain of sand, or a footprint, for a stray speck and drop it */
function trim(f) {
  let x0 = f.w, x1 = -1, y0 = f.h, y1 = -1;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.px[y * f.w + x] >= 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = Math.max(0, x1 - x0 + 1), h = Math.max(0, y1 - y0 + 1), px = new Int16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = f.px[(y + y0) * f.w + x + x0];
  return { w, h, px };
}
/* A prop stands on the middle of its foot: the bottom few rows */
function footOf(f) {
  let sx = 0, n = 0;
  for (let y = Math.max(0, f.h - 3); y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.px[y * f.w + x] >= 0) { sx += x + .5; n++; }
  return { dx: Math.round(n ? sx / n : f.w / 2), lift: 0 };
}

function run() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const names = Object.keys(LAYOUTS).filter(n => existsSync(join(SRC, n + '.png')));
  if (!names.length) { console.log('no sheets in ' + SRC + ' yet'); return; }
  const imgs = Object.fromEntries(names.map(n => [n, readPng(readFileSync(join(SRC, n + '.png')))]));

  /* the people's palette is Soccer's (its first PALETTE_K colours, its hair
     twins after), and so are its roles */
  const socPal = JSON.parse(readFileSync(join(ROOT, 'art', 'soccer', 'clean', 'palette.json'), 'utf8')).slice(0, PALETTE_K).map(hexRgb);
  const R = roles(socPal), people = [...socPal, ...twins(socPal, R)];
  /* the things' palette: worked out once from the props and critters, and
     kept (--palette works it out again) */
  const thingsFile = join(OUT, 'things_palette.json');
  let things;
  if (existsSync(thingsFile) && !process.argv.includes('--palette')) things = JSON.parse(readFileSync(thingsFile, 'utf8')).map(hexRgb);
  else {
    const samples = [];
    for (const n of names.filter(n => LAYOUTS[n].things)) {
      const { w, h, px } = imgs[n];
      for (let i = 0; i < w * h; i += 5) if (px[i * 4 + 3] > 200) samples.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
    }
    things = kmeans(samples, THINGS_K);
    writeFileSync(thingsFile, JSON.stringify(things.map(rgbHex)));
    console.log(`things palette: ${things.length} colours from ${samples.length} samples`);
  }

  /* a sheet's own palette, kept like the things' */
  const ownPal = (n, img, k) => {
    const file = join(OUT, n + '_palette.json');
    if (existsSync(file) && !process.argv.includes('--palette')) return JSON.parse(readFileSync(file, 'utf8')).map(hexRgb);
    const samples = [];
    for (let i = 0; i < img.w * img.h; i += 3) if (img.px[i * 4 + 3] > 200) samples.push([img.px[i * 4], img.px[i * 4 + 1], img.px[i * 4 + 2]]);
    const pal = kmeans(samples, k);
    writeFileSync(file, JSON.stringify(pal.map(rgbHex)));
    console.log(`${n} palette: ${pal.length} colours from ${samples.length} samples`);
    return pal;
  };
  const pals = {};

  /* read every sheet */
  const read = {};
  for (const n of names) {
    const L = LAYOUTS[n], img = imgs[n], pal = pals[n] = L.own ? ownPal(n, img, L.own) : L.things ? things : socPal, idx = indexImage(img, pal);
    const boxes = gather(cut(img, L.rows), L.rows), crops = own(img, idx, boxes, 0);
    let S = L.scale;
    if (!S) { const [r, f, px] = L.size; S = crops[r][f].h / px; }
    setScale(S);
    console.log(`${n}: ${S.toFixed(2)} image px per art pixel`);
    const anims = {};
    crops.forEach((row, r) => {
      const [name, , t, loop, tail] = L.rows[r];
      setScale(S * ((L.rowScale || {})[name] || 1));
      const frames = row.map(c => (L.bits ? trim : tidy)(bestSample(c, pal.length))).map(f => L.plain ? f : fixFace(f, R, socPal));
      const at = L.props ? frames.map(footOf) : place(frames, row, (L.body || []).includes(name) ? R.shirt : null);
      anims[name] = { row: r, t, loop, tail, frames: frames.map((f, i) => ({ f, ...at[i] })) };
    });
    read[n] = anims;
  }

  /* merge the later rows in, and write each sheet */
  const out = {};
  for (const n of names) {
    const L = LAYOUTS[n];
    if (L.extra) continue;
    const anims = read[n], full = L.own ? pals[n] : L.things ? things : people;
    for (const [src, from, to, how] of MERGE[n] || []) {
      const a = read[src] && read[src][from];
      if (!a) continue;
      const row = anims[to] ? anims[to].row : Math.max(...Object.values(anims).map(q => q.row)) + 1;
      anims[to] = { row, t: a.t, loop: a.loop, tail: a.tail, frames: how === 'bob' ? [a.frames[0], bob(a.frames[0], R)] : a.frames };
      if (src !== n) console.log(`  ${n}: ${to} from ${src}${how ? ' (' + how + ')' : ''}`);
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
    writeFileSync(join(OUT, n + '.png'), writePng({ w: W, h: H, px }));
    const meta = {
      cell: [CW, CH], anchor: [AX, AY], cols,
      anims: Object.fromEntries(Object.entries(anims).sort((p, q) => p[1].row - q[1].row).map(([k, a]) => {
        const m = { row: a.row, frames: a.frames.length, t: a.t, loop: a.loop };
        if (a.tail) m.tail = a.tail;
        /* a prop's own boxes: width, height, and where its foot is from the anchor */
        if (L.props) m.boxes = a.frames.map(q => [q.f.w, q.f.h, q.dx, q.lift]);
        return [k, m];
      }))
    };
    writeFileSync(join(OUT, n + '.json'), JSON.stringify(meta, null, 1));
    out[n] = meta;
    const f0 = all[0].f;
    console.log(`${n}: ${Object.keys(anims).length} animations, ${all.length} frames, cell ${CW}x${CH}, first ${f0.w}x${f0.h} art px -> clean/${n}.png`);
  }
  /* The people's palette, with what each colour is for: the game recolours
     kits, skin and hair by it (art.js). The kit roles are the indices
     Soccer's art.js recolours by, in this same palette. */
  writeFileSync(join(OUT, 'people_palette.json'), JSON.stringify({
    colours: people.map(rgbHex),
    roles: {
      shirt: { idx: [26, 0, 9, 24, 20, 21], base: 9 }, trim: { idx: [23, 18], base: 23 }, shorts: { idx: [8], base: 8 },
      skin: [...R.skin], hair: R.hair
    }
  }));
  backdrop(ownPal);
  embed();
}

/* The backdrop: read one art pixel per block across the whole picture, at
   whatever offset lines the blocks up best, and cut to the view's size.
   Nothing is tidied away: a lone glint on the sea is meant to be there. */
function backdrop(ownPal) {
  const file = join(SRC, BACKDROP.name + '.png');
  if (!existsSync(file)) return;
  const img = readPng(readFileSync(file)), pal = ownPal(BACKDROP.name, img, BACKDROP.own);
  const S = img.w / BACKDROP.w;
  setScale(S);
  const f = bestSample({ w: img.w, h: img.h, idx: indexImage(img, pal) }, pal.length);
  /* the first column and row of blocks start off the picture's edge */
  const W = BACKDROP.w, H = Math.min(Math.floor(img.h / S), f.h - 2), px = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = f.px[(y + 1) * f.w + x + 1];
    for (let k = 1; v < 0 && k <= 3; k++) v = f.px[Math.max(0, y + 1 - k) * f.w + x + 1];
    const c = pal[Math.max(0, v)], o = (y * W + x) * 4;
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
  }
  writeFileSync(join(OUT, BACKDROP.name + '.png'), writePng({ w: W, h: H, px }));
  console.log(`${BACKDROP.name}: ${S.toFixed(2)} image px per art pixel -> clean/${BACKDROP.name}.png, ${W}x${H}`);
}
run();
