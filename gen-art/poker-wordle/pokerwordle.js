/* Poker Wordle — 撲克 Wordle 推理解謎（單人）
   猜出 5 張謎底手牌；每張分「數字/花色」雙維度給綠黃灰＋高低箭頭。 */
(function () {
  'use strict';

  var RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  var SUITS = ['S', 'H', 'D', 'C'];
  var SUIT_SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
  var SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 };   // 排序：S>H>D>C
  var MAX_ROWS = 6, HAND = 5;
  var SAVE_KEY = 'pokerwordle.save.v1';
  var STATS_KEY = 'pokerwordle.stats.v1';

  function rankLabel(r) { return r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r); }
  function isRed(s) { return s === 'H' || s === 'D'; }

  // 強制排序：數字大→小；同數字 S>H>D>C
  function sortHand(cards) {
    return cards.slice().sort(function (a, b) {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    });
  }

  // ── 純函式：Two-Pass 判定（數字、花色各自獨立）──────────────
  // 猜測與謎底都排成大→小再逐格比對（位置固定，只需猜出「哪 5 張牌」）。
  function evaluateGuess(guessRaw, targetRaw) {
    var guess = sortHand(guessRaw), target = sortHand(targetRaw);
    var res = [];
    for (var i = 0; i < HAND; i++) res.push({ rank: guess[i].rank, suit: guess[i].suit, rankStatus: 'ABSENT', suitStatus: 'ABSENT', rankHint: null });

    // 數字 Two-Pass
    var rpool = {};
    for (i = 0; i < HAND; i++) rpool[target[i].rank] = (rpool[target[i].rank] || 0) + 1;
    for (i = 0; i < HAND; i++) if (guess[i].rank === target[i].rank) { res[i].rankStatus = 'CORRECT'; rpool[guess[i].rank]--; }
    for (i = 0; i < HAND; i++) {
      if (res[i].rankStatus === 'CORRECT') continue;
      if (rpool[guess[i].rank] > 0) { res[i].rankStatus = 'PRESENT'; rpool[guess[i].rank]--; }
      else res[i].rankStatus = 'ABSENT';
      // 箭頭：與同位置謎底比高低（加速收斂）
      if (guess[i].rank > target[i].rank) res[i].rankHint = 'DOWN';
      else if (guess[i].rank < target[i].rank) res[i].rankHint = 'UP';
    }
    // 花色 Two-Pass
    var spool = {};
    for (i = 0; i < HAND; i++) spool[target[i].suit] = (spool[target[i].suit] || 0) + 1;
    for (i = 0; i < HAND; i++) if (guess[i].suit === target[i].suit) { res[i].suitStatus = 'CORRECT'; spool[guess[i].suit]--; }
    for (i = 0; i < HAND; i++) {
      if (res[i].suitStatus === 'CORRECT') continue;
      if (spool[guess[i].suit] > 0) { res[i].suitStatus = 'PRESENT'; spool[guess[i].suit]--; }
      else res[i].suitStatus = 'ABSENT';
    }
    return res;
  }

  function isWin(evalRow) { return evalRow.every(function (c) { return c.rankStatus === 'CORRECT' && c.suitStatus === 'CORRECT'; }); }

  // ── 撲克牌型判定（給 meta 線索）──────────────────────────
  function handCategory(cards) {
    var rs = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; });
    var suits = cards.map(function (c) { return c.suit; });
    var flush = suits.every(function (s) { return s === suits[0]; });
    var uniq = rs.filter(function (v, i) { return rs.indexOf(v) === i; });
    var straight = uniq.length === 5 && (rs[4] - rs[0] === 4);
    // A-2-3-4-5（A 當 1）
    if (!straight && uniq.length === 5 && rs[4] === 14 && rs[0] === 2 && rs[1] === 3 && rs[2] === 4 && rs[3] === 5) straight = true;
    var cnt = {}; rs.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
    var counts = Object.keys(cnt).map(function (k) { return cnt[k]; }).sort(function (a, b) { return b - a; });
    if (straight && flush && rs[0] === 10) return '皇家同花順';
    if (straight && flush) return '同花順';
    if (counts[0] === 4) return '四條';
    if (counts[0] === 3 && counts[1] === 2) return '葫蘆';
    if (flush) return '同花';
    if (straight) return '順子';
    if (counts[0] === 3) return '三條';
    if (counts[0] === 2 && counts[1] === 2) return '兩對';
    if (counts[0] === 2) return '一對';
    return '高牌';
  }

  // ── 狀態 ──────────────────────────────────────────────
  var S = null;
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function newDeck() { var d = []; RANKS.forEach(function (r) { SUITS.forEach(function (s) { d.push({ rank: r, suit: s }); }); }); return d; }

  function newGame() {
    var deck = shuffle(newDeck());
    var target = sortHand(deck.slice(0, HAND));
    S = { target: target, rows: [], cur: [], status: 'playing', cat: handCategory(target),
          reds: target.filter(function (c) { return isRed(c.suit); }).length };
    save();
    return S;
  }

  // ── 提交猜測 ──────────────────────────────────────────
  function submit() {
    if (!S || S.status !== 'playing') return { ok: false, msg: '遊戲已結束' };
    if (S.cur.length !== HAND) return { ok: false, msg: '需湊滿 5 張' };
    // 不可重複牌
    var seen = {};
    for (var i = 0; i < S.cur.length; i++) { var k = S.cur[i].rank + S.cur[i].suit; if (seen[k]) return { ok: false, msg: '有重複的牌' }; seen[k] = 1; }
    var ev = evaluateGuess(S.cur, S.target);
    S.rows.push(ev);
    S.cur = [];
    if (isWin(ev)) { S.status = 'won'; bumpStats(true, S.rows.length); }
    else if (S.rows.length >= MAX_ROWS) { S.status = 'lost'; bumpStats(false, 0); }
    save();
    return { ok: true, ev: ev, win: S.status === 'won' };
  }

  function pushCard(rank, suit) {
    if (!S || S.status !== 'playing' || S.cur.length >= HAND) return false;
    S.cur.push({ rank: rank, suit: suit }); save(); return true;
  }
  function backspace() { if (S && S.cur.length) { S.cur.pop(); save(); } }

  // 鍵盤累積狀態：每個 rank / suit 的最佳狀態
  function keyStatus() {
    var rank = {}, suit = {};
    var pri = { CORRECT: 3, PRESENT: 2, ABSENT: 1 };
    (S ? S.rows : []).forEach(function (row) {
      row.forEach(function (c) {
        if (!rank[c.rank] || pri[c.rankStatus] > pri[rank[c.rank]]) rank[c.rank] = c.rankStatus;
        if (!suit[c.suit] || pri[c.suitStatus] > pri[suit[c.suit]]) suit[c.suit] = c.suitStatus;
      });
    });
    return { rank: rank, suit: suit };
  }

  // 依猜測次數逐步解鎖 meta 線索
  function metaHints() {
    if (!S) return [];
    var n = S.rows.length, h = [];
    if (n >= 1) h.push('🃏 謎底牌型：' + S.cat);
    if (n >= 2) h.push('🔴 紅色牌（紅心/方塊）：' + S.reds + ' 張');
    if (n >= 3) h.push('🅰️ 最大一張：' + rankLabel(S.target[0].rank));
    return h;
  }

  // ── 存檔 / 統計 ───────────────────────────────────────
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.target) { S = s; return true; } } catch (e) {} return false; }
  function getStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY) || 'null') || { played: 0, won: 0, dist: [0, 0, 0, 0, 0, 0] }; } catch (e) { return { played: 0, won: 0, dist: [0, 0, 0, 0, 0, 0] }; } }
  function bumpStats(win, guesses) {
    var st = getStats(); st.played++; if (win) { st.won++; if (guesses >= 1 && guesses <= 6) st.dist[guesses - 1]++; }
    try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (e) {}
  }

  // ── 分享：Wordle 式 emoji 方格（數字/花色兩列，不洩漏答案）──
  function buildShareText(st) {
    st = st || S; if (!st) return '';
    var EM = { CORRECT: '🟩', PRESENT: '🟨', ABSENT: '⬛' };
    var n = st.status === 'won' ? st.rows.length : 'X';
    var lines = ['🃏 Poker Wordle ' + n + '/' + MAX_ROWS];
    st.rows.forEach(function (row) {
      lines.push('數' + row.map(function (c) { return EM[c.rankStatus]; }).join(''));
      lines.push('花' + row.map(function (c) { return EM[c.suitStatus]; }).join(''));
    });
    lines.push('lab4.kvzhuang.net/gen-art/poker-wordle');
    return lines.join('\n');
  }

  window.__pw = {
    buildShareText: buildShareText,
    RANKS: RANKS, SUITS: SUITS, SUIT_SYM: SUIT_SYM, MAX_ROWS: MAX_ROWS, HAND: HAND,
    rankLabel: rankLabel, isRed: isRed, sortHand: sortHand,
    evaluateGuess: evaluateGuess, isWin: isWin, handCategory: handCategory,
    newGame: newGame, submit: submit, pushCard: pushCard, backspace: backspace,
    keyStatus: keyStatus, metaHints: metaHints,
    state: function () { return S; }, load: load, save: save, clearSave: clearSave,
    getStats: getStats
  };
})();
