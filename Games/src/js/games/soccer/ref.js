/* ============================================================================
   The referee: there for the look, never in the way. He works the far
   touchline, facing the pitch and so facing us, and sidesteps along it to
   stay level with play (hurrying when a long ball gets away from him). He
   blows for kickoffs, goals and full time, points back to the middle after
   a goal, and after a tackle that puts someone down, now and then shows a
   card (or waves play on). He stands just inside the line, where his head
   clears the clock under the scoreboard, and he is drawn behind everyone
   on the pitch whatever their depth (view.js), so he never hides the ball
   or a player running along the boards behind him. Nothing he does changes
   the match: he is not one of W.players, so nobody runs into him and the
   AI never sees him. Offline and on the host he is run here (socRefStep);
   a guest draws the host's, from the snapshots (net.js).
   His sheet (referee_front) faces us, and whatever he does one way, a
   step, a point, a card or play on, is drawn going right: `face` -1
   mirrors it.
   ========================================================================== */
/* Y: where his feet are, just inside the far touchline. He stands 28 px
   tall, 30 with a card held up, and the clock under the scoreboard comes
   down to 16 px above the line, so any nearer and it covers his head or
   the card. EDGE: how close to the corners he goes, where the boards bend
   round. KO: where he waits for a kickoff, to the right of the halfway
   line, clear of the scoreboard. WALK and HURRY: his sidestep, px/s. */
const SOC_REF = { Y: 14, EDGE: 34, KO: 104, WALK: 48, HURRY: 80 };

function socRef() {
  const r = { x: 0, y: SOC_REF.Y, z: 0, vx: 0, vy: 0, face: 1, st: 'move', an: 'watch', at: 0,
              act: null, q: [], cd: 0, going: false, sheet: SocArt.dress('referee_front', {}) };
  socRefPlace(r);
  return r;
}
/* back to his spot for a kickoff, his raised arm (the whistle's) on the
   side away from the scoreboard */
function socRefPlace(r) {
  if (!r) return;
  r.x = SOC.PL / 2 + SOC_REF.KO; r.y = SOC_REF.Y; r.vx = r.vy = 0; r.face = 1; r.going = false;
  r.act = null; r.q = []; r.an = 'watch'; r.at = 0;
}
/* something for him to do, `wait` seconds from now: an animation played
   through and held `hold` seconds more, facing `face` (0: as he is) */
function socRefDo(r, an, wait = 0, face = 0, hold = 0) {
  if (r) r.q.push({ an, wait, face, hold });
}
function socRefStep(W, dt) {
  const r = W.ref;
  if (!r) return;
  r.cd = Math.max(0, r.cd - dt);
  if (!r.act && r.q.length) {
    const q = r.q[0];
    q.wait -= dt;
    if (q.wait <= 0) {
      r.q.shift();
      r.act = { t: 0, dur: socAnimDur(r, q.an) + q.hold };
      r.an = q.an; r.at = 0; r.vx = r.vy = 0; r.going = false;
      if (q.face) r.face = q.face;
    }
  }
  if (r.act) {
    r.act.t += dt; r.at += dt;
    if (r.act.t >= r.act.dur) { r.act = null; r.an = 'watch'; r.at = 0; }
    return;
  }
  /* In play, level with the ball, a little behind where it is heading, so
     he eases after a long ball rather than racing it; otherwise he stays
     put. He sets off once it is a few steps away and stops once he is
     level: not a shuffle for every touch. */
  const b = W.ball;
  const tx = W.phase === 'play' ? socClamp(b.x - socClamp(b.vx * .3, -48, 48), SOC_REF.EDGE, SOC.PL - SOC_REF.EDGE) : r.x;
  const dx = tx - r.x, d = Math.abs(dx);
  if (!r.going && d > 16) r.going = true;
  if (r.going && d < 3) r.going = false;
  const want = r.going ? Math.sign(dx) * Math.min(d > 56 ? SOC_REF.HURRY : SOC_REF.WALK, d * 3) : 0;
  r.vx += (want - r.vx) * (1 - Math.exp(-7 * dt));
  r.x = socClamp(r.x + r.vx * dt, SOC_REF.EDGE, SOC.PL - SOC_REF.EDGE);
  r.y = SOC_REF.Y; r.vy = 0;
  const s = Math.abs(r.vx), an = s > 8 ? 'sidestep' : 'watch';
  if (an !== r.an) { r.an = an; r.at = 0; }
  /* his steps keep time with how fast he is going */
  r.at += an === 'sidestep' ? dt * socClamp(s / SOC_REF.WALK, .6, 1.8) : dt;
  if (s > 8) r.face = Math.sign(r.vx);
}
/* A tackle has put `on` down: mostly he waves play on, the way the side
   that was fouled is going; a third of the time it is a yellow card, now
   and then a red, shown to the one who made it (`by`). */
function socRefFoul(W, by, on) {
  const r = W.ref;
  if (!r || r.cd > 0 || r.act || r.q.length) return;
  r.cd = 5;
  const roll = Math.random(), at = Math.sign(by.x - r.x) || r.face;
  if (roll < .07) socRefDo(r, 'red', .35, at, .7);
  else if (roll < .38) socRefDo(r, 'yellow', .35, at, .6);
  else socRefDo(r, 'playon', .25, on ? on.team.dir : at, .2);
}
