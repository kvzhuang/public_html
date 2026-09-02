// ============================================
// Maze Flood — 從上方灌入液體尋找出路
// DFS maze + cellular fluid sim (gravity / spread / pressure)
// ============================================

var rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────
// water 欄位是注入液體的顏色；其餘沿用 maze 風格

var PALETTES = [
  { name:"Classic",    wall:"#222222", path:"#F5F5F0", solve:"#E63946", entry:"#2A9D8F", bg:"#F5F5F0", carve:"#FFF9C4", water:"#1E88E5" },
  { name:"Blueprint",  wall:"#1B3A5C", path:"#E8EEF4", solve:"#FF6B35", entry:"#FFBE0B", bg:"#E8EEF4", carve:"#BBDEFB", water:"#0D47A1" },
  { name:"Noir",       wall:"#0D0D0D", path:"#E8E8E8", solve:"#FF006E", entry:"#3A86FF", bg:"#E8E8E8", carve:"#CFD8DC", water:"#00B4D8" },
  { name:"Forest",     wall:"#1B4332", path:"#D8F3DC", solve:"#E63946", entry:"#F4A261", bg:"#D8F3DC", carve:"#A5D6A7", water:"#1976D2" },
  { name:"Ocean",      wall:"#023E8A", path:"#CAF0F8", solve:"#F72585", entry:"#FFBE0B", bg:"#CAF0F8", carve:"#81D4FA", water:"#006994" },
  { name:"Sunset",     wall:"#3D0C11", path:"#FFF1E6", solve:"#FF6B35", entry:"#06D6A0", bg:"#FFF1E6", carve:"#FFCCBC", water:"#1982C4" },
  { name:"Lavender",   wall:"#2E1A47", path:"#F0E6FF", solve:"#FF006E", entry:"#06D6A0", bg:"#F0E6FF", carve:"#D1C4E9", water:"#5B5BE0" },
  { name:"Mint",       wall:"#0B3D2E", path:"#E6FFF5", solve:"#FF5C5C", entry:"#FFD166", bg:"#E6FFF5", carve:"#B2DFDB", water:"#0288D1" },
  { name:"Rust",       wall:"#5C2A0A", path:"#FFF3E0", solve:"#1982C4", entry:"#06D6A0", bg:"#FFF3E0", carve:"#FFE0B2", water:"#1565C0" },
  { name:"Inverted",   wall:"#E8E8E8", path:"#1A1A2E", solve:"#FF006E", entry:"#4CC9F0", bg:"#1A1A2E", carve:"#303050", water:"#4CC9F0" },
  { name:"NeonDark",   wall:"#C8C8C8", path:"#0A0A1A", solve:"#05D9E8", entry:"#FF2A6D", bg:"#0A0A1A", carve:"#1A1A3A", water:"#05D9E8" },
  { name:"GoldDark",   wall:"#DAA520", path:"#0D0D0D", solve:"#FF5C5C", entry:"#4CC9F0", bg:"#0D0D0D", carve:"#2A2A10", water:"#00CED1" },
  { name:"Coral",      wall:"#6B2039", path:"#FFF0F3", solve:"#0077B6", entry:"#06D6A0", bg:"#FFF0F3", carve:"#FCE4EC", water:"#0288D1" },
  { name:"Slate",      wall:"#2D3A4A", path:"#EDF2F7", solve:"#E63946", entry:"#FFBE0B", bg:"#EDF2F7", carve:"#CFD8DC", water:"#1565C0" },
  { name:"Terracotta", wall:"#8B4513", path:"#FFF8F0", solve:"#1982C4", entry:"#52B788", bg:"#FFF8F0", carve:"#FFECB3", water:"#1565C0" },
  { name:"Midnight",   wall:"#AAAACC", path:"#12122A", solve:"#FF79C6", entry:"#50FA7B", bg:"#12122A", carve:"#252545", water:"#50C0FF" },
];

// ── State ───────────────────────────────────────────────────────────────────

var pal;
var cols, rows;
var grid = [];
var cellSz, mgn, sz;
var buildSteps = [];
var buildAnimFrame = 0;
var buildAnimSpeed = 1;
var building = false;

// Flood sim state
var water = [];          // per-cell mass; 0..~1.02 (with compression)
var floodDelta = [];     // per-step delta buffer
var firstTick = [];      // first tick water reached this cell
var simTick = 0;
var tickAtExit = -1;
var totalDrained = 0;
var exitReached = false;
var flooding = false;
var floodEndCountdown = 0;
var dripOffset = 0;

// Cellular fluid (DF water style)
var MAX_MASS = 1.0;
var MAX_COMPRESS = 0.02;     // upper cell holds (excess) above 1.0 only when compressed
var MIN_MASS = 0.0001;
var MAX_SPEED = 1.0;
var MIN_FLOW = 0.01;
var SOURCE_PRESSURE = 1.18;  // source cell is forced to at least this each step
var DRAIN_RATE = 0.5;
var SUBSTEPS = 12;           // recomputed per maze in initMaze()
var MAX_POST_EXIT_TICKS = 2400;
var SAT_THRESHOLD = 0.85;
var SAT_FRACTION = 0.82;

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  sz = calcSz();
  var cnv = createCanvas(sz, sz);
  cnv.parent("maze-container");

  var btnFlood = document.getElementById("btn-flood");
  var btnNew = document.getElementById("btn-new");
  var btnSave = document.getElementById("btn-save");
  btnFlood.ontouchend = function(e) { e.preventDefault(); triggerFlood(); };
  btnFlood.onclick = function() { triggerFlood(); };
  btnNew.ontouchend = function(e) { e.preventDefault(); newMaze(); };
  btnNew.onclick = function() { newMaze(); };
  btnSave.ontouchend = function(e) { e.preventDefault(); doSave(); };
  btnSave.onclick = function() { doSave(); };

  initMaze();
}

function doSave() {
  saveCanvas("maze-flood-" + cols + "x" + rows + "-" + Date.now(), "png");
}

function calcSz() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  var s = Math.floor(Math.min(availW, availH));
  if (s < 200) s = 200;
  return s;
}

function newMaze() {
  sz = calcSz();
  resizeCanvas(sz, sz);
  initMaze();
}

function initMaze() {
  pal = PALETTES[Math.floor(rand() * PALETTES.length)];

  var n = Math.floor(rand() * 31) + 12; // 12..42
  cols = n;
  rows = n;

  mgn = sz * 0.05;
  cellSz = (sz - mgn * 2) / cols;

  generateMaze();
  initWater();

  // 灌水速度隨 maze 邊長放大：小迷宮溫和、大迷宮明顯加速
  SUBSTEPS = Math.max(36, Math.round(cols * 2.8));

  exitReached = false;
  flooding = false;
  floodEndCountdown = 0;
  simTick = 0;
  tickAtExit = -1;
  totalDrained = 0;
  dripOffset = 0;

  buildAnimSpeed = Math.max(1, Math.ceil(buildSteps.length / 120));
  buildAnimFrame = 0;
  building = true;

  var btnF = document.getElementById("btn-flood");
  if (btnF) btnF.style.background = pal.water;

  loop();
}

function triggerFlood() {
  if (building || flooding) return;
  // If we were already done, reset water so a fresh flood is visible
  if (exitReached) initWater();
  flooding = true;
  simTick = 0;
  tickAtExit = -1;
  exitReached = false;
  floodEndCountdown = 0;
  totalDrained = 0;
  loop();
}

// ── Maze generation (Iterative DFS) ─────────────────────────────────────────

function generateMaze() {
  var r, c;
  grid = [];
  for (r = 0; r < rows; r++) {
    grid[r] = [];
    for (c = 0; c < cols; c++) {
      grid[r][c] = { N:true, S:true, E:true, W:true, visited:false };
    }
  }

  buildSteps = [];
  var stack = [];
  grid[0][0].visited = true;
  buildSteps.push({ r:0, c:0, dir:null });
  stack.push([0, 0]);

  while (stack.length > 0) {
    var cur = stack[stack.length - 1];
    var cr = cur[0], cc = cur[1];
    var nb = [];
    if (cr > 0      && !grid[cr-1][cc].visited) nb.push([cr-1,cc,"N"]);
    if (cr < rows-1 && !grid[cr+1][cc].visited) nb.push([cr+1,cc,"S"]);
    if (cc < cols-1 && !grid[cr][cc+1].visited) nb.push([cr,cc+1,"E"]);
    if (cc > 0      && !grid[cr][cc-1].visited) nb.push([cr,cc-1,"W"]);

    if (nb.length > 0) {
      var pick = nb[Math.floor(rand() * nb.length)];
      var nr = pick[0], nc = pick[1], dir = pick[2];
      var opp = { N:"S", S:"N", E:"W", W:"E" };
      grid[cr][cc][dir] = false;
      grid[nr][nc][opp[dir]] = false;
      grid[nr][nc].visited = true;
      buildSteps.push({ r:nr, c:nc, dir:dir });
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  // Open entry (top of top-left) and exit (bottom of bottom-right)
  grid[0][0].N = false;
  grid[rows-1][cols-1].S = false;
}

// ── Water state ────────────────────────────────────────────────────────────

function initWater() {
  water = [];
  floodDelta = [];
  firstTick = [];
  for (var r = 0; r < rows; r++) {
    water[r] = [];
    floodDelta[r] = [];
    firstTick[r] = [];
    for (var c = 0; c < cols; c++) {
      water[r][c] = 0;
      floodDelta[r][c] = 0;
      firstTick[r][c] = -1;
    }
  }
}

// ── Fluid simulation step ──────────────────────────────────────────────────
// DF-style cellular liquid:
//   每對「垂直相連」的格子用 getStableState(總質量) 一次決定誰該裝多少
//   水平用「往平均靠攏」
//   所有流量都先寫到 floodDelta，最後一次套用，避免 pass 順序產生人為傾斜
//   源頭強制保持加壓水位 SOURCE_PRESSURE，保證壓力源源不絕

function getStableState(total) {
  if (total <= MAX_MASS) return total;
  if (total < 2 * MAX_MASS + MAX_COMPRESS) {
    return (MAX_MASS * MAX_MASS + total * MAX_COMPRESS) / (MAX_MASS + MAX_COMPRESS);
  }
  return (total + MAX_COMPRESS) / 2;
}

function stepFlood() {
  var r, c, flow, remain;

  // Reset delta buffer
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) floodDelta[r][c] = 0;
  }

  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      remain = water[r][c];
      if (remain <= MIN_MASS) continue;

      // Down (gravity-driven, but uses stable-state so pressurized cells don't
      // accept more than equilibrium allows)
      if (r < rows - 1 && !grid[r][c].S) {
        flow = getStableState(remain + water[r+1][c]) - water[r+1][c];
        if (flow > MIN_FLOW) flow *= 0.5;  // damping
        if (flow > 0) {
          if (flow > remain) flow = remain;
          if (flow > MAX_SPEED) flow = MAX_SPEED;
          floodDelta[r][c]   -= flow;
          floodDelta[r+1][c] += flow;
          remain -= flow;
        }
      }
      if (remain <= MIN_MASS) continue;

      // Left
      if (c > 0 && !grid[r][c].W) {
        flow = (remain - water[r][c-1]) / 4;
        if (flow > MIN_FLOW) flow *= 0.5;
        if (flow > 0) {
          if (flow > remain) flow = remain;
          if (flow > MAX_SPEED) flow = MAX_SPEED;
          floodDelta[r][c]   -= flow;
          floodDelta[r][c-1] += flow;
          remain -= flow;
        }
      }
      if (remain <= MIN_MASS) continue;

      // Right
      if (c < cols - 1 && !grid[r][c].E) {
        flow = (remain - water[r][c+1]) / 4;
        if (flow > MIN_FLOW) flow *= 0.5;
        if (flow > 0) {
          if (flow > remain) flow = remain;
          if (flow > MAX_SPEED) flow = MAX_SPEED;
          floodDelta[r][c]   -= flow;
          floodDelta[r][c+1] += flow;
          remain -= flow;
        }
      }
      if (remain <= MIN_MASS) continue;

      // Up (only fires when this cell exceeds the stable-state for the column,
      // i.e. pressure has built up beneath; this is what carries water UP across U-bends)
      if (r > 0 && !grid[r][c].N) {
        flow = remain - getStableState(remain + water[r-1][c]);
        if (flow > MIN_FLOW) flow *= 0.5;
        if (flow > 0) {
          if (flow > remain) flow = remain;
          if (flow > MAX_SPEED) flow = MAX_SPEED;
          floodDelta[r][c]   -= flow;
          floodDelta[r-1][c] += flow;
        }
      }
    }
  }

  // Apply delta
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      water[r][c] += floodDelta[r][c];
      if (water[r][c] < MIN_MASS) water[r][c] = 0;
    }
  }

  // Pressurized source: top up the entry cell every step
  if (water[0][0] < SOURCE_PRESSURE) water[0][0] = SOURCE_PRESSURE;

  // Drain exit
  if (water[rows-1][cols-1] > MIN_MASS) {
    var out = Math.min(water[rows-1][cols-1], DRAIN_RATE);
    water[rows-1][cols-1] -= out;
    totalDrained += out;
    if (!exitReached && totalDrained > 0.01) {
      exitReached = true;
      tickAtExit = simTick;
    }
  }

  // Record first-arrival tick
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      if (firstTick[r][c] < 0 && water[r][c] > 0.05) firstTick[r][c] = simTick;
    }
  }

  simTick++;
}

// Saturation check: enough cells filled, or post-exit timeout
function shouldStopFlood() {
  if (!exitReached) return false;
  // Hard cap on post-exit ticks (handles dead-ends that never quite saturate)
  if (tickAtExit >= 0 && simTick - tickAtExit > MAX_POST_EXIT_TICKS) return true;
  // Soft cap: relaxed saturation
  var filled = 0, total = 0, r, c;
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      total++;
      if (water[r][c] >= SAT_THRESHOLD) filled++;
    }
  }
  return filled / total > SAT_FRACTION;
}

// ── Draw ────────────────────────────────────────────────────────────────────

function draw() {
  background(pal.bg);
  push();
  translate(mgn, mgn);

  if (building) {
    drawBuild();
  } else {
    drawMazeBase();
    if (flooding || exitReached) {
      // simulate
      if (flooding) {
        for (var s = 0; s < SUBSTEPS; s++) stepFlood();
      }
      drawWater();
      drawDrip();
      drawExitStream();
      drawSourcePool();
    }
    drawWalls();
    drawMarkers();
  }

  pop();

  // Advance build animation
  if (building) {
    buildAnimFrame += buildAnimSpeed;
    if (buildAnimFrame >= buildSteps.length) {
      buildAnimFrame = buildSteps.length;
      building = false;
      // settle one frame, then idle
      noLoop();
      // redraw a clean dry maze
      background(pal.bg);
      push();
      translate(mgn, mgn);
      drawMazeBase();
      drawWalls();
      drawMarkers();
      pop();
      return;
    }
  } else if (flooding) {
    if (shouldStopFlood()) {
      floodEndCountdown++;
      if (floodEndCountdown > 30) {
        flooding = false;
        setTimeout(function(){ noLoop(); }, 200);
      }
    } else {
      floodEndCountdown = 0;
    }
  }
}

// ── Build animation (same approach as maze) ────────────────────────────────

function drawBuild() {
  var showN = Math.min(Math.floor(buildAnimFrame), buildSteps.length);
  var r, c, i;

  var revealed = [];
  for (r = 0; r < rows; r++) { revealed[r] = []; for (c = 0; c < cols; c++) revealed[r][c] = false; }
  for (i = 0; i < showN; i++) revealed[buildSteps[i].r][buildSteps[i].c] = true;

  noStroke(); fill(pal.wall);
  rect(0, 0, cols * cellSz, rows * cellSz);

  fill(pal.path);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    if (revealed[r][c]) rect(Math.floor(c*cellSz), Math.floor(r*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
  }

  if (showN > 0 && showN < buildSteps.length - 1) {
    var hd = buildSteps[showN - 1];
    fill(pal.carve);
    rect(Math.floor(hd.c*cellSz), Math.floor(hd.r*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
  }

  stroke(pal.wall);
  strokeWeight(Math.max(cellSz * 0.12, 1));
  strokeCap(SQUARE);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    if (!revealed[r][c]) continue;
    var x = c*cellSz, y = r*cellSz, cl = grid[r][c];
    if (cl.N && !(r===0&&c===0)) line(x, y, x+cellSz, y);
    if (cl.S && !(r===rows-1&&c===cols-1)) line(x, y+cellSz, x+cellSz, y+cellSz);
    if (cl.W) line(x, y, x, y+cellSz);
    if (cl.E) line(x+cellSz, y, x+cellSz, y+cellSz);
  }

  strokeWeight(Math.max(cellSz * 0.18, 2));
  line(cellSz,0, cols*cellSz,0);
  line(0,rows*cellSz, (cols-1)*cellSz,rows*cellSz);
  line(0,0, 0,rows*cellSz);
  line(cols*cellSz,0, cols*cellSz,rows*cellSz);
}

// ── Static layers ──────────────────────────────────────────────────────────

function drawMazeBase() {
  noStroke();
  fill(pal.path);
  rect(0, 0, cols*cellSz, rows*cellSz);
}

function drawWalls() {
  var r, c;
  stroke(pal.wall);
  strokeWeight(Math.max(cellSz * 0.12, 1));
  strokeCap(SQUARE);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    var x = c*cellSz, y = r*cellSz, cl = grid[r][c];
    if (cl.N) line(x,y, x+cellSz,y);
    if (cl.S) line(x,y+cellSz, x+cellSz,y+cellSz);
    if (cl.W) line(x,y, x,y+cellSz);
    if (cl.E) line(x+cellSz,y, x+cellSz,y+cellSz);
  }

  strokeWeight(Math.max(cellSz * 0.18, 2));
  line(cellSz,0, cols*cellSz,0);
  line(0,rows*cellSz, (cols-1)*cellSz,rows*cellSz);
  line(0,0, 0,rows*cellSz);
  line(cols*cellSz,0, cols*cellSz,rows*cellSz);
}

function drawMarkers() {
  noStroke();
  fill(pal.entry);
  ellipse(cellSz/2, -cellSz*0.15, cellSz*0.65, cellSz*0.65);
  fill(exitReached ? pal.water : pal.solve);
  ellipse((cols-1)*cellSz+cellSz/2, rows*cellSz+cellSz*0.15, cellSz*0.65, cellSz*0.65);
}

// ── Water rendering ────────────────────────────────────────────────────────

function drawWater() {
  var r, c;
  var rgb = hexRGB(pal.water);
  var hi  = lighten(rgb, 0.35);
  var lo  = darken(rgb, 0.25);

  noStroke();
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      var w = water[r][c];
      if (w <= MIN_MASS) continue;
      var lvl = Math.min(w, 1);
      var h = lvl * cellSz;
      var x = c * cellSz;
      var y = r * cellSz + (cellSz - h);

      // Body
      fill(rgb[0], rgb[1], rgb[2], 215);
      rect(Math.floor(x), Math.floor(y), Math.ceil(cellSz)+1, Math.ceil(h)+1);

      // Bottom shading (darker pool floor)
      if (lvl > 0.15) {
        fill(lo[0], lo[1], lo[2], 90);
        rect(Math.floor(x), Math.floor(r*cellSz + cellSz - h*0.25), Math.ceil(cellSz)+1, Math.ceil(h*0.25)+1);
      }

      // Surface highlight (top band of water)
      if (lvl < 0.985) {
        fill(hi[0], hi[1], hi[2], 200);
        var bandH = Math.max(1, cellSz * 0.08);
        rect(Math.floor(x), Math.floor(y), Math.ceil(cellSz)+1, bandH);
      }

      // Pressurized marker: subtle bubble
      if (w > MAX_MASS + 0.02) {
        fill(255, 255, 255, 70);
        var ph = (Math.sin((simTick + r*7 + c*13) * 0.18) * 0.5 + 0.5);
        var rad = cellSz * (0.12 + ph * 0.08);
        ellipse(x + cellSz*0.5 + Math.sin(simTick*0.05 + r+c)*cellSz*0.08,
                r*cellSz + cellSz*0.45 + Math.cos(simTick*0.07 + r-c)*cellSz*0.08,
                rad, rad);
      }
    }
  }
}

// 注入點上方的水滴：跟著 simTick 落入入口
function drawDrip() {
  if (!flooding && !exitReached) return;
  var rgb = hexRGB(pal.water);
  var hi  = lighten(rgb, 0.3);
  var x = cellSz/2;
  // 兩個交錯的水滴往下掉
  noStroke();
  for (var i = 0; i < 2; i++) {
    var phase = ((simTick * 0.6 + i * 18) % 30) / 30;
    var dy = -cellSz * 1.6 + phase * cellSz * 1.55;
    var sz = cellSz * (0.18 + phase * 0.05);
    fill(rgb[0], rgb[1], rgb[2], 220);
    ellipse(x, dy, sz * 0.7, sz);
    fill(hi[0], hi[1], hi[2], 220);
    ellipse(x - sz*0.18, dy - sz*0.22, sz*0.22, sz*0.22);
  }
}

// 入口上方的累積水池（持續注入感）
function drawSourcePool() {
  if (!flooding && !exitReached) return;
  var rgb = hexRGB(pal.water);
  noStroke();
  fill(rgb[0], rgb[1], rgb[2], 180);
  var poolH = cellSz * 0.18;
  arc(cellSz/2, -cellSz*0.02, cellSz*0.85, poolH*2, PI, 0);
}

// 出口下方的水流
function drawExitStream() {
  if (!exitReached) return;
  var rgb = hexRGB(pal.water);
  var hi  = lighten(rgb, 0.3);
  noStroke();
  var x = (cols-1)*cellSz + cellSz/2;
  var y0 = rows * cellSz;
  // 主水柱
  fill(rgb[0], rgb[1], rgb[2], 200);
  rect(x - cellSz*0.18, y0, cellSz*0.36, cellSz*0.9);
  // 高光
  fill(hi[0], hi[1], hi[2], 180);
  rect(x - cellSz*0.06, y0, cellSz*0.12, cellSz*0.9);
  // 底部水池
  fill(rgb[0], rgb[1], rgb[2], 170);
  ellipse(x, y0 + cellSz*0.95, cellSz*1.05, cellSz*0.45);
  // 飛濺
  for (var i = 0; i < 3; i++) {
    var ph = ((simTick * 0.6 + i * 9) % 24) / 24;
    var dx = (i - 1) * cellSz * 0.4 * (0.5 + ph);
    var dy = -ph * cellSz * 0.3;
    var sz = cellSz * (0.08 - ph * 0.04);
    fill(rgb[0], rgb[1], rgb[2], 200 * (1 - ph));
    ellipse(x + dx, y0 + cellSz*0.95 + dy, sz, sz);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function lighten(rgb, t) {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * t),
    Math.round(rgb[1] + (255 - rgb[1]) * t),
    Math.round(rgb[2] + (255 - rgb[2]) * t)
  ];
}

function darken(rgb, t) {
  return [
    Math.round(rgb[0] * (1 - t)),
    Math.round(rgb[1] * (1 - t)),
    Math.round(rgb[2] * (1 - t))
  ];
}

function windowResized() {
  sz = calcSz();
  resizeCanvas(sz, sz);
  mgn = sz * 0.05;
  cellSz = (sz - mgn * 2) / cols;
  redraw();
}

function keyPressed() {
  if (key === " ") newMaze();
  if (key === "s" || key === "S") doSave();
  if (key === "f" || key === "F") triggerFlood();
}
