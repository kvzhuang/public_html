// ============================================================
// Truchet v3 墨壓彩 — Generative Art (p5.js + fxhash)
// 承接 v1(扁平曲線)、v2(圓管套色)，v3 的差異化主軸：
//   ① 墨壓彩 ink-on-color：以 p5 noise 生成大面積「彩色色場」當底，
//      黑色粗圓角管線壓在最上層 → 重現「黑線壓彩塊」的磁磚主視覺
//   ② 密度涵蓋稀疏三色 → 高密多彩；可選 左右／四象 對稱 → 圖騰錯視
//   ③ 邊界收成圓頭 capsule 終端；格點放圓點/甜甜圈/鉚釘低調點綴
// 兩種風貌：inkcolor(墨壓彩，亮底) / ribbon(彩帶管，明暗底皆有，圓點/甜甜圈/鉚釘節點)
// 配色來源：官方 Risograph 油墨色碼
//   螢光粉 #FF48B0、螢光橘 #FF6E40、螢光綠 #A4DC30、Sun Yellow #FFE800、
//   Federal Blue #0078BF、Medium Blue #6F8DCE、Teal #3D8E84、Fluor Red #FF7477…
//   (studio-ity.com/riso/colors, ihatecolors.com/palette/risograph)
// ============================================================

const rr = (a, b) => a + fxrand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(fxrand() * a.length)];
const chance = p => fxrand() < p;
const clampi = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2, HP = Math.PI / 2;

const PW = 900, PH = 900;
const MARGIN = 54;

// style:'inkcolor'(亮底色場+黑管) / 'ribbon'(彩帶管+節點)
const PALETTES = [
  // ── 墨壓彩 inkcolor（亮底、黑管壓彩塊）──
  { name: '三色riso', style: 'inkcolor', bg: '#f6f2df', ink: '#111111', cols: ['#FFE100', '#7ec8ec', '#1c5fc0'] },              // 近似上傳圖①
  { name: '螢光多彩', style: 'inkcolor', bg: '#f6f3e2', ink: '#0d0d0d', cols: ['#FF7477', '#FF6E40', '#FFE800', '#A4DC30', '#0078BF', '#6F8DCE', '#FF48B0'] }, // 近似上傳圖②
  { name: '普普四色', style: 'inkcolor', bg: '#f6f2df', ink: '#111111', cols: ['#FF6E40', '#FFE800', '#0078BF', '#FF48B0'] },
  { name: '藍黃墨', style: 'inkcolor', bg: '#f3efe0', ink: '#101012', cols: ['#FFE800', '#0078BF', '#6F8DCE', '#efe7cf'] },
  { name: '森綠橘', style: 'inkcolor', bg: '#f5f1e6', ink: '#141210', cols: ['#3D8E84', '#A4DC30', '#FF6E40', '#FFE800'] },
  { name: '桃青墨', style: 'inkcolor', bg: '#f6f1ea', ink: '#12100f', cols: ['#FF48B0', '#3D8E84', '#FFE100', '#0078BF'] },
  // ── 彩帶管 ribbon（明/暗底、彩色管線 + 節點）──
  { name: '普普黑', style: 'ribbon', bg: '#0e0e0e', ink: '#f6f2df', cols: ['#FFE800', '#A4DC30', '#3aa6e0', '#FF48B0'] },
  { name: '螢光黑', style: 'ribbon', bg: '#111014', ink: '#f4efda', cols: ['#FF48B0', '#FFE800', '#A4DC30', '#5ec8e5'] },
  { name: '番茄蛋', style: 'ribbon', bg: '#14120f', ink: '#f4efda', cols: ['#FF665E', '#FFE800', '#FF6E40', '#f4efda'] },
  { name: '蒸氣波', style: 'ribbon', bg: '#180a2e', ink: '#f0e6ff', cols: ['#FF48B0', '#5ec8e5', '#FF6E40', '#A4DC30'] },
  { name: '青花瓷', style: 'ribbon', bg: '#f0ece0', ink: '#1f3f8f', cols: ['#1f3f8f', '#2f6fb0', '#7ec8ec', '#dfe8f2'] },
  { name: '學院海軍', style: 'ribbon', bg: '#f0ece0', ink: '#25324a', cols: ['#25324a', '#3D5588', '#6F8DCE', '#FF6E40'] },
  { name: '鼠尾草', style: 'ribbon', bg: '#1e211d', ink: '#d9d2bf', cols: ['#b7c9c7', '#8fa3a0', '#5b6b6a', '#d9d2bf'] },
  { name: '赤陶', style: 'ribbon', bg: '#f5f1e8', ink: '#3a3a38', cols: ['#c36f4e', '#7a7c4e', '#d9c2a3', '#3a3a38'] },
];

let P, prims, feat;
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const sStroke = (h, w) => { const c = hx(h); stroke(c[0], c[1], c[2]); strokeWeight(w); };
const sFill = h => { const c = hx(h); fill(c[0], c[1], c[2]); };

function setup() {
  createCanvas(PW, PH);
  pixelDensity(2);
  angleMode(RADIANS);
  strokeCap(ROUND); strokeJoin(ROUND);
  noLoop();
  generate();
}
function draw() {}
function mousePressed() { generate(); }
function keyPressed() { if (key === 's' || key === 'S') save('truchet-v3-' + (fxhash ? fxhash.slice(2, 10) : 'art') + '.png'); }

function generate() {
  P = pick(PALETTES);
  const inkc = P.style === 'inkcolor';
  const N = inkc ? pick([5, 6, 6, 7, 8, 9, 10, 12]) : pick([6, 7, 8, 9, 10, 11, 12, 14]);
  const sym = pick(['none', 'mirror', 'mirror', 'quad', 'quad']);
  const gap = (PW - 2 * MARGIN) / N;
  // 管徑收細，讓相鄰管線之間露出底色間距（彩帶管收更細；墨壓彩保留較粗以維持黑線壓彩的力道）
  const lw = gap * (inkc ? rr(0.28, 0.36) : rr(0.22, 0.30));
  const nodeStyle = inkc ? 'dot' : pick(['dot', 'donut', 'rivet']);

  feat = {
    '色盤': P.name, '風格': inkc ? '墨壓彩' : '彩帶管', '格數': N,
    '節點': { dot: '圓點', donut: '甜甜圈', rivet: '鉚釘' }[nodeStyle],
    '對稱': { mirror: '左右', quad: '四象', none: '無' }[sym],
  };
  window.$fxhashFeatures = feat;

  // ── 瓷磚型別網格（0/1=弧向、2=直、3=橫），含對稱 ──
  const grid = Array.from({ length: N }, () => new Array(N).fill(0));
  const roll = () => { const t = fxrand(); return t < 0.82 ? (chance(0.5) ? 0 : 1) : (t < 0.91 ? 2 : 3); };
  const mirH = t => (t === 0 ? 1 : t === 1 ? 0 : t);
  if (sym === 'none') {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = roll();
  } else if (sym === 'mirror') {
    for (let r = 0; r < N; r++) for (let c = 0; c < Math.ceil(N / 2); c++) {
      const t = roll(); grid[r][c] = t; grid[r][N - 1 - c] = mirH(t);
    }
  } else {
    for (let r = 0; r < Math.ceil(N / 2); r++) for (let c = 0; c < Math.ceil(N / 2); c++) {
      const t = roll();
      grid[r][c] = t; grid[r][N - 1 - c] = mirH(t);
      grid[N - 1 - r][c] = t; grid[N - 1 - r][N - 1 - c] = mirH(t);
    }
  }

  // ── 展開管線基元 ──
  prims = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const X = MARGIN + c * gap, Y = MARGIN + r * gap;
    tilePrims(grid[r][c], X, Y, gap, pick(P.cols));
  }

  background(...hx(P.bg));

  if (inkc) {
    // ① 彩色色場（noise 生成大面積連續色塊，依對稱摺疊座標）
    noiseSeed(Math.floor(fxrand() * 1e9));
    const nf = rr(0.18, 0.42), cols = P.cols;
    noStroke();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      let nr = r, nc = c;
      if (sym !== 'none') nc = Math.min(c, N - 1 - c);
      if (sym === 'quad') nr = Math.min(r, N - 1 - r);
      const v = noise(nc * nf + 3.1, nr * nf + 7.7);
      sFill(cols[clampi(Math.floor(v * cols.length), 0, cols.length - 1)]);
      rect(MARGIN + c * gap - 0.5, MARGIN + r * gap - 0.5, gap + 1, gap + 1);
    }
    // ② 黑色粗管壓在最上層
    borderStubs(N, gap, lw, P.ink);
    drawPipes(P.ink, lw);
  } else {
    // 彩帶管：每段各自上色
    noFill();
    for (const p of prims) drawPrim(p, p.col, lw);
    borderStubs(N, gap, lw, pick(P.cols));
  }

  // ③ 節點（圓點 / 甜甜圈 / 鉚釘），對稱擺放
  drawNodes(N, gap, lw, sym, nodeStyle, inkc);

  if (window.fxpreview) { try { fxpreview(); } catch (e) {} }
}

function tilePrims(t, X, Y, s, col) {
  const h = s / 2;
  if (t === 0) {
    prims.push({ k: 'arc', cx: X, cy: Y, r: h, a0: 0, a1: HP, col });
    prims.push({ k: 'arc', cx: X + s, cy: Y + s, r: h, a0: Math.PI, a1: Math.PI + HP, col });
  } else if (t === 1) {
    prims.push({ k: 'arc', cx: X + s, cy: Y, r: h, a0: HP, a1: Math.PI, col });
    prims.push({ k: 'arc', cx: X, cy: Y + s, r: h, a0: Math.PI + HP, a1: TAU, col });
  } else if (t === 2) {
    prims.push({ k: 'line', x1: X + h, y1: Y, x2: X + h, y2: Y + s, col });
  } else {
    prims.push({ k: 'line', x1: X, y1: Y + h, x2: X + s, y2: Y + h, col });
  }
}

function drawPrim(p, colHex, w) {
  sStroke(colHex, w); noFill();
  if (p.k === 'arc') arc(p.cx, p.cy, p.r * 2, p.r * 2, p.a0, p.a1);
  else line(p.x1, p.y1, p.x2, p.y2);
}
function drawPipes(colHex, w) {
  sStroke(colHex, w); noFill();
  for (const p of prims) if (p.k === 'arc') arc(p.cx, p.cy, p.r * 2, p.r * 2, p.a0, p.a1);
  for (const p of prims) if (p.k === 'line') line(p.x1, p.y1, p.x2, p.y2);
}

// 邊界外突圓角短管（capsule 端點，像上傳圖的圓頭終端）
function borderStubs(N, gap, lw, colHex) {
  sStroke(colHex, lw); strokeCap(ROUND);
  const L = lw * 1.15;
  for (let c = 0; c < N; c++) {
    const x = MARGIN + (c + 0.5) * gap;
    if (chance(0.5)) line(x, MARGIN, x, MARGIN - L);
    if (chance(0.5)) line(x, PH - MARGIN, x, PH - MARGIN + L);
  }
  for (let r = 0; r < N; r++) {
    const y = MARGIN + (r + 0.5) * gap;
    if (chance(0.5)) line(MARGIN, y, MARGIN - L, y);
    if (chance(0.5)) line(PW - MARGIN, y, PW - MARGIN + L, y);
  }
}

// 節點：圓點 / 甜甜圈 / 鉚釘，擺在格點(弧線捲曲的圓心)，對稱擺放的低調點綴
function drawNodes(N, gap, lw, sym, style, inkc) {
  const V = N + 1;
  const flag = Array.from({ length: V }, () => new Array(V).fill(0));
  const pB = rr(0.10, 0.24);
  const setSym = (i, j) => {
    flag[i][j] = 1;
    if (sym !== 'none') flag[i][V - 1 - j] = 1;
    if (sym === 'quad') { flag[V - 1 - i][j] = 1; flag[V - 1 - i][V - 1 - j] = 1; }
  };
  const ci = Math.ceil(V / 2);
  for (let i = 0; i < ci; i++) for (let j = 0; j < ci; j++) if (chance(pB)) setSym(i, j);

  const bg = P.bg, ink = P.ink, cols = P.cols;
  noStroke();
  for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) {
    if (!flag[i][j]) continue;
    const x = MARGIN + j * gap, y = MARGIN + i * gap;
    const R = lw * rr(0.5, 0.8);
    if (style === 'dot') {
      // 小實心圓點（墨壓彩用黑點，像手作磁磚的接點鉚釘）
      sFill(inkc ? ink : pick(cols)); circle(x, y, R * 2 * 0.72);
    } else if (style === 'rivet') {
      sFill(pick(cols)); circle(x, y, R * 2);
      sFill(inkc ? ink : bg); circle(x, y, R * 0.7);
    } else {
      // 甜甜圈：色環中間挖底色孔
      sFill(pick(cols)); circle(x, y, R * 2);
      sFill(bg); circle(x, y, R);
    }
  }
}
