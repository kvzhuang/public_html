// ============================================
// Auto Battle — Puyo Puyo vs Tetris 自動對戰
// 兩個 AI 同時跑，消行/連鎖會把垃圾送給對方
// ============================================

// 棋盤尺寸
var COLS_T = 10, ROWS_T = 20;
var COLS_P = 6,  ROWS_P = 13;

// 動畫時間（ms）
var FALL_DUR = 280;
var CLEAR_DUR = 280;
var POP_DUR = 260;
var GAP_DUR = 60;
var stepSpeed = 1.0;

// 配色（puyo 4 色 + tetris 7 色 + garbage 1 色）
var THEMES = [
  { name: "Classic",
    bg:"#0a0a0f", grid:"#1a1a25", flash:"#ffffff", garbage:"#6e6e7a",
    puyo:   ["#FF4757","#2ED573","#1E90FF","#FFA502"],
    tetris: ["#00f0f0","#f0f000","#a000f0","#00f000","#f00000","#0000f0","#f0a000"] },
  { name: "Vapor",
    bg:"#10001f", grid:"#220033", flash:"#ffaaff", garbage:"#5a4a6e",
    puyo:   ["#FF6AD5","#94D0FF","#FBA8FF","#AD8CFF"],
    tetris: ["#FF6AD5","#C774E8","#AD8CFF","#8795E8","#94D0FF","#FBA8FF","#FF85A2"] },
  { name: "Neon",
    bg:"#0a0a0a", grid:"#1a1a1a", flash:"#fff", garbage:"#444",
    puyo:   ["#05D9E8","#FF2A6D","#39FF14","#BD00FF"],
    tetris: ["#05D9E8","#FF2A6D","#01ECFD","#FF901F","#39FF14","#BD00FF","#FFFF00"] },
  { name: "Sunset",
    bg:"#1a0011", grid:"#2a0022", flash:"#fff5e6", garbage:"#5e3b30",
    puyo:   ["#EF476F","#06D6A0","#118AB2","#FFD166"],
    tetris: ["#FF006E","#FB5607","#FFBE0B","#3A86FF","#8338EC","#06D6A0","#EF476F"] },
  { name: "Cyber",
    bg:"#0d001a", grid:"#1a0033", flash:"#0ff", garbage:"#444466",
    puyo:   ["#00ffff","#ff00ff","#ffff00","#39FF14"],
    tetris: ["#00ffff","#ff00ff","#ffff00","#ff0080","#80ff00","#0080ff","#ff8000"] },
];
var theme;

// 場景座標
var cellSize;     // Tetris cell size（小的、基準單位）
var cellSizeP;    // Puyo cell size = cellSize × (ROWS_T / ROWS_P)，讓兩邊高度像素相等
var leftX, rightX, topY;
var previewT_X, previewT_Y;
var previewP_X, previewP_Y;
var centerX;
var canvasW, canvasH;

// ── State ──────────────────────────────────────────────────────────────────

var tetris, puyo;
var matchStart;
var ESCALATION_INTERVAL = 10000;  // 每 10 秒 pressure +1（每片方塊額外送對手 garbage）

function createTetris() {
  return {
    grid: makeGrid(COLS_T, ROWS_T),
    current: null,     // { type, shape, x, targetY, spawnY, color }
    nextType: pickTetrisType(),
    phase: "spawn",
    phaseStart: 0,
    clearingRows: [],
    pendingGarbage: 0,
    stats: { pieces: 0, lines: 0 },
    gameOver: false
  };
}

function createPuyo() {
  return {
    grid: makeGrid(COLS_P, ROWS_P),
    current: null,     // { colors[2], shape: [[r,c]x2], x, targetY, spawnY, rotation }
    nextColors: [pickPuyoColor(), pickPuyoColor()],
    phase: "spawn",
    phaseStart: 0,
    chainState: { chain: 0, popping: [] },
    pendingGarbage: 0,
    stats: { pieces: 0, pops: 0, maxChain: 0 },
    gameOver: false
  };
}

function makeGrid(cols, rows) {
  var g = [];
  for (var r = 0; r < rows; r++) g[r] = new Array(cols).fill(0);
  return g;
}

// ── Tetris pieces ──────────────────────────────────────────────────────────

var PIECES_T = {
  I: { color: 0, shape: [[1,1,1,1]] },
  O: { color: 1, shape: [[1,1],[1,1]] },
  T: { color: 2, shape: [[0,1,0],[1,1,1]] },
  S: { color: 3, shape: [[0,1,1],[1,1,0]] },
  Z: { color: 4, shape: [[1,1,0],[0,1,1]] },
  J: { color: 5, shape: [[1,0,0],[1,1,1]] },
  L: { color: 6, shape: [[0,0,1],[1,1,1]] }
};
var TETRIS_TYPES = ["I","O","T","S","Z","J","L"];
function pickTetrisType() { return TETRIS_TYPES[Math.floor(Math.random()*TETRIS_TYPES.length)]; }
function pickPuyoColor() { return 1 + Math.floor(Math.random()*4); }  // 1..4

function rotateShape(s) {
  var h = s.length, w = s[0].length;
  var out = [];
  for (var r = 0; r < w; r++) {
    out[r] = new Array(h).fill(0);
    for (var c = 0; c < h; c++) out[r][c] = s[h-1-c][r];
  }
  return out;
}
function getRotations(s) {
  var r = [s];
  for (var i = 0; i < 3; i++) r.push(rotateShape(r[i]));
  var uniq = [];
  outer: for (var k = 0; k < r.length; k++) {
    for (var j = 0; j < uniq.length; j++) if (shapeEq(r[k], uniq[j])) continue outer;
    uniq.push(r[k]);
  }
  return uniq;
}
function shapeEq(a,b){if(a.length!==b.length||a[0].length!==b[0].length)return false;for(var r=0;r<a.length;r++)for(var c=0;c<a[r].length;c++)if(a[r][c]!==b[r][c])return false;return true;}

// ── Tetris collision / drop ─────────────────────────────────────────────────

function canPlaceT(grid, shape, px, py) {
  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      var x = px + c, y = py + r;
      if (x < 0 || x >= COLS_T || y >= ROWS_T) return false;
      if (y >= 0 && grid[y][x]) return false;
    }
  }
  return true;
}
function dropToT(grid, shape, px) {
  var py = -2;
  while (canPlaceT(grid, shape, px, py + 1)) py++;
  return canPlaceT(grid, shape, px, py) ? py : null;
}
function placePieceT(grid, shape, px, py, colorIdx) {
  for (var r = 0; r < shape.length; r++)
    for (var c = 0; c < shape[r].length; c++)
      if (shape[r][c] && py+r >= 0 && py+r < ROWS_T)
        grid[py+r][px+c] = colorIdx + 1;
}

// ── Tetris AI ──────────────────────────────────────────────────────────────

function evaluateT(grid) {
  var heights = new Array(COLS_T).fill(0);
  for (var c = 0; c < COLS_T; c++) for (var r = 0; r < ROWS_T; r++)
    if (grid[r][c]) { heights[c] = ROWS_T - r; break; }
  var agg = 0; for (var i = 0; i < COLS_T; i++) agg += heights[i];
  var holes = 0;
  for (var c2 = 0; c2 < COLS_T; c2++) {
    var ty = ROWS_T - heights[c2];
    for (var r2 = ty + 1; r2 < ROWS_T; r2++) if (!grid[r2][c2]) holes++;
  }
  var bump = 0;
  for (var c3 = 0; c3 < COLS_T - 1; c3++) bump += Math.abs(heights[c3] - heights[c3+1]);
  var lines = 0;
  for (var r3 = 0; r3 < ROWS_T; r3++) {
    var full = true;
    for (var c4 = 0; c4 < COLS_T; c4++) if (!grid[r3][c4]) { full = false; break; }
    if (full) lines++;
  }
  return lines * 0.76 - agg * 0.51 - holes * 0.36 - bump * 0.18;
}

function findBestT(grid, pieceType) {
  var rots = getRotations(PIECES_T[pieceType].shape);
  var best = null;
  for (var rot = 0; rot < rots.length; rot++) {
    var shape = rots[rot];
    for (var px = -2; px <= COLS_T; px++) {
      var py = dropToT(grid, shape, px);
      if (py === null || py < 0) continue;
      var temp = grid.map(function(row){ return row.slice(); });
      placePieceT(temp, shape, px, py, PIECES_T[pieceType].color);
      var s = evaluateT(temp);
      if (!best || s > best.score) best = { rot:rot, shape:shape, x:px, y:py, score:s };
    }
  }
  return best;
}

// ── Puyo: piece geometry ────────────────────────────────────────────────────
// Piece = pair of puyos.
// rotation 0: pivot bottom, second puyo above (vertical, second on top)
// rotation 1: pivot left,   second puyo right (horizontal)
// rotation 2: pivot top,    second puyo below (vertical, second on bottom)
// rotation 3: pivot right,  second puyo left (horizontal)
// Returns offsets from pivot for [pivot, second]
function puyoOffsets(rotation) {
  if (rotation === 0) return [[0,0],[-1,0]];
  if (rotation === 1) return [[0,0],[0, 1]];
  if (rotation === 2) return [[0,0],[ 1,0]];
  if (rotation === 3) return [[0,0],[0,-1]];
}

function canPlaceP(grid, rot, colors, px, py) {
  var offs = puyoOffsets(rot);
  for (var i = 0; i < 2; i++) {
    var r = py + offs[i][0];
    var c = px + offs[i][1];
    if (c < 0 || c >= COLS_P) return false;
    if (r >= ROWS_P) return false;
    if (r >= 0 && grid[r][c]) return false;
  }
  return true;
}

function dropToP(grid, rot, colors, px) {
  // 嘗試從上面開始，找最低能放的 y
  var py = -2;
  while (canPlaceP(grid, rot, colors, px, py + 1)) py++;
  return canPlaceP(grid, rot, colors, px, py) ? py : null;
}

function placePieceP(grid, rot, colors, px, py) {
  var offs = puyoOffsets(rot);
  for (var i = 0; i < 2; i++) {
    var r = py + offs[i][0];
    var c = px + offs[i][1];
    if (r >= 0 && r < ROWS_P && c >= 0 && c < COLS_P) {
      grid[r][c] = colors[i];  // colors[i] 是 1..4 數字
    }
  }
}

// ── Puyo: pop / chain ──────────────────────────────────────────────────────

var PUYO_GARBAGE = 5;  // 灰色垃圾標記

function findConnectedGroups(grid) {
  var visited = makeGrid(COLS_P, ROWS_P);
  var groups = [];
  for (var r = 0; r < ROWS_P; r++) {
    for (var c = 0; c < COLS_P; c++) {
      var v = grid[r][c];
      if (!v || v === PUYO_GARBAGE || visited[r][c]) continue;
      var stack = [[r,c]];
      var group = [];
      while (stack.length) {
        var p = stack.pop();
        var pr = p[0], pc = p[1];
        if (pr < 0 || pr >= ROWS_P || pc < 0 || pc >= COLS_P) continue;
        if (visited[pr][pc]) continue;
        if (grid[pr][pc] !== v) continue;
        visited[pr][pc] = 1;
        group.push([pr,pc]);
        stack.push([pr-1,pc],[pr+1,pc],[pr,pc-1],[pr,pc+1]);
      }
      if (group.length >= 4) groups.push(group);
    }
  }
  return groups;
}

function popGroups(grid, groups) {
  // 標記要消的 + 鄰接的垃圾也一起消
  var toClear = makeGrid(COLS_P, ROWS_P);
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    for (var j = 0; j < g.length; j++) {
      var r = g[j][0], c = g[j][1];
      toClear[r][c] = 1;
      // 鄰接 garbage 清掉
      var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (var d = 0; d < 4; d++) {
        var nr = r + dirs[d][0], nc = c + dirs[d][1];
        if (nr >= 0 && nr < ROWS_P && nc >= 0 && nc < COLS_P && grid[nr][nc] === PUYO_GARBAGE) {
          toClear[nr][nc] = 1;
        }
      }
    }
  }
  var popped = [];
  for (var r2 = 0; r2 < ROWS_P; r2++) {
    for (var c2 = 0; c2 < COLS_P; c2++) {
      if (toClear[r2][c2]) {
        popped.push([r2, c2, grid[r2][c2]]);
        grid[r2][c2] = 0;
      }
    }
  }
  return popped;
}

function applyGravityP(grid) {
  for (var c = 0; c < COLS_P; c++) {
    var writeR = ROWS_P - 1;
    for (var r = ROWS_P - 1; r >= 0; r--) {
      if (grid[r][c]) {
        if (r !== writeR) { grid[writeR][c] = grid[r][c]; grid[r][c] = 0; }
        writeR--;
      }
    }
  }
}

// 整個連鎖：回傳 chain 長度與 pop 總數
function processChain(grid) {
  var chain = 0, totalPops = 0;
  while (true) {
    var groups = findConnectedGroups(grid);
    if (groups.length === 0) break;
    chain++;
    var popped = popGroups(grid, groups);
    totalPops += popped.length;
    applyGravityP(grid);
  }
  return { chain: chain, pops: totalPops };
}

// ── Puyo AI ────────────────────────────────────────────────────────────────

function evaluateP(grid) {
  // 高度 / 同色相鄰 / 死格（被卡住的）
  var heights = new Array(COLS_P).fill(0);
  for (var c = 0; c < COLS_P; c++) for (var r = 0; r < ROWS_P; r++)
    if (grid[r][c]) { heights[c] = ROWS_P - r; break; }
  var agg = 0; for (var i = 0; i < COLS_P; i++) agg += heights[i];

  // 同色相鄰（鼓勵連塊但還沒消的狀態）
  var adjacency = 0;
  for (var r2 = 0; r2 < ROWS_P; r2++) {
    for (var c2 = 0; c2 < COLS_P; c2++) {
      var v = grid[r2][c2];
      if (!v || v === PUYO_GARBAGE) continue;
      if (c2 + 1 < COLS_P && grid[r2][c2+1] === v) adjacency++;
      if (r2 + 1 < ROWS_P && grid[r2+1][c2] === v) adjacency++;
    }
  }

  // 高度方差（凹凸度）
  var bump = 0;
  for (var c3 = 0; c3 < COLS_P - 1; c3++) bump += Math.abs(heights[c3] - heights[c3+1]);

  // 中間欄位避免堆太高（puyo 重要：第 3 欄不能死，那是出生位置）
  var deathRisk = heights[2] >= ROWS_P - 2 ? 50 : 0;

  return adjacency * 0.5 - agg * 0.4 - bump * 0.2 - deathRisk;
}

function findBestP(grid, colors) {
  var best = null;
  for (var rot = 0; rot < 4; rot++) {
    for (var px = -1; px <= COLS_P; px++) {
      var py = dropToP(grid, rot, colors, px);
      if (py === null) continue;
      var offs = puyoOffsets(rot);
      var minR = Math.min(py + offs[0][0], py + offs[1][0]);
      if (minR < 0) continue;
      var temp = grid.map(function(row){ return row.slice(); });
      placePieceP(temp, rot, colors, px, py);
      // 模擬 chain；恢復 chain 偏好讓 Puyo AI 主動建鏈
      var chain = processChain(temp);
      var s = evaluateP(temp) + chain.chain * 12 + chain.pops * 2;
      if (!best || s > best.score) best = { rot:rot, x:px, y:py, score:s };
    }
  }
  return best;
}

// ── Damage formulas ────────────────────────────────────────────────────────

// Tetris 消行 → 送 puyo 垃圾（單行 2 個、Tetris! 強力爆擊）
function tetrisDamageToPuyo(lines) {
  if (lines === 0) return 0;
  if (lines === 1) return 2;
  if (lines === 2) return 4;
  if (lines === 3) return 7;
  return 12;  // Tetris!
}

// Puyo 連鎖 → 送 tetris 垃圾（小鏈微傷，避免 chain-3 即殺）
function puyoDamageToTetris(chain, pops) {
  if (chain <= 1) return 0;
  if (chain === 2) return 1;
  if (chain === 3) return 3;
  if (chain === 4) return 5;
  if (chain === 5) return 7;
  return (chain - 2) * 2;
}

// ── Apply garbage ──────────────────────────────────────────────────────────

function applyGarbageT(state, rows) {
  if (rows <= 0) return;
  // 從底部插入 N 行垃圾，每行有 1 個隨機洞，上面整體往上推
  for (var n = 0; n < rows; n++) {
    state.grid.shift();  // 砍掉最上面
    var newRow = new Array(COLS_T).fill(8);  // 8 = garbage marker (大於 piece colorIdx 0-6)
    var hole = Math.floor(Math.random() * COLS_T);
    newRow[hole] = 0;
    state.grid.push(newRow);
  }
}

function applyGarbageP(state, count) {
  if (count <= 0) return;
  // 從上面隨機格落下 garbage puyos
  for (var n = 0; n < count; n++) {
    var c = Math.floor(Math.random() * COLS_P);
    // 找該欄最高的空格
    var r = -1;
    for (var rr = 0; rr < ROWS_P; rr++) {
      if (state.grid[rr][c]) break;
      r = rr;
    }
    if (r >= 0) state.grid[r][c] = PUYO_GARBAGE;
  }
}

// ── Tetris game step ────────────────────────────────────────────────────────

function tetrisSpawn(state, opponent) {
  // 套上 pending garbage
  if (state.pendingGarbage > 0) {
    applyGarbageT(state, state.pendingGarbage);
    state.pendingGarbage = 0;
  }
  var type = state.nextType;
  state.nextType = pickTetrisType();
  var best = findBestT(state.grid, type);
  if (!best || best.y < 0) {
    state.gameOver = true;
    return false;
  }
  var baseShape = PIECES_T[type].shape;
  var targetCenter = computeTargetCenterT(baseShape, best.x, best.y, best.rot);
  state.current = {
    type: type,
    baseShape: baseShape,
    shape: best.shape,
    targetRot: best.rot,
    x: best.x,
    targetY: best.y,
    spawnY: -best.shape.length,
    spawnCenter: { x: COLS_T / 2, y: -2 },
    targetCenter: targetCenter,
    color: PIECES_T[type].color
  };
  state.stats.pieces++;
  return true;
}

function computeTargetCenterT(baseShape, finalX, finalY, targetRot) {
  var bh = baseShape.length, bw = baseShape[0].length;
  var rh = bh, rw = bw, rr = 0, rc = 0;
  for (var i = 0; i < targetRot; i++) {
    var nrr = rc, nrc = rh - 1 - rr;
    rr = nrr; rc = nrc;
    var t = rh; rh = rw; rw = t;
  }
  var ox = 0.5 - bw / 2, oy = 0.5 - bh / 2;
  for (var j = 0; j < targetRot; j++) { var tx = ox; ox = -oy; oy = tx; }
  return { x: finalX + rc + 0.5 - ox, y: finalY + rr + 0.5 - oy };
}

function tetrisSettle(state, opponent) {
  placePieceT(state.grid, state.current.shape, state.current.x, state.current.targetY, state.current.color);
  state.clearingRows = [];
  for (var r = 0; r < ROWS_T; r++) {
    var full = true;
    for (var c = 0; c < COLS_T; c++) if (!state.grid[r][c]) { full = false; break; }
    if (full) state.clearingRows.push(r);
  }
  state.stats.lines += state.clearingRows.length;
  // 送對手垃圾（消行傷害 + escalation 壓力）
  var dmg = 0;
  if (state.clearingRows.length > 0) dmg += tetrisDamageToPuyo(state.clearingRows.length);
  dmg += pressureLevel();  // 拖越久每片方塊送的越多
  if (dmg > 0) opponent.pendingGarbage += dmg;
}

function tetrisClear(state) {
  if (state.clearingRows.length === 0) return;
  for (var i = 0; i < state.clearingRows.length; i++) state.grid[state.clearingRows[i]] = new Array(COLS_T).fill(0);
  var newGrid = [];
  for (var r = 0; r < ROWS_T; r++) newGrid.push(new Array(COLS_T).fill(0));
  var writeRow = ROWS_T - 1;
  for (var rr = ROWS_T - 1; rr >= 0; rr--) {
    var any = false;
    for (var cc = 0; cc < COLS_T; cc++) if (state.grid[rr][cc]) { any = true; break; }
    if (any || state.clearingRows.indexOf(rr) < 0) {
      newGrid[writeRow] = state.grid[rr].slice();
      writeRow--;
    }
  }
  state.grid = newGrid;
  state.clearingRows = [];
}

function tetrisUpdate(state, opponent, now) {
  if (state.gameOver) return;
  var elapsed = (now - state.phaseStart) * stepSpeed;
  if (state.phase === "spawn") {
    if (elapsed >= GAP_DUR) {
      if (tetrisSpawn(state, opponent)) {
        state.phase = "falling";
      }
      state.phaseStart = now;
    }
  } else if (state.phase === "falling") {
    if (elapsed >= FALL_DUR) {
      tetrisSettle(state, opponent);
      state.phase = state.clearingRows.length > 0 ? "clearing" : "spawn";
      state.phaseStart = now;
    }
  } else if (state.phase === "clearing") {
    if (elapsed >= CLEAR_DUR) {
      tetrisClear(state);
      state.phase = "spawn";
      state.phaseStart = now;
    }
  }
}

// ── Puyo game step ──────────────────────────────────────────────────────────

function puyoSpawn(state, opponent) {
  if (state.pendingGarbage > 0) {
    applyGarbageP(state, state.pendingGarbage);
    state.pendingGarbage = 0;
  }
  var colors = state.nextColors;
  state.nextColors = [pickPuyoColor(), pickPuyoColor()];
  var best = findBestP(state.grid, colors);
  if (!best) { state.gameOver = true; return false; }
  state.current = {
    colors: colors,
    rot: best.rot,        // 目標旋轉 0..3
    x: best.x,
    targetY: best.y,
    spawnX: Math.floor(COLS_P / 2) - 1,  // 從中央上方落下
    spawnY: -2
  };
  state.stats.pieces++;
  return true;
}

function puyoSettle(state, opponent) {
  placePieceP(state.grid, state.current.rot, state.current.colors, state.current.x, state.current.targetY);
  applyGravityP(state.grid);
  // 連鎖：用 chainState 一次 pop 一段（為了動畫顯示）
  state.chainState = { chain: 0, popping: [], pendingNext: true };
}

function puyoChainStep(state, opponent) {
  // 找下一波 pop
  var groups = findConnectedGroups(state.grid);
  if (groups.length === 0) {
    // 整個連鎖結算 + escalation 壓力
    var dmg = 0;
    if (state.chainState.chain > 0) {
      dmg += puyoDamageToTetris(state.chainState.chain, state.stats.pops);
      if (state.chainState.chain > state.stats.maxChain) state.stats.maxChain = state.chainState.chain;
    }
    dmg += pressureLevel();
    if (dmg > 0) opponent.pendingGarbage += dmg;
    state.chainState.pendingNext = false;
    return false;  // 連鎖結束
  }
  state.chainState.chain++;
  // 標出 popping cells（給動畫用）
  var popping = [];
  for (var i = 0; i < groups.length; i++) {
    for (var j = 0; j < groups[i].length; j++) popping.push(groups[i][j].slice());
  }
  state.chainState.popping = popping;
  // 同時把 grid 中要消的標 0（動畫期間視覺上仍可拿 popping array 顯示）
  popGroups(state.grid, groups);
  state.stats.pops += popping.length;
  return true;  // 還有 pop 要顯示
}

function puyoUpdate(state, opponent, now) {
  if (state.gameOver) return;
  var elapsed = (now - state.phaseStart) * stepSpeed;
  if (state.phase === "spawn") {
    if (elapsed >= GAP_DUR) {
      if (puyoSpawn(state, opponent)) {
        state.phase = "falling";
      }
      state.phaseStart = now;
    }
  } else if (state.phase === "falling") {
    if (elapsed >= FALL_DUR) {
      puyoSettle(state, opponent);
      state.phase = "popping";
      state.phaseStart = now;
    }
  } else if (state.phase === "popping") {
    if (elapsed >= POP_DUR) {
      var hadPop = puyoChainStep(state, opponent);
      if (hadPop) {
        // 重設 phase 計時，繼續 popping
        state.phaseStart = now;
      } else {
        applyGravityP(state.grid);
        state.phase = "spawn";
        state.phaseStart = now;
      }
    }
  }
}

// ── Setup / layout ─────────────────────────────────────────────────────────

function setup() {
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("battle-container");

  document.getElementById("btn-new").onclick = newMatch;
  document.getElementById("btn-speed").onclick = toggleSpeed;
  document.getElementById("btn-new").ontouchend = function(e){ e.preventDefault(); newMatch(); };
  document.getElementById("btn-speed").ontouchend = function(e){ e.preventDefault(); toggleSpeed(); };

  newMatch();
}

function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;

  // 為了讓兩邊棋盤「高度像素相等」：Puyo cell 大小 = Tetris cell × (ROWS_T / ROWS_P)
  var P_TO_T = ROWS_T / ROWS_P;  // ≈ 1.538

  // 總寬（以 Tetris cell 為單位）：
  //   puyo field  = 6 × P_TO_T ≈ 9.23
  //   gap         = 0.7
  //   preview puyo = 3 × P_TO_T ≈ 4.62
  //   gap         = 0.8
  //   center      = 3
  //   gap         = 0.8
  //   preview tetris = 4
  //   gap         = 0.6
  //   tetris field = 10
  //   邊距        = 1.5
  var TOTAL_W = COLS_P * P_TO_T + 0.7 + 3 * P_TO_T + 0.8 + 3 + 0.8 + 4 + 0.6 + COLS_T + 1.5;
  var TOTAL_H = ROWS_T + 3;  // 1.5 上 HUD + 20 field + 1.5 下方 stats 文字空間

  var cellByW = availW / TOTAL_W;
  var cellByH = availH / TOTAL_H;
  var cell = Math.min(cellByW, cellByH);
  if (cell < 8) cell = 8;

  cellSize = cell;
  cellSizeP = cell * P_TO_T;
  canvasW = Math.floor(cell * TOTAL_W);
  canvasH = Math.floor(cell * TOTAL_H);

  // 上方留 1.5 cell HUD
  topY = cell * 1.5;

  // 從左到右排版
  var puyoX = cell * 0.75;
  previewP_X = puyoX + COLS_P * cellSizeP + cell * 0.7;
  var centerStart = previewP_X + 3 * cellSizeP + cell * 0.8;
  centerX = centerStart + 1.5 * cell;
  previewT_X = centerStart + 3 * cell + cell * 0.8;
  var tetrisX = previewT_X + 4 * cell + cell * 0.6;

  previewP_Y = topY;
  previewT_Y = topY;
  leftX = puyoX;
  rightX = tetrisX;
}

function windowResized() { applyDims(); resizeCanvas(canvasW, canvasH); }

function toggleSpeed() {
  stepSpeed = stepSpeed >= 4 ? 0.5 : stepSpeed * 2;
  document.getElementById("btn-speed").textContent = "Speed ×" + stepSpeed;
}

function newMatch() {
  theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  document.getElementById("btn-new").style.background = theme.puyo[0];
  tetris = createTetris();
  puyo = createPuyo();
  var now = millis();
  tetris.phaseStart = now;
  puyo.phaseStart = now;
  matchStart = now;
}

// 對戰時間越久，每個方塊額外送的 garbage 越多
function pressureLevel() {
  var elapsed = millis() - matchStart;
  return Math.floor(elapsed / ESCALATION_INTERVAL);
}

// ── Draw ───────────────────────────────────────────────────────────────────

function draw() {
  background(theme.bg);

  var now = millis();

  // 任一方 game over → 重新開始
  if (tetris.gameOver || puyo.gameOver) {
    drawFields(now);
    drawWinner();
    if (millis() - tetris.phaseStart > 1800 && millis() - puyo.phaseStart > 1800) {
      newMatch();
    }
    return;
  }

  tetrisUpdate(tetris, puyo, now);
  puyoUpdate(puyo, tetris, now);
  drawFields(now);
}

function drawFields(now) {
  drawTetrisField(now);
  drawPuyoField(now);
  drawCenter();
  drawHud();
}

// ── Tetris field render ────────────────────────────────────────────────────

function drawTetrisField(now) {
  var x = rightX, y = topY;
  var w = COLS_T * cellSize, h = ROWS_T * cellSize;
  noStroke();
  fill(theme.grid);
  rect(x - 4, y - 4, w + 8, h + 8, 6);
  fill(theme.bg);
  rect(x, y, w, h);

  // 格線
  stroke(theme.grid); strokeWeight(1);
  for (var c = 1; c < COLS_T; c++) line(x + c*cellSize, y, x + c*cellSize, y + h);
  for (var r = 1; r < ROWS_T; r++) line(x, y + r*cellSize, x + w, y + r*cellSize);
  noStroke();

  // 已落定格子
  for (var r2 = 0; r2 < ROWS_T; r2++) {
    for (var c2 = 0; c2 < COLS_T; c2++) {
      if (tetris.grid[r2][c2]) {
        var v = tetris.grid[r2][c2];
        if (v === 8) drawTBlock(x, y, c2, r2, theme.garbage);
        else drawTBlock(x, y, c2, r2, theme.tetris[v - 1]);
      }
    }
  }

  // 下落中的方塊：用 canvas transform 漸進旋轉
  if (tetris.phase === "falling" && tetris.current) {
    var elapsed = (now - tetris.phaseStart) * stepSpeed;
    var t = Math.min(1, elapsed / FALL_DUR);
    var et = t * t;
    var rt = Math.min(1, t * 1.6);
    var etRot = 1 - Math.pow(1 - rt, 2);

    var sc = tetris.current.spawnCenter, tc = tetris.current.targetCenter;
    var cx = sc.x + (tc.x - sc.x) * et;
    var cy = sc.y + (tc.y - sc.y) * et;
    var angle = etRot * tetris.current.targetRot * Math.PI / 2;

    // ghost
    for (var r3 = 0; r3 < tetris.current.shape.length; r3++) {
      for (var c3 = 0; c3 < tetris.current.shape[r3].length; c3++) {
        if (tetris.current.shape[r3][c3]) {
          var gy = tetris.current.targetY + r3;
          if (gy >= 0) drawTBlockAlpha(x, y, tetris.current.x + c3, gy, theme.tetris[tetris.current.color], 40);
        }
      }
    }

    // 主體：base shape + transform
    var baseShape = tetris.current.baseShape;
    var bh = baseShape.length, bw = baseShape[0].length;
    var inset = Math.max(1, cellSize * 0.06);
    var col = theme.tetris[tetris.current.color];
    var rgb = hexRGB(col);
    var hi = [Math.min(255, rgb[0]+50), Math.min(255, rgb[1]+50), Math.min(255, rgb[2]+50)];

    push();
    translate(x + cx * cellSize, y + cy * cellSize);
    rotate(angle);
    for (var rr = 0; rr < bh; rr++) {
      for (var cc = 0; cc < bw; cc++) {
        if (!baseShape[rr][cc]) continue;
        var ox2 = (cc - bw / 2) * cellSize;
        var oy2 = (rr - bh / 2) * cellSize;
        noStroke();
        fill(col);
        rect(ox2 + inset, oy2 + inset, cellSize - inset*2, cellSize - inset*2, cellSize * 0.15);
        fill(hi[0], hi[1], hi[2], 160);
        rect(ox2 + inset, oy2 + inset, cellSize - inset*2, cellSize * 0.18, cellSize * 0.15);
      }
    }
    pop();
  }

  // 消行閃光
  if (tetris.phase === "clearing") {
    var elapsedC = (now - tetris.phaseStart) * stepSpeed;
    var tt = Math.min(1, elapsedC / CLEAR_DUR);
    var rgb = hexRGB(theme.flash);
    var alpha = Math.sin(tt * Math.PI) * 255;
    fill(rgb[0], rgb[1], rgb[2], alpha);
    for (var i = 0; i < tetris.clearingRows.length; i++) {
      rect(x, y + tetris.clearingRows[i] * cellSize, w, cellSize);
    }
  }

  // Next preview
  drawTetrisPreview();
}

function drawTBlock(originX, originY, col, row, color) {
  drawTBlockFloat(originX, originY, col, row, color);
}
function drawTBlockFloat(originX, originY, col, row, color) {
  noStroke();
  fill(color);
  var px = originX + col * cellSize, py = originY + row * cellSize;
  var inset = Math.max(1, cellSize * 0.06);
  rect(px + inset, py + inset, cellSize - inset*2, cellSize - inset*2, cellSize * 0.15);
  var rgb = hexRGB(color);
  var hi = [Math.min(255, rgb[0]+50), Math.min(255, rgb[1]+50), Math.min(255, rgb[2]+50)];
  fill(hi[0], hi[1], hi[2], 160);
  rect(px + inset, py + inset, cellSize - inset*2, cellSize * 0.18, cellSize * 0.15);
}
function drawTBlockAlpha(originX, originY, col, row, color, alpha) {
  noStroke();
  var rgb = hexRGB(color);
  fill(rgb[0], rgb[1], rgb[2], alpha);
  var px = originX + col * cellSize, py = originY + row * cellSize;
  var inset = Math.max(1, cellSize * 0.06);
  rect(px + inset, py + inset, cellSize - inset*2, cellSize - inset*2, cellSize * 0.15);
}

function drawTetrisPreview() {
  if (!tetris.nextType) return;
  var pieceColor = PIECES_T[tetris.nextType].color;
  var shape = PIECES_T[tetris.nextType].shape;
  var boxSize = 4 * cellSize;
  noStroke(); fill(theme.grid);
  rect(previewT_X - 4, previewT_Y - 4, boxSize + 8, boxSize + 8, 6);
  fill(theme.bg);
  rect(previewT_X, previewT_Y, boxSize, boxSize);
  // 標題
  fill(theme.tetris[pieceColor]);
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  textSize(Math.max(10, cellSize * 0.45));
  text("NEXT", previewT_X, previewT_Y - 3);
  // 方塊置中
  var pw = shape[0].length, ph = shape.length;
  var offX = previewT_X + (boxSize - pw * cellSize) / 2;
  var offY = previewT_Y + (boxSize - ph * cellSize) / 2;
  for (var r = 0; r < ph; r++) for (var c = 0; c < pw; c++)
    if (shape[r][c]) drawTBlockFloat(offX, offY, c, r, theme.tetris[pieceColor]);
}

// ── Puyo field render ──────────────────────────────────────────────────────

function drawPuyoField(now) {
  var x = leftX, y = topY;
  var w = COLS_P * cellSizeP, h = ROWS_P * cellSizeP;
  noStroke();
  fill(theme.grid);
  rect(x - 4, y - 4, w + 8, h + 8, 6);
  fill(theme.bg);
  rect(x, y, w, h);

  // 格線
  stroke(theme.grid); strokeWeight(1);
  for (var c = 1; c < COLS_P; c++) line(x + c*cellSizeP, y, x + c*cellSizeP, y + h);
  for (var r = 1; r < ROWS_P; r++) line(x, y + r*cellSizeP, x + w, y + r*cellSizeP);
  noStroke();

  // 已落定 puyo
  for (var r2 = 0; r2 < ROWS_P; r2++) {
    for (var c2 = 0; c2 < COLS_P; c2++) {
      var v = puyo.grid[r2][c2];
      if (v) {
        var col = (v === PUYO_GARBAGE) ? theme.garbage : theme.puyo[v - 1];
        drawPuyoBlob(x, y, c2, r2, col, v === PUYO_GARBAGE);
      }
    }
  }

  // 下落中的 piece
  if (puyo.phase === "falling" && puyo.current) {
    var elapsed = (now - puyo.phaseStart) * stepSpeed;
    var t = Math.min(1, elapsed / FALL_DUR);
    var et = t * t;                    // 下落 ease-in
    var rt = Math.min(1, t * 1.6);     // 旋轉提早完成
    var etRot = 1 - Math.pow(1 - rt, 2);

    // pivot puyo（第一顆）位置：從 spawnX 滑到 best.x，從 spawnY 落到 targetY
    var px = puyo.current.spawnX + (puyo.current.x - puyo.current.spawnX) * et;
    var py = puyo.current.spawnY + (puyo.current.targetY - puyo.current.spawnY) * et;

    // 第二顆 puyo 繞 pivot 轉：從 rotation 0（上方）漸進到 targetRot
    var startAng = -Math.PI / 2;          // rotation 0 = 上方
    var endAng = -Math.PI / 2 + puyo.current.rot * Math.PI / 2;  // canvas 90° CW
    var ang = startAng + (endAng - startAng) * etRot;
    var secondR = py + Math.sin(ang);
    var secondC = px + Math.cos(ang);

    var color0 = theme.puyo[puyo.current.colors[0] - 1];
    var color1 = theme.puyo[puyo.current.colors[1] - 1];

    // ghost（最終位置）
    var offs = puyoOffsets(puyo.current.rot);
    for (var k = 0; k < 2; k++) {
      var gr = puyo.current.targetY + offs[k][0];
      var gc = puyo.current.x + offs[k][1];
      if (gr >= 0) drawPuyoBlobAlpha(x, y, gc, gr, theme.puyo[puyo.current.colors[k] - 1], 40);
    }

    // 主體：pivot + 第二顆（用 cell 浮點座標，drawPuyoBlobFloat 會自動算像素）
    drawPuyoBlobFloat(x, y, px, py, color0, false);
    drawPuyoBlobFloat(x, y, secondC, secondR, color1, false);
  }

  // 消除中閃光（puyo popping 階段，顯示 popping cells 閃白）
  if (puyo.phase === "popping" && puyo.chainState && puyo.chainState.popping.length > 0) {
    var elapsedC = (now - puyo.phaseStart) * stepSpeed;
    var tt = Math.min(1, elapsedC / POP_DUR);
    var rgb = hexRGB(theme.flash);
    var alpha = Math.sin(tt * Math.PI) * 230;
    fill(rgb[0], rgb[1], rgb[2], alpha);
    for (var p = 0; p < puyo.chainState.popping.length; p++) {
      var pr = puyo.chainState.popping[p][0], pc = puyo.chainState.popping[p][1];
      ellipse(x + pc*cellSizeP + cellSizeP/2, y + pr*cellSizeP + cellSizeP/2, cellSizeP * 0.95, cellSizeP * 0.95);
    }
  }

  drawPuyoPreview();
}

function drawPuyoBlob(originX, originY, col, row, color, isGarbage) {
  drawPuyoBlobFloat(originX, originY, col, row, color, isGarbage);
}
function drawPuyoBlobFloat(originX, originY, col, row, color, isGarbage) {
  noStroke();
  fill(color);
  var px = originX + col * cellSizeP + cellSizeP / 2;
  var py = originY + row * cellSizeP + cellSizeP / 2;
  var rad = cellSizeP * 0.88;
  ellipse(px, py, rad, rad);
  if (!isGarbage) {
    var rgb = hexRGB(color);
    var hi = [Math.min(255, rgb[0]+80), Math.min(255, rgb[1]+80), Math.min(255, rgb[2]+80)];
    fill(255);
    var eyeR = rad * 0.18;
    ellipse(px - rad*0.22, py - rad*0.10, eyeR, eyeR);
    ellipse(px + rad*0.22, py - rad*0.10, eyeR, eyeR);
    fill(0);
    var pupR = eyeR * 0.45;
    ellipse(px - rad*0.22, py - rad*0.10, pupR, pupR);
    ellipse(px + rad*0.22, py - rad*0.10, pupR, pupR);
    fill(hi[0], hi[1], hi[2], 200);
    ellipse(px - rad*0.20, py + rad*0.20, rad*0.18, rad*0.10);
  } else {
    stroke(0); strokeWeight(Math.max(1, cellSizeP * 0.05));
    var s = rad * 0.18;
    line(px - s, py - s, px + s, py + s);
    line(px - s, py + s, px + s, py - s);
    noStroke();
  }
}
function drawPuyoBlobAlpha(originX, originY, col, row, color, alpha) {
  noStroke();
  var rgb = hexRGB(color);
  fill(rgb[0], rgb[1], rgb[2], alpha);
  var px = originX + col * cellSizeP + cellSizeP / 2;
  var py = originY + row * cellSizeP + cellSizeP / 2;
  ellipse(px, py, cellSizeP * 0.88, cellSizeP * 0.88);
}

function drawPuyoPreview() {
  var boxSize = 3 * cellSizeP;
  noStroke(); fill(theme.grid);
  rect(previewP_X - 4, previewP_Y - 4, boxSize + 8, boxSize + 8, 6);
  fill(theme.bg);
  rect(previewP_X, previewP_Y, boxSize, boxSize);

  fill(theme.puyo[puyo.nextColors[0] - 1]);
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  textSize(Math.max(10, cellSize * 0.45));
  text("NEXT", previewP_X, previewP_Y - 3);

  // 兩顆 puyo 上下排（vertical pair preview）
  var cx = previewP_X + boxSize / 2;
  var cy1 = previewP_Y + boxSize / 2 - cellSizeP * 0.6;
  var cy2 = previewP_Y + boxSize / 2 + cellSizeP * 0.6;
  drawPuyoAt(cx, cy1, theme.puyo[puyo.nextColors[1] - 1]);
  drawPuyoAt(cx, cy2, theme.puyo[puyo.nextColors[0] - 1]);
}

function drawPuyoAt(cx, cy, color) {
  noStroke(); fill(color);
  var rad = cellSizeP * 0.88;
  ellipse(cx, cy, rad, rad);
  fill(255);
  var eyeR = rad * 0.18;
  ellipse(cx - rad*0.22, cy - rad*0.10, eyeR, eyeR);
  ellipse(cx + rad*0.22, cy - rad*0.10, eyeR, eyeR);
  fill(0);
  ellipse(cx - rad*0.22, cy - rad*0.10, eyeR*0.45, eyeR*0.45);
  ellipse(cx + rad*0.22, cy - rad*0.10, eyeR*0.45, eyeR*0.45);
}

// ── Center: pending garbage / VS / arrows ──────────────────────────────────

function drawCenter() {
  var centerY = topY + ROWS_T * cellSize * 0.25;

  // VS 標籤
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(Math.max(14, cellSize * 1.1));
  text("VS", centerX, centerY);

  // Puyo 進來的垃圾 (從 tetris 送過來 → 顯示左指箭頭)
  if (puyo.pendingGarbage > 0) {
    textSize(Math.max(10, cellSize * 0.55));
    textStyle(BOLD);
    fill(theme.garbage);
    text("←", centerX - cellSize * 1.1, centerY + cellSize * 1.2);
    fill(255);
    text(puyo.pendingGarbage, centerX - cellSize * 1.1, centerY + cellSize * 2);
  }

  // Tetris 進來的垃圾 (從 puyo 送過來 → 顯示右指箭頭)
  if (tetris.pendingGarbage > 0) {
    textSize(Math.max(10, cellSize * 0.55));
    textStyle(BOLD);
    fill(theme.garbage);
    text("→", centerX + cellSize * 1.1, centerY + cellSize * 1.2);
    fill(255);
    text(tetris.pendingGarbage, centerX + cellSize * 1.1, centerY + cellSize * 2);
  }

  // chain 數字（puyo 連鎖中時顯示在 puyo 上方）
  if (puyo.chainState && puyo.chainState.chain > 1) {
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(Math.max(16, cellSizeP * 1.0));
    fill(theme.puyo[0]);
    text(puyo.chainState.chain + "CHAIN", leftX + COLS_P * cellSizeP / 2, topY + cellSizeP * 1.5);
  }
}

// ── HUD ────────────────────────────────────────────────────────────────────

function drawHud() {
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  var fs = Math.max(11, cellSize * 0.55);
  textSize(fs);

  // 左：PUYO
  fill(theme.puyo[0]);
  text("PUYO", leftX, topY - 4);

  // 右：TETRIS
  fill(theme.tetris[0]);
  text("TETRIS", rightX, topY - 4);

  // theme 名置中
  textAlign(CENTER, BOTTOM);
  textSize(fs * 0.7);
  textStyle(NORMAL);
  fill(180);
  text("AUTO BATTLE · " + theme.name.toUpperCase(), canvasW / 2, topY - 4);

  // Bottom stats（兩邊棋盤高度像素相等，所以 statsY 同一條線）
  textAlign(LEFT, TOP);
  textSize(fs * 0.7);
  fill(180);
  textStyle(NORMAL);
  var statsY = topY + ROWS_T * cellSize + cellSize * 0.3;
  text("PIECES " + tetris.stats.pieces + "  LINES " + tetris.stats.lines, rightX, statsY);
  text("PIECES " + puyo.stats.pieces + "  POPS " + puyo.stats.pops + "  MAX " + puyo.stats.maxChain, leftX, statsY);
}

function drawWinner() {
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(Math.max(20, cellSize * 1.6));
  var msg, color;
  if (tetris.gameOver && !puyo.gameOver) { msg = "PUYO WINS"; color = theme.puyo[0]; }
  else if (puyo.gameOver && !tetris.gameOver) { msg = "TETRIS WINS"; color = theme.tetris[0]; }
  else { msg = "DRAW"; color = "#fff"; }
  fill(0, 0, 0, 180);
  rect(0, canvasH/2 - cellSize*2, canvasW, cellSize*4);
  fill(color);
  text(msg, canvasW / 2, canvasH / 2);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function keyPressed() {
  if (key === " ") newMatch();
  if (key === "+" || key === "=") toggleSpeed();
}
