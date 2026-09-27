/* ========================================================== FRUIT NINJA ==== */
/* Fruit is thrown up from below the screen and you cut it with the mouse. That
   is the whole game, and almost all of the work is in making the cut feel like
   a cut rather than like a collision test that removed a sprite.

   Four things carry it.

   - THE BLADE IS THE POINTER'S REAL PATH, not its position once a frame. The
     shell records every coalesced pointer sample the browser hands it, so a
     fast swipe across the stage arrives as thirty points rather than one
     straight line between two frames. Slicing tests those segments. Sampling
     the pointer once per frame is the single thing that makes a game like this
     feel broken: you swipe through a melon and nothing happens, because at
     1400px/s the fruit sat between two frames' worth of positions.
   - A CUT IS A CROSS-SECTION. Every fruit knows two things about itself: what
     it looks like from outside, and what it looks like sawn through. A half is
     drawn by clipping the whole fruit to one side of the cut line and then
     painting the face — rind ring, flesh, seeds — as an ellipse lying along
     that line. Halves that are just the sprite cut in two look like torn
     paper; halves with a face look like fruit.
   - SPEED GATES THE SLICE. Resting the pointer on a melon does nothing. The
     blade has to be moving about 220px/s, measured over the last 50ms of the
     stroke rather than per segment, because at a high sample rate a genuinely
     fast swipe is still made of three-pixel steps.
   - THE JUICE STAYS. Every cut throws a splat onto the board behind, and it
     sits there for eight seconds. It is the only record that the last ten
     seconds happened, and without it the background is dead wood.

   The HUD is drawn here, on the canvas, and not through the shell's readout
   bar — a row of neat little labelled pills is the wrong register entirely for
   this game. The score is painted: leaning, thick ink outline, hard offset
   shadow, no blur anywhere. Lives are three brush-stroke crosses that fill in
   red as they go. A combo arrives as a slab banner that pops in over the top.
   Flat colour, hard edges, nothing glows. */
registerGame({
  id: 'ninja',
  title: 'Fruit Ninja',
  tagline: 'Throw, slice, repeat. Watermelons come apart down the cut you actually made, bombs end it, and three fruit in one swipe is a combo.',
  tags: ['Arcade', 'Reflex', 'Skill', 'Timing', 'Action'],
  scoreLabel: 'Score',
  w: 960, h: 600,
  fluid: true, maxW: 1420,
  front: true,
  controls: [
    ['Slice', 'drag &mdash; mouse or finger'],
    ['Pause', 'Esc']
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><rect width="320" height="180" fill="#2c1b12"/><g fill="#332015"><rect x="0" y="0" width="52" height="180"/><rect x="104" y="0" width="52" height="180"/><rect x="208" y="0" width="52" height="180"/><rect x="312" y="0" width="52" height="180"/></g><g stroke="#1d1109" stroke-width="2"><path d="M52 0v180M104 0v180M156 0v180M208 0v180M260 0v180M312 0v180"/></g><circle cx="160" cy="90" r="74" fill="none" stroke="#3d2718" stroke-width="13"/><g fill="#8c2f1b" opacity=".45"><ellipse cx="54" cy="150" rx="25" ry="16"/><ellipse cx="262" cy="36" rx="18" ry="12"/><circle cx="86" cy="130" r="5.5"/><circle cx="278" cy="56" r="4.5"/></g><g stroke="#2a1810" stroke-width="4" stroke-linejoin="round"><path d="M84 74a58 58 0 0 1 58-58v58z" fill="#3f9d3a"/><path d="M91 74a51 51 0 0 1 51-51v51z" fill="#eaf7d8"/><path d="M98 74a44 44 0 0 1 44-44v44z" fill="#f0455f"/></g><g fill="#2a1810"><ellipse cx="116" cy="52" rx="3.4" ry="5" transform="rotate(-42 116 52)"/><ellipse cx="129" cy="63" rx="3.4" ry="5" transform="rotate(-42 129 63)"/><ellipse cx="126" cy="41" rx="3.4" ry="5" transform="rotate(-42 126 41)"/></g><g stroke="#2a1810" stroke-width="4" stroke-linejoin="round"><path d="M236 106a58 58 0 0 1-58 58v-58z" fill="#3f9d3a"/><path d="M229 106a51 51 0 0 1-51 51v-51z" fill="#eaf7d8"/><path d="M222 106a44 44 0 0 1-44 44v-44z" fill="#f0455f"/></g><g fill="#2a1810"><ellipse cx="204" cy="128" rx="3.4" ry="5" transform="rotate(-42 204 128)"/><ellipse cx="191" cy="117" rx="3.4" ry="5" transform="rotate(-42 191 117)"/><ellipse cx="194" cy="139" rx="3.4" ry="5" transform="rotate(-42 194 139)"/></g><g fill="#f0455f"><circle cx="150" cy="96" r="5"/><circle cx="168" cy="82" r="4"/><circle cx="137" cy="110" r="3"/><circle cx="182" cy="70" r="3"/></g><path d="M2 168C68 146 134 116 200 66c42-32 78-52 118-62-40 24-76 50-112 78-64 50-130 74-204 86z" fill="#ffffff" opacity=".92"/><path d="M9 166C72 145 136 115 201 66c40-30 75-49 113-59-38 23-72 48-107 75-63 49-128 73-198 84z" fill="#eaf6ff"/></svg>',


  mount(api) {
    const H = 600;
    let W = api.W;

    /* ------------------------------------------------------------- tuning */
    /* Everything is pixels and seconds. The arc is the number that matters:
       a throw has to hang long enough to be read and aimed at, and about two
       and a bit seconds from the floor to the floor is the figure that feels
       like the arcade one. */
    const GRAV = 780;
    const FLOOR = H + 70;                  // where a throw starts and ends
    const APEX = [60, 235];                // how high a throw tops out
    const SPIN = 3.6;                      // radians/second, either way

    const BLADE_LIFE = 0.20;               // seconds of trail behind the point
    const BLADE_W = 13;                    // half-width at the head
    const CUT_SPEED = 220;                 // px/s before the edge bites
    const CUT_WINDOW = 0.05;               // how far back speed is measured
    const COMBO_GAP = 0.34;                // a combo survives this long between cuts
    const FACE = 0.44;                     // how open a cut face is drawn

    const LIVES = 3;

    /* --------------------------------------------------------------- ink */
    /* One dark brown does every outline in the game. A black line on warm
       fruit reads as a hole; this reads as drawn. */
    const INK = '#2a1810';
    const CREAM = '#fff3d6';
    const BLADE = { core: '#ffffff', edge: 'rgba(214,240,255,.55)' };

    const outline = (g, lw) => { g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); };
    /* The banana's silhouette, which three different things need to trace: the
       fruit, the tint on a special, and the clip both of them paint inside.
       It is a band between two circles rather than a pair of curves — the
       first version used two quadratics whose control points were close
       enough together that the whole fruit came out four pixels thick. */
    /* The arc centre is high enough that the BAND straddles the origin rather
       than curving around it. That matters for one reason and it is not
       appearance: a half is made by cutting through the fruit's origin, and
       with the crescent hung below it every cut went through the hollow —
       two intact banana ends and a cross-section floating in the gap between
       them. Every other fruit here is convex and never had the problem. */
    const BAN_CY = -.99, BAN_R1 = 1.18, BAN_R2 = .80, BAN_A = 0.22;
    function bananaPath(g, r) {
      g.beginPath();
      g.arc(0, r * BAN_CY, r * BAN_R1, BAN_A * Math.PI, (1 - BAN_A) * Math.PI);
      g.arc(0, r * BAN_CY, r * BAN_R2, (1 - BAN_A) * Math.PI, BAN_A * Math.PI, true);
      g.closePath();
    }
    /* a brush stroke from A to B: fat in the middle, a point at each end */
    function leaf(g, ax, ay, bx, by, w) {
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L * w, ny = dx / L * w;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx + nx, my + ny, bx, by);
      g.quadraticCurveTo(mx - nx, my - ny, ax, ay);
      g.closePath();
    }

    /* ------------------------------------------------------------- fruit */
    /* Each one knows how to draw itself whole and how to draw the face you get
       when it is cut. `face` paints the WHOLE cross-section ellipse; the caller
       has already clipped to one side of the cut, so only the half that should
       be showing survives. That is why a half never has to know which half it
       is. Seed positions are fixed rather than random so the two halves of one
       melon agree with each other. */
    const SEED = {
      melon: [[-.52,-.26],[-.20,-.46],[.16,-.40],[.48,-.20],[-.40,.24],[-.06,.36],[.30,.30],[.58,.06],[-.66,.02],[.04,-.06]],
      kiwi:  [[-.34,-.30],[0,-.42],[.34,-.30],[.46,0],[.34,.30],[0,.42],[-.34,.30],[-.46,0]],
      apple: [[-.16,.06],[.16,.06],[0,.24]]
    };

    const FRUIT = {
      melon: {
        r: 50, val: 20, juice: '#f0455f', name: 'melon',
        draw(g, r) {
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          g.fillStyle = '#3f9d3a'; g.fill();
          g.save(); g.clip();
          g.fillStyle = '#26702a';
          for (let i = -2; i <= 2; i++) {
            const x = i * r * 0.46;
            g.beginPath();
            g.moveTo(x - r * .09, -r * 1.2);
            g.quadraticCurveTo(x + r * .14, 0, x - r * .09, r * 1.2);
            g.lineTo(x + r * .09, r * 1.2);
            g.quadraticCurveTo(x + r * .32, 0, x + r * .09, -r * 1.2);
            g.closePath(); g.fill();
          }
          g.restore();
          g.beginPath(); g.ellipse(-r * .38, -r * .42, r * .20, r * .11, -.6, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,.20)'; g.fill();
          g.beginPath(); g.arc(0, 0, r, 0, TAU); outline(g, r * .085);
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r, b, 0, 0, TAU); g.fillStyle = '#2d7a2e'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .93, b * .89, 0, 0, TAU); g.fillStyle = '#eaf7d8'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .85, b * .78, 0, 0, TAU); g.fillStyle = '#f0455f'; g.fill();
          g.fillStyle = INK;
          for (const s of SEED.melon) {
            g.save(); g.translate(s[0] * r * .82, s[1] * b * .74); g.rotate(.4);
            g.beginPath(); g.ellipse(0, 0, r * .042, r * .068, 0, 0, TAU); g.fill(); g.restore();
          }
          g.beginPath(); g.ellipse(0, 0, r, b, 0, 0, TAU); outline(g, r * .07);
        }
      },
      orange: {
        r: 38, val: 12, juice: '#ff9d26', name: 'orange',
        draw(g, r) {
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          g.fillStyle = '#ff8c1a'; g.fill();
          g.save(); g.clip();
          g.fillStyle = 'rgba(180,74,0,.22)';
          for (let i = 0; i < 14; i++) {
            const a = i * 2.39, rr = r * .78 * Math.sqrt((i + 1) / 15);
            g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * .055, 0, TAU); g.fill();
          }
          g.restore();
          g.beginPath(); g.ellipse(-r * .34, -r * .40, r * .20, r * .12, -.6, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,.26)'; g.fill();
          g.beginPath(); g.arc(0, 0, r, 0, TAU); outline(g, r * .095);
          /* stalk button */
          g.beginPath(); g.arc(0, -r * .92, r * .13, 0, TAU);
          g.fillStyle = '#6d4a1c'; g.fill(); outline(g, r * .07);
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r, b, 0, 0, TAU); g.fillStyle = '#e8781a'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .92, b * .88, 0, 0, TAU); g.fillStyle = '#fff0cd'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .84, b * .76, 0, 0, TAU); g.fillStyle = '#ffab33'; g.fill();
          g.save();
          g.beginPath(); g.ellipse(0, 0, r * .84, b * .76, 0, 0, TAU); g.clip();
          g.strokeStyle = 'rgba(255,240,205,.9)'; g.lineWidth = r * .05;
          for (let i = 0; i < 9; i++) {
            const a = (i / 8) * Math.PI;
            g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * FACE * 2.4); g.stroke();
          }
          g.restore();
          g.beginPath(); g.ellipse(0, 0, r, b, 0, 0, TAU); outline(g, r * .075);
        }
      },
      apple: {
        r: 36, val: 12, juice: '#ff5d6e', name: 'apple',
        draw(g, r) {
          g.beginPath();
          g.moveTo(0, -r * .82);
          g.bezierCurveTo(r * .78, -r * 1.05, r * 1.12, -r * .1, r * .62, r * .62);
          g.bezierCurveTo(r * .3, r * 1.0, -r * .3, r * 1.0, -r * .62, r * .62);
          g.bezierCurveTo(-r * 1.12, -r * .1, -r * .78, -r * 1.05, 0, -r * .82);
          g.closePath();
          g.fillStyle = '#e8283c'; g.fill();
          g.save(); g.clip();
          g.beginPath(); g.ellipse(-r * .34, -r * .3, r * .22, r * .34, -.5, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,.24)'; g.fill();
          g.beginPath(); g.ellipse(r * .5, r * .2, r * .3, r * .5, .3, 0, TAU);
          g.fillStyle = 'rgba(120,10,25,.30)'; g.fill();
          g.restore();
          g.beginPath();
          g.moveTo(0, -r * .82);
          g.bezierCurveTo(r * .78, -r * 1.05, r * 1.12, -r * .1, r * .62, r * .62);
          g.bezierCurveTo(r * .3, r * 1.0, -r * .3, r * 1.0, -r * .62, r * .62);
          g.bezierCurveTo(-r * 1.12, -r * .1, -r * .78, -r * 1.05, 0, -r * .82);
          g.closePath(); outline(g, r * .1);
          /* stalk and leaf */
          g.beginPath(); g.moveTo(0, -r * .78);
          g.quadraticCurveTo(r * .1, -r * 1.16, r * .04, -r * 1.34);
          g.lineWidth = r * .13; g.strokeStyle = '#5c3a18'; g.lineCap = 'round'; g.stroke();
          leaf(g, r * .06, -r * 1.16, r * .74, -r * 1.34, r * .26);
          g.fillStyle = '#4fae2e'; g.fill(); outline(g, r * .085);
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r * .92, b, 0, 0, TAU); g.fillStyle = '#d8233a'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .86, b * .88, 0, 0, TAU); g.fillStyle = '#fff6df'; g.fill();
          g.strokeStyle = 'rgba(200,160,90,.55)'; g.lineWidth = r * .045;
          g.beginPath(); g.ellipse(0, 0, r * .30, b * .46, 0, 0, TAU); g.stroke();
          g.fillStyle = '#6b4a1e';
          for (const s of SEED.apple) {
            g.save(); g.translate(s[0] * r, s[1] * b); g.rotate(s[0] * .8);
            g.beginPath(); g.ellipse(0, 0, r * .05, r * .08, 0, 0, TAU); g.fill(); g.restore();
          }
          g.beginPath(); g.ellipse(0, 0, r * .92, b, 0, 0, TAU); outline(g, r * .08);
        }
      },
      banana: {
        r: 42, val: 12, juice: '#ffe14d', name: 'banana',
        draw(g, r) {
          bananaPath(g, r);
          g.fillStyle = '#ffcf33'; g.fill();
          g.save(); g.clip();
          /* the shade is a second, thinner crescent sitting on the outer edge,
             so the curve of the fruit is what you read rather than a gradient */
          g.fillStyle = 'rgba(178,120,8,.34)';
          g.beginPath();
          g.arc(0, r * BAN_CY, r * BAN_R1, .18 * Math.PI, .82 * Math.PI);
          g.arc(0, r * BAN_CY, r * (BAN_R1 - .16), .82 * Math.PI, .18 * Math.PI, true);
          g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.26)';
          g.beginPath();
          g.arc(0, r * BAN_CY, r * (BAN_R2 + .14), .30 * Math.PI, .70 * Math.PI);
          g.arc(0, r * BAN_CY, r * (BAN_R2 + .04), .70 * Math.PI, .30 * Math.PI, true);
          g.closePath(); g.fill();
          g.restore();
          bananaPath(g, r); outline(g, r * .1);
          /* both ends capped in brown: the stalk and the flower tip, placed on
             the middle of the blunt end the two arcs leave behind */
          const tx = r * (BAN_R1 * Math.cos(BAN_A * Math.PI) + BAN_R2 * Math.cos(BAN_A * Math.PI)) / 2;
          const ty = r * BAN_CY + r * (BAN_R1 + BAN_R2) / 2 * Math.sin(BAN_A * Math.PI);
          g.fillStyle = '#5c3a18';
          for (const s of [-1, 1]) {
            g.beginPath(); g.arc(s * tx, ty, r * .12, 0, TAU);
            g.fill(); outline(g, r * .07);
          }
        },
        face(g, r) {
          /* small, because the band it has to sit inside is thin */
          const a = r * .46, b = r * .19;
          g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, TAU); g.fillStyle = '#e8b81e'; g.fill();
          g.beginPath(); g.ellipse(0, 0, a * .88, b * .82, 0, 0, TAU); g.fillStyle = '#fff6cf'; g.fill();
          g.strokeStyle = 'rgba(190,150,60,.55)'; g.lineWidth = r * .035;
          g.beginPath(); g.moveTo(-a * .34, -b * .42); g.lineTo(a * .34, b * .42); g.stroke();
          g.beginPath(); g.moveTo(a * .34, -b * .42); g.lineTo(-a * .34, b * .42); g.stroke();
          g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, TAU); outline(g, r * .065);
        }
      },
      pineapple: {
        r: 46, val: 18, juice: '#ffd83d', name: 'pineapple',
        draw(g, r) {
          /* crown first, so the body's outline sits over its base */
          g.fillStyle = '#3f9d3a';
          for (let i = -2; i <= 2; i++) {
            leaf(g, 0, -r * .78, i * r * .42, -r * (1.52 - Math.abs(i) * .18), r * .17);
            g.fill(); outline(g, r * .07);
          }
          g.beginPath(); g.ellipse(0, 0, r * .74, r, 0, 0, TAU);
          g.fillStyle = '#e8a51c'; g.fill();
          g.save(); g.clip();
          g.strokeStyle = 'rgba(150,90,0,.45)'; g.lineWidth = r * .055;
          for (let i = -5; i <= 5; i++) {
            g.beginPath(); g.moveTo(-r, i * r * .3 - r * .5); g.lineTo(r, i * r * .3 + r * .5); g.stroke();
            g.beginPath(); g.moveTo(-r, i * r * .3 + r * .5); g.lineTo(r, i * r * .3 - r * .5); g.stroke();
          }
          g.beginPath(); g.ellipse(-r * .3, -r * .34, r * .16, r * .26, -.4, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
          g.restore();
          g.beginPath(); g.ellipse(0, 0, r * .74, r, 0, 0, TAU); outline(g, r * .09);
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r * .76, b, 0, 0, TAU); g.fillStyle = '#c98a12' ; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .68, b * .86, 0, 0, TAU); g.fillStyle = '#ffe07a'; g.fill();
          g.strokeStyle = 'rgba(200,140,20,.55)'; g.lineWidth = r * .045;
          g.beginPath(); g.ellipse(0, 0, r * .34, b * .46, 0, 0, TAU); g.stroke();
          g.beginPath(); g.ellipse(0, 0, r * .76, b, 0, 0, TAU); outline(g, r * .08);
        }
      },
      kiwi: {
        r: 33, val: 10, juice: '#8fd12e', name: 'kiwi',
        draw(g, r) {
          g.beginPath(); g.ellipse(0, 0, r * .84, r, 0, 0, TAU);
          g.fillStyle = '#8a6a3a'; g.fill();
          g.save(); g.clip();
          g.strokeStyle = 'rgba(60,40,18,.5)'; g.lineWidth = r * .05;
          for (let i = 0; i < 22; i++) {
            const a = i * 2.39, rr = r * .8 * Math.sqrt((i + 1) / 23);
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * .1, y - r * .1); g.stroke();
          }
          g.restore();
          g.beginPath(); g.ellipse(0, 0, r * .84, r, 0, 0, TAU); outline(g, r * .1);
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r * .86, b, 0, 0, TAU); g.fillStyle = '#7a5c30'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .79, b * .88, 0, 0, TAU); g.fillStyle = '#8fd12e'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .3, b * .42, 0, 0, TAU); g.fillStyle = '#f4ffe4'; g.fill();
          g.fillStyle = INK;
          for (const s of SEED.kiwi) {
            g.save(); g.translate(s[0] * r * .84, s[1] * b * .84);
            g.beginPath(); g.ellipse(0, 0, r * .045, r * .065, 0, 0, TAU); g.fill(); g.restore();
          }
          g.beginPath(); g.ellipse(0, 0, r * .86, b, 0, 0, TAU); outline(g, r * .085);
        }
      },
      strawberry: {
        r: 32, val: 10, juice: '#ff2d55', name: 'strawberry',
        draw(g, r) {
          g.beginPath();
          g.moveTo(0, r);
          g.bezierCurveTo(-r * .95, r * .2, -r * .9, -r * .78, 0, -r * .72);
          g.bezierCurveTo(r * .9, -r * .78, r * .95, r * .2, 0, r);
          g.closePath();
          g.fillStyle = '#e8203c'; g.fill();
          g.save(); g.clip();
          g.fillStyle = 'rgba(255,225,120,.9)';
          for (let i = 0; i < 12; i++) {
            const a = i * 2.39, rr = r * .66 * Math.sqrt((i + 1) / 13);
            g.save(); g.translate(Math.cos(a) * rr, Math.sin(a) * rr * 1.1); g.rotate(a);
            g.beginPath(); g.ellipse(0, 0, r * .05, r * .075, 0, 0, TAU); g.fill(); g.restore();
          }
          g.restore();
          g.beginPath();
          g.moveTo(0, r);
          g.bezierCurveTo(-r * .95, r * .2, -r * .9, -r * .78, 0, -r * .72);
          g.bezierCurveTo(r * .9, -r * .78, r * .95, r * .2, 0, r);
          g.closePath(); outline(g, r * .1);
          g.fillStyle = '#3f9d3a';
          for (let i = -2; i <= 2; i++) {
            leaf(g, 0, -r * .6, i * r * .42, -r * (.96 + Math.abs(i) * .04), r * .15);
            g.fill(); outline(g, r * .07);
          }
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r * .84, b, 0, 0, TAU); g.fillStyle = '#d41a34'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .77, b * .87, 0, 0, TAU); g.fillStyle = '#ff9aa8'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .26, b * .55, 0, 0, TAU); g.fillStyle = '#fff2f2'; g.fill();
          g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = r * .04;
          for (let i = 0; i < 7; i++) {
            const a = (i / 6) * Math.PI;
            g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * .7, Math.sin(a) * b * .8); g.stroke();
          }
          g.beginPath(); g.ellipse(0, 0, r * .84, b, 0, 0, TAU); outline(g, r * .085);
        }
      },
      dragon: {
        r: 40, val: 30, juice: '#ff4fa8', name: 'dragonfruit',
        draw(g, r) {
          g.beginPath(); g.ellipse(0, 0, r * .8, r, 0, 0, TAU);
          g.fillStyle = '#e8318f'; g.fill();
          g.save(); g.clip();
          /* Scales in offset rows, each one leaning away from the middle of
             the fruit and tipped a lighter green — which is the only thing
             that tells you at a glance that this is not a beetroot. */
          for (let row = -2; row <= 2; row++) {
            for (let col = -1; col <= 1; col++) {
              const x = col * r * .56 + (row & 1 ? r * .28 : 0);
              const y = row * r * .42;
              const a = -.45 + x / r * .55;
              g.save(); g.translate(x, y); g.rotate(a);
              leaf(g, -r * .32, r * .05, r * .32, -r * .05, r * .15);
              g.fillStyle = '#5fb62e'; g.fill();
              leaf(g, r * .02, 0, r * .32, -r * .05, r * .09);
              g.fillStyle = '#bde84f'; g.fill();
              g.restore();
            }
          }
          g.beginPath(); g.ellipse(-r * .3, -r * .42, r * .18, r * .26, -.4, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,.20)'; g.fill();
          g.restore();
          g.beginPath(); g.ellipse(0, 0, r * .8, r, 0, 0, TAU); outline(g, r * .095);
        },
        face(g, r) {
          const b = r * FACE;
          g.beginPath(); g.ellipse(0, 0, r * .82, b, 0, 0, TAU); g.fillStyle = '#d4247e'; g.fill();
          g.beginPath(); g.ellipse(0, 0, r * .74, b * .87, 0, 0, TAU); g.fillStyle = '#fdf4f8'; g.fill();
          g.fillStyle = INK;
          for (let i = 0; i < 24; i++) {
            const a = i * 2.39, rr = .72 * Math.sqrt((i + 1) / 25);
            g.beginPath(); g.ellipse(Math.cos(a) * rr * r * .72, Math.sin(a) * rr * b * .8, r * .032, r * .045, 0, 0, TAU); g.fill();
          }
          g.beginPath(); g.ellipse(0, 0, r * .82, b, 0, 0, TAU); outline(g, r * .08);
        }
      }
    };
    /* The spawn table. Melons and dragonfruit are worth the most and turn up
       least, so a good run is partly about what the board hands you. */
    const TABLE = [
      ['strawberry', 18], ['kiwi', 16], ['apple', 16], ['orange', 16],
      ['banana', 14], ['pineapple', 10], ['melon', 8], ['dragon', 2]
    ];
    const TABLE_TOTAL = TABLE.reduce((s, r) => s + r[1], 0);
    function rollFruit() {
      let n = Math.random() * TABLE_TOTAL;
      for (const r of TABLE) { n -= r[1]; if (n <= 0) return r[0]; }
      return 'apple';
    }

    /* ---------------------------------------------------------- the board */
    /* Wooden planks, a painted ring, and whatever juice has landed on them.
       Baked once into an offscreen canvas because it never changes — only the
       splats on top of it do, and those are drawn live. */
    let boardCv = null;
    function bakeBoard() {
      const c = document.createElement('canvas');
      c.width = Math.ceil(W); c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#2c1b12'; g.fillRect(0, 0, W, H);
      const PW = 52;
      for (let x = 0; x < W; x += PW) {
        g.fillStyle = ((x / PW) | 0) % 2 ? '#332015' : '#2c1b12';
        g.fillRect(x, 0, PW, H);
        g.fillStyle = '#1d1109'; g.fillRect(x - 1, 0, 2, H);
        /* a couple of grain lines per plank, straight and hard */
        g.fillStyle = 'rgba(0,0,0,.16)';
        for (let k = 0; k < 3; k++) {
          const gy = ((x * 37 + k * 149) % H);
          g.fillRect(x + 4, gy, PW - 8, 1.5);
        }
      }
      /* the painted ring behind everything, with a gap where the brush lifted */
      g.save();
      g.translate(W / 2, H * .5);
      g.strokeStyle = '#3d2718'; g.lineWidth = 15; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 0, Math.min(230, H * .38), 0.5, 0.5 + TAU * .93); g.stroke();
      g.restore();
      /* the edges sit a shade darker so the middle is where the eye goes —
         hard steps, not a blur */
      g.fillStyle = 'rgba(0,0,0,.20)';
      g.fillRect(0, 0, 54, H); g.fillRect(W - 54, 0, 54, H);
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(54, 0, 44, H); g.fillRect(W - 98, 0, 44, H);
      boardCv = c;
    }

    /* ---------------------------------------------------------- the state */
    let fruits = [], halves = [], drops = [], splats = [], pops = [], sparks = [];
    let trail = [];                        // {x, y, t} — the pointer's real path
    let simT = 0, strokeLen = 0, wasDown = false, lastBatch = -1;
    let score = 0, best = 0, lives = LIVES, lifeHit = [0, 0, 0];
    let combo = 0, comboT = -9, comboShow = null;
    let over = false, overT = 0, ended = false, boomed = false;
    let spawnT = 0.9, waveN = 0, thrown = 0, sliced = 0, bestCombo = 0;
    let banner = null;                     // the one full-width flash there is
    /* One flash, for the bomb. Cutting fruit used to tint the screen its own
       juice colour for a frame — with five cuts in a swipe that is five full-
       screen washes in a tenth of a second, and it read as the display
       glitching rather than as anything happening to the fruit. The cut now
       says what it is entirely through the halves, the juice and the sound. */
    let shakeT = 0, flashT = 0, flashCol = '#ffffff';
    let fuseT = 0;

    /* ------------------------------------------------------------ throwing */
    /* A throw is aimed rather than random: pick the apex first, then solve for
       the speed that reaches it, then drift it sideways toward the middle so
       nothing spends its whole arc hugging an edge where it is hard to reach. */
    function throwOne(kind, forceX) {
      const isBomb = kind === 'bomb';
      const type = isBomb ? 'bomb' : (kind || rollFruit());
      const F = isBomb ? { r: 34 } : FRUIT[type];
      const x = forceX === undefined ? rand(W * .12, W * .88) : forceX;
      const apex = rand(APEX[0], APEX[1]);
      const rise = FLOOR - apex;
      const vy = -Math.sqrt(2 * GRAV * rise);
      const tUp = Math.abs(vy) / GRAV;
      /* where it should be at the top: pulled toward the middle, never past it */
      const aim = W / 2 + rand(-W * .26, W * .26);
      const vx = clamp((aim - x) / tUp, -230, 230);
      fruits.push({
        type: type, bomb: isBomb,
        x: x, y: FLOOR, vx: vx, vy: vy,
        r: F.r, rot: rand(0, TAU), spin: rand(-SPIN, SPIN)
      });
      thrown++;
      Sound.ninjaToss();
    }

    /* How busy the board is. It tightens with the score and nothing else:
       more fruit per throw, less time between throws, and a bomb in a growing
       share of them. */
    function wave() {
      waveN++;
      const ramp = clamp(score / 900, 0, 1);
      const n = randi(1, 2 + Math.round(ramp * 3));
      for (let i = 0; i < n; i++) throwOne(null);
      if (Math.random() < clamp(.10 + ramp * .45, 0, .55)) throwOne('bomb');
      spawnT = Math.max(.3, rand(1.0, 1.5) - ramp * .45);
    }

    /* ------------------------------------------------------------- cutting */
    /* Distance from a point to a segment, squared. The whole slice test is
       this and nothing else. */
    function segDist2(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const L = dx * dx + dy * dy;
      let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
      t = clamp(t, 0, 1);
      const qx = ax + dx * t - px, qy = ay + dy * t - py;
      return qx * qx + qy * qy;
    }
    /* how fast the edge is travelling, measured back over CUT_WINDOW rather
       than between the last two samples — at a high sample rate consecutive
       points are a few pixels apart however hard you swipe */
    function bladeSpeed() {
      if (trail.length < 2) return 0;
      const head = trail[trail.length - 1];
      let i = trail.length - 1;
      while (i > 0 && head.t - trail[i - 1].t < CUT_WINDOW) i--;
      const tail = trail[i];
      const dt = head.t - tail.t;
      if (dt <= 1e-4) return 0;
      return Math.hypot(head.x - tail.x, head.y - tail.y) / dt;
    }

    function splitFruit(f, ang, cx, cy) {
      const F = FRUIT[f.type];
      /* the cut in the fruit's own frame, so the face lines up with the rind
         however the fruit happened to be spinning when it was hit */
      const cut = ang - f.rot;
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      for (const side of [-1, 1]) {
        halves.push({
          type: f.type, r: f.r, cut: cut, side: side,
          x: f.x + nx * side * f.r * .16, y: f.y + ny * side * f.r * .16,
          vx: f.vx + nx * side * rand(52, 105) + rand(-18, 18),
          vy: f.vy + ny * side * rand(52, 105) - rand(10, 50),
          rot: f.rot, spin: f.spin + side * rand(.7, 2.6), life: 3.4
        });
      }
      /* juice: a fan thrown along the cut, plus a splat left on the board */
      const col = F.juice;
      for (let i = 0; i < 16; i++) {
        const a = ang + rand(-.9, .9) + (Math.random() < .5 ? Math.PI : 0);
        const sp = rand(80, 400);
        drops.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(0, 90),
                     r: rand(2.4, 6.2), col: col, life: rand(.4, .95) });
      }
      splats.push({ x: cx + rand(-14, 14), y: cy + rand(-14, 14), r: f.r * rand(.5, .85),
                    col: col, rot: rand(0, TAU), seed: rand(0, 99), life: 8 });
      if (splats.length > 34) splats.shift();
    }

    function popText(x, y, txt, col, size) {
      pops.push({ x: x, y: y, txt: txt, col: col || CREAM, size: size || 22, life: .85, t0: .85 });
    }

    function hitFruit(f, i, ang, cx, cy) {
      fruits.splice(i, 1);
      if (f.bomb) { blowUp(cx, cy); return; }
      sliced++;
      splitFruit(f, ang, cx, cy);

      /* combo counts cuts that land close together in time, which in practice
         means "one swipe" without having to care where the stroke started */
      combo = (simT - comboT < COMBO_GAP) ? combo + 1 : 1;
      comboT = simT;
      if (combo > bestCombo) bestCombo = combo;

      const v = FRUIT[f.type].val;
      score += v;
      popText(cx, cy - 18, '+' + v, CREAM, 22);
      Sound.ninjaSlice(f.r / 50, combo);
      Sound.ninjaSplat();
    }

    function blowUp(x, y) {
      Sound.ninjaBomb();
      api.shake(15);
      shakeT = .5;
      flashT = .22; flashCol = '#ffb03a';
      for (let i = 0; i < 46; i++) {
        const a = rand(0, TAU), sp = rand(120, 620);
        sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                      r: rand(2, 5.5), life: rand(.3, .8),
                      col: pick(['#ffd23f', '#ff8c1a', '#ff4a2a', '#fff3d6']) });
      }
      lives = 0;
      lifeHit = [simT, simT, simT];
      endRun(true);
    }

    function loseLife() {
      if (over) return;
      lives--;
      lifeHit[lives] = simT;
      Sound.ninjaMiss(lives);
      if (lives <= 0) endRun(false);
    }

    function endRun(bomb) {
      if (over) return;
      over = true; overT = 0; boomed = !!bomb;
      banner = { txt: bomb ? 'BOOM' : 'GAME OVER', col: bomb ? '#ff5a3c' : '#ff3b3b', life: 2.6, t0: 2.6 };
    }

    /* ------------------------------------------------------------- update */
    function update(dt) {
      simT += dt;
      /* the front page's keys and clicks; a sliced bomb leaves for the hub */
      if (FK.on && menuExit < 0) FK.input(api.input);
      if (menuExit > 0 && (menuExit -= dt) <= 0) api.hub();

      /* --- the blade. Real dt: freezing time must never freeze the player ---
         A whole frame's worth of pointer samples arrives in one call, so they
         cannot all be stamped with the same instant — every one of them would
         then be zero seconds apart and the edge would measure as standing
         still, which is the difference between a game that cuts and one that
         does not. The batch is spread back across the wall-clock gap since the
         last one instead, which is the time those samples actually span. */
      const moves = Input.takeMoves();
      const down = Input.pointer.down;
      if (down && !wasDown) { strokeLen = 0; trail.length = 0; lastBatch = -1; }
      if (!down && wasDown) strokeLen = 0;
      wasDown = down;

      const fresh = [];
      if (moves.length >= 2) {
        const wall = performance.now();
        const span = clamp(lastBatch < 0 ? 1 / 60 : (wall - lastBatch) / 1000, 1 / 240, 1 / 20);
        lastBatch = wall;
        const m = moves.length / 2;
        for (let i = 0; i + 1 < moves.length; i += 2) {
          const x = moves[i], y = moves[i + 1];
          const frac = m > 1 ? (i / 2) / (m - 1) : 1;
          const last = trail.length ? trail[trail.length - 1] : null;
          if (last) strokeLen += Math.hypot(x - last.x, y - last.y);
          const t = Math.max(last ? last.t : -1e9, simT - span * (1 - frac));
          trail.push({ x: x, y: y, t: t });
          if (last) fresh.push(last, trail[trail.length - 1]);
        }
      }
      while (trail.length && simT - trail[0].t > BLADE_LIFE) trail.shift();
      if (trail.length > 160) trail.splice(0, trail.length - 160);

      /* --- slicing --- */
      const live = !over && !ended && down && strokeLen > 16 && bladeSpeed() > CUT_SPEED;
      if (FK.on) { if (live && fresh.length && menuExit < 0) menuCut(fresh); }
      else if (live && fresh.length) {
        for (let k = 0; k < fresh.length; k += 2) {
          const a = fresh[k], b = fresh[k + 1];
          for (let i = fruits.length - 1; i >= 0; i--) {
            const f = fruits[i];
            const rr = f.r * (f.bomb ? .86 : .92);
            if (segDist2(f.x, f.y, a.x, a.y, b.x, b.y) > rr * rr) continue;
            hitFruit(f, i, Math.atan2(b.y - a.y, b.x - a.x), f.x, f.y);
            if (over || ended) break;
          }
          if (over || ended) break;
        }
      }

      /* The world runs on the same clock the player does. There is nothing in
         here that slows it down, so this is only a name for `dt`. */
      const wdt = dt;

      /* --- spawning --- */
      if (!over && !FK.on) {
        spawnT -= dt;
        if (spawnT <= 0) wave();
      }

      /* --- fruit in the air --- */
      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        f.vy += GRAV * wdt;
        f.x += f.vx * wdt; f.y += f.vy * wdt;
        f.rot += f.spin * wdt;
        if (f.y - f.r > FLOOR + 40) {
          fruits.splice(i, 1);
          /* only fruit counts as dropped — a bomb falling off the bottom is
             exactly what you wanted to happen to it */
          if (!f.bomb && !over) loseLife();
        }
      }
      /* the fuse ticks while any bomb is up */
      if (!over) {
        let anyBomb = false;
        for (const f of fruits) if (f.bomb) { anyBomb = true; break; }
        if (anyBomb) { fuseT -= dt; if (fuseT <= 0) { Sound.ninjaFuse(); fuseT = .11; } }
        else fuseT = 0;
      }

      /* --- halves, juice, sparks, splats --- */
      for (let i = halves.length - 1; i >= 0; i--) {
        const h = halves[i];
        h.vy += GRAV * wdt;
        h.x += h.vx * wdt; h.y += h.vy * wdt;
        h.rot += h.spin * wdt;
        h.life -= wdt;
        if (h.y - h.r > FLOOR + 60 || h.life <= 0) halves.splice(i, 1);
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += GRAV * .8 * wdt;
        d.x += d.vx * wdt; d.y += d.vy * wdt;
        d.life -= wdt;
        if (d.life <= 0) drops.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += GRAV * .5 * dt;
        s.vx -= s.vx * 1.6 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      for (let i = splats.length - 1; i >= 0; i--) {
        splats[i].life -= dt;
        if (splats[i].life <= 0) splats.splice(i, 1);
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        p.life -= dt; p.y -= 34 * dt;
        if (p.life <= 0) pops.splice(i, 1);
      }

      /* --- the combo resolves once nothing has been cut for a moment --- */
      if (combo >= 3 && simT - comboT > COMBO_GAP) {
        const bonus = combo * 10;
        score += bonus;
        comboShow = { n: combo, life: 1.25, t0: 1.25 };
        Sound.ninjaCombo(combo);
        combo = 0;
      } else if (simT - comboT > COMBO_GAP) combo = 0;

      if (comboShow) { comboShow.life -= dt; if (comboShow.life <= 0) comboShow = null; }
      if (banner) { banner.life -= dt; if (banner.life <= 0) banner = null; }
      if (flashT > 0) flashT = Math.max(0, flashT - dt);
      if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);

      /* --- the outro: let the board settle before the shell's card --- */
      if (over && !ended) {
        overT += dt;
        if (overT > 1.7) {
          ended = true;
          const stats = [
            { label: 'Fruit sliced', value: fmt(sliced) },
            { label: 'Best combo', value: bestCombo >= 2 ? bestCombo + '×' : '—' },
            { label: 'Accuracy', value: thrown ? Math.round(sliced / thrown * 100) + '%' : '—' }
          ];
          api.gameOver({
            score: score,
            title: boomed ? 'Hit a bomb' : 'Out of lives',
            message: sliced ? 'Sliced ' + sliced + ' before the board got you.' : 'Not a scratch on it.',
            stats: stats
          });
        }
      }
    }

    /* ------------------------------------------------------------ painting */
    /* Every piece of type in this game goes through here: a hard offset
       shadow, a thick ink stroke, then the fill, with an optional lean. It is
       three passes rather than one because that is the whole difference
       between painted type and a label — and the letter spacing is walked by
       hand rather than left to `ctx.letterSpacing`, which a locked-down school
       browser may well not have. */
    function brush(g, x, y, txt, o) {
      o = o || {};
      const size = o.size || 32, sp = o.sp || 0;
      g.save();
      g.translate(x, y);
      if (o.scale) g.scale(o.scale, o.scale);
      g.transform(1, 0, o.lean === undefined ? -.12 : o.lean, 1, 0, 0);
      g.font = (o.weight || 900) + ' ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      g.textBaseline = o.baseline || 'alphabetic';
      g.textAlign = 'left';
      g.lineJoin = 'round'; g.lineCap = 'round';

      const chars = [...txt];
      const widths = chars.map(c => g.measureText(c).width);
      let total = 0;
      for (const w2 of widths) total += w2 + sp;
      total = Math.max(0, total - sp);
      const x0 = o.align === 'center' ? -total / 2 : o.align === 'right' ? -total : 0;

      const run = (dx, dy, fn) => {
        let cx = x0 + dx;
        for (let i = 0; i < chars.length; i++) { fn(chars[i], cx, dy); cx += widths[i] + sp; }
      };
      if (o.shadow !== false) {
        g.fillStyle = o.shadowCol || 'rgba(0,0,0,.45)';
        run(o.sx === undefined ? 3 : o.sx, o.sy === undefined ? 4 : o.sy, (c, cx, dy) => g.fillText(c, cx, dy));
      }
      if (o.ink !== false) {
        g.strokeStyle = o.inkCol || INK;
        g.lineWidth = o.lw || Math.max(3, size * .17);
        run(0, 0, (c, cx, dy) => g.strokeText(c, cx, dy));
      }
      g.fillStyle = o.fill || CREAM;
      run(0, 0, (c, cx, dy) => g.fillText(c, cx, dy));
      g.restore();
      return total;
    }

    /* Juice on the board. The first version sampled a wobbling radius and
       joined the samples with straight lines, which gives a spiky star — it
       read as a torn leaf rather than as something wet. Drawing the same
       samples through their own midpoints instead rounds every lobe off, and
       that one change is the whole difference between a splat and a splinter. */
    function drawSplat(g, s) {
      g.save();
      g.globalAlpha = clamp(s.life / 2.2, 0, 1) * .42;
      g.translate(s.x, s.y); g.rotate(s.rot);
      g.fillStyle = s.col;
      const N = 11, px = [], py = [];
      for (let i = 0; i < N; i++) {
        const t = i / N * TAU;
        const rr = s.r * (.80 + .20 * Math.sin(t * 3 + s.seed) + .09 * Math.sin(t * 5 + s.seed * 1.7));
        px.push(Math.cos(t) * rr); py.push(Math.sin(t) * rr * .78);
      }
      g.beginPath();
      g.moveTo((px[N - 1] + px[0]) / 2, (py[N - 1] + py[0]) / 2);
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        g.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2);
      }
      g.closePath(); g.fill();
      /* the few drops that carried further than the rest */
      for (let i = 0; i < 4; i++) {
        const t = s.seed + i * 1.93, d = s.r * (1.25 + (i % 3) * .22);
        g.beginPath();
        g.arc(Math.cos(t) * d, Math.sin(t) * d * .78, s.r * (.09 + .06 * ((i * 7 + s.seed | 0) % 3)), 0, TAU);
        g.fill();
      }
      g.restore();
      g.globalAlpha = 1;
    }

    function drawWhole(g, f) {
      g.save();
      g.translate(f.x, f.y); g.rotate(f.rot);
      if (f.bomb) drawBomb(g, f.r);
      else FRUIT[f.type].draw(g, f.r);
      g.restore();
    }

    function drawBomb(g, r) {
      g.beginPath(); g.arc(0, 0, r, 0, TAU);
      g.fillStyle = '#14100f'; g.fill();
      g.beginPath(); g.ellipse(-r * .34, -r * .36, r * .24, r * .15, -.6, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,.34)'; g.fill();
      /* the red band, so a bomb is never mistaken for a coconut at speed */
      g.save();
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
      g.fillStyle = '#c4231c'; g.fillRect(-r, r * .22, r * 2, r * .3);
      g.restore();
      g.beginPath(); g.arc(0, 0, r, 0, TAU); outline(g, r * .1);
      /* cap and fuse */
      g.fillStyle = '#6b5a52';
      g.beginPath(); g.rect(-r * .24, -r * 1.16, r * .48, r * .34); g.fill(); outline(g, r * .09);
      g.beginPath();
      g.moveTo(0, -r * 1.12);
      g.quadraticCurveTo(r * .52, -r * 1.5, r * .3, -r * 1.86);
      g.lineWidth = r * .13; g.strokeStyle = '#a8814a'; g.lineCap = 'round'; g.stroke();
      /* the spark, drawn as a hard star rather than a glow */
      const s = r * (.2 + .07 * Math.sin(simT * 40));
      g.save(); g.translate(r * .3, -r * 1.9); g.rotate(simT * 9);
      g.fillStyle = '#ffd23f';
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU, rr = i % 2 ? s * .42 : s;
        i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#fff3d6';
      g.beginPath(); g.arc(0, 0, s * .3, 0, TAU); g.fill();
      g.restore();
    }

    /* A half: clip to one side of the cut, paint the whole fruit into that
       clip, then lay the cross-section along the cut line. */
    function drawHalf(g, h) {
      const F = FRUIT[h.type];
      const R = h.r * 2.2;
      g.save();
      g.globalAlpha = clamp(h.life / .5, 0, 1);
      g.translate(h.x, h.y);
      g.rotate(h.rot + h.cut);
      g.beginPath();
      if (h.side > 0) g.rect(-R, 0, R * 2, R); else g.rect(-R, -R, R * 2, R);
      g.clip();
      g.rotate(-h.cut);
      F.draw(g, h.r);
      g.rotate(h.cut);
      F.face(g, h.r);
      g.restore();
      g.globalAlpha = 1;
    }

    /* The blade: a ribbon that is widest at the point and comes to nothing at
       the tail. Two passes, both with hard edges — a wide soft-coloured one
       and a narrow white core. No shadow blur, because a blurred blade looks
       like a smear rather than like an edge. */
    function drawBlade(g) {
      if (trail.length < 3) return;
      const n = trail.length;
      const build = (wMul) => {
        const L = [], R2 = [];
        for (let i = 0; i < n; i++) {
          const p = trail[i];
          const a = i > 0 ? trail[i - 1] : trail[i];
          const b = i < n - 1 ? trail[i + 1] : trail[i];
          let dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          const age = clamp(1 - (simT - p.t) / BLADE_LIFE, 0, 1);
          const w = BLADE_W * wMul * Math.pow(i / (n - 1), .7) * (.35 + .65 * age);
          L.push(p.x - dy * w, p.y + dx * w);
          R2.push(p.x + dy * w, p.y - dx * w);
        }
        g.beginPath();
        g.moveTo(L[0], L[1]);
        for (let i = 2; i < L.length; i += 2) g.lineTo(L[i], L[i + 1]);
        for (let i = R2.length - 2; i >= 0; i -= 2) g.lineTo(R2[i], R2[i + 1]);
        g.closePath();
      };
      build(1);
      g.fillStyle = BLADE.edge; g.fill();
      build(.46);
      g.fillStyle = BLADE.core; g.fill();
    }

    /* ---------------------------------------------------------------- HUD */
    /* Painted, not laid out. Nothing here is a panel, a pill or a rounded
       rectangle: the score is type on the board, the lives are three brush
       crosses, and the combo is a slab that lands on top of the game. */
    function scoreIcon(g, x, y, r) {
      /* a cut melon, which is the one glyph this game is allowed */
      g.save(); g.translate(x, y); g.rotate(-.35);
      g.beginPath(); g.arc(0, 0, r, Math.PI, TAU); g.closePath();
      g.fillStyle = '#3f9d3a'; g.fill(); outline(g, r * .16);
      g.beginPath(); g.arc(0, 0, r * .84, Math.PI, TAU); g.closePath();
      g.fillStyle = '#eaf7d8'; g.fill();
      g.beginPath(); g.arc(0, 0, r * .7, Math.PI, TAU); g.closePath();
      g.fillStyle = '#f0455f'; g.fill();
      g.fillStyle = INK;
      for (const s of [[-.4, -.42], [0, -.56], [.4, -.42]]) {
        g.beginPath(); g.ellipse(s[0] * r, s[1] * r, r * .09, r * .13, 0, 0, TAU); g.fill();
      }
      g.restore();
    }

    function drawLives(g) {
      const r = 19, gap = 50;
      for (let i = 0; i < LIVES; i++) {
        const x = W - 34 - i * gap, y = 40;
        const spent = i >= lives;
        const since = simT - (lifeHit[i] || -9);
        /* the cross that has just gone lands hard and settles */
        let s = 1;
        if (spent && since < .4) s = 1 + .55 * (1 - since / .4) * Math.cos(since * 42);
        g.save(); g.translate(x, y); g.scale(s, s); g.rotate(i * .06 - .04);
        const w = r * .40;
        for (const d of [[-1, -1, 1, 1], [1, -1, -1, 1]]) {
          leaf(g, d[0] * r, d[1] * r, d[2] * r, d[3] * r, w);
          if (spent) { g.fillStyle = '#e8283c'; g.fill(); outline(g, 3); }
          else { g.fillStyle = 'rgba(255,243,214,.13)'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = 'rgba(255,243,214,.34)'; g.stroke(); }
        }
        g.restore();
      }
    }

    function drawCombo(g) {
      if (!comboShow) return;
      const k = 1 - comboShow.life / comboShow.t0;
      /* pop in with overshoot, hold, lift away */
      let s = 1, a = 1, dy = 0;
      if (k < .2) { const p = k / .2, c1 = 1.9, c3 = c1 + 1; s = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
      if (k > .68) { const p = (k - .68) / .32; a = 1 - p; dy = -34 * p; }
      const cx = W / 2, cy = H * .30 + dy;
      g.save(); g.globalAlpha = a;
      g.translate(cx, cy); g.scale(s, s); g.rotate(-.05);
      /* the slab: a rough-ended bar, drawn rather than rounded */
      const bw = 300, bh = 62;
      g.beginPath();
      g.moveTo(-bw / 2 - 16, -bh / 2 + 6);
      g.lineTo(bw / 2 + 10, -bh / 2 - 4);
      g.lineTo(bw / 2 + 18, bh / 2 - 2);
      g.lineTo(-bw / 2 - 10, bh / 2 + 5);
      g.closePath();
      g.fillStyle = '#c0261f'; g.fill();
      outline(g, 4);
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(-bw / 2 - 8, -bh / 2 + 9, bw + 18, 9);
      g.restore();
      brush(g, cx, cy + 10, comboShow.n + ' FRUIT COMBO', {
        size: 27, align: 'center', sp: 1.4, fill: CREAM, scale: s, shadow: false
      });
      g.globalAlpha = 1;
    }

    function drawBanner(g) {
      if (!banner) return;
      const k = 1 - banner.life / banner.t0;
      let s = 1, a = 1;
      if (k < .16) { const p = k / .16, c1 = 2.2, c3 = c1 + 1; s = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
      if (k > .74) a = 1 - (k - .74) / .26;
      g.save(); g.globalAlpha = clamp(a, 0, 1);
      brush(g, W / 2, H * .52, banner.txt, {
        size: 64, align: 'center', sp: 3, fill: banner.col, lw: 11, scale: s
      });
      g.restore();
      g.globalAlpha = 1;
    }

    function drawHud(g) {
      /* score, top left, with the melon glyph in front of it */
      scoreIcon(g, 32, 40, 17);
      brush(g, 58, 56, fmt(score), { size: 46, sp: 1, fill: CREAM });
      const b = Math.max(best, score);
      brush(g, 60, 80, 'BEST ' + fmt(b), { size: 15, sp: 1.6, fill: '#c9a06a', lw: 3.2, weight: 800 });
      drawLives(g);
    }

    /* the halves, the juice in flight, the whole fruit and the sparks */
    function drawPieces(g) {
      for (const h of halves) drawHalf(g, h);

      for (const d of drops) {
        const a = clamp(d.life / .5, 0, 1);
        g.globalAlpha = a; g.fillStyle = d.col;
        /* stretched along travel, which is what a thrown droplet looks like */
        const sp = Math.hypot(d.vx, d.vy);
        g.save(); g.translate(d.x, d.y); g.rotate(Math.atan2(d.vy, d.vx));
        g.beginPath(); g.ellipse(0, 0, d.r * (1 + sp / 900), d.r, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;

      for (const f of fruits) drawWhole(g, f);

      for (const s of sparks) {
        g.globalAlpha = clamp(s.life / .4, 0, 1);
        g.fillStyle = s.col;
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }

    /* ------------------------------------------------------------- render */
    function render(g) {
      FK.frame();
      if (!boardCv || boardCv.width !== Math.ceil(W)) bakeBoard();
      g.drawImage(boardCv, 0, 0);

      for (const s of splats) drawSplat(g, s);

      /* whatever is still in the air fades as the results come up */
      if (!FK.R) drawPieces(g);
      else FK.layer(g, 1 - FK.eo(FK.rs('title', undefined, .3)), drawPieces);

      /* the front page, over the board and under the blade */
      if (FK.out < 1) FK.layer(g, 1 - FK.out, drawMenu);
      if (!over) drawBlade(g);

      for (const p of pops) {
        const k = 1 - p.life / p.t0;
        let s = 1;
        if (k < .25) { const q = k / .25, c1 = 1.7, c3 = c1 + 1; s = 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2); }
        g.globalAlpha = clamp(p.life / .3, 0, 1);
        brush(g, p.x, p.y, p.txt, { size: p.size, align: 'center', fill: p.col, scale: s, sp: .5 });
      }
      g.globalAlpha = 1;

      /* a single hard frame of colour on a cut or a bomb — one fill, no blur */
      if (flashT > 0) {
        g.globalAlpha = clamp(flashT / .22, 0, 1) * .3;
        g.fillStyle = flashCol; g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }

      if (!FK.R) { FK.layer(g, FK.out, drawHud); drawCombo(g); drawBanner(g); }
      else FK.layer(g, FK.out * (1 - FK.eo(FK.rs('title', undefined, .3))), c => { drawHud(c); drawCombo(c); drawBanner(c); });

      /* the opening instruction, until the first cut lands */
      /* (not after a round begun by swiping the melon: that player knows) */
      if (!sliced && !over && !FK.on && !menuSwiped && simT - playT < 7) {
        g.globalAlpha = clamp((7 - simT + playT) / 1.5, 0, 1) * clamp((simT - playT) / .5, 0, 1);
        brush(g, W / 2, H - 52, 'DRAG TO SLICE', {
          size: 22, align: 'center', sp: 4, fill: 'rgba(255,243,214,.8)', lw: 4
        });
        g.globalAlpha = 1;
      }
      if (FK.R) FK.resultsPage(g, W, H, RES);
    }

    /* ---- the front page ----
       Opened from the hub, Fruit Ninja starts on its own title, the way the
       arcade one did: the name in painted letters, and two rings on the board
       - a watermelon to slice to play, and a bomb to slice to leave. The cut
       is the round's own cut (the same blade, the same split, the same juice),
       and the round starts under it with the halves still in the air.
       Clicking a ring or pressing Space does the same, for anyone who would
       rather not swipe. */
    const FK = FrontKit(api, {
      goSound() {},
      onStart() { playT = simT; const m = MENU_FRUIT[0]; if (!m.cut) sliceMenu(m, rand(-.5, .5)); },
      onClick(k) { if (k === 'exit' && !MENU_FRUIT[1].cut) sliceMenu(MENU_FRUIT[1], rand(-.5, .5)); }
    });
    let playT = 0, menuExit = -1, menuSwiped = false;
    const MENU_FRUIT = [
      { kind: 'melon', dx: -118, y: 404, R: 96, r: 58, rot: -.3, ph: 0, cut: false, col: '#3f9d3a',
        txt: 'SLICE TO PLAY  ·  SLICE TO PLAY  ·  ', size: 15, key: 'play' },
      { kind: 'bomb', dx: 176, y: 424, R: 72, r: 33, rot: 0, ph: 1.7, cut: false, col: '#c4231c',
        txt: 'EXIT  ·  EXIT  ·  EXIT  ·  ', size: 14, key: 'exit' }
    ];
    const TITLE_COLS = ['#ff8c1a', '#f0455f', '#ffd23f', '#7cc242', '#b04ad6'];
    function menuSpot(m) { return { x: W / 2 + m.dx, y: m.y + Math.sin(simT * 2.2 + m.ph) * 5 }; }
    /* the menu's fruit are cut by exactly the test the round uses */
    function menuCut(fresh) {
      for (let k = 0; k < fresh.length; k += 2) {
        const a = fresh[k], b = fresh[k + 1];
        for (const m of MENU_FRUIT) {
          if (m.cut) continue;
          const p = menuSpot(m), rr = m.r * (m.kind === 'bomb' ? .86 : .92);
          if (segDist2(p.x, p.y, a.x, a.y, b.x, b.y) > rr * rr) continue;
          menuSwiped = true;
          sliceMenu(m, Math.atan2(b.y - a.y, b.x - a.x));
          return;
        }
      }
    }
    function sliceMenu(m, ang) {
      if (m.cut) return;
      m.cut = true;
      const p = menuSpot(m);
      if (m.kind === 'melon') {
        splitFruit({ type: 'melon', x: p.x, y: p.y, vx: 0, vy: -170, r: m.r, rot: m.rot, spin: .8 }, ang, p.x, p.y);
        Sound.ninjaSlice(m.r / 50, 1); Sound.ninjaSplat();
        FK.go();
        return;
      }
      /* the bomb: the round's own explosion, and then out to the hub */
      Sound.ninjaBomb(); api.shake(15);
      shakeT = .5; flashT = .22; flashCol = '#ffb03a';
      for (let i = 0; i < 46; i++) {
        const a = rand(0, TAU), sp = rand(120, 620);
        sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(2, 5.5), life: rand(.3, .8),
                      col: pick(['#ffd23f', '#ff8c1a', '#ff4a2a', '#fff3d6']) });
      }
      menuExit = .6;
    }
    /* a ring painted on the board, with its label running round it */
    function drawRing(g, m, k, hov) {
      const p = menuSpot(m), R = m.R;
      g.save();
      g.translate(p.x, p.y);
      const s = FK.bo(k) * (1 + hov * .05);
      g.scale(s, s);
      g.beginPath(); g.arc(0, 0, R, 0, TAU);
      g.lineWidth = 34; g.strokeStyle = INK; g.stroke();
      g.lineWidth = 27; g.strokeStyle = m.col; g.stroke();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.18)';
      g.beginPath(); g.arc(0, 0, R + 8, Math.PI * 1.08, Math.PI * 1.62); g.stroke();
      g.font = '900 ' + m.size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const chars = [...m.txt], step = TAU / chars.length, a0 = FK.t * (.28 + hov * .5) + m.ph;
      chars.forEach((c, i) => {
        if (c === ' ') return;
        g.save(); g.rotate(a0 + i * step); g.translate(0, -R);
        g.lineWidth = 4; g.strokeStyle = INK; g.strokeText(c, 0, 1);
        g.fillStyle = CREAM; g.fillText(c, 0, 1);
        g.restore();
      });
      /* and the fruit in the middle, turning slowly, until it is cut */
      if (!m.cut) {
        g.save();
        if (m.kind === 'melon') { g.rotate(m.rot + FK.t * .45 + Math.sin(FK.t * 3) * hov * .2); FRUIT.melon.draw(g, m.r); }
        else { g.rotate(Math.sin(FK.t * 1.6) * .16 + Math.sin(FK.t * 9) * hov * .12); drawBomb(g, m.r); }
        g.restore();
      }
      g.restore();
    }

    function drawMenu(g) {
      const cx = W / 2;
      /* FRUIT, a letter at a time, each the colour of something on the board */
      g.save();
      g.font = '900 108px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      const word = 'FRUIT', sp = 6, ws = [...word].map(c => g.measureText(c).width);
      g.restore();
      let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (word.length - 1)) / 2;
      [...word].forEach((c, i) => {
        const k = FK.in(.1 + i * .08, .34);
        if (k > 0) {
          const q = k, c1 = 1.9, c3 = c1 + 1, s = 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2);
          const bob = Math.sin(FK.t * 2 + i * .7) * 2.5;
          brush(g, x + ws[i] / 2, 150 + bob, c, { size: 108, align: 'center', fill: TITLE_COLS[i], lw: 15, sx: 5, sy: 7, scale: s });
        }
        x += ws[i] + sp;
      });
      /* NINJA, stamped on a red slab that lands after the fruit */
      const sk = FK.in(.62, .26);
      if (sk > 0) {
        const s = 1 + (1 - FK.eo(sk)) * .8, sy = 204;
        g.save(); g.translate(cx + 6, sy); g.scale(s, s); g.rotate(-.045);
        const bw = 300, bh = 64;
        g.beginPath();
        g.moveTo(-bw / 2 - 16, -bh / 2 + 6); g.lineTo(bw / 2 + 10, -bh / 2 - 4);
        g.lineTo(bw / 2 + 18, bh / 2 - 2); g.lineTo(-bw / 2 - 10, bh / 2 + 5);
        g.closePath();
        g.fillStyle = 'rgba(0,0,0,.45)'; g.save(); g.translate(4, 6); g.fill(); g.restore();
        g.fillStyle = '#c0261f'; g.fill(); outline(g, 4);
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-bw / 2 - 8, -bh / 2 + 9, bw + 18, 9);
        g.restore();
        brush(g, cx + 6, sy + 17, 'NINJA', { size: 48, align: 'center', sp: 12, fill: CREAM, scale: s, shadow: false, lw: 8 });
      }
      const best = api.best();
      if (best > 0 && FK.in(.9, .3) > 0)
        brush(g, cx, 270, 'BEST ' + fmt(best), { size: 17, align: 'center', sp: 2, fill: '#c9a06a', lw: 3.6, weight: 800 });

      /* the two rings */
      MENU_FRUIT.forEach((m, i) => {
        const k = FK.in(.75 + i * .12, .4);
        if (k <= 0) return;
        const p = menuSpot(m), b = FK.btn(m.key, p.x - m.R - 17, p.y - m.R - 17, (m.R + 17) * 2, (m.R + 17) * 2, !m.cut && menuExit < 0);
        drawRing(g, m, k, b.h);
      });
      if (FK.in(1.1, .4) > 0)
        brush(g, cx, 578, 'SWIPE THROUGH THE MELON TO PLAY   ·   OR PRESS SPACE', {
          size: 14, align: 'center', sp: 2.4, fill: 'rgba(255,243,214,.78)', lw: 3.4, weight: 800
        });
      FK.cursor();
    }
    /* a little juice already on the board, where the name is painted */
    if (FK.on) {
      splats.push({ x: W / 2 - 250, y: 128, r: 64, col: '#f0455f', rot: .4, seed: 11, life: 40 },
                  { x: W / 2 + 262, y: 96, r: 48, col: '#ffb020', rot: 2.1, seed: 47, life: 40 },
                  { x: W / 2 + 214, y: 238, r: 36, col: '#7cc242', rot: 1.2, seed: 83, life: 40 });
    }

    best = +(Store.best('ninja') || 0) || 0;
    bakeBoard();

    /* ---- the results ----
       Painted on the board like everything else: the verdict in the title's
       brush letters, a letter to a fruit's colour, the score stamped on the
       red slab NINJA sits on with the cut melon in front of it, and what the
       round did on dark painted signs, each with its fruit. Juice on the
       board behind the name, as on the front page. */
    const RFACE = 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
    const bt = (g, str, x, y, size, col, align) =>
      brush(g, x, y, String(str), { size, align, fill: col, baseline: 'middle', shadow: false, lw: Math.max(2.4, size * .2), weight: 900, sp: size * .05 });
    /* a rough-ended bar, the shape the combo and NINJA slabs are cut to */
    const slabPath = (x, y, w, h, e) => {
      const P = new Path2D();
      P.moveTo(x - e, y + h * .1); P.lineTo(x + w + e * .6, y - h * .06);
      P.lineTo(x + w + e, y + h * .97); P.lineTo(x - e * .6, y + h + h * .08);
      P.closePath();
      return P;
    };
    const paintSlab = (g, P, fill, lw) => {
      g.save(); g.translate(4, 6); g.fillStyle = 'rgba(0,0,0,.42)'; g.fill(P); g.restore();
      g.fillStyle = fill; g.fill(P);
      g.lineWidth = lw || 4; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(P);
    };
    const RES_FRUIT = ['melon', 'orange', 'strawberry', 'kiwi'];
    const RES = {
      top: 16, gap: 14, statH: 50, colL: 226, colR: 430,
      veil(g, k) { g.fillStyle = 'rgba(20,10,5,' + (.5 * k).toFixed(3) + ')'; g.fillRect(0, 0, W, H); },
      hero(g, cx, top) {
        const R = FK.R, T = FK.rt(), tight = R.paid.length > 4;
        /* juice where the name is painted */
        const jk = FK.eo(FK.rs('title', undefined, .6));
        if (jk > 0) {
          drawSplat(g, { x: cx - 300, y: top + 44, r: 58, col: '#f0455f', rot: .4, seed: 11, life: 2.2 * jk });
          drawSplat(g, { x: cx + 296, y: top + 30, r: 44, col: '#ffb020', rot: 2.1, seed: 47, life: 2.2 * jk });
          drawSplat(g, { x: cx + 250, y: top + 150, r: 32, col: '#7cc242', rot: 1.2, seed: 83, life: 2.2 * jk });
        }
        /* the verdict, a letter at a time, each the colour of a fruit */
        const word = String(R.title).toUpperCase(), size = tight ? 48 : word.length > 12 ? 50 : 58, sp = size * .06;
        g.save(); g.font = '900 ' + size + 'px ' + RFACE;
        const ws = [...word].map(c => g.measureText(c).width);
        g.restore();
        let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (word.length - 1)) / 2, ci = 0;
        const ty = top + size * .9;
        [...word].forEach((c, i) => {
          const ti = (T - .04 - i * .045) / .34;
          if (c !== ' ' && ti > 0) {
            const q = Math.min(1, ti), c1 = 1.9, c3 = c1 + 1, sc = 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2);
            const bob = Math.sin(FK.t * 2 + i * .7) * 2;
            brush(g, x + ws[i] / 2, ty + bob, c, { size, align: 'center', fill: R.win ? '#ffd23f' : TITLE_COLS[ci % TITLE_COLS.length], lw: size * .14, sx: 4, sy: 6, scale: sc });
          }
          if (c !== ' ') ci++;
          x += ws[i] + sp;
        });
        const my = ty + (tight ? 26 : 30), mk = FK.eo(FK.rs('sub', undefined, .4));
        if (mk > 0) {
          g.save(); g.globalAlpha *= mk;
          brush(g, cx, my, String(R.message), { size: 14, align: 'center', sp: 1.4, fill: 'rgba(255,243,214,.85)', lw: 3.4, weight: 800, baseline: 'middle' });
          g.restore();
        }
        /* the score on the slab, landing hard the way NINJA does */
        const sk = FK.rs('stat', 0, .26), bh = tight ? 56 : 64, bw = 330, sy = my + (tight ? 24 : 30) + bh / 2;
        if (sk > 0) {
          const sc = 1 + (1 - FK.eo(sk)) * .8, v = Math.round(R.score * FK.eo(FK.rs('stat', 0, .9)));
          g.save(); g.globalAlpha *= Math.min(1, sk * 3); g.translate(cx + 4, sy); g.scale(sc, sc); g.rotate(-.045);
          const P = slabPath(-bw / 2, -bh / 2, bw, bh, 14);
          paintSlab(g, P, '#c0261f', 4);
          g.save(); g.clip(P); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-bw / 2 - 20, -bh / 2 + 7, bw + 40, 8); g.restore();
          scoreIcon(g, -bw / 2 + 34, 9, bh * .27);
          g.restore();
          brush(g, cx + 22, sy + 2, fmt(v), { size: bh * .72, align: 'center', sp: 1.5, fill: CREAM, baseline: 'middle', shadow: false, lw: bh * .13, scale: sc });
        }
        /* and the best, under it */
        const gy = sy + bh / 2 + (tight ? 20 : 24), gk = FK.rs('tag', undefined, .45);
        if (gk > 0) {
          if (R.isBest) {
            const pop = (gk < 1 ? FK.bo(gk) : 1) * (1 + Math.sin(FK.t * 5) * .03);
            brush(g, cx, gy, 'NEW BEST!', { size: 22, align: 'center', sp: 2.4, fill: '#ffd23f', lw: 5, baseline: 'middle', scale: pop });
          } else {
            g.save(); g.globalAlpha *= FK.eo(gk);
            brush(g, cx, gy, (R.cheated ? 'NOT SAVED  ·  ' : '') + 'BEST ' + fmt(R.best), { size: 16, align: 'center', sp: 1.8, fill: '#c9a06a', lw: 3.6, weight: 800, baseline: 'middle' });
            g.restore();
          }
        }
        return gy + 14 - top;
      },
      stat(g, st, x, y, w, h, i) {
        paintSlab(g, slabPath(x, y, w, h, 8), '#3a2416', 3.5);
        g.save(); g.translate(x + 24, y + h / 2); g.rotate(-.3 + i * .5);
        FRUIT[RES_FRUIT[i % RES_FRUIT.length]].draw(g, 12);
        g.restore();
        bt(g, String(st.label).toUpperCase(), x + 46, y + h / 2, 11, '#c9a06a', 'left');
        bt(g, String(st.value), x + w - 14, y + h / 2 + 1, 22, CREAM, 'right');
      },
      card(g, x, y, w, h) {
        g.save(); g.translate(4, 6); g.fillStyle = 'rgba(0,0,0,.42)'; rr(g, x, y, w, h, 14); g.fill(); g.restore();
        g.fillStyle = '#301d12'; rr(g, x, y, w, h, 14); g.fill();
        /* two planks' worth of grain, like the board it hangs on */
        g.fillStyle = 'rgba(0,0,0,.18)';
        for (let k = 0; k < 4; k++) g.fillRect(x + 12, y + 30 + k * (h - 50) / 3, w - 24, 1.5);
        g.lineWidth = 4; g.strokeStyle = INK; rr(g, x, y, w, h, 14); g.stroke();
        g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,243,214,.1)'; rr(g, x + 6, y + 6, w - 12, h - 12, 9); g.stroke();
      },
      ls: {
        text: bt, label: (g, str, x, y, size, col, align) => bt(g, String(str).toUpperCase(), x, y, size, col, align),
        measure(g, str, size) {
          g.save(); g.font = '900 ' + size + 'px ' + RFACE;
          let w = 0; for (const c of String(str)) w += g.measureText(c).width + size * .05;
          g.restore(); return w;
        },
        ink: CREAM, mute: '#c9a06a', gold: '#ffb020', rule: 'rgba(255,243,214,.2)', bar: 'rgba(0,0,0,.35)', fill: '#7cc242',
        rowH: 22, size: 15, lsize: 11, totalSize: 28, totalH: 38, xpH: 40, barH: 10, noteGap: 86
      },
      head(g, x, y, w) {
        bt(g, 'COINS', x, y + 2, 12, '#c9a06a', 'left');
        bt(g, fmt(FK.purse()), x + w, y + 2, 19, '#ffb020', 'right');
      },
      button(g, key, label, x, y, w, h, primary) {
        const b = FK.btn(key, x, y, w, h);
        const lift = b.h * 3, sc = 1 + b.h * .04 - b.p * .03;
        g.save(); g.translate(x + w / 2, y + h / 2 - lift); g.scale(sc, sc); g.rotate(primary ? -.03 : .025);
        const P = slabPath(-w / 2 + 6, -h / 2, w - 12, h, 8);
        paintSlab(g, P, primary ? '#c0261f' : '#3a2416', 4);
        g.save(); g.clip(P); g.fillStyle = 'rgba(255,255,255,' + (primary ? .14 + b.h * .08 : .06 + b.h * .06).toFixed(3) + ')';
        g.fillRect(-w / 2 - 14, -h / 2 + 6, w + 28, 7); g.restore();
        g.restore();
        brush(g, x + w / 2, y + h / 2 - lift + 1, label, { size: primary ? 23 : 18, align: 'center', sp: primary ? 2.4 : 1.8, fill: CREAM, baseline: 'middle', shadow: false, lw: primary ? 6 : 4.6, scale: sc });
      },
      hint(g, cx, y) {
        brush(g, cx, y, 'SPACE TO PLAY AGAIN   ·   ESC FOR THE HUB', { size: 12, align: 'center', sp: 2, fill: 'rgba(255,243,214,.7)', lw: 3, weight: 800, baseline: 'middle' });
      }
    };

    return {
      resize() { W = api.W; bakeBoard(); },
      update: update,
      render: render,
      /* Escape on the front page goes back to the hub; in a round it pauses */
      escape: FK.escape,
      destroy() { FK.done(); fruits.length = 0; halves.length = 0; trail.length = 0; },
      results(R) { FK.showResults(R); },
      /* the simulation is plain objects and pure-ish steps, so a check can
         throw fruit and swing a blade at it without a canvas or a player */
      _dev: {
        get state() { return { score: score, lives: lives, fruits: fruits, halves: halves, over: over, sliced: sliced, thrown: thrown, combo: combo, splats: splats }; },
        throwOne: throwOne, wave: wave, update: update,
        cut(ax, ay, bx, by) {
          /* drive a swipe straight through the same path the pointer takes */
          trail.length = 0;
          const n = 14;
          for (let i = 0; i <= n; i++)
            trail.push({ x: ax + (bx - ax) * i / n, y: ay + (by - ay) * i / n, t: simT - CUT_WINDOW * (1 - i / n) });
          strokeLen = 999;
          let hits = 0;
          for (let k = 0; k + 1 < trail.length; k++) {
            const a = trail[k], b = trail[k + 1];
            for (let i = fruits.length - 1; i >= 0; i--) {
              const f = fruits[i], rr = f.r * (f.bomb ? .86 : .92);
              if (segDist2(f.x, f.y, a.x, a.y, b.x, b.y) > rr * rr) continue;
              hitFruit(f, i, Math.atan2(b.y - a.y, b.x - a.x), f.x, f.y); hits++;
            }
          }
          return hits;
        },
        get W() { return W; }, get H() { return H; }, fruitDefs: FRUIT
      }
    };
  }
});


