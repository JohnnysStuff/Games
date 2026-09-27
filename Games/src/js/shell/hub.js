/* ============================================================================
   HUB — the page you land on

   The theme and sound toggles, the look of each game's card, the sections
   above the grid, the grid itself and the keyboard walk across it. The
   DOM handles the rest of the shell shares are taken here, first.
   ========================================================================== */
const el = id => document.getElementById(id);
const playEl = el('play'), gridEl = el('grid');
const ovEl = el('ov'), panelEl = el('panel'), hdrTitle = el('hdrTitle');

/* ---- theme ---- */
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.3A8.6 8.6 0 019.7 3.5a8.6 8.6 0 1010.8 10.8z"/></svg>';
const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6.5 9H3v6h3.5L11 19V5z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6.5 9H3v6h3.5L11 19V5z"/><path d="M16 10l5 4M21 10l-5 4"/></svg>';
const ICON_STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.8 5.9 6.2.9-4.5 4.5 1.1 6.4L12 17.2l-5.6 3.1 1.1-6.4L3 9.4l6.2-.9z"/></svg>';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  el('themeBtn').innerHTML = t === 'dark' ? ICON_SUN : ICON_MOON;
  Store.setPref('theme', t);
}
applyTheme(Store.getPref('theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
el('themeBtn').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

function applySound() { el('soundBtn').innerHTML = Sound.muted ? ICON_OFF : ICON_ON; }
applySound();
el('soundBtn').onclick = () => { Sound.setMuted(!Sound.muted); applySound(); if (!Sound.muted) Sound.blip(); };

/* ---- the bell: whether a friend coming online gets a notification ----
   Only the pref lives here; Friends (shell/accounts.js) reads it. */
const ICON_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11a6 6 0 0112 0v4.4l1.7 2.4H4.3L6 15.4z"/><path d="M10 20.6a2.2 2.2 0 004 0"/></svg>';
const ICON_BELL_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.2 6.3A6 6 0 0118 11v4.4l1.7 2.4H9.5M6.6 17.8H4.3L6 15.4V11c0-.6.1-1.2.3-1.8"/><path d="M10 20.6a2.2 2.2 0 004 0"/><path d="M3.6 3.6l16.8 16.8"/></svg>';
const notiOff = () => Store.getPref('friendNoti') === 'off';
function applyNoti() {
  const b = el('notiBtn'); if (!b) return;
  const off = notiOff();
  b.innerHTML = off ? ICON_BELL_OFF : ICON_BELL;
  b.title = off ? 'Friend notifications: off' : 'Friend notifications: on';
  b.setAttribute('aria-pressed', String(!off));
}
applyNoti();
function toggleNoti() {
  const off = !notiOff();
  Store.setPref('friendNoti', off ? 'off' : 'on');
  applyNoti();
  try { Friends.paint(true); } catch (e) {}      // its own copy of the switch, in the Friends tab
  try {
    Meta.toast(off ? 'Notifications muted' : 'Notifications on',
      off ? 'Friends coming online won’t pop up' : 'You’ll see when a friend comes online', '', 'user');
  } catch (e) {}
  if (!off) Sound.blip();
}
el('notiBtn').onclick = toggleNoti;

/* ---- hub ---- */
/* Search and sort, and no tag filter. The row of tag pills was a second way to
   do what the search box already does — the tags are still on every card and
   still searchable, so typing "puzzle" gets you there without a strip of
   twenty-four buttons above the grid. */
let query = '';

el('q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); renderHub(); });

let sortBy = Store.getPref('sort') || 'featured';
el('sortSel').value = sortBy;
el('sortSel').onchange = e => { sortBy = e.target.value; Store.setPref('sort', sortBy); renderHub(); };

const ICON_STAR_O = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.1l2.7 5.6 6 .9-4.35 4.3 1.05 6.1L12 17.1l-5.4 2.9 1.05-6.1L3.3 9.6l6-.9z"/></svg>';

/* ---------------------------------------------------------- the look -- */
/* Each game's own colour, for the glow under its card and the button on it.
   Picked by eye from each game's artwork rather than computed from it: the
   first gradient stop in most of them is the dark of the sky, not the thing
   you remember the game by. */
const ACCENT = {
  flappy: '#ffc53d', bricks: '#ff8f7a', golf: '#4ade80', pool: '#22c55e', sketch: '#c084fc', stack: '#7fd4ff',
  wordle: '#86efac', chess: '#cbd5e1', blast: '#a78bfa', pac: '#fde047', gdash: '#34d399', helix: '#f472b6',
  turf: '#fb923c', ninja: '#fb7185', crossy: '#7ac74f', casino: '#1fdc7c'
};
const accentOf = id => ACCENT[id] || 'var(--h-brand)';
const hEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* titles are written as HTML (an & is &amp;), so text uses of them undo it */
const plainTitle = t => String(t || '').replace(/&amp;/g, '&');
/* The first sentence of a tagline: a card has room for one thought, and
   the rest is still searchable. */
const firstLine = t => {
  const s = String(t || '').split(/(?<=[.!?])\s+/)[0];
  return s.length > 130 ? s.slice(0, 127).trim() + '…' : s;
};
/* A game's artwork as an image, for the places it appears small or twice.
   Inline, every copy shares one document, so two copies of the same art
   define the same gradient ids — and one inside a hidden element takes the
   other's colours with it. An image is a document of its own. */
const ART_URI = {};
function artUri(g) {
  if (!g) return '';
  if (ART_URI[g.id]) return ART_URI[g.id];
  let s = String(g.art || '');
  if (!/xmlns=/.test(s.slice(0, 240))) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return (ART_URI[g.id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
}
const HI = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.2 2.5 4.6 13.4a.8.8 0 0 0 .63 1.3H11l-1.1 6.8a.4.4 0 0 0 .72.3l8.6-10.9a.8.8 0 0 0-.63-1.3H13l1.1-6.8a.4.4 0 0 0-.72-.3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-1.8 4L16 12H5"/></svg>',
  medal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 9.8 6 3h4l2 4 2-4h4l-2.5 6.8"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="3"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M3 20c.4-3.5 2.9-5.6 6-5.6s5.6 2.1 6 5.6"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.6 14.6c2 .6 3.2 2.5 3.4 5.2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.6-4 3.6-6.3 7.5-6.3s6.9 2.3 7.5 6.3"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="3.6"/><path d="M3.5 20c.5-3.7 3.2-5.8 6.5-5.8 1.4 0 2.7.4 3.8 1.1"/><path d="M18 14v6M15 17h6"/></svg>',
  crown: '<svg class="cr" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8.5l4.5 3.5L12 5l4.5 7L21 8.5 19 18H5z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5.5a5 5 0 0 1-10 0V4z"/><path d="M17 5.5h2.2a.8.8 0 0 1 .8.8v.7A3.8 3.8 0 0 1 16.6 11M7 5.5H4.8a.8.8 0 0 0-.8.8v.7A3.8 3.8 0 0 0 7.4 11"/><path d="M12 14.5v3M8.5 20.5h7M9.8 20.5l.5-3h3.4l.5 3"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="M4.5 7.5l7.5 5.5 7.5-5.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
};

/* the online badge a card wears: what the party can do with it, or how many seats */
function coopBadge(g) {
  if (!g.mp) return '';
  let room = false, host = false;
  try { room = !!MP.inRoom; host = !!MP.isHost; } catch (e) {}
  const lo = g.mpMin || 2, hi = g.mpMax || 8;
  const seats = lo === hi ? lo + 'P' : lo + '–' + hi + 'P';
  return '<span class="badge-coop' + (room && host ? ' go' : '') + '"><i></i>' +
    (!room ? 'Online · ' + seats : host ? 'Start online' : 'Host starts') + '</span>';
}

function heroStats() {
  const played = GAMES.filter(g => Store.plays(g.id) > 0).length;
  // try/catch, not typeof: `typeof MP` still throws while the const is in its
  // temporal dead zone, and the hub first paints during MP's construction
  let live = null;
  try { live = MP.online || null; } catch (e) {}
  let name = '';
  try { name = (Account.user && Account.user.username) || ''; } catch (e) {}
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  /* The greeting is built once and then only its words change, so the line
     that rose in on arrival never rises again when a number ticks. */
  const hs = el('heroStats');
  if (hs) {
    if (!hs.querySelector('.h-hello')) {
      hs.innerHTML = '<div class="h-hello h-rise"><h1></h1><p></p></div>';
    }
    const h1 = hs.querySelector('h1'), p = hs.querySelector('p');
    const hh = hEsc(greet) + (name ? ',<br><em>' + hEsc(name) + '</em>' : '');
    if (h1.__h !== hh) { h1.__h = hh; h1.innerHTML = hh; }
    const ph = '<b>' + GAMES.length + '</b> games &nbsp;·&nbsp; <b>' + fmt(Store.totalPlays) + '</b> rounds played &nbsp;·&nbsp; <b>' +
      played + '/' + GAMES.length + '</b> tried';
    if (p.__h !== ph) { p.__h = ph; p.innerHTML = ph; }
  }
  const lv = el('hdrLive');
  if (lv) {
    const b = lv.querySelector('b'), t = live === null ? '…' : fmt(live);
    if (b && b.textContent !== t) b.textContent = t;
  }
  const gc = el('gameCount');
  if (gc && gc.textContent !== String(GAMES.length)) gc.textContent = GAMES.length;
}

/* ---------------------------------------------------------- hub sections */
/* Everything between the header and the game grid is a registered section.
   The hub used to build that area inline, which meant adding or removing a
   strip was surgery on one long render function and the order of the strips
   was the order of the string concatenation. A section is `{ id, order,
   when, html, patch? }`: `when` decides whether it appears at all this paint,
   `html` returns its markup, and `order` is the only thing that decides where
   it goes. A section that changed is updated in place by its `patch` when it
   has one (so its numbers can move rather than jump), and only rebuilt when
   that says it cannot be; an unchanged one is not touched at all. */
const HubSections = (() => {
  const list = [];
  return {
    add(def) {
      if (!def || !def.id) return null;
      this.remove(def.id);
      list.push(def);
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      return def;
    },
    remove(id) {
      const i = list.findIndex(s => s.id === id);
      if (i >= 0) list.splice(i, 1);
    },
    paint() {
      let box = el('rails');
      if (!box) {
        const hero = document.querySelector('#hub .hero');
        if (!hero) return;
        box = document.createElement('div');
        box.id = 'rails';
        hero.parentNode.insertBefore(box, hero.nextSibling);
      }
      const parts = [];
      for (const s of list) {
        /* a section that throws must not take the rest of the hub with it */
        try {
          if (s.when && !s.when()) continue;
          const part = s.html();
          if (part) parts.push([s, part]);
        } catch (e) {}
      }
      const sig = parts.map(p => p[0].id).join('|');
      if (box.__sig === sig) {
        for (const [s, part] of parts) {
          const node = box.querySelector('[data-sec="' + s.id + '"]');
          if (!node || node.__h === part) continue;
          let done = false;
          try { done = !!(s.patch && s.patch(node)); } catch (e) {}
          if (!done) node.innerHTML = part;
          node.__h = part;
        }
        return;
      }
      box.__sig = sig;
      box.innerHTML = parts.map(([s, part]) => '<div class="hsec" data-sec="' + s.id + '">' + part + '</div>').join('');
      [...box.children].forEach((n, i) => { n.__h = parts[i][1]; });
    }
  };
})();

/* The top of the hub: today's challenge as a poster on the left, and you on
   the right — level, what is left to the next one, coins, the daily streak,
   how much of the shelf you have tried, and the three places progress lives.
   None of it repeats the grid below, which is the test a section has to pass
   to earn its height. */
const RING_R = 29, RING_C = 2 * Math.PI * RING_R;
function meState() {
  const L = Meta.level, coins = Meta.coins;
  const streak = (Meta.data && Meta.data.streak) || { n: 0 };
  const tried = GAMES.filter(g => Store.plays(g.id) > 0).length;
  const frac = L.need ? clamp(L.into / L.need, 0, 1) : 0;
  return { L, coins, streak: streak.n || 0, tried, frac };
}
HubSections.add({
  id: 'spotlight', order: 10,
  when: () => { try { return !!Meta && !!Meta.level; } catch (e) { return false; } },
  html() {
    const S = meState();
    let d = null;
    try { d = Meta.dailyInfo(); } catch (e) {}
    const g = d && byId[d.id];
    const daily = g
      ? '<button class="h-daily h-rise' + (d.done ? ' done' : '') + '" data-play="' + g.id + '" data-daily="' + g.id + (d.done ? ':done' : '') + '">' +
          '<span class="h-art" aria-hidden="true">' + g.art + '</span>' +
          '<span class="h-in">' +
            '<span class="h-tag">' + (d.done ? HI.check + 'Done today' : HI.bolt + 'Today’s challenge') + '</span>' +
            '<h2>' + g.title + '</h2>' +
            '<p>' + (d.done ? 'Finished — a new one lands tomorrow. It still counts as a round if you go again.' : hEsc(firstLine(g.tagline))) + '</p>' +
            (d.done ? '' : '<span class="h-rw"><span>+100 XP</span><span>+60 coins</span></span>') +
            '<span class="h-go"><i>' + HI.play + '</i>' + (d.done ? 'Play again' : 'Play now') + '</span>' +
          '</span>' +
        '</button>'
      : '';
    const me =
      '<div class="h-me h-rise">' +
        '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="hRingG" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" style="stop-color:var(--h-brand)"/><stop offset="1" style="stop-color:var(--h-brand2)"/></linearGradient></defs></svg>' +
        '<div class="h-me-top">' +
          '<div class="h-ring"><svg viewBox="0 0 66 66" aria-hidden="true"><circle class="t" cx="33" cy="33" r="' + RING_R + '" fill="none" stroke-width="6"/>' +
            '<circle class="f" data-k="ring" cx="33" cy="33" r="' + RING_R + '" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + RING_C.toFixed(1) +
            '" style="stroke-dashoffset:' + (RING_C * (1 - S.frac)).toFixed(1) + '"/></svg><b data-k="lvl">' + S.L.lvl + '</b></div>' +
          '<div class="h-me-t"><span class="h-cap">Your progress</span><b data-k="lvlT">Level ' + S.L.lvl + '</b>' +
            '<span data-k="toNext">' + fmt(Math.max(0, S.L.need - S.L.into)) + ' XP to level ' + (S.L.lvl + 1) + '</span></div>' +
        '</div>' +
        '<div class="h-bar"><i data-k="bar" style="width:' + (S.frac * 100).toFixed(1) + '%"></i></div>' +
        '<div class="h-tiles">' +
          '<button class="h-tile" data-open="shop"><b><i></i><span data-k="coins">' + fmt(S.coins) + '</span></b><span class="h-cap">Coins</span></button>' +
          '<button class="h-tile' + (S.streak > 0 ? ' hot' : '') + '" data-k="streakT" data-open="quests"><b data-k="streak">' + S.streak + '</b><span class="h-cap">Day streak</span></button>' +
          '<button class="h-tile" data-open="stats"><b data-k="tried">' + S.tried + '/' + GAMES.length + '</b><span class="h-cap">Tried</span></button>' +
        '</div>' +
        '<div class="h-me-foot">' +
          '<button class="h-btn" data-open="quests">' + HI.flag + 'Quests</button>' +
          '<button class="h-btn" data-open="ach">' + HI.medal + 'Awards</button>' +
          '<button class="h-btn" data-open="shop">' + HI.bag + 'Shop</button>' +
        '</div>' +
      '</div>';
    return '<div class="h-band' + (daily ? '' : ' solo') + '">' + daily + me + '</div>';
  },
  /* New XP, coins or a streak after a round: the ring and the bar slide to
     the new values instead of the card being rebuilt at them. Only a change
     of day (a new challenge, or today's being done) rebuilds the section. */
  patch(node) {
    const dl = node.querySelector('[data-daily]');
    let d = null;
    try { d = Meta.dailyInfo(); } catch (e) {}
    const want = d && byId[d.id] ? d.id + (d.done ? ':done' : '') : '';
    if ((dl ? dl.getAttribute('data-daily') : '') !== want) return false;
    const S = meState();
    const q = k => node.querySelector('[data-k="' + k + '"]');
    const set = (k, v) => { const n = q(k); if (n && n.textContent !== String(v)) n.textContent = v; };
    const ring = q('ring'); if (ring) ring.style.strokeDashoffset = (RING_C * (1 - S.frac)).toFixed(1);
    const bar = q('bar'); if (bar) bar.style.width = (S.frac * 100).toFixed(1) + '%';
    set('lvl', S.L.lvl); set('lvlT', 'Level ' + S.L.lvl);
    set('toNext', fmt(Math.max(0, S.L.need - S.L.into)) + ' XP to level ' + (S.L.lvl + 1));
    set('coins', fmt(S.coins)); set('streak', S.streak); set('tried', S.tried + '/' + GAMES.length);
    const st = q('streakT'); if (st) st.classList.toggle('hot', S.streak > 0);
    return true;
  }
});

function renderHub() {
  const list = GAMES.filter(g => {
    if (!query) return true;
    return (plainTitle(g.title) + ' ' + g.tagline + ' ' + g.tags.join(' ')).toLowerCase().includes(query);
  });
  const order = GAMES.map(g => g.id);

  /* In a party, what you can actually start with the people you have comes
     first and everything else is dimmed with the reason on it. Outside a party
     nothing is gated - playing on your own is still the common case. MP is
     built after the shell, so during the very first paint it is still in its
     temporal dead zone and reading it throws; hence the catch. */
  let psize = 0;
  try { psize = MP.inRoom ? MP.partySize : 0; } catch (e) {}
  const gate = g => {
    if (!psize) return null;
    if (!g.mp) return 'Solo only';
    const lo = g.mpMin || 2, hi = g.mpMax || 8;
    if (psize < lo) return 'Needs ' + lo + (hi > lo ? '+' : '');
    if (psize > hi) return 'Up to ' + hi;
    return null;
  };

  list.sort((a, b) => {
    // what the party can play outranks everything, including a pin
    if (psize) { const la = gate(a) ? 1 : 0, lb = gate(b) ? 1 : 0; if (la !== lb) return la - lb; }
    // pinned games always float to the top, then whatever sort is chosen
    const fa = Store.fav(a.id) ? 1 : 0, fb = Store.fav(b.id) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    if (sortBy === 'az') return plainTitle(a.title).localeCompare(plainTitle(b.title));
    if (sortBy === 'recent') return Store.seenAt(b.id) - Store.seenAt(a.id) || order.indexOf(a.id) - order.indexOf(b.id);
    if (sortBy === 'most') return Store.plays(b.id) - Store.plays(a.id) || order.indexOf(a.id) - order.indexOf(b.id);
    if (sortBy === 'best') return Store.best(b.id) - Store.best(a.id) || order.indexOf(a.id) - order.indexOf(b.id);
    return order.indexOf(a.id) - order.indexOf(b.id);
  });
  el('noRes').style.display = list.length ? 'none' : '';
  const pn = el('partyNote');
  if (pn) {
    if (!psize) pn.style.display = 'none';
    else {
      const ok = list.filter(g => !gate(g)).length;
      pn.style.display = '';
      pn.innerHTML = '<b>Party of ' + psize + '</b>&nbsp;· ' + ok + ' of ' + list.length +
        ' playable together, the rest are dimmed.';
    }
  }

  /* A card is art first: the picture, the name in the house face, one line
     of what it is, and what you have done with it. */
  const items = list.map((g, i) => {
    const best = Store.best(g.id), fav = Store.fav(g.id), plays = Store.plays(g.id), need = gate(g);
    const tags = g.tags.filter(t => t !== 'Online').slice(0, 2);
    return [g.id,
      '<button class="gc' + (fav ? ' is-fav' : '') + (need ? ' locked' : '') + '" data-id="' + g.id + '" style="--ac:' + accentOf(g.id) + ';--i:' + i + '">' +
        '<span class="gc-in"><span class="gc-art"><span class="gc-pic" aria-hidden="true">' + g.art + '</span>' +
          (need ? '<span class="badge-need">' + need + '</span>' : coopBadge(g)) +
          (Store.last === g.id && !need ? '<span class="badge-last">Last played</span>' : '') +
          '<span class="fav' + (fav ? ' on' : '') + '" data-fav="' + g.id + '" role="button" tabindex="0" ' +
            'aria-label="' + (fav ? 'Unpin' : 'Pin') + ' ' + hEsc(plainTitle(g.title)) + '">' + (fav ? ICON_STAR : ICON_STAR_O) + '</span>' +
          '<span class="gc-play"><i>' + HI.play + '</i>' + (plays ? 'Play again' : 'Play') + '</span>' +
        '</span>' +
        '<span class="gc-body">' +
          '<span class="gc-top"><h3>' + g.title + '</h3>' + (best ? '<span class="gc-best">' + ICON_STAR + fmt(best) + '</span>' : '') + '</span>' +
          '<p>' + hEsc(firstLine(g.tagline)) + '</p>' +
          '<span class="gc-foot">' + tags.map(t => '<span class="gc-t">' + t + '</span>').join('') +
            '<span class="gc-n">' + (plays ? plays + (plays === 1 ? ' round' : ' rounds') : 'Not played yet') + '</span></span>' +
        '</span></span>' +
      '</button>'];
  });

  /* Nothing is rebuilt that did not change. The party layer repaints the hub
     on every presence event, and rebuilding the grid each time would pull
     the card out from under the pointer mid-hover and restart its motion. So:
     the same cards in the same order are patched one by one, and only a new
     order (a sort, a search, a pin) rebuilds — with every card that survives
     gliding from where it was to where it now is. */
  const sig = items.map(x => x[0]).join(',');
  if (gridEl.__sig === sig) {
    const kids = gridEl.children;
    items.forEach(([id, h], i) => {
      const node = kids[i];
      if (!node || node.__h === h) return;
      const t = document.createElement('template');
      t.innerHTML = h;
      const nn = t.content.firstElementChild;
      nn.__h = h;
      if (node.classList.contains('kb')) nn.classList.add('kb');
      node.replaceWith(nn);
    });
  } else {
    const had = gridEl.__sig !== undefined;
    const rects = new Map();
    if (had) gridEl.querySelectorAll('.gc').forEach(c => rects.set(c.dataset.id, c.getBoundingClientRect()));
    gridEl.__sig = sig;
    gridEl.innerHTML = items.map(x => x[1]).join('');
    [...gridEl.children].forEach((n, i) => { n.__h = items[i][1]; });
    kbIndex = -1;
    if (had) { gridEl.classList.remove('h-deal'); glideCards(rects); }
  }
  heroStats();
  /* Meta is built after the shell, so the very first paint happens while it
     is still in its temporal dead zone — it repaints the sections itself once
     it exists. */
  try { HubSections.paint(); } catch (e) {}
}

/* FLIP: every card that was on screen before starts where it was and glides
   to its new place; new ones fade up into theirs. The individual `translate`
   and `scale` properties are animated rather than `transform`, which the
   card's own hover and tilt are using. */
function glideCards(rects) {
  let reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce || !gridEl.animate) return;
  let fresh = 0;
  const vh = innerHeight;
  gridEl.querySelectorAll('.gc').forEach(c => {
    const a = rects.get(c.dataset.id), b = c.getBoundingClientRect();
    if (b.bottom < -200 || b.top > vh + 200) return;                 // off screen: no need
    if (a) {
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      c.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }],
                { duration: 640, easing: 'cubic-bezier(.16,1,.3,1)' });
    } else {
      c.animate([{ opacity: 0, scale: '.9', translate: '0 14px' }, { opacity: 1, scale: '1', translate: '0 0' }],
                { duration: 560, delay: Math.min(fresh++, 14) * 28, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    }
  });
}

/* The card under the pointer leans towards it a few degrees, its picture
   drifts the other way, and a soft light follows the pointer across it. The
   pointer only sets targets; the card's own transition does the easing, so
   the motion always trails smoothly behind the hand. */
(() => {
  let card = null, raf = 0, px = 0, py = 0, rect = null;
  const clear = c => { if (!c) return; ['--rx', '--ry', '--mx', '--my', '--px', '--py'].forEach(k => c.style.removeProperty(k)); };
  gridEl.addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const c = e.target.closest('.gc');
    if (c !== card) { clear(card); card = c; rect = c ? c.getBoundingClientRect() : null; }
    if (!c || c.classList.contains('locked')) return;
    px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!card || !rect) return;
      const x = clamp((px - rect.left) / rect.width, 0, 1), y = clamp((py - rect.top) / rect.height, 0, 1);
      card.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      card.style.setProperty('--px', ((.5 - x) * 12).toFixed(1) + 'px');
      card.style.setProperty('--py', ((.5 - y) * 9).toFixed(1) + 'px');
    });
  }, { passive: true });
  gridEl.addEventListener('pointerleave', () => { clear(card); card = null; rect = null; });
  addEventListener('scroll', () => { rect = card ? card.getBoundingClientRect() : null; }, { passive: true });
})();

/* The first time the shelf is shown it deals itself in; after that the
   class goes, so a later rebuild glides instead of dealing again. */
gridEl.addEventListener('animationend', e => {
  if (e.animationName === 'hDeal' && e.target === gridEl.lastElementChild) gridEl.classList.remove('h-deal');
});
el('hub').addEventListener('animationend', e => {
  if (e.animationName === 'hRise' && e.target.classList && e.target.classList.contains('h-me')) el('hub').classList.remove('h-enter');
});
/* the header gains its edge once the page has moved under it */
addEventListener('scroll', () => {
  const s = scrollY > 6;
  if (s !== document.body.classList.contains('h-scrolled')) document.body.classList.toggle('h-scrolled', s);
}, { passive: true });

/* The sort is a menu of our own. The native select stays in the page as the
   thing that holds the value — the rest of the hub already reads and listens
   to it — and the menu just drives it. */
(() => {
  const dd = el('sortDd'), b = el('sortDdB'), m = el('sortDdM'), sel = el('sortSel'), lab = el('sortDdL');
  if (!dd || !sel) return;
  const opts = [...sel.options].map(o => [o.value, o.textContent]);
  const paint = () => {
    m.innerHTML = opts.map(([v, t]) =>
      '<button role="menuitemradio" aria-checked="' + (v === sel.value) + '" data-v="' + v + '">' + t + HI.check + '</button>').join('');
    lab.textContent = (opts.find(o => o[0] === sel.value) || opts[0])[1];
  };
  const open = v => { dd.classList.toggle('open', v); b.setAttribute('aria-expanded', String(v)); };
  b.onclick = e => { e.stopPropagation(); open(!dd.classList.contains('open')); try { Sound.blip(); } catch (_) {} };
  m.onclick = e => {
    const it = e.target.closest('[data-v]'); if (!it) return;
    if (sel.value !== it.dataset.v) {
      sel.value = it.dataset.v;
      sel.dispatchEvent(new Event('change'));
      paint();
    }
    setTimeout(() => open(false), 140);
  };
  /* the select can be changed from elsewhere too; the label follows it */
  sel.addEventListener('change', paint);
  document.addEventListener('click', e => { if (!dd.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && dd.classList.contains('open')) { e.stopPropagation(); open(false); } }, true);
  paint();
})();

/* ---- keyboard on the grid ----
   The hub was mouse-only: tab reached the cards in DOM order, which on a
   four-column grid is nothing like the order they are laid out in. Arrows
   walk the grid as it looks, and the walk works out the column count from
   the cards' own positions rather than from a guessed breakpoint. */
let kbIndex = -1;
function kbCards() { return [...gridEl.querySelectorAll('.gc')]; }
function kbMove(dx, dy) {
  const cards = kbCards();
  if (!cards.length) return;
  /* how many cards share the first row's top edge */
  const top = cards[0].offsetTop;
  let cols = cards.findIndex(c => c.offsetTop > top);
  if (cols < 0) cols = cards.length;
  let i = kbIndex < 0 ? 0 : clamp(kbIndex + dx + dy * cols, 0, cards.length - 1);
  if (kbIndex >= 0 && dx && ((kbIndex % cols === 0 && dx < 0) || (kbIndex % cols === cols - 1 && dx > 0))) i = kbIndex;
  kbIndex = i;
  cards.forEach((c, n) => c.classList.toggle('kb', n === i));
  const sel = cards[i];
  if (sel) { sel.focus({ preventScroll: true }); sel.scrollIntoView({ block: 'nearest' }); }
}
/* capture phase so the star never counts as "open this game" */
gridEl.addEventListener('click', e => {
  const s = e.target.closest('[data-fav]');
  if (!s) return;
  e.stopPropagation(); e.preventDefault();
  const id = s.getAttribute('data-fav');
  Store.fav(id, !Store.fav(id));
  Sound.blip();
  renderHub();
}, true);
gridEl.onclick = e => {
  const c = e.target.closest('.gc'); if (!c) return;
  location.hash = '#/' + c.dataset.id;
};
el('randBtn').onclick = () => {
  const pool = GAMES.filter(g => g.id !== Store.last);
  const g = pick(pool.length ? pool : GAMES);
  Sound.blip();
  location.hash = '#/' + g.id;
};

