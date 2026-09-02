// ============================================
// Arrows Chain — Arrows GO! 風格的箭頭連鎖反應 gen-art
// 每關生成不同造型（圓、心、星、葡萄、letter、frame、scatter...）
// 每個箭頭智慧指向另一個箭頭，AI 找最長連鎖的起點，動畫清空關卡
// ============================================

var COLS = 14, ROWS = 22;
var cellSize, originX, originY, canvasW, canvasH;
var grid = [];
var palette;
var patternName = "";

// Phase state machine
// "generating" → "ready" → "chaining" (animate steps) → "fading" → loop
var phase = "generating";
var phaseStart = 0;
var chainSteps = [];       // 預先算好的步驟（按執行順序）
var chainStepIdx = 0;
var stepInterval = 130;    // ms per step
var lastStepTime = 0;
var clearedCells = new Set();
var fadingCells = [];      // {r, c, dir, color, startTime}
var stats = { totalChains: 0, longestChain: 0, currentChain: 0 };

// Particle effects for chain hits
var particles = [];

// ── Palettes ────────────────────────────────────────────────────────────────

var PALETTES = [
  { name: "Forest",
    bg: "#0f1f1a", grid: "#1a2f25",
    arrow: ["#7FB069", "#E9C46A", "#F4A261"],
    chain: "#FFEC8B", glow: "#FFD166", text: "#d8e8d8" },
  { name: "Ocean",
    bg: "#0a1a2a", grid: "#152a3f",
    arrow: ["#48BFE3", "#5BC0EB", "#A9DEF9"],
    chain: "#80FFDB", glow: "#5BC0EB", text: "#d0e8f0" },
  { name: "Sunset",
    bg: "#1f0a14", grid: "#2f1428",
    arrow: ["#FF6B9D", "#FF9F1C", "#FFBE0B"],
    chain: "#FFF0BA", glow: "#FF9F1C", text: "#f5d8e0" },
  { name: "Lavender",
    bg: "#160f25", grid: "#221c3a",
    arrow: ["#B388FF", "#FF6AD5", "#94D0FF"],
    chain: "#FFF0FF", glow: "#FF6AD5", text: "#e8d8ff" },
  { name: "Mono",
    bg: "#0d0d0d", grid: "#1d1d1d",
    arrow: ["#e8e8e8", "#b0b0b0", "#888888"],
    chain: "#FFFFFF", glow: "#FFFFFF", text: "#cccccc" },
  { name: "Citrus",
    bg: "#0a1a14", grid: "#152a20",
    arrow: ["#FFD166", "#06D6A0", "#06AED5"],
    chain: "#FFFFCC", glow: "#FFD166", text: "#d8e8d0" },
];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("arrows-container");

  document.getElementById("btn-new").onclick = newPuzzle;
  document.getElementById("btn-speed").onclick = toggleSpeed;
  document.getElementById("btn-new").ontouchend = function(e){ e.preventDefault(); newPuzzle(); };
  document.getElementById("btn-speed").ontouchend = function(e){ e.preventDefault(); toggleSpeed(); };

  newPuzzle();
}

function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  var cell = Math.floor(Math.min(availW / (COLS + 1), availH / (ROWS + 2)));
  if (cell < 12) cell = 12;
  cellSize = cell;
  canvasW = cell * (COLS + 1);
  canvasH = cell * (ROWS + 2);
  originX = (canvasW - cell * COLS) / 2;
  originY = cell * 1.2;
}

function windowResized() { applyDims(); resizeCanvas(canvasW, canvasH); }

function toggleSpeed() {
  if (stepInterval >= 250) stepInterval = 40;
  else if (stepInterval >= 130) stepInterval = 250;
  else if (stepInterval >= 70) stepInterval = 130;
  else stepInterval = 70;
  var btn = document.getElementById("btn-speed");
  btn.textContent = "Speed " + (stepInterval >= 250 ? "Slow" : stepInterval >= 130 ? "Normal" : stepInterval >= 70 ? "Fast" : "Turbo");
}

function newPuzzle() {
  palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  document.body.style.background = palette.bg;
  document.getElementById("btn-new").style.background = palette.arrow[0];

  // 14 種 pattern：10 個幾何造型 + 4 個自由模式（保底）
  var patterns = [
    { name: "circle",   fn: shapeCircle   },
    { name: "heart",    fn: shapeHeart    },
    { name: "star",     fn: shapeStar     },
    { name: "spiral",   fn: shapeSpiral   },
    { name: "grape",    fn: shapeGrape    },
    { name: "diamond",  fn: shapeDiamond  },
    { name: "frame",    fn: shapeFrame    },
    { name: "diagonal", fn: shapeDiagonal },
    { name: "letter",   fn: shapeLetter   },
    { name: "scatter",  fn: null          },  // 自由 snake
    { name: "sprawl",   fn: null          },
    { name: "compact",  fn: null          },
    { name: "border",   fn: null          },
    { name: "wander",   fn: null          }
  ];
  var pick = patterns[Math.floor(Math.random() * patterns.length)];

  var bestPath = [];
  if (pick.fn) {
    // 限定造型 cells 內走 snake
    var shapeCells = pick.fn();
    if (shapeCells.size < 8) {
      // 造型 cells 太少，fallback 自由 snake
      bestPath = pickBestFreeSnake();
    } else {
      for (var att = 0; att < 30; att++) {
        var p = buildSnakeInShape(shapeCells);
        if (p.length > bestPath.length) bestPath = p;
      }
      // 若造型約束導致 chain 太短，fallback 自由
      if (bestPath.length < 12) bestPath = pickBestFreeSnake();
    }
  } else {
    bestPath = buildSnake(pick.name);
    for (var att2 = 0; att2 < 4; att2++) {
      var p2 = buildSnake(pick.name);
      if (p2.length > bestPath.length) bestPath = p2;
    }
  }
  patternName = pick.name + " · N=" + bestPath.length;

  // Apply to grid
  grid = [];
  for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(null));
  for (var i = 0; i < bestPath.length; i++) {
    grid[bestPath[i].r][bestPath[i].c] = { dir: bestPath[i].dir };
  }

  // Chain 起點固定是 snake 的第一個 arrow（保證 N=N 全清）
  precomputeChain(bestPath[0].r, bestPath[0].c);
  phase = "chaining";
  phaseStart = millis();
  chainStepIdx = 0;
  lastStepTime = millis();
  clearedCells = new Set();
  fadingCells = [];
  particles = [];
  stats.totalChains++;
}

// Snake 構造：保證 chain 從 path[0] 開始可清空全部
function buildSnake(mode) {
  var path = [];
  var occupied = new Set();   // 已放箭頭的 cell
  var forbidden = new Set();  // 不能放未來箭頭的 cell（保護已建好的線段）

  // 起點
  var sr, sc;
  if (mode === "border") {
    var edge = Math.floor(Math.random() * 4);
    if (edge === 0) { sr = 0; sc = Math.floor(Math.random() * COLS); }
    else if (edge === 1) { sr = Math.floor(Math.random() * ROWS); sc = COLS - 1; }
    else if (edge === 2) { sr = ROWS - 1; sc = Math.floor(Math.random() * COLS); }
    else { sr = Math.floor(Math.random() * ROWS); sc = 0; }
  } else if (mode === "compact") {
    // 從中央附近開始
    sr = Math.floor(ROWS / 2) + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 3);
    sc = Math.floor(COLS / 2) + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 3);
  } else {
    sr = Math.floor(Math.random() * ROWS);
    sc = Math.floor(Math.random() * COLS);
  }
  path.push({ r: sr, c: sc, dir: -1 });
  occupied.add(sr * 1000 + sc);

  var maxLen = 90;
  for (var step = 1; step < maxLen; step++) {
    var prev = path[path.length - 1];
    var dirs = shuffleArr([0, 1, 2, 3]);
    var placed = false;
    for (var di = 0; di < 4; di++) {
      var d = dirs[di];
      var delta = dirDelta(d);
      var dr = delta[0], dc = delta[1];
      var candidates = [];
      var nr = prev.r + dr, nc = prev.c + dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        var key = nr * 1000 + nc;
        if (!occupied.has(key) && !forbidden.has(key)) {
          candidates.push({ r: nr, c: nc });
        }
        nr += dr; nc += dc;
      }
      if (candidates.length > 0) {
        // 依 mode 挑下一格
        var next;
        if (mode === "compact") {
          // 偏好近距離
          next = candidates[Math.floor(Math.random() * Math.min(2, candidates.length))];
        } else if (mode === "border") {
          // 偏好靠邊
          candidates.sort(function(a, b) {
            var aE = Math.min(a.r, ROWS - 1 - a.r, a.c, COLS - 1 - a.c);
            var bE = Math.min(b.r, ROWS - 1 - b.r, b.c, COLS - 1 - b.c);
            return aE - bE;
          });
          next = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
        } else if (mode === "wander") {
          // 偏好遠距離，跨度大
          next = candidates[candidates.length - 1 - Math.floor(Math.random() * Math.min(2, candidates.length))];
        } else {
          // sprawl: 隨機
          next = candidates[Math.floor(Math.random() * candidates.length)];
        }
        // 把 prev 到 next（不含 next）之間所有 cell 設為 forbidden
        var cr = prev.r + dr, cc = prev.c + dc;
        while (cr !== next.r || cc !== next.c) {
          forbidden.add(cr * 1000 + cc);
          cr += dr; cc += dc;
        }
        // 確定 prev 的方向、放 next
        prev.dir = d;
        path.push({ r: next.r, c: next.c, dir: -1 });
        occupied.add(next.r * 1000 + next.c);
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }
  // 最後一個 arrow 的方向隨意（chain 走到他時已無下一個）
  path[path.length - 1].dir = Math.floor(Math.random() * 4);
  return path;
}

function shuffleArr(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pickBestFreeSnake() {
  var best = [];
  var modes = ["sprawl", "compact", "wander"];
  for (var i = 0; i < 6; i++) {
    var p = buildSnake(modes[i % modes.length]);
    if (p.length > best.length) best = p;
  }
  return best;
}

// ── Shape-constrained snake ─────────────────────────────────────────────────
// 在指定的 shape cells 內走 snake，保證 chain 從 path[0] 開始可清空所有放下的箭頭

function buildSnakeInShape(shapeCells) {
  var path = [];
  var occupied = new Set();
  var forbidden = new Set();

  var list = Array.from(shapeCells);
  var startKey = list[Math.floor(Math.random() * list.length)];
  var sr = Math.floor(startKey / 1000);
  var sc = startKey % 1000;
  path.push({ r: sr, c: sc, dir: -1 });
  occupied.add(startKey);

  for (var step = 1; step < shapeCells.size; step++) {
    var prev = path[path.length - 1];
    var dirs = shuffleArr([0, 1, 2, 3]);
    var placed = false;
    for (var di = 0; di < 4; di++) {
      var d = dirs[di];
      var delta = dirDelta(d);
      var dr = delta[0], dc = delta[1];
      var candidates = [];
      var nr = prev.r + dr, nc = prev.c + dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        var key = nr * 1000 + nc;
        if (shapeCells.has(key) && !occupied.has(key) && !forbidden.has(key)) {
          candidates.push({ r: nr, c: nc, dist: Math.abs(nr - prev.r) + Math.abs(nc - prev.c) });
        }
        nr += dr; nc += dc;
      }
      if (candidates.length > 0) {
        // 偏好近距離（最大化造型 cell 覆蓋率）
        candidates.sort(function(a, b){ return a.dist - b.dist; });
        var next = candidates[Math.floor(Math.random() * Math.min(2, candidates.length))];
        // 把 prev → next 之間（不含 next）標 forbidden（包括造型外/造型內的 cell）
        var cr = prev.r + dr, cc = prev.c + dc;
        while (cr !== next.r || cc !== next.c) {
          forbidden.add(cr * 1000 + cc);
          cr += dr; cc += dc;
        }
        prev.dir = d;
        path.push({ r: next.r, c: next.c, dir: -1 });
        occupied.add(next.r * 1000 + next.c);
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }
  path[path.length - 1].dir = Math.floor(Math.random() * 4);
  return path;
}

// ── 10 種造型 cells 產生器 ──────────────────────────────────────────────────

function shapeCircle() {
  var cells = new Set();
  var cr = ROWS / 2, cc = COLS / 2;
  var R = Math.min(ROWS, COLS) * 0.40;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var d = Math.sqrt((r - cr) * (r - cr) + (c - cc) * (c - cc));
      if (Math.abs(d - R) < 1.3 || Math.abs(d - R * 0.55) < 0.8) cells.add(r * 1000 + c);
    }
  }
  return cells;
}

function shapeHeart() {
  var cells = new Set();
  var cr = ROWS * 0.42, cc = COLS / 2;
  var k = Math.min(ROWS, COLS) * 0.055;
  for (var t = 0; t < Math.PI * 2; t += 0.03) {
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    var r = Math.round(cr + y * k);
    var c = Math.round(cc + x * k);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) cells.add(r * 1000 + c);
  }
  return cells;
}

function shapeStar() {
  var cells = new Set();
  var cr = ROWS / 2, cc = COLS / 2;
  var R = Math.min(ROWS, COLS) * 0.42;
  // 10 個頂點之間連線取樣
  var pts = [];
  for (var i = 0; i < 10; i++) {
    var ang = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    var rad = (i % 2 === 0) ? R : R * 0.42;
    pts.push({ r: cr + Math.sin(ang) * rad, c: cc + Math.cos(ang) * rad });
  }
  for (var k = 0; k < 10; k++) {
    var a = pts[k], b = pts[(k + 1) % 10];
    var steps = 12;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps;
      var r = Math.round(a.r + (b.r - a.r) * t);
      var c = Math.round(a.c + (b.c - a.c) * t);
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) cells.add(r * 1000 + c);
    }
  }
  return cells;
}

function shapeSpiral() {
  var cells = new Set();
  var cr = ROWS / 2, cc = COLS / 2;
  var maxR = Math.min(ROWS, COLS) * 0.45;
  for (var t = 0; t < Math.PI * 8; t += 0.1) {
    var rad = (t / (Math.PI * 8)) * maxR;
    var r = Math.round(cr + Math.sin(t) * rad);
    var c = Math.round(cc + Math.cos(t) * rad);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) cells.add(r * 1000 + c);
  }
  return cells;
}

function shapeGrape() {
  var cells = new Set();
  for (var k = 0; k < 2; k++) {
    var cr = ROWS / 2 + (Math.random() - 0.5) * 3;
    var cc = COLS * (0.28 + k * 0.44);
    var dots = 10;
    for (var d = 0; d < dots; d++) {
      var ang = (d / dots) * Math.PI * 2;
      var rd = 1.5 + Math.random() * 2;
      var rr = Math.round(cr + Math.sin(ang) * rd);
      var rc = Math.round(cc + Math.cos(ang) * rd);
      [[0,0],[1,0],[0,1],[1,1]].forEach(function(off) {
        var r2 = rr + off[0], c2 = rc + off[1];
        if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) cells.add(r2 * 1000 + c2);
      });
    }
  }
  return cells;
}

function shapeDiamond() {
  var cells = new Set();
  var cr = ROWS / 2, cc = COLS / 2;
  var sz = Math.min(ROWS, COLS) * 0.42;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var d = Math.abs(r - cr) + Math.abs(c - cc);
      if (Math.abs(d - sz) < 1) cells.add(r * 1000 + c);
    }
  }
  return cells;
}

function shapeFrame() {
  var cells = new Set();
  var pad = 2;
  for (var r = pad; r < ROWS - pad; r++) {
    cells.add(r * 1000 + pad);
    cells.add(r * 1000 + (COLS - 1 - pad));
  }
  for (var c = pad; c < COLS - pad; c++) {
    cells.add(pad * 1000 + c);
    cells.add((ROWS - 1 - pad) * 1000 + c);
  }
  return cells;
}

function shapeDiagonal() {
  var cells = new Set();
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if ((r + c) % 3 === 0 && Math.random() < 0.7) cells.add(r * 1000 + c);
    }
  }
  return cells;
}

function shapeLetter() {
  var cells = new Set();
  var letters = ["A", "X", "H", "O", "T"];
  var letter = letters[Math.floor(Math.random() * letters.length)];
  patternName = "letter-" + letter; // 加註字母（之後 newPuzzle 會覆蓋成 letter · N=X，但留個 hook）
  var cr = 2, cc = 2;
  var H = ROWS - 4, W = COLS - 4;
  for (var r = 0; r < H; r++) {
    for (var c = 0; c < W; c++) {
      var on = false;
      if (letter === "A") {
        var mid = W / 2;
        if (Math.abs((c - mid) / mid + (1 - r / H)) < 0.15) on = true;
        if (Math.abs(-(c - mid) / mid + (1 - r / H)) < 0.15) on = true;
        if (r === Math.floor(H * 0.6) && c > mid - mid * 0.5 && c < mid + mid * 0.5) on = true;
      } else if (letter === "X") {
        if (Math.abs(c - r * W / H) < 1) on = true;
        if (Math.abs(c - (W - 1 - r * W / H)) < 1) on = true;
      } else if (letter === "H") {
        if (c === 0 || c === W - 1) on = true;
        if (r === Math.floor(H / 2)) on = true;
      } else if (letter === "O") {
        var d = Math.sqrt((r - H/2)*(r - H/2) / (H*H/4) + (c - W/2)*(c - W/2) / (W*W/4));
        if (Math.abs(d - 1) < 0.15) on = true;
      } else if (letter === "T") {
        if (r === 0) on = true;
        if (c === Math.floor(W / 2)) on = true;
      }
      if (on) cells.add((cr + r) * 1000 + (cc + c));
    }
  }
  return cells;
}

// ── Pattern generators ─────────────────────────────────────────────────────

var PATTERN_TYPES = ["circle", "heart", "star", "spiral", "grape", "frame", "diamond", "diagonal", "scatter", "letter"];

function generatePattern() {
  grid = [];
  for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(null));
  var type = PATTERN_TYPES[Math.floor(Math.random() * PATTERN_TYPES.length)];
  patternName = type;
  switch (type) {
    case "circle":   patternCircle(); break;
    case "heart":    patternHeart(); break;
    case "star":     patternStar(); break;
    case "spiral":   patternSpiral(); break;
    case "grape":    patternGrape(); break;
    case "frame":    patternFrame(); break;
    case "diamond":  patternDiamond(); break;
    case "diagonal": patternDiagonal(); break;
    case "scatter":  patternScatter(); break;
    case "letter":   patternLetter(); break;
  }
}

function placeArrow(r, c) {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
    grid[r][c] = { dir: 0 };  // direction filled later
  }
}

function patternCircle() {
  var cr = ROWS / 2, cc = COLS / 2;
  var radius = Math.min(ROWS, COLS) * 0.35;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var d = Math.sqrt((r-cr)*(r-cr) + (c-cc)*(c-cc));
      if (Math.abs(d - radius) < 1.2 || Math.abs(d - radius * 0.55) < 0.7) placeArrow(r, c);
    }
  }
}

function patternHeart() {
  var cr = ROWS * 0.45, cc = COLS / 2;
  var scale = Math.min(ROWS, COLS) * 0.06;
  for (var t = 0; t < Math.PI * 2; t += 0.04) {
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    var r = Math.round(cr + y * scale);
    var c = Math.round(cc + x * scale);
    placeArrow(r, c);
  }
}

function patternStar() {
  var cr = ROWS / 2, cc = COLS / 2;
  var R = Math.min(ROWS, COLS) * 0.4;
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    var rad = (i % 2 === 0) ? R : R * 0.4;
    var r = cr + Math.sin(a) * rad;
    var c = cc + Math.cos(a) * rad;
    var ni = (i + 1) % 10;
    var na = -Math.PI / 2 + (ni / 10) * Math.PI * 2;
    var nrad = (ni % 2 === 0) ? R : R * 0.4;
    var nr = cr + Math.sin(na) * nrad;
    var nc = cc + Math.cos(na) * nrad;
    var steps = 10;
    for (var s = 0; s < steps; s++) {
      var t = s / steps;
      placeArrow(Math.round(r + (nr - r) * t), Math.round(c + (nc - c) * t));
    }
  }
}

function patternSpiral() {
  var cr = ROWS / 2, cc = COLS / 2;
  var maxR = Math.min(ROWS, COLS) * 0.45;
  var prev = null;
  for (var t = 0; t < Math.PI * 8; t += 0.12) {
    var rad = (t / (Math.PI * 8)) * maxR;
    var r = Math.round(cr + Math.sin(t) * rad);
    var c = Math.round(cc + Math.cos(t) * rad);
    if (!prev || prev[0] !== r || prev[1] !== c) {
      placeArrow(r, c);
      prev = [r, c];
    }
  }
}

function patternGrape() {
  // 兩串葡萄式群集
  var clusters = 2;
  for (var k = 0; k < clusters; k++) {
    var cr = ROWS / 2 - 1 + (Math.random() - 0.5) * 3;
    var cc = COLS / 4 + k * (COLS / 2);
    // 圓點堆積
    var dots = 9;
    for (var d = 0; d < dots; d++) {
      var ang = (d / dots) * Math.PI * 2;
      var rd = 1.5 + Math.random() * 1.5;
      var rr = Math.round(cr + Math.sin(ang) * rd);
      var rc = Math.round(cc + Math.cos(ang) * rd);
      // 每顆「葡萄」是一個 3-cell cluster
      placeArrow(rr, rc);
      placeArrow(rr + 1, rc);
      placeArrow(rr, rc + 1);
    }
  }
}

function patternFrame() {
  for (var r = 1; r < ROWS - 1; r++) {
    placeArrow(r, 2); placeArrow(r, COLS - 3);
  }
  for (var c = 2; c < COLS - 2; c++) {
    placeArrow(2, c); placeArrow(ROWS - 3, c);
  }
}

function patternDiamond() {
  var cr = ROWS / 2, cc = COLS / 2;
  var sz = Math.min(ROWS, COLS) * 0.4;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var d = Math.abs(r - cr) + Math.abs(c - cc);
      if (Math.abs(d - sz) < 1) placeArrow(r, c);
    }
  }
}

function patternDiagonal() {
  // 斜線網格
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if ((r + c) % 3 === 0 && Math.random() < 0.7) placeArrow(r, c);
    }
  }
}

function patternScatter() {
  var density = 0.20 + Math.random() * 0.15;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (Math.random() < density) placeArrow(r, c);
    }
  }
}

function patternLetter() {
  // 隨機字母（A、X、H 結構）
  var letters = ["A", "X", "H", "O", "T"];
  var letter = letters[Math.floor(Math.random() * letters.length)];
  patternName = "letter-" + letter;
  var cr = 2, cc = 2;
  var H = ROWS - 4, W = COLS - 4;
  for (var r = 0; r < H; r++) {
    for (var c = 0; c < W; c++) {
      var on = false;
      if (letter === "A") {
        var mid = W / 2;
        // 兩斜邊
        if (Math.abs((c - mid) / mid + (1 - r / H)) < 0.15) on = true;
        if (Math.abs(-(c - mid) / mid + (1 - r / H)) < 0.15) on = true;
        // 橫線
        if (r === Math.floor(H * 0.6) && c > mid - mid*0.5 && c < mid + mid*0.5) on = true;
      } else if (letter === "X") {
        if (Math.abs(c - r * W / H) < 1) on = true;
        if (Math.abs(c - (W - 1 - r * W / H)) < 1) on = true;
      } else if (letter === "H") {
        if (c === 0 || c === W - 1) on = true;
        if (r === Math.floor(H / 2)) on = true;
      } else if (letter === "O") {
        var d = Math.sqrt((r - H/2)*(r - H/2) / (H*H/4) + (c - W/2)*(c - W/2) / (W*W/4));
        if (Math.abs(d - 1) < 0.15) on = true;
      } else if (letter === "T") {
        if (r === 0) on = true;
        if (c === Math.floor(W / 2)) on = true;
      }
      if (on) placeArrow(cr + r, cc + c);
    }
  }
}

// ── Direction assignment ───────────────────────────────────────────────────

function assignDirections() {
  // 每個箭頭找同 row/col 有箭頭的方向，從中隨機挑一個
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!grid[r][c]) continue;
      var candidates = [];
      // North
      for (var nr = r - 1; nr >= 0; nr--) if (grid[nr][c]) { candidates.push(0); break; }
      // East
      for (var nc = c + 1; nc < COLS; nc++) if (grid[r][nc]) { candidates.push(1); break; }
      // South
      for (var nr2 = r + 1; nr2 < ROWS; nr2++) if (grid[nr2][c]) { candidates.push(2); break; }
      // West
      for (var nc2 = c - 1; nc2 >= 0; nc2--) if (grid[r][nc2]) { candidates.push(3); break; }
      grid[r][c].dir = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : Math.floor(Math.random() * 4);
    }
  }
}

function dirDelta(d) {
  if (d === 0) return [-1, 0];
  if (d === 1) return [0, 1];
  if (d === 2) return [1, 0];
  if (d === 3) return [0, -1];
  return [0, 0];
}

// ── Chain simulation ───────────────────────────────────────────────────────

function simulateChainSize(startR, startC) {
  var visited = new Set();
  var stack = [[startR, startC]];
  while (stack.length > 0) {
    var p = stack.pop();
    var r = p[0], c = p[1];
    var key = r * 1000 + c;
    if (visited.has(key)) continue;
    if (!grid[r] || !grid[r][c]) continue;
    visited.add(key);
    var d = dirDelta(grid[r][c].dir);
    var nr = r + d[0], nc = c + d[1];
    while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      if (grid[nr][nc] && !visited.has(nr * 1000 + nc)) {
        stack.push([nr, nc]);
        break;
      }
      nr += d[0]; nc += d[1];
    }
  }
  return visited.size;
}

function findBestStart() {
  var best = null;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!grid[r][c]) continue;
      var size = simulateChainSize(r, c);
      if (!best || size > best.size) best = { r: r, c: c, size: size };
    }
  }
  return best;
}

function precomputeChain(startR, startC) {
  chainSteps = [];
  var visited = new Set();
  var stack = [[startR, startC]];
  while (stack.length > 0) {
    var p = stack.pop();
    var r = p[0], c = p[1];
    var key = r * 1000 + c;
    if (visited.has(key)) continue;
    if (!grid[r] || !grid[r][c]) continue;
    visited.add(key);
    var dir = grid[r][c].dir;
    var d = dirDelta(dir);
    var nr = r + d[0], nc = c + d[1];
    var nextR = null, nextC = null;
    while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      if (grid[nr][nc] && !visited.has(nr * 1000 + nc)) {
        nextR = nr; nextC = nc;
        stack.push([nr, nc]);
        break;
      }
      nr += d[0]; nc += d[1];
    }
    chainSteps.push({ r: r, c: c, dir: dir, nextR: nextR, nextC: nextC });
  }
}

// ── Update / draw ──────────────────────────────────────────────────────────

function draw() {
  background(palette.bg);

  // 背景格線
  drawGridLines();

  // 已 fading 的箭頭
  drawFadingArrows();

  // 還沒被連鎖的箭頭
  drawArrows();

  // 當前 chain animation
  if (phase === "chaining") {
    advanceChainIfNeeded();
    drawChainAnimation();
  } else if (phase === "fading") {
    if (millis() - phaseStart > 1200) {
      newPuzzle();
    }
  }

  // 粒子效果（chain 命中時的火花）
  updateAndDrawParticles();

  drawHud();
}

function advanceChainIfNeeded() {
  if (chainStepIdx >= chainSteps.length) {
    phase = "fading";
    phaseStart = millis();
    stats.currentChain = chainSteps.length;
    if (chainSteps.length > stats.longestChain) stats.longestChain = chainSteps.length;
    return;
  }
  if (millis() - lastStepTime > stepInterval) {
    var step = chainSteps[chainStepIdx];
    // 把這個 cell 移到 fading
    fadingCells.push({
      r: step.r, c: step.c, dir: step.dir,
      startTime: millis()
    });
    clearedCells.add(step.r * 1000 + step.c);
    // 命中粒子
    spawnHitParticles(step.r, step.c);
    chainStepIdx++;
    lastStepTime = millis();
  }
}

function drawGridLines() {
  noFill();
  stroke(palette.grid);
  strokeWeight(1);
  for (var r = 0; r <= ROWS; r++) {
    line(originX, originY + r * cellSize, originX + COLS * cellSize, originY + r * cellSize);
  }
  for (var c = 0; c <= COLS; c++) {
    line(originX + c * cellSize, originY, originX + c * cellSize, originY + ROWS * cellSize);
  }
}

function drawArrows() {
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!grid[r][c]) continue;
      var key = r * 1000 + c;
      if (clearedCells.has(key)) continue;
      var colorIdx = (r + c) % palette.arrow.length;
      drawArrow(r, c, grid[r][c].dir, palette.arrow[colorIdx], 1);
    }
  }
}

function drawArrow(r, c, dir, color, alpha) {
  var x = originX + c * cellSize + cellSize / 2;
  var y = originY + r * cellSize + cellSize / 2;
  push();
  translate(x, y);
  rotate(dir * Math.PI / 2);
  var rgb = hexRGB(color);
  noStroke();
  fill(rgb[0], rgb[1], rgb[2], 230 * alpha);
  var s = cellSize * 0.36;
  // 三角形朝上
  beginShape();
  vertex(0, -s);
  vertex(-s * 0.82, s * 0.6);
  vertex(0, s * 0.25);
  vertex(s * 0.82, s * 0.6);
  endShape(CLOSE);
  pop();
}

function drawFadingArrows() {
  for (var i = fadingCells.length - 1; i >= 0; i--) {
    var f = fadingCells[i];
    var t = (millis() - f.startTime) / 700;
    if (t >= 1) {
      fadingCells.splice(i, 1);
      continue;
    }
    var alpha = 1 - t;
    // 放大淡出
    var x = originX + f.c * cellSize + cellSize / 2;
    var y = originY + f.r * cellSize + cellSize / 2;
    push();
    translate(x, y);
    rotate(f.dir * Math.PI / 2);
    var scl = 1 + t * 0.8;
    scale(scl);
    var rgb = hexRGB(palette.chain);
    noStroke();
    // 外暈
    fill(rgb[0], rgb[1], rgb[2], 60 * alpha);
    var s = cellSize * 0.36;
    beginShape();
    vertex(0, -s);
    vertex(-s * 0.82, s * 0.6);
    vertex(0, s * 0.25);
    vertex(s * 0.82, s * 0.6);
    endShape(CLOSE);
    // 主體
    fill(255, 255, 255, 200 * alpha);
    beginShape();
    vertex(0, -s * 0.7);
    vertex(-s * 0.6, s * 0.4);
    vertex(0, s * 0.15);
    vertex(s * 0.6, s * 0.4);
    endShape(CLOSE);
    pop();
  }
}

function drawChainAnimation() {
  if (chainStepIdx >= chainSteps.length) return;
  var step = chainSteps[chainStepIdx];
  if (!step.nextR && step.nextR !== 0) return;  // chain end
  // 當前 step 的「射線」進度
  var t = (millis() - lastStepTime) / stepInterval;
  t = Math.min(1, t);
  var fromX = originX + step.c * cellSize + cellSize / 2;
  var fromY = originY + step.r * cellSize + cellSize / 2;
  var toX = originX + step.nextC * cellSize + cellSize / 2;
  var toY = originY + step.nextR * cellSize + cellSize / 2;
  var curX = fromX + (toX - fromX) * t;
  var curY = fromY + (toY - fromY) * t;
  // 射線
  var rgb = hexRGB(palette.chain);
  stroke(rgb[0], rgb[1], rgb[2], 200);
  strokeWeight(Math.max(2, cellSize * 0.08));
  line(fromX, fromY, curX, curY);
  // 頭部光點
  noStroke();
  fill(rgb[0], rgb[1], rgb[2], 220);
  ellipse(curX, curY, cellSize * 0.4, cellSize * 0.4);
  // 外暈
  fill(rgb[0], rgb[1], rgb[2], 80);
  ellipse(curX, curY, cellSize * 0.9, cellSize * 0.9);
  // 當前發射的箭頭發光
  var glowRGB = hexRGB(palette.glow);
  fill(glowRGB[0], glowRGB[1], glowRGB[2], 120);
  ellipse(fromX, fromY, cellSize * 1.4, cellSize * 1.4);
}

function spawnHitParticles(r, c) {
  var x = originX + c * cellSize + cellSize / 2;
  var y = originY + r * cellSize + cellSize / 2;
  for (var i = 0; i < 8; i++) {
    var ang = Math.random() * Math.PI * 2;
    var sp = 1 + Math.random() * 2;
    particles.push({
      x: x, y: y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color: palette.chain
    });
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
    ellipse(p.x, p.y, 3, 3);
  }
}

function drawHud() {
  noStroke();
  fill(palette.text);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  var fs = Math.max(11, cellSize * 0.45);
  textSize(fs);
  text("ARROWS CHAIN", originX, originY - cellSize * 0.95);

  textStyle(NORMAL);
  textSize(fs * 0.7);
  fill(palette.arrow[0]);
  text(patternName.toUpperCase() + " · " + palette.name, originX, originY - cellSize * 0.45);

  // 右上：chain count
  textAlign(RIGHT, TOP);
  textStyle(BOLD);
  textSize(fs * 0.85);
  fill(palette.chain);
  var chainText = "CHAIN " + chainStepIdx + " / " + chainSteps.length;
  text(chainText, originX + COLS * cellSize, originY - cellSize * 0.95);

  textStyle(NORMAL);
  textSize(fs * 0.6);
  fill(palette.text);
  text("LONGEST " + stats.longestChain + " · TOTAL " + stats.totalChains,
       originX + COLS * cellSize, originY - cellSize * 0.4);
}

// ── User interaction ───────────────────────────────────────────────────────

function mousePressed() {
  // 手動點箭頭觸發 chain（在 chaining 時也可以打斷重啟）
  if (phase !== "chaining" && phase !== "fading") return;
  var c = Math.floor((mouseX - originX) / cellSize);
  var r = Math.floor((mouseY - originY) / cellSize);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  if (!grid[r][c]) return;
  if (clearedCells.has(r * 1000 + c)) return;
  // 從這個 arrow 重新計算 chain
  precomputeChain(r, c);
  chainStepIdx = 0;
  clearedCells = new Set();
  fadingCells = [];
  phase = "chaining";
  lastStepTime = millis();
}

function keyPressed() {
  if (key === " " || key === "n" || key === "N") newPuzzle();
  if (key === "+" || key === "=") toggleSpeed();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
