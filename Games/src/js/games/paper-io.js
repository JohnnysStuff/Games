/* =========================================================== PAPER.IO ===== */
/* Leave your own ground and you start drawing a line. Get back to your ground
   and everything the line closed off becomes yours. Get touched while the line
   is still open and you lose the lot.

   Four things carry the whole game and all four are easy to get wrong:

   - The claim is a FLOOD FILL FROM THE RIM, not a polygon fill. Flood the board
     from its edges treating your own ground as wall; anything the flood cannot
     reach is enclosed, and enclosed is yours. That one rule handles concave
     shapes, holes, loops that close through old ground and loops that swallow
     somebody else's territory, with no special cases.
   - The board is far bigger than the screen and the CAMERA DOES THE WORK. You
     see a couple of dozen cells at a time and it pulls back as you grow, which
     is the whole reason the genre feels like it is about expanding: a board
     that fits on screen is a puzzle, a board you have to travel is a map.
   - A country is a SLAB, not a paint job. The grid of owners is contoured
     (marching squares over a lightly blurred copy, so a loop drawn freehand
     comes back as that curve and not as a staircase) and every country is
     stood up as a solid a third of a body tall, its sides in shade. The board
     is cut into chunks and only the chunks a claim touched are rebuilt, so a
     big claim costs a few milliseconds and a small one next to nothing.
   - Guests are never sent the board. They are sent the trails, and they run the
     same claim function the host does, from the same trail, on their own copy
     of the grid — so a claim costs a few bytes on the wire instead of eight
     thousand cell indices. A full board goes out every second and a half purely
     as a safety net, so any drift heals itself.

   The look is the second game's: a round arena of pale mint in a turquoise
   sea, countries as raised slabs of flat bright colour with their sides a
   shade down, heads that are cubes with eyes on top, and a pastel line laid
   behind them. It is drawn with the shared 3D renderer, seen from high up
   and a little to the south, so every slab shows its front face; Canvas 2D
   paints a flat version where WebGL2 is unavailable. */
registerGame({
  id: 'turf',
  title: 'Paper.io',
  tagline: 'Draw a line out, loop it back, and everything inside becomes yours. Clip an open line and its owner loses the lot. Steal ground straight out from under your friends.',
  tags: ['Arena', 'Online', 'Versus', 'Action'],
  scoreLabel: 'Tiles',
  mp: 'arena',
  mpMin: 2, mpMax: 6,
  front: true,
  w: 960, h: 600,
  fluid: true, maxW: 1420,
  controls: [
    ['Steer', '&larr; &darr; &uarr; &rarr; / WASD'],
    ['Diagonals', 'hold two'],
    ['Pause', 'Esc']
  ],
  options: [
    { id: 'len', label: 'Round', def: 'normal', choices: [
      { v: 'short', l: '90s' }, { v: 'normal', l: '2:30' }, { v: 'long', l: '4:00' }
    ] },
    { id: 'speed', label: 'Pace', def: 'normal', choices: [
      { v: 'calm', l: 'Calm' }, { v: 'normal', l: 'Normal' }, { v: 'brisk', l: 'Brisk' }
    ] },
    { id: 'bots', label: 'Rivals', def: 'some', choices: [
      { v: 'few', l: '3' }, { v: 'some', l: '5' }, { v: 'many', l: '7' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><pattern id="twG" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#d6ddea" stroke-width="1.6"/></pattern></defs><rect width="320" height="180" fill="#e8ecf4"/><rect width="320" height="180" fill="url(#twG)"/><path d="M0 16h112v64h48v64H0z" fill="#2fb1ff"/><path d="M0 16h112v64h48v64H0z" fill="none" stroke="#1b7fc4" stroke-width="6"/><path d="M208 0h112v96h-64v32h-48z" fill="#ff4d5e"/><path d="M208 0h112v96h-64v32h-48z" fill="none" stroke="#c22f42" stroke-width="6"/><path d="M96 128h64v52H96z" fill="#ffc233"/><path d="M96 128h64v52H96z" fill="none" stroke="#c48d12" stroke-width="6"/><path d="M256 128v-32h-48" fill="none" stroke="#c22f42" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M256 128v-32h-48" fill="none" stroke="#ff4d5e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><g><rect x="244" y="116" width="26" height="26" rx="6" fill="#c22f42"/><rect x="246" y="118" width="22" height="22" rx="5" fill="#ff4d5e"/><circle cx="252" cy="126" r="4.6" fill="#fff"/><circle cx="263" cy="126" r="4.6" fill="#fff"/><circle cx="253" cy="127" r="2.3" fill="#1b2233"/><circle cx="264" cy="127" r="2.3" fill="#1b2233"/></g><g><rect x="150" y="70" width="24" height="24" rx="6" fill="#1b7fc4"/><rect x="152" y="72" width="20" height="20" rx="5" fill="#2fb1ff"/><circle cx="158" cy="79" r="4.2" fill="#fff"/><circle cx="168" cy="79" r="4.2" fill="#fff"/><circle cx="159" cy="80" r="2.1" fill="#1b2233"/><circle cx="169" cy="80" r="2.1" fill="#1b2233"/></g></svg>',

  mount(api) {
    const H = 600;
    let W = api.W;
    const MPS = getSession('turf');
    const HOSTMP = !!(MPS && MPS.role === 'host');
    const GUEST = !!(MPS && MPS.role === 'guest');
    const MYID = MPS ? MPS.me : 'you';
    const SIM = !GUEST;

    /* ------------------------------------------------------------- board */
    /* The world is measured in UNITS — a body is about one unit across — and
       the camera is the only thing that knows about pixels. The grid that
       records who owns what is three times finer than a unit, so a claim lands
       on thirds of a body rather than on whole ones: that is the difference
       between getting back the shape you drew and getting back a staircase of
       squares. Everything the player does is in units; only the grid work is
       in cells. */
    const SUB = 3, U = 1 / SUB;
    const UW = 96, UH = 96;                    // the board, in units: a square round the arena
    const COLS = UW * SUB, ROWS = UH * SUB;    // and in cells
    const N = COLS * ROWS;
    /* The arena is the disc inside that square. A cell whose centre is off it
       is the sea: nobody can own it, and a head that reaches it is out. NA is
       how many cells there are to hold, and every percentage is of that. */
    const ARC = UW / 2, ARR = UW / 2 - 1.5;    // centre and radius, in units
    const arena = new Uint8Array(N);
    let NA = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const dx = (x + 0.5) * U - ARC, dy = (y + 0.5) * U - ARC;
      if (dx * dx + dy * dy <= ARR * ARR) { arena[y * COLS + x] = 1; NA++; }
    }

    const opt = (id, def) => (MPS ? ((MPS.cfg && MPS.cfg[id]) || def) : (api.opt(id) || def));
    const PACE = ({ calm: 0.82, normal: 1, brisk: 1.24 })[opt('speed', 'normal')] || 1;
    const ROUND = ({ short: 90, normal: 150, long: 240 })[opt('len', 'normal')] || 150;
    const NBOT = ({ few: 3, some: 5, many: 7 })[opt('bots', 'some')] || 5;
    const RESPAWN = 2.4;
    const DOMINATE = 0.7;            // hold this much and the round is over

    const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]];
    const OPP = [2, 3, 0, 1];
    /* headings for those four, in screen angles — y grows downward, so up is
       negative. DIRFROMK reads the nearest one back off an arbitrary heading,
       which is all the grid-minded code (the rivals, mostly) still wants. */
    const DIRANG = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
    const DIRFROMK = [0, 3, 2, 1];
    const dirOfAng = a => DIRFROMK[(((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4)];
    const SPD = 9.4 * PACE;                   // cells a second
    const TURN = 11;                           // radians a second: a right angle in about .14s
    /* The few cells right behind the head are yours to cross. With free
       steering a hard turn curves back over what you have just laid, and dying
       for that would make turning at all a mistake. */
    const GRACE = 4 * SUB;
    const BOTNAME = ['Ada', 'Bolt', 'Kite', 'Nova', 'Sable', 'Juno', 'Rook'];

    /* --------------------------------------------------------------- colour */
    /* bright and clean, the second game's set: you are the green */
    const PAL = ['#2fd26c', '#35a3f5', '#ffa31f', '#ec4a9c', '#a4dc31', '#f2545f', '#9b6cf6', '#26c6d6'];
    const hex3 = h => {
      const n = parseInt(h.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };
    const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const BLACK3 = [0.055, 0.075, 0.12], WHITE3 = [1, 1, 1];
    const PAL3 = PAL.map(hex3);
    /* the border shade of each colour: the same hue taken down, never a grey,
       or a red country ends up fenced in brown */
    const PALD3 = PAL3.map(c => mix3(c, BLACK3, 0.42));
    const PALL3 = PAL3.map(c => mix3(c, WHITE3, 0.3));
    const INK = '#1b2233';
    const PAPER = '#eefaf6', PAPER3 = hex3(PAPER);
    const GRID3 = hex3('#dcefe9'), GRID3B = hex3('#cfe6df');
    const SEA = '#6fdcd4', OUT3 = hex3(SEA), RIM3 = hex3('#43b3ab');

    /* -1 is nobody. Two flat arrays rather than objects per cell: this is read
       once per step and uploaded as a texture, and it has to stay cheap. */
    const own = new Int8Array(N).fill(-1);
    const trailOwner = new Int8Array(N).fill(-1);
    /* The flood fill's scratch. A generation stamp rather than an array that
       gets cleared, and a typed stack rather than one that grows: this runs
       over seventy thousand cells per claim, several times a second. */
    const seenGen = new Int32Array(N);
    const fillStack = new Int32Array(N);
    let fillGen = 0;
    /* what the flat renderer reads: owner + 1, so nobody is 0 */
    const ownTex = new Uint8Array(N);
    let ownTexDirty = true;
    /* the 3D board's chunks and the minimap each look again when this is set */
    let terrDirty = true, mapDirty = true;

    const ix = (x, y) => y * COLS + x;
    const cxOf = i => i % COLS;
    const cyOf = i => (i / COLS) | 0;
    const inB = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
    const inA = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && arena[y * COLS + x] === 1;

    /* ----------------------------------------------------------- players */
    let players = [];
    function mkPlayer(idx, id, name, bot) {
      return {
        idx: idx, id: id, name: name, bot: !!bot,
        col: PAL[idx % PAL.length], col3: PAL3[idx % PAL.length],
        dark3: PALD3[idx % PAL.length], light3: PALL3[idx % PAL.length],
        x: 0, y: 0, ang: 0, wantAng: 0,        // where it really is, and where it is pointing
        cx: 0, cy: 0, dir: 0, want: 0,         // the cell under it, which is what the grid work needs
        alive: false, deadT: 0, trail: [], path: [],
        cells: 0, peak: 0, kills: 0,
        bp: 0, bn: 0, bout: 0, bh: 1, bd: 6, bw: 5,
        /* the cube's own motion, which is only ever looked at: how high it
           rides (it climbs onto a country), and a hop when a loop closes */
        hz: 0, hop: 0,
        /* Not every rival is a hunter. With all of them chasing lines nobody
           ever holds ground for long and the board reads as churn; about half
           of them just build, which is what makes the map grow. */
        aggr: Math.random() < 0.45
      };
    }
    (function buildRoster() {
      /* Online, the party comes first and rivals fill the rest of the board —
         the count comes off the host's options, so every guest builds the same
         roster in the same order without being told it. */
      if (MPS) {
        const list = (MPS.players || []).slice(0, 6);
        list.forEach((pl, i) => players.push(mkPlayer(i, pl.id, pl.name || 'Player', false)));
        if (!players.length) players.push(mkPlayer(0, MYID, 'You', false));
        const fill = Math.max(0, Math.min(8 - players.length, NBOT));
        for (let i = 0; i < fill; i++) players.push(mkPlayer(players.length, 'bot' + i, BOTNAME[i], true));
      } else {
        players.push(mkPlayer(0, MYID, 'You', false));
        for (let i = 0; i < NBOT; i++) players.push(mkPlayer(i + 1, 'bot' + i, BOTNAME[i], true));
      }
    })();
    const meP = () => players.find(p => p.id === MYID) || null;

    let phase = 'count', phaseT = 3.2, timeLeft = ROUND, ended = false;
    let lastTick = 99;
    const flashes = [], pops = [], bits = [], feed = [];
    /* `quiet` silences a board nobody is playing on (the front page's); `fx3`
       is the 3D board's particles, once there is one */
    let quiet = false, fx3 = null;

    /* ------------------------------------------------------------ spawning */
    /* a new country is a disc, as it is in the second game: seven cells
       across the radius, a little over two bodies */
    const SPAWN_R = 7;
    const inDisc = (dx, dy) => dx * dx + dy * dy <= (SPAWN_R + 0.5) * (SPAWN_R + 0.5);
    /* A spawn has to land on genuinely free ground: every cell of the patch
       unowned, no open line running through it, and nobody else near enough to
       be standing on you when you appear. Dropping somebody into the middle of
       a country that somebody else owns is the one thing this game must never
       do — it hands them your ground and kills you for standing on it.

       If there is no such square left anywhere, that is not a bug to work
       around: the board has been taken, and the round is over. */
    const CLEAR2 = 8 * 8;                      // eight units of elbow room, squared
    function spawnFits(p, cx, cy) {
      const R = SPAWN_R + 1;
      if (cx < R || cy < R || cx >= COLS - R || cy >= ROWS - R) return false;
      for (let y = cy - R; y <= cy + R; y++) {
        const row = y * COLS;
        for (let x = cx - R; x <= cx + R; x++) {
          const i = row + x;
          if (!arena[i] || own[i] >= 0 || trailOwner[i] >= 0) return false;
        }
      }
      const wx = (cx + 0.5) * U, wy = (cy + 0.5) * U;
      for (const q of players) {
        if (q === p || !q.alive) continue;
        const dx = q.x - wx, dy = q.y - wy;
        if (dx * dx + dy * dy < CLEAR2) return false;
      }
      return true;
    }
    function spawnSpot(p) {
      /* darts first: on an open board one lands immediately */
      for (let t = 0; t < 140; t++) {
        const cx = randi(SPAWN_R + 1, COLS - SPAWN_R - 2);
        const cy = randi(SPAWN_R + 1, ROWS - SPAWN_R - 2);
        if (spawnFits(p, cx, cy)) return [cx, cy];
      }
      /* then a sweep, so "nowhere" means nowhere rather than "unlucky" */
      const step = SPAWN_R;
      for (let cy = SPAWN_R + 1; cy < ROWS - SPAWN_R - 1; cy += step)
        for (let cx = SPAWN_R + 1; cx < COLS - SPAWN_R - 1; cx += step)
          if (spawnFits(p, cx, cy)) return [cx, cy];
      return null;
    }
    /* Both sides run this: the host from its own decision, a guest from the
       event carrying the same square. Keeping one function is what makes the
       two grids agree without shipping the grid. */
    function doSpawn(p, cx, cy) {
      p.cx = cx; p.cy = cy;
      p.x = (cx + 0.5) * U; p.y = (cy + 0.5) * U;
      p.dir = randi(0, 3); p.want = p.dir;
      p.ang = DIRANG[p.dir]; p.wantAng = p.ang;
      p.alive = true; p.deadT = 0; p.bp = 0; p.bn = 0;
      p.path.length = 0;
      p.hz = 0; p.hop = 1;
      cutTrail(p);
      for (let y = cy - SPAWN_R; y <= cy + SPAWN_R; y++)
        for (let x = cx - SPAWN_R; x <= cx + SPAWN_R; x++) {
          if (!inA(x, y) || !inDisc(x - cx, y - cy)) continue;
          const i = ix(x, y);
          dropTrailCell(i);
          own[i] = p.idx;
        }
      markGrid();
      recount();
      if (fx3) fx3.spawned(p);
    }
    /* a spawn landing on somebody's open line snips that one cell out of it
       rather than killing them for standing in the wrong place */
    function dropTrailCell(i) {
      const o = trailOwner[i];
      if (o < 0) return;
      const q = players[o];
      if (q) { const k = q.trail.indexOf(i); if (k >= 0) q.trail.splice(k, 1); }
      trailOwner[i] = -1;
    }
    function cutTrail(p) {
      for (const i of p.trail) if (trailOwner[i] === p.idx) trailOwner[i] = -1;
      p.trail.length = 0;
    }
    function markGrid() { ownTexDirty = true; terrDirty = true; mapDirty = true; }
    function recount() {
      const c = new Array(players.length).fill(0);
      for (let i = 0; i < N; i++) { const o = own[i]; if (o >= 0 && o < c.length) c[o]++; }
      for (const p of players) { p.cells = c[p.idx] || 0; if (p.cells > p.peak) p.peak = p.cells; }
    }

    /* -------------------------------------------------------------- dying */
    function doKill(p, by) {
      if (!p.alive) return;
      /* grab a scatter of the ground before it goes, so the collapse has
         something to throw */
      const got = [];
      for (let i = 0; i < N; i++) if (own[i] === p.idx && (i % 89) === 0) got.push(i);
      cutTrail(p);
      for (let i = 0; i < N; i++) if (own[i] === p.idx) own[i] = -1;
      p.alive = false; p.deadT = RESPAWN;
      p.path.length = 0;
      markGrid();
      recount();
      for (let k = 0; k < Math.min(got.length, 90); k++) {
        const i = got[(k * 7) % got.length];
        spark((cxOf(i) + 0.5) * U, (cyOf(i) + 0.5) * U, p.col3, 2);
      }
      if (fx3) fx3.shatter(p, got);
      const mine = p.id === MYID;
      if (!quiet) {
        if (mine) { Sound.turfLost(); api.shake(5); }
        else Sound.turfCut();
      }
      if (by && by !== p) {
        pushFeed(by.id === MYID ? 'You cut ' + p.name : by.name + ' cut ' + (mine ? 'you' : p.name),
                 by.col, mine);
      } else if (mine) pushFeed('You crashed', p.col, true);
    }
    function pushFeed(text, col, loud) {
      feed.push({ text: text, col: col, t: 0, loud: !!loud });
      if (feed.length > 4) feed.shift();
    }

    /* ------------------------------------------------------------ claiming */
    /* The rule the whole game rests on. Flood the board from its rim, treating
       this player's ground as solid; every cell the flood fails to reach is
       walled in, and walled in means claimed. */
    function doClaim(p, trailCells) {
      const gained = [];
      for (const i of trailCells) {
        if (trailOwner[i] === p.idx) trailOwner[i] = -1;
        if (own[i] !== p.idx) { own[i] = p.idx; gained.push(i); }
      }
      const id = p.idx, st = fillStack, seen = seenGen;
      const gg = ++fillGen;
      let sp = 0;
      for (let x = 0; x < COLS; x++) {
        let i = x;
        if (own[i] !== id && seen[i] !== gg) { seen[i] = gg; st[sp++] = i; }
        i = (ROWS - 1) * COLS + x;
        if (own[i] !== id && seen[i] !== gg) { seen[i] = gg; st[sp++] = i; }
      }
      for (let y = 0; y < ROWS; y++) {
        let i = y * COLS;
        if (own[i] !== id && seen[i] !== gg) { seen[i] = gg; st[sp++] = i; }
        i += COLS - 1;
        if (own[i] !== id && seen[i] !== gg) { seen[i] = gg; st[sp++] = i; }
      }
      while (sp > 0) {
        const i = st[--sp], x = i % COLS;
        let j;
        if (x > 0) { j = i - 1; if (own[j] !== id && seen[j] !== gg) { seen[j] = gg; st[sp++] = j; } }
        if (x < COLS - 1) { j = i + 1; if (own[j] !== id && seen[j] !== gg) { seen[j] = gg; st[sp++] = j; } }
        if (i >= COLS) { j = i - COLS; if (own[j] !== id && seen[j] !== gg) { seen[j] = gg; st[sp++] = j; } }
        if (i < N - COLS) { j = i + COLS; if (own[j] !== id && seen[j] !== gg) { seen[j] = gg; st[sp++] = j; } }
      }
      for (let i = 0; i < N; i++) if (seen[i] !== gg && own[i] !== id) { own[i] = id; gained.push(i); }
      p.trail.length = 0;
      p.path.length = 0;
      markGrid();
      recount();
      if (gained.length) flashClaim(p, gained);
      /* robbed of every last cell while your line is still out: there is
         nothing left to run back to */
      for (const q of players) if (q !== p && q.alive && q.cells === 0) doKill(q, p);
      return gained.length;
    }
    /* the pay-off. Cells light up in a wave travelling out from the point the
       loop closed, so a big claim reads as one gesture instead of a repaint.
       A claim can be thousands of cells and every one of them cannot be its
       own quad, so the wave is a ring in world space instead: one shape, and
       it reads as the same gesture. */
    function flashClaim(p, cells) {
      let far = 1;
      for (const i of cells) {
        const d = Math.max(Math.abs(cxOf(i) - p.cx), Math.abs(cyOf(i) - p.cy));
        if (d > far) far = d;
      }
      flashes.push({ x: p.x, y: p.y, r: far * U + 1, col: p.light3, t: 0, o: p.idx });
      const pct = cells.length / NA * 100;
      /* a body above the head, or the number lands on the face that earned it */
      if (pct >= 0.005) pops.push({ x: p.x, y: p.y, s: '+' + (pct < 1 ? pct.toFixed(2) : pct.toFixed(1)) + '%', col: p.col, t: 1 });
      p.hop = 1;
      if (fx3) fx3.claimed(p, cells.length);
      if (p.id === MYID) {
        if (!quiet) Sound.turfClaim(cells.length / NA);
        for (let k = 0; k < 14; k++) spark(p.x, p.y, p.light3, 3.2);
      } else if (!quiet) Sound.place();
    }
    /* small squares of ground, thrown and spinning, in world units */
    function spark(x, y, col3, spd) {
      if (bits.length > 260) return;
      const a = rand(0, TAU), s = rand(spd * 0.35, spd);
      bits.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rand(0.5, 2.5),
                  rot: rand(0, TAU), vr: rand(-9, 9), sz: rand(0.12, 0.3),
                  col: col3, t: 0, life: rand(0.5, 0.9) });
    }

    /* ----------------------------------------------------------- movement */
    /* The body is not on a lane. It has a position and a heading, and the
       heading swings toward whatever is being asked for at a fixed rate, so a
       turn is a curve you can watch rather than a jump between columns. The
       grid is still the thing that gets claimed — it just no longer decides
       where you are allowed to be. */
    function turnToward(a, t, m) {
      let d = t - a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      if (d > m) d = m; else if (d < -m) d = -m;
      return a + d;
    }
    /* How near another player's line has to come to count as touched. The grid
       is finer than a body, so a centre-only test would let a head sail
       through a line it visibly drove over; this is about two thirds of a
       unit, which is what the line looks like it is worth. */
    const KILL_R = 2;
    /* Arriving in a cell, and everything that can happen there. */
    function enterCell(p, nx, ny) {
      /* off the arena is into the sea */
      if (!inA(nx, ny)) { doKill(p); ev(['k', p.idx]); return false; }
      const i = ix(nx, ny);
      /* your own line is checked on the cell you are actually in — anything
         wider and a hard turn would kill you for curving over your own tail */
      if (trailOwner[i] === p.idx) {
        const k = p.trail.lastIndexOf(i);
        if (k >= 0 && k < p.trail.length - GRACE) { doKill(p); ev(['k', p.idx]); return false; }
      }
      /* Somebody else's line, to the width of a body. It is checked before the
         ground under it, because another player's line can and does run
         straight across your own territory. */
      for (let y = ny - KILL_R; y <= ny + KILL_R; y++) {
        if (y < 0 || y >= ROWS) continue;
        const row = y * COLS;
        for (let x = nx - KILL_R; x <= nx + KILL_R; x++) {
          if (x < 0 || x >= COLS) continue;
          const t = trailOwner[row + x];
          if (t < 0 || t === p.idx) continue;
          const victim = players[t];
          if (victim && victim.alive) { p.kills++; doKill(victim, p); ev(['k', victim.idx]); }
        }
      }
      p.cx = nx; p.cy = ny;
      if (own[i] === p.idx) {
        if (p.trail.length) { const tc = p.trail.slice(); ev(['c', p.idx, packTrail(p)]); doClaim(p, tc); }
      } else if (trailOwner[i] !== p.idx) {
        trailOwner[i] = p.idx;
        p.trail.push(i);
      }
      /* a rival decides once per cell, not once per frame — thinking sixty
         times a second burns a plan meant to last thirteen cells in a fifth of
         a second, and the thing just twitches on the spot */
      if (p.bot) { botThink(p); p.wantAng = DIRANG[p.want]; }
      return true;
    }
    /* Every cell the segment crosses, in order, stepping ONE axis at a time so
       the run of cells is 4-connected. That property is not cosmetic: a line
       that only touches corner to corner has a diagonal gap in it, and the
       flood fill pours straight through and the loop claims nothing. Free
       movement is what makes this necessary — on a lane it was free. */
    function traverse(p, ux0, uy0, ux1, uy1) {
      /* stepped in CELLS: the segment comes in as units and is scaled once */
      const x0 = ux0 * SUB, y0 = uy0 * SUB, x1 = ux1 * SUB, y1 = uy1 * SUB;
      let cx = Math.floor(x0), cy = Math.floor(y0);
      const ex = Math.floor(x1), ey = Math.floor(y1);
      const dx = x1 - x0, dy = y1 - y0;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
      let tx = adx < 1e-9 ? Infinity : (dx > 0 ? (cx + 1) - x0 : x0 - cx) / adx;
      let ty = ady < 1e-9 ? Infinity : (dy > 0 ? (cy + 1) - y0 : y0 - cy) / ady;
      const ddx = adx < 1e-9 ? Infinity : 1 / adx;
      const ddy = ady < 1e-9 ? Infinity : 1 / ady;
      let guard = 120;
      while ((cx !== ex || cy !== ey) && guard-- > 0) {
        if (tx < ty) { tx += ddx; cx += sx; } else { ty += ddy; cy += sy; }
        if (!enterCell(p, cx, cy)) return false;
      }
      return true;
    }
    function advance(p, dt) {
      if (!p.alive) return;
      p.ang = turnToward(p.ang, p.wantAng, TURN * dt);
      p.dir = dirOfAng(p.ang);
      const mv = Math.min(SPD * dt, 12);        // a stalled tab must not skip cells
      const nx = p.x + Math.cos(p.ang) * mv;
      const ny = p.y + Math.sin(p.ang) * mv;
      if (nx < 0 || ny < 0 || nx >= UW || ny >= UH) {
        p.x = clamp(nx, 0, UW - 0.001); p.y = clamp(ny, 0, UH - 0.001);
        doKill(p); ev(['k', p.idx]);
        return;
      }
      if (!traverse(p, p.x, p.y, nx, ny)) return;
      p.x = nx; p.y = ny;
    }
    /* two heads meeting: whoever is standing on their own ground walks away
       from it, otherwise they both go */
    function headClashes() {
      const R = 0.82;
      for (let a = 0; a < players.length; a++) {
        const A = players[a]; if (!A.alive) continue;
        for (let b = a + 1; b < players.length; b++) {
          const B = players[b]; if (!B.alive) continue;
          const ddx = A.x - B.x, ddy = A.y - B.y;
          if (Math.abs(ddx) > R || Math.abs(ddy) > R) continue;
          if (ddx * ddx + ddy * ddy > R * R) continue;
          const aHome = own[ix(A.cx, A.cy)] === A.idx, bHome = own[ix(B.cx, B.cy)] === B.idx;
          if (aHome && !bHome) { doKill(B, A); ev(['k', B.idx]); A.kills++; }
          else if (bHome && !aHome) { doKill(A, B); ev(['k', A.idx]); B.kills++; }
          else { doKill(A, B); ev(['k', A.idx]); doKill(B, A); ev(['k', B.idx]); }
        }
      }
    }

    /* ---------------------------------------------------------------- bots */
    /* A rival that wandered out and came home along its own line enclosed
       nothing, and the board filled up with one-cell tendrils that looked like
       a bug. So the excursion is a deliberate rectangle — out, across, back.
       Three turns is the smallest shape that actually holds area, and the
       flood fill does the rest. */
    /* Safe means safe TWO cells out, not one. A body turns at a fixed rate and
       covers more than a cell doing it, so a rival that only checks the cell in
       front commits to a turn it cannot finish and drives into the rim — which
       was about half of every death on the board before this. */
    function botSafe(p, d) {
      if (d === OPP[p.dir]) return false;
      for (let r = 1; r <= 2 * SUB; r++) {
        const nx = p.cx + DIRS[d][0] * r, ny = p.cy + DIRS[d][1] * r;
        if (!inA(nx, ny)) return false;
        if (trailOwner[ix(nx, ny)] === p.idx) return false;
      }
      return true;
    }
    /* how far this direction can run before the shore stops it — walked,
       because the edge of a round arena is a different distance every way */
    function botRoom(p, d) {
      const dx = DIRS[d][0], dy = DIRS[d][1];
      let r = 0, x = p.cx, y = p.cy;
      while (r < COLS) { x += dx; y += dy; if (!inA(x, y)) break; r++; }
      return r;
    }
    function botThink(p) {
      /* An open line within reach beats any amount of ground — but only for a
         hunter, and only while its own line is short enough to be worth
         risking. A bot that chases with twenty cells hanging out behind it is
         just donating its territory to whoever is nearest. */
      if (p.aggr && p.trail.length < 14 * SUB) for (let d = 0; d < 4; d++) {
        if (!botSafe(p, d)) continue;
        for (let r = 1; r <= 3 * SUB; r++) {
          const nx = p.cx + DIRS[d][0] * r, ny = p.cy + DIRS[d][1] * r;
          if (!inB(nx, ny)) break;
          const t = trailOwner[ix(nx, ny)];
          if (t >= 0 && t !== p.idx) { p.want = d; return; }
        }
      }
      const home = own[ix(p.cx, p.cy)] === p.idx;
      if (home && !p.trail.length) {
        if (p.bp !== 1) {                       // pick the next rectangle
          const opts = [];
          for (let dd = 0; dd < 4; dd++) if (botSafe(p, dd) && botRoom(p, dd) > 10 * SUB) opts.push(dd);
          if (!opts.length) for (let dd = 0; dd < 4; dd++) if (botSafe(p, dd)) opts.push(dd);
          if (!opts.length) return;
          p.bout = opts[(Math.random() * opts.length) | 0];
          p.bh = Math.random() < 0.5 ? 1 : 3;
          const side = (p.bout + p.bh) % 4;
          p.bd = clamp(randi(7, 20) * SUB, 2, Math.max(2, botRoom(p, p.bout) - 4 * SUB));
          p.bw = clamp(randi(5, 16) * SUB, 2, Math.max(2, botRoom(p, side) - 4 * SUB));
          p.bp = 1; p.bn = p.bd;
        }
        p.want = p.bout;                        // still crossing our own ground
        return;
      }
      if (p.bp === 1) {                         // leg one: straight out
        if (p.bn > 0 && botSafe(p, p.bout)) { p.bn--; p.want = p.bout; return; }
        p.bp = 2; p.bn = p.bw;
      }
      if (p.bp === 2) {                         // leg two: across
        const side = (p.bout + p.bh) % 4;
        if (p.bn > 0 && botSafe(p, side)) { p.bn--; p.want = side; return; }
        p.bp = 3; p.bn = p.bd + 6 * SUB;
      }
      if (p.bp === 3 && p.bn > 0 && botSafe(p, OPP[p.bout])) {
        p.bn--; p.want = OPP[p.bout]; return;   // leg three: back toward home
      }
      /* the last leg overshot home, so finish greedily. The loop still closes,
         just on a less tidy shape. */
      let tx = p.cx, ty = p.cy, bs = 1e9;
      for (let i = 0; i < N; i += 11) {
        if (own[i] !== p.idx) continue;
        const dd = Math.abs(cxOf(i) - p.cx) + Math.abs(cyOf(i) - p.cy);
        if (dd < bs) { bs = dd; tx = cxOf(i); ty = cyOf(i); }
      }
      let bd = -1, bb = 1e9;
      for (let dd = 0; dd < 4; dd++) {
        if (!botSafe(p, dd)) continue;
        const nx = p.cx + DIRS[dd][0], ny = p.cy + DIRS[dd][1];
        const s = Math.abs(nx - tx) + Math.abs(ny - ty);
        if (s < bb) { bb = s; bd = dd; }
      }
      if (bd >= 0) p.want = bd;
    }

    /* --------------------------------------------------------------- input */
    /* The keys pick a HEADING, not a lane. Two at once is a diagonal, and there
       is no rule about which was pressed first, because nothing has to line up
       with anything: whatever you are asking for, the body swings round to it
       from wherever it happens to be. Letting go holds the current heading
       rather than stopping — you are always moving. */
    let lastSentA = 99, lastSentAt = 0;
    function readAim() {
      const I = api.input;
      let ax = 0, ay = 0;
      if (I.down('ArrowRight') || I.down('KeyD')) ax += 1;
      if (I.down('ArrowLeft') || I.down('KeyA')) ax -= 1;
      if (I.down('ArrowDown') || I.down('KeyS')) ay += 1;
      if (I.down('ArrowUp') || I.down('KeyW')) ay -= 1;
      if (!ax && !ay) return null;
      return Math.atan2(ay, ax);
    }
    function applyMyInput() {
      const a = readAim();
      if (a === null) return;
      const p = meP();
      if (GUEST) {
        /* on change, then a slow heartbeat: sending once and trusting it is
           how a dropped packet strands the host steering a heading you have
           stopped asking for, with no way to say so again */
        const t = performance.now();
        if (Math.abs(a - lastSentA) > 1e-4 || t - lastSentAt > 140) {
          MPS.cmd({ c: 'a', a: Math.round(a * 1000) }); lastSentA = a; lastSentAt = t;
        }
      }
      if (p) p.wantAng = a;
    }

    /* ------------------------------------------------------------ the wire */
    let evSeq = 0;
    const evLog = [];
    function ev(e) {
      if (!HOSTMP) return;
      evLog.push([++evSeq].concat(e));
      while (evLog.length > 40) evLog.shift();
    }
    /* A line is cells, but a line is also mostly straight: on a grid this fine
       a single run down the board is a hundred cells and would have been a
       hundred characters. So the direction is written once with a count after
       it — 014 is forty steps east, counted in base thirty-six — which is what
       keeps a packet the size it was before the cells got smaller. */
    function packTrail(p) {
      const t = p.trail;
      if (!t.length) return '';
      let s = t[0] + '|', run = 0, cur = -1;
      for (let k = 1; k < t.length; k++) {
        const a = t[k - 1], b = t[k];
        const dx = cxOf(b) - cxOf(a), dy = cyOf(b) - cyOf(a);
        const d = dx === 1 ? 0 : dx === -1 ? 2 : dy === -1 ? 1 : 3;
        if (d === cur) { run++; continue; }
        if (cur >= 0) s += cur + run.toString(36) + '.';
        cur = d; run = 1;
      }
      if (cur >= 0) s += cur + run.toString(36);
      return s;
    }
    function unpackTrail(s) {
      if (!s) return [];
      const bar = s.indexOf('|');
      if (bar < 0) return [];
      let i = +s.slice(0, bar);
      if (!(i >= 0 && i < N)) return [];
      const out = [i];
      const runs = s.slice(bar + 1);
      if (!runs) return out;
      for (const part of runs.split('.')) {
        if (!part) continue;
        const d = +part[0], n = parseInt(part.slice(1), 36);
        if (!(d >= 0 && d <= 3) || !(n > 0)) break;
        for (let k = 0; k < n; k++) {
          const x = cxOf(i) + DIRS[d][0], y = cyOf(i) + DIRS[d][1];
          if (!inB(x, y)) return out;
          i = ix(x, y); out.push(i);
        }
      }
      return out;
    }
    function packGrid() {
      let s = '', cur = own[0], run = 1;
      for (let i = 1; i <= N; i++) {
        const v = i < N ? own[i] : -9;
        if (v === cur) { run++; continue; }
        s += (cur + 1).toString(36) + '.' + run.toString(36) + ',';
        cur = v; run = 1;
      }
      return s;
    }
    function unpackGrid(s) {
      let i = 0;
      for (const part of s.split(',')) {
        if (!part) continue;
        const dot = part.indexOf('.');
        if (dot < 0) continue;
        const v = parseInt(part.slice(0, dot), 36) - 1;
        const run = parseInt(part.slice(dot + 1), 36);
        for (let k = 0; k < run && i < N; k++) own[i++] = v;
      }
      markGrid();
      recount();
    }
    function snap(full) {
      const o = {
        ph: phase, pt: +phaseT.toFixed(2), tl: +timeLeft.toFixed(2),
        /* a fiftieth of a cell and a hundredth of a radian: free movement
           means there is no cell index to round to any more */
        P: players.map(p => [Math.round(p.x * 50), Math.round(p.y * 50), Math.round(p.ang * 100),
                             p.alive ? 1 : 0, +p.deadT.toFixed(1), p.kills, packTrail(p)]),
        E: evLog.slice(-16)
      };
      if (full) o.G = packGrid();
      return o;
    }
    /* The line is RECORDED as cells, because that is what the claim needs, but
       cells drawn corner to corner are a staircase — and on a diagonal that
       staircase is a sawtooth that flatly contradicts the free movement that
       drew it. So every client also keeps the path its heads actually took.
       It is cosmetic, never sent, and comes out the same on every screen
       because every screen already sees the same positions.

       Only turns are kept, not samples: a straight run of forty cells is two
       points, which matters because every point is a quad at draw time. */
    function trackPaths() {
      for (const p of players) {
        if (!p.alive || !p.trail.length) { if (!p.trail.length) p.path.length = 0; continue; }
        const q = p.path, n = q.length;
        if (!n) {
          /* anchored on the cell where the line left home, so it does not
             appear to start a step out in open ground */
          const f = p.trail[0];
          q.push((cxOf(f) + 0.5) * U, (cyOf(f) + 0.5) * U);
          continue;
        }
        const dx = p.x - q[n - 2], dy = p.y - q[n - 1];
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.04) continue;
        if (n >= 4) {
          /* if the new point is nearly in line with the last leg, move the
             last point instead of adding one */
          const px = q[n - 4], py = q[n - 3];
          const ax = q[n - 2] - px, ay = q[n - 1] - py;
          const al = Math.hypot(ax, ay), bl = Math.hypot(dx + q[n - 2] - px, dy + q[n - 1] - py);
          const cross = Math.abs(ax * (p.y - py) - ay * (p.x - px));
          if (al > 1e-4 && bl > 1e-4 && cross / bl < 0.06) { q[n - 2] = p.x; q[n - 1] = p.y; continue; }
        }
        q.push(p.x, p.y);
        if (q.length > 900) q.splice(0, 200);
      }
    }

    /* shortest way round, so a body crossing the -pi/pi seam does not spin */
    function lerpAng(a, b, t) {
      let d = b - a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      return a + d * t;
    }
    /* Everybody else, drawn from the two packets that straddle a moment about
       130ms in the past. This is what the snapshot buffer was collected for —
       without it the other players advance in twelve jerks a second, which on a
       body that moves smoothly is far more obvious than it was on a lane. */
    function interpRemote() {
      if (!nb) return;
      const smp = nb.sample();
      if (!smp) return;
      const A = smp[0], B = smp[1], f = smp[2];
      if (!A || !A.P || !B || !B.P) return;
      players.forEach((p, i) => {
        if (p.id === MYID) return;
        const a = A.P[i], b = B.P[i];
        if (!a || !b) return;
        const ax = a[0] / 50, ay = a[1] / 50, bx = b[0] / 50, by = b[1] / 50;
        /* a respawn puts the body somewhere else entirely; lerping that would
           drag it across everybody's ground on the way */
        const jump = Math.abs(bx - ax) + Math.abs(by - ay) > 6;
        p.x = jump ? bx : lerp(ax, bx, f);
        p.y = jump ? by : lerp(ay, by, f);
        p.ang = jump ? b[2] / 100 : lerpAng(a[2] / 100, b[2] / 100, f);
        p.cx = clamp(Math.floor(p.x * SUB), 0, COLS - 1);
        p.cy = clamp(Math.floor(p.y * SUB), 0, ROWS - 1);
        p.dir = dirOfAng(p.ang);
      });
    }
    /* Everything a guest is told, applied. Trails are copied straight over;
       claims, deaths and spawns are replayed through the same functions the
       host ran, so both grids arrive at the same place from the same inputs. */
    let lastEv = 0;
    function applySnap(s) {
      if (!s || !s.P) return;
      phase = s.ph; phaseT = s.pt; timeLeft = s.tl;
      s.P.forEach((a, i) => {
        const p = players[i]; if (!p) return;
        p.kills = a[5];
        p.deadT = a[4];
        const wasAlive = p.alive;
        p.alive = !!a[3];
        /* Only my own body is placed here. Everybody else is positioned by the
           interpolator, from two packets that straddle a moment just past —
           taking the newest packet instead is twelve teleports a second however
           good the connection is. */
        if (p.id === MYID) {
          const hx = a[0] / 50, hy = a[1] / 50;
          if (!wasAlive && p.alive) { p.x = hx; p.y = hy; p.ang = a[2] / 100; p.wantAng = p.ang; }
          else {
            /* the host's view of me is always a little behind — it is the last
               packet, and it crossed a network. Inside a cell or so, leave it
               alone; that gap is latency, and chasing it is the rubber band. */
            const err = Math.hypot(hx - p.x, hy - p.y);
            if (err > 3) { p.x = hx; p.y = hy; p.ang = a[2] / 100; }
            else if (err > 1) { p.x = lerp(p.x, hx, 0.16); p.y = lerp(p.y, hy, 0.16); }
          }
          p.cx = clamp(Math.floor(p.x * SUB), 0, COLS - 1);
          p.cy = clamp(Math.floor(p.y * SUB), 0, ROWS - 1);
          p.dir = dirOfAng(p.ang);
        }
        /* the line is the host's word for everybody, mine included: it is what
           the claim will be computed from */
        const t = unpackTrail(a[6]);
        for (const c of p.trail) if (trailOwner[c] === p.idx) trailOwner[c] = -1;
        p.trail = t;
        for (const c of t) trailOwner[c] = p.idx;
      });
      /* Events BEFORE the grid, never after. Every event in a packet was
         generated before that packet's grid was captured, so the grid already
         contains them — replaying them on top of it puts the guest back to a
         state the host has since moved on from, and territory that had been
         cleared reappears out of nowhere. They are still replayed rather than
         skipped, because that is what plays the claim wave and the collapse. */
      for (const e of (s.E || [])) {
        if (e[0] <= lastEv) continue;
        lastEv = e[0];
        const kind = e[1], p = players[e[2]];
        if (!p) continue;
        if (kind === 'k') doKill(p);
        else if (kind === 's') doSpawn(p, e[3], e[4]);
        else if (kind === 'c') {
          const cells = unpackTrail(e[3]);
          for (const c of cells) trailOwner[c] = p.idx;
          p.trail = cells;
          /* the head has to be where the loop closed for the wave to travel
             from the right place */
          doClaim(p, cells);
        }
      }
      if (s.G) unpackGrid(s.G);          // the newest word, and the last word
      recount();
    }

    /* ------------------------------------------------------------- camera */
    /* Pinned to your head, not eased toward it: the body moves at a constant
       speed, so an exact follow is perfectly steady, while a lerp adds a lag
       that breathes with the frame rate. The ZOOM is what eases — it pulls
       back as you take ground, which is the whole feel of the genre. */
    const cam = { x: UW / 2, y: UH / 2, vh: 21 };
    function camView() {
      const vh = cam.vh, vw = vh * (W / H);
      return { vw: vw, vh: vh };
    }
    function camUpdate(dt, snapTo) {
      const me = meP();
      const share = me ? me.cells / NA : 0;
      const want = clamp(21 + 58 * Math.sqrt(share), 21, UH + 4);
      cam.vh += (want - cam.vh) * Math.min(1, dt * 1.5);
      const v = camView();
      let tx = me ? me.x : UW / 2, ty = me ? me.y : UH / 2;
      /* Held inside the world with a few cells of margin, so the paper edge is
         visible but you never look at half a screen of nothing. A world
         narrower than the view is simply centred. */
      const M = 3;
      tx = v.vw >= UW + M * 2 ? UW / 2 : clamp(tx, v.vw / 2 - M, UW - v.vw / 2 + M);
      ty = v.vh >= UH + M * 2 ? UH / 2 : clamp(ty, v.vh / 2 - M, UH - v.vh / 2 + M);
      cam.x = tx; cam.y = ty;
    }
    /* world to stage, for text and the minimap */
    function toScreen(wx, wy) {
      const v = camView();
      return { x: (wx - cam.x) / v.vw * W + W / 2, y: (wy - cam.y) / v.vh * H + H / 2 };
    }

    /* ==================================================================== */
    /*  THE FLAT BOARD                                                      */
    /* ==================================================================== */
    /* Only for a machine without WebGL2: the board in canvas 2D, from one
       draw list of shapes — rectangles, circles, rounded rectangles,
       triangles and rings — for the lines, the heads and everything that
       moves. The 3D board below is what everybody else sees. */
    const MAXI = 4000, STRIDE = 12;
    const idata = new Float32Array(MAXI * STRIDE);
    let icount = 0;
    const K_RECT = 0, K_CIRC = 1, K_TRI = 2, K_ROUND = 3, K_RING = 4;

    function quad(cx, cy, hw, hh, col, rot, shape, alpha, extra) {
      if (icount >= MAXI) return;
      const o = icount * STRIDE;
      idata[o] = cx; idata[o + 1] = cy; idata[o + 2] = hw; idata[o + 3] = hh;
      idata[o + 4] = rot || 0; idata[o + 5] = shape || 0;
      idata[o + 6] = alpha === undefined ? 1 : alpha; idata[o + 7] = extra || 0;
      idata[o + 8] = col[0]; idata[o + 9] = col[1]; idata[o + 10] = col[2]; idata[o + 11] = 1;
      icount++;
    }
    const circle = (x, y, r, col, alpha) => quad(x, y, r, r, col, 0, K_CIRC, alpha);
    const ring = (x, y, r, th, col, alpha) => quad(x, y, r, r, col, 0, K_RING, alpha, clamp(th / Math.max(r, 1e-3), 0.01, 1));
    const roundRect = (x, y, hw, hh, col, rot, alpha, rad) => quad(x, y, hw, hh, col, rot, K_ROUND, alpha, rad === undefined ? 0.3 : rad);

    /* The same picture in canvas 2D, for a machine with no WebGL2. The ground
       cannot be a shader here, so it is baked at four pixels a cell whenever
       it changes and then scaled up — blocky by design, which is what the
       board is anyway. */
    function makeC2D() {
      const cv = document.createElement('canvas');
      const g = cv.getContext('2d');
      /* One pixel a cell, written straight into an image and scaled up with
         the smoothing off. Seventy thousand fillRects would cost more than the
         frame it is drawn in; seventy thousand writes into a typed array cost
         nothing, and the borders come out of the same pass. */
      const bake = document.createElement('canvas');
      bake.width = COLS; bake.height = ROWS;
      const bg = bake.getContext('2d');
      const bimg = bg.createImageData(COLS, ROWS);
      let baked = -1;
      function rebake() {
        const d = bimg.data;
        for (let i = 0; i < N; i++) {
          const o = own[i], j = i * 4;
          if (o < 0) { d[j + 3] = 0; continue; }
          const x = i % COLS, y = (i / COLS) | 0;
          const edge = (x === 0 || own[i - 1] !== o) || (x === COLS - 1 || own[i + 1] !== o) ||
                       (y === 0 || own[i - COLS] !== o) || (y === ROWS - 1 || own[i + COLS] !== o);
          const c = edge ? PALD3[o % PALD3.length] : PAL3[o % PAL3.length];
          d[j] = c[0] * 255; d[j + 1] = c[1] * 255; d[j + 2] = c[2] * 255; d[j + 3] = 255;
        }
        bg.putImageData(bimg, 0, 0);
      }
      return {
        canvas: cv,
        resize(pw, ph) { if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } },
        upload() { baked = -1; },
        draw(n, cx, cy, vw, vh) {
          const sx = cv.width / vw, sy = cv.height / vh;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.fillStyle = 'rgb(' + OUT3.map(v => Math.round(v * 255)).join(',') + ')';
          g.fillRect(0, 0, cv.width, cv.height);
          g.setTransform(sx, 0, 0, sy, cv.width / 2 - cx * sx, cv.height / 2 - cy * sy);
          /* paper and its grid, over the visible range only */
          g.fillStyle = PAPER;
          g.beginPath(); g.arc(ARC, ARC, ARR, 0, TAU); g.fill();
          const x0 = Math.max(0, Math.floor(cx - vw / 2)), x1 = Math.min(UW, Math.ceil(cx + vw / 2));
          const y0 = Math.max(0, Math.floor(cy - vh / 2)), y1 = Math.min(UH, Math.ceil(cy + vh / 2));
          g.lineWidth = 1 / sx;
          g.strokeStyle = 'rgb(' + GRID3.map(v => Math.round(v * 255)).join(',') + ')';
          g.beginPath();
          for (let x = x0; x <= x1; x++) { g.moveTo(x, y0); g.lineTo(x, y1); }
          for (let y = y0; y <= y1; y++) { g.moveTo(x0, y); g.lineTo(x1, y); }
          g.stroke();
          g.strokeStyle = 'rgb(' + GRID3B.map(v => Math.round(v * 255)).join(',') + ')';
          g.beginPath();
          for (let x = Math.ceil(x0 / 8) * 8; x <= x1; x += 8) { g.moveTo(x, y0); g.lineTo(x, y1); }
          for (let y = Math.ceil(y0 / 8) * 8; y <= y1; y += 8) { g.moveTo(x0, y); g.lineTo(x1, y); }
          g.stroke();
          if (baked !== ownTexVer) { rebake(); baked = ownTexVer; }
          g.imageSmoothingEnabled = false;
          g.drawImage(bake, 0, 0, UW, UH);
          g.imageSmoothingEnabled = true;
          /* the rim */
          g.lineWidth = 2.5 / sx;
          g.strokeStyle = 'rgb(' + RIM3.map(v => Math.round(v * 255)).join(',') + ')';
          g.beginPath(); g.arc(ARC, ARC, ARR, 0, TAU); g.stroke();
          /* then the same draw list the shader would have taken */
          for (let i = 0; i < n; i++) {
            const o = i * STRIDE;
            const qx = idata[o], qy = idata[o + 1], hw = Math.abs(idata[o + 2]), hh = Math.abs(idata[o + 3]);
            const rot = idata[o + 4], shape = idata[o + 5], al = idata[o + 6], ex = idata[o + 7];
            g.globalAlpha = al;
            g.fillStyle = 'rgb(' + (idata[o + 8] * 255 | 0) + ',' + (idata[o + 9] * 255 | 0) + ',' + (idata[o + 10] * 255 | 0) + ')';
            g.save();
            g.translate(qx, qy); if (rot) g.rotate(rot);
            g.beginPath();
            if (shape > 3.5) {
              const th = hw * ex;
              g.arc(0, 0, Math.max(0.001, hw - th / 2), 0, TAU);
              g.lineWidth = th; g.strokeStyle = g.fillStyle; g.stroke();
            } else if (shape > 2.5) {
              const rad = Math.min(hw, hh) * ex;
              if (g.roundRect) { g.roundRect(-hw, -hh, hw * 2, hh * 2, rad); } else { g.rect(-hw, -hh, hw * 2, hh * 2); }
              g.fill();
            } else if (shape > 1.5) {
              g.moveTo(hw, 0); g.lineTo(-hw, -hh); g.lineTo(-hw, hh); g.closePath(); g.fill();
            } else if (shape > 0.5) {
              g.arc(0, 0, hw, 0, TAU); g.fill();
            } else {
              g.rect(-hw, -hh, hw * 2, hh * 2); g.fill();
            }
            g.restore();
          }
          g.globalAlpha = 1;
          g.setTransform(1, 0, 0, 1, 0, 0);
        },
        dispose() {}
      };
    }

    let ownTexVer = 0;
    /* The shared 3D renderer when there is one; the flat canvas board when
       there is not. Only one of the two is ever made. */
    const R3 = (() => { try { return Gfx3D.get(); } catch (e) { return null; } })();
    const B3 = R3 ? makeBoard3D() : null;
    let R = B3 ? null : makeC2D();
    const usingGL = !!B3;
    if (B3) fx3 = B3;

    /* ==================================================================== */
    /*  THE 3D BOARD                                                        */
    /* ==================================================================== */
    /* World units are board units times WS, z up, and the camera sits to the
       south looking north, so the picture keeps the layout the flat board had
       — x across, y down the screen — and every slab shows its south face.

       A country is built chunk by chunk. For one owner in one chunk, the
       grid is turned into ones and zeros, softened with a 1-2-1 kernel each
       way, and contoured at a little under a half (marching squares, with the
       saddle cases settled by the centre value). Runs of wholly-inside squares
       become one quad each; the rest become the small polygons marching
       squares gives, and a wall is stood along the contour wherever it faces
       open floor. Two owners side by side contour to the same line, so their
       slabs meet without a seam; a hair of height per owner keeps the rare
       overlap at a corner from flickering. */
    function makeBoard3D() {
      const { Geo, M4, K, FX } = Gfx3D, L = Gfx3D.lin;
      const S = R3.scope();
      const WS = 40;                               // world units to a board unit
      const CW = WS / SUB;                         // a cell
      const SLAB = 0.3 * WS;                       // how far a country stands proud
      const LIP = 0.34 * WS;                       // how far the arena stands above the sea
      const CUBE = 0.86 * WS;                      // a head
      const TRW = 0.3 * WS;                        // half the width of an open line
      const PITCH = 1.16;                          // about 66 degrees down
      const cam3 = Gfx3D.camera(W, H);
      cam3.fov = 0.5; cam3.near = 30; cam3.far = 60000;
      /* nearly overhead and a little north-west: short, soft shadows, and the
         south faces the camera sees always in shade */
      const SUN = Gfx3D.norm([-0.22, -0.4, 0.9]);
      const WRAP = 0.2;
      const env = {
        sun: SUN, sunC: L('#ffffff', 0.42), sunSpec: 0,
        sky: L('#f4fbff', 0.86), gnd: L('#c9dfd8', 0.5),
        rim: [0, 0, 0], fill: L('#ffffff', 0.04),
        fogC: [0, 0, 0], fog: [1e7, 2e7], expo: 1, vig: 0,
        clear: Gfx3D.srgb(SEA), shadow: { x: 0, y: 0, z: 0, r: 1200 }
      };
      /* The renderer lights in linear light and tone-maps on the way out, so
         a colour picked by eye comes out paler than it went in. paint() runs
         that backwards for a lit top: ask for the colour that should be SEEN
         on top and it returns what the surface has to be. The sides then fall
         out of the lighting a shade darker, which is the whole look. */
      const TOPK = (() => {
        const d0 = clamp((SUN[2] + WRAP) / (1 + WRAP), 0, 1), d = d0 * d0 * (3 - 2 * d0), nv = Math.sin(PITCH);
        return [0, 1, 2].map(k => env.sky[k] + env.sunC[k] * d + env.fill[k] * nv);
      })();
      const acesInv = y => {
        y = Math.min(Math.max(y, 1e-5), 0.97);
        const a = 2.43 * y - 2.51, b = 0.59 * y - 0.03, c = 0.14 * y;
        return (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      };
      const paint = (hex, ao) => {
        const t = L(hex);
        return Gfx3D.withAo([0, 1, 2].map(k => acesInv(t[k]) / (env.expo * TOPK[k])), ao === undefined ? 1 : ao);
      };
      /* (mixHex, not shade: shade hands back an rgb() string the colour
         parser here cannot read) */
      const TOP = PAL.map(h => paint(h));
      const SIDE_HI = PAL.map(h => paint(mixHex(h, '#000000', 0.06)));
      const SIDE_LO = PAL.map(h => Gfx3D.withAo(paint(mixHex(h, '#000000', 0.12)), 0.62));
      const LINE = PAL.map(h => paint(mixHex(h, '#ffffff', 0.3)));
      const FLOOR = paint('#eefaf6'), FLOOR_EDGE = paint('#d9f1ea');
      const SEAC = paint(SEA), SHALLOW = paint('#93ebe3');
      const WHITE = paint('#ffffff'), PUPIL = paint('#1b2233');

      const plain = R3.mat({ kind: K.PLAIN, spec: 0, wrap: WRAP, cast: false });
      /* a head is its colour lifted a little, so it still stands out on its own country */
      const headMat = PAL.map(h => R3.mat({ kind: K.PLAIN, spec: 0, wrap: WRAP, tint: paint(mixHex(h, '#ffffff', 0.24)).slice(0, 3) }));
      const T = M4.make(), ID = M4.make();

      /* ---- the fixed pieces: sea, shallows, arena, its rim, a head ---- */
      const M = {};
      let g = Geo();
      const far = UW * WS * 3;
      g.face([[-far, -far, -LIP], [far + UW * WS, -far, -LIP], [far + UW * WS, far + UH * WS, -LIP], [-far, far + UH * WS, -LIP]],
             SEAC, [UW * WS / 2, UH * WS / 2, -LIP - 50]);
      M.sea = S.mesh(g);
      const AX = ARC * WS, AY = ARC * WS, AR = ARR * WS;
      /* an annulus flat on the sea or the floor, for the shallows and the rim */
      function ring2(g, r0, r1, z, c, seg) {
        const b = g.n;
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
          g.v(AX + ca * r0, AY + sa * r0, z, 0, 0, 1, c, 0, 0);
          g.v(AX + ca * r1, AY + sa * r1, z, 0, 0, 1, c, 0, 0);
        }
        for (let i = 0; i < seg; i++) { const k = b + i * 2; g.q(k, k + 2, k + 3, k + 1); }
      }
      g = Geo();
      ring2(g, AR, AR + 1.1 * WS, -LIP + 1, SHALLOW, 180);
      M.shallow = S.mesh(g);
      g = Geo();
      g.cyl(AX, AY, -LIP, 0, AR, 180, FLOOR, { top: true, topC: FLOOR });
      ring2(g, AR - 0.55 * WS, AR, 0.4, FLOOR_EDGE, 180);
      M.floor = S.mesh(g);
      g = Geo();
      g.box(-CUBE / 2, -CUBE / 2, 0, CUBE / 2, CUBE / 2, CUBE, [1, 1, 1, 1], CUBE * 0.12);
      M.cube = S.mesh(g);
      /* eyes on the top face, toward the front: +x is the way it faces */
      g = Geo();
      for (const side of [-1, 1]) {
        g.sphere(CUBE * 0.13, side * CUBE * 0.21, CUBE, CUBE * 0.2, 16, 8, WHITE, 0.5);
        g.sphere(CUBE * 0.24, side * CUBE * 0.21, CUBE + CUBE * 0.055, CUBE * 0.1, 12, 6, PUPIL, 0.6);
      }
      M.eyes = S.mesh(g);
      g = Geo(); g.decal(0, 0, 0, 1, [1, 1, 1, 1]);
      M.decal = S.mesh(g);
      const EMPTY = Geo();

      /* ---- the countries, chunk by chunk ---- */
      const CHK = 24, NCX = Math.ceil(COLS / CHK), NCY = Math.ceil(ROWS / CHK);
      const chunks = [];
      for (let j = 0; j < NCY; j++) for (let i = 0; i < NCX; i++)
        chunks.push({ i, j, m: S.dyn(), dirty: true, empty: true,
                      x0: i * CHK * CW, y0: j * CHK * CW, x1: (i + 1) * CHK * CW + CW, y1: (j + 1) * CHK * CW + CW });
      const built = new Int8Array(N).fill(-3);
      const FW = CHK + 3, SN = CHK + 1;
      const raw = new Uint8Array(FW * FW), hb = new Float32Array(FW * FW), fld = new Float32Array(SN * SN);
      const TH = 0.47;
      /* which chunks a changed cell touches: its own, and a neighbour when it
         sits on the edge, since the softening reaches one cell across */
      function scan() {
        for (let y = 0; y < ROWS; y++) {
          const row = y * COLS;
          for (let x = 0; x < COLS; x++) {
            const i = row + x;
            if (own[i] === built[i]) continue;
            built[i] = own[i];
            const a0 = Math.max(0, Math.ceil((x - 1 - CHK) / CHK)), a1 = Math.min(NCX - 1, Math.floor((x + 1) / CHK));
            const b0 = Math.max(0, Math.ceil((y - 1 - CHK) / CHK)), b1 = Math.min(NCY - 1, Math.floor((y + 1) / CHK));
            for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) chunks[b * NCX + a].dirty = true;
          }
        }
      }
      function buildChunk(c) {
        const cx0 = c.i * CHK, cy0 = c.j * CHK, present = [];
        for (let y = cy0 - 1; y <= cy0 + CHK + 1; y++) {
          if (y < 0 || y >= ROWS) continue;
          const row = y * COLS;
          for (let x = cx0 - 1; x <= cx0 + CHK + 1; x++) {
            if (x < 0 || x >= COLS) continue;
            const o = own[row + x];
            if (o >= 0 && present.indexOf(o) < 0) present.push(o);
          }
        }
        if (!present.length) { if (!c.empty) { c.m.set(EMPTY); c.empty = true; } return; }
        const g = Geo();
        for (const o of present) slab(g, o, cx0, cy0);
        c.m.set(g);
        c.empty = !g.I.length;
      }
      function quadTop(g, x0, y0, x1, y1, z, c) {
        const b = g.n;
        g.v(x0, y0, z, 0, 0, 1, c, 0, 0); g.v(x1, y0, z, 0, 0, 1, c, 0, 0);
        g.v(x1, y1, z, 0, 0, 1, c, 0, 0); g.v(x0, y1, z, 0, 0, 1, c, 0, 0);
        g.q(b, b + 1, b + 2, b + 3);
      }
      function fan(g, pts, z, c) {
        const n = pts.length >> 1;
        if (n < 3) return;
        const b = g.n;
        for (let k = 0; k < n; k++) g.v(pts[2 * k], pts[2 * k + 1], z, 0, 0, 1, c, 0, 0);
        for (let k = 1; k < n - 1; k++) g.t(b, b + k, b + k + 1);
      }
      /* a wall along one stretch of contour, facing away from the inside
         point (hx, hy), darker at its foot */
      function wall(g, ax, ay, bx, by, hx, hy, zt, o) {
        let nx = by - ay, ny = ax - bx;
        const l = Math.hypot(nx, ny);
        if (l < 1e-3) return;
        nx /= l; ny /= l;
        if (((ax + bx) * 0.5 - hx) * nx + ((ay + by) * 0.5 - hy) * ny < 0) { nx = -nx; ny = -ny; }
        const b = g.n, lo = SIDE_LO[o], hi = SIDE_HI[o];
        g.v(ax, ay, -1, nx, ny, 0, lo, 0, 0); g.v(bx, by, -1, nx, ny, 0, lo, 0, 0);
        g.v(bx, by, zt, nx, ny, 0, hi, 0, 0); g.v(ax, ay, zt, nx, ny, 0, hi, 0, 0);
        g.q(b, b + 1, b + 2, b + 3);
      }
      const PX = [0, 0, 0, 0], PY = [0, 0, 0, 0], PV = [0, 0, 0, 0], CXk = [0, 1, 1, 0], CYk = [0, 0, 1, 1];
      const poly = [], xs = [];
      /* does the floor show beyond corner k of the square at cell (gx, gy)? */
      const openAt = (gx, gy, k) => {
        const x = gx + CXk[k], y = gy + CYk[k];
        return !inB(x, y) || own[y * COLS + x] < 0;
      };
      function cross(k, out) {
        const k2 = (k + 1) & 3, va = PV[k], vb = PV[k2];
        const t = clamp((TH - va) / ((vb - va) || 1e-6), 0, 1);
        out.push(PX[k] + (PX[k2] - PX[k]) * t, PY[k] + (PY[k2] - PY[k]) * t, k);
      }
      function square(g, idx, zt, o, gx, gy) {
        const inside = k => (idx >> k) & 1;
        const tc = TOP[o];
        if ((idx === 5 || idx === 10) && (PV[0] + PV[1] + PV[2] + PV[3]) * 0.25 < TH) {
          /* a saddle whose middle is outside: two corners, each on its own */
          for (let k = 0; k < 4; k++) {
            if (!inside(k)) continue;
            xs.length = 0; cross((k + 3) & 3, xs); cross(k, xs);
            poly.length = 0;
            poly.push(xs[0], xs[1], PX[k], PY[k], xs[3], xs[4]);
            fan(g, poly, zt, tc);
            if (openAt(gx, gy, (k + 1) & 3) || openAt(gx, gy, (k + 3) & 3)) wall(g, xs[0], xs[1], xs[3], xs[4], PX[k], PY[k], zt, o);
          }
          return;
        }
        poly.length = 0; xs.length = 0;
        let hx = 0, hy = 0, hn = 0;
        for (let k = 0; k < 4; k++) {
          if (inside(k)) { poly.push(PX[k], PY[k]); hx += PX[k]; hy += PY[k]; hn++; }
          if (inside(k) !== inside((k + 1) & 3)) {
            const n0 = xs.length;
            cross(k, xs);
            poly.push(xs[n0], xs[n0 + 1]);
          }
        }
        fan(g, poly, zt, tc);
        if (xs.length === 6) {
          /* one stretch of contour across the square */
          let open = false;
          for (let k = 0; k < 4; k++) if (!inside(k) && openAt(gx, gy, k)) { open = true; break; }
          if (open) wall(g, xs[0], xs[1], xs[3], xs[4], hx / hn, hy / hn, zt, o);
        } else if (xs.length === 12) {
          /* a saddle joined through the middle: each outside corner is cut off */
          const mx = (PX[0] + PX[2]) * 0.5, my = (PY[0] + PY[2]) * 0.5;
          for (let k = 0; k < 4; k++) {
            if (inside(k) || !openAt(gx, gy, k)) continue;
            const e0 = (k + 3) & 3, e1 = k;
            let a = -1, b = -1;
            for (let s = 0; s < 12; s += 3) { if (xs[s + 2] === e0) a = s; if (xs[s + 2] === e1) b = s; }
            if (a >= 0 && b >= 0) wall(g, xs[a], xs[a + 1], xs[b], xs[b + 1], mx, my, zt, o);
          }
        }
      }
      function slab(g, o, cx0, cy0) {
        for (let wy = 0; wy < FW; wy++) {
          const y = cy0 - 1 + wy, ok = y >= 0 && y < ROWS, row = y * COLS;
          for (let wx = 0; wx < FW; wx++) {
            const x = cx0 - 1 + wx;
            raw[wy * FW + wx] = ok && x >= 0 && x < COLS && own[row + x] === o ? 1 : 0;
          }
        }
        for (let wy = 0; wy < FW; wy++) {
          const r0 = wy * FW;
          for (let k = 0; k < SN; k++) hb[r0 + k] = raw[r0 + k] + 2 * raw[r0 + k + 1] + raw[r0 + k + 2];
        }
        for (let kj = 0; kj < SN; kj++) {
          const r1 = (kj + 1) * FW;
          for (let k = 0; k < SN; k++) fld[kj * SN + k] = (hb[r1 - FW + k] + 2 * hb[r1 + k] + hb[r1 + FW + k]) * 0.0625;
        }
        const zt = SLAB + o * 0.35, tc = TOP[o];
        for (let kj = 0; kj < CHK; kj++) {
          const ya = (cy0 + kj + 0.5) * CW, yb = ya + CW;
          let run = -1;
          for (let k = 0; k <= CHK; k++) {
            let idx = 0;
            if (k < CHK) {
              const a = fld[kj * SN + k], b = fld[kj * SN + k + 1], c = fld[(kj + 1) * SN + k + 1], d = fld[(kj + 1) * SN + k];
              idx = (a >= TH ? 1 : 0) | (b >= TH ? 2 : 0) | (c >= TH ? 4 : 0) | (d >= TH ? 8 : 0);
              if (idx !== 0 && idx !== 15) { PV[0] = a; PV[1] = b; PV[2] = c; PV[3] = d; }
            }
            if (idx === 15) { if (run < 0) run = k; continue; }
            if (run >= 0) { quadTop(g, (cx0 + run + 0.5) * CW, ya, (cx0 + k + 0.5) * CW, yb, zt, tc); run = -1; }
            if (idx === 0) continue;
            const xa = (cx0 + k + 0.5) * CW, xb = xa + CW;
            PX[0] = xa; PY[0] = ya; PX[1] = xb; PY[1] = ya; PX[2] = xb; PY[2] = yb; PX[3] = xa; PY[3] = yb;
            square(g, idx, zt, o, cx0 + k, cy0 + kj);
          }
        }
      }

      /* ---- the open lines ---- */
      const lineMesh = [];
      /* the height of whatever is under a point: a country's top, or the floor */
      const groundZ = (x, y) => {
        const cx = Math.floor(x / CW), cy = Math.floor(y / CW);
        return inB(cx, cy) && own[cy * COLS + cx] >= 0 ? SLAB + 3 : 0;
      };
      const RS = [];
      function lineGeo(p) {
        const g = Geo(), q = p.path, c = LINE[p.idx % PAL.length];
        RS.length = 0;
        const STEP = 0.3 * WS;
        let ax = null, ay = null;
        const add = (bx, by) => {
          if (ax === null) { RS.push(bx, by); ax = bx; ay = by; return; }
          const d = Math.hypot(bx - ax, by - ay);
          if (d < 0.5) return;
          const n = Math.max(1, Math.ceil(d / STEP));
          for (let s = 1; s <= n; s++) RS.push(ax + (bx - ax) * s / n, ay + (by - ay) * s / n);
          ax = bx; ay = by;
        };
        for (let k = 0; k + 1 < q.length; k += 2) add(q[k] * WS, q[k + 1] * WS);
        add(p.x * WS, p.y * WS);
        const n = RS.length >> 1;
        if (n < 2) return g;
        const b0 = g.n;
        for (let k = 0; k < n; k++) {
          const x = RS[2 * k], y = RS[2 * k + 1];
          const pk = Math.max(0, k - 1), nk = Math.min(n - 1, k + 1);
          let tx = RS[2 * nk] - RS[2 * pk], ty = RS[2 * nk + 1] - RS[2 * pk + 1];
          const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const z = groundZ(x, y) + 1.5;
          g.v(x - ty * TRW, y + tx * TRW, z, 0, 0, 1, c, 0, 0);
          g.v(x + ty * TRW, y - tx * TRW, z, 0, 0, 1, c, 0, 0);
        }
        for (let k = 0; k < n - 1; k++) { const a = b0 + k * 2; g.q(a, a + 2, a + 3, a + 1); }
        /* a round end where the line left home */
        const x = RS[0], y = RS[1];
        let ux = RS[0] - RS[2], uy = RS[1] - RS[3];
        const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
        const z = groundZ(x, y) + 1.5, cb = g.v(x, y, z, 0, 0, 1, c, 0, 0);
        for (let s = 0; s <= 10; s++) {
          const a = -Math.PI / 2 + s / 10 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
          g.v(x + (ux * ca - uy * sa) * TRW, y + (ux * sa + uy * ca) * TRW, z, 0, 0, 1, c, 0, 0);
        }
        for (let s = 0; s < 10; s++) g.t(cb, cb + 1 + s, cb + 2 + s);
        return g;
      }

      /* ---- rings: claim waves and respawns ---- */
      const ringMats = [];
      const ringMat = i => ringMats[i] || (ringMats[i] = R3.fxMat({ fx: FX.RING, color: [1, 1, 1, 1], p: [0.9, 0.1, 0, 0] }));
      const PS = Gfx3D.particles(900);

      let lastT = 0;
      const B = {
        WS, SLAB, CUBE,
        toScreen(x, y, z) { return cam3.toScreen(x * WS, y * WS, (z || 0) * WS); },
        /* the height a head rides at, in board units, for tags and numbers */
        headTop(p) { return (p.hz + CUBE) / WS; },
        render(ctx, t) {
          const now = performance.now() / 1000, dt = lastT ? Math.min(0.1, Math.max(0, now - lastT)) : 0;
          lastT = now;
          /* countries: find what changed, then rebuild within a few milliseconds */
          if (terrDirty) { terrDirty = false; scan(); }
          const t0 = performance.now();
          let done = 0;
          for (const c of chunks) {
            if (!c.dirty) continue;
            buildChunk(c); c.dirty = false; done++;
            if (done >= 6 && performance.now() - t0 > 6) break;
          }
          /* the camera: high over your head, pulling back as you grow */
          const v = camView();
          cam3.W = W; cam3.H = H;
          const dist = v.vh * WS * Math.sin(PITCH) / (2 * Math.tan(cam3.fov / 2));
          cam3.orbit(cam.x * WS, cam.y * WS, 0, dist, PITCH, 0);
          env.shadow.x = cam.x * WS; env.shadow.y = cam.y * WS; env.shadow.r = v.vh * WS * 0.9 + 400;
          /* what the view covers on the floor, to leave off-screen chunks out */
          let gx0 = 1e9, gy0 = 1e9, gx1 = -1e9, gy1 = -1e9;
          for (const sc of [[0, 0], [W, 0], [0, H], [W, H]]) {
            const q = cam3.toGround(sc[0], sc[1], 0);
            gx0 = Math.min(gx0, q.x); gx1 = Math.max(gx1, q.x); gy0 = Math.min(gy0, q.y); gy1 = Math.max(gy1, q.y);
          }
          gx0 -= 3 * WS; gy0 -= 3 * WS; gx1 += 3 * WS; gy1 += 3 * WS;

          R3.size(W, H);
          R3.begin(cam3, env, t);
          R3.draw(M.sea, ID, plain);
          R3.draw(M.shallow, ID, plain);
          R3.draw(M.floor, ID, plain);
          for (const c of chunks) {
            if (c.empty || c.x1 < gx0 || c.x0 > gx1 || c.y1 < gy0 || c.y0 > gy1) continue;
            R3.draw(c.m, ID, plain);
          }
          for (const p of players) {
            if (!p.alive || !p.trail.length) continue;
            const m = lineMesh[p.idx] || (lineMesh[p.idx] = S.dyn());
            m.set(lineGeo(p));
            R3.draw(m, ID, plain);
          }
          /* the heads: a cube that climbs onto a country, hops when a loop
             closes, and looks where it is going */
          for (const p of players) {
            if (!p.alive) continue;
            const onLand = inB(p.cx, p.cy) && own[p.cy * COLS + p.cx] >= 0;
            const want = onLand ? SLAB + 0.5 : 0;
            p.hz += (want - p.hz) * (1 - Math.exp(-dt * 18));
            if (p.hop > 0) p.hop = Math.max(0, p.hop - dt * 2.8);
            const hk = 1 - p.hop, lift = p.hop > 0 ? Math.sin(hk * Math.PI) * 0.62 * WS : 0;
            const sq = p.hop > 0 ? 1 + Math.sin(hk * Math.PI * 2) * 0.1 * p.hop : 1;
            M4.place(T, p.x * WS, p.y * WS, p.hz + lift, p.ang, 1 / Math.sqrt(sq), 1 / Math.sqrt(sq), sq);
            R3.draw(M.cube, T, headMat[p.idx % PAL.length]);
            R3.draw(M.eyes, T, plain);
          }
          /* claim waves, and the ring where somebody is about to come back */
          let ri = 0;
          for (const f of flashes) {
            const k = f.t / 0.5;
            if (k >= 1) continue;
            const e = 1 - (1 - k) * (1 - k), r = (0.5 + f.r * e) * WS;
            const m = ringMat(ri++);
            m.color = [f.col[0], f.col[1], f.col[2], (1 - k) * 0.95];
            m.p = [0.9, Math.min(0.5, 0.35 * WS / r), 0, 0];
            R3.fx(M.decal, M4.place(T, f.x * WS, f.y * WS, SLAB + 5, 0, r), m);
          }
          for (const p of players) {
            if (p.alive || p.deadT <= 0 || p.deadT > RESPAWN) continue;
            const k = 1 - p.deadT / RESPAWN, r = (0.7 + 1.6 * (1 - k)) * WS;
            const m = ringMat(ri++);
            m.color = [p.col3[0], p.col3[1], p.col3[2], 0.25 + 0.5 * k];
            m.p = [0.9, Math.min(0.5, 0.18 * WS / r), 0, 0];
            R3.fx(M.decal, M4.place(T, p.x * WS, p.y * WS, 4, 0, r), m);
          }
          PS.step(dt);
          R3.parts(PS);
          R3.end();
          ctx.drawImage(R3.canvas, 0, 0, W, H);
        },
        /* ---- particles, called from the rules as things happen ---- */
        shatter(p, cells) {
          const z = p.hz + CUBE / 2;
          PS.burst({ x: p.x * WS, y: p.y * WS, z, n: 26, speed: 300, up: [200, 560], life: 1.15, size: 13,
                     color: p.col, shape: 1, spin: 14, grav: -1500, drag: 0.9, floor: 2, jit: CUBE * 0.6 });
          PS.burst({ x: p.x * WS, y: p.y * WS, z, n: 10, speed: 200, up: [150, 380], life: 0.9, size: 10,
                     color: '#ffffff', shape: 1, spin: 12, grav: -1400, drag: 0.9, floor: 2 });
          /* the country comes apart where it stood */
          const L2 = cells || [];
          for (let k = 0; k < Math.min(L2.length, 60); k++) {
            const i = L2[(k * 7) % L2.length];
            PS.burst({ x: (cxOf(i) + 0.5) * CW, y: (cyOf(i) + 0.5) * CW, z: SLAB, n: 1, speed: 60, up: [80, 260],
                       life: 0.9, size: 11, color: p.col, shape: 1, spin: 10, grav: -1100, drag: 0.8, floor: 2 });
          }
        },
        claimed(p, n) {
          PS.burst({ x: p.x * WS, y: p.y * WS, z: p.hz + CUBE, n: Math.min(22, 8 + (n >> 6)), speed: 230, up: [140, 360],
                     life: 0.8, size: 9, color: mixHex(p.col, '#ffffff', 0.35), shape: 1, spin: 12, grav: -1300, drag: 1, floor: 2 });
        },
        spawned(p) {
          flashes.push({ x: p.x, y: p.y, r: 2.6, col: p.light3, t: 0, o: p.idx });
        },
        dispose() { S.dispose(); PS.clear(); }
      };
      return B;
    }

    /* The grid the shader reads, rebuilt only when the grid actually changed —
       which is on a claim, a death or a spawn, not on a frame. */
    function syncTex() {
      if (!ownTexDirty) return;
      ownTexDirty = false;
      ownTexVer++;
      for (let i = 0; i < N; i++) ownTex[i] = own[i] + 1;
      R.upload(ownTex);
    }

    /* ------------------------------------------------------- the draw list */
    const _t = { x: 0, y: 0 };
    /* a point `ox` forward and `oy` to the side of a head, in world units */
    function turnP(p, ox, oy) {
      const c = Math.cos(p.ang), s = Math.sin(p.ang);
      _t.x = p.x + ox * c - oy * s; _t.y = p.y + ox * s + oy * c;
      return _t;
    }
    /* The open line, drawn from the path actually walked rather than from the
       cells it lit up: on a diagonal those cells are a staircase, and a
       staircase flatly contradicts the free movement that drew it. Two passes,
       a dark one and a bright one, give it the edge everything else has. */
    function trailQuads(p, outline) {
      if (!p.alive || !p.trail.length) return;
      const hw = outline ? 0.27 : 0.17;
      const col = outline ? p.dark3 : p.col3;
      const q = p.path;
      let ax, ay;
      if (q.length >= 2) { ax = q[0]; ay = q[1]; } else { ax = p.x; ay = p.y; }
      circle(ax, ay, hw, col, 1);
      for (let k = 2; k <= q.length; k += 2) {
        const bx = k < q.length ? q[k] : p.x, by = k < q.length ? q[k + 1] : p.y;
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
        if (len > 1e-4) {
          quad((ax + bx) / 2, (ay + by) / 2, len / 2, hw, col, Math.atan2(dy, dx), K_RECT, 1);
          circle(bx, by, hw, col, 1);
        }
        ax = bx; ay = by;
      }
      /* and out to where the head is this instant, ahead of the last point */
      const dx = p.x - ax, dy = p.y - ay, len = Math.hypot(dx, dy);
      if (len > 1e-4) {
        quad((ax + p.x) / 2, (ay + p.y) / 2, len / 2, hw, col, Math.atan2(dy, dx), K_RECT, 1);
      }
    }
    /* The head: a rounded square with a hard offset shadow, a dark edge, a
       WHITE ring and two eyes that point where it is going. The white ring is
       not decoration — a head standing on its owner's own ground is the same
       colour as that ground, and without a ring of something else it vanishes
       into it exactly when you most need to see it. */
    function headQuads(p, t) {
      const s = 0.46;
      quad(p.x + 0.1, p.y + 0.13, s, s, BLACK3, p.ang, K_ROUND, 0.16, 0.3);
      roundRect(p.x, p.y, s + 0.115, s + 0.115, p.dark3, p.ang, 1, 0.35);
      roundRect(p.x, p.y, s + 0.07, s + 0.07, WHITE3, p.ang, 1, 0.33);
      roundRect(p.x, p.y, s, s, p.col3, p.ang, 1, 0.3);
      const lit = turnP(p, 0, -s * 0.62);
      quad(lit.x, lit.y, s * 0.74, s * 0.2, p.light3, p.ang, K_ROUND, 1, 0.5);
      for (const side of [-1, 1]) {
        const e = turnP(p, 0.09, side * 0.185);
        const ex = e.x, ey = e.y;
        circle(ex, ey, 0.165, WHITE3, 1);
        const pu = turnP(p, 0.145, side * 0.175);
        circle(pu.x, pu.y, 0.082, BLACK3, 1);
      }
    }
    function buildScene(t) {
      icount = 0;
      /* lines under everything that is solid */
      for (const p of players) trailQuads(p, true);
      for (const p of players) trailQuads(p, false);
      /* the claim wave: one ring travelling out from where the loop closed */
      for (const f of flashes) {
        const k = f.t / 0.5;
        if (k >= 1) continue;
        const e = 1 - (1 - k) * (1 - k);
        ring(f.x, f.y, 0.5 + f.r * e, 0.22 + 0.55 * (1 - k), f.col, (1 - k) * 0.9);
      }
      for (const b of bits) {
        const k = 1 - b.t / b.life;
        quad(b.x, b.y, b.sz * (0.5 + 0.5 * k), b.sz * (0.5 + 0.5 * k), b.col, b.rot, K_RECT, Math.min(1, k * 2.4));
      }
      /* a ring where a dead player is about to come back */
      for (const p of players) {
        if (p.alive || p.deadT <= 0 || p.deadT > RESPAWN) continue;
        const k = 1 - p.deadT / RESPAWN;
        ring(p.x, p.y, 0.6 + 1.5 * (1 - k), 0.16, p.col3, 0.5 * k + 0.2);
      }
      for (const p of players) if (p.alive) headQuads(p, t);
    }

    /* ==================================================================== */
    /*  THE GLASS                                                           */
    /* ==================================================================== */
    /* Canvas 2D on top of the GL frame: white cards, dark text, hard offset
       shadows. The board is light, so text is ink with a white halo wherever
       it lands on a country rather than on paper. */
    function card(g, x, y, w, h, r) {
      g.fillStyle = 'rgba(27,34,51,.12)';
      rr(g, x + 2, y + 3, w, h, r); g.fill();
      g.fillStyle = 'rgba(255,255,255,.94)';
      rr(g, x, y, w, h, r); g.fill();
      g.strokeStyle = 'rgba(27,34,51,.13)';
      g.lineWidth = 1.5;
      rr(g, x, y, w, h, r); g.stroke();
    }
    function chip(g, x, y, s, col) {
      g.fillStyle = darkShade(col);
      rr(g, x, y, s, s, s * 0.34); g.fill();
      g.fillStyle = col;
      rr(g, x + 1.5, y + 1.5, s - 3, s - 3, s * 0.3); g.fill();
    }
    const darkShade = c => shade(c, -0.34);

    /* A point on the board (units, with a height above the floor in units) to
       a point on the stage, from whichever board is doing the drawing. */
    function proj(wx, wy, wz) {
      if (B3) return B3.toScreen(wx, wy, wz || 0);
      const s = toScreen(wx, wy - (wz || 0) * 0.8);
      return { x: s.x, y: s.y, w: 1 };
    }
    const NAVY = '#1c2744';
    /* the second game's lettering: condensed, heavy, leaning */
    function cond(g, s, x, y, size, col, align, o) {
      o = o || {};
      g.save();
      g.font = (o.upright ? '' : 'italic ') + (o.w || 800) + ' ' + size + 'px ' + Hud.FAM.cond;
      g.textAlign = align || 'left'; g.textBaseline = 'middle';
      try { g.letterSpacing = (o.track || 0) + 'px'; } catch (e) {}
      if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
      if (o.drop) { g.fillStyle = o.drop; g.fillText(s, x + (o.dx || 0), y + (o.dy === undefined ? 2.5 : o.dy)); }
      if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.lw || size * 0.2; g.strokeStyle = o.stroke; g.strokeText(s, x, y); }
      g.fillStyle = col; g.fillText(s, x, y);
      g.restore();
    }
    /* dark text on a light colour and white on a dark one */
    const lum3 = c => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
    const inkOn = i => lum3(PAL3[i % PAL3.length]) > 0.6 ? INK : '#ffffff';
    const pctOf = p => (p.cells / NA * 100).toFixed(2) + '%';
    function skull(g, x, y, s, col) {
      g.save();
      g.translate(x, y); g.scale(s / 20, s / 20);
      g.fillStyle = col;
      g.beginPath(); g.arc(0, -2, 9, 0, TAU); g.fill();
      rr(g, -5.5, 3, 11, 7, 2.5); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(-3.6, -2, 2.6, 0, TAU); g.arc(3.6, -2, 2.6, 0, TAU); g.fill();
      g.fillRect(-2.6, 6, 1.4, 4); g.fillRect(1.2, 6, 1.4, 4);
      g.restore();
    }

    /* The minimap: the arena as a disc, each owner's ground in its colour,
       every head a dot and yours an arrow. Repainted from the grid at most
       four times a second, and only when the grid has changed. */
    let mapCv = null, mapAt = -9;
    function minimap(g, cx, cy, r, t) {
      const MS = 96;
      if (!mapCv) { mapCv = document.createElement('canvas'); mapCv.width = mapCv.height = MS; }
      if (mapDirty && t - mapAt > 0.25) {
        mapDirty = false; mapAt = t;
        const c2 = mapCv.getContext('2d'), img = c2.createImageData(MS, MS), d = img.data, st = COLS / MS;
        for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
          const i = Math.floor(y * st + st / 2) * COLS + Math.floor(x * st + st / 2), o = own[i], j = (y * MS + x) * 4;
          if (o >= 0) { const c = PAL3[o % PAL3.length]; d[j] = c[0] * 255; d[j + 1] = c[1] * 255; d[j + 2] = c[2] * 255; d[j + 3] = 255; }
          else if (arena[i]) { d[j] = 238; d[j + 1] = 250; d[j + 2] = 246; d[j + 3] = 255; }
        }
        c2.putImageData(img, 0, 0);
      }
      g.save();
      g.fillStyle = 'rgba(28,39,68,.22)'; g.beginPath(); g.arc(cx, cy + 3, r + 7, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, r + 6, 0, TAU); g.fill();
      g.fillStyle = SEA; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
      g.imageSmoothingEnabled = true;
      g.drawImage(mapCv, cx - r, cy - r, r * 2, r * 2);
      const me = meP();
      for (const p of players) {
        if (!p.alive || p === me) continue;
        const px = cx - r + p.x / UW * r * 2, py = cy - r + p.y / UH * r * 2;
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px, py, 3.6, 0, TAU); g.fill();
        g.fillStyle = shade(p.col, -0.2); g.beginPath(); g.arc(px, py, 2.4, 0, TAU); g.fill();
      }
      if (me && me.alive) {
        const px = cx - r + me.x / UW * r * 2, py = cy - r + me.y / UH * r * 2;
        g.translate(px, py); g.rotate(me.ang);
        g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -5.5); g.lineTo(-2.5, 0); g.lineTo(-5, 5.5); g.closePath();
        g.fillStyle = '#ffffff'; g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke();
        g.fillStyle = NAVY; g.fill();
      }
      g.restore();
    }

    /* Names ride over the heads, in each player's colour with a white edge so
       one standing on its own country still reads. */
    function drawTags(g) {
      const me = meP();
      for (const p of players) {
        if (!p.alive) continue;
        const top = B3 ? B3.headTop(p) : 0.9;
        const s = proj(p.x, p.y, top + 0.55);
        if (s.x < -80 || s.x > W + 80 || s.y < -60 || s.y > H + 60) continue;
        const mine = p === me;
        cond(g, mine ? 'You' : p.name, s.x, s.y, mine ? 19 : 17, shade(p.col, -0.22), 'center',
             { stroke: '#ffffff', lw: 4.5, upright: true, w: 800 });
      }
    }
    /* A rival off the edge of the screen is the one who takes your ground, so
       they get an arrow on the rim pointing at them, in their colour. */
    function drawArrows(g) {
      const me = meP();
      const pad = 30;
      for (const p of players) {
        if (!p.alive || p === me) continue;
        const s = proj(p.x, p.y, 0.4);
        if (s.x > pad && s.x < W - pad && s.y > pad && s.y < H - pad) continue;
        const dx = s.x - W / 2, dy = s.y - H / 2;
        const ax = Math.abs(dx) < 1e-3 ? 1e-3 : Math.abs(dx), ay = Math.abs(dy) < 1e-3 ? 1e-3 : Math.abs(dy);
        const k = Math.min((W / 2 - pad) / ax, (H / 2 - pad) / ay);
        const px = W / 2 + dx * k, py = H / 2 + dy * k;
        g.save();
        g.translate(px, py); g.rotate(Math.atan2(dy, dx));
        g.beginPath(); g.moveTo(14, 0); g.lineTo(-9, -11); g.lineTo(-9, 11); g.closePath();
        g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke();
        g.fillStyle = p.col; g.fill();
        g.restore();
      }
    }

    function fmtClock(s) {
      const t = Math.max(0, Math.ceil(s));
      return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
    }

    function drawGlass(g, t) {
      const me = meP();
      const rank = players.slice().sort((a, b) => b.cells - a.cells || b.peak - a.peak);

      /* ---- things that belong to a place on the board go down first ---- */
      for (const q of pops) {
        const top = B3 ? 1.9 : 1.3;
        const s = proj(q.x, q.y, top + (1 - q.t) * 1.1);
        cond(g, q.s, s.x, s.y, 20, shade(q.col, -0.1), 'center', { stroke: '#ffffff', lw: 5, alpha: Math.min(1, q.t * 2.2) });
      }
      drawTags(g);
      drawArrows(g);

      /* ---- your share, top left: a navy pill filling with your colour ---- */
      const share = me ? me.cells / NA : 0, PW = 236, PH = 44, px0 = 14, py0 = 14;
      g.save();
      g.fillStyle = 'rgba(28,39,68,.2)'; rr(g, px0, py0 + 3, PW, PH, PH / 2); g.fill();
      g.fillStyle = NAVY; rr(g, px0, py0, PW, PH, PH / 2); g.fill();
      if (me) {
        const fw = Math.max(PH, Math.min(PW, PW * share * 1.6 + PH * 0.5));
        g.fillStyle = me.col; rr(g, px0, py0, fw, PH, PH / 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, px0 + 6, py0 + 5, Math.max(0, fw - 12), 9, 4.5); g.fill();
      }
      g.restore();
      cond(g, (share * 100).toFixed(2) + ' %', px0 + PW / 2, py0 + PH / 2 + 1, 27, '#ffffff', 'center',
           { stroke: 'rgba(28,39,68,.55)', lw: 4 });
      /* lines cut, under it */
      g.fillStyle = 'rgba(28,39,68,.16)'; rr(g, px0, py0 + PH + 11, 104, 34, 17); g.fill();
      g.fillStyle = '#ffffff'; rr(g, px0, py0 + PH + 8, 104, 34, 17); g.fill();
      skull(g, px0 + 21, py0 + PH + 25, 22, '#8a93a8');
      cond(g, '×' + (me ? me.kills : 0), px0 + 38, py0 + PH + 26, 24, NAVY, 'left');
      if (me && me.peak > 0)
        cond(g, 'BEST ' + (me.peak / NA * 100).toFixed(2) + '%', px0 + 116, py0 + PH + 26, 16, 'rgba(28,39,68,.7)', 'left',
             { stroke: 'rgba(255,255,255,.85)', lw: 3.5, track: 0.5 });

      /* ---- the clock, top centre ---- */
      const low = timeLeft <= 15 && phase === 'play';
      g.fillStyle = 'rgba(28,39,68,.2)'; rr(g, W / 2 - 58, 17, 116, 40, 20); g.fill();
      g.fillStyle = low ? '#e23b4e' : NAVY; rr(g, W / 2 - 58, 14, 116, 40, 20); g.fill();
      cond(g, fmtClock(timeLeft), W / 2, 35, 26, '#ffffff', 'center');
      g.fillStyle = 'rgba(28,39,68,.14)'; rr(g, W / 2 - 46, 60, 92, 5, 2.5); g.fill();
      g.fillStyle = low ? '#e23b4e' : NAVY; rr(g, W / 2 - 46, 60, Math.max(4, 92 * clamp(timeLeft / ROUND, 0, 1)), 5, 2.5); g.fill();

      /* ---- the standings, top right: the leaders, and you if you are not one ---- */
      const rows = rank.slice(0, 3);
      if (me && rank.indexOf(me) >= 3) rows.push(me);
      const LW = 262, RH = 36;
      rows.forEach((p, k) => {
        const i = rank.indexOf(p), y = 14 + k * (RH + 8) + (k === 3 ? 8 : 0), x = W - LW;
        const ink = inkOn(p.idx), mine = p === me;
        g.fillStyle = 'rgba(28,39,68,.18)'; rr(g, x, y + 3, LW + 30, RH, RH / 2); g.fill();
        g.fillStyle = p.alive ? p.col : '#aab3c2'; rr(g, x, y, LW + 30, RH, RH / 2); g.fill();
        g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, x + 5, y + 5, 74, RH - 10, (RH - 10) / 2); g.fill();
        cond(g, pctOf(p), x + 42, y + RH / 2 + 1, 16, '#ffffff', 'center');
        const nm = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
        cond(g, mine ? 'You' : nm, x + 90, y + RH / 2 + 1, 22, p.alive ? ink : '#ffffff', 'left', { upright: true });
        cond(g, String(i + 1), x - 10, y + RH / 2 + 1, 24, NAVY, 'right', { stroke: '#ffffff', lw: 5 });
        if (mine) { g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; rr(g, x + 1.25, y + 1.25, LW + 30, RH - 2.5, (RH - 2.5) / 2); g.stroke(); }
      });

      /* ---- what just happened, under the standings ---- */
      let fy = 14 + rows.length * (RH + 8) + (rows.length > 3 ? 14 : 6);
      for (const f of feed) {
        const k = Math.min(1, f.t * 5), out = Math.max(0, 1 - (f.t - 2.6) / 0.6);
        if (out <= 0) continue;
        g.save();
        g.globalAlpha *= Math.min(k, out);
        g.font = 'italic 800 17px ' + Hud.FAM.cond;
        const tw = g.measureText(f.text).width + 40;
        g.fillStyle = f.loud ? '#e23b4e' : '#ffffff'; rr(g, W - tw - 14, fy, tw, 28, 14); g.fill();
        g.fillStyle = f.col; g.beginPath(); g.arc(W - tw + 2, fy + 14, 6, 0, TAU); g.fill();
        g.restore();
        cond(g, f.text, W - tw + 14, fy + 15, 17, f.loud ? '#ffffff' : NAVY, 'left', { alpha: Math.min(k, out) });
        fy += 34;
      }

      /* ---- the arena from above, bottom left ---- */
      minimap(g, 80, H - 80, 60, t);

      /* ---- how it works, for the first few seconds ---- */
      if (phase === 'play' && timeLeft > ROUND - 7) {
        const a = clamp((ROUND - timeLeft) / 0.4, 0, 1) * clamp((timeLeft - (ROUND - 7)) / 0.6, 0, 1);
        g.save();
        g.globalAlpha *= a;
        g.fillStyle = 'rgba(28,39,68,.18)'; rr(g, W / 2 - 210, H - 72, 420, 50, 25); g.fill();
        g.fillStyle = '#ffffff'; rr(g, W / 2 - 210, H - 76, 420, 50, 25); g.fill();
        g.restore();
        cond(g, 'LEAVE YOUR GROUND  ·  LOOP BACK  ·  KEEP WHAT IS INSIDE', W / 2, H - 50, 18, NAVY, 'center',
             { alpha: a, track: 0.5 });
      }

      /* ---- dead, and waiting ---- */
      if (me && !me.alive && phase === 'play') {
        g.fillStyle = 'rgba(28,39,68,.2)'; rr(g, W / 2 - 160, H / 2 - 36, 320, 84, 26); g.fill();
        g.fillStyle = NAVY; rr(g, W / 2 - 160, H / 2 - 42, 320, 84, 26); g.fill();
        cond(g, 'YOUR GROUND IS GONE', W / 2, H / 2 - 18, 22, '#ff6b7a', 'center', { track: 1 });
        cond(g, 'BACK IN ' + Math.max(1, Math.ceil(me.deadT)), W / 2, H / 2 + 14, 30, '#ffffff', 'center', { track: 1 });
      }

      /* ---- the count in ---- */
      if (phase === 'count') {
        const n = Math.max(0, Math.ceil(phaseT - 0.2));
        const k = 1 - (phaseT - 0.2 - (n - 1));
        const pop = 0.6 + 0.4 * (1 - (1 - clamp(k * 3, 0, 1)) * (1 - clamp(k * 3, 0, 1)));
        cond(g, n <= 0 ? 'GO!' : String(n), W / 2, H / 2 - 44, Math.round(110 * pop), '#ffffff', 'center',
             { stroke: NAVY, lw: 12, drop: 'rgba(28,39,68,.35)', dy: 7 });
        g.fillStyle = 'rgba(28,39,68,.18)'; rr(g, W / 2 - 250, H / 2 + 34, 500, 64, 22); g.fill();
        g.fillStyle = '#ffffff'; rr(g, W / 2 - 250, H / 2 + 30, 500, 64, 22); g.fill();
        cond(g, 'Leave your ground to draw. Get back to close the loop.', W / 2, H / 2 + 52, 20, NAVY, 'center', { upright: true });
        cond(g, 'Anyone who touches your open line takes everything you have.', W / 2, H / 2 + 76, 15, 'rgba(28,39,68,.62)',
             'center', { upright: true, w: 700 });
      }
    }

    /* ---------------------------------------------------------------- end */
    const leader = () => players.slice().sort((a, b) => b.cells - a.cells || b.peak - a.peak)[0];
    function finish(dominator) {
      if (ended) return;
      ended = true;
      const me = meP();
      const rank = players.slice().sort((a, b) => b.cells - a.cells || b.peak - a.peak);
      const win = !!(me && rank[0] === me);
      const pct = me ? me.cells / NA * 100 : 0;
      const res = {
        score: me ? me.peak + me.kills * 150 : 0,
        win: win,
        title: win ? (dominator === me ? 'You took the board' : 'Most ground held')
                   : (dominator ? dominator.name + ' took the board' : (rank[0] ? rank[0].name + ' held the most' : 'Time')),
        message: me
          ? 'You finished on ' + pct.toFixed(1) + '% of the board with ' + me.kills + ' line' + (me.kills === 1 ? '' : 's') + ' cut.'
          : 'Round over.',
        stats: [
          { label: 'Held', value: pct.toFixed(1) + '%' },
          { label: 'Best', value: me ? (me.peak / NA * 100).toFixed(1) + '%' : '—' },
          { label: 'Lines cut', value: me ? me.kills : 0 },
          { label: 'Place', value: me ? (rank.indexOf(me) + 1) + '/' + players.length : '—' }
        ]
      };
      if (HOSTMP) MPS.send('over', res);
      api.gameOver(res);
    }

    function hud() {
      const me = meP();
      const rank = players.slice().sort((a, b) => b.cells - a.cells);
      api.hud({
        Held: me ? (me.cells / NA * 100).toFixed(1) + '%' : '—',
        Best: me ? (me.peak / NA * 100).toFixed(1) + '%' : '—',
        Cut: me ? me.kills : 0,
        Place: me ? (rank.indexOf(me) + 1) + '/' + players.length : '—',
        Time: fmtClock(timeLeft)
      });
    }

    /* --------------------------------------------------------------- start */
    if (SIM) for (const p of players) {
      const s = spawnSpot(p) || [(COLS >> 1), (ROWS >> 1)];
      doSpawn(p, s[0], s[1]);
    }
    recount();
    camUpdate(0, true);

    /* Declared before the return so nothing here is read out of its temporal
       dead zone during mount. */
    /* a snapshot every 83ms: the buffer holds a little more than one gap, so
       a packet running late is waited for rather than frozen on */
    const nb = MPS ? NetBuf(130) : null;
    let lastSnapRef = null, sendT = 0, fullT = 0;

    function stepEffects(dt) {
      for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > 0.55) flashes.splice(i, 1); }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt * 1.1; if (pops[i].t <= 0) pops.splice(i, 1); }
      for (let i = feed.length - 1; i >= 0; i--) { feed[i].t += dt; if (feed[i].t > 3.4) feed.splice(i, 1); }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.t += dt;
        if (b.t >= b.life) { bits.splice(i, 1); continue; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.vy += 7 * dt;
        b.vx *= 1 - 1.8 * dt; b.vy *= 1 - 1.8 * dt;
        b.rot += b.vr * dt;
      }
    }

    /* ---- the front page ----
       Opened from the hub, Paper.io starts over an arena that is already
       being fought over: every cube on it is a rival, the camera drifts high
       over the board, and claims land and lines get cut while you choose. The
       choices sit on a card at the left, and the name is set in little slabs
       the way the countries are. Length, pace and rivals are read when a
       board is dealt, so Play mounts a fresh one, which opens pulled all the
       way back and swoops down onto your cube during the count. */
    const FROM_MENU = !!api.fromMenu && !MPS;
    const FK = FrontKit(api, {
      online: !!MPS, mp: true, remount: true,
      onOpt(id) { if (id === 'bots' && FK.on) menuRoster(); }
    });
    const TURF_LEN = [['short', '90 SEC'], ['normal', '2:30'], ['long', '4:00']];
    const TURF_PACE = [['calm', 'CALM'], ['normal', 'NORMAL'], ['brisk', 'BRISK']];
    const TURF_BOTS = [['few', '3'], ['some', '5'], ['many', '7']];
    const TURF_TH = { track: 'rgba(28,39,68,.08)', trackEdge: 'rgba(28,39,68,.06)', chip: NAVY, chipInk: '#ffffff',
                      chipOff: 'rgba(28,39,68,.6)', chipR: 12, chipPad: 4, chipGap: 3,
                      face: Hud.FAM.cond, italic: true, weight: 800 };
    let veilCv = null, veilKey = '';
    if (FK.on) { quiet = true; menuRoster(); }
    /* a round from the front page opens on the whole arena */
    if (FROM_MENU) cam.vh = UH + 4;

    /* Everyone on the front page's board is a rival — as many as the setting
       says, plus the seat you will take — and a fresh board is dealt for them. */
    function menuRoster() {
      const n = ({ few: 3, some: 5, many: 7 })[FK.opt('bots', 'some')] || 5;
      players = [];
      for (let i = 0; i <= n; i++) players.push(mkPlayer(i, 'bot' + i, BOTNAME[i % BOTNAME.length], true));
      menuDeal();
    }
    function menuDeal() {
      own.fill(-1); trailOwner.fill(-1);
      flashes.length = 0; bits.length = 0; pops.length = 0; feed.length = 0;
      for (const p of players) { p.trail.length = 0; p.path.length = 0; p.alive = false; p.cells = 0; p.peak = 0; p.kills = 0; }
      for (const p of players) { const s = spawnSpot(p) || [COLS >> 1, ROWS >> 1]; doSpawn(p, s[0], s[1]); }
      markGrid(); recount();
    }
    /* the round's own rules, with nobody at the controls and nothing kept */
    function menuSim(dt) {
      stepEffects(dt);
      for (const p of players) {
        if (p.alive) continue;
        p.deadT -= dt;
        if (p.deadT > 0) continue;
        const s = spawnSpot(p);
        if (!s) { menuDeal(); return; }
        doSpawn(p, s[0], s[1]);
      }
      for (const p of players) advance(p, dt);
      headClashes();
      trackPaths();
      /* once somebody holds half the arena the picture stops changing, so it
         is dealt again */
      for (const p of players) if (p.cells / NA >= 0.5) { menuDeal(); return; }
    }
    /* a slow drift high over the arena, held right of centre because the card
       covers the left of the screen */
    function menuCam(T) {
      cam.vh = 40;
      const vw = cam.vh * (W / H);
      cam.x = ARC + Math.sin(T * 0.043) * 16 - vw * 0.12;
      cam.y = ARC + Math.sin(T * 0.067 + 1.3) * 14;
    }
    /* the card's backdrop: the arena's mint, thinning out into the board */
    function paperVeil(g) {
      const tf = g.getTransform ? g.getTransform() : null;
      const S = tf ? clamp(Math.hypot(tf.a, tf.b), 1, 3) : 1, key = S.toFixed(3);
      if (!veilCv || veilKey !== key) {
        veilKey = key;
        veilCv = veilCv || document.createElement('canvas');
        veilCv.width = Math.ceil(640 * S); veilCv.height = Math.ceil(H * S);
        const c = veilCv.getContext('2d');
        c.setTransform(S, 0, 0, S, 0, 0);
        const gr = c.createLinearGradient(0, 0, 640, 0);
        gr.addColorStop(0, 'rgba(238,250,246,.94)'); gr.addColorStop(0.58, 'rgba(238,250,246,.82)');
        gr.addColorStop(1, 'rgba(238,250,246,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 640, H);
      }
      g.drawImage(veilCv, 0, 0, 640, H);
    }
    /* a head as the board draws one, flat: a rounded block with its front in
       shade and two eyes on top looking the way it goes */
    function menuHead(g, x, y, s, col, look) {
      g.save();
      g.translate(x, y);
      g.fillStyle = 'rgba(28,39,68,.16)'; rr(g, -s / 2 + 1, -s / 2 + 4, s, s, s * 0.22); g.fill();
      g.fillStyle = shade(col, -0.22); rr(g, -s / 2, -s / 2 + s * 0.2, s, s * 0.8, s * 0.22); g.fill();
      g.fillStyle = mixHex(col, '#ffffff', 0.18); rr(g, -s / 2, -s / 2, s, s * 0.78, s * 0.22); g.fill();
      for (const side of [-1, 1]) {
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(side * s * 0.2, -s * 0.12, s * 0.17, 0, TAU); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(side * s * 0.2 + look * s * 0.06, -s * 0.1, s * 0.085, 0, TAU); g.fill();
      }
      g.restore();
    }
    /* The name, each letter a little slab in a player's colour: its top, and
       its front a shade down, dropped onto the paper and stamped flat. */
    function drawTurfTitle(g, x0, cy, T, word, size, centre) {
      word = word || 'PAPER.IO'; size = size || 90;
      const u = size / 90;
      g.save();
      g.font = 'italic 800 ' + size + 'px ' + Hud.FAM.cond;
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      try { g.letterSpacing = '0px'; } catch (e) {}
      const D = 9 * u;
      let x = x0;
      if (centre) { let tw = 0; for (const c of word) tw += g.measureText(c).width + 4 * u; x = x0 - (tw - 4 * u) / 2; }
      for (let i = 0; i < word.length; i++) {
        const c = word[i], w = g.measureText(c).width, col = PAL[i % PAL.length];
        const t = T - 0.12 - i * 0.075;
        if (t > 0) {
          const fall = t < 0.22 ? 1 - Math.pow(t / 0.22, 2) : 0;
          const land = t >= 0.22 && t < 0.62 ? Math.sin((t - 0.22) / 0.4 * Math.PI * 2) * Math.exp(-(t - 0.22) * 7) : 0;
          const hc = (T - 2.4 - i * 0.08) % 5.2, hop = T > 2.4 && hc > 0 && hc < 0.3 ? Math.sin(hc / 0.3 * Math.PI) * 10 : 0;
          g.save();
          g.translate(x + w / 2, cy + 30 * u - fall * 130 * u - hop * u);
          g.scale(1 + land * 0.14, 1 - land * 0.18);
          g.translate(-w / 2, -30 * u);
          g.fillStyle = 'rgba(28,39,68,.14)'; g.fillText(c, 3 * u, D + 7 * u);
          g.fillStyle = shade(col, -0.3);
          for (let k = D; k > 0; k -= 1.5) g.fillText(c, 0, k);
          g.lineWidth = 3 * u; g.strokeStyle = shade(col, -0.3); g.strokeText(c, 0, 0);
          g.fillStyle = col; g.fillText(c, 0, 0);
          g.restore();
        }
        x += w + 4 * u;
      }
      g.restore();
    }
    /* ---- the results ----
       On the paper, in the board's own colours: the verdict stamped down in
       the title's slab letters, how much of the board you held as one big
       figure in your own green, what the round did on white cards with a chip
       of colour each, and the green slab you play on to go again. */
    const TCOND = { face: Hud.FAM.cond, italic: true, weight: 800 };
    const RES = {
      veil(g, k) { g.fillStyle = 'rgba(238,250,246,' + (.86 * k).toFixed(3) + ')'; g.fillRect(0, 0, W, H); },
      hero(g, cx, top) {
        const Rr = FK.R, tight = Rr.paid.length > 4, word = String(Rr.title).toUpperCase();
        drawTurfTitle(g, cx, top + 18, FK.rt() + .12, word, word.length > 16 ? 40 : word.length > 11 ? 48 : 56, true);
        FK.caps(g, Rr.message, cx, top + (tight ? 70 : 78), 10, 'rgba(28,39,68,.62)', 'center', { track: .16, alpha: FK.eo(FK.rs('sub', undefined, .4)) });
        const held = (Rr.gameStats.find(st => st.label === 'Held') || {}).value || fmt(Rr.score);
        const k = FK.rs('stat', 0, .5), big = tight ? 52 : 66, ny = top + (tight ? 118 : 136);
        if (k > 0) {
          const num = parseFloat(held), shown = isNaN(num) ? held : (num * FK.eo(FK.rs('stat', 0, .9))).toFixed(1) + '%';
          g.save(); g.globalAlpha *= Math.min(1, k * 2); g.translate(cx, ny); const sp = k < 1 ? FK.bo(k) : 1; g.scale(sp, sp);
          g.font = 'italic 800 ' + big + 'px ' + Hud.FAM.cond; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
          g.fillStyle = shade(PAL[0], -0.3);
          for (let d = 7; d > 0; d -= 1.5) g.fillText(shown, 0, d);
          g.lineWidth = 3; g.strokeStyle = shade(PAL[0], -0.3); g.strokeText(shown, 0, 0);
          g.fillStyle = PAL[0]; g.fillText(shown, 0, 0);
          g.restore();
        }
        const ty = ny + big * .5 + 20;
        FK.caps(g, (Rr.isBest ? 'New best  ·  ' : Rr.cheated ? 'Not saved  ·  ' : '') + 'Score ' + fmt(Rr.score) + '  ·  best ' + fmt(Rr.best), cx, ty, 9.5,
                Rr.isBest ? shade(PAL[0], -0.2) : 'rgba(28,39,68,.6)', 'center', { track: .18, alpha: FK.eo(FK.rs('tag', undefined, .4)) });
        return ty + 14 - top;
      },
      stat(g, st, x, y, w, h, i) {
        card(g, x, y, w, h, 16);
        chip(g, x + 14, y + h / 2 - 9, 18, PAL[(i + 1) % PAL.length]);
        FK.caps(g, st.label, x + 42, y + h / 2, 9, 'rgba(28,39,68,.6)', 'left', { track: .18 });
        FK.text(g, String(st.value), x + w - 16, y + h / 2 + 1, 22, NAVY, 'right', TCOND);
      },
      card(g, x, y, w, h) { card(g, x, y, w, h, 20); },
      ls: FK.ledgerStyle({
        face: Hud.FAM.cond, italic: true, weight: 700, ink: NAVY, mute: 'rgba(28,39,68,.58)', gold: '#e08a0b', labelFace: Hud.FAM.sans,
        rule: 'rgba(28,39,68,.14)', bar: 'rgba(28,39,68,.1)', fill: PAL[0], rowH: 24, size: 17, lsize: 9, totalSize: 32,
        totalH: 42, xpH: 42, barH: 8, track: .18
      }),
      button(g, key, label, x, y, w, h, primary) {
        if (primary) FK.button(g, key, x, y, w, h, label, { r: h / 2, shadow: shade(PAL[0], -0.32), edge: false, gloss: false, face: Hud.FAM.cond, italic: true, weight: 800 }, {
          fill: PAL[0],
          draw(c, ww, hh, b) {
            menuHead(c, -ww / 2 + 28, 1, 20, PAL[0], Math.sin(FK.t * 2) * (0.6 + b.h * 0.4));
            c.save(); c.font = 'italic 800 22px ' + Hud.FAM.cond; c.textAlign = 'center'; c.textBaseline = 'middle';
            try { c.letterSpacing = '2px'; } catch (e) {}
            c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = shade(PAL[0], -0.32); c.strokeText(label, 12, 2);
            c.fillStyle = '#ffffff'; c.fillText(label, 12, 2); c.restore();
          }
        });
        else FK.button(g, key, x, y, w, h, label, { r: h / 2, shadow: 'rgba(28,39,68,.18)', edge: false, gloss: false, face: Hud.FAM.cond, italic: true, weight: 800 },
                       { fill: '#ffffff', ink: NAVY, size: 19, track: 2 });
      },
      hint(g, cx, y) { FK.caps(g, 'Space to play again  ·  Esc for the hub', cx, y, 9, 'rgba(28,39,68,.5)', 'center', { track: .14 }); }
    };
    function drawMenu(g, live) {
      const T = live ? FK.t : 99, inn = (d, dur) => live ? FK.in(d, dur) : 1;
      const MUTE = 'rgba(28,39,68,.6)';
      paperVeil(g);
      drawTurfTitle(g, 40, 100, T);
      FK.caps(g, 'Draw a line  ·  loop it back  ·  keep what is inside', 44, 160, 10, MUTE, 'left', { track: 0.2, alpha: inn(0.7, 0.5) });

      const mode = FK.mode(), P2 = api.party, lv = mode !== 'guest';
      const ck = FK.eo(inn(0.4, 0.55)), X = 40, Y = 184, CW = 384, CH = 314;
      g.save();
      g.globalAlpha *= ck; g.translate(-(1 - ck) * 34, 0);
      g.fillStyle = 'rgba(28,39,68,.14)'; rr(g, X, Y + 6, CW, CH, 22); g.fill();
      g.fillStyle = '#ffffff'; rr(g, X, Y, CW, CH, 22); g.fill();
      const CO = { size: 18, track: 1, live: lv };
      FK.caps(g, 'Round', X + 22, Y + 28, 10, MUTE, 'left', { track: 0.2 });
      FK.chips(g, 'len', X + 18, Y + 40, CW - 36, 42, TURF_LEN, TURF_TH, Object.assign({ def: 'normal' }, CO));
      FK.caps(g, 'Pace', X + 22, Y + 104, 10, MUTE, 'left', { track: 0.2 });
      FK.chips(g, 'speed', X + 18, Y + 116, CW - 36, 42, TURF_PACE, TURF_TH, Object.assign({ def: 'normal' }, CO));
      FK.caps(g, mode === 'solo' ? 'Rivals' : 'Rivals in the empty seats', X + 22, Y + 180, 10, MUTE, 'left', { track: 0.2 });
      /* the rivals themselves, lined up by the label, as many as there will be */
      const nb = ({ few: 3, some: 5, many: 7 })[FK.opt('bots', 'some')] || 5;
      for (let i = 0; i < 7; i++) {
        const k = FK.spring('tb' + i, i < nb ? 1 : 0, 420, 22);
        if (k <= 0.02) continue;
        g.save(); g.globalAlpha *= clamp(k, 0, 1);
        menuHead(g, X + CW - 30 - i * 21, Y + 180, 14 * clamp(k, 0, 1.25), PAL[(i + 1) % PAL.length], 1);
        g.restore();
      }
      FK.chips(g, 'bots', X + 18, Y + 192, CW - 36, 42, TURF_BOTS, TURF_TH, Object.assign({ def: 'some' }, CO));

      /* Play, in the green you will be, standing on its own front like a slab */
      const label = mode === 'host' ? 'START MATCH' : mode === 'guest' ? 'WAITING FOR HOST' : 'PLAY';
      const pk = FK.bo(inn(0.8, 0.55));
      g.save();
      g.globalAlpha *= Math.min(1, pk);
      FK.button(g, 'play', X + 18, Y + 250 + (1 - pk) * 20, CW - 36, 50, label, {
        r: 25, shadow: lv ? shade(PAL[0], -0.32) : 'rgba(28,39,68,.25)', edge: false, gloss: false,
        face: Hud.FAM.cond, italic: true, weight: 800
      }, {
        live: lv, fill: lv ? PAL[0] : '#c9d2df',
        draw(c, w, h, b) {
          if (lv) menuHead(c, -w / 2 + 32, 1, 22, PAL[0], Math.sin(FK.t * 2) * (0.6 + b.h * 0.4));
          c.save();
          c.font = 'italic 800 26px ' + Hud.FAM.cond; c.textAlign = 'center'; c.textBaseline = 'middle';
          try { c.letterSpacing = '2px'; } catch (e) {}
          if (lv) { c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = shade(PAL[0], -0.32); c.strokeText(label, 10, 2); }
          c.fillStyle = lv ? '#ffffff' : 'rgba(28,39,68,.6)'; c.fillText(label, lv ? 10 : 0, 2);
          c.restore();
        }
      });
      g.restore();
      g.restore();

      /* friends, on a white pill of its own */
      const fk = FK.bo(inn(0.9, 0.55)), fl = P2.inRoom ? 'PARTY  ·  ' + P2.size : 'PLAY WITH FRIENDS';
      g.save();
      g.globalAlpha *= Math.min(1, fk);
      FK.button(g, 'party', X, Y + CH + 16 + (1 - fk) * 20, CW, 48, fl, {
        r: 24, shadow: 'rgba(28,39,68,.18)', edge: false, gloss: false,
        face: Hud.FAM.cond, italic: true, weight: 800
      }, { fill: '#ffffff', ink: NAVY, size: 20, track: 2 });
      g.restore();
      FK.caps(g, 'Arrows or WASD to steer  ·  hold two for a diagonal  ·  Esc for the hub', 44, H - 16, 9, 'rgba(28,39,68,.5)', 'left',
              { track: 0.14, alpha: inn(1.1, 0.5) });
    }

    return {
      resize() { W = api.W; },
      update(dt) {
        if (ended) return;
        /* on the front page the menu has the keys, and the rivals play on */
        if (FK.on) { FK.input(api.input); if (FK.on) menuSim(Math.min(dt, 1 / 30)); return; }
        stepEffects(dt);

        if (GUEST) {
          const s = MPS._snap;
          if (s && s !== lastSnapRef) { lastSnapRef = s; if (nb.push(s)) applySnap(s); }
          if (MPS.hostLeft) { ended = true; api.gameOver({ score: 0, title: 'Host left', message: 'The board closed.' }); return; }
          for (const e of MPS._events.splice(0)) {
            if (e[0] === 'o') { ended = true; api.gameOver(e[1]); return; }
          }
          interpRemote();
          if (phase === 'play') {
            applyMyInput();
            /* my own body keeps moving between packets; waiting a round trip
               before the turn even starts is what makes steering feel dead */
            const p = meP();
            if (p && p.alive) {
              p.ang = turnToward(p.ang, p.wantAng, TURN * dt);
              p.dir = dirOfAng(p.ang);
              const mv = Math.min(SPD * dt, 12);
              p.x = clamp(p.x + Math.cos(p.ang) * mv, 0, UW - 0.001);
              p.y = clamp(p.y + Math.sin(p.ang) * mv, 0, UH - 0.001);
              p.cx = clamp(Math.floor(p.x * SUB), 0, COLS - 1);
              p.cy = clamp(Math.floor(p.y * SUB), 0, ROWS - 1);
            }
            for (const q of players) if (!q.alive) q.deadT = Math.max(0, q.deadT - dt);
          }
          trackPaths();
          camUpdate(dt);
          hud();
          return;
        }

        if (MPS) {
          const q = MPS._cmdQ;
          while (q.length) {
            const c = q.shift();
            if (!c || c.c !== 'a') continue;
            const who = players.find(p => p.id === c.from);
            if (who) who.wantAng = (c.a | 0) / 1000;
          }
        }

        if (phase === 'count') {
          phaseT -= dt;
          const n = Math.ceil(phaseT - 0.2);
          if (n !== lastTick && n >= 0 && n <= 3) { lastTick = n; Sound.turfTick(n === 0); }
          if (phaseT <= 0) phase = 'play';
        } else if (phase === 'play') {
          applyMyInput();
          for (const p of players) {
            if (p.alive) continue;
            p.deadT -= dt;
            if (p.deadT > 0) continue;
            const s = spawnSpot(p);
            /* Nowhere left to put anybody down means somebody has taken the
               whole board, and the round is theirs — coming back inside another
               player's country would only hand them the kill. */
            if (!s) { camUpdate(dt); finish(leader()); return; }
            doSpawn(p, s[0], s[1]); ev(['s', p.idx, s[0], s[1]]);
          }
          for (const p of players) advance(p, dt);
          headClashes();
          trackPaths();
          timeLeft -= dt;
          /* a board this size can still be taken outright, and when it is
             there is no reason to play out the clock */
          for (const p of players) if (p.cells / NA >= DOMINATE) { camUpdate(dt); finish(p); return; }
          if (timeLeft <= 0) { timeLeft = 0; camUpdate(dt); finish(null); return; }
        }

        if (MPS) {
          sendT -= dt; fullT -= dt;
          if (sendT <= 0) {
            sendT = 1 / 12;
            const full = fullT <= 0;
            if (full) fullT = 1.5;
            MPS.send('snap', snap(full));
          }
        }
        camUpdate(dt);
        hud();
      },

      render(ctx) {
        FK.frame();
        if (FK.on) menuCam(FK.t);
        const t = performance.now() / 1000;
        if (B3) B3.render(ctx, t);
        else {
          /* Match the backing store to the pixels this will actually occupy. A
             canvas sized in logical units and then scaled up by the stage is the
             difference between a sharp edge and a soft one. */
          const tf = ctx.getTransform ? ctx.getTransform() : null;
          const S = tf ? clamp(Math.hypot(tf.a, tf.b), 1, 3) : 1;
          syncTex();
          buildScene(t);
          const v = camView();
          R.resize(Math.ceil(W * S), Math.ceil(H * S));
          R.draw(icount, cam.x, cam.y, v.vw, v.vh);
          ctx.drawImage(R.canvas, 0, 0, W, H);
        }
        if (FK.on) { drawMenu(ctx, true); FK.cursor(); return; }
        if (!FK.R) drawGlass(ctx, t);
        else FK.layer(ctx, 1 - FK.eo(FK.rs('title', undefined, .3)), c => drawGlass(c, t));
        /* a round started from the front page: the card goes as the count comes up */
        if (FROM_MENU && FK.t < 0.6) {
          ctx.save(); ctx.globalAlpha *= 1 - FK.eo(clamp(FK.t / 0.45, 0, 1)); drawMenu(ctx, false); ctx.restore();
        }
        if (FK.R) FK.resultsPage(ctx, W, H, RES);
      },
      /* Escape on the front page goes back to the hub; in a round it pauses */
      escape: FK.escape,
      results(Rr) { FK.showResults(Rr); },
      destroy() {
        FK.done();
        try { if (R) R.dispose(); } catch (e) {}
        try { if (B3) B3.dispose(); } catch (e) {}
      },
      /* What the checks read: the grid, the claim, and the bodies, all as
         plain data, so a test can assert that a loop closes on exactly the
         cells it should without a canvas or a clock. */
      _dev: {
        cols: COLS, rows: ROWS, n: N, gl: usingGL,
        own: own, trailOwner: trailOwner, get players() { return players; }, arena: arena, na: NA,
        claim: doClaim, kill: doKill, spawn: doSpawn, enter: enterCell,
        recount: recount, packGrid: packGrid, unpackGrid: unpackGrid,
        packTrail: packTrail, unpackTrail: unpackTrail, snap: snap,
        get phase() { return phase; }, set phase(v) { phase = v; },
        get timeLeft() { return timeLeft; }, set timeLeft(v) { timeLeft = v; },
        get cam() { return cam; },
        step(dt) { /* one tick of the simulation, no rendering */
          for (const p of players) advance(p, dt);
          headClashes();
          trackPaths();
        }
      }
    };
  }
});


