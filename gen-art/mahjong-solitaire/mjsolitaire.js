/* 麻將接龍 Mahjong Solitaire — 龜殼疊層、配對消除、保證可解 */
(function () {
  'use strict';
  var SAVE_KEY = 'mjsolitaire.save.v1';

  // ── 牌面 ──────────────────────────────────────────────
  var SUITS = [['筒', 'T', '#2f7fd0'], ['條', 'B', '#2e9e5b'], ['萬', 'W', '#d0503a']];
  var HONORS = [['東', 'e'], ['南', 's'], ['西', 'w'], ['北', 'n'], ['中', 'z'], ['發', 'f'], ['白', 'b']];
  var FLOWERS = ['梅', '蘭', '竹', '菊'];
  var SEASONS = ['春', '夏', '秋', '冬'];

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ── 版面：3 層龜殼（半格錯位堆疊），共 144 格 ──────────
  function buildLayout() {
    var slots = [], id = 0;
    function rect(z, cols, rows, ox, oy) {
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) slots.push({ id: id++, x: ox + i * 2, y: oy + j * 2, z: z });
    }
    rect(0, 12, 8, 0, 0);   // 96
    rect(1, 8, 5, 5, 3);    // 40（+1,+1 錯位）
    rect(2, 4, 2, 9, 6);    // 8
    return slots;
  }

  function overlap(a, b) { return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2; }

  // slot 是否「自由」：上方無覆蓋，且左右至少一邊無同層牌
  function isFree(slot, aliveById, byId) {
    for (var idk in aliveById) {
      if (!aliveById[idk]) continue;
      var o = byId[idk];
      if (o.z === slot.z + 1 && overlap(o, slot)) return false;   // 被壓住
    }
    var leftBlock = false, rightBlock = false;
    for (idk in aliveById) {
      if (!aliveById[idk]) continue;
      var b = byId[idk];
      if (b.z === slot.z && Math.abs(b.y - slot.y) < 2) {
        if (b.x === slot.x - 2) leftBlock = true;
        if (b.x === slot.x + 2) rightBlock = true;
      }
    }
    return !(leftBlock && rightBlock);
  }

  // ── 可解生成：反向「剝離」出移除順序，再指派配對牌面 ──
  function generateSolvable(slots) {
    var byId = {}; slots.forEach(function (s) { byId[s.id] = s; });
    var alive = {}; slots.forEach(function (s) { alive[s.id] = true; });
    var order = [], guard = slots.length * 4;
    while (Object.keys(alive).filter(function (k) { return alive[k]; }).length > 0 && guard-- > 0) {
      var free = slots.filter(function (s) { return alive[s.id] && isFree(s, alive, byId); });
      if (free.length < 2) break;
      shuffle(free);
      var a = free[0], b = free[1];
      order.push([a.id, b.id]); alive[a.id] = false; alive[b.id] = false;
    }
    if (order.length * 2 !== slots.length) return null;  // 剝離失敗（版面異常）
    // 配對牌面：34 種花色/字牌各 2 對(=4 張) + 花 2 對 + 季 2 對 = 72 對
    var pairs = [];
    SUITS.forEach(function (su) { for (var n = 1; n <= 9; n++) { var f = n + su[0], k = su[1] + n; pairs.push([f, f, k, su[2]]); pairs.push([f, f, k, su[2]]); } });
    HONORS.forEach(function (h) { pairs.push([h[0], h[0], h[1], '#3a3a3a']); pairs.push([h[0], h[0], h[1], '#3a3a3a']); });
    pairs.push([FLOWERS[0], FLOWERS[1], 'FLW', '#b06fc0']); pairs.push([FLOWERS[2], FLOWERS[3], 'FLW', '#b06fc0']);
    pairs.push([SEASONS[0], SEASONS[1], 'SEA', '#d98a2b']); pairs.push([SEASONS[2], SEASONS[3], 'SEA', '#d98a2b']);
    shuffle(pairs);
    var tiles = {};
    order.forEach(function (pr, i) {
      var p = pairs[i];
      tiles[pr[0]] = { face: p[0], key: p[2], color: p[3] };
      tiles[pr[1]] = { face: p[1], key: p[2], color: p[3] };
    });
    return { tiles: tiles, order: order };   // id -> {face,key,color}；order=剝離順序
  }

  // ── 狀態 ──────────────────────────────────────────────
  var S = null;
  function newGame() {
    var slots = buildLayout(), gen = null, tries = 0;
    while (!gen && tries++ < 20) gen = generateSolvable(slots);
    var tiles = gen.tiles;
    S = {
      slots: slots.map(function (s) { return { id: s.id, x: s.x, y: s.y, z: s.z, face: tiles[s.id].face, key: tiles[s.id].key, color: tiles[s.id].color, alive: true }; }),
      selected: -1, undo: [], moves: 0, start: nowMs(), elapsed: 0, status: 'playing'
    };
    save(); return S;
  }
  function nowMs() { try { return Date.now(); } catch (e) { return 0; } }

  function byId() { var m = {}; S.slots.forEach(function (s) { m[s.id] = s; }); return m; }
  function aliveMap() { var m = {}; S.slots.forEach(function (s) { m[s.id] = s.alive; }); return m; }
  function slot(id) { return S.slots.filter(function (s) { return s.id === id; })[0]; }
  function freeNow(id) { var s = slot(id); return s && s.alive && isFree(s, aliveMap(), byId()); }

  function aliveCount() { return S.slots.filter(function (s) { return s.alive; }).length; }

  // 點選：回傳結果供 UI 動畫
  function click(id) {
    if (!S || S.status !== 'playing') return { type: 'none' };
    var s = slot(id);
    if (!s || !s.alive || !freeNow(id)) return { type: 'locked' };
    if (S.selected === id) { S.selected = -1; save(); return { type: 'deselect', id: id }; }
    if (S.selected < 0) { S.selected = id; save(); return { type: 'select', id: id }; }
    var a = slot(S.selected);
    if (a.key === s.key) {              // 配對成功
      a.alive = false; s.alive = false;
      S.undo.push([a.id, s.id]); S.moves++;
      var pair = [a.id, s.id]; S.selected = -1;
      if (aliveCount() === 0) { S.status = 'won'; S.elapsed = elapsed(); }
      save();
      return { type: 'match', ids: pair, win: S.status === 'won' };
    } else {                            // 不配對
      var bad = [S.selected, id]; S.selected = -1; save();
      return { type: 'mismatch', ids: bad };
    }
  }

  function undo() {
    if (!S || !S.undo.length) return null;
    var pr = S.undo.pop();
    slot(pr[0]).alive = true; slot(pr[1]).alive = true;
    S.selected = -1; S.moves = Math.max(0, S.moves - 1); S.status = 'playing'; save();
    return pr;
  }

  // 提示：找一組可消除的自由配對
  function hint() {
    var free = S.slots.filter(function (s) { return s.alive && freeNow(s.id); });
    for (var i = 0; i < free.length; i++) for (var j = i + 1; j < free.length; j++)
      if (free[i].key === free[j].key) return [free[i].id, free[j].id];
    return null;
  }
  function hasMove() { return !!hint(); }

  // 洗牌：把剩餘牌重新指派成「仍可解」的排列
  function reshuffle() {
    var aliveSlots = S.slots.filter(function (s) { return s.alive; });
    var sub = aliveSlots.map(function (s) { return { id: s.id, x: s.x, y: s.y, z: s.z }; });
    var gen = null, tries = 0;
    while (!gen && tries++ < 30) gen = generateSolvable(sub);
    if (!gen) return false;
    var tiles = gen.tiles;
    aliveSlots.forEach(function (s) { s.face = tiles[s.id].face; s.key = tiles[s.id].key; s.color = tiles[s.id].color; });
    S.selected = -1; save(); return true;
  }

  function elapsed() { return S.elapsed || (S.start ? Math.floor((nowMs() - S.start) / 1000) : 0); }

  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.slots) { S = s; if (S.status === 'playing') S.start = nowMs() - (S.elapsed || 0) * 1000; return true; } } catch (e) {} return false; }

  window.__mj = {
    buildLayout: buildLayout, isFree: isFree, overlap: overlap, generateSolvable: generateSolvable,
    newGame: newGame, click: click, undo: undo, hint: hint, hasMove: hasMove, reshuffle: reshuffle,
    freeNow: freeNow, aliveCount: aliveCount, elapsed: elapsed,
    state: function () { return S; }, load: load, save: save, clearSave: clearSave
  };
})();
