/* ============================================================================
   META — everything that persists between rounds and gives them a point.

   Progression, achievements, daily challenge, quests, the coin shop, the
   profile sheet, the command palette and the boss key all live here. They
   share one blob in Store so there is a single thing to read, migrate and
   reason about, and one paint path so a level-up updates the header, the
   profile and the hub without three call sites drifting apart.

   The shell calls exactly three things: roundStart, roundEnd and paintRails.
   Everything else is this module talking to itself.
   ========================================================================== */
const Meta = (() => {

  /* ------------------------------------------------------------ the blob */
  const DEF = {
    xp: 0, coins: 0, seconds: 0,
    ach: {},                 // id -> unlock timestamp
    ctr: {},                 // counter name -> number
    hist: {},                // gameId -> last dozen scores
    quests: null,            // { day, list:[{id,type,goal,n,arg,done,claimed}] }
    daily: null,             // { day, gameId, done }
    streak: { n: 0, best: 0, last: '' },
    owned: { accent: ['blue'], cards: ['standard'] },
    accent: 'blue', cards: 'standard'
  };

  let M = null;
  function load() {
    let raw = null;
    try { raw = Store.getPref('meta'); } catch (e) {}
    M = Object.assign({}, DEF, raw && typeof raw === 'object' ? raw : {});
    /* a blob written by an older build is missing whole sub-objects, and a
       half-present object is worse than an absent one */
    M.ach = M.ach || {}; M.ctr = M.ctr || {}; M.hist = M.hist || {};
    M.streak = Object.assign({ n: 0, best: 0, last: '' }, M.streak || {});
    M.owned = Object.assign({ accent: ['blue'], cards: ['standard'] }, M.owned || {});
    if (!Array.isArray(M.owned.accent)) M.owned.accent = ['blue'];
    if (!Array.isArray(M.owned.cards)) M.owned.cards = ['standard'];
  }
  function save() { try { Store.setPref('meta', M); } catch (e) {} }

  const today = () => new Date().toISOString().slice(0, 10);
  const ctr = k => M.ctr[k] || 0;
  function bump(k, n) { M.ctr[k] = (M.ctr[k] || 0) + (n == null ? 1 : n); return M.ctr[k]; }

  /* -------------------------------------------------------------- levels */
  /* A flat-ish curve on purpose: the point is a steady drip of small
     unlocks, not a grind that stalls at level nine. */
  const need = l => 100 + (l - 1) * 70;
  function levelOf(xp) {
    let l = 1, rest = Math.max(0, xp);
    while (rest >= need(l) && l < 999) { rest -= need(l); l++; }
    return { lvl: l, into: rest, need: need(l) };
  }
  const level = () => levelOf(M.xp);

  /* ------------------------------------------------------------- toasts */
  const Toast = (() => {
    const box = () => el('toasts');
    /* `act` is optional: { label, run, ms }. A toast that asks something
       (a friend's invite) answers it from the toast, so there is nothing to
       go and find; it stays up long enough to be answered, shows how long
       is left, and holds still while the pointer is on it. */
    function show(title, sub, kind, icon, act) {
      const b = box(); if (!b) return;
      const withAct = !!(act && act.label && act.run);
      const life = withAct ? (act.ms || 12000) : 4600;
      const n = document.createElement('div');
      n.className = 'toast' + (kind ? ' ' + kind : '') + (withAct ? ' has-act' : '');
      n.innerHTML = '<span class="tst-ico"></span><span class="tst-b"><b></b><span></span></span>';
      n.querySelector(".tst-ico").innerHTML = ico(icon || "star");
      n.querySelector('b').textContent = title;
      n.querySelector('.tst-b span').textContent = sub || '';
      if (withAct) {
        n.style.setProperty('--life', life + 'ms');
        const btn = document.createElement('button');
        btn.className = 'tst-act';
        btn.textContent = act.label;
        btn.onclick = e => { e.stopPropagation(); clearTimeout(t); die(); try { act.run(); } catch (err) {} };
        n.append(btn);
      }
      b.append(n);
      /* the stack is bottom-anchored, so old ones leave rather than pile up */
      while (b.children.length > 4) b.firstChild.remove();
      const die = () => { n.classList.add('out'); setTimeout(() => n.remove(), 240); };
      let left = life, t0 = performance.now(), t = setTimeout(die, left);
      if (withAct) {
        n.onmouseenter = () => { clearTimeout(t); left -= performance.now() - t0; };
        n.onmouseleave = () => { t0 = performance.now(); t = setTimeout(die, Math.max(900, left)); };
      }
      n.onclick = () => { clearTimeout(t); die(); };
    }
    return { show };
  })();

  /* ------------------------------------------------------------- icons */
  /* Emoji looked like smudges next to everything else in this app, and a
     greyed-out emoji looks like a rendering bug rather than a locked reward.
     These are the same stroked 24px shapes the header uses, so a locked one
     is just the muted colour and an earned one is the accent. */
  const IK = (d, extra) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + d + (extra || '') + '</svg>';

  const ICO = {
    pad:      IK('<rect x="2.5" y="7" width="19" height="10.5" rx="4"/><path d="M7 10.6v3.2M5.4 12.2h3.2"/><circle cx="16" cy="11.4" r="1" fill="currentColor"/><circle cx="18.2" cy="13.6" r="1" fill="currentColor"/>'),
    joystick: IK('<path d="M12 3.5v7"/><circle cx="12" cy="12.6" r="2.1"/><path d="M6 20.5h12l-1.6-5.4H7.6z"/>'),
    flame:    IK('<path d="M12 3s4.5 3.9 4.5 8.2a4.5 4.5 0 01-9 0C7.5 8.6 9 7 9 7s.6 2 1.6 2.6C11.4 8 12 5.5 12 3z"/><path d="M12 20.8a4.6 4.6 0 004.6-4.6"/>'),
    gem:      IK('<path d="M6 4h12l3.2 5-9.2 11L2.8 9z"/><path d="M2.8 9h18.4M9 4l-2.2 5L12 20M15 4l2.2 5L12 20"/>'),
    compass:  IK('<circle cx="12" cy="12" r="8.6"/><path d="M15.2 8.8l-1.8 4.7-4.6 1.7 1.8-4.7z"/>'),
    map:      IK('<path d="M9 4.6L3.4 6.9v12.5L9 17.1l6 2.3 5.6-2.3V4.6L15 6.9z"/><path d="M9 4.6v12.5M15 6.9v12.5"/>'),
    trend:    IK('<path d="M3.4 16.8l5.2-5.4 3.6 3.4 6-6.6"/><path d="M14.6 8.2h3.9v3.9"/>'),
    trophy:   IK('<path d="M7.2 4.2h9.6v5a4.8 4.8 0 01-9.6 0z"/><path d="M16.8 5.6h2.4a2.6 2.6 0 01-2.6 3.6M7.2 5.6H4.8a2.6 2.6 0 002.6 3.6"/><path d="M12 14.2v3M8.8 20.2h6.4l-.7-2.6H9.5z"/>'),
    star:     IK('<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>'),
    star2:    IK('<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor" fill-opacity=".16"/>'),
    sparkle:  IK('<path d="M12 3.2l1.7 4.6 4.6 1.7-4.6 1.7L12 15.8l-1.7-4.6-4.6-1.7 4.6-1.7z"/><path d="M18.4 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    calendar: IK('<rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6"/><path d="M8 3.2v4M16 3.2v4M3.6 10h16.8"/>'),
    calcheck: IK('<rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6"/><path d="M8 3.2v4M16 3.2v4M3.6 10h16.8M9.2 14.6l2 2 3.6-3.8"/>'),
    target:   IK('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>'),
    list:     IK('<rect x="4.4" y="3.4" width="15.2" height="17.2" rx="2.6"/><path d="M8.4 8.6h7.2M8.4 12.4h7.2M8.4 16.2h4.4"/>'),
    scroll:   IK('<path d="M6.6 4.2h11a2 2 0 012 2v11a3 3 0 01-3 3H7.4a2.8 2.8 0 01-2.8-2.8V6.2a2 2 0 012-2z"/><path d="M8.8 9h6.4M8.8 12.6h6.4M8.8 16.2h3.6"/>'),
    coin:     IK('<ellipse cx="12" cy="7.6" rx="7.2" ry="3.2"/><path d="M4.8 7.6v8.8c0 1.8 3.2 3.2 7.2 3.2s7.2-1.4 7.2-3.2V7.6"/><path d="M4.8 12c0 1.8 3.2 3.2 7.2 3.2s7.2-1.4 7.2-3.2"/>'),
    bag:      IK('<path d="M5.4 8h13.2l-1 11.4a1.8 1.8 0 01-1.8 1.6H8.2a1.8 1.8 0 01-1.8-1.6z"/><path d="M8.8 10V7a3.2 3.2 0 016.4 0v3"/>'),
    palette:  IK('<path d="M12 3.4a8.6 8.6 0 000 17.2c1.4 0 2-.9 2-1.8 0-1.5-1.3-1.7-1.3-2.9 0-.9.7-1.5 1.7-1.5h1.5a4.7 4.7 0 004.7-4.7c0-3.6-3.7-6.3-8.6-6.3z"/><circle cx="8.4" cy="9.6" r="1.1" fill="currentColor"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor"/><circle cx="15.6" cy="9.6" r="1.1" fill="currentColor"/>'),
    pin:      IK('<path d="M14.6 3.4l6 6-2.4 1-1.3 4.4-4.4-4.4-5.3 6.9 6.9-5.3-4.4-4.4L14 5.8z"/><path d="M8.8 15.2l-4.2 5.4"/>'),
    timer:    IK('<circle cx="12" cy="13.4" r="7.4"/><path d="M12 9.6v4l2.4 1.6M9.4 2.6h5.2"/>'),
    hourglass:IK('<path d="M6.6 3.4h10.8M6.6 20.6h10.8"/><path d="M8 3.4v3.2c0 2 4 3.6 4 5.4 0 1.8-4 3.4-4 5.4v3.2M16 3.4v3.2c0 2-4 3.6-4 5.4 0 1.8 4 3.4 4 5.4v3.2"/>'),
    spiral:   IK('<path d="M12 12a2.2 2.2 0 112.2 2.2A4 4 0 0110 12a5.8 5.8 0 0110-4"/><path d="M12 20.4A8.4 8.4 0 013.6 12"/>'),
    moon:     IK('<path d="M20.4 14.2A8.6 8.6 0 019.6 3.4a8.6 8.6 0 1010.8 10.8z"/>'),
    globe:    IK('<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.4 2.3 3.8 5.3 3.8 8.6s-1.4 6.3-3.8 8.6c-2.4-2.3-3.8-5.3-3.8-8.6s1.4-6.3 3.8-8.6z"/>'),
    satellite:IK('<path d="M9.4 5.2l3.4 3.4-4.2 4.2-3.4-3.4z"/><path d="M12.8 8.6l2.8-2.8 2.6 2.6-2.8 2.8"/><path d="M8.6 12.8l-3 3 2.6 2.6 3-3"/><path d="M14.6 14.4a4.6 4.6 0 001.4-3.3M17.8 17.2a8 8 0 002.4-5.7"/>'),
    hands:    IK('<path d="M8.6 12.4l-3-3a2 2 0 012.8-2.8l3 3"/><path d="M11.4 6.6l1.6-1.6a2 2 0 012.8 2.8l-5 5"/><path d="M4.6 13.4l4.8 4.8a2.6 2.6 0 003.7 0l5.4-5.4a2.6 2.6 0 000-3.7"/>'),
    crown:    IK('<path d="M3.6 7.4l3.6 3 4.8-6 4.8 6 3.6-3-1.8 11H5.4z"/><path d="M5.4 18.4h13.2"/>'),
    bolt:     IK('<path d="M13.4 2.8L5.6 13.4h5.4l-.4 7.8 7.8-10.6h-5.4z"/>'),
    medal:    IK('<circle cx="12" cy="14.6" r="5.6"/><path d="M9.4 9.6L6.6 3.4h10.8l-2.8 6.2"/><path d="M12 12.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>'),
    play:     IK('<path d="M8 5.4l10 6.6-10 6.6z"/>'),
    home:     IK('<path d="M3.8 10.8L12 4l8.2 6.8"/><path d="M6.6 9.4V20h10.8V9.4"/>'),
    dice:     IK('<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4"/><circle cx="8.6" cy="8.6" r="1.2" fill="currentColor"/><circle cx="15.4" cy="15.4" r="1.2" fill="currentColor"/><circle cx="15.4" cy="8.6" r="1.2" fill="currentColor"/><circle cx="8.6" cy="15.4" r="1.2" fill="currentColor"/>'),
    user:     IK('<circle cx="12" cy="8.2" r="3.6"/><path d="M4.6 20c0-3.6 3.3-5.8 7.4-5.8s7.4 2.2 7.4 5.8"/>'),
    chart:    IK('<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.4" y="12" width="2.8" height="5" rx="1"/><rect x="12.2" y="8.4" width="2.8" height="8.6" rx="1"/><rect x="17" y="14" width="2.8" height="3" rx="1"/>'),
    people:   IK('<circle cx="9" cy="8.2" r="3.2"/><path d="M3.4 19.6c0-3 2.5-4.8 5.6-4.8s5.6 1.8 5.6 4.8"/><circle cx="16.6" cy="9.2" r="2.6"/><path d="M15.6 14.8c2.8.2 5 1.9 5 4.4"/>'),
    theme:    IK('<circle cx="12" cy="12" r="8.4"/><path d="M12 3.6v16.8" /><path d="M12 3.6a8.4 8.4 0 010 16.8z" fill="currentColor" fill-opacity=".22"/>'),
    sound:    IK('<path d="M11 5.4L6.6 9.2H3.4v5.6h3.2L11 18.6z"/><path d="M15.2 9a4.4 4.4 0 010 6M18 6.4a8 8 0 010 11.2"/>'),
    keys:     IK('<rect x="2.6" y="6.4" width="18.8" height="11.2" rx="2.4"/><path d="M6.4 10h.01M9.6 10h.01M12.8 10h.01M16 10h.01M6.4 13.6h.01M9.6 13.6h11" stroke-width="2.2"/>'),
    hide:     IK('<path d="M3.4 12S6.8 5.8 12 5.8 20.6 12 20.6 12 17.2 18.2 12 18.2 3.4 12 3.4 12z"/><path d="M4 4l16 16" stroke-width="2.2"/>'),
    camera:   IK('<path d="M4 8.4h3.2L8.6 6h6.8l1.4 2.4H20v10H4z"/><circle cx="12" cy="13.2" r="3.2"/>'),
    plus:     IK('<path d="M12 5.6v12.8M5.6 12h12.8" stroke-width="2.2"/>'),
    check:    IK('<path d="M5 12.6l4.6 4.6L19 7.4" stroke-width="2.4"/>'),
    board:    IK('<path d="M7.2 4.2h9.6v5a4.8 4.8 0 01-9.6 0z"/><path d="M12 14.2v3M8.8 20.2h6.4"/><path d="M16.8 5.6h2.4a2.6 2.6 0 01-2.6 3.6M7.2 5.6H4.8a2.6 2.6 0 002.6 3.6"/>')
  };
  const ico = k => ICO[k] || ICO.star;

  /* ------------------------------------------------------ achievements */
  /* Every entry is either a counter reaching a goal, or a one-shot flag set
     by an event. Counter-shaped ones get a progress bar for free. */
  const ACH = [
    { id: 'first',    icon: 'pad', name: 'First blood',      desc: 'Finish your first round',              stat: 'rounds', goal: 1,   xp: 30,  coins: 15 },
    { id: 'ten',      icon: 'joystick', name: 'Warmed up',        desc: 'Finish 10 rounds',                     stat: 'rounds', goal: 10,  xp: 60,  coins: 30 },
    { id: 'fifty',    icon: 'flame', name: 'Regular',          desc: 'Finish 50 rounds',                     stat: 'rounds', goal: 50,  xp: 150, coins: 80 },
    { id: 'twofifty', icon: 'gem', name: 'Fixture',          desc: 'Finish 250 rounds',                    stat: 'rounds', goal: 250, xp: 400, coins: 250 },
    { id: 'try5',     icon: 'compass', name: 'Browsing',         desc: 'Try 5 different games',                stat: 'distinct', goal: 5,  xp: 60,  coins: 30 },
    { id: 'tryall',   icon: 'map', name: 'Completionist',    desc: 'Try every game in the hub',            stat: 'distinct', goal: 0,  xp: 300, coins: 200 },
    { id: 'best5',    icon: 'trend', name: 'Climbing',         desc: 'Set 5 personal bests',                 stat: 'bests',  goal: 5,   xp: 70,  coins: 35 },
    { id: 'best25',   icon: 'trophy', name: 'Record holder',    desc: 'Set 25 personal bests',                stat: 'bests',  goal: 25,  xp: 200, coins: 120 },
    { id: 'lvl5',     icon: 'star', name: 'Level 5',          desc: 'Reach level 5',                        stat: 'level',  goal: 5,   xp: 80,  coins: 50 },
    { id: 'lvl10',    icon: 'star2', name: 'Level 10',         desc: 'Reach level 10',                       stat: 'level',  goal: 10,  xp: 160, coins: 100 },
    { id: 'lvl25',    icon: 'sparkle', name: 'Level 25',         desc: 'Reach level 25',                       stat: 'level',  goal: 25,  xp: 400, coins: 300 },
    { id: 'daily1',   icon: 'calendar', name: 'Showed up',        desc: 'Finish a daily challenge',             stat: 'dailies', goal: 1,  xp: 50,  coins: 25 },
    { id: 'daily7',   icon: 'calcheck', name: 'Seven straight',   desc: 'A 7-day daily streak',                 stat: 'streakBest', goal: 7, xp: 220, coins: 150 },
    { id: 'daily30',  icon: 'target', name: 'A whole month',    desc: 'A 30-day daily streak',                stat: 'streakBest', goal: 30, xp: 600, coins: 500 },
    { id: 'quest5',   icon: 'list', name: 'Errand runner',    desc: 'Complete 5 quests',                    stat: 'quests', goal: 5,   xp: 70,  coins: 40 },
    { id: 'quest25',  icon: 'scroll', name: 'Quest chain',      desc: 'Complete 25 quests',                   stat: 'quests', goal: 25,  xp: 220, coins: 160 },
    { id: 'coins500', icon: 'coin', name: 'Piggy bank',       desc: 'Earn 500 coins in total',              stat: 'coinsEarned', goal: 500, xp: 90, coins: 0 },
    { id: 'spend',    icon: 'bag', name: 'Window shopping',  desc: 'Buy something from the shop',          stat: 'bought', goal: 1,   xp: 50,  coins: 0 },
    { id: 'palette',  icon: 'palette', name: 'Redecorated',      desc: 'Own four accent colours',              stat: 'accents', goal: 4,  xp: 120, coins: 0 },
    { id: 'pin3',     icon: 'pin', name: 'Favourites',       desc: 'Pin 3 games to the top',               stat: 'pins',   goal: 3,   xp: 50,  coins: 25 },
    { id: 'hour',     icon: 'timer', name: 'An hour in',       desc: 'Play for a total of one hour',         stat: 'minutes', goal: 60, xp: 140, coins: 90 },
    { id: 'fivehr',   icon: 'hourglass', name: 'Five hours deep',   desc: 'Play for a total of five hours',       stat: 'minutes', goal: 300, xp: 350, coins: 250 },
    { id: 'session',  icon: 'spiral', name: 'One more go',      desc: 'Play 10 rounds in one sitting',        stat: 'sessionMax', goal: 10, xp: 100, coins: 60 },
    { id: 'night',    icon: 'moon', name: 'Night shift',      desc: 'Play between 1am and 5am',             stat: 'night',  goal: 1,   xp: 60,  coins: 40 },
    { id: 'mp1',      icon: 'hands', name: 'Better together',  desc: 'Finish an online match',               stat: 'mp',     goal: 1,   xp: 80,  coins: 50 },
    { id: 'mpwin',    icon: 'crown', name: 'Top of the party', desc: 'Win an online match',                  stat: 'mpWins', goal: 1,   xp: 140, coins: 90 },
    { id: 'combo',    icon: 'bolt', name: 'On a tear',        desc: 'Set 3 personal bests in one sitting',  stat: 'sessionBests', goal: 3, xp: 160, coins: 110 },
    { id: 'allach',   icon: 'medal', name: 'Nothing left',     desc: 'Unlock every other achievement',       stat: 'achCount', goal: 0, xp: 800, coins: 600 }
  ];

  /* two goals depend on how big the hub is, so they are filled in at boot */
  function sizeGoals() {
    ACH.forEach(a => {
      if (a.id === 'tryall') a.goal = GAMES.length;
      if (a.id === 'allach') a.goal = ACH.length - 1;
    });
  }

  function statOf(a) {
    switch (a.stat) {
      case 'level':      return level().lvl;
      case 'minutes':    return Math.floor(M.seconds / 60);
      case 'streakBest': return M.streak.best || 0;
      case 'accents':    return M.owned.accent.length;
      case 'achCount':   return Object.keys(M.ach).length;
      case 'pins':       return GAMES.filter(g => Store.fav(g.id)).length;
      case 'distinct':   return GAMES.filter(g => Store.plays(g.id) > 0).length;
      default:           return ctr(a.stat);
    }
  }

  let session = { rounds: 0, bests: 0 };

  function checkAch() {
    let unlocked = [];
    ACH.forEach(a => {
      if (M.ach[a.id] || !a.goal) return;
      if (statOf(a) < a.goal) return;
      M.ach[a.id] = Date.now();
      unlocked.push(a);
    });
    if (!unlocked.length) return;
    /* rewards are granted before the toast so the numbers it quotes are real */
    unlocked.forEach(a => {
      if (a.xp) grantXp(a.xp, true);
      if (a.coins) grantCoins(a.coins);
    });
    save();
    unlocked.forEach((a, i) => setTimeout(() =>
      Toast.show(a.name, a.desc + ' · +' + a.xp + ' XP', 'gold', a.icon), i * 480));
    /* unlocking one can complete "unlock everything", so settle it */
    if (unlocked.length) setTimeout(checkAch, 30);
  }

  /* --------------------------------------------------------- xp & coins */
  /* `noToast` is for the end-of-round card, which announces the level itself,
     line by line, and would only be talking over itself with a toast too. */
  function grantXp(n, quiet, noToast) {
    if (!n) return null;
    const before = level().lvl;
    M.xp += n;
    const after = level().lvl;
    let reward = 0;
    if (after > before) {
      reward = 40 + after * 10;
      M.coins += reward;
      bump('coinsEarned', reward);
      if (!noToast) {
        Toast.show('Level ' + after, 'Unlocked +' + reward + ' coins', "good", "sparkle");
        Sound.win && Sound.win();
      }
    }
    if (!quiet) paintHeader();
    save();
    return { before, after, reward };
  }
  function grantCoins(n) {
    if (!n) return;
    M.coins += n; bump('coinsEarned', n); save();
  }

  /* ------------------------------------------------------------- quests */
  /* Deterministic from the date, so the same three appear on every device
     you sign in from without any of it needing to be stored server-side. */
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }

  const QUEST_KINDS = [
    { type: 'rounds',   goals: [3, 5, 8],    xp: 60,  coins: 30, text: n => ['Play ' + n + ' rounds', 'Any games count'] },
    { type: 'distinct', goals: [2, 3, 4],    xp: 70,  coins: 35, text: n => ['Play ' + n + ' different games', 'Spread it around'] },
    { type: 'bests',    goals: [1, 2],       xp: 90,  coins: 45, text: n => ['Beat ' + (n === 1 ? 'a personal best' : n + ' personal bests'), 'Any game'] },
    { type: 'xp',       goals: [80, 120],    xp: 60,  coins: 30, text: n => ['Earn ' + n + ' XP', 'From rounds and unlocks'] },
    { type: 'game',     goals: [2, 3],       xp: 80,  coins: 40, text: (n, g) => ['Play ' + n + ' rounds of ' + g, 'Today’s pick'] }
  ];

  function rollQuests(day) {
    const rnd = seedFrom('q' + day);
    const kinds = QUEST_KINDS.slice();
    const list = [];
    for (let i = 0; i < 3 && kinds.length; i++) {
      const k = kinds.splice(Math.floor(rnd() * kinds.length), 1)[0];
      const goal = k.goals[Math.floor(rnd() * k.goals.length)];
      const q = { type: k.type, goal, n: 0, xp: k.xp, coins: k.coins, done: false };
      if (k.type === 'game') {
        const g = GAMES[Math.floor(rnd() * GAMES.length)];
        q.arg = g.id; q.argName = g.title;
      }
      list.push(q);
    }
    return list;
  }

  function ensureDay() {
    const d = today();
    if (!M.quests || M.quests.day !== d) {
      M.quests = { day: d, list: rollQuests(d) };
      save();
    }
    /* A quest or a challenge naming a game that has since left the shelf is
       moved onto one that is still there, rather than left impossible for the
       rest of the day. */
    let moved = false;
    for (const q of (M.quests && M.quests.list) || []) {
      if (!q.arg || byId[q.arg]) continue;
      const rq = seedFrom('q' + d + q.arg);
      const g = GAMES[Math.floor(rq() * GAMES.length)];
      q.arg = g.id; q.argName = g.title; q.n = 0; moved = true;
    }
    if (moved) save();
    if (!M.daily || M.daily.day !== d || !byId[M.daily.gameId]) {
      const rnd = seedFrom('d' + d);
      const g = GAMES[Math.floor(rnd() * GAMES.length)];
      M.daily = { day: d, gameId: g.id, done: false };
      save();
    }
  }

  function questText(q) {
    const k = QUEST_KINDS.find(x => x.type === q.type);
    return k ? k.text(q.goal, q.argName || '') : ['Quest', ''];
  }

  function questProgress(q, ev) {
    if (q.done) return false;
    let hit = false;
    if (q.type === 'rounds' && ev.kind === 'round') { q.n++; hit = true; }
    else if (q.type === 'distinct' && ev.kind === 'round') {
      q.seen = q.seen || [];
      if (q.seen.indexOf(ev.gameId) < 0) { q.seen.push(ev.gameId); q.n = q.seen.length; hit = true; }
    }
    else if (q.type === 'bests' && ev.kind === 'round' && ev.best) { q.n++; hit = true; }
    else if (q.type === 'xp' && ev.kind === 'xp') { q.n += ev.amount; hit = true; }
    else if (q.type === 'game' && ev.kind === 'round' && ev.gameId === q.arg) { q.n++; hit = true; }
    if (!hit) return false;
    if (q.n >= q.goal) {
      q.done = true;
      bump('quests');
      grantXp(q.xp, true); grantCoins(q.coins);
      const t = questText(q);
      Toast.show('Quest complete', t[0] + ' · +' + q.xp + ' XP', "good", "check");
      return true;
    }
    return false;
  }

  function fireQuests(ev) {
    ensureDay();
    let changed = false;
    M.quests.list.forEach(q => { if (questProgress(q, ev)) changed = true; });
    if (changed) save();
  }

  /* --------------------------------------------------------- round hooks */
  let roundStartedAt = 0;

  function roundStart(g) {
    roundStartedAt = Date.now();
    const h = new Date().getHours();
    if (h >= 1 && h < 5) { bump('night'); }
  }

  function roundEnd(g, score, res) {
    if (!g) return;
    ensureDay();

    /* time played only counts while a round was actually live */
    if (roundStartedAt) {
      const secs = Math.min(3600, Math.round((Date.now() - roundStartedAt) / 1000));
      M.seconds += secs;
      roundStartedAt = 0;
    }

    const prevBest = Store.best(g.id);
    const isBest = !!(res && res.wasBest);
    bump('rounds');
    bump('plays:' + g.id);
    session.rounds++;
    if (session.rounds > ctr('sessionMax')) M.ctr.sessionMax = session.rounds;
    if (isBest) { bump('bests'); session.bests++; if (session.bests > ctr('sessionBests')) M.ctr.sessionBests = session.bests; }

    /* score history, for the sparklines on the stats tab */
    const h = M.hist[g.id] = M.hist[g.id] || [];
    h.push(Math.round(score) || 0);
    if (h.length > 12) h.shift();

    /* XP is deliberately not a function of raw score: a Block Blast round
       scores in the thousands and a Flappy Bird round in the tens, and
       paying by the digit would just tell people which game to farm. It pays
       for finishing, for improving, and for getting near your own ceiling. */
    let xp = 12;
    if (isBest) xp += 18;
    else if (prevBest > 0 && score > 0) xp += Math.round(20 * clamp(score / prevBest, 0, 1));
    if (res && res.win) xp += 8;

    /* What the round paid, itemised. Every coin has a name on it, because the
       end card reads the list back line by line and a total nobody can
       account for is worse than no total at all. The score line is measured
       against your own ceiling for the same reason the XP is. */
    const paid = [];
    const pay = (label, note, coins) => { if (coins > 0) paid.push({ label, note: note || '', coins }); };
    pay('Round played', '', 10);
    const reach = prevBest > 0 ? clamp(score / prevBest, 0, 1.2) : (score > 0 ? .55 : 0);
    pay('Score bonus', score > 0 ? fmt(score) : '', Math.round(34 * reach));
    if (res && res.win) pay('Won the match', '', 25);
    if (isBest && score > 0) pay('New personal best', '', 40);

    let daily = false;
    if (M.daily && !M.daily.done && M.daily.gameId === g.id) {
      M.daily.done = true;
      bump('dailies');
      const d = today();
      const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      M.streak.n = (M.streak.last === yest) ? M.streak.n + 1 : (M.streak.last === d ? M.streak.n : 1);
      M.streak.last = d;
      if (M.streak.n > (M.streak.best || 0)) M.streak.best = M.streak.n;
      xp += 100;
      daily = true;
      pay('Daily challenge', '', 60);
      if (M.streak.n > 1) pay('Streak', M.streak.n + ' days', Math.min(36, M.streak.n * 6));
    }

    const before = level();
    grantCoins(paid.reduce((a, l) => a + l.coins, 0));
    /* the level's own reward is granted inside grantXp; this only reads it
       back so the card can show where it came from */
    const up = grantXp(xp, true, true);
    if (up && up.reward) pay('Level ' + up.after, 'reached', up.reward);

    fireQuests({ kind: 'round', gameId: g.id, best: isBest, score });
    fireQuests({ kind: 'xp', amount: xp });
    checkAch();
    save();
    paintHeader();

    return {
      paid, coins: paid.reduce((a, l) => a + l.coins, 0), xp,
      before, after: level(), levelUp: !!(up && up.after > up.before),
      daily, streak: M.streak.n, purse: M.coins,
      claimable: (M.quests && M.quests.list || []).filter(q => q.done && !q.claimed).length
    };
  }

  /* things other modules report */
  function event(name, data) {
    if (name === 'mp') bump('mp');
    else if (name === 'mpwin') { bump('mp'); bump('mpWins'); }
    else if (name === 'pin') { /* counted live from Store */ }
    checkAch(); save();
  }

  /* ------------------------------------------------------------- cosmetics */
  const ACCENTS = [
    { id: 'blue',    name: 'Default',  hex: '#3b6ef5', cost: 0 },
    { id: 'violet',  name: 'Violet',   hex: '#7c5cff', cost: 150 },
    { id: 'mint',    name: 'Mint',     hex: '#0ea472', cost: 150 },
    { id: 'rose',    name: 'Rose',     hex: '#f0437a', cost: 220 },
    { id: 'amber',   name: 'Amber',    hex: '#e08706', cost: 220 },
    { id: 'cyan',    name: 'Cyan',     hex: '#0d94b8', cost: 300 },
    { id: 'crimson', name: 'Crimson',  hex: '#d92b3f', cost: 380 },
    { id: 'slate',   name: 'Slate',    hex: '#5a6b85', cost: 380 }
  ];
  const CARDS = [
    { id: 'standard', name: 'Standard', cost: 0,   desc: 'The usual grid' },
    { id: 'compact',  name: 'Compact',  cost: 200, desc: 'More games per screen' },
    { id: 'poster',   name: 'Poster',   cost: 350, desc: 'Big art, fewer tiles' }
  ];

  function applyCosmetics() {
    document.documentElement.setAttribute('data-accent', M.accent || 'blue');
    document.documentElement.setAttribute('data-cards', M.cards || 'standard');
  }

  function buy(kind, id) {
    const table = kind === 'accent' ? ACCENTS : CARDS;
    const item = table.find(x => x.id === id); if (!item) return;
    const owned = M.owned[kind];
    if (owned.indexOf(id) < 0) {
      if (M.coins < item.cost) { Toast.show('Not enough coins', 'You need ' + (item.cost - M.coins) + ' more', "", "coin"); return; }
      M.coins -= item.cost;
      owned.push(id);
      bump('bought');
      Toast.show('Unlocked', item.name, "good", "bag");
    }
    M[kind] = id;
    applyCosmetics(); save(); checkAch(); paintHeader(); renderHub();
    paintSheet();
  }

  /* ============================================================ the sheet */
  let tab = 'overview';
  const TABS = [
    ['overview', 'Overview'], ['quests', 'Daily'],
    ['ach', 'Achievements'], ['shop', 'Shop'], ['stats', 'Stats']
  ];

  const coin = '<i></i>';
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function overviewHTML() {
    const L = level();
    const pct = L.into / L.need;
    const R = 37, C = 2 * Math.PI * R;
    let name = 'Player';
    try { if (Account.user && Account.user.username) name = Account.user.username; } catch (e) {}
    const tried = GAMES.filter(g => Store.plays(g.id) > 0).length;
    const mins = Math.floor(M.seconds / 60);
    const timeStr = mins >= 60 ? (Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm') : (mins + 'm');
    const topId = Object.keys(M.ctr).filter(k => k.indexOf('plays:') === 0)
      .sort((a, b) => M.ctr[b] - M.ctr[a])[0];
    const top = topId ? byId[topId.slice(6)] : null;

    return '<div class="pf-top">' +
      '<div class="pf-ring"><svg viewBox="0 0 84 84">' +
        '<circle class="pr-bg" cx="42" cy="42" r="' + R + '"/>' +
        '<circle class="pr-fg" cx="42" cy="42" r="' + R + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(1) + '"/>' +
      '</svg><b>' + L.lvl + '</b></div>' +
      '<div class="pf-who"><h3>' + escH(name) + '</h3>' +
        '<p>Level ' + L.lvl + ' · ' + fmt(L.into) + ' / ' + fmt(L.need) + ' XP to level ' + (L.lvl + 1) + '</p>' +
        '<div class="pf-xp"><span style="width:' + (pct * 100).toFixed(1) + '%"></span></div>' +
      '</div></div>' +
      '<div class="pf-grid">' +
        stat(fmt(ctr('rounds')), 'Rounds played') +
        stat(tried + '/' + GAMES.length, 'Games tried') +
        stat(fmt(M.coins), 'Coins') +
        stat(timeStr, 'Time played') +
        stat(fmt(ctr('bests')), 'Personal bests') +
        stat(Object.keys(M.ach).length + '/' + ACH.length, 'Achievements') +
        stat((M.streak.n || 0) + 'd', 'Daily streak') +
        stat(top ? top.title : '—', 'Most played') +
      '</div>';
  }
  const stat = (b, s) => '<div class="pf-stat"><b>' + b + '</b><span>' + s + '</span></div>';

  function questsHTML() {
    ensureDay();
    const g = byId[M.daily.gameId] || GAMES[0];
    const done = M.daily.done;
    let h = '<div class="daily-card">' +
      '<div class="dc-art">' + (g.art || '') + '</div>' +
      '<div class="dc-b"><div class="dc-l">Daily challenge</div><b>' + escH(g.title) + '</b>' +
        '<span>' + (done ? 'Done today — back tomorrow' : 'Finish one round for +100 XP and 60 coins') + '</span></div>' +
      '<button class="dc-go" data-play="' + g.id + '"' + (done ? ' disabled' : '') + '>' + (done ? 'Done' : 'Play') + '</button>' +
      '</div>';

    h += '<div class="qs-hd"><span class="qs-t">Three quests, new every day.</span>' +
      '<span class="qs-streak">' + ico("flame") + ' ' + (M.streak.n || 0) + ' day streak</span></div>';

    M.quests.list.forEach(q => {
      const t = questText(q);
      const pct = clamp(q.n / q.goal, 0, 1) * 100;
      h += '<div class="quest' + (q.done ? ' done' : '') + '">' +
        '<div class="q-b"><b>' + escH(t[0]) + '</b><span>' + escH(t[1]) + '</span>' +
          '<div class="q-bar"><i style="width:' + pct.toFixed(0) + '%"></i></div></div>' +
        '<div class="q-rew">' + (q.done ? 'Claimed' : '+' + q.xp + ' XP') + '<span>' + Math.min(q.n, q.goal) + ' / ' + q.goal + '</span></div>' +
        '</div>';
    });
    return h;
  }

  function achHTML() {
    const got = Object.keys(M.ach).length;
    let h = '<div class="ach-sum"><b>' + got + ' of ' + ACH.length + '</b>' +
      '<div class="as-bar"><span style="width:' + (got / ACH.length * 100).toFixed(1) + '%"></span></div></div><div class="ach-list">';
    /* unlocked first, then whatever you are closest to finishing */
    const rows = ACH.map(a => {
      const have = !!M.ach[a.id];
      const n = statOf(a), goal = a.goal || 1;
      return { a, have, n, p: clamp(n / goal, 0, 1) };
    }).sort((x, y) => (y.have - x.have) || (y.p - x.p));

    rows.forEach(r => {
      const a = r.a;
      h += '<div class="ach' + (r.have ? ' got' : '') + '">' +
        '<span class="a-ico">' + ico(a.icon) + '</span>' +
        '<span class="a-b"><b>' + escH(a.name) + '</b><span>' + escH(a.desc) + '</span>' +
          (r.have ? '' : '<span class="a-prog"><i style="width:' + (r.p * 100).toFixed(0) + '%"></i></span>') +
        '</span>' +
        '<span class="a-rew">' + (r.have ? ico("check") : Math.min(r.n, a.goal) + '/' + a.goal) + '</span>' +
        '</div>';
    });
    return h + '</div>';
  }

  function shopHTML() {
    let h = '<div class="shop-bal">Balance <b>' + coin + fmt(M.coins) + '</b> · earn coins by playing, levelling and finishing quests</div>';
    h += '<div class="qs-hd"><span class="qs-t">Accent colour</span></div><div class="shop-grid">';
    ACCENTS.forEach(a => {
      const owned = M.owned.accent.indexOf(a.id) >= 0;
      const on = M.accent === a.id;
      const state = on ? 'on' : owned ? 'owned' : (M.coins >= a.cost ? 'buy' : 'locked');
      h += '<button class="shop-item" data-buy="accent" data-id="' + a.id + '" data-state="' + state + '">' +
        '<span class="si-sw" style="background:' + a.hex + '"></span><b>' + a.name + '</b>' +
        '<span class="si-p">' + (on ? 'Active' : owned ? 'Owned — use' : coin + fmt(a.cost)) + '</span></button>';
    });
    h += '</div><div class="qs-hd"><span class="qs-t">Hub layout</span></div><div class="shop-grid">';
    CARDS.forEach(c => {
      const owned = M.owned.cards.indexOf(c.id) >= 0;
      const on = M.cards === c.id;
      const state = on ? 'on' : owned ? 'owned' : (M.coins >= c.cost ? 'buy' : 'locked');
      h += '<button class="shop-item" data-buy="cards" data-id="' + c.id + '" data-state="' + state + '">' +
        '<span class="si-sw" style="background:linear-gradient(135deg,var(--surface-2),var(--surface-3))"></span>' +
        '<b>' + c.name + '</b><span class="si-p">' + (on ? 'Active' : owned ? 'Owned — use' : coin + fmt(c.cost)) + '</span></button>';
    });
    return h + '</div>';
  }

  function statsHTML() {
    const rows = GAMES.map(g => ({ g, plays: Store.plays(g.id), best: Store.best(g.id), h: M.hist[g.id] || [] }))
      .filter(r => r.plays > 0)
      .sort((a, b) => b.plays - a.plays);
    if (!rows.length) return '<div class="cmd-empty">Play a round and your history shows up here.</div>';
    let h = '';
    rows.forEach(r => {
      const max = Math.max.apply(null, r.h.concat([1]));
      const bars = r.h.map(v => '<i style="height:' + clamp(v / max, 0.06, 1) * 100 + '%"></i>').join('');
      h += '<div class="hist-row">' +
        '<span class="hr-n">' + escH(r.g.title) + '</span>' +
        '<span class="hr-s">' + r.plays + ' play' + (r.plays === 1 ? '' : 's') + '</span>' +
        '<span class="spark">' + bars + '</span>' +
        '<span class="hr-b">' + fmt(r.best) + '</span></div>';
    });
    return h;
  }

  let sheetShown = '';
  function paintSheet() {
    if (!el('pfOv').classList.contains('on')) return;
    /* The tabs are built once and a highlight slides between them. They were
       rebuilt on every paint, which left nothing to animate from. */
    const tabsEl = el('pfTabs');
    if (!tabsEl.querySelector('.sheet-ind')) {
      tabsEl.innerHTML = '<i class="sheet-ind"></i>' + TABS.map(([k, l]) =>
        '<button class="sheet-tab" role="tab" data-tab="' + k + '" aria-selected="false">' + l + '</button>').join('');
    }
    let onTab = null;
    tabsEl.querySelectorAll('.sheet-tab').forEach(b => {
      const is = b.dataset.tab === tab;
      b.setAttribute('aria-selected', String(is));
      if (is) onTab = b;
    });
    const ind = tabsEl.querySelector('.sheet-ind');
    if (onTab && ind) {
      const first = !ind.style.width;
      if (first) ind.style.transition = 'none';
      ind.style.width = onTab.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + onTab.offsetLeft + 'px)';
      if (first) { void ind.offsetWidth; ind.style.transition = ''; }
    }
    const L = level();
    el('pfSub').textContent = 'Level ' + L.lvl + ' · ' + fmt(M.coins) + ' coins · ' + Object.keys(M.ach).length + '/' + ACH.length + ' achievements';
    const body = el('pfBody');
    body.innerHTML =
      tab === 'overview' ? overviewHTML() :
      tab === 'quests'   ? questsHTML() :
      tab === 'ach'      ? achHTML() :
      tab === 'shop'     ? shopHTML() : statsHTML();
    body.scrollTop = 0;
    /* a new tab's contents rise in; a repaint of the same one (a purchase) does not */
    if (sheetShown !== tab) {
      sheetShown = tab;
      body.classList.remove('h-swap'); void body.offsetWidth; body.classList.add('h-swap');
    }
  }

  function openSheet(which) {
    if (which) tab = which;
    el('pfOv').classList.add('on');
    paintSheet();
  }
  function closeSheet() { el('pfOv').classList.remove('on'); }

  /* =========================================================== the header */
  function paintHeader() {
    const b = el('lvlBtn'); if (!b) return;
    const L = level();
    b.querySelector('.lv-n').textContent = L.lvl;
    b.querySelector('.lv-fill').style.width = (L.into / L.need * 100).toFixed(1) + '%';
    b.querySelector('.lv-c b').textContent = fmt(M.coins);
    b.title = 'Level ' + L.lvl + ' — ' + fmt(L.into) + '/' + fmt(L.need) + ' XP · ' + fmt(M.coins) + ' coins';
  }

  /* ============================================================== the hub */
  /* Just the markup. Where it sits, and whether anything else sits with it,
     is the hub's business — this only knows what today's challenge is.
     There used to be a "Jump back in" strip under it, which was the grid
     again in a different shape: the same cards, a row higher up, pushing the
     actual library below the fold. Recently-played is a sort order instead. */
  function dailyHTML() {
    ensureDay();
    const daily = byId[M.daily.gameId];
    if (!daily) return '';
    return '<div class="rail"><div class="rail-hd"><h2>Today’s challenge</h2>' +
      '<span>' + (M.daily.done ? 'finished — nice' : '+100 XP and 60 coins for one round') + '</span>' +
      '<button class="rail-more" data-open="quests">Quests &amp; streak →</button></div>' +
      '<div class="rail-strip">' + railCard(daily, M.daily.done ? 'Done today' : 'Daily challenge') + '</div></div>';
  }
  /* kept as the name the rest of the shell calls; the hub owns the layout */
  function paintRails() { try { HubSections.paint(); } catch (e) {} }
  function railCard(g, note) {
    return '<button class="rail-card" data-play="' + g.id + '">' +
      '<span class="rc-art">' + (g.art || '') + '</span>' +
      '<span class="rc-b"><b>' + escH(g.title) + '</b><span>' + escH(note) + '</span></span></button>';
  }


  /* ================================================== the command palette */
  const Palette = (() => {
    let items = [], sel = 0, open = false;

    function build() {
      const acts = [
        { k: 'Go', icon: "home", name: 'Back to the hub', run: () => { location.hash = ''; } },
        { k: 'Go', icon: "dice", name: 'Play something random', run: () => el('randBtn').click() },
        { k: 'Go', icon: "calendar", name: 'Daily challenge', run: () => openSheet('quests') },
        { k: 'Go', icon: "user", name: 'Profile and progress', run: () => openSheet('overview') },
        { k: 'Go', icon: "trophy", name: 'Achievements', run: () => openSheet('ach') },
        { k: 'Go', icon: "bag", name: 'Shop', run: () => openSheet('shop') },
        { k: 'Go', icon: "chart", name: 'Stats and history', run: () => openSheet('stats') },
        { k: 'Go', icon: "board", name: 'Leaderboards', run: () => el('lbBtn').click() },
        { k: 'Go', icon: "people", name: 'Multiplayer party', run: () => el('mpBtn').click() },
        { k: 'Set', icon: "theme", name: 'Toggle light / dark theme', run: () => el('themeBtn').click() },
        { k: 'Set', icon: "sound", name: 'Toggle sound', run: () => el('soundBtn').click() },
        { k: 'Set', icon: "user", name: 'Toggle friend notifications', run: () => el('notiBtn').click() },
        { k: 'Set', icon: "keys", name: 'Keyboard shortcuts', run: () => openKeys() },
        { k: 'Go', icon: "sparkle", name: "What's new", run: () => Updates.news() },
        { k: 'Set', icon: "hide", name: 'Boss key (hide everything)', run: () => Boss.on() }
      ];
      items = GAMES.map(g => ({
        k: "Play", icon: "play", name: g.title, sub: g.tagline,
        run: () => { location.hash = '#/' + g.id; }
      })).concat(acts);
    }

    function score(it, q) {
      const hay = (it.name + ' ' + (it.sub || '')).toLowerCase();
      if (!q) return 1;
      const idx = hay.indexOf(q);
      if (idx === 0) return 1000;
      if (idx > 0) return 500 - idx;
      /* loose subsequence: "gdsh" still finds "Geometry Dash" */
      let i = 0;
      for (let c = 0; c < hay.length && i < q.length; c++) if (hay[c] === q[i]) i++;
      return i === q.length ? 100 : 0;
    }

    function paint() {
      const q = el('cmdIn').value.trim().toLowerCase();
      const hits = items.map(it => ({ it, s: score(it, q) }))
        .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 40);
      sel = Math.min(sel, Math.max(0, hits.length - 1));
      const list = el('cmdList');
      if (!hits.length) { list.innerHTML = '<div class="cmd-empty">Nothing matches that.</div>'; return; }
      list.innerHTML = hits.map((x, i) =>
        '<button class="cmd-item" role="option" data-i="' + i + '" aria-selected="' + (i === sel) + '">' +
        '<span class="ci-ico">' + ico(x.it.icon) + '</span>' +
        '<span class="ci-b"><b>' + escH(x.it.name) + '</b>' + (x.it.sub ? '<span>' + escH(x.it.sub) + '</span>' : '') + '</span>' +
        '<span class="ci-k">' + x.it.k + '</span></button>').join('');
      cur = hits.map(x => x.it);
      const node = list.children[sel];
      if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }
    let cur = [];

    function show() {
      build(); open = true; sel = 0;
      el('cmdOv').classList.add('on');
      el('cmdIn').value = '';
      paint();
      setTimeout(() => { try { el('cmdIn').focus(); } catch (e) {} }, 40);
    }
    function hide() { open = false; el('cmdOv').classList.remove('on'); }
    function run(i) {
      const it = cur[i == null ? sel : i]; if (!it) return;
      hide(); Sound.blip && Sound.blip();
      try { it.run(); } catch (e) {}
    }

    function init() {
      el('cmdIn').addEventListener('input', () => { sel = 0; paint(); });
      el('cmdIn').addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, cur.length - 1); paint(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
        else if (e.key === 'Enter') { e.preventDefault(); run(); }
        else if (e.key === 'Escape') { e.preventDefault(); hide(); }
      });
      el('cmdList').onclick = e => {
        const b = e.target.closest('[data-i]'); if (!b) return;
        run(parseInt(b.dataset.i, 10));
      };
      el('cmdOv').addEventListener('click', e => { if (e.target === el('cmdOv')) hide(); });
    }
    return { init, show, hide, get open() { return open; } };
  })();

  /* ========================================================== shortcuts */
  const KEYS = [
    ['Everywhere', [
      ['Command palette', 'Ctrl K'], ['Search games', '/'], ['Shortcuts', '?'],
      ['Boss key', '`'], ['Profile', 'P'], ['Random game', 'R'],
      ['Light / dark', 'T'], ['Mute', 'M']
    ]],
    ['In a game', [
      ['Pause / resume', 'Esc'], ['Restart', 'R'], ['Back to hub', 'Backspace'],
      ['Fullscreen', 'F'], ['Screenshot', 'S']
    ]]
  ];
  function openKeys() {
    el('keysBody').innerHTML = '<div class="keys-grid">' + KEYS.map(([h, rows]) =>
      '<div><h4>' + h + '</h4>' + rows.map(r =>
        '<div class="keys-row"><span>' + r[0] + '</span><kbd>' + r[1] + '</kbd></div>').join('') + '</div>').join('') + '</div>';
    el('keysOv').classList.add('on');
  }

  /* ============================================================= cheats */
  /* The panel leads with whatever game is open, because that is the one you
     came here to bend; the rest follow so the list is still browsable from
     the hub. */
  function paintCheats() {
    const p = el('cheatPanel'); if (!p) return;
    const here = cur ? cur.id : null;
    const order = Cheats.DEFS.slice().sort((a, b) =>
      (b.game === here ? 1 : 0) - (a.game === here ? 1 : 0));
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let h =
      '<div class="ch-head"><h2>Cheats</h2><span class="ch-badge">' + esc(Cheats.OWNER) + '</span>' +
      '<span class="sp"></span><button id="cheatClose" aria-label="Close">✕</button></div>' +
      '<p class="ch-note">Only this account sees this panel. Scores from a run that used a ' +
      'cheat are not saved to your best or the leaderboard — those are shared with everyone ' +
      'else on the hub.</p>';
    for (const grp of order) {
      const open = grp.game === here;
      h += '<div class="ch-game"><h3>' + esc(grp.title) + (open ? ' · open now' : '') + '</h3>';
      for (const it of grp.items) {
        const isOn = Cheats.get(grp.game, it.id);
        h += '<button class="ch-row' + (it.act ? ' ch-act' : '') + '" type="button"' +
             ' data-g="' + grp.game + '" data-i="' + it.id + '" data-act="' + (it.act ? 1 : 0) + '"' +
             ' aria-pressed="' + (it.act ? 'false' : isOn) + '">' +
             '<span class="ch-t"><b>' + esc(it.n) + '</b><span>' + esc(it.d) + '</span></span>' +
             '<span class="ch-sw"></span></button>';
      }
      h += '</div>';
    }
    const live = Cheats.DEFS.filter(g => Cheats.anyOn(g.game)).length;
    h += '<div class="ch-foot">' +
         (live ? '<span class="ch-live">' + live + ' game' + (live === 1 ? '' : 's') + ' modified</span>' : '') +
         '<span class="sp"></span>' +
         '<button class="ghostbtn" id="cheatClear">Turn everything off</button></div>';
    p.innerHTML = h;

    p.querySelectorAll('.ch-row').forEach(b => {
      b.onclick = () => {
        const g = b.dataset.g, i = b.dataset.i;
        /* the purse pays out here and now — there is no game to wait for */
        if (g === 'purse') {
          if (i === 'coins1k') { grantCoins(1000); Toast.show('+1,000 coins', 'Paid into the purse', 'good', 'coin'); }
          else if (i === 'coins10k') { grantCoins(10000); Toast.show('+10,000 coins', 'Paid into the purse', 'good', 'coin'); }
          else { Cos.grantShards(500); Toast.show('+500 shards', 'Spend them on any item outright', 'good', 'bag'); }
          paintHeader();
          paintCheats();
          return;
        }
        if (b.dataset.act === '1') {
          Cheats.fire(g, i);
          Toast.show(cur && cur.id === g ? 'Done' : 'Armed', cur && cur.id === g ? '' : 'It fires when you open ' + g);
          return;
        }
        Cheats.set(g, i, !Cheats.get(g, i));
        paintCheats();
      };
    });
    el('cheatClear').onclick = () => { Cheats.clearAll(); paintCheats(); };
    el('cheatClose').onclick = closeCheats;
  }
  function openCheats() {
    if (!Cheats.allowed()) return;
    paintCheats();
    el('cheatOv').classList.add('on');
  }
  function closeCheats() { el('cheatOv').classList.remove('on'); }
  function toggleCheats() {
    el('cheatOv').classList.contains('on') ? closeCheats() : openCheats();
  }
  /* the button only exists for the one account, and has to re-check whenever
     somebody signs in or out */
  function paintCheatBtn() {
    const b = el('cheatBtn'); if (!b) return;
    b.style.display = Cheats.allowed() ? '' : 'none';
    if (!Cheats.allowed()) closeCheats();
  }

  /* =========================================================== boss key */
  const Boss = (() => {
    let on = false, painted = false;
    const HUES = ['#1a73e8', '#0f9d58', '#d93025', '#7b1fa2', '#f09300', '#00838f'];
    const NAMES = [['AP Calculus BC', 'Period 2 · Rm 118'], ['English Literature', 'Period 3 · Rm 204'],
                   ['Chemistry', 'Period 4 · Lab B'], ['US History', 'Period 5 · Rm 310'],
                   ['Spanish III', 'Period 6 · Rm 122'], ['Physical Education', 'Period 7 · Gym']];
    function paint() {
      if (painted) return; painted = true;
      el('bossGrid').innerHTML = NAMES.map((n, i) =>
        '<div class="boss-card"><div class="bc-top" style="background:' + HUES[i % HUES.length] + '">' +
        '<b>' + n[0] + '</b><span>' + n[1] + '</span></div>' +
        '<div class="bc-mid">No work due soon</div>' +
        '<div class="bc-bot">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>' +
        '</div></div>').join('');
    }
    function enable() {
      paint();
      el('boss').classList.add('on');
      document.title = 'Classes';
      try { Sound.setMuted(true); } catch (e) {}
      on = true;
    }
    function disable() {
      el('boss').classList.remove('on');
      document.title = baseTitle;
      on = false;
    }
    return { on: enable, off: disable, toggle: () => on ? disable() : enable(), get active() { return on; } };
  })();
  /* Only a fallback for the window between parse and init(); init() overwrites
     it with the real <title>. Kept in step with the markup so the two agree. */
  let baseTitle = 'Dashboard';

  /* =============================================================== wiring */
  function anyModal() {
    return ['pfOv', 'keysOv', 'cmdOv', 'acctOv', 'lbOv', 'mpov', 'cheatOv', 'updOv']
      .some(id => { const n = el(id); return n && n.classList.contains('on'); });
  }

  function init() {
    load(); sizeGoals(); applyCosmetics(); ensureDay();
    baseTitle = document.title;

    /* header */
    el('lvlBtn').onclick = () => openSheet('overview');
    if (el('cheatBtn')) el('cheatBtn').onclick = toggleCheats;
    paintCheatBtn();
    paintHeader();

    /* sheet chrome */
    el('pfX').onclick = closeSheet;
    el('keysX').onclick = () => el('keysOv').classList.remove('on');
    ['pfOv', 'keysOv'].forEach(id => {
      el(id).addEventListener('click', e => { if (e.target === el(id)) el(id).classList.remove('on'); });
    });
    el('pfTabs').onclick = e => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      tab = b.dataset.tab; paintSheet();
    };

    /* one delegated handler covers every "play this" and "buy this" button
       in the sheets and the rails — they are rebuilt constantly, so binding
       per node would mean rebinding per paint */
    document.addEventListener('click', e => {
      const play = e.target.closest('[data-play]');
      if (play) {
        closeSheet();
        location.hash = '#/' + play.getAttribute('data-play');
        return;
      }
      const buy = e.target.closest('[data-buy]');
      if (buy) { buy_(buy.getAttribute('data-buy'), buy.getAttribute('data-id')); return; }
      const open = e.target.closest('[data-open]');
      if (open) { openSheet(open.getAttribute('data-open')); return; }
    });
    function buy_(kind, id) { buy(kind, id); }

    Palette.init();

    /* global keys. A typing target must never be hijacked, and neither must
       a live game — the shell owns Esc and R while a round is running. */
    addEventListener('keydown', e => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        Palette.open ? Palette.hide() : Palette.show();
        return;
      }
      if (e.key === '`') {
        e.preventDefault(); Boss.toggle(); return;
      }
      /* Shift+Alt+C: deliberately awkward, because every comfortable single
         key in here is already a game control */
      if (e.shiftKey && e.altKey && (e.code === 'KeyC')) {
        e.preventDefault(); toggleCheats(); return;
      }
      if (el('cheatOv').classList.contains('on') && e.key === 'Escape') {
        e.preventDefault(); closeCheats(); return;
      }
      if (Boss.active) { if (e.key === 'Escape') Boss.off(); return; }
      if (typing || mod) return;

      if (e.key === 'Escape') {
        if (el('keysOv').classList.contains('on')) { e.preventDefault(); el('keysOv').classList.remove('on'); }
        else if (el('pfOv').classList.contains('on')) { e.preventDefault(); closeSheet(); }
        return;
      }
      if (anyModal()) return;

      /* the rest are hub-only: in a game these letters belong to the game */
      let inGame = false;
      try { inGame = document.body.classList.contains('in-game'); } catch (_) {}
      if (e.key === '?') { e.preventDefault(); openKeys(); return; }
      if (inGame) return;
      /* arrows walk the grid the way it looks rather than the way the DOM is
         ordered, and Enter opens whatever the walk landed on */
      const ARROW = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (ARROW[e.key]) { e.preventDefault(); kbMove(ARROW[e.key][0], ARROW[e.key][1]); return; }
      if (e.key === 'Enter') {
        const on = gridEl.querySelector('.gc.kb');
        if (on) { e.preventDefault(); on.click(); return; }
      }
      if (e.key === '/') { e.preventDefault(); try { el('q').focus(); el('q').select(); } catch (_) {} }
      else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openSheet('overview'); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); el('randBtn').click(); }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); el('themeBtn').click(); }
      else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); el('soundBtn').click(); }
    }, true);

    paintRails();
    checkAch();
  }

  return {
    init, roundStart, roundEnd, event, paintRails, dailyHTML, paintHeader,
    /* today's challenge as data, for the hub's poster of it */
    dailyInfo() { ensureDay(); return M.daily ? { id: M.daily.gameId, done: !!M.daily.done } : null; },
    refreshCheatBtn: paintCheatBtn, openCheats,
    openSheet, toast: Toast.show,
    /* the cosmetics module keeps its own books but spends out of this purse */
    spend(n) { if (n > M.coins) return false; M.coins -= n; save(); paintHeader(); return true; },
    add(n) { grantCoins(n); paintHeader(); },
    get tab() { return tab; },
    palette: Palette,
    boss: Boss,
    get level() { return level(); },
    get coins() { return M.coins; },
    get data() { return M; }
  };
})();
Meta.init();

