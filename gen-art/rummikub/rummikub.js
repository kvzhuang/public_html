'use strict';
/* ============================================================
   拉密牌 Rummikub · 一人對三電腦（經典規則）
   牌：{c:0..3,n:1..13} 或 joker:{joker:true}
   顏色 c：0 紅 R / 1 藍 B / 2 橘 O / 3 黑 K；各色 1..13 各兩張 ＋ 2 鬼牌 = 106
   組合：group=同數字不同色 3~4 張；run=同色連號 ≥3 張；鬼牌可代任意牌。
   首次下牌需自己手牌組成之牌型合計 ≥30 分（鬼牌算所代表的數字）。
   ============================================================ */

var NCOLORS = 4, JOKER_PTS = 30;

function buildDeck() {
  var d = [];
  for (var copy = 0; copy < 2; copy++)
    for (var c = 0; c < NCOLORS; c++)
      for (var n = 1; n <= 13; n++) d.push({ c: c, n: n });
  d.push({ joker: true }); d.push({ joker: true });
  return d;
}
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// tiles → counts[c][n] (n 1..13) ＋ 鬼牌數
function toCounts(tiles) {
  var cnt = [], jk = 0;
  for (var c = 0; c < NCOLORS; c++) { cnt[c] = []; for (var n = 0; n <= 13; n++) cnt[c][n] = 0; }
  for (var i = 0; i < tiles.length; i++) { var t = tiles[i]; if (t.joker) jk++; else cnt[t.c][t.n]++; }
  return { cnt: cnt, jk: jk };
}
function cloneCnt(cnt) { var o = []; for (var c = 0; c < NCOLORS; c++) o[c] = cnt[c].slice(); return o; }
function keyOf(cnt, jk) { var s = ''; for (var c = 0; c < NCOLORS; c++) s += cnt[c].join(',') + '|'; return s + jk; }

// 產生「覆蓋最低牌 (fc,fn)」的所有候選牌型（group / run）
function genSets(cnt, jk, fc, fn) {
  var out = [];
  // ── group：同數字 fn、不同色，含 fc 的真牌 ──
  var others = [];
  for (var c = 0; c < NCOLORS; c++) if (c !== fc) others.push(c);
  // realMask: 其他色是否有真牌可用；列舉其他色的「真牌子集」＋「鬼牌補幾色」
  function combos(idx, chosenReal, jokColors) {
    var size = 1 + chosenReal.length + jokColors.length;
    if (size >= 3 && size <= 4 && jokColors.length <= jk) {
      var items = [{ c: fc, n: fn }];
      var useReal = [[fc, fn]], useJok = jokColors.length;
      chosenReal.forEach(function (c) { items.push({ c: c, n: fn }); useReal.push([c, fn]); });
      jokColors.forEach(function (c) { items.push({ c: c, n: fn, joker: true }); });
      out.push({ kind: 'group', items: items, useReal: useReal, useJok: useJok });
    }
    if (idx >= others.length) return;
    var c = others[idx];
    combos(idx + 1, chosenReal, jokColors);                       // 不用此色
    if (cnt[c][fn] > 0) combos(idx + 1, chosenReal.concat(c), jokColors);  // 用真牌
    combos(idx + 1, chosenReal, jokColors.concat(c));             // 用鬼牌代此色
  }
  combos(0, [], []);
  // ── run：同色 fc，自 fn 起連號 ≥3，缺口以鬼牌補 ──
  // 遞迴延伸；usedReal 記各位置用掉的真牌，jokUsed 記鬼牌
  function extend(pos, seq, realUse, jokUsed) {
    if (seq.length >= 3) {
      var items = seq.map(function (s) { return s.joker ? { c: fc, n: s.n, joker: true } : { c: fc, n: s.n }; });
      out.push({ kind: 'run', items: items, useReal: realUse.slice(), useJok: jokUsed });
    }
    if (pos > 13 || seq.length >= 13) return;
    var haveReal = cnt[fc][pos] - realUse.filter(function (r) { return r[1] === pos; }).length > 0;
    if (haveReal) extend(pos + 1, seq.concat({ n: pos }), realUse.concat([[fc, pos]]), jokUsed);
    if (jk - jokUsed > 0) extend(pos + 1, seq.concat({ n: pos, joker: true }), realUse, jokUsed + 1);
  }
  // 起始位置 fn 必用真牌（覆蓋最低牌）
  extend(fn + 1, [{ n: fn }], [[fc, fn]], 0);
  return out;
}

// 把整組牌完全分割成合法牌型；回傳 sets 陣列或 null
function partition(tiles) {
  var s = toCounts(tiles), memo = {};
  function rec(cnt, jk) {
    var key = keyOf(cnt, jk);
    if (key in memo) return memo[key];
    var fc = -1, fn = -1;
    for (var n = 1; n <= 13 && fc < 0; n++) for (var c = 0; c < NCOLORS; c++) if (cnt[c][n] > 0) { fc = c; fn = n; break; }
    if (fc < 0) { var r = (jk === 0) ? [] : null; memo[key] = r; return r; }
    var cands = genSets(cnt, jk, fc, fn);
    for (var i = 0; i < cands.length; i++) {
      var set = cands[i], c2 = cloneCnt(cnt), j2 = jk - set.useJok;
      for (var k = 0; k < set.useReal.length; k++) c2[set.useReal[k][0]][set.useReal[k][1]]--;
      var sub = rec(c2, j2);
      if (sub) { var res = [set].concat(sub); memo[key] = res; return res; }
    }
    memo[key] = null; return null;
  }
  return rec(s.cnt, s.jk);
}
function isSolvable(tiles) { return partition(tiles) !== null; }

// 一張牌的分數（鬼牌算所代表數字；未指定則 0）
function tileVal(t) { return t.n || 0; }
function setsValue(sets) { var v = 0; sets.forEach(function (s) { s.items.forEach(function (it) { v += it.n || 0; }); }); return v; }
function setsCount(sets) { var n = 0; sets.forEach(function (s) { n += s.items.length; }); return n; }

// 從手牌挑出「不相交合法牌型」的子集，最大化張數（tie-break 分數）；回傳 {sets,tiles,value}
function bestMeld(handTiles) {
  var s = toCounts(handTiles), memo = {};
  function rec(cnt, jk) {
    var key = keyOf(cnt, jk);
    if (key in memo) return memo[key];
    var fc = -1, fn = -1;
    for (var n = 1; n <= 13 && fc < 0; n++) for (var c = 0; c < NCOLORS; c++) if (cnt[c][n] > 0) { fc = c; fn = n; break; }
    if (fc < 0) { var base = { sets: [], tiles: 0, value: 0 }; memo[key] = base; return base; }
    // 選項 A：這張最低牌不放（留手中）
    var c0 = cloneCnt(cnt); c0[fc][fn]--;
    var best = rec(c0, jk); best = { sets: best.sets, tiles: best.tiles, value: best.value };
    // 選項 B：用一個牌型覆蓋它
    var cands = genSets(cnt, jk, fc, fn);
    for (var i = 0; i < cands.length; i++) {
      var set = cands[i], c2 = cloneCnt(cnt), j2 = jk - set.useJok;
      for (var k = 0; k < set.useReal.length; k++) c2[set.useReal[k][0]][set.useReal[k][1]]--;
      var sub = rec(c2, j2);
      var setVal = 0; set.items.forEach(function (it) { setVal += it.n || 0; });
      var cand = { sets: [set].concat(sub.sets), tiles: set.items.length + sub.tiles, value: setVal + sub.value };
      if (cand.tiles > best.tiles || (cand.tiles === best.tiles && cand.value > best.value)) best = cand;
    }
    memo[key] = best; return best;
  }
  return rec(s.cnt, s.jk);
}

// ── 局狀態 ──
function newState() {
  var deck = shuffle(buildDeck());
  var hands = [[], [], [], []];
  for (var r = 0; r < 14; r++) for (var p = 0; p < 4; p++) hands[p].push(deck.pop());
  return { hands: hands, pool: deck, board: [], melded: [false, false, false, false], turn: 0, over: false, winner: -1, passes: 0 };
}
function boardTiles(s) { var out = []; s.board.forEach(function (set) { set.items.forEach(function (it) { out.push(it); }); }); return out; }
function drawTile(s, p) { if (!s.pool.length) return null; var t = s.pool.pop(); s.hands[p].push(t); return t; }

// 移除手牌中對應的實體牌（依 c/n/joker 比對，逐一移除一張）
function removeFromHand(hand, tiles) {
  tiles.forEach(function (t) {
    for (var i = 0; i < hand.length; i++) {
      var h = hand[i];
      if ((t.joker && h.joker) || (!t.joker && !h.joker && h.c === t.c && h.n === t.n)) { hand.splice(i, 1); return; }
    }
  });
}

// ── AI：回傳這回合的動作 {type:'play',sets,used}|{type:'draw'} ──
function aiTurn(s, p, opts) {
  var hand = s.hands[p];
  if (!s.melded[p]) {
    var m = bestMeld(hand);
    if (m.tiles > 0 && m.value >= 30) return { type: 'meld', sets: m.sets };
    return { type: 'draw' };
  }
  // 已破冰：逐張找可接上桌面的牌（prefix 皆保持可解），但「每回合只出一小批」以放慢節奏、
  // 讓真人有時間發展（可調 opts.maxPlay / opts.lazy）。
  var maxPlay = (opts && opts.maxPlay != null) ? opts.maxPlay : 3;   // 每回合最多出 3 張，防止一次全倒
  var lazy = (opts && opts.lazy != null) ? opts.lazy : 0;            // 不隨機偷懶（避免拖太長）
  var added = [], workHand = hand.slice(), progress = true;
  while (progress && added.length < maxPlay) {   // 找到 maxPlay 張就停（省時、也天然放慢）
    progress = false;
    for (var i = 0; i < workHand.length; i++) {
      var t = workHand[i];
      if (isSolvable(boardTiles(s).concat(added).concat([t]))) { added.push(t); workHand.splice(i, 1); progress = true; break; }
    }
  }
  var play = added.slice(0, maxPlay);            // 只出前幾張（prefix 仍保證整桌可解）
  if (play.length === 0) {                        // 沒有可接的牌 → 試著只出「一組」新牌型
    var nm = bestMeld(hand);
    if (nm.tiles >= 3) play = pickHandInstances(hand, [nm.sets[0]]);
  }
  if (play.length === 0) return { type: 'draw' };
  if (Math.random() < lazy && s.pool.length > 0) return { type: 'draw' };   // 偶爾偷懶抽牌
  var sets = partition(boardTiles(s).concat(play));
  if (!sets && added.length) { play = added.slice(0, 1); sets = partition(boardTiles(s).concat(play)); }
  if (!sets) return { type: 'draw' };
  return { type: 'play', sets: sets, used: play };
}
// 依 bestMeld 的 sets 從手牌取出實際牌張（含鬼牌）
function pickHandInstances(hand, sets) {
  var pool = hand.slice(), out = [];
  sets.forEach(function (set) {
    set.items.forEach(function (it) {
      for (var i = 0; i < pool.length; i++) {
        var h = pool[i];
        if ((it.joker && h.joker) || (!it.joker && !h.joker && h.c === it.c && h.n === it.n)) { out.push(h); pool.splice(i, 1); break; }
      }
    });
  });
  return out;
}

var _API = { buildDeck: buildDeck, shuffle: shuffle, partition: partition, isSolvable: isSolvable, bestMeld: bestMeld, newState: newState, boardTiles: boardTiles, drawTile: drawTile, removeFromHand: removeFromHand, aiTurn: aiTurn, toCounts: toCounts, genSets: genSets, setsValue: setsValue, setsCount: setsCount };
if (typeof module !== 'undefined' && module.exports) module.exports = _API;
if (typeof window !== 'undefined') window.__rk = _API;
