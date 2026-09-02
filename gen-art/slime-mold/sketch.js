// ==========================================
// Slime Mold 黏菌 — Generative Art
// 真實 Physarum polycephalum 形態：agent-based 覓食模擬
//   數萬 agent 感測費洛蒙 → 轉向 → 移動 → 沉積，自組織出
//   「degree-3 節點的網狀脈管」（大量迴路/吻合）＋ 扇形覓食前緣
//   成功脈管變粗、失敗縮退；菌落自中心向外擴張
// 參考真實黏菌照片：細脈網狀、黃色原生質、扇形推進邊緣
// ==========================================

const W = 760, H = 580;
let canvas, ctx, img, trail, trailNext, agents;
let tone, running = true, frame = 0;
let cx = W / 2, cy = H / 2, growR = 0, growMargin = 0, seedX = 0, seedY = 0, maxR = 0;
let foods = [];

const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;

// 真實黏菌配色（黃色為主，含變異株）
const TONES = [
  { name: '經典黃', bg: [10, 8, 5],  ramp: [[10,8,5],[70,40,8],[150,96,14],[224,168,36],[255,232,150]] },
  { name: '橙紅',   bg: [12, 6, 5],  ramp: [[12,6,5],[80,30,12],[168,70,20],[232,130,44],[255,214,150]] },
  { name: '白化',   bg: [8, 9, 10],  ramp: [[8,9,10],[46,50,54],[110,116,120],[186,192,196],[248,250,252]] },
  { name: '螢光青', bg: [4, 11, 12], ramp: [[4,11,12],[10,64,68],[24,140,140],[80,214,206],[200,255,246]] },
];

const P = { SD: 9, SA: 0.55, TA: 0.52, spd: 1.0, dep: 5.0, decay: 0.90 };

function idx(x, y) { return y * W + x; }

function generate() {
  tone = pick(TONES);
  trail = new Float32Array(W * H);
  trailNext = new Float32Array(W * H);
  cx = W / 2; cy = H / 2;
  maxR = Math.min(W, H) * 0.47;
  // 接種點：偏離中心亦可
  const sa = rr(0, TAU), sd = rr(0, maxR * 0.35);
  seedX = cx + Math.cos(sa) * sd; seedY = cy + Math.sin(sa) * sd;
  growR = Math.min(W, H) * 0.06;
  growMargin = Math.min(W, H) * 0.07;

  // 食物源（脈管會連向它們 → 主幹）
  foods = [];
  const nf = ri(4, 8);
  for (let i = 0; i < nf; i++) {
    const a = rr(0, TAU), d = rr(maxR * 0.3, maxR * 0.92);
    foods.push({ x: seedX + Math.cos(a) * d, y: seedY + Math.sin(a) * d, r: rr(5, 9) });
  }

  // agents：初期全在接種點小菌落
  const N = Math.floor(W * H * 0.11);
  agents = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = rr(0, TAU), d = growR * Math.sqrt(Math.random());
    agents[i*3] = seedX + Math.cos(a) * d;
    agents[i*3+1] = seedY + Math.sin(a) * d;
    agents[i*3+2] = rr(0, TAU);
  }
  frame = 0;
  document.getElementById('label').textContent = `Physarum polycephalum ・ ${tone.name}`;
}

function senseAt(x, y) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 1 || ix >= W - 1 || iy < 1 || iy >= H - 1) return -1e6;
  return trail[idx(ix, iy)];
}

function stepAgents() {
  const n = agents.length / 3;
  const { SD, SA, TA, spd, dep } = P;
  const bound = Math.min(growR + growMargin, maxR);
  const b2 = bound * bound;
  for (let i = 0; i < n; i++) {
    const bi = i * 3;
    let x = agents[bi], y = agents[bi+1], h = agents[bi+2];
    const fc = senseAt(x + Math.cos(h) * SD, y + Math.sin(h) * SD);
    const fl = senseAt(x + Math.cos(h - SA) * SD, y + Math.sin(h - SA) * SD);
    const fr = senseAt(x + Math.cos(h + SA) * SD, y + Math.sin(h + SA) * SD);
    if (fc >= fl && fc >= fr) { /* 直行 */ }
    else if (fc < fl && fc < fr) h += (Math.random() < 0.5 ? -1 : 1) * TA;
    else if (fl < fr) h += TA;
    else if (fr < fl) h -= TA;

    let nx = x + Math.cos(h) * spd, ny = y + Math.sin(h) * spd;
    // 前緣邊界反彈（距接種點）→ 扇形推進
    const sdx = nx - seedX, sdy = ny - seedY;
    if (sdx * sdx + sdy * sdy > b2) { h = Math.atan2(seedY - y, seedX - x) + rr(-0.6, 0.6); nx = x + Math.cos(h) * spd; ny = y + Math.sin(h) * spd; }
    // 汰換：少量重生於已生長區 → 抵銷過度合脈，維持網狀
    if (Math.random() < 0.004) { const a = rr(0, TAU), d = Math.min(growR, maxR) * Math.sqrt(Math.random()); nx = seedX + Math.cos(a) * d; ny = seedY + Math.sin(a) * d; h = rr(0, TAU); }
    agents[bi] = nx; agents[bi+1] = ny; agents[bi+2] = h;
    const ix = Math.round(nx), iy = Math.round(ny);
    if (ix >= 0 && ix < W && iy >= 0 && iy < H) trail[idx(ix, iy)] += dep;
  }
}

function feedFood() {
  for (const f of foods) {
    const fd = Math.hypot(f.x - seedX, f.y - seedY);
    if (fd > growR + f.r + 6) continue;
    const r = Math.ceil(f.r);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx*dx + dy*dy > f.r*f.r) continue;
      const ix = Math.round(f.x + dx), iy = Math.round(f.y + dy);
      if (ix >= 1 && ix < W-1 && iy >= 1 && iy < H-1) trail[idx(ix, iy)] += 0.9;
    }
  }
}

// 擴散（中心加權保持細脈）+ 衰減
function diffuseDecay() {
  const next = trailNext;
  const dc = P.decay, cw = 0.66, ew = (1 - cw) / 8;
  next.fill(0);
  for (let y = 1; y < H - 1; y++) {
    let row = y * W;
    for (let x = 1; x < W - 1; x++) {
      const c = row + x;
      let s = trail[c] * cw;
      s += (trail[c-W-1] + trail[c-W] + trail[c-W+1]
          + trail[c-1]              + trail[c+1]
          + trail[c+W-1] + trail[c+W] + trail[c+W+1]) * ew;
      next[c] = s * dc;
    }
  }
  const t = trail; trail = next; trailNext = t;   // 交換緩衝，免每幀配置
}

// 菌落擴張：邊界追隨菌絲填充度（非勻速）
function growColony() {
  if (growR >= maxR) return;
  const rInner = Math.max(2, growR - 4);
  const nS = Math.max(24, (growR * 1.2) | 0);
  let inD = 0, filled = 0;
  for (let s = 0; s < nS; s++) {
    const a = (s / nS) * TAU;
    const px = seedX + Math.cos(a) * rInner, py = seedY + Math.sin(a) * rInner;
    if (Math.hypot(px - cx, py - cy) > maxR) continue;
    inD++;
    const ix = Math.round(px), iy = Math.round(py);
    if (ix >= 0 && ix < W && iy >= 0 && iy < H && trail[idx(ix, iy)] > 0.4) filled++;
  }
  if (inD === 0) { growR = Math.min(maxR, growR + 1.0); return; }
  const frac = filled / inD;
  if (frac > 0.3) growR = Math.min(maxR, growR + 0.35 + frac * 1.1);
}

// ── 渲染 ──
function rampColor(nv) {
  const r = tone.ramp, seg = Math.max(0, Math.min(1, nv)) * (r.length - 1);
  const i = Math.min(r.length - 2, Math.floor(seg)), f = seg - i;
  const a = r[i], b = r[i + 1];
  return [a[0] + (b[0]-a[0])*f, a[1] + (b[1]-a[1])*f, a[2] + (b[2]-a[2])*f];
}

function render() {
  const d = img.data;
  for (let i = 0; i < W * H; i++) {
    const v = trail[i];
    const nv = v / (v + 4.5);   // 平滑 tone map，細脈與探索霧皆可見
    const c = rampColor(nv);
    const p = i * 4;
    d[p] = c[0]; d[p+1] = c[1]; d[p+2] = c[2]; d[p+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ── 迴圈 ──
function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  const steps = frame < 120 ? 2 : 1;
  for (let s = 0; s < steps; s++) {
    growColony(); feedFood(); stepAgents(); diffuseDecay(); frame++;
  }
  render();
}

function fit() {
  const ratio = W / H;
  const sz = Math.min(window.innerWidth * 0.94, window.innerHeight * 0.9);
  const w = Math.min(sz, sz * ratio);
  canvas.style.width = w + 'px'; canvas.style.height = (w / ratio) + 'px';
}

function init() {
  canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  document.getElementById('holder').appendChild(canvas);
  ctx = canvas.getContext('2d');
  img = ctx.createImageData(W, H);
  fit(); generate();
  requestAnimationFrame(loop);
  window.addEventListener('resize', fit);
  document.getElementById('holder').addEventListener('click', generate);
  window.addEventListener('keydown', e => {
    if (e.key === ' ') { running = !running; e.preventDefault(); }
    if (e.key === 'r' || e.key === 'R') generate();
    if (e.key === 's' || e.key === 'S') {
      const a = document.createElement('a');
      a.download = 'slime-mold-' + Date.now() + '.png';
      a.href = canvas.toDataURL('image/png'); a.click();
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
