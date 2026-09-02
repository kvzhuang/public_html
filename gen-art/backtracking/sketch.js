// ============================================
// Backtracking Visualizer
// 動態繪製決策樹：邊探索邊建枝、回溯時 cursor 跳上層、
// 失敗的分支變灰、找到解的分支變金色。
// 自動循環不同問題：Permutations / Combinations / N-Queens。
// ============================================

var PALETTES = [
  { name: "Aurora", bg:"#0a0a14", node:"#3a3a5a", edge:"#2a2a45", text:"#e0e0e0",
    visit:"#06D6A0", solution:"#FFD166", fail:"#5a3a3a", current:"#FF6B9D", problemAccent:"#06D6A0" },
  { name: "Vapor", bg:"#10001f", node:"#3a2a5a", edge:"#2a1a4a", text:"#e8d6ff",
    visit:"#94D0FF", solution:"#FBA8FF", fail:"#5a3a4a", current:"#FF6AD5", problemAccent:"#94D0FF" },
  { name: "Forest", bg:"#0a1410", node:"#2a4030", edge:"#1a3020", text:"#d8f0d8",
    visit:"#7FB069", solution:"#E9C46A", fail:"#5a4030", current:"#E76F51", problemAccent:"#7FB069" },
  { name: "Mono", bg:"#0d0d0d", node:"#3a3a3a", edge:"#2a2a2a", text:"#e0e0e0",
    visit:"#06D6A0", solution:"#FFD166", fail:"#4a4a4a", current:"#EF476F", problemAccent:"#06D6A0" },
  { name: "Sunset", bg:"#1a0011", node:"#4a2a3a", edge:"#3a1a2a", text:"#ffe6d8",
    visit:"#FFBE0B", solution:"#06D6A0", fail:"#5a3a3a", current:"#FB5607", problemAccent:"#FFBE0B" },
];

// ── Problem generators (return event trace + metadata) ─────────────────────

function permuteTrace(n) {
  var trace = [];
  var arr = [], used = [], path = [];
  for (var i = 1; i <= n; i++) { arr.push(i); used.push(false); }
  function back() {
    if (path.length === n) {
      trace.push({ type: "found", path: path.slice() });
      return;
    }
    for (var i = 0; i < n; i++) {
      if (used[i]) continue;
      path.push(arr[i]);
      used[i] = true;
      trace.push({ type: "enter", value: arr[i] });
      back();
      trace.push({ type: "exit" });
      path.pop();
      used[i] = false;
    }
  }
  back();
  return { trace: trace, depth: n };
}

function combineTrace(n, k) {
  var trace = [];
  var path = [];
  function back(start) {
    if (path.length === k) {
      trace.push({ type: "found", path: path.slice() });
      return;
    }
    for (var i = start; i <= n; i++) {
      path.push(i);
      trace.push({ type: "enter", value: i });
      back(i + 1);
      trace.push({ type: "exit" });
      path.pop();
    }
  }
  back(1);
  return { trace: trace, depth: k };
}

function nQueensTrace(n) {
  var trace = [];
  var cols = new Array(n).fill(-1);
  function isValid(row, col) {
    for (var r = 0; r < row; r++) {
      if (cols[r] === col) return false;
      if (Math.abs(cols[r] - col) === Math.abs(r - row)) return false;
    }
    return true;
  }
  function back(row) {
    if (row === n) {
      trace.push({ type: "found", path: cols.slice() });
      return;
    }
    for (var col = 0; col < n; col++) {
      if (!isValid(row, col)) continue;
      cols[row] = col;
      trace.push({ type: "enter", value: col });
      back(row + 1);
      trace.push({ type: "exit" });
      cols[row] = -1;
    }
  }
  back(0);
  return { trace: trace, depth: n };
}

// ── Problem cycle ───────────────────────────────────────────────────────────

function makeProblems() {
  return [
    { name: "Permutations of [1,2,3]", problem: "Permutation", n: 3, data: permuteTrace(3) },
    { name: "Permutations of [1,2,3,4]", problem: "Permutation", n: 4, data: permuteTrace(4) },
    { name: "Combinations C(4,2)", problem: "Combination", n: 4, k: 2, data: combineTrace(4, 2) },
    { name: "Combinations C(5,3)", problem: "Combination", n: 5, k: 3, data: combineTrace(5, 3) },
    { name: "N-Queens (4)", problem: "N-Queens", n: 4, data: nQueensTrace(4) },
  ];
}

// ── State ───────────────────────────────────────────────────────────────────

var PROBLEMS;
var problemIdx = 0;
var current;        // 當前 problem 物件
var pal;
var tree;           // root node
var allNodes;       // 線性陣列方便整體繪圖
var currentNode;
var path;           // 目前 cursor 從 root 到 currentNode 的 node 列表
var solutions;      // 已找到的解列表
var stepIdx;
var lastStepTime;
var stepInterval = 90;   // ms per step
var phase;           // "running" | "done"
var doneAt;          // 完成時間
var canvasW, canvasH;
var treeArea, sideArea;  // 區域 rect

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  PROBLEMS = makeProblems();
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("backtracking-container");

  document.getElementById("btn-next").onclick = nextProblem;
  document.getElementById("btn-speed").onclick = toggleSpeed;
  document.getElementById("btn-next").ontouchend = function(e){ e.preventDefault(); nextProblem(); };
  document.getElementById("btn-speed").ontouchend = function(e){ e.preventDefault(); toggleSpeed(); };

  problemIdx = Math.floor(Math.random() * PROBLEMS.length);
  initProblem();
}

function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  canvasW = availW;
  canvasH = availH;
  // 左 2/3 樹、右 1/3 side panel
  var sideW = Math.min(360, canvasW * 0.32);
  treeArea = { x: 20, y: 60, w: canvasW - sideW - 40, h: canvasH - 80 };
  sideArea = { x: canvasW - sideW - 10, y: 60, w: sideW, h: canvasH - 80 };
}

function windowResized() { applyDims(); resizeCanvas(canvasW, canvasH); }

function toggleSpeed() {
  if (stepInterval >= 200) stepInterval = 20;
  else if (stepInterval >= 90) stepInterval = 200;
  else if (stepInterval >= 40) stepInterval = 90;
  else stepInterval = 40;
  var btn = document.getElementById("btn-speed");
  btn.textContent = "Speed " + (stepInterval >= 200 ? "Slow" : stepInterval >= 90 ? "Normal" : stepInterval >= 40 ? "Fast" : "Turbo");
}

function nextProblem() {
  problemIdx = (problemIdx + 1) % PROBLEMS.length;
  initProblem();
}

function initProblem() {
  current = PROBLEMS[problemIdx];
  pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  document.body.style.background = pal.bg;
  document.getElementById("btn-next").style.background = pal.solution;

  // Build tree（一次跑完 trace 建出整棵樹的結構與佈局，但每個節點初始 state = "pending"）
  tree = { id: 0, label: "·", parent: null, children: [], depth: 0, state: "pending", isSolution: false, hasSolution: false };
  var curr = tree;
  var nextId = 1;
  for (var i = 0; i < current.data.trace.length; i++) {
    var evt = current.data.trace[i];
    if (evt.type === "enter") {
      var node = { id: nextId++, label: evt.value, parent: curr, children: [], depth: curr.depth + 1, state: "pending", isSolution: false, hasSolution: false };
      curr.children.push(node);
      curr = node;
    } else if (evt.type === "exit") {
      curr = curr.parent;
    } else if (evt.type === "found") {
      // 標 hasSolution（之後動畫到這一步才上 visual）
    }
  }
  layoutTree(tree);
  allNodes = [];
  collectNodes(tree, allNodes);

  currentNode = tree;
  tree.state = "current";
  path = [tree];
  solutions = [];
  stepIdx = 0;
  lastStepTime = millis();
  phase = "running";
  doneAt = 0;
}

function collectNodes(node, arr) {
  arr.push(node);
  for (var i = 0; i < node.children.length; i++) collectNodes(node.children[i], arr);
}

// 用 leaf-based 配置：每個 leaf 等寬
function layoutTree(root) {
  function countLeaves(node) {
    if (node.children.length === 0) return 1;
    var s = 0;
    for (var i = 0; i < node.children.length; i++) s += countLeaves(node.children[i]);
    return s;
  }
  function maxDepth(node) {
    if (node.children.length === 0) return node.depth;
    var d = node.depth;
    for (var i = 0; i < node.children.length; i++) d = Math.max(d, maxDepth(node.children[i]));
    return d;
  }
  var rootDepth = maxDepth(root);
  root._maxDepth = rootDepth;

  function place(node, l, r, y, levelH) {
    node._y01 = node.depth / Math.max(1, rootDepth);
    if (node.children.length === 0) {
      node._x01 = (l + r) / 2;
      return;
    }
    var total = countLeaves(node);
    var cursor = l;
    for (var i = 0; i < node.children.length; i++) {
      var c = node.children[i];
      var cw = (r - l) * countLeaves(c) / total;
      place(c, cursor, cursor + cw, y + levelH, levelH);
      cursor += cw;
    }
    var fx = node.children[0]._x01;
    var lx = node.children[node.children.length - 1]._x01;
    node._x01 = (fx + lx) / 2;
  }
  place(root, 0, 1, 0, 1 / Math.max(1, rootDepth));
}

function applyLayoutToScreen() {
  // 把 _x01 (0..1) 映射到 treeArea
  for (var i = 0; i < allNodes.length; i++) {
    var n = allNodes[i];
    n.x = treeArea.x + 30 + n._x01 * (treeArea.w - 60);
    n.y = treeArea.y + 40 + n._y01 * (treeArea.h - 80);
  }
}

// ── Animation step ──────────────────────────────────────────────────────────

function advanceStep() {
  if (stepIdx >= current.data.trace.length) return false;
  var evt = current.data.trace[stepIdx];

  if (evt.type === "enter") {
    var idx = currentNode._visitedCount || 0;
    var child = currentNode.children[idx];
    currentNode._visitedCount = idx + 1;
    if (currentNode.state === "current") currentNode.state = "explored";
    child.state = "current";
    currentNode = child;
    path.push(child);
  } else if (evt.type === "exit") {
    if (currentNode.hasSolution) {
      currentNode.state = "solution-path";
      currentNode.parent.hasSolution = true;
    } else {
      currentNode.state = "failed";
    }
    path.pop();
    currentNode = currentNode.parent;
    if (currentNode) currentNode.state = "current";
  } else if (evt.type === "found") {
    currentNode.isSolution = true;
    currentNode.hasSolution = true;
    currentNode.state = "solution-leaf";
    solutions.push({ path: evt.path.slice(), nodeId: currentNode.id });
  }
  stepIdx++;
  return true;
}

// ── Draw ───────────────────────────────────────────────────────────────────

function draw() {
  background(pal.bg);
  applyLayoutToScreen();

  var now = millis();
  while (phase === "running" && now - lastStepTime > stepInterval) {
    var ok = advanceStep();
    lastStepTime += stepInterval;
    if (!ok) {
      phase = "done";
      doneAt = now;
      break;
    }
  }

  // 自動切下一題
  if (phase === "done" && now - doneAt > 3500) {
    nextProblem();
  }

  drawTree();
  drawProblemPanel();
  drawHud();
}

function drawTree() {
  // edges 先畫（避免被節點圓圈蓋）
  for (var i = 0; i < allNodes.length; i++) {
    var n = allNodes[i];
    if (n.parent === null) continue;
    if (n.state === "pending") continue;
    drawEdge(n.parent, n, n);
  }

  // nodes
  for (var j = 0; j < allNodes.length; j++) {
    var node = allNodes[j];
    if (node.state === "pending") continue;
    drawNode(node);
  }

  // 強調 current path（粗線）
  if (path.length > 1) {
    stroke(pal.current);
    strokeWeight(2.5);
    noFill();
    for (var k = 1; k < path.length; k++) {
      line(path[k-1].x, path[k-1].y, path[k].x, path[k].y);
    }
  }
}

function drawEdge(a, b, child) {
  var col;
  if (child.state === "current") col = pal.current;
  else if (child.state === "solution-leaf" || child.state === "solution-path") col = pal.solution;
  else if (child.state === "failed") col = pal.fail;
  else col = pal.edge;
  stroke(col);
  strokeWeight(child.state === "current" ? 1.8 : 1.2);
  line(a.x, a.y, b.x, b.y);
}

function drawNode(node) {
  var r;
  if (node === tree) r = 8;
  else {
    // 越深越小
    r = Math.max(4, 9 - node.depth * 0.6);
  }

  var fillCol;
  if (node.state === "current") fillCol = pal.current;
  else if (node.state === "solution-leaf") fillCol = pal.solution;
  else if (node.state === "solution-path") fillCol = pal.solution;
  else if (node.state === "failed") fillCol = pal.fail;
  else if (node.state === "explored") fillCol = pal.node;
  else fillCol = pal.node;

  noStroke();
  // 發光暈圈（current / solution）
  if (node.state === "current") {
    var glow = hexRGB(pal.current);
    fill(glow[0], glow[1], glow[2], 60);
    ellipse(node.x, node.y, r * 4, r * 4);
  } else if (node.state === "solution-leaf") {
    var glow2 = hexRGB(pal.solution);
    fill(glow2[0], glow2[1], glow2[2], 80);
    ellipse(node.x, node.y, r * 3.5, r * 3.5);
  }

  fill(fillCol);
  ellipse(node.x, node.y, r * 2, r * 2);

  // label（只在淺層顯示，避免擁擠）
  if (node !== tree && node.depth <= 3 && allNodes.length < 80) {
    fill(pal.text);
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
    textSize(Math.max(8, r * 1.3));
    text(node.label, node.x, node.y - r - 8);
  }
}

// ── Problem-specific side panel ─────────────────────────────────────────────

function drawProblemPanel() {
  var x = sideArea.x, y = sideArea.y, w = sideArea.w, h = sideArea.h;
  noStroke();
  fill(pal.node);
  rect(x - 4, y - 4, w + 8, h + 8, 8);
  fill(pal.bg);
  rect(x, y, w, h, 6);

  fill(pal.problemAccent);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(14);
  text(current.problem.toUpperCase(), x + 14, y + 12);

  fill(pal.text);
  textStyle(NORMAL);
  textSize(13);
  text(current.name, x + 14, y + 32);

  // 當前路徑視覺化
  var cy = y + 65;
  fill(pal.text);
  textStyle(BOLD);
  textSize(11);
  text("CURRENT PATH", x + 14, cy);
  cy += 16;

  var pathLabels = [];
  for (var i = 1; i < path.length; i++) pathLabels.push(path[i].label);

  if (current.problem === "N-Queens") {
    drawQueenBoard(x + 14, cy, w - 28, current.n, pathLabels);
    cy += (w - 28) + 18;
  } else {
    // 顯示陣列槽
    drawArraySlots(x + 14, cy, w - 28, current.data.depth, pathLabels);
    cy += 36;
  }

  // solutions list
  fill(pal.text);
  textStyle(BOLD);
  textSize(11);
  text("SOLUTIONS  " + solutions.length, x + 14, cy);
  cy += 16;
  textStyle(NORMAL);
  textSize(11);
  // 顯示前 N 個解
  var maxShow = Math.floor((h - (cy - y) - 20) / 16);
  for (var s = 0; s < Math.min(solutions.length, maxShow); s++) {
    fill(pal.solution);
    var label;
    if (current.problem === "N-Queens") {
      label = "[" + solutions[s].path.join(", ") + "]";
    } else {
      label = "[" + solutions[s].path.join(", ") + "]";
    }
    text(label, x + 14, cy);
    cy += 16;
  }
  if (solutions.length > maxShow) {
    fill(pal.text);
    text("…and " + (solutions.length - maxShow) + " more", x + 14, cy);
  }
}

function drawArraySlots(x, y, w, n, values) {
  var slotW = Math.min(40, (w - (n - 1) * 6) / n);
  var totalW = slotW * n + (n - 1) * 6;
  var sx = x + (w - totalW) / 2;
  for (var i = 0; i < n; i++) {
    var px = sx + i * (slotW + 6);
    noStroke();
    fill(pal.node);
    rect(px, y, slotW, slotW, 4);
    if (i < values.length) {
      fill(pal.current);
      rect(px + 2, y + 2, slotW - 4, slotW - 4, 3);
      fill(pal.text);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(slotW * 0.4);
      text(values[i], px + slotW / 2, y + slotW / 2);
    }
  }
}

function drawQueenBoard(x, y, w, n, queens) {
  var cell = w / n;
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      var px = x + c * cell, py = y + r * cell;
      noStroke();
      fill((r + c) % 2 === 0 ? pal.node : pal.edge);
      rect(px, py, cell, cell);
    }
  }
  for (var i = 0; i < queens.length; i++) {
    var qc = queens[i];
    var cx = x + qc * cell + cell / 2;
    var cy = y + i * cell + cell / 2;
    fill(pal.solution);
    noStroke();
    ellipse(cx, cy, cell * 0.65, cell * 0.65);
    // crown
    fill(pal.bg);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(cell * 0.4);
    text("♛", cx, cy);
  }
}

// ── HUD ────────────────────────────────────────────────────────────────────

function drawHud() {
  noStroke();
  fill(pal.text);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(18);
  text("BACKTRACKING", 20, 14);

  textStyle(NORMAL);
  textSize(12);
  fill(180);
  text(pal.name.toUpperCase() + " · STEP " + stepIdx + " / " + current.data.trace.length, 20, 36);

  // legend 右下角
  var lx = treeArea.x + treeArea.w - 320;
  var ly = treeArea.y + treeArea.h - 28;
  drawLegendDot(lx,       ly, pal.current,   "CURRENT");
  drawLegendDot(lx + 90,  ly, pal.solution,  "SOLUTION");
  drawLegendDot(lx + 190, ly, pal.fail,      "FAILED");
  drawLegendDot(lx + 270, ly, pal.node,      "VISITED");
}

function drawLegendDot(x, y, color, label) {
  noStroke();
  fill(color);
  ellipse(x, y, 8, 8);
  fill(180);
  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  textSize(10);
  text(label, x + 8, y);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function keyPressed() {
  if (key === " " || key === "n" || key === "N") nextProblem();
  if (key === "+" || key === "=") toggleSpeed();
}
