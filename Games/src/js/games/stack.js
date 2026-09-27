/* ========================================================== STACK ========= */
/* One button. A slab slides across, you drop it, and whatever hangs over the
   edge is sliced off forever. The tower narrows to nothing and that is the
   whole game — no lives, no timer, just an accumulating mistake. */
registerGame({
  id: 'stack',
  fluid: true, maxW: 1400,
  title: 'Stack',
  tagline: 'Drop each slab on the one below. Whatever overhangs gets cut away — and it never grows back.',
  tags: ['Arcade', 'Timing', 'One button'],
  scoreLabel: 'Height',
  front: true,
  controls: [['Drop', 'Space / Click'], ['Pause', 'Esc']],
  options: [
    { id: 'speed', label: 'Slide speed', def: 'normal', choices: [
      { v: 'calm', l: 'Calm' }, { v: 'normal', l: 'Normal' }, { v: 'quick', l: 'Quick' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="stkB" cx=".5" cy=".35" r=".85"><stop offset="0" stop-color="#241a44"/><stop offset="1" stop-color="#07060f"/></radialGradient><linearGradient id="stk1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fd4ff"/><stop offset="1" stop-color="#2b7fd0"/></linearGradient><linearGradient id="stk2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8ef0a4"/><stop offset="1" stop-color="#2f9e5c"/></linearGradient><linearGradient id="stk3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#d1811d"/></linearGradient><linearGradient id="stk4" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9d90"/><stop offset="1" stop-color="#d0392c"/></linearGradient><linearGradient id="stk5" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cbb6ff"/><stop offset="1" stop-color="#7b45c6"/></linearGradient></defs><rect width="320" height="180" fill="url(#stkB)"/><g opacity=".1" stroke="#a78bfa" stroke-width="1"><path d="M0 40H320M0 80H320M0 120H320M0 160H320"/></g><ellipse cx="160" cy="168" rx="110" ry="16" fill="#000" opacity=".5"/><g><g transform="translate(160 148)"><path d="M-74 0l74-22 74 22-74 22z" fill="#1a1230" opacity=".6"/><rect x="-70" y="-16" width="140" height="20" rx="5" fill="url(#stk5)"/><rect x="-70" y="-16" width="140" height="7" rx="3.5" fill="#fff" opacity=".3"/></g><g transform="translate(158 122)"><rect x="-62" y="-16" width="124" height="20" rx="5" fill="url(#stk4)"/><rect x="-62" y="-16" width="124" height="7" rx="3.5" fill="#fff" opacity=".3"/></g><g transform="translate(163 96)"><rect x="-54" y="-16" width="108" height="20" rx="5" fill="url(#stk3)"/><rect x="-54" y="-16" width="108" height="7" rx="3.5" fill="#fff" opacity=".3"/></g><g transform="translate(157 70)"><rect x="-45" y="-16" width="90" height="20" rx="5" fill="url(#stk2)"/><rect x="-45" y="-16" width="90" height="7" rx="3.5" fill="#fff" opacity=".3"/></g><g transform="translate(168 44)"><rect x="-38" y="-16" width="76" height="20" rx="5" fill="url(#stk1)"/><rect x="-38" y="-16" width="76" height="7" rx="3.5" fill="#fff" opacity=".35"/></g></g><g transform="translate(258 62) rotate(16)" opacity=".95"><rect x="-16" y="-9" width="32" height="18" rx="4" fill="url(#stk1)"/><rect x="-16" y="-9" width="32" height="6" rx="3" fill="#fff" opacity=".3"/></g><g transform="translate(286 92) rotate(-24)" opacity=".7"><rect x="-11" y="-6" width="22" height="12" rx="3" fill="url(#stk2)"/></g></svg>',
  mount(api) {
    let W = api.W; const H = 600;
    /* the speed can be changed on the front page, so it is a variable */
    const spdOf = v => ({ calm: 210, normal: 300, quick: 400 })[v || 'normal'] || 300;
    let SPD = spdOf(api.opt('speed'));
    const BH = 26;                       // slab height
    const BASE_W = 320;

    let slabs, cur2, height, over, camY, shards, perfect;

    function reset() {
      slabs = [{ x: (W - BASE_W) / 2, w: BASE_W }];
      height = 0; over = false; camY = 0; shards = []; perfect = 0;
      nextSlab();
    }
    function nextSlab() {
      const below = slabs[slabs.length - 1];
      const dir = slabs.length % 2 ? 1 : -1;
      cur2 = { x: dir > 0 ? -below.w : W, w: below.w, v: SPD * dir * (1 + Math.min(.9, height * .02)) };
    }
    reset();

    const slabY = i => H - 90 - i * BH;

    /* ---- the front page ----
       Opened from the hub, Stack starts on its own title: a tower dropping
       into place slab by slab, the next slab sliding across its top at the
       speed you have picked (change it and the slab changes with it), and the
       name in the same thin face as the height you will be chasing. Play
       clears it away to the one base slab the game starts from. */
    const FK = FrontKit(api, {
      onOpt(id, v) { if (id === 'speed') { SPD = spdOf(v); mv = Math.sign(mv || 1) * SPD; } },
      onStart() { reset(); }
    });
    const TOWER = [[0, 300], [-14, 286], [9, 268], [-6, 252], [12, 236], [-3, 222]];
    let mx = -260, mv = SPD;
    const mHue = i => 188 + i * 23;
    function menuSlab(ctx, x, y, w, hue, sy) {
      ctx.save();
      ctx.translate(x + w / 2, y + BH);
      ctx.scale(1 + (1 - sy) * .5, sy);
      ctx.fillStyle = 'hsl(' + hue + ' 70% 55%)'; rr(ctx, -w / 2, -BH, w, BH - 2, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)'; rr(ctx, -w / 2, -BH, w, 5, 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.22)'; rr(ctx, -w / 2, -7, w, 5, 2); ctx.fill();
      ctx.restore();
    }
    function drawMenu(ctx) {
      const out = FK.out, eo = out * out, cx = W / 2, base = 404;
      ctx.save();
      ctx.globalAlpha *= 1 - out;
      /* a soft light behind the tower */
      const lg = ctx.createRadialGradient(cx, base - 60, 20, cx, base - 60, 360);
      lg.addColorStop(0, 'rgba(94,234,212,.10)'); lg.addColorStop(1, 'rgba(94,234,212,0)');
      ctx.fillStyle = lg; ctx.fillRect(cx - 360, base - 420, 720, 720);

      /* the tower, each slab dropped in turn and squashing as it lands; on
         Play it sinks away */
      TOWER.forEach((s, i) => {
        const k = FK.in(.2 + i * .1, .5);
        if (k <= 0) return;
        const f = Math.min(1, k / .7), fall = (1 - f * f) * 340;
        const sy = k > .7 ? 1 - Math.sin((k - .7) / .3 * Math.PI) * .22 : 1;
        menuSlab(ctx, cx + s[0] - s[1] / 2, base - i * BH - fall + eo * (40 + i * 18), s[1], mHue(i), sy);
      });
      /* the next slab, sliding at the chosen speed */
      const top = TOWER[TOWER.length - 1], tw = top[1];
      mx += mv * FK.dt;
      if (mv > 0 && mx > W) mv = -Math.abs(mv);
      if (mv < 0 && mx + tw < 0) mv = Math.abs(mv);
      const sk = FK.in(.9, .4);
      ctx.save(); ctx.globalAlpha *= sk;
      menuSlab(ctx, mx, base - TOWER.length * BH + eo * 60, tw, mHue(TOWER.length), 1);
      ctx.restore();

      /* the name, thin and wide, and the best under it */
      const tk = FK.eo(FK.in(0, .8));
      Hud.text(ctx, 'STACK', cx + 13, 102 + (1 - tk) * 16 - eo * 40, {
        fam: 'sans', size: 92, weight: 200, fill: '#ffffff', align: 'center', track: 26, alpha: tk, shadow: 'rgba(0,0,0,.4)', sy: 4
      });
      const bk = FK.eo(FK.in(.35, .6)), best = api.best();
      FK.caps(ctx, best > 0 ? 'Best height' : 'Drop · slice · build', cx, 158, 10, 'rgba(148,163,184,.9)', 'center', { alpha: bk, track: .32 });
      if (best > 0) Hud.text(ctx, String(best), cx, 190, { fam: 'sans', size: 40, weight: 300, fill: '#5eead4', align: 'center', alpha: bk });

      /* the one setting, and Play */
      const ck = FK.eo(FK.in(.7, .6));
      ctx.save(); ctx.globalAlpha *= ck; ctx.translate(0, (1 - ck) * 20 + eo * 30);
      FK.caps(ctx, 'Slide speed', cx, 446, 9.5, 'rgba(148,163,184,.85)', 'center', { track: .3 });
      FK.chips(ctx, 'speed', cx - 170, 458, 340, 38, [['calm', 'Calm'], ['normal', 'Normal'], ['quick', 'Quick']], {
        track: 'rgba(255,255,255,.06)', trackEdge: 'rgba(255,255,255,.1)', chip: '#ffffff', chipInk: '#0b1220',
        chipOff: 'rgba(226,232,240,.62)', face: Hud.FAM.sans, italic: false, weight: 700
      }, { def: 'normal', size: 13 });
      ctx.restore();
      const pk = FK.bo(FK.in(.85, .6));
      ctx.save(); ctx.globalAlpha *= Math.min(1, pk); ctx.translate(0, (1 - pk) * 30 + eo * 30);
      FK.button(ctx, 'play', cx - 104, 516, 208, 48, 'PLAY', {
        r: 24, fill: '#ffffff', ink: '#0b1220', shadow: 'rgba(0,0,0,.45)', gloss: false, face: Hud.FAM.sans, italic: false, weight: 700
      }, { size: 15, track: 5 });
      ctx.restore();
      FK.caps(ctx, 'Space or click drops a slab   ·   Esc for the hub', cx, 586, 9, 'rgba(148,163,184,.55)', 'center', { alpha: FK.in(1.1, .5), track: .22 });
      ctx.restore();
      FK.cursor();
    }

    function drop() {
      if (over) return;
      const below = slabs[slabs.length - 1];
      /* snapped before anything is measured, so the rest of the function sees
         a genuinely centred drop and pays the perfect bonus for it */
      if (Cheats.on('stack', 'perfect')) cur2.x = below.x;
      const off = cur2.x - below.x;
      const overlap = cur2.w - Math.abs(off);

      if (overlap <= 0) {
        if (Cheats.on('stack', 'nomiss')) {
          /* a clean miss just lands where it is, at the width it had */
          slabs.push({ x: below.x, w: below.w });
          height++;
          Sound.hit();
          nextSlab();
          return;
        }
        over = true; Sound.explode(); api.shake(10);
        shards.push({ x: cur2.x, w: cur2.w, y: slabY(slabs.length), vy: -40, vx: 0, t: 0 });
        return;
      }

      // the sliced-off piece falls away
      if (Math.abs(off) > 1.5) {
        const sx = off > 0 ? below.x + below.w : cur2.x;
        shards.push({ x: sx, w: Math.abs(off), y: slabY(slabs.length), vy: -30, vx: off > 0 ? 90 : -90, t: 0 });
        Sound.hit();
      } else {
        // dead centre keeps the full width and pays a bonus
        perfect++;
        Sound.coin();
        api.fx.text(cur2.x + cur2.w / 2, slabY(slabs.length) - 14, 'PERFECT', '#fde047', 18);
      }

      const nx = Math.max(cur2.x, below.x);
      slabs.push({ x: nx, w: Math.abs(off) > 1.5 ? overlap : below.w });
      height++;
      api.fx.burst(nx + overlap / 2, slabY(slabs.length - 1), { color: '#7dd3fc', count: 6, speed: 120, size: 3, life: .35 });
      nextSlab();
    }

    /* ---- the results ----
       In the title's own thin, wide face: the verdict tracked out across the
       top, the height the tower reached as one big figure — the number the
       whole game is about — with the best under it, and the coins and the
       level on a glass card beside what the run did. Pill buttons, as on the
       front page. */
    const SANS = { r: 25, fill: '#ffffff', ink: '#0b1220', shadow: 'rgba(0,0,0,.45)', gloss: false, face: Hud.FAM.sans, italic: false, weight: 700 };
    const GHOST = { r: 25, fill: 'rgba(255,255,255,.06)', ink: '#e2e8f0', shadow: false, gloss: false, edge: 'rgba(255,255,255,.24)', face: Hud.FAM.sans, italic: false, weight: 700 };
    const RES = {
      veil(ctx, k) {
        ctx.fillStyle = 'rgba(4,6,12,' + (.74 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
        const lg = ctx.createRadialGradient(W / 2, 150, 10, W / 2, 150, 360);
        lg.addColorStop(0, 'rgba(94,234,212,' + (.1 * k).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(94,234,212,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      },
      hero(ctx, cx, top) {
        const R = FK.R, big = R.paid.length > 4 ? 76 : 96;
        const k = FK.eo(FK.rs('title', undefined, .6));
        Hud.text(ctx, String(R.title).toUpperCase(), cx + 9, top + 22 + (1 - k) * 12, {
          fam: 'sans', size: 34, weight: 200, fill: '#ffffff', align: 'center', track: 18, alpha: k
        });
        if (R.message) FK.caps(ctx, R.message, cx, top + 56, 9.5, 'rgba(148,163,184,.85)', 'center', { alpha: k, track: .24 });
        const hk = FK.eo(FK.rs('stat', 0, .6)), v = Math.round(R.score * FK.eo(FK.rs('stat', 0, 1)));
        const ny = top + 82 + big * .55;
        Hud.text(ctx, String(v), cx, ny, { fam: 'sans', size: big, weight: 200, fill: '#5eead4', align: 'center', alpha: hk, shadow: 'rgba(0,0,0,.45)', sy: 4 });
        FK.caps(ctx, R.scoreLabel, cx, ny + big * .56, 9.5, 'rgba(148,163,184,.9)', 'center', { alpha: hk, track: .32 });
        const bk = FK.bo(FK.rs('tag', undefined, .5)), by = ny + big * .56 + 24;
        if (R.isBest) {
          ctx.save(); ctx.translate(cx, by); ctx.scale(bk, bk);
          ctx.fillStyle = 'rgba(94,234,212,.14)'; rr(ctx, -52, -12, 104, 24, 12); ctx.fill();
          ctx.strokeStyle = 'rgba(94,234,212,.6)'; ctx.lineWidth = 1; rr(ctx, -51.5, -11.5, 103, 23, 12); ctx.stroke();
          FK.caps(ctx, 'New best', 0, 1, 9.5, '#5eead4', 'center', { track: .3 });
          ctx.restore();
        } else FK.caps(ctx, (R.cheated ? 'Not saved  ·  ' : '') + 'Best ' + R.best, cx, by, 9.5, 'rgba(148,163,184,.8)', 'center', { alpha: Math.min(1, bk), track: .3 });
        return by + 14 - top;
      },
      stat(ctx, st, x, y, w, h) {
        ctx.fillStyle = 'rgba(255,255,255,.04)'; rr(ctx, x, y, w, h, 14); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, 14); ctx.stroke();
        FK.caps(ctx, st.label, x + 16, y + h / 2, 9, 'rgba(148,163,184,.85)', 'left', { track: .26 });
        Hud.text(ctx, String(st.value), x + w - 16, y + h / 2 + 1, { fam: 'sans', size: 26, weight: 300, fill: '#ffffff', align: 'right' });
      },
      card(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(255,255,255,.04)'; rr(ctx, x, y, w, h, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, 16); ctx.stroke();
      },
      ls: FK.ledgerStyle({
        face: Hud.FAM.sans, weight: 500, ink: '#e2e8f0', mute: 'rgba(148,163,184,.85)', gold: '#fcd34d',
        rule: 'rgba(255,255,255,.1)', bar: 'rgba(255,255,255,.08)', fill: '#5eead4',
        rowH: 24, size: 14, lsize: 9.5, totalSize: 30, totalH: 42, xpH: 42, barH: 5, track: .26
      }),
      button(ctx, key, label, x, y, w, h, primary) { FK.button(ctx, key, x, y, w, h, label, primary ? SANS : GHOST, { size: 13, track: 4 }); },
      hint(ctx, cx, y) { FK.caps(ctx, 'Space to play again   ·   Esc for the hub', cx, y, 8.5, 'rgba(148,163,184,.5)', 'center', { track: .22 }); }
    };

    return {
      /* the stage is fluid — pick up the new width */
      resize() { W = api.W; },
      update(dt) {
        /* on the front page the menu has the keys */
        if (FK.on) { FK.input(api.input); return; }
        for (let i = shards.length - 1; i >= 0; i--) {
          const s = shards[i];
          s.t += dt; s.vy += 900 * dt; s.y += s.vy * dt; s.x += s.vx * dt;
          if (s.y > H + 120) shards.splice(i, 1);
        }

        if (over) {
          api.hud({ Height: height, Perfect: perfect });
          api.gameOver({
            score: height,
            title: 'Toppled',
            message: height > 20 ? 'That was a real tower.' : 'The overhang always wins eventually.',
            stats: [{ label: 'Perfect drops', value: perfect }]
          });
          return;
        }

        cur2.x += cur2.v * dt * (Cheats.on('stack', 'slow') ? .5 : 1);
        if (cur2.v > 0 && cur2.x > W) cur2.v = -Math.abs(cur2.v);
        if (cur2.v < 0 && cur2.x + cur2.w < 0) cur2.v = Math.abs(cur2.v);

        const I = api.input;
        if (I.anyPressed('Space') || I.takeClick()) drop();

        // the camera follows once the tower reaches the middle of the screen
        const want = Math.max(0, (height - 8) * BH);
        camY += (want - camY) * Math.min(1, dt * 6);

        api.hud({ Height: height, Perfect: perfect });
      },

      render(ctx) {
        FK.frame();
        boardBg(ctx, W, H, '#0b1220', '#04060c');
        /* the game comes up as the menu goes */
        if (FK.out > 0) {
        ctx.save(); ctx.globalAlpha *= FK.out;
        ctx.save();
        ctx.translate(0, camY);

        for (let i = 0; i < slabs.length; i++) {
          const s = slabs[i], y = slabY(i);
          if (y + camY > H + 40 || y + camY < -60) continue;
          const hue = (i * 26) % 360;
          ctx.fillStyle = 'hsl(' + hue + ' 70% 52%)';
          rr(ctx, s.x, y, s.w, BH - 2, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.16)';
          rr(ctx, s.x, y, s.w, 5, 2); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.22)';
          rr(ctx, s.x, y + BH - 7, s.w, 5, 2); ctx.fill();
        }

        if (!over) {
          const y = slabY(slabs.length);
          const hue = (slabs.length * 26) % 360;
          ctx.fillStyle = 'hsl(' + hue + ' 75% 58%)';
          rr(ctx, cur2.x, y, cur2.w, BH - 2, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.2)';
          rr(ctx, cur2.x, y, cur2.w, 5, 2); ctx.fill();
          // a guide line down from the moving slab, so timing is readable
          ctx.strokeStyle = 'rgba(125,211,252,.18)'; ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(cur2.x + cur2.w / 2, y + BH); ctx.lineTo(cur2.x + cur2.w / 2, y + BH + 60);
          ctx.stroke(); ctx.setLineDash([]);
        }

        for (const s of shards) {
          ctx.fillStyle = 'rgba(148,163,184,' + Math.max(0, 1 - s.t) + ')';
          rr(ctx, s.x, s.y, s.w, BH - 2, 3); ctx.fill();
        }

        ctx.restore();
        /* ---- the height, the way this kind of game says it ----
           One thin figure, high and centred, with the run of perfect drops
           under it in the colour they are scored in. */
        const hudA = FK.R ? 1 - FK.eo(FK.rs('title', undefined, .3)) : 1;
        Hud.text(ctx, String(height), W / 2, 96, {
          fam: 'sans', size: 78, weight: 200, fill: '#ffffff', align: 'center',
          alpha: .93 * hudA, shadow: 'rgba(0,0,0,.45)', sy: 3
        });
        if (perfect > 0) {
          Hud.text(ctx, perfect + ' PERFECT', W / 2, 142, {
            fam: 'sans', size: 12, weight: 700, fill: '#5eead4', align: 'center', track: 3
          });
        }
        if (!height && !FK.R) panelText(ctx, W / 2, 190, 'SPACE or CLICK to drop', 13, P.ink3, 'center', 700);
        ctx.restore();
        }
        if (FK.out < 1) drawMenu(ctx);
        if (FK.R) FK.resultsPage(ctx, W, H, RES);
      },
      /* Escape on the front page goes back to the hub; in a game it pauses */
      escape: FK.escape,
      destroy() { FK.done(); },
      results(R) { FK.showResults(R); }
    };
  }
});

/*[[GAMES]]*/

