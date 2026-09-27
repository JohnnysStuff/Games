/* ============================================================================
   HUD — the lettering the games keep their own scores in.

   There is no bar over the stage any more, so a score is part of the picture
   it belongs to: a pixel figure in Flappy and Breakout, display lettering
   over a Stack tower, the Horizon tiles in golf and pool. This is the type
   case they are set from — a bitmap face drawn as actual squares, an
   outlined display face, and the Horizon kit golf and pool wear.

   Nothing here knows about any particular game: a game asks for lettering, in
   a size and a colour, at a point on its own canvas.
   ========================================================================== */
const Hud = (() => {
  /* ---- the bitmap face ----
     Five wide, seven tall, one clear column between letters. Drawn as squares
     rather than as a font, so it is the same shape at any size on any machine
     and stays hard-edged when a game scales it up. The nought and the G keep
     every gap two squares wide: the bold face fattens each square to two, and
     a one-square gap closes up — a slashed nought came out a solid box. */
  const R = s => s.split('|');
  const G = {
    '0': R('.###.|#...#|#...#|#...#|#...#|#...#|.###.'), '1': R('..#..|.##..|..#..|..#..|..#..|..#..|.###.'),
    '2': R('.###.|#...#|....#|...#.|..#..|.#...|#####'), '3': R('#####|...#.|..#..|...#.|....#|#...#|.###.'),
    '4': R('...#.|..##.|.#.#.|#..#.|#####|...#.|...#.'), '5': R('#####|#....|####.|....#|....#|#...#|.###.'),
    '6': R('..##.|.#...|#....|####.|#...#|#...#|.###.'), '7': R('#####|....#|...#.|..#..|.#...|.#...|.#...'),
    '8': R('.###.|#...#|#...#|.###.|#...#|#...#|.###.'), '9': R('.###.|#...#|#...#|.####|....#|...#.|.##..'),
    'A': R('.###.|#...#|#...#|#####|#...#|#...#|#...#'), 'B': R('####.|#...#|#...#|####.|#...#|#...#|####.'),
    'C': R('.###.|#...#|#....|#....|#....|#...#|.###.'), 'D': R('###..|#..#.|#...#|#...#|#...#|#..#.|###..'),
    'E': R('#####|#....|#....|####.|#....|#....|#####'), 'F': R('#####|#....|#....|####.|#....|#....|#....'),
    'G': R('.###.|#...#|#....|#..##|#...#|#...#|.###.'), 'H': R('#...#|#...#|#...#|#####|#...#|#...#|#...#'),
    'I': R('.###.|..#..|..#..|..#..|..#..|..#..|.###.'), 'J': R('..###|...#.|...#.|...#.|...#.|#..#.|.##..'),
    'K': R('#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#'), 'L': R('#....|#....|#....|#....|#....|#....|#####'),
    'M': R('#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#'), 'N': R('#...#|##..#|##..#|#.#.#|#..##|#..##|#...#'),
    'O': R('.###.|#...#|#...#|#...#|#...#|#...#|.###.'), 'P': R('####.|#...#|#...#|####.|#....|#....|#....'),
    'Q': R('.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#'), 'R': R('####.|#...#|#...#|####.|#.#..|#..#.|#...#'),
    'S': R('.####|#....|#....|.###.|....#|....#|####.'), 'T': R('#####|..#..|..#..|..#..|..#..|..#..|..#..'),
    'U': R('#...#|#...#|#...#|#...#|#...#|#...#|.###.'), 'V': R('#...#|#...#|#...#|#...#|#...#|.#.#.|..#..'),
    'W': R('#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#'), 'X': R('#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#'),
    'Y': R('#...#|#...#|.#.#.|..#..|..#..|..#..|..#..'), 'Z': R('#####|....#|...#.|..#..|.#...|#....|#####'),
    ' ': R('.....|.....|.....|.....|.....|.....|.....'), '.': R('.....|.....|.....|.....|.....|.##..|.##..'),
    ',': R('.....|.....|.....|.....|.##..|.##..|.#...'), ':': R('.....|.##..|.##..|.....|.##..|.##..|.....'),
    '-': R('.....|.....|.....|#####|.....|.....|.....'), '+': R('.....|..#..|..#..|#####|..#..|..#..|.....'),
    '/': R('....#|....#|...#.|..#..|.#...|#....|#....'), '%': R('##..#|##..#|...#.|..#..|.#...|#..##|#..##'),
    '!': R('..#..|..#..|..#..|..#..|..#..|.....|..#..'), '?': R('.###.|#...#|....#|...#.|..#..|.....|..#..'),
    '*': R('.....|#.#.#|.###.|#####|.###.|#.#.#|.....'), '$': R('..#..|.####|#.#..|.###.|..#.#|####.|..#..'),
    "'": R('..#..|..#..|.....|.....|.....|.....|.....'), '"': R('.#.#.|.#.#.|.....|.....|.....|.....|.....'), '(': R('...#.|..#..|.#...|.#...|.#...|..#..|...#.'),
    ')': R('.#...|..#..|...#.|...#.|...#.|..#..|.#...'), '<': R('...#.|..#..|.#...|#....|.#...|..#..|...#.'),
    '>': R('.#...|..#..|...#.|....#|...#.|..#..|.#...'), '=': R('.....|.....|#####|.....|#####|.....|.....'),
    '#': R('.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.'), '_': R('.....|.....|.....|.....|.....|.....|#####')
  };
  const CELL = 6;                                   // five lit columns, one clear
  /* every lit square in a string, in glyph units */
  function cells(str, cell) {
    const out = [];
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const g = G[str[i]] || G['?'];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') out.push([i * cell + c, r]);
    }
    return out;
  }
  /* `thick` fattens every square to two, which is what a big score wants: a
     one-square stroke with a half-square edge round it leaves a nought all
     hole and no figure. The extra column of tracking keeps letters apart. */
  function pixWidth(str, px, thick) {
    const n = String(str).length;
    return n ? (n * (thick ? CELL + 1 : CELL) - (thick ? 2 : 1)) * px : 0;
  }

  /* A pixel figure, with the dark edge the arcade always drew round one so it
     reads over whatever is behind it. `px` is the size of one square. */
  function pix(ctx, str, x, y, px, o) {
    o = o || {};
    const thick = !!o.thick;
    const w = pixWidth(str, px, thick);
    let ox = x;
    if (o.align === 'center') ox = x - w / 2; else if (o.align === 'right') ox = x - w;
    let oy = y;
    if (o.baseline === 'middle') oy = y - px * (thick ? 4 : 3.5); else if (o.baseline === 'bottom') oy = y - px * (thick ? 8 : 7);
    ox = Math.round(ox); oy = Math.round(oy);
    const cs = cells(str, thick ? CELL + 1 : CELL);
    const sz = thick ? px * 2 : px;
    /* `crisp`: every square snapped to the screen's own pixels. The stage is
       scaled by a fraction, so a square at a whole logical pixel still lands
       between two real ones and gets smoothed into a blur; worked out in
       screen space its edges fall exactly on pixels, and neighbours share an
       edge, so the letters stay solid. (Only for plain scaling: anything
       rotated or skewed draws the ordinary way.) */
    let m = null;
    if (o.crisp && ctx.getTransform) { m = ctx.getTransform(); if (m.b || m.c) m = null; }
    const stamp = (col, dx, dy) => {
      ctx.fillStyle = col;
      if (m) {
        for (let i = 0; i < cs.length; i++) {
          const x0 = ox + cs[i][0] * px + dx, y0 = oy + cs[i][1] * px + dy;
          const X0 = Math.round(x0 * m.a + m.e), Y0 = Math.round(y0 * m.d + m.f);
          ctx.fillRect(X0, Y0, Math.round((x0 + sz) * m.a + m.e) - X0, Math.round((y0 + sz) * m.d + m.f) - Y0);
        }
      } else for (let i = 0; i < cs.length; i++) ctx.fillRect(ox + cs[i][0] * px + dx, oy + cs[i][1] * px + dy, sz, sz);
    };
    ctx.save();
    if (m) ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow) stamp(o.shadow, 0, px * (o.shadowY === undefined ? 1.5 : o.shadowY));
    /* The edge is a fraction of a square, not a whole one: a thin stroke with
       an outline as heavy as itself closes up every counter — a nought comes
       out a filled box. A thick face can afford a full square. */
    if (o.outline) {
      const t = Math.max(1, Math.round((o.ow === undefined ? (thick ? 1 : .34) : o.ow) * px));
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) stamp(o.outline, dx * t, dy * t);
    }
    stamp(o.fill || '#fff', 0, 0);
    ctx.restore();
    return w;
  }

  /* ---- the display faces ----
     Condensed for anything that wants to look like a sports broadcast, techno
     for the sci-fi games, and the system stack for everything else. Each falls
     back to something installed, so a blocked webfont costs weight, not type. */
  const FAM = {
    cond: '"Barlow Condensed","Bahnschrift Condensed",Bahnschrift,"Arial Narrow",system-ui,sans-serif',
    techno: 'Orbitron,"Bahnschrift",ui-monospace,SFMono-Regular,Menlo,monospace',
    sans: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',
    mono: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'
  };
  function font(o) {
    return (o.italic ? 'italic ' : '') + (o.weight || 700) + ' ' + (o.size || 16) + 'px ' + (FAM[o.fam] || o.fam || FAM.sans);
  }
  /* one line of type, with an outline or a shadow if it has to sit on a scene */
  function text(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = font(o);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    try { ctx.letterSpacing = (o.track || 0) + 'px'; } catch (e) {}
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowSize || 14; }
    if (o.shadow) {
      ctx.save(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = o.shadow;
      ctx.fillText(String(str), x + (o.sx || 0), y + (o.sy === undefined ? 2 : o.sy));
      ctx.restore();
    }
    if (o.stroke) {
      ctx.lineWidth = o.lw || 4; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.strokeStyle = o.stroke; ctx.strokeText(String(str), x, y);
    }
    ctx.fillStyle = o.fill || '#fff';
    ctx.fillText(String(str), x, y);
    ctx.restore();
  }
  function width(ctx, str, o) {
    ctx.save(); ctx.font = font(o || {});
    try { ctx.letterSpacing = ((o && o.track) || 0) + 'px'; } catch (e) {}
    const w = ctx.measureText(String(str)).width;
    ctx.restore();
    return w;
  }
  /* ---- Horizon ----
     What golf and pool wear: hard-edged tiles, condensed capitals, one yellow
     that means "this one", and the key prompts along the foot of the screen.
     Kept here because both games use it and neither should own it. */
  const FH = {
    Y: '#f5e11c', Y2: '#ffd400', O: '#f4621f', P: '#ff2f87', N: '#111b2b', N2: '#0a1220',
    W: '#f4f4f0', INK: '#12161d', MU: 'rgba(244,244,240,.62)', GOOD: '#5ad17e',
    /* a tile: square corners, a shadow under it, and a colour strip along the
       bottom when it is carrying a state */
    tile(ctx, x, y, w, h, o) {
      o = o || {};
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      ctx.fillStyle = 'rgba(0,0,0,' + (o.shadow === undefined ? .3 : o.shadow) + ')';
      ctx.fillRect(x + 2, y + 4, w, h);
      ctx.fillStyle = o.fill || (o.sel ? FH.Y : 'rgba(244,244,240,.93)');
      ctx.fillRect(x, y, w, h);
      if (o.strip) { ctx.fillStyle = o.strip; ctx.fillRect(x, y + h - (o.stripH || 4), w, o.stripH || 4); }
      if (o.ring) { ctx.strokeStyle = o.ring; ctx.lineWidth = o.lw || 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2); }
      ctx.restore();
    },
    /* tracked capitals — the label voice */
    cap(ctx, str, x, y, size, col, align, o) {
      o = o || {};
      text(ctx, String(str).toUpperCase(), x, y, {
        fam: 'cond', size: size, weight: o.weight || 700, italic: o.italic,
        fill: col, align: align, track: o.track === undefined ? size * .09 : o.track,
        alpha: o.alpha, shadow: o.shadow, sy: o.sy, baseline: o.baseline
      });
    },
    capW(ctx, str, size, o) {
      o = o || {};
      return width(ctx, String(str).toUpperCase(), { fam: 'cond', size: size, weight: o.weight || 700,
        italic: o.italic, track: o.track === undefined ? size * .09 : o.track });
    },
    /* the figure voice: leaning, heavy, and never tracked */
    num(ctx, str, x, y, size, col, align, o) {
      o = o || {};
      text(ctx, str, x, y, { fam: 'cond', size: size, weight: o.weight || 800, italic: o.italic !== false,
        fill: col, align: align, alpha: o.alpha, shadow: o.shadow, sy: o.sy, baseline: o.baseline });
    },
    /* the class plate off a car: a coloured square, then a white one */
    badge(ctx, x, y, letter, value, col) {
      const h = 20, lw = 20;
      ctx.save();
      ctx.fillStyle = col || FH.O; ctx.fillRect(x, y, lw, h);
      FH.cap(ctx, letter, x + lw / 2, y + h / 2 + .5, 13, '#fff', 'center', { weight: 800 });
      const vw = Math.max(30, FH.capW(ctx, value, 13, { weight: 700 }) + 14);
      ctx.fillStyle = FH.W; ctx.fillRect(x + lw + 2, y, vw, h);
      FH.cap(ctx, value, x + lw + 2 + vw / 2, y + h / 2 + .5, 13, FH.INK, 'center', { weight: 700 });
      ctx.restore();
      return lw + 2 + vw;
    },
    /* A key, and what it does — the row along the foot of a Horizon screen.
       It carries its own dark bar, because half these games are played over
       snow and the other half over a bright cloth. */
    prompt(ctx, x, y, key, label, o) {
      o = o || {};
      const s = o.size || 11;
      const kw = Math.max(s * 1.7, FH.capW(ctx, key, s, { weight: 700 }) + s * .9);
      const lw = FH.capW(ctx, label, s, { weight: 600 });
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      if (o.plate !== false) {
        ctx.fillStyle = o.plateCol || 'rgba(9,16,26,.66)';
        ctx.fillRect(x - 7, y - s * 1.06, kw + lw + 23, s * 2.12);
      }
      ctx.strokeStyle = o.keyCol || 'rgba(244,244,240,.55)'; ctx.lineWidth = 1;
      rr(ctx, x + .5, y - s * .8 + .5, kw, s * 1.6, 3); ctx.stroke();
      FH.cap(ctx, key, x + kw / 2, y + .5, s, o.keyCol || '#f4f4f0', 'center', { weight: 700 });
      FH.cap(ctx, label, x + kw + 8, y + .5, s, o.labCol || 'rgba(244,244,240,.8)', 'left', { weight: 600 });
      ctx.restore();
      return kw + lw + 26;
    },
    /* the slanted bar the whole interface is built out of */
    slant(ctx, x, y, w, h, skew, col, alpha) {
      ctx.save();
      if (alpha !== undefined) ctx.globalAlpha *= alpha;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + skew, y); ctx.lineTo(x + w + skew, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  /* the webfonts are only ever painted onto a canvas, which does not ask for
     them by itself — so say so once, at boot */
  function warm() {
    try {
      ['italic 800 40px "Barlow Condensed"', '700 20px "Barlow Condensed"', '600 14px "Barlow Condensed"',
       '900 30px Orbitron', '700 16px Orbitron'].forEach(f => document.fonts.load(f, '0123456789'));
    } catch (e) {}
  }
  return { pix, pixWidth, text, width, FAM, FH, warm };
})();
/* asked for at boot, and again once the stylesheet has actually arrived */
try { Hud.warm(); document.fonts.ready.then(() => Hud.warm()); } catch (e) {}
setTimeout(() => { try { Hud.warm(); } catch (e) {} }, 1500);

