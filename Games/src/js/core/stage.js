/* ============================================================================
   STAGE — the canvas the games draw on, fitted to the window
   ========================================================================== */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
const stagewrap = document.getElementById('stagewrap');

const Stage = {
  w: 960, h: 600, scale: 1, ox: 0, oy: 0, dpr: 1,
  fit() {
    const r = stagewrap.getBoundingClientRect();
    const cw = Math.max(1, r.width), ch = Math.max(1, r.height);
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(cw * this.dpr);
    cv.height = Math.round(ch * this.dpr);

    /* A fixed 960x600 board on a 21:9 monitor is two fat black bars. Games
       marked `fluid` keep their height and widen to the window instead, so
       they genuinely fill the screen; the rest still letterbox, because a
       game that hardcodes its layout would just leave empty space. The clamp
       stops an ultrawide from turning a board into a corridor. */
    if (cur && cur.fluid) {
      const want = Math.round(this.h * (cw / ch));
      this.w = Math.max(cur.w || 960, Math.min(cur.maxW || 1500, want));
    } else if (cur) {
      this.w = cur.w;
    }

    this.scale = Math.min(cw / this.w, ch / this.h);
    this.ox = (cw - this.w * this.scale) / 2;
    this.oy = (ch - this.h * this.scale) / 2;
    this.cw = cw; this.ch = ch;
  },
  toLogical(cx, cy) {
    const r = cv.getBoundingClientRect();
    const x = (cx - r.left - this.ox) / this.scale;
    const y = (cy - r.top - this.oy) / this.scale;
    return { x, y, inside: x >= 0 && y >= 0 && x <= this.w && y <= this.h };
  }
};
Input.bind(cv, (x, y) => Stage.toLogical(x, y));

