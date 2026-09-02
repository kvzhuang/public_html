// ============================================================
// Neon Street 夜の街 — Generative Art (three.js)
// 第一人稱無限穿梭日本夜晚街道：
//   兩側程序生成窄樓 + 正對鏡頭的直式霓虹袖看板、紅提灯、
//   自動販賣機、頭頂糾纏電線、濕路面霓虹倒影，霧氣 + bloom 輝光。
//   街道以 segment 環形回收（純 z 位移）達成無限延伸、零運行期配置。
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── 亂數工具 ──
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clampSteer = v => Math.max(-MAXSTEER, Math.min(MAXSTEER, v));

// ── 場景（時段 × 天氣）──
// sun: 方向光(白天/夕陽用)；emiScale: 窗/招牌自發光倍率(白天調暗)；
// signBright: 霓虹面板亮度；wet: 路面倒影強度；head: 車頭燈強度；rain: 是否下雨
const TONES = [
  { name: '霓虹夜', sky: '#0a0714', fog: 0x0c0a1a, fogDens: 0.013, hemiSky: 0x24304a, hemiGnd: 0x0a0810, hemiInt: 0.5,
    sun: 0x000000, sunInt: 0, sunPos: [30, 60, -30], head: 22, bloom: 1.15, emiScale: 1.0, signBright: 1.0, wet: 1.0, exposure: 1.0, rain: false },
  { name: '紫煙', sky: '#100616', fog: 0x140a1e, fogDens: 0.012, hemiSky: 0x342444, hemiGnd: 0x0c0612, hemiInt: 0.5,
    sun: 0x000000, sunInt: 0, sunPos: [30, 60, -30], head: 22, bloom: 1.2, emiScale: 1.0, signBright: 1.0, wet: 1.0, exposure: 1.0, rain: false },
  { name: '夜雨', sky: '#0a0d16', fog: 0x0b1018, fogDens: 0.02, hemiSky: 0x2a3648, hemiGnd: 0x0a0e14, hemiInt: 0.5,
    sun: 0x000000, sunInt: 0, sunPos: [30, 60, -30], head: 24, bloom: 1.3, emiScale: 1.0, signBright: 1.0, wet: 1.7, exposure: 1.0, rain: true },
  { name: '夕暮れ', sky: '#e08a4a', fog: 0xd07a3e, fogDens: 0.011, hemiSky: 0xffb070, hemiGnd: 0x3a2418, hemiInt: 1.0,
    sun: 0xffb066, sunInt: 2.3, sunPos: [-55, 34, -72], head: 4, bloom: 0.55, emiScale: 0.5, signBright: 0.9, wet: 0.6, exposure: 1.0, rain: false },
  { name: '快晴', sky: '#8fbce6', fog: 0xaecbe6, fogDens: 0.0075, hemiSky: 0xa8caee, hemiGnd: 0x4a4438, hemiInt: 1.35,
    sun: 0xfff2d8, sunInt: 3.0, sunPos: [50, 85, -40], head: 0, bloom: 0.32, emiScale: 0.18, signBright: 0.78, wet: 0.35, exposure: 1.05, rain: false },
  { name: '曇り雨', sky: '#707680', fog: 0x767c86, fogDens: 0.019, hemiSky: 0x9098a6, hemiGnd: 0x3a3e46, hemiInt: 1.1,
    sun: 0xb4bcc6, sunInt: 0.6, sunPos: [20, 60, -50], head: 6, bloom: 0.5, emiScale: 0.55, signBright: 0.95, wet: 1.5, exposure: 0.95, rain: true },
];
// 霓虹色盤
const NEON = ['#ff2d6a', '#ff5a1e', '#ffd21a', '#26ffd0', '#2aa8ff', '#c04dff', '#ff2ad0', '#4dff72', '#ff8a1a'];
// 招牌用字（直式單欄堆疊 / 橫式）
// 分類店家（各類專屬招牌色 + 小圖示）
const SHOPS = [
  // 藥局
  { w: '薬', c: 'pharm' }, { w: '薬局', c: 'pharm' }, { w: 'ドラッグ', c: 'pharm' }, { w: '調剤薬局', c: 'pharm' },
  // 咖啡 / 喫茶
  { w: '珈琲', c: 'cafe' }, { w: 'カフェ', c: 'cafe' }, { w: '喫茶店', c: 'cafe' }, { w: '珈琲店', c: 'cafe' }, { w: 'コーヒー', c: 'cafe' },
  // 拉麵 / 麵食
  { w: 'ラーメン', c: 'noodle' }, { w: 'つけ麺', c: 'noodle' }, { w: 'そば', c: 'noodle' }, { w: 'うどん', c: 'noodle' }, { w: '油そば', c: 'noodle' },
  // 飯食 / 定食
  { w: '定食', c: 'meal' }, { w: '牛丼', c: 'meal' }, { w: 'カレー', c: 'meal' }, { w: '洋食', c: 'meal' }, { w: '弁当', c: 'meal' }, { w: '中華', c: 'meal' },
  // 燒烤 / 居酒屋
  { w: '焼き鳥', c: 'izakaya' }, { w: '焼肉', c: 'izakaya' }, { w: '居酒屋', c: 'izakaya' }, { w: '酒場', c: 'izakaya' }, { w: '炉端', c: 'izakaya' }, { w: '串カツ', c: 'izakaya' },
  // 粉物 / 小吃
  { w: 'たこ焼', c: 'snack' }, { w: 'お好み焼', c: 'snack' }, { w: '餃子', c: 'snack' }, { w: 'おでん', c: 'snack' }, { w: '天ぷら', c: 'snack' }, { w: 'から揚げ', c: 'snack' },
  // 壽司 / 和食
  { w: '寿司', c: 'sushi' }, { w: '鮨', c: 'sushi' }, { w: '回転寿司', c: 'sushi' }, { w: '刺身', c: 'sushi' },
  // 甜點 / 麵包
  { w: 'ケーキ', c: 'sweet' }, { w: 'パン', c: 'sweet' }, { w: '和菓子', c: 'sweet' }, { w: 'たい焼', c: 'sweet' }, { w: 'クレープ', c: 'sweet' }, { w: 'アイス', c: 'sweet' },
  // 娛樂 / 湯屋
  { w: 'カラオケ', c: 'ent' }, { w: 'スナック', c: 'ent' }, { w: 'バー', c: 'ent' }, { w: 'ゲーム', c: 'ent' }, { w: '漫画', c: 'ent' }, { w: '銭湯', c: 'bath' },
  // 零售 / 其他
  { w: '本', c: 'shop' }, { w: '花', c: 'shop' }, { w: '質', c: 'shop' }, { w: '古着', c: 'shop' }, { w: '雑貨', c: 'shop' }, { w: 'コンビニ', c: 'shop' },
];
const CAT_COL = {
  pharm: '#2fdd7a', cafe: '#e0a24a', noodle: '#ff6c2f', meal: '#ffcf3a', izakaya: '#ff2d4a',
  snack: '#ff8a1a', sushi: '#26c6ff', sweet: '#ff7ad0', ent: '#c04dff', bath: '#26d0e0', shop: '#7ac0ff',
};
const ICON_CATS = new Set(['pharm', 'cafe', 'noodle', 'meal', 'snack', 'sushi', 'sweet', 'izakaya']);
const BIGCHARS = ['湯', '酒', '麺', '夜', '福', '金', '食', '氷', '肉', '茶'];

// ── 場景參數 ──
const ROAD_W = 9;         // 車道寬
const SIDEWALK = 2.4;     // 人行道寬
const BLINE = ROAD_W / 2 + SIDEWALK;   // 建築臨街面 x
const SEG_LEN = 18;       // 每段長
const N_SEG = 16;         // 段數（環形回收）
const EYE = 2.4;          // 視線高
const SPEED = 13.5;       // 前進速度 u/s

let renderer, scene, camera, composer, bloomPass, tone;
let world, segments = [];
let headL, headR, hemi, sun, rain = null;
let tower = null, towerDir = { x: 0, z: -1 };   // 遠景地標塔與其跟隨方向
const disposables = [];    // 待釋放的 geometry / material / texture
const clock = new THREE.Clock();
let swayT = 0, cp = 0.3;                 // cp：鏡頭沿路徑的參數（節點索引空間）
let nodes = [], pHeading = 0, turnLeft = 0, turnDelta = 0;   // 路徑節點與轉彎狀態
let dragging = false, lastX = 0;
// 左右移動：steer 為鏡頭在街道上的橫向位置（鍵盤 ←→/AD 與拖曳共用）
let steer = 0, keyDir = 0;
const MAXSTEER = ROAD_W / 2 - 0.8;   // 限制在車道內，別開進建築

// 共用幾何（重複利用）
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const planeGeo = new THREE.PlaneGeometry(1, 1);

// ══════════════ Canvas 貼圖 ══════════════
function texFrom(cvs, emissive) {
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  disposables.push(t);
  return t;
}

// 樓面：窗格 + 部分亮窗（同時當 emissiveMap）
function makeFacade() {
  const cols = ri(3, 6), rows = ri(6, 14);
  const cw = 26, ch = 24;
  const w = cols * cw, h = rows * ch;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d');
  // 混凝土底
  const base = pick(['#141420', '#18161f', '#101018', '#1c1a22', '#161a20']);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(0,0,0,${rr(0.03, 0.12)})`; g.fillRect(rr(0, w), rr(0, h), rr(2, 10), rr(2, 10)); }
  const litCols = ['#ffdca0', '#ffe8c4', '#d6e6ff', '#ffd0e0', '#c8fff0', '#fff2c0'];
  const litProb = rr(0.28, 0.55);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * ch;
      // 窗框
      g.fillStyle = '#05050a'; g.fillRect(x + 3, y + 3, cw - 6, ch - 6);
      const pad = 4;
      if (chance(litProb)) {
        const col = pick(litCols);
        g.fillStyle = col; g.fillRect(x + pad, y + pad, cw - pad * 2, ch - pad * 2);
        // 窗內剪影 / 分格
        g.fillStyle = 'rgba(0,0,0,.28)';
        if (chance(.5)) g.fillRect(x + pad, y + ch * 0.55, cw - pad * 2, ch * 0.42 - pad);
        g.fillRect(x + cw / 2 - 0.6, y + pad, 1.2, ch - pad * 2);
      } else {
        g.fillStyle = '#0a0a12'; g.fillRect(x + pad, y + pad, cw - pad * 2, ch - pad * 2);
      }
    }
  }
  return { tex: texFrom(cvs), aspect: w / h };
}

// 招牌小圖示（依店家分類）
function drawIcon(g, cat, cx, cy, s, fg) {
  g.save();
  g.fillStyle = fg; g.strokeStyle = fg; g.lineWidth = Math.max(3, s * 0.13); g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowBlur = 0;
  const T = Math.PI * 2;
  if (cat === 'pharm') {                 // 綠十字
    const a = s * 0.34;
    g.fillRect(cx - a, cy - a * 0.34, a * 2, a * 0.68);
    g.fillRect(cx - a * 0.34, cy - a, a * 0.68, a * 2);
  } else if (cat === 'cafe') {           // 咖啡杯 + 蒸氣
    const w = s * 0.52, h = s * 0.4;
    g.beginPath(); g.rect(cx - w / 2, cy - h / 2, w, h); g.stroke();
    g.beginPath(); g.arc(cx + w / 2, cy, h * 0.34, -1, 1); g.stroke();
    g.beginPath(); g.moveTo(cx - w * 0.12, cy - h * 0.72);
    g.quadraticCurveTo(cx + w * 0.1, cy - h * 0.95, cx - w * 0.12, cy - h * 1.2); g.stroke();
  } else if (cat === 'noodle' || cat === 'meal' || cat === 'snack') { // 碗 + 筷
    g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.42, 0, Math.PI); g.fill();
    g.beginPath(); g.moveTo(cx - s * 0.5, cy + s * 0.05); g.lineTo(cx + s * 0.5, cy + s * 0.05); g.stroke();
    g.beginPath(); g.moveTo(cx + s * 0.1, cy - s * 0.5); g.lineTo(cx + s * 0.36, cy - s * 0.05); g.stroke();
  } else if (cat === 'sushi') {          // 握壽司
    g.beginPath(); g.ellipse(cx, cy + s * 0.12, s * 0.44, s * 0.2, 0, 0, T); g.fill();
    g.save(); g.globalAlpha = 0.65; g.beginPath(); g.ellipse(cx, cy - s * 0.1, s * 0.34, s * 0.16, 0, 0, T); g.fill(); g.restore();
  } else if (cat === 'izakaya') {        // 提燈
    g.beginPath(); g.ellipse(cx, cy, s * 0.3, s * 0.42, 0, 0, T); g.fill();
    g.beginPath(); g.moveTo(cx, cy - s * 0.5); g.lineTo(cx, cy - s * 0.42); g.stroke();
  } else if (cat === 'sweet') {          // 愛心
    g.beginPath(); g.moveTo(cx, cy + s * 0.34);
    g.bezierCurveTo(cx - s * 0.55, cy - s * 0.06, cx - s * 0.24, cy - s * 0.44, cx, cy - s * 0.12);
    g.bezierCurveTo(cx + s * 0.24, cy - s * 0.44, cx + s * 0.55, cy - s * 0.06, cx, cy + s * 0.34); g.fill();
  }
  g.restore();
}

// 直式袖看板：單欄堆疊字 + 分類色 + 圖示，霓虹發光
function makeSignV() {
  const shop = pick(SHOPS);
  const word = [...shop.w];
  const n = word.length;
  const cell = 64;
  const hasIcon = ICON_CATS.has(shop.c) && chance(0.8);
  const iconH = hasIcon ? cell : 0;
  const w = 92, h = n * cell + iconH + 24;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d');
  const neon = chance(0.72) ? (CAT_COL[shop.c] || pick(NEON)) : pick(NEON);
  const dark = chance(.5);
  const fg = dark ? '#fff' : '#0a0a12';
  g.fillStyle = dark ? '#07070e' : neon; g.fillRect(0, 0, w, h);
  g.strokeStyle = dark ? neon : '#0a0a12'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
  let y0 = 16;
  if (hasIcon) { drawIcon(g, shop.c, w / 2, 16 + cell * 0.5, cell * 0.58, dark ? neon : fg); y0 = 16 + cell; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${cell - 12}px "Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
  for (let i = 0; i < n; i++) {
    const cy = y0 + cell * (i + 0.5);
    g.shadowColor = dark ? neon : '#fff'; g.shadowBlur = 22;
    g.fillStyle = fg;
    g.fillText(word[i], w / 2, cy); g.fillText(word[i], w / 2, cy);
  }
  g.shadowBlur = 0;
  return { tex: texFrom(cvs), aspect: w / h, neon };
}

// 橫式店招 / 大字：分類色 + 左側圖示
function makeSignH() {
  const big = chance(.35);
  const shop = big ? null : pick(SHOPS);
  const word = big ? pick(BIGCHARS) : shop.w;
  const w = 256, h = 96;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d');
  const neon = (!big && chance(0.72)) ? (CAT_COL[shop.c] || pick(NEON)) : pick(NEON);
  const dark = chance(.55);
  const fg = dark ? '#fff' : '#0a0a12';
  g.fillStyle = dark ? '#07070e' : neon; g.fillRect(0, 0, w, h);
  g.strokeStyle = dark ? neon : '#0a0a12'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
  let tx = w / 2, availW = w;
  const hasIcon = !big && ICON_CATS.has(shop.c) && chance(0.8);
  if (hasIcon) { drawIcon(g, shop.c, 52, h / 2, h * 0.5, dark ? neon : fg); tx = 52 + (w - 52) / 2; availW = w - 52; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = big ? 72 : Math.min(52, (availW - 24) / Math.max(1, word.length) * 1.05);
  g.font = `bold ${fs}px "Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
  g.shadowColor = dark ? neon : '#fff'; g.shadowBlur = 24;
  g.fillStyle = fg;
  g.fillText(word, tx, h / 2 + 3); g.fillText(word, tx, h / 2 + 3);
  g.shadowBlur = 0;
  return { tex: texFrom(cvs), aspect: w / h, neon };
}

// 自動販賣機面板
function makeVend() {
  const w = 128, h = 200;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d');
  g.fillStyle = '#0c1420'; g.fillRect(0, 0, w, h);
  // 上方廣告燈箱
  const adCol = pick(['#e33', '#39f', '#3c6', '#f93', '#c3d']);
  g.fillStyle = adCol; g.fillRect(6, 6, w - 12, 46);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(12, 40, w - 24, 6);
  // 飲料格
  const dcols = ['#e33', '#39c', '#3a6', '#fb3', '#c39', '#5cf', '#f66', '#6d6'];
  const cols = 4, rows = 5, gx = 8, gy = 58, cw = (w - 16) / cols, chh = (h - gy - 8) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    g.fillStyle = pick(dcols); g.fillRect(gx + c * cw + 2, gy + r * chh + 2, cw - 4, chh - 8);
    g.fillStyle = '#ffcf3a'; g.fillRect(gx + c * cw + 2, gy + r * chh + chh - 8, cw - 4, 4);
  }
  return texFrom(cvs);
}

// 貼圖池（生成期建立一次，各 segment 隨機取用）
let facadePool, signVPool, signHPool, vendPool;
function buildPools() {
  facadePool = Array.from({ length: 16 }, makeFacade);
  signVPool = Array.from({ length: 34 }, makeSignV);
  signHPool = Array.from({ length: 28 }, makeSignH);
  vendPool = Array.from({ length: 5 }, makeVend);
}

// ══════════════ 材質工具 ══════════════
function neonMat(texObj) {
  const b = tone.signBright;
  const m = new THREE.MeshBasicMaterial({ map: texObj.tex, color: new THREE.Color(b, b, b), toneMapped: false });
  disposables.push(m);
  return m;
}
function litMat(hex, intensity) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity), toneMapped: false });
  disposables.push(m);
  return m;
}
function solidMat(hex, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: opts.rough ?? 0.9, metalness: opts.metal ?? 0.0,
    map: opts.map || null, emissive: opts.emissive || 0x000000, emissiveMap: opts.emissiveMap || null,
    emissiveIntensity: opts.emissiveIntensity ?? 1 });
  disposables.push(m);
  return m;
}

// 反光小水池（路面上的霓虹倒影）
function addReflection(parent, x, z, color, len) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), transparent: true,
    opacity: 0.16 * tone.wet, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  disposables.push(m);
  const mesh = new THREE.Mesh(planeGeo, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(rr(0.5, 1.1), len, 1);
  mesh.position.set(x, 0.02, z);
  parent.add(mesh);
}

// ══════════════ 街道元件 ══════════════
// 建築（沿 z 的長方塊；臨街面貼窗格；掛招牌）
function addBuilding(parent, side, zc, zLen) {
  const depth = rr(5, 10);
  const height = rr(6, 30);
  const fa = pick(facadePool);
  const mat = solidMat(0xffffff, { map: fa.tex, emissive: 0xffffff, emissiveMap: fa.tex,
    emissiveIntensity: rr(0.55, 1.0) * tone.emiScale, rough: 0.85 });
  const b = new THREE.Mesh(boxGeo, mat);
  b.scale.set(depth, height, zLen);
  const cx = side * (BLINE + depth / 2);
  b.position.set(cx, height / 2, zc);
  parent.add(b);

  const faceX = side * BLINE;               // 臨街面
  // 直式袖看板（正對來車 +z 面），沿高度與 z 灑幾個
  const nV = ri(1, 3);
  for (let i = 0; i < nV; i++) {
    const s = pick(signVPool);
    const hh = rr(2.0, 3.4), ww = hh * s.aspect;
    const y = rr(2.5, Math.max(3, height - 1.5));
    const z = zc + rr(-zLen / 2 + 1, zLen / 2 - 1);
    const sign = new THREE.Mesh(planeGeo, neonMat(s));
    sign.scale.set(ww, hh, 1);
    sign.position.set(faceX - side * rr(0.3, 1.1), y, z);
    parent.add(sign);
    // 路面倒影
    if (chance(.7)) addReflection(parent, side * rr(1.5, BLINE - 0.5), z, s.neon, rr(2, 5));
  }
  // 橫式店招（近地面）
  if (chance(.75)) {
    const s = pick(signHPool);
    const ww = rr(2.4, 4.2), hh = ww / s.aspect;
    const z = zc + rr(-zLen / 2 + 1.5, zLen / 2 - 1.5);
    const sign = new THREE.Mesh(planeGeo, neonMat(s));
    sign.scale.set(ww, hh, 1);
    sign.position.set(faceX - side * 0.15, rr(2.4, 4.2), z);
    sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;  // 面向車道
    parent.add(sign);
    if (chance(.6)) addReflection(parent, side * rr(1.5, BLINE - 1), z, s.neon, rr(2, 4));
  }
  return { faceX, height };
}

// 紅提灯串
function addLanterns(parent, side, zc) {
  const n = ri(2, 4);
  const baseZ = zc + rr(-6, 6);
  const x = side * (BLINE - rr(0.4, 1.0));
  const mat = litMat('#ff3a24', 1.7);
  const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.34, 10);
  disposables.push(geo);
  for (let i = 0; i < n; i++) {
    const l = new THREE.Mesh(geo, mat);
    l.position.set(x + rr(-0.15, 0.15), rr(2.6, 3.6), baseZ + i * rr(0.5, 0.8));
    parent.add(l);
    addReflection(parent, side * rr(1.5, BLINE - 1), l.position.z, '#ff3a24', 1.4);
  }
}

// 自動販賣機（人行道邊，面向車道發光）
function addVending(parent, side, zc) {
  const t = pick(vendPool);
  const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  disposables.push(m);
  const grp = new THREE.Group();
  const body = new THREE.Mesh(boxGeo, m);
  body.scale.set(0.5, 2.0, 1.3);
  grp.add(body);
  grp.position.set(side * (ROAD_W / 2 + rr(0.5, 1.2)), 1.0, zc + rr(-5, 5));
  parent.add(grp);   // 面板本就朝 ±x（車道方向），毋須旋轉
  addReflection(parent, side * (ROAD_W / 2 - 0.5), grp.position.z, '#7fd8ff', 2.4);
}

// 電線桿 + 頭頂糾纏電纜
const poleMat = new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 1 });
const cableMat = new THREE.LineBasicMaterial({ color: 0x05050a });
function addPolesAndCables(parent, zc) {
  for (const side of [-1, 1]) {
    const px = side * (ROAD_W / 2 + rr(0.3, 0.9));
    const pole = new THREE.Mesh(boxGeo, poleMat);
    const ph = rr(7, 9);
    pole.scale.set(0.18, ph, 0.18);
    pole.position.set(px, ph / 2, zc + SEG_LEN / 2);
    parent.add(pole);
    // 橫擔
    const arm = new THREE.Mesh(boxGeo, poleMat);
    arm.scale.set(1.6, 0.1, 0.1); arm.position.set(px - side * 0.6, ph - 0.6, zc + SEG_LEN / 2);
    parent.add(arm);
  }
  // 電纜：沿街下垂 + 對角橫越（段內連續）
  const pts = [];
  const top = rr(7, 8.5), z0 = zc - SEG_LEN / 2, z1 = zc + SEG_LEN / 2;
  const nWire = ri(4, 7);
  for (let i = 0; i < nWire; i++) {
    const side = chance(.5) ? -1 : 1;
    const x = side * (ROAD_W / 2 + rr(0.2, 1.0));
    const sag = rr(0.4, 1.1), y = top + rr(-0.6, 0.4);
    for (let s = 0; s <= 8; s++) {
      const t = s / 8, zz = z0 + (z1 - z0) * t;
      const dip = Math.sin(t * Math.PI) * sag;
      pts.push(x + rr(-0.05, 0.05), y - dip, zz);
      if (s < 8) { const t2 = (s + 1) / 8; pts.push(x + rr(-0.05, 0.05), y - Math.sin(t2 * Math.PI) * sag, z0 + (z1 - z0) * t2); }
    }
  }
  // 幾條橫越馬路
  for (let i = 0; i < ri(1, 3); i++) {
    const zz = zc + rr(-SEG_LEN / 2, SEG_LEN / 2), y = top + rr(-0.4, 0.6), sag = rr(0.5, 1.2);
    for (let s = 0; s <= 6; s++) {
      const t = s / 6, xx = -(ROAD_W / 2 + 0.6) + (ROAD_W + 1.2) * t, dip = Math.sin(t * Math.PI) * sag;
      pts.push(xx, y - dip, zz);
      if (s < 6) { const t2 = (s + 1) / 6; pts.push(-(ROAD_W / 2 + 0.6) + (ROAD_W + 1.2) * t2, y - Math.sin(t2 * Math.PI) * sag, zz); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  disposables.push(g);
  parent.add(new THREE.LineSegments(g, cableMat));
}

// 街燈（暖白光暈球，靠 emissive+bloom）
function addStreetLamp(parent, side, zc) {
  const px = side * (ROAD_W / 2 + rr(0.3, 0.8));
  const pole = new THREE.Mesh(boxGeo, poleMat);
  pole.scale.set(0.1, 4.2, 0.1); pole.position.set(px, 2.1, zc);
  parent.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), litMat('#ffdca0', 2.2));
  disposables.push(lamp.geometry);
  lamp.position.set(px - side * 0.2, 4.2, zc);
  parent.add(lamp);
}

// 路面 / 人行道 / 車道虛線（每段一塊，接縫無感）
const roadMat = new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.35, metalness: 0.55 });
const walkMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.9 });
const dashMat = new THREE.MeshBasicMaterial({ color: 0x555540, toneMapped: false });
function addGround(parent, zc) {
  const OL = SEG_LEN * 1.08;   // 稍長於段距，讓彎道接縫重疊不露空
  const road = new THREE.Mesh(planeGeo, roadMat);
  road.rotation.x = -Math.PI / 2; road.scale.set(ROAD_W, OL, 1);
  road.position.set(0, 0, zc); parent.add(road);
  for (const side of [-1, 1]) {
    const wk = new THREE.Mesh(planeGeo, walkMat);
    wk.rotation.x = -Math.PI / 2; wk.scale.set(SIDEWALK, OL, 1);
    wk.position.set(side * (ROAD_W / 2 + SIDEWALK / 2), 0.015, zc); parent.add(wk);
  }
  // 中央虛線
  const dash = new THREE.Mesh(planeGeo, dashMat);
  dash.rotation.x = -Math.PI / 2; dash.scale.set(0.18, SEG_LEN * 0.42, 1);
  dash.position.set(0, 0.03, zc); parent.add(dash);
}

// 組一段街景（本地座標，中心在原點、forward = local -z；擺放交給路徑）
function buildSegment() {
  const seg = new THREE.Group();
  addGround(seg, 0);
  addPolesAndCables(seg, 0);
  for (const side of [-1, 1]) {
    // 沿 z 塞 1~2 棟
    let z = -SEG_LEN / 2;
    while (z < SEG_LEN / 2 - 1) {
      const zLen = Math.min(rr(6, 11), SEG_LEN / 2 - z);
      addBuilding(seg, side, z + zLen / 2, zLen - 0.4);
      z += zLen;
    }
    if (chance(.5)) addLanterns(seg, side, 0);
    if (chance(.35)) addVending(seg, side, 0);
    if (chance(.6)) addStreetLamp(seg, side, rr(-SEG_LEN / 2, SEG_LEN / 2));
  }
  return seg;
}

// ══════════════ 路徑（偶發左右轉的彎道）══════════════
const fwd = a => ({ x: -Math.sin(a), z: -Math.cos(a) });   // 航向 a 的前進向量（a=0 → -z）

// 決定「離開節點」的這段航向：多數直行，偶爾連續數段微轉成一個彎
function stepHeading(allowTurn) {
  if (allowTurn && turnLeft <= 0 && chance(0.16)) {
    turnLeft = ri(2, 4);                       // 一個彎跨 2~4 段
    turnDelta = rr(0.05, 0.13) * (chance(.5) ? 1 : -1);   // 每段偏轉（約 3~7.5°）
  }
  if (turnLeft > 0) { pHeading += turnDelta; turnLeft--; }
  return pHeading;
}

// 依 nodes 把某段擺到路徑上（旋轉讓 local -z 對齊 span 方向）
function placeSeg(seg, i) {
  const a = nodes[i], b = nodes[i + 1];
  seg.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  seg.rotation.y = Math.atan2(-(b.x - a.x), -(b.z - a.z));
}

// 建立節點鏈並擺放所有段（前 3 段強制直行，起步不歪）
function buildPath() {
  nodes = []; pHeading = 0; turnLeft = 0; turnDelta = 0;
  let x = 0, z = 0;
  nodes.push({ x, z });
  for (let j = 0; j < N_SEG; j++) {
    const f = fwd(stepHeading(j >= 3));
    x += f.x * SEG_LEN; z += f.z * SEG_LEN;
    nodes.push({ x, z });
  }
  for (let i = 0; i < N_SEG; i++) placeSeg(segments[i], i);
}

// 沿路徑取樣（param 為節點索引空間）：回傳位置與右向量
function samplePath(param) {
  let idx = Math.floor(param), f = param - idx;
  if (idx < 0) { idx = 0; f = 0; }
  if (idx > nodes.length - 2) { idx = nodes.length - 2; f = 1; }
  const a = nodes[idx], b = nodes[idx + 1];
  let dx = b.x - a.x, dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, rx: -dz, rz: dx };
}

// 過站回收：把最近段接到路徑末端（延伸航向，可能開始新的轉彎）
function recycleSegment() {
  const seg = segments.shift(); segments.push(seg);
  nodes.shift();
  const last = nodes[nodes.length - 1];
  const f = fwd(stepHeading(true));
  nodes.push({ x: last.x + f.x * SEG_LEN, z: last.z + f.z * SEG_LEN });
  placeSeg(seg, N_SEG - 1);
}

// ══════════════ 遠景地標塔 ══════════════
// 兩點之間放一根骨架（沿 local Y 的 box，旋轉對齊 a→b）
const _up = new THREE.Vector3(0, 1, 0);
function strut(group, a, b, thick, mat) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(thick, len, thick);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, d.normalize());
  group.add(m);
}
function towerMat(color, emis, emisInt) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: emis, emissiveIntensity: emisInt, roughness: 0.7, metalness: 0.1, fog: false });
  disposables.push(m); return m;
}
function buildTower() {
  const night = tone.sunInt <= 1.5;
  const g = new THREE.Group();
  const type = pick(['tokyo', 'skytree', 'tsutenkaku']);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  if (type === 'skytree') {
    // 晴空塔：細高、微幅收腰的塔身 + 長天線
    const H = rr(78, 96), botR = H * 0.05, midR = H * 0.028, topR = H * 0.016;
    const mat = towerMat(0x9fb0c4, 0xbfe0ff, night ? 0.5 : 0.0);
    const g1 = new THREE.CylinderGeometry(midR, botR, H * 0.55, 8, 1, true);
    const g2 = new THREE.CylinderGeometry(topR, midR, H * 0.35, 8, 1, true);
    disposables.push(g1, g2);
    const s1 = new THREE.Mesh(g1, mat); s1.position.y = H * 0.275; g.add(s1);
    const s2 = new THREE.Mesh(g2, mat); s2.position.y = H * 0.55 + H * 0.175; g.add(s2);
    // 展望台兩處
    for (const [yy, rr2] of [[H * 0.5, midR * 1.9], [H * 0.72, midR * 1.5]]) {
      const dg = new THREE.CylinderGeometry(rr2, rr2, H * 0.02, 8); disposables.push(dg);
      const d = new THREE.Mesh(dg, mat); d.position.y = yy; g.add(d);
    }
    strut(g, V(0, H * 0.9, 0), V(0, H, 0), botR * 0.14, mat);   // 天線
  } else if (type === 'tsutenkaku') {
    // 通天閣：較矮、四腳鐵塔 + 頂部圓展望
    const H = rr(48, 60), bw = H * 0.16, tw = H * 0.05, mid = H * 0.5;
    const mat = towerMat(0xd8b46a, 0xffd27a, night ? 0.6 : 0.0);
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [cx, cz] of cs) strut(g, V(cx * bw, 0, cz * bw), V(cx * tw, mid, cz * tw), H * 0.012, mat);
    for (const [cx, cz] of cs) strut(g, V(cx * tw, mid, cz * tw), V(cx * tw * 0.6, H * 0.78, cz * tw * 0.6), H * 0.01, mat);
    const pg = new THREE.BoxGeometry(bw * 1.3, H * 0.03, bw * 1.3); disposables.push(pg);
    const p = new THREE.Mesh(pg, mat); p.position.y = mid; g.add(p);
    const hg = new THREE.CylinderGeometry(tw * 1.4, tw * 1.4, H * 0.12, 10); disposables.push(hg);
    const head = new THREE.Mesh(hg, mat); head.position.y = H * 0.82; g.add(head);
    strut(g, V(0, H * 0.88, 0), V(0, H, 0), H * 0.008, mat);
  } else {
    // 東京鐵塔：紅白 A 字鐵骨 + 兩層展望台 + 天線
    const H = rr(62, 78), bw = H * 0.13, mid = H * 0.55, tw = H * 0.045;
    const red = towerMat(0xe0503a, 0xff7a4a, night ? 0.55 : 0.0);
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // 四腳（A 字內收）
    for (const [cx, cz] of cs) strut(g, V(cx * bw, 0, cz * bw), V(cx * tw, mid, cz * tw), H * 0.014, red);
    // 交叉斜撐（每面一組 X，強化鐵塔感）
    for (let s = 0; s < 4; s++) {
      const [a1, a2] = [cs[s], cs[(s + 1) % 4]];
      strut(g, V(a1[0] * bw, 0, a1[1] * bw), V(a2[0] * tw, mid, a2[1] * tw), H * 0.008, red);
      strut(g, V(a2[0] * bw, 0, a2[1] * bw), V(a1[0] * tw, mid, a1[1] * tw), H * 0.008, red);
    }
    // 展望台
    for (const [yy, w] of [[H * 0.42, bw * 1.5], [H * 0.55, tw * 2.6]]) {
      const pg2 = new THREE.BoxGeometry(w, H * 0.03, w); disposables.push(pg2);
      const p = new THREE.Mesh(pg2, red); p.position.y = yy; g.add(p);
    }
    // 上段塔身 + 天線
    strut(g, V(0, mid, 0), V(0, H * 0.88, 0), tw * 0.9, red);
    strut(g, V(0, H * 0.88, 0), V(0, H, 0), tw * 0.35, red);
  }

  g.userData.type = type;
  scene.add(g);
  return g;
}

// ══════════════ 世界 ══════════════
function buildWorld() {
  tone = pick(TONES);
  scene.background = new THREE.Color(tone.sky);
  scene.fog = new THREE.FogExp2(tone.fog, tone.fogDens);
  bloomPass.strength = tone.bloom;
  renderer.toneMappingExposure = tone.exposure;
  // 光照
  hemi.color.setHex(tone.hemiSky); hemi.groundColor.setHex(tone.hemiGnd); hemi.intensity = tone.hemiInt;
  sun.color.setHex(tone.sun); sun.intensity = tone.sunInt; sun.position.set(...tone.sunPos);
  headL.intensity = headR.intensity = tone.head;
  // 路面材質：只有雨天才光澤(濕)；白天/夕陽改霧面，避免低角度太陽在地面打出死白鏡面熱點
  const bright = tone.sunInt > 1.5;                 // 白天/夕陽
  roadMat.roughness = tone.rain ? 0.18 : (bright ? 0.92 : 0.5);
  roadMat.metalness = tone.rain ? 0.3 : 0.0;
  roadMat.color.setHex(bright ? 0x20222a : 0x0a0a10);
  walkMat.color.setHex(bright ? 0x2c2e36 : 0x14141c);

  world = new THREE.Group(); scene.add(world);
  buildPools();
  segments = [];
  for (let i = 0; i < N_SEG; i++) {
    const seg = buildSegment();
    segments.push(seg); world.add(seg);
  }
  buildPath();          // 生成節點鏈並把各段擺上路徑
  tower = buildTower(); // 遠景地標塔
  { const b0 = samplePath(0.3), a0 = samplePath(Math.min(4, N_SEG - 1));
    let dx = a0.x - b0.x, dz = a0.z - b0.z; const l = Math.hypot(dx, dz) || 1;
    towerDir = { x: dx / l, z: dz / l }; }
  if (tone.rain) buildRain();
  cp = 0.3;             // 起點落在第一段內
  document.getElementById('label').textContent = `日本の街 · ${tone.name}${tone.rain ? ' ☔' : ''}`;
}

// ── 雨：鏡頭周圍的落雨線段，逐幀下落並環繞回收 ──
function buildRain() {
  const N = 1500;
  const pos = new Float32Array(N * 6);
  const data = [];
  for (let i = 0; i < N; i++) data.push({ x: rr(-15, 15), y: rr(0, 28), z: rr(-48, 4) });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xaebccc, transparent: true, opacity: 0.32, toneMapped: false });
  rain = { mesh: new THREE.LineSegments(geo, mat), pos, data, geo, mat };
  scene.add(rain.mesh);
}
function updateRain(dt) {
  if (!rain) return;
  const arr = rain.pos, d = rain.data, cx = camera.position.x, cz = camera.position.z;
  for (let i = 0; i < d.length; i++) {
    const p = d[i];
    p.y -= 40 * dt;
    if (p.y < 0) { p.y = rr(22, 30); p.x = rr(-18, 18); p.z = rr(-40, 40); }
    const wx = cx + p.x, wy = p.y, wz = cz + p.z, k = i * 6;
    arr[k] = wx; arr[k + 1] = wy; arr[k + 2] = wz;
    arr[k + 3] = wx - 0.18; arr[k + 4] = wy - 0.85; arr[k + 5] = wz;   // 斜線雨滴
  }
  rain.geo.attributes.position.needsUpdate = true;
}

function disposeWorld() {
  if (world) scene.remove(world);
  if (tower) { scene.remove(tower); tower = null; }   // 幾何/材質已在 disposables 內釋放
  if (rain) { scene.remove(rain.mesh); rain.geo.dispose(); rain.mat.dispose(); rain = null; }
  for (const d of disposables) { if (d.dispose) d.dispose(); }
  disposables.length = 0;
  world = null; segments = [];
}

function regenerate() { disposeWorld(); buildWorld(); }

// ══════════════ 初始化 ══════════════
function init() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);

  hemi = new THREE.HemisphereLight(0x2a3450, 0x080610, 0.6); scene.add(hemi);
  // 太陽方向光（白天/夕陽）
  sun = new THREE.DirectionalLight(0xffffff, 0); scene.add(sun);
  // 跟車頭燈：照亮鏡頭附近街屋（夜晚）
  headL = new THREE.PointLight(0xffe6c0, 22, 34, 2.0); scene.add(headL);
  headR = new THREE.PointLight(0xffe6c0, 22, 34, 2.0); scene.add(headR);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.15, 0.72, 0.16);
  composer.addPass(bloomPass);

  buildWorld();

  addEventListener('resize', onResize);
  // 拖曳＝左右平移鏡頭；點擊（幾乎沒移動）＝重生
  let downX = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; downX = e.clientX; });
  addEventListener('pointerup', () => { dragging = false; });
  addEventListener('pointermove', e => {
    if (dragging) { steer = clampSteer(steer + (e.clientX - lastX) * 0.02); lastX = e.clientX; }
  });
  canvas.addEventListener('click', e => { if (Math.abs(e.clientX - downX) < 6) regenerate(); });
  // 鍵盤：←→ 或 A/D 左右移動；S 存圖
  addEventListener('keydown', e => {
    if (e.key === 's' || e.key === 'S') saveShot();
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyDir = -1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyDir = 1;
  });
  addEventListener('keyup', e => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) keyDir = 0;
  });

  animate();
  if (window.fxpreview) try { window.fxpreview(); } catch (e) {}
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloomPass.setSize(innerWidth, innerHeight);
}

function saveShot() {
  composer.render();
  const a = document.createElement('a');
  a.download = 'neon-street-' + Date.now() + '.png';
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  swayT += dt;

  // 左右移動（鍵盤持續按住時平移），限制在車道內
  if (keyDir !== 0) steer = clampSteer(steer + keyDir * 7 * dt);

  // 沿路徑前進 + 過站回收
  cp += SPEED * dt / SEG_LEN;
  while (cp >= 1) { recycleSegment(); cp -= 1; }

  // 沿路徑放置鏡頭：base=當前點、ahead=前方(過彎轉頭)、hp=車頭燈點
  const bob = Math.sin(swayT * 3.1) * 0.06;
  const sway = Math.sin(swayT * 0.7) * 0.22;
  const off = steer + sway;
  const base = samplePath(cp), ahead = samplePath(cp + 0.9), hp = samplePath(cp + 0.25);
  camera.position.set(base.x + base.rx * off, EYE + bob, base.z + base.rz * off);
  camera.lookAt(ahead.x + ahead.rx * steer, EYE - 0.35, ahead.z + ahead.rz * steer);
  headL.position.set(hp.x + hp.rx * (steer - 1.6), 3.0, hp.z + hp.rz * (steer - 1.6));
  headR.position.set(hp.x + hp.rx * (steer + 1.6), 3.0, hp.z + hp.rz * (steer + 1.6));

  // 遠景塔：平滑跟隨鏡頭前方，定距矗立在街尾
  if (tower) {
    let fdx = ahead.x - base.x, fdz = ahead.z - base.z; const fl = Math.hypot(fdx, fdz) || 1;
    towerDir.x += (fdx / fl - towerDir.x) * 0.012;
    towerDir.z += (fdz / fl - towerDir.z) * 0.012;
    const tl = Math.hypot(towerDir.x, towerDir.z) || 1, ux = towerDir.x / tl, uz = towerDir.z / tl;
    const TD = 250, LAT = 26;
    tower.position.set(camera.position.x + ux * TD + (-uz) * LAT, 0, camera.position.z + uz * TD + ux * LAT);
  }
  updateRain(dt);

  composer.render();
}

init();
