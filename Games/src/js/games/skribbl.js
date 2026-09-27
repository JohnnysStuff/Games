/* =========================================================== SKRIBBL ==== */
/* Draw & guess. One player draws a secret word while everyone races to guess
   it; faster guesses score more, and the drawer earns as people get it.
   Host-authoritative: the host owns the word, timer, turn order and scoring
   (so the word can't be read off the wire), while the drawer's strokes relay
   out as they draw. Ink lives on its own transparent layer so the eraser cuts
   real holes instead of painting the background colour back on.

   A match opens in a lobby. Everyone builds a character, readies up, and the
   game starts the moment the whole party is ready — or when the 20-second
   clock runs out, whichever comes first. The host owns that clock and the
   ready list; each player owns their own look and sends it up as it changes. */
registerGame({
  id: 'sketch',
  title: 'Skribbl',
  tagline: 'Draw & guess with the party. Build a character, ready up, then take turns sketching a secret word while everyone races to guess it — quicker guesses score more, and the artist earns as people get it.',
  tags: ['Party', 'Online', 'Creative'],
  scoreLabel: 'Points',
  mp: 'party',
  mpMin: 2, mpMax: 8,
  front: true,
  controls: [['Draw', 'Click &amp; drag'], ['Guess', 'Type &amp; Enter'], ['Your look', 'Arrows · Space to ready'], ['Pause', 'Esc']],
  options: [
    { id: 'rounds', label: 'Rounds', def: '3', choices: [{ v: '2', l: '2 rounds' }, { v: '3', l: '3 rounds' }, { v: '4', l: '4 rounds' }] },
    { id: 'drawtime', label: 'Draw time', def: '75', choices: [{ v: '60', l: '60 sec' }, { v: '75', l: '75 sec' }, { v: '100', l: '100 sec' }] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="skB" cx=".5" cy=".4" r=".85"><stop offset="0" stop-color="#2b2350"/><stop offset="1" stop-color="#08060f"/></radialGradient><linearGradient id="skP" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset=".5" stop-color="#f0a92c"/><stop offset="1" stop-color="#b97414"/></linearGradient><linearGradient id="skS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8f6b"/><stop offset="1" stop-color="#c9522c"/></linearGradient></defs><rect width="320" height="180" fill="url(#skB)"/><g opacity=".5"><rect x="26" y="22" width="268" height="136" rx="14" fill="#f6f8fc" opacity=".07"/></g><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M44 128q26-58 58-46t44 42" stroke="#7dd3fc" stroke-width="9" opacity=".95"/><path d="M150 126q16-40 44-34" stroke="#a78bfa" stroke-width="9" opacity=".9"/><path d="M52 142h150" stroke="#4ade80" stroke-width="8" opacity=".75" stroke-dasharray="1 22"/></g><g fill="#f9a8d4" opacity=".85"><circle cx="252" cy="42" r="6"/><circle cx="276" cy="66" r="4"/><circle cx="238" cy="70" r="3.4"/></g><g transform="translate(206 96) rotate(38)"><rect x="-14" y="-92" width="28" height="118" rx="5" fill="url(#skP)"/><rect x="-14" y="-92" width="9" height="118" fill="#fff" opacity=".28"/><rect x="-14" y="-98" width="28" height="12" rx="4" fill="#f472b6"/><rect x="-14" y="-88" width="28" height="6" fill="#c9ced8" opacity=".8"/><path d="M-14 26h28l-14 30z" fill="#f0d9b5"/><path d="M-6 44l6 12 6-12z" fill="#2b2340"/><path d="M-14 26h28l-4 8h-20z" fill="#000" opacity=".18"/></g><g transform="translate(150 62)"><path d="M0 0l7 16 17 2-12 12 3 17-15-8-15 8 3-17-12-12 17-2z" fill="#ffe08a" opacity=".9"/></g></svg>',
  mount(api) {
    const W = 960, H = 600, TAU = Math.PI * 2;
    const MPS = getSession('sketch');
    const HOST = !MPS || MPS.role === 'host';
    const SOLO = !MPS;
    const MYID = MPS ? MPS.me : 'you';
    const ROUNDS = parseInt((MPS ? MPS.cfg.rounds : api.opt('rounds')) || '3', 10);
    const DRAWT = parseInt((MPS ? MPS.cfg.drawtime : api.opt('drawtime')) || '75', 10);
    const LOBBYT = 20, PICKT = 15, REVEALT = 5;   // seconds: building a look, choosing a word, the results

    const ROSTER = MPS ? MPS.cfg.players.slice() : [{ id: MYID, name: 'You' }];
    const nameOf = id => { const p = ROSTER.find(q => q.id === id); return p ? p.name : 'Player'; };
    const inRoster = id => ROSTER.some(p => p.id === id);
    const rosterIdx = id => ROSTER.findIndex(p => p.id === id);
    /* Someone who walked back to the hub keeps their points, but nobody waits
       on them any more: they are skipped as drawer, not counted as a guesser,
       and the lobby stops waiting for them to ready up. */
    const present = id => !MPS || !MPS.players || MPS.players.some(p => p.id === id);
    const cvEl = document.getElementById('cv');

    /* ----------------------------------------------------- word bank ---- */
    const WORDS = ('apple banana pizza rocket guitar castle dragon rainbow pencil island ' +
      'butterfly elephant octopus penguin dinosaur snowman volcano lighthouse windmill treasure ' +
      'bicycle airplane sailboat tractor submarine helicopter skateboard ambulance ' +
      'hamburger cupcake popcorn pancake spaghetti icecream watermelon pineapple strawberry ' +
      'mountain waterfall campfire tornado lightning umbrella sandcastle beehive mushroom cactus ' +
      'astronaut pirate wizard robot ninja clown vampire mermaid superhero knight ' +
      'television keyboard telephone camera lightbulb scissors hammer toothbrush backpack ladder ' +
      'giraffe kangaroo hedgehog dolphin flamingo squirrel jellyfish crocodile peacock ladybug ' +
      'sunflower snowflake diamond anchor compass crown feather balloon kite lantern ' +
      'football basketball tennis bowling skiing surfing fishing camping juggling dancing ' +
      'spider ghost pumpkin candle skeleton witch werewolf zombie mummy cauldron ' +
      'toaster blender microwave refrigerator vacuum telescope microscope hourglass ' +
      'cheeseburger doughnut pretzel cookie lollipop gingerbread marshmallow taco sushi burrito ' +
      'waterslide rollercoaster ferriswheel carousel trampoline seesaw swingset sandbox ' +
      'unicorn phoenix griffin centaur yeti bigfoot alien spaceship galaxy').split(/\s+/);
    let wseed = (MPS ? (MPS.seed | 0) : (Date.now() & 0x7fffffff)) || 12345;
    const wrand = () => { wseed = (wseed * 1103515245 + 12345) & 0x7fffffff; return wseed / 0x7fffffff; };
    function pickChoices() {
      const out = [], used = {};
      while (out.length < 3) { const w = WORDS[(wrand() * WORDS.length) | 0]; if (!used[w]) { used[w] = 1; out.push(w); } }
      return out;
    }
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    function editDist(a, b) {
      if (Math.abs(a.length - b.length) > 1) return 9;
      const dp = []; for (let i = 0; i <= a.length; i++) dp[i] = [i];
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return dp[a.length][b.length];
    }

    /* ----------------------------------------------------- layout -------
       Players down the left, chat down the right, the paper in the middle
       with an action bar under it: the drawer's tools, or everyone else's
       guess box. */
    const LX = 14, LW = 184;                       // players column
    const BX = 210, BY = 62, BW = 540, BH = 412;   // the paper
    const AY = BY + BH + 8, AH = 560 - AY;         // action bar under it
    const RX = 762, RW = 184;                      // chat column
    const COL_Y = 62, COL_H = 498;                 // both side columns
    const inBoard = (x, y) => x >= BX && x <= BX + BW && y >= BY && y <= BY + BH;
    const toNx = x => (x - BX) / BW, toNy = y => (y - BY) / BH;
    const PALETTE = ['#ffffff', '#c1c1c1', '#ef130b', '#ff7100', '#ffe400', '#00cc00',
                     '#00ff91', '#00b2ff', '#231fd3', '#a300ba', '#df69a7', '#ffac8e',
                     '#000000', '#505050', '#740b07', '#c23800', '#e8a200', '#005510',
                     '#00785d', '#00569e', '#0e0865', '#550069', '#873554', '#a0522d'];
    const SIZES = [3, 6, 10, 16, 26, 40];
    const SIZE_DOT = [2, 3, 4.4, 6, 8, 10];
    /* lobby: the editor card on the left, the party on the right */
    const LOB = { ex: 28, ey: 88, ew: 596, eh: 470, px: 640, pw: 292 };
    const PV = { x: 148, y: 250, size: 172 };      // your character, large
    const TABS = { x: 268, y: 104, w: 344, th: 30, gap: 6 };
    const GRID = { x: 268, y: 182, w: 344, h: 292, gap: 8 };
    const READY_BTN = { x: 44, y: 488, w: 564, h: 54 };

    /* ----------------------------------------------------- look ---------
       One party palette for the chrome, and every canvas font in one stack.
       Declared up here on purpose: anything after mount's return sits in the
       temporal dead zone and throws the first time render touches it. */
    const UI = {
      ink: '#f4f1ff', ink2: '#bdb5e2', ink3: '#8a82b8', dim: '#625b8f',
      acc: '#a78bfa', acc2: '#f472b6', sky: '#7dd3fc', gold: '#fde047',
      good: '#4ade80', bad: '#f87171', warm: '#fbbf24'
    };
    const FONT = 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    /* The display voice is the one All In speaks in: heavy condensed italic
       for anything big — titles, the word, every number — over tracked small
       capitals for labels. The webfont is already on the page; a canvas never
       asks for it by itself, so the faces used here are asked for up front. */
    const COND = (typeof Hud !== 'undefined' && Hud.FAM && Hud.FAM.cond) ||
      '"Barlow Condensed","Bahnschrift Condensed",Bahnschrift,"Arial Narrow",system-ui,sans-serif';
    try { for (const f of ['italic 800', 'italic 700', '800', '700']) document.fonts.load(f + ' 24px "Barlow Condensed"', 'Aa09'); } catch (e) {}
    const HAS_LS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
    const easeOut = k => 1 - Math.pow(1 - k, 3);
    const backOut = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
    const PICK_COLS = [['#8b5cf6', '#5b21b6'], ['#ec4899', '#9d174d'], ['#0ea5e9', '#075985']];

    /* ---------------------------------------------------- backdrop -----
       The room the game is played in: ribbons of colour drifting slowly
       behind everything, three bright pencil lines scribbling across it, and
       a faint wallpaper of doodles sliding past. Driven off the wall clock so
       it keeps moving while paused — it is decoration, not game state. */
    const BG_RIB = (() => {
      const cols = ['#f472b6', '#a78bfa', '#60a5fa', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#c084fc'];
      let s = 7;
      const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      return cols.map((col, i) => ({
        y: 40 + i * 74 + r() * 26, a1: 18 + r() * 26, a2: 6 + r() * 12,
        k1: .0032 + r() * .004, k2: .009 + r() * .008, s1: .22 + r() * .3, s2: .45 + r() * .5,
        ph: r() * 6.28, drift: 10 + r() * 16, col: col, w: 1.3 + r() * 1.5
      }));
    })();
    const BG_PEN = [
      { p: .3, q: 1.9, c: '#fde047', s: 1 }, { p: 2.4, q: 4.4, c: '#f472b6', s: .86 }, { p: 4.6, q: .9, c: '#7dd3fc', s: 1.12 }
    ];
    const DOODLES = (() => {
      const d = [
        'M0-13L3.8-4.2 13.2-4 5.8 1.9 8.4 11 0 5.6-8.4 11-5.8 1.9-13.2-4-3.8-4.2Z',
        'M0 11C-9 4-13-1-13-6-13-10-10-13-6.5-13-3.5-13-1.5-11 0-8.5 1.5-11 3.5-13 6.5-13 10-13 13-10 13-6 13-1 9 4 0 11Z',
        'M-14 4L-9-4-4 4 1-4 6 4 11-4 14 2',
        'M3-14L-7 2H0L-3 14 10-3H3Z',
        'M13 0A13 13 0 1 1-13 0 13 13 0 1 1 13 0ZM-5-5V-2M5-5V-2M-7 4Q0 10 7 4',
        'M-12 12L-10 5 6-11 11-6-5 10ZM3-8L8-3',
        'M-14 0C-10-9-6 9-2 0S6-9 10 0 14 5 14 5',
        'M-10 6A6 6 0 0 1-8-5 8 8 0 0 1 7-6 5 5 0 0 1 10 6Z',
        'M5 0A5 5 0 1 1-5 0 5 5 0 1 1 5 0ZM0-9V-13M0 9V13M-9 0H-13M9 0H13M-6.4-6.4L-9.2-9.2M6.4 6.4L9.2 9.2M-6.4 6.4L-9.2 9.2M6.4-6.4L9.2-9.2'
      ].map(s => new Path2D(s));
      const sp = new Path2D();
      for (let i = 0; i <= 40; i++) { const an = i * .42, r = i * .32; if (i) sp.lineTo(Math.cos(an) * r, Math.sin(an) * r); else sp.moveTo(0, 0); }
      d.push(sp);
      return d;
    })();

    /* ----------------------------------------------------- characters ---
       A look is six small numbers — colour, eyes, mouth, top, top colour,
       extra — so it costs a handful of bytes on the wire and fits in a save.
       Everyone draws everyone from the same numbers, so the character you
       built is the one the whole party sees. */
    const AV_BODY = ['#ff6b6b', '#ff9f43', '#feca57', '#a3e635', '#2ed573', '#1dd1a1', '#22d3ee', '#54a0ff',
                     '#6c6cf0', '#a55eea', '#f368e0', '#ff9ff3', '#ffe0bd', '#f1c27d', '#c68642', '#8d5524'];
    const AV_TINT = ['#2b2238', '#6d4c41', '#b0785a', '#e67e22', '#f6d365', '#f5f6fa',
                     '#e74c3c', '#fd79a8', '#9b59b6', '#3498db', '#2ecc71', '#00cec9'];
    const AV_CATS = [
      { label: 'Colour', n: AV_BODY.length }, { label: 'Eyes', n: 12 }, { label: 'Mouth', n: 12 },
      { label: 'Hair & hats', n: 16 }, { label: 'Hair colour', n: AV_TINT.length }, { label: 'Extras', n: 10 }
    ];
    const AV_N = AV_CATS.map(c => c.n);
    const OUTL = '#1c1430';                        // the sticker outline every character shares
    const NOANIM = {};
    const validSpec = a => Array.isArray(a) && a.length === AV_N.length &&
      a.every((v, i) => Number.isInteger(v) && v >= 0 && v < AV_N[i]);
    const avatars = {};                            // id -> look, for everyone in the match
    for (const p of ROSTER) avatars[p.id] = defaultSpec(p.id);
    {
      /* your last look comes back; a first-timer gets a surprise one */
      const saved = api.load('avatar', null);
      avatars[MYID] = validSpec(saved) ? saved.slice() : randomSpec();
    }
    const specOf = id => avatars[id] || defaultSpec(id);
    /* a player's colour, lifted so it reads as text on the dark chrome */
    const colOfP = id => mixHex(AV_BODY[specOf(id)[0]], '#ffffff', .28);

    /* ----------------------------------------------------- state -------- */
    let phase = SOLO && api.entry === 'menu' ? 'menu' : 'avatar', round = 1, drawerId = ROSTER[0].id, word = '', choices = [];
    let timer = LOBBYT, revealWord = '', myPick = '';
    const scores = {}; ROSTER.forEach(p => scores[p.id] = 0);
    let guessedOrder = [];
    const guessedGain = {};
    let order = ROSTER.map(p => p.id), turnIdx = 0;
    let revealSet = {}, hintMask = '';
    let ops = [];                                  // {t:'s'|'f', ...}
    let sidCounter = 1;
    const guessLog = [];
    let toast = '', toastAt = -99, flash = '', flashAt = -99, myGain = 0;
    let myKnown = '';                              // the word, once you have guessed it
    const myGuesses = [];                          // guesses sent up and not yet answered
    let ending = false;
    /* Full states (the whole picture after a clear, an undo or a new turn,
       plus the chat and everyone's look) are numbered, and every snapshot
       says which number is current. A guest that never received that one —
       it joined late, or its link dropped a packet — asks for it again. */
    let fullV = 0, seenFv = 0, resyncT = 0, turnKey = '';
    /* Tween clocks. Every animation is timed off the wall clock and drawn from
       the render frame rather than advanced in update: update runs on a fixed
       120 Hz step, so on a 144 Hz (or any odd-rate) screen some frames got two
       steps and some none, and everything it moved juddered. */
    const nowS = () => performance.now() / 1000;
    let phaseWas = phase, phaseAt = nowS(), gameAt = -99;
    let myPickIdx = -1;                            // index the drawer chose, mirrors the host
    let turnsPerRound = ROSTER.length;             // a round is everyone drawing once
    /* the lobby */
    let lobbyReady = {};                           // id -> 1, owned by the host
    let myReady = false, avTab = 0, goWhy = '';
    let avDirty = !HOST, avSendT = 0, avSyncT = 1.2;   // a guest announces its saved look straight away
    const hopAt = {};                              // id -> when they last did something worth a little jump
    let lastTick = 99;
    /* render-side clocks and smoothing */
    let rt = nowS(), rtLast = 0, rdt = 0, FADE = 1;
    const rowPos = {}, shownScore = {};
    let tilePop = [], lastMask = '';
    let hitRects = [], cursorWas = '';
    let logoCache = null;                          // the title's letters, pre-drawn (see logoGlyphs)
    const AN = {};                                 // springs and glides, by name
    const parts = [];                              // sparkles
    let tabAt = -99, selAt = -99, lobbyAt = -1, lastSel = '';
    /* the front page: when it came up, and whether the look editor was
       opened from it (no clock, and Done comes back to the menu) */
    let menuAt = -1, lookOnly = false;
    const MN = {
      me: { x: 80, y: 166, w: 320, h: 300 },     // your character
      set: { x: 416, y: 166, w: 464, h: 300 },   // the party's settings
      go: { x: 80, y: 484, w: 480, h: 58 },       // practice, or start
      fr: { x: 576, y: 484, w: 304, h: 58 }       // play with friends
    };
    /* up here with the other state: the menu's drawing sits below mount's return */
    const MENU_ROUNDS = [['2', '2 rounds'], ['3', '3 rounds'], ['4', '4 rounds']];
    const MENU_TIMES = [['60', '60 sec'], ['75', '75 sec'], ['100', '100 sec']];
    /* Pictures that only change when something happens are kept rather than
       redrawn every frame: the grid of options (sixteen characters) and the
       backdrop's gradients. Both were most of the lobby's frame time. */
    const thumbs = { key: '', list: [], pool: [] };
    const bgCache = { key: '', base: null, veil: null };

    /* ------------------------------------------------------ ink layer ---
       Strokes live on their own transparent canvas so the eraser can cut
       real holes with destination-out. It is kept at twice the paper's size
       so lines stay sharp when the stage is scaled up to a big window.
       Two layers: `inkB` holds every finished op, and `ink` is that plus
       whatever is still being drawn. A stroke in progress changes shape
       every frame, and repainting only it — rather than replaying the whole
       picture, fills and all — is what keeps a busy drawing smooth. */
    const INK_K = 2, IW = BW * INK_K, IH = BH * INK_K;
    const ink = document.createElement('canvas'); ink.width = IW; ink.height = IH;
    const ictx = ink.getContext('2d');
    const inkB = document.createElement('canvas'); inkB.width = IW; inkB.height = IH;
    const bctx = inkB.getContext('2d');
    let inkDirty = true, baseN = 0, liveDirty = true;

    function strokeOp(c, o) {
      c.save();
      c.globalCompositeOperation = o.er ? 'destination-out' : 'source-over';
      c.strokeStyle = o.col; c.fillStyle = o.col;
      c.lineWidth = o.size * INK_K; c.lineCap = 'round'; c.lineJoin = 'round';
      /* Joining raw pointer samples with straight lines is what made strokes
         look faceted — the cursor is only sampled a handful of times per
         second, so every sample became a visible corner. Each sample is now
         used as a curve control point with the midpoints as anchors, which
         is the standard way to get a smooth path through noisy input. */
      const pts = o.pts;
      if (pts.length === 1) { c.beginPath(); c.arc(pts[0][0] * IW, pts[0][1] * IH, o.size * INK_K / 2, 0, TAU); c.fill(); }
      else if (pts.length === 2) {
        c.beginPath();
        c.moveTo(pts[0][0] * IW, pts[0][1] * IH);
        c.lineTo(pts[1][0] * IW, pts[1][1] * IH);
        c.stroke();
      } else if (pts.length > 2) {
        c.beginPath();
        c.moveTo(pts[0][0] * IW, pts[0][1] * IH);
        for (let i = 1; i < pts.length - 1; i++) {
          const cx = pts[i][0] * IW, cy = pts[i][1] * IH;
          c.quadraticCurveTo(cx, cy, (cx + pts[i + 1][0] * IW) / 2, (cy + pts[i + 1][1] * IH) / 2);
        }
        const n = pts.length - 1;
        c.quadraticCurveTo(pts[n - 1][0] * IW, pts[n - 1][1] * IH, pts[n][0] * IW, pts[n][1] * IH);
        c.stroke();
      }
      c.restore();
    }
    /* Scanline flood fill. Transparent counts as the paper, so filling an
       untouched area behaves the way it looks — and the soft edge of a line
       is filled under too, so a fill hugs the line instead of leaving a halo. */
    function fillOp(c, o) {
      const w = IW, h = IH;
      const img = c.getImageData(0, 0, w, h), d = img.data, d32 = new Uint32Array(d.buffer);
      const sx = Math.round(clamp(o.x, 0, 1) * (w - 1)), sy = Math.round(clamp(o.y, 0, 1) * (h - 1));
      const s0 = (sy * w + sx) * 4;
      const tr = d[s0], tg = d[s0 + 1], tb = d[s0 + 2], ta = d[s0 + 3];
      const rgb = hexRGB(o.col);
      if (ta > 250 && Math.abs(tr - rgb[0]) < 8 && Math.abs(tg - rgb[1]) < 8 && Math.abs(tb - rgb[2]) < 8) return;
      const clear = ta < 40;
      const match = i => {
        const p = i * 4;
        if (clear) return d[p + 3] < 128;
        return Math.abs(d[p] - tr) < 32 && Math.abs(d[p + 1] - tg) < 32 && Math.abs(d[p + 2] - tb) < 32 && Math.abs(d[p + 3] - ta) < 40;
      };
      const pix = ((255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;
      const seen = new Uint8Array(w * h);
      const stack = [sx, sy];
      while (stack.length) {
        const y = stack.pop(); let x = stack.pop();
        const row = y * w;
        if (seen[row + x] || !match(row + x)) continue;
        while (x > 0 && !seen[row + x - 1] && match(row + x - 1)) x--;
        let up = false, dn = false;
        for (; x < w && !seen[row + x] && match(row + x); x++) {
          seen[row + x] = 1; d32[row + x] = pix;
          if (y > 0) {
            const u = row - w + x;
            if (!seen[u] && match(u)) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false;
          }
          if (y < h - 1) {
            const v = row + w + x;
            if (!seen[v] && match(v)) { if (!dn) { stack.push(x, y + 1); dn = true; } } else dn = false;
          }
        }
      }
      c.putImageData(img, 0, 0);
    }
    function hexRGB(hx) {
      const n = parseInt(String(hx).replace('#', ''), 16);
      return hx.length > 5 ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
    }
    const paintOp = (c, o) => { if (o.t === 'f') fillOp(c, o); else strokeOp(c, o); };
    /* bake finished ops into the base, then lay the live tail over a copy */
    function syncInk() {
      if (inkDirty || baseN > ops.length) { bctx.clearRect(0, 0, IW, IH); baseN = 0; inkDirty = false; liveDirty = true; }
      const upto = Math.max(0, ops.length - 1);
      if (baseN < upto) { for (let i = baseN; i < upto; i++) paintOp(bctx, ops[i]); baseN = upto; liveDirty = true; }
      if (!liveDirty) return;
      ictx.clearRect(0, 0, IW, IH);
      ictx.drawImage(inkB, 0, 0);
      for (let i = baseN; i < ops.length; i++) paintOp(ictx, ops[i]);
      liveDirty = false;
    }
    /* A stroke that grows after it was baked (a late packet) forces a replay */
    function touchOp(o) { if (ops.indexOf(o) < baseN) inkDirty = true; liveDirty = true; }

    /* ------------------------------------------------------ tools ------- */
    const TOOL = { DRAW: 'draw', ERASE: 'erase', FILL: 'fill' };
    let tool = TOOL.DRAW;
    let curCol = '#000000', curSize = 6;
    const redo = [];
    let wheelOpen = false, wheelDrag = 0;
    const WHEEL = { x: 0, y: 0, r: 58, sq: 50 };
    let wheelHue = 220, wheelSat = 0.75, wheelVal = 0.95;
    function hsvHex(h, s, v) {
      const f = n => {
        const k = (n + h / 60) % 6;
        const x = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        return Math.round(x * 255).toString(16).padStart(2, '0');
      };
      return '#' + f(5) + f(3) + f(1);
    }

    const isDrawer = () => drawerId === MYID;
    const meGuessed = () => guessedOrder.indexOf(MYID) >= 0;
    const canUseTools = () => phase === 'solo' || (!SOLO && isDrawer() && phase === 'draw');
    const guessersLeft = () => order.filter(id => id !== drawerId && present(id) && guessedOrder.indexOf(id) < 0).length;
    const readyOf = id => id === MYID ? myReady : !!lobbyReady[id];

    /* host outbound one-shots (queued for guests; host already has its own) */
    const pending = [];
    const HOST_LOCAL = { stk: 1, fill: 1, struct: 1 };
    function emit(e) {
      if (!HOST) return;
      if (!SOLO) pending.push(e);
      if (!HOST_LOCAL[e[0]]) applyEvent(e);
    }
    /* structural edits (undo / redo / clear) just mark the next snapshot full —
       replaying a whole op list is rare and self-healing, and far simpler than
       trying to keep two undo stacks in step over the wire */
    function structural() { if (HOST && MPS) { MPS.forceFull = true; pending.push(['struct']); } }

    /* ----------------------------------------------------- DOM guess ----
       A real input, because the shell gives Enter to global chat and the
       canvas can't take focus. It is laid over the action bar under the
       paper, and follows the stage when the window is resized. */
    const hostEl = cvEl.parentElement;
    const gi = document.createElement('input');
    gi.id = 'skGuess'; gi.type = 'text'; gi.maxLength = 32; gi.autocomplete = 'off'; gi.spellcheck = false;
    gi.placeholder = 'Type your guess and press Enter…';
    hostEl.appendChild(gi);
    let giShown = false, giKey = '';
    gi.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitGuess(gi.value); gi.value = ''; }
      else if (e.key === 'Escape') gi.blur();
      e.stopPropagation();
    });
    function showGuess(on) {
      if (on === giShown) return;
      giShown = on; gi.style.display = on ? 'block' : 'none';
      if (on) { giKey = ''; placeGuess(); setTimeout(() => { try { gi.focus(); } catch (e) {} }, 0); }
      else { gi.value = ''; try { gi.blur(); } catch (e) {} }
    }
    function placeGuess() {
      if (!giShown) return;
      const s = Stage.scale, x = Stage.ox + (BX + 14) * s, y = Stage.oy + (AY + 15) * s;
      const w = (BW - 28) * s, h = (AH - 30) * s;
      const key = x.toFixed(1) + ',' + y.toFixed(1) + ',' + w.toFixed(1) + ',' + h.toFixed(1);
      if (key === giKey) return;
      giKey = key;
      gi.style.left = x.toFixed(1) + 'px'; gi.style.top = y.toFixed(1) + 'px';
      gi.style.width = w.toFixed(1) + 'px'; gi.style.height = h.toFixed(1) + 'px';
      gi.style.fontSize = Math.max(12, 15 * s).toFixed(1) + 'px';
      gi.style.borderRadius = (12 * s).toFixed(1) + 'px';
      gi.style.padding = '0 ' + (16 * s).toFixed(1) + 'px';
    }
    function submitGuess(raw) {
      const g = String(raw || '').trim();
      if (!g || SOLO || isDrawer() || meGuessed() || phase !== 'draw') return;
      if (HOST) { handleGuess(MYID, g); return; }
      myGuesses.push(g.slice(0, 32)); if (myGuesses.length > 12) myGuesses.shift();
      MPS.cmd({ c: 'guess', g: g.slice(0, 32) });
    }

    /* ----------------------------------------------------- host logic --- */
    function closeLobby(why) {
      phase = 'go'; goWhy = why;
      timer = SOLO ? 1.4 : why === 'ready' ? 2.6 : 2.2;
      if (!SOLO) {
        MPS.forceFull = true;
        emit(['sys', why === 'ready' ? 'Everyone’s ready — let’s draw!' : 'Time’s up — let’s draw!']);
      }
    }
    function startTurn() {
      /* skip anyone who has left — their turn would only be a blank page */
      for (let g = 0; g < order.length && !present(order[turnIdx]); g++) {
        turnIdx++;
        if (turnIdx >= order.length) { turnIdx = 0; round++; }
      }
      if (round > ROUNDS) { finish(); return; }
      drawerId = order[turnIdx];
      word = ''; myPick = ''; choices = pickChoices(); revealWord = '';
      guessedOrder = []; for (const k in guessedGain) delete guessedGain[k];
      revealSet = {}; hintMask = '';
      ops = []; redo.length = 0; inkDirty = true; sidCounter = 1;
      phase = 'pick'; timer = PICKT; myPickIdx = -1;
      structural();
      emit(['sys', nameOf(drawerId) + ' is choosing a word']);
    }
    function beginDraw(w) {
      word = w; phase = 'draw'; timer = DRAWT; hintMask = maskFor(w);
      emit(['sys', nameOf(drawerId) + ' is drawing!']);
    }
    function maskFor(w) {
      let out = '';
      for (let i = 0; i < w.length; i++) out += (w[i] === ' ' ? ' ' : (revealSet[i] ? w[i] : '_'));
      return out;
    }
    function revealAHint() {
      const hidden = [];
      for (let i = 0; i < word.length; i++) if (word[i] !== ' ' && !revealSet[i]) hidden.push(i);
      if (!hidden.length) return;
      revealSet[hidden[(wrand() * hidden.length) | 0]] = 1;
      hintMask = maskFor(word);
    }
    function handleGuess(id, g) {
      if (phase !== 'draw' || id === drawerId || guessedOrder.indexOf(id) >= 0) return;
      const ng = norm(g), nw = norm(word);
      if (!ng) return;
      if (ng === nw) {
        const frac = clamp(timer / DRAWT, 0, 1);
        const gain = Math.round(60 + 340 * frac);
        scores[id] = (scores[id] || 0) + gain; guessedGain[id] = gain;
        guessedOrder.push(id);
        const dgain = Math.round(40 + 130 * frac);
        scores[drawerId] = (scores[drawerId] || 0) + dgain;
        guessedGain[drawerId] = (guessedGain[drawerId] || 0) + dgain;
        emit(['ok', { id: id, name: nameOf(id), gain: gain }]);
        Sound.coin();
        /* everyone has it: a beat to enjoy that, then the reveal */
        if (guessersLeft() === 0) timer = Math.min(timer, 1.5);
      } else {
        emit(['msg', { id: id, name: nameOf(id), text: g }]);
        if (editDist(ng, nw) <= 1 && ng.length > 2) emit(['close', { id: id }]);
      }
    }
    function endTurn() {
      phase = 'reveal'; timer = REVEALT;
      emit(['rev', { word: word, gains: Object.assign({}, guessedGain) }]);
      emit(['sys', 'The word was “' + word + '”']);
    }
    function nextTurn() {
      turnIdx++;
      if (turnIdx >= order.length) { turnIdx = 0; round++; }
      if (round > ROUNDS) { finish(); return; }
      startTurn();
    }
    /* `ending` is left to the 'over' event: setting it here first made the
       host's own handler skip gameOver, so the host sat on the finished board
       with no results while every guest got theirs. */
    function finish() {
      phase = 'end';
      const rank = ROSTER.map(p => ({ id: p.id, s: scores[p.id] || 0 })).sort((a, b) => b.s - a.s);
      let place = 1; for (const r of rank) { if (r.id === MYID) break; place++; }
      const win = rank[0];
      emit(['over', {
        score: scores[MYID] || 0,
        title: win && win.id === MYID ? 'You won!' : (win ? nameOf(win.id).split(' ')[0] + ' wins' : 'Game over'),
        stats: [
          { label: 'Place', value: place + ' / ' + ROSTER.length },
          { label: 'Your points', value: String(scores[MYID] || 0) },
          { label: 'Winner', value: win ? nameOf(win.id).split(' ')[0] + ' · ' + win.s : '—' }
        ]
      }]);
    }
    function hostTick(dt) {
      timer -= dt;
      if (phase === 'avatar') {
        const here = ROSTER.filter(p => present(p.id));
        const all = here.length > 0 && here.every(p => lobbyReady[p.id]);
        if (all || timer <= 0) closeLobby(all ? 'ready' : 'time');
      } else if (phase === 'go') { if (timer <= 0) startTurn(); }
      else if (phase === 'pick') { if (timer <= 0) beginDraw(choices[0]); }
      else if (phase === 'draw') {
        const rev = Object.keys(revealSet).length;
        const cnt = word.replace(/ /g, '').length;
        const maxHints = Math.min(cnt - 1, Math.floor(cnt / 3) + 1);
        const due = Math.floor(((DRAWT - timer) / DRAWT) * (maxHints + 1));
        if (due > rev && rev < maxHints) revealAHint();
        /* the last guesser might have left rather than guessed */
        if (order.length > 1 && guessersLeft() === 0 && timer > 1.5) timer = 1.5;
        if (timer <= 0) endTurn();
      } else if (phase === 'reveal') { if (timer <= 0) nextTurn(); }
    }
    function hostConsume() {
      const q = MPS._cmdQ;
      while (q.length) {
        const c = q.shift(); if (!c) continue;
        const fromDrawer = c.from === drawerId && phase === 'draw';
        if (c.c === 'seg' && fromDrawer) commitSeg(c.seg);
        else if (c.c === 'fill' && fromDrawer) { const o = { t: 'f', col: c.col, x: c.x, y: c.y }; ops.push(o); redo.length = 0; liveDirty = true; emit(['fill', o]); }
        else if (c.c === 'undo' && fromDrawer) doUndo();
        else if (c.c === 'redo' && fromDrawer) doRedo();
        else if (c.c === 'clr' && fromDrawer) doClear();
        else if (c.c === 'pick' && c.from === drawerId && phase === 'pick') { const w = choices[c.i | 0]; if (w) beginDraw(w); }
        else if (c.c === 'guess') handleGuess(c.from, c.g);
        else if (c.c === 'resync') MPS.forceFull = true;
        else if (c.c === 'av') { if (phase === 'avatar' && inRoster(c.from) && validSpec(c.a)) avatars[c.from] = c.a.slice(); }
        else if (c.c === 'rdy') {
          if (phase !== 'avatar' || !inRoster(c.from)) continue;
          if (validSpec(c.a)) avatars[c.from] = c.a.slice();
          if (c.v) { if (!lobbyReady[c.from]) { lobbyReady[c.from] = 1; hopAt[c.from] = nowS(); Sound.pickup(); } }
          else delete lobbyReady[c.from];
        }
      }
    }
    function commitSeg(seg) {
      let s = ops.find(z => z.t === 's' && z.id === seg.id);
      if (!s) { s = { t: 's', id: seg.id, col: seg.col, size: seg.size, er: seg.er, pts: [] }; ops.push(s); redo.length = 0; }
      for (const p of seg.pts) s.pts.push(p);
      touchOp(s);
      emit(['stk', seg]);
    }

    /* shared edit actions — run on whoever is authoritative for them */
    function doUndo() { if (!ops.length) return; redo.push(ops.pop()); inkDirty = true; structural(); Sound.blip(); }
    function doRedo() { if (!redo.length) return; ops.push(redo.pop()); inkDirty = true; structural(); Sound.blip(); }
    function doClear() { if (!ops.length) return; redo.length = 0; ops = []; inkDirty = true; structural(); Sound.thud(); }

    /* ----------------------------------------------------- events ------- */
    function applyEvent(e) {
      const k = e[0];
      if (k === 'stk') { if (!isDrawer()) applySeg(e[1]); }
      else if (k === 'fill') { if (!isDrawer()) { ops.push(e[1]); liveDirty = true; } }
      else if (k === 'ok') {
        pushLog({ k: 'ok', id: e[1].id, name: e[1].name });
        hopAt[e[1].id] = nowS();
        if (e[1].id === MYID) {
          flash = '+' + e[1].gain; flashAt = nowS(); myGain = e[1].gain; Sound.win();
          burst(BX + BW / 2, BY + BH / 2, 22, ['#4ade80', '#fde047', '#ffffff', '#7dd3fc'], 260);
          /* the host never sends the word early, but a wrong guess comes back
             as a chat line — so the one that didn't is the one that was right */
          myKnown = HOST ? word : (myGuesses[0] || ''); myGuesses.length = 0;
        }
      }
      else if (k === 'close') { if (e[1].id === MYID) { toast = 'So close!'; toastAt = nowS(); pushLog({ k: 'close', text: 'That’s really close!' }); } }
      else if (k === 'msg') {
        pushLog({ k: 'msg', id: e[1].id, name: e[1].name, text: e[1].text });
        if (e[1].id === MYID) { const i = myGuesses.indexOf(e[1].text); if (i >= 0) myGuesses.splice(i, 1); }
      }
      else if (k === 'sys') pushLog({ k: 'sys', text: e[1] });
      else if (k === 'rev') revealWord = e[1].word;
      else if (k === 'full') { if (!HOST && e[1]) takeFull(e[1]); }
      else if (k === 'over') { if (!ending) { ending = true; api.gameOver(e[1]); } }
    }
    function applySeg(seg) {
      let s = ops.find(z => z.t === 's' && z.id === seg.id);
      if (!s) { s = { t: 's', id: seg.id, col: seg.col, size: seg.size, er: seg.er, pts: [] }; ops.push(s); }
      for (const p of seg.pts) s.pts.push(p);
      touchOp(s);
    }
    function pushLog(o) {
      /* stamped (out of sight of JSON) so a new line can slide in */
      try { Object.defineProperty(o, '_at', { value: nowS(), writable: true, enumerable: false, configurable: true }); } catch (e) {}
      guessLog.push(o); if (guessLog.length > 40) guessLog.shift();
    }

    /* ----------------------------------------------------- local draw --- */
    let drawing = false, curStroke = null, segBuf = [], segT = 0;
    function beginStroke(nx, ny) {
      const er = tool === TOOL.ERASE;
      curStroke = { t: 's', id: sidCounter++, col: er ? '#000000' : curCol, size: curSize * (er ? 1.7 : 1), er: er, pts: [[nx, ny]] };
      ops.push(curStroke); redo.length = 0; segBuf = [[nx, ny]];
      liveDirty = true;
      sendSeg();
    }
    function contStroke(nx, ny) {
      if (!curStroke) return;
      const pts = curStroke.pts, last = pts[pts.length - 1];
      /* skip samples the cursor barely moved between: they add cost and make
         the smoothing wobble, without adding any detail */
      if (last && Math.abs(last[0] - nx) * BW < 1.1 && Math.abs(last[1] - ny) * BH < 1.1) return;
      pts.push([nx, ny]); segBuf.push([nx, ny]); touchOp(curStroke);
    }
    function sendSeg() {
      if (!curStroke || SOLO) { segBuf = []; return; }
      if (!segBuf.length) return;
      const seg = { id: curStroke.id, col: curStroke.col, size: curStroke.size, er: curStroke.er, pts: segBuf };
      segBuf = [];
      if (HOST) emit(['stk', seg]); else MPS.cmd({ c: 'seg', seg: seg });
    }
    function endStroke() { sendSeg(); curStroke = null; drawing = false; }
    /* A guest drawer applies its own edits straight away and tells the host,
       which does the same to its copy. The drawer ignores the echoes, so a
       fill it only sent up used to never appear on its own screen. */
    function localFill(nx, ny) {
      const o = { t: 'f', col: curCol, x: nx, y: ny };
      ops.push(o); redo.length = 0; liveDirty = true;
      if (HOST) { if (!SOLO) emit(['fill', o]); }
      else MPS.cmd({ c: 'fill', col: curCol, x: nx, y: ny });
      Sound.place();
    }
    function localUndo() {
      if (HOST) { doUndo(); return; }
      if (ops.length) { redo.push(ops.pop()); inkDirty = true; Sound.blip(); }
      MPS.cmd({ c: 'undo' });
    }
    function localRedo() {
      if (HOST) { doRedo(); return; }
      if (redo.length) { ops.push(redo.pop()); inkDirty = true; Sound.blip(); }
      MPS.cmd({ c: 'redo' });
    }
    function localClear() {
      if (HOST) { doClear(); return; }
      if (ops.length) { ops = []; redo.length = 0; inkDirty = true; Sound.thud(); }
      MPS.cmd({ c: 'clr' });
    }

    function soloNewWord() {
      let w = word;
      while (w === word) w = WORDS[(Math.random() * WORDS.length) | 0];
      word = w; ops = []; redo.length = 0; inkDirty = true;
    }

    /* ----------------------------------------------------- lobby -------- */
    /* Nothing is saved per click: a save rewrites the arcade's whole store,
       and doing that on every pick was a hitch you could feel. The look is
       saved once, when the lobby closes. */
    function setMine(cat, v) {
      if (phase !== 'avatar' || myReady) return;
      const a = specOf(MYID).slice(); a[cat] = v;
      avatars[MYID] = a; avDirty = true;
      wobble(1);
    }
    function shuffleMine() {
      if (phase !== 'avatar' || myReady) return;
      avatars[MYID] = randomSpec(); avDirty = true;
      wobble(1.9);
      Sound.jump();
    }
    /* the preview's reaction: a jelly squash, a little lean, a puff of sparkles */
    function wobble(k) {
      kick('jelly', 7 * k);
      kick('tilt', (Math.random() < .5 ? -1 : 1) * 4 * k);
      burst(PV.x, PV.y - 6, Math.round(6 * k), [AV_BODY[specOf(MYID)[0]], '#fde047', '#ffffff'], 150 * Math.sqrt(k));
    }
    function setMyReady(v) {
      if (phase !== 'avatar' || myReady === v) return;
      if (lookOnly) { if (v) backToMenu(); return; }
      myReady = v;
      kick('rbp', -10);
      if (v) { hopAt[MYID] = nowS(); burst(PV.x, PV.y, 16, ['#4ade80', '#fde047', '#ffffff', '#a78bfa'], 230); Sound.coin(); }
      else Sound.blip();
      if (HOST) { if (v) lobbyReady[MYID] = 1; else delete lobbyReady[MYID]; }
      else MPS.cmd({ c: 'rdy', v: v ? 1 : 0, a: specOf(MYID).slice() });
    }
    function lobbyInput(I) {
      let c;
      while ((c = I.takeClick())) {
        if (phase !== 'avatar' || c.btn !== 0) continue;
        const r = hitAt(c.x, c.y);
        if (!r) continue;
        if (r.t === 'ready') setMyReady(!myReady);
        else if (r.t === 'unlock') setMyReady(false);
        else if (r.t === 'tab') { if (avTab !== r.i) setTab(r.i); }
        else if (r.t === 'opt') { kick('cp' + r.i, -9); if (specOf(MYID)[avTab] !== r.i) { setMine(avTab, r.i); Sound.blip(); } }
        else if (r.t === 'shuffle') { kick('sbp', -10); shuffleMine(); }
      }
      if (phase !== 'avatar') return;
      if (I.pressed('Space')) setMyReady(!myReady);
      if (myReady) return;
      const n = AV_N[avTab], v = specOf(MYID)[avTab];
      if (I.pressed('ArrowRight')) { setMine(avTab, (v + 1) % n); kick('cp' + ((v + 1) % n), -9); Sound.blip(); }
      else if (I.pressed('ArrowLeft')) { setMine(avTab, (v + n - 1) % n); kick('cp' + ((v + n - 1) % n), -9); Sound.blip(); }
      if (I.pressed('ArrowDown')) setTab((avTab + 1) % AV_CATS.length);
      else if (I.pressed('ArrowUp')) setTab((avTab + AV_CATS.length - 1) % AV_CATS.length);
      if (I.pressed('KeyR')) shuffleMine();
    }
    function setTab(i) { avTab = i; tabAt = nowS(); Sound.blip(); }
    /* A guest's look and ready flag travel as commands, which can be lost.
       Changes go up (throttled) as they happen, and once a second the host's
       echo is checked — anything that doesn't match is simply sent again. */
    function guestLobbySync(dt) {
      if (phase !== 'avatar') return;
      avSendT -= dt; avSyncT -= dt;
      if (avDirty && avSendT <= 0) { avDirty = false; avSendT = .15; MPS.cmd({ c: 'av', a: specOf(MYID).slice() }); }
      if (avSyncT <= 0) {
        avSyncT = 1;
        const s = MPS._snap;
        if (s && s.ph === 'avatar') {
          const hv = s.av && s.av[MYID], hr = !!(s.rd && s.rd[MYID]);
          if ((hv && String(hv) !== String(specOf(MYID))) || hr !== myReady)
            MPS.cmd({ c: 'rdy', v: myReady ? 1 : 0, a: specOf(MYID).slice() });
        }
      }
    }

    /* ============================================================ update = */
    let netT = 0, lastSnapRef = null;
    return {
      update(dt) {
        if (resyncT > 0) resyncT -= dt;
        if (!HOST) timer = Math.max(0, timer - dt);   // smooth between snapshots; the host's clock corrects it

        const I = api.input, pt = I.pointer;
        const lobby = phase === 'avatar' || phase === 'go';

        /* ---------------- the lobby ---------------- */
        if (phase === 'menu') menuInput(I);
        else if (lobby) lobbyInput(I);

        /* ---------------- tools + drawing ---------------- */
        else if (canUseTools()) {
          let c;
          while ((c = I.takeClick())) {
            const hit = hitAt(c.x, c.y);
            /* the colour wheel closes on any click outside it, and that click
               does nothing else — no surprise dot on the paper */
            if (wheelOpen && (!hit || !hit.wheel)) {
              wheelOpen = false;
              if (!hit || hit.t === 'chip') continue;
            }
            if (hit) {
              if (hit.t === 'tool') { tool = hit.v; Sound.blip(); }
              else if (hit.t === 'col') { curCol = hit.v; if (tool === TOOL.ERASE) tool = TOOL.DRAW; Sound.blip(); }
              else if (hit.t === 'size') { curSize = hit.v; Sound.blip(); }
              else if (hit.t === 'chip') { wheelOpen = !wheelOpen; if (wheelOpen) wheelFrom(curCol); Sound.blip(); }
              else if (hit.t === 'undo') localUndo();
              else if (hit.t === 'redo') localRedo();
              else if (hit.t === 'clr') localClear();
              else if (hit.t === 'neww') { soloNewWord(); Sound.jump(); }
              else if (hit.t === 'hue') { wheelDrag = 1; setHueFrom(c.x, c.y); }
              else if (hit.t === 'sv') { wheelDrag = 2; setSVFrom(c.x, c.y); }
            } else if (c.btn === 0 && inBoard(c.x, c.y)) {
              if (tool === TOOL.FILL) localFill(clamp(toNx(c.x), 0, 1), clamp(toNy(c.y), 0, 1));
              else { drawing = true; beginStroke(toNx(c.x), toNy(c.y)); }
            }
          }
          if (pt.down) {
            if (wheelDrag === 1) setHueFrom(pt.x, pt.y);   // angle only, radius ignored
            else if (wheelDrag === 2) setSVFrom(pt.x, pt.y);
            else if (drawing) {
              /* trace the real path the cursor took, not just where it happened
                 to be when this frame ran */
              const mv = I.takeMoves();
              for (let i = 0; i < mv.length; i += 2) {
                if (inBoard(mv[i], mv[i + 1])) contStroke(clamp(toNx(mv[i]), 0, 1), clamp(toNy(mv[i + 1]), 0, 1));
              }
              if (!mv.length && inBoard(pt.x, pt.y)) contStroke(clamp(toNx(pt.x), 0, 1), clamp(toNy(pt.y), 0, 1));
            }
          } else { wheelDrag = 0; if (drawing) endStroke(); }
          segT += dt; if (segT >= .07) { segT = 0; if (drawing) sendSeg(); }
        } else {
          if (drawing) endStroke();
          wheelOpen = false; wheelDrag = 0;
        }

        /* ---------------- picking ---------------- */
        if (!SOLO && isDrawer() && phase === 'pick') {
          let c;
          while ((c = I.takeClick())) {
            const r = hitAt(c.x, c.y);
            if (r && r.t === 'choice') {
              myPickIdx = r.i; myPick = choices[r.i]; Sound.blip();
              if (HOST) beginDraw(choices[r.i]); else MPS.cmd({ c: 'pick', i: r.i });
            }
          }
        }

        showGuess(!SOLO && phase === 'draw' && !isDrawer() && !meGuessed());
        /* A guesser has nothing to click, so a click anywhere, or typing with
           the box unfocused, goes back to the guess box instead of nowhere.
           Keys typed at any other time are thrown away, so the Space that
           readied you up can't turn up at the start of your first guess. */
        if (giShown && document.activeElement !== gi) {
          const typed = I.takeChars().filter(ch => ch !== '\b').join('');
          let back = !!typed;
          while (I.takeClick()) back = true;
          if (back) {
            if (typed) gi.value = (gi.value + typed).slice(0, 32);
            try { gi.focus(); } catch (e) {}
          }
        } else I.takeChars();

        /* ---------------- practice lobby ---------------- */
        if (SOLO && lobby && !lookOnly) {
          timer -= dt;
          if (phase === 'avatar' && (myReady || timer <= 0)) closeLobby(myReady ? 'ready' : 'time');
          else if (phase === 'go' && timer <= 0) { phase = 'solo'; soloNewWord(); }
        }

        /* ---------------- net ---------------- */
        if (HOST && !SOLO) {
          hostConsume();
          hostTick(dt);
          netT -= dt;
          if (netT <= 0 || pending.length) { netT = .1; MPS.send('snap', buildSnap()); }
        } else if (!SOLO) {
          const s = MPS._snap;
          if (s && s !== lastSnapRef) { lastSnapRef = s; applySnap(s); }
          for (const e of MPS._events.splice(0)) applyEvent(e);
          /* checked after the events, which is where the full state arrives */
          if (s && s.fv !== undefined && s.fv > seenFv && resyncT <= 0) { resyncT = .8; MPS.cmd({ c: 'resync' }); }
          if (MPS.hostLeft && !ending) {
            ending = true;
            api.gameOver({ score: scores[MYID] || 0, title: 'Host left', message: 'The host disconnected.', stats: [] });
            return;
          }
          guestLobbySync(dt);
        }

        /* Advanced here rather than at the top of update: the phase is decided
           further down (hostTick on the host, applySnap on a guest), so running
           this first left the clock a frame behind and flashed the finished
           results board for one frame before it restarted. */
        if (phase !== phaseWas) {
          const from = phaseWas;
          phaseWas = phase; phaseAt = nowS(); lastTick = 99;
          /* whatever you ended the lobby wearing is what you start the next one in */
          if (from === 'avatar') api.save('avatar', specOf(MYID).slice());
          if (phase === 'pick') { myKnown = ''; myGuesses.length = 0; }
          if ((from === 'go' || from === 'avatar' || from === 'menu') && phase !== 'go') gameAt = nowS();
        }

        /* the last five seconds tick */
        if ((phase === 'avatar' && !lookOnly) || phase === 'draw') {
          const sec = Math.ceil(timer);
          if (sec >= 1 && sec <= 5 && sec < lastTick) { lastTick = sec; Sound.blip(); }
        }

        if (SOLO) api.hud({ Mode: phase === 'solo' ? 'Practice' : phase === 'menu' ? 'Menu' : 'Lobby', Word: word, Tool: tool });
        else api.hud({
          Round: Math.min(round, ROUNDS) + ' / ' + ROUNDS,
          Turn: (turnIdx + 1) + ' / ' + turnsPerRound,
          Phase: phase === 'avatar' ? 'Lobby' : phase === 'go' ? 'Starting' : phase === 'pick' ? 'Choosing' : phase === 'reveal' ? 'Reveal' : phase === 'end' ? 'Done' : 'Drawing',
          Points: scores[MYID] || 0,
          Time: Math.max(0, Math.ceil(timer)) + 's'
        });
      },
      render(ctx) { renderAll(ctx); },
      /* Escape: from the look editor back to the menu, from the menu to the hub */
      escape() {
        if (phase === 'menu') { api.hub(); return true; }
        if (phase === 'avatar' && lookOnly) { backToMenu(); return true; }
        return false;
      },
      destroy() {
        try { gi.remove(); } catch (e) {}
        try { cvEl.style.cursor = ''; } catch (e) {}
      }
    };

    function setHueFrom(x, y) {
      wheelHue = (Math.atan2(y - WHEEL.y, x - WHEEL.x) * 180 / Math.PI + 360) % 360;
      curCol = hsvHex(wheelHue, wheelSat, wheelVal); if (tool === TOOL.ERASE) tool = TOOL.DRAW;
    }
    /* open the wheel on the colour you already have, not wherever it was left */
    function wheelFrom(hx) {
      const c = hexRGB(hx).map(v => v / 255), mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), d = mx - mn;
      wheelVal = mx; wheelSat = mx ? d / mx : 0;
      if (d) {
        const h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
        wheelHue = (h * 60 + 360) % 360;
      }
    }
    function setSVFrom(x, y) {
      const s = WHEEL.sq;
      wheelSat = clamp((x - (WHEEL.x - s / 2)) / s, 0, 1);
      wheelVal = clamp(1 - (y - (WHEEL.y - s / 2)) / s, 0, 1);
      curCol = hsvHex(wheelHue, wheelSat, wheelVal); if (tool === TOOL.ERASE) tool = TOOL.DRAW;
    }

    /* ---- host snapshot ---- */
    function buildSnap() {
      const lobby = phase === 'avatar' || phase === 'go';
      const s = {
        ph: phase, rnd: round, ti: turnIdx, tn: order.length, drawer: drawerId, mask: hintMask,
        endsIn: Math.max(0, Math.round(timer * 10) / 10), sc: scores, gd: guessedOrder.slice()
      };
      /* everyone's look rides along while it can still change */
      if (lobby) { s.rd = lobbyReady; s.gw = goWhy; s.av = avatars; }
      if (phase === 'pick') s.ch = choices;
      if (phase === 'reveal' || phase === 'end') { s.rw = revealWord; s.gg = guessedGain; }
      /* The whole picture travels as an event rather than as snapshot
         fields. A guest keeps only the newest snapshot, so two landing in
         one frame used to lose the full one — and with it the blank page at
         the start of a turn, leaving the last drawing under the next — while
         events queue up and are never skipped. It also lands after this
         packet's other events, so its copy of the chat already holds their
         lines: the old way showed each of them twice ("… is choosing a
         word", every turn). Lines that were only ever yours stay yours. */
      if (MPS.forceFull) {
        fullV++; MPS.forceFull = false;
        pending.push(['full', { v: fullV, ops: ops, gl: guessLog.filter(m => m.k !== 'close').slice(-14), av: avatars }]);
      }
      s.fv = fullV;
      if (pending.length) s.ev = pending.splice(0);
      return s;
    }
    function applySnap(s) {
      const wasPhase = phase;
      phase = s.ph; round = s.rnd; drawerId = s.drawer; hintMask = s.mask || '';
      if (s.ti !== undefined) turnIdx = s.ti;
      if (s.tn) turnsPerRound = s.tn;
      /* Resolve the drawer's word from the index they chose — the host uses
         choices[i] for the same i, so the two always agree. Falling back to
         choices[0] covers the case where they let the pick timer expire and
         the host chose for them.
         This used to clear myPick on every snapshot during the pick phase,
         which wiped the drawer's own choice before the phase flipped and left
         them drawing a different word from the one everyone was guessing. */
      if (phase === 'pick' && wasPhase !== 'pick') { myPick = ''; myPickIdx = -1; }
      if (phase === 'draw' && wasPhase !== 'draw' && drawerId === MYID && choices.length) {
        myPick = choices[myPickIdx >= 0 ? myPickIdx : 0] || myPick;
      }
      timer = s.endsIn; if (s.sc) Object.assign(scores, s.sc);
      guessedOrder = s.gd || [];
      if (s.ch) choices = s.ch;
      if (s.rw !== undefined) revealWord = s.rw;
      if (s.gg) { for (const k in guessedGain) delete guessedGain[k]; Object.assign(guessedGain, s.gg); }
      /* a new turn always starts on a blank page, even if its picture never arrived */
      const tk = s.rnd + ':' + s.ti;
      if (turnKey && tk !== turnKey && ops.length) { ops = []; redo.length = 0; inkDirty = true; }
      turnKey = tk;
      if (s.av) takeLooks(s.av);
      if (s.rd) {
        for (const id in s.rd) if (s.rd[id] && !lobbyReady[id] && id !== MYID) { hopAt[id] = nowS(); Sound.pickup(); }
        lobbyReady = Object.assign({}, s.rd);
      }
      if (s.gw) goWhy = s.gw;
    }
    function takeLooks(av) {
      for (const id in av) {
        if (!inRoster(id) || !validSpec(av[id])) continue;
        if (id === MYID && phase === 'avatar') continue;   // yours is yours until the lobby closes
        avatars[id] = av[id].slice();
      }
    }
    /* the whole state, from the host (see buildSnap) */
    function takeFull(f) {
      seenFv = Math.max(seenFv, f.v | 0);
      ops = Array.isArray(f.ops) ? f.ops : []; inkDirty = true;
      /* it can land mid-stroke (an undo's echo while you are already
         drawing again) — keep the line under your pen */
      if (curStroke && drawerId === MYID) {
        const i = ops.findIndex(z => z.t === 's' && z.id === curStroke.id);
        if (i >= 0) ops[i] = curStroke; else ops.push(curStroke);
      }
      if (Array.isArray(f.gl)) { guessLog.length = 0; for (const g of f.gl) guessLog.push(g); }
      if (f.av) takeLooks(f.av);
    }

    /* ------------------------------------------------------ characters --
       The look, drawn. 100 units = `size` px with the origin in the middle
       of the body, and every part a path, so a character is as crisp at 40px
       in the player list as at 170px in the lobby. A thick dark outline round
       everything gives the sticker look, and keeps it readable when small. */
    function ahash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0);
    }
    function defaultSpec(id) {
      /* unsigned shifts throughout: `>>` is signed, and any hash at or above
         2^31 would give a negative index — an undefined colour */
      const h = ahash(String(id)), g = ahash(String(id) + '#look');
      return [h % AV_N[0], (h >>> 5) % AV_N[1], (h >>> 10) % AV_N[2],
              (g % 3 === 0) ? 0 : (g >>> 3) % AV_N[3], (g >>> 8) % AV_N[4],
              ((g >>> 13) % 3 === 0) ? (g >>> 16) % AV_N[5] : 0];
    }
    function randomSpec() {
      return AV_N.map((n, i) => (i === 5 && Math.random() < .45) ? 0 : (Math.random() * n) | 0);
    }
    function blinkOf(id, t) { const o = (ahash(String(id)) % 997) / 997 * 4; return ((t + o) % 4.1) < .13; }
    function avatar(ctx, id, cx, cy, size, o) { buddy(ctx, specOf(id), cx, cy, size, o); }
    function bodyPath(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.bezierCurveTo(24, -36, 40, -20, 40, 4);
      ctx.bezierCurveTo(40, 28, 25, 40, 0, 40);
      ctx.bezierCurveTo(-25, 40, -40, 28, -40, 4);
      ctx.bezierCurveTo(-40, -20, -24, -36, 0, -36);
      ctx.closePath();
    }
    function dotF(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    function buddy(ctx, a, cx, cy, size, o) {
      o = o || NOANIM;
      const base = AV_BODY[a[0]], tint = AV_TINT[a[4]];
      const lw = size > 140 ? 3.4 : size > 80 ? 3.9 : 4.6;   // outline, in units: thinner as it grows
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(size / 100, size / 100);
      if (o.sq || o.rot) {                          // lean and squash about the feet
        ctx.translate(0, 44);
        if (o.rot) ctx.rotate(o.rot);
        if (o.sq) ctx.scale(1 + o.sq, 1 - o.sq);
        ctx.translate(0, -44);
      }
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = OUTL; ctx.lineWidth = lw;

      topBack(ctx, a[3], base, tint, lw);           // ears and stalks sit behind the head

      /* feet */
      ctx.fillStyle = mixHex(base, '#000000', .2);
      for (const fx of [-15, 15]) { ctx.beginPath(); ctx.ellipse(fx, 39, 10, 6.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }

      /* body: lit from the top left, a little darker underneath */
      bodyPath(ctx);
      const g = ctx.createRadialGradient(-13, -17, 4, 0, 2, 50);
      g.addColorStop(0, mixHex(base, '#ffffff', .34)); g.addColorStop(.58, base); g.addColorStop(1, mixHex(base, '#000000', .2));
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(30,12,60,.12)'; ctx.beginPath(); ctx.ellipse(8, 46, 48, 22, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.lineWidth = lw; bodyPath(ctx); ctx.stroke();
      /* shine */
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(-19, -18, 7.5, 4.4, -.75, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.42)'; dotF(ctx, -9, -27, 2.4);
      /* cheeks */
      ctx.fillStyle = 'rgba(255,86,136,.30)';
      ctx.beginPath(); ctx.ellipse(-25, 11, 7, 4.2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(25, 11, 7, 4.2, 0, 0, TAU); ctx.fill();

      extraUnder(ctx, a[5], tint, lw);
      eyes(ctx, a[1], o, base, tint);
      mouth(ctx, a[2]);
      extraOver(ctx, a[5], tint, lw);
      topFront(ctx, a[3], base, tint, lw);
      ctx.restore();
    }
    function sclera(ctx, x, y, rx, ry, pr, lx, ly) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; ctx.stroke();
      const px = x + clamp(lx || 0, -1, 1) * (rx - pr - 1.2), py = y + 1.2 + clamp(ly || 0, -1, 1) * (ry - pr - 1.2);
      ctx.fillStyle = OUTL; dotF(ctx, px, py, pr);
      ctx.fillStyle = '#fff'; dotF(ctx, px - pr * .36, py - pr * .42, pr * .38);
    }
    function starPath(ctx, x, y, R, r, n) {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const an = -Math.PI / 2 + i * Math.PI / n, rad = i & 1 ? r : R;
        const px = x + Math.cos(an) * rad, py = y + Math.sin(an) * rad;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }
    function heartPath(ctx, x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * .9);
      ctx.bezierCurveTo(x - s * 1.35, y + s * .05, x - s * .9, y - s * 1.05, x, y - s * .35);
      ctx.bezierCurveTo(x + s * .9, y - s * 1.05, x + s * 1.35, y + s * .05, x, y + s * .9);
      ctx.closePath();
    }
    function eyes(ctx, k, o, base, tint) {
      const EY = -4, EX = 14, lx = o.lx || 0, ly = o.ly || 0;
      ctx.strokeStyle = OUTL; ctx.fillStyle = OUTL; ctx.lineWidth = 3.2;
      const shut = o.blink && (k === 0 || k === 1 || k === 3 || k === 4 || k === 7 || k === 8 || k === 11);
      if (shut) {
        ctx.lineWidth = 3.4; ctx.beginPath();
        if (k === 7) { ctx.moveTo(-11, EY - 2); ctx.quadraticCurveTo(0, EY + 6, 11, EY - 2); }
        else for (const sx of [-1, 1]) {
          if (k === 8 && sx === 1) continue;
          ctx.moveTo(sx * EX - 7, EY); ctx.quadraticCurveTo(sx * EX, EY + 5.5, sx * EX + 7, EY);
        }
        ctx.stroke();
        if (k === 8) winkEye(ctx, EX, EY);
        return;
      }
      switch (k) {
        case 0:                                     // classic
          for (const sx of [-1, 1]) sclera(ctx, sx * EX, EY, 8.5, 10.5, 5.2, lx, ly);
          break;
        case 1:                                     // beady
          for (const sx of [-1, 1]) {
            const x = sx * EX + lx * 1.5, y = EY + ly * 1.5;
            ctx.fillStyle = OUTL; ctx.beginPath(); ctx.ellipse(x, y, 4.4, 6, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#fff'; dotF(ctx, x - 1.4, y - 2.5, 1.6);
          }
          break;
        case 2:                                     // happy ^ ^
          ctx.lineWidth = 3.8; ctx.beginPath();
          for (const sx of [-1, 1]) { ctx.moveTo(sx * EX - 7.5, EY + 2.5); ctx.quadraticCurveTo(sx * EX, EY - 8.5, sx * EX + 7.5, EY + 2.5); }
          ctx.stroke();
          break;
        case 3:                                     // sleepy: the lids halfway down
          for (const sx of [-1, 1]) {
            sclera(ctx, sx * EX, EY, 8.5, 9.5, 4.6, lx, 1);
            ctx.fillStyle = mixHex(base, '#000000', .08);
            ctx.beginPath(); ctx.ellipse(sx * EX, EY, 8.5, 9.5, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
            ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx * EX, EY, 8.5, 9.5, 0, 0, TAU);
            ctx.moveTo(sx * EX - 8.5, EY); ctx.lineTo(sx * EX + 8.5, EY); ctx.stroke();
          }
          break;
        case 4:                                     // determined, with brows
          for (const sx of [-1, 1]) sclera(ctx, sx * EX, EY + 1, 8, 9.5, 4.8, lx, ly);
          ctx.lineWidth = 4; ctx.beginPath();
          ctx.moveTo(-23, EY - 14); ctx.lineTo(-7, EY - 9); ctx.moveTo(23, EY - 14); ctx.lineTo(7, EY - 9);
          ctx.stroke();
          break;
        case 5:                                     // stars
          for (const sx of [-1, 1]) {
            starPath(ctx, sx * EX, EY, 10, 4.4, 5); ctx.fillStyle = '#ffd43b'; ctx.fill();
            ctx.lineWidth = 2.6; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.85)'; dotF(ctx, sx * EX - 2.2, EY - 2.6, 1.5);
          }
          break;
        case 6:                                     // hearts
          for (const sx of [-1, 1]) {
            heartPath(ctx, sx * EX, EY, 9); ctx.fillStyle = '#ff4d6d'; ctx.fill();
            ctx.lineWidth = 2.6; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.75)'; dotF(ctx, sx * EX - 3.4, EY - 3.4, 1.7);
          }
          break;
        case 7:                                     // cyclops
          sclera(ctx, 0, EY - 2, 12.5, 13.5, 7, lx, ly);
          break;
        case 8:                                     // wink
          sclera(ctx, -EX, EY, 8.5, 10.5, 5.2, lx, ly); winkEye(ctx, EX, EY);
          break;
        case 9:                                     // dizzy
          ctx.lineWidth = 2.6;
          for (const sx of [-1, 1]) {
            ctx.beginPath();
            for (let i = 0; i <= 28; i++) {
              const an = i * .5 * sx, rad = i * .31;
              const x = sx * EX + Math.cos(an) * rad, y = EY + Math.sin(an) * rad;
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
          break;
        case 10:                                    // shades
          ctx.fillStyle = '#15121f'; ctx.lineWidth = 2.8;
          rrect(ctx, -27.5, -13, 23.5, 15.5, 5.5); ctx.fill(); ctx.stroke();
          rrect(ctx, 4, -13, 23.5, 15.5, 5.5); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(0, -11, 4, -8);
          ctx.moveTo(-27, -9); ctx.lineTo(-37, -13); ctx.moveTo(27, -9); ctx.lineTo(37, -13); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-23, -3.5); ctx.lineTo(-17, -10); ctx.moveTo(8.5, -3.5); ctx.lineTo(14.5, -10); ctx.stroke();
          ctx.strokeStyle = OUTL;
          break;
        case 11:                                    // sparkly
          for (const sx of [-1, 1]) {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(sx * EX, EY, 9.5, 12, 0, 0, TAU); ctx.fill();
            ctx.lineWidth = 3; ctx.stroke();
            const px = sx * EX + clamp(lx, -1, 1) * 1.6, py = EY + 1.4 + clamp(ly, -1, 1) * 1.6;
            ctx.fillStyle = tint === '#f5f6fa' ? '#4dabf7' : mixHex(tint, '#4dabf7', .35); dotF(ctx, px, py, 7.2);
            ctx.fillStyle = OUTL; dotF(ctx, px, py, 3.6);
            ctx.fillStyle = '#fff'; dotF(ctx, sx * EX - 2.8, EY - 3.6, 2.7); dotF(ctx, sx * EX + 2.8, EY + 4.4, 1.3);
          }
          break;
      }
    }
    function winkEye(ctx, EX, EY) {
      ctx.lineWidth = 3.6; ctx.beginPath();
      ctx.moveTo(EX + 7, EY - 6); ctx.lineTo(EX - 5, EY); ctx.lineTo(EX + 7, EY + 6);
      ctx.stroke();
    }
    function mouth(ctx, k) {
      const MY = 15;
      ctx.strokeStyle = OUTL; ctx.lineWidth = 3.4;
      switch (k) {
        case 0:                                     // smile
          ctx.beginPath(); ctx.arc(0, MY - 6, 9, .22 * Math.PI, .78 * Math.PI); ctx.stroke();
          break;
        case 1: {                                   // big grin
          /* one path object for the fill, the clip and the outline: restore()
             does not bring the current path back, so the outline used to be
             traced round the tongue instead — a stray ring under the mouth */
          const gp = new Path2D();
          gp.moveTo(-12, MY - 4); gp.quadraticCurveTo(0, MY - 1, 12, MY - 4);
          gp.bezierCurveTo(10, MY + 13, -10, MY + 13, -12, MY - 4); gp.closePath();
          ctx.fillStyle = '#4a1530'; ctx.fill(gp);
          ctx.save(); ctx.clip(gp);
          ctx.fillStyle = '#fff'; ctx.fillRect(-14, MY - 6, 28, 5.5);
          ctx.fillStyle = '#ff6b8b'; ctx.beginPath(); ctx.ellipse(0, MY + 8.5, 6.5, 4, 0, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.lineWidth = 3; ctx.stroke(gp);
          break;
        }
        case 2:                                     // oh!
          ctx.fillStyle = '#4a1530'; ctx.beginPath(); ctx.ellipse(0, MY + 2, 5.5, 7, 0, 0, TAU); ctx.fill();
          ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#ff6b8b'; ctx.beginPath(); ctx.ellipse(0, MY + 5.6, 3.3, 2.2, 0, 0, TAU); ctx.fill();
          break;
        case 3:                                     // :3
          ctx.beginPath(); ctx.moveTo(-10, MY - 1);
          ctx.quadraticCurveTo(-5, MY + 7, 0, MY); ctx.quadraticCurveTo(5, MY + 7, 10, MY - 1); ctx.stroke();
          break;
        case 4: {                                   // tongue out
          /* The tongue hangs FROM the smile. It used to start above the line,
             so its own top edge showed as a second stroke across the mouth
             and the smile cut through it. Now it is clipped to the space
             under the smile, only its sides and tip are outlined, and the
             smile goes on last, over the join. A touch right of centre,
             which is what makes it cheeky rather than ill. */
          const cy = MY - 7, R = 10, tx = 2.4, tw = 4.7, tip = MY + 11;
          const tongue = new Path2D();
          tongue.moveTo(tx - tw, MY - 4); tongue.lineTo(tx - tw, tip - tw);
          tongue.arc(tx, tip - tw, tw, Math.PI, 0, true);
          tongue.lineTo(tx + tw, MY - 4); tongue.closePath();
          const under = new Path2D();
          under.arc(0, cy, R, 0, Math.PI); under.lineTo(-R - 4, cy + 40); under.lineTo(R + 4, cy + 40); under.closePath();
          ctx.save(); ctx.clip(under);
          ctx.fillStyle = '#ff6b8b'; ctx.fill(tongue);
          ctx.lineWidth = 2.6; ctx.stroke(tongue);
          ctx.strokeStyle = 'rgba(150,28,68,.55)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(tx, MY + 3); ctx.lineTo(tx, tip - 4.5); ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = OUTL; ctx.lineWidth = 3.4;
          ctx.beginPath(); ctx.arc(0, cy, R, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
          break;
        }
        case 5:                                     // smirk
          ctx.beginPath(); ctx.moveTo(-10, MY + 1.5); ctx.quadraticCurveTo(2, MY + 6, 11, MY - 4); ctx.stroke();
          break;
        case 6:                                     // fangs
          ctx.beginPath(); ctx.arc(0, MY - 7, 10, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.lineWidth = 2;
          for (const fx of [-4.6, 4.6]) {
            ctx.beginPath(); ctx.moveTo(fx - 2.7, MY + 1.4); ctx.lineTo(fx, MY + 7.8); ctx.lineTo(fx + 2.7, MY + 1.8); ctx.closePath();
            ctx.fill(); ctx.stroke();
          }
          break;
        case 7:                                     // flat
          ctx.beginPath(); ctx.moveTo(-8, MY + 1); ctx.lineTo(8, MY + 1); ctx.stroke();
          break;
        case 8:                                     // wobbly
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-11, MY + 2);
          for (let i = 1; i <= 6; i++) ctx.lineTo(-11 + i * 3.67, MY + 2 + (i & 1 ? -3.2 : 0));
          ctx.stroke();
          break;
        case 9:                                     // buck teeth
          ctx.fillStyle = '#fff'; ctx.lineWidth = 2.2;
          rrect(ctx, -4.6, MY, 4.6, 6.8, 1.2); ctx.fill(); ctx.stroke();
          rrect(ctx, 0, MY, 4.6, 6.8, 1.2); ctx.fill(); ctx.stroke();
          ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0, MY - 8, 10, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
          break;
        case 10:                                    // kiss
          ctx.lineWidth = 3; ctx.beginPath();
          ctx.arc(1, MY - 2, 3.4, -Math.PI / 2, Math.PI / 2); ctx.arc(1, MY + 4.8, 3.4, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          heartPath(ctx, 14, MY - 7, 3.6); ctx.fillStyle = '#ff4d6d'; ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
          break;
        case 11:                                    // all the teeth
          ctx.fillStyle = '#fff'; rrect(ctx, -12, MY - 3, 24, 11, 4); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
          ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, MY + 2.5); ctx.lineTo(11, MY + 2.5);
          for (const tx of [-6, 0, 6]) { ctx.moveTo(tx, MY - 2); ctx.lineTo(tx, MY + 7); }
          ctx.stroke();
          break;
      }
    }
    /* hair and hats that sit behind the head */
    function topBack(ctx, k, base, tint, lw) {
      if (k === 12) {                               // cat ears
        for (const sx of [-1, 1]) {
          ctx.fillStyle = base; ctx.beginPath();
          ctx.moveTo(sx * 10, -33); ctx.lineTo(sx * 30, -56); ctx.lineTo(sx * 37, -16); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ff9fb8'; ctx.beginPath();
          ctx.moveTo(sx * 17, -32); ctx.lineTo(sx * 29, -48); ctx.lineTo(sx * 32, -24); ctx.closePath(); ctx.fill();
        }
      } else if (k === 13) {                        // bunny ears
        for (const sx of [-1, 1]) {
          ctx.save(); ctx.translate(sx * 13, -42); ctx.rotate(sx * .2);
          ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(0, -10, 8.5, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ff9fb8'; ctx.beginPath(); ctx.ellipse(0, -9, 4.2, 15, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      } else if (k === 14) {                        // antenna
        ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(2, -30); ctx.quadraticCurveTo(-3, -48, 8, -57); ctx.stroke();
        ctx.fillStyle = tint; ctx.lineWidth = lw; dotF(ctx, 9, -60, 6.5); ctx.beginPath(); ctx.arc(9, -60, 6.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.65)'; dotF(ctx, 7, -62.5, 2);
      } else if (k === 4) {                         // the bun, under its hair
        ctx.fillStyle = tint; dotF(ctx, 0, -45, 12); ctx.beginPath(); ctx.arc(0, -45, 12, 0, TAU); ctx.stroke();
      }
      ctx.lineWidth = lw;
    }
    /* a leaf, pointing along `an` */
    function leaf(ctx, x, y, an, len) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(an);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len / 2, -len * .42, len, 0); ctx.quadraticCurveTo(len / 2, len * .42, 0, 0);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
    function hairArc(ctx, a0, a1, r) {
      ctx.arc(0, 0, r, a0, a1);
    }
    function topFront(ctx, k, base, tint, lw) {
      const dark = mixHex(tint, '#000000', .28), light = mixHex(tint, '#ffffff', .35);
      const D = Math.PI / 180;
      ctx.strokeStyle = OUTL; ctx.lineWidth = lw;
      switch (k) {
        case 1:                                     // sprout
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -35); ctx.quadraticCurveTo(-1, -44, 2, -50); ctx.stroke();
          ctx.fillStyle = tint; ctx.lineWidth = 2.6;
          leaf(ctx, 2, -50, -2.55, 15); leaf(ctx, 2, -50, -.55, 17);
          break;
        case 2: {                                   // spiky
          ctx.fillStyle = tint; ctx.beginPath();
          const a0 = -170 * D, a1 = -10 * D, n = 7;
          ctx.moveTo(Math.cos(a0) * 38.5, Math.sin(a0) * 38.5);
          for (let i = 1; i <= n * 2; i++) {
            const an = a0 + (a1 - a0) * i / (n * 2), r = i & 1 ? 53 : 39;
            ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
          }
          ctx.quadraticCurveTo(22, -30, 1, -21); ctx.quadraticCurveTo(-20, -30, Math.cos(a0) * 38.5, Math.sin(a0) * 38.5);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-22, -34); ctx.lineTo(-16, -40); ctx.stroke();
          break;
        }
        case 3:                                     // side swoop
          ctx.fillStyle = tint; ctx.beginPath();
          ctx.moveTo(-40.5, -2);
          hairArc(ctx, -176 * D, -8 * D, 41.5);
          ctx.quadraticCurveTo(32, -29, 10, -27.5);
          ctx.bezierCurveTo(-6, -26, -22, -13, -40.5, -2);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(12, -33); ctx.quadraticCurveTo(-4, -26, -17, -14); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(-14, -36); ctx.quadraticCurveTo(-2, -40, 10, -38); ctx.stroke();
          break;
        case 4:                                     // bun: the cap over the bun drawn behind
          ctx.fillStyle = tint; ctx.beginPath();
          hairArc(ctx, -174 * D, -6 * D, 40.2);
          ctx.quadraticCurveTo(0, -36, Math.cos(-174 * D) * 40.2, Math.sin(-174 * D) * 40.2);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ff6b8b'; ctx.lineWidth = 2.4; rrect(ctx, -7, -38.5, 14, 5, 2.5); ctx.fill(); ctx.stroke();
          break;
        case 5: {                                   // curls
          const C = [];
          for (let i = 0; i <= 8; i++) {
            const an = (-172 + i * 20.5) * D;
            C.push([Math.cos(an) * 36, Math.sin(an) * 36 - 1, 10.5 - Math.abs(i - 4) * .35]);
          }
          ctx.lineWidth = lw * 2;
          for (const c of C) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, TAU); ctx.stroke(); }
          ctx.fillStyle = tint;
          for (const c of C) dotF(ctx, c[0], c[1], c[2]);
          ctx.fillStyle = 'rgba(255,255,255,.22)';
          for (const c of C) dotF(ctx, c[0] - 3, c[1] - 3.5, 2.6);
          ctx.lineWidth = lw;
          break;
        }
        case 6:                                     // mohawk
          ctx.fillStyle = tint; ctx.beginPath();
          ctx.moveTo(-9, -33); ctx.lineTo(-13, -47); ctx.lineTo(-4, -44); ctx.lineTo(-3, -61);
          ctx.lineTo(5, -48); ctx.lineTo(12, -57); ctx.lineTo(11, -43); ctx.lineTo(17, -44); ctx.lineTo(9, -32);
          ctx.quadraticCurveTo(0, -37, -9, -33); ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        case 7:                                     // beanie
          ctx.fillStyle = tint; ctx.beginPath();
          ctx.moveTo(-38, -10); ctx.bezierCurveTo(-38, -52, 38, -52, 38, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
          ctx.beginPath(); for (const rx of [-20, -7, 7, 20]) { ctx.moveTo(rx, -16); ctx.quadraticCurveTo(rx * 1.1, -30, rx * .6, -40); } ctx.stroke();
          ctx.strokeStyle = OUTL; ctx.lineWidth = lw;
          ctx.fillStyle = dark; rrect(ctx, -41, -17, 82, 14, 7); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.6; ctx.beginPath();
          for (let x = -34; x <= 34; x += 6) { ctx.moveTo(x, -14); ctx.lineTo(x, -6); }
          ctx.stroke(); ctx.strokeStyle = OUTL; ctx.lineWidth = lw;
          ctx.fillStyle = light; dotF(ctx, 0, -45, 8.5); ctx.beginPath(); ctx.arc(0, -45, 8.5, 0, TAU); ctx.stroke();
          break;
        case 8:                                     // cap
          ctx.fillStyle = dark; ctx.beginPath();
          ctx.moveTo(8, -15); ctx.quadraticCurveTo(46, -24, 58, -11); ctx.quadraticCurveTo(40, -3, 8, -9); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = tint; ctx.beginPath();
          ctx.moveTo(-37, -11); ctx.bezierCurveTo(-37, -48, 37, -48, 37, -11); ctx.quadraticCurveTo(0, -17, -37, -11); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -39); ctx.quadraticCurveTo(9, -27, 11, -13); ctx.stroke();
          ctx.fillStyle = dark; dotF(ctx, 0, -39.5, 3.4);
          ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-16, -30, 8, 3.5, -.5, 0, TAU); ctx.fill();
          break;
        case 9: {                                   // crown
          const g = ctx.createLinearGradient(0, -60, 0, -28);
          g.addColorStop(0, '#fff3b0'); g.addColorStop(.5, '#ffd43b'); g.addColorStop(1, '#e8a400');
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(-22, -28); ctx.lineTo(-27, -55); ctx.lineTo(-13, -42); ctx.lineTo(0, -61); ctx.lineTo(13, -42);
          ctx.lineTo(27, -55); ctx.lineTo(22, -28); ctx.quadraticCurveTo(0, -34, -22, -28); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = tint === '#f6d365' ? '#e74c3c' : tint; ctx.lineWidth = 1.8;
          for (const p of [[-27, -55, 3.4], [0, -61, 3.8], [27, -55, 3.4], [-11, -32.5, 2.8], [0, -33.5, 3], [11, -32.5, 2.8]]) {
            dotF(ctx, p[0], p[1], p[2]); ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, TAU); ctx.stroke();
          }
          break;
        }
        case 10: {                                  // party hat
          ctx.save(); ctx.translate(5, -34); ctx.rotate(.2);
          /* one path object for fill, clip and outline: restore() does not
             bring the current path back, so stroking after the stripes would
             outline the stripes instead of the hat */
          const cone = new Path2D();
          cone.moveTo(-15, 3); cone.lineTo(0, -37); cone.lineTo(15, 3); cone.quadraticCurveTo(0, 7, -15, 3); cone.closePath();
          ctx.fillStyle = tint; ctx.fill(cone);
          ctx.save(); ctx.clip(cone);
          ctx.strokeStyle = tint === '#f5f6fa' ? '#fd79a8' : 'rgba(255,255,255,.75)'; ctx.lineWidth = 4.5;
          ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(-20, -30 + i * 9); ctx.lineTo(20, -40 + i * 9); } ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = OUTL; ctx.lineWidth = lw; ctx.stroke(cone);
          ctx.fillStyle = '#ffd43b'; dotF(ctx, 0, -39, 5.5); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -39, 5.5, 0, TAU); ctx.stroke();
          ctx.restore();
          break;
        }
        case 11: {                                  // wizard hat
          ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, -31, 38, 8.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
          const g = ctx.createLinearGradient(-20, 0, 20, 0);
          g.addColorStop(0, light); g.addColorStop(1, tint);
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(-21, -33); ctx.quadraticCurveTo(-9, -58, 7, -79); ctx.quadraticCurveTo(9, -57, 21, -33);
          ctx.quadraticCurveTo(0, -38, -21, -33); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ffe066'; ctx.lineWidth = 1.6;
          starPath(ctx, -2, -49, 5.5, 2.4, 5); ctx.fill(); ctx.stroke();
          dotF(ctx, 7, -62, 1.8); dotF(ctx, -8, -39, 1.5); dotF(ctx, 9, -42, 1.3);
          break;
        }
        case 15:                                    // top hat
          ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, -32, 31, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = tint; rrect(ctx, -18.5, -72, 37, 41, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = tint === '#e74c3c' ? '#2b2238' : '#e74c3c'; ctx.fillRect(-17.5, -43, 35, 7);
          ctx.lineWidth = 2; ctx.strokeRect(-17.5, -43, 35, 7);
          ctx.fillStyle = light; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(0, -72, 18.5, 4.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-13, -66, 5, 20);
          break;
      }
      ctx.lineWidth = lw;
    }
    function extraUnder(ctx, k, tint, lw) {
      if (k === 5) {                                // freckles
        ctx.fillStyle = 'rgba(140,72,36,.55)';
        for (const sx of [-1, 1]) { dotF(ctx, sx * 21, 6, 1.4); dotF(ctx, sx * 26, 8.5, 1.3); dotF(ctx, sx * 20.5, 11, 1.2); }
      } else if (k === 8) {                         // bow tie
        /* low on the body, clear of even the widest grin */
        const bt = tint === '#2b2238' ? '#e74c3c' : tint;
        ctx.fillStyle = bt; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(-12, 28); ctx.lineTo(-12, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(12, 28); ctx.lineTo(12, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = mixHex(bt, '#000000', .3);
        rrect(ctx, -3.6, 30.4, 7.2, 7.2, 2); ctx.fill(); ctx.stroke();
      }
      ctx.lineWidth = lw;
    }
    function extraOver(ctx, k, tint, lw) {
      ctx.strokeStyle = OUTL;
      switch (k) {
        case 1:                                     // round glasses
          ctx.fillStyle = 'rgba(200,230,255,.2)'; ctx.lineWidth = 3;
          for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 14, -4, 10, 0, TAU); ctx.fill(); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(-4, -5); ctx.quadraticCurveTo(0, -8, 4, -5);
          ctx.moveTo(-24, -6); ctx.lineTo(-38, -10); ctx.moveTo(24, -6); ctx.lineTo(38, -10); ctx.stroke();
          break;
        case 2:                                     // big square frames
          ctx.lineWidth = 4.2;
          rrect(ctx, -27, -14, 23, 19, 4); ctx.stroke(); rrect(ctx, 4, -14, 23, 19, 4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-27, -9); ctx.lineTo(-38, -12); ctx.moveTo(27, -9); ctx.lineTo(38, -12); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.lineWidth = 1.6; rrect(ctx, -4.5, -9, 9, 6, 1.5); ctx.fill(); ctx.stroke();
          break;
        case 3:                                     // monocle
          ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(14, -4, 10.5, 0, TAU); ctx.stroke();
          ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(23, 2); ctx.quadraticCurveTo(31, 14, 25, 27); ctx.stroke();
          ctx.strokeStyle = OUTL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(14, -4, 12.2, 0, TAU); ctx.stroke();
          break;
        case 4:                                     // moustache
          ctx.fillStyle = tint; ctx.lineWidth = 2.4; ctx.beginPath();
          ctx.moveTo(0, 7.5);
          ctx.bezierCurveTo(-4, 4, -12, 4, -15, 8.5); ctx.bezierCurveTo(-17, 11.5, -21.5, 11, -21.5, 7.5);
          ctx.bezierCurveTo(-20, 14.5, -9, 15.5, 0, 11);
          ctx.bezierCurveTo(9, 15.5, 20, 14.5, 21.5, 7.5); ctx.bezierCurveTo(21.5, 11, 17, 11.5, 15, 8.5);
          ctx.bezierCurveTo(12, 4, 4, 4, 0, 7.5); ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        case 6:                                     // plaster
          ctx.save(); ctx.translate(23, 3); ctx.rotate(-.55);
          ctx.fillStyle = '#f7c59f'; ctx.lineWidth = 2; rrect(ctx, -10, -4.2, 20, 8.4, 3.5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e7a57a'; ctx.fillRect(-3.4, -3, 6.8, 6);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; dotF(ctx, -6.5, -1, .7); dotF(ctx, -6.5, 1.5, .7); dotF(ctx, 6.5, -1, .7); dotF(ctx, 6.5, 1.5, .7);
          ctx.restore();
          break;
        case 7:                                     // eyepatch
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-37, -21); ctx.lineTo(38, -3); ctx.stroke();
          ctx.fillStyle = '#1f1a2e'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.ellipse(14, -3, 10.5, 9.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(11, -6, 4, 2.4, -.5, 0, TAU); ctx.fill();
          break;
        case 9:                                     // sparkles
          ctx.fillStyle = '#ffe066'; ctx.lineWidth = 1.8;
          for (const s of [[-44, -26, 7], [45, -12, 5], [37, -44, 5.5]]) { starPath(ctx, s[0], s[1], s[2], s[2] * .32, 4); ctx.fill(); ctx.stroke(); }
          break;
      }
      ctx.lineWidth = lw;
    }

    /* ============================================================ icons ==
       Drawn as vector paths rather than loaded as files, so the arcade stays
       a single portable document and every glyph stays crisp at any size. */
    function icon(ctx, name, x, y, s, col) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(s / 24, s / 24);
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const P2 = new Path2D();
      if (name === 'pencil') {
        P2.moveTo(-8, 8); P2.lineTo(-8, 4); P2.lineTo(3, -7); P2.lineTo(7, -3); P2.lineTo(-4, 8); P2.closePath();
        ctx.fill(P2);
        const t = new Path2D(); t.moveTo(1, -5); t.lineTo(5, -1); ctx.stroke(t);
      } else if (name === 'eraser') {
        ctx.save(); ctx.rotate(-0.5);
        const b = new Path2D(); b.roundRect ? b.roundRect(-9, -4, 18, 9, 2) : b.rect(-9, -4, 18, 9);
        ctx.fill(b);
        ctx.restore();
        const l = new Path2D(); l.moveTo(-9, 9); l.lineTo(9, 9); ctx.stroke(l);
      } else if (name === 'bucket') {
        P2.moveTo(-7, -1); P2.lineTo(0, -8); P2.lineTo(8, 0); P2.lineTo(1, 7); P2.closePath();
        ctx.fill(P2);
        const dcap = new Path2D(); dcap.moveTo(-4, -4); dcap.lineTo(-4, -9); ctx.stroke(dcap);
        const dr = new Path2D(); dr.moveTo(10, 2); dr.quadraticCurveTo(13, 6, 10, 8); dr.quadraticCurveTo(7, 6, 10, 2);
        ctx.fill(dr);
      } else if (name === 'undo' || name === 'redo') {
        ctx.save(); if (name === 'redo') ctx.scale(-1, 1);
        const a = new Path2D();
        a.moveTo(7, 6); a.arc(0, 2, 7, 0, Math.PI, true);
        ctx.stroke(a);
        const h = new Path2D(); h.moveTo(-7, 2); h.lineTo(-11, -2); h.lineTo(-3, -2); h.closePath();
        ctx.fill(h);
        ctx.restore();
      } else if (name === 'trash') {
        const l = new Path2D(); l.moveTo(-9, -6); l.lineTo(9, -6); ctx.stroke(l);
        const b = new Path2D(); b.moveTo(-7, -6); b.lineTo(-6, 9); b.lineTo(6, 9); b.lineTo(7, -6);
        ctx.stroke(b);
        const c = new Path2D(); c.moveTo(-3, -6); c.lineTo(-3, -9); c.lineTo(3, -9); c.lineTo(3, -6);
        ctx.stroke(c);
      } else if (name === 'spark') {
        P2.moveTo(0, -9); P2.lineTo(2.2, -2.2); P2.lineTo(9, 0); P2.lineTo(2.2, 2.2);
        P2.lineTo(0, 9); P2.lineTo(-2.2, 2.2); P2.lineTo(-9, 0); P2.lineTo(-2.2, -2.2); P2.closePath();
        ctx.fill(P2);
      } else if (name === 'check') {
        ctx.lineWidth = 3.2;
        P2.moveTo(-7, 0); P2.lineTo(-2, 5); P2.lineTo(8, -6); ctx.stroke(P2);
      } else if (name === 'dice') {
        const b = new Path2D(); b.roundRect ? b.roundRect(-9, -9, 18, 18, 4.5) : b.rect(-9, -9, 18, 18);
        ctx.stroke(b);
        for (const p of [[-4, -4], [0, 0], [4, 4]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, TAU); ctx.fill(); }
      } else if (name === 'crown') {
        P2.moveTo(-9, 6); P2.lineTo(-10, -5); P2.lineTo(-4.5, 0); P2.lineTo(0, -8); P2.lineTo(4.5, 0);
        P2.lineTo(10, -5); P2.lineTo(9, 6); P2.closePath();
        ctx.fill(P2);
      } else if (name === 'users') {
        ctx.beginPath(); ctx.arc(-3.5, -3.5, 4.2, 0, TAU); ctx.fill();
        const b = new Path2D(); b.moveTo(-11, 9); b.quadraticCurveTo(-11, 1.5, -3.5, 1.5); b.quadraticCurveTo(4, 1.5, 4, 9); b.closePath();
        ctx.fill(b);
        ctx.globalAlpha *= .72;
        ctx.beginPath(); ctx.arc(6.5, -5, 3.3, 0, TAU); ctx.fill();
        const b2 = new Path2D(); b2.moveTo(5.6, 7); b2.quadraticCurveTo(6, .6, 8.6, .2); b2.quadraticCurveTo(12.4, .8, 12.4, 7); b2.closePath();
        ctx.fill(b2);
      } else if (name === 'lock') {
        const b = new Path2D(); b.roundRect ? b.roundRect(-8, -2, 16, 12, 3) : b.rect(-8, -2, 16, 12);
        ctx.fill(b);
        const s2 = new Path2D(); s2.moveTo(-5, -2); s2.lineTo(-5, -5); s2.arc(0, -5, 5, Math.PI, 0); s2.lineTo(5, -2);
        ctx.lineWidth = 2.4; ctx.stroke(s2);
      }
      ctx.restore();
    }

    /* ============================================================ drawing kit */
    function rrect(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function txt(ctx, x, y, s, size, col, align, weight) {
      ctx.font = (weight || 600) + ' ' + size + 'px ' + FONT;
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = col; ctx.fillText(s, x, y);
    }
    /* small capitals, tracked out — every label in the chrome */
    function caps(ctx, x, y, s, size, col, align, weight, track) {
      if (HAS_LS) ctx.letterSpacing = ((track == null ? .14 : track) * size).toFixed(2) + 'px';
      txt(ctx, x, y, s, size, col, align, weight || 700);
      if (HAS_LS) ctx.letterSpacing = '0px';
    }
    /* one line of caps in several colours, centred as a whole */
    function capsRich(ctx, cx, y, segs, size, track) {
      ctx.font = '700 ' + size + 'px ' + FONT;
      if (HAS_LS) ctx.letterSpacing = ((track == null ? .14 : track) * size).toFixed(2) + 'px';
      let w = 0;
      for (const s of segs) w += ctx.measureText(s[0]).width;
      let x = cx - w / 2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const s of segs) { ctx.fillStyle = s[1]; ctx.fillText(s[0], x, y); x += ctx.measureText(s[0]).width; }
      if (HAS_LS) ctx.letterSpacing = '0px';
    }
    /* the display voice: heavy condensed italic, with an optional glow */
    function dfont(size, o) { return ((o && o.upright) ? '' : 'italic ') + ((o && o.weight) || 800) + ' ' + size + 'px ' + COND; }
    function disp(ctx, x, y, s, size, col, align, o) {
      o = o || NOANIM;
      ctx.font = dfont(size, o);
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
      if (HAS_LS) ctx.letterSpacing = ((o.track || 0) * size).toFixed(2) + 'px';
      if (o.glow) {
        ctx.save(); ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || size * .5;
        ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
      }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || size * .14; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y);
      if (HAS_LS) ctx.letterSpacing = '0px';
    }
    function dispW(ctx, s, size, o) {
      ctx.font = dfont(size, o);
      if (HAS_LS) ctx.letterSpacing = (((o && o.track) || 0) * size).toFixed(2) + 'px';
      const w = ctx.measureText(s).width;
      if (HAS_LS) ctx.letterSpacing = '0px';
      return w;
    }
    function clipW(ctx, s, maxW, size, weight) {
      ctx.font = (weight || 700) + ' ' + size + 'px ' + FONT;
      if (ctx.measureText(s).width <= maxW) return s;
      let n = s.length;
      while (n > 1 && ctx.measureText(s.slice(0, n) + '…').width > maxW) n--;
      return s.slice(0, n) + '…';
    }
    function ga(ctx, a) { ctx.globalAlpha = FADE * a; }
    function luma(hx) { const c = hexRGB(hx); return (c[0] * .299 + c[1] * .587 + c[2] * .114) / 255; }
    function hovering(x, y, w, h) {
      const p = api.input.pointer;
      return p.inside && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    }
    function hitAt(x, y) {
      for (let i = hitRects.length - 1; i >= 0; i--) {
        const r = hitRects[i];
        if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
        /* the hue ring's box also covers the square inside it, so the ring
           only claims a hit within the band itself */
        if (r.ring) { const d = Math.hypot(x - WHEEL.x, y - WHEEL.y); if (d > WHEEL.r + 3 || d < WHEEL.r * .68) continue; }
        return r;
      }
      return null;
    }

    /* ---- motion ----
       Everything that moves eases on the render clock, once per frame, by
       name. A spring overshoots a little and settles (things that travel or
       get pushed); a glide just closes the gap (colours, hovers, fades). */
    function spring(key, target, stiff, damp) {
      let s = AN[key];
      if (!s) s = AN[key] = { x: target, v: 0 };
      let t = rdt;
      while (t > 1e-6) {
        const h = Math.min(t, 1 / 240);
        s.v += ((target - s.x) * stiff - s.v * damp) * h;
        s.x += s.v * h; t -= h;
      }
      return s.x;
    }
    function glide(key, target, rate) {
      let s = AN[key];
      if (!s) s = AN[key] = { x: target, v: 0 };
      s.x += (target - s.x) * (1 - Math.exp(-rate * rdt));
      if (Math.abs(target - s.x) < 1e-3) s.x = target;
      return s.x;
    }
    function kick(key, v) { const s = AN[key] || (AN[key] = { x: 0, v: 0 }); s.v += v; }
    /* a jump that rises and lands over half a second */
    function hopK(id) {
      const t0 = hopAt[id];
      if (t0 == null) return 0;
      const k = (rt - t0) / .55;
      return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI);
    }
    function burst(x, y, n, cols, spd) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (.55 + Math.random() * .6);
        parts.push({
          x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50,
          t: 0, life: .55 + Math.random() * .4, r: 3 + Math.random() * 3.5,
          rot: Math.random() * 3, vr: (Math.random() - .5) * 9, col: cols[(Math.random() * cols.length) | 0]
        });
      }
      if (parts.length > 180) parts.splice(0, parts.length - 180);
    }
    function drawParts(ctx) {
      const damp = Math.exp(-2.6 * rdt);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += rdt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.vx *= damp; p.vy = p.vy * damp + 190 * rdt;
        p.x += p.vx * rdt; p.y += p.vy * rdt; p.rot += p.vr * rdt;
        const k = p.t / p.life, r = p.r * (1 - k * .45);
        ga(ctx, 1 - k * k);
        ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        starPath(ctx, 0, 0, r, r * .38, 4); ctx.fill();
        ctx.restore();
      }
      ga(ctx, 1);
    }

    /* a frosted card: soft drop shadow, a gradient body, a hairline edge and
       a lit top rim */
    function card(ctx, x, y, w, h, r, fill) {
      ctx.fillStyle = 'rgba(5,2,16,.36)'; rrect(ctx, x + 1, y + 5, w, h, r); ctx.fill();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, fill ? fill[0] : 'rgba(42,32,90,.74)'); g.addColorStop(1, fill ? fill[1] : 'rgba(22,16,52,.82)');
      ctx.fillStyle = g; rrect(ctx, x, y, w, h, r); ctx.fill();
      ctx.save(); ctx.clip();
      const hl = ctx.createLinearGradient(0, y, 0, y + 16);
      hl.addColorStop(0, 'rgba(255,255,255,.08)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; ctx.fillRect(x, y, w, 16);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1; rrect(ctx, x + .5, y + .5, w - 1, h - 1, r); ctx.stroke();
    }
    function clockRing(ctx, x, y, r, frac, secs, warn) {
      const pulse = warn ? 1 + Math.max(0, Math.sin((1 - (timer % 1)) * Math.PI)) * .08 : 1;
      ctx.save();
      ctx.translate(x, y); ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(12,8,30,.92)'; dotF(ctx, 0, 0, r + 5);
      ctx.lineWidth = Math.max(3, r * .2); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      const f = clamp(frac, 0, 1);
      if (f > 0) {
        ctx.strokeStyle = warn ? UI.bad : f < .34 ? UI.warm : UI.acc;
        ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
      }
      disp(ctx, -1, 1, String(secs), Math.round(r * 1.02), warn ? '#fecaca' : '#ffffff', 'center');
      ctx.restore();
    }
    function badge(ctx, x, y, name, col) {
      ctx.fillStyle = '#17112e'; dotF(ctx, x, y, 9);
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke();
      icon(ctx, name, x, y, 11, col);
    }
    /* centred text trailed by three bouncing dots */
    function txtDots(ctx, cx, y, s, size, col, weight, t) {
      ctx.font = (weight || 600) + ' ' + size + 'px ' + FONT;
      const w = ctx.measureText(s).width, x = cx - (w + size * .9) / 2;
      txt(ctx, x, y, s, size, col, 'left', weight);
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) dotF(ctx, x + w + size * .18 + i * size * .3, y + size * .28 - Math.max(0, Math.sin(t * 6 - i * .7)) * size * .2, size * .08);
    }
    /* The title's letters are drawn once each into a small image at the
       screen's own resolution, then placed at fractional positions every
       frame. Text snaps to whole pixels, so a letter bobbing a pixel and a
       half stepped between two or three spots instead of gliding: that was
       the choppiness. An image placed between pixels is filtered rather than
       snapped, so it glides; and with a little more travel, a tilt and a
       squash as it rises, the wave reads as one wave running along the word.
       Re-rendered only when the size, the screen scale or the font changes.
       Its cache is declared up with the other state: this function sits
       after mount's return, where a `let` would never be initialised. */
    function logoGlyphs(size) {
      const sc = Math.max(1, Stage.scale * Stage.dpr), font = dfont(size);
      let ready = true;
      try { ready = document.fonts.check(font); } catch (e) {}
      const key = size + '|' + sc.toFixed(3) + '|' + (ready ? 1 : 0);
      if (logoCache && logoCache.key === key) return logoCache;
      const word = 'Skribbl', cols = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];
      const m = document.createElement('canvas').getContext('2d');
      m.font = font;
      const pad = Math.ceil(size * .24), hh = Math.ceil(size * 1.5), out = [];
      for (let i = 0; i < word.length; i++) {
        const ch = word[i], w = m.measureText(ch).width, cw = w + pad * 2;
        const c = document.createElement('canvas');
        c.width = Math.ceil(cw * sc); c.height = Math.ceil(hh * sc);
        const g = c.getContext('2d');
        g.scale(c.width / cw, c.height / hh);
        g.font = font; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round';
        g.lineWidth = size * .22; g.strokeStyle = '#120b28'; g.strokeText(ch, pad, hh / 2);
        g.fillStyle = cols[i]; g.fillText(ch, pad, hh / 2);
        out.push({ c, w, cw, hh, pad });
      }
      return (logoCache = { key, out });
    }
    function logo(ctx, x, y, size) {
      const G = logoGlyphs(size);
      let cx = x;
      for (let i = 0; i < G.out.length; i++) {
        const L = G.out[i], ph = rt * 2.4 - i * .72;
        const bob = Math.sin(ph) * size * .081, tilt = Math.sin(ph - .9) * .05, st = 1 + Math.sin(ph) * .035;
        ctx.save();
        ctx.translate(cx + L.w / 2, y + bob);
        ctx.rotate(tilt); ctx.scale(1 / st, st);
        ctx.drawImage(L.c, -L.w / 2 - L.pad, -L.hh / 2, L.cw, L.hh);
        ctx.restore();
        cx += L.w + size * .015;
      }
      icon(ctx, 'pencil', cx + size * .4, y - size * .06 + Math.sin(rt * 2.4 - G.out.length * .72) * size * .081, size * .62, '#fde68a');
    }

    /* ---------------------------------------------------- backdrop -----
       The base gradient and the vignette never change, so they are painted
       once (at modest resolution — they are nothing but soft gradients) and
       the moving layers go between them each frame. */
    function pool(ctx, x, y, r, rgb, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    function bgLayers() {
      const s = Math.min(1.25, Stage.scale * Stage.dpr), key = s.toFixed(3);
      if (bgCache.key === key && bgCache.base) return bgCache;
      const mk = () => {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s));
        const g = c.getContext('2d'); g.scale(c.width / W, c.height / H);
        return [c, g];
      };
      const [b, bg] = mk();
      const lg = bg.createLinearGradient(0, 0, W * .35, H);
      lg.addColorStop(0, '#1e1647'); lg.addColorStop(.5, '#151038'); lg.addColorStop(1, '#0c0923');
      bg.fillStyle = lg; bg.fillRect(0, 0, W, H);
      pool(bg, 150, 110, 400, '139,92,246', .22);
      pool(bg, 840, 520, 440, '14,165,233', .15);
      pool(bg, 820, 70, 300, '236,72,153', .12);
      const [v, vg] = mk();
      const vv = vg.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, W * .72);
      vv.addColorStop(0, 'rgba(4,2,12,0)'); vv.addColorStop(1, 'rgba(4,2,12,.55)');
      vg.fillStyle = vv; vg.fillRect(0, 0, W, H);
      bgCache.key = key; bgCache.base = b; bgCache.veil = v;
      return bgCache;
    }
    function drawBackdrop(ctx, t) {
      const L = bgLayers();
      ctx.drawImage(L.base, 0, 0, W, H);
      doodleWall(ctx, t);
      ribbons(ctx, t);
      pens(ctx, t);
      ctx.drawImage(L.veil, 0, 0, W, H);
    }
    function doodleWall(ctx, t) {
      const C = 132, sx = t * 7, sy = t * 4.5;
      const ox = sx % C, oy = sy % C, bx = Math.floor(sx / C), by = Math.floor(sy / C);
      const base = ctx.getTransform();
      ctx.save();
      ctx.strokeStyle = '#c4b5fd'; ctx.globalAlpha = .075; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let gy = -1; gy <= Math.ceil(H / C); gy++) {
        for (let gx = -1; gx <= Math.ceil(W / C); gx++) {
          const cx = gx - bx, cy = gy - by;
          const h = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
          const x = gx * C + ox + ((cy & 1) ? C / 2 : 0) + (h % 29) - 14;
          const y = gy * C + oy + ((h >>> 5) % 29) - 14;
          ctx.setTransform(base); ctx.translate(x, y); ctx.rotate(((h >>> 11) % 360) * Math.PI / 180 + Math.sin(t * .4 + (h % 7)) * .15);
          ctx.stroke(DOODLES[(h >>> 3) % DOODLES.length]);
        }
      }
      ctx.setTransform(base);
      ctx.restore();
    }
    function ribbons(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const r of BG_RIB) {
        const p = new Path2D();
        for (let x = -40; x <= W + 40; x += 16) {
          const y = r.y + Math.sin(x * r.k1 + t * r.s1 + r.ph) * r.a1 + Math.sin(x * r.k2 - t * r.s2 + r.ph * 1.7) * r.a2
                  + Math.sin(t * .12 + r.ph) * r.drift;
          if (x === -40) p.moveTo(x, y); else p.lineTo(x, y);
        }
        ctx.strokeStyle = r.col;
        ctx.globalAlpha = .07; ctx.lineWidth = r.w * 9; ctx.stroke(p);
        ctx.globalAlpha = .26; ctx.lineWidth = r.w; ctx.stroke(p);
      }
      ctx.restore();
    }
    function penAt(o, t) {
      t *= o.s;
      return [W / 2 + Math.sin(t * .11 + o.p) * 500 + Math.sin(t * .83 + o.q) * 54 + Math.cos(t * 2.3 + o.p) * 12,
              H / 2 + Math.sin(t * .16 + o.q) * 300 + Math.cos(t * 1.07 + o.p) * 44 + Math.sin(t * 2.9 + o.q) * 10];
    }
    function pens(ctx, t) {
      ctx.save(); ctx.lineCap = 'butt'; ctx.globalCompositeOperation = 'lighter';
      const N = 30, SPAN = 2.6;
      for (const o of BG_PEN) {
        ctx.strokeStyle = o.c; ctx.fillStyle = o.c;
        let a = penAt(o, t - SPAN);
        for (let i = 1; i <= N; i++) {
          const b = penAt(o, t - SPAN + SPAN * i / N), k = i / N;
          ctx.globalAlpha = k * k * .45; ctx.lineWidth = .8 + k * 2.4;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          a = b;
        }
        ctx.globalAlpha = .55; dotF(ctx, a[0], a[1], 3);
        ctx.globalAlpha = .12; dotF(ctx, a[0], a[1], 11);
      }
      ctx.restore();
    }

    /* ============================================================ render = */
    function renderAll(ctx) {
      const now = nowS();
      rdt = rtLast ? Math.min(.1, Math.max(0, now - rtLast)) : 0; rtLast = now; rt = now;
      hitRects = [];
      ctx.save();
      drawBackdrop(ctx, now);
      if (phase === 'menu') { lobbyAt = -1; drawMenu(ctx, now); }
      else if (phase === 'avatar' || phase === 'go') { menuAt = -1; drawLobby(ctx, now); }
      else { lobbyAt = -1; menuAt = -1; drawGame(ctx, now); }
      drawParts(ctx);
      ctx.restore();
      setCursor();
      placeGuess();
    }
    function setCursor() {
      const pt = api.input.pointer;
      let c = '';
      if (pt.inside) {
        const h = hitAt(pt.x, pt.y);
        if (h && h.t !== 'wheelbg') c = 'pointer';
        else if (!h && canUseTools() && !wheelOpen && inBoard(pt.x, pt.y)) c = 'crosshair';
      }
      if (c !== cursorWas) { cursorWas = c; cvEl.style.cursor = c; }
    }

    /* ------------------------------------------------------------ lobby */
    /* the option grid, each one shown on you — drawn only when it changes */
    function thumbsFor(me, cw, ch) {
      const s = Math.min(3, Stage.scale * Stage.dpr), n = AV_N[avTab];
      const key = avTab + '|' + me.join(',') + '|' + s.toFixed(3) + '|' + cw.toFixed(1) + 'x' + ch.toFixed(1);
      if (thumbs.key === key) return thumbs.list;
      thumbs.key = key;
      const pw = Math.ceil(cw * s), ph = Math.ceil(ch * s);
      thumbs.list = [];
      for (let i = 0; i < n; i++) {
        let c = thumbs.pool[i];
        if (!c) c = thumbs.pool[i] = document.createElement('canvas');
        if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
        const g = c.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph);
        g.setTransform(pw / cw, 0, 0, ph / ch, 0, 0);
        g.save();
        rrect(g, 0, 0, cw, ch, 12); g.clip();
        if (avTab === 0 || avTab === 4) {
          const col = avTab === 0 ? AV_BODY[i] : AV_TINT[i];
          const gr = g.createRadialGradient(cw / 2 - 5, ch / 2 - 6, 2, cw / 2, ch / 2, 19);
          gr.addColorStop(0, mixHex(col, '#ffffff', .35)); gr.addColorStop(1, col);
          g.fillStyle = gr; dotF(g, cw / 2, ch / 2, 17);
          g.strokeStyle = OUTL; g.lineWidth = 2.6; g.beginPath(); g.arc(cw / 2, ch / 2, 17, 0, TAU); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cw / 2 - 6, ch / 2 - 7, 5, 3, -.6, 0, TAU); g.fill();
        } else {
          const a = me.slice(); a[avTab] = i;
          /* the face categories are shown close up; hats need headroom */
          const sz = avTab === 3 ? 52 : avTab === 5 ? 66 : 92;
          const dy = avTab === 1 ? 5 : avTab === 2 ? -10 : avTab === 3 ? 12 : 6;
          buddy(g, a, cw / 2, ch / 2 + dy, sz, NOANIM);
        }
        g.restore();
        thumbs.list.push(c);
      }
      return thumbs.list;
    }
    function drawLobby(ctx, t) {
      if (lobbyAt < 0) lobbyAt = rt;
      const inK = easeOut(clamp((rt - lobbyAt) / .7, 0, 1));
      FADE = inK; ctx.globalAlpha = inK;
      const me = specOf(MYID), open = phase === 'avatar' && !myReady, pt = api.input.pointer;

      /* header */
      ctx.save(); ctx.translate(0, -(1 - inK) * 18);
      logo(ctx, 30, 42, 32);
      disp(ctx, W / 2, 33, 'Pick your look', 34, '#ffffff', 'center', { glow: 'rgba(167,139,250,.6)', blur: 20 });
      capsRich(ctx, W / 2, 63, lookOnly ? [['YOUR LOOK FOLLOWS YOU INTO ', UI.ink3], ['EVERY GAME', UI.good]]
                             : SOLO ? [['READY UP ', UI.ink3], ['WHENEVER YOU LIKE', UI.good]]
                                     : [['THE GAME STARTS WHEN ', UI.ink3], ['EVERYONE', UI.good], [' IS READY', UI.ink3]], 9.5);
      if (phase === 'avatar' && !lookOnly) {
        const secs = Math.max(0, Math.ceil(timer));
        clockRing(ctx, W - 56, 44, 22, timer / LOBBYT, secs, secs <= 5);
      }
      ctx.restore();

      /* ---- the editor ---- */
      ctx.save(); ctx.translate(-(1 - inK) * 40, 0);
      card(ctx, LOB.ex, LOB.ey, LOB.ew, LOB.eh, 18);
      const spot = ctx.createRadialGradient(PV.x, PV.y - 10, 10, PV.x, PV.y - 10, 130);
      spot.addColorStop(0, 'rgba(167,139,250,.30)'); spot.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.fillStyle = spot; ctx.fillRect(PV.x - 130, PV.y - 140, 260, 260);
      const ped = ctx.createLinearGradient(0, PV.y + 72, 0, PV.y + 100);
      ped.addColorStop(0, 'rgba(196,181,253,.34)'); ped.addColorStop(1, 'rgba(76,52,160,.10)');
      ctx.fillStyle = ped; ctx.beginPath(); ctx.ellipse(PV.x, PV.y + 84, 76, 15, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(221,214,254,.35)'; ctx.lineWidth = 1.5; ctx.stroke();

      /* you: bobbing, eyes on the pointer, jelly when you change something */
      const jel = spring('jelly', 0, 380, 12), tilt = spring('tilt', 0, 200, 9), hk = hopK(MYID);
      const lx = glide('lx', pt.inside ? clamp((pt.x - PV.x) / 240, -1, 1) : 0, 9);
      const ly = glide('ly', pt.inside ? clamp((pt.y - PV.y) / 240, -1, 1) : 0, 9);
      ctx.fillStyle = 'rgba(8,4,24,' + (.34 - hk * .14).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(PV.x, PV.y + 80, 52 - hk * 12 + jel * 22, 9, 0, 0, TAU); ctx.fill();
      buddy(ctx, me, PV.x, PV.y + Math.sin(t * 2.2) * 3 - hk * 22, PV.size, {
        lx: lx, ly: ly, blink: blinkOf(MYID, t),
        sq: clamp(jel * .3, -.14, .14) - hk * .06, rot: clamp(tilt * .35, -.2, .2)
      });
      disp(ctx, PV.x, 370, clipW(ctx, nameOf(MYID), 190, 22, 800), 24, '#ffffff', 'center');
      const rdk = glide('mereadylabel', myReady ? 1 : 0, 10);
      caps(ctx, PV.x, 393, myReady ? 'LOCKED IN' : 'THIS IS YOU', 9, mixHex('#8a82b8', '#4ade80', rdk), 'center', 700, .22);

      /* shuffle */
      const sb = { x: PV.x - 64, y: 414, w: 128, h: 36 };
      const sh = glide('sbh', open && hovering(sb.x, sb.y, sb.w, sb.h) ? 1 : 0, 16), sp = spring('sbp', 0, 520, 24);
      ga(ctx, open ? 1 : .45);
      ctx.save(); ctx.translate(sb.x + sb.w / 2, sb.y + sb.h / 2 - sh * 1.5); ctx.scale(1 + sp * .25, 1 + sp * .25);
      ctx.fillStyle = 'rgba(255,255,255,' + (.08 + sh * .08).toFixed(3) + ')'; rrect(ctx, -sb.w / 2, -sb.h / 2, sb.w, sb.h, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (.16 + sh * .2).toFixed(3) + ')'; ctx.lineWidth = 1; rrect(ctx, -sb.w / 2 + .5, -sb.h / 2 + .5, sb.w - 1, sb.h - 1, 18); ctx.stroke();
      ctx.save(); ctx.translate(-38, 0); ctx.rotate(sh * .35 + sp * 1.2); icon(ctx, 'dice', 0, 0, 16, UI.ink); ctx.restore();
      txt(ctx, -20, .5, 'Shuffle', 13.5, UI.ink, 'left', 700);
      ctx.restore();
      ga(ctx, 1);
      if (open) hitRects.push({ t: 'shuffle', x: sb.x, y: sb.y, w: sb.w, h: sb.h });

      /* category tabs, with the active pill sliding between them */
      const tw = (TABS.w - TABS.gap * 2) / 3;
      const tabX = i => TABS.x + (i % 3) * (tw + TABS.gap), tabY = i => TABS.y + ((i / 3) | 0) * (TABS.th + TABS.gap);
      AV_CATS.forEach((c, i) => {
        const x = tabX(i), y = tabY(i), hv = glide('th' + i, open && avTab !== i && hovering(x, y, tw, TABS.th) ? 1 : 0, 16);
        ctx.fillStyle = 'rgba(255,255,255,' + (.05 + hv * .07).toFixed(3) + ')';
        rrect(ctx, x, y, tw, TABS.th, 15); ctx.fill();
      });
      const px = spring('tabx', tabX(avTab), 380, 30), py = spring('taby', tabY(avTab), 380, 30);
      ctx.fillStyle = 'rgba(167,139,250,.36)'; rrect(ctx, px, py, tw, TABS.th, 15); ctx.fill();
      ctx.strokeStyle = 'rgba(221,214,254,.8)'; ctx.lineWidth = 1.5; rrect(ctx, px + .75, py + .75, tw - 1.5, TABS.th - 1.5, 15); ctx.stroke();
      AV_CATS.forEach((c, i) => {
        const x = tabX(i), y = tabY(i), on = glide('tl' + i, avTab === i ? 1 : 0, 14);
        txt(ctx, x + tw / 2, y + TABS.th / 2 + .5, c.label, 12.5, mixHex('#bdb5e2', '#ffffff', on), 'center', 700);
        if (open) hitRects.push({ t: 'tab', i: i, x: x, y: y, w: tw, h: TABS.th });
      });

      /* the options, each shown on you: they cascade in when the category
         changes, lift under the pointer, dip when pressed, and the selection
         glides from one to the next */
      const n = AV_N[avTab], cols = 4;
      const cw = (GRID.w - GRID.gap * (cols - 1)) / cols, ch = (GRID.h - GRID.gap * 3) / 4;
      const cellX = i => GRID.x + (i % cols) * (cw + GRID.gap), cellY = i => GRID.y + ((i / cols) | 0) * (ch + GRID.gap);
      const list = thumbsFor(me, cw, ch);
      const sel = me[avTab];
      const sk = avTab + ':' + sel;
      if (sk !== lastSel) { lastSel = sk; selAt = rt; }
      const cell = [];
      for (let i = 0; i < n; i++) {
        const x = cellX(i), y = cellY(i);
        const k = clamp((rt - tabAt - i * .016) / .24 + .15, 0, 1);
        const hv = glide('ch' + i, open && hovering(x, y, cw, ch) ? 1 : 0, 18);
        const pr = spring('cp' + i, 0, 520, 24);
        cell.push({ x: x, y: y, k: k, hv: hv, pr: pr });
        ga(ctx, k);
        ctx.fillStyle = 'rgba(255,255,255,' + (.045 + hv * .07).toFixed(3) + ')';
        rrect(ctx, x, y, cw, ch, 12); ctx.fill();
        if (open) hitRects.push({ t: 'opt', i: i, x: x, y: y, w: cw, h: ch });
      }
      const sx = spring('selx', cellX(sel), 420, 32), sy = spring('sely', cellY(sel), 420, 32);
      ga(ctx, 1);
      ctx.fillStyle = 'rgba(167,139,250,.30)'; rrect(ctx, sx, sy, cw, ch, 12); ctx.fill();
      for (let i = 0; i < n; i++) {
        const c = cell[i];
        if (c.k <= 0) continue;
        const sc = (.72 + .28 * backOut(c.k)) * (1 + c.hv * .05 + c.pr * .2);
        ga(ctx, c.k);
        ctx.save(); ctx.translate(c.x + cw / 2, c.y + ch / 2 - c.hv * 1.5); ctx.scale(sc, sc);
        ctx.drawImage(list[i], -cw / 2, -ch / 2, cw, ch);
        ctx.restore();
      }
      ga(ctx, 1);
      ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; rrect(ctx, sx + 1, sy + 1, cw - 2, ch - 2, 11); ctx.stroke();
      const bk = backOut(clamp((rt - selAt) / .35, 0, 1));
      ctx.save(); ctx.translate(sx + cw - 10, sy + 10); ctx.scale(bk, bk);
      ctx.fillStyle = UI.good; dotF(ctx, 0, 0, 7.5); icon(ctx, 'check', 0, 0, 10, '#06240f');
      ctx.restore();

      /* ready: the options grey out behind a lock you can click to undo it */
      const lk = glide('lock', myReady && phase === 'avatar' ? 1 : 0, 11);
      if (lk > .01) {
        ga(ctx, lk);
        ctx.fillStyle = 'rgba(14,9,32,.6)'; rrect(ctx, TABS.x - 8, TABS.y - 8, TABS.w + 16, GRID.y + GRID.h - TABS.y + 16, 14); ctx.fill();
        const mx = TABS.x + TABS.w / 2, my = (TABS.y + GRID.y + GRID.h) / 2, ls = .7 + .3 * backOut(lk);
        ctx.save(); ctx.translate(mx, my - 22); ctx.scale(ls, ls);
        ctx.fillStyle = 'rgba(74,222,128,.16)'; dotF(ctx, 0, 0, 27);
        icon(ctx, 'lock', 0, 0, 26, UI.good);
        ctx.restore();
        disp(ctx, mx, my + 20, 'Locked in!', 24, '#ffffff', 'center');
        txt(ctx, mx, my + 44, 'Click here to change something', 12, UI.ink2, 'center', 600);
        ga(ctx, 1);
      }
      if (myReady && phase === 'avatar') {
        hitRects.push({ t: 'unlock', x: LOB.ex + 8, y: LOB.ey + 8, w: LOB.ew - 16, h: READY_BTN.y - 22 - LOB.ey });
      }

      /* the big button: colours glide from "go on" to "done", the labels swap
         with a little slide, and it squishes when pressed */
      const rb = READY_BTN, rdy = glide('rdy', myReady ? 1 : 0, 9);
      const rh = glide('rbh', phase === 'avatar' && hovering(rb.x, rb.y, rb.w, rb.h) ? 1 : 0, 16);
      const rp = spring('rbp', 0, 520, 22);
      const urgent = phase === 'avatar' && !myReady && !lookOnly && timer <= 6;
      const glow = urgent ? .5 + Math.sin(t * 8) * .5 : 0;
      ctx.save();
      ctx.translate(rb.x + rb.w / 2, rb.y + rb.h / 2 - rh * 2);
      ctx.scale(1 + rp * .12, 1 + rp * .2);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(ctx, -rb.w / 2 + 1, -rb.h / 2 + 5 + rh * 2, rb.w, rb.h, 16); ctx.fill();
      const bg = ctx.createLinearGradient(-rb.w / 2, 0, rb.w / 2, 0);
      bg.addColorStop(0, mixHex('#7c3aed', '#16a34a', rdy)); bg.addColorStop(1, mixHex('#db2777', '#22c55e', rdy));
      ctx.fillStyle = bg; rrect(ctx, -rb.w / 2, -rb.h / 2, rb.w, rb.h, 16); ctx.fill();
      const sheen = ctx.createLinearGradient(0, -rb.h / 2, 0, rb.h / 2);
      sheen.addColorStop(0, 'rgba(255,255,255,' + (.18 + rh * .08).toFixed(3) + ')'); sheen.addColorStop(.55, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen; rrect(ctx, -rb.w / 2, -rb.h / 2, rb.w, rb.h, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(.85, .25 + rh * .35 + glow * .45).toFixed(3) + ')'; ctx.lineWidth = 1.2 + rh + (urgent ? 1 : 0);
      rrect(ctx, -rb.w / 2 + .5, -rb.h / 2 + .5, rb.w - 1, rb.h - 1, 16); ctx.stroke();
      ctx.save(); rrect(ctx, -rb.w / 2, -rb.h / 2, rb.w, rb.h, 16); ctx.clip();
      ga(ctx, 1 - rdy);
      disp(ctx, 0, -5 - rdy * 14, lookOnly ? 'DONE' : 'I’M READY', 27, '#ffffff', 'center', { track: .02 });
      caps(ctx, 0, 15 - rdy * 14, 'OR PRESS SPACE', 8.5, 'rgba(255,255,255,.78)', 'center', 700, .2);
      ga(ctx, rdy);
      icon(ctx, 'check', -64, -5 + (1 - rdy) * 14, 22, '#ffffff');
      disp(ctx, 10, -5 + (1 - rdy) * 14, 'READY!', 27, '#ffffff', 'center', { track: .02 });
      caps(ctx, 10, 15 + (1 - rdy) * 14, SOLO ? 'HERE WE GO' : 'WAITING ON THE OTHERS · CLICK TO CHANGE', 8.5, 'rgba(255,255,255,.85)', 'center', 700, .16);
      ga(ctx, 1);
      ctx.restore();
      ctx.restore();
      if (phase === 'avatar') hitRects.push({ t: 'ready', x: rb.x, y: rb.y, w: rb.w, h: rb.h });
      ctx.restore();

      ctx.save(); ctx.translate((1 - inK) * 40, 0);
      drawLobbyPlayers(ctx, t);
      ctx.restore();

      /* the clock, as a bar along the foot, and the keys */
      const fr = phase === 'avatar' && !lookOnly ? clamp(timer / LOBBYT, 0, 1) : 0;
      const bw = LOB.px + LOB.pw - LOB.ex;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; rrect(ctx, LOB.ex, 570, bw, 5, 2.5); ctx.fill();
      if (fr > 0) {
        ctx.fillStyle = timer <= 5 ? UI.bad : UI.acc;
        rrect(ctx, LOB.ex, 570, bw * fr, 5, 2.5); ctx.fill();
      }
      caps(ctx, W / 2, 588, lookOnly ? '←  →  BROWSE     ↑  ↓  CATEGORY     R  SHUFFLE     SPACE  DONE     ESC  BACK'
                                     : '←  →  BROWSE     ↑  ↓  CATEGORY     R  SHUFFLE     SPACE  READY', 8.5, UI.dim, 'center', 700, .16);
      FADE = 1; ctx.globalAlpha = 1;

      if (phase === 'go') drawGo(ctx, t);
    }
    function drawLobbyPlayers(ctx, t) {
      const x = LOB.px, y = LOB.ey, w = LOB.pw, h = LOB.eh;
      card(ctx, x, y, w, h, 18);
      caps(ctx, x + 18, y + 24, 'PLAYERS', 10, UI.acc, 'left', 700, .2);
      const here = ROSTER.filter(p => present(p.id));
      const nReady = here.filter(p => readyOf(p.id)).length;
      const all = nReady === here.length;
      const label = nReady + ' / ' + here.length + ' READY';
      ctx.font = '700 9px ' + FONT;
      const lw = ctx.measureText(label).width + 26;
      const ak = glide('allrdy', all ? 1 : 0, 10);
      ctx.fillStyle = 'rgba(' + (ak ? '74,222,128,' + (.07 + ak * .11).toFixed(3) : '255,255,255,.07') + ')';
      rrect(ctx, x + w - 16 - lw, y + 14, lw, 20, 10); ctx.fill();
      caps(ctx, x + w - 16 - lw / 2, y + 24.5, label, 9, mixHex('#bdb5e2', '#4ade80', ak), 'center', 700, .12);

      const top = y + 46, rowH = Math.min(56, (h - 58) / Math.max(1, ROSTER.length));
      ROSTER.forEach((p, i) => {
        const ry = top + i * rowH, rh = rowH - 6, mine = p.id === MYID, gone = !present(p.id), rd = readyOf(p.id) || phase === 'go';
        const rk = glide('pr' + p.id, rd ? 1 : 0, 10);
        ga(ctx, gone ? .42 : 1);
        const base = mine ? [125, 211, 252, .08, .32] : [255, 255, 255, .04, .06];
        const mixA = (a, b) => (a + (b - a) * rk);
        ctx.fillStyle = 'rgba(' + Math.round(mixA(base[0], 74)) + ',' + Math.round(mixA(base[1], 222)) + ',' + Math.round(mixA(base[2], 128)) + ',' + mixA(base[3], .12).toFixed(3) + ')';
        rrect(ctx, x + 10, ry, w - 20, rh, 13); ctx.fill();
        ctx.strokeStyle = 'rgba(' + Math.round(mixA(base[0], 74)) + ',' + Math.round(mixA(base[1], 222)) + ',' + Math.round(mixA(base[2], 128)) + ',' + mixA(base[4], .45).toFixed(3) + ')';
        ctx.lineWidth = 1.2; rrect(ctx, x + 10.5, ry + .5, w - 21, rh - 1, 13); ctx.stroke();
        const hk = hopK(p.id);
        buddy(ctx, specOf(p.id), x + 40, ry + rh / 2 + 3 - hk * 10, Math.min(48, rh + 4),
              { blink: blinkOf(p.id, t), lx: -.4, sq: -hk * .05 });
        txt(ctx, x + 70, ry + rh / 2 - 7, clipW(ctx, p.name, 118, 13.5, 700), 13.5, mine ? UI.sky : '#ffffff', 'left', 700);
        const sub = gone ? 'left the game' : rd ? 'ready to draw' : mine ? 'that’s you — pick a look' : 'picking a look';
        txt(ctx, x + 70, ry + rh / 2 + 10, sub, 11, mixHex('#8a82b8', '#86efac', rk), 'left', 600);
        if (!gone) {
          const cx = x + w - 30, cy = ry + rh / 2;
          ga(ctx, (gone ? .42 : 1) * (1 - rk));
          ctx.fillStyle = 'rgba(255,255,255,.06)'; dotF(ctx, cx, cy, 11);
          ctx.fillStyle = UI.ink3;
          for (let k = 0; k < 3; k++) dotF(ctx, cx - 5 + k * 5, cy - Math.max(0, Math.sin(t * 6 - k * .8)) * 2.5, 1.5);
          if (rk > .01) {
            ga(ctx, 1);
            const s = backOut(rk);
            ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
            ctx.fillStyle = UI.good; dotF(ctx, 0, 0, 11);
            icon(ctx, 'check', 0, 0, 13, '#06240f');
            ctx.restore();
          }
        }
        ga(ctx, 1);
      });
      if (SOLO) {
        const ty = top + rowH + 18;
        caps(ctx, x + 18, ty, lookOnly ? 'SEEN BY EVERYONE' : 'PRACTICE MODE', 9.5, UI.acc, 'left', 700, .2);
        const lines = lookOnly ? ['Whoever you play with sees this —', 'on the scoreboard, beside your', 'guesses and up on the podium.']
                               : ['Just you and the paper — no timer,', 'no guessers. Party up from the hub', 'to play against friends.'];
        lines.forEach((l, i) => txt(ctx, x + 18, ty + 22 + i * 18, l, 12, UI.ink2, 'left', 600));
      }
    }
    /* ------------------------------------------------------------ menu */
    /* The front page, when Skribbl is opened from the hub: the name, your
       character, the party's settings and the ways in. Practice goes straight
       to the paper; Customize opens the look editor and comes back here; in a
       party the host starts the match for everyone from the same button.
       Rounds and draw time only matter to a party — practice has no clock —
       so they are said to be the party's, and a guest sees the host's call. */
    function logoW(size) {
      const G = logoGlyphs(size);
      let w = 0;
      for (const L of G.out) w += L.w + size * .015;
      return w + size * .4 + size * .62 * .45;
    }
    function menuSeg(ctx, key, x, y, w, h, choices, val, live) {
      const n = choices.length, gap = 6, cw = (w - gap * (n - 1)) / n;
      const idx = Math.max(0, choices.findIndex(c => c[0] === val));
      for (let i = 0; i < n; i++) {
        const cx = x + i * (cw + gap);
        const hv = glide(key + 'h' + i, live && idx !== i && hovering(cx, y, cw, h) ? 1 : 0, 16);
        ctx.fillStyle = 'rgba(255,255,255,' + (.05 + hv * .07).toFixed(3) + ')';
        rrect(ctx, cx, y, cw, h, h / 2); ctx.fill();
        if (live) hitRects.push({ t: 'm-opt', id: key, v: choices[i][0], x: cx, y: y, w: cw, h: h });
      }
      /* the choice is a pill that slides across, and squishes when it lands */
      const px = spring(key + 'x', x + idx * (cw + gap), 380, 30), pp = spring(key + 'p', 0, 520, 24);
      ctx.save(); ctx.translate(px + cw / 2, y + h / 2); ctx.scale(1 - pp * .06, 1 + pp * .1);
      ctx.fillStyle = 'rgba(167,139,250,.36)'; rrect(ctx, -cw / 2, -h / 2, cw, h, h / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(221,214,254,.8)'; ctx.lineWidth = 1.5; rrect(ctx, -cw / 2 + .75, -h / 2 + .75, cw - 1.5, h - 1.5, h / 2); ctx.stroke();
      ctx.restore();
      for (let i = 0; i < n; i++) {
        const on = glide(key + 'l' + i, idx === i ? 1 : 0, 14);
        txt(ctx, x + i * (cw + gap) + cw / 2, y + h / 2 + .5, choices[i][1], 13.5, mixHex('#bdb5e2', '#ffffff', on), 'center', 700);
      }
    }
    function menuGoBtn(ctx, b, t, label, sub, live, cols) {
      const hv = glide('mgh', live && hovering(b.x, b.y, b.w, b.h) ? 1 : 0, 16), pr = spring('mgp', 0, 520, 22);
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2 - hv * 2);
      ctx.scale(1 + pr * .1, 1 + pr * .18);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(ctx, -b.w / 2 + 1, -b.h / 2 + 5 + hv * 2, b.w, b.h, 16); ctx.fill();
      const bg = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
      bg.addColorStop(0, cols[0]); bg.addColorStop(1, cols[1]);
      ctx.fillStyle = bg; rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 16); ctx.fill();
      ctx.save(); rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 16); ctx.clip();
      const sheen = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2);
      sheen.addColorStop(0, 'rgba(255,255,255,' + (.18 + hv * .08).toFixed(3) + ')'); sheen.addColorStop(.55, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      /* a slow shine crossing it every few seconds: the way in is the thing that moves */
      if (live) {
        const sp = (t * .42) % 1.9 - .3;
        if (sp > -.25 && sp < 1.25) {
          const sx = -b.w / 2 + sp * b.w;
          ctx.save(); ctx.transform(1, 0, -.45, 1, 0, 0);
          const sg = ctx.createLinearGradient(sx - 50, 0, sx + 50, 0);
          sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.26)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg; ctx.fillRect(sx - 50, -b.h, 100, b.h * 2);
          ctx.restore();
        }
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,' + (.25 + hv * .35).toFixed(3) + ')'; ctx.lineWidth = 1.2 + hv;
      rrect(ctx, -b.w / 2 + .5, -b.h / 2 + .5, b.w - 1, b.h - 1, 16); ctx.stroke();
      disp(ctx, 0, -5, label, 26, '#ffffff', 'center', { track: .02 });
      caps(ctx, 0, 15, sub, 8.5, 'rgba(255,255,255,.8)', 'center', 700, .18);
      ctx.restore();
      if (live) hitRects.push({ t: 'm-go', x: b.x, y: b.y, w: b.w, h: b.h });
    }
    function menuGlassBtn(ctx, b, key, ic, label, sub, live) {
      const hv = glide(key + 'h', live && hovering(b.x, b.y, b.w, b.h) ? 1 : 0, 16), pr = spring(key + 'p', 0, 520, 24);
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2 - hv * 2);
      ctx.scale(1 + pr * .1, 1 + pr * .16);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; rrect(ctx, -b.w / 2 + 1, -b.h / 2 + 5 + hv * 2, b.w, b.h, 16); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (.08 + hv * .06).toFixed(3) + ')'; rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (.18 + hv * .24).toFixed(3) + ')'; ctx.lineWidth = 1.2;
      rrect(ctx, -b.w / 2 + .5, -b.h / 2 + .5, b.w - 1, b.h - 1, 16); ctx.stroke();
      ctx.fillStyle = 'rgba(125,211,252,' + (.14 + hv * .08).toFixed(3) + ')'; dotF(ctx, -b.w / 2 + 34, 0, 19);
      ctx.save(); ctx.translate(-b.w / 2 + 34, 0); ctx.rotate(hv * .14 + pr * .6); icon(ctx, ic, 0, 0, 21, UI.sky); ctx.restore();
      txt(ctx, -b.w / 2 + 64, -7, label, 15, '#ffffff', 'left', 700);
      caps(ctx, -b.w / 2 + 64, 12, sub, 8.5, UI.ink3, 'left', 700, .16);
      ctx.restore();
      if (live) hitRects.push({ t: key, x: b.x, y: b.y, w: b.w, h: b.h });
    }
    function drawMenu(ctx, t) {
      if (menuAt < 0) menuAt = rt;
      const st = (d, dur) => easeOut(clamp((rt - menuAt - d) / (dur || .6), 0, 1));
      const live = phase === 'menu' && !api.covered;
      const P = api.party, pt = api.input.pointer;
      const guest = P.inRoom && !P.isHost;

      /* the name, dropped in, and what it is */
      const lk = st(0, .5), lb = backOut(clamp((rt - menuAt) / .75, 0, 1));
      FADE = lk; ctx.globalAlpha = lk;
      const LS = 78;
      logo(ctx, W / 2 - logoW(LS) / 2, 82 - (1 - lb) * 34, LS);
      capsRich(ctx, W / 2, 138, [['DRAW IT', UI.ink2], ['   ·   ', UI.acc], ['GUESS IT', UI.ink2], ['   ·   ', UI.acc], ['WIN IT', UI.good]], 10.5, .24);

      /* your character, the same one every party sees */
      const C = MN.me, ck = st(.1);
      FADE = ck; ctx.globalAlpha = ck;
      ctx.save(); ctx.translate(-(1 - ck) * 40, 0);
      card(ctx, C.x, C.y, C.w, C.h, 18);
      caps(ctx, C.x + 18, C.y + 24, 'YOUR CHARACTER', 10, UI.acc, 'left', 700, .2);
      const cx = C.x + C.w / 2, cy = C.y + 124;
      const spot = ctx.createRadialGradient(cx, cy - 8, 8, cx, cy - 8, 118);
      spot.addColorStop(0, 'rgba(167,139,250,.30)'); spot.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.fillStyle = spot; ctx.fillRect(cx - 118, cy - 126, 236, 236);
      const ped = ctx.createLinearGradient(0, cy + 58, 0, cy + 84);
      ped.addColorStop(0, 'rgba(196,181,253,.34)'); ped.addColorStop(1, 'rgba(76,52,160,.10)');
      ctx.fillStyle = ped; ctx.beginPath(); ctx.ellipse(cx, cy + 70, 70, 13, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(221,214,254,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      const jel = spring('mjelly', 0, 380, 12), tilt = spring('mtilt', 0, 200, 9), hk = hopK(MYID);
      const lx = glide('mlx', pt.inside ? clamp((pt.x - cx) / 240, -1, 1) : 0, 9);
      const ly = glide('mly', pt.inside ? clamp((pt.y - cy) / 240, -1, 1) : 0, 9);
      ctx.fillStyle = 'rgba(8,4,24,' + (.34 - hk * .14).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(cx, cy + 66, 46 - hk * 10 + jel * 20, 8, 0, 0, TAU); ctx.fill();
      buddy(ctx, specOf(MYID), cx, cy + Math.sin(t * 2.2) * 3 - hk * 22, 148, {
        lx: lx, ly: ly, blink: blinkOf(MYID, t),
        sq: clamp(jel * .3, -.14, .14) - hk * .06, rot: clamp(tilt * .35, -.2, .2)
      });
      if (live) hitRects.push({ t: 'm-me', x: cx - 70, y: cy - 84, w: 140, h: 150 });
      disp(ctx, cx, C.y + 228, 'You', 24, '#ffffff', 'center');
      caps(ctx, cx, C.y + 250, 'WORN IN EVERY GAME YOU PLAY', 8.5, UI.ink3, 'center', 700, .18);
      /* customize: into the look editor, and back here when it is done */
      const lb2 = { x: cx - 78, y: C.y + 266, w: 156, h: 34 };
      const lh = glide('mlh', live && hovering(lb2.x, lb2.y, lb2.w, lb2.h) ? 1 : 0, 16), lp = spring('mlp', 0, 520, 24);
      ctx.save(); ctx.translate(lb2.x + lb2.w / 2, lb2.y + lb2.h / 2 - lh * 1.5); ctx.scale(1 + lp * .25, 1 + lp * .25);
      ctx.fillStyle = 'rgba(255,255,255,' + (.08 + lh * .08).toFixed(3) + ')'; rrect(ctx, -lb2.w / 2, -lb2.h / 2, lb2.w, lb2.h, 17); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (.16 + lh * .2).toFixed(3) + ')'; ctx.lineWidth = 1; rrect(ctx, -lb2.w / 2 + .5, -lb2.h / 2 + .5, lb2.w - 1, lb2.h - 1, 17); ctx.stroke();
      ctx.save(); ctx.translate(-48, 0); ctx.rotate(-lh * .35 + lp); icon(ctx, 'pencil', 0, 0, 15, UI.gold); ctx.restore();
      txt(ctx, -32, .5, 'Customize', 13.5, UI.ink, 'left', 700);
      ctx.restore();
      if (live) hitRects.push({ t: 'm-look', x: lb2.x, y: lb2.y, w: lb2.w, h: lb2.h });
      ctx.restore();

      /* the party's settings, and how a game goes */
      const S = MN.set, sk = st(.16);
      FADE = sk; ctx.globalAlpha = sk;
      ctx.save(); ctx.translate((1 - sk) * 40, 0);
      card(ctx, S.x, S.y, S.w, S.h, 18);
      caps(ctx, S.x + 18, S.y + 24, 'PARTY SETTINGS', 10, UI.acc, 'left', 700, .2);
      caps(ctx, S.x + S.w - 18, S.y + 24, !P.inRoom ? 'USED WHEN YOU HOST' : guest ? 'THE HOST DECIDES' : 'YOU’RE THE HOST', 8.5,
           guest ? UI.warm : UI.ink3, 'right', 700, .16);
      const setLive = live && !guest;
      if (guest) { FADE = sk * .45; ctx.globalAlpha = FADE; }
      txt(ctx, S.x + 18, S.y + 56, 'Rounds', 13, UI.ink2, 'left', 700);
      txt(ctx, S.x + S.w - 18, S.y + 56, 'everyone draws once a round', 11.5, UI.ink3, 'right', 600);
      menuSeg(ctx, 'rounds', S.x + 18, S.y + 68, S.w - 36, 38, MENU_ROUNDS, api.opt('rounds') || '3', setLive);
      txt(ctx, S.x + 18, S.y + 128, 'Draw time', 13, UI.ink2, 'left', 700);
      txt(ctx, S.x + S.w - 18, S.y + 128, 'for each turn at the paper', 11.5, UI.ink3, 'right', 600);
      menuSeg(ctx, 'drawtime', S.x + 18, S.y + 140, S.w - 36, 38, MENU_TIMES, api.opt('drawtime') || '75', setLive);
      FADE = sk; ctx.globalAlpha = sk;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(S.x + 18, S.y + 198, S.w - 36, 1);
      caps(ctx, S.x + 18, S.y + 218, 'HOW A GAME GOES', 9.5, UI.acc, 'left', 700, .2);
      const steps = [['Pick a word', 'three to choose from'], ['Draw it', 'no letters, no numbers'], ['Guess fast', 'quicker scores more']];
      const sw = (S.w - 36) / 3;
      steps.forEach((s, i) => {
        const x = S.x + 18 + i * sw, y = S.y + 250, bk = backOut(clamp((rt - menuAt - .45 - i * .09) / .4, 0, 1));
        ctx.save(); ctx.translate(x + 13, y); ctx.scale(bk, bk);
        ctx.fillStyle = [UI.acc, UI.acc2, UI.sky][i]; dotF(ctx, 0, 0, 12);
        disp(ctx, -.5, 1, String(i + 1), 15, '#140c2c', 'center');
        ctx.restore();
        txt(ctx, x + 32, y - 7, s[0], 13, '#ffffff', 'left', 700);
        txt(ctx, x + 32, y + 11, s[1], 11, UI.ink3, 'left', 600);
      });
      ctx.restore();

      /* the ways in */
      const bk = st(.24), bk2 = st(.3);
      FADE = bk; ctx.globalAlpha = bk;
      ctx.save(); ctx.translate(0, (1 - bk) * 24);
      const n = P.size, rounds = api.opt('rounds') || '3', dt = api.opt('drawtime') || '75';
      if (!P.inRoom) menuGoBtn(ctx, MN.go, t, 'PRACTICE', 'SPACE  ·  JUST YOU AND THE PAPER', live, ['#7c3aed', '#db2777']);
      else if (!guest) menuGoBtn(ctx, MN.go, t, 'START GAME', n + (n === 1 ? ' PLAYER' : ' PLAYERS') + '  ·  ' + rounds + ' ROUNDS  ·  ' + dt + 'S TO DRAW', live, ['#7c3aed', '#db2777']);
      else menuGoBtn(ctx, MN.go, t, 'WAITING FOR THE HOST', 'THEY START THE GAME FOR EVERYONE', false, ['#4a4370', '#3a3460']);
      ctx.restore();
      FADE = bk2; ctx.globalAlpha = bk2;
      ctx.save(); ctx.translate(0, (1 - bk2) * 24);
      menuGlassBtn(ctx, MN.fr, 'm-party', 'users', P.inRoom ? 'Party · ' + n : 'Play with friends',
                   P.inRoom ? 'INVITE MORE WITH YOUR CODE' : 'START OR JOIN A PARTY', live);
      ctx.restore();
      FADE = st(.4); ctx.globalAlpha = FADE;
      caps(ctx, W / 2, 578, (guest ? '' : 'SPACE  ' + (P.inRoom ? 'START' : 'PRACTICE') + '     ') + 'C  CUSTOMIZE     P  FRIENDS     ESC  HUB',
           8.5, UI.dim, 'center', 700, .16);
      FADE = 1; ctx.globalAlpha = 1;
    }
    function menuInput(I) {
      /* the party list can be open over the menu; what is typed there is not for us */
      if (api.covered) { while (I.takeClick()) {} return; }
      let c;
      while ((c = I.takeClick())) {
        if (c.btn !== 0 || phase !== 'menu') continue;
        const r = hitAt(c.x, c.y);
        if (!r) continue;
        if (r.t === 'm-go') { kick('mgp', -10); menuGo(); }
        else if (r.t === 'm-party') { kick('m-partyp', -10); Sound.blip(); api.openParty(); }
        else if (r.t === 'm-look') { kick('mlp', -10); openLook(); }
        else if (r.t === 'm-opt') { if (api.opt(r.id) !== r.v) { api.setOpt(r.id, r.v); kick(r.id + 'p', -7); Sound.blip(); } }
        else if (r.t === 'm-me') menuPoke();
      }
      if (phase !== 'menu') return;
      if (I.pressed('Space') || I.pressed('Enter')) { kick('mgp', -10); menuGo(); }
      else if (I.pressed('KeyC')) openLook();
      else if (I.pressed('KeyP')) { Sound.blip(); api.openParty(); }
    }
    /* Practice: off to the paper. In a party the host's press starts the
       match on every screen instead, and a guest is told the host does. */
    function menuGo() {
      if (!api.play()) return;
      phase = 'solo'; soloNewWord();
      Sound.jump();
    }
    function openLook() {
      lookOnly = true; myReady = false;
      phase = 'avatar'; lobbyAt = -1; tabAt = nowS();
      Sound.blip();
    }
    function backToMenu() {
      lookOnly = false; phase = 'menu'; menuAt = -1;
      Sound.coin();
    }
    /* poke your character and it jumps */
    function menuPoke() {
      hopAt[MYID] = nowS();
      kick('mjelly', 9); kick('mtilt', (Math.random() < .5 ? -1 : 1) * 5);
      burst(MN.me.x + MN.me.w / 2, MN.me.y + 118, 10, [AV_BODY[specOf(MYID)[0]], '#fde047', '#ffffff'], 170);
      Sound.jump();
    }
    /* everyone's in: the line-up, then off we go */
    function drawGo(ctx, t) {
      const goT = rt - phaseAt;
      const e = easeOut(clamp(goT / .35, 0, 1));
      ctx.fillStyle = 'rgba(9,6,22,' + (.9 * e).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      const ts = .85 + .15 * backOut(clamp(goT / .45, 0, 1));
      ga(ctx, e);
      ctx.save(); ctx.translate(W / 2, 146); ctx.scale(ts, ts);
      disp(ctx, 0, 0, goWhy === 'time' ? 'Time’s up!' : SOLO ? 'Looking good!' : 'Everyone’s ready!', 62,
           goWhy === 'time' ? '#fde047' : '#ffffff', 'center', { glow: goWhy === 'time' ? 'rgba(253,224,71,.6)' : 'rgba(74,222,128,.75)', blur: 26 });
      ctx.restore();
      capsRich(ctx, W / 2, 196, SOLO ? [['OFF TO THE ', UI.ink3], ['DRAWING BOARD', UI.good]] : [['HERE’S THE ', UI.ink3], ['LINE-UP', UI.good]], 10);
      ga(ctx, 1);
      const n = ROSTER.length, gap = Math.min(150, 860 / n), sz = Math.min(130, gap * .92);
      ROSTER.forEach((p, i) => {
        const x = W / 2 + (i - (n - 1) / 2) * gap;
        const k = clamp((goT - .12 - i * .08) / .45, 0, 1);
        if (k <= 0) return;
        const b = backOut(k), hopY = -Math.abs(Math.sin(t * 5 + i * .7)) * 10;
        ga(ctx, k);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, 305 + sz * .47, sz * .3, sz * .06, 0, 0, TAU); ctx.fill();
        buddy(ctx, specOf(p.id), x, 305 + (1 - b) * 50 + hopY, sz, { blink: blinkOf(p.id, t), ly: -.3 });
        txt(ctx, x, 305 + sz * .64, clipW(ctx, p.name, gap - 8, 14, 700), 14, p.id === MYID ? UI.sky : '#ffffff', 'center', 700);
        ga(ctx, 1);
      });
      const ck = clamp((goT - .3) / .3, 0, 1);
      if (ck > 0) {
        ga(ctx, ck);
        caps(ctx, W / 2, 468, 'STARTING IN', 10, UI.ink3, 'center', 700, .22);
        const left = Math.max(1, Math.ceil(timer)), fk = timer - Math.floor(timer);
        ctx.save(); ctx.translate(W / 2, 506); const ns = 1 + Math.max(0, fk - .7) * .9; ctx.scale(ns, ns);
        disp(ctx, 0, 0, String(left), 46, '#ffffff', 'center', { glow: 'rgba(167,139,250,.7)', blur: 18 });
        ctx.restore();
        ga(ctx, 1);
      }
    }

    /* ------------------------------------------------------------- game */
    function drawGame(ctx, t) {
      const e = easeOut(clamp((rt - gameAt) / .6, 0, 1));
      FADE = e;
      ctx.globalAlpha = e;
      ctx.save(); ctx.translate(0, -(1 - e) * 18); drawTopBar(ctx, t); ctx.restore();
      ctx.save(); ctx.translate(-(1 - e) * 44, 0); drawPlayers(ctx, t); ctx.restore();
      ctx.save(); ctx.translate((1 - e) * 44, 0); drawChat(ctx, t); ctx.restore();
      ctx.save(); ctx.translate(0, (1 - e) * 26);
      drawBoard(ctx, t);
      if (!SOLO && phase === 'pick') drawPick(ctx, t);
      if (phase === 'reveal') drawReveal(ctx, t);
      drawActionBar(ctx, t);
      const wk = glide('wheel', wheelOpen && canUseTools() ? 1 : 0, 16);
      if (wk > .01) drawWheel(ctx, wk);
      const fk = (rt - flashAt) / 1.7;
      if (fk >= 0 && fk < 1) {
        const s = .6 + .4 * backOut(clamp(fk * 3.2, 0, 1));
        ga(ctx, clamp((1 - fk) * 2.2, 0, 1));
        ctx.save(); ctx.translate(BX + BW / 2, BY + BH / 2 - easeOut(fk) * 40); ctx.scale(s, s);
        disp(ctx, 0, 0, flash, 72, '#4ade80', 'center', { glow: 'rgba(74,222,128,.8)', blur: 24, stroke: '#0b2a16', lw: 7 });
        ctx.restore();
        ga(ctx, 1);
      }
      const tk = (rt - toastAt) / 1.8;
      if (tk >= 0 && tk < 1) {
        const ty = AY - 24 + (1 - backOut(clamp(tk * 4, 0, 1))) * 14;
        ga(ctx, clamp((1 - tk) * 3, 0, 1) * clamp(tk * 8, 0, 1));
        const tw = dispW(ctx, toast, 20) + 40;
        ctx.fillStyle = '#f59e0b'; rrect(ctx, BX + BW / 2 - tw / 2, ty - 16, tw, 32, 16); ctx.fill();
        disp(ctx, BX + BW / 2, ty + 1, toast, 20, '#2a1600', 'center');
        ga(ctx, 1);
      }
      ctx.restore();
      ctx.globalAlpha = 1; FADE = 1;
    }

    function drawTopBar(ctx, t) {
      /* left: the clock and where we are in the match */
      card(ctx, LX, 10, LW, 44, 14);
      if (SOLO) {
        ctx.fillStyle = 'rgba(253,224,71,.14)'; dotF(ctx, LX + 25, 32, 15);
        icon(ctx, 'pencil', LX + 25, 32, 17, UI.gold);
        caps(ctx, LX + 50, 25, 'PRACTICE', 9.5, UI.acc, 'left', 700, .2);
        txt(ctx, LX + 50, 41, 'No clock, no pressure', 11, UI.ink2, 'left', 600);
      } else {
        const secs = Math.max(0, Math.ceil(timer));
        const frac = phase === 'draw' ? timer / DRAWT : phase === 'pick' ? timer / PICKT : phase === 'reveal' ? timer / REVEALT : 0;
        clockRing(ctx, LX + 25, 32, 14, frac, phase === 'end' ? 0 : secs, phase === 'draw' && secs <= 10);
        caps(ctx, LX + 50, 25, 'ROUND ' + Math.min(round, ROUNDS) + ' OF ' + ROUNDS, 9.5, UI.acc, 'left', 700, .16);
        txt(ctx, LX + 50, 41, 'Turn ' + Math.min(turnIdx + 1, turnsPerRound) + ' of ' + turnsPerRound, 11, UI.ink2, 'left', 600);
      }

      /* middle: the word, as far as you're allowed to know it */
      card(ctx, BX, 10, BW, 44, 14);
      const cx = BX + BW / 2;
      let cap = '', show = '', mode = 'plain', wcol = UI.gold;
      if (SOLO) { cap = 'DRAW THIS'; show = word; mode = 'word'; }
      else if (phase === 'pick') { cap = isDrawer() ? 'YOUR TURN' : 'GET READY'; show = isDrawer() ? 'Pick a word to draw' : nameOf(drawerId) + ' is picking a word'; }
      else if (phase === 'draw') {
        if (isDrawer()) { cap = 'DRAW THIS'; show = myPick || word; mode = 'word'; }
        else if (meGuessed() && myKnown) { cap = 'YOU GOT IT'; show = myKnown; mode = 'word'; wcol = UI.good; }
        else { cap = meGuessed() ? 'YOU GOT IT' : 'GUESS THIS'; mode = 'tiles'; }
      } else if (phase === 'reveal' || phase === 'end') { cap = 'THE WORD WAS'; show = revealWord || word; mode = 'word'; }
      caps(ctx, cx, 20, cap, 8.5, UI.ink3, 'center', 700, .26);
      if (mode === 'tiles') drawTiles(ctx, cx, 39);
      else if (mode === 'word') disp(ctx, cx, 39, String(show || '').toUpperCase(), 25, wcol, 'center', { track: .06 });
      else txt(ctx, cx, 39, show, 14, UI.ink, 'center', 700);
      if (SOLO && phase === 'solo') {
        const bx = BX + BW - 40, by = 17, hv = glide('nwh', hovering(bx, by, 30, 30) ? 1 : 0, 16);
        ctx.fillStyle = 'rgba(253,224,71,' + (.12 + hv * .14).toFixed(3) + ')'; rrect(ctx, bx, by, 30, 30, 15); ctx.fill();
        ctx.save(); ctx.translate(bx + 15, by + 15); ctx.rotate(hv * .6); icon(ctx, 'spark', 0, 0, 17, UI.gold); ctx.restore();
        hitRects.push({ t: 'neww', x: bx, y: by, w: 30, h: 30 });
        caps(ctx, bx - 8, 32, 'NEW WORD', 8, UI.ink3, 'right', 700, .16);
      }

      /* right: you */
      card(ctx, RX, 10, RW, 44, 14);
      avatar(ctx, MYID, RX + 25, 34, 34, { blink: blinkOf(MYID, t), lx: -.5, sq: -hopK(MYID) * .06 });
      if (SOLO) {
        caps(ctx, RX + 50, 25, 'JUST YOU', 9.5, UI.acc, 'left', 700, .2);
        txt(ctx, RX + 50, 41, 'Sketch anything', 11, UI.ink2, 'left', 600);
      } else {
        caps(ctx, RX + 50, 23, 'YOUR SCORE', 8, UI.ink3, 'left', 700, .2);
        disp(ctx, RX + 49, 40, fmt(shownScore[MYID] == null ? (scores[MYID] || 0) : shownScore[MYID]), 22, '#ffffff', 'left');
        const place = 1 + ROSTER.filter(p => (scores[p.id] || 0) > (scores[MYID] || 0)).length;
        const lbl = '#' + place;
        const pw = dispW(ctx, lbl, 16) + 18;
        ctx.fillStyle = place === 1 ? 'rgba(253,224,71,.18)' : 'rgba(255,255,255,.08)';
        rrect(ctx, RX + RW - 12 - pw, 21, pw, 22, 11); ctx.fill();
        disp(ctx, RX + RW - 12 - pw / 2, 32.5, lbl, 16, place === 1 ? UI.gold : UI.ink2, 'center');
      }
    }
    /* the hidden word as tiles: blanks as slots, hints popping in as they land */
    function drawTiles(ctx, cx, cy) {
      const m = hintMask || '';
      if (m !== lastMask) {
        if (m.length !== lastMask.length) tilePop = [];
        else for (let i = 0; i < m.length; i++) if (lastMask[i] === '_' && m[i] !== '_') tilePop[i] = rt;
        lastMask = m;
      }
      if (!m.length) return;
      const n = m.length, tw = Math.min(18, (BW - 140) / n - 5), gap = 5;
      let total = 0;
      for (const c of m) total += c === ' ' ? tw * .8 : tw + gap;
      total -= gap;
      let x = cx - total / 2 - 10;
      for (let i = 0; i < n; i++) {
        const c = m[i];
        if (c === ' ') { x += tw * .8; continue; }
        const got = c !== '_';
        ctx.fillStyle = got ? UI.gold : 'rgba(255,255,255,.42)'; rrect(ctx, x, cy + 9, tw, 3, 1.5); ctx.fill();
        if (got) {
          const k = tilePop[i] != null ? clamp((rt - tilePop[i]) / .5, 0, 1) : 1;
          const s = 1 + (1 - backOut(k)) * .9;
          ctx.save(); ctx.translate(x + tw / 2, cy - 1); ctx.scale(s, s);
          disp(ctx, 0, 0, c.toUpperCase(), 22, UI.gold, 'center');
          ctx.restore();
        }
        x += tw + gap;
      }
      const letters = m.replace(/ /g, '').length;
      ctx.fillStyle = 'rgba(255,255,255,.09)'; rrect(ctx, x + 8, cy - 10, 24, 20, 10); ctx.fill();
      disp(ctx, x + 20, cy + .5, String(letters), 14, UI.ink2, 'center');
    }

    function drawPlayers(ctx, t) {
      card(ctx, LX, COL_Y, LW, COL_H, 16);
      caps(ctx, LX + 16, COL_Y + 20, 'PLAYERS', 9.5, UI.acc, 'left', 700, .22);
      disp(ctx, LX + LW - 16, COL_Y + 20, String(ROSTER.length), 14, UI.ink3, 'right');
      const rank = ROSTER.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0) || rosterIdx(a.id) - rosterIdx(b.id));
      const top = COL_Y + 36, rowH = Math.min(58, (COL_H - 44) / ROSTER.length);
      const lead = rank.length && (scores[rank[0].id] || 0) > 0 ? rank[0].id : null;
      const at = {};
      rank.forEach((p, i) => {
        at[p.id] = i;
        rowPos[p.id] = spring('row' + p.id, i, 170, 24);
        const sc = scores[p.id] || 0, sh = shownScore[p.id];
        shownScore[p.id] = sh == null || Math.abs(sc - sh) < 1 ? sc : sh + (sc - sh) * (1 - Math.exp(-5 * rdt));
      });
      /* back to front, so a row climbing the table passes over the others */
      for (let j = rank.length - 1; j >= 0; j--) {
        const p = rank[j];
        const y = top + rowPos[p.id] * rowH, h = rowH - 6, x = LX + 8, w = LW - 16;
        const mine = p.id === MYID, gone = !present(p.id);
        const isD = p.id === drawerId && (phase === 'pick' || phase === 'draw');
        const got = guessedOrder.indexOf(p.id) >= 0 && (phase === 'draw' || phase === 'reveal');
        const gk = glide('rg' + p.id, got ? 1 : 0, 9), dk = glide('rd' + p.id, isD && !got ? 1 : 0, 9);
        const b0 = mine ? [125, 211, 252, .09, .35] : [255, 255, 255, .045, .06];
        const mixC = (i2, a2) => b0[i2] + ([74, 222, 128][i2] - b0[i2]) * gk + ([253, 224, 71][i2] - b0[i2]) * dk * (1 - gk);
        const al = (i2, gv, dv) => b0[i2] + (gv - b0[i2]) * gk + (dv - b0[i2]) * dk * (1 - gk);
        const rgb = Math.round(mixC(0)) + ',' + Math.round(mixC(1)) + ',' + Math.round(mixC(2));
        ga(ctx, gone ? .42 : 1);
        ctx.fillStyle = 'rgba(' + rgb + ',' + al(3, .13, .11).toFixed(3) + ')'; rrect(ctx, x, y, w, h, 13); ctx.fill();
        ctx.strokeStyle = 'rgba(' + rgb + ',' + al(4, .45, .45).toFixed(3) + ')'; ctx.lineWidth = 1.2; rrect(ctx, x + .5, y + .5, w - 1, h - 1, 13); ctx.stroke();
        const rk = at[p.id] + 1, first = p.id === lead;
        if (first) icon(ctx, 'crown', x + 14, y + h / 2 - 10, 12, UI.gold);
        disp(ctx, x + 14, y + h / 2 + (first ? 5 : 1), String(rk), 17, first ? UI.gold : UI.ink3, 'center');
        const hk = hopK(p.id);
        avatar(ctx, p.id, x + 46, y + h / 2 + 3 - hk * 9, Math.min(46, h + 2), { blink: blinkOf(p.id, t), lx: .7, ly: .1, sq: -hk * .05 });
        if (isD) badge(ctx, x + 61, y + h - 9, 'pencil', UI.gold);
        else if (got) badge(ctx, x + 61, y + h - 9, 'check', UI.good);
        txt(ctx, x + 74, y + h / 2 - 8, clipW(ctx, p.name, 88, 13.5, 700), 13.5, mine ? UI.sky : '#ffffff', 'left', 700);
        if (gone) txt(ctx, x + 74, y + h / 2 + 10, 'left the game', 11, UI.ink3, 'left', 600);
        else {
          const sv = fmt(shownScore[p.id]);
          disp(ctx, x + 74, y + h / 2 + 10, sv, 15, UI.ink2, 'left');
          caps(ctx, x + 78 + dispW(ctx, sv, 15), y + h / 2 + 11, 'PTS', 7.5, UI.ink3, 'left', 700, .14);
        }
        ga(ctx, 1);
      }
    }

    /* chat: newest at the bottom, names in each player's own colour */
    function layoutMsg(ctx, m, maxW) {
      if (m._lay && m._lay.w === maxW) return m._lay;
      let lay;
      if (m.k === 'msg') {
        ctx.font = '700 12px ' + FONT;
        const nw = ctx.measureText(m.name + ':').width + 5;
        ctx.font = '500 12px ' + FONT;
        const lines = wrap(ctx, String(m.text || ''), maxW - nw, maxW);
        lay = { w: maxW, lines: lines, nw: nw, h: lines.length * 16 };
      } else if (m.k === 'ok') {
        ctx.font = '700 12px ' + FONT;
        const lines = wrap(ctx, m.name + ' guessed the word!', maxW - 30, maxW - 30);
        lay = { w: maxW, lines: lines, h: lines.length * 16 + 10 };
      } else {
        ctx.font = 'italic 600 11.5px ' + FONT;
        const lines = wrap(ctx, String(m.text || ''), maxW, maxW);
        lay = { w: maxW, lines: lines, h: lines.length * 15 };
      }
      try { Object.defineProperty(m, '_lay', { value: lay, writable: true, enumerable: false, configurable: true }); } catch (e) {}
      return lay;
    }
    function wrap(ctx, s, w1, w) {
      const out = [];
      let cur = '', lim = w1;
      const push = () => { out.push(cur); cur = ''; lim = w; };
      for (const word0 of s.split(/\s+/)) {
        let wd = word0;
        if (!wd) continue;
        const test = cur ? cur + ' ' + wd : wd;
        if (ctx.measureText(test).width <= lim) { cur = test; continue; }
        if (cur) push();
        /* nothing fits beside the name: start the text on the line below it */
        else if (!out.length && lim < w && ctx.measureText(wd).width <= w) push();
        /* a word wider than the column is broken wherever it has to be */
        while (ctx.measureText(wd).width > lim && wd.length > 1) {
          let n = wd.length - 1;
          while (n > 1 && ctx.measureText(wd.slice(0, n)).width > lim) n--;
          cur = wd.slice(0, n); push(); wd = wd.slice(n);
        }
        cur = wd;
      }
      if (cur || !out.length) out.push(cur);
      return out;
    }
    function drawChat(ctx, t) {
      card(ctx, RX, COL_Y, RW, COL_H, 16);
      caps(ctx, RX + 16, COL_Y + 20, SOLO ? 'TIPS' : 'CHAT', 9.5, UI.acc, 'left', 700, .22);
      const x0 = RX + 14, maxW = RW - 28;
      if (SOLO) {
        const tips = [
          ['Colours', 'Pick one from the palette, or tap the big swatch for any colour you like.'],
          ['Sizes', 'Six brush sizes sit at the right end of the toolbar.'],
          ['Fill', 'The bucket floods a closed shape in one click.'],
          ['New word', 'Stuck? The sparkle in the word bar deals another.']
        ];
        let y = COL_Y + 48;
        for (const tp of tips) {
          caps(ctx, x0, y, tp[0].toUpperCase(), 9, UI.gold, 'left', 700, .16);
          ctx.font = '600 12px ' + FONT;
          const lines = wrap(ctx, tp[1], maxW, maxW);
          lines.forEach((l, i) => txt(ctx, x0, y + 19 + i * 16, l, 12, UI.ink2, 'left', 600));
          y += 32 + lines.length * 16;
        }
        return;
      }
      const bottom = COL_Y + COL_H - 12, topY = COL_Y + 36;
      ctx.save();
      ctx.beginPath(); ctx.rect(RX + 4, topY - 6, RW - 8, bottom - topY + 12); ctx.clip();
      let y = bottom;
      for (let i = guessLog.length - 1; i >= 0 && y > topY; i--) {
        const m = guessLog[i], lay = layoutMsg(ctx, m, maxW);
        /* new lines slide up into place */
        const ak = m._at != null ? easeOut(clamp((rt - m._at) / .32, 0, 1)) : 1;
        y -= lay.h * ak;
        const yy = y + (1 - ak) * 10;
        ga(ctx, ak);
        if (m.k === 'msg') {
          txt(ctx, x0, yy + 8, m.name + ':', 12, m.id ? colOfP(m.id) : UI.ink2, 'left', 700);
          lay.lines.forEach((l, j) => txt(ctx, j ? x0 : x0 + lay.nw, yy + 8 + j * 16, l, 12, '#ffffff', 'left', 500));
        } else if (m.k === 'ok') {
          ctx.fillStyle = 'rgba(74,222,128,.16)'; rrect(ctx, x0 - 6, yy, maxW + 12, lay.h, 10); ctx.fill();
          ctx.fillStyle = UI.good; dotF(ctx, x0 + 7, yy + lay.h / 2, 7);
          icon(ctx, 'check', x0 + 7, yy + lay.h / 2, 9, '#06240f');
          lay.lines.forEach((l, j) => txt(ctx, x0 + 22, yy + 13 + j * 16, l, 12, UI.good, 'left', 700));
        } else {
          ctx.font = 'italic 600 11.5px ' + FONT;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillStyle = m.k === 'close' ? UI.warm : UI.ink3;
          lay.lines.forEach((l, j) => ctx.fillText(l, x0, yy + 7.5 + j * 15));
        }
        ga(ctx, 1);
        y -= 7 * ak;
      }
      ctx.restore();
      if (!guessLog.length) {
        ctx.fillStyle = 'rgba(255,255,255,.05)'; dotF(ctx, RX + RW / 2, COL_Y + COL_H / 2 - 18, 22);
        icon(ctx, 'pencil', RX + RW / 2, COL_Y + COL_H / 2 - 18, 20, UI.dim);
        txt(ctx, RX + RW / 2, COL_Y + COL_H / 2 + 16, 'Guesses show up here', 12, UI.ink3, 'center', 600);
      }
    }

    function drawBoard(ctx, t) {
      syncInk();
      ctx.fillStyle = 'rgba(4,2,14,.5)'; rrect(ctx, BX + 2, BY + 8, BW, BH, 16); ctx.fill();
      ctx.fillStyle = '#ffffff'; rrect(ctx, BX, BY, BW, BH, 16); ctx.fill();
      ctx.save();
      rrect(ctx, BX, BY, BW, BH, 16); ctx.clip();
      ctx.drawImage(ink, BX, BY, BW, BH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; rrect(ctx, BX + .75, BY + .75, BW - 1.5, BH - 1.5, 16); ctx.stroke();
      if (!ops.length) {
        const mine = canUseTools(), cx = BX + BW / 2, cy = BY + BH / 2;
        if (mine || (!SOLO && phase === 'draw')) {
          ga(ctx, .9);
          ctx.fillStyle = 'rgba(99,102,241,.08)'; dotF(ctx, cx, cy - 28, 30);
          icon(ctx, 'pencil', cx, cy - 28 + Math.sin(t * 3) * 3, 28, 'rgba(79,70,229,.55)');
          if (mine) disp(ctx, cx, cy + 20, 'Draw here!', 26, 'rgba(30,27,75,.4)', 'center');
          else txtDots(ctx, cx, cy + 20, nameOf(drawerId) + ' is about to draw', 15, 'rgba(30,27,75,.42)', 700, t);
          ga(ctx, 1);
        }
      }
      /* the brush follows the cursor, so its size is legible before you commit */
      const pt = api.input.pointer;
      if (canUseTools() && tool !== TOOL.FILL && pt.inside && inBoard(pt.x, pt.y) && !hitAt(pt.x, pt.y)) {
        const r = (curSize * (tool === TOOL.ERASE ? 1.7 : 1)) / 2;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(pt.x, pt.y, r + 1, 0, TAU); ctx.stroke();
        ctx.strokeStyle = tool === TOOL.ERASE || luma(curCol) > .8 ? 'rgba(15,23,42,.6)' : curCol;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, TAU); ctx.stroke();
      }
    }

    function nextUp() {
      let ti = turnIdx, rd = round;
      for (let g = 0; g < order.length; g++) {
        ti++;
        if (ti >= order.length) { ti = 0; rd++; }
        if (rd > ROUNDS) return null;
        if (present(order[ti])) return order[ti];
      }
      return null;
    }
    function drawActionBar(ctx, t) {
      card(ctx, BX, AY, BW, AH, 16);
      if (canUseTools()) { drawTools(ctx); return; }
      if (SOLO) return;
      const cy = AY + AH / 2;
      if (phase === 'draw' && meGuessed()) {
        const k = backOut(clamp((rt - flashAt) / .4, 0, 1));
        ctx.save(); ctx.translate(BX + 40, cy); ctx.scale(k, k);
        ctx.fillStyle = 'rgba(74,222,128,.18)'; dotF(ctx, 0, 0, 20);
        ctx.fillStyle = UI.good; dotF(ctx, 0, 0, 14);
        icon(ctx, 'check', 0, 0, 18, '#06240f');
        ctx.restore();
        disp(ctx, BX + 70, cy - 9, 'You got it!', 24, UI.good, 'left');
        txt(ctx, BX + 71, cy + 13, 'Sit tight while the others guess', 12, UI.ink2, 'left', 600);
        if (myGain) disp(ctx, BX + BW - 24, cy + 1, '+' + myGain, 32, UI.good, 'right', { glow: 'rgba(74,222,128,.5)', blur: 12 });
      } else if (phase === 'pick') {
        avatar(ctx, drawerId, BX + 42, cy + 4, 46, { blink: blinkOf(drawerId, t), lx: .6 });
        disp(ctx, BX + 76, cy - 9, isDrawer() ? 'Your turn to draw!' : nameOf(drawerId) + ' is drawing next', 21, '#ffffff', 'left');
        txt(ctx, BX + 77, cy + 13, isDrawer() ? 'Choose one of the three words above' : 'Get your guessing fingers ready', 12, UI.ink2, 'left', 600);
      } else if (phase === 'reveal' || phase === 'end') {
        const nx = phase === 'reveal' ? nextUp() : null;
        if (nx) {
          avatar(ctx, nx, BX + 42, cy + 4, 46, { blink: blinkOf(nx, t), lx: .6 });
          caps(ctx, BX + 77, cy - 11, 'UP NEXT', 9, UI.acc, 'left', 700, .22);
          disp(ctx, BX + 76, cy + 8, (nx === MYID ? 'You draw' : nameOf(nx) + ' draws') + ' next', 21, '#ffffff', 'left');
        } else {
          ctx.fillStyle = 'rgba(253,224,71,.14)'; dotF(ctx, BX + 40, cy, 20);
          icon(ctx, 'crown', BX + 40, cy + 1, 22, UI.gold);
          caps(ctx, BX + 71, cy - 11, 'THAT WAS THE LAST ONE', 9, UI.gold, 'left', 700, .22);
          disp(ctx, BX + 70, cy + 8, 'Final scores coming up…', 21, '#ffffff', 'left');
        }
      }
    }
    function toolBtn(ctx, key, x, y, w, h, name, on, live, danger) {
      const hv = glide('tb' + key, live && hovering(x, y, w, h) ? 1 : 0, 18);
      ctx.fillStyle = 'rgba(255,255,255,' + (.06 + hv * .08).toFixed(3) + ')';
      rrect(ctx, x, y, w, h, 9); ctx.fill();
      ctx.save(); ctx.translate(x + w / 2, y + h / 2 - hv); ctx.scale(1 + hv * .06, 1 + hv * .06);
      icon(ctx, name, 0, 0, 17, !live ? 'rgba(255,255,255,.2)' : danger ? '#fca5a5' : on ? '#ffffff' : mixHex('#bdb5e2', '#ffffff', hv));
      ctx.restore();
    }
    /* the pill that marks "this one" slides to whatever you pick */
    function slidePill(ctx, key, x, y, w, h, show) {
      const sx = spring(key + 'x', x, 420, 30), sy = spring(key + 'y', y, 420, 30), a = glide(key + 'a', show ? 1 : 0, 14);
      if (a < .01) return;
      ga(ctx, a);
      ctx.fillStyle = 'rgba(167,139,250,.38)'; rrect(ctx, sx, sy, w, h, 9); ctx.fill();
      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.5; rrect(ctx, sx + .75, sy + .75, w - 1.5, h - 1.5, 9); ctx.stroke();
      ga(ctx, 1);
    }
    function drawTools(ctx) {
      const x0 = BX + 10, y0 = AY + 9, rh = 28, r2 = y0 + 32;
      /* the current brush, on a scrap of paper; it opens the colour wheel */
      const chip = { x: x0, y: y0, w: 54, h: 60 };
      const chh = glide('chiph', hovering(chip.x, chip.y, chip.w, chip.h) || wheelOpen ? 1 : 0, 16);
      ctx.fillStyle = '#ffffff'; rrect(ctx, chip.x, chip.y, chip.w, chip.h, 12); ctx.fill();
      ctx.strokeStyle = wheelOpen ? UI.acc : 'rgba(255,255,255,' + (.35 + chh * .55).toFixed(3) + ')'; ctx.lineWidth = 1.2 + chh * 1.2;
      rrect(ctx, chip.x + .5, chip.y + .5, chip.w - 1, chip.h - 1, 12); ctx.stroke();
      const dr = clamp(spring('brushr', (curSize * (tool === TOOL.ERASE ? 1.7 : 1)) / 2, 300, 24), 1.5, 21);
      if (tool === TOOL.ERASE) {
        ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(30,27,75,.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(chip.x + chip.w / 2, chip.y + chip.h / 2 + 4, dr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = curCol; dotF(ctx, chip.x + chip.w / 2, chip.y + chip.h / 2 + 4, dr);
        if (luma(curCol) > .9) { ctx.strokeStyle = 'rgba(30,27,75,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(chip.x + chip.w / 2, chip.y + chip.h / 2 + 4, dr, 0, TAU); ctx.stroke(); }
      }
      /* a little rainbow says "more colours in here" */
      const rx = chip.x + chip.w - 11, ry = chip.y + 11;
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(chh * 1.2);
      for (let a = 0; a < 360; a += 30) {
        ctx.strokeStyle = hsvHex(a, .9, 1); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 5, (a - 1) * Math.PI / 180, (a + 31) * Math.PI / 180); ctx.stroke();
      }
      ctx.restore();
      hitRects.push({ t: 'chip', x: chip.x, y: chip.y, w: chip.w, h: chip.h });

      /* tools over actions */
      const tx = x0 + 62, bw = 30;
      const TL = [[TOOL.DRAW, 'pencil'], [TOOL.ERASE, 'eraser'], [TOOL.FILL, 'bucket']];
      const ti = TL.findIndex(tt => tt[0] === tool);
      TL.forEach((tt, i) => {
        const bx = tx + i * (bw + 3);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; rrect(ctx, bx, y0, bw, rh, 9); ctx.fill();
      });
      slidePill(ctx, 'tool', tx + Math.max(0, ti) * (bw + 3), y0, bw, rh, ti >= 0);
      TL.forEach((tt, i) => {
        const bx = tx + i * (bw + 3), hv = glide('tbt' + i, hovering(bx, y0, bw, rh) ? 1 : 0, 18);
        ctx.save(); ctx.translate(bx + bw / 2, y0 + rh / 2 - hv); ctx.scale(1 + hv * .08, 1 + hv * .08);
        icon(ctx, tt[1], 0, 0, 17, tool === tt[0] ? '#ffffff' : mixHex('#bdb5e2', '#ffffff', hv));
        ctx.restore();
        hitRects.push({ t: 'tool', v: tt[0], x: bx, y: y0, w: bw, h: rh });
      });
      [['undo', 'undo', ops.length > 0], ['redo', 'redo', redo.length > 0], ['clr', 'trash', ops.length > 0]].forEach((b, i) => {
        const bx = tx + i * (bw + 3);
        toolBtn(ctx, b[0], bx, r2, bw, rh, b[1], false, b[2], b[0] === 'clr');
        if (b[2]) hitRects.push({ t: b[0], x: bx, y: r2, w: bw, h: rh });
      });

      /* the palette, with a ring that slides to the colour you pick */
      const px = tx + 3 * bw + 6 + 10, sw = 20;
      let pi = -1;
      PALETTE.forEach((c, i) => {
        const cx = px + (i % 12) * (sw + 2), cy = i < 12 ? y0 : r2;
        if (tool !== TOOL.ERASE && curCol.toLowerCase() === c) pi = i;
        const lift = glide('pl' + i, hovering(cx, cy, sw, rh) ? 1 : 0, 18) * 2.5;
        ctx.fillStyle = c; rrect(ctx, cx, cy - lift, sw, rh, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; rrect(ctx, cx + .5, cy - lift + .5, sw - 1, rh - 1, 6); ctx.stroke();
        hitRects.push({ t: 'col', v: c, x: cx, y: cy, w: sw, h: rh });
      });
      const pcx = px + (Math.max(0, pi) % 12) * (sw + 2), pcy = pi < 12 ? y0 : r2;
      const rgx = spring('palx', pcx, 420, 30), rgy = spring('paly', pcy, 420, 30), ra = glide('pala', pi >= 0 ? 1 : 0, 14);
      if (ra > .01) {
        ga(ctx, ra);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; rrect(ctx, rgx - 1, rgy - 1, sw + 2, rh + 2, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(20,14,40,.9)'; ctx.lineWidth = 1.2; rrect(ctx, rgx + 1.6, rgy + 1.6, sw - 3.2, rh - 3.2, 5); ctx.stroke();
        ga(ctx, 1);
      }

      /* brush sizes */
      const sx = px + 12 * (sw + 2) - 2 + 10;
      const si = SIZES.indexOf(curSize);
      SIZES.forEach((s, i) => {
        const bx = sx + (i % 3) * 28, by = i < 3 ? y0 : r2;
        ctx.fillStyle = 'rgba(255,255,255,.06)'; rrect(ctx, bx, by, 26, rh, 9); ctx.fill();
      });
      slidePill(ctx, 'size', sx + (Math.max(0, si) % 3) * 28, si < 3 ? y0 : r2, 26, rh, si >= 0);
      SIZES.forEach((s, i) => {
        const bx = sx + (i % 3) * 28, by = i < 3 ? y0 : r2, hv = glide('sz' + i, hovering(bx, by, 26, rh) ? 1 : 0, 18);
        ctx.fillStyle = curSize === s ? '#ffffff' : mixHex('#bdb5e2', '#ffffff', hv);
        dotF(ctx, bx + 13, by + rh / 2, SIZE_DOT[i] * (1 + hv * .12));
        hitRects.push({ t: 'size', v: s, x: bx, y: by, w: 26, h: rh });
      });
    }
    /* any colour at all: a hue ring round a saturation / brightness square */
    function drawWheel(ctx, k) {
      const pw = 224, ph = 150, px = BX + 8, py = AY - ph - 10;
      const s = .9 + .1 * backOut(k);
      ga(ctx, k);
      ctx.save();
      ctx.translate(px + 30, py + ph); ctx.scale(s, s); ctx.translate(-(px + 30), -(py + ph) + (1 - k) * 10);
      card(ctx, px, py, pw, ph, 16, ['rgba(40,30,86,.97)', 'rgba(24,17,54,.97)']);
      WHEEL.r = 60; WHEEL.x = px + 14 + WHEEL.r; WHEEL.y = py + ph / 2;
      const R = WHEEL.r, IR = R * .72;
      if (ctx.createConicGradient) {
        const cg = ctx.createConicGradient(0, WHEEL.x, WHEEL.y);
        for (let a = 0; a <= 360; a += 30) cg.addColorStop(a / 360, hsvHex(a % 360, 1, 1));
        ctx.strokeStyle = cg; ctx.lineWidth = R - IR;
        ctx.beginPath(); ctx.arc(WHEEL.x, WHEEL.y, (R + IR) / 2, 0, TAU); ctx.stroke();
      } else {
        for (let a = 0; a < 360; a += 3) {
          ctx.beginPath();
          ctx.arc(WHEEL.x, WHEEL.y, (R + IR) / 2, (a - 1.2) * Math.PI / 180, (a + 2.4) * Math.PI / 180);
          ctx.strokeStyle = hsvHex(a, 1, 1); ctx.lineWidth = R - IR; ctx.stroke();
        }
      }
      const ha = wheelHue * Math.PI / 180, hr = (R + IR) / 2;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(WHEEL.x + Math.cos(ha) * hr, WHEEL.y + Math.sin(ha) * hr, 7, 0, TAU); ctx.stroke();
      const sq = IR * 1.3, qx = WHEEL.x - sq / 2, qy = WHEEL.y - sq / 2;
      WHEEL.sq = sq;
      const gh = ctx.createLinearGradient(qx, 0, qx + sq, 0);
      gh.addColorStop(0, '#ffffff'); gh.addColorStop(1, hsvHex(wheelHue, 1, 1));
      ctx.fillStyle = gh; ctx.fillRect(qx, qy, sq, sq);
      const gv = ctx.createLinearGradient(0, qy, 0, qy + sq);
      gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(1, '#000000');
      ctx.fillStyle = gv; ctx.fillRect(qx, qy, sq, sq);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(qx, qy, sq, sq);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(qx + wheelSat * sq, qy + (1 - wheelVal) * sq, 5, 0, TAU); ctx.stroke();
      const sx = px + 156, sy = py + 22;
      ctx.fillStyle = curCol; rrect(ctx, sx, sy, 54, 46, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; rrect(ctx, sx + .5, sy + .5, 53, 45, 12); ctx.stroke();
      caps(ctx, sx + 27, sy + 62, curCol.toUpperCase(), 9, UI.ink2, 'center', 700, .08);
      txt(ctx, sx + 27, sy + 88, 'Drag to mix', 10.5, UI.ink3, 'center', 600);
      ctx.restore();
      ga(ctx, 1);
      if (wheelOpen) {
        hitRects.push({ t: 'wheelbg', wheel: 1, x: px, y: py, w: pw, h: ph });
        hitRects.push({ t: 'hue', wheel: 1, ring: 1, x: WHEEL.x - R - 3, y: WHEEL.y - R - 3, w: R * 2 + 6, h: R * 2 + 6 });
        hitRects.push({ t: 'sv', wheel: 1, x: qx, y: qy, w: sq, h: sq });
      }
    }

    /* word choices: cards rise and settle on a stagger */
    function drawPick(ctx, t) {
      const pickIn = clamp((rt - phaseAt) * 2.4, 0, 1);
      const e = easeOut(pickIn), cx = BX + BW / 2;
      const dim = ctx.createRadialGradient(cx, BY + BH / 2, 40, cx, BY + BH / 2, BW * .7);
      dim.addColorStop(0, 'rgba(34,24,72,' + (.96 * e).toFixed(3) + ')'); dim.addColorStop(1, 'rgba(14,9,32,' + (.97 * e).toFixed(3) + ')');
      ctx.fillStyle = dim; rrect(ctx, BX, BY, BW, BH, 16); ctx.fill();
      if (isDrawer()) {
        ga(ctx, e);
        caps(ctx, cx, BY + 80, 'YOUR TURN TO DRAW', 10, UI.acc, 'center', 700, .26);
        disp(ctx, cx, BY + 114, 'Choose a word', 40, '#ffffff', 'center', { glow: 'rgba(167,139,250,.55)', blur: 18 });
        ga(ctx, 1);
        const cw = 152, ch = 108, gap = 16, x0 = cx - (3 * cw + 2 * gap) / 2, y0 = BY + 160;
        choices.forEach((w, i) => {
          const k = clamp((pickIn - i * .14) / .55, 0, 1);
          if (k <= 0) return;
          const b = backOut(k), x = x0 + i * (cw + gap);
          const hv = glide('wc' + i, hovering(x, y0, cw, ch) ? 1 : 0, 16);
          const y = y0 + (1 - b) * 34 - hv * 6;
          ga(ctx, k);
          ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(1 + hv * .04, 1 + hv * .04); ctx.translate(-cw / 2, -ch / 2);
          ctx.fillStyle = 'rgba(0,0,0,' + (.4 + hv * .1).toFixed(3) + ')'; rrect(ctx, 2, 8 + hv * 4, cw, ch, 18); ctx.fill();
          const g = ctx.createLinearGradient(0, 0, cw, ch);
          g.addColorStop(0, PICK_COLS[i][0]); g.addColorStop(1, PICK_COLS[i][1]);
          ctx.fillStyle = g; rrect(ctx, 0, 0, cw, ch, 18); ctx.fill();
          const sh = ctx.createLinearGradient(0, 0, 0, ch);
          sh.addColorStop(0, 'rgba(255,255,255,.2)'); sh.addColorStop(.5, 'rgba(255,255,255,0)');
          ctx.fillStyle = sh; rrect(ctx, 0, 0, cw, ch, 18); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,' + (.25 + hv * .6).toFixed(3) + ')'; ctx.lineWidth = 1.2 + hv * 1.4;
          rrect(ctx, .5, .5, cw - 1, ch - 1, 18); ctx.stroke();
          const up = w.toUpperCase();
          const fs = Math.min(30, 30 * (cw - 22) / Math.max(1, dispW(ctx, up, 30, { track: .02 })));
          disp(ctx, cw / 2, ch / 2 - 8, up, fs, '#ffffff', 'center', { track: .02 });
          caps(ctx, cw / 2, ch / 2 + 24, w.length + ' LETTERS', 8.5, 'rgba(255,255,255,.8)', 'center', 700, .2);
          ctx.restore();
          ga(ctx, 1);
          hitRects.push({ t: 'choice', i: i, x: x, y: y0, w: cw, h: ch });
        });
        const frac = clamp(timer / PICKT, 0, 1), bw = 3 * cw + 2 * gap, by = y0 + ch + 34;
        ga(ctx, e);
        ctx.fillStyle = 'rgba(255,255,255,.1)'; rrect(ctx, x0, by, bw, 6, 3); ctx.fill();
        ctx.fillStyle = frac < .34 ? UI.bad : UI.acc; rrect(ctx, x0, by, Math.max(6, bw * frac), 6, 3); ctx.fill();
        capsRich(ctx, cx, by + 22, [['WE’LL PICK ONE FOR YOU IN ', UI.ink3], [Math.max(0, Math.ceil(timer)) + 'S', UI.ink]], 9);
        ga(ctx, 1);
      } else {
        ga(ctx, e);
        const glow = ctx.createRadialGradient(cx, BY + 172, 10, cx, BY + 172, 120);
        glow.addColorStop(0, 'rgba(167,139,250,.28)'); glow.addColorStop(1, 'rgba(167,139,250,0)');
        ctx.fillStyle = glow; ctx.fillRect(cx - 120, BY + 52, 240, 240);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx, BY + 232, 42, 8, 0, 0, TAU); ctx.fill();
        avatar(ctx, drawerId, cx, BY + 176 + Math.sin(t * 2.4) * 4, 118,
               { blink: blinkOf(drawerId, t), lx: Math.sin(t * .9) * .8, ly: -.3 });
        disp(ctx, cx, BY + 276, nameOf(drawerId) + ' is choosing', 30, '#ffffff', 'center');
        capsRich(ctx, cx, BY + 306, [['GET READY TO ', UI.ink3], ['GUESS', UI.good]], 10);
        ga(ctx, 1);
      }
    }

    /* Round results. Rows appear in the standings as they were, the round's
       points count on, and then everyone slides to their new position — so you
       actually watch yourself overtake someone rather than being shown a table
       that has already settled. */
    function drawReveal(ctx, t) {
      const revealT = rt - phaseAt, revealIn = clamp(revealT * 2.2, 0, 1);
      const e = easeOut(revealIn);
      ctx.fillStyle = 'rgba(14,9,32,' + (.9 * e).toFixed(3) + ')'; rrect(ctx, BX, BY, BW, BH, 16); ctx.fill();

      /* the word */
      ga(ctx, e);
      caps(ctx, BX + BW / 2, BY + 30 - (1 - e) * 10, 'THE WORD WAS', 10, UI.ink3, 'center', 700, .26);
      const popS = 1 + (1 - clamp((revealT - .1) / .45, 0, 1)) * .16;
      ctx.save(); ctx.translate(BX + BW / 2, BY + 64 - (1 - e) * 10); ctx.scale(popS, popS);
      disp(ctx, 0, 0, (revealWord || word || '').toUpperCase(), 44, UI.gold, 'center', { track: .04, glow: 'rgba(253,224,71,.55)', blur: 20 });
      ctx.restore();
      ga(ctx, 1);

      /* --- standings, before and after --- */
      const rows = ROSTER.map(p => {
        const gain = guessedGain[p.id] || 0;
        const now = scores[p.id] || 0;
        return { id: p.id, name: p.name, gain: gain, before: now - gain, after: now };
      });
      const oldOrder = rows.slice().sort((a, b) => b.before - a.before || a.name.localeCompare(b.name));
      const newOrder = rows.slice().sort((a, b) => b.after - a.after || a.name.localeCompare(b.name));
      const oldRank = {}, newRank = {};
      oldOrder.forEach((r, i) => oldRank[r.id] = i);
      newOrder.forEach((r, i) => newRank[r.id] = i);

      const top = BY + 100;
      const avail = (BY + BH - 30) - top;
      const rowH = Math.min(46, avail / Math.max(1, rows.length));
      const listW = Math.min(420, BW - 80), listX = BX + (BW - listW) / 2;

      /* phases, in seconds since the reveal opened */
      const moveP = clamp((revealT - 1.75) / 1.05, 0, 1);
      const moveE = moveP < .5 ? 2 * moveP * moveP : 1 - Math.pow(-2 * moveP + 2, 2) / 2;
      const countP = clamp((revealT - .85) / .85, 0, 1);
      const countE = 1 - Math.pow(1 - countP, 3);

      rows.forEach(r => {
        const rowIn = clamp((revealT - .35 - oldRank[r.id] * .06) / .4, 0, 1);
        if (rowIn <= 0) return;
        const rowE = 1 - Math.pow(1 - rowIn, 3);
        const y = top + (oldRank[r.id] + (newRank[r.id] - oldRank[r.id]) * moveE) * rowH;
        const climbed = newRank[r.id] < oldRank[r.id], fell = newRank[r.id] > oldRank[r.id];
        const moving = moveP > 0 && moveP < 1 && (climbed || fell);

        ctx.save();
        ga(ctx, rowE);
        ctx.translate((1 - rowE) * -18, 0);

        const mine = r.id === MYID;
        let bg = mine ? 'rgba(125,211,252,.13)' : 'rgba(255,255,255,.05)';
        if (moving) bg = climbed ? 'rgba(74,222,128,.20)' : 'rgba(248,113,113,.16)';
        ctx.fillStyle = bg;
        rrect(ctx, listX, y + 3, listW, rowH - 6, 12); ctx.fill();
        if (mine) { ctx.strokeStyle = 'rgba(125,211,252,.45)'; ctx.lineWidth = 1.2; rrect(ctx, listX + .5, y + 3.5, listW - 1, rowH - 7, 12); ctx.stroke(); }

        /* place number, counting from the live (interpolated) position */
        const shownRank = Math.round(oldRank[r.id] + (newRank[r.id] - oldRank[r.id]) * moveE) + 1;
        disp(ctx, listX + 20, y + rowH / 2, String(shownRank), 20, shownRank === 1 ? UI.gold : UI.ink3, 'center');

        avatar(ctx, r.id, listX + 54, y + rowH / 2 + 3, Math.min(44, rowH - 4), { blink: blinkOf(r.id, t) });

        txt(ctx, listX + 80, y + rowH / 2 - (r.gain > 0 ? 7 : 0), clipW(ctx, r.name, 170, 14, 700), 14, '#ffffff', 'left', 700);
        if (r.gain > 0 && revealT > .85) {
          ga(ctx, rowE * clamp((revealT - .85) / .3, 0, 1));
          caps(ctx, listX + 80, y + rowH / 2 + 11, r.id === drawerId ? 'DREW IT' : 'GUESSED IT', 8.5, UI.good, 'left', 700, .14);
          ga(ctx, rowE);
        }

        /* the score ticks up from what they had to what they now have */
        const shown = Math.round(r.before + (r.after - r.before) * countE);
        disp(ctx, listX + listW - 18, y + rowH / 2 + 1, fmt(shown), 24, mine ? '#bae6fd' : '#ffffff', 'right');

        /* the round's points, floating up and fading as they merge in */
        if (r.gain > 0) {
          const gp = clamp((revealT - .85) / 1.0, 0, 1);
          ga(ctx, rowE * (1 - gp) * (revealT > .8 ? 1 : 0));
          disp(ctx, listX + listW - 18, y + rowH / 2 - 16 - gp * 14, '+' + r.gain, 17, UI.good, 'right');
          ga(ctx, rowE);
        }

        /* movement arrow while the rows are travelling */
        if (moving) {
          const ax = listX + listW - 82;
          ctx.fillStyle = climbed ? UI.good : UI.bad;
          ctx.beginPath();
          if (climbed) { ctx.moveTo(ax, y + rowH / 2 - 5); ctx.lineTo(ax - 5, y + rowH / 2 + 3); ctx.lineTo(ax + 5, y + rowH / 2 + 3); }
          else { ctx.moveTo(ax, y + rowH / 2 + 5); ctx.lineTo(ax - 5, y + rowH / 2 - 3); ctx.lineTo(ax + 5, y + rowH / 2 - 3); }
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      });

      const got = guessedOrder.length;
      ga(ctx, clamp((revealT - 2.6) / .5, 0, 1));
      caps(ctx, BX + BW / 2, BY + BH - 16,
           got === 0 ? 'NOBODY GOT IT THIS TIME' : got + (got === 1 ? ' PLAYER GUESSED IT' : ' PLAYERS GUESSED IT'),
           9, UI.ink3, 'center', 700, .2);
      ga(ctx, 1);
    }
  }
});
