/* ======================================================== FLAPPY ========= */
registerGame({
  id: 'flappy',
  fluid: true, maxW: 1400,
  title: 'Flappy Bird',
  tagline: 'One button, one job: fit through the gaps. They get tighter the further you fly. Race friends online.',
  tags: ['Skill', 'Reflex', 'Online'],
  scoreLabel: 'Pipes',
  mp: 'race',
  front: true,
  controls: [['Flap', 'Space / Click'], ['Pause', 'Esc']],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="flB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa8e0"/><stop offset=".6" stop-color="#8fd4f0"/><stop offset="1" stop-color="#cceaf6"/></linearGradient><linearGradient id="flP" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f8f3e"/><stop offset=".28" stop-color="#7ede77"/><stop offset=".62" stop-color="#41a851"/><stop offset="1" stop-color="#1d6b2c"/></linearGradient><radialGradient id="flBd" cx=".35" cy=".3"><stop offset="0" stop-color="#ffe98a"/><stop offset=".6" stop-color="#f7bf2e"/><stop offset="1" stop-color="#c8830c"/></radialGradient></defs><rect width="320" height="180" fill="url(#flB)"/><circle cx="262" cy="34" r="20" fill="#fff8c8" opacity=".85"/><circle cx="262" cy="34" r="30" fill="#fff8c8" opacity=".22"/><g fill="#ffffff" opacity=".7"><rect x="24" y="30" width="40" height="12" rx="6"/><rect x="14" y="40" width="62" height="13" rx="6.5"/><rect x="196" y="112" width="44" height="12" rx="6"/><rect x="186" y="122" width="66" height="13" rx="6.5"/></g><g><rect x="42" y="-6" width="52" height="76" rx="5" fill="url(#flP)"/><rect x="35" y="60" width="66" height="22" rx="6" fill="url(#flP)"/><rect x="35" y="60" width="66" height="6" rx="3" fill="#b9f5b0" opacity=".5"/><rect x="248" y="118" width="52" height="70" rx="5" fill="url(#flP)"/><rect x="241" y="106" width="66" height="22" rx="6" fill="url(#flP)"/><rect x="241" y="106" width="66" height="6" rx="3" fill="#b9f5b0" opacity=".5"/></g><g transform="translate(160 92)"><ellipse cy="44" rx="30" ry="8" fill="#0a2a3a" opacity=".22"/><circle r="36" fill="url(#flBd)"/><circle r="36" fill="none" stroke="#8a5a08" stroke-width="2" opacity=".35"/><path d="M-34 4c-6 10-4 22 6 26 10 4 20-4 22-14z" fill="#e8a91c"/><path d="M-30 6c-4 7-3 15 4 18 7 3 14-3 15-10z" fill="#ffd873" opacity=".8"/><circle cx="12" cy="-11" r="12" fill="#ffffff"/><circle cx="16" cy="-10" r="5.6" fill="#20242e"/><circle cx="13.6" cy="-13" r="2" fill="#fff"/><path d="M26 2h20l-9 9-4-6z" fill="#f97316"/><path d="M26 2h20l-6 6H26z" fill="#fb923c"/><ellipse cx="-12" cy="-18" rx="12" ry="7" fill="#fff6c8" opacity=".45" transform="rotate(-24 -12 -18)"/></g></svg>',
  mount(api) {
    let W = api.W; const H = 600, GY = 548;
    const GRAV = 1500, FLAP = -432, PW = 88, SPACING = 330;
    const RACE = getRace('flappy');
    let bird, pipes, score, alive, dead, dist, spawnX, started;
    const stars = [];
    for (let i = 0; i < 42; i++) stars.push({ x: rand(0, W), y: rand(0, 250), tw: rand(0, TAU), s: rand(.7, 1.7) });
    /* ------------------------------------------------------ day cycle ---
       The sky walks through a full day as you fly. Every layer reads its
       colour from the same set of keyframes, so the hills, ground, clouds and
       the sun/moon all agree about what time it is. Driven by distance rather
       than the clock so a run always starts in daylight. */
    /* One full day. At roughly 250px/s this is about two and a half
       minutes, so a run drifts from morning toward dusk rather than
       strobing through every hour in a few seconds. */
    const DAY = 36000;
    const TOD = [
      { at: 0,    top: '#3f9fd8', bot: '#c6e9f7', hf: '#2f6f8c', hn: '#1d4d63',
        g1: '#2f6b46', g2: '#3f8a5c', cloud: '255,255,255', ca: .40, star: 0,
        orb: '#fff3c4', halo: '251,191,36', tree: '#12321f', haze: '190,225,240', hz: .10 },
      { at: .28,  top: '#f2874f', bot: '#ffd9a6', hf: '#8a5058', hn: '#4e2f3c',
        g1: '#4a4a34', g2: '#63633f', cloud: '255,214,170', ca: .55, star: .08,
        orb: '#fff0b0', halo: '249,115,22', tree: '#2a1420', haze: '255,180,120', hz: .18 },
      { at: .44,  top: '#24265c', bot: '#7b4272', hf: '#33305a', hn: '#1e1b3a',
        g1: '#232f3c', g2: '#2d4250', cloud: '190,160,210', ca: .38, star: .55,
        orb: '#e9eeff', halo: '160,180,255', tree: '#140f24', haze: '120,110,190', hz: .16 },
      { at: .60,  top: '#070d24', bot: '#152a4d', hf: '#141a30', hn: '#0c1020',
        g1: '#152029', g2: '#1e3038', cloud: '150,170,210', ca: .22, star: 1,
        orb: '#eef3ff', halo: '170,195,255', tree: '#080a16', haze: '90,110,170', hz: .12 },
      { at: .80,  top: '#7a5f9e', bot: '#ffc79c', hf: '#5a4a6a', hn: '#372c46',
        g1: '#39492f', g2: '#4f6a48', cloud: '255,205,190', ca: .45, star: .22,
        orb: '#fff0c0', halo: '251,191,36', tree: '#1d1a2a', haze: '230,170,160', hz: .16 },
      { at: 1,    top: '#3f9fd8', bot: '#c6e9f7', hf: '#2f6f8c', hn: '#1d4d63',
        g1: '#2f6b46', g2: '#3f8a5c', cloud: '255,255,255', ca: .40, star: 0,
        orb: '#fff3c4', halo: '251,191,36', tree: '#12321f', haze: '190,225,240', hz: .10 }
    ];
    const hx = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mixHex = (a, b, t) => {
      const A = hx(a), B = hx(b);
      return '#' + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join('');
    };
    const mixNum = (a, b, t) => a + (b - a) * t;
    const mixRGB = (a, b, t) => {
      const A = a.split(',').map(Number), B = b.split(',').map(Number);
      return [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * t)).join(',');
    };
    function sky() {
      const p = ((dist / DAY) % 1 + 1) % 1;
      let i = 0;
      while (i < TOD.length - 2 && TOD[i + 1].at <= p) i++;
      const a = TOD[i], b = TOD[i + 1];
      const t = clamp((p - a.at) / Math.max(.0001, b.at - a.at), 0, 1);
      return {
        p: p,
        top: mixHex(a.top, b.top, t), bot: mixHex(a.bot, b.bot, t),
        hf: mixHex(a.hf, b.hf, t), hn: mixHex(a.hn, b.hn, t),
        g1: mixHex(a.g1, b.g1, t), g2: mixHex(a.g2, b.g2, t),
        tree: mixHex(a.tree, b.tree, t),
        cloud: mixRGB(a.cloud, b.cloud, t), ca: mixNum(a.ca, b.ca, t),
        star: mixNum(a.star, b.star, t),
        orb: mixHex(a.orb, b.orb, t), halo: mixRGB(a.halo, b.halo, t),
        haze: mixRGB(a.haze, b.haze, t), hz: mixNum(a.hz, b.hz, t)
      };
    }

    /* ------------------------------------------------------- foliage ----
       Trees rooted below the frame that sweep past far faster than the
       scenery behind them. They pass in front of everything, which is what
       sells the depth — the canopy is kept high and the trunk narrow so the
       lane the bird is actually flying through is never hidden for long. */
    const trees = [];
    /* spacing in world pixels — huge (effectively "never") until a few pipes
       are behind you, then closing in as the score climbs */
    const treeGap = () => {
      if (score < 3) return 1e9;
      const t = Math.min(1, (score - 3) / 24);
      return 1400 - t * 700;
    };
    /* Close enough together that they overlap into a hedge. A bush every
       thousand pixels put one lonely shrub on screen at a time, which read as
       a prop rather than as ground cover. */
    const bushGap = () => {
      const t = Math.min(1, score / 26);
      return 210 - t * 70;
    };
    function addTree(x) {
      trees.push({
        x: x,
        s: rand(.75, 1.35),
        lean: rand(-.12, .12),
        seed: rand(0, 1000),
        blobs: randi(4, 7)
      });
    }
    /* low bushes right at the lens, faster still */
    const bushes = [];
    function addBush(x) { bushes.push({ x: x, s: rand(.7, 1.3), seed: rand(0, 1000) }); }
    /* ================================================ the look (pixel art) ===
       The whole scene is drawn into a 150-pixel-tall buffer and blown up with
       nearest-neighbour sampling, which is what actually makes pixel art
       pixel art: every sprite is authored at one texel per pixel, every
       position lands on the grid, and nothing is resampled on the way to the
       screen. Drawing smooth shapes and hoping they read as chunky — which is
       what the first attempt did — just looks like soft vector art.

       WebGL does the compositing: one instanced quad, an atlas sampled
       NEAREST with no mipmaps. The canvas-2D backend behind QuadFX walks the
       same list for a machine without WebGL2.

       Every sprite here is drawn from scratch — an original bird, and the
       generic arcade vocabulary of green pipes and a striped ground. */
    const PX = 4;                            // screen pixels per art pixel
    const VH = 150;                          // the buffer is this tall
    const GYv = Math.round(GY / PX);         // the ground line, in art pixels
    const FX = QuadFX(2600, { nearest: true });
    const ATL = QuadAtlas(512, 256);
    const SPR = {};

    const c3 = h => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
    const WHITE = [1, 1, 1];

    /* the palette, fixed — pixel art picks its colours once and lives with them */
    const PAL = {
      out: '#3b2708', body: '#f7c744', shade: '#e0a72b', belly: '#fff3c4',
      wing: '#ffd86b', wingS: '#d99a20', beak: '#f06a2a', beakD: '#c74e19',
      eyeW: '#ffffff', eye: '#2b2b2b', tuft: '#ef6a5e',
      pOut: '#23430f', pDark: '#3e7a1c', pMid: '#5fa829', pLit: '#8ed64a', pHi: '#bdf07e',
      grassLite: '#8fd94a', grassMid: '#63b83a', grassDark: '#3f8c2a',
      soil: '#c68a52', soilD: '#a86a34', soilL: '#d9a06a', soilBase: '#8a5527',
      hillFar: '#9ad8b6', hillNear: '#74bd92',
      /* foliage is four tones and an outline, which is what lets a bush read
         as a rounded mass instead of a flat green shape */
      folOut: '#2d6b1f', folDark: '#3f8c2a', folMid: '#63b83a', folLite: '#8fd94a',
      trunk: '#a9713d', trunkD: '#7a4e28', trunkL: '#c28a52',
      cloud: '#ffffff', cloudS: '#dceef2'
    };

    function bakeArt() {
      const A = ATL, Q = PAL;

      /* ---- the bird: three frames of one wing beat.
             Body spans are [y, x, width]; the outline is the same spans a
             pixel wider, drawn underneath, which is the cheapest way to get an
             even one-pixel edge all the way round a blob. ---- */
      const BODY = [[2, 4, 9], [3, 3, 11], [4, 2, 12], [5, 2, 12], [6, 1, 13],
                    [7, 1, 13], [8, 1, 13], [9, 2, 12], [10, 3, 11], [11, 5, 7]];
      const birdFrame = wing => (g) => {
        const put = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        /* tail, behind everything */
        put(0, 5, 2, 1, Q.out); put(0, 6, 1, 3, Q.shade); put(0, 9, 2, 1, Q.out);
        for (const [y, x, w] of BODY) put(x - 1, y, w + 2, 1, Q.out);
        put(BODY[0][1], BODY[0][0] - 1, BODY[0][2], 1, Q.out);
        put(BODY[9][1], BODY[9][0] + 1, BODY[9][2], 1, Q.out);
        for (const [y, x, w] of BODY) put(x, y, w, 1, Q.body);
        /* shading along the back */
        put(5, 2, 6, 1, Q.shade); put(4, 3, 6, 1, Q.shade);
        /* belly, lower and forward */
        put(6, 9, 6, 1, Q.belly); put(5, 10, 6, 1, Q.belly);
        /* a red crest — this bird's own, and nobody else's */
        put(5, 1, 2, 1, Q.tuft); put(6, 0, 2, 1, Q.tuft); put(6, 1, 1, 1, Q.out);
        /* eye */
        put(9, 3, 4, 3, Q.eyeW);
        put(10, 4, 2, 2, Q.eye);
        put(10, 3, 1, 1, Q.eyeW);
        /* beak, out to the right */
        put(13, 6, 5, 1, Q.out);
        put(13, 7, 5, 2, Q.beak);
        put(13, 9, 4, 1, Q.beakD);
        put(17, 7, 1, 2, Q.out);
        /* The wing, at one of three heights, and outlined all the way round —
           without the outline it read as a pale stripe across the bird rather
           than as a wing lying over it. Two pixels of travel per frame, so the
           beat is visible at four-times scale. */
        const wy = 6 + wing * 2;             // 4 up · 6 level · 8 down
        put(2, wy - 1, 8, 1, Q.out);
        put(1, wy, 1, 3, Q.out);
        put(10, wy, 1, 3, Q.out);
        put(2, wy + 3, 8, 1, Q.out);
        put(2, wy, 8, 3, wing < 0 ? Q.wing : Q.wingS);
        put(3, wy + 1, 5, 1, Q.wing);
      };
      for (let i = 0; i < 3; i++) SPR['bird' + i] = A.add(18, 14, birdFrame(i - 1));

      /* ---- pipes: a body uniform down its length, and a wider cap ---- */
      const pipeCols = (g, w, h) => {
        const put = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
        put(0, 0, 1, h, Q.pOut);
        put(1, 0, 2, h, Q.pDark);
        put(3, 0, 2, h, Q.pLit);
        put(5, 0, 1, h, Q.pHi);
        put(6, 0, 8, h, Q.pMid);
        put(14, 0, 4, h, Q.pDark);
        put(18, 0, w - 19, h, Q.pOut);
        put(w - 1, 0, 1, h, Q.pOut);
      };
      SPR.pipeBody = A.add(22, 8, pipeCols);
      const cap = facing => (g, w, h) => {
        const put = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
        pipeCols(g, w, h);
        put(0, 0, w, 1, Q.pOut);
        put(0, h - 1, w, 1, Q.pOut);
        if (facing > 0) put(1, h - 2, w - 2, 1, Q.pDark);
        else put(1, 1, w - 2, 1, Q.pHi);
      };
      SPR.capTop = A.add(26, 12, cap(1));
      SPR.capBot = A.add(26, 12, cap(-1));

      /* ---- clouds ---- */
      const cloud = spec => (g) => {
        const put = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        for (const [y, x, w] of spec) put(x, y, w, 1, Q.cloud);
        const last = spec[spec.length - 1];
        put(last[1] + 1, last[0], last[2] - 2, 1, Q.cloudS);
      };
      SPR.cloud0 = A.add(20, 7, cloud([[1, 6, 6], [2, 4, 11], [3, 2, 15], [4, 1, 18], [5, 1, 18]]));
      SPR.cloud1 = A.add(28, 9, cloud([[1, 9, 8], [2, 6, 15], [3, 3, 21], [4, 1, 26], [5, 1, 26], [6, 2, 24]]));

      /* ---- hills: one tile, repeated. The sines close over the tile so the
             wrap does not show a seam. ---- */
      const hillTile = (amp, base, col) => (g, w, h) => {
        g.fillStyle = col;
        for (let x = 0; x < w; x++) {
          const t = x / w * TAU;
          const top = Math.round(h - base - Math.sin(t) * amp - Math.sin(t * 3 + 1.1) * amp * .4);
          g.fillRect(x, top, 1, h - top);
        }
      };
      SPR.hillFar = A.add(128, 40, hillTile(9, 16, Q.hillFar));
      SPR.hillNear = A.add(128, 40, hillTile(6, 9, Q.hillNear));

      /* ---- the ground: bright grass, a dark lip, tufts hanging down into
             warm soil, and a darker band at the bottom. Thirty-two pixels of
             tile rather than twenty-four, because a short tile repeating
             across a wide stage is the thing the eye picks up first. ---- */
      SPR.ground = A.add(32, 13, (g, w, h) => {
        const put = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
        put(0, 0, w, 1, Q.folOut);
        put(0, 1, w, 3, Q.grassLite);
        put(0, 4, w, 1, Q.grassMid);
        put(0, 5, w, 1, Q.grassDark);
        put(0, 6, w, h - 6, Q.soil);
        /* grass hanging into the soil, on an irregular run so the tile does
           not read as a comb */
        const tuft = [2, 0, 1, 3, 0, 2, 1, 0, 2, 4, 1, 0, 2, 1, 3, 0];
        for (let i = 0; i < w / 2; i++) {
          const d = tuft[i % tuft.length];
          if (d) put(i * 2, 6, 2, d, Q.grassDark);
        }
        /* soil grain */
        put(3, 8, 2, 1, Q.soilD); put(12, 9, 3, 1, Q.soilD);
        put(21, 8, 2, 1, Q.soilD); put(27, 10, 3, 1, Q.soilD);
        put(7, 10, 2, 1, Q.soilL); put(17, 11, 2, 1, Q.soilL); put(25, 9, 1, 1, Q.soilL);
        put(0, h - 1, w, 1, Q.soilBase);
      });

      /* ---- foliage ----
         One clump routine does the bushes and the tree canopies. It lays the
         same lobes down four times — an outline a pixel fat, the dark body,
         the mid tone lifted one pixel, and a light cap lifted three — which is
         what turns a row of circles into something with a lit top and a
         shaded underside. A lobe is a square with its corners knocked off: a
         real circle at radius five is four pixels and a rumour. */
      const blob = (g, cx, cy, r, col) => {
        g.fillStyle = col;
        g.fillRect(cx - r, cy - r + 1, r * 2, r * 2 - 2);
        g.fillRect(cx - r + 1, cy - r, r * 2 - 2, r * 2);
      };
      const clump = (g, lobes, base) => {
        for (const [x, y, r] of lobes) blob(g, x, base - y, r + 1, Q.folOut);
        for (const [x, y, r] of lobes) blob(g, x, base - y, r, Q.folDark);
        for (const [x, y, r] of lobes) blob(g, x, base - y - 1, r - 1, Q.folMid);
        for (const [x, y, r] of lobes) if (r > 4) blob(g, x, base - y - 3, r - 4, Q.folLite);
      };

      /* Five bushes, from a single tussock to a long low hedge, so a run of
         them along the ground never reads as one shape stamped over and over. */
      const BUSHES = [
        [34, 22, [[9, 3, 5], [18, 6, 7], [27, 3, 5]]],
        [44, 26, [[9, 4, 6], [19, 9, 8], [30, 5, 6], [38, 2, 4]]],
        [42, 30, [[10, 8, 7], [22, 12, 9], [33, 6, 6]]],
        [50, 20, [[8, 3, 5], [17, 5, 6], [26, 4, 5], [35, 3, 5], [43, 2, 4]]],
        [24, 18, [[8, 3, 5], [16, 2, 4]]]
      ];
      BUSHES.forEach(([w, h, lobes], i) => {
        SPR['bush' + i] = A.add(w, h, (g, ww, hh) => clump(g, lobes, hh - 1));
      });

      /* Four trees. The canopy is nearly half the height — the first pass gave
         them a long bare trunk and a tuft, which read as a lamp post. */
      const TREES = [
        [60, 112, 96, [[-11, 66, 11], [2, 76, 13], [14, 64, 10], [-2, 58, 9]]],
        [56, 94, 80, [[-10, 54, 10], [3, 62, 12], [13, 52, 9]]],
        [64, 126, 110, [[-13, 78, 12], [0, 90, 14], [14, 76, 11], [1, 66, 10]]],
        [52, 86, 72, [[-8, 48, 9], [4, 56, 11], [12, 46, 8]]]
      ];
      TREES.forEach(([w, h, hgt, lobes], i) => {
        SPR['tree' + i] = A.add(w, h, (g, ww, hh) => {
          const cx = ww >> 1, tTop = hh - hgt;
          g.fillStyle = Q.trunkD; g.fillRect(cx - 4, tTop + 22, 8, hgt - 22);
          g.fillStyle = Q.trunk; g.fillRect(cx - 3, tTop + 22, 6, hgt - 22);
          g.fillStyle = Q.trunkL; g.fillRect(cx - 3, tTop + 22, 2, hgt - 22);
          /* a flare where it meets the ground, so it is planted rather than
             stuck in */
          g.fillStyle = Q.trunkD; g.fillRect(cx - 7, hh - 6, 14, 6);
          g.fillStyle = Q.trunk; g.fillRect(cx - 6, hh - 6, 11, 6);
          clump(g, lobes.map(l => [cx + l[0], l[1], l[2]]), hh - 1);
        });
      });

      /* ---- sun and moon, one blocky disc ---- */
      SPR.orb = A.add(13, 13, (g, w, h) => {
        const r = 6, cx = 6, cy = 6;
        g.fillStyle = '#ffffff';
        for (let y = 0; y < h; y++) {
          const dy = y - cy, dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
          if (dx > 0) g.fillRect(cx - dx, y, dx * 2 + 1, 1);
        }
      });

      FX.setAtlas(A.canvas);
    }
    bakeArt();

    function reset() {
      bird = { x: 268, y: H / 2 - 40, vy: 0, r: 15, rot: 0 };
      pipes = []; score = 0; alive = true; dead = 0; dist = 0; started = false;
      spawnX = W + 120;
      for (let i = 0; i < 4; i++) addPipe(spawnX + i * SPACING);
      trees.length = 0; bushes.length = 0;
      /* a hedge already growing when the round opens, rather than one shrub
         wandering in from the right after four seconds */
      for (let x = 40; x < W + 320; x += 200) addBush(x);
    }
    function gapFor() { return Math.max(148, 200 - score * 1.7); }
    function addPipe(x) {
      const g = gapFor(), m = randi(110, GY - 110 - g);
      pipes.push({ x, top: m, gap: g, passed: false });
    }
    reset();
    if (api.entry === 'play' && !RACE) Sound.flapSwoosh();

    function flap() {
      if (!alive) return;
      started = true; bird.vy = FLAP; Sound.flapWing();
      /* No particle burst on a flap. The shell's effects layer paints at full
         resolution on top of the game, so five round white dots over a
         four-pixel grid read as dirt on the screen rather than as air. */
    }

    /* ---- the front page ----
       Opened from the hub, Flappy Bird starts on its own title, in the same
       pixels as everything else: the name in blocky letters, the bird bobbing
       where it will start, the hills and hedge drifting past, a scoreboard
       with your best and the medal it earned, and two chunky buttons. Play -
       or a click anywhere - is the first flap, so the run starts from here. */
    const FK = FrontKit(api, {
      online: !!RACE, mp: true,
      goSound() { Sound.flapSwoosh(); },
      onStart() { flap(); },
      onBackdrop() { FK.go(); }
    });
    let drift = 0;
    const MEDALS = [[40, 'GOLD', '#f5c542', '#b8861c', '#fff2b0'], [25, 'SILVER', '#d9e0ea', '#8d97a6', '#ffffff'],
                    [10, 'BRONZE', '#d6874a', '#8f4e22', '#f4c08f']];
    /* the menu's own loop: the world drifts past slowly and the bird bobs */
    function idle(dt) {
      drift += 70 * dt;
      for (let i = bushes.length - 1; i >= 0; i--) {
        bushes[i].x -= 70 * .72 * dt;
        if (bushes[i].x < -220) bushes.splice(i, 1);
      }
      let farB = -1e9;
      for (const b of bushes) farB = Math.max(farB, b.x);
      if (farB < W + 60) addBush(Math.max(W + 160, farB + bushGap()));
      bird.y = H / 2 - 40 + Math.sin(performance.now() / 320) * 12;
    }
    /* a box on the art grid: one pixel of outline, corners knocked off, a lit
       row along the top and a shaded one along the bottom */
    const snap = n => Math.round(n / PX) * PX;
    function pxBox(ctx, x, y, w, h, body, hi, lo) {
      x = snap(x); y = snap(y); w = snap(w); h = snap(h);
      const P = PX;
      ctx.fillStyle = PAL.out;
      ctx.fillRect(x + P, y, w - 2 * P, h); ctx.fillRect(x, y + P, w, h - 2 * P);
      ctx.fillStyle = body;
      ctx.fillRect(x + 2 * P, y + P, w - 4 * P, h - 2 * P); ctx.fillRect(x + P, y + 2 * P, w - 2 * P, h - 4 * P);
      if (hi) { ctx.fillStyle = hi; ctx.fillRect(x + 2 * P, y + P, w - 4 * P, P); ctx.fillRect(x + P, y + 2 * P, P, h - 5 * P); }
      if (lo) { ctx.fillStyle = lo; ctx.fillRect(x + 2 * P, y + h - 2 * P, w - 4 * P, P); }
    }
    /* a medal, pixel by pixel: a rim, a face, a glint and a sparkle; an empty
       socket until you have earned one */
    function pxMedal(ctx, cx, cy, M) {
      const P = PX, R = 6;
      cx = snap(cx); cy = snap(cy);
      const disc = (r, col) => {
        ctx.fillStyle = col;
        for (let j = -r; j <= r; j++) {
          const d = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)) + .5);
          ctx.fillRect(cx - d * P, cy + j * P, (2 * d + 1) * P, P);
        }
      };
      if (!M) { disc(R + 1, '#c9bf72'); disc(R, '#e7df9c'); return; }
      disc(R + 1, PAL.out); disc(R, M[3]); disc(R - 1, M[2]);
      ctx.fillStyle = M[4];
      ctx.fillRect(cx - 3 * P, cy - 4 * P, 2 * P, P); ctx.fillRect(cx - 4 * P, cy - 3 * P, P, 2 * P);
      ctx.fillRect(cx, cy - 2 * P, P, 5 * P); ctx.fillRect(cx - 2 * P, cy, 5 * P, P);
      ctx.fillRect(cx - P, cy - P, 3 * P, 3 * P);
    }
    function pxButton(ctx, key, cx, y, w, h, label, px, C, live) {
      const b = FK.btn(key, cx - w / 2, y, w, h, live);
      const lift = Math.round(b.h) * PX, sink = b.p < -8 ? PX : 0, top = y - lift + sink;
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(snap(cx - w / 2) + PX, snap(y) + snap(h), snap(w) - 2 * PX, PX);
      pxBox(ctx, cx - w / 2, top, w, h, live === false ? '#9a9483' : C[0], live === false ? '#b5af9c' : C[1], live === false ? '#7f7a6b' : C[2]);
      Hud.pix(ctx, label, cx, snap(top) + snap(h) / 2, px,
              { align: 'center', baseline: 'middle', fill: '#ffffff', outline: PAL.out, ow: .6 });
    }

    function drawMenu(ctx) {
      const cx = Math.max(W / 2, 518), t = FK.t;
      /* the name, a letter at a time, then a lazy wave along it the way a wing
         beats */
      const G1 = FK.pixWord('fl-flappy', 'FLAPPY', { px: 8, depth: 7, fill: () => PAL.body, side: () => PAL.wingS, edgeCol: PAL.out });
      const G2 = FK.pixWord('fl-bird', 'BIRD', { px: 8, depth: 7, fill: () => PAL.pLit, side: () => PAL.pDark, edgeCol: PAL.out });
      const letter = n => {
        const k = FK.in(.08 + n * .06, .42);
        const wave = t > 1.2 ? Math.sin(t * 3.2 - n * .55) * 3 : 0;
        return { a: k > 0 ? 1 : 0, dy: snap((1 - FK.bo(k)) * -60 + wave) };
      };
      FK.drawWord(ctx, G1, cx, 60, i => letter(i));
      FK.drawWord(ctx, G2, cx, 144, i => letter(6 + i));

      /* the scoreboard: the medal your best is worth, and the best itself */
      const sk = FK.in(.5, .45);
      if (sk > 0) {
        const pw = 328, ph = 96, px0 = cx - pw / 2, py0 = 236 + snap((1 - FK.eo(sk)) * 24);
        pxBox(ctx, px0, py0, pw, ph, '#ded895', '#f4ecb8', '#c9bf72');
        const best = Math.max(0, api.best()), M = MEDALS.find(m => best >= m[0]);
        Hud.pix(ctx, 'MEDAL', px0 + 60, py0 + 12, 2, { align: 'center', fill: '#b8862e' });
        pxMedal(ctx, px0 + 58, py0 + 56, M);
        const rx = px0 + pw - 22;
        Hud.pix(ctx, 'BEST', rx, py0 + 12, 2, { align: 'right', fill: '#b8862e' });
        Hud.pix(ctx, String(best), rx, py0 + 28, 4.5, { align: 'right', thick: true, fill: '#ffffff', outline: PAL.out, ow: .5 });
        Hud.pix(ctx, M ? M[1] + ' FLIER' : best ? (10 - best) + ' MORE FOR BRONZE' : 'NO RUNS YET', rx, py0 + 72, 2,
                { align: 'right', fill: M ? '#8a6420' : '#a48a4a' });
      }
      /* the two ways in */
      const m = FK.mode(), bk = FK.in(.7, .35), P2 = api.party;
      if (bk > 0) {
        const by = 352 + snap((1 - FK.eo(bk)) * 30);
        pxButton(ctx, 'play', cx - 116, by, 216, 56, m === 'host' ? 'START RACE' : m === 'guest' ? 'WAITING' : 'PLAY',
                 m === 'solo' ? 3.6 : 2.8, [PAL.beak, '#ff9a5c', PAL.beakD], m !== 'guest');
        pxButton(ctx, 'party', cx + 116, by, 216, 56, P2.inRoom ? 'PARTY - ' + P2.size : 'RACE FRIENDS',
                 2.6, [PAL.pMid, PAL.pLit, PAL.pDark], true);
      }
      if (FK.in(1, .3) > 0 && Math.floor(t * 1.6) % 3 !== 2)
        Hud.pix(ctx, 'SPACE OR CLICK TO FLAP', cx, 444, 2.5, { align: 'center', fill: '#ffffff', outline: PAL.out, ow: .5 });
      FK.cursor();
    }

    /* ---- the results ----
       The original's game-over screen, and the arcade's half of the round
       beside it on the same card stock: GAME OVER dropping in, in the title's
       own letters; the tan scoreboard with the medal this run earned, the
       score counting up and the best under it (NEW when it is); and a second
       card with the coins the round paid, line by line, and the level bar. */
    const ptext = (ctx, s, x, y, size, col, align) =>
      Hud.pix(ctx, String(s).toUpperCase(), x, y, Math.max(1.5, size / 7), { align, baseline: 'middle', fill: col });
    const RES_ST = {
      text: ptext, label: ptext, measure: (ctx, s, size) => Hud.pixWidth(String(s), Math.max(1.5, size / 7)),
      ink: '#5c3d12', mute: '#a48a4a', gold: '#e8741e', rule: 'rgba(92,61,18,.28)', bar: 'rgba(92,61,18,.18)', fill: '#f06a2a',
      rowH: 22, size: 14, lsize: 12, totalSize: 28, totalH: 38, xpH: 40, barH: 8, barR: 0, noteGap: 96
    };
    function drawResults(ctx) {
      const R = FK.R, cx = W / 2;
      FK.resSounds();
      ctx.fillStyle = 'rgba(24,16,4,' + (.3 * FK.eo(FK.rs('title', undefined, .4))).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);

      /* the verdict, a letter at a time, the way the title arrives */
      const word = String(R.title).toUpperCase().slice(0, 14);
      const G = FK.pixWord('fl-res-' + word, word, { px: 7, depth: 6, fill: () => '#ffb347', side: () => '#c96a14', edgeCol: PAL.out });
      FK.drawWord(ctx, G, cx, 30, i => {
        const k = FK.rs('title', undefined, .5) * 1.6 - i * .06;
        return k <= 0 ? { a: 0 } : { dy: snap((1 - FK.bo(Math.min(1, k))) * -40) };
      });
      if (R.message) ptext(ctx, R.message, cx, 108, 14, '#ffffff', 'center');

      /* two cards side by side, the scoreboard and the arcade's */
      const cw = 408, gap = 22, x1 = snap(cx - cw - gap / 2), x2 = snap(cx + gap / 2), y0 = 134;
      const hL = 170 + (R.standings ? 34 + R.standings.length * 24 : 0);
      const hR = 58 + FK.ledgerH(RES_ST);
      const k1 = FK.eo(FK.rs('stat', 0, .45)), k2 = FK.eo(FK.rs('row', 0, .45) * (R.paid.length ? 1 : 0) + FK.rs('xp', undefined, .45) * (R.paid.length ? 0 : 1));

      /* ---- the scoreboard ---- */
      ctx.save(); ctx.globalAlpha *= k1;
      const sy = y0 + snap((1 - k1) * 60);
      pxBox(ctx, x1, sy, cw, hL, '#ded895', '#f4ecb8', '#c9bf72');
      const M = MEDALS.find(m => R.score >= m[0]);
      Hud.pix(ctx, 'MEDAL', x1 + 70, sy + 16, 2, { align: 'center', fill: '#b8862e' });
      pxMedal(ctx, x1 + 70, sy + 78, M);
      /* the medal's glint, once it lands */
      const gk = FK.rs('stat', 1, .6);
      if (M && gk > 0 && gk < 1) {
        const a = Math.sin(gk * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        const gx = snap(x1 + 70 + 16), gy = snap(sy + 78 - 20), P = PX;
        ctx.fillRect(gx, gy - P, P, P * 3); ctx.fillRect(gx - P, gy, P * 3, P);
      }
      const dist = (R.gameStats.find(s => s.label === 'Distance') || {}).value;
      if (dist) Hud.pix(ctx, 'DIST ' + String(dist).toUpperCase(), x1 + 70, sy + 136, 2, { align: 'center', fill: '#a48a4a' });
      const rx = x1 + cw - 26;
      Hud.pix(ctx, 'SCORE', rx, sy + 16, 2, { align: 'right', fill: '#b8862e' });
      const shown = Math.round(R.score * FK.eo(FK.rs('stat', 0, .8)));
      Hud.pix(ctx, String(shown), rx, sy + 34, 5, { align: 'right', thick: true, fill: '#ffffff', outline: PAL.out, ow: .5 });
      Hud.pix(ctx, 'BEST', rx, sy + 94, 2, { align: 'right', fill: '#b8862e' });
      Hud.pix(ctx, String(R.best), rx, sy + 112, 4, { align: 'right', thick: true, fill: '#ffffff', outline: PAL.out, ow: .5 });
      if (R.isBest) {
        const nk = FK.bo(FK.rs('tag', undefined, .4));
        const bw = Hud.pixWidth(String(R.best), 4, true), nx = rx - bw - 66, ny = sy + 114;
        ctx.save(); ctx.translate(nx + 26, ny + 14); ctx.scale(nk, nk);
        pxBox(ctx, -26, -14, 52, 28, '#e8402e', '#ff7a5c', '#a8261a');
        Hud.pix(ctx, 'NEW', 0, 0, 2, { align: 'center', baseline: 'middle', fill: '#ffffff' });
        ctx.restore();
      } else if (R.cheated) {
        Hud.pix(ctx, 'NOT SAVED', rx, sy + 150, 2, { align: 'right', fill: '#c0392b' });
      }
      /* a race's field, under the scoreboard */
      if (R.standings) {
        let ry = sy + 172;
        ctx.fillStyle = 'rgba(92,61,18,.25)'; ctx.fillRect(x1 + 20, ry - 6, cw - 40, 4);
        Hud.pix(ctx, 'RACE', x1 + 24, ry + 6, 2, { fill: '#b8862e' });
        ry += 28;
        R.standings.forEach((p, i) => {
          const kk = FK.eo(FK.rs('std', i, .3));
          if (kk <= 0) return;
          const col = p.me ? '#e8741e' : '#5c3d12';
          Hud.pix(ctx, (i + 1) + ' ' + String(p.name).toUpperCase().slice(0, 14), x1 + 24, ry + i * 24, 2, { fill: col, alpha: kk });
          Hud.pix(ctx, String(p.score), x1 + cw - 24, ry + i * 24, 2, { align: 'right', fill: col, alpha: kk });
        });
      }
      ctx.restore();

      /* ---- the arcade's card: coins and the level ---- */
      ctx.save(); ctx.globalAlpha *= k2;
      const ly = y0 + snap((1 - k2) * 60);
      pxBox(ctx, x2, ly, cw, hR, '#ded895', '#f4ecb8', '#c9bf72');
      Hud.pix(ctx, 'COINS', x2 + 22, ly + 16, 2, { fill: '#b8862e' });
      /* the purse, with a coin beside it */
      const pv = fmt(FK.purse()), pw2 = Hud.pixWidth(pv, 2.4);
      Hud.pix(ctx, pv, x2 + cw - 22, ly + 14, 2.4, { align: 'right', fill: '#5c3d12' });
      const ccx = snap(x2 + cw - 36 - pw2), ccy = ly + 22;
      ctx.fillStyle = PAL.out; ctx.fillRect(ccx - 8, ccy - 8, 16, 16);
      ctx.fillStyle = '#f7c744'; ctx.fillRect(ccx - 6, ccy - 6, 12, 12);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(ccx - 4, ccy - 4, 4, 4);
      FK.ledger(ctx, x2 + 22, ly + 44, cw - 44, RES_ST);
      ctx.restore();

      /* ---- the ways out: pixel buttons, the menu's own ---- */
      const kb = FK.eo(FK.rs('bar', undefined, .4));
      if (kb > 0) {
        ctx.save(); ctx.globalAlpha *= kb;
        const by = y0 + Math.max(hL, hR) + 24 + snap((1 - kb) * 20);
        const n = R.menuOk ? 3 : 2, bw = 188, bgap = 18, bx0 = cx - (n * bw + (n - 1) * bgap) / 2 + bw / 2;
        pxButton(ctx, 'again', bx0, by, bw, 54, 'PLAY', 3.4, [PAL.beak, '#ff9a5c', PAL.beakD], true);
        if (R.menuOk) pxButton(ctx, 'menu', bx0 + bw + bgap, by, bw, 54, 'MENU', 3, [PAL.pMid, PAL.pLit, PAL.pDark], true);
        pxButton(ctx, 'hub', bx0 + (n - 1) * (bw + bgap), by, bw, 54, 'HUB', 3, ['#9a8a64', '#c7b98c', '#6f6247'], true);
        if (FK.resFinished() && Math.floor(FK.t * 1.6) % 3 !== 2)
          Hud.pix(ctx, 'SPACE TO PLAY AGAIN', cx, by + 76, 2, { align: 'center', fill: '#ffffff', outline: PAL.out, ow: .5 });
        ctx.restore();
      }
      FK.resInput();
      FK.cursor();
    }

    return {
      /* the stage is fluid — pick up the new width */
      resize() { W = api.W; },
      /* Escape on the front page goes back to the hub; in a run it pauses */
      escape: FK.escape,
      destroy() { FK.done(); },
      /* the round is over: the results page is ours to draw */
      results(R) { FK.showResults(R, { sounds: { row: () => Sound.blip(), total: () => Sound.flapPoint() } }); },
      /* the baked sheet, so the sprites can be judged magnified rather than at
         four pixels across on a moving background */
      _dev: { atlas: () => ATL.canvas, spr: SPR, px: PX },
      update(dt) {
        const I = api.input;
        /* on the front page the menu has the keys and the world idles; a
           flap key or a click anywhere starts the run */
        if (FK.on) {
          if (!api.covered && I.anyPressed('ArrowUp', 'KeyW')) FK.go();
          else FK.input(I);
          if (FK.on) idle(dt);
          /* the press that left the menu was already the run's first flap
             (FK's onStart); reading it again below flapped twice at once */
          return;
        }
        if (I.anyPressed('Space', 'ArrowUp', 'KeyW') || I.takeClick()) flap();
        if (!alive) {
          dead += dt;
          bird.vy += GRAV * dt; bird.y += bird.vy * dt;
          bird.rot = Math.min(1.5, bird.rot + 3.2 * dt);
          if (bird.y > GY - bird.r) { bird.y = GY - bird.r; bird.vy = 0; }
          if (dead > .95) {
            const medal = score >= 40 ? 'Gold' : score >= 25 ? 'Silver' : score >= 10 ? 'Bronze' : '—';
            if (RACE) RACE.finish(score);
            /* Solo, the panel comes up on the original's swoosh rather than
               the shell's falling third. A race keeps the shell's sting: its
               result arrives later, once everyone is down, and has a place
               to announce. */
            if (!RACE) Sound.flapSwoosh();
            api.gameOver({
              score, sting: !!RACE,
              title: RACE ? raceTitle(RACE, 'Game Over') : 'Game Over',
              message: score >= 40 ? 'Outstanding flying.' : score >= 10 ? 'Solid run.' : 'Tap earlier, not harder.',
              stats: [{ label: 'Medal', value: medal }, { label: 'Distance', value: Math.round(dist / 10) + 'm' }]
                .concat(RACE ? raceStats(RACE, score) : [])
            });
          }
          return;
        }
        if (!started) {
          bird.y = H / 2 - 40 + Math.sin(performance.now() / 320) * 12;
          api.hud({ Pipes: score, Best: fmt(Store.best('flappy')) });
          return;
        }
        const speed = Math.min(300, 210 + score * 2.4);
        dist += speed * dt;
        /* The planting sits BEHIND the pipes and moves slower than them, which
           is the right way round: near things move fastest, and the nearest
           thing in this scene is the ground the pipes are standing in. Running
           the scenery past the camera faster than the pipes — which is what
           this did — makes the eye read the whole frame as sliding sideways. */
        for (let i = trees.length - 1; i >= 0; i--) {
          trees[i].x -= speed * .45 * dt;
          if (trees[i].x < -260) trees.splice(i, 1);
        }
        for (let i = bushes.length - 1; i >= 0; i--) {
          bushes[i].x -= speed * .72 * dt;
          if (bushes[i].x < -220) bushes.splice(i, 1);
        }
        /* The foliage builds up rather than being there from the first pipe:
           nothing for the opening few, then it thickens as the run gets long,
           so the view closing in is something you earn instead of a wall you
           start behind. */
        let far = -1e9;
        for (const t of trees) far = Math.max(far, t.x);
        const tg = treeGap();
        if (tg < 1e8 && far < W + 60) addTree(Math.max(W + 220, far + tg));
        let farB = -1e9;
        for (const b of bushes) farB = Math.max(farB, b.x);
        const bg = bushGap();
        if (farB < W + 60) addBush(Math.max(W + 160, farB + bg));
        bird.vy = Math.min(660, bird.vy + GRAV * dt);
        bird.y += bird.vy * dt;
        bird.rot = clamp(bird.vy / 620, -.5, 1.4);

        for (const p of pipes) {
          p.x -= speed * dt;
          if (!p.passed && p.x + PW < bird.x) {
            p.passed = true; score++; Sound.flapPoint();
            api.fx.text(bird.x + 30, bird.y - 30, '+1', '#86efac', 20);
          }
        }
        while (pipes.length && pipes[0].x < -PW - 10) pipes.shift();
        if (pipes.length < 5) addPipe(pipes[pipes.length - 1].x + SPACING);

        const hr = bird.r - 3;
        if (bird.y + hr > GY) { bird.y = GY - hr; die(false); return; }
        if (bird.y - hr < 0) { bird.y = hr; bird.vy = 0; }
        for (const p of pipes) {
          if (bird.x + hr > p.x && bird.x - hr < p.x + PW) {
            if (bird.y - hr < p.top || bird.y + hr > p.top + p.gap) { die(true); return; }
          }
        }
        if (RACE) RACE.report(score, alive, Math.round(dist / 10));
        api.hud({ Pipes: score, Best: fmt(Store.best('flappy')), Gap: Math.round(gapFor()) });
      },
      render(ctx) {
        FK.frame();
        const S = sky();
        /* the parallax runs on the distance flown plus the menu's slow drift */
        const scrollX = dist + drift;
        const now = performance.now();
        const VW = Math.ceil(W / PX);
        FX.resize(VW, VH);
        FX.begin(VW, VH);

        /* everything below is in ART pixels, snapped to the grid */
        const v = n => n / PX;
        const blit = (s, left, top, alpha, rot, tint) => {
          if (!s) return;
          FX.sprite(s, Math.round(left) + s.w / 2, Math.round(top) + s.h / 2,
                    s.w, s.h, alpha === undefined ? 1 : alpha, rot || 0, tint || WHITE);
        };

        /* ---- sky: flat bands, because a smooth ramp is the one thing a
               pixel-art sky never has ---- */
        const cTop = c3(S.top), cBot = c3(S.bot);
        const mid = [ (cTop[0]+cBot[0])/2, (cTop[1]+cBot[1])/2, (cTop[2]+cBot[2])/2 ];
        /* Two steps, and both of them down by the horizon. Three even bands up
           the whole sky read as a layer cake; keeping the change near the
           ground reads as distance instead. */
        FX.box(0, 0, VW, GYv - 30, cTop, 1);
        FX.box(0, GYv - 30, VW, 16, mid, 1);
        FX.box(0, GYv - 14, VW, 14, cBot, 1);

        /* ---- stars ---- */
        if (S.star > .01) {
          for (const s of stars) {
            const sx = Math.round(v(s.x)) % VW, sy = Math.round(v(s.y));
            FX.box(sx, sy, 1, 1, [.86, .92, .99],
                   S.star * (.3 + (Math.sin(now / 900 + s.tw) > 0 ? .6 : .1)));
          }
        }

        /* ---- sun or moon on one arc ---- */
        const ang = S.p * TAU - Math.PI / 2;
        const ox = v(W * .5 + Math.cos(ang) * W * .58);
        const oy = v(300 + Math.sin(ang) * 300);
        blit(SPR.orb, ox - 6, oy - 6, 1, 0, c3(S.orb));

        /* ---- clouds, two layers ---- */
        for (let i = 0; i < 5; i++) {
          const cx = ((i * 66 - v(scrollX) * .12) % (VW + 40) + VW + 40) % (VW + 40) - 30;
          blit(SPR.cloud0, cx, 18 + (i % 3) * 16, .85);
        }
        for (let i = 0; i < 3; i++) {
          const cx = ((i * 108 - v(scrollX) * .3) % (VW + 60) + VW + 60) % (VW + 60) - 40;
          blit(SPR.cloud1, cx, 40 + (i % 2) * 14, 1);
        }

        /* ---- hills: the tile repeated, twice, at two speeds ---- */
        const hills = (spr, par, yTop) => {
          const off = ((v(scrollX) * par) % 128 + 128) % 128;
          for (let x = -off; x < VW + 128; x += 128) blit(spr, x, yTop, 1);
        };
        hills(SPR.hillFar, .06, GYv - 40);
        hills(SPR.hillNear, .13, GYv - 34);

        /* ---- the planting, BEHIND the pipes ----
           It used to sweep past in front at nearly two and a half times the
           pipe speed, and John's read was that it looked like the scenery was
           moving rather than the bird flying. He was right, and the reason is
           that the eye takes the fastest thing on screen as the thing that is
           still: a foreground rushing past the camera reads as a pan, not as
           forward motion. Now they sit behind, below the pipe speed, so the
           only things moving at full rate are the pipes and the ground the
           bird is actually measured against. */
        for (const t of trees) {
          const s = SPR['tree' + ((t.seed | 0) % 4)];
          blit(s, v(t.x) - s.w / 2, GYv + 3 - s.h, 1);
        }
        for (const b of bushes) {
          const s = SPR['bush' + ((b.seed | 0) % 5)];
          blit(s, v(b.x) - s.w / 2, GYv + 1 - s.h, 1);
        }

        /* ---- pipes ---- */
        for (const p of pipes) {
          pipeGL(v(p.x), 0, v(p.top), true);
          pipeGL(v(p.x), v(p.top + p.gap), GYv - v(p.top + p.gap), false);
        }

        /* ---- ground ----
           At the SAME rate as the pipes, which it has to be: they stand on it.
           It used to scroll at 0.8 while they moved at 1.0, so every pipe slid
           very slightly along the ground it was planted in — small enough not
           to name, big enough to make the whole scene feel unanchored. */
        FX.box(0, GYv + 13, VW, VH - GYv - 13, c3(PAL.soil), 1);
        const goff = ((v(scrollX)) % 32 + 32) % 32;
        for (let x = -goff; x < VW + 32; x += 32) blit(SPR.ground, x, GYv, 1);

        /* ---- the bird, and the shadow that says how high it is ---- */
        const shK = clamp(1 - (GY - bird.y) / 520, .3, 1);
        FX.box(Math.round(v(bird.x)) - Math.round(4 * shK) - 1, GYv + 2,
               Math.round(8 * shK) + 3, 1, [0, 0, 0], .28 * shK);
        birdGL(v(bird.x), v(bird.y), bird.rot, alive && (started || FK.on), now);

        /* ---- night: one flat wash over the lot, so the palette stays honest
               and the hour still reads ---- */
        if (S.star > .02) FX.box(0, 0, VW, VH, [.05, .07, .18], S.star * .42);

        FX.flush();
        /* the one place the upscale happens, and it must not be filtered */
        const sm = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(FX.canvas, 0, 0, W, H);
        ctx.imageSmoothingEnabled = sm;

        /* ---- the score, set in the same pixels the world is drawn in ----
           It sits where the arcade always put it: big, centred, white with a
           hard black edge so it reads over sky, pipes and hedge alike. One
           art pixel is PX screen pixels, so the figure lands on the grid. */
        FK.layer(ctx, FK.out * (FK.R ? 1 - FK.eo(FK.rs('title', undefined, .3)) : 1), c => Hud.pix(c, String(score), W / 2, 40, PX * 1.5, {
          thick: true, fill: '#ffffff', outline: '#241c14',
          shadow: 'rgba(0,0,0,.22)', shadowY: 1.4, align: 'center'
        }));
        /* ---- and the one instruction, in the same face ---- */
        if (!started && alive && !FK.on) {
          ctx.globalAlpha = .65 + Math.sin(now / 260) * .25;
          Hud.pix(ctx, 'PRESS SPACE TO FLY', W / 2, H - 132, PX, {
            fill: '#ffffff', outline: '#241c14', ow: .5, align: 'center'
          });
          ctx.globalAlpha = 1;
        }
        if (RACE && !FK.R) raceBoard(ctx, 14, 14, RACE, { title: 'RACE' });
        if (FK.R) drawResults(ctx);
        /* the front page, faded as a whole as the bird takes off */
        if (FK.out < 1) FK.layer(ctx, 1 - FK.out, drawMenu);
      }

    };

    /* A pipe is the body stretched — it is uniform down its length, so the
       stretch never lands between texels — plus the cap on the end that faces
       the gap. */
    function pipeGL(x, y, h, top) {
      if (h <= 0) return;
      const X = Math.round(x), Y = Math.round(y), Hh = Math.round(h);
      FX.sprite(SPR.pipeBody, X + 11, Y + Hh / 2, 22, Hh, 1, 0, WHITE);
      const capY = top ? Y + Hh - 12 : Y;
      FX.sprite(top ? SPR.capTop : SPR.capBot, X + 11, capY + 6, 26, 12, 1, 0, WHITE);
    }

    /* Three frames of a wing beat, and a tilt quantised to fifteen degrees —
       a pixel sprite turned through a continuous angle crawls, and the steps
       read as deliberate. */
    function birdGL(x, y, rot, flying, now) {
      const beat = flying ? ((now / 90) | 0) % 4 : 1;
      const frame = beat === 3 ? 1 : beat;
      const step = Math.PI / 12;
      const r = Math.round(clamp(rot, -.5, 1.4) / step) * step;
      const s = SPR['bird' + frame];
      FX.sprite(s, Math.round(x), Math.round(y), s.w, s.h, 1, r, WHITE);
    }

    /* The original's two sounds: the smack of the collision, and — off a
       pipe, with the fall still to come — the whistle all the way down. The
       ground gets the smack alone; there is nowhere left to fall. */
    function die(pipe) {
      alive = false; api.shake(12);
      Sound.flapHit();
      if (pipe) Sound.flapDie(.14);
      api.fx.burst(bird.x, bird.y, { color: '#fbbf24', count: 24, speed: 300, size: 5, life: .8 });
    }
  }
});
