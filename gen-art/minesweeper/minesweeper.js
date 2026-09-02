/* 踩地雷 Minesweeper — 純邏輯引擎（window.__ms）
   首擊必安全（含周圍 8 格）、零格洪水展開、旗標、和牌判定、localStorage 存檔。 */
(function () {
  'use strict';
  var SAVE_KEY = 'minesweeper.save.v1';
  var LEVELS = {
    easy:   { w: 9,  h: 9,  mines: 10, name: '初級' },
    medium: { w: 16, h: 16, mines: 40, name: '中級' },
    hard:   { w: 30, h: 16, mines: 99, name: '高級' }
  };
  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }

  var S = null;

  function idx(r, c) { return r * S.w + c; }
  function inb(r, c) { return r >= 0 && r < S.h && c >= 0 && c < S.w; }
  function neigh(r, c) {
    var out = [];
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (dr || dc) { if (inb(r + dr, c + dc)) out.push([r + dr, c + dc]); }
    }
    return out;
  }

  function newGame(level) {
    var L = LEVELS[level] || LEVELS.easy;
    var cells = [];
    for (var i = 0; i < L.w * L.h; i++) cells.push({ mine: false, adj: 0, rev: false, flag: false });
    S = {
      level: level in LEVELS ? level : 'easy',
      w: L.w, h: L.h, mines: L.mines,
      cells: cells, started: false, status: 'playing',
      flags: 0, revealedCount: 0, start: 0, elapsed: 0
    };
    save();
    return S;
  }

  function _placeMines(safeR, safeC) {
    var forbidden = {};
    forbidden[idx(safeR, safeC)] = 1;
    neigh(safeR, safeC).forEach(function (p) { forbidden[idx(p[0], p[1])] = 1; });
    var spots = [];
    for (var r = 0; r < S.h; r++) for (var c = 0; c < S.w; c++) {
      if (!forbidden[idx(r, c)]) spots.push([r, c]);
    }
    // 洗牌取前 mines 個
    for (var i = spots.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
    var m = Math.min(S.mines, spots.length);
    for (var k = 0; k < m; k++) S.cells[idx(spots[k][0], spots[k][1])].mine = true;
    S.mines = m;
    // 計算相鄰數
    for (var rr = 0; rr < S.h; rr++) for (var cc = 0; cc < S.w; cc++) {
      if (S.cells[idx(rr, cc)].mine) continue;
      var n = 0; neigh(rr, cc).forEach(function (p) { if (S.cells[idx(p[0], p[1])].mine) n++; });
      S.cells[idx(rr, cc)].adj = n;
    }
    S.started = true; S.start = nowMs();
  }

  function _floodReveal(r, c) {
    var stack = [[r, c]];
    while (stack.length) {
      var p = stack.pop(), cell = S.cells[idx(p[0], p[1])];
      if (cell.rev || cell.flag) continue;
      cell.rev = true; S.revealedCount++;
      if (cell.adj === 0 && !cell.mine) {
        neigh(p[0], p[1]).forEach(function (q) {
          var cq = S.cells[idx(q[0], q[1])];
          if (!cq.rev && !cq.flag && !cq.mine) stack.push(q);
        });
      }
    }
  }

  function reveal(r, c) {
    if (!S || S.status !== 'playing' || !inb(r, c)) return { changed: false };
    var cell = S.cells[idx(r, c)];
    if (cell.rev || cell.flag) return { changed: false };
    if (!S.started) _placeMines(r, c);
    cell = S.cells[idx(r, c)];
    if (cell.mine) {
      cell.rev = true; S.elapsed = elapsed(); S.status = 'lost';
      // 揭開所有地雷
      for (var i = 0; i < S.cells.length; i++) if (S.cells[i].mine) S.cells[i].rev = true;
      save();
      return { changed: true, boom: [r, c] };
    }
    _floodReveal(r, c);
    _checkWin();
    save();
    return { changed: true };
  }

  function toggleFlag(r, c) {
    if (!S || S.status !== 'playing' || !inb(r, c)) return false;
    var cell = S.cells[idx(r, c)];
    if (cell.rev) return false;
    cell.flag = !cell.flag;
    S.flags += cell.flag ? 1 : -1;
    _checkWin();
    save();
    return true;
  }

  // 和牌開數字：若旗數 = 相鄰雷數，展開周圍未旗未開格（踩到雷即輸）
  function chord(r, c) {
    if (!S || S.status !== 'playing' || !inb(r, c)) return { changed: false };
    var cell = S.cells[idx(r, c)];
    if (!cell.rev || cell.adj === 0) return { changed: false };
    var flags = 0, targets = [];
    neigh(r, c).forEach(function (p) { var cq = S.cells[idx(p[0], p[1])]; if (cq.flag) flags++; else if (!cq.rev) targets.push(p); });
    if (flags !== cell.adj || !targets.length) return { changed: false };
    var boom = null;
    for (var i = 0; i < targets.length; i++) {
      var res = reveal(targets[i][0], targets[i][1]);
      if (res.boom) boom = res.boom;
      if (S.status !== 'playing') break;
    }
    return { changed: true, boom: boom };
  }

  function _allSafeRevealed() {
    // 所有非雷格都翻開即勝（直接掃描，不依賴計數器，避免舊存檔/邊界 desync）
    for (var i = 0; i < S.cells.length; i++) {
      var c = S.cells[i];
      if (!c.mine && !c.rev) return false;
    }
    return true;
  }

  function _allMinesFlagged() {
    // 休閒式勝利：所有地雷都正確插旗、且沒有插錯到安全格
    if (S.flags !== S.mines) return false;
    for (var i = 0; i < S.cells.length; i++) {
      if (S.cells[i].mine !== S.cells[i].flag) return false;   // 雷⟺旗
    }
    return true;
  }

  function _checkWin() {
    if (S.status !== 'playing') return;
    if (_allSafeRevealed() || _allMinesFlagged()) {
      S.elapsed = elapsed(); S.status = 'won';
      // 自動插旗剩餘雷（若靠翻開獲勝）
      for (var i = 0; i < S.cells.length; i++) if (S.cells[i].mine && !S.cells[i].flag) { S.cells[i].flag = true; S.flags++; }
    }
  }

  function minesLeft() { return S ? S.mines - S.flags : 0; }
  function elapsed() { return S && S.started ? (S.status === 'playing' ? Math.floor((nowMs() - S.start) / 1000) : S.elapsed) : 0; }

  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.cells && s.w) { S = s; if (S.status === 'playing' && S.started) S.start = nowMs() - (S.elapsed || 0) * 1000; return true; } } catch (e) {} return false; }

  window.__ms = {
    LEVELS: LEVELS,
    newGame: newGame, state: function () { return S; },
    reveal: reveal, toggleFlag: toggleFlag, chord: chord,
    minesLeft: minesLeft, elapsed: elapsed,
    load: load, save: save, clearSave: clearSave
  };
})();
