/* ============================================================================
   BALL BRAWL — the computer player

   Two decisions a round, like anyone else: which of its three balls to take,
   and where to send it. Nobody sees the other side's pick before the VS,
   the computer included, so it picks from the match-up table
   (matchups.js) the ball that does best against the field, with more slack
   on the easier levels. It aims by playing the fight out: every aim it
   considers is run against a handful of guesses at yours, in the
   background a few milliseconds at a time, and it goes with the one that
   came off best. It never sees your real aim, only guesses at it, and the
   fight itself gets a seed it cannot know, so it can be outplayed.
   ========================================================================== */
const BBCpu = (() => {
  const LV = {
    easy:   { think: [1.2, 3.4], slack: 99, aims: 0,  guesses: 0, look: 0 },
    normal: { think: [1.4, 4.2], slack: 8,  aims: 10, guesses: 3, look: 9 },
    hard:   { think: [1.8, 4.8], slack: 2,  aims: 18, guesses: 5, look: 12 }
  };
  const lv = level => LV[level] || LV.normal;
  const rnd = (a, b) => a + Math.random() * (b - a);
  /* how a ball does against everything, and against one ball in particular */
  const vs = (a, b) => (typeof BB_MATCH !== 'undefined' && BB_MATCH[a] && BB_MATCH[a][b] !== undefined) ? BB_MATCH[a][b] : 50;
  const overall = a => { let s = 0; for (const b of BB_BALLS) s += vs(a, b.id); return s / BB_BALLS.length; };

  /* Which ball, of the three on offer: on easy any of them, otherwise the
     one that does best against the field, give or take its slack. */
  function pick(level, offers) {
    const L = lv(level);
    if (level === 'easy') return offers[(Math.random() * offers.length) | 0];
    return offers.map(id => [id, overall(id) + rnd(-L.slack, L.slack)]).sort((a, b) => b[1] - a[1])[0][0];
  }
  /* When to take it: once its cards are dealt (about 1.8 s), and a moment
     to "think". Seconds from the start of the pick, within `limit`. */
  function pickAt(level, limit) {
    const L = lv(level);
    return Math.min(limit - 1.2, 1.8 + rnd(L.think[0], L.think[1]));
  }

  /* The aim, worked out over several frames. seat is the computer's own
     seat (its aim is aims[seat]). step(ms) works for about that long and
     says whether it has finished; best is the aim so far. */
  function planner(level, balls, seat) {
    const L = lv(level);
    const cand = [], guess = [];
    for (let i = 0; i < L.aims; i++) cand.push({ q: (Math.random() * BBM.AIMS) | 0, s: 0, n: 0 });
    /* a few aims straight at the other ball and either side of it, which a
       person often tries */
    if (L.aims) {
      const other = seat ? -BBSim.START : BBSim.START, me = -other;
      const at = BBM.aimOf(Math.atan2(0, other - me));
      for (const d of [0, 40, -40, 90, -90]) cand.push({ q: (at + d + BBM.AIMS) % BBM.AIMS, s: 0, n: 0 });
    }
    for (let i = 0; i < L.guesses; i++) guess.push((Math.random() * BBM.AIMS) | 0);
    let ci = 0, gi = 0;
    const P = {
      best: (Math.random() * BBM.AIMS) | 0,
      done: !L.aims,
      step(ms) {
        if (P.done) return true;
        const t0 = performance.now();
        const lim = BBSim.ticks(L.look);
        while (performance.now() - t0 < ms) {
          const c = cand[ci], aims = seat ? [guess[gi], c.q] : [c.q, guess[gi]];
          const S = BBSim.run({ seed: (Math.random() * 4294967296) >>> 0, balls, aims }, lim);
          const me = S.b[seat], it = S.b[1 - seat];
          /* a win is worth most; short of one, being further ahead */
          const v = S.over ? (S.winner === seat ? 1 : S.winner === 2 ? .5 : 0)
                           : .5 + .5 * (Math.max(0, me.hp) / me.max - Math.max(0, it.hp) / it.max);
          c.s += v; c.n++;
          if (++gi >= guess.length) {
            gi = 0;
            if (++ci >= cand.length) {
              let top = cand[0];
              for (const k of cand) if (k.s / k.n > top.s / top.n) top = k;
              P.best = top.q; P.done = true;
              return true;
            }
          }
        }
        return false;
      }
    };
    return P;
  }
  /* when to lock the aim in: sooner on easy, never before it has decided */
  function aimAt(level, limit) {
    const L = lv(level);
    return Math.min(limit - .8, rnd(L.think[0] * .8, L.think[1] * .9));
  }
  return { pick, pickAt, planner, aimAt, overall, vs };
})();
