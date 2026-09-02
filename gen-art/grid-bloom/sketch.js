// ============================================
// fxhash Generative Art — Grid Bloom 方格綻放
// --------------------------------------------
// 方塊 → 多個不規則多色圓圈 → 還原方塊，且為「連續幾何變形」：
//   每格的黑框與數個彩圈共用同一組頂點，從正方形邊界插值到各自
//   偏移的不規則圓（squircle → circle），變形量 e 反向即收回方塊。
// 何時變形由兩道「由外往內」的波（以離中心距離為準）決定：
//   擴散波 A(1→0) 讓亂圈化從最外圈（四角最先）推進到中心；
//   還原波 R(1→0) 讓乾淨格線由外往內收回，中心最後才變回方塊。
//   某格變形量 amt = 已被 A 波及 且 尚未被 R 還原。
// 構圖（調色盤／格數／每格圓圈參數／節奏）由 fxhash 種子決定。
// ============================================

const rand = fxrand;

function rnd(a = 1, b) { return b === undefined ? rand() * a : a + rand() * (b - a); }
function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function chance(p) { return rand() < p; }

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const MPTS = 30;  // 每個 morph 形狀的取樣頂點數

// ── 目標形狀庫（方塊會變形成其中一種再變回）──
const SHAPES = ["circle", "triangle", "diamond", "pentagon", "hexagon", "star", "blob"];

// 正 n 邊形在角度 a 的半徑（外接半徑=1，頂點 r=1、邊中點 r=cos(π/n)）
function ngonR(a, n) {
  const seg = (Math.PI * 2) / n;
  const x = ((a % seg) + seg) % seg;
  return Math.cos(Math.PI / n) / Math.cos(x - Math.PI / n);
}
// 五角星半徑（尖端 r=1、凹谷 r=inner）
function starR(a, spikes, inner) {
  const seg = (Math.PI * 2) / spikes;
  const x = ((a % seg) + seg) % seg;
  const t = x / seg;
  const tri = 1 - Math.abs(1 - 2 * t);
  return 1 - (1 - inner) * tri;
}
// 目標形狀在世界角度 wa 的半徑（未含抖動）
function shapeR(shape, wa) {
  switch (shape) {
    case "triangle": return ngonR(wa, 3);
    case "diamond":  return ngonR(wa, 4);
    case "pentagon": return ngonR(wa, 5);
    case "hexagon":  return ngonR(wa, 6);
    case "star":     return starR(wa, 5, 0.46);
    case "circle":
    case "blob":
    default:         return 1;
  }
}
// 各形狀的預設朝向（讓三角形/星形尖端朝上較好看）
function baseRot(shape) {
  return (shape === "triangle" || shape === "pentagon" || shape === "star") ? -Math.PI / 2 : 0;
}

// ── 調色盤 ──
const PALETTES = [
  { name: "Prism",  bg: "#f4f2ec", ink: "#141414", colors: ["#e8506b", "#f4a259", "#f6d743", "#6bbf59", "#4da3ff", "#9b6bde", "#ef6fb0"] },
  { name: "Candy",  bg: "#fbf7f2", ink: "#20202a", colors: ["#ff6b9d", "#ffa17f", "#ffd36b", "#a0e7a0", "#7ad7f0", "#c39bff", "#ff8fb1"] },
  { name: "Meadow", bg: "#f3f4ee", ink: "#22261c", colors: ["#3aa06a", "#6bbf59", "#a7c957", "#f2c14e", "#e8845b", "#4d96a8", "#8fb339"] },
  { name: "Dusk",   bg: "#f0eef4", ink: "#1c1a24", colors: ["#7209b7", "#b5179e", "#f72585", "#4361ee", "#4cc9f0", "#ff8fa3", "#9d4edd"] },
  { name: "Ink",    bg: "#f6f4ee", ink: "#101010", colors: ["#2b2b2b", "#c04040", "#3a6ea5", "#5a5a5a", "#8a8a8a", "#c98a2b", "#4a4a4a"] },
  { name: "Ocean",  bg: "#eef4f5", ink: "#12242a", colors: ["#0077b6", "#00b4d8", "#48cae4", "#2a9d8f", "#90e0ef", "#5390d9", "#7ad7f0"] },
  { name: "Ember",  bg: "#f5f1ea", ink: "#221812", colors: ["#e63946", "#f3722c", "#f8961e", "#f9c74f", "#e85d04", "#d00000", "#ff924c"] },
  { name: "Pastel", bg: "#f8f6f2", ink: "#2a2730", colors: ["#ff9aa2", "#ffb997", "#f7d488", "#b8e0a0", "#9bd7e8", "#c3b0f0", "#f2a6d6"] },
];

let P, N, cells = [];
let shape;        // 本作品固定的一種目標形狀
let rot0, rotStep, jitAmt;   // 起始朝向、每循環旋轉量、抖動強度
let period, bandWidth, gridWeight, boldWeight, inkRGB;
let S, startMs = null, previewed = false;

function setup() {
  S = Math.min(windowWidth, windowHeight);
  const c = createCanvas(S, S);
  c.parent(document.body);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  generate();
}

function windowResized() {
  S = Math.min(windowWidth, windowHeight);
  resizeCanvas(S, S);
}

function generate() {
  P = pick(PALETTES);
  N = pick([10, 11, 12, 12, 13, 14]);
  shape = pick(SHAPES);                                   // 每個種子固定一種形狀
  jitAmt = shape === "blob" ? 0.26 : shape === "circle" ? 0.05 : 0.03;
  rot0 = baseRot(shape) + rnd(0, Math.PI * 2);            // 起始朝向
  rotStep = (chance(0.5) ? 1 : -1) * pick([Math.PI / 12, Math.PI / 8, Math.PI / 6, Math.PI / 4, Math.PI / 2]);  // 每循環旋轉量
  period = rint(2800, 3800);
  bandWidth = rnd(0.14, 0.24);
  gridWeight = rnd(0.8, 1.3);
  boldWeight = rnd(2.6, 3.8);
  const ic = color(P.ink);
  inkRGB = [red(ic), green(ic), blue(ic)];
  buildCells();
  updateFeatures();
}

// 每格：正規化半徑 r ＋ 黑框 frame ＋ 數個彩圈 loops（皆為 morph 目標）
function buildCells() {
  cells = [];
  const cc = (N - 1) / 2;
  const rMax = Math.hypot(cc, cc) || 1;
  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const r = Math.hypot(gx - cc, gy - cc) / rMax;
      // 幾何與形狀無關；抖動存單位量，畫時再乘上當前形狀的 jitAmt
      const jitUnit = [];
      for (let k = 0; k < MPTS; k++) jitUnit.push(rnd(-1, 1));
      cells.push({
        gx, gy, r, jitUnit,
        dx: rnd(-0.05, 0.05), dy: rnd(-0.05, 0.05),
        R: rnd(0.44, 0.5),
        rotJit: rnd(-0.1, 0.1),   // 每格朝向的微擾
        squash: rnd(0.9, 1.0),
      });
    }
  }
}

function updateFeatures() {
  window.$fxhashFeatures = {
    "Palette": P.name,
    "Grid": N + "×" + N,
    "Shape": shape.charAt(0).toUpperCase() + shape.slice(1),
    "Spin": Math.round((Math.abs(rotStep) * 180) / Math.PI) + "°" + (rotStep < 0 ? " CCW" : " CW"),
    "Rhythm": period < 3100 ? "Brisk" : period < 3500 ? "Steady" : "Calm",
    "Front": bandWidth < 0.18 ? "Crisp" : "Soft",
  };
}

// 畫一個「正方形 → 目標形狀」的 morph
// c 格資料；sh 形狀；rot 本循環朝向；e 變形量 0..1
function morphShape(cx, cy, h, cell, c, sh, rot, e) {
  beginShape();
  for (let k = -1; k <= MPTS + 1; k++) {
    const idx = ((k % MPTS) + MPTS) % MPTS;
    const a = (k / MPTS) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const m = Math.max(Math.abs(ca), Math.abs(sa)) || 1;
    // 正方形邊界點（以格中心為原點）
    const sqx = h * ca / m, sqy = h * sa / m;
    // 目標形狀邊界點：與方塊點同方向 a（純徑向 morph），rot 旋轉形狀本身
    const rr = c.R * cell * shapeR(sh, a - rot) * (1 + c.jitUnit[idx] * jitAmt);
    const tx = c.dx * cell + Math.cos(a) * rr;
    const ty = c.dy * cell + Math.sin(a) * rr * c.squash;
    curveVertex(cx + sqx + (tx - sqx) * e, cy + sqy + (ty - sqy) * e);
  }
  endShape();
}

function draw() {
  if (startMs === null) startMs = millis();
  background(P.bg);

  const tCyc = (millis() - startMs) / period;
  const ci = Math.floor(tCyc);              // 第幾次轉換
  const cyc = tCyc - ci;                    // 本次相位 0..1
  const cycleRot = rot0 + ci * rotStep;     // 每次轉換朝向再旋轉一步
  let A, R;
  if (cyc < 0.5) { A = 1 - easeInOutCubic(cyc / 0.5); R = 1; }
  else { A = 0; R = 1 - easeInOutCubic((cyc - 0.5) / 0.5); }

  const M = S * 0.085;
  const ext = S - M * 2;
  const cell = ext / N;
  const ox = M, oy = M;
  const sc = S / 900;

  drawGrid(ox, oy, cell);

  push();
  noFill();
  const bw = bandWidth;
  const inset = cell * 0.10;
  const h = (cell - inset * 2) / 2;
  for (const c of cells) {
    const activated = smoothstep(A - bw, A + bw, c.r);
    const restored = smoothstep(R - bw, R + bw, c.r);
    const amt = activated * (1 - restored);          // 此格變形量 0..1
    if (amt <= 0.01) continue;

    const cx = ox + (c.gx + 0.5) * cell;
    const cy = oy + (c.gy + 0.5) * cell;

    // 黑框：先浮現變粗（仍方），再幾何變形成近圓粗框
    const appear = smoothstep(0, 0.30, amt);
    const eFrame = easeInOutCubic(smoothstep(0.30, 1, amt));
    strokeWeight((gridWeight + (boldWeight - gridWeight) * appear) * sc);
    stroke(inkRGB[0], inkRGB[1], inkRGB[2], 235 * appear);
    morphShape(cx, cy, h, cell, c, shape, cycleRot + c.rotJit, eFrame);
  }
  pop();

  if (!previewed && cyc > 0.45 && cyc < 0.55) { previewed = true; fxpreview(); }
}

function drawGrid(ox, oy, cell) {
  push();
  stroke(inkRGB[0], inkRGB[1], inkRGB[2], 60);
  strokeWeight(gridWeight * (S / 900));
  noFill();
  const x1 = ox + cell * N, y1 = oy + cell * N;
  for (let i = 0; i <= N; i++) {
    const g = ox + cell * i, gh = oy + cell * i;
    line(g, oy, g, y1);
    line(ox, gh, x1, gh);
  }
  pop();
}

function mousePressed() { reseed(); }
function keyPressed() { if (key === ' ') reseed(); }
function reseed() {
  for (let i = 0, n = Math.floor(millis()) % 97 + 1; i < n; i++) rand();
  generate();
  startMs = null;
  previewed = true;
}

window.$fxhashFeatures = {};
