/* 經典接龍 Klondike Solitaire — 純邏輯引擎（window.__sol）
   狀態 S：stock/waste/foundations/tableau，抽1、K 入空列、疊放降序異色、A→K 上基。 */
(function () {
  'use strict';
  var SAVE_KEY = 'solitaire.klondike.v1';
  var SUITS = ['S', 'H', 'D', 'C'];               // ♠♥♦♣
  function color(s) { return (s === 'H' || s === 'D') ? 'red' : 'black'; }

  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  var S = null;

  // ── 求解器：確認牌局是否可解（sound；達節點上限未解出則回 false）──────────────
  function _solvable(gameState, nodeCap) {
    var SI = { S: 0, H: 1, D: 2, C: 3 };
    function enc(card) { return (card.r - 1) * 4 + SI[card.s]; }
    function rank(v) { return (v >> 2) + 1; }
    function suit(v) { return v & 3; }
    function red(v) { var s = v & 3; return s === 1 || s === 2; }
    var init = {
      stock: gameState.stock.map(enc), waste: gameState.waste.map(enc),
      f: [gameState.found.S.length, gameState.found.H.length, gameState.found.D.length, gameState.found.C.length],
      tab: gameState.tab.map(function (p) { return p.map(function (c) { return { v: enc(c), up: c.up }; }); })
    };
    function cl(SS) { return { stock: SS.stock.slice(), waste: SS.waste.slice(), f: SS.f.slice(), tab: SS.tab.map(function (p) { return p.map(function (c) { return { v: c.v, up: c.up }; }); }) }; }
    function win(SS) { return SS.f[0] === 13 && SS.f[1] === 13 && SS.f[2] === 13 && SS.f[3] === 13; }
    function key(SS) {
      var t = ''; for (var i = 0; i < 7; i++) { var p = SS.tab[i]; for (var j = 0; j < p.length; j++) t += (p[j].up ? '' : 'x') + p[j].v + '.'; t += '|'; }
      return SS.f.join(',') + '#' + SS.stock.join('.') + '#' + SS.waste.join('.') + '#' + t;
    }
    function canPlace(v, p) { if (!p.length) return rank(v) === 13; var top = p[p.length - 1]; return top.up && rank(top.v) === rank(v) + 1 && red(top.v) !== red(v); }
    function flip(p) { if (p.length && !p[p.length - 1].up) p[p.length - 1].up = true; }
    function safeOK(v, SS) { var r = rank(v), su = suit(v); if (SS.f[su] !== r - 1) return false; if (r <= 2) return true; var opp = red(v) ? [0, 3] : [1, 2]; return SS.f[opp[0]] >= r - 1 && SS.f[opp[1]] >= r - 1; }
    function applySafe(SS) {
      var any = false, again = true;
      while (again) {
        again = false;
        if (SS.waste.length) { var v = SS.waste[SS.waste.length - 1]; if (safeOK(v, SS)) { SS.waste.pop(); SS.f[suit(v)]++; any = again = true; continue; } }
        for (var c = 0; c < 7; c++) { var p = SS.tab[c]; if (p.length) { var t = p[p.length - 1]; if (t.up && safeOK(t.v, SS)) { p.pop(); SS.f[suit(t.v)]++; flip(p); any = again = true; break; } } }
      }
      return any;
    }
    function children(SS) {
      var out = [], n;
      var s2 = cl(SS); if (applySafe(s2)) { out.push(s2); return out; }          // 安全自動上基＝強制步
      for (var c = 0; c < 7; c++) { var p = SS.tab[c]; if (p.length) { var t = p[p.length - 1]; if (t.up && SS.f[suit(t.v)] === rank(t.v) - 1) { n = cl(SS); n.tab[c].pop(); n.f[suit(t.v)]++; flip(n.tab[c]); out.push(n); } } }
      if (SS.waste.length) { var wv = SS.waste[SS.waste.length - 1]; if (SS.f[suit(wv)] === rank(wv) - 1) { n = cl(SS); n.waste.pop(); n.f[suit(wv)]++; out.push(n); } }
      if (SS.waste.length) { var wv2 = SS.waste[SS.waste.length - 1]; for (var d = 0; d < 7; d++) if (canPlace(wv2, SS.tab[d])) { n = cl(SS); n.waste.pop(); n.tab[d].push({ v: wv2, up: true }); out.push(n); } }
      for (var sc = 0; sc < 7; sc++) {
        var pile = SS.tab[sc], startIdx = -1;
        for (var i = pile.length - 1; i >= 0; i--) {
          if (!pile[i].up) break;
          if (i === pile.length - 1) startIdx = i;
          else { var a = pile[i], b = pile[i + 1]; if (rank(a.v) === rank(b.v) + 1 && red(a.v) !== red(b.v)) startIdx = i; else break; }
        }
        if (startIdx < 0) continue;
        for (var idx = startIdx; idx < pile.length; idx++) {
          var moving = pile.slice(idx), bottom = moving[0].v;
          for (var dc = 0; dc < 7; dc++) {
            if (dc === sc) continue;
            if (canPlace(bottom, SS.tab[dc])) {
              if (idx === 0 && SS.tab[dc].length === 0) continue;                  // 空列間搬 K 無意義
              n = cl(SS); n.tab[sc].splice(idx); for (var m = 0; m < moving.length; m++) n.tab[dc].push({ v: moving[m].v, up: true }); flip(n.tab[sc]); out.push(n);
            }
          }
        }
      }
      if (SS.stock.length) { n = cl(SS); n.waste.push(n.stock.pop()); out.push(n); }
      else if (SS.waste.length) { n = cl(SS); n.stock = n.waste.slice().reverse(); n.waste = []; out.push(n); }
      return out;
    }
    function fdown(SS) { var n = 0; for (var i = 0; i < 7; i++) { var p = SS.tab[i]; for (var j = 0; j < p.length; j++) if (!p[j].up) n++; } return n; }
    function score(SS) { return (SS.f[0] + SS.f[1] + SS.f[2] + SS.f[3]) * 22 + (21 - fdown(SS)); }
    // 最佳優先：以「上基數×22 ＋ 已翻開數」分桶，優先展開最接近完成的局面
    var visited = {}, nodes = 0, buckets = [], top = -1;
    function push(SS) { var s = score(SS); (buckets[s] || (buckets[s] = [])).push(SS); if (s > top) top = s; }
    push(init);
    while (top >= 0) {
      if (nodes++ > nodeCap) return false;
      var SS = buckets[top].pop();
      while (top >= 0 && (!buckets[top] || !buckets[top].length)) top--;
      if (!SS) continue;
      if (win(SS)) return true;
      var k = key(SS); if (visited[k]) continue; visited[k] = 1;
      var ch = children(SS);
      for (var i = 0; i < ch.length; i++) push(ch[i]);
    }
    return false;
  }

  function _deal() {
    var deck = [];
    for (var si = 0; si < 4; si++) for (var r = 1; r <= 13; r++) deck.push({ r: r, s: SUITS[si], up: false });
    shuffle(deck);
    var tab = [[], [], [], [], [], [], []];
    for (var c = 0; c < 7; c++) {
      for (var k = 0; k <= c; k++) {
        var card = deck.pop();
        card.up = (k === c);
        tab[c].push(card);
      }
    }
    return {
      stock: deck, waste: [], found: { S: [], H: [], D: [], C: [] }, tab: tab,
      undo: [], moves: 0, start: nowMs(), elapsed: 0, status: 'playing'
    };
  }

  // winnable !== false 時，用求解器只挑「確認解得開」的牌局（sound：回 true 必真有解）
  function newGame(winnable) {
    var t0 = nowMs(), tries = 0, cand = null, verified = false;
    if (winnable === false) { S = _deal(); }
    else {
      do {
        cand = _deal(); tries++;
        if (_solvable(cand, 40000)) { S = cand; verified = true; break; }
        S = null;
      } while (nowMs() - t0 < 1500 && tries < 80);
      if (!S) S = cand;   // 逾時保底：用最後一副（極少發生）
    }
    S.solvableChecked = verified;
    save();
    return S;
  }

  function snapshot() {
    S.undo.push(clone({ stock: S.stock, waste: S.waste, found: S.found, tab: S.tab, moves: S.moves }));
    if (S.undo.length > 200) S.undo.shift();
  }

  // ── 規則判定 ──────────────────────────────────────────
  function isRun(cards) {                 // 降序、顏色交替
    for (var i = 0; i < cards.length; i++) {
      if (!cards[i].up) return false;
      if (i > 0) {
        if (cards[i - 1].r !== cards[i].r + 1) return false;
        if (color(cards[i - 1].s) === color(cards[i].s)) return false;
      }
    }
    return true;
  }
  function canPlaceOnTab(card, col) {
    var pile = S.tab[col];
    if (!pile.length) return card.r === 13;            // 空列只收 K
    var top = pile[pile.length - 1];
    if (!top.up) return false;
    return top.r === card.r + 1 && color(top.s) !== color(card.s);
  }
  function canPlaceOnFound(card, suit) {
    if (card.s !== suit) return false;
    var f = S.found[suit];
    return f.length ? (f[f.length - 1].r + 1 === card.r) : (card.r === 1);
  }

  // ── 動作 ──────────────────────────────────────────────
  function draw() {
    if (S.status !== 'playing') return false;
    if (!S.stock.length) {                 // 重洗：waste 全部翻回 stock（蓋著）
      if (!S.waste.length) return false;
      snapshot();
      S.stock = S.waste.reverse().map(function (c) { c.up = false; return c; });
      S.waste = [];
      S.moves++; save(); return true;
    }
    snapshot();
    var c = S.stock.pop(); c.up = true; S.waste.push(c);
    S.moves++; save(); return true;
  }

  function _flipExposed(col) {
    var p = S.tab[col];
    if (p.length && !p[p.length - 1].up) p[p.length - 1].up = true;
  }
  function _afterMove() {
    S.moves++;
    if (won()) { S.status = 'won'; S.elapsed = elapsed(); }
    save();
  }

  // 來源 → tableau 目標列
  function moveToTab(src, toCol) {
    if (S.status !== 'playing') return false;
    var cards, fromCol = -1;
    if (src.zone === 'waste') {
      if (!S.waste.length) return false;
      cards = [S.waste[S.waste.length - 1]];
    } else if (src.zone === 'found') {
      var f = S.found[src.suit];
      if (!f.length) return false;
      cards = [f[f.length - 1]];
    } else {                               // tableau 連續段
      fromCol = src.col;
      cards = S.tab[fromCol].slice(src.idx);
      if (!cards.length || !isRun(cards)) return false;
      if (fromCol === toCol) return false;
    }
    if (!canPlaceOnTab(cards[0], toCol)) return false;
    snapshot();
    if (src.zone === 'waste') S.waste.pop();
    else if (src.zone === 'found') S.found[src.suit].pop();
    else { S.tab[fromCol].splice(src.idx); _flipExposed(fromCol); }
    for (var i = 0; i < cards.length; i++) S.tab[toCol].push(cards[i]);
    _afterMove();
    return true;
  }

  // 來源 → foundation（僅單張頂牌）
  function moveToFound(src) {
    if (S.status !== 'playing') return false;
    var card, fromCol = -1;
    if (src.zone === 'waste') { if (!S.waste.length) return false; card = S.waste[S.waste.length - 1]; }
    else if (src.zone === 'tab') {
      fromCol = src.col;
      if (src.idx !== S.tab[fromCol].length - 1) return false;   // 只有頂牌
      card = S.tab[fromCol][src.idx];
    } else return false;
    if (!canPlaceOnFound(card, card.s)) return false;
    snapshot();
    if (src.zone === 'waste') S.waste.pop();
    else { S.tab[fromCol].pop(); _flipExposed(fromCol); }
    S.found[card.s].push(card);
    _afterMove();
    return true;
  }

  // 自動把某來源送上基座（雙擊用）
  function autoToFound(src) { return moveToFound(src); }

  function _noFaceDown() {
    for (var c = 0; c < 7; c++) for (var i = 0; i < S.tab[c].length; i++) if (!S.tab[c][i].up) return false;
    return true;
  }

  // 在複本上用「頂牌上基＋抽牌/回收」貪婪模擬，確認能否完整收完（與 autoFinishStep 同邏輯）
  function _autoWins() {
    var c = clone({ stock: S.stock, waste: S.waste, found: S.found, tab: S.tab });
    function canF(card) { return c.found[card.s].length === card.r - 1; }
    function full() { return c.found.S.length === 13 && c.found.H.length === 13 && c.found.D.length === 13 && c.found.C.length === 13; }
    var guard = 0, sinceProgress = 0;
    while (guard++ < 4000) {
      if (full()) return true;
      var moved = false, col;
      for (col = 0; col < 7; col++) { var p = c.tab[col]; if (p.length) { var t = p[p.length - 1]; if (t.up && canF(t)) { p.pop(); c.found[t.s].push(t); moved = true; break; } } }
      if (!moved && c.waste.length) { var w = c.waste[c.waste.length - 1]; if (canF(w)) { c.waste.pop(); c.found[w.s].push(w); moved = true; } }
      if (moved) { sinceProgress = 0; continue; }
      if (c.stock.length) { c.waste.push(c.stock.pop()); sinceProgress++; }
      else if (c.waste.length) { c.stock = c.waste.slice().reverse(); c.waste = []; sinceProgress++; }
      else return false;
      if (sinceProgress > (c.stock.length + c.waste.length + 2)) return false;  // 抽完一圈仍無法上基 → 卡住
    }
    return false;
  }

  // 台面暗牌全翻開、且確認能靠自動收牌完整收完，才允許自動完成（避免收一半卡住）
  function canAutoFinish() {
    return !!(S && S.status === 'playing' && _noFaceDown() && !won() && _autoWins());
  }

  // 自動收牌單步：優先把可上基的頂牌/廢牌送上去，否則抽牌/回收以觸及牌庫內的牌。
  // 回傳 'move' | 'draw' | 'recycle' | 'done' | 'stuck'
  function autoFinishStep() {
    if (!S || S.status !== 'playing') return 'done';
    if (won()) { S.status = 'won'; S.elapsed = elapsed(); save(); return 'done'; }
    for (var c = 0; c < 7; c++) {
      var p = S.tab[c];
      if (p.length) { var t = p[p.length - 1]; if (t.up && canPlaceOnFound(t, t.s)) { p.pop(); S.found[t.s].push(t); S.moves++; if (won()) { S.status = 'won'; S.elapsed = elapsed(); } save(); return 'move'; } }
    }
    if (S.waste.length) { var w = S.waste[S.waste.length - 1]; if (canPlaceOnFound(w, w.s)) { S.waste.pop(); S.found[w.s].push(w); S.moves++; if (won()) { S.status = 'won'; S.elapsed = elapsed(); } save(); return 'move'; } }
    if (S.stock.length) { var d = S.stock.pop(); d.up = true; S.waste.push(d); save(); return 'draw'; }
    if (S.waste.length) { S.stock = S.waste.reverse().map(function (x) { x.up = false; return x; }); S.waste = []; save(); return 'recycle'; }
    return 'stuck';
  }

  // 一鍵自動完成（即時，供 ⚡ 按鈕）：需台面全翻開
  function autoComplete() {
    if (!canAutoFinish()) return 0;
    var moved = 0, guard = 0, r;
    while (guard++ < 3000) { r = autoFinishStep(); if (r === 'move') moved++; if (r === 'done' || r === 'stuck') break; }
    return moved;
  }

  function canAutoComplete() { return canAutoFinish(); }

  function won() { return S.found.S.length === 13 && S.found.H.length === 13 && S.found.D.length === 13 && S.found.C.length === 13; }

  function undo() {
    if (!S || !S.undo.length) return false;
    var prev = S.undo.pop();
    S.stock = prev.stock; S.waste = prev.waste; S.found = prev.found; S.tab = prev.tab; S.moves = prev.moves;
    S.status = 'playing';
    save(); return true;
  }

  // 提示：找一個有意義的移動（頂牌上基 or waste/頂牌可疊到別列）
  function hint() {
    // 1) 任何來源可上基
    if (S.waste.length && canPlaceOnFound(S.waste[S.waste.length - 1], S.waste[S.waste.length - 1].s))
      return { from: { zone: 'waste' }, to: { zone: 'found' } };
    for (var c = 0; c < 7; c++) { var p = S.tab[c]; if (p.length) { var t = p[p.length - 1]; if (t.up && canPlaceOnFound(t, t.s)) return { from: { zone: 'tab', col: c, idx: p.length - 1 }, to: { zone: 'found' } }; } }
    // 2) waste → tableau
    if (S.waste.length) { var w = S.waste[S.waste.length - 1]; for (var d = 0; d < 7; d++) if (canPlaceOnTab(w, d)) return { from: { zone: 'waste' }, to: { zone: 'tab', col: d } }; }
    // 3) tableau 露出蓋牌的有效搬移
    for (var fc = 0; fc < 7; fc++) {
      var pile = S.tab[fc];
      for (var i = 0; i < pile.length; i++) {
        if (!pile[i].up) continue;
        var tail = pile.slice(i);
        if (!isRun(tail)) continue;
        var exposesFlip = (i > 0 && !pile[i - 1].up) || i === 0;
        for (var tc = 0; tc < 7; tc++) { if (tc === fc) continue; if (canPlaceOnTab(tail[0], tc)) { if (exposesFlip || tail[0].r === 13 && i === 0) return { from: { zone: 'tab', col: fc, idx: i }, to: { zone: 'tab', col: tc } }; } }
        break;   // 該列只需看第一張可動的
      }
    }
    return null;
  }

  function elapsed() { return S.elapsed || (S.start ? Math.floor((nowMs() - S.start) / 1000) : 0); }

  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.tab && s.found) { S = s; if (!S.undo) S.undo = []; if (S.status === 'playing') S.start = nowMs() - (S.elapsed || 0) * 1000; return true; } } catch (e) {} return false; }

  window.__sol = {
    SUITS: SUITS, color: color,
    newGame: newGame, state: function () { return S; },
    draw: draw, moveToTab: moveToTab, moveToFound: moveToFound, autoToFound: autoToFound,
    autoComplete: autoComplete, canAutoComplete: canAutoComplete,
    canAutoFinish: canAutoFinish, autoFinishStep: autoFinishStep,
    canPlaceOnTab: canPlaceOnTab, canPlaceOnFound: canPlaceOnFound, isRun: isRun,
    undo: undo, hint: hint, won: won, elapsed: elapsed,
    isSolvable: function (st, cap) { return _solvable(st || S, cap || 16000); },
    load: load, save: save, clearSave: clearSave
  };
})();
