/* ============================================================================
   LEDGER — the end-of-round card

   What the round did and what it paid, read back line by line. The money is
   itemised on purpose: a total nobody can account for is worse than no total
   at all, so every coin arrives with its own name next to it.
   ========================================================================== */
function showEnd(res) {
  const score = Math.max(0, Math.round(res.score || 0));
  /* A cheated run is played, scored on screen, and then dropped: the personal
     best and the global board are the two numbers other people see, and a
     score that came out of the cheat panel has no business in either. */
  const cheated = Cheats.tainted(cur.id);
  const isBest = cheated ? false : Store.submit(cur.id, score);
  /* fire-and-forget; the server keeps whichever is higher and it is a no-op
     while signed out, so nothing here depends on being online */
  if (!cheated) { try { Account.push(cur.id, score); } catch (e) {} }
  /* progression reads the result rather than the score board, because it
     needs to know whether this round *became* the best, not what the best is */
  let led = null;
  try { led = Meta.roundEnd(cur, score, Object.assign({}, res, { wasBest: isBest })); } catch (e) {}
  const best = Store.best(cur.id);

  /* titles carry player names, which are typed by players */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const paid = (led && led.paid) || [];
  const earned = (led && led.coins) || 0;
  const purse = led ? led.purse : (Meta.coins || 0);
  const L = (led && led.after) || Meta.level;
  const stats = [{ label: cur.scoreLabel || 'Score', value: fmt(score) }]
    /* on a new best the two numbers are the same, and a column that repeats
       the one next to it is just noise */
    .concat(best > 0 && best !== score ? [{ label: 'Best', value: fmt(best) }] : [])
    .concat(res.stats || []);

  const tag = isBest && score > 0 ? 'New personal best'
            : cheated ? 'Not saved — a cheat was on' : '';

  /* The round as data: everything the card says. A game with a results page
     of its own (`results(R)` on its instance, drawn with FrontKit) takes it
     from here; anything else gets the card below. */
  const R = {
    res, score, best, cheated, win: !!res.win,
    isBest: isBest && score > 0,
    title: res.title || 'Round over', message: res.message || '',
    scoreLabel: cur.scoreLabel || 'Score',
    stats, gameStats: res.stats || [], tag,
    paid, earned, purse, purse0: purse - earned,
    level: { before: (led && led.before) || L, after: L, up: !!(led && led.levelUp) },
    claimable: (led && led.claimable) || 0,
    standings: res.standings || null, place: res.place || 0,
    menuOk: frontReady(),
    act(k) { if (k === 'again') start(); else if (k === 'menu') showFront(); else location.hash = ''; }
  };
  const sting = () => { if (res.sting !== false) { if (res.win) Sound.win(); else Sound.fail(); } };
  if (inst && inst.results) {
    ovEl.classList.remove('on', 'lg-ov'); ovEl.onclick = null; panelEl.innerHTML = '';
    let taken = false;
    try { inst.results(R); taken = true; } catch (e) { taken = false; }
    if (taken) { sting(); return; }
  }

  panelEl.innerHTML =
    '<div class="lg">' +
      '<div class="lg-head">' +
        '<div>' +
          '<div class="lg-verdict" id="lgV">' + esc(res.title || 'Round over') + '</div>' +
          '<div class="lg-where lg-cap" id="lgW">' + esc(res.message || '') + '</div>' +
        '</div>' +
        '<div class="lg-purse" id="lgP"><span class="lg-cap">Coins</span><b class="num" id="lgPn">' + fmt(purse - earned) + '</b></div>' +
      '</div>' +
      (tag ? '<span class="lg-tag' + (cheated ? ' bad' : '') + '" id="lgT">' + tag + '</span>' : '') +
      '<div class="lg-rule" id="lgR1"></div>' +
      '<div class="lg-stats" id="lgS">' +
        stats.map((s, i) => '<div class="lg-stat" data-i="' + i + '"><b class="num">' + esc(s.value) +
                            '</b><span class="lg-cap">' + esc(s.label) + '</span></div>').join('') +
      '</div>' +
      (paid.length
        ? '<div class="lg-rule" id="lgR2"></div>' +
          '<div id="lgRows">' +
            paid.map(l => '<div class="lg-row"><span class="lbl">' + esc(l.label) + '</span>' +
              (l.note ? '<span class="note num">' + esc(l.note) + '</span>' : '') +
              '<span class="led"></span><span class="amt num">+' + fmt(l.coins) + '</span></div>').join('') +
          '</div>' +
          '<div class="lg-total" id="lgTot"><span class="lbl">Total</span><span class="led"></span>' +
            '<span class="amt num" id="lgTotN">+0</span></div>'
        : '') +
      '<div class="lg-xp" id="lgX">' +
        '<div class="lg-xpbar"><i id="lgXF"></i></div>' +
        '<div class="lg-xplab lg-cap"><span id="lgXL">Level ' + L.lvl + '</span>' +
        '<span class="num">' + fmt(L.into) + ' / ' + fmt(L.need) + ' XP</span></div>' +
      '</div>' +
      (led && led.claimable
        ? '<div class="lg-note lg-cap" id="lgN">' + led.claimable +
          (led.claimable === 1 ? ' quest ready to claim' : ' quests ready to claim') + '</div>'
        : '') +
      /* a race's final standings, when there was a race */
      (R.standings
        ? '<div class="lg-rule"></div><div class="lg-cap" style="margin-bottom:6px">Final standings</div>' +
          R.standings.map((p, i) => '<div class="lg-row" style="opacity:1"><span class="lbl">' + (i + 1) + '. ' + esc(p.name) +
            (p.me ? ' (you)' : '') + '</span><span class="led"></span><span class="amt num">' + fmt(p.score) + '</span></div>').join('')
        : '') +
      '<div class="lg-bar" id="lgB">' +
        '<div class="lg-acts"><button class="lg-act" id="hubBtn">Hub</button>' +
          (frontReady() ? '<button class="lg-act" id="menuBtn">Menu</button>' : '') + '</div>' +
        '<button class="lg-act prim" id="againBtn">Play again <kbd>space</kbd></button>' +
      '</div>' +
    '</div>';

  el('againBtn').onclick = start;
  el('hubBtn').onclick = () => { location.hash = ''; };
  /* back to the game's own front page without leaving the game */
  if (el('menuBtn')) el('menuBtn').onclick = showFront;
  ovEl.classList.add('on', 'lg-ov');

  /* ---- and now it is read back, one line at a time ---- */
  const S = Tween.STAGGER;
  let t = 0;
  Tween.rise(el('lgV'), t, 12);
  Tween.rise(el('lgW'), t += S);
  Tween.rise(el('lgP'), t += S);
  if (el('lgT')) Tween.pop(el('lgT'), t += S);
  t += S;
  Tween.wipe(el('lgR1'), t);
  t += 90;
  [...panelEl.querySelectorAll('.lg-stat')].forEach((n, i) => Tween.pop(n, t + i * S, 340));
  t += stats.length * S + 60;

  if (paid.length) {
    Tween.wipe(el('lgR2'), t);
    t += 130;
    const rows = [...panelEl.querySelectorAll('.lg-row')];
    rows.forEach((n, i) => {
      Tween.rise(n, t + i * S, 0, -14, 240);
      if (!Tween.still()) setTimeout(() => { try { Sound.blip(); } catch (e) {} }, t + i * S);
    });
    t += rows.length * S + 180;
    const tot = el('lgTot');
    tot.style.borderColor = 'rgba(201,162,74,.3)';
    Tween.pop(tot, t, 420);
    Tween.count(el('lgTotN'), 0, earned, t, '+');
    Tween.count(el('lgPn'), purse - earned, purse, t);
    if (!Tween.still()) setTimeout(() => {
      try { Sound.coin(); } catch (e) {}
      tot.style.transition = 'border-color .5s var(--ease)';
      tot.style.borderColor = 'rgba(201,162,74,.9)';
      setTimeout(() => { tot.style.borderColor = ''; }, 420);
    }, t);
    t += 240;
  }

  Tween.rise(el('lgX'), t);
  /* a level crossed this round fills the bar from empty, so the new level is
     something you watch happen rather than something you are told */
  Tween.width(el('lgXF'), L.into / Math.max(1, L.need) * 100, t + 120, 700);
  if (led && led.levelUp) Tween.pop(el('lgXL'), t + 520, 460);
  if (el('lgN')) Tween.rise(el('lgN'), t += S);
  Tween.rise(el('lgB'), t + 160);

  /* One press or click finishes everything in flight; the next one plays
     again, which is the same key either way. */
  let skipped = Tween.still();
  const finish = () => { if (skipped) return false; skipped = true; Tween.finishAll(); return true; };
  ovEl.onclick = e => { if (e.target === ovEl || panelEl.contains(e.target) && e.target.tagName !== 'BUTTON') finish(); };
  const keys = e => {
    /* the markup outlives the screen — the overlay's own class is the only
       honest answer to "is the ledger still up", and without it a later
       press would restart a round that is already being played */
    if (!ovEl.classList.contains('lg-ov') || !ovEl.classList.contains('on')) {
      removeEventListener('keydown', keys, true); return;
    }
    if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    e.preventDefault();
    if (!finish()) start();
  };
  addEventListener('keydown', keys, true);

  /* a game that has already played its own ending says `sting: false` */
  sting();
}
