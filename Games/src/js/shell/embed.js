/* ============================================================================
   EMBEDDED BUILDS — Unity WebGL, and anything else that ships as its own page

   A canvas game hands the shell an update/render pair and the shell drives it.
   An embedded build cannot work that way: it owns a whole document, its own
   loop and its own canvas. So it gets the stage instead, and the two halves
   talk over postMessage.

   Everything around the game still belongs to the shell — the start panel,
   options, pause, the end card, personal bests, the cloud score push and the
   leaderboard — because the build reports through the same api.gameOver() a
   native game calls. Nothing downstream knows the difference.

   Messages the build may send to window.parent (all {type, ...} objects):
     arcade:ready                              build is up; dismisses the loader
     arcade:score     {score, hud?}            live score / HUD readouts
     arcade:hud       {hud:{Label:value,...}}  HUD only
     arcade:gameover  {score, title?, message?, win?, stats?[{label,value}]}
     arcade:pauseReq  {paused:true|false}      the build's own pause key

   Messages the shell sends into the build:
     arcade:hello   {player, game, best}       once, after arcade:ready
     arcade:pause / arcade:resume              the shell paused or resumed
     arcade:stop                               leaving; save and shut down

   Both directions target '*' and filter by source window rather than by
   origin: a build served from a file:// path or a blob has an origin of
   "null" that no allow-list can usefully match. Only messages from the exact
   frame we launched are read, and only the arcade: names listed above.
   ========================================================================== */
const Embed = (() => {
  let frame = null, def = null, shell = null;
  let ready = false, score = 0, extraHud = null, loadTimer = 0;

  const post = m => { try { if (frame && frame.contentWindow) frame.contentWindow.postMessage(m, '*'); } catch (e) {} };

  function loader(state, text) {
    const box = el('embedLoad'); if (!box) return;
    box.classList.toggle('gone', state === 'gone');
    if (!text) return;
    const b = box.querySelector('b'), hint = box.querySelector('.hint');
    if (b) b.textContent = text.head;
    if (hint) hint.textContent = text.body;
  }

  function paintHud() {
    if (!shell) return;
    const h = {};
    h[(def && def.scoreLabel) || 'Score'] = score;
    if (extraHud) for (const k in extraHud) h[k] = extraHud[k];
    shell.hud(h);
  }

  function onMessage(e) {
    if (!frame || !def || !e.source || e.source !== frame.contentWindow) return;
    const d = e.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string' || d.type.indexOf('arcade:') !== 0) return;
    switch (d.type) {
      case 'arcade:ready': {
        ready = true;
        clearTimeout(loadTimer);
        loader('gone');
        let who = '';
        try { who = MP.myName; } catch (x) {}
        post({ type: 'arcade:hello', game: def.id, player: who, best: Store.best(def.id) || 0 });
        break;
      }
      case 'arcade:hud':
        extraHud = (d.hud && typeof d.hud === 'object') ? d.hud : null;
        paintHud();
        break;
      case 'arcade:score': {
        const n = Number(d.score);
        if (isFinite(n)) score = Math.max(0, Math.round(n));
        if (d.hud && typeof d.hud === 'object') extraHud = d.hud;
        paintHud();
        break;
      }
      case 'arcade:pauseReq':
        /* the build has its own pause key; mirror it, so one press never
           leaves the two sides disagreeing about who is paused */
        if (d.paused) { if (!paused) pause(); } else if (paused) resume();
        break;
      case 'arcade:gameover': {
        const n = Number(d.score);
        if (isFinite(n)) score = Math.max(0, Math.round(n));
        const stats = Array.isArray(d.stats)
          ? d.stats.slice(0, 4).filter(s => s && s.label != null)
              .map(s => ({ label: String(s.label).slice(0, 24), value: String(s.value).slice(0, 16) }))
          : [];
        shell.gameOver({
          score: score,
          win: !!d.win,
          title: d.title ? String(d.title).slice(0, 48) : undefined,
          message: d.message ? String(d.message).slice(0, 120) : undefined,
          stats: stats
        });
        break;
      }
    }
  }

  /* This is what a registered build's mount() resolves to, so an embedded
     game travels the identical start / pause / restart path as a canvas one. */
  function mount(d, api) {
    def = d; shell = api; ready = false; score = 0; extraHud = null;
    frame = el('embedFrame');
    document.body.classList.add('embed-live');
    loader('shown', { head: 'Loading ' + d.title + '...', body: '' });
    addEventListener('message', onMessage);
    /* a fresh document on every start, so "Play again" really restarts the
       build instead of resuming whatever state it was left in */
    frame.src = 'about:blank';
    frame.src = d.src;
    paintHud();
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (ready) return;
      loader('shown', {
        head: 'This build is not answering.',
        body: 'It either has not finished loading, or it never sent arcade:ready. ' +
              'Unity WebGL cannot run from a file:// path — serve this page over ' +
              'http://localhost and check the console inside the frame.'
      });
    }, 20000);

    return {
      /* no update(): the build runs its own loop. The shell keeps stepping so
         pause, the HUD and the end card behave exactly as they do elsewhere. */
      resize() { post({ type: 'arcade:resize' }); },
      destroy() {
        clearTimeout(loadTimer);
        removeEventListener('message', onMessage);
        post({ type: 'arcade:stop' });
        try { frame.src = 'about:blank'; } catch (e) {}   // stops its loop and its audio
        document.body.classList.remove('embed-live');
        frame = null; def = null; shell = null; ready = false;
      }
    };
  }

  return {
    mount,
    /* the shell's pause()/resume() call this so the build can stop its clock */
    signal(what) { if (frame) post({ type: 'arcade:' + what }); }
  };
})();

/* Tile art for a build that does not ship its own — a plain readable plate
   rather than a hole in the grid. */
function embedArt(title, hue) {
  const h = hue == null ? 232 : hue;
  const ini = String(title || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  return '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">' +
    '<defs><linearGradient id="eg' + h + '" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="hsl(' + h + ' 62% 34%)"/>' +
    '<stop offset="1" stop-color="hsl(' + ((h + 40) % 360) + ' 58% 14%)"/></linearGradient></defs>' +
    '<rect width="320" height="180" fill="url(#eg' + h + ')"/>' +
    '<g fill="#fff" opacity=".07"><circle cx="52" cy="40" r="70"/><circle cx="280" cy="160" r="58"/></g>' +
    '<text x="160" y="98" font-size="52" font-weight="700" text-anchor="middle" ' +
    'font-family="ui-sans-serif,system-ui,sans-serif" fill="#fff" opacity=".92">' + ini + '</text>' +
    '<text x="160" y="130" font-size="13" letter-spacing="3" text-anchor="middle" ' +
    'font-family="ui-sans-serif,system-ui,sans-serif" fill="#fff" opacity=".55">UNITY</text></svg>';
}

/* ---- Unity WebGL builds -------------------------------------------------
   Drop a build beside games.html and add a row below. `src` is the index.html
   Unity writes next to its Build/ and TemplateData/ folders — a relative path
   or a full URL, both work.

     { id:'kart', title:'Kart Rush', tagline:'Three laps, no brakes.',
       tags:['Unity','Racing'], src:'unity/kart/index.html',
       controls:[['Steer','&larr; &rarr;']], art:'<svg ...>' }

   Only id, title and src are required; embedArt() covers a missing tile.

   Unity WebGL fetches its .data and .wasm at runtime, so it cannot run from a
   file:// path — this page has to be served over http (localhost is fine).
   README.md ("Embedding a Unity build") has the build settings and the
   messages a build sends to report its score.

   Builds are listed here rather than inline so adding one is a single row and
   never touches the engine. */
const UNITY_GAMES = [
  // { id:'kart', title:'Kart Rush', tagline:'Three laps, no brakes.',
  //   tags:['Unity','Racing'], src:'unity/kart/index.html' },
];

function registerUnityGame(d) {
  if (!d || !d.id || !d.src) return;
  registerGame({
    id: d.id,
    title: d.title || d.id,
    tagline: d.tagline || 'A Unity build.',
    tags: (d.tags && d.tags.length) ? d.tags : ['Unity'],
    scoreLabel: d.scoreLabel || 'Score',
    controls: d.controls || [['Pause', 'the Pause button in the bar']],
    art: d.art || embedArt(d.title || d.id, d.hue),
    kind: 'embed',
    src: d.src,
    w: d.w || 960, h: d.h || 600,
    mount(api) { return Embed.mount(this, api); }
  });
}
UNITY_GAMES.forEach(registerUnityGame);

