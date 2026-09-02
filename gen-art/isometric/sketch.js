// ============================================
// Isometric Cubes - Generative Art
// Wave-based stacking animation
// ============================================

const rand = fxrand;

const palettes = [
  { name: "Lavender Night", bg: "#1a1a2e", colors: ["#4a3f8f","#6c5ce7","#a29bfe","#fd79a8","#e84393","#dfe6e9","#b2bec3","#636e72"] },
  { name: "Ocean Depths",   bg: "#0a1628", colors: ["#0984e3","#74b9ff","#00cec9","#81ecec","#2d3436","#dfe6e9","#636e72","#00b894"] },
  { name: "Sunset Blush",   bg: "#2d1b33", colors: ["#e17055","#fab1a0","#fdcb6e","#ffeaa7","#d63031","#ff7675","#dfe6e9","#b2bec3"] },
  { name: "Forest Mint",    bg: "#1a2e1a", colors: ["#00b894","#55efc4","#00cec9","#81ecec","#2d3436","#b8e994","#dfe6e9","#636e72"] },
  { name: "Berry Pop",      bg: "#1e1033", colors: ["#6c5ce7","#a29bfe","#fd79a8","#e84393","#00cec9","#ffeaa7","#dfe6e9","#fab1a0"] },
  { name: "Bauhaus",        bg: "#f5f0e8", colors: ["#d63031","#0984e3","#fdcb6e","#2d3436","#dfe6e9","#636e72","#b2bec3","#00b894"] },
  { name: "Pastel Dream",   bg: "#faf3e8", colors: ["#a29bfe","#fd79a8","#55efc4","#fdcb6e","#fab1a0","#81ecec","#dfe6e9","#74b9ff"] },
  { name: "Monochrome",     bg: "#111111", colors: ["#ffffff","#dddddd","#bbbbbb","#999999","#777777","#555555","#333333","#eeeeee"] },
  { name: "Tokyo Neon",     bg: "#0a0a1a", colors: ["#ff006e","#fb5607","#ffbe0b","#8338ec","#3a86ff","#06d6a0","#ff70a6","#e0aaff"] },
  { name: "Terracotta",     bg: "#2c1810", colors: ["#c44536","#e07a5f","#f2cc8f","#81b29a","#3d405b","#ddbea9","#a5a58d","#6b705c"] },
];

const PATTERN_COUNT = 7;

let palette;
let cubeSize;
let cubeData = [];
let gridCols, gridRows;
let stairDir;

// Animation
let animStartTime = 0;
let animating = false;
const DROP_DURATION = 700;     // ms for one cube to land
const LAYER_DELAY = 300;       // ms between layers at same position
const WAVE_DELAY = 100;        // ms between wave steps

let waitingForView = true;
let viewTimer = null;

function setup() {
  const size = min(windowWidth, windowHeight);
  createCanvas(size, size);

  palette = palettes[floor(rand() * palettes.length)];
  cubeSize = size / (floor(rand() * 3) + 7);
  stairDir = floor(rand() * 4);

  window.$fxhashFeatures = {
    "Palette": palette.name,
    "Direction": ["NE","NW","SE","SW"][stairDir],
  };

  // Generate cubes but don't animate yet — draw first frame as static
  generateCubes();
  animating = false;
  waitingForView = true;
  noLoop();
  redraw(); // draw static first frame (cubes at final position, no animation)

  // Start animation only when canvas is 50% visible, after 1s delay
  observeVisibility();
}

function observeVisibility() {
  const canvasEl = document.querySelector('canvas');
  if (!canvasEl || !window.IntersectionObserver) {
    // Fallback: just start after 1.5s
    setTimeout(function() { startAnimation(); }, 1500);
    return;
  }

  const observer = new IntersectionObserver(function(entries) {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting && waitingForView) {
        waitingForView = false;
        observer.disconnect();
        // Wait 1 second after becoming visible, then animate
        viewTimer = setTimeout(function() { startAnimation(); }, 1000);
      }
    }
  }, { threshold: 0.5 });

  observer.observe(canvasEl);
}

function startAnimation() {
  animStartTime = millis();
  animating = true;
  loop();
}

function regenerate() {
  generateCubes();
  waitingForView = false;
  if (viewTimer) { clearTimeout(viewTimer); viewTimer = null; }
  startAnimation();
}

function generateCubes() {
  cubeData = [];

  const isoW = cubeSize * sqrt(3);
  const isoH = cubeSize;

  gridCols = ceil(width / isoW) + 3;
  gridRows = ceil(height / isoH) + 4;

  // Build grid: compute stair heights first
  const heights = [];
  for (let r = 0; r < gridRows; r++) {
    heights[r] = [];
    for (let c = 0; c < gridCols; c++) {
      heights[r][c] = getStairHeight(c, r);
    }
  }

  // Compute wave index for each grid cell (determines animation order)
  // Wave follows staircase direction: lowest stairs first
  let maxWave = 0;
  const waveMap = [];
  for (let r = 0; r < gridRows; r++) {
    waveMap[r] = [];
    for (let c = 0; c < gridCols; c++) {
      let w;
      switch (stairDir) {
        case 0: w = c + (gridRows - 1 - r); break; // NE
        case 1: w = (gridCols - 1 - c) + (gridRows - 1 - r); break; // NW
        case 2: w = c + r; break; // SE
        case 3: w = (gridCols - 1 - c) + r; break; // SW
      }
      waveMap[r][c] = w;
      if (w > maxWave) maxWave = w;
    }
  }

  // Create cubes with animation timing
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const h = heights[r][c];
      const wave = waveMap[r][c];

      for (let layer = 0; layer < h; layer++) {
        const baseColor = palette.colors[floor(rand() * palette.colors.length)];

        // Start time: wave delay + layer delay
        // Each wave step starts WAVE_DELAY ms later
        // Each layer at same position waits for previous layer to land
        const startMs = wave * WAVE_DELAY + layer * LAYER_DELAY;

        cubeData.push({
          col: c, row: r, height: layer,
          topColor: baseColor,
          leftColor: darkenColor(baseColor, 0.55),
          rightColor: darkenColor(baseColor, 0.35),
          topPattern:   floor(rand() * PATTERN_COUNT),
          leftPattern:  floor(rand() * PATTERN_COUNT),
          rightPattern: floor(rand() * PATTERN_COUNT),
          patternColor1: palette.colors[floor(rand() * palette.colors.length)],
          patternColor2: palette.colors[floor(rand() * palette.colors.length)],
          startMs: startMs,
        });
      }
    }
  }

  // Painter's algorithm sort (for drawing order, not animation order)
  cubeData.sort((a, b) => {
    const da = a.col + a.row;
    const db = b.col + b.row;
    if (da !== db) return da - db;
    if (a.height !== b.height) return a.height - b.height;
    return a.col - b.col;
  });
}

function getStairHeight(c, r) {
  let val;
  switch (stairDir) {
    case 0: val = c + (gridRows - r); break;
    case 1: val = (gridCols - c) + (gridRows - r); break;
    case 2: val = c + r; break;
    case 3: val = (gridCols - c) + r; break;
  }
  const maxVal = gridCols + gridRows;
  const normalized = val / maxVal;
  const base = floor(normalized * 5) + 1;
  const jitter = rand() < 0.3 ? 1 : 0;
  return min(6, max(1, base + jitter));
}

// ===== Easing =====
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ===== Draw =====
function draw() {
  background(palette.bg);

  const isoW = cubeSize * sqrt(3);
  const isoH = cubeSize;
  const elapsed = millis() - animStartTime;
  let allDone = true;

  push();
  translate(width / 2, cubeSize * 1.5);

  for (const cube of cubeData) {
    // Final position
    const fx = (cube.col - cube.row) * isoW / 2;
    const fy = (cube.col + cube.row) * isoH / 2 - cube.height * isoH;

    const cubeElapsed = elapsed - cube.startMs;

    if (cubeElapsed < 0) {
      allDone = false;
      continue; // not started yet
    }

    let t = constrain(cubeElapsed / DROP_DURATION, 0, 1);
    if (t < 1) allDone = false;

    const easedT = easeOutCubic(t);

    // Drop from direction based on stairDir
    const dropDist = cubeSize * 5;
    let currentX = fx;
    let currentY = fy;
    const remain = 1 - easedT;

    switch (stairDir) {
      case 0: // NE: cubes fly in from top-right
        currentX = fx + dropDist * 0.6 * remain;
        currentY = fy - dropDist * remain;
        break;
      case 1: // NW: cubes fly in from top-left
        currentX = fx - dropDist * 0.6 * remain;
        currentY = fy - dropDist * remain;
        break;
      case 2: // SE: cubes fly in from bottom-right
        currentX = fx + dropDist * 0.6 * remain;
        currentY = fy + dropDist * remain;
        break;
      case 3: // SW: cubes fly in from bottom-left
        currentX = fx - dropDist * 0.6 * remain;
        currentY = fy + dropDist * remain;
        break;
    }

    // Fade in during first 30% of animation
    const alpha = t < 0.3 ? t / 0.3 : 1;

    drawIsoCube(currentX, currentY, cubeSize, cube, alpha);
  }

  pop();

  if (allDone && animating) {
    animating = false;
    noLoop();
    setTimeout(() => fxpreview(), 500);
  }
}

// ===== Isometric Cube =====
function drawIsoCube(x, y, s, cube, alpha) {
  const hw = s * sqrt(3) / 2;
  const hh = s / 2;

  const top   = [[x, y - s], [x + hw, y - hh], [x, y], [x - hw, y - hh]];
  const left  = [[x - hw, y - hh], [x, y], [x, y + s], [x - hw, y + hh]];
  const right = [[x, y], [x + hw, y - hh], [x + hw, y + hh], [x, y + s]];

  if (alpha < 1) {
    drawingContext.globalAlpha = alpha;
  }

  drawClippedFace(top, cube.topColor, cube.topPattern, cube.patternColor1, s);
  drawClippedFace(left, cube.leftColor, cube.leftPattern, cube.patternColor2, s);
  drawClippedFace(right, cube.rightColor, cube.rightPattern, cube.patternColor1, s);

  stroke(darkenColor(palette.bg, 0.7));
  strokeWeight(0.8);
  noFill();
  quadFromPts(top);
  quadFromPts(left);
  quadFromPts(right);

  if (alpha < 1) {
    drawingContext.globalAlpha = 1;
  }
}

function quadFromPts(pts) {
  beginShape();
  for (const [px, py] of pts) vertex(px, py);
  endShape(CLOSE);
}

// ===== Clipped Face Drawing =====
function drawClippedFace(pts, baseColor, patternType, pColor, s) {
  const ctx = drawingContext;

  noStroke();
  fill(baseColor);
  quadFromPts(pts);

  if (patternType === 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.clip();

  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  const bw = Math.max(...xs) - bx;
  const bh = Math.max(...ys) - by;

  if (patternType === 1) drawDots(bx, by, bw, bh, s, pColor);
  else if (patternType === 2) drawChecker(bx, by, bw, bh, s, pColor);
  else if (patternType === 3) drawStripes(bx, by, bw, bh, s, pColor);
  else if (patternType === 4) drawDiamonds(bx, by, bw, bh, s, pColor);
  else if (patternType === 5) drawCrossHatch(bx, by, bw, bh, s, pColor);
  else if (patternType === 6) drawCircles(bx, by, bw, bh, s, pColor);

  ctx.restore();
}

// ===== Patterns =====
function drawDots(bx, by, bw, bh, s, c) {
  fill(c); noStroke();
  const gap = s * 0.22, r = s * 0.07;
  for (let dy = by; dy < by + bh + gap; dy += gap)
    for (let dx = bx; dx < bx + bw + gap; dx += gap)
      ellipse(dx, dy, r * 2, r * 2);
}

function drawChecker(bx, by, bw, bh, s, c) {
  fill(c); noStroke();
  const cell = s * 0.15;
  for (let row = 0; row < ceil(bh / cell) + 1; row++)
    for (let col = 0; col < ceil(bw / cell) + 1; col++)
      if ((row + col) % 2 === 0) rect(bx + col * cell, by + row * cell, cell, cell);
}

function drawStripes(bx, by, bw, bh, s, c) {
  stroke(c); strokeWeight(s * 0.04); noFill();
  const gap = s * 0.13;
  for (let d = -bh; d < bw + bh; d += gap)
    line(bx + d, by, bx + d + bh * 0.6, by + bh);
}

function drawDiamonds(bx, by, bw, bh, s, c) {
  fill(c); noStroke();
  const gap = s * 0.22, ds = s * 0.06;
  for (let dy = by; dy < by + bh + gap; dy += gap)
    for (let dx = bx; dx < bx + bw + gap; dx += gap) {
      push(); translate(dx, dy); rotate(PI / 4);
      rect(-ds, -ds, ds * 2, ds * 2); pop();
    }
}

function drawCrossHatch(bx, by, bw, bh, s, c) {
  stroke(c); strokeWeight(s * 0.02); noFill();
  const gap = s * 0.11;
  for (let d = -bh; d < bw + bh; d += gap) {
    line(bx + d, by, bx + d + bh * 0.5, by + bh);
    line(bx + d + bh * 0.5, by, bx + d, by + bh);
  }
}

function drawCircles(bx, by, bw, bh, s, c) {
  noFill(); stroke(c); strokeWeight(s * 0.025);
  const gap = s * 0.25;
  for (let dy = by; dy < by + bh + gap; dy += gap)
    for (let dx = bx; dx < bx + bw + gap; dx += gap)
      ellipse(dx, dy, gap * 0.65, gap * 0.65);
}

// ===== Color =====
function darkenColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return "#" + [r, g, b].map(ch =>
    max(0, min(255, floor(ch * amount))).toString(16).padStart(2, "0")
  ).join("");
}

// ===== Interaction =====
function windowResized() {
  const size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  if (!animating) redraw();
}

function keyPressed() {
  if (key === ' ') {
    palette = palettes[floor(rand() * palettes.length)];
    cubeSize = width / (floor(rand() * 3) + 7);
    stairDir = floor(rand() * 4);
    regenerate();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`isometric-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}
