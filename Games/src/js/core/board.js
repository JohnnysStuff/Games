/* ============================================================================
   BOARD — the palette and text helpers games share on their canvases

   Games render on their own dark "screen" in both themes: P is its palette,
   boardBg() its backdrop, panelText() the plain canvas label.
   ========================================================================== */
const P = {
  board: '#0d1117', board2: '#111823',
  ink: '#e9eef7', ink2: '#93a0b5', ink3: '#5c6779'
};
function boardBg(ctx, W, H, a, b) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a || P.board2); g.addColorStop(1, b || P.board);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/* Every game hand-picks a weight per label and they were almost all 700-800,
   so the canvas UI shouted. Rather than retune hundreds of call sites, the
   scale is compressed once here: headings stay clearly heavier than body text,
   but nothing reaches the old blackness. */
function tameWeight(w) {
  w = w || 700;
  return w >= 800 ? 680 : w >= 700 ? 600 : w >= 600 ? 520 : w;
}
function panelText(ctx, x, y, txt, size, color, align, weight) {
  ctx.font = tameWeight(weight) + ' ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color || P.ink; ctx.fillText(txt, x, y);
}

