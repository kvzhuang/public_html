// ============================================
// Maze — 迷宮生成藝術
// Animated DFS generation + BFS solution
// Tap maze to solve, buttons for New / Save
// ============================================

var rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────

var PALETTES = [
  { name:"Classic",    wall:"#222222", path:"#F5F5F0", solve:"#E63946", entry:"#2A9D8F", bg:"#F5F5F0", carve:"#FFF9C4" },
  { name:"Blueprint",  wall:"#1B3A5C", path:"#E8EEF4", solve:"#FF6B35", entry:"#FFBE0B", bg:"#E8EEF4", carve:"#BBDEFB" },
  { name:"Noir",       wall:"#0D0D0D", path:"#E8E8E8", solve:"#FF006E", entry:"#3A86FF", bg:"#E8E8E8", carve:"#CFD8DC" },
  { name:"Forest",     wall:"#1B4332", path:"#D8F3DC", solve:"#E63946", entry:"#F4A261", bg:"#D8F3DC", carve:"#A5D6A7" },
  { name:"Ocean",      wall:"#023E8A", path:"#CAF0F8", solve:"#F72585", entry:"#FFBE0B", bg:"#CAF0F8", carve:"#81D4FA" },
  { name:"Sunset",     wall:"#3D0C11", path:"#FFF1E6", solve:"#FF6B35", entry:"#06D6A0", bg:"#FFF1E6", carve:"#FFCCBC" },
  { name:"Lavender",   wall:"#2E1A47", path:"#F0E6FF", solve:"#FF006E", entry:"#06D6A0", bg:"#F0E6FF", carve:"#D1C4E9" },
  { name:"Mint",       wall:"#0B3D2E", path:"#E6FFF5", solve:"#FF5C5C", entry:"#FFD166", bg:"#E6FFF5", carve:"#B2DFDB" },
  { name:"Rust",       wall:"#5C2A0A", path:"#FFF3E0", solve:"#1982C4", entry:"#06D6A0", bg:"#FFF3E0", carve:"#FFE0B2" },
  { name:"Inverted",   wall:"#E8E8E8", path:"#1A1A2E", solve:"#FF006E", entry:"#4CC9F0", bg:"#1A1A2E", carve:"#303050" },
  { name:"NeonDark",   wall:"#C8C8C8", path:"#0A0A1A", solve:"#05D9E8", entry:"#FF2A6D", bg:"#0A0A1A", carve:"#1A1A3A" },
  { name:"GoldDark",   wall:"#DAA520", path:"#0D0D0D", solve:"#FF5C5C", entry:"#4CC9F0", bg:"#0D0D0D", carve:"#2A2A10" },
  { name:"Coral",      wall:"#6B2039", path:"#FFF0F3", solve:"#0077B6", entry:"#06D6A0", bg:"#FFF0F3", carve:"#FCE4EC" },
  { name:"Slate",      wall:"#2D3A4A", path:"#EDF2F7", solve:"#E63946", entry:"#FFBE0B", bg:"#EDF2F7", carve:"#CFD8DC" },
  { name:"Terracotta", wall:"#8B4513", path:"#FFF8F0", solve:"#1982C4", entry:"#52B788", bg:"#FFF8F0", carve:"#FFECB3" },
  { name:"Midnight",   wall:"#AAAACC", path:"#12122A", solve:"#FF79C6", entry:"#50FA7B", bg:"#12122A", carve:"#252545" },
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
var solutionPath = [];
var showSolution = false;
var solveAnimFrame = 0;
var solveAnimSpeed = 1;
var solving = false;

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  sz = calcSz();

  var cnv = createCanvas(sz, sz);
  cnv.parent("maze-container");

  // Button listeners
  var btnSolve = document.getElementById("btn-solve");
  var btnNew = document.getElementById("btn-new");
  var btnSave = document.getElementById("btn-save");
  btnSolve.ontouchend = function(e) { e.preventDefault(); triggerSolve(); };
  btnSolve.onclick = function() { triggerSolve(); };
  btnNew.ontouchend = function(e) { e.preventDefault(); newMaze(); };
  btnNew.onclick = function() { newMaze(); };
  btnSave.ontouchend = function(e) { e.preventDefault(); doSave(); };
  btnSave.onclick = function() { doSave(); };

  initMaze();
}

function doSave() {
  saveCanvas("maze-" + cols + "x" + rows + "-" + Date.now(), "png");
}

function calcSz() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  // Use multiple sources and pick the smallest to be safe
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

  var n = Math.floor(rand() * 41) + 10;
  cols = n;
  rows = n;

  mgn = sz * 0.05;
  cellSz = (sz - mgn * 2) / cols;
  solveAnimSpeed = Math.max(1, Math.floor(cols / 6));

  generateMaze();
  solveMaze();

  showSolution = false;
  solveAnimFrame = 0;
  solving = false;

  // Build anim: ~2 seconds at 60fps
  buildAnimSpeed = Math.max(1, Math.ceil(buildSteps.length / 120));
  buildAnimFrame = 0;
  building = true;

  // Update solve button color to match palette
  var btnS = document.getElementById("btn-solve");
  if (btnS) btnS.style.background = pal.solve;

  loop();
}

// ── Solve trigger (button only, no canvas tap) ─────────────────────────────

function triggerSolve() {
  if (building || solving) return;
  if (!showSolution) {
    showSolution = true;
    solveAnimFrame = 0;
    solving = true;
    loop();
  }
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

  grid[0][0].N = false;
  grid[rows-1][cols-1].S = false;
}

// ── Maze solving (BFS) ──────────────────────────────────────────────────────

function solveMaze() {
  var r, c, i;
  var visited = [];
  var parent = [];
  for (r = 0; r < rows; r++) {
    visited[r] = [];
    parent[r] = [];
    for (c = 0; c < cols; c++) {
      visited[r][c] = false;
      parent[r][c] = null;
    }
  }

  var queue = [[0, 0]];
  visited[0][0] = true;

  while (queue.length > 0) {
    var cell = queue.shift();
    r = cell[0]; c = cell[1];
    if (r === rows-1 && c === cols-1) break;

    var dirs = [["N",r-1,c],["S",r+1,c],["E",r,c+1],["W",r,c-1]];
    for (i = 0; i < dirs.length; i++) {
      var d = dirs[i][0], nr2 = dirs[i][1], nc2 = dirs[i][2];
      if (nr2 < 0 || nr2 >= rows || nc2 < 0 || nc2 >= cols) continue;
      if (visited[nr2][nc2] || grid[r][c][d]) continue;
      visited[nr2][nc2] = true;
      parent[nr2][nc2] = [r, c];
      queue.push([nr2, nc2]);
    }
  }

  solutionPath = [];
  var cur2 = [rows-1, cols-1];
  while (cur2) {
    solutionPath.push(cur2);
    cur2 = parent[cur2[0]][cur2[1]];
  }
  solutionPath.reverse();
}

// ── Draw ────────────────────────────────────────────────────────────────────

function draw() {
  background(pal.bg);
  push();
  translate(mgn, mgn);

  if (building) {
    drawBuild();
  } else {
    drawFull();
  }

  pop();

  // Advance
  if (building) {
    buildAnimFrame += buildAnimSpeed;
    if (buildAnimFrame >= buildSteps.length) {
      buildAnimFrame = buildSteps.length;
      building = false;
      // Immediately redraw as full maze (no carve highlight)
      background(pal.bg);
      push();
      translate(mgn, mgn);
      drawFull();
      pop();
      noLoop();
    }
  } else if (solving) {
    solveAnimFrame += solveAnimSpeed;
    if (solveAnimFrame >= solutionPath.length) {
      solveAnimFrame = solutionPath.length + 1; // overshoot to guarantee full draw
      solving = false;
      // Let draw loop run a few more frames to ensure final state renders
      setTimeout(function() { noLoop(); }, 300);
    }
  }
}

// ── Build animation ─────────────────────────────────────────────────────────

function drawBuild() {
  var showN = Math.min(Math.floor(buildAnimFrame), buildSteps.length);
  var r, c, i;

  // Revealed cells
  var revealed = [];
  for (r = 0; r < rows; r++) { revealed[r] = []; for (c = 0; c < cols; c++) revealed[r][c] = false; }
  for (i = 0; i < showN; i++) revealed[buildSteps[i].r][buildSteps[i].c] = true;

  // Wall color background
  noStroke(); fill(pal.wall);
  rect(0, 0, cols * cellSz, rows * cellSz);

  // Revealed = path color (add +1 overlap to prevent subpixel gaps)
  fill(pal.path);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    if (revealed[r][c]) rect(Math.floor(c*cellSz), Math.floor(r*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
  }

  // Head highlight (only during animation, not on final frame)
  if (showN > 0 && showN < buildSteps.length - 1) {
    var hd = buildSteps[showN - 1];
    fill(pal.carve);
    rect(Math.floor(hd.c*cellSz), Math.floor(hd.r*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
  }

  // Walls of revealed cells
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

  // Border
  strokeWeight(Math.max(cellSz * 0.18, 2));
  line(cellSz,0, cols*cellSz,0);
  line(0,rows*cellSz, (cols-1)*cellSz,rows*cellSz);
  line(0,0, 0,rows*cellSz);
  line(cols*cellSz,0, cols*cellSz,rows*cellSz);
}

// ── Full maze + solve animation ─────────────────────────────────────────────

function drawFull() {
  var r, c, i;
  noStroke(); fill(pal.path);
  rect(0, 0, cols*cellSz, rows*cellSz);

  // Solution
  if (showSolution && solutionPath.length > 0) {
    var showN = Math.min(Math.floor(solveAnimFrame), solutionPath.length);

    noStroke();
    for (i = 0; i < showN; i++) {
      var sr = solutionPath[i][0], sc2 = solutionPath[i][1];
      var t = i / Math.max(solutionPath.length - 1, 1);
      var ec = hexRGB(pal.entry), scol = hexRGB(pal.solve);
      fill(lerp(ec[0],scol[0],t), lerp(ec[1],scol[1],t), lerp(ec[2],scol[2],t), 160);
      rect(Math.floor(sc2*cellSz), Math.floor(sr*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
    }

    stroke(pal.solve);
    strokeWeight(Math.max(cellSz * 0.25, 1.5));
    strokeCap(ROUND); strokeJoin(ROUND);
    noFill(); beginShape();
    // Line starts from entry marker position
    vertex(cellSz/2, -cellSz*0.15);
    for (i = 0; i < showN; i++) {
      vertex(solutionPath[i][1]*cellSz+cellSz/2, solutionPath[i][0]*cellSz+cellSz/2);
    }
    // If all cells shown, extend line to exit marker position
    if (showN >= solutionPath.length) {
      vertex((cols-1)*cellSz+cellSz/2, rows*cellSz+cellSz*0.15);
    }
    endShape();
  }

  // Walls
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

  // Always show entry and exit markers (so player knows the goal)
  noStroke();
  // Entry: top of first column
  fill(pal.entry);
  ellipse(cellSz/2, -cellSz*0.15, cellSz*0.65, cellSz*0.65);
  // Exit: bottom of last column
  fill(pal.solve);
  ellipse((cols-1)*cellSz+cellSz/2, rows*cellSz+cellSz*0.15, cellSz*0.65, cellSz*0.65);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
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
}
