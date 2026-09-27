/* ============================================================================
   STORE — what the arcade keeps in localStorage

   Personal bests, options, play counts and each game's own save data, in
   one key, written a moment after it changes rather than on every change.
   ========================================================================== */
const Store = (() => {
  const KEY = 'arcadeHubV1';
  let mem = { best: {}, opts: {}, last: null, theme: null, muted: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(mem, JSON.parse(raw));
  } catch (e) { /* private mode / file restrictions — stay in memory */ }
  let pending = false;
  function save() {
    if (pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    }, 120);
  }
  return {
    data: mem,
    best: id => mem.best[id] || 0,
    submit(id, score) {
      const prev = mem.best[id] || 0;
      if (score > prev) { mem.best[id] = score; save(); return true; }
      return false;
    },
    opt(gid, oid, val) {
      const k = gid + ':' + oid;
      if (val === undefined) return mem.opts[k];
      mem.opts[k] = val; save();
    },
    touch(id) {
      mem.last = id;
      mem.plays = mem.plays || {};
      mem.plays[id] = (mem.plays[id] || 0) + 1;
      mem.seen = mem.seen || {};
      mem.seen[id] = Date.now();
      save();
    },
    plays: id => (mem.plays && mem.plays[id]) || 0,
    seenAt: id => (mem.seen && mem.seen[id]) || 0,
    get totalPlays() { let n = 0; for (const k in (mem.plays || {})) n += mem.plays[k]; return n; },
    fav(id, v) {
      mem.favs = mem.favs || {};
      if (v === undefined) return !!mem.favs[id];
      if (v) mem.favs[id] = 1; else delete mem.favs[id];
      save();
    },
    /* A scratch space per game, for anything that is not a high score:
       levels finished, things unlocked, where a long game had got to. Until
       this existed a game could persist exactly one number about itself, so
       everything else — which of Geometry Dash's twelve levels you have
       cleared, how far down a tower you have been — died with the tab.

       Values go through JSON, so they must be plain data. The whole thing
       lives under one key per game inside the same blob the rest of the hub
       uses, which keeps it inside the one localStorage write the hub already
       batches rather than adding a second store with its own quota. */
    gameData(id) {
      mem.gd = mem.gd || {};
      return mem.gd[id] || (mem.gd[id] = {});
    },
    gameGet(id, key, def) {
      const d = this.gameData(id);
      return key === undefined ? d : (d[key] === undefined ? def : d[key]);
    },
    gameSet(id, key, val) {
      const d = this.gameData(id);
      if (val === undefined) delete d[key]; else d[key] = val;
      save();
      return val;
    },
    gameClear(id) { mem.gd = mem.gd || {}; delete mem.gd[id]; save(); },
    get last() { return mem.last; },
    setPref(k, v) { mem[k] = v; save(); },
    getPref: k => mem[k]
  };
})();

