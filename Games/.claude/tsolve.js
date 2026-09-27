/* Trap Room checker: breadth-first over held inputs, one decision every K
   substeps. The trap mask is part of the state because a room is a different
   room once its floor has gone. */
(function () {
  const stub = {
    get W() { return 960; }, get H() { return 600; },
    fx: new Proxy({}, { get: () => () => {} }),
    sound: new Proxy({}, { get: () => () => {} }),
    input: { down: () => false, pressed: () => false, takeClick: () => null, pointer: { down: false }, anyPressed: () => false },
    hud() {}, shake() {}, opt() { return null; },
    save() {}, load: (k, d) => d, wipe() {}, best: () => 0, plays: () => 0,
    gameOver() {}
  };
  let inst = null;
  const boot = () => inst || (inst = byId.traps.mount(stub));
  const ACTS = [
    { l: 0, r: 1, j: 0 }, { l: 0, r: 1, j: 1 },
    { l: 0, r: 0, j: 0 }, { l: 0, r: 0, j: 1 },
    { l: 1, r: 0, j: 0 }, { l: 1, r: 0, j: 1 }
  ];
  window.TSOLVE = {
    rooms: () => boot()._dev.names.slice(),
    solve(i, K, opts) {
      opts = opts || {};
      const D = boot()._dev;
      D.use(i);
      const F = D.fixed, CAP = opts.cap || 2600, MAXD = opts.maxDepth || 500;
      const clone = p => {
        const q = Object.assign({}, p);
        q.grid = new Uint8Array(p.grid);
        q.fire = new Float32Array(p.fire);
        q.did = new Uint8Array(p.did);
        return q;
      };
      const key = p => {
        let m = 0;
        for (let k = 0; k < p.fire.length; k++) if (p.fire[k] >= 0) m |= (1 << k);
        return ((p.x / 6) | 0) + '|' + ((p.y / 6) | 0) + '|' + ((p.vx / 40) | 0) + '|' +
               ((p.vy / 60) | 0) + '|' + (p.og ? 1 : 0) + '|' + m + '|' + p.dx + ',' + p.dy;
      };
      let layer = [{ p: clone(D.newSim()), from: -1, a: 0 }];
      const layers = [layer];
      let best = -1, bestP = layer[0].p;
      for (let depth = 0; depth < MAXD; depth++) {
        const seen = Object.create(null), next = [];
        for (let i2 = 0; i2 < layer.length; i2++) {
          for (let a = 0; a < ACTS.length; a++) {
            const q = clone(layer[i2].p);
            let ok = true;
            for (let s = 0; s < K; s++) {
              D.stepSim(q, F, ACTS[a]);
              if (q.dead) { ok = false; break; }
              if (q.won) break;
            }
            if (q.x > best) { best = q.x; bestP = q; }
            if (!ok) continue;
            if (q.won) {
              const path = [a];
              let li = layers.length - 1, pi = i2;
              while (li > 0) { const nd = layers[li][pi]; path.push(nd.a); pi = nd.from; li--; }
              path.reverse();
              return { ok: true, room: i, K, depth: depth + 1, t: +q.t.toFixed(2), path };
            }
            const kk = key(q);
            if (seen[kk]) continue;
            seen[kk] = 1;
            next.push({ p: q, from: i2, a });
          }
        }
        if (!next.length) {
          return { ok: false, room: i, K, depth,
                   stuckCell: Math.round(bestP.x / D.cell) + ',' + Math.round(bestP.y / D.cell),
                   name: D.names[i] };
        }
        if (next.length > CAP) {
          const keep = [], stride = next.length / CAP;
          for (let k = 0; k < CAP; k++) keep.push(next[Math.floor(k * stride)]);
          layer = keep;
        } else layer = next;
        layers.push(layer);
      }
      return { ok: false, room: i, reason: 'maxDepth', name: D.names[i] };
    },
    replay(i, K, path) {
      const D = boot()._dev;
      D.use(i);
      const p = D.newSim();
      for (const a of path) {
        for (let s = 0; s < K; s++) { D.stepSim(p, D.fixed, ACTS[a]); if (p.dead || p.won) break; }
        if (p.dead || p.won) break;
      }
      return { won: !!p.won, dead: !!p.dead, t: +p.t.toFixed(2) };
    },
    all(K, opts) {
      const out = [];
      for (let i = 0; i < boot()._dev.count; i++) {
        const t0 = performance.now();
        const r = this.solve(i, K, opts);
        r.ms = Math.round(performance.now() - t0);
        r.name = boot()._dev.names[i];
        if (r.ok) { r.replayOk = this.replay(i, K, r.path).won; r.steps = r.path.length; delete r.path; }
        out.push(r);
      }
      return out;
    }
  };
  return 'TSOLVE ready';
})();
