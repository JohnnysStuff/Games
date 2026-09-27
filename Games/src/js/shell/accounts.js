/* ============================================================================
   ACCOUNTS — username + password, cloud best scores, global leaderboards.

   Passwords are never handled here. Supabase Auth owns them: real server-side
   hashing and rate limiting. A username is mapped to an internal synthetic
   email so Auth's email+password flow can back a username-only interface, and
   the browser only ever sees the session token it hands back.

   Playing needs an account: signed out, the page is the sign-in box and
   nothing else (see locked() below). Everything a player earns still lives
   in localStorage first; best scores are pushed to the cloud on top, for the
   global leaderboards, and friends and parties go through it too.
   ========================================================================== */
const Account = (() => {
  const URL_BASE = 'https://mbkiuybrzplgqhsdixjh.supabase.co';
  const ANON = 'sb_publishable_QV3lljY577P7mMQ6Px1jqw_OWu2c0cV';
  const MAIL_DOMAIN = 'players.arcade.local';        // never receives mail
  const SKEY = 'arcadeSessionV1';
  const IDLE_DAYS = 10;                              // matches purge_inactive()

  let session = null;                                // { access_token, refresh_token, user }
  let profile = null;                                // { id, username }
  let cloudBest = {};                                // gameId -> best
  let busy = false;

  const emailFor = u => String(u).toLowerCase().replace(/[^a-z0-9_.-]/g, '') + '@' + MAIL_DOMAIN;
  const validName = u => /^[a-zA-Z0-9_]{3,16}$/.test(u);

  /* Merging cloud scores changes the best-score badges on the hub tiles, so the
     grid has to be repainted — but only while it is actually on screen. The MP
     module has its own refreshHub(); that one is private to its closure, so
     this calls the global painter directly. */
  function hubRefresh() { if (!cur) renderHub(); }

  /* Usernames are written straight into innerHTML on the leaderboard, and RLS
     lets a signed-in user rewrite their own profile row to anything at all —
     the 3-16 alphanumeric rule is only enforced here in the client. So this
     escape is load-bearing, not decoration. (The other esc() helpers in this
     file are private to their own closures.) */
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC_MAP[c]);

  /* ------------------------------------------------------- transport ---- */
  async function api(path, opts) {
    opts = opts || {};
    const h = Object.assign({
      'apikey': ANON,
      'Content-Type': 'application/json'
    }, opts.headers || {});
    if (session && session.access_token && !opts.noAuth) h['Authorization'] = 'Bearer ' + session.access_token;
    else h['Authorization'] = 'Bearer ' + ANON;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(URL_BASE + path, {
        method: opts.method || 'GET',
        headers: h,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctl.signal
      });
      clearTimeout(timer);
      const txt = await res.text();
      let data = null;
      try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
      if (!res.ok) {
        const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('HTTP ' + res.status);
        throw new Error(msg);
      }
      return data;
    } catch (e) { clearTimeout(timer); throw e; }
  }
  const rpc = (fn, args) => api('/rest/v1/rpc/' + fn, { method: 'POST', body: args || {} });

  /* -------------------------------------------------------- session ----- */
  function saveSession() {
    try {
      if (session) localStorage.setItem(SKEY, JSON.stringify({ r: session.refresh_token }));
      else localStorage.removeItem(SKEY);
    } catch (e) {}
  }
  async function restore() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
    if (!raw || !raw.r) return false;
    try {
      const d = await api('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', noAuth: true, body: { refresh_token: raw.r }
      });
      session = d; saveSession();
      await loadProfile();
      return true;
    } catch (e) { session = null; saveSession(); return false; }
  }
  async function loadProfile() {
    if (!session) return;
    const rows = await api('/rest/v1/profiles?select=id,username&id=eq.' + session.user.id);
    profile = rows && rows[0] ? rows[0] : null;
    if (profile) {
      await pullScores();
      rpc('touch_me').catch(() => {});
    }
  }
  async function pullScores() {
    if (!profile) return;
    const rows = await api('/rest/v1/scores?select=game,best&user_id=eq.' + profile.id);
    cloudBest = {};
    for (const r of rows || []) cloudBest[r.game] = r.best;
    /* whichever side is higher wins, so a local run made while signed out is
       not thrown away and a cloud best is not clobbered by a fresh browser */
    for (const gid in cloudBest) {
      if ((Store.best(gid) || 0) < cloudBest[gid]) { Store.data.best[gid] = cloudBest[gid]; }
    }
    for (const g of GAMES) {
      const local = Store.best(g.id) || 0;
      if (local > (cloudBest[g.id] || 0)) push(g.id, local);
    }
    hubRefresh();
  }

  /* ---------------------------------------------------------- auth ------ */
  async function signUp(username, password) {
    if (!validName(username)) throw new Error('3-16 letters, numbers or underscores.');
    if (String(password).length < 6) throw new Error('Password needs at least 6 characters.');
    const taken = await rpc('username_taken', { name: username });
    if (taken) throw new Error('That username is taken.');
    const d = await api('/auth/v1/signup', {
      method: 'POST', noAuth: true,
      body: { email: emailFor(username), password: String(password) }
    });
    if (!d || !d.access_token) {
      /* projects with e-mail confirmation on won't return a session; these are
         synthetic addresses that can never be confirmed, so say so plainly */
      throw new Error('Sign-ups need e-mail confirmation turned OFF in Supabase (Auth → Providers → Email).');
    }
    session = d; saveSession();
    await api('/rest/v1/profiles', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: { id: session.user.id, username: username }
    });
    await loadProfile();
    return profile;
  }
  async function signIn(username, password) {
    const d = await api('/auth/v1/token?grant_type=password', {
      method: 'POST', noAuth: true,
      body: { email: emailFor(username), password: String(password) }
    });
    session = d; saveSession();
    await loadProfile();
    if (!profile) throw new Error('Account exists but has no profile. Contact whoever runs this.');
    return profile;
  }
  /* A live tab holds a websocket, presence, party membership, chat logs and
     possibly open WebRTC calls, all keyed to this account. Unpicking that by
     hand is a long list of things to get wrong; reloading behind the lock is
     one line and is always correct. */
  function signOut() {
    session = null; profile = null; cloudBest = {};
    saveSession();
    location.hash = '';
    location.reload();
  }
  async function deleteAccount() {
    if (!session || !profile) return;
    /* removing the profile cascades the scores; the auth user is swept up by
       the nightly purge once it stops being seen */
    await api('/rest/v1/profiles?id=eq.' + profile.id, { method: 'DELETE' });
    signOut();
  }

  /* --------------------------------------------------------- scores ----- */
  function push(gid, score) {
    if (!session || !profile) return;
    rpc('submit_score', { p_game: gid, p_score: Math.max(0, Math.round(score) || 0) })
      .then(b => { if (typeof b === 'number') cloudBest[gid] = b; })
      .catch(() => {});
  }
  async function board(gid, limit) {
    try { return await rpc('leaderboard', { p_game: gid, p_limit: limit || 10 }) || []; }
    catch (e) { return []; }
  }

  /* ------------------------------------------------------------ UI ------ */
  let mode = 'in';                                   // 'in' | 'up'
  /* `why` is shown at the top of the panel when the gate turned someone away,
     so the sign-in box never appears without saying what asked for it */
  let gateReason = '';

  /* The lock is the whole product decision: signed out there is no hub, no
     party, no leaderboard — just this box. `locked` ships in the markup so it
     also covers the parse, and it is only ever removed here, once a profile
     actually exists. Everything that could dismiss the panel (✕, scrim click,
     Escape) asks locked() first. */
  const locked = () => document.body.classList.contains('locked');
  function unlock() {
    document.body.classList.remove('locked', 'booting');
    el('acctOv').classList.remove('on');
    gateReason = '';
    try { MP.begin(); } catch (e) {}
    /* the friends list is only meaningful once there is an account, and a
       request that arrived while you were offline should be the first thing
       you hear about */
    try { Friends.begin(); } catch (e) {}
  }

  function open(why) { gateReason = why || ''; el('acctOv').classList.add('on'); paint(); }
  function close() {
    if (locked()) return;                            // no exit without an account
    gateReason = ''; el('acctOv').classList.remove('on');
  }
  function toggle() { el('acctOv').classList.contains('on') ? close() : open(); }

  function paintBtn() {
    const b = el('acctBtn'); if (!b) return;
    b.classList.toggle('signed', !!profile);
    const n = el('acctName');
    if (n) n.textContent = profile ? profile.username : 'Sign in';
    /* your initials, in the same disc everyone else sees you as */
    const a = el('acctAv');
    if (a) {
      const k = profile ? profile.username : '';
      if (a.dataset.k !== k || !a.firstChild) {
        let av = '';
        try { if (profile) av = MP.avatarHtml(profile.username, 30); } catch (e) {}
        a.dataset.k = av ? k : '';
        a.innerHTML = av || HI.user;
      }
    }
    b.title = profile ? ('Signed in as ' + profile.username) : 'Sign in';
    /* the cheat button appears and disappears with the account it belongs to */
    try { Meta.refreshCheatBtn(); } catch (e) {}
  }

  function paint() {
    const p = el('acctPanel'); if (!p) return;
    if (profile) {
      const rows = GAMES.map(g => ({ g: g, v: cloudBest[g.id] || 0 }))
        .filter(r => r.v > 0).sort((a, b) => b.v - a.v);
      p.innerHTML =
        '<div class="acct-head">' + MP.avatarHtml(profile.username, 34) +
          '<div><div class="acct-head-nm" style="font-size:16px;font-weight:640">' + esc(profile.username) + '</div>' +
          '<div style="font-size:11px;color:var(--muted)">signed in · scores saved</div></div>' +
          '<span class="sp"></span><button class="acct-x" id="acctClose">✕</button></div>' +
        '<div class="lb-h">Your best scores</div>' +
        '<div class="acct-rows">' + (rows.length
          ? rows.map(r => '<div class="acct-row"><span class="g">' + esc(r.g.title) + '</span><b>' + fmt(r.v) + '</b></div>').join('')
          : '<div class="lb-empty">No scores saved yet — go play something.</div>') + '</div>' +
        '<button class="acct-go" id="acctOut" style="background:var(--surface-2);color:var(--text)">Sign out</button>' +
        '<button class="acct-danger" id="acctDel">Delete my account</button>' +
        '<p class="acct-note">Accounts are removed after ' + IDLE_DAYS +
          ' days without playing. Signing in resets the clock.</p>';
      el('acctClose').onclick = close;
      el('acctOut').onclick = signOut;            // reloads behind the lock
      el('acctDel').onclick = async () => {
        const b = el('acctDel');
        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Really delete? This cannot be undone'; return; }
        b.disabled = true; b.textContent = 'Deleting…';
        try { await deleteAccount(); } catch (e) { b.disabled = false; b.textContent = 'Delete failed — ' + e.message; }
      };
    } else {
      const up = mode === 'up';
      p.innerHTML =
        '<div class="acct-head"><h2>' + (up ? 'Create an account' : 'Sign in') + '</h2>' +
          '<span class="sp"></span><button class="acct-x" id="acctClose">✕</button></div>' +
        (gateReason ? '<div class="acct-gate">' + esc(gateReason) + '</div>' : '') +
        '<div class="acct-field"><label>Username</label>' +
          '<input class="acct-in" id="acctU" maxlength="16" autocomplete="username" spellcheck="false" placeholder="3-16 characters"></div>' +
        '<div class="acct-field"><label>Password</label>' +
          '<input class="acct-in" id="acctP" type="password" maxlength="64" autocomplete="' +
          (up ? 'new-password' : 'current-password') + '" placeholder="at least 6 characters"></div>' +
        '<div class="acct-hint" id="acctMsg"></div>' +
        '<button class="acct-go" id="acctGo">' + (up ? 'Create account' : 'Sign in') + '</button>' +
        '<div class="acct-alt">' + (up ? 'Already have one? ' : 'No account yet? ') +
          '<button id="acctSwap">' + (up ? 'Sign in' : 'Create one') + '</button></div>' +
        '<p class="acct-note">An account is required — the hub, parties and leaderboards ' +
          'open once you sign in. Your best scores follow you across devices, and the ' +
          'name here is the one everyone else sees. Accounts are removed after ' +
          IDLE_DAYS + ' days without playing — signing in resets the clock.</p>';
      el('acctClose').onclick = close;
      el('acctSwap').onclick = () => { mode = up ? 'in' : 'up'; paint(); };
      el('acctGo').onclick = submit;
      const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } e.stopPropagation(); };
      el('acctU').addEventListener('keydown', onKey);
      el('acctP').addEventListener('keydown', onKey);
      setTimeout(() => { try { el('acctU').focus(); } catch (e) {} }, 50);
    }
    paintBtn();
  }

  async function submit() {
    if (busy) return;
    const u = (el('acctU').value || '').trim();
    const pw = el('acctP').value || '';
    const msg = el('acctMsg'), go = el('acctGo');
    const fail = t => { msg.className = 'acct-hint err'; msg.textContent = t; go.disabled = false; busy = false; };
    msg.className = 'acct-hint'; msg.textContent = '';
    if (!u || !pw) return fail('Fill in both fields.');
    busy = true; go.disabled = true; msg.textContent = 'Working…';
    try {
      if (mode === 'up') await signUp(u, pw); else await signIn(u, pw);
      busy = false; go.disabled = false;
      /* the only place the app becomes visible: unlock, then let the router
         act on whatever deep link was held back at the door */
      unlock();
      paint();
      route();
      MP.toast('Signed in as ' + profile.username);
    } catch (e) {
      const m = String(e.message || e);
      fail(/Invalid login/i.test(m) ? 'Wrong username or password.'
         : /already registered/i.test(m) ? 'That username is taken.'
         : m);
    }
  }

  /* ------------------------------------------------- leaderboards tab ---- */
  /* Its own overlay rather than a block inside the start panel: the panel got
     too tall to fit short screens, and a board you can only reach by opening a
     game was awkward to browse anyway. */
  let lbGame = '';
  let lbSeq = 0;                       // guards against a slow reply for a game
                                       // you already switched away from

  function openBoards(gid) {
    lbGame = gid || lbGame || (GAMES[0] && GAMES[0].id) || '';
    el('lbOv').classList.add('on');
    paintBoards();
  }
  function closeBoards() { el('lbOv').classList.remove('on'); }
  function toggleBoards(gid) {
    el('lbOv').classList.contains('on') ? closeBoards() : openBoards(gid);
  }

  let lbQuery = '';

  /* Only the game list and the board change; the chrome around them does not,
     so it is built once and then only the two panes are repainted. Rebuilding
     the whole panel on every keystroke would throw away the search field's
     focus and caret with it. The list is only rebuilt when the search changes;
     picking a game moves a highlight across it rather than redrawing it. */
  function lbShell() {
    const p = el('lbPanel');
    p.innerHTML =
      '<div class="lbx-hd h-ph"><span class="h-ic gold">' + HI.trophy + '</span>' +
        '<div><h2>Leaderboards</h2><p>The best score each player has set, top 25 per game</p></div>' +
        '<span class="sp"></span><button class="h-x" id="lbClose" aria-label="Close">' + HI.x + '</button></div>' +
      '<div class="lbx-wrap">' +
        '<aside class="lbx-side">' +
          '<div class="lbx-search">' + HI.search + '<input id="lbQ" placeholder="Find a game" spellcheck="false" autocomplete="off"></div>' +
          '<div class="lbx-list" id="lbSide"></div>' +
        '</aside>' +
        '<section class="lbx-main">' +
          '<div class="lbx-ban" id="lbH"></div>' +
          '<div class="lbx-pod" id="lbPod"></div>' +
          '<div class="lbx-rows" id="lbBody"></div>' +
          '<div id="lbYou"></div>' +
        '</section>' +
      '</div>';
    el('lbClose').onclick = closeBoards;
    const q = el('lbQ');
    q.value = lbQuery;
    q.addEventListener('input', () => { lbQuery = q.value.trim().toLowerCase(); paintSide(); });
    q.addEventListener('keydown', e => e.stopPropagation());
    el('lbSide').onclick = e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      if (lbGame === b.getAttribute('data-g')) return;
      lbGame = b.getAttribute('data-g');
      try { Sound.blip(); } catch (_) {}
      markSide(false); paintBoard();
    };
  }

  function paintSide() {
    const side = el('lbSide'); if (!side) return;
    const list = GAMES.filter(x => !lbQuery || plainTitle(x.title).toLowerCase().includes(lbQuery));
    side.innerHTML = '<i class="lbx-ind" id="lbInd"></i>' + (list.length
      ? list.map(x =>
          '<button class="lbx-g" data-g="' + x.id + '" aria-current="' + (x.id === lbGame) + '">' +
          '<span class="lbx-th"><img alt="" loading="lazy" src="' + artUri(x) + '"></span>' +
          '<span class="lbx-gn">' + esc(plainTitle(x.title)) + '</span>' +
          (Store.best(x.id) ? '<span class="lbx-gb">' + fmt(Store.best(x.id)) + '</span>' : '') +
          '</button>').join('')
      : '<div class="lbx-empty"><b>Nothing</b>No game by that name.</div>');
    markSide(true);
  }
  /* the highlight glides to the chosen game; `jump` puts it there at once */
  function markSide(jump) {
    const side = el('lbSide'); if (!side) return;
    let on = null;
    side.querySelectorAll('.lbx-g').forEach(b => {
      const is = b.getAttribute('data-g') === lbGame;
      b.setAttribute('aria-current', String(is));
      if (is) on = b;
    });
    const ind = el('lbInd'); if (!ind) return;
    if (!on) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    if (jump) ind.style.transition = 'none';
    ind.style.height = on.offsetHeight + 'px';
    ind.style.transform = 'translateY(' + on.offsetTop + 'px)';
    if (jump) { void ind.offsetWidth; ind.style.transition = ''; }
    try { on.scrollIntoView({ block: 'nearest', behavior: jump ? 'auto' : 'smooth' }); } catch (e) {}
  }

  async function paintBoard() {
    const seq = ++lbSeq, gid = lbGame, g = byId[gid];
    const ban = el('lbH');
    if (ban && g) ban.innerHTML = '<img alt="" src="' + artUri(g) + '"><div><h3>' + esc(plainTitle(g.title)) + '</h3><span>Top 25 · best score each</span></div>';
    /* the old board dims rather than blanking, so switching never flashes empty */
    const b0 = el('lbBody'), p0 = el('lbPod');
    if (b0) b0.classList.add('dim');
    if (p0) p0.classList.add('dim');
    if (b0 && !b0.children.length) b0.innerHTML = '<div class="lbx-empty"><span class="spinner"></span></div>';
    const you = el('lbYou'); if (you) you.innerHTML = '';

    let rows = null, failed = false;
    try { rows = await board(gid, 25); } catch (e) { failed = true; }
    if (seq !== lbSeq) return;                        // switched games mid-flight
    const b2 = el('lbBody'), p2 = el('lbPod'); if (!b2 || !p2) return;
    b2.classList.remove('dim'); p2.classList.remove('dim');
    const me = profile && profile.username;
    const av = (n, s) => { try { return MP.avatarHtml(n, s); } catch (e) { return ''; } };
    if (failed) {
      p2.innerHTML = '';
      b2.innerHTML = '<div class="lbx-empty"><b>Can’t reach the board</b>Check your connection, then open it again.</div>';
    } else if (!rows.length) {
      p2.innerHTML = '';
      b2.innerHTML = '<div class="lbx-empty"><b>Nobody yet</b>Set the first score here and the top spot is yours.</div>';
    } else {
      /* the top three on a podium, second and third either side of first */
      const top = rows.slice(0, 3);
      p2.innerHTML = [top[1], top[0], top[2]].map(r => {
        if (!r) return '<div></div>';
        const place = rows.indexOf(r) + 1;
        return '<div class="lbx-p p' + place + (r.username === me ? ' me' : '') + '"><span class="lbx-med">' + place + '</span>' +
          av(r.username, place === 1 ? 52 : 42) + '<span class="nm">' + esc(r.username) + '</span><span class="sc">' + fmt(r.best) + '</span></div>';
      }).join('');
      b2.innerHTML = rows.slice(3).map((r, i) =>
        '<div class="lbx-r' + (r.username === me ? ' me' : '') + '" style="--i:' + i + '"><span class="r">' + (i + 4) + '</span>' +
        av(r.username, 28) + '<span class="n">' + esc(r.username) + '</span><span class="v">' + fmt(r.best) + '</span></div>').join('');
    }

    /* Where you actually placed, stated once, whether or not you made the cut. */
    const y = el('lbYou'); if (!y || failed) return;
    const mine = Store.best(gid);
    if (!me) { y.innerHTML = '<div class="lbx-you">Sign in to see your place here</div>'; return; }
    const at = rows.findIndex(r => r.username === me);
    if (at >= 0) y.innerHTML = '<div class="lbx-you in">Your place<b>#' + (at + 1) + ' · ' + fmt(rows[at].best) + '</b></div>';
    else if (mine > 0) y.innerHTML = '<div class="lbx-you">Your best, outside the top 25<b>' + fmt(mine) + '</b></div>';
    else y.innerHTML = '<div class="lbx-you">You haven’t scored here yet</div>';
  }

  function paintBoards() { lbShell(); paintSide(); paintBoard(); }

  /* ---------------------------------------------------------- boot ------ */
  function init() {
    if (el('acctBtn')) el('acctBtn').onclick = toggle;
    /* both of these route through close(), which refuses while the gate is up */
    if (el('acctOv')) el('acctOv').addEventListener('click', e => { if (e.target === el('acctOv')) close(); });
    /* opened from inside a game it lands on that game's board, otherwise the
       first one — the chips switch between them either way */
    if (el('lbBtn')) el('lbBtn').onclick = () => toggleBoards(cur ? cur.id : null);
    if (el('lbOv')) el('lbOv').addEventListener('click', e => { if (e.target === el('lbOv')) closeBoards(); });
    addEventListener('keydown', e => {
      if (e.code !== 'Escape') return;
      /* topmost overlay first, and only one closes per press */
      if (el('lbOv') && el('lbOv').classList.contains('on')) { e.preventDefault(); closeBoards(); return; }
      if (el('acctOv') && el('acctOv').classList.contains('on')) { e.preventDefault(); close(); }
    });
    /* The gate's verdict is only knowable after the stored session resolves,
       so the lock stays on and the form stays hidden ('booting') until it
       does — otherwise a returning player watches the sign-in box flash past
       on every reload. A deep link is held by route() the same way. */
    restore()
      .catch(() => {})
      .then(() => {
        document.body.classList.remove('booting');
        paintBtn();
        if (profile) { unlock(); route(); }
        else open('Create an account, or sign in, to get in.');
      });
    /* keep the account alive while someone is actually playing */
    setInterval(() => { if (profile && !document.hidden) rpc('touch_me').catch(() => {}); }, 5 * 60 * 1000);
  }
  init();

  return {
    get user() { return profile; },
    get signedIn() { return !!profile; },
    open, close, toggle, push, board, paintBtn, rpc,
    openBoards, closeBoards, toggleBoards,
    best: gid => cloudBest[gid] || 0
  };
})();

  /* ========================================================== FRIENDS ======
     A friends list, presence, and a direct message thread per friend.

     The list and the requests are the only things that must survive being
     offline, so they are the only things that touch the database — through
     the same security-definer RPCs the leaderboard uses, because a browser
     holding the anon key must not be able to read the friends table directly.

     Messages ride the realtime socket instead. That means a conversation is
     live only: what is said while you are both here is delivered instantly,
     and nothing is kept afterwards. Say so in the UI rather than letting
     someone assume a message will be waiting tomorrow.
     ========================================================================== */
  /* ========================================================== FRIENDS ======
     A friends list, live presence, and party invites, living inside the party
     panel because that is where you go when you want to play with someone.

     The list and the requests are the only things that must survive being
     offline, so they are the only things that touch the database — through
     the same security-definer RPCs the leaderboard uses, because a browser
     holding the anon key must not be able to read the friends table directly.

     Presence and invites ride the realtime socket instead. Presence is read
     straight off the shared online channel every second and written into the
     existing dots, rather than rebuilding the list — a list that rebuilds
     under you is a list you cannot type into.
     ========================================================================== */
  const Friends = (() => {
    let rows = [];              // whatever friend_list() last returned
    let ready = false;          // has the schema been installed?
    let missing = false;        // the RPCs are absent — show the setup note
    let loading = false;
    let hostEl = null;          // the container currently showing the pane
    let invChan = null;

    const rpcOf = (fn, args) => Account.rpc(fn, args);
    const myUid = () => (Account.user && Account.user.id) || '';


    async function refresh(quiet) {
      if (loading) return;
      loading = true;
      try {
        const out = await rpcOf('friend_list', {});
        rows = Array.isArray(out) ? out : [];
        ready = true; missing = false;
      } catch (e) {
        /* PostgREST answers a call to a function that was never created with
           PGRST202 / "Could not find the function", which is the signal that
           the migration has not been run — as opposed to a network blip. */
        const m = String((e && e.message) || '');
        if (/PGRST202|not find|does not exist|schema cache|function|404/i.test(m)) missing = true;
        rows = [];
      }
      loading = false;
      if (!quiet) paint();
      badge();
    }

    /* Requests that arrived while you were away are the whole point of storing
       them, so the first load after signing in says so out loud. */
    function announcePending() {
      const waiting = rows.filter(r => r.state === 'pending' && r.incoming && !r.seen);
      if (!waiting.length) return;
      Meta.toast(
        waiting.length === 1 ? 'Friend request' : waiting.length + ' friend requests',
        waiting.length === 1 ? waiting[0].username + ' wants to be friends' : 'Open Multiplayer to answer them',
        'gold', 'hands');
      try { Sound.pickup && Sound.pickup(); } catch (e) {}
    }

    const pendingCount = () => rows.filter(r => r.state === 'pending' && r.incoming).length;

    /* The badge belongs on the button that opens the list. It used to sit on
       the level pill, which opens the profile sheet — so a friend request lit
       up the quests tab, which has nothing to do with friends. */
    function badge() {
      const b = el('mpBtn'); if (!b) return;
      const n = pendingCount();
      let dot = b.querySelector('#mpFriendDot');
      if (!n) { if (dot) dot.remove(); return; }
      if (!dot) {
        dot = document.createElement('span');
        dot.id = 'mpFriendDot';
        dot.className = 'mp-alert';
        b.append(dot);
      }
      dot.textContent = n > 9 ? '9+' : String(n);
    }

    /* ------------------------------------------------- party invitations --- */
    /* Every signed-in tab listens on a channel named after its own user id, so
       an invite is a single message to one person rather than a broadcast the
       whole lobby has to filter. */
    function listenForInvites() {
      const me = myUid();
      if (!me || invChan) return;
      try {
        invChan = MP.dmChannel('realtime:inv-' + me).on('inv', p => {
          if (!p || !p.code) return;
          const from = String(p.name || 'A friend').slice(0, 20);
          const inv = { code: String(p.code).slice(0, 8), name: from, at: Date.now() };
          pendingInvite = inv;
          /* Join on the toast takes you straight into that party. It is bound to
             this invite, not whichever arrived last, so an older toast cannot
             put you in a newer party. The Friends tab keeps it too. */
          Meta.toast(from + ' invited you', 'Join their party right now', 'good', 'hands',
                     { label: 'Join', run: () => { pendingInvite = inv; acceptInvite(); } });
          try { Sound.pickup && Sound.pickup(); } catch (e) {}
          paint();
        }).on('fr', () => { refresh(); });
      } catch (e) { invChan = null; }
    }
    let pendingInvite = null;

    function invite(otherId, username) {
      let code = null;
      try { code = MP.inRoom ? MP.partyCode : null; } catch (e) {}
      if (!code) { msg('Start a party first, then invite them.', true); return; }
      try {
        const ch = MP.dmChannel('realtime:inv-' + otherId);
        /* the channel may still be joining; the client queues sends until it is */
        ch.send('inv', { code, name: MP.myName, from: myUid() });
        msg('Invite sent to ' + username + '.', false);
        Sound.blip();
      } catch (e) { msg('Could not send that invite.', true); }
    }

    /* Tell the other person their list changed, so a request or an accept
       appears on their screen now instead of at the next 45-second poll. */
    function nudge(otherId) {
      if (!otherId) return;
      try { MP.dmChannel('realtime:inv-' + otherId).send('fr', { from: myUid() }); } catch (e) {}
    }

    function acceptInvite() {
      if (!pendingInvite) return;
      const c = pendingInvite.code;
      pendingInvite = null;
      try { MP.joinByCode(c); } catch (e) {}
      paint();
    }

    /* -------------------------------------------------------------- UI ---- */
    function setupHTML() {
      return '<div class="fr-setup">' +
        '<b>Friends aren’t switched on yet</b>' +
        '<span>The database needs five small functions before this tab can do anything. ' +
        'Run <code>friends-setup.sql</code> (next to games.html) once in the Supabase SQL editor, ' +
        'then reload.</span>' +
        '<button class="h-sec" id="frRetry" style="margin-top:12px;height:40px">Check again</button></div>';
    }
    const avOf = (name, sz) => { try { return MP.avatarHtml(name, sz); } catch (e) { return ''; } };

    /* Who is online is not part of the markup. It changes all the time, and
       if it were, every change would rebuild the list and replay its motion;
       instead the dots are switched in place (refreshDots), CSS floats the
       friends whose dot is lit to the top, and shows Invite on them. */
    function rowHTML(r, i) {
      let inParty = false;
      try { inParty = !!MP.inRoom; } catch (e) {}
      const k = esc2(String(r.username).toLowerCase());
      return '<div class="frx-r" data-fid="' + esc2(r.other_id) + '" style="--i:' + (i || 0) + '">' +
        '<span class="frx-av">' + avOf(r.username, 40) + '<span class="fr-dot" data-dot="' + k + '"></span></span>' +
        '<span class="frx-t"><span class="fr-n">' + esc2(r.username) + '</span><span class="fr-s" data-st="' + k + '">Offline</span></span>' +
        (inParty ? '<button class="fr-inv" data-inv="' + esc2(r.other_id) + '" data-un="' + esc2(r.username) + '">Invite</button>' : '') +
        '<button class="fr-x" data-unfriend="' + esc2(r.id) + '" title="Remove friend" aria-label="Remove ' + esc2(r.username) + '">' + HI.x + '</button>' +
        '</div>';
    }

    function bodyHTML() {
      if (missing) return setupHTML();
      if (!ready && loading) return '<div class="frx-empty"><span class="spinner"></span>Loading your friends…</div>';

      const incoming = rows.filter(r => r.state === 'pending' && r.incoming);
      const outgoing = rows.filter(r => r.state === 'pending' && !r.incoming);
      const mates = rows.filter(r => r.state === 'accepted').sort((a, b) => a.username.localeCompare(b.username));

      let h = '';
      if (pendingInvite) {
        h += '<div class="frx-inv"><span class="h-ic" style="background:rgba(255,255,255,.2);box-shadow:none">' + HI.mail + '</span>' +
          '<span class="frx-t"><span class="fr-n">' + esc2(pendingInvite.name) + ' invited you</span><span class="fr-s">Join their party?</span></span>' +
          '<button class="h-mini ok" id="frAccept">Join</button>' +
          '<button class="h-mini no" id="frDecline">No</button></div>';
      }

      h += '<form class="frx-add" id="frAdd" autocomplete="off">' +
        '<span class="fi">' + HI.userPlus + '<input class="mp-input" id="frName" placeholder="Add a friend by username" spellcheck="false" maxlength="16" autocomplete="off"></span>' +
        '<button class="h-sec" type="submit">' + HI.plus + 'Add</button></form>' +
        '<div class="fr-msg" id="frMsg"></div>';

      if (incoming.length) {
        h += '<div class="frx-h"><b>Friend requests</b><span class="n">' + incoming.length + '</span></div>';
        incoming.forEach(r => {
          h += '<div class="frx-req">' + avOf(r.username, 36) +
            '<span class="frx-t"><span class="fr-n">' + esc2(r.username) + '</span><span class="fr-s">wants to be your friend</span></span>' +
            '<button class="h-mini ok" data-acc="' + esc2(r.id) + '">Accept</button>' +
            '<button class="h-mini no" data-dec="' + esc2(r.id) + '">Decline</button></div>';
        });
      }
      if (outgoing.length) {
        h += '<div class="frx-h"><b>Waiting on them</b><span class="n">' + outgoing.length + '</span></div>';
        outgoing.forEach(r => {
          h += '<div class="frx-req">' + avOf(r.username, 36) +
            '<span class="frx-t"><span class="fr-n">' + esc2(r.username) + '</span><span class="fr-s">request sent</span></span>' +
            '<button class="h-mini no" data-dec="' + esc2(r.id) + '">Cancel</button></div>';
        });
      }

      h += '<div class="frx-h"><b>Friends</b><span class="n">' + mates.length + '</span></div>';
      h += mates.length
        ? '<div class="frx-list">' + mates.map(rowHTML).join('') + '</div>'
        : '<div class="frx-empty"><b>No friends yet</b>Add someone by their username and they’ll show up here, with a green dot when they’re playing.</div>';

      let inParty = false;
      try { inParty = !!MP.inRoom; } catch (e) {}
      if (mates.length && !inParty) {
        h += '<div class="frx-note">Start a party on the Party tab to invite whoever’s online.</div>';
      }
      /* the same switch as the bell in the header, which a phone has no room for */
      const on = notiOn();
      h += '<div class="frx-bell"><span class="t">Pop up when a friend comes online</span>' +
        '<button class="h-mini ' + (on ? 'ok' : 'no') + '" id="frNoti" aria-pressed="' + on + '">' + (on ? 'On' : 'Off') + '</button></div>';
      return h;
    }

    /* Presence changes constantly, and rebuilding the list to show a dot going
       green would throw away whatever is half-typed in the add box. The dots
       and their labels are written in place instead. */
    /* what a friend is doing, in words: the game they have open, or just here */
    const gameTitle = id => { try { return (id && byId[id] && byId[id].title) || ''; } catch (e) { return ''; } };
    const doing = m => (m ? (gameTitle(m.g) ? 'Playing ' + gameTitle(m.g) : 'Online now') : 'Offline');
    function refreshDots() {
      watchOnline();
      const root = hostEl;
      if (!root || !root.isConnected) return;
      let names = {};
      try { names = MP.onlineNames(); } catch (e) {}
      root.querySelectorAll('[data-dot]').forEach(d => {
        const m = names[d.getAttribute('data-dot')], on = !!m, play = !!(m && gameTitle(m.g));
        if (d.classList.contains('on') !== on) d.classList.toggle('on', on);
        if (d.classList.contains('play') !== play) d.classList.toggle('play', play);
      });
      root.querySelectorAll('[data-st]').forEach(s => {
        const m = names[s.getAttribute('data-st')], t = doing(m), play = !!(m && gameTitle(m.g));
        if (s.textContent !== t) s.textContent = t;
        if (s.classList.contains('play') !== play) s.classList.toggle('play', play);
      });
    }

    /* ---------------------------------------- a friend has come online ---
       Told with a toast, unless the bell in the header is off. Nothing is
       sent for it: every tab already watches the shared online list, so it
       notices a friend arriving by itself. The first look is only a starting
       point (the friends already here when you arrive are not news, and
       neither is anyone first seen after your list loads), and someone has
       to have been gone for a while to be announced again, so a friend
       reloading the page does not count as arriving. */
    const seenOn = {};             // name -> { on, offAt } (offAt 0: gone since before we looked)
    const AWAY_MS = 45000;
    const notiOn = () => Store.getPref('friendNoti') !== 'off';
    function watchOnline() {
      let names, since = 0;
      try { since = MP.onlineSince; names = MP.onlineNames(); } catch (e) { return; }
      if (!names || !since || Date.now() - since < 3000 || !ready) return;
      const t = Date.now();
      for (const r of rows) {
        if (r.state !== 'accepted' || !r.username) continue;
        const k = String(r.username).toLowerCase(), on = !!names[k], s = seenOn[k];
        if (!s) { seenOn[k] = { on, offAt: 0 }; continue; }
        if (on && !s.on) {
          s.on = true;
          if (!s.offAt || t - s.offAt > AWAY_MS) cameOnline(r, names[k]);
        } else if (!on && s.on) { s.on = false; s.offAt = t; }
      }
    }
    function cameOnline(r, m) {
      if (!notiOn()) return;
      let inParty = false;
      try { inParty = !!MP.inRoom; } catch (e) {}
      const g = gameTitle(m && m.g);
      Meta.toast(r.username + ' is online', g ? 'Playing ' + g : inParty ? 'Invite them to your party' : 'Start a party and play together',
                 'good', 'user', inParty ? { label: 'Invite', ms: 8000, run: () => {
                   invite(r.other_id, r.username);
                   try { MP.toast('Invite sent to ' + r.username + '.'); } catch (e) {}
                 } } : undefined);
      try { Sound.blip(); } catch (e) {}
    }

    function mountInto(node) { hostEl = node; paint(true); refresh(); }

    /* A repaint while you are typing is never worth it: the only thing a
       timed repaint adds is presence, and refreshDots() already does that
       without touching the DOM you are typing into. So the rebuild simply
       waits until the box no longer has focus. */
    function typingHere() {
      const a = document.activeElement;
      return !!(a && hostEl && hostEl.contains(a) &&
                (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
    }

    function paint(force) {
      const root = hostEl;
      if (!root || !root.isConnected) return;
      if (!force && typingHere()) { refreshDots(); return; }
      /* only rebuilt when it says something new, so its motion is not replayed */
      const h = bodyHTML();
      if (root.__h !== h) { root.__h = h; root.innerHTML = h; wire(); }
      refreshDots();
    }

    function msg(t, bad) {
      const m = el('frMsg'); if (!m) return;
      m.textContent = t || '';
      m.className = 'fr-msg' + (bad ? ' err' : ' ok');
    }

    function wire() {
      const add = el('frAdd');
      if (add) add.onsubmit = async e => {
        e.preventDefault();
        const box = el('frName');
        const name = (box.value || '').trim();
        if (!name) return;
        msg('Sending…');
        let res = '';
        try { res = await rpcOf('friend_request', { p_username: name }); } catch (err) { res = 'error'; }
        const say = {
          sent: 'Request sent to ' + name + '.',
          accepted: 'You are now friends with ' + name + '.',
          'already-friends': 'You are already friends.',
          'already-pending': 'You have already asked — waiting on them.',
          'no-user': 'Nobody here goes by that name.',
          self: 'That is you.',
          'signed-out': 'Sign in first.'
        }[res] || 'That did not work.';
        const ok = ['sent', 'accepted'].indexOf(res) >= 0;
        if (ok && el('frName')) el('frName').value = '';
        await refresh(true);
        if (ok) {
          const r = rows.find(x => String(x.username || '').toLowerCase() === name.toLowerCase());
          if (r) nudge(r.other_id);
        }
        paint(true);
        msg(say, !ok);
      };
      if (el('frRetry')) el('frRetry').onclick = () => { missing = false; ready = false; refresh(); };
      if (el('frNoti')) el('frNoti').onclick = () => { try { toggleNoti(); } catch (e) {} };
      if (el('frAccept')) el('frAccept').onclick = acceptInvite;
      if (el('frDecline')) el('frDecline').onclick = () => { pendingInvite = null; paint(true); };
      /* the shell gives Enter to global chat, so this input keeps its own */
      if (el('frName')) el('frName').addEventListener('keydown', e => e.stopPropagation());
    }

    /* one delegated handler, because the list is rebuilt whenever it changes */
    document.addEventListener('click', async e => {
      const acc = e.target.closest('[data-acc]');
      const dec = e.target.closest('[data-dec]');
      const unf = e.target.closest('[data-unfriend]');
      const inv = e.target.closest('[data-inv]');
      const other = id => { const r = rows.find(x => String(x.id) === String(id)); return r && r.other_id; };
      if (acc) { const id = acc.getAttribute('data-acc'), o = other(id); await rpcOf('friend_respond', { p_id: id, p_accept: true }).catch(() => {}); nudge(o); refresh(); return; }
      if (dec) { const id = dec.getAttribute('data-dec'), o = other(id); await rpcOf('friend_respond', { p_id: id, p_accept: false }).catch(() => {}); nudge(o); refresh(); return; }
      if (unf) { const id = unf.getAttribute('data-unfriend'), o = other(id); await rpcOf('friend_remove', { p_id: id }).catch(() => {}); nudge(o); refresh(); return; }
      if (inv) { invite(inv.getAttribute('data-inv'), inv.getAttribute('data-un')); return; }
    });

    const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* Signing in is the moment an offline request becomes visible, so the
       first load happens then rather than on a timer. */
    async function begin() {
      await refresh(true);
      announcePending();
      badge();
      listenForInvites();
      setInterval(() => refresh(true), 45000);
      /* presence is cheap and in-place, so it can run often */
      setInterval(refreshDots, 1000);
      /* the full rebuild is rarer and yields to whatever you are typing */
      setInterval(() => paint(), 6000);
    }

    async function markSeen() {
      try { await rpcOf('friend_mark_seen', {}); } catch (e) {}
      rows.forEach(r => { r.seen = true; });
      badge();
    }

    return {
      begin, refresh, paint, mountInto, bodyHTML, markSeen, badge, refreshDots,
      get pending() { return pendingCount(); }
    };
  })();


