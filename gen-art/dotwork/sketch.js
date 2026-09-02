// ============================================================
// Dotwork 圓點畫 — Generative Art (p5.js + fxhash)
// 以「大小不一、色彩鮮明的圓點/水彩斑點」堆出主體剪影：
//   1) 把剪影畫進離屏 buffer 並模糊 → 當作「密度圖」
//      （alpha 高處=核心密、羽化邊緣=漸疏，自然飛散）
//   2) 依密度做拒絕取樣灑點；noise 決定色塊區域，夾雜彩色雜點
//   3) 周圍再灑零星噴濺點（偏冷色），白紙底
//   fxhash 決定主體(貓/鳥/魚/蝴蝶/花/愛心) × 色盤 × 朝向
// ============================================================

const rr = (a, b) => a + fxrand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(fxrand() * a.length)];
const chance = p => fxrand() < p;
const TAU = Math.PI * 2;

const PW = 1040, PH = 820;
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// 鮮明色盤
const PALETTES = [
  { name: '彩虹', cols: ['#ff5a5f', '#ff9f1c', '#ffd23f', '#2ec4b6', '#4cc9f0', '#7b6cff', '#ff70a6', '#8ac926'] },
  { name: '暖陽', cols: ['#ff4d4d', '#ff7a1a', '#ffb703', '#ffd000', '#ff5da2', '#c1121f', '#fb8500', '#e85d04'] },
  { name: '糖果', cols: ['#ff70a6', '#ff9770', '#ffd670', '#70d6ff', '#7bdff2', '#b28dff', '#ff6b6b', '#8ac926'] },
  { name: '寶石', cols: ['#e63946', '#f4a261', '#2a9d8f', '#264a8f', '#e9c46a', '#8338ec', '#06d6a0', '#ef476f'] },
  { name: '春櫻', cols: ['#ff8fab', '#ffb3c6', '#fb6f92', '#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff'] },
];
const STRAY = ['#2ec4b6', '#4cc9f0', '#3a86ff', '#8ac926', '#57cc99', '#7b6cff', '#06d6a0'];
const SUBJECTS = ['cat', 'bird', 'fish', 'butterfly', 'flower', 'heart',
  'rabbit', 'owl', 'seahorse', 'whale', 'snail', 'peacock'];
const SUBJ_ZH = {
  cat: '貓', bird: '鳥', fish: '魚', butterfly: '蝴蝶', flower: '花', heart: '愛心',
  rabbit: '兔', owl: '貓頭鷹', seahorse: '海馬', whale: '鯨魚', snail: '蝸牛', peacock: '孔雀',
};

let P, subject, eye;

function setup() {
  createCanvas(PW, PH);
  pixelDensity(2);
  noLoop();
  generate();
}
function draw() {}
function mousePressed() { generate(); }
function keyPressed() { if (key === 'S' || key === 's') save('dotwork-' + (fxhash ? fxhash.slice(2, 10) : 'art') + '.png'); }

function generate() {
  P = pick(PALETTES);
  subject = pick(SUBJECTS);
  const flip = chance(0.5) ? 1 : -1;
  window.$fxhashFeatures = {
    '主體': SUBJ_ZH[subject], '色盤': P.name, '朝向': flip > 0 ? '右' : '左',
  };

  background(247, 245, 239);          // 白紙
  paperGrain();

  // ── 1) 剪影 → 密度圖（模糊少一點 → 輪廓更清楚）──
  const mask = createGraphics(PW, PH);
  mask.pixelDensity(1);
  mask.noStroke(); mask.fill(255);
  eye = drawSilhouette(mask, subject, flip);
  mask.filter(BLUR, ri(6, 10));
  mask.loadPixels();
  const MW = mask.width;
  const alphaAt = (x, y) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= PW || y >= PH) return 0;
    return mask.pixels[4 * (y * MW + x) + 3];
  };

  // ── 間距網格：圓點彼此靠近但大致不互蓋，間距「隨機」（佔位半徑隨機、窄）──
  const CELL = 38;
  const bins = new Map();
  const bkey = (gx, gy) => gx * 100000 + gy;
  const fits = (x, y, r) => {
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const arr = bins.get(bkey(gx + ox, gy + oy)); if (!arr) continue;
      for (const d of arr) { const dx = d.x - x, dy = d.y - y, mn = r + d.r; if (dx * dx + dy * dy < mn * mn) return false; }
    }
    return true;
  };
  const spaceR = s => s * rr(0.38, 0.5);   // 佔位半徑：隨機且較窄 → 間距隨機、不寬
  const addDot = (x, y, r) => {
    const k = bkey(Math.floor(x / CELL), Math.floor(y / CELL));
    let a = bins.get(k); if (!a) { a = []; bins.set(k, a); } a.push({ x, y, r });
  };

  // ── 2) 依密度灑主體圓點（大小落差大：內部大、邊緣小；且不重疊）──
  const baseDot = rr(7, 9.5);
  let placed = 0, tries = 0;
  const MAX = 70000;
  while (tries < MAX) {
    tries++;
    const x = rr(6, PW - 6), y = rr(6, PH - 6);
    const a = alphaAt(x, y) / 255;
    if (a <= 0.1) continue;
    if (fxrand() > Math.pow(a, 0.5)) continue;          // 密度 ∝ alpha
    let s = baseDot * (0.5 + 1.05 * a);                 // 內部大、邊緣小
    if (chance(0.10)) s *= rr(1.6, 2.3);                // 少數搶眼大圓
    else s *= rr(0.55, 1.0);
    const r = spaceR(s);                                // 隨機且較窄的間距
    if (!fits(x, y, r)) continue;
    addDot(x, y, r);
    let col;
    if (chance(0.24)) col = pick(P.cols);               // 鮮豔雜點
    else col = P.cols[Math.floor(noise(x * 0.006, y * 0.006) * P.cols.length * 1.15) % P.cols.length];
    dotBlob(x, y, s, col);
    placed++;
  }

  // ── 3) 周圍零星噴濺點（偏冷色、下方較多；同樣不重疊）──
  const sprays = ri(70, 120);
  for (let i = 0; i < sprays; i++) {
    const x = rr(30, PW - 30), y = rr(PH * 0.42, PH - 24);
    if (alphaAt(x, y) / 255 > 0.15 && chance(0.7)) continue;
    const s = baseDot * (chance(0.18) ? rr(1.3, 2.0) : rr(0.4, 0.95));
    const r = spaceR(s);
    if (!fits(x, y, r)) continue;
    addDot(x, y, r);
    dotBlob(x, y, s, chance(0.6) ? pick(STRAY) : pick(P.cols));
  }

  // 眼睛（深色點，畫最上層，保留；0~2 顆）
  for (const e of (eye || [])) {
    dotBlob(e.x, e.y, baseDot * 1.5, '#161022');
    dotBlob(e.x - baseDot * 0.32, e.y - baseDot * 0.32, baseDot * 0.5, '#ffffff');
  }
  mask.remove();

  if (window.fxpreview) { try { fxpreview(); } catch (e) {} }
}

// 水彩斑點（略不規則橢圓 + 偶爾深色核）
function dotBlob(x, y, s, colHex) {
  const c = hx(colHex);
  push(); translate(x, y); rotate(rr(0, TAU)); noStroke();
  fill(c[0], c[1], c[2], rr(175, 235));
  ellipse(0, 0, s * rr(0.85, 1.15), s * rr(0.7, 1.05));
  if (chance(0.16)) { fill(c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 190); ellipse(rr(-s * .15, s * .15), rr(-s * .15, s * .15), s * 0.42, s * 0.36); }
  pop();
}

function paperGrain() {
  noStroke();
  for (let i = 0; i < PW * PH * 0.004; i++) {
    const g = 225 + rr(-12, 12);
    fill(g, g, g - 4, 22);
    rect(rr(0, PW), rr(0, PH), 1.4, 1.4);
  }
}

// ── 剪影（填白於 mask；回傳眼睛座標陣列 0~2 顆）──
function drawSilhouette(g, kind, flip) {
  const cx = PW * 0.5 + rr(-40, 40), cy = PH * 0.52 + rr(-30, 30);
  const S = Math.min(PW, PH) * rr(0.42, 0.5);
  g.push(); g.translate(cx, cy); g.scale(flip, 1);
  const el = (x, y, w, h) => g.ellipse(x, y, w, h);
  const tri = (a, b, c, d, e, f) => g.triangle(a, b, c, d, e, f);
  const E = (lx, ly) => ({ x: cx + flip * lx, y: cy + ly });   // 眼睛（換算 flip 到畫布座標）
  let eyes = [];
  if (kind === 'cat') {
    el(0, S * 0.28, S * 0.72, S * 0.92); el(S * 0.62, S * 0.05, S * 0.66, S * 0.78);
    el(0, -S * 0.34, S * 0.56, S * 0.52);
    tri(-S * 0.22, -S * 0.5, -S * 0.05, -S * 0.5, -S * 0.16, -S * 0.78);
    tri(S * 0.22, -S * 0.5, S * 0.05, -S * 0.5, S * 0.16, -S * 0.78);
    eyes = [E(-S * 0.12, -S * 0.34)];
  } else if (kind === 'bird') {
    el(0, 0, S * 0.9, S * 0.62); el(-S * 0.5, -S * 0.22, S * 0.42, S * 0.42);
    tri(-S * 0.7, -S * 0.22, -S * 0.5, -S * 0.32, -S * 0.5, -S * 0.12);
    tri(S * 0.35, -S * 0.05, S * 0.78, -S * 0.35, S * 0.72, S * 0.2);
    el(S * 0.02, S * 0.02, S * 0.5, S * 0.34);
    eyes = [E(-S * 0.5, -S * 0.26)];
  } else if (kind === 'fish') {
    el(0, 0, S * 1.05, S * 0.6);
    tri(S * 0.45, 0, S * 0.85, -S * 0.32, S * 0.85, S * 0.32);
    tri(-S * 0.1, -S * 0.28, S * 0.15, -S * 0.28, 0, -S * 0.5);
    eyes = [E(-S * 0.32, -S * 0.06)];
  } else if (kind === 'butterfly') {
    el(-S * 0.28, -S * 0.24, S * 0.56, S * 0.6); el(S * 0.28, -S * 0.24, S * 0.56, S * 0.6);
    el(-S * 0.24, S * 0.28, S * 0.46, S * 0.5); el(S * 0.24, S * 0.28, S * 0.46, S * 0.5);
    el(0, 0, S * 0.12, S * 0.9);
  } else if (kind === 'flower') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; el(Math.cos(a) * S * 0.42, Math.sin(a) * S * 0.42, S * 0.44, S * 0.44); }
    el(0, 0, S * 0.5, S * 0.5);
  } else if (kind === 'rabbit') {
    el(0, S * 0.3, S * 0.6, S * 0.82); el(-S * 0.42, S * 0.52, S * 0.22, S * 0.22);
    el(0, -S * 0.26, S * 0.44, S * 0.5);
    el(-S * 0.15, -S * 0.78, S * 0.17, S * 0.62); el(S * 0.15, -S * 0.78, S * 0.17, S * 0.62);
    eyes = [E(-S * 0.12, -S * 0.28)];
  } else if (kind === 'owl') {
    el(0, S * 0.05, S * 0.86, S * 1.05);
    tri(-S * 0.4, -S * 0.42, -S * 0.12, -S * 0.42, -S * 0.28, -S * 0.74);
    tri(S * 0.4, -S * 0.42, S * 0.12, -S * 0.42, S * 0.28, -S * 0.74);
    eyes = [E(-S * 0.22, -S * 0.2), E(S * 0.22, -S * 0.2)];
  } else if (kind === 'whale') {
    el(0, 0, S * 1.15, S * 0.62);
    tri(S * 0.5, 0, S * 0.9, -S * 0.3, S * 0.62, 0); tri(S * 0.5, 0, S * 0.9, S * 0.3, S * 0.62, 0);
    el(-S * 0.2, S * 0.26, S * 0.5, S * 0.22);
    eyes = [E(-S * 0.42, -S * 0.06)];
  } else if (kind === 'snail') {
    for (let i = 0; i <= 44; i++) {                 // 螺旋殼
      const t = i / 44, ang = t * 2.4 * TAU, rad = S * 0.5 * (1 - t * 0.86), d = S * 0.5 * (0.28 + 0.72 * (1 - t));
      el(S * 0.28 + Math.cos(ang) * rad, -S * 0.02 + Math.sin(ang) * rad, d * 0.55, d * 0.55);
    }
    el(-S * 0.45, S * 0.22, S * 0.72, S * 0.34); el(-S * 0.8, S * 0.02, S * 0.28, S * 0.32);
    el(-S * 0.88, -S * 0.28, S * 0.07, S * 0.3); el(-S * 0.74, -S * 0.3, S * 0.07, S * 0.3);
    eyes = [E(-S * 0.82, -S * 0.05)];
  } else if (kind === 'seahorse') {
    for (let i = 0; i <= 11; i++) {                 // 身（S 曲線）
      const t = i / 11, px = Math.sin(t * Math.PI * 1.05) * S * 0.26, py = -S * 0.48 + t * S * 0.8, d = S * (0.44 - 0.2 * t);
      el(px, py, d, d);
    }
    el(-S * 0.06, -S * 0.5, S * 0.4, S * 0.36);      // 頭
    tri(-S * 0.24, -S * 0.54, -S * 0.02, -S * 0.5, -S * 0.06, -S * 0.4); // 吻
    el(S * 0.05, -S * 0.66, S * 0.14, S * 0.22);     // 冠
    for (let i = 0; i <= 16; i++) {                  // 螺旋尾
      const t = i / 16, ang = t * 2.3 * TAU, rad = S * 0.2 * (1 - t * 0.88), d = S * 0.22 * (1 - t) + 6;
      el(Math.cos(ang) * rad, S * 0.32 + Math.sin(ang) * rad, d, d);
    }
    eyes = [E(-S * 0.06, -S * 0.5)];
  } else if (kind === 'peacock') {
    el(S * 0.3, S * 0.06, S * 1.25, S * 1.15);       // 尾屏（主角）
    el(-S * 0.4, S * 0.12, S * 0.42, S * 0.62);      // 身
    for (let i = 0; i <= 5; i++) el(-S * 0.4 - i * S * 0.03, S * 0.02 - i * S * 0.1, S * 0.2, S * 0.2); // 頸
    el(-S * 0.56, -S * 0.56, S * 0.3, S * 0.3);      // 頭
    for (let i = 0; i < 3; i++) el(-S * 0.56 + (i - 1) * S * 0.07, -S * 0.82, S * 0.05, S * 0.18);      // 冠羽
    eyes = [E(-S * 0.6, -S * 0.58)];
  } else { // heart
    g.beginShape();
    g.vertex(0, S * 0.5);
    g.bezierVertex(-S * 0.9, -S * 0.1, -S * 0.4, -S * 0.66, 0, -S * 0.2);
    g.bezierVertex(S * 0.4, -S * 0.66, S * 0.9, -S * 0.1, 0, S * 0.5);
    g.endShape(CLOSE);
  }
  g.pop();
  return eyes;
}
