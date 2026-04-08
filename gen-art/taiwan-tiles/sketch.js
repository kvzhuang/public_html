// ============================================
// 台灣花磚 - Taiwan Majolica Tiles
// Generative Art inspired by traditional
// Taiwanese decorative ceramic tiles (花磚)
// ============================================

const rand = fxrand;

// --- 花磚配色：取自台灣老花磚常見用色 ---
const palettes = [
  {
    name: "牡丹紅",
    bg: "#FDF5E6", border: "#8B4513",
    colors: ["#C41E3A", "#E8A87C", "#2E5339", "#D4A017", "#6B3A2A", "#F5DEB3"]
  },
  {
    name: "青花",
    bg: "#F0EDE5", border: "#1C3A5F",
    colors: ["#1C3A5F", "#3B6FA0", "#7BAFD4", "#D4AF37", "#FFFFFF", "#A0C4E8"]
  },
  {
    name: "翠綠",
    bg: "#FFFEF5", border: "#2E5339",
    colors: ["#2E5339", "#5B8C5A", "#C41E3A", "#D4A017", "#F5DEB3", "#8B4513"]
  },
  {
    name: "琉璃",
    bg: "#1C1C2E", border: "#D4AF37",
    colors: ["#D4AF37", "#C41E3A", "#2A7B9B", "#E8A87C", "#F5DEB3", "#7B2D3F"]
  },
  {
    name: "胭脂",
    bg: "#FFF8F0", border: "#7B2D3F",
    colors: ["#7B2D3F", "#C41E3A", "#E8A87C", "#D4A017", "#2E5339", "#F8C8DC"]
  },
  {
    name: "土黃",
    bg: "#FAF0E4", border: "#6B3A2A",
    colors: ["#6B3A2A", "#D4A017", "#C41E3A", "#2E5339", "#E8C07A", "#8B6914"]
  },
  {
    name: "靛藍",
    bg: "#F5F0EB", border: "#1B3550",
    colors: ["#1B3550", "#2A6496", "#C41E3A", "#D4AF37", "#8FC1E3", "#F5DEB3"]
  },
  {
    name: "粉櫻",
    bg: "#FFF5F5", border: "#8B4557",
    colors: ["#D4688E", "#F8B4C8", "#E86F8A", "#2E5339", "#D4A017", "#FFDCE5"]
  },
  {
    name: "赭石",
    bg: "#F7F0E3", border: "#5C3317",
    colors: ["#5C3317", "#A0522D", "#CD853F", "#C41E3A", "#2E5339", "#F4A460"]
  },
  {
    name: "寶藍金",
    bg: "#0D1B3E", border: "#D4AF37",
    colors: ["#D4AF37", "#F5DEB3", "#C41E3A", "#4A90D9", "#FFFFFF", "#8B6914"]
  },
  {
    name: "墨綠",
    bg: "#0F2418", border: "#D4A017",
    colors: ["#D4A017", "#C41E3A", "#F5DEB3", "#5B8C5A", "#E8A87C", "#8B6914"]
  },
  {
    name: "珊瑚",
    bg: "#FFF8F2", border: "#A0522D",
    colors: ["#E07050", "#F4A460", "#C41E3A", "#2E5339", "#D4A017", "#FFB088"]
  },
  {
    name: "鳳梨黃",
    bg: "#FFFDE7", border: "#6B5B00",
    colors: ["#D4A017", "#FFD700", "#C41E3A", "#2E5339", "#8B6914", "#FFF176"]
  },
  {
    name: "孔雀藍",
    bg: "#F0F4F8", border: "#0D4F4F",
    colors: ["#0D4F4F", "#1A8C8C", "#40BFA0", "#D4AF37", "#C41E3A", "#A0D6D6"]
  },
  {
    name: "紫藤",
    bg: "#F8F0FA", border: "#4A2060",
    colors: ["#4A2060", "#7B4FA0", "#B388D9", "#D4A017", "#C41E3A", "#E0C8F0"]
  },
  {
    name: "磚瓦",
    bg: "#F5EDE0", border: "#5C2E00",
    colors: ["#8B4513", "#A0522D", "#D2691E", "#C41E3A", "#2E5339", "#DEB887"]
  },
  {
    name: "夜市霓虹",
    bg: "#1A1028", border: "#E8A87C",
    colors: ["#FF4466", "#FFD700", "#00E5CC", "#FF8C00", "#FF69B4", "#A0E8FF"]
  },
];

let palette;
let gridCols, gridRows;
let tileSize;
let tilePatterns = [];
let patternTypes;

// --- 花磚圖案類型 ---
const PATTERN = {
  FLOWER_8: 0,    // 八瓣花
  FLOWER_6: 1,    // 六瓣花
  DIAMOND: 2,     // 菱形幾何
  CROSS: 3,       // 十字紋
  ROSETTE: 4,     // 玫瑰花窗
  LEAF_RING: 5,   // 葉環
  SUNBURST: 6,    // 放射太陽紋
  LOTUS: 7,       // 蓮花
  OCTAGON: 8,     // 八角窗櫺
  PEONY: 9,       // 牡丹
  SWIRL: 10,      // 水渦紋
};

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);

  palette = palettes[floor(rand() * palettes.length)];

  // 網格大小 2x2 ~ 4x4
  gridCols = floor(rand() * 3) + 2;
  gridRows = gridCols;

  const margin = size * 0.06;
  tileSize = (size - margin * 2) / gridCols;

  // 決定這次用哪些圖案（1~3 種混搭）
  const allTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  shuffle(allTypes);
  const numTypes = floor(rand() * 3) + 1;
  patternTypes = allTypes.slice(0, numTypes);

  // 為每格磚生成參數
  for (let r = 0; r < gridRows; r++) {
    tilePatterns[r] = [];
    for (let c = 0; c < gridCols; c++) {
      tilePatterns[r][c] = {
        type: patternTypes[floor(rand() * patternTypes.length)],
        rotation: floor(rand() * 4) * HALF_PI,
        colorIdx: floor(rand() * palette.colors.length),
        petalCount: floor(rand() * 4) * 2 + 6, // 6,8,10,12
        innerScale: rand() * 0.15 + 0.2,
        hasCorner: rand() < 0.7,
        hasBorder: rand() < 0.8,
        layerCount: floor(rand() * 2) + 2,
      };
    }
  }

  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Grid": gridCols + "x" + gridRows,
    "Patterns": patternTypes.length,
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function draw() {
  background(palette.bg);

  const margin = width * 0.06;

  push();
  translate(margin, margin);

  // 繪製每塊花磚
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const x = c * tileSize;
      const y = r * tileSize;
      drawTile(x, y, tileSize, tilePatterns[r][c]);
    }
  }

  // 整體外框
  noFill();
  stroke(palette.border);
  strokeWeight(tileSize * 0.03);
  rect(0, 0, tileSize * gridCols, tileSize * gridRows);

  pop();
}

// ===== 繪製單塊花磚 =====
function drawTile(x, y, size, params) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = size;

  push();

  // 底色
  fill(palette.bg);
  noStroke();
  rect(x, y, s, s);

  // 磚框
  if (params.hasBorder) {
    drawBorder(x, y, s, params);
  }

  // 四角裝飾
  if (params.hasCorner) {
    drawCorners(x, y, s, params);
  }

  // 中央圖案
  push();
  translate(cx, cy);
  rotate(params.rotation);

  switch (params.type) {
    case PATTERN.FLOWER_8:
      drawFlower8(0, 0, s, params);
      break;
    case PATTERN.FLOWER_6:
      drawFlower6(0, 0, s, params);
      break;
    case PATTERN.DIAMOND:
      drawDiamond(0, 0, s, params);
      break;
    case PATTERN.CROSS:
      drawCross(0, 0, s, params);
      break;
    case PATTERN.ROSETTE:
      drawRosette(0, 0, s, params);
      break;
    case PATTERN.LEAF_RING:
      drawLeafRing(0, 0, s, params);
      break;
    case PATTERN.SUNBURST:
      drawSunburst(0, 0, s, params);
      break;
    case PATTERN.LOTUS:
      drawLotus(0, 0, s, params);
      break;
    case PATTERN.OCTAGON:
      drawOctagon(0, 0, s, params);
      break;
    case PATTERN.PEONY:
      drawPeony(0, 0, s, params);
      break;
    case PATTERN.SWIRL:
      drawSwirl(0, 0, s, params);
      break;
  }

  pop();
  pop();
}

// ===== 磚框 =====
function drawBorder(x, y, s, params) {
  const bw = s * 0.06;
  noFill();
  stroke(palette.border);
  strokeWeight(bw * 0.5);
  rect(x + bw, y + bw, s - bw * 2, s - bw * 2);

  // 內框裝飾線
  strokeWeight(bw * 0.25);
  const c = palette.colors[params.colorIdx];
  stroke(c);
  rect(x + bw * 1.8, y + bw * 1.8, s - bw * 3.6, s - bw * 3.6);
}

// ===== 四角裝飾 =====
function drawCorners(x, y, s, params) {
  const cs = s * 0.12;
  const offset = s * 0.1;
  const c1 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c2 = palette.colors[(params.colorIdx + 2) % palette.colors.length];

  // 四個角落
  const corners = [
    [x + offset, y + offset],
    [x + s - offset, y + offset],
    [x + s - offset, y + s - offset],
    [x + offset, y + s - offset],
  ];

  for (let i = 0; i < 4; i++) {
    const [cx, cy] = corners[i];
    push();
    translate(cx, cy);
    rotate(i * HALF_PI);

    // 小葉片裝飾
    fill(c1);
    noStroke();
    drawLeafShape(0, 0, cs, cs * 0.5, 0);

    fill(c2);
    drawLeafShape(0, 0, cs * 0.6, cs * 0.3, HALF_PI);

    pop();
  }
}

// ===== 八瓣花 =====
function drawFlower8(cx, cy, s, params) {
  const petals = params.petalCount;
  const outerR = s * 0.35;
  const innerR = s * params.innerScale;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];

  // 外層大花瓣
  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i;
    push();
    rotate(angle);
    fill(c1);
    stroke(palette.border);
    strokeWeight(s * 0.005);
    drawPetal(0, 0, outerR, outerR * 0.35);
    pop();
  }

  // 中層花瓣（偏移半個角度）
  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i + PI / petals;
    push();
    rotate(angle);
    fill(c2);
    stroke(palette.border);
    strokeWeight(s * 0.004);
    drawPetal(0, 0, outerR * 0.65, outerR * 0.25);
    pop();
  }

  // 內層小花瓣
  const innerPetals = floor(petals / 2) + 2;
  for (let i = 0; i < innerPetals; i++) {
    const angle = (TWO_PI / innerPetals) * i;
    push();
    rotate(angle);
    fill(c3);
    noStroke();
    drawPetal(0, 0, innerR, innerR * 0.4);
    pop();
  }

  // 花心
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, innerR * 0.8, innerR * 0.8);

  // 花心內圈
  fill(c1);
  noStroke();
  ellipse(0, 0, innerR * 0.4, innerR * 0.4);

  // 花心點
  fill(c4);
  ellipse(0, 0, innerR * 0.15, innerR * 0.15);
}

// ===== 六瓣花 =====
function drawFlower6(cx, cy, s, params) {
  const petals = 6;
  const outerR = s * 0.33;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 4) % palette.colors.length];

  // 底層圓形裝飾
  fill(c2);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, outerR * 2.2, outerR * 2.2);

  // 花瓣（圓形交疊風格）
  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i;
    const px = cos(angle) * outerR * 0.55;
    const py = sin(angle) * outerR * 0.55;
    fill(c1);
    stroke(palette.border);
    strokeWeight(s * 0.004);
    ellipse(px, py, outerR * 0.9, outerR * 0.9);
  }

  // 內層花瓣
  for (let i = 0; i < petals; i++) {
    const angle = (TWO_PI / petals) * i + PI / petals;
    const px = cos(angle) * outerR * 0.3;
    const py = sin(angle) * outerR * 0.3;
    fill(c3);
    noStroke();
    ellipse(px, py, outerR * 0.5, outerR * 0.5);
  }

  // 花心
  fill(c2);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, outerR * 0.6, outerR * 0.6);

  fill(c1);
  noStroke();
  ellipse(0, 0, outerR * 0.3, outerR * 0.3);
}

// ===== 菱形幾何 =====
function drawDiamond(cx, cy, s, params) {
  const layers = params.layerCount + 1;
  const maxR = s * 0.38;

  for (let l = layers; l >= 1; l--) {
    const r = maxR * (l / layers);
    const c = palette.colors[(params.colorIdx + l) % palette.colors.length];
    fill(c);
    stroke(palette.border);
    strokeWeight(s * 0.004);

    beginShape();
    vertex(0, -r);
    vertex(r, 0);
    vertex(0, r);
    vertex(-r, 0);
    endShape(CLOSE);
  }

  // 菱形內十字線
  stroke(palette.border);
  strokeWeight(s * 0.003);
  const innerR = maxR * 0.4;
  line(-innerR, 0, innerR, 0);
  line(0, -innerR, 0, innerR);

  // 中心小圓
  fill(palette.colors[params.colorIdx]);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, maxR * 0.25, maxR * 0.25);
}

// ===== 十字紋 =====
function drawCross(cx, cy, s, params) {
  const armW = s * 0.14;
  const armL = s * 0.34;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 3) % palette.colors.length];

  // 底圓
  fill(c2);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, s * 0.7, s * 0.7);

  // 十字
  fill(c1);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  rectMode(CENTER);
  rect(0, 0, armW, armL * 2, armW * 0.2);
  rect(0, 0, armL * 2, armW, armW * 0.2);

  // 四個方位的裝飾
  for (let i = 0; i < 4; i++) {
    push();
    rotate(i * HALF_PI + PI / 4);
    fill(c3);
    noStroke();
    drawLeafShape(0, -s * 0.2, s * 0.12, s * 0.06, 0);
    pop();
  }

  // 中心
  fill(c3);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, armW * 1.2, armW * 1.2);

  fill(c1);
  noStroke();
  ellipse(0, 0, armW * 0.5, armW * 0.5);

  rectMode(CORNER);
}

// ===== 玫瑰花窗 =====
function drawRosette(cx, cy, s, params) {
  const rings = params.layerCount + 1;
  const maxR = s * 0.37;
  const segments = params.petalCount;

  // 外圈裝飾弧
  for (let ring = rings; ring >= 1; ring--) {
    const r = maxR * (ring / rings);
    const c = palette.colors[(params.colorIdx + ring) % palette.colors.length];

    for (let i = 0; i < segments; i++) {
      const a1 = (TWO_PI / segments) * i;
      const a2 = (TWO_PI / segments) * (i + 1);
      const mid = (a1 + a2) / 2;

      fill(c);
      stroke(palette.border);
      strokeWeight(s * 0.003);

      beginShape();
      vertex(cos(a1) * r * 0.3, sin(a1) * r * 0.3);
      bezierVertex(
        cos(a1) * r, sin(a1) * r,
        cos(a2) * r, sin(a2) * r,
        cos(a2) * r * 0.3, sin(a2) * r * 0.3
      );
      endShape(CLOSE);
    }
  }

  // 花心
  fill(palette.colors[(params.colorIdx + rings + 1) % palette.colors.length]);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, maxR * 0.35, maxR * 0.35);

  fill(palette.colors[params.colorIdx]);
  noStroke();
  ellipse(0, 0, maxR * 0.15, maxR * 0.15);
}

// ===== 葉環 =====
function drawLeafRing(cx, cy, s, params) {
  const leaves = params.petalCount;
  const outerR = s * 0.34;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];

  // 底圓
  fill(c3);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, outerR * 2.1, outerR * 2.1);

  // 外圈葉片
  for (let i = 0; i < leaves; i++) {
    const angle = (TWO_PI / leaves) * i;
    push();
    rotate(angle);
    fill(c1);
    stroke(palette.border);
    strokeWeight(s * 0.003);
    drawLeafShape(0, -outerR * 0.55, outerR * 0.6, outerR * 0.22, 0);
    pop();
  }

  // 內圈葉片
  const innerLeaves = floor(leaves / 2);
  for (let i = 0; i < innerLeaves; i++) {
    const angle = (TWO_PI / innerLeaves) * i + PI / innerLeaves;
    push();
    rotate(angle);
    fill(c2);
    noStroke();
    drawLeafShape(0, -outerR * 0.3, outerR * 0.35, outerR * 0.15, 0);
    pop();
  }

  // 花心同心圓
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, outerR * 0.55, outerR * 0.55);

  fill(c1);
  noStroke();
  ellipse(0, 0, outerR * 0.35, outerR * 0.35);

  fill(c4);
  ellipse(0, 0, outerR * 0.15, outerR * 0.15);
}

// ===== 放射太陽紋 =====
function drawSunburst(cx, cy, s, params) {
  const rays = params.petalCount + 4;
  const outerR = s * 0.38;
  const innerR = s * 0.15;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];

  // 底圓
  fill(c3);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, outerR * 2.2, outerR * 2.2);

  // 長短交替的光芒
  for (let i = 0; i < rays; i++) {
    const angle = (TWO_PI / rays) * i;
    const isLong = i % 2 === 0;
    const r = isLong ? outerR : outerR * 0.7;
    const w = isLong ? s * 0.04 : s * 0.025;

    fill(isLong ? c1 : c2);
    stroke(palette.border);
    strokeWeight(s * 0.003);

    push();
    rotate(angle);
    beginShape();
    vertex(-w, 0);
    vertex(-w * 0.3, -r * 0.8);
    vertex(0, -r);
    vertex(w * 0.3, -r * 0.8);
    vertex(w, 0);
    endShape(CLOSE);
    pop();
  }

  // 中心同心圓
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, innerR * 2, innerR * 2);

  fill(c1);
  noStroke();
  ellipse(0, 0, innerR * 1.2, innerR * 1.2);

  fill(c2);
  ellipse(0, 0, innerR * 0.5, innerR * 0.5);
}

// ===== 蓮花 =====
function drawLotus(cx, cy, s, params) {
  const outerR = s * 0.36;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];
  const c5 = palette.colors[(params.colorIdx + 4) % palette.colors.length];

  // 底層圓
  fill(c3);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, outerR * 2.1, outerR * 2.1);

  // 最外層花瓣（寬圓弧形）
  for (let i = 0; i < 8; i++) {
    const angle = (TWO_PI / 8) * i;
    push();
    rotate(angle);
    fill(c1);
    stroke(palette.border);
    strokeWeight(s * 0.004);
    drawLotusPetal(0, -outerR * 0.15, outerR * 0.8, outerR * 0.35);
    pop();
  }

  // 中層花瓣
  for (let i = 0; i < 8; i++) {
    const angle = (TWO_PI / 8) * i + PI / 8;
    push();
    rotate(angle);
    fill(c2);
    stroke(palette.border);
    strokeWeight(s * 0.003);
    drawLotusPetal(0, -outerR * 0.1, outerR * 0.55, outerR * 0.28);
    pop();
  }

  // 內層花瓣
  for (let i = 0; i < 6; i++) {
    const angle = (TWO_PI / 6) * i;
    push();
    rotate(angle);
    fill(c5);
    noStroke();
    drawLotusPetal(0, -outerR * 0.05, outerR * 0.32, outerR * 0.18);
    pop();
  }

  // 蓮蓬（花心）
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, outerR * 0.4, outerR * 0.4);

  // 蓮子點
  const seedR = outerR * 0.12;
  fill(c1);
  noStroke();
  ellipse(0, 0, seedR, seedR);
  for (let i = 0; i < 5; i++) {
    const a = (TWO_PI / 5) * i;
    ellipse(cos(a) * seedR * 0.9, sin(a) * seedR * 0.9, seedR * 0.7, seedR * 0.7);
  }
}

// 蓮花瓣（較圓潤飽滿）
function drawLotusPetal(cx, cy, length, width) {
  beginShape();
  vertex(cx, cy);
  bezierVertex(
    cx - width * 1.1, cy - length * 0.3,
    cx - width * 0.7, cy - length * 0.85,
    cx, cy - length
  );
  bezierVertex(
    cx + width * 0.7, cy - length * 0.85,
    cx + width * 1.1, cy - length * 0.3,
    cx, cy
  );
  endShape(CLOSE);
}

// ===== 八角窗櫺 =====
function drawOctagon(cx, cy, s, params) {
  const layers = params.layerCount + 1;
  const maxR = s * 0.38;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];

  // 多層八角形
  for (let l = layers; l >= 1; l--) {
    const r = maxR * (l / layers);
    const c = palette.colors[(params.colorIdx + l) % palette.colors.length];
    fill(c);
    stroke(palette.border);
    strokeWeight(s * 0.004);
    drawPolygon(0, 0, r, 8, PI / 8);
  }

  // 八角形內的十字窗格線
  stroke(palette.border);
  strokeWeight(s * 0.006);
  const innerR = maxR * (1 / layers) * 1.5;
  const gridR = maxR * 0.75;

  // 水平 + 垂直
  line(-gridR, 0, gridR, 0);
  line(0, -gridR, 0, gridR);

  // 對角線
  const diagR = gridR * 0.707;
  line(-diagR, -diagR, diagR, diagR);
  line(-diagR, diagR, diagR, -diagR);

  // 格線交叉處的小方塊
  for (let i = 0; i < 4; i++) {
    const a = HALF_PI * i;
    const px = cos(a) * gridR * 0.5;
    const py = sin(a) * gridR * 0.5;
    fill(c2);
    stroke(palette.border);
    strokeWeight(s * 0.003);
    push();
    translate(px, py);
    rotate(PI / 4);
    rectMode(CENTER);
    rect(0, 0, s * 0.06, s * 0.06);
    rectMode(CORNER);
    pop();
  }

  // 中心裝飾
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  drawPolygon(0, 0, maxR * 0.18, 8, PI / 8);

  fill(c1);
  noStroke();
  ellipse(0, 0, maxR * 0.12, maxR * 0.12);
}

// 正多邊形
function drawPolygon(cx, cy, r, sides, startAngle) {
  beginShape();
  for (let i = 0; i < sides; i++) {
    const a = startAngle + (TWO_PI / sides) * i;
    vertex(cx + cos(a) * r, cy + sin(a) * r);
  }
  endShape(CLOSE);
}

// ===== 牡丹 =====
function drawPeony(cx, cy, s, params) {
  const outerR = s * 0.37;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];
  const c5 = palette.colors[(params.colorIdx + 4) % palette.colors.length];

  // 底葉
  for (let i = 0; i < 5; i++) {
    const angle = (TWO_PI / 5) * i + PI / 10;
    push();
    rotate(angle);
    fill(c3);
    stroke(palette.border);
    strokeWeight(s * 0.003);
    drawLeafShape(0, -outerR * 0.6, outerR * 0.5, outerR * 0.2, 0);
    pop();
  }

  // 外層大花瓣（隨機偏移角度，模擬自然感）
  for (let i = 0; i < 10; i++) {
    const angle = (TWO_PI / 10) * i + rand() * 0.15;
    const rOff = 0.9 + rand() * 0.2;
    push();
    rotate(angle);
    fill(c1);
    stroke(palette.border);
    strokeWeight(s * 0.003);
    drawLotusPetal(0, 0, outerR * 0.65 * rOff, outerR * 0.28);
    pop();
  }

  // 中層花瓣
  for (let i = 0; i < 8; i++) {
    const angle = (TWO_PI / 8) * i + PI / 8 + rand() * 0.1;
    push();
    rotate(angle);
    fill(c2);
    stroke(palette.border);
    strokeWeight(s * 0.003);
    drawLotusPetal(0, 0, outerR * 0.45, outerR * 0.22);
    pop();
  }

  // 內層
  for (let i = 0; i < 6; i++) {
    const angle = (TWO_PI / 6) * i;
    push();
    rotate(angle);
    fill(c5);
    noStroke();
    drawLotusPetal(0, 0, outerR * 0.28, outerR * 0.14);
    pop();
  }

  // 花蕊
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, outerR * 0.25, outerR * 0.25);

  // 花蕊小點
  fill(c1);
  noStroke();
  for (let i = 0; i < 7; i++) {
    const a = (TWO_PI / 7) * i;
    const d = outerR * 0.07;
    ellipse(cos(a) * d, sin(a) * d, s * 0.02, s * 0.02);
  }
  fill(c4);
  ellipse(0, 0, s * 0.025, s * 0.025);
}

// ===== 水渦紋 =====
function drawSwirl(cx, cy, s, params) {
  const arms = floor(params.petalCount / 2);
  const maxR = s * 0.36;
  const c1 = palette.colors[params.colorIdx];
  const c2 = palette.colors[(params.colorIdx + 1) % palette.colors.length];
  const c3 = palette.colors[(params.colorIdx + 2) % palette.colors.length];
  const c4 = palette.colors[(params.colorIdx + 3) % palette.colors.length];

  // 底圓
  fill(c3);
  stroke(palette.border);
  strokeWeight(s * 0.004);
  ellipse(0, 0, maxR * 2.2, maxR * 2.2);

  // 渦旋臂（用漸寬的弧線模擬）
  noFill();
  for (let a = 0; a < arms; a++) {
    const baseAngle = (TWO_PI / arms) * a;
    const c = a % 2 === 0 ? c1 : c2;
    stroke(c);

    // 畫螺旋：從中心向外展開
    for (let t = 0; t < 80; t++) {
      const progress = t / 80;
      const angle = baseAngle + progress * PI * 1.5;
      const r = progress * maxR;
      const weight = s * 0.01 + progress * s * 0.04;
      strokeWeight(weight);

      const x1 = cos(angle) * r;
      const y1 = sin(angle) * r;
      const nextP = (t + 1) / 80;
      const nextA = baseAngle + nextP * PI * 1.5;
      const nextR = nextP * maxR;
      const x2 = cos(nextA) * nextR;
      const y2 = sin(nextA) * nextR;
      line(x1, y1, x2, y2);
    }
  }

  // 渦旋末端的小圓（水珠感）
  noStroke();
  for (let a = 0; a < arms; a++) {
    const baseAngle = (TWO_PI / arms) * a;
    const endAngle = baseAngle + PI * 1.5;
    const px = cos(endAngle) * maxR;
    const py = sin(endAngle) * maxR;
    fill(a % 2 === 0 ? c1 : c2);
    ellipse(px, py, s * 0.05, s * 0.05);
  }

  // 中心
  fill(c4);
  stroke(palette.border);
  strokeWeight(s * 0.005);
  ellipse(0, 0, maxR * 0.25, maxR * 0.25);

  fill(c1);
  noStroke();
  ellipse(0, 0, maxR * 0.12, maxR * 0.12);
}

// ===== 基礎形狀工具 =====

// 花瓣形狀（尖橢圓）
function drawPetal(cx, cy, length, width) {
  beginShape();
  vertex(cx, cy);
  bezierVertex(
    cx - width * 0.8, cy - length * 0.4,
    cx - width * 0.3, cy - length * 0.9,
    cx, cy - length
  );
  bezierVertex(
    cx + width * 0.3, cy - length * 0.9,
    cx + width * 0.8, cy - length * 0.4,
    cx, cy
  );
  endShape(CLOSE);
}

// 葉片形狀
function drawLeafShape(cx, cy, length, width, angle) {
  push();
  translate(cx, cy);
  rotate(angle);
  beginShape();
  vertex(0, length * 0.5);
  bezierVertex(
    -width, length * 0.15,
    -width * 0.8, -length * 0.35,
    0, -length * 0.5
  );
  bezierVertex(
    width * 0.8, -length * 0.35,
    width, length * 0.15,
    0, length * 0.5
  );
  endShape(CLOSE);

  // 葉脈
  stroke(palette.border);
  strokeWeight(length * 0.015);
  line(0, length * 0.4, 0, -length * 0.4);
  pop();
}

// 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ===== 互動 =====
function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  tileSize = (size - size * 0.12) / gridCols;
  redraw();
}

function keyPressed() {
  // 空白鍵：重新生成
  if (key === ' ') {
    palette = palettes[floor(rand() * palettes.length)];
    const allTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    shuffle(allTypes);
    const numTypes = floor(rand() * 3) + 1;
    patternTypes = allTypes.slice(0, numTypes);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        tilePatterns[r][c] = {
          type: patternTypes[floor(rand() * patternTypes.length)],
          rotation: floor(rand() * 4) * HALF_PI,
          colorIdx: floor(rand() * palette.colors.length),
          petalCount: floor(rand() * 4) * 2 + 6,
          innerScale: rand() * 0.15 + 0.2,
          hasCorner: rand() < 0.7,
          hasBorder: rand() < 0.8,
          layerCount: floor(rand() * 2) + 2,
        };
      }
    }
    redraw();
  }

  // S 鍵：存圖
  if (key === 's' || key === 'S') {
    const filename = `taiwan-tiles-${fxhash.slice(0, 8)}-${Date.now()}`;
    saveCanvas(filename, 'png');
  }
}
