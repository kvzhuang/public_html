// ==========================================
// Kowloon 九龍城寨 — Generative Art (three.js)
// 程序生成的密集違建巨構：canvas 立面貼圖 + 堆疊高樓
//   頂樓水塔／冷氣／天線（InstancedMesh）＋ 糾纏電纜 ＋ 霓虹招牌
//   霧氣夜景，bloom 光暈，緩慢環繞鏡頭
// 概念參考 achrefelouafi/BuildingGeneratorThreeJS 的參數化組裝思路，
//   改為純程式幾何 + canvas facade，不依賴外部 GLB 素材
// ==========================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;

// ── 色調（時段）──
// skyTop/skyHorizon：漸層天幕；霧色貼近地平線色 → 建築剪影從亮天空前分離
const TONES = [
  { name: '霓虹夜', skyTop: '#141b2b', skyHorizon: '#3d5068', fog: 0x2a3648, fogDens: 0.016,
    hemiSky: 0x40546c, hemiGnd: 0x10141a, hemiInt: 0.9,
    dir: 0x7a8fa8, dirInt: 0.55, bloom: 0.85,
    litProb: 0.5, litCols: ['#ffdca0','#ffe8c4','#d6ffe0','#bcd4ff','#ffd0e0'] },
  { name: '黃昏霾', skyTop: '#2a2030', skyHorizon: '#b85c2e', fog: 0x6a4030, fogDens: 0.014,
    hemiSky: 0x9a6844, hemiGnd: 0x241a14, hemiInt: 1.05,
    dir: 0xffb070, dirInt: 0.9, bloom: 0.55,
    litProb: 0.36, litCols: ['#ffe0a0','#ffd090','#fff0d0','#c8ffe0'] },
  { name: '雨霧綠', skyTop: '#16241f', skyHorizon: '#4a6a5c', fog: 0x3c584c, fogDens: 0.019,
    hemiSky: 0x4a6a5c, hemiGnd: 0x101a14, hemiInt: 0.95,
    dir: 0x8aaa9a, dirInt: 0.6, bloom: 0.7,
    litProb: 0.42, litCols: ['#e8ffd0','#d0ffe4','#fff0c0','#bce0ff'] },
];
const NEON = ['#ff2a4a','#ff5a1a','#ffd21a','#1affc8','#2a9cff','#ff2ad0','#ff8a1a'];

let renderer, scene, camera, composer, cityGroup, tone;
let camAngle = 0, camTargetY = 0, autoRotate = true;
let dragging = false, lastX = 0, lastY = 0, camElev = 0.32;
let cityRadius = 40;
const clock = new THREE.Clock();

// ── canvas 立面貼圖 ──
function makeFacade(cols, rows, tint) {
  const cell = 14;
  const w = Math.min(512, cols * cell);
  const h = Math.min(1024, rows * cell);
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d');
  const em = document.createElement('canvas'); em.width = w; em.height = h;
  const ge = em.getContext('2d');
  ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);

  // 混凝土底色（帶隨機色偏）
  const base = tint;
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  // 汙漬底噪
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(0,0,0,${rr(0.02, 0.10)})`;
    const bx = rr(0, w), by = rr(0, h), bs = rr(2, 10);
    g.fillRect(bx, by, bs, bs);
  }

  const cw = w / cols, ch = h / rows;
  const litProb = tone.litProb * rr(0.7, 1.15);
  const groundRows = ri(1, 2);                 // 底層騎樓店面
  const curtainCols = ['#c85a4a', '#4a6ca8', '#c8a850', '#5a8a6a', '#a85a8a', '#d8d0c0'];
  for (let r = 0; r < rows; r++) {
    const isGround = r >= rows - groundRows;
    // 樓板橫向分隔線 + 分隔線陰影
    g.fillStyle = 'rgba(0,0,0,0.30)';
    g.fillRect(0, r * ch, w, Math.max(1, ch * 0.10));
    g.fillStyle = 'rgba(255,255,255,0.045)';
    g.fillRect(0, r * ch + ch * 0.10, w, 1);
    for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * ch;
      const pad = cw * 0.16, py = ch * 0.2;
      const wx = x + pad, wy = y + py, ww = cw - pad * 2, wh = ch - py * 1.7;
      if (isGround) {
        // 騎樓：鐵捲門店面 + 偶爾亮招牌
        g.fillStyle = 'rgba(20,20,24,0.9)'; g.fillRect(x + 1, y + ch * 0.15, cw - 2, ch * 0.8);
        g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
        for (let sh = 0; sh < 6; sh++) { const sy = y + ch * 0.18 + sh * (ch * 0.11); g.beginPath(); g.moveTo(x + 2, sy); g.lineTo(x + cw - 2, sy); g.stroke(); }
        if (chance(0.5)) {
          const sc = pick(NEON);
          g.fillStyle = sc; g.fillRect(x + 2, y + ch * 0.02, cw - 4, ch * 0.12);
          ge.fillStyle = sc; ge.fillRect(x + 2, y + ch * 0.02, cw - 4, ch * 0.12);
        }
        continue;
      }
      // 窗框
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      if (chance(litProb)) {
        const col = pick(tone.litCols);
        g.fillStyle = col; g.fillRect(wx, wy, ww, wh);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx, wy + wh * 0.5, ww, 1);
        // 窗簾（部分遮蔽）
        if (chance(0.4)) {
          g.fillStyle = pick(curtainCols); g.globalAlpha = 0.55;
          const ch2 = chance(0.5);
          g.fillRect(ch2 ? wx : wx + ww * 0.5, wy, ww * 0.5, wh); g.globalAlpha = 1;
        }
        ge.fillStyle = col; ge.fillRect(wx, wy, ww, wh);
      } else {
        const gl = 16 + ri(0, 22);
        g.fillStyle = `rgb(${gl},${gl + 6},${gl + 12})`;
        g.fillRect(wx, wy, ww, wh);
      }
      // 窗格分隔（十字窗框）
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(wx + ww * 0.5, wy); g.lineTo(wx + ww * 0.5, wy + wh); g.stroke();
      // 鐵窗花（防盜窗）
      if (chance(0.18)) {
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.8;
        for (let gi = 1; gi < 4; gi++) { const gx2 = wx + ww * gi / 4; g.beginPath(); g.moveTo(gx2, wy); g.lineTo(gx2, wy + wh); g.stroke(); }
      }
      // 冷氣機（掛窗下）
      if (chance(0.14)) {
        const aw = ww * 0.7, ay = wy + wh + 1;
        g.fillStyle = '#8a8f92'; g.fillRect(wx + ww * 0.15, ay, aw, Math.min(ch * 0.22, y + ch - ay));
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(wx + ww * 0.15, ay, aw, 1.5);
        g.fillStyle = 'rgba(60,40,20,0.2)'; g.fillRect(wx + ww * 0.5, ay, 2, ch * rr(0.4, 1.2));
      }
    }
  }

  // 垂直落水管（深色管線，2-4 條）
  for (let i = 0; i < ri(2, 4); i++) {
    const px = rr(w * 0.05, w * 0.95), pw = rr(3, 6);
    g.fillStyle = 'rgba(30,26,22,0.7)'; g.fillRect(px, 0, pw, h);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(px, 0, 1, h);
    // 管箍
    for (let ky = rr(0, ch); ky < h; ky += ch) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px - 1, ky, pw + 2, 2); }
  }

  // 垂直鏽水痕
  for (let i = 0; i < cols * 0.9; i++) {
    if (!chance(0.55)) continue;
    const sx = rr(0, w), grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(40,26,12,0)');
    grad.addColorStop(rr(0.2, 0.5), `rgba(46,30,14,${rr(0.05, 0.18)})`);
    grad.addColorStop(1, 'rgba(30,20,10,0)');
    g.fillStyle = grad; g.fillRect(sx, 0, rr(2, 6), h);
  }
  // 剝落／裂痕斑塊
  for (let i = 0; i < ri(4, 10); i++) {
    g.fillStyle = `rgba(0,0,0,${rr(0.06, 0.16)})`;
    const px = rr(0, w), py2 = rr(0, h), pw = rr(10, 40), ph = rr(8, 30);
    g.beginPath(); g.ellipse(px, py2, pw, ph, rr(0, 3.14), 0, 6.28); g.fill();
  }

  const map = new THREE.CanvasTexture(cvs); map.colorSpace = THREE.SRGBColorSpace;
  const emis = new THREE.CanvasTexture(em); emis.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return { map, emis };
}

// ── 漸層天幕（inverted sphere，不受霧影響）──
let skyDome = null;
function makeSky() {
  if (skyDome) { skyDome.material.map.dispose(); skyDome.material.dispose(); skyDome.geometry.dispose(); scene.remove(skyDome); }
  const cvs = document.createElement('canvas'); cvs.width = 4; cvs.height = 256;
  const g = cvs.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, tone.skyTop);
  grad.addColorStop(0.62, tone.skyTop);
  grad.addColorStop(0.94, tone.skyHorizon);   // 地平線帶微光（城市光害）
  grad.addColorStop(1, tone.skyHorizon);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.SphereGeometry(320, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false });
  skyDome = new THREE.Mesh(geo, mat);
  scene.add(skyDome);
}

// ── 生成城市 ──
function generate() {
  tone = pick(TONES);
  if (cityGroup) { disposeGroup(cityGroup); scene.remove(cityGroup); }
  cityGroup = new THREE.Group();
  scene.add(cityGroup);

  makeSky();
  scene.background = new THREE.Color(tone.skyTop);
  scene.fog = new THREE.FogExp2(tone.fog, tone.fogDens);
  hemi.color.setHex(tone.hemiSky); hemi.groundColor.setHex(tone.hemiGnd); hemi.intensity = tone.hemiInt;
  dir.color.setHex(tone.dir); dir.intensity = tone.dirInt;
  bloomPass.strength = tone.bloom;

  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.9, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1;
  cityGroup.add(ground);

  // 密集網格佈局：每格可能長一棟塔，緊貼堆疊成巨構
  const GN = 9;                 // 網格邊格數
  const cellSize = 6.2;
  const gap = 0.5;
  const foot = cellSize - gap;
  const half = (GN - 1) / 2;
  const roofTanks = [], roofAC = [], roofAnt = [], roofHut = [], roofDish = [];
  const facadeAC = [], signs = [], clothes = [], pipes = [];   // 立面附加物
  const rooftops = [];          // 供電纜連接
  let maxH = 0;

  for (let gz = 0; gz < GN; gz++) {
    for (let gx = 0; gx < GN; gx++) {
      // 中央密、邊緣疏（留光井與參差輪廓）
      const dxc = (gx - half) / half, dzc = (gz - half) / half;
      const distc = Math.hypot(dxc, dzc);
      if (distc > 1.05) continue;
      if (chance(0.10 + distc * 0.35)) continue;   // 邊緣較多空缺 → 光井

      // 樓高：中央高、外圍低，帶大量隨機（違建參差）
      const baseFloors = 8 + (1 - distc) * 26;
      const floors = Math.max(4, Math.round(baseFloors * rr(0.55, 1.25)));
      const fh = rr(0.85, 1.05);                    // 單層高
      const height = floors * fh;
      maxH = Math.max(maxH, height);

      // 塔寬（略小於格、隨機，偶爾偏移造成錯落）
      const bw = foot * rr(0.82, 1.0);
      const bd = foot * rr(0.82, 1.0);
      const ox = (gx - half) * cellSize + rr(-0.4, 0.4);
      const oz = (gz - half) * cellSize + rr(-0.4, 0.4);

      const cols = Math.max(2, Math.round(bw / 1.5));
      const rows = floors;
      const tint = `hsl(${ri(20, 210)}, ${ri(8, 18)}%, ${ri(30, 46)}%)`;
      const { map, emis } = makeFacade(cols, rows, tint);
      const sideMat = new THREE.MeshStandardMaterial({
        map, emissiveMap: emis, emissive: 0xffffff, emissiveIntensity: 1.25,
        roughness: 0.85, metalness: 0.0,
      });
      const topMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.95 });
      const mats = [sideMat, sideMat, topMat, topMat, sideMat, sideMat];
      const box = new THREE.Mesh(new THREE.BoxGeometry(bw, height, bd), mats);
      box.position.set(ox, height / 2, oz);
      cityGroup.add(box);

      // 懸挑違建（隨機幾層往外凸出小盒）
      const nCant = ri(0, 3);
      for (let k = 0; k < nCant; k++) {
        const cy = rr(height * 0.3, height * 0.95);
        const side = ri(0, 3);
        const cw2 = bw * rr(0.3, 0.6), cd2 = bd * rr(0.3, 0.6), chh = fh * rr(1, 3);
        const ext = rr(0.5, 1.2);
        let cx = ox, cz = oz;
        if (side === 0) cx = ox + bw / 2 + ext / 2;
        if (side === 1) cx = ox - bw / 2 - ext / 2;
        if (side === 2) cz = oz + bd / 2 + ext / 2;
        if (side === 3) cz = oz - bd / 2 - ext / 2;
        const cbw = (side < 2) ? ext : cw2, cbd = (side < 2) ? cd2 : ext;
        const cant = new THREE.Mesh(new THREE.BoxGeometry(cbw, chh, cbd),
          new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9 }));
        cant.position.set(cx, cy, cz);
        cityGroup.add(cant);
      }

      // 頂樓雜物：收集為 instance 資料
      const topY = height;
      const nTank = ri(1, 4);
      for (let k = 0; k < nTank; k++) {
        roofTanks.push({ x: ox + rr(-bw * 0.3, bw * 0.3), y: topY, z: oz + rr(-bd * 0.3, bd * 0.3), s: rr(0.7, 1.15) });
      }
      const nAc = ri(1, 4);
      for (let k = 0; k < nAc; k++) {
        roofAC.push({ x: ox + rr(-bw * 0.35, bw * 0.35), y: topY, z: oz + rr(-bd * 0.35, bd * 0.35), s: rr(0.6, 1.1) });
      }
      if (chance(0.7)) roofAnt.push({ x: ox + rr(-bw * 0.3, bw * 0.3), y: topY, z: oz + rr(-bd * 0.3, bd * 0.3), h: rr(2, 5) });
      if (chance(0.5)) roofHut.push({ x: ox + rr(-bw * 0.2, bw * 0.2), y: topY, z: oz + rr(-bd * 0.2, bd * 0.2), s: rr(0.8, 1.4) });
      for (let k = 0; k < ri(0, 2); k++) roofDish.push({ x: ox + rr(-bw * 0.3, bw * 0.3), y: topY, z: oz + rr(-bd * 0.3, bd * 0.3) });
      rooftops.push({ x: ox, y: topY, z: oz });

      // ── 立面附加物：隨機挑一面（±x / ±z），沿面放置 ──
      const faceOf = () => {
        const s = ri(0, 3);
        if (s === 0) return { nx: 1, nz: 0, hw: bw / 2, along: 'z', al: bd / 2 };
        if (s === 1) return { nx: -1, nz: 0, hw: bw / 2, along: 'z', al: bd / 2 };
        if (s === 2) return { nx: 0, nz: 1, hw: bd / 2, along: 'x', al: bw / 2 };
        return { nx: 0, nz: -1, hw: bd / 2, along: 'x', al: bw / 2 };
      };
      const facePt = (f, frac) => {   // frac in [-1,1] 沿面方向
        const px = ox + f.nx * f.hw + (f.along === 'x' ? frac * f.al : 0);
        const pz = oz + f.nz * f.hw + (f.along === 'z' ? frac * f.al : 0);
        return { px, pz };
      };
      // 牆面冷氣機
      for (let k = 0; k < ri(3, 9); k++) {
        const f = faceOf(), pt = facePt(f, rr(-0.8, 0.8));
        facadeAC.push({ x: pt.px, z: pt.pz, y: rr(fh * 2, height - fh), nx: f.nx, nz: f.nz, s: rr(0.6, 1.0) });
      }
      // 突出霓虹招牌（中下層）
      for (let k = 0; k < ri(0, 3); k++) {
        const f = faceOf(), pt = facePt(f, rr(-0.6, 0.6));
        signs.push({ x: pt.px, z: pt.pz, y: rr(fh * 1.5, height * 0.55), nx: f.nx, nz: f.nz,
                     w: rr(0.5, 1.1), h: rr(1.0, 2.6), col: new THREE.Color(pick(NEON)) });
      }
      // 曬衣竿（中層）＋ 衣物
      for (let k = 0; k < ri(1, 3); k++) {
        const f = faceOf(), pt = facePt(f, rr(-0.5, 0.5));
        clothes.push({ x: pt.px, z: pt.pz, y: rr(height * 0.35, height * 0.9), nx: f.nx, nz: f.nz, len: rr(1.6, 2.8) });
      }
      // 落水管（貼一角垂直）
      if (chance(0.7)) {
        const f = faceOf(), pt = facePt(f, rr(-0.9, 0.9));
        pipes.push({ x: pt.px + f.nx * 0.06, z: pt.pz + f.nz * 0.06, y: height / 2, h: height });
      }
    }
  }

  buildInstances(roofTanks, roofAC, roofAnt, roofHut);
  buildFacadeProps(facadeAC, signs, clothes, pipes, roofDish);
  buildCables(rooftops);

  cityRadius = half * cellSize * 1.5;
  camTargetY = maxH * 0.42;
  document.getElementById('label').textContent = `九龍城寨・${tone.name}　${rooftops.length} 棟`;
}

// ── 頂樓雜物 InstancedMesh ──
function buildInstances(tanks, acs, ants, huts) {
  const dummy = new THREE.Object3D();
  // 水塔（圓柱）
  if (tanks.length) {
    const geo = new THREE.CylinderGeometry(0.55, 0.6, 1.3, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.85 });
    const im = new THREE.InstancedMesh(geo, mat, tanks.length);
    tanks.forEach((t, i) => { dummy.position.set(t.x, t.y + 0.65 * t.s, t.z); dummy.scale.set(t.s, t.s, t.s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    cityGroup.add(im);
  }
  // 冷氣／機箱
  if (acs.length) {
    const geo = new THREE.BoxGeometry(0.9, 0.7, 0.9);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6a6f72, roughness: 0.8 });
    const im = new THREE.InstancedMesh(geo, mat, acs.length);
    acs.forEach((t, i) => { dummy.position.set(t.x, t.y + 0.35 * t.s, t.z); dummy.scale.set(t.s, t.s, t.s); dummy.rotation.set(0, rr(0, Math.PI), 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    cityGroup.add(im);
  }
  // 天線（細長盒）
  if (ants.length) {
    const geo = new THREE.BoxGeometry(0.08, 1, 0.08);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
    const im = new THREE.InstancedMesh(geo, mat, ants.length);
    ants.forEach((t, i) => { dummy.position.set(t.x, t.y + t.h / 2, t.z); dummy.scale.set(1, t.h, 1); dummy.rotation.set(rr(-0.1, 0.1), 0, rr(-0.1, 0.1)); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    cityGroup.add(im);
  }
  // 加蓋鐵皮屋
  if (huts.length) {
    const geo = new THREE.BoxGeometry(1.6, 1.1, 1.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 0.9 });
    const im = new THREE.InstancedMesh(geo, mat, huts.length);
    huts.forEach((t, i) => { dummy.position.set(t.x, t.y + 0.55 * t.s, t.z); dummy.scale.set(t.s, t.s, t.s); dummy.rotation.set(0, rr(-0.3, 0.3), 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    cityGroup.add(im);
  }
}

// ── 立面附加物 InstancedMesh ──
function buildFacadeProps(acs, signs, clothes, pipes, dishes) {
  const dummy = new THREE.Object3D();

  // 牆面冷氣機（貼牆突出的小盒）
  if (acs.length) {
    const geo = new THREE.BoxGeometry(0.75, 0.55, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa0a2, roughness: 0.75 });
    const im = new THREE.InstancedMesh(geo, mat, acs.length);
    acs.forEach((t, i) => {
      const yaw = Math.atan2(t.nx, t.nz);
      dummy.position.set(t.x + t.nx * 0.22, t.y, t.z + t.nz * 0.22);
      dummy.scale.set(t.s, t.s, t.s); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    cityGroup.add(im);
  }

  // 突出霓虹招牌（發光基本材質 + 逐實例顏色 → bloom 光暈）
  if (signs.length) {
    const geo = new THREE.BoxGeometry(0.16, 1, 0.9);   // 薄板，垂直長條招牌
    const mat = new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: false });
    const im = new THREE.InstancedMesh(geo, mat, signs.length);
    signs.forEach((t, i) => {
      const yaw = Math.atan2(t.nx, t.nz);
      dummy.position.set(t.x + t.nx * 0.55, t.y, t.z + t.nz * 0.55);
      dummy.scale.set(1, t.h, t.w / 0.9); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, t.col);
    });
    im.instanceColor.needsUpdate = true;
    cityGroup.add(im);
    // 招牌暗色背板
    const bgeo = new THREE.BoxGeometry(0.1, 1, 1.0);
    const bmat = new THREE.MeshStandardMaterial({ color: 0x121014, roughness: 0.9 });
    const bim = new THREE.InstancedMesh(bgeo, bmat, signs.length);
    signs.forEach((t, i) => {
      const yaw = Math.atan2(t.nx, t.nz);
      dummy.position.set(t.x + t.nx * 0.5, t.y, t.z + t.nz * 0.5);
      dummy.scale.set(1, t.h * 1.08, t.w / 0.9 * 1.1); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix();
      bim.setMatrixAt(i, dummy.matrix);
    });
    cityGroup.add(bim);
  }

  // 曬衣竿：橫桿 + 垂掛衣物
  if (clothes.length) {
    const poleGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
    const pim = new THREE.InstancedMesh(poleGeo, poleMat, clothes.length);
    const items = [];
    clothes.forEach((t, i) => {
      const yaw = Math.atan2(t.nx, t.nz);
      dummy.position.set(t.x + t.nx * 0.5, t.y, t.z + t.nz * 0.5);
      dummy.scale.set(1, 1, t.len); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix();
      pim.setMatrixAt(i, dummy.matrix);
      // 沿桿掛數件衣物
      const n = ri(3, 6);
      for (let k = 0; k < n; k++) {
        const frac = (k + 0.5) / n - 0.5;
        // 沿桿方向（垂直於法線）：切線 = (nz, -nx)
        const tx = t.x + t.nx * 0.55 + t.nz * frac * t.len;
        const tz = t.z + t.nz * 0.55 - t.nx * frac * t.len;
        items.push({ x: tx, y: t.y - rr(0.35, 0.6), z: tz, yaw, w: rr(0.22, 0.4), h: rr(0.45, 0.8), col: new THREE.Color(`hsl(${ri(0,360)},${ri(30,70)}%,${ri(45,75)}%)`) });
      }
    });
    cityGroup.add(pim);
    if (items.length) {
      const cgeo = new THREE.PlaneGeometry(1, 1);
      const cmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
      const cim = new THREE.InstancedMesh(cgeo, cmat, items.length);
      items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z); dummy.scale.set(it.w, it.h, 1); dummy.rotation.set(0, it.yaw + Math.PI / 2, 0); dummy.updateMatrix();
        cim.setMatrixAt(i, dummy.matrix); cim.setColorAt(i, it.col);
      });
      cim.instanceColor.needsUpdate = true;
      cityGroup.add(cim);
    }
  }

  // 落水管（細長圓柱）
  if (pipes.length) {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 1, 5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x22201c, roughness: 0.8 });
    const im = new THREE.InstancedMesh(geo, mat, pipes.length);
    pipes.forEach((t, i) => { dummy.position.set(t.x, t.y, t.z); dummy.scale.set(1, t.h, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    cityGroup.add(im);
  }

  // 衛星天線（碟形）
  if (dishes.length) {
    const geo = new THREE.SphereGeometry(0.42, 8, 4, 0, Math.PI * 2, 0, Math.PI / 3);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.7, side: THREE.DoubleSide });
    const im = new THREE.InstancedMesh(geo, mat, dishes.length);
    dishes.forEach((t, i) => { dummy.position.set(t.x, t.y + 0.3, t.z); dummy.scale.set(1, 1, 1); dummy.rotation.set(rr(0.6, 1.1), rr(0, 6.28), 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    cityGroup.add(im);
  }
}

// ── 電纜：鄰近屋頂間下垂連線 ──
function buildCables(tops) {
  const mat = new THREE.LineBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.7 });
  const positions = [];
  const nCable = Math.min(90, tops.length * 2);
  for (let i = 0; i < nCable; i++) {
    const a = pick(tops), b = pick(tops);
    if (a === b) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d < 3 || d > 16) continue;
    const ay = a.y - rr(0.5, 3), by = b.y - rr(0.5, 3);
    const sag = Math.min(ay, by) - rr(1.5, 4);
    const mid = new THREE.Vector3((a.x + b.x) / 2, sag, (a.z + b.z) / 2);
    const p0 = new THREE.Vector3(a.x, ay, a.z), p1 = new THREE.Vector3(b.x, by, b.z);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
    const pts = curve.getPoints(10);
    for (let k = 0; k < pts.length - 1; k++) { positions.push(pts[k].x, pts[k].y, pts[k].z, pts[k+1].x, pts[k+1].y, pts[k+1].z); }
  }
  if (positions.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    cityGroup.add(new THREE.LineSegments(geo, mat));
  }
}

function disposeGroup(grp) {
  grp.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); });
    }
  });
}

// ── three 初始化 ──
let hemi, dir, bloomPass;
function init() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 500);

  hemi = new THREE.HemisphereLight(0x24303f, 0x0a0c0f, 0.55);
  scene.add(hemi);
  dir = new THREE.DirectionalLight(0x4a5a70, 0.35);
  dir.position.set(20, 50, 10);
  scene.add(dir);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.7, 0.2);
  composer.addPass(bloomPass);

  generate();

  addEventListener('resize', onResize);
  canvas.addEventListener('pointerdown', e => { dragging = true; autoRotate = false; lastX = e.clientX; lastY = e.clientY; });
  addEventListener('pointerup', () => { dragging = false; });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    camAngle -= (e.clientX - lastX) * 0.005;
    camElev = Math.max(0.05, Math.min(0.9, camElev + (e.clientY - lastY) * 0.003));
    lastX = e.clientX; lastY = e.clientY;
  });
  let downX = 0, downY = 0, downT = 0;
  canvas.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; downT = performance.now(); });
  canvas.addEventListener('click', e => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6 && performance.now() - downT < 300) generate();
  });
  addEventListener('keydown', e => {
    if (e.key === 's' || e.key === 'S') {
      const a = document.createElement('a');
      a.download = 'kowloon-' + Date.now() + '.png';
      a.href = renderer.domElement.toDataURL('image/png'); a.click();
    }
  });
  animate();
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (autoRotate) camAngle += dt * 0.06;
  const r = cityRadius;
  camera.position.set(
    Math.cos(camAngle) * r,
    camTargetY + camElev * r * 1.4,
    Math.sin(camAngle) * r
  );
  camera.lookAt(0, camTargetY * 0.72, 0);
  composer.render();
}

init();
