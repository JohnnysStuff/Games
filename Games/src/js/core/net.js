/* ============================================================================
   NET — what a game needs to play online

   The live race or party session a game is part of, a snapshot buffer for
   remote players, a seeded RNG, and the standings a race draws. MP itself
   is shell/multiplayer.js, loaded after the games; they only ever reach it
   from mount(), long after it exists, but the lookups stay defensive.
   ========================================================================== */
function getRace(gid) {
  try {
    if (typeof MP === 'undefined' || !MP || !MP.race) return null;
    const r = MP.race;
    return r.active && (!gid || r.gid === gid) ? r : null;
  } catch (e) { return null; }
}
function getSession(gid) {
  try {
    if (typeof MP === 'undefined' || !MP || !MP.session) return null;
    const s = MP.session;
    return s.active && (!gid || s.gid === gid) ? s : null;
  } catch (e) { return null; }
}
/* Snapshot buffer. Rather than chasing whichever packet arrived last, remote
   entities are rendered ~110ms in the past and interpolated between two states
   we actually received. That converts network jitter into a small constant
   delay, which reads as smooth instead of stuttery.

   Snapshots are laid out by the host's clock (`ts`, stamped as each one is
   sent), not by when they happened to arrive. Spaced by arrival, a packet
   held up 30ms and the next one on time played back as a stretch too slow
   and then a stretch too fast — a limp in everything that moved. The two
   clocks are tied together by the smallest delay seen lately (the packet
   the network held up least), eased rather than jumped when that changes.
   And when the late packets run later than the buffer allows for, the
   buffer deepens a little, smoothly, instead of freezing on the newest state
   and jumping when the next arrives. A host on an older build stamps
   nothing, and its packets are spaced by arrival as before. */
function NetBuf(delayMs) {
  const buf = [];
  const DELAY = delayMs || 110;
  const win = [];                  // [arrival, arrival - sent] for the last two seconds
  let off = null, offGoal = 0, delay = DELAY, delayGoal = DELAY, lastS = 0;
  const when = e => (e.ts === undefined || off === null ? e.t : e.ts + off);
  return {
    push(s) {
      const last = buf.length ? buf[buf.length - 1].s : null;
      if (last && s.q !== undefined && last.q !== undefined && s.q <= last.q) return false;  // stale / reordered
      const t = performance.now();
      const e = { s, t, ts: typeof s.ts === 'number' ? s.ts : undefined };
      if (e.ts !== undefined) {
        win.push([t, t - e.ts]);
        while (win.length > 1 && t - win[0][0] > 2000) win.shift();
        let lo = Infinity;
        for (const w of win) if (w[1] < lo) lo = w[1];
        /* how late the late ones run: the tail of the spread, not its one worst */
        const ex = win.map(w => w[1] - lo).sort((a, b) => a - b);
        const late = ex[Math.floor((ex.length - 1) * .9)] || 0;
        offGoal = lo;
        delayGoal = DELAY + clamp(late - 30, 0, 200);
        if (off === null || Math.abs(off - lo) > 1500) off = lo;     // the first, or a new clock entirely
      }
      buf.push(e);
      while (buf.length > 24) buf.shift();
      return true;
    },
    newest() { return buf.length ? buf[buf.length - 1].s : null; },
    /* [older, newer, blend] straddling render time, and when the newest has
       already been passed (a late one), how far past it, in ms: a game that
       would rather carry things on than hold them still can use that */
    sample() {
      if (!buf.length) return null;
      const n = performance.now();
      const dt = lastS ? Math.min(250, n - lastS) : 0;
      lastS = n;
      if (off !== null) {
        off += (offGoal - off) * (1 - Math.exp(-dt / 600));
        delay += (delayGoal - delay) * (1 - Math.exp(-dt / 900));
      }
      if (buf.length === 1) return [buf[0].s, buf[0].s, 0];
      const target = n - delay;
      for (let i = buf.length - 1; i > 0; i--) {
        const ta = when(buf[i - 1]), tb = when(buf[i]);
        if (ta <= target && tb >= target) {
          const span = tb - ta;
          return [buf[i - 1].s, buf[i].s, span > 0 ? clamp((target - ta) / span, 0, 1) : 0];
        }
      }
      const end = buf[buf.length - 1];
      return target > when(end) ? [end.s, end.s, 0, target - when(end)] : [buf[0].s, buf[0].s, 0];
    },
    clear() { buf.length = 0; win.length = 0; off = null; delay = delayGoal = DELAY; lastS = 0; }
  };
}
/* Deterministic RNG — every racer gets a byte-identical run from one seed. */
function mulberry(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Shared live scoreboard. Everything is weight 600 except the leader and
   yourself — the old version set 800 on every row, which made the whole
   panel shout and left nothing to distinguish the rows that matter. Rank
   sits in its own quiet column, and the leader gets a hairline accent. */
function raceBoard(ctx, x, y, race, opt) {
  opt = opt || {};
  const list = race.list();
  const w = opt.w || 206;
  const rowH = 21;
  const h = 30 + list.length * rowH;
  ctx.save();
  ctx.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha;

  ctx.fillStyle = 'rgba(0,0,0,.30)'; rr(ctx, x + 2, y + 5, w, h, 13); ctx.fill();
  ctx.fillStyle = 'rgba(6,10,18,.70)'; rr(ctx, x, y, w, h, 13); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 13); ctx.stroke();
  /* specular top edge, same idea as the glass panels in the shell */
  const sh = ctx.createLinearGradient(0, y, 0, y + 14);
  sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; rr(ctx, x + 1, y + 1, w - 2, 13, 12); ctx.fill();

  panelText(ctx, x + 12, y + 16, opt.title || 'LIVE', 8.8, '#7dd3fc', 'left', 700);
  panelText(ctx, x + w - 12, y + 16, list.length + 'P', 8.8, P.ink3, 'right', 700);

  for (let i = 0; i < list.length; i++) {
    const p = list[i], ry = y + 33 + i * rowH;
    const lead = i === 0 && p.alive;
    const col = !p.alive ? P.ink3 : lead ? '#fde047' : p.me ? '#bae6fd' : P.ink2;
    if (p.me) {
      ctx.fillStyle = 'rgba(125,211,252,.10)';
      rr(ctx, x + 5, ry - 9.5, w - 10, 19, 7); ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      rr(ctx, x + 5, ry - 9.5, 2.5, 19, 1.25); ctx.fill();
    }
    panelText(ctx, x + 15, ry, String(i + 1), 9, lead ? '#fde047' : P.ink3, 'left', 700);
    const nm = p.name.length > 11 ? p.name.slice(0, 11) + '…' : p.name;
    panelText(ctx, x + 26, ry, nm, 11, col, 'left', p.me || lead ? 700 : 600);
    panelText(ctx, x + w - 12, ry, p.alive ? fmt(p.score) : 'OUT', 11.5, col, 'right', 700);
  }
  ctx.restore();
}

/* End-of-run stat pills describing how the race went, and the title that
   goes over them. */
function raceStats(race, myScore) {
  if (!race) return [];
  const list = race.list();
  let place = 1;
  for (const p of list) { if (p.me) break; place++; }
  place = Math.min(place, list.length);
  const top = list[0];
  return [
    { label: 'Place', value: place + ' / ' + list.length },
    { label: 'Leader', value: top ? top.name.split(' ')[0] + ' · ' + fmt(top.score) : '—' }
  ];
}
function raceTitle(race, deadTitle) {
  if (!race) return deadTitle;
  const list = race.list();
  return list.length && list[0].me ? 'You are leading' : deadTitle;
}

