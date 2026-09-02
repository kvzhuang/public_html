// ============================================================
// Truchet v2 圓管套色 — Generative Art (p5.js + fxhash)
// 相對 v1（扁平多彩曲線瓷磚）的差異化版本，涵蓋三種風貌（fxhash 隨機）：
//   A「Riso 套色」：亮底、單墨圓管 + 綠/青偏移套色殘影(分色印刷錯位) + 散點
//   B「彩帶眼孔」：黑底、多彩扁平緞帶 + 每節點鉚釘眼孔(環+黑心)
//   C「陶瓷甜甜圈」：黑/亮底、雙三色扁平緞帶 + 甜甜圈大孔環/實心圓盤節點
//   可選左右／四象對稱 → 常浮現圖騰/面具錯視
//   12 組色盤：riso 分色、普普螢光…到鼠尾草/塵霧玫瑰/學院海軍等嚴肅 muted 色
// 色碼參考：RISO 油墨(螢光粉 #F272DD、螢光橘 #F27E63…)、muted 設計色盤
// ============================================================

const rr = (a, b) => a + fxrand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(fxrand() * a.length)];
const chance = p => fxrand() < p;
const TAU = Math.PI * 2, HP = Math.PI / 2;

const PW = 900, PH = 900;
const MARGIN = 56;

// kind:'riso'（亮底單墨+雙套色殘影）/ 'flat'（扁平多彩緞帶+節點環）
const PALETTES = [
  // ── Riso 套色（style A，亮底）──
  { name: '翡翠riso', kind: 'riso', bg: '#f4efda', ink: '#131512', echo: ['#8cc84b', '#1fa39a'] },
  { name: '珊瑚riso', kind: 'riso', bg: '#f7efe2', ink: '#1a1414', echo: ['#ff6c2f', '#f272dd'] },
  { name: '靛紫riso', kind: 'riso', bg: '#edeef4', ink: '#141420', echo: ['#0078bf', '#765ba7'] },
  { name: '鏽土riso', kind: 'riso', bg: '#f2e8d6', ink: '#12100c', echo: ['#e0a63c', '#c0492f'] },
  // ── 彩帶/眼孔（style B，多為黑底普普／螢光）──
  { name: '普普黑', kind: 'flat', bg: '#0d0d0d', cols: ['#ffe800', '#8ac84b', '#3aa6e0', '#f4efda'] },
  { name: '螢光riso', kind: 'flat', bg: '#111014', cols: ['#f272dd', '#ffe800', '#00a95c', '#5ec8e5'] },
  { name: '番茄蛋', kind: 'flat', bg: '#14120f', cols: ['#ff665e', '#ffe800', '#f4efda', '#f27e63'] },
  // ── 陶瓷甜甜圈（style C，藍系/清冷）──
  { name: '陶瓷藍', kind: 'flat', bg: '#0d0d0d', cols: ['#f2eede', '#bfe0e8', '#1f5fbf', '#2f86c5'] },
  { name: '青花瓷', kind: 'flat', bg: '#f0ece0', cols: ['#1f3f8f', '#2f6fb0', '#9cc3e0', '#dfe8f2'] },
  // ── 嚴肅 / muted（沉穩色盤）──
  { name: '鼠尾草', kind: 'flat', bg: '#1e211d', cols: ['#b7c9c7', '#8fa3a0', '#5b6b6a', '#d9d2bf'] },
  { name: '塵霧玫瑰', kind: 'flat', bg: '#17141a', cols: ['#c9a0a8', '#967588', '#8b8b6b', '#e6dcd2'] },
  { name: '學院海軍', kind: 'flat', bg: '#f0ece0', cols: ['#25324a', '#3d5a80', '#98c1d9', '#ee6c4d'] },
  // ── 有趣：蒸氣波 / 60s 普普 ──
  { name: '蒸氣波', kind: 'flat', bg: '#1a0a2e', cols: ['#f272dd', '#5ec8e5', '#f7a93d', '#962662'] },
  { name: '普普60s', kind: 'flat', bg: '#141014', cols: ['#c681cc', '#cc6933', '#d3be47', '#a9d33e'] },
  // ── 嚴肅：赤陶 / 赭石橄欖（亮底、編輯風）──
  { name: '赤陶', kind: 'flat', bg: '#f5f1e8', cols: ['#c36f4e', '#7a7c4e', '#d9c2a3', '#3a3a38'] },
  { name: '赭石橄欖', kind: 'flat', bg: '#eae0cc', cols: ['#cc9544', '#6b7a3f', '#a88a4f', '#3d3a2c'] },
];

const INKDOT = '#141414';   // 鉚釘中心暗點（在亮/暗底都成立）
let P, prims, nodes, feat;
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

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
function keyPressed() { if (key === 's' || key === 'S') save('truchet-v2-' + (fxhash ? fxhash.slice(2, 10) : 'art') + '.png'); }

function generate() {
  P = pick(PALETTES);
  const N = pick([6, 7, 8, 9, 10]);
  const sym = P.kind === 'riso' ? pick(['mirror', 'mirror', 'quad', 'none']) : pick(['none', 'none', 'mirror', 'quad']);
  const gap = (PW - 2 * MARGIN) / N;
  const lw = gap * rr(0.30, 0.40);
  const off = lw * rr(0.45, 0.62);
  const nodeStyle = pick(['donut', 'rivet', 'mixed']);
  const styleName = P.kind === 'riso' ? 'A 套色' : (nodeStyle === 'rivet' ? 'B 眼孔' : 'C 甜甜圈');
  feat = { '色盤': P.name, '風格': styleName, '格數': N,
    '對稱': { mirror: '左右', quad: '四象', none: '無' }[sym] };
  window.$fxhashFeatures = feat;

  // ── 每格瓷磚型別（0/1=弧向、2=直向、3=橫向），含對稱 ──
  const grid = Array.from({ length: N }, () => new Array(N).fill(null));
  const roll = () => { const t = fxrand(); return t < 0.70 ? (chance(0.5) ? 0 : 1) : (t < 0.85 ? 2 : 3); };
  const mirH = t => (t === 0 ? 1 : t === 1 ? 0 : t);   // 左右鏡射：弧向翻轉、直橫不變
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

  // ── 展開緞帶基元（arc/line）+ 依風格上色 ──
  prims = [];
  const cols = P.cols || [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const X = MARGIN + c * gap, Y = MARGIN + r * gap, s = gap;
    const col = P.kind === 'riso' ? P.ink : pick(cols);
    tilePrims(grid[r][c], X, Y, s, col);
  }

  background(...hx(P.bg));

  if (P.kind === 'riso') {
    // 散點（像串珠落在管線上）+ 邊界外突短管圓點
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const X = MARGIN + c * gap, Y = MARGIN + r * gap, s = gap;
      if (chance(0.16)) prims.push({ k: 'dot', x: X + s / 2 + rr(-s * .2, s * .2), y: Y + s / 2 + rr(-s * .2, s * .2), r: lw * 0.5, col: P.ink });
      if (r === 0 && chance(.5)) borderStub(X + s / 2, Y, 0, -1, lw);
      if (r === N - 1 && chance(.5)) borderStub(X + s / 2, Y + s, 0, 1, lw);
      if (c === 0 && chance(.5)) borderStub(X, Y + s / 2, -1, 0, lw);
      if (c === N - 1 && chance(.5)) borderStub(X + s, Y + s / 2, 1, 0, lw);
    }
    renderPass(P.echo[1], off * 1.7, lw);
    renderPass(P.echo[0], off, lw);
    renderPass(P.ink, 0, lw);
  } else {
    // 扁平多彩：每段緞帶各自上色（單道、無偏移）
    strokeCap(ROUND); noFill();
    for (const p of prims) {
      stroke(...hx(p.col)); strokeWeight(lw);
      if (p.k === 'arc') arc(p.cx, p.cy, p.r * 2, p.r * 2, p.a0, p.a1);
      else if (p.k === 'line') line(p.x1, p.y1, p.x2, p.y2);
    }
    // 節點環：整個格點晶格都放一顆（環/甜甜圈/圓盤）
    drawNodes(N, gap, lw * 0.72, nodeStyle);
  }

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

function borderStub(x, y, dx, dy, lw) {
  const L = lw * 1.2;
  prims.push({ k: 'line', x1: x, y1: y, x2: x + dx * L, y2: y + dy * L, col: P.ink });
  prims.push({ k: 'dot', x: x + dx * L, y: y + dy * L, r: lw * 0.5, col: P.ink });
}

// Riso：三道 pass 疊印（往左下偏移露殘影）
function renderPass(colHex, off, lw) {
  const c = hx(colHex);
  push(); translate(-off, off);
  stroke(c[0], c[1], c[2]); strokeWeight(lw); noFill();
  for (const p of prims) if (p.k === 'arc') arc(p.cx, p.cy, p.r * 2, p.r * 2, p.a0, p.a1);
  for (const p of prims) if (p.k === 'line') line(p.x1, p.y1, p.x2, p.y2);
  noStroke(); fill(c[0], c[1], c[2]);
  for (const p of prims) if (p.k === 'dot') circle(p.x, p.y, p.r * 2);
  pop();
}

// Flat：格點晶格上的節點環（環/甜甜圈/圓盤）
function drawNodes(N, gap, r, style) {
  const bg = hx(P.bg), dot = hx(INKDOT), cols = P.cols;
  const pts = [];
  for (let rr_ = 0; rr_ <= N; rr_++) for (let c = 0; c < N; c++) pts.push([MARGIN + (c + 0.5) * gap, MARGIN + rr_ * gap]);
  for (let c = 0; c <= N; c++) for (let rw = 0; rw < N; rw++) pts.push([MARGIN + c * gap, MARGIN + (rw + 0.5) * gap]);
  noStroke();
  for (const [x, y] of pts) {
    const col = hx(pick(cols));
    const st = style === 'mixed' ? pick(['donut', 'donut', 'disc']) : style;
    fill(col[0], col[1], col[2]); circle(x, y, r * 2);
    if (st === 'donut') { fill(bg[0], bg[1], bg[2]); circle(x, y, r * 2 * 0.5); }
    else if (st === 'rivet') { fill(dot[0], dot[1], dot[2]); circle(x, y, r * 2 * 0.32); }
    // disc：實心不挖孔
  }
}
