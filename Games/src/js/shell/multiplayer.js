/* ============================================================================
   MULTIPLAYER — Supabase Realtime (hand-rolled Phoenix channel client)
   One party, one code. Two play models, named by each game's `mp`:
     · authoritative — the host simulates, guests send input
                       (duel: chess, pool · arena: pac-man, paper.io ·
                        party: skribbl)
     · shared match  — race: everyone runs the same seed and waits for each
                       other (flappy, breakout, golf, wordle, block blast,
                       geometry dash, crossy road, all in)
   ========================================================================== */
const MP = (() => {
  const cfg = {
    url: 'https://mbkiuybrzplgqhsdixjh.supabase.co',
    key: 'sb_publishable_QV3lljY577P7mMQ6Px1jqw_OWu2c0cV'
  };
  const ADJ = ['Swift', 'Brave', 'Lucky', 'Clever', 'Mighty', 'Sneaky', 'Turbo', 'Cosmic', 'Frosty', 'Blazing', 'Shadow', 'Golden', 'Electric', 'Wild', 'Silent', 'Rapid', 'Neon', 'Iron'];
  const ANI = ['Falcon', 'Tiger', 'Panda', 'Wolf', 'Otter', 'Hawk', 'Fox', 'Bear', 'Viper', 'Raven', 'Lynx', 'Shark', 'Moose', 'Cobra', 'Eagle', 'Badger', 'Gecko', 'Orca'];
  const genName = () => pick(ADJ) + ' ' + pick(ANI);
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const CODE_A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I/O/0/1 — codes get read aloud
  const genCode = () => { let s = ''; for (let i = 0; i < 5; i++) s += CODE_A[(Math.random() * CODE_A.length) | 0]; return s; };
  const escAll = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const esc = s => escAll(String(s == null ? '' : s).slice(0, 40));        // names: never longer than this
  const now = () => Date.now();

  /* The id is per-tab and permanent. The *name* is not the tab's to choose:
     everyone — party roster, chat, call tiles, matchmaking — sees the account
     username and nothing else. Account is declared below this module, so
     during load it is still in its temporal dead zone and reading it throws
     rather than returning undefined; hence the catch. genName() is a
     last-resort placeholder that the sign-in gate keeps off the wire. */
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  let myId = ss('arcadeMpId');
  if (!myId) { myId = uuid().slice(0, 10); ss('arcadeMpId', myId); }
  const placeholder = genName();
  function acctName() { try { return (Account.user && Account.user.username) || ''; } catch (e) { return ''; } }
  const myName = () => acctName() || placeholder;

  const hue = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
  const avatar = (name, sz) => {
    const ini = esc(String(name || '?').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase());
    /* two tones of the name's own hue, so a disc reads as a thing rather than a swatch */
    const h = hue(String(name || '?'));
    return '<span class="av" style="width:' + sz + 'px;height:' + sz + 'px;font-size:' + (sz * .38).toFixed(1) + 'px;background:linear-gradient(140deg,hsl(' + h +
      ' 76% 62%),hsl(' + ((h + 36) % 360) + ' 62% 40%))">' + ini + '</span>';
  };

  /* ------------------------------ websocket / phoenix protocol ------------ */
  let ws = null, status = 'off', statusMsg = '', ref = 1, hbTimer = 0, retries = 0;
  const chans = {};
  /* All that is left of the old traffic meter: when we last heard anything,
     which is what the link-health and stale-socket checks read. The rate,
     byte and monthly-quota counters went with the panel readouts they fed. */
  const net = { lastRecv: now(), staleMs: 40000 };
  setInterval(() => {
    for (const id in (race ? race.peers : {})) {                 // drop players who went quiet
      if (race.peers[id]._t && now() - race.peers[id]._t > 15000) delete race.peers[id];
    }
  }, 1000);
  function wsFrame(topic, event, payload) { return JSON.stringify({ topic, event, payload, ref: String(ref++) }); }
  function setStatus(s, msg) { status = s; statusMsg = msg || ''; paint(); }
  /* The heartbeat is what stops the server closing the socket, and a page
     timer in a background tab gets throttled to about once a minute, which
     is longer than the server waits. Anyone with the site open in another
     tab was being quietly disconnected and dropped off every friend's list.
     A worker's timer is not throttled like that, so it drives the beat and
     the stale-link check; the page timer is only the fallback. */
  let hbLast = 0;
  function beat() {
    if (!ws || ws.readyState !== 1) return;
    hbLast = now();
    try { ws.send(wsFrame('phoenix', 'heartbeat', {})); } catch (e) {}
  }
  const hbWorker = (() => {
    try {
      const w = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},5000);'], { type: 'text/javascript' })));
      w.onmessage = () => { if (now() - hbLast >= 15000) beat(); linkCheck(); };
      return w;
    } catch (e) { return null; }
  })();
  function connect() {
    if (ws) return;
    setStatus('connecting');
    try {
      const base = cfg.url.trim().replace(/\/+$/, '').replace(/^http/, 'ws');
      ws = new WebSocket(base + '/realtime/v1/websocket?apikey=' + encodeURIComponent(cfg.key) + '&vsn=1.0.0');
    } catch (e) { ws = null; setStatus('error', 'No connection'); return; }
    ws.onopen = () => {
      retries = 0; setStatus('online');
      net.lastRecv = now();
      hbLast = now();
      if (!hbWorker) hbTimer = setInterval(beat, 15000);
      for (const t in chans) chans[t]._join();
      // a dropped socket loses whatever was in flight — resync everything:
      // the host resends a full keyframe, racers re-announce their row, and
      // silence timers restart so nobody gets blamed for OUR outage
      if (session && session.active) { session.forceFull = true; session.resync = (session.resync || 0) + 1; }
      const t0 = now();
      for (const k in seen) seen[k] = t0;
      if (((session && session.active) || (race && race.active))) {
        showToast('Reconnected — resyncing…');
        setTimeout(() => { if (race && race.active) race.say(); }, 700);
      }
    };
    ws.onmessage = m => {
      net.lastRecv = now();
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      const ch = chans[d.topic];
      if (ch) ch._recv(d);
    };
    ws.onclose = () => {
      clearInterval(hbTimer); ws = null;
      for (const t in chans) chans[t].joined = false;
      if (((session && session.active) || (race && race.active)) && now() - lastConnToast > 8000) {
        lastConnToast = now();
        showToast('Connection hiccup — reconnecting…');
      }
      if (retries < 12) {
        setStatus('connecting', 'reconnecting…');
        setTimeout(connect, Math.min(15000, 800 * Math.pow(2, retries++)));
      } else setStatus('off', 'Disconnected — retrying in the background');
    };
    ws.onerror = () => { setStatus('error', 'Connection failed — network may block it'); };
  }
  /* events that describe a moment (positions, snapshots) are useless once
     stale — they're dropped while the link is down. Everything else queues. */
  const DROPPABLE = new Set(['snap', 'gx', 'cmd', 'pping', 'r']);
  function chan(topic, opts) {
    if (chans[topic]) return chans[topic];
    const c = {
      topic, joined: false, handlers: {}, presence: {}, refs: {}, outbox: [], _joinT: 0,
      wantPres: !!(opts && opts.presence),
      on(ev, fn) { this.handlers[ev] = fn; return this; },
      _join() {
        if (!ws || ws.readyState !== 1) return;
        ws.send(wsFrame(topic, 'phx_join', {
          /* Presence has to be asked for. Without enabled the server never
             sends the presence_state snapshot, so a tab only ever heard
             about people who arrived AFTER it: every friend who was already
             online stayed grey, and reloading could not fix it. */
          config: { broadcast: { self: false, ack: false }, presence: { key: myId, enabled: this.wantPres }, private: false },
          access_token: cfg.key
        }));
        // if the join reply never lands, ask again — an unjoined channel is
        // a silent one and "silent" was the whole bug
        clearTimeout(this._joinT);
        this._joinT = setTimeout(() => { if (!this.joined && chans[topic] === this) this._join(); }, 6000);
      },
      _recv(d) {
        if (d.event === 'phx_reply' && !this.joined) {
          if (d.payload && d.payload.status === 'error') { setStatus('error', 'Channel join refused'); return; }
          this.joined = true;
          clearTimeout(this._joinT);
          const q = this.outbox.splice(0);
          for (const [ev, data] of q) this.send(ev, data);
          if (this.handlers._joined) this.handlers._joined();
        } else if (d.event === 'phx_error' || d.event === 'phx_close') {
          // the server dropped this channel (crash, rate limit, idle kill) —
          // this is THE silent failure mode: the socket stays up but nothing
          // routes any more. Rejoin immediately.
          this.joined = false;
          clearTimeout(this._joinT);
          this._joinT = setTimeout(() => { if (chans[topic] === this) this._join(); }, 600);
        } else if (d.event === 'presence_state') {
          this.refs = {};
          for (const k in d.payload) for (const m of ((d.payload[k] && d.payload[k].metas) || [])) this._add(k, m);
          this._rebuild();
          this._pres();
        } else if (d.event === 'presence_diff') {
          /* Presence is per CONNECTION. Every meta carries its own phx_ref,
             and one key (a tab) holds two for a while after a reconnect,
             until the server times the old socket out. That old socket's
             leave then lands AFTER the new one's join, and deleting the
             whole key on any leave threw the live connection away with the
             dead one: the player showed offline to everyone until someone
             reloaded. Now only the refs named in a leave go, and a key goes
             when it has none left. Leaves before joins, so an update (a
             leave and a join of the same key) always ends up present. */
          const joins = d.payload.joins || {}, leaves = d.payload.leaves || {};
          const before = Object.keys(this.presence);
          for (const k in leaves) {
            const r = this.refs[k]; if (!r) continue;
            for (const m of (leaves[k].metas || [])) delete r[(m && m.phx_ref) || '_'];
            if (!Object.keys(r).length) delete this.refs[k];
          }
          for (const k in joins) for (const m of (joins[k].metas || [])) this._add(k, m);
          this._rebuild();
          const gone = before.filter(k => !this.presence[k]);
          this._pres();
          if (gone.length && this.handlers._leave) this.handlers._leave(gone);
        } else if (d.event === 'broadcast' && d.payload) {
          const fn = this.handlers[d.payload.event];
          if (fn) fn(d.payload.payload);
        }
      },
      _add(k, m) { if (m) (this.refs[k] = this.refs[k] || {})[m.phx_ref || '_'] = m; },
      /* the key-to-meta view everything else reads: the newest live meta */
      _rebuild() {
        const p = {};
        for (const k in this.refs) { const ms = Object.values(this.refs[k]); if (ms.length) p[k] = ms[ms.length - 1]; }
        this.presence = p;
      },
      _pres() { if (this.handlers._presence) this.handlers._presence(this.presence); },
      track(meta) { if (ws && ws.readyState === 1 && this.joined) ws.send(wsFrame(topic, 'presence', { type: 'presence', event: 'track', payload: meta })); },
      send(ev, data) {
        if (!ws || ws.readyState !== 1 || !this.joined) {
          if (!DROPPABLE.has(ev)) {
            this.outbox.push([ev, data]);            // delivered on rejoin
            if (this.outbox.length > 20) this.outbox.shift();
          }
          return;
        }
        ws.send(wsFrame(topic, 'broadcast', { type: 'broadcast', event: ev, payload: data }));
      },
      leave() {
        clearTimeout(this._joinT);
        if (ws && ws.readyState === 1) { try { ws.send(wsFrame(topic, 'phx_leave', {})); } catch (e) {} }
        delete chans[topic];
      }
    };
    chans[topic] = c;
    if (ws && ws.readyState === 1) c._join();
    return c;
  }

  /* ------------------------------ party ------------------------------------
     Presence on its own is lossy — miss one diff and your member list is wrong
     forever. Every member also announces itself on join and pings on a timer,
     and the roster is the merge of both. */
  let room = null, roomId = null, isHost = false;
  let session = null, race = null, launching = false, hostPaused = false;
  let joinCode = '', joinErr = '', leftTag = '', hostId = null;
  let lastGcfg = null, lastConnToast = 0, lastSyncReq = 0, lastSyncSent = 0, hostMiss = 0;
  let hostSt = { st: null, m: null, pz: 0, at: 0 };
  /* the online game the host has open, menu or match (undefined: not heard
     yet), and the menu this tab opened because the host did */
  let hostAt, followGid = null;
  const members = {};                       // id -> {id,name,host,seen,ttl}
  /* Players the host removed, and when. The ban is what makes a kick stick:
     a removed player's own presence heartbeat would otherwise walk them
     straight back into the party a second later. It lapses on its own so a
     kick is a removal, not a permanent ban the host cannot undo. */
  const kicked = {};
  const KICK_BAN = 60000;
  /* Liveness comes from "have we heard anything at all from this player",
     never from a single presence frame. A presence meta update arrives as a
     leave followed by a join, so trusting one frame declares live players
     dead — which is exactly what was dropping players mid-match and
     desyncing Golf. */
  const seen = {};
  function heard(id) { if (id && id !== myId) seen[id] = now(); }
  /* only judge other people's silence while our own link is demonstrably
     alive — otherwise our outage reads as everyone else disconnecting */
  const linkOk = () => ws && ws.readyState === 1 && (now() - net.lastRecv) < 8000;
  const curGid = () => (session && session.active && session.gid) || (race && race.active && race.gid) || null;
  /* Every match has a tag of its own, and everything said about a match
     carries it. Without one, a message about the last match landed in the
     next: the host's exit, sent three times in case one is lost, pulled
     guests straight back out of a game that had only just started, and a
     repeated "finished" could mark a player done in a race they had not
     begun. Older builds send no tag, and are believed as before. */
  const tagOf = g => (g ? String(g.mid || (g.game + ':' + g.seed)) : '');
  const curTag = () => (session && session.active && tagOf(session.cfg)) || (race && race.active && tagOf(race.cfg)) || '';
  const forThis = p => !p || p.m === undefined || p.m === curTag();

  function guestExit(msg) {
    if (isHost) return;
    if (!(session && session.active) && !(race && race.active)) return;
    session = null; race = null; hostPaused = false; pauseNote = ''; hostMiss = 0;
    clearWait();
    if (cur) { baseCloseGame(); try { location.hash = ''; } catch (e) {} }
    if (msg) showToast(msg);
    paint(); refreshHub();
    follow();                      // the host may already be on another game's menu
  }
  /* One-shot events (start/exit/pz) can be lost on a flaky link. Every ping
     from the host carries their actual state, and guests reconcile against
     it — so by the next ping the party converges on the host's truth. A ping
     is sent after anything the host broadcast before it, so a tagged one is
     believed at once; an untagged one (an older build) still needs two. */
  function reconcileFromHost(p) {
    if (isHost || !p || !p.host) return;
    const tagged = p.m !== undefined;
    hostSt = { st: p.st || null, m: tagged ? (p.m || '') : null, pz: p.pz ? 1 : 0, at: now() };
    /* where they are is noted first, so a way out of a match below already
       knows where to go rather than following where they used to be */
    const moved = p.at !== undefined && noteHostAt(p.at || null);
    const gid = curGid();
    if (gid) {
      if (tagged ? hostSt.m === curTag() : hostSt.st === gid) hostMiss = 0;
      else if (tagged && hostSt.st) {
        /* they are in a different match, so we missed its start (a Play
           again, most likely). Ask for it: launching it closes this one. */
        hostMiss = 0;
        askSync();
      }
      else if (++hostMiss >= (tagged ? 1 : 2)) { guestExit('The host went back to the hub.'); return; }
      if (hostSt.pz && !hostPaused) { hostPaused = true; pauseNote = 'The host paused the game'; basePause(); }
      else if (!hostSt.pz && hostPaused) { hostPaused = false; pauseNote = ''; baseResume(); }
    } else {
      hostMiss = 0;
      /* host is mid-game and we're not: we missed the start — ask for it.
         Not for a match we walked out of ourselves, though. */
      if (hostSt.st && byId[hostSt.st] && byId[hostSt.st].mp && !(tagged && hostSt.m === leftTag)) askSync();
    }
    if (moved) follow();
  }
  function askSync() {
    if (!room || now() - lastSyncReq < 2000) return;
    lastSyncReq = now();
    room.send('sync', { id: myId });
  }

  /* ---- following the host ----
     Every online game opens on a menu of its own, and the host chooses the
     settings there before starting. Guests used to sit in the hub while that
     happened, so a party looked like the host wandering off on their own,
     and a start that went astray left them there. Now the party follows
     the host: onto the menu of whatever online game they open (where a
     guest's big button says the host starts it), and back to the hub when
     they go back. Only when the host moves, so a guest can still step out,
     and never out of a round of some other game. */
  function noteHostAt(at) {
    if (at === hostAt) return false;
    hostAt = at;
    paint();                       // the party panel says where the host is
    return true;
  }
  function follow() {
    if (isHost || !room || launching || curGid() || hostAt === undefined) return;
    /* mid-match: the start (or a sync) brings us straight into the game */
    if (hostAt && hostSt.st === hostAt) return;
    const g = hostAt && byId[hostAt];
    if (g && g.mp) {
      if ((cur && cur.id === hostAt) || (cur && !cur.mp) || !acctSignedIn()) return;
      followGid = hostAt;
      location.hash = '#/' + hostAt;
    } else if (!hostAt) {
      if (cur && followGid && cur.id === followGid) location.hash = '';
      followGid = null;
    }
  }

  function memberList() {
    const out = {};
    if (room) for (const k in room.presence) {
      const m = room.presence[k];
      out[k] = { id: k, name: m.name || 'Player', host: !!m.host };
    }
    /* A member is dropped after missing a couple of their own pings. The
       limit used to be a flat ten seconds while a player sitting in the hub
       pings every twenty, so an idle friend kept falling off the roster, and
       the next match started without them: they got the start and then
       raced unseen, or it refused to start at all for want of players. */
    for (const k in members) {
      if (linkOk() && now() - members[k].seen > (members[k].ttl || 60000)) { delete members[k]; continue; }
      if (!out[k]) out[k] = { id: k, name: members[k].name, host: members[k].host };
      else { out[k].name = members[k].name || out[k].name; out[k].host = out[k].host || members[k].host; }
    }
    if (room) out[myId] = { id: myId, name: myName(), host: isHost };   // always show yourself
    const arr = Object.keys(out).map(k => out[k]);
    arr.sort((a, b) => (a.host === b.host ? a.id.localeCompare(b.id) : a.host ? -1 : 1));
    return arr;
  }
  const partySize = () => memberList().length;
  /* Someone who has left the party has left the match with it. Their row
     is finished, so a race waiting on them ends instead of waiting for
     somebody who is not coming back: their silence cannot be timed out,
     because seen[] goes with them. */
  function dropMember(id) {
    delete members[id]; delete seen[id]; gone[id] = now();
    const b = race && race.board[id];
    if (b && !b.done) { b.alive = false; b.done = true; b.gone = true; }
  }
  function kick(id) {
    if (!isHost || !room || !id || id === myId) return;
    const m = members[id];
    kicked[id] = now();
    room.send('kick', { id: id, by: myId });
    if (m) pushMsg('party', '', (m.name || 'Someone') + ' was removed from the party', true);
    dropMember(id);
    Sound.blip();
    paint(); refreshHub(); drawChat(); abandonCheck();
    if (race) raceMaybeDone();
  }
  /* what every hello and ping says about this tab: who, and — from the
     host — which match, which game is open, and whether it is paused; plus
     how long until the next ping, so the others know when to give up on it */
  const hostAtNow = () => (cur && cur.mp ? cur.id : null);
  function stateMsg() {
    const o = { id: myId, name: myName(), host: isHost, st: curGid(), m: curTag(), nx: PP_EVERY[netMode()], pz: isHost && curGid() && paused ? 1 : 0 };
    if (isHost) o.at = hostAtNow();
    return o;
  }
  const ttlOf = p => Math.max(15000, Math.min(150000, (+p.nx || 24000) * 2.5));
  function noteMember(p) {
    heard(p.id);
    if (p.host) hostId = p.id;
    const isNew = !members[p.id];
    members[p.id] = { id: p.id, name: p.name || 'Player', host: !!p.host, seen: now(), ttl: ttlOf(p) };
    return isNew;
  }
  function announce() {
    if (room && room.joined) room.send('phello', stateMsg());
  }

  function joinRoom() {
    for (const k in members) delete members[k];
    hostAt = undefined; followGid = null; leftTag = '';
    hostSt = { st: null, m: null, pz: 0, at: 0 };
    room = chan('realtime:room-' + roomId, { presence: true })
      .on('_joined', () => { room.track({ name: myName(), host: isHost }); announce(); })
      .on('_presence', () => { paint(); refreshHub(); })
      /* an explicit leave is trustworthy — that's a closed tab, not a blip */
      .on('_leave', ids => {
        for (const id of ids) {
          if (members[id]) pushMsg('party', '', members[id].name + ' left the party', true);
          delete members[id]; gone[id] = now();
        }
        paint(); refreshHub(); drawChat(); abandonCheck();
      })
      /* membership handshake */
      .on('msg', p => { if (p && p.id !== myId) { heard(p.id); pushMsg('party', p.name, p.text); } })
      .on('phello', p => {
        if (!p || p.id === myId) return;
        if (isHost && kicked[p.id] && now() - kicked[p.id] < KICK_BAN) { room.send('kick', { id: p.id, by: myId }); return; }
        if (noteMember(p)) pushMsg('party', '', (p.name || 'Someone') + ' joined the party', true);
        room.send('phi', stateMsg());
        /* someone (re)appeared mid-game — hand them fresh state immediately */
        if (session && session.active && session.role === 'host') session.forceFull = true;
        if (race && race.active) race.say();
        reconcileFromHost(p);
        paint();
      })
      .on('phi', p => {
        if (!p || p.id === myId) return;
        noteMember(p);
        reconcileFromHost(p); paint();
      })
      .on('pping', p => {
        if (!p || p.id === myId) return;
        if (p.host && p.nx) hostNx = p.nx;
        noteMember(p);
        reconcileFromHost(p); paint();
      })
      /* a guest missed the start broadcast — replay it (guests ignore a start
         for the match they are already in) */
      .on('sync', p => {
        heard(p && p.id);
        if (!isHost || !lastGcfg || curTag() !== tagOf(lastGcfg) || now() - lastSyncSent < 800) return;
        /* once the host's own round is over, only someone who was in it is
           sent back (a start they missed); a friend who joined the party
           while the results were up waits for the next one instead of being
           dropped into a race that has finished */
        if (over && !(lastGcfg.players || []).some(q => q.id === (p && p.id))) return;
        lastSyncSent = now();
        room.send('start', lastGcfg);
      })
      /* Removal. The kicked tab leaves of its own accord; everyone else drops
         that player the way they would any other departure. */
      .on('kick', p => {
        if (!p || !p.id) return;
        /* Only the host removes people. If we do not yet know who the host is
           we are in no position to act on this either - the host re-sends the
           kick on the next hello, by which point we do. */
        const hid = isHost ? myId : hostId;
        if (!hid || p.by !== hid) return;
        if (p.id === myId) {
          if (isHost) return;
          guestExit();                 // no-op unless we were mid-game
          leaveRoom();
          showToast('The host removed you from the party.');
          return;
        }
        if (members[p.id]) pushMsg('party', '', members[p.id].name + ' was removed from the party', true);
        dropMember(p.id);
        paint(); refreshHub(); drawChat(); abandonCheck();
        if (race) raceMaybeDone();
      })
      .on('pbye', p => {
        if (!p || !p.id) return;
        if (members[p.id]) pushMsg('party', '', members[p.id].name + ' left the party', true);
        dropMember(p.id);
        paint(); refreshHub(); drawChat(); abandonCheck();
        if (race) raceMaybeDone();
      })
      /* authoritative traffic */
      .on('start', p => {
        if (isHost || !p || !p.game) return;
        const tag = tagOf(p);
        /* a repeat of the match we are in, or one we walked out of: neither
           is a reason to (re)start. Anything else is, including the match
           a lost message or a stray exit took us out of. */
        if (tag === curTag() || tag === leftTag) return;
        launch(false, p);
      })
      .on('cmd', p => {
        if (!session || session.role !== 'host' || !p || !forThis(p)) return;
        heard(p.from);
        if (session._cmdQ.length > 150) session._cmdQ.splice(0, session._cmdQ.length - 150);
        session._cmdQ.push(p);
      })
      .on('snap', p => {
        heard(hostId);                      // only the host sends snapshots
        if (!session || session.role !== 'guest' || !p || !forThis(p)) return;
        if (p.q !== undefined && session._lastQ !== undefined && p.q <= session._lastQ) return;  // out of order
        if (p.q !== undefined) session._lastQ = p.q;
        session._snap = p;
        if (p.ev && p.ev.length) {
          session._events.push.apply(session._events, p.ev);
          if (session._events.length > 240) session._events.splice(0, session._events.length - 240);
        }
      })
      .on('over', p => { if (session && session.role === 'guest' && p && forThis(p)) session._events.push(['o', p]); })
      .on('pz', p => {
        if (isHost || !forThis(p)) return;
        if (!(session && session.active) && !(race && race.active)) return;
        if (p && p.p) { hostPaused = true; pauseNote = 'The host paused the game'; basePause(); }
        else { hostPaused = false; pauseNote = ''; baseResume(); }
      })
      .on('exit', p => {
        if (isHost || !forThis(p)) return;
        /* leaving a match takes the host to the hub, and only there */
        hostSt.st = null; hostSt.m = '';
        noteHostAt(null);
        guestExit('The host went back to the hub.');
      })
      .on('gleft', p => {
        if (!p || !p.id || p.id === myId) return;
        heard(p.id);
        if (!forThis(p)) return;
        if (race && race.board[p.id]) { race.board[p.id].alive = false; race.board[p.id].done = true; race.board[p.id].gone = true; }
        if (session && session.players) session.players = session.players.filter(q => q.id !== p.id);
        gone[p.id] = now();
        abandonCheck();
        if (race) raceMaybeDone();
      })
      /* shared-match traffic */
      .on('r', p => {
        if (!p) return;
        heard(p.i);
        if (!race || !forThis(p)) return;
        const b = racer(p.i);
        if (b && !b.done) { b.score = p.s; b.alive = !!p.a; b.extra = p.x == null ? null : p.x; }
      })
      .on('rd', p => {
        if (!p) return;
        heard(p.i);
        if (!race || !forThis(p)) return;
        const b = racer(p.i);
        if (b) { b.score = p.s; b.alive = false; b.done = true; }
        raceMaybeDone();
      })
      .on('atk', p => { if (race && p && p.from !== myId && forThis(p)) race._atk.push({ from: p.from, n: p.n | 0 }); })
      .on('gx', p => {
        if (!p || p.i === myId) return;
        heard(p.i);
        if (!race || !forThis(p)) return;
        racer(p.i);
        const prev = race.peers[p.i];
        if (prev) { p.rx = prev.rx; p.ry = prev.ry; p.rz = prev.rz; p.rh = prev.rh; }   // keep smoothing state
        p._t = now(); race.peers[p.i] = p;
      });
  }
  /* The row for a player in this race, made on the spot for someone who is
     racing but was not on the roster it started with (a roster taken while
     they were briefly unseen, or a late start through a sync): they are in
     the race all the same, and the standings should say so. */
  function racer(id) {
    if (!race || !id) return null;
    let b = race.board[id];
    if (!b && !gone[id]) {
      const m = members[id] || (room && room.presence[id]);
      b = race.board[id] = { id, name: (m && m.name) || 'Player', score: 0, alive: true, done: false, extra: null };
      race.count = Object.keys(race.board).length;
    }
    return b || null;
  }
  /* keep everyone's member list fresh — the ping carries the sender's real
     game state so lost start/exit/pause events self-heal within two pings */
  /* ---------------------------------------------------------------- budget
   * Realtime is billed per message and a broadcast costs one per recipient,
   * so a party that idles chattily is far more expensive than one that plays.
   * Everything periodic below scales with what the party is actually doing:
   * flat out during a game, barely awake sitting in the hub, asleep in a
   * hidden tab. Idle cost was the whole problem — a party doing nothing used
   * to spend more messages per hour than one mid-game.
   */
  function netMode() {
    if (document.hidden) return 'hidden';
    if (curGid()) return 'play';
    if (room && cur && cur.mp) return 'lobby';          // on an online game's menu, about to start
    if (el('mpov') && el('mpov').classList.contains('on')) return 'panel';
    return 'idle';
  }
  const PP_EVERY = { play: 3500, lobby: 6000, panel: 8000, idle: 20000, hidden: 45000 };
  let ppLast = 0, trackSig = '', trackLast = 0;
  function ping() {
    if (!room || !room.joined) return;
    ppLast = now();
    room.send('pping', stateMsg());
  }
  setInterval(() => {
    if (!room || !room.joined) return;
    const t = now(), mode = netMode();
    /* Presence metas almost never change. Re-tracking on a timer sent every
       member a leave/join pair carrying no new information — expensive, and
       it was the source of the old "player vanished" flapping. Re-track on
       real change, with a slow heartbeat purely as a safety net. */
    const sig = myName() + '|' + (isHost ? 1 : 0);
    if (sig !== trackSig || t - trackLast > 60000) {
      trackSig = sig; trackLast = t;
      room.track({ name: myName(), host: isHost });
    }
    if (t - ppLast >= PP_EVERY[mode]) ping();
  }, 1000);
  /* The host's whereabouts go out the moment they change — opening a game's
     menu, going back to the hub — rather than at the next ping, so the party
     follows within a beat. The ping itself says it, so nothing new has to be
     understood by an older build. */
  let atSaid;
  setInterval(() => {
    if (!isHost || !room || !room.joined) { atSaid = undefined; return; }
    const at = hostAtNow();
    if (at !== atSaid) { atSaid = at; ping(); }
  }, 200);

  setInterval(() => { if (el('mpov').classList.contains('on')) paint(); else paintBtn(); }, 1000);
  /* Disconnects are declared on silence, not on one presence frame — and only
     judged while OUR link is healthy, so our outage never reads as theirs. */
  /* A host who has paused sends nothing but its ping, and a host whose tab is
     in the background pings far less often (its own ping says when the next
     is due, nx): twelve seconds of quiet from one of those is not a host who
     has gone. Pausing and looking at another tab used to end everyone's
     match. */
  let hostNx = 0;
  setInterval(() => {
    const t = now();
    if (!linkOk()) return;
    const quiet = Math.max(12000, hostNx + 6000, hostPaused ? 60000 : 0);
    if (session && session.active && session.role === 'guest' && hostId && seen[hostId] && t - seen[hostId] > quiet) {
      session.hostLeft = true;
    }
    if (race && race.active) {
      for (const id in race.board) {
        if (id === myId || race.board[id].done) continue;
        if (seen[id] && t - seen[id] > 18000) {
          race.board[id].alive = false; race.board[id].done = true; race.board[id].gone = true;
        }
      }
      for (const id in race.peers) if (seen[id] && t - seen[id] > 30000) delete race.peers[id];
      /* my "finished" flag repeats until everyone has it — a lost packet can
         never leave the group stuck on the waiting screen */
      const m = race.board[myId];
      if (m && m.done && !race.allDone() && room) {
        if (!race._rdT || t - race._rdT > 3000) { race._rdT = t; room.send('rd', { i: myId, s: m.score, m: curTag() }); }
      }
      if (race.allDone()) raceMaybeDone();
    }
  }, 1000);
  /* Half-open sockets receive nothing but never fire onclose — kill and
     redial them, and come back instantly when the tab or network returns. */
  /* Only once begin() has run: the redial used to dial the first time too,
     five seconds after the page opened, so a tab sitting on the sign-in box
     was on the socket and in the lobby chat before anyone had signed in. */
  function linkCheck() {
    if (!began) return;
    if (ws && ws.readyState === 1 && now() - net.lastRecv > net.staleMs) { try { ws.close(); } catch (e) {} }
    if (!ws && status !== 'connecting') { retries = 0; connect(); }
  }
  setInterval(linkCheck, 5000);
  addEventListener('online', () => { if (began && !ws) { retries = 0; connect(); } });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !began) return;
    if (!ws) { retries = 0; connect(); }
    else { try { ws.send(wsFrame('phoenix', 'heartbeat', {})); } catch (e) {} }
  });
  /* leaving must be announced — pagehide is the reliable one on mobile/bfcache */
  function sayBye() { try { if (room) room.send('pbye', { id: myId }); } catch (e) {} }
  addEventListener('beforeunload', sayBye);
  addEventListener('pagehide', sayBye);

  function createRoom() {
    roomId = genCode(); isHost = true; joinRoom(); refreshHub();
    logs.party.length = 0;
    pushMsg('party', '', 'Party ' + roomId + ' created — share the code.', true);
    drawChat();
  }
  function joinByCode(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { joinErr = 'Party codes are 5 characters.'; paint(); return; }
    if (room) leaveRoom(true);
    joinErr = ''; joinCode = '';
    roomId = code; isHost = false;
    joinRoom(); paint(); refreshHub();
    logs.party.length = 0;
    pushMsg('party', '', 'You joined party ' + code + '.', true);
    drawChat();
    showToast('Joined party ' + code + '.');
  }
  function leaveRoom(silent) {
    if (room) { try { room.send('pbye', { id: myId }); } catch (e) {} room.leave(); }
    for (const k in members) delete members[k];
    room = null; roomId = null; isHost = false; session = null; race = null;
    hostPaused = false; pauseNote = '';
    hostAt = undefined; followGid = null; leftTag = '';
    logs.party.length = 0;
    if (!silent) { paint(); refreshHub(); drawChat(); }
  }

  /* ------------------------------ launching ------------------------------- */
  function startGame(gid) {
    const g = byId[gid];
    if (!g || !g.mp) return;
    if (!isHost || !room) { showToast('Only the host (★) starts online games.'); return; }
    const list = memberList();
    const n = list.length;
    const lo = g.mpMin || 2, hi = g.mpMax || 8;
    if (n < lo) { showToast(g.title + ' needs at least ' + lo + ' players — share your code.'); return; }
    if (n > hi) { showToast(g.title + ' takes at most ' + hi + ' players.'); return; }
    const gcfg = {
      game: gid, seed: (Math.random() * 1e9) | 0, host: myId,
      mid: Math.random().toString(36).slice(2, 8) + now().toString(36).slice(-4),   // this match's tag
      players: list.map(p => ({ id: p.id, name: p.name }))
    };
    if (g.options) for (const o of g.options) gcfg[o.id] = Store.opt(gid, o.id) || o.def;
    lastGcfg = gcfg;                     // kept so late/deafened guests can request it
    room.send('start', gcfg);
    launch(true, gcfg);
  }
  function makeSession(gcfg, host) {
    const tag = tagOf(gcfg);
    return {
      active: true, role: host ? 'host' : 'guest', gid: gcfg.game, cfg: gcfg,
      seed: gcfg.seed, me: myId, players: (gcfg.players || []).slice(),
      _cmdQ: [], _snap: null, _events: [], hostLeft: false,
      _lastQ: undefined, seq: 0, forceFull: false, resync: 0,
      cmd(o) { if (room) { o.from = myId; o.m = tag; room.send('cmd', o); } },
      send(ev, o) {
        if (!room) return;
        o.m = tag;
        /* the sequence lets guests drop reordered packets; the host's clock
           lets them space the snapshots as they were sent, not as the
           network happened to deliver them (NetBuf) */
        if (ev === 'snap') { o.q = ++this.seq; o.ts = Math.round(performance.now()); }
        room.send(ev, o);
      }
    };
  }
  function makeRace(gcfg) {
    const tag = tagOf(gcfg);
    const board = {};
    for (const p of (gcfg.players || [])) board[p.id] = { id: p.id, name: p.name, score: 0, alive: true, done: false, extra: null };
    /* a roster that somehow missed this tab still races it */
    if (!board[myId]) board[myId] = { id: myId, name: myName(), score: 0, alive: true, done: false, extra: null };
    let nextSend = 0, nextPost = 0;
    const r = {
      active: true, gid: gcfg.game, cfg: gcfg, seed: gcfg.seed, me: myId,
      count: Object.keys(board).length, board, peers: {}, _atk: [],
      report(score, alive, extra) {
        const m = board[myId]; if (!m || m.done) return;
        m.score = Math.round(score); m.alive = !!alive; m.extra = extra == null ? null : extra;
        const t = now();
        if (t >= nextSend) {
          nextSend = t + 400;
          if (room) room.send('r', { i: myId, s: m.score, a: m.alive ? 1 : 0, x: m.extra, m: tag });
        }
      },
      /* game-specific live state (ball positions, hole progress, …).
         `every` lets a game slow itself right down when nothing is moving. */
      post(o, force, every) {
        const t = now();
        if (!force && t < nextPost) return;
        nextPost = t + (every || 110);
        o.i = myId; o.m = tag;
        if (room) room.send('gx', o);
      },
      finish(score) {
        const m = board[myId];
        if (m) { m.score = Math.round(score); m.alive = false; m.done = true; }
        if (room) room.send('rd', { i: myId, s: Math.round(score), m: tag });
        raceMaybeDone();
      },
      /* this tab's row again, for anyone who has just (re)appeared */
      say() {
        const m = board[myId];
        if (!room || !m) return;
        room.send('r', { i: myId, s: m.score, a: m.alive ? 1 : 0, x: m.extra, m: tag });
        if (m.done) room.send('rd', { i: myId, s: m.score, m: tag });
      },
      attack(n) { if (room && n > 0) room.send('atk', { from: myId, n: n | 0, m: tag }); },
      takeAttacks() { const a = r._atk.slice(); r._atk.length = 0; return a; },
      allDone() {
        const ids = Object.keys(board);
        return ids.length > 0 && ids.every(k => board[k].done);
      },
      pending() { return Object.keys(board).filter(k => !board[k].done).map(k => board[k].name); },
      list() {
        const arr = Object.keys(board).map(k => {
          const b = board[k];
          return { id: k, name: b.name, score: b.score, alive: b.alive, done: b.done, extra: b.extra, me: k === myId };
        });
        arr.sort((a, b) => b.score - a.score);
        return arr;
      }
    };
    return r;
  }
  function raceMaybeDone() {
    if (!race) return;
    if (!race.allDone()) { refreshWait(); return; }
    const win = race.list()[0];
    if (win && !race._announced) {
      race._announced = true;
      if (win.id === myId) Sound.win();
    }
    refreshWait();
  }
  function launch(host, gcfg) {
    const g = byId[gcfg.game];
    if (!g) return;
    if (!gcfg.players || !gcfg.players.length) gcfg.players = memberList().map(p => ({ id: p.id, name: p.name }));
    gone = {};
    leftTag = ''; followGid = null;
    clearWait();
    if (g.mp === 'race') { race = makeRace(gcfg); session = null; }
    else { session = makeSession(gcfg, host); race = null; }
    /* give everyone a fresh clean bill of health at kick-off, otherwise the
       silence timer can fire before the first packet has had time to arrive */
    hostId = gcfg.host || hostId;
    for (const p of (gcfg.players || [])) seen[p.id] = now();
    if (hostId) seen[hostId] = now();
    hostSt = { st: gcfg.game, m: tagOf(gcfg), pz: 0, at: now() };   // reconcile from a clean baseline
    hostMiss = 0;
    hostPaused = false; pauseNote = '';
    el('mpov').classList.remove('on');
    /* Opened and mounted here and now. This used to wait 60ms for the hash
       change to route first — and a timer in a background tab waits a
       second or more, which left a party member on the game's page with
       nothing mounted while everyone else was already playing. The hash is
       set afterwards, and route() finds the game already open. openFront()
       sees the match and puts up no menu. */
    launching = true;
    try {
      if (cur) closeGame();
      openGame(g);
      baseStart();          // direct: the start() wrapper would re-broadcast
      hdrTitle.textContent = g.title + ' · Online';
    } catch (e) { try { console.error(e); } catch (_) {} }
    launching = false;
    if (location.hash !== '#/' + g.id) location.hash = '#/' + g.id;
    paint();
  }

  /* ---------------- shell integration: pause / exit / results ------------- */
  const basePause = pause, baseResume = resume, baseCloseGame = closeGame, baseStart = start, baseRenderHub = renderHub;
  pause = function () {
    basePause();
    if (isHost && ((session && session.active) || (race && race.active)) && room) room.send('pz', { p: 1, m: curTag() });
  };
  resume = function () {
    if (hostPaused && !isHost) { showToast('Waiting for the host to resume.'); return; }
    baseResume();
    if (isHost && ((session && session.active) || (race && race.active)) && room) room.send('pz', { p: 0, m: curTag() });
  };
  closeGame = function () {
    // the host leaving pulls everyone back to the hub with them
    const inMatch = (session && session.active) || (race && race.active);
    const wasIn = !!inMatch;
    const tag = curTag();
    const notify = !launching && isHost && room && inMatch;
    /* whatever waiting screen this match had goes with it — its timer used
       to outlive the game and put "Run complete" back up over the next one */
    clearWait();
    baseCloseGame();
    if (notify) {
      lastGcfg = null;                  // stop answering sync requests for a dead match
      /* Sent three times, each naming the match it ends, so a late copy
         cannot end the next one; and not at all once a new one has begun.
         Even if all three vanish, the next ping brings guests home anyway. */
      const bye = () => { try { if (room && !curTag()) room.send('exit', { m: tag }); } catch (e) {} };
      room.send('exit', { m: tag });
      setTimeout(bye, 300);
      setTimeout(bye, 800);
    }
    /* A guest walking back to the hub used to say nothing, so the host sat
       racing someone who was no longer there. Now everyone announces leaving a
       match; whoever is left decides whether it can still go on. Having left
       it, this tab does not take a replay of its start as a reason to go back. */
    if (!notify && !launching && wasIn && room) {
      leftTag = tag;
      try { room.send('gleft', { id: myId, m: tag }); } catch (e) {}
    }
    if (!launching) { session = null; race = null; hostPaused = false; pauseNote = ''; }
    if (notify) { paint(); refreshHub(); }
  };
  start = function () {
    if (!launching && room && cur && cur.mp) {
      // every (re)start in a party goes through a fresh broadcast, so Restart
      // and Play-again begin an identical synced match on every screen
      if (isHost) { startGame(cur.id); return; }
      showToast('The host starts the next game.');
      return;
    }
    baseStart();
  };
  /* The online badge used to be appended here after every paint. It is part
     of the card now (coopBadge), because the grid is no longer rebuilt on
     every paint and an appended badge would pile up on the ones kept. */
  renderHub = function () { baseRenderHub(); };
  function refreshHub() { if (!cur) renderHub(); }
  gridEl.onclick = e => {
    const c = e.target.closest('.gc');
    if (!c) return;
    const gid = c.dataset.id;
    if (room && byId[gid] && byId[gid].mp) {
      /* a game with a front page of its own opens on it: the host picks the
         settings there and starts the match from it */
      if (isHost) { if (byId[gid].front) location.hash = '#/' + gid; else startGame(gid); }
      else showToast('Only the host (★) starts online games.');
      return;
    }
    location.hash = '#/' + gid;
  };

  /* ---- results: nobody sees the score until everyone has finished -------- */
  let waitRes = null, waitTimer = 0;
  let gone = {};                    // ids that walked out of the current match
  endHook = function (res) {
    if (!race || !race.active) return false;
    if (race.allDone()) { showFinal(res); return true; }
    waitRes = res;
    waitBuilt = false;
    drawWait();
    clearInterval(waitTimer);
    waitTimer = setInterval(refreshWait, 600);
    return true;
  };
  /* A match needs opponents. When the last one leaves — whether they closed the
     tab or walked back to the hub — everyone still in it is told the game is
     over rather than being left racing nobody. With three or more players,
     losing one just removes them and play continues. */
  function abandonCheck() {
    const gid = curGid();
    if (!gid || !cur) return;
    /* This round is already over here and its results are up. There is
       nothing left to stop, and replacing them with "Everyone left" only
       took the result away from the player who stayed to read it. */
    if (over && !waitRes) return;
    /* Out already, and only waiting on the others or watching them: whoever
       left was marked done with the rest, so the race ends the usual way,
       with its standings, rather than as "Everyone left" with no score. */
    if (race && race.board[myId] && race.board[myId].done) return;
    const g = byId[gid];
    const need = (g && g.mpMin) || 2;
    /* Someone who quit to the hub is still in the party, so party size is the
       wrong measure — count who is still in THIS match and still connected. */
    const roster = (session && session.cfg && session.cfg.players) ||
                   (race && race.cfg && race.cfg.players) || memberList();
    let alive = 0;
    for (const p of roster) {
      if (gone[p.id]) continue;
      if (p.id === myId || members[p.id]) alive++;
    }
    if (alive >= need) return;
    if (session) session.active = false;
    if (race) race.active = false;
    session = null; race = null;
    /* endHook is not touched: it is the shell's hook for every match to come.
       It used to be cleared here, and after one abandoned match no race
       waited for anyone again until the page was reloaded. */
    /* If we had already finished and were sitting on the waiting screen, the
       shell's `over` flag is set and gameOver() would silently no-op — which
       left the panel frozen mid-wait forever. Resolve that case by showing the
       result we were holding instead. */
    const held = waitRes;
    clearInterval(waitTimer); waitTimer = 0; waitRes = null;
    const note = 'The other ' + (need > 2 ? 'players' : 'player') + ' left the match.';
    try {
      if (held) {
        showEnd(Object.assign({}, held, { message: note }));
      } else {
        over = false;                       // let the end panel through
        api.gameOver({ score: 0, title: 'Everyone left', message: note, stats: [] });
      }
    } catch (e) { try { location.hash = ''; } catch (e2) {} }
    paint(); refreshHub();
  }

  function clearWait() { clearInterval(waitTimer); waitTimer = 0; waitRes = null; waitBuilt = false; }
  function refreshWait() {
    if (!waitRes) return;
    if (!race || !cur) { clearWait(); return; }
    if (race.allDone()) { clearInterval(waitTimer); waitTimer = 0; const r = waitRes; waitRes = null; showFinal(r); }
    else drawWait();
  }
  /* Built once, then only the values that actually change are written. This
     used to rebuild the whole panel every 600ms, which restarted its entrance
     animation and re-created every row — the waiting screen visibly flickered
     and resized while you sat there. */
  let waitBuilt = false;
  function drawWait() {
    if (!race || !cur) return;
    const pend = race.pending();
    if (!waitBuilt) {
      /* the game's whole line: esc() stops at 40 characters, which suits a
         name and cut this off mid-word ("its own kind of mistak") */
      let h = '<h2>Run complete</h2><p class="sub">' + escAll(waitRes.message || '') + '</p>' +
        '<div class="waitnote"><span class="spinner"></span><span id="waitFor"></span></div>' +
        '<div class="mp-h" style="margin-top:4px">Live standings</div>' +
        '<div id="waitRows"></div>' +
        '<div class="btnrow"><button class="btn sec" id="waitHub">Back to hub</button></div>';
      panelEl.innerHTML = h;
      el('waitHub').onclick = () => { location.hash = ''; };
      waitBuilt = true;
    }
    const wf = el('waitFor');
    if (wf) {
      const txt = pend.length ? 'Waiting for ' + pend.join(', ') + '…' : 'Finishing up…';
      if (wf.textContent !== txt) wf.textContent = txt;
    }
    const box = el('waitRows');
    if (box) {
      const list = race.list();
      /* reuse the row elements; only rebuild if the roster size changed */
      if (box.children.length !== list.length) {
        box.innerHTML = list.map(p =>
          '<div class="mp-row' + (p.me ? ' mp-me' : '') + '">' + avatar(p.name, 26) +
          '<b class="wn"></b><span class="sp"></span>' +
          '<span class="mp-small ws"></span>' +
          '<b class="wv" style="min-width:56px;text-align:right"></b></div>').join('');
      }
      list.forEach((p, i) => {
        const row = box.children[i]; if (!row) return;
        const n = row.querySelector('.wn'), s = row.querySelector('.ws'), v = row.querySelector('.wv');
        const st = p.done ? 'finished' : p.alive ? 'playing' : 'out';
        if (n.textContent !== p.name) n.textContent = p.name;
        if (s.textContent !== st) s.textContent = st;
        const val = fmt(p.score);
        if (v.textContent !== val) v.textContent = val;
      });
    }
    ovEl.classList.add('on');
  }
  function showFinal(res) {
    if (!race) { showEnd(res); return; }
    const list = race.list();
    let place = 1;
    for (const p of list) { if (p.me) break; place++; }
    place = Math.min(place, list.length);
    const won = place === 1 && list.length > 1;
    const out = Object.assign({}, res, {
      win: won,
      title: list.length > 1 ? (won ? 'You win' : 'Finished ' + place + (place === 2 ? 'nd' : place === 3 ? 'rd' : 'th')) : res.title,
      stats: (res.stats || []).filter(s => s.label !== 'Place' && s.label !== 'Leader')
        .concat([{ label: 'Place', value: place + ' / ' + list.length }]),
      /* the whole field, for the results page to set out */
      standings: list.map(p => ({ name: p.name, score: p.score, me: !!p.me })),
      place
    });
    showEnd(out);
  }

  /* ------------------------------ toast ----------------------------------- */
  function showToast(msg) {
    const t = el('mpToast');
    t.querySelector('.t-msg').textContent = msg;
    t.querySelector('.t-row').style.display = 'none';
    t.classList.add('on');
    setTimeout(hideToast, 3500);
  }
  function hideToast() { el('mpToast').classList.remove('on'); }

  /* ------------------------------ panel ----------------------------------- */
  function paintBtn() {
    const b = el('mpBtn'), badge = el('mpBadge');
    if (!b) return;
    const n = room ? partySize() : 0;
    b.classList.toggle('mp-live', status === 'online' && !!room);
    badge.style.display = room && n > 1 ? 'flex' : 'none';
    badge.textContent = n;
  }
  /* which tab of the party panel is showing */
  let mpTab = 'party';
  /* The panel is a shell built once — a head, the two tabs, a body — and
     then each part is only rewritten when what it says has changed. It used
     to rebuild all of it every second, which took whatever was being typed
     with it and restarted every bit of motion inside it; now the tabs keep
     their element, so the highlight slides between them, and the body only
     animates in when you actually switch to it. */
  let mpSwitched = false;
  function paint() {
    paintBtn();
    const p = el('mpPanel');
    if (!p || !el('mpov').classList.contains('on')) return;
    const act = document.activeElement;
    const focusId = act && act.id;
    let liveVal, selA = null, selB = null;
    if (focusId && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA')) {
      liveVal = act.value;
      try { selA = act.selectionStart; selB = act.selectionEnd; } catch (e) {}
    }
    let shell = p.querySelector('.mpx');
    if (!shell) {
      p.innerHTML = '<div class="mpx"><div class="mpx-top"></div>' +
        '<div class="mp-tabs" data-at="' + mpTab + '"><i class="mpx-ind"></i>' +
          '<button class="mp-tab" data-mt="party" aria-pressed="' + (mpTab === 'party') + '">Party</button>' +
          '<button class="mp-tab" data-mt="friends" aria-pressed="' + (mpTab === 'friends') + '">Friends</button>' +
        '</div><div class="mpx-body"></div></div>';
      shell = p.querySelector('.mpx');
      shell.querySelector('.mp-tabs').onclick = e => {
        const b = e.target.closest('[data-mt]'); if (!b) return;
        const t = b.getAttribute('data-mt');
        if (t === mpTab) return;
        mpTab = t; mpSwitched = true;
        Sound.blip(); paint();
      };
    }

    const dot = status === 'online' ? 'on' : status === 'connecting' ? 'mid' : 'off';
    const stTxt = status === 'online' ? 'Connected' : status === 'connecting' ? 'Connecting…' : status === 'error' ? esc(statusMsg || 'Error') : 'Offline';
    const top =
      '<div class="h-ph"><span class="h-ic">' + HI.users + '</span>' +
        '<div><h2>Play together</h2><p>' + (status === 'online' ? onlineN() + ' online right now' : 'Parties, friends and invites') + '</p></div>' +
        '<span class="sp"></span><button class="h-x" id="mpX" aria-label="Close">' + HI.x + '</button></div>' +
      '<div class="mpx-me">' + avatar(myName(), 44) +
        '<div class="t"><b>' + esc(myName()) + '</b><span>This is the name everyone sees</span></div>' +
        '<span class="mpx-st ' + dot + '"><i></i>' + stTxt + '</span></div>';
    const topEl = shell.querySelector('.mpx-top');
    if (topEl.__h !== top) {
      topEl.__h = top; topEl.innerHTML = top;
      el('mpX').onclick = () => el('mpov').classList.remove('on');
    }

    /* the tabs keep their element; only their state moves */
    const tabs = shell.querySelector('.mp-tabs');
    tabs.setAttribute('data-at', mpTab);
    tabs.querySelectorAll('.mp-tab').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-mt') === mpTab)));
    let fpend = 0;
    try { fpend = Friends.pending; } catch (e) {}
    const ft = tabs.querySelector('[data-mt="friends"]');
    let bi = ft.querySelector('i');
    if (fpend && !bi) { bi = document.createElement('i'); ft.append(bi); }
    if (bi) { if (fpend) bi.textContent = fpend; else bi.remove(); }

    const body = shell.querySelector('.mpx-body');
    const enter = mpSwitched; mpSwitched = false;
    const animate = () => {
      if (!enter) return;
      body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
      clearTimeout(body.__t); body.__t = setTimeout(() => body.classList.remove('enter'), 900);
    };

    if (mpTab === 'friends') {
      /* Once the friends pane is mounted it owns its own contents and
         repaints itself; this only has to put it there. */
      if (!body.querySelector('#mpFriends')) {
        body.__h = '';
        body.innerHTML = '<div id="mpFriends"></div>';
        try { Friends.mountInto(body.querySelector('#mpFriends')); } catch (e) {}
        animate();
      }
      return;
    }

    let h = '';
    if (!room) {
      h += '<div class="mpx-hero"><span class="h-ic">' + HI.users + '</span><b>Start a party</b>' +
        '<span>Make a room, share its five-letter code, and any game with an Online badge starts with everyone in it.</span>' +
        '<button class="h-cta" id="mpMake">' + HI.plus + 'Start a party</button></div>';
      /* Matchmaking is deliberately not surfaced yet. The per-game queue
         engine below (mmJoin/mmCheck/mmLeave) is complete and dormant —
         putting the section back is a matter of rendering a picker here and
         calling mmJoin(gid). */
      h += '<div class="mpx-sub"><span class="h-cap">Or join a friend’s</span></div>';
      h += '<div class="mpx-join"><input class="mp-input mp-code-in" id="mpCode" maxlength="5" placeholder="ABC12" value="' + esc(joinCode) + '" autocomplete="off" spellcheck="false" aria-label="Party code">' +
           '<button class="h-sec" id="mpJoin">Join</button></div>';
      if (joinErr) h += '<div class="mpx-err">' + esc(joinErr) + '</div>';
    } else {
      const list = memberList();
      h += '<div class="mpx-code"><div class="t"><span class="h-cap">Party code</span><span class="c">' + esc(roomId) + '</span></div>' +
        '<button class="h-sec" id="mpCopy">' + HI.copy + 'Copy</button></div>';
      h += '<div class="mpx-sub"><span class="h-cap">In this party · ' + list.length + '</span></div>';
      h += '<div class="mpx-mem mp-avrow">' + list.map(m =>
        '<div class="mpx-m">' + (m.host ? HI.crown : '') + avatar(m.name, 40) +
          '<span class="nm">' + esc(m.name.split(' ')[0]) + '</span>' +
          (isHost && m.id !== myId
            ? '<button class="mp-kick" data-kick="' + esc(m.id) + '" title="Remove ' + esc(m.name) +
              ' from the party" aria-label="Remove ' + esc(m.name) + ' from the party">×</button>'
            : '') +
        '</div>').join('') + '</div>';
      /* Only status a player can act on goes here. */
      if ((session && session.active) || (race && race.active)) {
        h += '<div class="mpx-note">A game is on — close this to keep playing.</div>';
      } else if (!isHost) {
        const hg = hostAt && byId[hostAt];
        h += '<div class="mpx-note"><span class="spinner"></span>' +
          (hg ? 'The host is setting up ' + esc(hg.title) + '…' : 'Waiting for the host to pick a game from the hub…') + '</div>';
      } else {
        h += '<div class="mpx-note">You’re the host: open any game with an Online badge to start it for everyone.</div>';
      }
      h += '<button class="h-cta warn" id="mpLeave">Leave party</button>';
    }
    if (body.__h !== h) {
      body.__h = h;
      body.innerHTML = h;
      wire(p);
      animate();
      if (focusId) {
        const f = p.querySelector('#' + focusId);
        if (f) {
          if (liveVal !== undefined && f.value !== liveVal) f.value = liveVal;
          f.focus();
          try { if (selA !== null) f.setSelectionRange(selA, selB); } catch (e) {}
        }
      }
    }
  }
  function wire(p) {
    const q = id => p.querySelector('#' + id);
    if (q('mpMake')) q('mpMake').onclick = () => { createRoom(); Sound.pickup(); paint(); };
    if (q('mpLeave')) q('mpLeave').onclick = () => leaveRoom();
    const avrow = p.querySelector('.mp-avrow');
    if (avrow) avrow.onclick = e => {
      const b = e.target.closest('[data-kick]'); if (!b) return;
      kick(b.getAttribute('data-kick'));
    };
    if (q('mpCopy')) q('mpCopy').onclick = () => {
      try { navigator.clipboard.writeText(roomId); showToast('Party code copied.'); } catch (e) { showToast('Code: ' + roomId); }
    };
    if (q('mpCode')) {
      /* record only — writing .value back would push the caret to the end
         on every keystroke, and .mp-code-in already uppercases in CSS */
      q('mpCode').oninput = e => { joinCode = e.target.value.toUpperCase(); };
      q('mpCode').onkeydown = e => { if (e.key === 'Enter') joinByCode(joinCode); };
    }
    if (q('mpJoin')) q('mpJoin').onclick = () => joinByCode(joinCode);
  }

  /* ------------------------------ chat -------------------------------------
     Works from the hub and from inside any game. Scope follows you: if you are
     in a party you're talking to the party, otherwise to everyone online. */
  const CHAT_MAX = 120;
  const CHAT_TTL = 30 * 60 * 1000;      // half an hour, then it is scrollback nobody reads
  const logs = { global: [], party: [] };
  /* Trim on a timer as well as on push: a quiet tab left open all day used to
     hold every message it had ever seen. This is memory only — broadcasts are
     never stored server-side, so pruning them cannot lower a Realtime bill. */
  function pruneChat() {
    const cut = now() - CHAT_TTL;
    let touched = false;
    for (const k in logs) {
      const arr = logs[k];
      let i = 0;
      while (i < arr.length && arr[i].t < cut) i++;
      if (i) { arr.splice(0, i); touched = true; }
      if (arr.length > CHAT_MAX) { arr.splice(0, arr.length - CHAT_MAX); touched = true; }
    }
    if (touched) drawChat();
  }
  setInterval(pruneChat, 60000);
  let chatOpen = false, unread = 0, lobbyChat = null;
  const chatScope = () => (room ? 'party' : 'global');
  function joinChatLobby() {
    if (lobbyChat) return;
    lobbyChat = chan('realtime:arcade-chat')
      .on('msg', p => { if (p && p.id !== myId) pushMsg('global', p.name, p.text); });
  }
  function pushMsg(scope, name, text, sys) {
    const arr = logs[scope];
    arr.push({ name, text, sys: !!sys, mine: name === myName() && !sys, t: now() });
    if (arr.length > CHAT_MAX) arr.shift();
    if (scope === chatScope()) {
      if (!chatOpen && !sys) { unread++; paintChatBadge(); }
      drawChat();
    }
  }
  function sendChat() {
    const inp = el('chatIn');
    const text = String(inp.value || '').trim().slice(0, 200);
    inp.value = '';
    if (!text) return;
    const scope = chatScope();
    const me = myName();
    pushMsg(scope, me, text);
    if (scope === 'party') { if (room) room.send('msg', { id: myId, name: me, text }); }
    else { joinChatLobby(); if (lobbyChat) lobbyChat.send('msg', { id: myId, name: me, text }); }
  }
  function drawChat() {
    const box = el('chatLog');
    if (!box) return;
    const arr = logs[chatScope()];
    el('chatWho').textContent = room ? '· party ' + roomId : '· everyone online';
    if (!arr.length) {
      box.innerHTML = '<div class="chat-empty">' + (room
        ? 'Party chat — only ' + esc(roomId) + ' can read this.'
        : 'You are talking to everyone who has this page open.<br>Join a party to chat privately.') + '</div>';
      return;
    }
    box.innerHTML = arr.map(m => '<div class="cmsg' + (m.mine ? ' me' : '') + (m.sys ? ' sys' : '') + '">' +
      (m.sys || m.mine ? '' : '<span class="cwho" style="color:hsl(' + hue(m.name) + ' 60% 60%)">' + esc(m.name) + '</span>') +
      '<span class="ctxt">' + esc(m.text) + '</span></div>').join('');
    box.scrollTop = box.scrollHeight;
  }
  function paintChatBadge() {
    const b = el('chatBadge');
    b.style.display = unread > 0 ? 'flex' : 'none';
    b.textContent = unread > 9 ? '9+' : unread;
    el('chatFab').classList.toggle('live', unread > 0);
  }
  function openChat() {
    chatOpen = true; unread = 0; paintChatBadge();
    el('chatDock').classList.add('open');
    drawChat();
    el('chatIn').focus();            // synchronous: no window where keys leak
  }
  function closeChat() {
    chatOpen = false;
    el('chatDock').classList.remove('open');
    el('chatIn').blur();
  }
  /* game input is silenced exactly while the chat box has focus, so clicking
     back onto the canvas hands control straight back to the game */
  el('chatIn').addEventListener('focus', () => Input.setActive(false));
  el('chatIn').addEventListener('blur', () => Input.setActive(!!cur));
  el('chatFab').onclick = openChat;
  el('chatClose').onclick = closeChat;
  el('chatForm').onsubmit = e => { e.preventDefault(); sendChat(); el('chatIn').focus(); };
  /* capture phase: swallow keys before the game or the shell can see them */
  addEventListener('keydown', e => {
    const t = document.activeElement;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    if (chatOpen && typing && t.id === 'chatIn') {
      if (e.key === 'Escape') { closeChat(); e.preventDefault(); }
      e.stopImmediatePropagation();   // never let a typed key reach the game
      return;
    }
    if (typing) return;
    if (e.key === 'Enter') {
      /* A word game needs Enter to mean "submit my guess". Chat only takes it
         back once that game is paused, finished, or gone. */
      let owned = false;
      try { owned = !!(cur && cur.wantsEnter && running && !modalOpen()); } catch (_) {}
      if (owned) return;
      openChat(); e.stopPropagation(); e.preventDefault();
    }
  }, true);
  joinChatLobby();

  /* ------------------------------ who's online ----------------------------
     One shared presence channel, tracked once — powers the "N players online"
     stat in the hub and the matchmaking queue below. */
  let onlineChan = null, onlineSince = 0, onlineSig = '';
  /* what this tab tells everyone online: its name, and the game it has
     open ('' in the hub), which is how a friends list can say "Playing …" */
  const onlineMeta = () => ({ n: myName(), g: cur ? cur.id : '' });
  function joinOnline() {
    if (onlineChan) return;
    onlineChan = chan('realtime:arcade-online', { presence: true })
      .on('_joined', () => { const m = onlineMeta(); onlineSig = m.n + '|' + m.g; onlineChan.track(m); })
      .on('_presence', () => {
        /* the first full picture of who is here: the friends list takes the
           people already online as its starting point rather than as news */
        if (!onlineSince) onlineSince = now();
        paint();
        try { heroStats(); } catch (e) {}
      });
  }
  /* Re-tracked when the game this tab has open changes. It waits for the
     change to settle — a launch closes one game and opens the next in the
     same breath — and a track is a message to everyone online, so it is
     never sent for a state that did not last. */
  let sigSeen = '', sigAt = 0;
  setInterval(() => {
    if (!onlineChan || !onlineChan.joined) return;
    const m = onlineMeta(), sig = m.n + '|' + m.g, t = now();
    if (sig !== sigSeen) { sigSeen = sig; sigAt = t; return; }
    if (sig !== onlineSig && t - sigAt >= 1200) { onlineSig = sig; onlineChan.track(m); }
  }, 600);
  /* people, not tabs: one account open in two tabs is one player online */
  const onlineN = () => {
    if (!onlineChan) return 1;
    const who = new Set();
    for (const k in onlineChan.presence) { const m = onlineChan.presence[k]; who.add(m && m.n ? String(m.n).toLowerCase() : k); }
    return Math.max(1, who.size);
  };
  /* the names currently tracked on the shared channel, each with the game
     they have open ('' for none) — the friends list reads this for its
     green dots and its "Playing …" lines. Someone with two tabs open is in
     a game if either tab is. */
  function onlineNames() {
    const out = Object.create(null);
    if (!onlineChan) return out;
    for (const k in onlineChan.presence) {
      const m = onlineChan.presence[k];
      if (!m || !m.n) continue;
      const key = String(m.n).toLowerCase(), g = m.g && byId[m.g] ? m.g : '';
      if (!out[key] || (!out[key].g && g)) out[key] = { g };
    }
    return out;
  }

  /* ------------------------------ matchmaking -----------------------------
     A queue channel. The seeker with the lowest id pairs the first two ids,
     broadcasts the party code, and both jump into that party. The id tiebreak
     means two players who both briefly believe they lead cannot split. */
  /* Matchmaking is per game, not per party. Queueing used to drop two
     strangers into an empty party and leave them staring at "pick a game",
     which is a negotiation, not a match. Now you queue for the game you
     actually want, the queue for that game is its own channel, and the
     moment two people are in it the leader opens the room and starts that
     game — so a match is a match. */
  let mmChan = null, mmActive = false, mmSince = 0, mmGid = null;
  function mmJoin(gid) {
    if (mmActive) return;
    if (!gid || !byId[gid] || !byId[gid].mp) { showToast('Pick a game to queue for.'); return; }
    mmActive = true; mmSince = now(); mmGid = gid;
    mmChan = chan('realtime:arcade-mm-' + gid, { presence: true })
      .on('_joined', () => mmChan.track({ id: myId, name: myName(), gid }))
      .on('_presence', mmCheck)
      .on('pair', p => {
        if (!p || !mmActive || p.gid !== mmGid) return;
        if (p.b === myId && p.a < myId) {         // accept only from a true leader
          mmLeave(true);
          joinByCode(p.room);
          showToast('Matched with ' + (p.an || 'a player') + ' — starting ' + (byId[p.gid] ? byId[p.gid].title : 'the game') + '…');
        }
      });
    paint();
  }
  function mmCheck() {
    if (!mmActive || !mmChan) return;
    const ids = Object.keys(mmChan.presence).sort();
    if (ids.length >= 2 && ids[0] === myId) {
      const partner = ids[1];
      const code = genCode();
      const gid = mmGid;
      mmChan.send('pair', { a: myId, b: partner, room: code, an: myName(), gid });
      mmLeave(true);
      roomId = code; isHost = true; joinRoom();
      logs.party.length = 0;
      pushMsg('party', '', 'Matched — starting ' + (byId[gid] ? byId[gid].title : gid) + '.', true);
      showToast('Matched! Starting ' + (byId[gid] ? byId[gid].title : 'the game') + '…');
      paint(); refreshHub(); drawChat();
      /* the guest still has to accept the pair and join the room, so the
         start waits for them rather than firing into an empty party */
      let tries = 0;
      const go = setInterval(() => {
        if (!room) { clearInterval(go); return; }
        if (memberList().length >= 2) { clearInterval(go); startGame(gid); return; }
        if (++tries > 24) { clearInterval(go); showToast('They never arrived — pick a game or queue again.'); }
      }, 500);
    }
  }
  function mmLeave(silent) {
    mmActive = false; mmGid = null;
    if (mmChan) { mmChan.leave(); mmChan = null; }
    if (!silent) paint();
  }
  const mmCount = () => mmChan ? Math.max(1, Object.keys(mmChan.presence).length) : 1;
  setInterval(() => {
    if (mmActive && now() - mmSince > 90000) { mmLeave(); showToast('No one else is searching right now.'); }
    else if (mmActive) paint();
  }, 1500);

  /* ------------------------------ boot ------------------------------------ */
  el('mpBtn').onclick = () => {
    /* parties are games too — same gate, so nobody joins a room anonymously */
    if (!acctSignedIn()) { Account.open('Sign in to play with friends.'); return; }
    const ov = el('mpov');
    ov.classList.toggle('on');
    if (ov.classList.contains('on')) {
      paint();
      if (!ws) { retries = 0; connect(); }
      announce();
    }
  };
  el('mpov').addEventListener('click', e => { if (e.target === el('mpov')) el('mpov').classList.remove('on'); });
  el('mpToast').querySelector('[data-tdec]').onclick = hideToast;
  /* Nothing goes on the wire before there is an account. The name every peer
     sees is the account username, so connecting first would announce a
     placeholder and put a signed-out tab in the online count — and behind the
     gate there is nothing to be online *for* yet. Account settles the session
     and then calls begin(). */
  let began = false;
  function begin() { if (began) return; began = true; connect(); joinOnline(); }
  refreshHub();   // the hub painted before this module existed — redraw so badges appear
  /* the hub's player count is a live figure, so it must not wait for a
     reload — presence events repaint it immediately and this is the floor */
  setInterval(() => {
    try { heroStats(); } catch (e) {}
    if (el('mpov') && el('mpov').classList.contains('on')) { try { paint(); } catch (e) {} }
  }, 2500);

  return {
    begin,
    get online() { return onlineN(); },
    onlineNames,
    /* when the online list was first complete (0: not yet) */
    get onlineSince() { return onlineSince; },
    dmChannel: topic => chan(topic),
    get myName() { return myName(); },
    get session() { return session; },
    get race() { return race; },
    get inRoom() { return !!room; },
    get partySize() { return partySize(); },
    get partyCode() { return roomId; },
    joinByCode: c => joinByCode(c),
    get isHost() { return isHost; },
    get myId() { return myId; },
    get myName() { return myName(); },
    endSession() { session = null; race = null; paint(); refreshHub(); },
    /* the accounts module lives outside this closure but wants the same toast
       and the same player chip, so they're published rather than duplicated */
    toast(msg) { showToast(msg); },
    avatarHtml(name, sz) { return avatar(name, sz); }
  };
})();

