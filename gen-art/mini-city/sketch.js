// ============================================
// Miniature City - Generative Art
// 九龍城寨風格的等角透視微縮城市
// 密集建築堆疊 + 支撐柱 + 屋頂細節
// ============================================

const rand = fxrand;

// --- 配色 ---
const PALETTES = [
  {
    name: "Ink Wash",
    bg: '#F5F0E8',
    wallBase: ['#D4CFC5', '#C8C0B4', '#BEB5A7', '#E0D8CC', '#CAC2B5'],
    wallSide: ['#A09888', '#8E8678', '#9A9080', '#B0A898', '#7A7268'],
    accent: ['#C87070', '#D4A080', '#8B7355', '#6B8E8E', '#A07878'],
    outline: '#3A3530',
    window: '#5A5248',
    pipe: '#7A7268',
  },
  {
    name: "Blueprint",
    bg: '#E8EEF5',
    wallBase: ['#C8D4E0', '#B8C8D8', '#D0D8E4', '#BCC8D6', '#A8B8CC'],
    wallSide: ['#7890A8', '#6880A0', '#8898B0', '#5A7090', '#6A7A98'],
    accent: ['#D08040', '#C06040', '#E8A060', '#A06048', '#D47848'],
    outline: '#2A3548',
    window: '#4A5A70',
    pipe: '#5A6A80',
  },
  {
    name: "Sunset",
    bg: '#F8F0E0',
    wallBase: ['#E0C8B0', '#D8C0A8', '#E8D0B8', '#D0B898', '#DCC4AC'],
    wallSide: ['#A88868', '#987858', '#B09070', '#886848', '#9A8060'],
    accent: ['#D06050', '#E07848', '#C84840', '#D45838', '#B84838'],
    outline: '#3A2820',
    window: '#5A4030',
    pipe: '#8A6850',
  },
  {
    name: "Moss",
    bg: '#EEF2E8',
    wallBase: ['#C8D0B8', '#B8C4A8', '#D0D8C0', '#BCC8AC', '#AABCA0'],
    wallSide: ['#7A8A68', '#6A7A58', '#8A9A78', '#5A6A48', '#6A7858'],
    accent: ['#C87050', '#A8684C', '#D48060', '#907058', '#B87858'],
    outline: '#2A3020',
    window: '#4A5838',
    pipe: '#5A6848',
  },
];

let palette;
let buildings = [];
let pillars = [];
let rooftopItems = [];
let canvasSize;
let gridSize;

// 等角投影常數
const ISO_COS = Math.cos(Math.PI / 6); // cos(30°) ≈ 0.866
const ISO_SIN = 0.5;

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);

  palette = PALETTES[floor(rand() * PALETTES.length)];
  gridSize = floor(rand() * 4) + 8; // 8~11

  generateCity();

  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Grid": gridSize,
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

// ===== 等角座標轉換 =====
function isoX(gx, gy) {
  return (gx - gy) * ISO_COS;
}

function isoY(gx, gy, gz) {
  return (gx + gy) * ISO_SIN - gz;
}

// ===== 生成城市 =====
function generateCity() {
  buildings = [];
  pillars = [];
  rooftopItems = [];

  const unit = canvasSize * 0.032;

  // 高度圖：中間高，邊緣低（模擬城寨的有機堆疊）
  const heightMap = [];
  const cx = gridSize / 2;
  const cy = gridSize / 2;

  for (let gy = 0; gy < gridSize; gy++) {
    heightMap[gy] = [];
    for (let gx = 0; gx < gridSize; gx++) {
      const dx = (gx - cx) / cx;
      const dy = (gy - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseH = Math.max(0, 1 - dist * 0.7);
      const h = floor(baseH * 6 + rand() * 4) + 1;
      // 隨機挖空一些格子（製造不規則邊緣）
      if (dist > 0.8 && rand() < 0.4) {
        heightMap[gy][gx] = 0;
      } else {
        heightMap[gy][gx] = h;
      }
    }
  }

  // 建築物
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const h = heightMap[gy][gx];
      if (h <= 0) continue;

      // 每格可能有 1~3 棟不同高度的子建築
      const subCount = floor(rand() * 3) + 1;
      for (let s = 0; s < subCount; s++) {
        const subW = 0.3 + rand() * 0.7;
        const subD = 0.3 + rand() * 0.7;
        const subH = h * (0.4 + rand() * 0.6);
        const offX = (rand() - 0.5) * (1 - subW) * 0.8;
        const offY = (rand() - 0.5) * (1 - subD) * 0.8;

        buildings.push({
          gx: gx + offX,
          gy: gy + offY,
          w: subW,
          d: subD,
          h: subH,
          wallColor: floor(rand() * palette.wallBase.length),
          hasWindows: rand() < 0.8,
          hasAC: rand() < 0.3,
          hasPipe: rand() < 0.2,
          hasSign: rand() < 0.15,
          signColor: floor(rand() * palette.accent.length),
        });
      }

      // 屋頂物件（放在這格最後一棟建築的正上方）
      if (rand() < 0.5 && buildings.length > 0) {
        const lastB = buildings[buildings.length - 1];
        const type = rand() < 0.3 ? 'antenna' : (rand() < 0.5 ? 'watertank' : 'chimney');
        rooftopItems.push({
          gx: lastB.gx,
          gy: lastB.gy,
          gz: lastB.h,
          type: type,
        });
      }
    }
  }

  // 底部支撐柱
  for (let gy = 0; gy < gridSize; gy += 2) {
    for (let gx = 0; gx < gridSize; gx += 2) {
      if (heightMap[gy] && heightMap[gy][gx] > 0) {
        if (rand() < 0.6) {
          pillars.push({
            gx: gx + (rand() - 0.5) * 0.3,
            gy: gy + (rand() - 0.5) * 0.3,
            height: 1 + rand() * 1.2,
          });
        }
      }
    }
  }

  // 排序：畫家演算法（後排先畫）
  buildings.sort((a, b) => {
    const da = a.gx + a.gy;
    const db = b.gx + b.gy;
    if (da !== db) return da - db;
    return a.h - b.h;
  });
}

// ===== 繪製 =====
function draw() {
  background(palette.bg);

  const unit = canvasSize * 0.032;
  const offsetX = canvasSize / 2;
  const offsetY = canvasSize * 0.42;

  // 裁切區域：整個畫面留一點邊距
  const clipMargin = canvasSize * 0.03;
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(clipMargin, clipMargin, canvasSize - clipMargin * 2, canvasSize - clipMargin * 2);
  drawingContext.clip();

  push();
  translate(offsetX, offsetY);

  // 底部支撐柱
  drawPillars(unit);

  // 建築物
  for (const b of buildings) {
    drawBuilding(b, unit);
  }

  // 屋頂物件
  for (const item of rooftopItems) {
    drawRooftopItem(item, unit);
  }

  // 管線（隨機橫跨）
  drawPipes(unit);

  pop();

  drawingContext.restore();
}

// ===== 繪製建築物 =====
function drawBuilding(b, unit) {
  const x = isoX(b.gx, b.gy) * unit;
  const yBase = isoY(b.gx, b.gy, 0) * unit;
  const yTop = isoY(b.gx, b.gy, b.h) * unit;
  const w = b.w * unit * ISO_COS;
  const d = b.d * unit * ISO_COS;
  const h = (yBase - yTop);

  const topCol = color(palette.wallBase[b.wallColor]);
  const leftCol = color(palette.wallSide[b.wallColor]);
  const rightCol = color(palette.wallSide[(b.wallColor + 1) % palette.wallSide.length]);

  // 頂面
  fill(topCol);
  stroke(palette.outline);
  strokeWeight(0.6);
  quad(
    x, yTop,
    x + w, yTop + d * ISO_SIN,
    x, yTop + d * ISO_SIN * 2,
    x - w, yTop + d * ISO_SIN
  );

  // 左面
  fill(leftCol);
  quad(
    x - w, yTop + d * ISO_SIN,
    x, yTop + d * ISO_SIN * 2,
    x, yBase + d * ISO_SIN * 2,
    x - w, yBase + d * ISO_SIN
  );

  // 右面
  fill(rightCol);
  quad(
    x, yTop + d * ISO_SIN * 2,
    x + w, yTop + d * ISO_SIN,
    x + w, yBase + d * ISO_SIN,
    x, yBase + d * ISO_SIN * 2
  );

  // 窗戶
  if (b.hasWindows && h > unit * 0.5) {
    drawWindows(x, yTop, yBase, w, d, h, b);
  }

  // 招牌
  if (b.hasSign) {
    const sc = color(palette.accent[b.signColor]);
    fill(sc);
    noStroke();
    const signY = yTop + h * 0.3;
    const signW = w * 0.6;
    const signH = unit * 0.15;
    rect(x - signW / 2, signY, signW, signH);
  }
}

// ===== 窗戶 =====
function drawWindows(x, yTop, yBase, w, d, h, b) {
  const winSize = w * 0.12;
  const winGap = winSize * 2.2;
  const winCol = color(palette.window);
  winCol.setAlpha(180);
  fill(winCol);
  noStroke();

  // 左面窗戶
  const leftStartX = x - w + winGap * 0.5;
  const cols = floor(w / winGap);
  const rowsCount = floor(h / winGap);

  for (let r = 0; r < rowsCount; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.15) continue; // 隨機缺窗
      const wx = leftStartX + c * winGap * 0.5 + r * winGap * 0.1;
      const wy = yTop + d * ISO_SIN + winGap * 0.5 + r * winGap;
      if (wy > yBase + d * ISO_SIN - winGap * 0.3) continue;
      rect(wx, wy, winSize, winSize);

      // 偶爾亮窗
      if (rand() < 0.1) {
        const lc = color(palette.accent[floor(rand() * palette.accent.length)]);
        lc.setAlpha(120);
        fill(lc);
        rect(wx, wy, winSize, winSize);
        fill(winCol);
      }
    }
  }

  // 右面窗戶
  for (let r = 0; r < rowsCount; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.15) continue;
      const wx = x + c * winGap * 0.5 - r * winGap * 0.1 + winGap * 0.3;
      const wy = yTop + d * ISO_SIN + winGap * 0.5 + r * winGap;
      if (wy > yBase + d * ISO_SIN - winGap * 0.3) continue;
      rect(wx, wy, winSize, winSize);
    }
  }
}

// ===== 支撐柱 =====
function drawPillars(unit) {
  stroke(palette.outline);
  strokeWeight(0.8);

  for (const p of pillars) {
    const x = isoX(p.gx, p.gy) * unit;
    const yTop = isoY(p.gx, p.gy, 0) * unit;
    const yBot = yTop + p.height * unit;

    const pillarW = unit * 0.08;
    fill(palette.wallSide[0]);
    rect(x - pillarW / 2, yTop, pillarW, yBot - yTop);

    // 橫撐
    if (rand() < 0.4) {
      const bracketY = yTop + (yBot - yTop) * (0.3 + rand() * 0.4);
      strokeWeight(0.5);
      line(x - unit * 0.15, bracketY, x + unit * 0.15, bracketY);
    }
  }
}

// ===== 屋頂物件 =====
function drawRooftopItem(item, unit) {
  const x = isoX(item.gx, item.gy) * unit;
  const y = isoY(item.gx, item.gy, item.gz) * unit;

  stroke(palette.outline);
  strokeWeight(0.6);

  if (item.type === 'antenna') {
    // 天線
    fill(palette.pipe);
    const ah = unit * (0.3 + rand() * 0.4);
    strokeWeight(0.8);
    line(x, y, x, y - ah);
    // 橫桿
    line(x - unit * 0.08, y - ah * 0.7, x + unit * 0.08, y - ah * 0.7);
    // 頂端小圓
    fill(palette.accent[floor(rand() * palette.accent.length)]);
    noStroke();
    ellipse(x, y - ah, unit * 0.04, unit * 0.04);
  } else if (item.type === 'watertank') {
    // 水塔
    fill(palette.wallSide[floor(rand() * palette.wallSide.length)]);
    const tw = unit * 0.18;
    const th = unit * 0.22;
    // 支架
    strokeWeight(0.5);
    stroke(palette.outline);
    line(x - tw * 0.3, y, x - tw * 0.3, y - th * 0.4);
    line(x + tw * 0.3, y, x + tw * 0.3, y - th * 0.4);
    // 桶身
    fill(palette.wallBase[floor(rand() * palette.wallBase.length)]);
    ellipse(x, y - th * 0.6, tw, th * 0.6);
  } else {
    // 煙囪
    fill(palette.wallSide[floor(rand() * palette.wallSide.length)]);
    const cw = unit * 0.06;
    const ch = unit * (0.15 + rand() * 0.2);
    rect(x - cw / 2, y - ch, cw, ch);
    // 煙
    noFill();
    stroke(palette.outline);
    strokeWeight(0.3);
    const smokeX = x + (rand() - 0.5) * unit * 0.05;
    bezier(x, y - ch, smokeX - unit * 0.05, y - ch - unit * 0.1,
           smokeX + unit * 0.05, y - ch - unit * 0.15, smokeX, y - ch - unit * 0.2);
  }
}

// ===== 管線（沿建築牆面） =====
function drawPipes(unit) {
  const pipeCount = floor(rand() * 6) + 3;
  stroke(palette.pipe);
  noFill();

  if (buildings.length < 2) return;

  for (let i = 0; i < pipeCount; i++) {
    const b = buildings[floor(rand() * buildings.length)];
    if (b.h < 1) continue;

    // 管線沿著單棟建築的牆面垂直跑（外露管線），更真實
    const side = rand() < 0.5 ? 'left' : 'right';
    const pipeTopZ = b.h * (0.5 + rand() * 0.45);
    const pipeBotZ = b.h * (rand() * 0.2);

    // 管線的水平偏移（貼牆面）
    const wallOffset = (side === 'left')
      ? -b.w * 0.35 - rand() * b.w * 0.1
      : b.w * 0.35 + rand() * b.w * 0.1;

    const px = isoX(b.gx + wallOffset, b.gy) * unit;
    const pyTop = isoY(b.gx + wallOffset, b.gy, pipeTopZ) * unit;
    const pyBot = isoY(b.gx + wallOffset, b.gy, pipeBotZ) * unit;

    // 垂直管線
    strokeWeight(0.8);
    line(px, pyTop, px, pyBot);

    // 水平短橫管（接頭）
    const bracketLen = unit * 0.06;
    const bracketCount = floor(rand() * 3) + 1;
    for (let j = 0; j < bracketCount; j++) {
      const t = (j + 1) / (bracketCount + 1);
      const by = lerp(pyTop, pyBot, t);
      strokeWeight(0.6);
      line(px - bracketLen, by, px + bracketLen, by);
    }

    // 偶爾在頂端畫一個 L 形彎管（轉入屋頂）
    if (rand() < 0.4) {
      const bendLen = unit * 0.08;
      const bendDir = (side === 'left') ? 1 : -1;
      strokeWeight(0.8);
      line(px, pyTop, px + bendLen * bendDir, pyTop);
    }

    // 偶爾在底端畫一個 L 形排水口
    if (rand() < 0.3) {
      const drainLen = unit * 0.06;
      const drainDir = (side === 'left') ? -1 : 1;
      strokeWeight(0.8);
      line(px, pyBot, px + drainLen * drainDir, pyBot);
    }
  }
}

// ===== 互動 =====
function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  generateCity();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    palette = PALETTES[floor(rand() * PALETTES.length)];
    gridSize = floor(rand() * 4) + 8;
    generateCity();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`mini-city-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}
