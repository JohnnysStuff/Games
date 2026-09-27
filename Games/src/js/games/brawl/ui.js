/* ============================================================================
   BALL BRAWL — the interface kit

   Everything drawn flat over the arena: the lettering, glass panels,
   buttons, health bars, hearts, the timer, stamped words and the numbers
   that pop off a hit. It is set in the arcade's house type (All In's):
   Barlow Condensed italic 800 for anything big, small tracked capitals for
   labels, the system face at a confident weight for sentences.

   Every tween here runs on the render clock (frame(dt) is called from
   render), never in update(), which is a fixed step and would judder. The
   clickables are registered each frame as they are drawn, like FrontKit's,
   because the match's own screens are up when FrontKit's menu is not.
   ========================================================================== */
function bbUI(api) {
  const FAM = Hud.FAM.cond;
  const C = {
    ink: '#f4f6ff', mute: '#a9b2d3', faint: '#6c7599', deep: '#0b0f22', navy: '#141a36', glass: 'rgba(12,16,36,.78)',
    edge: 'rgba(255,255,255,.1)', gold: '#ffcf4a', gold2: '#ff9f1c', me: '#39c8ff', them: '#ff4d6d', good: '#5dff9b', bad: '#ff5a5a'
  };
  const U = { C, t: 0, dt: 0, hits: [], M: {} };
  /* canvas never asks for a webfont by itself: ask for every face used */
  try { for (const f of ['italic 800 40px', 'italic 700 20px', '800 20px', '700 14px', '600 16px', 'italic 600 16px']) document.fonts.load(f + ' "Barlow Condensed"'); } catch (e) {}

  /* ---- clocks and eased values ---- */
  /* U.t is the page's clock in seconds, the same one every phase change is
     stamped with, so an entrance can be timed from its phase */
  U.frame = dt => { U.dt = dt; U.t = performance.now() / 1000; U.hits.length = 0; };
  U.glide = (k, to, rate) => {
    const s = U.M[k] || (U.M[k] = { x: to, v: 0 });
    s.x += (to - s.x) * (1 - Math.exp(-(rate || 14) * U.dt));
    return s.x;
  };
  U.spring = (k, to, stiff, damp) => {
    const s = U.M[k] || (U.M[k] = { x: to, v: 0 });
    let t = U.dt;
    while (t > 1e-6) {
      const h = Math.min(t, 1 / 240);
      s.v += ((to - s.x) * (stiff || 600) - s.v * (damp || 26)) * h;
      s.x += s.v * h; t -= h;
    }
    return s.x;
  };
  U.kick = (k, v) => { const s = U.M[k] || (U.M[k] = { x: 0, v: 0 }); s.v += v; };
  U.set = (k, x) => { const s = U.M[k] || (U.M[k] = { x, v: 0 }); s.x = x; s.v = 0; };
  U.eo = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  U.eio = k => { k = clamp(k, 0, 1); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  U.bo = k => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  U.el = k => { k = clamp(k, 0, 1); if (k === 0 || k === 1) return k; return Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1; };
  /* entrance: 0 -> 1 for a piece that arrives d seconds after t0 */
  U.in = (t0, d, dur) => clamp((U.t - t0 - (d || 0)) / (dur || .4), 0, 1);

  /* ---- clickables ---- */
  U.over = (x, y, w, h) => { const p = api.input.pointer; return p.inside && p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; };
  U.btn = (key, x, y, w, h, live) => {
    const on = live !== false && !api.covered;
    if (on) U.hits.push({ key, x, y, w, h });
    return { h: U.glide('h' + key, on && U.over(x, y, w, h) ? 1 : 0, 16), p: U.spring('p' + key, 0, 700, 30), live: on };
  };
  U.hitAt = (x, y) => {
    for (let i = U.hits.length - 1; i >= 0; i--) { const r = U.hits[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.key; }
    return '';
  };
  U.press = k => U.kick('p' + k, -40);
  let cur = '';
  U.cursor = () => {
    const p = api.input.pointer, want = p.inside && !api.covered && U.hitAt(p.x, p.y) ? 'pointer' : '';
    if (want !== cur) { cur = want; try { cv.style.cursor = want; } catch (e) {} }
  };
  U.done = () => { if (cur) { cur = ''; try { cv.style.cursor = ''; } catch (e) {} } };

  /* ---- type ---- */
  U.font = (size, w, it) => (it === false ? '' : 'italic ') + (w || 800) + ' ' + size + 'px ' + FAM;
  /* display lettering: o { stroke, lw, shadow, glow, track, alpha, w } */
  U.disp = (ctx, s, x, y, size, col, align, o) => {
    o = o || {};
    ctx.save();
    ctx.font = U.font(size, o.w, o.it);
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = (o.track || 0) + 'px'; } catch (e) {}
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x + (o.sx || 0), y + (o.sy === undefined ? size * .07 : o.sy)); }
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || size * .5; }
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || size * .14; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
    if (o.glow && o.reglow) { ctx.shadowBlur = 0; ctx.fillText(s, x, y); }
    ctx.restore();
  };
  U.dispW = (ctx, s, size, o) => {
    ctx.save(); ctx.font = U.font(size, o && o.w, o && o.it);
    try { ctx.letterSpacing = ((o && o.track) || 0) + 'px'; } catch (e) {}
    const w = ctx.measureText(s).width; ctx.restore(); return w;
  };
  /* Every word is set in one family, Barlow Condensed, the arcade's house
     face: italic 800 for anything big (disp), upright 700 in tracked
     capitals for labels (caps), upright 600 for sentences (body). A
     condensed face reads small at a given size, so labels and sentences are
     set SMALL times the size asked for, which leaves every layout where it
     was drawn. */
  const SMALL = 1.24;
  const capsFont = (size, o) => (o && o.it ? 'italic ' : '') + ((o && o.w) || 700) + ' ' + (size * SMALL).toFixed(2) + 'px ' + FAM;
  U.caps = (ctx, s, x, y, size, col, align, o) => {
    o = o || {};
    ctx.save();
    ctx.font = capsFont(size, o);
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = (size * (o.track === undefined ? .12 : o.track)).toFixed(2) + 'px'; } catch (e) {}
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(String(s).toUpperCase(), x, y + 1.2); }
    ctx.fillStyle = col; ctx.fillText(String(s).toUpperCase(), x, y);
    ctx.restore();
  };
  U.capsW = (ctx, s, size, o) => {
    ctx.save(); ctx.font = capsFont(size, o);
    try { ctx.letterSpacing = (size * (o && o.track !== undefined ? o.track : .12)).toFixed(2) + 'px'; } catch (e) {}
    const w = ctx.measureText(String(s).toUpperCase()).width; ctx.restore(); return w;
  };
  const bodyFont = (size, w, it) => (it ? 'italic ' : '') + (w || 600) + ' ' + (size * SMALL).toFixed(2) + 'px ' + FAM;
  U.body = (ctx, s, x, y, size, col, align, w, it) => {
    ctx.save(); ctx.font = bodyFont(size, w, it);
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillText(s, x, y + 1.2);
    ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
  };
  U.bodyW = (ctx, s, size, w, it) => { ctx.save(); ctx.font = bodyFont(size, w, it); const m = ctx.measureText(s).width; ctx.restore(); return m; };
  /* how a ball grows: cream words with a small gold arrow going up before
     the first line, centred on cx; returns where the next line would go */
  U.growNote = (ctx, text, cx, y, size, maxW, lines, lh) => {
    const L = U.wrap(ctx, text, size, maxW - 16, 600).slice(0, lines || 2);
    L.forEach((line, i) => {
      const tw = U.bodyW(ctx, line, size, 600), ox = i === 0 ? 8 : 0;
      U.body(ctx, line, cx + ox, y, size, '#f2e2b8', 'center', 600);
      if (i === 0) {
        const ax = cx + ox - tw / 2 - 9, s = size * .5;
        ctx.save(); ctx.fillStyle = C.gold; ctx.shadowColor = 'rgba(255,207,74,.6)'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(ax, y - s); ctx.lineTo(ax + s * .95, y + s * .2); ctx.lineTo(ax + s * .32, y + s * .2); ctx.lineTo(ax + s * .32, y + s * .9);
        ctx.lineTo(ax - s * .32, y + s * .9); ctx.lineTo(ax - s * .32, y + s * .2); ctx.lineTo(ax - s * .95, y + s * .2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      y += lh || size * 1.45;
    });
    return y;
  };
  U.wrap = (ctx, s, size, maxW, w, it) => {
    ctx.save(); ctx.font = bodyFont(size, w, it);
    const out = []; let line = '';
    for (const word of String(s).split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  };

  /* ---- keys, pills and small marks ----
     Nothing is left as a bare line of text over the picture: a key to
     press is drawn as a key, a state ("waiting for...") sits in a pill,
     a subtitle between rules. */
  const ARROWS = { '←': -Math.PI, '→': 0, '↑': -Math.PI / 2, '↓': Math.PI / 2 };
  const keyW = (ctx, k, h) => ARROWS[k] !== undefined ? h : Math.max(h + 2, U.capsW(ctx, k, h * .4, { track: .05 }) + h * .72);
  U.keycap = (ctx, k, x, y, h, glow) => {
    const w = keyW(ctx, k, h);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, x, y + 2.5, w, h, 5); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, glow ? '#ffe28a' : '#454e82'); g.addColorStop(1, glow ? '#f0a92a' : '#262c52');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 5); ctx.fill();
    ctx.strokeStyle = glow ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.26)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, 4.5); ctx.stroke();
    const ink = glow ? '#2a1606' : '#ffffff';
    if (ARROWS[k] !== undefined) {
      ctx.translate(x + w / 2, y + h / 2); ctx.rotate(ARROWS[k]); ctx.fillStyle = ink;
      ctx.beginPath(); ctx.moveTo(h * .2, 0); ctx.lineTo(-h * .12, -h * .19); ctx.lineTo(-h * .12, h * .19); ctx.closePath(); ctx.fill();
    } else U.caps(ctx, k, x + w / 2, y + h / 2 + .5, h * .4, ink, 'center', { track: .05, shadow: false });
    ctx.restore();
    return w;
  };
  /* A strip of keys and what each does: items [[key or [keys], what], ...].
     x is its middle (or an end, with align). Returns its width. */
  U.hints = (ctx, items, x, y, o) => {
    o = o || {};
    const h = o.h || 19, ls = o.size || 10, gap = 18;
    const parts = items.map(([keys, what]) => {
      const ks = [].concat(keys);
      const kw = ks.reduce((a, k) => a + keyW(ctx, k, h) + 3, -3), tw = U.capsW(ctx, what, ls);
      return { ks, what, kw, tw, w: kw + 8 + tw };
    });
    const w = parts.reduce((a, p) => a + p.w, 0) + gap * (parts.length - 1) + 26;
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = 'rgba(5,7,18,.7)'; rr(ctx, x0, y - h / 2 - 7, w, h + 14, (h + 14) / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; rr(ctx, x0 + .5, y - h / 2 - 6.5, w - 1, h + 13, (h + 13) / 2); ctx.stroke();
    let cx = x0 + 13;
    for (const p of parts) {
      for (const k of p.ks) cx += U.keycap(ctx, k, cx, y - h / 2 - 1, h, o.glow) + 3;
      cx += 5;
      U.caps(ctx, p.what, cx, y + .5, ls, o.col || C.mute, 'left');
      cx += p.tw + gap;
    }
    ctx.restore();
    return w;
  };
  U.spinner = (ctx, x, y, r, col) => {
    ctx.save(); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const a = U.t * 7;
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, r, a, a + 1.9); ctx.stroke();
    ctx.restore();
  };
  /* a state in a pill, with a spinner (o.spin) or a coloured dot (o.dot) */
  U.pill = (ctx, text, x, y, o) => {
    o = o || {};
    const ls = o.size || 10.5, h = o.h || 26, tw = U.capsW(ctx, text, ls), icon = o.check ? 22 : o.spin || o.dot || o.icon ? 18 : 0, pad = o.check ? 9 : 15;
    const w = tw + pad + 15 + icon;
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, x0, y - h / 2 + 3, w, h, h / 2); ctx.fill();
    if (o.grad) {
      const gr = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      gr.addColorStop(0, o.grad[0]); gr.addColorStop(1, o.grad[1]);
      ctx.fillStyle = gr;
    } else ctx.fillStyle = o.fill || 'rgba(10,13,32,.9)';
    rr(ctx, x0, y - h / 2, w, h, h / 2); ctx.fill();
    const sh = ctx.createLinearGradient(0, y - h / 2, 0, y);
    sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; rr(ctx, x0 + 1, y - h / 2 + 1, w - 2, h / 2, h / 2); ctx.fill();
    ctx.strokeStyle = o.edge || 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; rr(ctx, x0 + .5, y - h / 2 + .5, w - 1, h - 1, h / 2 - .5); ctx.stroke();
    if (o.check) {
      /* a tick drawn in a white disc, not a character from the font */
      const cx = x0 + pad + 8, r = h / 2 - 4;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = o.checkCol || '#1c9a57'; ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx - r * .45, y + r * .02); ctx.lineTo(cx - r * .1, y + r * .38); ctx.lineTo(cx + r * .5, y - r * .36); ctx.stroke();
    }
    if (o.spin) U.spinner(ctx, x0 + pad + 5, y, 5.5, o.spin);
    if (o.dot) {
      ctx.fillStyle = o.dot; ctx.shadowColor = o.dot; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x0 + pad + 4, y, 4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (o.icon) U.icon(ctx, o.icon, x0 + pad + 5, y, 15, o.iconCol || C.gold);
    U.caps(ctx, text, x0 + pad + icon, y + .5, ls, o.col || C.ink, 'left');
    ctx.restore();
    return w;
  };
  /* a subtitle between two rules ending in diamonds */
  U.ribbon = (ctx, text, x, y, size, col, align, o) => {
    o = o || {};
    const tw = U.capsW(ctx, text, size), rl = o.rule === undefined ? 26 : o.rule, g = 10;
    const x0 = align === 'left' ? x : align === 'right' ? x - tw - (rl + g) * 2 : x - tw / 2 - rl - g;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const rule = (ax, dir) => {
      const gr = ctx.createLinearGradient(ax, 0, ax + rl * dir, 0);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(Math.min(ax, ax + rl * dir), y - .75, rl, 1.5);
      ctx.save(); ctx.translate(ax, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = col; ctx.fillRect(-2.5, -2.5, 5, 5); ctx.restore();
    };
    rule(x0 + rl, -1);
    U.caps(ctx, text, x0 + rl + g, y + .5, size, col, 'left');
    rule(x0 + rl + g * 2 + tw, 1);
    ctx.restore();
  };
  /* One of a ball's numbers on a row: its name, a bar that fills (kb, 0..1,
     as it arrives) and the number counting up with it. k is how far the row
     has come in. value: a number (and o.suffix), or a word. */
  U.statRow = (ctx, x, y, w, label, value, frac, col, k, kb, o) => {
    if (k <= 0) return;
    o = o || {};
    const lw = 70, vw = 52, bw = w - lw - vw, bh = 9, e = U.eo(kb);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.6);
    ctx.translate((1 - U.eo(k)) * 28, 0);
    U.caps(ctx, label, x, y + .5, 10, C.mute, 'left');
    const bx = x + lw, by = y - bh / 2;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.05)'; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
    const f = clamp(frac, 0, 1) * e;
    if (f > .01) {
      const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      gr.addColorStop(0, mixHex(col, '#000000', .25)); gr.addColorStop(1, mixHex(col, '#ffffff', .25));
      ctx.fillStyle = gr; rr(ctx, bx, by, Math.max(bh, bw * f), bh, bh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 3, by + 1.5, Math.max(0, bw * f - 6), 2);
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bx + Math.max(bh / 2, bw * f - bh / 2), y, 2.2, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 1; i < 5; i++) ctx.fillRect(bx + bw * i / 5 - .5, by + 1, 1, bh - 2);
    const shown = typeof value === 'number' ? String(Math.round(value * e)) + (o.suffix || '') : value;
    U.disp(ctx, shown, x + w, y + .5, 18, C.ink, 'right', { it: false, w: 700, shadow: 'rgba(0,0,0,.5)', sy: 1.4 });
    ctx.restore();
  };
  /* small drawn marks: a flame (a streak), a cup (a best), a heart, a bolt */
  U.icon = (ctx, kind, x, y, s, col) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath();
    if (kind === 'flame') {
      ctx.moveTo(0, -10); ctx.bezierCurveTo(7, -3, 9, 2, 7, 6); ctx.bezierCurveTo(5, 11, -5, 11, -7, 6);
      ctx.bezierCurveTo(-9, 1, -5, -2, -3, -7); ctx.bezierCurveTo(-2, -3, 0, -2, 0, -10); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.bezierCurveTo(3, 2, 4, 5, 2, 7); ctx.bezierCurveTo(0, 9, -3, 8, -3, 5); ctx.bezierCurveTo(-3, 3, -1, 2, 0, -1); ctx.fill();
    } else if (kind === 'cup') {
      ctx.moveTo(-8, -9); ctx.lineTo(8, -9); ctx.lineTo(7, -1); ctx.bezierCurveTo(6, 3, 3, 4, 2, 4); ctx.lineTo(2, 7); ctx.lineTo(6, 8); ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10); ctx.lineTo(-6, 8); ctx.lineTo(-2, 7); ctx.lineTo(-2, 4); ctx.bezierCurveTo(-3, 4, -6, 3, -7, -1); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(-9, -4, 3.5, Math.PI * .5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(9, -4, 3.5, -Math.PI * .5, Math.PI * .5); ctx.stroke();
    } else if (kind === 'bolt') {
      ctx.moveTo(3, -10); ctx.lineTo(-6, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 10); ctx.lineTo(6, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /* ---- surfaces ---- */
  /* ---- texture ----
     Fine patterns laid into surfaces at a few percent, so a panel reads as
     a made thing rather than a flat colour: a grid, diagonal hatching, or
     dots. Each tile is drawn three times over and shrunk back as a
     pattern, so its lines stay hairlines on a stage scaled up to fill a
     big screen. Patterns are anchored to the stage, so neighbouring panels
     line up. */
  const PATS = {};
  function pat(ctx, kind) {
    if (PATS[kind]) return PATS[kind];
    const n = kind === 'dots' ? 6 : kind === 'hatch' ? 7 : 12, k = 3, c = document.createElement('canvas');
    c.width = c.height = n * k;
    const g = c.getContext('2d');
    g.scale(k, k); g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff';
    if (kind === 'grid') { g.fillRect(0, 0, n, .5); g.fillRect(0, 0, .5, n); }
    else if (kind === 'hatch') { g.lineWidth = .6; for (let d = -n; d <= n; d += n) { g.beginPath(); g.moveTo(d, n); g.lineTo(d + n, 0); g.stroke(); } }
    else { g.beginPath(); g.arc(n / 2, n / 2, .62, 0, TAU); g.fill(); }
    const p = ctx.createPattern(c, 'repeat');
    try { p.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0])); } catch (e) {}
    return (PATS[kind] = p);
  }
  /* lays a texture into the outline `shape` traces, over the box it fills */
  U.texture = (ctx, kind, a, shape, bx, by, bw, bh) => {
    ctx.save();
    ctx.beginPath(); shape(); ctx.clip();
    ctx.globalAlpha *= a; ctx.fillStyle = pat(ctx, kind); ctx.fillRect(bx, by, bw, bh);
    ctx.restore();
  };

  U.panel = (ctx, x, y, w, h, o) => {
    o = o || {};
    const r = o.r === undefined ? 12 : o.r;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x, y + 6, w, h, r); ctx.fill(); }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.top || 'rgba(28,34,66,.92)'); g.addColorStop(1, o.bot || 'rgba(10,13,30,.92)');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill();
    if (o.tint) { ctx.globalAlpha *= o.tintA || .18; ctx.fillStyle = o.tint; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.globalAlpha /= o.tintA || .18; }
    if (o.tex !== false) U.texture(ctx, o.tex || 'grid', o.texA || .055, () => rr(ctx, x, y, w, h, r), x, y, w, h);
    /* darker toward the bottom corners, as if lit from above */
    const vg = ctx.createRadialGradient(x + w / 2, y + h * .25, Math.min(w, h) * .15, x + w / 2, y + h * .45, Math.max(w, h) * .8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = vg; rr(ctx, x, y, w, h, r); ctx.fill();
    const s = ctx.createLinearGradient(0, y, 0, y + Math.min(40, h));
    s.addColorStop(0, 'rgba(255,255,255,.1)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; rr(ctx, x + 1, y + 1, w - 2, Math.min(40, h) - 1, r); ctx.fill();
    ctx.lineWidth = o.lw || 1; ctx.strokeStyle = o.edge || C.edge; rr(ctx, x + .5, y + .5, w - 1, h - 1, r); ctx.stroke();
    ctx.restore();
  };
  /* a button: rises under the pointer, squashes when pressed.
     o: { primary, sub, live, col (the fill's colours), size } */
  U.button = (ctx, key, x, y, w, h, label, o) => {
    o = o || {};
    /* o.b: hover and press from someone else's clickables (the results
       page's are FrontKit's) */
    const b = o.b || U.btn(key, x, y, w, h, o.live);
    const lift = b.h * 3, sc = 1 + b.h * .02;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(x + w / 2, y + h / 2 - lift);
    ctx.scale(sc - b.p * .03, sc + b.p * .05);
    const r = o.r === undefined ? 10 : o.r;
    ctx.fillStyle = 'rgba(0,0,0,.38)'; rr(ctx, -w / 2, -h / 2 + 5 + lift, w, h, r); ctx.fill();
    const dead = o.live === false;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    if (dead) { g.addColorStop(0, '#2a3050'); g.addColorStop(1, '#1b2038'); }
    else if (o.primary) { g.addColorStop(0, b.h > .5 ? '#ffe07a' : '#ffd44f'); g.addColorStop(1, b.h > .5 ? '#ffae33' : '#ff9f1c'); }
    else if (o.col) { g.addColorStop(0, o.col[0]); g.addColorStop(1, o.col[1]); }
    else { g.addColorStop(0, b.h > .5 ? '#34407a' : '#262f5c'); g.addColorStop(1, b.h > .5 ? '#1f2752' : '#171d40'); }
    ctx.fillStyle = g; rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
    U.texture(ctx, 'hatch', o.primary && !dead ? .1 : .07, () => rr(ctx, -w / 2, -h / 2, w, h, r), -w / 2, -h / 2, w, h);
    const s = ctx.createLinearGradient(0, -h / 2, 0, 0);
    s.addColorStop(0, 'rgba(255,255,255,' + (.28 + b.h * .12).toFixed(3) + ')'); s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h / 2, r); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = o.primary && !dead ? 'rgba(255,255,255,.55)' : b.h > .5 && !dead ? 'rgba(255,207,74,.8)' : 'rgba(255,255,255,.14)';
    rr(ctx, -w / 2 + .75, -h / 2 + .75, w - 1.5, h - 1.5, r); ctx.stroke();
    const ink = dead ? C.faint : o.primary ? '#26160a' : C.ink;
    const sz = o.size || h * .46;
    if (o.draw) o.draw(ctx, w, h, b);
    else {
      U.disp(ctx, label, o.icon ? 10 : 0, o.sub ? -h * .12 : 1, sz, ink, 'center', { track: 1 });
      if (o.sub) U.caps(ctx, o.sub, o.icon ? 10 : 0, h * .25, Math.max(8.5, h * .15), dead ? C.faint : o.primary ? 'rgba(38,22,10,.7)' : C.mute, 'center');
      if (o.icon) o.icon(ctx, -w / 2 + 26, 0, ink);
    }
    ctx.restore();
    return b;
  };
  /* a row of choices, the chosen one's highlight sliding between them */
  U.chips = (ctx, id, x, y, w, h, choices, cur, o) => {
    o = o || {};
    const n = choices.length, pad = 4, gap = 4, cw = (w - pad * 2 - gap * (n - 1)) / n;
    const idx = Math.max(0, choices.findIndex(c => c[0] === cur));
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = 'rgba(6,9,22,.6)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = C.edge; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, h / 2); ctx.stroke();
    const sx = U.spring('chip' + id, x + pad + idx * (cw + gap), 420, 30), sp = U.spring('chipk' + id, 0, 520, 24);
    const col = o.col ? o.col(choices[idx][0]) : C.gold;
    ctx.save(); ctx.translate(sx + cw / 2, y + h / 2); ctx.scale(1 - sp * .08, 1 + sp * .14);
    ctx.fillStyle = col; rr(ctx, -cw / 2, -(h - pad * 2) / 2, cw, h - pad * 2, (h - pad * 2) / 2); ctx.fill();
    ctx.restore();
    choices.forEach((c, i) => {
      const cx = x + pad + i * (cw + gap);
      const b = U.btn(id + ':' + c[0], cx, y, cw, h, o.live);
      const on = U.glide('chipon' + id + i, i === idx ? 1 : 0, 12);
      U.disp(ctx, c[1], cx + cw / 2, y + h / 2 + 1 - b.h * 1.5, h * .44, on > .5 ? '#1c1206' : 'rgba(244,246,255,' + (.62 + b.h * .38).toFixed(3) + ')', 'center', { track: .6 });
    });
    ctx.restore();
  };
  U.chipKick = id => U.kick('chipk' + id, -8);

  /* ---- health, hearts, time ---- */
  /* a bar that drains toward the middle of the screen, with the health just
     lost hanging on in white for a moment before it falls away */
  U.hpBar = (ctx, key, x, y, w, h, frac, col, right) => {
    frac = clamp(frac, 0, 1);
    const shown = U.glide(key + 'v', frac, 22);
    const g0 = U.M[key + 'g'] || (U.M[key + 'g'] = { x: frac, v: 0, hold: 0 });
    if (frac >= g0.x) { g0.x = frac; g0.hold = 0; }
    else if ((g0.hold += U.dt) > .45) g0.x = Math.max(frac, g0.x - U.dt * .6);
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,16,.8)'; rr(ctx, x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
    ctx.fillStyle = '#1a1f3a'; rr(ctx, x, y, w, h, 4); ctx.fill();
    const seg = (a, b, fill) => {
      if (b <= a) return;
      const x0 = right ? x + w * (1 - b) : x + w * a, x1 = right ? x + w * (1 - a) : x + w * b;
      ctx.fillStyle = fill; rr(ctx, x0, y, Math.max(2, x1 - x0), h, 4); ctx.fill();
    };
    seg(shown, g0.x, 'rgba(255,255,255,.85)');
    const low = frac < .3;
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    const base = low ? (Math.sin(U.t * 10) > 0 ? '#ff6a5a' : '#ff3d4d') : col;
    gr.addColorStop(0, mixHex(base, '#ffffff', .35)); gr.addColorStop(.55, base); gr.addColorStop(1, mixHex(base, '#000000', .3));
    seg(0, shown, gr);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x + 2, y + 2, w - 4, Math.max(1, h * .22));
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 1; i < 10; i++) ctx.fillRect(x + w * i / 10 - .5, y + h * .55, 1, h * .45);
    ctx.restore();
  };
  U.heart = (ctx, x, y, s, fill, o) => {
    o = o || {};
    const w = s / 2;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.sc) ctx.scale(o.sc, o.sc);
    ctx.beginPath();
    ctx.moveTo(0, w * .92);
    ctx.bezierCurveTo(-w * 1.35, w * .05, -w * .92, -w * 1.05, 0, -w * .38);
    ctx.bezierCurveTo(w * .92, -w * 1.05, w * 1.35, w * .05, 0, w * .92);
    ctx.closePath();
    if (fill) {
      const g = ctx.createLinearGradient(0, -w, 0, w);
      g.addColorStop(0, '#ff8aa0'); g.addColorStop(.5, fill); g.addColorStop(1, '#a3102e');
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(40,0,10,.6)'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(-w * .42, -w * .38, w * .2, w * .12, -.6, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(10,12,26,.8)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke();
    }
    ctx.restore();
  };
  /* Hearts in a row; a heart that has just been lost breaks in two and
     falls, and its shards scatter. lost: [time it broke, or 0] */
  U.hearts = (ctx, x, y, n, left, brk, s, align) => {
    const gap = s * 1.18, x0 = align === 'right' ? x - (n - 1) * gap : x;
    for (let i = 0; i < n; i++) {
      const hx = x0 + i * gap, alive = align === 'right' ? i >= n - left : i < left;
      const idx = align === 'right' ? n - 1 - i : i;
      const bt = brk[idx];
      U.heart(ctx, hx, y, s, null);
      if (alive) {
        const pul = 1 + Math.sin(U.t * 3 + i) * .03;
        U.heart(ctx, hx, y, s, '#ff3b5c', { sc: pul });
      } else if (bt !== undefined && bt >= 0) {
        const k = U.t - bt;
        if (k < 1.1) {
          /* the halves part and drop */
          for (const sd of [-1, 1]) {
            ctx.save();
            const drop = k * k * 180, ox = sd * k * 26, rot = sd * k * 2.2;
            ctx.translate(hx + ox, y + drop); ctx.rotate(rot);
            ctx.beginPath(); ctx.rect(sd < 0 ? -s : 0, -s, s, s * 2); ctx.clip();
            ctx.globalAlpha *= clamp(1.1 - k, 0, 1);
            U.heart(ctx, 0, 0, s, '#ff3b5c');
            ctx.restore();
          }
          if (k < .5) {
            ctx.save(); ctx.globalAlpha *= 1 - k * 2;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(hx, y, s * (.6 + k * 2.4), 0, TAU); ctx.stroke();
            for (let j = 0; j < 8; j++) {
              const a = j / 8 * TAU + .3, d = s * (.4 + k * 3.2);
              ctx.fillStyle = j & 1 ? '#ff3b5c' : '#ffd0da';
              ctx.fillRect(hx + Math.cos(a) * d - 2, y + Math.sin(a) * d - 2, 4, 4);
            }
            ctx.restore();
          }
        }
      }
    }
  };
  /* the time left: a bar that runs down, red for the last few seconds */
  U.timer = (ctx, x, y, w, frac, secs) => {
    frac = clamp(frac, 0, 1);
    const hot = secs <= 3.2;
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,16,.7)'; rr(ctx, x, y, w, 8, 4); ctx.fill();
    const col = hot ? (Math.sin(U.t * 14) > 0 ? '#ff5a5a' : '#ffb13d') : C.gold;
    ctx.fillStyle = col; rr(ctx, x + w * (1 - frac) / 2, y, Math.max(8, w * frac), 8, 4); ctx.fill();
    ctx.restore();
    const sc = hot ? 1 + (1 - (secs % 1)) * .18 : 1;
    ctx.save(); ctx.translate(x + w / 2, y + 26); ctx.scale(sc, sc);
    U.disp(ctx, String(Math.max(0, Math.ceil(secs))), 0, 0, 24, hot ? '#ff8a6a' : C.ink, 'center', { shadow: 'rgba(0,0,0,.5)' });
    ctx.restore();
  };

  /* ---- big words ----
     A word stamped down a letter at a time: each drops from large to its
     size with a bounce, the whole thing flashes, and a ring runs out from
     it. t is how long ago it began; o: { size, col, glow, stroke, track } */
  U.stamp = (ctx, word, x, y, t, o) => {
    o = o || {};
    const size = o.size || 96, n = word.length;
    ctx.save();
    ctx.font = U.font(size);
    try { ctx.letterSpacing = (o.track || 2) + 'px'; } catch (e) {}
    const widths = [...word].map(c => ctx.measureText(c).width + (o.track || 2));
    const total = widths.reduce((a, b) => a + b, 0) - (o.track || 2);
    ctx.restore();
    const out = o.out === undefined ? 1 : o.out;
    if (out <= 0) return;
    let lx = x - total / 2;
    const stag = o.stagger === undefined ? .045 : o.stagger;
    for (let i = 0; i < n; i++) {
      const k = clamp((t - i * stag) / .28, 0, 1);
      const cx = lx + widths[i] / 2;
      lx += widths[i];
      if (k <= 0) continue;
      const s = (1 + (1 - U.bo(k)) * 1.4) * (1 + (1 - out) * .3);
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 3) * out;
      ctx.translate(cx, y); ctx.scale(s, s); ctx.rotate((1 - U.eo(k)) * (i & 1 ? .2 : -.2));
      U.disp(ctx, word[i], 0, 0, size, o.col || '#ffffff', 'center', { stroke: o.stroke || 'rgba(8,10,26,.95)', lw: size * .16, glow: o.glow, blur: size * .35, shadow: 'rgba(0,0,0,.45)', sy: size * .08 });
      ctx.restore();
    }
    const fk = clamp((t - n * stag) / .35, 0, 1);
    if (fk > 0 && fk < 1 && o.ring !== false) {
      ctx.save();
      ctx.globalAlpha *= (1 - fk) * .8 * out;
      ctx.strokeStyle = o.glow || '#ffffff'; ctx.lineWidth = 6 * (1 - fk) + 1;
      ctx.beginPath(); ctx.ellipse(x, y, total * .5 + fk * 160, size * .45 + fk * 70, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  };
  /* a banner across the screen: a band that sweeps in, words that slide */
  U.banner = (ctx, y, h, t, dur, col, draw) => {
    const kin = U.eo(clamp(t / .28, 0, 1)), kout = U.eio(clamp((t - dur + .3) / .3, 0, 1));
    if (kin <= 0 || kout >= 1) return;
    const w = 960 * kin;
    ctx.save();
    ctx.globalAlpha *= 1 - kout;
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, 'rgba(8,10,26,.0)'); g.addColorStop(.2, 'rgba(8,10,26,.86)'); g.addColorStop(.8, 'rgba(8,10,26,.86)'); g.addColorStop(1, 'rgba(8,10,26,0)');
    ctx.fillStyle = g; ctx.fillRect(480 - w / 2, y - h / 2, w, h);
    U.texture(ctx, 'hatch', .07, () => ctx.rect(480 - w / 2, y - h / 2 + 10, w, h - 20), 480 - w / 2, y - h / 2, w, h);
    ctx.fillStyle = col; ctx.fillRect(480 - w / 2, y - h / 2 + 6, w, 2); ctx.fillRect(480 - w / 2, y + h / 2 - 8, w, 2);
    ctx.translate((1 - kin) * -60 + kout * 60, 0);
    draw(ctx, kin);
    ctx.restore();
  };

  /* ---- numbers off a hit ---- */
  const nums = [];
  U.num = (x, y, v, col, big, kind) => {
    if (nums.length > 40) nums.shift();
    nums.push({ x: x + (Math.random() - .5) * 16, y, v, col, big, t: 0, kind: kind || '', vx: (Math.random() - .5) * 30 });
  };
  U.drawNums = ctx => {
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i];
      n.t += U.dt;
      if (n.t > 1) { nums.splice(i, 1); continue; }
      const pop = n.t < .12 ? U.bo(n.t / .12) * 1.35 : 1.35 - Math.min(.35, (n.t - .12) * 2);
      const a = n.t > .7 ? 1 - (n.t - .7) / .3 : 1;
      const size = (n.big ? 34 : 22) * pop;
      const y = n.y - U.eo(n.t / .9) * 44, x = n.x + n.vx * n.t;
      const s = n.kind === 'heal' ? '+' + n.v : String(n.v);
      U.disp(ctx, s, x, y, size, n.kind === 'heal' ? '#7dffa8' : '#ffffff', 'center', { stroke: n.col, lw: size * .2, alpha: a, shadow: 'rgba(0,0,0,.5)' });
    }
  };
  U.clearNums = () => { nums.length = 0; };

  /* ---- the fight's heads-up display ----
     A long health bar that runs in toward the middle of the screen, cut at
     a slant at its inner end, in a dark frame. The health just lost hangs
     on in white for a moment before it drains; a blow shakes the bar, and
     below a third it pulses red. */
  U.hudBar = (ctx, key, x, y, w, h, frac, col, right, label) => {
    frac = clamp(frac, 0, 1);
    const st = U.M[key] || (U.M[key] = { v: frac, g: frac, hold: 0, last: frac, shake: 0 });
    if (frac < st.last - .001) st.shake = Math.min(1, st.shake + (st.last - frac) * 7 + .15);
    st.last = frac;
    st.v += (frac - st.v) * (1 - Math.exp(-20 * U.dt));
    if (frac >= st.g) { st.g = frac; st.hold = 0; }
    else if ((st.hold += U.dt) > .45) st.g = Math.max(frac, st.g - U.dt * .6);
    st.shake = Math.max(0, st.shake - U.dt * 3.2);
    const sl = h * .75;
    const shape = e => {
      ctx.beginPath();
      if (!right) { ctx.moveTo(x - e, y - e); ctx.lineTo(x + w + e, y - e); ctx.lineTo(x + w - sl + e * .4, y + h + e); ctx.lineTo(x - e, y + h + e); }
      else { ctx.moveTo(x - e, y - e); ctx.lineTo(x + w + e, y - e); ctx.lineTo(x + w + e, y + h + e); ctx.lineTo(x + sl - e * .4, y + h + e); }
      ctx.closePath();
    };
    ctx.save();
    if (st.shake > 0) ctx.translate(Math.sin(U.t * 97) * st.shake * 5, Math.cos(U.t * 71) * st.shake * 2.5);
    ctx.save(); ctx.translate(0, 4); shape(4); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill(); ctx.restore();
    shape(4);
    const fr = ctx.createLinearGradient(0, y - 4, 0, y + h + 4);
    fr.addColorStop(0, '#323a70'); fr.addColorStop(.5, '#161b3c'); fr.addColorStop(1, '#0a0d22');
    ctx.fillStyle = fr; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke();
    shape(0); ctx.fillStyle = '#080b1c'; ctx.fill();
    /* the drained part of the bar shows fine hatching */
    U.texture(ctx, 'hatch', .12, () => shape(0), x - 4, y - 4, w + 8, h + 8);
    ctx.save(); shape(0); ctx.clip();
    const span = (a, b, fill) => {
      if (b <= a) return;
      const x0 = right ? x + w * (1 - b) : x + w * a, x1 = right ? x + w * (1 - a) : x + w * b;
      ctx.fillStyle = fill; ctx.fillRect(x0, y, x1 - x0, h);
    };
    const gh = ctx.createLinearGradient(0, y, 0, y + h); gh.addColorStop(0, '#ffffff'); gh.addColorStop(1, '#ffd98a');
    span(st.v, st.g, gh);
    const low = frac < .3, base = low ? (Math.sin(U.t * 10) > 0 ? '#ff6a4a' : '#ff2f4f') : col;
    const fg = ctx.createLinearGradient(0, y, 0, y + h);
    fg.addColorStop(0, mixHex(base, '#ffffff', .5)); fg.addColorStop(.42, base); fg.addColorStop(1, mixHex(base, '#000000', .38));
    span(0, st.v, fg);
    const sw = w * st.v;
    ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.fillRect(right ? x + w - sw : x, y + 2, sw, h * .26);
    if (st.v > .004 && st.v < .996) { ctx.fillStyle = 'rgba(255,255,255,.95)'; const ex = right ? x + w * (1 - st.v) : x + w * st.v; ctx.fillRect(ex - 1, y, 2, h); }
    const ish = ctx.createLinearGradient(0, y, 0, y + h * .5); ish.addColorStop(0, 'rgba(0,0,0,.35)'); ish.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ish; ctx.fillRect(x, y, w, h * .5);
    ctx.restore();
    /* the health left, clean white on the bar, a soft shadow under it */
    if (label !== undefined) U.disp(ctx, String(label), right ? x + w - 11 : x + 11, y + h / 2 + 1, h * .74, '#ffffff', right ? 'right' : 'left', { shadow: 'rgba(0,0,0,.55)', sy: 1.6 });
    ctx.restore();
  };
  /* the ringed medallion a portrait sits in; low on health the ring
     throbs red */
  U.medal = (ctx, x, y, r, team, ball, frac) => {
    ctx.save();
    ctx.shadowColor = team; ctx.shadowBlur = 18;
    ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.arc(x, y, r + 7, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    const rg = ctx.createLinearGradient(x, y - r, x, y + r);
    rg.addColorStop(0, mixHex(team, '#ffffff', .55)); rg.addColorStop(.5, team); rg.addColorStop(1, mixHex(team, '#000000', .45));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r + 4.5, 0, TAU); ctx.fill();
    if (frac < .3) {
      ctx.globalAlpha = .45 + .45 * Math.sin(U.t * 10);
      ctx.fillStyle = '#ff3b4d'; ctx.beginPath(); ctx.arc(x, y, r + 4.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const ig = ctx.createRadialGradient(x - r * .25, y - r * .35, 2, x, y, r);
    ig.addColorStop(0, mixHex(ball, '#ffffff', .1)); ig.addColorStop(.5, mixHex(ball, '#0a0e22', .62)); ig.addColorStop(1, '#04060e');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  };
  /* and the glass over it, drawn once the ball is in: a shadow round the
     rim, a highlight across the top, a white flash when it is hit, and a
     dark K.O. when it is out */
  U.medalGlass = (ctx, x, y, r, flash, out) => {
    ctx.save();
    const sh = ctx.createRadialGradient(x, y, r * .55, x, y, r);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const hl = ctx.createLinearGradient(0, y - r, 0, y - r * .2);
    hl.addColorStop(0, 'rgba(255,255,255,.38)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.beginPath(); ctx.ellipse(x - r * .1, y - r * .5, r * .66, r * .32, -.18, 0, TAU); ctx.fill();
    if (flash > 0) { ctx.globalAlpha = flash * .55; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (out) {
      ctx.fillStyle = 'rgba(8,4,12,.72)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      U.disp(ctx, 'K.O.', x, y + 1, r * .62, '#ff5a6e', 'center', { stroke: '#070916', lw: 4 });
    }
    ctx.restore();
  };
  /* the plate in the middle: an eight-sided badge, its edge lit orange as
     the walls close and red at sudden death */
  U.plate = (ctx, cx, y, w, h, warn, pulse) => {
    const x = cx - w / 2, c = 16;
    const path = () => {
      ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + h * .45); ctx.lineTo(x + w - c * .7, y + h);
      ctx.lineTo(x + c * .7, y + h); ctx.lineTo(x, y + h * .45); ctx.closePath();
    };
    ctx.save();
    ctx.translate(0, 4); path(); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill(); ctx.translate(0, -4);
    path();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#2c3468'); g.addColorStop(.5, '#141938'); g.addColorStop(1, '#0a0d22');
    ctx.fillStyle = g; ctx.fill();
    if (warn) { ctx.shadowColor = warn; ctx.shadowBlur = 10 + 14 * pulse; }
    ctx.lineWidth = warn ? 2.2 : 1.4; ctx.strokeStyle = warn || 'rgba(255,255,255,.24)'; path(); ctx.stroke();
    ctx.shadowBlur = 0;
    U.texture(ctx, 'grid', .06, path, x, y, w, h);
    ctx.save(); path(); ctx.clip();
    const s = ctx.createLinearGradient(0, y, 0, y + h * .5);
    s.addColorStop(0, 'rgba(255,255,255,.14)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(x, y, w, h * .5);
    ctx.restore();
    ctx.restore();
  };
  /* What a ball has grown into, under its health bar: a round badge in the
     side's colour with an arrow going up, the word, the number (white,
     upright), and six pips along the bottom that light as it grows. When
     the number changes, the plate lights up in the side's colour and the
     number jumps. */
  U.growth = (ctx, key, x, y, w, label, value, frac, right, col) => {
    const h = 27, st = U.M[key] || (U.M[key] = { v: value, f: 0 });
    if (st.v !== value) { st.v = value; st.f = 1; }
    st.f = Math.max(0, st.f - U.dt * 1.8);
    const f = st.f;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.42)'; rr(ctx, x, y + 3, w, h, 9); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#1f2650'); g.addColorStop(1, '#0a0d24');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, 9); ctx.fill();
    U.texture(ctx, 'hatch', .08, () => rr(ctx, x, y, w, h, 9), x, y, w, h);
    if (f > 0) { ctx.globalAlpha = f * .35; ctx.fillStyle = col; rr(ctx, x, y, w, h, 9); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.save();
    if (f > 0) { ctx.shadowColor = col; ctx.shadowBlur = 14 * f; }
    ctx.strokeStyle = f > .05 ? mixHex(col, '#ffffff', .3) : 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
    rr(ctx, x + .5, y + .5, w - 1, h - 1, 8.5); ctx.stroke();
    ctx.restore();
    /* the badge */
    const bx = right ? x + w - 15 : x + 15, by = y + h / 2 - 1;
    const bg = ctx.createLinearGradient(0, by - 8, 0, by + 8);
    bg.addColorStop(0, mixHex(col, '#ffffff', .35)); bg.addColorStop(1, mixHex(col, '#000000', .25));
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b1026';
    ctx.beginPath(); ctx.moveTo(bx, by - 4.2); ctx.lineTo(bx + 4.2, by + .6); ctx.lineTo(bx + 1.6, by + .6); ctx.lineTo(bx + 1.6, by + 4);
    ctx.lineTo(bx - 1.6, by + 4); ctx.lineTo(bx - 1.6, by + .6); ctx.lineTo(bx - 4.2, by + .6); ctx.closePath(); ctx.fill();
    /* the word and the number */
    U.caps(ctx, label, right ? x + w - 29 : x + 29, y + h / 2 - 1, 8.5, '#b9c3e6', right ? 'right' : 'left');
    const nx = right ? x + 11 : x + w - 11, sc = 1 + f * f * .35;
    ctx.save(); ctx.translate(nx, y + h / 2 - .5); ctx.scale(sc, sc);
    U.disp(ctx, String(value), 0, 0, 17, '#ffffff', right ? 'left' : 'right', { it: false, w: 700, shadow: 'rgba(0,0,0,.55)', sy: 1.4 });
    ctx.restore();
    /* six pips that light as it grows */
    const n = 6, px0 = x + 26, pw = (w - 38 - (n - 1) * 2) / n, lit = Math.round(clamp(frac, 0, 1) * n);
    for (let i = 0; i < n; i++) {
      const on = right ? i >= n - lit : i < lit;
      ctx.fillStyle = on ? col : 'rgba(255,255,255,.1)';
      ctx.fillRect(right ? x + 12 + i * (pw + 2) : px0 + i * (pw + 2), y + h - 5, pw, 2);
    }
    ctx.restore();
  };

  /* ---- odds and ends ---- */
  U.dice = (ctx, x, y, s, col) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.2);
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(ctx, -s / 2, -s / 2, s, s, 3); ctx.stroke();
    ctx.fillStyle = col;
    for (const [dx, dy] of [[-.22, -.22], [.22, .22], [0, 0], [.22, -.22], [-.22, .22]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, s * .08, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  U.classChip = (ctx, cls, x, y, align, alpha) => {
    const c = BB_CLASSES[cls] || BB_CLASSES.melee, w = U.capsW(ctx, c.name, 9.5) + 22;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(6,8,20,.6)'; rr(ctx, x0, y - 9, w, 18, 9); ctx.fill();
    ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(x0 + 10, y, 3.2, 0, TAU); ctx.fill();
    U.caps(ctx, c.name, x0 + 17, y + .5, 9.5, c.col);
    ctx.restore();
    return w;
  };
  return U;
}
