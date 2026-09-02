// ============================================
// fxhash Generative Art — Tilework 磁磚排版
// --------------------------------------------
// 裝飾磁磚牆：種子挑「鋪貼版型 × 花樣傳統 × 配色」。
//   彩繪磁磚牆：直排 / 錯縫 / 旋轉拼接 ＋ 細緻幾何花樣
//     （伊斯蘭八角星、四葉飾、azulejo 花草、水泥花磚、交織結、zellige 星芒）
//   幾何編織版型：籃編 basketweave / 風車 pinwheel（純色釉磚＋灰縫）
// 配色取自網路精選磁磚色盤（media.io 摩洛哥 20 組、葡萄牙 azulejo…）。
// ============================================

const rand = fxrand;
function rnd(a = 1, b) { return b === undefined ? rand() * a : a + rand() * (b - a); }
function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function chance(p) { return rand() < p; }
function hx2(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

// ── 花樣傳統配色（取自網路精選色盤）──
// fill：磚底（字串或陣列，陣列＝多釉色 zellige）；ink：描邊；colors：花樣用色；grout：灰縫
const PALETTES = [
  { name: "Azulejo", fill: "#f3f0e6", ink: "#1c3f7f", colors: ["#2a5aa6", "#4f79bd", "#8fb0dc", "#c9a24a"], grout: "#e7e0cf" },
  { name: "Delft", fill: "#f6f4ec", ink: "#23407a", colors: ["#2f5296", "#5578b4", "#9fb8d8"], grout: "#ece5d6" },
  { name: "Talavera", fill: "#f5f0e2", ink: "#1f5170", colors: ["#1f7a78", "#e0a81f", "#c0432b", "#3a8f4f"], grout: "#e8dcbe" },
  { name: "Marrakech Rose", fill: "#fff1e1", ink: "#3b1f1f", colors: ["#8e2c3d", "#c98b8f", "#f1a36b", "#c9643b"], grout: "#efe0cf" },
  { name: "Atlas Indigo", fill: "#f6f1e6", ink: "#1e2a78", colors: ["#2b3a90", "#7d84d8", "#c9a24a"], grout: "#e7dfcb" },
  { name: "Citrus Courtyard", fill: "#faf7ef", ink: "#256c6a", colors: ["#2b8c8a", "#7fae3a", "#f2c64b", "#c9643b"], grout: "#ece6d6" },
  { name: "Pomegranate", fill: "#f6e6d5", ink: "#4b1f3a", colors: ["#9a2235", "#e06a3b", "#d98b8d", "#c9a24a"], grout: "#ead9c6" },
  { name: "Art Deco", fill: "#182131", ink: "#c6a24a", colors: ["#c6a24a", "#d08a2d", "#e8dcae", "#2a8f7f"], grout: "#0f1420" },
  { name: "Victorian", fill: "#f3ebdd", ink: "#1a1a1a", colors: ["#b63a2b", "#243b80", "#d0a12a", "#3a5a3a"], grout: "#ddd0b2" },
  // 多釉色 zellige 馬賽克
  { name: "Zellige Teal", tileMulti: true, fill: ["#1ba7a6", "#2646a6", "#0e6e70", "#12608a", "#9be3d4"], ink: "#f2efe7", colors: ["#f2efe7", "#f0d68a"], grout: "#e7e0d0" },
  { name: "Souk Spice", tileMulti: true, fill: ["#c2543a", "#e2a037", "#0f6b6d", "#8a5a2d", "#a8451f"], ink: "#f4e7d3", colors: ["#f4e7d3", "#f0d68a"], grout: "#e3d8bd" },
  { name: "Royal Fes", tileMulti: true, fill: ["#0b7a4b", "#b12a3a", "#d1b15a", "#14234a", "#b27c33"], ink: "#f5f0e6", colors: ["#f5f0e6", "#f0d68a"], grout: "#e6ddc6" },
];

const WALL_MOTIFS = ["star8", "quatrefoil", "azulejo", "zellige", "interlace"];

let scene, S, previewed = false;
let tileData = [];

function setup() {
  S = Math.min(windowWidth, windowHeight);
  const c = createCanvas(S, S);
  c.parent(document.body);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  buildScene();
  noLoop();
}
function windowResized() { S = Math.min(windowWidth, windowHeight); resizeCanvas(S, S); redraw(); }

function buildScene() {
  const pal = pick(PALETTES);
  const category = chance(0.64) ? "wall" : "weave";
  let s = { pal, category };
  if (category === "wall") {
    s.layout = pick(["grid", "running", "rotated"]);
    s.motif = s.layout === "rotated" ? "encaustic" : pick(WALL_MOTIFS);
    s.N = s.layout === "rotated" ? rint(5, 7) : rint(4, 6);   // 磚較大 → 細節更清楚
  } else {
    s.layout = pick(["basket", "pinwheel"]);
    s.units = s.layout === "basket" ? rint(8, 12) : rint(6, 12);
  }
  tileData = [];
  for (let i = 0; i < 4096; i++) tileData.push({ r: rand(), r2: rand(), rot: rint(0, 3), c1: rint(0, 5), c2: rint(0, 5), c3: rint(0, 5), f: rint(0, 6), style: rint(0, 2) });
  scene = s;
  updateFeatures();
}

function updateFeatures() {
  const layoutName = { grid: "Straight", running: "Running Bond", rotated: "Rotated", basket: "Basketweave", pinwheel: "Pinwheel" }[scene.layout];
  window.$fxhashFeatures = {
    "Tradition": scene.pal.name,
    "Layout": layoutName,
    "Motif": scene.category === "wall" ? scene.motif : "Geometric",
  };
}

// 取色
function col(pal, i) { return pal.colors[((i % pal.colors.length) + pal.colors.length) % pal.colors.length]; }
function weaveColors(pal) { return pal.tileMulti ? pal.fill : pal.colors; }
function darken(c, f) { const r = Array.isArray(c) ? c : hx2(c); return [r[0] * f, r[1] * f, r[2] * f]; }
// 釉色微變化（每磚略有明暗）
function glaze(hex, td) { const c = hx2(hex), m = 0.93 + td.r * 0.14; return [Math.min(255, c[0] * m), Math.min(255, c[1] * m), Math.min(255, c[2] * m)]; }
function tileFillRGB(pal, td) { const f = Array.isArray(pal.fill) ? pal.fill[td.f % pal.fill.length] : pal.fill; return glaze(f, td); }

function starShape(rIn, rOut, pts, phase) {
  beginShape();
  for (let i = 0; i < pts * 2; i++) { const a = i / (pts * 2) * TWO_PI - HALF_PI + (phase || 0); const r = (i % 2 === 0) ? rOut : rIn; vertex(cos(a) * r, sin(a) * r); }
  endShape(CLOSE);
}

function draw() {
  const pal = scene.pal;
  background(pal.grout);
  let ti = 0;
  const next = () => tileData[(ti++) % tileData.length];

  if (scene.category === "wall") {
    const N = scene.N, T = S / N;
    for (let gy = -1; gy < N + 1; gy++) {
      for (let gx = -1; gx < N + 1; gx++) {
        let x = gx * T, y = gy * T;
        if (scene.layout === "running" && ((gy % 2 + 2) % 2 === 1)) x += T / 2;
        const td = next();
        const rot = scene.layout === "rotated" ? td.rot * HALF_PI : 0;
        drawWallTile(x, y, T, pal, td, scene.motif, rot);
      }
    }
  } else if (scene.layout === "basket") { drawBasketweave(pal, next); }
  else { drawPinwheel(pal, next); }

  drawFrame(pal);
  drawLabel();
  if (!previewed) { previewed = true; fxpreview(); }
}

function drawWallTile(x, y, size, pal, td, motif, rot) {
  const grout = Math.max(1.6, size * 0.045);
  const inner = size - grout;
  const sw = Math.max(1, size * 0.013);
  push();
  translate(x + size / 2, y + size / 2);
  rectMode(CENTER);
  // 將此磚的繪製裁切在磚面內 → 花樣不會溢出到灰縫（縫隙保持乾淨）
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(-inner / 2, -inner / 2, inner, inner);
  drawingContext.clip();
  const f = tileFillRGB(pal, td);
  noStroke(); fill(f[0], f[1], f[2]);
  rect(0, 0, inner, inner);
  // 內框細線（非旋轉版型才加，仿真磁磚邊飾）
  if (rot === 0) {
    const ic = hx2(pal.ink); noFill();
    stroke(ic[0], ic[1], ic[2], 46); strokeWeight(sw * 0.8);
    rect(0, 0, inner * 0.9, inner * 0.9);
  }
  if (rot) rotate(rot);
  drawMotif(motif, inner / 2 * 0.96, pal, td, sw);
  drawingContext.restore();
  pop();
}

function drawMotif(name, h, pal, td, sw) {
  const ink = pal.ink;
  const c1 = col(pal, td.c1), c2 = col(pal, td.c2 === td.c1 ? td.c1 + 1 : td.c2), c3 = col(pal, td.c3 + 2);
  strokeJoin(ROUND); strokeCap(ROUND);

  if (name === "star8") {
    // 外八角星
    stroke(ink); strokeWeight(sw); fill(c1); starShape(h * 0.44, h * 0.98, 8);
    // 內八角星（旋轉半格）
    fill(c2); strokeWeight(sw * 0.8); starShape(h * 0.22, h * 0.5, 8, PI / 8);
    // 中心
    noStroke(); fill(ink); circle(0, 0, h * 0.2); fill(c3); circle(0, 0, h * 0.1);
    // 邊心方鑽（四磚拼合成星＋十字）
    for (let i = 0; i < 4; i++) { push(); rotate(i * HALF_PI); translate(0, h * 0.99); rotate(QUARTER_PI); rectMode(CENTER); stroke(ink); strokeWeight(sw * 0.7); fill(c2); rect(0, 0, h * 0.3, h * 0.3); pop(); }
  } else if (name === "quatrefoil") {
    const rr = h * 0.5;
    const lobes = (fn) => { for (const s of [[0, -rr], [0, rr], [-rr, 0], [rr, 0]]) fn(s[0], s[1]); };
    noStroke(); fill(c1); lobes((lx, ly) => circle(lx, ly, rr * 1.32));
    stroke(ink); strokeWeight(sw); noFill(); lobes((lx, ly) => circle(lx, ly, rr * 1.32));
    // 內描摹
    stroke(c2); strokeWeight(sw * 0.9); noFill(); lobes((lx, ly) => circle(lx * 0.7, ly * 0.7, rr * 0.86));
    // 中心玫瑰
    noStroke(); fill(c3); circle(0, 0, rr * 0.86); stroke(ink); strokeWeight(sw); noFill(); circle(0, 0, rr * 0.86);
    noStroke(); fill(c2); circle(0, 0, rr * 0.34); fill(ink); circle(0, 0, rr * 0.14);
    // 環繞小點
    noStroke(); fill(ink); for (let i = 0; i < 8; i++) { const a = i / 8 * TWO_PI; circle(cos(a) * h * 0.66, sin(a) * h * 0.66, h * 0.07); }
    // 角落飾（跨磚成花）
    for (const s of [[-h, -h], [h, -h], [-h, h], [h, h]]) { fill(c1); circle(s[0], s[1], h * 0.5); fill(c3); circle(s[0], s[1], h * 0.2); }
  } else if (name === "azulejo") {
    // 對角莖葉
    stroke(c3); strokeWeight(sw * 1.1); noFill();
    for (let i = 0; i < 4; i++) { push(); rotate(QUARTER_PI + i * HALF_PI); line(0, 0, 0, h * 0.9); noStroke(); fill(c3); ellipse(h * 0.06, h * 0.6, h * 0.12, h * 0.26); ellipse(-h * 0.06, h * 0.72, h * 0.12, h * 0.26); stroke(c3); strokeWeight(sw * 1.1); noFill(); pop(); }
    // 外層 8 瓣
    noStroke(); fill(c1); for (let i = 0; i < 8; i++) { push(); rotate(i / 8 * TWO_PI); ellipse(0, h * 0.46, h * 0.3, h * 0.64); pop(); }
    stroke(ink); strokeWeight(sw * 0.8); noFill(); for (let i = 0; i < 8; i++) { push(); rotate(i / 8 * TWO_PI); ellipse(0, h * 0.46, h * 0.3, h * 0.64); pop(); }
    // 內層 8 瓣（錯開）
    noStroke(); fill(c2); for (let i = 0; i < 8; i++) { push(); rotate((i + 0.5) / 8 * TWO_PI); ellipse(0, h * 0.28, h * 0.16, h * 0.38); pop(); }
    // 花心
    noStroke(); fill(c3); circle(0, 0, h * 0.4); stroke(ink); strokeWeight(sw); noFill(); circle(0, 0, h * 0.4);
    noStroke(); fill(ink); circle(0, 0, h * 0.16);
    // 角落四分之一花
    for (const s of [[-h, -h], [h, -h], [-h, h], [h, h]]) { fill(c1); circle(s[0], s[1], h * 0.56); fill(c2); circle(s[0], s[1], h * 0.28); fill(ink); circle(s[0], s[1], h * 0.1); }
  } else if (name === "zellige") {
    // 中央 8 芒星
    stroke(ink); strokeWeight(sw); fill(c1); starShape(h * 0.36, h * 0.62, 8);
    // 環繞小鑽（馬賽克碎片）
    for (let i = 0; i < 8; i++) { push(); rotate(i / 8 * TWO_PI + PI / 8); translate(0, h * 0.8); rotate(QUARTER_PI); rectMode(CENTER); stroke(ink); strokeWeight(sw * 0.7); fill(c2); rect(0, 0, h * 0.26, h * 0.26); pop(); }
    // 芒間細三角
    noStroke(); fill(c3); for (let i = 0; i < 8; i++) { push(); rotate(i / 8 * TWO_PI); triangle(0, -h * 0.5, h * 0.1, -h * 0.72, -h * 0.1, -h * 0.72); pop(); }
    noStroke(); fill(c2); circle(0, 0, h * 0.34); fill(ink); circle(0, 0, h * 0.14);
  } else if (name === "interlace") {
    const bw = h * 0.42;
    rectMode(CENTER);
    // 底帶 c2（斜）
    noStroke(); fill(c2); push(); rotate(-QUARTER_PI); rect(0, 0, h * 3, bw); pop();
    // 上帶 c1（斜），中央留缺口讓底帶露出 → over/under
    fill(c1); push(); rotate(QUARTER_PI); rect(h * 0.85, 0, h * 1.3, bw); rect(-h * 0.85, 0, h * 1.3, bw); pop();
    // 描邊
    stroke(ink); strokeWeight(sw * 0.9); noFill();
    push(); rotate(-QUARTER_PI); rect(0, 0, h * 3, bw); pop();
    push(); rotate(QUARTER_PI); rect(h * 0.85, 0, h * 1.3, bw); rect(-h * 0.85, 0, h * 1.3, bw); pop();
    // 中心結釘
    noStroke(); fill(c3); circle(0, 0, h * 0.22); stroke(ink); strokeWeight(sw * 0.8); noFill(); circle(0, 0, h * 0.22);
  } else if (name === "encaustic") {
    const st = td.style;
    stroke(ink); strokeWeight(sw);
    if (st === 0) {
      // 兩對角四分圓 + 同心細弧
      fill(c1); arc(-h, -h, 2 * h, 2 * h, 0, HALF_PI); arc(h, h, 2 * h, 2 * h, PI, PI + HALF_PI);
      noFill(); stroke(c2); strokeWeight(sw * 0.9); arc(-h, -h, h, h, 0, HALF_PI); arc(h, h, h, h, PI, PI + HALF_PI);
    } else if (st === 1) {
      // 四角四分圓 → 中央留菱形
      fill(c1); arc(-h, -h, 2 * h, 2 * h, 0, HALF_PI); arc(h, -h, 2 * h, 2 * h, HALF_PI, PI); arc(-h, h, 2 * h, 2 * h, PI + HALF_PI, TWO_PI); arc(h, h, 2 * h, 2 * h, PI, PI + HALF_PI);
      noStroke(); fill(c2); push(); rotate(QUARTER_PI); rectMode(CENTER); rect(0, 0, h * 0.62, h * 0.62); pop();
      fill(ink); circle(0, 0, h * 0.16);
    } else {
      // 圓中花：中央圓 + 四葉
      noStroke(); fill(c1); circle(0, 0, h * 1.15);
      fill(c2); for (let i = 0; i < 4; i++) { push(); rotate(i * HALF_PI); ellipse(0, h * 0.5, h * 0.4, h * 0.7); pop(); }
      fill(c3); circle(0, 0, h * 0.4); fill(ink); circle(0, 0, h * 0.16);
    }
  }
}

// ── 籃編 ──
function drawBasketweave(pal, next) {
  const u = S / scene.units;
  const cols = Math.ceil(S / (2 * u)) + 1;
  const g = Math.max(1.6, u * 0.09);
  const CL = weaveColors(pal);
  for (let bj = 0; bj < cols; bj++) {
    for (let bi = 0; bi < cols; bi++) {
      const td = next();
      const cA = CL[td.c1 % CL.length], cB = CL[(td.c2 === td.c1 ? td.c2 + 1 : td.c2) % CL.length];
      const x0 = bi * 2 * u, y0 = bj * 2 * u;
      if ((bi + bj) % 2 === 0) { plank(x0, y0, 2 * u, u, g, cA, td); plank(x0, y0 + u, 2 * u, u, g, cB, td); }
      else { plank(x0, y0, u, 2 * u, g, cB, td); plank(x0 + u, y0, u, 2 * u, g, cA, td); }
    }
  }
}
// ── 風車 ──
function drawPinwheel(pal, next) {
  const blocks = Math.max(2, Math.round(scene.units / 3));
  const u = S / (blocks * 3);
  const g = Math.max(1.6, u * 0.1);
  const CL = weaveColors(pal);
  for (let bj = -1; bj < blocks + 1; bj++) {
    for (let bi = -1; bi < blocks + 1; bi++) {
      const td = next();
      const cc = CL[td.c1 % CL.length];
      const x = bi * 3 * u, y = bj * 3 * u;
      plank(x, y, 2 * u, u, g, cc, td); plank(x + 2 * u, y, u, 2 * u, g, cc, td);
      plank(x + u, y + 2 * u, 2 * u, u, g, cc, td); plank(x, y + u, u, 2 * u, g, cc, td);
      plank(x + u, y + u, u, u, g, "#dark", td, darken(cc, 0.5));
    }
  }
}
function plank(x, y, w, h, g, c, td, forceRGB) {
  const rgb = forceRGB ? forceRGB : glaze(c, td);
  noStroke(); fill(rgb[0], rgb[1], rgb[2]);
  rect(x + g / 2, y + g / 2, w - g, h - g);
  noFill(); stroke(255, 255, 255, 26); strokeWeight(Math.max(1, g * 0.5));
  rect(x + g, y + g, w - g * 2, h - g * 2);
}

function drawFrame(pal) { push(); noFill(); stroke(pal.grout); strokeWeight(S * 0.03); rectMode(CORNER); rect(S * 0.015, S * 0.015, S - S * 0.03, S - S * 0.03); pop(); }

function drawLabel() {
  const pal = scene.pal;
  push();
  const pad = S * 0.032, fs = Math.max(10, S * 0.017);
  const layoutName = { grid: "Straight set", running: "Running bond", rotated: "Rotated set", basket: "Basketweave", pinwheel: "Pinwheel" }[scene.layout];
  noStroke(); fill(20, 18, 14, 120); rect(0, S - fs * 2.6, S * 0.6, fs * 2.6);
  textFont("Georgia, 'Times New Roman', serif"); textAlign(LEFT, BOTTOM);
  fill(245, 240, 230, 235); textSize(fs); textStyle(ITALIC); text(pal.name + " tilework", pad, S - fs * 1.5);
  textStyle(NORMAL); textSize(fs * 0.82); fill(230, 224, 210, 205);
  text(layoutName + (scene.category === "wall" ? " · " + scene.motif : ""), pad, S - fs * 0.35);
  pop();
}

function mousePressed() { reseed(); }
function keyPressed() { if (key === ' ') reseed(); if (key === 's' || key === 'S') saveCanvas("tilework", "png"); }
function reseed() { for (let i = 0, n = Math.floor(millis()) % 97 + 1; i < n; i++) rand(); buildScene(); previewed = true; redraw(); }

window.$fxhashFeatures = {};
