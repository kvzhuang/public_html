// ============================================
// fxhash Generative Art - Truchet 編織
// ============================================
// 每個 tile 有兩條弧形緞帶交叉，透過 over/under
// 遮擋關係產生立體編織的視覺錯覺。

const rand = fxrand;

// 參數變數
let palette;
let bgColor;
let gridSize;
let tiles = [];
let ribbonWidth; // 緞帶寬度（px）
let ribbonRatio; // 緞帶寬度比例（相對於格子大小）
let shadowOffset; // 陰影偏移
let showGap; // 是否在交叉處顯示間隙
let gapColor; // 間隙顏色（通常跟背景一樣）
let weaveStyle; // "arc" | "diagonal"
let showHighlight; // 是否顯示高光

// 調色盤 - 復用原作的豐富配色
const palettes = [
  { name: "Bauhaus", colors: ["#BE1E2D", "#FFDE17", "#21409A", "#E85D04", "#00A878"] },
  { name: "Mondrian", colors: ["#D40920", "#1356A2", "#F7D842", "#E85D04", "#2E933C"] },
  { name: "Matisse", colors: ["#E63946", "#F4A261", "#2A9D8F", "#264653", "#E9C46A", "#A8DADC"] },
  { name: "Rainbow", colors: ["#FF595E", "#FF924C", "#FFCA3A", "#8AC926", "#1982C4", "#6A4C93"] },
  { name: "Vivid", colors: ["#FB5607", "#FF006E", "#8338EC", "#3A86FF", "#FFBE0B", "#06D6A0"] },
  { name: "Retro", colors: ["#F94144", "#F3722C", "#F8961E", "#F9C74F", "#90BE6D", "#43AA8B", "#577590"] },
  { name: "Candy", colors: ["#FF69B4", "#FF85A2", "#FFA07A", "#FFB6C1", "#FF6B6B", "#E75480", "#FF5F7E"] },
  { name: "Ocean", colors: ["#03045E", "#0077B6", "#00B4D8", "#0096C7", "#023E8A", "#48CAE4"] },
  { name: "Forest", colors: ["#1B4332", "#2D6A4F", "#40916C", "#52B788", "#74C69D", "#386641"] },
  { name: "Sunset", colors: ["#FF6B35", "#FF8C42", "#004E89", "#1A659E", "#FF9F1C", "#E71D36"] },
  { name: "Neon", colors: ["#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4CC9F0", "#560BAD"] },
  { name: "Earth", colors: ["#6B4423", "#8B5A2B", "#CD853F", "#DEB887", "#D2691E", "#A0522D", "#F4A460"] },
  { name: "Berry", colors: ["#7B2D8E", "#9B3D9E", "#BB4DAE", "#DB5DBE", "#8B1E3F", "#3C1053", "#D4447E"] },
  { name: "Tropical", colors: ["#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77", "#4D96FF", "#FF8FB1"] },
  { name: "Cyberpunk", colors: ["#FF2A6D", "#05D9E8", "#D1F7FF", "#7B61FF", "#01012B", "#FF6B6B"] },
  { name: "Electric", colors: ["#7400B8", "#6930C3", "#5E60CE", "#5390D9", "#4EA8DE", "#48BFE3"] },
  { name: "Galaxy", colors: ["#667EEA", "#764BA2", "#F093FB", "#F5576C", "#4FACFE", "#00F2FE"] },
  { name: "Neural", colors: ["#3c1a5b", "#7209b7", "#b5179e", "#f72585", "#560bad", "#480ca8"] },
  { name: "Autumn", colors: ["#D4A373", "#CCD5AE", "#BC6C25", "#DDA15E", "#606C38", "#283618"] },
  { name: "Coral", colors: ["#FF6F61", "#FF9671", "#FFC75F", "#F9F871", "#E8505B", "#D45D79"] },
  { name: "Mint", colors: ["#00B894", "#00CEC9", "#55EFC4", "#20BF6B", "#0FB9B1", "#26DE81"] },
  { name: "Fire", colors: ["#FF0000", "#FF4500", "#FF6347", "#FF7F50", "#FFA500", "#FFD700"] },
  { name: "Ice", colors: ["#A5F3FC", "#67E8F9", "#22D3EE", "#06B6D4", "#0891B2", "#0E7490"] },
  { name: "Sakura", colors: ["#FFB7C5", "#FF69B4", "#FFC0CB", "#DB7093", "#C71585", "#FF1493"] },
  { name: "Nippon", colors: ["#8E050F", "#D63336", "#F59A36", "#233953", "#AE8057", "#CCA481"] },
  { name: "Wabi", colors: ["#5B7065", "#8F9E8B", "#C8D1C0", "#D4C5A9", "#8B7355", "#6B5344"] },
  { name: "Vintage", colors: ["#E07A5F", "#3D405B", "#81B29A", "#F2CC8F", "#5F797B", "#9A8C98"] },
  { name: "ArtDeco", colors: ["#3f647e", "#688fad", "#00b0b2", "#d4af37", "#1c1c1c", "#c9a227"] },
  { name: "MidCentury", colors: ["#E8D5B7", "#F2A65A", "#5B8C5A", "#E94F37", "#1E3D59", "#FF6B35"] },
  { name: "Pop", colors: ["#FFBE0B", "#FB5607", "#FF006E", "#8338EC", "#3A86FF", "#06D6A0"] },
  { name: "Nordic", colors: ["#2E4057", "#048A81", "#54C6EB", "#8EE3EF", "#F25F5C", "#355070"] },
  { name: "Jewel", colors: ["#50C878", "#0F52BA", "#E0115F", "#9966CC", "#FFD700", "#FF6700"] },
  { name: "Cappuccino", colors: ["#4b3832", "#854442", "#3c2f2f", "#be9b7b", "#a67b5b", "#6f4e37"] },
  { name: "Macaron", colors: ["#FF6B9D", "#C44569", "#F8B500", "#7ED3B2", "#5D93E1", "#F38181"] },
  { name: "Moonlight", colors: ["#4a4e4d", "#0e9aa7", "#3da4ab", "#f6cd61", "#fe8a71", "#96ceb4"] },
  { name: "Aurora", colors: ["#88D9E6", "#526760", "#8B8BAE", "#7A6C5D", "#2A3D45", "#5AA9E6"] },
  { name: "GoldNoir", colors: ["#FFD700", "#F4C430", "#DAA520", "#B8860B", "#E6BE8A", "#CFAA45", "#0D0D0D"] },
  { name: "Pastel", colors: ["#fe9c8f", "#feb2a8", "#fec8c1", "#fad9c1", "#f9caa7", "#a8e6cf"] },
  { name: "Dreamy", colors: ["#ffd3b6", "#dcedc1", "#a8e6cf", "#ff8b94", "#ffaaa5", "#c7ceea"] },
  { name: "Monokai", colors: ["#F92672", "#66D9EF", "#A6E22E", "#FD971F", "#AE81FF", "#E6DB74"] },
  { name: "Dracula", colors: ["#FF79C6", "#8BE9FD", "#50FA7B", "#FFB86C", "#BD93F9", "#F1FA8C"] },
  { name: "Evangelion", colors: ["#4F2A92", "#60289B", "#B8E84C", "#F58D39", "#E52C2C", "#F4B943"] },
  { name: "Totoro", colors: ["#759464", "#6C7A8E", "#F3DC7B", "#AE3D31", "#C5A1D6", "#362E59"] },
  { name: "Spirited", colors: ["#04A4FC", "#78D4FC", "#1C4C84", "#9E6E4A", "#3C989B", "#A5A865"] },
  { name: "Contrast", colors: ["#FF6B6B", "#4ECDC4", "#2C3E50", "#F39C12", "#9B59B6", "#1ABC9C"] },
  { name: "Bold", colors: ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C"] },
];

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);

  palette = palettes[floor(rand() * palettes.length)];
  setupBackground();
  setupWeave();

  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Grid": gridSize + "x" + gridSize,
    "Style": weaveStyle === "arc" ? "Curves" : "Diagonal",
    "Highlight": showHighlight ? "Yes" : "No",
    "Gap": showGap ? "Yes" : "No",
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

// ── 背景設定 ──

function setupBackground() {
  const brightnesses = palette.colors.map(c => getBrightness(c));
  const minB = Math.min(...brightnesses);
  const maxB = Math.max(...brightnesses);

  const darkBgs = ["#1A1A2E", "#1C1C1C", "#121212", "#0a0a0a", "#2C3E50", "#1E3D59", "#0D1B2A"];
  const lightBgs = ["#FFFFFF", "#FAF9F6", "#F5F5F5", "#FFFEF9", "#FDF6E3", "#FFFCF2", "#F8F9FA"];

  const threshold = 80;
  const canDark = minB > threshold;
  const canLight = maxB < (255 - threshold);

  if (canDark && canLight) {
    bgColor = rand() < 0.6
      ? lightBgs[floor(rand() * lightBgs.length)]
      : darkBgs[floor(rand() * darkBgs.length)];
  } else if (canLight) {
    bgColor = lightBgs[floor(rand() * lightBgs.length)];
  } else if (canDark) {
    bgColor = darkBgs[floor(rand() * darkBgs.length)];
  } else {
    bgColor = "#F5F5F5";
  }
}

// ── 編織設定 ──

function setupWeave() {
  gridSize = floor(rand() * 7) + 5; // 5-11
  ribbonRatio = rand() * 0.08 + 0.16; // 格子的 16%-24%
  showGap = rand() < 0.75;
  showHighlight = rand() < 0.65;
  weaveStyle = rand() < 0.7 ? "arc" : "diagonal";

  updateDimensions();

  const usable = getContrastingColors();

  tiles = [];
  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      // direction: 哪條緞帶在上面
      // 0 = "\" 方向的帶子壓在 "/" 方向上面
      // 1 = "/" 方向的帶子壓在 "\" 方向上面
      const c1 = pickColor(usable);
      let c2 = pickColor(usable);
      if (usable.length > 1) {
        while (c2 === c1) c2 = pickColor(usable);
      }

      tiles[row][col] = {
        over: rand() < 0.5 ? 0 : 1, // 誰在上面
        color1: c1, // "\" 方向緞帶色
        color2: c2, // "/" 方向緞帶色
      };
    }
  }
}

function updateDimensions() {
  const canvasSize = min(windowWidth, windowHeight);
  const margin = canvasSize * 0.08;
  const gridWidth = canvasSize - margin * 2;
  const cellSize = gridWidth / gridSize;
  ribbonWidth = cellSize * ribbonRatio;
  shadowOffset = ribbonWidth * 0.18;
}

// ── 繪製 ──

function draw() {
  background(bgColor);

  const margin = width * 0.08;
  const gridWidth = width - margin * 2;
  const cellSize = gridWidth / gridSize;
  gapColor = bgColor;

  push();
  translate(margin, margin);

  // 每個 tile 繪製兩條交叉的緞帶，按 over/under 順序分層繪製
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const tile = tiles[row][col];
      drawTile(x, y, cellSize, tile);
    }
  }

  pop();
}

function drawTile(x, y, size, tile) {
  const half = size / 2;
  const rw = ribbonWidth;

  // 定義兩條路徑: A = "\" 方向 (左上→右下), B = "/" 方向 (右上→左下)
  // 根據 weaveStyle 分別用弧線或對角線

  // 先畫底層（被壓在下面的那條）
  const underDir = tile.over === 0 ? 1 : 0; // 底層方向
  const overDir = tile.over; // 上層方向

  const underColor = underDir === 0 ? tile.color1 : tile.color2;
  const overColor = overDir === 0 ? tile.color1 : tile.color2;

  // ── 畫底層完整緞帶 ──
  drawRibbon(x, y, size, underDir, underColor, false);

  // ── 在交叉處用背景色切斷底層（產生 under 效果）──
  if (showGap) {
    drawGap(x, y, size, overDir);
  }

  // ── 畫上層完整緞帶（含陰影）──
  drawRibbon(x, y, size, overDir, overColor, true);
}

function drawRibbon(x, y, size, dir, col, isOver) {
  const rw = ribbonWidth;

  // 陰影
  if (isOver && shadowOffset > 0.5) {
    push();
    drawingContext.save();
    drawingContext.shadowColor = "rgba(0,0,0,0.25)";
    drawingContext.shadowBlur = shadowOffset * 2;
    drawingContext.shadowOffsetX = shadowOffset * 0.5;
    drawingContext.shadowOffsetY = shadowOffset * 0.5;
    drawRibbonShape(x, y, size, dir, col, rw);
    drawingContext.restore();
    pop();
  } else {
    drawRibbonShape(x, y, size, dir, col, rw);
  }

  // 高光
  if (showHighlight && isOver) {
    drawHighlight(x, y, size, dir, rw);
  }
}

function drawRibbonShape(x, y, size, dir, col, rw) {
  noFill();
  stroke(col);
  strokeWeight(rw);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  if (weaveStyle === "arc") {
    drawArcRibbon(x, y, size, dir);
  } else {
    drawDiagonalRibbon(x, y, size, dir, rw);
  }
}

function drawArcRibbon(x, y, size, dir) {
  // dir 0: "\" 方向 → 左上角弧 + 右下角弧（跟原 Truchet Curves 的 direction=1 一樣）
  // dir 1: "/" 方向 → 左下角弧 + 右上角弧（跟原 Truchet Curves 的 direction=0 一樣）
  if (dir === 0) {
    arc(x, y, size, size, 0, HALF_PI);
    arc(x + size, y + size, size, size, PI, PI + HALF_PI);
  } else {
    arc(x, y + size, size, size, -HALF_PI, 0);
    arc(x + size, y, size, size, HALF_PI, PI);
  }
}

function drawDiagonalRibbon(x, y, size, dir, rw) {
  const half = size / 2;
  if (dir === 0) {
    // "\" 方向：上邊中點→右邊中點，左邊中點→下邊中點
    line(x + half, y, x + size, y + half);
    line(x, y + half, x + half, y + size);
  } else {
    // "/" 方向：上邊中點→左邊中點，右邊中點→下邊中點
    line(x + half, y, x, y + half);
    line(x + size, y + half, x + half, y + size);
  }
}

function drawGap(x, y, size, overDir) {
  // 在上層路徑的位置畫稍寬的背景色線條，遮住底層
  noFill();
  stroke(gapColor);
  strokeWeight(ribbonWidth + ribbonWidth * 0.35);
  strokeCap(ROUND);

  if (weaveStyle === "arc") {
    drawArcRibbon(x, y, size, overDir);
  } else {
    drawDiagonalRibbon(x, y, size, overDir, ribbonWidth);
  }
}

function drawHighlight(x, y, size, dir, rw) {
  // 在緞帶中心畫一條細的半透明白色線，模擬光澤
  noFill();
  const hlAlpha = getBrightness(bgColor) < 128 ? 60 : 35;
  stroke(255, 255, 255, hlAlpha);
  strokeWeight(rw * 0.2);
  strokeCap(ROUND);

  if (weaveStyle === "arc") {
    drawArcRibbon(x, y, size, dir);
  } else {
    drawDiagonalRibbon(x, y, size, dir, rw);
  }
}

// ── 輔助函數 ──

function getBrightness(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getColorDistance(h1, h2) {
  const r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
  const r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function getContrastingColors() {
  return palette.colors.filter(c => getColorDistance(c, bgColor) >= 60);
}

function pickColor(available) {
  if (available.length === 0) return palette.colors[floor(rand() * palette.colors.length)];
  return available[floor(rand() * available.length)];
}

// ── 互動 ──

function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  updateDimensions();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    palette = palettes[floor(rand() * palettes.length)];
    setupBackground();
    setupWeave();
    redraw();
  }

  if (key === 's' || key === 'S') {
    const filename = `truchet-weave-${fxhash.slice(0, 8)}-${Date.now()}`;
    saveCanvas(filename, 'png');
  }

  if (key === 'p' || key === 'P') {
    saveHighRes(2);
  }

  if (key === 'h' || key === 'H') {
    saveHighRes(4);
  }
}

// ── 高解析度輸出 ──

function saveHighRes(scaleFactor) {
  const highResSize = width * scaleFactor;
  const pg = createGraphics(highResSize, highResSize);
  pg.background(bgColor);

  const margin = highResSize * 0.08;
  const gridWidth = highResSize - margin * 2;
  const cellSize = gridWidth / gridSize;
  const scaledRW = ribbonWidth * scaleFactor;
  const scaledShadow = shadowOffset * scaleFactor;

  pg.push();
  pg.translate(margin, margin);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const tile = tiles[row][col];
      drawTileHR(pg, x, y, cellSize, tile, scaledRW, scaledShadow);
    }
  }

  pg.pop();

  const filename = `truchet-weave-${fxhash.slice(0, 8)}-${highResSize}px-${Date.now()}`;
  save(pg, filename, 'png');
  pg.remove();
}

function drawTileHR(pg, x, y, size, tile, rw, shadow) {
  const underDir = tile.over === 0 ? 1 : 0;
  const overDir = tile.over;
  const underColor = underDir === 0 ? tile.color1 : tile.color2;
  const overColor = overDir === 0 ? tile.color1 : tile.color2;

  // 底層
  drawRibbonHR(pg, x, y, size, underDir, underColor, rw, false, shadow);

  // 間隙
  if (showGap) {
    pg.noFill();
    pg.stroke(bgColor);
    pg.strokeWeight(rw + rw * 0.35);
    pg.strokeCap(ROUND);
    if (weaveStyle === "arc") {
      drawArcHR(pg, x, y, size, overDir);
    } else {
      drawDiagHR(pg, x, y, size, overDir);
    }
  }

  // 上層
  drawRibbonHR(pg, x, y, size, overDir, overColor, rw, true, shadow);
}

function drawRibbonHR(pg, x, y, size, dir, col, rw, isOver, shadow) {
  if (isOver && shadow > 0.5) {
    pg.drawingContext.save();
    pg.drawingContext.shadowColor = "rgba(0,0,0,0.25)";
    pg.drawingContext.shadowBlur = shadow * 2;
    pg.drawingContext.shadowOffsetX = shadow * 0.5;
    pg.drawingContext.shadowOffsetY = shadow * 0.5;
  }

  pg.noFill();
  pg.stroke(col);
  pg.strokeWeight(rw);
  pg.strokeCap(ROUND);

  if (weaveStyle === "arc") {
    drawArcHR(pg, x, y, size, dir);
  } else {
    drawDiagHR(pg, x, y, size, dir);
  }

  if (isOver && shadow > 0.5) {
    pg.drawingContext.restore();
  }

  // 高光
  if (showHighlight && isOver) {
    const hlAlpha = getBrightness(bgColor) < 128 ? 60 : 35;
    pg.noFill();
    pg.stroke(255, 255, 255, hlAlpha);
    pg.strokeWeight(rw * 0.2);
    pg.strokeCap(ROUND);
    if (weaveStyle === "arc") {
      drawArcHR(pg, x, y, size, dir);
    } else {
      drawDiagHR(pg, x, y, size, dir);
    }
  }
}

function drawArcHR(pg, x, y, size, dir) {
  if (dir === 0) {
    pg.arc(x, y, size, size, 0, HALF_PI);
    pg.arc(x + size, y + size, size, size, PI, PI + HALF_PI);
  } else {
    pg.arc(x, y + size, size, size, -HALF_PI, 0);
    pg.arc(x + size, y, size, size, HALF_PI, PI);
  }
}

function drawDiagHR(pg, x, y, size, dir) {
  const half = size / 2;
  if (dir === 0) {
    pg.line(x + half, y, x + size, y + half);
    pg.line(x, y + half, x + half, y + size);
  } else {
    pg.line(x + half, y, x, y + half);
    pg.line(x + size, y + half, x + half, y + size);
  }
}
