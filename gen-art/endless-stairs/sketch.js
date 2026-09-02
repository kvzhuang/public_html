// ==========================================
// Endless Stairs 無盡階梯 — Generative Art
// Escher 式等軸測不可能建築：
//   模組庫（立方體/階梯/疊層金字塔/拱門/圓孔/高塔）
//   鋪滿畫面 + 緞帶路徑隨機遊走（深度歧義轉折）
// 三種色調：素描 / 霓虹夜 / 復古印刷
// ==========================================

const PW = 800, PH = 1200;
let canvas, ctx;

const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ── 等軸測投影 ──
let S = 24;                                  // 單位格徑（每次生成隨機）
const ISO = Math.PI / 6;
let UX, UY;
function calcIso() { UX = Math.cos(ISO) * S; UY = Math.sin(ISO) * S; }
let camX = 0, camY = 0;
function P(x, y, z) {
  return { x: camX + (x - y) * UX, y: camY + (x + y) * UY - z * S };
}

// ── 色調 ──
const TONES = [
  {
    name: '素描', key: 'sketch',
    bg: '#C8C8C6', border: '#3E3E3C',
    top: '#C5C5C3', right: '#C5C5C3', left: '#C5C5C3',
    line: '#4A4A48', lineW: 1.3,
    ribbonTop: '#3E3E3C', ribbonSide: '#2E2E2C',
    windows: false, blackShadow: false,
  },
  {
    name: '霓虹夜', key: 'night',
    bg: '#14161F', border: '#0A0B12',
    top: '#2A3145', right: '#1F2536', left: '#181D2B',
    line: '#0D0F18', lineW: 1.2,
    ribbonTop: '#5BD3E8', ribbonSide: '#2E93A8',
    windows: true, blackShadow: false,
  },
  {
    name: '復古印刷', key: 'vintage',
    bg: '#E9E0C9', border: '#2E2C26',
    top: '#E4DBC2', right: '#E4DBC2', left: '#33312B',
    line: '#33312B', lineW: 1.4,
    ribbonTop: '#A9CBD9', ribbonSide: '#7FA9BC',
    windows: false, blackShadow: true,
  },
];
let tone;
let toneIdx = -1;

// ── 多邊形工具 ──
function poly(pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = tone.lineW; ctx.stroke(); }
}

// ── 基礎積木 ──
function faceTop(x, y, z, a, b, col) {
  poly([P(x, y, z), P(x + a, y, z), P(x + a, y + b, z), P(x, y + b, z)], col, tone.line);
}
function faceRight(x, y, z, a, b, h, col) {   // x+a 側（朝右下）
  poly([P(x + a, y, z), P(x + a, y + b, z), P(x + a, y + b, z - h), P(x + a, y, z - h)], col, tone.line);
}
function faceLeft(x, y, z, a, b, h, col) {    // y+b 側（朝左下）
  poly([P(x, y + b, z), P(x + a, y + b, z), P(x + a, y + b, z - h), P(x, y + b, z - h)], col, tone.line);
}

function cuboid(x, y, z, a, b, h, opts) {
  const o = opts || {};
  faceLeft(x, y, z, a, b, h, o.left || tone.left);
  faceRight(x, y, z, a, b, h, o.right || tone.right);
  faceTop(x, y, z, a, b, o.top || tone.top);
  if (o.arch) drawArch(x, y, z, a, b, h, o.arch);
  if (o.hole) drawHole(x, y, z, a, b);
  if (o.window && tone.windows && Math.random() < 0.28) drawWindow(x, y, z, a, b, h);
}

// 拱門（畫在側面）
function drawArch(x, y, z, a, b, h, side) {
  const aw = Math.min(a, b) * 0.42, ah = h * 0.55;
  const col = tone.blackShadow ? '#1C1B17' : shade(tone.bg, -0.35);
  const pts = [];
  if (side === 'right') {
    const v0 = y + b * 0.5 - aw / 2;
    pts.push(P(x + a, v0, z - h), P(x + a, v0, z - h + ah * 0.6));
    for (let t = 0; t <= 1; t += 0.14) {
      const th = Math.PI * (1 - t);
      pts.push(P(x + a, v0 + aw / 2 + Math.cos(th) * aw / 2, z - h + ah * 0.6 + Math.sin(th) * ah * 0.4));
    }
    pts.push(P(x + a, v0 + aw, z - h + ah * 0.6), P(x + a, v0 + aw, z - h));
  } else {
    const u0 = x + a * 0.5 - aw / 2;
    pts.push(P(u0, y + b, z - h), P(u0, y + b, z - h + ah * 0.6));
    for (let t = 0; t <= 1; t += 0.14) {
      const th = Math.PI * (1 - t);
      pts.push(P(u0 + aw / 2 + Math.cos(th) * aw / 2, y + b, z - h + ah * 0.6 + Math.sin(th) * ah * 0.4));
    }
    pts.push(P(u0 + aw, y + b, z - h + ah * 0.6), P(u0 + aw, y + b, z - h));
  }
  poly(pts, col, tone.line);
}

// 圓孔（頂面橢圓）
function drawHole(x, y, z, a, b) {
  const cx2 = x + a / 2, cy2 = y + b / 2, r = Math.min(a, b) * 0.28;
  const col = tone.blackShadow ? '#1C1B17' : shade(tone.bg, -0.3);
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 2 + 0.1; t += 0.22) {
    const px = cx2 + Math.cos(t) * r, py = cy2 + Math.sin(t) * r;
    const sp = P(px, py, z);
    if (t === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
  }
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = tone.line; ctx.lineWidth = tone.lineW; ctx.stroke();
}

// 夜景窗燈
function drawWindow(x, y, z, a, b, h) {
  const side = Math.random() < 0.5 ? 'right' : 'left';
  const wz = z - h * rr(0.3, 0.7);
  ctx.fillStyle = '#F2EFDD';
  const w = 0.16, hh = 0.26;
  let pts;
  if (side === 'right') {
    const v0 = y + rr(0.2, b - 0.4);
    pts = [P(x + a, v0, wz), P(x + a, v0 + w * 2, wz), P(x + a, v0 + w * 2, wz - hh), P(x + a, v0, wz - hh)];
  } else {
    const u0 = x + rr(0.2, a - 0.4);
    pts = [P(u0, y + b, wz), P(u0 + w * 2, y + b, wz), P(u0 + w * 2, y + b, wz - hh), P(u0, y + b, wz - hh)];
  }
  poly(pts, '#F2EFDD', null);
}

function shade(hex, t) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(t > 0 ? c + (255 - c) * t : c * (1 + t))));
  return `rgb(${f(r)},${f(g)},${f(bl)})`;
}

// ── 模組 ──
// 階梯：沿 +x 或 +y 上升
function stairs(x, y, z, dir, n, w) {
  for (let k = 0; k < n; k++) {
    const sz = z + (k + 1) * 0.5;
    if (dir === 'x') cuboid(x + k, y, sz, 1, w, (k + 1) * 0.5 + 0.001);
    else cuboid(x, y + k, sz, w, 1, (k + 1) * 0.5 + 0.001);
  }
}

// 疊層金字塔
function ziggurat(x, y, z, base, levels) {
  for (let k = 0; k < levels; k++) {
    const sz = base - k * (base / (levels + 0.5));
    const off = (base - sz) / 2;
    cuboid(x + off, y + off, z + (k + 1) * 0.55, sz, sz, 0.55);
  }
}

// 高塔
function tower(x, y, z, a, b, h) {
  cuboid(x, y, z + h, a, b, h, { window: true, arch: Math.random() < 0.35 ? pick(['right', 'left']) : null });
  if (Math.random() < 0.4) cuboid(x + a * 0.25, y + b * 0.25, z + h + 0.7, a * 0.5, b * 0.5, 0.7);
}

// ── 場景生成 ──
let modules = [];   // {sum, draw}

function genField() {
  modules = [];
  const N = 26;                        // 對角掃描範圍（需覆蓋整張直式畫布）
  const cell = 3.1;
  for (let j = -N; j <= N; j++) {
    for (let i = -N; i <= N; i++) {
      const gx = i * cell, gy = j * cell;
      // 檢查投影是否在畫布附近
      const c = P(gx, gy, 0);
      if (c.x < -S * 4 || c.x > PW + S * 4 || c.y < -S * 6 || c.y > PH + S * 6) continue;
      const h = Math.floor(rr(0, 4)) * 0.8;   // 基準高度變化
      const roll = Math.random();
      const sum = i + j;
      if (roll < 0.34) {
        // 階梯（主題，最高頻率）
        const dir = Math.random() < 0.5 ? 'x' : 'y';
        const n = ri(3, 6), w = rr(1.2, 2.2);
        modules.push({ sum, draw: () => stairs(gx, gy, h, dir, n, w) });
      } else if (roll < 0.56) {
        const a = rr(2, 3.2), b = rr(2, 3.2), hh = rr(1, 2.6);
        const opts = {};
        if (Math.random() < 0.3) opts.arch = pick(['right', 'left']);
        if (Math.random() < 0.22) opts.hole = 1;
        opts.window = true;
        modules.push({ sum, draw: () => cuboid(gx, gy, h + hh, a, b, hh, opts) });
      } else if (roll < 0.72) {
        modules.push({ sum, draw: () => ziggurat(gx, gy, h, rr(2.4, 3.4), ri(3, 4)) });
      } else if (roll < 0.9) {
        modules.push({ sum, draw: () => tower(gx, gy, h, rr(1.6, 2.4), rr(1.6, 2.4), rr(1.6, 3)) });
      } else {
        // 平台 + 小樓梯組合
        const a = rr(2.6, 3.4);
        modules.push({ sum, draw: () => {
          cuboid(gx, gy, h + 0.6, a, a, 0.6, { hole: Math.random() < 0.3 ? 1 : 0 });
          stairs(gx + a * 0.2, gy + a * 0.55, h + 0.6, 'x', 3, 1.1);
        } });
      }
    }
  }
  // painter's algorithm：i+j 小（遠）先畫
  modules.sort((m1, m2) => m1.sum - m2.sum);
  for (const m of modules) m.draw();
}

// ── 緞帶路徑（隨機遊走 + 垂直落差）──
function genRibbons() {
  const K = ri(4, 6);
  const w = 0.55;
  for (let k = 0; k < K; k++) {
    // 用螢幕座標反推等軸測起點，保證緞帶落在畫面內
    const sx = rr(PW * 0.18, PW * 0.82);
    const sy = rr(PH * 0.14, PH * 0.7);
    const z0 = rr(4, 7);
    const dxy = (sx - camX) / UX;           // x - y
    const sxy = (sy - camY + z0 * S) / UY;  // x + y
    let x = (sxy + dxy) / 2, y = (sxy - dxy) / 2, z = z0;
    const steps = ri(6, 11);
    for (let st = 0; st < steps; st++) {
      const mode = Math.random();
      if (mode < 0.42) {
        // 頂面水平段（沿 x 或 y）
        const len = rr(1.2, 3);
        if (Math.random() < 0.5) {
          poly([P(x, y, z), P(x + len, y, z), P(x + len, y + w, z), P(x, y + w, z)], tone.ribbonTop, tone.line);
          x += len;
        } else {
          poly([P(x, y, z), P(x + w, y, z), P(x + w, y + len, z), P(x, y + len, z)], tone.ribbonTop, tone.line);
          y += len;
        }
      } else if (mode < 0.78) {
        // 垂直下落段（貼側面）——上下端交接處故意用頂面色，深度歧義
        const d = rr(1, 2.6);
        if (Math.random() < 0.5) {
          poly([P(x, y, z), P(x, y + w, z), P(x, y + w, z - d), P(x, y, z - d)], tone.ribbonSide, tone.line);
        } else {
          poly([P(x, y, z), P(x + w, y, z), P(x + w, y, z - d), P(x, y, z - d)], tone.ribbonSide, tone.line);
        }
        z -= d;
      } else {
        // 階梯式小折返（連續短段）
        for (let q = 0; q < 3; q++) {
          poly([P(x, y, z), P(x + 0.7, y, z), P(x + 0.7, y + w, z), P(x, y + w, z)], tone.ribbonTop, tone.line);
          x += 0.7;
          poly([P(x, y, z), P(x, y + w, z), P(x, y + w, z + 0.45), P(x, y, z + 0.45)], tone.ribbonSide, tone.line);
          z += 0.45;
        }
      }
      // 邊界防護
      const sp = P(x, y, z);
      if (sp.x < S * 2 || sp.x > PW - S * 2 || sp.y < S * 3 || sp.y > PH - S * 3) break;
    }
  }
}

// ── 主生成 ──
function generate(forceTone) {
  if (forceTone !== undefined) toneIdx = forceTone;
  else toneIdx = (Math.random() < 0.34 ? 0 : Math.random() < 0.5 ? 1 : 2);
  tone = TONES[toneIdx];
  S = rr(20, 30); calcIso();
  camX = PW / 2 + rr(-40, 40);
  camY = -rr(60, 160);

  ctx.fillStyle = tone.border;
  ctx.fillRect(0, 0, PW, PH);
  ctx.fillStyle = tone.bg;
  ctx.fillRect(14, 14, PW - 28, PH - 28);
  ctx.save();
  ctx.beginPath();
  ctx.rect(14, 14, PW - 28, PH - 28);
  ctx.clip();

  genField();
  genRibbons();

  ctx.restore();
  // 內框
  ctx.strokeStyle = tone.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, PW - 28, PH - 28);
  console.log('tone:', tone.name, 'S:', S.toFixed(1));
}

// ── 初始化 ──
function fitCanvas() {
  const ratio = PW / PH;
  const dw = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.92 * ratio);
  canvas.style.width = dw + 'px';
  canvas.style.height = (dw / ratio) + 'px';
}

function init() {
  canvas = document.createElement('canvas');
  canvas.width = PW; canvas.height = PH;
  document.getElementById('holder').appendChild(canvas);
  ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round';
  fitCanvas();
  generate();

  canvas.addEventListener('click', () => generate());
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('keydown', e => {
    if (e.key === 's' || e.key === 'S') {
      const a = document.createElement('a');
      a.download = 'endless-stairs-' + Date.now() + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    if (e.key === 'r' || e.key === 'R') generate();
    if (e.key === 't' || e.key === 'T') generate((toneIdx + 1) % TONES.length);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
