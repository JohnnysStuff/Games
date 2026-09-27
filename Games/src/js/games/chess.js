/* =========================================================== CHESS ======= */
/* Real chess, rules and all: castling through the right squares, en passant,
   under-promotion, and every one of the drawn endings people actually reach -
   stalemate, the fifty-move rule, threefold repetition and dead material.

   The engine is a plain alpha-beta search, but it is bounded by a clock rather
   than a depth. A fixed depth is the thing that makes a browser game stutter:
   the same depth is instant in the opening and half a second in a sharp
   middlegame. Iterative deepening with a time budget spends the same few
   milliseconds every move and simply plays weaker on a slow machine. */
registerGame({
  id: 'chess',
  title: 'Chess',
  tagline: 'The whole game — castling, en passant, promotion and every way to draw. Play the engine, share a screen, or take a friend online.',
  tags: ['Board', 'Strategy', 'Versus', 'Online'],
  scoreLabel: 'Score',
  mp: 'duel',
  mpMin: 2, mpMax: 2,
  front: true,
  controls: [
    ['Pick up a piece', 'Click it'],
    ['Move', 'Click a marked square'],
    ['Put it back', 'Right click'],
    ['Offer a draw', 'D'],
    ['Resign', 'R held'],
    ['Pause', 'Esc']
  ],
  options: [
    { id: 'foe', label: 'Opponent', def: 'ai', type: 'cards', choices: [
      { v: 'ai',    l: 'The engine', icon: '&#129302;', desc: 'Play the computer.' },
      { v: 'local', l: 'Hot seat',   icon: '&#128101;', desc: 'Two players, one screen.' }
    ] },
    { id: 'skill', label: 'Strength', def: 'club', choices: [
      { v: 'casual', l: 'Casual', desc: 'Takes what it sees and little else.' },
      { v: 'club',   l: 'Club',   desc: 'Looks a few moves ahead.' },
      { v: 'sharp',  l: 'Sharp',  desc: 'Thinks for as long as it is allowed.' }
    ] },
    { id: 'seat', label: 'Play as', def: 'w', choices: [
      { v: 'w', l: 'White' }, { v: 'b', l: 'Black' }, { v: 'r', l: 'Random' }
    ] },
    { id: 'time', label: 'Clock', def: '5', choices: [
      { v: '3',   l: '3 + 2',    desc: 'Blitz, with two seconds back per move.' },
      { v: '5',   l: '5 min',    desc: 'A whole game inside a lesson.' },
      { v: '10',  l: '10 min',   desc: 'Room to actually think.' },
      { v: 'off', l: 'No clock', desc: 'Take as long as you like.' }
    ] }
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="ck2B" cx=".5" cy=".4" r=".85"><stop offset="0" stop-color="#26324a"/><stop offset="1" stop-color="#06080e"/></radialGradient><linearGradient id="ck2W" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e4eaf2"/><stop offset="1" stop-color="#9dabbe"/></linearGradient><linearGradient id="ck2D" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#454f63"/><stop offset=".5" stop-color="#212836"/><stop offset="1" stop-color="#0a0e15"/></linearGradient></defs><rect width="320" height="180" fill="url(#ck2B)"/><g opacity=".16"><rect x="204" y="20" width="28" height="28" fill="#7aa2ff"/><rect x="260" y="20" width="28" height="28" fill="#7aa2ff"/><rect x="232" y="48" width="28" height="28" fill="#7aa2ff"/><rect x="288" y="48" width="28" height="28" fill="#7aa2ff"/><rect x="204" y="76" width="28" height="28" fill="#7aa2ff"/><rect x="260" y="76" width="28" height="28" fill="#7aa2ff"/><rect x="16" y="96" width="28" height="28" fill="#7aa2ff"/><rect x="72" y="96" width="28" height="28" fill="#7aa2ff"/><rect x="44" y="124" width="28" height="28" fill="#7aa2ff"/><rect x="100" y="124" width="28" height="28" fill="#7aa2ff"/></g><g transform="translate(232 122)"><ellipse cy="34" rx="30" ry="9" fill="#000" opacity=".45"/><path d="M-24 30h48l-5-12h-38z" fill="url(#ck2D)"/><rect x="-19" y="8" width="38" height="9" rx="4" fill="url(#ck2D)"/><path d="M-12 8c-3-11 1-19 3-24h18c2 5 6 13 3 24z" fill="url(#ck2D)"/><circle cy="-32" r="15" fill="url(#ck2D)"/><ellipse cx="-5" cy="-37" rx="5" ry="3.4" fill="#fff" opacity=".22" transform="rotate(-30 -5 -37)"/></g><g transform="translate(124 104)"><ellipse cy="62" rx="54" ry="14" fill="#000" opacity=".55"/><path d="M-42 58h84l-8-18h-68z" fill="url(#ck2W)"/><path d="M-42 58h84l-2-5h-80z" fill="#5f6d80" opacity=".45"/><rect x="-34" y="26" width="68" height="15" rx="7" fill="url(#ck2W)"/><path d="M-23 26c-6-22 2-40 6-52h34c4 12 12 30 6 52z" fill="url(#ck2W)"/><rect x="-28" y="-34" width="56" height="16" rx="7" fill="url(#ck2W)"/><path d="M-28 -34l5-30 11 15 12-20 12 20 11-15 5 30z" fill="url(#ck2W)"/><rect x="-6" y="-108" width="12" height="36" rx="5" fill="url(#ck2W)"/><rect x="-18" y="-96" width="36" height="12" rx="5" fill="url(#ck2W)"/><g fill="#ffffff" opacity=".55"><rect x="-20" y="-30" width="9" height="9" rx="4"/><rect x="-19" y="-2" width="8" height="22" rx="4"/><rect x="-3" y="-104" width="5" height="28" rx="2.5"/></g><g fill="#7c8ba0" opacity=".35"><path d="M16 -30h10v9h-10z"/><path d="M18 -2h8v22h-8z"/></g></g></svg>',
  w: 960, h: 600,
  mount(api) {
    const W = 960, H = 600;
    const MPS = getSession('chess');
    const HOSTMP = !!(MPS && MPS.role === 'host');
    const GUEST = !!(MPS && MPS.role === 'guest');
    const FOE = MPS ? 'mp' : (api.opt('foe') || 'ai');

    /* ---------------------------------------------------------- the clock */
    /* Both ends have to be on the same control, so online it comes off the
       host's session config rather than whatever each player happened to pick.
       The host referees the clock as well as the rules: it ticks there and
       rides down in the snapshot, so two machines can never disagree about
       who flagged. */
    const TC = {
      '3':   { ms: 180000, inc: 2000, l: '3 + 2' },
      '5':   { ms: 300000, inc: 0,    l: '5 min' },
      '10':  { ms: 600000, inc: 0,    l: '10 min' },
      'off': { ms: 0,      inc: 0,    l: 'No clock' }
    };
    const tcKey = (MPS && MPS.cfg && MPS.cfg.time) || api.opt('time') || '5';
    const TIME = TC[tcKey] || TC['5'];
    const CLOCKED = TIME.ms > 0;

    /* ---------------------------------------------------------- the rules */
    const EMPTY = 0, PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
    const BLACK = 8;
    const typeOf = p => p & 7;
    const sideOf = p => (p & BLACK) ? 1 : 0;       // only ask this of a real piece
    const WHITE_S = 0, BLACK_S = 1;

    /* castling rights, one bit each */
    const WK = 1, WQ = 2, BK = 4, BQ = 8;

    const BACK = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
    function startBoard() {
      const b = new Array(64).fill(EMPTY);
      for (let f = 0; f < 8; f++) {
        b[f] = BACK[f] | BLACK;
        b[8 + f] = PAWN | BLACK;
        b[48 + f] = PAWN;
        b[56 + f] = BACK[f];
      }
      return b;
    }
    const rankOf = sq => sq >> 3, fileOf = sq => sq & 7;
    const sqOf = (r, f) => r * 8 + f;
    const onBoard = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;

    /* A move is one integer so the search is not allocating objects:
       from | to<<6 | promotion<<12 | flag<<15. */
    const F_EP = 1, F_CASTLE = 2, F_DOUBLE = 3;
    const mk = (from, to, promo, flag) => from | (to << 6) | ((promo || 0) << 12) | ((flag || 0) << 15);
    const mFrom = m => m & 63, mTo = m => (m >> 6) & 63;
    const mPromo = m => (m >> 12) & 7, mFlag = m => (m >> 15) & 7;

    const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    const KD = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    const BD = [[-1,-1],[-1,1],[1,-1],[1,1]];
    const RD = [[-1,0],[1,0],[0,-1],[0,1]];

    /* Is `sq` hit by anything of `by`? Used for check, and for the three
       squares a castling king must cross safely. */
    function attacked(bd, sq, by) {
      const r = rankOf(sq), f = fileOf(sq);
      /* pawns: a white pawn attacks upward, so it must sit below the square */
      const pr = by === WHITE_S ? r + 1 : r - 1;
      const pawn = PAWN | (by === BLACK_S ? BLACK : 0);
      if (onBoard(pr, f - 1) && bd[sqOf(pr, f - 1)] === pawn) return true;
      if (onBoard(pr, f + 1) && bd[sqOf(pr, f + 1)] === pawn) return true;

      const knight = KNIGHT | (by === BLACK_S ? BLACK : 0);
      for (const [dr, df] of KN)
        if (onBoard(r + dr, f + df) && bd[sqOf(r + dr, f + df)] === knight) return true;

      const king = KING | (by === BLACK_S ? BLACK : 0);
      for (const [dr, df] of KD)
        if (onBoard(r + dr, f + df) && bd[sqOf(r + dr, f + df)] === king) return true;

      for (const [dirs, t1, t2] of [[BD, BISHOP, QUEEN], [RD, ROOK, QUEEN]]) {
        for (const [dr, df] of dirs) {
          let rr2 = r + dr, ff = f + df;
          while (onBoard(rr2, ff)) {
            const p = bd[sqOf(rr2, ff)];
            if (p) {
              if (sideOf(p) === by) { const t = typeOf(p); if (t === t1 || t === t2) return true; }
              break;
            }
            rr2 += dr; ff += df;
          }
        }
      }
      return false;
    }
    function kingSq(bd, side) {
      const k = KING | (side === BLACK_S ? BLACK : 0);
      for (let i = 0; i < 64; i++) if (bd[i] === k) return i;
      return -1;
    }
    const inCheck = st => { const k = kingSq(st.bd, st.side); return k >= 0 && attacked(st.bd, k, st.side ^ 1); };

    /* Pseudo-legal: everything the piece may do before asking whether it
       leaves its own king hanging. */
    function pseudo(st, out) {
      const bd = st.bd, us = st.side, them = us ^ 1;
      const mine = us === BLACK_S ? BLACK : 0;
      for (let sq = 0; sq < 64; sq++) {
        const p = bd[sq];
        if (!p || sideOf(p) !== us) continue;
        const r = rankOf(sq), f = fileOf(sq), t = typeOf(p);

        if (t === PAWN) {
          const dir = us === WHITE_S ? -1 : 1;
          const startRank = us === WHITE_S ? 6 : 1;
          const lastRank = us === WHITE_S ? 0 : 7;
          const one = sqOf(r + dir, f);
          if (onBoard(r + dir, f) && !bd[one]) {
            if (r + dir === lastRank) for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) out.push(mk(sq, one, pr, 0));
            else {
              out.push(mk(sq, one, 0, 0));
              const two = sqOf(r + dir * 2, f);
              if (r === startRank && !bd[two]) out.push(mk(sq, two, 0, F_DOUBLE));
            }
          }
          for (const df of [-1, 1]) {
            const cr = r + dir, cf = f + df;
            if (!onBoard(cr, cf)) continue;
            const to = sqOf(cr, cf), q = bd[to];
            if (q && sideOf(q) === them) {
              if (cr === lastRank) for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) out.push(mk(sq, to, pr, 0));
              else out.push(mk(sq, to, 0, 0));
            } else if (!q && to === st.ep) out.push(mk(sq, to, 0, F_EP));
          }
          continue;
        }
        if (t === KNIGHT || t === KING) {
          for (const [dr, df] of (t === KNIGHT ? KN : KD)) {
            if (!onBoard(r + dr, f + df)) continue;
            const to = sqOf(r + dr, f + df), q = bd[to];
            if (!q || sideOf(q) !== us) out.push(mk(sq, to, 0, 0));
          }
          if (t === KING) {
            /* Castling. The king may not start in check, cross an attacked
               square, or land on one - so all three are tested, not just the
               destination. */
            const homeRank = us === WHITE_S ? 7 : 0;
            if (r === homeRank && f === 4 && !attacked(bd, sq, them)) {
              const kSide = us === WHITE_S ? WK : BK, qSide = us === WHITE_S ? WQ : BQ;
              const rookP = ROOK | mine;
              if ((st.castle & kSide) && !bd[sqOf(r, 5)] && !bd[sqOf(r, 6)] && bd[sqOf(r, 7)] === rookP &&
                  !attacked(bd, sqOf(r, 5), them) && !attacked(bd, sqOf(r, 6), them))
                out.push(mk(sq, sqOf(r, 6), 0, F_CASTLE));
              if ((st.castle & qSide) && !bd[sqOf(r, 3)] && !bd[sqOf(r, 2)] && !bd[sqOf(r, 1)] && bd[sqOf(r, 0)] === rookP &&
                  !attacked(bd, sqOf(r, 3), them) && !attacked(bd, sqOf(r, 2), them))
                out.push(mk(sq, sqOf(r, 2), 0, F_CASTLE));
            }
          }
          continue;
        }
        const dirs = t === BISHOP ? BD : t === ROOK ? RD : BD.concat(RD);
        for (const [dr, df] of dirs) {
          let rr2 = r + dr, ff = f + df;
          while (onBoard(rr2, ff)) {
            const to = sqOf(rr2, ff), q = bd[to];
            if (!q) out.push(mk(sq, to, 0, 0));
            else { if (sideOf(q) !== us) out.push(mk(sq, to, 0, 0)); break; }
            rr2 += dr; ff += df;
          }
        }
      }
    }

    function cloneSt(st) {
      return { bd: st.bd.slice(), side: st.side, castle: st.castle, ep: st.ep, half: st.half, full: st.full };
    }
    /* Rights are lost by the king or the rook moving, and also by the rook
       being captured where it stands - which is the half everybody forgets. */
    function rightsAfter(castle, from, to) {
      if (from === 60 || to === 60) castle &= ~(WK | WQ);
      if (from === 63 || to === 63) castle &= ~WK;
      if (from === 56 || to === 56) castle &= ~WQ;
      if (from === 4 || to === 4) castle &= ~(BK | BQ);
      if (from === 7 || to === 7) castle &= ~BK;
      if (from === 0 || to === 0) castle &= ~BQ;
      return castle;
    }
    function applyMove(st, m) {
      const n = cloneSt(st);
      const from = mFrom(m), to = mTo(m), promo = mPromo(m), flag = mFlag(m);
      const p = n.bd[from], t = typeOf(p), us = n.side;
      const captured = flag === F_EP ? (PAWN | (us === WHITE_S ? BLACK : 0)) : n.bd[to];

      n.bd[to] = p; n.bd[from] = EMPTY;
      if (flag === F_EP) n.bd[sqOf(rankOf(from), fileOf(to))] = EMPTY;
      if (promo) n.bd[to] = promo | (us === BLACK_S ? BLACK : 0);
      if (flag === F_CASTLE) {
        const r = rankOf(from);
        if (fileOf(to) === 6) { n.bd[sqOf(r, 5)] = n.bd[sqOf(r, 7)]; n.bd[sqOf(r, 7)] = EMPTY; }
        else { n.bd[sqOf(r, 3)] = n.bd[sqOf(r, 0)]; n.bd[sqOf(r, 0)] = EMPTY; }
      }
      n.ep = flag === F_DOUBLE ? sqOf((rankOf(from) + rankOf(to)) / 2, fileOf(from)) : -1;
      n.castle = rightsAfter(n.castle, from, to);
      n.half = (t === PAWN || captured) ? 0 : n.half + 1;
      if (us === BLACK_S) n.full++;
      n.side = us ^ 1;
      n._cap = captured;
      return n;
    }
    /* The only definition of legal that matters: it is legal if, once played,
       your own king is not attacked. */
    function legalMoves(st) {
      const ps = [];
      pseudo(st, ps);
      const out = [];
      for (const m of ps) {
        const n = applyMove(st, m);
        const k = kingSq(n.bd, st.side);
        if (k >= 0 && !attacked(n.bd, k, st.side ^ 1)) out.push(m);
      }
      return out;
    }

    /* ---- the ways a game ends ---- */
    function deadMaterial(bd) {
      const minors = [];
      for (let i = 0; i < 64; i++) {
        const p = bd[i]; if (!p) continue;
        const t = typeOf(p);
        if (t === KING) continue;
        if (t === PAWN || t === ROOK || t === QUEEN) return false;
        minors.push({ t, side: sideOf(p), light: ((rankOf(i) + fileOf(i)) & 1) === 0 });
      }
      if (minors.length <= 1) return true;                       // K, K+N, K+B
      if (minors.length === 2 && minors.every(x => x.t === BISHOP) &&
          minors[0].light === minors[1].light) return true;      // same-colour bishops
      return false;
    }
    const keyOf = st => st.bd.join(',') + '|' + st.side + '|' + st.castle + '|' + st.ep;

    /* ------------------------------------------------------------- engine */
    const VAL = { [PAWN]: 100, [KNIGHT]: 320, [BISHOP]: 330, [ROOK]: 500, [QUEEN]: 900, [KING]: 20000 };
    /* Squares are read from White's point of view and mirrored for Black. */
    const PST = {
      [PAWN]: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
               5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5,
               5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
      [KNIGHT]: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40,
                 -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
                 -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
                 -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
      [BISHOP]: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10,
                 -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
                 -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10,
                 -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
      [ROOK]: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5,
               -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
               -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
      [QUEEN]: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10,
                -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
                0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10,
                -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
      [KING]: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
               -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
               -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
               20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
    };
    function evaluate(st) {
      let s = 0, wb = 0, bb = 0;
      for (let i = 0; i < 64; i++) {
        const p = st.bd[i]; if (!p) continue;
        const t = typeOf(p), side = sideOf(p);
        const mirrored = side === WHITE_S ? i : ((7 - rankOf(i)) * 8 + fileOf(i));
        const v = VAL[t] + PST[t][mirrored];
        s += side === WHITE_S ? v : -v;
        if (t === BISHOP) { if (side === WHITE_S) wb++; else bb++; }
      }
      if (wb >= 2) s += 30;
      if (bb >= 2) s -= 30;
      return st.side === WHITE_S ? s : -s;         // always from the mover's view
    }

    const ABORT = {};
    let nodes = 0, deadline = 0;
    /* Captures first, and the fattest capture first of all - the single
       cheapest thing that makes alpha-beta actually cut. */
    function order(st, ms) {
      const score = m => {
        const victim = st.bd[mTo(m)];
        const v = victim ? VAL[typeOf(victim)] - VAL[typeOf(st.bd[mFrom(m)])] / 10 : 0;
        return v + (mPromo(m) ? VAL[mPromo(m)] : 0);
      };
      return ms.map(m => [score(m), m]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    }
    function search(st, depth, alpha, beta, ply) {
      if ((++nodes & 511) === 0 && performance.now() > deadline) throw ABORT;
      const ms = legalMoves(st);
      if (!ms.length) return inCheck(st) ? -100000 + ply : 0;    // mate, else stalemate
      if (st.half >= 100) return 0;
      if (depth <= 0) return evaluate(st);
      let best = -Infinity;
      for (const m of order(st, ms)) {
        const v = -search(applyMove(st, m), depth - 1, -beta, -alpha, ply + 1);
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }
    const BUDGET = { casual: 1, club: 90, sharp: 320 };
    /* ------------------------------------------------------------ cheats */
    /* The engine, playing to lose. Every legal move is scored one ply deep
       from the opponent's side and the one that comes back worst is chosen —
       which usually means hanging something, and occasionally means walking
       into mate, both of which is the point. */
    function worstMove(s) {
      const ms = legalMoves(s);
      if (!ms.length) return 0;
      nodes = 0;
      deadline = performance.now() + 350;
      let worst = ms[0], worstScore = Infinity;
      for (const m of ms) {
        let v;
        try { v = -search(applyMove(s, m), 1, -Infinity, Infinity, 1); }
        catch (e) { if (e !== ABORT) throw e; break; }
        if (v < worstScore) { worstScore = v; worst = m; }
      }
      return worst;
    }

    /* One full move back: your ply and the reply to it. In a shared-screen
       game a single ply is what you actually want, since both sides are you. */
    /* mm:ss, and under ten seconds the tenths, because that is when they
       start to matter */
    function clockText(ms) {
      ms = Math.max(0, ms);
      if (ms < 10000) return (ms / 1000).toFixed(1);
      const t = Math.ceil(ms / 1000);
      return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    }

    /* Could this side still force mate with what it has left? A flag fall is
       only a loss if the opponent could actually have delivered one — bare
       king, or king and a single minor, and running out of time is a draw
       rather than a defeat. It is a real rule, and it is exactly the kind of
       ending a clock produces. */
    function canMate(bd, side) {
      let minors = 0;
      for (let i = 0; i < 64; i++) {
        const p = bd[i];
        if (!p || sideOf(p) !== side) continue;
        const t = typeOf(p);
        if (t === PAWN || t === ROOK || t === QUEEN) return true;
        if (t === KNIGHT || t === BISHOP) minors++;
      }
      return minors >= 2;
    }

    /* Only ever called where the clock is owned: solo, hot seat, or the host. */
    function tickClock(dt) {
      if (!CLOCKED || ended || !st) return;
      const s = st.side;
      clock[s] -= dt * 1000;
      /* a nudge at a minute and at ten seconds, once each */
      const left = clock[s];
      const mine = (FOE === 'local') || s === MYSIDE;
      if (mine && left <= 60000 && warned[s] < 1) { warned[s] = 1; Sound.blip && Sound.blip(); }
      if (mine && left <= 10000 && warned[s] < 2) { warned[s] = 2; Sound.zap && Sound.zap(); }
      if (left <= 0) {
        clock[s] = 0;
        const other = s ^ 1;
        if (canMate(st.bd, other)) finish({ kind: 'flag', winner: other });
        else finish({ kind: 'flagdraw' });
      }
    }

    function takeBack() {
      const want = (!MPS && FOE === 'ai') ? 2 : 1;
      let did = 0;
      for (let i = 0; i < want && hist.length && undoStack.length; i++) {
        const k = keyOf(st);
        if (seen[k]) { seen[k]--; if (!seen[k]) delete seen[k]; }
        st = hist.pop();
        const u = undoStack.pop();
        taken[0] = u.tk[0]; taken[1] = u.tk[1];
        moveLog.length = u.log;
        last = u.last;
        if (u.ck) { clock = u.ck.slice(); warned = (u.wn || [0, 0]).slice(); }
        did++;
      }
      if (!did) return false;
      sel = -1; marks = []; slides = []; promoAsk = null;
      hintFor = ''; hintMove = null;
      ended = false; result = null; drawOffer = false;
      checkPulse = inCheck(st) ? 1 : 0;
      return true;
    }

    function think(st) {
      const skill = api.opt('skill') || 'club';
      const ms = legalMoves(st);
      if (!ms.length) return 0;
      if (skill === 'casual') {
        /* takes the best capture on offer, otherwise wanders - beatable, but
           it will not miss a hanging queen */
        const ranked = order(st, ms);
        const top = ranked.filter(m => st.bd[mTo(m)]);
        return top.length && Math.random() < .85 ? top[0] : ranked[(Math.random() * Math.min(4, ranked.length)) | 0];
      }
      nodes = 0;
      deadline = performance.now() + BUDGET[skill];
      let best = ms[0], bestScore = -Infinity;
      for (let d = 1; d <= 6; d++) {
        let localBest = null, localScore = -Infinity, alpha = -Infinity;
        try {
          for (const m of order(st, ms)) {
            const v = -search(applyMove(st, m), d - 1, -Infinity, -alpha, 1);
            if (v > localScore) { localScore = v; localBest = m; }
            if (v > alpha) alpha = v;
          }
        } catch (e) {
          if (e !== ABORT) throw e;
          break;                                   // out of time: keep the last full depth
        }
        if (localBest !== null) { best = localBest; bestScore = localScore; }
        if (bestScore > 90000) break;              // found a forced mate
      }
      return best;
    }

    /* ------------------------------------------------------------- the game */
    const SIDE_OPT = api.opt('seat') || 'w';
    /* A game begun from the front page brings that page's board with it (the
       pieces walk home from wherever the demo had got to), and the side the
       page already rolled for Random, so the board that turned round to face
       you there is the board you play on. */
    const CARRY = !MPS && api.fromMenu && api.carry && api.carry.chess ? api.carry : null;
    const soloSide = CARRY && (CARRY.side === WHITE_S || CARRY.side === BLACK_S) ? CARRY.side
                   : SIDE_OPT === 'r' ? (Math.random() < .5 ? WHITE_S : BLACK_S)
                   : SIDE_OPT === 'b' ? BLACK_S : WHITE_S;
    /* online the host has white, which is the same rule four uses for red */
    const MYSIDE = MPS ? (HOSTMP ? WHITE_S : BLACK_S) : soloSide;
    const NAMES = MPS
      ? { 0: (MPS.players[0] || {}).name || 'White', 1: (MPS.players[1] || {}).name || 'Black' }
      : FOE === 'local' ? { 0: 'White', 1: 'Black' }
      : { [MYSIDE]: 'You', [MYSIDE ^ 1]: 'The engine' };

    let st, hist, seen, sel, marks, last, result, ended, thinkT, promoAsk;
    /* Cheat scaffolding. `undoStack` is a parallel history of the things a
       take-back cannot reconstruct from the board alone — the captured piles
       especially, which a promotion would otherwise make impossible to unwind
       by counting material. `hint` is cached per position because working it
       out costs the engine's whole move budget. */
    let undoStack = [], hintMove = null, hintFor = '';
    /* milliseconds left per side, and which warning beeps each has already
       had — without the latch a sixty-second warning fires every frame */
    let clock = [TIME.ms, TIME.ms], warned = [0, 0];
    let taken, moveLog, flash, checkPulse, drawOffer, resignHold;
    /* Presentation only, and deliberately kept out of the game state: none of
       it is snapshotted, so a guest joining mid-slide just sees the board as it
       already is rather than half an animation it has no context for.
       `slides` are pieces in flight, `markT` fades the legal-move dots in,
       `lastT` pulses the square that was just played. */
    let slides = [], markT = 0, lastT = 0, selT = 0;

    function reset() {
      st = { bd: startBoard(), side: WHITE_S, castle: WK | WQ | BK | BQ, ep: -1, half: 0, full: 1 };
      hist = []; seen = {}; seen[keyOf(st)] = 1;
      sel = -1; marks = []; last = null; result = null; ended = false;
      thinkT = 0; promoAsk = null; taken = { 0: [], 1: [] }; moveLog = [];
      flash = 0; checkPulse = 0; drawOffer = false; resignHold = 0;
      clock = [TIME.ms, TIME.ms]; warned = [0, 0];
      undoStack = []; hintMove = null; hintFor = '';
    }
    reset();

    /* Deliberately not gated on the promotion chooser. Choosing a piece is
       part of taking your turn, and treating the open chooser as "not your
       move" stops the clicks being read at all - which leaves the chooser up
       with no way to answer it. */
    const myTurn = () => !ended &&
      (MPS ? st.side === MYSIDE : (FOE === 'local' || st.side === MYSIDE));
    /* black at the bottom when that is the side you are sitting on */
    const flipped = () => (MPS || FOE === 'ai') ? MYSIDE === BLACK_S : false;

    const FILES = 'abcdefgh';
    const nameSq = sq => FILES[fileOf(sq)] + (8 - rankOf(sq));
    const LETTER = { [PAWN]: '', [KNIGHT]: 'N', [BISHOP]: 'B', [ROOK]: 'R', [QUEEN]: 'Q', [KING]: 'K' };

    function record(before, m, after) {
      const p = before.bd[mFrom(m)], cap = after._cap;
      let s;
      if (mFlag(m) === F_CASTLE) s = fileOf(mTo(m)) === 6 ? 'O-O' : 'O-O-O';
      else s = LETTER[typeOf(p)] + nameSq(mFrom(m)) + (cap ? 'x' : '-') + nameSq(mTo(m)) +
               (mPromo(m) ? '=' + LETTER[mPromo(m)] : '');
      const over = legalMoves(after).length === 0;
      if (over && inCheck(after)) s += '#';
      else if (inCheck(after)) s += '+';
      /* filed under whoever did the taking, so a player's row is their own
         trophies and the +N beside it is their lead */
      if (cap) taken[sideOf(p)].push(typeOf(cap));
      moveLog.push({ n: before.full, side: before.side, s });
      if (moveLog.length > 400) moveLog.shift();
    }

    /* A move is applied to the board instantly - the rules, the engine and the
       wire all want it that way - so the slide is a purely visual lie told on
       top of it: the destination square is skipped while a copy of the piece
       travels there. Everything here reads `before`, because by the time it
       runs the real board has already moved on. */
    function startSlide(before, m, after) {
      const from = mFrom(m), to = mTo(m);
      const p = before.bd[from];
      if (!p) return;
      const dur = .17 + Math.min(.10, Math.hypot(fileOf(to) - fileOf(from), rankOf(to) - rankOf(from)) * .018);
      /* a promoted pawn travels as a pawn and arrives as whatever it became */
      slides = [{ from: from, to: to, piece: p, arrive: after.bd[to] || p, t: 0, dur: dur }];
      /* whatever it landed on fades out under it rather than blinking away */
      const capSq = mFlag(m) === F_EP ? sqOf(rankOf(from), fileOf(to)) : to;
      const cap = before.bd[capSq];
      if (cap && capSq !== from) slides.push({ fade: true, at: capSq, piece: cap, t: 0, dur: dur });
      /* the rook has to come with the king, or castling teleports half of it */
      if (mFlag(m) === F_CASTLE) {
        const r = rankOf(to), kingSide = fileOf(to) === 6;
        const rf = sqOf(r, kingSide ? 7 : 0), rt = sqOf(r, kingSide ? 5 : 3);
        const rp = before.bd[rf];
        if (rp) slides.push({ from: rf, to: rt, piece: rp, arrive: rp, t: 0, dur: dur });
      }
    }

    function doMove(m) {
      const before = st;
      const after = applyMove(st, m);
      undoStack.push({ tk: [taken[0].slice(), taken[1].slice()], log: moveLog.length,
                       last: last, ck: clock.slice(), wn: warned.slice() });
      if (undoStack.length > 400) undoStack.shift();
      /* Fischer increment, paid to whoever just moved. Added after the move is
         committed so a player who flags mid-think cannot be rescued by it. */
      if (CLOCKED && TIME.inc && !ended) clock[before.side] += TIME.inc;
      record(before, m, after);
      hist.push(before);
      st = after;
      const k = keyOf(st);
      seen[k] = (seen[k] || 0) + 1;
      last = { from: mFrom(m), to: mTo(m) };
      startSlide(before, m, after);
      sel = -1; marks = []; markT = 0; lastT = 1;
      if (after._cap) Sound.hit ? Sound.hit() : Sound.blip();
      else Sound.place ? Sound.place() : Sound.blip();
      if (inCheck(st)) { checkPulse = 1; Sound.zap && Sound.zap(); }
      drawOffer = false;
      judge();
    }
    /* Every ending, checked in the order the rules give them. */
    function judge() {
      if (ended) return;
      const ms = legalMoves(st);
      if (!ms.length) {
        if (inCheck(st)) finish({ kind: 'mate', winner: st.side ^ 1 });
        else finish({ kind: 'stalemate' });
        return;
      }
      if (st.half >= 100) finish({ kind: 'fifty' });
      else if (seen[keyOf(st)] >= 3) finish({ kind: 'repetition' });
      else if (deadMaterial(st.bd)) finish({ kind: 'material' });
    }

    function finish(r) {
      if (ended) return;
      ended = true; result = r; flash = 1;
      const drawn = r.kind !== 'mate' && r.kind !== 'resign' && r.kind !== 'called' && r.kind !== 'flag';
      const iWon = !drawn && r.winner === MYSIDE;
      const plies = moveLog.length;
      const solo = !MPS && FOE === 'ai';
      /* a win is worth more the faster it lands; a draw is worth something */
      const score = drawn ? 300 : iWon ? Math.max(400, 1400 - plies * 12) : 0;
      const why = {
        mate: 'Checkmate', resign: 'Resignation', stalemate: 'Stalemate',
        fifty: 'Fifty-move rule', repetition: 'Threefold repetition',
        material: 'Insufficient material', agreed: 'Draw agreed',
        flag: 'Flag fall', flagdraw: 'Out of time, but nothing left to mate with'
      }[r.kind] || 'Game over';
      /* your record against each strength of engine, for the front page */
      if (solo && r.kind !== 'called') {
        try {
          const sk = api.opt('skill') || 'club', rec = api.load('rec', {}) || {};
          const row = Array.isArray(rec[sk]) ? rec[sk] : (rec[sk] = [0, 0, 0]);
          row[drawn ? 1 : iWon ? 0 : 2]++;
          api.save('rec', rec);
        } catch (e) {}
      }
      const res = {
        score, win: iWon,
        title: drawn ? 'Drawn' : iWon ? 'You won' : (FOE === 'local' ? NAMES[r.winner] + ' wins' : 'You lost'),
        message: drawn ? why + '.' : why + ' — ' + NAMES[r.winner] + ' wins.',
        stats: [
          { label: 'Moves', value: Math.ceil(plies / 2) },
          { label: 'Ending', value: why },
          { label: 'Opponent', value: MPS ? 'Online' : (FOE === 'ai' ? (api.opt('skill') || 'club') : 'Hot seat') }
        ].concat(CLOCKED ? [{ label: 'Clock left', value: clockText(clock[MYSIDE]) }] : [])
      };
      if (HOSTMP) MPS.send('over', res);
      api.gameOver(res);
    }

    /* ---- picking pieces up ---- */
    function selectAt(sq) {
      const p = st.bd[sq];
      if (p && sideOf(p) === st.side) {
        sel = sq;
        marks = legalMoves(st).filter(m => mFrom(m) === sq);
        Sound.tick && Sound.tick();
        return;
      }
      if (sel >= 0) {
        const opts = marks.filter(m => mTo(m) === sq);
        if (opts.length) {
          if (opts.length > 1 && mPromo(opts[0])) { promoAsk = { sq, opts }; return; }
          play(opts[0]);
          return;
        }
      }
      sel = -1; marks = [];
    }
    function play(m) {
      if (GUEST) { MPS.cmd({ c: 'mv', m }); sel = -1; marks = []; return; }
      doMove(m);
    }

    /* ---- the wire ---- */
    /* The board travels as 64 characters plus the four things a diagram cannot
       show. It is small enough to send whole every tick, which means a guest
       that misses a packet is corrected by the next one rather than drifting. */
    const CH = '.PNBRQK..pnbrqk';
    const snap = () => ({
      b: st.bd.map(p => CH[p] || '.').join(''),
      s: st.side, c: st.castle, e: st.ep, h: st.half, f: st.full,
      l: last, lg: moveLog.slice(-40), tk: { 0: taken[0], 1: taken[1] },
      r: result, en: ended, dof: drawOffer,
      /* rounded to a tenth: the guest only ever displays these, so sending
         full float milliseconds twelve times a second is wasted bytes */
      ck: [Math.round(clock[0] / 100), Math.round(clock[1] / 100)]
    });
    function applySnap(sn) {
      if (!sn || typeof sn.b !== 'string' || sn.b.length !== 64) return;
      for (let i = 0; i < 64; i++) { const k = CH.indexOf(sn.b[i]); st.bd[i] = k < 0 ? 0 : k; }
      st.side = sn.s; st.castle = sn.c; st.ep = sn.e; st.half = sn.h; st.full = sn.f;
      last = sn.l || null;
      if (sn.lg) moveLog = sn.lg;
      if (sn.tk) taken = sn.tk;
      if (sn.ck) clock = [sn.ck[0] * 100, sn.ck[1] * 100];
      drawOffer = !!sn.dof;
      if (sn.r && !ended) { result = sn.r; finish(sn.r); }
    }

    /* ---- geometry ---- */
    const CELL = 62, BW = CELL * 8, BH = CELL * 8;
    const BX = 46, BY = (H - BH) / 2;
    const PX = 566, PW = W - PX - 44;
    /* screen row/col for a square, honouring which way round the board sits */
    const viewOf = sq => {
      const r = rankOf(sq), f = fileOf(sq);
      return viewFlip ? { r: 7 - r, c: 7 - f } : { r, c: f };
    };
    const sqAt = (x, y) => {
      const c = Math.floor((x - BX) / CELL), r = Math.floor((y - BY) / CELL);
      if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
      return flipped() ? sqOf(7 - r, 7 - c) : sqOf(r, c);
    };
    const cxy = sq => { const v = viewOf(sq); return { x: BX + v.c * CELL + CELL / 2, y: BY + v.r * CELL + CELL / 2 }; };

    /* ---- pieces ---- */
    /* The solid Unicode figurines for both colours, recoloured rather than
       using the outline set: the hollow glyphs are drawn with hairlines that
       disappear at this size on a dark board. */
    const GLYPH = { [KING]: '♚', [QUEEN]: '♛', [ROOK]: '♜',
                    [BISHOP]: '♝', [KNIGHT]: '♞', [PAWN]: '♟' };
    function drawPiece(ctx, p, x, y, size, alpha) {
      const white = sideOf(p) === WHITE_S;
      ctx.save();
      if (alpha != null) ctx.globalAlpha *= alpha;
      /* on a board that is being turned round the pieces stay upright */
      if (upright) { ctx.translate(x, y); ctx.rotate(-upright); x = 0; y = 0; }
      ctx.font = size + 'px "Segoe UI Symbol","Apple Symbols","Noto Sans Symbols2",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const g = GLYPH[typeOf(p)];
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillText(g, x + 1.5, y + 2.5);
      /* Outline FIRST, then the fill on top of it.
         Stroking after the fill centres the line on the glyph's edge, so half
         of it lands inside - which a queen can absorb and a pawn cannot. At
         board size the pawn is a narrow stem, the inward half of a 1.6px dark
         stroke swallowed most of its white, and both sides' pawns ended up
         reading as the same dark shape. Drawn underneath, the stroke only ever
         shows outside the letter and the fill stays the colour it is meant to
         be. It also scales with the piece now, so it cannot creep back at a
         smaller board. */
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, size * .085);
      ctx.strokeStyle = white ? 'rgba(24,30,42,.92)' : 'rgba(196,206,226,.62)';
      ctx.strokeText(g, x, y);
      ctx.fillStyle = white ? '#fbfcfe' : '#181c26';
      ctx.fillText(g, x, y);
      ctx.restore();
    }

    /* Declared before the instance is handed back, not after it: everything
       below the `return` would never run, and a `let` that never runs stays in
       its dead zone and throws the first time the loop touches it. */
    let sendT = 0;
    const PROMO_ORDER = [QUEEN, ROOK, BISHOP, KNIGHT];

    /* ---- the front page ----
       Opened from the hub, Chess starts on a title of its own rather than the
       shell's card: the board sets itself up and plays Morphy's Opera Game
       (Paris, 1858: seventeen moves, and mate with the last two pieces he had
       left) while the choices sit where the score sheet will be. Nothing it
       plays makes a sound or counts. Picking Black turns the board round to
       face you, and Play mounts a fresh game with those choices, the pieces
       walking home from wherever the demo had got to. */
    const FK = FrontKit(api, {
      online: !!MPS, mp: true, remount: true,
      carry() {
        const seat = FK.opt('seat', 'w');
        const side = seat === 'r' ? (Math.random() < .5 ? WHITE_S : BLACK_S) : seat === 'b' ? BLACK_S : WHITE_S;
        return { chess: true, bd: st.bd.slice(), side, turn: turnK };
      }
    });
    const OPERA = ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'd2d4', 'c8g4', 'd4e5', 'g4f3', 'd1f3', 'd6e5', 'f1c4',
      'g8f6', 'f3b3', 'd8e7', 'b1c3', 'c7c6', 'c1g5', 'b7b5', 'c3b5', 'c6b5', 'c4b5', 'b8d7', 'e1c1', 'a8d8',
      'd1d7', 'd8d7', 'h1d1', 'e7e6', 'b5d7', 'f6d7', 'b3b8', 'd7b8', 'd1d8'];
    const OPERA_SAN = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4',
      'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5!', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8',
      'Rxd7!', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+!!', 'Nxb8', 'Rd8#'];
    const MENU_FOE = [['ai', 'ENGINE'], ['local', 'HOT SEAT']];
    const MENU_SKILL = [['casual', 'CASUAL'], ['club', 'CLUB'], ['sharp', 'SHARP']];
    const MENU_SEAT = [['w', 'WHITE'], ['b', 'BLACK'], ['r', 'RANDOM']];
    const MENU_TIME = [['3', '3 + 2'], ['5', '5 MIN'], ['10', '10 MIN'], ['off', 'NONE']];
    const CLOCK_WORDS = { '3': '3 + 2', '5': '5 MIN', '10': '10 MIN', off: 'NO CLOCK' };
    const MENU_TH = {
      track: 'rgba(3,5,10,.55)', trackEdge: 'rgba(233,215,182,.10)', chip: '#e9d7b6', chipInk: '#241a0e',
      chipOff: 'rgba(233,215,182,.62)', chipR: 11, chipPad: 4, chipGap: 3,
      face: Hud.FAM.cond, italic: true, weight: 800
    };
    const MENU_BTN = { r: 14, shadow: 'rgba(0,0,0,.5)', edge: 'rgba(255,244,214,.55)', edgeW: 1.5,
                       face: Hud.FAM.cond, italic: true, weight: 800, subInk: 'rgba(42,26,8,.68)' };
    const MENU_ALT = { r: 12, shadow: 'rgba(0,0,0,.35)', edge: 'rgba(233,215,182,.26)', edgeW: 1, gloss: false,
                       face: Hud.FAM.cond, italic: true, weight: 800 };
    /* your record against each strength of engine, kept by finish() */
    const REC = (() => { try { return api.load('rec', {}) || {}; } catch (e) { return {}; } })();
    /* the demo: how far through the game it is, and when the words about it changed */
    let demoPly = 0, demoWait = 0, demoShown = 0, plyAt = 0, mateAt = -1;
    /* pieces walking to new squares all at once (the board setting itself up,
       or going home), and whether a round waits for that before it starts */
    let homing = null, homingLoud = false, settling = !!CARRY, settleAge = 0;
    /* which way round the board is drawn: 0 with white at the foot, 1 with
       black, and anything between while it is being turned. The rules and the
       clicks only ever ask flipped(); this is the picture of it. */
    let turnK = flipped() ? 1 : 0, viewFlip = turnK > .5, turnA = 0, turnLift = 0, upright = 0;
    if (FK.on) { startHoming(new Array(64).fill(EMPTY), st.bd, false); demoWait = .6; }
    else if (CARRY && Array.isArray(CARRY.bd) && CARRY.bd.length === 64) {
      FK.M.turn = { x: clamp(+CARRY.turn || 0, 0, 1), v: 0 };
      startHoming(CARRY.bd, st.bd, true);
    } else settling = false;

    const instance = {
      update(dt) {
        if (flash > 0) flash -= dt;
        /* on the front page the menu has the keys, and the board plays itself */
        if (FK.on) { FK.input(api.input); if (FK.on) demo(dt); return; }
        /* a round begun from the front page waits for its pieces to get home
           and the board to face the right way before anything moves or ticks */
        if (settling) { settleAge += dt; if (settleAge < 3) return; settling = false; }

        const I = api.input;

        /* resign is held, not tapped, so it is never an accident */
        if (!ended && I.down('KeyR')) {
          resignHold += dt;
          if (resignHold > .9) {
            const me = MPS ? MYSIDE : (FOE === 'local' ? st.side : MYSIDE);
            if (GUEST) MPS.cmd({ c: 'resign' });
            else finish({ kind: 'resign', winner: me ^ 1 });
            resignHold = 0;
          }
        } else resignHold = 0;

        if (!ended && I.pressed('KeyD')) {
          if (MPS) {
            if (GUEST) MPS.cmd({ c: 'draw' });
            else if (drawOffer) finish({ kind: 'agreed' });
            else drawOffer = true;
          } else if (FOE === 'local') finish({ kind: 'agreed' });
        }

        /* ---- guests only render what they are told ---- */
        if (GUEST) {
          applySnap(MPS._snap);
          if (MPS.hostLeft && !ended) { ended = true; api.gameOver({ score: 0, title: 'Opponent left', message: 'They closed the table.' }); return; }
          MPS._events.splice(0);
          if (myTurn()) takeInput(I);
          return;
        }

        /* ---- the host is the referee ---- */
        if (MPS) {
          const q = MPS._cmdQ;
          while (q.length) {
            const c = q.shift();
            if (!c) continue;
            const theirSide = c.from === (MPS.players[0] || {}).id ? WHITE_S : BLACK_S;
            if (c.c === 'resign') { finish({ kind: 'resign', winner: theirSide ^ 1 }); continue; }
            if (c.c === 'draw') { if (drawOffer) finish({ kind: 'agreed' }); else drawOffer = true; continue; }
            if (c.c !== 'mv' || ended) continue;
            if (theirSide !== st.side) continue;              // not their turn: ignore
            /* never trust the number that arrived - only play it if it is one
               of the moves that is actually legal here */
            const m = legalMoves(st).find(x => x === c.m);
            if (m !== undefined) doMove(m);
          }
          sendT -= dt;
          if (sendT <= 0) { sendT = .12; MPS.send('snap', snap()); }
        }

        /* Whoever owns the rules owns the clock. A guest never ticks its own —
           it draws whatever came down in the last snapshot, so the two ends
           cannot drift apart and then disagree about a flag. */
        if (!ended && !promoAsk) tickClock(dt);

        if (!ended && myTurn()) takeInput(I);

        /* ---- cheats, all of them solo-only ---- */
        if (!MPS) {
          if (Cheats.take('chess', 'win') && !ended) {
            finish({ kind: 'called', winner: MYSIDE });
          }
          if (!ended && Cheats.on('chess', 'takeback') && I.pressed('KeyZ')) {
            if (takeBack()) Sound.blip && Sound.blip();
          }
          /* the hint costs the engine's whole budget, so it is worked out once
             per position and then just drawn */
          if (!ended && Cheats.on('chess', 'hint') && st.side === MYSIDE && !promoAsk) {
            const k = keyOf(st);
            if (hintFor !== k) { hintFor = k; hintMove = think(st) || null; }
          } else if (st.side !== MYSIDE) { hintMove = null; }
        }

        /* the engine takes a visible beat, then thinks inside its budget */
        if (!MPS && FOE === 'ai' && !ended && st.side !== MYSIDE && !promoAsk) {
          thinkT -= dt;
          if (thinkT <= 0) {
            const m = Cheats.on('chess', 'blunder') ? worstMove(st) : think(st);
            if (m) doMove(m);
            thinkT = .35;
          }
        } else thinkT = .35;
      },

      render(ctx) {
        FK.frame();
        const d = FK.dt;
        /* the visual layer runs on the render clock, whoever's turn it is and
           whatever the network is doing - it never gates the rules */
        if (checkPulse > 0) checkPulse -= d * 1.6;
        if (lastT > 0) lastT = Math.max(0, lastT - d * 1.7);
        markT = marks.length ? Math.min(1, markT + d * 7) : 0;
        selT = sel >= 0 ? Math.min(1, selT + d * 8) : 0;
        for (let i = slides.length - 1; i >= 0; i--) {
          const s = slides[i];
          s.t += d;
          if (s.t >= s.dur) slides.splice(i, 1);
        }
        if (homing) {
          homing.t += d;
          if (homing.t >= homing.end) {
            homing = null;
            if (homingLoud) { homingLoud = false; try { Sound.place(); } catch (e) {} }
          }
        }
        const want = FK.on ? menuTurn() : (flipped() ? 1 : 0);
        turnK = FK.spring('turn', want, 44, 10);
        viewFlip = turnK > .5;
        turnA = (turnK - (viewFlip ? 1 : 0)) * Math.PI;
        turnLift = Math.sin(clamp(turnK, 0, 1) * Math.PI);
        if (Math.abs(turnA) < 1e-4) turnA = 0;
        if (turnLift < 1e-4) turnLift = 0;
        if (settling && !homing && Math.abs(turnK - want) < .02) settling = false;
        /* the words that go with the demo change on this clock too */
        if (demoShown !== demoPly) {
          demoShown = demoPly; plyAt = FK.t;
          mateAt = demoPly >= OPERA.length ? FK.t : -1;
        }
        drawAll(ctx);
        if (FK.on) FK.cursor();
      },

      /* Escape on the front page goes back to the hub; in a game it pauses */
      escape: FK.escape,
      destroy() { FK.done(); },
      /* the round is over: the panel becomes its result */
      results(R) { FK.showResults(R); }
    };

    /* ------------------------------------------------------------- input */
    function takeInput(I) {
      for (const c of I.clicks) {
        if (c.btn === 2) { sel = -1; marks = []; promoAsk = null; continue; }
        if (promoAsk) {
          const hit = promoHit(c.x, c.y);
          if (hit) { const m = promoAsk.opts.find(o => mPromo(o) === hit); promoAsk = null; if (m) play(m); }
          else promoAsk = null;
          continue;
        }
        const sq = sqAt(c.x, c.y);
        if (sq >= 0) selectAt(sq);
      }
    }
    function promoBox() {
      const w = 62 * 4 + 16, h = 78;
      return { x: clamp(cxy(promoAsk.sq).x - w / 2, BX, BX + BW - w), y: clamp(cxy(promoAsk.sq).y - h / 2, BY, BY + BH - h), w, h };
    }
    function promoHit(x, y) {
      const b = promoBox();
      if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return 0;
      const i = clamp(Math.floor((x - b.x - 8) / 62), 0, 3);
      return PROMO_ORDER[i];
    }

    /* ------------------------------------------------------------ drawing */
    /* The room behind the board, painted once for each screen scale: two
       full-screen gradients filled every frame were over half of what a
       frame cost. */
    let bgCv = null, bgKey = '', glowCv = null;
    function roomBg(ctx) {
      const tf = ctx.getTransform ? ctx.getTransform() : null;
      const S = tf ? clamp(Math.hypot(tf.a, tf.b), 1, 3) : 1, key = S.toFixed(3);
      if (key !== bgKey || !bgCv) {
        bgKey = key;
        bgCv = bgCv || document.createElement('canvas');
        bgCv.width = Math.ceil(W * S); bgCv.height = Math.ceil(H * S);
        const c = bgCv.getContext('2d');
        c.setTransform(S, 0, 0, S, 0, 0);
        const bg = c.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#161d2c'); bg.addColorStop(1, '#070a11');
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
        const gl = c.createRadialGradient(W * .3, H * .5, 40, W * .3, H * .5, 520);
        gl.addColorStop(0, 'rgba(90,130,220,.12)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gl; c.fillRect(0, 0, W, H);
      }
      ctx.drawImage(bgCv, 0, 0, W, H);
    }
    function drawAll(ctx) {
      roomBg(ctx);
      /* the front page's backdrop, which fades on the way into a round */
      const menuA = FK.on ? 1 : CARRY ? 1 - FK.eo(clamp(FK.t / .4, 0, 1)) : 0;
      if (menuA > 0) drawMenuBack(ctx, menuA);

      /* The board is a thing on the table that can be turned round: while it
         turns it lifts a little, its shadow spreads, and the pieces on it stay
         upright. Standing still, all of this is the identity. */
      const OX = BX + BW / 2, OY = BY + BH / 2, SC = 1 - turnLift * .18;
      ctx.save();
      ctx.translate(OX, OY + 8 + turnLift * 18); ctx.rotate(turnA); ctx.scale(SC, SC);
      ctx.fillStyle = 'rgba(0,0,0,' + (.5 - turnLift * .2).toFixed(3) + ')';
      rr(ctx, -BW / 2 - 10, -BH / 2 - 12, BW + 20, BH + 24, 14); ctx.fill();
      ctx.restore();
      ctx.save();
      if (turnA || turnLift) { ctx.translate(OX, OY); ctx.rotate(turnA); ctx.scale(SC, SC); ctx.translate(-OX, -OY); }
      upright = turnA;
      ctx.fillStyle = '#2a2118';
      rr(ctx, BX - 9, BY - 9, BW + 18, BH + 18, 12); ctx.fill();

      const LIGHT = '#e9d7b6', DARK = '#8a6a48';
      const checkSq = inCheck(st) ? kingSq(st.bd, st.side) : -1;

      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const sq = viewFlip ? sqOf(7 - r, 7 - f) : sqOf(r, f);
        const x = BX + f * CELL, y = BY + r * CELL;
        ctx.fillStyle = ((r + f) & 1) ? DARK : LIGHT;
        ctx.fillRect(x, y, CELL, CELL);

        if (last && (sq === last.from || sq === last.to)) {
          /* The square that was just played, and the one it came from. This is
             the only way to see what an opponent did while you were reading
             the board, so it is a wash of colour plus a border rather than the
             faint tint it used to be - and it pulses once as it lands. */
          const pulse = Math.max(0, lastT);
          const a = (sq === last.to ? .40 : .28) + pulse * .22;
          ctx.fillStyle = 'rgba(246,206,74,' + a.toFixed(3) + ')';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = 'rgba(255,226,120,' + (.45 + pulse * .5).toFixed(3) + ')';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        }
        if (sq === sel) {
          const s = selT;
          ctx.fillStyle = 'rgba(96,208,128,' + (.30 + s * .18).toFixed(3) + ')';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = 'rgba(150,255,180,' + (.55 * s).toFixed(3) + ')';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
        }
        if (sq === checkSq) {
          const a = .35 + Math.max(0, checkPulse) * .35;
          ctx.fillStyle = 'rgba(230,70,70,' + a.toFixed(3) + ')'; ctx.fillRect(x, y, CELL, CELL);
        }
      }

      /* coordinates around the edge, in the frame rather than over the board;
         they step aside while the board is being turned */
      const coordA = .75 * (1 - clamp(turnLift * 5, 0, 1));
      if (coordA > 0) {
        ctx.save();
        ctx.globalAlpha *= coordA;
        for (let i = 0; i < 8; i++) {
          const fileTxt = FILES[viewFlip ? 7 - i : i];
          const rankTxt = String(viewFlip ? i + 1 : 8 - i);
          panelText(ctx, BX + i * CELL + CELL / 2, BY + BH + 12, fileTxt, 11, '#c9b998', 'center', 600);
          panelText(ctx, BX - 18, BY + i * CELL + CELL / 2, rankTxt, 11, '#c9b998', 'center', 600);
        }
        ctx.restore();
      }

      /* Legal destinations: a dot on an empty square, a ring around a capture.
         They spring in rather than appearing, and each one is staggered a
         little by its distance from the piece, so picking something up reads
         as the board offering you options instead of a rash of dots. */
      if (marks.length) {
        const px = cxy(sel >= 0 ? sel : mFrom(marks[0]));
        for (const m of marks) {
          const to = mTo(m), p = cxy(to);
          const d = Math.hypot(p.x - px.x, p.y - px.y) / (CELL * 8);
          const k = clamp((markT - d * .45) / .55, 0, 1);
          if (k <= 0) continue;
          /* overshoot a touch on the way in - it is the difference between
             appearing and arriving */
          const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
          const sc = (k < 1 ? 1 + Math.sin(e * Math.PI) * .22 : 1) * e;
          const isCap = st.bd[to] || mFlag(m) === F_EP;
          ctx.save();
          ctx.globalAlpha = e;
          if (isCap) {
            ctx.strokeStyle = 'rgba(226,88,72,.85)';
            ctx.lineWidth = 4.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, CELL * .41 * sc, 0, TAU); ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(28,40,30,.42)';
            ctx.beginPath(); ctx.arc(p.x, p.y, CELL * .155 * sc, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.13)';
            ctx.beginPath(); ctx.arc(p.x, p.y - CELL * .02, CELL * .10 * sc, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
      }

      /* the hint: the engine's own pick for your side, as a pair of rings and
         the line between them, in a colour nothing else on the board uses */
      if (hintMove && !ended && st.side === MYSIDE) {
        const a = cxy(mFrom(hintMove)), b = cxy(mTo(hintMove));
        const pulse = .55 + Math.sin(performance.now() / 260) * .18;
        ctx.save();
        ctx.strokeStyle = 'rgba(96,214,255,' + pulse.toFixed(3) + ')';
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(a.x, a.y, CELL * .40, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x, b.y, CELL * .40, 0, TAU); ctx.stroke();
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        const gap = CELL * .42;
        ctx.globalAlpha = .7;
        ctx.beginPath();
        ctx.moveTo(a.x + dx / L * gap, a.y + dy / L * gap);
        ctx.lineTo(b.x - dx / L * gap, b.y - dy / L * gap);
        ctx.stroke();
        ctx.restore();
      }

      if (homing) drawHoming(ctx);
      else {
        /* a piece in flight is drawn last, so it passes over the board rather
           than under the squares it crosses */
        const moving = {};
        for (const s of slides) if (!s.fade) moving[s.to] = 1;
        for (let sq = 0; sq < 64; sq++) {
          const p = st.bd[sq]; if (!p) continue;
          if (moving[sq]) continue;
          const c = cxy(sq);
          drawPiece(ctx, p, c.x, c.y + 2, CELL * .82);
        }
        for (const s of slides) {
          const k = clamp(s.t / s.dur, 0, 1);
          if (s.fade) {
            const c = cxy(s.at);
            ctx.save();
            ctx.translate(c.x, c.y + 2);
            ctx.scale(1 - k * .35, 1 - k * .35);
            drawPiece(ctx, s.piece, 0, 0, CELL * .82, 1 - k);
            ctx.restore();
            continue;
          }
          /* ease out: quick off the mark, settling into the square */
          const e = 1 - Math.pow(1 - k, 3);
          const a = cxy(s.from), b = cxy(s.to);
          const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
          /* a shadow that grows as it lifts and shrinks as it lands sells the
             travel better than the movement alone does */
          const lift = Math.sin(k * Math.PI) * CELL * .10;
          ctx.save();
          ctx.globalAlpha = .30;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(x, y + CELL * .30, CELL * (.26 + lift / CELL * .5), CELL * .09, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          drawPiece(ctx, k < .55 ? s.piece : s.arrive, x, y + 2 - lift, CELL * .82);
        }
      }

      if (promoAsk) drawPromo(ctx);
      ctx.restore();
      upright = 0;

      /* the panel, or the front page where it will be */
      if (FK.on) { drawMate(ctx); drawMenu(ctx, true); }
      else {
        if (menuA > 0) { ctx.save(); ctx.globalAlpha *= menuA; drawMenu(ctx, false); ctx.restore(); }
        const pk = CARRY ? FK.eo(clamp((FK.t - .12) / .5, 0, 1)) : 1;
        const rk = FK.R ? FK.eo(FK.rs('title', undefined, .35)) : 0;
        if (pk > 0 && rk < 1) {
          ctx.save();
          ctx.globalAlpha *= pk * (1 - rk); ctx.translate((1 - pk) * 40 - rk * 30, 0);
          drawPanel(ctx);
          ctx.restore();
        }
        if (FK.R) drawResults(ctx);
      }
    }

    /* ---- the results ----
       The final position stays where it is, on the board, and the panel beside
       it becomes the result: the verdict set in the title's gold, dropped in
       letter by letter; how it ended; the game's numbers on a small grid; the
       coins on a dark card; and the brass button to set the pieces up again. */
    function drawResults(ctx) {
      const R = FK.R, X = PX, WD = PW, CX = PX + PW / 2;
      const CREAM = '#efe2c6', MUTED = 'rgba(233,215,182,.56)', GOLD = 'rgba(224,181,101,.9)';
      FK.resSounds();
      const k0 = FK.eo(FK.rs('title', undefined, .45));
      /* a little depth behind the panel, so it reads as one piece */
      ctx.save(); ctx.globalAlpha *= k0;
      ctx.fillStyle = 'rgba(3,5,10,.34)'; rr(ctx, X - 18, 16, WD + 36, H - 32, 18); ctx.fill();
      ctx.fillStyle = 'rgba(224,181,101,.5)';
      const rw = 40 * k0;
      ctx.fillRect(CX - 70 - rw, 34, rw, 1); ctx.fillRect(CX + 70, 34, rw, 1);
      FK.caps(ctx, 'The result', CX, 35, 10, GOLD, 'center', { track: .32 });
      ctx.restore();
      const word = String(R.title).toUpperCase();
      drawTitle(ctx, CX, 86, FK.rt() + .1, word, word.length > 9 ? 44 : 58);
      FK.caps(ctx, R.message, CX, 130, 9.5, MUTED, 'center', { track: .18, alpha: FK.eo(FK.rs('sub', undefined, .4)) });
      /* the score, and the best, on one line */
      const sk = FK.eo(FK.rs('stat', 0, .45)), v = Math.round(R.score * FK.eo(FK.rs('stat', 0, .8)));
      ctx.save(); ctx.globalAlpha *= sk;
      FK.text(ctx, fmt(v), CX, 160, 26, CREAM, 'center', MENU_TH, { track: 1 });
      const tagT = R.isBest ? 'New best' : (R.cheated ? 'Not saved  ·  ' : '') + 'Best ' + fmt(R.best);
      FK.caps(ctx, tagT, CX, 184, 9, R.isBest ? '#f3d58f' : MUTED, 'center', { track: .24 });
      ctx.restore();
      /* the game's numbers, two to a row */
      const gs = R.gameStats.slice(0, 4), cw = (WD - 12) / 2;
      gs.forEach((st, i) => {
        const k = FK.eo(FK.rs('stat', i + 1, .35));
        if (k <= 0) return;
        const x = X + (i % 2) * (cw + 12), y = 204 + Math.floor(i / 2) * 50 + (1 - k) * 10;
        ctx.save(); ctx.globalAlpha *= k;
        ctx.fillStyle = 'rgba(3,5,10,.42)'; rr(ctx, x, y, cw, 42, 11); ctx.fill();
        ctx.strokeStyle = 'rgba(233,215,182,.1)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, cw - 1, 41, 11); ctx.stroke();
        FK.caps(ctx, st.label, x + 12, y + 14, 8.5, MUTED, 'left', { track: .2 });
        const val = String(st.value);
        FK.text(ctx, val.length > 16 ? val.slice(0, 15) + '…' : val, x + 12, y + 30, val.length > 12 ? 13 : 17, CREAM, 'left', MENU_TH);
        ctx.restore();
      });
      /* the coins, on a dark card */
      const n = R.paid.length;
      const LS = FK.ledgerStyle({
        face: Hud.FAM.cond, italic: true, weight: 700, ink: CREAM, mute: MUTED, gold: '#f3d58f', labelFace: Hud.FAM.sans,
        rule: 'rgba(233,215,182,.12)', bar: 'rgba(233,215,182,.1)', fill: '#e0b565', rowH: n > 4 ? 19 : 22, size: 16,
        lsize: 8.5, totalSize: 30, totalH: 38, xpH: 38, barH: 6, track: .2, noteGap: 84
      });
      const cy = 204 + Math.ceil(gs.length / 2) * 50 + 6, chh = 40 + FK.ledgerH(LS) + 6;
      const kc = FK.eo(FK.rs(n ? 'row' : 'xp', n ? 0 : undefined, .4));
      ctx.save(); ctx.globalAlpha *= kc;
      ctx.fillStyle = 'rgba(3,5,10,.5)'; rr(ctx, X, cy, WD, chh, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(233,215,182,.12)'; ctx.lineWidth = 1; rr(ctx, X + .5, cy + .5, WD - 1, chh - 1, 14); ctx.stroke();
      FK.caps(ctx, 'Coins', X + 18, cy + 20, 8.5, GOLD, 'left', { track: .24 });
      FK.text(ctx, fmt(FK.purse()), X + WD - 18, cy + 20, 19, '#f3d58f', 'right', MENU_TH);
      FK.ledger(ctx, X + 18, cy + 38, WD - 36, LS);
      ctx.restore();
      /* the ways on: brass for another game, the quiet two beside it */
      const kb = FK.eo(FK.rs('bar', undefined, .4));
      if (kb > 0) {
        const by = Math.min(H - 64, cy + chh + 14) + (1 - kb) * 16;
        ctx.save(); ctx.globalAlpha *= kb;
        const nb = R.menuOk ? 3 : 2, side = 76, gap = 8, main = WD - (nb - 1) * (side + gap);
        FK.button(ctx, 'again', X, by, main, 50, 'PLAY AGAIN', MENU_BTN, { size: 24, track: 2, fill: ['#f7e0a6', '#c8913a'], ink: '#2a1906' });
        let bx = X + main + gap;
        if (R.menuOk) { FK.button(ctx, 'menu', bx, by, side, 50, 'MENU', MENU_ALT, { fill: 'rgba(233,215,182,.07)', ink: CREAM, size: 17, track: 1 }); bx += side + gap; }
        FK.button(ctx, 'hub', bx, by, side, 50, 'HUB', MENU_ALT, { fill: 'rgba(233,215,182,.07)', ink: CREAM, size: 17, track: 1 });
        if (FK.resFinished() && by + 66 < H - 6) FK.caps(ctx, 'Space to play again', CX, by + 66, 8.5, 'rgba(233,215,182,.38)', 'center', { track: .16 });
        ctx.restore();
      }
      FK.resInput();
      FK.cursor();
    }
    function drawPromo(ctx) {
      const b = promoBox();
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(BX, BY, BW, BH);
      ctx.fillStyle = '#1b2334';
      rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke();
      panelText(ctx, b.x + b.w / 2, b.y + 14, 'PROMOTE TO', 10, P.ink2, 'center', 700);
      PROMO_ORDER.forEach((t, i) => {
        const x = b.x + 8 + i * 62 + 31;
        drawPiece(ctx, t | (st.side === BLACK_S ? BLACK : 0), x, b.y + 48, 46);
      });
    }

    function drawPanel(ctx) {
      let y = BY - 4;
      /* whose move, and why the game stopped if it has */
      const turnName = NAMES[st.side] || (st.side === WHITE_S ? 'White' : 'Black');
      ctx.fillStyle = '#131a29';
      rr(ctx, PX, y, PW, 58, 12); ctx.fill();
      const dotC = st.side === WHITE_S ? '#f2f5fa' : '#2a303c';
      ctx.fillStyle = dotC;
      ctx.beginPath(); ctx.arc(PX + 26, y + 29, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (ended && result) {
        panelText(ctx, PX + 48, y + 22, 'Game over', 15, P.ink, 'left', 700);
        const why = { mate: 'Checkmate', resign: 'Resignation', stalemate: 'Stalemate', called: 'Called it',
                      flag: 'Out of time', flagdraw: 'Out of time — drawn',
                      fifty: 'Fifty-move rule', repetition: 'Threefold repetition',
                      material: 'Insufficient material', agreed: 'Draw agreed' }[result.kind] || '';
        panelText(ctx, PX + 48, y + 40, why, 12, P.ink2, 'left', 500);
      } else {
        panelText(ctx, PX + 48, y + 22, turnName + ' to move', 15, P.ink, 'left', 700);
        const sub = inCheck(st) ? 'In check' :
          (!MPS && FOE === 'ai' && st.side !== MYSIDE) ? 'Thinking…' :
          drawOffer ? 'Draw offered — D to accept' : (st.full > 1 ? 'Move ' + st.full : 'Opening');
        panelText(ctx, PX + 48, y + 40, sub, 12, inCheck(st) ? '#ff9b9b' : P.ink2, 'left', 500);
      }
      y += 70;

      /* The two clocks, opponent on top so they sit the way the board does.
         The one that is running is the lit one — at a glance the panel should
         answer "whose move, and how worried are they" without being read. */
      if (CLOCKED) {
        for (const side of [MYSIDE ^ 1, MYSIDE]) {
          const live = !ended && st.side === side;
          const ms = Math.max(0, clock[side]);
          const low = ms <= 30000, crit = ms <= 10000;
          ctx.fillStyle = live ? (crit ? 'rgba(226,72,72,.20)' : low ? 'rgba(245,158,11,.16)' : 'rgba(255,255,255,.07)')
                               : 'rgba(255,255,255,.030)';
          rr(ctx, PX, y, PW, 40, 10); ctx.fill();
          ctx.strokeStyle = live ? (crit ? '#e24848' : low ? '#f59e0b' : 'rgba(255,255,255,.22)')
                                 : 'rgba(255,255,255,.07)';
          ctx.lineWidth = live ? 1.8 : 1;
          rr(ctx, PX, y, PW, 40, 10); ctx.stroke();
          /* the side's own colour, so the row is identifiable without reading */
          ctx.fillStyle = side === WHITE_S ? '#f2f5fa' : '#2a303c';
          ctx.beginPath(); ctx.arc(PX + 18, y + 20, 7, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
          panelText(ctx, PX + 34, y + 20,
                    (NAMES[side] || (side === WHITE_S ? 'White' : 'Black')), 12,
                    live ? P.ink : P.ink3, 'left', 600);
          panelText(ctx, PX + PW - 12, y + 20, clockText(ms), crit ? 21 : 19,
                    crit ? '#ff8f8f' : low ? '#ffc861' : (live ? P.ink : P.ink3), 'right', 800);
          y += 46;
        }
        panelText(ctx, PX, y + 4, TIME.l.toUpperCase(), 9.5, P.ink3, 'left', 700);
        y += 28;
      }

      /* what each side has taken, and by how much */
      for (const side of [MYSIDE ^ 1, MYSIDE]) {
        const list = taken[side] || [];
        panelText(ctx, PX, y, (NAMES[side] || (side ? 'Black' : 'White')).toUpperCase(), 10, P.ink3, 'left', 700);
        const pts = list.reduce((a, t) => a + VAL[t], 0);
        const other = (taken[side ^ 1] || []).reduce((a, t) => a + VAL[t], 0);
        if (pts > other) panelText(ctx, PX + PW, y, '+' + Math.round((pts - other) / 100), 11, '#8fe0a0', 'right', 700);
        let cx2 = PX, cy2 = y + 20;
        for (const t of list) {
          drawPiece(ctx, t | (side === BLACK_S ? 0 : BLACK), cx2 + 9, cy2, 22, .95);
          cx2 += 16;
          if (cx2 > PX + PW - 20) { cx2 = PX; cy2 += 20; }
        }
        y = cy2 + 26;
      }

      /* the score sheet, newest at the bottom */
      panelText(ctx, PX, y, 'MOVES', 10, P.ink3, 'left', 700);
      y += 16;
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      const listH = BY + BH - y;
      rr(ctx, PX - 8, y - 6, PW + 16, listH, 10); ctx.fill();
      const rows = Math.max(0, Math.floor((listH - 12) / 17));
      const pairs = [];
      for (let i = 0; i < moveLog.length; i += 2) pairs.push([moveLog[i], moveLog[i + 1]]);
      const shown = pairs.slice(Math.max(0, pairs.length - rows));
      shown.forEach((pr, i) => {
        const ry = y + 8 + i * 17;
        panelText(ctx, PX, ry, String(pr[0].n) + '.', 11, P.ink3, 'left', 600);
        panelText(ctx, PX + 30, ry, pr[0].s, 12, P.ink, 'left', 600);
        if (pr[1]) panelText(ctx, PX + 130, ry, pr[1].s, 12, P.ink2, 'left', 600);
      });

      if (resignHold > 0) {
        const f = clamp(resignHold / .9, 0, 1);
        ctx.fillStyle = 'rgba(220,60,60,.85)';
        ctx.fillRect(PX, BY + BH + 8, PW * f, 4);
        panelText(ctx, PX, BY + BH + 22, 'Hold R to resign', 11, '#ff9b9b', 'left', 600);
      }
    }

    /* ---- the front page ---- */
    /* The attract loop, a move at a time on the fixed step. It plays through
       the same rules as a game (so castling brings its rook and a capture
       fades), but touches nothing that sounds, scores or ends anything; after
       the mate has been admired the pieces walk home and it begins again. */
    function demo(dt) {
      if (homing) return;
      demoWait -= dt;
      if (demoWait > 0) return;
      if (demoPly >= OPERA.length) {
        const was = st.bd.slice();
        reset();
        startHoming(was, st.bd, false);
        demoPly = 0; demoWait = .9;
        return;
      }
      const u = OPERA[demoPly];
      const from = sqOf(8 - +u[1], FILES.indexOf(u[0])), to = sqOf(8 - +u[3], FILES.indexOf(u[2]));
      const m = legalMoves(st).find(x => mFrom(x) === from && mTo(x) === to);
      if (m === undefined) { demoPly = OPERA.length; demoWait = 2; return; }   // never stick on a bad list
      const before = st, after = applyMove(st, m);
      record(before, m, after);
      hist.push(before);
      st = after;
      last = { from, to };
      startSlide(before, m, after);
      lastT = 1;
      if (inCheck(st)) checkPulse = 1;
      demoPly++;
      const san = OPERA_SAN[demoPly - 1];
      demoWait = demoPly >= OPERA.length ? 4.4 : san.indexOf('!') >= 0 ? 1.7 : san.indexOf('+') >= 0 ? 1.45 : 1.1;
    }
    /* which way round the front page wants the board: facing whoever is
       about to sit down at it */
    function menuTurn() {
      const m = FK.mode();
      if (m !== 'solo') return m === 'guest' ? 1 : 0;
      return FK.opt('foe', 'ai') === 'ai' && FK.opt('seat', 'w') === 'b' ? 1 : 0;
    }
    /* Every piece on `to` gets a trip from a matching piece on `from`: one
       already home stays put, the nearest spare of its kind walks over, and a
       piece with nothing to come from (it was taken) appears on its square.
       Anything left over on `from` (a promoted queen, say) fades where it
       stood. The back ranks go first and the pawns after, left to right, the
       way a board is set. */
    function startHoming(from, to, loud) {
      const list = [], spare = [];
      for (let sq = 0; sq < 64; sq++) spare[sq] = from[sq] && from[sq] !== to[sq] ? from[sq] : 0;
      const order = [];
      for (let sq = 0; sq < 64; sq++) if (to[sq]) order.push(sq);
      order.sort((a, b) => ((typeOf(to[a]) === PAWN) - (typeOf(to[b]) === PAWN)) || (fileOf(a) - fileOf(b)));
      let end = 0;
      for (const sq of order) {
        const p = to[sq], wave = fileOf(sq) * .045 + (typeOf(p) === PAWN ? .12 : 0);
        if (from[sq] === p) { list.push({ k: 'stay', p, to: sq }); continue; }
        let best = -1, bd = 1e9;
        for (let s = 0; s < 64; s++) {
          if (spare[s] !== p) continue;
          const dd = Math.hypot(fileOf(s) - fileOf(sq), rankOf(s) - rankOf(sq));
          if (dd < bd) { bd = dd; best = s; }
        }
        let h;
        if (best >= 0) { spare[best] = 0; h = { k: 'move', p, from: best, to: sq, d: wave, dur: .36 + Math.min(.34, bd * .05) }; }
        else h = { k: 'in', p, to: sq, d: .16 + wave, dur: .34 };
        list.push(h);
        end = Math.max(end, h.d + h.dur);
      }
      for (let s = 0; s < 64; s++) if (spare[s]) { list.push({ k: 'out', p: spare[s], from: s, d: 0, dur: .28 }); end = Math.max(end, .28); }
      homing = { t: 0, end, list };
      homingLoud = !!loud;
      slides = []; sel = -1; marks = [];
      if (loud) { try { Sound.grab(); } catch (e) {} }
    }
    function drawHoming(ctx) {
      const t = homing.t, S = CELL * .82;
      for (const h of homing.list) {
        if (h.k === 'move') continue;
        if (h.k === 'stay') { const c = cxy(h.to); drawPiece(ctx, h.p, c.x, c.y + 2, S); continue; }
        const k = clamp((t - h.d) / h.dur, 0, 1);
        if (h.k === 'in') {
          if (k <= 0) continue;
          const c = cxy(h.to), s = FK.bo(k);
          ctx.save(); ctx.translate(c.x, c.y + 2); ctx.scale(s, s);
          drawPiece(ctx, h.p, 0, 0, S, Math.min(1, k * 2.5));
          ctx.restore();
        } else {
          if (k >= 1) continue;
          const c = cxy(h.from), s = 1 - k * .35;
          ctx.save(); ctx.translate(c.x, c.y + 2); ctx.scale(s, s);
          drawPiece(ctx, h.p, 0, 0, S, 1 - k);
          ctx.restore();
        }
      }
      /* the travellers last, so they pass over the pieces already standing */
      for (const h of homing.list) {
        if (h.k !== 'move') continue;
        const k = clamp((t - h.d) / h.dur, 0, 1);
        const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const a = cxy(h.from), b = cxy(h.to);
        const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
        const lift = Math.sin(k * Math.PI) * CELL * .14;
        if (lift > .3) {
          ctx.save();
          ctx.globalAlpha *= .3; ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.ellipse(x, y + CELL * .30, CELL * (.26 + lift / CELL * .5), CELL * .09, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        drawPiece(ctx, h.p, x, y + 2 - lift, S);
      }
    }
    /* behind the front page: the squares of a far bigger board, barely there
       and drifting, and a warm light where the name hangs */
    function drawMenuBack(ctx, a) {
      ctx.save();
      ctx.globalAlpha *= a;
      const S2 = 48, ox = (FK.t * 6) % (S2 * 2), oy = (FK.t * 3) % (S2 * 2), CX = PX + PW / 2;
      for (let gy = -2; gy * S2 < H + S2; gy++) for (let gx = -2; 560 + gx * S2 < W + S2; gx++) {
        if ((gx + gy) & 1) continue;
        const x = 560 + gx * S2 + ox, y = gy * S2 + oy;
        const dx = (x + S2 / 2 - CX) / 250, dy = (y + S2 / 2 - H / 2) / 340;
        const f = 1 - (dx * dx + dy * dy);
        if (f <= 0) continue;
        ctx.fillStyle = 'rgba(233,215,182,' + (.045 * f).toFixed(4) + ')';
        ctx.fillRect(x, y, S2, S2);
      }
      if (!glowCv) {
        glowCv = document.createElement('canvas'); glowCv.width = glowCv.height = 128;
        const c = glowCv.getContext('2d'), gg = c.createRadialGradient(64, 64, 2, 64, 64, 64);
        gg.addColorStop(0, 'rgba(255,196,110,.12)'); gg.addColorStop(1, 'rgba(255,196,110,0)');
        c.fillStyle = gg; c.fillRect(0, 0, 128, 128);
      }
      ctx.drawImage(glowCv, CX - 250, 108 - 250, 500, 500);
      ctx.restore();
    }
    /* the name, each letter set down like a piece (a drop, a squash, a
       settle), and after that a light that runs across the gold now and then */
    function drawTitle(ctx, cx, cy, T, word, size) {
      word = word || 'CHESS'; size = size || 100;
      const u = size / 100;
      ctx.save();
      ctx.font = 'italic 800 ' + size + 'px ' + Hud.FAM.cond;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      try { ctx.letterSpacing = '0px'; } catch (e) {}
      const gap = 5 * u, ws = [...word].map(c => ctx.measureText(c).width), span = ws.reduce((s2, w) => s2 + w, 0) + gap * (word.length - 1);
      let x = cx - span / 2;
      const L = [];
      [...word].forEach((c, i) => {
        const t = T - .16 - i * .085, lx = x + ws[i] / 2;
        x += ws[i] + gap;
        if (t <= 0) return;
        const fall = t < .24 ? 1 - Math.pow(t / .24, 2) : 0;
        const land = t >= .24 && t < .7 ? Math.sin((t - .24) / .46 * Math.PI * 2) * Math.exp(-(t - .24) * 7) : 0;
        L.push({ c, x: lx, y: cy - fall * 110 * u, sx: 1 + land * .14, sy: 1 - land * .18, a: Math.min(1, t / .1) });
      });
      const sh = T > 1.6 ? ((T - 1.6) % 6) / 1.2 : 9;      // 0..1 while the light crosses
      for (const q of L) {
        ctx.save();
        ctx.globalAlpha *= q.a;
        ctx.translate(q.x, q.y + 36 * u); ctx.scale(q.sx, q.sy); ctx.translate(0, -36 * u);
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(q.c, 2 * u, 6 * u);
        ctx.lineWidth = 6 * u; ctx.strokeStyle = '#0a0d15'; ctx.strokeText(q.c, 0, 0);
        const g = ctx.createLinearGradient(0, -40 * u, 0, 38 * u);
        g.addColorStop(0, '#fff7e2'); g.addColorStop(.46, '#f0d69c'); g.addColorStop(.54, '#d9ae62'); g.addColorStop(1, '#a8772f');
        ctx.save();
        ctx.shadowColor = 'rgba(255,186,84,.34)'; ctx.shadowBlur = 26 * u;
        ctx.fillStyle = g; ctx.fillText(q.c, 0, 0);
        ctx.restore();
        if (sh < 1) {
          const bx = cx - span / 2 - 20 * u + sh * (span + 40 * u) - q.x;
          const sg = ctx.createLinearGradient(bx - 34 * u, -40 * u, bx + 34 * u, 40 * u);
          sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.8)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg; ctx.fillText(q.c, 0, 0);
        }
        ctx.restore();
      }
      ctx.restore();
    }
    /* in a party the engine and the seat are not choices: who you are and
       whose clock it is go on a card instead */
    function drawOnline(ctx, x, y, w, h, mode) {
      const P2 = api.party, host = mode === 'host';
      ctx.fillStyle = 'rgba(3,5,10,.5)'; rr(ctx, x, y, w, h, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(233,215,182,.12)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, 14); ctx.stroke();
      FK.caps(ctx, 'Online match', x + 20, y + 24, 10, 'rgba(224,181,101,.9)', 'left', { track: .24 });
      FK.caps(ctx, 'Party of ' + P2.size, x + w - 20, y + 24, 10, 'rgba(233,215,182,.56)', 'right', { track: .2 });
      FK.text(ctx, host ? 'YOU PLAY WHITE' : 'YOU PLAY BLACK', x + 20, y + 62, 32, '#efe2c6', 'left', MENU_TH, { track: 1 });
      const lines = !host ? ['The host moves first, and the', 'clock is theirs to choose.']
        : P2.size < 2 ? ['Chess takes two. Invite someone', 'from the party list to play.']
        : ['You move first. The clock you', 'pick below is the one both get.'];
      ctx.save();
      ctx.font = '600 13px ' + Hud.FAM.sans; ctx.fillStyle = 'rgba(233,215,182,.72)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      lines.forEach((s, i) => ctx.fillText(s, x + 20, y + 102 + i * 19));
      ctx.restore();
      drawPiece(ctx, KING, x + w - 70, y + h - 40, 50);
      drawPiece(ctx, KING | BLACK, x + w - 34, y + h - 40, 50);
    }
    /* the demo's moment of mate, laid across the board */
    function drawMate(ctx) {
      if (mateAt < 0) return;
      const k = FK.t - mateAt;
      const a = clamp((k - .35) / .3, 0, 1) * clamp((3.9 - k) / .4, 0, 1);
      if (a <= 0) return;
      const cx = BX + BW / 2, cy = BY + BH / 2 + 4, e = FK.eo(clamp((k - .35) / .5, 0, 1)), hh = 48 * e;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = 'rgba(7,9,15,.82)'; ctx.fillRect(BX, cy - hh, BW, hh * 2);
      ctx.fillStyle = 'rgba(224,181,101,.75)'; ctx.fillRect(BX, cy - hh, BW, 1.5); ctx.fillRect(BX, cy + hh - 1.5, BW, 1.5);
      if (e > .3) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,186,84,.55)'; ctx.shadowBlur = 24;
        FK.text(ctx, 'CHECKMATE', cx, cy - 9, 46, '#f3d58f', 'center', MENU_TH, { track: 5, alpha: clamp((e - .3) / .5, 0, 1) });
        ctx.restore();
        FK.caps(ctx, 'Morphy mates with his last two pieces', cx, cy + 25, 9.5, 'rgba(233,215,182,.72)', 'center',
                { track: .24, alpha: clamp((e - .5) / .4, 0, 1) });
      }
      ctx.restore();
    }
    function drawMenu(ctx, live) {
      const T = live ? FK.t : 99, inn = (dl, dur) => live ? FK.in(dl, dur) : 1;
      const X = PX, WD = PW, CX = PX + PW / 2;
      const CREAM = '#efe2c6', MUTED = 'rgba(233,215,182,.56)', GOLD = 'rgba(224,181,101,.9)';

      /* what the board is playing, over it */
      const tk = inn(.35, .6);
      FK.caps(ctx, 'The Opera Game  ·  Paris, 1858', BX - 8, 27, 10, GOLD, 'left', { track: .24, alpha: tk });
      if (live && demoShown > 0) {
        const i = demoShown - 1, e = FK.eo(clamp((FK.t - plyAt) / .3, 0, 1)), n = (i >> 1) + 1;
        FK.text(ctx, n + (i & 1 ? '… ' : '. ') + OPERA_SAN[i], BX + BW + 8, 26 + (1 - e) * 9, 21, CREAM, 'right', MENU_TH,
                { alpha: e * tk, track: .5 });
      }

      /* the name */
      const ck = FK.eo(inn(.1, .5));
      ctx.save();
      ctx.globalAlpha *= ck;
      ctx.fillStyle = 'rgba(224,181,101,.5)';
      const rw = 40 * ck;
      ctx.fillRect(CX - 86 - rw, 44, rw, 1); ctx.fillRect(CX + 86, 44, rw, 1);
      FK.caps(ctx, 'The royal game', CX, 45, 10, GOLD, 'center', { track: .32 });
      ctx.restore();
      drawTitle(ctx, CX, 104, T);
      FK.caps(ctx, 'Castling, en passant and every draw', CX, 162, 9.5, MUTED, 'center', { track: .22, alpha: inn(.65, .5) });

      /* the choices, each row sliding in after the one above */
      const mode = FK.mode(), eng = FK.opt('foe', 'ai') === 'ai';
      let y = 194;
      const row = (i, label, fn) => {
        const k = FK.eo(inn(.5 + i * .08, .5));
        ctx.save();
        ctx.globalAlpha *= k; ctx.translate((1 - k) * 28, 0);
        if (label) FK.caps(ctx, label, X + 4, y, 10, MUTED, 'left', { track: .22 });
        fn(y);
        ctx.restore();
      };
      const CO = { size: 17, track: 1 };
      if (mode === 'solo') {
        row(0, 'Opponent', y0 => FK.chips(ctx, 'foe', X, y0 + 12, WD, 38, MENU_FOE, MENU_TH, Object.assign({ def: 'ai' }, CO)));
        y += 60;
        row(1, 'Engine strength', y0 => {
          const rec = REC[FK.opt('skill', 'club')];
          if (eng && Array.isArray(rec) && rec[0] + rec[1] + rec[2] > 0)
            FK.caps(ctx, 'Won ' + rec[0] + '  ·  drawn ' + rec[1] + '  ·  lost ' + rec[2], X + WD - 4, y0, 9, MUTED, 'right', { track: .14 });
          FK.chips(ctx, 'skill', X, y0 + 12, WD, 38, MENU_SKILL, MENU_TH, Object.assign({ def: 'club', live: eng }, CO));
        });
        y += 60;
        row(2, 'Play as', y0 => FK.chips(ctx, 'seat', X, y0 + 12, WD, 38, MENU_SEAT, MENU_TH, Object.assign({ def: 'w', live: eng }, CO)));
        y += 60;
      } else {
        row(0, '', y0 => drawOnline(ctx, X, y0 - 10, WD, 168, mode));
        y += 180;
      }
      row(3, 'Clock', y0 => FK.chips(ctx, 'time', X, y0 + 12, WD, 38, MENU_TIME, MENU_TH, Object.assign({ def: '5', live: mode !== 'guest' }, CO)));
      y += 64;

      /* Play, in brass, saying what it is about to start */
      const P2 = api.party, clk = CLOCK_WORDS[FK.opt('time', '5')] || '5 MIN';
      const seat = FK.opt('seat', 'w'), skill = FK.opt('skill', 'club');
      const label = mode === 'host' ? 'START MATCH' : mode === 'guest' ? 'WAITING FOR HOST' : 'PLAY';
      const sub = mode === 'guest' ? 'The host starts the game'
        : mode === 'host' ? (P2.size < 2 ? 'Needs a second player' : 'You play white  ·  ' + clk)
        : eng ? (seat === 'r' ? 'Random side' : seat === 'b' ? 'Black' : 'White') + '  ·  ' + skill + ' engine  ·  ' + clk
        : 'Two players, one screen  ·  ' + clk;
      const pk = FK.bo(inn(.85, .55)), py = y + (1 - pk) * 30;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, pk);
      FK.button(ctx, 'play', X, py, WD, 60, label, MENU_BTN, {
        live: mode !== 'guest', size: 30, track: 3, sub,
        fill: mode === 'guest' ? ['#5b6270', '#3c424e'] : ['#f7e0a6', '#c8913a'],
        ink: mode === 'guest' ? 'rgba(233,215,182,.85)' : '#2a1906',
        subInk: mode === 'guest' ? 'rgba(233,215,182,.6)' : undefined
      });
      ctx.restore();
      const fk = FK.bo(inn(.95, .55)), fy = y + 72 + (1 - fk) * 30;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, fk);
      FK.button(ctx, 'party', X, fy, WD, 42, P2.inRoom ? 'PARTY  ·  ' + P2.size : 'PLAY A FRIEND ONLINE', MENU_ALT,
                { fill: 'rgba(233,215,182,.07)', ink: CREAM, size: 19, track: 2 });
      ctx.restore();
      FK.caps(ctx, 'Space to play   ·   P for a party   ·   Esc for the hub', CX, 580, 8.5, 'rgba(233,215,182,.38)', 'center',
              { track: .16, alpha: inn(1.2, .5) });
    }

    return instance;
  }
});


