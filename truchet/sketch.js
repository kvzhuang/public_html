// ============================================
// fxhash Generative Art - Truchet 曲線瓷磚
// ============================================

const rand = fxrand;

// 參數變數
let palette;
let bgColor;
let strokeColor; // 描邊顏色
let showStroke; // 是否顯示描邊
let gridSize;
let tiles = [];
let showDots;
let lineWeight;
let lineWeightRatio; // 線條寬度比例（相對於格子大小）
let colorWeightRatio; // 彩色線寬比例
let multiColor; // 多色模式

// 調色盤 - 更豐富的配色
const palettes = [
  // 經典藝術風格
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

  // 現代科技風格
  { name: "Cyberpunk", colors: ["#FF2A6D", "#05D9E8", "#D1F7FF", "#7B61FF", "#01012B", "#FF6B6B"] },
  { name: "Electric", colors: ["#7400B8", "#6930C3", "#5E60CE", "#5390D9", "#4EA8DE", "#48BFE3"] },
  { name: "Galaxy", colors: ["#667EEA", "#764BA2", "#F093FB", "#F5576C", "#4FACFE", "#00F2FE"] },
  { name: "Neural", colors: ["#3c1a5b", "#7209b7", "#b5179e", "#f72585", "#560bad", "#480ca8"] },

  // 自然風格
  { name: "Autumn", colors: ["#D4A373", "#CCD5AE", "#BC6C25", "#DDA15E", "#606C38", "#283618"] },
  { name: "Jungle", colors: ["#2D5A27", "#5B8C5A", "#8FBC8F", "#228B22", "#006400", "#32CD32"] },
  { name: "Coral", colors: ["#FF6F61", "#FF9671", "#FFC75F", "#F9F871", "#E8505B", "#D45D79"] },
  { name: "Mint", colors: ["#00B894", "#00CEC9", "#55EFC4", "#20BF6B", "#0FB9B1", "#26DE81"] },
  { name: "Fire", colors: ["#FF0000", "#FF4500", "#FF6347", "#FF7F50", "#FFA500", "#FFD700"] },
  { name: "Ice", colors: ["#A5F3FC", "#67E8F9", "#22D3EE", "#06B6D4", "#0891B2", "#0E7490"] },

  // 日本傳統色
  { name: "Sakura", colors: ["#FFB7C5", "#FF69B4", "#FFC0CB", "#DB7093", "#C71585", "#FF1493"] },
  { name: "Benihi", colors: ["#e83929", "#e60033", "#e2041b", "#d7003a", "#c9171e", "#b94047"] },
  { name: "Nippon", colors: ["#8E050F", "#D63336", "#F59A36", "#233953", "#AE8057", "#CCA481"] },
  { name: "Wabi", colors: ["#5B7065", "#8F9E8B", "#C8D1C0", "#D4C5A9", "#8B7355", "#6B5344"] },

  // 復古風格
  { name: "Vintage", colors: ["#E07A5F", "#3D405B", "#81B29A", "#F2CC8F", "#5F797B", "#9A8C98"] },
  { name: "ArtDeco", colors: ["#3f647e", "#688fad", "#00b0b2", "#d4af37", "#1c1c1c", "#c9a227"] },
  { name: "Speakeasy", colors: ["#2C3E50", "#D4AF37", "#8B4513", "#006D77", "#1A1A2E", "#C9A227"] },
  { name: "MidCentury", colors: ["#E8D5B7", "#F2A65A", "#5B8C5A", "#E94F37", "#1E3D59", "#FF6B35"] },

  // 流行配色
  { name: "Pop", colors: ["#FFBE0B", "#FB5607", "#FF006E", "#8338EC", "#3A86FF", "#06D6A0"] },
  { name: "Nordic", colors: ["#2E4057", "#048A81", "#54C6EB", "#8EE3EF", "#F25F5C", "#355070"] },
  { name: "Beach", colors: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#023E8A", "#48CAE4"] },
  { name: "Metro", colors: ["#d11141", "#00b159", "#00aedb", "#f37735", "#ffc425", "#8338ec"] },

  // 寶石色系
  { name: "Royal", colors: ["#4B0082", "#800080", "#9400D3", "#8B008B", "#9932CC", "#BA55D3"] },
  { name: "Jewel", colors: ["#50C878", "#0F52BA", "#E0115F", "#9966CC", "#FFD700", "#FF6700"] },
  { name: "Amethyst", colors: ["#9B59B6", "#8E44AD", "#6C3483", "#5B2C6F", "#4A235A", "#D7BDE2"] },
  { name: "Emerald", colors: ["#009B77", "#00A86B", "#50C878", "#2E8B57", "#3CB371", "#98FF98"] },

  // 美食靈感
  { name: "Cappuccino", colors: ["#4b3832", "#854442", "#3c2f2f", "#be9b7b", "#a67b5b", "#6f4e37"] },
  { name: "Macaron", colors: ["#FF6B9D", "#C44569", "#F8B500", "#7ED3B2", "#5D93E1", "#F38181"] },
  { name: "Citrus", colors: ["#FF9505", "#FFBD00", "#FFE135", "#B5E550", "#8CC63F", "#F9A03F"] },

  // 漸層系列
  { name: "Moonlight", colors: ["#4a4e4d", "#0e9aa7", "#3da4ab", "#f6cd61", "#fe8a71", "#96ceb4"] },
  { name: "Skyline", colors: ["#2e003e", "#3d2352", "#3d1e6d", "#8874a3", "#e4dcf1", "#5e239d"] },
  { name: "Aurora", colors: ["#88D9E6", "#526760", "#8B8BAE", "#7A6C5D", "#2A3D45", "#5AA9E6"] },
  { name: "Lava", colors: ["#ff4500", "#ff6347", "#ff7f50", "#ff8c00", "#ffa500", "#dc143c"] },
  { name: "GoldNoir", colors: ["#FFD700", "#F4C430", "#DAA520", "#B8860B", "#E6BE8A", "#CFAA45", "#0D0D0D"] },
  { name: "BlueGrad", colors: ["#0D1B2A", "#1B3A4B", "#2A5F7C", "#3A8EBA", "#5DADE2", "#85C1E9", "#AED6F1"] },
  { name: "GreenGrad", colors: ["#0B3D0B", "#145A14", "#228B22", "#32CD32", "#66CDAA", "#7CFC00", "#90EE90"] },
  { name: "RedGrad", colors: ["#3D0000", "#6B0000", "#8B0000", "#B22222", "#CD5C5C", "#E57373", "#F08080"] },

  // 柔和色系
  { name: "Pastel", colors: ["#fe9c8f", "#feb2a8", "#fec8c1", "#fad9c1", "#f9caa7", "#a8e6cf"] },
  { name: "Dreamy", colors: ["#ffd3b6", "#dcedc1", "#a8e6cf", "#ff8b94", "#ffaaa5", "#c7ceea"] },
  { name: "Cotton", colors: ["#fce4ec", "#f8bbd9", "#f48fb1", "#f06292", "#ec407a", "#e91e63"] },

  // 對比色系
  { name: "Contrast", colors: ["#FF6B6B", "#4ECDC4", "#2C3E50", "#F39C12", "#9B59B6", "#1ABC9C"] },
  { name: "Duotone", colors: ["#6C5CE7", "#FD79A8", "#00CEC9", "#FDCB6E", "#E17055", "#00B894"] },
  { name: "Bold", colors: ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C"] },

  // 程式碼主題
  { name: "Monokai", colors: ["#F92672", "#66D9EF", "#A6E22E", "#FD971F", "#AE81FF", "#E6DB74"] },
  { name: "Dracula", colors: ["#FF79C6", "#8BE9FD", "#50FA7B", "#FFB86C", "#BD93F9", "#F1FA8C"] },
  { name: "OneDark", colors: ["#E06C75", "#61AFEF", "#98C379", "#E5C07B", "#C678DD", "#56B6C2"] },

  // 動漫卡通配色
  { name: "Evangelion", colors: ["#4F2A92", "#60289B", "#B8E84C", "#F58D39", "#E52C2C", "#F4B943"] },
  { name: "Simpsons", colors: ["#FED90F", "#70D1FE", "#F14E28", "#009DDC", "#D1B271", "#F65132"] },
  { name: "Totoro", colors: ["#759464", "#6C7A8E", "#F3DC7B", "#AE3D31", "#C5A1D6", "#362E59"] },
  { name: "Spirited", colors: ["#04A4FC", "#78D4FC", "#1C4C84", "#9E6E4A", "#3C989B", "#A5A865"] },
  { name: "DragonBall", colors: ["#D67711", "#FA0011", "#FF9500", "#550000", "#3D7DCA", "#FFCB05"] },
  { name: "SailorMoon", colors: ["#FFF666", "#FF2E51", "#5158FF", "#D260FF", "#FFB3DF", "#00BFFF"] },
  { name: "Akira", colors: ["#E12120", "#115363", "#9C3111", "#7EA228", "#7E2835", "#5C4454"] },
  { name: "Pokemon", colors: ["#FFCB05", "#3D7DCA", "#FAD61D", "#E19720", "#F62D14", "#003A70"] },
  { name: "SpongeBob", colors: ["#EDD524", "#FF808B", "#8C5C34", "#8E54AE", "#029AC3", "#59A694"] },
  { name: "Adventure", colors: ["#029AC3", "#FFBA1E", "#59A694", "#FE66CA", "#CD93F9", "#373E51"] },
];

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);

  // 選擇調色盤
  palette = palettes[floor(rand() * palettes.length)];

  // 設定背景
  setupBackground();

  // 設定 Truchet 參數
  setupTruchet();

  // 設定 fxhash features
  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Grid": gridSize + "x" + gridSize,
    "Colors": multiColor ? "Multi" : "Standard",
    "Dots": showDots ? "Yes" : "No",
    "Stroke": showStroke ? "Yes" : "No",
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function setupBackground() {
  const brightnesses = palette.colors.map(c => getBrightness(c));
  const minBrightness = Math.min(...brightnesses);
  const maxBrightness = Math.max(...brightnesses);

  // 深色背景選項（加入更多配色相關的深色）
  const darkBgs = ["#1A1A2E", "#1C1C1C", "#121212", "#0a0a0a", "#2C3E50", "#1E3D59", "#0D1B2A"];
  // 淺色背景選項
  const lightBgs = ["#FFFFFF", "#FAF9F6", "#F5F5F5", "#FFFEF9", "#FDF6E3", "#FFFCF2", "#F8F9FA"];

  const contrastThreshold = 80;
  const canUseDark = minBrightness > contrastThreshold;
  const canUseLight = maxBrightness < (255 - contrastThreshold);

  if (canUseDark && canUseLight) {
    bgColor = rand() < 0.6
      ? lightBgs[floor(rand() * lightBgs.length)]
      : darkBgs[floor(rand() * darkBgs.length)];
  } else if (canUseLight) {
    bgColor = lightBgs[floor(rand() * lightBgs.length)];
  } else if (canUseDark) {
    bgColor = darkBgs[floor(rand() * darkBgs.length)];
  } else {
    bgColor = "#F5F5F5";
  }

  // 根據背景亮度設定描邊顏色
  setupStrokeColor();
}

function setupStrokeColor() {
  const bgBrightness = getBrightness(bgColor);

  // 從調色盤中選擇描邊顏色，根據背景亮度選擇合適的顏色
  const sortedByBrightness = [...palette.colors].sort((a, b) => getBrightness(a) - getBrightness(b));

  if (bgBrightness > 128) {
    // 淺色背景 -> 使用調色盤中較深的顏色
    const darkColors = sortedByBrightness.filter(c => getBrightness(c) < 150);
    if (darkColors.length > 0) {
      strokeColor = darkColors[floor(rand() * darkColors.length)];
    } else {
      // 如果沒有夠深的顏色，使用最深的那個並加深
      strokeColor = sortedByBrightness[0];
    }
  } else {
    // 深色背景 -> 使用調色盤中較淺的顏色
    const lightColors = sortedByBrightness.filter(c => getBrightness(c) > 120);
    if (lightColors.length > 0) {
      strokeColor = lightColors[floor(rand() * lightColors.length)];
    } else {
      // 如果沒有夠淺的顏色，使用最淺的那個
      strokeColor = sortedByBrightness[sortedByBrightness.length - 1];
    }
  }

  // 確保描邊與背景有足夠對比
  const contrast = Math.abs(getBrightness(strokeColor) - bgBrightness);
  if (contrast < 50) {
    // 對比不足時，使用黑色或白色
    strokeColor = bgBrightness > 128 ? "#1A1A1A" : "#E8E8E8";
  }
}

function setupTruchet() {
  gridSize = floor(rand() * 9) + 5; // 5-13
  showDots = rand() < 0.8;
  showStroke = rand() < 0.7; // 70% 機率顯示描邊

  // 線條寬度比例（格子的 12%-22%）- 生成時決定一次
  lineWeightRatio = rand() * 0.10 + 0.12;

  // 根據當前畫布大小計算線條寬度
  updateLineWeight();

  multiColor = rand() < 0.7; // 70% 機率多色模式

  // 彩色線寬比例 - 每次生成時決定一次，所有曲線使用相同寬度 (100% - 190%)
  colorWeightRatio = rand() * 0.90 + 1.00;

  // 獲取與背景對比度足夠的顏色
  const contrastingColors = getContrastingColors();

  // 初始化瓷磚
  tiles = [];
  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      // 每個瓷磚的兩條曲線各自選擇顏色（避免與背景太接近）
      const color1 = pickContrastingColor(contrastingColors);
      let color2 = pickContrastingColor(contrastingColors);

      // 確保兩條曲線顏色不同（如果多色模式）
      if (multiColor && contrastingColors.length > 1) {
        while (color2 === color1) {
          color2 = pickContrastingColor(contrastingColors);
        }
      }

      tiles[row][col] = {
        direction: rand() < 0.5 ? 0 : 1,
        color1: color1,
        color2: multiColor ? color2 : color1,
      };
    }
  }
}

function draw() {
  background(bgColor);

  const margin = width * 0.08;
  const gridWidth = width - margin * 2;
  const cellSize = gridWidth / gridSize;

  push();
  translate(margin, margin);

  // 第一層：繪製所有描邊底層（如果啟用）
  if (showStroke) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const tile = tiles[row][col];
        drawTileBase(x, y, cellSize, tile);
      }
    }
  }

  // 第二層：繪製所有彩色層
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const tile = tiles[row][col];
      drawTileColor(x, y, cellSize, tile);
    }
  }

  // 第三層：繪製所有圓點
  if (showDots) {
    drawAllDots(cellSize);
  }

  pop();
}

// 繪製瓷磚描邊底層
function drawTileBase(x, y, size, tile) {
  noFill();
  stroke(strokeColor);
  strokeWeight(lineWeight);

  if (tile.direction === 0) {
    arc(x, y + size, size, size, -HALF_PI, 0);
    arc(x + size, y, size, size, HALF_PI, PI);
  } else {
    arc(x, y, size, size, 0, HALF_PI);
    arc(x + size, y + size, size, size, PI, PI + HALF_PI);
  }
}

// 繪製瓷磚彩色層
function drawTileColor(x, y, size, tile) {
  noFill();
  const colorWeight = lineWeight * colorWeightRatio;

  if (tile.direction === 0) {
    stroke(tile.color1);
    strokeWeight(colorWeight);
    arc(x, y + size, size, size, -HALF_PI, 0);

    stroke(tile.color2);
    strokeWeight(colorWeight);
    arc(x + size, y, size, size, HALF_PI, PI);
  } else {
    stroke(tile.color1);
    strokeWeight(colorWeight);
    arc(x, y, size, size, 0, HALF_PI);

    stroke(tile.color2);
    strokeWeight(colorWeight);
    arc(x + size, y + size, size, size, PI, PI + HALF_PI);
  }
}

// 繪製所有角落圓點
function drawAllDots(cellSize) {
  const dotSize = lineWeight * 0.9;
  const innerDotColor = getBrightness(bgColor) < 128 ? "#FFFFFF" : bgColor;

  // 收集所有唯一的角落點
  const drawnPoints = new Set();

  for (let row = 0; row <= gridSize; row++) {
    for (let col = 0; col <= gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const key = `${x},${y}`;

      if (!drawnPoints.has(key)) {
        drawnPoints.add(key);

        // 黑色外圈
        fill(strokeColor);
        noStroke();
        ellipse(x, y, dotSize, dotSize);

        // 內圈顏色（可能是彩色或白色）
        if (rand() < 0.3 && multiColor) {
          // 30% 機率使用彩色內圈（避免與背景太接近）
          const contrastingColors = getContrastingColors();
          fill(pickContrastingColor(contrastingColors));
        } else {
          fill(innerDotColor);
        }
        ellipse(x, y, dotSize * 0.45, dotSize * 0.45);
      }
    }
  }
}

// 輔助函數
function getBrightness(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// 計算兩個顏色之間的差異
function getColorDistance(hex1, hex2) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// 檢查顏色是否與背景太接近
function isTooCloseToBackground(color) {
  const distance = getColorDistance(color, bgColor);
  return distance < 60; // 閾值：距離小於60視為太接近
}

// 從調色盤中獲取與背景對比度足夠的顏色
function getContrastingColors() {
  return palette.colors.filter(c => !isTooCloseToBackground(c));
}

// 隨機選擇一個與背景對比度足夠的顏色
function pickContrastingColor(availableColors) {
  if (availableColors.length === 0) {
    return palette.colors[floor(rand() * palette.colors.length)];
  }
  return availableColors[floor(rand() * availableColors.length)];
}

// 根據畫布大小更新線條寬度
function updateLineWeight() {
  const canvasSize = min(windowWidth, windowHeight);
  const margin = canvasSize * 0.08;
  const gridWidth = canvasSize - margin * 2;
  const cellSize = gridWidth / gridSize;
  lineWeight = cellSize * lineWeightRatio;
}

function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  updateLineWeight(); // 重新計算線條寬度
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    palette = palettes[floor(rand() * palettes.length)];
    setupBackground();
    setupTruchet();
    redraw();
  }

  // 按 's' 鍵保存截圖 (PNG)
  if (key === 's' || key === 'S') {
    const filename = `truchet-${fxhash.slice(0, 8)}-${Date.now()}`;
    saveCanvas(filename, 'png');
  }

  // 按 'p' 鍵保存高解析度截圖 (2x)
  if (key === 'p' || key === 'P') {
    saveHighRes(2);
  }

  // 按 'h' 鍵保存超高解析度截圖 (4x)
  if (key === 'h' || key === 'H') {
    saveHighRes(4);
  }
}

// 保存高解析度圖片
function saveHighRes(scaleFactor) {
  const originalSize = width;
  const highResSize = originalSize * scaleFactor;

  // 創建高解析度畫布
  const highResCanvas = createGraphics(highResSize, highResSize);
  highResCanvas.background(bgColor);

  const margin = highResSize * 0.08;
  const gridWidth = highResSize - margin * 2;
  const cellSize = gridWidth / gridSize;
  const scaledLineWeight = lineWeight * scaleFactor;

  highResCanvas.push();
  highResCanvas.translate(margin, margin);

  // 第一層：繪製所有描邊底層（如果啟用）
  if (showStroke) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const tile = tiles[row][col];
        drawTileBaseHR(highResCanvas, x, y, cellSize, tile, scaledLineWeight);
      }
    }
  }

  // 第二層：繪製所有彩色層
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const tile = tiles[row][col];
      drawTileColorHR(highResCanvas, x, y, cellSize, tile, scaledLineWeight);
    }
  }

  // 第三層：繪製所有圓點
  if (showDots) {
    drawAllDotsHR(highResCanvas, cellSize, scaledLineWeight);
  }

  highResCanvas.pop();

  // 保存圖片
  const filename = `truchet-${fxhash.slice(0, 8)}-${highResSize}px-${Date.now()}`;
  save(highResCanvas, filename, 'png');
  highResCanvas.remove();
}

// 高解析度版本的繪圖函數
function drawTileBaseHR(pg, x, y, size, tile, lw) {
  pg.noFill();
  pg.stroke(strokeColor);
  pg.strokeWeight(lw);

  if (tile.direction === 0) {
    pg.arc(x, y + size, size, size, -HALF_PI, 0);
    pg.arc(x + size, y, size, size, HALF_PI, PI);
  } else {
    pg.arc(x, y, size, size, 0, HALF_PI);
    pg.arc(x + size, y + size, size, size, PI, PI + HALF_PI);
  }
}

function drawTileColorHR(pg, x, y, size, tile, lw) {
  pg.noFill();
  const colorWeight = lw * colorWeightRatio;

  if (tile.direction === 0) {
    pg.stroke(tile.color1);
    pg.strokeWeight(colorWeight);
    pg.arc(x, y + size, size, size, -HALF_PI, 0);

    pg.stroke(tile.color2);
    pg.strokeWeight(colorWeight);
    pg.arc(x + size, y, size, size, HALF_PI, PI);
  } else {
    pg.stroke(tile.color1);
    pg.strokeWeight(colorWeight);
    pg.arc(x, y, size, size, 0, HALF_PI);

    pg.stroke(tile.color2);
    pg.strokeWeight(colorWeight);
    pg.arc(x + size, y + size, size, size, PI, PI + HALF_PI);
  }
}

function drawAllDotsHR(pg, cellSize, lw) {
  const dotSize = lw * 0.9;
  const innerDotColor = getBrightness(bgColor) < 128 ? "#FFFFFF" : bgColor;
  const drawnPoints = new Set();
  const contrastingColors = getContrastingColors();

  for (let row = 0; row <= gridSize; row++) {
    for (let col = 0; col <= gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const key = `${col},${row}`;

      if (!drawnPoints.has(key)) {
        drawnPoints.add(key);

        pg.fill(strokeColor);
        pg.noStroke();
        pg.ellipse(x, y, dotSize, dotSize);

        if (rand() < 0.3 && multiColor) {
          pg.fill(pickContrastingColor(contrastingColors));
        } else {
          pg.fill(innerDotColor);
        }
        pg.ellipse(x, y, dotSize * 0.45, dotSize * 0.45);
      }
    }
  }
}

