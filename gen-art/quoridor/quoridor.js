/* 步步為營 Quoridor — 9×9、雙棋子、擋牆、對電腦（BFS 尋路＋啟發式 AI） */
(function () {
  'use strict';
  var N = 9, SAVE_KEY = 'quoridor.save.v1';
  function key(r, c) { return r + ',' + c; }

  // ── 移動可否跨越（牆判定）──────────────────────────────
  function canStep(H, V, r, c, nr, nc) {
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) return false;
    if (nr === r - 1 && nc === c) return !(H[key(r - 1, c)] || H[key(r - 1, c - 1)]);     // 上
    if (nr === r + 1 && nc === c) return !(H[key(r, c)] || H[key(r, c - 1)]);             // 下
    if (nc === c + 1 && nr === r) return !(V[key(r, c)] || V[key(r - 1, c)]);             // 右
    if (nc === c - 1 && nr === r) return !(V[key(r, c - 1)] || V[key(r - 1, c - 1)]);     // 左
    return false;
  }
  function stepNeighbors(H, V, r, c) {
    var out = [];
    [[r - 1, c], [r + 1, c], [r, c + 1], [r, c - 1]].forEach(function (p) { if (canStep(H, V, r, c, p[0], p[1])) out.push(p); });
    return out;
  }

  // ── BFS：到目標列最短步數（只看牆，不管對手棋子）──────
  function bfsDist(H, V, sr, sc, goalRow) {
    var seen = {}, q = [[sr, sc, 0]]; seen[key(sr, sc)] = 1;
    while (q.length) {
      var cur = q.shift();
      if (cur[0] === goalRow) return cur[2];
      var ns = stepNeighbors(H, V, cur[0], cur[1]);
      for (var i = 0; i < ns.length; i++) { var k = key(ns[i][0], ns[i][1]); if (!seen[k]) { seen[k] = 1; q.push([ns[i][0], ns[i][1], cur[2] + 1]); } }
    }
    return Infinity;
  }
  function goalRowOf(who) { return who === 'P' ? 0 : N - 1; }  // P 往上到第0列；A 往下到第8列

  // ── 合法走子（含跳吃／斜走）──────────────────────────
  function legalMoves(S, who) {
    var me = S.pawns[who], opp = S.pawns[who === 'P' ? 'A' : 'P'], H = S.H, V = S.V;
    var dirs = [[-1, 0], [1, 0], [0, 1], [0, -1]], out = [];
    dirs.forEach(function (d) {
      var nr = me.r + d[0], nc = me.c + d[1];
      if (!canStep(H, V, me.r, me.c, nr, nc)) return;
      if (opp.r === nr && opp.c === nc) {
        var jr = nr + d[0], jc = nc + d[1];
        if (canStep(H, V, nr, nc, jr, jc) && !(jr === me.r && jc === me.c)) out.push([jr, jc]);
        else {
          // 直跳被牆/邊界擋 → 斜走
          var perp = (d[0] !== 0) ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
          perp.forEach(function (p) { var sr = nr + p[0], sc = nc + p[1]; if (canStep(H, V, nr, nc, sr, sc)) out.push([sr, sc]); });
        }
      } else out.push([nr, nc]);
    });
    // 去重
    var uniq = {}, res = [];
    out.forEach(function (p) { var k = key(p[0], p[1]); if (!uniq[k]) { uniq[k] = 1; res.push(p); } });
    return res;
  }

  // ── 合法放牆（不重疊、不交叉、不封死任一方）────────────
  function wallConflict(S, r, c, dir) {
    if (r < 0 || r > N - 2 || c < 0 || c > N - 2) return true;
    if (dir === 'H') return !!(S.H[key(r, c)] || S.H[key(r, c - 1)] || S.H[key(r, c + 1)] || S.V[key(r, c)]);
    return !!(S.V[key(r, c)] || S.V[key(r - 1, c)] || S.V[key(r + 1, c)] || S.H[key(r, c)]);
  }
  function legalWall(S, r, c, dir) {
    if (wallConflict(S, r, c, dir)) return false;
    var H = Object.assign({}, S.H), V = Object.assign({}, S.V);
    if (dir === 'H') H[key(r, c)] = 1; else V[key(r, c)] = 1;
    var pOk = bfsDist(H, V, S.pawns.P.r, S.pawns.P.c, goalRowOf('P')) < Infinity;
    var aOk = bfsDist(H, V, S.pawns.A.r, S.pawns.A.c, goalRowOf('A')) < Infinity;
    return pOk && aOk;   // 兩方都仍有路
  }

  // ── 套用行動 ──────────────────────────────────────────
  function applyAction(S, act) {
    if (S.status !== 'playing') return false;
    var who = S.turn;
    if (act.t === 'move') {
      var ok = legalMoves(S, who).some(function (p) { return p[0] === act.r && p[1] === act.c; });
      if (!ok) return false;
      S.pawns[who] = { r: act.r, c: act.c };
      if (act.r === goalRowOf(who)) { S.status = 'over'; S.winner = who; }
    } else if (act.t === 'wall') {
      if (S.wallsLeft[who] <= 0 || !legalWall(S, act.r, act.c, act.dir)) return false;
      if (act.dir === 'H') S.H[key(act.r, act.c)] = 1; else S.V[key(act.r, act.c)] = 1;
      S.walls.push({ r: act.r, c: act.c, dir: act.dir });
      S.wallsLeft[who]--;
    } else return false;
    if (S.status === 'playing') S.turn = (who === 'P') ? 'A' : 'P';
    return true;
  }

  // ── AI（啟發式：路差評估）──────────────────────────────
  function shortest(S, who) { var p = S.pawns[who]; return bfsDist(S.H, S.V, p.r, p.c, goalRowOf(who)); }

  function aiChoose(S) {
    var myPath = shortest(S, 'A'), oppPath = shortest(S, 'P');
    // 前進：選走完後到目標最短的一步
    var moves = legalMoves(S, 'A'), bestMove = null, bestMoveDist = Infinity;
    moves.forEach(function (p) {
      var d = bfsDist(S.H, S.V, p[0], p[1], goalRowOf('A'));
      if (d < bestMoveDist) { bestMoveDist = d; bestMove = p; }
    });
    var advance = bestMove ? { t: 'move', r: bestMove[0], c: bestMove[1] } : null;

    // 落後（對手比較近）且有牆 → 找最能拖慢對手的牆
    if (S.wallsLeft.A > 0 && oppPath <= myPath) {
      var bestWall = null, bestScore = 0;
      for (var r = 0; r < N - 1; r++) for (var c = 0; c < N - 1; c++) {
        ['H', 'V'].forEach(function (dir) {
          if (!legalWall(S, r, c, dir)) return;
          var H = Object.assign({}, S.H), V = Object.assign({}, S.V);
          if (dir === 'H') H[key(r, c)] = 1; else V[key(r, c)] = 1;
          var op2 = bfsDist(H, V, S.pawns.P.r, S.pawns.P.c, goalRowOf('P'));
          var mp2 = bfsDist(H, V, S.pawns.A.r, S.pawns.A.c, goalRowOf('A'));
          var score = (op2 - oppPath) - (mp2 - myPath);
          if (score > bestScore) { bestScore = score; bestWall = { t: 'wall', r: r, c: c, dir: dir }; }
        });
      }
      if (bestWall && bestScore >= 1) return bestWall;
    }
    return advance || { t: 'move', r: S.pawns.A.r, c: S.pawns.A.c };
  }

  // ── 局面 ──────────────────────────────────────────────
  function newGame() {
    S = { pawns: { P: { r: N - 1, c: 4 }, A: { r: 0, c: 4 } }, H: {}, V: {}, walls: [],
          wallsLeft: { P: 10, A: 10 }, turn: 'P', status: 'playing', winner: null };
    save(); return S;
  }
  var S = null;

  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.pawns) { S = s; return true; } } catch (e) {} return false; }

  window.__q = {
    N: N, newGame: newGame, state: function () { return S; }, save: save, load: load, clearSave: clearSave,
    legalMoves: legalMoves, legalWall: legalWall, applyAction: applyAction, aiChoose: aiChoose,
    bfsDist: bfsDist, shortest: shortest, goalRowOf: goalRowOf, canStep: canStep
  };
})();
