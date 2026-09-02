// ============================================
// Mountain Landscape - Generative Art
// 層疊雪山、山坡、針葉林與湖面倒影
// Inspired by Phillipa Hudson
// ============================================

const rand = fxrand;

// --- 配色方案 ---
const PALETTES = [
  {
    name: "Golden Hour",
    skyTop: '#5A6B7A', skyBot: '#8A9AAA',
    cloud: '#C8CDD5',
    snowPeak: ['#FFFFFF', '#E8E0E8', '#D0C8D8'],
    rockFace: ['#5A4A6A', '#6A5A78', '#7A6888', '#4A3A58'],
    midSlope: ['#C89A40', '#D4A848', '#B88A38', '#A07830', '#C49040'],
    treeLine: ['#1A2028', '#2A2838', '#1E2430', '#252D38'],
    lake: '#1A2028',
    lakeReflect: 0.5,
  },
  {
    name: "Winter Dawn",
    skyTop: '#3A4558', skyBot: '#708098',
    cloud: '#B0B8C8',
    snowPeak: ['#F0F0F8', '#E0E0F0', '#D0D0E8'],
    rockFace: ['#4A5568', '#5A6578', '#3A4558', '#6A7588'],
    midSlope: ['#8A9AA8', '#9AAAB8', '#7A8A98', '#A0B0C0', '#B0C0D0'],
    treeLine: ['#1A2030', '#222838', '#2A3040', '#182028'],
    lake: '#182838',
    lakeReflect: 0.4,
  },
  {
    name: "Autumn Fire",
    skyTop: '#4A4858', skyBot: '#7A8090',
    cloud: '#C0B8B0',
    snowPeak: ['#F8F0F0', '#E8E0E0', '#D8D0D0'],
    rockFace: ['#6A4A50', '#7A5A60', '#5A3A40', '#8A6A70'],
    midSlope: ['#D07030', '#C06028', '#E08040', '#B05020', '#D48038'],
    treeLine: ['#2A1818', '#3A2020', '#1E1010', '#2E1818'],
    lake: '#1E1818',
    lakeReflect: 0.45,
  },
  {
    name: "Blue Ice",
    skyTop: '#2A3A50', skyBot: '#5A7090',
    cloud: '#90A0B8',
    snowPeak: ['#E8F0F8', '#D8E8F8', '#C8D8E8'],
    rockFace: ['#3A5068', '#4A6078', '#2A4058', '#5A7088'],
    midSlope: ['#5A8898', '#6A98A8', '#4A7888', '#7AA8B8', '#8AB8C8'],
    treeLine: ['#0A1828', '#122030', '#1A2838', '#0E1A28'],
    lake: '#0A1828',
    lakeReflect: 0.5,
  },
  {
    name: "Sunset Glow",
    skyTop: '#4A3848', skyBot: '#8A6878',
    cloud: '#D0A8B0',
    snowPeak: ['#F8E8F0', '#F0D8E8', '#E8D0E0'],
    rockFace: ['#6A4058', '#7A5068', '#5A3048', '#8A6078'],
    midSlope: ['#D88050', '#C87048', '#E89060', '#B86038', '#D48848'],
    treeLine: ['#2A1828', '#321E30', '#1E1020', '#281828'],
    lake: '#1E1020',
    lakeReflect: 0.4,
  },
  {
    name: "Emerald Valley",
    skyTop: '#3A4A48', skyBot: '#6A8A80',
    cloud: '#A8C0B8',
    snowPeak: ['#F0F8F0', '#E0F0E8', '#D0E0D8'],
    rockFace: ['#4A5A50', '#5A6A60', '#3A4A40', '#6A7A70'],
    midSlope: ['#5A8A50', '#6A9A60', '#4A7A40', '#7AAA70', '#8ABA80'],
    treeLine: ['#0A2018', '#122820', '#1A3028', '#0E1A18'],
    lake: '#0A1A18',
    lakeReflect: 0.5,
  },
];

let palette;
let peaks = [];
let canvasSize;
let horizonY;   // 地平線（湖面起始）
let treeLineY;  // 樹林帶位置

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);

  palette = PALETTES[floor(rand() * PALETTES.length)];
  generateLandscape();

  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Peaks": peaks.length,
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function generateLandscape() {
  peaks = [];
  horizonY = canvasSize * (0.55 + rand() * 0.08);
  treeLineY = horizonY - canvasSize * (0.04 + rand() * 0.04);

  // 生成 2~4 座主峰
  const peakCount = floor(rand() * 3) + 2;
  for (let i = 0; i < peakCount; i++) {
    const cx = canvasSize * (0.15 + rand() * 0.7);
    const peakY = canvasSize * (0.05 + rand() * 0.15);
    const baseW = canvasSize * (0.25 + rand() * 0.3);
    const snowLine = peakY + (horizonY - peakY) * (0.2 + rand() * 0.2);

    peaks.push({
      cx: cx,
      peakY: peakY,
      baseW: baseW,
      snowLine: snowLine,
      rockIdx: floor(rand() * palette.rockFace.length),
      snowIdx: floor(rand() * palette.snowPeak.length),
      ridgeOffset: (rand() - 0.5) * baseW * 0.15,
      steepness: 0.8 + rand() * 0.4,
    });
  }

  // 按寬度排序（大的先畫，在後面）
  peaks.sort((a, b) => b.baseW - a.baseW);
}

function draw() {
  // === 天空 ===
  drawSky();

  // === 雲朵 ===
  drawClouds();

  // === 遠山雪峰 ===
  for (const p of peaks) {
    drawMountain(p);
  }

  // === 中景山坡 ===
  drawMidSlopes();

  // === 針葉林帶 ===
  drawTreeLine();

  // === 湖面 + 倒影 ===
  drawLake();

  // === Credit ===
  fill(255, 255, 255, 50);
  noStroke();
  textAlign(CENTER);
  textSize(canvasSize * 0.018);
  text('Inspired by Phillipa Hudson', canvasSize / 2, canvasSize * 0.97);
}

// ===== 天空漸層 =====
function drawSky() {
  const topC = color(palette.skyTop);
  const botC = color(palette.skyBot);
  noStroke();
  for (let y = 0; y < horizonY; y++) {
    const t = y / horizonY;
    const c = lerpColor(topC, botC, t);
    fill(c);
    rect(0, y, canvasSize, 1);
  }
}

// ===== 雲朵 =====
function drawClouds() {
  const cloudCount = floor(rand() * 4) + 2;
  noStroke();
  const cc = color(palette.cloud);

  for (let i = 0; i < cloudCount; i++) {
    const cx = rand() * canvasSize;
    const cy = canvasSize * (0.05 + rand() * 0.2);
    const w = canvasSize * (0.08 + rand() * 0.15);
    const h = canvasSize * (0.01 + rand() * 0.02);

    cc.setAlpha(60 + rand() * 60);
    fill(cc);

    // 多個橢圓組合
    const blobs = floor(rand() * 3) + 3;
    for (let b = 0; b < blobs; b++) {
      const bx = cx + (rand() - 0.5) * w;
      const by = cy + (rand() - 0.5) * h;
      const bw = w * (0.3 + rand() * 0.5);
      const bh = h * (0.5 + rand() * 1.0);
      ellipse(bx, by, bw, bh);
    }
  }
}

// ===== 雪山 =====
function drawMountain(p) {
  const leftBase = p.cx - p.baseW / 2;
  const rightBase = p.cx + p.baseW / 2;
  const peakX = p.cx + p.ridgeOffset;

  // 岩石面（整座山）
  noStroke();
  fill(palette.rockFace[p.rockIdx]);
  beginShape();
  vertex(leftBase, horizonY);
  // 左側山脊線（帶起伏）
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(leftBase, peakX, t);
    const baseY = lerp(horizonY, p.peakY, Math.pow(t, p.steepness));
    const noise = sin(t * 12 + p.cx) * canvasSize * 0.008;
    vertex(x, baseY + noise);
  }
  // 右側山脊線
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = lerp(rightBase, peakX, t);
    const baseY = lerp(horizonY, p.peakY, Math.pow(t, p.steepness * 0.9));
    const noise = sin(t * 10 + p.cx + 5) * canvasSize * 0.006;
    vertex(x, baseY + noise);
  }
  endShape(CLOSE);

  // 雪面（山頂到雪線以上）
  fill(palette.snowPeak[p.snowIdx]);
  beginShape();
  // 雪線左邊起點
  const snowLeftT = (p.snowLine - horizonY) / (p.peakY - horizonY);
  const snowLeftX = lerp(leftBase, peakX, Math.pow(abs(snowLeftT), 1 / p.steepness));
  const snowRightX = lerp(rightBase, peakX, Math.pow(abs(snowLeftT), 1 / (p.steepness * 0.9)));

  vertex(snowLeftX, p.snowLine);
  // 左側山脊到頂
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(snowLeftX, peakX, t);
    const baseY = lerp(p.snowLine, p.peakY, Math.pow(t, 0.8));
    const noise = sin(t * 15 + p.cx + 2) * canvasSize * 0.005;
    vertex(x, baseY + noise);
  }
  // 右側山脊下來
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = lerp(snowRightX, peakX, t);
    const baseY = lerp(p.snowLine, p.peakY, Math.pow(t, 0.85));
    const noise = sin(t * 13 + p.cx + 8) * canvasSize * 0.004;
    vertex(x, baseY + noise);
  }
  vertex(snowRightX, p.snowLine);
  endShape(CLOSE);

  // 雪面陰影（稍暗的色塊增加立體感）
  const shadowC = color(palette.snowPeak[(p.snowIdx + 1) % palette.snowPeak.length]);
  shadowC.setAlpha(100);
  fill(shadowC);
  beginShape();
  vertex(peakX + canvasSize * 0.01, p.peakY + canvasSize * 0.01);
  vertex(snowRightX, p.snowLine);
  vertex(peakX, p.snowLine * 0.9 + p.peakY * 0.1);
  endShape(CLOSE);

  // 岩石紋理線
  stroke(palette.rockFace[(p.rockIdx + 1) % palette.rockFace.length]);
  strokeWeight(0.5);
  for (let i = 0; i < 8; i++) {
    const t = 0.3 + rand() * 0.5;
    const x1 = lerp(p.cx, leftBase, t) + (rand() - 0.5) * canvasSize * 0.02;
    const y1 = lerp(p.peakY, horizonY, t * 0.8);
    const x2 = x1 + (rand() - 0.5) * canvasSize * 0.06;
    const y2 = y1 + canvasSize * (0.02 + rand() * 0.04);
    line(x1, y1, x2, y2);
  }
}

// ===== 中景山坡 =====
function drawMidSlopes() {
  noStroke();
  const slopeCount = floor(rand() * 2) + 2;

  for (let s = 0; s < slopeCount; s++) {
    const c = color(palette.midSlope[floor(rand() * palette.midSlope.length)]);
    fill(c);

    const startY = horizonY - canvasSize * (0.08 + rand() * 0.12);
    beginShape();
    vertex(0, horizonY);

    // 起伏的山坡線
    const points = 30;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const x = t * canvasSize;
      const baseY = startY + (horizonY - startY) * 0.3;
      const wave = sin(t * PI * (2 + rand() * 3) + s * 2) * canvasSize * 0.04;
      const y = baseY + wave - s * canvasSize * 0.02;
      vertex(x, y);
    }

    vertex(canvasSize, horizonY);
    endShape(CLOSE);
  }
}

// ===== 針葉林帶 =====
function drawTreeLine() {
  noStroke();

  // 林帶背景色塊
  const bgC = color(palette.treeLine[0]);
  fill(bgC);
  rect(0, treeLineY, canvasSize, horizonY - treeLineY);

  // 個別樹的剪影
  const treeCount = floor(canvasSize * 0.15);
  for (let i = 0; i < treeCount; i++) {
    const x = rand() * canvasSize;
    const treeH = canvasSize * (0.02 + rand() * 0.05);
    const baseY = treeLineY + rand() * (horizonY - treeLineY) * 0.5;
    const w = treeH * (0.15 + rand() * 0.2);

    const tc = color(palette.treeLine[floor(rand() * palette.treeLine.length)]);
    fill(tc);

    // 三角形針葉樹
    beginShape();
    vertex(x, baseY - treeH);
    vertex(x - w, baseY);
    vertex(x + w, baseY);
    endShape(CLOSE);

    // 樹幹
    rect(x - w * 0.15, baseY, w * 0.3, treeH * 0.15);
  }
}

// ===== 湖面 + 倒影 =====
function drawLake() {
  // 湖水底色
  noStroke();
  fill(palette.lake);
  rect(0, horizonY, canvasSize, canvasSize - horizonY);

  // 倒影：取上半部畫面鏡射到湖面
  // 用半透明的色塊模擬倒影
  const reflectAlpha = palette.lakeReflect * 255;

  // 山的倒影（簡化色塊）
  for (const p of peaks) {
    const rc = color(palette.rockFace[p.rockIdx]);
    rc.setAlpha(reflectAlpha * 0.5);
    fill(rc);

    const leftBase = p.cx - p.baseW / 2;
    const rightBase = p.cx + p.baseW / 2;
    const reflectH = (horizonY - p.peakY) * 0.6;

    beginShape();
    vertex(leftBase, horizonY);
    vertex(p.cx + p.ridgeOffset, horizonY + reflectH);
    vertex(rightBase, horizonY);
    endShape(CLOSE);

    // 雪的倒影
    const sc = color(palette.snowPeak[p.snowIdx]);
    sc.setAlpha(reflectAlpha * 0.4);
    fill(sc);
    const snowReflH = reflectH * 0.4;
    beginShape();
    vertex(p.cx - p.baseW * 0.2, horizonY);
    vertex(p.cx + p.ridgeOffset, horizonY + snowReflH);
    vertex(p.cx + p.baseW * 0.2, horizonY);
    endShape(CLOSE);
  }

  // 樹林倒影
  const treeReflC = color(palette.treeLine[0]);
  treeReflC.setAlpha(reflectAlpha * 0.6);
  fill(treeReflC);
  rect(0, horizonY, canvasSize, canvasSize * 0.04);

  // 山坡倒影
  const slopeReflC = color(palette.midSlope[0]);
  slopeReflC.setAlpha(reflectAlpha * 0.3);
  fill(slopeReflC);
  rect(0, horizonY + canvasSize * 0.04, canvasSize, canvasSize * 0.06);

  // 湖面水波紋
  stroke(255, 255, 255, 15);
  strokeWeight(0.5);
  for (let y = horizonY + canvasSize * 0.02; y < canvasSize; y += canvasSize * 0.015) {
    const x1 = rand() * canvasSize * 0.3;
    const x2 = x1 + canvasSize * (0.1 + rand() * 0.5);
    line(x1, y + (rand() - 0.5) * 2, x2, y + (rand() - 0.5) * 2);
  }
}

// ===== 互動 =====
function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  generateLandscape();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    palette = PALETTES[floor(rand() * PALETTES.length)];
    generateLandscape();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`mountain-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}
