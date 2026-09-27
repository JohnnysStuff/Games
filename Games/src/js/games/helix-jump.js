/* ======================================================== HELIX JUMP ===== */
/* A ball falls down the outside of a tower. Every so far down there is a ring
   of platforms with a hole in it; you spin the tower, not the ball, and the
   hole has to be under the ball when it lands. Miss and it bounces and you try
   again. Land on red and the run is over.

   Three things make this feel like the thing it is rather than like a physics
   demo that happens to have a ball in it.

   - THE BALL NEVER MOVES SIDEWAYS. It sits at one fixed angle, dead centre of
     the camera, for the whole run. All the motion you see around it is the
     tower turning underneath. Letting the ball orbit instead is the obvious
     implementation and it is immediately, obviously wrong — you lose the one
     fixed reference the player is aiming with.
   - THE BOUNCE IS FIXED, NOT ELASTIC. Every bounce returns exactly the same
     height, so the rhythm of the fall is a constant the player can read. A
     real restitution coefficient makes the bounce decay, the timing drift, and
     the game gradually turn to mush.
   - A STREAK IS THE POINT. Three rings cleared without touching one and the
     ball is lit; from then on it smashes straight through anything that is not
     red, which is what turns a careful descent into a plummet. The whole risk
     curve of the game lives in that one rule.

   Drawn in WebGL as a toy, not as a render: flat saturated colour, two-step
   cel lighting, and a hard ink outline round every silhouette, done with the
   inverted-hull trick (a slightly fatter copy of each mesh, drawn inside out
   in ink). No bloom, no haze, no soft shadows — nothing that blurs the edge
   of the hole you are aiming at. */
registerGame({
  id: 'helix',
  title: 'Helix Jump',
  tagline: 'Spin the tower, drop the ball, find the gap. Three clean rings in a row and it catches fire and smashes through everything that is not red.',
  tags: ['Arcade', 'Reflex', 'One button', 'Skill', 'Timing'],
  scoreLabel: 'Score',
  w: 960, h: 600,
  fluid: true, maxW: 1420,
  front: true,
  controls: [
    ['Spin the tower', 'drag, or &larr; / &rarr; / A / D'],
    ['Pause', 'Esc']
  ],
  options: [
    { id: 'height', label: 'Tower', def: 'standard', type: 'cards', choices: [
      { v: 'short',    l: 'Short',    icon: '&#127967;', desc: 'Twenty rings. About a minute if it goes well.' },
      { v: 'standard', l: 'Standard', icon: '&#127963;', desc: 'Thirty-five rings, and the hazards tighten as you go.' },
      { v: 'long',     l: 'Long Drop', icon: '&#127956;', desc: 'Sixty rings. The bottom half is genuinely mean.' }
    ] },
    { id: 'hazard', label: 'Red rings', def: 'standard', type: 'cards', choices: [
      { v: 'gentle',   l: 'Gentle',   icon: '&#128994;', desc: 'Wide gaps, and red only appears deep down.' },
      { v: 'standard', l: 'Standard', icon: '&#128993;', desc: 'The tower as intended.' },
      { v: 'brutal',   l: 'Brutal',   icon: '&#128308;', desc: 'Narrow gaps and red from the top. Good luck.' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><clipPath id="hxBallC"><circle cx="172" cy="50" r="16"/></clipPath></defs><rect width="320" height="180" fill="#3cc8d8"/><g fill="#62d6e3"><circle cx="40" cy="36" r="24"/><circle cx="292" cy="146" r="32"/><circle cx="272" cy="28" r="8"/><circle cx="24" cy="150" r="11"/></g><g stroke="#1d1830" stroke-width="3" stroke-linejoin="round"><ellipse cx="160" cy="150" rx="88" ry="22" fill="#d9a520"/><ellipse cx="160" cy="140" rx="88" ry="22" fill="#ffd23f"/><path d="M160 140L116 159.1A88 22 0 0 1 77.3 147.5Z" fill="#e8364f"/></g><rect x="146" y="80" width="28" height="60" fill="#fff7ea"/><path d="M146 80V140M174 80V140" stroke="#1d1830" stroke-width="3"/><g stroke="#1d1830" stroke-width="3" stroke-linejoin="round"><ellipse cx="160" cy="90" rx="88" ry="22" fill="#d9a520"/><ellipse cx="160" cy="80" rx="88" ry="22" fill="#ffd23f"/><path d="M160 80L242.7 72.5A88 22 0 0 0 190.1 59.3Z" fill="#3cc8d8"/></g><path d="M118 90q7-8 15-3 10-3 12 4 6 6-2 9-6 6-14 2-11 1-11-6-4-4 0-6z" fill="#e8338c"/><rect x="146" y="-4" width="28" height="84" fill="#fff7ea"/><path d="M146 -4V80M174 -4V80" stroke="#1d1830" stroke-width="3"/><ellipse cx="172" cy="86" rx="14" ry="3.6" fill="#1d1830" opacity=".22"/><circle cx="172" cy="50" r="16" fill="#ff4fa0"/><g clip-path="url(#hxBallC)"><path d="M154 45q18 6 36 0v9q-18 6-36 0z" fill="#fff"/><path d="M150 57h46v14h-46z" fill="#1d1830" opacity=".15"/></g><circle cx="172" cy="50" r="16" fill="none" stroke="#1d1830" stroke-width="3"/><circle cx="165.5" cy="42.5" r="3.8" fill="#fff"/></svg>',

  mount(api) {
    const H = 600;
    let W = api.W;
    /* a round started from the front page carries on from it: the same
       tower at the same turn, and the ball in the air where it was */
    const FROM_MENU = !!api.fromMenu;
    const CARRY = FROM_MENU && api.carry && api.carry.helix ? api.carry : null;

    /* ------------------------------------------------------------- tuning */
    const SEGS = 12;                       // wedges per ring, 30 degrees each
    const R_IN = 0.62;                     // the tower core
    const R_OUT = 2.30;                    // outer edge of a ring
    const THICK = 0.26;
    const DROP = 2.15;                     // vertical spacing between rings
    const BALL_R = 0.42;

    const GRAV = 26;
    const BOUNCE = 7.4;                    // fixed, so every bounce is alike
    const FALL_CAP = 13;
    const SPIN_KEY = 3.1;                  // radians/second on the keyboard
    const SPIN_DRAG = 0.011;               // radians per pixel of drag
    const FIRE_AT = 3;                     // clean rings before the ball lights

    /* The ball rides the FACE of the tower, not its axis: it sits at a fixed
       world angle of a quarter turn — dead centre of the camera — and stays
       there all run. Everything the player aims with is measured from that. */
    const BALL_ANG = Math.PI / 2;
    const BALL_ORBIT = R_OUT - 0.35;

    /* both can be changed on the front page, which rebuilds the tower */
    const heightOf = v => ({ short: 20, standard: 35, long: 60 })[v || 'standard'] || 35;
    const HAZARDS = { gentle:   { gap: [4, 5], red: [0.00, 0.22], from: 0.45 },
                      standard: { gap: [3, 4], red: [0.06, 0.38], from: 0.18 },
                      brutal:   { gap: [2, 3], red: [0.18, 0.52], from: 0.02 } };
    const hazOf = v => HAZARDS[v || 'standard'] || HAZARDS.standard;
    let HEIGHT = heightOf(api.opt('height'));
    let HAZ = hazOf(api.opt('hazard'));

    /* ------------------------------------------------------------- colour */
    const rgb3 = h => {
      const n = parseInt(h.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };
    const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const css3 = c => 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';

    /* The tower is a stack of themes, a new one every nine rings: a sky, and
       a ring colour picked to stand clear of both the sky and the red. None of
       the ring colours is anywhere near red, because the one thing a player
       must never have to squint at is which wedge kills them. The ball stays
       one colour the whole way down so it is always the thing you are
       watching. */
    const THEME_EVERY = 9;
    const THEMES = [
      { sky: '#3cc8d8', ring: '#ffd23f' },
      { sky: '#7a5cf2', ring: '#3ee0a4' },
      { sky: '#ff9361', ring: '#3d8bff' },
      { sky: '#26407e', ring: '#58e0ff' },
      { sky: '#3fcb8b', ring: '#8b5cf6' }
    ].map(t => ({ sky: rgb3(t.sky), ring: rgb3(t.ring) }));
    const C_INK = rgb3('#1d1830');
    const C_POLE = rgb3('#fff7ea');
    const C_HAZ = rgb3('#e8364f'), C_HAZ_LO = rgb3('#a3162e');
    const C_BALL = rgb3('#ff4fa0'), C_STRIPE = rgb3('#ffffff');
    const C_FIRE = rgb3('#ff7a1a'), C_FIRE_STRIPE = rgb3('#ffd23f');
    const C_SPLAT = rgb3('#e8338c');

    /* --------------------------------------------------------- the tower */
    /* A ring is SEGS flags: 0 open, 1 solid, 2 red. The gap is a run of
       consecutive open wedges, placed at a random angle; red wedges are salted
       into what is left, never adjacent to the gap — landing next to the hole
       and dying for it reads as the game cheating rather than as a mistake. */
    let seed = CARRY ? CARRY.seed : (Math.random() * 1e9) | 0;
    const SEED0 = seed;
    function rnd() { seed = (seed * 1664525 + 1013904223) | 0; return ((seed >>> 8) & 0xffffff) / 0x1000000; }
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

    /* A ring is drawn as RUNS — each unbroken stretch of wedges is one piece of
       geometry, with red marked per wedge inside it — rather than as twelve
       separate wedges. A run of wedges drawn one by one has an outline between
       every pair, and the ring reads as a pie chart. */
    function runsOf(cells) {
      const out = [];
      let start = -1;
      for (let k = 0; k < SEGS; k++) if (cells[k] === 0) { start = k; break; }
      if (start < 0) {
        let mask = 0;
        for (let k = 0; k < SEGS; k++) if (cells[k] === 2) mask |= 1 << k;
        return [{ start: 0, len: SEGS, mask: mask }];
      }
      /* walk once round the ring from an open wedge, so a run that wraps past
         wedge 0 stays one run */
      let cur = null;
      for (let s = 1; s <= SEGS; s++) {
        const k = (start + s) % SEGS;
        if (cells[k]) {
          if (!cur) { cur = { start: k, len: 0, mask: 0 }; out.push(cur); }
          if (cells[k] === 2) cur.mask |= 1 << cur.len;
          cur.len++;
        } else cur = null;
      }
      return out;
    }

    const rings = [];
    function buildTower() {
      for (let i = 0; i < HEIGHT; i++) {
        const t = i / Math.max(1, HEIGHT - 1);
        const cells = new Array(SEGS).fill(1);
        const gw = ri(HAZ.gap[0], HAZ.gap[1]);
        const g0 = ri(0, SEGS - 1);
        for (let k = 0; k < gw; k++) cells[(g0 + k) % SEGS] = 0;
        /* red density ramps with depth, and only past `from` */
        const p = t < HAZ.from ? HAZ.red[0]
                : HAZ.red[0] + (HAZ.red[1] - HAZ.red[0]) * ((t - HAZ.from) / (1 - HAZ.from));
        for (let k = 0; k < SEGS; k++) {
          if (cells[k] !== 1) continue;
          const nearGap = cells[(k + 1) % SEGS] === 0 || cells[(k + SEGS - 1) % SEGS] === 0;
          if (!nearGap && rnd() < p) cells[k] = 2;
        }
        /* never a full ring of red: there has to be somewhere to bounce */
        let solids = 0;
        for (let k = 0; k < SEGS; k++) if (cells[k] === 1) solids++;
        if (solids < 2) for (let k = 0; k < SEGS && solids < 2; k++)
          if (cells[k] === 2) { cells[k] = 1; solids++; }
        const theme = THEMES[Math.floor(i / THEME_EVERY) % THEMES.length];
        rings.push({ cells: cells, runs: runsOf(cells), y: -i * DROP,
                     col: i % 2 ? mix3(theme.ring, C_INK, 0.07) : theme.ring,
                     gone: false, i: i, splats: [] });
      }
    }
    buildTower();
    const FLOOR_Y = -HEIGHT * DROP;
    const FLOOR_TOP = FLOOR_Y - DROP * 0.5;

    /* ---------------------------------------------------------- the state */
    let rot = CARRY ? CARRY.rot : 0, spinV = 0;
    let ball = CARRY ? { y: CARRY.y, vy: CARRY.vy, spin: CARRY.spin, squash: CARRY.squash }
                     : { y: DROP * 0.5, vy: 0, spin: 0, squash: 0 };
    let depth = 0;                 // rings passed
    let combo = 0, bestCombo = 0, fired = false, fireT = 0;
    let score = 0, dead = false, won = false, endT = 0, ended = false;
    let camY = CARRY ? CARRY.camY : ball.y, camTo = CARRY ? CARRY.camTo : ball.y;
    if (CARRY && CARRY.splats) rings[0].splats = CARRY.splats;
    let lastPX = null, clock = 0;
    const bits = [];               // the pieces of a smashed ring
    const chunks = [];             // small solid bits: a death, a win
    const ghosts = [];             // where a lit ball has just been
    const pops = [];               // "+12" and friends, in screen space
    let banner = null;             // { text, col, t }

    /* ============================ RENDERER ================================ */
    /* WebGL2. If the machine has no WebGL2 at all the game says so rather than
       showing a black rectangle — there is no sensible 2D fallback for a
       perspective tower, and pretending otherwise would be worse than being
       honest about it. */
    const glcv = document.createElement('canvas');
    let gl = null;
    try { gl = glcv.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true }); } catch (e) {}

    /* ---- small matrix helpers, column-major like GL wants ---- */
    function mPersp(out, fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2);
      out.fill(0);
      out[0] = t / asp; out[5] = t; out[11] = -1;
      out[10] = (f + n) / (n - f); out[14] = (2 * f * n) / (n - f);
      return out;
    }
    function mLook(out, ex, ey, ez, cx, cy, cz) {
      let zx = ex - cx, zy = ey - cy, zz = ez - cz;
      let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
      /* up is world +Y, so cross(up, z) collapses to (z.z, 0, -z.x) */
      let xx = zz, xy = 0, xz = -zx;
      l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
      out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
      out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
      out[12] = -(xx * ex + xy * ey + xz * ez);
      out[13] = -(yx * ex + yy * ey + yz * ez);
      out[14] = -(zx * ex + zy * ey + zz * ez);
      out[15] = 1;
      return out;
    }
    function mMul(out, a, b) {
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
                         a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return out;
    }
    const matP = new Float32Array(16), matV = new Float32Array(16), matVP = new Float32Array(16);

    /* Materials, picked per instance:
         0 matte      the pole, debris, confetti
         1 ball       two-step cel light, a hard highlight, a stripe that rolls
         2 shadow     flat, blended, hard-edged
         3 ring       per-wedge red lookup, a pale lip along the outer edge
         4 splat      flat paint, turned about Y rather than Z
         5 goal       the checkered platform at the bottom
         7 flat       unlit colour, for the lit ball's afterimages
       and a uniform that turns any of them into ink for the outline pass. */
    const VS = [
      '#version 300 es',
      'layout(location=0) in vec3 aPos;',
      'layout(location=1) in vec3 aNrm;',
      'layout(location=2) in vec4 iT;',     // yaw, ty, scale, squash-or-alpha
      'layout(location=3) in vec4 iCol;',   // rgb, red mask on a ring
      'layout(location=4) in vec4 iX;',     // ofsX, ofsZ, spin, material
      'uniform mat4 uVP;',
      'uniform float uBallR;',
      /* the colour is per instance, and flat: interpolating a packed integer
         across a triangle, even a constant one, lands a hair off and breaks the
         red-wedge lookup into speckle */
      'out vec3 vN; out vec3 vON; out vec3 vObj; flat out vec4 vC; flat out float vMat; flat out float vA;',
      'void main(){',
      '  float mat = iX.w;',
      '  vec3 p = aPos * iT.z;',
      '  vec3 n = aNrm;',
      '  float sc = cos(iX.z), ss = sin(iX.z);',
      '  if (mat > 3.5 && mat < 4.5) {',
      /* paint lies flat, so it turns about the vertical */
      '    p = vec3(p.x*sc - p.z*ss, p.y, p.x*ss + p.z*sc);',
      '  } else {',
      /* everything else spins about Z, which at the ball reads as rolling */
      '    p = vec3(p.x*sc - p.y*ss, p.x*ss + p.y*sc, p.z);',
      '    n = vec3(n.x*sc - n.y*ss, n.x*ss + n.y*sc, n.z);',
      '  }',
      '  vObj = p; vON = n;',
      '  if (mat > 0.5 && mat < 1.5) {',
      /* Squash about the point of contact, not the centre. Squashing about
         the centre lifts the bottom of the ball off the ring at the very
         moment it is meant to be pressed into it. Negative is a stretch. */
      '    float sq = iT.w;',
      '    p.y = (p.y + uBallR) * (1.0 - 0.36 * sq) - uBallR;',
      '    p.xz *= 1.0 + 0.2 * sq;',
      '  }',
      '  p += vec3(iX.x, 0.0, iX.y);',
      /* then the tower's yaw. A positive yaw moves a point to a LARGER angle,
         so a wedge built at [0,A] and given yaw Y lands at [Y, Y+A]; getting
         this backwards puts the hole on the far side from where it is drawn. */
      '  float c = cos(iT.x), s = sin(iT.x);',
      '  vec3 r = vec3(p.x*c - p.z*s, p.y, p.x*s + p.z*c);',
      '  vN = vec3(n.x*c - n.z*s, n.y, n.x*s + n.z*c);',
      '  vC = iCol; vMat = mat; vA = iT.w;',
      '  gl_Position = uVP * vec4(r + vec3(0.0, iT.y, 0.0), 1.0);',
      '}'
    ].join('\n');

    const FS = [
      '#version 300 es',
      'precision highp float;',
      'in vec3 vN; in vec3 vON; in vec3 vObj; flat in vec4 vC; flat in float vMat; flat in float vA;',
      'uniform vec3 uLight; uniform vec3 uHalf;',
      'uniform float uInk; uniform vec3 uInkCol;',
      'uniform vec3 uHaz; uniform vec3 uHazLo; uniform vec3 uStripe;',
      'uniform float uROut; uniform float uSeg;',
      'out vec4 o;',
      /* coverage of `d < 0`, antialiased over one pixel — every hard edge in
         here goes through this, which is what keeps them hard but not jagged */
      'float inside(float d) { float w = fwidth(d); return clamp(0.5 - d / max(w, 1e-5), 0.0, 1.0); }',
      'void main(){',
      '  if (uInk > 0.5) { o = vec4(uInkCol, 1.0); return; }',
      '  vec3 n = normalize(vN);',
      '  float m = vMat;',
      '  vec3 col = vC.rgb;',
      '  if (m > 6.5) { o = vec4(col, 1.0); return; }',
      '  if (m > 1.5 && m < 2.5) { o = vec4(col * vA, vA); return; }',
      '  if (m > 3.5 && m < 4.5) { o = vec4(col, 1.0); return; }',
      '  float dif = max(dot(n, uLight), 0.0);',
      '  if (m > 0.5 && m < 1.5) {',
      '    vec3 on = normalize(vObj);',
      '    col = mix(col, uStripe, inside(abs(on.y) - 0.22));',
      '    float dark = inside(dot(n, uLight) - 0.08);',            // 1 in shadow
      '    col *= mix(1.0, 0.74, dark);',
      '    float spec = inside(0.955 - dot(n, uHalf));',
      '    col = mix(col, vec3(1.0), spec * 0.92);',
      '    o = vec4(col, 1.0); return;',
      '  }',
      '  float top = inside(0.5 - vON.y);',                     // 1 on an up face
      '  float bot = inside(vON.y + 0.5);',
      '  if (m > 2.5 && m < 3.5) {',
      /* `a` packs the run length above the red mask. A point a hair before
         angle zero wraps to nearly a full turn, which on a short run would
         look up a wedge it does not have — the length is what catches that. */
      '    float len = floor(vC.a / 4096.0 + 0.0001);',
      '    float mask = vC.a - len * 4096.0;',
      '    float ang = atan(vObj.z, vObj.x);',
      '    if (ang < 0.0) ang += 6.2831853;',
      '    if (len < 11.5 && ang > len * uSeg + 0.2) ang = 0.0;',
      '    float j = floor(ang / uSeg + 0.0005);',
      '    float red = mod(floor(mask / pow(2.0, j) + 0.001), 2.0);',
      '    if (red > 0.5) {',
      '      float tw = abs(fract((vObj.x - vObj.z) * 1.9) - 0.5);',
      '      col = mix(uHaz, uHazLo, inside(tw - 0.17));',
      '    }',
      '    float lip = top * inside((uROut - 0.1) - length(vObj.xz));',
      '    col = mix(col, vec3(1.0), lip * 0.4);',
      '  } else if (m > 4.5 && m < 5.5) {',
      '    float ang = atan(vObj.z, vObj.x);',
      '    float k = sin(ang * 8.0) * sin(length(vObj.xz) * 5.4);',
      '    col = mix(col, vec3(1.0), inside(-k) * top);',
      '  }',
      /* flat two-step shading by face: tops lit, walls a step down with a
         little of the light so a round wall still reads as round, bottoms
         darkest */
      '  float shade = mix(mix(0.66 + 0.26 * dif, 0.48, bot), 1.0, top);',
      '  if (m < 0.5) shade = 0.84 + 0.16 * dif;',
      '  o = vec4(col * shade, 1.0);',
      '}'
    ].join('\n');

    let prog = null, insBuf = null, U = {};
    let glOK = false;
    const meshes = [];
    let mArc = [], mArcInk = [], mPole = null, mPoleInk = null, mBall = null, mBallInk = null;
    let mBit = null, mShad = null, mBlob = null, mGoal = null, mGoalInk = null;

    /* How far the ink shell stands off each surface. It is in world units, so
       the line thins a little with distance, which is what a drawn line on a
       toy would do anyway. */
    const INK_W = 0.05;

    function Build() {
      return {
        v: [], i: [],
        vert(x, y, z, nx, ny, nz) { const id = this.v.length / 6; this.v.push(x, y, z, nx, ny, nz); return id; },
        /* A triangle wound so its front is whichever side (nx,ny,nz) points
           to. The outline pass depends on culling, and getting a dozen
           meshes' winding right by hand is how a face quietly vanishes; this
           way the intended normal decides and it cannot be wrong. */
        tri(a, b, c, nx, ny, nz) {
          const V = this.v;
          const ax = V[a * 6], ay = V[a * 6 + 1], az = V[a * 6 + 2];
          const ux = V[b * 6] - ax, uy = V[b * 6 + 1] - ay, uz = V[b * 6 + 2] - az;
          const wx = V[c * 6] - ax, wy = V[c * 6 + 1] - ay, wz = V[c * 6 + 2] - az;
          const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
          if (cx * nx + cy * ny + cz * nz < 0) this.i.push(a, c, b); else this.i.push(a, b, c);
        },
        quad(a, b, c, d, nx, ny, nz) { this.tri(a, b, c, nx, ny, nz); this.tri(a, c, d, nx, ny, nz); }
      };
    }
    function mesh(b) {
      if (!b.v.length) return null;
      /* 16-bit indices, drawn as UNSIGNED_SHORT. Mismatching those two is a
         silent "insufficient buffer size" and an empty screen, so the type is
         pinned to the array here rather than at the call site. */
      const vao = gl.createVertexArray();
      const vb = gl.createBuffer(), ib = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b.v), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(b.i), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, insBuf);
      for (let a = 0; a < 3; a++) {
        gl.enableVertexAttribArray(2 + a);
        gl.vertexAttribPointer(2 + a, 4, gl.FLOAT, false, ISTRIDE * 4, a * 16);
        gl.vertexAttribDivisor(2 + a, 1);
      }
      gl.bindVertexArray(null);
      const m = { vao: vao, n: b.i.length, vb: vb, ib: ib };
      meshes.push(m);
      return m;
    }

    /* A run of `k` wedges as one solid, from angle 0 to k*A. With `t` it is
       the ink shell for the same run: `t` fatter all round, and `t` longer at
       each cut end, so the outline carries on round the corner of a gap. */
    function arcMesh(k, t) {
      const b = Build(), A = (TAU / SEGS) * k, full = k >= SEGS;
      const d = full ? 0 : t / R_OUT;
      const a0 = -d, a1 = A + d;
      const N = Math.max(3, k * 5);
      const rIn = R_IN - t, rOut = R_OUT + t, hy = THICK / 2 + t;
      const ang = j => a0 + (a1 - a0) * (j / N);
      for (const sg of [1, -1]) {
        let pi = -1, po = -1;
        for (let j = 0; j <= N; j++) {
          const a = ang(j), c = Math.cos(a), s = Math.sin(a);
          const vi = b.vert(c * rIn, sg * hy, s * rIn, 0, sg, 0);
          const vo = b.vert(c * rOut, sg * hy, s * rOut, 0, sg, 0);
          if (j) b.quad(pi, po, vo, vi, 0, sg, 0);
          pi = vi; po = vo;
        }
      }
      for (const w of [{ r: rOut, s: 1 }, { r: rIn, s: -1 }]) {
        let pt = -1, pb = -1;
        for (let j = 0; j <= N; j++) {
          const a = ang(j), c = Math.cos(a), s = Math.sin(a);
          const vt = b.vert(c * w.r, hy, s * w.r, c * w.s, 0, s * w.s);
          const vb = b.vert(c * w.r, -hy, s * w.r, c * w.s, 0, s * w.s);
          if (j) {
            const am = ang(j - 0.5);
            b.quad(pt, vt, vb, pb, Math.cos(am) * w.s, 0, Math.sin(am) * w.s);
          }
          pt = vt; pb = vb;
        }
      }
      if (!full) for (const e of [{ a: a0, s: -1 }, { a: a1, s: 1 }]) {
        const c = Math.cos(e.a), s = Math.sin(e.a);
        const nx = -s * e.s, nz = c * e.s;
        const p0 = b.vert(c * rIn, hy, s * rIn, nx, 0, nz);
        const p1 = b.vert(c * rOut, hy, s * rOut, nx, 0, nz);
        const p2 = b.vert(c * rOut, -hy, s * rOut, nx, 0, nz);
        const p3 = b.vert(c * rIn, -hy, s * rIn, nx, 0, nz);
        b.quad(p0, p1, p2, p3, nx, 0, nz);
      }
      return mesh(b);
    }

    /* a closed cylinder, capped or not */
    function cylMesh(r, y0, y1, n, caps) {
      const b = Build();
      let pt = -1, pb = -1;
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * TAU, c = Math.cos(a), s = Math.sin(a);
        const vt = b.vert(c * r, y1, s * r, c, 0, s);
        const vb = b.vert(c * r, y0, s * r, c, 0, s);
        if (k) {
          const am = ((k - 0.5) / n) * TAU;
          b.quad(pt, vt, vb, pb, Math.cos(am), 0, Math.sin(am));
        }
        pt = vt; pb = vb;
      }
      if (caps) for (const e of [{ y: y1, s: 1 }, { y: y0, s: -1 }]) {
        const mid = b.vert(0, e.y, 0, 0, e.s, 0);
        let prev = -1;
        for (let k = 0; k <= n; k++) {
          const a = (k / n) * TAU;
          const v = b.vert(Math.cos(a) * r, e.y, Math.sin(a) * r, 0, e.s, 0);
          if (k) b.tri(mid, prev, v, 0, e.s, 0);
          prev = v;
        }
      }
      return mesh(b);
    }

    /* Centred on the origin. The orbit offset rides on the instance, so the
       same sphere is the ball, a chunk of debris and an afterimage — and the
       ball's own spin turns about its own centre, which is the only way the
       stripe reads as rolling. */
    function sphMesh(r, nu, nv) {
      const b = Build(), rows = [], P = [];
      for (let j = 0; j <= nv; j++) {
        const ph = (j / nv) * Math.PI, sy = Math.cos(ph), sr = Math.sin(ph);
        const row = [];
        for (let k = 0; k <= nu; k++) {
          const a = (k / nu) * TAU, cx = Math.cos(a) * sr, cz = Math.sin(a) * sr;
          row.push(b.vert(cx * r, sy * r, cz * r, cx, sy, cz));
          P.push([cx, sy, cz]);
        }
        rows.push(row);
      }
      for (let j = 0; j < nv; j++) for (let k = 0; k < nu; k++) {
        const pm = ((j + 0.5) / nv) * Math.PI, am = ((k + 0.5) / nu) * TAU;
        b.quad(rows[j][k], rows[j][k + 1], rows[j + 1][k + 1], rows[j + 1][k],
               Math.cos(am) * Math.sin(pm), Math.cos(pm), Math.sin(am) * Math.sin(pm));
      }
      return mesh(b);
    }

    /* flat and facing up: a disc, or a lumpy splash of paint */
    function flatMesh(n, lumpy) {
      const b = Build();
      const mid = b.vert(0, 0, 0, 0, 1, 0);
      let prev = -1;
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * TAU;
        const r = lumpy ? 1 + 0.17 * Math.sin(a * 5) + 0.08 * Math.sin(a * 11 + 1.3) : 1;
        const v = b.vert(Math.cos(a) * r, 0, Math.sin(a) * r, 0, 1, 0);
        if (k) b.tri(mid, prev, v, 0, 1, 0);
        prev = v;
      }
      return mesh(b);
    }

    const MAXI = 2400, ISTRIDE = 12;
    const idata = new Float32Array(MAXI * ISTRIDE);
    let icount = 0;
    const POLE_TOP = DROP * 2.4, POLE_BOT = FLOOR_Y - 1.4;
    const GOAL_R = R_OUT + 0.25, GOAL_H = 0.5;

    function initGL() {
      if (!gl) return false;
      function sh(t, src) {
        const s = gl.createShader(t);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn('helix shader', gl.getShaderInfoLog(s)); return null;
        }
        return s;
      }
      const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return false;
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('helix link', gl.getProgramInfoLog(prog)); return false;
      }
      gl.deleteShader(vs); gl.deleteShader(fs);
      for (const u of ['uVP', 'uBallR', 'uLight', 'uHalf', 'uInk', 'uInkCol', 'uHaz', 'uHazLo', 'uStripe', 'uROut', 'uSeg'])
        U[u] = gl.getUniformLocation(prog, u);
      insBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, insBuf);
      gl.bufferData(gl.ARRAY_BUFFER, MAXI * ISTRIDE * 4, gl.DYNAMIC_DRAW);
      for (let k = 1; k <= SEGS; k++) { mArc[k] = arcMesh(k, 0); mArcInk[k] = arcMesh(k, INK_W); }
      mPole = cylMesh(R_IN - 0.02, POLE_BOT, POLE_TOP, 32, true);
      mPoleInk = cylMesh(R_IN - 0.02 + INK_W, POLE_BOT - INK_W, POLE_TOP + INK_W, 32, true);
      mBall = sphMesh(BALL_R, 28, 18);
      mBallInk = sphMesh(BALL_R + 0.045, 28, 18);
      mBit = sphMesh(1, 10, 7);
      mShad = flatMesh(36, false);
      mBlob = flatMesh(44, true);
      mGoal = cylMesh(GOAL_R, -GOAL_H, 0, 40, true);
      mGoalInk = cylMesh(GOAL_R + INK_W, -GOAL_H - INK_W, INK_W, 40, true);
      for (let k = 1; k <= SEGS; k++) if (!mArc[k] || !mArcInk[k]) return false;
      return !!(mPole && mPoleInk && mBall && mBallInk && mBit && mShad && mBlob && mGoal && mGoalInk);
    }
    glOK = initGL();

    function push(yaw, ty, scale, w, col, extra, ox, oz, spin, mat) {
      if (icount >= MAXI) return;
      const o = icount * ISTRIDE;
      idata[o] = yaw; idata[o + 1] = ty; idata[o + 2] = scale; idata[o + 3] = w;
      idata[o + 4] = col[0]; idata[o + 5] = col[1]; idata[o + 6] = col[2]; idata[o + 7] = extra || 0;
      idata[o + 8] = ox || 0; idata[o + 9] = oz || 0;
      idata[o + 10] = spin || 0; idata[o + 11] = mat || 0;
      icount++;
    }
    /* Upload what has been pushed, then draw it: the ink shell first, inside
       out, and the real mesh over it. Both draws share one upload. */
    function flush(m, ink) {
      if (!icount || !m) { icount = 0; return; }
      gl.bindBuffer(gl.ARRAY_BUFFER, insBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, idata, 0, icount * ISTRIDE);
      if (ink) {
        gl.uniform1f(U.uInk, 1);
        gl.cullFace(gl.FRONT);
        gl.bindVertexArray(ink.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, ink.n, gl.UNSIGNED_SHORT, 0, icount);
        gl.uniform1f(U.uInk, 0);
        gl.cullFace(gl.BACK);
      }
      gl.bindVertexArray(m.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0, icount);
      gl.bindVertexArray(null);
      icount = 0;
    }

    /* ------------------------------------------------------------ the draw */
    const CAM = { fov: 0.64, up: 4.4, back: 8.8, look: 1.7 };
    const BX = Math.cos(BALL_ANG) * BALL_ORBIT, BZ = Math.sin(BALL_ANG) * BALL_ORBIT;

    function glDraw(pw, ph) {
      if (glcv.width !== pw || glcv.height !== ph) { glcv.width = pw; glcv.height = ph; }
      gl.viewport(0, 0, pw, ph);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const cn = camNow();
      mPersp(matP, CAM.fov, pw / ph, 0.5, 90);
      /* on the front page the lens is shifted, so the tower stands to one side */
      matP[8] = cn.lens;
      /* the camera sits above and out, and only ever moves up and down */
      mLook(matV, 0, camY + cn.up, cn.back, 0, camY - cn.look, 0);
      mMul(matVP, matP, matV);

      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.uVP, false, matVP);
      gl.uniform1f(U.uBallR, BALL_R);
      const lx = -0.45, ly = 0.78, lz = 0.55, ll = Math.hypot(lx, ly, lz);
      gl.uniform3f(U.uLight, lx / ll, ly / ll, lz / ll);
      /* the half vector for the ball's highlight — the camera only moves up
         and down, so this is as good as constant */
      const ey = CAM.up + CAM.look, ez = CAM.back, el = Math.hypot(ey, ez);
      const hx = lx / ll, hy = ly / ll + ey / el, hz = lz / ll + ez / el, hl = Math.hypot(hx, hy, hz);
      gl.uniform3f(U.uHalf, hx / hl, hy / hl, hz / hl);
      gl.uniform1f(U.uInk, 0);
      gl.uniform3f(U.uInkCol, C_INK[0], C_INK[1], C_INK[2]);
      gl.uniform3f(U.uHaz, C_HAZ[0], C_HAZ[1], C_HAZ[2]);
      gl.uniform3f(U.uHazLo, C_HAZ_LO[0], C_HAZ_LO[1], C_HAZ_LO[2]);
      const stripe = fired ? C_FIRE_STRIPE : C_STRIPE;
      gl.uniform3f(U.uStripe, stripe[0], stripe[1], stripe[2]);
      gl.uniform1f(U.uROut, R_OUT);
      gl.uniform1f(U.uSeg, TAU / SEGS);

      /* the pole */
      push(0, 0, 1, 0, C_POLE, 0, 0, 0, 0, 0);
      flush(mPole, mPoleInk);

      /* The rings, grouped by run length so each length is one instanced
         draw. Only the handful either side of the ball are worth sending. */
      const A = TAU / SEGS;
      const lo = Math.max(0, depth - 3), hi = Math.min(rings.length, depth + 9);
      for (let k = 1; k <= SEGS; k++) {
        for (let i = lo; i < hi; i++) {
          const R = rings[i];
          if (R.gone) continue;
          for (const run of R.runs) if (run.len === k) push(rot + run.start * A, R.y, ringPop(R), 0, R.col, run.mask + k * 4096, 0, 0, 0, 3);
        }
        flush(mArc[k], mArcInk[k]);
      }

      /* the goal at the bottom */
      if (hi >= rings.length) {
        const gcol = rings[rings.length - 1].col;
        push(0, FLOOR_TOP, 1, 0, gcol, 0, 0, 0, 0, 5);
        flush(mGoal, mGoalInk);
      }

      /* the pieces of a smashed ring, flying out and shrinking away */
      for (const b of bits) {
        const mid = A / 2;
        push(rot + b.a, b.y, b.s, 0, b.col, b.mask + 4096,
             Math.cos(mid) * b.dr, Math.sin(mid) * b.dr, 0, 3);
      }
      flush(mArc[1], mArcInk[1]);

      /* solid chunks from a death or a win */
      for (const c of chunks) {
        const k = 1 - c.t / c.life;
        const wa = rot + c.a;
        push(0, c.y, c.sz * Math.min(1, k * 2.5), 0, c.col, 0,
             Math.cos(wa) * c.r, Math.sin(wa) * c.r, 0, 0);
      }
      flush(mBit, null);

      /* Paint where the ball has bounced. It belongs to the ring, so it turns
         with the tower, and it sits a hair above the top face with a depth
         offset rather than a gap you could see from the side. */
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(-2, -4);
      for (let i = lo; i < hi; i++) {
        const R = rings[i];
        if (R.gone) continue;
        for (const s of R.splats) {
          const grow = Math.min(1, s.age / 0.08);
          push(rot + s.a, R.y + THICK / 2 + 0.002, s.size * (0.6 + 0.4 * grow), 0, C_SPLAT, 0,
               BALL_ORBIT, 0, s.spin, 4);
        }
      }
      if (FLOOR_SPLAT.on) push(rot + FLOOR_SPLAT.a, FLOOR_TOP + 0.002, 0.5, 0, C_SPLAT, 0, BALL_ORBIT, 0, FLOOR_SPLAT.spin, 4);
      flush(mBlob, null);
      gl.disable(gl.POLYGON_OFFSET_FILL);

      /* the lit ball's afterimages: flat discs of colour, shrinking */
      for (let i = 0; i < ghosts.length; i++) {
        const gh = ghosts[i];
        const k = 1 - gh.t / 0.2;
        if (k <= 0) continue;
        push(0, gh.y + 0.1, 0.8 * k * k, 0, mix3(C_FIRE, C_FIRE_STRIPE, 1 - k), 0, BX, BZ - 0.25, 0, 7);
      }
      flush(mBall, null);

      /* the ball */
      if (!(dead && endT > 0.02)) {
        const stretch = ball.vy < 0 ? clamp(-ball.vy / FALL_CAP, 0, 1) * 0.35 : 0;
        push(0, ball.y, 1, ball.squash - stretch, fired ? C_FIRE : C_BALL, 0, BX, BZ, ball.spin, 1);
        flush(mBall, mBallInk);
      }

      /* The ball's shadow, on whatever is directly below it — and only if
         there IS something below it. That absence is the aiming cue: when the
         shadow disappears you are over the hole, which says it far better than
         any marker painted on the ring could. Hard-edged, blended, and with
         depth writes off so the ring's own far edge cannot punch through it. */
      const under = dead ? null : shadowTarget();
      if (under !== null) {
        const drop = clamp((ball.y - BALL_R - under) / (DROP * 1.6), 0, 1);
        const sz = BALL_R * (0.8 + 0.5 * drop);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-4, -8);
        push(0, under + 0.003, sz, 0.26 * (1 - drop * 0.5), C_INK, 0, BX, BZ, 0, 2);
        flush(mShad, null);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    }

    /* where a world point lands on the 2D stage, for text that follows it */
    function project(x, y, z) {
      const m = matVP;
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
      const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (Math.abs(cw) < 1e-6) return { x: W / 2, y: H / 2 };
      return { x: (cx / cw * 0.5 + 0.5) * W, y: (0.5 - cy / cw * 0.5) * H };
    }

    /* ------------------------------------------------------------ the sky */
    /* Painted in 2D under the GL frame: one flat colour for the band of tower
       you are in, easing into the next as you fall past the change, and big
       soft-edged-nothing shapes drifting up at a fraction of the fall so the
       drop has somewhere to be dropping past. */
    const DECO = [];
    {
      let s = 1337;
      const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 16; i++) {
        DECO.push({ x: r(), y: r() * 1400, rad: 14 + r() * 90, ring: r() < 0.45, lighter: r() < 0.7 });
      }
    }
    function skyAt(cy) {
      const f = Math.max(0, -cy / DROP);
      const band = Math.floor(f / THEME_EVERY);
      const into = f - band * THEME_EVERY;
      const a = THEMES[band % THEMES.length].sky, b = THEMES[(band + 1) % THEMES.length].sky;
      const k = clamp((into - (THEME_EVERY - 1.2)) / 1.2, 0, 1);
      return mix3(a, b, k * k * (3 - 2 * k));
    }
    function paintSky(ctx) {
      const sky = skyAt(camY);
      ctx.fillStyle = css3(sky);
      ctx.fillRect(0, 0, W, H);
      const lite = css3(mix3(sky, [1, 1, 1], 0.13)), dark = css3(mix3(sky, C_INK, 0.08));
      const scroll = -camY * 26, span = 1400;
      for (const d of DECO) {
        let y = (d.y - scroll) % span;
        if (y < -120) y += span;
        y -= 120;
        const x = d.x * W;
        ctx.beginPath();
        ctx.arc(x, y, d.rad, 0, TAU);
        if (d.ring) {
          ctx.lineWidth = Math.max(6, d.rad * 0.22);
          ctx.strokeStyle = d.lighter ? lite : dark; ctx.stroke();
        } else {
          ctx.fillStyle = d.lighter ? lite : dark; ctx.fill();
        }
      }
    }

    /* --------------------------------------------------------- simulation */
    /* Which wedge the ball's CENTRE is over. Wedge k is drawn across world
       angles [rot + k*A, rot + (k+1)*A], and the ball never leaves BALL_ANG,
       so the index falls straight out of subtracting the tower's rotation. */
    function wedgeAt() {
      const A = TAU / SEGS;
      const a = (((BALL_ANG - rot) % TAU) + TAU) % TAU;
      return Math.floor(a / A) % SEGS;
    }

    /* The ball is not a point. At this radius it subtends about twenty-five
       degrees, and a wedge is thirty — so testing the centre alone let half a
       ball sit inside a solid segment while the middle of it went down the
       hole, which is exactly the "it clips through things" everyone sees.

       So the test is over the ball's whole angular FOOTPRINT. The radius used
       is deliberately under the true one: the player should be able to clip a
       corner and still drop, just not half a ball. */
    const FOOT = Math.asin(clamp((BALL_R * 0.62) / BALL_ORBIT, 0, 1));

    /* every wedge index the ball overlaps, centre first */
    function footWedges(out) {
      const A = TAU / SEGS;
      out.length = 0;
      const c = (((BALL_ANG - rot) % TAU) + TAU) % TAU;
      const k0 = Math.floor(c / A) % SEGS;
      out.push(k0);
      const lo = Math.floor(((c - FOOT) % TAU + TAU) % TAU / A) % SEGS;
      const hi = Math.floor(((c + FOOT) % TAU + TAU) % TAU / A) % SEGS;
      if (lo !== k0) out.push(lo);
      if (hi !== k0 && hi !== lo) out.push(hi);
      return out;
    }

    /* What the ball would meet on a given ring: 0 clear through, 1 land on it,
       2 dead. A graze is never fatal — if the ball's own centre is over open
       air it lands rather than dies, because dying to a pixel of overlap reads
       as the game cheating. */
    const _fw = [];
    function ringVerdict(R) {
      footWedges(_fw);
      let anySolid = false, anyRed = false;
      for (let i = 0; i < _fw.length; i++) {
        const c = R.cells[_fw[i]];
        if (c === 1) anySolid = true;
        else if (c === 2) anyRed = true;
      }
      if (!anySolid && !anyRed) return 0;
      const mid = R.cells[_fw[0]];
      return mid === 2 ? 2 : 1;
    }

    /* The top surface the ball would land on right now, or null when it is
       lined up with a hole and nothing is under it at all. Uses the same
       footprint as the collision, so the shadow never disagrees with what
       actually happens a moment later. */
    function shadowTarget() {
      for (let i = depth; i < rings.length; i++) {
        const R = rings[i];
        if (R.gone) continue;
        const top = R.y + THICK / 2;
        if (top > ball.y - BALL_R + 1e-3) continue;
        return ringVerdict(R) ? top : null;
      }
      return FLOOR_TOP;
    }

    const FLOOR_SPLAT = { on: false, a: 0, spin: 0 };

    /* A bounce leaves paint on the ring. A few per ring at most — the old
       ones go first — so a ring you have been stuck on shows it. */
    function splat(R) {
      R.splats.push({ a: BALL_ANG - rot, size: 0.3 + rnd() * 0.07, spin: rnd() * TAU, age: 0 });
      if (R.splats.length > 4) R.splats.shift();
    }

    /* Debris keeps its angle relative to the TOWER, not to the world, so a
       shattered ring turns with everything else while the player keeps
       spinning. Stored as world angles it hangs in space and gives the game
       away instantly. */
    function smash(R) {
      R.gone = true;
      const A = TAU / SEGS;
      for (let k = 0; k < SEGS; k++) {
        if (!R.cells[k]) continue;
        bits.push({ a: k * A, y: R.y, s: 1, dr: 0, vdr: 2.2 + rnd() * 2.6, vy: -1 + rnd() * 3.5,
                    vs: -(1.6 + rnd() * 1.2), col: R.col, mask: R.cells[k] === 2 ? 1 : 0 });
      }
      if (bits.length > 72) bits.splice(0, bits.length - 72);
    }

    function burst(n, y, cols, speed, life) {
      for (let i = 0; i < n; i++) {
        chunks.push({ a: BALL_ANG - rot + (rnd() - 0.5) * 0.5, r: BALL_ORBIT + (rnd() - 0.5) * 0.3, y: y,
                      va: (rnd() - 0.5) * 1.6, vr: (rnd() - 0.3) * speed * 0.5, vy: 1.5 + rnd() * speed,
                      sz: 0.06 + rnd() * 0.07, col: cols[i % cols.length], t: 0, life: life * (0.75 + rnd() * 0.5) });
      }
      if (chunks.length > 120) chunks.splice(0, chunks.length - 120);
    }

    /* Points float up off the ball. Several in quick succession — a plummet
       through three rings — fold into one number that keeps counting, rather
       than stacking into an unreadable pile beside it. */
    function popPoints(gain, col) {
      const last = pops.length ? pops[pops.length - 1] : null;
      if (last && !last.big && last.t < 0.35) {
        last.val += gain; last.text = '+' + last.val; last.col = col; last.t = Math.min(last.t, 0.12);
        return;
      }
      const p = project(BX, ball.y + BALL_R, BZ);
      pops.push({ text: '+' + gain, val: gain, col: col, x: p.x + 50, y: p.y - 6, t: 0, big: false });
      if (pops.length > 6) pops.shift();
    }
    function popWord(text, col) {
      for (const q of pops) if (q.big && q.text === text && q.t < 0.45) return;
      const p = project(BX, ball.y + BALL_R, BZ);
      pops.push({ text: text, val: 0, col: col, x: p.x - 70, y: p.y + 10, t: 0, big: true });
      if (pops.length > 6) pops.shift();
    }

    function pass(R) {
      depth = R.i + 1;
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const gain = 10 + (fired ? 8 : 0) + Math.min(20, combo * 2);
      score += gain;
      popPoints(gain, fired ? '#ffd23f' : '#ffffff');
      if (!fired && combo >= FIRE_AT) {
        fired = true; Sound.coin();
        banner = { text: 'ON FIRE', col: '#ffd23f', t: 0 };
      } else Sound.blip();
    }

    function bounce(R, top) {
      ball.vy = BOUNCE;
      ball.squash = 1;
      if (combo >= 2) banner = null;
      combo = 0;
      fired = false;
      ghosts.length = 0;
      Sound.thud();
      api.shake(2);
      if (R) splat(R);
    }

    function die(R) {
      if (dead) return;
      dead = true; endT = 0;
      ghosts.length = 0;
      Sound.explode();
      api.shake(12);
      if (R) splat(R);
      burst(14, ball.y, [fired ? C_FIRE : C_BALL, C_STRIPE, C_INK], 5, 0.8);
      banner = { text: 'RED RING', col: '#ff5a6e', t: 0 };
    }

    function step(dt) {
      clock += dt;
      /* --- spin --- */
      let sv = 0;
      if (Input.down('ArrowLeft') || Input.down('KeyA')) sv -= SPIN_KEY;
      if (Input.down('ArrowRight') || Input.down('KeyD')) sv += SPIN_KEY;
      if (Input.pointer.down) {
        if (lastPX !== null) sv += (Input.pointer.x - lastPX) * SPIN_DRAG / Math.max(dt, 1e-3);
        lastPX = Input.pointer.x;
      } else lastPX = null;
      /* the drag term is already a velocity; the keys are too, so one clamp
         covers both and a frantic swipe cannot spin the tower into a blur */
      spinV = clamp(sv, -25, 25);
      rot += spinV * dt;

      /* --- fall --- */
      const prevY = ball.y;
      ball.vy -= GRAV * dt;
      ball.vy = Math.max(ball.vy, -FALL_CAP);
      ball.y += ball.vy * dt;
      /* the ball rolls in the plane facing the camera; faster when falling
         faster, so its spin reads as speed */
      ball.spin -= dt * (2.2 + Math.abs(ball.vy) * 0.55);
      if (ball.squash > 0) ball.squash = Math.max(0, ball.squash - dt * 7);

      /* --- what it lands on ---
         Every ring between where the ball was and where it is now, not just
         the first: at terminal velocity on a stalled frame it can cross more
         than one, and stopping at the first is how a ball ends up on the wrong
         side of a ring it never touched. */
      if (ball.vy < 0) {
        for (let i = depth; i < rings.length; i++) {
          const R = rings[i];
          if (R.gone) continue;
          const top = R.y + THICK / 2;
          const foot = ball.y - BALL_R, prevFoot = prevY - BALL_R;
          if (top > prevFoot) continue;            // already below us
          if (foot > top) break;                   // and the rest are further down
          const v = ringVerdict(R);
          if (v === 0) { pass(R); continue; }      // straight through the gap
          if (v === 2) { ball.y = top + BALL_R; ball.vy = 0; die(R); return; }
          if (fired) {
            smash(R); depth = R.i + 1; score += 14;
            popWord('SMASH', '#ffd23f');
            Sound.hit(); api.shake(6);
            continue;
          }
          ball.y = top + BALL_R;
          bounce(R, top);
          break;
        }
      }

      /* the floor */
      if (ball.y - BALL_R <= FLOOR_TOP) {
        ball.y = FLOOR_TOP + BALL_R; ball.vy = 0;
        if (!won) {
          won = true; Sound.win();
          ghosts.length = 0;
          ball.squash = 1;
          FLOOR_SPLAT.on = true; FLOOR_SPLAT.a = BALL_ANG - rot; FLOOR_SPLAT.spin = rnd() * TAU;
          const t0 = THEMES[0], t1 = THEMES[1], t2 = THEMES[2];
          burst(30, FLOOR_TOP + 0.3, [t0.ring, t1.ring, t2.ring, C_BALL, C_STRIPE], 7, 1.2);
          banner = { text: 'BOTTOM!', col: '#ffffff', t: 0 };
        }
      }

      /* --- debris, chunks, paint --- */
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.dr += b.vdr * dt; b.vdr *= 1 - 1.5 * dt;
        b.y += b.vy * dt; b.vy -= 16 * dt;
        b.s += b.vs * dt;
        if (b.s <= 0.03) bits.splice(i, 1);
      }
      for (let i = chunks.length - 1; i >= 0; i--) {
        const c = chunks[i];
        c.t += dt;
        if (c.t >= c.life) { chunks.splice(i, 1); continue; }
        c.a += c.va * dt; c.r += c.vr * dt; c.y += c.vy * dt;
        c.vy -= 18 * dt;
      }
      for (const R of rings) for (const s of R.splats) s.age += dt;

      /* --- the lit ball leaves afterimages --- */
      if (fired && !dead) {
        fireT += dt;
        if (fireT > 0.03) { fireT = 0; ghosts.push({ y: ball.y, t: 0 }); }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        ghosts[i].t += dt;
        if (ghosts[i].t > 0.2) ghosts.splice(i, 1);
      }

      /* The camera only ever goes DOWN. It follows the ball through a hole
         and then waits for it: bouncing on a ring leaves the tower where it
         is, which is what keeps the ring you are aiming at still. */
      camTo = Math.min(camTo, ball.y);
      camY += (camTo - camY) * (1 - Math.pow(0.0008, dt));
    }

    function pushHud() {
      api.hud({
        Score: score,
        Depth: depth + '/' + HEIGHT,
        Streak: combo,
        Best: bestCombo
      });
    }

    function finish(win) {
      if (ended) return;
      ended = true;
      const bonus = win ? 250 + (HEIGHT * 5) : 0;
      api.gameOver({
        score: score + bonus,
        win: win,
        title: win ? 'Bottom of the tower' : 'Red ring',
        message: win ? 'All ' + HEIGHT + ' rings.' : 'Made it through ' + depth + ' of ' + HEIGHT + '.',
        stats: [
          { label: 'Rings', value: depth + '/' + HEIGHT },
          { label: 'Best streak', value: bestCombo },
          { label: 'Bonus', value: bonus }
        ]
      });
    }

    function tickUi(dt) {
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t += dt;
        if (pops[i].t > 0.7) pops.splice(i, 1);
      }
      if (banner) {
        banner.t += dt;
        if (banner.text === 'ON FIRE' && !fired) banner = null;
      }
    }

    /* ---- the front page ----
       Opened from the hub, Helix Jump starts on its own title: the tower you
       are about to play, pulled back and stood to one side, rocking gently
       while the ball bounces on its top ring; beside it the name, the two
       settings on a card, and Play. Changing a setting rebuilds that same
       tower from the same seed, so the red you see is the red you will meet.
       Play carries the tower, its turn and the ball in mid-bounce across to
       the round, and the camera swings in behind them. */
    const FK = FrontKit(api, {
      remount: true,
      carry() {
        return { helix: true, seed: SEED0, rot, y: ball.y, vy: ball.vy, spin: ball.spin, squash: ball.squash,
                 camY, camTo, splats: rings[0].splats.slice() };
      },
      onOpt(id, v) {
        if (id === 'height') HEIGHT = heightOf(v);
        else if (id === 'hazard') HAZ = hazOf(v);
        else return;
        seed = SEED0; rings.length = 0; buildTower(); restFor();
        rebuildT = FK.t;
      }
    });
    let restRot = 0, rockAmp = 0, rebuildT = -9, menuClock = 0;
    const CAM_MENU = { up: 5.4, back: 12.6, look: 1.1 };
    const MENU_TOWER = [['short', 'Short'], ['standard', 'Standard'], ['long', 'Long Drop']];
    const MENU_RED = [['gentle', 'Gentle'], ['standard', 'Standard'], ['brutal', 'Brutal']];
    const MENU_DESC = {
      height: { short: 'Twenty rings. About a minute if it goes well.', standard: 'Thirty-five rings, tightening as you go.',
                long: 'Sixty rings. The bottom half is genuinely mean.' },
      hazard: { gentle: 'Wide gaps, and red only deep down.', standard: 'The tower as it was meant to be.',
                brutal: 'Narrow gaps, and red from the very top.' }
    };
    const RED_CHIP = { gentle: '#3fcb8b', standard: '#ffd23f', brutal: '#ff5a6e' };

    /* where the ball can bounce on the top ring: the middle of its longest
       stretch of plain solid wedges, and how far the tower may rock and keep
       it there */
    function restFor() {
      const R = rings[0], A = TAU / SEGS;
      let bestN = 0, bestK = 0;
      for (let k = 0; k < SEGS; k++) {
        let n = 0;
        while (n < SEGS && R.cells[(k + n) % SEGS] === 1) n++;
        if (n > bestN) { bestN = n; bestK = k; }
      }
      restRot = BALL_ANG - (bestK + bestN / 2) * A;
      rockAmp = clamp(bestN * A / 2 - FOOT - A * .2, 0, .42);
    }
    /* the menu's own little loop: the tower rocks, the ball bounces with the
       same numbers a round uses, and leaves its paint as it goes */
    function idle(dt) {
      clock += dt; menuClock += dt;
      const want = restRot + Math.sin(menuClock * .9) * rockAmp;
      const d = ((want - rot + Math.PI) % TAU + TAU) % TAU - Math.PI;
      rot += d * (1 - Math.exp(-7 * dt));
      ball.vy = Math.max(ball.vy - GRAV * dt, -FALL_CAP);
      ball.y += ball.vy * dt;
      ball.spin -= dt * (2.2 + Math.abs(ball.vy) * .55);
      if (ball.squash > 0) ball.squash = Math.max(0, ball.squash - dt * 7);
      const R = rings[0], top = R.y + THICK / 2;
      if (ball.vy < 0 && ball.y - BALL_R <= top) {
        ball.y = top + BALL_R; ball.vy = BOUNCE; ball.squash = 1;
        splat(R);
      }
      for (const s of R.splats) s.age += dt;
      camTo = Math.min(camTo, ball.y);
      camY += (camTo - camY) * (1 - Math.pow(0.0008, dt));
      tickUi(dt);
    }
    /* the camera: pulled back with the lens shifted on the front page, and
       swinging in to the round's own framing once Play is pressed */
    function camNow() {
      let m = 0;
      if (FK.on) { const k = FK.in(.1, 1.1); m = k * k * (3 - 2 * k); }
      else if (FROM_MENU) { const k = clamp(FK.t / .8, 0, 1); m = 1 - k * k * (3 - 2 * k); }
      return { up: CAM.up + (CAM_MENU.up - CAM.up) * m, back: CAM.back + (CAM_MENU.back - CAM.back) * m,
               look: CAM.look + (CAM_MENU.look - CAM.look) * m, lens: m * 460 / W };
    }
    /* after a setting changes, the rebuilt rings pulse outward from the top */
    function ringPop(R) {
      const t = FK.t - rebuildT - R.i * .045;
      return t > 0 && t < .32 ? 1 + Math.sin(t / .32 * Math.PI) * .07 : 1;
    }

    /* the name, each letter dropped in the way the ball lands - a fall, a
       squash, a settle - and now and then a hop running along it */
    function drawTitle(ctx, cx, T, live) {
      const size = 78, lines = [['HELIX', 88, '#ffffff'], ['JUMP', 164, '#ff4fa0']];
      ctx.save();
      ctx.font = '800 ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const L = [];
      let li = 0;
      for (const [word, y, col] of lines) {
        const ws = [...word].map(c => ctx.measureText(c).width), gap = 3;
        let x = cx - (ws.reduce((a, b) => a + b, 0) + gap * (word.length - 1)) / 2;
        [...word].forEach((c, i) => {
          const t = T - .2 - li * .07;
          const fall = t < .22 ? 1 - Math.pow(Math.max(0, t) / .22, 2) : 0;
          const land = t >= .22 && t < .6 ? Math.sin((t - .22) / .38 * Math.PI * 2) * Math.exp(-(t - .22) * 7) : 0;
          const hc = (T - 1.8 - li * .06) % 3.6;
          const hop = live && T > 1.8 && hc > 0 && hc < .32 ? Math.sin(hc / .32 * Math.PI) * 10 : 0;
          if (t > 0) L.push({ c, col, x: x + ws[i] / 2, y: y - fall * 150 - hop, sx: 1 + land * .24, sy: 1 - land * .24 });
          x += ws[i] + gap; li++;
        });
      }
      const put = (q, fn) => { ctx.save(); ctx.translate(q.x, q.y + 30); ctx.scale(q.sx, q.sy); ctx.translate(0, -30); fn(); ctx.restore(); };
      ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(29,24,48,.3)';
      for (const q of L) put(q, () => ctx.strokeText(q.c, 0, 8));
      for (const q of L) put(q, () => {
        ctx.strokeStyle = '#1d1830'; ctx.strokeText(q.c, 0, 0);
        ctx.fillStyle = q.col; ctx.fillText(q.c, 0, 0);
      });
      ctx.restore();
    }

    function drawMenu(ctx) {
      const live = FK.on, T = live ? FK.t : 99, inn = (d, dur) => live ? FK.in(d, dur) : 1;
      const MX = W / 2 + 215;
      drawTitle(ctx, MX, T, live);
      const best = api.best(), bk = inn(.75, .5);
      if (bk > .5) inkText(ctx, MX, 218, best > 0 ? 'BEST  ' + fmt(best) : 'Spin the tower  ·  find the gap', best > 0 ? 17 : 15, best > 0 ? '#ffd23f' : '#ffffff');

      /* the two settings, on a card */
      const ck = FK.eo(inn(.5, .6)), cw = 380, chh = 216, cx0 = MX - cw / 2, cy0 = 244;
      ctx.save(); ctx.globalAlpha *= ck; ctx.translate(0, (1 - ck) * 26);
      ctx.fillStyle = 'rgba(29,24,48,.26)'; rr(ctx, cx0, cy0 + 8, cw, chh, 43); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, cx0, cy0, cw, chh, 43); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#1d1830'; rr(ctx, cx0 + 2, cy0 + 2, cw - 4, chh - 4, 41); ctx.stroke();
      const TH = { track: '#1d1830', chip: '#ffd23f', chipInk: '#1d1830', chipOff: 'rgba(255,255,255,.9)',
                   face: Hud.FAM.sans, italic: false, weight: 800, chipPad: 5 };
      const hv = FK.opt('height', 'standard'), zv = FK.opt('hazard', 'standard');
      FK.caps(ctx, 'Tower', cx0 + 26, cy0 + 28, 11, '#1d1830', 'left', { track: .24 });
      FK.chips(ctx, 'height', cx0 + 20, cy0 + 42, cw - 40, 42, MENU_TOWER, TH, { def: 'standard', size: 14 });
      panelText(ctx, cx0 + 26, cy0 + 100, MENU_DESC.height[hv] || '', 12.5, '#5b5670', 'left', 600);
      FK.caps(ctx, 'Red rings', cx0 + 26, cy0 + 130, 11, '#1d1830', 'left', { track: .24 });
      FK.chips(ctx, 'hazard', cx0 + 20, cy0 + 144, cw - 40, 42, MENU_RED, Object.assign({}, TH, { chip: RED_CHIP[zv] || '#ffd23f' }),
               { def: 'standard', size: 14 });
      panelText(ctx, cx0 + 26, cy0 + 202 - 4, MENU_DESC.hazard[zv] || '', 12.5, '#5b5670', 'left', 600);
      ctx.restore();

      /* and Play, the colour of the ball */
      const pk = FK.bo(inn(.8, .6)), py = 484 + (1 - pk) * 40;
      ctx.save(); ctx.globalAlpha *= Math.min(1, pk);
      FK.button(ctx, 'play', MX - 130, py, 260, 62, 'PLAY', {
        r: 31, fill: ['#ff7cbc', '#e8388b'], edge: '#1d1830', edgeW: 4, shadow: 'rgba(29,24,48,.4)',
        face: Hud.FAM.sans, italic: false, weight: 800
      }, { draw(c) { c.lineJoin = 'round'; inkText(c, 0, 2, 'PLAY', 28, '#ffffff'); } });
      ctx.restore();
      FK.caps(ctx, 'Space to play   ·   Esc for the hub', MX, 576, 10, 'rgba(29,24,48,.6)', 'center',
              { alpha: inn(1.1, .5), track: .22 });
      if (live) FK.cursor();
    }
    if (FK.on) { restFor(); rot = restRot; }

    /* ---- the results ----
       Helix Jump's own card stock: white cards with the thick ink edge the
       front page's settings sit on, the verdict bouncing in, in the title's
       chunky inked letters, the score counting up in the streak's yellow, and
       the pink the ball is painted in for the way back in. */
    const INK = '#1d1830';
    const HPINK = { r: 26, fill: ['#ff7cbc', '#e8388b'], edge: INK, edgeW: 4, shadow: 'rgba(29,24,48,.4)', face: Hud.FAM.sans, italic: false, weight: 800 };
    const HWHITE = { r: 26, fill: '#ffffff', edge: INK, edgeW: 4, shadow: 'rgba(29,24,48,.4)', gloss: false, face: Hud.FAM.sans, italic: false, weight: 800 };
    const whiteCard = (ctx, x, y, w, h, r) => {
      ctx.fillStyle = 'rgba(29,24,48,.3)'; rr(ctx, x, y + 7, w, h, r); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, x, y, w, h, r); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; rr(ctx, x + 2, y + 2, w - 4, h - 4, r - 2); ctx.stroke();
    };
    const RES = {
      veil(ctx, k) { ctx.fillStyle = 'rgba(29,24,48,' + (.46 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); },
      hero(ctx, cx, top) {
        const R = FK.R, tight = R.paid.length > 4;
        const k = FK.rs('title', undefined, .5), pop = k < 1 ? FK.bo(k) : 1;
        if (k > 0) {
          ctx.save(); ctx.translate(cx, top + 30); ctx.scale(pop, pop);
          inkText(ctx, 0, 0, String(R.title).toUpperCase(), tight ? 42 : 50, R.win ? '#ffd23f' : '#ffffff');
          ctx.restore();
        }
        const mk = FK.eo(FK.rs('sub', undefined, .4));
        ctx.save(); ctx.globalAlpha *= mk; inkText(ctx, cx, top + (tight ? 66 : 74), R.message, 17, '#ffffff'); ctx.restore();
        const sk = FK.rs('stat', 0, .5), v = Math.round(R.score * FK.eo(FK.rs('stat', 0, .9)));
        const sy = top + (tight ? 112 : 132), big = tight ? 50 : 64;
        if (sk > 0) {
          ctx.save(); ctx.globalAlpha *= Math.min(1, sk * 2);
          ctx.translate(cx, sy); const sp = sk < 1 ? FK.bo(sk) : 1; ctx.scale(sp, sp);
          inkText(ctx, 0, 0, fmt(v), big, '#ffd23f');
          ctx.restore();
        }
        const ty = sy + big * .5 + 22, tk = FK.rs('tag', undefined, .45);
        if (R.isBest && tk > 0) {
          ctx.save(); ctx.translate(cx, ty); const tp = FK.bo(tk); ctx.scale(tp, tp); ctx.rotate(-.05);
          ctx.fillStyle = '#ff4fa0'; rr(ctx, -64, -15, 128, 30, 15); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = INK; rr(ctx, -62.5, -13.5, 125, 27, 14); ctx.stroke();
          inkText(ctx, 0, 1, 'NEW BEST!', 16, '#ffffff');
          ctx.restore();
        } else if (tk > 0) {
          ctx.save(); ctx.globalAlpha *= FK.eo(tk);
          inkText(ctx, cx, ty, (R.cheated ? 'NOT SAVED  ·  ' : '') + 'BEST  ' + fmt(R.best), 15, '#ffffff');
          ctx.restore();
        }
        return ty + 18 - top;
      },
      stat(ctx, st, x, y, w, h) {
        whiteCard(ctx, x, y, w, h, 24);
        FK.caps(ctx, st.label, x + 20, y + h / 2, 10, '#5b5670', 'left', { track: .22 });
        ctx.fillStyle = '#e8388b'; ctx.font = '800 21px ui-sans-serif,system-ui,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(String(st.value), x + w - 20, y + h / 2 + 1);
      },
      card(ctx, x, y, w, h) { whiteCard(ctx, x, y, w, h, 30); },
      ls: FK.ledgerStyle({
        face: 'ui-sans-serif,system-ui,sans-serif', weight: 800, ink: INK, mute: '#6d6882', gold: '#e8388b',
        rule: 'rgba(29,24,48,.16)', bar: 'rgba(29,24,48,.1)', fill: '#ff4fa0', rowH: 24, size: 14, lsize: 10,
        totalSize: 30, totalH: 42, xpH: 42, barH: 9, track: .22
      }),
      pad: 26,
      button(ctx, key, label, x, y, w, h, primary) {
        FK.button(ctx, key, x, y, w, h, label, primary ? HPINK : HWHITE, {
          draw(c) {
            c.lineJoin = 'round';
            if (primary) inkText(c, 0, 2, label, 22, '#ffffff');
            else { c.fillStyle = INK; c.font = '800 17px ui-sans-serif,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 0, 2); }
          }
        });
      },
      hint(ctx, cx, y) { FK.caps(ctx, 'Space to play again   ·   Esc for the hub', cx, y, 10, 'rgba(255,255,255,.8)', 'center', { track: .22 }); }
    };

    pushHud();

    return {
      resize() { W = api.W; },
      update(dt) {
        if (ended) return;
        /* on the front page the menu has the keys, and the tower idles */
        if (FK.on) { FK.input(api.input); if (FK.on) idle(Math.min(dt, 1 / 30)); return; }
        const d = Math.min(dt, 1 / 30);
        if (dead || won) {
          endT += dt;
          /* the world keeps moving for a beat — the pieces land, the paint
             lands — before the card comes up over it */
          for (let i = chunks.length - 1; i >= 0; i--) {
            const c = chunks[i];
            c.t += d;
            if (c.t >= c.life) { chunks.splice(i, 1); continue; }
            c.a += c.va * d; c.r += c.vr * d; c.y += c.vy * d; c.vy -= 18 * d;
          }
          if (ball.squash > 0) ball.squash = Math.max(0, ball.squash - d * 5);
          tickUi(d);
          if (dead && endT > 0.9) finish(false);
          if (won && endT > 1.4) finish(true);
          return;
        }
        step(d);
        tickUi(d);
        pushHud();
      },
      render(ctx) {
        FK.frame();
        if (!glOK) {
          boardBg(ctx, W, H);
          panelText(ctx, W / 2, H / 2 - 14, 'This one needs WebGL2', 20, P.ink, 'center', 800);
          panelText(ctx, W / 2, H / 2 + 14,
                    'Your browser or graphics driver has it switched off.', 13, P.ink2, 'center', 600);
          return;
        }
        paintSky(ctx);
        const tf = ctx.getTransform ? ctx.getTransform() : null;
        const S = tf ? clamp(Math.hypot(tf.a, tf.b), 1, 3) : 1;
        glDraw(Math.ceil(W * S), Math.ceil(H * S));
        ctx.drawImage(glcv, 0, 0, W, H);
        if (FK.on) { drawMenu(ctx); return; }
        /* a round started from the menu: the menu goes as the score arrives */
        if (FROM_MENU && FK.t < .8) {
          FK.layer(ctx, clamp((FK.t - .25) / .45, 0, 1), chrome);
          FK.layer(ctx, 1 - FK.eo(clamp(FK.t / .4, 0, 1)), drawMenu);
        } else if (!FK.R) chrome(ctx);
        else FK.layer(ctx, 1 - FK.eo(FK.rs('title', undefined, .3)), chrome);
        if (FK.R) FK.resultsPage(ctx, W, H, RES);
      },
      /* Escape on the front page goes back to the hub; in a round it pauses */
      escape: FK.escape,
      results(R) { FK.showResults(R); },
      destroy() {
        FK.done();
        try {
          for (const m of meshes) {
            gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib); gl.deleteVertexArray(m.vao);
          }
          if (insBuf) gl.deleteBuffer(insBuf);
          if (prog) gl.deleteProgram(prog);
          const lo = gl && gl.getExtension('WEBGL_lose_context');
          if (lo) lo.loseContext();
        } catch (e) {}
      },
      /* The tower is generated, so "is it survivable" is a property of the
         generator rather than of a level somebody drew. This is what the
         checker reads to assert it: every ring keeps a gap, keeps somewhere
         safe to bounce, and never puts red right beside the hole. */
      _dev: {
        rings: rings, segs: SEGS, height: HEIGHT, wedgeAt: wedgeAt,
        /* the collision's own answer, so a sweep can check that the window
           where the ball fits through a hole really is narrower than the hole */
        verdict: ringVerdict, foot: FOOT, runsOf: runsOf, cam: CAM,
        aim(k) { rot = BALL_ANG - (k + 0.5) * (TAU / SEGS); },
        get rot() { return rot; }, set rot(v) { rot = v; },
        get ball() { return ball; }, get depth() { return depth; },
        get fired() { return fired; }, set fired(v) { fired = !!v; },
        get dead() { return dead; }, get won() { return won; },
        step: step
      }
    };

    /* Text with a hard dark edge, readable over any sky the tower has fallen
       into. Never faded: an outline and a fill fade separately, and the result
       is grey mush. Things that come and go here scale instead. */
    function inkText(ctx, x, y, s, size, col, align) {
      ctx.font = '800 ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.18);
      ctx.strokeStyle = '#1d1830'; ctx.strokeText(s, x, y);
      ctx.fillStyle = col || '#ffffff'; ctx.fillText(s, x, y);
    }

    /* The score, how far down you are, and the moments worth shouting about.
       Canvas 2D over the GL frame, because text is the one thing the mesh
       renderer has no business trying to do. */
    function chrome(ctx) {
      ctx.save();
      /* ---- score and depth ---- */
      inkText(ctx, W / 2, 44, String(score), 42);
      const bw = Math.min(300, W * 0.3), bx = (W - bw) / 2, by = 76, bh = 12;
      const p = clamp(depth / HEIGHT, 0, 1);
      ctx.fillStyle = '#1d1830';
      rr(ctx, bx - 4, by - 4, bw + 8, bh + 8, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      rr(ctx, bx, by, bw, bh, 6); ctx.fill();
      if (p > 0) {
        ctx.fillStyle = fired ? '#ffd23f' : '#ffffff';
        rr(ctx, bx, by, Math.max(bh, bw * p), bh, 6); ctx.fill();
      }
      inkText(ctx, bx - 22, by + bh / 2 + 1, String(depth), 16);
      inkText(ctx, bx + bw + 24, by + bh / 2 + 1, String(HEIGHT), 16);

      /* ---- the streak, under the bar ---- */
      if (combo >= 2 && !fired && !dead) inkText(ctx, W / 2, 112, combo + ' IN A ROW', 15, '#ffffff');

      /* ---- floating +points ---- */
      for (const q of pops) {
        const k = q.t / 0.7;
        const pop = k < 0.15 ? 0.6 + 0.4 * (k / 0.15) + 0.15 * Math.sin(k / 0.15 * Math.PI) : k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
        if (pop <= 0.02) continue;
        inkText(ctx, q.x, q.y - k * 46, q.text, Math.round((q.big ? 26 : 20) * pop), q.col);
      }

      /* ---- the big word ---- */
      if (banner) {
        const k = clamp(banner.t / 0.18, 0, 1);
        const pop = 0.5 + 0.5 * (1 - (1 - k) * (1 - k)) + 0.12 * Math.sin(k * Math.PI);
        const wob = banner.text === 'ON FIRE' ? 1 + 0.04 * Math.sin(clock * 12) : 1;
        const y = banner.text === 'ON FIRE' ? 146 : H * 0.36;
        inkText(ctx, W / 2, y, banner.text, Math.round(44 * pop * wob), banner.col);
      }

      if (depth === 0 && !dead) {
        inkText(ctx, W / 2, H - 40, 'Drag, or ← →, to turn the tower', 17, '#ffffff');
      }
      ctx.restore();
    }
  }
});
