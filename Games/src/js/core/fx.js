/* ============================================================================
   FX — particles, floating text and screen shake over the stage
   ========================================================================== */
class FX {
  constructor() { this.p = []; this.t = []; this.shakeAmt = 0; }
  burst(x, y, o) {
    o = o || {};
    const n = o.count || 12;
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + rand(-(o.spread || TAU) / 2, (o.spread || TAU) / 2) : rand(0, TAU);
      const sp = rand((o.speed || 160) * .4, o.speed || 160);
      this.p.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: (o.life || .6) * rand(.7, 1.2), max: o.life || .6,
        size: o.size || 4, color: o.color || '#fff',
        grav: o.grav === undefined ? 380 : o.grav,
        drag: o.drag === undefined ? 1.4 : o.drag,
        sq: !!o.square
      });
    }
  }
  text(x, y, str, color, size) {
    this.t.push({ x, y, str, color: color || '#fff', size: size || 18, life: .9, t0: .9, vy: -46 });
  }
  shake(a) { this.shakeAmt = Math.min(16, this.shakeAmt + a); }
  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.life -= dt;
      if (q.life <= 0) { this.p.splice(i, 1); continue; }
      q.vy += q.grav * dt;
      q.vx -= q.vx * q.drag * dt; q.vy -= q.vy * q.drag * dt * .3;
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    for (let i = this.t.length - 1; i >= 0; i--) {
      const q = this.t[i];
      q.life -= dt; q.y += q.vy * dt; q.vy *= .94;
      if (q.life <= 0) this.t.splice(i, 1);
    }
    this.shakeAmt *= Math.pow(.02, dt);
    if (this.shakeAmt < .05) this.shakeAmt = 0;
  }
  render(ctx) {
    for (const q of this.p) {
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = q.color;
      const s = q.size * (.4 + a * .6);
      if (q.sq) ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      else { ctx.beginPath(); ctx.arc(q.x, q.y, s / 2, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const q of this.t) {
      /* pop in with a little overshoot, hold, then fade out at the end */
      const born = clamp(1 - q.life / (q.t0 || .9), 0, 1);
      let pop = 1;
      if (born < .22) {
        const p = born / .22, c1 = 1.70158, c3 = c1 + 1;
        pop = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
      }
      ctx.globalAlpha = clamp(q.life / .32, 0, 1);
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.scale(pop, pop);
      ctx.font = '700 ' + q.size + 'px ui-sans-serif,system-ui,sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.strokeText(q.str, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.str, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  clear() { this.p.length = 0; this.t.length = 0; this.shakeAmt = 0; }
}

