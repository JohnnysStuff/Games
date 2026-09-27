/* ========================================================= BREAKOUT ====== */
registerGame({
  id: 'bricks',
  title: 'Breakout',
  tagline: 'Eight levels, falling power-ups and a paddle that angles the ball by where it lands. Race friends online.',
  tags: ['Arcade', 'Skill', 'Online'],
  scoreLabel: 'Score',
  mp: 'race',
  front: true,
  controls: [['Move paddle', 'Mouse / &larr; &rarr;'], ['Launch &amp; fire', 'Space / Click'], ['Pause', 'Esc']],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="brB" cx=".5" cy=".4" r=".85"><stop offset="0" stop-color="#16244a"/><stop offset="1" stop-color="#05070f"/></radialGradient><linearGradient id="brR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8f7a"/><stop offset="1" stop-color="#cc3624"/></linearGradient><linearGradient id="brO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc678"/><stop offset="1" stop-color="#d1811d"/></linearGradient><linearGradient id="brG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ef0a4"/><stop offset="1" stop-color="#2f9e5c"/></linearGradient><linearGradient id="brC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd8ff"/><stop offset="1" stop-color="#2c86c8"/></linearGradient><radialGradient id="brBall" cx=".34" cy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e8f6ff"/><stop offset="1" stop-color="#84b8e0"/></radialGradient></defs><rect width="320" height="180" fill="url(#brB)"/><g><rect x="16" y="16" width="62" height="24" rx="6" fill="url(#brR)"/><rect x="20" y="20" width="46" height="8" rx="4" fill="#fff" opacity=".3"/><rect x="84" y="16" width="62" height="24" rx="6" fill="url(#brO)"/><rect x="88" y="20" width="46" height="8" rx="4" fill="#fff" opacity=".3"/><rect x="152" y="16" width="62" height="24" rx="6" fill="url(#brG)"/><rect x="156" y="20" width="46" height="8" rx="4" fill="#fff" opacity=".3"/><rect x="220" y="16" width="62" height="24" rx="6" fill="url(#brC)"/><rect x="224" y="20" width="46" height="8" rx="4" fill="#fff" opacity=".3"/><rect x="16" y="46" width="62" height="24" rx="6" fill="url(#brO)"/><rect x="20" y="50" width="46" height="8" rx="4" fill="#fff" opacity=".3"/><rect x="84" y="46" width="62" height="24" rx="6" fill="url(#brG)"/><rect x="88" y="50" width="46" height="8" rx="4" fill="#fff" opacity=".3"/><rect x="220" y="46" width="62" height="24" rx="6" fill="url(#brR)"/><rect x="224" y="50" width="46" height="8" rx="4" fill="#fff" opacity=".3"/></g><g fill="#8fd8ff"><rect x="156" y="48" width="13" height="13" rx="3" transform="rotate(18 162 54)" opacity=".9"/><rect x="192" y="42" width="10" height="10" rx="2.5" transform="rotate(-24 197 47)" opacity=".75"/><rect x="176" y="72" width="9" height="9" rx="2.5" transform="rotate(36 180 76)" opacity=".6"/></g><circle cx="176" cy="96" r="34" fill="#bfe9ff" opacity=".13"/><circle cx="176" cy="96" r="19" fill="url(#brBall)"/><ellipse cx="170" cy="89" rx="7" ry="5" fill="#fff" opacity=".9" transform="rotate(-30 170 89)"/><g><rect x="106" y="142" width="112" height="16" rx="8" fill="#06101f" opacity=".55"/><rect x="104" y="138" width="112" height="16" rx="8" fill="url(#brC)"/><rect x="110" y="142" width="60" height="5" rx="2.5" fill="#fff" opacity=".45"/></g></svg>',
  mount(api) {
    const W = 960, H = 600, BW = 70, BH = 26, GX = 6, GY = 7, OX = 27, OY = 66;
    const COLS = 12, PY = 548, PH = 15;
    const RACE = getRace('bricks');
    const LEVELS = [
      ['111111111111', '222222222222', '111111111111'],
      ['.....22.....', '....2222....', '...333333...', '..33333333..', '.1111111111.'],
      ['1.1.1.1.1.1.', '.2.2.2.2.2.2', '1.1.1.1.1.1.', '.2.2.2.2.2.2', '3.3.3.3.3.3.'],
      ['XX22222222XX', '..33333333..', '..3111113...', '..33333333..', 'XX22222222XX'],
      ['1X1X1X1X1X1X', '111111111111', '2X2X2X2X2X2X', '222222222222', '3X3X3X3X3X3X'],
      ['...222222...', '..33333333..', '.3311111133.', '.33......33.', '.11......11.'],
      ['333333333333', '22XXXXXXXX22', '222222222222', '11XXXXXXXX11', '111111111111', '333333333333'],
      ['333333333333', '3X33333333X3', '322222222223', '32X222222X23', '321111111123', '333333333333']
    ];
    const ROWC = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#facc15'];
    const PU = {
      W: { c: '#38bdf8', label: 'WIDE' }, M: { c: '#a78bfa', label: 'MULTI' },
      S: { c: '#34d399', label: 'SLOW' }, L: { c: '#f87171', label: 'LASER' }
    };

    let lvl = 0, bricks = [], balls = [], drops = [], bolts = [];
    let px = W / 2, pw = 120, lives = 3, score = 0, stuck = true;
    let wideT = 0, slowT = 0, laserT = 0, fireCd = 0, dead = 0, ending = false, won = false;
    /* the readout's heart, and when the last one went (for its shudder) */
    const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    let lostAt = -9;

    function buildLevel() {
      bricks = [];
      const rows = LEVELS[lvl % LEVELS.length];
      rows.forEach((row, r) => {
        for (let c = 0; c < COLS; c++) {
          const ch = row[c];
          if (!ch || ch === '.') continue;
          bricks.push({
            x: OX + c * (BW + GX), y: OY + r * (BH + GY), w: BW, h: BH,
            hp: ch === 'X' ? Infinity : parseInt(ch, 10),
            max: ch === 'X' ? Infinity : parseInt(ch, 10),
            solid: ch === 'X', color: ROWC[r % ROWC.length]
          });
        }
      });
    }
    function resetBall() {
      balls = [{ x: px, y: PY - 12, vx: 0, vy: 0, r: 8, sp: 420 + lvl * 16 }];
      stuck = true; drops = []; bolts = [];
      wideT = 0; slowT = 0; laserT = 0; pw = 120;
    }
    buildLevel(); resetBall();
    /* ---- the front page ----
       Opened from the hub, the table plays itself the way a cabinet runs its
       attract loop: a paddle that knows what it is doing keeps a ball going
       against the first wall, under the name in brick colours. Nothing it
       does scores, sounds or costs a life, and Play rebuilds the wall and puts
       the ball on your paddle. Online the race starts at once. */
    const FK = FrontKit(api, {
      online: !!RACE, mp: true,
      onStart() { lvl = 0; score = 0; lives = 3; demoFx = []; buildLevel(); resetBall(); }
    });
    let demoT = 0, demoFx = [];
    if (FK.on) serve();

    function launch() {
      if (!stuck) return;
      stuck = false;
      const b = balls[0], a = rand(-0.45, 0.45) - Math.PI / 2;
      b.vx = Math.cos(a) * b.sp; b.vy = Math.sin(a) * b.sp;
      Sound.blip();
    }
    function remaining() { return bricks.filter(b => !b.solid).length; }

    function breakBrick(b, i) {
      b.hp--;
      if (b.hp > 0) { Sound.hit(); api.fx.burst(b.x + b.w / 2, b.y + b.h / 2, { color: b.color, count: 5, speed: 130, size: 3, life: .3 }); return; }
      bricks.splice(i, 1);
      score += 25 + lvl * 5; Sound.hit(); api.shake(1.6);
      api.fx.burst(b.x + b.w / 2, b.y + b.h / 2, { color: b.color, count: 14, speed: 230, size: 5, life: .55, square: true });
      if (Math.random() < .14) {
        const t = pick(['W', 'M', 'S', 'L']);
        drops.push({ x: b.x + b.w / 2 - 15, y: b.y, w: 30, h: 30, t });
      }
      if (remaining() === 0) nextLevel();
    }
    function nextLevel() {
      score += 500;
      lvl++;
      if (lvl >= LEVELS.length) { won = true; ending = true; dead = 0; Sound.win(); return; }
      Sound.win(); buildLevel(); resetBall();
      api.fx.text(W / 2, H / 2, 'LEVEL ' + (lvl + 1), '#fbbf24', 40);
    }
    function loseLife() {
      lives--; Sound.fail(); api.shake(10); lostAt = performance.now() / 1000;
      if (lives <= 0) { ending = true; dead = 0; return; }
      resetBall();
    }

    return {
      update(dt) {
        /* on the front page the menu has the keys, and the table plays itself */
        if (FK.on) { FK.input(api.input); if (FK.on) demo(dt); return; }
        if (ending) {
          dead += dt;
          if (dead > .9) {
            if (RACE) RACE.finish(score);
            api.gameOver({
              score, win: won,
              title: won ? 'All levels cleared' : (RACE ? raceTitle(RACE, 'Game Over') : 'Game Over'),
              message: won ? 'You beat all 8 levels.' : 'Reached level ' + (lvl + 1) + ' of ' + LEVELS.length,
              stats: [{ label: 'Level', value: (lvl + 1) + '/' + LEVELS.length }, { label: 'Lives left', value: Math.max(0, lives) }]
                .concat(RACE ? raceStats(RACE, score) : [])
            });
          }
          return;
        }
        const I = api.input;
        pw = wideT > 0 ? 180 : 120;
        if (I.pointer.inside) px = approach(px, I.pointer.x, 2400 * dt);
        if (I.any('ArrowLeft', 'KeyA')) px -= 700 * dt;
        if (I.any('ArrowRight', 'KeyD')) px += 700 * dt;
        px = clamp(px, pw / 2, W - pw / 2);

        if (I.anyPressed('Space') || I.takeClick()) { launch(); if (laserT > 0 && fireCd <= 0) fireLaser(); }
        if (wideT > 0) wideT -= dt;
        if (slowT > 0) slowT -= dt;
        if (laserT > 0) { laserT -= dt; fireCd -= dt; if (I.down('Space') && fireCd <= 0) fireLaser(); }

        if (stuck) { balls[0].x = px; balls[0].y = PY - 12; }

        const tScale = slowT > 0 ? .62 : 1;
        for (let bi = balls.length - 1; bi >= 0; bi--) {
          const b = balls[bi];
          if (stuck) break;
          const steps = 2;
          for (let s = 0; s < steps; s++) {
            b.x += b.vx * dt * tScale / steps;
            b.y += b.vy * dt * tScale / steps;
            if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); Sound.blip(); }
            if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); Sound.blip(); }
            if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); Sound.blip(); }
            // paddle
            if (b.vy > 0 && b.y + b.r >= PY && b.y - b.r < PY + PH && b.x > px - pw / 2 - 6 && b.x < px + pw / 2 + 6) {
              b.y = PY - b.r;
              const off = clamp((b.x - px) / (pw / 2), -1, 1);
              const ang = off * 1.02 - Math.PI / 2;
              b.sp = Math.min(760, b.sp + 6);
              b.vx = Math.cos(ang) * b.sp; b.vy = Math.sin(ang) * b.sp;
              Sound.hit();
              api.fx.burst(b.x, PY, { color: '#5b8cff', count: 6, speed: 160, size: 3, life: .3, angle: -Math.PI / 2, spread: 2 });
            }
            // bricks
            for (let i = bricks.length - 1; i >= 0; i--) {
              const k = bricks[i];
              if (b.x + b.r < k.x || b.x - b.r > k.x + k.w || b.y + b.r < k.y || b.y - b.r > k.y + k.h) continue;
              const ox = Math.min(b.x + b.r - k.x, k.x + k.w - (b.x - b.r));
              const oy = Math.min(b.y + b.r - k.y, k.y + k.h - (b.y - b.r));
              if (ox < oy) { b.vx = -b.vx; b.x += b.vx > 0 ? ox : -ox; }
              else { b.vy = -b.vy; b.y += b.vy > 0 ? oy : -oy; }
              if (!k.solid) breakBrick(k, i); else Sound.blip();
              break;
            }
          }
          if (b.y - b.r > H) {
            balls.splice(bi, 1);
            if (!balls.length) { loseLife(); return; }
          }
        }
        // powerup drops
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += 165 * dt;
          if (d.y > H) { drops.splice(i, 1); continue; }
          if (d.y + d.h > PY && d.y < PY + PH && d.x + d.w > px - pw / 2 && d.x < px + pw / 2) {
            drops.splice(i, 1); score += 50; Sound.pickup();
            api.fx.text(px, PY - 24, PU[d.t].label, PU[d.t].c, 18);
            if (d.t === 'W') wideT = 15;
            else if (d.t === 'S') slowT = 9;
            else if (d.t === 'L') { laserT = 12; fireCd = 0; }
            else if (d.t === 'M') {
              const src = balls[0];
              for (let k = 0; k < 2; k++) {
                const a = Math.atan2(src.vy, src.vx) + (k ? .5 : -.5);
                balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * src.sp, vy: Math.sin(a) * src.sp, r: 8, sp: src.sp });
              }
            }
          }
        }
        // laser bolts
        for (let i = bolts.length - 1; i >= 0; i--) {
          const z = bolts[i];
          z.y -= 780 * dt;
          if (z.y < -20) { bolts.splice(i, 1); continue; }
          for (let j = bricks.length - 1; j >= 0; j--) {
            const k = bricks[j];
            if (z.x > k.x && z.x < k.x + k.w && z.y < k.y + k.h && z.y > k.y) {
              bolts.splice(i, 1);
              if (!k.solid) breakBrick(k, j); else Sound.blip();
              break;
            }
          }
        }
        if (RACE) RACE.report(score, !ending, lvl + 1);
        api.hud({ Score: fmt(score), Lives: Math.max(0, lives), Level: (lvl + 1) + '/' + LEVELS.length, Balls: balls.length });
      },
      render(ctx) {
        FK.frame();
        boardBg(ctx, W, H, '#1a1730', '#0b0a16');
        /* the readout comes up as the menu goes */
        const rsk = FK.R ? FK.eo(FK.rs('title', undefined, .3)) : 0;
        if (FK.out > 0 && rsk < 1) { ctx.save(); ctx.globalAlpha *= FK.out * (1 - rsk); drawCabinet(ctx); ctx.restore(); }
        for (const k of bricks) {
          const c = k.solid ? '#64748b' : k.color;
          const alpha = k.solid ? 1 : (k.hp / k.max) * .45 + .55;
          ctx.globalAlpha = alpha;
          const g = ctx.createLinearGradient(k.x, k.y, k.x, k.y + k.h);
          g.addColorStop(0, shade(c, .22)); g.addColorStop(1, c);
          ctx.fillStyle = g; rr(ctx, k.x, k.y, k.w, k.h, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(ctx, k.x + 3, k.y + 3, k.w - 6, 4, 2); ctx.fill();
          ctx.globalAlpha = 1;
          if (k.solid) {
            ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
            rr(ctx, k.x + 1.5, k.y + 1.5, k.w - 3, k.h - 3, 3); ctx.stroke();
          } else if (k.max > 1) {
            panelText(ctx, k.x + k.w / 2, k.y + k.h / 2, k.hp, 12, 'rgba(0,0,0,.55)', 'center', 800);
          }
        }
        for (const d of drops) {
          const p = PU[d.t];
          ctx.save(); ctx.shadowColor = p.c; ctx.shadowBlur = 12;
          ctx.fillStyle = p.c; rr(ctx, d.x, d.y, d.w, d.h, 7); ctx.fill(); ctx.restore();
          Hud.pix(ctx, d.t, d.x + d.w / 2, d.y + d.h / 2, 2.2, { align: 'center', baseline: 'middle', thick: true, fill: 'rgba(0,0,0,.72)' });
        }
        ctx.fillStyle = '#f87171';
        for (const z of bolts) { rr(ctx, z.x - 2, z.y, 4, 16, 2); ctx.fill(); }
        // paddle
        const pg = ctx.createLinearGradient(0, PY, 0, PY + PH);
        pg.addColorStop(0, '#93b4ff'); pg.addColorStop(1, '#3b6ef5');
        ctx.save(); ctx.shadowColor = '#5b8cff'; ctx.shadowBlur = 14;
        ctx.fillStyle = pg; rr(ctx, px - pw / 2, PY, pw, PH, 7); ctx.fill(); ctx.restore();
        if (laserT > 0) {
          ctx.fillStyle = '#f87171';
          rr(ctx, px - pw / 2 + 4, PY - 5, 6, 6, 2); ctx.fill();
          rr(ctx, px + pw / 2 - 10, PY - 5, 6, 6, 2); ctx.fill();
        }
        ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.fillStyle = '#f8fafc';
        for (const b of balls) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
        ctx.restore();
        // active buff strip
        const buffs = [];
        if (wideT > 0) buffs.push(['WIDE', '#38bdf8', wideT / 15]);
        if (slowT > 0) buffs.push(['SLOW', '#34d399', slowT / 9]);
        if (laserT > 0) buffs.push(['LASER', '#f87171', laserT / 12]);
        buffs.forEach((b, i) => {
          const bx = 16, by = H - 30 - i * 22;
          ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, bx, by, 92, 17, 5); ctx.fill();
          ctx.fillStyle = b[1]; rr(ctx, bx, by, 92 * b[2], 17, 5); ctx.fill();
          Hud.pix(ctx, b[0], bx + 46, by + 9, 1.6, { align: 'center', baseline: 'middle', fill: '#ffffff' });
        });
        if (stuck && !FK.on && !FK.R) {
          ctx.globalAlpha = .55 + Math.sin(performance.now() / 250) * .25;
          Hud.pix(ctx, 'SPACE OR CLICK TO LAUNCH', W / 2, PY - 54, 2.4, { align: 'center', baseline: 'middle', fill: '#93a0b5' });
          ctx.globalAlpha = 1;
        }
        if (RACE && !FK.R) raceBoard(ctx, W - 214, 14, RACE, { title: 'RACE' });
        if (FK.out < 1) { drawDemoFx(ctx); drawMenu(ctx); }
        if (FK.R) drawResults(ctx);
      },
      /* Escape on the front page goes back to the hub; in a game it pauses */
      escape: FK.escape,
      destroy() { FK.done(); },
      /* the round is over: the results page is the cabinet's own */
      results(R) { FK.showResults(R); }
    };
    /* ---- the cabinet readout ----
       Three columns across the top, each a small label over a big figure, so
       no label ever sits on its number: the score padded the way an arcade
       machine pads it, the stage, and the lives as hearts — spent ones stay
       behind as empty sockets, so you can see how many you had. */
    function heart(ctx, x, y, p, full, pulse) {
      const s = pulse || 1;
      ctx.save();
      ctx.translate(x + 3.5 * p, y + 3 * p); ctx.scale(s, s); ctx.translate(-3.5 * p, -3 * p);
      const cellsAt = (dx, dy, col) => {
        ctx.fillStyle = col;
        HEART.forEach((row, r) => { for (let c = 0; c < 7; c++) if (row[c] === '#') ctx.fillRect(c * p + dx, r * p + dy, p, p); });
      };
      if (full) {
        cellsAt(0, p, 'rgba(0,0,0,.45)');
        cellsAt(0, 0, '#f43f5e');
        ctx.fillStyle = '#fb7185'; ctx.fillRect(p, p, p, p); ctx.fillRect(4 * p, p, p, p);
        ctx.fillStyle = '#ffe4e6'; ctx.fillRect(p, p, p * .5, p * .5);
        ctx.fillStyle = '#be123c'; ctx.fillRect(3 * p, 4 * p, p, p);
      } else cellsAt(0, 0, 'rgba(233,238,247,.13)');
      ctx.restore();
    }
    function drawCabinet(ctx) {
      const pad = String(Math.max(0, Math.round(score))).padStart(6, '0');
      const LBL = 'rgba(233,238,247,.45)';
      Hud.pix(ctx, 'SCORE', 22, 10, 2, { fill: LBL });
      Hud.pix(ctx, pad, 22, 28, 3.4, { thick: true, fill: '#fbbf24', outline: '#1a1206' });
      Hud.pix(ctx, 'STAGE', W / 2, 10, 2, { fill: LBL, align: 'center' });
      Hud.pix(ctx, (lvl + 1) + '/' + LEVELS.length, W / 2, 28, 3.4, { thick: true, fill: '#e9eef7', outline: '#0b0a16', align: 'center' });
      /* an extra ball on the table is worth saying out loud */
      if (balls.length > 1) Hud.pix(ctx, 'MULTIBALL X' + balls.length, W / 2 + 70, 34, 2,
                                    { fill: '#a78bfa', baseline: 'middle' });
      Hud.pix(ctx, 'LIVES', W - 22, 10, 2, { fill: LBL, align: 'right' });
      const slots = Math.max(3, Math.min(6, lives)), p = 4, hw = 7 * p + 6;
      const since = performance.now() / 1000 - lostAt;
      for (let i = 0; i < slots; i++) {
        const x = W - 22 - (slots - i) * hw + 6;
        /* the heart that just went empties with a little shudder */
        const going = i === lives && since < .5;
        heart(ctx, x + (going ? Math.sin(since * 60) * 2 * (1 - since * 2) : 0), 28, p, i < lives, going ? 1 + (.5 - since) * .5 : 1);
      }
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(16, 60, W - 32, 2);
    }
    function serve() {
      const b = balls[0], a = -Math.PI / 2 + rand(-.55, .55);
      stuck = false; b.x = px; b.y = PY - 14; b.vx = Math.cos(a) * 470; b.vy = Math.sin(a) * 470;
    }
    /* The attract loop: the same wall and the same bounce off the paddle, with
       the paddle steered to where the ball will come down (folded off the side
       walls) plus a slow drift, so no two rallies look alike. */
    function demo(dt) {
      demoT += dt;
      const b = balls[0];
      if (!b) { resetBall(); serve(); return; }
      let tx = W / 2;
      if (b.vy > 0) {
        const t = (PY - b.r - b.y) / b.vy, span = W - 2 * b.r;
        let x = b.x - b.r + b.vx * t;
        x = ((x % (2 * span)) + 2 * span) % (2 * span);
        tx = (x > span ? 2 * span - x : x) + b.r + Math.sin(demoT * 1.7) * pw * .32;
      }
      px = clamp(approach(px, tx, 1500 * dt), pw / 2, W - pw / 2);
      for (let s = 0; s < 2; s++) {
        b.x += b.vx * dt / 2; b.y += b.vy * dt / 2;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + b.r >= PY && b.y - b.r < PY + PH && b.x > px - pw / 2 - 6 && b.x < px + pw / 2 + 6) {
          b.y = PY - b.r;
          const off = clamp((b.x - px) / (pw / 2), -1, 1), ang = off * 1.02 - Math.PI / 2, sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
        }
        for (let i = bricks.length - 1; i >= 0; i--) {
          const k = bricks[i];
          if (b.x + b.r < k.x || b.x - b.r > k.x + k.w || b.y + b.r < k.y || b.y - b.r > k.y + k.h) continue;
          const ox = Math.min(b.x + b.r - k.x, k.x + k.w - (b.x - b.r));
          const oy = Math.min(b.y + b.r - k.y, k.y + k.h - (b.y - b.r));
          if (ox < oy) { b.vx = -b.vx; b.x += b.vx > 0 ? ox : -ox; }
          else { b.vy = -b.vy; b.y += b.vy > 0 ? oy : -oy; }
          if (!k.solid) { bricks.splice(i, 1); demoFx.push({ x: k.x, y: k.y, w: k.w, h: k.h, c: k.color, t: 0 }); }
          break;
        }
      }
      if (b.y - b.r > H || remaining() === 0) { buildLevel(); px = W / 2; serve(); }
    }
    /* a knocked-out brick swells and fades where it stood, under the veil */
    function drawDemoFx(ctx) {
      for (let i = demoFx.length - 1; i >= 0; i--) {
        const f = demoFx[i];
        f.t += FK.dt;
        const e = f.t / .45;
        if (e >= 1) { demoFx.splice(i, 1); continue; }
        const s = 1 + e * .5;
        ctx.save();
        ctx.globalAlpha *= (1 - e) * .9;
        ctx.translate(f.x + f.w / 2, f.y + f.h / 2); ctx.scale(s, s);
        ctx.strokeStyle = f.c; ctx.lineWidth = 3 - e * 2;
        rr(ctx, -f.w / 2, -f.h / 2, f.w, f.h, 5); ctx.stroke();
        ctx.restore();
      }
    }
    /* ---- the front page ---- */
    function brickFace(label, px, ink) {
      return (c, w, h) => {
        c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, -w / 2 + 6, -h / 2 + 5, w - 12, 6, 3); c.fill();
        Hud.pix(c, label, 0, 2, px, { thick: true, align: 'center', baseline: 'middle', fill: ink });
      };
    }
    function drawMenu(ctx) {
      /* the buttons are bricks off the wall: a face, the highlight strip every
         brick has, a dark edge and a drop shadow (declared in here, as this
         sits below the mount's return) */
      const BRICK = { r: 8, shadow: 'rgba(0,0,0,.5)', edge: 'rgba(255,255,255,.22)', gloss: false };
      const out = FK.out, eo = out * out;
      ctx.save();
      ctx.globalAlpha *= 1 - out;
      /* a veil, so the words sit on the table rather than fight it */
      const vg = ctx.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, 'rgba(8,6,20,.62)'); vg.addColorStop(.5, 'rgba(8,6,20,.8)'); vg.addColorStop(1, 'rgba(8,6,20,.5)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      /* the name in brick colours: dropped in letter by letter, then every few
         seconds knocked along its length as if the ball had found it */
      const G = FK.pixWord('bk-title', 'BREAKOUT', {
        px: 10, depth: 10, fill: i => shade(ROWC[i], .1), side: i => shade(ROWC[i], -.45), glow: i => ROWC[i]
      });
      FK.drawWord(ctx, G, W / 2, 92 - eo * 70, i => {
        const ti = FK.t - .1 - i * .07;
        if (ti <= 0) return { a: 0 };
        let dy = 0, sy = 1;
        if (ti < .36) { const k = ti / .36; dy = -(1 - k * k) * 260; }
        else if (ti - .36 < .2) sy = 1 - Math.sin((ti - .36) / .2 * Math.PI) * .2;
        if (FK.t > 2) {
          const c = (FK.t - 2 - i * .08) % 3.6;
          if (c > 0 && c < .3) dy -= Math.sin(c / .3 * Math.PI) * 16;
          else if (c >= .3 && c < .44) sy *= 1 - Math.sin((c - .3) / .14 * Math.PI) * .1;
        }
        return { dy, sy, sx: 1 + (1 - sy) * .6 };
      });

      /* The machine's best, padded the way the cabinet pads the score, on a
         little marquee of its own: the label sits above the figure with room
         between them, where it used to be half under the digits' edge. */
      const hk = FK.eo(FK.in(.6, .4));
      ctx.save(); ctx.globalAlpha *= hk;
      const mw = 330, mh = 84, mx = W / 2 - mw / 2, my = 204 + (1 - hk) * 14;
      ctx.fillStyle = 'rgba(0,0,0,.42)'; rr(ctx, mx, my + 4, mw, mh, 10); ctx.fill();
      ctx.fillStyle = '#100e1f'; rr(ctx, mx, my, mw, mh, 10); ctx.fill();
      const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      ROWC.forEach((c, i) => mg.addColorStop(i / (ROWC.length - 1), c));
      ctx.strokeStyle = mg; ctx.lineWidth = 3; rr(ctx, mx + 1.5, my + 1.5, mw - 3, mh - 3, 9); ctx.stroke();
      Hud.pix(ctx, 'HI-SCORE', W / 2, my + 14, 2.2, { align: 'center', fill: 'rgba(233,238,247,.6)' });
      Hud.pix(ctx, String(Math.max(0, api.best())).padStart(6, '0'), W / 2, my + 38, 4, { thick: true, align: 'center', fill: '#fbbf24', outline: '#1a1206' });
      ctx.restore();

      /* Play, or in a party the host's start and a guest's wait */
      const mode = FK.mode();
      const label = mode === 'host' ? 'START RACE' : mode === 'guest' ? 'WAITING' : 'PLAY';
      const pk = FK.bo(FK.in(.75, .55));
      const bw = 272, bh = 64, by = 324 + (1 - pk) * 90 + eo * 50;
      FK.button(ctx, 'play', W / 2 - bw / 2, by, bw, bh, label, BRICK, {
        live: mode !== 'guest', fill: mode === 'guest' ? ['#7b8494', '#4b5563'] : ['#ffd76a', '#f59e0b'],
        draw: brickFace(label, label.length > 6 ? 4 : 5, mode === 'guest' ? '#1f2430' : '#2a1600')
      });
      if (mode !== 'guest') {
        const bl = .45 + .55 * (Math.sin(FK.t * 5) > 0 ? 1 : .15);
        Hud.pix(ctx, 'OR PRESS SPACE', W / 2, by + bh + 16, 2.2, { align: 'center', fill: 'rgba(233,238,247,.8)', alpha: bl * pk });
      }
      /* racing friends lives behind the same brick, in the paddle's blue */
      const fk = FK.bo(FK.in(.85, .55));
      const fw = 292, fh = 46, fy = 446 + (1 - fk) * 90 + eo * 50;
      const P = api.party;
      const fl = P.inRoom ? 'PARTY ' + P.size : 'RACE FRIENDS';
      FK.button(ctx, 'party', W / 2 - fw / 2, fy, fw, fh, fl, BRICK, { fill: ['#8fd8ff', '#2c86c8'], draw: brickFace(fl, 3, '#06223a') });

      /* the keys, along the foot */
      const fk2 = FK.in(1.2, .5);
      Hud.pix(ctx, 'MOUSE OR ARROWS TO MOVE', 20, H - 22, 2, { baseline: 'middle', fill: 'rgba(233,238,247,.42)', alpha: fk2 });
      Hud.pix(ctx, 'ESC HUB', W - 20, H - 22, 2, { align: 'right', baseline: 'middle', fill: 'rgba(233,238,247,.42)', alpha: fk2 });
      ctx.restore();
      FK.cursor();
    }
    /* ---- the results ----
       The cabinet's own game-over screen: the verdict in brick letters that
       drop in and settle, the score rolling up on the same marquee the
       hi-score lives on, what the run reached as bricks off the wall, and the
       arcade's coins and level on a dark card underneath — then three bricks
       to go on with. */
    function drawResults(ctx) {
      const R = FK.R, cx = W / 2;
      FK.resSounds();
      const vk = FK.eo(FK.rs('title', undefined, .45));
      const vg = ctx.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, 'rgba(8,6,20,' + (.7 * vk).toFixed(3) + ')'); vg.addColorStop(1, 'rgba(8,6,20,' + (.86 * vk).toFixed(3) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      const px = (c, str, x, y, size, col, o) => Hud.pix(c, str, x, y, size, Object.assign({ fill: col }, o || {}));
      const ptext = (c, str, x, y, size, col, align) => Hud.pix(c, String(str).toUpperCase(), x, y, Math.max(1.5, size / 7), { align, baseline: 'middle', fill: col });

      /* the verdict, brick by brick */
      const word = String(R.title).toUpperCase().slice(0, 13);
      const G = FK.pixWord('bk-res-' + word, word, {
        px: 7, depth: 8, fill: i => shade(ROWC[i % ROWC.length], .1), side: i => shade(ROWC[i % ROWC.length], -.45), glow: i => ROWC[i % ROWC.length]
      });
      FK.drawWord(ctx, G, cx, 24, i => {
        const ti = FK.rt() - i * .05;
        if (ti <= 0) return { a: 0 };
        let dy = 0, sy = 1;
        if (ti < .3) { const k = ti / .3; dy = -(1 - k * k) * 180; }
        else if (ti - .3 < .18) sy = 1 - Math.sin((ti - .3) / .18 * Math.PI) * .18;
        return { dy, sy, sx: 1 + (1 - sy) * .6 };
      });

      /* the marquee: this run's score rolling up, the best beside it */
      const mk = FK.eo(FK.rs('sub', undefined, .4));
      const mw = 600, mh = 96, mx = cx - mw / 2, my = 112 + (1 - mk) * 16;
      ctx.save(); ctx.globalAlpha *= mk;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, mx, my + 5, mw, mh, 12); ctx.fill();
      ctx.fillStyle = '#100e1f'; rr(ctx, mx, my, mw, mh, 12); ctx.fill();
      const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      ROWC.forEach((c, i) => mg.addColorStop(i / (ROWC.length - 1), c));
      ctx.strokeStyle = mg; ctx.lineWidth = 3; rr(ctx, mx + 1.5, my + 1.5, mw - 3, mh - 3, 11); ctx.stroke();
      const roll = Math.round(R.score * FK.eo(FK.rs('stat', 0, .9)));
      px(ctx, 'SCORE', mx + 30, my + 16, 2.2, 'rgba(233,238,247,.6)');
      px(ctx, String(roll).padStart(6, '0'), mx + 30, my + 38, 5, '#fbbf24', { thick: true, outline: '#1a1206' });
      px(ctx, 'HI-SCORE', mx + mw - 30, my + 16, 2.2, 'rgba(233,238,247,.6)', { align: 'right' });
      px(ctx, String(R.best).padStart(6, '0'), mx + mw - 30, my + 40, 3.2, '#e9eef7', { thick: true, outline: '#0b0a16', align: 'right' });
      if (R.isBest && Math.floor(FK.t * 3) % 2 === 0) {
        const tk = FK.bo(FK.rs('tag', undefined, .4));
        ctx.save(); ctx.translate(mx + mw - 30 - 88, my + 80); ctx.scale(tk, tk);
        px(ctx, 'NEW HI-SCORE!', 0, 0, 2, '#f472b6', { align: 'center', baseline: 'middle' });
        ctx.restore();
      } else if (R.cheated) px(ctx, 'NOT SAVED', mx + mw - 30, my + 76, 2, '#f87171', { align: 'right' });
      ctx.restore();

      /* Below the marquee, two columns: what the run reached as bricks off the
         wall (and a race's field under them), and the arcade's card. */
      const n = R.paid.length;
      const LST = {
        text: ptext, label: ptext, measure: (c, str, size) => Hud.pixWidth(String(str), Math.max(1.5, size / 7)),
        ink: '#e9eef7', mute: 'rgba(233,238,247,.5)', gold: '#fbbf24', rule: 'rgba(255,255,255,.12)',
        bar: 'rgba(255,255,255,.1)', fill: '#38bdf8', rowH: n > 5 ? 17 : n > 4 ? 19 : 22, size: 13, lsize: 12,
        totalSize: 26, totalH: 36, xpH: 40, barH: 8, noteGap: 92
      };
      const colL = 214, colR = 440, cgap = 22, top = 220;
      const lx0 = cx - (colL + cgap + colR) / 2, rx0 = lx0 + colL + cgap;
      const bricksOf = R.gameStats.slice(0, R.standings ? 2 : 4);
      let leftH = 0;
      bricksOf.forEach((st, i) => {
        const k = FK.rs('stat', i + 1, .35), bh = 50, y0 = top + i * (bh + 12);
        leftH = y0 + bh - top;
        if (k <= 0) return;
        const c = ROWC[(i * 2 + 1) % ROWC.length], x = lx0, y = y0 - (1 - FK.bo(k)) * 30;
        ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2);
        const g = ctx.createLinearGradient(x, y, x, y + bh);
        g.addColorStop(0, shade(c, .22)); g.addColorStop(1, c);
        ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, x, y + 4, colL, bh, 7); ctx.fill();
        ctx.fillStyle = g; rr(ctx, x, y, colL, bh, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(ctx, x + 5, y + 4, colL - 10, 6, 3); ctx.fill();
        px(ctx, String(st.label).toUpperCase(), x + 16, y + bh / 2, 1.8, 'rgba(0,0,0,.6)', { baseline: 'middle' });
        px(ctx, String(st.value).toUpperCase(), x + colL - 16, y + bh / 2, 2.6, '#1a1206', { align: 'right', baseline: 'middle', thick: true });
        ctx.restore();
      });
      if (R.standings) {
        const sy = top + leftH + (leftH ? 14 : 0), sh = 40 + R.standings.length * 24;
        const sk = FK.eo(FK.rs('std', 0, .4));
        ctx.save(); ctx.globalAlpha *= sk;
        ctx.fillStyle = 'rgba(16,14,31,.94)'; rr(ctx, lx0, sy, colL, sh, 12); ctx.fill();
        ctx.strokeStyle = mg; ctx.lineWidth = 2; rr(ctx, lx0 + 1, sy + 1, colL - 2, sh - 2, 11); ctx.stroke();
        px(ctx, 'RACE', lx0 + 16, sy + 12, 2, 'rgba(233,238,247,.5)');
        R.standings.forEach((p, i) => {
          const k = FK.eo(FK.rs('std', i, .3)), y = sy + 36 + i * 24, col = p.me ? '#fbbf24' : '#e9eef7';
          px(ctx, (i + 1) + ' ' + String(p.name).toUpperCase().slice(0, 10), lx0 + 16, y, 2, col, { alpha: k });
          px(ctx, String(p.score), lx0 + colL - 16, y, 2, col, { align: 'right', alpha: k });
        });
        ctx.restore();
        leftH = sy + sh - top;
      }
      /* the arcade's card: coins and the level */
      const lh = 46 + FK.ledgerH(LST);
      const lk = FK.eo(FK.rs(n ? 'row' : 'xp', n ? 0 : undefined, .4));
      ctx.save(); ctx.globalAlpha *= lk;
      const lx = rx0, lw = colR, ly2 = top + (1 - lk) * 20;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, lx, ly2 + 4, lw, lh, 12); ctx.fill();
      ctx.fillStyle = 'rgba(16,14,31,.94)'; rr(ctx, lx, ly2, lw, lh, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.5; rr(ctx, lx + .75, ly2 + .75, lw - 1.5, lh - 1.5, 12); ctx.stroke();
      px(ctx, 'COINS', lx + 20, ly2 + 14, 2, 'rgba(233,238,247,.5)');
      const pv = fmt(FK.purse());
      px(ctx, pv, lx + lw - 20, ly2 + 12, 2.4, '#fbbf24', { align: 'right' });
      const cw2 = Hud.pixWidth(pv, 2.4);
      ctx.save(); ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(lx + lw - 32 - cw2, ly2 + 20, 7, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#b45309'; ctx.fillRect(lx + lw - 33 - cw2, ly2 + 16, 2, 8);
      FK.ledger(ctx, lx + 20, ly2 + 38, lw - 40, LST);
      ctx.restore();
      const ly = top, lhAll = Math.max(lh, leftH);

      /* three bricks to go on with */
      const kb = FK.eo(FK.rs('bar', undefined, .4));
      if (kb > 0) {
        const BRICK = { r: 8, shadow: 'rgba(0,0,0,.5)', edge: 'rgba(255,255,255,.22)', gloss: false };
        const by = Math.min(H - 76, ly + lhAll + 18) + (1 - kb) * 24;
        const acts = [['again', 'PLAY AGAIN', ['#ffd76a', '#f59e0b'], '#2a1600', 250]];
        if (R.menuOk) acts.push(['menu', 'MENU', ['#8fd8ff', '#2c86c8'], '#06223a', 150]);
        acts.push(['hub', 'HUB', ['#a3acbd', '#5b6475'], '#161a24', 150]);
        const tw = acts.reduce((a, b) => a + b[4], 0) + (acts.length - 1) * 16;
        let bx = cx - tw / 2;
        ctx.save(); ctx.globalAlpha *= kb;
        for (const a of acts) {
          FK.button(ctx, a[0], bx, by, a[4], 52, a[1], BRICK, { fill: a[2], draw: brickFace(a[1], a[1].length > 6 ? 3 : 3.4, a[3]) });
          bx += a[4] + 16;
        }
        if (FK.resFinished()) {
          const bl = .45 + .55 * (Math.sin(FK.t * 5) > 0 ? 1 : .15);
          px(ctx, 'OR PRESS SPACE', cx, by + 66, 2, 'rgba(233,238,247,.8)', { align: 'center', alpha: bl });
        }
        ctx.restore();
      }
      FK.resInput();
      FK.cursor();
    }
    function fireLaser() {
      fireCd = .22; Sound.shoot();
      bolts.push({ x: px - pw / 2 + 7, y: PY - 8 }, { x: px + pw / 2 - 7, y: PY - 8 });
    }
  }
});

