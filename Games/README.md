# Arcade

A games hub that ships as a single page, `games.html`: eighteen games, each with
its own front page, plus accounts, parties and online play, levels, quests,
coins, cosmetics and global leaderboards. It runs in any modern browser. The
page itself needs no install and no build step, and there are no runtime
dependencies.

`games.html` is **generated**. The code lives in `src/`, and
`tools/build.mjs` pastes it together into that one file.

```bash
node tools/build.mjs
```

## Layout

```
games.html            the built page. Host it or open it; do not edit it
src/
  index.html          the page: head, markup, and the two places the build fills
  manifest.json       every stylesheet and script, in the order they are pasted
  styles/*.css        the stylesheets (they cascade in manifest order)
  js/core/            what every game stands on
  js/games/           one file per game
  js/shell/           the app around the games
tools/build.mjs       the build (no dependencies; Node 18 or newer)
tools/soccer/         soccer's art pipeline: clean.mjs, embed.mjs, sheets.html
tools/brawl/          Ball Brawl's balance: balance.mjs plays every pair of balls
tools/volley/         Beach Volley's art pipeline: clean.mjs, embed.mjs
art/soccer/           soccer's sprites: GameReady/ as delivered, clean/ as used
art/volley/           Beach Volley's sheets as delivered, clean/ as used
tests/                the mini golf course test, an optional browser run,
                      soccer.html and volley.html, which run those games on
                      their own, the soccer and Ball Brawl online benches,
                      and brawl-models.html, every Ball Brawl model to look at
```

### Soccer's art

Soccer's sprites are made by an image generator, so they only look like
pixel art: soft blocks about 3.5 image pixels wide, off any exact grid.
New sheets go in `art/soccer/GameReady/`. Then:

```bash
node tools/soccer/clean.mjs
```

That reads every sheet it has a layout for (`LAYOUTS` in the file), turns
it into real 1x pixel art in `art/soccer/clean/`, merges later deliveries
into the sheets they belong to, and writes
`src/js/games/soccer/art-data.js`, which carries the art into the page.
Build afterwards. `tools/soccer/sheets.html` (served over http) plays every
animation in the cleaned sheets.

Every sheet ever delivered has to stay in `GameReady`: each run rebuilds a
sheet from all of its deliveries, so a missing file quietly drops its rows
(the keeper's dives, the celebrations) from the game. The stands, the fans
and the referee (`stands.png`, `fans*.png`, `referee_front.png`) are drawn
by `crowd.js` and `ref.js`. The referee works the far touchline facing us,
so his sheet is drawn from the front, with everything he does one way
going right (the game mirrors it). `referee.png`, his first side-on sheet,
is no longer read.

### Ball Brawl's balance

Ball Brawl's twenty-four balls are tuned in one place, `BB_BALLS` in
`src/js/games/brawl/core.js` (new balls go on the end: online, a pick
travels as its place in that list). After changing one:

```bash
node tools/brawl/balance.mjs --write
```

That loads the game's own fight (`core.js` and `sim.js`, which have no page
in them) and plays every pair of balls many times over, with random aims
and the balls swapping sides, then prints who beats whom, each ball's
overall win rate and how long fights last. What to aim for: every ball
winning 45-55% of its fights, no pair worse than about 25/75, and fights
lasting 12-25 s. `--write` also writes `src/js/games/brawl/matchups.js`
(generated; never edit it), the table the computer player picks from and
The Balls screen reads its best and worst match-ups from. Build afterwards.

It plays the pairs on every core but one (all 300 pairs, 160 fights each,
in about half a minute), and each pair draws from a seed of its own, so
the numbers do not depend on how many workers ran. To try numbers without
editing `core.js`, put them in a file and pass it with `--tune`:
`{ "saw": { "w.dmg": 9.5, "hp": 104 } }` changes those fields for that run
only. `--ball saw,katana` plays just the pairs with those balls in.

The fight may use only maths every browser rounds the same way (+ - * /,
sqrt, and `BBM`'s own sin and cos), and randomness only from its seed,
because online both screens run it and have to see the same fight.

### Ball Brawl's models

Every ball, weapon and thrown thing is built in code from Gfx3D's shapes
(`src/js/games/brawl/models.js`): a ball's body, its face (the ones that do
not roll look where they are going) and its weapon, each in layers of
painted, polished (steel, iron, brass or copper) and glowing parts.
`tests/brawl-models.html` (served over http) draws them with the game's own
view: G shows them all, F one at a time filling the screen, A two of them
fighting in the arena with their effects; the arrows pick a ball, up and
down tip the camera, Q and E turn it, Space pauses. Nothing flat may lie on
anything else in the same layer set (a stud, a band or a collar goes a
little into or out from what it sits on), or the two faces fight.

### Beach Volley's art

Beach Volley's sprites come from the same image generator as Soccer's and
go through the same kind of clean-up. The sheets as delivered sit in
`art/volley/` (or `art/volley/GameReady/`, which is read first if it
exists). Then:

```bash
node tools/volley/clean.mjs
```

That reads every sheet it has a layout for (`LAYOUTS` in the file) with
Soccer's own helpers (`tools/soccer/clean.mjs` exports them), writes 1x
pixel art to `art/volley/clean/`, and writes
`src/js/games/volley/art-data.js` (generated; never edit it) through
`tools/volley/embed.mjs`, which also paints the hub card from the cleaned
sprites. Build afterwards.

- `volley_player.png`, with the rows of `volley_attack.png` and
  `volley_emotes.png` merged in: one player, dressed in each side's colours
  by the game (the people share Soccer's palette, so its kit, skin and hair
  roles hold).
- `volley_umpire.png`, `beach_fans.png`: the umpire (sitting; her chair is
  a prop) and a spectator, both from the front.
- `beach_props.png`, `beach_critters.png`, `beach_ball.png`,
  `beach_net.png`: pieces, each frame with its own box, each sheet read into
  a palette of its own, kept in `clean/<name>_palette.json` (`--palette`
  works them out again).
- `beach_backdrop.png`: the sky, the sea and the sand behind the court, one
  picture read down to the view's 480 art pixels.

The court's tape, the net's mesh and the ball's shadow and landing ring are
drawn in code (`games/volley/view.js`): the view leans (`VOL.SH` in
`court.js`) so the net's face shows, and the net is drawn a column at a
time so that each part of it sorts with the players by depth.

### core/

| file | what it is |
| --- | --- |
| `util.js` | `clamp`, `lerp`, `rand`, `rr` (rounded rect), colour mixing |
| `store.js` | `Store`: bests, options, play counts and per-game saves in localStorage |
| `sound.js` | `Sound`: every effect, synthesised with WebAudio (no samples); `Sound.render()` builds one offline so it can be measured |
| `fx.js` | `FX`: particles, floating text, screen shake |
| `input.js` | `Input`: keyboard, pointer and touch, read once per step |
| `stage.js` | the `cv` canvas and `Stage`: fitting 960×600 (or wider) into the window |
| `registry.js` | `GAMES`, `byId`, `registerGame()` |
| `board.js` | `P`, the shared board palette, and `panelText()` |
| `hud.js` | `Hud`: the lettering games keep their scores in, and the Horizon kit |
| `net.js` | `getRace()`, `getSession()`, `NetBuf`, `mulberry()`, race standings |
| `quadfx.js` | `QuadFX`: instanced WebGL quads with a canvas fallback (Flappy Bird) |
| `gfx3d.js` | `Gfx3D`: the lit 3D renderer (golf, pool, Paper.io, Crossy Road, Ball Brawl) |
| `frontkit.js` | `FrontKit`: buttons, chips, Play, Escape for a game's own front page |
| `locker.js` | `FrontLocker`: Customize and Shop inside a front page |

### shell/

| file | what it is |
| --- | --- |
| `cheats.js` | the owner-only cheat panel; a cheated run never reaches a leaderboard |
| `embed.js` | hosts Unity WebGL (or any other page) as a game, over `postMessage` |
| `hub.js` | the landing page: cards, sections, search, sort, keyboard walk |
| `session.js` | the `api` games are handed; opening and closing a game; start and pause panels |
| `crate.js` | the crate-opening ceremony |
| `tween.js` | how the shell's own UI animates |
| `ledger.js` | the end-of-round card |
| `loop.js` | mounting, the fixed-step loop, the router, and boot |
| `meta.js` | levels, achievements, daily challenge, quests, coin shop, profile sheet, palette, boss key |
| `cosmetics.js` | `Cos`: what you own and wear, crates and shards |
| `multiplayer.js` | `MP`: parties, presence, chat, races and host-run sessions over Supabase Realtime |
| `accounts.js` | `Account`: sign-in (Supabase Auth), cloud bests, leaderboards, friends |
| `release.js` | `CHANGELOG`: this build's version (the top entry) and what changed in every version |
| `updates.js` | `Updates`: checks online for a newer copy and offers to download it; shows What's new after an update |

### games/

| file | id | online |
| --- | --- | --- |
| `flappy.js` | `flappy` | race |
| `breakout.js` | `bricks` | race |
| `golf.js` | `golf` | race |
| `pool.js` | `pool` | duel |
| `skribbl.js` | `sketch` | party |
| `stack.js` | `stack` | none |
| `wordle.js` | `wordle` | race |
| `chess.js` | `chess` | duel |
| `block-blast.js` | `blast` | race |
| `pac-man.js` | `pac` | arena |
| `geometry-dash.js` | `gdash` | race |
| `helix-jump.js` | `helix` | none |
| `paper-io.js` | `turf` | arena |
| `fruit-ninja.js` | `ninja` | none |
| `crossy-road.js` | `crossy` | race |
| `all-in.js` | `casino` | race |
| `soccer.js` (and `soccer/`) | `soccer` | arena |
| `brawl.js` (and `brawl/`) | `brawl` | duel |
| `volley.js` (and `volley/`) | `volley` | none |

The order in `manifest.json` is the hub's Featured order.

## Building

```bash
node tools/build.mjs            # write games.html
node tools/build.mjs --check    # build in memory and verify; write nothing
node tools/build.mjs --out F    # write somewhere else
node tools/build.mjs --force    # overwrite a games.html that was edited by hand
```

Every build checks that `manifest.json` and the folders agree, so a new
module you forget to list fails the build instead of quietly never shipping.
It also compiles the scripts without running them: a syntax error, or a
top-level name two modules both declare, is reported as
`src/js/<file>:<line>`.

The build records a fingerprint of the `games.html` it wrote
(`tools/.build-stamp`). If `games.html` has changed since, the build refuses
to overwrite it, because an edit made there directly is not in `src/`. Move
the edit into `src/`, or pass `--force` to discard it.

`package.json` wraps these as `npm run build` and `npm run check`, and
`npm test` builds and then runs the tests. It has no dependencies.

## Releases

Players keep `games.html` on their own machines, so a copy cannot be updated
from here. Instead every copy knows its version (the top entry of
`src/js/shell/release.js`) and, when it opens, fetches `version.json` from
the public Supabase Storage bucket `releases`. If that names a higher
version, the page offers to download the new `games.html`: saved straight
over the old file in Chrome and Edge, or into Downloads elsewhere. The first
time someone opens a new version, a What's new sheet lists what changed since
the version they last saw. The version chip in the header reopens it.

The build writes `release/` next to `games.html`: `version.json` and a copy
of `games.html`. To ship an update:

1. Add a new entry at the top of `CHANGELOG` with a higher version, the date,
   a short title and what was added, changed, removed or fixed. The build
   checks the order and the format.
2. `node tools/build.mjs`
3. Upload both files in `release/` to the `releases` bucket, replacing the old
   ones. Copies already out there offer the update the next time they open.

To try a release before uploading it, serve the folder over http and point a
tab at it: `sessionStorage.arcadeUpdateBase = 'http://localhost:8802/release/'`.

## Running it

Open `games.html` in a browser. To serve it over http (an embedded Unity
build needs that), serve the folder with any static server. Playing needs an
account: signed out, the page shows only the sign-in box.

The backend is Supabase: Auth for accounts, a handful of Postgres RPCs
(`submit_score`, `leaderboard`, `friend_*`, `touch_me`, `username_taken`) and
Realtime channels for parties. The project URL and publishable key are in
`accounts.js` and `multiplayer.js`.

## Testing

```bash
node tests/mini-golf.test.cjs
```

This compiles every script in `games.html`, then builds all 144 holes of the
eight golf courses and checks their geometry. `tests/mini-golf-browser.cjs` is
an optional Playwright run of the same courses in a real browser. Set
`NODE_PATH` to include Playwright to use it.

`tests/soccer.html` runs soccer on its own, from the same files the build
uses, over any static server. With `?debug` it exposes `soc` for stepping a
match by hand, and `soc.dbg` for whole CPU matches and scripted shots
(`tests/soccer-debug.js`).

`tests/volley.html` runs Beach Volley on its own the same way. With `?debug`
it exposes `vol`: `vol.run(seconds, { hold, press })` steps it by hand,
`vol.state()` says where everyone is, `vol.sim(seconds, level)` plays the
computer against itself as fast as it will go and says how the rallies
ended and how long they were, and `vol.play(seconds, { spike, trace })`
puts a pretend person at the keys (arrows, Z, X, a held serve) and lists
every touch. `vol.zoomS = 4` with `vol.zx`, `vol.zy` shows the 1x picture
blown up round that point. Beach Volley draws its screens with Soccer's
`SocUI` and its frames with `SocArt.frame`, so it comes after Soccer in the
manifest and the page loads Soccer's `art.js`, `ball.js` and `ui.js` too.

`tests/soccer-net.html` is soccer online without a network: a host and up to
five guests in one page, joined by a pretend party whose messages arrive late,
unevenly, sometimes very late (`spike`) or not at all, on a simulated clock so
ten minutes of play take a second. `await bench({ lat, jit, spike, loss,
players, secs, leaveAt })` says how smooth the first guest's screen was
(players' and the ball's biggest step and any jumps), how often the host
overruled a guest's kick or pickup and why, and what the traffic costs.
`await scene('shot' | 'tackle' | 'pass' | 'save', { lat, jit })` plays one
moment the same way every time (a guest's shot, a guest's slide into the
host's player, a guest's pass to a teammate, a guest in goal) and says what
the guest's screen did with the ball, frame by frame, and what the host
made of it. Run them after any change to `games/soccer/net.js`. The bench's
lineup (where everyone picks a position online, `games/soccer/lineup.js`)
settles at once, everyone given the first place left; `lineup: true` in
`pair()` plays it for real, driven by keys like the match.

`tests/brawl-net.html` does the same for Ball Brawl: a host and a guest, each
running the real match (`games/brawl/match.js`) with a pretend player who
picks, sometimes rerolls and aims at random, joined by a party with lag and
lost messages, on a simulated clock. `await bench({ lat, jit, loss, matches })`
says whether both screens saw the same fight every round (each fight's
fingerprint and winner), whether they agree who won each match, whether
each side made its own pick and aim every round (rather than its clock
running out and choosing for it; both should read "N and N of N"), how long
rounds took, how long each side sat waiting for the other, and what the
traffic cost; `render: true` draws both screens as it goes. Run it after any
change to `games/brawl/net.js`, `match.js` or the fight itself.

For anything visual, open the page and play. To get past the sign-in gate
locally, run this in the console:

```js
document.body.classList.remove('locked', 'booting');
document.getElementById('acctOv').classList.remove('on');
openGame(byId.pool);   // any id from the table above
```

## Adding a game

1. Create `src/js/games/<name>.js` containing a single `registerGame({...})` call.
2. Add it to `scripts` in `src/manifest.json`, among the other games. Where
   you put it is where it appears in Featured.
3. Run `node tools/build.mjs`.

A definition looks like this:

```js
registerGame({
  id: 'stack',                    // the URL is #stack
  title: 'Stack',
  tagline: 'One line for the hub card.',
  tags: ['Arcade', 'Timing'],
  art: '<svg viewBox="0 0 320 180">…</svg>',   // the card's artwork
  w: 960, h: 600,                 // the logical stage (these are the defaults)
  fluid: true, maxW: 1400,        // optional: widen to the window, keep the height
  scoreLabel: 'Height',
  controls: [['Drop', 'Space / Click']],
  options: [{ id: 'speed', label: 'Slide speed', def: 'normal',
              choices: [{ v: 'calm', l: 'Calm' }, { v: 'normal', l: 'Normal' }] }],
  front: true,                    // draws its own front page (see below)
  mp: 'race',                     // optional: 'race' | 'duel' | 'arena' | 'party'
  mount(api) {
    // set up; api.entry is 'menu' on the front page and 'play' for a round
    return {
      update(dt) {},              // fixed step, 1/120 s
      render(ctx) {},             // once per frame, in stage units
      destroy() {},               // optional
      resize() {},                // optional: api.W changed (fluid games)
      escape() { return false; }  // optional: true if the game handled Escape
    };
  }
});
```

### The api a game is handed

| member | use |
| --- | --- |
| `input` | `down(code)`, `pressed(code)`, `any(...)`, `pointer`, `takeClick()`, `takeChars()`, `takeSwipe()` |
| `sound`, `fx`, `shake(a)` | the shared `Sound` and `FX`, and screen shake |
| `W`, `H` | the stage size actually in use (a fluid game can be wider than it declared) |
| `opt(id)`, `setOpt(id, v)` | read and write the game's `options` |
| `save(k, v)`, `load(k, def)`, `wipe()` | the game's own persistent scratch space |
| `best()`, `plays()` | the player's personal best and play count |
| `hud(obj)`, `read(k)`, `lit(k)` | hand the shell the current readouts, and read them back with change flashes |
| `gameOver({ score, title, message, stats, win, sting })` | end the round; the shell shows the ledger (`sting: false` if the game already played its own ending sound) |
| `entry`, `fromMenu`, `carry` | how this mount began (front page, round, or a round started from it) |
| `play(o)`, `menu()`, `hub()` | start from the front page, go back to it, leave to the hub |
| `party`, `openParty()`, `covered` | party state, the party panel, and whether a shell overlay has the keys |
| `buyCrate(slot, after)` | buy and open a cosmetics crate from a front page |
| `suspend(v)`, `paused` | stop the clock without the pause card |

### Front pages

A game with `front: true` opens on a main menu that it draws itself. `FrontKit`
(`core/frontkit.js`) supplies the buttons, the option chips, Play, Friends and
Escape. `FrontLocker` (`core/locker.js`) adds Customize and Shop for games that
have cosmetics. The header of each file shows the calls to make from
`update()` and `render()`, and `games/stack.js` is a short, complete example.

### Results pages

When a round ends the shell builds the results (verdict, stats, every coin
paid, the level bar, a race's standings) and, if the game's instance has
`results(R)`, hands them to the game to draw in its own look instead of
showing the generic card. `FrontKit` keeps the timing, sounds and keys:
`FK.showResults(R)`, then read `FK.rs()`, `FK.count()`, `FK.ledger()` or lay
the page out with `FK.resultsPage(ctx, W, H, theme)`. A game that draws its own
front page can take the kit for results alone with `FrontKit(api, { menu: false })`
(Crossy Road; All In builds its page in the DOM on the same timeline). For
pixel lettering that must stay sharp on the scaled stage, pass `crisp: true`
to `Hud.pix`, and fade outlined text with `FK.layer` rather than `alpha`.

### Online

A game declares how it plays online with `mp`. `race` games all run the same
seed and compare results: read `getRace(id)` and post progress. `duel`,
`arena` and `party` games are run by the host, and guests send input: read
`getSession(id)`. `core/net.js` has the helpers, and `shell/multiplayer.js`
has the transport.

## Embedding a Unity build

Put the WebGL build beside `games.html` and add a row to `UNITY_GAMES` in
`src/js/shell/embed.js`:

```js
{ id: 'kart', title: 'Kart Rush', tagline: 'Three laps, no brakes.',
  tags: ['Unity', 'Racing'], src: 'unity/kart/index.html' }
```

The build runs in an iframe and talks to the page with `postMessage`. From
the build to the page:

| message | fields |
| --- | --- |
| `arcade:ready` | none. Dismisses the loader |
| `arcade:score` | `score`, `hud?` |
| `arcade:hud` | `hud: { Label: value }` |
| `arcade:gameover` | `score`, `title?`, `message?`, `win?`, `stats?` |
| `arcade:pauseReq` | `paused` |

The page sends back `arcade:hello` (`player`, `game`, `best`) once the build
is ready, plus `arcade:pause`, `arcade:resume` and `arcade:stop`. In Unity, a
`.jslib` plugin posts to the page, for example:

```js
mergeInto(LibraryManager.library, {
  ArcadeScore: function (score) { window.parent.postMessage({ type: 'arcade:score', score: score }, '*'); },
  ArcadeGameOver: function (score) { window.parent.postMessage({ type: 'arcade:gameover', score: score }, '*'); }
});
```

Unity WebGL fetches its data at runtime, so it only works over http, not from
`file://`.

## Conventions

- Plain browser JavaScript in one shared scope: no modules, no bundler, no
  dependencies. A file sees everything declared before it in the manifest.
  Code inside functions can use anything, whenever it runs.
- Two-space indent. Comments say *why*, in full sentences, next to the code
  they explain.
- Stylesheets are layered, and later files win. `hub-v4.css` is the current
  look for the hub, the leaderboards and the party panel, and it comes last on
  purpose. `horizon.css` dresses golf and pool.
- Game-facing names (`api`, `registerGame`, `FrontKit`, `Hud`, `Gfx3D`) are
  the contract between the games and the shell. Change them in both places.
