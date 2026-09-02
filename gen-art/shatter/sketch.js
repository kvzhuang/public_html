// ============================================================
// 破碎還原 · Ceramic Shatter — Generative Art (three.js)
//   陶瓷器皿（球體變形成罐/瓶）→ 表面三角面 Voronoi 聚類成碎片 →
//   每片加壁厚做成有體積的瓷片 → 動畫在「完整 ↔ 由中心向外炸裂」循環。
//   內部發光核 + 中心點光 = 由內而外的能量；RoomEnvironment 釉面反射。
//   fxhash 決定造型(頸/腹/高) × 釉色 × 碎片數 × 炸裂距離。
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const R = 1.25;

// 陶瓷釉色（color, roughness, metalness, 內部發光核 accent）
const GLAZES = [
  { name: '青瓷', col: 0x8fb3a0, rough: 0.35, metal: 0.05, accent: 0xffe6a8 },
  { name: '青花', col: 0x3b5aa6, rough: 0.28, metal: 0.10, accent: 0xffd27a },
  { name: '天目', col: 0x2c2f36, rough: 0.30, metal: 0.20, accent: 0xff8a3a },
  { name: '緋紅', col: 0xc0623d, rough: 0.34, metal: 0.06, accent: 0x9fe0ff },
  { name: '象牙', col: 0xe9e2cf, rough: 0.40, metal: 0.03, accent: 0xffcaa0 },
  { name: '碧潭', col: 0x2f8f8a, rough: 0.30, metal: 0.08, accent: 0xffe08a },
  { name: '藕荷', col: 0xd7b7c8, rough: 0.36, metal: 0.05, accent: 0xa8ffd0 },
  { name: '墨金', col: 0x3a3f45, rough: 0.25, metal: 0.35, accent: 0xffcf5a },
];

let renderer, scene, camera, controls, group, core, coreLight, glaze;
let frags = [];
const IDENT = new THREE.Quaternion();
const clock = new THREE.Clock();
let feat = {};

function init() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 5.4);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.9;
  controls.enablePan = false; controls.minDistance = 3.2; controls.maxDistance = 9;

  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x20242a, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.7); rim.position.set(-4, 2, -3); scene.add(rim);

  coreLight = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(coreLight);

  build();
  addEventListener('resize', onResize);
  canvas.addEventListener('click', () => build());
  addEventListener('keydown', e => { if (e.key === 's' || e.key === 'S') saveShot(); });
  animate();
}

// ── 造型：多種器皿側輪廓（body(t) = 各高度半徑，t:0底→1口）──
// pinch 讓頂/底自然收合成封閉形；body 決定各種水壺/瓶/碗剪影。
const PI = Math.PI;
const G2 = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));   // 高斯凸起
const pinch = t => Math.pow(Math.sin(PI * Math.min(1, Math.max(0, t))), 0.32);
const FORMS = [
  { name: '罐', hy: 1.2, body: t => 0.55 + 0.5 * Math.sin(PI * t) },
  { name: '圓壺', hy: 0.95, body: t => 0.5 + 0.62 * Math.sin(PI * t) },
  { name: '長頸瓶', hy: 1.7, body: t => Math.max(0.22, 0.34 + 0.82 * G2(t, 0.27, 0.16)) },
  { name: '細腰花瓶', hy: 1.55, body: t => 0.62 + 0.32 * Math.sin(PI * t) - 0.34 * G2(t, 0.62, 0.12) },
  { name: '葫蘆', hy: 1.45, body: t => 0.2 + 0.68 * G2(t, 0.3, 0.13) + 0.5 * G2(t, 0.72, 0.13) },
  { name: '碗', hy: 0.72, body: t => 0.32 + 0.95 * Math.pow(t, 0.85) },
  { name: '杯', hy: 1.15, body: t => 0.5 + 0.12 * t + 0.12 * Math.sin(PI * t) },
  { name: '雙耳瓶', hy: 1.4, body: t => Math.max(0.24, 0.4 + 0.7 * G2(t, 0.34, 0.2) - 0.18 * G2(t, 0.7, 0.1)) },
];

function getTriangles(geo) {
  const pos = geo.attributes.position, idx = geo.index, tris = [];
  const g = i => new THREE.Vector3().fromBufferAttribute(pos, i);
  if (idx) { for (let i = 0; i < idx.count; i += 3) tris.push([g(idx.getX(i)), g(idx.getX(i + 1)), g(idx.getX(i + 2))]); }
  else { for (let i = 0; i < pos.count; i += 3) tris.push([g(i), g(i + 1), g(i + 2)]); }
  return tris;
}

// Voronoi 聚類（Lloyd 疊代）把三角面分成 N 群碎片
function clusterTris(tris, N) {
  const cent = tris.map(t => t[0].clone().add(t[1]).add(t[2]).multiplyScalar(1 / 3));
  const seeds = []; const used = new Set();
  while (seeds.length < N && used.size < tris.length) { const i = ri(0, tris.length - 1); if (!used.has(i)) { used.add(i); seeds.push(cent[i].clone()); } }
  const assign = new Array(tris.length).fill(0);
  for (let it = 0; it < 3; it++) {
    for (let i = 0; i < tris.length; i++) { let bj = 0, bd = 1e9; for (let j = 0; j < seeds.length; j++) { const d = cent[i].distanceToSquared(seeds[j]); if (d < bd) { bd = d; bj = j; } } assign[i] = bj; }
    const sum = seeds.map(() => ({ v: new THREE.Vector3(), n: 0 }));
    for (let i = 0; i < tris.length; i++) { sum[assign[i]].v.add(cent[i]); sum[assign[i]].n++; }
    for (let j = 0; j < seeds.length; j++) if (sum[j].n) seeds[j] = sum[j].v.multiplyScalar(1 / sum[j].n);
  }
  const groups = seeds.map(() => []);
  for (let i = 0; i < tris.length; i++) groups[assign[i]].push(tris[i]);
  return groups.filter(g => g.length);
}

// 由一群三角面建成「有壁厚」的瓷片幾何（外殼 + 內殼 + 邊緣側壁），並回傳質心
function buildShard(tris, thick) {
  const key = v => `${Math.round(v.x * 1e4)}_${Math.round(v.y * 1e4)}_${Math.round(v.z * 1e4)}`;
  const vmap = new Map(), outer = [];
  const idOf = v => { const k = key(v); if (vmap.has(k)) return vmap.get(k); const id = outer.length; outer.push(v.clone()); vmap.set(k, id); return id; };
  const faces = [], eCount = new Map();
  const eKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  for (const t of tris) { const a = idOf(t[0]), b = idOf(t[1]), c = idOf(t[2]); faces.push([a, b, c]); for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = eKey(x, y); eCount.set(k, (eCount.get(k) || 0) + 1); } }
  const inner = outer.map(v => v.clone().addScaledVector(v.clone().normalize(), -thick));  // 向中心內縮
  const P = [];
  const push = (A, B, C) => P.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
  for (const [a, b, c] of faces) push(outer[a], outer[b], outer[c]);            // 外面
  for (const [a, b, c] of faces) push(inner[a], inner[c], inner[b]);            // 內面(反向)
  for (const [a, b, c] of faces) for (const [x, y] of [[a, b], [b, c], [c, a]]) // 邊緣側壁(只在邊界)
    if (eCount.get(eKey(x, y)) === 1) { push(outer[x], outer[y], inner[y]); push(outer[x], inner[y], inner[x]); }
  const cen = new THREE.Vector3(); outer.forEach(v => cen.add(v)); cen.multiplyScalar(1 / outer.length);
  const arr = new Float32Array(P.length);
  for (let i = 0; i < P.length; i++) arr[i] = P[i] - [cen.x, cen.y, cen.z][i % 3];   // 以質心為原點
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return { g, cen };
}

function disposeGroup() {
  if (group) { group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); scene.remove(group); }
  if (core) { core.geometry.dispose(); scene.remove(core); }
  frags = [];
}

function build() {
  disposeGroup();
  glaze = pick(GLAZES);
  const form = pick(FORMS);
  const scale = rr(0.85, 1.15);
  const N = ri(100, 170);        // 碎片更多更小
  const dist = rr(1.0, 2.0);     // 炸得更遠
  feat = { '造型': form.name, '釉色': glaze.name, '碎片': N };
  if (window.$fxhashFeatures !== undefined) window.$fxhashFeatures = feat;

  // 基礎球體 → 依造型輪廓重建為旋轉體器皿（lathe）
  const base = new THREE.IcosahedronGeometry(R, 3);
  const pos = base.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (y / R + 1) / 2;
    const th = Math.atan2(z, x);
    const rad = Math.max(0.04, form.body(t)) * pinch(t) * R * scale;
    pos.setX(i, Math.cos(th) * rad);
    pos.setZ(i, Math.sin(th) * rad);
    pos.setY(i, y * form.hy);
  }
  pos.needsUpdate = true;

  const tris = getTriangles(base);
  base.dispose();
  const groups = clusterTris(tris, N);

  const mat = new THREE.MeshStandardMaterial({ color: glaze.col, roughness: glaze.rough, metalness: glaze.metal, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  group = new THREE.Group(); scene.add(group);
  const thick = R * 0.055;
  for (const grp of groups) {
    const { g, cen } = buildShard(grp, thick);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(cen);
    const dir = cen.clone().normalize();
    const tan = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(rr(-0.25, 0.25));
    const ex = new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-3.2, 3.2), rr(-3.2, 3.2), rr(-3.2, 3.2)));
    frags.push({ m, home: cen.clone(), dir, dist: R * dist * rr(0.8, 1.5), tan, ex });
    group.add(m);
  }

  // 內部發光核
  core = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.34, 2),
    new THREE.MeshBasicMaterial({ color: glaze.accent, transparent: true, opacity: 0, toneMapped: false }));
  scene.add(core);
  coreLight.color.setHex(glaze.accent);
}

// 循環：完整(0) → 猛爆(快, easeOut) → 停留 → 平滑還原
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
function phase(time) {
  const holdA = 1.2, up = 0.55, holdB = 2.0, down = 1.9, CY = holdA + up + holdB + down;
  let t = time % CY;
  if (t < holdA) return 0;
  t -= holdA; if (t < up) return easeOutQuart(t / up);   // 爆炸：快速噴出後減速
  t -= up; if (t < holdB) return 1;
  t -= holdB; return 1 - easeInOut(t / down);            // 還原：平滑收回
}

function animate() {
  requestAnimationFrame(animate);
  const p = phase(clock.getElapsedTime());
  for (const f of frags) {
    f.m.position.copy(f.home).addScaledVector(f.dir, f.dist * p).addScaledVector(f.tan, p);
    f.m.quaternion.slerpQuaternions(IDENT, f.ex, p);
  }
  if (core) { core.material.opacity = 0.5 * p; core.scale.setScalar(0.6 + 1.4 * p); }
  coreLight.intensity = 7 * p;
  controls.update();
  renderer.render(scene, camera);
}

function onResize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
function saveShot() { renderer.render(scene, camera); const a = document.createElement('a'); a.download = 'ceramic-shatter.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click(); }

// 所有 const（FORMS/GLAZES…）初始化完成後才啟動，避免 TDZ
init();
