/* ======================================================= CROSSY ROAD ===== */
/* Hop a grid forward forever. Grass is safe but grows trees in the way, roads
   kill on contact, rivers kill unless something happens to be floating past,
   and the railway gives you a second and a half of warning and then nothing.

   The whole game is one integer — which row you are on — and every hazard is
   a one-dimensional problem: a lane is a list of boxes sliding along x, and
   crossing it is picking the gap. That is why it reads so fast. Nothing here
   simulates anything; a lane knows its direction, its speed and its headway,
   and spawns the next box when the last one has cleared the entry.

   Drawn with Gfx3D and dressed the way the original is: hard-edged blocks
   in flat colour, lit by one sun from the top left so every block shows a
   bright top and two darker sides, with no fog, gloss, grain or sky. The
   palette is picked for how it should look on screen and pushed back
   through the tone curve (paint()), because the renderer's linear light
   and filmic curve otherwise wash a toy world out into a photograph of one.
 */
registerGame({
  id: 'crossy',
  title: 'Crossy Road',
  tagline: 'Hop the lanes, ride the logs, skip across the lily pads and keep moving — the longer you stand still, the closer the eagle gets. Grass is safe, everything else is a gap you have to read.',
  tags: ['Arcade', 'Reflex', 'Skill', 'Timing', 'Online'],
  scoreLabel: 'Steps',
  mp: 'race', mpMin: 2, mpMax: 4,
  front: true,
  controls: [
    ['Hop forward', '&uarr; / W / Click'],
    ['Sideways', '&larr; &rarr; / A D'],
    ['Back', '&darr; / S'],
    ['Online', 'the same course, everyone at once'],
    ['Pause', 'Esc']
  ],
  options: [
    { id: 'bird', label: 'Character', def: 'hen', type: 'cards', choices: [
      { v: 'hen',    l: 'Hen',    d: 'The white one with the red comb.' },
      { v: 'duck',   l: 'Duck',   d: 'Yellow, orange bill, no sense of danger.' },
      { v: 'pigeon', l: 'Pigeon', d: 'Grey, city-bred, unbothered by traffic.' },
      { v: 'robin',  l: 'Robin',  d: 'Brown back, red breast, very small.' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="crSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cb8f0"/><stop offset="1" stop-color="#bfe6fb"/></linearGradient><linearGradient id="crG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ac74f"/><stop offset="1" stop-color="#5da83a"/></linearGradient><linearGradient id="crG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ed45c"/><stop offset="1" stop-color="#6bb944"/></linearGradient><linearGradient id="crRd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5058"/><stop offset="1" stop-color="#3a3f46"/></linearGradient><linearGradient id="crW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa7e0"/><stop offset="1" stop-color="#2179b8"/></linearGradient></defs><rect width="320" height="180" fill="url(#crSky)"/><g opacity=".85" fill="#fff"><ellipse cx="54" cy="26" rx="26" ry="11"/><ellipse cx="72" cy="21" rx="18" ry="12"/><ellipse cx="246" cy="34" rx="22" ry="9"/><ellipse cx="262" cy="29" rx="15" ry="10"/></g><g><path d="M-20 60H340V82H-20z" fill="url(#crG2)"/><path d="M-20 82H340V112H-20z" fill="url(#crRd)"/><path d="M-20 112H340V140H-20z" fill="url(#crW)"/><path d="M-20 140H340V190H-20z" fill="url(#crG1)"/></g><g fill="#fff" opacity=".8"><rect x="10" y="95" width="26" height="5" rx="2"/><rect x="66" y="95" width="26" height="5" rx="2"/><rect x="122" y="95" width="26" height="5" rx="2"/><rect x="178" y="95" width="26" height="5" rx="2"/><rect x="234" y="95" width="26" height="5" rx="2"/><rect x="290" y="95" width="26" height="5" rx="2"/></g><g><rect x="28" y="116" width="92" height="19" rx="7" fill="#8a5a33"/><rect x="28" y="116" width="92" height="7" rx="3.5" fill="#a9713f"/><rect x="186" y="118" width="74" height="17" rx="6" fill="#7d5130"/><rect x="186" y="118" width="74" height="6" rx="3" fill="#9c6739"/></g><g><rect x="196" y="84" width="58" height="23" rx="5" fill="#e8483f"/><rect x="204" y="78" width="34" height="12" rx="4" fill="#f4655b"/><rect x="209" y="80" width="24" height="8" rx="3" fill="#2d3a4d"/><rect x="246" y="90" width="9" height="6" rx="2" fill="#ffe9a8"/><circle cx="208" cy="108" r="6" fill="#23262c"/><circle cx="243" cy="108" r="6" fill="#23262c"/></g><g><rect x="52" y="86" width="44" height="20" rx="5" fill="#f2c53d"/><rect x="58" y="80" width="26" height="11" rx="4" fill="#ffd95e"/><rect x="62" y="82" width="18" height="7" rx="3" fill="#2d3a4d"/><circle cx="62" cy="107" r="5.5" fill="#23262c"/><circle cx="88" cy="107" r="5.5" fill="#23262c"/></g><g><rect x="20" y="36" width="20" height="30" rx="4" fill="#6b4226"/><ellipse cx="30" cy="34" rx="25" ry="18" fill="#3f8c3a"/><ellipse cx="30" cy="26" rx="18" ry="13" fill="#4da349"/></g><g><rect x="272" y="44" width="18" height="26" rx="4" fill="#6b4226"/><ellipse cx="281" cy="42" rx="22" ry="16" fill="#3f8c3a"/><ellipse cx="281" cy="35" rx="15" ry="11" fill="#4da349"/></g><g transform="translate(150 132)"><ellipse cx="0" cy="20" rx="17" ry="5" fill="#000" opacity=".22"/><rect x="-13" y="-10" width="26" height="25" rx="7" fill="#fff"/><rect x="-13" y="-10" width="26" height="9" rx="4.5" fill="#fff" opacity=".7"/><rect x="-9" y="-22" width="18" height="15" rx="6" fill="#fff"/><path d="M-4-26h4v5h-4zM2-27h4v6h-4zM8-25h4v4h-4z" fill="#e5484d"/><path d="M9-16l9 3-9 3z" fill="#f59f1b"/><circle cx="4" cy="-16" r="2.4" fill="#1b1f27"/><rect x="-8" y="14" width="5" height="6" rx="2" fill="#f59f1b"/><rect x="3" y="14" width="5" height="6" rx="2" fill="#f59f1b"/></g></svg>',
  w: 960, h: 600,
  mount(api) {
    const W = api.W, H = api.H;
    const R3 = Gfx3D.get();
    const { Geo, M4, K } = Gfx3D, L = Gfx3D.lin;
    /* a linear colour with the ambient-occlusion term the shaders read as
       "how much sky can this vertex see" — corners want less */
    const col = (hex, a) => Gfx3D.withAo(L(hex), a === undefined ? 1 : a);

    /* ---------------------------------------------------------- world --- */
    const TILE = 100;                     // one hop
    const HALF = 7;                       // playable columns run -7 .. +7
    const XMIN = -HALF * TILE, XMAX = HALF * TILE;
    /* The world runs well past the edge of the screen. With the bird at
       either side the camera sees about eleven tiles out, and traffic that
       appeared any nearer than that was visibly popping into existence. */
    const VERGE = (HALF + 11) * TILE;     // where the scenery stops
    const EDGE = (HALF + 9.5) * TILE;     // where traffic appears and is culled
    const LOCO_LEN = 340, CARR_LEN = 300, CARR_GAP = 22;
    const GRASS_Z = 12;                   // grass sits proud of the tarmac
    const WATER_Z = -20;
    const HOP_T = .125;                   // seconds per hop


    /* Two streams of numbers, not one. The COURSE (which rows are road, where
       the trees stand, where the lily pads float) is read strictly in row
       order, so a seed always builds the same course. TRAFFIC comes from each
       row's own stream. They used to share one, so every car that spawned
       moved the course still to come: two players on the "same" course,
       whose screens spawned cars at slightly different moments, were on
       different roads a few rows later. */
    const RACE = getRace('crossy');
    const ONLINE = !!RACE;
    const ROSTER = ONLINE ? (RACE.cfg.players || []).slice(0, 4) : [];
    const slotOf = id => { const i = ROSTER.findIndex(p => p.id === id); return i < 0 ? 0 : i & 3; };
    const SEED = ONLINE ? (((RACE.seed | 0) >>> 0) || 1) : ((Math.random() * 0xffffffff) >>> 0);
    let seed = SEED;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const ri = n => Math.floor(rnd() * n);
    const rf = (a, b) => a + rnd() * (b - a);
    const laneRng = i => mulberry(((SEED ^ Math.imul(i + 7, 0x9E3779B1)) >>> 0) || 1);

    /* difficulty, 0 at the kerb and 1 somewhere around row 170 */
    const diff = r => Math.min(1, r / 170);
    /* past the row where the mix stops changing the traffic keeps speeding up,
       slowly and without a ceiling — a run has to end somewhere */
    const farther = r => Math.max(0, r - 170) / 900;

    const CAR_COLS = ['#ef5a3c', '#7bc443', '#8b66dc', '#f6c63c', '#e4403f', '#33a1e6', '#f08ab4', '#f2f2f2'];
    const LOG_COLS = ['#8e5847', '#86513f', '#94604e', '#83503f'];
    const COLS = HALF * 2 + 1;
    const DECO_N = 6;

    /* ---------------------------------------------------------- biomes ---
       The crossing does not stay in one country. A run opens in any of the
       four — the meadow, the dunes, the frozen north, the magma fields — and
       every ZONE_LEN rows it crosses into another, all four in an order the
       seed shuffles and then shuffled again, never the same one twice
       running, so however far a run gets the ground keeps changing under it. Each
       country has its own ground, trees and traffic and its own version of
       the river, the lily pads and the railway, but the rules under them
       are the same ones: a caravan of camels is read exactly like a lane of
       cars, and a sandworm gives the same warning a train does. The order
       comes from a stream of its own, so it never moves the course. */
    const BIOMES = ['meadow', 'desert', 'arctic', 'volcano'];
    const ZONE_LEN = 44;
    const zones = [];
    const zoneRng = mulberry(((SEED ^ 0x5EED0B1E) >>> 0) || 1);
    function biomeAt(i) {
      const z = Math.floor(Math.max(0, i) / ZONE_LEN);
      while (zones.length <= z) {
        const k = zones.length % 4, done = zones.slice(zones.length - k), last = zones[zones.length - 1];
        const left = BIOMES.filter(b => done.indexOf(b) < 0 && b !== last);
        zones.push(left[Math.floor(zoneRng() * left.length)]);
      }
      return zones[z];
    }
    const BIOME_NAME = { meadow: 'GREEN MEADOWS', desert: 'THE DUNES', arctic: 'FROSTBITE PASS', volcano: 'MAGMA FIELDS' };
    /* what the railway becomes in each: the thing that runs along it, and
       how long its warning lasts */
    const RAIL_HOW = { meadow: 'train', desert: 'worm', arctic: 'bobsled', volcano: 'surge' };

    /* Every country's traffic: how long each kind is, which kinds a lane of
       each character draws from (a quick lane, a slow lane or a mixed one),
       and the paints a kind's body comes in (none: it wears its own). */
    const SAND_COLS = ['#e0663f', '#3fb3a6', '#f0b43c', '#5b8fd9', '#efe6d2', '#b8743f', '#d75b7c', '#78b24f'];
    const PLOW_COLS = ['#f28a1c', '#f5c21b'];
    const SLED_COLS = ['#e8413a', '#2f86e6', '#f5c21b', '#1fb58f', '#8c5ad8'];
    const HAUL_COLS = ['#f2b22e', '#ec7a2c'];
    const TANK_COLS = ['#dfe3e8', '#bcc4cd'];
    const TRAFFIC = {
      /* hatchback, lorry, bus, sports car */
      meadow: {
        len: [150, 250, 300, 156], cols: [CAR_COLS, CAR_COLS, CAR_COLS, CAR_COLS],
        pick: (k, q) => q === 'fast' ? (k < .72 ? 3 : 0) : q === 'slow' ? (k < .5 ? 1 : k < .86 ? 2 : 0)
                      : (k < .56 ? 0 : k < .74 ? 3 : k < .9 ? 1 : 2)
      },
      /* pickup, camper van, dune buggy, a string of camels, tumbleweed */
      desert: {
        len: [176, 292, 134, 344, 84], cols: [SAND_COLS, SAND_COLS, SAND_COLS, null, null],
        pick: (k, q) => q === 'fast' ? (k < .6 ? 2 : 4) : q === 'slow' ? (k < .55 ? 3 : 1)
                      : (k < .42 ? 0 : k < .6 ? 2 : k < .8 ? 1 : 4)
      },
      /* snowplough, snowmobile, husky sled, penguins, polar bear */
      arctic: {
        len: [256, 140, 330, 214, 210], cols: [PLOW_COLS, SLED_COLS, null, null, null],
        pick: (k, q) => q === 'fast' ? (k < .62 ? 1 : 3) : q === 'slow' ? (k < .5 ? 0 : 4)
                      : (k < .34 ? 0 : k < .58 ? 2 : k < .8 ? 1 : 4)
      },
      /* haul truck, boulder, big boulder, magma tanker */
      volcano: {
        len: [300, 116, 156, 286], cols: [HAUL_COLS, null, null, TANK_COLS],
        pick: (k, q) => q === 'fast' ? (k < .68 ? 1 : 2) : q === 'slow' ? (k < .55 ? 0 : 3)
                      : (k < .34 ? 3 : k < .6 ? 1 : k < .8 ? 0 : 2)
      }
    };

    const rows = [];
    /* The one promise the generator keeps: wherever you can be standing on
       one row, some cell of the next can be reached. `open` is where a bird
       can stand on the row just laid; grass and lily pads narrow it, and the
       moving lanes open it again, because a log or a gap in traffic can take
       you anywhere across. */
    let open = new Array(COLS).fill(true);
    const allOpen = () => new Array(COLS).fill(true);
    function reach(entry, free) {
      const out = new Array(COLS).fill(false);
      for (let c = 0; c < COLS; c++) {
        if (!entry[c] || !free[c] || out[c]) continue;
        let a = c, b = c;
        while (a > 0 && free[a - 1]) a--;
        while (b < COLS - 1 && free[b + 1]) b++;
        for (let k = a; k <= b; k++) out[k] = true;
      }
      return out;
    }

    /* the band being laid down: several rows of the same kind in a row is what
       makes a four-lane road feel like a road rather than four separate ones */
    let band = { type: 'grass', left: 3, n: 3, k: 0, dir: 1, base: 1, pace: [], pads: 0 };
    let sinceRest = 0;                               // hazard rows since the last grass

    /* how much more (or less) of each hazard a country deals: the dunes are
       short of water and long on sandworms, the north and the volcano have
       rivers everywhere */
    const MIX = {
      meadow: { water: 1, rail: 1 }, desert: { water: .72, rail: 1.3 },
      arctic: { water: 1.15, rail: 1 }, volcano: { water: 1.2, rail: 1.1 }
    };
    function pickBand(i) {
      const d = diff(i), mx = MIX[biomeAt(i)];
      const w = [];
      /* a long stretch of danger earns a breather */
      if (band.type !== 'grass') w.push(['grass', Math.max(1.5, 3.3 - d * 1.8) + (sinceRest >= 5 ? 5 : 0)]);
      if (band.type !== 'road') w.push(['road', 4 + d * 3]);
      if (band.type !== 'water' && i > 6) w.push(['water', (1.9 + d * 1.9) * mx.water]);
      if (band.type !== 'rail' && i > 12) w.push(['rail', (.75 + d * 1.1) * mx.rail]);
      let tot = 0; for (const e of w) tot += e[1];
      let k = rnd() * tot, t = w[w.length - 1][0];
      for (const e of w) { k -= e[1]; if (k <= 0) { t = e[0]; break; } }
      const len = t === 'grass' ? 1 + ri(sinceRest >= 4 ? 3 : 2)
                : t === 'road' ? 1 + ri(2 + Math.floor(d * 3.4))
                : t === 'water' ? 1 + ri(2 + Math.floor(d * 2))
                : 1 + (rnd() < .22 + d * .25 ? 1 : 0);
      /* A road has a shape: every lane keeps its own pace — a crawl of
         lorries, a steady stream, cars flying through — and no two lanes
         side by side share one, so the lanes read apart at a glance. The
         quick ones are rarer near the start. */
      const pace = [];
      if (t === 'road') for (let k = 0; k < len; k++) {
        const opts = ['slow', 'mid', 'fast'].filter(q => q !== pace[k - 1]);
        const wts = opts.map(q => q === 'fast' ? .16 + d * .26 : q === 'slow' ? .36 : .46);
        let u = rnd() * wts.reduce((a, b) => a + b, 0), q = opts[opts.length - 1];
        for (let j = 0; j < opts.length; j++) { u -= wts[j]; if (u <= 0) { q = opts[j]; break; } }
        pace.push(q);
      }
      band = { type: t, left: len, n: len, k: 0, dir: rnd() < .5 ? 1 : -1, base: .55 + d * .55, pace, pads: 0 };
    }

    function grassRow(i, safe, b) {
      const r = { t: 'grass', i, b, shade: i & 1, trees: [], coin: null };
      const free = new Array(COLS).fill(true);
      if (!safe) {
        const d = diff(i);
        let n = ri(2 + Math.round(d * 3.4));
        if (sinceRest >= 3) n = Math.min(n, 2);        // the first grass after a long crossing stays open
        for (let k = 0; k < n; k++) {
          const c = ri(COLS) - HALF;
          if (!free[c + HALF]) continue;
          free[c + HALF] = false;
          /* h 0 is a boulder; 1-3 are trees of increasing height */
          r.trees.push({ c, h: rnd() < .16 ? 0 : 1 + ri(3), p: ri(3), s: rf(.86, 1.12), a: rf(0, TAU), pine: rnd() < .32 });
        }
        /* if the trees shut every way on from the last row, one steps aside */
        let ok = reach(open, free);
        while (!ok.some(Boolean) && r.trees.length) {
          const opts = r.trees.filter(t => open[t.c + HALF]);
          const t = opts.length ? opts[ri(opts.length)] : r.trees[ri(r.trees.length)];
          r.trees.splice(r.trees.indexOf(t), 1);
          free[t.c + HALF] = true;
          ok = reach(open, free);
        }
        open = ok;
        /* a coin wants a cell you can actually get to, and is worth a detour */
        if (rnd() < .26) {
          const cells = [];
          for (let c = 0; c < COLS; c++) if (ok[c]) cells.push(c - HALF);
          if (cells.length) r.coin = { c: cells[ri(cells.length)], got: false, t: rf(0, TAU) };
        }
      } else open = allOpen();
      /* scenery past the edge of play: always in the picture, never in the way */
      for (const s of [-1, 1]) {
        const m = ri(3);
        for (let k = 0; k < m; k++) {
          const c = s * (HALF + 1 + ri(6));
          if (!r.trees.some(t => t.c === c)) r.trees.push({ c, h: rnd() < .12 ? 0 : 1 + ri(3), p: ri(3), s: rf(.9, 1.15), a: rf(0, TAU), pine: rnd() < .4, edge: true });
        }
      }
      /* the pebbles, tufts and bones strewn on it: one of a handful of
         scatters laid out once, turned either way round */
      r.dv = ri(DECO_N); r.dr = ri(2);
      return r;
    }

    /* A lane's gaps are set as a window in TIME — how long a spot in the
       lane stays clear once the bird's own width is allowed for — and never
       closer than a clear stretch of road to read it by, so a slow lane is
       not bumper to bumper. The windows start long and close in as the course
       goes on. Each lane repeats a short pattern of gaps rather than rolling
       a new one per car, so a player who watches a lane for a moment can
       learn its rhythm. */
    function roadRow(i, b) {
      const d = diff(i), k = band.k++;
      const dir = band.dir * (k & 1 ? -1 : 1);
      const pace = band.pace[k] || 'mid';
      const kind = pace === 'fast' ? 'fast' : pace === 'slow' ? 'slow' : 'mix';
      /* the country's pace rises with the course; each lane sits well off it */
      const base = (118 + 190 * d) * (1 + farther(i) * .6);
      const speed = base * (pace === 'fast' ? rf(1.5, 2) : pace === 'slow' ? rf(.55, .75) : rf(.88, 1.2));
      const wLo = 1.55 - .8 * d, wHi = 3.3 - 1.6 * d;
      const pat = [];
      for (let p = 2 + ri(2); p > 0; p--) pat.push(rf(wLo, wHi) * (pace === 'fast' ? 1.15 : 1));
      const r = { t: 'road', i, b, dir, speed, kind, pat, pk: 0, need: 0, cars: [], rng: laneRng(i), gap0: TILE * (2.5 - 1.1 * d) };
      /* pre-fill from the lane's own stream, so it looks like it has been running */
      let x = -EDGE + r.rng() * 300;
      while (x < EDGE) {
        const c = newCar(r);
        c.x = x + c.len / 2;
        if (c.x - c.len / 2 < EDGE) r.cars.push(c);
        x += c.len + nextGap(r);
      }
      r.need = nextGap(r);
      return r;
    }
    /* the next gap as road: the window's worth of travel, plus the bird's width */
    const nextGap = r => Math.max(r.gap0, r.pat[r.pk++ % r.pat.length] * r.speed + TILE * .6);
    function newCar(r) {
      const T = TRAFFIC[r.b], kind = T.pick(r.rng(), r.kind), cols = T.cols[kind];
      return { x: 0, len: T.len[kind], kind, ci: Math.floor(r.rng() * (cols ? cols.length : 1)), dir: r.dir, ph: r.rng() * TAU };
    }

    /* Logs get shorter and quicker as you go, and the wait for the next one
       never gets long: open water between logs is capped at a couple of
       seconds, so a river is a timing problem and never a stand-off. */
    function waterRow(i, b) {
      const d = diff(i), k = band.lk = (band.lk || 0) + 1;
      const dir = band.dir * (k & 1 ? 1 : -1);
      const speed = rf(70, 125) * (.8 + d * .9 + farther(i) * .6) * band.base;
      const lens = d < .35 ? [300, 400, 300, 200] : d < .7 ? [200, 300, 300, 400] : [200, 200, 300];
      const pat = [];
      for (let p = 0; p < 3; p++) pat.push(Math.min(2.1, rf(.7, 1.7) * (.85 + d * .5)));
      const r = { t: 'water', i, b, dir, speed, logs: [], lens, pat, pk: 0, lk: 0, need: 0, rng: laneRng(i) };
      let x = -EDGE + r.rng() * 250;
      while (x < EDGE) {
        const g = newLog(r, nextLen(r));
        g.x = x + g.len / 2;
        r.logs.push(g);
        x += g.len + nextGapW(r);
      }
      r.need = nextGapW(r);
      return r;
    }
    const nextLen = r => r.lens[r.lk++ % r.lens.length];
    const nextGapW = r => r.pat[r.pk++ % r.pat.length] * r.speed;
    /* What floats. In the oasis some of the long ones are crocodiles, which
       carry you like a log but bite whatever lands on their head; the ice
       floes and the basalt rafts come in a few cuts, so no two look alike. */
    function newLog(r, len) {
      const croc = r.b === 'desert' && len >= 300 && r.rng() < .42;
      return { x: 0, len, ci: Math.floor(r.rng() * LOG_COLS.length), a: r.rng() * TAU, croc, v: Math.floor(r.rng() * 3), ph: r.rng() * TAU, dz: 0, dv: 0 };
    }
    /* the front of a crocodile, which is not somewhere to land */
    const CROC_HEAD = .3;
    function onJaws(r, g, x) {
      const h = g.len * CROC_HEAD;
      return r.dir > 0 ? x > g.x + g.len / 2 - h : x < g.x - g.len / 2 + h;
    }

    /* Lily pads: still water with somewhere to stand. They sit on the grid,
       so a hop onto a pad row lands square on a column — on a pad, or in the
       river. Fewer of them as the course goes on, and never fewer than it
       takes to get across from wherever you could be. */
    function padsRow(i, b) {
      const d = diff(i);
      const free = new Array(COLS).fill(false);
      const want = Math.max(3, Math.round(rf(6, 9) - d * 3.6));
      let got = 0;
      for (let k = 0; k < want * 4 && got < want; k++) { const c = ri(COLS); if (!free[c]) { free[c] = true; got++; } }
      let ok = reach(open, free);
      if (!ok.some(Boolean)) {
        const opts = []; for (let c = 0; c < COLS; c++) if (open[c]) opts.push(c);
        free[opts.length ? opts[ri(opts.length)] : ri(COLS)] = true;
        ok = reach(open, free);
      }
      open = ok;
      const pads = [];
      /* in the north some of the stepping stones are thin ice, paler and
         already crazed, which gives way under anyone who stands on it */
      for (let c = 0; c < COLS; c++) if (free[c]) pads.push({ c: c - HALF, a: rf(0, TAU), s: rf(.9, 1.1), fl: rnd() < .22, dz: 0, dv: 0, ph: rf(0, TAU),
                                                             thin: b === 'arctic' && rnd() < .34, crack: 0, broken: false });
      return { t: 'pads', i, b, pads };
    }

    /* The railway, and what it is in each country: a train, a sandworm
       swimming through the dunes, a bobsled run, a channel the lava surges
       down. All four warn, run and clear on the same clock, and each blocks
       its lane for as long as its length takes to pass. */
    const WORM_SEG = 64, WORM_HEAD = 170, SLED_LEN = 280, SLED_GAP = 70;
    function railRow(i, b) {
      const rng = laneRng(i);
      const r = {
        t: 'rail', i, b, dir: rng() < .5 ? 1 : -1,
        state: 'idle', timer: 1.4 + rng() * 2.8, train: null, flash: 0,
        rate: Math.max(.45, 1 - diff(i) * .5), fast: 1 + diff(i) * .55,
        rng, cars: 0, bellT: 0, bellK: 0, clack: 0, ph: rng() * TAU, spray: 0
      };
      railCars(r);
      return r;
    }
    /* how long the next one is: carriages, worm segments, sleds */
    function railCars(r) {
      r.cars = r.b === 'desert' ? 17 + Math.floor(r.rng() * 7)
             : r.b === 'arctic' ? 2 + Math.floor(r.rng() * 2)
             : r.b === 'volcano' ? 11 + Math.floor(r.rng() * 7)
             : 3 + Math.floor(r.rng() * 3);
    }
    function railLen(r) {
      return r.b === 'desert' ? WORM_HEAD + r.cars * WORM_SEG
           : r.b === 'arctic' ? r.cars * SLED_LEN + (r.cars - 1) * SLED_GAP
           : r.b === 'volcano' ? r.cars * 110
           : LOCO_LEN + r.cars * (CARR_LEN + CARR_GAP);
    }

    function genRow(i) {
      const b = biomeAt(i);
      if (i < 3) { rows.push(grassRow(i, true, b)); return; }
      /* A new country starts on open ground, whatever was being laid: a row
         with nothing in the way and the country's sign at the verge, then a
         row or two more of its land before its first hazard. */
      if (b !== biomeAt(i - 1)) {
        band = { type: 'grass', left: 1 + ri(2), n: 3, k: 0, dir: 1, base: 1, pace: [], pads: 0 };
        const r = grassRow(i, true, b);
        r.gate = true; sinceRest = 0;
        rows.push(r);
        return;
      }
      if (band.left <= 0) pickBand(i);
      band.left--;
      const t = band.type;
      let r;
      if (t === 'grass') { r = grassRow(i, false, b); sinceRest = 0; }
      else {
        if (t === 'road') r = roadRow(i, b);
        else if (t === 'rail') r = railRow(i, b);
        else {
          /* a river mixes floating logs with rows of lily pads — never more
             than two pad rows running, and never before the course has
             warmed up */
          const p = i < 9 ? 0 : band.pads >= 2 ? 0 : band.k === 0 ? .24 : .38;
          band.k++;
          if (rnd() < p) { r = padsRow(i, b); band.pads++; }
          else { r = waterRow(i, b); band.pads = 0; }
        }
        if (r.t !== 'pads') open = allOpen();
        sinceRest++;
      }
      rows.push(r);
    }
    function rowAt(i) {
      if (i < 0) return null;
      while (rows.length <= i) genRow(rows.length);
      return rows[i];
    }
    /* generate a little ahead so the far rows are already populated when the
       camera reaches them */
    for (let i = 0; i < 20; i++) rowAt(i);

    const rowY = i => -i * TILE;
    /* a bird on a river is standing on a log, not on the water */
    const LOG_R = 26, LOG_TOP = WATER_Z + 4 + LOG_R;
    const PAD_TOP = WATER_Z + 6.5;
    /* the other countries' stepping stones stand higher: a lily pad lies flat,
       a stone has to be seen to be stood on */
    const STONE_TOP = WATER_Z + 12.5;
    const topZ = r => r.t === 'grass' ? GRASS_Z : r.t === 'water' ? LOG_TOP : r.t === 'pads' ? (r.b === 'meadow' ? PAD_TOP : STONE_TOP) : 0;

    /* ---------------------------------------------------------- player --- */
    const BIRDS = {
      hen:    { body: '#f7f9fb', trim: '#e5484d', beak: '#f59f1b' },
      duck:   { body: '#f5cf3f', trim: '#f59f1b', beak: '#ef8b1b' },
      pigeon: { body: '#9aa6b4', trim: '#3fb8a8', beak: '#f0a93c' },
      robin:  { body: '#9a6b44', trim: '#e0603c', beak: '#f2c05a' }
    };
    /* the front page swaps one bird for another, so which one is a variable */
    const BIRD_IDS = ['hen', 'duck', 'pigeon', 'robin'];
    const BIRD_INFO = {
      hen: 'WHITE, WITH A RED COMB', duck: 'NO SENSE OF DANGER',
      pigeon: 'CITY-BRED, UNBOTHERED', robin: 'BROWN BACK, RED BREAST'
    };
    let birdId = BIRDS[api.opt('bird')] ? api.opt('bird') : 'hen';
    let BIRD = BIRDS[birdId];

    const ME = {
      row: 0, x: 0, y: 0, z: 0,
      face: 0, faceTo: 0,
      hop: null, log: null, logOff: 0,
      sqx: 1, sqz: 1,                        // squash, eased back to 1
      dead: null, deadT: 0, sink: 0, spin: 0, z0: 0, bub: 0,
      bumpT: 0
    };
    let score = 0, best = api.best(), coins = 0, maxRow = 0;
    let edge = -6.5;                         // the line the eagle keeps
    let camX = 0, camY = 0, camSet = false;
    /* the row the view is centred on and the x of the bird it is on — yours,
       or in a race the one you are watching — for the lanes that step
       around it and the trains heard from it */
    let FR = 0, FX = 0;
    let ended = false, tAll = 0;
    let hint = 0;                            // the "press up" prompt fades on the first hop
    let zoneNow = null;                      // the country underfoot, once the run is under way
    const BANNER = { t: 9, b: 'meadow' };    // its name, shown on the way in (t on the render clock)
    /* ---- the front page ----
       Opened from the hub, the crossing is its own title screen: the name
       over the live road, your bird on the first tile facing you, the other
       birds a press of left or right away, and Play. The world under it is
       the one you then play in, so starting is only the title hopping off,
       the bird turning to the road and the camera settling back. Online the
       race starts at once, with no menu. */
    let atMenu = api.entry === 'menu' && !ONLINE;
    const MENU_DIST = 2560;
    let unmounted = false;
    if (atMenu) ME.face = ME.faceTo = Math.PI;
    /* In a race each bird starts on a tile of its own, side by side in seat
       order, rather than all four inside one another on the middle tile.
       The first rows are always open grass, so no seat starts behind a tree. */
    if (ONLINE) ME.x = [0, 1, -1, 2][slotOf(RACE.me)] * TILE;

    /* what is under a given x on a river row, if anything */
    function logAt(r, x) {
      for (const g of r.logs) if (x > g.x - g.len / 2 && x < g.x + g.len / 2) return g;
      return null;
    }
    function treeAt(r, c) {
      if (r.t !== 'grass') return false;
      for (const t of r.trees) if (t.c === c) return true;
      return false;
    }

    function tryHop(dx, dy) {
      if (ME.dead || ended) return;
      if (ME.hop) return;                    // one hop at a time; no queue, like the original
      const trow = ME.row + dy;
      if (trow < 0) return;
      const r = rowAt(trow);
      const baseC = Math.round(ME.x / TILE);
      let tx;
      if (r.t === 'water') {
        /* on and over water the bird keeps its offset — a log does not line up
           with the grid and never will */
        tx = clamp(ME.x + dx * TILE, XMIN, XMAX);
      } else {
        const tc = clamp(baseC + dx, -HALF, HALF);
        if (treeAt(r, tc)) { blocked(dx, dy, r, tc); return; }
        tx = tc * TILE;
      }
      if (dx !== 0 && Math.abs(tx - ME.x) < 1) { blocked(dx, dy); return; }

      ME.faceTo = facing(dx, dy);
      /* pushing off, whatever floats underfoot ducks a little */
      if (ME.log) ME.log.dv -= 70;
      else { const pr = rows[ME.row], p = pr && pr.t === 'pads' ? padAt(pr, ME.x) : null; if (p) p.dv -= 45; }
      ME.hop = { fx: ME.x, fy: ME.y, fz: ME.z, tx, ty: rowY(trow), tz: topZ(r), row: trow, t: 0 };
      ME.log = null;
      ME.sqx = 1.18; ME.sqz = .8;
      hopN++; postMe(true);                  // rivals see the hop as it starts
      try { Sound.place(); } catch (e) {}
      if (dy > 0 && hint === 0) hint = .001;
    }
    /* The bird is modelled facing -y, and place() spins about z: a rotation of
       t sends local (0,-1) to (sin t, -cos t), so +x is a quarter turn one way
       and -x the other. Getting this backwards leaves it hopping sideways
       while looking over its shoulder. */
    function facing(dx, dy) {
      return dy > 0 ? 0 : dy < 0 ? Math.PI : dx > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    /* Walking into something: the bird bumps off it, and a tree shivers from
       the knock and lets a few leaves go (a cactus, its spines; a snowy pine,
       its snow). */
    const SHED = { meadow: ['#9dbd2e', '#7fa726'], desert: ['#6fbf5a', '#4f9a43'], arctic: ['#ffffff', '#e4eef8'], volcano: ['#6d6468', '#ff9a3a'] };
    function blocked(dx, dy, r, c) {
      ME.faceTo = facing(dx, dy);
      ME.bumpT = .16;
      try { Sound.nope(); } catch (e) {}
      const tr = r && r.trees.find(t => t.c === c);
      if (!tr) return;
      tr.wob = 1; tr.wt = 0; tr.wx = dx; tr.wy = dy;
      if (WOBS.indexOf(tr) < 0) WOBS.push(tr);
      if (PS && tr.h > 0) {
        const y = rowY(r.i), top = GRASS_Z + [0, 90, 140, 190][tr.h] * tr.s, cols = SHED[r.b];
        for (const col of cols) PS.burst({ x: c * TILE, y, z: top, n: 4, speed: 90, up: [20, 90], jit: 50, life: 1.3, size: 9, color: col,
                                           grav: -260, drag: 2.2, shape: 1, spin: 6, floor: GRASS_Z + 1 });
      }
    }

    /* How a run ends. `what` is the thing on a road that did it, so the card
       can blame a camel rather than a car; `end` is how the ending plays
       (see "the endings" below) — without one, the bird goes under. */
    let killer = null;
    let dth = null;
    function die(how, what, end) {
      if (ME.dead) return;
      ME.dead = how; ME.deadT = 0;
      killer = what || null;
      dth = end || { style: how === 'eagle' ? 'eagle' : 'sink' };
      ME.log = null; ME.hop = null;

      ME.sink = 0; ME.z0 = ME.z; ME.bub = 0; ME.char = 0;
      if (how === 'eagle') eagleStart();
      const st = dth.style;
      try {
        if (st === 'stuck') { Sound.crSplat(); if (how === 'train') Sound.explode(); api.shake(how === 'train' ? 11 : 8); }
        else if (st === 'fling') { Sound.crBonk(dth.big); api.shake(dth.big ? 10 : 6); }
        else if (how === 'water') { Sound.crSplash(); api.shake(7); }
        else if (how === 'ice') { Sound.crBreak(); Sound.crSplash(); api.shake(7); }
        else if (how === 'sand') { Sound.crSink(); api.shake(4); }
        else if (how === 'lava' || how === 'surge') { Sound.crSizzle(); api.shake(8); }
        else if (how === 'worm') { Sound.crChomp(); api.shake(12); }
        else if (how === 'croc') { Sound.crLog(); api.shake(5); }         // the snap comes a moment later (jawsStep)
        else if (how === 'eagle') Sound.crEagle();
        else Sound.fail();
      } catch (e) {}
      if (PS) {
        const x = ME.x, y = ME.y;
        const feathers = (z, n, up) => {
          PS.burst({ x, y, z, n, speed: 200, up, life: .9, size: 13, color: BIRD.body, grav: -700, drag: .9, shape: 1, spin: 9, floor: 2 });
          PS.burst({ x, y, z, n: Math.ceil(n * .4), speed: 150, up, life: .8, size: 11, color: BIRD.trim, grav: -700, drag: .9, shape: 1, spin: 9, floor: 2 });
        };
        if (how === 'sand') {
          /* the quicksand gives with a sigh: a ring of dry sand thrown out and
             a slow slump, and more puffs as it goes down (in update) */
          PS.burst({ x, y, z: WATER_Z + 8, n: 26, speed: 170, up: [110, 280], life: .8, size: 12, color: '#e6c283',
                     grav: -1000, drag: 1.3, shape: 1, spin: 8, floor: WATER_Z });
          PS.burst({ x, y, z: WATER_Z + 4, n: 12, speed: 240, up: 0, life: .5, size: 15, color: '#d2a45f', grav: 0, drag: 3, shape: 1, grow: -20 });
        } else if (how === 'lava' || how === 'surge') {
          /* a spit of molten rock, sparks thrown high, and smoke */
          const z0 = how === 'lava' ? WATER_Z + 6 : 20;
          PS.burst({ x, y, z: z0 + 4, n: 34, speed: 280, up: [220, 560], life: .85, size: 8, color: '#ffc04a',
                     grav: -900, drag: .8, shape: 1, spin: 12, add: true });
          PS.burst({ x, y, z: z0, n: 16, speed: 150, up: [260, 480], life: .7, size: 16, color: '#ff7417',
                     grav: -1600, drag: .6, shape: 1, spin: 8, floor: z0 - 8, add: true });
          PS.burst({ x, y, z: z0 + 20, n: 10, speed: 60, up: [70, 150], life: 1.4, size: 26, color: '#3c3437',
                     grav: 50, drag: 1.4, shape: 1, spin: 2, grow: 30, alpha: .75 });
          feathers(z0 + 30, 10, [160, 320]);
        } else if (how === 'worm') {
          /* the dune tears open under the bird */
          PS.burst({ x, y, z: 10, n: 44, speed: 380, up: [320, 820], life: 1.05, size: 18, color: '#e8bf7c',
                     grav: -1500, drag: .6, shape: 1, spin: 10, floor: 0, jit: 40 });
          PS.burst({ x, y, z: 6, n: 24, speed: 520, up: 0, life: .6, size: 22, color: '#d9aa62', grav: 0, drag: 3, shape: 1, grow: -26 });
          feathers(70, 22, [320, 640]);
        } else if (how === 'croc') {
          PS.burst({ x, y, z: WATER_Z + 8, n: 24, speed: 240, up: [240, 480], life: .75, size: 14, color: '#ffffff',
                     grav: -1800, drag: .7, shape: 1, spin: 14, floor: WATER_Z });
          feathers(40, 16, [220, 460]);
        } else if (how === 'eagle') {
          /* the feathers come off at the grab (see eagleStep) */
        } else if (how === 'water' || how === 'ice') {
          if (how === 'ice') {
            /* the thin ice goes to pieces first */
            PS.burst({ x, y, z: WATER_Z + 6, n: 22, speed: 260, up: [180, 420], life: .8, size: 15, color: '#dff4fd',
                       grav: -1500, drag: .6, shape: 1, spin: 12, floor: WATER_Z, jit: 40 });
          }
          /* It used to be a quiet thud and a slow sink. Now: a crown of white
             blocks thrown high, a spray of droplets, foam racing out across
             the surface (and two rings drawn in scene()), the bird going in
             nose first in a quarter of a second, and bubbles after. */
          /* Sized for the camera: at this distance a tile is about seventy
             pixels, so a chunk has to be a good fraction of one to read as a
             splash at all. A column goes straight up, higher than the bird
             stood; a crown goes out all round; spray flies wide; foam races
             across the surface. */
          PS.burst({ x, y, z: WATER_Z + 10, n: 18, speed: 70, up: [560, 900], life: 1, size: 28, color: '#ffffff',
                     grav: -2000, drag: .5, shape: 1, spin: 10, floor: WATER_Z, jit: 22 });
          PS.burst({ x, y, z: WATER_Z + 8, n: 30, speed: 300, up: [280, 560], life: .85, size: 18, color: '#ffffff',
                     grav: -1800, drag: .7, shape: 1, spin: 14, floor: WATER_Z, jit: 30 });
          PS.burst({ x, y, z: WATER_Z + 12, n: 34, speed: 460, up: [160, 440], life: .7, size: 9, color: '#c9f1ff',
                     grav: -1600, drag: 1, shape: 1, spin: 18, floor: WATER_Z });
          PS.burst({ x, y, z: WATER_Z + 3, n: 22, speed: 380, up: 0, life: .55, size: 16, color: '#ffffff',
                     grav: 0, drag: 3.2, shape: 1, spin: 6, grow: -22 });
        } else {
          /* struck: feathers everywhere, from wherever the body has ended up
             — thrown back off the side of a lorry, or out flat from under a
             car with a puff of the road's dust */
          const p = bodyAt(), flat = st === 'stuck' && dth.shape === 'flat', z = p[2] + (flat ? 14 : 40);
          PS.burst({ x: p[0], y: p[1], z, n: 26, speed: 240, up: flat ? [60, 260] : [110, 380],
                     life: 1, size: 14, color: BIRD.body, grav: -650, drag: 1, shape: 1, spin: 9, floor: 2 });
          PS.burst({ x: p[0], y: p[1], z, n: 10, speed: 170, up: flat ? [50, 200] : [90, 260],
                     life: .9, size: 12, color: BIRD.trim, grav: -650, drag: 1, shape: 1, spin: 9, floor: 2 });
          if (flat) PS.burst({ x: p[0], y: p[1], z: 5, n: 14, speed: 280, up: 0, life: .45, size: 16, color: ROAD_DUST[(killer && killer.b) || 'meadow'],
                               grav: 0, drag: 3.4, shape: 1, spin: 4, grow: -20, alpha: .85 });
          if (how === 'bobsled') PS.burst({ x, y, z: 12, n: 20, speed: 300, up: [120, 320], life: .7, size: 10, color: '#f4faff',
                                            grav: -1100, drag: 1, shape: 1, spin: 10, floor: 2 });
        }
      }
    }
    /* how long each ending plays before the card */
    const DEATH_T = { water: 1.1, ice: 1.2, sand: 1.45, lava: 1.2, surge: 1.1, worm: 1.35, croc: 1.1, eagle: 1.85 };
    const ROAD_DUST = { meadow: '#9a9ca6', desert: '#cdb58c', arctic: '#e8eef6', volcano: '#6a6064' };

    /* ------------------------------------------------------ the endings ---
       What becomes of the bird depends on what got it, and the world does
       not stop to watch. Stepping into a lane as a lorry goes by leaves you
       flattened against its side and carried off with it; standing in front
       of a car puts you flat on the road as it goes over you; a polar bear
       swats you out of the picture; the sandworm takes you in its mouth.
       The traffic keeps coming and the river keeps flowing while it plays
       out, and the card only comes up once the body is gone — carried off,
       swallowed, sunk — or has lain still for a moment. Every ending is a
       style and the little it needs:
         stuck  flattened (shape 'side', 'flat') or lying ('lie'), on a
                carrier `o` at offset `ox` or on the ground at x
         fling  thrown: a centre `p`, velocity `v`, a turn `q` tumbling about `ax`
         mouth  going down the sandworm's throat; jaws, the crocodile's
         sink   under the water, the sand, the lava (the old endings)
         eagle  carried off */
    /* what each kind of traffic does: anything on wheels runs you flat from
       the front and carries you off if you hop into its side or its back,
       animals and boulders go over the top of you, and the rest knock you
       flying */
    const HIT_AS = {
      meadow:  ['wheels', 'wheels', 'wheels', 'wheels'],
      desert:  ['wheels', 'wheels', 'wheels', 'trample', 'bonk'],
      arctic:  ['wheels', 'wheels', 'trample', 'bowl', 'swat'],
      volcano: ['wheels', 'roll', 'roll', 'wheels']
    };
    /* how far each one's side stands out from its middle, and how tall it is */
    const SIDE_W = { meadow: [34, 39, 38, 35], desert: [35, 40, 44, 22, 36], arctic: [37, 25, 30, 20, 30], volcano: [40, 60, 80, 38] };
    const VEH_H = { meadow: [70, 116, 104, 54], desert: [74, 122, 82, 116, 72], arctic: [100, 52, 60, 60, 90], volcano: [116, 100, 130, 98] };
    const VEH_NAME = {
      meadow: ['a car', 'a lorry', 'a bus', 'a sports car'], desert: ['a pickup', 'a camper van', 'a dune buggy', 'a camel', 'a tumbleweed'],
      arctic: ['a snowplough', 'a snowmobile', 'a husky sled', 'penguins', 'a polar bear'],
      volcano: ['a haul truck', 'a boulder', 'a boulder', 'a magma tanker']
    };
    const turned = f => Gfx3D.Q.turn([0, 0, 0, 1], 0, 0, 1, f);
    /* Which way the bird met it. Arriving in the lane from another row puts
       you against its side, unless its front got there first; already in
       the lane, it is its front that finds you, or its back you hop into. */
    function metBy(r, o) {
      const s = r.dir > 0 ? 1 : -1, lx = (ME.x - o.x) * s, h = ME.hop;
      if (h && h.row === r.i && Math.abs(h.fy - h.ty) > 1 && lx < o.len / 2 - 10) return lx < -o.len / 2 + 10 ? 'back' : 'side';
      return lx >= 0 ? 'front' : 'back';
    }
    function roadHit(r, c) {
      const as = HIT_AS[r.b][c.kind], way = metBy(r, c), what = { b: r.b, kind: c.kind, way };
      if (as === 'wheels') {
        if (way === 'front') die('car', what, flatEnd(r));
        else die('car', what, stickEnd(r, c, way, SIDE_W[r.b][c.kind], VEH_H[r.b][c.kind]));
      } else if (as === 'trample' || as === 'roll') die('car', what, flatEnd(r));
      else die('car', what, flingEnd(r, as));
    }
    function railHit(r, t) {
      const how = RAIL_HOW[r.b], way = metBy(r, t), s = r.dir > 0 ? 1 : -1;
      if (r.b === 'meadow') die(how, { way }, stickEnd(r, t, way, 41, 128));
      else if (r.b === 'desert') {
        /* the head is all mouth; anywhere further back, the body throws you */
        const back = (t.x + s * t.len / 2 - ME.x) * s;
        die(how, { way }, back < WORM_HEAD + 50 ? { style: 'mouth', r, o: t, scale: 1, q: turned(ME.face), p: [ME.x, ME.y, ME.z + 40] }
                                                : flingEnd(r, 'toss'));
      } else if (r.b === 'arctic') die(how, { way }, flingEnd(r, 'launch'));
      /* the lava sweeps you along with its front, or takes you where you stepped in */
      else die(how, { way }, way === 'front' ? { style: 'sink', o: t, ox: ME.x - t.x } : null);
    }
    /* flattened against it — its side, its front or its back — and carried off */
    function stickEnd(r, o, way, w, hgt) {
      const s = r.dir > 0 ? 1 : -1, y = rowY(r.i), th = 7, z = clamp(ME.z, 4, Math.max(4, hgt - 72));
      const from = [ME.x, ME.y, ME.z];
      if (way === 'side') {
        const near = ME.hop && ME.hop.fy < y ? -1 : 1;           // the near side, unless it came from the row beyond
        return { style: 'stuck', shape: 'side', way, o, ox: clamp(ME.x - o.x, -o.len / 2 + 24, o.len / 2 - 24),
                 y: y + near * (w + th), z, from, t0: 0, face: near > 0 ? 0 : Math.PI };
      }
      /* On its front or its back — but drawn round the near corner, facing
         the camera: flattened flat against an end, it would be seen edge on
         and all but vanish. */
      const e = way === 'front' ? 1 : -1;
      return { style: 'stuck', shape: 'side', way, o, ox: e * s * (o.len / 2 - 18), y: y + w + th, z, from, t0: 0, face: 0 };
    }
    /* flat on the road where it stood, with the thing going over the top */
    function flatEnd(r) {
      const s = r.dir > 0 ? 1 : -1;
      return { style: 'stuck', shape: 'flat', o: null, x: ME.x + s * 22, y: rowY(r.i), z: 1, from: [ME.x, ME.y, ME.z], t0: 0,
               face: ME.face + (Math.random() - .5) * .7 };
    }
    /* Knocked flying: how hard along, how hard up, how fast it tumbles. A
       tumbleweed bonks you, the penguins bowl you over, a polar bear swats
       you clean out of the picture; a bobsled launches you, and the worm's
       back throws you up in the air. */
    const FLING = { bonk: [420, 480, 9], bowl: [560, 400, 12], swat: [1250, 950, 15], launch: [1400, 820, 17], toss: [160, 1150, 9] };
    function flingEnd(r, as) {
      const s = r.dir > 0 ? 1 : -1, F = FLING[as], a = (Math.random() - .5) * .6, w = (Math.random() - .5) * .5;
      const n = Math.hypot(w, 1);
      return { style: 'fling', p: [ME.x, ME.y, Math.max(ME.z, 0) + 40], v: [s * F[0] * Math.cos(a), F[0] * Math.sin(a) * .4 + 90, F[1]],
               q: turned(ME.face), ax: [w / n, s / n, 0], spin: F[2] * (Math.random() < .5 ? 1 : -1), scale: 1,
               big: as === 'swat' || as === 'launch' || as === 'toss', bounce: 0, rest: 0, gone: false, shed: 0 };
    }
    /* the body, wherever the ending has put it */
    function bodyAt() {
      const d = dth;
      if (!ME.dead || !d) return [ME.x, ME.y, ME.z];
      if (d.style === 'stuck') {
        const k = clamp((ME.deadT - d.t0) / .09, 0, 1), e = k * (2 - k);
        const kz = clamp((ME.deadT - d.t0) / (d.shape === 'side' ? .3 : .08), 0, 1), ez = kz * (2 - kz);
        const x = d.o ? d.o.x + d.ox : d.from[0] + (d.x - d.from[0]) * e;
        return [x, d.from[1] + (d.y - d.from[1]) * e, d.from[2] + (d.z - d.from[2]) * ez];
      }
      return d.p || [ME.x, ME.y, ME.z];
    }
    function birdGone() {
      const how = ME.dead, d = dth;
      if (!how || !d) return false;
      if (d.style === 'mouth' || d.style === 'jaws') return d.scale <= .04;
      if (d.style === 'fling') return d.gone;
      if (d.style === 'sink') return (how === 'water' || how === 'ice' || how === 'sand' || how === 'lava' || how === 'surge') && ME.sink >= 1;
      return false;
    }
    function offScreen(p) {
      if (!cam) return Math.abs(p[0] - camX) > 1100 || Math.abs(p[1] - camY) > 1000;
      const s = cam.toScreen(p[0], p[1], p[2] + 30);
      return s.w <= 0 || s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100;
    }
    /* the card: once the body is gone, or has lain still a moment */
    function endDue() {
      const t = ME.deadT, d = dth;
      if (!d) return t > .95;
      if (d.style === 'stuck') return d.o ? t > 2.4 || (t > 1 && offScreen(bodyAt())) : t > Math.max(1.35, d.t0 + .85);
      if (d.style === 'fling') return t > 2.6 || (t > .8 && (d.gone || offScreen(bodyAt())));
      if (d.style === 'mouth' || d.style === 'jaws') return t > 1.3;
      return t > (DEATH_T[ME.dead] || .95);
    }
    /* what a falling body comes down on: how high it is, and whether it goes in */
    function groundAt(x, y) {
      const r = rowAt(Math.max(0, Math.round(-y / TILE)));
      if (!r || r.t === 'grass') return { z: GRASS_Z };
      if (r.t === 'road' || r.t === 'rail') return { z: 0 };
      if (r.t === 'water') { const g = logAt(r, x); return g ? { z: LOG_TOP + g.dz, on: g } : { z: WATER_Z, wet: r }; }
      return padAt(r, x) ? { z: topZ(r) } : { z: WATER_Z, wet: r };
    }
    /* into the river, the lava or the quicksand, with a splash of it */
    function splashAt(x, y, r) {
      const lava = r.b === 'volcano', sand = r.b === 'desert' && r.t === 'pads', col = lava ? '#ffb13d' : sand ? '#e3bd7c' : '#ffffff';
      try { if (lava) Sound.crSizzle(); else if (sand) Sound.crSink(); else Sound.crSplash(); } catch (e) {}
      if (!PS) return;
      PS.burst({ x, y, z: WATER_Z + 8, n: 26, speed: 240, up: [260, 640], life: .8, size: 15, color: col, grav: -1800, drag: .7,
                 shape: 1, spin: 12, floor: WATER_Z, add: lava });
      PS.burst({ x, y, z: WATER_Z + 3, n: 14, speed: 330, up: 0, life: .5, size: 15, color: col, grav: 0, drag: 3.2, shape: 1, grow: -20, add: lava });
      if (!lava && !sand) ripple(x, y, true);
    }
    /* A throw: it tumbles through the air shedding feathers, bounces if it
       came down soft (a bonk, a bowling) and lies there dazed; comes down
       flat if it was thrown hard; and goes in if it came down on water. */
    function flingStep(d, dt) {
      if (d.gone) return;
      d.v[2] -= 2100 * dt;
      for (let a = 0; a < 3; a++) d.p[a] += d.v[a] * dt;
      if (d.spin) Gfx3D.Q.turn(d.q, d.ax[0], d.ax[1], d.ax[2], d.spin * dt);
      d.shed += dt;
      if (PS && d.shed > .06 && ME.deadT < 1.3) {
        d.shed = 0;
        PS.burst({ x: d.p[0], y: d.p[1], z: d.p[2], n: 1, speed: 40, up: [0, 60], life: 1.1, size: 11, color: Math.random() < .7 ? BIRD.body : BIRD.trim,
                   grav: -250, drag: 2.4, shape: 1, spin: 7, floor: 2 });
      }
      const g = groundAt(d.p[0], d.p[1]);
      if (d.v[2] > 0 || d.p[2] - 34 > g.z) return;
      if (g.wet) { d.gone = true; splashAt(d.p[0], d.p[1], g.wet); return; }
      const x = d.p[0], y = d.p[1], on = g.on || null;
      if (!d.big && d.bounce < 2 && d.v[2] < -320) {
        d.p[2] = g.z + 34; d.v[2] *= -.36; d.v[0] *= .5; d.v[1] *= .5; d.spin *= .6; d.bounce++;
        try { Sound.thud(); } catch (e) {}
        if (PS) PS.burst({ x, y, z: g.z + 3, n: 8, speed: 120, up: [30, 110], life: .4, size: 10, color: '#e8e4dc', grav: -900, drag: 1.8,
                           shape: 1, spin: 8, floor: g.z });
        return;
      }
      const face = Math.atan2(d.v[0], -d.v[1]) + (Math.random() - .5);
      if (d.big) {
        /* thrown hard: it lands flat */
        dth = { style: 'stuck', shape: 'flat', o: on, ox: on ? x - on.x : 0, x, y, z: g.z + 1, from: [x, y, g.z + 1], t0: ME.deadT, face };
        try { Sound.crSplat(); } catch (e) {}
        if (PS) PS.burst({ x, y, z: g.z + 14, n: 18, speed: 220, up: [60, 240], life: .9, size: 13, color: BIRD.body, grav: -650, drag: 1,
                           shape: 1, spin: 9, floor: g.z + 1 });
      } else {
        /* knocked down: it lies where it stopped, on its side */
        const q = turned(face);
        Gfx3D.Q.turn(q, Math.sin(face), -Math.cos(face), 0, Math.PI / 2);
        const z = g.z + 31 * BIRD_S;
        dth = { style: 'stuck', shape: 'lie', q, o: on, ox: on ? x - on.x : 0, x, y, z, from: [x, y, z], t0: ME.deadT, face };
      }
    }
    /* The sandworm's mouth: the bird goes to the maw in a blink, is carried
       along in it as the worm swims on, and goes down the throat. */
    function mouthStep(d, dt) {
      const r = d.r, t = d.o, s = r.dir > 0 ? 1 : -1, front = t.x + s * t.len / 2;
      const x0 = front - s * 66, z0 = Math.max(wormZ(r, x0), 58);
      const x1 = front - s * (WORM_HEAD - 30 + .5 * WORM_SEG), z1 = Math.max(wormZ(r, x1), 34);
      let fx = x0 - x1, fz = z0 - z1 + 26;
      const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
      const k = clamp((ME.deadT - .06) / .42, 0, 1), reach = 50 + 36 * (1 - k * k);
      const g = Math.min(1, ME.deadT / .07);
      d.p[0] += (x0 + fx * reach - d.p[0]) * g; d.p[1] += (rowY(r.i) - d.p[1]) * g; d.p[2] += (z0 + fz * reach - d.p[2]) * g;
      d.scale = Math.max(0, 1 - k * .97);
      Gfx3D.Q.turn(d.q, 0, s, 0, dt * 9);
      if (k >= 1 && !d.gulped) {
        d.gulped = true;
        try { Sound.crGulp(); } catch (e) {}
        if (PS) PS.burst({ x: d.p[0], y: d.p[1], z: d.p[2], n: 12, speed: 160, up: [40, 200], life: 1, size: 12, color: BIRD.body,
                           grav: -500, drag: 1.4, shape: 1, spin: 8, floor: 2 });
      }
    }
    /* The crocodile: its jaws open wide and snap shut on the bird, it ducks
       under with it, and chews. */
    function jawsStep(d, dt) {
      const g = d.o, r = d.r, s = r.dir > 0 ? 1 : -1, hl = g.len * CROC_HEAD;
      g.eat = ME.deadT;
      if (ME.deadT > .16 && !d.bit) {
        d.bit = true; g.dv -= 330;
        try { Sound.crChomp(); } catch (e) {}
        if (PS) PS.burst({ x: g.x + s * (g.len / 2 - hl * .5), y: rowY(r.i), z: WATER_Z + 8, n: 16, speed: 200, up: [160, 380], life: .6, size: 12,
                           color: '#ffffff', grav: -1600, drag: .8, shape: 1, spin: 12, floor: WATER_Z });
      }
      const k = clamp((ME.deadT - .2) / .5, 0, 1);
      const tx = g.x + s * (g.len / 2 - hl * .55), tz = WATER_Z + 30 + g.dz - 34 * k, c = Math.min(1, ME.deadT / .08);
      d.p[0] += (tx - d.p[0]) * c; d.p[1] += (rowY(r.i) - d.p[1]) * c; d.p[2] += (tz - d.p[2]) * c;
      d.scale = Math.max(0, 1 - k * .97);
      if (ME.deadT > .16) Gfx3D.Q.turn(d.q, s, 0, 0, Math.sin(ME.deadT * 30) * dt * 12);
    }
    /* the ending, one step on */
    function ending(dt) {
      const how = ME.dead, d = dth;
      if (!how || !d) return;
      if (d.style === 'stuck') {
        /* carried off, shedding feathers as it goes */
        if (d.o && PS && ME.deadT < 1.3 && (d.shed = (d.shed || 0) + dt) > .08) {
          d.shed = 0;
          const p = bodyAt();
          PS.burst({ x: p[0], y: p[1], z: p[2] + 40, n: 1, speed: 50, up: [10, 80], life: 1.2, size: 11, color: Math.random() < .7 ? BIRD.body : BIRD.trim,
                     grav: -260, drag: 2.2, shape: 1, spin: 7, floor: 2 });
        }
      } else if (d.style === 'fling') flingStep(d, dt);
      else if (d.style === 'mouth') mouthStep(d, dt);
      else if (d.style === 'jaws') jawsStep(d, dt);
      else if (d.style === 'eagle') eagleStep();
      else if (how === 'water' || how === 'ice') {
        /* straight in: a quarter of a second from the surface to gone */
        ME.sink = Math.min(1, ME.sink + dt / .26);
        ME.z = ME.z0 + (WATER_Z - 70 - ME.z0) * ME.sink * ME.sink;
        /* and a few bubbles come back up where it went in */
        if (PS && ME.bub < 5 && ME.deadT > .3 + ME.bub * .09) {
          ME.bub++;
          PS.burst({ x: ME.x + (Math.random() - .5) * 40, y: ME.y + (Math.random() - .5) * 30, z: WATER_Z - 6, n: 1,
                     speed: 0, up: [90, 140], life: .26, size: 10 + Math.random() * 6, color: '#ffffff', grav: 0, drag: 0, shape: 1 });
        }
      } else if (how === 'sand') {
        /* quicksand takes its time: a slow slump with a struggle in it, and
           a puff of dry sand every time it gives a little more */
        ME.sink = Math.min(1, ME.sink + dt / 1.05);
        ME.z = ME.z0 + (WATER_Z - 96 - ME.z0) * (ME.sink * .7 + ME.sink * ME.sink * .3);
        if (PS && ME.bub < 6 && ME.deadT > .12 + ME.bub * .17) {
          ME.bub++;
          PS.burst({ x: ME.x, y: ME.y, z: WATER_Z + 4, n: 7, speed: 120, up: [60, 170], life: .5, size: 10,
                     color: '#e3bd7c', grav: -900, drag: 1.4, shape: 1, spin: 7, floor: WATER_Z });
        }
      } else if (how === 'lava' || how === 'surge') {
        /* it catches, blackens and goes under, smoking — swept along first,
           if it was the front of a surge that took it */
        if (d.o && ME.sink < 1) ME.x = d.o.x + d.ox;
        ME.char = Math.min(1, ME.char + dt * 5);
        ME.sink = Math.min(1, ME.sink + dt / (how === 'lava' ? .55 : d.o ? .7 : .45));
        ME.z = ME.z0 + ((how === 'lava' ? WATER_Z : 0) - 80 - ME.z0) * ME.sink * ME.sink;
        if (PS && ME.bub < 6 && ME.deadT > .2 + ME.bub * .13) {
          ME.bub++;
          PS.burst({ x: ME.x + (Math.random() - .5) * 30, y: ME.y + (Math.random() - .5) * 20, z: (how === 'lava' ? WATER_Z : 16) + 6, n: 1,
                     speed: 10, up: [60, 110], life: 1.2, size: 18 + Math.random() * 8, color: '#3f373a', grav: 30, drag: 1, shape: 1, grow: 26, alpha: .7 });
        }
      }
    }

    /* ------------------------------------------------------------ eagle ---
       It used to appear over the bird and lift it straight up. Now it comes
       in the way the original's does: from the top of the screen, low over
       the rows ahead, wings spread; it takes the bird without stopping and
       climbs away off the bottom of the screen with it. The path is two
       curves through the point where the talons close, worked out from
       where the bird was standing, and everything else — the heading, the
       dive and climb, the wingbeat, the bird dangling — is read off it. */
    const EG = { x: 0, y: 0, z: 0, grabbed: false, pos: [0, 0, 0], yaw: 0, pitch: 0, flap: 0, talon: 0, bird: [0, 0, 0] };
    const EAGLE_GRAB = .62, EAGLE_OUT = 1.2;
    function eagleStart() {
      EG.x = ME.x; EG.y = ME.y; EG.z = ME.z; EG.grabbed = false;
      eagleAt(0);
    }
    const bez = (a, c, b, k) => { const u = 1 - k; return u * u * a + 2 * u * k * c + k * k * b; };
    const bezD = (a, c, b, k) => 2 * (1 - k) * (c - a) + 2 * k * (b - c);
    function eagleAt(t) {
      const gx = EG.x, gy = EG.y, gz = EG.z + 150;          // the body, when the talons close on the bird
      let k, P0, P1, P2;
      if (t < EAGLE_GRAB) {
        /* in from ahead: high and to one side, then low over the rows */
        k = t / EAGLE_GRAB; k = k * (1.25 - .25 * k);
        P0 = [gx + 420, gy - 1900, gz + 520]; P1 = [gx + 150, gy - 620, gz - 30]; P2 = [gx, gy, gz];
      } else {
        /* and away with it, over the camera */
        k = Math.min(1.25, (t - EAGLE_GRAB) / EAGLE_OUT);
        P0 = [gx, gy, gz]; P1 = [gx - 70, gy + 560, gz - 10]; P2 = [gx - 300, gy + 1700, gz + 760];
      }
      for (let a = 0; a < 3; a++) EG.pos[a] = bez(P0[a], P1[a], P2[a], k);
      const dx = bezD(P0[0], P1[0], P2[0], k), dy = bezD(P0[1], P1[1], P2[1], k), dz = bezD(P0[2], P1[2], P2[2], k);
      EG.yaw = Math.atan2(dx, -dy);
      EG.pitch = Math.atan2(-dz, Math.hypot(dx, dy)) * .8;
      /* wings: a glide with a shiver on the way in, swept up for the grab,
         then hard beats to climb away with the weight */
      const g = t - EAGLE_GRAB;
      EG.flap = t < EAGLE_GRAB - .16 ? .1 + Math.sin(t * 22) * .06
              : g < .08 ? .1 + (g + .16) / .24 * .8
              : .28 + Math.cos((g - .08) * 17) * .62;
      EG.talon = t < EAGLE_GRAB - .1 ? 1 : t < EAGLE_GRAB ? (EAGLE_GRAB - t) / .1 : 0;
      return EG;
    }
    /* the grab itself: a burst of feathers, a thump and a whoosh */
    function eagleStep() {
      if (!EG.grabbed && ME.deadT >= EAGLE_GRAB) {
        EG.grabbed = true;
        try { Sound.crGrab(); } catch (e) {}
        api.shake(6);
        if (PS) {
          PS.burst({ x: EG.x, y: EG.y, z: EG.z + 50, n: 22, speed: 230, up: [60, 260], life: 1.1, size: 13, color: BIRD.body,
                     grav: -420, drag: 1.3, shape: 1, spin: 7, floor: 2 });
          PS.burst({ x: EG.x, y: EG.y, z: EG.z + 50, n: 8, speed: 170, up: [60, 220], life: 1, size: 11, color: BIRD.trim,
                     grav: -420, drag: 1.3, shape: 1, spin: 7, floor: 2 });
          PS.burst({ x: EG.x, y: EG.y, z: EG.z + 60, n: 10, speed: 190, up: [80, 240], life: 1.2, size: 12, color: '#6b4a2e',
                     grav: -380, drag: 1.4, shape: 1, spin: 6, floor: 2 });
        }
      }
    }

    /* ------------------------------------------------------- the lanes --- */
    /* Exhaust: whatever burns fuel puffs from its tail — lorries, buses and
       trucks in dark chugs, now and then two or three close together, cars
       in a lighter wisp every so often, and in the north it all comes out
       as white breath. A puff is left where it is made, so the traffic
       drives on out of it. [seconds between puffs, size, height] by kind. */
    const EXHAUST = {
      meadow:  [[1.3, 10, 14], [.42, 16, 18], [.48, 16, 18], [1, 10, 12]],
      desert:  [[.75, 12, 16], [.5, 15, 20], [.7, 11, 30], null, null],
      arctic:  [[.42, 15, 28], [.75, 10, 16], null, null, null],
      volcano: [[.4, 18, 40], null, null, [.46, 16, 18]]
    };
    /* pale enough to read against the tarmac: a truck's a little greyer */
    const SMOKE = { meadow: ['#c9cdd3', '#e8eaee'], desert: ['#d9cfbd', '#efe8da'], arctic: ['#f4f7fb', '#ffffff'], volcano: ['#8d8589', '#a9a2a5'] };
    function exhaust(r, dt) {
      const E = EXHAUST[r.b], s = r.dir > 0 ? 1 : -1, col = SMOKE[r.b], y = rowY(r.i);
      for (const c of r.cars) {
        const e = E[c.kind];
        if (!e) continue;
        if (c.ex === undefined) c.ex = Math.random() * e[0];
        if ((c.ex -= dt) > 0) continue;
        const big = e[0] < .55;
        c.ex = big && Math.random() < .22 ? .08 : e[0] * (.6 + Math.random() * .8);
        if (Math.abs(c.x - camX) > 1500) continue;
        PS.burst({ x: c.x - s * (c.len / 2 + 6), y: y + s * 17, z: e[2], n: big ? 2 : 1, angle: s > 0 ? Math.PI : 0, spread: .9, speed: 80, jit: 8,
                   up: [18, 46], life: big ? 1.1 : .8, size: e[1], color: big ? col[0] : col[1], alpha: .9,
                   grav: 18, drag: 2.2, shape: 1, spin: 2.5, grow: e[1] * 1.9 });
      }
    }
    function stepRoad(r, dt, live) {
      const v = r.dir * r.speed;
      for (const c of r.cars) c.x += v * dt;
      if (live && PS && r.i >= FR - 5 && r.i <= FR + 13) exhaust(r, dt);
      for (let k = r.cars.length - 1; k >= 0; k--) {
        const c = r.cars[k];
        if (r.dir > 0 ? c.x - c.len / 2 > EDGE : c.x + c.len / 2 < -EDGE) r.cars.splice(k, 1);
      }
      /* how far the last one in has come; when it has cleared the lane's next
         gap, the next car comes in behind it — as far in as it would have got
         had it entered the moment the gap opened, so one long step spawns
         exactly what a run of short ones would (see laneTo) */
      const entry = r.dir > 0 ? -EDGE : EDGE;
      let near = r.cars.length ? 1e9 : r.need;
      for (const c of r.cars) {
        const d = r.dir > 0 ? (c.x - c.len / 2) - entry : entry - (c.x + c.len / 2);
        if (d < near) near = d;
      }
      while (near >= r.need) {
        const c = newCar(r), over = near - r.need;
        c.x = entry + (r.dir > 0 ? over - c.len / 2 : c.len / 2 - over);
        r.cars.push(c);
        near = over - c.len;
        r.need = nextGap(r);
      }
    }

    /* Anything that floats gives under a landing: it ducks, comes back up a
       little past level and settles — a spring, stiff enough to be quick.
       While the bird stands on it, it rides a little lower. */
    const FLOAT_K = 190, FLOAT_C = 11;
    function bob(f, dt, load) {
      if (!f.dv && !f.dz && !load) return;
      f.dv += (-FLOAT_K * (f.dz - load) - FLOAT_C * f.dv) * dt;
      f.dz += f.dv * dt;
      if (!load && Math.abs(f.dz) < .02 && Math.abs(f.dv) < .05) { f.dz = 0; f.dv = 0; }
    }
    function stepWater(r, dt, live) {
      const v = r.dir * r.speed;
      for (const g of r.logs) { g.x += v * dt; if (live) bob(g, dt, ME.log === g ? -2.5 : 0); }
      for (let k = r.logs.length - 1; k >= 0; k--) {
        const g = r.logs[k];
        if (r.dir > 0 ? g.x - g.len / 2 > EDGE : g.x + g.len / 2 < -EDGE) r.logs.splice(k, 1);
      }
      /* exact spawns, as on the road */
      const entry = r.dir > 0 ? -EDGE : EDGE;
      let near = r.logs.length ? 1e9 : r.need;
      for (const g of r.logs) {
        const d = r.dir > 0 ? (g.x - g.len / 2) - entry : entry - (g.x + g.len / 2);
        if (d < near) near = d;
      }
      while (near >= r.need) {
        const g = newLog(r, nextLen(r)), over = near - r.need;
        g.x = entry + (r.dir > 0 ? over - g.len / 2 : g.len / 2 - over);
        r.logs.push(g);
        near = over - g.len;
        r.need = nextGapW(r);
      }
    }

    /* a pad or a stone pressed down by a landing bobs back up on its own */
    function stepPads(r, dt) {
      const on = !ME.hop && !ME.dead && ME.row === r.i ? padAt(r, ME.x) : null;
      for (const p of r.pads) bob(p, dt, p === on ? (r.b === 'meadow' ? -1.2 : -2.5) : 0);
    }
    /* rings on the water where something landed, spreading out and fading */
    const RIPS = [], RIP_T = .75;
    function ripple(x, y, big) {
      if (RIPS.length >= 6) RIPS.shift();
      RIPS.push({ x, y, t: 0, big });
    }
    /* a tree knocked by a bump shivers for a moment */
    const WOBS = [];
    function wobble(o, tr) {
      const a = Math.sin(tr.wt * 30) * tr.wob * tr.wob * .12;
      return M4.mul(o, o, hinge(TL, tr.wy ? 'x' : 'y', tr.wy ? -a * tr.wy : a * tr.wx, 0, 0, 0));
    }
    /* the lanes near the bird, and whatever is settling: they keep going
       while an ending plays out, and behind the card after it (quietly) */
    /* Every lane runs on the race's one clock, tAll, wherever the birds are.
       Only the lanes around the view are stepped — stepping hundreds that
       nobody can see would be waste — so a lane coming into view first runs
       the time it missed, quietly, in long strides. That keeps every
       screen's traffic in step with everyone else's: a rival two screens up
       the course is dodging the same cars you see them dodge, which is what
       makes watching someone else's run work at all. Spawns and the
       railway's clocks are exact at any stride, so a lane that caught up is
       the same lane as one that never stopped. The window is the rows
       scene() draws, centred where the camera is looking (FR). */
    const CATCH_STRIDE = .2;
    function laneStep(r, i, dt, live, loud) {
      if (r.t === 'road') stepRoad(r, dt, live);
      else if (r.t === 'water') stepWater(r, dt, live);
      else if (r.t === 'rail') stepRail(r, dt, live && i >= FR - 4 && i <= FR + 9, i, !(live && loud));
      else if (r.t === 'pads' && live) stepPads(r, dt);
    }
    function stepWorld(dt, loud) {
      const lo = Math.max(0, FR - 9), hi = FR + 20;
      for (let i = lo; i <= hi; i++) {
        const r = rowAt(i);
        if (!r || r.t === 'grass') continue;
        for (let left = tAll - dt - (r.tt || 0); left > 1e-7; left -= CATCH_STRIDE) laneStep(r, i, Math.min(CATCH_STRIDE, left), false, false);
        laneStep(r, i, dt, true, loud);
        r.tt = tAll;
      }
      for (let k = RIPS.length - 1; k >= 0; k--) if ((RIPS[k].t += dt) > RIP_T) RIPS.splice(k, 1);
      for (let k = WOBS.length - 1; k >= 0; k--) {
        const tr = WOBS[k];
        tr.wt += dt; tr.wob = Math.max(0, 1 - tr.wt / .55);
        if (tr.wob <= 0) WOBS.splice(k, 1);
      }
    }

    /* A train is three states and a clock, and now it is heard as well as
       seen. The bell starts with the first flash of the lamps and rings until
       the last carriage has gone, louder the nearer the crossing is to you;
       the horn sounds as the locomotive comes in; the wheels knock as the
       bogies pass. The warning is still the whole point of the lane: a second
       and a half is long enough to get off the track and far too short to
       cross one you have only just reached.
       The other countries' railways keep the same clock in their own voices:
       the sandworm's lane rumbles and the skulls' eyes burn before the dune
       tears open; the bobsled run beeps like a start gate; the cracks in the
       lava channel glow and it growls before the surge comes down it. */
    const TRAIN_V = 1850;
    const RAIL_V = { meadow: TRAIN_V, desert: 1320, arctic: 2150, volcano: 1450 };
    const RAIL_WARN = { meadow: 1.5, desert: 1.8, arctic: 1.5, volcano: 1.7 };
    /* Each change of state keeps the time left over from the step it came
       in, so the railway keeps the same clock whether it is stepped a
       120th of a second at a time or caught up in long strides (laneTo). */
    function stepRail(r, dt, vis, i, mute) {
      r.timer -= dt;
      r.flash += dt;
      const vol = vis && !mute ? Math.max(.14, 1 - Math.abs(i - FR) / 8) : 0;
      if (r.state === 'idle') {
        if (r.timer <= 0) { r.state = 'warn'; r.flash = -r.timer; r.timer += RAIL_WARN[r.b]; r.bellT = 0; }
      } else if (r.state === 'warn') {
        if (r.timer <= 0) {
          r.state = 'run';
          const len = railLen(r), v = r.dir * RAIL_V[r.b] * r.fast;
          r.train = { x: (r.dir > 0 ? -EDGE - len / 2 : EDGE + len / 2) + v * -r.timer, len, v, n: r.cars };
          r.clack = 0;
          if (vol) {
            try {
              if (r.b === 'desert') Sound.crWorm(vol); else if (r.b === 'arctic') Sound.crSled(vol);
              else if (r.b === 'volcano') Sound.crSurge(vol); else Sound.crHorn(vol);
            } catch (e) {}
          }
        }
      } else {
        const t = r.train;
        if (t) {
          t.x += t.v * dt;
          /* a knock for every bogie that goes past where you are standing;
             a worm or a surge rumbles on as it goes by */
          if (vol && Math.abs(t.x - FX) < t.len / 2 + 300 && r.b !== 'arctic') {
            const every = r.b === 'meadow' ? 160 : 560;
            r.clack += Math.abs(t.v) * dt;
            while (r.clack >= every) {
              r.clack -= every;
              try { if (r.b === 'meadow') Sound.crClack(vol * .9); else Sound.crRumble(vol * .7); } catch (e) {}
            }
          }
          /* gone past the far side: the wait for the next one starts from the
             moment its tail cleared, not from the end of this step */
          const past = r.dir > 0 ? (t.x - t.len / 2) - EDGE : -EDGE - (t.x + t.len / 2);
          if (past > 0) {
            r.train = null; r.state = 'idle';
            r.timer = (2.4 + r.rng() * 3) * r.rate - past / Math.abs(t.v);
            r.dir = r.rng() < .5 ? 1 : -1;
            railCars(r);
          }
        } else { r.state = 'idle'; r.timer = (2.4 + r.rng() * 3) * r.rate; }
      }
      if (vol && (r.state === 'warn' || r.state === 'run')) {
        r.bellT -= dt;
        if (r.bellT <= 0) {
          if (r.b === 'meadow') {
            r.bellT += .3; r.bellK ^= 1;
            try { Sound.crBell(vol * (r.state === 'run' ? .55 : 1), r.bellK); } catch (e) {}
          } else if (r.b === 'arctic') {
            /* the start gate: beep, beep, and a high one as it comes */
            r.bellT += .5;
            if (r.state === 'warn') { try { Sound.crBuzz(vol, r.timer < .5); } catch (e) {} }
          } else {
            r.bellT += .45;
            if (r.state === 'warn') { try { Sound.crRumble(vol); } catch (e) {} }
          }
        }
      }
      if (vis && PS) railFx(r, i, dt);
    }

    /* The worm swims: its body follows one fixed wave through the sand, so
       the humps stay where they are while it slides through them — which is
       what makes it read as swimming rather than being carried. */
    const WORM_K = TAU / 1040;
    const wormZ = (r, x) => 34 + 96 * Math.sin(x * WORM_K + r.ph);
    /* what the ground does around each of them, on the rows in view */
    function railFx(r, i, dt) {
      const y = rowY(i), t = r.train;
      if (r.b === 'desert') {
        if (r.state === 'warn') {
          /* the dune trembles: sand hopping all along the lane */
          r.spray += dt * 34;
          while (r.spray >= 1) {
            r.spray--;
            PS.burst({ x: camX + (Math.random() - .5) * 2000, y: y + (Math.random() - .5) * 76, z: 2, n: 2, speed: 50, up: [60, 170],
                       life: .45, size: 7, color: Math.random() < .5 ? '#e6c283' : '#d4a862', grav: -1000, drag: 1.4, shape: 1, spin: 6, floor: 0 });
          }
        } else if (t) {
          /* fountains where the body goes in and comes out of the sand */
          const s = r.dir > 0 ? 1 : -1, head = t.x + s * t.len / 2, tail = t.x - s * t.len / 2;
          const a = Math.max(Math.min(head, tail), camX - 1500), b = Math.min(Math.max(head, tail), camX + 1500);
          r.spray += dt * 60;
          const n = Math.floor(r.spray);
          r.spray -= n;
          for (let x = a; x < b && n > 0; x += 24) {
            if ((wormZ(r, x) > 0) === (wormZ(r, x + 24) > 0)) continue;
            PS.burst({ x: x + 12, y: y + (Math.random() - .5) * 60, z: 4, n, speed: 150, up: [180, 420], life: .6, size: 12,
                       color: Math.random() < .5 ? '#ebc485' : '#d7a964', grav: -1300, drag: .8, shape: 1, spin: 9, floor: 0 });
          }
        }
      } else if (r.b === 'volcano') {
        if (r.state === 'warn') {
          r.spray += dt * 22;
          while (r.spray >= 1) {
            r.spray--;
            const x = camX + (Math.random() - .5) * 2000;
            PS.burst({ x, y: y + (Math.random() - .5) * 60, z: 4, n: 2, speed: 40, up: [90, 220], life: .7, size: 6, color: '#ffae3a',
                       grav: -300, drag: 1, shape: 1, spin: 6, add: true });
            if (Math.random() < .3) PS.burst({ x, y, z: 10, n: 1, speed: 10, up: [40, 80], life: 1.2, size: 20, color: '#433b3f',
                                               grav: 40, drag: 1, shape: 1, grow: 22, alpha: .6 });
          }
        } else if (t) {
          /* the front of the surge throws molten spatter and sparks */
          const hx = t.x + (r.dir > 0 ? 1 : -1) * t.len / 2;
          if (Math.abs(hx - camX) < 1600) {
            r.spray += dt * 40;
            while (r.spray >= 1) {
              r.spray--;
              PS.burst({ x: hx, y: y + (Math.random() - .5) * 70, z: 30, n: 2, speed: 170, up: [200, 460], life: .7, size: 9,
                         color: Math.random() < .5 ? '#ffc24a' : '#ff7a1a', grav: -1100, drag: .8, shape: 1, spin: 10, add: true, floor: 0 });
            }
          }
        }
      } else if (r.b === 'arctic' && t) {
        /* ice shavings thrown up behind every sled */
        r.spray += dt * 50;
        const n = Math.floor(r.spray);
        r.spray -= n;
        if (n) {
          const s = r.dir > 0 ? 1 : -1;
          for (let k = 0; k < t.n; k++) {
            const tail = t.x + s * (t.len / 2 - k * (SLED_LEN + SLED_GAP) - SLED_LEN);
            if (Math.abs(tail - camX) > 1600) continue;
            PS.burst({ x: tail, y: y + (Math.random() - .5) * 50, z: 6, n, speed: 90, up: [80, 200], life: .5, size: 7, color: '#f2faff',
                       grav: -900, drag: 1.4, shape: 1, spin: 8, floor: 2 });
          }
        }
      }
    }

    /* --------------------------------------------------------- collide --- */
    const BODY = TILE * .30;               // half-width of the bird, for hits

    function hitTest() {
      if (ME.dead) return;
      /* mid-hop the bird belongs to whichever row it is nearer — it is in the
         air, but a car passing underneath still takes it */
      const r = rowAt(ME.hop && ME.hop.t > HOP_T * .5 ? ME.hop.row : ME.row);
      if (!r) return;
      const px = ME.x;
      if (r.t === 'road') {
        for (const c of r.cars) if (Math.abs(c.x - px) < c.len / 2 + BODY) { roadHit(r, c); return; }
      } else if (r.t === 'rail') {
        const t = r.train;
        if (t && Math.abs(t.x - px) < t.len / 2 + BODY) { railHit(r, t); return; }
      }
    }
    /* what a river swallows you into, in each country */
    const sinkHow = r => r.b === 'volcano' ? 'lava' : r.b === 'desert' && r.t === 'pads' ? 'sand' : 'water';
    const padAt = (r, x) => r.pads.find(q => q.c === Math.round(x / TILE) && !q.broken);
    const THIN_T = 1.35;                   // how long thin ice holds you

    /* -------------------------------------------------------- stepping --- */
    function update(dt) {
      if (ended) return;
      tAll += dt;
      FR = Math.round(-camY / TILE - 2.4);
      const sg = spec.on && spec.id ? ghost[spec.id] : null;
      FX = sg ? sg.x : ME.x;

      /* ---- the ending plays out while the world goes on, then the card ----
         In a race the others hear at once that you are out, and once the
         ending has played you watch whoever is still going (watch()); the
         card waits for the last of them. */
      if (ME.dead) {
        ME.deadT += dt;
        if (ONLINE && !outSaid) { outSaid = true; postMe(true); RACE.finish(score); }
        stepWorld(dt, true);
        ending(dt);
        weather(dt);
        if (PS) PS.step(dt);
        if (spec.on || endDue()) {
          if (ONLINE && !watch(dt)) return;
          finish();
        }
        return;
      }

      /* ---- lanes ---- */
      stepWorld(dt, true);

      /* ---- input ---- */
      const I = api.input;
      if (atMenu) { menuInput(I); if (unmounted) return; }
      else if (I.anyPressed('ArrowUp', 'KeyW')) tryHop(0, 1);
      else if (I.anyPressed('ArrowDown', 'KeyS')) tryHop(0, -1);
      else if (I.anyPressed('ArrowLeft', 'KeyA')) tryHop(-1, 0);
      else if (I.anyPressed('ArrowRight', 'KeyD')) tryHop(1, 0);
      else {
        const sw = I.takeSwipe();
        if (sw === 'up') tryHop(0, 1);
        else if (sw === 'down') tryHop(0, -1);
        else if (sw === 'left') tryHop(-1, 0);
        else if (sw === 'right') tryHop(1, 0);
        else if (I.takeClick()) tryHop(0, 1);
      }

      /* ---- the hop ---- */
      if (ME.hop) {
        const h = ME.hop;
        h.t += dt;
        const k = Math.min(1, h.t / HOP_T);
        ME.x = h.fx + (h.tx - h.fx) * k;
        ME.y = h.fy + (h.ty - h.fy) * k;
        ME.z = h.fz + (h.tz - h.fz) * k + Math.sin(k * Math.PI) * 52;
        if (k >= 1) {
          ME.x = h.tx; ME.y = h.ty; ME.z = h.tz; ME.row = h.row;
          ME.hop = null;
          ME.sqx = .78; ME.sqz = 1.24;      // the landing squash
          land();
        }
      } else if (ME.log) {
        /* carried (riding the log's bob), and over the side if the river
           takes it that far */
        ME.x = ME.log.x + ME.logOff;
        ME.z = LOG_TOP + ME.log.dz;
        if (ME.x < XMIN - TILE * .35 || ME.x > XMAX + TILE * .35) { die(sinkHow(rows[ME.row])); return; }
      } else {
        /* thin ice gives way under anyone who stands on it, cracking louder
           as it goes */
        const pr = rows[ME.row];
        if (pr && pr.t === 'pads' && pr.b === 'arctic') {
          const p = padAt(pr, ME.x);
          if (p && p.thin) {
            const was = Math.floor(p.crack * 3);
            p.crack = Math.min(1, p.crack + dt / THIN_T);
            if (p.crack >= 1) { p.broken = true; die('ice'); return; }
            if (Math.floor(p.crack * 3) > was) {
              try { Sound.crCrack(); } catch (e) {}
              if (PS) PS.burst({ x: ME.x, y: ME.y, z: WATER_Z + 6, n: 6, speed: 90, up: [40, 120], life: .35, size: 7,
                                 color: '#eaf8ff', grav: -900, drag: 1.5, shape: 1, spin: 8, floor: WATER_Z });
            }
          }
        }
      }
      ME.sqx += (1 - ME.sqx) * Math.min(1, dt * 16);
      ME.sqz += (1 - ME.sqz) * Math.min(1, dt * 16);
      if (ME.bumpT > 0) ME.bumpT = Math.max(0, ME.bumpT - dt);
      if (hint > 0) hint = Math.min(1, hint + dt * 1.5);

      /* the bird turns to face the way it went, the short way round */
      let da = ME.faceTo - ME.face;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      ME.face += da * Math.min(1, dt * 20);

      hitTest();
      if (ME.dead) return;

      /* ---- the line behind (it waits while the menu is up) ---- */
      if (!atMenu) {
        const creep = .42 + Math.min(1.25, score * .0065);
        edge += creep * dt;
        if (edge < maxRow - 6.2) edge = maxRow - 6.2;
        if (ME.row <= edge - .35) { die('eagle'); return; }
      }

      /* ---- camera ---- */
      const ty = rowY(ME.row) - TILE * (atMenu ? MENU_AHEAD : 2.4);
      /* On the menu the bird stands dead centre, under the title and over
         Play. The view is turned, so that takes a target off to one side:
         a point is centred when its offset from the target has nothing
         along the camera's right vector (cos yaw, sin yaw), which solves to
         this. It is exact at any pitch or distance. */
      const tx = atMenu ? ME.x + (ME.y - ty) * Math.tan(YAW) : ME.x * .30;
      if (!camSet) { camX = tx; camY = ty; camSet = true; }
      else {
        camX += (tx - camX) * Math.min(1, dt * 6.5);
        camY += (ty - camY) * Math.min(1, dt * 7.5);
      }
      camD += ((atMenu ? MENU_DIST : DIST) - camD) * Math.min(1, dt * 2.2);

      /* ---- the country underfoot: its name on the way in, and its air ---- */
      const here = biomeAt(ME.row);
      if (here !== zoneNow && !atMenu) { zoneNow = here; enterZone(here); }
      weather(dt);

      if (PS) PS.step(dt);
      if (ONLINE) { RACE.report(score, true, coins); postMe(false); }
      api.hud({ Steps: score, Coins: coins, Best: Math.max(best, score) });
    }

    /* Crossing into a new country: its name comes up on the screen with a
       little fanfare, the way a new world is announced. */
    function enterZone(b) {
      BANNER.t = 0; BANNER.b = b;
      try { Sound.crZone(); } catch (e) {}
    }
    /* The air in each country, a few flecks at a time around the camera:
       snow drifting down in the north, sand blown low across the dunes,
       sparks rising and ash falling over the magma fields. Each fleck is
       only made over ground of its own country, so a border stays a border. */
    let wxAcc = 0;
    function weather(dt) {
      if (!PS) return;
      wxAcc += dt * 50;
      while (wxAcc >= 1) {
        wxAcc--;
        const x = camX + (Math.random() - .5) * 2600, y = camY + 800 - Math.random() * 2500;
        const b = biomeAt(Math.max(0, Math.round(-y / TILE)));
        if (b === 'arctic') {
          PS.burst({ x, y, z: 260 + Math.random() * 300, n: 1, speed: 36, up: [-95, -65], life: 5.5, size: 5 + Math.random() * 5,
                     color: '#ffffff', grav: 0, drag: .15, shape: 1, spin: 3, floor: GRASS_Z + 1 });
        } else if (b === 'desert') {
          if (Math.random() < .5) PS.burst({ x, y, z: 4 + Math.random() * 34, n: 1, angle: 0, spread: .25, speed: 520, up: [0, 30], life: 1.3,
                                             size: 4 + Math.random() * 4, color: Math.random() < .5 ? '#f1d9a2' : '#e0bd7a', grav: -30, drag: .1, shape: 1, spin: 6 });
        } else if (b === 'volcano') {
          if (Math.random() < .55) PS.burst({ x, y, z: 6, n: 1, speed: 30, up: [70, 150], life: 2.4, size: 4 + Math.random() * 4,
                                              color: Math.random() < .6 ? '#ffae3a' : '#ff6a1f', grav: 20, drag: .4, shape: 1, spin: 5, add: true });
          else PS.burst({ x, y, z: 300 + Math.random() * 200, n: 1, speed: 30, up: [-70, -45], life: 5, size: 4 + Math.random() * 4,
                          color: '#8f8588', grav: 0, drag: .15, shape: 1, spin: 3, floor: GRASS_Z + 1, alpha: .85 });
        }
      }
      /* and the vents and the cones smoke */
      if (Math.random() < dt * 16) {
        const i = Math.round(-camY / TILE) + Math.floor(Math.random() * 22) - 6, r = rows[i];
        if (r && r.b === 'volcano' && r.t === 'grass') for (const tr of r.trees) {
          const cone = tr.edge && tr.h === 3 && Math.abs(tr.c) >= HALF + 3;
          if (!cone && !(tr.h === 0 && tr.p === 2)) continue;
          PS.burst({ x: tr.c * TILE, y: rowY(i), z: GRASS_Z + (cone ? 236 * tr.s * .9 : 44), n: 1, speed: 14, up: [40, 80], life: 2.6,
                     size: cone ? 46 : 20, color: '#5a5155', grav: 12, drag: .6, shape: 1, spin: 1, grow: cone ? 36 : 18, alpha: .55 });
        }
      }
    }

    function land() {
      const r = rowAt(ME.row);
      if (!r) return;
      if (ME.row > maxRow) {
        maxRow = ME.row; score = maxRow;
        if (score > 0 && score % 25 === 0) { try { Sound.pickup(); } catch (e) {} }
      }
      /* what a landing kicks up, in each country */
      const splashC = r.b === 'volcano' ? '#ffb13d' : '#ffffff';
      if (r.t === 'water') {
        const g = logAt(r, ME.x);
        if (g && g.croc && onJaws(r, g, ME.x)) {
          die('croc', null, { style: 'jaws', o: g, r, scale: 1, q: turned(ME.face), p: [ME.x, ME.y, ME.z + 40] });
          return;
        }
        if (g) {
          ME.log = g; ME.logOff = ME.x - g.x;
          /* the log takes the weight: it ducks and bobs back up */
          g.dv -= r.b === 'meadow' ? 260 : 220;
          try { if (r.b === 'arctic') Sound.crFloe(); else if (r.b === 'volcano') Sound.thud(); else Sound.crLog(); } catch (e) {}
          if (PS) PS.burst({ x: ME.x, y: ME.y, z: WATER_Z + 6, n: 12, speed: 130, up: [60, 170], life: .5, size: r.b === 'volcano' ? 7 : 11,
                             color: splashC, grav: -900, drag: 1.4, shape: 1, spin: 10, floor: WATER_Z, add: r.b === 'volcano' });
        } else { die(sinkHow(r)); return; }
      } else if (r.t === 'pads') {
        /* a pad is where it is: land square on one, or land in the river */
        const p = padAt(r, ME.x);
        if (!p) { die(sinkHow(r)); return; }
        ME.log = null;
        /* and it gives under the bird: a lily pad just to the surface, a
           stepping stone a little further */
        p.dv -= r.b === 'meadow' ? 80 : 170;
        if (r.b === 'meadow' || r.b === 'arctic') ripple(ME.x, ME.y, false);
        try { if (r.b === 'meadow') Sound.crPlop(); else if (r.b === 'arctic') Sound.crFloe(); else Sound.thud(); } catch (e) {}
        if (PS) PS.burst({ x: ME.x, y: ME.y, z: WATER_Z + 5, n: 12, speed: 120, up: [50, 150], life: .45, size: r.b === 'volcano' ? 7 : 11,
                           color: r.b === 'desert' ? '#e3bd7c' : splashC, grav: -900, drag: 1.4, shape: 1, spin: 10, floor: WATER_Z,
                           add: r.b === 'volcano' });
      } else {
        ME.log = null;
        try { Sound.thud(); } catch (e) {}
        if (PS && r.t === 'grass') {
          PS.burst({ x: ME.x, y: ME.y, z: GRASS_Z + 3, n: 7, speed: 110, up: [30, 90], life: .34, size: 9,
                     color: LAND_DUST[r.b], grav: -900, drag: 1.8, shape: 1, spin: 8, floor: GRASS_Z });
        } else if (PS) {
          /* a little grit off the road or the ballast */
          PS.burst({ x: ME.x, y: ME.y, z: 3, n: 5, speed: 90, up: [20, 70], life: .3, size: 7,
                     color: ROAD_DUST[r.b], grav: -900, drag: 2, shape: 1, spin: 8, floor: 0, alpha: .8 });
        }
      }
      /* a coin on the tile it landed on */
      if (r.t === 'grass' && r.coin && !r.coin.got && r.coin.c === Math.round(ME.x / TILE)) {
        r.coin.got = true; coins++;
        try { Sound.coin(); } catch (e) {}
        if (PS) PS.burst({ x: ME.x, y: ME.y, z: GRASS_Z + 40, n: 14, speed: 150, up: [110, 240],
                           life: .5, size: 11, color: '#ffd86b', grav: -700, drag: 1.2, shape: 1, spin: 12, add: true });
      }
      hitTest();
    }

    /* A row, an x and a facing is the whole of what a rival needs to draw
       this bird, and nobody is authoritative over anyone else's run. The
       spot is where the bird is going to be standing — mid-hop, where it
       lands — and `h` counts the hops, sent the moment each one starts, so
       the other screens play the hop itself (the arc, the squash) rather
       than easing a bird along the ground between samples. On a log the
       spot moves, so it goes eight times a second; standing still, only
       often enough to say the bird is still there. */
    let hopN = 0;
    function postMe(force) {
      if (!ONLINE) return;
      const h = ME.hop;
      const o = { r: h ? h.row : ME.row, x: Math.round(h ? h.tx : ME.x), z: Math.round(h ? h.tz : ME.z),
                  f: Math.round(ME.faceTo * 100) / 100, d: ME.dead ? 1 : 0, h: hopN };
      /* and where a hop set off from, which is where the one before it landed:
         a screen that missed that one can still play it */
      if (h) { o.fr = ME.row; o.fx = Math.round(h.fx); o.fz = Math.round(h.fz); }
      RACE.post(o, force, ME.log ? 110 : 450);
    }

    /* The card's words for each ending: the verdict, a line under it, and
       the word the results page stamps across the top. */
    const ENDS = {
      car:     ['Flattened', 'The gap was there a moment ago.', 'SPLAT!'],
      train:   ['Hit by the train', 'The lights were flashing.', 'WHAM!'],
      water:   ['Drowned', 'Nothing was floating past.', 'SPLASH!'],
      eagle:   ['The eagle got you', 'Standing still is its own kind of mistake.', 'SNATCHED!'],
      worm:    ['Eaten by the sandworm', 'The ground was shaking for a reason.', 'CHOMP!'],
      croc:    ['Snapped up', 'That one was not a log.', 'SNAP!'],
      sand:    ['Swallowed by quicksand', 'Only the stones hold you up.', 'GLUG!'],
      ice:     ['Fell through the ice', 'Thin ice does not wait for anyone.', 'CRACK!'],
      lava:    ['Burnt to a crisp', 'Nothing floats in lava for long.', 'SIZZLE!'],
      surge:   ['Caught by the lava', 'The channel was glowing.', 'SIZZLE!'],
      bobsled: ['Run down by a bobsled', 'The start gate was beeping.', 'WHOOSH!']
    };
    /* and on a road, what it was: [verdict, stamp] by country and kind */
    const ROAD_ENDS = {
      meadow:  [['Flattened', 'SPLAT!'], ['Flattened by a lorry', 'SPLAT!'], ['Flattened by a bus', 'SPLAT!'], ['Flattened', 'SPLAT!']],
      desert:  [['Flattened by a pickup', 'SPLAT!'], ['Flattened by a camper van', 'SPLAT!'], ['Run over by a dune buggy', 'SPLAT!'],
                ['Trampled by camels', 'STOMP!'], ['Tumbleweeded', 'BONK!']],
      arctic:  [['Ploughed under', 'SPLAT!'], ['Run over by a snowmobile', 'SPLAT!'], ['Run over by huskies', 'WOOF!'],
                ['Bowled over by penguins', 'BONK!'], ['Swatted by a polar bear', 'SWAT!']],
      volcano: [['Flattened by a haul truck', 'SPLAT!'], ['Crushed by a boulder', 'CRUNCH!'], ['Crushed by a boulder', 'CRUNCH!'],
                ['Flattened by a magma tanker', 'SPLAT!']]
    };
    const BIOME_TITLE = { meadow: 'Green Meadows', desert: 'The Dunes', arctic: 'Frostbite Pass', volcano: 'Magma Fields' };
    const LAND_DUST = { meadow: '#d9f2a6', desert: '#f0d79c', arctic: '#ffffff', volcano: '#8a8084' };
    function finish() {
      if (ended) return;
      ended = true;
      if (ONLINE && !outSaid) { outSaid = true; postMe(true); RACE.finish(score); }
      const how = ME.dead;
      const e = ENDS[how] || ENDS.eagle;
      let title = e[0], stamp = e[2], msg = e[1];
      const way = killer && killer.way, stuck = dth && dth.style === 'stuck' && dth.shape === 'side';
      if (how === 'car' && killer) {
        const q = (ROAD_ENDS[killer.b] || ROAD_ENDS.meadow)[killer.kind];
        if (q) { title = q[0]; stamp = q[1]; }
        /* on it rather than under it */
        if (stuck) { title = 'Splatted on ' + VEH_NAME[killer.b][killer.kind]; msg = 'It was already there when you landed.'; stamp = 'SPLAT!'; }
      } else if (how === 'train' && way && way !== 'front') { title = 'Hopped into a train'; msg = 'It was already going past.'; }
      else if (how === 'worm' && dth && dth.style !== 'mouth') { title = 'Tossed by the sandworm'; stamp = 'WHUMP!'; }
      const far = biomeAt(maxRow);
      api.gameOver({
        score,
        title: ONLINE ? raceTitle(RACE, title) : title,
        message: msg,
        stamp, biome: far, how,
        stats: [{ label: 'Coins', value: fmt(coins) }, { label: 'Reached', value: BIOME_TITLE[far] }].concat(ONLINE ? raceStats(RACE, score) : [])
      });
    }

    /* =================================================== the picture ===== */
    /* One scope owns every mesh the round builds, and one dispose() at the end
       gives the lot back to the shared context. */
    const S = R3 ? R3.scope() : null;
    const PS = R3 ? Gfx3D.particles(1000) : null;
    const cam = R3 ? Gfx3D.camera(W, H) : null;
    const T = M4.make();

    /* Steep and far, with a narrow lens, and turned the way the original is:
       the lanes run down to the right, the light comes from the top left and
       every shadow falls toward you and to the right. A wide lens near the
       ground makes the front row enormous and squashes everything past it
       into a band — you cannot read a gap four lanes ahead, which is the whole
       game. Pulling back and closing the lens down flattens the view toward the
       isometric this genre is drawn in, where the tenth row reads as clearly
       as the first. */
    const PITCH = .98, YAW = -.34, DIST = 3150;
    const BIRD_S = 1.28;

    /* ------------------------------------------------- the front page ---
       Everything the title screen draws sits over the live scene in the
       same chunky outlined pixel letters as the score. Its motion runs on
       the render clock: update() is a fixed step, and a tween advanced there
       judders on any screen that is not a multiple of it. */
    const MENU_AHEAD = 1.3;                 // how far past the bird the menu camera looks, in tiles
    let camD = atMenu ? MENU_DIST : DIST;
    let rLast = 0, rDt = 0, mT = 0, outT = atMenu ? -1 : 1e9, swapT = 9, swapDir = 1;
    const MH = {};                          // hover glides and press springs, by name
    let hitsM = [], curWas = '';
    const INK = '#111317';
    const MB = { z: 0, spin: 0, sx: 1, sz: 1 };
    const bOut = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
    function menuClock() {
      const n = performance.now() / 1000;
      rDt = rLast ? Math.min(.1, n - rLast) : 0;
      rLast = n;
      mT += rDt; swapT += rDt;
      if (!atMenu && outT < 0) outT = 0;
      if (outT >= 0 && outT < 1e8) outT += rDt;
    }
    /* 0 while the menu is up, rising to 1 as it leaves */
    const menuOut = () => outT < 0 ? 0 : Math.min(1, outT / .5);
    function glideM(k, to, rate) {
      const s = MH[k] || (MH[k] = { x: to, v: 0 });
      s.x += (to - s.x) * (1 - Math.exp(-rate * rDt));
      return s.x;
    }
    function springM(k, to, stiff, damp) {
      const s = MH[k] || (MH[k] = { x: to, v: 0 });
      let t = rDt;
      while (t > 1e-6) { const h = Math.min(t, 1 / 240); s.v += ((to - s.x) * stiff - s.v * damp) * h; s.x += s.v * h; t -= h; }
      return s.x;
    }
    const kickM = (k, v) => { const s = MH[k] || (MH[k] = { x: 0, v: 0 }); s.v += v; };
    function hovered(x, y, w, h) {
      const p = api.input.pointer;
      return p.inside && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    }

    /* The name, as letters cut from blocks: a face, the depth under it and a
       black edge round both. Each is drawn once into a small image at the
       screen's own resolution and then placed between pixels, so the hops
       glide instead of stepping a whole pixel at a time. */
    const TITLE = [['CROSSY', '#ffffff', '#aebbc8'], ['ROAD', '#ffd43a', '#d99a14']];
    const TPX = 9;
    let titleCache = null;
    function titleGlyphs() {
      const sc = Math.max(1, Stage.scale * Stage.dpr), key = sc.toFixed(3);
      if (titleCache && titleCache.key === key) return titleCache;
      const px = TPX, t = px, D = Math.round(px * 1.35);
      const cw = 6 * px + 2 * t, ch = 8 * px + D + 2 * t;
      const rows = TITLE.map(([word, face, side]) => [...word].map(c => {
        const img = document.createElement('canvas');
        img.width = Math.ceil(cw * sc); img.height = Math.ceil(ch * sc);
        const g = img.getContext('2d');
        g.scale(img.width / cw, img.height / ch);
        const o = { thick: true, crisp: true, fill: INK };
        for (let dy = -t; dy <= D + t; dy += 3) for (const dx of [-t, 0, t]) Hud.pix(g, c, t + dx, t + dy, px, o);
        o.fill = side;
        for (let dy = D; dy >= 1; dy--) Hud.pix(g, c, t, t + dy, px, o);
        o.fill = face;
        Hud.pix(g, c, t, t, px, o);
        return img;
      }));
      return (titleCache = { key, rows, cw, ch, t, px, D });
    }
    function drawTitle(ctx) {
      const G = titleGlyphs(), step = 7 * G.px;
      let j = 0;
      G.rows.forEach((row, ri) => {
        const inkW = (row.length * 7 - 1) * G.px;
        const top = 34 + ri * (8 * G.px + G.D + 14);
        row.forEach((img, i) => {
          const n = j++;
          /* in: dropped onto its spot, left to right, landing with a squash */
          const ti = mT - .1 - n * .07, fall = .34;
          if (ti <= 0) return;
          let dy = 0, sy = 1;
          if (ti < fall) { const k = ti / fall; dy = -(1 - k * k) * 300; }
          else if (ti - fall < .2) sy = 1 - Math.sin((ti - fall) / .2 * Math.PI) * .2;
          /* then every few seconds a hop runs along the word, like a bird crossing it */
          const cyc = mT - 1.9 - n * .07;
          if (cyc > 0) {
            const c = cyc % 3.6;
            if (c < .3) dy -= Math.sin(c / .3 * Math.PI) * 17;
            else if (c < .46) sy *= 1 - Math.sin((c - .3) / .16 * Math.PI) * .12;
          }
          /* out: each one flung up and away */
          let a = 1;
          if (outT >= 0) {
            const k = clamp((outT - n * .025) / .38, 0, 1);
            dy -= k * k * 340; a = 1 - k;
            if (a <= 0) return;
          }
          const cx = W / 2 - inkW / 2 + i * step - G.t + G.cw / 2, base = top + G.ch;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          if (a < 1) ctx.globalAlpha *= a;
          ctx.translate(cx, base + dy);
          ctx.scale(1 + (1 - sy) * .7, sy);
          ctx.drawImage(img, -G.cw / 2, -G.ch, G.cw, G.ch);
          ctx.restore();
        });
      });
    }

    /* A button cut from a block like the letters: a face, the depth under
       it and a black edge. It rises under the pointer and sinks when pressed. */
    function block(ctx, k, x, y, w, h, o) {
      const live = !!o.hot && atMenu;
      const hv = glideM('h' + k, live && hovered(x - 3, y - 8, w + 6, h + 14) ? 1 : 0, 16);
      drawBlock(ctx, x, y, w, h, hv, springM('p' + k, 0, 700, 30), o);
      if (live) hitsM.push({ k, x: x - 3, y: y - 8, w: w + 6, h: h + (o.depth || 8) + 11 });
    }
    /* the block itself, raised by `hv` and pressed by `pr` — the front page's
       buttons, and every panel and button on the results */
    function drawBlock(ctx, x, y, w, h, hv, pr, o) {
      const D = o.depth || 8;
      const lift = Math.max(1 - D, 2 + hv * 3 + pr);
      const s = o.s === undefined ? 1 : o.s;
      if (s <= .01) return 0;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.fillStyle = INK; ctx.fillRect(x - 3, y - lift - 3, w + 6, h + D + lift + 6);
      ctx.fillStyle = o.side; ctx.fillRect(x, y + h - lift, w, D + lift);
      ctx.fillStyle = o.face; ctx.fillRect(x, y - lift, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y - lift, w, 3);
      ctx.translate(0, -lift);
      if (o.label) {
        const lab = { thick: true, crisp: true, align: 'center', baseline: 'middle', fill: o.ink || '#ffffff' };
        if (o.edge !== false) lab.outline = INK;
        Hud.pix(ctx, o.label, x + w / 2, y + h / 2 + (o.sub ? -8 : 0), o.px || 4, lab);
        if (o.sub) Hud.pix(ctx, o.sub, x + w / 2, y + h / 2 + 16, 2, { crisp: true, align: 'center', baseline: 'middle', fill: o.subInk || '#ffffff' });
      }
      ctx.restore();
      return lift;
    }

    /* the bird on the front page: a breath, now and then a hop on the spot,
       and a hop round when it is swapped for another */
    function menuBird() {
      const r = MB; r.z = 0; r.spin = 0; r.sx = 1; r.sz = 1;
      if (swapT < .34) {
        const k = swapT / .34;
        r.z = Math.sin(k * Math.PI) * 66;
        r.spin = swapDir * (k < .5 ? 2 * k * k : 1 - Math.pow(2 - 2 * k, 2) / 2) * TAU;
      } else if (swapT < .52) {
        const q = Math.sin((swapT - .34) / .18 * Math.PI) * .22;
        r.sz = 1 - q; r.sx = 1 + q * .55;
      }
      if (atMenu) {
        const b = Math.sin(mT * 3.1);
        r.sz *= 1 + b * .03; r.sx *= 1 - b * .015;
        const c = mT % 3.8 - 2.7;
        if (c > 0 && c < .24 && swapT > .6) r.z += Math.sin(c / .24 * Math.PI) * 20;
      }
      return r;
    }

    function drawMenu(ctx) {
      hitsM = [];
      const out = menuOut(), eo = out * out;
      const P = api.party;
      drawTitle(ctx);

      /* the bird is framed at the centre line (see the camera in update());
         only its height on screen is read back, for the things around it */
      const bx = W / 2;
      let by = H * .7;
      if (cam) { const s = cam.toScreen(ME.x, ME.y, GRASS_Z); if (s.w > 0) by = s.y; }
      const pop = d => bOut(clamp((mT - d) / .42, 0, 1));
      const fade = d => clamp((mT - d) / .3, 0, 1);
      if (atMenu) hitsM.push({ k: 'bird', x: bx - 62, y: by - 130, w: 124, h: 136 });

      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(0, eo * 36);

      /* the birds either side of this one */
      const ay = by - 64, aw = 52, ah = 46;
      block(ctx, 'prev', bx - 128 - aw / 2, ay, aw, ah, { face: '#ffffff', side: '#a9b5c1', label: '<', ink: INK, edge: false, px: 4, hot: true, s: pop(.5) });
      block(ctx, 'next', bx + 128 - aw / 2, ay, aw, ah, { face: '#ffffff', side: '#a9b5c1', label: '>', ink: INK, edge: false, px: 4, hot: true, s: pop(.56) });

      /* its name, popping each time it changes */
      const nk = fade(.62), ns = swapT < .3 ? 1 + Math.sin(swapT / .3 * Math.PI) * .16 : 1;
      ctx.save(); ctx.globalAlpha *= nk;
      ctx.translate(bx, by + 40); ctx.scale(ns, ns);
      Hud.pix(ctx, birdId.toUpperCase(), 0, 0, 4, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK,
        shadow: 'rgba(0,0,0,.3)', shadowY: 1.2 });
      ctx.restore();
      FK.layer(ctx, nk, c => Hud.pix(c, BIRD_INFO[birdId], bx, by + 72, 2, { crisp: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK, ow: .6 }));

      /* Play; in a party, the host's start or a guest's wait. One word each:
         the party's size is already on the button in the corner. */
      let label = 'PLAY', face = '#ff9f1c', side = '#c56806', hot = true;
      if (P.inRoom && P.isHost) label = 'START';
      else if (P.inRoom) { label = 'WAITING'; face = '#b9c1ca'; side = '#848e99'; hot = false; }
      const pw = 264, ph = 60, pk = clamp((mT - .7) / .45, 0, 1);
      block(ctx, 'play', W / 2 - pw / 2, 512 + (1 - bOut(pk)) * 100, pw, ph, { face, side, label, px: 5, hot, depth: 9 });
      ctx.restore();

      /* the way to friends, and the keys */
      const ck = (1 - out) * fade(.85);
      if (ck > 0) {
        ctx.save(); ctx.globalAlpha *= ck;
        block(ctx, 'party', W - 26 - 188, 26, 188, 42, { face: '#3aa0ff', side: '#1c68bd', label: P.inRoom ? 'PARTY ' + P.size : 'FRIENDS', px: 3, hot: true });
        Hud.pix(ctx, '< > BIRD', 26, H - 26, 2, { crisp: true, baseline: 'middle', fill: '#ffffff', outline: INK, ow: .6 });
        Hud.pix(ctx, 'ESC HUB', W - 26, H - 26, 2, { crisp: true, align: 'right', baseline: 'middle', fill: '#ffffff', outline: INK, ow: .6 });
        ctx.restore();
      }

      const p = api.input.pointer;
      const want = atMenu && p.inside && !api.covered && hitsM.some(r => r.k !== 'bird' && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) ? 'pointer' : '';
      if (want !== curWas) { curWas = want; try { cv.style.cursor = want; } catch (e) {} }
    }

    function menuHit(x, y) {
      for (let i = hitsM.length - 1; i >= 0; i--) {
        const r = hitsM[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.k;
      }
      return '';
    }
    function menuInput(I) {
      /* the party list can be open over the menu; what is typed there is not for us */
      if (api.covered) { while (I.takeClick()) {} I.takeSwipe(); return; }
      let c;
      while ((c = I.takeClick())) {
        if (c.btn) continue;
        const k = menuHit(c.x, c.y);
        if (k === 'play') { kickM('pplay', -40); beginRun(false); return; }
        if (k === 'prev') { kickM('pprev', -40); swapBird(-1); }
        else if (k === 'next' || k === 'bird') { kickM('pnext', -40); swapBird(1); }
        else if (k === 'party') { kickM('pparty', -40); try { Sound.blip(); } catch (e) {} api.openParty(); }
      }
      const sw = I.takeSwipe();
      if (I.anyPressed('ArrowLeft', 'KeyA') || sw === 'left') { kickM('pprev', -40); swapBird(-1); }
      else if (I.anyPressed('ArrowRight', 'KeyD') || sw === 'right') { kickM('pnext', -40); swapBird(1); }
      else if (I.anyPressed('ArrowUp', 'KeyW') || sw === 'up') beginRun(true);
      else if (I.anyPressed('Space', 'Enter', 'NumpadEnter')) { kickM('pplay', -40); beginRun(false); }
    }
    function swapBird(d) {
      const i = (BIRD_IDS.indexOf(birdId) + d + BIRD_IDS.length) % BIRD_IDS.length;
      birdId = BIRD_IDS[i]; BIRD = BIRDS[birdId];
      api.setOpt('bird', birdId);
      if (MAT) { const b = MAT.bird[birdId]; MAT.birdBody = b.body; MAT.birdTrim = b.trim; MAT.birdBeak = b.beak; }
      swapT = 0; swapDir = d;
      try { Sound.place(); } catch (e) {}
      if (PS) {
        PS.burst({ x: ME.x, y: ME.y, z: GRASS_Z + 30, n: 16, speed: 190, up: [140, 300], life: .6, size: 12,
                   color: BIRD.body, grav: -900, drag: 1.1, shape: 1, spin: 10, floor: GRASS_Z });
        PS.burst({ x: ME.x, y: ME.y, z: GRASS_Z + 30, n: 7, speed: 150, up: [120, 260], life: .55, size: 10,
                   color: BIRD.trim, grav: -900, drag: 1.1, shape: 1, spin: 10, floor: GRASS_Z });
      }
    }
    /* Play. The title hops off, the bird turns to the road, the camera
       settles back, and the eagle starts keeping time. ↑ starts with a hop. */
    function beginRun(hop) {
      if (!atMenu) return;
      if (!api.play()) return;             // in a party the host has just started the race instead
      atMenu = false;
      ME.faceTo = 0;
      try { Sound.jump(); } catch (e) {}
      if (hop) tryHop(0, 1);
    }
    const SUN = Gfx3D.norm([-.50, -.30, .81]);

    /* Flat, bright and shadowed, like the game this is a tribute to: a white
       sun over a strong sky fill, and no fog, sky dome, vignette or gloss —
       each of those is a camera being realistic, and this world is toys. */
    const env = {
      sun: SUN, sunC: L('#ffffff', .86), sunSpec: 0,
      sky: L('#e6f2ff', .60), gnd: L('#c2cfb0', .42),
      rim: [0, 0, 0], fill: L('#ffffff', .06),
      fogC: L('#a8dc5e', 1), fog: [1e5, 2e5],
      expo: 1, vig: 0,
      clear: [.66, .86, .37],
      shadow: { x: 0, y: 0, z: 0, r: 1000 }
    };
    /* The renderer lights in linear light and tone-maps on the way out, so a
       colour picked by eye comes out paler and flatter than it went in —
       which is most of why this used to look like a photograph of the game
       rather than the game. paint() runs the pipeline backwards for a lit
       top face: give it the colour that should be SEEN on top of a block and
       it returns what the block has to be. The sides then fall out of the
       lighting a step darker each, and that is the whole voxel look. */
    const WRAP = .18;
    const TOPK = (() => {
      const d0 = clamp((SUN[2] + WRAP) / (1 + WRAP), 0, 1), d = d0 * d0 * (3 - 2 * d0), nv = Math.sin(PITCH);
      return [0, 1, 2].map(k => env.sky[k] + env.sunC[k] * d + env.fill[k] * nv);
    })();
    function acesInv(y) {
      y = Math.min(Math.max(y, 1e-5), .9);
      const a = 2.43 * y - 2.51, b = .59 * y - .03, c = .14 * y;
      return (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    }
    const paint = (hex, ao) => {
      const t = L(hex);
      return Gfx3D.withAo([0, 1, 2].map(k => acesInv(t[k]) / (env.expo * TOPK[k])), ao === undefined ? 1 : ao);
    };
    const DQ = [0, 0, 0, 1];                 // the bird's turn while it dives

    /* a cylinder lying along local x, so one unit mesh scaled by place() is a
       log of any length and a coin of any size — place() only spins about z,
       which is what a rolling log and a spinning coin both want */
    /* a flat top face, normal up */
    function plate(g, x0, y0, x1, y1, z, c) {
      g.face([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], c, [(x0 + x1) / 2, (y0 + y1) / 2, z - 40]);
    }

    let MESH = null, MAT = null;
    if (R3) {
      /* The palette, as each colour should look on the lit top of a block —
         see paint(). Lifted from the original: lime grass in two shades a row,
         blue-grey tarmac, pale cyan water, reddish logs, lavender rocks and
         trees that are just tall green blocks. */
      const C = {
        grassA: paint('#aadf66'), grassB: paint('#a0d85c'),
        road: paint('#5e616d'), mark: paint('#eceef2'),
        water: paint('#6cd3f6'), ripple: paint('#9ae4fb'), foam: paint('#ffffff'),
        ballast: paint('#7f7a8c'), ballastTop: paint('#8c879a'), tie: paint('#6f4d3d'), rail: paint('#cfd0da'),
        trunk: paint('#6f4a38'),
        rock: paint('#a39db8'), rockTop: paint('#b6b1ca'),
        log: paint('#8e5847'), logDark: paint('#7a4a3c'), logEnd: paint('#b07a5f'),
        padA: paint('#5dbb4b'), padB: paint('#6fcb58'), padRim: paint('#3f9a3b'), vein: paint('#8fdb74'),
        petal: paint('#ff9fc6'), petal2: paint('#ffd6e7'), pollen: paint('#ffd84a'),
        white: [1, 1, 1, 1],
        cabin: paint('#f4f5f8'), glass: paint('#24262e'), tyre: paint('#2d2d34'), hub: paint('#a2a3ae'),
        head: paint('#fff4bd'), tail: paint('#ea463d'), grille: paint('#34363f'), stripe: paint('#ffd84a'),
        coin: paint('#ffd43a'), coinEdge: paint('#eaa821'), coinC: paint('#e3392f'),
        post: paint('#2b2b33'), postW: paint('#f3f3f5'), postR: paint('#e23c34'),
        eye: paint('#1b1c22', .6), eagle: paint('#5a4632'), eagleWing: paint('#6b5540'), talon: paint('#f0b642')
      };
      const g0 = () => Geo();
      const M = {};
      /* Every block here has square edges. Bevels are what made the old set
         look carved rather than built — the original is all hard corners, and
         the lighting alone tells one face from the next. */
      const B = (g, x0, y0, z0, x1, y1, z1, c) => g.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), c, 0);

      /* ---- the ground: one block per row, its top in the row's colour and
         its front showing where it stands proud of the row behind ---- */
      M.grass = [C.grassA, C.grassB].map(c => { const g = g0(); B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, GRASS_Z, c); return S.mesh(g); });
      let g = g0(); B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, 0, C.road);
      M.road = S.mesh(g);
      /* long thin dashes between lanes, as painted as they are in the original */
      g = g0();
      for (let x = -VERGE + 20; x < VERGE; x += 112) B(g, x, -3.5, 0, x + 60, 3.5, .9, C.mark);
      M.dash = S.mesh(g);
      g = g0(); B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, WATER_Z, C.water);
      M.water = S.mesh(g);
      /* ripples: short pale strokes, laid out once from a fixed stream so every
         river wears the same marks, and slid along with its current */
      g = g0();
      {
        let rh = 20250920;
        const rq = () => (rh = (rh * 48271) % 2147483647) / 2147483647;
        for (let x = -VERGE - 160; x < VERGE + 160; x += 152) {
          const yy = (rq() - .5) * (TILE - 48), w2 = 16 + rq() * 12;
          plate(g, x, yy - 2.5, x + w2, yy + 2.5, WATER_Z + 1.2, C.ripple);
          if (rq() < .5) plate(g, x + w2 + 9, yy - 2.5, x + w2 * 1.6 + 9, yy + 2.5, WATER_Z + 1.2, C.ripple);
        }
      }
      M.ripple = S.mesh(g);
      /* where a river meets the far bank, a scalloped lip of white foam */
      g = g0();
      {
        plate(g, -VERGE, -TILE / 2, VERGE, -TILE / 2 + 6, WATER_Z + .9, C.foam);
        let rh = 777;
        const rq = () => (rh = (rh * 48271) % 2147483647) / 2147483647;
        for (let x = -VERGE + 10; x < VERGE - 40; x += 30 + rq() * 34) plate(g, x, -TILE / 2 + 6, x + 14 + rq() * 20, -TILE / 2 + 9 + rq() * 6, WATER_Z + .9, C.foam);
      }
      M.foamEdge = S.mesh(g);
      /* the splash's ring on the surface: a flat annulus, scaled as it spreads */
      g = g0();
      {
        const seg = 28;
        for (let i = 0; i < seg; i++) {
          const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
          g.face([[Math.cos(a0) * .78, Math.sin(a0) * .78, 0], [Math.cos(a0), Math.sin(a0), 0], [Math.cos(a1), Math.sin(a1), 0], [Math.cos(a1) * .78, Math.sin(a1) * .78, 0]], C.foam, [0, 0, -1]);
        }
      }
      M.ring = S.mesh(g);

      /* ---- the railway ---- */
      g = g0(); B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, 0, C.ballast);
      M.railBody = S.mesh(g);
      g = g0(); B(g, -VERGE, -42, 0, VERGE, 42, 4, C.ballastTop);
      M.railBed = S.mesh(g);
      g = g0();
      for (let x = -VERGE + 16; x < VERGE; x += 50) B(g, x, -36, 4, x + 22, 36, 10, C.tie);
      M.sleepers = S.mesh(g);
      g = g0();
      for (const y of [-21, 21]) B(g, -VERGE, y - 4, 10, VERGE, y + 4, 19, C.rail);
      M.rails = S.mesh(g);
      /* the signal at each verge: a striped pole under a black lamp board; the
         two lamps on a board are separate meshes so they can take turns */
      const SX = HALF * TILE + 70;
      g = g0();
      for (const sx of [-1, 1]) {
        const x = sx * SX;
        B(g, x - 15, -15, 0, x + 15, 15, 10.6, C.post);              // clear of the sleepers' tops
        for (let k = 0; k < 6; k++) B(g, x - 6, -6, 10 + k * 22, x + 6, 6, 32 + k * 22, k & 1 ? C.postR : C.postW);
        B(g, x - 28, -9, 142, x + 28, 9, 180, C.post);
      }
      M.signalPost = S.mesh(g);
      for (const [name, o] of [['lampA', -13], ['lampB', 13]]) {
        g = g0();
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) B(g, sx * SX + o - 9, sy * 9, 151, sx * SX + o + 9, sy * 12.5, 171, C.white);
        M[name] = S.mesh(g);
      }
      /* little red lamps along the edge of the bed, every two tiles: the
         warning for a player watching the middle of the screen */
      g = g0();
      for (let x = -VERGE + 100; x < VERGE; x += 200) for (const sy of [-1, 1]) B(g, x - 8, sy * 46 - 3.5, 0, x + 8, sy * 46 + 3.5, 8, C.white);
      M.trackLights = S.mesh(g);

      /* ---- trees and rocks ----
         A tree is a trunk under a tall green block, in three heights; the
         block is white so each tree's material can colour it */
      g = g0(); B(g, -12, -12, 0, 12, 12, 30, C.trunk);
      M.trunk = S.mesh(g);
      M.tree = [null];
      for (const top of [104, 158, 214]) { g = g0(); B(g, -36, -36, 24, 36, 36, top, C.white); M.tree.push(S.mesh(g)); }
      g = g0();
      B(g, -38, -32, 0, 38, 32, 30, C.rock);
      B(g, -24, -22, 30, 26, 22, 48, C.rockTop);
      M.rock = S.mesh(g);

      /* ---- traffic, built facing +x ----
         Body and trim are separate meshes because the body is tinted per car
         and the cabin, glass, tyres and lamps must not be. Every car wears the
         original's white cabin with black windows over a coloured body. */
      const carBody = [], carTrim = [];
      /* `out` is how far the tyre stands out from the middle: it must not end
         flush with the body's side, or the two fight over the same plane and
         the wheels flicker */
      const wheels = (t, xs, hw, h, out) => { for (const sx of xs) for (const sy of [-1, 1]) B(t, sx - hw, sy * 25, 0, sx + hw, sy * (out || 36), h, C.tyre); };
      const lamps = (t, xf, xr, z0, z1, w) => {
        for (const sy of [-1, 1]) {
          B(t, xf - 2.5, sy * (w - 16), z0, xf + 2.5, sy * (w - 3), z1, C.head);
          B(t, xr - 2.5, sy * (w - 16), z0, xr + 2.5, sy * (w - 3), z1, C.tail);
        }
      };
      {   /* hatchback */
        const b = g0(), t = g0();
        B(b, -74, -33, 10, 74, 33, 40, C.white);
        B(t, -40, -29, 40, 30, 29, 70, C.cabin);
        B(t, 29, -25, 45, 32, 25, 65, C.glass);
        B(t, -43, -25, 45, -40, 25, 65, C.glass);
        for (const sy of [-1, 1]) B(t, -34, sy * 28.6, 45, 24, sy * 30.4, 65, C.glass);
        wheels(t, [-46, 46], 13, 22);
        lamps(t, 74, -74, 22, 32, 33);
        carBody.push(S.mesh(b)); carTrim.push(S.mesh(t));
      }
      {   /* lorry: a coloured cab pulling a white box */
        const b = g0(), t = g0();
        B(b, 64, -34, 10, 125, 34, 74, C.white);
        B(t, -125, -38, 14, 58, 38, 116, C.cabin);
        B(t, 58, -30, 14, 64, 30, 62, C.grille);
        B(t, 124, -27, 46, 127, 27, 66, C.glass);
        for (const sy of [-1, 1]) B(t, 82, sy * 33.6, 46, 116, sy * 35.4, 66, C.glass);
        wheels(t, [-98, -42, 98], 14, 24);
        lamps(t, 125, -125, 22, 34, 34);
        carBody.push(S.mesh(b)); carTrim.push(S.mesh(t));
      }
      {   /* bus: long, a white roof, a row of windows down each side */
        const b = g0(), t = g0();
        B(b, -148, -36, 12, 148, 36, 94, C.white);
        B(t, -146, -34, 94, 146, 34, 104, C.cabin);
        for (const sy of [-1, 1]) for (let x = -130; x < 126; x += 46) B(t, x, sy * 35.6, 50, x + 34, sy * 37.4, 82, C.glass);
        B(t, 147, -30, 50, 150, 30, 86, C.glass);
        B(t, -150, -30, 50, -147, 30, 86, C.glass);
        wheels(t, [-104, 100], 15, 26, 38.5);             // the body is 36 wide: the tyres stand proud of it
        lamps(t, 148, -148, 20, 32, 36);
        carBody.push(S.mesh(b)); carTrim.push(S.mesh(t));
      }
      {   /* sports car: low, a small cabin set back, a wing */
        const b = g0(), t = g0();
        B(b, -78, -34, 8, 78, 34, 32, C.white);
        B(b, -80, -32, 44, -64, 32, 50, C.white);
        B(t, -38, -27, 32, 16, 27, 54, C.cabin);
        B(t, 15, -23, 36, 18, 23, 51, C.glass);
        B(t, -41, -23, 36, -38, 23, 51, C.glass);
        for (const sy of [-1, 1]) B(t, -32, sy * 26.6, 36, 10, sy * 28.4, 51, C.glass);
        for (const sy of [-1, 1]) B(t, -74, sy * 22, 32, -70, sy * 26, 44, C.grille);
        wheels(t, [-50, 50], 13, 20);
        lamps(t, 78, -78, 18, 26, 34);
        carBody.push(S.mesh(b)); carTrim.push(S.mesh(t));
      }
      M.carBody = carBody; M.carTrim = carTrim;

      /* ---- the train: a locomotive and carriages, built facing +x ---- */
      g = g0();
      B(g, -LOCO_LEN / 2, -40, 18, LOCO_LEN / 2 - 52, 40, 110, C.white);
      B(g, LOCO_LEN / 2 - 60, -40, 18, LOCO_LEN / 2, 40, 76, C.white);
      B(g, LOCO_LEN / 2 - 132, -38, 110, LOCO_LEN / 2 - 56, 38, 140, C.white);
      M.locoBody = S.mesh(g);
      g = g0();
      B(g, -LOCO_LEN / 2 - 1.5, -41.5, 56, LOCO_LEN / 2 - 52.5, 41.5, 68, C.stripe);
      B(g, LOCO_LEN / 2 - 59.5, -41.5, 50, LOCO_LEN / 2 + 1.5, 41.5, 60, C.stripe);
      for (const sy of [-1, 1]) B(g, LOCO_LEN / 2 - 124, sy * 39, 78, LOCO_LEN / 2 - 66, sy * 41.6, 102, C.glass);
      B(g, LOCO_LEN / 2 - 62, -34, 80, LOCO_LEN / 2 - 55, 34, 134, C.glass);
      B(g, LOCO_LEN / 2 - 2, -12, 30, LOCO_LEN / 2 + 4, 12, 44, C.head);
      B(g, LOCO_LEN / 2 - 2, -30, 22, LOCO_LEN / 2 + 3, 30, 28, C.grille);
      for (const bx of [-LOCO_LEN / 2 + 58, LOCO_LEN / 2 - 64]) for (const sy of [-1, 1]) for (const o of [-22, 22]) B(g, bx + o - 13, sy * 30, 0, bx + o + 13, sy * 38, 26, C.tyre);
      B(g, -LOCO_LEN / 2 + .4, -39.6, 8, LOCO_LEN / 2 - .4, 39.6, 20, C.grille);     // the underframe, set in from the body's faces
      M.locoTrim = S.mesh(g);
      g = g0();
      B(g, -CARR_LEN / 2, -39, 18, CARR_LEN / 2, 39, 108, C.white);
      B(g, -CARR_LEN / 2 + 10, -33, 108, CARR_LEN / 2 - 10, 33, 120, C.white);
      M.carrBody = S.mesh(g);
      g = g0();
      for (const sy of [-1, 1]) {
        for (let x = -CARR_LEN / 2 + 22; x < CARR_LEN / 2 - 40; x += 46) B(g, x, sy * 38.2, 62, x + 32, sy * 40.6, 92, C.glass);
        B(g, -CARR_LEN / 2 + .4, sy * 38.8, 40, CARR_LEN / 2 - .4, sy * 40.4, 48, C.tail);
      }
      for (const bx of [-CARR_LEN / 2 + 50, CARR_LEN / 2 - 50]) for (const sy of [-1, 1]) for (const o of [-20, 20]) B(g, bx + o - 12, sy * 29, 0, bx + o + 12, sy * 37, 24, C.tyre);
      B(g, -CARR_LEN / 2 + .4, -38.6, 8, CARR_LEN / 2 - .4, 38.6, 20, C.grille);
      B(g, CARR_LEN / 2 - 2, -8, 28, CARR_LEN / 2 + CARR_GAP / 2 + 1, 8, 38, C.grille);
      B(g, -CARR_LEN / 2 - CARR_GAP / 2 - 1, -8, 28, -CARR_LEN / 2 + 2, 8, 38, C.grille);
      M.carrTrim = S.mesh(g);

      /* ---- river furniture ----
         Logs are planks, not cylinders — square-cut, with dark grain along
         the top, paler ends, and white water churned up at each end. One mesh
         per length the rivers use, so the grain keeps its size. */
      M.logs = {};
      for (const len of [200, 300, 400]) {
        g = g0();
        const hx = len / 2 - 3, z0 = WATER_Z - 6, z1 = LOG_TOP;
        B(g, -hx, -31, z0, hx, 31, z1, C.log);
        let k = 0;
        for (const yy of [-15, 13]) for (let x = -hx + 14; x < hx - 34; x += 66) {
          const w2 = 30 + ((k++ * 17) % 22);
          B(g, x, yy - 3, z1, Math.min(hx - 10, x + w2), yy + 3, z1 + 1.2, C.logDark);
        }
        B(g, hx, -27, z0 + 4, hx + 3, 27, z1 - 4, C.logEnd);
        B(g, -hx - 3, -27, z0 + 4, -hx, 27, z1 - 4, C.logEnd);
        for (const s of [-1, 1]) {
          const x0 = s > 0 ? hx : -hx - 18, x1 = s > 0 ? hx + 18 : -hx;
          plate(g, x0, -38, x1, 38, WATER_Z + 1.3, C.foam);
          plate(g, s > 0 ? hx + 18 : -hx - 30, -22, s > 0 ? hx + 30 : -hx - 18, 22, WATER_Z + 1.3, C.foam);
        }
        M.logs[len] = S.mesh(g);
      }
      /* the coin: a gold square with a raised face and a red C on both sides */
      g = g0();
      B(g, -5, -24, -24, 5, 24, 24, C.coin);
      B(g, -6.2, -18, -18, 6.2, 18, 18, C.coinEdge);
      {
        const CP = ['.###.', '#....', '#....', '#....', '.###.'];
        for (const s of [-1, 1]) for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
          if (CP[r][c] !== '#') continue;
          const yy = (c - 2) * 6 * s, zz = (2 - r) * 6;     // read the right way round from either side
          B(g, s * 6.2, yy - 3, zz - 3, s * 7.6, yy + 3, zz + 3, C.coinC);
        }
      }
      M.coin = S.mesh(g);
      /* a lily pad: a disc with the classic wedge cut from it, a darker rim,
         a few veins, and on some of them a flower */
      g = g0();
      {
        const R = 41, a0 = .42, a1 = TAU - .42, seg = 24;
        g.cyl(0, 0, -4, 2, R, seg, C.padRim, { a0, a1 });
        const o = g.v(0, 0, 2, 0, 0, 1, C.padB, 0, 0);
        for (let i = 0; i <= seg; i++) { const a = a0 + (a1 - a0) * i / seg; g.v(Math.cos(a) * R, Math.sin(a) * R, 2, 0, 0, 1, C.padA, 0, 0); }
        for (let i = 0; i < seg; i++) g.t(o, o + 1 + i, o + 2 + i);
        for (let k = 0; k < 6; k++) {
          const a = a0 + .5 + k * (a1 - a0 - 1) / 5, ca = Math.cos(a), sa = Math.sin(a), px = -sa * 1.1, py = ca * 1.1;
          g.face([[px * 1, py * 1, 2.35], [ca * R * .86 + px, sa * R * .86 + py, 2.35], [ca * R * .86 - px, sa * R * .86 - py, 2.35], [-px, -py, 2.35]], C.vein, [0, 0, -20]);
        }
      }
      M.pad = S.mesh(g);
      g = g0();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU, px = Math.cos(a) * 7.5, py = Math.sin(a) * 7.5;
        const hs = 5.5 - (k & 1) * .4;
        B(g, px - hs, py - hs, 2, px + hs, py + hs, 9 + (k & 1) * 1.5, k & 1 ? C.petal : C.petal2);
      }
      B(g, -4, -4, 6, 4, 4, 13, C.pollen);
      M.flower = S.mesh(g);

      /* ---- the bird, built facing -y, which is forward ---- */
      {
        const b = g0(), tr = g0(), bk = g0(), ey = g0();
        B(b, -26, -22, 4, 26, 28, 48, C.white);            // body
        B(b, -20, -22, 46, 20, 16, 76, C.white);           // head
        B(b, -13, 24, 36, 13, 38, 60, C.white);            // tail
        for (const sx of [-1, 1]) B(b, sx * 24, -14, 16, sx * 31, 16, 44, C.white);    // wings
        B(tr, -9, -12, 74, 9, 4, 84, C.white);             // comb
        B(tr, -5, -20, 44, 5, -12, 54, C.white);           // wattle
        B(bk, -7, -30, 52, 7, -18, 63, C.white);           // beak
        for (const sx of [-1, 1]) B(bk, sx * 13 - 6, -6, 0, sx * 13 + 6, 12, 6, C.white);   // feet
        for (const sx of [-1, 1]) B(ey, sx * 14, -21, 58, sx * 19, -13, 66, C.eye);
        M.birdBody = S.mesh(b); M.birdTrim = S.mesh(tr); M.birdBeak = S.mesh(bk); M.birdEye = S.mesh(ey);
      }

      /* ---- a few shapes the other countries are cut from ---- */
      /* a fixed stream, so a mesh scattered with pebbles is the same every run */
      const stream = s => { let h = s % 2147483647 || 1; return () => (h = (h * 48271) % 2147483647) / 2147483647; };
      /* a block whose faces need not be square to the world: a quad and the
         same quad pushed out by t, joined up */
      const slab = (gg, a, b, c, d, t, col) => {
        const A = [a, b, c, d], U = A.map(p => [p[0] + t[0], p[1] + t[1], p[2] + t[2]]);
        const mid = [0, 1, 2].map(k => (a[k] + b[k] + c[k] + d[k]) / 4 + t[k] / 2);
        gg.face(A, col, mid); gg.face(U, col, mid);
        for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; gg.face([A[k], A[n], U[n], U[k]], col, mid); }
      };
      /* a six-sided column, flat-shaded — basalt, and ice stood on end */
      const hexPrism = (gg, cx, cy, z0, z1, r, side, top) => {
        const P = [];
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
        const mid = [cx, cy, (z0 + z1) / 2];
        for (let k = 0; k < 6; k++) {
          const p = P[k], q = P[(k + 1) % 6];
          gg.face([[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], side, mid);
        }
        const T0 = P.map(p => [p[0], p[1], z1]);
        gg.face([T0[0], T0[1], T0[2], T0[3]], top || side, mid);
        gg.face([T0[3], T0[4], T0[5], T0[0]], top || side, mid);
      };
      /* a four-sided point on top of a block */
      const spire = (gg, x0, y0, x1, y1, zb, zt, col) => {
        const ap = [(x0 + x1) / 2, (y0 + y1) / 2, zt], mid = [ap[0], ap[1], zb];
        const Q4 = [[x0, y0, zb], [x1, y0, zb], [x1, y1, zb], [x0, y1, zb]];
        for (let k = 0; k < 4; k++) gg.face([Q4[k], Q4[(k + 1) % 4], ap], col, mid);
      };
      /* the short strokes a moving surface wears, laid out from a seed */
      const strokes = (col, seed, z) => {
        const gg = g0(), rq = stream(seed);
        for (let x = -VERGE - 160; x < VERGE + 160; x += 152) {
          const yy = (rq() - .5) * (TILE - 48), w2 = 16 + rq() * 12;
          plate(gg, x, yy - 2.5, x + w2, yy + 2.5, z, col);
          if (rq() < .5) plate(gg, x + w2 + 9, yy - 2.5, x + w2 * 1.6 + 9, yy + 2.5, z, col);
        }
        return S.mesh(gg);
      };
      const ground = (col, top, z0) => { const gg = g0(); B(gg, -VERGE, -TILE / 2, z0 === undefined ? -180 : z0, VERGE, TILE / 2, top, col); return S.mesh(gg); };

      /* ---- the eagle ----
         It used to be a brown box with two planks. Now it is the bird the
         original has: a deep brown body, the white head with a scowling brow,
         a hooked yellow beak, a white tail cut square, and wings long enough
         to shade three rows — the arm in coverts, the hand fanned into five
         fingered primaries — hinged at the shoulder so they can beat. The
         talons come open and closed. Built facing -y, like the bird. */
      {
        const PE = {
          brown: paint('#6f4b2d'), dark: paint('#553821'), deep: paint('#42301f'), light: paint('#8c6440'),
          white: paint('#f6f3ec'), shade: paint('#e2dccd'), beak: paint('#f7b92f'), hook: paint('#df911c'),
          talon: paint('#f2b83a'), claw: paint('#2b2622'), eye: paint('#ffcf2e'), pupil: paint('#1b1b20')
        };
        const E = g0();
        B(E, -32, -60, -26, 32, 44, 28, PE.brown);                 // the body
        B(E, -27, -64, -30, 27, -10, 8, PE.light);                 // the breast
        B(E, -25, -34, 28, 25, 38, 34, PE.dark);                   // the mantle
        B(E, -26, 40, -18, 26, 70, 18, PE.brown);                  // the rump
        B(E, -25, -104, -8, 25, -54, 40, PE.white);                // the head
        B(E, -21, -100, 40, 21, -60, 47, PE.white);
        B(E, -22, -61, -12, 22, -46, 31, PE.shade);               // where the white meets the brown
        B(E, -27, -99, 28, 27, -84, 35, PE.shade);                 // the brow
        for (const sx of [-1, 1]) {
          const o = sx > 0 ? 25 : -28.5;
          B(E, o, -95, 15, o + 3.5, -82, 27, PE.eye);
          B(E, sx > 0 ? 26 : -29.5, -92, 17, sx > 0 ? 29.5 : -26, -85, 25, PE.pupil);
        }
        B(E, -12, -128, 2, 12, -102, 26, PE.beak);                 // the beak
        B(E, -13, -110, 16, 13, -100, 30, PE.beak);
        B(E, -9, -138, -12, 9, -121, 12, PE.hook);                 // and its hook
        B(E, -6, -131, -17, 6, -120, -8, PE.hook);
        B(E, -36, 64, -8, 36, 116, 4, PE.white);                   // the tail, a white fan
        for (let k = -2; k <= 2; k++) B(E, k * 14 - 6.5, 116, -7, k * 14 + 6.5, 116 + (k & 1 ? 7 : 13), 3, PE.white);
        for (const sx of [-1, 1]) {
          B(E, sx * 16 - 10, -16, -40, sx * 16 + 10, 6, -22, PE.brown);   // feathered legs
          B(E, sx * 16 - 5, -10, -58, sx * 16 + 5, 2, -38, PE.talon);
        }
        M.eagleBody = S.mesh(E);
        const talons = open => {
          const t = g0();
          for (const sx of [-1, 1]) {
            const x = sx * 16;
            if (open) {
              for (const o of [-8, 0, 8]) {
                B(t, x + o - 2.5, -32, -64, x + o + 2.5, -8, -57, PE.talon);
                B(t, x + o - 2, -39, -73, x + o + 2, -30, -60, PE.claw);
              }
              B(t, x - 2.5, 0, -64, x + 2.5, 18, -57, PE.talon);
              B(t, x - 2, 15, -73, x + 2, 23, -60, PE.claw);
            } else {
              B(t, x - 10, -22, -76, x + 10, 8, -56, PE.talon);
              B(t, x - 9, -27, -82, x + 9, -18, -70, PE.claw);
            }
          }
          return S.mesh(t);
        };
        M.eagleTalonOpen = talons(true); M.eagleTalonShut = talons(false);
        /* a wing, hinged at its root (the origin), reaching out along +x or -x */
        const wing = s => {
          const w = g0();
          const box = (xa, xb, y0, y1, z0, z1, c) => B(w, Math.min(s * xa, s * xb), y0, z0, Math.max(s * xa, s * xb), y1, z1, c);
          box(0, 88, -46, 40, -7, 9, PE.brown);                      // the arm, in coverts
          box(0, 74, -48, -16, 9, 12, PE.light);                     // a paler leading edge
          box(80, 164, -42, 48, -6, 7, PE.dark);                     // the secondaries
          box(158, 200, -40, 42, -5, 6, PE.dark);
          [[-39.4, -27, 238], [-24, -11, 260], [-8, 5, 268], [8, 21, 258], [24, 37, 238]]
            .forEach(([y0, y1, x1], k) => box(192, x1, y0, y1, -4, 4, k & 1 ? PE.dark : PE.deep));   // the fingers
          for (let x = 8; x < 176; x += 34) box(x, x + 27, 40, x % 68 < 34 ? 58 : 52, -5, 5, PE.deep);  // the trailing edge
          return S.mesh(w);
        };
        M.eagleWingR = wing(1); M.eagleWingL = wing(-1);
      }

      /* ====================================================== the dunes ===
         Warm sand in two shades; saguaros and barrel cacti where the meadow
         has trees, layered sandstone where it has rocks, mesas out past the
         verge; a desert highway with yellow lines and sand blowing over its
         edges; an oasis the colour of a swimming pool, with reed rafts and
         crocodiles on it; quicksand with sandstone stepping stones; and the
         sandworm's lane, pale rippled sand between two posts that each carry
         a steer's skull. */
      {
        const PD = {
          sandA: paint('#f3d48d'), sandB: paint('#edcb80'), road: paint('#6c6560'), dash: paint('#f6cf5a'), drift: paint('#ebcf8f'),
          water: paint('#57d3cf'), ripple: paint('#a3efe8'), reed: paint('#6bb04a'), reedTop: paint('#8a5a34'),
          qsand: paint('#a8703d'), swirl: paint('#c8955a'), wsand: paint('#deae69'), wripple: paint('#c7964f'), wridge: paint('#e8bf7f'),
          slab: paint('#c98e58'), slabTop: paint('#f5dcaa'), slabLine: paint('#c29a66'),
          cactus: paint('#5aab4b'), cactusDark: paint('#468f3c'), cactusTop: paint('#79c35c'), flower: paint('#ff6f9a'), flower2: paint('#ffd24a'),
          rockA: paint('#d8854f'), rockB: paint('#e59f67'), rockC: paint('#efb986'), strata: paint('#c26f43'),
          bone: paint('#f2ead6'), socket: paint('#3a2c24'), post: paint('#8a6240'), cloth: paint('#cf3d33'), cloth2: paint('#f0b93a'),
          pebble: paint('#c9a066'), tuft: paint('#c7a45e'), palm: paint('#9b7148'), palmRing: paint('#7d5836'), frond: paint('#4fae42'),
          frondDark: paint('#3f9637'), nut: paint('#6b4a2c'),
          raft: paint('#dcc16c'), raftDark: paint('#c3a553'), bind: paint('#8a5a34'),
          croc: paint('#5f913d'), crocDark: paint('#4a7a30'), crocLight: paint('#86b35a'), crocEye: paint('#f3d23a'), tooth: paint('#fbf6e6'), mouth: paint('#e0707e'),
          worm: paint('#cd9168'), wormRing: paint('#ad7150'), wormTop: paint('#dfae86'), maw: paint('#4e1a22'), gum: paint('#e06f7e'),
          camel: paint('#d6a25f'), camelDark: paint('#b8864a'), camelLight: paint('#e6bb7c'), blanket: paint('#d8433a'), tassel: paint('#3d72c9'),
          robe: paint('#f4f1ea'), wrap: paint('#3d72c9'), skin: paint('#b9794a'),
          tumble: paint('#bc8d52'), tumbleDark: paint('#98703f'), crate: paint('#c28a52'), crateDark: paint('#9a6a3c'),
          cream: paint('#f2ead8'), rvStripe: paint('#e0663f'), cage: paint('#34363d'), flag: paint('#ff7a1a'), helmet: paint('#f4f4f6')
        };
        const MD = M.desert = {};
        MD.land = [PD.sandA, PD.sandB].map(c => ground(c, GRASS_Z));
        MD.road = ground(PD.road, 0);
        g = g0();
        for (let x = -VERGE + 20; x < VERGE; x += 112) B(g, x, -3.5, 0, x + 60, 3.5, .9, PD.dash);
        MD.dash = S.mesh(g);
        /* sand blown over the edge of the tarmac, on the side it meets the dunes */
        g = g0();
        { const rq = stream(4242);
          for (let x = -VERGE; x < VERGE; x += 50 + rq() * 70) {
            const w = 40 + rq() * 90, d = 7 + rq() * 13;
            B(g, x, -TILE / 2, 0, x + w, -TILE / 2 + d, 1.2 + rq() * 1.6, PD.drift);
            if (rq() < .5) B(g, x + w * .3, -TILE / 2 + d, 0, x + w * .7, -TILE / 2 + d + 5, 1, PD.drift);
          } }
        MD.edge = S.mesh(g);
        MD.water = ground(PD.water, WATER_Z);
        MD.ripple = strokes(PD.ripple, 20250921, WATER_Z + 1.2);
        /* reeds along the bank, out past where anyone plays */
        g = g0();
        { const rq = stream(9191);
          for (let x = -VERGE; x < VERGE; x += 26 + rq() * 40) {
            if (Math.abs(x) < HALF * TILE + 70) continue;
            for (let k = 0; k < 3; k++) {
              const rx = Math.round(x + (rq() - .5) * 18), ry = Math.round(-TILE / 2 + 6 + rq() * 12), h = 30 + rq() * 34;
              B(g, rx - 2, ry - 2, WATER_Z - 4, rx + 2, ry + 2, WATER_Z + h, PD.reed);
              if (rq() < .5) B(g, rx - 2.7, ry - 2.7, WATER_Z + h - 12, rx + 2.7, ry + 2.7, WATER_Z + h - 2, PD.reedTop);
            }
          } }
        MD.bank = S.mesh(g);
        MD.qsand = ground(PD.qsand, WATER_Z - 3);
        /* a swirl in the quicksand: a square spiral, turned slowly in scene() */
        g = g0();
        { let x = 0, y = 0, L = 34, d = 0;
          for (let k = 0; k < 6; k++, L -= 5, d = (d + 1) % 4) {
            const dx = [1, 0, -1, 0][d], dy = [0, 1, 0, -1][d];
            const x2 = x + dx * L, y2 = y + dy * L;
            plate(g, Math.min(x, x2) - 2, Math.min(y, y2) - 2, Math.max(x, x2) + 2, Math.max(y, y2) + 2, WATER_Z - 2.4, PD.swirl);
            x = x2; y = y2;
          } }
        MD.swirl = S.mesh(g);
        /* a sandstone stepping stone: a pale slab standing well out of the
           quicksand, so where it is safe to land is never in doubt */
        g = g0();
        B(g, -38, -38, -22, 38, 38, 6, PD.slab);
        B(g, -34.5, -34.5, 6, 34.5, 34.5, 8, PD.slabTop);
        plate(g, -26, -6, 4, -3, 8.2, PD.slabLine); plate(g, 2, -6, 5, 18, 8.2, PD.slabLine); plate(g, 10, 10, 26, 13, 8.2, PD.slabLine);
        MD.slab = S.mesh(g);
        /* The worm's lane: churned sand a shade deeper than the dunes, with
           the ridge its tunnel pushes up running down the middle and a
           border of stones along each side — something lives under here. */
        g = g0();
        B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, 0, PD.wsand);
        { const rq = stream(3131);
          for (const yy of [-34, -24, 24, 34]) for (let x = -VERGE; x < VERGE; x += 60 + rq() * 40) {
            const w = 24 + rq() * 30, o = Math.sin(x * .013 + yy) * 3;
            plate(g, x, yy + o - 2, x + w, yy + o + 2, .8, PD.wripple);
          }
          for (let x = -VERGE; x < VERGE; ) {
            const w = 50 + rq() * 60, h = 5 + rq() * 4;
            B(g, x, -17, 0, x + w, 17, h, PD.wsand); B(g, x + 5, -11, h, x + w - 5, 11, h + 3, PD.wridge);
            x += w - 4;
          }
          for (const sy of [-1, 1]) for (let x = -VERGE + rq() * 40; x < VERGE; x += 44 + rq() * 40) {
            const w = 8 + rq() * 8;
            B(g, x, sy * 44 - 4, 0, x + w, sy * 44 + 4, 4 + rq() * 3, PD.pebble);
          } }
        MD.wormGround = S.mesh(g);
        /* its posts, at either verge: a pole and crossbar, rags, and a skull */
        g = g0();
        const skullAt = (gg, x, z, eyes) => {
          if (!eyes) {
            B(gg, x - 16, -12, z, x + 16, 14, z + 22, PD.bone);             // the cranium
            B(gg, x - 10, 12, z - 10, x + 10, 24, z + 14, PD.bone);         // the long face, toward us
            for (const sx of [-1, 1]) {
              B(gg, x + sx * 16 - (sx > 0 ? 0 : 18), -4, z + 14, x + sx * 16 + (sx > 0 ? 18 : 0), 6, z + 21, PD.bone);        // horns
              B(gg, x + sx * 30 - (sx > 0 ? 0 : 8), -4, z + 21, x + sx * 30 + (sx > 0 ? 8 : 0), 6, z + 38, PD.bone);
              B(gg, x + sx * 5 - 2.5, 23.6, z - 6, x + sx * 5 + 2.5, 24.8, z - 1, PD.socket);                                   // nostrils
            }
          } else for (const sx of [-1, 1]) B(gg, x + sx * 9 - 4.5, 13.6, z + 8, x + sx * 9 + 4.5, 15.2, z + 16, C.white);           // the sockets
        };
        for (const sx of [-1, 1]) {
          const x = sx * SX;
          B(g, x - 20, -18, 0, x + 20, 18, 12, PD.rockA);
          B(g, x - 7, -7, 12, x + 7, 7, 150, PD.post);
          B(g, x - 26, -5, 118, x + 26, 5, 127, PD.post);
          B(g, x - 25, -3, 88, x - 18, 3, 118, PD.cloth); B(g, x + 18, -3, 96, x + 25, 3, 118, PD.cloth2);
          skullAt(g, x, 150, false);
        }
        MD.wormPosts = S.mesh(g);
        g = g0(); for (const sx of [-1, 1]) skullAt(g, sx * SX, 150, true);
        MD.wormEyes = S.mesh(g);
        /* The worm: a segment drawn a score of times along the wave, a tail,
           and a head that is all mouth — a pink rim, a dark throat ringed
           with teeth, and four jaws splayed open round it. Facing +x. */
        g = g0();
        B(g, -36, -46, -46, 36, 46, 46, PD.worm);
        B(g, -9, -50, -50, 9, 50, 50, PD.wormRing);
        B(g, -26, -30, 46, 26, 30, 52, PD.wormTop);
        B(g, -20, -18, 52, 20, 18, 56, PD.wormRing);
        MD.wormSeg = S.mesh(g);
        g = g0();
        B(g, -40, -30, -30, 20, 30, 30, PD.worm);
        B(g, -64, -16, -16, -40, 16, 16, PD.worm);
        B(g, -80, -7, -7, -64, 7, 7, PD.wormRing);
        B(g, -30, -20, 30, 10, 20, 35, PD.wormTop);
        MD.wormTail = S.mesh(g);
        g = g0();
        B(g, -62, -58, -58, 44, 58, 58, PD.worm);
        B(g, -48, -62, -62, -30, 62, 62, PD.wormRing);
        B(g, -54, -36, 58, 30, 36, 65, PD.wormTop);
        B(g, 44, -58, -58, 52, 58, 58, PD.gum);
        B(g, 51, -38, -38, 53, 38, 38, PD.maw);
        for (let k = -3; k <= 3; k++) {
          const o = k * 11;
          B(g, 52, o - 3.5, 36, 66, o + 3.5, 44, PD.tooth); B(g, 52, o - 3.5, -44, 66, o + 3.5, -36, PD.tooth);
          B(g, 52, 36, o - 3.5, 66, 44, o + 3.5, PD.tooth); B(g, 52, -44, o - 3.5, 66, -36, o + 3.5, PD.tooth);
        }
        for (let k = -2; k <= 2; k++) {                                       // a second ring, further in
          const o = k * 12;
          B(g, 52, o - 3, 22, 60, o + 3, 28, PD.tooth); B(g, 52, o - 3, -28, 60, o + 3, -22, PD.tooth);
        }
        /* the four jaws, splayed out and forward from the rim */
        for (const [u, v] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const e = (py, pz) => [52, py, pz];
          const w = 46, r0 = 58, r1 = 96, fx = 58;
          const a = u ? e(u * r0, -w) : e(-w, v * r0), b = u ? e(u * r0, w) : e(w, v * r0);
          const c2 = u ? [52 + fx, u * r1, w * .7] : [52 + fx, w * .7, v * r1], d2 = u ? [52 + fx, u * r1, -w * .7] : [52 + fx, -w * .7, v * r1];
          slab(g, a, b, c2, d2, [0, -u * 8, -v * 8], PD.worm);
          slab(g, [a[0], a[1] - u * 8, a[2] - v * 8], [b[0], b[1] - u * 8, b[2] - v * 8], [c2[0], c2[1] - u * 8, c2[2] - v * 8],
               [d2[0], d2[1] - u * 8, d2[2] - v * 8], [0, -u * 4, -v * 4], PD.gum);
        }
        MD.wormHead = S.mesh(g);

        /* ---- what grows there, and what lies about ---- */
        const cactus = (H, arms) => {
          const c = g0();
          B(c, -17, -17, 0, 17, 17, H, PD.cactus);
          B(c, -14, -14, H, 14, 14, H + 5, PD.cactusTop);
          for (const o of [-9, 6]) {
            B(c, o, 17, 8, o + 3, 18.6, H - 6, PD.cactusDark); B(c, o, -18.6, 8, o + 3, -17, H - 6, PD.cactusDark);
            B(c, 17, o, 8, 18.6, o + 3, H - 6, PD.cactusDark); B(c, -18.6, o, 8, -17, o + 3, H - 6, PD.cactusDark);
          }
          const arm = (s, z0, up) => {
            const X = (p, q) => [Math.min(s * p, s * q), Math.max(s * p, s * q)];
            let q = X(16.5, 44); B(c, q[0], -11, z0, q[1], 11, z0 + 20, PD.cactus);
            q = X(24, 44); B(c, q[0], -11, z0 + 20, q[1], 11, z0 + 20 + up, PD.cactus);
            q = X(26, 42); B(c, q[0], -9, z0 + 20 + up, q[1], 9, z0 + 24 + up, PD.cactusTop);
            q = X(32, 35); B(c, q[0], 11, z0 + 24, q[1], 12.4, z0 + 16 + up, PD.cactusDark);
          };
          if (arms > 0) arm(-1, Math.round(H * .36), Math.round(H * .36));
          if (arms > 1) arm(1, Math.round(H * .52), Math.round(H * .26));
          return S.mesh(c);
        };
        MD.cactus = [null, cactus(94, 0), cactus(140, 1), cactus(188, 2)];
        MD.bloom = [null, 94, 140, 188].map(H => {
          if (!H) return null;
          const c = g0();
          B(c, -8, -8, H + 5, 8, 8, H + 10, PD.flower); B(c, -4, -4, H + 10, 4, 4, H + 13, PD.flower2);
          return S.mesh(c);
        });
        g = g0();
        B(g, -40, -34, 0, 40, 34, 22, PD.rockA); B(g, -40.8, -34.8, 8, 40.8, 34.8, 11, PD.strata);
        B(g, -30, -27, 22, 33, 26, 40, PD.rockB); B(g, -30.8, -27.8, 29, 33.8, 26.8, 31.5, PD.strata);
        B(g, -18, -16, 40, 17, 17, 52, PD.rockC);
        MD.rock = S.mesh(g);
        g = g0();
        B(g, -25, -25, 0, 25, 25, 32, PD.cactus); B(g, -21, -21, 32, 21, 21, 38, PD.cactusTop);
        for (const o of [-16, -2, 12]) {
          B(g, o, 25, 3, o + 3, 26.4, 30, PD.cactusDark); B(g, o, -26.4, 3, o + 3, -25, 30, PD.cactusDark);
          B(g, 25, o, 3, 26.4, o + 3, 30, PD.cactusDark); B(g, -26.4, o, 3, -25, o + 3, 30, PD.cactusDark);
        }
        for (const [x, y, c] of [[-12, -8, PD.flower2], [6, -12, PD.flower], [10, 6, PD.flower2], [-6, 10, PD.flower]]) B(g, x - 4, y - 4, 38, x + 4, y + 4, 44, c);
        MD.barrel = S.mesh(g);
        g = g0();
        B(g, -130, -62, 0, 130, 62, 128, PD.rockA);
        B(g, -130.8, -62.8, 36, 130.8, 62.8, 42, PD.strata); B(g, -130.8, -62.8, 88, 130.8, 62.8, 93, PD.strata);
        B(g, -100, -50, 128, 108, 52, 172, PD.rockB); B(g, -100.8, -50.8, 148, 108.8, 52.8, 152, PD.strata);
        B(g, -58, -38, 172, 70, 40, 198, PD.rockC);
        MD.mesa = S.mesh(g);
        /* a palm, leaning, with its fronds as planks drooping from the crown */
        g = g0();
        { let x = 0, y = 0;
          for (let k = 0; k < 5; k++, x += 5, y += 4) {
            B(g, x - 11, y - 11, k * 36, x + 11, y + 11, k * 36 + 36, PD.palm);
            B(g, x - 11.8, y - 11.8, k * 36 + 30, x + 11.8, y + 11.8, k * 36 + 34, PD.palmRing);
          }
          const top = [x, y, 184];
          for (const [nx, ny] of [[x - 7, y + 5], [x + 6, y + 8], [x + 2, y - 7]]) B(g, nx - 6, ny - 6, 168, nx + 6, ny + 6, 182.5, PD.nut);
          for (let k = 0; k < 7; k++) {
            const a = k / 7 * TAU + .3, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
            const P = (d, z, w) => [[top[0] + ca * d - px * w, top[1] + sa * d - py * w, top[2] + z], [top[0] + ca * d + px * w, top[1] + sa * d + py * w, top[2] + z]];
            const [a0, b0] = P(6, 4, 9), [a1, b1] = P(56, 18, 15), [a2, b2] = P(104, -22, 4);
            slab(g, a0, b0, b1, a1, [0, 0, 3.5], k & 1 ? PD.frond : PD.frondDark);
            slab(g, a1, b1, b2, a2, [0, 0, 3.5], k & 1 ? PD.frond : PD.frondDark);
          } }
        MD.palm = S.mesh(g);

        /* the pebbles, dry tufts, ripples and bones strewn across a row: a
           handful of scatters, each laid out once */
        MD.deco = [];
        for (let v = 0; v < DECO_N; v++) {
          const d = g0(), rq = stream(1000 + v * 77);
          for (let n = 0; n < 17; n++) {
            const x = -VERGE + 40 + rq() * (VERGE * 2 - 80), y = (rq() - .5) * 72, k = rq();
            if (k < .34) { B(d, x - 5, y - 4, 0, x + 5, y + 4, 4, PD.pebble); if (rq() < .5) B(d, x + 6, y + 1, 0, x + 11, y + 5, 3, PD.pebble); }
            else if (k < .58) plate(d, x, y - 1.6, x + 26 + rq() * 20, y + 1.6, .8, PD.strata);
            else if (k < .8) for (let b = 0; b < 3; b++) { const bx = x + (b - 1) * 4, h = 8 + rq() * 9; B(d, bx - 1.3, y - 1.3, 0, bx + 1.3, y + 1.3, h, PD.tuft); }
            else if (k < .9) { B(d, x - 4, y - 4, 0, x + 4, y + 4, 15, PD.cactus); B(d, x + 4, y - 3, 6, x + 9, y + 3, 10, PD.cactus); B(d, x + 6, y - 3, 10, x + 9, y + 3, 17, PD.cactus); }
            else if (k < .96) { B(d, x - 13, y - 2, 0, x + 13, y + 2, 3, PD.bone); B(d, x - 15, y - 4, 0, x - 11, y + 4, 4, PD.bone); B(d, x + 11, y - 4, 0, x + 15, y + 4, 4, PD.bone); }
            else {
              B(d, x - 8, y - 6, 0, x + 8, y + 7, 7, PD.bone); B(d, x - 5, y + 7, 0, x + 5, y + 16, 5, PD.bone);
              B(d, x - 17, y - 2, 3, x - 8, y + 2, 6, PD.bone); B(d, x + 8, y - 2, 3, x + 17, y + 2, 6, PD.bone);
              B(d, x - 5, y + 1, 7, x - 1, y + 5, 7.6, PD.socket); B(d, x + 1, y + 1, 7, x + 5, y + 5, 7.6, PD.socket);
            }
          }
          MD.deco.push(S.mesh(d));
        }

        /* ---- the traffic, built facing +x ----
           Kept in the original's language: coloured bodies, white cabins with
           black glass, square black tyres. */
        const tyres = (t, xs, hw, h, y0, y1) => {
          for (const sx of xs) for (const sy of [-1, 1]) {
            B(t, sx - hw, sy * y0, 0, sx + hw, sy * y1, h, C.tyre);
            B(t, sx - hw * .4, sy * (y1 + .01), h * .3, sx + hw * .4, sy * (y1 + 1.6), h * .7, C.hub);
          }
        };
        const V = MD.veh = [];
        {   /* pickup: a cab up front, crates in the bed behind */
          const b = g0(), t = g0();
          B(b, -86, -34, 12, 88, 34, 40, C.white);
          B(b, -86, -34, 40, -14, -28, 54, C.white); B(b, -86, 28, 40, -14, 34, 54, C.white); B(b, -86, -34, 40, -80, 34, 54, C.white);
          B(t, -12, -31, 40, 50, 31, 74, C.cabin);
          B(t, 49, -26, 45, 52, 26, 69, C.glass); B(t, -15, -26, 45, -12, 26, 69, C.glass);
          for (const sy of [-1, 1]) B(t, -4, sy * 30.6, 45, 42, sy * 32.4, 69, C.glass);
          B(t, -76, -26, 40, -46, 4, 66, PD.crate); B(t, -76.6, -26.6, 50, -45.4, 4.6, 54, PD.crateDark);
          B(t, -44, -4, 40, -18, 24, 62, PD.crate); B(t, -44.6, -4.6, 48, -17.4, 24.6, 52, PD.crateDark);
          tyres(t, [-54, 54], 17, 30, 25, 38);
          lamps(t, 88, -86, 22, 32, 34);
          V.push({ body: S.mesh(b), trim: S.mesh(t) });
        }
        {   /* camper van: cream, with a stripe in its colour and a bunk over the cab */
          const b = g0(), t = g0();
          B(t, -146, -38, 14, 104, 38, 108, PD.cream);
          B(t, 104, -36, 14, 146, 36, 64, PD.cream);
          B(t, 100, -38, 72, 132, 38, 108, PD.cream);
          B(b, -147, -39, 44, 133, 39, 54, C.white); B(b, -147, -39, 60, 133, 39, 63.5, C.white);   // just under the bonnet's top
          B(t, 145, -30, 36, 147.6, 30, 60, C.glass);
          for (const sy of [-1, 1]) {
            B(t, 110, sy * 36.2, 36, 140, sy * 37.8, 60, C.glass);
            B(t, -124, sy * 38.2, 70, -84, sy * 39.8, 94, C.glass); B(t, -40, sy * 38.2, 70, 18, sy * 39.8, 94, C.glass);
          }
          B(t, 40, 38.2, 16, 64, 39.8, 92, PD.crateDark);
          B(t, -44, -18, 108, -6, 18, 122, C.hub);
          B(t, -151, -18, 34, -146, 18, 72, C.tyre);
          tyres(t, [-100, 90], 16, 28, 26, 39.6);
          lamps(t, 146, -146, 20, 32, 36);
          V.push({ body: S.mesh(b), trim: S.mesh(t) });
        }
        {   /* dune buggy: a low tub, a roll cage, fat tyres and a whip flag */
          const b = g0(), t = g0();
          B(b, -48, -24, 18, 44, 24, 36, C.white); B(b, 44, -18, 16, 66, 18, 30, C.white);
          B(t, -66, -18, 20, -48, 18, 44, C.hub);
          for (const x of [-34, 18]) for (const sy of [-1, 1]) B(t, x - 3, sy * 22 - 3, 36, x + 3, sy * 22 + 3, 78, PD.cage);
          B(t, -37, -25, 76, 21, -19, 82, PD.cage); B(t, -37, 19, 76, 21, 25, 82, PD.cage);
          B(t, -37, -25, 76, -31, 25, 82, PD.cage); B(t, 15, -25, 76, 21, 25, 82, PD.cage);
          B(t, -22, -12, 36, -2, 12, 58, PD.robe); B(t, -20, -10, 58, -2, 10, 76, PD.helmet); B(t, -2.5, -8, 62, -.5, 8, 71, C.glass);
          B(t, -62, -2, 44, -58, 2, 124, PD.cage); B(t, -58, -1, 102, -36, 1, 120, PD.flag);
          tyres(t, [-40, 40], 20, 40, 20, 44);
          for (const sy of [-1, 1]) B(t, 65, sy * 12 - 4, 20, 67.5, sy * 12 + 4, 28, C.head);
          V.push({ body: S.mesh(b), trim: S.mesh(t) });
        }
        {   /* A camel: its body with the hump, blanket and tassels; its neck and
               head as a piece of their own, hinged at the base of the neck so
               it can nod as it walks; and one long leg, drawn from each hip. */
          const body = rider => {
            const c = g0();
            B(c, -50, -20, 50, 46, 20, 86, PD.camel);
            B(c, -44, -19, 46, 40, 19, 50, PD.camelDark);
            B(c, -26, -17, 86, 14, 17, 108, PD.camel); B(c, -18, -13, 108, 6, 13, 116, PD.camelLight);
            B(c, -34, -21, 80, 22, 21, 92, PD.blanket); B(c, -34.6, -21.6, 84, 22.6, 21.6, 87, PD.cloth2);
            for (const sy of [-1, 1]) for (const x of [-30, -8, 14]) B(c, x - 2, sy * 21 - 1.5, 68, x + 2, sy * 21 + 1.5, 80, PD.tassel);
            B(c, -54, -3, 58, -50, 3, 84, PD.camelDark);
            if (rider) {
              B(c, -16, -14, 116, 8, 14, 150, PD.robe); B(c, -10, -10, 150, 8, 10, 168, PD.wrap);
              B(c, 8, -6, 150, 10, 6, 162, PD.skin); B(c, -14, -11, 164, 6, 11, 172, PD.wrap);
            }
            return S.mesh(c);
          };
          const head = g0();
          B(head, -2, -9, -6, 16, 9, 24, PD.camel);
          B(head, 8, -8, 18, 24, 8, 44, PD.camel);
          B(head, 14, -10, 40, 48, 10, 58, PD.camel);
          B(head, 42, -8, 34, 58, 8, 52, PD.camelDark);
          for (const sy of [-1, 1]) {
            B(head, 16, sy * 7 - 2, 57, 22, sy * 7 + 2, 65, PD.camelDark);
            B(head, 34, sy * 10 - (sy > 0 ? 0 : 1.4), 46, 40, sy * 10 + (sy > 0 ? 1.4 : 0), 52, C.eye);
          }
          const leg = g0();
          B(leg, -7, -7, -28, 7, 7, 3, PD.camel);
          B(leg, -5, -5, -50, 5, 5, -26, PD.camelDark);
          B(leg, -8, -8, -54, 8, 8, -48, PD.camelDark);
          V.push({ camel: body(false), rider: body(true), head: S.mesh(head), leg: S.mesh(leg) });
        }
        {   /* tumbleweed: three rings of twigs, bundled */
          const c = g0();
          const ring = (plane, col, r) => {
            const from = c.n;
            c.torus(0, 0, 0, r, 4, 12, 4, col);
            if (plane) for (let i = from; i < c.n; i++) {
              const o = i * 12, V2 = c.V;
              if (plane === 1) { let q = V2[o + 1]; V2[o + 1] = V2[o + 2]; V2[o + 2] = q; q = V2[o + 4]; V2[o + 4] = V2[o + 5]; V2[o + 5] = q; }
              else { let q = V2[o]; V2[o] = V2[o + 2]; V2[o + 2] = q; q = V2[o + 3]; V2[o + 3] = V2[o + 5]; V2[o + 5] = q; }
            }
          };
          ring(0, PD.tumble, 36); ring(1, PD.tumbleDark, 34); ring(2, PD.tumble, 35);
          ring(0, PD.tumbleDark, 22); ring(1, PD.tumble, 20);
          V.push({ weed: S.mesh(c) });
        }

        /* ---- on the oasis: reed rafts, and crocodiles ---- */
        MD.raft = {};
        for (const len of [200, 300, 400]) {
          const r = g0(), hx = len / 2 - 6, z0 = WATER_Z - 6, z1 = LOG_TOP;
          for (const [y0, y1, dz] of [[-31, -11, -1], [-10, 10, 1], [11, 31, -1]]) {
            B(r, -hx, y0, z0, hx, y1, z1 + dz, PD.raft);
            B(r, -hx + 10, (y0 + y1) / 2 - 1, z1 + dz, hx - 10, (y0 + y1) / 2 + 1, z1 + dz + .8, PD.raftDark);
          }
          for (const s of [-1, 1]) B(r, s > 0 ? hx : -hx - 12, -24, z1 - 6, s > 0 ? hx + 12 : -hx, 24, z1 + 8, PD.raft);
          for (let x = -hx + 26; x < hx - 10; x += 70) B(r, x - 4, -32, z0 + 2, x + 4, 32, z1 + 2, PD.bind);
          for (const s of [-1, 1]) {
            const x0 = s > 0 ? hx : -hx - 18, x1 = s > 0 ? hx + 18 : -hx;
            plate(r, x0, -38, x1, 38, WATER_Z + 1.3, C.foam);
          }
          MD.raft[len] = S.mesh(r);
        }
        MD.croc = {};
        for (const len of [300, 400]) {
          const r = g0(), hx = len / 2 - 4, hl = len * CROC_HEAD, z0 = WATER_Z - 6, top = LOG_TOP;
          /* the back you ride on, with two rows of scutes, and the tail */
          B(r, -hx + 56, -27, z0, hx - hl, 27, top, PD.croc);
          for (let x = -hx + 64; x < hx - hl - 10; x += 24) for (const sy of [-1, 1]) B(r, x, sy * 11 - 4, top, x + 12, sy * 11 + 4, top + 5, PD.crocDark);
          B(r, -hx + 20, -16, z0 + 2, -hx + 56, 16, top - 6, PD.croc); B(r, -hx, -9, z0 + 4, -hx + 22, 9, top - 12, PD.croc);
          for (let x = -hx + 8; x < -hx + 54; x += 14) { const zt = x > -hx + 20 ? top - 6 : top - 12; B(r, x, -3, zt - 2, x + 8, 3, zt + 3, PD.crocDark); }
          for (const x of [-hx + 76, hx - hl - 24]) for (const sy of [-1, 1]) B(r, x - 10, sy * 27, z0 + 4, x + 10, sy * 38, WATER_Z + 7, PD.croc);
          /* the lower jaw and throat: pale, with teeth along the edge */
          B(r, hx - hl, -22, z0 + 2, hx, 22, WATER_Z + 12, PD.crocLight);
          B(r, hx - hl + 8, -18, WATER_Z + 12, hx - 6, 18, WATER_Z + 13, PD.mouth);
          for (let x = hx - hl + 14; x < hx - 6; x += 12) for (const sy of [-1, 1]) B(r, x, sy * 19 - 2, WATER_Z + 12, x + 5, sy * 19 + 2, WATER_Z + 18, PD.tooth);
          for (const sy of [-1, 1]) {                                   // plus the eyes, riding high at the back of the head
            B(r, hx - hl - 2, sy * 13 - 7, top - 4, hx - hl + 14, sy * 13 + 7, top + 6, PD.croc);
            B(r, hx - hl + 2, sy * 13 - 5, top + 6, hx - hl + 11, sy * 13 + 5, top + 8, PD.crocEye);
            B(r, hx - hl + 5, sy * 13 - 5.4, top + 8, hx - hl + 7.5, sy * 13 + 5.4, top + 8.8, PD.socket);
          }
          for (const s of [-1, 1]) plate(r, s > 0 ? hx : -hx - 18, -34, s > 0 ? hx + 18 : -hx, 34, WATER_Z + 1.3, C.foam);
          MD.croc[len] = S.mesh(r);
          /* the upper jaw, hinged at the back of the head so it can snap */
          const u = g0();
          B(u, 0, -22, 0, hl, 22, 12, PD.croc);
          B(u, 4, -18, 12, hl - 8, 18, 15, PD.crocDark);
          B(u, hl - 12, -8, 12, hl - 4, -2, 16, PD.socket); B(u, hl - 12, 2, 12, hl - 4, 8, 16, PD.socket);
          for (let x = 10; x < hl - 6; x += 12) for (const sy of [-1, 1]) B(u, x, sy * 19 - 2, -6, x + 5, sy * 19 + 2, 0, PD.tooth);
          B(u, 6, -15, -1, hl - 6, 15, -.3, PD.mouth);
          MD.croc[len + 'jaw'] = S.mesh(u);
        }
      }

      /* =========================================== the frozen north ===
         Snow in two shades of blue-white; pines in tiers, each tier holding a
         shelf of snow; snowmen, blocks of ice and snowed-over boulders where
         the meadow has rocks, igloos out past the verge; an icy road with
         snow banked along its edges; a cold river carrying ice floes, with
         stepping stones of ice, some of them thin; and a bobsled run walled
         in ice with red stripes along the top. */
      {
        const PA = {
          snowA: paint('#e4edf8'), snowB: paint('#d8e3f2'), road: paint('#667189'), bank: paint('#f5f9ff'), bankShade: paint('#dfe8f4'),
          water: paint('#3a97d6'), ripple: paint('#9fd4f2'), floe: paint('#d9f0fb'), floeTop: paint('#f6fbff'),
          ice: paint('#bfe9fa'), iceTop: paint('#e0f6ff'), thin: paint('#5aa7d4'), thinTop: paint('#80c0e4'), crack: paint('#2d5d84'),
          chute: paint('#d6ecf8'), wall: paint('#eef7ff'), stripe: paint('#e2463c'),
          pine: paint('#2e7a58'), pineDark: paint('#25654a'), trunk: paint('#6f4a38'), snow: paint('#f8fbff'),
          body: paint('#f6f9ff'), coal: paint('#25252c'), carrot: paint('#f28a24'), scarf: paint('#e0413a'), hat: paint('#2b2b34'), stick: paint('#7a5236'),
          rock: paint('#8c95a8'), rockTop: paint('#a4adbf'), iglooLine: paint('#cddff0'), door: paint('#2c3a4f'), spike: paint('#9fdcf5'),
          husky: paint('#8e97a5'), huskyLight: paint('#f1f3f6'), huskyDark: paint('#4f5663'), sled: paint('#a26e42'), sledDark: paint('#7c5230'),
          parka: paint('#e24a3b'), fur: paint('#f3ead8'), skin: paint('#f2c9a0'), pants: paint('#34405a'),
          penguin: paint('#2b2d36'), belly: paint('#f6f7fa'), beak: paint('#f7a21b'),
          bear: paint('#f3efe3'), bearShade: paint('#ddd5c1'), nose: paint('#25252b'),
          blade: paint('#a6afbd'), bladeEdge: paint('#e3e7ed'), suit: paint('#2a3550'), seat: paint('#26262c'), ski: paint('#3a3d46'),
          visor: paint('#9ad4f5'), lumps: paint('#eef4fb'), shard: paint('#b8e6f8'), stone: paint('#9aa2b2')
        };
        const MA = M.arctic = {};
        MA.land = [PA.snowA, PA.snowB].map(c => ground(c, GRASS_Z));
        MA.road = ground(PA.road, 0);
        /* snow banked along the edge of the road, where it meets the drifts */
        g = g0();
        { const rq = stream(5151);
          B(g, -VERGE, -TILE / 2 + .4, 0, VERGE, -TILE / 2 + 7, 3, PA.bankShade);
          for (let x = -VERGE + .5; x < VERGE; x += 30 + rq() * 50) {
            const w = 30 + rq() * 70, d = 8 + rq() * 12;
            B(g, x, -TILE / 2 + .9, 0, x + w, -TILE / 2 + d, 4 + rq() * 6, PA.bank);
          } }
        MA.edge = S.mesh(g);
        MA.water = ground(PA.water, WATER_Z);
        MA.ripple = strokes(PA.ripple, 20250922, WATER_Z + 1.2);
        /* a shelf of ice along the bank, and loose chunks drifting */
        g = g0();
        { const rq = stream(6161);
          B(g, -VERGE, -TILE / 2, WATER_Z - 4, VERGE, -TILE / 2 + 10, WATER_Z + 5, PA.floe);
          for (let x = -VERGE; x < VERGE; x += 40 + rq() * 60) {
            const w = 30 + rq() * 60, d = 12 + rq() * 12;
            B(g, x, -TILE / 2 + 8, WATER_Z - 4, x + w, -TILE / 2 + d, WATER_Z + 4, PA.floe);
          } }
        MA.bank = S.mesh(g);
        g = g0();
        { const rq = stream(7171);
          for (let x = -VERGE; x < VERGE; x += 120 + rq() * 140) {
            const yy = (rq() - .5) * 60, s = 7 + rq() * 8;
            B(g, x - s, yy - s * .8, WATER_Z - 2, x + s, yy + s * .8, WATER_Z + 3, PA.floeTop);
          } }
        MA.chunks = S.mesh(g);
        /* floes: a slab of ice with a lip of snow on top and a ragged edge,
           in three cuts per length */
        MA.floe = {};
        for (const len of [200, 300, 400]) for (let v = 0; v < 3; v++) {
          const f = g0(), rq = stream(len * 7 + v * 131), hx = len / 2 - 6, z0 = WATER_Z - 6, z1 = LOG_TOP - 3;
          B(f, -hx, -30, z0, hx, 30, z1, PA.floe);
          B(f, -hx + 6, -25, z1, hx - 8, 26, LOG_TOP, PA.floeTop);
          for (let x = -hx + 10; x < hx - 30; x += 26 + rq() * 30) {
            const w = 14 + rq() * 26, sy = rq() < .5 ? -1 : 1;
            B(f, x, sy * 30 - (sy > 0 ? 0 : 7), z0 + 2, x + w, sy * 30 + (sy > 0 ? 7 : 0), z1 - 2, PA.floe);
          }
          for (let k = 0; k < 2; k++) { const x = -hx + 30 + rq() * (len - 80); B(f, x, -10, LOG_TOP, x + 16, 6, LOG_TOP + 5, PA.floeTop); }
          for (const s of [-1, 1]) plate(f, s > 0 ? hx : -hx - 16, -34, s > 0 ? hx + 16 : -hx, 34, WATER_Z + 1.3, C.foam);
          MA.floe[len + '.' + v] = S.mesh(f);
        }
        /* Stepping stones of ice: thick blocks with snow on top, standing well
           out of the water. Thin ice is plainly something else: glassy, darker
           blue, already cracked, with three more stages of cracking laid over
           it as it gives. */
        g = g0();
        B(g, -38, -38, -18, 38, 38, 5, PA.ice); B(g, -36, -36, 5, 36, 36, 8, PA.snow);
        B(g, -20, -14, 8, 6, 10, 10.5, PA.lumps);
        MA.pad = S.mesh(g);
        g = g0();
        B(g, -38, -38, -12, 38, 38, 6, PA.thin); B(g, -35, -35, 6, 35, 35, 8, PA.thinTop);
        /* the first cracks: a little star from the middle, in steps */
        for (const [x0, y0, x1, y1] of [[-2, -1.2, 11, 1.2], [10, 1, 20, 3.4], [-12, -1.2, -1, 1.2], [-21, -5, -11, -2.6], [-1.2, 1, 1.2, 12], [-5, 11, -2.6, 20]])
          plate(g, x0, y0, x1, y1, 8.2, PA.crack);
        MA.thin = S.mesh(g);
        MA.cracks = [];
        { const lines = [
            [[1, -12, 3.4, -1], [2, -22, 4.4, -11], [19, 3, 30, 5.4], [-30, -7, -20, -4.6]],
            [[-9, 6, -6.6, 17], [-22, 15, -8, 17.4], [6, 8, 8.4, 24], [8, 22, 20, 24.4], [11, -12, 24, -9.6]],
            [[-14, -20, -11.6, -6], [-28, -22, -13, -19.6], [24, -24, 26.4, -10], [-30, 4, -18, 6.4], [-4, 22, -1.6, 32], [22, 10, 32, 12.4]]
          ];
          let acc = [];
          for (const set of lines) {
            acc = acc.concat(set);
            const c = g0();
            for (const [x0, y0, x1, y1] of acc) plate(c, x0 - .5, y0 - .5, x1 + .5, y1 + .5, 8.4, PA.crack);
            MA.cracks.push(S.mesh(c));
          } }
        /* the bobsled run: an ice floor walled in, red stripes along the top */
        g = g0();
        B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, 0, PA.chute);
        for (const s of [-1, 1]) {
          const y0 = s > 0 ? TILE / 2 - 10 : -TILE / 2, y1 = s > 0 ? TILE / 2 : -TILE / 2 + 10;
          B(g, -VERGE, y0, 0, VERGE, y1, 22, PA.wall);
          for (let x = -VERGE; x < VERGE; x += 80) B(g, x, y0 - .4, 22, x + 40, y1 + .4, 23.6, PA.stripe);
        }
        { const rq = stream(8181);
          for (let x = -VERGE; x < VERGE; x += 90 + rq() * 90) plate(g, x, (rq() - .5) * 50 - 1.5, x + 20 + rq() * 30, (rq() - .5) * 50 + 1.5, .7, PA.snow); }
        MA.chute = S.mesh(g);
        /* snow on the signal boards */
        g = g0();
        for (const sx of [-1, 1]) { B(g, sx * SX - 31, -12, 180, sx * SX + 31, 12, 188, PA.snow); B(g, sx * SX - 17, -17, 10, sx * SX + 17, 17, 16, PA.snow); }
        MA.postSnow = S.mesh(g);

        /* ---- the trees, the snowmen, the ice ---- */
        /* A pine: tiers of green, each carrying snow along its back and one
           side where it has drifted, so from above it is a green tree with snow
           on it rather than a white one; a couple of drips down the front; and
           a cap of snow on the tip. */
        const pine = tiers => {
          const p = g0();
          B(p, -10, -10, 0, 10, 10, 24, PA.trunk);
          let z = 22, w = 40;
          for (let k = 0; k < tiers; k++) {
            const h = 34 - k * 2;
            B(p, -w, -w, z, w, w, z + h, PA.pine);
            if (w > 16) {
              B(p, -w + 2, -w + 2, z + h, w - 3, -w + 9, z + h + 3, PA.snow);
              B(p, -w + 2, -w + 9, z + h, -w + 9, w - 7, z + h + 3, PA.snow);
            }
            for (const dx of [-w * .45, w * .35]) B(p, dx - 4.5, w - 1, z + h - 13 + (dx > 0 ? 4 : 0), dx + 4.5, w + 1.6, z + h - 1, PA.snow);
            z += h; w -= 10;
          }
          B(p, -8, -8, z, 8, 8, z + 14, PA.pine); B(p, -9, -9, z + 12, 9, 9, z + 18, PA.snow);
          return S.mesh(p);
        };
        MA.pine = [null, pine(2), pine(3), pine(4)];
        g = g0();
        B(g, -30, -30, 0, 30, 30, 44, PA.body); B(g, -22, -22, 44, 22, 22, 78, PA.body); B(g, -16, -16, 78, 16, 16, 106, PA.body);
        B(g, -17, -17, 74, 17, 17, 82, PA.scarf); B(g, 5, 17, 56, 13, 24.5, 82, PA.scarf);
        for (const z of [54, 66]) B(g, -3, 21.6, z, 3, 23, z + 6, PA.coal);
        for (const sx of [-1, 1]) B(g, sx * 7 - 3, 15.6, 94, sx * 7 + 3, 17, 100, PA.coal);
        B(g, -3.5, 16, 86, 3.5, 32, 92, PA.carrot);
        B(g, -20, -20, 106, 20, 20, 110, PA.hat); B(g, -13, -13, 110, 13, 13, 132, PA.hat); B(g, -13.6, -13.6, 112, 13.6, 13.6, 117, PA.scarf);
        for (const sx of [-1, 1]) { B(g, sx * 22 - (sx > 0 ? 0 : 22), -2, 62, sx * 22 + (sx > 0 ? 22 : 0), 2, 66, PA.stick); B(g, sx * 38 - 2, -2, 66, sx * 38 + 2, 2, 76, PA.stick); }
        MA.snowman = S.mesh(g);
        g = g0();
        B(g, -36, -36, 0, 36, 36, 54, PA.ice); B(g, -30, -30, 54, 32, 30, 62, PA.iceTop);
        B(g, -36.8, -20, 8, -36, 4, 46, PA.floeTop); B(g, -18, 36, 12, 8, 36.8, 40, PA.floeTop);
        B(g, -20, -20, 62, 6, 10, 66, PA.snow);
        MA.iceBlock = S.mesh(g);
        g = g0();
        B(g, -38, -32, 0, 38, 32, 30, PA.rock); B(g, -26, -22, 30, 28, 22, 44, PA.rockTop);
        B(g, -28, -24, 44, 30, 24, 50, PA.snow); B(g, -39, -33, 26, 39, 33, 31, PA.snow);
        MA.rock = S.mesh(g);
        /* an igloo: courses of snow blocks stepping in to a dome, a tunnel */
        g = g0();
        { let z = 0;
          [[74, 20], [68, 20], [58, 18], [44, 16], [26, 12]].forEach(([w, h], k) => {
            B(g, -w, -w, z, w, w, z + h, PA.body);
            B(g, -w - .6, -w - .6, z + h - 2.4, w + .6, w + .6, z + h - .5, PA.iglooLine);
            for (let x = -w + (k & 1 ? 18 : 6); x < w - 4; x += 24) B(g, x, w, z + 2, x + 2, w + .6, z + h - 2, PA.iglooLine);
            z += h;
          });
          B(g, -22, 60, 0, 22, 104, 44, PA.body); B(g, -23, 60.5, 40, 23, 104.6, 43.4, PA.iglooLine);
          B(g, -13, 104, 0, 13, 104.8, 32, PA.door); }
        MA.igloo = S.mesh(g);
        g = g0();
        for (const [x, y, h, w] of [[0, 0, 120, 12], [22, 8, 80, 9], [-16, 14, 64, 8], [8, -18, 52, 7]]) {
          B(g, x - w, y - w, 0, x + w, y + w, h, PA.spike); spire(g, x - w, y - w, x + w, y + w, h, h + w * 2.2, PA.floeTop);
        }
        MA.spikes = S.mesh(g);
        MA.deco = [];
        for (let v = 0; v < DECO_N; v++) {
          const d = g0(), rq = stream(2000 + v * 97);
          for (let n = 0; n < 16; n++) {
            const x = -VERGE + 40 + rq() * (VERGE * 2 - 80), y = (rq() - .5) * 72, k = rq();
            if (k < .4) { const s = 5 + rq() * 7; B(d, x - s, y - s * .7, 0, x + s, y + s * .7, 3 + rq() * 4, PA.lumps); }
            else if (k < .6) { B(d, x - 3, y - 3, 0, x + 3, y + 3, 12 + rq() * 8, PA.shard); B(d, x + 4, y - 2, 0, x + 8, y + 2, 7, PA.shard); }
            else if (k < .78) { B(d, x - 5, y - 4, 0, x + 5, y + 4, 4, PA.stone); B(d, x - 4, y - 3, 4, x + 4, y + 3, 5.5, PA.snow); }
            else if (k < .9) { const sz = 9 + rq() * 8; B(d, x - sz, y - sz * .6, 0, x + sz, y + sz * .6, 5 + rq() * 4, PA.lumps); }
            else for (let s = 0; s < 3; s++) { const fy = y + s * 11; B(d, x - 3 + (s & 1) * 7, fy - 2, 0, x + 1 + (s & 1) * 7, fy + 2, .6, PA.stone); }
          }
          MA.deco.push(S.mesh(d));
        }

        /* ---- the traffic, facing +x ---- */
        const tyres = (t, xs, hw, h, y0, y1) => {
          for (const sx of xs) for (const sy of [-1, 1]) {
            B(t, sx - hw, sy * y0, 0, sx + hw, sy * y1, h, C.tyre);
            B(t, sx - hw * .4, sy * (y1 + .01), h * .3, sx + hw * .4, sy * (y1 + 1.6), h * .7, C.hub);
          }
        };
        const V = MA.veh = [];
        {   /* snowplough: a spreader body in its colour, a white cab, the blade, and a beacon */
          const b = g0(), t = g0(), l = g0();
          B(b, -128, -36, 14, 40, 36, 82, C.white); B(b, 40, -34, 14, 98, 34, 56, C.white);
          B(t, 40, -33, 56, 96, 33, 100, C.cabin);
          B(t, 95, -28, 62, 97.6, 28, 92, C.glass); for (const sy of [-1, 1]) B(t, 50, sy * 32.6, 62, 88, sy * 34.2, 92, C.glass);
          B(t, 104, -50, 4, 116, 50, 50, PA.blade); B(t, 114, -49.4, 2, 120, 49.4, 12, PA.bladeEdge);
          for (const sy of [-1, 1]) B(t, 96, sy * 14 - 5, 18, 106, sy * 14 + 5, 30, C.hub);
          for (let x = -118; x < 34; x += 38) B(t, x, -36.6, 30, x + 18, 36.6, 36, PA.bladeEdge);
          B(t, -134, -10, 22, -128, 10, 34, C.hub);
          tyres(t, [-86, -30, 72], 17, 32, 24, 38);
          lamps(t, 98, -128, 22, 32, 34);
          B(l, 60, -9, 100, 78, 9, 112, C.white);
          V.push({ body: S.mesh(b), trim: S.mesh(t), lamp: S.mesh(l) });
        }
        {   /* snowmobile: a hull in its colour, a rider, skis in front, a track behind */
          const b = g0(), t = g0();
          B(b, -52, -24, 12, 30, 24, 32, C.white); B(b, 30, -20, 10, 60, 20, 28, C.white); B(b, 36, -15, 28, 56, 15, 36, C.white);
          B(t, 24, -18, 32, 28, 18, 52, PA.visor);
          B(t, -44, -16, 32, 0, 16, 42, PA.seat);
          B(t, 14, -24, 42, 18, 24, 46, C.hub);
          B(t, -30, -16, 42, -4, 16, 74, PA.suit);
          for (const sy of [-1, 1]) B(t, -8, sy * 16 - (sy > 0 ? 0 : 6), 52, 16, sy * 16 + (sy > 0 ? 6 : 0), 60, PA.suit);
          B(t, -27, -11, 74, -5, 11, 96, PA.body); B(t, -5.5, -8, 80, -3.8, 8, 90, C.glass);
          for (const sy of [-1, 1]) { B(t, 30, sy * 23 - 4, 0, 72, sy * 23 + 4, 4, PA.ski); B(t, 68, sy * 23 - 4, 4, 76, sy * 23 + 4, 12, PA.ski); B(t, 40, sy * 23 - 2, 4, 44, sy * 23 + 2, 12, PA.ski); }
          B(t, -56, -20, 0, -6, 20, 14, C.tyre);
          for (let x = -52; x < -8; x += 10) B(t, x, -20.6, 2, x + 4, 20.6, 12, PA.ski);
          B(t, 59, -8, 18, 61.5, 8, 24, C.head);
          V.push({ body: S.mesh(b), trim: S.mesh(t) });
        }
        {   /* The husky team: a dog, drawn four times, with four legs that trot;
               the sled with its load, and the musher standing on the runners. */
          const dog = g0();
          B(dog, -26, -8, 20, 18, 8, 38, PA.husky); B(dog, 8, -8.4, 18, 22, 8.4, 36, PA.huskyLight);
          B(dog, 16, -7.6, 30, 36, 7.6, 48, PA.husky); B(dog, 28, -6, 30, 38.5, 6, 42, PA.huskyLight);
          B(dog, 36, -4, 30, 45, 4, 38.5, PA.huskyLight); B(dog, 44, -2, 34, 46.5, 2, 37.5, PA.nose);
          for (const sy of [-1, 1]) {
            B(dog, 18, sy * 5 - 2, 47, 24, sy * 5 + 2, 56, PA.huskyDark);
            B(dog, 33, sy * 6 - (sy > 0 ? -1.6 : 3), 42.5, 37, sy * 6 + (sy > 0 ? 3 : -1.6), 45.5, C.eye);
          }
          B(dog, -32, -3, 34, -24, 3, 52, PA.husky); B(dog, -30, -2.6, 50, -22, 2.6, 57, PA.huskyLight);
          B(dog, -20, -9, 31.5, 6, 9, 36.5, PA.parka);
          const dleg = g0();
          B(dleg, -3, -2.5, -22, 3, 2.5, 3, PA.husky); B(dleg, -3.6, -3, -22, 3.6, 3, -18, PA.huskyLight);
          const s = g0();
          for (const sy of [-1, 1]) { B(s, -165, sy * 22 - 3, 0, -50, sy * 22 + 3, 4, PA.sledDark); B(s, -56, sy * 22 - 3, 4, -48, sy * 22 + 3, 18, PA.sledDark); }
          B(s, -158, -26, 10, -58, 26, 18, PA.sled);
          for (const sy of [-1, 1]) B(s, -158, sy * 24 - 2, 18, -80, sy * 24 + 2, 38, PA.sledDark);
          B(s, -150, -18, 18, -94, 18, 40, PA.parka);
          for (const sy of [-1, 1]) B(s, -163, sy * 20 - 2, 18, -157, sy * 20 + 2, 70, PA.sledDark);
          B(s, -163, -24, 64, -157, 24, 70, PA.sledDark);
          B(s, -50, -1.5, 26, 110, 1.5, 28, PA.sledDark);
          B(s, -164, -10, 4, -152, 10, 40, PA.pants);
          B(s, -166, -14, 40, -150, 14, 76, PA.parka); B(s, -164, -11, 76, -150, 11, 96, PA.fur); B(s, -151, -7, 80, -149.4, 7, 90, PA.skin);
          V.push({ sled: S.mesh(s), dog: S.mesh(dog), dleg: S.mesh(dleg) });
        }
        {   /* Penguins tobogganing: a body sliding on its belly with its head
               up, and two flippers hinged at the shoulders that paddle at the ice. */
          const p = g0();
          B(p, -28, -16, 3, 22, 16, 25, PA.penguin); B(p, -24, -16.6, 3, 18, 16.6, 11, PA.belly);
          B(p, 18, -13, 8, 40, 13, 32, PA.penguin);
          for (const sy of [-1, 1]) {
            B(p, 26, sy * 13 - (sy > 0 ? 0 : 1), 14, 36, sy * 13 + (sy > 0 ? 1 : 0), 26, PA.belly);
            B(p, 31, sy * 14 - (sy > 0 ? 0 : 1.2), 19, 34.5, sy * 14 + (sy > 0 ? 1.2 : 0), 23, PA.coal);
            B(p, -38, sy * 6 - 3, 3, -28, sy * 6 + 3, 7, PA.beak);
          }
          B(p, 40, -4, 14, 52, 4, 21, PA.beak);
          const fl = sy => { const f = g0(); B(f, -9, Math.min(0, sy * 15), -2, 9, Math.max(0, sy * 15), 2, PA.penguin); return S.mesh(f); };
          V.push({ penguin: S.mesh(p), flipL: fl(1), flipR: fl(-1) });
        }
        {   /* A polar bear: its body and shoulder hump; its head hinged at the
               neck, so it can nod and swing low the way a bear's does; and a
               leg, drawn at each of the four corners in a walking order. */
          const c = g0();
          B(c, -78, -32, 40, 56, 32, 100, PA.bear); B(c, 8, -28, 96, 46, 28, 108, PA.bear);
          B(c, -78.6, -32.6, 39.4, 56.6, 32.6, 50, PA.bearShade);
          B(c, -86, -7, 80, -78, 7, 94, PA.bear);
          const h = g0();
          B(h, 0, -22, -20, 42, 22, 20, PA.bear);
          B(h, 40, -12, -18, 62, 12, 2, PA.bearShade); B(h, 60, -5, -8, 64.5, 5, 3, PA.nose);
          for (const sy of [-1, 1]) {
            B(h, 4, sy * 16 - 4, 18, 14, sy * 16 + 4, 26, PA.bear);
            B(h, 42, sy * 13 - 3, 5, 43.5, sy * 13 + 3, 11, PA.nose);
          }
          const l = g0();
          B(l, -14, -12, -46, 14, 12, 4, PA.bear); B(l, -15, -13, -50, 15, 13, -44, PA.bearShade);
          V.push({ bear: S.mesh(c), head: S.mesh(h), leg: S.mesh(l) });
        }
        /* the bobsled: a hull in its colour, four riders, runners */
        {
          const b = g0(), t = g0();
          B(b, -126, -32, 8, 100, 32, 34, C.white); B(b, 100, -26, 8, 134, 26, 28, C.white); B(b, 64, -28, 34, 100, 28, 46, C.white);
          B(b, -132, -30, 8, -126, 30, 40, C.white);
          B(t, -127, -33, 18, 101, 33, 23, C.cabin);
          for (const sy of [-1, 1]) B(t, -112, sy * 26 - 3, 0, 128, sy * 26 + 3, 8, C.hub);
          for (const sy of [-1, 1]) B(t, -130, sy * 26 - 2, 30, -118, sy * 26 + 2, 60, C.hub);
          [[42, '#f4f4f6'], [8, '#ffd23a'], [-26, '#f4f4f6'], [-60, '#ffd23a']].forEach(([x, hc]) => {
            B(t, x - 14, -20, 30, x + 10, 20, 42, PA.suit);
            B(t, x - 12, -14, 42, x + 12, 14, 64, paint(hc));
            B(t, x + 11, -11, 48, x + 13, 11, 56, C.glass);
          });
          MA.sled = { body: S.mesh(b), trim: S.mesh(t) };
        }
      }

      /* ================================================= the magma fields ===
         Dark basalt in two shades with glowing cracks in it; charred trees,
         obsidian and hissing vents where the meadow has trees and rocks,
         smoking cones past the verge; an obsidian road with glowing lines; a
         river of lava carrying rafts of basalt, and basalt columns standing
         in it to step on; and a channel the lava surges down. Everything that
         glows is its own mesh, drawn in a material that lights itself. */
      {
        const PV = {
          ashA: paint('#4d454a'), ashB: paint('#564e53'), glow: paint('#ff7a1f'), hot: paint('#ffc545'),
          road: paint('#37313a'), dash: paint('#ff9a2c'), lava: paint('#ff6d17'), lavaHi: paint('#ffc23d'), crust: paint('#5a2716'), crustTop: paint('#713220'),
          basalt: paint('#433c40'), basaltTop: paint('#5c5459'), obsidian: paint('#2b2433'), obsidianTop: paint('#4a3a5e'), sheen: paint('#7b64a3'),
          char: paint('#2c2528'), charLight: paint('#3f3538'), stone: paint('#625a5e'), stoneTop: paint('#756c70'), bone: paint('#e8e0cf'),
          chan: paint('#3b3437'), chanWall: paint('#4b4347'), ember: paint('#ff9d33'),
          rock: paint('#48404a'), rockTop: paint('#5b5259'), stripe: paint('#f2c21b'), stripeDark: paint('#27272d'), cab: paint('#d9433a')
        };
        const MV = M.volcano = {};
        MV.land = [PV.ashA, PV.ashB].map(c => ground(c, GRASS_Z));
        MV.road = ground(PV.road, 0);
        g = g0();
        for (let x = -VERGE + 20; x < VERGE; x += 112) B(g, x, -3.5, 0, x + 60, 3.5, .9, PV.dash);
        MV.dash = S.mesh(g);
        MV.lava = ground(PV.lava, WATER_Z);
        MV.ripple = strokes(PV.lavaHi, 20250923, WATER_Z + 1.2);
        /* rafts of crust drifting on it, and a lip of cooled rock at the bank
           with a hot seam under it */
        g = g0();
        { const rq = stream(4343);
          for (let x = -VERGE; x < VERGE; x += 140 + rq() * 160) {
            const yy = (rq() - .5) * 56, w = 30 + rq() * 40, d = 10 + rq() * 12;
            B(g, x, yy - d, WATER_Z - 2, x + w, yy + d, WATER_Z + 2.5, PV.crust);
            B(g, x + 5, yy - d + 4, WATER_Z + 2.5, x + w - 6, yy + d - 4, WATER_Z + 3.5, PV.crustTop);
          } }
        MV.crust = S.mesh(g);
        g = g0();
        { const rq = stream(4747);
          B(g, -VERGE, -TILE / 2, WATER_Z - 6, VERGE, -TILE / 2 + 8, WATER_Z + 6, PV.basalt);
          for (let x = -VERGE; x < VERGE; x += 40 + rq() * 60) B(g, x, -TILE / 2 + 6, WATER_Z - 6, x + 30 + rq() * 50, -TILE / 2 + 12 + rq() * 8, WATER_Z + 4, PV.basalt);
        }
        MV.bank = S.mesh(g);
        g = g0(); plate(g, -VERGE, -TILE / 2 + 8, VERGE, -TILE / 2 + 13, WATER_Z + .8, PV.hot); MV.bankGlow = S.mesh(g);
        /* basalt rafts, in three cuts per length, each with a hot rim where it
           sits in the lava */
        MV.raft = {}; MV.raftGlow = {};
        for (const len of [200, 300, 400]) {
          for (let v = 0; v < 3; v++) {
            const f = g0(), rq = stream(len * 11 + v * 57), hx = len / 2 - 6, z0 = WATER_Z - 6, z1 = LOG_TOP - 3;
            B(f, -hx, -30, z0, hx, 30, z1, PV.basalt);
            for (let x = -hx + 4; x < hx - 20; x += 30 + rq() * 26) { const w = 22 + rq() * 26; B(f, x, -26 + rq() * 8, z1, Math.min(hx - 4, x + w), 22 + rq() * 6, LOG_TOP, PV.basaltTop); }
            for (let k = 0; k < 2; k++) { const x = -hx + 20 + rq() * (len - 60); B(f, x, -14, LOG_TOP, x + 14, 2, LOG_TOP + 6, PV.stone); }
            MV.raft[len + '.' + v] = S.mesh(f);
          }
          const gl = g0(), hx = len / 2 - 6;
          B(gl, -hx - 3, -33, WATER_Z - 1, hx + 3, 33, WATER_Z + 3, PV.hot);
          MV.raftGlow[len] = S.mesh(gl);
        }
        /* a basalt column to step on, and its hot ring */
        g = g0(); hexPrism(g, 0, 0, -22, 8, 40, PV.basalt, PV.basaltTop); MV.pad = S.mesh(g);
        g = g0(); hexPrism(g, 0, 0, -3, 1, 44, PV.hot, PV.hot); MV.padGlow = S.mesh(g);
        /* the surge channel: a trench in the rock, with cracks along its bed */
        g = g0();
        B(g, -VERGE, -TILE / 2, -180, VERGE, TILE / 2, 0, PV.chan);
        for (const s of [-1, 1]) {
          const y0 = s > 0 ? TILE / 2 - 12 : -TILE / 2, y1 = s > 0 ? TILE / 2 : -TILE / 2 + 12;
          B(g, -VERGE, y0, 0, VERGE, y1, 14, PV.chanWall);
          const rq = stream(s > 0 ? 5353 : 5454);
          for (let x = -VERGE; x < VERGE; x += 60 + rq() * 80) B(g, x, y0 - (s > 0 ? 3 : -1), 14, x + 20 + rq() * 40, y1 + (s > 0 ? -1 : 3), 18 + rq() * 6, PV.stone);
        }
        MV.chan = S.mesh(g);
        g = g0();
        { const rq = stream(5555);
          for (let x = -VERGE; x < VERGE; x += 50 + rq() * 60) {
            let cx = x, cy = (rq() - .5) * 40;
            for (let k = 0; k < 3; k++) { const nx = cx + 14 + rq() * 18, ny = cy + (rq() - .5) * 16; plate(g, Math.min(cx, nx), Math.min(cy, ny) - 1.5, Math.max(cx, nx), Math.max(cy, ny) + 1.5, .6, PV.glow); cx = nx; cy = ny; }
          } }
        MV.chanCracks = S.mesh(g);
        /* basalt pillars for signals, each with a crystal lamp in two halves */
        g = g0();
        for (const sx of [-1, 1]) {
          const x = sx * SX;
          hexPrism(g, x, 0, 0, 150, 18, PV.basalt, PV.basaltTop); hexPrism(g, x - 14, 8, 0, 90, 11, PV.basalt, PV.basaltTop);
          B(g, x - 26, -8, 150, x + 26, 8, 158, PV.stone);
        }
        MV.posts = S.mesh(g);
        for (const [name, o] of [['lampA', -12], ['lampB', 12]]) {
          g = g0();
          for (const sx of [-1, 1]) { B(g, sx * SX + o - 8, -8, 158, sx * SX + o + 8, 8, 172, C.white); spire(g, sx * SX + o - 8, -8, sx * SX + o + 8, 8, 172, 186, C.white); }
          MV[name] = S.mesh(g);
        }
        /* the surge itself: a slab of lava stretched to its length, a
           bulging front, and crust riding on it */
        g = g0(); B(g, -50, -44, 0, 50, 44, 24, PV.lava); B(g, -50, -30, 24, 50, 30, 28, PV.lavaHi); MV.surge = S.mesh(g);
        g = g0();
        B(g, -40, -46, 0, 30, 46, 40, PV.lava); B(g, -24, -40, 40, 22, 40, 54, PV.lavaHi); B(g, 30, -40, 0, 50, 40, 30, PV.lavaHi); B(g, 50, -30, 0, 62, 30, 14, PV.hot);
        MV.surgeHead = S.mesh(g);
        g = g0(); B(g, -34, -20, 28, 14, 16, 33, PV.crust); B(g, 20, -30, 28, 46, -8, 32, PV.crust); B(g, -10, 18, 28, 26, 34, 31, PV.crust); MV.surgeCrust = S.mesh(g);

        /* ---- what stands on it ---- */
        const deadTree = H => {
          const t = g0(), e = g0();
          B(t, -24, -24, 0, 24, 24, 10, PV.charLight); B(t, -18, -18, 10, 18, 18, 18, PV.charLight);
          B(t, -15, -15, 18, 15, 15, Math.round(H * .6), PV.char); B(t, -12, -13, Math.round(H * .6), 14, 11, H, PV.char);
          const zb = Math.round(H * .5), zc = Math.round(H * .72);
          B(t, 11, -5, zb, 42, 5, zb + 9, PV.char); B(t, 34, -5, zb + 9, 43, 5, zb + 30, PV.char);
          B(t, -38, -4, zc, -9, 4, zc + 8, PV.char); B(t, -42, -4, zc + 8, -33, 4, zc + 24, PV.char);
          B(t, -4, 8, Math.round(H * .8), 4, 30, Math.round(H * .8) + 7, PV.char);
          for (const [x0, y0, z0, x1, y1, z1] of [[35, -4, zb + 30, 42, 4, zb + 35], [-41, -3, zc + 24, -34, 3, zc + 29], [-3, 29, Math.round(H * .8), 3, 33, Math.round(H * .8) + 6], [-6, -6, H, 6, 6, H + 5]])
            B(e, x0, y0, z0, x1, y1, z1, PV.ember);
          B(e, 15.2, -3, Math.round(H * .3), 15.9, 3, Math.round(H * .3) + 14, PV.glow);
          B(e, -3, -15.9, Math.round(H * .45), 3, -15.2, Math.round(H * .45) + 10, PV.glow);
          return [S.mesh(t), S.mesh(e)];
        };
        MV.tree = [null, deadTree(100), deadTree(150), deadTree(200)];
        g = g0();
        for (const [x, y, h, w] of [[-4, -4, 78, 16], [22, 12, 50, 11], [-20, 18, 40, 10], [16, -20, 34, 9]]) {
          B(g, x - w, y - w, 0, x + w, y + w, h, PV.obsidian); spire(g, x - w, y - w, x + w, y + w, h, h + w * 1.8, PV.obsidianTop);
          B(g, x - w - .6, y - w * .4, h * .2, x - w, y + w * .1, h * .9, PV.sheen);
        }
        MV.obsidian = S.mesh(g);
        g = g0();
        for (const [x, y, h, r] of [[0, 0, 70, 20], [-26, 14, 48, 16], [24, 10, 56, 17], [4, -26, 38, 15], [-20, -18, 30, 13]]) hexPrism(g, x, y, 0, h, r, PV.basalt, PV.basaltTop);
        MV.columns = S.mesh(g);
        g = g0();
        B(g, -38, -38, 0, 38, 38, 16, PV.rock); B(g, -28, -28, 16, 28, 28, 30, PV.rock); B(g, -20, -20, 30, 20, 20, 40, PV.rockTop);
        MV.vent = S.mesh(g);
        g = g0(); B(g, -12, -12, 38, 12, 12, 41, PV.hot); B(g, 14, -2, 12, 30, 2, 13, PV.glow); B(g, -2, 20, 22, 2, 28.2, 29.4, PV.glow); MV.ventGlow = S.mesh(g);
        /* a cone past the verge, stepped like everything else, with a glowing
           crater and runs of lava down its side */
        const LAYERS = [[190, 0, 50], [160, 50, 100], [128, 100, 150], [96, 150, 196], [66, 196, 236]];
        g = g0();
        for (const [w, z0, z1] of LAYERS) { B(g, -w, -w, z0, w, w, z1, PV.ashB); B(g, -w - .6, -w - .6, z1 - 6, w + .6, w + .6, z1 - .6, PV.ashA); }
        MV.cone = S.mesh(g);
        g = g0();
        B(g, -44, -44, 236, 44, 44, 238, PV.hot);
        /* runs of lava from the crater, down each riser and across each tread */
        for (const [x, w, from] of [[-20, 12, 4], [30, 10, 4], [-4, 14, 3]]) {
          for (let k = from; k >= 0; k--) {
            const [W, z0, z1] = LAYERS[k];
            B(g, x - w / 2, W - .2, z0 + (k ? 0 : 8), x + w / 2, W + 1.4, z1, PV.glow);
            if (k > 0) B(g, x - w / 2, W, z0, x + w / 2, LAYERS[k - 1][0], z0 + 1.2, PV.glow);
          }
        }
        MV.coneGlow = S.mesh(g);
        MV.deco = []; MV.decoGlow = [];
        for (let v = 0; v < DECO_N; v++) {
          const d = g0(), e = g0(), rq = stream(3000 + v * 89);
          for (let n = 0; n < 16; n++) {
            const x = -VERGE + 40 + rq() * (VERGE * 2 - 80), y = (rq() - .5) * 72, k = rq();
            if (k < .34) { let cx = x, cy = y; for (let s = 0; s < 3; s++) { const nx = cx + 10 + rq() * 16, ny = cy + (rq() - .5) * 14; plate(e, Math.min(cx, nx), Math.min(cy, ny) - 1.4, Math.max(cx, nx), Math.max(cy, ny) + 1.4, .7, PV.glow); cx = nx; cy = ny; } }
            else if (k < .62) { B(d, x - 6, y - 5, 0, x + 6, y + 5, 5, PV.stone); if (rq() < .5) B(d, x + 7, y, 0, x + 12, y + 4, 3, PV.stone); }
            else if (k < .8) { B(d, x - 9, y - 7, 0, x + 9, y + 7, 3, PV.charLight); B(d, x - 5, y - 4, 3, x + 5, y + 4, 6, PV.charLight); }
            else if (k < .92) { B(d, x - 5, y - 5, 0, x + 5, y + 5, 8, PV.rock); B(e, x - 2.5, y - 2.5, 8, x + 2.5, y + 2.5, 8.8, PV.hot); }
            else { B(d, x - 8, y - 6, 0, x + 8, y + 7, 7, PV.bone); B(d, x - 5, y + 1, 7, x - 1, y + 5, 7.6, PV.char); B(d, x + 1, y + 1, 7, x + 5, y + 5, 7.6, PV.char); }
          }
          MV.deco.push(S.mesh(d)); MV.decoGlow.push(S.mesh(e));
        }

        /* ---- the traffic, facing +x ---- */
        const tyres = (t, xs, hw, h, y0, y1) => {
          for (const sx of xs) for (const sy of [-1, 1]) {
            B(t, sx - hw, sy * y0, 0, sx + hw, sy * y1, h, C.tyre);
            B(t, sx - hw * .4, sy * (y1 + .01), h * .3, sx + hw * .4, sy * (y1 + 1.6), h * .7, C.hub);
          }
        };
        const V = MV.veh = [];
        {   /* haul truck: a dump bed of rock over giant tyres, the cab off to one side */
          const b = g0(), t = g0();
          B(b, -150, -38, 30, 150, 38, 48, C.white);
          B(b, -150, -38, 48, 56, 38, 110, C.white); B(b, 56, -38, 104, 146, 38, 112, C.white);
          B(b, 62, 4, 48, 140, 38, 104, C.white);
          B(t, -142, -32, 110, 48, 32, 116, PV.rock);
          { const rq = stream(8888); for (let k = 0; k < 9; k++) { const x = -136 + rq() * 170, y = (rq() - .5) * 44, s = 10 + rq() * 12; B(t, x - s, y - s, 110, x + s, y + s, 116 + s, rq() < .25 ? PV.hot : PV.rockTop); } }
          B(t, 139.4, 8, 62, 141, 34, 96, C.glass); B(t, 70, 37.6, 62, 132, 39.2, 96, C.glass);
          B(t, 146, -37.6, 30, 154, 37.6, 70, C.grille);
          for (const sy of [-1, 1]) B(t, 152, sy * 26 - 6, 46, 154.5, sy * 26 + 6, 58, C.head);
          tyres(t, [-96, 96], 30, 62, 22, 46);
          V.push({ body: S.mesh(b), trim: S.mesh(t) });
        }
        /* boulders: a chunky round rock with cracks of magma in it */
        const boulder = R => {
          const b = g0(), e = g0();
          B(b, -R, -R * .78, -R * .76, R, R * .78, R * .76, PV.rock);
          B(b, -R * .8, -R, -R * .74, R * .8, R, R * .74, PV.rock);
          B(b, -R * .74, -R * .72, -R, R * .74, R * .72, R, PV.rockTop);
          const f = .8;
          B(e, -R * .5, -R - .6, -R * .1, R * .3, -R + .6 * f, R * .05, PV.glow); B(e, R * .2, -R - .6, -R * .5, R * .32, -R + .6 * f, R * .1, PV.glow);
          B(e, -R * .4, R - .6 * f, -R * .2, R * .45, R + .6, -R * .08, PV.glow); B(e, -R * .1, -R * .3, R - .6 * f, R * .12, R * .5, R + .6, PV.glow);
          B(e, R - .6 * f, -R * .3, R * .2, R + .6, R * .4, R * .32, PV.glow); B(e, -R - .6, -R * .2, -R * .3, -R + .6 * f, R * .3, -R * .18, PV.glow);
          return { rock: S.mesh(b), glow: S.mesh(e), R };
        };
        V.push(boulder(46), boulder(64));
        {   /* magma tanker: a red cab pulling a silver tank with a hot band round it */
          const b = g0(), t = g0(), e = g0();
          B(b, -143, -30, 30, 56, 30, 96, C.white); B(b, -143, -36, 38, 56, 36, 88, C.white);
          B(t, 60, -34, 20, 143, 34, 98, PV.cab); B(t, 142, -28, 50, 144.6, 28, 86, C.glass);
          for (const sy of [-1, 1]) B(t, 76, sy * 33.6, 56, 128, sy * 35.2, 86, C.glass);
          B(t, -143, -33, 18, 141, 33, 28.5, C.grille);
          for (let k = 0; k < 6; k++) B(t, -144.4, -30 + k * 10, 40, -143, -25 + k * 10, 84, k & 1 ? PV.stripe : PV.stripeDark);
          B(t, -60, -14, 96, 20, 14, 102, C.hub);
          B(e, -104, -36.8, 52, -64, 36.8, 72, PV.glow); B(e, 20, -36.8, 52, 44, 36.8, 72, PV.glow);
          tyres(t, [-110, -70, 110], 16, 30, 24, 38);
          lamps(t, 143, -143, 22, 32, 34);
          V.push({ body: S.mesh(b), trim: S.mesh(t), glow: S.mesh(e) });
        }
      }

      /* ---- the flags at a border: a pole, and a flag in the country's
         colours with its emblem picked out in blocks ---- */
      g = g0();
      B(g, -9, -9, 0, 9, 9, 12, paint('#8f8778'));
      B(g, -5, -5, 12, 5, 5, 204, paint('#6a4a36'));
      B(g, -8, -8, 204, 8, 8, 214, paint('#f2c14e'));
      M.gatePole = S.mesh(g);
      M.gate = {};
      const EMBLEM = {
        meadow:  ['..###..', '.#####.', '#######', '.#####.', '...#...', '...#...', '..###..'],
        desert:  ['...#...', '.#.#...', '.#.#.#.', '.###.#.', '...###.', '...#...', '..###..'],
        arctic:  ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'],
        volcano: ['...#...', '..##...', '..###.#', '.#####.', '##.####', '##..###', '.#####.']
      };
      for (const [b, face, trim, ink] of [['meadow', '#7bc443', '#ffffff', '#2f7d3a'], ['desert', '#f0b43c', '#d8433a', '#3f8f3c'],
                                          ['arctic', '#3aa0ff', '#ffffff', '#ffffff'], ['volcano', '#2c2528', '#ff7a1f', '#ff9a2c']]) {
        const f = g0();
        B(f, 5, -2, 132, 97, 2, 198, paint(face));
        B(f, 4.4, -2.4, 131.4, 97.6, 2.4, 138, paint(trim)); B(f, 4.4, -2.4, 192, 97.6, 2.4, 198.6, paint(trim));
        EMBLEM[b].forEach((row, ri) => [...row].forEach((ch, ci) => {
          if (ch !== '#') return;
          const x = 51 - 21 + ci * 6, z = 186 - ri * 6;
          for (const sy of [-1, 1]) B(f, x, sy * 2, z - 6, x + 6, sy * 3.4, z, paint(ink));
        }));
        M.gate[b] = S.mesh(f);
      }

      MESH = M;

      /* ---- materials ----
         One kind for everything: flat colour, no gloss, no grain. What sells a
         voxel world is hard edges and three clear tones per block, and the
         procedural surfaces this used to wear — turf stripes, asphalt grain,
         bark, leaf — all worked against that. */
      const flat = o => R3.mat(Object.assign({ kind: K.PLAIN, spec: 0, gloss: 4, wrap: WRAP }, o || {}));
      const tint = hex => paint(hex).slice(0, 3);
      MAT = {
        ground: flat({ cast: false }),
        mark: flat({ cast: false }),
        foam: flat({ cast: false }),
        /* one per ring: a material is read when the frame is flushed, so two
           rings sharing one would both wear the last alpha it was given */
        ring: [flat({ cast: false, alpha: .9 }), flat({ cast: false, alpha: .9 }), flat({ cast: false, alpha: .9 })],
        /* and one per landing ripple, for the same reason */
        rip: [0, 1, 2, 3, 4, 5].map(() => flat({ cast: false, alpha: .6 })),
        prop: flat({}),
        lampOn: flat({ tint: tint('#ff5a44'), emit: L('#ff3a24', 1.1) }),
        lampOff: flat({ tint: tint('#5a2b26') }),
        tree: ['#9dbd2e', '#8fb52a', '#a9c536'].map(h => flat({ tint: tint(h) })),
        car: CAR_COLS.map(h => flat({ tint: tint(h) })),
        trim: flat({}),
        coin: flat({ emit: L('#a07400', .55) }),
        train: flat({ tint: tint('#e0493d') }),
        carriage: flat({ tint: tint('#f2ede2') }),
        /* every bird's colours, so the front page can swap one for another;
           birdBody/Trim/Beak below point at whichever is worn */
        bird: (() => {
          const o = {};
          for (const id of BIRD_IDS) o[id] = { body: flat({ tint: tint(BIRDS[id].body) }), trim: flat({ tint: tint(BIRDS[id].trim) }),
                                               beak: flat({ tint: tint(BIRDS[id].beak) }) };
          return o;
        })(),
        birdEye: flat({}),
        eagle: flat({}),
        /* rivals wear their slot rather than their own bird, so two hens are
           still two different birds on the board */
        peer: ['#f8fafc', '#f5cf3f', '#7dd3fc', '#f472b6'].map(c => flat({ tint: tint(c) }))
      };
      MAT.birdBody = MAT.bird[birdId].body; MAT.birdTrim = MAT.bird[birdId].trim; MAT.birdBeak = MAT.bird[birdId].beak;
      /* The other countries' materials. Anything that glows — lava, embers,
         the cracks in the rock, the lines on the obsidian road — is lit from
         within in its own colour, with a slow ripple running through it; the
         surge channel's cracks have a second, brighter one for its warning. */
      const glow = (k, ripple, o) => R3.mat(Object.assign({ kind: K.GLOW, spec: 0, gloss: 4, wrap: WRAP, p1: [k, ripple, 0, 0] }, o || {}));
      MAT.glow = glow(1.25, .3, { cast: false });
      MAT.glowProp = glow(1.4, .35);
      MAT.glowWarn = glow(3.2, .55, { cast: false });
      MAT.lava = glow(.62, .32, { cast: false });
      MAT.lavaHot = glow(1.05, .4);
      MAT.amberOn = flat({ tint: tint('#ffb21f'), emit: L('#ff9a10', 1.3) });
      MAT.amberOff = flat({ tint: tint('#7a5a1e') });
      MAT.skullOn = flat({ tint: tint('#ff4a2a'), emit: L('#ff2a10', 1.4) });
      MAT.skullOff = flat({ tint: tint('#2a1c18') });
      MAT.crystalOn = flat({ tint: tint('#ffb040'), emit: L('#ff7a10', 1.5) });
      MAT.crystalOff = flat({ tint: tint('#5a2a14') });
      MAT.charred = flat({ tint: tint('#3b3336') });
      /* one flat material per paint a body can come in, made when first asked for */
      const painted = {};
      MAT.paint = hex => painted[hex] || (painted[hex] = flat({ tint: tint(hex) }));
    }

    const ghost = {};                       // a rival as it is drawn, by id
    const PEER_INK = ['#f8fafc', '#f5cf3f', '#7dd3fc', '#f9a8d4'];
    /* A rival, played from its packets on the render clock. Every hop it
       sends is played through as a hop — the same 0.125s, the same arc, the
       same squash on landing — so a rival moves the way your own bird does
       instead of sliding along the ground. A hop that arrives while one is
       still in the air waits its turn, and a queue that builds up is played
       quicker, so a rival never falls behind its own moves. Between hops it
       settles on the spot it says it is standing on; on a log that spot
       travels, so it is carried along at the log's own pace, measured from
       the last two packets. A rival on an older build sends no hops and is
       eased from spot to spot as it always was. */
    function rival(id, q) {
      const dt = rDt, ty = -(q.r || 0) * TILE;
      let gs = ghost[id];
      if (!gs) {
        gs = ghost[id] = { x: q.x || 0, y: ty, z: q.z || 0, f: q.f || 0, h: q.h, hop: null, que: [], sqx: 1, sqz: 1, gone: 0,
                           pk: q, vx: 0, lx: q.x || 0, lt: q._t || Date.now() };
      }
      /* out, or gone from the race altogether: popped away either way */
      const board = RACE.board[id];
      gs.gone = q.d || (board && board.gone) ? Math.min(1, gs.gone + dt / .35) : 0;
      /* a fresh packet: a new hop to queue, or the carry of whatever it stands on */
      if (gs.pk !== q) {
        const t = q._t || Date.now();
        if (q.h !== undefined && q.h !== gs.h) {
          /* two hops that landed in one frame: the first ends where the second began */
          if (gs.h !== undefined && q.h - gs.h > 1 && q.fr !== undefined) gs.que.push({ x: q.fx, y: -q.fr * TILE, z: q.fz });
          gs.h = q.h;
          gs.que.push({ x: q.x || 0, y: ty, z: q.z || 0 });
          while (gs.que.length > 3) gs.que.shift();
          gs.vx = 0;
        } else if (!gs.hop && !gs.que.length) {
          const span = (t - gs.lt) / 1000;
          /* smoothed over two packets: arrival times jitter, the log does not */
          if (span > .04 && span < .6 && gs.pk && gs.pk.r === q.r) gs.vx += (clamp(((q.x || 0) - gs.lx) / span, -600, 600) - gs.vx) * .5;
          else gs.vx = 0;
        }
        gs.pk = q; gs.lx = q.x || 0; gs.lt = t;
      }
      if (!gs.hop && gs.que.length) {
        const n = gs.que.shift();
        gs.hop = { fx: gs.x, fy: gs.y, fz: gs.z, tx: n.x, ty: n.y, tz: n.z, t: 0 };
        gs.sqx = 1.18; gs.sqz = .8;
      }
      if (gs.hop) {
        const h = gs.hop;
        h.t += dt * (gs.que.length ? 1.7 : 1);
        const k = Math.min(1, h.t / HOP_T);
        gs.x = h.fx + (h.tx - h.fx) * k;
        gs.y = h.fy + (h.ty - h.fy) * k;
        gs.z = h.fz + (h.tz - h.fz) * k + Math.sin(k * Math.PI) * 52;
        if (k >= 1) { gs.x = h.tx; gs.y = h.ty; gs.z = h.tz; gs.hop = null; gs.sqx = .78; gs.sqz = 1.24; }
      } else {
        const age = Math.min(.3, Math.max(0, (Date.now() - gs.lt) / 1000));
        const e = 1 - Math.exp(-dt * (q.h === undefined ? 12 : 18));
        gs.x += ((q.x || 0) + gs.vx * age - gs.x) * e;
        gs.y += (ty - gs.y) * e;
        gs.z += ((q.z || 0) - gs.z) * e;
      }
      const se = Math.min(1, dt * 16);
      gs.sqx += (1 - gs.sqx) * se; gs.sqz += (1 - gs.sqz) * se;
      let da = (q.f || 0) - gs.f;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      gs.f += da * Math.min(1, dt * 20);
      return gs;
    }

    /* ---- out of a race: watching the rest ----
       As in Geometry Dash: once your ending has played, the view swoops to
       someone still running and stays on them until they are out too — a
       moment on the spot where it happened, then on to whoever is left.
       Left and right (or a click) switch between them, Backspace goes back
       to the hub. The card waits for the last of them, and then comes up
       with the whole field on it. The race board that used to sit in the
       corner is gone: the names over the birds say who is where. */
    const spec = { on: false, id: null, from: [0, 0], k: 1, lostT: 0, overT: 0, sayT: 0, popAt: 0, outAt: 0 };
    let outSaid = false;
    const IS_HOST = ONLINE && RACE.cfg.host === RACE.me;
    function liveRivals() {
      const out = [];
      for (const p of ROSTER) {
        if (p.id === RACE.me) continue;
        const b = RACE.board[p.id], q = RACE.peers[p.id];
        if (!b || b.done || (q && q.d)) continue;
        out.push(p.id);
      }
      return out;
    }
    function pickSpec(dir) {
      const list = liveRivals();
      if (!list.length) return;
      let i = list.indexOf(spec.id);
      i = i < 0 ? 0 : (i + dir + list.length) % list.length;
      if (list[i] === spec.id) return;
      spec.id = list[i]; spec.lostT = 0;
      spec.from = [camX, camY]; spec.k = 0; spec.popAt = mT;
    }
    /* true once the race is over and it is time for the card */
    function watch(dt) {
      if (!spec.on) {
        if (RACE.allDone()) return true;           // nobody left to watch
        spec.on = true; spec.id = null;
        pickSpec(0);
      }
      const I = api.input, sw = I.takeSwipe(), clk = I.takeClick();
      const turn = I.anyPressed('ArrowRight', 'KeyD') || sw === 'right' || clk ? 1 : I.anyPressed('ArrowLeft', 'KeyA') || sw === 'left' ? -1 : 0;
      if (turn && liveRivals().length > 1) { pickSpec(turn); try { Sound.blip(); } catch (e) {} }
      /* Backspace is the way out, as on every other screen here. For the
         host that ends the race for everyone, which the hint says first. */
      if (I.anyPressed('Backspace')) { try { location.hash = ''; } catch (e) {} return false; }

      /* the one being watched is out: stay on them a moment, then move on */
      const still = liveRivals();
      if (spec.id && still.indexOf(spec.id) < 0) {
        if (!spec.lostT) spec.outAt = mT;
        spec.lostT += dt;
        if (spec.lostT > 1.3 && still.length) pickSpec(0);
      } else if (!spec.id && still.length) pickSpec(0);

      /* the camera: a swoop to a new bird, eased the whole way however far
         it is, and then the same follow your own bird gets */
      const gs = spec.id ? ghost[spec.id] : null;
      if (gs) {
        const tx = gs.x * .30, ty = gs.y - TILE * 2.4;
        if (spec.k < 1) {
          spec.k = Math.min(1, spec.k + dt / .75);
          const e = spec.k * spec.k * (3 - 2 * spec.k);
          camX = spec.from[0] + (tx - spec.from[0]) * e;
          camY = spec.from[1] + (ty - spec.from[1]) * e;
        } else {
          camX += (tx - camX) * Math.min(1, dt * 6.5);
          camY += (ty - camY) * Math.min(1, dt * 7.5);
        }
      }
      camD += (DIST - camD) * Math.min(1, dt * 2.2);

      /* where you ended, said again now and then in case it went astray */
      if ((spec.sayT += dt) > 1) { spec.sayT = 0; postMe(true); }
      if (RACE.allDone()) { spec.overT += dt; return spec.overT > 1.6; }
      spec.overT = 0;
      return false;
    }
    if (cam) cam.fov = .32;                 // set before orbit(): update() reads it

    /* ------------------------------------------------------ the frame --- */
    const isLand = t => t === 'grass' || t === 'road' || t === 'rail';
    /* a pad rocks on the water, and dips when something lands on it */
    const padZ = p => WATER_Z + 4.5 + Math.sin(tAll * 1.7 + p.ph) * 1.2 + p.dz;
    function drawTrain(r, y) {
      const t = r.train, s = r.dir > 0 ? 1 : -1, rot = s > 0 ? 0 : Math.PI;
      /* the locomotive leads whichever way it is running */
      let cx = t.x + s * (t.len / 2 - LOCO_LEN / 2);
      M4.place(T, cx, y, 0, rot);
      R3.draw(MESH.locoBody, T, MAT.train);
      R3.draw(MESH.locoTrim, T, MAT.trim);
      cx -= s * (LOCO_LEN / 2 + CARR_GAP + CARR_LEN / 2);
      for (let k = 0; k < t.n; k++) {
        M4.place(T, cx, y, 0, rot);
        R3.draw(MESH.carrBody, T, MAT.carriage);
        R3.draw(MESH.carrTrim, T, MAT.trim);
        cx -= s * (CARR_LEN + CARR_GAP);
      }
    }

    /* ============================================ the other countries === */
    const TW = M4.make(), TL = M4.make(), TB = M4.make(), QE = [0, 0, 0, 1], QR = [0, 0, 0, 1];
    /* a turn about the local y axis at a point: the hinge of a jaw or a wing */
    function hingeY(o, ang, px, py, pz) {
      const c = Math.cos(ang), s = Math.sin(ang);
      o[0] = c; o[1] = 0; o[2] = -s; o[3] = 0;
      o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
      o[8] = s; o[9] = 0; o[10] = c; o[11] = 0;
      o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
      return o;
    }
    /* a turn about the local x, y or z axis at a point */
    function hinge(o, axis, ang, px, py, pz) {
      if (axis === 'y') return hingeY(o, ang, px, py, pz);
      const c = Math.cos(ang), s = Math.sin(ang);
      o.fill(0); o[15] = 1;
      if (axis === 'x') { o[0] = 1; o[5] = c; o[6] = s; o[9] = -s; o[10] = c; }
      else { o[0] = c; o[1] = s; o[4] = -s; o[5] = c; o[10] = 1; }
      o[12] = px; o[13] = py; o[14] = pz;
      return o;
    }
    /* everything in a block world stands square to the grid */
    const quarter = a => Math.round(a / (Math.PI / 2)) * Math.PI / 2;

    /* what grows on the land, and what stands out past the verge */
    function drawProp(b, tr, y) {
      const K = MESH[b], x = tr.c * TILE, q = quarter(tr.a), far = Math.abs(tr.c) >= HALF + 3;
      if (b === 'desert') {
        if (tr.edge && far && tr.h === 3) { R3.draw(K.mesa, M4.place(T, x, y, GRASS_Z, q, tr.s), MAT.prop); return; }
        if (tr.edge && tr.pine && tr.h >= 2) { R3.draw(K.palm, M4.place(T, x, y, GRASS_Z, tr.a, tr.s), MAT.prop); return; }
        if (tr.h === 0) { R3.draw(tr.p === 1 ? K.barrel : K.rock, M4.place(T, x, y, GRASS_Z, q, tr.s), MAT.prop); return; }
        M4.place(T, x, y, GRASS_Z, q, 1, 1, tr.s);
        if (tr.wob) wobble(T, tr);
        R3.draw(K.cactus[tr.h], T, MAT.prop);
        if (tr.p === 0) R3.draw(K.bloom[tr.h], T, MAT.prop);
      } else if (b === 'arctic') {
        if (tr.edge && far && tr.h === 3) { R3.draw(tr.pine ? K.spikes : K.igloo, M4.place(T, x, y, GRASS_Z, tr.pine ? q : 0, tr.s), MAT.prop); return; }
        if (tr.h === 0) {
          /* a snowman always turns to face you */
          if (tr.p === 0) R3.draw(K.snowman, M4.place(T, x, y, GRASS_Z, 0, tr.s), MAT.prop);
          else R3.draw(tr.p === 1 ? K.iceBlock : K.rock, M4.place(T, x, y, GRASS_Z, q, tr.s), MAT.prop);
          return;
        }
        M4.place(T, x, y, GRASS_Z, 0, 1, 1, tr.s);
        if (tr.wob) wobble(T, tr);
        R3.draw(K.pine[tr.h], T, MAT.prop);
      } else {
        if (tr.edge && far && tr.h === 3) { M4.place(T, x, y, GRASS_Z, 0, tr.s * .9); R3.draw(K.cone, T, MAT.prop); R3.draw(K.coneGlow, T, MAT.glowProp); return; }
        if (tr.h === 0) {
          M4.place(T, x, y, GRASS_Z, q, tr.s);
          if (tr.p === 2) { R3.draw(K.vent, T, MAT.prop); R3.draw(K.ventGlow, T, MAT.glowProp); }
          else R3.draw(tr.p === 1 ? K.columns : K.obsidian, T, MAT.prop);
          return;
        }
        M4.place(T, x, y, GRASS_Z, q, 1, 1, tr.s);
        if (tr.wob) wobble(T, tr);
        R3.draw(K.tree[tr.h][0], T, MAT.prop);
        R3.draw(K.tree[tr.h][1], T, MAT.glowProp);
      }
    }

    /* A vehicle: a body in its paint with trim in its own colours; the
       animals walk, and anything round rolls. */
    function drawVehicle(r, c, y) {
      const rot = r.dir > 0 ? 0 : Math.PI, s = r.dir > 0 ? 1 : -1;
      if (r.b === 'meadow') {
        M4.place(T, c.x, y, 0, rot);
        R3.draw(MESH.carBody[c.kind], T, MAT.car[c.ci]);
        R3.draw(MESH.carTrim[c.kind], T, MAT.trim);
        return;
      }
      const v = MESH[r.b].veh[c.kind];
      /* Every animal's stride is tied to the ground it has covered, not to
         the clock, so a foot on the ground stays put while the body passes
         over it — the difference between walking and skating. */
      const go = c.x * s;
      if (v.camel) {
        /* two camels nose to tail, pacing: both legs on a side swing
           together, which is how a camel walks, rocking it side to side */
        for (let k = 0; k < 2; k++) {
          const cx = c.x + s * (k ? -86 : 86), ph = (go + (k ? 30 : 0)) / 84 * TAU + c.ph;
          const bob = Math.cos(ph) * Math.cos(ph) * 3, roll = Math.sin(ph) * .045;
          M4.place(TB, cx, y, bob, rot);
          M4.mul(TW, TB, hinge(TL, 'x', roll, 0, 0, 0));
          R3.draw(k ? v.camel : v.rider, TW, MAT.prop);
          M4.mul(TW, TW, hinge(TL, 'y', Math.sin(ph * 2) * .07 - .03, 40, 0, 76)); R3.draw(v.head, TW, MAT.prop);
          M4.place(TB, cx, y, 0, rot);
          for (const [hx, hy] of [[32, 13], [-38, 13], [32, -13], [-38, -13]]) {
            M4.mul(TW, TB, hinge(TL, 'y', .38 * Math.sin(ph + (hy > 0 ? 0 : Math.PI)), hx, hy, 54));
            R3.draw(v.leg, TW, MAT.prop);
          }
        }
      } else if (v.bear) {
        /* a heavy four-beat walk, the head low and swinging with it */
        const ph = go / 64 * TAU + c.ph, bob = Math.sin(ph) * Math.sin(ph) * 2.5;
        M4.place(TB, c.x, y, bob, rot);
        M4.mul(TW, TB, hinge(TL, 'x', Math.sin(ph) * .025, 0, 0, 0));
        R3.draw(v.bear, TW, MAT.prop);
        M4.mul(TW, TW, hinge(TL, 'y', Math.sin(ph * 2) * .05 + .05, 52, 0, 74));
        M4.mul(TW, TW, hinge(TL, 'z', Math.sin(ph) * .08, 0, 0, 0));
        R3.draw(v.head, TW, MAT.prop);
        M4.place(TB, c.x, y, 0, rot);
        for (const [hx, hy, o] of [[-52, 18, 0], [32, 18, .5], [-52, -18, 1], [32, -18, 1.5]]) {
          M4.mul(TW, TB, hinge(TL, 'y', .32 * Math.sin(ph - o * Math.PI), hx, hy, 50));
          R3.draw(v.leg, TW, MAT.prop);
        }
      } else if (v.dog) {
        /* the sled glides; the dogs trot, legs in diagonal pairs, each dog a
           beat off the next so the team does not move in lockstep */
        M4.place(T, c.x, y, 0, rot); R3.draw(v.sled, T, MAT.prop);
        let k = 0;
        for (const [dx, dy] of [[124, 19], [124, -19], [40, 19], [40, -19]]) {
          const ph = go / 46 * TAU + c.ph + k++ * 1.3, bob = Math.sin(ph) * Math.sin(ph) * 3;
          M4.place(TB, c.x + s * dx, y + dy, 0, rot);
          M4.mul(TW, TB, hinge(TL, 'y', Math.sin(ph * 2) * .04, 0, 0, bob)); R3.draw(v.dog, TW, MAT.prop);
          for (const [hx, hy, o] of [[12, 5, 0], [-18, -5, 0], [12, -5, 1], [-18, 5, 1]]) {
            M4.mul(TW, TB, hinge(TL, 'y', .58 * Math.sin(ph + o * Math.PI), hx, hy, 22 + bob * .5));
            R3.draw(v.dleg, TW, MAT.prop);
          }
        }
      } else if (v.penguin) {
        /* tobogganing: a wobble, and the flippers pushing at the ice */
        for (let k = 0; k < 3; k++) {
          const t = tAll * 9 + c.ph + k * 2.1, px = c.x + s * (70 - k * 70);
          M4.place(TB, px, y, Math.abs(Math.sin(t)) * 1.5, rot);
          M4.mul(TW, TB, hinge(TL, 'x', Math.sin(t * .5) * .1, 0, 0, 0));
          R3.draw(v.penguin, TW, MAT.prop);
          const f = Math.sin(t * 1.3) * .55;
          M4.mul(TB, TW, hinge(TL, 'x', f, 0, 16, 14)); R3.draw(v.flipL, TB, MAT.prop);
          M4.mul(TB, TW, hinge(TL, 'x', -f, 0, -16, 14)); R3.draw(v.flipR, TB, MAT.prop);
        }
      } else if (v.weed || v.rock) {
        /* rolling: a turn about the axis across the lane for every radius it travels */
        const R = v.weed ? 38 : v.R, ang = c.x / R;
        const bounce = v.weed ? Math.abs(Math.sin(tAll * 5.5 + c.ph)) * 34 : Math.abs(Math.sin(ang * 2)) * R * .06;
        QR[0] = 0; QR[1] = 0; QR[2] = 0; QR[3] = 1;
        Gfx3D.Q.turn(QR, 0, 1, 0, ang);
        M4.quat(T, QR, 1, c.x, y, R * (v.weed ? 1 : .92) + bounce);
        R3.draw(v.weed || v.rock, T, MAT.prop);
        if (v.glow) R3.draw(v.glow, T, MAT.glowProp);
      } else {
        M4.place(T, c.x, y, 0, rot);
        const cols = TRAFFIC[r.b].cols[c.kind];
        if (v.body) R3.draw(v.body, T, cols ? MAT.paint(cols[c.ci % cols.length]) : MAT.trim);
        R3.draw(v.trim, T, MAT.trim);
        if (v.glow) R3.draw(v.glow, T, MAT.glowProp);
        if (v.lamp) R3.draw(v.lamp, T, ((tAll * 2.4 + c.ph) % 1) < .5 ? MAT.amberOn : MAT.amberOff);
      }
    }

    /* what floats: reed rafts and crocodiles, ice floes, basalt rafts */
    function drawFloat(r, g, y) {
      /* a crocodile with the bird in its jaws thrashes a little as it chews */
      const e = g.eat, thrash = e !== undefined && e > .16 && e < 1 ? Math.sin(e * 34) * .07 * (1 - e) : 0;
      M4.place(T, g.x, y, g.dz, (r.dir > 0 ? 0 : Math.PI) + thrash);
      if (r.b === 'desert') {
        if (!g.croc) { R3.draw(MESH.desert.raft[g.len] || MESH.desert.raft[300], T, MAT.prop); return; }
        const K = MESH.desert.croc, hl = g.len * CROC_HEAD, hx = g.len / 2 - 4;
        R3.draw(K[g.len], T, MAT.prop);
        /* the jaw rests shut, and every so often it snaps; with the bird on
           its head it gapes wide, slams shut and chews */
        const cyc = (tAll * .5 + g.ph) % 1;
        const open = e === undefined ? (cyc < .2 ? Math.sin(cyc / .2 * Math.PI) * .6 : 0)
                   : e < .1 ? e / .1 * .95 : e < .16 ? .95 * (1 - (e - .1) / .06)
                   : e < .8 ? Math.abs(Math.sin((e - .16) * 15)) * .22 * (1 - (e - .16) / .64) : 0;
        M4.mul(TW, T, hingeY(TL, -open, hx - hl, 0, WATER_Z + 12));
        R3.draw(K[g.len + 'jaw'], TW, MAT.prop);
      } else if (r.b === 'arctic') {
        R3.draw(MESH.arctic.floe[g.len + '.' + g.v] || MESH.arctic.floe['300.0'], T, MAT.prop);
      } else {
        R3.draw(MESH.volcano.raft[g.len + '.' + g.v] || MESH.volcano.raft['300.0'], T, MAT.prop);
        R3.draw(MESH.volcano.raftGlow[g.len] || MESH.volcano.raftGlow[300], T, MAT.glow);
      }
    }
    /* what you step on: sandstone, ice (thin ice cracking under you), basalt */
    function drawStone(r, p, y) {
      if (p.broken) return;
      const x = p.c * TILE;
      if (r.b === 'desert') { R3.draw(MESH.desert.slab, M4.place(T, x, y, padZ(p), quarter(p.a), p.s), MAT.prop); return; }
      if (r.b === 'arctic') {
        const sh = p.crack > .6 ? Math.sin(tAll * 70) * 2 * p.crack : 0;
        M4.place(T, x + sh, y, padZ(p), quarter(p.a), p.s);
        R3.draw(p.thin ? MESH.arctic.thin : MESH.arctic.pad, T, MAT.prop);
        if (p.thin && p.crack > 0) R3.draw(MESH.arctic.cracks[Math.min(2, Math.floor(p.crack * 3))], T, MAT.foam);
        return;
      }
      M4.place(T, x, y, padZ(p), quarter(p.a), p.s);
      R3.draw(MESH.volcano.pad, T, MAT.prop);
      R3.draw(MESH.volcano.padGlow, T, MAT.glow);
    }

    /* The sandworm: the head, then a score of segments behind it, each one
       set on the wave at its own x and tipped to follow its slope. Under
       the sand they are simply hidden by it. */
    const WA = [0, 0, 0], WB = [0, 0, 0], WC = [0, 0, 0], WP = [0, 0, 0], WX = [], WZ = [];
    /* The head always rears up out of the sand, and the neck behind it
       climbs out to meet it; everything further back follows the wave. Each
       piece is tipped along the line from the one behind it to the one in
       front, so the body bends where the wave does. */
    function drawWorm(r, y) {
      const t = r.train, s = r.dir > 0 ? 1 : -1, front = t.x + s * t.len / 2, K = MESH.desert, n = t.n + 2;
      for (let k = 0; k < n; k++) {
        const x = k === 0 ? front - s * 66 : k === n - 1 ? front - s * (WORM_HEAD + 10 + t.n * WORM_SEG) : front - s * (WORM_HEAD - 30 + (k - .5) * WORM_SEG);
        const lift = [58, 34, 12][k];
        WX[k] = x; WZ[k] = lift === undefined ? wormZ(r, x) : Math.max(wormZ(r, x), lift);
      }
      for (let k = 0; k < n; k++) {
        const x = WX[k], z = WZ[k], sc = k === 0 ? 1 : k === n - 1 ? .9 : Math.max(.5, 1 - Math.max(0, k - t.n + 6) * .08);
        if (z < -70 * sc || Math.abs(x - camX) > 1750) continue;
        const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1);
        let fx = WX[a] - WX[b], fz = WZ[a] - WZ[b];
        if (k === 0) fz += 26;                                // and the head looks up a little
        const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        WA[0] = fx; WA[1] = 0; WA[2] = fz;
        WB[0] = 0; WB[1] = s * sc; WB[2] = 0;
        WC[0] = -s * fz * sc; WC[1] = 0; WC[2] = s * fx * sc;
        WP[0] = x; WP[1] = y; WP[2] = z;
        R3.draw(k === 0 ? K.wormHead : k === n - 1 ? K.wormTail : K.wormSeg, M4.axes(T, WA, WB, WC, WP), MAT.prop);
      }
    }
    /* the bobsleds, nose to tail */
    function drawSleds(r, y) {
      const t = r.train, s = r.dir > 0 ? 1 : -1, rot = s > 0 ? 0 : Math.PI, K = MESH.arctic.sled;
      for (let k = 0; k < t.n; k++) {
        const cx = t.x + s * (t.len / 2 - SLED_LEN / 2 - k * (SLED_LEN + SLED_GAP));
        if (Math.abs(cx - camX) > 1700) continue;
        M4.place(T, cx, y, Math.abs(Math.sin(tAll * 20 + k)) * 1.5, rot);
        R3.draw(K.body, T, MAT.paint(SLED_COLS[(k + r.i) % SLED_COLS.length]));
        R3.draw(K.trim, T, MAT.trim);
      }
    }
    /* the surge: its body stretched from the tail to just behind the front,
       a bulging front, and crust riding along on it */
    function drawSurge(r, y) {
      const t = r.train, s = r.dir > 0 ? 1 : -1, rot = s > 0 ? 0 : Math.PI, K = MESH.volcano;
      const front = t.x + s * t.len / 2, tail = t.x - s * t.len / 2, bodyLen = t.len - 60;
      const mid = tail + s * bodyLen / 2;
      M4.place(T, mid, y, 0, rot, bodyLen / 100, 1, 1);
      R3.draw(K.surge, T, MAT.lava);
      M4.place(T, front - s * 60, y, Math.sin(tAll * 9) * 2, rot);
      R3.draw(K.surgeHead, T, MAT.lavaHot);
      for (let x = 120; x < bodyLen - 60; x += 230) {
        const cx = front - s * (60 + x);
        if (Math.abs(cx - camX) > 1700) continue;
        R3.draw(K.surgeCrust, M4.place(T, cx, y, 0, rot + (x % 460 ? Math.PI : 0)), MAT.prop);
      }
    }

    /* one of the other countries' rows */
    function drawBiomeRow(r, i, y, prev, next) {
      const b = r.b, K = MESH[b];
      if (r.t === 'grass') {
        R3.draw(K.land[r.shade], M4.place(T, 0, y, 0, 0), MAT.ground);
        M4.place(T, 0, y, GRASS_Z, r.dr ? Math.PI : 0);
        R3.draw(K.deco[r.dv], T, MAT.ground);
        if (K.decoGlow) R3.draw(K.decoGlow[r.dv], T, MAT.glow);
        if (r.gate) drawGate(b, y);
        for (const tr of r.trees) drawProp(b, tr, y);
        if (r.coin && !r.coin.got) {
          const bob = Math.sin(tAll * 3 + r.coin.t) * 5;
          R3.draw(MESH.coin, M4.place(T, r.coin.c * TILE, y, GRASS_Z + 44 + bob, tAll * 2.6 + r.coin.t), MAT.coin);
        }
      } else if (r.t === 'road') {
        R3.draw(K.road, M4.place(T, 0, y, 0, 0), MAT.ground);
        if (next && next.t === 'road') R3.draw(K.dash || MESH.dash, M4.place(T, 0, y - TILE / 2, 0, 0), b === 'volcano' ? MAT.glow : MAT.mark);
        if (K.edge) {
          if (next && next.t === 'grass') R3.draw(K.edge, M4.place(T, 0, y, 0, 0), MAT.ground);
          if (prev && prev.t === 'grass') R3.draw(K.edge, M4.place(T, 0, y, 0, Math.PI), MAT.ground);
        }
        for (const c of r.cars) {
          if (Math.abs(c.x - camX) > 1600 + c.len / 2) continue;
          drawVehicle(r, c, y);
        }
      } else if (r.t === 'water' || r.t === 'pads') {
        const sand = b === 'desert' && r.t === 'pads', hot = b === 'volcano';
        R3.draw(sand ? K.qsand : hot ? K.lava : K.water, M4.place(T, 0, y, 0, 0), hot ? MAT.lava : MAT.ground);
        if (sand) {
          /* the quicksand's swirls turn, slowly, where they lie */
          for (let k = 0; k < 7; k++) {
            const x = ((i * 389 + k * 541) % 1500) - 750 + (k - 3) * 180, yy = ((i * 13 + k * 29) % 50) - 25;
            R3.draw(K.swirl, M4.place(T, x, y + yy, 0, tAll * (k & 1 ? .7 : -.6) + k, .8 + (k % 3) * .18), MAT.ground);
          }
        } else {
          const drift = r.t === 'water' ? ((tAll * r.speed * .4) % 152) * r.dir : Math.sin(tAll * .55 + i * 1.7) * 13;
          R3.draw(K.ripple, M4.place(T, drift, y, 0, 0), hot ? MAT.glow : MAT.foam);
          const flow = r.t === 'water' ? tAll * r.speed * r.dir : Math.sin(tAll * .4 + i) * 20;
          if (b === 'arctic') R3.draw(K.chunks, M4.place(T, ((flow % 480) + 480) % 480, y, 0, 0), MAT.prop);
          if (hot) R3.draw(K.crust, M4.place(T, ((flow % 600) + 600) % 600, y, 0, 0), MAT.prop);
        }
        for (const [row, rot] of [[next, 0], [prev, Math.PI]]) {
          if (!row || !isLand(row.t)) continue;
          if (b === 'desert' && !sand) { R3.draw(MESH.foamEdge, M4.place(T, Math.sin(tAll * .8 + i + rot) * 7, y, 0, rot), MAT.foam); R3.draw(K.bank, M4.place(T, 0, y, 0, rot), MAT.prop); }
          else if (b === 'arctic') R3.draw(K.bank, M4.place(T, 0, y, 0, rot), MAT.ground);
          else if (hot) { M4.place(T, 0, y, 0, rot); R3.draw(K.bank, T, MAT.ground); R3.draw(K.bankGlow, T, MAT.glow); }
        }
        if (r.t === 'water') for (const g of r.logs) {
          if (Math.abs(g.x - camX) > 1600 + g.len / 2) continue;
          drawFloat(r, g, y);
        }
        else for (const p of r.pads) drawStone(r, p, y);
      } else {
        const warn = r.state === 'warn' || r.state === 'run', ph = ((r.flash * 3.3) | 0) & 1;
        if (b === 'desert') {
          /* the lane trembles while the worm is coming */
          const sh = r.state === 'warn' ? Math.sin(tAll * 64) * 1.8 : 0;
          R3.draw(K.wormGround, M4.place(T, sh, y, 0, 0), MAT.ground);
          M4.place(T, 0, y, 0, 0);
          R3.draw(K.wormPosts, T, MAT.prop);
          R3.draw(K.wormEyes, T, warn && (r.state === 'run' || ph) ? MAT.skullOn : MAT.skullOff);
          if (r.train) drawWorm(r, y);
        } else if (b === 'arctic') {
          M4.place(T, 0, y, 0, 0);
          R3.draw(K.chute, T, MAT.ground);
          R3.draw(MESH.signalPost, T, MAT.prop);
          R3.draw(K.postSnow, T, MAT.prop);
          R3.draw(MESH.lampA, T, warn && ph ? MAT.lampOn : MAT.lampOff);
          R3.draw(MESH.lampB, T, warn && !ph ? MAT.lampOn : MAT.lampOff);
          if (r.train) drawSleds(r, y);
        } else {
          M4.place(T, 0, y, 0, 0);
          R3.draw(K.chan, T, MAT.ground);
          R3.draw(K.chanCracks, T, warn ? MAT.glowWarn : MAT.glow);
          R3.draw(K.posts, T, MAT.prop);
          R3.draw(K.lampA, T, warn && ph ? MAT.crystalOn : MAT.crystalOff);
          R3.draw(K.lampB, T, warn && !ph ? MAT.crystalOn : MAT.crystalOff);
          if (r.train) drawSurge(r, y);
        }
      }
    }
    /* A country's border: a flag at each verge in its colours, carrying its
       emblem. */
    function drawGate(b, y) {
      const G = MESH.gate[b];
      if (!G) return;
      for (const sx of [-1, 1]) {
        const wave = Math.sin(tAll * 4 + sx) * .12;
        M4.place(T, sx * (HALF * TILE + 80), y, GRASS_Z, 0);
        R3.draw(MESH.gatePole, T, MAT.prop);
        M4.place(T, sx * (HALF * TILE + 80), y, GRASS_Z, wave * sx, sx, 1, 1);
        R3.draw(G, T, MAT.prop);
      }
    }

    /* the eagle, on its way in or out, and where the bird hangs from it */
    const EAGLE_S = .8;
    function eagleFrame(t) {
      eagleAt(t);
      QE[0] = 0; QE[1] = 0; QE[2] = 0; QE[3] = 1;
      Gfx3D.Q.turn(QE, 0, 0, 1, EG.yaw);
      Gfx3D.Q.turn(QE, Math.cos(EG.yaw), Math.sin(EG.yaw), 0, EG.pitch);
      M4.quat(TB, QE, EAGLE_S, EG.pos[0], EG.pos[1], EG.pos[2]);
      const off = Gfx3D.Q.rot(QE, 0, -6 * EAGLE_S, -64 * EAGLE_S);
      EG.bird[0] = EG.pos[0] + off[0]; EG.bird[1] = EG.pos[1] + off[1]; EG.bird[2] = EG.pos[2] + off[2] - 92;
    }
    function drawEagle() {
      R3.draw(MESH.eagleBody, TB, MAT.eagle);
      R3.draw(EG.talon > .5 ? MESH.eagleTalonOpen : MESH.eagleTalonShut, TB, MAT.eagle);
      const f = EG.flap * .95;
      M4.mul(TW, TB, hingeY(TL, -f, 30, -6, 16)); R3.draw(MESH.eagleWingR, TW, MAT.eagle);
      M4.mul(TW, TB, hingeY(TL, f, -30, -6, 16)); R3.draw(MESH.eagleWingL, TW, MAT.eagle);
    }

    function scene() {
      const c0 = Math.round(-camY / TILE);
      const lo = c0 - 9, hi = c0 + 17;
      for (let i = lo; i <= hi; i++) {
        const r = rowAt(i);
        const y = rowY(i);
        if (!r) {          // behind the start line: plain ground of the first country, so there is no edge
          const b0 = rows[0].b;
          R3.draw((b0 === 'meadow' ? MESH.grass : MESH[b0].land)[i & 1], M4.place(T, 0, y, 0, 0), MAT.ground);
          continue;
        }
        const prev = i > 0 ? rows[i - 1] : null, next = rows[i + 1];
        if (r.b !== 'meadow') { drawBiomeRow(r, i, y, prev, next); continue; }

        if (r.t === 'grass') {
          R3.draw(MESH.grass[r.shade], M4.place(T, 0, y, 0, 0), MAT.ground);
          if (r.gate) drawGate('meadow', y);
          for (const tr of r.trees) {
            /* square to the grid, the way everything in a block world stands */
            if (tr.h === 0) {
              R3.draw(MESH.rock, M4.place(T, tr.c * TILE, y, GRASS_Z, Math.round(tr.a / (Math.PI / 2)) * Math.PI / 2, tr.s), MAT.prop);
              continue;
            }
            M4.place(T, tr.c * TILE, y, GRASS_Z, 0, 1, 1, tr.s);
            if (tr.wob) wobble(T, tr);
            R3.draw(MESH.trunk, T, MAT.prop);
            R3.draw(MESH.tree[tr.h], T, MAT.tree[tr.pine ? 2 : tr.p % 2]);
          }
          if (r.coin && !r.coin.got) {
            const bob = Math.sin(tAll * 3 + r.coin.t) * 5;
            R3.draw(MESH.coin, M4.place(T, r.coin.c * TILE, y, GRASS_Z + 44 + bob, tAll * 2.6 + r.coin.t), MAT.coin);
          }

        } else if (r.t === 'road') {
          R3.draw(MESH.road, M4.place(T, 0, y, 0, 0), MAT.ground);
          /* dashes only between lanes; a road's edges are the kerb of the grass */
          if (next && next.t === 'road') R3.draw(MESH.dash, M4.place(T, 0, y - TILE / 2, 0, 0), MAT.mark);
          for (const c of r.cars) {
            if (Math.abs(c.x - camX) > 1600) continue;         // off the side of the screen
            M4.place(T, c.x, y, 0, r.dir > 0 ? 0 : Math.PI);
            R3.draw(MESH.carBody[c.kind], T, MAT.car[c.ci]);
            R3.draw(MESH.carTrim[c.kind], T, MAT.trim);
          }

        } else if (r.t === 'water' || r.t === 'pads') {
          R3.draw(MESH.water, M4.place(T, 0, y, 0, 0), MAT.ground);
          /* the ripples ride the current; on still water they idle */
          const drift = r.t === 'water' ? ((tAll * r.speed * .4) % 152) * r.dir : Math.sin(tAll * .55 + i * 1.7) * 13;
          R3.draw(MESH.ripple, M4.place(T, drift, y, 0, 0), MAT.foam);
          if (next && isLand(next.t)) R3.draw(MESH.foamEdge, M4.place(T, Math.sin(tAll * .8 + i) * 7, y, 0, 0), MAT.foam);
          if (prev && isLand(prev.t)) R3.draw(MESH.foamEdge, M4.place(T, Math.sin(tAll * .8 + i + 2.1) * 7, y, 0, Math.PI), MAT.foam);
          if (r.t === 'water') for (const g of r.logs) {
            if (Math.abs(g.x - camX) > 1600 + g.len / 2) continue;
            R3.draw(MESH.logs[g.len] || MESH.logs[300], M4.place(T, g.x, y, g.dz, 0), MAT.prop);
          }
          if (r.t === 'pads') for (const p of r.pads) {
            M4.place(T, p.c * TILE, y, padZ(p), p.a, p.s);
            R3.draw(MESH.pad, T, MAT.prop);
            if (p.fl) R3.draw(MESH.flower, T, MAT.prop);
          }

        } else {
          M4.place(T, 0, y, 0, 0);
          R3.draw(MESH.railBody, T, MAT.ground);
          R3.draw(MESH.railBed, T, MAT.ground);
          R3.draw(MESH.sleepers, T, MAT.ground);
          R3.draw(MESH.rails, T, MAT.prop);
          R3.draw(MESH.signalPost, T, MAT.prop);
          /* the two lamps take turns from the first warning until the train
             has gone, and the lights in the track blink with them */
          const warn = r.state === 'warn' || r.state === 'run';
          const ph = ((r.flash * 3.3) | 0) & 1;
          R3.draw(MESH.lampA, T, warn && ph ? MAT.lampOn : MAT.lampOff);
          R3.draw(MESH.lampB, T, warn && !ph ? MAT.lampOn : MAT.lampOff);
          R3.draw(MESH.trackLights, T, warn && ph ? MAT.lampOn : MAT.lampOff);
          if (r.train) drawTrain(r, y);
        }
      }

      /* ---- the splash's rings, spreading on the surface ---- */
      const how = ME.dead;
      if (how === 'water' || how === 'ice' || how === 'croc') {
        for (let k = 0; k < 3; k++) {
          const t = (ME.deadT - k * .13) / .62;
          if (t <= 0 || t >= 1) continue;
          const e = 1 - Math.pow(1 - t, 3), rad = 26 + e * [235, 175, 120][k];
          MAT.ring[k].alpha = (1 - t) * [.95, .7, .5][k];
          R3.draw(MESH.ring, M4.place(T, ME.x, ME.y, WATER_Z + 1.6 + k * .2, 0, rad), MAT.ring[k]);
        }
      }

      /* ---- rings where something landed on the water ---- */
      for (let k = 0; k < RIPS.length; k++) {
        const q = RIPS[k], t = q.t / RIP_T, e = 1 - Math.pow(1 - t, 2.2), rad = (q.big ? 50 : 44) + e * (q.big ? 96 : 58);
        MAT.rip[k].alpha = (1 - t) * (q.big ? .8 : .6);
        R3.draw(MESH.ring, M4.place(T, q.x, q.y, WATER_Z + 1.3 + k * .04, 0, rad), MAT.rip[k]);
      }

      /* ---- the bird ---- */
      const st = how && dth ? dth.style : '';
      if (how === 'eagle') eagleFrame(ME.deadT);
      if (!birdGone()) {
        if (st === 'stuck' || st === 'fling' || st === 'mouth' || st === 'jaws') posedBird();
        else if (how === 'eagle' && ME.deadT >= EAGLE_GRAB) {
          /* carried off in the talons, swinging */
          DQ[0] = 0; DQ[1] = 0; DQ[2] = 0; DQ[3] = 1;
          Gfx3D.Q.turn(DQ, 0, 0, 1, EG.yaw);
          Gfx3D.Q.turn(DQ, Math.cos(EG.yaw), Math.sin(EG.yaw), 0, Math.sin(ME.deadT * 9) * .3 - .15);
          M4.quat(T, DQ, BIRD_S * .95, EG.bird[0], EG.bird[1], EG.bird[2]);
        } else if (how === 'water' || how === 'ice') {
          /* the dive: nose first with a little tumble, and swallowed */
          const k = ME.sink;
          DQ[0] = 0; DQ[1] = 0; DQ[2] = 0; DQ[3] = 1;
          Gfx3D.Q.turn(DQ, 0, 0, 1, ME.face);
          Gfx3D.Q.turn(DQ, Math.cos(ME.face), Math.sin(ME.face), 0, k * 1.5);
          M4.quat(T, DQ, BIRD_S * (1 - k * .22), ME.x, ME.y, ME.z);
        } else {
          let sx = ME.sqx, sz = ME.sqz;
          const bmp = ME.bumpT > 0 ? Math.sin(ME.bumpT / .16 * Math.PI) * 9 : 0;
          const fx2 = ME.x + Math.sin(ME.face) * bmp, fy2 = ME.y - Math.cos(ME.face) * bmp;
          /* standing on a pad, the bird rides its rocking */
          let bz = ME.z;
          if (!ME.hop && !ME.dead) {
            const pr = rows[ME.row];
            if (pr && pr.t === 'pads') { const p = padAt(pr, ME.x); if (p) bz = padZ(p) + (pr.b === 'meadow' ? 5 : 8); }
          }
          /* going down in quicksand it struggles; seeing the eagle it shakes */
          let wob = 0;
          if (how === 'sand') wob = Math.sin(ME.deadT * 16) * .38 * (1 - ME.sink);
          else if (how === 'eagle') { wob = Math.sin(ME.deadT * 55) * .07; sz *= .9; sx *= 1.05; }
          /* on the front page it breathes, and hops round when it is swapped */
          const mb = menuBird();
          M4.place(T, fx2, fy2, bz + mb.z, ME.face + mb.spin + wob,
                   sx * mb.sx * BIRD_S, sx * mb.sx * BIRD_S, sz * mb.sz * BIRD_S);
        }
        /* lava leaves it charred */
        const burnt = ME.char > .35;
        R3.draw(MESH.birdBody, T, burnt ? MAT.charred : MAT.birdBody);
        R3.draw(MESH.birdTrim, T, burnt ? MAT.charred : MAT.birdTrim);
        R3.draw(MESH.birdBeak, T, burnt ? MAT.charred : MAT.birdBeak);
        R3.draw(MESH.birdEye, T, MAT.birdEye);
      }

      /* ---- the rivals ---- (played from their packets by rival()) */
      if (ONLINE) {
        for (const p of ROSTER) {
          if (p.id === RACE.me) continue;
          const q = RACE.peers[p.id];
          if (!q) continue;
          const gs = rival(p.id, q);
          if (gs.gone >= 1 || Math.abs(gs.y - camY) > 1500) continue;
          /* going out: a hop up and shrunk away, rather than just not there */
          const k = gs.gone, s = BIRD_S * .97 * (1 - k * k);
          M4.place(T, gs.x, gs.y, gs.z + Math.sin(k * Math.PI) * 30, gs.f + k * 5, s * gs.sqx, s * gs.sqx, s * gs.sqz);
          R3.draw(MESH.birdBody, T, MAT.peer[slotOf(p.id)]);
          R3.draw(MESH.birdTrim, T, MAT.birdTrim);
          R3.draw(MESH.birdBeak, T, MAT.birdBeak);
          R3.draw(MESH.birdEye, T, MAT.birdEye);
        }
      }

      /* ---- the eagle, only for the ending it belongs to ---- */
      if (how === 'eagle') drawEagle();
    }
    /* The body in one of the new endings. Flattened, it squashes in a tenth
       of a second with a little overshoot, the way a toy does: against a
       side it goes thin along its facing and spreads, on the road it goes
       flat and wide. Lying dazed, tumbling through the air or going down a
       throat, it turns about the middle of its body rather than its feet. */
    function posedBird() {
      const d = dth;
      if (d.style === 'stuck') {
        const p = bodyAt();
        if (d.shape === 'lie') { M4.quat(T, d.q, BIRD_S, p[0], p[1], p[2]); return; }
        const e = bOut(clamp((ME.deadT - d.t0) / .1, 0, 1));
        const side = d.shape === 'side';
        const sx = side ? 1 + .28 * e : 1 + .5 * e, sy = side ? 1 - .84 * e : 1 + .45 * e, sz = side ? 1 - .08 * e : 1 - .88 * e;
        M4.place(T, p[0], p[1], p[2], d.face, sx * BIRD_S, sy * BIRD_S, sz * BIRD_S);
        return;
      }
      const s = BIRD_S * d.scale, c = Gfx3D.Q.rot(d.q, 0, 4 * s, 40 * s);
      M4.quat(T, d.q, s, d.p[0] - c[0], d.p[1] - c[1], d.p[2] - c[2]);
    }

    /* The light shifts a little with the country: warmer over the dunes,
       colder in the north, dimmer and redder over the magma. It eases over
       as the camera crosses a border, so a border is not a light switch. */
    const LIGHT = {
      meadow:  { sun: L('#ffffff', .86), sky: L('#e6f2ff', .60), gnd: L('#c2cfb0', .42) },
      desert:  { sun: L('#fff3dd', .9), sky: L('#fff0dc', .6), gnd: L('#e6cf9f', .44) },
      arctic:  { sun: L('#f2f7ff', .84), sky: L('#e0efff', .64), gnd: L('#dfe9f4', .46) },
      volcano: { sun: L('#ffe1c6', .8), sky: L('#f1dad2', .53), gnd: L('#8c6252', .38) }
    };
    function lightFor(dt) {
      const L2 = LIGHT[biomeAt(Math.max(0, Math.round(-camY / TILE) + 2))], k = Math.min(1, dt * 1.6);
      for (let c = 0; c < 3; c++) {
        env.sunC[c] += (L2.sun[c] - env.sunC[c]) * k;
        env.sky[c] += (L2.sky[c] - env.sky[c]) * k;
        env.gnd[c] += (L2.gnd[c] - env.gnd[c]) * k;
      }
    }
    /* Once the card is up the shell stops stepping the game, but the world
       carries on behind it on the render clock: the traffic, the river,
       whatever is carrying the body off. The crossings keep quiet. */
    function afterlife(dt) {
      let t = Math.min(dt, .1);
      while (t > 1e-4) {
        const h = Math.min(t, 1 / 60);
        t -= h; tAll += h; ME.deadT += h;
        stepWorld(h, false);
        ending(h);
        weather(h);
        if (PS) PS.step(h);
      }
    }
    function render(ctx) {
      menuClock();
      if (ended) afterlife(rDt);
      FK.frame();
      if (!R3 || R3.lost) { render2D(ctx); return; }
      R3.size(W, H);
      lightFor(rDt);
      env.shadow.x = camX; env.shadow.y = camY - 60; env.shadow.r = 1700;
      cam.orbit(camX, camY, 0, camD, PITCH, YAW);
      R3.begin(cam, env, tAll);
      scene();
      R3.parts(PS);
      R3.end();
      ctx.drawImage(R3.canvas, 0, 0, W, H);
      drawHud(ctx);
    }

    /* ----------------------------------------------------- the results ---
       The end of a run in the game's own look, over the scene where it
       ended: what happened stamped across the top in the title's block
       letters, the steps counting up in the score's chunky figures, what the
       run collected on white blocks, the coins read back on a block of their
       own, and buttons cut from blocks like Play. The front page is this
       game's own, so the kit is only asked for the results. */
    const FK = FrontKit(api, { menu: false, online: ONLINE });
    const STAMP_COL = {
      car: ['#ffffff', '#aebbc8'], train: ['#ffffff', '#aebbc8'], bobsled: ['#ffffff', '#aebbc8'], eagle: ['#ffffff', '#aebbc8'],
      water: ['#8fe0ff', '#3a9bd0'], ice: ['#bfeeff', '#5aa9d6'], croc: ['#9be26a', '#4f9a33'],
      worm: ['#ffd46b', '#d99a14'], sand: ['#ffd46b', '#d99a14'], lava: ['#ffa03a', '#c2521a'], surge: ['#ffa03a', '#c2521a']
    };
    const ZONE_COL = { meadow: '#8fdc4a', desert: '#f2c14e', arctic: '#8fd3ff', volcano: '#ff7a1f' };
    /* any word in the title's letters, cached like the title's own */
    const wordCache = {};
    function blockWord(word, px, face, side) {
      const sc = Math.max(1, Stage.scale * Stage.dpr), key = word + '|' + px + '|' + face + '|' + sc.toFixed(3);
      if (wordCache[key]) return wordCache[key];
      const t = px, D = Math.round(px * 1.35), cw = 6 * px + 2 * t, ch = 8 * px + D + 2 * t;
      const imgs = [...word].map(c => {
        const img = document.createElement('canvas');
        img.width = Math.ceil(cw * sc); img.height = Math.ceil(ch * sc);
        const g = img.getContext('2d');
        g.scale(img.width / cw, img.height / ch);
        const o = { thick: true, crisp: true, fill: INK };
        for (let dy = -t; dy <= D + t; dy += 3) for (const dx of [-t, 0, t]) Hud.pix(g, c, t + dx, t + dy, px, o);
        o.fill = side;
        for (let dy = D; dy >= 1; dy--) Hud.pix(g, c, t, t + dy, px, o);
        o.fill = face;
        Hud.pix(g, c, t, t, px, o);
        return img;
      });
      return (wordCache[key] = { imgs, cw, ch, t, px, D, n: word.length });
    }
    /* a word in those letters dropped in one at a time, landing with a
       squash; t is the seconds since the first began to fall, from `drop`
       pixels up (200 unless said). Drawn square to the screen's pixels, so
       it stays sharp. */
    function dropWord(ctx, word, px, col, cx, top, t, drop) {
      const G = blockWord(word, px, col[0], col[1]), step = 7 * G.px, inkW = (G.n * 7 - 1) * G.px;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      [...word].forEach((c, i) => {
        const ti = t - i * .06, fall = .3;
        if (ti <= 0) return;
        let dy = 0, sy = 1;
        if (ti < fall) { const k = ti / fall; dy = -(1 - k * k) * (drop || 200); }
        else if (ti - fall < .18) sy = 1 - Math.sin((ti - fall) / .18 * Math.PI) * .2;
        const x = cx - inkW / 2 + i * step - G.t + G.cw / 2, base = top + G.ch;
        ctx.save(); ctx.translate(x, base + dy); ctx.scale(1 + (1 - sy) * .7, sy);
        ctx.drawImage(G.imgs[i], -G.cw / 2, -G.ch, G.cw, G.ch);
        ctx.restore();
      });
      ctx.restore();
      return G;
    }
    const pxt = (ctx, str, x, y, size, col, align) =>
      Hud.pix(ctx, String(str).toUpperCase(), x, y, Math.max(1.4, size / 7), { crisp: true, align, baseline: 'middle', fill: col });
    /* a block that is a button on the results: the kit says how pointed-at
       and how pressed it is, the block draws it */
    const resBlock = (ctx, key, x, y, w, h, o) => { const b = FK.btn(key, x, y, w, h); drawBlock(ctx, x, y, w, h, b.h, b.p, o); };
    const RES = {
      top: 12, gap: 14, colL: 270, colR: 410, btnH: 50, foot: 40, wide: 250, narrow: 124,
      /* in a race the field takes the room the country's tile would */
      stats: gs => FK.R.standings ? gs.filter(s => s.label === 'Coins') : gs,
      statH: s => s.label === 'Reached' ? 60 : 46,
      veil(ctx, k) {
        ctx.fillStyle = 'rgba(17,19,23,' + (.46 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      },
      hero(ctx, cx, top) {
        const R = FK.R, res = R.res || {}, T = FK.rt(), tight = R.paid.length > 3;
        /* the stamp, dropped in a letter at a time; drawn square to the
           screen's pixels, so it stays sharp */
        const col = STAMP_COL[res.how] || STAMP_COL.car, word = String(res.stamp || 'SPLAT!').toUpperCase();
        const G = dropWord(ctx, word, tight ? 4 : 5, col, cx, top, T - .04);
        let y = top + G.ch + 16;
        const sk = FK.eo(FK.rs('sub', undefined, .35));
        FK.layer(ctx, sk, c => {
          Hud.pix(c, String(R.title).toUpperCase(), cx, y, 3, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK });
          Hud.pix(c, String(R.message).toUpperCase(), cx, y + 24, 2, { crisp: true, align: 'center', baseline: 'middle', fill: '#e8ecf2', outline: INK, ow: .5 });
        });
        y += 24;
        /* the steps, in the score's own figures, with their name over them */
        y += tight ? 26 : 30;
        const k = FK.rs('stat', 0, .45), v = Math.round(R.score * FK.eo(FK.rs('stat', 0, .9)));
        if (k > 0) {
          const sy = y;
          FK.layer(ctx, Math.min(1, k * 2), c => Hud.pix(c, 'STEPS', cx, sy, 2, { crisp: true, align: 'center', baseline: 'middle', fill: '#c7ced8', outline: INK, ow: .5 }));
          const pop = k < 1 ? FK.bo(k) : 1, big = tight ? 5 : 6;
          ctx.save(); ctx.translate(cx, y + 16 + big * 4); ctx.scale(pop, pop);
          Hud.pix(ctx, String(v), 0, 0, big, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK, shadow: 'rgba(0,0,0,.35)', shadowY: 1.4 });
          ctx.restore();
          y += 16 + big * 8;
        } else y += 16 + (tight ? 40 : 48);
        /* and the best: a yellow block if this run was it */
        y += 22;
        const gk = FK.rs('tag', undefined, .45);
        if (gk > 0) {
          if (R.isBest) {
            const s = gk < 1 ? FK.bo(gk) : 1 + Math.sin(FK.t * 5) * .03;
            drawBlock(ctx, cx - 82, y - 15, 164, 30, 0, 0, { face: '#ffd43a', side: '#d99a14', label: 'NEW BEST!', ink: INK, edge: false, px: 3, depth: 6, s });
          } else { const by = y; FK.layer(ctx, FK.eo(gk), c => Hud.pix(c, (R.cheated ? 'NOT SAVED  ' : '') + 'BEST ' + R.best, cx, by, 3, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffd43a', outline: INK })); }
        }
        return y + 22 - top;
      },
      stat(ctx, st, x, y, w, h) {
        drawBlock(ctx, x, y, w, h, 0, 0, { face: '#ffffff', side: '#a9b5c1', depth: 6 });
        if (st.label === 'Reached') {
          /* two lines: what it is, then where, with the country's colour */
          const res = FK.R.res || {}, zc = ZONE_COL[res.biome] || '#8fdc4a';
          pxt(ctx, 'REACHED', x + 16, y + 17, 12, '#6b7583', 'left');
          ctx.fillStyle = INK; ctx.fillRect(x + 16, y + 30, 20, 20); ctx.fillStyle = zc; ctx.fillRect(x + 18, y + 32, 16, 16);
          Hud.pix(ctx, String(st.value).toUpperCase(), x + 46, y + 40, 2, { crisp: true, thick: true, baseline: 'middle', fill: INK });
          return;
        }
        const my = y + h / 2 - 2;
        pxt(ctx, st.label, x + 16, my, 12, '#6b7583', 'left');
        if (st.label === 'Coins') {
          coinIcon(ctx, x + w - 26, my, 20);
          Hud.pix(ctx, String(st.value), x + w - 44, my, 3, { crisp: true, thick: true, align: 'right', baseline: 'middle', fill: '#e39400', outline: INK, ow: .7 });
        } else pxt(ctx, st.value, x + w - 16, my, 14, INK, 'right');
      },
      card(ctx, x, y, w, h) { drawBlock(ctx, x, y, w, h, 0, 0, { face: '#ffffff', side: '#a9b5c1', depth: 8 }); },
      stdCard(ctx, x, y, w, h) { drawBlock(ctx, x, y, w, h, 0, 0, { face: '#ffffff', side: '#a9b5c1', depth: 8 }); },
      std: { me: '#e39400', ink: INK },
      pad: 20, headH: 42,
      head(ctx, x, y, w) {
        pxt(ctx, 'COINS', x, y - 2, 12, '#6b7583', 'left');
        coinIcon(ctx, x + w - 12, y - 2, 20);
        Hud.pix(ctx, String(FK.purse()), x + w - 30, y - 2, 3, { crisp: true, thick: true, align: 'right', baseline: 'middle', fill: '#e39400', outline: INK, ow: .7 });
      },
      ls: {
        text: pxt, label: pxt, measure: (ctx, str, size) => Hud.pixWidth(String(str).toUpperCase(), Math.max(1.4, size / 7)),
        ink: INK, mute: '#6b7583', gold: '#e39400', rule: 'rgba(17,19,23,.16)', bar: 'rgba(17,19,23,.12)', fill: '#ff9f1c',
        rowH: 21, size: 13, lsize: 11, totalSize: 22, totalH: 34, xpH: 38, noteH: 20, barH: 10, barR: 0, noteGap: 96
      },
      button(ctx, key, label, x, y, w, h, primary) {
        resBlock(ctx, key, x, y, w, h, primary ? { face: '#ff9f1c', side: '#c56806', label, px: 3, depth: 8 }
                                               : { face: '#ffffff', side: '#a9b5c1', label, ink: INK, edge: false, px: 3 });
      },
      hint(ctx, cx, y) { Hud.pix(ctx, 'SPACE  PLAY AGAIN', cx, y - 2, 2, { crisp: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK, ow: .6 }); }
    };

    /* ---------------------------------------------------------- the HUD - */
    function drawHud(ctx) {
      /* the front page, and the score fading in as it leaves */
      const hudA = menuOut();
      if (hudA < 1) drawMenu(ctx);
      else if (curWas) { curWas = ''; try { cv.style.cursor = ''; } catch (e) {} }
      if (hudA <= 0) return;
      if (FK.R) { FK.resultsPage(ctx, W, H, RES); return; }
      ctx.save(); ctx.globalAlpha *= hudA;
      /* how close the line behind has got, which is the only pressure in the
         game that is not visible in the picture */
      const slack = clamp((ME.row - edge) / 6.5, 0, 1);
      if (slack < .34 && !ended && !ME.dead) {
        const k = (1 - slack / .34) * (.55 + .45 * Math.sin(tAll * 11));
        const gr = ctx.createLinearGradient(0, H, 0, H - 190);
        gr.addColorStop(0, 'rgba(190,32,28,' + (.5 * k).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(190,32,28,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, H - 190, W, 190);
        FK.layer(ctx, .45 + .55 * k, c => Hud.pix(c, 'MOVE!', W / 2, H - 58, 4, { crisp: true, thick: true, align: 'center', baseline: 'middle',
          fill: '#ffffff', outline: '#000000' }));
      }

      /* a rival's name follows them, so the bird two rows up is a person */
      if (ONLINE && cam) {
        for (const p of ROSTER) {
          if (p.id === RACE.me) continue;
          const gs = ghost[p.id];
          if (!gs || gs.gone >= 1) continue;
          const s = cam.toScreen(gs.x, gs.y, gs.z + 215);
          if (s.w <= 0 || s.x < -60 || s.x > W + 60 || s.y < 10 || s.y > H - 10) continue;
          Hud.pix(ctx, p.name.split(' ')[0].slice(0, 10), s.x, s.y, 2, { crisp: true, thick: true, align: 'center', baseline: 'middle',
            fill: PEER_INK[slotOf(p.id)], outline: '#000000' });
        }
      }

      /* The score in the chunky outlined pixel figures the original wears,
         top left, race or not. While you watch someone it is their score,
         and their coins, as if it were their screen. */
      const wb = spec.on && spec.id ? RACE.board[spec.id] : null;
      Hud.pix(ctx, String(wb ? wb.score : score), 26, 20, 6, { crisp: true, thick: true, align: 'left', fill: '#ffffff', outline: '#000000',
        shadow: 'rgba(0,0,0,.32)', shadowY: 1.4 });

      /* coins, top right: the count in gold beside the coin itself */
      coinIcon(ctx, W - 42, 40, 30);
      Hud.pix(ctx, String(wb ? (wb.extra | 0) : coins), W - 66, 20, 5, { crisp: true, thick: true, align: 'right', fill: '#ffd43a', outline: '#000000',
        shadow: 'rgba(0,0,0,.32)', shadowY: 1.4 });

      if (spec.on) drawWatch(ctx);

      if (hint < 1 && !ended && !ME.dead) {
        FK.layer(ctx, 1 - hint, c => Hud.pix(c, 'ARROW KEYS OR CLICK TO HOP', W / 2, H - 56, 3, { crisp: true, thick: true, align: 'center', baseline: 'middle',
          fill: '#ffffff', outline: '#000000' }));
      }

      /* A new country's name on the way in: dropped from above with the
         little word over it, held a moment, and faded. */
      if (BANNER.t < 3.2 && !ended) {
        BANNER.t += rDt;
        const k = BANNER.t, a = clamp(Math.min(k / .2, (3.2 - k) / .5), 0, 1);
        const dy = k < .32 ? -(1 - bOut(k / .32)) * 50 : 0;
        FK.layer(ctx, a, c => {
          Hud.pix(c, 'NOW ENTERING', W / 2, 100 + dy, 3, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK });
          Hud.pix(c, BIOME_NAME[BANNER.b], W / 2, 138 + dy, 6, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: ZONE_COL[BANNER.b],
            outline: INK, shadow: 'rgba(0,0,0,.3)', shadowY: 1.4 });
        });
      }
      ctx.restore();
    }
    /* While you watch: whose run it is, their fall when it comes, and the
       way on — in the letters the rest of this screen is written in. */
    const OUT_COL = ['#ff6150', '#b3261c'];
    function drawWatch(ctx) {
      const id = spec.id, p = id ? ROSTER.find(q => q.id === id) : null;
      const still = liveRivals(), done = RACE.allDone();
      if (p) {
        Hud.pix(ctx, 'WATCHING', W / 2, 28, 2.5, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK });
        /* the name pops in each time the view moves to someone new */
        const k = clamp((mT - spec.popAt) / .4, 0, 1), s = .55 + .45 * FK.bo(k);
        FK.layer(ctx, clamp(k * 3, 0, 1), c => {
          c.save(); c.translate(W / 2, 62); c.scale(s, s);
          Hud.pix(c, p.name.split(' ')[0].slice(0, 12).toUpperCase(), 0, 0, 5, { crisp: k >= 1, thick: true, align: 'center', baseline: 'middle',
            fill: PEER_INK[slotOf(id)], outline: INK, shadow: 'rgba(0,0,0,.3)', shadowY: 1.4 });
          c.restore();
        });
        /* out: stamped over them while the view waits to move on */
        if (spec.lostT > 0) dropWord(ctx, 'OUT!', 6, OUT_COL, W / 2, H * .3, mT - spec.outAt, 70);
      }
      if (!still.length) {
        Hud.pix(ctx, done ? 'RACE OVER' : 'WAITING FOR RESULTS...', W / 2, H * .6, done ? 5 : 3, { crisp: true, thick: true, align: 'center', baseline: 'middle',
          fill: '#ffffff', outline: INK, shadow: 'rgba(0,0,0,.3)', shadowY: 1.4 });
      }
      Hud.pix(ctx, 'YOU WENT OUT AT ' + score, W / 2, H - 72, 3, { crisp: true, thick: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK });
      Hud.pix(ctx, (still.length > 1 ? '< >  SWITCH      ' : '') + (IS_HOST ? 'BACKSPACE  ENDS THE RACE' : 'BACKSPACE  HUB'), W / 2, H - 38, 2,
              { crisp: true, align: 'center', baseline: 'middle', fill: '#ffffff', outline: INK, ow: .6 });
    }
    /* the coin, flat: a gold square with a darker face, a red C and a black edge */
    function coinIcon(ctx, cx, cy, s) {
      const p = s / 7, CP = ['.###.', '#....', '#....', '#....', '.###.'];
      ctx.fillStyle = '#000000'; ctx.fillRect(Math.round(cx - s / 2 - 3), Math.round(cy - s / 2 - 3), Math.round(s + 6), Math.round(s + 6));
      ctx.fillStyle = '#ffd43a'; ctx.fillRect(Math.round(cx - s / 2), Math.round(cy - s / 2), Math.round(s), Math.round(s));
      ctx.fillStyle = '#eaa821'; ctx.fillRect(Math.round(cx - s / 2 + p * .6), Math.round(cy - s / 2 + p * .6), Math.round(s - p * 1.2), Math.round(s - p * 1.2));
      ctx.fillStyle = '#e3392f';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        if (CP[r][c] === '#') ctx.fillRect(Math.round(cx + (c - 2.5) * p), Math.round(cy + (r - 2.5) * p), Math.ceil(p), Math.ceil(p));
      }
    }

    /* ------------------------------------------------- without WebGL2 ---- */
    /* Flat, from directly above, and honest about it: the same rows, the same
       boxes, no lighting. It plays identically — get() only ever answers null
       on a machine that could not have run the real one. */
    /* each country's colours, for the flat picture */
    const FLAT = {
      meadow:  { a: '#abde60', b: '#a2d657', road: '#5e616d', water: '#6cd3f6', rail: '#7f7a8c', pad: '#5dbb4b', tree: '#a3c83c', rock: '#a39db8', train: '#d8443c', beast: '#f2f2f2' },
      desert:  { a: '#f3d48d', b: '#edcb80', road: '#6c6560', water: '#57d3cf', qs: '#d9ad68', rail: '#deae69', pad: '#d38e57', tree: '#5aab4b', rock: '#d8854f',
                 train: '#cd9168', log: '#dcc16c', beast: '#d6a25f' },
      arctic:  { a: '#e4edf8', b: '#d8e3f2', road: '#667189', water: '#4db0e6', rail: '#d6ecf8', pad: '#bfe9fa', tree: '#2e7a58', rock: '#f6f9ff',
                 train: '#e8413a', log: '#e3f4fc', beast: '#2b2d36' },
      volcano: { a: '#4d454a', b: '#564e53', road: '#37313a', water: '#ff6d17', rail: '#3b3437', pad: '#433c40', tree: '#2c2528', rock: '#2b2433',
                 train: '#ffc23d', log: '#433c40', beast: '#48404a' }
    };
    function render2D(ctx) {
      const cx = W / 2, sc = .62, tp = TILE * sc;
      const oy = H * .45;
      ctx.fillStyle = FLAT[rows[0].b].a; ctx.fillRect(0, 0, W, H);
      /* rowY runs more negative the further forward a row is, so the screen y
         has to follow it rather than oppose it — the other way round draws the
         course backwards, with the next row below the bird instead of above. */
      const y0 = i => oy + (rowY(i) - camY) * sc;
      const x0 = x => cx + (x - camX) * sc;
      const c0 = Math.round(-camY / TILE);
      for (let i = c0 - 7; i <= c0 + 11; i++) {
        const r = rowAt(i);
        const yy = y0(i) - tp / 2;
        if (!r) {                       // behind the start line: plain ground
          ctx.fillStyle = FLAT[rows[0].b].b; ctx.fillRect(0, yy, W, tp + 1); continue;
        }
        const P2 = FLAT[r.b];
        ctx.fillStyle = r.t === 'grass' ? (i & 1 ? P2.b : P2.a) : r.t === 'road' ? P2.road
                      : r.t === 'pads' && r.b === 'desert' ? P2.qs : r.t === 'water' || r.t === 'pads' ? P2.water : P2.rail;
        ctx.fillRect(0, yy, W, tp + 1);
        if (r.t === 'road') {
          ctx.fillStyle = 'rgba(240,244,248,.75)';
          for (let x = -VERGE; x < VERGE; x += 92) ctx.fillRect(x0(x), yy + tp - 3, 48 * sc, 3);
          for (const c of r.cars) {
            const cols = TRAFFIC[r.b].cols[c.kind];
            ctx.fillStyle = cols ? cols[c.ci % cols.length] : P2.beast;
            rr(ctx, x0(c.x - c.len / 2), yy + tp * .16, c.len * sc, tp * .68, 6); ctx.fill();
          }
        } else if (r.t === 'water') {
          for (const g of r.logs) {
            ctx.fillStyle = r.b === 'meadow' ? LOG_COLS[g.ci] : g.croc ? '#5f913d' : P2.log;
            rr(ctx, x0(g.x - g.len / 2), yy + tp * .2, g.len * sc, tp * .6, 8); ctx.fill();
          }
        } else if (r.t === 'pads') {
          ctx.fillStyle = P2.pad;
          for (const p of r.pads) { if (p.broken) continue; ctx.beginPath(); ctx.arc(x0(p.c * TILE), y0(i), tp * .36, .4, TAU - .4); ctx.lineTo(x0(p.c * TILE), y0(i)); ctx.fill(); }
        } else if (r.t === 'rail') {
          ctx.fillStyle = '#8e97a3';
          ctx.fillRect(0, yy + tp * .34, W, 3); ctx.fillRect(0, yy + tp * .58, W, 3);
          if (r.train) {
            ctx.fillStyle = P2.train;
            ctx.fillRect(x0(r.train.x - r.train.len / 2), yy + tp * .1, r.train.len * sc, tp * .8);
          } else if (r.state === 'warn' && (((r.flash * 6) | 0) & 1)) {
            ctx.fillStyle = '#ff5b47';
            ctx.beginPath(); ctx.arc(x0(-HALF * TILE - 62), yy + tp / 2, 7, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(x0(HALF * TILE + 62), yy + tp / 2, 7, 0, TAU); ctx.fill();
          }
        } else {
          for (const t of r.trees) {
            ctx.fillStyle = t.h ? P2.tree : P2.rock;
            const px = x0(t.c * TILE), py = y0(i);
            ctx.beginPath(); ctx.arc(px, py, tp * .42 * t.s, 0, TAU); ctx.fill();
          }
          if (r.coin && !r.coin.got) {
            ctx.fillStyle = '#ffc83d';
            ctx.beginPath(); ctx.arc(x0(r.coin.c * TILE), y0(i), tp * .2, 0, TAU); ctx.fill();
          }
        }
      }
      if (!birdGone()) {
        /* wherever the ending has put it, and squashed if it is flattened */
        const p = bodyAt(), d = ME.dead ? dth : null;
        const fw = d && d.style === 'stuck' && d.shape !== 'lie' ? (d.shape === 'flat' ? 1.5 : 1.3) : 1;
        const fh = d && d.style === 'stuck' && d.shape !== 'lie' ? .45 : 1, sk = d && d.scale !== undefined ? d.scale : 1;
        ctx.fillStyle = ME.char > .35 ? '#3b3336' : BIRD.body;
        const px = x0(p[0]), py = oy + (p[1] - camY) * sc - (p[2] - 12) * sc * .5, w = tp * .52 * fw * sk, h = tp * .52 * fh * sk;
        rr(ctx, px - w / 2, py - h / 2, w, h, 8); ctx.fill();
        ctx.fillStyle = BIRD.trim;
        ctx.fillRect(px - 3, py - h / 2 - tp * .08, 6, 6);
      }
      drawHud(ctx);
    }

    api.hud({ Steps: 0, Coins: 0, Best: best });

    return {
      update, render,
      destroy() {
        unmounted = true;
        FK.done();
        try { cv.style.cursor = ''; } catch (e) {}
        if (S) { try { S.dispose(); } catch (e) {} } if (PS) PS.clear();
      },
      /* Escape on the front page goes back to the hub; in a run it pauses */
      escape() { if (atMenu) { api.hub(); return true; } return false; },
      /* the run is over: its results, drawn over where it ended */
      results(R) { FK.showResults(R, { sounds: { row: () => Sound.place(), total: () => Sound.coin() } }); },
      /* what the checks read: the course and the bird as plain data, so a test
         can walk a run without a canvas or a clock */
      _dev: {
        ME, rows, rowAt, tryHop, TILE, HALF, ghost, cam,
        get score() { return score; },
        get edge() { return edge; },
        get dead() { return ME.dead; },
        get atMenu() { return atMenu; }, get birdId() { return birdId; }, beginRun, swapBird,
        step(dt) { update(dt); }
      }
    };
  }
});


