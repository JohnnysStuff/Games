/* ============================================================================
   BEACH VOLLEY — two on two (or one on one) on the sand against the computer

   In pixel art, in Soccer's look. The game itself is in games/volley/ —
   art-data (the sprites, generated), art, sound, court, player, rally, ai,
   beach, ui, view and match — and tests/volley.html runs those same files
   on their own for testing. The art comes from art/volley, through
   tools/volley/clean.mjs. This file is the arcade's side of it: the
   registration, and the glue. The game's menu is its front page, a game is
   a round, and the end of it is the results page, drawn in the game's own
   boxes and lettering through FrontKit's resultsPage.
   ========================================================================== */
registerGame({
  id: 'volley',
  title: 'Beach Volley',
  tagline: 'Two on two in the sand against the computer: bump, set and spike, block at the net and dive for the ones out of reach. Rally scoring to 11, 15 or 21, win by two.',
  tags: ['Sports', 'Arcade', 'Versus'],
  scoreLabel: 'Points',
  front: true,
  controls: [
    ['Move', '&larr; &uarr; &rarr; &darr; / WASD'],
    ['Pass, set, or dive for it', 'Z'],
    ['Jump: spike, or block at the net', 'X'],
    ['Aim a spike', 'arrows as you hit it'],
    ['Serve', 'hold Z and let go · X for a jump serve'],
    ['Pause', 'Esc']
  ],
  /* The game the menu sets up. The menu is the game's own, so these are
     never shown as a panel; they are here so the choice is kept, and a
     Restart or a Play again (a fresh mount, straight into a game) plays the
     same game again. */
  options: [
    { id: 'mode', label: 'Size', def: '2', choices: [{ v: '1', l: '1 on 1' }, { v: '2', l: '2 on 2' }] },
    { id: 'lvl', label: 'Computer', def: 'normal', choices: [{ v: 'easy', l: 'Easy' }, { v: 'normal', l: 'Normal' }, { v: 'hard', l: 'Hard' }] },
    { id: 'pts', label: 'Points', def: '11', choices: [{ v: '11', l: 'To 11' }, { v: '15', l: 'To 15' }, { v: '21', l: 'To 21' }] },
    { id: 'kit', label: 'Side', def: '0', choices: [{ v: '0', l: 'Suns' }, { v: '1', l: 'Corals' }, { v: '2', l: 'Waves' }, { v: '3', l: 'Palms' }] }
  ],
  /* the card: a moment from the game, painted from its own sprites */
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><image href="' + VOL_ART.card +
       '" width="320" height="180" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/></svg>',
  w: 960, h: 600,
  mount(api) { return volArcade(api); }
});

function volArcade(api) {
  const entry = api.entry, U = SocUI, C = U.C;
  let game = null, gone = false;
  const FK = FrontKit(api, { menu: false });
  const host = {
    entry,
    saved: () => ({ mode: api.opt('mode'), lvl: api.opt('lvl'), pts: api.opt('pts'), kit: api.opt('kit') }),
    save(c) { for (const k of ['mode', 'lvl', 'pts', 'kit']) api.setOpt(k, String(c[k])); },
    cursor(c) { try { if (cv.style.cursor !== c) cv.style.cursor = c; } catch (e) {} },
    play: () => api.play(),
    hub: () => api.hub(),
    /* game over: your points are the score; the rest is for the results page */
    end(r) {
      const them = r.them.name.charAt(0) + r.them.name.slice(1).toLowerCase();
      api.gameOver({
        score: r.mine, win: r.win,
        title: r.win ? 'You win' : 'You lose',
        message: r.mine + '–' + r.theirs + (r.win ? ' against the ' : ' to the ') + them,
        stats: [{ label: 'Kills', value: r.kills[0] + ' - ' + r.kills[1] }, { label: 'Aces', value: r.aces[0] + ' - ' + r.aces[1] }],
        volley: r
      });
    }
  };
  /* the sprites come with the page but still take a moment to decode */
  VolArt.load().then(() => { if (!gone) game = volMount(api, host); });

  /* ---- the results page, in the game's look ---- */
  const pxOf = size => Math.max(1.4, size / 7);
  const pix = (ctx, s, x, y, size, col, align) =>
    Hud.pix(ctx, String(s).toUpperCase(), x, y, pxOf(size), { crisp: true, align: align || 'left', baseline: 'middle', fill: col, outline: C.ink, ow: .5 });
  const THEME = {
    top: 24, gap: 18, colL: 250, colR: 400, btnH: 50, foot: 30, wide: 250, narrow: 140, statH: 52,
    veil(ctx, k) { U.rect(ctx, 0, 0, 960, 600, 'rgba(12,10,22,' + (.72 * k).toFixed(3) + ')'); },
    /* the verdict stamped in a letter at a time; the score, each side's
       name and colour on its own side of it; what you played; the best */
    hero(ctx, cx, top) {
      const R = FK.R, r = (R.res && R.res.volley) || {}, t = FK.rt();
      U.stamp(ctx, r.win ? 'YOU WIN!' : 'YOU LOSE', cx, top + 34, 6, r.win ? C.yel : C.mist, r.win ? C.ochre : C.steel, 3, t, r.win ? '#fdf07a' : null);
      const k = FK.eo(FK.rs('sub', undefined, .35)), y = top + 112;
      if (k > 0 && r.us) FK.layer(ctx, k, c => {
        U.text(c, String(r.mine), cx - 34, y, 4, r.win ? C.yel : C.rim, { thick: true });
        U.text(c, '-', cx, y, 3, C.steel);
        U.text(c, String(r.theirs), cx + 34, y, 4, !r.win ? C.yel : C.rim, { thick: true });
        const nl = Hud.pixWidth(r.us.name, 3), nr = Hud.pixWidth(r.them.name, 3);
        U.text(c, r.us.name, cx - 70, y, 3, C.rim, { align: 'right' });
        U.chip(c, cx - 70 - nl - 30, y - 8, 16, r.us.chip);
        U.text(c, r.them.name, cx + 70, y, 3, C.rim, { align: 'left' });
        U.chip(c, cx + 70 + nr + 14, y - 8, 16, r.them.chip);
        U.text(c, r.mode + ' ON ' + r.mode + '   ' + String(r.lvl || '').toUpperCase() + '   TO ' + r.pts, cx, y + 36, 2, C.grey, { outline: null });
      });
      const g = FK.rs('tag', undefined, .45), ty = y + 72;
      if (g > 0) {
        if (R.isBest) {
          const s = g < 1 ? FK.bo(g) : 1 + Math.sin(FK.t * 5) * .03;
          ctx.save(); ctx.translate(cx, ty); ctx.scale(s, s);
          U.box(ctx, -86, -16, 172, 32, { fill: C.yel, rim: C.rim, shine: '#fdf07a', base: C.ochre, shadow: false });
          U.text(ctx, 'NEW BEST', 0, 0, 3, C.ink, { thick: true, outline: null });
          ctx.restore();
        } else if (R.best > 0) FK.layer(ctx, FK.eo(g), c => U.text(c, (R.cheated ? 'NOT SAVED   ' : '') + 'BEST ' + R.best + (R.best === 1 ? ' POINT' : ' POINTS'), cx, ty, 2, C.mist));
      }
      return ty + 18 - top;
    },
    stat(ctx, st, x, y, w, h) {
      U.box(ctx, x, y, w, h, { fill: C.navy, shine: '#34344e', base: C.deep });
      U.text(ctx, String(st.label).toUpperCase(), x + 18, y + h / 2, 2, C.grey, { align: 'left' });
      U.text(ctx, String(st.value).toUpperCase(), x + w - 18, y + h / 2, 3, C.rim, { align: 'right', thick: true });
    },
    card(ctx, x, y, w, h) { U.box(ctx, x, y, w, h, { fill: C.navy, shine: '#34344e', base: C.deep }); },
    head(ctx, x, y, w) {
      pix(ctx, 'COINS', x, y, 12, C.grey);
      U.chip(ctx, x + w - 12, y - 6, 12, C.gold);
      Hud.pix(ctx, String(FK.purse()), x + w - 24, y, 3, { crisp: true, thick: true, align: 'right', baseline: 'middle', fill: C.yel, outline: C.ink });
    },
    pad: 20, headH: 42,
    ls: {
      text: pix, label: pix, measure: (ctx, s, size) => Hud.pixWidth(String(s).toUpperCase(), pxOf(size)),
      ink: C.rim, mute: C.grey, gold: C.yel, rule: 'rgba(246,241,239,.16)', bar: C.deep, fill: C.gold,
      rowH: 22, size: 13, lsize: 11, totalSize: 22, totalH: 34, xpH: 38, noteH: 20, barH: 10, barR: 0, noteGap: 96
    },
    againLabel: 'PLAY AGAIN',
    button(ctx, key, label, x, y, w, h, primary) {
      const b = FK.btn(key, x, y, w, h), lift = Math.round(b.h * 2) * 2, sq = b.p * .04;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2 - lift); ctx.scale(1 - sq, 1 + sq); ctx.translate(-(x + w / 2), -(y + h / 2));
      U.box(ctx, x, y, w, h, primary ? { fill: b.h > .5 ? C.yel : C.gold, rim: C.rim, shine: '#fdf07a', base: C.ochre }
        : { fill: b.h > .5 ? '#3a3a58' : C.deep, rim: b.h > .5 ? C.yel : C.steel, shine: '#34344e', base: '#101018' });
      U.text(ctx, label, x + w / 2, y + h / 2 - 2, 3, primary ? C.ink : C.rim, primary ? { thick: true, outline: null } : { thick: true });
      ctx.restore();
    },
    hint(ctx, cx, y) {
      const keys = [['SPACE', 'PLAY AGAIN']].concat(FK.R && FK.R.menuOk ? [['M', 'MENU']] : []);
      if (y - 18 <= 554) U.keyPanel(ctx, keys, 950, 560);
      else U.text(ctx, keys.map(k => k[0] + '  ' + k[1]).join('      '), cx, y, 2, C.grey, { outline: null });
    }
  };

  return {
    update(dt) { if (game) game.update(dt); },
    render(ctx) {
      FK.frame();
      if (!game) { U.rect(ctx, 0, 0, 960, 600, '#0c1a26'); return; }
      /* the results page has the screen: the scoreboard and controls lift away */
      game.world.hudOff = !!FK.R;
      game.render(ctx);
      if (FK.R) FK.resultsPage(ctx, 960, 600, THEME);
    },
    destroy() { gone = true; FK.done(); if (game) game.destroy(); },
    escape() { return game ? game.escape() : false; },
    results(R) { FK.showResults(R); },
    /* for tests driven from the page, as Soccer does it */
    _dev: { game: () => game, FK }
  };
}
