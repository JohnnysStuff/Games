/* Ball Brawl's balance: every ball against every other, many times over.

     node tools/brawl/balance.mjs                   every pair, 160 fights each
     node tools/brawl/balance.mjs --n 400           more fights a pair
     node tools/brawl/balance.mjs --ball sword      one ball against the rest
     node tools/brawl/balance.mjs --ball saw,katana several balls against the rest
     node tools/brawl/balance.mjs --tune try.json   with some numbers changed, to try them out
     node tools/brawl/balance.mjs --write           also write games/brawl/matchups.js

   It loads the game's own core.js and sim.js (the fight has no page in it),
   so what it measures is exactly what is played. Each fight gets random
   aims and a random seed, and the two balls swap seats every other fight,
   so neither side of the arena counts for or against anyone. Every pair
   draws its fights from a seed of its own, so the answer is the same
   however many workers share the job (--jobs, all but one of the cores by
   default).

   --tune takes a JSON file of changes to the roster, by ball and by path:
   { "saw": { "w.dmg": 2.6, "hp": 104 } }. Nothing is written back to
   core.js: once a change plays well, put it there by hand.

   What to look for: every ball winning 45-55% of its fights overall, no
   pair worse than about 25/75, and fights lasting 12-25 s. --write keeps
   the pair table (matchups.js), which the computer player counter-picks
   from and the collection reads its "strong against" and "weak against"
   from; the build pastes it in like any other script. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const here = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(here), '..', '..');
const src = f => fs.readFileSync(path.join(root, 'src', 'js', 'games', 'brawl', f), 'utf8');

/* the game's own roster and fight, with any --tune changes made to it */
function load(tune) {
  const ctx = vm.createContext({ Math, console });
  vm.runInContext(src('core.js') + '\n' + src('sim.js') + '\n;globalThis.__ = { BBM, BB_BALLS, BB_BY, BBSim };', ctx);
  const L = ctx.__;
  for (const id in tune || {}) {
    if (!L.BB_BY[id]) throw new Error('--tune: no ball called ' + id);
    for (const k in tune[id]) {
      const keys = k.split('.'), last = keys.pop();
      let o = L.BB_BY[id];
      for (const key of keys) o = o[key];
      o[last] = tune[id][k];
    }
  }
  return L;
}
/* a pair's own seed, from the run's and the pair's places in the roster */
const pairSeed = (seed, i, j) => (Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(i + 1, 40503) ^ Math.imul(j + 1, 65599)) >>> 0;

/* ---- a worker: plays the pairs it is given ---- */
if (!isMainThread) {
  const { pairs, N, seed, tune } = workerData;
  const { BB_BALLS, BBSim } = load(tune);
  const ids = BB_BALLS.map(b => b.id);
  const out = [];
  for (const [i, j] of pairs) {
    let s = pairSeed(seed, i, j) || 1;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const a = ids[i], b = ids[j], secs = [];
    let wa = 0, draws = 0;
    for (let k = 0; k < N; k++) {
      const swap = k & 1;
      const S = BBSim.run({ seed: (rnd() * 4294967296) >>> 0, balls: swap ? [b, a] : [a, b], aims: [(rnd() * 720) | 0, (rnd() * 720) | 0] });
      secs.push(S.tick * BBSim.T);
      if (S.winner === 2) { wa += .5; draws++; }
      else if ((S.winner === 0) !== !!swap) wa++;          // `a` won
    }
    out.push({ i, j, wa, n: N, draws, secs });
  }
  parentPort.postMessage(out);
} else main();

async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
  const N = +arg('n', 160), ONLY = arg('ball', null), WRITE = !!arg('write', false), seed = +arg('seed', 12345);
  const tuneFile = arg('tune', null), tune = tuneFile ? JSON.parse(fs.readFileSync(tuneFile, 'utf8')) : null;
  const jobs = Math.max(1, +arg('jobs', Math.min(15, os.cpus().length - 1)));
  const { BB_BALLS, BBSim } = load(tune);
  const ids = BB_BALLS.map(b => b.id);
  const only = ONLY ? String(ONLY).split(',') : null;
  for (const id of only || []) if (ids.indexOf(id) < 0) throw new Error('--ball: no ball called ' + id);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i; j < ids.length; j++)
    if (!only || only.indexOf(ids[i]) >= 0 || only.indexOf(ids[j]) >= 0) pairs.push([i, j]);

  const t0 = Date.now();
  const shares = Array.from({ length: Math.min(jobs, pairs.length) }, () => []);
  pairs.forEach((p, k) => shares[k % shares.length].push(p));
  const parts = await Promise.all(shares.map(share => new Promise((res, rej) => {
    const w = new Worker(here, { workerData: { pairs: share, N, seed, tune } });
    w.once('message', res); w.once('error', rej);
  })));

  const win = {}, stats = {}, dur = [];
  for (const a of ids) { win[a] = {}; stats[a] = { w: 0, n: 0, t: 0 }; }
  let over = 0, poison = 0, draws = 0, total = 0;
  for (const r of parts.flat()) {
    const a = ids[r.i], b = ids[r.j], t = r.secs.reduce((s, v) => s + v, 0);
    win[a][b] = r.wa / r.n; win[b][a] = 1 - r.wa / r.n;
    stats[a].w += r.wa; stats[a].n += r.n; stats[a].t += t;
    if (a !== b) { stats[b].w += r.n - r.wa; stats[b].n += r.n; stats[b].t += t; }
    for (const s of r.secs) { dur.push(s); total++; if (s > BBSim.SHRINK_AT) over++; if (s > BBSim.POISON_AT) poison++; }
    draws += r.draws;
  }

  const pct = v => (v * 100).toFixed(0).padStart(3);
  console.log('\n' + total + ' fights in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s on ' + shares.length + ' workers' + (tune ? ', tuned by ' + tuneFile : '') + '\n');
  console.log('row beats column, %\n');
  console.log('          ' + ids.map(id => id.slice(0, 5).padStart(6)).join(''));
  for (const a of ids) {
    if (only && only.indexOf(a) < 0) continue;
    console.log(a.padEnd(10) + ids.map(b => (win[a][b] === undefined ? '    -' : pct(win[a][b]) + ' ').padStart(6)).join(''));
  }
  console.log('\noverall');
  const rows = ids.filter(id => stats[id].n && (!only || only.indexOf(id) >= 0)).map(id => [id, stats[id].w / stats[id].n, stats[id].t / stats[id].n]);
  rows.sort((x, y) => y[1] - x[1]);
  for (const [id, w, t] of rows) {
    const vs = ids.filter(b => b !== id && win[id][b] !== undefined);
    const worst = vs.reduce((m, b) => (win[id][b] < win[id][m] ? b : m), vs[0]);
    const best = vs.reduce((m, b) => (win[id][b] > win[id][m] ? b : m), vs[0]);
    console.log('  ' + id.padEnd(10) + pct(w) + '%   ' + t.toFixed(1).padStart(5) + ' s   best vs ' + best.padEnd(10) + pct(win[id][best]) + '%   worst vs ' + worst.padEnd(10) + pct(win[id][worst]) + '%');
  }
  dur.sort((x, y) => x - y);
  const q = f => dur[Math.floor((dur.length - 1) * f)].toFixed(1);
  console.log('\nfight length: median ' + q(.5) + ' s, 10% ' + q(.1) + ' s, 90% ' + q(.9) + ' s');
  console.log('reached the closing walls ' + (over / total * 100).toFixed(1) + '%, the poison ' + (poison / total * 100).toFixed(1) + '%, draws ' + (draws / total * 100).toFixed(1) + '%');

  if (WRITE && !only && !tune) {
    const out = '/* GENERATED by tools/brawl/balance.mjs --write (' + N + ' fights a pair). Do not edit:\n' +
      '   run the tool again after changing a ball. BB_MATCH[a][b] is how often, in\n' +
      '   hundredths, ball a beats ball b with random aims. The computer player\n' +
      '   counter-picks from it and the collection reads its best and worst\n' +
      '   match-ups from it. */\n' +
      'const BB_MATCH = {\n' + ids.map(a => '  ' + a + ': { ' + ids.map(b => b + ': ' + Math.round(win[a][b] * 100)).join(', ') + ' }').join(',\n') + '\n};\n';
    fs.writeFileSync(path.join(root, 'src', 'js', 'games', 'brawl', 'matchups.js'), out);
    console.log('\nwrote src/js/games/brawl/matchups.js');
  } else if (WRITE) console.log('\nnot written: --write needs every pair, and the roster as core.js has it (no --ball, no --tune)');
}
