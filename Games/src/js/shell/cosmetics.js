/* ============================================================================
   COSMETICS — what you own, what you have on, and the crates it comes out of

   Four lines, and a crate for each: a ball, the thing you hit it with, the
   trail it leaves, and the nameplate other people see. Three of them belong
   to a game; the nameplate belongs to the account, so it follows you into
   both. Nothing here touches how anything plays — a cue is a colour and a
   material, never a better cue.

   Crates draw WITHOUT replacement: you cannot be handed something you already
   own until the line is exhausted, and after that a duplicate pays shards
   instead. Shards buy the exact thing you want outright, so there is always
   a deterministic way to get the item you are actually chasing, and nobody
   has to gamble for it. The odds and the whole contents are printed on the
   crate before a coin is spent.
   ========================================================================== */
const Cos = (() => {
  const RAR = {
    c: { n: 'Common',  col: '#9a9184', w: 56, shard: 12 },
    r: { n: 'Rare',    col: '#5fa3b5', w: 28, shard: 30 },
    e: { n: 'Epic',    col: '#a07bd4', w: 13, shard: 75 },
    l: { n: 'Legend',  col: '#c9a24a', w:  3, shard: 180 }
  };
  /* ---- colour, in one place ----
     The icon in the menu and the thing on the table have to be the same
     object, and the only way to be sure of that is for both to read the same
     numbers. Everything below is what the game paints, not an impression of
     it: a set is a rule, and the swatch is that rule applied to three balls. */
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => {
    const A = hx(a), B = hx(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const lit = c => mix(c, '#ffffff', .2), shade = c => mix(c, '#100c08', .5);

  /* the house numbers, which every set is a rule over */
  const HOUSE = { 1: '#f2c200', 2: '#0b4ea2', 3: '#d62828', 4: '#6a2c9e',
                  5: '#f77f00', 6: '#1b7f3b', 7: '#7a1f1f', 8: '#111111' };
  /* A set recolours the numbers, keeps the stripes where the rules of the
     game expect them, and says what its cue ball is: a body that is still
     plainly ivory and six spots in the set's own colour. */
  const SETS = {
    'p.ball.house':  { col: (n, c) => c,                                    cue: '#f8fafc', pip: null },
    'p.ball.matte':  { col: (n, c) => mix(c, '#cfc7b4', .42),               cue: '#e6d9bd', pip: '#6b6150' },
    'p.ball.marble': { col: (n, c) => mix(c, '#efe9dc', .58),               cue: '#f4ecd9', pip: '#74603c' },
    'p.ball.ink':    { col: n => n === 8 ? '#0c0c0c' : n < 8 ? '#26262a' : '#e7dfc9',
                                                                            cue: '#e6dcc2', pip: '#101015' },
    'p.ball.sherb':  { col: (n, c) => mix(c, n % 2 ? '#ffd9a8' : '#ffb3c7', .58),
                                                                            cue: '#fff2e6', pip: '#e07aa0' },
    'p.ball.cobalt': { col: (n, c) => mix(c, '#4a6fd0', .52),               cue: '#e8eeff', pip: '#16307f' },
    'p.ball.neon':   { col: (n, c) => mix(c, n % 2 ? '#5cf2c6' : '#f25ca8', .5),
                                                                            cue: '#ddfff1', pip: '#00d99e' },
    'p.ball.planet': { col: (n, c) => mix(c, n % 2 ? '#e8a25a' : '#5f6fd0', .46),
                                                                            cue: '#fdeccf', pip: '#2f43c8' }
  };
  /* what 8-ball asks for, and what the swatch asks for, from the same entry */
  function ballSet(id) {
    const S = SETS[id] || SETS['p.ball.house'];
    return { cue: S.cue, pip: S.pip, col: n => S.col(n, HOUSE[n > 8 ? n - 8 : n]) };
  }

  const SLOTS = [
    { id: 'ball',  name: 'Ball',      crate: 'Ball Crate',      cost: 240 },
    /* a cue belongs to the table; a putt here is a drag and a release with
       nothing held, so mini golf has no club line and is not offered one */
    { id: 'cue',   name: 'Cue',       crate: 'Cue Crate',       cost: 240, only: 'pool' },
    { id: 'trail', name: 'Trail',     crate: 'Trail Crate',     cost: 200 },
    { id: 'plate', name: 'Nameplate', crate: 'Nameplate Crate', cost: 260, account: true }
  ];
  /* id · slot · game · name · rarity · two colours · what it is
     `b` is never decoration: it is the second colour the game actually paints
     — the shaded side of a golf ball, the butt of a cue, the tail of a trail,
     the face of a nameplate. A pool set has no pair, so it carries its own. */
  const I = (id, slot, game, name, r, a, b, s) => ({ id, slot, game, name, r, a, b, s });
  const ITEMS = [
    /* ---- mini golf: a dimpled ball, one colour, and a ribbon behind it ---- */
    I('g.ball.range',  'ball',  'golf', 'Range White',  'c', '#f2f2ec', shade('#f2f2ec'), 'golf'),
    I('g.ball.lemon',  'ball',  'golf', 'Lemon',        'c', '#e8d24a', shade('#e8d24a'), 'golf'),
    I('g.ball.coral',  'ball',  'golf', 'Coral',        'c', '#e8705a', shade('#e8705a'), 'golf'),
    I('g.ball.slate',  'ball',  'golf', 'Slate',        'r', '#7c8894', shade('#7c8894'), 'golf'),
    I('g.ball.glass',  'ball',  'golf', 'Sea Glass',    'r', '#8fd8cf', shade('#8fd8cf'), 'golf'),
    I('g.ball.rust',   'ball',  'golf', 'Rust',         'r', '#c2683a', shade('#c2683a'), 'golf'),
    I('g.ball.brass',  'ball',  'golf', 'Brass',        'e', '#e0bd6a', shade('#e0bd6a'), 'golf'),
    I('g.ball.moon',   'ball',  'golf', 'Moonstone',    'e', '#dfe7f2', shade('#dfe7f2'), 'golf'),
    I('g.ball.ember',  'ball',  'golf', 'Ember',        'l', '#ff8b4a', shade('#ff8b4a'), 'golf'),
    I('g.tr.none',     'trail', 'golf', 'None',         'c', '#5b5b55', '#3a3a35', 'none'),
    I('g.tr.chalk',    'trail', 'golf', 'Chalk',        'c', '#e2d9c2', '#8a8069', 'trail'),
    I('g.tr.fescue',   'trail', 'golf', 'Fairway',      'r', '#8fd08a', '#2f6a2c', 'trail'),
    I('g.tr.cirrus',   'trail', 'golf', 'Cirrus',       'r', '#bcd6ea', '#4a6f8c', 'trail'),
    I('g.tr.comet',    'trail', 'golf', 'Comet',        'e', '#9fd8ff', '#2d6c9e', 'trail'),
    I('g.tr.fly',      'trail', 'golf', 'Firefly',      'e', '#ffd977', '#9a7a1c', 'trail'),
    I('g.tr.aurora',   'trail', 'golf', 'Aurora',       'l', '#8ff0c0', '#5f6fd0', 'trail'),
    /* ---- 8-ball: a set is a rule, a cue is its parts ---- */
    I('p.ball.house',  'ball',  'pool', 'House Set',    'c', '#f2c200', '#0b4ea2', 'set'),
    I('p.ball.matte',  'ball',  'pool', 'Matte',        'c', '#cfc7b4', '#5b5b55', 'set'),
    I('p.ball.marble', 'ball',  'pool', 'Marble',       'r', '#efe9dc', '#9a8f7a', 'set'),
    I('p.ball.ink',    'ball',  'pool', 'Ink & Bone',   'r', '#26262a', '#e7dfc9', 'set'),
    I('p.ball.sherb',  'ball',  'pool', 'Sherbet',      'r', '#ffd9a8', '#ffb3c7', 'set'),
    I('p.ball.cobalt', 'ball',  'pool', 'Cobalt',       'e', '#4a6fd0', '#16307f', 'set'),
    I('p.ball.neon',   'ball',  'pool', 'Neon',         'e', '#5cf2c6', '#f25ca8', 'set'),
    I('p.ball.planet', 'ball',  'pool', 'Planets',      'l', '#e8a25a', '#5f6fd0', 'set'),
    I('p.cue.house',   'cue',   'pool', 'House Cue',    'c', '#c9a76a', '#7a5c2e', 'cue'),
    I('p.cue.rose',    'cue',   'pool', 'Rosewood',     'c', '#9a4f3a', '#4d251b', 'cue'),
    I('p.cue.ivory',   'cue',   'pool', 'Ivory Wrap',   'r', '#efe7d2', '#a0937a', 'cue'),
    I('p.cue.sapph',   'cue',   'pool', 'Sapphire',     'r', '#4a7fd0', '#22407a', 'cue'),
    I('p.cue.brass',   'cue',   'pool', 'Brass Ferrule','e', '#e0bd6a', '#6b4a12', 'cue'),
    I('p.cue.blood',   'cue',   'pool', 'Bloodwood',    'e', '#a8322c', '#4a1210', 'cue'),
    I('p.cue.thorn',   'cue',   'pool', 'Blackthorn',   'l', '#2b2620', '#c9a24a', 'cue'),
    I('p.tr.none',     'trail', 'pool', 'None',         'c', '#5b5b55', '#3a3a35', 'none'),
    I('p.tr.chalk',    'trail', 'pool', 'Chalk Dust',   'c', '#bcd2e8', '#6b7c8c', 'trail'),
    I('p.tr.cut',      'trail', 'pool', 'Cut Line',     'r', '#f2ece2', '#8a8177', 'trail'),
    I('p.tr.side',     'trail', 'pool', 'Sidespin',     'r', '#8fd0c0', '#356b5e', 'trail'),
    I('p.tr.comet',    'trail', 'pool', 'Comet',        'e', '#9fd8ff', '#2d6c9e', 'trail'),
    I('p.tr.ember',    'trail', 'pool', 'Ember',        'l', '#ff8b4a', '#c43a12', 'trail'),
    /* ---- the account's own: a border and a face, which is all a plate is -- */
    I('n.plain',       'plate', null,   'Plain',        'c', '#8a8177', '#2a2822', 'plate'),
    I('n.ruled',       'plate', null,   'Ruled',        'c', '#c9c2b4', '#3a352c', 'plate'),
    I('n.brass',       'plate', null,   'Brass Rule',   'r', '#c9a24a', '#2a2318', 'plate'),
    I('n.felt',        'plate', null,   'Felt',         'r', '#5fa07a', '#153026', 'plate'),
    I('n.slate',       'plate', null,   'Slate',        'e', '#8fa3b5', '#1b2630', 'plate'),
    I('n.carbon',      'plate', null,   'Carbon',       'e', '#5a6270', '#14171c', 'plate'),
    I('n.gilt',        'plate', null,   'Gilt',         'l', '#f0d79a', '#3a2c10', 'plate')
  ];
  const byId = {};
  ITEMS.forEach(i => { byId[i.id] = i; });

  /* the first of each line is what you start in, so nothing is ever empty */
  const DEFAULTS = {};
  ITEMS.forEach(i => { const k = (i.game || 'any') + '.' + i.slot; if (!(k in DEFAULTS)) DEFAULTS[k] = i.id; });

  let S = null;
  function load() {
    let raw = null;
    try { raw = Store.getPref('cos'); } catch (e) {}
    S = Object.assign({ own: {}, eq: {}, shards: 0 }, raw && typeof raw === 'object' ? raw : {});
    S.own = S.own || {}; S.eq = S.eq || {};
    for (const k in DEFAULTS) { S.own[DEFAULTS[k]] = 1; if (!S.eq[k]) S.eq[k] = DEFAULTS[k]; }
  }
  const save = () => { try { Store.setPref('cos', S); } catch (e) {} };
  load();

  const key = (game, slot) => (SLOTS.find(s => s.id === slot) || {}).account ? 'any.plate' : game + '.' + slot;
  const line = (game, slot) => ITEMS.filter(i => i.slot === slot && (i.game === null ? true : i.game === game));
  const owns = id => !!S.own[id];
  const equipped = (game, slot) => byId[S.eq[key(game, slot)]] || byId[DEFAULTS[key(game, slot)]];

  function equip(game, slot, id) {
    if (!owns(id)) return false;
    S.eq[key(game, slot)] = id; save();
    return true;
  }
  /* the shard price of an item you have not got: the deterministic road */
  const price = it => Math.round(RAR[it.r].shard * 5.5);

  function buyWithShards(it) {
    const p = price(it);
    if (owns(it.id) || S.shards < p) return false;
    S.shards -= p; S.own[it.id] = 1; save();
    return true;
  }
  /* the cheat panel's purse, and nothing else, pays shards in from outside */
  function grantShards(n) { S.shards += Math.max(0, n | 0); save(); }
  /* Draw without replacement: while anything in the line is still unowned,
     one of those is what comes out. Weighted by rarity among what is left,
     so a legend is still a legend — it just cannot be a duplicate. */
  function openCrate(game, slot) {
    const pool = line(game, slot);
    const left = pool.filter(i => !owns(i.id));
    if (!left.length) {
      const it = pool[(Math.random() * pool.length) | 0];
      const g = RAR[it.r].shard;
      S.shards += g; save();
      return { item: it, dupe: true, shards: g };
    }
    let total = 0;
    for (const i of left) total += RAR[i.r].w;
    let roll = Math.random() * total, got = left[left.length - 1];
    for (const i of left) { roll -= RAR[i.r].w; if (roll <= 0) { got = i; break; } }
    S.own[got.id] = 1; save();
    return { item: got, dupe: false, shards: 0 };
  }
  /* which lines a given game actually has — a slot can be pinned to one */
  const slotsFor = game => SLOTS.filter(s => !s.only || s.only === game);
  const slotName = (slot, game) => {
    const s = SLOTS.find(x => x.id === slot);
    return game === 'golf' && s.golfName ? s.golfName : s.name;
  };
  const crateName = (slot, game) => {
    const s = SLOTS.find(x => x.id === slot);
    return game === 'golf' && s.golfCrate ? s.golfCrate : s.crate;
  };
  return {
    RAR, SLOTS, slotsFor, line, owns, equipped, equip, openCrate, buyWithShards, grantShards, price,
    slotName, crateName, byId, ballSet, lit, shade,
    get shards() { return S.shards; },
    /* what a game should actually render, resolved to colours */
    look(game, slot) { const it = equipped(game, slot); return it || null; }
  };
})();


