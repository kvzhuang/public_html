/* Dice Wars — 蜂巢六角領地骰子戰爭
   玩家為紫色，兩顆以上骰子即可攻擊鄰國，佔領全圖獲勝。 */
(function () {
  'use strict';

  // ── 常數 ──────────────────────────────────────────────
  var COLS = 28, ROWS = 20;          // 六角格網格大小
  var HEX = 20;                       // 六角半徑（像素）
  var SD_ROUND = 10;                  // 進入「決戰模式」的回合數（破終盤僵局）
  var CAP_MAX = 16;                   // 決戰模式骰子上限逐回合升到此
  var HARD_ROUND = 40;                // 硬上限：到此依領地數判定勝負
  var COLORS = [
    '#9b5de5', // 0 玩家：紫
    '#31c66b', // 1 綠
    '#ff8c42', // 2 橙
    '#33c6d6', // 3 青
    '#f2d64b', // 4 黃
    '#ff6fae', // 5 粉
    '#4d7cff', // 6 藍
    '#e5484d'  // 7 紅
  ];
  var NAMES = ['你（紫）', '綠國', '橙國', '青國', '黃國', '粉國', '藍國', '紅國'];
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]; // pointy-top axial

  // ── 狀態 ──────────────────────────────────────────────
  var cv, ctx, DPR = 1;
  var cells, territories, players;
  var numPlayers = 4, numTerritories = 24;
  var current = 0, selected = -1, gameOver = false, phase = 'setup';
  var busy = false;                  // AI 行動或動畫進行中，鎖住輸入
  var transferUsed = false;          // 本回合是否已調度過骰子（每回合限一次）
  var turnCount = 0;                  // 累計回合（決戰模式與硬上限用）
  var originX = 0, originY = 0;
  var flash = null;                  // {from,to,aRoll,dRoll,t} 戰報動畫

  // ── 幾何 ──────────────────────────────────────────────
  function key(q, r) { return q + ',' + r; }
  function hexCenter(q, r) {
    return {
      x: originX + HEX * Math.sqrt(3) * (q + r / 2),
      y: originY + HEX * 1.5 * r
    };
  }
  function hexCorner(cx, cy, i) {           // pointy-top 角點
    var a = Math.PI / 180 * (60 * i - 30);
    return [cx + HEX * Math.cos(a), cy + HEX * Math.sin(a)];
  }

  // ── 地圖生成 ──────────────────────────────────────────
  function buildGrid() {
    var g = {};
    for (var r = 0; r < ROWS; r++) {
      for (var q = 0; q < COLS; q++) {
        // 用 axial：以 offset 讓網格接近矩形
        var aq = q - (r >> 1);
        g[key(aq, r)] = { q: aq, r: r, t: -1 };
      }
    }
    return g;
  }

  function neighborsOf(c, g) {
    var out = [];
    for (var i = 0; i < 6; i++) {
      var n = g[key(c.q + DIRS[i][0], c.r + DIRS[i][1])];
      if (n) out.push(n);
    }
    return out;
  }

  function largestConnectedCells(g) {
    var seen = {}, best = [];
    var list = Object.keys(g);
    for (var i = 0; i < list.length; i++) {
      if (seen[list[i]]) continue;
      var comp = [], stack = [g[list[i]]];
      seen[list[i]] = 1;
      while (stack.length) {
        var c = stack.pop(); comp.push(c);
        var ns = neighborsOf(c, g);
        for (var j = 0; j < ns.length; j++) {
          var k = key(ns[j].q, ns[j].r);
          if (!seen[k]) { seen[k] = 1; stack.push(ns[j]); }
        }
      }
      if (comp.length > best.length) best = comp;
    }
    return best;
  }

  function generateMap() {
    var g = buildGrid();
    // 隨機挖洞造出不規則海岸線
    var all = Object.keys(g);
    for (var i = 0; i < all.length; i++) {
      if (Math.random() < 0.18) delete g[all[i]];
    }
    // 只保留最大連通塊，確保領地圖連通
    var comp = largestConnectedCells(g);
    var keep = {};
    for (i = 0; i < comp.length; i++) keep[key(comp[i].q, comp[i].r)] = comp[i];
    g = keep;

    var cellList = Object.keys(g).map(function (k) { return g[k]; });
    var T = Math.min(numTerritories, Math.floor(cellList.length / 4));
    if (T < numPlayers * 2) T = numPlayers * 2;

    // 多源隨機 BFS → 連通的 Voronoi 領地
    var seeds = shuffle(cellList.slice()).slice(0, T);
    var frontier = [];
    for (i = 0; i < seeds.length; i++) {
      seeds[i].t = i;
      frontier.push(seeds[i]);
    }
    while (frontier.length) {
      var idx = (Math.random() * frontier.length) | 0;
      var c = frontier[idx];
      var ns = shuffle(neighborsOf(c, g));
      var grew = false;
      for (var n = 0; n < ns.length; n++) {
        if (ns[n].t === -1) { ns[n].t = c.t; frontier.push(ns[n]); grew = true; break; }
      }
      if (!grew) frontier.splice(idx, 1);
    }
    // 收掉沒被指派到的零星格（併進鄰居）
    cellList.forEach(function (c) {
      if (c.t === -1) {
        var ns = neighborsOf(c, g);
        for (var i = 0; i < ns.length; i++) if (ns[i].t !== -1) { c.t = ns[i].t; break; }
      }
    });

    // 建立領地物件
    var terrs = [];
    for (i = 0; i < T; i++) terrs.push({ id: i, owner: -1, dice: 1, cells: [], adj: {}, cx: 0, cy: 0 });
    cellList.forEach(function (c) { if (c.t >= 0) terrs[c.t].cells.push(c); });
    // 丟掉空領地並重編號
    terrs = terrs.filter(function (t) { return t.cells.length > 0; });
    var remap = {};
    terrs.forEach(function (t, i) { remap[t.id] = i; t.id = i; });
    cellList.forEach(function (c) { if (c.t >= 0) c.t = remap[c.t]; });

    // 領地鄰接 + 質心
    terrs.forEach(function (t) {
      var sx = 0, sy = 0;
      t.cells.forEach(function (c) {
        var p = hexCenter(c.q, c.r); sx += p.x; sy += p.y;
        neighborsOf(c, g).forEach(function (nc) {
          if (nc.t !== c.t && nc.t >= 0) t.adj[nc.t] = true;
        });
      });
      t.cx = sx / t.cells.length; t.cy = sy / t.cells.length;
    });
    // 鄰接改成陣列
    terrs.forEach(function (t) { t.adjList = Object.keys(t.adj).map(Number); });

    cells = g;
    territories = terrs;
    numTerritories = terrs.length;
    assignOwners();
    distributeDice();
    fitBoard();
  }

  function assignOwners() {
    var ids = shuffle(territories.map(function (t) { return t.id; }));
    for (var i = 0; i < ids.length; i++) {
      territories[ids[i]].owner = i % numPlayers;
      territories[ids[i]].dice = 1;
    }
  }

  function distributeDice() {
    for (var p = 0; p < numPlayers; p++) {
      var mine = territories.filter(function (t) { return t.owner === p; });
      var extra = mine.length * 2;   // 平均每領地 ~3 顆
      var guard = extra * 40;
      while (extra > 0 && guard-- > 0) {
        var t = mine[(Math.random() * mine.length) | 0];
        if (t.dice < 8) { t.dice++; extra--; }
      }
    }
  }

  // ── 版面 ──────────────────────────────────────────────
  function computeCentroids() {
    territories.forEach(function (t) {
      var sx = 0, sy = 0;
      t.cells.forEach(function (c) { var p = hexCenter(c.q, c.r); sx += p.x; sy += p.y; });
      t.cx = sx / t.cells.length; t.cy = sy / t.cells.length;
    });
  }

  function sizeCanvas() {
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (var k in cells) {
      var c = cells[k], p = hexCenter(c.q, c.r);
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
      miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y);
    }
    var pad = HEX * 2;
    var w = (maxx - minx) + pad * 2, h = (maxy - miny) + pad * 2;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * DPR; cv.height = h * DPR;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function fitBoard() {
    var minx = 1e9, miny = 1e9;
    for (var k in cells) {
      var c = cells[k], p = hexCenter(c.q, c.r);
      minx = Math.min(minx, p.x); miny = Math.min(miny, p.y);
    }
    var pad = HEX * 2;
    originX += (pad - minx); originY += (pad - miny);
    computeCentroids();
    sizeCanvas();
  }

  // 由 cells 重建領地鄰接與質心（載入存檔後用）
  function rebuildGeometry() {
    territories.forEach(function (t) { t.adj = {}; });
    for (var k in cells) {
      var c = cells[k]; if (c.t < 0) continue;
      neighborsOf(c, cells).forEach(function (nc) {
        if (nc.t !== c.t && nc.t >= 0 && territories[c.t]) territories[c.t].adj[nc.t] = true;
      });
    }
    territories.forEach(function (t) { t.adjList = Object.keys(t.adj).map(Number); });
    computeCentroids();
  }

  // ── 繪圖 ──────────────────────────────────────────────
  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    // 各格填色
    for (var k in cells) {
      var c = cells[k];
      if (c.t < 0) continue;
      var t = territories[c.t];
      var col = COLORS[t.owner];
      var p = hexCenter(c.q, c.r);
      drawHexPath(p.x, p.y);
      ctx.fillStyle = col;
      ctx.globalAlpha = (selected === c.t) ? 1 : ((isTargetable(c.t) || isTransferTarget(c.t)) ? 0.95 : 0.82);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.stroke();
    }
    // 領地外框（相鄰不同領地的邊畫粗線）
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#12201c'; ctx.lineCap = 'round';
    for (k in cells) {
      c = cells[k]; if (c.t < 0) continue;
      var ctr = hexCenter(c.q, c.r);
      for (var i = 0; i < 6; i++) {
        var nb = cells[key(c.q + DIRS[i][0], c.r + DIRS[i][1])];
        if (!nb || nb.t !== c.t) {
          // 邊 i 對應角 i 與 i+1（pointy-top：DIR i 與相鄰兩角關係固定）
          var a = hexCorner(ctr.x, ctr.y, edgeCorner(i, 0));
          var b = hexCorner(ctr.x, ctr.y, edgeCorner(i, 1));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
    }
    // 選取高亮外框：攻擊目標(紅)／調度目標(青)／來源(白)
    if (selected >= 0) {
      territories.forEach(function (t) {
        if (canAttack(selected, t.id)) outlineTerritory(t.id, '#ff5a5a', 2.6);
        else if (canTransfer(selected, t.id)) outlineTerritory(t.id, '#33d6ff', 2.6);
      });
      outlineTerritory(selected, '#fff', 3.5);
    }
    // 骰子塔
    territories.forEach(function (t) { drawDiceStack(t); });
    // 戰報動畫
    if (flash) drawFlash();
  }

  // 邊 i 連接的兩個角（pointy-top 幾何對照）
  function edgeCorner(dir, which) {
    // DIRS 順序: [E,W,SE?,...]，用固定對照表（經測試對齊）
    // 角點角度 = 60*i-30：0=右上,1=右下,2=下,3=左下,4=左上,5=上
    var map = {
      0: [0, 1],  // (+1,0)  東
      2: [1, 2],  // (0,+1)  東南
      5: [2, 3],  // (-1,+1) 西南
      1: [3, 4],  // (-1,0)  西
      3: [4, 5],  // (0,-1)  西北
      4: [5, 0]   // (+1,-1) 東北
    };
    return map[dir][which];
  }

  function drawHexPath(cx, cy) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var c = hexCorner(cx, cy, i);
      if (i === 0) ctx.moveTo(c[0], c[1]); else ctx.lineTo(c[0], c[1]);
    }
    ctx.closePath();
  }

  function outlineTerritory(tid, color, w) {
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round';
    territories[tid].cells.forEach(function (c) {
      var ctr = hexCenter(c.q, c.r);
      for (var i = 0; i < 6; i++) {
        var nb = cells[key(c.q + DIRS[i][0], c.r + DIRS[i][1])];
        if (!nb || nb.t !== c.t) {
          var a = hexCorner(ctr.x, ctr.y, edgeCorner(i, 0));
          var b = hexCorner(ctr.x, ctr.y, edgeCorner(i, 1));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
    });
  }

  function drawDiceStack(t) {
    var n = t.dice, vis = Math.min(n, 8), s = 13, off = 5;   // 可見骰堆最多 8 層，數字顯示真實值
    var x = t.cx, y = t.cy + (vis - 1) * off / 2;
    for (var i = 0; i < vis; i++) {
      var dy = y - i * off;
      // 立方前面（超過 8 的最上層染金，示意「超堆疊」）
      ctx.fillStyle = (n > 8 && i === vis - 1) ? '#e9c46a' : '#fdfdfd';
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.2;
      roundRect(x - s / 2, dy - s / 2, s, s, 3); ctx.fill(); ctx.stroke();
      // 三顆點示意
      ctx.fillStyle = '#222';
      dot(x - s * 0.22, dy - s * 0.22); dot(x, dy); dot(x + s * 0.22, dy + s * 0.22);
    }
    // 數字標籤
    ctx.font = 'bold 13px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var ly = y - vis * off - 4;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(n, x, ly); ctx.fillStyle = '#fff'; ctx.fillText(n, x, ly);
  }
  function dot(x, y) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill(); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawFlash() {
    var a = territories[flash.from], d = territories[flash.to];
    ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    label(a.cx, a.cy - 26, flash.aRoll, flash.win ? '#7CFC00' : '#ff5a5a');
    label(d.cx, d.cy - 26, flash.dRoll, flash.win ? '#ff5a5a' : '#7CFC00');
    function label(x, y, txt, col) {
      ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(txt, x, y);
      ctx.fillStyle = col; ctx.fillText(txt, x, y);
    }
  }

  // ── 攻擊 / 戰鬥 ────────────────────────────────────────
  function rollSum(n) { var s = 0; for (var i = 0; i < n; i++) s += 1 + ((Math.random() * 6) | 0); return s; }

  function canAttack(fromId, toId) {
    var f = territories[fromId], t = territories[toId];
    return f && t && f.owner !== t.owner && f.dice >= 2 && f.adjList.indexOf(toId) >= 0;
  }

  // 從某領地出發、只走同主人領地能到達的整片連通塊
  function ownedCluster(startId) {
    var owner = territories[startId].owner;
    var seen = {}, stack = [startId]; seen[startId] = 1;
    while (stack.length) {
      var t = territories[stack.pop()];
      t.adjList.forEach(function (n) {
        if (!seen[n] && territories[n].owner === owner) { seen[n] = 1; stack.push(n); }
      });
    }
    return seen;
  }

  // 可否把骰子從 from 調度到 to：同主人、同一連通塊、from>1、to 未滿
  function canTransfer(fromId, toId) {
    if (transferUsed) return false;                 // 每回合限調度一次
    var f = territories[fromId], t = territories[toId];
    if (!f || !t || fromId === toId) return false;
    if (f.owner !== t.owner || f.dice < 2 || t.dice >= diceCap()) return false;
    return ownedCluster(fromId)[toId] === 1;
  }

  function doTransfer(fromId, toId) {
    var f = territories[fromId], t = territories[toId];
    var move = Math.min(f.dice - 1, diceCap() - t.dice);
    if (move <= 0) return false;
    t.dice += move; f.dice -= move;
    return true;
  }

  function doAttack(fromId, toId, cb, fast) {
    var f = territories[fromId], t = territories[toId];
    var aRoll = rollSum(f.dice), dRoll = rollSum(t.dice);
    var win = suddenDeath() ? (aRoll >= dRoll) : (aRoll > dRoll);   // 決戰模式平手判攻方
    flash = { from: fromId, to: toId, aRoll: aRoll, dRoll: dRoll, win: win };
    render();
    setTimeout(function () {
      if (win) { t.owner = f.owner; t.dice = f.dice - 1; f.dice = 1; }
      else { f.dice = 1; }
      flash = null;
      render(); updateHud();
      if (checkEnd()) return;
      saveGame();
      if (cb) cb(win);
    }, fast ? 240 : 520);
  }

  // ── 增援 ──────────────────────────────────────────────
  function largestCluster(p) {
    var mine = {}, seen = {};
    territories.forEach(function (t) { if (t.owner === p) mine[t.id] = t; });
    var best = 0;
    for (var id in mine) {
      if (seen[id]) continue;
      var stack = [+id], size = 0; seen[id] = 1;
      while (stack.length) {
        var t = territories[stack.pop()]; size++;
        t.adjList.forEach(function (nid) {
          if (mine[nid] && !seen[nid]) { seen[nid] = 1; stack.push(nid); }
        });
      }
      best = Math.max(best, size);
    }
    return best;
  }

  // ── 破僵局：決戰模式（後期骰子上限逐步提高、平手判攻方）──
  function roundNo() { return Math.floor(turnCount / Math.max(1, numPlayers)); }
  function suddenDeath() { return roundNo() >= SD_ROUND; }
  function diceCap() { return Math.min(CAP_MAX, 8 + Math.max(0, roundNo() - SD_ROUND)); }

  function reinforce(p) {
    var cap = diceCap();
    var esc = suddenDeath() ? (roundNo() - SD_ROUND + 1) : 0;   // 決戰模式額外增援，加速收官
    var bonus = largestCluster(p) + (players[p].stock || 0) + esc;
    var mine = territories.filter(function (t) { return t.owner === p; });
    var guard = (bonus + cap * mine.length) * 4;
    while (bonus > 0 && guard-- > 0) {
      var open = mine.filter(function (t) { return t.dice < cap; });
      if (!open.length) break;
      open[(Math.random() * open.length) | 0].dice++; bonus--;
    }
    players[p].stock = Math.min(bonus, 20);   // 放不下的存起來
  }

  // ── 回合流程 ──────────────────────────────────────────
  function endTurn() {
    if (busy || gameOver) return;
    selected = -1;
    reinforce(current);
    render(); updateHud();
    nextPlayer();
  }

  function nextPlayer() {
    turnCount++;
    if (roundNo() >= HARD_ROUND) { endByCount(); return; }   // 硬上限：依領地數判勝
    do { current = (current + 1) % numPlayers; }
    while (!alive(current) && !gameOver);
    if (gameOver) return;
    saveGame();
    var sd = suddenDeath() ? '　⚔️決戰(上限' + diceCap() + '、平手判攻方)' : '';
    if (players[current].human) {
      transferUsed = false;                          // 新回合：重置調度次數
      setStatus('你的回合：點自己領地（≥2 骰）進攻' + sd);
      busy = false;
    } else {
      busy = true;
      setStatus(NAMES[current] + ' 思考中…' + sd);
      setTimeout(function () { aiTurn(current); }, 160);
    }
  }

  // 硬上限到期：依領地數（同數比總骰）判定勝負
  function endByCount() {
    if (gameOver) return;
    var cnt = {}, dice = {};
    territories.forEach(function (t) { cnt[t.owner] = (cnt[t.owner] || 0) + 1; dice[t.owner] = (dice[t.owner] || 0) + t.dice; });
    var win = -1, bc = -1, bd = -1;
    for (var p in cnt) { p = +p;
      if (cnt[p] > bc || (cnt[p] === bc && dice[p] > bd)) { bc = cnt[p]; bd = dice[p]; win = p; }
    }
    gameOver = true; busy = true;
    showOver(win === 0 ? ('🏆 回合上限到！你以最多領地（' + bc + '）獲勝！')
                       : ('⏱ 回合上限到！' + NAMES[win] + ' 以最多領地（' + bc + '）獲勝，你敗北。'),
             win === 0);
  }

  function alive(p) { return territories.some(function (t) { return t.owner === p; }); }

  // ── AI ────────────────────────────────────────────────
  function aiTurn(p) {
    if (gameOver) return;
    // 找一個有利攻擊：我方骰 > 敵方骰（或相等且機率）
    var best = null;
    territories.forEach(function (f) {
      if (f.owner !== p || f.dice < 2) return;
      f.adjList.forEach(function (nid) {
        var t = territories[nid];
        if (t.owner === p) return;
        var margin = f.dice - t.dice;
        var sd = suddenDeath();
        // 決戰模式：平手已判攻方，故更積極；甚至偶爾賭一把小劣勢，逼出突破
        var ok = margin > 0
          || (margin === 0 && Math.random() < (sd ? 0.9 : 0.35))
          || (sd && margin === -1 && Math.random() < 0.4);
        if (ok) {
          var score = margin * 10 + f.dice;
          if (!best || score > best.score) best = { from: f.id, to: nid, score: score };
        }
      });
    });
    if (best) {
      doAttack(best.from, best.to, function () {
        if (gameOver) return;
        setTimeout(function () { aiTurn(p); }, 80);    // 連續進攻（加速）
      }, true);                                        // fast：短戰報動畫
    } else {
      reinforce(p); render(); updateHud();
      setTimeout(nextPlayer, 90);
    }
  }

  // ── 勝負 ──────────────────────────────────────────────
  function checkEnd() {
    var owners = {};
    territories.forEach(function (t) { owners[t.owner] = true; });
    var ks = Object.keys(owners);
    if (ks.length === 1) {
      gameOver = true; busy = true;
      var w = +ks[0];
      showOver(w === 0 ? '🏆 你征服了全圖，勝利！' : '💀 ' + NAMES[w] + ' 統一了世界…你敗北了。',
        w === 0);
      return true;
    }
    if (!alive(0) && !players[0]._dead) {
      players[0]._dead = true;
      showOver('💀 你的領地全被吞併了…遊戲結束。', false);
      // 仍讓 AI 繼續？直接結束
      gameOver = true; busy = true;
      return true;
    }
    return false;
  }

  // ── 輸入 ──────────────────────────────────────────────
  function pickTerritory(mx, my) {
    // 找最近質心的領地（點在其某格內）
    var found = -1, bestD = 1e9;
    for (var k in cells) {
      var c = cells[k]; if (c.t < 0) continue;
      var p = hexCenter(c.q, c.r);
      var d = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my);
      if (d < bestD && d < HEX * HEX) { bestD = d; found = c.t; }
    }
    return found;
  }

  function onClick(e) {
    if (busy || gameOver || phase !== 'play') return;
    var rect = cv.getBoundingClientRect();
    var mx = (e.clientX - rect.left), my = (e.clientY - rect.top);
    var tid = pickTerritory(mx, my);
    if (tid < 0) { selected = -1; render(); return; }
    var t = territories[tid];
    if (selected < 0) {
      if (t.owner === 0 && t.dice >= 2) { selected = tid; render(); }
      return;
    }
    if (tid === selected) { selected = -1; render(); return; }
    if (canAttack(selected, tid)) {
      var from = selected; selected = -1; busy = true;
      doAttack(from, tid, function () { busy = false; render(); });
    } else if (canTransfer(selected, tid)) {
      doTransfer(selected, tid); transferUsed = true; selected = -1;
      render(); updateHud(); saveGame();
      setStatus('已調度骰子（本回合僅此一次）。可繼續進攻或結束回合。');
    } else if (t.owner === 0 && t.dice >= 2) {
      selected = tid; render();
    } else { selected = -1; render(); }
  }

  function isTargetable(tid) {
    return selected >= 0 && canAttack(selected, tid);
  }
  function isTransferTarget(tid) {
    return selected >= 0 && canTransfer(selected, tid);
  }

  // ── UI 橋接 ───────────────────────────────────────────
  function setStatus(s) { var el = document.getElementById('status'); if (el) el.textContent = s; }
  function updateHud() {
    var counts = [];
    for (var p = 0; p < numPlayers; p++) {
      var n = territories.filter(function (t) { return t.owner === p; }).length;
      if (n > 0) counts.push({ p: p, n: n });
    }
    counts.sort(function (a, b) { return b.n - a.n; });
    var html = counts.map(function (c) {
      return '<span class="tag" style="background:' + COLORS[c.p] + '">' +
        NAMES[c.p] + ' ' + c.n + '</span>';
    }).join('');
    var el = document.getElementById('standings'); if (el) el.innerHTML = html;
  }
  function showOver(msg, win) {
    clearSave();
    var o = document.getElementById('over');
    document.getElementById('overmsg').textContent = msg;
    o.className = win ? 'overlay show win' : 'overlay show';
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ── 存檔（localStorage）──────────────────────────────
  var SAVE_KEY = 'dicewars.save.v1';

  function saveGame() {
    try {
      if (!territories || phase !== 'play' || gameOver) return;
      var snap = { v: 1, np: numPlayers, nt: numTerritories, cur: current,
        tu: transferUsed ? 1 : 0, tc: turnCount,
        ox: originX, oy: originY, cells: [], terr: [], players: [] };
      for (var k in cells) { var c = cells[k]; snap.cells.push([c.q, c.r, c.t]); }
      territories.forEach(function (t) { snap.terr.push([t.owner, t.dice]); });
      players.forEach(function (p) { snap.players.push([p.human ? 1 : 0, p.stock || 0, p._dead ? 1 : 0]); });
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    } catch (e) { /* localStorage 不可用時安靜略過 */ }
  }

  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  function resumeGame() {
    var s;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return false; }
    if (!s || s.v !== 1 || !s.cells || !s.terr || !s.players) return false;
    try {
      cells = {};
      s.cells.forEach(function (a) { cells[key(a[0], a[1])] = { q: a[0], r: a[1], t: a[2] }; });
      originX = s.ox; originY = s.oy;
      numPlayers = s.np; numTerritories = s.nt; current = s.cur;
      players = s.players.map(function (a, i) { return { id: i, human: !!a[0], stock: a[1], _dead: !!a[2] }; });
      territories = s.terr.map(function (a, i) {
        return { id: i, owner: a[0], dice: a[1], cells: [], adj: {}, adjList: [], cx: 0, cy: 0 };
      });
      for (var k in cells) { var c = cells[k]; if (c.t >= 0 && territories[c.t]) territories[c.t].cells.push(c); }
      if (territories.some(function (t) { return t.cells.length === 0; })) { clearSave(); return false; }
      rebuildGeometry(); sizeCanvas();
      gameOver = false; selected = -1; phase = 'play'; busy = false;
      transferUsed = !!s.tu;
      turnCount = s.tc || 0;
      return true;
    } catch (e) { clearSave(); return false; }
  }

  // ── 畫面切換 ──────────────────────────────────────────
  function newMapPreview() {
    originX = 0; originY = 0;
    generateMap();
    current = 0; selected = -1; gameOver = false;
    players = [];
    for (var i = 0; i < numPlayers; i++) players.push({ id: i, human: i === 0, stock: 0 });
    render(); updateHud();
    phase = 'preview';
    document.getElementById('mapchoice').className = 'show';
    setStatus('要玩這張地圖嗎？');
  }

  function startPlay() {
    phase = 'play';
    document.getElementById('mapchoice').className = '';
    document.getElementById('hud').className = 'show';
    setStatus('你的回合：點自己的領地（≥2 骰）再點鄰國進攻');
    busy = false;
    transferUsed = false;
    turnCount = 0;
    saveGame();
  }

  function bootButtons() {
    var setup = document.getElementById('setup');
    var box = document.getElementById('pbtns');
    box.innerHTML = '';
    setup.className = 'overlay show';
    phase = 'setup';
    for (var n = 2; n <= 8; n++) {
      (function (nn) {
        var b = document.createElement('button');
        b.textContent = nn + ' 人';
        b.onclick = function () {
          numPlayers = nn;
          numTerritories = Math.min(40, nn * 5 + 6);
          setup.className = 'overlay';
          newMapPreview();
        };
        box.appendChild(b);
      })(n);
    }
  }

  function newGame() {
    clearSave();
    gameOver = false; busy = false; selected = -1;
    document.getElementById('over').className = 'overlay';
    document.getElementById('hud').className = '';
    bootButtons();
  }

  function boot() {
    cv = document.getElementById('board');
    ctx = cv.getContext('2d');
    cv.addEventListener('click', onClick);
    document.getElementById('mapYes').onclick = startPlay;
    document.getElementById('mapNo').onclick = newMapPreview;
    document.getElementById('endBtn').onclick = endTurn;
    document.getElementById('againBtn').onclick = newGame;
    var nb = document.getElementById('newBtn');
    if (nb) nb.onclick = newGame;

    // 若有進行中的存檔 → 直接續玩
    if (resumeGame()) {
      document.getElementById('hud').className = 'show';
      render(); updateHud();
      if (players[current] && players[current].human) {
        setStatus('已載入上次進度 — 你的回合：點自己領地（≥2 骰）進攻');
        busy = false;
      } else {
        busy = true;
        setStatus('已載入進度 — ' + NAMES[current] + ' 行動中…');
        setTimeout(function () { aiTurn(current); }, 300);
      }
      return;
    }
    bootButtons();
  }

  window.__dicewarsBoot = boot;

  // 除錯／測試掛勾（不影響正常遊戲；供無頭邏輯測試存取內部狀態）
  window.__dwDebug = {
    start: function (n) {
      numPlayers = n; numTerritories = Math.min(40, n * 5 + 6);
      newMapPreview(); startPlay();
    },
    state: function () { return { territories: territories, players: players, current: current, gameOver: gameOver }; },
    attack: doAttack,
    canAttack: canAttack,
    canTransfer: canTransfer,
    doTransfer: doTransfer,
    ownedCluster: ownedCluster,
    reinforce: reinforce,
    endTurn: endTurn,
    checkEnd: checkEnd,
    getTransferUsed: function () { return transferUsed; },
    setTransferUsed: function (v) { transferUsed = v; },
    save: saveGame,
    setTurnCount: function (v) { turnCount = v; },
    roundNo: roundNo, suddenDeath: suddenDeath, diceCap: diceCap, endByCount: endByCount,
    largestCluster: largestCluster,
    setOwnerAll: function (p) { territories.forEach(function (t) { t.owner = p; }); }
  };
})();
