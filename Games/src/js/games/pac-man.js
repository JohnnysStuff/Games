/* ============================================================ PAC-MAN ==== */
/* Pac-Man, and then the thing the original could never do: the ghosts are
   other people. One player gets Pac-Man and everyone else takes a ghost, so
   the hunt has four minds in it instead of four rules.

   The maze is drawn the way the arcade drew it: a line traced along the
   boundary between wall and corridor, not the wall tiles themselves. That one
   decision is most of why a Pac-Man board either looks like Pac-Man or looks
   like a tile map with blue squares on it.

   Everything here is drawn flat and hard-edged: one blue line for the maze,
   solid fills for the cast, black behind it. An earlier pass had bloom under
   the walls, a halo under Pac and gradients across the ghosts, and the sum of
   it was a board that looked fogged. The maze is also baked at the resolution
   it will actually be displayed at rather than at the game's logical size,
   which is the difference between a crisp line and a soft one. */
registerGame({
  id: 'pac',
  title: 'Pac-Man',
  tagline: 'The maze, the pellets, the four ghosts — except online the ghosts are your friends, and one of you is dinner. The roles are drawn fresh every round.',
  tags: ['Arcade', 'Chase', 'Online', 'Versus'],
  scoreLabel: 'Score',
  mp: 'arena',
  mpMin: 2, mpMax: 5,
  front: true,
  controls: [
    ['Move', '&larr; &darr; &uarr; &rarr; / WASD'],
    ['Pause', 'Esc']
  ],
  options: [
    { id: 'mode', label: 'Mode', def: 'classic', type: 'cards', choices: [
      { v: 'classic', l: 'Classic', icon: '&#128123;',
        desc: 'One Pac-Man, everyone else a ghost. Clear the maze or get cornered.' },
      { v: 'infect',  l: 'Infection', icon: '&#129503;',
        desc: 'One ghost, everybody else is Pac-Man. Get caught and you join the hunt.' }
    ] },
    { id: 'fill', label: 'AI ghosts', def: 'on', choices: [
      { v: 'on', l: 'Fill empty slots' }, { v: 'off', l: 'Players only' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="pcmB" cx=".5" cy=".45" r=".85"><stop offset="0" stop-color="#141a44"/><stop offset="1" stop-color="#04050c"/></radialGradient><radialGradient id="pcmP" cx=".38" cy=".3"><stop offset="0" stop-color="#fff59a"/><stop offset=".55" stop-color="#ffe11a"/><stop offset="1" stop-color="#c9a406"/></radialGradient><linearGradient id="pcmR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a72"/><stop offset="1" stop-color="#d81f18"/></linearGradient><linearGradient id="pcmC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8ffff"/><stop offset="1" stop-color="#18c8e0"/></linearGradient><linearGradient id="pcmK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0e8"/><stop offset="1" stop-color="#ff86c0"/></linearGradient></defs><rect width="320" height="180" fill="url(#pcmB)"/><g fill="none" stroke="#2a3ce0" stroke-width="4" stroke-linecap="round" opacity=".85"><path d="M14 14h292M14 166h292M14 14v152M306 14v152"/><path d="M46 44h44M46 44v30M90 44v30"/><path d="M230 44h44M274 44v30M230 44v30"/><path d="M46 108h44M46 138v-30M90 138v-30"/><path d="M230 108h44M274 138v-30M230 138v-30"/></g><g fill="#ffd9a8"><circle cx="120" cy="30" r="3"/><circle cx="144" cy="30" r="3"/><circle cx="168" cy="30" r="3"/><circle cx="192" cy="30" r="3"/><circle cx="120" cy="152" r="3"/><circle cx="144" cy="152" r="3"/><circle cx="168" cy="152" r="3"/><circle cx="192" cy="152" r="3"/><circle cx="32" cy="90" r="7"/><circle cx="288" cy="90" r="7"/></g><g transform="translate(112 90)"><circle r="46" fill="#ffe11a" opacity=".16"/><path d="M0 0 L43 -25 A50 50 0 1 0 43 25 Z" fill="url(#pcmP)"/></g><g transform="translate(212 92)"><path d="M-25 8a25 25 0 0 1 50 0v22l-8-7-8 7-9-7-8 7-9-7-8 7z" fill="url(#pcmR)"/><ellipse cx="-9" cy="-2" rx="8" ry="9.5" fill="#fff"/><ellipse cx="9" cy="-2" rx="8" ry="9.5" fill="#fff"/><circle cx="-12" cy="-1" r="4.4" fill="#1a2ad0"/><circle cx="6" cy="-1" r="4.4" fill="#1a2ad0"/></g><g transform="translate(266 60) scale(.66)"><path d="M-25 8a25 25 0 0 1 50 0v22l-8-7-8 7-9-7-8 7-9-7-8 7z" fill="url(#pcmC)"/><ellipse cx="-9" cy="-2" rx="8" ry="9.5" fill="#fff"/><ellipse cx="9" cy="-2" rx="8" ry="9.5" fill="#fff"/><circle cx="-11" cy="-1" r="4.4" fill="#1a2ad0"/><circle cx="7" cy="-1" r="4.4" fill="#1a2ad0"/></g><g transform="translate(268 128) scale(.6)"><path d="M-25 8a25 25 0 0 1 50 0v22l-8-7-8 7-9-7-8 7-9-7-8 7z" fill="url(#pcmK)"/><ellipse cx="-9" cy="-2" rx="8" ry="9.5" fill="#fff"/><ellipse cx="9" cy="-2" rx="8" ry="9.5" fill="#fff"/><circle cx="-11" cy="-1" r="4.4" fill="#1a2ad0"/><circle cx="7" cy="-1" r="4.4" fill="#1a2ad0"/></g></svg>',
  w: 960, h: 600,
  mount(api) {
    const W = 960, H = 600;
    const MPS = getSession('pac');
    const HOSTMP = !!(MPS && MPS.role === 'host');
    const GUEST = !!(MPS && MPS.role === 'guest');
    const MYID = MPS ? MPS.me : 'you';
    const SIM = !GUEST;

    /* ------------------------------------------------------------- mazes */
    /* # wall  . pellet  o power pellet  - ghost door  space empty
       Every row is 28 wide and every maze 31 tall, so one set of geometry
       serves all three. */
    const MAZES = {
      classic: { name: 'Classic', rows: [
        '############################',
        '#............##............#',
        '#.####.#####.##.#####.####.#',
        '#o####.#####.##.#####.####o#',
        '#.####.#####.##.#####.####.#',
        '#..........................#',
        '#.####.##.########.##.####.#',
        '#.####.##.########.##.####.#',
        '#......##....##....##......#',
        '######.##### ## #####.######',
        '     #.##### ## #####.#     ',
        '     #.##          ##.#     ',
        '     #.## ###--### ##.#     ',
        '######.## #      # ##.######',
        '      .   #      #   .      ',
        '######.## #      # ##.######',
        '     #.## ######## ##.#     ',
        '     #.##          ##.#     ',
        '     #.## ######## ##.#     ',
        '######.## ######## ##.######',
        '#............##............#',
        '#.####.#####.##.#####.####.#',
        '#.####.#####.##.#####.####.#',
        '#o..##.......  .......##..o#',
        '###.##.##.########.##.##.###',
        '###.##.##.########.##.##.###',
        '#......##....##....##......#',
        '#.##########.##.##########.#',
        '#.##########.##.##########.#',
        '#..........................#',
        '############################'
      ] },
      cage: { name: 'The Cage', rows: [
        '############################',
        '#o...........##...........o#',
        '#.##.#######.##.#######.##.#',
        '#.##.#######.##.#######.##.#',
        '#..........................#',
        '#.##.##.###########.##.##..#',
        '#....##......##......##....#',
        '####.#######.##.#######.####',
        '   #.##            ##.#     ',
        '   #.## ####--#### ##.#     ',
        '####.## #        # ##.######',
        '     .  #        #  .       ',
        '####.## #        # ##.######',
        '   #.## ########## ##.#     ',
        '   #.##            ##.#     ',
        '####.############.####.#####',
        '#............##............#',
        '#.####.#####.##.#####.####.#',
        '#o..##.......##.......##..o#',
        '###.##.#####.##.#####.##.###',
        '#......#####.##.#####......#',
        '#.####..............####...#',
        '#.####.###.####.###.####.#.#',
        '#......###.####.###......#.#',
        '#.####.....####.....####.#.#',
        '#.####.###......###.####.#.#',
        '#..........####............#',
        '#.########.####.########.#.#',
        '#.########......########.#.#',
        '#o.......................o.#',
        '############################'
      ] },
      spiral: { name: 'Spiral', rows: [
        '############################',
        '#o........................o#',
        '#.######.##########.######.#',
        '#.#....#............#....#.#',
        '#.#.##.#.#.######.#.#.##.#.#',
        '#...##...#.#....#.#...##...#',
        '####.#####.#.##.#.#####.####',
        '   #.#     #.##.#     #.#   ',
        '   #.#.#####.##.#####.#.#   ',
        '####.#..          ..#.#.####',
        '     ..# ###--### #..  .    ',
        '####.#.# #      # #.#.#.####',
        '   #.#.# #      # #.#.#.#   ',
        '   #.#.# ######## #.#.#.#   ',
        '   #.#.#          #.#.#.#   ',
        '####.#.############.#.#.####',
        '#......#..........#......#.#',
        '#.####.#.########.#.####.#.#',
        '#.#..#...#......#...#..#.#.#',
        '#.#.###########.###.##.#.#.#',
        '#.#.............###....#...#',
        '#.#####.#######.###.####.#.#',
        '#o....#.#.....#.....#....#o#',
        '#####.#.#.###.#######.####.#',
        '#.....#...###.........#....#',
        '#.#########.#########.#.####',
        '#...........#.......#.#....#',
        '###########.#.#####.#.####.#',
        '#...........#.....#........#',
        '#o#########.#######.######o#',
        '############################'
      ] }
    };

    const COLS = 28, ROWS = 31, TS = 17;
    const MW = COLS * TS, MH = ROWS * TS;
    const MX = Math.round((W - MW) / 2), MY = 36;
    /* the maze is tall and narrow, so the frame is a three-column layout and
       the space either side carries the readout rather than sitting empty */
    const LPX = 30, RPX = MX + MW + 30;

    const cfg = (id, def) => (MPS ? ((MPS.cfg && MPS.cfg[id]) || def) : (api.opt(id) || def));
    /* One maze and one ghost speed. Both used to be settings; the maze list
       meant an online room could be looking at three different layouts before
       anyone agreed on one, and a ghost-speed dial is a difficulty slider on a
       game whose difficulty is supposed to be the other players. */
    const mazeKey = 'classic';
    /* Infection needs somebody to run from, so it only means anything with two
       or more people in the room; on your own it plays the classic hunt. */
    const INFECT = cfg('mode', 'classic') === 'infect' && !!MPS && (MPS.players || []).length >= 2;
    /* A ghost is slower than Pac-Man, which is right when there are four of
       them working a maze between them. One hunter against a field of runners
       who are faster than it will never touch anybody - the round simply never
       ends. So the hunt is quicker than the hunted, and the runners' answer is
       the energizer rather than a foot race. */
    const GBASE = INFECT ? 80 : 68;
    const AIFILL = cfg('fill', 'on') !== 'off';

    /* ------------------------------------------------------------- state */
    const WALL = 1, DOOR = 2;
    let grid, pellets, pelletsLeft, powerAt;
    let phase, phaseT, score, lives, level, best = 0;
    let pacs = [], ghosts = [], roles = [], msg = '';
    let frightT = 0, chainEaten = 0, waveI = 0, waveT = 0, tunnelRows = [];
    let ended = false, dieT = 0, winT = 0;
    let popups = [];
    /* Bodies come and go mid-round now - a caught Pac-Man turns into a ghost -
       so array position is no longer a stable name for anybody. Every body
       carries a number the host minted, and that is what a guest matches on. */
    let uidSeq = 0;
    let fruit = null, eaten = 0, fruitsShown = 0, huntT = 0;
    /* the waka alternates every pellet, which is what makes a run of them
       warble instead of ticking */
    let chompAlt = false;
    /* Declared up here with the rest of the state, not down in the painting
       section: everything below the `return` never runs, so a `let` there stays
       in its dead zone and throws on the first frame that touches it. */
    let mazeCv = null, mazeFor = '';
    /* Guests buffer snapshots and render everyone else ~100ms in the past,
       interpolated between two packets that actually arrived. Snapping straight
       to the newest packet is what made this stutter: at fifteen packets a
       second it is fifteen teleports a second, however fast the connection is. */
    const nb = MPS ? NetBuf(140) : null;
    let lastSentDir = -1, lastSentAt = 0, lastRoleSig = '', lastSnapRef = null;

    const DIRS = [[1,0],[0,-1],[-1,0],[0,1]];   // right, up, left, down
    const OPP = [2,3,0,1];

    function loadMaze(key) {
      const m = MAZES[key] || MAZES.classic;
      grid = []; pellets = []; pelletsLeft = 0; tunnelRows = [];
      for (let y = 0; y < ROWS; y++) {
        const row = (m.rows[y] || '').padEnd(COLS, ' ');
        const g = [], p = [];
        for (let x = 0; x < COLS; x++) {
          const c = row[x];
          g.push(c === '#' ? WALL : c === '-' ? DOOR : 0);
          if (c === '.') { p.push(1); pelletsLeft++; }
          else if (c === 'o') { p.push(2); pelletsLeft++; }
          else p.push(0);
        }
        grid.push(g); pellets.push(p);
        if (g[0] !== WALL && g[COLS - 1] !== WALL) tunnelRows.push(y);
      }
      /* Where the house and the start are is read out of the maze rather than
         hard-coded, or two of the three mazes would spawn everyone inside a
         wall. The door tiles give the house; the start is the open tile
         nearest the bottom-centre. */
      let dx = -1, dy = -1;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
        if (grid[y][x] === DOOR) { dx = dx < 0 ? x : (x + dx) / 2; dy = y; }
      HOUSE.x = dx < 0 ? 13 : Math.round(dx); HOUSE.y = dy < 0 ? 12 : dy;

      let bs = 1e9;
      SPAWN.x = 13; SPAWN.y = ROWS - 2;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (grid[y][x] !== 0) continue;
        const d = Math.abs(x - COLS / 2) * 1.4 + Math.abs(y - (HOUSE.y + 11));
        if (d < bs) { bs = d; SPAWN.x = x; SPAWN.y = y; }
      }
    }
    const HOUSE = { x: 13, y: 12 }, SPAWN = { x: 13, y: 23 };

    const inB = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS;
    const solidFor = (x, y, isGhost) => {
      if (!inB(x, y)) return true;
      const c = grid[y][x];
      if (c === WALL) return true;
      if (c === DOOR) return !isGhost;
      return false;
    };
    const wrapX = x => (x + COLS) % COLS;

    /* --------------------------------------------------------- entities */
    function mkPac(px, py, id, name) {
      return { kind: 'pac', uid: ++uidSeq, tx: px, ty: py, x: px * TS + TS / 2, y: py * TS + TS / 2,
               dir: 2, want: 2, wantT: 0, spd: 76, mouth: 0, dead: 0,
               id: id || null, name: name || 'Pac-Man' };
    }
    function mkGhost(i, name, id, spawnHouse) {
      const off = [0, -1, 1, -2][i % 4];
      const spot = [HOUSE.x + off, HOUSE.y + 2];
      return { kind: 'ghost', uid: ++uidSeq, gi: i, name, id: id || null,
               tx: spot[0], ty: spot[1], x: spot[0] * TS + TS / 2, y: spot[1] * TS + TS / 2,
               dir: 1, want: 1, wantT: 0, spd: GBASE, mode: 'house',
               houseT: spawnHouse === undefined ? .6 + i * 1.3 : spawnHouse,
               eaten: false, bob: Math.random() * 6 };
    }
    /* The arcade's own four. The old set had been nudged toward pastels and it
       read as "some ghosts"; these are the colours people actually picture. */
    const GCOL = ['#ff1f14', '#ffb8ff', '#00ffff', '#ffb852'];
    const GNAME = ['Blinky', 'Pinky', 'Inky', 'Clyde'];
    const EYE_BLUE = '#2121de';
    const FRIGHT_BLUE = '#2121de';
    const PELLET_COL = '#ffb8ae';   // the cabinet's peach, not white
    const PAC_YEL = '#ffe600';
    /* the arcade's bonus ladder, in the order it hands them out */
    /* `col` is only for the 3D board, where a bonus is a lit solid rather than
       a drawn sprite and needs one colour to be read at a glance */
    const FRUITS = [
      { n: 'Cherry',     v: 100,  col: '#e8242e' }, { n: 'Strawberry', v: 300,  col: '#f0344a' },
      { n: 'Orange',     v: 500,  col: '#ff9b24' }, { n: 'Apple',      v: 700,  col: '#e0202c' },
      { n: 'Melon',      v: 1000, col: '#6fe05a' }, { n: 'Galaxian',   v: 2000, col: '#4fc8ff' },
      { n: 'Bell',       v: 3000, col: '#ffd84a' }, { n: 'Key',        v: 5000, col: '#9fd8ff' }
    ];
    /* Blinky goes straight at you, Pinky cuts you off, Inky reads off Blinky
       and Clyde loses his nerve up close. Naming that on screen is the
       difference between four identical chasers and four characters. */
    const GHOST_HINT = ['goes straight at you', 'cuts you off', 'flanks with Blinky', 'backs off up close'];
    const CORNER = [[26, 1], [1, 1], [26, 29], [1, 29]];

    /* --------------------------------------------------------- the round */
    function assignRoles() {
      roles = [];
      if (MPS) {
        const list = (MPS.players || []).slice();
        /* the draw is off the party seed, so everyone shows the same screen */
        const rnd = mulberry((MPS.seed || 1) + level * 7919);
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          const t = list[i]; list[i] = list[j]; list[j] = t;
        }
        if (INFECT) {
          /* one hunter, and everybody else is dinner - which is the whole
             inversion the mode exists for */
          roles.push({ id: list[0].id, name: list[0].name, role: 'ghost', gi: 0 });
          for (let i = 1; i < list.length; i++)
            roles.push({ id: list[i].id, name: list[i].name, role: 'pac' });
        } else {
          roles.push({ id: list[0].id, name: list[0].name, role: 'pac' });
          for (let i = 1; i < list.length && i <= 4; i++)
            roles.push({ id: list[i].id, name: list[i].name, role: 'ghost', gi: i - 1 });
        }
      } else {
        roles.push({ id: MYID, name: 'You', role: 'pac' });
      }
    }
    const myRole = () => {
      const r = roles.find(r2 => r2.id === MYID);
      return r ? r.role : 'pac';
    };
    /* what this client is actually driving right now, which in Infection is not
       what it was handed at the start of the round */
    const myKind = () => {
      if (pacs.some(p => p.id === MYID)) return 'pac';
      if (ghosts.some(g => g.id === MYID)) return 'ghost';
      return myRole();
    };

    /* the spread of spawn tiles Pac-Men start on, so several do not stack up */
    const PAC_SPOTS = [[0, 0], [-3, 0], [3, 0], [-6, 0], [6, 0], [0, -3]];
    function resetActors(fresh) {
      pacs = [];
      const pr = roles.filter(r => r.role === 'pac');
      if (!pr.length) pacs.push(mkPac(SPAWN.x, SPAWN.y, null, 'Pac-Man'));
      pr.forEach((r, i) => {
        const o = PAC_SPOTS[i % PAC_SPOTS.length];
        let sx = clamp(SPAWN.x + o[0], 1, COLS - 2), sy = clamp(SPAWN.y + o[1], 1, ROWS - 2);
        if (solidFor(sx, sy, false)) { sx = SPAWN.x; sy = SPAWN.y; }
        pacs.push(mkPac(sx, sy, r.id, r.name));
      });
      ghosts = [];
      const gr = roles.filter(r => r.role === 'ghost');
      if (INFECT) {
        /* exactly one hunter to begin with; the rest of the pack is recruited
           the hard way */
        gr.forEach((r, i) => ghosts.push(mkGhost(i, GNAME[i % 4], r.id, .8)));
      } else {
        for (let i = 0; i < 4; i++) {
          const held = gr.find(r => r.gi === i);
          /* with the fill turned off, a ghost nobody took simply is not there -
             four minds or one, but never three people and a bot they did not
             ask for */
          if (!held && !AIFILL && MPS) continue;
          ghosts.push(mkGhost(i, held ? held.name : GNAME[i], held ? held.id : null));
        }
        if (!ghosts.length) ghosts.push(mkGhost(0, GNAME[0], null));
      }
      frightT = 0; chainEaten = 0; waveI = 0; waveT = 0;
      /* The dot counter belongs to the LEVEL, not to the life. Clearing it on
         every death meant a player who died twice never saw a bonus at all -
         the count restarted from nothing each time and never reached seventy. */
      if (fresh) { fruit = null; eaten = 0; fruitsShown = 0; huntT = 0; }
    }
    function newRound(full) {
      if (full) { loadMaze(mazeKey); score = 0; lives = 3; level = 1; }
      assignRoles();
      resetActors(true);
      phase = MPS ? 'roles' : 'ready';
      phaseT = MPS ? 4.2 : 1.9;
      msg = '';
    }
    newRound(true);

    /* ------------------------------------------------------------ moving */
    const atCenter = e => Math.abs(e.x - (e.tx * TS + TS / 2)) < 1.2 && Math.abs(e.y - (e.ty * TS + TS / 2)) < 1.2;
    function tryDir(e, d, isGhost) {
      const [dx, dy] = DIRS[d];
      return !solidFor(wrapX(e.tx + dx), e.ty + dy, isGhost);
    }
    function moveEnt(e, dt, isGhost, speed) {
      const sp = speed === undefined ? e.spd : speed;
      let left = sp * dt;
      while (left > 0) {
        const cx = e.tx * TS + TS / 2, cy = e.ty * TS + TS / 2;
        const toC = Math.abs(e.x - cx) + Math.abs(e.y - cy);
        if (toC < .01) {
          /* at a junction: take the wanted turn if it is open, else carry on */
          if (e.want !== e.dir && tryDir(e, e.want, isGhost)) e.dir = e.want;
          if (!tryDir(e, e.dir, isGhost)) { e.x = cx; e.y = cy; return; }
          const [dx, dy] = DIRS[e.dir];
          e.tx = wrapX(e.tx + dx); e.ty = e.ty + dy;
          /* the tunnel: stepping off one edge puts you on the other */
          if (e.ty < 0) e.ty = 0; if (e.ty >= ROWS) e.ty = ROWS - 1;
          const nx = e.tx * TS + TS / 2, ny = e.ty * TS + TS / 2;
          /* when wrapping, jump the sprite across rather than sliding it */
          if (Math.abs(nx - e.x) > TS * 2) e.x = nx - DIRS[e.dir][0] * TS;
          continue;
        }
        const step = Math.min(left, toC);
        const ux = Math.sign(cx - e.x), uy = Math.sign(cy - e.y);
        e.x += ux * Math.min(step, Math.abs(cx - e.x));
        e.y += uy * Math.min(step, Math.abs(cy - e.y));
        left -= step;
      }
    }

    /* ---------------------------------------------------------- ghost AI */
    const WAVES = [7, 20, 7, 20, 5, 20, 5, 1e9];
    const scatterNow = () => (waveI % 2) === 0;
    /* With several Pac-Men on the board every ghost hunts the nearest one, so
       the four personalities still mean what they meant - they are just aimed
       at whoever is closest instead of at the only one there was. */
    function nearestPac(g) {
      let best = null, bs = 1e9;
      for (const p of pacs) {
        if (p.dead > 0) continue;
        const d = (p.tx - g.tx) * (p.tx - g.tx) + (p.ty - g.ty) * (p.ty - g.ty);
        if (d < bs) { bs = d; best = p; }
      }
      return best || pacs[0] || null;
    }
    function ghostTarget(g) {
      if (g.eaten) return { x: HOUSE.x, y: HOUSE.y + 2 };
      const gi = g.gi % 4;
      if (scatterNow()) return { x: CORNER[gi][0], y: CORNER[gi][1] };
      const pac = nearestPac(g);
      if (!pac) return { x: CORNER[gi][0], y: CORNER[gi][1] };
      const pd = DIRS[pac.dir];
      if (gi === 0) return { x: pac.tx, y: pac.ty };
      if (gi === 1) return { x: pac.tx + pd[0] * 4, y: pac.ty + pd[1] * 4 };
      if (gi === 2) {
        const b = ghosts[0] || g;
        const ax = pac.tx + pd[0] * 2, ay = pac.ty + pd[1] * 2;
        return { x: ax + (ax - b.tx), y: ay + (ay - b.ty) };
      }
      const d = Math.hypot(g.tx - pac.tx, g.ty - pac.ty);
      return d > 8 ? { x: pac.tx, y: pac.ty } : { x: CORNER[3][0], y: CORNER[3][1] };
    }
    function ghostChoose(g) {
      /* a ghost decides only at a junction, and may not turn back on itself -
         the rule the whole original chase behaviour rests on */
      const opts = [];
      for (let d = 0; d < 4; d++) {
        if (d === OPP[g.dir]) continue;
        if (!tryDir(g, d, true)) continue;
        opts.push(d);
      }
      if (!opts.length) { g.want = OPP[g.dir]; return; }
      if (g.mode === 'fright') { g.want = opts[(Math.random() * opts.length) | 0]; return; }
      const t = ghostTarget(g);
      let bd = opts[0], bs = 1e9;
      for (const d of opts) {
        const nx = wrapX(g.tx + DIRS[d][0]), ny = g.ty + DIRS[d][1];
        const s = (nx - t.x) * (nx - t.x) + (ny - t.y) * (ny - t.y);
        if (s < bs) { bs = s; bd = d; }
      }
      g.want = bd;
    }
    function stepGhost(g, dt) {
      if (g.mode === 'house') {
        g.houseT -= dt;
        g.y += Math.sin(performance.now() / 260 + g.bob) * 12 * dt;
        if (g.houseT <= 0) {
          g.mode = 'out'; g.tx = HOUSE.x; g.ty = HOUSE.y;
          g.x = g.tx * TS + TS / 2; g.y = g.ty * TS + TS / 2; g.dir = 1;
          if (!g.id) g.want = 1;   // a person's held direction survives the door
        }
        return;
      }
      const human = !!g.id;
      let sp = g.spd;
      /* and it keeps getting quicker, so a last survivor cannot simply run
         rings around the maze until everyone gets bored */
      if (INFECT) sp *= 1 + Math.min(.22, huntT / 420);
      if (g.eaten) sp *= 2.1;
      else if (g.mode === 'fright') sp *= .58;
      const wasCenter = atCenter(g);
      /* The AI drives a ghost nobody is holding, and walks the eyes home
         after one is eaten. It must never take over a ghost a person is
         steering: fright mode picks a RANDOM turn at every junction, so
         running it over a human ghost tore the controls out of their hands for
         the whole scare. And a human's want is never reset to their current
         direction - it is a standing request that the guest re-asserts from
         the keyboard every frame, so clearing it here left the host driving a
         direction the player had stopped asking for, with no way to say so. */
      if (!human || g.eaten) { if (wasCenter) ghostChoose(g); }
      moveEnt(g, dt, true, sp);
      if (g.eaten && Math.abs(g.tx - HOUSE.x) < 1 && Math.abs(g.ty - (HOUSE.y + 2)) < 1) {
        g.eaten = false; g.mode = 'house'; g.houseT = .9;
        Sound.ghostHome();
      }
    }

    /* ------------------------------------------------------------ eating */
    /* the arcade drops a bonus after the 70th and the 170th dot, and it sits
       under the house for about nine seconds before giving up on you */
    const FRUIT_AT = [70, 170];
    function maybeFruit() {
      if (fruitsShown >= FRUIT_AT.length || fruit) return;
      if (eaten < FRUIT_AT[fruitsShown]) return;
      fruitsShown++;
      /* The arcade puts it between the house and where Pac-Man starts. Rather
         than guess a row - which lands inside the house on one of these three
         mazes - it goes on the start tile itself: open in every maze, reachable
         by definition, and on the route everyone is already running. */
      fruit = { tx: SPAWN.x, ty: SPAWN.y, kind: Math.min(level - 1, FRUITS.length - 1), t: 9.5 };
    }
    function eatAt(pac) {
      const tx = pac.tx, ty = pac.ty;
      if (fruit && fruit.tx === tx && fruit.ty === ty) {
        const f = FRUITS[fruit.kind];
        score += f.v;
        popups.push({ x: fruit.tx * TS + TS / 2, y: fruit.ty * TS + TS / 2, t: 1.4, s: String(f.v), c: '#ff9ec4' });
        fruit = null;
        Sound.fruit();
      }
      const p = pellets[ty][tx];
      if (!p) return 0;
      pellets[ty][tx] = 0; pelletsLeft--; eaten++;
      maybeFruit();
      if (p === 2) {
        frightT = 7; chainEaten = 0;
        for (const g of ghosts) if (!g.eaten && g.mode !== 'house') { g.mode = 'fright'; g.want = OPP[g.dir]; }
        score += 50; Sound.energizer();
      } else { score += 10; chompAlt = !chompAlt; Sound.chomp(chompAlt); }
      return p;
    }
    function pacDies(pac) {
      if (pac.dead > 0) return;
      pac.dead = 1;
      dieT = 1.9;
      if (pac.id === MYID || !INFECT) Sound.pacDeath();
      else Sound.pacTurn();
      api.fx.shake(3);
    }
    /* Infection: a caught Pac-Man does not lose a life, they change sides. The
       body is swapped for a ghost with the same player on it, which is why
       every body carries a uid rather than being known by its slot. */
    function convert(pac) {
      const i = pacs.indexOf(pac);
      if (i >= 0) pacs.splice(i, 1);
      const gi = ghosts.length % 4;
      const g = mkGhost(gi, pac.name, pac.id, 1.4);
      ghosts.push(g);
      popups.push({ x: pac.x, y: pac.y, t: 1.4, s: 'TURNED', c: '#ff6b7a' });
    }
    function eatGhost(g) {
      g.eaten = true; g.mode = 'out';
      chainEaten++;
      const v = 200 * Math.pow(2, Math.min(3, chainEaten - 1));
      score += v;
      popups.push({ x: g.x, y: g.y, t: 1, s: String(v) });
      Sound.eatGhost(chainEaten - 1);
    }

    /* ---------------------------------------------------------- the wire */
    let sendT = 0, fullT = 0;
    function packPellets() {
      let s = '';
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) s += String(pellets[y][x]);
      return s;
    }
    const pidOf = id => {
      if (!id || !MPS) return -1;
      const l = MPS.players || [];
      for (let i = 0; i < l.length; i++) if (l[i].id === id) return i;
      return -1;
    };
    const playerAt = i => (MPS && (MPS.players || [])[i]) || null;
    function snap(full) {
      const o = {
        ph: phase, pt: +phaseT.toFixed(2), sc: score, lv: lives, le: level,
        fr: +frightT.toFixed(2), wi: waveI, pl: pelletsLeft,
        P: pacs.map(p => [p.uid, Math.round(p.x), Math.round(p.y), p.tx, p.ty, p.dir,
                          +p.dead.toFixed(2), pidOf(p.id)]),
        G: ghosts.map(g => [g.uid, Math.round(g.x), Math.round(g.y), g.tx, g.ty, g.dir,
                            g.mode === 'house' ? 0 : g.mode === 'fright' ? 2 : 1,
                            g.eaten ? 1 : 0, g.gi, pidOf(g.id)]),
        F: fruit ? [fruit.tx, fruit.ty, fruit.kind, +fruit.t.toFixed(1)] : 0
      };
      /* the roster only changes between levels, so it does not belong in every
         packet - it was the largest thing in there and never varied */
      const sig = roles.map(r => r.id + r.role + r.gi).join(',');
      if (full || sig !== lastRoleSig) { o.R = roles; lastRoleSig = sig; }
      if (full) o.PEL = packPellets();
      return o;
    }
    /* One body, positioned from two snapshots that straddle render time. The
       player's own body is exempt: it is predicted locally and only pulled back
       if it has drifted more than a couple of tiles from the host's view. */
    function placeEnt(e, a, b, f, isMine, o) {
      /* rows gained a uid at the front, so everything after it shifted by one;
         `o` is that offset and keeps this function honest about which is which */
      a = a.slice(o); b = b.slice(o);
      if (isMine) {
        /* The host's view of you is always a little behind: it is the last
           packet, and the packet crossed a network. Correcting toward it every
           frame drags you backwards forever, which is the rubber band. So
           inside a tile or two, do nothing - that gap is just latency. Past
           that it is real divergence: take the host's tile and slide into it.
           A hard jump is kept for a genuine reset, like a respawn. */
        const off = Math.abs(b[2] - e.tx) + Math.abs(b[3] - e.ty);
        if (off > 4) { e.tx = b[2]; e.ty = b[3]; e.x = b[0]; e.y = b[1]; e.dir = b[4]; return; }
        if (off >= 2) {
          e.tx = b[2]; e.ty = b[3]; e.dir = b[4];
          const dx = b[0] - e.x, dy = b[1] - e.y;
          if (Math.abs(dx) < TS * 4) e.x += dx * .25;
          if (Math.abs(dy) < TS * 4) e.y += dy * .25;
        }
        return;
      }
      /* the tunnel wraps, and lerping across the seam would fling the body
         back across the whole maze */
      const jump = Math.abs(b[0] - a[0]) > TS * 4;
      e.x = jump ? b[0] : lerp(a[0], b[0], f);
      e.y = jump ? b[1] : lerp(a[1], b[1], f);
      e.tx = b[2]; e.ty = b[3]; e.dir = b[4];
    }
    /* Rebuild a list of bodies to match the host's, keeping the objects we
       already have so interpolation is not restarted every packet. Matching on
       uid rather than slot is what lets a Pac-Man become a ghost mid-round
       without every other body shuffling under the interpolator. */
    function syncList(cur, rows, make) {
      const byUid = new Map();
      for (const e of cur) byUid.set(e.uid, e);
      const out = [];
      for (const row of rows) {
        let e = byUid.get(row[0]);
        if (!e) { e = make(row); e.uid = row[0]; }
        out.push(e);
      }
      return out;
    }
    const rowByUid = (rows, uid) => {
      if (!rows) return null;
      for (const r of rows) if (r[0] === uid) return r;
      return null;
    };
    function applyInterp(a, b, f) {
      if (!b || !b.P) return;
      if (!a || !a.P) a = b;
      /* A guest is told what happened rather than causing it, so the sounds
         have to be inferred from what changed. */
      const wasPhase = phase, wasScore = score, wasPacs = pacs.length;
      const gain = b.sc - wasScore;
      if (b.ph === 'ready' && wasPhase !== 'ready') Sound.pacReady();
      if (gain >= 200) Sound.eatGhost(0);
      else if (gain === 50) Sound.energizer();
      else if (gain >= 100) Sound.fruit();
      else if (gain > 0) { chompAlt = !chompAlt; Sound.chomp(chompAlt); }

      phase = b.ph; phaseT = b.pt; score = b.sc; lives = b.lv; level = b.le;
      frightT = b.fr; waveI = b.wi; pelletsLeft = b.pl;
      if (b.R) roles = b.R;
      fruit = b.F ? { tx: b.F[0], ty: b.F[1], kind: b.F[2], t: b.F[3] } : null;

      pacs = syncList(pacs, b.P, row => {
        const pl = playerAt(row[7]);
        return mkPac(row[3], row[4], pl && pl.id, pl ? pl.name : 'Pac-Man');
      });
      ghosts = syncList(ghosts, b.G, row => {
        const pl = playerAt(row[9]);
        return mkGhost(row[8], pl ? pl.name : GNAME[row[8] % 4], pl && pl.id, 9);
      });
      if (INFECT && pacs.length < wasPacs && phase === 'play') Sound.pacTurn();

      /* Exempt from interpolation only the body this client is really
         predicting. Between rounds, in the house, or with the eyes heading
         home, the host owns it and it interpolates like anyone else. */
      const mine = phase === 'play' ? myEntity() : null;
      pacs.forEach((p, i) => {
        const bp = b.P[i]; if (!bp) return;
        placeEnt(p, rowByUid(a.P, p.uid) || bp, bp, f, mine === p && bp[6] <= 0, 1);
        p.dead = bp[6];
        const pl = playerAt(bp[7]);
        p.id = pl ? pl.id : null; p.name = pl ? pl.name : 'Pac-Man';
      });
      ghosts.forEach((g, i) => {
        const bg = b.G[i]; if (!bg) return;
        placeEnt(g, rowByUid(a.G, g.uid) || bg, bg, f, mine === g && bg[6] !== 0 && !bg[7], 1);
        g.mode = bg[6] === 0 ? 'house' : bg[6] === 2 ? 'fright' : 'out';
        g.eaten = !!bg[7];
        g.gi = bg[8];
        const pl = playerAt(bg[9]);
        g.id = pl ? pl.id : null; g.name = pl ? pl.name : GNAME[g.gi % 4];
      });
      if (b.PEL && b.PEL.length === ROWS * COLS) {
        let k = 0, left = 0;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const v = +b.PEL[k++]; pellets[y][x] = v; if (v) left++;
        }
        pelletsLeft = left;
      }
    }

    /* ------------------------------------------------------------- input */
    /* A turn is remembered for a moment and then forgotten. The arcade does the
       same: ask for left a beat before the corner and it takes it. But it must
       expire, or a key you let go of two corridors back steers you down the
       first opening it finds long after you stopped asking - which reads as the
       game deciding to go its own way. A held key re-arms this every frame, so
       only a released one ever runs out. */
    const WANT_HOLD = .42;
    function askDir(e, d) { if (e) { e.want = d; e.wantT = WANT_HOLD; } }
    function decayWant(e, dt) {
      if (!e || e.want === e.dir) return;
      e.wantT -= dt;
      if (e.wantT <= 0) e.want = e.dir;
    }

    /* Which way the player is asking for. A fixed priority order was wrong:
       roll from right onto down - the natural way to take a corner, with both
       keys held for an instant - and the older, higher-priority key won, so you
       sailed straight past the turn. The NEWEST press is what they meant. */
    const DKEYS = [['ArrowRight', 'KeyD'], ['ArrowUp', 'KeyW'], ['ArrowLeft', 'KeyA'], ['ArrowDown', 'KeyS']];
    const dHeld = [false, false, false, false];
    let dPick = -1;
    function readDir() {
      const I = api.input;
      let fresh = -1, anyDown = -1;
      for (let d = 0; d < 4; d++) {
        const now = !!(I.down(DKEYS[d][0]) || I.down(DKEYS[d][1]));
        if (now && !dHeld[d]) fresh = d;
        if (now) anyDown = d;
        dHeld[d] = now;
      }
      if (fresh >= 0) dPick = fresh;                     // just pressed: that one
      else if (dPick < 0 || !dHeld[dPick]) dPick = anyDown;   // let go: fall back
      return dPick;
    }
    /* whichever body this player is actually driving */
    function myEntity() {
      return pacs.find(p => p.id === MYID) || ghosts.find(g => g.id === MYID) || null;
    }
    function applyMyInput() {
      const d = readDir();
      /* letting go clears the dedup, so pressing the same way again resends */
      if (d < 0) { lastSentDir = -1; return; }
      if (GUEST) {
        /* On every change, then a slow heartbeat while the key is held. Sixty
           packets a second for a held key buries the queue; but sending once
           and trusting it meant a single dropped or ignored packet left the
           host steering your ghost somewhere you had stopped asking for, and
           nothing short of pressing a different direction could correct it.
           Seven a second costs nothing and makes the channel self-healing. */
        const now = performance.now();
        if (d !== lastSentDir || now - lastSentAt > 140) {
          MPS.cmd({ c: 'd', d }); lastSentDir = d; lastSentAt = now;
        }
        askDir(myEntity(), d);             // and turn immediately, locally
        return;
      }
      askDir(myEntity(), d);
    }
    /* A guest drives its own body itself and is only corrected when it has
       genuinely drifted. Waiting for the round trip before you turn a corner
       is what makes a maze game feel broken. */
    function predictLocal(dt) {
      const mine = myEntity();
      if (!mine || phase !== 'play') return;
      decayWant(mine, dt);
      if (mine.kind === 'pac') {
        if (mine.dead > 0) return;
        moveEnt(mine, dt, false);
        mine.mouth += dt * 11;
      } else {
        /* in the house, or eyes walking home: the host is driving, so follow
           it rather than predicting against it */
        if (mine.mode === 'house' || mine.eaten) return;
        moveEnt(mine, dt, true, mine.mode === 'fright' ? mine.spd * .58 : mine.spd);
      }
    }

    /* The arcade never goes quiet. Underneath everything there is a slow warble
       that climbs as the maze empties, and while an energizer is burning it is
       replaced by the fast one. Both are driven a step at a time from here
       rather than free-running, so they stay in step with the round - and a
       guest runs the same code off the numbers in the snapshot, which is why
       the two screens sound the same. */
    let sirenT = 0, sirenI = 0, frightI = 0;
    function siren(dt) {
      sirenT -= dt;
      if (sirenT > 0) return;
      if (frightT > 0) { sirenT = .085; Sound.frightStep(frightI++); }
      else {
        frightI = 0;
        const total = Math.max(1, pelletsLeft + eaten);
        sirenT = .145;
        Sound.sirenStep(sirenI++, clamp(1 - pelletsLeft / total, 0, 1));
      }
    }

    function finish(win) {
      if (ended) return;
      ended = true;
      const mine = myKind();
      let title, message;
      if (INFECT) {
        /* in Infection "win" means the Pac-Men held out, so what it means to
           you depends on which side you were standing on when it ended */
        const survived = mine === 'pac';
        win = win ? survived : !survived;
        title = survived ? (win ? 'Never caught' : 'Turned') : (win ? 'All of them' : 'One got away');
        message = survived
          ? (win ? 'You outran the whole pack to the last pellet.' : 'They got you in the end.')
          : (win ? 'Every last Pac-Man joined the hunt.' : 'The board was cleared before you could close it.');
      } else {
        title = win ? 'Maze cleared' : (mine === 'pac' ? 'Caught' : 'Pac-Man got away');
        message = mine === 'pac'
          ? (win ? 'Every pellet, and you kept your nerve.' : 'The ghosts closed you down.')
          : (win ? 'Pac-Man cleared the board.' : 'Cornered him.');
      }
      const res = {
        score, win: !!win, title, message,
        stats: INFECT
          ? [ { label: 'Held out', value: Math.round(huntT) + 's' },
              { label: 'Pellets left', value: pelletsLeft },
              { label: 'Survivors', value: pacs.length },
              { label: 'Maze', value: (MAZES[mazeKey] || MAZES.classic).name } ]
          : [ { label: 'Level', value: level },
              { label: 'Pellets left', value: pelletsLeft },
              { label: 'Maze', value: (MAZES[mazeKey] || MAZES.classic).name } ]
      };
      if (HOSTMP) MPS.send('over', res);
      api.gameOver(res);
    }

    /* ---- the front page ----
       Opened from the hub, Pac-Man starts the way the cabinet does when nobody
       has put a coin in: the score line along the top, the name, the four
       ghosts introduced one at a time with their nicknames, what a pellet is
       worth, and the chase along the bottom in which Pac-Man turns the tables
       at the power pellet. The choices sit in a box drawn like the maze's own
       walls. Play sends a Pac-Man as tall as the screen across it, eating the
       menu and leaving the maze behind him with READY! on it. */
    const FK = FrontKit(api, {
      online: !!MPS, mp: true, outTime: .75,
      goSound() { Sound.pacReady(); },
      onStart() { newRound(true); }
    });
    const ROSTER_MENU = [['SHADOW', 'BLINKY'], ['SPEEDY', 'PINKY'], ['BASHFUL', 'INKY'], ['POKEY', 'CLYDE']];
    const PM_MODES = [['classic', 'CLASSIC', 'ONE PAC-MAN,', 'THE REST HUNT'],
                      ['infect', 'INFECTION', 'GET CAUGHT AND', 'YOU HUNT TOO']];
    const PM_BTN = { r: 10, shadow: 'rgba(0,0,0,.5)', edge: 'rgba(255,255,255,.35)', edgeW: 1.5, gloss: false };

    /* ---- the results ----
       The cabinet's own screen: the 1UP and HIGH SCORE line across the top,
       the verdict in the title's blocky letters (red for a loss, the way the
       arcade prints GAME OVER, yellow for a win), and under it the
       intermission — Pac-Man eating along a row of pellets with a ghost on
       his tail, or on a win with a frightened one running from him. The
       numbers sit in boxes walled like the maze. */
    const pxt = (ctx, str, x, y, size, col, align) =>
      Hud.pix(ctx, String(str).toUpperCase(), x, y, Math.max(1.4, size / 7), { align, baseline: 'middle', fill: col });
    const RES = {
      veil(ctx, k) { ctx.fillStyle = 'rgba(0,0,0,' + (.96 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); },
      hero(ctx, cx, top) {
        const R = FK.R, T = FK.rt(), roomy = R.paid.length <= 4;
        const k0 = FK.eo(FK.rs('title', undefined, .3));
        Hud.pix(ctx, '1UP', 150, top - 12, 2.4, { fill: '#ffffff', alpha: k0 * (Math.floor(T * 2.6) % 2 ? .25 : 1) });
        Hud.pix(ctx, String(Math.round(R.score * FK.eo(FK.rs('stat', 0, .9)))), 214, top + 10, 2.4, { align: 'right', fill: '#ffffff', alpha: k0 });
        Hud.pix(ctx, 'HIGH SCORE', cx, top - 12, 2.4, { align: 'center', fill: '#ffffff', alpha: k0 });
        Hud.pix(ctx, String(R.best), cx, top + 10, 2.4, { align: 'center', fill: R.isBest ? PAC_YEL : '#ffffff', alpha: k0 });
        if (R.isBest && Math.floor(T * 3) % 2 === 0) Hud.pix(ctx, 'NEW!', cx + 80, top + 10, 2.4, { fill: '#ff1f14', alpha: k0 });
        const word = String(R.title).toUpperCase().slice(0, 14);
        const G = FK.pixWord('pm-res-' + word + R.win, word, {
          px: word.length > 10 ? 6 : 8, depth: 7, fill: () => R.win ? PAC_YEL : '#ff2b1c', side: () => R.win ? '#d9730b' : '#8f0f08', edgeCol: '#000000'
        });
        FK.drawWord(ctx, G, cx, top + 42, i => {
          const ti = T - .1 - i * .06;
          if (ti <= 0) return { a: 0 };
          let dy = 0, sy = 1;
          if (ti < .3) { const kk = ti / .3; dy = -(1 - kk * kk) * 160; }
          else if (ti - .3 < .18) sy = 1 - Math.sin((ti - .3) / .18 * Math.PI) * .2;
          return { dy, sy, sx: 1 + (1 - sy) * .6 };
        });
        pxt(ctx, R.message, cx, top + 126, 12, '#ffffff', 'center');
        if (!roomy) return 140;
        /* the intermission */
        const ly = top + 170, x0 = cx - 330, x1 = cx + 330, span = x1 - x0;
        const lk = FK.eo(FK.rs('sub', undefined, .5));
        ctx.save(); ctx.globalAlpha *= lk;
        const run = ((T * 150) % (span + 240)) - 120, px = x0 + run;
        ctx.fillStyle = PELLET_COL;
        for (let x = x0; x <= x1; x += 26) if (x > px + 8 || run < 0 && x > x0) { ctx.fillRect(x - 2.5, ly - 2.5, 5, 5); }
        ctx.beginPath(); ctx.rect(x0 - 30, ly - 30, span + 60, 60); ctx.clip();
        ctx.save(); ctx.translate(px, ly); ctx.scale(1.5, 1.5);
        drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: T * 11 });
        ctx.restore();
        ctx.save(); ctx.translate(R.win ? px + 70 : px - 74, ly); ctx.scale(1.5, 1.5);
        drawGhost(ctx, { x: 0, y: 0, gi: 0, dir: 0, mode: R.win ? 'fright' : 'out', eaten: false, id: null });
        ctx.restore();
        ctx.restore();
        return 196;
      },
      stat(ctx, st, x, y, w, h) {
        ctx.fillStyle = 'rgba(8,8,40,.7)'; rr(ctx, x, y, w, h, 10); ctx.fill();
        ctx.strokeStyle = '#2121de'; ctx.lineWidth = 2.5; rr(ctx, x + 1.25, y + 1.25, w - 2.5, h - 2.5, 9); ctx.stroke();
        pxt(ctx, st.label, x + 14, y + h / 2, 11, '#8a90e8', 'left');
        pxt(ctx, String(st.value), x + w - 14, y + h / 2, 15, '#ffffff', 'right');
      },
      card(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(8,8,40,.62)'; rr(ctx, x, y, w, h, 16); ctx.fill();
        mazeBox(ctx, x, y, w, h, '#2121de');
      },
      ls: {
        text: pxt, label: pxt, measure: (ctx, str, size) => Hud.pixWidth(String(str), Math.max(1.4, size / 7)),
        ink: '#ffffff', mute: '#8a90e8', gold: PAC_YEL, rule: 'rgba(33,33,222,.6)', bar: 'rgba(33,33,222,.35)', fill: PAC_YEL,
        rowH: 22, size: 13, lsize: 11, totalSize: 24, totalH: 36, xpH: 40, barH: 8, barR: 0, noteGap: 96
      },
      pad: 24, headH: 46,
      head(ctx, x, y, w) {
        pxt(ctx, 'COINS', x, y + 2, 11, '#8a90e8', 'left');
        pxt(ctx, fmt(FK.purse()), x + w, y + 2, 15, PAC_YEL, 'right');
      },
      button(ctx, key, label, x, y, w, h, primary) {
        FK.button(ctx, key, x, y, w, h, label, PM_BTN, {
          fill: primary ? ['#fff45e', '#f2c200'] : ['rgba(33,33,222,.32)', 'rgba(33,33,222,.18)'],
          draw(c) { Hud.pix(c, label, 0, 1, primary ? 3 : 2.4, { thick: primary, align: 'center', baseline: 'middle', fill: primary ? '#1c1500' : '#ffffff' }); }
        });
      },
      hint(ctx, cx, y) { if (Math.floor(FK.t * 1.6) % 3 !== 2) pxt(ctx, 'PUSH SPACE TO PLAY AGAIN', cx, y, 11, 'rgba(255,255,255,.7)', 'center'); }
    };
    const LANE_Y = 540, LANE_PELLETS = [];
    for (let x = 108; x <= 890; x += 26) LANE_PELLETS.push(x);
    /* the attract chase, run on the render clock */
    let lane = null;
    function laneReset() {
      lane = { ph: 'run', px: 1010, pdir: 2, mouth: 0, fr: 0, freeze: 0, eaten: 0, rest: 0, power: true,
               gh: [0, 1, 2, 3].map(i => ({ x: 1010 + 66 + i * 50, alive: true })),
               got: LANE_PELLETS.map(() => false), pops: [] };
    }
    if (FK.on) laneReset();

    return {
      update(dt) {
        if (ended) return;
        /* on the front page the menu has the keys, and the round waits */
        if (FK.on) { FK.input(api.input); return; }
        for (let i = popups.length - 1; i >= 0; i--) { popups[i].t -= dt * 1.3; if (popups[i].t <= 0) popups.splice(i, 1); }

        if (GUEST) {
          /* Only when a packet has genuinely arrived. Pushing whatever is in
             _snap every frame fills the buffer with four copies of one state
             between packets, and the interpolator then spends most of its time
             blending a state with itself: everyone else freezes, then jumps,
             fourteen times a second. Every other online game here already
             guards this by reference; this one did not, and it was most of why
             a guest's screen looked so much worse than the host's. */
          const sn = MPS._snap;
          if (sn && sn !== lastSnapRef) { lastSnapRef = sn; nb.push(sn); }
          const smp = nb.sample();
          if (smp) applyInterp(smp[0], smp[1], smp[2]);
          if (MPS.hostLeft) { ended = true; api.gameOver({ score, title: 'Host left', message: 'The maze closed.' }); return; }
          /* The host posts the result when the round ends. This used to throw
             those events away, so a guest kept playing a maze that was already
             over and never saw an end card at all - the round just stopped
             meaning anything on their screen. */
          for (const e of MPS._events.splice(0)) {
            if (e[0] === 'o') { ended = true; api.gameOver(e[1]); return; }
          }
          if (phase === 'play') { applyMyInput(); predictLocal(dt); siren(dt); }
          /* the ghosts still bob in the house on a guest's screen */
          for (const g of ghosts) if (g.mode === 'house') g.y += Math.sin(performance.now() / 260 + g.bob) * 12 * dt;
          /* the readout is the host's numbers, but a guest still has to see
             them - without this every player but one plays with a dead score */
          best = Math.max(best, score);
          api.hud({ Score: score, Lives: lives, Level: level });
          return;
        }

        if (MPS) {
          const q = MPS._cmdQ;
          while (q.length) {
            const c = q.shift();
            if (!c || c.c !== 'd') continue;
            /* stored whatever state the body is in - refusing it while a ghost
               sat in the house threw away every turn asked for during the
               countdown and after every respawn, and the guest, having sent it
               once, had no way to learn it had been ignored */
            const who = pacs.find(x => x.id === c.from) || ghosts.find(x => x.id === c.from);
            askDir(who, c.d);
          }
        }

        phaseT -= dt;
        if (phase === 'roles') { if (phaseT <= 0) { phase = 'ready'; phaseT = 1.9; Sound.pacReady(); } }
        else if (phase === 'ready') { if (phaseT <= 0) { phase = 'play'; } }
        else if (phase === 'dead') {
          /* the fold-up animation runs off this, so it has to keep ticking -
             it used to be driven by a clock nobody advanced, which is why the
             death was a Pac-Man sitting perfectly still for two seconds */
          for (const p of pacs) if (p.dead > 0) p.dead += dt;
          if (phaseT <= 0) {
            lives--;
            if (lives <= 0) finish(false);
            else { resetActors(false); phase = 'ready'; phaseT = 1.6; Sound.pacReady(); }
          }
        } else if (phase === 'won') {
          if (phaseT <= 0) {
            if (INFECT) { finish(true); return; }
            level++; loadMaze(mazeKey); assignRoles(); resetActors(true);
            phase = 'ready'; phaseT = 1.8; Sound.pacReady();
          }
        } else if (phase === 'play') {
          applyMyInput();

          waveT += dt;
          if (waveT > WAVES[Math.min(waveI, WAVES.length - 1)]) { waveT = 0; waveI++; for (const g of ghosts) if (g.mode === 'out') g.want = OPP[g.dir]; }
          if (frightT > 0) {
            frightT -= dt;
            if (frightT <= 0) for (const g of ghosts) if (g.mode === 'fright') g.mode = 'out';
          }

          /* only bodies a person holds: an AI ghost's want is chosen fresh at
             every junction and has nothing to expire */
          for (const p of pacs) if (p.id) decayWant(p, dt);
          for (const g of ghosts) if (g.id) decayWant(g, dt);

          for (const p of pacs) {
            if (p.dead > 0) continue;
            moveEnt(p, dt, false);
            p.mouth += dt * 11;
            eatAt(p);
          }
          for (const g of ghosts) stepGhost(g, dt);
          if (fruit) { fruit.t -= dt; if (fruit.t <= 0) fruit = null; }
          huntT += dt;
          siren(dt);

          /* contact, every ghost against every Pac-Man */
          for (const g of ghosts) {
            if (g.mode === 'house' || g.eaten) continue;
            for (const p of pacs) {
              if (p.dead > 0) continue;
              if (Math.hypot(g.x - p.x, g.y - p.y) >= TS * .72) continue;
              if (g.mode === 'fright') { eatGhost(g); break; }
              pacDies(p);
              if (!INFECT) { phase = 'dead'; phaseT = 1.9; }
              break;
            }
          }
          if (INFECT) {
            /* a caught Pac-Man spends the death animation as themselves and
               then joins the other side */
            for (let i = pacs.length - 1; i >= 0; i--) {
              const p = pacs[i];
              if (p.dead <= 0) continue;
              p.dead += dt;
              if (p.dead > 1.5) convert(p);
            }
            if (!pacs.length) { phase = 'over'; phaseT = 1.6; Sound.fail(); }
          }
          if (pelletsLeft <= 0) { phase = 'won'; phaseT = 2.2; Sound.win(); }
        } else if (phase === 'over') {
          if (phaseT <= 0) finish(false);
        }

        if (MPS) {
          sendT -= dt; fullT -= dt;
          if (sendT <= 0) {
            sendT = 1 / 14;
            const full = fullT <= 0;
            if (full) fullT = 1.5;
            MPS.send('snap', snap(full));
          }
        }
        best = Math.max(best, score);
        api.hud({ Score: score, Lives: lives, Level: level });
      },

      render(ctx) {
        FK.frame();
        if (FK.on) { drawMenu(ctx); return; }
        paint(ctx);
        if (FK.R) FK.resultsPage(ctx, W, H, Object.assign(RES, { top: 30 }));
        if (FK.out < 1) {
          /* Play: a Pac-Man taller than the screen eats the menu from left to
             right, and the maze with READY! on it is what he leaves behind */
          const x = -340 + FK.out * (W + 680);
          ctx.save();
          ctx.beginPath(); ctx.rect(x, 0, W - x + 20, H); ctx.clip();
          drawMenu(ctx);
          ctx.restore();
          ctx.save();
          ctx.translate(x, H / 2); ctx.scale(31, 31);
          drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: FK.out * 44 });
          ctx.restore();
        }
      },
      /* Escape on the front page goes back to the hub; in a round it pauses */
      escape: FK.escape,
      /* The GL context has to go back when the round does. A browser only
         allows a handful of live WebGL contexts and quietly kills the oldest
         to make room, so leaking one per game would eventually take out a
         context somebody is still drawing with. */
      destroy() { FK.done(); },
      results(R) { FK.showResults(R); }
    };

    /* ---------------------------------------------------------- painting */
    /* The maze outline: for every wall tile, trace the edges that face a
       corridor. Filled blocks would read as a tile map; this reads as the
       arcade. */
    /* The whole outline is collected into one Path2D first and then stroked
       several times over — wide and dim, then narrower and brighter, then a
       near-white core. That is what turns a flat blue line into something that
       looks lit, and because the result is baked once into an offscreen canvas
       it costs nothing per frame. Stroking tile by tile the way this used to
       could only ever produce one flat pass. */
    function mazePath() {
      const p = new Path2D();
      const IN = 3.0;
      const isW = (x, y) => !inB(x, y) ? false : grid[y][x] === WALL;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (grid[y][x] !== WALL) continue;
        const px = x * TS, py = y * TS;
        const up = isW(x, y - 1), dn = isW(x, y + 1), lf = isW(x - 1, y), rt = isW(x + 1, y);
        if (!up) { p.moveTo(px + (lf ? 0 : IN), py + IN); p.lineTo(px + TS - (rt ? 0 : IN), py + IN); }
        if (!dn) { p.moveTo(px + (lf ? 0 : IN), py + TS - IN); p.lineTo(px + TS - (rt ? 0 : IN), py + TS - IN); }
        if (!lf) { p.moveTo(px + IN, py + (up ? 0 : IN)); p.lineTo(px + IN, py + TS - (dn ? 0 : IN)); }
        if (!rt) { p.moveTo(px + TS - IN, py + (up ? 0 : IN)); p.lineTo(px + TS - IN, py + TS - (dn ? 0 : IN)); }
        /* A concave corner - two walls meeting with the diagonal open - leaves
           a gap between the neighbours' edges, and the arc that closes it is
           centred on the TILE CORNER, not on the inset point. Centring it on
           the inset left every one of these little curves floating three
           pixels away from the lines it was supposed to join. */
        const arc = (cx, cy, a0, a1) => { p.moveTo(cx + Math.cos(a0) * IN, cy + Math.sin(a0) * IN); p.arc(cx, cy, IN, a0, a1); };
        if (up && lf && !isW(x - 1, y - 1)) arc(px, py, 0, Math.PI * .5);
        if (up && rt && !isW(x + 1, y - 1)) arc(px + TS, py, Math.PI * .5, Math.PI);
        if (dn && lf && !isW(x - 1, y + 1)) arc(px, py + TS, Math.PI * 1.5, Math.PI * 2);
        if (dn && rt && !isW(x + 1, y + 1)) arc(px + TS, py + TS, Math.PI, Math.PI * 1.5);
      }
      return p;
    }

    /* Baked once per maze — but baked at DEVICE resolution, which is the whole
       point of the `S` here. The game draws in 960x600 logical units and the
       engine scales that up by `Stage.scale * Stage.dpr`, so a canvas baked at
       logical size gets magnified on its way to the screen and every line in it
       goes soft. Baking at the scale it will actually be shown at, and drawing
       it back at its logical size, puts one texel on one screen pixel. */
    function bakeMaze(S) {
      const key = mazeKey + '|' + MW + 'x' + MH + '@' + S;
      if (mazeCv && mazeFor === key) return mazeCv;
      const c = document.createElement('canvas');
      c.width = Math.ceil(MW * S); c.height = Math.ceil(MH * S);
      const g = c.getContext('2d');
      g.setTransform(S, 0, 0, S, 0, 0);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const path = mazePath();

      /* Flat blue line, the way the cabinet drew it. There was a pair of wide
         additive passes under this for bloom; they were what made the board
         look fogged rather than lit. */
      g.strokeStyle = '#2121de'; g.lineWidth = 3.0; g.stroke(path);

      /* the ghost door */
      g.strokeStyle = '#ffb8d8'; g.lineWidth = 3;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === DOOR) {
        g.beginPath(); g.moveTo(x * TS, y * TS + TS / 2); g.lineTo(x * TS + TS, y * TS + TS / 2); g.stroke();
      }
      mazeCv = c; mazeFor = key;
      return c;
    }

    /* Pac-Man. The arcade cycles three frames - shut, half, wide - and the
       widest is a right angle taken out of the disc. Dying, he keeps opening
       from that same wedge until there is nothing left, facing up, which is the
       one animation everybody can picture. */
    function drawPac(ctx, e) {
      const r = TS * .62;
      const dying = e.dead > 0;
      const k = dying ? clamp((e.dead - 1) / 1.35, 0, 1) : 0;
      const open = dying ? k : (Math.sin(e.mouth) * .5 + .5) * .27;
      const rot = dying ? -Math.PI / 2 : [0, -Math.PI / 2, Math.PI, Math.PI / 2][e.dir];
      if (dying && k >= .995) return;
      ctx.save();
      ctx.translate(e.x, e.y); ctx.rotate(rot);
      /* One flat yellow. He had a floor halo under him and a radial gradient
         across the disc; both were glow, and the wedge reads harder without
         them — which is the whole appeal of the sprite. */
      ctx.fillStyle = PAC_YEL;
      const a = open * Math.PI;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a, TAU - a);
      ctx.closePath();
      ctx.fill();
      /* No eye. The arcade sprite is a bare wedge — the eye belongs to Ms.
         Pac-Man and the later ports, and putting one here read as a mascot
         rather than as the thing from the cabinet. */
      ctx.restore();
    }

    /* The ghost, built the way the sprite is: a dome, straight flanks, and a
       hem of three scallops that shifts by half a scallop every few pixels of
       travel, so the thing shuffles as it moves and stands still when it does.
       That hem is most of what makes a ghost read as a ghost rather than as a
       coloured blob with eyes. */
    /* Body metrics, shared by the outline and the shading so the two cannot
       drift apart. This is a function rather than a handful of consts because
       mount() returns above here — anything declared with const or let below
       that return stays in its dead zone for the life of the game, while a
       function declaration is hoisted and always ready. */
    function ghostGeom(r) { return { crown: r * 1.02, hem: r * .66, foot: r * 1.02 }; }
    /* The skirt is the sprite's signature: round feet with sharp notches
       between them, the whole pattern sliding half a foot every few pixels of
       travel so the thing shuffles as it walks. Real semicircles, not the
       shallow quadratics this used to use — a quadratic only reaches half its
       control offset, which is why the hem read as an almost straight line. */
    function ghostPath(ctx, x, y, r, phase) {
      const domeY = y - r * .06, hemY = y + ghostGeom(r).hem;
      const n = 3, w = (r * 2) / n, fr = w / 2;
      ctx.beginPath();
      ctx.arc(x, domeY, r, Math.PI, 0);            // the dome, over the top
      ctx.lineTo(x + r, hemY);
      if (!phase) {
        for (let i = 0; i < n; i++)
          ctx.arc(x + r - fr - i * w, hemY, fr, 0, Math.PI, false);
      } else {
        /* the same pattern slid half a foot: a half at each edge, whole ones
           between, which is the sprite's other frame */
        ctx.arc(x + r - fr * .5, hemY, fr * .5, 0, Math.PI, false);
        for (let i = 0; i < n - 1; i++)
          ctx.arc(x + r - (i + 1) * w, hemY, fr, 0, Math.PI, false);
        ctx.arc(x - r + fr * .5, hemY, fr * .5, 0, Math.PI, false);
      }
      ctx.lineTo(x - r, domeY);
      ctx.closePath();
    }
    function drawGhost(ctx, g) {
      const r = TS * .60, x = g.x, y = g.y;
      const fright = g.mode === 'fright';
      const blink = fright && frightT < 2 && (Math.floor(frightT * 6) % 2 === 0);
      const phase = (Math.floor((Math.abs(g.x) + Math.abs(g.y)) / 7) % 2);
      ctx.save();
      if (!g.eaten) {
        const base = fright ? (blink ? '#f2f5ff' : FRIGHT_BLUE) : (g.col || GCOL[g.gi % 4]);
        /* One flat colour. There was a vertical gradient, a radial sheen and a
           soft contact shadow under here; together they softened the silhouette
           and the sprite stopped reading as a sprite. The cabinet fills it
           solid and so does this. */
        ghostPath(ctx, x, y, r, phase);
        ctx.fillStyle = base;
        ctx.fill();
        /* a person on the controls gets a thin rim: it is the only way to tell
           a friend from the machine at a glance */
        if (g.id) {
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
      if (fright && !g.eaten) {
        /* frightened: two square eyes and a flat zigzag mouth, which is what
           the arcade draws and nothing like a scared face */
        const ink = blink ? '#ff2b1f' : '#ffffff';
        ctx.fillStyle = ink;
        const es = r * .17;
        ctx.fillRect(x - r * .40 - es / 2, y - r * .22, es, es);
        ctx.fillRect(x + r * .40 - es / 2, y - r * .22, es, es);
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.4, r * .12);
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        const my = y + r * .30, mw = r * .62;
        for (let i = 0; i <= 6; i++) {
          const px = x - mw + (i * mw * 2) / 6, py = my + (i % 2 ? -r * .16 : 0);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else {
        /* Smaller and set further apart than they were: eyes at nearly a third
           of the body width each, almost touching in the middle, was most of
           what made these look cheap. */
        const d = DIRS[g.dir];
        const ew = r * .25, eh = r * .31, ey = y - r * .20;
        for (const s of [-1, 1]) {
          const ex = x + s * r * .36;
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.beginPath(); ctx.ellipse(ex, ey + r * .03, ew, eh, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, TAU); ctx.fill();
          const px = ex + d[0] * ew * .46, py = ey + d[1] * eh * .44;
          ctx.fillStyle = EYE_BLUE;
          ctx.beginPath(); ctx.arc(px, py, ew * .60, 0, TAU); ctx.fill();
          /* a speck of the room in each eye */
          ctx.fillStyle = 'rgba(255,255,255,.92)';
          ctx.beginPath(); ctx.arc(px - ew * .20, py - eh * .22, ew * .18, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }

    /* The bonus. Eight of them, drawn rather than sprited, because a cherry
       that is obviously a cherry is worth more than a coloured dot with a
       number over it. */
    function drawFruit(ctx, k, x, y, life) {
      const r = TS * .40;
      ctx.save();
      ctx.translate(x, y);
      const pop = life < 2 && (Math.floor(life * 6) % 2 === 0) ? .86 : 1;
      ctx.scale(pop, pop);
      const stalk = (c) => {
        ctx.strokeStyle = c || '#4caf50'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -r * .35); ctx.quadraticCurveTo(r * .35, -r * 1.1, r * .1, -r * 1.25); ctx.stroke();
      };
      if (k === 0) {                                   // cherries
        ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * .4, r * .18); ctx.quadraticCurveTo(0, -r, r * .45, -r * 1.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * .4, r * .18); ctx.quadraticCurveTo(r * .3, -r * .6, r * .45, -r * 1.05); ctx.stroke();
        ctx.fillStyle = '#e01b1b';
        ctx.beginPath(); ctx.arc(-r * .42, r * .42, r * .48, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(r * .42, r * .42, r * .48, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(-r * .56, r * .26, r * .13, 0, TAU); ctx.fill();
      } else if (k === 1) {                            // strawberry
        ctx.fillStyle = '#e01b1b';
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.quadraticCurveTo(-r * .95, r * .1, -r * .6, -r * .5);
        ctx.quadraticCurveTo(0, -r * .8, r * .6, -r * .5);
        ctx.quadraticCurveTo(r * .95, r * .1, 0, r);
        ctx.fill();
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.moveTo(-r * .62, -r * .5); ctx.lineTo(0, -r * .3); ctx.lineTo(r * .62, -r * .5);
        ctx.lineTo(r * .2, -r * .72); ctx.lineTo(0, -r * .42); ctx.lineTo(-r * .2, -r * .72);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        for (const p of [[-.28,.1],[.28,.14],[0,.46],[-.1,-.14],[.34,-.2]])
          { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, r * .07, 0, TAU); ctx.fill(); }
      } else if (k === 2 || k === 3) {                 // orange / apple
        ctx.fillStyle = k === 2 ? '#ff9a1f' : '#e8352b';
        ctx.beginPath(); ctx.arc(0, r * .16, r * .78, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(-r * .28, r * -.1, r * .18, 0, TAU); ctx.fill();
        stalk(k === 2 ? '#6b4a1f' : '#7a4a20');
        ctx.fillStyle = '#4caf50';
        ctx.beginPath(); ctx.ellipse(r * .34, -r * .95, r * .3, r * .15, -.5, 0, TAU); ctx.fill();
      } else if (k === 4) {                            // melon
        ctx.fillStyle = '#8fe04a';
        ctx.beginPath(); ctx.arc(0, r * .1, r * .82, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2f7d1f'; ctx.lineWidth = 1.3;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * r * .3, r * .1 - r * .78);
          ctx.quadraticCurveTo(i * r * .46, r * .1, i * r * .3, r * .1 + r * .78);
          ctx.stroke();
        }
        stalk('#2f7d1f');
      } else if (k === 5) {                            // galaxian flagship
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .34, r * .1); ctx.lineTo(-r * .34, r * .1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3aa0ff';
        ctx.beginPath(); ctx.moveTo(-r * .34, r * .1); ctx.lineTo(-r * .95, r * .62); ctx.lineTo(-r * .2, r * .62); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r * .34, r * .1); ctx.lineTo(r * .95, r * .62); ctx.lineTo(r * .2, r * .62); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e01b1b';
        ctx.fillRect(-r * .16, r * .1, r * .32, r * .5);
      } else if (k === 6) {                            // bell
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(-r * .82, r * .5);
        ctx.quadraticCurveTo(-r * .74, -r * .85, 0, -r * .85);
        ctx.quadraticCurveTo(r * .74, -r * .85, r * .82, r * .5);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c9a406'; ctx.fillRect(-r * .9, r * .5, r * 1.8, r * .2);
        ctx.beginPath(); ctx.arc(0, r * .82, r * .17, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath(); ctx.ellipse(-r * .34, -r * .1, r * .12, r * .34, 0, 0, TAU); ctx.fill();
      } else {                                         // key
        ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = r * .22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -r * .2); ctx.lineTo(0, r * .9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, r * .5); ctx.lineTo(r * .42, r * .5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, r * .85); ctx.lineTo(r * .3, r * .85); ctx.stroke();
        ctx.lineWidth = r * .2; ctx.strokeStyle = '#7fc8ff';
        ctx.beginPath(); ctx.arc(0, -r * .55, r * .4, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }

    function paint(ctx) {
      backdrop(ctx);

      /* whatever the engine has scaled us by, so the baked maze can match it */
      const tf = ctx.getTransform ? ctx.getTransform() : null;
      const S = tf ? Math.max(1, Math.min(4, Math.hypot(tf.a, tf.b))) : 1;

      ctx.save();
      ctx.translate(MX, MY);
      ctx.drawImage(bakeMaze(S), 0, 0, MW, MH);

      /* Pellets: drawn straight, not stamped from a glow sprite. Flat arcs go
         through the same transform as everything else, so they stay sharp at
         any window size, and without the gradient they are cheaper than the
         sprites they replace. */
      const t = performance.now() / 1000;
      const blinkOn = (Math.floor(t * 4.5) % 2) === 0;
      ctx.fillStyle = PELLET_COL;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const p = pellets[y][x]; if (!p) continue;
        const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
        if (p === 1) { ctx.beginPath(); ctx.arc(cx, cy, 2.0, 0, TAU); ctx.fill(); }
        else if (blinkOn) { ctx.beginPath(); ctx.arc(cx, cy, 5.2, 0, TAU); ctx.fill(); }
      }

      if (fruit) drawFruit(ctx, fruit.kind, fruit.tx * TS + TS / 2, fruit.ty * TS + TS / 2, fruit.t);

      if (phase !== 'roles') {
        for (const g of ghosts) drawGhost(ctx, g);
        for (const p of pacs) drawPac(ctx, p);
        /* a small tag over whoever is a person */
        if (MPS) {
          for (const e of pacs.concat(ghosts)) {
            if (!e.id) continue;
            const you = e.id === MYID;
            panelText(ctx, e.x, e.y - TS * 1.1, you ? 'YOU' : e.name, you ? 9.5 : 9,
                      you ? '#ffe11a' : 'rgba(255,255,255,.7)', 'center', you ? 800 : 700);
          }
          /* no ring around your own body - a yellow circle on a ghost read as
             part of the ghost. The name tag above it is enough. */
        }
      }
      for (const p of popups) {
        ctx.globalAlpha = Math.min(1, p.t * 1.6);
        panelText(ctx, p.x, p.y - (1 - p.t) * 16, p.s, 13, p.c || '#8ef0ff', 'center', 800);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      drawChrome(ctx);
      paintPhase(ctx);
    }


    /* Black. There was a pool of blue light and a vignette over it, and between
       them they washed the contrast out of the board's edges and made the whole
       thing look fogged. The cabinet's background is black and the maze is the
       only light in the room. */
    function backdrop(ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    function paintPhase(ctx) {
      if (phase === 'roles') drawRoles(ctx);
      /* the cabinet's own lettering: squares, not a typeface */
      else if (phase === 'ready') {
        Hud.pix(ctx, 'READY!', MX + MW / 2, MY + MH * .58 - 10, 4, { fill: '#ffe11a', align: 'center' });
      } else if (phase === 'won') {
        Hud.pix(ctx, 'MAZE CLEARED', MX + MW / 2, MY + MH * .58 - 10, 4, { fill: '#8ef0a4', align: 'center' });
      } else if (phase === 'over') {
        Hud.pix(ctx, 'ALL TURNED', MX + MW / 2, MY + MH * .58 - 10, 4, { fill: '#ff6b7a', align: 'center' });
      }
    }

    function drawChrome(ctx) {
      /* left: the numbers, in the squares an arcade cabinet drew them with */
      Hud.pix(ctx, 'SCORE', LPX, MY + 10, 2.8, { fill: P.ink3 });
      Hud.pix(ctx, fmt(score), LPX, MY + 32, 5, { fill: '#ffe11a' });
      panelText(ctx, LPX, MY + 84, INFECT ? 'HELD OUT' : 'LEVEL', 10, P.ink3, 'left', 700);
      panelText(ctx, LPX, MY + 106, INFECT ? Math.floor(huntT) + 's' : String(level), 20, P.ink, 'left', 800);
      if (INFECT) {
        panelText(ctx, LPX, MY + 140, 'STILL RUNNING', 10, P.ink3, 'left', 700);
        panelText(ctx, LPX, MY + 166, pacs.length + ' / ' + (pacs.length + ghosts.filter(g => g.id).length),
                  20, pacs.length ? '#ffe11a' : '#ff6b7a', 'left', 800);
      } else {
        panelText(ctx, LPX, MY + 140, 'LIVES', 10, P.ink3, 'left', 700);
        for (let i = 0; i < lives; i++) {
          const lx = LPX + 10 + i * 26, ly = MY + 164;
          ctx.fillStyle = '#ffe11a';
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, 9, .26 * Math.PI, 1.74 * Math.PI); ctx.closePath(); ctx.fill();
        }
      }
      /* the bonus, and what it is worth, while it is on the board */
      if (fruit) {
        panelText(ctx, LPX, MY + 258, 'BONUS', 10, P.ink3, 'left', 700);
        ctx.save(); ctx.scale(1.5, 1.5);
        drawFruit(ctx, fruit.kind, (LPX + 14) / 1.5, (MY + 288) / 1.5, 9);
        ctx.restore();
        panelText(ctx, LPX + 40, MY + 288, fmt(FRUITS[fruit.kind].v), 15, '#ff9ec4', 'left', 800);
        panelText(ctx, LPX + 40, MY + 303, FRUITS[fruit.kind].n.toUpperCase(), 9, P.ink3, 'left', 700);
      }
      panelText(ctx, LPX, MY + MH - 8, (MAZES[mazeKey] || MAZES.classic).name.toUpperCase(), 10, P.ink3, 'left', 700);
      if (frightT > 0) {
        panelText(ctx, LPX, MY + 210, 'FRIGHTENED', 10, '#8ef0ff', 'left', 800);
        ctx.fillStyle = 'rgba(255,255,255,.10)';
        rr(ctx, LPX, MY + 220, 160, 8, 4); ctx.fill();
        ctx.fillStyle = '#2b3ce8';
        rr(ctx, LPX, MY + 220, 160 * clamp(frightT / 7, 0, 1), 8, 4); ctx.fill();
      }

      /* right: who is who */
      panelText(ctx, RPX, MY + 16, MPS ? (INFECT ? 'SIDES' : 'THIS ROUND') : 'THE GHOSTS', 10, P.ink3, 'left', 700);
      if (MPS) {
        /* which side people are on NOW, not which side they were dealt - in
           Infection that is the only number on screen that keeps changing */
        const live = pacs.filter(p => p.id).map(p => ({ id: p.id, name: p.name, side: 'pac' }))
          .concat(ghosts.filter(g => g.id).map(g => ({ id: g.id, name: g.name, side: 'ghost', gi: g.gi })));
        const list = live.length ? live
          : roles.map(r => ({ id: r.id, name: r.name, side: r.role, gi: r.gi || 0 }));
        list.forEach((r, i) => {
          const ry = MY + 46 + i * 30;
          ctx.save(); ctx.translate(RPX + 12, ry - 4); ctx.scale(.62, .62);
          if (r.side === 'pac') drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: 1.1 });
          else drawGhost(ctx, { x: 0, y: 0, gi: r.gi || 0, dir: 3, mode: 'out', eaten: false, id: r.id });
          ctx.restore();
          panelText(ctx, RPX + 30, ry - 8, r.name + (r.id === MYID ? '  (you)' : ''), 12,
                    r.id === MYID ? '#fff' : P.ink2, 'left', r.id === MYID ? 800 : 600);
          panelText(ctx, RPX + 30, ry + 6,
                    r.side === 'pac' ? 'Pac-Man' : (INFECT ? 'hunting' : GNAME[(r.gi || 0) % 4]), 10,
                    r.side === 'pac' ? '#ffe11a' : GCOL[(r.gi || 0) % 4], 'left', 700);
        });
      } else {
        for (let i = 0; i < 4; i++) {
          const ry = MY + 46 + i * 34;
          ctx.save(); ctx.translate(RPX + 12, ry - 4); ctx.scale(.62, .62);
          drawGhost(ctx, { x: 0, y: 0, gi: i, dir: 3, mode: ghosts[i] && ghosts[i].mode === 'fright' ? 'fright' : 'out',
                           eaten: ghosts[i] ? ghosts[i].eaten : false, id: null });
          ctx.restore();
          panelText(ctx, RPX + 30, ry - 8, GNAME[i], 12, GCOL[i], 'left', 800);
          panelText(ctx, RPX + 30, ry + 6, GHOST_HINT[i], 9.5, P.ink3, 'left', 500);
        }
      }
      panelText(ctx, RPX, MY + MH - 8, 'BEST ' + fmt(Math.max(best, score)), 10, P.ink3, 'left', 700);
    }

    /* The reveal. It is a whole screen on purpose: knowing who is chasing you,
       and being told plainly that it is your turn to run, is the moment the
       round actually starts. */
    function drawRoles(ctx) {
      ctx.fillStyle = 'rgba(3,5,12,.93)'; ctx.fillRect(0, 0, W, H);
      const t = clamp((4.2 - phaseT) / .5, 0, 1);
      const mine = myRole();

      if (INFECT) {
        /* Infection turns the reveal round the other way: one name at the top
           is the thing to be afraid of, and the row underneath is everybody
           who has to get away from it. */
        panelText(ctx, W / 2, 58, 'INFECTION', 12, P.ink3, 'center', 700);
        const hunter = roles.find(r => r.role === 'ghost');
        const prey = roles.filter(r => r.role === 'pac');
        ctx.save(); ctx.globalAlpha = t;
        ctx.translate(W / 2, 150); ctx.scale(3.1, 3.1);
        drawGhost(ctx, { x: 0, y: 0, gi: 0, dir: 3, mode: 'out', eaten: false, id: hunter && hunter.id });
        ctx.restore();
        ctx.save(); ctx.globalAlpha = t;
        panelText(ctx, W / 2, 216, (hunter ? hunter.name : 'Nobody') + (hunter && hunter.id === MYID ? '  (you)' : ''),
                  26, '#ff1f14', 'center', 800);
        panelText(ctx, W / 2, 242, 'starts the hunt', 13, P.ink2, 'center', 600);
        ctx.restore();

        panelText(ctx, W / 2, 300, 'EVERYONE ELSE IS PAC-MAN', 11, P.ink3, 'center', 700);
        const gw = Math.min(150, (W - 120) / Math.max(1, prey.length)), total = prey.length * gw;
        prey.forEach((r, i) => {
          const gx = W / 2 - total / 2 + gw / 2 + i * gw, gy = 366;
          const tt = clamp((4.2 - phaseT - .25 - i * .14) / .45, 0, 1);
          ctx.save(); ctx.globalAlpha = tt;
          ctx.translate(gx, gy + (1 - tt) * 14);
          drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: 1.1 });
          ctx.restore();
          ctx.save(); ctx.globalAlpha = tt;
          panelText(ctx, gx, gy + 34, r.name + (r.id === MYID ? '  (you)' : ''), 13,
                    r.id === MYID ? '#fff' : '#ffe11a', 'center', 800);
          ctx.restore();
        });
        panelText(ctx, W / 2, 470, mine === 'pac' ? 'RUN. GET CAUGHT AND YOU JOIN THEM.' : 'TURN THEM ALL.',
                  20, mine === 'pac' ? '#ffe11a' : '#ff6b7a', 'center', 800);
        panelText(ctx, W / 2, 500, mine === 'pac' ? 'Clear every pellet and the survivors win.'
                                                  : 'Nobody left running and the hunt wins.',
                  12, P.ink3, 'center', 500);
        panelText(ctx, W / 2, 534, Math.max(1, Math.ceil(phaseT)) + '', 26, P.ink3, 'center', 800);
        return;
      }

      const pr = roles.find(r => r.role === 'pac');
      const gs = roles.filter(r => r.role === 'ghost');
      panelText(ctx, W / 2, 62, 'THIS ROUND', 12, P.ink3, 'center', 700);

      ctx.save();
      ctx.globalAlpha = t;
      /* Pac-Man, large */
      const px = W / 2, py = 158;
      ctx.save(); ctx.translate(px, py); ctx.scale(3.4, 3.4);
      drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: 1.1 });
      ctx.restore();
      panelText(ctx, px, py + 66, (pr ? pr.name : 'Nobody') + (pr && pr.id === MYID ? '  (you)' : ''),
                26, '#ffe11a', 'center', 800);
      panelText(ctx, px, py + 92, 'is Pac-Man', 13, P.ink2, 'center', 600);
      ctx.restore();

      panelText(ctx, W / 2, 300, 'THE GHOSTS', 11, P.ink3, 'center', 700);
      const n = Math.max(1, gs.length), gw = 150, total = n * gw;
      gs.forEach((r, i) => {
        const gx = W / 2 - total / 2 + gw / 2 + i * gw, gy = 372;
        const tt = clamp((4.2 - phaseT - .25 - i * .18) / .45, 0, 1);
        ctx.save(); ctx.globalAlpha = tt;
        ctx.translate(gx, gy + (1 - tt) * 14);
        const fake = { x: 0, y: 0, gi: r.gi, dir: 3, mode: 'out', eaten: false, id: r.id };
        ctx.scale(2.1, 2.1);
        drawGhost(ctx, fake);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = tt;
        panelText(ctx, gx, gy + 44, r.name + (r.id === MYID ? '  (you)' : ''), 14,
                  r.id === MYID ? '#fff' : GCOL[r.gi % 4], 'center', 800);
        ctx.restore();
      });

      panelText(ctx, W / 2, 500, mine === 'pac' ? 'RUN.' : 'HUNT HIM DOWN.', 20,
                mine === 'pac' ? '#ffe11a' : '#ff6b7a', 'center', 800);
      panelText(ctx, W / 2, 532, Math.max(1, Math.ceil(phaseT)) + '', 26, P.ink3, 'center', 800);
    }

    /* ---- the front page ---- */
    function laneStep(d) {
      const L = lane;
      for (let i = L.pops.length - 1; i >= 0; i--) { L.pops[i].t += d; if (L.pops[i].t > 1.2) L.pops.splice(i, 1); }
      /* eating a ghost stops the world for a beat, the way the cabinet does */
      if (L.freeze > 0) { L.freeze -= d; return; }
      if (L.fr > 0) L.fr = Math.max(0, L.fr - d);
      if (L.ph === 'run') {
        L.px -= 158 * d; L.mouth += d * 13;
        for (const g of L.gh) g.x -= 166 * d;
        for (let i = 0; i < LANE_PELLETS.length; i++) if (!L.got[i] && L.px <= LANE_PELLETS[i]) L.got[i] = true;
        if (L.px <= 72) { L.px = 72; L.power = false; L.ph = 'turn'; L.pdir = 0; L.fr = 6.5; }
      } else if (L.ph === 'turn') {
        L.px += 192 * d; L.mouth += d * 13;
        for (const g of L.gh) if (g.alive) g.x += 86 * d;
        for (const g of L.gh) {
          if (!g.alive || L.px + 17 < g.x) continue;
          g.alive = false;
          L.pops.push({ x: g.x, v: 200 * Math.pow(2, L.eaten), t: 0 });
          L.eaten++; L.freeze = .5;
          break;
        }
        if (L.eaten >= 4 && L.px > W + 70) { L.ph = 'rest'; L.rest = 1.2; }
      } else {
        L.rest -= d;
        if (L.rest <= 0) laneReset();
      }
    }
    function drawLane(ctx) {
      const L = lane;
      if (!L) return;
      ctx.fillStyle = PELLET_COL;
      for (let i = 0; i < LANE_PELLETS.length; i++) {
        if (L.got[i]) continue;
        ctx.beginPath(); ctx.arc(LANE_PELLETS[i], LANE_Y, 3, 0, TAU); ctx.fill();
      }
      if (L.power && Math.floor(FK.t * 4.5) % 2 === 0) { ctx.beginPath(); ctx.arc(72, LANE_Y, 8, 0, TAU); ctx.fill(); }
      /* the ghosts read the game's own fright clock for their blink */
      const keep = frightT;
      frightT = L.fr;
      for (let i = 0; i < 4; i++) {
        const g = L.gh[i];
        if (!g.alive || g.x > W + 50 || g.x < -50) continue;
        ctx.save(); ctx.translate(0, LANE_Y); ctx.scale(2, 2);
        drawGhost(ctx, { x: g.x / 2, y: 0, gi: i, dir: L.ph === 'run' ? 2 : 0,
                         mode: L.ph === 'turn' && L.fr > 0 ? 'fright' : 'out', eaten: false, id: null });
        ctx.restore();
      }
      frightT = keep;
      /* Pac-Man is not drawn while the score for the ghost he ate is up */
      if (L.freeze <= 0 && L.px > -50 && L.px < W + 50) {
        ctx.save(); ctx.translate(L.px, LANE_Y); ctx.scale(2, 2);
        drawPac(ctx, { x: 0, y: 0, dir: L.pdir, dead: 0, mouth: L.mouth });
        ctx.restore();
      }
      for (const p of L.pops)
        Hud.pix(ctx, String(p.v), p.x, LANE_Y, 2.2, { align: 'center', baseline: 'middle', fill: '#00ffff', alpha: clamp((1.2 - p.t) / .3, 0, 1) });
    }
    /* CHARACTER / NICKNAME, a ghost at a time, the way the cabinet introduces them */
    function drawRoster(ctx, x, y, T) {
      Hud.pix(ctx, 'CHARACTER / NICKNAME', x, y, 2.4, { fill: '#ffffff', alpha: clamp((T - .8) / .15, 0, 1) });
      ROSTER_MENU.forEach((r, i) => {
        const t0 = 1.2 + i * .85, ry = y + 50 + i * 52;
        const a1 = clamp((T - t0) / .12, 0, 1), a2 = clamp((T - t0 - .28) / .12, 0, 1), a3 = clamp((T - t0 - .56) / .12, 0, 1);
        if (a1 > 0) {
          const pop = FK.bo(clamp((T - t0) / .35, 0, 1)), gx = (Math.floor(T * 4 + i) % 2) * 7.1;
          ctx.save();
          ctx.globalAlpha *= a1; ctx.translate(x + 24, ry); ctx.scale(2.3 * pop, 2.3 * pop); ctx.translate(-gx, 0);
          drawGhost(ctx, { x: gx, y: 0, gi: i, dir: 0, mode: 'out', eaten: false, id: null });
          ctx.restore();
        }
        if (a2 > 0) Hud.pix(ctx, '-' + r[0], x + 66, ry, 3, { baseline: 'middle', fill: GCOL[i], alpha: a2 });
        if (a3 > 0) Hud.pix(ctx, '"' + r[1] + '"', x + 226, ry, 3, { baseline: 'middle', fill: GCOL[i], alpha: a3 });
      });
      const pa = clamp((T - 4.7) / .15, 0, 1);
      if (pa > 0) {
        const py = y + 50 + 4 * 52 + 4, on = Math.floor(T * 4.5) % 2 === 0;
        ctx.save();
        ctx.globalAlpha *= pa;
        ctx.fillStyle = PELLET_COL;
        ctx.beginPath(); ctx.arc(x + 90, py, 3, 0, TAU); ctx.fill();
        if (on) { ctx.beginPath(); ctx.arc(x + 226, py, 8, 0, TAU); ctx.fill(); }
        Hud.pix(ctx, '10', x + 110, py, 3, { baseline: 'middle', fill: '#ffffff' });
        Hud.pix(ctx, 'PTS', x + 150, py + 2, 2, { baseline: 'middle', fill: '#ffffff' });
        Hud.pix(ctx, '50', x + 248, py, 3, { baseline: 'middle', fill: '#ffffff' });
        Hud.pix(ctx, 'PTS', x + 288, py + 2, 2, { baseline: 'middle', fill: '#ffffff' });
        ctx.restore();
      }
    }
    /* a box with the maze's double wall round it */
    function mazeBox(ctx, x, y, w, h, col) {
      ctx.save();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      rr(ctx, x, y, w, h, 16); ctx.stroke();
      rr(ctx, x + 7, y + 7, w - 14, h - 14, 10); ctx.stroke();
      ctx.restore();
    }
    function drawMenu(ctx) {
      const T = FK.t, mode = FK.mode(), live = mode !== 'guest', P2 = api.party;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

      /* the score line */
      Hud.pix(ctx, '1UP', 150, 14, 2.6, { fill: '#ffffff', alpha: Math.floor(T * 2.6) % 2 ? .18 : 1 });
      Hud.pix(ctx, '00', 196, 38, 2.6, { align: 'right', fill: '#ffffff' });
      const best = Math.max(0, api.best());
      Hud.pix(ctx, 'HIGH SCORE', W / 2, 14, 2.6, { align: 'center', fill: '#ffffff' });
      Hud.pix(ctx, best > 0 ? String(best) : '00', W / 2, 38, 2.6, { align: 'center', fill: '#ffffff' });

      /* the name, dropped in a letter at a time, then now and again a ripple
         along it like a mouthful going down */
      const G = FK.pixWord('pm-title', 'PAC-MAN', {
        px: 10, depth: 9, fill: () => PAC_YEL, side: () => '#d9730b', edgeCol: '#000000'
      });
      FK.drawWord(ctx, G, W / 2, 70, i => {
        const ti = T - .1 - i * .07;
        if (ti <= 0) return { a: 0 };
        let dy = 0, sy = 1;
        if (ti < .34) { const k = ti / .34; dy = -(1 - k * k) * 240; }
        else if (ti - .34 < .2) sy = 1 - Math.sin((ti - .34) / .2 * Math.PI) * .2;
        if (T > 2.2) {
          const c = (T - 2.2 - i * .07) % 4.2;
          if (c > 0 && c < .28) { const s = Math.sin(c / .28 * Math.PI); dy -= s * 10; sy *= 1 + s * .06; }
        }
        return { dy, sy, sx: 1 + (1 - sy) * .6 };
      });

      drawRoster(ctx, 58, 204, T);

      /* the choices, in a box walled like the maze */
      const bk = FK.eo(FK.in(.35, .5)), BX0 = 506, BY0 = 180, BW0 = 396, BH0 = 318;
      ctx.save();
      ctx.globalAlpha *= bk; ctx.translate((1 - bk) * 30, 0);
      ctx.fillStyle = 'rgba(8,8,40,.55)'; rr(ctx, BX0, BY0, BW0, BH0, 16); ctx.fill();
      mazeBox(ctx, BX0, BY0, BW0, BH0, '#2121de');
      const bx = BX0 + 26, bw = BW0 - 52;

      /* Play: your own round, or the host's start, or a guest's wait */
      const label = mode === 'host' ? 'START ROUND' : mode === 'guest' ? 'WAITING FOR HOST' : 'PLAY';
      const mname = FK.opt('mode', 'classic') === 'infect' ? 'INFECTION' : 'CLASSIC';
      const sub = mode === 'guest' ? 'THE HOST STARTS IT'
        : mode === 'host' ? (P2.size < 2 ? 'INVITE SOMEONE FIRST' : mname + ' - ' + P2.size + ' PLAYERS')
        : 'ON YOUR OWN - 3 LIVES';
      const lpx = Math.min(4.4, (bw - 44) / (label.length * 7 - 2));
      FK.button(ctx, 'play', bx, BY0 + 26, bw, 66, label, PM_BTN, {
        live, fill: live ? ['#fff45e', '#f2c200'] : ['#55586a', '#3a3c4a'],
        draw(c) {
          Hud.pix(c, label, 0, -7, lpx, { thick: true, align: 'center', baseline: 'middle', fill: live ? '#1c1500' : '#c9cbe0' });
          Hud.pix(c, sub, 0, 20, 1.6, { align: 'center', baseline: 'middle', fill: live ? 'rgba(28,21,0,.72)' : 'rgba(201,203,224,.7)' });
        }
      });

      /* with friends: the mode and the empty seats */
      const fy = BY0 + 118;
      Hud.pix(ctx, 'WITH FRIENDS', bx + 2, fy, 1.8, { baseline: 'middle', fill: '#8a90e8' });
      Hud.pix(ctx, mode === 'guest' ? 'THE HOST PICKS' : '2 TO 5 PLAYERS', bx + bw - 2, fy, 1.6,
              { align: 'right', baseline: 'middle', fill: 'rgba(138,144,232,.7)' });
      const cw = (bw - 12) / 2, ch = 82, cy = fy + 14, cur = FK.opt('mode', 'classic');
      PM_MODES.forEach((m, i) => {
        const x = bx + i * (cw + 12), on = cur === m[0];
        const b = FK.btn('opt:mode:' + m[0], x, cy, cw, ch, live);
        const sel = FK.glide('pmsel' + i, on ? 1 : 0, 12), lift = b.h * 2;
        ctx.save();
        ctx.translate(0, -lift);
        ctx.fillStyle = 'rgba(33,33,222,' + (.10 + b.h * .10 + sel * .08).toFixed(3) + ')'; rr(ctx, x, cy, cw, ch, 10); ctx.fill();
        ctx.strokeStyle = on ? PAC_YEL : '#2121de'; ctx.lineWidth = 2 + sel;
        rr(ctx, x + 1, cy + 1, cw - 2, ch - 2, 9); ctx.stroke();
        ctx.save();
        ctx.translate(x + 24, cy + 25); ctx.scale(1.45, 1.45);
        if (i === 0) drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: on ? T * 11 : 1.2 });
        else {
          const gx = on ? (Math.floor(T * 5) % 2) * 7.1 : 0;
          ctx.translate(-gx, 0);
          drawGhost(ctx, { x: gx, y: 0, gi: 0, dir: 0, mode: 'out', eaten: false, id: null });
        }
        ctx.restore();
        Hud.pix(ctx, m[1], x + 46, cy + 25, 2, { baseline: 'middle', fill: on ? PAC_YEL : '#ffffff' });
        Hud.pix(ctx, m[2], x + 14, cy + 52, 1.4, { baseline: 'middle', fill: 'rgba(255,255,255,.66)' });
        Hud.pix(ctx, m[3], x + 14, cy + 66, 1.4, { baseline: 'middle', fill: 'rgba(255,255,255,.66)' });
        ctx.restore();
      });
      if (!live) { ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, bx, cy, bw, ch, 10); ctx.fill(); }

      /* AI ghosts: a switch whose knob is Pac-Man when it is on */
      const ty = cy + ch + 10, fill = FK.opt('fill', 'on') !== 'off';
      const tb = FK.btn('opt:fill:' + (fill ? 'off' : 'on'), bx, ty, bw, 38, live);
      ctx.fillStyle = 'rgba(33,33,222,' + (.10 + tb.h * .10).toFixed(3) + ')'; rr(ctx, bx, ty, bw, 38, 10); ctx.fill();
      Hud.pix(ctx, 'AI GHOSTS FILL EMPTY SEATS', bx + 14, ty + 19, 1.6, { baseline: 'middle', fill: '#ffffff' });
      const k = FK.spring('pmfill', fill ? 1 : 0, 520, 30), sw = 58, sx = bx + bw - 14 - sw, kx = sx + 12 + clamp(k, -.1, 1.1) * (sw - 24);
      ctx.fillStyle = fill ? 'rgba(255,230,0,.22)' : 'rgba(255,255,255,.08)'; rr(ctx, sx, ty + 8, sw, 22, 11); ctx.fill();
      ctx.fillStyle = PELLET_COL;
      for (let i = 0; i < 3; i++) { const px = sx + 16 + i * 13; if (px > kx + 8) { ctx.beginPath(); ctx.arc(px, ty + 19, 2, 0, TAU); ctx.fill(); } }
      if (fill) {
        ctx.save(); ctx.translate(kx, ty + 19); ctx.scale(.95, .95);
        drawPac(ctx, { x: 0, y: 0, dir: 0, dead: 0, mouth: T * 11 });
        ctx.restore();
      } else { ctx.fillStyle = '#5b5f86'; ctx.beginPath(); ctx.arc(kx, ty + 19, 9, 0, TAU); ctx.fill(); }
      if (!live) { ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, bx, ty, bw, 38, 10); ctx.fill(); }

      /* and the party, behind a plain blue wall */
      const fl = P2.inRoom ? 'PARTY OF ' + P2.size : 'PLAY WITH FRIENDS';
      FK.button(ctx, 'party', bx, ty + 50, bw, 42, fl, { r: 10, shadow: 'rgba(0,0,0,.45)', edge: '#2121de', edgeW: 2.5, gloss: false }, {
        fill: '#06062c', draw(c) { Hud.pix(c, fl, 0, 1, 2.2, { align: 'center', baseline: 'middle', fill: '#ffffff' }); }
      });
      ctx.restore();

      /* the chase, once the name has landed */
      if (T > 1.4) laneStep(FK.dt);
      drawLane(ctx);

      const fa = FK.in(1, .5);
      Hud.pix(ctx, 'ARROWS OR WASD TO MOVE', 22, H - 16, 1.6, { baseline: 'middle', fill: 'rgba(255,255,255,.4)', alpha: fa });
      if (mode !== 'guest')
        Hud.pix(ctx, 'PUSH SPACE TO START', W / 2, H - 16, 1.8, { align: 'center', baseline: 'middle', fill: PAC_YEL,
                alpha: fa * (Math.floor(T * 2) % 2 ? .35 : 1) });
      Hud.pix(ctx, 'ESC HUB', W - 22, H - 16, 1.6, { align: 'right', baseline: 'middle', fill: 'rgba(255,255,255,.4)', alpha: fa });
      if (FK.on) FK.cursor();
    }
  }
});


