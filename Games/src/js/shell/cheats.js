/* ============================================================================
   CHEATS — a private panel, for one account.

   Worth being straight about what this is: every game on this page runs
   entirely in the browser, so the username check below is not a security
   boundary and is not pretending to be one. Anyone who opens devtools can set
   the same flags whatever it says. It is here to keep the panel out of
   everybody else's way, not to keep anybody out.

   The one thing it does take seriously is other people's numbers. A run that
   touched a cheat never reaches the personal best or the global board, because
   those are shared with every other student on the hub — a cheated score
   sitting at the top of a leaderboard is the one part of this that would land
   on somebody else. Reading a flag is what marks the run, so a game cannot
   forget to declare it.
   ========================================================================== */
const Cheats = (() => {
  const OWNER = 'johngt3';
  const SKEY = 'arcadeCheatsV1';

  /* `act` is a button rather than a switch: it fires once and the game picks
     it up on its next frame. Everything else is a toggle.

     `purse` is the exception with no game behind it: those land the moment
     they are pressed, because there is nothing to wait for. They pay into the
     shop's currencies, which are yours alone — no score, best or leaderboard
     is touched by them, so nothing here taints a run. */
  const DEFS = [
    { game: 'purse', title: 'The purse', items: [
      { id: 'coins1k',  n: 'Give 1,000 coins',  d: 'Into the purse now. A crate runs 200 to 260.', act: true },
      { id: 'coins10k', n: 'Give 10,000 coins', d: 'Enough to empty every crate in one sitting.', act: true },
      { id: 'shards500', n: 'Give 500 shards',  d: 'Shards buy any single item outright, no luck involved.', act: true }
    ] },
    { game: 'chess', title: 'Chess', items: [
      { id: 'hint',     n: 'Show best move',  d: 'Rings the move the engine would play in your position.' },
      { id: 'blunder',  n: 'Engine blunders', d: 'It plays its worst legal move instead of its best.' },
      { id: 'takeback', n: 'Take backs',      d: 'Z rewinds your last move and the reply to it.' },
      { id: 'win',      n: 'Win now',         d: 'Ends the game in your favour.', act: true }
    ] },
    { game: 'stack', title: 'Stack', items: [
      { id: 'perfect', n: 'Always perfect', d: 'Every slab snaps dead centre and keeps its full width.' },
      { id: 'nomiss',  n: 'Cannot miss',    d: 'A clean miss drops the slab instead of ending the run.' },
      { id: 'slow',    n: 'Half speed',     d: 'The slab slides at half pace.' }
    ] }
  ];

  let flags = {};
  let acts = {};            // one-shots waiting to be picked up
  let usedRun = {};         // which games have read a live flag this run

  try { flags = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { flags = {}; }
  const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(flags)); } catch (e) {} };

  function allowed() {
    try { return !!(Account.signedIn && Account.user && Account.user.username === OWNER); }
    catch (e) { return false; }        // Account is still in its dead zone during load
  }

  /* the panel's read: never marks the run */
  const get = (g, id) => !!(flags[g] && flags[g][id]);
  /* a game's read: a live flag taints the run by the act of being believed */
  function on(g, id) {
    if (!allowed()) return false;
    if (!get(g, id)) return false;
    usedRun[g] = true;
    return true;
  }
  function set(g, id, v) {
    flags[g] = flags[g] || {};
    flags[g][id] = !!v;
    save();
  }
  function fire(g, id) { if (!allowed()) return; acts[g + '.' + id] = true; usedRun[g] = true; }
  function take(g, id) {
    const k = g + '.' + id;
    if (!acts[k]) return false;
    delete acts[k];
    return true;
  }
  function anyOn(g) { const f = flags[g] || {}; return Object.keys(f).some(k => f[k]); }
  function beginRun(g) { if (g) { delete usedRun[g]; } else usedRun = {}; acts = {}; }
  function tainted(g) { return !!usedRun[g]; }
  function clearAll() { flags = {}; acts = {}; save(); }

  return { DEFS, OWNER, allowed, get, on, set, fire, take, anyOn, beginRun, tainted, clearAll };
})();
