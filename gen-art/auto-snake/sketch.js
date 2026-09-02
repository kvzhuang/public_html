// ============================================
// Auto Snake — AI 自動玩貪吃蛇 gen-art
// AI: BFS 找食物 + tail-reachability safety check
// 不安全 → fallback BFS 追尾巴繞圈拖時間
// 死亡 → 動畫 + 重生（換 palette）
// ============================================

var COLS = 16, ROWS = 26;
var cellSize, originX, originY, canvasW, canvasH;
var snake = [];          // [{r, c}], snake[0] = head
var dirCur = { dr: 0, dc: 1 };
var food = null;
var palette;
var stats = { score: 0, longest: 3, foodsEaten: 0, runs: 1 };
var particles = [];
var stepInterval = 80;
var lastStep = 0;
var phase = "running";   // "running" | "dying" | "spawning"
var phaseStart = 0;
var deathHead = null;

var DIRS = [
  { dr: -1, dc:  0 },   // 0: up
  { dr:  0, dc:  1 },   // 1: right
  { dr:  1, dc:  0 },   // 2: down
  { dr:  0, dc: -1 }    // 3: left
];

var PALETTES = [
  { name: "Classic", bg: "#0a1a0a", grid: "#142214",
    body: ["#3DDC97", "#06D6A0", "#118AB2"], head: "#FFFFFF",
    food: "#FF4757", foodGlow: "#FFA502" },
  { name: "Neon", bg: "#080010", grid: "#180024",
    body: ["#FF006E", "#8338EC", "#3A86FF"], head: "#FFFF00",
    food: "#FFFFFF", foodGlow: "#FF006E" },
  { name: "Ocean", bg: "#02101a", grid: "#0c2030",
    body: ["#48BFE3", "#5390D9", "#7400B8"], head: "#FFFFFF",
    food: "#FFD166", foodGlow: "#06D6A0" },
  { name: "Pastel", bg: "#1f1428", grid: "#2a1f36",
    body: ["#FFB4A2", "#E5989B", "#B5838D"], head: "#FFF1E6",
    food: "#A1C9F4", foodGlow: "#FFB347" },
  { name: "Sunset", bg: "#1a0a14", grid: "#2a1424",
    body: ["#FFBE0B", "#FB5607", "#FF006E"], head: "#FFFFFF",
    food: "#06D6A0", foodGlow: "#FFBE0B" },
  { name: "Mono", bg: "#0d0d0d", grid: "#1d1d1d",
    body: ["#FFFFFF", "#cccccc", "#999999"], head: "#FFD700",
    food: "#FF0000", foodGlow: "#FFFFFF" },
];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("snake-container");

  document.getElementById("btn-new").onclick = function() { newRun(true); };
  document.getElementById("btn-speed").onclick = toggleSpeed;
  document.getElementById("btn-new").ontouchend = function(e){ e.preventDefault(); newRun(true); };
  document.getElementById("btn-speed").ontouchend = function(e){ e.preventDefault(); toggleSpeed(); };

  newRun(true);
}

function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  var cell = Math.floor(Math.min(availW / (COLS + 1), availH / (ROWS + 2.5)));
  if (cell < 12) cell = 12;
  cellSize = cell;
  canvasW = cell * (COLS + 1);
  canvasH = cell * (ROWS + 2.5);
  originX = (canvasW - cell * COLS) / 2;
  originY = cell * 1.5;
}

function windowResized() { applyDims(); resizeCanvas(canvasW, canvasH); }

function toggleSpeed() {
  if (stepInterval >= 160) stepInterval = 30;
  else if (stepInterval >= 80) stepInterval = 160;
  else if (stepInterval >= 50) stepInterval = 80;
  else stepInterval = 50;
  var btn = document.getElementById("btn-speed");
  btn.textContent = "Speed " + (stepInterval >= 160 ? "Slow" : stepInterval >= 80 ? "Normal" : stepInterval >= 50 ? "Fast" : "Turbo");
}

function newRun(newPalette) {
  if (newPalette) palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  document.body.style.background = palette.bg;
  setButtonBg(document.getElementById("btn-new"), palette.body[0]);
  // 蛇從中間出生，3 節向右
  var mr = Math.floor(ROWS / 2);
  var mc = Math.floor(COLS / 2);
  snake = [
    { r: mr, c: mc },
    { r: mr, c: mc - 1 },
    { r: mr, c: mc - 2 }
  ];
  dirCur = { dr: 0, dc: 1 };
  stats.score = 0;
  particles = [];
  phase = "running";
  phaseStart = millis();
  lastStep = millis();
  spawnFood();
}

function spawnFood() {
  var empty = [];
  var occ = snakeKeys();
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!occ.has(r * 100 + c)) empty.push({ r: r, c: c });
    }
  }
  if (empty.length === 0) {
    food = null;  // 蛇填滿了整個格子！罕見大成就
    return;
  }
  food = empty[Math.floor(Math.random() * empty.length)];
  food.spawnTime = millis();
}

function snakeKeys() {
  var s = new Set();
  for (var i = 0; i < snake.length; i++) s.add(snake[i].r * 100 + snake[i].c);
  return s;
}

// ── AI ─────────────────────────────────────────────────────────────────────

function aiNextDir() {
  // 嚴格規則：head 撞到 body 任一格（含尾巴）就死，所以 bodyBlocked 一律包含尾巴
  var blocked = bodyBlocked();

  // 1. 試 BFS 直達食物 + safety check（吃完後仍能 BFS 到尾巴）
  var pathToFood = bfs(snake[0], food, blocked);
  if (pathToFood && pathToFood.length > 1 && isSafePath(pathToFood)) {
    return dirFromTo(snake[0], pathToFood[1]);
  }

  // 2. 「貪心安全」fallback：列舉 4 個鄰格，挑「安全且距食物最近」的
  // → 不再死死黏著尾巴繞圈，會主動往食物方向探索
  var bestDir = null, bestScore = -Infinity;
  for (var i = 0; i < 4; i++) {
    var d = DIRS[i];
    var n = { r: snake[0].r + d.dr, c: snake[0].c + d.dc };
    if (!cellInBounds(n)) continue;
    if (bodyContains(n)) continue;
    if (!isMoveSafe(n)) continue;
    var dist = Math.abs(n.r - food.r) + Math.abs(n.c - food.c);
    var score = -dist + Math.random() * 0.3;  // 微擾動避免死鎖
    if (score > bestScore) { bestScore = score; bestDir = d; }
  }
  if (bestDir) return bestDir;

  // 3. 最後手段：任何不會立刻碰 body 的方向（可能間接陷入死路）
  for (var j = 0; j < 4; j++) {
    var d2 = DIRS[j];
    var n2 = { r: snake[0].r + d2.dr, c: snake[0].c + d2.dc };
    if (cellInBounds(n2) && !bodyContains(n2)) return d2;
  }
  return null;  // 無路可走
}

// 嚴格規則下，任何 body cell（包含 tail）都是 blocked
function bodyBlocked() {
  var s = new Set();
  for (var i = 0; i < snake.length; i++) s.add(snake[i].r * 100 + snake[i].c);
  return s;
}

function bodyContains(p) {
  for (var i = 0; i < snake.length; i++) {
    if (snake[i].r === p.r && snake[i].c === p.c) return true;
  }
  return false;
}

// 模擬移動到 newHead 之後，head 能否 BFS 到尾巴（heuristic：尾巴會移開）
function isMoveSafe(newHead) {
  var future = snake.slice();
  future.unshift({ r: newHead.r, c: newHead.c });
  if (newHead.r === food.r && newHead.c === food.c) {
    // 吃到了，尾巴不移
  } else {
    future.pop();
  }
  var h = future[0];
  var t = future[future.length - 1];
  var b = new Set();
  for (var j = 1; j < future.length - 1; j++) b.add(future[j].r * 100 + future[j].c);
  return bfs(h, t, b) !== null;
}

function cellInBounds(p) {
  return p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS;
}

function bfs(start, goal, blocked) {
  if (!start || !goal) return null;
  var queue = [start];
  var parents = new Map();
  parents.set(start.r * 100 + start.c, null);
  while (queue.length > 0) {
    var cur = queue.shift();
    if (cur.r === goal.r && cur.c === goal.c) {
      var path = [];
      var k = cur.r * 100 + cur.c;
      while (k !== null) {
        var r = Math.floor(k / 100), c = k % 100;
        path.unshift({ r: r, c: c });
        k = parents.get(k);
      }
      return path;
    }
    for (var i = 0; i < 4; i++) {
      var d = DIRS[i];
      var n = { r: cur.r + d.dr, c: cur.c + d.dc };
      if (!cellInBounds(n)) continue;
      var nk = n.r * 100 + n.c;
      if (parents.has(nk)) continue;
      // 終點可以是 blocked（如果終點就是 goal）
      if (blocked.has(nk) && !(n.r === goal.r && n.c === goal.c)) continue;
      parents.set(nk, cur.r * 100 + cur.c);
      queue.push(n);
    }
  }
  return null;
}

function isSafePath(path) {
  // 模擬：依 path 走，吃下 food 後檢查能否從 head 到 tail
  var future = snake.slice();
  for (var i = 1; i < path.length; i++) {
    var head = path[i];
    future.unshift({ r: head.r, c: head.c });
    if (head.r === food.r && head.c === food.c) {
      // 吃到了：不丟尾巴
    } else {
      future.pop();
    }
  }
  // future[0] = head, future[last] = tail
  var newHead = future[0];
  var newTail = future[future.length - 1];
  var futureBlocked = new Set();
  for (var j = 1; j < future.length - 1; j++) {
    futureBlocked.add(future[j].r * 100 + future[j].c);
  }
  return bfs(newHead, newTail, futureBlocked) !== null;
}

function dirFromTo(a, b) {
  return { dr: b.r - a.r, dc: b.c - a.c };
}

// ── Game step ──────────────────────────────────────────────────────────────

function tick() {
  if (phase !== "running") return;
  if (!food) {
    // 蛇填滿全格 → 大勝利重生
    newRun(true);
    stats.runs++;
    return;
  }
  var d = aiNextDir();
  if (!d) {
    die();
    return;
  }
  dirCur = d;
  var newHead = { r: snake[0].r + d.dr, c: snake[0].c + d.dc };
  // 撞牆 / 撞自己（含尾巴）→ 死
  if (!cellInBounds(newHead)) { die(); return; }
  // 嚴格規則：撞到任何身體（包含尾巴）都會結束
  for (var i = 0; i < snake.length; i++) {
    if (snake[i].r === newHead.r && snake[i].c === newHead.c) { die(); return; }
  }
  // 移動
  snake.unshift(newHead);
  if (newHead.r === food.r && newHead.c === food.c) {
    // 吃到
    stats.score++;
    stats.foodsEaten++;
    if (snake.length > stats.longest) stats.longest = snake.length;
    spawnEatParticles(newHead);
    spawnFood();
  } else {
    snake.pop();
  }
}

function die() {
  phase = "dying";
  phaseStart = millis();
  deathHead = { r: snake[0].r, c: snake[0].c };
  // 死亡粒子
  for (var i = 0; i < 20; i++) {
    var ang = Math.random() * Math.PI * 2;
    var sp = 1 + Math.random() * 2.5;
    particles.push({
      x: cellCenterX(deathHead.c),
      y: cellCenterY(deathHead.r),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 30 + Math.random() * 20,
      maxLife: 40,
      color: palette.body[i % palette.body.length]
    });
  }
  stats.runs++;
}

function spawnEatParticles(cell) {
  for (var i = 0; i < 10; i++) {
    var ang = Math.random() * Math.PI * 2;
    var sp = 1 + Math.random() * 1.8;
    particles.push({
      x: cellCenterX(cell.c),
      y: cellCenterY(cell.r),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 20 + Math.random() * 15,
      maxLife: 30,
      color: palette.food
    });
  }
}

function cellCenterX(c) { return originX + c * cellSize + cellSize / 2; }
function cellCenterY(r) { return originY + r * cellSize + cellSize / 2; }

// ── Draw ───────────────────────────────────────────────────────────────────

function draw() {
  background(palette.bg);

  // 推進
  if (phase === "running") {
    if (millis() - lastStep > stepInterval) {
      tick();
      lastStep = millis();
    }
  } else if (phase === "dying") {
    if (millis() - phaseStart > 1200) {
      newRun(true);
    }
  }

  drawField();
  drawGridLines();
  if (food && phase === "running") drawFood();
  drawSnake();
  updateAndDrawParticles();
  drawHud();
}

function drawField() {
  noStroke();
  fill(palette.grid);
  rect(originX - 4, originY - 4, cellSize * COLS + 8, cellSize * ROWS + 8, 8);
  fill(palette.bg);
  rect(originX, originY, cellSize * COLS, cellSize * ROWS);
}

function drawGridLines() {
  stroke(palette.grid);
  strokeWeight(1);
  for (var c = 1; c < COLS; c++) line(originX + c * cellSize, originY, originX + c * cellSize, originY + ROWS * cellSize);
  for (var r = 1; r < ROWS; r++) line(originX, originY + r * cellSize, originX + COLS * cellSize, originY + r * cellSize);
  noStroke();
}

function drawFood() {
  var x = cellCenterX(food.c);
  var y = cellCenterY(food.r);
  var pulseT = (millis() - (food.spawnTime || 0)) * 0.005;
  var pulse = 1 + Math.sin(pulseT) * 0.10;
  var rgb = hexRGB(palette.food);
  var glowRgb = hexRGB(palette.foodGlow);
  // 外暈
  noStroke();
  fill(glowRgb[0], glowRgb[1], glowRgb[2], 100);
  ellipse(x, y, cellSize * 1.4 * pulse, cellSize * 1.4 * pulse);
  // 本體
  fill(rgb[0], rgb[1], rgb[2]);
  ellipse(x, y, cellSize * 0.78 * pulse, cellSize * 0.78 * pulse);
  // 高光
  fill(255, 255, 255, 180);
  ellipse(x - cellSize * 0.15, y - cellSize * 0.15, cellSize * 0.18, cellSize * 0.18);
}

function drawSnake() {
  for (var i = 0; i < snake.length; i++) {
    var s = snake[i];
    var t = i / Math.max(1, snake.length - 1);
    var col = lerpBodyColor(t);
    drawSegment(s.r, s.c, col, i === 0);
  }
  // 死亡頭部閃爍
  if (phase === "dying" && deathHead) {
    var flash = Math.floor((millis() - phaseStart) / 100) % 2;
    if (flash) {
      var x = cellCenterX(deathHead.c);
      var y = cellCenterY(deathHead.r);
      noStroke();
      fill(255, 80, 80, 200);
      rect(x - cellSize * 0.4, y - cellSize * 0.4, cellSize * 0.8, cellSize * 0.8, cellSize * 0.18);
    }
  }
}

function lerpBodyColor(t) {
  // body[0] head-side, body[2] tail-side
  var c = palette.body;
  if (t < 0.5) {
    var u = t * 2;
    return mixHex(c[0], c[1], u);
  } else {
    var u2 = (t - 0.5) * 2;
    return mixHex(c[1], c[2], u2);
  }
}

function drawSegment(r, c, color, isHead) {
  var x = originX + c * cellSize;
  var y = originY + r * cellSize;
  var inset = Math.max(1, cellSize * 0.10);
  var rgb = hexRGB(color);
  noStroke();
  fill(rgb[0], rgb[1], rgb[2]);
  rect(x + inset, y + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.22);
  // 高光
  var hi = [Math.min(255, rgb[0] + 60), Math.min(255, rgb[1] + 60), Math.min(255, rgb[2] + 60)];
  fill(hi[0], hi[1], hi[2], 160);
  rect(x + inset, y + inset, cellSize - inset * 2, cellSize * 0.22, cellSize * 0.22);

  if (isHead) {
    // 眼睛
    var headRgb = hexRGB(palette.head);
    var eyeR = cellSize * 0.09;
    var off = cellSize * 0.18;
    var ex1, ey1, ex2, ey2;
    if (dirCur.dr === -1) { ex1 = x + cellSize / 2 - off; ex2 = x + cellSize / 2 + off; ey1 = y + cellSize / 2 - off * 0.6; ey2 = ey1; }
    else if (dirCur.dr === 1) { ex1 = x + cellSize / 2 - off; ex2 = x + cellSize / 2 + off; ey1 = y + cellSize / 2 + off * 0.6; ey2 = ey1; }
    else if (dirCur.dc === 1) { ex1 = x + cellSize / 2 + off * 0.6; ex2 = ex1; ey1 = y + cellSize / 2 - off; ey2 = y + cellSize / 2 + off; }
    else { ex1 = x + cellSize / 2 - off * 0.6; ex2 = ex1; ey1 = y + cellSize / 2 - off; ey2 = y + cellSize / 2 + off; }
    fill(headRgb[0], headRgb[1], headRgb[2]);
    ellipse(ex1, ey1, eyeR * 2, eyeR * 2);
    ellipse(ex2, ey2, eyeR * 2, eyeR * 2);
    fill(0);
    ellipse(ex1, ey1, eyeR * 0.9, eyeR * 0.9);
    ellipse(ex2, ey2, eyeR * 0.9, eyeR * 0.9);
  }
}

function updateAndDrawParticles() {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= 1;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    var a = p.life / p.maxLife;
    var rgb = hexRGB(p.color);
    noStroke();
    fill(rgb[0], rgb[1], rgb[2], 220 * a);
    ellipse(p.x, p.y, 4 * a + 1, 4 * a + 1);
  }
}

function drawHud() {
  noStroke();
  fill(palette.body[0]);
  textAlign(LEFT, BOTTOM);
  textStyle(BOLD);
  var fs = Math.max(11, cellSize * 0.5);
  textSize(fs);
  text("AUTO SNAKE", originX, originY - 6);
  textStyle(NORMAL);
  textSize(fs * 0.65);
  fill(180);
  text(palette.name, originX + textWidth("AUTO SNAKE ") + 4, originY - 6);
  // 右上
  textAlign(RIGHT, BOTTOM);
  textStyle(BOLD);
  textSize(fs * 0.85);
  fill(palette.food);
  text("SCORE " + stats.score, originX + COLS * cellSize, originY - 6);

  // 底部
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  textSize(fs * 0.65);
  fill(160);
  var by = originY + ROWS * cellSize + cellSize * 0.4;
  text("LEN " + snake.length + "   LONGEST " + stats.longest + "   FOODS " + stats.foodsEaten + "   RUNS " + stats.runs,
       originX, by);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// 依背景亮度自動挑文字色（W3C luminance 公式）
function setButtonBg(btn, bgHex) {
  btn.style.background = bgHex;
  var rgb = hexRGB(bgHex);
  var lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  btn.style.color = lum > 0.55 ? "#111" : "#fff";
  // 加細邊提升對比
  btn.style.boxShadow = lum > 0.55
    ? "inset 0 0 0 1px rgba(0,0,0,0.15)"
    : "inset 0 0 0 1px rgba(255,255,255,0.20)";
}

function mixHex(h1, h2, t) {
  var a = hexRGB(h1), b = hexRGB(h2);
  return rgbToHex(
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  );
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(function(v) { return v.toString(16).padStart(2, "0"); }).join("");
}

function keyPressed() {
  if (key === " " || key === "n" || key === "N") newRun(true);
  if (key === "+" || key === "=") toggleSpeed();
}
