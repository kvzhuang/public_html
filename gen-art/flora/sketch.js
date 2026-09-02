// ============================================
// Flora — 扁平風格花束生成藝術
// Dense flat-design flower bouquet in a circle
// Inspired by bold calla lily / poppy illustration
// ============================================

const rand = fxrand;

// ── Color Palettes ──────────────────────────────────────────────────────────

const PALETTES = [
  {
    name: "Original",
    bg: "#EBEBEB",
    circle: [242, 218, 225],
    flowers: ["#D2372D","#B92A26","#EB9628","#E17332","#233B8C","#3250AA",
              "#1EBEB2","#37CDC3","#F5CD2D","#E6878C","#F0C3BE","#F8F2EE","#E46C52"],
    leaves: ["#1EBEB2","#37CDC3","#233B8C","#3250AA"],
    pistils: ["#F5CD2D","#EB9628","#F8F2EE","#233B8C"],
  },
  {
    name: "Sunset Garden",
    bg: "#F5F0E8",
    circle: [245, 225, 210],
    flowers: ["#E63946","#F4A261","#E76F51","#F9C74F","#D62828","#FCBF49",
              "#EE6C4D","#F77F00","#FFB5A7","#FCD5CE","#FFFFFF"],
    leaves: ["#2A9D8F","#264653","#386641","#52B788"],
    pistils: ["#F9C74F","#FFFFFF","#2A9D8F","#264653"],
  },
  {
    name: "Ocean Bloom",
    bg: "#EEF0F5",
    circle: [215, 225, 240],
    flowers: ["#0077B6","#00B4D8","#0096C7","#48CAE4","#023E8A","#90E0EF",
              "#CAF0F8","#FFFFFF","#FF6B6B","#F77F00"],
    leaves: ["#023E8A","#0077B6","#006D77","#184E77"],
    pistils: ["#FFFFFF","#FFD166","#FF6B6B","#90E0EF"],
  },
  {
    name: "Berry Fields",
    bg: "#F2EEF5",
    circle: [235, 218, 240],
    flowers: ["#7B2D8E","#9B3D9E","#BB4DAE","#8B1E3F","#D4447E","#E8A0BF",
              "#F2D0E0","#FFFFFF","#FF6B6B","#FFB347"],
    leaves: ["#2D6A4F","#40916C","#52B788","#1B4332"],
    pistils: ["#FFB347","#FFFFFF","#FF6B6B","#7B2D8E"],
  },
  {
    name: "Tokyo Pop",
    bg: "#F0F0F0",
    circle: [240, 225, 230],
    flowers: ["#FF2A6D","#05D9E8","#7B61FF","#FF6B6B","#01012B","#D1F7FF",
              "#FFB86C","#FF79C6","#FFFFFF"],
    leaves: ["#01012B","#05D9E8","#233B8C","#7B61FF"],
    pistils: ["#FFB86C","#FFFFFF","#FF2A6D","#05D9E8"],
  },
  {
    name: "Matisse",
    bg: "#FAF9F6",
    circle: [242, 232, 220],
    flowers: ["#E63946","#457B9D","#1D3557","#F4A261","#E9C46A","#A8DADC",
              "#F1FAEE","#264653","#D62828"],
    leaves: ["#264653","#2A9D8F","#1D3557","#457B9D"],
    pistils: ["#E9C46A","#F4A261","#F1FAEE","#264653"],
  },
  {
    name: "Sakura",
    bg: "#F8F5F2",
    circle: [248, 225, 230],
    flowers: ["#FFB7C5","#FF69B4","#FFC0CB","#DB7093","#FF1493","#FFFFFF",
              "#F8E8EE","#E8A0BF","#C71585"],
    leaves: ["#2D6A4F","#52B788","#40916C","#386641"],
    pistils: ["#FFD700","#FFFFFF","#FF69B4","#DB7093"],
  },
  {
    name: "Autumn",
    bg: "#F5F0E8",
    circle: [240, 228, 210],
    flowers: ["#BC6C25","#DDA15E","#D4A373","#606C38","#283618","#FEFAE0",
              "#E9EDC9","#CCD5AE","#9B2226","#AE2012"],
    leaves: ["#283618","#606C38","#386641","#2D6A4F"],
    pistils: ["#DDA15E","#FEFAE0","#D4A373","#283618"],
  },
];

// ── State ───────────────────────────────────────────────────────────────────

let pal;
let sz;
let cx, cy, cr;
let flowerCount, leafCount;
let density;
let elements = [];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  sz = min(windowWidth, windowHeight);
  const cnv = createCanvas(sz, sz);
  cnv.style("display", "block");
  cnv.style("position", "absolute");
  cnv.style("top", (windowHeight - sz) / 2 + "px");
  cnv.style("left", (windowWidth - sz) / 2 + "px");

  noStroke();

  pal = PALETTES[floor(rand() * PALETTES.length)];
  cx = sz / 2;
  cy = sz / 2;
  cr = sz * 0.39;

  generateComposition();

  window.$fxhashFeatures = {
    "Palette": pal.name,
    "Density": density,
    "Flowers": flowerCount,
  };

  noLoop();
  setTimeout(() => fxpreview(), 1500);
}

function generateComposition() {
  const d = rand();
  if (d < 0.15)      { density = "Sparse"; flowerCount = floor(rand()*10)+25; leafCount = floor(rand()*5)+10; }
  else if (d < 0.55)  { density = "Normal"; flowerCount = floor(rand()*15)+38; leafCount = floor(rand()*8)+15; }
  else if (d < 0.85)  { density = "Dense";  flowerCount = floor(rand()*15)+50; leafCount = floor(rand()*8)+20; }
  else                 { density = "Lush";   flowerCount = floor(rand()*20)+65; leafCount = floor(rand()*10)+25; }

  elements = [];

  // Leaves (back layer)
  for (const [x, y] of genPositions(leafCount, sz * 0.025)) {
    elements.push({
      type: "leaf", x, y,
      s: sz * (rand() * 0.06 + 0.065),
      a: rand() * TWO_PI,
      col: pickRand(pal.leaves),
      layer: 0,
    });
  }

  // Flowers (front layer)
  const types = ["calla","calla","calla","poppy","poppy","tulip","round"];
  for (const [x, y] of genPositions(flowerCount, sz * 0.018)) {
    elements.push({
      type: pickRand(types), x, y,
      s: sz * (rand() * 0.08 + 0.06),
      a: rand() * TWO_PI,
      col: pickRand(pal.flowers),
      pistil: pickRand(pal.pistils),
      layer: 1,
    });
  }

  elements.sort((a, b) => a.layer !== b.layer ? a.layer - b.layer : a.y - b.y);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function pickRand(arr) { return arr[floor(rand() * arr.length)]; }

function rotPt(px, py, ox, oy, a) {
  const s = sin(a), c = cos(a);
  return [ox + (px-ox)*c - (py-oy)*s, oy + (px-ox)*s + (py-oy)*c];
}

function cubicBez(p0, p1, p2, p3, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    pts.push([
      u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
      u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1],
    ]);
  }
  return pts;
}

function drawPoly(pts, col) {
  fill(col);
  beginShape();
  for (const [x, y] of pts) vertex(x, y);
  endShape(CLOSE);
}

function genPositions(n, minDist) {
  const pts = [];
  for (let att = 0; att < n * 30 && pts.length < n; att++) {
    const a = rand() * TWO_PI;
    const d = cr * sqrt(rand() * 0.88);
    const x = cx + d * cos(a), y = cy + d * sin(a);
    if (dist(x, y, cx, cy) > cr * 0.95) continue;
    let ok = true;
    for (const p of pts) {
      if (dist(x, y, p[0], p[1]) < minDist && rand() > 0.35) { ok = false; break; }
    }
    if (ok) pts.push([x, y]);
  }
  return pts;
}

// ── Flower shapes (draw directly to main canvas) ────────────────────────────

function drawLeafShape(e) {
  const { x, y, s, a, col } = e;
  const L = cubicBez([x,y+s*.5],[x-s*.28,y+s*.08],[x-s*.22,y-s*.28],[x,y-s*.5],16);
  const R = cubicBez([x,y-s*.5],[x+s*.22,y-s*.28],[x+s*.28,y+s*.08],[x,y+s*.5],16);
  drawPoly([...L,...R].map(p => rotPt(p[0],p[1],x,y,a)), col);
}

function drawCallaShape(e) {
  const { x, y, s, a, col, pistil } = e;
  const L = cubicBez([x-s*.06,y+s*.48],[x-s*.58,y+s*.12],[x-s*.48,y-s*.38],[x-s*.06,y-s*.52],20);
  const R = cubicBez([x+s*.06,y-s*.52],[x+s*.52,y-s*.32],[x+s*.52,y+s*.18],[x+s*.06,y+s*.48],20);
  drawPoly([...L,...R].map(p => rotPt(p[0],p[1],x,y,a)), col);
  // Spadix
  const sp = cubicBez([x,y+s*.12],[x,y-s*.05],[x,y-s*.22],[x,y-s*.40],10);
  fill(pistil);
  for (let i = 0; i < sp.length; i++) {
    const [sx,sy] = rotPt(sp[i][0],sp[i][1],x,y,a);
    const r = s * .045 * (1 - i/sp.length*.6);
    ellipse(sx,sy,r*2,r*2);
  }
}

function drawPoppyShape(e) {
  const { x, y, s, a, col, pistil } = e;
  const n = floor(rand()*2)+5;
  for (let i = 0; i < n; i++) {
    const pa = a + TWO_PI*i/n + (rand()-.5)*.25;
    const px = x + s*.24*cos(pa), py = y + s*.24*sin(pa);
    const r = s*(.28+rand()*.06);
    fill(col);
    ellipse(px,py,r*2,r*1.8);
  }
  fill(pistil);
  ellipse(x,y,s*.22,s*.22);
}

function drawTulipShape(e) {
  const { x, y, s, a, col, pistil } = e;
  const L = cubicBez([x,y+s*.38],[x-s*.48,y+s*.18],[x-s*.42,y-s*.32],[x-s*.12,y-s*.42],18);
  const R = cubicBez([x+s*.12,y-s*.42],[x+s*.42,y-s*.32],[x+s*.48,y+s*.18],[x,y+s*.38],18);
  drawPoly([...L,...R].map(p => rotPt(p[0],p[1],x,y,a)), col);
  const [px,py] = rotPt(x,y-s*.12,x,y,a);
  fill(pistil);
  ellipse(px,py,s*.14,s*.14);
}

function drawRoundShape(e) {
  const { x, y, s, a, col, pistil } = e;
  const n = floor(rand()*3)+6;
  fill(col);
  beginShape();
  for (let i = 0; i <= n*12; i++) {
    const ang = TWO_PI*i/(n*12);
    const bump = s*.35 + s*.08*sin(ang*n);
    vertex(x+bump*cos(ang+a), y+bump*sin(ang+a));
  }
  endShape(CLOSE);
  fill(pistil);
  ellipse(x,y,s*.20,s*.20);
}

// ── Main draw — uses native canvas clip, no offscreen buffer ────────────────

function draw() {
  background(pal.bg);
  noStroke();

  // Soft circle background (slightly larger than clip circle)
  fill(pal.circle[0], pal.circle[1], pal.circle[2]);
  ellipse(cx, cy, (cr + sz * 0.02) * 2, (cr + sz * 0.02) * 2);

  // Clip to circle using native canvas API — no pixelDensity issues
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(cx, cy, cr, 0, Math.PI * 2);
  drawingContext.clip();

  // Draw all elements inside the clip
  for (const e of elements) {
    if (dist(e.x, e.y, cx, cy) > cr * 1.15) continue;
    switch (e.type) {
      case "leaf":  drawLeafShape(e);  break;
      case "calla": drawCallaShape(e); break;
      case "poppy": drawPoppyShape(e); break;
      case "tulip": drawTulipShape(e); break;
      case "round": drawRoundShape(e); break;
    }
  }

  // Restore — removes clip
  drawingContext.restore();
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  sz = min(windowWidth, windowHeight);
  resizeCanvas(sz, sz);
  const cnv = document.querySelector("canvas");
  if (cnv) {
    cnv.style.top = (windowHeight - sz) / 2 + "px";
    cnv.style.left = (windowWidth - sz) / 2 + "px";
  }
  cx = sz / 2;
  cy = sz / 2;
  cr = sz * 0.39;
  generateComposition();
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    pal = PALETTES[floor(rand() * PALETTES.length)];
    generateComposition();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`flora-${fxhash.slice(0,8)}-${Date.now()}`, 'png');
  }
}
