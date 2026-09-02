// ============================================
// Loading Spinners - Generative Art
// n×m 網格的各式 loading 動畫
// 每個 spinner 有不同類型、配色、速度
// ============================================

const rand = fxrand;

// --- Loading 動畫類型 ---
const SPINNER_TYPES = [
  'arc',          // 經典旋轉弧
  'dots',         // 追逐圓點
  'pulse',        // 脈衝圓環
  'segments',     // 分段旋轉
  'orbit',        // 軌道球
  'bars',         // 旋轉條
  'ring',         // 漸層環
  'bounce',       // 彈跳點
  'spiral',       // 螺旋
  'clock',        // 時鐘掃描
  'dualRing',     // 雙環反轉
  'squares',      // 旋轉方塊
  'wave',         // 波浪線
  'morphing',     // 變形多邊形
  'hourglass',    // 沙漏翻轉
];

// --- 配色（深色背景用） ---
const COLORS_DARK_BG = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF',
  '#5F27CD', '#01A3A4', '#F368E0', '#FF6348',
  '#7BED9F', '#70A1FF', '#FFA502', '#2ED573',
  '#1E90FF', '#FF4757', '#3742FA', '#ECCC68',
  '#FF6B81', '#7158E2', '#3AE374', '#FF3838',
  '#17C0EB', '#F5CD79',
];

// --- 配色（淺色背景用，排除淺色） ---
const COLORS_LIGHT_BG = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#00897B', '#2E7D32',
  '#EF6C00', '#D84315', '#4E342E', '#37474F',
  '#C62828', '#6A1B9A', '#283593', '#00695C',
  '#FF6348', '#5F27CD', '#01A3A4', '#3742FA',
  '#2F3542', '#7158E2', '#FF3838', '#1565C0',
];

// --- 背景色 ---
const BG_COLORS = [
  '#0a0a1a', '#0d1117', '#1a1a2e', '#16213e',
  '#0f0f23', '#1b1b2f', '#121212', '#0a192f',
  '#F5F5F5', '#FAFAFA', '#E8E8E8', '#F0EDE5',
];

let cols, rows;
let spinners = [];
let bgColor;
let isLightBg = false;
let canvasSize;
let cellSize;

function checkLightBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
}

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);

  bgColor = BG_COLORS[floor(rand() * BG_COLORS.length)];
  isLightBg = checkLightBg(bgColor);

  // 隨機 n×m (3~8)
  cols = floor(rand() * 6) + 3;
  rows = floor(rand() * 6) + 3;

  cellSize = canvasSize / max(cols, rows);

  generateSpinners();

  window.$fxhashFeatures = {
    "Grid": cols + "x" + rows,
    "Background": bgColor,
  };
}

function generateSpinners() {
  spinners = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = SPINNER_TYPES[floor(rand() * SPINNER_TYPES.length)];
      const palette = isLightBg ? COLORS_LIGHT_BG : COLORS_DARK_BG;
      const color1 = palette[floor(rand() * palette.length)];
      let color2 = palette[floor(rand() * palette.length)];
      while (color2 === color1) color2 = palette[floor(rand() * palette.length)];

      spinners.push({
        col: c,
        row: r,
        type: type,
        color1: color1,
        color2: color2,
        speed: (rand() * 1.5 + 0.5) * (rand() < 0.3 ? -1 : 1),
        phase: rand() * TWO_PI,
        dotCount: floor(rand() * 5) + 4,
        segments: floor(rand() * 4) + 3,
        thickness: rand() * 0.12 + 0.06,
      });
    }
  }
}

function draw() {
  background(bgColor);

  const marginX = (canvasSize - cols * cellSize) / 2;
  const marginY = (canvasSize - rows * cellSize) / 2;

  for (const sp of spinners) {
    const cx = marginX + sp.col * cellSize + cellSize / 2;
    const cy = marginY + sp.row * cellSize + cellSize / 2;
    const size = cellSize * 0.7;

    push();
    translate(cx, cy);
    drawSpinner(sp, size);
    pop();
  }
}

// ===== 繪製 Spinner =====
function drawSpinner(sp, size) {
  const t = millis() * 0.001 * sp.speed + sp.phase;
  const r = size / 2;
  const c1 = color(sp.color1);
  const c2 = color(sp.color2);

  switch (sp.type) {
    case 'arc':       drawArc(t, r, sp, c1); break;
    case 'dots':      drawDots(t, r, sp, c1, c2); break;
    case 'pulse':     drawPulse(t, r, sp, c1); break;
    case 'segments':  drawSegments(t, r, sp, c1, c2); break;
    case 'orbit':     drawOrbit(t, r, sp, c1, c2); break;
    case 'bars':      drawBars(t, r, sp, c1, c2); break;
    case 'ring':      drawRing(t, r, sp, c1, c2); break;
    case 'bounce':    drawBounce(t, r, sp, c1, c2); break;
    case 'spiral':    drawSpiral(t, r, sp, c1); break;
    case 'clock':     drawClock(t, r, sp, c1, c2); break;
    case 'dualRing':  drawDualRing(t, r, sp, c1, c2); break;
    case 'squares':   drawSquares(t, r, sp, c1, c2); break;
    case 'wave':      drawWave(t, r, sp, c1, c2); break;
    case 'morphing':  drawMorphing(t, r, sp, c1, c2); break;
    case 'hourglass': drawHourglass(t, r, sp, c1, c2); break;
  }
}

// ===== 經典旋轉弧 =====
function drawArc(t, r, sp, c1) {
  noFill();
  stroke(c1);
  strokeWeight(r * sp.thickness * 2);
  strokeCap(ROUND);
  const startA = t * 3;
  const sweepA = PI * (0.5 + 0.3 * sin(t * 2));
  arc(0, 0, r * 1.6, r * 1.6, startA, startA + sweepA);
}

// ===== 追逐圓點 =====
function drawDots(t, r, sp, c1, c2) {
  const n = sp.dotCount;
  noStroke();
  for (let i = 0; i < n; i++) {
    const angle = t * 2.5 + (TWO_PI / n) * i;
    const orbitR = r * 0.65;
    const x = cos(angle) * orbitR;
    const y = sin(angle) * orbitR;
    const sz = map(i, 0, n - 1, r * 0.22, r * 0.06);
    const a = map(i, 0, n - 1, 255, 60);
    const c = lerpColor(c1, c2, i / n);
    c.setAlpha(a);
    fill(c);
    ellipse(x, y, sz, sz);
  }
}

// ===== 脈衝圓環 =====
function drawPulse(t, r, sp, c1) {
  noFill();
  strokeCap(ROUND);
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const phase = t * 2 + i * (TWO_PI / rings);
    const scale = (sin(phase) * 0.5 + 0.5);
    const radius = r * 0.3 + r * 0.7 * scale;
    const a = 255 * (1 - scale);
    const c = color(sp.color1);
    c.setAlpha(a);
    stroke(c);
    strokeWeight(r * sp.thickness * (1 - scale * 0.5));
    ellipse(0, 0, radius * 2, radius * 2);
  }
}

// ===== 分段旋轉 =====
function drawSegments(t, r, sp, c1, c2) {
  const n = sp.segments + 3;
  const gap = 0.08;
  const segAngle = (TWO_PI / n) - gap;
  noFill();
  strokeWeight(r * sp.thickness * 2);
  strokeCap(ROUND);

  for (let i = 0; i < n; i++) {
    const startA = t * 2 + (TWO_PI / n) * i;
    const c = lerpColor(c1, c2, i / n);
    stroke(c);
    arc(0, 0, r * 1.6, r * 1.6, startA, startA + segAngle);
  }
}

// ===== 軌道球 =====
function drawOrbit(t, r, sp, c1, c2) {
  // 軌道線
  noFill();
  const trackC = color(sp.color1);
  trackC.setAlpha(40);
  stroke(trackC);
  strokeWeight(1);
  ellipse(0, 0, r * 1.4, r * 1.4);

  // 球
  noStroke();
  const balls = 3;
  for (let i = 0; i < balls; i++) {
    const angle = t * (1.5 + i * 0.5) + i * (TWO_PI / balls);
    const orbitR = r * 0.7;
    const x = cos(angle) * orbitR;
    const y = sin(angle) * orbitR * 0.5; // 橢圓軌道
    const sz = r * (0.18 - i * 0.03);
    const c = i === 0 ? c1 : c2;
    fill(c);
    ellipse(x, y, sz, sz);
  }
}

// ===== 旋轉條 =====
function drawBars(t, r, sp, c1, c2) {
  const n = 8;
  noStroke();
  rectMode(CENTER);
  for (let i = 0; i < n; i++) {
    const angle = (TWO_PI / n) * i + t * 1.5;
    const delay = (i / n);
    const a = (sin(t * 3 - delay * TWO_PI) * 0.5 + 0.5) * 255;
    const c = lerpColor(c1, c2, i / n);
    c.setAlpha(a);
    fill(c);
    push();
    rotate(angle);
    const barW = r * 0.12;
    const barH = r * 0.35;
    rect(0, -r * 0.5, barW, barH, barW * 0.4);
    pop();
  }
  rectMode(CORNER);
}

// ===== 漸層環 =====
function drawRing(t, r, sp, c1, c2) {
  noFill();
  strokeCap(ROUND);
  const steps = 40;
  const w = r * sp.thickness * 2.5;

  for (let i = 0; i < steps; i++) {
    const angle = t * 2 + (TWO_PI / steps) * i;
    const nextAngle = angle + (TWO_PI / steps) * 1.2;
    const progress = i / steps;
    const c = lerpColor(c1, c2, progress);
    c.setAlpha(progress * 255);
    stroke(c);
    strokeWeight(w * (0.3 + progress * 0.7));
    arc(0, 0, r * 1.6, r * 1.6, angle, nextAngle);
  }
}

// ===== 彈跳點 =====
function drawBounce(t, r, sp, c1, c2) {
  noStroke();
  const n = sp.dotCount;
  for (let i = 0; i < n; i++) {
    const x = map(i, 0, n - 1, -r * 0.7, r * 0.7);
    const bounceT = t * 3 - i * 0.3;
    const y = -abs(sin(bounceT)) * r * 0.5;
    const sz = r * 0.15 + abs(sin(bounceT)) * r * 0.05;
    const c = lerpColor(c1, c2, i / (n - 1));
    fill(c);
    ellipse(x, y, sz, sz);

    // 陰影
    const sc = color(sp.color1);
    sc.setAlpha(30);
    fill(sc);
    const shadowW = sz * (1 + (1 - abs(sin(bounceT))) * 0.5);
    ellipse(x, r * 0.15, shadowW, sz * 0.3);
  }
}

// ===== 螺旋 =====
function drawSpiral(t, r, sp, c1) {
  noFill();
  stroke(c1);
  strokeCap(ROUND);
  const turns = 3;
  const points = 60;

  beginShape();
  noFill();
  for (let i = 0; i < points; i++) {
    const progress = i / points;
    const angle = t * 2 + progress * turns * TWO_PI;
    const radius = progress * r * 0.8;
    const x = cos(angle) * radius;
    const y = sin(angle) * radius;
    const w = r * sp.thickness * (0.5 + progress * 1.5);
    strokeWeight(w);
    const a = progress * 255;
    const c = color(sp.color1);
    c.setAlpha(a);
    stroke(c);
    vertex(x, y);
  }
  endShape();
}

// ===== 時鐘掃描 =====
function drawClock(t, r, sp, c1, c2) {
  // 外環
  noFill();
  const ringC = color(sp.color1);
  ringC.setAlpha(50);
  stroke(ringC);
  strokeWeight(r * 0.04);
  ellipse(0, 0, r * 1.7, r * 1.7);

  // 刻度
  for (let i = 0; i < 12; i++) {
    const a = (TWO_PI / 12) * i;
    const inner = r * 0.72;
    const outer = r * 0.82;
    stroke(ringC);
    strokeWeight(r * 0.03);
    line(cos(a) * inner, sin(a) * inner, cos(a) * outer, sin(a) * outer);
  }

  // 掃描扇形
  const sweepAngle = t * 1.5;
  fill(c1);
  noStroke();
  const fc = color(sp.color1);
  fc.setAlpha(80);
  fill(fc);
  arc(0, 0, r * 1.6, r * 1.6, sweepAngle - PI * 0.4, sweepAngle);

  // 指針
  stroke(c1);
  strokeWeight(r * 0.06);
  strokeCap(ROUND);
  line(0, 0, cos(sweepAngle) * r * 0.7, sin(sweepAngle) * r * 0.7);

  // 中心點
  noStroke();
  fill(c2);
  ellipse(0, 0, r * 0.12, r * 0.12);
}

// ===== 雙環反轉 =====
function drawDualRing(t, r, sp, c1, c2) {
  noFill();
  strokeCap(ROUND);

  // 外環
  stroke(c1);
  strokeWeight(r * sp.thickness * 2);
  const a1 = t * 2;
  arc(0, 0, r * 1.6, r * 1.6, a1, a1 + PI * 0.8);

  // 內環（反向）
  stroke(c2);
  strokeWeight(r * sp.thickness * 1.5);
  const a2 = -t * 2.5;
  arc(0, 0, r * 1.0, r * 1.0, a2, a2 + PI * 0.6);
}

// ===== 旋轉方塊 =====
function drawSquares(t, r, sp, c1, c2) {
  const n = 3;
  rectMode(CENTER);
  noFill();
  strokeCap(ROUND);

  for (let i = 0; i < n; i++) {
    const sz = r * (0.5 + i * 0.35);
    const rot = t * (1.5 - i * 0.4) * (i % 2 === 0 ? 1 : -1);
    const c = lerpColor(c1, c2, i / (n - 1));
    stroke(c);
    strokeWeight(r * sp.thickness * 1.5);

    push();
    rotate(rot);
    rect(0, 0, sz, sz, sz * 0.1);
    pop();
  }
  rectMode(CORNER);
}

// ===== 波浪線 =====
function drawWave(t, r, sp, c1, c2) {
  noFill();
  strokeCap(ROUND);
  const waves = 3;
  for (let w = 0; w < waves; w++) {
    const c = lerpColor(c1, c2, w / (waves - 1));
    stroke(c);
    strokeWeight(r * sp.thickness * 1.5);
    beginShape();
    for (let i = 0; i <= 20; i++) {
      const progress = i / 20;
      const x = map(progress, 0, 1, -r * 0.8, r * 0.8);
      const y = sin(progress * PI * 3 + t * 3 - w * 0.8) * r * 0.25;
      vertex(x, y + (w - 1) * r * 0.25);
    }
    endShape();
  }
}

// ===== 變形多邊形 =====
function drawMorphing(t, r, sp, c1, c2) {
  noFill();
  strokeWeight(r * sp.thickness * 2);
  strokeCap(ROUND);

  const sides1 = 3;
  const sides2 = 8;
  const morph = sin(t * 1.2) * 0.5 + 0.5; // 0~1 循環
  const sides = lerp(sides1, sides2, morph);
  const rot = t * 0.8;

  // 外層
  stroke(c1);
  beginShape();
  for (let i = 0; i <= 30; i++) {
    const a = (TWO_PI / 30) * i + rot;
    // 在正多邊形之間 morph
    const floorSides = floor(sides);
    const frac = sides - floorSides;
    const r1 = polygonRadius(a, floorSides) * r * 0.75;
    const r2 = polygonRadius(a, floorSides + 1) * r * 0.75;
    const radius = lerp(r1, r2, frac);
    vertex(cos(a) * radius, sin(a) * radius);
  }
  endShape(CLOSE);

  // 內層（反向）
  stroke(c2);
  strokeWeight(r * sp.thickness * 1.2);
  beginShape();
  for (let i = 0; i <= 30; i++) {
    const a = (TWO_PI / 30) * i - rot * 1.3;
    const floorSides = floor(sides);
    const frac = sides - floorSides;
    const r1 = polygonRadius(a, floorSides) * r * 0.42;
    const r2 = polygonRadius(a, floorSides + 1) * r * 0.42;
    const radius = lerp(r1, r2, frac);
    vertex(cos(a) * radius, sin(a) * radius);
  }
  endShape(CLOSE);
}

function polygonRadius(angle, sides) {
  const a = TWO_PI / sides;
  const halfA = a / 2;
  const mod = ((angle % a) + a) % a;
  const offset = abs(mod - halfA);
  return cos(halfA) / cos(halfA - offset);
}

// ===== 沙漏翻轉 =====
function drawHourglass(t, r, sp, c1, c2) {
  const rot = t * 1.8;

  push();
  rotate(rot);

  noStroke();
  // 上三角
  fill(c1);
  beginShape();
  vertex(0, -r * 0.75);
  vertex(-r * 0.5, 0);
  vertex(r * 0.5, 0);
  endShape(CLOSE);

  // 下三角
  fill(c2);
  beginShape();
  vertex(0, r * 0.75);
  vertex(-r * 0.5, 0);
  vertex(r * 0.5, 0);
  endShape(CLOSE);

  // 中心圓
  fill(c1);
  ellipse(0, 0, r * 0.15, r * 0.15);

  // 沙粒（小點流動）
  const grainC = lerpColor(c1, c2, 0.5);
  fill(grainC);
  const phase = (t * 2) % TWO_PI;
  for (let i = 0; i < 4; i++) {
    const progress = ((phase / TWO_PI) + i * 0.25) % 1;
    const gy = lerp(-r * 0.6, r * 0.6, progress);
    const maxW = r * 0.08;
    ellipse((rand() - 0.5) * maxW, gy, r * 0.04, r * 0.04);
  }

  pop();
}

// ===== 互動 =====
function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  cellSize = canvasSize / max(cols, rows);
}

function keyPressed() {
  if (key === ' ') {
    bgColor = BG_COLORS[floor(rand() * BG_COLORS.length)];
    isLightBg = checkLightBg(bgColor);
    cols = floor(rand() * 6) + 3;
    rows = floor(rand() * 6) + 3;
    cellSize = canvasSize / max(cols, rows);
    generateSpinners();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`loading-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}
