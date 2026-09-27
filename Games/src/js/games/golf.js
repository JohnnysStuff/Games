/* ======================================================== MINI GOLF ====== */
/* Real mini golf. A hole is a lane laid across open country: a spine it
   follows (rising and falling as it goes), a width, and whatever is set along
   it — bunkers dug into it, hills and bowls shaped into it, creeks and lava
   running across it, ramps to jump them, bridges, windmills, pipes, posts and
   walls. The ball is a ball on that ground: gravity pulls it down every slope,
   the carpet and the sand take its speed, it flies off a lip and bounces when
   it lands, and the cup is a hole — the ball drops only once it is over it,
   and a putt that arrives too fast catches the far lip and hops out.

   Holes run longer than the screen, so the view follows the ball. In 3D the
   camera sits behind it looking down the lane; the flat view is the same
   course from overhead, scrolling. Both read the same world, so a party can
   mix them. */
registerGame({
  id: 'golf',
  title: 'Mini Golf',
  tagline: 'Eight destinations. 144 holes. Full 18-hole rounds through landscaped parkland, cedar forests, coastal dunes and beyond. Follow longer fairways over bridges, through stone tunnels and beneath turning windmills. Pick a course and tee off together.',
  tags: ['Sports', 'Skill', 'Online'],
  scoreLabel: 'Score',
  bars: 'hub',
  front: true,
  /* a few tiles of the game's own for the menu wall */
  tiles: [['8', 'Courses'], ['144', 'Holes'], ['18', 'Per round']],
  mp: 'race',
  mpMin: 2, mpMax: 4,
  controls: [['Aim', 'Drag back from the ball'], ['Shoot', 'Release'], ['Cancel', 'Right-click'], ['Look over the hole', 'V / the eye button'], ['Chat', 'Enter'], ['Pause', 'Esc']],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="gfB" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#2f7a46"/><stop offset="1" stop-color="#0a2417"/></radialGradient><radialGradient id="gfBall" cx=".34" cy=".28"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef3f8"/><stop offset="1" stop-color="#9fb0c0"/></radialGradient><linearGradient id="gfFlag" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6b5c"/><stop offset="1" stop-color="#c02a1e"/></linearGradient><radialGradient id="gfHole" cx=".5" cy=".4"><stop offset="0" stop-color="#020604"/><stop offset="1" stop-color="#0d2a1a"/></radialGradient></defs><rect width="320" height="180" fill="url(#gfB)"/><g opacity=".16"><path d="M-20 96q80-26 170-14t190-6" fill="none" stroke="#9fe8b8" stroke-width="30" stroke-linecap="round"/></g><ellipse cx="160" cy="176" rx="180" ry="46" fill="#1d5c34" opacity=".55"/><g transform="translate(214 96)"><ellipse rx="34" ry="13" fill="#0b2415" opacity=".8"/><ellipse rx="27" ry="10" fill="url(#gfHole)"/><g transform="translate(0 -4)"><rect x="-2.5" y="-84" width="5" height="84" rx="2.5" fill="#e2e8f0"/><rect x="-2.5" y="-84" width="2" height="84" fill="#fff" opacity=".7"/><path d="M2 -84h46l-12 14 12 14H2z" fill="url(#gfFlag)"/><path d="M2 -84h46l-6 7H2z" fill="#ff9d90" opacity=".55"/></g></g><g transform="translate(96 122)"><ellipse cy="20" rx="26" ry="7" fill="#000" opacity=".45"/><circle r="25" fill="url(#gfBall)"/><g fill="#c3ced9" opacity=".85"><circle cx="-9" cy="-6" r="2.6"/><circle cx="0" cy="-11" r="2.6"/><circle cx="9" cy="-5" r="2.6"/><circle cx="-5" cy="4" r="2.6"/><circle cx="6" cy="5" r="2.6"/><circle cx="-13" cy="4" r="2.2"/><circle cx="13" cy="-13" r="2.2"/></g><ellipse cx="-8" cy="-11" rx="9" ry="6" fill="#fff" opacity=".85" transform="rotate(-30 -8 -11)"/></g><g opacity=".5" stroke="#eafff2" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" fill="none"><path d="M124 118q40-22 62-16"/></g></svg>',
  mount(api) {
    const W = 960, H = 600;
    const RACE = getRace('golf');
    /* a round teed off from the front page is told which course */
    const FROM_MENU = !!api.fromMenu;
    const CARRY = FROM_MENU && api.carry && api.carry.golf ? api.carry : null;
    /* 3D unless the player picked the overhead view or this machine cannot do
       it — a 3D view that fails to build falls back to the flat one too */
    /* The course is always the 3D one. The overhead painting below is no
       longer a choice anyone makes — it is only what a machine that cannot
       manage WebGL, or a view that gives out mid-round, is left with. */
    const G3 = Gfx3D.get();
    let VIEW = null;

    /* ------------------------------------------------------- worlds ----- */
    /* The flat colours (the vote cards and the overhead view use them) and
       the 3D world: how the carpet rolls, what the rails are made of, the
       country's colours and shape, the sky, and what grows there. */
    const THEMES = {
      meadow: {
        name: 'Meadow', bgA: '#16301f', bgB: '#08150d',
        turfA: '#43975f', turfB: '#3a8a56', rough: '#2a6640', edge: '#1c4a2e',
        railTop: '#c79b69', railFace: '#8d6539', railDark: '#5b4020',
        sand: '#eedaa8', sandDeep: '#d8c08d', sandRim: '#a8946a',
        waterA: '#4fb0e8', waterB: '#1d5fb8', deep: '#123f7d',
        roll: [250, .12], rail: 'wood', lane: ['#528948', '#497e40'],
        land: ['#7b9252', '#536e3e', '#7b6a55', '#cdbb8a'], style: 0, snow: 950, hills: 80, peaks: 1300, sea: -60, seaK: 0,
        sky: ['#3a78d4', '#cde4fb'], sun: [-.4, -.48, .78], sunC: ['#fff2da', 1.75], cloud: .55, night: 0,
        amb: ['#a9cdf4', .44, '#5a7a42', .28], expo: 1, flora: 'meadow'
      },
      lagoon: {
        name: 'Lagoon', bgA: '#0e3038', bgB: '#061a1f',
        turfA: '#46a879', turfB: '#3d9a6d', rough: '#2c7355', edge: '#1d5240',
        railTop: '#d9c093', railFace: '#a08355', railDark: '#6b5636',
        sand: '#f6e6bd', sandDeep: '#e0c894', sandRim: '#b8a273',
        waterA: '#5fe0d8', waterB: '#199fb8', deep: '#0e6a86',
        roll: [240, .12], rail: 'wood', lane: ['#548f64', '#49845a'],
        land: ['#e2cf98', '#d4bd84', '#9a8a6c', '#efe0b4'], style: 6, hills: 40, peaks: 500, sea: -60, seaK: 0,
        sky: ['#2f86e0', '#c6f0ff'], sun: [-.3, -.45, .84], sunC: ['#fff8ea', 1.8], cloud: .4, night: 0,
        amb: ['#9fe6ff', .46, '#6fb7a8', .3], expo: .95, flora: 'lagoon'
      },
      canyon: {
        name: 'Canyon', bgA: '#2a1710', bgB: '#150a06',
        turfA: '#8f9a52', turfB: '#849048', rough: '#6b7539', edge: '#4b5228',
        railTop: '#c86f4a', railFace: '#96482c', railDark: '#5f2c1a',
        sand: '#e8c48f', sandDeep: '#cfa268', sandRim: '#9d7546',
        waterA: '#4aa8c4', waterB: '#1c6d8c', deep: '#0f4a63',
        roll: [260, .12], rail: 'stone', lane: ['#7f9a4c', '#728c42'],
        land: ['#b56e42', '#9c5a34', '#8a4a2c', '#d9a878'], style: 7, hills: 60, peaks: 1100, sea: -9999, seaK: 0,
        sky: ['#4b7fcf', '#f3cfa6'], sun: [-.62, -.25, .74], sunC: ['#ffd7a0', 1.8], cloud: .25, night: 0,
        amb: ['#f2c49b', .36, '#8a4a2c', .3], expo: 1, flora: 'canyon'
      },
      volcano: {
        name: 'Caldera', bgA: '#2b0f0a', bgB: '#120504',
        turfA: '#4a4a44', turfB: '#3f403b', rough: '#2e2f2b', edge: '#1a1b18',
        railTop: '#5b5566', railFace: '#3a3444', railDark: '#221e2a',
        sand: '#5c5148', sandDeep: '#463d36', sandRim: '#2e2823',
        waterA: '#fbbf24', waterB: '#ea580c', deep: '#7f1d1d',
        roll: [260, .12], rail: 'basalt', lane: ['#6b3a34', '#5c302b'],
        land: ['#3a3230', '#2b2523', '#2a2220', '#4a3a30'], style: 3, hills: 90, peaks: 1300, sea: -70, seaK: 1,
        sky: ['#3a1a1c', '#b8583a'], sun: [-.4, -.4, .82], sunC: ['#ffab7a', .95], cloud: .5, night: .15,
        amb: ['#a04a38', .36, '#2a1210', .3], expo: 1.1, flora: 'volcano', lava: true
      },
      glacier: {
        name: 'Glacier', bgA: '#0f2436', bgB: '#06111c',
        turfA: '#bfe4f2', turfB: '#a8d6ea', rough: '#7fb6cf', edge: '#4f8aa6',
        railTop: '#e6f6ff', railFace: '#9cc9de', railDark: '#5d8ea6',
        sand: '#f4fbff', sandDeep: '#d7ecf6', sandRim: '#a9cfe0',
        waterA: '#7dd3fc', waterB: '#2563eb', deep: '#1e3a8a',
        roll: [95, .06], rail: 'ice', lane: ['#9fd3e8', '#8cc5dc'], slick: true,
        land: ['#e8f2f8', '#d2e4ee', '#6f7f8c', '#dfeef6'], style: 4, hills: 110, peaks: 1800, sea: -64, seaK: 2,
        sky: ['#3f7fcf', '#d0e4f6'], sun: [-.38, -.55, .74], sunC: ['#f4faff', 1.4], cloud: .45, night: 0,
        amb: ['#c4e6ff', .46, '#8fb0c8', .3], expo: .82, flora: 'glacier'
      },
      night: {
        name: 'Moon Garden', bgA: '#0c1230', bgB: '#04061a',
        turfA: '#2b6b52', turfB: '#25604a', rough: '#1c4a39', edge: '#123024',
        railTop: '#8f7fd8', railFace: '#5b4da8', railDark: '#332a66',
        sand: '#cfd4e8', sandDeep: '#a8b0cc', sandRim: '#7b83a0',
        waterA: '#6d8ff5', waterB: '#2c3fa8', deep: '#1b2470',
        roll: [245, .12], rail: 'night', lane: ['#2a6e5c', '#235f4f'],
        land: ['#26503c', '#1c3f2f', '#3c3a4a', '#6a7090'], style: 5, hills: 80, peaks: 1300, sea: -60, seaK: 0,
        sky: ['#050a22', '#1b2a5c'], sun: [-.3, -.5, .81], sunC: ['#b8c6ff', .7], cloud: .3, night: 1,
        amb: ['#3e4c9c', .36, '#101a30', .26], expo: 1.25, flora: 'night', snow: 1000
      }
    };

    /* ------------------------------------------------------- courses ---- */
    /* A hole: its name and par, the lane's width, the spine it follows as
       [x, y, height] (y runs down the old screen), how far short of the end
       the cup sits, and what is set along it. Things are placed by distance
       down the lane (s) and offset across it (t, positive to the right of the
       way you are playing):
         sand s t r [depth] [stretch]    hill s t r h        bowl s t r depth
         creek s width [lava]            bridge s t width    gully s width depth
         ramp s length h [t width]       bank s0 s1 tilt     pond s t r [lava]
         lake s t r (out in the country) wall s t length [angle]
         post s t r [kick]               mill s [gap]        mover s t length amp speed
         tunnel s1 s2 [width]           (a covered pipe cut across the hole)
       Every hole was rolled end to end: ramps carry their creeks, bridges are
       wide enough to hold a straight putt, and nothing seals a lane shut. */
    const COURSES = [
      { id: 'meadow', th: 'meadow', name: 'Meadow Links', blurb: 'Parkland, a lazy creek and the old windmill. A gentle start.', holes: [
        { n: 'First Tee', par: 2, w: 300, p: [[0, 0, 0], [1150, 0, 12]], f: [['hill', 560, -70, 120, 12]] },
        { n: 'Dogleg', par: 3, w: 280, p: [[0, 0, 0], [760, 0, 0], [1150, 380, -18]], f: [['sand', 790, 90, 80, 20], ['post', 820, -70, 22]] },
        { n: 'The Windmill', par: 3, w: 300, p: [[0, 0, 0], [1500, 0, 0]], f: [['hill', 380, 80, 100, 10], ['mill', 800], ['sand', 1180, -80, 70, 20]] },
        { n: 'Twin Traps', par: 3, w: 280, p: [[0, 0, 0], [520, 0, 0], [880, 300, -20], [1500, 300, -30]], f: [['sand', 420, 70, 80, 22], ['hill', 1010, 60, 90, 12], ['sand', 1170, -70, 80, 22]] },
        { n: 'Creek Crossing', par: 3, w: 300, p: [[0, 0, 10], [1450, 0, 0]], f: [['ramp', 560, 120, 26, -70, 140], ['creek', 760, 96], ['bridge', 760, 80, 64], ['sand', 1150, 60, 70, 20]] },
        { n: 'Hill Climb', par: 3, w: 280, p: [[0, 0, 0], [500, 0, 0], [1000, 0, 62], [1300, -260, 62]], f: [['hill', 1150, 50, 90, 12]], cup: 100 },
        { n: 'Round the Pond', par: 4, w: 260, p: [[0, 0, 0], [820, 0, 0], [1080, 260, -6], [820, 520, -12], [0, 520, -18]], f: [['lake', 520, 260, 170], ['sand', 1060, -40, 70, 20], ['post', 400, 70, 20], ['post', 1700, -70, 20]] },
        { n: 'Home Stretch', par: 4, w: 280, p: [[0, 0, 20], [700, 0, 20], [1100, 320, 0], [1900, 320, -20], [2300, 0, -20]], f: [['mill', 1300], ['creek', 1700, 84], ['bridge', 1700, 0, 76], ['sand', 2120, 80, 70, 20]] }
      ] },
      { id: 'lagoon', th: 'lagoon', name: 'Coral Lagoon', blurb: 'Sandbar lanes over turquoise water. Carry the channels.', holes: [
        { n: 'Beach Walk', par: 2, w: 300, p: [[0, 0, 0], [1200, 0, 0]], f: [['sand', 380, 90, 70, 18], ['sand', 700, -90, 75, 18], ['sand', 980, 80, 60, 18]] },
        { n: 'Island Hop', par: 3, w: 280, p: [[0, 0, 6], [1500, 0, 0]], f: [['ramp', 520, 120, 26], ['creek', 700, 110], ['sand', 1180, -60, 80, 22]] },
        { n: 'Lagoon Bend', par: 3, w: 270, p: [[0, 0, 0], [700, 0, 0], [1150, -380, 0]], f: [['pond', 740, -40, 70], ['sand', 1030, 60, 60, 18]] },
        { n: 'Tide Pools', par: 3, w: 300, p: [[0, 0, 0], [1450, 0, 0]], f: [['pond', 430, 70, 55], ['pond', 760, -70, 60], ['pond', 1080, 50, 50], ['sand', 1240, -80, 55, 18]] },
        { n: 'Pipe Dream', par: 3, w: 250, p: [[0, 0, 0], [900, 0, 0], [1150, 260, -10], [900, 520, -20], [0, 520, -26]], f: [['tunnel', 760, 1880, 66], ['sand', 1150, -40, 60, 20]] },
        { n: 'Coconut Grove', par: 3, w: 290, p: [[0, 0, 0], [500, 0, 0], [800, 260, 0], [1500, 260, 0]], f: [['post', 300, 60, 22], ['post', 420, -70, 22], ['post', 900, 40, 22], ['post', 1050, -60, 22], ['post', 1200, 70, 22]] },
        { n: 'Sandbar', par: 4, w: 280, p: [[0, 0, 0], [900, 0, 0], [1400, -300, 0], [2000, -300, 0]], f: [['sand', 600, 0, 110, 24, 1.6], ['creek', 1580, 90], ['bridge', 1580, -60, 70], ['sand', 1850, 60, 60, 20]] },
        { n: 'The Reef', par: 5, w: 280, p: [[0, 0, 10], [800, 0, 10], [1200, 350, 0], [2000, 350, 0], [2400, 0, -6], [2800, 0, -6]], f: [['ramp', 560, 120, 26], ['creek', 740, 100], ['pond', 1500, 60, 70], ['sand', 1720, -70, 70, 22], ['creek', 2560, 90], ['bridge', 2560, 70, 70]] }
      ] },
      { id: 'canyon', th: 'canyon', name: 'Red Canyon', blurb: 'Switchbacks down the canyon walls, hoodoos and a mill.', holes: [
        { n: 'Downhill Dash', par: 2, w: 260, p: [[0, 0, 90], [1250, 0, 0]], f: [['hill', 1040, 0, 80, 10]] },
        { n: 'Switchback', par: 3, w: 240, p: [[0, 0, 0], [750, 0, -30], [980, 220, -50], [750, 440, -70], [0, 440, -100]] },
        { n: 'Canyon Mill', par: 3, w: 280, p: [[0, 0, 0], [1450, 0, 0]], f: [['post', 400, -60, 26], ['post', 500, 70, 22], ['mill', 800], ['post', 1150, 0, 24]] },
        { n: 'Mesa Climb', par: 3, w: 280, p: [[0, 0, 0], [450, 0, 30], [950, 0, 100], [1300, 260, 100]], f: [['bank', 950, 1250, .12]] },
        { n: 'Rattlesnake', par: 4, w: 230, p: [[0, 0, 0], [400, 0, 0], [640, 300, -10], [1040, 300, -10], [1280, 0, -20], [1700, 0, -20]] },
        { n: 'Arroyo', par: 3, w: 290, p: [[0, 0, 0], [1450, 0, 0]], f: [['gully', 560, 150, 34], ['gully', 950, 130, 26], ['post', 1200, 50, 20]] },
        { n: 'Hoodoos', par: 3, w: 300, p: [[0, 0, 0], [1500, 0, -20]], f: [['post', 320, 60, 24], ['post', 480, -50, 26], ['post', 640, 70, 22], ['post', 800, -60, 26], ['post', 960, 40, 24], ['post', 1120, -70, 22]] },
        { n: 'Rim Trail', par: 5, w: 260, p: [[0, 0, 0], [600, 0, 60], [1000, 300, 60], [1600, 300, 0], [2000, 0, -30], [2600, 0, -30]], f: [['mill', 1250], ['gully', 2200, 130, 30], ['post', 2400, 60, 22]] }
      ] },
      { id: 'volcano', th: 'volcano', name: 'Ember Caldera', blurb: 'Basalt lanes over running lava. Jump the flows.', holes: [
        { n: 'First Steps', par: 3, w: 300, p: [[0, 0, 0], [1350, 0, 0]], f: [['pond', 450, 90, 60, 1], ['pond', 800, -90, 60, 1], ['pond', 1100, 80, 50, 1]] },
        { n: 'Lava Leap', par: 3, w: 280, p: [[0, 0, 10], [1450, 0, 0]], f: [['ramp', 520, 120, 28], ['creek', 700, 110, 1], ['hill', 1100, 60, 100, 14]] },
        { n: 'Crater Bowl', par: 3, w: 320, p: [[0, 0, 0], [1400, 0, 0]], f: [['bowl', 700, 0, 170, 30], ['post', 700, 0, 22]] },
        { n: 'Ash Slope', par: 3, w: 270, p: [[0, 0, 70], [1400, 0, 0]], f: [['mover', 600, 0, 110, 80, 1.3], ['pond', 950, -80, 55, 1], ['pond', 1050, 80, 55, 1]] },
        { n: 'Obsidian Maze', par: 4, w: 300, p: [[0, 0, 0], [1600, 0, 0]], f: [['wall', 400, -60, 180, 90], ['wall', 700, 60, 180, 90], ['wall', 1000, -60, 180, 90], ['wall', 1300, 60, 180, 90]] },
        { n: 'Twin Flows', par: 4, w: 280, p: [[0, 0, 0], [800, 0, 0], [1200, 300, -10], [1900, 300, -10]], f: [['creek', 550, 90, 1], ['bridge', 550, 70, 70], ['creek', 1550, 90, 1], ['bridge', 1550, -70, 70]] },
        { n: 'Vent Field', par: 4, w: 300, p: [[0, 0, 0], [700, 0, 0], [1100, -300, 0], [1800, -300, 0]], f: [['hill', 400, 40, 110, 22], ['bowl', 900, -30, 120, 22], ['hill', 1300, 40, 100, 20], ['bowl', 1550, -40, 100, 20]] },
        { n: 'Caldera Rim', par: 5, w: 270, p: [[0, 0, 0], [700, 0, 40], [1100, 300, 40], [1800, 300, 0], [2200, 0, -20], [2800, 0, -20]], f: [['mover', 450, 0, 100, 80, 1.2], ['ramp', 1500, 110, 26], ['creek', 1670, 100, 1], ['bowl', 2450, 0, 140, 22]] }
      ] },
      { id: 'glacier', th: 'glacier', name: 'Glacier Bay', blurb: 'Ice that barely slows a ball, banked turns and crevasses.', holes: [
        { n: 'First Ice', par: 2, w: 280, p: [[0, 0, 0], [1200, 0, 0]], f: [['hill', 940, 0, 90, 10]] },
        { n: 'Bobsled', par: 3, w: 250, p: [[0, 0, 80], [600, 0, 50], [900, 300, 30], [1300, 300, 10], [1600, 0, 0]], f: [['bank', 600, 900, -.16], ['bank', 1300, 1600, .16]] },
        { n: 'Ice Posts', par: 3, w: 300, p: [[0, 0, 0], [1450, 0, 0]], f: [['post', 350, 40, 22], ['post', 550, -60, 22], ['post', 750, 50, 22], ['post', 950, -40, 22], ['post', 1150, 60, 22]] },
        { n: 'Crevasse', par: 3, w: 290, p: [[0, 0, 0], [1450, 0, 0]], f: [['creek', 700, 100], ['bridge', 700, -60, 70], ['bridge', 700, 80, 60]] },
        { n: 'Frozen Mill', par: 3, w: 300, p: [[0, 0, 0], [1450, 0, 0]], f: [['mill', 720], ['bowl', 1100, 0, 110, 16]] },
        { n: 'Glacier Bend', par: 4, w: 270, p: [[0, 0, 20], [800, 0, 20], [1150, 350, 0], [1150, 900, -20]], f: [['bank', 800, 1150, .14], ['hill', 1450, -40, 90, 14]] },
        { n: 'Snow Drifts', par: 4, w: 300, p: [[0, 0, 0], [1700, 0, 0]], f: [['hill', 350, -40, 120, 18], ['hill', 700, 50, 120, 20], ['hill', 1050, -40, 120, 18], ['sand', 1380, 60, 70, 20]] },
        { n: 'Avalanche', par: 5, w: 270, p: [[0, 0, 120], [700, 0, 80], [1000, 300, 50], [1600, 300, 20], [2000, 0, 0], [2700, 0, 0]], f: [['bank', 700, 1000, .14], ['mill', 1300], ['bank', 1600, 2000, -.14], ['creek', 2300, 100], ['bridge', 2300, 0, 70]] }
      ] },
      { id: 'night', th: 'night', name: 'Moon Garden', blurb: 'Moonlit lanes, glowing posts and hollows that bend a putt.', holes: [
        { n: 'Moonrise', par: 3, w: 300, p: [[0, 0, 0], [1400, 0, 0]], f: [['bowl', 500, 0, 150, 26], ['hill', 950, 0, 120, 18]] },
        { n: 'Firefly Lane', par: 3, w: 270, p: [[0, 0, 0], [600, 0, 0], [900, -300, 0], [1500, -300, 0]], f: [['post', 500, 60, 20, 1], ['post', 700, -50, 20, 1], ['post', 1150, 40, 20, 1]] },
        { n: 'Lantern Loop', par: 4, w: 260, p: [[0, 0, 0], [800, 0, 0], [1060, 260, 0], [800, 520, 0], [200, 520, 0], [200, 900, 0]], f: [['bowl', 1000, 0, 120, 20], ['post', 1700, 0, 22, 1]] },
        { n: 'Star Pipe', par: 3, w: 260, p: [[0, 0, 0], [800, 0, 0], [1050, 260, -10], [800, 520, -20], [0, 520, -30]], f: [['tunnel', 650, 1850, 66], ['hill', 1080, 0, 90, 16]] },
        { n: 'Orbit', par: 3, w: 340, p: [[0, 0, 0], [1400, 0, 0]], f: [['bowl', 700, 0, 200, 34], ['post', 700, 0, 24, 1], ['post', 700, 130, 16, 1], ['post', 700, -130, 16, 1]] },
        { n: 'Night Mill', par: 4, w: 290, p: [[0, 0, 0], [900, 0, 0], [1300, -300, 0], [1900, -300, 0]], f: [['mill', 600], ['bowl', 1600, 0, 120, 22]] },
        { n: 'Glow Bridge', par: 4, w: 280, p: [[0, 0, 10], [1800, 0, 0]], f: [['creek', 650, 100], ['bridge', 650, 70, 64], ['hill', 1100, -50, 120, 18], ['creek', 1450, 90], ['bridge', 1450, -60, 64]] },
        { n: 'Eclipse', par: 5, w: 280, p: [[0, 0, 0], [700, 0, 0], [1100, 300, -20], [1800, 300, -20], [2200, 0, -40], [2800, 0, -40]], f: [['bowl', 450, 0, 130, 24], ['mill', 1400], ['ramp', 1950, 110, 26], ['creek', 2120, 100], ['post', 2550, 0, 22, 1]] }
      ] }
    ];

    /* Championship routing. Preserve obstacle sizes and jump geometry while
       giving the original holes longer approaches and putting runs. */
    const routeLength = p => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
    function stretchHole(h, scale) {
      const f = (h.f || []).map(q => {
        const a = q.slice(); a[1] *= scale;
        if (a[0] === 'bank' || a[0] === 'tunnel') a[2] *= scale;
        if (a[0] === 'ramp') {
          const creek = (h.f || []).find(c => c[0] === 'creek' && c[1] > q[1] && c[1] - q[1] < q[2] + 120);
          if (creek) a[1] = creek[1] * scale - (creek[1] - q[1]);
        }
        return a;
      });
      const p = h.p.map(q => [q[0] * scale, q[1] * scale, q[2]]);
      return { ...h, p, f, par: Math.max(h.par + 1, Math.ceil(routeLength(p) / 1050) + 1) };
    }
    for (const c of COURSES) c.holes = c.holes.map(h => stretchHole(h, 1.65));

    THEMES.forest = { ...THEMES.meadow, name: 'Cedar Valley', rail: 'stone',
      lane: ['#4d8049', '#457542'], land: ['#567044', '#354f32', '#777165', '#bcb49c'],
      railTop: '#a6a292', railFace: '#797b6b', railDark: '#51584b', flora: 'forest',
      sky: ['#7797af', '#e2e7d9'], sun: [-.65, -.32, .69], sunC: ['#ffe6b8', 1.5],
      amb: ['#c1d8db', .48, '#637454', .3], hills: 115, peaks: 1500, cloud: .62 };
    THEMES.coast = { ...THEMES.meadow, name: 'Atlantic Dunes', rail: 'stone',
      lane: ['#668949', '#5c7e42'], land: ['#a5a372', '#7d8d55', '#8a8778', '#d8caaa'],
      railTop: '#b5af9d', railFace: '#878578', railDark: '#555950', flora: 'coast',
      sky: ['#6e9bb7', '#e4eced'], sun: [-.6, -.3, .74], sunC: ['#fff0d8', 1.6],
      amb: ['#c1d8ed', .48, '#86896a', .3], hills: 75, peaks: 440, sea: -28, cloud: .6 };

    /* Ten long challenges extend each original eight-hole layout to 18.
       Stations are measured along each route, so hazards remain on the lane.
       Each destination gets its own hazards, elevations, names and direction. */
    const LONG_ROUTES = [
      [[0,0,0],[880,0,10],[1460,440,22],[2460,440,8],[3100,50,0]],
      [[0,0,0],[1050,0,0],[1510,490,8],[1080,960,2],[100,960,-12]],
      [[0,0,0],[760,0,20],[1290,-540,55],[2200,-540,55],[2860,40,22],[3500,40,12]],
      [[0,0,10],[1160,0,10],[1700,500,-8],[2920,500,-8],[3470,0,-16]],
      [[0,0,0],[700,0,16],[1190,540,42],[2040,540,48],[2590,1050,20],[3390,1050,8]],
      [[0,0,12],[1180,0,12],[1620,-500,8],[2780,-500,0],[3340,0,-8]],
      [[0,0,0],[1000,0,8],[1590,480,20],[2630,480,20],[3170,950,0]],
      [[0,0,35],[1250,0,35],[1820,540,6],[2950,540,6],[3550,1100,-12]],
      [[0,0,0],[900,0,18],[1500,-520,36],[2600,-520,36],[3200,0,12],[3900,0,0]],
      [[0,0,12],[1260,0,12],[1900,570,38],[3100,570,22],[3740,0,0],[4600,0,0]]
    ];
    const LONG_NAMES = {
      meadow: ['Orchard Avenue','Millpond Passage','Shepherds Rise','Willow Bridges','Rose Terrace','Old Stone Culvert','Millers Walk','Brookside Run','Estate Gardens','The Grand Mill'],
      lagoon: ['Palm Promenade','Coral Grotto','Lookout Ridge','Three Sandbars','Hibiscus Terrace','Turtle Passage','Trade Wind Mill','Mangrove Creek','Pearl Peninsula','Oceanfront Finish'],
      canyon: ['Juniper Trail','Prospectors Tunnel','Eagle Mesa','Dry Creek Bridges','Painted Ridge','Copper Cut','Pioneer Mill','Sandstone Wash','High Desert Trail','Grand Canyon Run'],
      volcano: ['Cinder Avenue','Lava Tube','Obsidian Ridge','Furnace Bridges','Ashen Terrace','Basalt Passage','Ember Mill','Molten Crossing','Crater Traverse','Fire Mountain'],
      glacier: ['Alpine Approach','Blue Ice Tunnel','Summit Ascent','Meltwater Bridges','Snowfield Terrace','Frost Passage','North Wind Mill','Glacial Stream','Polar Traverse','Last Avalanche'],
      night: ['Lantern Avenue','Moonstone Tunnel','Stargazer Ridge','Silver Bridges','Jasmine Terrace','Firefly Passage','Midnight Mill','Reflection Pools','Observatory Walk','Celestial Gardens'],
      forest: ['Cedar Avenue','Badgers Tunnel','Fern Ridge','Timber Bridges','Mossy Terrace','Root Cellar','Sawmill Reach','Salmon Creek','Redwood Traverse','The Old Cedar Mill'],
      coast: ['Dune Walk','Smugglers Tunnel','Headland Rise','Estuary Bridges','Sea Grass Terrace','Harbour Culvert','Salt Wind Mill','Tidal Creek','Clifftop Traverse','Lighthouse Links']
    };
    function longHole(ci, j, th) {
      const sign = ci % 2 ? -1 : 1, scale = .96 + ci * .025;
      const p = LONG_ROUTES[j].map(([x,y,z]) => [x * scale, y * sign * scale, z * (th === 'glacier' ? -.8 : 1)]);
      const len = routeLength(p), w = 280 + (j % 3) * 12;
      const at = u => Math.round(u * len), lava = th === 'volcano' ? 1 : 0;
      const f = [];
      const bunker = (u,t,r=66) => f.push(['sand',at(u),t,r,18]);
      const crossing = (u,t) => { f.push(['creek',at(u),90,lava],['bridge',at(u),t,90]); };
      if (j === 0) { bunker(.18,78); f.push(['hill',at(.4),-48,120,15],['mill',at(.72),88]); bunker(.87,-76); }
      if (j === 1) { f.push(['tunnel',at(.22),at(.78),76],['lake',at(.17),sign * 430,180]); bunker(.48,65); f.push(['post',at(.61),-64,22]); }
      if (j === 2) { f.push(['bank',at(.25),at(.4),.08],['gully',at(.61),150,24]); bunker(.16,75); bunker(.83,-75); }
      if (j === 3) { crossing(.2,-65); crossing(.59,60); bunker(.8,-75); }
      if (j === 4) { f.push(['bowl',at(.18),-36,120,18],['hill',at(.55),45,125,18],['mill',at(.77),88]); }
      if (j === 5) { f.push(['tunnel',at(.26),at(.71),76],['pond',at(.83),82,50,lava]); bunker(.14,-75); }
      if (j === 6) { f.push(['mill',at(.16),88],['mill',at(.66),88]); bunker(.42,78); f.push(['hill',at(.85),-50,120,14]); }
      if (j === 7) { const s=at(.22); f.push(['ramp',s-180,120,26,-60,140],['creek',s,90,lava],['bridge',s,78,76]); crossing(.65,-60); bunker(.86,76); }
      if (j === 8) { f.push(['post',at(.15),-62,23],['post',at(.23),65,23],['gully',at(.49),140,26],['bowl',at(.79),0,135,18]); bunker(.64,76); }
      if (j === 9) { f.push(['mill',at(.13),88]); crossing(.45,65); f.push(['hill',at(.7),-50,125,16],['mill',at(.88),88]); bunker(.6,76); }
      // Distinct course furniture on long stretches, away from the cup.
      if (th === 'canyon') f.push(['post',at(.93),-70,24]);
      if (th === 'forest') f.push(['hill',at(.93),65,95,12]);
      if (th === 'coast' || th === 'lagoon') bunker(.94,-72,50);
      if (th === 'night') f.push(['post',at(.93),65,18,1]);
      return { n: LONG_NAMES[th][j], par: Math.ceil(len / (th === 'glacier' ? 1300 : 1050)) + 1, w, p, f, cup: 140 };
    }
    COURSES.push(
      { id:'forest', th:'forest', name:'Cedar Valley', blurb:'Stone-lined fairways, cedar groves and the old sawmill.', holes: [
        {n:'Woodland Welcome',par:4,w:300,p:[[0,0,0],[900,0,12],[1450,400,22],[2450,400,12]],f:[['sand',650,75,70,18],['hill',1750,-50,110,16]]},
        {n:'Fern Hollow',par:4,w:290,p:[[0,0,0],[950,0,0],[1420,-480,18],[2460,-480,8]],f:[['bowl',650,0,130,20],['sand',1940,75,65,18]]},
        {n:'The Watermill',par:4,w:300,p:[[0,0,0],[1250,0,0],[1830,460,8],[2840,460,8]],f:[['mill',820,88],['creek',2340,90],['bridge',2340,-60,90]]},
        {n:'Foxglove Bend',par:4,w:280,p:[[0,0,0],[820,0,14],[1380,490,22],[2410,490,10]],f:[['sand',560,-75,68,18],['hill',1610,50,120,18],['sand',2050,-68,60,18]]},
        {n:'Stone Arch',par:4,w:280,p:[[0,0,0],[1100,0,0],[1540,520,0],[1100,1040,-12],[100,1040,-16]],f:[['tunnel',850,3450,76],['sand',1900,-60,70,18]]},
        {n:'Deer Run',par:4,w:290,p:[[0,0,40],[1000,0,30],[1610,-460,5],[2790,-460,0]],f:[['post',680,65,22],['post',1380,-65,22],['gully',2270,130,22]]},
        {n:'Kingfisher Brook',par:5,w:300,p:[[0,0,8],[1350,0,8],[1960,500,0],[3130,500,0]],f:[['creek',800,90],['bridge',800,65,90],['mill',2600,88]]},
        {n:'Rangers Lodge',par:5,w:290,p:[[0,0,0],[980,0,25],[1600,480,40],[2820,480,18],[3380,0,0]],f:[['hill',600,-50,120,16],['sand',2080,70,70,18],['mill',3160,88]]}
      ]},
      { id:'coast', th:'coast', name:'Atlantic Dunes', blurb:'Rolling dunes, harbour tunnels and weathered coastal mills.', holes: [
        {n:'First Light',par:4,w:310,p:[[0,0,12],[1100,0,12],[1690,-450,20],[2560,-450,8]],f:[['sand',600,-80,80,20],['sand',2040,80,75,18]]},
        {n:'Marram Grass',par:4,w:290,p:[[0,0,0],[940,0,18],[1510,480,28],[2550,480,0]],f:[['hill',560,-60,125,18],['bowl',1930,45,120,18]]},
        {n:'Harbour Mill',par:4,w:300,p:[[0,0,0],[1350,0,0],[1900,-420,10],[2900,-420,10]],f:[['mill',920,88],['sand',2420,-78,75,18]]},
        {n:'Oyster Creek',par:4,w:300,p:[[0,0,8],[1020,0,8],[1660,520,0],[2800,520,0]],f:[['creek',650,90],['bridge',650,65,90],['pond',2210,-85,52]]},
        {n:'The Smugglers Cut',par:5,w:280,p:[[0,0,0],[1200,0,0],[1640,-520,0],[1200,-1040,-8],[0,-1040,-12]],f:[['tunnel',940,3750,76],['sand',2150,68,75,18]]},
        {n:'Gull Point',par:4,w:280,p:[[0,0,0],[880,0,28],[1480,520,45],[2650,520,18]],f:[['bank',1250,1650,.1],['sand',2040,70,75,18]]},
        {n:'Breakwater',par:5,w:290,p:[[0,0,10],[1310,0,10],[1960,-520,0],[3230,-520,0]],f:[['creek',770,90],['bridge',770,-65,90],['mill',2620,88]]},
        {n:'Sandy Headland',par:5,w:300,p:[[0,0,0],[1100,0,20],[1730,530,30],[2960,530,8],[3500,0,0]],f:[['sand',650,78,80,20],['hill',2170,-50,120,16],['sand',3100,78,75,18]]}
      ]}
    );
    COURSES.forEach((c,ci) => { for (let j=0;j<LONG_ROUTES.length;j++) c.holes.push(longHole(ci,j,c.th)); });

    /* ----------------------------------------------------- the ball ----- */
    /* World units are the old screen's pixels; the ball is 9 across the
       middle. Gravity is a touch under true scale, which keeps slopes readable
       and lets a jump hang long enough to watch. */
    const R = 9, GRAV = 2600, CUPR = 20, CUPD = 34, RAILH = 22, MAXV = 1150, PULL = 240;
    /* Tunnels have a round bore, a stone lining, masonry portals and an
       embankment made from the course's own ground. The earth mesh stays
       above the lining so it cannot visually obstruct the passage.
       The bore's axis sits TUNH - w/2 above its floor, which puts the top of
       the circle exactly at TUNH — the ceiling the ball is held under. */
    const TUNH = 44, TUNWALL = 8, TUNBED = 64, TUNBW = 76;
    const sst = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

    /* smooth value noise for the country, seeded per hole so every player's
       valley is the same valley */
    function noiser(seed) {
      const hash = (x, y) => {
        let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 144269);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      const vn = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
      const fbm = (x, y, o) => {
        let s = 0, a = .5, f = 1;
        for (let i = 0; i < (o || 4); i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= .5; }
        return s / (1 - Math.pow(.5, o || 4));
      };
      return { vn, fbm };
    }

    /* ------------------------------------------------ building a hole --- */
    /* Turns a hole's description into the world the ball lives in: the
       spine and its frames, the height of the lane and of the country at any
       point, and every solid thing with its position worked out. */
    function compile(def, th, seed) {
      const N = noiser(seed);
      const segs = [];
      let S = 0;
      for (let i = 0; i < def.p.length - 1; i++) {
        const a = def.p[i], b = def.p[i + 1], Lg = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], tx: (b[0] - a[0]) / Lg, ty: (b[1] - a[1]) / Lg, L: Lg, s0: S });
        S += Lg;
      }
      const len = S, hw = def.w / 2;
      /* the lane's rise and fall: a smooth curve through each corner's height */
      const knots = def.p.map((p, i) => ({ s: i ? segs[i - 1].s0 + segs[i - 1].L : 0, z: p[2] || 0, m: 0 }));
      for (let i = 0; i < knots.length; i++) {
        const a = knots[Math.max(0, i - 1)], b = knots[Math.min(knots.length - 1, i + 1)];
        knots[i].m = (b.z - a.z) / ((b.s - a.s) || 1);
      }
      function zAt(s) {
        s = clamp(s, 0, len);
        let i = 0;
        while (i < knots.length - 2 && s > knots[i + 1].s) i++;
        const a = knots[i], b = knots[i + 1], d = (b.s - a.s) || 1, u = (s - a.s) / d, u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * a.z + (u3 - 2 * u2 + u) * d * a.m + (-2 * u3 + 3 * u2) * b.z + (u3 - u2) * d * b.m;
      }
      function frame(s) {
        s = clamp(s, 0, len);
        let g = segs[0];
        for (const q of segs) if (s >= q.s0) g = q;
        const u = s - g.s0;
        return { x: g.ax + g.tx * u, y: g.ay + g.ty * u, tx: g.tx, ty: g.ty, nx: -g.ty, ny: g.tx, z: zAt(s), a: Math.atan2(g.ty, g.tx) };
      }
      const at = (s, t) => { const f = frame(s); return [f.x + f.nx * t, f.y + f.ny * t]; };
      /* the nearest point of the spine, how far away it is, and which side */
      function nearMain(x, y) {
        let bg = segs[0], bu = 0, bd = 1e18;
        for (const g of segs) {
          const u = clamp((x - g.ax) * g.tx + (y - g.ay) * g.ty, 0, g.L);
          const qx = g.ax + g.tx * u, qy = g.ay + g.ty * u, d = (x - qx) * (x - qx) + (y - qy) * (y - qy);
          if (d < bd) { bd = d; bg = g; bu = u; }
        }
        const qx = bg.ax + bg.tx * bu, qy = bg.ay + bg.ty * bu, d = Math.sqrt(bd);
        return { s: bg.s0 + bu, sv: bg.s0 + bu, x: qx, y: qy, d, t: (x - qx) * -bg.ty + (y - qy) * bg.tx, tx: bg.tx, ty: bg.ty,
                 hw, e: d - hw, tun: null, u: 0 };
      }
      /* The lane is the main run plus any tunnels cut across from one part of
         it to another: the nearest of them is the one whose edge the point
         is furthest inside (e, the distance past that edge, is negative
         inside). A tunnel's s runs from where it leaves to where it rejoins,
         so the rest of the hole still reads as progress down the lane. */
      const TUN = [];
      function near(x, y) {
        const q = nearMain(x, y);
        for (const tn of TUN) {
          const u = clamp((x - tn.ax) * tn.tx + (y - tn.ay) * tn.ty, 0, tn.L);
          const px = tn.ax + tn.tx * u, py = tn.ay + tn.ty * u, d = Math.hypot(x - px, y - py);
          if (d - tn.hw < q.e) {
            q.s = lerp(tn.sa, tn.sb, u / tn.L); q.sv = tn.sa + u; q.x = px; q.y = py; q.d = d;
            q.t = (x - px) * -tn.ty + (y - py) * tn.tx; q.tx = tn.tx; q.ty = tn.ty; q.hw = tn.hw; q.e = d - tn.hw; q.tun = tn; q.u = u;
          }
        }
        return q;
      }

      /* ---- what is set along the lane ---- */
      const F = { sand: [], hill: [], bowl: [], creek: [], ramp: [], bank: [], gully: [], pond: [], lake: [],
                  wall: [], post: [], mill: [], mover: [], tunnel: TUN };
      const bridges = [], tunnels = [];
      for (const f of (def.f || [])) {
        const k = f[0], s = f[1];
        if (k === 'sand' || k === 'hill' || k === 'bowl' || k === 'pond' || k === 'lake') {
          const [x, y] = at(s, f[2]), fr = frame(s);
          const o = { x, y, s, t: f[2], r: f[3], tx: fr.tx, ty: fr.ty };
          if (k === 'sand') { o.d = f[4] || 22; o.e = f[5] || 1; }
          if (k === 'hill') o.h = f[4];
          if (k === 'bowl') o.d = f[4];
          if (k === 'pond') { o.lava = !!f[4]; o.level = fr.z - 13; }
          if (k === 'lake') o.level = fr.z - 16;
          F[k].push(o);
        } else if (k === 'creek' || k === 'gully') {
          const fr = frame(s);
          const o = { s, x: fr.x, y: fr.y, tx: fr.tx, ty: fr.ty, w: f[2], ph: s * .013 };
          if (k === 'creek') { o.lava = !!f[3]; o.level = fr.z - 16; o.bed = fr.z - 46; o.br = []; }
          else o.d = f[3] || 30;
          F[k].push(o);
        } else if (k === 'bridge') bridges.push({ s, t: f[2], w: f[3] });
        else if (k === 'ramp') F.ramp.push({ s, len: f[2], h: f[3], t: f[4] || 0, w: f[5] || 0 });
        else if (k === 'bank') F.bank.push({ s0: f[1], s1: f[2], k: f[3] });
        else if (k === 'wall') {
          const [x, y] = at(s, f[2]), fr = frame(s);
          F.wall.push({ x, y, a: fr.a + (f[4] || 0) * Math.PI / 180, hx: f[3] / 2, hy: 9, s });
        } else if (k === 'post') { const [x, y] = at(s, f[2]); F.post.push({ x, y, r: f[3], kick: f[4] || 0, s }); }
        else if (k === 'mill') F.mill.push({ s, gap: f[2] || 76, fr: frame(s) });
        else if (k === 'mover') F.mover.push({ s, t: f[2], len: f[3], amp: f[4], spd: f[5], fr: frame(s) });
        else if (k === 'tunnel') tunnels.push({ sa: s, sb: f[2], w: f[3] || 80 });
      }
      for (const b of bridges) {
        let c = null, bd = 1e9;
        for (const q of F.creek) { const d = Math.abs(q.s - b.s); if (d < bd) { bd = d; c = q; } }
        if (c) c.br.push(b);
      }
      const bankAt = s => {
        let k = 0;
        for (const b of F.bank) k += b.k * sst((s - b.s0 + 60) / 120) * (1 - sst((s - b.s1 + 60) / 120));
        return k;
      };
      /* A tunnel: a narrow covered lane cut straight across from one part of
         the hole to another — a shortcut the ball has to roll all the way
         through. Where it runs inside the main lane its floor is that lane's
         floor; out across the gap it runs straight from one side's height to
         the other's. [u0, u1] is the stretch out in the open, under its roof. */
      for (const tu of tunnels) {
        const A = frame(tu.sa), B = frame(tu.sb), L = Math.hypot(B.x - A.x, B.y - A.y);
        const tn = { sa: tu.sa, sb: tu.sb, hw: tu.w / 2, ax: A.x, ay: A.y, bx: B.x, by: B.y, tx: (B.x - A.x) / L, ty: (B.y - A.y) / L, L, a: Math.atan2(B.y - A.y, B.x - A.x) };
        const NS = Math.max(8, Math.ceil(L / 8)), zs = [], inside = [];
        for (let i = 0; i <= NS; i++) {
          const u = L * i / NS, q = nearMain(A.x + tn.tx * u, A.y + tn.ty * u);
          inside.push(q.d < hw); zs.push(q.d < hw ? zAt(q.s) + q.t * bankAt(q.s) : 0);
        }
        let i0 = 0; while (i0 < NS && inside[i0 + 1]) i0++;              // last sample still in the lane it leaves
        let i1 = NS; while (i1 > 0 && inside[i1 - 1]) i1--;               // first sample back in the lane it joins
        for (let i = i0 + 1; i < i1; i++) zs[i] = lerp(zs[i0], zs[i1], (i - i0) / Math.max(1, i1 - i0));
        tn.zs = zs; tn.NS = NS; tn.u0 = L * i0 / NS; tn.u1 = L * i1 / NS;
        TUN.push(tn);
      }
      const tunZ = (tn, u) => { const k = clamp(u / tn.L, 0, 1) * tn.NS, i = Math.min(tn.NS - 1, Math.floor(k)); return lerp(tn.zs[i], tn.zs[i + 1], k - i); };
      /* the bare floor under a point: the lane's rise and fall, its banking,
         or a tunnel's run */
      const floorAt = q => q.tun ? tunZ(q.tun, q.u) : zAt(q.s) + q.t * bankAt(q.s);
      /* where a rail stands: the floor at the lane's edge on that side */
      const wallBase = q => q.tun ? tunZ(q.tun, q.u) : zAt(q.s) + (q.t >= 0 ? 1 : -1) * hw * bankAt(q.s);
      /* how far x,y lies from a creek's centre line, down the lane — the far
         reaches wander a little, so a river does not look ruled */
      const creekD = (c, x, y) => {
        const dc = (x - c.x) * -c.ty + (y - c.y) * c.tx;
        const wob = Math.sin(dc * .0035 + c.ph) * 70 * sst((Math.abs(dc) - hw - 60) / 400);
        return { dl: Math.abs((x - c.x) * c.tx + (y - c.y) * c.ty - wob), dc };
      };

      /* ---- the height of the lane ---- */
      function laneZ(x, y, q) {
        q = q || near(x, y);
        let z = floorAt(q);
        for (const h of F.hill) {
          const r2 = ((x - h.x) * (x - h.x) + (y - h.y) * (y - h.y)) / (h.r * h.r);
          if (r2 < 1) { const u = 1 - r2; z += h.h * u * u; }
        }
        for (const b of F.bowl) {
          const r2 = ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y)) / (b.r * b.r);
          if (r2 < 1) { const u = 1 - r2; z -= b.d * u * u; }
        }
        for (const s of F.sand) {
          const dx = x - s.x, dy = y - s.y;
          const rho = Math.hypot((dx * s.tx + dy * s.ty) / (s.r * s.e), (-dx * s.ty + dy * s.tx) / s.r);
          if (rho < 1) z -= s.d * sst((1 - rho) / .45);
        }
        if (!q.tun) for (const r of F.ramp) {
          const u = q.s - r.s;
          if (u > 0 && u < r.len && (!r.w || Math.abs(q.t - r.t) < r.w / 2)) z += r.h * (u / r.len) * (u / r.len);
        }
        for (const g of F.gully) {
          const dl = Math.abs((x - g.x) * g.tx + (y - g.y) * g.ty);
          if (dl < g.w / 2) z -= g.d * sst(1 - dl / (g.w / 2));
        }
        for (const c of F.creek) {
          const { dl, dc } = creekD(c, x, y);
          if (dl < c.w / 2 + 12) {
            let deck = false;
            for (const b of c.br) if (Math.abs(dc - b.t) < b.w / 2) deck = true;
            if (!deck) z = Math.min(z, lerp(c.bed, z, sst((dl - c.w / 2 + 12) / 24)));
          }
        }
        for (const p of F.pond) {
          const r = Math.hypot(x - p.x, y - p.y) / p.r;
          if (r < 1.2) z = Math.min(z, lerp(p.level - 22, z, sst((r - .75) / .45)));
        }
        return z;
      }

      /* ---- the country round it ---- */
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, zsum = 0;
      for (const p of def.p) { bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]); bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]); zsum += p[2] || 0; }
      const bounds = { x0: bx0 - hw - 40, y0: by0 - hw - 40, x1: bx1 + hw + 40, y1: by1 + hw + 40 };
      const cx0 = (bx0 + bx1) / 2, cy0 = (by0 + by1) / 2, rad = Math.hypot(bx1 - bx0, by1 - by0) / 2 + hw;
      const base = zsum / def.p.length - 14;
      function nat(x, y) {
        const n = N.fbm(x * .0009 + 11.3, y * .0009 + 7.1, 4) - .5;
        let z = base + th.hills * n * 2;
        const rc = Math.hypot(x - cx0, y - cy0);
        const far = sst((rc - rad - 2200) / 6500);
        if (far > 0) {
          const rid = 1 - Math.abs(N.fbm(x * .00035 + 3.7, y * .00035 + 9.2, 5) * 2 - 1);
          z += th.peaks * Math.pow(far, 1.3) * (.3 + .7 * rid);
        }
        if (th.style === 6) {                            /* the lagoon: sea, with sandbars and far islands */
          z = th.sea - 24 + Math.max(0, n) * 110 + far * th.peaks * .7 * (N.vn(x * .0006, y * .0006) > .55 ? 1 : .15);
        } else if (th.style === 7) {                     /* the canyon: stepped mesas */
          const m = N.fbm(x * .0011 + 5.1, y * .0011 + 2.3, 3) * 6;
          const st = Math.floor(m), fr = m - st;
          z += (st + sst((fr - .78) / .22)) * 95 * sst((rc - rad - 200) / 900);
        } else if (th.style === 3) {                     /* the caldera: a volcano on the skyline */
          const vd = Math.hypot(x - (cx0 + 900), y - (cy0 - 7600));
          z += Math.max(0, 3000 - vd * .95) - Math.max(0, 600 - vd) * 1.6;
        }
        return z;
      }
      /* A creek lies level with the lane where it crosses it; out in the
         country it follows the lie of the land instead of cutting through it */
      function creekLevel(c, dc) {
        const k = sst((Math.abs(dc) - hw - 80) / 700);
        return k > 0 ? lerp(c.level, nat(c.x - c.ty * dc, c.y + c.tx * dc) - 16, k) : c.level;
      }
      function land(x, y, q) {
        q = q || near(x, y);
        const edge = floorAt(q) - 9;
        let z = lerp(edge, nat(x, y), sst((q.e - 30) / 520));
        /* Well down under the lane itself, so no bunker or hollow dug into
           it ever shows the ground beneath — but not under a tunnel, where
           the ground is the bank the pipe is driven through and has to come
           up and meet it. */
        if (!q.tun) z -= 60 * (1 - sst((q.e + 10) / 30));
        for (const c of F.creek) {
          const { dl, dc } = creekD(c, x, y), ad = Math.abs(dc);
          if (dl < c.w / 2 + 60 && ad < 2600) {
            const cut = lerp(creekLevel(c, dc) - 30, z, sst((dl - c.w / 2 + 10) / 70));
            z = Math.min(z, lerp(cut, z, sst((ad - 2250) / 350)));
          }
        }
        for (const p of F.pond) {
          const r = Math.hypot(x - p.x, y - p.y) / p.r;
          if (r < 1.3) z = Math.min(z, lerp(p.level - 22, z, sst((r - .75) / .55)));
        }
        /* lakes out beside the lane keep a bank along the rails */
        const shore = sst((q.e - 20) / 60);
        for (const l of F.lake) {
          const r = Math.hypot(x - l.x, y - l.y) / l.r;
          if (r < 1.25) z = Math.min(z, lerp(z, lerp(l.level - 30, z, sst((r - .7) / .55)), shore));
        }
        return z;
      }
      /* the ground under the ball: the lane where there is lane, the country
         beyond the rails */
      function H(x, y, q) {
        q = q || near(x, y);
        return q.e > 14 ? land(x, y, q) : laneZ(x, y, q);
      }
      function inSand(x, y) {
        for (const s of F.sand) {
          const dx = x - s.x, dy = y - s.y;
          if (Math.hypot((dx * s.tx + dy * s.ty) / (s.r * s.e), (-dx * s.ty + dy * s.tx) / s.r) < .9) return true;
        }
        return false;
      }
      /* ---- solid things, with their feet on the lane ---- */
      for (const p of F.post) { p.z0 = laneZ(p.x, p.y); p.top = p.z0 + 34; }
      for (const w of F.wall) { w.z0 = laneZ(w.x, w.y); w.top = w.z0 + 26; }
      for (const m of F.mover) { m.z0 = m.fr.z; m.top = m.z0 + 26; }
      for (const m of F.mill) {
        m.z0 = m.fr.z;
        const side = (hw + 14 - m.gap / 2) / 2;
        m.sides = [-1, 1].map(sg => {
          const t = sg * (m.gap / 2 + side);
          return { x: m.fr.x + m.fr.nx * t, y: m.fr.y + m.fr.ny * t, a: m.fr.a, hx: 30, hy: side, top: m.z0 + 120 };
        });
        m.gate = { x: m.fr.x - m.fr.tx * 42, y: m.fr.y - m.fr.ty * 42, a: m.fr.a, hx: 3, hy: m.gap / 2 + 4, top: m.z0 + 60 };
        m.hub = [m.fr.x - m.fr.tx * 44, m.fr.y - m.fr.ty * 44, m.z0 + 112];
      }
      const teeS = Math.min(80, len * .1);
      const cs = len - (def.cup || 110), cf = frame(cs);
      const cup = { x: cf.x, y: cf.y, z: laneZ(cf.x, cf.y), s: cs };
      return {
        def, par: def.par, name: def.n, len, hw, segs, zAt, frame, at, near, nearMain, laneZ, land, nat, H, inSand, wallBase, floorAt, tunZ, bankAt,
        creekD, creekLevel, F, teeS, cup, bounds, cx0, cy0, rad, N, th, ice: !!th.slick
      };
    }

    /* ------------------------------------------------------- state ------ */
    const ROSTER = RACE ? (RACE.cfg.players || []) : [];
    const PCOL = ['#f8fafc', '#fb7185', '#4ade80', '#fbbf24'];
    const colOfId = id => PCOL[Math.max(0, ROSTER.findIndex(p => p.id === id)) % PCOL.length];
    const nameOfId = id => { const p = ROSTER.find(q => q.id === id); return p ? p.name : 'Player'; };
    const MYIDX = RACE ? Math.max(0, ROSTER.findIndex(p => p.id === RACE.me)) : 0;
    const MYCOL = RACE ? colOfId(RACE.me) : '#f8fafc';

    let phase = 'vote', courseIdx = -1, HOLES = [], T = THEMES.meadow;
    let voteT = 16, myVote = -1, voteCards = [], winnerName = '', winFlash = 0;
    let voteRects = [];        // declared here: anything after the return{} is unreachable TDZ
    /* vote-screen animation state: cards ease rather than snap, tallies count
       up, and each voter chip pops in when their vote lands */
    let voteT0 = 0;
    const cardA = COURSES.map(() => ({ lift: 0, n: 0, bar: 0, pop: 0 }));
    const voterA = {};                                  // "courseIdx:playerId" -> 0..1
    const ez = (v, to, dt, k) => v + (to - v) * Math.min(1, dt * k);
    const ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rest: true, gnd: true, air: false };
    let C = null;                                       // the hole being played, built
    let hole = 0, strokes = 0, clock = 0, hold = true, inTube = false;
    let aiming = false, aimX = 0, aimY = 0, wasDown = false;
    const safe = { x: 0, y: 0 };
    let msg = '', msgT = 0, ending = false, endT = 0, trail = [];
    let sunk = false, waitT = 0, sunkMsg = '', banner = '', bannerT = 0, wasMoving = false;
    let startT = 0, sinkT = 0;
    const scores = [], ripples = [], bumpFx = [];
    /* ---- the clubhouse look ----
       A round of golf is kept on a card, so the readouts are cards: pressed
       stock, pencil ruling, a red flag for the hole and a wax stamp when one
       is finished. It all lives up here with the state because everything
       below the mount's return is only ever reached as a function. */
    const PAPER = '#fffdf2', PAPER2 = '#f1f2e5', INKD = '#183e30', INKM = '#607365', FLAGR = '#d76349', TURFI = '#287650';
    /* the results card's palette, up here with the rest of the state because
       everything below the mount's return is only ever reached as a function */
    const LG_LINE = '#c9a24a', LG_TX = '#f2ece2', LG_MU = 'rgba(242,236,226,.44)';
    /* The course wears the festival's interface: tiles, condensed capitals,
       yellow for the live thing, orange for the one that cost you a stroke. */
    const FH = Hud.FH;
    /* the nameplate is the account's, so it goes where your name goes: on the
       board in a group round, and on a plate at the foot of the screen alone */
    const PLATE = Cos.look('golf', 'plate') || { a: '#c9a24a', b: '#2a2318' };
    /* What you have on, read once here so the 3D course and the flat fallback
       paint the same ball and the same trail — the overhead view used to be
       hard-coded white, which is where a cosmetic went missing. */
    const BALLC = ((Cos.look('golf', 'ball') || {}).a) || '#f8fafc';
    const TRAILC = Cos.look('golf', 'trail') || { a: '#ffffff', s: 'streak' };
    let MYNAME = 'Player';
    try { MYNAME = (Account.user && Account.user.username) || 'Player'; } catch (e) {}
    function fhFit(ctx, txt, maxW, size, o) {
      txt = String(txt).toUpperCase();
      if (FH.capW(ctx, txt, size, o) <= maxW) return txt;
      while (txt.length > 1 && FH.capW(ctx, txt + '…', size, o) > maxW) txt = txt.slice(0, -1);
      return txt + '…';
    }
    const GU = {
      t: 0, last: 0, dt: 0,
      slip: 0,                 // the hole's scorecard slip, sliding in
      hole: -1,
      pow: 0,                  // the eased power, so the meter never jumps
      stamp: 0,                // the wax stamp on a finished hole
      hint: 0                  // how far the "drag back" tag has bobbed in
    };

    /* --------------------------------------------------- course vote ---- */
    function initVote() {
      voteCards = COURSES.map((c, i) => i);
      if (!RACE) { voteT = 0; }                       // solo: pick freely, no clock
    }
    initVote();
    /* Votes are remembered here rather than read live out of RACE.peers.
       That map only holds each peer's LATEST packet, so the moment a peer
       started playing their play packet overwrote their vote — and whoever
       voted first would sit on the vote screen until the timer ran out,
       because the vote they were waiting for had already been clobbered. */
    const peerVote = {};      // id -> course index
    const peerPlay = {};      // id -> course index they are already playing
    function harvestVotes() {
      if (!RACE) return;
      for (const id in RACE.peers) {
        const q = RACE.peers[id];
        if (!q) continue;
        if (q.ph === 'v' && q.v >= 0 && q.v < COURSES.length) peerVote[id] = q.v;
        if (q.ph === 'p') {
          if (q.c >= 0 && q.c < COURSES.length) { peerPlay[id] = q.c; if (peerVote[id] === undefined) peerVote[id] = q.c; }
          else if (peerPlay[id] === undefined) peerPlay[id] = -1;
        }
      }
    }
    /* someone in the group is already on a course — join them, don't re-tally */
    function groupCourse() {
      for (const id in peerPlay) if (peerPlay[id] >= 0) return peerPlay[id];
      return -1;
    }
    function tallies() {
      const t = COURSES.map(() => 0);
      if (myVote >= 0) t[myVote]++;
      for (const id in peerVote) { const v = peerVote[id]; if (v >= 0 && v < t.length) t[v]++; }
      return t;
    }
    function votersFor(i) {
      const out = [];
      if (myVote === i && RACE) out.push(RACE.me);
      for (const id in peerVote) if (peerVote[id] === i) out.push(id);
      return out;
    }
    function everyoneVoted() {
      if (!RACE) return myVote >= 0;
      if (myVote < 0) return false;
      let n = 1;
      for (const id in peerVote) n++;
      return n >= RACE.list().length;
    }
    function pickWinner() {
      const t = tallies();
      let best = 0;
      for (let i = 1; i < t.length; i++) if (t[i] > t[best]) best = i;
      if (t[best] === 0) best = Math.abs((RACE ? RACE.seed : 0) | 0) % COURSES.length;
      return best;
    }
    function beginCourse(ci) {
      courseIdx = ci;
      Store.opt('golf', 'course', String(ci));      // what a restart plays again
      HOLES = COURSES[ci].holes;
      T = THEMES[COURSES[ci].th] || THEMES.meadow;
      scores.length = 0;
      phase = 'play';
      startT = RACE ? 3.2 : 0;
      winnerName = COURSES[ci].name;
      winFlash = 2.2;
      loadHole(0);
    }

    /* ------------------------------------------------------- holes ------ */
    /* everyone tees off side by side across the lane */
    function teeFor(idx) {
      const n = Math.max(1, ROSTER.length);
      const [x, y] = C.at(C.teeS, (idx - (n - 1) / 2) * 34);
      return { x, y };
    }
    function placeBall(x, y) {
      ball.x = x; ball.y = y; ball.z = C.H(x, y) + R;
      ball.vx = ball.vy = ball.vz = 0;
      ball.rest = true; ball.gnd = true; ball.air = false; inTube = false;
    }
    function loadHole(i) {
      hole = i;
      C = compile(HOLES[i], T, 9001 + i * 137 + courseIdx * 7717);
      const t = teeFor(MYIDX);
      placeBall(t.x, t.y);
      safe.x = ball.x; safe.y = ball.y;
      strokes = 0; sunk = false; waitT = 0; sunkMsg = ''; trail = [];
      sinkT = 0; aiming = false;
      ripples.length = 0; bumpFx.length = 0;
      bannerT = 2.8;
      banner = 'HOLE ' + (i + 1) + '  ·  ' + C.name.toUpperCase() + '  ·  PAR ' + C.par;
      if (VIEW) VIEW.newHole();
    }

    const moving = () => !ball.rest;
    const totalStrokes = () => scores.reduce((a, b) => a + (b || 0), 0);
    const parSoFar = () => HOLES.slice(0, scores.length).reduce((a, h) => a + h.par, 0);
    const parTotal = () => HOLES.reduce((a, h) => a + h.par, 0);
    function say(t) { msg = t; msgT = 2.4; }
    /* Particles go to whichever view is up; `h` (how high a burst starts,
       how hard it is thrown up, whether it glows) is only read in 3D. */
    function burst(x, y, o, h) { if (VIEW) VIEW.burst(x, y, o, h); }
    /* where a spot on the course lands on screen */
    function scr(x, y, z) { return VIEW ? VIEW.toScreen(x, y, z || 0) : { x, y }; }

    /* ------------------------------------------------------ physics ----- */
    /* The ball is a sphere on a height field. Each substep it falls, moves,
       is pushed out of anything solid, and then meets the ground: any part of
       its speed going into the surface is taken away (with a bounce if it
       came down hard), and what is left along the surface is dragged down by
       the carpet or the sand. Rolling downhill, stalling uphill, running off
       a ramp's lip — all of it falls out of that, nothing is scripted. */
    function surf(x, y) {
      const q = C.near(x, y), h = C.H(x, y, q), e = 1.5;
      const hx = (C.H(x + e, y) - C.H(x - e, y)) / (2 * e), hy = (C.H(x, y + e) - C.H(x, y - e)) / (2 * e);
      const l = Math.hypot(hx, hy, 1);
      return { h, nx: -hx / l, ny: -hy / l, nz: 1 / l, q };
    }
    /* a solid rectangle turned to angle a; (vx, vy) is its own velocity, so a
       sliding wall shoves the ball rather than just stopping it */
    function boxHit(w, vx, vy) {
      const b = ball;
      if (b.z - R > w.top) return false;
      const c = Math.cos(w.a), s = Math.sin(w.a), rx = b.x - w.x, ry = b.y - w.y;
      const lx = rx * c + ry * s, ly = -rx * s + ry * c;
      const dx = lx - clamp(lx, -w.hx, w.hx), dy = ly - clamp(ly, -w.hy, w.hy), d = Math.hypot(dx, dy);
      if (d >= R) return false;
      let nlx, nly, pen;
      if (d > 1e-4) { nlx = dx / d; nly = dy / d; pen = R - d; }
      else {
        const ex = w.hx - Math.abs(lx), ey = w.hy - Math.abs(ly);
        if (ex < ey) { nlx = Math.sign(lx) || 1; nly = 0; pen = ex + R; } else { nlx = 0; nly = Math.sign(ly) || 1; pen = ey + R; }
      }
      const nx = nlx * c - nly * s, ny = nlx * s + nly * c;
      b.x += nx * pen; b.y += ny * pen;
      const vn = (b.vx - (vx || 0)) * nx + (b.vy - (vy || 0)) * ny;
      if (vn < 0) {
        b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny;
        if (vn < -90) { Sound.thud(); burst(b.x, b.y, { color: '#cbd5e1', count: 3, speed: 90, size: 2.5, life: .25, grav: 0 }, { z: b.z, up: 50, add: false }); }
      }
      return true;
    }
    function postHit(p) {
      const b = ball;
      if (b.z - R > p.top) return;
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), m = p.r + R;
      if (d >= m || d < 1e-4) return;
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * m; b.y = p.y + ny * m;
      const vn = b.vx * nx + b.vy * ny;
      if (vn >= 0) return;
      const e = p.kick ? .95 : .62;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (p.kick) {
        b.vx += nx * 170; b.vy += ny * 170;
        bumpFx.push({ x: p.x, y: p.y, r: p.r, t: 0 });
        Sound.blip(); Sound.pickup();
        burst(b.x, b.y, { color: '#fde047', count: 8, speed: 180, size: 3, life: .35, grav: 0 }, { z: b.z, up: 110 });
      } else if (vn < -80) {
        Sound.thud();
        burst(b.x, b.y, { color: '#cbd5e1', count: 3, speed: 90, size: 2.5, life: .25, grav: 0 }, { z: b.z, up: 50, add: false });
      }
    }
    /* a sliding gate across the lane, and how fast it is going right now */
    function moverBox(m) {
      const off = Math.sin(clock * m.spd) * m.amp, v = Math.cos(clock * m.spd) * m.amp * m.spd, t = m.t + off;
      return { x: m.fr.x + m.fr.nx * t, y: m.fr.y + m.fr.ny * t, a: m.fr.a, hx: 11, hy: m.len / 2, top: m.top,
               vx: m.fr.nx * v, vy: m.fr.ny * v };
    }
    /* windmill sails turn in front of the tunnel; one pointing straight down
       fills the doorway */
    const millAng = m => clock * 1.15 + m.s * .01;
    function millBlocked(m) {
      for (let k = 0; k < 4; k++) {
        let a = (millAng(m) + k * Math.PI / 2) % TAU;
        if (a < 0) a += TAU;
        if (Math.abs(a - Math.PI * 1.5) < .3) return true;
      }
      return false;
    }
    /* The rails along both edges — unless the ball is flying over them.
       Inside a tunnel it is the pipe that holds the ball: walls closer in,
       running the pipe's own rise and fall, and a roof over the top that a
       ball coming in hot cannot climb out past. */
    function railsHit() {
      const b = ball, q = C.near(b.x, b.y), lim = q.hw - R;
      if (q.tun) {
        /* A pipe is round, so the ball is held inside a circle rather than
           between two walls with a lid on: run up the side far enough and it
           comes back down the curve of its own accord. */
        const tn = q.tun, cz = C.tunZ(tn, q.u) + TUNH - tn.hw;
        const dt = q.t, dz = b.z - cz, d = Math.hypot(dt, dz), rim = tn.hw - R;
        if (d > rim && d > 1e-6) {
          const nt = dt / d, nz = dz / d, ox = -tn.ty * nt, oy = tn.tx * nt, push = d - rim;
          b.x -= ox * push; b.y -= oy * push; b.z -= nz * push;
          const vn = b.vx * ox + b.vy * oy + b.vz * nz;
          if (vn > 0) {
            b.vx -= 1.6 * vn * ox; b.vy -= 1.6 * vn * oy; b.vz -= 1.6 * vn * nz;
            if (vn > 90) Sound.thud();
          }
        }
        return;
      }
      if (q.d <= lim || q.d > q.hw + 12) return;
      if (b.z - R > C.wallBase(q) + RAILH) return;
      const nx = (b.x - q.x) / q.d, ny = (b.y - q.y) / q.d;
      b.x = q.x + nx * lim; b.y = q.y + ny * lim;
      const vn = b.vx * nx + b.vy * ny;
      if (vn > 0) {
        b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny;
        if (vn > 90) { Sound.thud(); burst(b.x, b.y, { color: '#cbd5e1', count: 3, speed: 90, size: 2.5, life: .25, grav: 0 }, { z: b.z, up: 50, add: false }); }
      }
    }
    function friction(h, s) {
      const b = ball;
      const vn = b.vx * s.nx + b.vy * s.ny + b.vz * s.nz;
      let tx = b.vx - vn * s.nx, ty = b.vy - vn * s.ny, tz = b.vz - vn * s.nz;
      const sp = Math.hypot(tx, ty, tz);
      const sand = C.inSand(b.x, b.y);
      const a = (sand ? 1500 : C.th.roll[0]) * s.nz, k = sand ? .85 : C.th.roll[1];
      /* can the carpet hold the ball still on this slope? */
      hold = GRAV * Math.sqrt(Math.max(0, 1 - s.nz * s.nz)) < a;
      const drop = (a + k * sp) * h;
      if (sp <= drop) { tx = ty = tz = 0; } else { const m = (sp - drop) / sp; tx *= m; ty *= m; tz *= m; }
      b.vx = tx + vn * s.nx; b.vy = ty + vn * s.ny; b.vz = tz + vn * s.nz;
    }
    /* The cup is a real hole: over it there is no ground, only the floor
       far down, the wall round it, and the lip — an edge the ball either
       rolls over the top of or catches and drops past. */
    function groundHit(h) {
      const b = ball, cp = C.cup;
      const cd = Math.hypot(b.x - cp.x, b.y - cp.y);
      b.gnd = false;
      if (cd < CUPR) {
        /* its middle is over the hole: nothing can hold it up there, so it
           is never "at rest" — perched on the lip, it tips in */
        hold = false;
        const floor = cp.z - CUPD;
        if (b.z < floor + R) { b.z = floor + R; if (b.vz < 0) b.vz = -b.vz * .15; b.vx *= .8; b.vy *= .8; b.gnd = true; }
        if (b.z < cp.z && cd > CUPR - R) {
          const nx = (b.x - cp.x) / cd, ny = (b.y - cp.y) / cd;
          b.x = cp.x + nx * (CUPR - R); b.y = cp.y + ny * (CUPR - R);
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) { b.vx -= 1.35 * vn * nx; b.vy -= 1.35 * vn * ny; }
        }
      } else {
        const s = surf(b.x, b.y);
        const dist = (b.z - s.h) * s.nz;
        if (dist < R + .6) {
          if (dist < R) { const push = R - dist; b.x += s.nx * push; b.y += s.ny * push; b.z += s.nz * push; }
          const vn = b.vx * s.nx + b.vy * s.ny + b.vz * s.nz;
          if (vn < 0) {
            const e = vn < -160 ? .3 : 0;
            b.vx -= (1 + e) * vn * s.nx; b.vy -= (1 + e) * vn * s.ny; b.vz -= (1 + e) * vn * s.nz;
            if (vn < -240) {
              Sound.thud();
              burst(b.x, b.y, { color: C.inSand(b.x, b.y) ? T.sand : '#e2e8f0', count: 6, speed: 90, size: 3, life: .4, grav: 0 }, { z: s.h + 2, up: 90, add: false });
            }
          }
          b.gnd = true;
          friction(h, s);
        }
      }
      if (cd < CUPR + R && cd > 1e-4) {
        const rx = cp.x + (b.x - cp.x) / cd * CUPR, ry = cp.y + (b.y - cp.y) / cd * CUPR;
        let dx = b.x - rx, dy = b.y - ry, dz = b.z - cp.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < R && d > 1e-4) {
          dx /= d; dy /= d; dz /= d;
          b.x = rx + dx * R; b.y = ry + dy * R; b.z = cp.z + dz * R;
          const vn = b.vx * dx + b.vy * dy + b.vz * dz;
          if (vn < 0) {
            b.vx -= 1.3 * vn * dx; b.vy -= 1.3 * vn * dy; b.vz -= 1.3 * vn * dz;
            if (vn < -70) Sound.blip();
          }
          b.gnd = true;
        }
      }
    }
    function physics(dt) {
      const b = ball;
      if (b.rest) {
        /* a ball at rest only moves if a sliding gate walks into it */
        for (const m of C.F.mover) { const mb = moverBox(m); if (boxHit(mb, mb.vx, mb.vy)) b.rest = false; }
        if (b.rest) return;
      }
      const sp = Math.hypot(b.vx, b.vy, b.vz);
      const n = Math.min(24, Math.max(2, Math.ceil(sp * dt / 2.5))), h = dt / n;
      for (let i = 0; i < n; i++) {
        b.vz -= GRAV * h;
        b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
        for (const p of C.F.post) postHit(p);
        for (const w of C.F.wall) boxHit(w);
        for (const m of C.F.mover) { const mb = moverBox(m); boxHit(mb, mb.vx, mb.vy); }
        for (const m of C.F.mill) { boxHit(m.sides[0]); boxHit(m.sides[1]); if (millBlocked(m)) boxHit(m.gate); }
        railsHit();
        groundHit(h);
      }
      const v = Math.hypot(b.vx, b.vy, b.vz);
      b.air = !b.gnd;
      /* A ball leaning on a post or a rail on a slope is held there by it,
         even though the carpet alone could not hold it: once it has barely
         moved for a moment it is at rest. Not over the cup, though — perched
         on the lip, it has to be free to tip in. */
      const overCup = Math.hypot(b.x - C.cup.x, b.y - C.cup.y) < CUPR;
      b.slow = b.gnd && v < 6 && !overCup ? (b.slow || 0) + dt : 0;
      if (b.gnd && ((v < 5 && hold) || b.slow > .6)) { b.vx = b.vy = b.vz = 0; b.rest = true; b.slow = 0; }
      else if (v > 7 || !b.gnd) b.rest = false;
    }
    /* what the ball has got itself into: the cup, water, lava, the rough */
    function outcomes() {
      const b = ball;
      if (sunk) return;
      const cp = C.cup, cd = Math.hypot(b.x - cp.x, b.y - cp.y);
      if (cd < CUPR && b.z < cp.z - R * .8) { sinkBall(); return; }
      for (const c of C.F.creek) {
        if (C.creekD(c, b.x, b.y).dl < c.w / 2 && b.z < c.level) { drown(c.lava, c.level); return; }
      }
      for (const p of C.F.pond) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < p.r && b.z < p.level) { drown(p.lava, p.level); return; }
      }
      const q = C.near(b.x, b.y);
      if (q.e > 8 && (b.gnd || b.z < C.land(b.x, b.y, q) + R + 2)) { penalty('Out of bounds — one stroke penalty'); return; }
      if (b.z < cp.z - 500) { penalty('Lost — one stroke penalty'); return; }
      /* the first time a shot finds the pipe, say so */
      if (q.tun && q.u > 6 && q.u < q.tun.L - 6 && !inTube) { inTube = true; Sound.zap(); say('Into the pipe!'); }
      else if (!q.tun) inTube = false;
      if (b.rest && q.e < 0) { safe.x = b.x; safe.y = b.y; }
    }
    function drown(lava, level) {
      strokes++; Sound.fail();
      if (lava) api.shake(8);
      if (VIEW) VIEW.splash(ball.x, ball.y, level, lava);
      ripples.push({ x: ball.x, y: ball.y, z: level, t: 0, lava }, { x: ball.x, y: ball.y, z: level, t: -.14, lava }, { x: ball.x, y: ball.y, z: level, t: -.3, lava });
      say(lava ? 'Molten! One stroke penalty' : 'Splash! One stroke penalty');
      placeBall(safe.x, safe.y);
    }
    function penalty(text) {
      strokes++; Sound.fail();
      say(text);
      placeBall(safe.x, safe.y);
    }
    function sinkBall() {
      if (sunk) return;
      sunk = true;
      ball.x = C.cup.x; ball.y = C.cup.y; ball.vx = ball.vy = ball.vz = 0;
      sinkT = 0;
      scores[hole] = strokes;
      const d = strokes - C.par;
      sunkMsg = strokes === 1 ? 'HOLE IN ONE!' : d <= -3 ? 'ALBATROSS' : d === -2 ? 'EAGLE' : d === -1 ? 'BIRDIE'
        : d === 0 ? 'PAR' : d === 1 ? 'BOGEY' : d === 2 ? 'DOUBLE BOGEY' : '+' + d;
      /* the result card announces this — a floating copy would land inside
         that card and print the message over itself */
      Sound.coin(); Sound.win();
      burst(C.cup.x, C.cup.y, { color: '#fde047', count: 22, speed: 230, size: 4, life: .7, angle: -Math.PI / 2, spread: 1.6, grav: 420 }, { z: C.cup.z + 2, up: 300, spd: .45 });
      if (VIEW) VIEW.celebrate(strokes <= C.par ? (strokes === 1 ? 2 : 1) : 0);
      if (RACE) { RACE.post({ ph: 'p', c: courseIdx, h: hole, x: ball.x, y: ball.y, z: ball.z, s: strokes, d: 1 }, true); waitT = 0; }
    }
    function peersReady() {
      if (!RACE) return true;
      const others = RACE.list().filter(p => !p.me);
      if (!others.length) return true;
      return others.every(p => {
        const b = RACE.board[p.id];
        if (b && b.done) return true;
        const q = RACE.peers[p.id];
        if (!q || q.ph !== 'p') return false;
        return q.h > hole || (q.h === hole && q.d);
      });
    }
    function waitingFor() {
      if (!RACE) return [];
      return RACE.list().filter(p => {
        if (p.me) return false;
        const b = RACE.board[p.id];
        if (b && b.done) return false;
        const q = RACE.peers[p.id];
        return !(q && q.ph === 'p' && (q.h > hole || (q.h === hole && q.d)));
      }).map(p => p.name);
    }
    function advance() {
      if (hole + 1 >= HOLES.length) { ending = true; endT = 0; return; }
      loadHole(hole + 1);
      if (RACE) RACE.post({ ph: 'p', c: courseIdx, h: hole, x: ball.x, y: ball.y, z: ball.z, s: 0, d: 0 }, true);
    }
    /* the eye button, bottom left: a look over the whole hole */
    const EYE = { x: 20, y: H - 62, w: 42, h: 42 };
    const onEye = c => c.x >= EYE.x && c.x <= EYE.x + EYE.w && c.y >= EYE.y && c.y <= EYE.y + EYE.h;

    /* ---- the front page ----
       Opened from the hub, mini golf starts on its own title: the first hole
       of a destination, in 3D, the camera easing round it; along the foot,
       all eight destinations as picture cards — pick one (or ← →) and the
       view goes there. Over it, in the house type, the name and three tabs:
       Play (tee off on the chosen course, or play with friends), Customize
       (ball, trail and nameplate) and the Shop. Tee off starts the round on
       that course, fly-over and all; the vote only happens online. */
    const FK = FrontKit(api, {
      online: !!RACE, mp: true, remount: true,
      goSound() { Sound.shoot(); },
      carry() { return { golf: true, course: menuSel }; },
      onClick(k) {
        if (LK.click(k)) return;
        if (k.slice(0, 4) === 'tab:') { const t = k.slice(4); if (t !== mTab) { mTab = t; tabT0 = FK.t; Sound.blip(); } }
        else if (k.slice(0, 5) === 'dest:') pickCourse(+k.slice(5));
        else if (k === 'look') { mTab = 'custom'; tabT0 = FK.t; Sound.blip(); }
      }
    });
    const LK = FrontLocker(api, FK, 'golf');
    const lastCourse = parseInt(Store.opt('golf', 'course') || '-1', 10);
    let menuSel = clamp(lastCourse >= 0 ? lastCourse : 0, 0, COURSES.length - 1);
    let mTab = 'play', tabT0 = 0, switchT = -9, menuCam = null, mShot = null;
    /* the menu shows a destination's first hole, compiled exactly as a round
       would compile it */
    function previewCourse(ci) {
      menuSel = ci;
      courseIdx = ci; HOLES = COURSES[ci].holes; T = THEMES[COURSES[ci].th] || THEMES.meadow;
      loadHole(0);
      mShot = null;
    }
    function pickCourse(i) {
      i = (i + COURSES.length) % COURSES.length;
      if (i === menuSel) return;
      previewCourse(i); switchT = FK.t; Sound.blip();
    }
    /* The hole from a three-quarter view, framed whole in the space right of
       the menu and above the cards, swaying slowly; with the locker open it
       stands back behind the panel. Fitted once per hole with the camera's
       own framing, and cut to (not flown to) when the course changes. */
    function menuShot(Ch) {
      if (!Ch) return null;
      let fresh = false;
      if (!mShot || mShot.c !== Ch) {
        const bb = Ch.bounds, tmp = Gfx3D.camera(W, H), t0 = Ch.frame(0), pts = [];
        const yaw = Math.atan2(Ch.cup.x - t0.x, -(Ch.cup.y - t0.y)) + .55;
        for (const x of [bb.x0, bb.x1]) for (const y of [bb.y0, bb.y1]) pts.push([x, y, Ch.zAt(Ch.near(x, y).s)]);
        tmp.fit(pts, [450, 78, 934, 450], .8, yaw, .88);
        mShot = { c: Ch, x: tmp.tgt[0], y: tmp.tgt[1], d: tmp.dist, yaw };
        fresh = true;
      }
      const deep = FK.glide('gdeep', mTab === 'play' ? 0 : 1, 3);
      return { x: mShot.x, y: mShot.y, z: 0, yaw: mShot.yaw + Math.sin(FK.t * .09) * .2, pitch: .8 + deep * .18,
               dist: mShot.d * (1 + deep * .3), snap: fresh };
    }

    /* ---- painting the front page ---- */
    function drawFront(ctx) {
      menuCam = menuShot;
      try {
        if (VIEW.gl && VIEW.lost()) fallBack();
        VIEW.render(ctx);
      } catch (e) {
        if (!VIEW.gl) throw e;
        fallBack(e); VIEW.render(ctx);
      }
      /* a quick dip to dark over the cut when the destination changes */
      const sw = 1 - clamp((FK.t - switchT) / .45, 0, 1);
      if (sw > 0) { ctx.fillStyle = 'rgba(5,10,9,' + (sw * .9).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      const deep = FK.glide('gdim', mTab === 'play' ? 0 : 1, 6);
      const g = ctx.createLinearGradient(0, 0, 560, 0);
      g.addColorStop(0, 'rgba(4,9,8,.9)'); g.addColorStop(.6, 'rgba(4,9,8,.62)'); g.addColorStop(1, 'rgba(4,9,8,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 560, H);
      const tg = ctx.createLinearGradient(0, 0, 0, 130);
      tg.addColorStop(0, 'rgba(4,9,8,.7)'); tg.addColorStop(1, 'rgba(4,9,8,0)');
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 130);
      const bg = ctx.createLinearGradient(0, H - 170, 0, H);
      bg.addColorStop(0, 'rgba(4,9,8,0)'); bg.addColorStop(1, 'rgba(4,9,8,.85)');
      ctx.fillStyle = bg; ctx.fillRect(0, H - 170, W, 170);
      if (deep > .01) { ctx.fillStyle = 'rgba(4,9,8,' + (deep * .6).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }

      const t = FK.t, m = FK.mode(), P2 = api.party;
      /* the name */
      const nk = FK.eo(FK.in(.05, .6));
      ctx.save(); ctx.globalAlpha *= nk; ctx.translate((1 - nk) * -40, 0);
      FH.num(ctx, 'MINI GOLF', 40, 76, 80, FH.W, 'left', { shadow: 'rgba(0,0,0,.55)', sy: 5 });
      ctx.fillStyle = FLAGR; ctx.fillRect(44, 116, 38, 3);
      FH.cap(ctx, COURSES.length + ' destinations  ·  ' + COURSES.reduce((a, c) => a + c.holes.length, 0) + ' holes', 92, 118, 12, '#f0d79a', 'left', { weight: 700, track: 2.6 });
      ctx.restore();
      LK.purse(ctx, W - 34, 42, FK.in(.35, .4));
      /* the tabs, with the rule sliding across under the one you are on */
      const tabs = [['play', 'Play'], ['custom', 'Customize'], ['shop', 'Shop']];
      const ty = 166, ta = FK.in(.2, .4);
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
      ctx.fillRect(FK.spring('gulx', ux, 360, 30), ty + 15, Math.max(8, FK.spring('gulw', uw, 360, 30)), 3);
      ctx.restore();

      const ck = FK.eo(clamp((t - Math.max(tabT0, .35)) / .32, 0, 1));
      ctx.save(); ctx.globalAlpha *= ck; ctx.translate(0, (1 - ck) * 14);
      if (mTab === 'play') drawPlayTab(ctx, m, P2);
      else if (mTab === 'custom') LK.custom(ctx, 44, 206, W - 88, 300);
      else LK.shop(ctx, 44, 212, W - 88, 280);
      ctx.restore();

      const fa = FK.in(1, .4);
      let fx = 44;
      fx += FH.prompt(ctx, fx, H - 22, 'Space', m === 'guest' ? 'Wait for the host' : 'Tee off', { alpha: fa });
      if (mTab === 'play') fx += FH.prompt(ctx, fx, H - 22, '← →', 'Destination', { alpha: fa });
      fx += FH.prompt(ctx, fx, H - 22, 'P', 'Friends', { alpha: fa });
      FH.prompt(ctx, fx, H - 22, 'Esc', 'Hub', { alpha: fa });
      FK.cursor();
    }
    function drawPlayTab(ctx, m, P2) {
      const x = 44, c = COURSES[menuSel], par = c.holes.reduce((a, h) => a + h.par, 0);
      FH.cap(ctx, 'Destination ' + (menuSel + 1) + ' of ' + COURSES.length, x, 206, 11, FH.MU, 'left', { weight: 700 });
      /* the course, sliding in whenever it changes */
      const nk = FK.eo(clamp((FK.t - switchT) / .4, 0, 1));
      ctx.save(); ctx.globalAlpha *= nk; ctx.translate((1 - nk) * 18, 0);
      FH.num(ctx, c.name.toUpperCase(), x, 238, 38, FH.W, 'left', { shadow: 'rgba(0,0,0,.5)', sy: 3 });
      FH.cap(ctx, c.holes.length + ' holes  ·  par ' + par, x, 270, 12, FH.Y, 'left', { weight: 800, track: 1.6 });
      const lines = wrapLines(ctx, c.blurb, 350);
      lines.forEach((ln, i) => panelText(ctx, x, 294 + i * 18, ln, 13, 'rgba(244,244,240,.8)', 'left', 600));
      ctx.restore();
      /* Tee off: the one bright thing on the screen */
      const py = 336, pw = 360, ph = 66;
      const pb = FK.btn('play', x, py, pw, ph, m !== 'guest');
      ctx.save();
      ctx.translate(x + pw / 2, py + ph / 2 - pb.h * 3); ctx.scale(1 - pb.p * .02, 1 + pb.p * .04); ctx.translate(-(x + pw / 2), -(py + ph / 2));
      FH.tile(ctx, x, py, pw, ph, { fill: m === 'guest' ? 'rgba(244,244,240,.2)' : FH.Y, shadow: .45, strip: m === 'guest' ? null : FLAGR, stripH: 5 });
      const label = m === 'host' ? 'Start the round' : m === 'guest' ? 'Waiting for the host' : 'Tee off';
      FH.num(ctx, label.toUpperCase(), x + 24, py + 34, m === 'guest' ? 24 : 34, m === 'guest' ? FH.W : FH.INK, 'left');
      if (m !== 'guest') {
        /* a pin, standing in the button */
        const fx0 = x + pw - 50, fy0 = py + 14, wave = Math.sin(FK.t * 5) * 2;
        ctx.fillStyle = 'rgba(18,22,29,.25)'; ctx.beginPath(); ctx.ellipse(fx0 + 2, py + ph - 14, 12, 3.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = FH.INK; ctx.fillRect(fx0, fy0, 2.6, ph - 26);
        ctx.fillStyle = FLAGR; ctx.beginPath(); ctx.moveTo(fx0 + 2.6, fy0); ctx.quadraticCurveTo(fx0 + 12, fy0 + 3 + wave, fx0 + 22, fy0 + 7);
        ctx.quadraticCurveTo(fx0 + 12, fy0 + 11 - wave, fx0 + 2.6, fy0 + 14); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      const fb = FK.btn('party', x, py + ph + 10, pw, 46);
      FH.tile(ctx, x + fb.h * 3, py + ph + 10, pw, 46, { fill: 'rgba(16,21,28,.88)', shadow: .4, ring: fb.h > .5 ? 'rgba(245,225,28,.7)' : null });
      FH.cap(ctx, P2.inRoom ? 'Party of ' + P2.size + '  ·  open the list' : 'Play with friends', x + 22 + fb.h * 3, py + ph + 33, 15, FH.W, 'left', { weight: 800 });
      FH.cap(ctx, P2.inRoom ? '' : 'Up to four, same course', x + pw - 18 + fb.h * 3, py + ph + 33, 10, FH.MU, 'right');
      /* the ball you are playing, under the purse; a click opens the locker */
      const worn = Cos.equipped('golf', 'ball'), bname = worn ? worn.name : '';
      const tw2 = Math.max(FH.capW(ctx, 'Your ball', 9), FH.capW(ctx, bname, 12, { weight: 800 }));
      const bx = W - 34 - tw2 - 24;
      const lb = FK.btn('look', bx - 18, 62, W - 34 - bx + 22, 38);
      cosSwatch(ctx, worn, bx, 80, 30 + lb.h * 4);
      FH.cap(ctx, 'Your ball', W - 34, 72, 9, lb.h > .5 ? FH.Y : FH.MU, 'right');
      FH.cap(ctx, bname, W - 34, 89, 12, FH.W, 'right', { weight: 800 });
      drawStrip(ctx);
    }
    /* the eight destinations as picture cards along the foot */
    function drawStrip(ctx) {
      const n = COURSES.length, gap = 8, cw = Math.min(106, (W - 88 - gap * (n - 1)) / n), ch = 70, y0 = 474;
      const x0 = (W - (n * cw + (n - 1) * gap)) / 2, sk = FK.in(.5, .5);
      COURSES.forEach((c, i) => {
        const k = FK.eo(clamp((sk * 1.4) - i * .05, 0, 1));
        if (k <= 0) return;
        const x = x0 + i * (cw + gap), on = i === menuSel;
        const b = FK.btn('dest:' + i, x, y0 - 8, cw, ch + 8);
        const lift = b.h * 4 + FK.glide('gdl' + i, on ? 7 : 0, 12), y = y0 - lift + (1 - k) * 30;
        ctx.save(); ctx.globalAlpha *= k;
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + 2, y0 + 5, cw, ch);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
        drawDestination(ctx, x, y, cw, ch, c.th);
        ctx.fillStyle = on ? 'rgba(8,12,16,.78)' : 'rgba(8,12,16,.66)'; ctx.fillRect(x, y + ch - 19, cw, 19);
        if (!on) { ctx.fillStyle = 'rgba(8,12,16,' + (.28 * (1 - b.h)).toFixed(3) + ')'; ctx.fillRect(x, y, cw, ch - 19); }
        ctx.restore();
        FH.cap(ctx, c.name, x + cw / 2, y + ch - 9.5, 9.5, on ? FH.Y : FH.W, 'center', { weight: 800 });
        if (on) { ctx.strokeStyle = FH.Y; ctx.lineWidth = 3; ctx.strokeRect(x - 1.5, y - 1.5, cw + 3, ch + 3); }
        ctx.restore();
      });
    }
    /* break a line on words to fit a width, in the panel face */
    function wrapLines(ctx, s, maxW) {
      ctx.save(); ctx.font = '600 13px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      const out = []; let line = '';
      for (const w of String(s).split(' ')) {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      }
      if (line) out.push(line);
      ctx.restore();
      return out.slice(0, 2);
    }

    if (G3) { try { VIEW = makeView3D(G3); } catch (e) { console.warn('Mini golf 3D:', e); VIEW = null; } }
    if (!VIEW) VIEW = makeViewFlat();
    /* if the 3D view ever gives out, the round carries on overhead */
    function fallBack(e) {
      if (e) console.warn('Mini golf 3D:', e);
      try { VIEW.dispose(); } catch (e2) {}
      VIEW = makeViewFlat();
      if (C) VIEW.newHole();
    }

    /* The front page shows its chosen destination; a round started from
       it, or a restart, goes straight onto a course. The vote is only for
       online rounds now. */
    if (FK.on) previewCourse(menuSel);
    else if (!RACE) {
      const ci = CARRY ? CARRY.course : lastCourse;
      if (ci >= 0 && ci < COURSES.length) beginCourse(ci);
    }

    return {
      update(dt) {
        if (VIEW) VIEW.step(dt);
        /* on the front page the menu has the keys; a crate that has just
           been closed keeps its key to itself for a beat */
        if (FK.on) {
          LK.step(dt);
          if (LK.mute > 0) { while (api.input.takeClick()) {} } else FK.input(api.input);
          if (FK.on && !api.covered) {
            if (api.input.pressed('ArrowRight') || api.input.pressed('KeyD')) pickCourse(menuSel + 1);
            if (api.input.pressed('ArrowLeft') || api.input.pressed('KeyA')) pickCourse(menuSel - 1);
          }
          return;
        }
        /* the vote cards are flat on the screen; the course is not */
        const I = phase !== 'vote' ? VIEW.input : api.input, pt = I.pointer;
        clock += dt;
        if (msgT > 0) msgT -= dt;
        if (bannerT > 0) bannerT -= dt;
        if (winFlash > 0) winFlash -= dt;
        if (startT > 0) startT -= dt;

        /* ---------------- course vote ---------------- */
        if (phase === 'vote') {
          let c;
          while ((c = I.takeClick())) {
            for (const card of voteRects) {
              if (c.x >= card.x && c.x <= card.x + card.w && c.y >= card.y && c.y <= card.y + card.h) {
                myVote = card.i; Sound.blip();
                if (RACE) RACE.post({ ph: 'v', v: myVote }, true);
                else { beginCourse(myVote); return; }
              }
            }
          }
          voteT0 += dt;
          {
            const tal = tallies(), ptr = api.input.pointer;
            for (let i = 0; i < COURSES.length; i++) {
              const A = cardA[i], r = voteRects[i];
              const hov = r && ptr.inside && ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h;
              A.lift = ez(A.lift, myVote === i ? 1 : hov ? .55 : 0, dt, 11);
              A.n = ez(A.n, tal[i], dt, 9);
              A.bar = ez(A.bar, Math.min(1, tal[i] / Math.max(1, RACE ? RACE.list().length : 1)), dt, 8);
              for (const vid of votersFor(i)) {
                const k = i + ':' + vid;
                voterA[k] = ez(voterA[k] === undefined ? 0 : voterA[k], 1, dt, 10);
              }
            }
          }
          if (RACE) {
            voteT -= dt;
            harvestVotes();
            if (RACE.post) RACE.post({ ph: 'v', v: myVote }, false, 900);
            /* if anyone has already teed off, join their course rather than
               re-tallying — otherwise two players can pick different winners */
            const gc = groupCourse();
            if (gc >= 0) { beginCourse(gc); return; }
            if (voteT <= 0 || everyoneVoted()) beginCourse(pickWinner());
          }
          api.hud({ Phase: 'Choosing course', Vote: myVote >= 0 ? COURSES[myVote].name : '—',
                    Time: RACE ? Math.max(0, Math.ceil(voteT)) + 's' : '—' });
          return;
        }

        for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > 1.1) ripples.splice(i, 1); }
        for (let i = bumpFx.length - 1; i >= 0; i--) { bumpFx[i].t += dt; if (bumpFx[i].t > .4) bumpFx.splice(i, 1); }

        if (ending) {
          endT += dt;
          if (endT > 1.0) {
            const total = totalStrokes(), par = parTotal(), over = total - par;
            // Keep full rounds on the original eight-hole score scale.
            const roundScale = 8 / HOLES.length;
            const sc = Math.max(0, Math.round(6000 - total * 60 * roundScale + (over < 0 ? -over * 250 * roundScale : 0)));
            if (RACE) RACE.finish(sc);
            api.gameOver({
              score: sc, win: over <= 0,
              title: over < 0 ? over + ' under par' : over === 0 ? 'Even par' : '+' + over + ' over par',
              message: total + ' strokes on ' + COURSES[courseIdx].name,
              stats: [{ label: 'Course', value: COURSES[courseIdx].name }, { label: 'Strokes', value: total }, { label: 'Par', value: par }]
            });
          }
          return;
        }

        /* a look over the whole hole: the eye button, or V */
        if (api.input.pressed('KeyV')) VIEW.toggle();
        { const c0 = api.input.clicks[0]; if (c0 && onEye(c0)) { api.input.takeClick(); VIEW.toggle(); } }
        /* a click during the fly-over skips it */
        if (VIEW.busy()) { if (I.takeClick()) VIEW.skip(); wasDown = pt.down; return; }

        physics(dt);
        outcomes();
        if (moving()) {
          trail.push({ x: ball.x, y: ball.y, z: ball.z, t: 0 });
          if (trail.length > 30) trail.shift();
        }
        for (const t of trail) t.t += dt;

        if (sunk) {
          waitT += dt;
          if (sinkT < 1.2) sinkT += dt;
          /* hold the moment a beat longer than the drop, even in solo */
          if ((peersReady() && sinkT > 1.1) || waitT > 30) advance();
        } else if (startT <= 0) {
          let c;
          while ((c = I.takeClick())) {
            if (c.btn === 2) { aiming = false; continue; }
            if (!moving() && Math.hypot(c.x - ball.x, c.y - ball.y) < 110) { aiming = true; aimX = c.x; aimY = c.y; }
          }
          if (aiming && pt.down) { aimX = pt.x; aimY = pt.y; }
          if (aiming && wasDown && !pt.down) {
            aiming = false;
            const dx = ball.x - aimX, dy = ball.y - aimY, d = Math.hypot(dx, dy);
            if (d > 8) {
              const power = Math.min(d, PULL) / PULL;
              ball.vx = dx / d * power * MAXV; ball.vy = dy / d * power * MAXV; ball.vz = 0; ball.rest = false;
              strokes++; Sound.shoot(); api.shake(1 + power * 2.5);
              burst(ball.x, ball.y, { color: '#f8fafc', count: 7, speed: 130, size: 3, life: .3, grav: 0 }, { z: ball.z - 3, up: 60, add: false, alpha: .8 });
              burst(ball.x, ball.y, { color: T.turfA, count: 6, speed: 110, size: 2.6, life: .4, grav: 300, angle: Math.atan2(dy, dx) + Math.PI, spread: .9 }, { z: ball.z - R + 1, up: 140, add: false });
              trail = [];
            }
          }
        } else { I.takeClick(); }
        wasDown = pt.down;

        if (RACE) {
          const mv = moving();
          const pkt = { ph: 'p', c: courseIdx, h: hole, x: Math.round(ball.x), y: Math.round(ball.y), z: Math.round(ball.z),
                        vx: Math.round(ball.vx), vy: Math.round(ball.vy), s: strokes, d: sunk ? 1 : 0, a: ball.air ? 1 : 0 };
          if (mv !== wasMoving) { wasMoving = mv; RACE.post(pkt, true); }
          else RACE.post(pkt, false, mv ? 110 : 800);
          RACE.report(hole * 1000 - (totalStrokes() + strokes) * 10, !ending, (hole + 1) + '/' + HOLES.length);
          for (const id in RACE.peers) {
            const q = RACE.peers[id];
            if (q.ph !== 'p') continue;
            if (q.rx === undefined || q.rh !== q.h) { q.rx = q.x; q.ry = q.y; q.rz = q.z; q.rh = q.h; }
            const age = Math.min(.35, Math.max(0, (Date.now() - (q._t || 0)) / 1000));
            const tx = q.x + (q.vx || 0) * age, ty = q.y + (q.vy || 0) * age;
            if (Math.abs(tx - q.rx) + Math.abs(ty - q.ry) > 150) { q.rx = tx; q.ry = ty; }
            const k = Math.min(1, dt * 12);
            q.rx += (tx - q.rx) * k; q.ry += (ty - q.ry) * k;
            q.rz = q.z === undefined ? undefined : (q.rz === undefined ? q.z : q.rz + (q.z - q.rz) * k);
            q._dk = q.d ? (q._dk || 0) + dt : 0;                               // their sink clock
          }
        }
        api.hud({
          Hole: (hole + 1) + '/' + HOLES.length, Par: C.par, Strokes: strokes,
          Total: totalStrokes(), 'To par': (totalStrokes() - parSoFar() > 0 ? '+' : '') + (totalStrokes() - parSoFar())
        });
      },

      render(ctx) {
        FK.frame();
        if (FK.on) { drawFront(ctx); return; }
        if (phase === 'vote') { drawVote(ctx); return; }
        if (VIEW.gl && VIEW.lost()) fallBack();
        try { VIEW.render(ctx); }
        catch (e) {
          if (!VIEW.gl) throw e;
          fallBack(e);
          VIEW.render(ctx);
        }
        drawLabels(ctx);
        drawHud(ctx);
        /* a round teed off from the front page comes up out of its dark */
        if (FK.intro < 1) { ctx.fillStyle = 'rgba(5,10,9,' + ((1 - FK.eo(FK.intro)) * .9).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      },
      /* Escape on the front page goes back to the hub; in a round it pauses */
      escape: FK.escape,
      destroy() { FK.done(); if (VIEW) { try { VIEW.dispose(); } catch (e) {} VIEW = null; } }
    };
    /* ---------------------------------------------------- course vote ----
       Cards ease in on a stagger, lift under the cursor, and carry the
       avatars of everyone who picked them so the room can see the vote
       swing live rather than only learning the result. */
    function drawVote(ctx) {
      /* the festival's own backdrop: night blue, raked with light stripes */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#08111d'); bg.addColorStop(.55, '#0c1a26'); bg.addColorStop(1, '#10241c');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = .045;
      for (let i = -260; i < W; i += 54) FH.slant(ctx, i, 0, 18, H, 200, '#f4f4f0');
      ctx.restore();

      FH.cap(ctx, RACE ? 'Vote for a course' : 'Choose a course', 64, 62, 38, '#fff', 'left',
             { italic: true, weight: 800, shadow: 'rgba(0,0,0,.4)', sy: 3 });
      FH.slant(ctx, 64, 78, 92, 5, 3, FH.Y);
      FH.cap(ctx, '18 holes per course  ·  144 holes to explore  ·  longer scenic routes', 64, 98, 12,
             'rgba(244,244,240,.62)', 'left');

      /* the clock, as a bar that empties */
      if (RACE) {
        const bw = 190, bx = W - bw - 64, left = clamp(voteT / 16, 0, 1);
        FH.cap(ctx, votedCount() + ' / ' + RACE.list().length + ' picked', bx + bw, 58, 12,
               'rgba(244,244,240,.62)', 'right');
        FH.num(ctx, Math.max(0, Math.ceil(voteT)), bx + bw, 86, 34, left < .25 ? FH.O : '#fff', 'right');
        ctx.fillStyle = 'rgba(244,244,240,.16)'; ctx.fillRect(bx, 96, bw, 5);
        ctx.fillStyle = left < .25 ? FH.O : FH.Y; ctx.fillRect(bx, 96, Math.max(4, bw * left), 5);
      }

      voteRects = [];
      const cw = 204, ch = 169, gx = 16, gy = 18;
      const cols = 4, total = cols * cw + (cols - 1) * gx;
      const x0 = (W - total) / 2, y0 = 142;
      const tal = tallies();

      COURSES.forEach((Cc, i) => {
        const col = i % cols, row = (i / cols) | 0;
        const bx = x0 + col * (cw + gx), by = y0 + row * (ch + gy);
        voteRects.push({ x: bx, y: by, w: cw, h: ch, i });

        /* staggered entrance */
        const t0 = clamp((voteT0 - .1 - i * .07) / .5, 0, 1);
        if (t0 <= 0) return;
        const e = gOut(t0);
        const A = cardA[i], mine = myVote === i;
        const lift = A.lift * 9;
        const x = bx, y = by - lift + (1 - e) * 24;
        const bandH = 60, artH = ch - bandH;

        ctx.save();
        ctx.globalAlpha = e;
        /* the shadow grows with the lift, which is the whole of the trick */
        ctx.fillStyle = 'rgba(0,0,0,' + (.34 + A.lift * .2).toFixed(3) + ')';
        ctx.fillRect(x + 3, y + 6 + lift * .5, cw, ch);

        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, cw, artH); ctx.clip();
        drawDestination(ctx, x, y, cw, artH, Cc.th);
        /* the art is dimmed until the tile is the live one */
        ctx.fillStyle = 'rgba(6,12,20,' + (.34 - A.lift * .3).toFixed(3) + ')';
        ctx.fillRect(x, y, cw, artH);
        ctx.restore();

        /* the band: white normally, yellow when it is your pick */
        ctx.fillStyle = mine ? FH.Y : A.lift > .02 ? '#ffffff' : 'rgba(244,244,240,.93)';
        ctx.fillRect(x, y + artH, cw, bandH);
        ctx.fillStyle = mine ? FH.O : 'rgba(18,22,29,.25)';
        ctx.fillRect(x, y + ch - 5, cw, 5);

        FH.cap(ctx, fhFit(ctx, Cc.name, cw - 42, 17, { italic: true, weight: 800 }),
               x + 14, y + artH + 22, 17, FH.INK, 'left', { italic: true, weight: 800 });
        FH.cap(ctx, Cc.holes.length + ' holes  ·  par ' + Cc.holes.reduce((a, q) => a + q.par, 0),
               x + 14, y + artH + 42, 11.5, 'rgba(18,22,29,.62)', 'left');

        /* the tally, or the arrow that says "this one, then" */
        if (RACE) {
          if (A.n > .04) {
            ctx.save(); ctx.globalAlpha = e * clamp(A.n, 0, 1);
            FH.num(ctx, Math.round(A.n), x + cw - 14, y + artH + 30, 30, FH.INK, 'right');
            ctx.restore();
          }
        } else {
          ctx.strokeStyle = mine ? FH.INK : 'rgba(18,22,29,.5)'; ctx.lineWidth = 2;
          const ax = x + cw - 18, ay = y + artH + 39;
          ctx.beginPath(); ctx.moveTo(ax - 7, ay); ctx.lineTo(ax + 7, ay);
          ctx.moveTo(ax + 1, ay - 6); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax + 1, ay + 6); ctx.stroke();
        }

        /* who picked it, over the art where there is always room */
        if (RACE) votersFor(i).forEach((vid, k) => {
          const p = clamp(voterA[i + ':' + vid] || 0, 0, 1);
          const sc = .6 + p * .4, cx = x + cw - 22 - k * 21, cy = y + 22;
          ctx.save();
          ctx.globalAlpha = e * p;
          ctx.translate(cx, cy); ctx.scale(sc, sc);
          ctx.fillStyle = 'rgba(0,0,0,.5)';
          ctx.beginPath(); ctx.arc(0, 1.5, 10, 0, TAU); ctx.fill();
          ctx.fillStyle = colOfId(vid);
          ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, TAU); ctx.fill();
          const nm = nameOfId(vid) || '?';
          FH.cap(ctx, nm.trim().charAt(0), 0, .5, 12, '#0b1220', 'center', { weight: 800 });
          ctx.restore();
        });

        if (mine) {
          FH.tile(ctx, x + 12, y + 12, 92, 22, { fill: FH.Y, shadow: .3 });
          FH.cap(ctx, 'Your pick', x + 58, y + 23.5, 12, FH.INK, 'center', { weight: 800 });
        }
        ctx.restore();
      });

      const foot = clamp((voteT0 - .5) / .5, 0, 1);
      let px = 64;
      px += FH.prompt(ctx, px, H - 42, 'CLICK', RACE ? 'Vote' : 'Tee off', { alpha: foot });
      if (RACE) px += FH.prompt(ctx, px, H - 42, 'CLOCK', 'Majority wins', { alpha: foot });
      FH.prompt(ctx, px, H - 42, 'ESC', 'Pause', { alpha: foot });
    }
    /* Small vector landscapes stay sharp offline, without image downloads. */
    function drawDestination(ctx, x, y, w, h, theme) {
      const palettes = {
        meadow: ['#c9e2cc','#eef2bd','#a0ba73','#4b8054','#256044'],
        lagoon: ['#a6dcd4','#e5f6de','#8ed1c5','#3ba99c','#1f837c'],
        canyon: ['#e9c9a4','#fae7be','#d89a6c','#aa6545','#684739'],
        volcano: ['#3d3548','#c78069','#7a5660','#503943','#2e3038'],
        glacier: ['#b0cddd','#e9f5ed','#d9e9e9','#91b7c8','#517d94'],
        night: ['#172941','#546985','#496875','#294d58','#153c47'],
        forest: ['#9cb6bb','#e5e5c8','#6b8865','#426748','#284935'],
        coast: ['#abc7d8','#edf0da','#b9b792','#82966f','#516f64']
      };
      const p = palettes[theme];
      ctx.save(); ctx.translate(x,y); ctx.scale(w / 276, h / 106); w = 276; h = 106;
      const sky = ctx.createLinearGradient(0,0,0,h); sky.addColorStop(0,p[0]); sky.addColorStop(1,p[1]);
      ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      ctx.fillStyle=theme==='night'?'#f6edc3':'#fff2c9';ctx.beginPath();ctx.arc(w-49,26,14,0,TAU);ctx.fill();
      for(let layer=0;layer<3;layer++) {
        ctx.fillStyle=p[layer+2];ctx.beginPath();ctx.moveTo(0,h);
        for(let i=0;i<=8;i++) {
          const xx=i*w/8, yy=53+layer*17-Math.sin(i*1.7+layer*2)*17;
          if (theme==='canyon') {ctx.lineTo(xx,yy);ctx.lineTo(xx+w/16,yy);}
          else ctx.lineTo(xx,yy);
        }
        ctx.lineTo(w,h);ctx.closePath();ctx.fill();
      }
      if(theme==='glacier') {
        ctx.fillStyle='#f5fbf4';ctx.beginPath();ctx.moveTo(41,51);ctx.lineTo(69,27);ctx.lineTo(96,59);ctx.lineTo(70,47);ctx.lineTo(61,53);ctx.closePath();ctx.fill();
      }
      if(theme==='night') {
        ctx.fillStyle='#f6edc3';for(let i=0;i<17;i++){ctx.beginPath();ctx.arc(12+(i*43)%w,8+(i*17)%45,i%3===0?1.3:.7,0,TAU);ctx.fill();}
      }
      ctx.lineCap='round';ctx.strokeStyle=theme==='volcano'?'#ec8650':theme==='lagoon'?'#e8dbaa':theme==='glacier'?'#edf8f0':'#afc875';
      ctx.lineWidth=23;ctx.beginPath();ctx.moveTo(w*.2,h+6);ctx.bezierCurveTo(w*.1,75,w*.76,94,w*.59,64);ctx.stroke();
      ctx.lineWidth=1;ctx.strokeStyle='#ffffff30';ctx.beginPath();ctx.moveTo(w*.21,h);ctx.bezierCurveTo(w*.12,76,w*.74,90,w*.59,64);ctx.stroke();
      if(theme==='meadow'||theme==='night'||theme==='lagoon'||theme==='forest') {
        for(const tx of [25,47,w-26]){ctx.strokeStyle=p[4];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tx,73);ctx.lineTo(tx,44);ctx.stroke();ctx.fillStyle=p[3];ctx.beginPath();ctx.ellipse(tx,43,11,17,-.2,0,TAU);ctx.fill();}
      }
      ctx.fillStyle='#173e30';ctx.beginPath();ctx.ellipse(w*.59,66,5,2,0,0,TAU);ctx.fill();
      ctx.strokeStyle='#fffbea';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.59,65);ctx.lineTo(w*.59,34);ctx.stroke();
      ctx.fillStyle='#e16e50';ctx.beginPath();ctx.moveTo(w*.59,34);ctx.lineTo(w*.59+20,40);ctx.lineTo(w*.59,46);ctx.fill();
      ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(w*.35,89,3.5,0,TAU);ctx.fill();
      ctx.restore();
    }
    function votedCount() {
      let n = myVote >= 0 ? 1 : 0;
      for (const id in peerVote) n++;
      return n;
    }
    /* ==================================================== painting ====== */
    /* a soft dark pill behind a line of text, sized to it — the text sits
       over a live scene, so it brings its own background */
    /* ---- the card stock everything is printed on ---- */
    function gbox(ctx, x, y, w, h, r) {
      r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    /* a slip of pressed card: warm stock, a darker foot where the light
       falls off, and a hairline of the printer's ink round the edge */
    function slip(ctx, x, y, w, h, r, tint) {
      ctx.fillStyle = 'rgba(7,32,23,.22)'; gbox(ctx, x, y + 4, w, h, r); ctx.fill();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, tint || PAPER); g.addColorStop(1, PAPER2);
      ctx.fillStyle = g; gbox(ctx, x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = 'rgba(24,62,48,.14)'; ctx.lineWidth = 1;
      gbox(ctx, x + .5, y + .5, w - 1, h - 1, r); ctx.stroke();
    }
    function ink(ctx, x, y, txt, size, col, align, weight, track) {
      ctx.save();
      ctx.font = (weight || 700) + ' ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      try { ctx.letterSpacing = (track === undefined ? .4 : track) + 'px'; } catch (e) {}
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = col || INKD; ctx.fillText(txt, x, y);
      ctx.restore();
    }
    function inkW(ctx, txt, size, weight, track) {
      ctx.save();
      ctx.font = (weight || 700) + ' ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      try { ctx.letterSpacing = (track === undefined ? .4 : track) + 'px'; } catch (e) {}
      const w = ctx.measureText(txt).width;
      ctx.restore();
      return w;
    }
    function gOut(k) { return 1 - Math.pow(1 - k, 3); }
    /* a little flag on a stick, drawn wherever a hole wants marking */
    function flagMark(ctx, x, y, s, wave) {
      ctx.save();
      ctx.strokeStyle = INKD; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 13 * s); ctx.stroke();
      ctx.fillStyle = FLAGR;
      ctx.beginPath(); ctx.moveTo(x, y - 13 * s);
      ctx.quadraticCurveTo(x + 7 * s, y - 12 * s + wave, x + 11 * s, y - 9.5 * s);
      ctx.lineTo(x, y - 6.5 * s); ctx.fill();
      ctx.restore();
    }
    /* one clock for the card stock, stepped where it is painted */
    function guStep() {
      const now = performance.now();
      GU.dt = GU.last ? Math.min(.05, (now - GU.last) / 1000) : 0;
      GU.last = now; GU.t = now / 1000;
      const dt = GU.dt;
      if (hole !== GU.hole) { GU.hole = hole; GU.slip = 0; GU.stamp = 0; }
      GU.slip = Math.min(1, GU.slip + dt * 1.9);
      GU.stamp = sunk ? Math.min(1, GU.stamp + dt * 2.6) : 0;
      GU.pow += ((aiming ? Math.min(Math.hypot(ball.x - aimX, ball.y - aimY), PULL) / PULL : 0) - GU.pow) * Math.min(1, dt * 18);
      const wantHint = !moving() && !aiming && !sunk && startT <= 0 && !VIEW.busy();
      GU.hint += ((wantHint ? 1 : 0) - GU.hint) * Math.min(1, dt * (wantHint ? 7 : 12));
    }
    /* The readouts that belong to a spot on the course — whose ball is
       whose, and how hard you are about to hit it — pinned where those spots
       landed on screen. */
    function drawLabels(ctx) {
      if (RACE) for (const id in RACE.peers) {
        const q = RACE.peers[id];
        if (!q || q.ph !== 'p' || q.h !== hole) continue;
        const bx = q.rx === undefined ? q.x : q.rx, by = q.ry === undefined ? q.y : q.ry;
        const bz = q.rz === undefined ? C.H(bx, by) + R : q.rz;
        const s = scr(bx, by, bz + R * 1.6);
        const nm = (nameOfId(id).split(' ')[0] + (q.d ? ' ✓' : '')).toUpperCase();
        const w = FH.capW(ctx, nm, 11) + 24;
        FH.tile(ctx, s.x - w / 2, s.y - 24, w, 19, { fill: 'rgba(9,16,26,.84)', shadow: .25 });
        ctx.fillStyle = colOfId(id);
        ctx.fillRect(s.x - w / 2, s.y - 24, 3.5, 19);
        FH.cap(ctx, nm, s.x + 2, s.y - 14, 11, '#f4f4f0', 'center');
      }
      if (aiming) drawPutMeter(ctx);
    }
    /* ---- the furniture, in the same language as the results card ----
       A hairline, tracked caps, mono numbers, and nothing boxed in. The
       scores live in the bar above, so everything here only says where you
       are and what is happening right now. */
    function cap(ctx, x, y, txt, size, col, align, track) {
      ink(ctx, x, y, txt, size, col, align, 700, track === undefined ? 2 : track);
    }
    /* The putt, measured out on a shaft: how far back the club has gone, with
       the ferrule riding the head of it. Green through amber to red, because
       at the red end the ball is leaving the county. */
    function drawPutMeter(ctx) {
      const p = GU.pow, bw = 250, h = 12, x = W / 2 - bw / 2, y = H - 56;
      const col = p < .34 ? FH.GOOD : p < .7 ? FH.Y : FH.O;
      ctx.save();
      FH.slant(ctx, x, y, bw, h, 7, 'rgba(9,16,26,.8)');
      if (p > .004) FH.slant(ctx, x, y, Math.max(6, bw * p), h, 7, col);
      /* the notch where a firm putt becomes a full swing */
      FH.slant(ctx, x + bw * .7, y - 3, 2, h + 6, 7, 'rgba(244,244,240,.55)');
      FH.cap(ctx, p < .34 ? 'TAP' : p < .7 ? 'FIRM' : 'FULL SWING', x, y - 11, 12, col, 'left');
      FH.num(ctx, Math.round(p * 100) + '%', x + bw, y - 10, 20, '#fff', 'right');
      ctx.restore();
    }
    function drawHud(ctx) {
      guStep();
      ctx.save();
      /* the courses run from near-white sand to a night meadow, so the tiles
         sit on a whisper of a gradient at each edge rather than trusting
         whatever lie happens to be under them */
      const tg = ctx.createLinearGradient(0, 0, 0, 118);
      tg.addColorStop(0, 'rgba(4,9,15,.72)'); tg.addColorStop(1, 'rgba(4,9,15,0)');
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 118);
      const bgg = ctx.createLinearGradient(0, H - 110, 0, H);
      bgg.addColorStop(0, 'rgba(4,9,15,0)'); bgg.addColorStop(1, 'rgba(4,9,15,.7)');
      ctx.fillStyle = bgg; ctx.fillRect(0, H - 110, W, 110);
      /* a snow course is brighter than any scrim, so the type carries its own
         shadow as well */
      const SH = 'rgba(0,0,0,.55)';

      /* ---- where you are, read like a car's class plate ---- */
      FH.badge(ctx, 22, 18, String(hole + 1), 'PAR ' + C.par, FH.O);
      FH.cap(ctx, fhFit(ctx, C.name + (T.slick ? ' · ICE' : ''), 330, 27, { italic: true, weight: 800 }),
             22, 58, 27, '#fff', 'left', { italic: true, weight: 800, shadow: SH, sy: 2 });
      FH.cap(ctx, COURSES[courseIdx].name + '  ·  HOLE ' + (hole + 1) + ' OF ' + HOLES.length,
             22, 80, 11.5, 'rgba(244,244,240,.8)', 'left', { shadow: SH, sy: 1.5 });

      /* ---- and how it is going: this hole, then the round ---- */
      const tp = totalStrokes() - parSoFar();
      const tpTxt = (tp > 0 ? '+' : '') + tp;
      const tpCol = tp < 0 ? FH.GOOD : tp === 0 ? FH.Y : FH.O;
      FH.cap(ctx, 'STROKES', W - 22, 27, 11, 'rgba(244,244,240,.75)', 'right', { shadow: SH, sy: 1.5 });
      FH.num(ctx, strokes, W - 22, 53, 38, '#fff', 'right', { shadow: SH, sy: 2 });
      const tw = Math.max(56, FH.capW(ctx, tpTxt, 20, { weight: 800, italic: true }) + 26);
      FH.tile(ctx, W - 22 - tw, 70, tw, 26, { fill: tpCol, shadow: .28 });
      FH.num(ctx, tpTxt, W - 22 - tw / 2, 83.5, 20, FH.INK, 'center');
      FH.cap(ctx, 'TO PAR  ·  ' + totalStrokes() + ' SHOT' + (totalStrokes() === 1 ? '' : 'S'),
             W - 32 - tw, 84, 11, 'rgba(244,244,240,.75)', 'right', { shadow: SH, sy: 1.5 });

      /* ---- what just happened ---- */
      if (msgT > 0 && !sunk) {
        const txt = fhFit(ctx, msg, 460, 14), w = FH.capW(ctx, txt, 14) + 52;
        ctx.save(); ctx.globalAlpha = clamp(msgT, 0, 1);
        FH.slant(ctx, (W - w) / 2, 24, w, 32, 11, 'rgba(9,16,26,.9)');
        FH.slant(ctx, (W - w) / 2, 24, 7, 32, 11, FH.O);
        FH.cap(ctx, txt, W / 2 + 6, 40.5, 14, '#fff', 'center');
        ctx.restore();
      }

      /* ---- the hole, finished ---- */
      if (sunk) {
        const names = waitingFor();
        const good = strokes <= C.par;
        /* an ace is the one thing out here that earns the pink */
        const accent = strokes === 1 ? FH.P : good ? FH.Y : FH.O;
        const head = sunkMsg.toUpperCase();
        const e = gOut(clamp(GU.stamp * 1.6, 0, 1));
        const w = Math.max(320, FH.capW(ctx, head, 46, { italic: true, weight: 800 }) + 110);
        const x = (W - w) / 2, y = 128 - (1 - e) * 18;
        ctx.save(); ctx.globalAlpha = e;
        FH.slant(ctx, x, y, w, 60, 18, 'rgba(9,16,26,.9)');
        FH.slant(ctx, x + 4, y + 60, w - 8, 6, 18, accent);
        FH.num(ctx, head, W / 2 + 9, y + 32, 46, '#fff', 'center', { shadow: 'rgba(0,0,0,.4)', sy: 3 });
        FH.cap(ctx, strokes + (strokes === 1 ? ' STROKE' : ' STROKES') + '  ·  PAR ' + C.par,
               W / 2 + 4, y + 82, 12.5, 'rgba(244,244,240,.72)', 'center');
        if (names.length) FH.cap(ctx, 'WAITING FOR THE GROUP', W / 2, H - 78, 12, FH.Y, 'center',
                                 { alpha: .5 + Math.sin(GU.t * 2.4) * .3 });
        ctx.restore();
      }

      /* ---- everybody tees off together ---- */
      if (startT > 0) {
        const n = Math.ceil(startT - .2);
        ctx.save();
        ctx.fillStyle = 'rgba(5,10,17,.66)'; ctx.fillRect(0, 0, W, H);
        const k = 1 - (startT % 1);
        FH.num(ctx, n > 0 ? String(n) : 'GO', W / 2, H / 2 - 8, n > 0 ? 96 : 68, '#fff', 'center',
               { alpha: .4 + k * .6 });
        FH.slant(ctx, W / 2 - 90, H / 2 + 26, 180, 5, 6, FH.Y);
        FH.cap(ctx, 'EVERYONE TEES OFF TOGETHER', W / 2, H / 2 + 50, 12, 'rgba(244,244,240,.7)', 'center');
        ctx.restore();
      }

      /* ---- the keys, printed along the foot the way the festival does ----
         They stand down while a putt is being measured out: the power bar
         lives in the same strip, and two things there at once is neither. */
      if (!sunk && startT <= 0 && !aiming) {
        let px = 76;
        const a = .5 + GU.hint * .45;
        px += FH.prompt(ctx, px, H - 41, 'DRAG', 'Putt', { alpha: a });
        px += FH.prompt(ctx, px, H - 41, 'V', VIEW.overview() ? 'Back' : 'Look round', { alpha: a });
        FH.prompt(ctx, px, H - 41, 'ESC', 'Pause', { alpha: a });
      }

      if (RACE) drawCard(ctx);
      else {
        /* your nameplate, under the card the way a festival prints a driver's */
        const nm = fhFit(ctx, MYNAME, 190, 12), pw2 = FH.capW(ctx, nm, 12) + 28, px2 = W - 22 - pw2;
        FH.tile(ctx, px2, 104, pw2, 24, { fill: mixHex(PLATE.b, '#05090f', .28), shadow: .3 });
        ctx.fillStyle = PLATE.a; ctx.fillRect(px2, 125, pw2, 3);
        FH.cap(ctx, nm, px2 + pw2 / 2, 115, 12, PLATE.a, 'center');
      }
      if (VIEW.overview()) drawMap(ctx);
      drawEye(ctx);
      ctx.restore();
    }
    /* the group, on the board the way a starter keeps it: a row each, yours
       in the colour that means you */
    function drawCard(ctx) {
      const list = RACE.list(), w = 186, x = W - w - 22, y = 112;
      ctx.save();
      FH.cap(ctx, 'THE GROUP', x + w, y, 11, 'rgba(244,244,240,.55)', 'right');
      list.forEach((p, i) => {
        const ry = y + 12 + i * 26;
        const q = p.me ? { ph: 'p', s: strokes, d: sunk } : RACE.peers[p.id];
        const label = p.done ? 'DONE' : !q || q.ph !== 'p' ? '–' : q.d ? 'IN' : String(q.s);
        FH.tile(ctx, x, ry, w, 22, { fill: p.me ? mixHex(PLATE.b, '#f5e11c', .72) : 'rgba(9,16,26,.74)', shadow: .22 });
        ctx.fillStyle = p.me ? PLATE.a : colOfId(p.id); ctx.fillRect(x, ry, 4, 22);
        FH.cap(ctx, fhFit(ctx, p.name, w - 62, 12), x + 12, ry + 11.5, 12, p.me ? FH.INK : '#f4f4f0', 'left');
        FH.num(ctx, label, x + w - 9, ry + 11.5, 15, p.me ? FH.INK : (q && q.d ? FH.Y : 'rgba(244,244,240,.7)'), 'right');
      });
      ctx.restore();
    }
    /* The whole hole in the corner, drawn the way the card on the tee box
       draws it: printed on the same stock as everything else, the lane in
       green ink, the tunnels dashed, a flag at the cup and a ring round
       wherever your ball has got to. */
    function drawMap(ctx) {
      const b = C.bounds, w = 178, h = 116, x = W - w - 16, y = H - h - 16;
      const k = Math.min((w - 26) / (b.x1 - b.x0), (h - 30) / (b.y1 - b.y0));
      const ox = x + w / 2 - (b.x0 + b.x1) / 2 * k, oy = y + h / 2 + 4 - (b.y0 + b.y1) / 2 * k;
      const mx = v => ox + v * k, my = v => oy + v * k;
      ctx.save();
      FH.tile(ctx, x, y, w, h, { fill: 'rgba(9,16,26,.86)', shadow: .3 });
      FH.tile(ctx, x, y, w, 19, { fill: FH.Y, shadow: 0 });
      FH.cap(ctx, 'HOLE ' + (hole + 1), x + 9, y + 10, 11, FH.INK, 'left');
      FH.cap(ctx, 'PAR ' + C.par, x + w - 9, y + 10, 11, 'rgba(18,22,29,.7)', 'right');
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 4, y + 23, w - 8, h - 29); ctx.clip();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const lane = () => {
        ctx.beginPath();
        ctx.moveTo(mx(C.segs[0].ax), my(C.segs[0].ay));
        for (const g of C.segs) ctx.lineTo(mx(g.bx), my(g.by));
      };
      lane(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(4, C.hw * 2 * k + 3); ctx.stroke();
      lane(); ctx.strokeStyle = '#4e8f68'; ctx.lineWidth = Math.max(3, C.hw * 2 * k); ctx.stroke();
      /* a pipe is a shortcut, so it is dashed on the card like a footpath */
      for (const tn of C.F.tunnel) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = TURFI; ctx.lineWidth = Math.max(2, tn.hw * 2 * k);
        ctx.beginPath(); ctx.moveTo(mx(tn.ax), my(tn.ay)); ctx.lineTo(mx(tn.bx), my(tn.by)); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.lineCap = 'butt';
      for (const c of C.F.creek) {
        const L2 = C.hw * 1.15;
        ctx.strokeStyle = c.lava ? '#d2601f' : '#3f7f99'; ctx.lineWidth = Math.max(2, c.w * k);
        ctx.beginPath(); ctx.moveTo(mx(c.x - c.ty * L2), my(c.y + c.tx * L2)); ctx.lineTo(mx(c.x + c.ty * L2), my(c.y - c.tx * L2)); ctx.stroke();
        ctx.strokeStyle = '#4e8f68';
        for (const br of c.br) {
          const bx = c.x - c.ty * br.t, by = c.y + c.tx * br.t;
          ctx.lineWidth = Math.max(1.5, br.w * k);
          ctx.beginPath(); ctx.moveTo(mx(bx - c.tx * c.w * .6), my(by - c.ty * c.w * .6)); ctx.lineTo(mx(bx + c.tx * c.w * .6), my(by + c.ty * c.w * .6)); ctx.stroke();
        }
      }
      for (const s of C.F.sand) {
        ctx.fillStyle = '#b59a68';
        ctx.beginPath(); ctx.ellipse(mx(s.x), my(s.y), Math.max(1.5, s.r * s.e * k), Math.max(1.5, s.r * k), Math.atan2(s.ty, s.tx), 0, TAU); ctx.fill();
      }
      for (const p of C.F.pond) {
        ctx.fillStyle = p.lava ? '#d2601f' : '#3f7f99';
        ctx.beginPath(); ctx.arc(mx(p.x), my(p.y), Math.max(1.5, p.r * k), 0, TAU); ctx.fill();
      }
      for (const m of C.F.mill) {
        ctx.strokeStyle = LG_MU; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(mx(m.fr.x), my(m.fr.y), 3, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx(m.fr.x) - 4, my(m.fr.y) - 4); ctx.lineTo(mx(m.fr.x) + 4, my(m.fr.y) + 4);
        ctx.moveTo(mx(m.fr.x) + 4, my(m.fr.y) - 4); ctx.lineTo(mx(m.fr.x) - 4, my(m.fr.y) + 4); ctx.stroke();
      }
      /* the cup, with its flag flying the same way the real one does */
      ctx.fillStyle = LG_LINE;
      ctx.beginPath(); ctx.arc(mx(C.cup.x), my(C.cup.y), 2.6, 0, TAU); ctx.fill();
      flagMark(ctx, mx(C.cup.x), my(C.cup.y), .78, Math.sin(GU.t * 2.6) * 1.4);
      if (RACE) for (const id in RACE.peers) {
        const q = RACE.peers[id];
        if (!q || q.ph !== 'p' || q.h !== hole || q.d) continue;
        ctx.fillStyle = colOfId(id);
        ctx.beginPath(); ctx.arc(mx(q.rx === undefined ? q.x : q.rx), my(q.ry === undefined ? q.y : q.ry), 2.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(8,11,9,.6)'; ctx.lineWidth = .8; ctx.stroke();
      }
      if (!sunk) {
        const pulse = 4.5 + Math.sin(GU.t * 3.4) * 1.5;
        ctx.strokeStyle = 'rgba(242,236,226,.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx(ball.x), my(ball.y), pulse, 0, TAU); ctx.stroke();
        ctx.fillStyle = RACE ? MYCOL : '#ffffff';
        ctx.beginPath(); ctx.arc(mx(ball.x), my(ball.y), 3, 0, TAU); ctx.fill();
        ctx.strokeStyle = LG_MU; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }
    /* the eye button: a look over the whole hole, and back */
    function drawEye(ctx) {
      const e = EYE, on = VIEW.overview();
      ctx.save();
      FH.tile(ctx, e.x, e.y, e.w, e.h, { fill: on ? FH.Y : 'rgba(9,16,26,.8)', shadow: .3 });
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2 - 3;
      const ink = on ? FH.INK : '#f4f4f0';
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.quadraticCurveTo(cx, cy - 10, cx + 10, cy);
      ctx.quadraticCurveTo(cx, cy + 10, cx - 10, cy); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, TAU); ctx.fill();
      FH.cap(ctx, 'V', cx, e.y + e.h - 7, 9.5, on ? 'rgba(18,22,29,.7)' : 'rgba(244,244,240,.6)', 'center');
      ctx.restore();
    }

    /* =============================================== the overhead view === */
    /* The same course from straight above, scrolling with the ball: the lane
       is one thick stroke with round joins — exactly the shape the physics
       uses — over a wider one for its rails, and height shows as light and
       shade. For machines without WebGL2, or anyone who would rather play it
       flat. */
    function makeViewFlat() {
      const cam = { x: 0, y: 0, k: .8 };
      cam.toScreen = (x, y) => ({ x: W / 2 + (x - cam.x) * cam.k, y: H / 2 + (y - cam.y) * cam.k, w: 1 });
      cam.toGround = (sx, sy) => ({ x: cam.x + (sx - W / 2) / cam.k, y: cam.y + (sy - H / 2) / cam.k });
      const input = Gfx3D.groundInput(api.input, () => cam, 0);
      let over = false, lastT = performance.now();
      function goal() {
        if (over) {
          const b = C.bounds;
          return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, k: Math.min((W - 90) / (b.x1 - b.x0), (H - 140) / (b.y1 - b.y0)) };
        }
        return { x: ball.x + ball.vx * .15, y: ball.y + ball.vy * .15, k: .8 };
      }
      function render(ctx) {
        const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000);
        lastT = now;
        if (!aiming) {
          const g = goal(), e = 1 - Math.exp(-dt * 3);
          cam.x += (g.x - cam.x) * e; cam.y += (g.y - cam.y) * e; cam.k += (g.k - cam.k) * e;
        }
        const Ch = C, F = Ch.F, th = T, t = now / 1000;
        ctx.fillStyle = th.bgB; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(W / 2, H / 2); ctx.scale(cam.k, cam.k); ctx.translate(-cam.x, -cam.y);
        const b = Ch.bounds;
        ctx.fillStyle = th.rough; ctx.fillRect(b.x0 - 4000, b.y0 - 4000, b.x1 - b.x0 + 8000, b.y1 - b.y0 + 8000);
        /* creeks run on out through the country */
        for (const c of F.creek) {
          ctx.strokeStyle = c.lava ? '#ea580c' : th.waterB; ctx.lineWidth = c.w; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(c.x - c.ty * 3000, c.y + c.tx * 3000); ctx.lineTo(c.x + c.ty * 3000, c.y - c.tx * 3000); ctx.stroke();
        }
        for (const l of F.lake) { ctx.fillStyle = th.waterB; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill(); }
        const lane = () => {
          ctx.beginPath();
          ctx.moveTo(Ch.segs[0].ax, Ch.segs[0].ay);
          for (const g of Ch.segs) ctx.lineTo(g.bx, g.by);
        };
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        lane(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Ch.hw * 2 + 44; ctx.stroke();
        lane(); ctx.strokeStyle = th.railDark; ctx.lineWidth = Ch.hw * 2 + 36; ctx.stroke();
        lane(); ctx.strokeStyle = th.railFace; ctx.lineWidth = Ch.hw * 2 + 28; ctx.stroke();
        lane(); ctx.strokeStyle = th.turfB; ctx.lineWidth = Ch.hw * 2; ctx.stroke();
        lane(); ctx.setLineDash([44, 44]); ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = Ch.hw * 2 - 10; ctx.stroke(); ctx.setLineDash([]);
        /* hills light, hollows dark */
        const glow = (x, y, r, c0) => {
          const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, c0); gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        };
        for (const h of F.hill) glow(h.x - h.r * .15, h.y - h.r * .15, h.r, 'rgba(255,255,255,.2)');
        for (const w of F.bowl) glow(w.x, w.y, w.r, 'rgba(0,0,0,.32)');
        for (const g of F.gully) {
          ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = g.w * .7; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(g.x - g.ty * Ch.hw, g.y + g.tx * Ch.hw); ctx.lineTo(g.x + g.ty * Ch.hw, g.y - g.tx * Ch.hw); ctx.stroke();
        }
        for (const s of F.sand) {
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.ty, s.tx));
          ctx.fillStyle = th.sandRim; ctx.beginPath(); ctx.ellipse(0, 0, s.r * s.e + 4, s.r + 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = th.sand; ctx.beginPath(); ctx.ellipse(0, 0, s.r * s.e, s.r, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 2;
          for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, s.r * s.e * i / 4, s.r * i / 4, 0, 0, TAU); ctx.stroke(); }
          ctx.restore();
        }
        for (const r of F.ramp) {
          const f = Ch.frame(r.s + r.len / 2), wid = r.w || Ch.hw * 2;
          ctx.save(); ctx.translate(f.x + f.nx * r.t, f.y + f.ny * r.t); ctx.rotate(f.a);
          ctx.fillStyle = 'rgba(253,224,71,.28)'; ctx.fillRect(-r.len / 2, -wid / 2, r.len, wid);
          ctx.fillStyle = '#fde047';
          for (let i = 0; i < 3; i++) {
            const u = -r.len / 2 + ((t * 60 + i * r.len / 3) % r.len);
            ctx.beginPath(); ctx.moveTo(u, -wid * .3); ctx.lineTo(u + 16, 0); ctx.lineTo(u, wid * .3); ctx.lineTo(u + 7, 0); ctx.fill();
          }
          ctx.restore();
        }
        for (const c of F.creek) {
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.atan2(c.ty, c.tx));
          ctx.fillStyle = c.lava ? '#f97316' : th.waterA; ctx.fillRect(-c.w / 2, -Ch.hw - 18, c.w, Ch.hw * 2 + 36);
          for (const br of c.br) {
            ctx.fillStyle = th.railFace; ctx.fillRect(-c.w / 2 - 14, br.t - br.w / 2 - 3, c.w + 28, br.w + 6);
            ctx.fillStyle = th.turfB; ctx.fillRect(-c.w / 2 - 14, br.t - br.w / 2, c.w + 28, br.w);
          }
          ctx.restore();
        }
        for (const p of F.pond) {
          ctx.fillStyle = p.lava ? '#7c2d12' : th.deep; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.06, 0, TAU); ctx.fill();
          ctx.fillStyle = p.lava ? '#f97316' : th.waterA; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .92, 0, TAU); ctx.fill();
        }
        const block = (x, y, a, hx, hy, c) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-hx + 4, -hy + 5, hx * 2, hy * 2);
          ctx.fillStyle = c; ctx.fillRect(-hx, -hy, hx * 2, hy * 2);
          ctx.restore();
        };
        for (const w of F.wall) block(w.x, w.y, w.a, w.hx, w.hy, th.railFace);
        for (const m of F.mover) { const mb = moverBox(m); block(mb.x, mb.y, mb.a, mb.hx, mb.hy, th.railTop); }
        for (const p of F.post) {
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(p.x + 4, p.y + 5, p.r, 0, TAU); ctx.fill();
          ctx.fillStyle = p.kick ? '#a78bfa' : th.railTop; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        }
        for (const m of F.mill) {
          for (const s of m.sides) block(s.x, s.y, s.a, s.hx, s.hy, '#e7dcc8');
          const a = millAng(m), open = !millBlocked(m);
          ctx.strokeStyle = open ? 'rgba(122,74,42,.55)' : '#7a4a2a'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(m.gate.x - m.fr.nx * 60 * Math.cos(a), m.gate.y - m.fr.ny * 60 * Math.cos(a));
          ctx.lineTo(m.gate.x + m.fr.nx * 60 * Math.cos(a), m.gate.y + m.fr.ny * 60 * Math.cos(a)); ctx.stroke();
          if (!open) { ctx.fillStyle = '#7a4a2a'; block(m.gate.x, m.gate.y, m.gate.a, m.gate.hx + 2, m.gate.hy, '#7a4a2a'); }
        }
        /* a pipe, from above: the same carpet, cased in and hooped over */
        for (const tn of F.tunnel) {
          const pipe = () => { ctx.beginPath(); ctx.moveTo(tn.ax, tn.ay); ctx.lineTo(tn.bx, tn.by); };
          ctx.lineCap = 'butt';
          pipe(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = tn.hw * 2 + 20; ctx.stroke();
          pipe(); ctx.strokeStyle = th.railFace; ctx.lineWidth = tn.hw * 2 + 12; ctx.stroke();
          pipe(); ctx.strokeStyle = th.turfB; ctx.lineWidth = tn.hw * 2; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.17)'; ctx.lineWidth = 3;
          for (let u = 24; u < tn.L - 10; u += 34) {
            const x = tn.ax + tn.tx * u, y = tn.ay + tn.ty * u;
            ctx.beginPath(); ctx.moveTo(x + tn.ty * tn.hw, y - tn.tx * tn.hw); ctx.lineTo(x - tn.ty * tn.hw, y + tn.tx * tn.hw); ctx.stroke();
          }
          ctx.lineCap = 'round';
        }
        /* the cup and its flag */
        const cp = Ch.cup;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cp.x, cp.y + 2, CUPR + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.arc(cp.x, cp.y, CUPR, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(cp.x, cp.y - 4); ctx.lineTo(cp.x + 34, cp.y - 12 + Math.sin(t * 4) * 2); ctx.lineTo(cp.x, cp.y - 22); ctx.fill();
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(cp.x, cp.y - 24); ctx.stroke();
        /* the trail and the balls */
        for (let i = 0; i < trail.length; i++) {
          ctx.globalAlpha = (i / trail.length) * (TRAILC.s === 'none' ? 0 : .3); ctx.fillStyle = TRAILC.a;
          ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, 3, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        const puck = (x, y, z, hex) => {
          const up = Math.max(0, z - R - Ch.H(x, y));
          ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(x + 3 + up * .3, y + 4 + up * .3, R, R * .7, 0, 0, TAU); ctx.fill();
          const s = 1 + up / 90;
          const gr = ctx.createRadialGradient(x - 3 * s, y - 3 * s, 1, x, y, R * s);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(.6, hex); gr.addColorStop(1, mixHex(hex, '#000000', .35));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R * s, 0, TAU); ctx.fill();
        };
        if (RACE) for (const id in RACE.peers) {
          const q = RACE.peers[id];
          if (!q || q.ph !== 'p' || q.h !== hole || q.d) continue;
          const bx = q.rx === undefined ? q.x : q.rx, by = q.ry === undefined ? q.y : q.ry;
          puck(bx, by, q.rz === undefined ? Ch.H(bx, by) + R : q.rz, colOfId(id));
        }
        if (!(sunk && sinkT > .3)) puck(ball.x, ball.y, ball.z, RACE ? MYCOL : BALLC);
        if (aiming) {
          const dx = ball.x - aimX, dy = ball.y - aimY, d = Math.min(Math.hypot(dx, dy), PULL), a = Math.atan2(dy, dx);
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 60;
          ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + Math.cos(a) * d * 1.9, ball.y + Math.sin(a) * d * 1.9); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(aimX, aimY); ctx.stroke();
        }
        ctx.restore();
      }
      return {
        gl: false, input, render,
        toScreen: (x, y) => cam.toScreen(x, y),
        newHole() { over = false; cam.x = ball.x; cam.y = ball.y; cam.k = .8; },
        step() {}, busy: () => false, skip() {}, lost: () => false,
        overview: () => over, toggle() { over = !over; },
        burst(x, y, o) { const s = cam.toScreen(x, y); api.fx.burst(s.x, s.y, o); },
        splash(x, y, level, lava) {
          const s = cam.toScreen(x, y);
          api.fx.burst(s.x, s.y, { color: lava ? '#fde047' : '#e0f2fe', count: 18, speed: 240, size: 4, life: .55 });
        },
        celebrate() {},
        dispose() {}
      };
    }

    /* ==================================================== the 3D view === */
    /* Each hole is built once into a scene: the country (a fine grid round
       the course, a coarse one out to the mountains), water lying over its
       low ground, the carpet lane and its rails, everything set along it, and
       a valley of trees, grass and rock. The camera sits behind the ball and
       looks down the lane. It holds still while you aim, trails the ball
       when it rolls, flies the hole from the cup back to the tee when you
       arrive, and pulls up to show the whole hole on the eye button. */
    function makeView3D(G) {
      const { Geo, M4, Q, K, FX } = Gfx3D, L = Gfx3D.lin;
      const S = G.scope();
      let HS = null;                                   // freed whenever the hole changes
      const cam = Gfx3D.camera(W, H);
      cam.near = 8; cam.far = 46000;
      const PS = Gfx3D.particles(1600);
      const AMB = { list: [] };                        // steady glows, refilled every frame
      /* Aiming works on the screen, not the ground. Press anywhere and pull
         back: straight down the screen is straight back from the ball, and
         how far you pull is the power, eased so a short putt has room to be
         judged. A pull on the ground plane would run off the bottom of the
         screen long before full power with the camera this low. The game
         reads a press as a press on the ball, and the pull as a spot on the
         ground behind it, exactly as the overhead view gives it. */
      const FULL = 180;                                // pixels of pull for a full-power putt
      const input = (() => {
        const I = api.input, anchor = { x: 0, y: 0 }, ptr = { x: 0, y: 0, down: false, rdown: false, inside: false };
        const map = (sx, sy) => {
          const dx = sx - anchor.x, dy = sy - anchor.y, l = Math.hypot(dx, dy);
          if (l < 1e-3) return { x: ball.x, y: ball.y };
          const u = l / FULL, k = (u < 1 ? Math.pow(u, 1.4) : u) * PULL / l, r = cam.r;
          return { x: ball.x + (r[0] * dx - r[1] * dy) * k, y: ball.y + (r[1] * dx + r[0] * dy) * k };
        };
        return {
          down: c => I.down(c), pressed: c => I.pressed(c),
          any: (...c) => I.any(...c), anyPressed: (...c) => I.anyPressed(...c),
          get pointer() {
            const p = I.pointer, w = map(p.x, p.y);
            ptr.x = w.x; ptr.y = w.y; ptr.down = p.down; ptr.rdown = p.rdown; ptr.inside = p.inside;
            return ptr;
          },
          get clicks() { return I.clicks; },
          takeClick() {
            const c = I.takeClick();
            if (!c) return null;
            anchor.x = c.x; anchor.y = c.y;
            return { x: ball.x, y: ball.y, btn: c.btn };
          },
          takeChars: () => I.takeChars(), takeMoves: () => I.takeMoves(), takeSwipe: () => I.takeSwipe()
        };
      })();
      const T4 = M4.make();
      const col = (hex, a) => Gfx3D.withAo(L(hex), a === undefined ? 1 : a);
      const W1 = [1, 1, 1, 1];
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

      /* ---------------- shared by every hole ---------------- */
      let g = Geo(); g.sphere(0, 0, 0, 1, 32, 20, W1);
      const meshBall = S.mesh(g);
      g = Geo(); g.decal(0, 0, 0, 1);
      const meshDecal = S.mesh(g);
      g = Geo();
      g.cyl(0, 0, -6, 96, 1.4, 10, col('#e5e7eb'), { top: true });
      g.sphere(0, 0, 97.5, 2.6, 12, 8, col('#fbbf24'));
      const meshPin = S.mesh(g);
      const dFlag = S.dyn(), dTrail = S.dyn(), dAim = S.dyn(), dHead = S.dyn();
      const mPin = G.mat({ kind: K.PLAIN, spec: .6, gloss: 60 });
      const mFlag = G.mat({ kind: K.PLAIN, spec: .1, gloss: 10, two: true, wrap: .6 });
      const MYBALL = BALLC, TRAIL = TRAILC;
      /* the ring that says which ball is yours when there are four out there */
      const MYC3 = Gfx3D.lin(MYCOL || '#f8fafc');
      const fxMine = G.fxMat({ fx: FX.RING, color: [1, 1, 1, .85], p: [.82, .2, 0, 0] });
      const trc = Gfx3D.lin(TRAIL.a);
      const fxTrail = G.fxMat({ fx: FX.TRAIL, color: [trc[0], trc[1], trc[2], TRAIL.s === 'none' ? 0 : .42], add: true });
      const fxAim = G.fxMat({ fx: FX.DASH, color: [1, 1, 1, .85], p: [16, .55, 36, 0], depth: false });
      const fxHead = G.fxMat({ fx: FX.SOLID, color: [1, 1, 1, .9], depth: false });
      const fxPowerRing = G.fxMat({ fx: FX.RING, color: [1, 1, 1, .8], p: [.86, .16, 0, 0], depth: false });
      const fxChev = G.fxMat({ fx: FX.CHEVRON, color: [.99, .8, .16, .9], p: [46, .8, 34, 0] });
      const fxTrack = G.fxMat({ fx: FX.DASH, color: [0, 0, 0, .3], p: [1e4, 1, 0, 0] });
      const fxRip = [], fxBump = [], ballMats = {}, blobMats = {};
      for (let i = 0; i < 8; i++) {
        fxRip.push(G.fxMat({ fx: FX.RING, color: [1, 1, 1, .5], p: [.9, .12, 0, 0] }));
        fxBump.push(G.fxMat({ fx: FX.RING, color: [.99, .88, .28, .8], p: [.9, .1, 0, 0], add: true }));
      }
      const ballMat = c => ballMats[c] || (ballMats[c] = G.mat({ kind: K.GOLF, spec: .55, gloss: 70, wrap: .2, c1: L(c) }));
      const blobMat = id => blobMats[id] || (blobMats[id] = G.fxMat({ fx: FX.BLOB, color: [0, 0, 0, .5], p: [1.5, 0, 0, 0] }));

      /* ---------------- the lane's outline, for the rails ---------------- */
      /* Both edges of the lane at distance `off` from the spine, joined round
         both ends into one closed loop with outward normals. On the outside
         of a bend an edge goes round the corner in an arc; on the inside the
         two edges meet at a mitred point. This is the same shape as "within
         off of the spine", which is the shape the physics keeps the ball in. */
      function laneOutline(Ch, off) {
        const segs = Ch.segs;
        const zEdge = (s, sg) => Ch.wallBase({ s, t: sg });
        const run = sg => {
          const pts = [];
          /* Every corner is worked out before a single step is laid, because
             a corner decides where the steps either side of it may go. On the
             outside of a bend the edge swings round an arc at the corner
             itself. On the inside the two edges meet at one mitred point —
             and that point sits back down the segment coming in and on down
             the segment going out, so the steps have to stop short of it and
             pick up again beyond it. Stepping blindly to the corner walks
             past the mitre and folds the rail back over itself, which is
             what throws loose planks across the lane. */
          const J = [];
          for (let i = 0; i < segs.length - 1; i++) {
            const gs = segs[i], h = segs[i + 1];
            const nx = -gs.ty * sg, ny = gs.tx * sg, mx = -h.ty * sg, my = h.tx * sg;
            const zb = zEdge(gs.s0 + gs.L, sg);
            if (nx * h.tx + ny * h.ty < 0) J.push({ arc: true, nx, ny, mx, my, zb, back: 0, fwd: 0 });
            else {
              const sx = nx + mx, sy = ny + my, sl = Math.hypot(sx, sy) || 1, ux = sx / sl, uy = sy / sl;
              const mi = 1 / Math.max(.3, ux * nx + uy * ny);
              const px = gs.bx + ux * off * mi, py = gs.by + uy * off * mi;
              J.push({ arc: false, px, py, ux, uy, mi, zb,
                       back: Math.max(0, -((px - gs.bx) * gs.tx + (py - gs.by) * gs.ty)),
                       fwd: Math.max(0, (px - h.ax) * h.tx + (py - h.ay) * h.ty) });
            }
          }
          for (let i = 0; i < segs.length; i++) {
            const gs = segs[i], nx = -gs.ty * sg, ny = gs.tx * sg;
            /* Stepped along, not corner to corner: the rail follows the lane's
               rise that way, and a pipe breaking through it has points to take
               a bite out of. */
            const a = i > 0 ? Math.min(gs.L, J[i - 1].fwd + (J[i - 1].arc ? 0 : 7)) : 0;
            const b = i < J.length ? Math.max(a, gs.L - J[i].back - (J[i].arc ? 0 : 7)) : gs.L;
            const ns = Math.max(1, Math.round((b - a) / 16));
            for (let k = 0; k <= ns; k++) {
              const u = a + (b - a) * k / ns;
              pts.push([gs.ax + gs.tx * u + nx * off, gs.ay + gs.ty * u + ny * off, nx, ny, zEdge(gs.s0 + u, sg), 1]);
            }
            if (i >= J.length) continue;
            const j = J[i];
            if (j.arc) {
              const a0 = Math.atan2(j.ny, j.nx);
              let da = Math.atan2(j.my, j.mx) - a0;
              while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
              const n = Math.max(2, Math.ceil(Math.abs(da) / .12));
              for (let k = 0; k <= n; k++) {
                const ang = a0 + da * k / n, cx = Math.cos(ang), cy = Math.sin(ang);
                pts.push([gs.bx + cx * off, gs.by + cy * off, cx, cy, j.zb, 1]);
              }
            } else pts.push([j.px, j.py, j.ux, j.uy, j.zb, j.mi]);
          }
          return pts;
        };
        const cap = (px, py, fx, fy, dx, dy, zb) => {
          const pts = [], a0 = Math.atan2(fy, fx);
          let da = Math.atan2(dy, dx) - a0;
          while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          da *= 2;
          for (let k = 1; k < 14; k++) {
            const a = a0 + da * k / 14, cx = Math.cos(a), cy = Math.sin(a);
            pts.push([px + cx * off, py + cy * off, cx, cy, zb, 1]);
          }
          return pts;
        };
        const gl = segs[segs.length - 1], g0 = segs[0];
        return [].concat(run(-1),
          cap(gl.bx, gl.by, gl.ty, -gl.tx, gl.tx, gl.ty, Ch.zAt(Ch.len)),
          run(1).reverse(),
          cap(g0.ax, g0.ay, -g0.ty, g0.tx, -g0.tx, -g0.ty, Ch.zAt(0)));
      }

      /* ---------------- building a hole ---------------- */
      let M = null, env = null, key = '', lastT = performance.now();
      function build() {
        if (HS) HS.dispose();
        HS = G.scope();
        const th = T, Ch = C, F = Ch.F, b = Ch.bounds;
        M = { movers: [], mills: [], glows: [], flies: [] };
        let seed = 7 + hole * 31 + courseIdx * 97;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const seaOn = th.sea > -9000;

        /* ---- what this world is made of ---- */
        /* the cup is a hole right through the carpet and the ground under it */
        const holes = [[Ch.cup.x, Ch.cup.y, CUPR]];
        M.mLand = G.mat({ kind: K.LAND, spec: .04, gloss: 10, wrap: .4, c1: L(th.land[0]), c2: L(th.land[1]), c3: L(th.land[2]), c4: L(th.land[3]),
                          p1: [0, th.style, seaOn ? th.sea : -99999, th.snow || 0], cast: false, cutC: holes });
        /* the bank over a tunnel is the same country as the rest, but it is
           a thing standing up off the ground, so unlike the ground it throws
           a shadow */
        M.mBank = G.mat({ kind: K.LAND, spec: .04, gloss: 10, wrap: .4, c1: L(th.land[0]), c2: L(th.land[1]), c3: L(th.land[2]), c4: L(th.land[3]),
                          p1: [0, th.style, seaOn ? th.sea : -99999, th.snow || 0] });
        M.mLane = G.mat({ kind: K.LANE, spec: .08, gloss: 16, wrap: .45, c1: L(th.lane[0]), c2: L(th.lane[1]), c3: L(th.sand), c4: L(th.sandDeep),
                          p1: [230, Ch.hw, th.slick ? 1 : 0, 0], cutC: holes, cast: false });
        const pool = mode => mode === 1
          ? G.mat({ kind: K.POOL, p1: [1, 0, 0, 0], c1: L('#fff1a8'), c2: L('#ff6a1a'), c3: L('#2a140e'), cast: false })
          : mode === 2 ? G.mat({ kind: K.POOL, p1: [2, 0, 0, 0], spec: .5, gloss: 200, c1: L('#dcf2fb'), c2: L('#8fc2dc'), cast: false })
          : G.mat({ kind: K.POOL, p1: [0, 0, 0, 0], c1: L(th.waterA), c2: L(th.deep), cast: false, blend: true });
        M.mSea = pool(th.seaK); M.mWater = pool(0); M.mLava = pool(1);
        const rail = th.rail;
        M.mRail = rail === 'wood' ? G.mat({ kind: K.WOOD, spec: .3, gloss: 30, p1: [.12, 0, 0, 0] })
                : rail === 'stone' ? G.mat({ kind: K.STONE, spec: .08, gloss: 16, p1: [26, 8, 0, 0] })
                : rail === 'basalt' ? G.mat({ kind: K.STONE, spec: .45, gloss: 60, p1: [30, 10, 0, 0] })
                : rail === 'ice' ? G.mat({ kind: K.ICE, spec: .6, gloss: 160, wrap: .6 })
                : G.mat({ kind: K.WOOD, spec: .2, gloss: 24, p1: [.12, 0, 0, 0] });
        const railCol = { wood: th.railFace, stone: th.railTop, basalt: '#3a3444', ice: '#cdeefa', night: '#3b3150' }[rail];
        M.mPost = rail === 'stone' ? G.mat({ kind: K.ROCK, spec: .06, gloss: 12, p1: [0, 0, 0, 0] })
                : rail === 'basalt' ? G.mat({ kind: K.PLAIN, spec: .9, gloss: 90 })
                : rail === 'ice' ? G.mat({ kind: K.ICE, spec: .8, gloss: 120, wrap: .6 })
                : G.mat({ kind: K.WOOD, spec: .25, gloss: 30, p1: [.2, 0, 0, 0] });
        M.mPlain = G.mat({ kind: K.PLAIN, spec: .2, gloss: 24, wrap: .45 });
        M.mCup = G.mat({ kind: K.PLAIN, spec: .4, gloss: 40, two: true, cast: false });
        M.mWood = G.mat({ kind: K.WOOD, spec: .2, gloss: 24, p1: [.15, 0, 0, 0] });
        M.mMasonry = G.mat({ kind: K.STONE, spec: .06, gloss: 12, wrap: .35, p1: [18, 7, 0, 0] });
        M.mTunnel = G.mat({ kind: K.STONE, spec: .07, gloss: 16, wrap: .28, p1: [14, 6, 0, 0], two: true });
        M.mRoof = G.mat({ kind: K.ROCK, spec: .025, gloss: 8, p1: [0, 0, 0, 0] });
        M.mBark = G.mat({ kind: K.BARK, spec: .05, gloss: 8, wrap: .4 });
        M.mLeaf = G.mat({ kind: K.LEAF, spec: .05, gloss: 8, wrap: .6, sway: 2.6, two: true });
        M.mGrass = G.mat({ kind: K.LEAF, spec: .03, gloss: 6, wrap: .7, sway: 1.8, two: true, cast: false });
        const moss = { meadow: ['#4f7a35', .6], glacier: ['#f2f8fc', 1], night: ['#2a4a3a', .5] }[th.flora] || ['#000000', 0];
        M.mRock = G.mat({ kind: K.ROCK, spec: .08, gloss: 14, c1: L(moss[0]), p1: [moss[1], 0, 0, 0] });
        M.mGlow = G.mat({ kind: K.GLOW, spec: .2, gloss: 20, p1: [2.4, .12, 0, 0] });
        M.mGlowSoft = G.mat({ kind: K.GLOW, spec: .3, gloss: 40, p1: [.75, .2, 0, 0] });     // crystal posts and mushroom caps: lit from within, not blazing
        M.mIce = G.mat({ kind: K.ICE, spec: .8, gloss: 120, wrap: .6 });

        /* ---- the country: fine round the course, coarse to the mountains ---- */
        const IN = { x0: b.x0 - 1700, y0: b.y0 - 1700, x1: b.x1 + 1700, y1: b.y1 + 1700 };
        const terrain = (x0, y0, x1, y1, cell, drop, skipLand, skipSea) => {
          const nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell), w = nx + 1;
          const hs = new Float32Array(w * (ny + 1));
          for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) hs[j * w + i] = Ch.land(x0 + i * cell, y0 + j * cell);
          const gl = Geo(), gw = Geo(), vid = new Int32Array(w * (ny + 1)).fill(-1), wid = new Int32Array(w * (ny + 1)).fill(-1);
          const vtx = (i, j) => {
            const k = j * w + i;
            if (vid[k] >= 0) return vid[k];
            const hl = hs[j * w + Math.max(0, i - 1)], hr = hs[j * w + Math.min(nx, i + 1)];
            const hu = hs[Math.max(0, j - 1) * w + i], hd = hs[Math.min(ny, j + 1) * w + i];
            const gx = (hr - hl) / (2 * cell), gy = (hd - hu) / (2 * cell), l = Math.hypot(gx, gy, 1);
            return (vid[k] = gl.v(x0 + i * cell, y0 + j * cell, hs[k] - drop, -gx / l, -gy / l, 1 / l, W1, 0, 0));
          };
          const wtx = (i, j) => {
            const k = j * w + i;
            if (wid[k] >= 0) return wid[k];
            return (wid[k] = gw.v(x0 + i * cell, y0 + j * cell, th.sea, 0, 0, 1, [1, 1, 1, clamp((th.sea - hs[k]) / 80, 0, 1)], 0, 0));
          };
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const cx = x0 + (i + .5) * cell, cy = y0 + (j + .5) * cell;
            if (!(skipLand && skipLand(cx, cy))) gl.q(vtx(i, j), vtx(i + 1, j), vtx(i + 1, j + 1), vtx(i, j + 1));
            if (seaOn && !(skipSea && skipSea(cx, cy))) {
              const lo = Math.min(hs[j * w + i], hs[j * w + i + 1], hs[(j + 1) * w + i], hs[(j + 1) * w + i + 1]);
              if (lo < th.sea) gw.q(wtx(i, j), wtx(i + 1, j), wtx(i + 1, j + 1), wtx(i, j + 1));
            }
          }
          return { gl, gw };
        };
        /* The fine grid's edges sit on the coarse grid's lines, so the two
           seas tile exactly — overlapping water would show as a darker seam.
           The coarse ground runs one cell under the fine and a little lower,
           which hides the cracks where their edges disagree. */
        const RO = 18000, oc = 320, ox = Ch.cx0 - RO, oy = Ch.cy0 - RO;
        IN.x0 = ox + Math.floor((IN.x0 - ox) / oc) * oc; IN.x1 = ox + Math.ceil((IN.x1 - ox) / oc) * oc;
        IN.y0 = oy + Math.floor((IN.y0 - oy) / oc) * oc; IN.y1 = oy + Math.ceil((IN.y1 - oy) / oc) * oc;
        /* No sea under the lane or the bank it stands on. The ground is dug
           well down under the carpet so no bunker can show daylight through
           it, which would otherwise put the whole lane below sea level and
           float water up over it. */
        const dry = (x, y) => Ch.near(x, y).e < 40;
        const inner = terrain(IN.x0, IN.y0, IN.x1, IN.y1, 32, 0, null, dry);
        const outer = terrain(ox, oy, ox + 2 * RO, oy + 2 * RO, oc, 8,
          (x, y) => x > IN.x0 + oc && x < IN.x1 - oc && y > IN.y0 + oc && y < IN.y1 - oc,
          (x, y) => x > IN.x0 && x < IN.x1 && y > IN.y0 && y < IN.y1);
        M.land = [HS.mesh(inner.gl), HS.mesh(outer.gl)];
        M.sea = [HS.mesh(inner.gw), HS.mesh(outer.gw)];

        /* ---- creeks, ponds and lakes, lying over the ground they fill ---- */
        const gw = [Geo(), Geo()];
        for (const c of F.creek) {
          const gg = gw[c.lava ? 1 : 0], base = gg.n, across = [-c.w / 2 - 50, -c.w / 4, 0, c.w / 4, c.w / 2 + 50];
          let rows = 0;
          for (let dc = -2600; dc <= 2600; dc += 40) {
            const wob = Math.sin(dc * .0035 + c.ph) * 70 * sst((Math.abs(dc) - Ch.hw - 60) / 400), lv = Ch.creekLevel(c, dc);
            for (const a of across) {
              const x = c.x - c.ty * dc + c.tx * (a + wob), y = c.y + c.tx * dc + c.ty * (a + wob);
              gg.v(x, y, lv, 0, 0, 1, [1, 1, 1, clamp((lv - Ch.H(x, y)) / 80, 0, 1)], 0, 0);
            }
            rows++;
          }
          for (let r = 0; r < rows - 1; r++) for (let k = 0; k < across.length - 1; k++) {
            const a = base + r * across.length + k, a2 = a + across.length;
            gg.q(a, a + 1, a2 + 1, a2);
          }
        }
        const disc = (gg, p, reach) => {
          const base = gg.n, RN = 12, AN = 40, rr2 = p.r * reach;
          for (let i = 0; i <= RN; i++) for (let j = 0; j <= AN; j++) {
            const r = rr2 * i / RN, a = j / AN * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
            gg.v(x, y, p.level, 0, 0, 1, [1, 1, 1, clamp((p.level - Ch.H(x, y)) / 80, 0, 1)], 0, 0);
          }
          for (let i = 0; i < RN; i++) for (let j = 0; j < AN; j++) {
            const a = base + i * (AN + 1) + j, a2 = a + AN + 1;
            gg.q(a, a2, a2 + 1, a + 1);
          }
        };
        for (const p of F.pond) disc(gw[p.lava ? 1 : 0], p, 1.3);
        for (const l of F.lake) disc(gw[0], l, 1.3);
        M.water = HS.mesh(gw[0]); M.lava = HS.mesh(gw[1]);

        /* ---- the lane: a fine height field clipped to the lane, carpet in
           stripes down it, sand wherever a bunker is dug ---- */
        {
          const cell = 7, x0 = b.x0 - 10, y0 = b.y0 - 10;
          const nx = Math.ceil((b.x1 - b.x0 + 20) / cell), ny = Math.ceil((b.y1 - b.y0 + 20) / cell), w = nx + 1, n = w * (ny + 1);
          const hz = new Float32Array(n), qs = new Float32Array(n), qt = new Float32Array(n), inn = new Uint8Array(n);
          const lim = 16;                    // how far past the rails the carpet runs, so a rail stands on it
          for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
            const x = x0 + i * cell, y = y0 + j * cell, q = Ch.near(x, y), k = j * w + i;
            if (q.e < lim + cell * 1.5) { hz[k] = Ch.laneZ(x, y, q); qs[k] = q.s; qt[k] = q.t; inn[k] = q.e < lim ? 2 : 1; }
          }
          const sandW = (x, y) => {
            let s = 0;
            for (const f of F.sand) {
              const dx = x - f.x, dy = y - f.y;
              const rho = Math.hypot((dx * f.tx + dy * f.ty) / (f.r * f.e), (-dx * f.ty + dy * f.tx) / f.r);
              s = Math.max(s, 1 - sst((rho - .82) / .18));
            }
            return s;
          };
          const onRamp = (s, t) => {
            for (const r of F.ramp) { const u = s - r.s; if (u > -3 && u < r.len && (!r.w || Math.abs(t - r.t) < r.w / 2 + 2)) return true; }
            return false;
          };
          /* where a creek or a pond has cut through the lane the carpet gives
             way to a muddy bank running down under the water */
          const wetW = (x, y) => {
            let k = 0;
            for (const c of F.creek) {
              const { dl, dc } = Ch.creekD(c, x, y);
              if (dl > c.w / 2 + 16) continue;
              let deck = false;
              for (const br of c.br) if (Math.abs(dc - br.t) < br.w / 2) deck = true;
              if (!deck) k = Math.max(k, 1 - sst((dl - c.w / 2 + 2) / 12));
            }
            for (const p of F.pond) k = Math.max(k, 1 - sst((Math.hypot(x - p.x, y - p.y) / p.r - .9) / .14));
            return k;
          };
          const MUD = [.34, .3, .24];
          const gL = Geo(), vid = new Int32Array(n).fill(-1);
          const vtx = (i, j) => {
            const k = j * w + i;
            if (vid[k] >= 0) return vid[k];
            const x = x0 + i * cell, y = y0 + j * cell, h = hz[k];
            const hh = (ii, jj) => { const kk = jj * w + ii; return inn[kk] ? hz[kk] : h; };
            const gx = (hh(Math.min(nx, i + 1), j) - hh(Math.max(0, i - 1), j)) / (2 * cell);
            const gy = (hh(i, Math.min(ny, j + 1)) - hh(i, Math.max(0, j - 1))) / (2 * cell);
            const l = Math.hypot(gx, gy, 1);
            const wet = wetW(x, y), m = Gfx3D.mixc(onRamp(qs[k], qt[k]) ? [.74, .78, .74] : [1, 1, 1], MUD, wet);
            const c = [m[0], m[1], m[2], sandW(x, y) * (1 - wet)];
            return (vid[k] = gL.v(x, y, h, -gx / l, -gy / l, 1 / l, c, qs[k], qt[k]));
          };
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const k = j * w + i;
            if (inn[k] === 2 && inn[k + 1] === 2 && inn[k + w] === 2 && inn[k + w + 1] === 2) gL.q(vtx(i, j), vtx(i + 1, j), vtx(i + 1, j + 1), vtx(i, j + 1));
          }
          M.lane = HS.mesh(gL);
        }
        /* chevrons up each ramp, laid on its curve */
        g = Geo();
        for (const r of F.ramp) {
          const wid = (r.w || Ch.hw * 2 - 10) * .9, steps = 12, base = g.n;
          for (let i = 0; i <= steps; i++) {
            const u = r.len * i / steps, fr = Ch.frame(r.s + u);
            for (const sg of [-1, 1]) {
              const t = r.t + sg * wid / 2, x = fr.x + fr.nx * t, y = fr.y + fr.ny * t;
              g.v(x, y, Ch.laneZ(x, y) + .8, 0, 0, 1, W1, u, sg);
            }
          }
          for (let i = 0; i < steps; i++) { const a = base + i * 2; g.q(a, a + 2, a + 3, a + 1); }
        }
        M.chev = HS.mesh(g);
        /* ---- rails, riding the lane's rise and fall ---- */
        g = Geo();
        const outline = laneOutline(Ch, Ch.hw);
        /* deep on both faces: where a creek or a lake cuts away the ground
           beside the lane the rail stands as a wall, not a floating plank */
        const RAILP = [[0, -60], [0, RAILH - 3], [2.5, RAILH], [14.5, RAILH], [17, RAILH - 2.5], [17, -90]];
        /* Where a pipe breaks through, the rail has to give way to it. Rather
           than cutting the loop into pieces — which leaves ends to join up
           wrongly — the rail narrows and dives into the ground across the
           mouth and comes back up the other side, so the opening is clear
           and the rail is still one unbroken run. */
        for (const p of outline) {
          let k = 0;
          for (const tn of F.tunnel) {
            const u = clamp((p[0] - tn.ax) * tn.tx + (p[1] - tn.ay) * tn.ty, 0, tn.L);
            const d = Math.hypot(p[0] - (tn.ax + tn.tx * u), p[1] - (tn.ay + tn.ty * u));
            k = Math.max(k, 1 - sst((d - tn.hw - 30) / 34));
          }
          if (k > .001) { p[4] -= 58 * k; p[5] = (p[5] || 1) * (1 - .6 * k); }
        }
        g.sweep(outline, RAILP, col(railCol));
        M.rail = HS.mesh(g);
        if (rail === 'night') {
          /* little lamps set into the rail top */
          g = Geo();
          let acc = 0;
          for (let i = 0; i < outline.length; i++) {
            const p = outline[i], q = outline[(i + 1) % outline.length];
            acc += Math.hypot(q[0] - p[0], q[1] - p[1]);
            if (acc < 110) continue;
            acc = 0;
            g.sphere(p[0] + p[2] * 8.5 * p[5], p[1] + p[3] * 8.5 * p[5], p[4] + RAILH + 1.2, 2.6, 10, 6, col('#fde68a'));
          }
          M.studs = HS.mesh(g);
        } else M.studs = null;

        /* ---- the tee mat and the cup ---- */
        {
          const fr = Ch.frame(Ch.teeS), mt = Geo(), nP = Math.max(1, ROSTER.length), hy = Math.min(Ch.hw - 16, 30 + (nP - 1) * 17);
          mt.box(-26, -hy, -1, 26, hy, .9, col('#1d4d33'), .5);
          g = Geo(); g.add(mt, M4.place(T4, fr.x, fr.y, Ch.laneZ(fr.x, fr.y), fr.a));
          M.tee = HS.mesh(g);
          const cp = Ch.cup;
          g = Geo();
          g.cyl(cp.x, cp.y, cp.z - 4, cp.z + .05, CUPR, 36, col('#eef2f6'), { inner: true });
          g.cyl(cp.x, cp.y, cp.z - CUPD, cp.z - 4, CUPR, 36, col('#1b2420', .5), { inner: true, c0: [0, 0, 0, .15] });
          g.disc(cp.x, cp.y, cp.z - CUPD, CUPR, 36, [0, 0, 0, .15]);
          M.cup = HS.mesh(g);
        }

        /* ---- what is set along the lane ---- */
        const rockBlob = (gg, cx, cy, cz, r, c, sq) => {
          const seg = 7, rings = 5, p1 = rnd() * 9, p2 = rnd() * 9, p3 = rnd() * 9, pts = [];
          for (let j = 0; j <= rings; j++) {
            const row = [], ph = j / rings * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
            for (let i = 0; i <= seg; i++) {
              const a = i / seg * TAU + j * .4, nx = Math.cos(a) * sp, ny = Math.sin(a) * sp, nz = cp;
              const k = 1 + .3 * Math.sin(nx * 4.1 + p1) * Math.sin(ny * 3.7 + p2) * Math.sin(nz * 4.3 + p3);
              row.push([cx + nx * r * k, cy + ny * r * k, cz + nz * r * k * (sq || .75)]);
            }
            pts.push(row);
          }
          const ctr = [cx, cy, cz];
          for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
            const a = pts[j][i], b2 = pts[j][i + 1], c2 = pts[j + 1][i + 1], d = pts[j + 1][i];
            if (j > 0) gg.face([a, b2, c2], c, ctr);
            if (j < rings - 1) gg.face([a, c2, d], c, ctr);
          }
        };
        const limb = (gg, a, b2, r0, r1, c, seg) => {
          const dx = b2[0] - a[0], dy = b2[1] - a[1], dz = b2[2] - a[2], l = Math.hypot(dx, dy, dz) || 1;
          const Z = [dx / l, dy / l, dz / l], up = Math.abs(Z[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
          const X = Gfx3D.norm(cross(Z, up)), Y = cross(Z, X);
          const t = Geo(); t.lathe([[r0, 0], [r1, l]], seg || 7, c);
          gg.add(t, M4.axes(T4, X, Y, Z, a));
        };
        g = Geo();
        const gpg = Geo();
        for (const p of F.post) {
          if (p.kick) {
            const c = Geo(); c.lathe([[p.r, -2], [p.r * .92, 20], [p.r * .5, 34], [0, 38]], 6, col('#8b5cf6'));
            gpg.add(c, M4.place(T4, p.x, p.y, p.z0, rnd() * TAU));
            M.glows.push([p.x, p.y, p.z0 + 24, 70, [.66, .55, 1], .45]);
          } else if (rail === 'stone') {
            rockBlob(g, p.x, p.y, p.z0 + p.r * .55, p.r * 1.05, col(th.railTop), .8);
            rockBlob(g, p.x, p.y, p.z0 + p.r * 1.6, p.r * .86, col(th.railFace), .75);
            rockBlob(g, p.x, p.y, p.z0 + p.r * 2.45, p.r * .7, col(th.railTop), .7);
          } else if (rail === 'basalt' || rail === 'ice') {
            const c = Geo(); c.lathe([[p.r, -2], [p.r * .8, 26], [p.r * .35, 48], [0, 54]], 6, col(rail === 'ice' ? '#d4f1fd' : '#221d2a'));
            g.add(c, M4.place(T4, p.x, p.y, p.z0, rnd() * TAU));
          } else {
            const c = Geo();
            c.lathe([[p.r, -4], [p.r, 29], [p.r * .78, 33], [0, 34]], 16, col(th.railFace));
            c.lathe([[p.r + .3, 18], [p.r + .3, 24]], 16, col('#f5f0e6'));
            g.add(c, M4.place(T4, p.x, p.y, p.z0));
          }
        }
        M.posts = HS.mesh(g); M.postGlow = HS.mesh(gpg);
        g = Geo();
        for (const w of F.wall) { const bx = Geo(); bx.box(-w.hx, -w.hy, -2, w.hx, w.hy, 26, col(railCol), 3); g.add(bx, M4.place(T4, w.x, w.y, w.z0, w.a)); }
        M.walls = HS.mesh(g);
        for (const m of F.mover) {
          const bx = Geo(); bx.box(-11, -m.len / 2, -2, 11, m.len / 2, 26, col(railCol), 3);
          const tr = Geo(), a = Ch.at(m.s, m.t - m.amp - m.len / 2), c2 = Ch.at(m.s, m.t + m.amp + m.len / 2);
          tr.strip(a[0], a[1], c2[0], c2[1], 26, m.z0 + .6);
          M.movers.push({ m, mesh: HS.mesh(bx), track: HS.mesh(tr) });
        }
        /* Cut-stone arch blocks. Local x follows the passage; an elliptical
           bore stays open all the way through, including at both portals. */
        const archBlock = (gg, x0, x1, ry, rz, spring, thick, a0, a1, c) => {
          const p = (x,a,out) => [x, Math.cos(a)*(ry+out), spring+Math.sin(a)*(rz+out)];
          const A=p(x0,a0,0), B=p(x0,a1,0), C0=p(x0,a1,thick), D=p(x0,a0,thick);
          const E=p(x1,a0,0), F0=p(x1,a1,0), H0=p(x1,a1,thick), I0=p(x1,a0,thick);
          const mid=p((x0+x1)/2,(a0+a1)/2,thick/2);
          for (const pts of [[A,B,C0,D],[E,I0,H0,F0],[A,E,F0,B],[D,C0,H0,I0],[A,D,I0,E],[B,F0,H0,C0]]) gg.face(pts,c,mid);
        };
        /* A tapered masonry mill with a slate cap, inset windows, timber
           gallery and framed sailcloth. Rotor dimensions match the gate. */
        for (const m of F.mill) {
          const fr = m.fr, gb = Geo(), gd = Geo(), gr = Geo(), side = Ch.hw + 14 - m.gap / 2;
          const wallC = rail === 'ice' ? '#e0e9e9' : rail === 'basalt' ? '#76716d' : '#d2c6ad', trimC = '#594431';
          const local = Geo();
          for (const sg of [-1, 1]) {
            const wb = Geo(); wb.box(-30, -side / 2, -4, 30, side / 2, 66, col(wallC), 2);
            const t = sg * (m.gap / 2 + side / 2);
            gb.add(wb, M4.place(T4, fr.x + fr.nx * t, fr.y + fr.ny * t, m.z0, fr.a));
            local.box(-34, sg > 0 ? m.gap/2 : -Ch.hw-14, -3, 34, sg > 0 ? Ch.hw+14 : -m.gap/2, 5, col('#918a78'), 1);
            local.box(-33, sg > 0 ? m.gap/2+10 : -Ch.hw-16, 66, 33, sg > 0 ? Ch.hw+16 : -m.gap/2-10, 71, col('#a9a18d'), 1);
          }
          local.box(-30,-m.gap/2,62,30,m.gap/2,74,col(wallC));
          for (let k=0;k<13;k++) archBlock(local,-34,34,m.gap/2,30,32,11,k*Math.PI/13+.008,(k+1)*Math.PI/13-.008,col(k%3 ? '#c3b79d':'#e0d5bd'));
          gb.add(local,M4.place(T4,fr.x,fr.y,m.z0,fr.a));
          const tw = Geo();
          tw.lathe([[54,0],[52,8],[37,126],[40,130],[40,136]],32,col(wallC));
          gb.add(tw,M4.place(T4,fr.x+fr.tx*16,fr.y+fr.ty*16,m.z0+68,fr.a));
          const roof=Geo();
          for(let row=0;row<10;row++) {
            const z=204+row*6, r=47*(1-row/10);
            for(let k=0;k<32;k++) {
              const a=(k+row*.5)/32*TAU+.006, b=(k+1+row*.5)/32*TAU-.006, rt=Math.max(.4,r-4.7);
              roof.face([[Math.cos(a)*(r+1),Math.sin(a)*(r+1),z],[Math.cos(b)*(r+1),Math.sin(b)*(r+1),z],
                [Math.cos(b)*rt,Math.sin(b)*rt,z+6.5],[Math.cos(a)*rt,Math.sin(a)*rt,z+6.5]],col((k+row)%3?'#505c60':'#687276'),[0,0,195]);
            }
          }
          roof.cyl(0,0,262,275,1.8,10,col('#b2a083'),{top:true});
          gr.add(roof,M4.place(T4,fr.x+fr.tx*16,fr.y+fr.ty*16,m.z0,fr.a));
          const details=Geo();
          for(const z of [100,159]) for(const sg of [-1,1]) {
            const yy=sg*(z===100?47:40);
            details.box(7,yy-1.5,z,25,yy+1.5,z+25,col('#35494a'));
            details.box(5,yy-2.5,z-2,27,yy+2.5,z+1,col('#e2d8bf'));
            details.box(5,yy-2,z+24,27,yy+2,z+27,col('#e2d8bf'));
            details.box(15,yy-2,z,17,yy+2,z+25,col('#c5b698'));
            details.box(7,yy-2,z+12,25,yy+2,z+14,col('#c5b698'));
          }
          // Gallery behind the rotor, with individual joists and balusters.
          for(let k=0;k<20;k++) {
            const a=k/20*TAU, r=65, px=16+Math.cos(a)*r, py=Math.sin(a)*r;
            const plank=Geo(); plank.box(-10,-4,76,10,4,80,col(trimC));
            details.add(plank,M4.place(T4,px,py,0,a+Math.PI/2));
            if(px>-30) details.cyl(px,py,79,98,1.5,6,col(trimC),{top:true});
          }
          gd.add(details,M4.place(T4,fr.x,fr.y,m.z0,fr.a));
          const sl = Geo();
          sl.cyl(0, 0, -7, 7, 10, 20, col('#403a31'), { top: true, bottom: true });
          sl.cyl(0, 0, -8, -7, 4, 12, col('#b8a17b'), { top: true, bottom: true });
          for (let k = 0; k < 4; k++) {
            const bl = Geo();
            bl.box(8,-2.2,-2,106,2.2,2,col(trimC));
            bl.box(28,20,-1.5,106,22,1.5,col(trimC));
            for(let u=30;u<105;u+=9) {
              bl.box(u,2.2,-1.1,u+1.4,22,1.1,col(trimC));
              // Separate canvas panels leave the lattice visible at the tip.
              if(u<88) bl.face([[u+1.5,3,-.2],[u+8.7,3,-.2],[u+8.7,19.5,.7],[u+1.5,19.5,.7]],col(u%3?'#ded6bf':'#c9bea5'));
            }
            bl.box(28,10,-1.3,106,11.2,1.3,col(trimC));
            sl.add(bl, M4.place(T4, 0, 0, 0, k * Math.PI / 2));
          }
          M.mills.push({ m, body: HS.mesh(gb), roof:HS.mesh(gr), detail:HS.mesh(gd), sails: HS.mesh(sl) });
        }
        /* Tunnels: a stone-lined bore, segmented masonry portals and an
           earthen embankment that covers the vault between its mouths. The bed
           is drawn on the same material as the country, so it takes the same
           grass, the same rock where it steepens, the same snow and the same
           shore colour, and it is roughened everywhere except where it runs
           up to the stone. The ball goes in one end and comes out the other,
           out of sight for a second, the way it does on a real course. */
        const gBed = Geo(), gPipe = Geo(), gRock = Geo();
        M.bedSpots = [];
        for (const tn of F.tunnel) {
          const hwT = tn.hw, spr = TUNH - hwT, RO = hwT + TUNWALL, NR = 28;
          const uA = Math.max(0, tn.u0 - 4), uB = Math.min(tn.L, tn.u1 + 4);
          const cA = uA - 15, cB = uB + 15;                     // the pipe stands a little proud of the bank
          const nx = -tn.ty, ny = tn.tx;
          /* the pipe is course furniture, not landscape: it is built of
             whatever the rails are built of, and hooped like a barrel */
          const pipeC = col('#a6a08e'), collarC = col('#c9c0a9'), hoopC = col('#77796f');
          const axis = u => [tn.ax + tn.tx * u, tn.ay + tn.ty * u, Ch.tunZ(tn, u) + spr];
          /* a ring of the pipe at u, radius r: out along the lane's cross
             direction and straight up, so the pipe leans with the floor */
          const ring = (gg, u, r, c, flip) => {
            const a0 = axis(u);
            for (let i = 0; i <= NR; i++) {
              const a = i / NR * TAU, ca = Math.cos(a), sa = Math.sin(a), s = flip ? -1 : 1;
              gg.v(a0[0] + nx * ca * r, a0[1] + ny * ca * r, a0[2] + sa * r, nx * ca * s, ny * ca * s, sa * s, c, u * .25, a * r * .25);
            }
          };
          const band = (gg, u0, u1, r, c, flip) => {
            const base = gg.n;
            ring(gg, u0, r, c, flip); ring(gg, u1, r, c, flip);
            for (let i = 0; i < NR; i++) { const a = base + i; gg.q(a, a + 1, a + NR + 2, a + NR + 1); }
          };
          /* the flat face between two radii at one end, the way a cut pipe
             shows its wall */
          const face = (gg, u, r0, r1, c, sgn) => {
            const a0 = axis(u), base = gg.n;
            for (let i = 0; i <= NR; i++) {
              const a = i / NR * TAU, ca = Math.cos(a), sa = Math.sin(a);
              for (const r of [r0, r1])
                gg.v(a0[0] + nx * ca * r, a0[1] + ny * ca * r, a0[2] + sa * r,
                     tn.tx * sgn, tn.ty * sgn, 0, c, ca * r * .25, sa * r * .25);
            }
            for (let i = 0; i < NR; i++) { const a = base + i * 2; gg.q(a, a + 1, a + 3, a + 2); }
          };
          /* ---- the pipe ---- */
          band(gPipe, cA, cB, RO, pipeC, false);                         // the outside
          for (let j = 0; j < 9; j++) {                                  // the bore, darker the deeper in it goes
            const u0 = lerp(cA, cB, j / 9), u1 = lerp(cA, cB, (j + 1) / 9), um = (u0 + u1) / 2;
            band(gPipe, u0, u1, hwT, col(th.railDark, .12 + .6 * (1 - Math.min(sst((um - cA) / 58), sst((cB - um) / 58)))), true);
          }
          for (const [u, sgn] of [[cA, -1], [cB, 1]]) {
            face(gPipe, u, hwT, RO, collarC, sgn);                       // the cut wall of the pipe
            const uc = u + sgn * 13;                                     // and the collar, socketed on
            band(gPipe, u, uc, RO + 6, collarC, false);
            face(gPipe, uc, RO, RO + 6, collarC, sgn);
            face(gPipe, u, RO, RO + 6, collarC, -sgn);
            // Radial voussoirs and battered wing walls make a built culvert.
            const portal=Geo();
            for(let k=0;k<15;k++) archBlock(portal,-9,9,RO+6,RO+6,0,12,k*Math.PI/15+.006,(k+1)*Math.PI/15-.006,col(k%3?'#b6ae98':'#d0c6ad'));
            for(const side of [-1,1]) {
              const lo=side>0?RO+6:-RO-42, hi=side>0?RO+42:-RO-6;
              portal.box(-7,lo,-spr-7,12,hi,4,col('#a9a28f'),1.5);
              for(let row=0;row<3;row++) portal.box(-7,lo,4+row*10,12,hi,13+row*10,col(row%2?'#afa892':'#bcb49d'),1);
              portal.box(-10,lo-2,34,15,hi+2,39,col('#d0c6ad'),1);
            }
            const base=axis(uc);
            gPipe.add(portal,M4.place(T4,base[0],base[1],base[2],tn.a));
          }
          /* hoops down its length, the way a barrel or a culvert is banded —
             without them a pipe is a tube with no scale to it at all */
          for (let u = cA + 42; u < cB - 30; u += 64) {
            band(gPipe, u, u + 9, RO + 3.5, hoopC, false);
            face(gPipe, u, RO, RO + 3.5, hoopC, -1);
            face(gPipe, u + 9, RO, RO + 3.5, hoopC, 1);
          }
          /* ---- the bed heaped along its foot ---- */
          const gz0 = Ch.land(tn.ax + tn.tx * (uA + uB) / 2, tn.ay + tn.ty * (uA + uB) / 2) - Ch.tunZ(tn, (uA + uB) / 2) - 3;
          const bed = u => {
            const end = Math.min(sst((u - uA + 26) / 96), sst((uB - u + 26) / 96));
            const rgh = Math.min(sst((u - uA) / 70), sst((uB - u) / 70));
            const X0 = RO + TUNBW * (.5 + .5 * end), H0 = (TUNBED - gz0) * (.45 + .55 * end), out = [];
            for (let i = 0; i <= NR; i++) {
              const ph = Math.PI * i / NR, s = Math.sin(ph), c2 = Math.cos(ph);
              const n1 = Ch.N.fbm(u * .055 + tn.ax * .02, i * .41 + tn.ay * .02, 3) - .5;
              const n2 = Ch.N.vn(u * .02 + 5.1, i * .13 + 2.3) - .5;
              const lateral=-X0*(1+rgh*n1*.3)*c2;
              let height=gz0+H0*(1+rgh*n2*.34)*Math.pow(s,.8);
              // Keep the earth above the outer vault, never through its bore.
              if(Math.abs(lateral)<RO+3) height=Math.max(height,spr+Math.sqrt(Math.max(0,(RO+3)*(RO+3)-lateral*lateral))+2);
              out.push([lateral,height]);
            }
            return out;
          };
          {
            const bA = uA, bB = uB, NU = Math.max(10, Math.ceil((bB - bA) / 13)), P = [];
            for (let j = 0; j <= NU; j++) {
              const u = bA + (bB - bA) * j / NU, sec = bed(u), z0 = Ch.tunZ(tn, u), row = [];
              for (let i = 0; i <= NR; i++)
                row.push([tn.ax + tn.tx * u + nx * sec[i][0], tn.ay + tn.ty * u + ny * sec[i][0], z0 + sec[i][1], u]);
              P.push(row);
            }
            const base = gBed.n;
            for (let j = 0; j <= NU; j++) for (let i = 0; i <= NR; i++) {
              const p = P[j][i];
              const a = P[Math.max(0, j - 1)][i], b = P[Math.min(NU, j + 1)][i];
              const c = P[j][Math.max(0, i - 1)], d = P[j][Math.min(NR, i + 1)];
              const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
              const vx = d[0] - c[0], vy = d[1] - c[1], vz = d[2] - c[2];
              let mx = uy * vz - uz * vy, my = uz * vx - ux * vz, mz = ux * vy - uy * vx;
              const ml = Math.hypot(mx, my, mz) || 1; mx /= ml; my /= ml; mz /= ml;
              if (mz < 0) { mx = -mx; my = -my; mz = -mz; }
              gBed.v(p[0], p[1], p[2], mx, my, mz, W1, p[0], p[1]);
              if (mz > .62 && i > 2 && i < NR - 2 && j > 1 && j < NU - 1 && rnd() < .28) M.bedSpots.push([p[0], p[1], p[2]]);
            }
            for (let j = 0; j < NU; j++) for (let i = 0; i < NR; i++) {
              const a = base + j * (NR + 1) + i;
              gBed.q(a, a + 1, a + NR + 2, a + NR + 1);
            }
          }
          /* stones pitched along the foot of the bed, and a pair set against
             the collar at each mouth where the pipe is chocked in place */
          for (let i = 0; i < 12; i++) {
            const u = lerp(uA - 30, uB + 30, rnd()), sg = rnd() < .5 ? -1 : 1;
            const end = Math.min(sst((u - uA + 26) / 96), sst((uB - u + 26) / 96));
            const t = sg * (RO + TUNBW * (.5 + .5 * end)) * (.82 + rnd() * .3);
            const px = tn.ax + tn.tx * u + nx * t, py = tn.ay + tn.ty * u + ny * t;
            rockBlob(gRock, px, py, Ch.land(px, py) + 2, 6 + rnd() * 10, col(th.land[2], .8), .7);
          }
          for (const [u, sgn] of [[cA, -1], [cB, 1]]) for (const sg of [-1, 1]) {
            const a0 = axis(u + sgn * 4);
            const px = a0[0] + nx * sg * (RO + 5), py = a0[1] + ny * sg * (RO + 5);
            rockBlob(gRock, px, py, Ch.land(px, py) + 6, 11 + rnd() * 5, col(th.land[2], .88), .6);
          }
        }
        M.tunBed = HS.mesh(gBed); M.tunPipe = HS.mesh(gPipe); M.tunRock = HS.mesh(gRock);
        /* bridges: a timber deck under the carpet, beams along it, posts at
           the corners — and nothing to stop a ball going over the side */
        g = Geo();
        for (const c of F.creek) for (const br of c.br) {
          const L2 = c.w / 2 + 22, cx = c.x - c.ty * br.t, cy = c.y + c.tx * br.t, a = Math.atan2(c.ty, c.tx), bg = Geo();
          bg.box(-L2, -br.w / 2, -14, L2, br.w / 2, -1.5, col('#7a5234'), 1);
          for (const sg of [-1, 1]) {
            bg.box(-L2, sg * br.w / 2 - 2.5, -18, L2, sg * br.w / 2 + 2.5, -6, col('#5b3a22'));
            for (const u of [-L2 + 5, L2 - 5]) bg.box(u - 3, sg * (br.w / 2 + 3) - 3, -30, u + 3, sg * (br.w / 2 + 3) + 3, 10, col('#6b4428'), 1);
          }
          g.add(bg, M4.place(T4, cx, cy, Ch.zAt(c.s), a));
        }
        M.bridges = HS.mesh(g);

        /* ---- the valley: trees, bushes, grass, rock ---- */
        const gB = Geo(), gF = Geo(), gG = Geo(), gK = Geo(), gP = Geo(), gX = Geo(), gS = Geo(), gI = Geo();
        const tint = (hex, v) => { const c = L(hex), f = 1 + (rnd() - .5) * v; return [c[0] * f, c[1] * f * (1 + (rnd() - .5) * v * .4), c[2] * f, 1]; };
        /* a spot between dmin and dmax out from the rails, on dry and fairly
           level ground — or null */
        const ok = (x, y, dmin, dmax) => {
          const q = Ch.near(x, y), d = q.e;
          if (d < dmin || d > dmax) return null;
          const z = Ch.land(x, y, q);
          if (seaOn && z < th.sea + 3) return null;
          for (const c of F.creek) if (Ch.creekD(c, x, y).dl < c.w / 2 + 40) return null;
          for (const p of F.pond) if (Math.hypot(x - p.x, y - p.y) < p.r * 1.4) return null;
          for (const l of F.lake) if (Math.hypot(x - l.x, y - l.y) < l.r * 1.2) return null;
          const e = 6, sl = Math.abs(Ch.land(x + e, y) - Ch.land(x - e, y)) + Math.abs(Ch.land(x, y + e) - Ch.land(x, y - e));
          return sl > 8 ? null : { x, y, z, d };
        };
        /* anywhere round the course, all the way round its ends too — the
           view down the lane looks past the cup, so that ground matters most */
        const spot = (dmin, dmax) => {
          const x0 = b.x0 - dmax, y0 = b.y0 - dmax, w = b.x1 - b.x0 + 2 * dmax, h = b.y1 - b.y0 + 2 * dmax;
          for (let tries = 0; tries < 30; tries++) {
            const p = ok(x0 + rnd() * w, y0 + rnd() * h, dmin, dmax);
            if (p) return p;
          }
          return null;
        };
        /* trees grow in stands, not evenly sown */
        const grove = (n, dmin, dmax, kmin, kmax, rad, f) => {
          for (let i = 0; i < n; i++) {
            const c = spot(dmin, dmax);
            if (!c) continue;
            const k = kmin + ((rnd() * (kmax - kmin + 1)) | 0);
            for (let j = 0; j < k; j++) {
              const a = rnd() * TAU, r = Math.sqrt(rnd()) * rad, p = ok(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, dmin * .7, dmax + rad);
              if (p) f(p);
            }
          }
        };
        /* a lumpy mass of leaves; uv.y says how freely it moves in the wind */
        const blob = (gg, cx, cy, cz, r, c, sq, sw) => {
          const seg = 12, rings = 8, base = gg.n, p1 = rnd() * 9, p2 = rnd() * 9, p3 = rnd() * 9;
          for (let j = 0; j <= rings; j++) {
            const ph = j / rings * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
            for (let i = 0; i <= seg; i++) {
              const a = i / seg * TAU, nx = Math.cos(a) * sp, ny = Math.sin(a) * sp, nz = cp;
              const k = 1 + .22 * Math.sin(nx * 3.1 + p1) * Math.sin(ny * 2.7 + p2) * Math.sin(nz * 3.3 + p3);
              const sh = .66 + .34 * (nz * .5 + .5);
              gg.v(cx + nx * r * k, cy + ny * r * k, cz + nz * r * k * (sq || 1), nx, ny, nz, [c[0] * sh, c[1] * sh, c[2] * sh, 1], 0, sw);
            }
          }
          for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
            const a = base + j * (seg + 1) + i, a2 = a + seg + 1;
            gg.q(a, a2, a2 + 1, a + 1);
          }
        };
        const trunk = (x, y, z, h, r0, r1, c) => { const t = Geo(); t.lathe([[r0, -3], [r0 * .9, h * .35], [r1, h]], 7, c); gB.add(t, M4.place(T4, x, y, z, rnd() * TAU)); };
        const oak = (x, y, z, s, leaves) => {
          const h = (44 + rnd() * 22) * s;
          trunk(x, y, z, h, 5.5 * s, 3 * s, tint('#6b4a2b', .15));
          const leaf = leaves[(rnd() * leaves.length) | 0];
          for (let k = 0; k < 6; k++) {
            const a = rnd() * TAU, d = rnd() * 17 * s;
            limb(gB,[x,y,z+h*.6],[x+Math.cos(a)*d,y+Math.sin(a)*d,z+h+7*s],2*s,.8*s,tint('#6b4a2b',.12),6);
            blob(gF, x + Math.cos(a) * d, y + Math.sin(a) * d, z + h + (rnd() * 26 - 6) * s, (15 + rnd() * 11) * s, tint(leaf, .22), .85, .9 + rnd() * .1);
          }
        };
        const pine = (x, y, z, s, snow) => {
          const h = (70 + rnd() * 40) * s;
          trunk(x, y, z, h * .3, 4 * s, 3 * s, tint('#5a4332', .1));
          const dark = tint(snow ? '#1d4234' : '#2c6238', .15), white = tint('#f2f8fc', .04), a0 = rnd() * TAU;
          for (let i = 0; i < 7; i++) {
            const u = i / 7, rb = (28 - i * 3.5) * s, zb = z + h * (.16 + u * .67), zt = zb + h * .24, base = gF.n, n = 24;
            /* each tier a skirt of boughs, drooping at the tips, lighter on
               top — and in the snow, dark green under a white load */
            for (let k = 0; k <= n; k++) {
              const a = a0 + i*.71 + k / n * TAU, rr2 = rb * (k % 2 ? .66 : .88+.2*Math.sin(k*2.3+i)), cx = Math.cos(a), cy = Math.sin(a);
              const c = snow ? Gfx3D.mixc(dark, white, k % 2 ? .12 : .4) : dark;
              gF.v(x + cx * rr2, y + cy * rr2, zb - (k % 2 ? 0 : 4 * s), cx * .75, cy * .75, .55, [c[0] * .8, c[1] * .8, c[2] * .8, 1], 0, .3 + u * .5);
            }
            const tip = gF.v(x+Math.sin(i*2)*s*2, y+Math.cos(i)*s*2, zt, 0, 0, 1, snow ? white : [dark[0] * 1.2, dark[1] * 1.2, dark[2] * 1.2, 1], 0, .5 + u * .5);
            for (let k = 0; k < n; k++) gF.t(base + k, base + k + 1, tip);
          }
        };
        const frond = (x, y, z, a, len, wid, c) => {
          const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, n = 8, base = gF.n;
          for (let i = 0; i <= n; i++) {
            const u = i / n, w = wid * Math.sin(Math.PI * Math.min(1, u * 1.08)) + .3;
            const cx = x + dx * u * len, cy = y + dy * u * len, cz = z + Math.sin(u * 2.2) * len * .18 - u * u * len * .55;
            gF.v(cx + px * w, cy + py * w, cz - w * .25, 0, 0, 1, c, 0, .75 + u * .25);
            gF.v(cx - px * w, cy - py * w, cz - w * .25, 0, 0, 1, c, 0, .75 + u * .25);
            gF.v(cx, cy, cz + w * .15, 0, 0, 1, c, 0, .75 + u * .25);
          }
          for (let i = 0; i < n; i++) {
            const a0 = base + i * 3, b0 = a0 + 3;
            gF.q(a0, b0, b0 + 2, a0 + 2); gF.q(a0 + 2, b0 + 2, b0 + 1, a0 + 1);
          }
        };
        const palm = (x, y, z, s) => {
          const h = (80 + rnd() * 30) * s, bend = rnd() * TAU, bx = Math.cos(bend), by = Math.sin(bend);
          let px = x, py = y, pz = z;
          for (let i = 1; i <= 7; i++) {
            const u = i / 7, nx2 = x + bx * u * u * 28 * s, ny2 = y + by * u * u * 28 * s, nz2 = z + u * h;
            limb(gB, [px, py, pz - 1], [nx2, ny2, nz2], (4.4 - u * 1.3) * s, (4.1 - u * 1.3) * s, tint(i % 2 ? '#8b6b43' : '#7a5c38', .1));
            px = nx2; py = ny2; pz = nz2;
          }
          const fc = ['#3f9a4a', '#2f8a42', '#4aa452'];
          for (let k = 0; k < 9; k++) frond(px, py, pz, k / 9 * TAU + rnd() * .3, (52 + rnd() * 14) * s, 12 * s, tint(fc[k % 3], .12));
          for (let k = 0; k < 3; k++) { const a = rnd() * TAU; gP.sphere(px + Math.cos(a) * 4 * s, py + Math.sin(a) * 4 * s, pz - 5 * s, 3.2 * s, 8, 6, tint('#5b3f22', .1)); }
        };
        const cactus = (x, y, z, s) => {
          const h = (50 + rnd() * 30) * s, c = tint('#4f7d34', .12), r = 5.5 * s, t = Geo();
          t.lathe([[r, -2], [r, h - r], [r * .7, h - r * .3], [0, h]], 10, c);
          gP.add(t, M4.place(T4, x, y, z, rnd()));
          const arms = rnd() < .5 ? 1 : 2;
          for (let k = 0; k < arms; k++) {
            const a = rnd() * TAU + k * Math.PI, ah = h * (.35 + rnd() * .25), out = 13 * s, up = (18 + rnd() * 14) * s;
            const ex = x + Math.cos(a) * out, ey = y + Math.sin(a) * out;
            limb(gP, [x, y, z + ah], [ex, ey, z + ah + 3 * s], r * .62, r * .62, c);
            limb(gP, [ex, ey, z + ah], [ex, ey, z + ah + up], r * .62, r * .55, c);
            gP.sphere(ex, ey, z + ah + up, r * .55, 8, 5, c);
          }
        };
        const deadTree = (x, y, z, s) => {
          const h = (46 + rnd() * 20) * s, c = tint('#2a211d', .15);
          limb(gB, [x, y, z - 2], [x + (rnd() - .5) * 8 * s, y + (rnd() - .5) * 8 * s, z + h], 4.5 * s, 2 * s, c);
          for (let k = 0; k < 4; k++) {
            const a = rnd() * TAU, zz = z + h * (.45 + rnd() * .45), len = (18 + rnd() * 16) * s;
            limb(gB, [x, y, zz], [x + Math.cos(a) * len, y + Math.sin(a) * len, zz + len * (.4 + rnd() * .5)], 2 * s, .6 * s, c, 5);
          }
        };
        const bush = (x, y, z, s, hex) => {
          const c = tint(hex, .2);
          for (let k = 0; k < 3; k++) {
            const a = rnd() * TAU, d = rnd() * 8 * s;
            blob(gF, x + Math.cos(a) * d, y + Math.sin(a) * d, z + 5 * s, (8 + rnd() * 5) * s, c, .75, .5);
          }
        };
        const tuft = (x, y, z, s, c0, c1) => {
          for (let i = 0; i < 5; i++) {
            const a = rnd() * TAU, h = (8 + rnd() * 10) * s, lean = .2 + rnd() * .35, w = 1.3 * s;
            const bx = x + Math.cos(a) * 2.6 * s, by = y + Math.sin(a) * 2.6 * s;
            const tx = bx + Math.cos(a) * h * lean, ty = by + Math.sin(a) * h * lean, px = -Math.sin(a) * w, py = Math.cos(a) * w;
            const b0 = gG.n;
            gG.v(bx + px, by + py, z - 1, 0, 0, 1, c0, 0, 0);
            gG.v(bx - px, by - py, z - 1, 0, 0, 1, c0, 0, 0);
            gG.v(tx, ty, z + h, 0, 0, 1, c1, 0, 1);
            gG.t(b0, b0 + 1, b0 + 2);
          }
        };
        const flower = (x, y, z, s, c, stem) => {
          const h = (9 + rnd() * 6) * s, b0 = gG.n, w = .7 * s, lean = rnd() * TAU, tx = x + Math.cos(lean) * 2, ty = y + Math.sin(lean) * 2;
          gG.v(x - w, y, z - 1, 0, 0, 1, stem, 0, 0); gG.v(x + w, y, z - 1, 0, 0, 1, stem, 0, 0); gG.v(tx, ty, z + h, 0, 0, 1, stem, 0, 1);
          gG.t(b0, b0 + 1, b0 + 2);
          const hc = gG.v(tx, ty, z + h + .6, 0, 0, 1, col('#fde68a'), 0, 1);
          for (let k = 0; k <= 5; k++) { const a = k / 5 * TAU + lean; gG.v(tx + Math.cos(a) * 3 * s, ty + Math.sin(a) * 3 * s, z + h, 0, 0, 1, c, 0, 1); }
          for (let k = 0; k < 5; k++) gG.t(hc, hc + 1 + k, hc + 2 + k);
        };
        // Maintained course margins: gravel walks, timber benches, tee signs,
        // low planting beds and grass growing right up to the stone edging.
        const walk=Geo(), furniture=Geo();
        for(let s=60;s<Ch.len;s+=32) for(const sg of [-1,1]) {
          const f=Ch.frame(s), t=sg*(Ch.hw+48), p=ok(f.x+f.nx*t,f.y+f.ny*t,22,85);
          if(!p) continue;
          const slab=Geo();
          slab.box(-15,-13,-2,15,13,0,col(th.flora==='coast'?'#b5b09b':'#9b9886'),.8);
          walk.add(slab,M4.place(T4,p.x,p.y,p.z+2,f.a));
          if(s%96===60) {
            const q=ok(p.x+f.nx*sg*31,p.y+f.ny*sg*31,40,130);
            if(q) { tuft(q.x,q.y,q.z,.65,L(th.land[1]),L(th.land[0]));
              if(['meadow','forest','night'].includes(th.flora)) flower(q.x,q.y,q.z,.85,col(s%192<96?'#e9dabc':'#ad98b7'),col('#546b3b'));
            }
          }
        }
        for(let s=90;s<Ch.len;s+=950) {
          const f=Ch.frame(s), p=ok(f.x+f.nx*(Ch.hw+112),f.y+f.ny*(Ch.hw+112),70,180);
          if(!p) continue;
          const bench=Geo();
          for(const x of [-22,22]) for(const y of [-7,7]) bench.box(x-2,y-2,-2,x+2,y+2,16,col('#434740'));
          for(let k=0;k<4;k++) bench.box(-30,-11+k*6,16,30,-6+k*6,19,col('#8b7656'),.5);
          for(const x of [-24,24]) bench.box(x-1.5,11,17,x+1.5,14,36,col('#514b3d'));
          for(let k=0;k<3;k++) bench.box(-30,12,23+k*5,30,15,27+k*5,col('#8b7656'),.5);
          furniture.add(bench,M4.place(T4,p.x,p.y,p.z,f.a));
        }
        { const f=Ch.frame(55), t=-Ch.hw-82, p=ok(f.x+f.nx*t,f.y+f.ny*t,40,140);
          if(p) {const sign=Geo(); for(const y of [-17,17]) sign.box(-2,y-2,-2,2,y+2,53,col('#66583f'));
            sign.box(-4,-24,28,3,24,57,col('#d7cead'),1);
            sign.box(-4.5,-21,49,-4,21,53,col('#49634c'));
            sign.box(-4.5,-21,40,-4,12,43,col('#8c9474'));
            furniture.add(sign,M4.place(T4,p.x,p.y,p.z,f.a)); }
        }
        M.walk=HS.mesh(walk); M.furniture=HS.mesh(furniture);
        const grassC = [L(th.land[1], .72), L(th.land[0], 1.12)];
        /* the bank over a tunnel is ground like any other, so it grows the
           same rough as the country either side of it */
        for (const p of M.bedSpots) tuft(p[0], p[1], p[2] + 1, .6 + rnd() * .45, grassC[0], grassC[1]);
        const grass = (n, dmin, dmax, c0, c1) => {
          for (let i = 0; i < n; i++) {
            const p = spot(dmin, dmax);
            if (p) tuft(p.x, p.y, p.z, .8 + rnd() * .6, [c0[0], c0[1], c0[2], 1], [c1[0], c1[1], c1[2], 1]);
          }
        };
        const each = (n, dmin, dmax, f) => { for (let i = 0; i < n; i++) { const p = spot(dmin, dmax); if (p) f(p); } };
        const fl = th.flora;
        if (fl === 'meadow') {
          const leaves = ['#506d37', '#607840', '#3f603b', '#6c8149', '#74824a'];
          const tree = p => rnd() < .74 ? oak(p.x, p.y, p.z, .95 + rnd() * .75, leaves) : pine(p.x, p.y, p.z, 1 + rnd() * .6);
          grove(16, 240, 2300, 5, 11, 210, tree);                           // stands of oak and pine
          each(22, 180, 1400, tree);                                         // lone trees out in the grass
          grove(12, 1700, 3300, 10, 18, 380, p => (rnd() < .6 ? pine(p.x, p.y, p.z, 1.2 + rnd() * .8) : oak(p.x, p.y, p.z, 1.3 + rnd() * .6, leaves)));
          each(46, 40, 700, p => bush(p.x, p.y, p.z, .8 + rnd() * .6, rnd() < .5 ? '#3d8a45' : '#4f8a3a'));
          each(40, 30, 2000, p => rockBlob(gK, p.x, p.y, p.z + 2, 8 + rnd() * 18, tint('#8a867d', .15)));
          grass(2600, 16, 420, grassC[0], grassC[1]);
          const fc = ['#fde047', '#f9a8d4', '#ffffff', '#c4b5fd', '#fca5a5'], stem = col('#3f7d3a');
          each(380, 16, 320, p => flower(p.x, p.y, p.z, .8 + rnd() * .5, col(fc[(rnd() * fc.length) | 0]), stem));
        } else if (fl === 'forest') {
          grove(26,170,2400,7,13,210,p=>pine(p.x,p.y,p.z,1.5+rnd()*1.2));
          grove(12,1300,3400,10,17,320,p=>pine(p.x,p.y,p.z,2+rnd()*1.1));
          each(60,55,800,p=>bush(p.x,p.y,p.z,1+rnd()*.7,'#456749'));
          each(75,35,1600,p=>rockBlob(gK,p.x,p.y,p.z+2,12+rnd()*22,tint('#7c8071',.16)));
          grass(3000,18,420,grassC[0],grassC[1]);
          each(260,20,260,p=>flower(p.x,p.y,p.z,.7+rnd()*.5,col('#d8ceb3'),col('#4c6f42')));
        } else if (fl === 'coast') {
          grove(9,250,1700,3,5,180,p=>pine(p.x,p.y,p.z,.75+rnd()*.5));
          each(80,45,1900,p=>rockBlob(gK,p.x,p.y,p.z+2,12+rnd()*24,tint('#929186',.15)));
          each(60,40,850,p=>bush(p.x,p.y,p.z,.65+rnd()*.6,'#82885d'));
          grass(3400,18,620,L('#7d8353'),L('#c0ba85'));
        } else if (fl === 'lagoon') {
          grove(14, 90, 1300, 3, 7, 130, p => palm(p.x, p.y, p.z, .85 + rnd() * .45));
          each(18, 90, 1500, p => palm(p.x, p.y, p.z, .85 + rnd() * .4));
          each(40, 30, 1400, p => rockBlob(gK, p.x, p.y, p.z + 2, 8 + rnd() * 16, tint('#a89880', .15)));
          grass(700, 16, 300, L('#9aa35a', .8), L('#d8cf8a'));
          const sc = ['#fecdd3', '#fef3c7', '#fda4af', '#fed7aa'];
          each(90, 16, 260, p => gP.sphere(p.x, p.y, p.z, 3.2, 8, 5, col(sc[(rnd() * sc.length) | 0]), .45));
        } else if (fl === 'canyon') {
          each(55, 120, 2000, p => cactus(p.x, p.y, p.z, .9 + rnd() * .5));
          each(40, 40, 800, p => bush(p.x, p.y, p.z, .7 + rnd() * .5, '#8a9a5b'));
          each(80, 30, 2000, p => rockBlob(gK, p.x, p.y, p.z + 2, 8 + rnd() * 22, tint('#a4552f', .15)));
          grass(700, 16, 380, L('#8a7a3c', .8), L('#c9b46a'));
        } else if (fl === 'volcano') {
          each(40, 120, 1800, p => deadTree(p.x, p.y, p.z, .9 + rnd() * .5));
          each(110, 30, 2000, p => rockBlob(gK, p.x, p.y, p.z + 2, 8 + rnd() * 20, tint('#2b2320', .2)));
          each(30, 30, 900, p => {
            rockBlob(gK, p.x, p.y, p.z + 2, 7 + rnd() * 6, tint('#221a18', .1));
            gX.sphere(p.x, p.y, p.z + 8, 2.4, 8, 5, col(rnd() < .5 ? '#f97316' : '#fbbf24'));
          });
        } else if (fl === 'glacier') {
          grove(16, 180, 2400, 6, 12, 230, p => pine(p.x, p.y, p.z, .9 + rnd() * .7, true));
          grove(10, 1800, 3300, 12, 20, 400, p => pine(p.x, p.y, p.z, 1.2 + rnd() * .8, true));
          each(20, 150, 1400, p => pine(p.x, p.y, p.z, .9 + rnd() * .6, true));
          each(45, 30, 900, p => {
            for (let k = 0; k < 3; k++) {
              const hgt = 14 + rnd() * 20, tx = (rnd() - .5) * 8, ty = (rnd() - .5) * 8;
              limb(gI, [p.x + tx * .4, p.y + ty * .4, p.z - 2], [p.x + tx, p.y + ty, p.z + hgt], 3.4, .2, tint('#cfeefe', .08), 5);
            }
          });
          each(50, 30, 1800, p => rockBlob(gK, p.x, p.y, p.z + 2, 8 + rnd() * 18, tint('#6f7f8c', .15)));
        } else {
          const leaves = ['#1f4a5a', '#23405a', '#1d3f4f'];
          grove(14, 220, 2400, 5, 10, 220, p => oak(p.x, p.y, p.z, .95 + rnd() * .6, leaves));
          grove(10, 1700, 3300, 10, 16, 380, p => oak(p.x, p.y, p.z, 1.2 + rnd() * .6, leaves));
          each(16, 190, 1400, p => oak(p.x, p.y, p.z, .9 + rnd() * .5, leaves));
          each(80, 20, 520, p => {
            const s = .8 + rnd() * .7, hex = ['#a7f3d0', '#c4b5fd', '#67e8f9', '#fde68a'][(rnd() * 4) | 0], t = Geo();
            t.cyl(0, 0, -1, 7 * s, 1.4 * s, 8, col('#d9d4c8'));
            gP.add(t, M4.place(T4, p.x, p.y, p.z));
            gS.sphere(p.x, p.y, p.z + 7 * s, 5 * s, 10, 6, tint(hex, .1), .55);
            if (M.glows.length < 60) M.glows.push([p.x, p.y, p.z + 8 * s, 30 * s, Gfx3D.srgb(hex), .3]);
          });
          grass(1800, 16, 420, grassC[0], grassC[1]);
          const stem = col('#244a36');
          each(150, 16, 300, p => flower(p.x, p.y, p.z, .8 + rnd() * .4, col(rnd() < .5 ? '#c7d2fe' : '#a7f3d0'), stem));
          /* lanterns down the lane, a side at a time */
          let sg = 1;
          for (let s = 160; s < Ch.len - 40; s += 280) {
            const fr = Ch.frame(s), x = fr.x + fr.nx * sg * (Ch.hw + 36), y = fr.y + fr.ny * sg * (Ch.hw + 36), z = Ch.land(x, y);
            limb(gB, [x, y, z - 2], [x, y, z + 42], 1.6, 1.3, tint('#2a2438', .05));
            gB.box(x - 5, y - 5, z + 42, x + 5, y + 5, z + 44, col('#1f1a2a'));
            gX.sphere(x, y, z + 49, 4.2, 10, 6, col('#fde68a'));
            gB.box(x - 5, y - 5, z + 54, x + 5, y + 5, z + 56, col('#1f1a2a'));
            M.glows.push([x, y, z + 49, 64, [1, .85, .5], .6]);
            sg = -sg;
          }
          for (let i = 0; i < 40; i++) {
            const p = spot(10, 700);
            if (p) M.flies.push({ x: p.x, y: p.y, z: p.z + 12 + rnd() * 40, ph: rnd() * TAU, sp: 8 + rnd() * 16, c: ['#fde047', '#a7f3d0', '#bef264'][(rnd() * 3) | 0] });
          }
        }
        M.bark = HS.mesh(gB); M.leaf = HS.mesh(gF); M.grass = HS.mesh(gG); M.rock = HS.mesh(gK);
        M.plain = HS.mesh(gP); M.glow = HS.mesh(gX); M.glowSoft = HS.mesh(gS); M.ice = HS.mesh(gI);

        /* ---- light, sky, and the lava glow thrown on the ground ---- */
        env = {
          sun: Gfx3D.norm(th.sun), sunC: L(th.sunC[0], th.sunC[1]),
          sky: L(th.amb[0], th.amb[1]), gnd: L(th.amb[2], th.amb[3]), rim: L('#ffffff', .04),
          fogC: L(th.sky[1]), fog: [700, 15000], expo: th.expo, vig: .55, clear: [0, 0, 0],
          /* below the horizon the sky is the fog colour, so the far edge of
             the country melts into it */
          dome: { zen: L(th.sky[0]), hor: L(th.sky[1]), gnd: L(th.sky[1]), cloud: th.cloud, night: th.night },
          glow: [], glowC: L('#ff6a1a', 1.6),
          shadow: { x: 0, y: 0, z: 0, r: 1050 }
        };
        for (const p of F.pond) if (p.lava && env.glow.length < 4) env.glow.push([p.x - p.r, p.y - p.r, p.r * 2, p.r * 2]);
        for (const c of F.creek) if (c.lava && env.glow.length < 4) {
          const a = Ch.at(c.s - c.w / 2, -Ch.hw - 30), a2 = Ch.at(c.s + c.w / 2, Ch.hw + 30);
          env.glow.push([Math.min(a[0], a2[0]), Math.min(a[1], a2[1]), Math.abs(a2[0] - a[0]), Math.abs(a2[1] - a[1])]);
        }
      }

      /* ---------------- the camera ---------------- */
      /* low behind the ball with the horizon in the top of the frame, a
         little higher and further back while the ball runs */
      const REST = { pitch: .27, dist: 470, ahead: 180 }, RUN = { pitch: .42, dist: 560 };
      const cs = { x: 0, y: 0, z: 0, yaw: 0, pitch: REST.pitch, dist: REST.dist };
      const INTRO = 3.6;
      let intro = 0, introOn = false, pending = false, over = false, ovGoal = null, pinK = 0, lift = 0;
      const yawOf = (dx, dy) => Math.atan2(dx, -dy);
      function goal() {
        const Ch = C;
        /* the front page's own slow shot of the hole */
        if (menuCam) { const mg = menuCam(Ch); if (mg) return mg; }
        if (introOn) {
          /* the fly-over: from the cup back down the lane to the tee */
          const u = clamp(intro / INTRO, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          const s = lerp(Ch.len - 40, Ch.teeS + 80, e), f = Ch.frame(s), la = Ch.frame(Math.min(Ch.len, s + 220));
          return { x: f.x, y: f.y, z: f.z, yaw: yawOf(la.x - f.x, la.y - f.y), pitch: lerp(.9, REST.pitch, e), dist: lerp(1100, REST.dist, e), snap: true };
        }
        if (over) return ovGoal;
        if (aiming) return null;                                  // hold still while you line it up
        const b = ball;
        if (sunk) return { x: Ch.cup.x, y: Ch.cup.y, z: Ch.cup.z, yaw: cs.yaw, pitch: .62, dist: 330 };
        /* Down a pipe. The ball is inside a bank of ground, so the camera
           comes up over the bank and travels along it rather than burrowing
           in after the ball — you lose sight of it, and you watch the far
           mouth for it, which is the whole pleasure of a tunnel. */
        const qt = Ch.near(b.x, b.y);
        if (qt.tun && qt.u > qt.tun.u0 - 26 && qt.u < qt.tun.u1 + 26) {
          const tn = qt.tun, u = clamp(qt.u, tn.u0, tn.u1);
          const fw = b.vx * tn.tx + b.vy * tn.ty >= 0 ? 1 : -1;
          return { x: tn.ax + tn.tx * u, y: tn.ay + tn.ty * u, z: Ch.tunZ(tn, u) + TUNH + 30,
                   yaw: yawOf(tn.tx * fw, tn.ty * fw), pitch: .78, dist: 360, lazy: true };
        }
        if (moving()) {
          const v = Math.hypot(b.vx, b.vy);
          return { x: b.x + b.vx * .12, y: b.y + b.vy * .12, z: b.z, yaw: v > 150 ? yawOf(b.vx, b.vy) : cs.yaw, pitch: RUN.pitch, dist: RUN.dist, lazy: true };
        }
        /* at rest: behind the ball, looking down the lane — or at the cup
           once it is in sight */
        const q = Ch.near(b.x, b.y), la = Ch.frame(Math.min(Ch.len, q.s + 340));
        let dx = la.x - b.x, dy = la.y - b.y;
        if (Math.hypot(Ch.cup.x - b.x, Ch.cup.y - b.y) < 560 || q.s > Ch.cup.s - 220) { dx = Ch.cup.x - b.x; dy = Ch.cup.y - b.y; }
        const l = Math.hypot(dx, dy) || 1;
        return { x: b.x + dx / l * REST.ahead, y: b.y + dy / l * REST.ahead, z: b.z, yaw: yawOf(dx, dy), pitch: REST.pitch, dist: REST.dist };
      }
      function overview() {
        const Ch = C, bb = Ch.bounds, tmp = Gfx3D.camera(W, H), t0 = Ch.frame(0);
        const yaw = yawOf(Ch.cup.x - t0.x, Ch.cup.y - t0.y), pts = [];
        for (const x of [bb.x0, bb.x1]) for (const y of [bb.y0, bb.y1]) pts.push([x, y, Ch.zAt(Ch.near(x, y).s)]);
        tmp.fit(pts, [70, 80, 890, 520], 1.0, yaw, .88);
        return { x: tmp.tgt[0], y: tmp.tgt[1], z: 0, yaw, pitch: 1.0, dist: tmp.dist };
      }
      function camStep(dt) {
        const gl = goal();
        if (gl) {
          if (gl.snap && intro < .02) { cs.x = gl.x; cs.y = gl.y; cs.z = gl.z; cs.yaw = gl.yaw; cs.pitch = gl.pitch; cs.dist = gl.dist; }
          const k = 1 - Math.exp(-dt * (gl.snap ? 7 : 2.6)), ky = 1 - Math.exp(-dt * (gl.lazy ? 1.1 : gl.snap ? 7 : 2.4));
          cs.x += (gl.x - cs.x) * k; cs.y += (gl.y - cs.y) * k; cs.z += (gl.z - cs.z) * k;
          let dy = gl.yaw - cs.yaw;
          while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
          cs.yaw += dy * ky;
          cs.pitch += (gl.pitch - cs.pitch) * k; cs.dist += (gl.dist - cs.dist) * k;
        }
        cam.fov = .88;
        /* never let the eye sink into a hillside or a tree line: tip up as
           far as it takes, quickly, and settle back slowly */
        let need = 0;
        for (let i = 0; i < 12; i++) {
          cam.orbit(cs.x, cs.y, cs.z, cs.dist, Math.min(1.4, cs.pitch + need), cs.yaw);
          if (cam.eye[2] > C.H(cam.eye[0], cam.eye[1]) + 45) break;
          need += .05;
        }
        lift += (need - lift) * (1 - Math.exp(-dt * (need > lift ? 12 : 1.5)));
        cam.orbit(cs.x, cs.y, cs.z, cs.dist, Math.min(1.4, cs.pitch + lift), cs.yaw);
      }

      /* ---------------- per frame ---------------- */
      const oris = {};
      function drawBall(id, x, y, z, hex, tint) {
        let o = oris[id];
        if (!o) o = oris[id] = { q: Q.make(), x, y };
        const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy);
        if (d > 1e-3 && d < 80) Q.turn(o.q, -dy / d, dx / d, 0, d / R);
        o.x = x; o.y = y;
        const m = ballMat(hex);
        m.tint = [tint, tint, tint];
        G.draw(meshBall, M4.quat(T4, o.q, R, x, y, z), m);
        const gz = C.H(x, y), up = Math.max(0, z - R - gz), bm = blobMat(id);
        bm.color = [0, 0, 0, .5 * tint * Math.max(.15, 1 - up / 60)];
        G.fx(meshDecal, M4.place(T4, x + 1.5, y + 2, gz + .4, 0, R * (1.25 + up / 70)), bm);
      }
      function strip(dm, x0, y0, x1, y1, w, z) {
        const s = Geo();
        s.strip(x0, y0, x1, y1, w, z);
        dm.set(s);
        return dm;
      }
      function render(ctx) {
        const k = courseIdx + ':' + hole;
        if (k !== key) { key = k; build(); intro = 0; introOn = true; pending = false; over = false; }
        const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000), t = now / 1000;
        lastT = now;
        if (introOn) { intro += dt; if (intro >= INTRO) introOn = false; }
        camStep(dt);
        env.shadow.x = cs.x; env.shadow.y = cs.y; env.shadow.z = cs.z;
        G.size(W, H);
        G.begin(cam, env, t);
        const Ch = C, F = Ch.F;

        /* the country and the course */
        for (const m of M.land) G.draw(m, null, M.mLand);
        G.draw(M.lane, null, M.mLane);
        G.draw(M.rail, null, M.mRail);
        G.draw(M.tunBed, null, M.mBank);
        G.draw(M.tunPipe, null, M.mTunnel);
        G.draw(M.tunRock, null, M.mRock);
        if (M.studs) G.draw(M.studs, null, M.mGlow);
        G.draw(M.tee, null, M.mPlain);
        G.draw(M.cup, null, M.mCup);
        G.draw(M.walls, null, M.mRail);
        G.draw(M.posts, null, M.mPost);
        G.draw(M.postGlow, null, M.mGlowSoft);
        G.draw(M.bridges, null, M.mWood);
        G.draw(M.walk, null, M.mMasonry);
        G.draw(M.furniture, null, M.mWood);
        G.draw(M.bark, null, M.mBark);
        G.draw(M.leaf, null, M.mLeaf);
        G.draw(M.grass, null, M.mGrass);
        G.draw(M.rock, null, M.mRock);
        G.draw(M.plain, null, M.mPlain);
        G.draw(M.glow, null, M.mGlow);
        G.draw(M.glowSoft, null, M.mGlowSoft);
        G.draw(M.ice, null, M.mIce);
        /* moving parts */
        for (const mv of M.movers) {
          const mb = moverBox(mv.m);
          G.draw(mv.mesh, M4.place(T4, mb.x, mb.y, mv.m.z0, mb.a), M.mRail);
          G.fx(mv.track, null, fxTrack);
        }
        for (const mi of M.mills) {
          G.draw(mi.body, null, M.mMasonry);
          G.draw(mi.roof, null, M.mRoof);
          G.draw(mi.detail, null, M.mWood);
          const m = mi.m, fr = m.fr, a = millAng(m), c = Math.cos(a), s = Math.sin(a);
          const X = [c * fr.nx, c * fr.ny, s], Y = [-s * fr.nx, -s * fr.ny, c];
          G.draw(mi.sails, M4.axes(T4, X, Y, [fr.tx, fr.ty, 0], m.hub), M.mPlain);
        }
        /* the pin comes out as the ball arrives */
        const cd = Math.hypot(ball.x - Ch.cup.x, ball.y - Ch.cup.y);
        pinK += (((cd < 240 && moving()) || sunk ? 1 : 0) - pinK) * Math.min(1, dt * 3);
        const lift = sst(pinK) * 110, fade = 1 - sst((pinK - .45) * 2.2);
        if (fade > .02) {
          mPin.alpha = fade; mPin.blend = fade < 1; mFlag.alpha = fade; mFlag.blend = fade < 1;
          G.draw(meshPin, M4.place(T4, Ch.cup.x, Ch.cup.y, Ch.cup.z + lift), mPin);
          const fg = Geo(), NX = 10, NY = 4, FW = 34, FH = 19, top = Ch.cup.z + lift + 96, red = col('#ef4444');
          const rx = cam.r[0], ry = cam.r[1];
          for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
            const u = i / NX, v = j / NY, wv = t * 4.2 - u * 3.4, sw = Math.sin(wv) * 3.4 * u;
            fg.v(Ch.cup.x + rx * (1.4 + u * FW) - ry * sw, Ch.cup.y + ry * (1.4 + u * FW) + rx * sw, top - v * FH - u * 2.4,
                 -ry, rx, 0, red, u, v);
          }
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i; fg.q(a, a + 1, a + NX + 2, a + NX + 1); }
          dFlag.set(fg);
          G.draw(dFlag, null, mFlag);
        }
        /* balls: everyone else's, then yours */
        if (RACE) for (const id in RACE.peers) {
          const q = RACE.peers[id];
          if (!q || q.ph !== 'p' || q.h !== hole) continue;
          const bx = q.rx === undefined ? q.x : q.rx, by = q.ry === undefined ? q.y : q.ry;
          const bz = q.rz === undefined ? Ch.H(bx, by) + R : q.rz;
          drawBall(id, bx, by, bz, colOfId(id), q.d ? .75 : 1);
        }
        /* The ball you chose is the ball you play, in every mode. In a race
           your colour still has to mark which one is yours, so it goes into a
           ring on the turf under it rather than over the top of your ball. */
        if (RACE) {
          fxMine.color = [MYC3[0], MYC3[1], MYC3[2], .85];
          G.fx(meshDecal, M4.place(T4, ball.x, ball.y, Ch.H(ball.x, ball.y) + .5, 0, R + 7), fxMine);
        }
        drawBall('me', ball.x, ball.y, ball.z, MYBALL, 1);
        /* lava is solid enough to draw with everything else; water goes on
           last, over whatever can be seen through it */
        G.draw(M.lava, null, M.mLava);
        if (T.seaK !== 0) for (const m of M.sea) G.draw(m, null, M.mSea);
        G.draw(M.water, null, M.mWater);
        if (T.seaK === 0) for (const m of M.sea) G.draw(m, null, M.mSea);

        /* overlays laid on the course */
        G.fx(M.chev, null, fxChev);
        let ri = 0;
        for (const rp of ripples) {
          if (rp.t < 0 || ri >= fxRip.length) continue;
          const a = 1 - rp.t / 1.1, m = fxRip[ri++];
          m.color = rp.lava ? [1, .8, .3, a * .75] : [1, 1, 1, a * .6];
          G.fx(meshDecal, M4.place(T4, rp.x, rp.y, rp.z + .4, 0, 6 + rp.t * 52), m);
        }
        let bi = 0;
        for (const bf of bumpFx) {
          if (bi >= fxBump.length) break;
          const m = fxBump[bi++];
          m.color = [.99, .88, .28, (1 - bf.t / .4) * .9];
          G.fx(meshDecal, M4.place(T4, bf.x, bf.y, Ch.laneZ(bf.x, bf.y) + .8, 0, bf.r + 4 + bf.t * 60), m);
        }
        if (trail.length > 2 && moving()) {
          const s = Geo(), n = trail.length;
          for (let i = 0; i < n; i++) {
            const p0 = trail[Math.max(0, i - 1)], p1 = trail[Math.min(n - 1, i + 1)], p = trail[i];
            const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1, u = i / (n - 1), w = 5.5 * (.25 + .75 * u);
            s.v(p.x - dy / l * w, p.y + dx / l * w, p.z - R * .45, 0, 0, 1, W1, u, 1);
            s.v(p.x + dy / l * w, p.y - dx / l * w, p.z - R * .45, 0, 0, 1, W1, u, -1);
            if (i) s.q((i - 1) * 2, i * 2, i * 2 + 1, (i - 1) * 2 + 1);
          }
          dTrail.set(s);
          G.fx(dTrail, null, fxTrail);
        }
        if (aiming) {
          const dx = ball.x - aimX, dy = ball.y - aimY, d = Math.min(Math.hypot(dx, dy), PULL);
          if (d > 2) {
            const a = Math.atan2(dy, dx), ux = Math.cos(a), uy = Math.sin(a), pw = d / PULL;
            const pc = pw < .6 ? Gfx3D.mixc([.29, .87, .5], [.98, .75, .14], pw / .6) : Gfx3D.mixc([.98, .75, .14], [.94, .27, .27], (pw - .6) / .4);
            const gz = ball.z - R + .8, len = Math.max(40, d * 1.9);
            fxAim.color = [pc[0], pc[1], pc[2], .9]; fxHead.color = [pc[0], pc[1], pc[2], .95]; fxPowerRing.color = [pc[0], pc[1], pc[2], .85];
            G.fx(strip(dAim, ball.x + ux * 14, ball.y + uy * 14, ball.x + ux * len, ball.y + uy * len, 4.5, gz), null, fxAim);
            const hs = Geo(), hx = ball.x + ux * len, hy = ball.y + uy * len, px = -uy * 11, py = ux * 11;
            hs.v(hx + px, hy + py, gz, 0, 0, 1, W1, 0, 0); hs.v(hx + ux * 20, hy + uy * 20, gz, 0, 0, 1, W1, 1, 0);
            hs.v(hx - px, hy - py, gz, 0, 0, 1, W1, 0, 1);
            hs.t(0, 1, 2);
            dHead.set(hs);
            G.fx(dHead, null, fxHead);
            G.fx(meshDecal, M4.place(T4, ball.x, ball.y, gz, 0, R + 9), fxPowerRing);
          }
        }
        /* steady glows: lanterns, crystal posts, fireflies */
        AMB.list.length = 0;
        const glowAt = (x, y, z, size, c, a) => AMB.list.push({ x, y, z, size, r: c[0], g: c[1], b: c[2], a, life: 1, max: 1, rot: 0, shape: 0, add: true });
        for (const gl of M.glows) glowAt(gl[0], gl[1], gl[2], gl[3], gl[4], gl[5]);
        for (const f of M.flies) glowAt(f.x, f.y, f.z, 9, Gfx3D.srgb(f.c), .5 + .5 * Math.sin(t * 3 + f.ph * 5));
        G.parts(PS);
        G.parts(AMB);
        G.end();
        ctx.drawImage(G.canvas, 0, 0, W, H);
      }

      return {
        gl: true, input, render,
        toScreen: (x, y, z) => cam.toScreen(x, y, z || 0),
        newHole() { pending = true; },
        busy: () => introOn || pending,
        skip() { introOn = false; pending = false; },
        lost: () => G.lost,
        overview: () => over,
        toggle() { if (!C) return; over = !over; if (over) ovGoal = overview(); },
        step(dt) {
          PS.step(dt);
          if (!M) return;
          for (const f of M.flies) {
            f.ph += dt * .7;
            f.x += Math.cos(f.ph) * f.sp * dt; f.y += Math.sin(f.ph * 1.3) * f.sp * dt; f.z += Math.sin(f.ph * 2.1) * 6 * dt;
          }
          if (T.flora === 'glacier' && Math.random() < dt * 30) {
            PS.burst({ x: cs.x + rand(-900, 900), y: cs.y + rand(-900, 900), z: cs.z + 260, n: 1, up: [-40, -26], speed: 14, life: 8, size: 2.6,
                       color: '#ffffff', alpha: .85, grav: 0, drag: 0, add: false });
          }
          if (C) {
            for (const c of C.F.creek) if (c.lava && Math.random() < dt * 14) {
              const along = rand(-500, 500), x = c.x - c.ty * along + c.tx * rand(-c.w / 3, c.w / 3), y = c.y + c.tx * along + c.ty * rand(-c.w / 3, c.w / 3);
              PS.burst({ x, y, z: c.level + 2, n: 1, up: [26, 60], speed: 10, life: 1.8, size: 3.2, color: Math.random() < .5 ? '#ffd27a' : '#ff8a3a', grav: 8, drag: .4, add: true });
            }
            for (const p of C.F.pond) if (p.lava && Math.random() < dt * 6) {
              const a = rand(0, TAU), r = rand(0, p.r * .8);
              PS.burst({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: p.level + 2, n: 1, up: [26, 60], speed: 10, life: 1.8, size: 3.2, color: '#ffb347', grav: 8, drag: .4, add: true });
            }
          }
        },
        burst(x, y, o, h) {
          h = h || {};
          PS.burst({ x, y, z: h.z === undefined ? ball.z : h.z, n: o.count || 10, speed: (o.speed || 150) * (h.spd === undefined ? .8 : h.spd),
                     up: h.up === undefined ? (o.speed || 150) * .35 : h.up, life: (o.life || .5) * 1.15,
                     size: (o.size || 3) * 1.25, color: o.color || '#ffffff', alpha: h.alpha === undefined ? 1 : h.alpha,
                     grav: h.grav === undefined ? -620 : h.grav, drag: 1.2, add: h.add === undefined ? true : h.add,
                     floor: h.grav !== undefined && h.grav > 0 ? null : (h.z === undefined ? ball.z - R : h.z - 1), grow: h.grow || 0 });
        },
        /* a splash with some height to it — or, for lava, a spray of sparks */
        splash(x, y, level, lava) {
          PS.burst({ x, y, z: level + 1, n: 26, speed: 120, up: [180, 380], life: .9, size: 5.5, color: lava ? '#fbbf24' : '#e0f2fe',
                     grav: -700, drag: .8, floor: level, add: !!lava });
          PS.burst({ x, y, z: level + 1, n: 12, speed: 200, up: [60, 140], life: .7, size: 7, color: lava ? '#f97316' : '#7dd3fc',
                     grav: -500, drag: 1, floor: level, add: !!lava });
          if (lava) PS.burst({ x, y, z: level + 4, n: 10, speed: 30, up: [30, 60], life: 1.6, size: 12, color: '#3c2a24', alpha: .6, grav: 30, drag: .5, add: false, grow: 10 });
        },
        /* confetti out of the cup, more of it the better the score */
        celebrate(level) {
          const c = C.cup, n = level === 2 ? 110 : level === 1 ? 60 : 24;
          for (const hex of ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc', '#f472b6']) {
            PS.burst({ x: c.x, y: c.y, z: c.z + 4, n: Math.ceil(n / 6), speed: 120, up: [240, 460], life: 2.4, size: 6, color: hex,
                       grav: -520, drag: 1.1, shape: 1, spin: 14, floor: c.z });
          }
        },
        dispose() { if (HS) HS.dispose(); S.dispose(); PS.clear(); }
      };
    }
  }
});
