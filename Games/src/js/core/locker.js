/* ============================================================================
   LOCKER — Customize and Shop, inside a game's own front page

   Every item in a line, what you own and wear, what is still out there and
   what it costs in shards, and the crates — laid out on the game's own
   canvas in the house style, so changing a ball never sends the player off
   to another screen.

   A front page owns the FrontKit it clicks through; the locker registers its
   hit boxes on it (keys 'lk:...') and the page hands those clicks back to
   click(). `o.accent` colours what is chosen, `o.onWear(slot, item)` hears
   about anything put on, and crates open over the stage through the shell.
   ========================================================================== */
function cosSwatch(ctx, it, cx, cy, s, a) {
  if (!it) return;
  const r = s / 2;
  ctx.save();
  if (a !== undefined) ctx.globalAlpha *= a;
  const ball = (x, y, rad, col, stripe, pip, num) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.clip();
    ctx.fillStyle = stripe ? '#efe7d2' : col; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    if (stripe) { ctx.fillStyle = col; ctx.fillRect(x - rad, y - rad * .5, rad * 2, rad); }
    if (pip) {
      ctx.fillStyle = pip;
      for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + .3; ctx.beginPath(); ctx.arc(x + Math.cos(q) * rad * .55, y + Math.sin(q) * rad * .55, rad * .11, 0, TAU); ctx.fill(); }
    }
    if (num) {
      ctx.fillStyle = '#f7f2e6'; ctx.beginPath(); ctx.arc(x, y, rad * .42, 0, TAU); ctx.fill();
      ctx.fillStyle = '#16140f'; ctx.font = '800 ' + (rad * .5).toFixed(1) + 'px ui-sans-serif,system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), x, y + rad * .03);
    }
    const g = ctx.createRadialGradient(x - rad * .38, y - rad * .42, rad * .05, x, y, rad * 1.05);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.35, 'rgba(255,255,255,0)');
    g.addColorStop(.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    ctx.restore();
  };
  if (it.slot === 'ball' && it.game === 'pool') {
    const B = Cos.ballSet(it.id), q = r * .36;
    ball(cx - r * .3, cy - r * .2, q, B.col(3), false, null, 3);
    ball(cx + r * .32, cy - r * .12, q, B.col(11), true, null, 11);
    ball(cx - r * .02, cy + r * .3, q, B.cue, false, B.pip);
  } else if (it.slot === 'ball') {
    const q = r * .56;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx + q * .1, cy + q * .95, q * .8, q * .22, 0, 0, TAU); ctx.fill();
    ball(cx, cy, q, it.a);
    /* the dimples, faint */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, q, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.09)';
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const dx = (i + (j & 1) * .5) * q * .3, dy = j * q * .27;
      if (dx * dx + dy * dy < q * q * .8) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, q * .07, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  } else if (it.slot === 'cue') {
    ctx.translate(cx, cy); ctx.rotate(-.62);
    const L = s * .92, x0 = -L / 2;
    const seg = (a0, a1, w0, w1, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(x0 + a0 * L, -w0); ctx.lineTo(x0 + a1 * L, -w1); ctx.lineTo(x0 + a1 * L, w1); ctx.lineTo(x0 + a0 * L, w0);
      ctx.closePath(); ctx.fill();
    };
    const u = s / 100;
    seg(0, .02, 1.6 * u, 1.7 * u, '#2f6fb3');
    seg(.02, .06, 1.7 * u, 1.8 * u, '#f1ece0');
    seg(.06, .5, 1.8 * u, 2.4 * u, it.a);
    seg(.5, .53, 2.4 * u, 2.5 * u, '#d8ae55');
    seg(.53, .7, 2.5 * u, 2.9 * u, it.b);
    seg(.7, .86, 2.9 * u, 3.1 * u, '#1b1b20');
    seg(.86, 1, 3.1 * u, 3.4 * u, it.b);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x0 + .06 * L, -1.4 * u, .8 * L, .7 * u);
  } else if (it.slot === 'trail') {
    if (it.s === 'none') {
      ctx.strokeStyle = 'rgba(244,244,240,.35)'; ctx.lineWidth = Math.max(2, s * .05);
      ctx.beginPath(); ctx.arc(cx, cy, r * .42, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * .3, cy + r * .3); ctx.lineTo(cx + r * .3, cy - r * .3); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(cx - r * .8, cy + r * .4, cx + r * .5, cy - r * .3);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.35, it.b); g.addColorStop(1, it.a);
      ctx.strokeStyle = g; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.lineWidth = s * (.2 - k * .06); ctx.globalAlpha *= k ? .9 : .55;
        ctx.beginPath(); ctx.moveTo(cx - r * .8, cy + r * .45);
        ctx.quadraticCurveTo(cx - r * .1, cy + r * .5, cx + r * .42, cy - r * .22); ctx.stroke();
      }
      ctx.globalAlpha = a === undefined ? 1 : a;
      ball(cx + r * .46, cy - r * .26, r * .2, '#f5f4ee');
    }
  } else {
    /* a nameplate: its face, the rule along its foot, a name on it */
    const w = s * .92, h = s * .42, x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 2, y + 4, w, h);
    ctx.fillStyle = it.b; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = it.a; ctx.fillRect(x, y + h - Math.max(3, h * .12), w, Math.max(3, h * .12));
    ctx.fillStyle = it.a; ctx.fillRect(x + w * .08, y + h * .3, w * .46, Math.max(2, h * .13));
    ctx.globalAlpha *= .5; ctx.fillRect(x + w * .08, y + h * .55, w * .3, Math.max(2, h * .1));
  }
  ctx.restore();
}

/* a crate, drawn: slatted, banded in the rarity's colours, the line's own
   item stencilled on the front */
function crateArt(ctx, cx, cy, s, gid, slotId, k) {
  const w = s, h = s * .74, x = cx - w / 2, y = cy - h / 2 + s * .06, lid = h * .26, lift = (k || 0) * s * .07;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, y + h + 4, w * .52, s * .07, 0, 0, TAU); ctx.fill();
  const wood = ctx.createLinearGradient(0, y, 0, y + h);
  wood.addColorStop(0, '#9a6a3a'); wood.addColorStop(1, '#5e3b1d');
  ctx.fillStyle = wood; ctx.fillRect(x, y + lid, w, h - lid);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  for (let i = 1; i < 4; i++) ctx.fillRect(x, y + lid + (h - lid) * i / 4, w, 1.5);
  ctx.fillStyle = '#3b2412'; ctx.fillRect(x, y + lid, w * .06, h - lid); ctx.fillRect(x + w * .94, y + lid, w * .06, h - lid);
  /* the lid, riding up a touch under the pointer */
  const lg = ctx.createLinearGradient(0, y - lift, 0, y + lid - lift);
  lg.addColorStop(0, '#b27c45'); lg.addColorStop(1, '#7a4f28');
  ctx.fillStyle = lg; ctx.fillRect(x - w * .03, y - lift, w * 1.06, lid);
  ctx.fillStyle = '#3b2412'; ctx.fillRect(x - w * .03, y + lid - lift - 2, w * 1.06, 2);
  /* bands of each rarity the line still holds */
  const cols = ['l', 'e', 'r', 'c'].map(r => Cos.RAR[r].col);
  cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + w * (.12 + i * .2), y - lift + lid * .3, w * .14, lid * .4); });
  /* the stencil: whatever the line is */
  const first = Cos.line(gid, slotId)[Math.min(2, Cos.line(gid, slotId).length - 1)];
  ctx.fillStyle = 'rgba(20,12,4,.35)'; ctx.fillRect(cx - w * .26, y + lid + (h - lid) * .14, w * .52, (h - lid) * .72);
  cosSwatch(ctx, first, cx, y + lid + (h - lid) * .5, (h - lid) * .72);
  ctx.restore();
}

function FrontLocker(api, FK, gid, o) {
  o = o || {};
  const FH = Hud.FH, ACC = o.accent || FH.Y;
  const SL = Cos.slotsFor(gid);
  const L = { slot: SL[0].id, hot: null, mute: 0 };
  const worn = s => Cos.equipped(gid, s);
  /* the purse: coins for crates, shards for buying outright */
  const numW = (ctx, s, size) => Hud.width(ctx, s, { fam: 'cond', size, weight: 800, italic: true });
  L.purse = (ctx, rx, y, a) => {
    ctx.save(); if (a !== undefined) ctx.globalAlpha *= a;
    const c = fmt(Meta.coins), sh = fmt(Cos.shards);
    const w1 = numW(ctx, sh, 18), w2 = numW(ctx, c, 18);
    let x = rx;
    FH.num(ctx, sh, x, y, 18, '#c9b6ff', 'right'); x -= w1 + 8;
    FH.cap(ctx, 'Shards', x, y + 1, 10, FH.MU, 'right'); x -= FH.capW(ctx, 'Shards', 10) + 22;
    FH.num(ctx, c, x, y, 18, FH.Y, 'right'); x -= w2 + 8;
    FH.cap(ctx, 'Coins', x, y + 1, 10, FH.MU, 'right');
    ctx.restore();
  };
  /* ---- the wardrobe ---- */
  L.custom = (ctx, x, y, w, h, a) => {
    ctx.save(); if (a !== undefined) ctx.globalAlpha *= a;
    /* the lines, as a column of tabs with what you have on in each */
    const tw = 150, th = 58;
    SL.forEach((s, i) => {
      const ty = y + i * (th + 8), on = L.slot === s.id;
      const b = FK.btn('lk:slot:' + s.id, x, ty, tw, th);
      const k = FK.glide('lks' + s.id, on ? 1 : 0, 14);
      FH.tile(ctx, x + b.h * 3, ty, tw, th, { fill: on ? ACC : 'rgba(18,22,29,.78)', shadow: .35 });
      const it = worn(s.id);
      cosSwatch(ctx, it, x + b.h * 3 + 30, ty + th / 2, 40);
      FH.cap(ctx, Cos.slotName(s.id, gid), x + b.h * 3 + 58, ty + 21, 13, on ? FH.INK : FH.W, 'left', { weight: 800 });
      FH.cap(ctx, it ? it.name : '', x + b.h * 3 + 58, ty + 39, 10, on ? 'rgba(18,22,29,.62)' : FH.MU, 'left');
      if (k > .02) { ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = FH.INK; ctx.fillRect(x + b.h * 3 + tw - 6, ty, 6, th); ctx.restore(); }
    });
    /* everything in the chosen line: yours, and what is still out there */
    const items = Cos.line(gid, L.slot), cols = 3, cw = 78, gap = 8;
    const gx = x + w - cols * cw - (cols - 1) * gap, gy = y;
    let hot = null;
    items.forEach((it, i) => {
      const cx0 = gx + (i % cols) * (cw + gap), cy0 = gy + Math.floor(i / cols) * (cw + gap);
      const own = Cos.owns(it.id), on = worn(L.slot) && worn(L.slot).id === it.id, R = Cos.RAR[it.r];
      const b = FK.btn('lk:it:' + it.id, cx0, cy0, cw, cw);
      if (b.h > .5) hot = it;
      const lift = b.h * 3;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx0 + 2, cy0 + 4, cw, cw);
      ctx.fillStyle = own ? 'rgba(24,30,40,.92)' : 'rgba(14,18,25,.82)'; ctx.fillRect(cx0, cy0 - lift, cw, cw);
      ctx.fillStyle = R.col; ctx.fillRect(cx0, cy0 - lift + cw - 4, cw, 4);
      if (on) { ctx.strokeStyle = ACC; ctx.lineWidth = 3; ctx.strokeRect(cx0 + 1.5, cy0 - lift + 1.5, cw - 3, cw - 3); }
      cosSwatch(ctx, it, cx0 + cw / 2, cy0 - lift + cw / 2 - 5, 50, own ? 1 : .32);
      if (!own) {
        /* a padlock, and the price in shards */
        const lx = cx0 + cw / 2, ly = cy0 - lift + cw / 2 - 8;
        ctx.strokeStyle = 'rgba(244,244,240,.85)'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(lx, ly - 5, 6, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(244,244,240,.9)'; ctx.fillRect(lx - 9, ly - 5, 18, 13);
        FH.cap(ctx, Cos.price(it) + ' shards', cx0 + cw / 2, cy0 - lift + cw - 16, 10, '#c9b6ff', 'center', { weight: 800 });
      } else if (on) {
        FH.cap(ctx, 'Worn', cx0 + cw / 2, cy0 - lift + cw - 16, 10, ACC, 'center', { weight: 800 });
      }
      ctx.restore();
    });
    L.hot = hot;
    /* the big look at whichever one is under the pointer, or what you have on */
    const show = hot || worn(L.slot), px = x + tw + 24, pw = gx - px - 24;
    if (show) {
      const R = Cos.RAR[show.r], own = Cos.owns(show.id), on = worn(L.slot) && worn(L.slot).id === show.id;
      const pcx = px + pw / 2, pcy = y + 112;
      const glow = ctx.createRadialGradient(pcx, pcy, 10, pcx, pcy, 118);
      glow.addColorStop(0, R.col + '55'); glow.addColorStop(1, R.col + '00');
      ctx.fillStyle = glow; ctx.fillRect(pcx - 130, pcy - 120, 260, 240);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(pcx, pcy + 70, 74, 12, 0, 0, TAU); ctx.fill();
      cosSwatch(ctx, show, pcx, pcy - 4, 132 + Math.sin(FK.t * 2) * 3, own ? 1 : .55);
      FH.cap(ctx, R.n, pcx, y + 212, 12, R.col, 'center', { weight: 800, track: 2.4 });
      FH.num(ctx, show.name, pcx, y + 240, 28, FH.W, 'center');
      const st = on ? 'You have it on' : own ? 'Yours · click to wear' :
        Cos.shards >= Cos.price(show) ? 'Click to buy for ' + Cos.price(show) + ' shards' : Cos.price(show) + ' shards · ' + (Cos.price(show) - Cos.shards) + ' short';
      FH.cap(ctx, st, pcx, y + 270, 11, on ? ACC : own ? FH.W : '#c9b6ff', 'center', { weight: 700 });
    }
    const left = items.filter(i => !Cos.owns(i.id)).length;
    FH.cap(ctx, left ? left + ' still to find in the ' + Cos.crateName(L.slot, gid) : 'Line complete',
           gx + (cols * cw + (cols - 1) * gap) / 2, gy + Math.ceil(items.length / cols) * (cw + gap) + 10, 10, FH.MU, 'center');
    ctx.restore();
  };
  /* ---- the counter ---- */
  L.shop = (ctx, x, y, w, h, a) => {
    ctx.save(); if (a !== undefined) ctx.globalAlpha *= a;
    const n = SL.length, gap = 14, cw = Math.min(190, (w - gap * (n - 1)) / n), total = n * cw + (n - 1) * gap;
    const x0 = x + (w - total) / 2;
    SL.forEach((s, i) => {
      const cx0 = x0 + i * (cw + gap), items = Cos.line(gid, s.id), left = items.filter(it => !Cos.owns(it.id));
      const b = FK.btn('lk:crate:' + s.id, cx0, y, cw, h);
      const lift = b.h * 5, k = FK.spring('lkc' + s.id, b.h, 300, 20);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx0 + 3, y + 6, cw, h);
      const bg = ctx.createLinearGradient(0, y - lift, 0, y - lift + h);
      bg.addColorStop(0, 'rgba(30,38,52,.95)'); bg.addColorStop(1, 'rgba(12,16,24,.95)');
      ctx.fillStyle = bg; ctx.fillRect(cx0, y - lift, cw, h);
      if (b.h > .05) { ctx.strokeStyle = 'rgba(245,225,28,' + (b.h * .9).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.strokeRect(cx0 + 1, y - lift + 1, cw - 2, h - 2); }
      crateArt(ctx, cx0 + cw / 2, y - lift + 92, cw * .62, gid, s.id, k);
      FH.cap(ctx, Cos.crateName(s.id, gid), cx0 + cw / 2, y - lift + 178, 14, FH.W, 'center', { weight: 800 });
      FH.cap(ctx, left.length ? left.length + ' still to find' : 'Complete · pays shards', cx0 + cw / 2, y - lift + 198, 10, FH.MU, 'center');
      /* the odds, by what is still in there */
      const odds = ['l', 'e', 'r', 'c'].map(r => [r, (left.length ? left : items).filter(it => it.r === r).length]).filter(q => q[1]);
      let ow = 0; odds.forEach(q => { ow += FH.capW(ctx, Cos.RAR[q[0]].n + ' ' + q[1], 9) + 10; });
      let ox = cx0 + cw / 2 - (ow - 10) / 2;
      odds.forEach(q => { const t = Cos.RAR[q[0]].n + ' ' + q[1]; FH.cap(ctx, t, ox, y - lift + 218, 9, Cos.RAR[q[0]].col, 'left'); ox += FH.capW(ctx, t, 9) + 10; });
      /* the price, as the button */
      const can = Meta.coins >= s.cost;
      FH.tile(ctx, cx0 + 14, y - lift + h - 50, cw - 28, 36, { fill: can ? FH.Y : 'rgba(244,244,240,.14)', shadow: .3 });
      FH.num(ctx, fmt(s.cost), cx0 + cw / 2 - 8, y - lift + h - 32, 20, can ? FH.INK : FH.MU, 'right');
      FH.cap(ctx, 'coins', cx0 + cw / 2, y - lift + h - 31, 11, can ? 'rgba(18,22,29,.7)' : FH.MU, 'left', { weight: 700 });
    });
    FH.cap(ctx, 'Duplicates pay shards  ·  shards buy any item outright in Customize', x + w / 2, y + h + 26, 10, FH.MU, 'center');
    ctx.restore();
  };
  /* a click the front page's FrontKit got on one of ours */
  L.click = k => {
    if (k.slice(0, 3) !== 'lk:') return false;
    if (L.mute > 0) return true;
    const p = k.split(':');
    if (p[1] === 'slot') { if (L.slot !== p[2]) { L.slot = p[2]; Sound.blip(); } return true; }
    if (p[1] === 'it') {
      const it = Cos.byId[p.slice(2).join(':')];
      if (!it) return true;
      if (Cos.owns(it.id)) {
        if (!(worn(it.slot) && worn(it.slot).id === it.id)) { Cos.equip(gid, it.slot, it.id); Sound.blip(); if (o.onWear) o.onWear(it.slot, it); }
      } else if (Cos.buyWithShards(it)) {
        Cos.equip(gid, it.slot, it.id); Sound.coin();
        Meta.toast('Unlocked', it.name, 'good', 'bag');
        if (o.onWear) o.onWear(it.slot, it);
      } else {
        Meta.toast('Not enough shards', Cos.price(it) - Cos.shards + ' more needed', '', 'coin');
      }
      return true;
    }
    if (p[1] === 'crate') {
      api.buyCrate(p[2], res => { L.mute = .25; L.slot = p[2]; if (o.onCrate) o.onCrate(res); });
      return true;
    }
    return true;
  };
  L.step = dt => { if (L.mute > 0) L.mute -= dt; };
  return L;
}

