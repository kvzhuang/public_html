// ============================================
// fxhash Generative Art - Heart Curves 愛心曲線
// ============================================

const rand = fxrand;

// 參數變數
let palette;
let bgColor;
let strokeColor;
let showStroke;
let gridSize;
let tiles = [];
let showDots;
let lineWeight;
let lineWeightRatio;
let multiColor;
let numLayers; // 愛心的同心層數

// 調色盤 - 浪漫與愛的主題
const palettes = [
  // 浪漫色系
  { name: "Rose", colors: ["#FF6B9D", "#C44569", "#FFC0CB", "#FF1493", "#DB7093"] },
  { name: "Sakura", colors: ["#FFB7C5", "#FF69B4", "#FFC0CB", "#DB7093", "#C71585", "#FF1493"] },
  { name: "Valentine", colors: ["#FF006E", "#FB5607", "#FF85A1", "#FFAEBC", "#FF477E"] },
  { name: "Candy", colors: ["#FF69B4", "#FF85A2", "#FFA07A", "#FFB6C1", "#FF6B6B", "#E75480"] },
  { name: "Cotton", colors: ["#fce4ec", "#f8bbd9", "#f48fb1", "#f06292", "#ec407a", "#e91e63"] },
  { name: "Berry", colors: ["#FF477E", "#FF7096", "#FF85A1", "#FFAEBC", "#A0E7E5"] },
  
  // 經典藝術風格
  { name: "Matisse", colors: ["#E63946", "#F4A261", "#2A9D8F", "#264653", "#E9C46A", "#A8DADC"] },
  { name: "Bauhaus", colors: ["#BE1E2D", "#FFDE17", "#21409A", "#E85D04", "#00A878"] },
  { name: "Mondrian", colors: ["#D40920", "#1356A2", "#F7D842", "#E85D04", "#2E933C"] },
  { name: "Rainbow", colors: ["#FF595E", "#FF924C", "#FFCA3A", "#8AC926", "#1982C4", "#6A4C93"] },
  
  // 現代科技風格
  { name: "Neon", colors: ["#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4CC9F0", "#560BAD"] },
  { name: "Cyberpunk", colors: ["#FF2A6D", "#05D9E8", "#D1F7FF", "#7B61FF", "#01012B", "#FF6B6B"] },
  { name: "Electric", colors: ["#7400B8", "#6930C3", "#5E60CE", "#5390D9", "#4EA8DE", "#48BFE3"] },
  { name: "Galaxy", colors: ["#667EEA", "#764BA2", "#F093FB", "#F5576C", "#4FACFE", "#00F2FE"] },
  
  // 自然風格
  { name: "Sunset", colors: ["#FF6B35", "#FF8C42", "#004E89", "#1A659E", "#FF9F1C", "#E71D36"] },
  { name: "Ocean", colors: ["#03045E", "#0077B6", "#00B4D8", "#0096C7", "#023E8A", "#48CAE4"] },
  { name: "Forest", colors: ["#1B4332", "#2D6A4F", "#40916C", "#52B788", "#74C69D", "#386641"] },
  { name: "Autumn", colors: ["#D4A373", "#CCD5AE", "#BC6C25", "#DDA15E", "#606C38", "#283618"] },
  
  // 日本傳統色
  { name: "Benihi", colors: ["#e83929", "#e60033", "#e2041b", "#d7003a", "#c9171e", "#b94047"] },
  { name: "Nippon", colors: ["#8E050F", "#D63336", "#F59A36", "#233953", "#AE8057", "#CCA481"] },
  { name: "Wabi", colors: ["#5B7065", "#8F9E8B", "#C8D1C0", "#D4C5A9", "#8B7355", "#6B5344"] },
  
  // 復古風格
  { name: "Vintage", colors: ["#E07A5F", "#3D405B", "#81B29A", "#F2CC8F", "#5F797B", "#9A8C98"] },
  { name: "ArtDeco", colors: ["#3f647e", "#688fad", "#00b0b2", "#d4af37", "#1c1c1c", "#c9a227"] },
  { name: "MidCentury", colors: ["#E8D5B7", "#F2A65A", "#5B8C5A", "#E94F37", "#1E3D59", "#FF6B35"] },
  
  // 流行配色
  { name: "Pop", colors: ["#FFBE0B", "#FB5607", "#FF006E", "#8338EC", "#3A86FF", "#06D6A0"] },
  { name: "Vivid", colors: ["#FB5607", "#FF006E", "#8338EC", "#3A86FF", "#FFBE0B", "#06D6A0"] },
  { name: "Tropical", colors: ["#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77", "#4D96FF", "#FF8FB1"] },
  
  // 寶石色系
  { name: "Royal", colors: ["#4B0082", "#800080", "#9400D3", "#8B008B", "#9932CC", "#BA55D3"] },
  { name: "Jewel", colors: ["#50C878", "#0F52BA", "#E0115F", "#9966CC", "#FFD700", "#FF6700"] },
  { name: "Amethyst", colors: ["#9B59B6", "#8E44AD", "#6C3483", "#5B2C6F", "#4A235A", "#D7BDE2"] },
  
  // 柔和色系
  { name: "Pastel", colors: ["#fe9c8f", "#feb2a8", "#fec8c1", "#fad9c1", "#f9caa7", "#a8e6cf"] },
  { name: "Dreamy", colors: ["#ffd3b6", "#dcedc1", "#a8e6cf", "#ff8b94", "#ffaaa5", "#c7ceea"] },
  
  // 對比色系
  { name: "Contrast", colors: ["#FF6B6B", "#4ECDC4", "#2C3E50", "#F39C12", "#9B59B6", "#1ABC9C"] },
  { name: "Bold", colors: ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C"] },
  
  // 動漫配色
  { name: "Evangelion", colors: ["#4F2A92", "#60289B", "#B8E84C", "#F58D39", "#E52C2C", "#F4B943"] },
  { name: "SailorMoon", colors: ["#FFF666", "#FF2E51", "#5158FF", "#D260FF", "#FFB3DF", "#00BFFF"] },
  { name: "Pokemon", colors: ["#FFCB05", "#3D7DCA", "#FAD61D", "#E19720", "#F62D14", "#003A70"] },
];

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);

  // 選擇調色盤
  palette = palettes[floor(rand() * palettes.length)];

  // 設定背景
  setupBackground();

  // 設定愛心曲線參數
  setupHeartCurves();

  // 設定 fxhash features
  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Grid": gridSize + "x" + gridSize,
    "Layers": numLayers,
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

  const darkBgs = ["#1A1A2E", "#1C1C1C", "#121212", "#0a0a0a", "#2C3E50", "#1E3D59", "#0D1B2A"];
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

  setupStrokeColor();
}

function setupStrokeColor() {
  const bgBrightness = getBrightness(bgColor);
  const sortedByBrightness = [...palette.colors].sort((a, b) => getBrightness(a) - getBrightness(b));

  if (bgBrightness > 128) {
    const darkColors = sortedByBrightness.filter(c => getBrightness(c) < 150);
    if (darkColors.length > 0) {
      strokeColor = darkColors[floor(rand() * darkColors.length)];
    } else {
      strokeColor = sortedByBrightness[0];
    }
  } else {
    const lightColors = sortedByBrightness.filter(c => getBrightness(c) > 120);
    if (lightColors.length > 0) {
      strokeColor = lightColors[floor(rand() * lightColors.length)];
    } else {
      strokeColor = sortedByBrightness[sortedByBrightness.length - 1];
    }
  }

  const contrast = Math.abs(getBrightness(strokeColor) - bgBrightness);
  if (contrast < 50) {
    strokeColor = bgBrightness > 128 ? "#1A1A1A" : "#E8E8E8";
  }
}

function setupHeartCurves() {
  gridSize = floor(rand() * 5) + 5; // 5-9
  showDots = rand() < 0.85;
  showStroke = rand() < 0.3; // 降低描邊機率，讓顏色更鮮豔
  
  lineWeightRatio = rand() * 0.04 + 0.015; // 1.5%-5.5% (細線條)
  updateLineWeight();
  
  multiColor = rand() < 0.85; // 高機率多色
  numLayers = floor(rand() * 3) + 3; // 3-5 層同心愛心

  const contrastingColors = getContrastingColors();

  tiles = [];
  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      // 為每個瓷磚選擇多種顏色（用於同心層）
      const colors = [];
      for (let i = 0; i < numLayers; i++) {
        colors.push(pickContrastingColor(contrastingColors));
      }

      tiles[row][col] = {
        direction: rand() < 0.5 ? 0 : 1, // 0: 左上右下, 1: 右上左下
        colors: colors, // 多層顏色
      };
    }
  }
}

function updateLineWeight() {
  const size = min(windowWidth, windowHeight);
  const margin = size * 0.08;
  const gridWidth = size - margin * 2;
  const cellSize = gridWidth / gridSize;
  lineWeight = cellSize * lineWeightRatio;
}

function draw() {
  background(bgColor);

  const margin = width * 0.08;
  const gridWidth = width - margin * 2;
  const cellSize = gridWidth / gridSize;

  push();
  translate(margin, margin);

  // 第一層：繪製描邊
  if (showStroke) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const tile = tiles[row][col];
        drawHeartBase(x, y, cellSize, tile);
      }
    }
  }

  // 第二層：繪製彩色層
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const tile = tiles[row][col];
      drawHeartColor(x, y, cellSize, tile);
    }
  }

  // 第三層：繪製圓點
  if (showDots) {
    drawAllDots(cellSize);
  }

  pop();
}

// 繪製愛心描邊底層
function drawHeartBase(x, y, size, tile) {
  if (!showStroke) return;
  
  noFill();
  stroke(strokeColor);
  strokeWeight(lineWeight * 0.8);

  // 繪製最外層的愛心輪廓
  if (tile.direction === 0) {
    drawHeartCurve(x, y, size, 0, size * 0.5);
    drawHeartCurve(x, y, size, 1, size * 0.5);
  } else {
    drawHeartCurve(x, y, size, 2, size * 0.5);
    drawHeartCurve(x, y, size, 3, size * 0.5);
  }
}

// 繪製愛心彩色層（多層同心）
function drawHeartColor(x, y, size, tile) {
  noFill();
  
  // 從外到內繪製多層同心愛心
  for (let layer = 0; layer < numLayers; layer++) {
    const layerSize = size * (0.5 - layer * 0.08); // 每層縮小
    const colorIndex = layer % tile.colors.length;
    
    stroke(tile.colors[colorIndex]);
    strokeWeight(lineWeight);

    if (tile.direction === 0) {
      drawHeartCurve(x, y, size, 0, layerSize);
      drawHeartCurve(x, y, size, 1, layerSize);
    } else {
      drawHeartCurve(x, y, size, 2, layerSize);
      drawHeartCurve(x, y, size, 3, layerSize);
    }
  }
}

// 繪製愛心曲線 - 使用貝茲曲線創造愛心形狀
function drawHeartCurve(x, y, size, type, heartSize) {
  const h = heartSize; // 愛心高度
  const w = heartSize * 0.9; // 愛心寬度

  if (type === 0) {
    // 左上角到右邊中點（愛心左半上部）
    bezier(
      x, y + size / 2,                    // 起點：左邊中點
      x + size * 0.25, y + size / 2 - h, // 控制點1：向上凸
      x + size * 0.75, y + size / 2 - h, // 控制點2：向上凸
      x + size, y + size / 2              // 終點：右邊中點
    );
  } else if (type === 1) {
    // 左下角到右邊中點（愛心左半下部）
    bezier(
      x, y + size / 2,                    // 起點：左邊中點
      x + size * 0.3, y + size / 2 + h,  // 控制點1：向下凸
      x + size * 0.7, y + size / 2 + h,  // 控制點2：向下凸
      x + size, y + size / 2              // 終點：右邊中點
    );
  } else if (type === 2) {
    // 上邊中點到下邊中點（愛心右半上部）
    bezier(
      x + size / 2, y,                    // 起點：上邊中點
      x + size / 2 + w, y + size * 0.2,  // 控制點1：向右凸
      x + size / 2 + w, y + size * 0.8,  // 控制點2：向右凸
      x + size / 2, y + size              // 終點：下邊中點
    );
  } else {
    // 上邊中點到下邊中點（愛心左半上部）
    bezier(
      x + size / 2, y,                    // 起點：上邊中點
      x + size / 2 - w, y + size * 0.2,  // 控制點1：向左凸
      x + size / 2 - w, y + size * 0.8,  // 控制點2：向左凸
      x + size / 2, y + size              // 終點：下邊中點
    );
  }
}

// 繪製所有圓點
function drawAllDots(cellSize) {
  const dotSize = lineWeight * 3.5;
  
  // 在連接點繪製圓點
  for (let row = 0; row <= gridSize; row++) {
    for (let col = 0; col <= gridSize; col++) {
      // 只在邊緣的中點繪製
      let shouldDraw = false;
      let x, y;
      
      // 水平邊緣中點
      if (col < gridSize && (row === 0 || row === gridSize || row === gridSize / 2)) {
        x = col * cellSize + cellSize / 2;
        y = row * cellSize;
        shouldDraw = true;
      }
      // 垂直邊緣中點
      else if (row < gridSize && (col === 0 || col === gridSize || col === gridSize / 2)) {
        x = col * cellSize;
        y = row * cellSize + cellSize / 2;
        shouldDraw = true;
      }
      
      if (shouldDraw) {
        // 外圈
        fill(strokeColor);
        noStroke();
        circle(x, y, dotSize);
        
        // 內圈 - 隨機選擇調色盤中的顏色
        if (multiColor && rand() < 0.7) {
          const contrastingColors = getContrastingColors();
          fill(pickContrastingColor(contrastingColors));
        } else {
          const innerColor = getBrightness(bgColor) < 128 ? "#FFFFFF" : bgColor;
          fill(innerColor);
        }
        circle(x, y, dotSize * 0.45);
      }
    }
  }
}

// 取得顏色亮度
function getBrightness(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// 取得與背景對比的顏色
function getContrastingColors() {
  const bgBrightness = getBrightness(bgColor);
  const minContrast = 60;
  
  return palette.colors.filter(c => {
    const brightness = getBrightness(c);
    return Math.abs(brightness - bgBrightness) > minContrast;
  });
}

// 選擇對比色
function pickContrastingColor(colors) {
  if (colors.length === 0) return palette.colors[0];
  return colors[floor(rand() * colors.length)];
}

function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  updateLineWeight();
  redraw();
}
