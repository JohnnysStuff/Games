#!/usr/bin/env node
/* Assembles games.html from src/.

   The arcade ships as one self-contained HTML file, but it is written as a
   tree of modules: src/index.html is the page, src/styles/ the stylesheets
   and src/js/ the scripts, and src/manifest.json says what order they go in.
   The build pastes them into the page in that order — the stylesheets into
   its <style>, the scripts into its single <script> — and nothing else, so
   the output behaves exactly like one hand-written file. Order matters: the
   stylesheets cascade, and the scripts share one global scope.

     node tools/build.mjs            build games.html
     node tools/build.mjs --check    build in memory and check it, write nothing
     node tools/build.mjs --force    overwrite games.html even if it was edited by hand
     node tools/build.mjs --out F    write to F instead of games.html

   Every build checks that the manifest and the folders agree (a module that
   is on disk but not listed would silently never ship) and compiles the
   scripts without running them, so a syntax error or a name declared twice
   fails the build and is reported against the module it is in.

   games.html is an output. The build records a fingerprint of what it wrote,
   and refuses to overwrite a games.html that has changed since — an edit made
   there directly is not in src/, and building over it would throw it away.

   The version is the top entry of src/js/shell/release.js. The build checks
   that changelog, stamps its version into the page, and — when it writes
   games.html — also writes release/: version.json (the version, its size and
   the latest notes, which every copy of the arcade reads to learn whether it
   is out of date) and a copy of games.html. Publishing an update is putting
   those two files online; see CLAUDE.md, "Releases". */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const STAMP = join(ROOT, 'tools', '.build-stamp');
const DEFAULT_OUT = join(ROOT, 'games.html');
const RELEASE_DIR = join(ROOT, 'release');
const RELEASE_JS = 'shell/release.js';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? resolve(args[outIdx + 1]) : DEFAULT_OUT;

const read = p => readFileSync(p, 'utf8');
const sha = s => createHash('sha256').update(s).digest('hex');
const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';

/* every file under dir with the extension, as paths relative to dir */
function filesIn(dir, ext) {
  const out = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(ext)) out.push(relative(dir, p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out;
}

function validate(manifest) {
  const problems = [];
  for (const [key, dir, ext] of [['styles', 'styles', '.css'], ['scripts', 'js', '.js']]) {
    const listed = manifest[key];
    const seen = new Set();
    for (const f of listed) {
      if (seen.has(f)) problems.push(`${key}: "${f}" is listed twice`);
      seen.add(f);
      if (!existsSync(join(SRC, dir, f))) problems.push(`${key}: "${f}" is listed but src/${dir}/${f} does not exist`);
    }
    for (const f of filesIn(join(SRC, dir), ext))
      if (!seen.has(f)) problems.push(`${key}: src/${dir}/${f} is not in the manifest, so it would never ship`);
  }
  if (problems.length) throw new Error('src/manifest.json and src/ disagree:\n  ' + problems.join('\n  '));
}

/* The changelog, run on its own and checked: newest first, each version
   higher than the one below it, a date, and lists of plain strings. */
function changelog(modules) {
  const m = modules.find(x => x.f === RELEASE_JS);
  if (!m) throw new Error(`src/js/${RELEASE_JS} must be in the manifest: it says which version this build is`);
  let log;
  try { log = vm.runInNewContext(m.src + '\n;CHANGELOG', Object.create(null), { filename: RELEASE_JS }); }
  catch (e) { throw new Error(`src/js/${RELEASE_JS}: ${e.message}`); }
  const bad = msg => { throw new Error(`src/js/${RELEASE_JS}: ${msg}`); };
  if (!Array.isArray(log) || !log.length) bad('CHANGELOG must be a list with at least one entry');
  const nums = v => v.split('.').map(Number);
  const newer = (a, b) => { const x = nums(a), y = nums(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
  log.forEach((e, i) => {
    const at = `entry ${i + 1}${e && e.version ? ' (' + e.version + ')' : ''}`;
    if (!e || typeof e !== 'object') bad(`${at} is not an object`);
    if (!/^\d+\.\d+\.\d+$/.test(e.version || '')) bad(`${at}: version must look like 1.2.3`);
    if (!/^\d{4}-\d\d-\d\d$/.test(e.date || '')) bad(`${at}: date must look like 2026-09-25`);
    if (e.title !== undefined && typeof e.title !== 'string') bad(`${at}: title must be text`);
    let lines = 0;
    for (const k of ['added', 'changed', 'removed', 'fixed']) {
      if (e[k] === undefined) continue;
      if (!Array.isArray(e[k]) || e[k].some(s => typeof s !== 'string' || !s.trim())) bad(`${at}: ${k} must be a list of text`);
      lines += e[k].length;
    }
    for (const k of Object.keys(e)) if (!['version', 'date', 'title', 'added', 'changed', 'removed', 'fixed'].includes(k)) bad(`${at}: unknown field "${k}"`);
    if (!lines) bad(`${at}: say what changed (added, changed, removed or fixed)`);
    if (i > 0 && !newer(log[i - 1].version, e.version)) bad(`${log[i - 1].version} is listed above ${e.version}, so it must be the higher version (newest first)`);
  });
  return log;
}

function assemble() {
  const manifest = JSON.parse(read(join(SRC, 'manifest.json')));
  validate(manifest);
  let page = read(join(SRC, 'index.html'));
  const styles = manifest.styles.map(f => read(join(SRC, 'styles', f))).join('');
  const modules = manifest.scripts.map(f => ({ f, src: read(join(SRC, 'js', f)) }));
  const fill = (text, marker, body) => {
    const line = marker + '\n';
    if (text.split(line).length !== 2) throw new Error(`src/index.html must contain "${marker}" exactly once`);
    return text.replace(line, () => body);
  };
  const log = changelog(modules);
  if (page.split('@build:version').length !== 2) throw new Error('src/index.html must contain "@build:version" exactly once');
  page = page.replace('@build:version', log[0].version);
  const scripts = modules.map(m => m.src).join('');
  return {
    html: fill(fill(page, '/* @build:styles */', styles), '/* @build:scripts */', scripts),
    modules, scripts, log, count: manifest.styles.length + manifest.scripts.length
  };
}

/* what gets published: the page, and the small file every copy reads to find
   out whether it is the newest */
function writeRelease(html, log) {
  mkdirSync(RELEASE_DIR, { recursive: true });
  const top = log[0];
  const info = { version: top.version, date: top.date, file: 'games.html', size: Buffer.byteLength(html), notes: log.slice(0, 12) };
  writeFileSync(join(RELEASE_DIR, 'version.json'), JSON.stringify(info, null, 2) + '\n');
  writeFileSync(join(RELEASE_DIR, 'games.html'), html);
}

/* Compiled, never run. Each module on its own first, so an error points at
   the file and line it is on; then all of them together, which is the only
   way to catch a top-level name that two modules both declare. */
function check(modules, scripts) {
  const lineOf = e => { const m = /<script>:(\d+)/.exec(e.stack || ''); return m ? +m[1] : 0; };
  for (const { f, src } of modules) {
    try { new vm.Script('"use strict";\n' + src, { filename: '<script>' }); }
    catch (e) { throw new Error(`src/js/${f}:${lineOf(e) - 1}: ${e.message}`); }
  }
  try { new vm.Script('"use strict";\n' + scripts, { filename: '<script>' }); }
  catch (e) {
    let line = lineOf(e) - 1;
    for (const { f, src } of modules) {
      const n = src.split('\n').length - 1;
      if (line <= n) throw new Error(`src/js/${f}:${line}: ${e.message}`);
      line -= n;
    }
    throw e;
  }
}

try {
  const { html, modules, scripts, log, count } = assemble();
  check(modules, scripts);
  if (flag('--check')) {
    console.log(`ok: ${count} files, ${kb(html)}, v${log[0].version}, manifest complete, scripts compile (nothing written)`);
    process.exit(0);
  }
  if (OUT === DEFAULT_OUT && existsSync(OUT) && existsSync(STAMP) && !flag('--force')) {
    const was = sha(read(OUT)), built = read(STAMP).trim();
    if (was !== built) {
      console.error('games.html has been edited since it was last built. Those edits are not in src/,');
      console.error('and building now would lose them. Move them into src/ first, or pass --force.');
      process.exit(2);
    }
  }
  writeFileSync(OUT, html);
  if (OUT === DEFAULT_OUT) {
    writeFileSync(STAMP, sha(html) + '\n');
    writeRelease(html, log);
  }
  console.log(`built ${relative(ROOT, OUT) || OUT}: ${count} files, ${kb(html)}, v${log[0].version}` +
              (OUT === DEFAULT_OUT ? ' (release/ holds the files to publish)' : ''));
} catch (e) {
  console.error('build failed: ' + (e && e.message || e));
  process.exit(1);
}
