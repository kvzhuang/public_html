// ============================================
// Dynamic Programming - Minimum Path Sum
// 視覺化 DP 填表過程與最佳路徑回溯
//
// 規則：從左上走到右下，每步只能往右或往下
// 目標：找出路徑上數字總和最小的走法
// ============================================

const GRID_N = 6;
let cellSize;
let gridX, gridY;

// 資料
let cost = [];    // cost[r][c] = 原始隨機成本
let dp = [];      // dp[r][c] = 到該格的最小成本
let from = [];    // from[r][c] = 'left' | 'top' | 'start'（回溯用）
let path = [];    // 最佳路徑 [{r,c}, ...]

// 動畫狀態
let fillOrder = [];   // DP 填表順序 [{r,c}, ...]
let fillIndex = 0;    // 目前動畫填到第幾格
let pathIndex = 0;    // 路徑回溯動畫
let phase = 'idle';   // 'idle' | 'filling' | 'tracing' | 'done'
let animInterval = null;

// 配色
const BG = '#0a0a0f';
const CELL_BASE = '#1e2a3a';
const CELL_BORDER = '#2a3a4a';
const COST_COLOR = '#8899aa';
const DP_COLOR = '#4fc3f7';
const FILL_ACTIVE = '#ffb74d';
const PATH_COLOR = '#4caf50';
const PATH_GLOW = '#81c78488';
const START_COLOR = '#4caf50';
const END_COLOR = '#ef5350';
const TEXT_LIGHT = '#e0e0e0';
const TEXT_DIM = '#556677';
const ARROW_COLOR = '#4caf5088';

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);
  textFont('monospace');
  recalcLayout();
  generateGrid();
  noLoop();
  redraw();
}

function recalcLayout() {
  const size = min(width, height);
  cellSize = size * 0.125;
  const total = cellSize * GRID_N;
  gridX = (width - total) / 2;
  gridY = (height - total) / 2 + cellSize * 0.6;
}

function generateGrid() {
  stopAnim();
  cost = [];
  dp = [];
  from = [];
  path = [];
  fillOrder = [];
  fillIndex = 0;
  pathIndex = 0;
  phase = 'idle';

  for (let r = 0; r < GRID_N; r++) {
    cost[r] = [];
    dp[r] = [];
    from[r] = [];
    for (let c = 0; c < GRID_N; c++) {
      cost[r][c] = floor(random(1, 20));
      dp[r][c] = -1;
      from[r][c] = '';
    }
  }

  // 預算 DP（但動畫會逐步揭露）
  computeDP();

  // 填表順序：逐列逐行（左到右、上到下）
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_N; c++) {
      fillOrder.push({ r, c });
    }
  }

  // 回溯最佳路徑
  tracePath();
}

function computeDP() {
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_N; c++) {
      if (r === 0 && c === 0) {
        dp[r][c] = cost[r][c];
        from[r][c] = 'start';
      } else if (r === 0) {
        dp[r][c] = dp[r][c - 1] + cost[r][c];
        from[r][c] = 'left';
      } else if (c === 0) {
        dp[r][c] = dp[r - 1][c] + cost[r][c];
        from[r][c] = 'top';
      } else {
        if (dp[r - 1][c] <= dp[r][c - 1]) {
          dp[r][c] = dp[r - 1][c] + cost[r][c];
          from[r][c] = 'top';
        } else {
          dp[r][c] = dp[r][c - 1] + cost[r][c];
          from[r][c] = 'left';
        }
      }
    }
  }
}

function tracePath() {
  path = [];
  let r = GRID_N - 1, c = GRID_N - 1;
  while (r >= 0 && c >= 0) {
    path.unshift({ r, c });
    if (from[r][c] === 'start') break;
    if (from[r][c] === 'top') r--;
    else c--;
  }
}

// ===== 繪製 =====

function draw() {
  background(BG);
  drawTitle();
  drawGrid();
  drawLegend();
}

function drawTitle() {
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(cellSize * 0.42);
  fill(TEXT_LIGHT);
  text('Dynamic Programming', width / 2, gridY - cellSize * 1.25);

  textStyle(NORMAL);
  textSize(cellSize * 0.23);
  fill(TEXT_DIM);
  text('Minimum Path Sum', width / 2, gridY - cellSize * 0.85);
  textSize(cellSize * 0.18);
  text('從左上到右下，每步只能往右或往下', width / 2, gridY - cellSize * 0.58);

  textSize(cellSize * 0.2);
  if (phase === 'idle') {
    fill('#888');
    text('點擊任意處開始 DP 填表動畫', width / 2, gridY - cellSize * 0.3);
  } else if (phase === 'done') {
    fill(PATH_COLOR);
    text(`最小路徑和 = ${dp[GRID_N - 1][GRID_N - 1]}　　點擊重新開始`, width / 2, gridY - cellSize * 0.3);
  } else if (phase === 'filling') {
    fill(FILL_ACTIVE);
    text('正在填 DP 表...', width / 2, gridY - cellSize * 0.3);
  } else if (phase === 'tracing') {
    fill(PATH_COLOR);
    text('回溯最佳路徑...', width / 2, gridY - cellSize * 0.3);
  }
}

function drawGrid() {
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_N; c++) {
      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;
      const idx = r * GRID_N + c;
      const revealed = idx < fillIndex;
      const isActive = idx === fillIndex - 1 && phase === 'filling';
      const onPath = phase === 'tracing' || phase === 'done'
        ? path.findIndex(p => p.r === r && p.c === c)
        : -1;
      const pathRevealed = onPath !== -1 && onPath < pathIndex;

      // 格子背景
      if (pathRevealed) {
        fill(PATH_GLOW);
      } else if (isActive) {
        fill('#3a2800');
      } else {
        fill(CELL_BASE);
      }
      stroke(CELL_BORDER);
      strokeWeight(1);
      rect(x, y, cellSize, cellSize, 3);

      // 起點 / 終點標記
      if (r === 0 && c === 0) {
        noStroke();
        fill(START_COLOR + '22');
        rect(x, y, cellSize, cellSize, 3);
      }
      if (r === GRID_N - 1 && c === GRID_N - 1) {
        noStroke();
        fill(END_COLOR + '22');
        rect(x, y, cellSize, cellSize, 3);
      }

      // 原始成本（左上角小字）
      noStroke();
      textAlign(LEFT, TOP);
      textSize(cellSize * 0.22);
      textStyle(NORMAL);
      fill(COST_COLOR);
      text(cost[r][c], x + cellSize * 0.07, y + cellSize * 0.05);

      // DP 值（中央大字）
      if (revealed) {
        textAlign(CENTER, CENTER);
        textSize(cellSize * 0.38);
        textStyle(BOLD);
        fill(isActive ? FILL_ACTIVE : (pathRevealed ? PATH_COLOR : DP_COLOR));
        text(dp[r][c], x + cellSize / 2, y + cellSize * 0.55);

        // 來源箭頭
        if (from[r][c] === 'left' || from[r][c] === 'top') {
          drawArrow(x, y, from[r][c], pathRevealed);
        }
      }
    }
  }

  // 起點/終點文字標記
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.18);
  textStyle(BOLD);
  fill(START_COLOR);
  text('START', gridX + cellSize / 2, gridY + cellSize * 0.92);
  fill(END_COLOR);
  text('END', gridX + (GRID_N - 0.5) * cellSize, gridY + (GRID_N - 1) * cellSize + cellSize * 0.92);
}

function drawArrow(x, y, dir, onPath) {
  const cx = x + cellSize / 2;
  const cy = y + cellSize * 0.15;
  const sz = cellSize * 0.1;

  noStroke();
  fill(onPath ? PATH_COLOR + 'aa' : ARROW_COLOR);

  if (dir === 'left') {
    // ← 箭頭
    triangle(x + cellSize * 0.02, cy, x + cellSize * 0.02 + sz, cy - sz * 0.7, x + cellSize * 0.02 + sz, cy + sz * 0.7);
  } else if (dir === 'top') {
    // ↑ 箭頭
    triangle(cx, y + cellSize * 0.02, cx - sz * 0.7, y + cellSize * 0.02 + sz, cx + sz * 0.7, y + cellSize * 0.02 + sz);
  }
}

function drawLegend() {
  const lx = gridX;
  const ly = gridY + cellSize * GRID_N + cellSize * 0.4;

  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  textSize(cellSize * 0.2);
  noStroke();

  // 成本
  fill(COST_COLOR);
  rect(lx, ly - 5, 12, 12, 2);
  fill(TEXT_DIM);
  text('格子成本', lx + 18, ly);

  // DP 值
  fill(DP_COLOR);
  rect(lx + cellSize * 1.8, ly - 5, 12, 12, 2);
  fill(TEXT_DIM);
  text('DP 最小累計', lx + cellSize * 1.8 + 18, ly);

  // 路徑
  fill(PATH_COLOR);
  rect(lx + cellSize * 4.0, ly - 5, 12, 12, 2);
  fill(TEXT_DIM);
  text('最佳路徑', lx + cellSize * 4.0 + 18, ly);

  // DP 公式
  const fy = ly + cellSize * 0.5;
  textSize(cellSize * 0.18);
  fill('#667788');
  textAlign(CENTER, CENTER);
  text('dp[r][c] = cost[r][c] + min( dp[r-1][c], dp[r][c-1] )', width / 2, fy);
}

// ===== 動畫控制 =====

function startFillAnim() {
  phase = 'filling';
  fillIndex = 0;
  pathIndex = 0;

  animInterval = setInterval(() => {
    fillIndex++;
    redraw();

    if (fillIndex >= fillOrder.length) {
      clearInterval(animInterval);
      // 填完後等一下再開始回溯
      setTimeout(() => startTraceAnim(), 500);
    }
  }, 100);
}

function startTraceAnim() {
  phase = 'tracing';
  pathIndex = 0;

  animInterval = setInterval(() => {
    pathIndex++;
    redraw();

    if (pathIndex >= path.length) {
      clearInterval(animInterval);
      animInterval = null;
      phase = 'done';
      redraw();
    }
  }, 250);
}

function stopAnim() {
  if (animInterval) {
    clearInterval(animInterval);
    animInterval = null;
  }
}

// ===== 互動 =====

function mousePressed() {
  if (phase === 'idle') {
    startFillAnim();
  } else if (phase === 'done') {
    generateGrid();
    redraw();
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  recalcLayout();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    stopAnim();
    generateGrid();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`dp-path-${Date.now()}`, 'png');
  }
}
