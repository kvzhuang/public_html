// ============================================
// Maze Interactive — 互動式迷宮
// Click/tap cells to navigate. Find the exit!
// Compare your path with the optimal solution.
// ============================================

var rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────
// user = player path color (must differ from solve)

var PALETTES = [
  { name:"Classic",    wall:"#222222", path:"#F5F5F0", solve:"#E63946", user:"#3A86FF", entry:"#2A9D8F", bg:"#F5F5F0", carve:"#FFF9C4" },
  { name:"Blueprint",  wall:"#1B3A5C", path:"#E8EEF4", solve:"#FF6B35", user:"#8338EC", entry:"#FFBE0B", bg:"#E8EEF4", carve:"#BBDEFB" },
  { name:"Noir",       wall:"#0D0D0D", path:"#E8E8E8", solve:"#FF006E", user:"#3A86FF", entry:"#3A86FF", bg:"#E8E8E8", carve:"#CFD8DC" },
  { name:"Forest",     wall:"#1B4332", path:"#D8F3DC", solve:"#E63946", user:"#6A4C93", entry:"#F4A261", bg:"#D8F3DC", carve:"#A5D6A7" },
  { name:"Ocean",      wall:"#023E8A", path:"#CAF0F8", solve:"#F72585", user:"#06D6A0", entry:"#FFBE0B", bg:"#CAF0F8", carve:"#81D4FA" },
  { name:"Sunset",     wall:"#3D0C11", path:"#FFF1E6", solve:"#FF6B35", user:"#8338EC", entry:"#06D6A0", bg:"#FFF1E6", carve:"#FFCCBC" },
  { name:"Lavender",   wall:"#2E1A47", path:"#F0E6FF", solve:"#FF006E", user:"#FFBE0B", entry:"#06D6A0", bg:"#F0E6FF", carve:"#D1C4E9" },
  { name:"Mint",       wall:"#0B3D2E", path:"#E6FFF5", solve:"#FF5C5C", user:"#8338EC", entry:"#FFD166", bg:"#E6FFF5", carve:"#B2DFDB" },
  { name:"Rust",       wall:"#5C2A0A", path:"#FFF3E0", solve:"#1982C4", user:"#8338EC", entry:"#06D6A0", bg:"#FFF3E0", carve:"#FFE0B2" },
  { name:"Inverted",   wall:"#E8E8E8", path:"#1A1A2E", solve:"#FF006E", user:"#FFD166", entry:"#4CC9F0", bg:"#1A1A2E", carve:"#303050" },
  { name:"NeonDark",   wall:"#C8C8C8", path:"#0A0A1A", solve:"#05D9E8", user:"#FF79C6", entry:"#FF2A6D", bg:"#0A0A1A", carve:"#1A1A3A" },
  { name:"GoldDark",   wall:"#DAA520", path:"#0D0D0D", solve:"#FF5C5C", user:"#50FA7B", entry:"#4CC9F0", bg:"#0D0D0D", carve:"#2A2A10" },
  { name:"Coral",      wall:"#6B2039", path:"#FFF0F3", solve:"#0077B6", user:"#8338EC", entry:"#06D6A0", bg:"#FFF0F3", carve:"#FCE4EC" },
  { name:"Slate",      wall:"#2D3A4A", path:"#EDF2F7", solve:"#E63946", user:"#8338EC", entry:"#FFBE0B", bg:"#EDF2F7", carve:"#CFD8DC" },
  { name:"Terracotta", wall:"#8B4513", path:"#FFF8F0", solve:"#1982C4", user:"#E63946", entry:"#52B788", bg:"#FFF8F0", carve:"#FFECB3" },
  { name:"Midnight",   wall:"#AAAACC", path:"#12122A", solve:"#FF79C6", user:"#FFD700", entry:"#50FA7B", bg:"#12122A", carve:"#252545" },
];

// ── State ───────────────────────────────────────────────────────────────────

var pal;
var cols, rows;
var grid = [];
var cellSz, mgn, sz;

// Build animation
var buildSteps = [];
var buildAnimFrame = 0;
var buildAnimSpeed = 1;
var building = false;

// Solution
var solutionPath = [];
var showSolution = false;
var solveAnimFrame = 0;
var solveAnimSpeed = 1;
var solving = false;

// User path
var userPath = [];      // array of [r, c]
var userVisited = [];   // 2D bool array for quick lookup
var userWon = false;

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  sz = calcSz();
  var cnv = createCanvas(sz, sz);
  cnv.parent("maze-container");

  // Buttons
  var bSolve = document.getElementById("btn-solve");
  var bClear = document.getElementById("btn-clear");
  var bNew   = document.getElementById("btn-new");
  var bSave  = document.getElementById("btn-save");

  bSolve.ontouchend = function(e){ e.preventDefault(); triggerSolve(); };
  bSolve.onclick    = function(){ triggerSolve(); };
  bClear.ontouchend = function(e){ e.preventDefault(); clearUserPath(); };
  bClear.onclick    = function(){ clearUserPath(); };
  bNew.ontouchend   = function(e){ e.preventDefault(); newMaze(); };
  bNew.onclick      = function(){ newMaze(); };
  bSave.ontouchend  = function(e){ e.preventDefault(); doSave(); };
  bSave.onclick     = function(){ doSave(); };

  initMaze();
}

function calcSz() {
  var ctrlH = document.getElementById("controls").offsetHeight || 56;
  var statusH = document.getElementById("status").offsetHeight || 22;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - statusH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  return Math.max(Math.floor(Math.min(availW, availH)), 200);
}

function doSave() {
  saveCanvas("maze-interact-" + cols + "x" + rows + "-" + Date.now(), "png");
}

function newMaze() {
  sz = calcSz();
  resizeCanvas(sz, sz);
  initMaze();
}

function initMaze() {
  pal = PALETTES[Math.floor(rand() * PALETTES.length)];

  // 10-30 for interactive (smaller = more playable)
  var n = Math.floor(rand() * 21) + 10;
  cols = n; rows = n;

  mgn = sz * 0.05;
  cellSz = (sz - mgn * 2) / cols;
  solveAnimSpeed = Math.max(1, Math.floor(cols / 6));

  generateMaze();
  solveMaze();

  // Reset user state
  userPath = [[0, 0]];
  userVisited = [];
  for (var r = 0; r < rows; r++) {
    userVisited[r] = [];
    for (var c = 0; c < cols; c++) userVisited[r][c] = false;
  }
  userVisited[0][0] = true;
  userWon = false;

  showSolution = false;
  solveAnimFrame = 0;
  solving = false;

  // Build animation
  buildAnimSpeed = Math.max(1, Math.ceil(buildSteps.length / 120));
  buildAnimFrame = 0;
  building = true;

  setStatus("Tap cells to find your way out!");

  var bS = document.getElementById("btn-solve");
  if (bS) bS.style.background = pal.solve;
  var bC = document.getElementById("btn-clear");
  if (bC) bC.style.background = pal.user;

  loop();
}

function clearUserPath() {
  if (building) return;
  userPath = [[0, 0]];
  for (var r = 0; r < rows; r++)
    for (var c = 0; c < cols; c++) userVisited[r][c] = false;
  userVisited[0][0] = true;
  userWon = false;
  setStatus("Path cleared. Try again!");
  redraw();
}

function setStatus(msg) {
  var el = document.getElementById("status");
  if (el) { el.textContent = msg; el.className = ""; }
}

function setWin(steps, optimal) {
  var el = document.getElementById("status");
  if (el) {
    el.textContent = "You made it! Your steps: " + steps + " / Optimal: " + optimal;
    el.className = "win";
  }
}

// ── Solve ───────────────────────────────────────────────────────────────────

function triggerSolve() {
  if (building || solving) return;
  if (!showSolution) {
    showSolution = true;
    solveAnimFrame = 0;
    solving = true;
    loop();
  }
}

// ── User interaction: click cell to move ────────────────────────────────────

function mousePressed() {
  handleCellClick(mouseX, mouseY);
}

function touchStarted() {
  if (touches.length > 0) {
    handleCellClick(touches[0].x, touches[0].y);
  }
  return false;
}

function handleCellClick(mx, my) {
  if (building || solving || userWon) return;

  // Convert mouse position to grid cell
  var cx = mx - mgn;
  var cy = my - mgn;
  var col = Math.floor(cx / cellSz);
  var row = Math.floor(cy / cellSz);

  if (row < 0 || row >= rows || col < 0 || col >= cols) return;

  // Check if clicked cell is already in the path → backtrack to that point
  var pathIdx = -1;
  for (var p = 0; p < userPath.length; p++) {
    if (userPath[p][0] === row && userPath[p][1] === col) {
      pathIdx = p;
      break;
    }
  }

  if (pathIdx >= 0 && pathIdx < userPath.length - 1) {
    // Backtrack: remove everything after the clicked cell
    var removed = userPath.splice(pathIdx + 1);
    for (var k = 0; k < removed.length; k++) {
      userVisited[removed[k][0]][removed[k][1]] = false;
    }
    setStatus("Backtracked! Steps: " + (userPath.length - 1));
    redraw();
    return;
  }

  // Otherwise, try to move to the clicked cell
  var cur = userPath[userPath.length - 1];
  var curR = cur[0], curC = cur[1];
  var dr = row - curR;
  var dc = col - curC;

  // Must be exactly 1 step away (no diagonal)
  if (Math.abs(dr) + Math.abs(dc) !== 1) return;

  // Determine wall direction
  var wallDir = null;
  if (dr === -1) wallDir = "N";
  if (dr === 1)  wallDir = "S";
  if (dc === 1)  wallDir = "E";
  if (dc === -1) wallDir = "W";

  // Check if wall exists
  if (grid[curR][curC][wallDir]) return;

  // Check if already visited (prevent loops)
  if (userVisited[row][col]) return;

  // Move!
  userPath.push([row, col]);
  userVisited[row][col] = true;

  // Check win
  if (row === rows - 1 && col === cols - 1) {
    userWon = true;
    setWin(userPath.length - 1, solutionPath.length - 1);
  } else {
    setStatus("Steps: " + (userPath.length - 1));
  }

  redraw();
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
  var vis = [], par = [];
  for (r = 0; r < rows; r++) {
    vis[r] = []; par[r] = [];
    for (c = 0; c < cols; c++) { vis[r][c] = false; par[r][c] = null; }
  }
  var queue = [[0,0]];
  vis[0][0] = true;
  while (queue.length > 0) {
    var cell = queue.shift();
    r = cell[0]; c = cell[1];
    if (r === rows-1 && c === cols-1) break;
    var dirs = [["N",r-1,c],["S",r+1,c],["E",r,c+1],["W",r,c-1]];
    for (i = 0; i < dirs.length; i++) {
      var d = dirs[i][0], nr = dirs[i][1], nc = dirs[i][2];
      if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
      if (vis[nr][nc]||grid[r][c][d]) continue;
      vis[nr][nc] = true; par[nr][nc] = [r,c]; queue.push([nr,nc]);
    }
  }
  solutionPath = [];
  var cur = [rows-1,cols-1];
  while (cur) { solutionPath.push(cur); cur = par[cur[0]][cur[1]]; }
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

  // Advance animations
  if (building) {
    buildAnimFrame += buildAnimSpeed;
    if (buildAnimFrame >= buildSteps.length) {
      buildAnimFrame = buildSteps.length;
      building = false;
      background(pal.bg);
      push(); translate(mgn, mgn); drawFull(); pop();
      noLoop();
    }
  } else if (solving) {
    solveAnimFrame += solveAnimSpeed;
    if (solveAnimFrame >= solutionPath.length) {
      solveAnimFrame = solutionPath.length + 1;
      solving = false;
      setTimeout(function(){ noLoop(); }, 300);
    }
  }
}

// ── Build animation ─────────────────────────────────────────────────────────

function drawBuild() {
  var showN = Math.min(Math.floor(buildAnimFrame), buildSteps.length);
  var r, c, i;
  var revealed = [];
  for (r = 0; r < rows; r++) { revealed[r] = []; for (c = 0; c < cols; c++) revealed[r][c] = false; }
  for (i = 0; i < showN; i++) revealed[buildSteps[i].r][buildSteps[i].c] = true;

  noStroke(); fill(pal.wall);
  rect(0, 0, cols*cellSz, rows*cellSz);

  fill(pal.path);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    if (revealed[r][c]) rect(Math.floor(c*cellSz), Math.floor(r*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
  }

  if (showN > 0 && showN < buildSteps.length - 1) {
    var hd = buildSteps[showN-1];
    fill(pal.carve);
    rect(Math.floor(hd.c*cellSz), Math.floor(hd.r*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
  }

  stroke(pal.wall); strokeWeight(Math.max(cellSz*0.12, 1)); strokeCap(SQUARE);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    if (!revealed[r][c]) continue;
    var x=c*cellSz, y=r*cellSz, cl=grid[r][c];
    if (cl.N&&!(r===0&&c===0)) line(x,y,x+cellSz,y);
    if (cl.S&&!(r===rows-1&&c===cols-1)) line(x,y+cellSz,x+cellSz,y+cellSz);
    if (cl.W) line(x,y,x,y+cellSz);
    if (cl.E) line(x+cellSz,y,x+cellSz,y+cellSz);
  }

  strokeWeight(Math.max(cellSz*0.18, 2));
  line(cellSz,0, cols*cellSz,0);
  line(0,rows*cellSz, (cols-1)*cellSz,rows*cellSz);
  line(0,0, 0,rows*cellSz);
  line(cols*cellSz,0, cols*cellSz,rows*cellSz);
}

// ── Full maze draw ──────────────────────────────────────────────────────────

function drawFull() {
  var r, c, i;

  // Floor
  noStroke(); fill(pal.path);
  rect(0, 0, cols*cellSz, rows*cellSz);

  // ── User path (drawn BEFORE solution so solution overlays on top) ──
  if (userPath.length > 1) {
    // User path cells
    noStroke();
    for (i = 0; i < userPath.length; i++) {
      var ur = userPath[i][0], uc = userPath[i][1];
      fill(pal.user + "40"); // 25% opacity via hex alpha
      rect(Math.floor(uc*cellSz), Math.floor(ur*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
    }

    // User path line
    stroke(pal.user);
    strokeWeight(Math.max(cellSz * 0.2, 1.2));
    strokeCap(ROUND); strokeJoin(ROUND);
    noFill(); beginShape();
    vertex(cellSz/2, -cellSz*0.15); // from entry
    for (i = 0; i < userPath.length; i++) {
      vertex(userPath[i][1]*cellSz+cellSz/2, userPath[i][0]*cellSz+cellSz/2);
    }
    // If won, extend to exit
    if (userWon) {
      vertex((cols-1)*cellSz+cellSz/2, rows*cellSz+cellSz*0.15);
    }
    endShape();

    // Current position marker
    if (!userWon) {
      var last = userPath[userPath.length-1];
      noStroke(); fill(pal.user);
      ellipse(last[1]*cellSz+cellSz/2, last[0]*cellSz+cellSz/2, cellSz*0.5);
    }
  }

  // ── Solution path (only if requested) ──
  if (showSolution && solutionPath.length > 0) {
    var showN = Math.min(Math.floor(solveAnimFrame), solutionPath.length);

    noStroke();
    for (i = 0; i < showN; i++) {
      var sr = solutionPath[i][0], sc = solutionPath[i][1];
      var t = i / Math.max(solutionPath.length-1, 1);
      var ec = hexRGB(pal.entry), scol = hexRGB(pal.solve);
      fill(lerp(ec[0],scol[0],t), lerp(ec[1],scol[1],t), lerp(ec[2],scol[2],t), 140);
      rect(Math.floor(sc*cellSz), Math.floor(sr*cellSz), Math.ceil(cellSz)+1, Math.ceil(cellSz)+1);
    }

    stroke(pal.solve);
    strokeWeight(Math.max(cellSz*0.25, 1.5));
    strokeCap(ROUND); strokeJoin(ROUND);
    noFill(); beginShape();
    vertex(cellSz/2, -cellSz*0.15);
    for (i = 0; i < showN; i++) {
      vertex(solutionPath[i][1]*cellSz+cellSz/2, solutionPath[i][0]*cellSz+cellSz/2);
    }
    if (showN >= solutionPath.length) {
      vertex((cols-1)*cellSz+cellSz/2, rows*cellSz+cellSz*0.15);
    }
    endShape();
  }

  // ── Walls ──
  stroke(pal.wall);
  strokeWeight(Math.max(cellSz*0.12, 1));
  strokeCap(SQUARE);
  for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
    var x=c*cellSz, y=r*cellSz, cl=grid[r][c];
    if (cl.N) line(x,y,x+cellSz,y);
    if (cl.S) line(x,y+cellSz,x+cellSz,y+cellSz);
    if (cl.W) line(x,y,x,y+cellSz);
    if (cl.E) line(x+cellSz,y,x+cellSz,y+cellSz);
  }

  strokeWeight(Math.max(cellSz*0.18, 2));
  line(cellSz,0, cols*cellSz,0);
  line(0,rows*cellSz, (cols-1)*cellSz,rows*cellSz);
  line(0,0, 0,rows*cellSz);
  line(cols*cellSz,0, cols*cellSz,rows*cellSz);

  // ── Entry & Exit markers (always visible) ──
  noStroke();
  fill(pal.entry);
  ellipse(cellSz/2, -cellSz*0.15, cellSz*0.65);
  fill(pal.solve);
  ellipse((cols-1)*cellSz+cellSz/2, rows*cellSz+cellSz*0.15, cellSz*0.65);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function windowResized() {
  sz = calcSz();
  resizeCanvas(sz, sz);
  mgn = sz * 0.05;
  cellSz = (sz - mgn*2) / cols;
  redraw();
}

function keyPressed() {
  if (key === " ") newMaze();
  if (key === "s" || key === "S") doSave();
}
