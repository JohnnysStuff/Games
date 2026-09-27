/* ============================================================================
   BALL BRAWL — the models

   The arena, the balls, their weapons, and everything they throw, all made
   of Gfx3D's shapes and vertex colours; no textures. Everything is in the
   fight's own units (the arena is 380 across, a ball 30 in radius), z up,
   and a weapon is built lying along +x from the middle of its ball, so
   turning it is one rotation about z.

   A weapon is a few meshes, one per material: `metal` for blades and heads
   (the shader's polished steel), `iron` and `brass` for the darker and the
   gold metals, `plain` for grips, hafts and anything painted, `glow` for
   what lights itself. The ones that grow in a fight (the sword's blade, the
   spear, the shield's arc, the saw's arm) are rebuilt when they do, into a
   mesh of their own; everything else is made once.

   Nothing that touches lies flat on anything else: a band, a stud or a
   stone on something is raised off it or sunk into it, so no two faces
   fight.
   ========================================================================== */
const BBModels = (() => {
  const L = (hex, k) => Gfx3D.lin(hex, k);
  const TW = Math.PI * 2;

  /* ---- shapes Gfx3D does not have ---- */
  /* a sphere of radius 1 painted in bands of latitude, each edge a hard one:
     bands are [zTop, zBottom, colour] from the top pole to the bottom */
  function banded(g, seg, bands) {
    for (const [za, zb, c] of bands) {
      const pa = Math.acos(Math.max(-1, Math.min(1, za))), pb = Math.acos(Math.max(-1, Math.min(1, zb)));
      const n = Math.max(1, Math.ceil((pb - pa) / (Math.PI / 22)));
      const base = g.n;
      for (let j = 0; j <= n; j++) {
        const ph = pa + (pb - pa) * j / n, sp = Math.sin(ph), cp = Math.cos(ph);
        for (let i = 0; i <= seg; i++) {
          const th = i / seg * TW, nx = Math.cos(th) * sp, ny = Math.sin(th) * sp;
          g.v(nx, ny, cp, nx, ny, cp, c, i / seg, j / n);
        }
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < seg; i++) {
        const a = base + j * (seg + 1) + i, b = a + seg + 1;
        g.q(a, b, b + 1, a + 1);
      }
    }
  }
  /* a cylinder lying along x */
  function rodX(g, x0, x1, rad, seg, c, caps) {
    const base = g.n;
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * TW, cy = Math.cos(a), cz = Math.sin(a);
      g.v(x0, cy * rad, cz * rad, 0, cy, cz, c, 0, 0);
      g.v(x1, cy * rad, cz * rad, 0, cy, cz, c, 0, 0);
    }
    for (let i = 0; i < seg; i++) { const k = base + i * 2; g.q(k, k + 2, k + 3, k + 1); }
    if (caps !== false) for (const [x, s] of [[x0, -1], [x1, 1]]) {
      const c0 = g.v(x, 0, 0, s, 0, 0, c, 0, 0);
      for (let i = 0; i <= seg; i++) { const a = i / seg * TW; g.v(x, Math.cos(a) * rad, Math.sin(a) * rad, s, 0, 0, c, 0, 0); }
      for (let i = 0; i < seg; i++) g.t(c0, c0 + 1 + i, c0 + 2 + i);
    }
  }
  /* a convex outline in the xy plane, stood up from z0 to z1 */
  function prism(g, pts, z0, z1, c) {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    const ins = [cx / pts.length, cy / pts.length, (z0 + z1) / 2];
    const top = pts.map(p => [p[0], p[1], z1]), bot = pts.map(p => [p[0], p[1], z0]);
    g.face(top, c, ins); g.face(bot, c, ins);
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      g.face([bot[i], bot[j], top[j], top[i]], c, ins);
    }
  }
  /* a strip along a path of [x, y, width] points, stood up from z0 to z1,
     in one piece (no faces left inside it where one run meets the next) */
  function ribbon(g, path, z0, z1, c) {
    const edge = i => {
      const p = path[i], a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      return [[p[0] - ty * p[2] / 2, p[1] + tx * p[2] / 2], [p[0] + ty * p[2] / 2, p[1] - tx * p[2] / 2]];
    };
    const E = path.map((p, i) => edge(i)), n = path.length, zm = (z0 + z1) / 2;
    for (let i = 0; i < n - 1; i++) {
      const a = E[i], b = E[i + 1], ins = [(path[i][0] + path[i + 1][0]) / 2, (path[i][1] + path[i + 1][1]) / 2, zm];
      for (const z of [z0, z1]) g.face([[a[0][0], a[0][1], z], [b[0][0], b[0][1], z], [b[1][0], b[1][1], z], [a[1][0], a[1][1], z]], c, ins);
      for (const k of [0, 1]) g.face([[a[k][0], a[k][1], z0], [b[k][0], b[k][1], z0], [b[k][0], b[k][1], z1], [a[k][0], a[k][1], z1]], c, ins);
    }
    for (const [i, j] of [[0, 1], [n - 1, n - 2]]) {
      const e = E[i], ins = [path[j][0], path[j][1], zm];
      g.face([[e[0][0], e[0][1], z0], [e[1][0], e[1][1], z0], [e[1][0], e[1][1], z1], [e[0][0], e[0][1], z1]], c, ins);
    }
  }
  /* a blade with a diamond section: flat in z, `w` wide, `t` thick, from
     x0 out to a point at x1 */
  function blade(g, x0, x1, w, t, tip, c) {
    const xs = x1 - tip, hw = w / 2, ht = t / 2, ins = [(x0 + x1) / 2, 0, 0];
    const A = [x0, -hw, 0], B = [x0, 0, ht], C = [x0, hw, 0], D = [x0, 0, -ht];
    const A2 = [xs, -hw, 0], B2 = [xs, 0, ht], C2 = [xs, hw, 0], D2 = [xs, 0, -ht], P = [x1, 0, 0];
    g.face([A, A2, B2, B], c, ins); g.face([B, B2, C2, C], c, ins);
    g.face([C, C2, D2, D], c, ins); g.face([D, D2, A2, A], c, ins);
    g.face([A2, P, B2], c, ins); g.face([B2, P, C2], c, ins); g.face([C2, P, D2], c, ins); g.face([D2, P, A2], c, ins);
    g.face([A, B, C, D], c, ins);
  }
  /* a gem: a hexagonal girdle with a point above and below */
  function crystal(g, rad, up, down, c) {
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TW; pts.push([Math.cos(a) * rad, Math.sin(a) * rad, 0]); }
    const T = [0, 0, up], B = [0, 0, -down];
    for (let i = 0; i < 6; i++) {
      const p = pts[i], q = pts[(i + 1) % 6];
      g.face([p, q, T], c, [0, 0, 0]); g.face([q, p, B], c, [0, 0, 0]);
    }
  }

  /* ---- vectors, and more shapes ---- */
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  /* two unit vectors at right angles to the unit d and to each other */
  function frame(d) {
    const u = unit3(cross3(Math.abs(d[2]) < .9 ? [0, 0, 1] : [1, 0, 0], d));
    return [u, cross3(d, u)];
  }
  /* A tube along a path of [x, y, z] points. rad is a number or rad(u),
     and c a colour or c(u), u running 0..1 along it. Its rings are carried
     along the path without twisting. */
  function tube(g, path, rad, seg, c, caps) {
    const n = path.length, base = g.n, dirs = [];
    const col = u => typeof c === 'function' ? c(u) : c, rr = u => typeof rad === 'function' ? rad(u) : rad;
    let u0 = null;
    for (let i = 0; i < n; i++) {
      const d = unit3(sub3(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
      let u;
      if (!u0) u = frame(d)[0];
      else { const k = dot3(u0, d); u = unit3([u0[0] - d[0] * k, u0[1] - d[1] * k, u0[2] - d[2] * k]); }
      const v = cross3(d, u), t = i / (n - 1), r = rr(t), cc = col(t), p = path[i];
      u0 = u; dirs.push(d);
      for (let k = 0; k <= seg; k++) {
        const a = k / seg * TW, ca = Math.cos(a), sa = Math.sin(a);
        const nx = u[0] * ca + v[0] * sa, ny = u[1] * ca + v[1] * sa, nz = u[2] * ca + v[2] * sa;
        g.v(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r, nx, ny, nz, cc, t, k / seg);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k, b = a + seg + 1; g.q(a, b, b + 1, a + 1); }
    if (caps) for (const [i, s] of [[0, -1], [n - 1, 1]]) {
      if (rr(i / (n - 1)) <= .001) continue;
      const d = dirs[i], p = path[i], cc = col(i / (n - 1)), ring = base + i * (seg + 1);
      const c0 = g.v(p[0], p[1], p[2], d[0] * s, d[1] * s, d[2] * s, cc, 0, 0);
      for (let k = 0; k <= seg; k++) { const vi = (ring + k) * 12; g.v(g.V[vi], g.V[vi + 1], g.V[vi + 2], d[0] * s, d[1] * s, d[2] * s, cc, 0, 0); }
      for (let k = 0; k < seg; k++) g.t(c0, c0 + 1 + k, c0 + 2 + k);
    }
  }
  /* a cone standing on p and pointing along the unit d */
  function spike(g, p, d, r, len, seg, c) {
    const [u, v] = frame(d), tip = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len], ring = [];
    for (let k = 0; k < seg; k++) {
      const a = k / seg * TW, ca = Math.cos(a), sa = Math.sin(a);
      ring.push([p[0] + (u[0] * ca + v[0] * sa) * r, p[1] + (u[1] * ca + v[1] * sa) * r, p[2] + (u[2] * ca + v[2] * sa) * r]);
    }
    for (let k = 0; k < seg; k++) g.face([ring[k], ring[(k + 1) % seg], tip], c, p);
  }
  /* A blade of diamond section lying along x, from x0 out to its point at
     x1: wAt(u) and tAt(u) are its width and thickness u of the way along,
     both nought at the point. */
  function leaf(g, x0, x1, wAt, tAt, n, c) {
    const S = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + (x1 - x0) * u, w = wAt(u) / 2, t = tAt(u) / 2;
      S.push([[x, -w, 0], [x, 0, t], [x, w, 0], [x, 0, -t]]);
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
      const a = S[i][k], b = S[i][(k + 1) % 4], c2 = S[i + 1][(k + 1) % 4], d = S[i + 1][k], cx = (a[0] + b[0] + c2[0] + d[0]) / 4;
      if (i === n - 1) g.face([a, b, d], c, [cx, 0, 0]);
      else g.face([a, b, c2, d], c, [cx, 0, 0]);
    }
    g.face(S[0], c, [x0 + 1, 0, 0]);
  }
  /* The flat of a blade in the xy plane: from its back (a run of [x, y]
     points, tS thick) out to its edge (as many points, tE thick). An axe's
     bit, a scythe, a katana. */
  function bit(g, spine, edge, tS, tE, vn, c) {
    const n = spine.length, rows = [];
    for (let j = 0; j <= vn; j++) {
      const v = j / vn, t = Math.max(.04, (tS + (tE - tS) * Math.pow(v, .8)) / 2);
      rows.push(spine.map((s, i) => [s[0] + (edge[i][0] - s[0]) * v, s[1] + (edge[i][1] - s[1]) * v, t]));
    }
    const dn = p => [p[0], p[1], -p[2]], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0];
    for (let j = 0; j < vn; j++) for (let i = 0; i < n - 1; i++) {
      const q = [rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]], m = mid(q[0], q[2]);
      g.face(q, c, m); g.face(q.map(dn), c, m);
    }
    const wall = (a, b, towards) => g.face([a, b, dn(b), dn(a)], c, towards);
    for (let i = 0; i < n - 1; i++) {
      wall(rows[0][i], rows[0][i + 1], mid(rows[1][i], rows[1][i + 1]));
      wall(rows[vn][i], rows[vn][i + 1], mid(rows[vn - 1][i], rows[vn - 1][i + 1]));
    }
    for (const [i, o] of [[0, 1], [n - 1, n - 2]])
      for (let j = 0; j < vn; j++) wall(rows[j][i], rows[j + 1][i], mid(rows[j][o], rows[j + 1][o]));
  }
  /* a convex outline in the xy plane, stood up from z0 to z1 with its top
     and bottom edges chamfered by bev */
  function slab(g, pts, z0, z1, bev, c) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= n; cy /= n;
    const inward = (p0, p1) => {
      let nx = p0[1] - p1[1], ny = p1[0] - p0[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if ((cx - (p0[0] + p1[0]) / 2) * nx + (cy - (p0[1] + p1[1]) / 2) * ny < 0) { nx = -nx; ny = -ny; }
      return [nx, ny];
    };
    const inset = pts.map((p, i) => {
      const n1 = inward(pts[(i + n - 1) % n], p), n2 = inward(p, pts[(i + 1) % n]);
      let mx = n1[0] + n2[0], my = n1[1] + n2[1];
      const l = Math.hypot(mx, my) || 1; mx /= l; my /= l;
      const k = bev / Math.max(.25, mx * n1[0] + my * n1[1]);
      return [p[0] + mx * k, p[1] + my * k];
    });
    const ins = [cx, cy, (z0 + z1) / 2], at = (P, z) => P.map(p => [p[0], p[1], z]);
    const Ot = at(pts, z1 - bev), Ob = at(pts, z0 + bev), It = at(inset, z1), Ib = at(inset, z0);
    g.face(It, c, ins); g.face(Ib, c, ins);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      g.face([Ob[i], Ob[j], Ot[j], Ot[i]], c, ins);
      if (bev > 0) { g.face([Ot[i], Ot[j], It[j], It[i]], c, ins); g.face([Ob[i], Ob[j], Ib[j], Ib[i]], c, ins); }
    }
  }
  /* An outline in the xy plane that every point of can be seen from (cx,
     cy), like a star or a saw's teeth, stood up from z0 to z1; bev rounds
     its top and bottom edges off. */
  function pillow(g, pts, cx, cy, z0, z1, bev, c) {
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
    const s = area > 0 ? 1 : -1, en = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      en.push([dy / l * s, -dx / l * s]);                       // out of the outline
    }
    const ins = pts.map((p, i) => {
      const a = en[(i + n - 1) % n], b = en[i];
      let mx = a[0] + b[0], my = a[1] + b[1];
      const l = Math.hypot(mx, my) || 1; mx /= l; my /= l;
      const k = bev / Math.max(.3, mx * b[0] + my * b[1]);
      return [p[0] - mx * k, p[1] - my * k];
    });
    for (const [z, nz] of [[z1, 1], [z0, -1]]) {
      const b0 = g.v(cx, cy, z, 0, 0, nz, c, cx, cy);
      for (const p of ins) g.v(p[0], p[1], z, 0, 0, nz, c, p[0], p[1]);
      for (let i = 0; i < n; i++) g.t(b0, b0 + 1 + i, b0 + 1 + (i + 1) % n);
    }
    const quad = (A, B, C, D, nrm) => { const b0 = g.n; for (const p of [A, B, C, D]) g.v(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], c, p[0], p[2]); g.q(b0, b0 + 1, b0 + 2, b0 + 3); };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, e = en[i], p = pts[i], q = pts[j], pi = ins[i], qi = ins[j];
      quad([p[0], p[1], z0 + bev], [q[0], q[1], z0 + bev], [q[0], q[1], z1 - bev], [p[0], p[1], z1 - bev], [e[0], e[1], 0]);
      if (bev > 0) {
        const up = unit3([e[0], e[1], 1]), dn = unit3([e[0], e[1], -1]);
        quad([p[0], p[1], z1 - bev], [q[0], q[1], z1 - bev], [qi[0], qi[1], z1], [pi[0], pi[1], z1], up);
        quad([p[0], p[1], z0 + bev], [q[0], q[1], z0 + bev], [qi[0], qi[1], z0], [pi[0], pi[1], z0], dn);
      }
    }
  }
  /* any outline in the xy plane, with the triangles to fill it given */
  function flat(g, pts, tris, z0, z1, c) {
    for (const [z, nz] of [[z1, 1], [z0, -1]]) {
      const b0 = g.n;
      for (const p of pts) g.v(p[0], p[1], z, 0, 0, nz, c, p[0], p[1]);
      for (const t of tris) g.t(b0 + t[0], b0 + t[1], b0 + t[2]);
    }
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
    const s = area > 0 ? 1 : -1;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const nx = dy / l * s, ny = -dx / l * s, b0 = g.n;
      for (const [x, y, z] of [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]]) g.v(x, y, z, nx, ny, 0, c, x, z);
      g.q(b0, b0 + 1, b0 + 2, b0 + 3);
    }
  }
  /* a flat band along a 3D path, lying level across its width: a sash's
     tails, a ribbon */
  function strap(g, path, wid, thick, c) {
    const n = path.length, rows = [];
    for (let i = 0; i < n; i++) {
      const t = unit3(sub3(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
      let sd = cross3(t, [0, 0, 1]);
      sd = Math.hypot(sd[0], sd[1], sd[2]) < .2 ? [0, 1, 0] : unit3(sd);
      const up = cross3(sd, t), w = (typeof wid === 'function' ? wid(i / (n - 1)) : wid) / 2, h = thick / 2, p = path[i];
      const at = (a, b) => [p[0] + sd[0] * a + up[0] * b, p[1] + sd[1] * a + up[1] * b, p[2] + sd[2] * a + up[2] * b];
      rows.push([at(w, h), at(-w, h), at(-w, -h), at(w, -h)]);
    }
    for (let i = 0; i < n - 1; i++) {
      const m = [(path[i][0] + path[i + 1][0]) / 2, (path[i][1] + path[i + 1][1]) / 2, (path[i][2] + path[i + 1][2]) / 2];
      for (let k = 0; k < 4; k++) g.face([rows[i][k], rows[i][(k + 1) % 4], rows[i + 1][(k + 1) % 4], rows[i + 1][k]], c, m);
    }
    g.face(rows[0], c, path[1]); g.face(rows[n - 1], c, path[n - 2]);
  }
  /* A ball of about radius 1 pushed in and out by rf(x, y, z) and coloured
     by cf(x, y, z), both of a point on the unit ball: a cactus's ribs, a
     comet's craters. Its normals come from its own shape. */
  function blob(g, seg, rings, rf, cf) {
    const P = [], base = g.n;
    for (let j = 0; j <= rings; j++) {
      const ph = j / rings * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph), row = [];
      for (let i = 0; i <= seg; i++) {
        const th = i / seg * TW, x = Math.cos(th) * sp, y = Math.sin(th) * sp, k = rf(x, y, cp);
        row.push([x * k, y * k, cp * k, x, y, cp]);
      }
      P.push(row);
    }
    for (let j = 0; j <= rings; j++) for (let i = 0; i <= seg; i++) {
      const p = P[j][i];
      let nm = [p[3], p[4], p[5]];
      if (j > 0 && j < rings) {
        const a = P[j][i === seg ? 1 : i + 1], b = P[j][i === 0 ? seg - 1 : i - 1];
        nm = unit3(cross3(sub3(a, b), sub3(P[j - 1][i], P[j + 1][i])));
        if (dot3(nm, p) < 0) nm = [-nm[0], -nm[1], -nm[2]];
      }
      g.v(p[0], p[1], p[2], nm[0], nm[1], nm[2], cf(p[3], p[4], p[5]), i / seg, j / rings);
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base + j * (seg + 1) + i, b = a + seg + 1;
      g.q(a, b, b + 1, a + 1);
    }
  }
  /* a lathe laid along +x from x0 (prof is [r, distance along x] pairs) */
  function latheX(g, prof, seg, c, x0) {
    const t = Gfx3D.Geo();
    t.lathe(prof, seg, c);
    g.add(t, Gfx3D.M4.axes(Gfx3D.M4.make(), [0, 1, 0], [0, 0, 1], [1, 0, 0], [x0 || 0, 0, 0]));
  }
  /* a gem pointing along the unit d from p: a six-sided girdle, a long point
     up and a short one down, lighter above than below */
  function shard(g, p, d, rad, up, down, cU, cD) {
    const t = Gfx3D.Geo(), pts = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TW; pts.push([Math.cos(a) * rad, Math.sin(a) * rad, 0]); }
    for (let i = 0; i < 6; i++) {
      const a = pts[i], b = pts[(i + 1) % 6];
      t.face([a, b, [0, 0, up]], cU, [0, 0, 0]); t.face([b, a, [0, 0, -down]], cD, [0, 0, 0]);
    }
    const [u, v] = frame(d);
    g.add(t, Gfx3D.M4.axes(Gfx3D.M4.make(), u, v, d, p));
  }
  const place = (x, y, z, rot, s) => Gfx3D.M4.place(Gfx3D.M4.make(), x, y, z, rot || 0, s === undefined ? 1 : s);

  /* ---- the balls themselves ----
     Each is a sphere of radius 1 (the draw scales it) in bands of colour,
     and for some a few things more, in three layers: `plain` is painted,
     `metal` polished (in the metal `metalC`: steel, iron, brass or copper),
     `glow` lights itself. A ball that rolls carries all of it round as it
     rolls. The ones in NOROLL do not roll (the Bomber's fuse, the Wizard's
     hat and the Tesla's coil stay on top; the Ghost floats); they lean the
     way they are going instead. A ball's face (eyes, a mouth, a beard, a
     hat) is a mesh of its own looking along +x, which the view turns to
     look where the ball is going. */
  const NOROLL = { ghost: 1, bomber: 1, snake: 1, ninja: 1, wizard: 1, blaze: 1, tesla: 1, cactus: 1 };
  const mix = (a, b, t) => mixHex(a, b, t);
  function skin(def) {
    const c = L(def.col), a = L(def.acc), dk = L(mix(def.col, '#000000', .45)), lt = L(mix(def.col, '#ffffff', .82));
    switch (def.id) {
      case 'daggers': return [[1, .42, c], [.42, .3, lt], [.3, -.3, c], [-.3, -.42, lt], [-.42, -1, c]];
      case 'axe': return [[1, .2, c], [.2, .13, dk], [.13, -.13, L('#2a2c33')], [-.13, -.2, dk], [-.2, -1, c]];
      case 'bow': return [[1, .15, c], [.15, -.15, L('#8a5a30')], [-.15, -1, c]];
      case 'shield': return [[1, .6, L('#fff3d0')], [.6, .16, c], [.16, -.16, L('#fff3d0')], [-.16, -1, c]];
      case 'spear': return [[1, .14, c], [.14, .08, dk], [.08, -.08, L('#fff0d8')], [-.08, -.14, dk], [-.14, -1, c]];
      case 'snake': return [[1, .56, c], [.56, .4, L('#ffe066')], [.4, .08, c], [.08, -.08, L('#ffe066')], [-.08, -.4, c], [-.4, -.56, L('#ffe066')], [-.56, -1, c]];
      case 'vampire': return [[1, .18, c], [.18, .1, L('#16121c')], [.1, -.1, L('#e7e2ee')], [-.1, -.18, L('#16121c')], [-.18, -1, c]];
      case 'frost': return [[1, .7, lt], [.7, .12, c], [.12, -.12, lt], [-.12, -1, c]];
      case 'giant': return [[1, .2, c], [.2, -.2, L(mix(def.col, '#000000', .3))], [-.2, -1, c]];
      case 'bomber': return [[1, .86, L('#9aa3b2')], [.86, -1, c]];
      case 'hammer': return [[1, .25, c], [.25, .15, L('#e0aa42')], [.15, -.15, dk], [-.15, -.25, L('#e0aa42')], [-.25, -1, c]];
      case 'flail': return [[1, .21, c], [.21, .13, L('#b9c0cc')], [.13, -.13, L('#3a2d44')], [-.13, -.21, L('#b9c0cc')], [-.21, -1, c]];
      case 'boomerang': return [[1, .46, c], [.46, .37, L('#fff0d6')], [.37, .15, c], [.15, -.15, L('#a85c2a')], [-.15, -.37, c], [-.37, -.46, L('#fff0d6')], [-.46, -1, c]];
      case 'laser': return [[1, .23, c], [.23, -.23, L('#1a1b29')], [-.23, -1, c]];
      case 'ninja': return [[1, .52, c], [.52, .22, L('#e8283a')], [.22, -1, c]];
      case 'wizard': return [[1, -.34, c], [-.34, -.46, L(def.acc)], [-.46, -1, c]];
      case 'blaze': return [[1, .6, L('#ffd23a')], [.6, .18, L('#ff9a1f')], [.18, -.32, L('#ff6a13')], [-.32, -1, L('#d0301a')]];
      case 'tesla': return [[1, .35, c], [.35, .23, L('#d9823b')], [.23, -.23, L('#1f2a33')], [-.23, -.35, L('#d9823b')], [-.35, -1, c]];
      case 'saw': return [[1, .25, c], [.25, .18, a], [.18, -.18, L('#4a4f5c')], [-.18, -.25, a], [-.25, -1, c]];
      case 'katana': return [[1, .16, c], [.16, .11, L('#e0aa42')], [.11, -.11, a], [-.11, -.16, L('#e0aa42')], [-.16, -1, c]];
      default: return [[1, .16, c], [.16, .1, dk], [.1, -.1, a], [-.1, -.16, dk], [-.16, -1, c]];
    }
  }
  /* a point on a ball of radius `rad`: az round from +x, el up from level */
  const onBall = (az, el, rad) => [Math.cos(el) * Math.cos(az) * rad, Math.cos(el) * Math.sin(az) * rad, Math.sin(el) * rad];
  /* The Ghost: a dome, and below it a sheet hanging in folds to a wavy hem,
     flaring a little as it goes. */
  function ghostBody(g, def) {
    const c = L(mix(def.col, '#a996ff', .35)), seg = 56, rings = 12, base = g.n;
    for (let j = 0; j <= rings; j++) {
      const ph = j / rings * Math.PI / 2, sp = Math.sin(ph), cp = Math.cos(ph);
      for (let i = 0; i <= seg; i++) { const th = i / seg * TW, x = Math.cos(th) * sp, y = Math.sin(th) * sp; g.v(x, y, cp, x, y, cp, c, 0, 0); }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = base + j * (seg + 1) + i, b = a + seg + 1; g.q(a, b, b + 1, a + 1); }
    const rows = 7, b2 = g.n;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      for (let i = 0; i <= seg; i++) {
        const th = i / seg * TW, hem = -.8 - .15 * Math.cos(th * 7), z = hem * v, R = 1 + .07 * v * v;
        const fold = 1 + .025 * v * Math.cos(th * 7);
        const x = Math.cos(th) * R * fold, y = Math.sin(th) * R * fold, nz = -.14 * v, l = Math.hypot(1, nz);
        g.v(x, y, z, Math.cos(th) / l, Math.sin(th) / l, nz / l, c, 0, 0);
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = b2 + j * (seg + 1) + i, b = a + seg + 1; g.q(a, b, b + 1, a + 1); }
  }
  /* The Cactus: ribbed, with tufts of spines along the ribs and a flower on
     top. */
  function cactusBody(g, def) {
    const RIBS = 10, c0 = L(mix(def.col, '#0b2a0e', .42)), c1 = L(mix(def.col, '#d6ffb0', .16));
    const rib = (x, y) => Math.cos(Math.atan2(y, x) * RIBS) * Math.min(1, Math.hypot(x, y) * 1.6);
    blob(g, 80, 30, (x, y) => 1 + .055 * rib(x, y), (x, y) => Gfx3D.mixc(c0, c1, .5 + .5 * rib(x, y)));
    const sp = L('#fff2c2');
    for (let k = 0; k < RIBS; k++) {
      const th = k / RIBS * TW;
      for (const el of [-.72, -.38, -.04, .3, .64]) {
        const d = onBall(th, el, 1), R = 1 + .055 * Math.min(1, Math.cos(el) * 1.6);
        const p = [d[0] * R * .985, d[1] * R * .985, d[2] * R * .985];
        spike(g, p, d, .03, .17, 5, sp);
        for (const s of [-1, 1]) spike(g, p, unit3([d[0] - Math.sin(th) * s * .7, d[1] + Math.cos(th) * s * .7, d[2] + .3]), .022, .12, 4, sp);
      }
    }
    const pk = L(def.acc), pd = L(mix(def.acc, '#b01a60', .35));
    for (let k = 0; k < 6; k++) {
      const p = Gfx3D.Geo();
      p.sphere(.14, 0, 0, .12, 12, 8, k & 1 ? pk : pd, .42, 1.45);
      g.add(p, place(0, 0, 1.035, k / 6 * TW, 1));
    }
    g.sphere(0, 0, 1.075, .075, 12, 8, L('#ffe066'));
  }
  /* The Comet: a lump of rock, cratered, with glowing cracks in it */
  const CRATERS = [[.6, .5, .62, .3], [-.7, .2, .68, .24], [.1, -.8, .59, .32], [-.3, -.4, -.86, .26], [.5, -.3, -.8, .2], [-.2, .9, -.35, .25], [.9, -.2, .1, .19], [-.8, -.5, -.1, .22]]
    .map(([x, y, z, s]) => { const u = unit3([x, y, z]); return [u[0], u[1], u[2], s]; });
  function cometR(x, y, z) {
    let k = 1 + .016 * Math.sin(x * 9 + y * 7) * Math.sin(y * 8 - z * 6);
    for (const [cx, cy, cz, s] of CRATERS) {
      const d = Math.acos(Math.max(-1, Math.min(1, x * cx + y * cy + z * cz))) / s;
      if (d < 1) k -= .075 * (1 - d * d);
      else if (d < 1.35) k += .028 * Math.sin((d - 1) / .35 * Math.PI);
    }
    return k;
  }
  function cometBody(g, glow, def) {
    const rock = L(mix(def.col, '#10131d', .58)), dark = L(mix(def.col, '#05060a', .82)), light = L(mix(def.col, '#c9d6f5', .12));
    blob(g, 56, 28, cometR, (x, y, z) => {
      let c = Gfx3D.mixc(rock, light, Math.max(0, .5 + .5 * Math.sin(x * 11 + z * 5) * Math.sin(y * 13)) * .35);
      for (const [cx, cy, cz, s] of CRATERS) {
        const d = Math.acos(Math.max(-1, Math.min(1, x * cx + y * cy + z * cz))) / s;
        if (d < 1) c = Gfx3D.mixc(c, dark, (1 - d) * .8);
        else if (d < 1.3) c = Gfx3D.mixc(c, light, (1 - (d - 1) / .3) * .5);
      }
      return c;
    });
    /* cracks: short runs along the surface, lit from within */
    const hot = L('#ff8a14');
    for (const [a0, e0, a1, e1] of [[.3, .1, .9, .5], [2.2, -.3, 2.9, .2], [4.1, .4, 4.6, -.1], [5.3, -.6, 5.9, -.2]]) {
      const path = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, d = onBall(a0 + (a1 - a0) * u + Math.sin(u * 9) * .05, e0 + (e1 - e0) * u, 1);
        const k = cometR(d[0], d[1], d[2]) + .006;
        path.push([d[0] * k, d[1] * k, d[2] * k]);
      }
      tube(glow, path, u => .03 * Math.sin(Math.PI * (.08 + u * .84)), 6, hot);
    }
  }
  /* The Blaze: tongues of flame rising off its top */
  function flameCrown(glow) {
    const tongue = (x, y, h, r0, lx, ly) => {
      const path = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10; path.push([x + lx * u * u + Math.sin(u * 6 + x * 9) * .07 * u, y + ly * u * u + Math.cos(u * 5 + y * 9) * .05 * u, .72 + h * u]); }
      tube(glow, path, u => r0 * Math.pow(1 - u, .7) + .004, 12, u => L(mix('#ff2200', '#ffb000', Math.min(1, u * 1.15))), true);
    };
    tongue(0, 0, 1.2, .36, -.1, 0);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TW + .3, R = .36;
      tongue(Math.cos(a) * R, Math.sin(a) * R, .6 + .2 * (k % 2), .19, Math.cos(a) * .14, Math.sin(a) * .14);
    }
  }
  /* A ball's body and whatever it wears: { plain, metal, metalC, glow } */
  function ballParts(def) {
    const plain = Gfx3D.Geo(), metal = Gfx3D.Geo(), glow = Gfx3D.Geo(), id = def.id;
    let metalC = 'steel';
    if (id === 'cactus') cactusBody(plain, def);
    else if (id === 'comet') cometBody(plain, glow, def);
    else if (id === 'ghost') ghostBody(plain, def);
    else banded(plain, 40, skin(def));
    if (id === 'giant') {
      /* a second belt over the top, and brass studs round both */
      const belt = Gfx3D.Geo();
      banded(belt, 40, [[.2, -.2, L(mix(def.col, '#000000', .3))]]);
      plain.add(belt, Gfx3D.M4.axes(Gfx3D.M4.make(), [0, 1.014, 0], [0, 0, 1.014], [1.014, 0, 0], [0, 0, 0]));
      for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TW; metal.sphere(Math.cos(a) * .985, Math.sin(a) * .985, 0, .1, 12, 8, [1, 1, 1]); }
      for (const e of [.8, 2.34, -.8, -2.34]) metal.sphere(0, Math.cos(e) * 1.0, Math.sin(e) * 1.0, .1, 12, 8, [1, 1, 1]);
      metalC = 'brass';
    } else if (id === 'bomber') {
      /* the collar and the fuse, which the spark sits on */
      plain.cyl(0, 0, .8, 1.02, .34, 20, L('#6b7383'), { top: true });
      const f = L('#d8c49a');
      for (let i = 0; i < 6; i++) {
        const p = u => [Math.sin(u * 1.4) * .22, 0, 1.02 + u * .42];
        const a = p(i / 6), b = p((i + 1) / 6);
        const m = Gfx3D.M4.make();
        const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz);
        Gfx3D.M4.axes(m, [0, 1, 0], [-dz / l, 0, dx / l], [dx / l, 0, dz / l], a);
        const seg = Gfx3D.Geo(); seg.cyl(0, 0, 0, l, .05, 8, f);
        plain.add(seg, m);
      }
      glow.sphere(FUSE_TIP[0], FUSE_TIP[1], FUSE_TIP[2], .08, 10, 8, L('#ff8a1a'));
    } else if (id === 'hammer' || id === 'flail' || id === 'saw') {
      /* rivets round its bands */
      const z = id === 'hammer' ? .2 : id === 'saw' ? .09 : .17;
      for (const s of [1, -1]) for (let k = 0; k < 12; k++) {
        const a = (k + (s > 0 ? 0 : .5)) / 12 * TW, h = Math.sqrt(1 - z * z) * .99;
        metal.sphere(Math.cos(a) * h, Math.sin(a) * h, z * s * .99, .045, 8, 6, [1, 1, 1]);
      }
      metalC = id === 'hammer' ? 'brass' : 'steel';
    } else if (id === 'boomerang') {
      for (let k = 0; k < 16; k++) { const a = k / 16 * TW; plain.sphere(Math.cos(a) * .985, Math.sin(a) * .985, 0, .055, 8, 6, L('#fff0d6')); }
    } else if (id === 'laser') {
      const line = Gfx3D.Geo();
      banded(line, 40, [[.035, -.035, L('#36e8ff')]]);
      glow.add(line, place(0, 0, 0, 0, 1.012));
    } else if (id === 'tesla') {
      plain.cyl(0, 0, .84, 1.03, .42, 28, L('#1f2a33'), { top: true });
      plain.cyl(0, 0, 1.0, 1.64, .15, 16, L('#2c313d'), { top: true });
      for (let k = 0; k < 7; k++) metal.torus(0, 0, 1.08 + k * .082, .205, .034, 24, 8, [1, 1, 1]);
      metal.torus(0, 0, 1.7, .27, .1, 32, 12, [1, 1, 1]);
      glow.sphere(0, 0, 1.78, .14, 16, 12, L('#5ff0ff'));
      metalC = 'copper';
    } else if (id === 'blaze') flameCrown(glow);
    return { plain, metal: metal.n ? metal : null, metalC, glow: glow.n ? glow : null };
  }
  /* where the Bomber's spark burns, in ball units */
  const FUSE_TIP = [Math.sin(1.4) * .22, 0, 1.44];
  /* a ball's face, looking along +x, or null */
  function faceGeo(def) {
    const g = Gfx3D.Geo();
    switch (def.id) {
      case 'ghost': {
        for (const s of [-1, 1]) {
          const e = onBall(s * .36, .2, .96);
          g.sphere(e[0], e[1], e[2], .15, 16, 12, L('#15101f'), 1.45, .55);
          const h = onBall(s * .36 - .07, .3, 1.05);
          g.sphere(h[0], h[1], h[2], .042, 8, 6, L('#ffffff'));
          const b = onBall(s * .6, -.05, .985);
          g.sphere(b[0], b[1], b[2], .12, 12, 8, L('#ff8ec8'), .5, .35);
        }
        const m = onBall(0, -.15, .985);
        g.sphere(m[0], m[1], m[2], .085, 12, 8, L('#2a1438'), .9, .4);
        return g;
      }
      case 'snake': {
        for (const s of [-1, 1]) {
          const e = onBall(s * .42, .36, .94);
          g.sphere(e[0], e[1], e[2], .19, 14, 10, L('#fff07a'), 1.1, .6);
          const p = onBall(s * .42, .36, 1.045);
          g.sphere(p[0], p[1], p[2], .072, 10, 8, L('#111111'), 1.9, .45);
          const n = onBall(s * .1, .02, .99);
          g.sphere(n[0], n[1], n[2], .03, 6, 5, L('#1d3a0c'));
        }
        const T0 = onBall(0, -.2, .95), T1 = [1.2, 0, -.26], red = L('#e8263b');
        tube(g, [T0, [1.08, 0, -.24], T1], .036, 6, red, true);
        for (const s of [-1, 1]) tube(g, [T1, [1.33, s * .05, -.24], [1.42, s * .1, -.21]], .026, 6, red, true);
        return g;
      }
      case 'ninja': {
        /* the slit in its mask, and its eyes looking out of it */
        const slit = onBall(0, .06, .92);
        g.sphere(slit[0], slit[1], slit[2], .56, 24, 10, L('#f0c49a'), .27, .3);
        for (const s of [-1, 1]) {
          const e = onBall(s * .22, .07, 1.0);
          g.sphere(e[0], e[1], e[2], .115, 14, 10, L('#ffffff'), .75, .35);
          const p = onBall(s * .2, .07, 1.045);
          g.sphere(p[0], p[1], p[2], .052, 8, 6, L('#101014'));
          /* brows drawn down, cross */
          strap(g, [onBall(s * .34, .21, 1.0), onBall(s * .12, .15, 1.02)], .045, .03, L('#101014'));
        }
        const K = onBall(Math.PI, .37, .98), red = L('#e8283a');
        g.sphere(K[0], K[1], K[2], .12, 12, 8, red);
        for (const s of [-1, 1]) strap(g, [K, [-1.2, s * .1, .28], [-1.44, s * .22, .14], [-1.62, s * .34, -.03]], u => .15 - .05 * u, .035, red);
        return g;
      }
      case 'wizard': {
        const hc = L(mix(def.col, '#0a0620', .3)), gold = L(def.acc), wh = L('#f3f3f8');
        /* the brim, and the hat bending back as it rises */
        g.lathe([[.3, .6], [1.1, .57], [1.17, .605], [1.1, .64], [.3, .69]], 40, hc);
        const hat = [[0, 0, .64], [0, 0, 1.05], [-.1, 0, 1.42], [-.34, 0, 1.72], [-.6, 0, 1.86]];
        tube(g, hat, u => .7 * Math.pow(1 - u, 1.15) + .015, 24, hc, true);
        g.lathe([[.66, .68], [.76, .7], [.7, .84], [.6, .86]], 32, gold);
        /* gold stars on it */
        const star = Gfx3D.Geo(), pts = [];
        for (let i = 0; i < 10; i++) { const a = i / 10 * TW - Math.PI / 2, rr = i & 1 ? .045 : .11; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        pillow(star, pts, 0, 0, -.012, .012, 0, gold);
        for (const [x, y, z, d] of [[.48, 0, 1.1, [1, 0, .35]], [-.06, .5, 1.06, [-.1, 1, .3]], [-.06, -.5, 1.06, [-.1, -1, .3]]]) {
          const n = unit3(d), [u, v] = frame(n);
          g.add(star, Gfx3D.M4.axes(Gfx3D.M4.make(), u, v, n, [x, y, z]));
        }
        /* the beard, the moustache, and the eyes and eyebrows over them */
        g.sphere(.84, 0, -.32, .37, 18, 12, wh, 1.15, .6);
        for (const s of [-1, 1]) g.sphere(.8, s * .33, -.22, .28, 14, 10, wh, 1, .6);
        g.sphere(.74, 0, -.66, .23, 12, 10, wh, 1.25, .66);
        for (const s of [-1, 1]) g.sphere(.94, s * .17, -.03, .15, 12, 8, wh, .6, .6);
        for (const s of [-1, 1]) {
          const e = onBall(s * .27, .23, .96);
          g.sphere(e[0], e[1], e[2], .075, 10, 8, L('#16121f'));
          const b = onBall(s * .29, .36, .98);
          g.sphere(b[0], b[1], b[2], .11, 10, 8, wh, .42, .6);
        }
        return g;
      }
    }
    return null;
  }

  /* ---- weapons, lying along +x from the middle of a ball of radius r ----
     Each layer is a mesh of its own: `metal` is polished steel, `iron` dark
     iron, `brass` brass, `plain` painted, `glow` lit from within. `parts`
     are the pieces that move on their own (the flail's head and a link of
     its chain, the saw's blade, a boomerang in flight), each in the same
     layers and each round its own middle. */
  const STEEL = '#dfe5ee', WOOD = '#7a4a26', DARK = '#2b2d36', GOLD = '#ffcf5a', LEATHER = '#4a2c1e';
  const METALS = { steel: '#e3e8f0', iron: '#838c9c', brass: '#f2c45a', copper: '#e8905a' };
  const W1 = [1, 1, 1];
  /* the octagon an eight-sided block is cut to, hr across from its middle
     and its corners ch in */
  const octagon = (hr, ch) => [[-hr + ch, -hr], [hr - ch, -hr], [hr, -hr + ch], [hr, hr - ch], [hr - ch, hr], [-hr + ch, hr], [-hr, hr - ch], [-hr, -hr + ch]];
  /* an eight-sided block running along y from y0 to y1, its section (in x
     and z) the octagon oc, round (cx, cz) */
  function octBar(g, oc, cx, cz, y0, y1, c) {
    const P = (p, y) => [cx + p[0], y, cz + p[1]], ins = [cx, (y0 + y1) / 2, cz], n = oc.length;
    for (let i = 0; i < n; i++) { const p = oc[i], q = oc[(i + 1) % n]; g.face([P(p, y0), P(q, y0), P(q, y1), P(p, y1)], c, ins); }
    g.face(oc.map(p => P(p, y0)), c, ins); g.face(oc.map(p => P(p, y1)), c, ins);
  }
  /* the boomerang, flat, its elbow at the origin and its arms going back
     along -x either side */
  function rang(g, paint, wood, scale) {
    const h = 3.3 * scale, Lr = 21 * scale, pts = [];
    /* its outline: the outer corner, up the outside of one arm, round its
       tip, back down its inside, the inner corner, and the same for the
       other arm; every point of it can be seen from the elbow */
    const side = (s) => {
      const th = s * (Math.PI - .92), dx = Math.cos(th), dy = Math.sin(th);
      let nx = -dy, ny = dx;
      if (nx < 0) { nx = -nx; ny = -ny; }                     // the outside of the V faces +x
      return { dx, dy, nx, ny };
    };
    const A = side(1), B = side(-1);
    const corner = (S, k) => { const t = -k * h * S.ny / S.dy; return [t * S.dx + k * h * S.nx, 0]; };
    const run = (S, dir) => {
      const out = [], cx = Lr * S.dx, cy = Lr * S.dy, a0 = Math.atan2(S.ny, S.nx);
      for (let i = 0; i <= 8; i++) { const a = a0 + dir * Math.PI * i / 8; out.push([cx + Math.cos(a) * h, cy + Math.sin(a) * h]); }
      return out;
    };
    const oc = corner(A, 1), ic = corner(A, -1);
    const tipA = run(A, A.dy > 0 ? 1 : -1), tipB = run(B, B.dy > 0 ? 1 : -1);
    pts.push(oc, ...tipA, ic, ...tipB.reverse());
    pillow(g, pts, (oc[0] + ic[0]) / 2, 0, -1.3 * scale, 1.3 * scale, .8 * scale, wood);
    /* painted bands across each arm near its tip, and a dot at the elbow */
    for (const S of [A, B]) for (const t of [.62, .78]) {
      const cx = Lr * S.dx * t, cy = Lr * S.dy * t, w = .9 * scale, ex = S.nx * h * .78, ey = S.ny * h * .78, ax = S.dx * w, ay = S.dy * w;
      slab(g, [[cx - ex - ax, cy - ey - ay], [cx + ex - ax, cy + ey - ay], [cx + ex + ax, cy + ey + ay], [cx - ex + ax, cy - ey + ay]], -1.62 * scale, 1.62 * scale, 0, paint);
    }
    return pts;
  }
  function weapon(def, st) {
    const w = def.w, r = def.r, id = def.id, G = () => Gfx3D.Geo();
    const metal = G(), plain = G(), glow = G(), iron = G(), brass = G(), parts = {};
    const acc = L(def.acc), col = L(def.col);
    if (id === 'sword') {
      const len = st.len, x0 = r + 6.5, x1 = r + len, ut = 1 - Math.min(13, len * .4) / (x1 - x0);
      leaf(metal, x0, x1, u => u < ut ? 12 - 1.6 * u / ut : 10.4 * Math.pow(1 - (u - ut) / (1 - ut), .9),
                          u => u < ut ? 3.4 : 3.4 * (1 - (u - ut) / (1 - ut)), 10, W1);
      /* the guard: a bar swept toward the blade with balls on its ends, the
         block the blade comes out of, and a stone set in it */
      tube(brass, [[r + 5.2, -13.4, 0], [r + 3.7, -7, 0], [r + 3.3, 0, 0], [r + 3.7, 7, 0], [r + 5.2, 13.4, 0]], 2.2, 10, W1, true);
      for (const s of [-1, 1]) brass.sphere(r + 5.6, s * 14.2, 0, 3, 12, 8, W1);
      slab(brass, [[r, -4.3], [r + 7.2, -3.5], [r + 7.2, 3.5], [r, 4.3]], -3.3, 3.3, .9, W1);
      for (const z of [-3.3, 3.3]) glow.sphere(r + 3.4, 0, z, 1.8, 10, 8, L('#ff1f4a'), .55);
      rodX(plain, r - 12, r + .5, 2.4, 10, L(LEATHER));
    } else if (id === 'daggers') {
      for (const s of [1, -1]) {
        const g = G(), b = G(), p = G(), x0 = r + 5, x1 = r + w.len + 4;
        leaf(g, x0, x1, u => u < .28 ? 7.4 + 2.4 * u / .28 : 9.8 * (1 - Math.pow((u - .28) / .72, 1.7)), u => 2.7 * (1 - u * u * u), 9, W1);
        slab(b, [[r + .4, -3], [r + 5.6, -2.4], [r + 5.6, 2.4], [r + .4, 3]], -2.2, 2.2, .6, W1);
        tube(b, [[r + 4, -8.3, 0], [r + 3, -4, 0], [r + 3, 4, 0], [r + 4, 8.3, 0]], 1.5, 8, W1, true);
        for (const t of [-1, 1]) b.sphere(r + 4.2, t * 8.8, 0, 2, 10, 8, W1);
        rodX(p, r - 9, r + 1, 2, 10, L(LEATHER));
        const m = place(0, 0, 0, s > 0 ? 0 : Math.PI);
        metal.add(g, m); brass.add(b, m); plain.add(p, m);
      }
    } else if (id === 'axe') {
      const x1 = r + w.len + 2, hx = x1 - 12;
      rodX(plain, r - 6, x1 + 1.5, 3, 12, L(WOOD));
      for (const x of [r + 1.5, r + 7]) latheX(plain, [[3, 0], [3.6, .7], [3.6, 3.3], [3, 4]], 12, L(LEATHER), x);
      slab(iron, [[hx - 7, -5.2], [hx + 7, -5.2], [hx + 7, 5.2], [hx - 7, 5.2]], -4.6, 4.6, 1.1, W1);
      for (const s of [1, -1]) {
        const sp = [], ed = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          sp.push([hx - 5.5 + 11 * u, s * 4.9]);
          ed.push([hx - 14.5 + 29 * u, s * (17 + 6.5 * Math.sin(Math.PI * u))]);
        }
        bit(metal, sp, ed, 6.4, .6, 6, W1);
      }
      latheX(metal, [[0, 0], [3.3, 0], [3.3, 1.2], [.25, 7], [0, 7.2]], 12, W1, x1 + 1);
    } else if (id === 'vampire') {
      const x1 = r + w.len;
      rodX(plain, r - 6, x1 + 2, 2.6, 10, L('#2a2230'));
      latheX(plain, [[2.6, 0], [3.1, .6], [3.1, 5.4], [2.6, 6]], 10, L('#5a1830'), r + 2);
      plain.sphere(x1 + 2.5, 0, 0, 3.9, 12, 8, L('#1a1520'));
      glow.sphere(x1 + 2.5, 0, 3.3, 1.9, 10, 8, L('#ff1f4a'), .6);
      /* the blade: its back sweeping out to one side and round toward the
         ball, its edge on the inside of the curve */
      const C = [x1 - 14, 3.5], sp = [], ed = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, a = -.28 + u * 2.35, ca = Math.cos(a), sa = Math.sin(a), wd = 10 * Math.pow(1 - u, .75) + .4;
        sp.push([C[0] + ca * 19.5, C[1] + sa * 19.5]);
        ed.push([C[0] + ca * (19.5 - wd), C[1] + sa * (19.5 - wd)]);
      }
      bit(metal, sp, ed, 3.2, .45, 4, W1);
    } else if (id === 'bow') {
      const c = r + 16, H = 34, bend = 13;
      const lim = t => { const a = Math.abs(t); return c + bend * (1 - t * t) + (a > .7 ? 7 * Math.pow((a - .7) / .3, 2) : 0); };
      const path = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20 * 2 - 1; path.push([lim(t), t * H, 5.6 - Math.abs(t) * 2.6]); }
      ribbon(plain, path, -2.4, 2.4, L(WOOD));
      slab(plain, [[c + bend - 3.3, -4.5], [c + bend + 3.3, -4.5], [c + bend + 3.3, 4.5], [c + bend - 3.3, 4.5]], -2.9, 2.9, .8, acc);
      for (const s of [-1, 1]) plain.sphere(lim(s), s * H, 0, 2.2, 10, 8, L('#f4efe6'));
      /* the string, drawn back to the arrow on it */
      const nock = r + 3.5;
      for (const s of [-1, 1]) tube(plain, [[lim(s) - .6, s * (H - .6), 0], [nock, 0, 0]], .55, 6, L('#f4efe6'));
      rodX(plain, nock, c + 26, .95, 8, L('#e8d9b8'));
      leaf(metal, c + 25, c + 36, u => 8.5 * (1 - u), u => 2.2 * (1 - u), 3, W1);
      for (const s of [-1, 1]) flat(plain, [[nock + 1, s * .9], [nock + 10, s * .9], [nock + 3, s * 6]], [[0, 1, 2]], -.32, .32, L('#ff5a5a'));
    } else if (id === 'spear') {
      const x1 = r + st.len;
      rodX(plain, r - 8, x1 - 21, 2.4, 10, L(WOOD));
      for (const x of [r + 3, x1 - 34]) latheX(plain, [[2.4, 0], [2.95, .6], [2.95, 3.4], [2.4, 4]], 10, L(LEATHER), x);
      latheX(metal, [[2.2, 0], [3.3, 1.2], [3.1, 5.5], [2.3, 7]], 12, W1, x1 - 24);
      leaf(metal, x1 - 19.5, x1 + 2, u => u < .32 ? 5.5 + 8 * u / .32 : 13.5 * (1 - Math.pow((u - .32) / .68, 1.35)), u => 3.8 * (1 - u * u), 10, W1);
      /* a swallow-tailed pennant */
      const px = x1 - 38, pc = L(mix(def.col, '#e0201a', .45));
      flat(plain, [[px, 2.4], [px + 13, 2.4], [px + 11, 14.5], [px + 6.5, 9.8], [px + 2, 14.5]], [[0, 1, 3], [1, 2, 3], [0, 3, 4]], -.7, .7, pc);
    } else if (id === 'shield') {
      const hw = st.hw, R = r + w.gap, R0 = R - w.th / 2, R1 = R + w.th / 2, z0 = -15, z1 = 19;
      const n = Math.max(8, Math.ceil(hw * 2 / .1));
      const face = L('#fff6dc'), rim = L(GOLD);
      const rows = [[z0, z0 + 5, rim], [z0 + 5, z1 - 5, face], [z1 - 5, z1, rim]];
      for (const [za, zb, c] of rows) {
        for (const [Rr, sgn] of [[R1, 1], [R0, -1]]) {
          const base = plain.n;
          for (let i = 0; i <= n; i++) {
            const a = -hw + 2 * hw * i / n, ca = Math.cos(a), sa = Math.sin(a);
            plain.v(ca * Rr, sa * Rr, za, ca * sgn, sa * sgn, 0, sgn > 0 ? c : rim, 0, 0);
            plain.v(ca * Rr, sa * Rr, zb, ca * sgn, sa * sgn, 0, sgn > 0 ? c : rim, 0, 0);
          }
          for (let i = 0; i < n; i++) { const k = base + i * 2; plain.q(k, k + 2, k + 3, k + 1); }
        }
      }
      for (const [z, nz] of [[z1, 1], [z0, -1]]) {
        const base = plain.n;
        for (let i = 0; i <= n; i++) {
          const a = -hw + 2 * hw * i / n, ca = Math.cos(a), sa = Math.sin(a);
          plain.v(ca * R0, sa * R0, z, 0, 0, nz, rim, 0, 0);
          plain.v(ca * R1, sa * R1, z, 0, 0, nz, rim, 0, 0);
        }
        for (let i = 0; i < n; i++) { const k = base + i * 2; plain.q(k, k + 2, k + 3, k + 1); }
      }
      for (const a of [-hw, hw]) {
        const ca = Math.cos(a), sa = Math.sin(a);
        plain.face([[ca * R0, sa * R0, z0], [ca * R1, sa * R1, z0], [ca * R1, sa * R1, z1], [ca * R0, sa * R0, z1]], rim, [0, 0, (z0 + z1) / 2]);
      }
      /* its mark, a band of its own colour down the middle, the boss, and
         rivets along both rims */
      const E = .15, Re = R1 + .5, base = plain.n;
      for (let i = 0; i <= 6; i++) {
        const a = -E + 2 * E * i / 6, ca = Math.cos(a), sa = Math.sin(a);
        plain.v(ca * Re, sa * Re, z0 + 6, ca, sa, 0, col, 0, 0); plain.v(ca * Re, sa * Re, z1 - 6, ca, sa, 0, col, 0, 0);
      }
      for (let i = 0; i < 6; i++) { const k = base + i * 2; plain.q(k, k + 2, k + 3, k + 1); }
      brass.sphere(R1 + .6, 0, 2, 5.4, 16, 10, W1, 1, .5);
      const rn = Math.max(3, Math.round(hw * 2 / .2));
      for (let i = 0; i <= rn; i++) {
        const a = -hw + .08 + (2 * hw - .16) * i / rn, ca = Math.cos(a), sa = Math.sin(a);
        for (const z of [z0 + 2.5, z1 - 2.5]) brass.sphere(ca * (R1 + .2), sa * (R1 + .2), z, 1.1, 8, 6, W1);
      }
    } else if (id === 'frost') {
      shard(glow, [0, 0, 0], [0, 0, 1], 7, 19, 10, L('#8fe4ff'), L('#2c9fe8'));
      shard(glow, [4.2, 2, -2], unit3([.55, .3, .75]), 3.2, 9, 3, L('#8fe4ff'), L('#2c9fe8'));
      shard(glow, [-3.6, -2.4, -2], unit3([-.5, -.35, .75]), 2.6, 7, 2.5, L('#8fe4ff'), L('#2c9fe8'));
    } else if (id === 'hammer') {
      const x1 = r + w.len + 4, hx = x1 - 6;
      rodX(plain, r - 6, hx - 2, 2.8, 12, L(WOOD));
      for (const x of [r + 1, r + 6]) latheX(plain, [[2.8, 0], [3.4, .7], [3.4, 3.3], [2.8, 4]], 12, L(LEATHER), x);
      latheX(brass, [[2.8, 0], [3.9, .8], [3.9, 5], [2.8, 6]], 12, W1, hx - 15);
      /* the head: an eight-sided block across the handle, a flat face on one
         side and a spike on the other, with brass bands round it */
      octBar(metal, octagon(8.2, 2.6), hx, 0, -9, 10, W1);
      octBar(metal, octagon(7, 2.2), hx, 0, 9.6, 11.4, W1);
      for (const [y0, y1] of [[-5, -3.2], [4, 5.8]]) octBar(brass, octagon(8.7, 2.8), hx, 0, y0, y1, W1);
      spike(metal, [hx, -9, 0], [0, -1, 0], 5.6, 11, 8, W1);
    } else if (id === 'flail') {
      /* on the ball, the eye the chain hangs from; the head and a link of the
         chain are parts, drawn where the fight has them */
      iron.sphere(r - 1.5, 0, 0, 4.6, 12, 8, W1, 1, .7);
      const ring = G(); ring.torus(0, 0, 0, 2.5, .85, 14, 6, W1);
      iron.add(ring, Gfx3D.M4.axes(Gfx3D.M4.make(), [1, 0, 0], [0, 0, 1], [0, 1, 0], [r + 2.4, 0, 0]));
      const core = G(), spikes = G(), R0 = w.hr * .72;
      core.sphere(0, 0, 0, R0, 20, 14, W1);
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) dirs.push(unit3([x, y, z]));
      for (const d of dirs) spike(spikes, [d[0] * R0 * .8, d[1] * R0 * .8, d[2] * R0 * .8], d, 2.5, 5.4, 7, W1);
      parts.head = { iron: core, metal: spikes };
      const link = G(); link.torus(0, 0, 0, 1.5, .62, 16, 6, W1);
      const lk = G(); lk.add(link, Gfx3D.M4.axes(Gfx3D.M4.make(), [1.8, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]));
      parts.link = { iron: lk };
    } else if (id === 'boomerang') {
      /* one in hand, at its side, and one to throw */
      const held = G();
      rang(held, L('#fff0d6'), acc, 1);
      plain.add(held, place(r + 15, 0, 0, 0));
      const fly = G();
      rang(fly, L('#fff0d6'), acc, 1);
      const t = G(); t.add(fly, place(7, 0, 0, 0));
      parts.rang = { plain: t };
    } else if (id === 'laser') {
      const dk = L('#262838');
      slab(plain, [[r - 2, -6.5], [r + 12, -6.5], [r + 15, -4.5], [r + 15, 4.5], [r + 12, 6.5], [r - 2, 6.5]], -5.5, 5.5, 1.2, dk);
      slab(plain, [[r + 1, -3], [r + 11, -3], [r + 11, 3], [r + 1, 3]], 5.1, 7, .6, col);
      for (const s of [-1, 1]) slab(plain, [[r + 2, s * 6.2], [r + 10, s * 6.2], [r + 7, s * 9.6], [r + 2, s * 9.6]], -1.5, 1.5, .4, col);
      latheX(metal, [[0, 0], [3.9, 0], [3.9, 17.5], [3.3, 18.2], [3.3, 20]], 16, W1, r + 14);
      for (const x of [r + 19, r + 25]) {
        const t = G(); t.torus(0, 0, 0, 4.5, 1.05, 18, 8, L('#36e8ff'));
        glow.add(t, Gfx3D.M4.axes(Gfx3D.M4.make(), [0, 1, 0], [0, 0, 1], [1, 0, 0], [x, 0, 0]));
      }
      latheX(plain, [[3.2, 0], [4.5, .6], [4.5, 2.6], [3.4, 3.2]], 16, dk, r + 33.5);
      latheX(glow, [[0, 0], [3.4, 0], [3.4, .5], [0, 1.4]], 16, L('#36e8ff'), r + 35.8);
    } else if (id === 'wizard') {
      /* a staff standing at its side, a gold claw at the top holding a
         stone that lights itself */
      const sx = r + 9;
      tube(plain, [[sx, 0, -24], [sx + .7, .3, -9], [sx - .4, -.2, 7], [sx + .5, .2, 22], [sx, 0, 36.5]], u => 2.1 - .5 * u, 8, L('#6b4424'), true);
      const ring = G(); ring.torus(0, 0, 0, 2.3, .85, 16, 6, W1);
      brass.add(ring, place(sx, 0, 36.6));
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * TW + .5, ca = Math.cos(a), sa = Math.sin(a);
        tube(brass, [[sx + ca * 1.6, sa * 1.6, 37], [sx + ca * 4.4, sa * 4.4, 40.5], [sx + ca * 3.5, sa * 3.5, 45.6]], u => .8 - .35 * u, 6, W1, true);
      }
      glow.sphere(sx, 0, 42.8, 5, 18, 12, L('#ffb81f'));
    } else if (id === 'saw') {
      /* the arm out to the hub; the blade is a part, turning on the hub */
      const d = r + w.gap + st.sr;
      slab(plain, [[r - 6, -3.6], [d, -3], [d, 3], [r - 6, 3.6]], -2.4, 2.4, .8, col);
      for (let x = r + 2; x < d - 5; x += 7) slab(plain, [[x, -3.7], [x + 3, -3.7], [x + 5.5, 3.7], [x + 2.5, 3.7]], 2.2, 2.7, 0, acc);
      brass.cyl(d, 0, -3.4, 3.4, 4.6, 18, W1, { top: true, bottom: true });
      metal.cyl(d, 0, 3.2, 4.4, 1.8, 6, W1, { top: true });
      const disc = G(), deco = G(), sr = w.sr, pts = [];
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * TW, b = a + .6 * TW / 26;
        pts.push([Math.cos(a) * sr, Math.sin(a) * sr], [Math.cos(b) * (sr + 2.6), Math.sin(b) * (sr + 2.6)]);
      }
      pillow(disc, pts, 0, 0, -1, 1, .35, W1);
      const dk = L('#23252c');
      for (const [z, nz] of [[1.25, 1], [-1.25, -1]]) {
        const base = deco.n, r0 = sr * .44, r1 = sr * .6;
        for (let i = 0; i <= 40; i++) { const a = i / 40 * TW, ca = Math.cos(a), sa = Math.sin(a); deco.v(ca * r0, sa * r0, z, 0, 0, nz, dk, 0, 0); deco.v(ca * r1, sa * r1, z, 0, 0, nz, dk, 0, 0); }
        for (let i = 0; i < 40; i++) { const k = base + i * 2; deco.q(k, k + 2, k + 3, k + 1); }
        for (let k = 0; k < 5; k++) { const a = k / 5 * TW + .3; deco.disc(Math.cos(a) * sr * .78, Math.sin(a) * sr * .78, z, sr * .085, 10, dk, nz < 0); }
      }
      parts.disc = { metal: disc, plain: deco };
    } else if (id === 'katana') {
      const x0 = r + 7.5, x1 = r + w.len + 3, n = 14, sp = [], ed = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = x0 + (x1 - x0) * u, cy = 2.6 * u * u;
        const back = cy - 3, front = u < .84 ? cy + 3.2 - .5 * u : cy + 2.78 - 5.78 * Math.pow((u - .84) / .16, 1.4);
        sp.push([x, back]); ed.push([x + (u > .84 ? (u - .84) * 3 : 0), front]);
      }
      bit(metal, sp, ed, 2.8, .35, 3, W1);
      slab(brass, [[r + 4.6, -3.9], [r + 8.4, -3.7], [r + 8.4, 3.9], [r + 4.6, 4.1]], -2.1, 2.1, .5, W1);
      latheX(iron, [[0, 0], [7.8, 0], [7.8, 1.7], [0, 1.7]], 24, W1, r + 3.3);
      latheX(brass, [[7.5, 0], [8.3, .85], [7.5, 1.7]], 24, W1, r + 3.3);
      rodX(plain, r - 9, r + 3.4, 2.6, 10, L('#1c1c24'));
      latheX(brass, [[2.6, 0], [3.1, .5], [3.1, 1.6], [2.6, 2]], 12, W1, r + 1.2);
    }
    return { metal, plain, glow, iron, brass, parts };
  }
  /* what a weapon's look depends on, so a grown one is rebuilt once */
  const grows = def => def.id === 'sword' || def.id === 'spear' || def.id === 'shield' || def.id === 'saw';
  const shapeKey = (def, st) => def.id === 'sword' || def.id === 'spear' ? Math.round(st.len) : def.id === 'shield' ? Math.round(st.hw * 100) : def.id === 'saw' ? Math.round(st.sr * 2) : 0;
  /* a weapon as it is dealt */
  const start = def => ({ len: def.w.len || 0, hw: def.w.hw || 0, sr: def.w.sr || 0 });

  /* ---- the bits that fly about ---- */
  function arrowGeo() {
    const p = Gfx3D.Geo(), m = Gfx3D.Geo();
    p.box(-20, -.9, -.9, 4.6, .9, .9, L('#e8d9b8'));
    prism(m, [[4, -3.6], [12, 0], [4, 3.6]], -1, 1, [1, 1, 1]);
    prism(p, [[-20, -.6], [-12, -.6], [-18, -5]], -.5, .5, L('#ff5a5a'));
    prism(p, [[-20, .6], [-18, 5], [-12, .6]], -.5, .5, L('#ff5a5a'));
    return { plain: p, metal: m };
  }
  function bombGeo() {
    const g = Gfx3D.Geo();
    g.sphere(0, 0, 0, 1, 20, 12, L('#262a33'));
    g.cyl(0, 0, .78, 1.02, .34, 14, L('#8d95a4'), { top: true });
    g.cyl(0, 0, 1.02, 1.5, .08, 6, L('#d8c49a'));
    return g;
  }
  /* the Ninja's star: four points round a dark middle */
  function starGeo() {
    const m = Gfx3D.Geo(), p = Gfx3D.Geo(), pts = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TW, rr = i & 1 ? 2.6 : 8.2, a2 = a + (i & 1 ? 0 : .12);
      pts.push([Math.cos(a2) * rr, Math.sin(a2) * rr]);
    }
    pillow(m, pts, 0, 0, -.8, .8, .45, [1, 1, 1]);
    p.cyl(0, 0, -1.1, 1.1, 1.6, 12, L('#1a1a20'), { top: true, bottom: true });
    return { metal: m, plain: p };
  }
  /* the Cactus's needle, along x */
  function needleGeo() {
    const g = Gfx3D.Geo();
    latheX(g, [[0, -8], [.75, -7], [.6, 4], [0, 7]], 6, L('#fff0c0'));
    return g;
  }

  /* ---- the arena ----
     A court of bevelled tiles with dark grout between them, each half faintly
     in its side's colour and the whole of it darker toward the corners; the
     markings let into it (the centre circle, each side's starting ring, the
     halfway line) light themselves. Round white bumpers make the walls, each
     one a unit long and scaled to the walls' length as they close in, with a
     neon tube along the top that runs from one side's colour to the
     other's. Pylons stand at the corners over the bumpers' ends, and the
     court sits on a raised stage with a lit edge, over the dark.

     Nothing that touches lies flat on anything else: every piece on another
     is raised or sunk a little, so no two faces fight. */
  /* a pylon stands 7 out from the corner of the court and is 15 across, so
     it covers the open ends of both bumpers that meet there */
  const WALL = 18, WALL_H = 25, POST = 15, POST_AT = 7;
  const TEAM_A = '#39c8ff', TEAM_B = '#ff4d6d';
  function annulus(g, cx, cy, r0, r1, z, seg, c, a0, a1) {
    a0 = a0 || 0; if (a1 === undefined) a1 = TW;
    const base = g.n;
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (a1 - a0) * i / seg, ca = Math.cos(a), sa = Math.sin(a);
      g.v(cx + ca * r0, cy + sa * r0, z, 0, 0, 1, c, 0, 0);
      g.v(cx + ca * r1, cy + sa * r1, z, 0, 0, 1, c, 0, 0);
    }
    for (let i = 0; i < seg; i++) { const k = base + i * 2; g.q(k, k + 2, k + 3, k + 1); }
  }
  /* a quad with a colour at each corner */
  function quadC(g, pts, cols, n) {
    const b = g.n;
    pts.forEach((p, i) => g.v(p[0], p[1], p[2], n[0], n[1], n[2], cols[i], p[0], p[1]));
    g.q(b, b + 1, b + 2, b + 3);
  }
  /* a tube along x whose colour runs along it: col(u), u 0..1 */
  function tubeX(g, x0, x1, cy, cz, rad, seg, steps, col) {
    for (let s = 0; s < steps; s++) {
      const xa = x0 + (x1 - x0) * s / steps, xb = x0 + (x1 - x0) * (s + 1) / steps, ca = col(s / steps), cb = col((s + 1) / steps);
      const base = g.n;
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * TW, c = Math.cos(a), sn = Math.sin(a);
        g.v(xa, cy + c * rad, cz + sn * rad, 0, c, sn, ca, 0, 0);
        g.v(xb, cy + c * rad, cz + sn * rad, 0, c, sn, cb, 0, 0);
      }
      for (let i = 0; i < seg; i++) { const k = base + i * 2; g.q(k, k + 2, k + 3, k + 1); }
    }
  }
  function arenaGeo(half) {
    const G = () => Gfx3D.Geo();
    /* the court */
    const floor = G(), n = 10, s = half * 2 / n, gap = 1.3;
    floor.face([[-half, -half, -3.2], [half, -half, -3.2], [half, half, -3.2], [-half, half, -3.2]], L('#080a18'), [0, 0, -8]);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x0 = -half + i * s + gap / 2, y0 = -half + j * s + gap / 2, x1 = x0 + s - gap, y1 = y0 + s - gap;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let c = (i + j) & 1 ? '#2b3462' : '#252d57';
      c = mixHex(c, cx < 0 ? '#1f6a9c' : '#8a2850', .26 * Math.min(1, Math.abs(cx) / half * 1.5));
      c = mixHex(c, '#05060f', Math.min(.45, Math.hypot(cx, cy) / (half * 1.42) * .45));
      floor.box(x0, y0, -3, x1, y1, 0, L(c), 2.2);
    }
    /* the markings, which light themselves */
    const marks = G(), soft = L('#9db2ff'), A = L(TEAM_A), B = L(TEAM_B);
    annulus(marks, 0, 0, 55, 58.5, .3, 64, soft);
    annulus(marks, 0, 0, 15, 17.5, .3, 32, soft);
    for (const sx of [-1, 1]) {
      const X = sx * BBSim.START, c = sx < 0 ? A : B;
      annulus(marks, X, 0, 39, 42, .3, 48, c);
      for (let k = 0; k < 4; k++) annulus(marks, X, 0, 44, 47.5, .3, 6, c, k * TW / 4 - .22, k * TW / 4 + .22);
    }
    for (let y = -half + 10; y < half - 10; y += 22) {
      const y1 = Math.min(y + 12, half - 10);
      if (Math.abs(y) < 60 && Math.abs(y1) < 60) continue;          // not through the centre circle
      marks.face([[-1.2, y, .3], [1.2, y, .3], [1.2, y1, .3], [-1.2, y1, .3]], soft, [0, 0, -1]);
    }
    /* the stage the court stands on, and the dark below it */
    const plat = G(), P1 = half + 120, zt = -3.2, zb = -80;
    const ci = L('#1c2244'), co = L('#0c0f24'), cs = L('#090b1c');
    const sides = [[[-half, -half], [half, -half], [P1, -P1], [-P1, -P1]], [[half, -half], [half, half], [P1, P1], [P1, -P1]],
                   [[half, half], [-half, half], [-P1, P1], [P1, P1]], [[-half, half], [-half, -half], [-P1, -P1], [-P1, P1]]];
    for (const q of sides) quadC(plat, q.map(p => [p[0], p[1], zt]), [ci, ci, co, co], [0, 0, 1]);
    for (const [a, b, nx, ny] of [[[-P1, -P1], [P1, -P1], 0, -1], [[P1, -P1], [P1, P1], 1, 0], [[P1, P1], [-P1, P1], 0, 1], [[-P1, P1], [-P1, -P1], -1, 0]])
      quadC(plat, [[a[0], a[1], zt], [b[0], b[1], zt], [b[0], b[1], zb], [a[0], a[1], zb]], [co, co, cs, cs], [nx, ny, 0]);
    const edge = G(), E = P1 - 3;
    for (const [x0, y0, x1, y1] of [[-P1, -P1, P1, -E], [-P1, E, P1, P1], [-P1, -E, -E, E], [E, -E, P1, E]])
      edge.box(x0, y0, zt + .2, x1, y1, zt + 1.4, L('#6f86ff'), 0);
    const dark = G(), F = 3000;
    dark.face([[-F, -F, zb - 2], [F, -F, zb - 2], [F, F, zb - 2], [-F, F, zb - 2]], L('#05060f'), [0, 0, zb - 9]);
    /* one wall: a dark plinth, and a round white bumper on it, its inner
       face on y = 0 and its body out along -y */
    const rail = G();
    rail.box(-.5, -WALL - 2, -3, .5, 0, 7, L('#161b38'), 0);
    const bump = G();
    rodX(bump, -.5, .5, 9, 22, L('#f1f3f9'), false);
    rail.add(bump, Gfx3D.M4.place(Gfx3D.M4.make(), 0, -8.5, 16, 0));
    /* the neon along the top: one side's colour to the other's, or one only */
    const mixL = (u) => { const k = Math.max(0, Math.min(1, (u - .36) / .28)); return Gfx3D.mixc(A, B, k * k * (3 - 2 * k)); };
    const trimAB = G(), trimA = G(), trimB = G();
    tubeX(trimAB, -.5, .5, -8.5, 25.4, 1.8, 10, 16, mixL);
    tubeX(trimA, -.5, .5, -8.5, 25.4, 1.8, 10, 1, () => A);
    tubeX(trimB, -.5, .5, -8.5, 25.4, 1.8, 10, 1, () => B);
    /* the pylons over the corners, and the light each one holds up */
    const post = G();
    post.cyl(0, 0, -3, WALL_H + 9, POST, 28, L('#eef1f8'), { top: true });
    post.cyl(0, 0, 3, 8.5, POST + 1, 28, L('#1a1f3c'));
    const cap = G();
    cap.cyl(0, 0, WALL_H + 9.4, WALL_H + 13, POST * .68, 24, [1, 1, 1], { top: true });
    /* a light going up: a quad standing in x and z, bright at the foot */
    const beam = G();
    beam.v(-1, 0, 0, 0, -1, 0, [1, 1, 1, 1], 1, -1); beam.v(1, 0, 0, 0, -1, 0, [1, 1, 1, 1], 1, 1);
    beam.v(1, 0, 1, 0, -1, 0, [1, 1, 1, 1], 0, 1); beam.v(-1, 0, 1, 0, -1, 0, [1, 1, 1, 1], 0, -1);
    beam.q(0, 1, 2, 3);
    const decal = G();
    decal.decal(0, 0, 0, 1);
    return { floor, marks, plat, edge, dark, rail, trimAB, trimA, trimB, post, cap, beam, decal };
  }
  /* the head of the aiming arrow: an arrowhead with a notch, flat */
  function aimHeadGeo() {
    const g = Gfx3D.Geo();
    prism(g, [[-11, -16], [20, 0], [1, 0]], -2.4, 2.4, [1, 1, 1]);
    prism(g, [[1, 0], [20, 0], [-11, 16]], -2.4, 2.4, [1, 1, 1]);
    return g;
  }
  /* how far from a ball's middle its weapon can reach, as first dealt */
  function reach(def) {
    const w = def.w, r = def.r;
    switch (w.kind) {
      case 'blade': return r + w.len + (def.id === 'vampire' ? 10 : def.id === 'hammer' ? 12 : 5);
      case 'orb': return r + w.dist + 12;
      case 'arc': return r + w.gap + 8;
      case 'lance': return r + w.len + 3;
      case 'bow': return r + 52;
      case 'tail': return r + 34;
      case 'bomb': return r * 1.1 + 25;
      case 'flail': return r + w.len + w.hr + 2;
      case 'saw': return r + w.gap + w.sr * 2 + 3;
      case 'rang': return r + 24;
      case 'laser': return r + 37;
      case 'spell': return r + 16;
      case 'star': return r * 1.3;
      default: return r * 1.12;
    }
  }

  return { ballParts, faceGeo, weapon, grows, shapeKey, start, arrowGeo, bombGeo, starGeo, needleGeo, arenaGeo, aimHeadGeo, reach,
           NOROLL, METALS, FUSE_TIP, WALL, WALL_H, POST, POST_AT, TEAM_A, TEAM_B, banded };
})();
