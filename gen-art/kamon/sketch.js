// ============================================
// 家紋 Kamon - Japanese Family Crest
// Generative Art
// ============================================

const rand = fxrand;

// 配色：黑白米色系
const themes = [
  { name: "墨",   bg: "#F5F0E8", fg: "#1a1a1a", accent: "#3a3a3a", line: "#1a1a1a" },
  { name: "白抜", bg: "#1a1a1a", fg: "#F5F0E8", accent: "#D4C9B0", line: "#F5F0E8" },
  { name: "素紙", bg: "#EDE8DC", fg: "#2C2C2C", accent: "#4A4A4A", line: "#2C2C2C" },
  { name: "銀鼠", bg: "#E8E4DE", fg: "#444444", accent: "#666666", line: "#333333" },
  { name: "漆黒", bg: "#0F0F0F", fg: "#E8E0D0", accent: "#B0A890", line: "#E8E0D0" },
  { name: "生成", bg: "#FAF6EE", fg: "#1C1C1C", accent: "#555555", line: "#1C1C1C" },
];

// 家紋類型
const KAMON = {
  MITSU_TOMOE: 0,     // 三つ巴
  KIKU: 1,            // 菊
  KIRI: 2,            // 桐
  MOKKO: 3,           // 木瓜
  IGETA: 4,           // 井桁
  MITSU_UROKO: 5,     // 三つ鱗
  JANOME: 6,          // 蛇の目
  ITSUTSU_HOSHI: 7,   // 五つ星
  TACHIBANA: 8,       // 橘
  CHIGAI_MANJI: 9,    // 卍
  FUJI: 10,           // 藤
  MITSU_KASHIWA: 11,  // 三つ柏
  HANABISHI: 12,      // 花菱
  TSURU: 13,          // 鶴丸
  YOTSUME: 14,        // 四つ目結
  UME: 15,            // 梅
  SAKURA: 16,         // 桜
  CHO: 17,            // 蝶
  OGI: 18,            // 扇
  KIKKO: 19,          // 亀甲
  SHIPPO: 20,         // 七宝
  MITSUBOSHI: 21,     // 三つ星
  MATSU: 22,          // 松
  TAKE: 23,           // 竹
  YA: 24,             // 矢
  NAMI: 25,           // 波
  WACHIGAI: 26,       // 輪違い
  KUGINUKI: 27,       // 釘抜
  INE: 28,            // 稲
  TSUKI: 29,          // 月
};

const KAMON_COUNT = 30;

const kamonNames = [
  "三つ巴", "菊", "桐", "木瓜", "井桁",
  "三つ鱗", "蛇の目", "五つ星", "橘", "卍",
  "藤", "三つ柏", "花菱", "鶴丸", "四つ目結",
  "梅", "桜", "蝶", "扇", "亀甲",
  "七宝", "三つ星", "松", "竹", "矢",
  "波", "輪違い", "釘抜", "稲", "月"
];

let theme;
let kamonType;
let hasCircle; // 丸に〇〇（外圓框）
let S; // base size unit

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);

  theme = themes[floor(rand() * themes.length)];
  kamonType = floor(rand() * KAMON_COUNT);
  hasCircle = rand() < 0.6;

  window.$fxhashFeatures = {
    "Theme": theme.name,
    "Kamon": kamonNames[kamonType],
    "Maru": hasCircle ? "丸" : "無",
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function draw() {
  background(theme.bg);
  S = width * 0.35;

  push();
  translate(width / 2, height / 2);

  // 外圓框（丸）
  if (hasCircle) {
    noFill();
    stroke(theme.line);
    strokeWeight(S * 0.04);
    ellipse(0, 0, S * 2.15, S * 2.15);
  }

  // 繪製家紋
  switch (kamonType) {
    case KAMON.MITSU_TOMOE:    drawMitsuTomoe(); break;
    case KAMON.KIKU:           drawKiku(); break;
    case KAMON.KIRI:           drawKiri(); break;
    case KAMON.MOKKO:          drawMokko(); break;
    case KAMON.IGETA:          drawIgeta(); break;
    case KAMON.MITSU_UROKO:    drawMitsuUroko(); break;
    case KAMON.JANOME:         drawJanome(); break;
    case KAMON.ITSUTSU_HOSHI:  drawItsutuHoshi(); break;
    case KAMON.TACHIBANA:      drawTachibana(); break;
    case KAMON.CHIGAI_MANJI:   drawManji(); break;
    case KAMON.FUJI:           drawFuji(); break;
    case KAMON.MITSU_KASHIWA:  drawMitsuKashiwa(); break;
    case KAMON.HANABISHI:      drawHanabishi(); break;
    case KAMON.TSURU:          drawTsuru(); break;
    case KAMON.YOTSUME:        drawYotsume(); break;
    case KAMON.UME:            drawUme(); break;
    case KAMON.SAKURA:         drawSakura(); break;
    case KAMON.CHO:            drawCho(); break;
    case KAMON.OGI:            drawOgi(); break;
    case KAMON.KIKKO:          drawKikko(); break;
    case KAMON.SHIPPO:         drawShippo(); break;
    case KAMON.MITSUBOSHI:     drawMitsuboshi(); break;
    case KAMON.MATSU:          drawMatsu(); break;
    case KAMON.TAKE:           drawTake(); break;
    case KAMON.YA:             drawYa(); break;
    case KAMON.NAMI:           drawNami(); break;
    case KAMON.WACHIGAI:       drawWachigai(); break;
    case KAMON.KUGINUKI:       drawKuginuki(); break;
    case KAMON.INE:            drawIne(); break;
    case KAMON.TSUKI:          drawTsuki(); break;
  }

  pop();
}

// ===== 三つ巴（三巴紋）=====
function drawMitsuTomoe() {
  const r = S * 0.95;
  fill(theme.fg);
  noStroke();

  for (let i = 0; i < 3; i++) {
    const angle = (TWO_PI / 3) * i - HALF_PI;
    push();
    rotate(angle);
    drawTomoe(0, -r * 0.32, r * 0.65);
    pop();
  }

  // 中心圓
  fill(theme.fg);
  ellipse(0, 0, r * 0.18, r * 0.18);
}

function drawTomoe(cx, cy, size) {
  const headR = size * 0.33;

  // 頭部圓
  ellipse(cx, cy, headR * 2, headR * 2);

  // 尾巴用扇形弧線 — 加長加寬
  beginShape();
  vertex(cx + headR, cy);
  for (let a = 0; a <= PI * 1.4; a += 0.04) {
    const rr = headR + a * size * 0.32;
    vertex(cx + cos(a) * rr, cy + sin(a) * rr);
  }
  for (let a = PI * 1.4; a >= 0; a -= 0.04) {
    const taper = 1 - (a / (PI * 1.4));
    const rr = headR + a * size * 0.32 - headR * taper * 1.1;
    vertex(cx + cos(a) * rr, cy + sin(a) * rr);
  }
  endShape(CLOSE);
}

// ===== 菊（十六菊）=====
function drawKiku() {
  const petals = 16;
  const outerR = S * 0.85;

  // 外層花瓣
  fill(theme.fg);
  stroke(theme.bg);
  strokeWeight(S * 0.015);

  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i;
    push();
    rotate(angle);
    drawKikuPetal(0, 0, outerR, outerR * 0.22);
    pop();
  }

  // 裏菊（內層花瓣，半角偏移）
  fill(theme.fg);
  stroke(theme.bg);
  strokeWeight(S * 0.012);

  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i + PI / petals;
    push();
    rotate(angle);
    drawKikuPetal(0, 0, outerR * 0.65, outerR * 0.16);
    pop();
  }

  // 花心
  fill(theme.bg);
  noStroke();
  ellipse(0, 0, outerR * 0.18, outerR * 0.18);

  fill(theme.fg);
  ellipse(0, 0, outerR * 0.1, outerR * 0.1);
}

function drawKikuPetal(cx, cy, length, width) {
  beginShape();
  vertex(cx, cy);
  bezierVertex(
    cx - width, cy - length * 0.4,
    cx - width * 0.6, cy - length * 0.85,
    cx, cy - length
  );
  bezierVertex(
    cx + width * 0.6, cy - length * 0.85,
    cx + width, cy - length * 0.4,
    cx, cy
  );
  endShape(CLOSE);
}

// ===== 桐（五三桐）=====
function drawKiri() {
  fill(theme.fg);
  noStroke();

  push();
  translate(0, S * 0.08);

  // 三片葉子
  const leafW = S * 0.45;
  const leafH = S * 0.38;
  const leafY = S * 0.2;

  // 中央葉（較大）
  drawKiriLeaf(0, leafY, leafW * 1.15, leafH * 1.15);
  // 左葉
  drawKiriLeaf(-S * 0.48, leafY + S * 0.06, leafW * 0.9, leafH * 0.9);
  // 右葉
  drawKiriLeaf(S * 0.48, leafY + S * 0.06, leafW * 0.9, leafH * 0.9);

  // 三組花（上方）
  drawKiriFlower(0, -S * 0.55, S * 0.08, 5);
  drawKiriFlower(-S * 0.35, -S * 0.38, S * 0.07, 3);
  drawKiriFlower(S * 0.35, -S * 0.38, S * 0.07, 3);

  // 花莖
  stroke(theme.fg);
  strokeWeight(S * 0.03);
  noFill();
  line(0, leafY - leafH * 0.3, 0, -S * 0.47);
  line(-S * 0.35, leafY - S * 0.02, -S * 0.35, -S * 0.3);
  line(S * 0.35, leafY - S * 0.02, S * 0.35, -S * 0.3);

  pop();
}

function drawKiriLeaf(cx, cy, w, h) {
  beginShape();
  vertex(cx, cy);
  // 左半
  bezierVertex(cx - w * 0.6, cy, cx - w, cy - h * 0.5, cx - w * 0.8, cy - h);
  // 頂部三裂
  bezierVertex(cx - w * 0.4, cy - h * 0.7, cx - w * 0.15, cy - h * 1.05, cx, cy - h * 0.85);
  bezierVertex(cx + w * 0.15, cy - h * 1.05, cx + w * 0.4, cy - h * 0.7, cx + w * 0.8, cy - h);
  // 右半
  bezierVertex(cx + w, cy - h * 0.5, cx + w * 0.6, cy, cx, cy);
  endShape(CLOSE);
}

function drawKiriFlower(cx, cy, r, count) {
  fill(theme.fg);
  noStroke();
  for (let i = 0; i < count; i++) {
    const spacing = r * 2.2;
    const startX = cx - (count - 1) * spacing / 2;
    const x = startX + i * spacing;
    ellipse(x, cy, r * 1.8, r * 1.8);
    // 小十字
    stroke(theme.bg);
    strokeWeight(r * 0.3);
    line(x - r * 0.4, cy, x + r * 0.4, cy);
    line(x, cy - r * 0.4, x, cy + r * 0.4);
    noStroke();
  }
}

// ===== 木瓜（四つ木瓜）=====
function drawMokko() {
  const lobes = 4;
  const r = S * 0.7;
  const lobeR = S * 0.55;

  // 外形：四片圓弧交疊
  fill(theme.fg);
  noStroke();

  for (let i = 0; i < lobes; i++) {
    const angle = (TWO_PI / lobes) * i;
    const px = cos(angle) * r * 0.35;
    const py = sin(angle) * r * 0.35;
    ellipse(px, py, lobeR, lobeR);
  }

  // 內部鏤空
  fill(theme.bg);
  for (let i = 0; i < lobes; i++) {
    const angle = (TWO_PI / lobes) * i;
    const px = cos(angle) * r * 0.35;
    const py = sin(angle) * r * 0.35;
    ellipse(px, py, lobeR * 0.65, lobeR * 0.65);
  }

  // 中心填回
  fill(theme.fg);
  ellipse(0, 0, r * 0.35, r * 0.35);

  // 中心鏤空
  fill(theme.bg);
  ellipse(0, 0, r * 0.15, r * 0.15);
}

// ===== 井桁（井の字）=====
function drawIgeta() {
  const w = S * 0.12;
  const len = S * 0.8;
  const gap = S * 0.22;

  stroke(theme.fg);
  strokeWeight(w);
  strokeCap(SQUARE);
  noFill();

  // 兩條水平線
  line(-len, -gap, len, -gap);
  line(-len, gap, len, gap);

  // 兩條垂直線
  line(-gap, -len, -gap, len);
  line(gap, -len, gap, len);
}

// ===== 三つ鱗 =====
function drawMitsuUroko() {
  const triR = S * 0.72;
  fill(theme.fg);
  noStroke();

  const positions = [
    [0, -triR * 0.42],
    [-triR * 0.38, triR * 0.22],
    [triR * 0.38, triR * 0.22],
  ];

  for (const [px, py] of positions) {
    drawEquiTriangle(px, py, triR * 0.58);
  }
}

function drawEquiTriangle(cx, cy, size) {
  beginShape();
  for (let i = 0; i < 3; i++) {
    const a = -HALF_PI + (TWO_PI / 3) * i;
    vertex(cx + cos(a) * size, cy + sin(a) * size);
  }
  endShape(CLOSE);
}

// ===== 蛇の目 =====
function drawJanome() {
  const outerR = S * 0.9;
  const midR = S * 0.65;
  const innerR = S * 0.38;

  noStroke();

  // 外環
  fill(theme.fg);
  ellipse(0, 0, outerR * 2, outerR * 2);

  fill(theme.bg);
  ellipse(0, 0, midR * 2, midR * 2);

  // 內圓
  fill(theme.fg);
  ellipse(0, 0, innerR * 2, innerR * 2);
}

// ===== 五つ星 =====
function drawItsutuHoshi() {
  const r = S * 0.4;
  fill(theme.fg);
  noStroke();

  // 中心一顆
  ellipse(0, 0, r, r);

  // 周圍四顆
  const dist = S * 0.58;
  for (let i = 0; i < 4; i++) {
    const a = -HALF_PI + (TWO_PI / 4) * i;
    ellipse(cos(a) * dist, sin(a) * dist, r, r);
  }
}

// ===== 橘 =====
function drawTachibana() {
  const outerR = S * 0.6;
  fill(theme.fg);
  noStroke();

  // 五片花瓣
  for (let i = 0; i < 5; i++) {
    const angle = -HALF_PI + (TWO_PI / 5) * i;
    push();
    rotate(angle);
    beginShape();
    vertex(0, 0);
    bezierVertex(-outerR * 0.45, -outerR * 0.3, -outerR * 0.35, -outerR * 0.9, 0, -outerR);
    bezierVertex(outerR * 0.35, -outerR * 0.9, outerR * 0.45, -outerR * 0.3, 0, 0);
    endShape(CLOSE);
    pop();
  }

  // 花瓣間的萼片
  fill(theme.fg);
  for (let i = 0; i < 5; i++) {
    const angle = -HALF_PI + (TWO_PI / 5) * i + PI / 5;
    const px = cos(angle) * outerR * 0.55;
    const py = sin(angle) * outerR * 0.55;
    push();
    translate(px, py);
    rotate(angle + HALF_PI);
    ellipse(0, 0, outerR * 0.18, outerR * 0.35);
    pop();
  }

  // 花心
  fill(theme.bg);
  ellipse(0, 0, outerR * 0.35, outerR * 0.35);
  fill(theme.fg);
  const dotR = outerR * 0.08;
  for (let i = 0; i < 3; i++) {
    const a = -HALF_PI + (TWO_PI / 3) * i;
    ellipse(cos(a) * outerR * 0.1, sin(a) * outerR * 0.1, dotR, dotR);
  }

  // 上方葉子
  fill(theme.fg);
  push();
  translate(0, -outerR * 1.0);
  drawTachibanaLeaf(-S * 0.15, 0, S * 0.28, S * 0.12, -0.3);
  drawTachibanaLeaf(S * 0.15, 0, S * 0.28, S * 0.12, 0.3);
  pop();
}

function drawTachibanaLeaf(cx, cy, len, w, tilt) {
  push();
  translate(cx, cy);
  rotate(tilt);
  beginShape();
  vertex(0, 0);
  bezierVertex(-w, -len * 0.3, -w * 0.5, -len * 0.8, 0, -len);
  bezierVertex(w * 0.5, -len * 0.8, w, -len * 0.3, 0, 0);
  endShape(CLOSE);
  pop();
}

// ===== 卍（左万字）=====
function drawManji() {
  const arm = S * 0.65;
  const w = S * 0.14;
  const hookLen = S * 0.35;

  fill(theme.fg);
  noStroke();

  rectMode(CENTER);

  // 中心正方形
  rect(0, 0, w, w);

  // 十字四臂 + 勾
  for (let i = 0; i < 4; i++) {
    push();
    rotate(HALF_PI * i);
    // 臂
    rect(0, -arm / 2, w, arm);
    // 勾（向左彎）
    rect(-hookLen / 2, -arm + w / 2, hookLen, w);
    pop();
  }

  rectMode(CORNER);
}

// ===== 藤（下り藤）=====
function drawFuji() {
  fill(theme.fg);
  noStroke();

  // 整體向上偏移使圖案視覺居中
  push();
  translate(0, -S * 0.1);

  // 上方藤蔓弧線（加寬加粗）
  stroke(theme.fg);
  strokeWeight(S * 0.04);
  noFill();
  arc(0, -S * 0.5, S * 1.2, S * 0.4, PI * 0.08, PI * 0.92);

  // 上方葉子（更大更明顯）
  noStroke();
  fill(theme.fg);
  for (let i = 0; i < 5; i++) {
    const lx = (i - 2) * S * 0.22;
    push();
    translate(lx, -S * 0.55);
    rotate((i - 2) * 0.18);
    beginShape();
    vertex(0, 0);
    bezierVertex(-S * 0.1, -S * 0.12, -S * 0.08, -S * 0.28, 0, -S * 0.3);
    bezierVertex(S * 0.08, -S * 0.28, S * 0.1, -S * 0.12, 0, 0);
    endShape(CLOSE);
    pop();
  }

  // 垂下的花串（五串，更寬更長）
  noStroke();
  fill(theme.fg);

  drawFujiCluster(-S * 0.4, -S * 0.32, 5, S * 0.9);
  drawFujiCluster(-S * 0.18, -S * 0.38, 6, S * 1.15);
  drawFujiCluster(0, -S * 0.42, 7, S * 1.3);
  drawFujiCluster(S * 0.18, -S * 0.38, 6, S * 1.15);
  drawFujiCluster(S * 0.4, -S * 0.32, 5, S * 0.9);

  pop();
}

function drawFujiCluster(cx, cy, count, scale) {
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const y = cy + t * scale * 0.85;
    const size = scale * 0.1 * (1 - t * 0.45);
    for (let p = 0; p < 3; p++) {
      const a = PI * 0.3 + (PI * 0.4 / 2) * p;
      const px = cx + cos(a) * size * 0.3;
      const py = y + sin(a) * size * 0.3;
      ellipse(px, py, size, size * 0.7);
    }
  }
}

// ===== 三つ柏 =====
function drawMitsuKashiwa() {
  fill(theme.fg);
  noStroke();

  for (let i = 0; i < 3; i++) {
    const angle = -HALF_PI + (TWO_PI / 3) * i;
    push();
    rotate(angle);
    drawKashiwaLeaf(0, -S * 0.12, S * 0.7, S * 0.35);
    pop();
  }

  // 中心
  fill(theme.bg);
  ellipse(0, 0, S * 0.12, S * 0.12);
}

function drawKashiwaLeaf(cx, cy, length, width) {
  beginShape();
  vertex(cx, cy);
  // 左側波狀邊緣
  bezierVertex(cx - width * 0.6, cy - length * 0.15, cx - width, cy - length * 0.3, cx - width * 0.85, cy - length * 0.45);
  bezierVertex(cx - width * 1.05, cy - length * 0.55, cx - width * 0.9, cy - length * 0.7, cx - width * 0.5, cy - length * 0.85);
  bezierVertex(cx - width * 0.25, cy - length * 0.95, cx, cy - length * 1.02, cx, cy - length);
  // 右側波狀邊緣
  bezierVertex(cx, cy - length * 1.02, cx + width * 0.25, cy - length * 0.95, cx + width * 0.5, cy - length * 0.85);
  bezierVertex(cx + width * 0.9, cy - length * 0.7, cx + width * 1.05, cy - length * 0.55, cx + width * 0.85, cy - length * 0.45);
  bezierVertex(cx + width, cy - length * 0.3, cx + width * 0.6, cy - length * 0.15, cx, cy);
  endShape(CLOSE);

  // 葉脈
  stroke(theme.bg);
  strokeWeight(length * 0.02);
  line(cx, cy - length * 0.05, cx, cy - length * 0.9);
  noStroke();
}

// ===== 花菱 =====
function drawHanabishi() {
  fill(theme.fg);
  noStroke();

  // 四個菱形花瓣
  for (let i = 0; i < 4; i++) {
    push();
    rotate(HALF_PI * i);
    drawHanabishiPetal(0, 0, S * 0.8, S * 0.35);
    pop();
  }

  // 中心鏤空
  fill(theme.bg);
  drawDiamond(0, 0, S * 0.2);

  fill(theme.fg);
  ellipse(0, 0, S * 0.08, S * 0.08);
}

function drawHanabishiPetal(cx, cy, length, width) {
  // 菱形花瓣，帶有內凹
  beginShape();
  vertex(cx, cy);
  bezierVertex(cx - width * 0.6, cy - length * 0.15, cx - width, cy - length * 0.35, cx, cy - length * 0.5);
  bezierVertex(cx + width, cy - length * 0.35, cx + width * 0.6, cy - length * 0.15, cx, cy);
  endShape(CLOSE);
}

function drawDiamond(cx, cy, r) {
  beginShape();
  vertex(cx, cy - r);
  vertex(cx + r * 0.6, cy);
  vertex(cx, cy + r);
  vertex(cx - r * 0.6, cy);
  endShape(CLOSE);
}

// ===== 鶴丸 =====
function drawTsuru() {
  fill(theme.fg);
  noStroke();

  // 圓形身體
  ellipse(0, S * 0.05, S * 0.6, S * 0.5);

  // 翅膀（左）
  beginShape();
  vertex(-S * 0.1, 0);
  bezierVertex(-S * 0.5, -S * 0.2, -S * 0.85, -S * 0.1, -S * 0.9, S * 0.15);
  bezierVertex(-S * 0.85, S * 0.25, -S * 0.6, S * 0.2, -S * 0.15, S * 0.1);
  endShape(CLOSE);

  // 翅膀（右）
  beginShape();
  vertex(S * 0.1, 0);
  bezierVertex(S * 0.5, -S * 0.2, S * 0.85, -S * 0.1, S * 0.9, S * 0.15);
  bezierVertex(S * 0.85, S * 0.25, S * 0.6, S * 0.2, S * 0.15, S * 0.1);
  endShape(CLOSE);

  // 頭頸
  beginShape();
  vertex(0, -S * 0.05);
  bezierVertex(-S * 0.06, -S * 0.3, -S * 0.04, -S * 0.55, 0, -S * 0.65);
  bezierVertex(S * 0.04, -S * 0.55, S * 0.06, -S * 0.3, 0, -S * 0.05);
  endShape(CLOSE);

  // 頭
  ellipse(0, -S * 0.65, S * 0.12, S * 0.1);

  // 喙
  beginShape();
  vertex(S * 0.06, -S * 0.66);
  vertex(S * 0.18, -S * 0.67);
  vertex(S * 0.06, -S * 0.63);
  endShape(CLOSE);

  // 眼
  fill(theme.bg);
  ellipse(-S * 0.01, -S * 0.66, S * 0.025, S * 0.025);

  // 尾羽
  fill(theme.fg);
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 0.12;
    push();
    translate(0, S * 0.25);
    rotate(spread);
    beginShape();
    vertex(0, 0);
    bezierVertex(-S * 0.04, S * 0.2, -S * 0.03, S * 0.45, 0, S * 0.55);
    bezierVertex(S * 0.03, S * 0.45, S * 0.04, S * 0.2, 0, 0);
    endShape(CLOSE);
    pop();
  }

  // 翅膀羽毛紋理線
  stroke(theme.bg);
  strokeWeight(S * 0.012);
  noFill();
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 1; i <= 4; i++) {
      const t = i * 0.2;
      const x1 = side * S * 0.15;
      const y1 = S * 0.05;
      const x2 = side * (S * 0.3 + t * S * 0.5);
      const y2 = S * 0.05 + t * S * 0.12;
      line(x1, y1, x2, y2);
    }
  }
}

// ===== 四つ目結 =====
function drawYotsume() {
  const size = S * 0.38;
  const gap = S * 0.45;
  fill(theme.fg);
  noStroke();

  // 四個菱形
  const positions = [
    [0, -gap], [-gap, 0], [gap, 0], [0, gap]
  ];

  for (const [px, py] of positions) {
    drawDiamond(px, py, size);
  }
}

// ===== 梅（五弁の梅）=====
function drawUme() {
  const r = S * 0.52;
  fill(theme.fg);
  noStroke();

  // 五片圓形花瓣
  for (let i = 0; i < 5; i++) {
    const a = -HALF_PI + (TWO_PI / 5) * i;
    const px = cos(a) * r * 0.6;
    const py = sin(a) * r * 0.6;
    ellipse(px, py, r * 1.1, r * 1.1);
  }

  // 花心鏤空
  fill(theme.bg);
  ellipse(0, 0, r * 0.7, r * 0.7);

  // 花蕊（五本放射線 + 小圓）
  stroke(theme.fg);
  strokeWeight(S * 0.018);
  for (let i = 0; i < 5; i++) {
    const a = -HALF_PI + (TWO_PI / 5) * i + PI / 5;
    const x1 = cos(a) * r * 0.12;
    const y1 = sin(a) * r * 0.12;
    const x2 = cos(a) * r * 0.32;
    const y2 = sin(a) * r * 0.32;
    line(x1, y1, x2, y2);
    noStroke();
    fill(theme.fg);
    ellipse(x2, y2, S * 0.04, S * 0.04);
    stroke(theme.fg);
    strokeWeight(S * 0.018);
  }
  noStroke();

  // 中心小圓
  fill(theme.fg);
  ellipse(0, 0, r * 0.15, r * 0.15);
}

// ===== 桜 =====
function drawSakura() {
  const r = S * 0.6;
  fill(theme.fg);
  noStroke();

  // 五片花瓣（帶缺口）
  for (let i = 0; i < 5; i++) {
    const a = -HALF_PI + (TWO_PI / 5) * i;
    push();
    rotate(a);
    // 花瓣用兩個重疊橢圓，中間切出 V 缺口
    drawSakuraPetal(0, -r * 0.35, r * 0.6, r * 0.35);
    pop();
  }

  // 花心
  fill(theme.bg);
  ellipse(0, 0, r * 0.3, r * 0.3);

  fill(theme.fg);
  ellipse(0, 0, r * 0.12, r * 0.12);
}

function drawSakuraPetal(cx, cy, length, width) {
  // 左半瓣
  beginShape();
  vertex(cx, cy + length * 0.3);
  bezierVertex(cx - width * 1.0, cy + length * 0.1, cx - width * 0.8, cy - length * 0.7, cx - width * 0.15, cy - length * 0.65);
  // V 缺口底
  vertex(cx, cy - length * 0.4);
  // 右半瓣
  vertex(cx + width * 0.15, cy - length * 0.65);
  bezierVertex(cx + width * 0.8, cy - length * 0.7, cx + width * 1.0, cy + length * 0.1, cx, cy + length * 0.3);
  endShape(CLOSE);
}

// ===== 蝶 =====
function drawCho() {
  fill(theme.fg);
  noStroke();

  // 左上翅
  beginShape();
  vertex(0, 0);
  bezierVertex(-S * 0.25, -S * 0.15, -S * 0.7, -S * 0.5, -S * 0.6, -S * 0.65);
  bezierVertex(-S * 0.5, -S * 0.75, -S * 0.2, -S * 0.55, -S * 0.05, -S * 0.15);
  endShape(CLOSE);

  // 右上翅
  beginShape();
  vertex(0, 0);
  bezierVertex(S * 0.25, -S * 0.15, S * 0.7, -S * 0.5, S * 0.6, -S * 0.65);
  bezierVertex(S * 0.5, -S * 0.75, S * 0.2, -S * 0.55, S * 0.05, -S * 0.15);
  endShape(CLOSE);

  // 左下翅
  beginShape();
  vertex(0, S * 0.02);
  bezierVertex(-S * 0.2, S * 0.1, -S * 0.55, S * 0.15, -S * 0.6, S * 0.35);
  bezierVertex(-S * 0.55, S * 0.55, -S * 0.2, S * 0.45, -S * 0.02, S * 0.12);
  endShape(CLOSE);

  // 右下翅
  beginShape();
  vertex(0, S * 0.02);
  bezierVertex(S * 0.2, S * 0.1, S * 0.55, S * 0.15, S * 0.6, S * 0.35);
  bezierVertex(S * 0.55, S * 0.55, S * 0.2, S * 0.45, S * 0.02, S * 0.12);
  endShape(CLOSE);

  // 翅膀紋路鏤空
  fill(theme.bg);
  ellipse(-S * 0.35, -S * 0.42, S * 0.2, S * 0.25);
  ellipse(S * 0.35, -S * 0.42, S * 0.2, S * 0.25);
  ellipse(-S * 0.35, S * 0.28, S * 0.12, S * 0.15);
  ellipse(S * 0.35, S * 0.28, S * 0.12, S * 0.15);

  // 身體
  fill(theme.fg);
  ellipse(0, -S * 0.02, S * 0.06, S * 0.3);

  // 觸角
  stroke(theme.fg);
  strokeWeight(S * 0.02);
  noFill();
  bezier(-S * 0.03, -S * 0.12, -S * 0.12, -S * 0.3, -S * 0.2, -S * 0.38, -S * 0.18, -S * 0.42);
  bezier(S * 0.03, -S * 0.12, S * 0.12, -S * 0.3, S * 0.2, -S * 0.38, S * 0.18, -S * 0.42);
  noStroke();
}

// ===== 扇（五本骨扇）=====
function drawOgi() {
  const fanR = S * 0.8;
  const fanAngle = PI * 0.55;
  const startA = -HALF_PI - fanAngle / 2;

  fill(theme.fg);
  stroke(theme.fg);
  strokeWeight(S * 0.01);

  // 扇面
  beginShape();
  vertex(0, S * 0.25);
  for (let a = startA; a <= startA + fanAngle; a += 0.02) {
    vertex(cos(a) * fanR + 0, sin(a) * fanR + S * 0.25);
  }
  endShape(CLOSE);

  // 扇骨鏤空
  noFill();
  stroke(theme.bg);
  strokeWeight(S * 0.025);
  const bones = 7;
  for (let i = 0; i <= bones; i++) {
    const a = startA + (fanAngle / bones) * i;
    const x2 = cos(a) * fanR;
    const y2 = sin(a) * fanR + S * 0.25;
    line(0, S * 0.25, x2, y2);
  }

  // 扇面邊緣內弧鏤空
  stroke(theme.bg);
  strokeWeight(S * 0.02);
  noFill();
  arc(0, S * 0.25, fanR * 1.7, fanR * 1.7, startA + 0.03, startA + fanAngle - 0.03);

  // 要（軸心點）
  noStroke();
  fill(theme.fg);
  ellipse(0, S * 0.25, S * 0.08, S * 0.08);
  fill(theme.bg);
  ellipse(0, S * 0.25, S * 0.035, S * 0.035);
}

// ===== 亀甲 =====
function drawKikko() {
  const r = S * 0.7;
  const w = S * 0.06;

  // 外六角
  noFill();
  stroke(theme.fg);
  strokeWeight(w);
  drawHexagon(0, 0, r);

  // 內六角
  strokeWeight(w * 0.6);
  drawHexagon(0, 0, r * 0.65);

  // 中心花（六瓣小花）
  noStroke();
  fill(theme.fg);
  for (let i = 0; i < 6; i++) {
    const a = (TWO_PI / 6) * i;
    const px = cos(a) * r * 0.2;
    const py = sin(a) * r * 0.2;
    ellipse(px, py, r * 0.2, r * 0.2);
  }

  fill(theme.bg);
  ellipse(0, 0, r * 0.2, r * 0.2);

  fill(theme.fg);
  ellipse(0, 0, r * 0.08, r * 0.08);
}

function drawHexagon(cx, cy, r) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const a = -HALF_PI + (TWO_PI / 6) * i;
    vertex(cx + cos(a) * r, cy + sin(a) * r);
  }
  endShape(CLOSE);
}

// ===== 七宝 =====
function drawShippo() {
  const r = S * 0.65;

  noFill();
  stroke(theme.fg);
  strokeWeight(S * 0.05);

  // 四個交疊的圓
  ellipse(0, -r * 0.5, r * 1.4, r * 1.4);
  ellipse(0, r * 0.5, r * 1.4, r * 1.4);
  ellipse(-r * 0.5, 0, r * 1.4, r * 1.4);
  ellipse(r * 0.5, 0, r * 1.4, r * 1.4);

  // 中心填實
  noStroke();
  fill(theme.fg);
  ellipse(0, 0, r * 0.35, r * 0.35);
}

// ===== 三つ星 =====
function drawMitsuboshi() {
  const r = S * 0.32;
  const gap = S * 0.6;

  fill(theme.fg);
  noStroke();

  // 三顆星水平排列
  ellipse(-gap, 0, r * 2, r * 2);
  ellipse(0, 0, r * 2, r * 2);
  ellipse(gap, 0, r * 2, r * 2);
}

// ===== 松（三本松葉）=====
function drawMatsu() {
  stroke(theme.fg);
  noFill();

  // 三束松葉，旋轉 120 度排列
  for (let i = 0; i < 3; i++) {
    push();
    rotate((TWO_PI / 3) * i);
    drawPineNeedles(0, -S * 0.12, S * 0.82);
    pop();
  }

  // 中心結合處
  noStroke();
  fill(theme.fg);
  ellipse(0, 0, S * 0.12, S * 0.12);
}

function drawPineNeedles(cx, cy, len) {
  const spread = 0.2;
  strokeWeight(S * 0.03);

  // 兩根松針呈 V 字
  const x1 = cx + cos(-HALF_PI - spread) * len;
  const y1 = cy + sin(-HALF_PI - spread) * len;
  const x2 = cx + cos(-HALF_PI + spread) * len;
  const y2 = cy + sin(-HALF_PI + spread) * len;

  line(cx, cy, x1, y1);
  line(cx, cy, x2, y2);

  // 針尖小圓
  noStroke();
  fill(theme.fg);
  ellipse(x1, y1, S * 0.04, S * 0.04);
  ellipse(x2, y2, S * 0.04, S * 0.04);
  stroke(theme.fg);
}

// ===== 竹（竹笹）=====
function drawTake() {
  stroke(theme.fg);
  strokeWeight(S * 0.05);
  noFill();

  // 主竿
  line(0, S * 0.85, 0, -S * 0.85);

  // 竹節
  strokeWeight(S * 0.07);
  const nodes = [-S * 0.42, 0, S * 0.42];
  for (const ny of nodes) {
    line(-S * 0.05, ny, S * 0.05, ny);
  }

  // 竹葉
  noStroke();
  fill(theme.fg);

  // 上段葉 - 右
  drawBambooLeaf(S * 0.06, -S * 0.36, S * 0.5, S * 0.11, 0.35);
  drawBambooLeaf(S * 0.06, -S * 0.26, S * 0.42, S * 0.09, 0.55);
  drawBambooLeaf(S * 0.06, -S * 0.48, S * 0.38, S * 0.09, 0.25);

  // 中段葉 - 左
  drawBambooLeaf(-S * 0.06, S * 0.05, S * 0.5, S * 0.11, PI - 0.35);
  drawBambooLeaf(-S * 0.06, S * 0.15, S * 0.42, S * 0.09, PI - 0.55);
  drawBambooLeaf(-S * 0.06, -S * 0.05, S * 0.38, S * 0.09, PI - 0.25);

  // 下段葉 - 右
  drawBambooLeaf(S * 0.06, S * 0.47, S * 0.45, S * 0.1, 0.4);
  drawBambooLeaf(S * 0.06, S * 0.57, S * 0.35, S * 0.08, 0.55);
}

function drawBambooLeaf(cx, cy, len, w, angle) {
  push();
  translate(cx, cy);
  rotate(angle);
  beginShape();
  vertex(0, 0);
  bezierVertex(w, -len * 0.3, w * 0.5, -len * 0.8, 0, -len);
  bezierVertex(-w * 0.5, -len * 0.8, -w, -len * 0.3, 0, 0);
  endShape(CLOSE);
  pop();
}

// ===== 矢（並び矢）=====
function drawYa() {
  fill(theme.fg);
  noStroke();

  for (let side = -1; side <= 1; side += 2) {
    push();
    rotate(side * 0.2);

    rectMode(CENTER);
    rect(0, 0, S * 0.06, S * 1.7);

    // 矢羽（上方）
    const featherY = -S * 0.55;
    beginShape();
    vertex(-S * 0.03, featherY);
    vertex(-S * 0.25, featherY - S * 0.25);
    vertex(-S * 0.03, featherY - S * 0.42);
    endShape(CLOSE);
    beginShape();
    vertex(S * 0.03, featherY);
    vertex(S * 0.25, featherY - S * 0.25);
    vertex(S * 0.03, featherY - S * 0.42);
    endShape(CLOSE);

    // 矢尻
    beginShape();
    vertex(0, S * 0.85);
    vertex(-S * 0.09, S * 0.68);
    vertex(S * 0.09, S * 0.68);
    endShape(CLOSE);

    rectMode(CORNER);
    pop();
  }
}

// ===== 波（青海波）=====
function drawNami() {
  noFill();
  stroke(theme.fg);

  const waveR = S * 0.35;
  const rows = 5;
  const cols = 5;

  for (let row = 0; row < rows; row++) {
    const y = -S * 0.75 + row * waveR * 0.85;
    const offset = row % 2 === 0 ? 0 : waveR;
    for (let col = -1; col < cols; col++) {
      const x = -S * 1.0 + col * waveR * 2 + offset;

      for (let ring = 3; ring >= 1; ring--) {
        strokeWeight(S * 0.018);
        arc(x, y, waveR * 2 * (ring / 3), waveR * 2 * (ring / 3), PI, TWO_PI);
      }
    }
  }
}

// ===== 輪違い =====
function drawWachigai() {
  const r = S * 0.62;
  const offset = S * 0.3;

  noFill();
  stroke(theme.fg);
  strokeWeight(S * 0.06);

  // 兩個交疊的圓環
  ellipse(-offset, 0, r * 2, r * 2);
  ellipse(offset, 0, r * 2, r * 2);
}

// ===== 釘抜 =====
function drawKuginuki() {
  const outer = S * 0.75;
  const inner = S * 0.45;

  fill(theme.fg);
  noStroke();

  // 外框（正方形）
  rectMode(CENTER);
  rect(0, 0, outer * 2, outer * 2);

  // 內鏤空（正方形 45度旋轉 = 菱形）
  fill(theme.bg);
  push();
  rotate(PI / 4);
  rect(0, 0, inner * 2, inner * 2);
  pop();

  // 最內中心小方塊
  fill(theme.fg);
  rect(0, 0, inner * 0.5, inner * 0.5);

  rectMode(CORNER);
}

// ===== 稲（抱き稲）=====
function drawIne() {
  stroke(theme.fg);
  fill(theme.fg);

  for (let side = -1; side <= 1; side += 2) {
    push();
    scale(side, 1);

    // 穗莖（更大弧線）
    noFill();
    stroke(theme.fg);
    strokeWeight(S * 0.03);
    bezier(0, S * 0.6, S * 0.2, S * 0.15, S * 0.5, -S * 0.35, S * 0.3, -S * 0.85);

    // 穀粒（更多更大）
    noStroke();
    fill(theme.fg);
    for (let i = 0; i < 10; i++) {
      const t = 0.12 + i * 0.08;
      const bx = bezierPoint(0, S * 0.2, S * 0.5, S * 0.3, t);
      const by = bezierPoint(S * 0.6, S * 0.15, -S * 0.35, -S * 0.85, t);
      const angle = atan2(
        bezierTangent(S * 0.6, S * 0.15, -S * 0.35, -S * 0.85, t),
        bezierTangent(0, S * 0.2, S * 0.5, S * 0.3, t)
      );

      push();
      translate(bx, by);
      rotate(angle + HALF_PI);
      ellipse(-S * 0.05, -S * 0.02, S * 0.045, S * 0.09);
      ellipse(S * 0.05, -S * 0.02, S * 0.045, S * 0.09);
      pop();
    }

    pop();
  }

  // 根部綁帶
  noStroke();
  fill(theme.fg);
  rectMode(CENTER);
  rect(0, S * 0.6, S * 0.25, S * 0.07, S * 0.02);
  rectMode(CORNER);
}

// ===== 月（三日月）=====
function drawTsuki() {
  const r = S * 0.8;

  fill(theme.fg);
  noStroke();

  // 大圓
  ellipse(0, 0, r * 2, r * 2);

  // 用背景色的圓挖出新月形
  fill(theme.bg);
  ellipse(r * 0.35, -r * 0.1, r * 1.75, r * 1.75);
}

// ===== 互動 =====
function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    theme = themes[floor(rand() * themes.length)];
    kamonType = floor(rand() * KAMON_COUNT);
    hasCircle = rand() < 0.6;
    redraw();
  }

  if (key === 's' || key === 'S') {
    const filename = `kamon-${kamonNames[kamonType]}-${fxhash.slice(0, 8)}-${Date.now()}`;
    saveCanvas(filename, 'png');
  }
}
