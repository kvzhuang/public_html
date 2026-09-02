// ============================================
// 四色定理 Four Color Theorem - Generative Art
// 任何平面地圖只需四種顏色，即可使相鄰區域不同色
// Voronoi 地圖 + 貪婪四色著色演算法
// ============================================

const rand = fxrand;

// --- 四色配色方案 ---
const COLOR_SCHEMES = [
  {
    name: "Classic",
    bg: '#1a1a2e',
    colors: ['#E63946', '#457B9D', '#F4A261', '#2A9D8F'],
    border: '#0a0a18',
    text: '#ffffff',
  },
  {
    name: "Pastel",
    bg: '#F5F0E8',
    colors: ['#FF8A8A', '#7EC8E3', '#FFD93D', '#6BCB77'],
    border: '#8A8070',
    text: '#3A3530',
  },
  {
    name: "Neon",
    bg: '#0a0a1a',
    colors: ['#FF006E', '#3A86FF', '#FFBE0B', '#06D6A0'],
    border: '#1a1a3a',
    text: '#ffffff',
  },
  {
    name: "Earth",
    bg: '#F0EDE5',
    colors: ['#C1666B', '#4A7C59', '#D4A373', '#48639C'],
    border: '#6A6050',
    text: '#3A3020',
  },
  {
    name: "Sunset",
    bg: '#1E1028',
    colors: ['#FF4D6D', '#C77DFF', '#FFD166', '#06D6A0'],
    border: '#0E0818',
    text: '#ffffff',
  },
  {
    name: "Nordic",
    bg: '#E8ECF0',
    colors: ['#5E60CE', '#48BFE3', '#F77F00', '#64DFDF'],
    border: '#6A7080',
    text: '#2A3040',
  },
  {
    name: "Vintage",
    bg: '#2C2C34',
    colors: ['#D64045', '#1D3461', '#E8C547', '#7B9E89'],
    border: '#1A1A20',
    text: '#E0D8D0',
  },
  {
    name: "Candy",
    bg: '#FFF5F5',
    colors: ['#FF6B6B', '#845EC2', '#FFC75F', '#00C9A7'],
    border: '#C0A0A0',
    text: '#4A3040',
  },
];

let scheme;
let seeds = [];      // Voronoi 種子點
let cellMap;         // 每個像素屬於哪個 cell
let adjacency = {};  // 鄰接關係
let cellColors = {}; // 每個 cell 的顏色 index
let cellCount;
let canvasSize;
let resolution;      // 計算解析度（降低以加速）

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  pixelDensity(1); // 固定 pixel density，避免行動裝置偏移
  createCanvas(canvasSize, canvasSize);

  scheme = COLOR_SCHEMES[floor(rand() * COLOR_SCHEMES.length)];
  cellCount = floor(rand() * 50) + 30; // 30~79 個區域
  resolution = 3; // 每 3 像素取樣（用 rect 填色所以可以粗一點）

  generateMap();

  window.$fxhashFeatures = {
    "Palette": scheme.name,
    "Regions": cellCount,
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

// ===== 生成地圖 =====
function generateMap() {
  seeds = [];
  adjacency = {};
  cellColors = {};

  // 用 Lloyd 鬆弛法讓種子點分布更均勻
  // 先隨機撒點
  for (let i = 0; i < cellCount; i++) {
    seeds.push({
      x: rand() * canvasSize,
      y: rand() * canvasSize,
    });
  }

  // 做 2 輪 Lloyd relaxation
  for (let iter = 0; iter < 2; iter++) {
    lloydRelax();
  }

  // 計算 Voronoi 分區（低解析度）
  computeVoronoi();

  // 建立鄰接圖
  buildAdjacency();

  // 四色著色（貪婪演算法 + 回溯）
  colorMap();
}

// ===== Lloyd 鬆弛 =====
function lloydRelax() {
  const res = 4; // 粗略計算用
  const w = floor(canvasSize / res);
  const h = floor(canvasSize / res);
  const sumX = new Float64Array(cellCount);
  const sumY = new Float64Array(cellCount);
  const count = new Uint32Array(cellCount);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px * res;
      const y = py * res;
      let minD = Infinity, minI = 0;
      for (let i = 0; i < cellCount; i++) {
        const dx = x - seeds[i].x;
        const dy = y - seeds[i].y;
        const d = dx * dx + dy * dy;
        if (d < minD) { minD = d; minI = i; }
      }
      sumX[minI] += x;
      sumY[minI] += y;
      count[minI]++;
    }
  }

  for (let i = 0; i < cellCount; i++) {
    if (count[i] > 0) {
      seeds[i].x = sumX[i] / count[i];
      seeds[i].y = sumY[i] / count[i];
    }
  }
}

// ===== 計算 Voronoi =====
function computeVoronoi() {
  const w = floor(canvasSize / resolution);
  const h = floor(canvasSize / resolution);
  cellMap = new Int16Array(w * h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px * resolution;
      const y = py * resolution;
      let minD = Infinity, minI = 0;
      for (let i = 0; i < cellCount; i++) {
        const dx = x - seeds[i].x;
        const dy = y - seeds[i].y;
        const d = dx * dx + dy * dy;
        if (d < minD) { minD = d; minI = i; }
      }
      cellMap[py * w + px] = minI;
    }
  }
}

// ===== 建立鄰接圖 =====
function buildAdjacency() {
  const w = floor(canvasSize / resolution);
  const h = floor(canvasSize / resolution);

  for (let i = 0; i < cellCount; i++) {
    adjacency[i] = new Set();
  }

  for (let py = 0; py < h - 1; py++) {
    for (let px = 0; px < w - 1; px++) {
      const c = cellMap[py * w + px];
      const right = cellMap[py * w + px + 1];
      const down = cellMap[(py + 1) * w + px];

      if (c !== right) {
        adjacency[c].add(right);
        adjacency[right].add(c);
      }
      if (c !== down) {
        adjacency[c].add(down);
        adjacency[down].add(c);
      }
    }
  }
}

// ===== 四色著色（回溯法確保正確） =====
function colorMap() {
  // 按鄰居數排序（多的先上色，加速回溯）
  const order = Array.from({ length: cellCount }, (_, i) => i);
  order.sort((a, b) => adjacency[b].size - adjacency[a].size);

  // 初始化
  for (let i = 0; i < cellCount; i++) {
    cellColors[i] = -1;
  }

  // 回溯法著色
  backtrackColor(order, 0);
}

function isColorSafe(node, c) {
  for (const neighbor of adjacency[node]) {
    if (cellColors[neighbor] === c) return false;
  }
  return true;
}

function backtrackColor(order, idx) {
  if (idx >= order.length) return true; // 全部著色完成

  const node = order[idx];

  for (let c = 0; c < 4; c++) {
    if (isColorSafe(node, c)) {
      cellColors[node] = c;
      if (backtrackColor(order, idx + 1)) return true;
      cellColors[node] = -1; // 回溯
    }
  }

  return false; // 無解（理論上平面圖不會發生）
}

// ===== 繪製 =====
function draw() {
  background(scheme.bg);

  const w = floor(canvasSize / resolution);
  const h = floor(canvasSize / resolution);
  const borderW = max(1, canvasSize * 0.003);

  noStroke();

  // 填色 + 即時畫邊界（統一座標系統）
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const cellIdx = cellMap[py * w + px];
      const colorIdx = cellColors[cellIdx];

      const x = px * resolution;
      const y = py * resolution;

      // 檢查是否在邊界上
      let isBorder = false;
      if (px < w - 1 && cellMap[py * w + px + 1] !== cellIdx) isBorder = true;
      if (py < h - 1 && cellMap[(py + 1) * w + px] !== cellIdx) isBorder = true;
      if (px > 0 && cellMap[py * w + px - 1] !== cellIdx) isBorder = true;
      if (py > 0 && cellMap[(py - 1) * w + px] !== cellIdx) isBorder = true;

      if (isBorder) {
        fill(scheme.border);
      } else {
        fill(scheme.colors[colorIdx]);
      }
      rect(x, y, resolution, resolution);
    }
  }

  // 種子點（小圓點）
  drawSeeds();

  // 標題 & 說明
  drawInfo();
}

// ===== 種子點 =====
function drawSeeds() {
  noStroke();
  for (let i = 0; i < cellCount; i++) {
    const col = color(scheme.border);
    col.setAlpha(100);
    fill(col);
    const r = max(2, canvasSize * 0.005);
    ellipse(seeds[i].x, seeds[i].y, r, r);
  }
}

// ===== 資訊文字 =====
function drawInfo() {
  // 半透明背景條
  noStroke();
  const bgC = color(scheme.bg);
  bgC.setAlpha(180);
  fill(bgC);
  rect(0, canvasSize - canvasSize * 0.08, canvasSize, canvasSize * 0.08);

  fill(scheme.text);
  textAlign(LEFT);
  textSize(canvasSize * 0.022);
  text(`Four Color Theorem  |  ${cellCount} regions  |  4 colors`, canvasSize * 0.03, canvasSize * 0.97);

  // 色塊圖例
  const legendX = canvasSize * 0.75;
  const legendY = canvasSize * 0.955;
  const boxSize = canvasSize * 0.018;
  for (let i = 0; i < 4; i++) {
    fill(scheme.colors[i]);
    stroke(scheme.border);
    strokeWeight(0.5);
    rect(legendX + i * (boxSize + 4), legendY - boxSize, boxSize, boxSize, 2);
  }
}

// ===== 互動 =====
function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  generateMap();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    scheme = COLOR_SCHEMES[floor(rand() * COLOR_SCHEMES.length)];
    cellCount = floor(rand() * 50) + 30;
    generateMap();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`four-color-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}
