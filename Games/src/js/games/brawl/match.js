/* ============================================================================
   BALL BRAWL — the match

   The front page (a live fight going on behind the menu, and the collection
   of every ball), then a match: rounds until someone has lost all
   three hearts. A round is

     pick   three balls dealt to each player; take one (the other side's
            shows the moment they take it), one reroll a match
     vs     the two picks, face to face
     aim    point your ball and lock it in; the other side's aim is secret
     fight  FIGHT!, the fight (sim.js), K.O., a heart breaks, the round's
            result

   The host of the match (or this screen, against the computer) keeps M,
   the match itself: round, hearts, the cards dealt, picks, aims, the
   fight's seed. Online the guest's M is the host's latest snapshot
   (net.js). What is on the screen follows M through P, the screen's own
   phase, so each side can finish watching a fight at its own pace.

   Game timers run in update() (G.time, which stops when the game is
   paused); everything that moves on screen runs on the render clock.
   ========================================================================== */
function bbMatch(api, host) {
  const W = 960, H = 600, STEP = 1 / 120;
  const PICK_T = 16, AIM_T = 10, VS_T = 2.5, GO_T = .95, KO_T = 2.5, ROUND_T = 2.1, END_T = 3.2;
  const FK = host.FK, U = bbUI(api), C = U.C;
  const V = bbView();
  const NET = host.net ? bbNet(host.net) : null;
  const SOLO = !NET, HOSTS = !NET || NET.host, SEAT = NET ? NET.seat : 0, OPP = 1 - SEAT;
  const MX = SEAT ? -1 : 1;
  if (V) V.mirror = MX;
  const I = api.input;
  const level = () => api.opt('cpu') || 'normal';
  const nameOf = s => NET ? NET.names[s] : (s === SEAT ? 'You' : 'Computer');
  const teamCol = s => s === SEAT ? C.me : C.them;
  const pnow = () => performance.now() / 1000;
  const snd = (k, ...a) => { try { if (Sound[k]) Sound[k](...a); } catch (e) {} };

  /* ---- clocks ---- */
  const G = { time: 0, ups: 0, t0: null };
  /* how far the shell is into the next fixed step, so a fight drawn at any
     refresh rate moves evenly between the steps it is made of */
  function subStep() {
    const n = pnow();
    if (G.t0 === null) G.t0 = n - G.ups * STEP;
    let f = (n - G.t0) / STEP - G.ups;
    if (f < -1 || f > 3) { G.t0 = n - (G.ups + .5) * STEP; f = .5; }
    return clamp(f, 0, 1);
  }

  /* ---- the match ---- */
  const M = {
    round: 0, ph: 'none', hearts: [3, 3], rerolls: [1, 1], offers: [[], []], picks: [null, null], aims: [null, null],
    deadline: 0, vsEnd: 0, fight: null, wins: [], done: [0, 0], doneAt: 0, hash: null, used: [0, 0]
  };
  /* the screen: its phase, and what it is showing */
  const P = {
    ph: FK.on ? 'menu' : 'start', rt: pnow(), round: 0, sub: 'home', subRt: pnow(),
    hearts: [3, 3], brk: [[], []], sel: 1, myPick: null, pickRt: 0, oldOffers: null, rerollRt: -9, myRerolls: 0,
    viewAng: 0, aimLocked: false, aimQ: 0, lockRt: 0, oppSeen: [null, null], oppRt: 0, hintFast: 1,
    colSel: 0, colRt: pnow(), timeScale: 1, waitRt: 0, endRes: null, lastTick: -1, startAt: 0,
    wins: [], flips: [0, 0, 0], rflips: [0, 0, 0], oppReady: false
  };
  let F = null;                   // the fight being shown
  let D = null;                   // the fight behind the menu
  let gone = false;

  /* ---- dealing ---- */
  function deal() {
    const ids = BB_BALLS.map(b => b.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids.slice(0, 3);
  }
  const CPU = { pickAt: 0, aimAt: 0, plan: null };
  function startRound() {
    M.round++;
    M.picks = [null, null]; M.aims = [null, null]; M.fight = null; M.hash = null; M.bothAt = 0;
    M.offers = [deal(), deal()];
    M.ph = 'pick'; M.deadline = G.time + PICK_T;
    if (SOLO) CPU.pickAt = G.time + BBCpu.pickAt(level(), PICK_T);
    if (NET) NET.dirty = true;
  }
  function reroll(s) {
    if (M.ph !== 'pick' || M.picks[s] || M.rerolls[s] <= 0) return false;
    M.rerolls[s]--; M.used[s]++;
    M.offers[s] = deal();
    if (NET) NET.dirty = true;
    return true;
  }
  function take(s, id) {
    if (M.ph !== 'pick' || M.picks[s] || M.offers[s].indexOf(id) < 0) return false;
    M.picks[s] = id;
    if (NET) NET.dirty = true;
    return true;
  }
  function aimWith(s, q) {
    if (M.ph !== 'aim' || M.aims[s] !== null) return false;
    M.aims[s] = ((q % BBM.AIMS) + BBM.AIMS) % BBM.AIMS;
    if (NET) NET.dirty = true;
    return true;
  }

  /* ---- the host's side of the match (and the only side, against the
     computer) ---- */
  function hostStep() {
    if (NET) {
      for (const c of NET.cmds()) {
        if (c.r !== M.round) { if (c.c === 'done') M.done[1] = Math.max(M.done[1], c.r | 0); continue; }
        if (c.c === 'pick' && BB_BALLS[c.b]) take(1, BB_BALLS[c.b].id);
        else if (c.c === 'rr' && c.n === M.used[1] + 1) reroll(1);
        else if (c.c === 'aim') aimWith(1, c.a | 0);
        else if (c.c === 'done') M.done[1] = Math.max(M.done[1], c.r | 0);
      }
    }
    if (M.ph === 'pick') {
      /* the computer cannot see your pick any more than you can see its own */
      if (SOLO && !M.picks[1] && G.time >= CPU.pickAt) take(1, BBCpu.pick(level(), M.offers[1], null));
      if (G.time > M.deadline) {
        if (!M.picks[SEAT]) myPick(M.offers[SEAT][P.sel] || M.offers[SEAT][0]);
        if (!M.picks[OPP] && (SOLO || G.time > M.deadline + 2.5)) take(OPP, M.offers[OPP][0]);
      }
      /* a moment with both picks showing, for the card that was taken to
         land and the other side's to turn over, then VS */
      if (M.picks[0] && M.picks[1]) {
        if (!M.bothAt) M.bothAt = G.time;
        if (G.time - M.bothAt >= 1.1) { M.ph = 'vs'; M.vsEnd = G.time + VS_T; M.bothAt = 0; if (NET) NET.dirty = true; }
      }
    } else if (M.ph === 'vs') {
      if (G.time >= M.vsEnd) {
        M.ph = 'aim'; M.deadline = G.time + AIM_T;
        if (SOLO) { CPU.plan = BBCpu.planner(level(), M.picks.slice(), 1); CPU.aimAt = G.time + BBCpu.aimAt(level(), AIM_T); }
        if (NET) NET.dirty = true;
      }
    } else if (M.ph === 'aim') {
      if (SOLO && M.aims[1] === null && CPU.plan) {
        CPU.plan.step(2);
        if ((CPU.plan.done && G.time >= CPU.aimAt) || G.time > M.deadline) aimWith(1, CPU.plan.best);
      }
      if (G.time > M.deadline) {
        if (M.aims[SEAT] === null) lockAim();
        if (M.aims[OPP] === null && !SOLO && G.time > M.deadline + 2.5) aimWith(OPP, (Math.random() * BBM.AIMS) | 0);
      }
      if (M.aims[0] !== null && M.aims[1] !== null) {
        M.fight = { seed: (Math.random() * 4294967296) >>> 0, aims: M.aims.slice() };
        M.ph = 'fight';
        if (NET) NET.dirty = true;
      }
    } else if (M.ph === 'fight') {
      const mine = M.done[SEAT] >= M.round;
      const theirs = SOLO || M.done[OPP] >= M.round || (mine && G.time - M.doneAt > 8);
      if (mine && theirs) {
        if (M.hearts[0] <= 0 || M.hearts[1] <= 0) { M.ph = 'over'; if (NET) NET.dirty = true; }
        else startRound();
      }
    }
    if (NET) NET.send(M, G.time * 1000);
  }
  /* ---- the guest's: the host's snapshot is the match ---- */
  function guestStep() {
    const s = NET.snap();
    if (s) {
      const newRound = s.round !== M.round;
      if (P.rerollWait && !newRound && String(s.offers[1]) !== String(M.offers[1])) { P.rerollWait = false; P.rerollRt = pnow(); }
      M.round = s.round; M.ph = s.ph; M.hearts = s.hearts; M.rerolls = s.rerolls;
      M.offers = s.offers; M.picks = s.picks; M.aims = s.aimed.map(a => a ? 1 : null);
      M.deadline = G.time + s.left / 1000; M.fight = s.fight; M.wins = s.wins; M.hash = s.hash; M.done = s.done;
      if (newRound) { P.myPick = null; }
    }
    const now = G.time * 1000;
    /* what this side has said, until the host has it */
    if (P.myPick && M.ph === 'pick') NET.cmd('pick', { c: 'pick', r: M.round, b: BB_BY[P.myPick].idx }, now, !!M.picks[1]);
    if (P.myRerolls > 1 - M.rerolls[1] && M.ph === 'pick') NET.cmd('rr', { c: 'rr', r: M.round, n: P.myRerolls }, now, false);
    else NET.cmd('rr', null, now, true);
    if (P.aimLocked && M.ph === 'aim') NET.cmd('aim', { c: 'aim', r: M.round, a: P.aimQ }, now, !!M.aims[1]);
    if (F && F.stage === 'done' && F.round === M.round) NET.cmd('done', { c: 'done', r: M.round }, now, M.done[1] >= M.round);
    /* this side's clock ran out: take what is pointed at */
    if (M.ph === 'pick' && !P.myPick && G.time > M.deadline && M.offers[1].length) myPick(M.offers[1][P.sel] || M.offers[1][0]);
    if (M.ph === 'aim' && !P.aimLocked && G.time > M.deadline) lockAim();
    if (NET.hostLeft && P.ph !== 'end') { host.left(); gone = true; }
  }

  /* ---- this side's own choices ---- */
  function myPick(id) {
    if (P.myPick || !id) return;
    P.myPick = id; P.pickRt = pnow();
    snd('bbPick');
    if (HOSTS) take(SEAT, id);
  }
  function myReroll() {
    if (P.myPick || M.ph !== 'pick') return;
    const left = HOSTS ? M.rerolls[SEAT] : 1 - P.myRerolls;
    if (left <= 0) { snd('nope'); return; }
    P.oldOffers = M.offers[SEAT].slice(); P.rflips = [0, 0, 0];
    /* the cards turn over as soon as the new ones are here: at once for
       the host, when the host's snapshot brings them for a guest */
    if (HOSTS) { reroll(SEAT); P.rerollRt = pnow(); }
    else { P.myRerolls++; P.rerollWait = true; }
  }
  function lockAim() {
    if (P.aimLocked) return;
    P.aimLocked = true; P.lockRt = pnow();
    const sim = MX > 0 ? P.viewAng : Math.PI - P.viewAng;
    P.aimQ = BBM.aimOf(sim);
    snd('bbLock');
    if (HOSTS) aimWith(SEAT, P.aimQ);
  }

  /* ---- the screen following the match ---- */
  function follow() {
    if (P.ph === 'menu' || P.ph === 'end') return;
    if (M.ph === 'none') return;
    if (M.ph === 'over') {
      if (P.ph === 'wait' || P.ph === 'pick' || (P.ph === 'fight' && F && F.stage === 'done')) enterEnd();
      return;
    }
    if (M.round !== P.round) {
      if (P.ph === 'fight' && F && F.stage !== 'done') return;          // finish watching this one first
      if (P.ph === 'fight' && F && F.stage === 'done' && (P.hearts[0] <= 0 || P.hearts[1] <= 0)) { enterEnd(); return; }
      enterPick();
      return;
    }
    if (M.ph === 'vs' && P.ph === 'pick') enterVs();
    else if (M.ph === 'aim' && (P.ph === 'pick' || P.ph === 'vs')) enterAim();
    else if (M.ph === 'fight' && M.fight && (P.ph === 'pick' || P.ph === 'vs' || P.ph === 'aim')) enterFight();
  }
  function enterPick() {
    P.ph = 'pick'; P.rt = pnow(); P.round = M.round; P.lastTick = -1;
    P.hearts = M.hearts.slice();
    P.myPick = null; P.sel = 1; P.oldOffers = null; P.rerollRt = -9; P.rerollWait = false; P.oppReady = false;
    P.flips = [0, 0, 0]; P.rflips = [0, 0, 0];
    P.aimLocked = false;
    F = null;
    if (V) { V.reset(); V.pose('pick', 2.4); V.focusOn(0, 0, 0); }
    U.clearNums();
    P.timeScale = 1;
  }
  function enterVs() {
    P.ph = 'vs'; P.rt = pnow();
    if (V) V.pose('high', 2);
    snd('bbVs');
  }
  function enterAim() {
    P.ph = 'aim'; P.rt = pnow(); P.lastTick = -1;
    P.aimLocked = false; P.viewAng = 0;
    if (V) { V.pose('fight', 2.6); V.reset(); }
  }
  function enterFight() {
    if (!P.aimLocked && M.fight) { P.aimLocked = true; P.aimQ = M.fight.aims[SEAT]; }
    P.ph = 'fight'; P.rt = pnow();
    const setup = { seed: M.fight.seed, balls: M.picks.slice(), aims: M.fight.aims.slice() };
    F = startFight(setup, true);
    F.round = M.round;
    if (V) V.pose('fight', 3);
  }
  function enterWait() { P.ph = 'wait'; P.waitRt = pnow(); }
  function enterEnd() {
    if (P.ph === 'end') return;
    P.ph = 'end'; P.rt = pnow(); P.endGt = G.time;
    const won = P.hearts[SEAT] > 0 && P.hearts[OPP] <= 0;
    P.endRes = { win: won, mine: P.hearts[SEAT], theirs: P.hearts[OPP] };
    snd(won ? 'win' : 'fail');
    if (V && won) V.confetti(0, 0, [C.me, C.gold, '#ffffff', '#ff7ad9']);
    if (V) { V.pose('wide', 1.5); V.focusOn(0, 0, 0); }
  }

  /* ---- a fight, shown ----
     The whole fight is played once, quietly, the moment it starts: it takes
     a few milliseconds and says exactly when it ends and who wins, which is
     what lets the last half second run in slow motion toward the blow that
     ends it. Then it is played again, a step at a time, for the screen. */
  function startFight(setup, real) {
    const Q = BBSim.run(setup);
    const f = {
      setup, S: BBSim.create(setup), end: Q.tick, winner: Q.winner, hash: BBSim.hash(Q), real,
      acc: 0, rate: 1, stop: 0, stage: real ? 'go' : 'run', gt: G.time, rt: pnow(), kt: 0, round: 0, broke: false
    };
    if (V && real) V.reset();
    if (real) { U.clearNums(); snd('bbFight'); }
    return f;
  }
  function fightStep(f) {
    if (f.stage === 'go') {
      if (G.time - f.gt >= GO_T) { f.stage = 'run'; f.rt = pnow(); }
      return;
    }
    if (f.stage === 'run') {
      if (f.stop > 0) { f.stop--; f.rate = 0; return; }
      let rate = 1;
      const fast = f.real && SOLO && !api.covered && (I.down('Space') || I.pointer.down);
      if (fast) { rate = 3; P.hintFast = 0; }
      if (!f.real) rate = 1;
      const left = f.end - f.S.tick;
      if (left < 80) rate = Math.min(rate, .28 + .72 * left / 80);
      f.rate = rate; f.acc += rate;
      while (f.acc >= 1 && !f.S.over) {
        f.acc -= 1;
        BBSim.step(f.S);
        const stop = react(f, f.S.ev);
        f.S.ev.length = 0;
        if (stop && !fast) { f.stop = Math.max(f.stop, stop); f.acc = 0; break; }
      }
      /* lean in toward the ball that is about to go */
      if (f.real && V && left < 110 && f.winner !== 2) {
        const L = f.S.b[1 - f.winner];
        V.focusOn(L.x, L.y, clamp(1 - left / 110, 0, 1) * .75);
      }
      if (f.S.over) {
        f.stage = 'ko'; f.kt = G.time; f.rt = pnow();
        if (f.real) {
          P.big = Math.max(P.big || 0, f.S.b[SEAT].big); P.dealt = (P.dealt || 0) + f.S.b[SEAT].dealt;
          P.wins.push(f.winner);
          if (BBSim.hash(f.S) !== f.hash) console.warn('Ball Brawl: the fight shown was not the fight played');
          P.timeScale = .35;
          snd(f.winner === 2 ? 'bbBump' : 'bbKO', true);
          if (HOSTS) {
            if (f.winner !== 2) M.hearts[1 - f.winner] = Math.max(0, M.hearts[1 - f.winner] - 1);
            M.wins.push(f.winner); M.hash = [M.round, f.hash];
            if (NET) NET.dirty = true;
          } else if (M.hash && M.hash[0] === F.round && M.hash[1] !== f.hash) console.warn('Ball Brawl: this fight differs from the host\'s');
        }
      }
      return;
    }
    if (f.stage === 'ko') {
      const k = G.time - f.kt;
      if (k > .9) P.timeScale = Math.min(1, P.timeScale + STEP * 1.5);
      if (!f.broke && k >= 1.15) {
        f.broke = true;
        if (f.winner !== 2) {
          const L = 1 - f.winner;
          P.hearts[L] = Math.max(0, P.hearts[L] - 1);
          P.brk[L][P.hearts[L]] = U.t;
          snd('bbHeart');
        }
      }
      if (k >= KO_T) { f.stage = 'round'; f.kt = G.time; f.rt = pnow(); if (V) V.focusOn(0, 0, 0); snd('bbRound', f.winner === SEAT); }
      return;
    }
    if (f.stage === 'round') {
      if (G.time - f.kt >= ROUND_T) {
        f.stage = 'done'; P.timeScale = 1;
        if (HOSTS) { M.done[SEAT] = M.round; M.doneAt = G.time; if (NET) NET.dirty = true; }
        enterWait();
      }
    }
  }
  /* what the sim says happened, turned into sparks, sounds and numbers */
  function react(f, ev) {
    let stop = 0;
    const S = f.S, loud = f.real;
    for (const e of ev) {
      if (V) stop = Math.max(stop, V.fx(e, S) || 0);
      if (!loud) continue;
      if (e.k === 'hit') {
        const by = S.b[e.by], big = e.dmg >= 12;
        if (e.kind === 'burn') snd('bbBurn');
        else snd('bbHit', clamp(e.dmg / 22, 0, 1));
        if (e.kind === 'saw') snd('bbSaw');
        if (V) {
          const p = V.toScreen(e.x, e.y, 64);
          U.num(p.x, p.y, Math.max(1, Math.round(e.dmg)), teamCol(e.by), big);
          if (e.heal > .5) { const q = V.toScreen(by.x, by.y, 90); U.num(q.x, q.y, Math.round(e.heal), C.good, false, 'heal'); }
        }
        if (e.heal > .5) snd('bbHeal');
        if (e.kind === 'orb') snd('bbFreeze');
      } else if (e.k === 'clash') snd('bbClash');
      else if (e.k === 'block') snd('bbBlock');
      else if (e.k === 'bump') snd('bbBump', !!e.big);
      else if (e.k === 'wall') snd('bbWall', clamp((e.x || 0) * MX / 300, -.8, .8));
      else if (e.k === 'shoot') snd('bbShoot');
      else if (e.k === 'deflect') snd('bbDeflect');
      else if (e.k === 'drop') snd('bbDrop');
      else if (e.k === 'boom') snd('bbBoom', !!e.hit);
      else if (e.k === 'fade' && e.on) snd('bbFade');
      else if (e.k === 'grow') snd('bbGrow');
      else if (e.k === 'throw') snd('bbThrow', e.what);
      else if (e.k === 'catch') snd('bbCatch');
      else if (e.k === 'charge') snd('bbCharge');
      else if (e.k === 'beam') snd('bbBeam', e.hit === 3);
      else if (e.k === 'zap') snd('bbZap');
      else if (e.k === 'spray') snd('bbSpray');
      else if (e.k === 'dash') snd('bbDash');
      else if (e.k === 'ping') snd('bbPing');
    }
    return stop;
  }

  /* ---- the fight behind the menu ---- */
  function demoStep() {
    if (!D || (D.S.over && G.time - D.overAt > 2.4)) {
      const n = BB_BALLS.length, a = BB_BALLS[(Math.random() * n) | 0].id;
      let b = BB_BALLS[(Math.random() * n) | 0].id;
      if (b === a) b = BB_BALLS[(BB_BY[a].idx + 5) % n].id;
      D = startFight({ seed: (Math.random() * 4294967296) >>> 0, balls: [a, b], aims: [(Math.random() * 720) | 0, (Math.random() * 720) | 0] }, false);
      D.born = pnow();
      if (V) V.reset();
      return;
    }
    if (D.S.over) return;
    D.acc += 1;
    while (D.acc >= 1 && !D.S.over) { D.acc -= 1; BBSim.step(D.S); react(D, D.S.ev); D.S.ev.length = 0; }
    if (D.S.over) D.overAt = G.time;
  }

  /* ---- input ---- */
  function clicks(fn) {
    if (api.covered) { while (I.takeClick()) {} return; }
    let c;
    while ((c = I.takeClick())) { if (c.btn) continue; const k = U.hitAt(c.x, c.y); if (k) { U.press(k); fn(k, c); } else fn('', c); }
  }
  const pressed = (...k) => !api.covered && I.anyPressed(...k);
  function menuInput() {
    const mode = FK.mode();
    if (P.sub === 'balls') {
      clicks(k => {
        if (k === 'back') toHome();
        else if (k.slice(0, 5) === 'tile:') { const i = +k.slice(5); if (i !== P.colSel) { P.colSel = i; P.colRt = pnow(); snd('bbHover'); } }
      });
      const n = BB_BALLS.length;
      let s = P.colSel;
      if (pressed('ArrowRight', 'KeyD')) s = (s + 1) % n;
      if (pressed('ArrowLeft', 'KeyA')) s = (s + n - 1) % n;
      if (pressed('ArrowDown', 'KeyS')) s = (s + COLS) % n;
      if (pressed('ArrowUp', 'KeyW')) s = (s + n - COLS) % n;
      if (s !== P.colSel) { P.colSel = s; P.colRt = pnow(); snd('bbHover'); }
      if (pressed('Backspace')) toHome();
      return;
    }
    clicks(k => {
      if (k === 'play') { if (mode === 'solo' || (mode === 'host' && api.party.size === 2)) FK.go(); }
      else if (k === 'online' || k === 'party') FK.party();
      else if (k === 'balls') toBalls();
      else if (k.slice(0, 4) === 'cpu:') setLevel(k.slice(4));
    });
    if (pressed('Space', 'Enter', 'NumpadEnter') && (mode === 'solo' || (mode === 'host' && api.party.size === 2))) FK.go();
    else if (pressed('KeyP')) FK.party();
    else if (pressed('KeyB')) toBalls();
    if (mode === 'solo') {
      const L = ['easy', 'normal', 'hard'], i = L.indexOf(level());
      if (pressed('ArrowLeft', 'KeyA') && i > 0) setLevel(L[i - 1]);
      if (pressed('ArrowRight', 'KeyD') && i < 2) setLevel(L[i + 1]);
    }
  }
  function setLevel(v) { if (level() === v) return; api.setOpt('cpu', v); U.chipKick('cpu'); snd('blip'); }
  function toBalls() { P.sub = 'balls'; P.subRt = pnow(); P.colRt = pnow(); snd('bbFlip'); }
  function toHome() { P.sub = 'home'; P.subRt = pnow(); snd('bbFlip'); }
  function pickInput() {
    /* nothing to take while the host is dealing a guest's new cards */
    if (P.myPick || P.rerollWait) { clicks(() => {}); return; }
    clicks(k => {
      if (k.slice(0, 5) === 'card:') myPick(M.offers[SEAT][+k.slice(5)]);
      else if (k === 'reroll') myReroll();
    });
    if (P.myPick || !dealt(pnow())) return;
    const n = M.offers[SEAT].length || 3;
    if (pressed('ArrowLeft', 'KeyA')) { P.sel = (P.sel + n - 1) % n; snd('bbHover'); }
    if (pressed('ArrowRight', 'KeyD')) { P.sel = (P.sel + 1) % n; snd('bbHover'); }
    if (pressed('Space', 'Enter', 'NumpadEnter')) myPick(M.offers[SEAT][P.sel]);
    else if (pressed('KeyR')) myReroll();
  }
  function aimInput() {
    if (P.aimLocked) { clicks(() => {}); return; }
    const S = staged(), b = S.b[SEAT];
    const p = I.pointer;
    if (V && p.inside && !api.covered) {
      const g = V.cam.toGround(p.x, p.y, 30);
      const dx = g.x - b.x * MX, dy = g.y - b.y;
      if (dx * dx + dy * dy > 30 * 30 && (Math.abs(p.x - P.lpx) > .5 || Math.abs(p.y - P.lpy) > .5)) P.viewAng = Math.atan2(dy, dx);
      P.lpx = p.x; P.lpy = p.y;
    }
    const turn = 2.2 * STEP;
    if (!api.covered && I.any('ArrowLeft', 'KeyA')) P.viewAng -= turn;
    if (!api.covered && I.any('ArrowRight', 'KeyD')) P.viewAng += turn;
    if (!api.covered && I.any('ArrowUp', 'KeyW')) P.viewAng -= turn * 2;
    if (!api.covered && I.any('ArrowDown', 'KeyS')) P.viewAng += turn * 2;
    clicks(k => { if (!k || k === 'lock') lockAim(); });
    if (pressed('Space', 'Enter', 'NumpadEnter')) lockAim();
  }

  /* a sim standing still, for the screens before a fight: the balls at
     their marks, weapons out */
  let stageCache = null, stageKey = '';
  function staged() {
    const real = id => BB_BY[id] ? id : null;          // a hidden pick ('?') is no ball yet
    const a = real(M.picks[0]) || (P.ph === 'pick' && SEAT === 0 ? P.myPick : null) || 'sword';
    const b = real(M.picks[1]) || (P.ph === 'pick' && SEAT === 1 ? P.myPick : null) || 'sword';
    const key = a + '|' + b;
    if (key !== stageKey) { stageKey = key; stageCache = BBSim.create({ seed: 1, balls: [a, b], aims: [0, 360] }); }
    return stageCache;
  }

  /* ================================================================ draw */
  /* the balls this frame wants drawn in their cards and portraits, and what
     goes on top of them once they are (glass on a portrait) */
  let PV = [];
  const OVER = [];
  const flush = (ctx, t) => {
    if (V && PV.length) V.preview(ctx, PV, t);
    PV = [];
    for (const fn of OVER) fn();
    OVER.length = 0;
  };
  /* An angle that turns at `rate` a second and is kept from frame to frame,
     so a ball that spins faster under the pointer speeds up from where it
     is. (Worked out as time x rate, a change of rate swung it round by the
     whole of time since the page opened.) */
  const spins = {};
  const spin = (k, rate) => { const s = spins[k] || (spins[k] = { a: Math.random() * TAU }); s.a += rate * U.dt; return s.a; };
  /* a rounded box a ball may not leave, and its bounding box */
  const inBox = (x, y, w, h, r) => ({ clip: c => rr(c, x, y, w, h, r), bb: [x, y, w, h] });
  const inDisc = (x, y, r) => ({ clip: c => c.arc(x, y, r, 0, TAU), bb: [x - r, y - r, r * 2, r * 2] });
  function arenaFrame(dt, t) {
    const o = { t, dt, team: SEAT ? [1, 0] : [0, 1] };
    if (P.ph === 'menu') {
      if (D) { o.S = D.S; o.a = clamp(D.acc + subStep(), 0, 1); o.hide = [false, false]; }
      o.team = [0, 1];
      return o;
    }
    if (F && (P.ph === 'fight' || P.ph === 'wait' || P.ph === 'end')) {
      o.S = F.S;
      o.a = F.stage === 'run' ? clamp(F.acc + subStep() * F.rate, 0, 1) : 1;
      if (F.stage === 'go') { o.idle = pnow() - F.rt; o.a = 1; }
      return o;
    }
    if (P.ph === 'aim' || P.ph === 'vs' || P.ph === 'pick') {
      const S = staged();
      o.S = S; o.a = 1; o.idle = pnow() - P.rt; o.roll = false;
      const k = P.ph === 'aim' ? pnow() - P.rt : -1;
      o.drop = [clamp(k / .55, 0, 1), clamp((k - .14) / .55, 0, 1)];
      o.hide = P.ph === 'aim' ? [false, false] : [true, true];
      if (P.ph === 'aim') o.aim = { seat: SEAT, ang: MX > 0 ? P.viewAng : Math.PI - P.viewAng, locked: P.aimLocked, hidden: k < .55,
                                     k: (k - .55) / .45, lockT: P.aimLocked ? pnow() - P.lockRt : undefined };
      return o;
    }
    return o;
  }

  function render(ctx) {
    const dt = FK.dt, t = pnow();
    U.frame(dt);
    if (!V) { drawNoGL(ctx); return; }
    V.sway(P.ph === 'menu' ? Math.sin(t * .12) * .22 : 0);
    V.frame(dt * P.timeScale, t);
    const AF = arenaFrame(dt * P.timeScale, t);
    AF.bright = P.ph === 'menu' ? .95 : P.ph === 'pick' ? .7 : 1;
    V.arena(ctx, AF);
    /* the results page has the screen: only the arena stays behind it */
    if (P.hudOff) return;
    if (P.ph === 'menu') drawMenu(ctx, t);
    else if (P.ph === 'start') drawStart(ctx, t);
    else {
      if (P.ph === 'pick') drawPick(ctx, t);
      else if (P.ph === 'vs') drawVs(ctx, t);
      else if (P.ph === 'aim') { drawHud(ctx, t, U.eo(clamp((t - P.rt - .2) / .5, 0, 1))); drawAim(ctx, t); }
      else if (P.ph === 'fight' || P.ph === 'wait') { drawHud(ctx, t, 1); drawFight(ctx, t); }
      else if (P.ph === 'end') { drawHud(ctx, t, 1 - U.eo(clamp((t - P.rt - 2.2) / .5, 0, 1))); drawEnd(ctx, t); }
      flush(ctx, t);
      U.drawNums(ctx);
    }
    /* the menu going as the first round comes in */
    if (P.ph !== 'menu' && P.fromMenu && FK.out < 1) drawMenu(ctx, t);
    U.cursor();
  }

  /* ---- the menu ---- */
  function drawMenu(ctx, t) {
    const out = FK.out, fade = 1 - U.eo(out);
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha *= fade;
    /* the left of the screen darkened for the words */
    const g = ctx.createLinearGradient(0, 0, 620, 0);
    g.addColorStop(0, 'rgba(7,9,22,.92)'); g.addColorStop(.62, 'rgba(7,9,22,.6)'); g.addColorStop(1, 'rgba(7,9,22,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 620, H);
    const vg = ctx.createLinearGradient(0, H - 120, 0, H);
    vg.addColorStop(0, 'rgba(7,9,22,0)'); vg.addColorStop(1, 'rgba(7,9,22,.7)');
    ctx.fillStyle = vg; ctx.fillRect(0, H - 120, W, 120);
    if (P.sub === 'balls') drawBalls(ctx, t);
    else drawHome(ctx, t);
    ctx.restore();
    flush(ctx, t);
  }
  function drawHome(ctx, t) {
    const t0 = P.subRt, mode = FK.mode(), X = 56;
    const sway = k => (1 - U.bo(k)) * -70;
    /* the title, a letter at a time */
    const title = (word, y, size, fill, d) => {
      let x = X;
      ctx.save(); ctx.font = U.font(size); try { ctx.letterSpacing = '1px'; } catch (e) {}
      const ws = [...word].map(c => ctx.measureText(c).width + 1);
      ctx.restore();
      [...word].forEach((c, i) => {
        const k = U.in(t0, d + i * .05, .5);
        if (k > 0) {
          const s = 1 + (1 - U.bo(k)) * .9, bob = Math.sin(t * 2 + i * .7) * 1.5;
          ctx.save();
          ctx.globalAlpha *= Math.min(1, k * 2.5);
          ctx.translate(x + ws[i] / 2, y + (1 - U.eo(k)) * -40 + bob); ctx.scale(s, s);
          U.disp(ctx, c, 0, 0, size, fill, 'center', { stroke: '#070916', lw: size * .13, shadow: 'rgba(0,0,0,.55)', sy: size * .09, glow: i % 3 === 0 ? null : null });
          ctx.restore();
        }
        x += ws[i];
      });
    };
    const gold = ctx.createLinearGradient(0, 160, 0, 236);
    gold.addColorStop(0, '#fff2b0'); gold.addColorStop(.5, '#ffcf4a'); gold.addColorStop(1, '#ff8a1c');
    const white = ctx.createLinearGradient(0, 70, 0, 150);
    white.addColorStop(0, '#ffffff'); white.addColorStop(1, '#bfd0ff');
    title('BALL', 118, 96, white, .05);
    title('BRAWL', 204, 96, gold, .22);
    const kt = U.in(t0, .6, .5);
    U.ribbon(ctx, 'Pick a ball  ·  aim it  ·  watch it fight', X - 2 + sway(kt) * .3, 262, 11, '#c9d3f2', 'left', { alpha: kt, rule: 18 });
    /* the buttons, sliding in one after another */
    const row = (d, fn) => { const k = U.in(t0, d, .5); if (k <= 0) return; ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2); ctx.translate(sway(k), 0); fn(); ctx.restore(); };
    const party = api.party, full = party.size === 2;
    row(.7, () => {
      if (mode === 'solo') U.button(ctx, 'play', X, 292, 310, 66, 'PLAY', { primary: true, sub: 'Against the computer', size: 34 });
      else if (mode === 'host') U.button(ctx, 'play', X, 292, 310, 66, full ? 'START MATCH' : 'PARTY OF ' + party.size, { primary: full, live: full, sub: full ? '1v1 with your friend' : 'Ball Brawl is for two players', size: 30 });
      else U.button(ctx, 'play', X, 292, 310, 66, 'WAITING', { live: false, sub: 'The host starts the match', size: 30 });
    });
    if (mode === 'solo') row(.78, () => {
      U.icon(ctx, 'bolt', X + 8, 381, 13, C.gold);
      U.caps(ctx, 'Computer', X + 20, 381, 10, C.mute);
      U.chips(ctx, 'cpu', X + 88, 366, 222, 30, [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], level(),
        { col: v => v === 'easy' ? '#6dffb0' : v === 'hard' ? '#ff6b6b' : C.gold });
    });
    row(.86, () => U.button(ctx, 'online', X, 412, 150, 52, 'ONLINE', { sub: mode === 'solo' ? '1v1, invite a friend' : 'Your party', size: 22 }));
    row(.92, () => U.button(ctx, 'balls', X + 160, 412, 150, 52, 'THE BALLS', { sub: 'All ' + BB_BALLS.length + ', free', size: 22 }));
    /* the streak on a card of its own, and the keys under it */
    row(1.02, () => {
      const streak = api.load('streak', 0), best = api.best(), y = 480, h = 60;
      U.panel(ctx, X, y, 310, h, { r: 12, tint: streak ? C.gold : null, tintA: .08 });
      const half = (x, icon, col, label, v, vc) => {
        U.icon(ctx, icon, x + 18, y + h / 2, 22, col);
        U.caps(ctx, label, x + 36, y + 19, 9.5, C.mute);
        U.disp(ctx, String(v), x + 36, y + 41, 27, vc, 'left', { shadow: 'rgba(0,0,0,.55)', sy: 2 });
      };
      half(X + 6, 'flame', streak ? '#ff9f1c' : '#5d668a', 'Win streak', streak, C.ink);
      ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(X + 155, y + 12, 1, h - 24);
      half(X + 160, 'cup', best ? C.gold : '#5d668a', 'Best streak', best, C.ink);
    });
    row(1.1, () => U.hints(ctx, mode === 'solo' ? [['SPACE', 'Play'], [['←', '→'], 'Computer'], ['B', 'Balls'], ['P', 'Friends']]
                                               : [['P', 'Party'], ['B', 'Balls']], X - 4, 568, { align: 'left' }));
    /* what is fighting behind, on a LIVE tag */
    if (D && D.S) {
      const k = clamp((pnow() - D.born - .3) / .4, 0, 1) * (D.S.over ? clamp(1 - (G.time - D.overAt - 1.4) / .4, 0, 1) : 1);
      if (k > 0) liveTag(ctx, t, BB_BY[D.setup.balls[0]], BB_BY[D.setup.balls[1]], 718, 568, k);
    }
  }
  /* LIVE, and the two balls fighting, each in its own colour */
  function liveTag(ctx, t, a, b, cx, y, k) {
    const na = a.name.toUpperCase(), nb = b.name.toUpperCase(), s = 11;
    const wl = U.capsW(ctx, 'LIVE', 10), wa = U.capsW(ctx, na, s), wv = U.capsW(ctx, 'VS', 9), wb = U.capsW(ctx, nb, s);
    const w = 16 + 12 + wl + 16 + wa + 12 + wv + 12 + wb + 16, h = 28, x0 = cx - w / 2;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.translate(0, (1 - U.eo(k)) * 12);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, x0, y - h / 2 + 3, w, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(8,10,26,.86)'; rr(ctx, x0, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; rr(ctx, x0 + .5, y - h / 2 + .5, w - 1, h - 1, h / 2 - .5); ctx.stroke();
    let x = x0 + 16;
    const blink = .55 + .45 * Math.sin(t * 5);
    ctx.fillStyle = '#ff3b4d'; ctx.shadowColor = '#ff3b4d'; ctx.shadowBlur = 10 * blink;
    ctx.globalAlpha *= .6 + .4 * blink; ctx.beginPath(); ctx.arc(x + 4, y, 4, 0, TAU); ctx.fill();
    ctx.globalAlpha /= .6 + .4 * blink; ctx.shadowBlur = 0;
    x += 12;
    U.caps(ctx, 'LIVE', x, y + .5, 10, '#ff8a96'); x += wl + 16;
    U.caps(ctx, na, x, y + .5, s, mixHex(a.col, '#ffffff', .35)); x += wa + 12;
    U.caps(ctx, 'VS', x, y + .5, 9, C.faint); x += wv + 12;
    U.caps(ctx, nb, x, y + .5, s, mixHex(b.col, '#ffffff', .35));
    ctx.restore();
  }
  /* ---- The Balls ----
     Every ball in a grid, and the one picked out in full beside them: the
     ball on a little stage, its name and kind, what it does and how it
     grows, its numbers coming in a row at a time (each bar filling and its
     number counting up as it lands), and the balls it does best and worst
     against, from the balance table. */
  const COLS = 6;                  // balls across The Balls' grid
  function statsOf(def) {
    const w = def.w, D = BBSim.DMG, win = BBCpu.overall(def.id);
    const reach = { blade: w.len, orb: w.dist + w.or, arc: w.gap + w.th, lance: w.len, bomb: w.rad, flail: w.len + w.hr, saw: w.gap + w.sr * 2, zap: w.range }[w.kind];
    /* the ones whose reach is not a length say what it is instead */
    const word = { bow: 'FAR', laser: 'FAR', star: 'FAR', spell: 'FAR', rang: 'FAR', ghost: 'BODY', body: 'BODY', comet: 'BODY', tail: 'TAIL', fire: 'TRAIL', spines: 'SPRAY' }[w.kind];
    const wf = { FAR: 1, BODY: .12, TAIL: .55, TRAIL: .5, SPRAY: .7 }[word];
    const dmg = Math.max(w.dmg, w.thorn || 0) * D;
    return [
      ['Health', def.hp, def.hp / 120, '#5dff9b'],
      ['Damage', Math.round(dmg), dmg / 32, '#ff7a5c'],
      ['Speed', Math.round(BBSim.SPEED * def.spd), (def.spd - .8) / .4, '#5ee0ff'],
      ['Reach', word || Math.round(reach), word ? wf : reach / 80, '#c38bff'],
      ['Win rate', Math.round(win), win / 100, C.gold, '%']
    ];
  }
  function drawBalls(ctx, t) {
    const t0 = P.subRt;
    ctx.save();
    ctx.fillStyle = 'rgba(7,9,22,.6)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const kh = U.in(t0, 0, .4);
    ctx.save(); ctx.globalAlpha *= kh;
    U.disp(ctx, 'THE BALLS', 40, 46 + (1 - U.eo(kh)) * -20, 44, C.ink, 'left', { shadow: 'rgba(0,0,0,.6)', sy: 3.5 });
    U.ribbon(ctx, 'All ' + BB_BALLS.length + ', all free  ·  each grows stronger its own way', 38, 80, 10.5, '#c9d3f2', 'left', { rule: 14 });
    ctx.restore();
    const TW = 84, TH = 102;
    BB_BALLS.forEach((def, i) => {
      const c = i % COLS, r = (i / COLS) | 0, x = 40 + c * (TW + 8), y = 98 + r * (TH + 8);
      const k = U.in(t0, .06 + (c + r) * .045, .45);
      if (k <= 0) return;
      const b = U.btn('tile:' + i, x, y, TW, TH);
      const sel = U.glide('tsel' + i, i === P.colSel ? 1 : 0, 14);
      const lift = b.h * 4 + sel * 2, sc = U.bo(k) * (1 + b.h * .03);
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 2);
      ctx.translate(x + TW / 2, y + TH / 2 - lift); ctx.scale(sc, sc); ctx.translate(-TW / 2, -TH / 2);
      U.panel(ctx, 0, 0, TW, TH, { r: 10, tint: def.col, tintA: .16 + sel * .14, edge: sel > .5 ? C.gold : b.h > .5 ? 'rgba(255,255,255,.35)' : C.edge, lw: 1 + sel });
      const rg = ctx.createRadialGradient(TW / 2, 40, 3, TW / 2, 40, 46);
      rg.addColorStop(0, mixHex(def.col, '#000000', .1) + '80'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, TW, TH);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(TW / 2, 62, 22, 4.5, 0, 0, TAU); ctx.fill();
      U.disp(ctx, def.name.toUpperCase(), TW / 2, TH - 23, 15.5, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 1.6 });
      U.caps(ctx, BB_CLASSES[def.cls].name, TW / 2, TH - 9, 6.8, BB_CLASSES[def.cls].col, 'center');
      if (sel > .02) {
        /* the picked one wears a gold corner */
        ctx.globalAlpha *= sel;
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(TW - 22, 0); ctx.lineTo(TW - 4, 0); ctx.quadraticCurveTo(TW, 0, TW, 4); ctx.lineTo(TW, 22); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      const tcx = x + TW / 2, tcy = y + TH / 2 - lift;
      PV.push(Object.assign({ id: def.id, x: tcx, y: tcy + (40 - TH / 2) * sc, size: 66 * sc, fit: 36 * sc,
        turn: spin('tile' + i, 1 + b.h * 2.2), roll: spin('tiler' + i, .6), glow: b.h * .15 },
        inBox(tcx - TW * sc / 2, tcy - TH * sc / 2, TW * sc, TH * sc, 10 * sc)));
    });
    /* the one picked out, in full */
    const def = BB_BALLS[P.colSel], t1 = P.colRt, x = 604, y = 24, w = 336, h = 564, cx = x + w / 2;
    const kp = U.eo(U.in(t0, .15, .45));
    ctx.save();
    ctx.globalAlpha *= kp; ctx.translate((1 - kp) * 40, 0);
    U.panel(ctx, x, y, w, h, { tint: def.col, tintA: .14 });
    ctx.restore();
    const k = U.eo(U.in(t1, 0, .35));
    ctx.save();
    ctx.globalAlpha *= k * kp;
    ctx.save(); rr(ctx, x, y, w, h, 12); ctx.clip();
    const rg = ctx.createRadialGradient(cx, 104, 8, cx, 104, 150);
    rg.addColorStop(0, def.col + '70'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x, y, w, 190);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx, 160, 76, 12, 0, 0, TAU); ctx.fill();
    ctx.restore();
    PV.push(Object.assign({ id: def.id, x: cx, y: 104 + (1 - k) * 12, size: 180 * (.9 + .1 * k), fit: 84, alpha: kp,
      turn: spin('big', 1.2), roll: spin('bigr', .5) }, inBox(x, y, w, 182, 12)));
    ctx.translate(0, (1 - k) * 10);
    U.disp(ctx, def.name.toUpperCase(), cx, 206, 42, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 3.5 });
    U.classChip(ctx, def.cls, cx, 236, 'center');
    let ly = 262;
    for (const line of U.wrap(ctx, def.line, 14, w - 44, 600).slice(0, 2)) { U.body(ctx, line, cx, ly, 14, C.ink, 'center', 600); ly += 19; }
    ly += 2;
    ly = U.growNote(ctx, def.grow, cx, ly, 12, w - 50, 2, 16);
    ctx.restore();
    /* its numbers, a row at a time */
    const sy = 338;
    U.ribbon(ctx, 'Stats', cx, sy - 10, 9.5, C.mute, 'center', { alpha: U.eo(U.in(t1, .12, .3)) * kp, rule: 70 });
    statsOf(def).forEach(([label, v, f, col, suf], i) => {
      const kr = U.in(t1, .2 + i * .09, .35), kb = U.in(t1, .28 + i * .09, .6);
      U.statRow(ctx, x + 24, sy + 16 + i * 24, w - 48, label, v, f, col, kr * kp, kb, { suffix: suf });
    });
    /* whom it does best and worst against */
    const vs = BB_BALLS.filter(b => b.id !== def.id).map(b => [b, BBCpu.vs(def.id, b.id)]).sort((a, b) => b[1] - a[1]);
    const strip = (label, list, y0, col, d) => {
      const ks = U.eo(U.in(t1, d, .4)) * kp;
      if (ks <= 0) return;
      ctx.save(); ctx.globalAlpha *= ks; ctx.translate((1 - ks) * 20, 0);
      U.caps(ctx, label, x + 24, y0, 9, C.mute);
      list.forEach(([b, p], j) => {
        const bx = x + 42 + j * 100, by = y0 + 28;
        const dg = ctx.createRadialGradient(bx, by - 4, 2, bx, by, 19);
        dg.addColorStop(0, mixHex(b.col, '#0b0f22', .35)); dg.addColorStop(1, '#070a18');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(bx, by, 19, 0, TAU); ctx.fill();
        ctx.strokeStyle = mixHex(col, '#000000', .3); ctx.lineWidth = 1.5; ctx.stroke();
        PV.push(Object.assign({ id: b.id, x: bx, y: by + 1, size: 44, fit: 17, alpha: ks, turn: spin(label + j, 1.1), roll: spin(label + 'r' + j, .4) }, inDisc(bx, by, 18.5)));
        U.disp(ctx, p + '%', bx + 26, by - 5, 18, col, 'left', { it: false, w: 700, shadow: 'rgba(0,0,0,.55)', sy: 1.5 });
        U.caps(ctx, b.name, bx + 26, by + 10, 8, C.mute, 'left');
      });
      ctx.restore();
    };
    strip('Best against', vs.slice(0, 3), 480, C.good, .75);
    strip('Worst against', vs.slice(-3).reverse(), 534, '#ff7b7b', .85);
    U.button(ctx, 'back', 40, 548, 130, 38, 'BACK', { size: 18 });
    U.hints(ctx, [[['←', '→', '↑', '↓'], 'Browse'], ['ESC', 'Back']], 186, 567, { align: 'left' });
  }

  /* ---- before the first round of an online match, or a replay ---- */
  /* an online match opening: the two players, each on their side's colour,
     and GET READY stamped between */
  function drawStart(ctx, t) {
    if (!NET) return;
    const k = t - P.rt, ke = U.eo(clamp(k / .45, 0, 1));
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,20,' + (.65 * ke).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    for (const side of [0, 1]) {
      const s = side ? OPP : SEAT, col = teamCol(s), dir = side ? 1 : -1, kx = U.eo(clamp((k - .1 - side * .08) / .45, 0, 1));
      const cx = 480 + dir * 190 + (1 - kx) * dir * 300;
      ctx.save(); ctx.globalAlpha *= kx;
      const w = 250, h = 64, x0 = cx - w / 2, y0 = 354;
      U.panel(ctx, x0, y0, w, h, { tint: col, tintA: .22, edge: col });
      U.caps(ctx, s === SEAT ? 'You' : 'Opponent', cx, y0 + 18, 9.5, col, 'center');
      U.disp(ctx, String(nameOf(s)).toUpperCase().slice(0, 16), cx, y0 + 42, 26, C.ink, 'center', { shadow: 'rgba(0,0,0,.55)', sy: 2 });
      ctx.restore();
    }
    U.stamp(ctx, 'GET READY', 480, 270, k - .15, { size: 78, col: '#ffffff', glow: C.gold, stagger: .04 });
    ctx.restore();
  }

  /* ---- pick ----
     Three cards come in face down and turn over one at a time. A reroll
     turns each one away, shows its back, and brings it round with a new
     ball on it. The other side's card stays face down until the VS: all
     this side ever sees is that they have taken one. */
  const CW = 196, CH = 292, CY = 132;
  const cardX = i => 480 - (CW * 3 + 34) / 2 + i * (CW + 17);
  const DEAL = [.7, 1.02, 1.34], TURN = .38;
  /* what card i shows now: its back or a ball, how far round it is turned
     (1 face on, 0 edge on), and whether it can be taken */
  function cardFace(i, t) {
    const offers = M.offers[SEAT] || [];
    const kd = clamp((t - P.rt - DEAL[i]) / TURN, 0, 1);
    if (kd > 0 && !P.flips[i]) { P.flips[i] = 1; snd('bbFlip'); }
    let flip = kd > 0 && kd < 1 ? Math.abs(Math.cos(kd * Math.PI)) : 1, show = kd < .5 ? 'back' : offers[i], live = kd >= 1;
    const kr = clamp((t - P.rerollRt - i * .15) / .6, 0, 1);
    if (kr > 0 && kr < 1) {
      if (!P.rflips[i]) { P.rflips[i] = 1; snd('bbFlip'); }
      flip = Math.abs(Math.cos(kr * Math.PI * 2));
      show = kr < .25 ? (P.oldOffers ? P.oldOffers[i] : offers[i]) : kr < .75 ? 'back' : offers[i];
      live = false;
    }
    return { show, flip, live };
  }
  const dealt = t => t - P.rt > DEAL[2] + TURN && t - P.rerollRt > .6 + 2 * .15 && !P.rerollWait;
  function drawPick(ctx, t) {
    const t0 = P.rt, left = Math.max(0, M.deadline - G.time);
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,20,.62)'; ctx.fillRect(0, 0, W, H);
    const lg = ctx.createRadialGradient(480, 280, 40, 480, 280, 420);
    lg.addColorStop(0, 'rgba(90,110,255,.12)'); lg.addColorStop(1, 'rgba(90,110,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    /* the heading */
    const kh = U.in(t0, 0, .45);
    ctx.save(); ctx.globalAlpha *= kh; ctx.translate(0, (1 - U.eo(kh)) * -24);
    U.caps(ctx, 'Round ' + M.round, 480, 26, 10.5, C.gold, 'center');
    U.disp(ctx, P.myPick ? 'READY' : 'PICK YOUR BALL', 480, 58, 42, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 3.5 });
    U.timer(ctx, 380, 86, 200, left / PICK_T, left);
    ctx.restore();
    if (left <= 3.2 && Math.ceil(left) !== P.lastTick && left > 0) { P.lastTick = Math.ceil(left); snd('bbTick', left < 1); }
    /* the cards */
    const offers = M.offers[SEAT] || [];
    const picked = P.myPick ? offers.indexOf(P.myPick) : -1;
    for (let i = 0; i < 3; i++) {
      if (!offers[i]) continue;
      const kin = U.in(t0, .08 + i * .08, .5);
      if (kin <= 0) continue;
      const f = cardFace(i, t);
      let x = cardX(i), y = CY + (1 - U.bo(kin)) * 110, sc = 1, a = Math.min(1, kin * 2.5), rot = (1 - U.eo(kin)) * (i - 1) * .25;
      if (picked >= 0) {
        const kp = U.eio(clamp((t - P.pickRt) / .5, 0, 1));
        if (i === picked) {
          /* the one taken flies to your corner */
          const pop = 1 + Math.sin(clamp((t - P.pickRt) / .18, 0, 1) * Math.PI) * .07;
          x = lerp(x, 18, kp); y = lerp(y, 200, kp); sc = lerp(1, 140 / CW, kp) * pop;
        } else {
          const kd = clamp((t - P.pickRt) / .45, 0, 1);
          y += kd * kd * 260; rot = (i < picked ? -1 : 1) * kd * .3; a *= 1 - kd;
        }
      }
      if (a <= 0) continue;
      drawCard(ctx, 'card:' + i, f.show, x, y, sc, f.flip, a, rot, f.live && !P.myPick && dealt(t), i === P.sel && !P.myPick && f.live, t, i);
    }
    /* the reroll */
    const rrLeft = HOSTS ? M.rerolls[SEAT] : 1 - P.myRerolls;
    const kr = U.in(t0, DEAL[2] + .2, .45) * (P.myPick ? 1 - clamp((t - P.pickRt) / .3, 0, 1) : 1);
    if (kr > 0) U.button(ctx, 'reroll', 400, 446, 160, 46, 'REROLL', { alpha: kr, live: !P.myPick && rrLeft > 0 && dealt(t), sub: rrLeft > 0 ? rrLeft + ' left this match' : 'used', size: 22,
      icon: (c, x2, y2, ink) => U.dice(c, x2, y2, 16, ink) });
    /* each side's corner */
    pickCorner(ctx, t, SEAT, 0);
    pickCorner(ctx, t, OPP, 1);
    const kk = U.in(t0, DEAL[2] + .4, .5);
    if (!P.myPick) U.hints(ctx, [[['←', '→'], 'Choose'], ['SPACE', 'Take it'], ['R', 'Reroll']], 480, 524, { alpha: kk });
    else if (!M.picks[OPP]) U.pill(ctx, 'Waiting for ' + (NET ? nameOf(OPP) : 'the computer'), 480, 524, { spin: C.gold, alpha: U.eo(clamp((t - P.pickRt - .4) / .3, 0, 1)) });
  }
  /* A card's back: navy, a gold lattice and border, and the game's mark. */
  function cardBack(ctx, w, h, t, edge) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2a2f70'); g.addColorStop(1, '#0c0f2c');
    ctx.fillStyle = g; rr(ctx, 0, 0, w, h, 16); ctx.fill();
    ctx.save();
    rr(ctx, 0, 0, w, h, 16); ctx.clip();
    ctx.strokeStyle = 'rgba(255,207,74,.08)'; ctx.lineWidth = 1;
    for (let k = -h; k < w + h; k += 16) {
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k, h); ctx.lineTo(k + h, 0); ctx.stroke();
    }
    const rg = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * .62);
    rg.addColorStop(0, 'rgba(255,207,74,.22)'); rg.addColorStop(1, 'rgba(255,207,74,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    const sx = ((t * .45) % 1.6) * (w + 180) - 140;
    const sh = ctx.createLinearGradient(sx, 0, sx + 90, h * .4);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.07)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const s = w / CW;
    ctx.lineWidth = 2; ctx.strokeStyle = edge || 'rgba(255,207,74,.75)'; rr(ctx, 7 * s, 7 * s, w - 14 * s, h - 14 * s, 12); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,207,74,.25)'; rr(ctx, 12 * s, 12 * s, w - 24 * s, h - 24 * s, 10); ctx.stroke();
    /* the mark: a ball with its band, and a spark off it */
    const cx = w / 2, cy = h / 2 - 8 * s, R = 30 * s;
    ctx.save();
    ctx.shadowColor = 'rgba(255,207,74,.6)'; ctx.shadowBlur = 14 * s;
    ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * .3, -.4, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffcf4a';
    ctx.beginPath(); ctx.moveTo(cx + R * .9, cy - R * 1.05); ctx.lineTo(cx + R * 1.12, cy - R * .78); ctx.lineTo(cx + R * 1.5, cy - R * .92);
    ctx.lineTo(cx + R * 1.16, cy - R * .6); ctx.lineTo(cx + R * 1.3, cy - R * .2); ctx.lineTo(cx + R * .98, cy - R * .52); ctx.closePath(); ctx.fill();
    ctx.restore();
    U.caps(ctx, 'Ball brawl', cx, cy + R + 26 * s, 9 * s, 'rgba(255,207,74,.75)', 'center', { track: .3 });
  }
  function drawCard(ctx, key, id, x, y, sc, flip, a, rot, live, sel, t, i) {
    const def = id === 'back' ? null : BB_BY[id];
    if (id !== 'back' && !def) return;
    const b = live ? U.btn(key, x, y, CW, CH) : { h: 0, p: 0 };
    const hv = Math.max(b.h, sel ? .7 : 0);
    const lift = hv * 10;
    const sx = sc * flip * (1 + hv * .03), sy = sc * (1 + hv * .03) * (1 + b.p * .04);
    const cx = x + CW * sc / 2, cy = y + CH * sc / 2 - lift;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-CW / 2, -CH / 2);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, 4, 10 + lift * .6, CW, CH, 16); ctx.fill();
    if (!def) { cardBack(ctx, CW, CH, t); ctx.restore(); return; }
    const g = ctx.createLinearGradient(0, 0, 0, CH);
    g.addColorStop(0, mixHex(def.col, '#0b0f22', .35)); g.addColorStop(.52, mixHex(def.col, '#0b0f22', .78)); g.addColorStop(1, '#0b0f22');
    ctx.fillStyle = g; rr(ctx, 0, 0, CW, CH, 16); ctx.fill();
    U.texture(ctx, 'grid', .06, () => rr(ctx, 0, 0, CW, CH, 16), 0, 0, CW, CH);
    U.texture(ctx, 'hatch', .05, () => rr(ctx, 0, CH * .58, CW, CH * .42, 16), 0, CH * .58, CW, CH * .42);
    const rg = ctx.createRadialGradient(CW / 2, 96, 6, CW / 2, 96, 110);
    rg.addColorStop(0, 'rgba(255,255,255,' + (.2 + hv * .12).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; rr(ctx, 0, 0, CW, CH, 16); ctx.fill();
    /* a sheen that runs across when it is pointed at */
    if (hv > .05) {
      ctx.save(); rr(ctx, 0, 0, CW, CH, 16); ctx.clip();
      const shx = ((t * .6) % 1.6) * (CW + 160) - 120;
      const sh = ctx.createLinearGradient(shx, 0, shx + 90, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,' + (.12 * hv).toFixed(3) + ')'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh; ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = sel ? C.gold : hv > .3 ? mixHex(def.col, '#ffffff', .5) : 'rgba(255,255,255,.14)';
    rr(ctx, 1, 1, CW - 2, CH - 2, 15); ctx.stroke();
    U.classChip(ctx, def.cls, 12, 20, 'left');
    U.disp(ctx, def.name.toUpperCase(), CW / 2, 190, 34, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 3 });
    let ly = 222;
    for (const line of U.wrap(ctx, def.line, 13.5, CW - 26, 600).slice(0, 2)) { U.body(ctx, line, CW / 2, ly, 13.5, C.ink, 'center', 600); ly += 18; }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(18, CH - 44, CW - 36, 1);
    let gy = CH - 30;
    U.growNote(ctx, def.grow, CW / 2, gy, 10.5, CW - 24, 2, 14);
    ctx.restore();
    /* the ball in it: the card's own turn, lift and flip, worked out by hand
       for the point 96 down its middle, and held inside the card */
    const Y = (96 - CH / 2) * sy;
    const ex = (Math.abs(Math.cos(rot)) * CW * Math.abs(sx) + Math.abs(Math.sin(rot)) * CH * sy) / 2;
    const ey = (Math.abs(Math.sin(rot)) * CW * Math.abs(sx) + Math.abs(Math.cos(rot)) * CH * sy) / 2;
    PV.push({ id, x: cx - Y * Math.sin(rot), y: cy + Y * Math.cos(rot), size: 150 * sc, fit: 86 * sc, flip, alpha: a, glow: hv * .12,
      turn: spin('card' + (i === undefined ? key : i), 1.2 + hv * 2.6), roll: spin('cardr' + (i === undefined ? key : i), .5),
      clip: c => { c.translate(cx, cy); c.rotate(rot); c.scale(Math.max(.001, sx), sy); rr(c, -CW / 2, -CH / 2, CW, CH, 16); }, bb: [cx - ex, cy - ey, ex * 2, ey * 2] });
  }
  /* A side's corner of the pick: a plate with whose side it is and its
     hearts, and under it that side's card. Yours is an empty slot until you
     take one (the card flies into it); theirs is face down, and when they
     take one it jumps and says READY, and nothing more. */
  function pickCorner(ctx, t, s, side) {
    const w = 148, x = side ? W - 14 - w : 14, y = 116, col = teamCol(s), mid = x + w / 2;
    const k = U.in(P.rt, .3 + side * .1, .5);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2); ctx.translate((1 - U.eo(k)) * (side ? 70 : -70), 0);
    U.panel(ctx, x, y, w, 72, { tint: col, tintA: .2, edge: mixHex(col, '#0b0f22', .45) });
    const tag = NET ? (s === SEAT ? 'You' : 'Opponent') : (s === SEAT ? 'Player' : 'Computer · ' + level());
    const name = NET ? nameOf(s) : (s === SEAT ? 'You' : 'Computer');
    U.caps(ctx, tag, mid, y + 16, 9, col, 'center');
    U.disp(ctx, String(name).toUpperCase().slice(0, 14), mid, y + 36, 20, C.ink, 'center', { shadow: 'rgba(0,0,0,.55)', sy: 2 });
    U.hearts(ctx, mid - 15.3, y + 58, 3, P.hearts[s], P.brk[s], 13, 'left');
    const cw = 140, ch = 208, cy = 304;
    if (s !== SEAT) {
      const ready = !!M.picks[s];
      if (ready && !P.oppReady) { P.oppReady = true; P.oppRt = t; snd('bbLock'); }
      const kj = P.oppReady ? clamp((t - P.oppRt) / .45, 0, 1) : 0;
      const hop = Math.sin(kj * Math.PI) * 14, sq = 1 + Math.sin(kj * Math.PI * 2) * .05 * (1 - kj);
      ctx.save(); ctx.translate(mid, cy - hop); ctx.scale(1 / sq, sq); ctx.translate(-cw / 2, -ch / 2);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, 3, 8 + hop * .4, cw, ch, 12); ctx.fill();
      cardBack(ctx, cw, ch, t + 1.3, ready ? 'rgba(93,255,155,.85)' : 'rgba(255,77,109,.6)');
      ctx.restore();
      /* well inside the card's own border, never on it */
      if (ready) {
        const kb = U.bo(clamp((t - P.oppRt) / .35, 0, 1));
        ctx.save(); ctx.translate(mid, cy + ch / 2 - 40 - hop); ctx.scale(kb, kb);
        U.pill(ctx, 'Ready', 0, 0, { grad: ['#2fc26e', '#15784a'], edge: 'rgba(210,255,228,.7)', check: true, size: 11, h: 28 });
        ctx.restore();
      } else U.pill(ctx, 'Picking', mid, cy + ch / 2 - 40, { spin: '#ff8a96', size: 10 });
    } else if (!P.myPick) {
      /* your slot, waiting for a card */
      ctx.save();
      ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 12;
      ctx.strokeStyle = 'rgba(57,200,255,.35)'; ctx.lineWidth = 1.5; rr(ctx, mid - cw / 2, cy - ch / 2, cw, ch, 12); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(57,200,255,.05)'; rr(ctx, mid - cw / 2, cy - ch / 2, cw, ch, 12); ctx.fill();
      ctx.restore();
      U.pill(ctx, 'Choosing', mid, cy, { spin: C.me, size: 10 });
    }
    ctx.restore();
  }

  /* ---- vs ---- */
  function drawVs(ctx, t) {
    const k = t - P.rt;
    const kin = U.eo(clamp(k / .5, 0, 1)), kout = U.eio(clamp((k - VS_T + .45) / .45, 0, 1));
    ctx.save();
    ctx.globalAlpha *= 1 - kout;
    ctx.fillStyle = 'rgba(6,8,20,' + (.7 * kin).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    /* the two sides' colours, sweeping in from their edges */
    for (const side of [0, 1]) {
      const s = side ? OPP : SEAT, col = teamCol(s), dir = side ? 1 : -1;
      const off = (1 - kin) * 520 * dir;
      ctx.save();
      ctx.translate(off, 0);
      ctx.beginPath();
      if (!side) { ctx.moveTo(0, 0); ctx.lineTo(520, 0); ctx.lineTo(440, H); ctx.lineTo(0, H); }
      else { ctx.moveTo(W, 0); ctx.lineTo(520, 0); ctx.lineTo(440, H); ctx.lineTo(W, H); }
      ctx.closePath();
      const g = ctx.createLinearGradient(side ? W : 0, 0, 480, 0);
      g.addColorStop(0, col + '55'); g.addColorStop(1, col + '08');
      ctx.fillStyle = g; ctx.fill();
      /* the band's own hatching, the way a poster would have it */
      ctx.save(); ctx.clip(); ctx.globalAlpha *= .1; ctx.fillStyle = 'rgba(255,255,255,1)';
      U.texture(ctx, 'hatch', 1, () => ctx.rect(0, 0, W, H), 0, 0, W, H);
      ctx.restore();
      ctx.restore();
      const id = M.picks[s];
      if (!id) continue;
      const def = BB_BY[id], cx = side ? 720 : 240, cy = 270;
      const kb = U.eo(clamp((k - .08 - side * .1) / .55, 0, 1));
      const bx = cx + (1 - kb) * 420 * dir;
      PV.push({ id, x: bx, y: cy, size: 330 * (.8 + .2 * kb), turn: spin('vs' + side, 1.4 * (side ? -1 : 1)), roll: spin('vsr' + side, .6), alpha: 1 - kout });
      const kn = U.eo(clamp((k - .35 - side * .1) / .4, 0, 1));
      ctx.save(); ctx.globalAlpha *= kn; ctx.translate((1 - kn) * 60 * dir, 0);
      U.pill(ctx, s === SEAT ? 'You' : nameOf(s), cx, 420, { col: '#ffffff', fill: mixHex(col, '#000000', .5), edge: col, size: 11 });
      U.disp(ctx, def.name.toUpperCase(), cx, 456, 56, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 4, glow: 'rgba(0,0,0,.6)', blur: 18 });
      U.classChip(ctx, def.cls, cx, 494, 'center');
      ctx.restore();
    }
    ctx.restore();
    /* VS comes down between them */
    const kv = k - .42;
    if (kv > 0 && kout < 1) {
      const s = kv < .22 ? 3 - 2 * U.eo(kv / .22) : 1 + Math.sin(Math.min(1, (kv - .22) / .3) * Math.PI) * .06;
      ctx.save(); ctx.globalAlpha *= (1 - kout) * Math.min(1, kv * 6);
      ctx.translate(480, 272); ctx.scale(s, s); ctx.rotate(-.08);
      U.disp(ctx, 'VS', 0, 0, 120, '#ffffff', 'center', { stroke: '#070916', lw: 14, glow: C.gold, blur: 40, shadow: 'rgba(0,0,0,.5)', sy: 8 });
      ctx.restore();
      if (kv < .5) {
        ctx.save(); ctx.globalAlpha *= (1 - kv / .5) * .8;
        ctx.strokeStyle = C.gold; ctx.lineWidth = 8 * (1 - kv / .5) + 1;
        ctx.beginPath(); ctx.ellipse(480, 272, 60 + kv * 520, 40 + kv * 300, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ---- the heads-up display ----
     Each side: its ball in a ringed medallion at the outside, a long health
     bar running in toward the middle with the ball's name over it, the
     hearts under it, and a plate at its inner end saying what the ball has
     grown into. In the middle, the round and the clock on a badge that
     turns orange as the walls close and red at sudden death, with a pip
     for every round so far. */
  function readout(s) {
    const S = F ? F.S : staged(), b = S.b[s], w = b.def.w, g = (v, a, z) => (v - a) / Math.max(1e-6, z - a);
    switch (b.def.id) {
      case 'sword': return ['Blade', Math.round(b.len), g(b.len, w.len, w.max)];
      case 'daggers': return ['Spin', 'x' + (b.spin / w.spin).toFixed(1), g(b.spin, w.spin, w.max)];
      case 'axe': { const r = 1 + w.rage * (1 - Math.max(0, b.hp) / b.max); return ['Rage', 'x' + r.toFixed(1), g(r, 1, 1 + w.rage)]; }
      case 'bow': { const n = Math.min(w.max, 1 + Math.floor(b.shotHits / w.per)); return ['Arrows', n, g(n, 1, w.max)]; }
      case 'shield': return ['Guard', Math.round(b.hw * 2 * 180 / Math.PI) + '°', g(b.hw, w.hw, w.max)];
      case 'spear': return ['Lance', Math.round(b.len), g(b.len, w.len, w.max)];
      case 'bomber': return ['Blast', Math.round(b.brad), g(b.brad, w.rad, w.max)];
      case 'snake': return ['Tail', b.tailN, g(b.tailN, w.n, w.max)];
      case 'vampire': { const k = w.drain + w.thirst * (1 - Math.max(0, b.hp) / b.max); return ['Leech', Math.round(k * 100) + '%', g(k, w.drain, w.drain + w.thirst)]; }
      case 'frost': { const n = S.b[1 - s].slow || 0; return ['Chill', n + '/' + w.stacks, n / w.stacks]; }
      case 'ghost': return b.ghost === 1 ? ['Faded', '', 1] : b.ghost === 2 ? ['Charged', '!', 1] : ['Fade', b.fade.toFixed(1) + 's', g(b.fade, w.fade, w.max)];
      case 'giant': return ['Size', Math.round(b.r), g(b.r, b.def.r, w.max)];
      case 'hammer': return ['Weight', 'x' + (b.ldmg / w.dmg).toFixed(1), g(b.ldmg, w.dmg, w.heavyMax)];
      case 'flail': return ['Chain', Math.round(b.len), g(b.len, w.len, w.max)];
      case 'boomerang': return ['Blow', Math.round(b.sdmg * BBSim.DMG), g(b.sdmg, w.dmg, w.max)];
      case 'laser': { const c = b.lchg * BBSim.T; return ['Charge', c.toFixed(1) + 's', g(w.charge - c, 0, w.charge - w.min)]; }
      case 'ninja': { const n = Math.min(w.max, w.bounce + Math.floor(b.shotHits / w.per)); return ['Bounces', n, g(n, w.bounce, w.max)]; }
      case 'wizard': return ['Spell', Math.round(b.sdmg * BBSim.DMG), g(b.sdmg, w.dmg, w.max)];
      case 'blaze': return ['Flames', b.life.toFixed(1) + 's', g(b.life, w.life, w.max)];
      case 'tesla': return ['Reach', Math.round(b.range), g(b.range, w.range, w.max)];
      case 'cactus': return ['Needles', b.nn, g(b.nn, w.n, w.max)];
      case 'comet': return ['Speed', 'x' + b.mult.toFixed(1), g(b.mult, 1, w.max)];
      case 'saw': return ['Saw', Math.round(b.sr * 2), g(b.sr, w.sr, w.max)];
      case 'katana': return ['Dash', b.dashEvery.toFixed(1) + 's', g(w.dash.every - b.dashEvery, 0, w.dash.every - w.dash.min)];
    }
    return ['', '', 0];
  }
  function drawHud(ctx, t, k) {
    if (k <= 0) return;
    const S = F ? F.S : staged();
    ctx.save();
    const sh = ctx.createLinearGradient(0, 0, 0, 140);
    sh.addColorStop(0, 'rgba(3,5,14,.85)'); sh.addColorStop(.55, 'rgba(3,5,14,.4)'); sh.addColorStop(1, 'rgba(3,5,14,0)');
    ctx.globalAlpha *= k; ctx.fillStyle = sh; ctx.fillRect(0, 0, W, 140);
    ctx.restore();
    hudSide(ctx, t, S, SEAT, false, U.eo(clamp(k * 1.15, 0, 1)));
    hudSide(ctx, t, S, OPP, true, U.eo(clamp(k * 1.15 - .1, 0, 1)));
    hudMiddle(ctx, t, U.eo(clamp(k * 1.2 - .18, 0, 1)));
  }
  function hudSide(ctx, t, S, s, right, k) {
    if (k <= 0) return;
    const b = S.b[s], def = b.def, col = teamCol(s), frac = Math.max(0, b.hp) / b.max;
    const lk = V ? V.look[s] : null, fl = lk ? lk.flash : 0, out = !!(lk && lk.gone);
    const dy = (1 - k) * -130;
    const mr = 38, mx = right ? W - 20 - mr : 20 + mr, my = 58 + dy;
    const bw = 292, bh = 26, bx = right ? mx - mr - 16 - bw : mx + mr + 16, by = 44 + dy;
    const al = right ? 'right' : 'left', outer = right ? bx + bw : bx, inner = right ? bx : bx + bw;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    /* the portrait */
    U.medal(ctx, mx, my, mr, col, def.col, frac);
    /* the ball fills the medallion; its weapon is cut off at the rim */
    if (!out) PV.push(Object.assign({ id: def.id, x: mx, y: my + 4, size: 118, glow: fl * .6,
      turn: spin('hud' + s, 1.1), roll: spin('hudr' + s, .45) }, inDisc(mx, my, mr - .5)));
    OVER.push(() => U.medalGlass(ctx, mx, my, mr, fl, out));
    /* the name, and whose it is */
    U.disp(ctx, def.name.toUpperCase(), right ? outer - 4 : outer + 4, by - 15, 27, C.ink, al, { shadow: 'rgba(0,0,0,.6)', sy: 2.5 });
    const tag = s === SEAT ? 'You' : nameOf(s), tw = U.capsW(ctx, tag, 9.5) + 18;
    const tx = right ? inner + 14 : inner - 14 - tw;
    ctx.fillStyle = mixHex(col, '#000000', .55); rr(ctx, tx, by - 24, tw, 17, 8.5); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1; rr(ctx, tx + .5, by - 23.5, tw - 1, 16, 8); ctx.stroke();
    U.caps(ctx, tag, tx + tw / 2, by - 15.5, 9.5, '#ffffff', 'center');
    /* the health */
    U.hudBar(ctx, 'bar' + s, bx, by, bw, bh, frac, col, right, Math.max(0, Math.ceil(b.hp)));
    /* the hearts, and what it has grown into */
    U.hearts(ctx, right ? outer - 10 : outer + 10, by + bh + 18, 3, P.hearts[s], P.brk[s], 17, al);
    const R = readout(s), sw = 124;
    if (R[0]) U.growth(ctx, 'grow' + s, right ? inner + 10 : inner - 10 - sw, by + bh + 7, sw, R[0], R[1], R[2], right, col);
    ctx.restore();
  }
  function hudMiddle(ctx, t, k) {
    if (k <= 0) return;
    const secs = F ? F.S.tick * BBSim.T : 0, over = secs > BBSim.SHRINK_AT, sd = secs > BBSim.POISON_AT;
    const warn = sd ? '#ff4a4a' : over ? '#ffa23a' : null, pulse = .5 + .5 * Math.sin(t * (sd ? 9 : 6));
    const y = 12 + (1 - k) * -100, cx = 480;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    U.plate(ctx, cx, y, 132, 60, warn, pulse);
    if (P.ph === 'aim') {
      /* before the fight the badge counts down the aim instead */
      const left = Math.max(0, M.deadline - G.time), hot = left <= 3.2 && !P.aimLocked;
      U.caps(ctx, P.aimLocked ? 'Locked in' : 'Aim', cx, y + 14, 9, P.aimLocked ? C.gold : C.mute, 'center');
      const sc = hot ? 1 + (1 - (left % 1)) * .2 : 1;
      ctx.save(); ctx.translate(cx, y + 38); ctx.scale(sc, sc);
      U.disp(ctx, String(Math.ceil(left)), 0, 0, 31, hot ? '#ff8a6a' : C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 2.5 });
      ctx.restore();
      const f = clamp(left / AIM_T, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, cx - 44, y + 52, 88, 4, 2); ctx.fill();
      ctx.fillStyle = hot ? '#ff6a4a' : C.gold; rr(ctx, cx - 44 * f, y + 52, Math.max(4, 88 * f), 4, 2); ctx.fill();
    } else {
      U.caps(ctx, 'Round ' + Math.max(1, M.round), cx, y + 14, 9, warn || C.mute, 'center');
      const mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
      U.disp(ctx, mm + ':' + (ss < 10 ? '0' : '') + ss, cx, y + 38, 31, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 2.5 });
    }
    /* a pip for each round: won, lost, drawn, now, and to come */
    const n = 5, gap = 17, px0 = cx - (n - 1) * gap / 2, py = y + 74;
    for (let i = 0; i < n; i++) {
      const px = px0 + i * gap, w = P.wins[i];
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4);
      if (w !== undefined) {
        ctx.fillStyle = w === SEAT ? C.me : w === OPP ? C.them : C.gold;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.fillRect(-4.5, -4.5, 9, 9);
      } else {
        const now = i === P.wins.length;
        ctx.strokeStyle = now ? 'rgba(255,255,255,' + (.5 + .4 * Math.sin(t * 5)).toFixed(3) + ')' : 'rgba(255,255,255,.2)';
        ctx.lineWidth = 1.5; ctx.strokeRect(-4, -4, 8, 8);
      }
      ctx.restore();
    }
    if (warn) {
      const lab = sd ? 'Sudden death' : 'Walls closing', lw = U.capsW(ctx, lab, 10) + 30;
      ctx.save(); ctx.globalAlpha *= .6 + .4 * pulse;
      ctx.fillStyle = mixHex(warn, '#000000', .55); rr(ctx, cx - lw / 2, py + 12, lw, 20, 10); ctx.fill();
      ctx.strokeStyle = warn; ctx.lineWidth = 1; rr(ctx, cx - lw / 2 + .5, py + 12.5, lw - 1, 19, 9.5); ctx.stroke();
      U.caps(ctx, lab, cx, py + 22.5, 10, '#ffffff', 'center');
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---- aim ---- */
  function drawAim(ctx, t) {
    const left = Math.max(0, M.deadline - G.time), k = U.in(P.rt, .5, .45);
    /* what to do, on a plate along the bottom (the countdown is in the
       badge at the top) */
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - U.eo(k)) * 40);
    if (!P.aimLocked) {
      U.disp(ctx, 'AIM YOUR BALL', 480, 530, 30, C.ink, 'center', { shadow: 'rgba(0,0,0,.65)', sy: 3, glow: 'rgba(0,0,0,.6)', blur: 14 });
      U.hints(ctx, [['CLICK', 'Where it goes'], [['←', '→'], 'Turn'], ['SPACE', 'Lock in']], 480, 566);
    } else {
      U.disp(ctx, 'LOCKED IN', 480, 530, 30, C.gold, 'center', { shadow: 'rgba(0,0,0,.65)', sy: 3, glow: 'rgba(255,207,74,.55)', blur: 16 });
      if (M.aims[OPP] === null) U.pill(ctx, 'Waiting for ' + (NET ? nameOf(OPP) : 'the computer') + ' to aim', 480, 566, { spin: C.gold });
      else U.pill(ctx, 'Both locked in', 480, 566, { dot: C.good });
    }
    ctx.restore();
    if (left <= 3.2 && Math.ceil(left) !== P.lastTick && left > 0 && !P.aimLocked) { P.lastTick = Math.ceil(left); snd('bbTick', left < 1); }
    /* over each ball, whether it is ready */
    const S = staged();
    for (const s of [SEAT, OPP]) {
      const b = S.b[s], p = V.toScreen(b.x, b.y, 90), ready = s === SEAT ? P.aimLocked : M.aims[s] !== null;
      const kb = U.glide('ready' + s, ready ? 1 : 0, 10);
      const lab = ready ? 'READY' : s === SEAT ? 'YOU' : 'AIMING';
      const wdt = U.capsW(ctx, lab, 10) + 22;
      ctx.save(); ctx.globalAlpha *= k;
      ctx.translate(p.x, p.y - 8 - Math.sin(t * 3 + s) * 2);
      ctx.scale(1 + kb * .08 * Math.sin(Math.min(1, kb) * Math.PI), 1);
      ctx.fillStyle = ready ? 'rgba(255,207,74,.95)' : 'rgba(8,10,26,.85)'; rr(ctx, -wdt / 2, -11, wdt, 22, 11); ctx.fill();
      ctx.strokeStyle = teamCol(s); ctx.lineWidth = 1.5; rr(ctx, -wdt / 2 + .75, -10.25, wdt - 1.5, 20.5, 10.25); ctx.stroke();
      U.caps(ctx, lab, 0, .5, 10, ready ? '#26160a' : C.ink, 'center');
      ctx.restore();
    }
  }

  /* ---- the fight ---- */
  function drawFight(ctx, t) {
    if (!F) return;
    if (F.stage === 'go') {
      const k = t - F.rt;
      U.stamp(ctx, 'FIGHT!', 480, 300, k, { size: 120, col: '#ffffff', glow: C.gold, out: 1 - clamp((k - GO_T + .25) / .25, 0, 1) });
    }
    if (F.stage === 'run' && SOLO && P.hintFast > 0) {
      const k = clamp((t - F.rt - 1) / .5, 0, 1) * clamp(1 - (t - F.rt - 7) / .5, 0, 1);
      if (k > 0) U.hints(ctx, [['SPACE', 'Hold to speed up']], 480, 574, { alpha: k });
    }
    /* sped up: a gold tag with the speed, and the key lit */
    const kf = U.glide('ffw', F.stage === 'run' && F.rate > 2.5 ? 1 : 0, 12);
    if (kf > .01) {
      ctx.save(); ctx.globalAlpha *= kf; ctx.translate(0, (1 - kf) * 16);
      U.hints(ctx, [['SPACE', 'Speed x3']], 480, 574, { glow: true, col: C.gold });
      ctx.restore();
    }
    if (F.stage === 'ko' || F.stage === 'round' || F.stage === 'done') {
      const k = (F.stage === 'ko' ? t - F.rt : 99);
      const word = F.winner === 2 ? 'DRAW!' : 'K.O.!';
      const out = F.stage === 'ko' ? 1 : 1 - clamp((t - F.rt) / .3, 0, 1);
      if (out > 0) U.stamp(ctx, word, 480, 270, k === 99 ? 9 : k - .15, { size: 130, col: F.winner === SEAT ? '#ffffff' : F.winner === 2 ? '#ffffff' : '#ffe3e8', glow: F.winner === SEAT ? C.me : F.winner === 2 ? C.gold : C.them, out });
    }
    if (F.stage === 'round' || (F.stage === 'done' && P.ph === 'wait')) {
      /* the banner comes in once the K.O. has gone */
      const k = (F.stage === 'round' ? t - F.rt : ROUND_T + (t - P.waitRt)) - .22;
      const won = F.winner === SEAT, draw = F.winner === 2;
      if (k < ROUND_T + .1) U.banner(ctx, 300, 120, k, ROUND_T + .1, draw ? C.gold : won ? C.me : C.them, c => {
        U.caps(c, 'Round ' + F.round, 480, 270, 11, C.mute, 'center');
        U.disp(c, draw ? 'NO HEART LOST' : won ? 'ROUND WON' : 'ROUND LOST', 480, 308, 52, draw ? C.gold : won ? '#ffffff' : '#ffd6dc', 'center', { shadow: 'rgba(0,0,0,.6)', sy: 4, glow: draw ? C.gold : won ? C.me : C.them, blur: 26 });
      });
    }
    if (P.ph === 'wait' && NET) {
      const k = clamp((t - P.waitRt - .6) / .4, 0, 1);
      if (k > 0) U.pill(ctx, 'Waiting for ' + nameOf(OPP), 480, 574, { spin: C.gold, alpha: k });
    }
  }
  function drawEnd(ctx, t) {
    const k = t - P.rt, r = P.endRes || {};
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,20,' + (clamp(k / .6, 0, 1) * .45).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    U.stamp(ctx, r.win ? 'VICTORY' : 'DEFEAT', 480, 262, k - .1, { size: 124, col: r.win ? '#fff4c2' : '#e8e8f0', glow: r.win ? C.gold : '#ff4d6d', stagger: .06 });
    /* the final score on a board of its own: each side's hearts at its end,
       in its colour, and the rounds between them */
    const ks = U.eo(clamp((k - .8) / .4, 0, 1));
    if (ks > 0) {
      const w = 440, h = 70, x0 = 480 - w / 2, y0 = 338;
      ctx.save(); ctx.globalAlpha *= ks; ctx.translate(0, (1 - ks) * 18);
      U.panel(ctx, x0, y0, w, h, { r: 14 });
      const lg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      lg.addColorStop(0, C.me + '44'); lg.addColorStop(.42, 'rgba(0,0,0,0)'); lg.addColorStop(.58, 'rgba(0,0,0,0)'); lg.addColorStop(1, C.them + '44');
      ctx.fillStyle = lg; rr(ctx, x0, y0, w, h, 14); ctx.fill();
      for (const [s, cx, al] of [[SEAT, x0 + 78, 'left'], [OPP, x0 + w - 78, 'right']]) {
        U.caps(ctx, s === SEAT ? 'You' : (NET ? nameOf(s) : 'Computer'), cx, y0 + 20, 9.5, teamCol(s), 'center');
        U.hearts(ctx, al === 'left' ? cx - 23.6 : cx + 23.6, y0 + 46, 3, P.hearts[s], P.brk[s], 20, al);
      }
      U.disp(ctx, (3 - P.hearts[OPP]) + ' – ' + (3 - P.hearts[SEAT]), 480, y0 + h / 2 + 1, 40, C.ink, 'center', { shadow: 'rgba(0,0,0,.6)', sy: 3 });
      ctx.restore();
    }
  }
  function drawNoGL(ctx) {
    ctx.fillStyle = '#0b0e1d'; ctx.fillRect(0, 0, W, H);
    U.disp(ctx, 'BALL BRAWL', 480, 260, 64, C.ink, 'center');
    U.body(ctx, 'This game needs WebGL 2, which this browser does not have switched on.', 480, 320, 15, C.mute, 'center');
  }

  /* ================================================================ run */
  function update() {
    G.time += STEP; G.ups++;
    if (gone) return;
    if (P.ph === 'menu') {
      if (!FK.on) { P.ph = 'start'; P.rt = pnow(); P.startAt = G.time; P.fromMenu = true; }
      else { menuInput(); demoStep(); return; }
    }
    if (P.ph === 'start') {
      if (HOSTS && M.ph === 'none' && G.time - P.startAt >= (NET ? 1.2 : .35)) startRound();
    }
    if (HOSTS) hostStep(); else guestStep();
    if (gone) return;
    follow();
    if (P.ph === 'pick') pickInput();
    else if (P.ph === 'aim') aimInput();
    else clicks(() => {});
    if (F) fightStep(F);
    if (P.ph === 'end' && G.time - P.endGt >= END_T) {
      gone = true;
      host.end({ win: P.endRes.win, mine: P.endRes.mine, theirs: P.endRes.theirs, rounds: M.wins.slice(), picks: [M.picks[SEAT], M.picks[OPP]],
                 dealt: P.dealt || 0, big: P.big || 0, online: !!NET, them: nameOf(OPP) });
    }
  }
  function escape() {
    if (P.ph === 'menu') {
      if (P.sub === 'balls') { toHome(); return true; }
      return FK.escape();
    }
    return false;
  }
  if (P.ph === 'start') P.startAt = 0;
  return {
    update, render, escape, U, P, V,
    get ph() { return P.ph; }, get M() { return M; }, get F() { return F; },
    preview(items, ctx, t) { PV.push(...items); flush(ctx, t); },
    destroy() { gone = true; U.done(); if (V) V.dispose(); }
  };
}
