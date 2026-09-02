// ============================================
// Auto Tetris — 自動玩的俄羅斯方塊 gen-art
// AI 用 Dellacherie 風格啟發式：lines+, height-, holes-, bumpiness-
// ============================================

var rand = fxrand;

var COLS = 10, ROWS = 20;
var PREVIEW_CELLS = 5;       // 右側 preview 區寬度（含 padding）
var cellSize, mgnX, mgnY;
var previewX, previewY;      // preview 區左上角
var canvasW, canvasH;

var grid;              // [row][col] = colorIdx + 1 or 0
var pal;
var stats;             // { pieces, lines, level }
var animTime;          // 0..1 within current animation step
var stepSpeed = 1.0;   // animation speed multiplier (toggleable)

// 階段機
// "thinking" → AI 算最佳落點（瞬間完成）
// "falling"  → 從 spawnY 動畫掉到 targetY
// "clearing" → 滿行閃白後消除
// "spawn"    → 取下一個 piece
var phase = "spawn";
var phaseStart = 0;    // millis at phase start

var currentPiece = null;   // { type, shape, x, targetY, spawnY }
var nextPieceType = null;  // 右側預覽用，下一個會掉的方塊類型
var clearingRows = [];     // 待消除的列 idx

var FALL_DURATION = 320;     // ms per piece fall
var CLEAR_DURATION = 320;    // ms for clear flash
var BETWEEN_PIECE = 60;      // brief pause between pieces

// ── Tetromino 定義（base shape；rotations 由 rotateShape 動態算）─────────

var PIECES = {
  I: { color: 0, shape: [[1,1,1,1]] },
  O: { color: 1, shape: [[1,1],[1,1]] },
  T: { color: 2, shape: [[0,1,0],[1,1,1]] },
  S: { color: 3, shape: [[0,1,1],[1,1,0]] },
  Z: { color: 4, shape: [[1,1,0],[0,1,1]] },
  J: { color: 5, shape: [[1,0,0],[1,1,1]] },
  L: { color: 6, shape: [[0,0,1],[1,1,1]] },
};
var PIECE_TYPES = ["I","O","T","S","Z","J","L"];

// ── Palettes（7 色對應 7 piece type）───────────────────────────────────

var PALETTES = [
  { name: "Classic", bg:"#0a0a0f", grid:"#1a1a25", flash:"#ffffff",
    colors:["#00f0f0","#f0f000","#a000f0","#00f000","#f00000","#0000f0","#f0a000"] },
  { name: "Sunset", bg:"#1a0011", grid:"#2a0022", flash:"#fff5e6",
    colors:["#FF006E","#FB5607","#FFBE0B","#3A86FF","#8338EC","#06D6A0","#EF476F"] },
  { name: "Vapor", bg:"#10001f", grid:"#220033", flash:"#ffaaff",
    colors:["#FF6AD5","#C774E8","#AD8CFF","#8795E8","#94D0FF","#FBA8FF","#FF85A2"] },
  { name: "Mono", bg:"#1a1a1a", grid:"#2a2a2a", flash:"#fff",
    colors:["#ffffff","#dddddd","#bbbbbb","#999999","#777777","#555555","#aaaaaa"] },
  { name: "Solarized", bg:"#002b36", grid:"#073642", flash:"#fdf6e3",
    colors:["#268bd2","#dc322f","#859900","#b58900","#d33682","#cb4b16","#6c71c4"] },
  { name: "Neon", bg:"#0a0a0a", grid:"#1a1a1a", flash:"#fff",
    colors:["#05D9E8","#FF2A6D","#01ECFD","#FF901F","#39FF14","#BD00FF","#FFFF00"] },
  { name: "Pastel", bg:"#fdf6e3", grid:"#eee8d5", flash:"#fff",
    colors:["#a8dadc","#e63946","#a7c957","#f2cc8f","#ef476f","#118ab2","#9d4edd"] },
  { name: "Cyberpunk", bg:"#0d001a", grid:"#1a0033", flash:"#f0f",
    colors:["#00ffff","#ff00ff","#ffff00","#ff0080","#80ff00","#0080ff","#ff8000"] },
];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("tetris-container");

  document.getElementById("btn-new").onclick = newPalette;
  document.getElementById("btn-speed").onclick = toggleSpeed;
  document.getElementById("btn-save").onclick = doSave;
  document.getElementById("btn-new").ontouchend = function(e){ e.preventDefault(); newPalette(); };
  document.getElementById("btn-speed").ontouchend = function(e){ e.preventDefault(); toggleSpeed(); };
  document.getElementById("btn-save").ontouchend = function(e){ e.preventDefault(); doSave(); };

  initGame();
}

// 總寬度：field (COLS=10) + gap (1) + preview (PREVIEW_CELLS=5) + margins (1.5)
// 總高度：ROWS (20) + margins (1.5)
function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;

  var TOTAL_W = COLS + 1 + PREVIEW_CELLS + 1.5;   // 17.5 cells
  var TOTAL_H = ROWS + 1.5;                        // 21.5 cells

  var cellByW = availW / TOTAL_W;
  var cellByH = availH / TOTAL_H;
  var cell = Math.min(cellByW, cellByH);
  if (cell < 10) cell = 10;

  cellSize = cell;
  canvasW = Math.floor(cell * TOTAL_W);
  canvasH = Math.floor(cell * TOTAL_H);

  mgnX = cell * 0.75;
  mgnY = cell * 1.0;        // 上方多留空間給 HUD
  previewX = mgnX + cell * COLS + cell * 1.0;
  previewY = mgnY + cell * 1.0;  // 對齊 field 上方稍下一點
}

function windowResized() {
  applyDims();
  resizeCanvas(canvasW, canvasH);
}

function doSave() { saveCanvas("auto-tetris-" + Date.now(), "png"); }

function toggleSpeed() {
  stepSpeed = stepSpeed >= 4 ? 0.5 : stepSpeed * 2;
  var btn = document.getElementById("btn-speed");
  btn.textContent = "Speed ×" + stepSpeed;
}

function newPalette() {
  pal = PALETTES[Math.floor(rand() * PALETTES.length)];
  document.getElementById("btn-new").style.background = pal.colors[0];
  document.getElementById("btn-new").style.color = "#111";
}

function initGame() {
  pal = PALETTES[Math.floor(rand() * PALETTES.length)];
  grid = [];
  for (var r = 0; r < ROWS; r++) {
    grid[r] = new Array(COLS).fill(0);
  }
  stats = { pieces: 0, lines: 0 };
  phase = "spawn";
  phaseStart = millis();
  currentPiece = null;
  nextPieceType = PIECE_TYPES[Math.floor(rand() * PIECE_TYPES.length)];
}

// ── Piece geometry helpers ─────────────────────────────────────────────────

function rotateShape(shape) {
  var h = shape.length, w = shape[0].length;
  var out = [];
  for (var r = 0; r < w; r++) {
    out[r] = new Array(h).fill(0);
    for (var c = 0; c < h; c++) {
      out[r][c] = shape[h - 1 - c][r];
    }
  }
  return out;
}

function getRotations(baseShape) {
  var rots = [baseShape];
  for (var i = 0; i < 3; i++) rots.push(rotateShape(rots[i]));
  // 去重（O 只有 1 種、I 有 2 種等等）
  var unique = [];
  outer: for (var k = 0; k < rots.length; k++) {
    for (var j = 0; j < unique.length; j++) {
      if (shapeEq(rots[k], unique[j])) continue outer;
    }
    unique.push(rots[k]);
  }
  return unique;
}

function shapeEq(a, b) {
  if (a.length !== b.length) return false;
  if (a[0].length !== b[0].length) return false;
  for (var r = 0; r < a.length; r++) {
    for (var c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

// 在某 (x, y) 能否放置（檢查邊界 + 碰撞）
function canPlace(grid, shape, px, py) {
  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      var x = px + c, y = py + r;
      if (x < 0 || x >= COLS) return false;
      if (y >= ROWS) return false;
      if (y >= 0 && grid[y][x]) return false;
    }
  }
  return true;
}

// 找 shape 在 column px 自由落體後最低能落到的 y
function dropTo(grid, shape, px) {
  var py = -2;
  while (canPlace(grid, shape, px, py + 1)) py++;
  return canPlace(grid, shape, px, py) ? py : null;
}

function placePiece(grid, shape, px, py, colorIdx) {
  for (var r = 0; r < shape.length; r++) {
    for (var c = 0; c < shape[r].length; c++) {
      if (shape[r][c] && py + r >= 0 && py + r < ROWS) {
        grid[py + r][px + c] = colorIdx + 1;
      }
    }
  }
}

// ── AI 評分 ────────────────────────────────────────────────────────────────

function evaluateGrid(grid) {
  var heights = new Array(COLS).fill(0);
  for (var c = 0; c < COLS; c++) {
    for (var r = 0; r < ROWS; r++) {
      if (grid[r][c]) { heights[c] = ROWS - r; break; }
    }
  }
  var aggHeight = 0;
  for (var i = 0; i < COLS; i++) aggHeight += heights[i];

  var holes = 0;
  for (var c2 = 0; c2 < COLS; c2++) {
    var topY = ROWS - heights[c2];
    for (var r2 = topY + 1; r2 < ROWS; r2++) {
      if (!grid[r2][c2]) holes++;
    }
  }

  var bumpiness = 0;
  for (var c3 = 0; c3 < COLS - 1; c3++) {
    bumpiness += Math.abs(heights[c3] - heights[c3 + 1]);
  }

  var lines = 0;
  for (var r3 = 0; r3 < ROWS; r3++) {
    var full = true;
    for (var c4 = 0; c4 < COLS; c4++) {
      if (!grid[r3][c4]) { full = false; break; }
    }
    if (full) lines++;
  }

  // El-Tetris weights（經典已 tuned 過的權重）
  return lines * 0.76 - aggHeight * 0.51 - holes * 0.36 - bumpiness * 0.18;
}

function findBestPlacement(pieceType) {
  var rots = getRotations(PIECES[pieceType].shape);
  var best = null;
  for (var rot = 0; rot < rots.length; rot++) {
    var shape = rots[rot];
    for (var px = -2; px <= COLS; px++) {
      var py = dropTo(grid, shape, px);
      if (py === null || py < 0) continue;
      // simulate
      var tempGrid = grid.map(function(row){ return row.slice(); });
      placePiece(tempGrid, shape, px, py, PIECES[pieceType].color);
      var score = evaluateGrid(tempGrid);
      if (best === null || score > best.score) {
        best = { rotation: rot, shape: shape, x: px, y: py, score: score };
      }
    }
  }
  return best;
}

// 算「旋轉中心」：要讓 base shape 繞此中心旋轉 targetRot×90° 後，
// 各 cell 位置剛好等於 final rotated shape 在 (finalX, finalY) 的 cell 位置
function computeTargetCenter(baseShape, finalX, finalY, targetRot) {
  var bh = baseShape.length, bw = baseShape[0].length;
  // base cell (0,0) 在旋轉後 shape 中的 cell coords
  var rh = bh, rw = bw;
  var rr = 0, rc = 0;
  for (var i = 0; i < targetRot; i++) {
    var nrr = rc, nrc = rh - 1 - rr;
    rr = nrr; rc = nrc;
    var t = rh; rh = rw; rw = t;
  }
  // base cell (0,0) 中心相對 base 幾何中心的 offset
  var ox = 0.5 - bw / 2;
  var oy = 0.5 - bh / 2;
  // 旋轉 offset：canvas 90° CW (x, y) → (-y, x)
  for (var j = 0; j < targetRot; j++) {
    var tx = ox; ox = -oy; oy = tx;
  }
  // C + (ox, oy) = (finalX + rc + 0.5, finalY + rr + 0.5)
  return { x: finalX + rc + 0.5 - ox, y: finalY + rr + 0.5 - oy };
}

// ── Game step ──────────────────────────────────────────────────────────────

function spawnNextPiece() {
  // 取下一個方塊類型（preview 顯示用的那個變成現在要掉的）
  var type = nextPieceType || PIECE_TYPES[Math.floor(rand() * PIECE_TYPES.length)];
  // 重新抽下一個給 preview
  nextPieceType = PIECE_TYPES[Math.floor(rand() * PIECE_TYPES.length)];

  var best = findBestPlacement(type);
  if (!best) {
    // 沒位置 → 棋盤滿到頂；清空重來
    initGame();
    return false;
  }
  var baseShape = PIECES[type].shape;
  var targetCenter = computeTargetCenter(baseShape, best.x, best.y, best.rot);
  currentPiece = {
    type: type,
    baseShape: baseShape,       // 旋轉 0 的原始形狀
    shape: best.shape,          // 最終目標形狀（給 ghost & settle 用）
    targetRot: best.rot,        // 0..3
    x: best.x,
    targetY: best.y,
    spawnY: -best.shape.length,
    spawnCenter: { x: COLS / 2, y: -2 },
    targetCenter: targetCenter, // 旋轉中心在世界座標的目標位置
    color: PIECES[type].color
  };
  stats.pieces++;
  return true;
}

function settlePiece() {
  placePiece(grid, currentPiece.shape, currentPiece.x, currentPiece.targetY, currentPiece.color);
  // Detect full rows
  clearingRows = [];
  for (var r = 0; r < ROWS; r++) {
    var full = true;
    for (var c = 0; c < COLS; c++) {
      if (!grid[r][c]) { full = false; break; }
    }
    if (full) clearingRows.push(r);
  }
  stats.lines += clearingRows.length;
}

function clearFullRows() {
  if (clearingRows.length === 0) return;
  // 先把要清的設成 0
  for (var i = 0; i < clearingRows.length; i++) {
    grid[clearingRows[i]] = new Array(COLS).fill(0);
  }
  // 上面的列依序往下塌
  var newGrid = [];
  for (var r = 0; r < ROWS; r++) newGrid.push(new Array(COLS).fill(0));
  var writeRow = ROWS - 1;
  for (var rr = ROWS - 1; rr >= 0; rr--) {
    var hasContent = false;
    for (var cc = 0; cc < COLS; cc++) {
      if (grid[rr][cc]) { hasContent = true; break; }
    }
    if (hasContent || clearingRows.indexOf(rr) < 0) {
      newGrid[writeRow] = grid[rr].slice();
      writeRow--;
    }
  }
  grid = newGrid;
  clearingRows = [];
}

// ── Draw ───────────────────────────────────────────────────────────────────

function draw() {
  background(pal.bg);

  // 階段機
  var now = millis();
  var elapsed = (now - phaseStart) * stepSpeed;

  if (phase === "spawn") {
    if (elapsed >= BETWEEN_PIECE) {
      if (spawnNextPiece()) {
        phase = "falling";
      }
      phaseStart = now;
    }
  } else if (phase === "falling") {
    if (elapsed >= FALL_DURATION) {
      settlePiece();
      phase = clearingRows.length > 0 ? "clearing" : "spawn";
      phaseStart = now;
    }
  } else if (phase === "clearing") {
    if (elapsed >= CLEAR_DURATION) {
      clearFullRows();
      phase = "spawn";
      phaseStart = now;
    }
  }

  drawField();
  drawGridLines();
  drawSettled();
  if (phase === "falling" && currentPiece) drawFallingPiece(elapsed);
  if (phase === "clearing") drawClearFlash(elapsed);
  drawPreview();
  drawHud();
}

function drawField() {
  noStroke();
  fill(pal.grid);
  rect(mgnX - 4, mgnY - 4, cellSize * COLS + 8, cellSize * ROWS + 8, 6);
  fill(pal.bg);
  rect(mgnX, mgnY, cellSize * COLS, cellSize * ROWS);
}

function drawGridLines() {
  stroke(pal.grid);
  strokeWeight(1);
  for (var c = 1; c < COLS; c++) {
    line(mgnX + c * cellSize, mgnY, mgnX + c * cellSize, mgnY + ROWS * cellSize);
  }
  for (var r = 1; r < ROWS; r++) {
    line(mgnX, mgnY + r * cellSize, mgnX + COLS * cellSize, mgnY + r * cellSize);
  }
}

function drawCell(x, y, colorIdx, alpha) {
  var col = pal.colors[colorIdx];
  noStroke();
  if (alpha !== undefined) {
    var rgb = hexRGB(col);
    fill(rgb[0], rgb[1], rgb[2], alpha);
  } else {
    fill(col);
  }
  var px = mgnX + x * cellSize;
  var py = mgnY + y * cellSize;
  var inset = Math.max(1, cellSize * 0.06);
  rect(px + inset, py + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.12);
  // 高光
  if (alpha === undefined || alpha > 100) {
    var rgb2 = hexRGB(col);
    var hi = [Math.min(255, rgb2[0] + 50), Math.min(255, rgb2[1] + 50), Math.min(255, rgb2[2] + 50)];
    fill(hi[0], hi[1], hi[2], 160);
    rect(px + inset, py + inset, cellSize - inset * 2, cellSize * 0.18, cellSize * 0.12);
  }
}

function drawSettled() {
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (grid[r][c]) drawCell(c, r, grid[r][c] - 1);
    }
  }
}

function drawFallingPiece(elapsed) {
  var t = Math.min(1, elapsed / FALL_DURATION);
  var et = t * t;                    // 下落 ease in（加速）
  var rt = Math.min(1, t * 1.6);     // 旋轉提早完成（~62% 時轉到位）
  var etRot = 1 - Math.pow(1 - rt, 2); // ease out for rotation

  var sc = currentPiece.spawnCenter, tc = currentPiece.targetCenter;
  var cx = sc.x + (tc.x - sc.x) * et;
  var cy = sc.y + (tc.y - sc.y) * et;
  var angle = etRot * currentPiece.targetRot * Math.PI / 2;

  drawGhost();

  // 以 base shape + canvas transform 漸進旋轉
  var baseShape = currentPiece.baseShape;
  var bh = baseShape.length, bw = baseShape[0].length;
  var inset = Math.max(1, cellSize * 0.06);
  var col = pal.colors[currentPiece.color];
  var rgb = hexRGB(col);
  var hi = [Math.min(255, rgb[0]+50), Math.min(255, rgb[1]+50), Math.min(255, rgb[2]+50)];

  push();
  translate(mgnX + cx * cellSize, mgnY + cy * cellSize);
  rotate(angle);
  for (var r = 0; r < bh; r++) {
    for (var c = 0; c < bw; c++) {
      if (!baseShape[r][c]) continue;
      var ox = (c - bw / 2) * cellSize;
      var oy = (r - bh / 2) * cellSize;
      noStroke();
      fill(col);
      rect(ox + inset, oy + inset, cellSize - inset*2, cellSize - inset*2, cellSize * 0.12);
      fill(hi[0], hi[1], hi[2], 160);
      rect(ox + inset, oy + inset, cellSize - inset*2, cellSize * 0.18, cellSize * 0.12);
    }
  }
  pop();
}

function drawGhost() {
  // 預覽：piece 在 targetY 的虛影
  for (var r = 0; r < currentPiece.shape.length; r++) {
    for (var c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        var gy = currentPiece.targetY + r;
        if (gy < 0) continue;
        drawCell(currentPiece.x + c, gy, currentPiece.color, 40);
      }
    }
  }
}

function drawFloatCell(x, y, colorIdx) {
  var col = pal.colors[colorIdx];
  noStroke();
  fill(col);
  var px = mgnX + x * cellSize;
  var py = mgnY + y * cellSize;
  var inset = Math.max(1, cellSize * 0.06);
  rect(px + inset, py + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.12);
  // 高光
  var rgb = hexRGB(col);
  var hi = [Math.min(255, rgb[0] + 50), Math.min(255, rgb[1] + 50), Math.min(255, rgb[2] + 50)];
  fill(hi[0], hi[1], hi[2], 160);
  rect(px + inset, py + inset, cellSize - inset * 2, cellSize * 0.18, cellSize * 0.12);
}

function drawClearFlash(elapsed) {
  var t = Math.min(1, elapsed / CLEAR_DURATION);
  var flash = pal.flash;
  var rgb = hexRGB(flash);
  // 強度：0 → 1 → 0
  var alpha = Math.sin(t * Math.PI) * 255;
  noStroke();
  fill(rgb[0], rgb[1], rgb[2], alpha);
  for (var i = 0; i < clearingRows.length; i++) {
    var py = mgnY + clearingRows[i] * cellSize;
    rect(mgnX, py, cellSize * COLS, cellSize);
  }
}

function drawPreview() {
  if (!nextPieceType) return;
  var pieceColor = PIECES[nextPieceType].color;
  var baseShape = PIECES[nextPieceType].shape;
  var boxW = PREVIEW_CELLS * cellSize;
  var boxH = PREVIEW_CELLS * cellSize;

  // 框
  noStroke();
  fill(pal.grid);
  rect(previewX - 4, previewY - 4, boxW + 8, boxH + 8, 6);
  fill(pal.bg);
  rect(previewX, previewY, boxW, boxH);

  // 標題 "NEXT"
  fill(pal.colors[pieceColor]);
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  textSize(Math.max(11, cellSize * 0.45));
  text("NEXT", previewX, previewY - 4);

  // 居中畫下一個方塊
  var pieceH = baseShape.length;
  var pieceW = baseShape[0].length;
  var offsetX = previewX + (boxW - pieceW * cellSize) / 2;
  var offsetY = previewY + (boxH - pieceH * cellSize) / 2;

  var col = pal.colors[pieceColor];
  var rgb = hexRGB(col);
  var hi = [Math.min(255, rgb[0] + 50), Math.min(255, rgb[1] + 50), Math.min(255, rgb[2] + 50)];
  var inset = Math.max(1, cellSize * 0.06);

  for (var r = 0; r < baseShape.length; r++) {
    for (var c = 0; c < baseShape[r].length; c++) {
      if (!baseShape[r][c]) continue;
      var px = offsetX + c * cellSize;
      var py = offsetY + r * cellSize;
      noStroke();
      fill(col);
      rect(px + inset, py + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.12);
      fill(hi[0], hi[1], hi[2], 160);
      rect(px + inset, py + inset, cellSize - inset * 2, cellSize * 0.18, cellSize * 0.12);
    }
  }
}

function drawHud() {
  noStroke();
  var fs = Math.max(11, cellSize * 0.45);
  textStyle(BOLD);
  textSize(fs);
  textAlign(LEFT, BOTTOM);
  fill(pal.colors[0]);
  text("AUTO TETRIS", mgnX, mgnY - 4);

  // palette 名稱跟在標題右邊
  textStyle(NORMAL);
  textSize(fs * 0.7);
  fill(180);
  var titleW = textWidth("AUTO TETRIS");  // 重新量
  textStyle(BOLD); textSize(fs);
  titleW = textWidth("AUTO TETRIS");
  textStyle(NORMAL); textSize(fs * 0.7);
  text("· " + pal.name, mgnX + titleW + 8, mgnY - 6);

  // Stats 顯示在 preview 下方
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(fs * 0.85);
  fill(180);
  var statsY = previewY + PREVIEW_CELLS * cellSize + cellSize * 0.6;
  text("PIECES", previewX, statsY);
  textStyle(NORMAL);
  fill(pal.colors[0]);
  textSize(fs * 1.1);
  text(stats.pieces, previewX, statsY + fs * 0.95);

  textStyle(BOLD);
  textSize(fs * 0.85);
  fill(180);
  text("LINES", previewX, statsY + fs * 2.3);
  textStyle(NORMAL);
  fill(pal.colors[1] || pal.colors[0]);
  textSize(fs * 1.1);
  text(stats.lines, previewX, statsY + fs * 3.25);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function keyPressed() {
  if (key === " ") newPalette();
  if (key === "s" || key === "S") doSave();
  if (key === "+" || key === "=") toggleSpeed();
}
