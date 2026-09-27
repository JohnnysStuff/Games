/* ======================================================= BLOCK BLAST ===== */
/* Three pieces at a time onto the board; fill a row or a column and it goes.
   There is no timer and no falling - the only pressure is that you cannot
   rotate anything and you cannot skip, so every piece has to go somewhere and
   the board fills up behind your own decisions.

   Two things carry the feel of it. Lines that a placement would clear are lit
   under the ghost BEFORE you commit, or it is a guessing game. And a clear is
   spent rather than switched off: the blocks go one at a time, outward from
   where the piece landed, each one bursting as its turn comes. The board is
   never shoved around to fake impact - the motion is in the blocks. */
registerGame({
  id: 'blast',
  title: 'Block Blast',
  tagline: 'Drop three pieces at a time on an eight-by-eight board. Fill a row or a column and it clears — no rotating, no skipping, no timer, so every piece has to go somewhere.',
  tags: ['Puzzle', 'Skill', 'Online'],
  scoreLabel: 'Score',
  mp: 'race',
  front: true,
  controls: [
    ['Pick up', 'Click / drag a piece'],
    ['Place', 'Release on the board'],
    ['Put back', 'Right click'],
    ['Pause', 'Esc']
  ],
  options: [
    { id: 'size', label: 'Board', def: '8', choices: [
      { v: '8',  l: '8 × 8' }, { v: '9', l: '9 × 9' }, { v: '10', l: '10 × 10' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="blsB" cx=".5" cy=".38" r=".85"><stop offset="0" stop-color="#1d2a4e"/><stop offset="1" stop-color="#06080f"/></radialGradient><linearGradient id="blsC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ef0ff"/><stop offset="1" stop-color="#1f8fc0"/></linearGradient><linearGradient id="blsO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc678"/><stop offset="1" stop-color="#d1811d"/></linearGradient><linearGradient id="blsP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4b0ff"/><stop offset="1" stop-color="#7b3fc6"/></linearGradient><linearGradient id="blsG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ef0a4"/><stop offset="1" stop-color="#2f9e5c"/></linearGradient><radialGradient id="blsFl" cx=".5" cy=".5"><stop offset="0" stop-color="#fff7d0" stop-opacity=".95"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient></defs><rect width="320" height="180" fill="url(#blsB)"/><g fill="#0c1526" opacity=".85"><rect x="18" y="20" width="30" height="30" rx="7"/><rect x="52" y="20" width="30" height="30" rx="7"/><rect x="18" y="54" width="30" height="30" rx="7"/><rect x="238" y="20" width="30" height="30" rx="7"/><rect x="272" y="20" width="30" height="30" rx="7"/><rect x="272" y="54" width="30" height="30" rx="7"/><rect x="18" y="130" width="30" height="30" rx="7"/><rect x="272" y="130" width="30" height="30" rx="7"/></g><rect x="0" y="96" width="320" height="34" fill="url(#blsFl)" opacity=".55"/><g><rect x="18" y="96" width="30" height="30" rx="7" fill="url(#blsG)"/><rect x="22" y="100" width="22" height="9" rx="4" fill="#fff" opacity=".32"/><rect x="52" y="96" width="30" height="30" rx="7" fill="url(#blsO)"/><rect x="56" y="100" width="22" height="9" rx="4" fill="#fff" opacity=".32"/><rect x="238" y="96" width="30" height="30" rx="7" fill="url(#blsP)"/><rect x="242" y="100" width="22" height="9" rx="4" fill="#fff" opacity=".32"/><rect x="272" y="96" width="30" height="30" rx="7" fill="url(#blsC)"/><rect x="276" y="100" width="22" height="9" rx="4" fill="#fff" opacity=".32"/></g><g fill="#ffe9a8"><circle cx="98" cy="88" r="4"/><circle cx="216" cy="92" r="3.4"/><circle cx="120" cy="140" r="3"/><circle cx="200" cy="136" r="3.6"/><circle cx="86" cy="118" r="2.6"/><circle cx="232" cy="120" r="2.6"/></g><g transform="translate(160 92)"><ellipse cy="62" rx="66" ry="14" fill="#000" opacity=".5"/><g transform="translate(-48 -48)"><rect x="2" y="6" width="96" height="96" rx="10" fill="#080e1c" opacity=".5"/><rect x="0" y="0" width="46" height="46" rx="10" fill="url(#blsC)"/><rect x="6" y="6" width="34" height="14" rx="6" fill="#fff" opacity=".33"/><rect x="50" y="0" width="46" height="46" rx="10" fill="url(#blsC)"/><rect x="56" y="6" width="34" height="14" rx="6" fill="#fff" opacity=".33"/><rect x="0" y="50" width="46" height="46" rx="10" fill="url(#blsC)"/><rect x="6" y="56" width="34" height="14" rx="6" fill="#fff" opacity=".33"/><rect x="50" y="50" width="46" height="46" rx="10" fill="url(#blsO)"/><rect x="56" y="56" width="34" height="14" rx="6" fill="#fff" opacity=".33"/></g></g></svg>',
  w: 960, h: 600,
  mount(api) {
    const W = 960, H = 600;
    const RACE = getRace('blast');
    /* the size can be changed on the front page, so the layout is variable */
    let N = RACE ? 8 : parseInt(api.opt('size') || '8', 10);
    const rng = RACE ? mulberry(RACE.seed) : Math.random;

    /* ---- layout: a board column and a readout column, both the same height,
       so the frame is filled rather than a board with a gap beside it ---- */
    const FX = 84, FY = 34, FS = 448;              // the square the board lives in
    let CELL = Math.floor(FS / N), BW = CELL * N;
    let BX = FX + Math.round((FS - BW) / 2), BY = FY + Math.round((FS - BW) / 2);
    const TRAY_Y = FY + FS + 20, TRAY_H = 78;
    const PX = 576, PW = 300, PY = FY, PH = (TRAY_Y + TRAY_H) - FY;

    /* ------------------------------------------------------------ pieces */
    const SHAPES = [
      [[0,0]],
      [[0,0],[1,0]], [[0,0],[0,1]],
      [[0,0],[1,0],[2,0]], [[0,0],[0,1],[0,2]],
      [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0],[4,0]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
      [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
      [[0,0],[1,0],[0,1]], [[0,0],[1,0],[1,1]], [[0,0],[0,1],[1,1]], [[1,0],[0,1],[1,1]],
      [[0,0],[0,1],[0,2],[1,2],[2,2]], [[0,0],[1,0],[2,0],[0,1],[0,2]],
      [[0,0],[1,0],[2,0],[2,1],[2,2]], [[2,0],[2,1],[0,2],[1,2],[2,2]],
      [[0,0],[1,0],[2,0],[1,1]], [[1,0],[0,1],[1,1],[1,2]],
      [[1,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[1,1],[0,2]],
      [[1,0],[2,0],[0,1],[1,1]], [[0,0],[1,0],[1,1],[2,1]]
    ];
    const WEIGHT = [3, 6,6, 6,6, 4,4, 2,2, 6, 2, 3,3, 6,6,6,6, 3,3,3,3, 4,4,4,4, 4,4];
    const HUES   = [196, 168,168, 44,44, 268,268, 0,0, 150, 320, 28,28,
                    210,210,210,210, 96,96,96,96, 300,300,300,300, 12,12];
    const WSUM = WEIGHT.reduce((a, b) => a + b, 0);
    function rollShape() {
      let r = rng() * WSUM;
      for (let i = 0; i < WEIGHT.length; i++) { r -= WEIGHT[i]; if (r <= 0) return i; }
      return 0;
    }
    const sizeOf = cells => {
      let w = 0, h = 0;
      for (const [x, y] of cells) { w = Math.max(w, x + 1); h = Math.max(h, y + 1); }
      return { w, h };
    };

    /* -------------------------------------------------------------- state */
    let grid, tray, score, best, streak, ended, dead;
    let drag = null, ret = null;
    let clears = [], parts = [], settle = [], pops = [];
    let placedCount = 0, linesTotal = 0, flash = 0, lastClear = '';

    /* how long each stage of a clear takes, and how far apart the blocks go */
    const CLEAR_STEP = .028, CLEAR_DUR = .30, SETTLE_DUR = .22, GRAB_DUR = .11;

    function reset() {
      grid = [];
      for (let y = 0; y < N; y++) grid.push(new Array(N).fill(-1));
      tray = [null, null, null];
      dealIfEmpty();
      score = 0; best = 0; streak = 0; ended = false; dead = 0;
      drag = null; ret = null;
      clears = []; parts = []; settle = []; pops = [];
      placedCount = 0; linesTotal = 0; flash = 0; lastClear = '';
    }
    function dealIfEmpty() {
      if (tray.some(t => t)) return;
      for (let i = 0; i < 3; i++) {
        const s = rollShape();
        tray[i] = { shape: s, cells: SHAPES[s], hue: HUES[s], in: 0, wob: i * .07 };
      }
    }

    /* ---- rules ---- */
    function fits(cells, gx, gy) {
      for (const [cx, cy] of cells) {
        const x = gx + cx, y = gy + cy;
        if (x < 0 || y < 0 || x >= N || y >= N || grid[y][x] >= 0) return false;
      }
      return true;
    }
    function anyFit(piece) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(piece.cells, x, y)) return true;
      return false;
    }
    function completed(extra, gx, gy) {
      const f = grid.map(r => r.slice());
      if (extra) for (const [cx, cy] of extra) f[gy + cy][gx + cx] = 1;
      const rows = [], cols = [];
      for (let y = 0; y < N; y++) if (f[y].every(v => v >= 0)) rows.push(y);
      for (let x = 0; x < N; x++) { let ok = true; for (let y = 0; y < N; y++) if (f[y][x] < 0) { ok = false; break; } if (ok) cols.push(x); }
      return { rows, cols };
    }
    const stuck = () => tray.every(p => !p || !anyFit(p));

    /* ---- placing ---- */
    function place(slot, gx, gy) {
      const piece = tray[slot];
      if (!piece || !fits(piece.cells, gx, gy)) return false;
      const cx0 = gx + sizeOf(piece.cells).w / 2, cy0 = gy + sizeOf(piece.cells).h / 2;

      /* each cell of the piece settles in, nearest the cursor first */
      piece.cells.forEach(([cx, cy]) => {
        grid[gy + cy][gx + cx] = piece.hue;
        settle.push({ x: gx + cx, y: gy + cy, hue: piece.hue, t: 0,
                      delay: Math.hypot(gx + cx - cx0, gy + cy - cy0) * .022 });
      });
      placedCount++;
      let gain = piece.cells.length;
      /* the demo on the front page plays silently */
      if (!FK.on) Sound.place ? Sound.place() : Sound.tick && Sound.tick();

      const { rows, cols } = completed(null, 0, 0);
      const n = rows.length + cols.length;
      if (n > 0) {
        const mult = [0, 1, 2.4, 4.2, 6.5, 9][Math.min(5, n)] || 9;
        streak++;
        gain += Math.round(N * 2.2 * n * mult * (1 + Math.min(1.2, (streak - 1) * .18)));
        linesTotal += n;
        flash = 1;
        lastClear = n + (n === 1 ? ' line' : ' lines');

        /* the order blocks go in: outward from where the piece landed, so the
           clear reads as something the placement caused */
        const doomed = new Map();
        const add = (x, y) => {
          if (grid[y][x] < 0) return;
          const k = y * N + x;
          const d = Math.hypot(x - cx0, y - cy0);
          if (!doomed.has(k) || doomed.get(k).d > d) doomed.set(k, { x, y, hue: grid[y][x], d });
        };
        for (const y of rows) for (let x = 0; x < N; x++) add(x, y);
        for (const x of cols) for (let y = 0; y < N; y++) add(x, y);
        const list = Array.from(doomed.values()).sort((a, b) => a.d - b.d);
        list.forEach((c, i) => clears.push({ x: c.x, y: c.y, hue: c.hue, t: 0,
                                             delay: i * CLEAR_STEP, burst: false,
                                             i, n: list.length, lines: n }));
        for (const c of list) grid[c.y][c.x] = -1;

        /* a nudge only when a lot goes at once, and a small one */
        if (n >= 3 && !FK.on) api.fx.shake(2.2);
        const mx = BX + BW / 2, my = BY + BW / 2;
        if (n > 1) pops.push({ x: mx, y: my - 14, t: 1, s: n + ' LINES', big: true });
        if (streak > 1) pops.push({ x: mx, y: my + 22, t: 1, s: 'STREAK ×' + streak, big: false });
      } else streak = 0;

      score += gain;
      best = Math.max(best, score);
      pops.push({ x: BX + (cx0) * CELL, y: BY + gy * CELL - 4, t: .85, s: '+' + gain, big: false });
      tray[slot] = null;
      dealIfEmpty();
      if (RACE) RACE.report(score, true, placedCount);
      return true;
    }

    function burst(x, y, hue) {
      const cx = BX + x * CELL + CELL / 2, cy = BY + y * CELL + CELL / 2;
      const n = 7 + ((CELL / 12) | 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-.4, .4), sp = rand(46, 150);
        parts.push({ x: cx + rand(-CELL * .2, CELL * .2), y: cy + rand(-CELL * .2, CELL * .2),
                     vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                     s: rand(CELL * .13, CELL * .27), hue,
                     rot: Math.random() * TAU, vr: rand(-7, 7),
                     life: rand(.42, .72), max: .72 });
      }
      /* one soft ring, which is what makes the pop read at a glance */
      parts.push({ ring: true, x: cx, y: cy, r0: CELL * .22, r1: CELL * .95, hue, life: .30, max: .30 });
    }

    reset();

    /* ---------------------------------------------------------- geometry */
    function trayBox(i) {
      const bw = FS / 3;
      return { x: FX + i * bw, y: TRAY_Y, w: bw, h: TRAY_H };
    }
    const trayScale = piece => {
      const { w, h } = sizeOf(piece.cells);
      return Math.min(CELL * .58, (TRAY_H - 22) / Math.max(w, h));
    };

    /* ------------------------------------------------------------- input */
    let wasDown = false;
    function input(dt) {
      const I = api.input, p = I.pointer;
      if (p.rdown && drag) { sendBack(); return; }

      const down = p.down && p.inside;
      if (down && !wasDown && !drag && !ret) {
        for (let i = 0; i < 3; i++) {
          if (!tray[i]) continue;
          const b = trayBox(i);
          if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
            const sz = sizeOf(tray[i].cells);
            drag = { slot: i, ox: sz.w / 2, oy: sz.h / 2, gx: 0, gy: 0,
                     valid: false, lines: null, grow: 0,
                     fromX: b.x + b.w / 2, fromY: b.y + b.h / 2 };
            Sound.grab();
            break;
          }
        }
      }
      if (drag) {
        drag.grow = Math.min(1, drag.grow + dt / GRAB_DUR);
        const px = p.x, py = p.y - CELL * .85;
        drag.gx = Math.round((px - BX) / CELL - drag.ox);
        drag.gy = Math.round((py - BY) / CELL - drag.oy);
        const piece = tray[drag.slot];
        drag.valid = !!piece && fits(piece.cells, drag.gx, drag.gy);
        drag.lines = drag.valid ? completed(piece.cells, drag.gx, drag.gy) : null;
      }
      if (!p.down && wasDown && drag) {
        if (drag.valid) { place(drag.slot, drag.gx, drag.gy); drag = null; }
        else sendBack();
      }
      wasDown = p.down;
    }
    /* an invalid drop flies the piece home rather than blinking out of hand */
    function sendBack() {
      if (!drag) return;
      const p = api.input.pointer;
      const b = trayBox(drag.slot);
      ret = { slot: drag.slot, x: p.x, y: p.y - CELL * .85,
              tx: b.x + b.w / 2, ty: b.y + b.h / 2, t: 0, grow: drag.grow };
      Sound.nope();
      drag = null;
    }

    /* ---- the front page ----
       Opened from the hub, Block Blast starts on its own title: the board,
       smaller and to one side, playing itself - pieces lifted out of the
       tray, set down, lines going out in the same bursts a real clear makes -
       and beside it the name built out of the same glossy blocks, one letter
       set down at a time the way a piece is, with the board sizes as three
       little boards to pick from. Play blows the demo board clear and it
       grows into the game's own place. */
    const FK = FrontKit(api, {
      online: !!RACE, mp: true,
      goSound() { Sound.grab(); },
      onOpt(id, v) {
        if (id !== 'size') return;
        relayout(parseInt(v, 10) || 8);
        reset(); fly = null; seedBoard();
        gridT0 = FK.t; demoT = .9;
      },
      onStart() { fly = null; gridT0 = -1; wipe(false); }
    });
    let fly = null, demoT = 1.1, gridT0 = FK.on ? 0 : -1;
    /* the middle of the board-and-tray, which the menu pose scales about */
    const PVX = FX + FS / 2, PVY = (FY - 14 + TRAY_Y + TRAY_H) / 2;
    const LTR = {
      B: ['###.', '#..#', '###.', '#..#', '###.'], L: ['#...', '#...', '#...', '#...', '####'],
      O: ['####', '#..#', '#..#', '#..#', '####'], C: ['####', '#...', '#...', '#...', '####'],
      K: ['#..#', '#.#.', '##..', '#.#.', '#..#'], A: ['####', '#..#', '####', '#..#', '#..#'],
      S: ['####', '#...', '####', '...#', '####'], T: ['###', '.#.', '.#.', '.#.', '.#.']
    };
    const TWORDS = [['BLOCK', [196, 44, 0, 150, 268]], ['BLAST', [320, 28, 210, 96, 300]]];

    /* a new board's empty sockets pop in from the middle outward */
    function sockIn(x, y) {
      if (gridT0 < 0) return 1;
      const c0 = (N - 1) / 2;
      return clamp((FK.t - gridT0 - .05 - Math.hypot(x - c0, y - c0) * .035) / .28, 0, 1);
    }
    /* the size can be changed on the front page, so the board is laid out again */
    function relayout(n) {
      N = n; CELL = Math.floor(FS / N); BW = CELL * N;
      BX = FX + Math.round((FS - BW) / 2); BY = FY + Math.round((FS - BW) / 2);
    }
    /* the demo's move: whatever clears the most, then whatever sits snuggest
       against the walls and the blocks already down */
    function demoPick() {
      let m = null;
      for (let s = 0; s < 3; s++) {
        const p = tray[s];
        if (!p) continue;
        for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
          if (!fits(p.cells, gx, gy)) continue;
          const L = completed(p.cells, gx, gy);
          let v = (L.rows.length + L.cols.length) * 40 + Math.random() * 3;
          for (const [px, py] of p.cells) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = gx + px + d[0], y = gy + py + d[1];
            if (x < 0 || y < 0 || x >= N || y >= N || grid[y][x] >= 0) v++;
          }
          if (!m || v > m.v) m = { v, s, gx, gy, L };
        }
      }
      return m;
    }
    /* lifts a piece out of the tray and carries it over, exactly as a held
       piece is drawn, so the ghost and the lit rows show up as it arrives */
    function demo(dt) {
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / .5);
        const t = fly.t, e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        drag.grow = Math.min(1, t / .3);
        drag.at.x = fly.x0 + (fly.x1 - fly.x0) * e;
        drag.at.y = fly.y0 + (fly.y1 - fly.y0) * e - Math.sin(e * Math.PI) * 50;
        if (t > .55 && !drag.valid) { drag.gx = fly.gx; drag.gy = fly.gy; drag.valid = true; drag.lines = fly.L; }
        if (t >= 1) { place(fly.s, fly.gx, fly.gy); drag = null; fly = null; demoT = .35 + Math.random() * .35; }
        return;
      }
      if ((demoT -= dt) > 0) return;
      const m = demoPick();
      if (!m) { wipe(true); demoT = 1.2; return; }
      const b = trayBox(m.s), sz = sizeOf(tray[m.s].cells);
      fly = { s: m.s, gx: m.gx, gy: m.gy, L: m.L, t: 0, x0: b.x + b.w / 2, y0: b.y + b.h / 2,
              x1: BX + (m.gx + sz.w / 2) * CELL, y1: BY + (m.gy + sz.h / 2) * CELL + CELL * .85 };
      drag = { slot: m.s, ox: sz.w / 2, oy: sz.h / 2, gx: -99, gy: -99, valid: false, lines: null,
               grow: 0, at: { x: fly.x0, y: fly.y0 } };
    }
    /* everything on the board goes at once, outward from the middle, as one
       last clear - quietly for the demo, as a run up the scale for Play */
    function wipe(quiet) {
      const c0 = (N - 1) / 2, list = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (grid[y][x] >= 0) list.push({ x, y, hue: grid[y][x], d: Math.hypot(x - c0, y - c0) });
      list.sort((a, b) => a.d - b.d);
      const going = clears, flying = parts;
      reset();
      clears = going; parts = flying;
      for (const c of clears) c.quiet = true;
      const loud = i => !quiet && (i % 3 === 0 || i === list.length - 1);
      let n = 0, si = 0;
      for (let i = 0; i < list.length; i++) if (loud(i)) n++;
      list.forEach((c, i) => {
        const on = loud(i);
        clears.push({ x: c.x, y: c.y, hue: c.hue, t: 0, delay: .08 + c.d * .07, burst: false,
                      i: on ? si++ : 0, n, lines: 3, quiet: !on });
      });
    }
    /* a board a few pieces in, whose blocks settle in from the middle */
    function seedBoard() {
      for (let i = 0; i < 7; i++) { const m = demoPick(); if (m) place(m.s, m.gx, m.gy); }
      clears = []; parts = []; pops = []; settle = []; flash = 0; streak = 0;
      const c0 = (N - 1) / 2;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (grid[y][x] >= 0) settle.push({ x, y, hue: grid[y][x], t: 0, delay: .3 + Math.hypot(x - c0, y - c0) * .05 });
    }

    /* the board sits smaller and to the left on the front page, and grows
       into place as a game starts */
    function poseOf() {
      const k = FK.eo(FK.out);
      return { k, s: .78 + .22 * k, x: PVX - 58 * (1 - k), y: PVY - 4 * (1 - k) };
    }
    function boardPose(ctx) {
      const p = poseOf();
      if (p.k >= 1) return;
      ctx.translate(p.x, p.y); ctx.scale(p.s, p.s); ctx.translate(-PVX, -PVY);
    }
    function posePt(x, y) {
      const p = poseOf();
      return [p.x + (x - PVX) * p.s, p.y + (y - PVY) * p.s];
    }

    /* a little board, a few rows in, for each size */
    function miniCell(n, x, y) {
      if (y < n - 3) return y === n - 4 && (x === 1 || x === 2) ? 44 : -1;
      const h = (x * 31 + y * 17 + n * 7) % 11;
      if (h === 3 || h === 8) return -1;
      return [196, 150, 268, 0, 28][((x >> 1) + (y >> 1)) % 5];
    }
    function miniBoard(ctx, n, x, y, s, lit) {
      const c = s / n;
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath();
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)
        if (miniCell(n, i, j) < 0) ctx.rect(x + i * c + .7, y + j * c + .7, c - 1.4, c - 1.4);
      ctx.fill();
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const h = miniCell(n, i, j);
        if (h < 0) continue;
        ctx.fillStyle = 'hsl(' + h + ',' + (58 + lit * 26).toFixed(1) + '%,' + (45 + lit * 9).toFixed(1) + '%)';
        ctx.fillRect(x + i * c + .5, y + j * c + .5, c - 1, c - 1);
      }
    }

    /* the name in blocks: each letter set down like a piece, its blocks
       popping in from its middle, and a glint crossing it now and then */
    function drawTitle(ctx, cx, top) {
      const C = 16, S = C + 1.2, pad = Math.max(1.4, S * .055), bs = S - pad * 2;   // blocks a touch over their pitch, so the seams stay thin
      const gp = FK.t > 2.4 ? ((FK.t - 2.4) % 5.5) / 1.1 : 9, glx = cx - 240 + gp * 480;
      let li = 0;
      TWORDS.forEach((wd, wi) => {
        const word = wd[0], hues = wd[1];
        let cols = word.length - 1;
        for (const ch of word) cols += LTR[ch][0].length;
        let x = cx - cols * C / 2;
        const y = top + wi * (5 * C + 12);
        for (let i = 0; i < word.length; i++) {
          const g = LTR[word[i]], lw = g[0].length, t0 = .12 + li * .075, mid = (lw - 1) / 2;
          for (let r = 0; r < 5; r++) for (let c = 0; c < lw; c++) {
            if (g[r][c] !== '#') continue;
            const k = (FK.t - t0 - Math.hypot(c - mid, r - 2) * .03) / .24;
            if (k <= 0) continue;
            const bx = x + c * C, by = y + r * C;
            if (k < 1) {
              const d = S * (1 + (1 - easeBack(k)) * .3);
              ctx.save(); ctx.globalAlpha *= Math.min(1, k * 3);
              block(ctx, bx + C / 2 - d / 2, by + C / 2 - d / 2, d, hues[i], 0, 0);
              ctx.restore();
              continue;
            }
            block(ctx, bx - .6, by - .6, S, hues[i], 3, 0);
            const gl = 1 - Math.abs(bx + C / 2 - glx + (by - top) * .45) / 34;
            if (gl > 0) {
              ctx.fillStyle = 'rgba(255,255,255,' + (gl * .5).toFixed(3) + ')';
              rbox(ctx, bx - .6 + pad, by - .6 + pad, bs, bs, S * .26); ctx.fill();
            }
          }
          x += (lw + 1) * C;
          li++;
        }
      });
    }

    function drawMenu(ctx) {
      const out = FK.out, e = FK.eo(out), MX = 690;
      ctx.save();
      /* gone before the readout arrives, so the two never sit on each other */
      ctx.globalAlpha *= Math.max(0, 1 - out * 1.8);
      ctx.translate(e * 60, 0);

      drawTitle(ctx, MX, 60);
      FK.caps(ctx, 'Fill a line · clear it · no rotating', MX, 258, 10, P.ink3, 'center', { alpha: FK.in(1, .5), track: .24 });

      /* the board size, as three little boards */
      const party = api.party.inRoom, ck = FK.eo(FK.in(.55, .6));
      ctx.save(); ctx.globalAlpha *= ck; ctx.translate(0, (1 - ck) * 18);
      FK.caps(ctx, party ? 'Races are always 8 × 8' : 'Board size', MX, 288, 9.5,
              party ? '#ffcf7a' : 'rgba(148,163,184,.9)', 'center', { track: .3 });
      const cur = party ? '8' : FK.opt('size', '8'), CW = 128, CH = 116, CG = 12, cy = 300;
      const sp = FK.spring('osize', 0, 520, 24);
      [['8', 'Classic'], ['9', 'Roomy'], ['10', 'Huge']].forEach((c, i) => {
        const x = MX - (CW * 3 + CG * 2) / 2 + i * (CW + CG), on = cur === c[0];
        const b = FK.btn('opt:size:' + c[0], x, cy, CW, CH, !party);
        const sel = FK.glide('bsel' + i, on ? 1 : 0, 12), lift = b.h * 3 + sel * 2, q = on ? sp : 0;
        ctx.save();
        ctx.translate(x + CW / 2, cy + CH / 2 - lift);
        ctx.scale(1 - q * .05, 1 + q * .07);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; rbox(ctx, -CW / 2, -CH / 2 + 6 + lift, CW, CH, 13); ctx.fill();
        ctx.save();
        if (sel > .01) { ctx.shadowColor = 'rgba(90,140,240,' + (.55 * sel).toFixed(3) + ')'; ctx.shadowBlur = 24; }
        const fg = ctx.createLinearGradient(0, -CH / 2, 0, CH / 2);
        fg.addColorStop(0, '#1d2745'); fg.addColorStop(1, '#141b31');
        ctx.fillStyle = fg; rbox(ctx, -CW / 2, -CH / 2, CW, CH, 13); ctx.fill();
        ctx.restore();
        if (sel > .01) { ctx.fillStyle = 'rgba(90,140,240,' + (.16 * sel).toFixed(3) + ')'; rbox(ctx, -CW / 2, -CH / 2, CW, CH, 13); ctx.fill(); }
        ctx.strokeStyle = sel > .5 ? 'rgba(150,185,255,' + (.5 + .4 * sel).toFixed(3) + ')'
                                   : 'rgba(255,255,255,' + (.09 + b.h * .1).toFixed(3) + ')';
        ctx.lineWidth = 1 + sel;
        rbox(ctx, -CW / 2 + .5, -CH / 2 + .5, CW - 1, CH - 1, 12.5); ctx.stroke();
        miniBoard(ctx, +c[0], -29, -CH / 2 + 13, 58, sel);
        panelText(ctx, 0, -CH / 2 + 88, c[0] + ' × ' + c[0], 16, sel > .5 ? P.ink : P.ink2, 'center', 800);
        FK.caps(ctx, c[1], 0, -CH / 2 + 104, 8.5, sel > .5 ? '#9cc2ff' : P.ink3, 'center', { track: .26 });
        ctx.restore();
      });
      ctx.restore();

      /* your best, and the ways in */
      const best = api.best();
      if (best > 0) FK.caps(ctx, 'Best  ' + fmt(best), MX, 442, 10.5, '#ffe08a', 'center', { alpha: FK.in(.8, .5), track: .24 });
      const m = FK.mode(), pk = FK.bo(FK.in(.75, .6)), py = 458 + (1 - pk) * 40;
      const TH = { r: 28, face: Hud.FAM.sans, italic: false, weight: 800, shadow: 'rgba(0,0,0,.45)', gloss: false };
      const label = m === 'host' ? 'START RACE' : m === 'guest' ? 'WAITING FOR HOST' : 'PLAY';
      FK.button(ctx, 'play', MX - 214, py, 236, 58, label,
        Object.assign({}, TH, m === 'guest' ? { fill: ['#4b5261', '#3a3f4b'] }
                                             : { fill: ['hsl(150,80%,55%)', 'hsl(150,72%,36%)'], edge: 'hsla(150,90%,82%,.5)' }),
        { live: m !== 'guest', draw(c, w, h) {
            /* the same bright cap and dark lip every block has */
            c.fillStyle = 'rgba(255,255,255,.26)'; rr(c, -w / 2 + 12, -h / 2 + 5, w - 24, h * .28, 8); c.fill();
            c.fillStyle = 'rgba(0,0,0,.2)'; rr(c, -w / 2 + 12, h / 2 - 10, w - 24, 5, 2.5); c.fill();
            FK.text(c, label, 0, 1, m === 'guest' ? 15 : 19, '#fff', 'center', TH, { track: 3, shadow: 'rgba(0,0,0,.25)', sy: 2 });
          } });
      const P2 = api.party;
      FK.button(ctx, 'party', MX + 34, py, 180, 58, P2.inRoom ? 'PARTY · ' + P2.size : 'RACE A FRIEND',
        Object.assign({}, TH, { fill: ['#223056', '#18203a'], edge: 'rgba(255,255,255,.16)', shadow: 'rgba(0,0,0,.35)' }),
        { size: 14, track: 2 });
      FK.caps(ctx, 'Space to play   ·   P for a party   ·   Esc for the hub', W / 2, 582, 9, 'rgba(148,163,184,.6)', 'center',
              { alpha: FK.in(1.1, .5), track: .22 });
      ctx.restore();
      FK.cursor();
    }
    if (FK.on) seedBoard();

    /* ---- the results ----
       In the game's own materials: a row of glossy blocks drops in over the
       verdict and bursts, the score comes up in the gold the best is written
       in, what the run did sits on the navy cards the board sizes do, each
       with its own block, and the way back in is the green block button. */
    const BTH = { r: 26, face: Hud.FAM.sans, italic: false, weight: 800, shadow: 'rgba(0,0,0,.45)', gloss: false };
    const navyCard = (ctx, x, y, w, h, r) => {
      ctx.fillStyle = 'rgba(0,0,0,.32)'; rbox(ctx, x, y + 6, w, h, r); ctx.fill();
      const fg = ctx.createLinearGradient(0, y, 0, y + h);
      fg.addColorStop(0, '#1d2745'); fg.addColorStop(1, '#141b31');
      ctx.fillStyle = fg; rbox(ctx, x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; rbox(ctx, x + .5, y + .5, w - 1, h - 1, r - .5); ctx.stroke();
    };
    const RES_HUES = [196, 44, 268, 0, 150, 320, 28];
    const RES = {
      veil(ctx, k) { ctx.fillStyle = 'rgba(7,10,18,' + (.9 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); },
      hero(ctx, cx, top) {
        const R = FK.R, tight = R.paid.length > 4;
        /* the blocks: set down one by one, then a sweep of light along them */
        const S = 26, n = 7, bx0 = cx - n * S / 2;
        for (let i = 0; i < n; i++) {
          const k = (FK.rt() - .05 - i * .06) / .24;
          if (k <= 0) continue;
          const d = S * (k < 1 ? 1 + (1 - easeBack(k)) * .35 : 1);
          ctx.save(); ctx.globalAlpha *= Math.min(1, k * 3);
          block(ctx, bx0 + i * S + S / 2 - d / 2, top + 2 + S / 2 - d / 2, d, RES_HUES[i], k >= 1 ? 3 : 0, 0);
          ctx.restore();
        }
        const tk = FK.eo(FK.rs('title', undefined, .5));
        FK.text(ctx, String(R.title), cx, top + 58 + (1 - tk) * 10, tight ? 28 : 32, '#ffffff', 'center', BTH, { alpha: tk, shadow: 'rgba(0,0,0,.35)', sy: 3 });
        FK.caps(ctx, R.message, cx, top + 88, 10, P.ink3, 'center', { alpha: FK.eo(FK.rs('sub', undefined, .4)), track: .18 });
        const sk = FK.rs('stat', 0, .5), v = Math.round(R.score * FK.eo(FK.rs('stat', 0, .9))), big = tight ? 48 : 60;
        const sy = top + (tight ? 128 : 138);
        if (sk > 0) {
          ctx.save(); ctx.globalAlpha *= Math.min(1, sk * 2); ctx.translate(cx, sy);
          const sp = sk < 1 ? easeBack(sk) : 1; ctx.scale(sp, sp);
          FK.text(ctx, fmt(v), 0, 0, big, '#ffe08a', 'center', BTH, { shadow: 'rgba(0,0,0,.4)', sy: 4 });
          ctx.restore();
        }
        const ty = sy + big * .5 + 22, gk = FK.rs('tag', undefined, .45);
        if (R.isBest && gk > 0) {
          ctx.save(); ctx.translate(cx, ty); const tp = easeBack(gk); ctx.scale(tp, tp);
          const g = ctx.createLinearGradient(0, -14, 0, 14);
          g.addColorStop(0, 'hsl(150,85%,58%)'); g.addColorStop(1, 'hsl(150,72%,36%)');
          ctx.fillStyle = g; rbox(ctx, -66, -14, 132, 28, 9); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.3)'; rbox(ctx, -60, -12, 120, 8, 4); ctx.fill();
          FK.text(ctx, 'NEW BEST', 0, 1, 14, '#ffffff', 'center', BTH, { track: 2 });
          ctx.restore();
        } else if (gk > 0) FK.caps(ctx, (R.cheated ? 'Not saved  ·  ' : '') + 'Best  ' + fmt(R.best), cx, ty, 10, '#ffe08a', 'center', { alpha: FK.eo(gk), track: .24 });
        return ty + 16 - top;
      },
      stat(ctx, st, x, y, w, h, i) {
        navyCard(ctx, x, y, w, h, 13);
        block(ctx, x + 12, y + h / 2 - 11, 22, RES_HUES[(i + 2) % RES_HUES.length], 2, 0);
        FK.caps(ctx, st.label, x + 44, y + h / 2, 9, P.ink3, 'left', { track: .22 });
        FK.text(ctx, String(st.value), x + w - 16, y + h / 2 + 1, 20, P.ink, 'right', BTH);
      },
      card(ctx, x, y, w, h) {
        ctx.save(); ctx.shadowColor = 'rgba(90,140,240,.25)'; ctx.shadowBlur = 30;
        navyCard(ctx, x, y, w, h, 16);
        ctx.restore();
      },
      ls: FK.ledgerStyle({
        face: Hud.FAM.sans, weight: 700, ink: P.ink, mute: P.ink3, gold: '#ffe08a', rule: 'rgba(255,255,255,.08)',
        bar: 'rgba(255,255,255,.08)', fill: 'hsl(150,72%,48%)', rowH: 24, size: 14, lsize: 9.5, totalSize: 30,
        totalH: 42, xpH: 42, barH: 8, track: .22
      }),
      button(ctx, key, label, x, y, w, h, primary) {
        if (primary) FK.button(ctx, key, x, y, w, h, label,
          Object.assign({}, BTH, { fill: ['hsl(150,80%,55%)', 'hsl(150,72%,36%)'], edge: 'hsla(150,90%,82%,.5)' }),
          { draw(c, ww, hh) {
              c.fillStyle = 'rgba(255,255,255,.26)'; rr(c, -ww / 2 + 12, -hh / 2 + 5, ww - 24, hh * .28, 8); c.fill();
              c.fillStyle = 'rgba(0,0,0,.2)'; rr(c, -ww / 2 + 12, hh / 2 - 10, ww - 24, 5, 2.5); c.fill();
              FK.text(c, label, 0, 1, 18, '#fff', 'center', BTH, { track: 3, shadow: 'rgba(0,0,0,.25)', sy: 2 });
            } });
        else FK.button(ctx, key, x, y, w, h, label, Object.assign({}, BTH, { fill: ['#223056', '#18203a'], edge: 'rgba(255,255,255,.16)', shadow: 'rgba(0,0,0,.35)' }), { size: 14, track: 2 });
      },
      hint(ctx, cx, y) { FK.caps(ctx, 'Space to play again   ·   Esc for the hub', cx, y, 9, 'rgba(148,163,184,.6)', 'center', { track: .22 }); }
    };

    return {
      update(dt) {
        if (ended) return;
        /* on the front page the menu has the keys, and the board plays itself */
        if (FK.on) FK.input(api.input);
        if (flash > 0) flash = Math.max(0, flash - dt * 2.6);

        for (let i = clears.length - 1; i >= 0; i--) {
          const c = clears[i];
          c.t += dt;
          const k = c.t - c.delay;
          /* each block sounds a step up a pentatonic scale as it goes, so a
             clearing row is an arpeggio that resolves on the last block rather
             than the same click eight times */
          if (k >= 0 && !c.burst) {
            c.burst = true;
            burst(c.x, c.y, c.hue);
            if (!FK.on && !c.quiet) {
              Sound.clearStep(c.i, c.n);
              if (c.i === c.n - 1) Sound.clearEnd(c.lines);
            }
          }
          if (k > CLEAR_DUR) clears.splice(i, 1);
        }
        for (let i = settle.length - 1; i >= 0; i--) {
          settle[i].t += dt;
          if (settle[i].t - settle[i].delay > SETTLE_DUR) settle.splice(i, 1);
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i];
          q.life -= dt;
          if (q.life <= 0) { parts.splice(i, 1); continue; }
          if (q.ring) continue;
          q.vy += 520 * dt;
          q.vx *= (1 - 1.6 * dt);
          q.x += q.vx * dt; q.y += q.vy * dt;
          q.rot += q.vr * dt;
        }
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt * 1.25; if (pops[i].t <= 0) pops.splice(i, 1); }
        for (const p of tray) if (p && p.in < 1) p.in = Math.min(1, p.in + dt / .22);
        if (ret) { ret.t += dt / .18; if (ret.t >= 1) ret = null; }

        if (FK.on) { demo(dt); return; }
        /* the board is still growing into place from the menu */
        if (FK.out < 1) return;
        input(dt);

        if (stuck() && !drag && !ret) {
          dead += dt;
          if (dead > .6) {
            ended = true;
            if (RACE) RACE.finish(score);
            api.gameOver({
              score,
              title: RACE ? raceTitle(RACE, 'No room left') : 'No room left',
              message: 'Nothing left that fits. ' + linesTotal + ' line' + (linesTotal === 1 ? '' : 's') + ' cleared.',
              stats: [
                { label: 'Lines', value: linesTotal },
                { label: 'Pieces placed', value: placedCount },
                { label: 'Board', value: N + '×' + N }
              ].concat(RACE ? raceStats(RACE, score) : [])
            });
          }
        } else dead = 0;

        api.hud({ Score: score, Lines: linesTotal, Streak: streak });
      },

      render(ctx) { FK.frame(); paint(ctx); if (FK.R) FK.resultsPage(ctx, W, H, RES); },
      /* Escape on the front page goes back to the hub; in a game it pauses */
      escape: FK.escape,
      destroy() { FK.done(); },
      results(R) { FK.showResults(R); }
    };

    /* ---------------------------------------------------------- painting */
    /* Declared as functions, not consts: everything in this section sits below
       the `return` above, so a const here would still be in its dead zone when
       the first frame paints. */
    function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
    /* overshoot-and-settle. The two constants are not the same number: with one
       the curve starts at 1 instead of 0 and everything pops in already full
       size, which is exactly the tween not happening. */
    function easeBack(t) {
      t = clamp(t, 0, 1);
      const c1 = 1.6, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function rbox(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    /* a rounded slab lit from above: body gradient, a bright cap across the top
       third and a dark lip along the bottom */
    function block(ctx, x, y, s, hue, lift, glow) {
      const pad = Math.max(1.4, s * .055), r = s * .26;
      const bx = x + pad, by = y + pad, bs = s - pad * 2;
      if (bs <= 0) return;
      if (lift) {
        ctx.fillStyle = 'rgba(0,0,0,' + (0.34 * Math.min(1, lift / 8)).toFixed(3) + ')';
        rbox(ctx, bx + 1.5, by + lift, bs, bs, r); ctx.fill();
      }
      if (glow) {
        ctx.save();
        ctx.shadowColor = 'hsla(' + hue + ',95%,65%,.9)'; ctx.shadowBlur = glow;
      }
      const g = ctx.createLinearGradient(0, by, 0, by + bs);
      g.addColorStop(0, 'hsl(' + hue + ',88%,66%)');
      g.addColorStop(.52, 'hsl(' + hue + ',80%,52%)');
      g.addColorStop(1, 'hsl(' + hue + ',72%,36%)');
      ctx.fillStyle = g;
      rbox(ctx, bx, by, bs, bs, r); ctx.fill();
      if (glow) ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.30)';
      rbox(ctx, bx + bs * .13, by + bs * .10, bs * .74, bs * .30, r * .7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      rbox(ctx, bx + bs * .13, by + bs * .74, bs * .74, bs * .16, r * .5); ctx.fill();
      ctx.strokeStyle = 'hsla(' + hue + ',90%,80%,.45)';
      ctx.lineWidth = Math.max(1, s * .035);
      rbox(ctx, bx, by, bs, bs, r); ctx.stroke();
    }
    /* a block drawn about its own centre, for anything being scaled */
    function blockAt(ctx, cx, cy, s, hue, k, alpha, glow) {
      const d = s * k;
      if (d <= 0.5) return;
      ctx.save();
      if (alpha != null) ctx.globalAlpha = alpha;
      block(ctx, cx - d / 2, cy - d / 2, d, hue, 0, glow);
      ctx.restore();
    }

    function paint(ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#141c33'); bg.addColorStop(1, '#070a12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const gc = posePt(BX + BW / 2, BY + BW / 2);
      const gl = ctx.createRadialGradient(gc[0], gc[1], 30, gc[0], gc[1], 460);
      gl.addColorStop(0, 'rgba(90,140,240,.14)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);

      /* on the front page the board sits to one side, smaller */
      ctx.save(); boardPose(ctx);
      /* the board's own plate */
      ctx.fillStyle = 'rgba(255,255,255,.045)';
      rbox(ctx, FX - 14, FY - 14, FS + 28, FS + 28, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
      rbox(ctx, FX - 14, FY - 14, FS + 28, FS + 28, 20); ctx.stroke();
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,240,190,' + (flash * .07).toFixed(3) + ')';
        rbox(ctx, FX - 14, FY - 14, FS + 28, FS + 28, 20); ctx.fill();
      }

      const litR = drag && drag.lines ? drag.lines.rows : [];
      const litC = drag && drag.lines ? drag.lines.cols : [];
      const settling = new Map();
      for (const s of settle) settling.set(s.y * N + s.x, s);

      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = BX + x * CELL, py = BY + y * CELL;
        const hot = litR.indexOf(y) >= 0 || litC.indexOf(x) >= 0;
        ctx.fillStyle = hot ? 'rgba(255,238,170,.20)' : 'rgba(0,0,0,.32)';
        const sockK = sockIn(x, y);
        if (sockK >= 1) { rbox(ctx, px + 3, py + 3, CELL - 6, CELL - 6, CELL * .22); ctx.fill(); }
        else if (sockK > 0) { const d = (CELL - 6) * easeBack(sockK); rbox(ctx, px + CELL / 2 - d / 2, py + CELL / 2 - d / 2, d, d, d * .22); ctx.fill(); }
        if (grid[y][x] < 0) continue;
        const st = settling.get(y * N + x);
        if (st) {
          const k = (st.t - st.delay) / SETTLE_DUR;
          if (k < 0) continue;                       // still on its way in
          blockAt(ctx, px + CELL / 2, py + CELL / 2, CELL, grid[y][x],
                  1 + (1 - easeBack(k)) * .22, Math.min(1, k * 3));
        } else block(ctx, px, py, CELL, grid[y][x], 0, 0);
      }

      /* blocks on their way out, one at a time */
      for (const c of clears) {
        const k = (c.t - c.delay) / CLEAR_DUR;
        const px = BX + c.x * CELL + CELL / 2, py = BY + c.y * CELL + CELL / 2;
        if (k < 0) { block(ctx, BX + c.x * CELL, BY + c.y * CELL, CELL, c.hue, 0, 0); continue; }
        if (k > 1) continue;
        /* a quick swell, then it shrinks away and the white takes over */
        const s = k < .28 ? 1 + k / .28 * .18 : 1.18 * (1 - (k - .28) / .72);
        blockAt(ctx, px, py, CELL, c.hue, Math.max(0, s), 1 - k * .35, 16 * (1 - k));
        if (k < .55) {
          const a = (1 - k / .55) * .8;
          const d = CELL * Math.max(0, s) * .82;
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
          rbox(ctx, px - d / 2, py - d / 2, d, d, d * .26); ctx.fill();
        }
      }

      /* debris */
      for (const q of parts) {
        const a = clamp(q.life / q.max, 0, 1);
        if (q.ring) {
          const k = 1 - a, r = q.r0 + (q.r1 - q.r0) * easeOut(k);
          ctx.strokeStyle = 'hsla(' + q.hue + ',95%,72%,' + (a * .55).toFixed(3) + ')';
          ctx.lineWidth = Math.max(1, CELL * .07 * a);
          ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.stroke();
          continue;
        }
        ctx.save();
        ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'hsl(' + q.hue + ',88%,' + (58 + (1 - a) * 16) + '%)';
        rbox(ctx, -q.s / 2, -q.s / 2, q.s, q.s, q.s * .3); ctx.fill();
        ctx.restore();
      }

      /* the ghost under the held piece */
      if (drag && tray[drag.slot]) {
        const piece = tray[drag.slot];
        for (const [cx, cy] of piece.cells) {
          const gx = drag.gx + cx, gy = drag.gy + cy;
          if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
          const px = BX + gx * CELL, py = BY + gy * CELL;
          if (drag.valid) {
            ctx.save(); ctx.globalAlpha = .42; block(ctx, px, py, CELL, piece.hue, 0, 0); ctx.restore();
          } else {
            ctx.fillStyle = 'rgba(230,70,70,.28)';
            rbox(ctx, px + 3, py + 3, CELL - 6, CELL - 6, CELL * .22); ctx.fill();
          }
        }
      }

      /* the three bays */
      for (let i = 0; i < 3; i++) {
        const b = trayBox(i), piece = tray[i];
        const held = (drag && drag.slot === i) || (ret && ret.slot === i);
        ctx.fillStyle = 'rgba(255,255,255,.035)';
        rbox(ctx, b.x + 7, b.y, b.w - 14, b.h, 14); ctx.fill();
        if (!piece || held) continue;
        const dead2 = !anyFit(piece);
        const s = trayScale(piece), sz = sizeOf(piece.cells);
        /* new pieces arrive with a small rise rather than appearing */
        const k = easeBack(piece.in);
        const ox = b.x + b.w / 2 - sz.w * s / 2, oy = b.y + b.h / 2 - sz.h * s / 2 + (1 - piece.in) * 10;
        ctx.save();
        ctx.globalAlpha = (dead2 ? .30 : 1) * Math.min(1, piece.in * 2.2);
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        ctx.scale(k, k);
        ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
        for (const [cx, cy] of piece.cells) block(ctx, ox + cx * s, oy + cy * s, s, piece.hue, 0, 0);
        ctx.restore();
      }

      /* the held piece: it grows from bay size to board size as you lift it */
      if (drag && tray[drag.slot]) {
        const piece = tray[drag.slot], p = drag.at || api.input.pointer;
        const g0 = trayScale(piece), k = easeOut(drag.grow);
        const s = g0 + (CELL - g0) * k;
        const sz = sizeOf(piece.cells);
        const tx = p.x, ty = p.y - CELL * .85 * k;
        const ox = tx - sz.w * s / 2, oy = ty - sz.h * s / 2;
        ctx.save(); ctx.globalAlpha = .97;
        for (const [cx, cy] of piece.cells) block(ctx, ox + cx * s, oy + cy * s, s, piece.hue, 3 + 4 * k, 0);
        ctx.restore();
      }
      /* ...and flies home if it had nowhere to go */
      if (ret && tray[ret.slot]) {
        const piece = tray[ret.slot], k = easeOut(ret.t);
        const g0 = trayScale(piece);
        const s = g0 + (CELL - g0) * (1 - k) * ret.grow;
        const sz = sizeOf(piece.cells);
        const tx = ret.x + (ret.tx - ret.x) * k, ty = ret.y + (ret.ty - ret.y) * k;
        const ox = tx - sz.w * s / 2, oy = ty - sz.h * s / 2;
        ctx.save(); ctx.globalAlpha = .95;
        for (const [cx, cy] of piece.cells) block(ctx, ox + cx * s, oy + cy * s, s, piece.hue, 2, 0);
        ctx.restore();
      }

      for (const p of pops) {
        const k = 1 - p.t;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.t * 1.9);
        panelText(ctx, p.x, p.y - k * 30, p.s, p.big ? 27 : 15,
                  p.big ? '#ffe08a' : '#cfe9ff', 'center', 800);
        ctx.restore();
      }

      ctx.restore();
      /* the readout comes in as the menu goes */
      if (FK.out > 0) {
        ctx.save(); ctx.globalAlpha *= clamp(FK.out * 1.8 - .8, 0, 1); ctx.translate((1 - FK.eo(FK.out)) * 40, 0);
        drawPanel(ctx);
        ctx.restore();
      }
      if (FK.out < 1) drawMenu(ctx);
    }

    /* the readout column - the same height as the board so the frame reads as
       two columns rather than a board with a gap next to it */
    function drawPanel(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      rbox(ctx, PX, PY - 14, PW, PH + 28, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      rbox(ctx, PX, PY - 14, PW, PH + 28, 20); ctx.stroke();

      const ix = PX + 26;
      panelText(ctx, ix, PY + 22, 'SCORE', 10.5, P.ink3, 'left', 700);
      panelText(ctx, ix, PY + 58, fmt(score), 44, P.ink, 'left', 800);

      /* three small cards, so the column has structure instead of a list */
      const cw = (PW - 52 - 16) / 3, cy = PY + 90;
      const cards = [['LINES', String(linesTotal)], ['STREAK', streak > 0 ? '×' + streak : '—'],
                     ['PIECES', String(placedCount)]];
      cards.forEach(([lab, val], i) => {
        const cx = ix + i * (cw + 8);
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        rbox(ctx, cx, cy, cw, 52, 12); ctx.fill();
        panelText(ctx, cx + cw / 2, cy + 17, lab, 9, P.ink3, 'center', 700);
        panelText(ctx, cx + cw / 2, cy + 36, val, 17,
                  lab === 'STREAK' && streak > 1 ? '#ffe08a' : P.ink, 'center', 800);
      });

      let y = cy + 70;
      if (RACE) { raceBoard(ctx, ix, y, RACE, { title: 'RACE', w: PW - 52 }); return; }

      /* solo: what just happened, then the one rule worth repeating */
      panelText(ctx, ix, y + 12, 'LAST CLEAR', 9.5, P.ink3, 'left', 700);
      panelText(ctx, ix, y + 34, lastClear || 'nothing yet', 15,
                lastClear ? '#8fe0a0' : P.ink3, 'left', 700);

      y += 66;
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      rbox(ctx, ix, y, PW - 52, 78, 12); ctx.fill();
      panelText(ctx, ix + 14, y + 22, 'NO ROTATING', 10, '#ffcf7a', 'left', 800);
      panelText(ctx, ix + 14, y + 42, 'Every piece has to go', 12, P.ink2, 'left', 500);
      panelText(ctx, ix + 14, y + 58, 'somewhere. Plan the gaps.', 12, P.ink2, 'left', 500);

      const bottom = PY + PH - 24;
      panelText(ctx, ix, bottom, N + ' × ' + N + ' board', 11, P.ink3, 'left', 600);
      panelText(ctx, PX + PW - 26, bottom, 'BEST ' + fmt(Math.max(best, score)), 11, P.ink3, 'right', 600);
    }
  }
});


