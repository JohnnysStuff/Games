/* ============================================================================
   UPDATES — the page asks whether there is a newer copy of itself, and says
   what changed when there was.

   The arcade is a file people keep and open from their own disk, so there is
   no server that can hand them a new version. Instead each copy knows its own
   version (the top entry of CHANGELOG, release.js) and fetches one small file
   published next to the latest games.html — version.json — to learn the
   newest. A page opened from file:// may fetch from the web like any other,
   as long as the host answers every origin (Supabase Storage does, the null
   origin of a local file included), so a newer version becomes an offer to
   download it. Offline, or before anything is published, the check fails
   quietly and nothing is shown.

   A page cannot rewrite the file it was opened from. Where the browser has
   the File System Access API (Chrome, Edge) the player can save the new copy
   straight over the old one and reload into it; everywhere else it lands in
   Downloads and they open that one instead.

   The first time someone opens a new version, the "What's new" sheet lists
   every entry newer than the last version they saw. The version chip in the
   header reopens it at any time, and turns into an update button while there
   is one to get. Nothing here ever interrupts a game: offers wait for the
   hub, and What's new waits until the player has signed in.
   ========================================================================== */
const Updates = (() => {
  /* Where the newest copy is published. For trying a release before it is
     published, a tab can point itself elsewhere for as long as it stays open:
     sessionStorage.arcadeUpdateBase = 'http://localhost:8802/release/' */
  const HOME = 'https://mbkiuybrzplgqhsdixjh.supabase.co/storage/v1/object/public/releases/';
  const SEEN = 'arcadeSeenVersion';
  const VERSION = CHANGELOG[0].version;
  const RECHECK = 30 * 60 * 1000;

  const base = () => { try { return sessionStorage.getItem('arcadeUpdateBase') || HOME; } catch (e) { return HOME; } };
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const nums = v => String(v).split('.').map(n => parseInt(n, 10) || 0);
  function cmp(a, b) {
    const x = nums(a), y = nums(b);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  }
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  function day(d) {
    const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d || '');
    if (!m) return '';
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  }
  /* what the page was saved as, so a new copy can go over it by name */
  function fileName() {
    let n = '';
    try { n = decodeURIComponent(location.pathname.split('/').pop() || ''); } catch (e) {}
    return /\.html?$/i.test(n) ? n : 'games.html';
  }

  let latest = null;              // version.json, once it names something newer than this
  let waiting = [];               // sheets queued for when the hub is free: 'update', 'news'
  let later = '';                 // the version "Later" was pressed on, this session
  let newsSince = null;           // What's new lists the entries newer than this
  let open = '';                  // what the sheet is showing: '' | 'news' | 'update'
  let stage = 'offer';            // offer, fetching, ready, replaced, saved, failed
  let got = null;                 // the downloaded copy, as a Blob
  let pct = 0, why = '';

  /* ------------------------------------------------------------ the check */
  async function check() {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    try {
      /* the query string misses every cache between here and the file */
      const res = await fetch(base() + 'version.json?t=' + Date.now(), { cache: 'no-store', signal: ctl.signal });
      if (!res.ok) return;
      const j = await res.json();
      if (!j || typeof j.version !== 'string' || cmp(j.version, VERSION) <= 0) return;
      const fresh = !latest || cmp(j.version, latest.version) > 0;
      latest = j;
      chip();
      if (fresh && later !== j.version) want('update');
    } catch (e) {
      /* offline, not published yet, or the host is down: say nothing */
    } finally { clearTimeout(t); }
  }

  /* --------------------------------------------------------- when to show */
  function want(k) { if (waiting.indexOf(k) < 0) waiting.push(k); waiting.sort((a, b) => (a === 'update' ? -1 : 0) - (b === 'update' ? -1 : 0)); }
  const busyWith = ['pfOv', 'keysOv', 'cmdOv', 'lbOv', 'mpov', 'cheatOv'];
  function free(k) {
    const b = document.body.classList;
    if (b.contains('booting') || b.contains('in-game')) return false;
    /* What's new is for the hub, so it waits for the sign-in; an update
       offer is worth showing over the sign-in box too */
    if (k === 'news' && b.contains('locked')) return false;
    try { if (Meta.boss.active) return false; } catch (e) {}
    return !busyWith.some(id => { const n = el(id); return n && n.classList.contains('on'); });
  }
  function tick() {
    if (open || !waiting.length || !free(waiting[0])) return;
    const k = waiting.shift();
    if (k === 'update') { if (latest && later !== latest.version) offer(); }
    else news(false);
  }

  /* -------------------------------------------------------------- drawing */
  const ICON = {
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l1.7 4.6 4.6 1.7-4.6 1.7L12 15.8l-1.7-4.6-4.6-1.7 4.6-1.7z"/><path d="M18.4 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    /* the header's own mark, for changes that belong to no one game */
    arcade: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M7.2 6.8h9.6a4.6 4.6 0 0 1 4.5 5.6l-.9 4.3a2.4 2.4 0 0 1-4.1 1.2L14.6 16H9.4l-1.7 1.9a2.4 2.4 0 0 1-4.1-1.2l-.9-4.3a4.6 4.6 0 0 1 4.5-5.6z"/>' +
            '<path d="M8 9.9v3.4M6.3 11.6h3.4" fill="none" stroke="rgba(12,16,34,.62)" stroke-width="1.8" stroke-linecap="round"/>' +
            '<circle cx="15.9" cy="10.6" r="1.15" fill="rgba(12,16,34,.62)"/><circle cx="17.9" cy="12.7" r="1.15" fill="rgba(12,16,34,.62)"/></svg>'
  };
  /* the four kinds of change, in the order a game's card lists them */
  const KINDS = [['added', 'New', 'add'], ['changed', 'Changed', 'chg'], ['removed', 'Removed', 'rem'], ['fixed', 'Fixed', 'fix']];
  const lines = (e, k) => Array.isArray(e[k]) ? e[k] : [];
  /* A line that starts with a game's name ("Crossy Road: ...") is about that
     game, and goes on that game's card under its picture; anything else is
     about the arcade itself. The changelog stays plain lists of lines, so a
     copy from before cards existed still reads the notes of the version that
     replaces it. */
  function cardsOf(e) {
    const cards = new Map();
    for (const [key, label, cls] of KINDS) for (const line of lines(e, key)) {
      const m = /^([^:]{2,40}):\s+([\s\S]+)$/.exec(line);
      const g = m ? GAMES.find(x => x.title.toLowerCase() === m[1].trim().toLowerCase()) : null;
      const k = g ? g.id : '';
      if (!cards.has(k)) cards.set(k, { g, items: [] });
      /* with the game's name taken off, the line starts a sentence of its own */
      cards.get(k).items.push({ label, cls, text: g ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : line });
    }
    /* the arcade first, then each game in the order the notes first name it */
    return [...cards.values()].sort((a, b) => (a.g ? 1 : 0) - (b.g ? 1 : 0));
  }
  const pic = g => g ? '<span class="upd-art">' + (g.art || '') + '</span>'
                     : '<span class="upd-art upd-arcade">' + ICON.arcade + '</span>';
  /* One version: its name, date and a count of what changed, with the games
     it touched; then a card per game. An older version can be folded to its
     one line, and opened if someone wants it. */
  function release(e, expanded) {
    const cards = cardsOf(e);
    const counts = KINDS.map(([key, label, cls]) => [cls, label, lines(e, key).length]).filter(c => c[2]);
    const head = '<div class="upd-vh"><div class="upd-vt">' +
      '<span class="h-cap">Version ' + esc(e.version) + (e.date ? ' · ' + esc(day(e.date)) : '') + '</span>' +
      '<b>' + esc(e.title || 'Version ' + e.version) + '</b>' +
      '<span class="upd-count">' + counts.map(([cls, label, n]) => '<span class="' + cls + '">' + n + ' ' + label.toLowerCase() + '</span>').join('') + '</span>' +
      '</div><span class="upd-stack">' + cards.slice(0, 5).map(c => pic(c.g)).join('') + '</span></div>';
    const body = '<div class="upd-cards">' + cards.map(c =>
      '<section class="upd-game"><header>' + pic(c.g) +
      '<b>' + esc(c.g ? c.g.title : 'Arcade') + '</b>' +
      '<span>' + c.items.length + (c.items.length === 1 ? ' change' : ' changes') + '</span></header><ul>' +
      c.items.map(it => '<li><span class="upd-k ' + it.cls + '">' + it.label + '</span><span class="upd-t">' + esc(it.text) + '</span></li>').join('') +
      '</ul></section>').join('') + '</div>';
    return expanded ? '<article class="upd-v">' + head + body + '</article>'
                    : '<details class="upd-v"><summary>' + head + '</summary>' + body + '</details>';
  }
  function frame(icon, title, sub, body, foot) {
    return '<div class="upd-hd h-ph"><span class="h-ic">' + icon + '</span><div><h2 id="updTitle">' + title + '</h2><p>' + sub + '</p></div>' +
           '<span class="sp"></span><button class="h-x" data-upd="close" aria-label="Close">' + ICON.x + '</button></div>' +
           '<div class="upd-body">' + body + '</div><div class="upd-ft">' + foot + '</div>';
  }
  const btn = (act, label, pri, extra) => '<button class="upd-btn' + (pri ? ' pri' : '') + '" data-upd="' + act + '"' + (extra || '') + '>' + label + '</button>';
  function show(html, kind) {
    el('updBox').innerHTML = html;
    const ov = el('updOv');
    if (!ov.classList.contains('on')) ov.classList.add('on');
    open = kind;
  }
  function close() {
    if (stage === 'fetching') return;                  // let the download finish or fail first
    el('updOv').classList.remove('on');
    if (open === 'update' && latest && stage === 'offer') later = latest.version;
    open = '';
    chip();
  }

  /* ----------------------------------------------------------- What's new */
  /* Automatically: everything newer than the version they last saw (all of
     it, for someone coming from a copy that never kept track), opened out.
     From the version button: the whole history, newest open and the rest
     folded. */
  function news(all) {
    const fresh = newsSince ? CHANGELOG.filter(e => cmp(e.version, newsSince) > 0) : CHANGELOG;
    const list = all || !fresh.length ? CHANGELOG : fresh;
    const openN = all ? 1 : list.length <= 3 ? list.length : 2;
    stage = 'offer';
    show(frame(ICON.news, "What's new",
      'You are on version ' + esc(VERSION) + ' · ' + (all ? 'every update so far'
        : list.length > 1 ? list.length + ' updates since you last played' : 'here is what changed'),
      list.map((e, i) => release(e, i < openN)).join(''),
      (all && latest ? btn('offer', ICON.down + 'Get version ' + esc(latest.version)) : '') +
      '<span class="sp"></span>' + btn('close', 'Got it', true)), 'news');
    try { const s = localStorage.getItem(SEEN); if (!s || cmp(s, VERSION) < 0) localStorage.setItem(SEEN, VERSION); } catch (e) {}
    newsSince = null;
    chip();
  }

  /* --------------------------------------------------------------- update */
  function offer() {
    if (!latest) return;
    stage = got ? 'ready' : 'offer';
    paintUpdate();
  }
  function paintUpdate() {
    const v = esc(latest.version), notes = Array.isArray(latest.notes) ? latest.notes.filter(e => e && cmp(e.version, VERSION) > 0) : [];
    /* what the new version brings, opened out on the offer and folded away
       once the download itself is the thing to read */
    const list = notes.length ? notes.map((e, i) => release(e, stage === 'offer' && i < 2)).join('')
                              : '<p class="upd-note">Version ' + v + ' is ready to download.</p>';
    const name = esc(fileName());
    let body = list, foot = '';
    if (stage === 'offer') {
      foot = btn('close', 'Later') + '<span class="sp"></span>' + btn('get', ICON.down + 'Download update', true);
    } else if (stage === 'fetching') {
      body = '<p class="upd-note">Downloading version ' + v + (latest.size ? ' (' + mb(latest.size) + ')' : '') + '…</p>' +
             '<div class="upd-bar"><i style="width:' + Math.round(pct * 100) + '%"></i></div>' + list;
      foot = '<span class="upd-small">Keep this window open for a moment.</span><span class="sp"></span>' + btn('get', 'Downloading…', true, ' disabled');
    } else if (stage === 'ready') {
      const over = typeof window.showSaveFilePicker === 'function';
      body = '<div class="upd-ok">' + ICON.done + '<div><b>Version ' + v + ' is downloaded</b><span>' + mb(got.size) + '</span></div></div>' +
             (over
               ? '<p class="upd-note"><b>Replace this file</b> opens a save window: find <b>' + name + '</b>, the file you opened the arcade from, ' +
                 'pick it and choose to replace it. Then reload and you are on the new version.</p>'
               : '<p class="upd-note">It goes to your <b>Downloads</b> folder as <b>' + name + '</b>. Open that file to play the new version, ' +
                 'and you can delete this old one.</p>') + list;
      foot = (over ? btn('dl', 'Save to Downloads') : btn('close', 'Later')) + '<span class="sp"></span>' +
             (over ? btn('over', 'Replace this file', true) : btn('dl', ICON.down + 'Save to Downloads', true));
    } else if (stage === 'replaced') {
      body = '<div class="upd-ok">' + ICON.done + '<div><b>Updated to version ' + v + '</b><span>Reload to start it.</span></div></div>' + list;
      foot = '<span class="sp"></span>' + btn('reload', 'Reload now', true);
    } else if (stage === 'saved') {
      body = '<div class="upd-ok">' + ICON.done + '<div><b>Saved to your Downloads</b><span>' + name + '</span></div></div>' +
             '<p class="upd-note">Close this tab and open the new <b>' + name + '</b> from your Downloads folder. ' +
             'Moving it to where you keep this one, and replacing this one, keeps things tidy.</p>' + list;
      foot = '<span class="sp"></span>' + btn('close', 'Done', true);
    } else {
      body = '<p class="upd-note">The download did not work here' + (why ? ' (' + esc(why) + ')' : '') + '. ' +
             'You can download version ' + v + ' in a new tab instead, then open the file it saves.</p>' + list;
      foot = btn('close', 'Later') + '<span class="sp"></span>' + btn('link', ICON.down + 'Download in a new tab', true);
    }
    show(frame(stage === 'replaced' ? ICON.done : ICON.down, stage === 'replaced' ? 'Update installed' : 'Update available',
      stage === 'replaced' ? 'Saved over ' + name + ' · reload to start version ' + v : 'Version ' + v + ' is out · you have ' + esc(VERSION),
      body, foot), 'update');
  }

  /* Fetched here rather than linked, so it can be saved over the old file and
     checked first: a proxy or a captive portal answering with its own page
     must not be offered as the arcade. */
  async function fetchCopy() {
    const file = latest.file || 'games.html';
    const res = await fetch(base() + file + '?v=' + encodeURIComponent(latest.version), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = latest.size || +res.headers.get('content-length') || 0;
    const parts = [];
    if (res.body && res.body.getReader) {
      const rd = res.body.getReader();
      let n = 0, last = 0;
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        parts.push(value); n += value.length;
        pct = total ? Math.min(.99, n / total) : 0;
        const now = performance.now();
        if (now - last > 90) { last = now; const bar = document.querySelector('#updBox .upd-bar i'); if (bar) bar.style.width = Math.round(pct * 100) + '%'; }
      }
    } else parts.push(new Uint8Array(await res.arrayBuffer()));
    const blob = new Blob(parts, { type: 'text/html' });
    const head = await blob.slice(0, 1024).text();
    if (!/<!DOCTYPE html>/i.test(head) || head.indexOf('name="arcade-version" content="' + latest.version + '"') < 0)
      throw new Error('that was not the arcade');
    return blob;
  }
  async function get() {
    if (stage === 'fetching') return;
    stage = 'fetching'; pct = 0; paintUpdate();
    try { got = await fetchCopy(); stage = 'ready'; }
    catch (e) { why = String(e && e.message || e).slice(0, 80); stage = 'failed'; }
    paintUpdate();
  }
  async function saveOver() {
    try {
      const h = await window.showSaveFilePicker({
        suggestedName: fileName(),
        types: [{ description: 'Arcade page', accept: { 'text/html': ['.html', '.htm'] } }]
      });
      const w = await h.createWritable();
      await w.write(got);
      await w.close();
      stage = 'replaced'; paintUpdate();
    } catch (e) {
      if (e && e.name === 'AbortError') return;        // they closed the save window
      why = String(e && e.message || e).slice(0, 80);
      saveDownload();
    }
  }
  function saveDownload() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(got);
    a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    stage = 'saved'; paintUpdate();
  }
  /* the host names the file itself when asked to, so this is a download and
     not the new page opening from the web (it would not have this page's
     saved progress) */
  function openLink() {
    const file = latest.file || 'games.html';
    window.open(base() + file + '?download=' + encodeURIComponent(fileName()) + '&v=' + encodeURIComponent(latest.version), '_blank', 'noopener');
  }

  /* ------------------------------------------------------------ the chip */
  function chip() {
    const b = el('verBtn'); if (!b) return;
    const upd = !!latest;
    let unseen = false;
    try { const s = localStorage.getItem(SEEN); unseen = !s || cmp(s, VERSION) < 0; } catch (e) {}
    b.classList.toggle('upd', upd);
    b.classList.toggle('new', !upd && unseen);
    const t = el('verTx'); if (t) t.textContent = upd ? 'Update' : "What's new";
    const n = el('verNo'); if (n) n.textContent = upd ? latest.version : VERSION;
    b.title = upd ? 'Version ' + latest.version + ' is out — you have ' + VERSION : "What's new in version " + VERSION;
    b.setAttribute('aria-label', b.title);
  }

  /* ----------------------------------------------------------- wiring ---- */
  function init() {
    const b = el('verBtn');
    if (b) b.onclick = () => { if (latest) offer(); else news(true); };
    const ov = el('updOv');
    ov.addEventListener('click', e => {
      if (e.target === ov) { close(); return; }
      const t = e.target.closest('[data-upd]'); if (!t || t.disabled) return;
      const a = t.dataset.upd;
      if (a === 'close') close();
      else if (a === 'offer') offer();
      else if (a === 'get') get();
      else if (a === 'over') saveOver();
      else if (a === 'dl') saveDownload();
      else if (a === 'link') openLink();
      else if (a === 'reload') location.reload();
    });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); close(); }
    }, true);

    /* A player who has played before but has not seen this version gets
       What's new; someone opening the arcade for the very first time does
       not — for them none of it is new. */
    let seen = null, before = false;
    try { seen = localStorage.getItem(SEEN); before = !!localStorage.getItem('arcadeHubV1'); } catch (e) {}
    /* (an older copy opened after a newer one has nothing new to say, and
       must not make the newer one say its piece a second time) */
    if (seen ? cmp(VERSION, seen) > 0 : before) { newsSince = seen; want('news'); }
    else if (!seen) { try { localStorage.setItem(SEEN, VERSION); } catch (e) {} }
    chip();
    setInterval(tick, 700);
    /* after the page has settled, then now and again for a tab left open */
    setTimeout(check, 1500);
    setInterval(() => { if (!document.hidden) check(); }, RECHECK);
  }
  init();

  return {
    version: VERSION,
    news: () => news(true),
    check,
    get latest() { return latest; },
    get open() { return !!open; }
  };
})();
