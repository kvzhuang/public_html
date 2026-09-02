// ============================================
// Heartchet — 愛心 Truchet
// Teardrop-shaped filled arcs that form hearts
// and S-curves when adjacent tiles connect.
//
// Key: each arc is FAT in the middle, THIN at
// the edge midpoints — creating comma/teardrop
// shapes. Two facing teardrops = heart.
// ============================================

const rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────

const PALETTES = [
  { name: "Sailor Moon",  bg: "#1A1F4E", colors: ["#6FA8DC","#F4B8D4","#B4A7D6","#FFFFFF","#2B3A8C","#89B4E8","#E8A0BF"] },
  { name: "Twilight",     bg: "#1A1A2E", colors: ["#7CB9E8","#F2A2C0","#C3A6D8","#E8E8F0","#3B4FA0","#A0D2F0"] },
  { name: "Sunset",       bg: "#2D1B33", colors: ["#FF6B35","#FF8C42","#F9C74F","#E8405F","#FFFFFF","#F77F00"] },
  { name: "Campfire",     bg: "#1C1410", colors: ["#E63946","#F4A261","#E9C46A","#FFFFFF","#D62828","#2A9D8F"] },
  { name: "Ocean",        bg: "#0A1628", colors: ["#0077B6","#00B4D8","#90E0EF","#CAF0F8","#023E8A","#48CAE4"] },
  { name: "Arctic",       bg: "#0D1B2A", colors: ["#A5F3FC","#67E8F9","#22D3EE","#FFFFFF","#0891B2","#06B6D4"] },
  { name: "Pop Art",      bg: "#1A1A2E", colors: ["#FF006E","#FFBE0B","#3A86FF","#8338EC","#FFFFFF","#FB5607"] },
  { name: "Bauhaus",      bg: "#F5F5F0", colors: ["#BE1E2D","#21409A","#FFDE17","#1A1A1A","#E85D04","#00A878"] },
  { name: "Mondrian",     bg: "#FFFEF5", colors: ["#D40920","#1356A2","#F7D842","#1A1A1A","#FFFFFF","#2E933C"] },
  { name: "Pastel",       bg: "#2C2137", colors: ["#FEC8C1","#A8E6CF","#FFD3B6","#DCEDC1","#FF8B94","#C7CEEA"] },
  { name: "Dreamy",       bg: "#1E1533", colors: ["#F8B4D9","#B8C0FF","#BBD0FF","#FFD6FF","#E7C6FF","#FFFFFF"] },
  { name: "Forest",       bg: "#0A1F0A", colors: ["#2D6A4F","#52B788","#95D5B2","#D8F3DC","#1B4332","#74C69D"] },
  { name: "Cherry",       bg: "#1A0A10", colors: ["#FFB7C5","#FF1493","#DB7093","#FFFFFF","#C71585","#FF69B4"] },
  { name: "Sakura",       bg: "#28162E", colors: ["#FFB7C5","#FF69B4","#FFC0CB","#DB7093","#FFFFFF","#E8A0BF"] },
  { name: "Cyberpunk",    bg: "#0A0A1A", colors: ["#FF2A6D","#05D9E8","#D1F7FF","#7B61FF","#FF6B6B","#01FFC3"] },
  { name: "Neon",         bg: "#0D0221", colors: ["#F72585","#7209B7","#4361EE","#4CC9F0","#3A0CA3","#FFFFFF"] },
  { name: "Noir Gold",    bg: "#0D0D0D", colors: ["#FFD700","#F4C430","#DAA520","#FFFFFF","#B8860B","#E6BE8A"] },
  { name: "Blue White",   bg: "#1A2744", colors: ["#FFFFFF","#E8E8F0","#A8C4E0","#5B8DB8","#3A6D90","#D0E4F0"] },
  { name: "Coral Reef",   bg: "#0F2027", colors: ["#FF6B6B","#FFA07A","#FFD93D","#6BCB77","#4D96FF","#FFFFFF"] },
];

// ── State ───────────────────────────────────────────────────────────────────

let pal;
let gridSize;
let tiles = [];
let showGrain;
let multiColor;

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  const sz = min(windowWidth, windowHeight);
  createCanvas(sz, sz);

  pal = PALETTES[floor(rand() * PALETTES.length)];
  gridSize = floor(rand() * 5) + 5;
  showGrain = rand() < 0.7;
  multiColor = rand() < 0.8;

  generateTiles();

  window.$fxhashFeatures = {
    "Palette": pal.name,
    "Grid": gridSize + "x" + gridSize,
    "MultiColor": multiColor ? "Yes" : "No",
    "Grain": showGrain ? "Yes" : "No",
  };

  noLoop();
  setTimeout(() => fxpreview(), 2000);
}

function generateTiles() {
  const usable = getUsableColors();
  tiles = [];
  for (let r = 0; r < gridSize; r++) {
    tiles[r] = [];
    for (let c = 0; c < gridSize; c++) {
      let c1 = pick(usable), c2 = multiColor ? pick(usable) : c1;
      if (multiColor && usable.length > 1) {
        let t = 0; while (c2 === c1 && t < 10) { c2 = pick(usable); t++; }
      }
      tiles[r][c] = { dir: rand() < 0.5 ? 0 : 1, color1: c1, color2: c2 };
    }
  }
}

function pick(a) { return a[floor(rand() * a.length)]; }
function hexRGB(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function colorDist(a, b) {
  const [r1,g1,b1]=hexRGB(a), [r2,g2,b2]=hexRGB(b);
  return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
}
function getUsableColors() { return pal.colors.filter(c => colorDist(c, pal.bg) > 50); }

// ── Teardrop arc drawing ────────────────────────────────────────────────────
//
// Standard Truchet: arcs centered at tile corners connecting edge midpoints.
// Here we draw each arc as a TEARDROP — fat in the middle, thin at the ends.
//
// For an arc centered at corner (cornerX, cornerY), sweeping from startAngle
// to endAngle with base radius r = s/2:
//
//   At each angle θ along the arc:
//     - progress = how far along the arc (0 at start, 1 at end)
//     - thickness varies: thin at ends (progress=0,1), fat at middle (progress=0.5)
//     - thickness curve: sin(progress * PI) — smooth bulge
//
//   Outer boundary: radius + thickness/2
//   Inner boundary: radius - thickness/2
//   This creates the teardrop/comma shape.

function drawTeardrop(cornerX, cornerY, radius, startA, endA, col, cellSz) {
  const steps = 48;
  const maxThick = cellSz * 0.62;  // fat enough for heart lobes, not overflowing
  const minThick = cellSz * 0.01;  // very thin at endpoints — sharp heart tips

  const outerPts = [];
  const innerPts = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = lerp(startA, endA, t);

    // Bulge: pow(sin, 0.6) stays fat longer, creating rounder heart lobes
    const bulge = pow(sin(t * PI), 0.75);
    const thickness = lerp(minThick, maxThick, bulge);

    const outerR = radius + thickness / 2;
    const innerR = max(radius - thickness / 2, cellSz * 0.01);

    outerPts.push([cornerX + outerR * cos(angle), cornerY + outerR * sin(angle)]);
    innerPts.push([cornerX + innerR * cos(angle), cornerY + innerR * sin(angle)]);
  }

  fill(col);
  noStroke();
  beginShape();
  for (const [x, y] of outerPts) vertex(x, y);
  for (let i = innerPts.length - 1; i >= 0; i--) vertex(innerPts[i][0], innerPts[i][1]);
  endShape(CLOSE);
}

function drawHeartTile(x, y, s, tile) {
  const r = s / 2;

  if (tile.dir === 0) {
    // Arc 1: corner = bottom-left (x, y+s), sweep from -PI/2 to 0
    drawTeardrop(x, y + s, r, -HALF_PI, 0, tile.color1, s);
    // Arc 2: corner = top-right (x+s, y), sweep from PI/2 to PI
    drawTeardrop(x + s, y, r, HALF_PI, PI, tile.color2, s);
  } else {
    // Arc 1: corner = top-left (x, y), sweep from 0 to PI/2
    drawTeardrop(x, y, r, 0, HALF_PI, tile.color1, s);
    // Arc 2: corner = bottom-right (x+s, y+s), sweep from PI to 3PI/2
    drawTeardrop(x + s, y + s, r, PI, PI + HALF_PI, tile.color2, s);
  }
}

// ── Main draw ───────────────────────────────────────────────────────────────

function draw() {
  background(pal.bg);

  const margin = width * 0.08;
  const gridW = width - margin * 2;
  const cellSz = gridW / gridSize;

  push();
  translate(margin, margin);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      drawHeartTile(c * cellSz, r * cellSz, cellSz, tiles[r][c]);
    }
  }

  pop();

  if (showGrain) drawGrain();
}

function drawGrain() {
  loadPixels();
  const d = pixelDensity();
  const total = 4 * (width * d) * (height * d);
  for (let i = 0; i < total; i += 4) {
    const n = (rand() - 0.5) * 30;
    pixels[i]   = constrain(pixels[i] + n, 0, 255);
    pixels[i+1] = constrain(pixels[i+1] + n, 0, 255);
    pixels[i+2] = constrain(pixels[i+2] + n, 0, 255);
  }
  updatePixels();
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  const sz = min(windowWidth, windowHeight);
  resizeCanvas(sz, sz);
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    pal = PALETTES[floor(rand() * PALETTES.length)];
    gridSize = floor(rand() * 5) + 5;
    multiColor = rand() < 0.8;
    showGrain = rand() < 0.7;
    generateTiles();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`heartchet-${fxhash.slice(0,8)}-${Date.now()}`, 'png');
  }
  if (key === 'p' || key === 'P') saveHighRes(2);
  if (key === 'h' || key === 'H') saveHighRes(4);
}

function saveHighRes(sf) {
  const hiSz = width * sf;
  const pg = createGraphics(hiSz, hiSz);
  pg.background(pal.bg);
  pg.noStroke();
  const m = hiSz * 0.08, gw = hiSz - m * 2, cs = gw / gridSize;

  pg.push();
  pg.translate(m, m);
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cs, y = row * cs, t = tiles[row][col];
      const r = cs / 2;
      if (t.dir === 0) {
        drawTeardropPG(pg, x, y+cs, r, -HALF_PI, 0, t.color1, cs);
        drawTeardropPG(pg, x+cs, y, r, HALF_PI, PI, t.color2, cs);
      } else {
        drawTeardropPG(pg, x, y, r, 0, HALF_PI, t.color1, cs);
        drawTeardropPG(pg, x+cs, y+cs, r, PI, PI+HALF_PI, t.color2, cs);
      }
    }
  }
  pg.pop();
  save(pg, `heartchet-${fxhash.slice(0,8)}-${hiSz}px-${Date.now()}`, 'png');
  pg.remove();
}

function drawTeardropPG(pg, cx, cy, radius, startA, endA, col, cellSz) {
  const steps = 48;
  const maxThick = cellSz * 0.62, minThick = cellSz * 0.01;
  const outer = [], inner = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, angle = lerp(startA, endA, t);
    const bulge = pow(sin(t * PI), 0.75);
    const thick = lerp(minThick, maxThick, bulge);
    const oR = radius + thick/2, iR = max(radius - thick/2, cellSz * 0.01);
    outer.push([cx + oR*cos(angle), cy + oR*sin(angle)]);
    inner.push([cx + iR*cos(angle), cy + iR*sin(angle)]);
  }
  pg.fill(col); pg.noStroke(); pg.beginShape();
  for (const [x,y] of outer) pg.vertex(x,y);
  for (let i = inner.length-1; i >= 0; i--) pg.vertex(inner[i][0], inner[i][1]);
  pg.endShape(CLOSE);
}
