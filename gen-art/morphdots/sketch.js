// ============================================
// Morph Dots — 多形態 Superellipse 變形動畫
// Grid of shapes morphing between circles,
// stars, diamonds, flowers, crosses, squircles
// with pulsing size and color/bg transitions.
// ============================================

const rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────

const PALETTES = [
  { name: "Vivid",     colors: ["#FF006E","#FFBE0B","#3A86FF","#8338EC","#FB5607","#00B4D8","#E63946"] },
  { name: "Rainbow",   colors: ["#FF595E","#FF924C","#FFCA3A","#8AC926","#1982C4","#6A4C93","#FF69B4"] },
  { name: "Neon",      colors: ["#F72585","#7209B7","#3A0CA3","#4361EE","#4CC9F0","#01FFC3","#FF6B6B"] },
  { name: "Candy",     colors: ["#FF69B4","#FF85A2","#FFA07A","#FFD700","#6BCB77","#4D96FF","#9B59B6"] },
  { name: "Matisse",   colors: ["#E63946","#F4A261","#2A9D8F","#264653","#E9C46A","#457B9D"] },
  { name: "Pop",       colors: ["#FB5607","#FF006E","#8338EC","#3A86FF","#FFBE0B","#06D6A0"] },
  { name: "Retro",     colors: ["#F94144","#F3722C","#F8961E","#F9C74F","#90BE6D","#43AA8B","#577590"] },
  { name: "Tropical",  colors: ["#FF6B6B","#FFA07A","#FFD93D","#6BCB77","#4D96FF","#FF8FB1"] },
  { name: "Cyberpunk", colors: ["#FF2A6D","#05D9E8","#7B61FF","#FF6B6B","#01FFC3","#D1F7FF"] },
  { name: "Sakura",    colors: ["#FFB7C5","#FF69B4","#DB7093","#FF1493","#C71585","#E8A0BF","#FFFFFF"] },
  { name: "Ocean",     colors: ["#0077B6","#00B4D8","#90E0EF","#48CAE4","#023E8A","#CAF0F8"] },
  { name: "Sunset",    colors: ["#FF6B35","#FF8C42","#F9C74F","#E8405F","#F77F00","#FFFFFF"] },
  { name: "Bauhaus",   colors: ["#BE1E2D","#21409A","#FFDE17","#00A878","#E85D04","#1A1A1A"] },
  { name: "Jewel",     colors: ["#50C878","#0F52BA","#E0115F","#9966CC","#FFD700","#FF6700"] },
  { name: "Dracula",   colors: ["#FF79C6","#8BE9FD","#50FA7B","#FFB86C","#BD93F9","#F1FA8C"] },
  { name: "Evangelion",colors: ["#4F2A92","#B8E84C","#F58D39","#E52C2C","#F4B943","#FFFFFF"] },
];

// ── Shape definitions (polar radius functions) ──────────────────────────────
// Each shape returns r(theta) normalized to ~1 at maximum.

const SHAPES = [
  {
    name: "circle",
    polar: (t) => 1,
  },
  {
    name: "star4",
    polar: (t) => {
      const n = 0.5;
      const ct = Math.abs(cos(t)), st = Math.abs(sin(t));
      return 1 / pow(pow(ct, n) + pow(st, n), 1/n);
    },
  },
  {
    name: "diamond",
    polar: (t) => {
      const ct = Math.abs(cos(t)), st = Math.abs(sin(t));
      return 1 / (ct + st + 0.001);
    },
  },
  {
    name: "squircle",
    polar: (t) => {
      const n = 5;
      const ct = Math.abs(cos(t)), st = Math.abs(sin(t));
      return 1 / pow(pow(ct, n) + pow(st, n), 1/n);
    },
  },
  {
    name: "flower5",
    polar: (t) => 0.55 + 0.45 * Math.abs(cos(2.5 * t)),
  },
  {
    name: "flower4",
    polar: (t) => 0.50 + 0.50 * Math.abs(cos(2 * t)),
  },
  {
    name: "cross",
    polar: (t) => {
      // A plus/cross shape via min of two rectangles in polar
      const ct = Math.abs(cos(t)), st = Math.abs(sin(t));
      const armWidth = 0.35;
      // Two perpendicular bars
      const bar1 = (ct < armWidth) ? 1 / (st + 0.01) : armWidth / (ct + 0.01);
      const bar2 = (st < armWidth) ? 1 / (ct + 0.01) : armWidth / (st + 0.01);
      return min(max(bar1, bar2), 1.2) / 1.2;
    },
  },
  {
    name: "hex",
    polar: (t) => {
      // Regular hexagon
      const n = 6;
      const sector = TWO_PI / n;
      const a = ((t % sector) + sector) % sector;
      return cos(PI / n) / cos(a - sector / 2);
    },
  },
  {
    name: "star6",
    polar: (t) => 0.50 + 0.50 * Math.abs(cos(3 * t)),
  },
  {
    name: "gear",
    polar: (t) => 0.75 + 0.25 * (cos(8 * t) > 0 ? 1 : -1) * 0.6,
  },
];

// ── State ───────────────────────────────────────────────────────────────────

let pal;
let gridN;
let dotColors = [];
let animSpeed;
let shapeSequence = []; // indices into SHAPES
let numPhases;

// Pre-computed polar tables for each shape (for fast lerp)
const ANGLE_STEPS = 128;
let shapeTables = [];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  const sz = min(windowWidth, windowHeight);
  const cnv = createCanvas(sz, sz);
  cnv.style("display", "block");
  cnv.style("position", "absolute");
  cnv.style("top", (windowHeight - sz) / 2 + "px");
  cnv.style("left", (windowWidth - sz) / 2 + "px");

  // Pre-compute polar radius tables
  for (const shape of SHAPES) {
    const table = [];
    let maxR = 0;
    for (let i = 0; i < ANGLE_STEPS; i++) {
      const a = TWO_PI * i / ANGLE_STEPS;
      const r = shape.polar(a);
      table.push(r);
      if (r > maxR) maxR = r;
    }
    // Normalize so max = 1
    for (let i = 0; i < ANGLE_STEPS; i++) table[i] /= maxR;
    shapeTables.push(table);
  }

  initState();

  window.$fxhashFeatures = {
    "Palette": pal.name,
    "Grid": gridN + "x" + gridN,
    "Shapes": shapeSequence.length,
    "Speed": animSpeed < 0.5 ? "Slow" : animSpeed < 0.75 ? "Normal" : "Fast",
  };

  setTimeout(() => fxpreview(), 4000);
}

function initState() {
  pal = PALETTES[floor(rand() * PALETTES.length)];
  gridN = floor(rand() * 3) + 7; // 7–9
  animSpeed = rand() * 0.4 + 0.4; // 0.4–0.8

  // Pick 4–7 random shapes for the cycle (no consecutive duplicates)
  const count = floor(rand() * 4) + 4;
  shapeSequence = [];
  let lastIdx = -1;
  for (let i = 0; i < count; i++) {
    let idx;
    do { idx = floor(rand() * SHAPES.length); } while (idx === lastIdx);
    shapeSequence.push(idx);
    lastIdx = idx;
  }
  numPhases = shapeSequence.length;

  // Assign colors per dot
  dotColors = [];
  for (let r = 0; r < gridN; r++) {
    dotColors[r] = [];
    for (let c = 0; c < gridN; c++) {
      dotColors[r][c] = pal.colors[floor(rand() * pal.colors.length)];
    }
  }
}

// ── Polar shape interpolation ───────────────────────────────────────────────

function lerpShape(tableA, tableB, t) {
  // Returns interpolated polar radius table
  const result = [];
  for (let i = 0; i < ANGLE_STEPS; i++) {
    result.push(lerp(tableA[i], tableB[i], t));
  }
  return result;
}

function drawShape(cx, cy, radiusTable, size) {
  beginShape();
  for (let i = 0; i < ANGLE_STEPS; i++) {
    const a = TWO_PI * i / ANGLE_STEPS;
    const r = radiusTable[i] * size;
    vertex(cx + r * cos(a), cy + r * sin(a));
  }
  endShape(CLOSE);
}

// ── Animation ───────────────────────────────────────────────────────────────
//
// Each "phase" transitions between two consecutive shapes:
//   First half:  current shape (small, colorful) → grow to large black
//   Second half: large black → shrink + morph to next shape (small, colorful)
//
// Phase duration = 120 frames (at animSpeed=1)

function draw() {
  const framesPerPhase = 120;
  const totalCycle = framesPerPhase * numPhases;
  const t = (frameCount * animSpeed) % totalCycle;
  const phaseIdx = floor(t / framesPerPhase) % numPhases;
  const p = (t % framesPerPhase) / framesPerPhase; // 0–1

  const curShapeIdx = shapeSequence[phaseIdx];
  const nextShapeIdx = shapeSequence[(phaseIdx + 1) % numPhases];
  const curTable = shapeTables[curShapeIdx];
  const nextTable = shapeTables[nextShapeIdx];

  // Easing
  const ep = p * p * (3 - 2 * p); // smoothstep

  let bgVal, sizeRatio, useColor, morphTable;

  // ── Continuous cosine oscillation (no discontinuities) ──
  //
  // p=0.0 → small, colorful, current shape, DARK bg
  // p=0.5 → large, black, circle,           WHITE bg
  // p=1.0 → small, colorful, next shape,    DARK bg  (= p=0.0 of next phase)
  //
  // All parameters use cosine so they are perfectly smooth at boundaries.

  const wave = 0.5 - 0.5 * cos(p * TWO_PI); // 0→1→0 smooth (peaks at p=0.5)

  // Size: small at p=0,1 → large at p=0.5
  sizeRatio = lerp(0.22, 0.95, wave);

  // Background: dark at p=0,1 → white at p=0.5
  bgVal = lerp(15, 255, wave);

  // Color: colorful at p=0,1 → black at p=0.5
  useColor = 1 - wave;

  // Shape morph: current shape → circle → next shape
  if (p < 0.5) {
    const mt = p * 2; // 0→1
    morphTable = lerpShape(curTable, shapeTables[0], mt);
  } else {
    const mt = (p - 0.5) * 2; // 0→1
    morphTable = lerpShape(shapeTables[0], nextTable, mt);
  }

  background(bgVal);
  noStroke();

  const margin = width * 0.06;
  const gridW = width - margin * 2;
  const cellSz = gridW / gridN;

  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      const cx = margin + cellSz * (c + 0.5);
      const cy = margin + cellSz * (r + 0.5);
      const sz = cellSz * sizeRatio * 0.5;

      const dotCol = dotColors[r][c];
      const rgb = hexToRGB(dotCol);
      const fr = lerp(0, rgb[0], useColor);
      const fg = lerp(0, rgb[1], useColor);
      const fb = lerp(0, rgb[2], useColor);

      fill(fr, fg, fb);
      drawShape(cx, cy, morphTable, sz);
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexToRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  const sz = min(windowWidth, windowHeight);
  resizeCanvas(sz, sz);
  const cnv = document.querySelector("canvas");
  if (cnv) {
    cnv.style.top = (windowHeight - sz) / 2 + "px";
    cnv.style.left = (windowWidth - sz) / 2 + "px";
  }
}

function keyPressed() {
  if (key === ' ') {
    initState();
    frameCount = 0;
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`morphdots-${fxhash.slice(0,8)}-${Date.now()}`, 'png');
  }
}
