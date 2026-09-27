/* ====================================================== ALL IN: THE KIT ===
   What the tables in games/all-in/ share. Each of those files pushes one
   entry onto ALLIN_TABLES (see all-in.js); this one pushes only styling, and
   keeps the few pieces of furniture more than one table stands on:

     res(C, host)          the result card that pops over a board
     ladder(C, host)       the row of multipliers a streak game climbs
     chip(C, value)        a casino chip, for the tables you bet on by chips
     chipLabel(cents)      what a chip of that value says on its face
     burst(C, host, x, y)  a spray of confetti, for the wins worth one

   Everything is money in cents and multipliers in hundredths, the same as
   the rest of the casino. */
const AIK = (() => {
  const CSS = `
/* ---- the kit: result card variants ---- */
.cs-res.gold{border-color:var(--gd);box-shadow:0 20px 50px -10px rgba(0,0,0,.8),0 0 50px -8px var(--gd)}
.cs-res.gold .x{color:var(--gd);text-shadow:0 0 30px rgba(255,201,63,.5)}
.cs-res .sub{margin-top:3px;font-size:10.5px;font-weight:750;letter-spacing:.16em;text-transform:uppercase;color:var(--mu)}
.cs-res .sub:empty{display:none}

/* ---- the kit: the streak ladder ---- */
.ak-lad{position:relative;overflow:hidden;padding:4px 2px;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 18px,#000 calc(100% - 30px),transparent);
  mask-image:linear-gradient(90deg,transparent,#000 18px,#000 calc(100% - 30px),transparent)}
.ak-lad .in{display:flex;gap:6px;width:max-content;padding:0 16px;transition:transform .5s var(--ez)}
.ak-step{position:relative;flex:none;min-width:66px;height:46px;padding:0 10px;border-radius:11px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:1px;background:var(--pn2);border:1px solid var(--ln);color:var(--mu);
  transition:background .3s,border-color .3s,color .3s,transform .35s var(--sp),box-shadow .3s}
.ak-step b{font-size:13.5px;font-weight:800}
.ak-step small{font-size:9px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:var(--mu2)}
.ak-step.done{background:linear-gradient(180deg,rgba(31,220,124,.2),rgba(31,220,124,.07));border-color:rgba(31,220,124,.5);color:var(--gr)}
.ak-step.done small{color:rgba(31,220,124,.7)}
.ak-step.cur{border-color:var(--gd);color:#fff;background:linear-gradient(180deg,rgba(255,201,63,.16),rgba(255,201,63,.04));
  transform:translateY(-3px);box-shadow:0 10px 22px -12px rgba(255,201,63,.9)}
.ak-step.cur small{color:var(--gd)}
.ak-step.bust{border-color:var(--rd);color:#ff8597;background:rgba(255,77,104,.14);animation:akBust .5s var(--ez)}
.ak-step.bust small{color:#ff8597}
@keyframes akBust{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}

/* ---- the kit: casino chips ---- */
.ak-chip{--c:#1fdc7c;--e:#0b8a47;position:relative;flex:none;width:36px;height:36px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;font-weight:850;font-size:10.5px;letter-spacing:-.02em;
  background:repeating-conic-gradient(from 8deg,rgba(255,255,255,.92) 0 11deg,transparent 11deg 45deg),var(--c);
  box-shadow:0 2px 0 var(--e),0 5px 10px -3px rgba(0,0,0,.6),inset 0 0 0 1px rgba(0,0,0,.15);
  text-shadow:0 1px 2px rgba(0,0,0,.45)}
.ak-chip::before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--c);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55),inset 0 3px 6px rgba(255,255,255,.18),inset 0 -3px 6px rgba(0,0,0,.18)}
.ak-chip span{position:relative;font-variant-numeric:tabular-nums}
.ak-chip.c1{--c:#8ba3b6;--e:#56697a}.ak-chip.c2{--c:#1fdc7c;--e:#0b8a47}.ak-chip.c3{--c:#48a8ff;--e:#1f6fc0}
.ak-chip.c4{--c:#a07dff;--e:#6a48c7}.ak-chip.c5{--c:#ff4d68;--e:#b92841}.ak-chip.c6{--c:#ffb020;--e:#b77606}
.ak-chip.c6 span{color:#2a1a00;text-shadow:none}
.ak-rack{display:flex;gap:6px;flex-wrap:wrap;padding:8px;border-radius:12px;background:var(--bg0);border:1px solid var(--ln2)}
.ak-rack .ak-chip{cursor:pointer;transition:transform .2s var(--sp),box-shadow .2s}
.ak-rack .ak-chip:hover{transform:translateY(-3px)}
.ak-rack .ak-chip.on{transform:translateY(-4px) scale(1.06);box-shadow:0 2px 0 var(--e),0 0 0 2px #fff,0 0 18px 2px var(--c)}
.ak-rack.lock{opacity:.55;pointer-events:none}
.ak-stack{position:absolute;pointer-events:none;z-index:2;transform:translate(-50%,-50%) scale(.72);animation:akDrop .32s var(--sp)}
@keyframes akDrop{from{transform:translate(-50%,-110%) scale(.9);opacity:0}to{transform:translate(-50%,-50%) scale(.72);opacity:1}}

/* ---- the kit: small furniture ---- */
.ak-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ak-btns.three{grid-template-columns:1fr 1fr 1fr}
.ak-btns .cs-btn2{display:flex;align-items:center;justify-content:center;gap:7px}
.ak-btns .cs-btn2 svg{width:16px;height:16px}
.ak-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4}
.ak-conf i{position:absolute;left:var(--x);top:var(--y);width:8px;height:5px;border-radius:1.5px;background:var(--c);opacity:0;
  animation:akConf 1.3s var(--ez) forwards;animation-delay:var(--d)}
@keyframes akConf{0%{opacity:1;transform:translate(0,0) rotate(0)}
  100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r))}}
.ak-pay{display:flex;flex-direction:column;gap:3px;padding:8px;border-radius:12px;background:var(--bg0);border:1px solid var(--ln)}
.ak-pay div{display:flex;justify-content:space-between;align-items:center;gap:10px;height:26px;padding:0 9px;border-radius:7px;
  font-size:12px;font-weight:700;color:var(--mu);transition:background .25s,color .25s,transform .3s var(--sp)}
.ak-pay div b{color:var(--tx);font-weight:800}
.ak-pay div.on{background:rgba(31,220,124,.16);color:#fff;transform:translateX(3px)}
.ak-pay div.on b{color:var(--gr)}
`;
  ALLIN_TABLES.push({ css: CSS });

  /* The card that pops over a board when a bet settles. Wins of 10× and up
     go gold. `sub` is an optional line under the payout. */
  function res(C, host) {
    const el = C.mk('div', 'cs-res', '<div class="x cn num"></div><div class="p num"></div><div class="sub"></div>');
    host.appendChild(el);
    const x = el.querySelector('.x'), p = el.querySelector('.p'), sub = el.querySelector('.sub');
    let t = 0;
    return {
      el,
      show(win, mx, profit, label, subTxt, ms) {
        el.className = 'cs-res' + (win ? (mx >= 1000 ? ' gold' : '') : ' lose');
        x.textContent = label || C.mxs(mx);
        p.textContent = (profit > 0 ? '+' : profit < 0 ? '−' : '') + C.money(Math.abs(profit));
        sub.textContent = subTxt || '';
        requestAnimationFrame(() => el.classList.add('on'));
        clearTimeout(t);
        t = setTimeout(() => el.classList.remove('on'), ms || 1900);
      },
      hide() { clearTimeout(t); el.classList.remove('on'); }
    };
  }

  /* The row of multipliers a streak game climbs: what each step pays, the
     ones already won in green, the one being played for lifted in gold, and
     a bust in red. It slides along so the next step is always in view. */
  function ladder(C, host) {
    const el = C.mk('div', 'ak-lad'), inn = C.mk('div', 'in');
    el.appendChild(inn); host.appendChild(el);
    let steps = [], at = -1, busted = false;
    function place() {
      const d = steps[Math.max(0, Math.min(steps.length - 1, at + 1))];
      if (!d) return;
      const max = Math.max(0, inn.scrollWidth - el.clientWidth);
      const x = Math.max(0, Math.min(max, d.offsetLeft - el.clientWidth * .38));
      inn.style.transform = 'translateX(' + (-x) + 'px)';
    }
    function paint() {
      steps.forEach((d, j) => {
        d.classList.toggle('done', j < at || (j === at && !busted));
        d.classList.toggle('cur', !busted && j === at + 1);
        d.classList.toggle('bust', busted && j === at + 1);
      });
      place();
    }
    new ResizeObserver(place).observe(el);
    return {
      el,
      /* list: [{ x: hundredths, sub: 'text' }] */
      set(list) {
        inn.innerHTML = '';
        steps = list.map(s => {
          const d = C.mk('div', 'ak-step', '<b class="num">' + C.mxs(s.x) + '</b>' + (s.sub ? '<small>' + C.esc(s.sub) + '</small>' : ''));
          inn.appendChild(d);
          return d;
        });
        at = -1; busted = false; paint();
      },
      /* i steps won so far (-1 for none); `bust` marks step i+1 as the one lost */
      to(i, bust) { at = i; busted = !!bust; paint(); }
    };
  }

  /* chips: their values follow the stack, so a 1,000-chip player and a
     50,000-chip player both have sensible chips to push */
  const CHIP_VALUES = [10, 100, 1000, 10000, 100000, 1000000];
  function chipLabel(c) {
    const v = c / 100;
    return v >= 1000000 ? v / 1000000 + 'M' : v >= 1000 ? v / 1000 + 'K' : v >= 1 ? String(v) : v.toFixed(1).replace(/^0/, '');
  }
  function chipClass(c) { const i = CHIP_VALUES.indexOf(c); return 'c' + (i < 0 ? 2 : i + 1); }
  function chip(C, c) {
    return C.mk('div', 'ak-chip ' + chipClass(c), '<span>' + chipLabel(c) + '</span>');
  }
  /* A pile of chips as the fewest chips that make it, for a stack on the
     felt: the top chip says what the pile is worth. */
  function stackEl(C, c) {
    const top = CHIP_VALUES.filter(v => v <= c).pop() || CHIP_VALUES[0];
    const e = C.mk('div', 'ak-chip ak-stackchip ' + chipClass(top), '<span>' + chipLabel(c) + '</span>');
    return e;
  }

  /* Confetti over a win, from (x, y) as fractions of the host. */
  const CONF = ['#1fdc7c', '#ffc93f', '#48a8ff', '#a07dff', '#ff4d68', '#ffffff'];
  function burst(C, host, x, y, n) {
    const box = C.mk('div', 'ak-conf');
    let html = '';
    for (let i = 0; i < (n || 34); i++) {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 220;
      html += '<i style="--x:' + (x * 100) + '%;--y:' + (y * 100) + '%;--c:' + CONF[i % CONF.length] +
        ';--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d * .8 + 120) + 'px;--r:' +
        Math.round(Math.random() * 720 - 360) + 'deg;--d:' + (Math.random() * .12).toFixed(3) + 's"></i>';
    }
    box.innerHTML = html;
    host.appendChild(box);
    setTimeout(() => box.remove(), 1600);
  }

  /* one weighted draw: items [[weight, value], ...] */
  function pick(C, items) {
    let tot = 0;
    for (const it of items) tot += it[0];
    let r = C.rnd() * tot;
    for (const it of items) { r -= it[0]; if (r < 0) return it[1]; }
    return items[items.length - 1][1];
  }

  return { res, ladder, chip, chipLabel, chipClass, stackEl, CHIP_VALUES, burst, pick };
})();
