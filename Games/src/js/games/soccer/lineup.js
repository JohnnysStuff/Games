/* ============================================================================
   The lineup: online, between the menu and the kickoff, everyone picks
   where they play. The host has chosen the size and the length; every
   screen then shows both sides' positions, and each person takes one, first
   come, first served (the host's word decides who got there first). Any
   place nobody takes, the computer plays, so two people can play each other
   or be on one side against the computer, at any size. Once everyone has a
   place there is a short countdown and the kickoff; anyone still choosing
   after a while is given the first place left. A rematch with the same
   people starts from the places they had.

   SocLineup.host(S, cfg) and .guest(S, cfg) run it on each kind of screen:
   step(dt, pick) takes this screen's choice (a place, -1 to give it back,
   undefined for nothing new) and gives back the seats once it is settled
   (the host's the moment it is; a guest's when the host's match begins,
   which carries them, net.js `L`). view() is what the screen shows
   (SocUI.lineup). cfg.quick settles it at once, for the test bench.
   ========================================================================== */
const SocLineup = (() => {
  const COUNT = 3;                       // the countdown once everyone has a place, s
  const AUTO = 30;                       // how long anyone has to choose, s
  const ORDER = ['fw', 'df', 'gk'];
  /* both sides' places at a size, each side striker first, keeper last */
  function places(mode) {
    const out = [];
    for (const team of [0, 1]) for (const role of ORDER) {
      const f = SOC_FORMS[mode].find(q => q.role === role);
      if (f) out.push({ team, role, pos: f.pos });
    }
    return out;
  }
  /* the smallest size with a place for everyone */
  const fit = (mode, n) => Math.min(3, Math.max(mode, Math.ceil(n / 2)));
  const names = S => Object.fromEntries(S.players.map(p => [p.id, String(p.name || 'Player')]));
  /* k: a person's place in the party's list, which decides how they look */
  const ks = S => Object.fromEntries(S.players.map((p, k) => [p.id, k]));
  let last = null;                       // the host's last lineup: { key, picks }, for a rematch

  /* ================================================================ host */
  function host(S, cfg) {
    const mode = fit(cfg.mode, S.players.length), P = places(mode), picks = {};
    const key = S.players.map(p => p.id).join('|') + '#' + mode;
    if (last && last.key === key) Object.assign(picks, last.picks);
    let v = 1, said = 0, cd = -1, t = 0, sendT = 0, done = null;
    const owner = i => Object.keys(picks).find(id => picks[id] === i);
    function take(pid, i) {
      if (i === -1) { if (picks[pid] !== undefined) { delete picks[pid]; v++; } return; }
      if (!(i >= 0 && i < P.length) || picks[pid] === i || owner(i) !== undefined) return;   // first come, first served
      picks[pid] = i; v++;
    }
    /* the first place left: outfield before goal, the emptier side first */
    function free() {
      const n = [0, 1].map(tm => Object.values(picks).filter(i => P[i].team === tm).length);
      const open = P.map((q, i) => i).filter(i => owner(i) === undefined);
      open.sort((a, b) => (P[a].role === 'gk') - (P[b].role === 'gk') || n[P[a].team] - n[P[b].team] || a - b);
      return open.length ? open[0] : -1;
    }
    function step(dt, mine) {
      if (done) return done;
      const here = S.players;
      for (const id of Object.keys(picks)) if (!here.some(p => p.id === id)) { delete picks[id]; v++; }   // gone
      const q = S._cmdQ;
      while (q.length) { const c = q.shift(); if (c && c.c === 'pick' && here.some(p => p.id === c.from)) take(c.from, c.s); }
      if (mine !== undefined) take(S.me, mine);
      t += dt;
      if (cfg.quick || t > AUTO) for (const p of here) if (picks[p.id] === undefined) { const i = free(); if (i >= 0) { picks[p.id] = i; v++; } }
      const all = here.every(p => picks[p.id] !== undefined);
      /* everyone has a place: a countdown, from the top again if anyone moves */
      if (!all) cd = -1;
      else if (cd < 0 || said !== v) cd = cfg.quick ? 0 : COUNT;
      else cd -= dt;
      if (all && cd <= 0) {
        done = { mode, list: here.map((p, k) => ({ pid: p.id, name: String(p.name || 'Player'), team: P[picks[p.id]].team, role: P[picks[p.id]].role, k })) };
        last = { key, picks: Object.assign({}, picks) };
      }
      /* to the guests: on any change at once, and a few times a second
         besides (they keep only the newest picture, so each is the whole) */
      if ((sendT -= dt) <= 0 || said !== v || done) {
        sendT = .25; said = v;
        S.send('snap', { lu: { v, m: mode, p: Object.keys(picks).map(id => [id, picks[id]]), cd: cd >= 0 ? Math.round(cd * 10) / 10 : -1,
          tl: all ? -1 : Math.max(0, Math.ceil(AUTO - t)) } });
      }
      return done;
    }
    const view = () => ({ mode, min: cfg.min, places: P.map((q, i) => Object.assign({ pid: owner(i) }, q)), mine: picks[S.me],
      pending: undefined, cd, tl: Math.max(0, Math.ceil(AUTO - t)), me: S.me, names: names(S), k: ks(S), players: S.players.map(p => p.id) });
    return { step, view, get mode() { return mode; } };
  }

  /* =============================================================== guest */
  function guest(S, cfg) {
    let st = null, want, askT = 0, done = null;
    const nameOf = pid => { const p = S.players.find(q => q.id === pid); return String((p && p.name) || 'Player'); };
    const mineIn = s => { const e = s && s.p.find(q => q[0] === S.me); return e ? e[1] : undefined; };
    function step(dt, mine) {
      if (done) return done;
      const sn = S._snap;
      /* the host's match has begun: the seats it was built with */
      if (sn && sn.L) {
        done = { mode: sn.L.m, list: sn.L.s.map(([pid, team, role, k]) => ({ pid, name: nameOf(pid), team, role, k })) };
        return done;
      }
      if (sn && sn.lu && (!st || sn.lu.v >= st.v)) st = sn.lu;
      if (mine !== undefined) { want = mine; askT = 0; }
      if (want !== undefined) {
        const have = mineIn(st), taken = want >= 0 && st && st.p.some(q => q[1] === want && q[0] !== S.me);
        /* the host has it as asked, or someone else got there first: done asking */
        if (have === want || (want === -1 && have === undefined) || taken) want = undefined;
        else if ((askT -= dt) <= 0) { askT = .5; S.cmd({ c: 'pick', s: want }); }
      }
      return null;
    }
    function view() {
      const mode = st ? st.m : fit(cfg.mode, S.players.length), P = places(mode);
      const own = i => { const e = st && st.p.find(q => q[1] === i); return e ? e[0] : undefined; };
      return { mode, min: cfg.min, places: P.map((q, i) => Object.assign({ pid: own(i) }, q)), mine: mineIn(st), pending: want,
        cd: st ? st.cd : -1, tl: st ? st.tl : AUTO, me: S.me, names: names(S), k: ks(S), players: S.players.map(p => p.id) };
    }
    return { step, view, get mode() { return view().mode; } };
  }

  return { host, guest, places, fit };
})();
