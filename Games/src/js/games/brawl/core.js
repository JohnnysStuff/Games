/* ============================================================================
   BALL BRAWL — exact maths and the roster

   What everything else in games/brawl stands on, and nothing here touches
   the page: tools/brawl/balance.mjs loads this file, sim.js and cpu.js in
   Node to play thousands of fights.

   BBM is the maths the fight is allowed to use. An online round is played
   by both screens running the same fight from the same picks and aims, so
   every number in it has to come out the same in every browser to the last
   digit. + - * / and sqrt are rounded the same way everywhere; Math.sin and
   Math.cos are not (each engine has its own, and they differ in the last
   digit, which is all a bounce needs to go another way). So sin and cos
   here are polynomials made of nothing but + and *, and the random numbers
   come from a seed.
   ========================================================================== */
const BBM = (() => {
  const PI = Math.PI, HALF = PI / 2, TWO = PI * 2;
  /* Taylor terms, good to about 1e-10 over the quarter turn they are used on */
  const S1 = -1 / 6, S2 = 1 / 120, S3 = -1 / 5040, S4 = 1 / 362880, S5 = -1 / 39916800;
  const C1 = -1 / 2, C2 = 1 / 24, C3 = -1 / 720, C4 = 1 / 40320, C5 = -1 / 3628800, C6 = 1 / 479001600;
  const ks = x => { const z = x * x; return x * (1 + z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * S5))))); };
  const kc = x => { const z = x * x; return 1 + z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))); };
  /* fold the angle onto a quarter turn either side of nought, and say which
     quarter it came from */
  function sin(a) {
    const k = Math.round(a / HALF), r = a - k * HALF, q = ((k % 4) + 4) % 4;
    return q === 0 ? ks(r) : q === 1 ? kc(r) : q === 2 ? -ks(r) : -kc(r);
  }
  function cos(a) {
    const k = Math.round(a / HALF), r = a - k * HALF, q = ((k % 4) + 4) % 4;
    return q === 0 ? kc(r) : q === 1 ? -ks(r) : q === 2 ? -kc(r) : ks(r);
  }
  /* an angle brought back into -PI..PI */
  const wrap = a => a - TWO * Math.floor((a + PI) / TWO);
  /* mulberry32: a whole fight's worth of random numbers from one seed */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* An aim travels as a whole number of half degrees, so the two screens
     cannot disagree about it: 0 is along +x, and it turns toward +y. */
  const AIMS = 720;
  const aimAngle = q => (((q % AIMS) + AIMS) % AIMS) * (TWO / AIMS);
  const aimOf = ang => ((Math.round(ang / (TWO / AIMS)) % AIMS) + AIMS) % AIMS;
  /* the other seat's aim seen in a mirror (the arena is shown to each
     player with their own ball on the left) */
  const mirrorAim = q => (((AIMS / 2 - q) % AIMS) + AIMS) % AIMS;
  return { PI, HALF, TWO, sin, cos, wrap, rng, AIMS, aimAngle, aimOf, mirrorAim };
})();

/* ============================================================================
   The balls. Everything a fight needs to know about each is here, so
   the balance can be tuned in one place (tools/brawl/balance.mjs plays every
   pair and says how it went). Speeds are a multiple of the base speed,
   angles are radians, spins radians a second, times seconds, lengths the
   arena's units (it is 600 across, a ball 30 in radius).

     cls   what the card calls it
     col   the ball's own colour; acc the colour of its weapon or trim
     line  what it does, in a few words; grow how it gets stronger
   ========================================================================== */
const BB_CLASSES = {
  melee:  { name: 'Melee',  col: '#ff6b5e' },
  ranged: { name: 'Ranged', col: '#5ee0ff' },
  tank:   { name: 'Tank',   col: '#ffc445' },
  tricky: { name: 'Tricky', col: '#c38bff' }
};
const BB_BALLS = [
  { id: 'sword', name: 'Sword', cls: 'melee', col: '#3d7bff', acc: '#e9eef7',
    line: 'A blade circles it', grow: 'The blade grows longer with every hit',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'blade', n: 1, len: 40, th: 8, spin: 4.8, dmg: 13, grow: 7, max: 92 } },
  { id: 'daggers', name: 'Daggers', cls: 'melee', col: '#8e5cff', acc: '#f1e9ff',
    line: 'Two knives spin round it', grow: 'The knives spin faster with every hit',
    hp: 100, spd: 1.04, r: 30,
    w: { kind: 'blade', n: 2, len: 28, th: 6, spin: 7.5, dmg: 5.5, grow: 1.2, max: 26 } },
  { id: 'axe', name: 'Axe', cls: 'melee', col: '#ff4a3d', acc: '#d9dde6',
    line: 'A heavy axe, slow and brutal', grow: 'Spins faster the more it is hurt',
    hp: 104, spd: .95, r: 30,
    w: { kind: 'blade', n: 1, len: 38, th: 14, spin: 2.5, dmg: 14.5, rage: 2, knock: 1.7 } },
  { id: 'bow', name: 'Bow', cls: 'ranged', col: '#2fc46a', acc: '#c98b4f',
    line: 'Shoots volleys of arrows', grow: 'One more arrow a volley for every two that hit',
    hp: 96, spd: 1, r: 30,
    w: { kind: 'bow', every: 1.5, first: .7, dmg: 5.5, speed: 600, spread: .16, per: 3, max: 5 } },
  { id: 'shield', name: 'Shield', cls: 'tank', col: '#ffb62e', acc: '#f7f1dc',
    line: 'Blocks blows and bounces arrows back', grow: 'Wider with every block',
    hp: 106, spd: .96, r: 30,
    w: { kind: 'arc', hw: .9, th: 10, gap: 10, spin: 2.1, dmg: 7, knock: 1.9, grow: .06, max: 1.5 } },
  { id: 'spear', name: 'Spear', cls: 'melee', col: '#ff8a1f', acc: '#f2e6d0',
    line: 'A lance pointing where it goes', grow: 'Double damage head-on; longer with every hit',
    hp: 100, spd: 1.03, r: 30,
    w: { kind: 'lance', len: 56, th: 7, dmg: 6.5, head: 2, grow: 4, max: 90 } },
  { id: 'bomber', name: 'Bomber', cls: 'ranged', col: '#3a3f4c', acc: '#ff5436',
    line: 'Drops bombs that blow on a timer, or when touched', grow: 'Every blast that lands makes the next one bigger',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'bomb', every: 1.4, first: .6, fuse: 1.4, arm: .25, rad: 56, dmg: 14.5, knock: 2, grow: 7, max: 100 } },
  { id: 'snake', name: 'Snake', cls: 'tricky', col: '#8bd83a', acc: '#ffe066',
    line: 'Its tail hurts whatever touches it', grow: 'The tail keeps growing',
    hp: 100, spd: 1.02, r: 30,
    w: { kind: 'tail', n: 8, every: .7, max: 30, dmg: 7.3, cd: .3, knock: 1.1 } },
  { id: 'vampire', name: 'Vampire', cls: 'melee', col: '#c0184f', acc: '#e7e2ee',
    line: 'Its scythe heals it as it cuts', grow: 'Heals more the lower it gets',
    hp: 96, spd: 1, r: 30,
    w: { kind: 'blade', n: 1, len: 42, th: 8, spin: 4, dmg: 9, drain: .45, thirst: .6, curve: 1 } },
  { id: 'frost', name: 'Frost', cls: 'tricky', col: '#48d6ff', acc: '#e8fbff',
    line: 'Ice shards slow whatever they hit', grow: 'The slow stacks up, and so does the chill',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'orb', n: 3, dist: 27, or: 9, spin: 2.6, dmg: 5, slow: .05, stacks: 4, thaw: 2 } },
  { id: 'ghost', name: 'Ghost', cls: 'tricky', col: '#cfc6ff', acc: '#8f7dff',
    line: 'Fades out, then comes back hitting hard', grow: 'Stays faded longer with every big hit',
    hp: 96, spd: 1.12, r: 30,
    w: { kind: 'ghost', solid: 2.2, fade: .9, grow: .12, max: 1.8, charge: 1.8, dmg: 23, knock: 2.1 } },
  { id: 'giant', name: 'Giant', cls: 'tank', col: '#b8793e', acc: '#ffd88a',
    line: 'No weapon. Slams into things', grow: 'Gets bigger with every hit',
    hp: 110, spd: .9, r: 36,
    w: { kind: 'body', dmg: 10, grow: 2.5, max: 60, more: .3 } },
  /* ---- the second twelve. A ball's place in this list is how it travels
     online (net.js sends picks as the index), so new ones go on the end. ---- */
  { id: 'hammer', name: 'Hammer', cls: 'melee', col: '#11a39b', acc: '#f3c55b',
    line: 'A war hammer that sends things flying', grow: 'Every hit makes the next one hit harder',
    hp: 104, spd: .96, r: 30,
    w: { kind: 'blade', n: 1, len: 32, th: 16, spin: 2.5, dmg: 13, knock: 2.6, heavy: 1.6, heavyMax: 22 } },
  { id: 'flail', name: 'Flail', cls: 'melee', col: '#8c2336', acc: '#d5dae3',
    line: 'A spiked ball on a chain, swung by every bounce', grow: 'The chain gets longer with every hit',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'flail', len: 40, hr: 10, drive: 6.5, dmg: 5.6, knock: 1.8, grow: 4, max: 70 } },
  { id: 'boomerang', name: 'Boomerang', cls: 'ranged', col: '#ff8a65', acc: '#b0652e',
    line: 'Throws a boomerang that curves out and comes back', grow: 'Bigger and harder with every hit',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'rang', first: .5, every: .4, speed: 520, curve: 2.2, out: .7, back: 5, dmg: 5.5, rad: 10, grow: .5, max: 9.5 } },
  { id: 'laser', name: 'Laser', cls: 'ranged', col: '#e026ff', acc: '#7ff6ff',
    line: 'Charges up and fires a beam across the box', grow: 'Charges faster with every hit',
    hp: 96, spd: 1, r: 30,
    w: { kind: 'laser', first: 1, charge: 1.1, cool: .6, turn: 2.6, lock: .2, dmg: 15, wid: 7, knock: 1.5, less: .07, min: .55 } },
  { id: 'ninja', name: 'Ninja', cls: 'ranged', col: '#25252e', acc: '#ff3344',
    line: 'Throws stars that bounce off the walls', grow: 'The stars bounce once more for every three that hit',
    hp: 96, spd: 1.06, r: 30,
    w: { kind: 'star', first: .5, every: 1.3, n: 2, spread: .28, speed: 560, dmg: 3.6, bounce: 1, per: 3, max: 4 } },
  { id: 'wizard', name: 'Wizard', cls: 'ranged', col: '#4a3ccf', acc: '#ffd24a',
    line: 'Casts spells that chase the other ball', grow: 'Every spell that lands makes the next bigger',
    hp: 96, spd: .98, r: 30,
    w: { kind: 'spell', first: .8, every: 1.85, speed: 280, turn: 2.1, life: 2.8, dmg: 6, rad: 8, grow: .6, max: 11.2 } },
  { id: 'blaze', name: 'Blaze', cls: 'tricky', col: '#ff6a13', acc: '#ffd23a',
    line: 'Leaves a trail of fire that burns', grow: 'The flames last longer with every burn',
    hp: 100, spd: 1.06, r: 30,
    w: { kind: 'fire', every: .1, life: 1.4, grow: .08, max: 2.8, dmg: 2.6, cd: .3, fr: 12 } },
  { id: 'tesla', name: 'Tesla', cls: 'tricky', col: '#35e0b0', acc: '#d9823b',
    line: 'Shocks anything that comes close', grow: 'Reaches further with every shock',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'zap', every: .55, range: 45, grow: 1.5, max: 75, dmg: 4.3, knock: .6 } },
  { id: 'cactus', name: 'Cactus', cls: 'tank', col: '#4f9d3a', acc: '#ff6fb1',
    line: 'Prickly to touch, and sprays needles all round', grow: 'Every blow it takes adds a needle to the next spray',
    hp: 110, spd: .92, r: 30,
    w: { kind: 'spines', first: 1.2, every: 2, n: 7, grow: 1, max: 14, speed: 430, dmg: 3.8, thorn: 8 } },
  { id: 'comet', name: 'Comet', cls: 'tank', col: '#5d6f96', acc: '#ffb347',
    line: 'Hits as hard as it is going', grow: 'Faster with every wall it bounces off',
    hp: 106, spd: .95, r: 30,
    w: { kind: 'comet', dmg: 5.5, grow: .08, max: 1.8 } },
  { id: 'saw', name: 'Buzzsaw', cls: 'melee', col: '#f5cf1f', acc: '#1d1f24',
    line: 'A spinning saw that cuts through whatever it touches', grow: 'The saw gets bigger with every cut',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'saw', gap: 5, sr: 16, spin: 4, dmg: 9.5, cd: .15, knock: .6, grow: 1.4, max: 28 } },
  { id: 'katana', name: 'Katana', cls: 'melee', col: '#f4f1ea', acc: '#d8263b',
    line: 'Dashes at the other ball, and a cut on the dash goes deep', grow: 'Dashes again sooner with every hit',
    hp: 100, spd: 1, r: 30,
    w: { kind: 'blade', n: 1, len: 40, th: 6, spin: 6, dmg: 12.5, dash: { every: 2, speed: 2, time: .28, less: .12, min: .9, cut: 1.6 } } }
];
const BB_BY = {};
BB_BALLS.forEach((b, i) => { b.idx = i; BB_BY[b.id] = b; });
