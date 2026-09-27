/* ============================================================================
   SocNet: soccer online.

   The party's host runs the match exactly as it runs offline, and everyone
   else runs a mirror of it. What makes it feel like playing on your own:

   - Your player is yours. On a guest's screen it runs, turns, dribbles and
     kicks the moment you press, with no round trip. The guest tells the
     host where it is (up to 20 times a second) and what it did, and the
     host moves that player there and does the same.
   - The ball stays one ball, the host's, seen three ways on a guest's
     screen: at your feet the instant you have it (MINE); flying from your
     foot the instant you kick it, eased onto the host's path as that
     arrives (KICKED); and otherwise the host's, drawn a moment in the past
     and interpolated so it never stutters (NET), like everyone else.
   - What you do to the ball is judged by what you saw. Every action carries
     the host time your screen was showing; the host keeps the last half
     second of where the ball was, and tests a pickup, a tackle, a header or
     a save against the ball as it was then. Whatever your player does to
     the ball on your screen (a kick, a slide that takes it, a keeper's palm
     or catch) you tell the host exactly how it left, and if the ball was
     there it leaves the same way there: nothing is rolled again, so the
     two never part. A goal against a keeper on another screen waits the
     moment his save would take to get here.
   - Your kick gets to the host late, so there the ball makes up the time it
     lost, and is where your screen has it when the next picture comes back:
     the two agree, and your ball never has to be pulled back.
   Everyone else on a guest's screen is interpolated between the host's
   snapshots (NetBuf), so they glide rather than jump. When the snapshots
   run late (a spike on the line), they carry on the way they were going
   for up to a quarter of a second rather than freezing, and the ball flies
   on by its own physics; whatever that guessed wrong is taken up over a
   moment when the real picture arrives (glide), never all at once.
   ========================================================================== */

/* where the ball was `lag` seconds ago on the host: the ball itself offline,
   or with nothing to look back on */
function socPast(W, lag) {
  const H = W.hist, b = W.ball;
  if (!H || !H.length || !(lag > 0)) return b;
  const t = W.t - lag;
  for (let i = H.length - 1; i >= 0; i--) if (H[i].t <= t) return H[i];
  return H[0];
}

const SocNet = (() => {
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const LAG_MAX = .5;                    // the most a guest's view is trusted to trail the host (HIST covers it)
  const HIST = 64;                       // steps of ball history: just over half a second
  const EXT = .25;                       // how long a late picture is carried on before it waits
  const quiet = () => {};
  /* A thing on a guest's screen, drawn where the host's picture has it plus
     an offset that soaks up the picture's jumps. Between one look and the
     next the picture should have moved the way the thing was going (its
     velocity); anything more than `tol` beyond that is the picture jumping,
     not the thing moving, and goes into the offset, which drains away at
     most `cap` a second. A jump bigger than `snap` (a kickoff lining
     everyone up) is taken at once. `vz` null: height is left as it is. */
  function glide(g, x, y, z, vx, vy, vz, rdt, tol, cap, snap) {
    if (!g.on) { Object.assign(g, { on: true, rx: x, ry: y, rz: z, vx, vy, vz, ox: 0, oy: 0, oz: 0 }); return g; }
    const ex = x - g.rx - (g.vx + vx) / 2 * rdt, ey = y - g.ry - (g.vy + vy) / 2 * rdt;
    const ez = vz === null ? 0 : z - g.rz - ((g.vz || 0) + vz) / 2 * rdt, d = Math.hypot(ex, ey, ez);
    if (Math.hypot(x - g.rx, y - g.ry, vz === null ? 0 : z - g.rz) > snap) g.ox = g.oy = g.oz = 0;
    else if (d > tol) { const k = (d - tol) / d; g.ox -= ex * k; g.oy -= ey * k; g.oz -= ez * k; }
    g.rx = x; g.ry = y; g.rz = z; g.vx = vx; g.vy = vy; g.vz = vz;
    const m = Math.hypot(g.ox, g.oy, g.oz);
    if (m > 1e-3) {
      const to = Math.max(0, Math.max(m * Math.exp(-rdt / .09), m - cap * rdt)), k = to / m;
      g.ox *= k; g.oy *= k; g.oz *= k;
    }
    return g;
  }
  /* How often the host sends the match and a guest its player. Every
     message is delivered to each other screen and each one is paid for,
     so a bigger party sends a little less often. */
  const rate = n => n <= 2 ? 20 : n <= 4 ? 15 : 12;
  /* states a guest's own player gets into by itself; any other the host put
     it in (knocked down, celebrating, a chest trap), and the guest follows */
  const OWN = new Set(['move', 'kick', 'slide', 'header', 'dive', 'catch', 'release', 'getup']);

  /* ---- who plays where, if nobody chose ----
     The lineup decides that (lineup.js). This is the arrangement for a
     match that somehow starts without one, the same on every screen from
     the roster: players go to the two sides in turn, host first, and on
     each side people take the outfield first (striker, then defender),
     then goal. The sides grow to fit everyone. */
  function seats(cfg, players) {
    const n = players.length, mode = Math.max(cfg.mode, Math.ceil(n / 2));
    const order = ['fw', 'df', 'gk'].filter(r => SOC_FORMS[mode].some(f => f.role === r));
    const used = [0, 0];
    return {
      mode,
      list: players.map((pl, k) => { const team = k % 2; return { pid: pl.id, name: String(pl.name || 'Player'), team, role: order[used[team]++], k }; })
    };
  }

  /* ================================================================ host */
  function host(W, S) {
    const HZ = rate(S.players.length), ev = [], acks = {};
    let sendT = 0, actor = null, checkT = 1;
    /* hist: the ball's last half second. debt: how far a guest's kick is
       still behind the kicker's screen (catchUp). pend: a goal waiting on a
       keeper from another screen (goal()). */
    W.hist = []; W.debt = 0; W.pend = null;
    const byPid = id => W.players.find(p => p.pid === id);
    /* how far behind the host a guest's screen runs, kept up from what it sends */
    const lagOf = (p, seen) => {
      const l = socClamp(W.t - seen, 0, LAG_MAX);
      p.net.lag = p.net.lag === undefined ? l : p.net.lag + (l - p.net.lag) * .2;
    };
    /* Every sound the host makes goes to the others too, tagged with whose
       doing it was: that screen has already played it. */
    const play = W.sound;
    W.sound = (n, a) => { play(n, a); ev.push(['s', r3(W.t), n, a === undefined ? null : r2(a), actor]); };

    /* what a guest did: the same thing, done here to their player */
    function act(p, a) {
      const k = acks[p.pid] || (acks[p.pid] = [0, 0, 0, 0, 0, 0]);
      if (a.n <= k[0]) return;                                   // it rode in again with a report
      const b = W.ball, lag = socClamp(W.t - (a.seen === undefined ? W.t : a.seen), 0, LAG_MAX), past = socPast(W, lag);
      actor = p.pid;
      k[0] = a.n;
      if (a.seen !== undefined) lagOf(p, a.seen);
      /* a goal held for this keeper, and the ball had not gone in when he
         got to it on his screen: his save counts, and the goal does not */
      const saves = !!(W.pend && W.pend.keeper === p && !past.net);
      switch (a.a) {
        /* a kick, a keeper's throw or punt, or a header that met the ball:
           the guest says exactly how it left, and it leaves the same way */
        case 'k': case 'r': case 'h': {
          const near = socDist(past.x, past.y, a.bx, a.by) < (a.a === 'h' ? 16 : 20) && Math.abs(past.z - a.bz) < 16;
          /* A fifty-fifty: someone here took the ball after the moment the
             guest's screen was showing, and is right where the guest kicked
             it. The guest could not have seen them get there, and has already
             watched their kick fly: it stands, and the one who had just
             taken it has it taken back. A keeper's catch is never undone. */
          const o = b.owner, seen = a.seen === undefined ? W.t : a.seen;
          const fifty = o && o !== p && !o.holding && (W.ownedAt || 0) > seen && (near || a.m) && socDist(o.x, o.y, a.bx, a.by) < 20;
          const ok = b.owner === p || (!b.owner && (!b.inNet || saves) && near) || fifty;
          if (a.a === 'h') head(p, a);
          if (ok) {
            if (fifty) o.cd = .4;
            if (saves) W.pend = null;
            /* it left the guest's foot a moment ago: made up in catchUp() */
            W.debt = socClamp(a.ow || 0, 0, EXT);
            if (a.a === 'r') { socState(p, 'release', a.an, { at: 0, done: true }); p.holding = false; p.at = a.at || 0; }
            else if (a.a === 'k') { socState(p, 'kick', a.an, { at: 0, done: true }); p.at = a.at || 0; }
            p.x = a.x; p.y = a.y; p.face = a.f;
            Object.assign(b, { owner: null, x: a.bx, y: a.by, z: a.bz, vx: a.vx, vy: a.vy, vz: a.vz, last: p, inNet: 0,
              target: a.tg >= 0 ? W.players[a.tg] || null : null, kickT: 0, shot: a.sh ? 1 : 0, bounced: 0 });
            b.kick = { kind: a.kd, from: [a.bx, a.by], to: [a.tx, a.ty], by: p, id: b.kicks = (b.kicks || 0) + 1 };
            p.cd = .3;
            if (a.snd) W.sound(a.snd, a.sv === null ? undefined : a.sv);
            if (a.sh && a.a === 'k') W.spark(a.bx, a.by - 5);
          }
          k[1] = a.n; k[2] = ok ? 1 : 0; k[3] = ok ? b.kick.id : 0;
          /* the test bench asks why a kick was turned down */
          if (!ok && W.netLog) W.netLog.push({ kick: a.a, why: b.owner ? 'owned' : b.inNet ? 'net' : 'far', owner: b.owner ? b.owner.idx : -1,
            d: +socDist(past.x, past.y, a.bx, a.by).toFixed(1), dz: +Math.abs(past.z - a.bz).toFixed(1), lag: +lag.toFixed(3), st: p.st });
          break;
        }
        case 'hj': head(p, a); break;                            // a header's jump, before it meets anything
        /* a slide, a dive, a keeper going up for it: done here for the look
           of it. What it did to the ball, that screen says ('t', 'm'). */
        case 's':
          if (p.st !== 'move' && p.st !== 'kick') break;
          p.x = a.x; p.y = a.y;
          socSlide(p, a.dx, a.dy);
          break;
        case 'd':
          if (p.st !== 'move') break;
          p.x = a.x; p.y = a.y; p.face = a.f;
          socDive(p, a.dir, !!a.low, a.sp);
          break;
        case 'cc':
          if (p.st !== 'move') break;
          p.x = a.x; p.y = a.y; socCatch(p, !!a.high);
          break;
        /* The guest's player met the ball on their screen and sent it off
           without kicking it: a slide that took it, a keeper's palm. It
           stands if the ball was there when their screen had it there and
           nobody has kicked it since (bar the computer, only just), and the
           ball leaves exactly as it did there. Whoever the slide went
           through goes down. */
        case 't': {
          const since = (past.kid || 0) !== (b.kick ? b.kick.id : 0);
          const cpu = !!(b.kick && b.kick.by && !b.kick.by.human && W.t - (W.kickAt || 0) < .3);
          const near = socDist(past.x, past.y, a.bx, a.by) < 18 && Math.abs(past.z - a.bz) < 16;
          const o = b.owner, mate = !!(o && o !== p && o.team === p.team), held = !!(o && o !== p && o.holding);
          const ok = near && (!since || cpu) && !held && !mate && (!b.inNet || saves);
          if (ok) {
            if (saves) W.pend = null;
            if (a.st === 'slide' && p.st === 'move') socSlide(p, a.dx, a.dy);   // its start went astray
            const v = a.o >= 0 ? W.players[a.o] : null;
            /* (they have run on since that screen saw them, the longer the lag the further) */
            if (v && v.team !== p.team && v.st !== 'down' && !(v.gk && v.holding) && (o === v || past.own === v.idx) && socDist(v.x, v.y, a.bx, a.by) < 24 + lag * 80) {
              socFall(v, a.dx, a.dy, W);
              if (W.onFoul) W.onFoul(p, v);
            }
            Object.assign(b, { owner: null, x: a.bx, y: a.by, z: a.bz, vx: a.vx, vy: a.vy, vz: a.vz, last: p, inNet: 0,
              target: null, kickT: 0, shot: 0, bounced: 0 });
            b.kick = { kind: 'touch', from: [a.bx, a.by], to: [a.bx + a.vx, a.by + a.vy], by: p, id: b.kicks = (b.kicks || 0) + 1 };
            p.cd = .25;
            if (a.snd) W.sound(a.snd, a.sv === null ? undefined : a.sv);
            if (a.st === 'slide') W.puff(a.bx, a.by);
            W.debt = socClamp(a.ow || 0, 0, EXT);
          }
          k[1] = a.n; k[2] = ok ? 1 : 0; k[3] = ok ? b.kick.id : 0;
          if (!ok && W.netLog) W.netLog.push({ touch: a.st, why: !near ? 'far' : since && !cpu ? 'kicked since' : held ? 'held' : mate ? 'mate' : 'net',
            d: +socDist(past.x, past.y, a.bx, a.by).toFixed(1), lag: +lag.toFixed(3) });
          break;
        }
        case 'c': p.team.call = { p, t: 1.2 }; break;           // "here!"
        /* A loose ball the guest reached on their screen. Theirs if it was
           there when they got to it and nobody has kicked it since; and if
           someone here picked it up after that moment, the earlier touch
           was the guest's, so it goes to them. */
        case 'm': {
          const seen = a.seen === undefined ? W.t : a.seen, since = (past.kid || 0) !== (b.kick ? b.kick.id : 0);
          /* kicked since: by the computer, and only just, and the guest's
             touch came first; a person's kick stands */
          const fresh = !since || (b.kick && b.kick.by && !b.kick.by.human && W.t - (W.kickAt || 0) < .3);
          const later = b.owner && b.owner !== p && !b.owner.holding && (W.ownedAt || 0) > seen;
          /* `hand`: a keeper's catch on that screen, in his gloves there at
             whatever height he took it, off a dive or a jump */
          const hand = !!a.hand && p.gk;
          const ok = b.owner === p || ((!b.owner || later) && fresh && (hand
            ? (!b.inNet || saves) && socDist(past.x, past.y, a.bx, a.by) < 18 && Math.abs(past.z - a.bz) < 16
            : !b.inNet && (p.st === 'move' || p.st === 'kick') && past.z < 9 && Math.hypot(past.x - a.x, (past.y - a.y) * 1.4) < 13));
          if (ok && b.owner !== p) {
            if (saves) W.pend = null;
            if (b.owner) b.owner.cd = .4;
            if (hand) {
              Object.assign(b, { owner: p, last: p, target: null, shot: 0, vx: 0, vy: 0, vz: 0, inNet: 0 });
              p.holding = true;
              if (p.st !== 'dive' && p.st !== 'catch') socCatch(p, false);
              W.sound('catch');
            } else {
              Object.assign(b, { owner: p, last: p, target: null, shot: 0, z: 0, vz: 0 });
              if (p.gk && socInBox(p, b)) { socCatch(p, false); p.holding = true; W.sound('catch'); }
            }
            W.ownedAt = W.t;
          }
          k[4] = a.n; k[5] = ok ? 1 : 0;
          /* the test bench asks why a claim was turned down */
          if (!ok && W.netLog) W.netLog.push({ why: b.owner ? 'owned' : b.inNet ? 'net' : !fresh ? 'kicked since' : past.z >= 9 ? 'high' : p.st !== 'move' && p.st !== 'kick' ? p.st : 'far',
            d: +Math.hypot(past.x - a.x, (past.y - a.y) * 1.4).toFixed(1), lag: +lag.toFixed(3), owner: b.owner ? b.owner.idx : -1, later });
          break;
        }
      }
      actor = null;
    }
    function head(p, a) {
      if (p.st !== 'header') { socState(p, 'header', 'header', { done: true }); p.vz = 120; }
      else p.act.done = true;
      p.x = a.x; p.y = a.y; p.face = a.f;
    }

    /* Before the step: what the guests sent, and their players to where
       they say they are. A report's position is carried on by its own
       velocity for as long as it has been in flight (a little), and the
       player is pulled onto that point rather than put there, so a late or
       bunched report never makes them hop. */
    function input() {
      const q = S._cmdQ, now = performance.now();
      /* a goal held for a keeper on another screen, and no save came in time */
      const G = W.pend;
      if (G && (W.t - G.at >= G.wait || W.phase !== 'play')) { W.pend = null; if (W.phase === 'play') G.fn(G.side); }
      while (q.length) {
        const c = q.shift(), p = c && byPid(c.from);
        if (!p || !p.remote) continue;
        if (c.c === 'u') {
          if (c.ep !== W.ep) continue;                             // from before the last kickoff
          p.net.rep = { x: c.x, y: c.y, vx: c.vx, vy: c.vy, f: c.f, dx: c.dx, dy: c.dy, at: now };
          if (c.go) p.net.go = true;
          if (c.s !== undefined) lagOf(p, c.s);
          if (c.lt !== undefined) { p.net.lt = c.lt; p.net.ltAt = now; }          // echoed in pack(), for the round trip
          if (c.acts) for (const a of c.acts) act(p, a);
        } else if (c.c === 'a') act(p, c);
      }
      for (const p of W.players) {
        if (!p.remote || p.st !== 'move' || !p.net.rep) continue;
        const r = p.net.rep, age = Math.min(.3, (now - r.at) / 1000), tx = r.x + r.vx * age, ty = r.y + r.vy * age;
        const ex = tx - p.x, ey = ty - p.y;
        if (ex * ex + ey * ey > 1600) { p.x = tx; p.y = ty; p.vx = r.vx; p.vy = r.vy; }
        else { p.vx = r.vx + ex * 12; p.vy = r.vy + ey * 12; }
        p.face = r.f; p.dx = r.dx; p.dy = r.dy;
      }
    }

    /* After the step: the ball's history, anyone who has left, and the
       snapshot when one is due. */
    let lastOwner = null, lastKick = null;
    function output(dt) {
      const b = W.ball, H = W.hist;
      if (b.owner !== lastOwner) { lastOwner = b.owner; W.ownedAt = W.t; }
      if (b.kick !== lastKick) { lastKick = b.kick; W.kickAt = W.t; }
      H.push({ t: W.t, x: b.x, y: b.y, z: b.z, kid: b.kick ? b.kick.id : 0, own: b.owner ? b.owner.idx : -1, net: b.inNet ? 1 : 0 });
      if (H.length > HIST) H.shift();
      /* someone who has left the party: the CPU takes their player on */
      if ((checkT -= dt) <= 0) {
        checkT = 1;
        const here = new Set((S.players || []).map(q => q.id));
        for (const p of W.players) if (p.remote && !here.has(p.pid)) { p.remote = false; p.human = false; p.net = null; p.name = ''; }
      }
      if ((sendT -= dt) > 0) return;
      sendT = Math.max(0, sendT + 1 / HZ);
      S.send('snap', pack());
    }
    function pack() {
      const b = W.ball, ix = p => p ? p.idx : -1, now = performance.now();
      /* Each guest's last report time back to them, with how long it has
         waited here: what is left is the round trip, measured afresh with
         every picture rather than now and then off an action. */
      for (const p of W.players) if (p.remote && p.net && p.net.lt !== undefined) {
        const k = acks[p.pid] || (acks[p.pid] = [0, 0, 0, 0, 0, 0]);
        k[6] = p.net.lt; k[7] = Math.round(now - p.net.ltAt);
      }
      return {
        t: r3(W.t), ph: W.phase, ck: r1(W.clock), sc: W.score.slice(), ep: W.ep,
        ko: W.ko ? ix(W.ko.taker) : -1, tr: W.trans ? [r2(W.trans.t), W.trans.dur] : 0,
        P: W.players.map(p => [r1(p.x), r1(p.y), r1(p.z), Math.round(p.vx), Math.round(p.vy), p.face, p.st, p.an, r3(p.at),
          p.holding ? 1 : 0, p.st === 'dive' ? socFrame(p) : -1]),
        B: [r1(b.x), r1(b.y), r1(b.z), Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), ix(b.owner), ix(b.last),
          b.inNet, b.hidden ? 1 : 0, b.kick ? b.kick.id : 0, b.shot, r1(b.roll), ix(b.target), r3(W.debt || 0)],
        /* the referee, so everyone sees the same cards */
        F: W.ref ? [r1(W.ref.x), r1(W.ref.y), W.ref.face, W.ref.an, r3(W.ref.at)] : 0,
        /* who plays where, from the lineup: a guest builds the match from it
           (lineup.js), a late one too */
        L: W.seats ? { m: W.seats.mode, s: W.seats.list.map(q => [q.pid, q.team, q.role, q.k]) } : 0,
        A: acks, ev: ev.splice(0)
      };
    }
    return {
      input, output,
      /* a moment the guests' screens make themselves (banners, confetti),
         timed so it lands when their picture of the match gets there */
      event(e) { ev.push([e[0], r3(W.t)].concat(e.slice(1))); },
      over(o) { S.send('over', o); },
      go: p => !!(p.net && p.net.go),
      /* A guest's kick or touch got here late: the ball makes up the time it
         lost at twice the pace (the match's own step, then this one), so it
         is where the kicker's screen has it once caught up. What it ran into
         on the way (a goal, a post) comes back. */
      catchUp(dt) {
        const b = W.ball;
        if (!(W.debt > 0)) return null;
        if (b.owner || b.inNet) { W.debt = 0; return null; }
        const d = Math.min(W.debt, dt);
        W.debt -= d;
        return socBallStep(b, d, W.sound);
      },
      /* A goal, unless it is against a keeper on another screen: then it
         waits as long as his save would take to get here (act(), `saves`) */
      goal(side, fn) {
        const k = W.teams[side < 0 ? 0 : 1].gk;
        if (k && k.remote && k.net) {
          W.pend = { side, fn, keeper: k, at: W.t, wait: socClamp((k.net.lag === undefined ? .25 : k.net.lag) + .06, .1, LAG_MAX) };
          return;
        }
        fn(side);
      },
      get pending() { return !!W.pend; }
    };
  }

  /* =============================================================== guest */
  function guest(W, S) {
    const HZ = rate(S.players.length), me = W.me, P = W.players;
    const nb = NetBuf(HZ >= 20 ? 95 : HZ >= 15 ? 115 : 135);
    let last = null, newest = null, newestAt = 0, ep = null, dispT = 0, went = false;
    let n = 0, sendT = 0, rtt = .16, snd = null;
    const queue = [], pend = [];
    /* the ball on this screen: its mode, the kick or claim it is waiting
       on the host about, and the ease from wherever it was when the mode
       last changed */
    /* how often the host has had to overrule this screen: for the test bench */
    const stats = { kicks: 0, kickFail: 0, claims: 0, claimFail: 0 };
    const K = { mode: 'net', n: 0, id: 0, at: 0, off: null, claim: 0, lastKid: -1, kickedAt: -9, tgt: null, rx: null };
    /* marked: your player's state before the controls moved them on (mark()) */
    let netB = null, pullAt = 0, ghost = null, marked = null;
    /* how long ago, on the host's clock, what this screen does now happened
       there: half the round trip */
    const ow = () => r3(socClamp(rtt / 2, 0, EXT));
    const play = W.sound;
    W.sound = (name, a) => { snd = [name, a === undefined ? null : a]; play(name, a); };

    /* The ball, `ext` seconds past the newest snapshot: at someone's feet,
       carried on with them; loose, flown on by the ball's own physics from
       where the snapshot left it (off the boards and all), stepped on from
       the last time rather than worked out afresh. In the net it waits. */
    function carryOn(nb, B, ext) {
      if (nb.inNet) return;
      if (nb.own >= 0) {
        nb.x = socClamp(nb.x + nb.vx * ext, 3, SOC.PL - 3); nb.y = socClamp(nb.y + nb.vy * ext, 3, SOC.PD - 3);
        return;
      }
      if (!ghost || ghost.src !== B || ghost.t > ext + 1e-6) {
        ghost = { src: B, t: 0, q: { x: B[0], y: B[1], z: B[2], vx: B[3], vy: B[4], vz: B[5], owner: null, inNet: 0, kickT: 0, roll: 0, shot: B[11], bounced: 0 } };
      }
      while (ghost.t + 1 / 240 < ext) { socBallStep(ghost.q, 1 / 120, quiet); ghost.t += 1 / 120; }
      const q = ghost.q;
      nb.x = q.x; nb.y = q.y; nb.z = q.z; nb.vx = q.vx; nb.vy = q.vy; nb.vz = q.vz;
    }

    /* ---- what the host has sent ---- */
    function pull() {
      const sn = S._snap;
      if (sn && sn !== last) {
        last = sn;
        if (nb.push(sn)) { newest = sn; newestAt = performance.now(); acked(sn.A && sn.A[S.me]); retarget(); }
      }
      for (const e of S._events.splice(0)) { if (e[0] === 'o') W.over = e[1]; else queue.push(e); }
      const s = nb.sample();
      if (!s) return false;
      const [a, b, f, over] = s, L = (u, v) => u + (v - u) * f, N = f < .5 ? a : b;
      /* past the newest snapshot, which is late: everything carried on from it */
      const ext = over > 0 ? Math.min(EXT, over / 1000) : 0;
      const now = performance.now(), rdt = pullAt ? Math.min(.1, (now - pullAt) / 1000) : 0;
      pullAt = now;
      dispT = L(a.t, b.t) + ext;
      /* Put somewhere rather than moved there (a kickoff lining everyone up,
         the ball back on the spot): further between two snapshots than it
         could go at `v` a second. That is shown as it happened, not swept
         across the pitch in between, and nothing glides from before it. */
      const span = Math.max(.001, b.t - a.t), put = (A, B, v) => Math.hypot(B[0] - A[0], B[1] - A[1]) > v * span + 12;
      for (let i = 0; i < P.length; i++) {
        const p = P[i], A = a.P[i], B = b.P[i];
        if (p === me || !A || !B) continue;
        const Q = f < .5 ? A : B, jump = put(A, B, 220), vx = L(A[3], B[3]), vy = L(A[4], B[4]);
        let x = jump ? Q[0] : L(A[0], B[0]), y = jump ? Q[1] : L(A[1], B[1]);
        if (ext) { x = socClamp(x + vx * ext, 2, SOC.PL - 2); y = socClamp(y + vy * ext, 2, SOC.PD - 2); }
        if (jump && p.ng) p.ng.on = false;
        const g = glide(p.ng || (p.ng = {}), x, y, L(A[2], B[2]), vx, vy, null, rdt, 2.5, 170, 60);
        p.x = x + g.ox; p.y = y + g.oy; p.z = Math.max(0, g.rz + g.oz); p.vx = vx; p.vy = vy;
        p.face = Q[5]; p.st = Q[6]; p.holding = !!Q[9];
        if (A[7] === B[7]) { p.an = B[7]; p.at = L(A[8], B[8]) + ext; } else { p.an = Q[7]; p.at = Q[8] + ext; }
        if (Q[10] >= 0) p.nf = Q[10]; else delete p.nf;
      }
      /* the host's referee, between its snapshots */
      const FA = a.F, FB = b.F, rf = W.ref;
      if (rf && FA && FB) {
        const Q = f < .5 ? FA : FB;
        rf.x = L(FA[0], FB[0]); rf.y = L(FA[1], FB[1]); rf.face = Q[2];
        if (FA[3] === FB[3]) { rf.an = FB[3]; rf.at = L(FA[4], FB[4]) + ext; } else { rf.an = Q[3]; rf.at = Q[4] + ext; }
      }
      W.phase = N.ph; W.clock = Math.max(0, L(a.ck, b.ck) - (N.ph === 'play' ? ext : 0)); W.score = N.sc.slice();
      W.ko = N.ko >= 0 ? { taker: P[N.ko], t: 0 } : null;
      W.trans = N.tr ? { t: a.tr && b.tr ? L(a.tr[0], b.tr[0]) : N.tr[0], dur: N.tr[1], fn: quiet, fired: true } : null;
      const A = a.B, B = b.B, Q = N.B, bj = put(A, B, 520);
      netB = { x: bj ? Q[0] : L(A[0], B[0]), y: bj ? Q[1] : L(A[1], B[1]), z: bj ? Q[2] : L(A[2], B[2]), vx: Q[3], vy: Q[4], vz: Q[5], own: Q[6], last: Q[7],
               inNet: Q[8], hidden: Q[9], kid: Q[10], shot: Q[11], roll: L(A[12], B[12]), tg: Q[13], gx: 0, gy: 0, gz: 0 };
      if (ext) carryOn(netB, B, ext);
      else ghost = null;
      /* Drawn with the picture's jumps soaked up. At someone's feet it takes
         that player's, so the two never come apart, and carries it on when
         they let it go rather than jumping to one of its own. */
      if (bj && K.ng) K.ng.on = false;
      const o = netB.own >= 0 ? P[netB.own] : null;
      const g = glide(K.ng || (K.ng = {}), netB.x, netB.y, netB.z, netB.vx, netB.vy, netB.vz, rdt, 6, 300, 120);
      if (o && o !== me && o.ng) { g.ox = o.ng.ox; g.oy = o.ng.oy; g.oz = 0; }
      netB.gx = g.ox; netB.gy = g.oy; netB.gz = g.oz;
      /* the moments that have now reached this screen's picture */
      queue.sort((x, y) => x[1] - y[1]);
      while (queue.length && queue[0][1] <= dispT + .001) fire(queue.shift());
      return true;
    }
    function fire(e) {
      if (e[0] === 's') {
        const [, , name, arg, who] = e;
        if (who === S.me) return;                                              // this screen made it already
        if (K.mode === 'kicked' && /^(bounce|board|post|net)$/.test(name)) return; // this screen's ball makes its own
        play(name, arg === null ? undefined : arg);
      } else if (W.ev) {
        if (e[0] === 'k') W.ev.kickoff();
        else if (e[0] === 'g') W.ev.goal(e[2], !!e[3], [e[4], e[5]]);
        else if (e[0] === 'f') W.ev.full();
      }
    }
    /* The host's word on this screen's actions: dropped from the resend
       list once it has them, a kick it would not take or a claim it turned
       down taken back, and the round trip measured on the way. */
    function acked(A) {
      if (!A) return;
      const [an, kn, kok, kid, cn, cok, lt, held] = A;
      while (pend.length && pend[0].n <= an) pend.shift();
      /* the round trip: our report's time, back, less its wait on the host */
      if (lt !== undefined && lt !== null) {
        const s = (performance.now() - lt - held) / 1000;
        if (s > 0 && s < 2) rtt += (s - rtt) * .1;
      }
      if (kn > (stats.kn || 0)) { stats.kn = kn; stats.kicks++; if (!kok) stats.kickFail++; }
      if (K.mode === 'kicked' && K.n && kn >= K.n) {
        if (kn === K.n && kok) K.id = kid;
        else if (kn === K.n && !kok) toNet();
      }
      if (cn > (stats.cn || 0)) { stats.cn = cn; stats.claims++; if (!cok) stats.claimFail++; }
      if (K.claim && cn >= K.claim) {
        if (cn === K.claim && !cok && K.mode === 'mine' && !ownsMe()) {
          toNet();
          /* a catch the host would not give: out of his hands */
          if (me.holding) { me.holding = false; if (me.st === 'hold') socState(me, 'move', 'ready'); }
        }
        K.claim = 0;
      }
    }
    const ownsMe = () => !!newest && newest.B[6] === me.idx;

    /* ---- this screen's own player ----
       A kickoff puts everyone back in place; the host knocking you down,
       or a goal's celebration, you follow. Everything else you do yourself. */
    function place(Q) {
      me.x = Q[0]; me.y = Q[1]; me.z = Q[2]; me.vx = Q[3]; me.vy = Q[4]; me.face = Q[5];
      socState(me, Q[6], Q[7]); me.at = Q[8]; me.holding = !!Q[9];
    }
    function adopt() {
      if (!newest) return;
      const Q = newest.P[me.idx];
      if (!Q) return;
      if (newest.ep !== ep) {
        ep = newest.ep; went = false;
        place(Q); me.ix = me.iy = 0; me.dx = me.team.dir; me.dy = 0;
        K.mode = 'net'; K.off = null; K.n = K.id = K.claim = 0; K.rx = null; pend.length = 0; W.ball.inNet = 0;
        return;
      }
      /* A keeper's throw or punt is his own, from the wind-up until the
         host has it: before that the host still has him holding the ball.
         Put back to holding in the wind-up, it never left his hands; after
         it, he stood holding nothing. */
      const released = Q[6] === 'hold' && (me.st === 'release' || pend.some(q => q.a === 'r'));
      if (!OWN.has(Q[6]) && me.st !== Q[6] && !released) place(Q);
    }

    /* ---- the ball on this screen ---- */
    /* back to the host's ball, gliding there over `tau` seconds: long enough
       to read as the ball moving, not jumping (a shot this screen let fly
       past a keeper who, on the host, saved it, comes back like a deflection) */
    function toNet(tau) {
      const b = W.ball;
      K.mode = 'net'; K.n = K.id = 0; K.tgt = null; K.rx = null;
      K.off = { x: b.x, y: b.y, z: b.z, t: 0, d: null, tau: tau || .07 };
    }
    function showNet(dt) {
      const b = W.ball, s = netB;
      if (!s) return;
      let x = s.x + s.gx, y = s.y + s.gy, z = s.z + s.gz;
      /* from wherever it last was to the host's, over a moment */
      if (K.off) {
        if (!K.off.d) K.off.d = [K.off.x - s.x, K.off.y - s.y, K.off.z - s.z];
        /* shrinking like a spring, but never faster than a hard shot
           travels, so a long way back reads as the ball rolling there */
        const d = K.off.d, m = Math.hypot(d[0], d[1], d[2]);
        const to = Math.max(m * Math.exp(-dt / K.off.tau), m - 330 * dt), k = m > 1e-6 ? to / m : 0;
        d[0] *= k; d[1] *= k; d[2] *= k;
        x += d[0]; y += d[1]; z += d[2];
        if (to < .3) K.off = null;
      }
      Object.assign(b, { x, y, z: Math.max(0, z), vx: s.vx, vy: s.vy, vz: s.vz, owner: s.own >= 0 ? P[s.own] : null,
        last: s.last >= 0 ? P[s.last] : null, inNet: s.inNet, hidden: !!s.hidden, shot: s.shot, roll: s.roll,
        target: s.tg >= 0 ? P[s.tg] : null });
      if (s.kid !== K.lastKid) { K.lastKid = s.kid; b.kickT = 0; }
      b.kickT = (b.kickT || 0) + dt;
    }
    /* reaching a loose ball: yours on this screen at once, and the host asked */
    function claim() {
      const b = W.ball, s = netB;
      /* judged by where the host had the ball at this moment, not where the
         eased picture shows it, which the host never saw */
      if (!s || b.owner || s.inNet || s.z >= 7 || me.st !== 'move' || me.cd > 0 || W.phase !== 'play') return;
      if (b.last === me && performance.now() - K.kickedAt < 350) return;
      if (Math.hypot(s.x - me.x, (s.y - me.y) * 1.4) >= 9) return;
      K.claim = send({ a: 'm', x: r1(me.x), y: r1(me.y) });
      Object.assign(b, { owner: me, last: me, target: null, shot: 0, vz: 0 });            // it settles to the foot (socCarry)
      if (me.gk && socInBox(me, b)) { socCatch(me, false); me.holding = true; K.catchByClaim = true; }
      K.mode = 'mine';
    }
    /* The host's own path for a ball this screen kicked, carried forward to
       now: worked out once per snapshot, from where the host had it by how
       long that snapshot has been on the way, then moved on step by step. */
    function retarget() {
      if (K.mode !== 'kicked' || !newest) return;
      const B = newest.B;
      /* Only once the host has said the kick is ours. Before that its kick
         is some earlier one, or none since the kickoff: 0, as ours is until
         then, which once aimed a ball just kicked back at the kicker's feet. */
      if (!K.id || B[10] !== K.id) { K.tgt = null; return; }
      const q = { x: B[0], y: B[1], z: B[2], vx: B[3], vy: B[4], vz: B[5], owner: null, inNet: B[8], kickT: 0, roll: 0, shot: B[11], bounced: 0 };
      /* carried on by the time the picture took to get here, and by any the
         host's ball still has to make up (catchUp), to where it is now */
      const steps = Math.min(72, Math.round((rtt / 2 + (B[14] || 0)) * 120));
      for (let i = 0; i < steps; i++) socBallStep(q, 1 / 120, quiet);
      K.tgt = q;
    }
    function kickedStep(dt) {
      const b = W.ball;
      K.at += dt;
      if (K.rx) { held(dt); return; }
      socBallStep(b, dt, W.sound);                                  // this screen's ball flies on by itself
      const B = newest && newest.B;
      if (B && K.id && newest.ph === 'play') {
        /* on the host it has since been kicked again, or picked up: from
           here it is the host's ball, or at the feet of the one it was
           passed to, as it will be here in a moment */
        if (B[10] !== K.id || B[6] >= 0 || B[7] !== me.idx) {
          if (B[6] === me.idx) { K.mode = 'mine'; b.owner = me; return; }
          if (B[6] >= 0 && B[10] === K.id && b.target && P[B[6]] === b.target) { K.rx = { p: b.target, at: 0 }; held(dt); return; }
          toNet(.1); return;
        }
      }
      /* the pass reaching the one it was meant for: theirs here at once */
      const t = b.target;
      if (t && t !== me && b.z < 8 && Math.hypot(b.x - t.x, (b.y - t.y) * 1.4) < 9) { K.rx = { p: t, at: 0 }; held(dt); return; }
      if (K.tgt) {
        socBallStep(K.tgt, dt, quiet);
        const k = 1 - Math.exp(-5 * dt), T = K.tgt;
        b.x += (T.x - b.x) * k; b.y += (T.y - b.y) * k; b.z += (T.z - b.z) * k;
        b.vx += (T.vx - b.vx) * k; b.vy += (T.vy - b.vy) * k; b.vz += (T.vz - b.vz) * k;
      }
      if (K.at > 5) toNet();
    }
    /* A pass with the one it was meant for, here before the host's picture
       shows it: at their feet as they go, until that picture catches up
       (then it is the host's ball again, already in the same place), or it
       turns out someone else got to it first. Without this it flew on past
       them until the host's word came back, then came back itself. */
    function held(dt) {
      const b = W.ball, R = K.rx, p = R.p, B = newest && newest.B;
      R.at += dt;
      const k = 1 - Math.exp(-18 * dt), fx = socClamp(p.x + p.face * 6, 3, SOC.PL - 3), fy = p.y + 1;
      b.x += (fx - b.x) * k; b.y += (fy - b.y) * k; b.z = Math.max(0, b.z - 110 * dt);
      b.vx = p.vx; b.vy = p.vy; b.vz = 0; b.owner = p; b.last = p; b.target = null; b.hidden = false;
      if (netB && netB.own === p.idx) { toNet(.05); return; }
      if (K.id && B && (B[10] !== K.id || (B[6] >= 0 && B[6] !== p.idx))) { toNet(.1); return; }
      if (R.at > rtt + .6) toNet(.1);
    }

    /* ---- what this screen's player did, to the host ---- */
    function send(a) {
      a.n = ++n; a.seen = r3(dispT);
      pend.push(a);
      S.cmd(Object.assign({ c: 'a' }, a));
      return a.n;
    }
    function kicked() {
      const b = W.ball, st = me.st, a = st === 'header' ? 'h' : st === 'release' ? 'r' : 'k';
      /* m: it was at this player's feet on this screen when they kicked it */
      K.n = send({ a, m: K.mode === 'mine' ? 1 : 0, an: me.an, at: r3(me.at), x: r1(me.x), y: r1(me.y), f: me.face,
        bx: r1(b.x), by: r1(b.y), bz: r1(b.z), vx: r1(b.vx), vy: r1(b.vy), vz: r1(b.vz),
        tg: b.target ? b.target.idx : -1, sh: b.shot, kd: b.kick.kind, tx: r1(b.kick.to[0]), ty: r1(b.kick.to[1]),
        snd: snd ? snd[0] : null, sv: snd ? snd[1] : null, ow: ow() });
      flying();
    }
    /* Your player met the ball here and did not kick it. In a keeper's
       gloves: a claim with the hands. Knocked away (a slide that took it, a
       palm): sent to the host exactly as it left, like a kick, with whoever
       the slide went through. */
    function touched(victim) {
      const b = W.ball;
      if (b.owner === me) {
        K.claim = send({ a: 'm', hand: 1, x: r1(me.x), y: r1(me.y), bx: r1(b.x), by: r1(b.y), bz: r1(b.z) });
        K.mode = 'mine'; K.off = null; K.rx = null;
        return;
      }
      const A = me.act || {};
      K.n = send({ a: 't', st: me.st, o: victim && victim !== me ? victim.idx : -1, dx: r2(A.dx || 0), dy: r2(A.dy || 0),
        bx: r1(b.x), by: r1(b.y), bz: r1(b.z), vx: r1(b.vx), vy: r1(b.vy), vz: r1(b.vz), ow: ow(),
        snd: snd ? snd[0] : null, sv: snd ? snd[1] : null });
      flying();
    }
    /* The ball on its way from this screen's player: flown here from the
       very numbers the host was sent, so the two fly the same */
    function flying() {
      const b = W.ball;
      for (const q of ['x', 'y', 'z', 'vx', 'vy', 'vz']) b[q] = r1(b[q]);
      K.mode = 'kicked'; K.id = 0; K.at = 0; K.off = null; K.tgt = null; K.rx = null; K.kickedAt = performance.now();
      /* In sight: a keeper's hands hide the ball while they hold it (the art
         draws it), and nothing here brings it back but the host's picture,
         so a throw or a punt flew unseen and turned up where it landed. */
      b.inNet = 0; b.hidden = false;
    }
    function changed(st0) {
      const st = me.st, A = me.act;
      if (st === 'slide') send({ a: 's', x: r1(me.x - me.vx / 120), y: r1(me.y - me.vy / 120), dx: r2(A.dx), dy: r2(A.dy) });
      else if (st === 'header') send({ a: 'hj', x: r1(me.x), y: r1(me.y), f: me.face });
      else if (st === 'dive') send({ a: 'd', x: r1(me.x), y: r1(me.y), f: me.face, dir: A.dir, low: A.low ? 1 : 0, sp: r1(Math.hypot(me.vx, me.vy)) });
      else if (st === 'catch' && st0 === 'move' && !K.catchByClaim) send({ a: 'cc', x: r1(me.x), y: r1(me.y), high: A.high ? 1 : 0 });
      K.catchByClaim = false;
    }
    /* Where this screen's player is, to the host, only when the host's own
       guess would be off. The host carries the last report on by its
       velocity (dead reckoning), so a player running straight needs a few
       reports a second; a turn, a stop or a change of pace sends one at
       once. Every message is paid for once per screen in the party. */
    let told = null;
    function report(dt) {
      sendT -= dt;
      const now = performance.now();
      if (told) {
        if (sendT > 0) return;                                         // never more often than the rate
        const age = Math.min(.3, (now - told.t) / 1000), moving = Math.hypot(me.vx, me.vy) > 1;
        const off = Math.hypot(told.x + told.vx * age - me.x, told.y + told.vy * age - me.y);
        const turned = Math.hypot(told.vx - me.vx, told.vy - me.vy) > 10 || Math.abs(told.dx - me.dx) + Math.abs(told.dy - me.dy) > .3 || told.f !== me.face;
        if (off < 1.5 && !turned && now - told.t < (moving ? 250 : 600) && !(went && !told.go)) return;
      }
      sendT = 1 / HZ;
      told = { x: me.x, y: me.y, vx: me.vx, vy: me.vy, dx: me.dx, dy: me.dy, f: me.face, go: went, t: now };
      S.cmd({ c: 'u', ep, x: r1(me.x), y: r1(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), f: me.face,
        dx: r2(me.dx), dy: r2(me.dy), go: went ? 1 : 0, s: r3(dispT), lt: Math.round(now), acts: pend.length ? pend.slice(-4) : undefined });
    }

    /* One step of this screen: the ball as your player finds it, your
       player (already steered by the controls), what they did, then the
       ball after, and your player to the host. */
    function step(dt) {
      const b = W.ball;
      snd = null;
      if (K.mode === 'net') { showNet(dt); if (ownsMe()) { K.mode = 'mine'; b.owner = me; } else claim(); }
      if (K.mode === 'mine') { b.owner = me; b.inNet = 0; }
      /* What your player was doing before the controls had them start
         something this step (a slide, a dive: mark()), and the ball as they
         find it. Taken after the controls, a slide already begun looked
         like no change, and the host never heard of it. */
      const st0 = marked === null ? me.st : marked, kick0 = b.kick, own0 = b.owner, last0 = b.last, vx0 = b.vx, vy0 = b.vy, vz0 = b.vz;
      marked = null;
      socPlayerStep(me, dt, W);
      if (b.kick !== kick0 && b.kick && b.kick.by === me) kicked();
      else {
        if (me.st !== st0) changed(st0);
        /* your player met the ball here some other way: a slide, a keeper's hands */
        if (K.mode !== 'mine' && b.last === me && (last0 !== me || b.owner !== own0 || b.vx !== vx0 || b.vy !== vy0 || b.vz !== vz0)) touched(own0);
      }
      if (me.shout > 1.05 && !K.called) { K.called = true; send({ a: 'c' }); }
      if (me.shout < 1) K.called = false;
      if (K.mode === 'mine') {
        /* to your feet, but from wherever the host last had it no faster
           than a hard shot flies: taking a ball never looks like a jump */
        const ox = b.x, oy = b.y;
        socCarry(W, dt);
        if (!me.holding) {
          const dx = b.x - ox, dy = b.y - oy, d = Math.hypot(dx, dy), cap = 330 * dt;
          if (d > cap) { b.x = ox + dx / d * cap; b.y = oy + dy / d * cap; }
        }
        /* the host has it with someone else now, and nothing of ours is
           still on its way to say otherwise */
        if (b.owner !== me) toNet();
        else if (newest && !K.claim && newest.B[6] !== me.idx && pend.every(q => q.a !== 'm') && performance.now() - newestAt < 400 && !went0()) toNet();
      } else if (K.mode === 'kicked') kickedStep(dt);
      report(dt);
    }
    /* just kicked off and still waiting for the host to say so */
    const went0 = () => went && W.phase === 'kickoff';

    return {
      pull, adopt, step,
      /* before the controls: what your player is doing now (step()) */
      mark() { marked = me.st; },
      /* the kickoff is yours and you have moved: tell the host, and play on */
      go() { went = true; },
      get went() { return went; },
      get rtt() { return rtt; },
      get mode() { return K.mode; },
      /* for the test bench: the ball as this screen is working it out */
      get ballState() { return { mode: K.mode, off: K.off && K.off.d && K.off.d.slice(), net: netB && Object.assign({}, netB), glide: K.ng && { ox: K.ng.ox, oy: K.ng.oy, oz: K.ng.oz } }; },
      stats
    };
  }

  return { seats, host, guest, rate };
})();
