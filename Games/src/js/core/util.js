/* ============================================================================
   UTIL — the small maths and canvas helpers everything uses
   ========================================================================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick  = arr => arr[(Math.random() * arr.length) | 0];
const fmt   = n => Math.round(n).toLocaleString('en-US');
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);

/* One place decides how round every canvas panel in every game is. The old
   values were tuned per-call and added up to a very bubbly look, so they get
   scaled back here rather than edited in two hundred places. Genuine pills
   (radius == half the height) stay pill-shaped; everything else squares off. */
const RR_SCALE = 0.42;
function rr(ctx, x, y, w, h, r) {
  const half = Math.min(Math.abs(w), Math.abs(h)) / 2;
  if (r < half - 0.5) r = r * RR_SCALE;          // a box: square it up
  else r = half;                                  // a pill: leave it round
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shade(hex, amt) { // amt -1..1
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(lerp(r, t, p)); g = Math.round(lerp(g, t, p)); b = Math.round(lerp(b, t, p));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* Two colours blended, hex in and hex out — `shade` returns an rgb() string,
   which the 3D material parser cannot read. Cosmetics need this to turn the
   house colours into a set's own. */
function mixHex(a, b, t) {
  const p = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b), o = [];
  for (let i = 0; i < 3; i++) o.push(Math.round(A[i] + (B[i] - A[i]) * t));
  return '#' + o.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

