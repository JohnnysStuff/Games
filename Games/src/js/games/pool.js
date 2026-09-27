/* ========================================================== 8-BALL ======= */
registerGame({
  id: 'pool',
  title: '8-Ball Pool',
  tagline: 'Rack em up. Real cushion physics, ghost-ball aiming and a full 8-ball rulebook — fouls, ball-in-hand and all.',
  tags: ['Sports', 'Versus', 'Online'],
  scoreLabel: 'Score',
  bars: 'hub',
  front: true,
  tiles: [['15', 'Balls'], ['6', 'Pockets'], ['8', 'To win on']],
  mp: 'duel',
  mpMin: 2, mpMax: 2,
  controls: [['Aim', 'Move the mouse'], ['Draw the cue', 'Drag back &amp; forth'], ['Strike', 'Release'], ['Top &amp; bottom spin', 'Hold W / S as you strike'], ['Side spin', 'Hold A / D as you strike'], ['Ball in hand', 'Click to place'], ['Pause', 'Esc']],
  options: [
    { id: 'bot', label: 'Difficulty', def: 'normal', choices: [
      { v: 'easy',   l: 'Casual',   desc: 'Forgiving.' },
      { v: 'normal', l: 'Sharp',    desc: 'A real match.' },
      { v: 'hard',   l: 'Ruthless', desc: 'It rarely misses.' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="plB" cx=".5" cy=".42" r=".85"><stop offset="0" stop-color="#12503a"/><stop offset="1" stop-color="#04140f"/></radialGradient><radialGradient id="pl8" cx=".34" cy=".28"><stop offset="0" stop-color="#6a7382"/><stop offset=".4" stop-color="#1d222c"/><stop offset="1" stop-color="#05070b"/></radialGradient><radialGradient id="plC" cx=".34" cy=".28"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f0f4f8"/><stop offset="1" stop-color="#a8b4c0"/></radialGradient><linearGradient id="plCue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5c3a1c"/><stop offset=".7" stop-color="#c69a5e"/><stop offset="1" stop-color="#efe0c4"/></linearGradient></defs><rect width="320" height="180" fill="url(#plB)"/><ellipse cx="160" cy="100" rx="150" ry="76" fill="#1a6b4c" opacity=".45"/><g opacity=".9"><rect x="8" y="8" width="304" height="164" rx="16" fill="none" stroke="#5a3a1e" stroke-width="10"/><rect x="8" y="8" width="304" height="164" rx="16" fill="none" stroke="#8a5a2e" stroke-width="4"/></g><g><path d="M232 44l74-30" stroke="#2a1a0c" stroke-width="11" stroke-linecap="round" opacity=".5"/><path d="M230 42l76-30" stroke="url(#plCue)" stroke-width="8" stroke-linecap="round"/><circle cx="230" cy="42" r="4.6" fill="#6fb7ff"/></g><g transform="translate(206 60)"><ellipse cy="20" rx="19" ry="6" fill="#000" opacity=".45"/><circle r="19" fill="url(#plC)"/><ellipse cx="-6" cy="-7" rx="7" ry="4.6" fill="#fff" opacity=".9" transform="rotate(-30 -6 -7)"/></g><g transform="translate(126 104)"><ellipse cy="42" rx="44" ry="12" fill="#000" opacity=".55"/><circle r="42" fill="url(#pl8)"/><ellipse cx="-14" cy="-17" rx="15" ry="10" fill="#ffffff" opacity=".30" transform="rotate(-30 -14 -17)"/><circle r="18" fill="#ffffff"/><text x="0" y="7" font-family="Georgia,serif" font-size="24" font-weight="700" fill="#12161d" text-anchor="middle">8</text></g><g><circle cx="52" cy="46" r="15" fill="#e0a416"/><circle cx="47" cy="41" r="4.6" fill="#fff" opacity=".45"/><circle cx="66" cy="146" r="13" fill="#d0392c"/><circle cx="62" cy="142" r="4" fill="#fff" opacity=".4"/><circle cx="268" cy="140" r="14" fill="#8b5cf6"/><circle cx="264" cy="136" r="4.2" fill="#fff" opacity=".4"/></g></svg>',
  mount(api) {
    const W = 960, H = 600;
    /* ---- table geometry ---- */
    const TX = 116, TY = 146, TW = 728, TH = 364;     // felt rectangle
    const R = 11, POCK = 25;
    const POCKETS = [
      [TX, TY], [TX + TW / 2, TY - 4], [TX + TW, TY],
      [TX, TY + TH], [TX + TW / 2, TY + TH + 4], [TX + TW, TY + TH]
    ];
    const MPS = getSession('pool');
    const HOSTMP = !MPS || MPS.role === 'host';
    const GUEST = !!(MPS && MPS.role === 'guest');
    const MYID = MPS ? MPS.me : 'you';
    const PLAYERS = MPS && MPS.players && MPS.players.length >= 2
      ? MPS.players.slice(0, 2)
      : [{ id: MYID, name: 'You' }, { id: 'bot', name: 'Shark' }];
    const MYSEAT = Math.max(0, PLAYERS.findIndex(p => p.id === MYID));
    const SOLO = !MPS;
    /* how cleanly the shark strikes the line it has worked out (radians of aim, fraction of power):
       about three pots in ten, five in ten, and seven in ten from anywhere on the table */
    const BOT = { easy: { err: .02, pow: .22 }, normal: { err: .0045, pow: .13 }, hard: { err: .0015, pow: .07 } }
      [api.opt('bot') || 'normal'] || { err: .0045, pow: .13 };
    const SEATCOL = ['#d9ed9a', '#ebaf86'];
    /* The table is always the 3D one. The flat painting below is no longer a
       choice anyone makes — it is only what a machine that cannot manage
       WebGL, or a view that fails to build, is left with. */
    const G3 = Gfx3D.get();
    let V3 = null;

    /* ---- the set you have racked ----
       A set is a rule for turning the house numbers into its own, so the
       numbers, the stripes and the eight all stay where the rules of the game
       expect them. The rule itself lives in Cos, next to the item, because the
       swatch in the menu has to draw the same balls this table racks — held in
       two places they drifted, and the Planets icon was an orange-and-blue
       marble while the Planets cue ball was a plain orange sphere.

       Everything that draws a ball — the table, the rail chips, the ball
       flying up to the plaque — goes through colOfNum, so wearing a set
       changes all of them at once. */
    let BALLSET = Cos.look('pool', 'ball') || { id: 'p.ball.house' };
    let SET = Cos.ballSet(BALLSET.id);
    /* The cue ball keeps its ivory and carries the set as six spots, rather
       than being painted in it: tinted faintly it read as nothing changed, and
       tinted strongly it came out a solid sphere indistinguishable from an
       object ball. The house set has no spots — plain white IS the house
       look — and `pip` is null there. */
    let CUEBALL = SET.pip ? [SET.cue, SET.pip] : null;
    const colOfNum = n => n === 0 ? SET.cue : SET.col(n);
    /* the nameplate is the account's, not the game's — it dresses your own
       plaque at the end of the table */
    let PLATE = Cos.look('pool', 'plate') || { a: '#8a8177', b: '#2a2822' };
    const isStripe = n => n > 8;
    const groupOf = n => n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solid' : 'stripe';

    /* ---- state ---- */
    let balls = [], state = 'aim', turn = 0, groups = [null, null], open = true;
    let aim = 0, power = 0, msg = '', msgT = 0, banner = 'Break!';
    /* per-seat chip animation: keeps a ball on the rail for a beat after it
       is potted so it can shrink away instead of vanishing between frames */
    const chipFx = [{}, {}];
    /* Everything the furniture needs to move: it lives up here with the rest
       of the state because the painting below the mount's return is only
       ever reached as functions, never run top to bottom. */
    const BRASS = '#d9bd83', CHALK = '#faf3e3';
    /* The room wears the festival's interface, the same as the golf course:
       tiles, condensed capitals, yellow on whoever is at the table. */
    const FH = Hud.FH;
    function fhFit(ctx, txt, maxW, size, o) {
      txt = String(txt).toUpperCase();
      if (FH.capW(ctx, txt, size, o) <= maxW) return txt;
      while (txt.length > 1 && FH.capW(ctx, txt + '…', size, o) > maxW) txt = txt.slice(0, -1);
      return txt + '…';
    }
    const UI = {
      t: 0, last: 0, dt: 0,
      lit: 0, lamp: [0, 0],                 // which plaque the lamp is over, and how lit each is
      pow: 0, powHold: 0
    };
    /* Draw-back stroke: press, pull the cursor away from the ball, slide it
       back and forth to dial the power in, release to strike. The aim locks
       the moment you press so the pull can never twist the shot. */
    const MAXPULL = 158;
    let stroking = false, strokeOx = 0, strokeOy = 0, pullDist = 0;
    function updateStroke(pt) {
      if (!pt.down) {
        if (!stroking) return null;
        stroking = false;
        const p = power;
        power = 0; pullDist = 0;
        return p > .06 ? p : null;          // pushed back to the ball = cancelled
      }
      if (!stroking) { stroking = true; strokeOx = pt.x; strokeOy = pt.y; pullDist = 0; power = 0; return null; }
      // only the component along the cue's axis counts, so sideways wobble
      // doesn't change the power
      const back = -((pt.x - strokeOx) * Math.cos(aim) + (pt.y - strokeOy) * Math.sin(aim));
      pullDist = clamp(back, 0, MAXPULL);
      power = pullDist / MAXPULL;
      return null;
    }
    let firstHit = null, potted = [], railHit = false, ballInHand = false, breakDone = false;
    let ending = false, endT = 0, winner = -1, foulMsg = '', shots = 0, myPots = 0;
    let botT = 0, netT = 0, lastCmd = '', sendT = 0, lastSnapRef = null, settleT = 0;
    const nb = NetBuf(110);           // a rolling table is sent every 60ms; this covers a late one
    const evQ = [];

    function rack() {
      balls = [];
      balls.push(mkBall(0, TX + TW * .26, TY + TH / 2));
      /* Tight, every ball all but touching its neighbours, as a racked
         triangle really is — the break has to go through the whole knot.
         No rack is perfect, though: each ball sits a hair off its spot, and
         that hair is why no two breaks spread the same way. */
      const order = [[1], [9, 2], [10, 8, 3], [11, 7, 14, 4], [12, 5, 13, 6, 15]];
      const apex = TX + TW * .70, cy = TY + TH / 2, dx = R * Math.sqrt(3) + .15, dy = R * 2 + .15;
      order.forEach((row, i) => row.forEach((n, j) => {
        balls.push(mkBall(n, apex + i * dx + (Math.random() - .5) * .3, cy + (j - i / 2) * dy + (Math.random() - .5) * .3));
      }));
    }

    const cue = () => balls[0];
    const live = () => balls.filter(b => !b.in);
    const remaining = seat => {
      const g = groups[seat];
      if (!g) return balls.filter(b => !b.in && b.n !== 0 && b.n !== 8).length;
      return balls.filter(b => !b.in && groupOf(b.n) === g).length;
    };
    const onEight = seat => groups[seat] && remaining(seat) === 0;
    function say(t) { msg = t; msgT = 3.2; }

    /* ---------------------------------------------------- physics ------- */
    /* Every ball carries its spin as well as its speed. Struck, a ball
       slides: the cloth drags on the spot where it touches, which turns the
       spin toward a natural roll and slows the ball with it, until the two
       agree and it rolls. So a centre hit stops dead on a full hit at short
       range and follows through from further away, top spin runs on, back
       spin draws back, and none of it is scripted. The cushions are the
       rails exactly as drawn, jaws and all, and a pocket is a hole with an
       edge: a ball drops only by going over that edge, a ball struck at a
       jaw rattles off it, and nothing is ever pulled in.
       (Spin is in rad/s about the table's own axes, with the third one
       pointing down into the slate; the cloth touches a ball at R below its
       middle, so rolling along (vx, vy) is wx = vy/R, wy = -vx/R.) */
    const MU_S = 560, MU_R = 100;     // cloth drag on a sliding ball, and rolling resistance (units/s²)
    const MU_B = .06, MU_C = .2;      // grip between two balls, and of the cushion rubber
    const SPIN_OFF = 30, FALL = 2800;
    /* The cushion noses along the felt edge, each ending in two jaws cut
       back 12 off the felt and slanting 9 toward the pocket — the same
       shape the painted and the 3D tables are built from. */
    const MOUTH = POCK + 9, JAWD = 12, JAWS = 9;
    const SEGS = [];
    for (const [x0, y0, x1, y1, nx, ny] of [
      [TX + MOUTH, TY, TX + TW / 2 - MOUTH + 4, TY, 0, 1], [TX + TW / 2 + MOUTH - 4, TY, TX + TW - MOUTH, TY, 0, 1],
      [TX + MOUTH, TY + TH, TX + TW / 2 - MOUTH + 4, TY + TH, 0, -1], [TX + TW / 2 + MOUTH - 4, TY + TH, TX + TW - MOUTH, TY + TH, 0, -1],
      [TX, TY + MOUTH, TX, TY + TH - MOUTH, 1, 0], [TX + TW, TY + MOUTH, TX + TW, TY + TH - MOUTH, -1, 0]]) {
      const ux = Math.sign(x1 - x0), uy = Math.sign(y1 - y0);      // along the nose; (nx, ny) points onto the felt
      SEGS.push([x0, y0, x1, y1],
                [x0, y0, x0 - ux * JAWS - nx * JAWD, y0 - uy * JAWS - ny * JAWD],
                [x1, y1, x1 + ux * JAWS - nx * JAWD, y1 + uy * JAWS - ny * JAWD]);
    }
    const mkBall = (n, x, y) => ({ n, x, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, z: 0, vz: 0, slide: false, in: false });
    function halt(b) { b.vx = b.vy = b.wx = b.wy = b.wz = b.vz = b.z = 0; b.slide = false; }

    /* Ball to ball. Balls meet through a stiff, very slightly damped
       spring, and the table is stepped finely enough to follow a contact
       through: a blow lasts about a millisecond and a half and gives back
       95% of the speed it takes. That is what lets a break travel through
       a tight rack the way it really does — every ball pushing on every
       ball it touches at once — where settling one pair at a time runs the
       whole blow down a single line of centres like a Newton's cradle. A
       lone collision comes out the same as the textbook one. */
    const KB = 2.2e6, CB = 34;              // per unit mass, per ball: ω₀ = √(2·KB) ≈ 2100/s, ζ ≈ .016
    const touching = new Set();              // pairs in contact last substep, so a new hit clicks once
    let SIM = false;                         // trying a shot out on the quiet: no sounds, sparks or messages
    function stepPhysics(dt) {
      /* Fine steps only while two balls could meet within this frame — a
         contact has to be followed through; the rest of the time a ball
         moves less than half its radius a step and four are plenty. */
      let vmax = 0, fine = false;
      for (const b of balls) if (!b.in) vmax = Math.max(vmax, Math.abs(b.vx) + Math.abs(b.vy));
      const reach = 2 * R + 2 * vmax * dt + 1;
      near: for (let i = 0; i < balls.length; i++) {
        const a = balls[i]; if (a.in) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j]; if (b.in) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          if (dx * dx + dy * dy < reach * reach) { fine = true; break near; }
        }
      }
      const SUB = fine ? Math.max(4, Math.ceil(dt / .00025)) : 4, h = dt / SUB;
      for (let s = 0; s < SUB; s++) {
        for (const b of balls) if (!b.in) { b.x += b.vx * h; b.y += b.vy * h; }
        contacts(h);
        for (const b of balls) {
          if (b.in) continue;
          cloth(b, h);
          /* only a ball near the edge of the bed can reach a cushion or a hole */
          if (b.x < TX + R + 2 || b.x > TX + TW - R - 2 || b.y < TY + R + 2 || b.y > TY + TH - R - 2 || b.z < 0 || b.vz) {
            for (const sg of SEGS) cushionHit(b, sg);
            pocketEdge(b, h);
            if (b.in) continue;
          }
          /* keep strays inside the outer box no matter what */
          b.x = clamp(b.x, TX - POCK, TX + TW + POCK);
          b.y = clamp(b.y, TY - POCK, TY + TH + POCK);
        }
      }
    }
    function contacts(h) {
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i]; if (a.in) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j]; if (b.in) continue;
          const dx = b.x - a.x, dy = b.y - a.y, key = i * 32 + j;
          if (dx >= 2 * R || dx <= -2 * R || dy >= 2 * R || dy <= -2 * R) { touching.delete(key); continue; }
          const d2 = dx * dx + dy * dy;
          if (d2 >= 4 * R * R || Math.abs(a.z - b.z) > R) { touching.delete(key); continue; }   // apart, or one is already down a hole
          const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
          if (vn > -2 && !a.slide && !b.slide && a.vx * a.vx + a.vy * a.vy < 25 && b.vx * b.vx + b.vy * b.vy < 25) {
            /* two balls that have come to rest pressed together are eased
               apart where they lie — a spring there would only fight the
               cloth for ever and nothing would ever settle */
            const o = (2 * R - d) / 2;
            a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
            continue;
          }
          if (!touching.has(key)) { touching.add(key); impact(a, b, vn); }
          const jn = Math.max(0, KB * (2 * R - d) - CB * vn) * h;   // this substep's push, per unit mass
          if (!jn) continue;
          a.vx -= jn * nx; a.vy -= jn * ny;
          b.vx += jn * nx; b.vy += jn * ny;
          /* Throw. The surfaces grip while they are pressed together, so a
             cut drags the object ball a touch off the line of centres, and
             side spin on the cue ball throws it the other way — why a thin
             cut never goes quite where the geometry says, and why players
             allow for it. The grip trades a little spin between the two. */
          const tx = -ny, ty = nx;
          const vt = rvx * tx + rvy * ty - R * (a.wz + b.wz);
          const cap = MU_B * jn, jt = clamp(-vt / 7, -cap, cap);
          b.vx += jt * tx; b.vy += jt * ty; a.vx -= jt * tx; a.vy -= jt * ty;
          a.wz -= 2.5 * jt / R; b.wz -= 2.5 * jt / R;
          /* the spin each carried in is untouched by the hit, so both now
             slide: a stunned cue ball stops, one with top rolls on after
             the object ball, one with bottom comes back */
          a.slide = b.slide = true;
        }
      }
    }
    function impact(a, b, vn) {
      if (a.n === 0 && firstHit === null) firstHit = b.n;
      if (b.n === 0 && firstHit === null) firstHit = a.n;
      if (SIM) return;
      const loud = Math.min(1, -vn / 500);
      if (loud > .12) { Sound.thud(); burst((a.x + b.x) / 2, (a.y + b.y) / 2, { color: '#ffffff', count: 2 + (loud * 4 | 0), speed: 60 + loud * 90, size: 2, life: .18 + loud * .12, grav: 0 }, { z: R, up: 70 * loud }); }
    }
    /* The cloth. Sliding, it drags on the contact point — which closes the
       slip 7/2 times as fast as it slows the ball, so a ball always ends up
       rolling — then rolling resistance takes over. Side spin wears off on
       its own. */
    function cloth(b, h) {
      if (b.z < 0 || b.vz) return;                        // in the air over a hole
      const ux = b.vx + R * b.wy, uy = b.vy - R * b.wx, u = Math.hypot(ux, uy), dv = MU_S * h;
      if (u > .5) {
        if (u <= 3.5 * dv) { b.vx -= ux * 2 / 7; b.vy -= uy * 2 / 7; b.wx = b.vy / R; b.wy = -b.vx / R; b.slide = false; }
        else {
          const k = dv / u;
          b.vx -= ux * k; b.vy -= uy * k;
          b.wx += 2.5 * uy * k / R; b.wy -= 2.5 * ux * k / R;
          b.slide = true;
        }
      } else {
        const v = Math.hypot(b.vx, b.vy);
        if (v > 0) {
          const nv = v - MU_R * h;
          if (nv < 5) { b.vx = b.vy = 0; } else { b.vx *= nv / v; b.vy *= nv / v; }
        }
        b.wx = b.vy / R; b.wy = -b.vx / R;
        b.slide = false;
      }
      if (b.wz) { const d = SPIN_OFF * h; b.wz = Math.abs(b.wz) <= d ? 0 : b.wz - Math.sign(b.wz) * d; }
      b.roll = (b.roll || 0) + Math.hypot(b.vx, b.vy) * h / (TAU * R);   // surface travel, in circumferences
    }
    /* A cushion or a jaw: a segment the ball meets anywhere along it, its
       ends included, so a ball can clip the point of a jaw and kick off it.
       Rubber, not a mirror: a square hit sinks in and comes back deader
       than a glancing one. The rubber grips the spot it touches, so side
       spin drives the ball along the rail — running english opens the
       angle, reverse closes it — and most of the roll a ball carries into
       the rail is spent there, so it comes off skidding. */
    function cushionHit(b, sg) {
      const ax = sg[0], ay = sg[1], ex = sg[2] - ax, ey = sg[3] - ay;
      let t = ((b.x - ax) * ex + (b.y - ay) * ey) / (ex * ex + ey * ey);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      let nx = b.x - (ax + ex * t), ny = b.y - (ay + ey * t);
      const d = Math.hypot(nx, ny);
      if (d >= R || d < 1e-6) return;
      nx /= d; ny /= d;
      b.x += nx * (R - d); b.y += ny * (R - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn >= 0) return;
      const sp = Math.hypot(b.vx, b.vy), e = .93 - .15 * (-vn / sp);
      const jn = -(1 + e) * vn, tx = -ny, ty = nx;
      const ut = b.vx * tx + b.vy * ty - b.wz * R;          // the contact point sliding along the rail
      const cap = MU_C * jn, jt = clamp(-ut * 2 / 7, -cap, cap);
      b.vx += nx * jn + tx * jt; b.vy += ny * jn + ty * jt;
      b.wz -= 2.5 * jt / R;
      /* the roll it brought in, turned back a little by the nose */
      const wvx = -R * b.wy, wvy = R * b.wx, wn = wvx * nx + wvy * ny;
      const rx = wvx - 1.35 * wn * nx, ry = wvy - 1.35 * wn * ny;
      b.wx = ry / R; b.wy = -rx / R;
      b.slide = true;
      if (firstHit !== null) railHit = true;              // a rail only counts after contact
      if (-vn > 60 && !SIM) Sound.blip();
    }
    /* The pocket is a hole with an edge. A ball whose middle is over the
       cloth is held up by it, however far it hangs over the hole; once its
       middle is over the hole nothing holds it but the edge, so it falls,
       and the edge is all it can touch on the way: it tips in over the near
       side, skims across and climbs out if it is going fast enough, or
       meets the far side and drops. Only a ball that has gone down past the
       edge is potted. */
    function pocketEdge(b, h) {
      let p = null, pd = 1e9;
      for (const q of POCKETS) { const d = Math.hypot(b.x - q[0], b.y - q[1]); if (d < pd) { pd = d; p = q; } }
      const off = b.x < TX || b.x > TX + TW || b.y < TY || b.y > TY + TH;   // out past the line of the cushion noses
      if (pd >= POCK && !off && b.z >= 0 && !b.vz) return;  // on the cloth, however far it hangs over the edge
      if (pd >= POCK + R) {
        b.z = 0; b.vz = 0;                                   // clear of the hole: the cloth has it
        if (off) {
          /* into the rail with no hole near — never meant to happen, but
             if it does it goes back onto the bed, not through the wood */
          if (b.x < TX + R) { b.x = TX + R; b.vx = Math.abs(b.vx) * .5; }
          if (b.x > TX + TW - R) { b.x = TX + TW - R; b.vx = -Math.abs(b.vx) * .5; }
          if (b.y < TY + R) { b.y = TY + R; b.vy = Math.abs(b.vy) * .5; }
          if (b.y > TY + TH - R) { b.y = TY + TH - R; b.vy = -Math.abs(b.vy) * .5; }
        }
        return;
      }
      if (pd < POCK) { b.vz -= FALL * h; b.z += b.vz * h; }
      const ox = pd > 1e-6 ? (b.x - p[0]) / pd : 1, oy = pd > 1e-6 ? (b.y - p[1]) / pd : 0;
      const rx = p[0] + ox * POCK, ry = p[1] + oy * POCK;   // the nearest point of the edge
      let dx = b.x - rx, dy = b.y - ry, dz = R + b.z;        // from there to the ball's middle
      const dd = Math.hypot(dx, dy, dz);
      if (dd < R && dd > 1e-6) {
        dx /= dd; dy /= dd; dz /= dd;
        b.x = rx + dx * R; b.y = ry + dy * R; b.z = dz * R - R;
        const vn = b.vx * dx + b.vy * dy + b.vz * dz;
        if (vn < 0) { b.vx -= 1.25 * vn * dx; b.vy -= 1.25 * vn * dy; b.vz -= 1.25 * vn * dz; }
      }
      /* The back of the pocket — the lined throat below the slate and the
         rail's facing above it — stands round the side of the hole away
         from the bed: whatever is in there stays in there, even a ball
         that kicked up off the edge and flew. */
      if (off) {
        const back = POCK - R * .6, rx2 = b.x - p[0], ry2 = b.y - p[1], d2 = Math.hypot(rx2, ry2);
        if (d2 > back) {
          const nx = rx2 / d2, ny = ry2 / d2, vr = b.vx * nx + b.vy * ny;
          b.x = p[0] + nx * back; b.y = p[1] + ny * back;
          if (vr > 0) { b.vx -= 1.3 * vr * nx; b.vy -= 1.3 * vr * ny; }
        }
      }
      if (Math.hypot(b.x - p[0], b.y - p[1]) >= POCK && b.z > -.6) { b.z = 0; b.vz = 0; }   // back on the cloth
      if (b.z < -R * 1.05) {
        b.in = true;
        b.sink = { t: 0, x: b.x, y: b.y, px: p[0], py: p[1], vx: b.vx, vy: b.vy, z: b.z };
        halt(b);
        potted.push(b.n);
        if (SIM) return;
        Sound.thud(); Sound.coin();
        burst(p[0], p[1], { color: colOfNum(b.n), count: 12, speed: 130, size: 3.5, life: .45, grav: 0 }, { z: 6, up: 190 });
        evQ.push(['p', b.n, Math.round(p[0]), Math.round(p[1])]);
      }
    }
    /* Particles land in the 3D view when there is one — the shell's 2D
       sparks would be drawn at table coordinates on a tilted picture. `h`
       is only read there: how high it starts and how hard it is thrown up. */
    function burst(x, y, o, h) {
      if (V3) V3.burst(x, y, o, h); else api.fx.burst(x, y, o);
    }
    /* still sliding with spin on it (a draw about to come back), or on its
       way down a hole, counts as moving */
    const anyMoving = () => balls.some(b => !b.in && (b.vx || b.vy || b.slide || b.vz || b.z < 0));
    rack();

    /* ---------------------------------------------------- rules --------- */
    /* Hold a key as you strike to hit the cue ball off centre: W high for
       top, S low for bottom, A / D to the left or right for side. How far
       from the middle the tip lands, as a fraction of the radius. */
    function tipKeys() {
      const I = api.input;
      return { tip: I.any('KeyW', 'ArrowUp') ? .32 : I.any('KeyS', 'ArrowDown') ? -.36 : 0,
               eng: I.any('KeyA', 'ArrowLeft') ? -.3 : I.any('KeyD', 'ArrowRight') ? .3 : 0 };
    }
    function shoot(angle, pow, tip) {
      if (state !== 'aim') return;
      const c = cue();
      if (c.in) return;
      firstHit = null; potted = []; railHit = false; touching.clear();
      /* the break is struck harder than any other shot in the rack */
      const sp = (260 + pow * 1180) * (breakDone ? 1 : 1.5), dx = Math.cos(angle), dy = Math.sin(angle);
      halt(c);
      c.vx = dx * sp; c.vy = dy * sp;
      /* A strike off the middle spins the ball as well as driving it:
         5/2 · speed · offset / R about the axis it was struck round. Two
         fifths of the radius above centre is exactly a natural roll; the
         middle sends it sliding with no spin at all. */
      const t = tip || { tip: 0, eng: 0 };
      c.wx = 2.5 * sp * (t.tip || 0) * dy / R; c.wy = -2.5 * sp * (t.tip || 0) * dx / R;
      c.wz = -2.5 * sp * (t.eng || 0) / R;
      c.slide = true;
      state = 'roll'; settleT = 0; shots++;
      Sound.shoot(); api.shake(1 + pow * 3);
      if (V3) V3.onShot(angle, pow);
      evQ.push(['s', Math.round(angle * 1000), Math.round(pow * 100)]);
    }
    function resolveShot() {
      const c = cue();
      const scratch = c.in;
      const pottedNums = potted.slice();
      const eightIn = pottedNums.indexOf(8) >= 0;
      let foul = false, reason = '';

      if (scratch) { foul = true; reason = 'Scratch'; }
      else if (firstHit === null) { foul = true; reason = 'No contact'; }
      if (!foul && !breakDone) { /* break only needs contact + a rail */ }

      /* assign groups on the first legal pot after the break */
      if (open && breakDone && !scratch && pottedNums.length) {
        const mine = pottedNums.filter(n => n !== 8);
        if (mine.length) {
          const g = groupOf(mine[0]);
          const other = g === 'solid' ? 'stripe' : 'solid';
          groups[turn] = g; groups[1 - turn] = other;
          open = false;
          say(nameOf(turn) + ' is ' + g + 's');
        }
      }
      if (!foul && !open && firstHit !== null) {
        const fg = groupOf(firstHit);
        const need = onEight(turn) ? 'eight' : groups[turn];
        if (fg !== need && !(fg === 'eight' && need === 'eight')) { foul = true; reason = 'Hit ' + fg + ' first'; }
      }
      if (!foul && pottedNums.length === 0 && !railHit) { foul = true; reason = 'No rail after contact'; }

      /* the 8 decides everything */
      if (eightIn) {
        const legal = onEight(turn) && !scratch && !foul;
        winner = legal ? turn : 1 - turn;
        ending = true; endT = 0;
        banner = legal ? nameOf(turn) + ' sinks the 8!' : nameOf(turn) + ' potted the 8 early';
        evQ.push(['w', winner]);
        return;
      }
      /* respot the cue after a scratch */
      if (scratch) { c.in = false; c.sink = null; halt(c); }

      breakDone = true;
      const pottedOwn = !open && pottedNums.some(n => groupOf(n) === groups[turn]);
      if (foul) {
        say('Foul — ' + reason + '. Ball in hand.');
        foulMsg = reason;
        turn = 1 - turn;
        ballInHand = true;
        state = (isMyTurn() || SOLO) ? 'place' : 'wait';
        if (!isMyTurn() && SOLO) state = 'place';
        placeCue();
      } else if (pottedOwn || (open && pottedNums.length)) {
        say(nameOf(turn) + ' pots and shoots again');
        state = 'aim';
      } else {
        turn = 1 - turn;
        state = 'aim';
      }
      if (state === 'place' && !SOLO && !isMyTurn()) state = 'aim';   // remote player places it
      if (state === 'place' && SOLO && turn === 1) { autoPlaceCue(); state = 'aim'; }
    }
    function placeCue() {
      const c = cue();
      if (!inBounds(c.x, c.y) || overlapsAny(c.x, c.y)) autoPlaceCue();
    }
    function autoPlaceCue() {
      const c = cue();
      for (let tries = 0; tries < 400; tries++) {
        const x = TX + R + 4 + Math.random() * (TW - R * 2 - 8);
        const y = TY + R + 4 + Math.random() * (TH - R * 2 - 8);
        if (!overlapsAny(x, y)) { c.x = x; c.y = y; halt(c); return; }
      }
      c.x = TX + TW * .26; c.y = TY + TH / 2; halt(c);
    }
    const inBounds = (x, y) => x > TX + R && x < TX + TW - R && y > TY + R && y < TY + TH - R;
    function overlapsAny(x, y) {
      for (const b of balls) {
        if (b.in || b.n === 0) continue;
        if (Math.hypot(b.x - x, b.y - y) < R * 2 + 1) return true;
      }
      for (const p of POCKETS) if (Math.hypot(x - p[0], y - p[1]) < POCK) return true;
      return false;
    }
    const nameOf = s => PLAYERS[s] ? PLAYERS[s].name : 'Player ' + (s + 1);
    const isMyTurn = () => SOLO ? turn === 0 : turn === MYSEAT;

    /* ---------------------------------------------------- aiming -------- */
    /* raycast the cue ball to the first thing it would touch */
    function predict(angle) {
      const c = cue();
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let best = null, bt = 1e9;
      for (const b of balls) {
        if (b.in || b.n === 0) continue;
        const ex = b.x - c.x, ey = b.y - c.y;
        const proj = ex * dx + ey * dy;
        if (proj <= 0) continue;
        const perp2 = (ex * ex + ey * ey) - proj * proj;
        const rr = (R * 2) * (R * 2);
        if (perp2 > rr) continue;
        const t = proj - Math.sqrt(rr - perp2);
        if (t < bt) { bt = t; best = b; }
      }
      /* cushion distance if nothing is in the way */
      let wt = 1e9;
      if (dx > 0) wt = Math.min(wt, (TX + TW - R - c.x) / dx);
      if (dx < 0) wt = Math.min(wt, (TX + R - c.x) / dx);
      if (dy > 0) wt = Math.min(wt, (TY + TH - R - c.y) / dy);
      if (dy < 0) wt = Math.min(wt, (TY + R - c.y) / dy);
      if (!best || bt > wt) return { kind: 'rail', x: c.x + dx * wt, y: c.y + dy * wt };
      const gx = c.x + dx * bt, gy = c.y + dy * bt;
      const na = Math.atan2(best.y - gy, best.x - gx);
      return { kind: 'ball', ball: best, x: gx, y: gy, tx: Math.cos(na), ty: Math.sin(na) };
    }
    /* the object ball's line is cut short by whatever is in its way — the
       guide never promises a path that another ball is blocking */
    function objectPath(pr) {
      let len = 78, block = null;
      for (const o of balls) {
        if (o.in || o === pr.ball || o.n === 0) continue;
        const ex = o.x - pr.ball.x, ey = o.y - pr.ball.y;
        const along = ex * pr.tx + ey * pr.ty;
        if (along <= 0 || along > len + R * 2) continue;
        const perp = Math.abs(ex * pr.ty - ey * pr.tx);
        if (perp < R * 2) {
          const t2 = along - Math.sqrt(Math.max(0, R * R * 4 - perp * perp));
          if (t2 < len) { len = Math.max(4, t2); block = o; }
        }
      }
      return { len, block };
    }

    /* ---------------------------------------------------- the shark ----- */
    /* Try a shot on the quiet and see what it does — which ball the cue
       ball meets first, what drops, whether the cue ball follows it in —
       then put the table back exactly as it was. */
    function trial(angle, pow, tip) {
      const saved = balls.map(b => Object.assign({}, b));
      const keep = { firstHit, potted, railHit }, tch = [...touching];
      SIM = true; firstHit = null; potted = []; railHit = false; touching.clear();
      const c = balls[0], sp = 260 + pow * 1180, dx = Math.cos(angle), dy = Math.sin(angle);
      halt(c);
      c.vx = dx * sp; c.vy = dy * sp; c.wx = 2.5 * sp * tip * dy / R; c.wy = -2.5 * sp * tip * dx / R; c.slide = true;
      for (let t = 0; t < 6; t += 1 / 120) { stepPhysics(1 / 120); if (!anyMoving()) break; }
      const out = { first: firstHit, potted: potted.slice(), cueIn: c.in };
      balls = saved;
      firstHit = keep.firstHit; potted = keep.potted; railHit = keep.railHit;
      touching.clear(); for (const k of tch) touching.add(k);
      SIM = false;
      return out;
    }
    function botShot() {
      const c = cue();
      const mineG = groups[1];
      let cands = balls.filter(b => !b.in && b.n !== 0 && (open ? b.n !== 8 : (onEight(1) ? b.n === 8 : groupOf(b.n) === mineG)));
      if (!cands.length) cands = balls.filter(b => !b.in && b.n !== 0);
      const opts = [];
      for (const b of cands) {
        for (const p of POCKETS) {
          const pa = Math.atan2(p[1] - b.y, p[0] - b.x);
          const gx = b.x - Math.cos(pa) * R * 2, gy = b.y - Math.sin(pa) * R * 2;
          const ca = Math.atan2(gy - c.y, gx - c.x);
          /* cut angle: shallow cuts are far more likely to drop */
          let cut = Math.abs(((pa - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (cut > 1.25) continue;
          /* a middle pocket's jaws only take a ball coming at it fairly square */
          if (Math.abs(p[0] - (TX + TW / 2)) < 2 && Math.abs(Math.sin(pa)) < .62) continue;
          if (!clearPath(c.x, c.y, gx, gy, [b])) continue;
          if (!clearPath(b.x, b.y, p[0], p[1], [b])) continue;
          const dist = Math.hypot(gx - c.x, gy - c.y) + Math.hypot(p[0] - b.x, p[1] - b.y);
          opts.push({ score: (1.6 - cut) * 900 - dist, angle: ca, dist, cut, n: b.n });
        }
      }
      opts.sort((a, b) => b.score - a.score);
      /* Line the likeliest few up for real, the way a player would: try
         each on the quiet, easing the aim a touch either way to allow for
         throw, and take the first that drops the ball without the cue ball
         following it in. A straight-ish shot gets a little draw so it
         doesn't. How well it then strikes what it chose is its level. */
      for (const o of opts.slice(0, 4)) {
        const pow = clamp(.28 + o.dist / 1300, .2, .9), tip = o.cut < .25 ? -.22 : o.cut < .55 ? -.1 : 0;
        for (const da of [0, -.008, .008, -.016, .016, -.028, .028]) {
          const r = trial(o.angle + da, pow, tip);
          if (r.first === o.n && r.potted.includes(o.n) && !r.cueIn && (o.n === 8 || !r.potted.includes(8))) {
            return { angle: o.angle + da + rand(-BOT.err, BOT.err), pow: clamp(pow + rand(-BOT.pow, BOT.pow) * .4, .15, .95), tip };
          }
        }
      }
      if (opts.length) {                              // nothing tried clean: go for the likeliest anyway
        const o = opts[0];
        return { angle: o.angle + rand(-BOT.err, BOT.err), pow: clamp(.28 + o.dist / 1300 + rand(-BOT.pow, BOT.pow) * .4, .18, .9), tip: 0 };
      }
      /* nothing on: roll up to one of its own and leave it safe */
      const t = cands[0] || balls.find(b => !b.in && b.n !== 0);
      const a = t ? Math.atan2(t.y - c.y, t.x - c.x) : 0;
      return { angle: a + rand(-.05, .05), pow: .32, tip: 0 };
    }
    function clearPath(x0, y0, x1, y1, ignore) {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
      if (len < 1) return true;
      const ux = dx / len, uy = dy / len;
      for (const b of balls) {
        if (b.in || b.n === 0 || ignore.indexOf(b) >= 0) continue;
        const ex = b.x - x0, ey = b.y - y0;
        const proj = ex * ux + ey * uy;
        if (proj < 0 || proj > len) continue;
        const perp = Math.abs(ex * uy - ey * ux);
        if (perp < R * 2 - 1) return false;
      }
      return true;
    }

    /* ---------------------------------------------------- net ----------- */
    function snapshot() {
      return {
        /* a ball on its way down a hole carries how far down it is */
        b: balls.filter(b => !b.in).map(b => b.z < -.5 ? [b.n, Math.round(b.x), Math.round(b.y), Math.round(b.z)] : [b.n, Math.round(b.x), Math.round(b.y)]),
        o: balls.filter(b => b.in).map(b => b.n),
        st: state === 'roll' ? 1 : state === 'place' ? 2 : 0,
        t: turn, g: [groups[0] || '', groups[1] || ''], op: open ? 1 : 0,
        m: msg, mt: Math.round(msgT * 10), w: winner,
        ev: evQ.splice(0)
      };
    }
    function applyState(s) {
      const seen = {};
      for (const a of s.b) seen[a[0]] = a;
      for (const b of balls) {
        const a = seen[b.n];
        if (a) { b.in = false; b.nx = a[1]; b.ny = a[2]; if (b.rx === undefined) { b.x = a[1]; b.y = a[2]; b.rx = 1; } }
        else b.in = true;
      }
      state = s.st === 1 ? 'roll' : s.st === 2 ? 'place' : 'aim';
      turn = s.t; groups[0] = s.g[0] || null; groups[1] = s.g[1] || null; open = !!s.op;
      msg = s.m || ''; msgT = (s.mt || 0) / 10;
      if (s.w >= 0 && !ending) { winner = s.w; ending = true; endT = 0; }
      for (const e of (s.ev || [])) {
        if (e[0] === 'p') {
          Sound.thud(); Sound.coin();
          burst(e[2], e[3], { color: colOfNum(e[1]), count: 12, speed: 130, size: 3.5, life: .45, grav: 0 }, { z: 6, up: 190 });
          const b = balls.find(x => x.n === e[1]);
          if (b && !b.sink) b.sink = { t: 0, x: b.x, y: b.y, px: e[2], py: e[3], vx: 0, vy: 0, z: b.z || 0 };
        }
        else if (e[0] === 's') {
          Sound.shoot(); api.shake(1 + (e[2] / 100) * 3);
          if (V3) V3.onShot(e[1] / 1000, e[2] / 100);
        }
      }
    }
    function interp(dt) {
      const smp = nb.sample();
      if (!smp) return;
      const [a, b, k] = smp;
      const A = {}, B = {};
      for (const q of a.b) A[q[0]] = q;
      for (const q of b.b) B[q[0]] = q;
      for (const ball of balls) {
        const pa = A[ball.n], pb = B[ball.n];
        if (!pa || !pb) continue;
        const nx = lerp(pa[1], pb[1], k), ny = lerp(pa[2], pb[2], k);
        ball.z = lerp(pa[3] || 0, pb[3] || 0, k);
        const d = Math.hypot(nx - ball.x, ny - ball.y);
        ball.roll = (ball.roll || 0) + d / 69;        // guests see them roll too
        ball._mv = d > .12;
        if (ball._mv) ball.lastA = Math.atan2(ny - ball.y, nx - ball.x);
        ball.x = nx; ball.y = ny;
      }
    }
    function endResult() {
      const iWon = SOLO ? winner === 0 : winner === MYSEAT;
      return {
        score: (iWon ? 3000 : 0) + myPots * 220 + Math.max(0, 40 - shots) * 15,
        win: iWon,
        title: iWon ? 'You win the rack' : nameOf(winner) + ' wins',
        message: banner,
        stats: [{ label: 'Shots', value: shots }, { label: 'Balls potted', value: myPots },
                { label: 'Group', value: groups[SOLO ? 0 : MYSEAT] || 'open' }]
      };
    }

    /* ---- the front page ----
       Opened from the hub, 8-Ball starts in the hall: the table under its
       lamps, seen low and from the side, playing a rack on its own — the cue
       lines up, draws back and breaks, the balls spread and drop, and the
       room dims and racks again. Over it, in the house type, the name and
       three tabs: Play (the house at three strengths, or a friend), Customize
       (your set, cue, trail and nameplate — the table re-racks in whatever
       you put on) and the Shop. Play racks a fresh game. */
    const FK = FrontKit(api, {
      online: !!MPS, mp: true, remount: true,
      goSound() { Sound.shoot(); },
      onClick(k) {
        if (LK.click(k)) return;
        if (k.slice(0, 4) === 'tab:') { const t = k.slice(4); if (t !== mTab) { mTab = t; tabT0 = FK.t; Sound.blip(); } }
        if (k === 'look') { mTab = 'custom'; tabT0 = FK.t; Sound.blip(); }
      }
    });
    const LK = FrontLocker(api, FK, 'pool', { onWear(slot) { if (slot !== 'plate') relook(); } });
    let mTab = 'play', tabT0 = 0, menuCam = null;
    const DIFFS = [['easy', 'Casual', 'Forgiving.'], ['normal', 'Sharp', 'A real match.'], ['hard', 'Ruthless', 'It rarely misses.']];
    const demo = { st: 'setup', t: 0, shots: 0, aim: 0, pow: .9, fade: 1 };
    /* put on in the locker, racked on the table: the view is built again */
    function relook() {
      BALLSET = Cos.look('pool', 'ball') || { id: 'p.ball.house' };
      SET = Cos.ballSet(BALLSET.id);
      CUEBALL = SET.pip ? [SET.cue, SET.pip] : null;
      PLATE = Cos.look('pool', 'plate') || { a: '#8a8177', b: '#2a2822' };
      if (V3) { try { V3.dispose(); } catch (e) {} V3 = null; }
      if (G3) { try { V3 = makeView3D(G3); } catch (e) { V3 = null; } }
    }
    /* The table from low and to the side, framed whole in the right of the
       screen beside the menu, the camera easing slowly round it; with the
       locker open it stands back behind the panel. Both shots are fitted once
       with the camera's own framing, then blended. */
    let shotA = null, shotB = null;
    function menuShot(rest, pts, cam) {
      if (!shotA) {
        const fitOf = (rect, pitch, yaw) => {
          const c = Gfx3D.camera(W, H);
          c.fit(pts, rect, pitch, yaw, cam.fov);
          return { x: c.tgt[0], y: c.tgt[1], d: c.dist, pitch, yaw };
        };
        shotA = fitOf([444, 92, 950, 524], .76, -.22);
        shotB = fitOf([70, 80, 890, 560], .98, -.08);
      }
      const k = FK.glide('pdeep', mTab === 'play' ? 0 : 1, 3), sway = Math.sin(FK.t * .11) * .1;
      const mix = (p, q) => p + (q - p) * k;
      return { x: mix(shotA.x, shotB.x), y: mix(shotA.y, shotB.y), d: mix(shotA.d, shotB.d),
               pitch: mix(shotA.pitch, shotB.pitch), yaw: mix(shotA.yaw, shotB.yaw) + sway, shift: null };
    }
    /* the likeliest pot on the table, by eye: no trial runs, which are what
       make the house think for a moment and would stutter the menu */
    function demoPick() {
      const c = cue();
      let best = null;
      for (const b of balls) {
        if (b.in || b.n === 0) continue;
        for (const p of POCKETS) {
          const pa = Math.atan2(p[1] - b.y, p[0] - b.x);
          const gx = b.x - Math.cos(pa) * R * 2, gy = b.y - Math.sin(pa) * R * 2;
          const ca = Math.atan2(gy - c.y, gx - c.x);
          const cut = Math.abs(((pa - ca + Math.PI * 3) % TAU) - Math.PI);
          if (cut > 1.05) continue;
          if (Math.abs(p[0] - (TX + TW / 2)) < 2 && Math.abs(Math.sin(pa)) < .62) continue;
          if (!clearPath(c.x, c.y, gx, gy, [b]) || !clearPath(b.x, b.y, p[0], p[1], [b])) continue;
          const dist = Math.hypot(gx - c.x, gy - c.y) + Math.hypot(p[0] - b.x, p[1] - b.y);
          const sc = (1.6 - cut) * 900 - dist;
          if (!best || sc > best.sc) best = { sc, a: ca, pow: clamp(.3 + dist / 1300, .26, .78) };
        }
      }
      return best;
    }
    /* the rack plays itself, silently: set up, line up, strike, run, again */
    function demoStep(dt) {
      demo.t += dt;
      const c = cue();
      if (demo.st === 'setup') {
        demo.fade = Math.max(0, demo.fade - dt * 1.8);
        if (demo.t > 1.6) {
          const apex = balls.find(b => b.n === 1);
          demo.st = 'aim'; demo.t = 0; demo.pow = .95;
          demo.aim = Math.atan2(apex.y - c.y, apex.x - c.x) + rand(-.01, .01);
        }
      } else if (demo.st === 'aim') {
        aim = demo.aim;
        pullDist = MAXPULL * .75 * demo.pow * FK.eo(clamp(demo.t / 1.2, 0, 1));
        if (demo.t > 1.45) {
          const sp = (260 + demo.pow * 1180) * (demo.shots ? 1 : 1.5);
          halt(c); c.vx = Math.cos(demo.aim) * sp; c.vy = Math.sin(demo.aim) * sp; c.slide = true;
          firstHit = null; potted = []; railHit = false; touching.clear();
          if (V3) V3.onShot(demo.aim, demo.pow);
          pullDist = 0; demo.st = 'roll'; demo.t = 0; demo.shots++;
        }
      } else if (demo.st === 'roll') {
        SIM = true; stepPhysics(dt); SIM = false;
        if (!anyMoving() && demo.t > .9) {
          if (c.in) { c.in = false; c.sink = null; halt(c); c.x = TX + TW * .26; c.y = TY + TH / 2; c.z = 0; }
          const left = balls.filter(b => !b.in && b.n !== 0).length, pick = demo.shots < 5 && left > 4 ? demoPick() : null;
          if (pick) { demo.st = 'aim'; demo.t = 0; demo.aim = pick.a + rand(-.004, .004); demo.pow = pick.pow; }
          else { demo.st = 'out'; demo.t = 0; }
        }
      } else if (demo.st === 'out') {
        demo.fade = Math.min(1, demo.fade + dt * 1.6);
        if (demo.fade >= 1) { rack(); demo.st = 'setup'; demo.t = 0; demo.shots = 0; }
      }
    }

    /* ---- painting the front page ---- */
    function frontBack(ctx) {
      menuCam = menuShot;
      let ok = false;
      if (V3 && !G3.lost) {
        try { V3.render(ctx, demo.st === 'aim', false); ok = true; }
        catch (e) { try { V3.dispose(); } catch (e2) {} V3 = null; }
      }
      if (!ok) {
        boardBg(ctx, W, H, '#0d2018', '#06100b');
        drawTable(ctx);
        for (const b of balls) { if (!b.in) drawBall(ctx, b); else if (b.sink && b.sink.t < .62) drawSinking(ctx, b); }
      }
      if (demo.fade > 0) { ctx.fillStyle = 'rgba(2,4,5,' + (demo.fade * .92).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      /* the dark the menu sits in: down the left, and across the whole room
         while the locker is open */
      const deep = FK.glide('pdim', mTab === 'play' ? 0 : 1, 6);
      const g = ctx.createLinearGradient(0, 0, 540, 0);
      g.addColorStop(0, 'rgba(4,7,9,.94)'); g.addColorStop(.62, 'rgba(4,7,9,.72)'); g.addColorStop(1, 'rgba(4,7,9,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 540, H);
      if (deep > .01) { ctx.fillStyle = 'rgba(4,7,9,' + (deep * .62).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      const tg = ctx.createLinearGradient(0, 0, 0, 120);
      tg.addColorStop(0, 'rgba(4,7,9,.7)'); tg.addColorStop(1, 'rgba(4,7,9,0)');
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 120);
    }
    function drawFront(ctx) {
      frontBack(ctx);
      const t = FK.t, m = FK.mode(), P2 = api.party;
      /* the name */
      const nk = FK.eo(FK.in(.05, .6));
      ctx.save(); ctx.globalAlpha *= nk; ctx.translate((1 - nk) * -40, 0);
      FH.num(ctx, '8-BALL', 40, 76, 84, FH.W, 'left', { shadow: 'rgba(0,0,0,.55)', sy: 5 });
      ctx.fillStyle = BRASS; ctx.fillRect(44, 118, 38, 3);
      FH.cap(ctx, 'Pool hall  ·  first to the eight', 92, 120, 12, BRASS, 'left', { weight: 700, track: 2.6 });
      ctx.restore();
      LK.purse(ctx, W - 34, 42, FK.in(.35, .4));
      /* the tabs, with the rule under the one you are on sliding across */
      const tabs = [['play', 'Play'], ['custom', 'Customize'], ['shop', 'Shop']];
      const ty = 168, ta = FK.in(.2, .4);
      let tx = 44, ux = 44, uw = 40;
      ctx.save(); ctx.globalAlpha *= ta;
      for (const [id, lab] of tabs) {
        const w = FH.capW(ctx, lab, 17, { weight: 800 });
        const b = FK.btn('tab:' + id, tx - 8, ty - 18, w + 16, 36);
        const on = mTab === id;
        FH.cap(ctx, lab, tx, ty - b.h * 1.5, 17, on ? FH.W : 'rgba(244,244,240,' + (.46 + b.h * .34).toFixed(3) + ')', 'left', { weight: 800 });
        if (on) { ux = tx; uw = w; }
        tx += w + 32;
      }
      ctx.fillStyle = FH.Y;
      ctx.fillRect(FK.spring('pulx', ux, 360, 30), ty + 15, Math.max(8, FK.spring('pulw', uw, 360, 30)), 3);
      ctx.restore();

      /* the tab itself, rising in whenever it changes */
      const ck = FK.eo(clamp((t - Math.max(tabT0, .35)) / .32, 0, 1));
      ctx.save(); ctx.globalAlpha *= ck; ctx.translate(0, (1 - ck) * 14);
      if (mTab === 'play') drawPlayTab(ctx, m, P2);
      else if (mTab === 'custom') LK.custom(ctx, 44, 208, W - 88, 300);
      else LK.shop(ctx, 44, 214, W - 88, 280);
      ctx.restore();

      /* the keys along the foot */
      const fa = FK.in(1, .4);
      let fx = 44;
      fx += FH.prompt(ctx, fx, H - 30, 'Space', m === 'guest' ? 'Wait for the host' : 'Play', { alpha: fa });
      fx += FH.prompt(ctx, fx, H - 30, 'P', 'Friends', { alpha: fa });
      FH.prompt(ctx, fx, H - 30, 'Esc', 'Hub', { alpha: fa });
      FK.cursor();
    }
    function drawPlayTab(ctx, m, P2) {
      const x = 44, party = P2.inRoom;
      /* the house, at three strengths */
      FH.cap(ctx, party ? 'In a party the table is between the two of you' : 'Versus the house', x, 214, 11, party ? FH.Y : FH.MU, 'left', { weight: 700 });
      const cur = FK.opt('bot', 'normal'), tw = 124, th = 66, sq = FK.spring('obot', 0, 520, 24);
      DIFFS.forEach(([v, l, d], i) => {
        const tx0 = x + i * (tw + 8), on = cur === v;
        const b = FK.btn('opt:bot:' + v, tx0, 228, tw, th, !party);
        const y0 = 228 - b.h * 3;
        ctx.save();
        if (party) ctx.globalAlpha *= .4;
        if (on) { ctx.translate(tx0 + tw / 2, y0 + th / 2); ctx.scale(1 - sq * .05, 1 + sq * .07); ctx.translate(-(tx0 + tw / 2), -(y0 + th / 2)); }
        FH.tile(ctx, tx0, y0, tw, th, { fill: on ? FH.Y : 'rgba(16,21,28,.86)', shadow: .4 });
        FH.num(ctx, l, tx0 + 13, y0 + 25, 23, on ? FH.INK : FH.W, 'left');
        FH.cap(ctx, d, tx0 + 13, y0 + 49, 10, on ? 'rgba(18,22,29,.62)' : FH.MU, 'left');
        ctx.restore();
      });
      /* Play: the one bright thing on the screen */
      const py = 312, pw = 388, ph = 72;
      const pb = FK.btn('play', x, py, pw, ph, m !== 'guest');
      const lift = pb.h * 3, press = pb.p;
      ctx.save();
      ctx.translate(x + pw / 2, py + ph / 2 - lift); ctx.scale(1 - press * .02, 1 + press * .04); ctx.translate(-(x + pw / 2), -(py + ph / 2));
      FH.tile(ctx, x, py, pw, ph, { fill: m === 'guest' ? 'rgba(244,244,240,.2)' : FH.Y, shadow: .45, strip: m === 'guest' ? null : FH.O, stripH: 5 });
      const label = m === 'host' ? 'Start the match' : m === 'guest' ? 'Waiting for the host' : 'Rack ’em up';
      FH.num(ctx, label.toUpperCase(), x + 24, py + 36, m === 'guest' ? 24 : 34, m === 'guest' ? FH.W : FH.INK, 'left');
      if (m !== 'guest') {
        /* the eight, set into the button */
        const bx = x + pw - 44, by = py + 35;
        ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.arc(bx, by, 21, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f7f2e6'; ctx.beginPath(); ctx.arc(bx - 2, by - 3, 9.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.font = '800 13px ui-sans-serif,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('8', bx - 2, by - 2.5);
        const sh = ctx.createRadialGradient(bx - 7, by - 8, 1, bx, by, 22);
        sh.addColorStop(0, 'rgba(255,255,255,.45)'); sh.addColorStop(.4, 'rgba(255,255,255,0)');
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(bx, by, 21, 0, TAU); ctx.fill();
      }
      ctx.restore();
      /* a friend instead */
      const fb = FK.btn('party', x, py + ph + 12, pw, 50);
      FH.tile(ctx, x + fb.h * 3, py + ph + 12, pw, 50, { fill: 'rgba(16,21,28,.88)', shadow: .4, ring: fb.h > .5 ? 'rgba(245,225,28,.7)' : null });
      FH.cap(ctx, party ? 'Party of ' + P2.size + '  ·  open the list' : 'Play a friend', x + 22 + fb.h * 3, py + ph + 37, 15, FH.W, 'left', { weight: 800 });
      FH.cap(ctx, party ? '' : 'Online, one on one', x + pw - 18 + fb.h * 3, py + ph + 37, 10, FH.MU, 'right');
      /* what you have done, and what you are playing with */
      const sy = 466, L = Meta.level;
      [[fmt(Store.best('pool')), 'Best'], [fmt(Store.plays('pool')), 'Racks'], [L.lvl, 'Level']].forEach(([v, lab], i) => {
        const sx = x + i * 96;
        FH.num(ctx, String(v), sx, sy + 14, 26, FH.W, 'left');
        FH.cap(ctx, lab, sx, sy + 40, 10, FH.MU, 'left');
      });
      const lb = FK.btn('look', x + 300, sy - 6, 90, 60);
      const set = Cos.equipped('pool', 'ball'), cq = Cos.equipped('pool', 'cue');
      cosSwatch(ctx, set, x + 324, sy + 20, 44 + lb.h * 4);
      cosSwatch(ctx, cq, x + 368, sy + 20, 44 + lb.h * 4);
      FH.cap(ctx, 'Your kit', x + 346, sy + 50, 9, lb.h > .5 ? FH.Y : FH.MU, 'center');
    }

    if (G3) { try { V3 = makeView3D(G3); } catch (e) { console.warn('8-ball 3D:', e); V3 = null; } }

    return {
      update(dt) {
        if (V3) V3.step(dt);
        /* on the front page the menu has the keys, and the table plays itself */
        if (FK.on) {
          /* a crate that has just been closed keeps its key to itself for a beat */
          LK.step(dt);
          if (LK.mute > 0) { while (api.input.takeClick()) {} } else FK.input(api.input);
          if (FK.on) demoStep(dt);
          return;
        }
        const I = V3 ? V3.input : api.input, pt = I.pointer;
        if (msgT > 0) msgT -= dt;
        for (const b of balls) {
          if (b.sink && b.sink.t < 1) b.sink.t += dt;   // drop animation clock
          /* resting balls ease their number back to face-up so the table
             never ends up a field of blank spheres */
          if (!b.in && !b._mv && !(b.vx || b.vy)) {
            const tgt = Math.round(b.roll || 0);
            b.roll = (b.roll || 0) + (tgt - (b.roll || 0)) * Math.min(1, dt * 4);
          }
        }

        if (ending) {
          endT += dt;
          if (endT > 1.6) {
            const res = endResult();
            if (MPS && HOSTMP) MPS.send('over', res);
            api.gameOver(res);
            return;
          }
          if (!GUEST) stepPhysics(dt);
          return;
        }

        /* ---------------- guest: send intent, render host truth ------- */
        if (GUEST) {
          const c = cue();
          if (isMyTurn() && state === 'aim') {
            // only while the button is up — otherwise pressing behind the ball
            // to draw the cue would spin the aim right round
            if (pt.inside && !pt.down && !stroking) aim = Math.atan2(pt.y - c.y, pt.x - c.x);
            const shot = updateStroke(pt);
            if (shot !== null) {
              const tk = tipKeys();                     // the spin is the striker's, so it travels with the shot
              MPS.cmd({ c: 'shot', a: Math.round(aim * 1000), p: Math.round(shot * 100), t: Math.round(tk.tip * 100), e: Math.round(tk.eng * 100) });
            }
          } else { stroking = false; power = 0; pullDist = 0; }
          if (isMyTurn() && state === 'place') {
            let cl;
            while ((cl = I.takeClick())) {
              if (inBounds(cl.x, cl.y) && !overlapsAny(cl.x, cl.y)) MPS.cmd({ c: 'place', x: Math.round(cl.x), y: Math.round(cl.y) });
            }
          }
          const s = MPS._snap;
          if (s && s !== lastSnapRef) { lastSnapRef = s; if (nb.push(s)) applyState(s); }
          interp(dt);
          for (const e of MPS._events.splice(0)) {
            if (e[0] === 'o' && !ending) { ending = true; endT = 1.5; api.gameOver(e[1]); return; }
          }
          if (MPS.hostLeft && !ending) {
            ending = true; endT = 1.5;
            api.gameOver({ score: 0, title: 'Host left', message: 'The host disconnected.', stats: [] });
            return;
          }
          hud();
          return;
        }

        /* ---------------- host / solo: full simulation ---------------- */
        if (MPS) {
          const q = MPS._cmdQ;
          while (q.length) {
            const cm = q.shift();
            if (!cm) continue;
            const seat = PLAYERS.findIndex(p => p.id === cm.from);
            if (seat < 0 || seat !== turn) continue;
            if (cm.c === 'shot' && state === 'aim') {
              shoot((cm.a || 0) / 1000, clamp((cm.p || 0) / 100, 0, 1),
                    { tip: clamp((cm.t || 0) / 100, -.5, .5), eng: clamp((cm.e || 0) / 100, -.5, .5) });
            }
            else if (cm.c === 'place' && state === 'place') {
              const c2 = cue();
              if (inBounds(cm.x, cm.y) && !overlapsAny(cm.x, cm.y)) { c2.x = cm.x; c2.y = cm.y; halt(c2); ballInHand = false; state = 'aim'; }
            }
          }
        }

        if (state === 'roll') {
          stepPhysics(dt);
          if (!anyMoving()) {
            settleT += dt;
            if (settleT > .18) {
              myPots += potted.filter(n => n !== 0 && n !== 8 && (!groups[SOLO ? 0 : MYSEAT] || groupOf(n) === groups[SOLO ? 0 : MYSEAT])).length;
              resolveShot();
            }
          } else settleT = 0;
        } else if (state === 'place') {
          if (isMyTurn() || (SOLO && turn === 0)) {
            let cl;
            while ((cl = I.takeClick())) {
              if (inBounds(cl.x, cl.y) && !overlapsAny(cl.x, cl.y)) { const c2 = cue(); c2.x = cl.x; c2.y = cl.y; halt(c2); ballInHand = false; state = 'aim'; Sound.place(); }
            }
          }
        } else if (state === 'aim') {
          const c = cue();
          if (SOLO && turn === 1) {
            botT += dt;
            if (botT > 1.15) { botT = 0; const s = botShot(); aim = s.angle; shoot(s.angle, s.pow, { tip: s.tip || 0, eng: 0 }); }
          } else if (isMyTurn()) {
            // only while the button is up — otherwise pressing behind the ball
            // to draw the cue would spin the aim right round
            if (pt.inside && !pt.down && !stroking) aim = Math.atan2(pt.y - c.y, pt.x - c.x);
            const shot = updateStroke(pt);
            if (shot !== null) shoot(aim, shot, tipKeys());
          } else { stroking = false; power = 0; pullDist = 0; }
        }

        if (MPS) {
          netT -= dt;
          if (netT <= 0) { netT = state === 'roll' ? .06 : .4; MPS.send('snap', snapshot()); }
        }
        hud();
      },

      render(ctx) {
        FK.frame();
        if (FK.on) { drawFront(ctx); return; }
        uiStep();
        const c = cue();
        const myTurnNow = isMyTurn() && state === 'aim' && !ending && !(SOLO && turn === 1);
        const placing = state === 'place' && (isMyTurn() || (SOLO && turn === 0));
        if (V3 && G3.lost) V3 = null;
        if (V3) {
          try { V3.render(ctx, myTurnNow && !c.in, placing); }
          catch (e) { console.warn('8-ball 3D:', e); try { V3.dispose(); } catch (e2) {} V3 = null; }
        }
        if (V3) {
          /* the table is 3D; the readouts stay on the real pixel grid */
          if (myTurnNow && !c.in) drawPower(ctx);
          if (placing) drawPlaceHint(ctx);
        } else {
          boardBg(ctx, W, H, '#0d2018', '#06100b');
          drawTable(ctx);
          if (myTurnNow && !c.in) drawAim(ctx, c);
          if (placing) drawGhostCue(ctx);
          for (const b of balls) {
            if (!b.in) drawBall(ctx, b);
            else if (b.sink && b.sink.t < .62) drawSinking(ctx, b);
          }
          if (myTurnNow && !c.in) drawCueStick(ctx, c);
        }
        drawRailInfo(ctx);
        if (ending) {
          /* the rack is over: the room dims and a slate card comes up out of
             the table, the 8 ball set into it like a medal */
          const k = clamp(endT / .5, 0, 1), e = eBack(k), won = winner === (SOLO ? 0 : MYSEAT);
          ctx.fillStyle = 'rgba(3,7,6,' + (.68 * clamp(endT / .35, 0, 1)) + ')'; ctx.fillRect(0, 0, W, H);
          const cw = 428, ch = 176, cx = W / 2, cy = H / 2;
          ctx.save();
          ctx.translate(cx, cy); ctx.scale(.86 + e * .14, .86 + e * .14); ctx.translate(-cx, -cy);
          ctx.globalAlpha = clamp(endT / .3, 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,.5)'; box(ctx, cx - cw / 2 + 3, cy - ch / 2 + 9, cw, ch, 18); ctx.fill();
          const cg = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2);
          cg.addColorStop(0, '#1b242c'); cg.addColorStop(1, '#080d11');
          ctx.fillStyle = cg; box(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 18); ctx.fill();
          /* a slow band of light travelling across the slate */
          ctx.save();
          box(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 18); ctx.clip();
          const sx = cx - cw / 2 + ((UI.t * 150) % (cw + 260)) - 130;
          const sg2 = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0);
          sg2.addColorStop(0, 'rgba(255,255,255,0)'); sg2.addColorStop(.5, 'rgba(255,255,255,.055)'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg2; ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
          ctx.restore();
          ctx.strokeStyle = won ? '#8fe0a8' : BRASS; ctx.globalAlpha = .6; ctx.lineWidth = 1.6;
          box(ctx, cx - cw / 2 + .5, cy - ch / 2 + .5, cw - 1, ch - 1, 17.5); ctx.stroke();
          ctx.globalAlpha = 1;
          chipBall(ctx, cx, cy - ch / 2 + 2, 19, 8, clamp((endT - .15) / .3, 0, 1), eBack(clamp((endT - .15) / .35, 0, 1)));
          chalk(ctx, cx, cy - 6, banner.toUpperCase(), 34, won ? '#8fe0a8' : '#f2a9a1', 'center', 800, 3, true);
          chalk(ctx, cx, cy + 32, won ? 'YOU TAKE THE RACK' : nameOf(winner).toUpperCase() + ' TAKES THE RACK',
                11, 'rgba(233,238,247,.58)', 'center', 600, 2.6);
          chalk(ctx, cx, cy + 58, shots + ' SHOTS  ·  ' + myPots + ' POTTED', 10, 'rgba(233,238,247,.34)', 'center', 600, 2.2);
          ctx.restore();
        }
        /* a rack started from the front page comes up out of its dark */
        if (FK.intro < 1) { ctx.fillStyle = 'rgba(2,4,5,' + ((1 - FK.eo(FK.intro)) * .9).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      },
      /* Escape on the front page goes back to the hub; in a game it pauses */
      escape: FK.escape,
      destroy() { FK.done(); if (V3) { try { V3.dispose(); } catch (e) {} V3 = null; } }
    };

    /* ==================================================== painting ====== */
    /* The plaques say whose shot it is, which group is whose and what is
       left on the table, so the bar above only carries what they do not. */
    function hud() {
      api.hud({ Shots: shots, Potted: myPots });
    }
    function drawTable(ctx) {
      /* Cabinet. The old rail was one flat brown ramp, which is what made the
         whole table read as cardboard — real timber has grain, a lit top edge
         and a dark underside, and the eye picks all three up instantly. */
      const M = 30;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, TX - M + 7, TY - M + 12, TW + M * 2, TH + M * 2, 26); ctx.fill();
      const wood = ctx.createLinearGradient(0, TY - M, 0, TY + TH + M);
      wood.addColorStop(0, '#a06a34'); wood.addColorStop(.16, '#7d4f24');
      wood.addColorStop(.55, '#5d3a18'); wood.addColorStop(.86, '#42280f');
      wood.addColorStop(1, '#2c1a09');
      ctx.fillStyle = wood; rr(ctx, TX - M, TY - M, TW + M * 2, TH + M * 2, 24); ctx.fill();

      /* grain, clipped to the rail so it never runs over the felt */
      ctx.save();
      ctx.beginPath(); rr(ctx, TX - M, TY - M, TW + M * 2, TH + M * 2, 24); ctx.clip();
      ctx.beginPath(); rr(ctx, TX - 2, TY - 2, TW + 4, TH + 4, 8); ctx.clip('evenodd');
      ctx.globalAlpha = .16;
      for (let i = 0; i < 26; i++) {
        const gy = TY - M + (i / 26) * (TH + M * 2) + Math.sin(i * 2.7) * 2;
        ctx.strokeStyle = i % 3 ? 'rgba(255,225,180,.55)' : 'rgba(30,16,4,.7)';
        ctx.lineWidth = i % 5 ? .8 : 1.5;
        ctx.beginPath();
        ctx.moveTo(TX - M, gy);
        ctx.bezierCurveTo(TX + TW * .3, gy + Math.sin(i) * 5, TX + TW * .7, gy - Math.cos(i) * 5, TX + TW + M, gy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      /* lit top edge, shadowed bottom edge */
      const lip = ctx.createLinearGradient(0, TY - M, 0, TY - M + 14);
      lip.addColorStop(0, 'rgba(255,236,200,.34)'); lip.addColorStop(1, 'rgba(255,236,200,0)');
      ctx.fillStyle = lip; rr(ctx, TX - M, TY - M, TW + M * 2, 14, 24); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,.20)'; ctx.lineWidth = 2;
      rr(ctx, TX - M, TY - M, TW + M * 2, TH + M * 2, 24); ctx.stroke();
      /* a thin brass inlay where the timber meets the cloth */
      ctx.strokeStyle = 'rgba(214,178,96,.5)'; ctx.lineWidth = 1.4;
      rr(ctx, TX - 5, TY - 5, TW + 10, TH + 10, 9); ctx.stroke();
      /* diamonds */
      ctx.fillStyle = 'rgba(255,240,200,.55)';
      for (let i = 1; i < 8; i++) {
        if (i === 4) continue;
        const x = TX + (TW / 8) * i;
        dia(ctx, x, TY - M / 2); dia(ctx, x, TY + TH + M / 2);
      }
      for (let i = 1; i < 4; i++) {
        const y = TY + (TH / 4) * i;
        dia(ctx, TX - M / 2, y); dia(ctx, TX + TW + M / 2, y);
      }
      /* Cloth, lit from a lamp above the middle of the table. A single flat
         radial made it look like painted card; the nap and the falloff are
         what sell it as fabric. */
      const felt = ctx.createRadialGradient(TX + TW * .5, TY + TH * .42, 30, TX + TW / 2, TY + TH / 2, TW * .78);
      felt.addColorStop(0, '#2a9a63'); felt.addColorStop(.45, '#1c7a4b');
      felt.addColorStop(.8, '#125834'); felt.addColorStop(1, '#0a3b23');
      ctx.fillStyle = felt; rr(ctx, TX, TY, TW, TH, 6); ctx.fill();

      ctx.save();
      ctx.beginPath(); rr(ctx, TX, TY, TW, TH, 6); ctx.clip();
      /* nap — very faint directional weave */
      ctx.globalAlpha = .05;
      ctx.strokeStyle = '#d9ffe9'; ctx.lineWidth = 1;
      for (let gx = TX; gx < TX + TW; gx += 7) {
        ctx.beginPath(); ctx.moveTo(gx, TY); ctx.lineTo(gx, TY + TH); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* the pool of light, then darkness into the corners */
      const lamp = ctx.createRadialGradient(TX + TW / 2, TY + TH * .44, 20, TX + TW / 2, TY + TH * .5, TW * .52);
      lamp.addColorStop(0, 'rgba(255,252,225,.13)'); lamp.addColorStop(1, 'rgba(255,252,225,0)');
      ctx.fillStyle = lamp; ctx.fillRect(TX, TY, TW, TH);
      const vig = ctx.createRadialGradient(TX + TW / 2, TY + TH / 2, TW * .3, TX + TW / 2, TY + TH / 2, TW * .72);
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.34)');
      ctx.fillStyle = vig; ctx.fillRect(TX, TY, TW, TH);
      ctx.restore();
      /* head string + spots */
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(TX + TW * .26, TY); ctx.lineTo(TX + TW * .26, TY + TH); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.beginPath(); ctx.arc(TX + TW * .70, TY + TH / 2, 3, 0, TAU); ctx.fill();
      /* inner shadow so the felt sits down in the frame */
      ctx.save();
      ctx.beginPath(); rr(ctx, TX, TY, TW, TH, 6); ctx.clip();
      const sh = ctx.createLinearGradient(0, TY, 0, TY + 26);
      sh.addColorStop(0, 'rgba(0,0,0,.4)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.fillRect(TX, TY, TW, 26);
      const sh2 = ctx.createLinearGradient(TX, 0, TX + 26, 0);
      sh2.addColorStop(0, 'rgba(0,0,0,.35)'); sh2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh2; ctx.fillRect(TX, TY, 26, TH);
      ctx.restore();
      /* cushions — raised noses with 45° jaws cut toward every pocket, so
         the gaps the physics allows are the gaps you actually see */
      const J = POCK + 9, CD = 12;
      function cushion(x0, y0, x1, y1, nx, ny) {
        // nose runs x0,y0 -> x1,y1 along the felt edge; nx,ny points OFF the felt
        const bx = nx * CD, by = ny * CD;
        const jx = (x1 - x0) === 0 ? 0 : Math.sign(x1 - x0) * 9;
        const jy = (y1 - y0) === 0 ? 0 : Math.sign(y1 - y0) * 9;
        const g = ctx.createLinearGradient(x0 + bx, y0 + by, x0, y0);
        g.addColorStop(0, '#0c3a22'); g.addColorStop(.65, '#166139'); g.addColorStop(1, '#1e7a4a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - jx + bx, y0 - jy + by);
        ctx.lineTo(x1 + jx + bx, y1 + jy + by);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0, y0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.6;   // lit nose edge
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      cushion(TX + J, TY, TX + TW / 2 - J + 4, TY, 0, -1);
      cushion(TX + TW / 2 + J - 4, TY, TX + TW - J, TY, 0, -1);
      cushion(TX + J, TY + TH, TX + TW / 2 - J + 4, TY + TH, 0, 1);
      cushion(TX + TW / 2 + J - 4, TY + TH, TX + TW - J, TY + TH, 0, 1);
      cushion(TX, TY + J, TX, TY + TH - J, -1, 0);
      cushion(TX + TW, TY + J, TX + TW, TY + TH - J, 1, 0);
      /* Pockets. Not discs: the rails run past and cut into the circle, so a
         corner shows about three quarters of one and a middle rather less.
         Each is drawn as a wedge facing away from the table centre, with the
         open side toward the felt where the jaws are. */
      for (const p of POCKETS) {
        const mid = Math.abs(p[0] - (TX + TW / 2)) < 2;      // middle pockets sit on the long rails
        const out = Math.atan2(p[1] - (TY + TH / 2), p[0] - (TX + TW / 2));
        const half = (mid ? 104 : 136) * Math.PI / 180;      // half the visible sweep

        // wooden lip, one size up and the same shape
        ctx.fillStyle = '#2a1a0c';
        ctx.beginPath();
        ctx.arc(p[0], p[1], POCK + 5, out - half - .06, out + half + .06);
        ctx.closePath(); ctx.fill();

        // the hole itself
        const g = ctx.createRadialGradient(p[0], p[1] - 4, 2, p[0], p[1], POCK);
        g.addColorStop(0, '#120e0a'); g.addColorStop(.6, '#070504'); g.addColorStop(1, '#000000');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p[0], p[1], POCK, out - half, out + half);
        ctx.closePath(); ctx.fill();

        // a lit rim on the far side, so the hole reads as depth not a sticker
        ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(p[0], p[1], POCK - .8, out - half * .8, out + half * .8); ctx.stroke();

        // the two jaw tips, where the rails bite in
        ctx.fillStyle = 'rgba(255,255,255,.10)';
        for (const s of [-1, 1]) {
          const a = out + s * half;
          ctx.beginPath();
          ctx.arc(p[0] + Math.cos(a) * POCK, p[1] + Math.sin(a) * POCK, 2.4, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    function dia(ctx, x, y) {
      ctx.beginPath();
      ctx.moveTo(x, y - 4); ctx.lineTo(x + 3.4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3.4, y);
      ctx.closePath(); ctx.fill();
    }
    function drawBall(ctx, b) {
      const col = colOfNum(b.n), stripe = isStripe(b.n);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath(); ctx.ellipse(b.x + 2.5, b.y + 3.5, R * .95, R * .8, 0, 0, TAU); ctx.fill();
      /* body */
      const g = ctx.createRadialGradient(b.x - R * .35, b.y - R * .4, R * .12, b.x, b.y, R);
      if (stripe) { g.addColorStop(0, '#ffffff'); g.addColorStop(.55, '#f1f5f9'); g.addColorStop(1, '#b8c0c8'); }
      else { g.addColorStop(0, shade(col, .55)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.4)); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.fill();
      if (stripe) {                                   // colour band across the middle
        ctx.save();
        ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.clip();
        const bg = ctx.createLinearGradient(0, b.y - R * .52, 0, b.y + R * .52);
        bg.addColorStop(0, shade(col, .3)); bg.addColorStop(.5, col); bg.addColorStop(1, shade(col, -.3));
        ctx.fillStyle = bg;
        ctx.fillRect(b.x - R, b.y - R * .52, R * 2, R * 1.04);
        ctx.restore();
      }
      if (b.n > 0) {
        /* the number is a point ON the surface: it sweeps across the face and
           disappears round the back as the ball rolls, like a real ball */
        const th = (((b.roll || 0) % 1) + 1) % 1 * TAU;
        const vis = Math.cos(th);
        if (vis > .07) {
          const sp2 = Math.hypot(b.vx || 0, b.vy || 0);
          if (sp2 > 8) b.lastA = Math.atan2(b.vy, b.vx);
          const dirA = b.lastA || 0;
          ctx.save();
          ctx.beginPath(); ctx.arc(b.x, b.y, R - .6, 0, TAU); ctx.clip();
          ctx.translate(b.x, b.y); ctx.rotate(dirA);
          ctx.translate(Math.sin(th) * R * .72, 0);
          ctx.scale(Math.max(.22, vis), 1);            // foreshorten near the edge
          ctx.rotate(-dirA);                            // number stays upright
          ctx.globalAlpha = Math.min(1, vis * 2.2);
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath(); ctx.arc(0, 0, R * .46, 0, TAU); ctx.fill();
          panelText(ctx, 0, .5, String(b.n), R * .62, '#111827', 'center', 800);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }
      /* rolling: seam shadows flow across the face in the travel direction,
         foreshortened at the edges like a real sphere */
      const spd = Math.hypot(b.vx || 0, b.vy || 0);
      if (spd > 8) {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.beginPath(); ctx.arc(0, 0, R - .8, 0, TAU); ctx.clip();
        for (let k = 0; k < 2; k++) {
          const t = ((b.roll || 0) + k / 2) % 1;
          const xa = t * 2 - 1;
          const sq = Math.sqrt(Math.max(0, 1 - xa * xa));
          ctx.globalAlpha = .22 * sq;
          ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.ellipse(xa * R * .92, 0, R * .16 * sq + .5, R * .58, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(b.x - R * .34, b.y - R * .40, R * .24, R * .17, -.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    /* the drop: the ball rides over the lip, shrinks into the dark and is
       swallowed — clipped to the pocket so it visibly goes DOWN the hole */
    function drawSinking(ctx, b) {
      const s = b.sink;
      const k = clamp(s.t / .44, 0, 1);
      const x = lerp(s.x, s.px, Math.min(1, k * 1.6));
      const y = lerp(s.y, s.py, Math.min(1, k * 1.6));
      const r = R * (1 - k * .62);
      ctx.save();
      ctx.beginPath(); ctx.arc(s.px, s.py, POCK, 0, TAU); ctx.clip();
      ctx.globalAlpha = 1 - k * .85;
      const col = colOfNum(b.n);
      const g = ctx.createRadialGradient(x - r * .3, y - r * .35 + k * 4, r * .1, x, y + k * 4, r);
      g.addColorStop(0, shade(col, .3 - k * .5)); g.addColorStop(1, shade(col, -.5 - k * .3));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y + k * 4, r, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawAim(ctx, c) {
      const pr = predict(aim);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.setLineDash([9, 8]);
      ctx.lineDashOffset = -performance.now() / 45;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(pr.x, pr.y); ctx.stroke();
      ctx.setLineDash([]);
      if (pr.kind === 'ball') {
        /* ghost ball at the contact point + where each ball will go */
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, R, 0, TAU); ctx.stroke();
        const op = objectPath(pr), lineLen = op.len, blockedBy = op.block;
        ctx.strokeStyle = 'rgba(253,224,71,.85)'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(pr.ball.x, pr.ball.y);
        ctx.lineTo(pr.ball.x + pr.tx * lineLen, pr.ball.y + pr.ty * lineLen); ctx.stroke();
        if (blockedBy) {
          const bx2 = pr.ball.x + pr.tx * lineLen, by2 = pr.ball.y + pr.ty * lineLen;
          ctx.strokeStyle = 'rgba(248,113,113,.9)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          const px2 = -pr.ty, py2 = pr.tx;
          ctx.beginPath();
          ctx.moveTo(bx2 + px2 * 7, by2 + py2 * 7); ctx.lineTo(bx2 - px2 * 7, by2 - py2 * 7);
          ctx.stroke();
        }
        /* cue deflects perpendicular to the contact normal */
        const px = -pr.ty, py = pr.tx;
        const side = Math.sign((Math.cos(aim) * px + Math.sin(aim) * py)) || 1;
        ctx.strokeStyle = 'rgba(125,211,252,.6)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y);
        ctx.lineTo(pr.x + px * side * 46, pr.y + py * side * 46); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
      drawPower(ctx);
    }
    /* ================================================ the furniture ======
       The readouts belong to the room rather than floating over it: slate
       plaques in brass, names chalked on, the lamp above the table picking
       out whoever is at it, and a rail of real balls along the bottom of
       each. Nothing here cuts — a turn passing, a ball leaving the rail, the
       power coming up all travel, because a cut reads as a glitch and a
       move reads as a place. */
    /* the game's own rounded box: the hub squares every corner off to keep a
       house style, and a brass-framed plaque wants its real radius */
    function box(ctx, x, y, w, h, r) {
      r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    /* chalk: letter-spaced caps, with the faint bloom a stick of chalk leaves */
    function chalk(ctx, x, y, txt, size, col, align, weight, track, glow) {
      ctx.save();
      ctx.font = (weight || 700) + ' ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      try { ctx.letterSpacing = (track === undefined ? .6 : track) + 'px'; } catch (e) {}
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      if (glow) {
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * .45; ctx.filter = 'blur(4px)'; ctx.fillText(txt, x, y);
        ctx.filter = 'none'; ctx.globalAlpha = a;
      }
      ctx.fillText(txt, x, y);
      ctx.restore();
    }
    function eBack(k) { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
    /* one clock for every piece of furniture, stepped from the frame it is
       painted on so the readouts keep time whatever the table is doing */
    function uiStep() {
      const now = performance.now();
      UI.dt = UI.last ? Math.min(.05, (now - UI.last) / 1000) : 0;
      UI.last = now; UI.t = now / 1000;
      const dt = UI.dt;
      UI.lit = turn;
      for (let s = 0; s < 2; s++) {
        const want = s === UI.lit && !ending ? 1 : 0;
        UI.lamp[s] += (want - UI.lamp[s]) * Math.min(1, dt * (want ? 6 : 3.4));
      }
      UI.pow += (power - UI.pow) * Math.min(1, dt * 16);
      UI.powHold = power > .93 ? UI.powHold + dt : 0;
      return dt;
    }
    /* Power. A brass slider in a slate track, chalked off in tenths, with
       the cue ball beside it showing exactly where the tip will land — which
       is the whole of the spin, and used to be invisible. */
    function drawPower(ctx) {
      const tip = tipKeys(), spin = !!(tip.tip || tip.eng);
      if (!stroking && !spin) { drawKeys(ctx); return; }
      const p = UI.pow, bw = 240, h = 12, x = W / 2 - bw / 2 + 26, y = H - 42;
      const col = p < .4 ? FH.GOOD : p < .82 ? FH.Y : FH.O;
      ctx.save();
      FH.slant(ctx, x, y, bw, h, 7, 'rgba(9,16,26,.84)');
      if (p > 0) FH.slant(ctx, x, y, Math.max(6, bw * p), h, 7, col);
      FH.cap(ctx, 'Power', x, y - 10, 11, 'rgba(244,244,240,.7)', 'left');
      FH.num(ctx, Math.round(p * 100) + '%', x + bw + 16, y + 6, 22, '#fff', 'left');
      ctx.restore();
      drawSpinDial(ctx, x - 36, y + 6);
    }
    /* The cue ball as you are about to strike it: the tip sits where W/S/A/D
       put it, and that dot is the difference between a stun, a draw and a
       ball that runs three rails. */
    function drawSpinDial(ctx, cx, cy) {
      const t = tipKeys(), r = 10;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.arc(cx + 1, cy + 3, r + 4, 0, TAU); ctx.fill();
      const bg = ctx.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r * 1.15);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(.55, '#e9eef5'); bg.addColorStop(1, '#93a2b2');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(245,225,28,.8)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,41,59,.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - r * .8, cy); ctx.lineTo(cx + r * .8, cy);
      ctx.moveTo(cx, cy - r * .8); ctx.lineTo(cx, cy + r * .8); ctx.stroke();
      const dx = cx + t.eng / .3 * r * .52, dy = cy - t.tip / .36 * r * .52;
      const on = !!(t.tip || t.eng);
      if (on) {
        ctx.globalAlpha = .3 + Math.sin(UI.t * 6) * .18;
        ctx.fillStyle = FH.O;
        ctx.beginPath(); ctx.arc(dx, dy, 10, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = on ? FH.O : 'rgba(244,98,31,.5)';
      ctx.beginPath(); ctx.arc(dx, dy, on ? 5.6 : 4.2, 0, TAU); ctx.fill();
      FH.cap(ctx, on ? (t.tip > 0 ? 'Follow' : t.tip < 0 ? 'Draw' : t.eng > 0 ? 'Right' : 'Left') : 'W A S D',
             cx, cy + r + 12, 10, on ? FH.Y : 'rgba(244,244,240,.6)', 'center');
      ctx.restore();
    }
    function drawCueStick(ctx, c) {
      const dx = Math.cos(aim), dy = Math.sin(aim);
      if (stroking) {
        /* the rail you are sliding along, so the gesture reads clearly */
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(c.x - dx * 26, c.y - dy * 26);
        ctx.lineTo(c.x - dx * (26 + MAXPULL * .55), c.y - dy * (26 + MAXPULL * .55));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      const back = 26 + pullDist * .55;      // cue follows the cursor 1:1
      const bx = c.x - dx * back, by = c.y - dy * back;
      const ex = bx - dx * 300, ey = by - dy * 300;
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx + 3, by + 5); ctx.lineTo(ex + 3, ey + 5); ctx.stroke();
      const g = ctx.createLinearGradient(bx, by, ex, ey);
      g.addColorStop(0, '#e8c766'); g.addColorStop(.16, '#c9a227'); g.addColorStop(1, '#6b4a12');
      ctx.strokeStyle = g; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - dx * 60, by - dy * 60); ctx.stroke();
      ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - dx * 9, by - dy * 9); ctx.stroke();
      ctx.restore();
    }
    function drawGhostCue(ctx) {
      const pt = api.input.pointer;
      if (!pt.inside) return;
      const ok = inBounds(pt.x, pt.y) && !overlapsAny(pt.x, pt.y);
      ctx.save();
      ctx.globalAlpha = .75;
      ctx.fillStyle = ok ? '#f8fafc' : '#ef4444';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = ok ? '#4ade80' : '#ef4444'; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, R + 5, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      drawPlaceHint(ctx);
    }
    function drawPlaceHint(ctx) {
      const y = TY + TH + 56, pulse = .74 + Math.sin(UI.t * 3.6) * .26;
      const txt = 'Ball in hand  ·  click to place the cue ball';
      const w = FH.capW(ctx, txt, 13) + 64;
      ctx.save();
      ctx.globalAlpha = pulse;
      FH.slant(ctx, W / 2 - w / 2, y - 17, w, 32, 10, 'rgba(9,16,26,.9)');
      FH.slant(ctx, W / 2 - w / 2, y - 17, 6, 32, 10, FH.Y);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(W / 2 - w / 2 + 28, y - 1, 7, 0, TAU); ctx.fill();
      FH.cap(ctx, txt, W / 2 + 14, y, 13, '#fff', 'center');
      ctx.restore();
    }
    /* A ball chip: a real sphere rather than a flat disc — radial shading,
       a clipped band for stripes, and a specular so it catches the light the
       same way the balls on the cloth do. */
    function chipBall(ctx, x, y, r, n, a, s) {
      if (a <= .01) return;
      const col = colOfNum(n), stripe = isStripe(n);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(0, r * .82, r * .82, r * .3, 0, 0, TAU); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      ctx.fillStyle = stripe ? '#f4f7fb' : col;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      if (stripe) { ctx.fillStyle = col; ctx.fillRect(-r, -r * .52, r * 2, r * 1.04); }
      /* shade the sphere: bright upper-left, dark lower-right rim */
      const sg = ctx.createRadialGradient(-r * .34, -r * .38, r * .1, 0, 0, r * 1.12);
      sg.addColorStop(0, 'rgba(255,255,255,.42)');
      sg.addColorStop(.42, 'rgba(255,255,255,0)');
      sg.addColorStop(1, 'rgba(0,0,0,.46)');
      ctx.fillStyle = sg; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
      ctx.fillStyle = '#fbfdff';
      ctx.beginPath(); ctx.arc(0, 0, r * .48, 0, TAU); ctx.fill();
      panelText(ctx, 0, .4, String(n), r * .72, '#131a26', 'center', 800);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(-r * .36, -r * .42, r * .24, r * .15, -.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    /* A plaque: slate in a brass frame, the name chalked across it, and a
       strip of felt along the bottom holding the balls still to come. The
       lamp over the table swings to whoever is at it — that light, and the
       plaque rising an inch under it, is how the turn is announced. */
    function plaque(ctx, seat) {
      const dt = UI.dt, left = seat === 0, lamp = UI.lamp[seat], g = groups[seat];
      /* A tile in each top corner, lit when it is that player's shot. The
         balls they still owe sit along the bottom of it. */
      const bw = 208, bh = g ? 74 : 46, x = left ? 22 : W - bw - 22, y = 18;
      const live = lamp > .5;
      /* your own plaque is the one that wears your nameplate: its stock when
         the lamp is off, and its rule down the outer edge always */
      const meSeatP = SOLO ? 0 : MYSEAT;
      const mine2 = seat === meSeatP;
      ctx.save();
      FH.tile(ctx, x, y, bw, bh, {
        fill: live ? FH.Y : mine2 ? mixHex(PLATE.b, '#091019', .34) : 'rgba(9,16,26,.74)', shadow: .3
      });
      ctx.fillStyle = SEATCOL[seat];
      ctx.fillRect(left ? x : x + bw - 4, y, 4, bh);
      /* the nameplate's rule along the foot of your own plaque, where it still
         reads once the lamp turns the tile yellow */
      if (mine2) { ctx.fillStyle = PLATE.a; ctx.fillRect(x, y + bh - 3, bw, 3); }
      const ink = live ? FH.INK : '#f4f4f0';
      const ex = left ? x + 13 : x + bw - 13, side = left ? 'left' : 'right';
      const meSeat = SOLO ? 0 : MYSEAT;
      const nm = fhFit(ctx, (seat === meSeat && SOLO ? 'You' : nameOf(seat)), bw - 30, 20, { italic: true, weight: 800 });
      FH.cap(ctx, nm, ex, y + 21, 20, ink, side, { italic: true, weight: 800 });
      FH.cap(ctx, g ? (g === 'solid' ? 'Solids' : 'Stripes') : 'Open table', ex, y + 37, 11,
             live ? 'rgba(18,22,29,.68)' : (g ? FH.Y : 'rgba(244,244,240,.55)'), side);
      /* ---- the rail: what is left, and what has just left it ---- */
      const mine = balls.filter(b => !b.in && b.n !== 0 && b.n !== 8 &&
        (g ? groupOf(b.n) === g : false));
      const showEight = g && mine.length === 0;
      const list = (showEight ? balls.filter(b => !b.in && b.n === 8) : mine).slice(0, 8);

      const want = {};
      list.forEach((b, i) => { want[b.n] = i; });
      const st = chipFx[seat];
      for (const n in want) {
        if (!st[n]) st[n] = { slot: want[n], x: want[n], a: 0, s: .5, t: 0, dead: false };
        st[n].slot = want[n];
        if (st[n].dead) { st[n].dead = false; st[n].t = 0; }
      }
      for (const n in st) if (!(n in want) && !st[n].dead) { st[n].dead = true; st[n].t = 0; }

      const gapx = 23, bx0 = (left ? x + 21 : x + bw - 21 - (Math.max(1, list.length) - 1) * gapx), by = y + bh - 14;
      /* the groove the balls rest in */

      for (const n in st) {
        const c = st[n];
        if (c.dead) {
          /* potted: a quick pop, then it shrinks away and drops out of the
             rail — the gap closes behind it as the others slide across */
          c.t += dt;
          const k = Math.min(1, c.t / .42);
          c.a = 1 - k * k;
          c.s = k < .22 ? 1 + k * 1.4 : 1.3 - (k - .22) * 1.55;
          c.drop = k * k * 16;
          if (c.t > .46) { delete st[n]; continue; }
        } else {
          c.x += (c.slot - c.x) * Math.min(1, dt * 13);
          c.a += (1 - c.a) * Math.min(1, dt * 11);
          c.s += (1 - c.s) * Math.min(1, dt * 13);
          c.drop = 0;
        }
        chipBall(ctx, bx0 + c.x * gapx, by + (c.drop || 0), 7.5, +n, c.a, Math.max(0, c.s));
      }

      if (showEight) {
        ctx.globalAlpha = .7 + Math.sin(UI.t * 3.4) * .3;
        FH.cap(ctx, 'On the eight', left ? x + 40 : x + bw - 40, by + 1, 11, live ? FH.INK : FH.Y, side);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    /* the message: chalked on a slate card that rises in and settles */
    function drawBanner(ctx) {
      if (msgT <= 0 || msg === 'Break!') return;
      ctx.save(); ctx.globalAlpha = Math.min(1, msgT);
      const txt = fhFit(ctx, msg, 520, 13), w = FH.capW(ctx, txt, 13) + 48;
      FH.slant(ctx, (W - w) / 2, 58, w, 28, 9, 'rgba(9,16,26,.9)');
      FH.slant(ctx, (W - w) / 2, 58, 6, 28, 9, FH.O);
      FH.cap(ctx, txt, W / 2 + 5, 72.5, 13, '#fff', 'center');
      ctx.restore();
    }
    /* the keys, printed along the foot the way the festival does */
    function drawKeys(ctx) {
      if (ending) return;
      let px = 22;
      px += FH.prompt(ctx, px, H - 26, 'DRAG', 'Shoot', { alpha: .9 });
      px += FH.prompt(ctx, px, H - 26, 'WASD', 'Spin', { alpha: .9 });
      FH.prompt(ctx, px, H - 26, 'ESC', 'Pause', { alpha: .9 });
    }
    function drawRailInfo(ctx) {
      plaque(ctx, 0); plaque(ctx, 1);
      const mine = ending ? false : state === 'aim' && (SOLO ? turn === 0 : isMyTurn());
      const status = ending ? 'Rack complete' : state === 'roll' ? 'Balls rolling'
                   : state === 'place' ? 'Ball in hand' : mine ? 'Your shot' : 'Their shot';
      const w = FH.capW(ctx, status, 14) + 56;
      ctx.save();
      FH.slant(ctx, (W - w) / 2, 20, w, 30, 10, mine ? 'rgba(245,225,28,.94)' : 'rgba(9,16,26,.8)');
      if (mine) {
        ctx.fillStyle = 'rgba(18,22,29,.75)';
        ctx.globalAlpha = .5 + Math.sin(UI.t * 2.6) * .5;
        ctx.fillRect((W - w) / 2 + 22, 31, 7, 7);
        ctx.globalAlpha = 1;
      }
      FH.cap(ctx, status, W / 2 + 9, 35.5, 14, mine ? FH.INK : 'rgba(244,244,240,.82)', 'center');
      ctx.restore();
      drawBanner(ctx);
    }

    /* ==================================================== 3D table ====== */
    /* The table as an object in a room: lacquered mahogany with brass round
       the pockets, cloth sitting down inside the cushions, pockets you can see
       into, three lamps over the bed and a cue that lays its shadow across the
       felt. It only reads the game — balls, aim, pullDist, state — and never
       writes to it, so the rules above do not know it exists. */
    function makeView3D(G) {
      const { Geo, M4, Q, K, FX } = Gfx3D, L = Gfx3D.lin;
      const S = G.scope();
      const cam = Gfx3D.camera(W, H);
      const PS = Gfx3D.particles(700);
      const input = Gfx3D.groundInput(api.input, () => cam, 0);
      const RZ = 17, AP = -46, FL = -122;             // rail top, apron foot, floor
      const holes = POCKETS.map(p => [p[0], p[1], POCK]);
      const T = M4.make(), Q0 = Q.make(), ONE = [1, 1, 1];
      const col = (hex, a) => Gfx3D.withAo(L(hex), a === undefined ? 1 : a);

      /* ---------------- materials ---------------- */
      const mFelt = G.mat({ kind: K.FELT, spec: .05, gloss: 10, wrap: .5, cutC: holes,
                            p1: [TX + TW * .26, TX + TW * .70, TY + TH / 2, 1], p2: [TY, TY + TH, 0, 0],
                            /* the cloth darkens where it runs in under the cushions */
                            ao: [[TX - 14, TY - 14, TW + 28, 12], [TX - 14, TY + TH + 2, TW + 28, 12],
                                 [TX - 14, TY - 14, 12, TH + 28], [TX + TW + 2, TY - 14, 12, TH + 28]] });
      const mCush = G.mat({ kind: K.FELT, spec: .08, gloss: 14, wrap: .5 });
      const mRail = G.mat({ kind: K.WOOD, spec: .9, gloss: 120, wrap: .25, cutC: holes, p1: [.1, 0, 0, 0] });
      const mWood = G.mat({ kind: K.WOOD, spec: .45, gloss: 60, wrap: .25, p1: [.1, 0, 0, 0] });
      const mFloor = G.mat({ kind: K.WOOD, spec: .22, gloss: 40, wrap: .2, p1: [.06, 26, 0, 0], cast: false });
      const mPocket = G.mat({ kind: K.PLAIN, spec: .1, gloss: 12, two: true, cast: false });
      const mBrass = G.mat({ kind: K.METAL, spec: 1.6, gloss: 110, c1: L('#dcb45e') });
      const mPearl = G.mat({ kind: K.PLAIN, spec: 1.2, gloss: 150, emit: L('#1c1a16') });
      const mCue = G.mat({ kind: K.PLAIN, spec: .7, gloss: 70 });
      const mGhost = G.mat({ kind: K.PLAIN, spec: .8, gloss: 80, alpha: .32, tint: [1.2, 1.2, 1.2], cast: false });
      const mBall = [];
      for (let n = 0; n <= 15; n++) {
        mBall[n] = G.mat({ kind: K.BALL, spec: 1.1, gloss: 170, wrap: .12,
                           c1: L(colOfNum(n)), c2: n === 0 && CUEBALL ? L(CUEBALL[1]) : undefined,
                           p1: [n, isStripe(n) ? 1 : 0, n === 0 && CUEBALL ? 1 : 0, 0] });
      }
      const fxBlob = G.fxMat({ fx: FX.BLOB, color: [0, 0, 0, .55], p: [1.6, 0, 0, 0] });
      const fxDash = G.fxMat({ fx: FX.DASH, color: [1, 1, 1, .62], p: [16, .55, 22, 0] });
      const fxLine = G.fxMat({ fx: FX.DASH, color: [.99, .88, .28, .92], p: [1e4, 1, 0, 0] });
      const fxDefl = G.fxMat({ fx: FX.DASH, color: [.49, .83, .99, .78], p: [1e4, 1, 0, 0] });
      const fxBlock = G.fxMat({ fx: FX.DASH, color: [.97, .44, .44, .95], p: [1e4, 1, 0, 0] });
      const fxRing = G.fxMat({ fx: FX.RING, color: [1, 1, 1, .85], p: [.9, .14, 0, 0] });
      const fxDot = G.fxMat({ fx: FX.BLOB, color: [1, 1, 1, .75], p: [1.2, 0, 0, 0] });
      const fxOk = G.fxMat({ fx: FX.RING, color: [.29, .87, .5, .95], p: [.86, .12, 0, 0] });
      const fxBad = G.fxMat({ fx: FX.RING, color: [.94, .27, .27, .95], p: [.86, .12, 0, 0] });

      /* ---------------- the table ---------------- */
      /* the bed: cloth right out under the cushions to the rail */
      let g = Geo();
      g.face([[TX - 12, TY - 12, 0], [TX + TW + 12, TY - 12, 0], [TX + TW + 12, TY + TH + 12, 0], [TX - 12, TY + TH + 12, 0]],
             col('#19683f'), [TX, TY, -10]);
      const meshBed = S.mesh(g);

      /* cushions: the rubber profile run between pockets, with both ends cut
         back at the jaw angle — the gaps the physics allows are the gaps you
         see */
      g = Geo();
      const cCush = col('#19693f');
      const PROF = [[1.4, 0], [0, 9.5], [.35, 12.8], [2, 14.4], [12, 15.6], [12, 0]];
      const cushion = (ax, ay, bx, by, nx, ny) => {
        const dx = Math.sign(bx - ax), dy = Math.sign(by - ay), J = .75;
        const P = (end, s, z) => end
          ? [bx + dx * s * J + nx * s, by + dy * s * J + ny * s, z]
          : [ax - dx * s * J + nx * s, ay - dy * s * J + ny * s, z];
        const inside = [(ax + bx) / 2 + nx * 6, (ay + by) / 2 + ny * 6, 7];
        const uvf = p => [dx ? p[0] : p[1], p[2]];
        for (let j = 0; j < PROF.length - 1; j++) {
          const a = PROF[j], b = PROF[j + 1];
          g.face([P(0, a[0], a[1]), P(1, a[0], a[1]), P(1, b[0], b[1]), P(0, b[0], b[1])], cCush, inside, uvf);
        }
        for (const end of [0, 1]) g.face(PROF.map(p => P(end, p[0], p[1])), cCush, inside, uvf);
      };
      const JAW = POCK + 9;
      cushion(TX + JAW, TY, TX + TW / 2 - JAW + 4, TY, 0, -1);
      cushion(TX + TW / 2 + JAW - 4, TY, TX + TW - JAW, TY, 0, -1);
      cushion(TX + JAW, TY + TH, TX + TW / 2 - JAW + 4, TY + TH, 0, 1);
      cushion(TX + TW / 2 + JAW - 4, TY + TH, TX + TW - JAW, TY + TH, 0, 1);
      cushion(TX, TY + JAW, TX, TY + TH - JAW, -1, 0);
      cushion(TX + TW, TY + JAW, TX + TW, TY + TH - JAW, 1, 0);
      const meshCush = S.mesh(g);

      /* the rail: one moulding swept all the way round — up from the cloth,
         over a lacquered top and a bull-nose, then down the apron */
      g = Geo();
      g.sweep(Gfx3D.rrPath(TX - 12, TY - 12, TW + 24, TH + 24, 6, 6),
              [[0, 0], [0, 15.6], [.8, RZ], [15, RZ], [17.4, RZ - .8, 1], [18.6, RZ - 3, 1], [18.9, RZ - 6], [18.9, AP], [15, AP - 1]],
              col('#5b2410'));
      const meshRail = S.mesh(g);

      /* Pockets: a lined throat whose lip follows whatever it cuts through —
         cloth on the table side, the rail round the back — with a brass bead
         along the rail part. */
      g = Geo();
      const gb = Geo();
      const onBed = (x, y) => x > TX - 12 && x < TX + TW + 12 && y > TY - 12 && y < TY + TH + 12;
      for (const [px, py] of POCKETS) {
        const angs = [];
        for (let i = 0; i < 48; i++) angs.push(i / 48 * TAU);
        for (const lx of [TX - 12, TX + TW + 12]) {
          const c = (lx - px) / POCK;
          if (Math.abs(c) < 1) { const a = Math.acos(c); angs.push(a, TAU - a); }
        }
        for (const ly of [TY - 12, TY + TH + 12]) {
          const s = (ly - py) / POCK;
          if (Math.abs(s) < 1) { const a = Math.asin(s); angs.push((a + TAU) % TAU, (Math.PI - a + TAU) % TAU); }
        }
        angs.sort((a, b) => a - b);
        angs.push(angs[0] + TAU);
        const arcs = [];
        let arc = null;
        for (let i = 0; i < angs.length - 1; i++) {
          const a0 = angs[i], a1 = angs[i + 1];
          if (a1 - a0 < 1e-5) continue;
          const am = (a0 + a1) / 2, rail = !onBed(px + Math.cos(am) * POCK, py + Math.sin(am) * POCK);
          const top = rail ? RZ : 0;
          const cTop = rail ? col('#2c1a10', .75) : col('#0d2b1b', .75), cBot = [0, 0, 0, .12];
          const base = g.n;
          for (const [a, z, c] of [[a0, top, cTop], [a1, top, cTop], [a1, -32, cBot], [a0, -32, cBot]]) {
            g.v(px + Math.cos(a) * POCK, py + Math.sin(a) * POCK, z, -Math.cos(a), -Math.sin(a), 0, c, a * POCK, z);
          }
          g.q(base, base + 1, base + 2, base + 3);
          if (rail) { if (!arc) arc = [a0, a1]; else arc[1] = a1; }
          else if (arc) { arcs.push(arc); arc = null; }
        }
        if (arc) arcs.push(arc);
        g.disc(px, py, -32, POCK, 24, [0, 0, 0, .1]);
        for (const [a0, a1] of arcs) gb.torus(px, py, RZ - .6, POCK + 2.2, 2.5, 24, 10, [1, 1, 1, 1], a0, a1);
      }
      const meshPocket = S.mesh(g), meshBrass = S.mesh(gb);

      /* mother-of-pearl sights let into the rail */
      g = Geo();
      const cPearl = col('#efe6d2');
      const dia = (x, y, across) => {
        const a = across ? 3.4 : 2.2, b = across ? 2.2 : 3.4, z = RZ + .08;
        g.face([[x - a, y, z], [x, y - b, z], [x + a, y, z], [x, y + b, z]], cPearl, [x, y, 0]);
      };
      for (let i = 1; i < 8; i++) {
        if (i === 4) continue;
        const x = TX + (TW / 8) * i;
        dia(x, TY - 20, false); dia(x, TY + TH + 20, false);
      }
      for (let i = 1; i < 4; i++) {
        const y = TY + (TH / 4) * i;
        dia(TX - 20, y, true); dia(TX + TW + 20, y, true);
      }
      const meshPearl = S.mesh(g);

      /* legs, and the floor of the room the table stands in */
      g = Geo();
      const cLeg = col('#3b1809');
      for (const [lx, ly] of [[TX + 10, TY + 10], [TX + TW - 10, TY + 10], [TX + 10, TY + TH - 10],
                              [TX + TW - 10, TY + TH - 10], [TX + TW / 2, TY + 20], [TX + TW / 2, TY + TH - 20]]) {
        g.box(lx - 16, ly - 16, FL, lx + 16, ly + 16, AP + 1, cLeg, 3);
      }
      const meshLegs = S.mesh(g);
      g = Geo();
      g.face([[-700, -600, FL], [1660, -600, FL], [1660, 1400, FL], [-700, 1400, FL]], col('#3a2414'), [0, 0, FL - 10]);
      const meshFloor = S.mesh(g);

      /* ---------------- things that move ---------------- */
      g = Geo(); g.sphere(0, 0, 0, 1, 40, 26, [1, 1, 1, 1]);
      const meshBall = S.mesh(g);
      g = Geo(); g.decal(0, 0, 0, 1);
      const meshDecal = S.mesh(g);
      g = Geo();
      /* the cue you have on: the shaft takes its first colour and the
         forearm and butt its second. Baked into the lathe, so it is picked
         up when the round is mounted rather than costing anything a frame. */
      const CUE = Cos.look('pool', 'cue') || { a: '#e4c58e', b: '#4a2410' };
      const cTip = col('#2f6fb3'), cFer = col('#f1ece0'), cSh = col(CUE.a), cBr = col('#d8ae55');
      const cFo = col(CUE.b), cWr = col('#1b1b20'), cBu = col(CUE.b), cCap = col('#0f0f10');
      g.lathe([[0, 0, cTip], [2.45, 0, cTip], [2.55, 2.4, cTip], [2.6, 2.4, cFer], [2.65, 9, cFer], [2.68, 9, cSh],
               [3.55, 150, cSh], [3.9, 150, cBr], [3.9, 155, cBr], [3.95, 155, cFo], [4.3, 205, cFo], [4.36, 205, cWr],
               [4.55, 262, cWr], [4.6, 262, cBu], [5, 298, cBu], [5, 298, cCap], [4.4, 302, cCap], [0, 302, cCap]], 20);
      const meshCue = S.mesh(g);
      const dCue = S.dyn(), dObj = S.dyn(), dDefl = S.dyn(), dBlock = S.dyn(), dTrail = S.dyn();
      /* the trail you have on, laid down behind the cue ball as it rolls */
      const TRAIL = Cos.look('pool', 'trail') || { a: '#f2ece2', s: 'none' };
      const trc = Gfx3D.lin(TRAIL.a);
      const fxTrail = G.fxMat({ fx: FX.TRAIL, color: [trc[0], trc[1], trc[2], TRAIL.s === 'none' ? 0 : .5], add: true });
      const WHT = [1, 1, 1, 1];
      const path = [];

      /* ---------------- camera and light ---------------- */
      const pts = [];
      for (const x of [TX - 31, TX + TW + 31]) for (const y of [TY - 31, TY + TH + 31]) pts.push([x, y, RZ]);
      pts.push([TX - 31, TY + TH + 31, AP * .5], [TX + TW + 31, TY + TH + 31, AP * .5]);
      const PITCH = 1.1, FOV = .5;
      cam.fit(pts, [84, 114, 876, 546], PITCH, 0, FOV);
      const rest = { x: cam.tgt[0], y: cam.tgt[1], d: cam.dist };
      /* Three shaded lamps over the bed do the lighting: each throws a cone,
         so the cloth sits in pools of warm light and the room falls away into
         the dark. The "sun" is only there to cast the shadows, from almost
         straight overhead, and is told to keep its shine to itself — as a
         directional light it would glaze every lacquered surface at once. */
      const lampC = L('#ffd9a8', 1.7);
      const env = {
        sun: Gfx3D.norm([-.12, -.2, 1]), sunC: L('#fff1dc', .12), sunSpec: 0,
        sky: L('#2f2a22', .22), gnd: L('#1a120c', .3), rim: L('#a08d70', .05), fill: L('#ffe7c4', .1),
        fogC: [0, 0, 0], fog: [2600, 5200], expo: 1.15, vig: 1.3, clear: [0, 0, 0],
        lamps: [.18, .5, .82].map(f => ({ p: [TX + TW * f, TY + TH / 2 - 16, 230], c: lampC })),
        lampK: 1.2e-5, lampCone: [Math.cos(1.0), Math.cos(.42)],
        shadow: { x: TX + TW / 2, y: TY + TH / 2, r: 480 }
      };
      let intro = 0, lastT = performance.now(), strike = null, cueLift = .1;

      /* Each ball keeps its own orientation and rolls by exactly the distance
         it travelled, so the numbers turn over the way they would on cloth. */
      const ori = {};
      /* where a resting number settles: toward the camera and a little
         below the lamps' highlight, so the shine is never lost in the disc */
      const UPV = Gfx3D.norm([0, .75, .66]);
      function orient(n, x, y, dt, still, b) {
        let o = ori[n];
        if (!o) {
          const q = Q.make();
          const ax = Gfx3D.norm([0, -UPV[2], UPV[1]]);
          Q.turn(q, ax[0], ax[1], ax[2], Math.acos(UPV[0]));
          Q.turn(q, UPV[0], UPV[1], UPV[2], Math.random() * TAU);
          o = ori[n] = { q, x, y };
        }
        const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy);
        /* Where the ball's own spin is known it turns by that, so a stunned
           ball slides without turning and a drawn one spins backwards as it
           goes forward; a guest only sees positions, so it rolls them. (The
           spin's axes point down into the slate; this view's point up.) */
        const w = b && !GUEST && !still ? Math.hypot(b.wx, b.wy, b.wz) : 0;
        if (w > .05 && d < R * 5) Q.turn(o.q, -b.wx / w, -b.wy / w, b.wz / w, w * dt);
        else if (d > 1e-3 && d < R * 5) Q.turn(o.q, -dy / d, dx / d, 0, d / R);
        else if (still && n) {
          /* at rest the number eases round to face up, as it did on the flat
             table — a field of blank spheres tells you nothing */
          const a = Q.rot(o.q, 1, 0, 0);
          const s = a[0] * UPV[0] + a[1] * UPV[1] + a[2] * UPV[2] >= 0 ? 1 : -1;
          const cx = s * (a[1] * UPV[2] - a[2] * UPV[1]), cy = s * (a[2] * UPV[0] - a[0] * UPV[2]), cz = s * (a[0] * UPV[1] - a[1] * UPV[0]);
          const sn = Math.hypot(cx, cy, cz), k = Math.min(1, dt * 2.2);
          if (sn > 1e-3) Q.turn(o.q, cx / sn, cy / sn, cz / sn, Math.asin(Math.min(1, sn)) * k);
          /* ...and turns about itself until the figure stands upright on
             screen: the digit's up is the ball's own z */
          const v = Q.rot(o.q, s, 0, 0), zA = Q.rot(o.q, 0, 0, 1);
          let ux = cam.u[0], uy = cam.u[1], uz = cam.u[2];
          const dv = v[0] * ux + v[1] * uy + v[2] * uz;
          ux -= v[0] * dv; uy -= v[1] * dv; uz -= v[2] * dv;
          const ul = Math.hypot(ux, uy, uz);
          if (ul > 1e-3) {
            ux /= ul; uy /= ul; uz /= ul;
            const wx = zA[1] * uz - zA[2] * uy, wy = zA[2] * ux - zA[0] * uz, wz = zA[0] * uy - zA[1] * ux;
            const ang = Math.atan2(v[0] * wx + v[1] * wy + v[2] * wz, zA[0] * ux + zA[1] * uy + zA[2] * uz);
            Q.turn(o.q, v[0], v[1], v[2], ang * k);
          }
        }
        o.x = x; o.y = y;
        return o.q;
      }
      function strip(dm, x0, y0, x1, y1, w, fxm) {
        const s = Geo();
        s.strip(x0, y0, x1, y1, w, .45);
        dm.set(s);
        G.fx(dm, null, fxm);
      }
      function cueAt(cx, cy, a, back, alpha) {
        const dx = Math.cos(a), dy = Math.sin(a);
        /* Jack the butt up over anything lying under the cue, the way a
           player would, rather than drawing it straight through a ball. */
        let E = .1;
        for (const o of balls) {
          if (o.in || o.n === 0) continue;
          const ex = o.x - cx, ey = o.y - cy;
          const along = -(ex * dx + ey * dy) - back;        // distance behind the tip
          if (along < 2 || along > 300) continue;
          if (Math.abs(ex * dy - ey * dx) > R + 6) continue;
          E = Math.max(E, Math.atan2(R + 3.5, along));
        }
        cueLift += (Math.min(E, .62) - cueLift) * .22;       // eased, so sweeping the aim never snaps it
        E = cueLift;
        const Z = [-dx * Math.cos(E), -dy * Math.cos(E), Math.sin(E)], X = [-dy, dx, 0];
        const Y = [Z[1] * X[2] - Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1] - Z[1] * X[0]];
        mCue.alpha = alpha; mCue.blend = alpha < 1;
        G.draw(meshCue, M4.axes(T, X, Y, Z, [cx - dx * back, cy - dy * back, R + .8]), mCue);
      }

      function render(ctx, aiming, placing) {
        const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000);
        lastT = now;
        /* the table swings into view once, at the break */
        intro = Math.min(1, intro + dt / 1.6);
        const e = 1 - Math.pow(1 - intro, 3);
        /* the front page has its own slow shot of the table */
        const mc = menuCam ? menuCam(rest, pts, cam) : null;
        cam.shift = mc ? mc.shift : null;
        if (mc) cam.orbit(mc.x, mc.y, 0, mc.d, mc.pitch, mc.yaw);
        else cam.orbit(rest.x, rest.y + (1 - e) * 60, 0, rest.d * (1 - (1 - e) * .18), PITCH - (1 - e) * .38, (1 - e) * -.3);
        G.size(W, H);
        G.begin(cam, env, now / 1000);
        G.draw(meshFloor, null, mFloor);
        G.draw(meshLegs, null, mWood);
        G.draw(meshRail, null, mRail);
        G.draw(meshBed, null, mFelt);
        G.draw(meshCush, null, mCush);
        G.draw(meshPocket, null, mPocket);
        G.draw(meshBrass, null, mBrass);
        G.draw(meshPearl, null, mPearl);

        /* the cue ball's line, before the balls so they sit on top of it */
        if (TRAIL.s !== 'none') {
          const cb0 = cue();
          const rolling = cb0 && !cb0.in && Math.hypot(cb0.vx || 0, cb0.vy || 0) > 8;
          if (rolling) { path.push({ x: cb0.x, y: cb0.y }); if (path.length > 24) path.shift(); }
          else if (path.length) path.splice(0, 2);
          if (path.length > 2) {
            const s = Geo(), n = path.length;
            for (let i = 0; i < n; i++) {
              const p0 = path[Math.max(0, i - 1)], p1 = path[Math.min(n - 1, i + 1)], p = path[i];
              const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
              const u = i / (n - 1), w = R * .78 * (.2 + .8 * u);
              s.v(p.x - dy / l * w, p.y + dx / l * w, .7, 0, 0, 1, WHT, u, 1);
              s.v(p.x + dy / l * w, p.y - dx / l * w, .7, 0, 0, 1, WHT, u, -1);
              if (i) s.q((i - 1) * 2, i * 2, i * 2 + 1, (i - 1) * 2 + 1);
            }
            dTrail.set(s);
            G.fx(dTrail, null, fxTrail);
          }
        }

        for (const b of balls) {
          let x = b.x, y = b.y, z = R + (b.z || 0), k = 0;
          if (b.in) {
            /* the drop: it has already gone over the edge — on down the
               throat and gone */
            const s = b.sink;
            if (!s || s.t >= .9) continue;
            k = clamp(s.t / .55, 0, 1);
            const m = Math.min(1, k * 1.7);
            x = lerp(s.x, s.px, m); y = lerp(s.y, s.py, m); z = R + (s.z || 0) - k * k * 50;
          }
          const q = orient(b.n, x, y, dt, !b.in && !(b.vx || b.vy) && !b._mv && !b.slide, b);
          const m = mBall[b.n];
          m.tint = k ? [1 - k * .75, 1 - k * .75, 1 - k * .75] : ONE;
          G.draw(meshBall, M4.quat(T, q, R, x, y, z), m);
          /* no contact shadow over a hole — there is no cloth there to take it */
          if (!b.in && (b.z || 0) > -.5 && !POCKETS.some(p => Math.hypot(x - p[0], y - p[1]) < POCK)) {
            G.fx(meshDecal, M4.place(T, x + 1.6, y + 2.2, .15, 0, R * 1.3), fxBlob);
          }
        }

        const c = cue();
        if (aiming) {
          const pr = predict(aim);
          strip(dCue, c.x, c.y, pr.x, pr.y, 2.4, fxDash);
          if (pr.kind === 'ball') {
            G.draw(meshBall, M4.quat(T, Q0, R, pr.x, pr.y, R), mGhost);
            G.fx(meshDecal, M4.place(T, pr.x, pr.y, .5, 0, R + 1.5), fxRing);
            const op = objectPath(pr), bx = pr.ball.x, by = pr.ball.y;
            strip(dObj, bx, by, bx + pr.tx * op.len, by + pr.ty * op.len, 3, fxLine);
            if (op.block) {
              const ex = bx + pr.tx * op.len, ey = by + pr.ty * op.len;
              strip(dBlock, ex - pr.ty * 8, ey + pr.tx * 8, ex + pr.ty * 8, ey - pr.tx * 8, 3.2, fxBlock);
            }
            const px = -pr.ty, py = pr.tx;
            const side = Math.sign(Math.cos(aim) * px + Math.sin(aim) * py) || 1;
            strip(dDefl, pr.x, pr.y, pr.x + px * side * 46, pr.y + py * side * 46, 2.4, fxDefl);
          } else {
            G.fx(meshDecal, M4.place(T, pr.x, pr.y, .5, 0, 4), fxDot);
          }
          cueAt(c.x, c.y, aim, R + 4 + pullDist * .55, 1);
        } else if (strike && strike.t < .5) {
          /* the stroke itself: through the ball, a beat of follow-through,
             then the cue fades off the table */
          const s = strike, k = Math.min(1, s.t / .07);
          const alpha = s.t < .22 ? 1 : Math.max(0, 1 - (s.t - .22) / .28);
          if (alpha > 0) cueAt(s.x, s.y, s.a, lerp(R + 4 + s.p * MAXPULL * .55, R - 6, k * k), alpha);
        }
        if (placing) {
          const p = input.pointer;
          if (p.inside) {
            const ok = inBounds(p.x, p.y) && !overlapsAny(p.x, p.y);
            G.draw(meshBall, M4.quat(T, Q0, R, p.x, p.y, R), mGhost);
            G.fx(meshDecal, M4.place(T, p.x, p.y, .5, 0, R + 6), ok ? fxOk : fxBad);
          }
        }
        G.parts(PS);
        G.end();
        ctx.drawImage(G.canvas, 0, 0, W, H);
      }

      return {
        input, render,
        toScreen: (x, y, z) => cam.toScreen(x, y, z || 0),
        step(dt) { PS.step(dt); if (strike) strike.t += dt; },
        onShot(a, p) { const c = cue(); strike = { a, p, t: 0, x: c.x, y: c.y }; },
        burst(x, y, o, h) {
          h = h || {};
          PS.burst({ x, y, z: h.z === undefined ? R : h.z, n: o.count || 10, speed: (o.speed || 150) * .8,
                     up: h.up === undefined ? (o.speed || 150) * .35 : h.up, life: (o.life || .5) * 1.1,
                     size: (o.size || 3) * 1.2, color: o.color || '#ffffff', grav: -650, drag: 1.3, add: true, floor: 0 });
        },
        dispose() { S.dispose(); PS.clear(); }
      };
    }
  }
});
