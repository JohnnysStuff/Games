/* ============================================================================
   SOCCER — small-sided arcade soccer against the computer

   1v1, 2v2 or 3v3 in a walled arena, in pixel art. The game itself is in
   games/soccer/ — art-data (the sprites, generated), art, sound, ball,
   player, ai, ui, view and match — and tests/soccer.html runs those same
   files on their own for testing. The art comes from art/soccer, through
   tools/soccer/clean.mjs. This file is the arcade's side of it:
   the registration, and the glue. The game's menu is its front page, a
   match is a round, and full time is the results page, drawn in the game's
   own boxes and lettering through FrontKit's resultsPage.
   ========================================================================== */
registerGame({
  id: 'soccer',
  title: 'Soccer',
  tagline: 'Quick, non-stop arcade soccer against the computer or your friends online: 1v1, 2v2 or 3v3 in a walled arena. No throw-ins and no corners — the ball comes back off the boards, and nothing stops play but a goal.',
  tags: ['Sports', 'Arcade', 'Versus'],
  scoreLabel: 'Goals',
  front: true,
  /* Online, the party plays one match: the host runs it (games/soccer/net.js)
     and everyone else steers their own player in it, the sides split
     between them and the CPU filling the rest. */
  mp: 'arena', mpMin: 2, mpMax: 6,
  controls: [
    ['Move', '&larr; &uarr; &rarr; &darr; / WASD'],
    ['Pass, or call for it', 'Z'],
    ['Shoot, or slide in', 'X'],
    ['In goal', 'X dive · Z throw · X punt'],
    ['Play with friends', 'P'],
    ['Pause', 'Esc']
  ],
  /* The match the menu sets up. The menu is the game's own, so these are
     never shown as a panel; they are here so the choice is kept, and a
     Restart or a Play again (a fresh mount, straight into a match) plays
     the same match again. */
  options: [
    { id: 'mode', label: 'Size', def: '2', choices: [{ v: '1', l: '1v1' }, { v: '2', l: '2v2' }, { v: '3', l: '3v3' }] },
    { id: 'pos', label: 'Position', def: 'fw', choices: [{ v: 'gk', l: 'Keeper' }, { v: 'df', l: 'Defender' }, { v: 'fw', l: 'Striker' }] },
    { id: 'min', label: 'Length', def: '3', choices: [{ v: '2', l: '2 min' }, { v: '3', l: '3 min' }, { v: '5', l: '5 min' }] },
    { id: 'kit', label: 'Team', def: '0', choices: [{ v: '0', l: 'Suns' }, { v: '1', l: 'Reds' }, { v: '2', l: 'Blues' }, { v: '3', l: 'Whites' }] }
  ],
  /* the card: a moment from the game, painted from its own sprites */
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><image href="' + SOC_ART.card +
       '" width="320" height="180" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/></svg>',
  w: 960, h: 600,
  mount(api) { return socArcade(api); }
});

function socArcade(api) {
  const entry = api.entry, U = SocUI, C = U.C;
  let game = null, gone = false;
  const FK = FrontKit(api, { menu: false });
  const host = {
    entry,
    saved: () => ({ mode: api.opt('mode'), pos: api.opt('pos'), kit: api.opt('kit'), min: api.opt('min') }),
    save(c) { for (const k of ['mode', 'pos', 'kit', 'min']) api.setOpt(k, c[k]); },
    cursor(c) { try { if (cv.style.cursor !== c) cv.style.cursor = c; } catch (e) {} },
    play: () => api.play(),
    hub: () => api.hub(),
    /* online: the party's match, when this mount is one (a round started
       in a party); the party itself, for the menu; and the host leaving */
    net: entry === 'play' ? getSession('soccer') : null,
    party: () => api.party,
    openParty: () => api.openParty(),
    left() { api.gameOver({ score: 0, title: 'Host left', message: 'The match ended when the host left.' }); },
    /* full time: goals are the score; the rest is for the results page */
    end(r) {
      const them = r.them.name.charAt(0) + r.them.name.slice(1).toLowerCase();
      api.gameOver({
        score: r.mine, win: r.win,
        title: r.win ? 'You win' : r.draw ? 'A draw' : 'You lose',
        message: r.mine + '–' + r.theirs + (r.win ? ' against the ' : r.draw ? ' with the ' : ' to the ') + them,
        stats: [{ label: 'Shots', value: r.shots[0] + ' - ' + r.shots[1] }, { label: 'Possession', value: r.poss[0] + '%' }],
        soccer: r
      });
    }
  };
  /* the sprites come with the page but still take a moment to decode */
  SocArt.load('').then(() => { if (!gone) game = socMount(api, host); });

  /* ---- the results page, in the game's look ---- */
  const pxOf = size => Math.max(1.4, size / 7);
  const pix = (ctx, s, x, y, size, col, align) =>
    Hud.pix(ctx, String(s).toUpperCase(), x, y, pxOf(size), { crisp: true, align: align || 'left', baseline: 'middle', fill: col, outline: C.ink, ow: .5 });
  const THEME = {
    top: 24, gap: 18, colL: 250, colR: 400, btnH: 50, foot: 30, wide: 250, narrow: 140, statH: 52,
    /* dark enough that the pitch lines behind stop competing with the words */
    veil(ctx, k) { U.rect(ctx, 0, 0, 960, 600, 'rgba(12,10,22,' + (.78 * k).toFixed(3) + ')'); },
    /* The verdict stamped in a letter at a time, like a goal's; then the
       score, each side's name and colour on its own side of it; what you
       played; and the best. Each on a line of its own, well clear of the
       next. */
    hero(ctx, cx, top) {
      const R = FK.R, r = (R.res && R.res.soccer) || {}, t = FK.rt();
      const word = r.win ? 'YOU WIN!' : r.draw ? 'DRAW' : 'YOU LOSE';
      U.stamp(ctx, word, cx, top + 34, 6, r.win ? C.yel : r.draw ? C.rim : C.mist, r.win ? C.ochre : C.steel, 3, t, r.win ? '#fdf07a' : r.draw ? null : C.rim);
      const k = FK.eo(FK.rs('sub', undefined, .35)), y = top + 112;
      if (k > 0 && r.us) FK.layer(ctx, k, c => {
        const a = String(r.mine), b = String(r.theirs);
        U.text(c, a, cx - 34, y, 4, r.win ? C.yel : C.rim, { thick: true });
        U.text(c, '-', cx, y, 3, C.steel);
        U.text(c, b, cx + 34, y, 4, !r.win && !r.draw ? C.yel : C.rim, { thick: true });
        const nl = Hud.pixWidth(r.us.name, 3), nr = Hud.pixWidth(r.them.name, 3);
        U.text(c, r.us.name, cx - 70, y, 3, C.rim, { align: 'right' });
        U.chip(c, cx - 70 - nl - 30, y - 8, 16, r.us.chip);
        U.text(c, r.them.name, cx + 70, y, 3, C.rim, { align: 'left' });
        U.chip(c, cx + 70 + nr + 14, y - 8, 16, r.them.chip);
        U.text(c, r.mode + 'V' + r.mode + '  AS ' + ({ gk: 'KEEPER', df: 'DEFENDER', fw: 'STRIKER' }[r.pos] || 'STRIKER'), cx, y + 36, 2, C.grey, { outline: null });
      });
      const g = FK.rs('tag', undefined, .45), ty = y + 72;
      if (g > 0) {
        if (R.isBest) {
          const s = g < 1 ? FK.bo(g) : 1 + Math.sin(FK.t * 5) * .03;
          ctx.save(); ctx.translate(cx, ty); ctx.scale(s, s);
          U.box(ctx, -86, -16, 172, 32, { fill: C.yel, rim: C.rim, shine: '#fdf07a', base: C.ochre, shadow: false });
          U.text(ctx, 'NEW BEST', 0, 0, 3, C.ink, { thick: true, outline: null });
          ctx.restore();
        } else if (R.best > 0) FK.layer(ctx, FK.eo(g), c => U.text(c, (R.cheated ? 'NOT SAVED   ' : '') + 'BEST ' + R.best + (R.best === 1 ? ' GOAL' : ' GOALS'), cx, ty, 2, C.mist));
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
    /* In someone else's party the next match is the host's to start: the
       big button says so, in the menu's waiting look, and does nothing */
    get againLabel() { return FK.mode() === 'guest' ? 'HOST STARTS' : 'PLAY AGAIN'; },
    /* the buttons are the menu's: Play again yellow like Kick off */
    button(ctx, key, label, x, y, w, h, primary) {
      const wait = key === 'again' && FK.mode() === 'guest';
      const b = wait ? { h: 0, p: 0 } : FK.btn(key, x, y, w, h), lift = Math.round(b.h * 2) * 2, sq = b.p * .04;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2 - lift); ctx.scale(1 - sq, 1 + sq); ctx.translate(-(x + w / 2), -(y + h / 2));
      U.box(ctx, x, y, w, h, wait ? { fill: C.deep, rim: C.steel, shine: '#34344e', base: '#101018' }
        : primary ? { fill: b.h > .5 ? C.yel : C.gold, rim: C.rim, shine: '#fdf07a', base: C.ochre }
        : { fill: b.h > .5 ? '#3a3a58' : C.deep, rim: b.h > .5 ? C.yel : C.steel, shine: '#34344e', base: '#101018' });
      U.text(ctx, label, x + w / 2, y + h / 2 - 2, 3, wait ? C.mist : primary ? C.ink : C.rim, primary && !wait ? { thick: true, outline: null } : { thick: true });
      ctx.restore();
    },
    /* the keys that do something here, bottom right like the match's own,
       if the buttons leave room */
    hint(ctx, cx, y) {
      const keys = FK.mode() === 'guest' ? [['BKSP', 'HUB']] : [['SPACE', 'PLAY AGAIN']].concat(FK.R && FK.R.menuOk ? [['M', 'MENU']] : []);
      if (y - 18 <= 554) U.keyPanel(ctx, keys, 950, 560);
      else U.text(ctx, keys.map(k => k[0] + '  ' + k[1]).join('      '), cx, y, 2, C.grey, { outline: null });
    }
  };

  return {
    update(dt) { if (game) game.update(dt); },
    render(ctx) {
      FK.frame();
      if (!game) { U.rect(ctx, 0, 0, 960, 600, '#0c120e'); return; }
      /* the results page has the screen: the scoreboard and controls lift away */
      game.world.hudOff = !!FK.R;
      game.render(ctx);
      if (FK.R) FK.resultsPage(ctx, 960, 600, THEME);
    },
    destroy() { gone = true; FK.done(); if (game) game.destroy(); },
    escape() { return game ? game.escape() : false; },
    results(R) { FK.showResults(R); },
    /* for tests driven from the page, as golf and Crossy Road do it */
    _dev: { game: () => game, FK }
  };
}
