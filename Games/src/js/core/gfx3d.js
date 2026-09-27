/* ============================================================================
   GFX3D — a small lit 3D renderer

   Mini Golf and 8-Ball draw their worlds with this: real geometry, a sun that
   throws soft shadows, lamps, procedural materials (turf, felt, lacquered
   wood, water, lava, ice) and a particle system.

   One context serves the whole page rather than one per round. A browser only
   keeps a handful of WebGL contexts alive, and building the shaders again on
   every restart would stall the first frame; a shared one costs neither.
   Meshes still belong to whoever made them, through a scope() that frees the
   lot when that round is torn down.

   World space is the game's own: x and y are exactly the numbers its physics
   uses, and z is up. The camera is all that makes it 3D — toGround() turns a
   pointer into a spot on the table, toScreen() puts a label over a ball, and
   groundInput() hands a game its usual Input with both already done — so a
   game's rules never learn that anything is tilted.

   A note on handedness, because it bites once: with y running down the screen
   and z up, the view basis is a mirror image of the usual one. Nothing here
   relies on triangle winding (culling is off and normals are always given or
   turned outward explicitly), so the mirror costs nothing but this comment.

   get() answers null wherever WebGL2 is missing or a shader will not build,
   and the games keep their canvas-2D painting for exactly that case.
   ========================================================================== */
const Gfx3D = (() => {
  /* ------------------------------------------------------------ maths --- */
  /* column-major 4x4 matrices, the layout GL reads */
  const M4 = {
    make() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    _t: new Float32Array(16),
    mul(o, a, b) {
      const t = M4._t;
      for (let c = 0; c < 16; c += 4) {
        const b0 = b[c], b1 = b[c + 1], b2 = b[c + 2], b3 = b[c + 3];
        t[c]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
        t[c + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
        t[c + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        t[c + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
      o.set(t);
      return o;
    },
    persp(o, fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2);
      o.fill(0);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
      return o;
    },
    ortho(o, l, r, b, t, n, f) {
      o.fill(0);
      o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[15] = 1;
      o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n);
      return o;
    },
    /* a camera from its eye and its right / up / back axes */
    view(o, e, r, u, b) {
      o[0] = r[0]; o[4] = r[1]; o[8]  = r[2]; o[12] = -(r[0] * e[0] + r[1] * e[1] + r[2] * e[2]);
      o[1] = u[0]; o[5] = u[1]; o[9]  = u[2]; o[13] = -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]);
      o[2] = b[0]; o[6] = b[1]; o[10] = b[2]; o[14] = -(b[0] * e[0] + b[1] * e[1] + b[2] * e[2]);
      o[3] = 0; o[7] = 0; o[11] = 0; o[15] = 1;
      return o;
    },
    invert(o, a) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    },
    /* spin about the vertical, scale per axis, then move — how nearly every
       prop and moving part is placed */
    place(o, x, y, z, rot, sx, sy, sz) {
      const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
      if (sx === undefined) sx = 1;
      if (sy === undefined) sy = sx;
      if (sz === undefined) sz = sx;
      o[0] = c * sx; o[1] = s * sx; o[2] = 0; o[3] = 0;
      o[4] = -s * sy; o[5] = c * sy; o[6] = 0; o[7] = 0;
      o[8] = 0; o[9] = 0; o[10] = sz; o[11] = 0;
      o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
      return o;
    },
    /* a unit quaternion's rotation, one uniform scale, then a move */
    quat(o, q, s, x, y, z) {
      const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
      const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
      const xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2;
      const wx = qw * x2, wy = qw * y2, wz = qw * z2;
      o[0] = (1 - (yy + zz)) * s; o[1] = (xy + wz) * s; o[2] = (xz - wy) * s; o[3] = 0;
      o[4] = (xy - wz) * s; o[5] = (1 - (xx + zz)) * s; o[6] = (yz + wx) * s; o[7] = 0;
      o[8] = (xz + wy) * s; o[9] = (yz - wx) * s; o[10] = (1 - (xx + yy)) * s; o[11] = 0;
      o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
      return o;
    },
    /* three axis columns and an origin, for anything that has to point */
    axes(o, a, b, c, p) {
      o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = 0;
      o[4] = b[0]; o[5] = b[1]; o[6] = b[2]; o[7] = 0;
      o[8] = c[0]; o[9] = c[1]; o[10] = c[2]; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1;
      return o;
    }
  };
  /* the inverse-transpose of a matrix's 3x3, so a squashed sphere still lights
     like one */
  function nrm3(o, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a10 = m[4], a11 = m[5], a12 = m[6], a20 = m[8], a21 = m[9], a22 = m[10];
    const b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) { o.fill(0); o[0] = o[4] = o[8] = 1; return o; }
    det = 1 / det;
    o[0] = b01 * det; o[1] = b11 * det; o[2] = b21 * det;
    o[3] = (-a22 * a01 + a02 * a21) * det; o[4] = (a22 * a00 - a02 * a20) * det; o[5] = (-a21 * a00 + a01 * a20) * det;
    o[6] = (a12 * a01 - a02 * a11) * det; o[7] = (-a12 * a00 + a02 * a10) * det; o[8] = (a11 * a00 - a01 * a10) * det;
    return o;
  }
  const Q = {
    make: () => [0, 0, 0, 1],
    /* turn q about a world axis by `ang`, in place */
    turn(q, ax, ay, az, ang) {
      const h = ang / 2, s = Math.sin(h);
      const bx = ax * s, by = ay * s, bz = az * s, bw = Math.cos(h);
      const x = q[0], y = q[1], z = q[2], w = q[3];
      q[0] = bw * x + bx * w + by * z - bz * y;
      q[1] = bw * y - bx * z + by * w + bz * x;
      q[2] = bw * z + bx * y - by * x + bz * w;
      q[3] = bw * w - bx * x - by * y - bz * z;
      const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
      q[0] /= n; q[1] /= n; q[2] /= n; q[3] /= n;
      return q;
    },
    /* where the body's own axis (x, y, z) points now */
    rot(q, x, y, z) {
      const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
      const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
      return [x + qw * tx + (qy * tz - qz * ty), y + qw * ty + (qz * tx - qx * tz), z + qw * tz + (qx * ty - qy * tx)];
    }
  };

  /* ------------------------------------------------------------ colour --- */
  function srgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  /* Lighting happens in linear light and is encoded once on the way out,
     which is what makes a falloff look like light rather than a gradient. */
  function lin(hex, k) {
    const c = srgb(hex), m = k === undefined ? 1 : k;
    return [Math.pow(c[0], 2.2) * m, Math.pow(c[1], 2.2) * m, Math.pow(c[2], 2.2) * m];
  }
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const withAo = (c, a) => [c[0], c[1], c[2], a];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  /* ---------------------------------------------------------- geometry --- */
  /* Twelve floats a vertex: position, normal, colour (rgb + an occlusion
     term the shaders read as ambient), and a uv that the materials treat as
     world units along the surface, so grain and planks come out the right
     size whatever the part. */
  function Geo() {
    const V = [], I = [];
    const g = {
      V, I,
      get n() { return V.length / 12; },
      v(x, y, z, nx, ny, nz, c, u, w) {
        V.push(x, y, z, nx, ny, nz, c[0], c[1], c[2], c.length > 3 ? c[3] : 1, u || 0, w || 0);
        return V.length / 12 - 1;
      },
      t(a, b, c) { I.push(a, b, c); },
      q(a, b, c, d) { I.push(a, b, c, a, c, d); },
      /* A flat polygon (3 or 4 corners, in order round the edge). The normal
         is worked out here and turned away from `inside`, so callers never
         have to think about which way round they listed the corners. */
      face(pts, c, inside, uvf) {
        const p0 = pts[0], p1 = pts[1], p2 = pts[pts.length - 1];
        const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
        const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        if (inside) {
          let cx = 0, cy = 0, cz = 0;
          for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
          cx = cx / pts.length - inside[0]; cy = cy / pts.length - inside[1]; cz = cz / pts.length - inside[2];
          if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        }
        const base = g.n;
        for (const p of pts) {
          const uv = uvf ? uvf(p, nx, ny, nz) : [p[0], p[1]];
          g.v(p[0], p[1], p[2], nx, ny, nz, c, uv[0], uv[1]);
        }
        for (let i = 1; i < pts.length - 1; i++) g.t(base, base + i, base + i + 1);
      },
      /* An upright block. `bev` chamfers the four top edges, which is what
         makes a rail catch a line of light instead of reading as a flat slab.
         uv runs along the block's long side so wood grain follows it. */
      box(x0, y0, z0, x1, y1, z1, c, bev) {
        const b = Math.max(0, Math.min(bev || 0, (x1 - x0) / 2 - .01, (y1 - y0) / 2 - .01, z1 - z0 - .01));
        const ins = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
        const along = (x1 - x0) >= (y1 - y0);
        const uvf = (p, nx, ny, nz) => {
          const a = along ? p[0] : p[1], o = along ? p[1] : p[0];
          return Math.abs(nz) > .5 ? [a, o] : [a, p[2] + o * .3];
        };
        const zt = z1 - b;
        const T = [[x0 + b, y0 + b, z1], [x1 - b, y0 + b, z1], [x1 - b, y1 - b, z1], [x0 + b, y1 - b, z1]];
        g.face(T, c, ins, uvf);
        if (b > 0) {
          g.face([T[0], T[1], [x1, y0, zt], [x0, y0, zt]], c, ins, uvf);
          g.face([T[1], T[2], [x1, y1, zt], [x1, y0, zt]], c, ins, uvf);
          g.face([T[2], T[3], [x0, y1, zt], [x1, y1, zt]], c, ins, uvf);
          g.face([T[3], T[0], [x0, y0, zt], [x0, y1, zt]], c, ins, uvf);
        }
        g.face([[x0, y0, z0], [x1, y0, z0], [x1, y0, zt], [x0, y0, zt]], c, ins, uvf);
        g.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, zt], [x1, y0, zt]], c, ins, uvf);
        g.face([[x1, y1, z0], [x0, y1, z0], [x0, y1, zt], [x1, y1, zt]], c, ins, uvf);
        g.face([[x0, y1, z0], [x0, y0, z0], [x0, y0, zt], [x0, y1, zt]], c, ins, uvf);
      },
      /* upright cylinder; o: { top, bottom, inner, a0, a1, c0 (colour at z0) } */
      cyl(cx, cy, z0, z1, r, seg, c, o) {
        o = o || {};
        const s = o.inner ? -1 : 1, a0 = o.a0 || 0, a1 = o.a1 === undefined ? TAU : o.a1;
        const base = g.n;
        for (let i = 0; i <= seg; i++) {
          const a = a0 + (a1 - a0) * i / seg, ca = Math.cos(a), sa = Math.sin(a);
          g.v(cx + ca * r, cy + sa * r, z0, ca * s, sa * s, 0, o.c0 || c, r * a, z0);
          g.v(cx + ca * r, cy + sa * r, z1, ca * s, sa * s, 0, c, r * a, z1);
        }
        for (let i = 0; i < seg; i++) { const k = base + i * 2; g.q(k, k + 2, k + 3, k + 1); }
        if (o.top) g.disc(cx, cy, z1, r, seg, o.topC || c);
        if (o.bottom) g.disc(cx, cy, z0, r, seg, o.c0 || c, true);
      },
      disc(cx, cy, z, r, seg, c, down) {
        const nz = down ? -1 : 1, base = g.v(cx, cy, z, 0, 0, nz, c, cx, cy);
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          g.v(x, y, z, 0, 0, nz, c, x, y);
        }
        for (let i = 0; i < seg; i++) g.t(base, base + 1 + i, base + 2 + i);
      },
      /* a sphere, optionally squashed (k) or stretched along x (kx) */
      sphere(cx, cy, cz, r, seg, rings, c, k, kx) {
        const base = g.n, sz = k || 1, sx = kx || 1;
        for (let j = 0; j <= rings; j++) {
          const ph = j / rings * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
          for (let i = 0; i <= seg; i++) {
            const th = i / seg * TAU, nx = Math.cos(th) * sp, ny = Math.sin(th) * sp, nz = cp;
            const mx = nx / sx, my = ny, mz = nz / sz, ml = Math.hypot(mx, my, mz) || 1;
            g.v(cx + nx * r * sx, cy + ny * r, cz + nz * r * sz, mx / ml, my / ml, mz / ml, c, i / seg, j / rings);
          }
        }
        for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
          const a = base + j * (seg + 1) + i, b = a + seg + 1;
          g.q(a, b, b + 1, a + 1);
        }
      },
      torus(cx, cy, cz, R, r, seg, sides, c, a0, a1) {
        a0 = a0 || 0; if (a1 === undefined) a1 = TAU;
        const base = g.n;
        for (let i = 0; i <= seg; i++) {
          const a = a0 + (a1 - a0) * i / seg, ca = Math.cos(a), sa = Math.sin(a);
          for (let j = 0; j <= sides; j++) {
            const b = j / sides * TAU, cb = Math.cos(b), sb = Math.sin(b);
            g.v(cx + ca * (R + r * cb), cy + sa * (R + r * cb), cz + r * sb, ca * cb, sa * cb, sb, c, R * a, j / sides);
          }
        }
        for (let i = 0; i < seg; i++) for (let j = 0; j < sides; j++) {
          const a = base + i * (sides + 1) + j, b = a + sides + 1;
          g.q(a, b, b + 1, a + 1);
        }
      },
      /* A surface of revolution about the local z axis. prof is [r, z, colour?]
         listed from one end to the other; a repeated point starts a hard
         colour band, which is how the cue gets its ferrule and wrap. */
      lathe(prof, seg, c) {
        const base = g.n, m = prof.length;
        const nr = prof.map((p, i) => {
          const a = prof[Math.max(0, i - 1)], b = prof[Math.min(m - 1, i + 1)];
          let dr = b[0] - a[0], dz = b[1] - a[1];
          if (!dr && !dz) { const q = prof[Math.min(m - 1, i + 2)]; dr = q[0] - p[0]; dz = q[1] - p[1]; }
          const l = Math.hypot(dr, dz) || 1;
          return [dz / l, -dr / l];
        });
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * TAU, ca = Math.cos(a), sa = Math.sin(a);
          for (let j = 0; j < m; j++) {
            const p = prof[j];
            g.v(ca * p[0], sa * p[0], p[1], ca * nr[j][0], sa * nr[j][0], nr[j][1], p[2] || c, a * 3, p[1]);
          }
        }
        for (let i = 0; i < seg; i++) for (let j = 0; j < m - 1; j++) {
          const a = base + i * m + j, b = a + m;
          g.q(a, b, b + 1, a + 1);
        }
      },
      /* a heightfield over a rectangle: zf(x, y) gives the height, cf the colour */
      grid(x0, y0, w, h, nx, ny, zf, cf) {
        const base = g.n, e = .6;
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
          const x = x0 + w * i / nx, y = y0 + h * j / ny, z = zf(x, y);
          const gx = (zf(x + e, y) - zf(x - e, y)) / (2 * e), gy = (zf(x, y + e) - zf(x, y - e)) / (2 * e);
          const l = Math.hypot(gx, gy, 1);
          g.v(x, y, z, -gx / l, -gy / l, 1 / l, cf ? cf(x, y, z) : [1, 1, 1, 1], x, y);
        }
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const a = base + j * (nx + 1) + i;
          g.q(a, a + 1, a + nx + 2, a + nx + 1);
        }
      },
      /* A profile run all the way round a closed outline. Each outline point
         is [x, y, nx, ny, base height?, mitre?]: its outward normal, the
         height the profile stands on there (so a rail can climb a hill), and
         how much to stretch the offsets where two edges meet at an inside
         corner. Each profile point [s, z, smooth?] says how far out and how
         high that ring sits. Segments are shaded flat across the profile
         unless a point asks to be smooth, which keeps a chamfer a chamfer. */
      sweep(path, prof, c, cols, open) {
        const n = path.length, m = prof.length, N = open ? n - 1 : n;   // an open run stops at its last point; a loop comes back round
        const dist = [0];
        for (let i = 1; i <= N; i++) {
          const a = path[i - 1], b = path[i % n];
          dist.push(dist[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
        }
        const segN = [];
        for (let j = 0; j < m - 1; j++) {
          const ds = prof[j + 1][0] - prof[j][0], dz = prof[j + 1][1] - prof[j][1], l = Math.hypot(ds, dz) || 1;
          segN.push([-dz / l, ds / l]);
        }
        for (let j = 0; j < m - 1; j++) {
          const ends = [j, j + 1].map(k => {
            let nn = segN[j];
            if (prof[k][2]) {
              const o = segN[k === j ? j - 1 : j + 1];
              if (o) { const s = nn[0] + o[0], z = nn[1] + o[1], l = Math.hypot(s, z) || 1; nn = [s / l, z / l]; }
            }
            return nn;
          });
          const base = g.n, col = cols ? cols[j] : c;
          for (let i = 0; i <= N; i++) {
            const P = path[i % n], zb = P[4] || 0, mi = P[5] || 1;
            for (let e = 0; e < 2; e++) {
              const pr = prof[j + e], nn = ends[e];
              g.v(P[0] + P[2] * pr[0] * mi, P[1] + P[3] * pr[0] * mi, pr[1] + zb, P[2] * nn[0], P[3] * nn[0], nn[1], col, dist[i], pr[0] * 1.3 + pr[1]);
            }
          }
          for (let i = 0; i < N; i++) { const a = base + i * 2; g.q(a, a + 2, a + 3, a + 1); }
        }
      },
      /* append another Geo moved by matrix m (and optionally recoloured) */
      add(o, m, c) {
        const base = g.n, nm = nrm3(new Float32Array(9), m);
        for (let i = 0; i < o.V.length; i += 12) {
          const x = o.V[i], y = o.V[i + 1], z = o.V[i + 2], a = o.V[i + 3], b = o.V[i + 4], d = o.V[i + 5];
          let nx = nm[0] * a + nm[3] * b + nm[6] * d, ny = nm[1] * a + nm[4] * b + nm[7] * d, nz = nm[2] * a + nm[5] * b + nm[8] * d;
          const l = Math.hypot(nx, ny, nz) || 1;
          V.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14],
                 nx / l, ny / l, nz / l,
                 c ? c[0] * o.V[i + 6] : o.V[i + 6], c ? c[1] * o.V[i + 7] : o.V[i + 7], c ? c[2] * o.V[i + 8] : o.V[i + 8], o.V[i + 9],
                 o.V[i + 10], o.V[i + 11]);
        }
        for (const k of o.I) I.push(k + base);
      },
      /* a flat strip from (x0,y0) to (x1,y1), w wide, at height z: uv.x is the
         distance along it and uv.y runs -1..1 across, which is what the
         dashed and chevron effects read */
      strip(x0, y0, x1, y1, w, z, c, u0) {
        const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, px = -dy / l * w / 2, py = dx / l * w / 2;
        const base = g.n, s = u0 || 0, col = c || [1, 1, 1, 1];
        g.v(x0 + px, y0 + py, z, 0, 0, 1, col, s, 1);
        g.v(x1 + px, y1 + py, z, 0, 0, 1, col, s + l, 1);
        g.v(x1 - px, y1 - py, z, 0, 0, 1, col, s + l, -1);
        g.v(x0 - px, y0 - py, z, 0, 0, 1, col, s, -1);
        g.q(base, base + 1, base + 2, base + 3);
      },
      /* a flat square decal centred on (x,y), uv 0..1 */
      decal(x, y, z, r, c, rot) {
        const base = g.n, col = c || [1, 1, 1, 1], ca = Math.cos(rot || 0) * r, sa = Math.sin(rot || 0) * r;
        g.v(x - ca + sa, y - sa - ca, z, 0, 0, 1, col, 0, 0);
        g.v(x + ca + sa, y + sa - ca, z, 0, 0, 1, col, 1, 0);
        g.v(x + ca - sa, y + sa + ca, z, 0, 0, 1, col, 1, 1);
        g.v(x - ca - sa, y - sa + ca, z, 0, 0, 1, col, 0, 1);
        g.q(base, base + 1, base + 2, base + 3);
      }
    };
    return g;
  }
  /* a rounded rectangle as an outline with outward normals, for sweep() */
  function rrPath(x, y, w, h, r, seg) {
    const out = [];
    const cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const c of cs) for (let i = 0; i <= seg; i++) {
      const a = c[2] + (Math.PI / 2) * i / seg, nx = Math.cos(a), ny = Math.sin(a);
      out.push([c[0] + nx * r, c[1] + ny * r, nx, ny]);
    }
    return out;
  }

  /* ------------------------------------------------------------ camera --- */
  function Camera(W, H) {
    const c = {
      W, H, fov: .55, near: 20, far: 9000,
      eye: [0, 0, 1], tgt: [0, 0, 0], dist: 1000, pitch: 1, yaw: 0,
      r: [1, 0, 0], u: [0, 0, 1], b: [0, 1, 0],
      view: M4.make(), proj: M4.make(), vp: M4.make(), ivp: M4.make(),
      /* look at (tx, ty, tz) from `dist` away, pitched down by `pitch` and
         turned by `yaw` — 0 is from the south, looking up the screen */
      orbit(tx, ty, tz, dist, pitch, yaw) {
        const cp = Math.cos(pitch), sp = Math.sin(pitch), sy = Math.sin(yaw || 0), cy = Math.cos(yaw || 0);
        const f = [sy * cp, -cy * cp, -sp];
        this.eye = [tx - f[0] * dist, ty - f[1] * dist, tz - f[2] * dist];
        this.tgt = [tx, ty, tz]; this.dist = dist; this.pitch = pitch; this.yaw = yaw || 0;
        let rx = -f[1], ry = f[0];
        const rl = Math.hypot(rx, ry) || 1; rx /= rl; ry /= rl;
        this.r = [rx, ry, 0];
        this.u = [-f[2] * ry, f[2] * rx, f[0] * ry - f[1] * rx];
        this.b = [-f[0], -f[1], -f[2]];
        this.update();
        return this;
      },
      update() {
        M4.view(this.view, this.eye, this.r, this.u, this.b);
        M4.persp(this.proj, this.fov, this.W / this.H, this.near, this.far);
        /* a lens shift, in screen halves: [.3, 0] stands the picture 15% to the right */
        if (this.shift) { this.proj[8] = -this.shift[0]; this.proj[9] = -this.shift[1]; }
        M4.mul(this.vp, this.proj, this.view);
        M4.invert(this.ivp, this.vp);
      },
      toScreen(x, y, z) {
        const m = this.vp;
        const X = m[0] * x + m[4] * y + m[8] * z + m[12];
        const Y = m[1] * x + m[5] * y + m[9] * z + m[13];
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        return { x: (X / w * .5 + .5) * this.W, y: (.5 - Y / w * .5) * this.H, w };
      },
      /* where a screen point lands on the horizontal plane at height gz */
      toGround(sx, sy, gz) {
        const nx = sx / this.W * 2 - 1, ny = 1 - sy / this.H * 2, m = this.ivp;
        const un = z => {
          const w = m[3] * nx + m[7] * ny + m[11] * z + m[15];
          return [(m[0] * nx + m[4] * ny + m[8] * z + m[12]) / w,
                  (m[1] * nx + m[5] * ny + m[9] * z + m[13]) / w,
                  (m[2] * nx + m[6] * ny + m[10] * z + m[14]) / w];
        };
        const a = un(-1), b = un(1), t = ((gz || 0) - a[2]) / ((b[2] - a[2]) || 1e-6);
        return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
      },
      /* Frame a set of world points inside a screen rectangle. The camera
         keeps its angle and lens and only moves — nearer or further, and
         across — until the points fill the rectangle's tighter side and sit
         centred in it. A tilted view is wider at the bottom than the top, so
         there is no closed form worth having; this settles in a few dozen
         steps and only runs when the scene changes. */
      fit(pts, rect, pitch, yaw, fov) {
        if (fov) this.fov = fov;
        let tx = 0, ty = 0;
        for (const p of pts) { tx += p[0]; ty += p[1]; }
        tx /= pts.length; ty /= pts.length;
        let dist = 1400;
        for (let it = 0; it < 80; it++) {
          this.orbit(tx, ty, 0, dist, pitch, yaw);
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (const p of pts) {
            const s = this.toScreen(p[0], p[1], p[2] || 0);
            if (s.x < x0) x0 = s.x; if (s.x > x1) x1 = s.x;
            if (s.y < y0) y0 = s.y; if (s.y > y1) y1 = s.y;
          }
          const k = Math.max((x1 - x0) / (rect[2] - rect[0]), (y1 - y0) / (rect[3] - rect[1]));
          const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (rect[0] + rect[2]) / 2, ry = (rect[1] + rect[3]) / 2;
          const a = this.toGround(cx, cy, 0), b = this.toGround(rx, ry, 0);
          tx += (a.x - b.x) * .85; ty += (a.y - b.y) * .85;
          dist *= Math.pow(k, .85);
          if (Math.abs(k - 1) < 2e-4 && Math.abs(cx - rx) + Math.abs(cy - ry) < .05) break;
        }
        this.orbit(tx, ty, 0, dist, pitch, yaw);
        return this;
      }
    };
    return c;
  }

  /* The same Input a game already reads, with the pointer and clicks moved
     off the screen and onto the ground plane at height z (a number, or a
     function when the ground under the play moves up and down a hill). */
  function groundInput(I, camOf, z) {
    const map = (x, y) => {
      const c = camOf();
      return c ? c.toGround(x, y, typeof z === 'function' ? z() : (z || 0)) : { x, y };
    };
    const ptr = { x: 0, y: 0, down: false, rdown: false, inside: false };
    return {
      down: c => I.down(c), pressed: c => I.pressed(c),
      any: (...c) => I.any(...c), anyPressed: (...c) => I.anyPressed(...c),
      get pointer() {
        const p = I.pointer, w = map(p.x, p.y);
        ptr.x = w.x; ptr.y = w.y; ptr.down = p.down; ptr.rdown = p.rdown; ptr.inside = p.inside;
        return ptr;
      },
      get clicks() { return I.clicks; },
      takeClick() { const c = I.takeClick(); if (!c) return null; const w = map(c.x, c.y); return { x: w.x, y: w.y, btn: c.btn }; },
      takeChars: () => I.takeChars(), takeMoves: () => I.takeMoves(), takeSwipe: () => I.takeSwipe()
    };
  }

  /* --------------------------------------------------------- particles --- */
  /* Sparks, splashes, dust and confetti with real height: they are thrown
     up, fall back under gravity and can bounce on the ground they hit.
     burst() takes x y z · n · speed (sideways) · up (vertical: a number, or
     [lo, hi]) · angle / spread · life · size · color · alpha · grav (z, per
     s², negative falls) · drag · add (glowing, added onto what is behind) ·
     shape (1 = a spinning square, for confetti) · spin · floor · grow · jit */
  function Particles(max) {
    const L = [];
    const P = {
      list: L, max: max || 800,
      burst(o) {
        const n = o.n || 10, col = Array.isArray(o.color) ? o.color : srgb(o.color || '#ffffff');
        for (let i = 0; i < n && L.length < P.max; i++) {
          const a = o.angle !== undefined ? o.angle + (Math.random() - .5) * (o.spread === undefined ? TAU : o.spread) : Math.random() * TAU;
          const sp = (o.speed || 0) * (.3 + Math.random() * .7);
          const up = Array.isArray(o.up) ? o.up[0] + Math.random() * (o.up[1] - o.up[0]) : (o.up || 0) * (.5 + Math.random() * .5);
          const j = o.jit || 0, life = (o.life || .6) * (.7 + Math.random() * .5);
          L.push({
            x: o.x + (Math.random() - .5) * j, y: o.y + (Math.random() - .5) * j, z: (o.z || 0) + (Math.random() - .5) * (o.jz || 0),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: up,
            life, max: life, size: (o.size || 3) * (.7 + Math.random() * .6),
            r: col[0], g: col[1], b: col[2], a: o.alpha === undefined ? 1 : o.alpha,
            grav: o.grav === undefined ? -600 : o.grav, drag: o.drag === undefined ? 1.2 : o.drag,
            add: !!o.add, shape: o.shape || 0, rot: Math.random() * TAU, vr: (Math.random() - .5) * (o.spin || 0),
            floor: o.floor === undefined ? null : o.floor, grow: o.grow || 0
          });
        }
      },
      step(dt) {
        for (let i = L.length - 1; i >= 0; i--) {
          const q = L[i];
          q.life -= dt;
          if (q.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
          const k = Math.max(0, 1 - q.drag * dt);
          q.vx *= k; q.vy *= k;
          q.vz = q.vz * Math.max(0, 1 - q.drag * .25 * dt) + q.grav * dt;
          q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
          if (q.floor !== null && q.z < q.floor) { q.z = q.floor; q.vz = -q.vz * .3; q.vx *= .5; q.vy *= .5; q.vr *= .5; }
          q.rot += q.vr * dt;
          if (q.grow) q.size = Math.max(0, q.size + q.grow * dt);
        }
      },
      clear() { L.length = 0; }
    };
    return P;
  }

  /* ----------------------------------------------------------- shaders --- */
  const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aCol;
layout(location=3) in vec2 aUV;
uniform mat4 uModel, uVP, uLVP;
uniform mat3 uNM;
uniform float uSway, uTime;
out vec3 vW; out vec3 vN; out vec4 vCol; out vec2 vUV; out vec3 vL; out vec4 vSh;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  /* foliage leans in the wind; uv.y says how free each vertex is to move */
  if (uSway > 0.) {
    float k = aUV.y * aUV.y;
    w.xy += vec2(sin(uTime * 1.6 + w.x * .013 + w.y * .007), cos(uTime * 1.3 + w.y * .012 - w.x * .006)) * uSway * k;
  }
  vW = w.xyz; vN = uNM * aNrm; vCol = aCol; vUV = aUV; vL = aPos;
  vSh = uLVP * w;
  gl_Position = uVP * w;
}`;
  const VS_SH = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uMVP;
void main(){ gl_Position = uMVP * vec4(aPos, 1.0); }`;
  const FS_SH = `#version 300 es
precision mediump float;
out vec4 o;
void main(){ o = vec4(1.0); }`;

  /* Every lit surface. uKind picks a material; each one works from world
     position (or the uv, which is world units along the part), so nothing
     needs a texture: turf stripes, felt nap, wood grain, stone courses,
     water, lava, ice, the pool balls and the dimpled golf ball. */
  const FS_LIT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec4 vCol; in vec2 vUV; in vec3 vL; in vec4 vSh;
uniform int uKind;
uniform vec3 uTint, uEmit, uC1, uC2, uC3, uC4;
uniform vec4 uMat, uP1, uP2;
uniform float uTwo;
uniform vec3 uEye, uSun, uSunC, uSky, uGnd, uRim, uFogC, uFill;
uniform vec2 uFog, uRes, uShTx, uLampCone;
uniform float uExpo, uVig, uTime, uShOn, uSunSpec;
uniform sampler2DShadow uShadow;
uniform sampler2D uTex;
uniform int uLampN, uGlowN, uCutRN, uCutCN, uAoN, uSandN;
uniform vec3 uLampP[3];
uniform vec3 uLampC[3];
uniform float uLampK;
uniform vec4 uGlowR[4];
uniform vec3 uGlowC;
uniform vec4 uCutR[8];
uniform float uCutRr[8];
uniform vec3 uCutC[8];
uniform vec4 uAoR[12];
uniform vec4 uSandR[4];
out vec4 o;

float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float h13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
float sdRR(vec2 p, vec4 r, float rad){
  vec2 q = abs(p - (r.xy + r.zw * .5)) - (r.zw * .5 - rad);
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - rad;
}
/* x: distance to the nearest cell edge, y: the cell's id, z: distance to its seed */
vec3 vor(vec2 p){
  vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; vec2 id = i;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), r = g + h22(i + g) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d;
  }
  return vec3(sqrt(d2) - sqrt(d1), h12(id), sqrt(d1));
}
float shade(){
  if (uShOn < .5) return 1.;
  vec3 s = vSh.xyz / vSh.w * .5 + .5;
  if (s.x <= .001 || s.x >= .999 || s.y <= .001 || s.y >= .999 || s.z >= 1.) return 1.;
  float a = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)
    a += texture(uShadow, vec3(s.xy + vec2(float(x), float(y)) * uShTx, s.z - .0007));
  return a / 9.;
}
vec3 light(vec3 base, vec3 N, vec3 V, float spec, float gloss, float wrap, float occ, float sh){
  float ndl = dot(N, uSun);
  float d = clamp((ndl + wrap) / (1. + wrap), 0., 1.);
  d = d * d * (3. - 2. * d);
  float nk = (gloss + 8.) / 25.;
  float s = pow(max(dot(N, normalize(uSun + V)), 0.), gloss) * spec * nk * step(0., ndl) * uSunSpec;
  vec3 c = base * (mix(uGnd, uSky, N.z * .5 + .5) * occ + uSunC * d * sh) + uSunC * s * sh;
  c += uRim * pow(1. - max(dot(N, V), 0.), 4.) * occ;
  c += base * uFill * max(dot(N, V), 0.) * occ;
  for (int i = 0; i < 3; i++) {
    if (i >= uLampN) break;
    vec3 Lv = uLampP[i] - vW; float dl = length(Lv); vec3 L = Lv / dl;
    float att = 1. / (1. + dl * dl * uLampK);
    if (uLampCone.x > 0.) att *= smoothstep(uLampCone.x, uLampCone.y, L.z);
    float nd = max(dot(N, L), 0.);
    float sl = pow(max(dot(N, normalize(L + V)), 0.), gloss) * spec * nk;
    c += (base * nd * occ + sl) * uLampC[i] * att * (.3 + .7 * sh);
  }
  for (int i = 0; i < 4; i++) {
    if (i >= uGlowN) break;
    float g = max(sdRR(vW.xy, uGlowR[i], 16.), 0.);
    c += base * uGlowC * exp(-g / 30.) * clamp(1. - vW.z / 70., 0., 1.) * (.5 + .5 * max(N.z, 0.));
  }
  return c;
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec3 finish(vec3 c){
  c = mix(c, uFogC, smoothstep(uFog.x, uFog.y, distance(uEye, vW)));
  c = aces(c * uExpo);
  vec2 q = gl_FragCoord.xy / uRes - .5;
  c *= 1. - uVig * dot(q, q);
  return pow(max(c, 0.), vec3(.4545));
}
void main(){
  vec2 p = vW.xy;
  for (int i = 0; i < 8; i++) { if (i >= uCutRN) break; if (sdRR(p, uCutR[i], uCutRr[i]) < 0.) discard; }
  for (int i = 0; i < 8; i++) { if (i >= uCutCN) break; if (distance(p, uCutC[i].xy) < uCutC[i].z) discard; }
  vec3 V = normalize(uEye - vW);
  vec3 N = normalize(vN);
  if (uTwo > .5 && dot(N, V) < 0.) N = -N;
  vec3 base = vCol.rgb * uTint;
  float occ = vCol.a, spec = uMat.x, gloss = uMat.y, wrap = uMat.z, alpha = uMat.w;
  vec3 emit = uEmit;

  if (uKind == 1) {                                   /* turf */
    float stripe = step(.5, fract(p.y / uP1.x));
    vec3 g = mix(uC2, uC1, stripe * .8 + .1);
    g *= .86 + .28 * fbm(p * .011);
    g *= .93 + .12 * vn(p * .9);
    int st = int(uP1.y + .5);
    if (st == 1) {                                    /* ice */
      vec3 v = vor(p * .02);
      g = mix(g, vec3(.95, .98, 1.), (1. - smoothstep(0., .04, v.x)) * .45);
      float h = h12(floor(p * .6));
      emit += vec3(step(.992, h) * (.5 + .5 * sin(uTime * 3. + h * 60.))) * 1.2;
      spec = .35; gloss = 420.;                         /* a tight glint, not a sheet of glare */
    } else if (st == 2) {                             /* volcanic rock */
      vec3 v = vor(p * .035);
      g *= (.7 + .45 * v.y) * mix(.45, 1., smoothstep(0., .06, v.x));
    } else if (st == 3) {                             /* moon garden: glowing specks */
      float h = h12(floor(p * .22));
      emit += vec3(.45, 1., .75) * step(.955, h) * smoothstep(.16, 0., length(fract(p * .22) - .5)) * (.45 + .55 * sin(uTime * 2.3 + h * 50.));
    }
    for (int i = 0; i < 4; i++) {                     /* bunkers */
      if (i >= uSandN) break;
      vec4 r = uSandR[i];
      float sd = sdRR(p, r, min(r.z, r.w) * .3);
      float k = 1. - smoothstep(-1.2, 1.2, sd);
      if (k > 0.) {
        vec2 c = r.xy + r.zw * .5;
        float rings = sin(length((p - c) / (r.zw * .5)) * 23.);
        vec3 s = mix(uC4, uC3, .62 + .38 * rings);
        s *= .9 + .2 * h12(floor(p * 1.7));
        s = mix(s, uC4 * .8, smoothstep(-10., 0., sd) * .6);
        g = mix(g, s, k);
      }
    }
    base = g * vCol.rgb;
  } else if (uKind == 2) {                            /* felt */
    float n = vn(p * 1.4) * .5 + vn(p * 3.3) * .5;
    base *= (.86 + .2 * n) * (.92 + .12 * fbm(p * .012));
    base *= .95 + .07 * vn(vec2(p.x * .05, p.y * 2.3));   /* the nap, brushed toward the head */
    if (uP1.w > .5) {
      float hs = (1. - smoothstep(.35, 1., abs(p.x - uP1.x))) * step(uP2.x, p.y) * step(p.y, uP2.y);
      float sp = 1. - smoothstep(2.2, 3.2, distance(p, uP1.yz));
      base += vec3(.05, .07, .06) * max(hs * .8, sp);
    }
    base += base * pow(1. - max(dot(N, V), 0.), 3.) * .35;
  } else if (uKind == 3) {                            /* wood */
    vec2 w = vUV;
    float f = fbm(vec2(w.x * .012, w.y * .5));
    float ring = fract((w.y + f * 9.) * uP1.x);
    float grain = smoothstep(0., .5, ring) * (1. - smoothstep(.55, 1., ring));
    base *= mix(.66, 1.14, grain * .7 + f * .3) * (.92 + .12 * vn(vec2(w.x * .06, w.y * 3.)));
    if (uP1.y > 0.) {                                 /* floorboards */
      float row = floor(w.y / uP1.y), off = h12(vec2(row, 3.)) * 400.;
      float fy = fract(w.y / uP1.y);
      float seam = min(smoothstep(0., .07, fy) * smoothstep(1., .93, fy), smoothstep(0., 2.5, mod(w.x + off, 380.)));
      base *= mix(.4, 1., seam) * (.8 + .35 * h12(vec2(row, floor((w.x + off) / 380.))));
    }
  } else if (uKind == 4) {                            /* stone courses */
    vec2 w = vUV;
    float row = floor(w.y / uP1.y);
    float bx = fract((w.x + row * uP1.x * .5) / uP1.x), by = fract(w.y / uP1.y);
    float mortar = smoothstep(0., .035, bx) * smoothstep(1., .965, bx) * smoothstep(0., .09, by) * smoothstep(1., .91, by);
    base *= mix(.5, 1., mortar) * (.8 + .32 * fbm(w * .12 + row));
  } else if (uKind == 5) {                            /* water */
    float sd = sdRR(p, uP1, uP2.x), t = uTime;
    vec2 d1 = vec2(.8, .6), d2 = vec2(-.55, .83), d3 = vec2(.22, -.97);
    vec2 gr = d1 * cos(dot(p, d1) * .06 + t * 1.3) * .07
            + d2 * cos(dot(p, d2) * .1 + t * 1.8) * .06
            + d3 * cos(dot(p, d3) * .16 + t * 2.4) * .04;
    gr += (vec2(vn(p * .09 + vec2(t * .5, 0.)), vn(p * .09 + vec2(0., t * .45))) - .5) * .5;
    N = normalize(vec3(-gr, 1.));
    float shore = -sd - uP2.y;
    float deep = smoothstep(0., 56., shore);
    vec3 body = mix(uC1 * 1.2, uC2, deep);
    /* caustics: two drifting webs multiplied, so only where they cross does
       a thin bright line survive — one web on its own reads as tiling */
    vec3 c1 = vor(p * .045 + vec2(t * .09, -t * .06)), c2 = vor(p * .06 + vec2(-t * .07, t * .05) + 3.1);
    float caus = (1. - smoothstep(0., .07, c1.x)) * (1. - smoothstep(0., .1, c2.x));
    body += uC1 * caus * (1. - deep * .6) * .9;
    float fr = .03 + .97 * pow(1. - max(dot(N, V), 0.), 5.);
    base = mix(body, uSky * 1.6, fr * .55);
    float foam = (1. - smoothstep(0., 3.5, shore + sin(t * 2. + (p.x + p.y) * .08) * 1.2)) * step(-3., shore);
    base = mix(base, vec3(.92, .96, 1.), foam * .8);
    /* glitter: the sun caught by the tips of the chop, twinkling as they
       pass — a true mirror highlight almost never lines up with this camera */
    float gl = pow(max(dot(N, normalize(uSun + V)), 0.), 60.) * step(.72, vn(p * .42 + t * vec2(.9, .6)));
    emit += uSunC * gl * .9;
    spec = 1.6; gloss = 240.; wrap = .2;
    alpha = max(mix(uP2.z, uP2.w, deep * deep), foam * .9);
  } else if (uKind == 6) {                            /* lava */
    vec2 q = p * .05;
    vec2 wv = vec2(fbm(q + vec2(uTime * .04, 0.)), fbm(q + vec2(5.2, uTime * .035)));
    vec3 v = vor(q * 1.1 + wv * 1.2);
    /* dark cooled plates riding on the melt: the heat shows in the seams
       between them, orange, and only runs white where two seams meet */
    float crack = 1. - smoothstep(.015, .11, v.x);
    float pulse = .75 + .25 * sin(uTime * 1.6 + v.y * 11.);
    float plate = smoothstep(.05, .35, v.x) * (.6 + .5 * v.y);
    base = uC3 * (.45 + .5 * plate);
    float rim = 1. - smoothstep(0., 12., -sdRR(p, uP1, uP2.x));
    emit += mix(uC2 * .9, uC1, crack * crack * crack) * crack * 3.2 * pulse;
    emit += uC2 * (rim * 1.3 + (1. - plate) * .35) * pulse;
    spec = .35; gloss = 40.;
  } else if (uKind == 7) {                            /* ice blocks */
    vec3 v = vor(vUV * .06);
    base = mix(base, vec3(1.), (1. - smoothstep(0., .05, v.x)) * .3);
    base = mix(base, vec3(.9, .97, 1.), pow(1. - max(dot(N, V), 0.), 2.5) * .6);
  } else if (uKind == 8) {                            /* pool ball */
    vec3 n = normalize(vL);
    float aa = fwidth(n.z) * 1.2 + .004;
    vec3 ivory = vec3(.9, .88, .82), bc = uC1;
    if (uP1.y > .5) bc = mix(ivory, uC1, 1. - smoothstep(.5 - aa, .5 + aa, abs(n.z)));
    if (uP1.x > .5) {
      float sg = n.x >= 0. ? 1. : -1.;
      float disc = smoothstep(.885 - aa, .885 + aa, n.x * sg);
      if (disc > 0.) {
        vec2 tq = vec2(-n.y * sg, n.z) / .47;               /* y runs down-screen: mirror, or the figures read backwards */
        float cell = uP1.x - 1.;
        vec2 uv = (vec2(mod(cell, 4.), floor(cell / 4.)) + clamp(tq * vec2(.5, -.5) + .5, 0., 1.)) * .25;
        bc = mix(bc, mix(ivory, vec3(.012), texture(uTex, uv).a), disc);
      }
    }
    /* The cue ball, spotted. It is the one ball that must never be taken for
       an object ball, so a set cannot simply paint it: it keeps its ivory and
       wears the set as six spots, one down each axis of the ball. They are in
       object space, so they turn as it rolls — which is the other half of why
       a real one is marked this way: you can see the spin you put on it. */
    if (uP1.z > .5) {
      vec3 an = abs(n);
      float m = max(an.x, max(an.y, an.z));
      bc = mix(bc, uC2, smoothstep(.902 - aa, .902 + aa, m));
    }
    base = bc;
    emit += uSky * (.04 + .96 * pow(1. - max(dot(N, V), 0.), 5.)) * 1.2;
  } else if (uKind == 9) {                            /* golf ball */
    vec3 q = normalize(vL) * 5.5, i3 = floor(q), f3 = fract(q);
    float d1 = 9.;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 r = g + vec3(h13(i3 + g), h13(i3 + g + 19.1), h13(i3 + g + 37.3)) * .8 + .1 - f3;
      d1 = min(d1, dot(r, r));
    }
    float dim = 1. - smoothstep(.06, .22, d1);
    base = uC1 * (1. - dim * .2);
    spec *= 1. - dim * .7;
  } else if (uKind == 10) {                           /* earth and basalt banks */
    base *= .8 + .35 * vn(p * .18 + vW.z * .4) * vn(p * .05);
  } else if (uKind == 11) {                           /* open ground round a course */
    vec3 g = mix(uC1, uC2, fbm(p * .008));
    g *= .88 + .2 * vn(p * .35);
    int st = int(uP1.y + .5);
    if (st == 3) {                                    /* basalt with a few glowing seams */
      vec3 v = vor(p * .009);
      float s = 1. - smoothstep(0., .018, v.x);
      emit += vec3(1., .26, .04) * s * (.9 + .5 * sin(uTime * 1.3 + v.y * 9.)) * step(.62, v.y);
      g *= mix(.55, 1., smoothstep(0., .04, v.x));
    } else if (st == 4) {                             /* snow */
      float h = h12(floor(p * .8));
      emit += vec3(step(.994, h) * (.5 + .5 * sin(uTime * 2. + h * 70.))) * .8;
      spec = .3; gloss = 60.;
    } else if (st == 5) {                             /* night meadow */
      float h = h12(floor(p * .12));
      emit += vec3(.4, 1., .7) * step(.97, h) * smoothstep(.2, 0., length(fract(p * .12) - .5)) * (.4 + .6 * sin(uTime * 2. + h * 40.));
    }
    base = g * vCol.rgb;
  } else if (uKind == 12) {                           /* polished metal */
    vec3 R = reflect(-V, N);
    base = uC1 * mix(.3, 1.4, smoothstep(-.3, .9, R.z));
  } else if (uKind == 13) {                           /* lit from within: neon, lanterns, embers */
    emit += base * uP1.x * (1. + uP1.y * sin(uTime * 3. + vW.x * .07 + vW.y * .05));
  } else if (uKind == 14) {                           /* mini-golf carpet, striped down the lane */
    /* uv is (distance along the lane, offset across it); vCol.a carries how
       much of this spot is bunker sand, so occlusion rides in the rgb */
    float along = vUV.x, across = vUV.y;
    float stripe = smoothstep(.46, .54, .5 + .5 * sin(along / uP1.x * 6.28318));
    vec3 g = mix(uC2, uC1, stripe * .7 + .15);
    g *= .9 + .12 * vn(p * .9) + .06 * vn(p * 3.1);
    g *= 1. - smoothstep(uP1.y - 30., uP1.y, abs(across)) * .22;
    float sand = clamp(vCol.a, 0., 1.);
    if (sand > 0.) {
      float rake = sin(along * .32 + sin(across * .05) * 2.);
      vec3 sc = mix(uC4, uC3, .66 + .34 * rake);
      sc *= .86 + .26 * h12(floor(p * 1.7));
      g = mix(g, sc, smoothstep(0., 1., sand));
    }
    occ = 1.;
    spec = mix(.08, .02, sand); gloss = 16.;
    if (uP1.z > .5) {                                 /* the ice lanes */
      vec3 v = vor(p * .02);
      g = mix(g, vec3(.93, .97, 1.), (1. - smoothstep(0., .035, v.x)) * .4);
      spec = mix(.4, .02, sand); gloss = 300.;
    }
    base = g * vCol.rgb;
  } else if (uKind == 15) {                           /* open country: grass, dirt, rock, shore */
    float n1 = fbm(p * .0035), n2 = vn(p * .045), n3 = vn(p * .55), n4 = fbm(p * .0011 + 7.3);
    vec3 grass = mix(uC1, uC2, smoothstep(.3, .75, n1 + (n2 - .5) * .35));
    /* broad swathes of drier, yellower grass between the lusher hollows */
    grass = mix(grass, grass * vec3(1.16, 1.04, .64), smoothstep(.48, .76, n4) * .6);
    grass *= (.8 + .3 * n3) * (.93 + .14 * vn(p * 2.1));
    grass = mix(grass, mix(uC3, uC4, .4) * .95, smoothstep(.68, .84, n1) * .38);   /* worn earth */
    float slope = 1. - N.z;
    float rk = smoothstep(.2, .42, slope + (n2 - .5) * .18);
    vec3 rock = uC3 * (.72 + .45 * vn(p * .08 + vW.z * .05));
    vec3 g = mix(grass, rock, rk);
    float shore = 1. - smoothstep(uP1.z + 1., uP1.z + 6. + n2 * 6., vW.z);
    g = mix(g, uC4, shore * (1. - rk * .6));
    if (uP1.w > 0.) {                                 /* snow lying on the high ground, thinning on the crags */
      float sn = smoothstep(uP1.w - 80., uP1.w + 80., vW.z + (n2 - .5) * 260. + (n1 - .5) * 300.);
      g = mix(g, vec3(.9, .93, .97), sn * mix(1., .35, rk));
    }
    int st = int(uP1.y + .5);
    if (st == 3) {                                    /* basalt, with a few seams still glowing */
      vec2 wq = p * .008;
      vec3 v = vor(wq + (vec2(vn(wq * 3.1), vn(wq * 3.1 + 7.7)) - .5) * .55);   /* wandering, not ruled */
      float s = 1. - smoothstep(0., .02, v.x);
      emit += vec3(1., .26, .04) * s * (.9 + .5 * sin(uTime * 1.3 + v.y * 9.)) * step(.64, v.y) * (1. - rk);
    } else if (st == 4) {                             /* snow, glinting */
      float h = h12(floor(p * .8));
      emit += vec3(step(.994, h) * (.5 + .5 * sin(uTime * 2. + h * 70.))) * .7 * (1. - rk);
      spec = .25; gloss = 50.;
    } else if (st == 5) {                             /* night meadow with glowing specks */
      float h = h12(floor(p * .1));
      emit += vec3(.4, 1., .7) * step(.975, h) * smoothstep(.2, 0., length(fract(p * .1) - .5)) * (.4 + .6 * sin(uTime * 2. + h * 40.)) * (1. - rk);
    }
    base = g * vCol.rgb;
    spec = st == 4 ? spec : .04; gloss = st == 4 ? gloss : 10.;
  } else if (uKind == 16) {                           /* water, lava or ice lying over the ground */
    /* vCol.a is how deep the ground is below the surface here, /80 */
    float depth = vCol.a * 80., t = uTime;
    int md = int(uP1.x + .5);
    if (md == 1) {                                    /* lava */
      vec2 q = p * .045;
      vec2 wv = vec2(fbm(q + vec2(t * .04, 0.)), fbm(q + vec2(5.2, t * .035)));
      vec3 v = vor(q * 1.1 + wv * 1.2);
      float crack = 1. - smoothstep(.015, .11, v.x);
      float pulse = .75 + .25 * sin(t * 1.6 + v.y * 11.);
      float plate = smoothstep(.05, .35, v.x) * (.6 + .5 * v.y);
      base = uC3 * (.45 + .5 * plate);
      float rim = 1. - smoothstep(0., 14., depth);
      emit += mix(uC2 * .9, uC1, crack * crack * crack) * crack * 3.2 * pulse + uC2 * (rim * 1.4 + (1. - plate) * .35) * pulse;
      spec = .35; gloss = 40.; alpha = 1.;
    } else if (md == 2) {                             /* frozen over */
      vec3 v = vor(p * .012);
      base = mix(uC1, uC2, smoothstep(0., 60., depth)) * (.9 + .1 * vn(p * .05));
      base = mix(base, vec3(.95, .98, 1.), (1. - smoothstep(0., .03, v.x)) * .5);
      spec = .5; gloss = 200.; alpha = 1.;
    } else {                                          /* open water */
      vec2 d1 = vec2(.8, .6), d2 = vec2(-.55, .83), d3 = vec2(.22, -.97);
      vec2 gr = d1 * cos(dot(p, d1) * .05 + t * 1.2) * .06 + d2 * cos(dot(p, d2) * .085 + t * 1.7) * .05
              + d3 * cos(dot(p, d3) * .14 + t * 2.3) * .035;
      gr += (vec2(vn(p * .07 + vec2(t * .45, 0.)), vn(p * .07 + vec2(0., t * .4))) - .5) * .45;
      N = normalize(vec3(-gr, 1.));
      float deep = smoothstep(0., 50., depth);
      vec3 body = mix(uC1 * 1.15, uC2, deep);
      vec3 c1 = vor(p * .04 + vec2(t * .08, -t * .05)), c2 = vor(p * .055 + vec2(-t * .06, t * .05) + 3.1);
      body += uC1 * (1. - smoothstep(0., .07, c1.x)) * (1. - smoothstep(0., .1, c2.x)) * (1. - deep * .7) * .8;
      float fr = .03 + .97 * pow(1. - max(dot(N, V), 0.), 5.);
      base = mix(body, uSky * 1.5, fr * .6);
      float foam = (1. - smoothstep(0., 3., depth + sin(t * 2. + (p.x + p.y) * .07) * 1.1));
      base = mix(base, vec3(.93, .97, 1.), foam * .8);
      emit += uSunC * pow(max(dot(N, normalize(uSun + V)), 0.), 60.) * step(.72, vn(p * .4 + t * vec2(.9, .6))) * .9;
      spec = 1.5; gloss = 240.; wrap = .2;
      alpha = max(mix(.45, .92, deep * deep), foam * .9);
    }
    occ = 1.;
  } else if (uKind == 17) {                           /* leaves: varied, and lit through from behind */
    base *= .74 + .5 * vn(p * .12 + vW.z * .1);
    emit += base * uSunC * max(dot(-N, uSun), 0.) * .35;
  } else if (uKind == 18) {                           /* bark */
    base *= .68 + .42 * vn(vec2((vW.x + vW.y) * .35, vW.z * .06));
  } else if (uKind == 19) {                           /* rock, mossy or snowy on top */
    base *= .7 + .42 * fbm(p * .07 + vW.z * .06);
    base = mix(base, uC1, smoothstep(.55, .95, N.z) * uP1.x * (.6 + .4 * vn(p * .2)));
  }

  for (int i = 0; i < 12; i++) {                      /* contact shadow at the foot of walls */
    if (i >= uAoN) break;
    vec4 r = uAoR[i];
    float d = r.z < 0. ? distance(p, r.xy) - r.w : sdRR(p, r, 2.);
    occ *= mix(.58, 1., clamp(smoothstep(0., 12., d) + smoothstep(3., 9., vW.z), 0., 1.));
  }
  vec3 c = light(base, N, V, spec, gloss, wrap, occ, shade()) + emit;
  o = vec4(finish(c), alpha);
}`;

  /* Unlit overlays that sit in the world: aim guides, rings, glows, swirls,
     chevrons. Colours are display colours and blend straight onto the lit
     picture, so a guide reads the same on bright turf and in a dark pocket. */
  const FS_FX = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec4 vCol; in vec2 vUV; in vec3 vL; in vec4 vSh;
uniform int uFx;
uniform vec4 uColor, uP;
uniform float uTime;
out vec4 o;
void main(){
  vec2 uv = vUV; float a = 1.;
  if (uFx == 1) {                                     /* soft blob */
    a = pow(clamp(1. - length(uv * 2. - 1.), 0., 1.), uP.x);
  } else if (uFx == 2) {                              /* ring */
    float d = length(uv * 2. - 1.), w = uP.y;
    a = 1. - smoothstep(w * .45, w, abs(d - uP.x));
  } else if (uFx == 3) {                              /* dashes along a strip */
    float s = fract((uv.x - uTime * uP.z) / uP.x), e = max(fwidth(uv.x) / uP.x, .001) * 1.5;
    a = smoothstep(0., e, s) * (1. - smoothstep(uP.y - e, uP.y, s));
    a *= 1. - smoothstep(.55, 1., abs(uv.y));
  } else if (uFx == 4) {                              /* chevrons marching along a strip, pointing the way they go */
    float f = fract((uv.x + abs(uv.y) * uP.z) / uP.x - uTime * uP.y);
    a = smoothstep(0., .07, f) * (1. - smoothstep(.3, .4, f)) * (1. - smoothstep(.78, .98, abs(uv.y)));
  } else if (uFx == 5) {                              /* swirl, falling inward */
    vec2 q = uv * 2. - 1.; float r = length(q), ang = atan(q.y, q.x);
    float arms = sin(ang * uP.x + r * uP.y + uTime * uP.z);
    a = smoothstep(.15, 1., arms) * smoothstep(1., .5, r) * (.3 + .7 * r);
    a += pow(max(1. - r * 3.2, 0.), 2.) * 1.4;
  } else if (uFx == 6) {                              /* a trail that fades toward its tail */
    a = clamp(uv.x, 0., 1.) * (1. - smoothstep(.35, 1., abs(uv.y)));
  } else if (uFx == 7) {                              /* arrow head pointing along +u */
    float hw = (1. - uv.x) * .5;
    a = 1. - smoothstep(hw - .04, hw + .01, abs(uv.y - .5));
  }
  a *= uColor.a * vCol.a;
  if (a < .003) discard;
  o = vec4(uColor.rgb * vCol.rgb * a, a);
}`;
  const VS_PT = `#version 300 es
layout(location=0) in vec2 aC;
layout(location=1) in vec4 iP;
layout(location=2) in vec4 iC;
layout(location=3) in vec4 iM;
uniform mat4 uVP;
uniform vec3 uCR, uCU;
out vec2 vC; out vec4 vCol; flat out float vShape; out float vGlow;
void main(){
  float c = cos(iM.x), s = sin(iM.x);
  vec2 q = vec2(aC.x * c - aC.y * s, aC.x * s + aC.y * c);
  vC = aC; vCol = iC; vShape = iM.y; vGlow = iM.z;
  gl_Position = uVP * vec4(iP.xyz + (uCR * q.x + uCU * q.y) * iP.w, 1.);
}`;
  const FS_PT = `#version 300 es
precision highp float;
in vec2 vC; in vec4 vCol; flat in float vShape; in float vGlow;
out vec4 o;
void main(){
  float d = length(vC), a;
  if (vShape > .5) a = 1.;
  else if (vGlow > .5) a = pow(max(1. - d, 0.), 1.7);
  else a = 1. - smoothstep(.72, 1., d);
  a *= vCol.a;
  if (a < .003) discard;
  o = vec4(vCol.rgb * a, a);
}`;

  /* The sky behind everything: one triangle over the whole screen, each pixel
     turned back into the direction it looks along. Horizon to zenith, the
     sun (or at night the moon) with its haze, drifting clouds on a high
     plane, and stars. It is tone-mapped exactly like the lit pass, and the
     fog is the horizon colour, so distant hills melt into it. */
  const VS_SKY = `#version 300 es
layout(location=0) in vec2 aC;
out vec2 vN;
void main(){ vN = aC; gl_Position = vec4(aC, .9999, 1.); }`;
  const FS_SKY = `#version 300 es
precision highp float;
in vec2 vN;
uniform mat4 uIVP;
uniform vec3 uZen, uHor, uGndC, uSun, uSunC;
uniform float uCloud, uNight, uTime, uExpo, uVig;
uniform vec2 uRes;
out vec4 o;
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.07 + 13.1; a *= .5; } return s; }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec4 a = uIVP * vec4(vN, -1., 1.), b = uIVP * vec4(vN, 1., 1.);
  vec3 d = normalize(b.xyz / b.w - a.xyz / a.w);
  float el = d.z;
  vec3 c = mix(uHor, uZen, pow(clamp(el, 0., 1.), .5));
  c = mix(c, uGndC, smoothstep(0., -.2, el));
  float sd = max(dot(d, uSun), 0.);
  c += uSunC * (pow(sd, mix(1400., 2600., uNight)) * mix(14., 5., uNight) + pow(sd, 24.) * .3 + pow(sd, 4.) * .1 * (1. - uNight));
  if (uCloud > 0. && el > 0.) {
    vec2 q = d.xy / (el + .1) * 1.1 + vec2(uTime * .01, uTime * .004);
    float n = fbm(q) * .7 + fbm(q * 2.3 + 7.) * .3;
    float cov = smoothstep(.62 - uCloud * .32, .92, n) * smoothstep(0., .18, el);
    vec3 cc = mix(uHor * 1.1, vec3(1.), .55 - uNight * .45) * (.85 + .3 * sd);
    cc = mix(cc, cc * .72, smoothstep(.75, 1., n));
    c = mix(c, cc, cov * .9);
  }
  if (uNight > 0. && el > 0.) {
    vec2 g = d.xy / (el + .35) * 180.;
    float h = h12(floor(g));
    float st = step(.994, h) * smoothstep(.45, 0., length(fract(g) - .5)) * (.6 + .4 * sin(uTime * 2. + h * 90.));
    c += vec3(.85, .9, 1.) * st * uNight * smoothstep(0., .25, el) * 2.;
  }
  c = aces(c * uExpo);
  vec2 q2 = gl_FragCoord.xy / uRes - .5;
  c *= 1. - uVig * dot(q2, q2);
  o = vec4(pow(c, vec3(.4545)), 1.);
}`;

  const K = { PLAIN: 0, TURF: 1, FELT: 2, WOOD: 3, STONE: 4, WATER: 5, LAVA: 6, ICE: 7, BALL: 8, GOLF: 9, EARTH: 10, GROUND: 11,
              METAL: 12, GLOW: 13, LANE: 14, LAND: 15, POOL: 16, LEAF: 17, BARK: 18, ROCK: 19 };
  const FX = { SOLID: 0, BLOB: 1, RING: 2, DASH: 3, CHEVRON: 4, SWIRL: 5, TRAIL: 6, ARROW: 7 };
  const Z3 = [0, 0, 0], Z4 = [0, 0, 0, 0], ONE3 = [1, 1, 1];
  const ID = M4.make();
  const acesJS = x => Math.min(1, Math.max(0, (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)));

  /* ------------------------------------------------------------ renderer - */
  let shared = null;
  function build() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 16;
    let gl = null;
    try {
      /* An alpha channel so a scene can be composited over the page rather
         than standing on a rectangle of its own — the crate wants that, and
         the games that do not simply clear with alpha 1 and are unchanged.
         Straight (un-premultiplied) alpha, because that is what the shader
         writes. */
      gl = cv.getContext('webgl2', { antialias: true, alpha: true, depth: true, stencil: false,
                                     premultipliedAlpha: false, preserveDrawingBuffer: false,
                                     powerPreference: 'high-performance' });
    } catch (e) {}
    if (!gl) return null;
    const lose = () => { try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) {} };

    function prog(vs, fs) {
      const mk = (t, s) => {
        const o = gl.createShader(t);
        gl.shaderSource(o, s); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn('Gfx3D shader:', gl.getShaderInfoLog(o)); gl.deleteShader(o); return null; }
        return o;
      };
      const a = mk(gl.VERTEX_SHADER, vs), b = mk(gl.FRAGMENT_SHADER, fs);
      if (!a || !b) return null;
      const p = gl.createProgram();
      gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
      gl.deleteShader(a); gl.deleteShader(b);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('Gfx3D link:', gl.getProgramInfoLog(p)); return null; }
      const cache = {};
      return { p, u: n => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n))) };
    }
    const PL = prog(VS, FS_LIT), PS = prog(VS_SH, FS_SH), PF = prog(VS, FS_FX), PP = prog(VS_PT, FS_PT);
    if (!PL || !PS || !PF || !PP) { lose(); return null; }
    const PK = prog(VS_SKY, FS_SKY);                  // no sky is survivable: the clear colour stands in
    const skyVao = gl.createVertexArray(), skyBuf = gl.createBuffer();
    gl.bindVertexArray(skyVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    /* shadow map: one depth texture, read back with hardware comparison so
       every tap of the soft-shadow filter is itself already filtered */
    const SHN = 2048;
    const shTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHN, SHN);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const shFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    const shOK = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    /* the numbers on the pool balls: fifteen cells of ink, drawn once */
    let digits = null;
    function digitTex() {
      if (digits) return digits;
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d');
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
      for (let n = 1; n <= 15; n++) {
        const i = n - 1, x = (i % 4) * 128 + 64, y = ((i / 4) | 0) * 128 + 68;
        g.font = '800 ' + (n > 9 ? 70 : 86) + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
        g.fillText(String(n), x, y);
        if (n === 6 || n === 9) g.fillRect(x - 17, y + 36, 34, 7);    // so a 6 is never a 9
      }
      digits = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, digits);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return digits;
    }

    /* ---- meshes ---- */
    function upload(m, g) {
      gl.bindVertexArray(m.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.V), m.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.I), m.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      m.count = g.I.length;
      return m;
    }
    function mesh(g, dyn) {
      const m = { vao: gl.createVertexArray(), vb: gl.createBuffer(), ib: gl.createBuffer(), count: 0, dyn: !!dyn };
      gl.bindVertexArray(m.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb);
      const S = 48;
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, S, 40);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.bindVertexArray(null);
      return g ? upload(m, g) : m;
    }
    function freeMesh(m) {
      if (!m || !m.vao) return;
      gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib);
      m.vao = null; m.count = 0;
    }

    /* ---- particles: one instanced quad ---- */
    const MAXP = 1600, PSTR = 12;
    const pData = new Float32Array(MAXP * PSTR);
    const pVao = gl.createVertexArray(), pCorner = gl.createBuffer(), pInst = gl.createBuffer();
    gl.bindVertexArray(pVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pCorner);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, pInst);
    gl.bufferData(gl.ARRAY_BUFFER, pData.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(1 + i);
      gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, PSTR * 4, i * 16);
      gl.vertexAttribDivisor(1 + i, 1);
    }
    gl.bindVertexArray(null);

    /* ---- the frame ---- */
    const items = [];
    let nItems = 0, env = null, cam = null, now = 0;
    const partSets = [];
    const LV = M4.make(), LP = M4.make(), LVP = M4.make(), MVP = M4.make();
    let rs = 1, slow = 0, fast = 0, lastT = 0;

    function push(meshObj, model, m, fx) {
      if (!meshObj || !meshObj.count || !m) return;
      let it = items[nItems];
      if (!it) it = items[nItems] = { model: new Float32Array(16), nm: new Float32Array(9), mesh: null, m: null, fx: false };
      nItems++;
      it.mesh = meshObj; it.m = m; it.fx = fx;
      it.model.set(model || ID);
      if (!fx) nrm3(it.nm, it.model);
    }
    function setMat(P, m) {
      gl.uniform1i(P.u('uKind'), m.kind);
      gl.uniform3fv(P.u('uTint'), m.tint);
      gl.uniform3fv(P.u('uEmit'), m.emit);
      gl.uniform4f(P.u('uMat'), m.spec, m.gloss, m.wrap, m.alpha);
      gl.uniform3fv(P.u('uC1'), m.c1); gl.uniform3fv(P.u('uC2'), m.c2);
      gl.uniform3fv(P.u('uC3'), m.c3); gl.uniform3fv(P.u('uC4'), m.c4);
      gl.uniform4fv(P.u('uP1'), m.p1); gl.uniform4fv(P.u('uP2'), m.p2);
      gl.uniform1f(P.u('uTwo'), m.two);
      gl.uniform1f(P.u('uSway'), m.sway);
      gl.uniform1i(P.u('uCutRN'), m.cutRN);
      if (m.cutRN) { gl.uniform4fv(P.u('uCutR'), m.cutR); gl.uniform1fv(P.u('uCutRr'), m.cutRr); }
      gl.uniform1i(P.u('uCutCN'), m.cutCN);
      if (m.cutCN) gl.uniform3fv(P.u('uCutC'), m.cutC);
      gl.uniform1i(P.u('uAoN'), m.aoN);
      if (m.aoN) gl.uniform4fv(P.u('uAoR'), m.ao);
      gl.uniform1i(P.u('uSandN'), m.sandN);
      if (m.sandN) gl.uniform4fv(P.u('uSandR'), m.sand);
    }
    function frameUniforms(P, shOn) {
      const e = env;
      gl.uniformMatrix4fv(P.u('uVP'), false, cam.vp);
      gl.uniformMatrix4fv(P.u('uLVP'), false, LVP);
      gl.uniform3fv(P.u('uEye'), cam.eye);
      gl.uniform3fv(P.u('uSun'), e.sun);
      gl.uniform3fv(P.u('uSunC'), e.sunC);
      gl.uniform3fv(P.u('uSky'), e.sky);
      gl.uniform3fv(P.u('uGnd'), e.gnd);
      gl.uniform3fv(P.u('uRim'), e.rim || Z3);
      gl.uniform3fv(P.u('uFill'), e.fill || Z3);
      gl.uniform1f(P.u('uSunSpec'), e.sunSpec === undefined ? 1 : e.sunSpec);
      gl.uniform2fv(P.u('uLampCone'), e.lampCone || [0, 0]);
      gl.uniform3fv(P.u('uFogC'), e.fogC || Z3);
      gl.uniform2f(P.u('uFog'), (e.fog || [1e5, 2e5])[0], (e.fog || [1e5, 2e5])[1]);
      gl.uniform2f(P.u('uRes'), cv.width, cv.height);
      gl.uniform2f(P.u('uShTx'), 1 / SHN, 1 / SHN);
      gl.uniform1f(P.u('uExpo'), e.expo || 1);
      gl.uniform1f(P.u('uVig'), e.vig === undefined ? .6 : e.vig);
      gl.uniform1f(P.u('uTime'), now);
      gl.uniform1f(P.u('uShOn'), shOn ? 1 : 0);
      const lamps = (e.lamps || []).slice(0, 3);
      gl.uniform1i(P.u('uLampN'), lamps.length);
      if (lamps.length) {
        const lp = new Float32Array(9), lc = new Float32Array(9);
        lamps.forEach((l, i) => { lp.set(l.p, i * 3); lc.set(l.c, i * 3); });
        gl.uniform3fv(P.u('uLampP'), lp); gl.uniform3fv(P.u('uLampC'), lc);
      }
      gl.uniform1f(P.u('uLampK'), e.lampK || 1e-5);
      const glow = (e.glow || []).slice(0, 4);
      gl.uniform1i(P.u('uGlowN'), glow.length);
      if (glow.length) {
        const gr = new Float32Array(16);
        glow.forEach((r, i) => gr.set([r[0], r[1], r[2], r[3]], i * 4));
        gl.uniform4fv(P.u('uGlowR'), gr);
      }
      gl.uniform3fv(P.u('uGlowC'), e.glowC || Z3);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shTex);
      gl.uniform1i(P.u('uShadow'), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, digitTex());
      gl.uniform1i(P.u('uTex'), 2);
      gl.activeTexture(gl.TEXTURE0);
    }

    const R = {
      gl, canvas: cv, lost: false,
      mesh: g => mesh(g, false),
      /* a mesh rebuilt every frame (aim guides, a flag in the wind) */
      dyn() { const m = mesh(null, true); m.set = g => upload(m, g); return m; },
      free: freeMesh,
      /* Everything a round creates goes through a scope, and one dispose()
         at teardown gives it all back. */
      scope() {
        const own = [];
        return {
          mesh(g) { const m = R.mesh(g); own.push(m); return m; },
          dyn() { const m = R.dyn(); own.push(m); return m; },
          dispose() { for (const m of own) freeMesh(m); own.length = 0; }
        };
      },
      mat(o) {
        o = o || {};
        const m = {
          kind: o.kind | 0, tint: o.tint || ONE3, emit: o.emit || Z3,
          spec: o.spec === undefined ? .25 : o.spec, gloss: o.gloss === undefined ? 24 : o.gloss,
          wrap: o.wrap === undefined ? .35 : o.wrap, alpha: o.alpha === undefined ? 1 : o.alpha,
          c1: o.c1 || Z3, c2: o.c2 || Z3, c3: o.c3 || Z3, c4: o.c4 || Z3,
          p1: o.p1 || Z4, p2: o.p2 || Z4, two: o.two ? 1 : 0, sway: o.sway || 0,
          cast: o.cast !== false, blend: !!o.blend || (o.alpha !== undefined && o.alpha < 1),
          cutR: null, cutRr: null, cutRN: 0, cutC: null, cutCN: 0, ao: null, aoN: 0, sand: null, sandN: 0
        };
        R.cuts(m, o.cutR, o.cutC); R.occl(m, o.ao); R.bunkers(m, o.sand);
        return m;
      },
      /* holes a surface leaves open: rounded rects [x,y,w,h,r] and circles [x,y,r] */
      cuts(m, rects, circs) {
        rects = (rects || []).slice(0, 8); circs = (circs || []).slice(0, 8);
        m.cutRN = rects.length; m.cutR = new Float32Array(32); m.cutRr = new Float32Array(8);
        rects.forEach((r, i) => { m.cutR.set([r[0], r[1], r[2], r[3]], i * 4); m.cutRr[i] = r[4] || 0; });
        m.cutCN = circs.length; m.cutC = new Float32Array(24);
        circs.forEach((c, i) => m.cutC.set([c[0], c[1], c[2]], i * 3));
      },
      /* footprints that darken the ground they stand on: [x,y,w,h] or [x,y,-1,r] */
      occl(m, list) {
        list = (list || []).slice(0, 12);
        m.aoN = list.length; m.ao = new Float32Array(48);
        list.forEach((r, i) => m.ao.set([r[0], r[1], r[2], r[3]], i * 4));
      },
      bunkers(m, list) {
        list = (list || []).slice(0, 4);
        m.sandN = list.length; m.sand = new Float32Array(16);
        list.forEach((r, i) => m.sand.set([r[0], r[1], r[2], r[3]], i * 4));
      },
      fxMat(o) {
        o = o || {};
        return { fx: o.fx | 0, color: o.color || [1, 1, 1, 1], p: o.p || Z4, add: !!o.add, depth: o.depth !== false };
      },
      /* Size the drawing buffer to the stage. If frames start arriving late
         the picture quietly drops resolution rather than the game dropping
         frames, and creeps back up once there is headroom again. */
      size(w, h) {
        const t = performance.now();
        if (lastT) {
          const d = t - lastT;
          if (d > 26 && d < 250) { slow++; fast = 0; } else if (d < 19) { fast++; if (slow) slow--; }
          if (slow > 40 && rs > .55) { rs = Math.max(.55, rs * .85); slow = 0; }
          if (fast > 600 && rs < 1) { rs = Math.min(1, rs / .85); fast = 0; }
        }
        lastT = t;
        const s = Stage.scale * Stage.dpr * rs;
        let pw = Math.max(2, Math.round(w * s)), ph = Math.max(2, Math.round(h * s));
        const cap = 3.8e6;
        if (pw * ph > cap) { const k = Math.sqrt(cap / (pw * ph)); pw = Math.round(pw * k); ph = Math.round(ph * k); }
        if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      },
      begin(camera, e, time) {
        cam = camera; env = e; now = time || 0;
        nItems = 0; partSets.length = 0;
      },
      draw(meshObj, model, m) { push(meshObj, model, m, false); },
      fx(meshObj, model, m) { push(meshObj, model, m, true); },
      parts(ps) { partSets.push(ps); },
      end() {
        const e = env;
        /* ---- shadow pass ---- */
        const shOn = !!(e.shadow && shOK);
        if (shOn) {
          const S = e.shadow, L = e.sun, rad = S.r, dist = rad * 3;
          const eye = [S.x + L[0] * dist, S.y + L[1] * dist, (S.z || 0) + L[2] * dist];
          const up = Math.abs(L[1]) > .95 ? [1, 0, 0] : [0, 1, 0];
          const r = norm([up[1] * L[2] - up[2] * L[1], up[2] * L[0] - up[0] * L[2], up[0] * L[1] - up[1] * L[0]]);
          const u = [L[1] * r[2] - L[2] * r[1], L[2] * r[0] - L[0] * r[2], L[0] * r[1] - L[1] * r[0]];
          M4.view(LV, eye, r, u, L);
          M4.ortho(LP, -rad, rad, -rad, rad, Math.max(1, dist - rad * 2), dist + rad * 2);
          M4.mul(LVP, LP, LV);
          gl.bindFramebuffer(gl.FRAMEBUFFER, shFb);
          gl.viewport(0, 0, SHN, SHN);
          gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
          gl.clear(gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
          gl.useProgram(PS.p);
          for (let i = 0; i < nItems; i++) {
            const it = items[i];
            if (it.fx || !it.m.cast || it.m.blend) continue;
            M4.mul(MVP, LVP, it.model);
            gl.uniformMatrix4fv(PS.u('uMVP'), false, MVP);
            gl.bindVertexArray(it.mesh.vao);
            gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0);
          }
          gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        /* ---- the picture ---- */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, cv.width, cv.height);
        /* a fourth number on `clear` is its alpha, so a scene can be composited
           over the page instead of standing on a rectangle of its own; every
           caller that passes three keeps the opaque background it had */
        const cc = e.clear || [0, 0, 0];
        gl.clearColor(cc[0], cc[1], cc[2], cc.length > 3 ? cc[3] : 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (e.dome && PK) {
          const s = e.dome;
          gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND);
          gl.useProgram(PK.p);
          gl.uniformMatrix4fv(PK.u('uIVP'), false, cam.ivp);
          gl.uniform3fv(PK.u('uZen'), s.zen); gl.uniform3fv(PK.u('uHor'), s.hor);
          gl.uniform3fv(PK.u('uGndC'), s.gnd || s.hor); gl.uniform3fv(PK.u('uSun'), s.dir || e.sun);
          gl.uniform3fv(PK.u('uSunC'), s.sunC || e.sunC);
          gl.uniform1f(PK.u('uCloud'), s.cloud || 0); gl.uniform1f(PK.u('uNight'), s.night || 0);
          gl.uniform1f(PK.u('uTime'), now); gl.uniform1f(PK.u('uExpo'), e.expo || 1);
          gl.uniform1f(PK.u('uVig'), e.vig === undefined ? .6 : e.vig);
          gl.uniform2f(PK.u('uRes'), cv.width, cv.height);
          gl.bindVertexArray(skyVao);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.depthMask(true);
        }
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
        gl.useProgram(PL.p);
        frameUniforms(PL, shOn);
        const drawLit = blend => {
          let last = null;
          for (let i = 0; i < nItems; i++) {
            const it = items[i];
            if (it.fx || it.m.blend !== blend) continue;
            if (it.m !== last) { setMat(PL, it.m); last = it.m; }
            gl.uniformMatrix4fv(PL.u('uModel'), false, it.model);
            gl.uniformMatrix3fv(PL.u('uNM'), false, it.nm);
            gl.bindVertexArray(it.mesh.vao);
            gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0);
          }
        };
        gl.disable(gl.BLEND); gl.depthMask(true);
        drawLit(false);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        drawLit(true);
        /* ---- overlays ---- */
        gl.useProgram(PF.p);
        gl.uniformMatrix4fv(PF.u('uVP'), false, cam.vp);
        gl.uniformMatrix4fv(PF.u('uLVP'), false, LVP);
        gl.uniform1f(PF.u('uTime'), now);
        for (let i = 0; i < nItems; i++) {
          const it = items[i];
          if (!it.fx) continue;
          const m = it.m;
          if (m.add) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          if (m.depth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
          gl.uniform1i(PF.u('uFx'), m.fx);
          gl.uniform4fv(PF.u('uColor'), m.color);
          gl.uniform4fv(PF.u('uP'), m.p);
          gl.uniformMatrix4fv(PF.u('uModel'), false, it.model);
          gl.uniformMatrix3fv(PF.u('uNM'), false, ID.subarray(0, 9));
          gl.bindVertexArray(it.mesh.vao);
          gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0);
        }
        gl.enable(gl.DEPTH_TEST);
        /* ---- particles, the soft ones and then the glowing ones ---- */
        if (partSets.length) {
          gl.useProgram(PP.p);
          gl.uniformMatrix4fv(PP.u('uVP'), false, cam.vp);
          gl.uniform3fv(PP.u('uCR'), cam.r);
          gl.uniform3fv(PP.u('uCU'), cam.u);
          gl.bindVertexArray(pVao);
          gl.bindBuffer(gl.ARRAY_BUFFER, pInst);
          for (const add of [false, true]) {
            let n = 0;
            for (const ps of partSets) for (const q of ps.list) {
              if (q.add !== add || n >= MAXP) continue;
              const t = q.life / q.max, o = n * PSTR;
              pData[o] = q.x; pData[o + 1] = q.y; pData[o + 2] = q.z; pData[o + 3] = q.size * (add ? .45 + .55 * t : 1) * .5;
              pData[o + 4] = q.r; pData[o + 5] = q.g; pData[o + 6] = q.b; pData[o + 7] = q.a * Math.min(1, t * 2.2);
              pData[o + 8] = q.rot; pData[o + 9] = q.shape; pData[o + 10] = add ? 1 : 0; pData[o + 11] = 0;
              n++;
            }
            if (!n) continue;
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pData, 0, n * PSTR);
            gl.blendFunc(gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
          }
        }
        gl.bindVertexArray(null);
        gl.depthMask(true); gl.disable(gl.BLEND);
      },
      /* the display colour a linear colour ends up as, for clears and 2D
         overlays that have to match the 3D picture */
      display(c, expo) {
        const k = expo || 1;
        return c.map(v => Math.pow(acesJS(v * k), .4545));
      },
      dispose() {}
    };
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); R.lost = true; }, false);
    return R;
  }
  function get() {
    if (shared && !shared.lost) return shared;
    try { shared = build(); } catch (e) { console.warn('Gfx3D:', e); shared = null; }
    return shared;
  }

  return { get, M4, Q, Geo, rrPath, lin, srgb, mixc, withAo, norm, camera: Camera, groundInput, particles: Particles, K, FX };
})();

