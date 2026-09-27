const fs = require('fs');
let s=fs.readFileSync('games.html','utf8');
fs.writeFileSync('.backups/games.before-minimal-sports.html',s);
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b)}
function region(a,b,t){const i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0)throw Error('Missing '+a);s=s.slice(0,i)+t+s.slice(j)}
// Edit the existing scoped theme rather than adding another cascade of overrides.
const ca=s.indexOf('/* Golf & pool: game-specific'),cb=s.indexOf('</style>',ca);
let css=s.slice(ca,cb)
 .replace('height:64px;padding:0 22px','height:44px;padding:0 12px')
 .replace('padding:2px 16px','padding:2px 9px')
 .replace('font-size:18px;font-weight:650','font-size:13px;font-weight:600')
 .replace('font-size:9px}', 'font-size:8px}')
 .replace('border-radius:24px;box-shadow:0 32px 100px #0008;padding:28px','border-radius:12px;box-shadow:0 16px 48px #0005;padding:20px')
 .replace('width:min(520px,100%)','width:min(360px,100%)')
 .replace('calc(100dvh - 104px)','calc(100dvh - 72px)')
 .replace(/\.sports-intro \.sports-art\{[^}]*\}\n\.sports-art svg\{[^}]*\}\n\.sports-art::after\{[^}]*\}\n\.sports-kicker\{[^}]*\}\n/,'')
 .replace("font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:400;line-height:1.05;letter-spacing:-.045em;margin-bottom:12px",'font-family:inherit;font-size:22px;font-weight:600;line-height:1.2;letter-spacing:-.02em;margin-bottom:6px')
 .replace('line-height:1.7;font-size:13px','line-height:1.5;font-size:12px')
 .replace('margin-bottom:20px','margin-bottom:16px')
 .replace('letter-spacing:.14em','letter-spacing:.08em')
 .replace('margin-bottom:9px','margin-bottom:6px')
 .replaceAll('border-radius:12px;gap:4px','border-radius:8px;gap:3px')
 .replace('min-height:38px','min-height:32px;height:32px')
 .replace('border-radius:12px;border:1px solid transparent','border-radius:8px;border:1px solid transparent')
 .replace('min-height:46px;font-weight:750','height:36px;min-height:36px;font-weight:600;flex-shrink:0');
css=css.slice(0,css.indexOf('@media(max-height:720px)'))+`@media(max-height:540px){#play:is([data-game="golf"],[data-game="pool"]) .panel{padding:14px}#play .sports-intro h2{font-size:20px}#play .sports-intro .sub{margin-bottom:10px}}
@media(max-width:620px){#play:is([data-game="golf"],[data-game="pool"]) .playbar{padding:0 8px;gap:6px}#play:is([data-game="golf"],[data-game="pool"]) .hud-item{padding:2px 5px}}
`;
s=s.slice(0,ca)+css+s.slice(cb);
replace("const intro = g.id === 'golf' ? 'Six beautiful worlds. Forty-eight holes. Find your line and make every putt count.' : 'Settle in. Line it up. Own the table. A full game of eight-ball, down to the last pocket.';", "const intro = g.id === 'golf' ? 'Pick a course and tee off.' : 'Line up your shot. Clear your group.';");
replace("      (sport ? '<div class=\"sports-art\" aria-hidden=\"true\">' + g.art + '</div><p class=\"sports-kicker\">' + (g.id === 'golf' ? 'THE WEEKEND CLUB · MINI GOLF' : 'THE EIGHT ROOM · BILLIARDS') + '</p>' : '') +\n      '<h2>' + (sport ? (g.id === 'golf' ? 'A little closer to par.' : 'Your table is ready.') : g.title) + '</h2>' +", "      '<h2>' + g.title + '</h2>' +");
replace("(sport ? (g.id === 'golf' ? 'Find your course ↗' : 'Rack them up ↗') : 'Play')", "(sport ? (g.id === 'golf' ? 'Choose course' : 'Play pool') : 'Play')");
// Course selection keeps its artwork, with a quiet header and smaller tiles.
region("      ctx.fillStyle = '#173e30'; ctx.fillRect(0, 0, W, 130);", '      /* timer as a slim track', `      ink(ctx, 98, 92, RACE ? 'Vote for a course' : 'Choose a course', 22, INKD, 'left', 600, -.3);
      ink(ctx, 98, 117, '8 holes per course', 11, INKM, 'left', 500, 0);

`);
const va=s.indexOf('    function drawVote(ctx)'),vb=s.indexOf('    /* Small vector landscapes',va);
let v=s.slice(va,vb)
 .replace('const bw = 206, bx = W - bw - 44, by = 64','const bw = 150, bx = W - bw - 98, by = 90')
 .replace("'rgba(255,255,255,.10)'","'rgba(24,62,48,.10)'")
 .replace("left < .25 ? '#e99270' : '#d9ed9a'","left < .25 ? '#c06349' : '#287650'")
 .replace('bx + bw / 2, 88','bx + bw / 2, 114').replace("11, '#c0d1bc'","11, INKM")
 .replace('const cw = 276, ch = 186, gx = 24, gy = 20','const cw = 244, ch = 144, gx = 16, gy = 16')
 .replace('const lift = A.lift * 7','const lift = A.lift * 2')
 .replaceAll('cw, ch, 14','cw, ch, 8')
 .replace('drawDestination(ctx, x, y, cw, 106, C.th)','drawDestination(ctx, x, y, cw, 80, C.th)')
 .replace('y + 106, cw, ch - 106','y + 80, cw, ch - 80')
 .replace('y + 128, C.name, 18','y + 100, C.name, 14')
 .replace("ink(ctx, x + 16, y + 150, details[i], 11, INKM, 'left', 500, 0);",'')
 .replace('y + 172, C.holes.length','y + 124, C.holes.length')
 .replaceAll('y + 158','y + 112').replaceAll('y + 172','y + 126').replaceAll('y + 164','y + 118').replaceAll('y + 171','y + 125')
 .replace("y + 138, String(shown), 22","y + 105, String(shown), 16")
 .replace('W / 2, H - 18','W / 2, 478');
v=v.replace(/        const details = \[[^\n]*\];\n/,'');
s=s.slice(0,va)+v+s.slice(vb);
replace('ctx.save(); ctx.translate(x,y);\n      const sky', 'ctx.save(); ctx.translate(x,y); ctx.scale(w / 276, h / 106); w = 276; h = 106;\n      const sky');
// The shot meter lives at the bottom, so it never covers the ball or aiming line.
region('    function drawPutMeter(ctx) {','    function drawHud(ctx) {',`    function drawPutMeter(ctx) {
      const p = GU.pow, x = W / 2 - 94, y = H - 42;
      ctx.save();
      ctx.fillStyle = 'rgba(10,30,22,.85)'; gbox(ctx, x, y, 188, 28, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; gbox(ctx, x + 12, y + 12, 120, 4, 2); ctx.fill();
      ctx.fillStyle = p > .7 ? '#e9ac7e' : '#d9ed9a';
      if (p > 0) { gbox(ctx, x + 12, y + 12, Math.max(4, 120 * p), 4, 2); ctx.fill(); }
      ink(ctx, x + 176, y + 14, Math.round(p * 100) + '%', 11, '#f4f4e9', 'right', 600, 0);
      ctx.restore();
    }
`);
region('    function drawHud(ctx) {\n      guStep();','    /* the group, kept the way',`    function drawHud(ctx) {
      guStep();
      ctx.save();
      // Scores already live in the shell bar; only the hole name belongs over the course.
      const title = C.name + (T.slick ? ' · Ice' : '');
      const width = Math.min(240, inkW(ctx, title, 12, 600, 0) + 24);
      ctx.fillStyle = 'rgba(10,30,22,.72)'; gbox(ctx, 16, 14, width, 28, 7); ctx.fill();
      ink(ctx, 28, 28, fitText(ctx, title, width - 24, 12, 600), 12, '#f4f4e9', 'left', 600, 0);

      if (strokes === 0 && bannerT > 0 && !aiming && !sunk && startT <= 0) {
        ink(ctx, 76, H - 40, 'Drag back from the ball to putt', 11, '#f4f4e9', 'left', 500, 0);
      }
      if (msgT > 0 && !sunk) {
        const text = fitText(ctx, msg, 390, 11, 600), w = inkW(ctx, text, 11, 600, 0) + 24;
        ctx.fillStyle = 'rgba(10,30,22,.86)'; gbox(ctx, (W-w)/2, 14, w, 28, 7); ctx.fill();
        ink(ctx, W/2, 28, text, 11, '#f4f4e9', 'center', 600, 0);
      }
      if (startT > 0) {
        const n = Math.ceil(startT - .2);
        ink(ctx, W/2, H/2, n > 0 ? String(n) : 'Go', 48, PAPER, 'center', 700, 0);
      }
      if (sunk) {
        const names = waitingFor(), w = 260;
        ctx.fillStyle = 'rgba(10,30,22,.88)'; gbox(ctx, (W-w)/2, 14, w, 48, 8); ctx.fill();
        ink(ctx, W/2, 30, sunkMsg + ' · ' + strokes + (strokes === 1 ? ' stroke' : ' strokes'), 13, '#d9ed9a', 'center', 600, 0);
        ink(ctx, W/2, 49, names.length ? 'Waiting for the group' : 'Next hole…', 10, '#c1cfbf', 'center', 500, 0);
      }
      if (RACE) drawCard(ctx);
      if (VIEW.overview()) drawMap(ctx);
      drawEye(ctx);
      ctx.restore();
    }
`);
// Smaller multiplayer scorecard; preserve each player's score and completion state.
region('    function drawCard(ctx) {','    /* The whole hole in the corner',`    function drawCard(ctx) {
      const list = RACE.list(), w = 148, x = W - w - 16, y = 14;
      ctx.save(); ctx.fillStyle = 'rgba(10,30,22,.76)'; gbox(ctx, x, y, w, 12 + list.length * 20, 7); ctx.fill();
      list.forEach((p, i) => {
        const cy = y + 16 + i * 20;
        const q = p.me ? { ph: 'p', s: strokes, d: sunk } : RACE.peers[p.id];
        const label = p.done ? 'Done' : !q || q.ph !== 'p' ? '–' : q.d ? 'In' : String(q.s);
        ink(ctx, x + 10, cy, fitText(ctx, p.name, 92, 11, 500), 11, p.me ? '#d9ed9a' : '#f4f4e9', 'left', 500, 0);
        ink(ctx, x + w - 10, cy, label, 11, '#c1cfbf', 'right', 600, 0);
      });
      ctx.restore();
    }
`);
// Pool: no always-on power panel. Retain a one-time instruction until the first shot.
region('    function drawPower(ctx) {','    /* The cue ball as you are about',`    function drawPower(ctx) {
      const tip = tipKeys(), spin = !!(tip.tip || tip.eng);
      if (!stroking && !spin) {
        if (shots === 0) chalk(ctx, W/2, H-24, 'Drag back to shoot · W A S D for spin', 11, '#b7c4b9', 'center', 500, 0);
        return;
      }
      const p = UI.pow, x = 412, y = H - 30, width = 160;
      ctx.save();
      ctx.fillStyle = 'rgba(12,24,19,.82)'; box(ctx, 350, y - 16, 274, 32, 7); ctx.fill();
      ctx.fillStyle = '#ffffff26'; box(ctx, x, y - 2, width, 4, 2); ctx.fill();
      ctx.fillStyle = p > .82 ? '#e9ac7e' : '#c6d8a0';
      if (p > 0) { box(ctx, x, y - 2, Math.max(4, width*p), 4, 2); ctx.fill(); }
      chalk(ctx, 612, y, Math.round(p*100)+'%', 11, CHALK, 'right', 600, 0);
      ctx.restore();
      drawSpinDial(ctx, 374, y);
    }
`);
replace('const t = tipKeys(), r = 16;', 'const t = tipKeys(), r = 10;');
replace("chalk(ctx, cx, cy + r + 13, on ?", "chalk(ctx, cx, cy + r + 11, on ?");
region('    function plaque(ctx, seat) {','      /* ---- the rail: what is left',`    function plaque(ctx, seat) {
      const dt = UI.dt, left = seat === 0, lamp = UI.lamp[seat], g = groups[seat];
      const bw = 222, bh = g ? 54 : 32, x = left ? 16 : W - bw - 16, y = 14;
      ctx.save();
      ctx.fillStyle = 'rgba(14,28,22,.78)'; box(ctx, x, y, bw, bh, 7); ctx.fill();
      ctx.fillStyle = lamp > .5 ? '#d9ed9a' : '#697d6f';
      ctx.beginPath(); ctx.arc(x+11, y+16, 2.5, 0, TAU); ctx.fill();
      const meSeat = SOLO ? 0 : MYSEAT;
      let nm = seat === meSeat && SOLO ? 'You' : nameOf(seat);
      ctx.font = '600 12px system-ui';
      while (ctx.measureText(nm).width > 116 && nm.length > 1) nm = nm.slice(0,-2) + '…';
      chalk(ctx, x+22, y+16, nm, 12, CHALK, 'left', 600, 0);
      chalk(ctx, x+bw-10, y+16, g ? (g==='solid'?'Solids':'Stripes') : 'Open table', 10, '#aebbaf', 'right', 500, 0);

`);
replace('const bx0 = x + 22, by = y + bh - 17, gapx = 27;', 'const bx0 = x + 22, by = y + bh - 13, gapx = 23;');
replace("      if (list.length) { ctx.fillStyle = 'rgba(0,0,0,.28)'; box(ctx, bx0 - 15, by - 3, list.length * gapx + 4, 9, 4.5); ctx.fill(); }",'');
replace('by + (c.drop || 0), 10, +n', 'by + (c.drop || 0), 7.5, +n');
replace("} else if (!g) chalk(ctx, bx0 - 4, by, 'POT A BALL TO CLAIM YOUR GROUP', 8.5, '#afbcad', 'left', 600, .8);", '}');
region('    function drawRailInfo(ctx) {','    /* ==================================================== 3D table',`    function drawRailInfo(ctx) {
      plaque(ctx, 0); plaque(ctx, 1);
      const status = ending ? 'Rack complete' : state === 'roll' ? 'Balls rolling' : state === 'place' ? 'Ball in hand' : (SOLO ? turn === 0 : isMyTurn()) ? 'Your shot' : 'Opponent’s shot';
      chalk(ctx, W/2, 30, status, 11, '#c4cfbf', 'center', 500, 0);
      drawBanner(ctx);
    }

`);
// Fouls and other useful messages use a small toast at the edge, never a table-wide flourish.
region('    function drawBanner(ctx) {','    /* Turn change.',`    function drawBanner(ctx) {
      if (msgT <= 0 || msg === 'Break!') return;
      ctx.save(); ctx.globalAlpha = Math.min(1, msgT);
      const mw = Math.min(540, chalkW(ctx, msg, 11, 500, 0) + 28), y = 52;
      ctx.fillStyle = 'rgba(12,24,19,.88)'; box(ctx, (W-mw)/2, y, mw, 26, 7); ctx.fill();
      chalk(ctx, W/2, y+13, msg, 11, CHALK, 'center', 500, 0);
      ctx.restore();
    }
`);
fs.writeFileSync('games.html',s);
console.log('Applied compact menus and contextual in-game HUDs.');
