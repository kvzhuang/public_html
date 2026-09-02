/* ============================================================
   叉點漂移 · Cross Drift — n×n 點陣上，四點連成叉叉，平滑上下左右移動
   原創生成藝術 · p5.js + fxhash（每次載入依種子變化）
   ============================================================ */

// 配色（bg 底色 / dot 點陣色 / marks 叉叉色盤）——參考各種配色傳統
const PALETTES = [
  { name: 'Pop', bg: '#efece3', dot: '#cbc5b6', marks: ['#e63946', '#f4a259', '#2a9d8f', '#3d5a80', '#e76f51', '#8338ec', '#ff9f1c', '#118ab2'] },
  { name: 'Neon Dark', bg: '#111318', dot: '#2a2f3a', marks: ['#ff477e', '#ffd166', '#06d6a0', '#4cc9f0', '#c77dff', '#f9844a', '#80ffdb'] },
  { name: 'Pastel', bg: '#faf3ef', dot: '#e6ddd4', marks: ['#ff9aa2', '#ffb7b2', '#94d2bd', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fdd85d'] },
  { name: 'Earth', bg: '#f4efe6', dot: '#dacfba', marks: ['#a44a3f', '#d98e04', '#5f7161', '#3a4750', '#c17c74', '#7a6c5d', '#9c6644'] },
  { name: 'Cyber', bg: '#0d1b2a', dot: '#1b3a4b', marks: ['#00f5d4', '#00bbf9', '#f15bb5', '#fee440', '#9b5de5', '#ff8fab'] },
  { name: 'Mono Warm', bg: '#f2e9e4', dot: '#d8c9c0', marks: ['#22223b', '#4a4e69', '#9a8c98', '#8d5a45', '#b5838d', '#6d6875'] },
  { name: 'Candy Night', bg: '#17111f', dot: '#352a45', marks: ['#ff6ad5', '#c774e8', '#ad8cff', '#8795e8', '#94d0ff', '#ffde7a'] },
  { name: 'Forest', bg: '#eef2e6', dot: '#cfdabb', marks: ['#386641', '#6a994e', '#a7c957', '#bc4749', '#e09f3e', '#528265'] },
  { name: 'Ocean', bg: '#e8f1f2', dot: '#c7dbe0', marks: ['#006d77', '#83c5be', '#ee6c4d', '#3d5a80', '#98c1d9', '#f4a261'] },
  { name: 'Ink', bg: '#f6f4ee', dot: '#d7d2c4', marks: ['#1d1d1d', '#c1121f', '#003049', '#606c38', '#bc6c25'] },
];

let SIZE, N, margin, cell;
let pal, tokens = [];
const OFF = [[-1, -1], [1, -1], [-1, 1], [1, 1]];   // 四個端點（TL,TR,BL,BR）
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOutBack = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };  // 抵達時 Q 彈

const rr = (a, b) => a + fxrand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(fxrand() * arr.length)];

function setup() {
  SIZE = Math.min(windowWidth, windowHeight);
  createCanvas(SIZE, SIZE);
  init();
}
function windowResized() {
  SIZE = Math.min(windowWidth, windowHeight);
  resizeCanvas(SIZE, SIZE);
  layout();
}
function layout() {
  margin = SIZE * 0.075;
  cell = (SIZE - 2 * margin) / (N - 1);
}
const nodeX = gx => margin + gx * cell;
const nodeY = gy => margin + gy * cell;

function init() {
  pal = pick(PALETTES);
  N = ri(15, 26);
  layout();
  const count = Math.max(8, Math.min(26, Math.round(N * N * 0.05)));
  tokens = [];
  for (let i = 0; i < count; i++) {
    const gx = ri(0, N - 1), gy = ri(0, N - 1);
    tokens.push({
      gx, gy, fx: gx, fy: gy, tx: gx, ty: gy, t: 1,
      state: 'wait', waitT: rr(0, 1400), dur: rr(560, 900),
      col: pick(pal.marks), w: cell * rr(0.24, 0.34), armK: rr(0.9, 1.0),
    });
  }
  window.$fxhashFeatures = { palette: pal.name, grid: N + '×' + N, crosses: count };
  if (typeof fxpreview === 'function') setTimeout(fxpreview, 300);
}

function startMove(tk) {
  const dirs = [];
  if (tk.gx > 0) dirs.push([-1, 0]);
  if (tk.gx < N - 1) dirs.push([1, 0]);
  if (tk.gy > 0) dirs.push([0, -1]);
  if (tk.gy < N - 1) dirs.push([0, 1]);
  const d = dirs[Math.floor(fxrand() * dirs.length)] || [0, 0];
  tk.cfx = tk.gx; tk.cfy = tk.gy; tk.ctx = tk.gx + d[0]; tk.cty = tk.gy + d[1]; tk.mdx = d[0]; tk.mdy = d[1];
  tk.t = 0; tk.dur = rr(640, 1000); tk.state = 'move';
}
function update(tk, dt) {
  if (tk.state === 'wait') { tk.waitT -= dt; if (tk.waitT <= 0) startMove(tk); }
  else { tk.t += dt / tk.dur; if (tk.t >= 1) { tk.t = 1; tk.gx = tk.ctx; tk.gy = tk.cty; tk.state = 'wait'; tk.waitT = rr(180, 1300); } }
}
// 水滴臂：沿 p→q 的二次貝茲，半徑「兩頭大、中間細」，堆疊圓形成平滑水滴
function blobArm(p, q, cxb, cyb, rH, rW) {
  const M = 18;
  for (let i = 0; i <= M; i++) {
    const s = i / M, u = 1 - s;
    const x = u * u * p[0] + 2 * u * s * cxb + s * s * q[0];
    const y = u * u * p[1] + 2 * u * s * cyb + s * s * q[1];
    const r = rW + (rH - rW) * Math.pow(Math.abs(2 * s - 1), 1.7);   // 兩端 rH、中間 rW
    circle(x, y, r * 2);
  }
}

function draw() {
  background(pal.bg);
  const dt = Math.min(50, deltaTime);

  // 底層點陣
  noStroke(); fill(pal.dot);
  const dotR = Math.max(1.4, cell * 0.13);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) circle(nodeX(i), nodeY(j), dotR * 2);

  // 叉叉：四個端點作為一個單位「流動」到相鄰格點
  for (const tk of tokens) update(tk, dt);
  strokeCap(ROUND); strokeJoin(ROUND);
  for (const tk of tokens) {
    const moving = tk.state === 'move', t = tk.t;
    const cfx = moving ? tk.cfx : tk.gx, cfy = moving ? tk.cfy : tk.gy;
    const cx2 = moving ? tk.ctx : tk.gx, cy2 = moving ? tk.cty : tk.gy;
    const md0 = moving ? tk.mdx : 0, md1 = moving ? tk.mdy : 0, k = tk.armK;
    // 四端點：前緣先流出、後緣拖後（squash & stretch）＋抵達 Q 彈
    const tips = [];
    for (let i = 0; i < 4; i++) {
      const ox = OFF[i][0] * k, oy = OFF[i][1] * k;
      let gxp, gyp;
      if (!moving) { gxp = tk.gx + ox; gyp = tk.gy + oy; }
      else {
        const lead = OFF[i][0] * md0 + OFF[i][1] * md1;      // +1 前緣 / -1 後緣
        const s0 = lead > 0 ? 0 : 0.34, s1 = lead > 0 ? 0.66 : 1;
        const e = easeOutBack(clamp01((t - s0) / (s1 - s0)));
        const fx = cfx + ox, fy = cfy + oy, gx2 = cx2 + ox, gy2 = cy2 + oy;
        gxp = fx + (gx2 - fx) * e; gyp = fy + (gy2 - fy) * e;
      }
      tips.push([nodeX(gxp), nodeY(gyp)]);
    }
    const flow = moving ? Math.sin(Math.PI * t) : 0;         // 流動強度（中途最大）
    const bx = md0 * cell * 0.34 * flow, by = md1 * cell * 0.34 * flow;
    const sizePulse = 1 - 0.3 * flow;                        // 溫和的水滴大小變化（不縮到不見）
    const rH = tk.w * 1.15 * sizePulse;                      // 水滴頭半徑（兩頭大）
    const rW = rH * 0.28;                                    // 中間細頸
    noStroke(); fill(tk.col);
    const c1x = (tips[0][0] + tips[3][0]) / 2 + bx, c1y = (tips[0][1] + tips[3][1]) / 2 + by;
    const c2x = (tips[1][0] + tips[2][0]) / 2 + bx, c2y = (tips[1][1] + tips[2][1]) / 2 + by;
    blobArm(tips[0], tips[3], c1x, c1y, rH, rW);             // TL–BR
    blobArm(tips[1], tips[2], c2x, c2y, rH, rW);             // TR–BL
    for (const p of tips) circle(p[0], p[1], rH * 2);        // 圓潤的四個水滴頭
  }
}

function mousePressed() { init(); }
function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('cross-drift', 'png');
  else init();
}
