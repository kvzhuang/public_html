// ============================================
// Botanical Line Art - Generative Art
// Pen plotter / 鋼筆線描風格的植物生成藝術
// 參考：有機樹枝 + 格紋背景 + 飄落花瓣
// ============================================

const rand = fxrand;

// --- 構圖模式 ---
// 向上生長的模式佔多數
const MODES = [
  'single_tree',     // 單株大樹，居中
  'old_tree',        // 老樹，從邊緣長出
  'twin_trees',      // 雙樹
  'forest',          // 小樹林 3~5 棵
  'hanging_vine',    // 垂藤
  'mixed',           // 老樹 + 垂藤
];
// 權重：向上的模式出現機率更高
const MODE_WEIGHTS = [30, 22, 20, 18, 5, 5];

// --- 線條色調 ---
const TONES = [
  { name: "墨黑", bg: '#F5F0E8', line: '#1a1a1a', lineAlpha: 240, gridAlpha: 45 },
  { name: "焦茶", bg: '#FAF5ED', line: '#3E2723', lineAlpha: 230, gridAlpha: 40 },
  { name: "靛墨", bg: '#F0F0F5', line: '#1A237E', lineAlpha: 220, gridAlpha: 42 },
  { name: "松煙", bg: '#F2F5F0', line: '#2E3D2E', lineAlpha: 230, gridAlpha: 40 },
  { name: "鐵灰", bg: '#F0F0F0', line: '#37474F', lineAlpha: 235, gridAlpha: 45 },
  { name: "赤墨", bg: '#F8F2F0', line: '#4E342E', lineAlpha: 225, gridAlpha: 38 },
];

let tone;
let mode;
let branches = [];
let leaves = [];
let fallingPetals = [];
let canvasSize;

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);

  tone = TONES[floor(rand() * TONES.length)];
  mode = weightedPick(MODES, MODE_WEIGHTS);

  window.$fxhashFeatures = {
    "Tone": tone.name,
    "Mode": mode,
  };

  generateScene();
  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function generateScene() {
  // 嘗試生成，若枝幹不夠多就重來（最多 10 次）
  let attempts = 0;
  do {
    branches = [];
    leaves = [];
    fallingPetals = [];

    if (mode === 'single_tree') {
      generateSingleTree();
    } else if (mode === 'old_tree') {
      generateOldTree();
    } else if (mode === 'twin_trees') {
      generateTwinTrees();
    } else if (mode === 'forest') {
      generateForest();
    } else if (mode === 'hanging_vine') {
      generateHangingVine();
    } else {
      generateOldTree(0.05, 0.55);
      generateHangingVine(0.5, 1.0);
    }

    attempts++;
    // 檢查畫面內的枝幹數量是否足夠
  } while (countVisibleBranches() < 20 && attempts < 10);

  // 飄落花瓣/葉片
  const petalCount = floor(rand() * 30) + 15;
  for (let i = 0; i < petalCount; i++) {
    fallingPetals.push({
      x: canvasSize * 0.06 + rand() * canvasSize * 0.88,
      y: canvasSize * 0.3 + rand() * canvasSize * 0.60,
      size: rand() * 6 + 2,
      angle: rand() * TWO_PI,
      type: floor(rand() * 3), // 0=圓, 1=橢圓, 2=葉形
    });
  }
}

// ===== 單株大樹（居中，向上） =====
function generateSingleTree() {
  const startX = canvasSize * (0.35 + rand() * 0.3);
  const startY = canvasSize * 0.93;
  const trunkAngle = -HALF_PI + (rand() - 0.5) * 0.15;
  const trunkLen = canvasSize * (0.3 + rand() * 0.15);
  const maxDepth = floor(rand() * 3) + 8;

  growBranch(startX, startY, trunkAngle, trunkLen, canvasSize * 0.025, maxDepth, 0, 0.05, 0.95, true);
}

// ===== 雙樹 =====
function generateTwinTrees() {
  // 左樹
  const lx = canvasSize * (0.15 + rand() * 0.12);
  const ly = canvasSize * 0.92;
  const la = -HALF_PI + (rand() - 0.5) * 0.3;
  const ll = canvasSize * (0.22 + rand() * 0.12);
  growBranch(lx, ly, la, ll, canvasSize * 0.016, floor(rand() * 2) + 7, 0, 0, 0.55, true);

  // 右樹
  const rx = canvasSize * (0.68 + rand() * 0.15);
  const ry = canvasSize * 0.92;
  const ra = -HALF_PI + (rand() - 0.5) * 0.3;
  const rl = canvasSize * (0.2 + rand() * 0.12);
  growBranch(rx, ry, ra, rl, canvasSize * 0.014, floor(rand() * 2) + 7, 0, 0.45, 1, true);
}

// ===== 小樹林（3~5 棵） =====
function generateForest() {
  const treeCount = floor(rand() * 3) + 3;
  const positions = [];

  for (let i = 0; i < treeCount; i++) {
    // 均勻分布但帶隨機
    const baseX = (i + 0.5) / treeCount;
    const startX = canvasSize * (baseX + (rand() - 0.5) * 0.12);
    const startY = canvasSize * 0.92;
    const angle = -HALF_PI + (rand() - 0.5) * 0.35;
    const len = canvasSize * (0.15 + rand() * 0.15);
    const thick = canvasSize * (0.008 + rand() * 0.01);
    const depth = floor(rand() * 2) + 6;
    const xMin = max(0, baseX - 0.25);
    const xMax = min(1, baseX + 0.25);

    growBranch(startX, startY, angle, len, thick, depth, 0, xMin, xMax, true);
  }
}

// ===== 老樹生成（從邊緣長出） =====
function generateOldTree(xMin = 0, xMax = 1) {
  // 可從左、右、下方邊緣長出
  const side = rand();
  let startX, startY, trunkAngle;

  if (side < 0.35) {
    // 從左側邊緣（確保在畫面內）
    startX = canvasSize * 0.05;
    startY = canvasSize * (0.55 + rand() * 0.35);
    trunkAngle = -HALF_PI + 0.2 + rand() * 0.4; // 向右上長
  } else if (side < 0.7) {
    // 從底部（最常見）
    startX = canvasSize * (0.2 + rand() * 0.6);
    startY = canvasSize * 0.93;
    trunkAngle = -HALF_PI + (rand() - 0.5) * 0.35;
  } else {
    // 從右側邊緣
    startX = canvasSize * 0.95;
    startY = canvasSize * (0.55 + rand() * 0.35);
    trunkAngle = -HALF_PI - 0.2 - rand() * 0.4; // 向左上長
  }

  const trunkLen = canvasSize * (0.25 + rand() * 0.15);
  const maxDepth = floor(rand() * 3) + 7;

  growBranch(startX, startY, trunkAngle, trunkLen, canvasSize * 0.018, maxDepth, 0, xMin, xMax, true);
}

// ===== 垂藤生成 =====
function generateHangingVine(xMin = 0, xMax = 1) {
  const vineCount = floor(rand() * 6) + 4;
  for (let v = 0; v < vineCount; v++) {
    const startX = canvasSize * (xMin + rand() * (xMax - xMin));
    const startY = canvasSize * (-0.05 + rand() * 0.15);
    // 向下生長，稍微偏斜
    const angle = HALF_PI + (rand() - 0.5) * 0.8;
    const len = canvasSize * (0.12 + rand() * 0.18);
    const maxDepth = floor(rand() * 2) + 5;

    growBranch(startX, startY, angle, len, canvasSize * 0.006, maxDepth, 0, xMin, xMax, false);
  }
}

// ===== 遞迴分支 =====
// growUp: true = 向上生長的樹（限制角度不低於水平）
function growBranch(x, y, angle, length, thickness, maxDepth, depth, xMin, xMax, growUp) {
  if (growUp === undefined) growUp = true;
  if (depth > maxDepth || length < 2 || thickness < 0.3) return;

  // 沿路徑加一些彎曲
  const segments = floor(rand() * 3) + 3;
  let cx = x, cy = y;
  let curAngle = angle;

  for (let s = 0; s < segments; s++) {
    const segLen = length / segments;
    curAngle += (rand() - 0.5) * 0.25;

    // 向上長的樹：限制角度在上半圓（-PI ~ 0），允許稍微超過水平
    if (growUp) {
      curAngle = constrain(curAngle, -PI + 0.15, -0.15);
    }

    let nx = cx + cos(curAngle) * segLen;
    let ny = cy + sin(curAngle) * segLen;

    // 限制在框線內（框線在 3% 邊距）
    const margin = canvasSize * 0.04;
    nx = constrain(nx, margin, canvasSize - margin);
    ny = constrain(ny, margin, canvasSize - margin);

    const t = s / segments;
    const w = lerp(thickness, thickness * 0.6, t);

    branches.push({ x1: cx, y1: cy, x2: nx, y2: ny, weight: w, depth: depth });

    cx = nx;
    cy = ny;
  }

  // 在末端產生葉子（更早開始長葉、更多數量）
  if (depth >= maxDepth - 3) {
    const leafCount = floor(rand() * 8) + 4;
    for (let i = 0; i < leafCount; i++) {
      const la = curAngle + (rand() - 0.5) * PI;
      const ld = rand() * length * 0.4;
      const lm = canvasSize * 0.05;
      const lxp = constrain(cx + cos(la) * ld, lm, canvasSize - lm);
      const lyp = constrain(cy + sin(la) * ld, lm, canvasSize - lm);
      leaves.push({
        x: lxp,
        y: lyp,
        size: rand() * 8 + 3,
        angle: la,
        type: floor(rand() * 4),
        detail: floor(rand() * 3) + 2,
      });
    }
  }

  // 分支（增加數量）
  const branchCount = floor(rand() * 3) + 2;
  for (let b = 0; b < branchCount; b++) {
    const spread = (rand() - 0.5) * 1.0;
    let newAngle = curAngle + spread;

    // 向上長的樹：分支也限制在上半圓
    if (growUp) {
      newAngle = constrain(newAngle, -PI + 0.1, -0.1);
    }
    const newLen = length * (0.55 + rand() * 0.25);
    const newThick = thickness * (0.5 + rand() * 0.25);

    // 限制在框線範圍內
    const bMargin = canvasSize * 0.04;
    const testX = cx + cos(newAngle) * newLen;
    const testY = cy + sin(newAngle) * newLen;
    if (testX < bMargin || testX > canvasSize - bMargin) continue;
    if (testY < bMargin || testY > canvasSize - bMargin) continue;

    growBranch(cx, cy, newAngle, newLen, newThick, maxDepth, depth + 1, xMin, xMax, growUp);
  }

  // 額外的小枝（增加密度）
  if (depth >= 1 && rand() < 0.55) {
    let sideAngle = curAngle + (rand() < 0.5 ? 1 : -1) * (0.5 + rand() * 0.8);
    if (growUp) {
      sideAngle = constrain(sideAngle, -PI + 0.1, -0.1);
    }
    const sideLen = length * (0.3 + rand() * 0.2);
    growBranch(cx, cy, sideAngle, sideLen, thickness * 0.4, maxDepth, depth + 2, xMin, xMax, growUp);
  }
}

// ===== 繪製 =====
function draw() {
  background(tone.bg);

  drawGrid();
  drawBranches();
  drawLeaves();
  drawFallingPetals();
  drawBorder();
}

// ===== 格紋背景 =====
function drawGrid() {
  const c = color(tone.line);
  c.setAlpha(tone.gridAlpha);
  stroke(c);

  // 垂直線
  const vGap = canvasSize * (0.008 + rand() * 0.006);
  strokeWeight(0.3);
  for (let x = canvasSize * 0.05; x < canvasSize * 0.95; x += vGap) {
    // 微小偏移讓格紋有手繪感
    const offset = (rand() - 0.5) * 0.5;
    line(x + offset, canvasSize * 0.04, x + offset + (rand() - 0.5) * 2, canvasSize * 0.96);
  }

  // 水平線
  const hGap = canvasSize * (0.008 + rand() * 0.006);
  strokeWeight(0.25);
  for (let y = canvasSize * 0.05; y < canvasSize * 0.95; y += hGap) {
    const offset = (rand() - 0.5) * 0.5;
    line(canvasSize * 0.04, y + offset, canvasSize * 0.96, y + offset + (rand() - 0.5) * 2);
  }
}

// ===== 樹枝 =====
function drawBranches() {
  const c = color(tone.line);

  for (const b of branches) {
    c.setAlpha(tone.lineAlpha);
    stroke(c);
    strokeWeight(b.weight);
    noFill();

    // 主線
    line(b.x1, b.y1, b.x2, b.y2);

    // 粗枝加輪廓線（模擬鋼筆描邊）
    if (b.weight > 2) {
      c.setAlpha(tone.lineAlpha * 0.4);
      stroke(c);
      strokeWeight(0.5);

      // 左右偏移的平行線
      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const len = sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len * b.weight * 0.5;
        const ny = dx / len * b.weight * 0.5;
        line(b.x1 + nx, b.y1 + ny, b.x2 + nx, b.y2 + ny);
        line(b.x1 - nx, b.y1 - ny, b.x2 - nx, b.y2 - ny);
      }
    }

    // 細枝加毛刺/小叉（增加有機感）
    if (b.weight < 1.5 && rand() < 0.3) {
      c.setAlpha(tone.lineAlpha * 0.5);
      stroke(c);
      strokeWeight(0.4);
      const mx = (b.x1 + b.x2) / 2;
      const my = (b.y1 + b.y2) / 2;
      const sa = atan2(b.y2 - b.y1, b.x2 - b.x1) + (rand() < 0.5 ? 0.8 : -0.8);
      const sl = b.weight * 4 + rand() * 5;
      line(mx, my, mx + cos(sa) * sl, my + sin(sa) * sl);
    }
  }
}

// ===== 葉子 =====
function drawLeaves() {
  const c = color(tone.line);

  for (const l of leaves) {
    push();
    translate(l.x, l.y);
    rotate(l.angle);

    c.setAlpha(tone.lineAlpha * 0.8);
    stroke(c);
    noFill();

    if (l.type === 0) {
      // 橢圓葉
      strokeWeight(0.6);
      ellipse(0, 0, l.size * 1.5, l.size * 0.8);
      // 葉脈
      strokeWeight(0.3);
      line(0, -l.size * 0.35, 0, l.size * 0.35);
      for (let v = 0; v < l.detail; v++) {
        const vy = lerp(-l.size * 0.25, l.size * 0.25, v / l.detail);
        const vx = l.size * 0.3 * (1 - abs(vy) / (l.size * 0.35));
        line(0, vy, vx, vy - l.size * 0.08);
        line(0, vy, -vx, vy - l.size * 0.08);
      }
    } else if (l.type === 1) {
      // 圓形花苞
      strokeWeight(0.6);
      ellipse(0, 0, l.size, l.size);
      // 花瓣線
      for (let p = 0; p < 5; p++) {
        const pa = (TWO_PI / 5) * p;
        const pr = l.size * 0.35;
        strokeWeight(0.4);
        line(0, 0, cos(pa) * pr, sin(pa) * pr);
      }
      // 中心小圓
      ellipse(0, 0, l.size * 0.3, l.size * 0.3);
    } else if (l.type === 2) {
      // 多瓣花
      strokeWeight(0.5);
      const petals = floor(rand() * 3) + 4;
      for (let p = 0; p < petals; p++) {
        const pa = (TWO_PI / petals) * p;
        push();
        rotate(pa);
        beginShape();
        vertex(0, 0);
        bezierVertex(
          -l.size * 0.2, -l.size * 0.3,
          l.size * 0.2, -l.size * 0.5,
          0, -l.size * 0.55
        );
        bezierVertex(
          -l.size * 0.2, -l.size * 0.5,
          l.size * 0.2, -l.size * 0.3,
          0, 0
        );
        endShape();
        pop();
      }
      // 花心
      ellipse(0, 0, l.size * 0.25, l.size * 0.25);
    } else {
      // 尖葉
      strokeWeight(0.5);
      beginShape();
      vertex(0, l.size * 0.6);
      bezierVertex(
        -l.size * 0.4, l.size * 0.2,
        -l.size * 0.3, -l.size * 0.3,
        0, -l.size * 0.6
      );
      bezierVertex(
        l.size * 0.3, -l.size * 0.3,
        l.size * 0.4, l.size * 0.2,
        0, l.size * 0.6
      );
      endShape();
      // 中脈
      strokeWeight(0.3);
      line(0, l.size * 0.5, 0, -l.size * 0.5);
    }

    pop();
  }
}

// ===== 飄落花瓣 =====
function drawFallingPetals() {
  const c = color(tone.line);
  c.setAlpha(tone.lineAlpha * 0.5);
  stroke(c);
  noFill();

  for (const p of fallingPetals) {
    push();
    translate(p.x, p.y);
    rotate(p.angle);

    if (p.type === 0) {
      // 小圓
      strokeWeight(0.5);
      ellipse(0, 0, p.size, p.size);
    } else if (p.type === 1) {
      // 小橢圓
      strokeWeight(0.4);
      ellipse(0, 0, p.size * 1.3, p.size * 0.6);
    } else {
      // 小葉形
      strokeWeight(0.4);
      beginShape();
      vertex(0, -p.size * 0.5);
      bezierVertex(
        p.size * 0.3, -p.size * 0.15,
        p.size * 0.3, p.size * 0.15,
        0, p.size * 0.5
      );
      bezierVertex(
        -p.size * 0.3, p.size * 0.15,
        -p.size * 0.3, -p.size * 0.15,
        0, -p.size * 0.5
      );
      endShape();
    }

    pop();
  }
}

// ===== 邊框 =====
function drawBorder() {
  const c = color(tone.line);
  c.setAlpha(40);
  stroke(c);
  strokeWeight(0.8);
  noFill();
  rect(canvasSize * 0.03, canvasSize * 0.03, canvasSize * 0.94, canvasSize * 0.94);
}

// ===== 檢查畫面內枝幹數量 =====
function countVisibleBranches() {
  let count = 0;
  const margin = canvasSize * 0.05;
  for (const b of branches) {
    // 至少一端在畫面內
    const x1in = b.x1 >= -margin && b.x1 <= canvasSize + margin && b.y1 >= -margin && b.y1 <= canvasSize + margin;
    const x2in = b.x2 >= -margin && b.x2 <= canvasSize + margin && b.y2 >= -margin && b.y2 <= canvasSize + margin;
    if (x1in || x2in) count++;
  }
  return count;
}

// ===== 帶權重隨機選擇 =====
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[0];
}

// ===== 互動 =====
function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  generateScene();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    tone = TONES[floor(rand() * TONES.length)];
    mode = weightedPick(MODES, MODE_WEIGHTS);
    generateScene();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`botanical-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}
