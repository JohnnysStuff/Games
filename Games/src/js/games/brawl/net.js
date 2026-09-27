/* ============================================================================
   BALL BRAWL — online, one on one

   Nothing in a fight is steered, so nothing in it travels. The host keeps
   the match (the round, the hearts, the cards each player was dealt, who
   has picked and aimed) and sends it a few times a second as a snapshot;
   the guest sends its pick, reroll, aim and "done watching" as commands.
   When both have aimed, the host sends the fight's seed with both aims, and
   each screen runs the fight itself (sim.js): the same numbers in, the same
   fight out, with no lag and nothing to smooth over. After the round each
   side has its own result; the host sends a fingerprint of its fight
   (BBSim.hash) so the guest can check it saw the same one.

   A guest keeps only the newest snapshot (party-guests-keep-only-newest-
   snapshot), so everything a guest needs is in every snapshot rather than
   in one-off events, and the guest repeats a command until a snapshot
   shows it arrived: a lost packet costs a moment, never the round.

   Snapshot: { r round, ph phase, h hearts[2], rr rerolls left[2], of the
   cards dealt [[3], [3]], pk picks[2] (-1 none, -2 taken but not shown
   until both are in), am aimed[2], dl ms left
   on the clock, f { s seed, a aims[2] } once the fight starts, w each
   round's winner, hs [round, fingerprint], dn done[2] (last round
   watched) } — balls are sent as their index in BB_BALLS.
   Commands: { c: 'pick', r, b } { c: 'rr', r, n } { c: 'aim', r, a }
   { c: 'done', r }
   ========================================================================== */
const BB_PH = ['pick', 'vs', 'aim', 'fight', 'over'];
function bbNet(sess) {
  const HOST = sess.role === 'host';
  const players = (sess.players || []).slice(0, 2);
  while (players.length < 2) players.push({ id: 'x' + players.length, name: 'Player' });
  const N = {
    host: HOST, seat: HOST ? 0 : 1, me: sess.me,
    names: players.map(p => String(p.name || 'Player')),
    get hostLeft() { return !!sess.hostLeft; },
    /* ---- the host ---- */
    lastSend: 0, dirty: true,
    send(M, now) {
      if (!HOST) return;
      if (!N.dirty && now - N.lastSend < 250) return;
      N.dirty = false; N.lastSend = now;
      const ix = id => id ? BB_BY[id].idx : -1;
      const o = {
        r: M.round, ph: BB_PH.indexOf(M.ph), h: M.hearts.slice(), rr: M.rerolls.slice(),
        /* a pick is only "taken" (-2) until both are in: neither side sees
           the other's ball before the VS */
        of: M.offers.map(L => L.map(ix)), pk: M.picks.map(id => !id ? -1 : M.ph === 'pick' ? -2 : ix(id)), am: M.aims.map(a => a === null ? 0 : 1),
        /* the deadline is in seconds of game time, `now` in milliseconds */
        dl: Math.max(0, Math.round(M.deadline * 1000 - now)), w: M.wins.slice(-8), dn: M.done.slice()
      };
      if (M.fight) o.f = { s: M.fight.seed, a: M.fight.aims.slice() };
      if (M.hash) o.hs = M.hash.slice();
      sess.send('snap', o);
    },
    over(res) { if (HOST) { try { sess.send('over', res); } catch (e) {} } },
    /* the guest's commands since last time */
    cmds() {
      if (!HOST) return [];
      const q = sess._cmdQ, out = [];
      while (q.length) { const c = q.shift(); if (c && c.from !== sess.me) out.push(c); }
      return out;
    },
    /* ---- the guest ---- */
    seen: null,
    snap() {
      const s = sess._snap;
      if (!s || s === N.seen) return null;
      N.seen = s;
      const id = i => i >= 0 && BB_BALLS[i] ? BB_BALLS[i].id : null;
      return {
        round: s.r, ph: BB_PH[s.ph] || 'pick', hearts: s.h, rerolls: s.rr,
        offers: (s.of || [[], []]).map(L => L.map(id)), picks: (s.pk || [-1, -1]).map(i => i === -2 ? '?' : id(i)), aimed: s.am || [0, 0],
        left: s.dl || 0, fight: s.f ? { seed: s.f.s, aims: s.f.a } : null, wins: s.w || [], hash: s.hs || null, done: s.dn || [0, 0]
      };
    },
    /* the host's word that the match is over */
    ended() {
      const L = sess._events;
      for (let i = 0; i < L.length; i++) if (L[i] && L[i][0] === 'o') { const r = L[i][1]; L.length = 0; return r; }
      L.length = 0;
      return null;
    },
    /* a command, said again every so often until the host has it */
    pend: {},
    cmd(key, o, now, have) {
      if (HOST) return;
      if (have) { delete N.pend[key]; return; }
      const p = N.pend[key];
      if (p && now - p < 350) return;
      N.pend[key] = now;
      sess.cmd(o);
    }
  };
  return N;
}
