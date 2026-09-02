// ============================================
// Eight Queens - Interactive Puzzle
// 點擊棋盤放置一個皇后，自動算出合法的 8 皇后解
// ============================================

const N = 8;
let cellSize;
let boardX, boardY; // 棋盤左上角
let queens = []; // 解答：queens[row] = col
let fixedRow = -1; // 使用者放置的那一列
let fixedCol = -1;
let solved = false;
let noSolution = false;
let attackCells = []; // 被攻擊的格子（用於視覺化）
let animQueens = []; // 動畫用：逐個顯示皇后
let animIndex = 0;
let animTimer = 0;
let hoverRow = -1;
let hoverCol = -1;

// 配色
const DARK_CELL = '#769656';
const LIGHT_CELL = '#eeeed2';
const QUEEN_COLOR = '#2c2c2c';
const FIXED_QUEEN_COLOR = '#e94560';
const BG_COLOR = '#1a1a2e';
const TEXT_COLOR = '#e0e0e0';
const HOVER_COLOR = '#ffff0033';
const ATTACK_OVERLAY = [233, 69, 96, 45]; // 統一紅色半透明
const FIXED_CELL_COLOR = '#f6f66688'; // 黃色：使用者放的格

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);
  textFont('serif');
  recalcLayout();
  noLoop();
  redraw();
}

function recalcLayout() {
  const size = min(width, height);
  cellSize = size * 0.09;
  const boardSize = cellSize * N;
  boardX = (width - boardSize) / 2;
  boardY = (height - boardSize) / 2 + cellSize * 0.3;
}

function draw() {
  background(BG_COLOR);

  drawTitle();
  drawBoard();

  if (solved && animQueens.length > 0) {
    drawAttackZones();
    drawQueens();
  } else if (noSolution) {
    drawNoSolution();
  } else if (!solved) {
    drawHover();
    drawPrompt();
  }

  drawCoordinates();
}

function drawTitle() {
  fill(TEXT_COLOR);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.45);
  textStyle(BOLD);
  text('Eight Queens', width / 2, boardY - cellSize * 1.0);
  textStyle(NORMAL);
  textSize(cellSize * 0.22);
  fill('#888');
  if (solved) {
    text('Click anywhere to reset', width / 2, boardY - cellSize * 0.55);
  }
}

function drawPrompt() {
  fill('#888');
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.22);
  text('Click a cell to place the first queen', width / 2, boardY + cellSize * N + cellSize * 0.55);
}

function drawNoSolution() {
  fill('#e94560');
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.28);
  text('No solution with queen at this position — click to retry', width / 2, boardY + cellSize * N + cellSize * 0.55);
}

function drawBoard() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = boardX + c * cellSize;
      const y = boardY + r * cellSize;
      const isLight = (r + c) % 2 === 0;
      fill(isLight ? LIGHT_CELL : DARK_CELL);
      noStroke();
      rect(x, y, cellSize, cellSize);
    }
  }

  // 棋盤外框
  noFill();
  stroke('#444');
  strokeWeight(2);
  rect(boardX, boardY, cellSize * N, cellSize * N);
}

function drawCoordinates() {
  fill('#666');
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.2);
  textStyle(NORMAL);
  const labels = 'abcdefgh';
  for (let c = 0; c < N; c++) {
    // 底部字母
    text(labels[c], boardX + c * cellSize + cellSize / 2, boardY + cellSize * N + cellSize * 0.3);
  }
  for (let r = 0; r < N; r++) {
    // 左側數字
    text(N - r, boardX - cellSize * 0.3, boardY + r * cellSize + cellSize / 2);
  }
}

function drawHover() {
  if (solved || hoverRow < 0 || hoverCol < 0) return;
  const x = boardX + hoverCol * cellSize;
  const y = boardY + hoverRow * cellSize;
  fill(HOVER_COLOR);
  noStroke();
  rect(x, y, cellSize, cellSize);
}

function drawAttackZones() {
  // 計算每格被幾個皇后攻擊
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let count = 0;
      for (const q of animQueens) {
        if (r === q.row && c === q.col) { count = 0; break; } // 皇后本身不染色
        if (r === q.row || c === q.col || Math.abs(r - q.row) === Math.abs(c - q.col)) {
          count++;
        }
      }
      if (count > 0) {
        const x = boardX + c * cellSize;
        const y = boardY + r * cellSize;
        noStroke();
        // 重疊越多越深
        const a = min(ATTACK_OVERLAY[3] * count, 160);
        fill(ATTACK_OVERLAY[0], ATTACK_OVERLAY[1], ATTACK_OVERLAY[2], a);
        rect(x, y, cellSize, cellSize);
      }
    }
  }

  // 高亮使用者放置的格子
  if (fixedRow >= 0) {
    const x = boardX + fixedCol * cellSize;
    const y = boardY + fixedRow * cellSize;
    fill(FIXED_CELL_COLOR);
    noStroke();
    rect(x, y, cellSize, cellSize);
  }
}

function drawQueens() {
  for (let i = 0; i < animQueens.length; i++) {
    const q = animQueens[i];
    const x = boardX + q.col * cellSize + cellSize / 2;
    const y = boardY + q.row * cellSize + cellSize / 2;
    const isFixed = q.row === fixedRow && q.col === fixedCol;

    // 皇后底座陰影
    fill(0, 0, 0, 40);
    noStroke();
    ellipse(x + 2, y + 2, cellSize * 0.7, cellSize * 0.7);

    // 繪製皇后符號
    textAlign(CENTER, CENTER);
    textSize(cellSize * 0.65);
    fill(isFixed ? FIXED_QUEEN_COLOR : QUEEN_COLOR);
    text('♛', x, y - cellSize * 0.03);
  }
}

// ===== 求解 =====

function solve(fixR, fixC) {
  queens = new Array(N).fill(-1);
  queens[fixR] = fixC;
  if (backtrack(0, fixR)) {
    return true;
  }
  return false;
}

function backtrack(row, skipRow) {
  if (row === N) return true;
  if (row === skipRow) return backtrack(row + 1, skipRow);

  for (let col = 0; col < N; col++) {
    if (isValid(row, col)) {
      queens[row] = col;
      if (backtrack(row + 1, skipRow)) return true;
      queens[row] = -1;
    }
  }
  return false;
}

function isValid(row, col) {
  for (let r = 0; r < N; r++) {
    if (queens[r] === -1) continue;
    if (r === row) continue;
    const c = queens[r];
    if (c === col) return false;
    if (Math.abs(r - row) === Math.abs(c - col)) return false;
  }
  return true;
}

// ===== 動畫 =====

function startAnimation() {
  animQueens = [];
  animIndex = 0;

  // 先放使用者的皇后，再按列順序放其他的
  const order = [{ row: fixedRow, col: fixedCol }];
  for (let r = 0; r < N; r++) {
    if (r !== fixedRow) {
      order.push({ row: r, col: queens[r] });
    }
  }

  let i = 0;
  const timer = setInterval(() => {
    if (i >= order.length) {
      clearInterval(timer);
      return;
    }
    animQueens.push(order[i]);
    i++;
    redraw();
  }, 350);
}

// ===== 互動 =====

function mouseMoved() {
  const mx = mouseX - boardX;
  const my = mouseY - boardY;
  const newCol = floor(mx / cellSize);
  const newRow = floor(my / cellSize);

  if (newCol >= 0 && newCol < N && newRow >= 0 && newRow < N) {
    if (newRow !== hoverRow || newCol !== hoverCol) {
      hoverRow = newRow;
      hoverCol = newCol;
      redraw();
    }
  } else if (hoverRow >= 0) {
    hoverRow = -1;
    hoverCol = -1;
    redraw();
  }
}

function mousePressed() {
  // 已解完：點擊任意處重設
  if (solved || noSolution) {
    solved = false;
    noSolution = false;
    queens = [];
    animQueens = [];
    fixedRow = -1;
    fixedCol = -1;
    redraw();
    return;
  }

  const mx = mouseX - boardX;
  const my = mouseY - boardY;
  const col = floor(mx / cellSize);
  const row = floor(my / cellSize);

  if (col < 0 || col >= N || row < 0 || row >= N) return;

  fixedRow = row;
  fixedCol = col;

  if (solve(row, col)) {
    solved = true;
    noSolution = false;
    startAnimation();
  } else {
    solved = false;
    noSolution = true;
    redraw();
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

function touchMoved() {
  return false;
}

function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  recalcLayout();
  redraw();
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas(`eight-queens-${Date.now()}`, 'png');
  }
  if (key === ' ') {
    solved = false;
    noSolution = false;
    queens = [];
    animQueens = [];
    fixedRow = -1;
    fixedCol = -1;
    redraw();
  }
}
