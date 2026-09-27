# Working in this repository

Read README.md first. It covers the layout, the build, the game contract and
the api.

## The one rule

`games.html` is built from `src/`. Never edit `games.html` directly. Edit the
module in `src/`, then build:

```bash
node tools/build.mjs --check   # manifest complete, every module compiles
node tools/build.mjs           # write games.html
node tests/mini-golf.test.cjs  # after anything touching golf
```

If the build says `games.html` was edited since it was last built, someone
changed the output by hand. Find that change, move it into `src/`, and
rebuild. Do not reach for `--force`, which throws the change away.

## Keep the changelog

Players see `src/js/shell/release.js` as the What's new sheet, so every
change a player would notice gets a line there, in words a player would use
("Crossy Road: bigger gaps at the start"), under added, changed, removed or
fixed. Add it to the top entry. If the top entry's version is already live
(`curl https://mbkiuybrzplgqhsdixjh.supabase.co/storage/v1/object/public/releases/version.json`),
start a new entry above it with a higher version and today's date instead.
Publishing (uploading `release/`) is the user's call; README.md, "Releases".

Node is not on PATH on this machine. It is at
`C:\Users\johnt\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`.

## Things that bite

- All scripts share one global scope, pasted in `src/manifest.json` order.
  At top level, a file can use only names declared in files before it.
  Inside functions it can use anything. A new file must be added to the
  manifest, or the build fails.
- A `const` in a new module can collide with a top-level name in another
  one. The build reports it as `src/js/<file>:<line>: Identifier ... has
  already been declared`.
- A game's state lives inside its `mount()` closure, so a page script cannot
  reach it. To test internals, add a hook behind a query flag and delete it
  afterwards.
- CSS cascades in manifest order, and later files win. `hub-v4.css` (the
  current hub, leaderboards and party look) and `horizon.css` (golf and pool)
  are deliberate override layers.
- `update(dt)` is a fixed 1/120 s step. Animate menus on the render clock
  (FrontKit's `FK.dt`), because a tween advanced in `update()` judders.
- Soccer's sprites are generated art, cleaned by `tools/soccer/clean.mjs`
  into `src/js/games/soccer/art-data.js` (generated; never edit it). New
  sheets go in `art/soccer/GameReady/`; README.md, "Soccer's art".
- Another session may be working in this folder at the same time. Keep each
  change scoped to the file it is about, and check a file's modification time
  before editing it if it might have moved.

## Testing in the browser

The `games` server in `.claude/launch.json` serves this folder on port 8802.
The page opens on the sign-in gate. To get past it, run this in the page:

```js
document.body.classList.remove('locked', 'booting');
document.getElementById('acctOv').classList.remove('on');
openGame(byId.golf); start();
```

Opening a game counts as a play in that browser's saved stats. Snapshot
`localStorage` before a test and restore it afterwards.
