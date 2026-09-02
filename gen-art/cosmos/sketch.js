import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── RNG ──────────────────────────────────────────────────────────────────────
const rand = () => fxrand();
const rr   = (a, b) => a + rand() * (b - a);
const ri   = (a, b) => Math.floor(a + rand() * (b - a + 1));

// ── Palettes（色相定義，亮度由 shader 累積決定）────────────────────────────
const PALETTES = [
  {
    name: '藍白星系',
    bg:       0x000308,
    coreHex:  '#99bbff',
    innerHex: '#4466bb',
    outerHex: '#0a1644',
    nebHex:   '#001133',
    bloom: { strength: 0.35, radius: 0.3, threshold: 0.55 },
  },
  {
    name: '暖橙星雲',
    bg:       0x060100,
    coreHex:  '#ffcc77',
    innerHex: '#aa5511',
    outerHex: '#441100',
    nebHex:   '#220800',
    bloom: { strength: 0.40, radius: 0.3, threshold: 0.50 },
  },
  {
    name: '翡翠宇宙',
    bg:       0x000600,
    coreHex:  '#77ffaa',
    innerHex: '#228855',
    outerHex: '#002211',
    nebHex:   '#001108',
    bloom: { strength: 0.35, radius: 0.3, threshold: 0.52 },
  },
  {
    name: '紫霧星河',
    bg:       0x030008,
    coreHex:  '#cc88ff',
    innerHex: '#6622aa',
    outerHex: '#1a0033',
    nebHex:   '#0d0022',
    bloom: { strength: 0.42, radius: 0.35, threshold: 0.48 },
  },
];

// ── 生成參數 ──────────────────────────────────────────────────────────────────
const PAL        = PALETTES[ri(0, 3)];
const ARM_N      = ri(2, 4);
const STAR_N     = 40000 + ri(0, 15000);
const CLOUD_N    = 1500  + ri(0, 1000);
const GAL_R      = 7.0 * rr(0.85, 1.15);
const SPIN       = rr(0.30, 0.70);
const DISC_THICK = rr(0.06, 0.16);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.bg);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 300);
camera.position.set(0, 5, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // 限制 DPR 降低負擔
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping; // Reinhard 比 ACES 更保守，不容易爆白
renderer.toneMappingExposure = 0.8;
document.body.appendChild(renderer.domElement);

// ── Controls ──────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.minDistance     = 3;
controls.maxDistance     = 40;
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.3;

// ── 顏色輔助 ──────────────────────────────────────────────────────────────────
const coreCol  = new THREE.Color(PAL.coreHex);
const innerCol = new THREE.Color(PAL.innerHex);
const outerCol = new THREE.Color(PAL.outerHex);
const nebCol   = new THREE.Color(PAL.nebHex);

// ── 星星粒子 ──────────────────────────────────────────────────────────────────
// 關鍵：每顆粒子極暗（0.03–0.10），依賴「數千顆加總」才有亮度
// 核心有幾百顆疊加 → 亮；邊緣 2–3 顆 → 可見但不刺眼
function buildStars() {
  const pos = new Float32Array(STAR_N * 3);
  const col = new Float32Array(STAR_N * 3);
  const siz = new Float32Array(STAR_N);

  for (let i = 0; i < STAR_N; i++) {
    const i3 = i * 3;
    const r  = Math.pow(rand(), 1.1) * GAL_R;
    const arm = i % ARM_N;
    const base  = (arm / ARM_N) * Math.PI * 2;
    const angle = base + r * SPIN + rr(-0.2, 0.2) * (0.4 + r / GAL_R);
    const rF    = r + rr(-0.2, 0.2) * r * 0.1;

    pos[i3]     = Math.cos(angle) * rF;
    pos[i3 + 2] = Math.sin(angle) * rF;

    const bulge  = Math.exp(-r * r * 0.15);
    pos[i3 + 1]  = rr(-1, 1) * (DISC_THICK * GAL_R * 0.08 + bulge * 0.25);

    // 色相
    const t = r / GAL_R;
    const c = t < 0.15
      ? coreCol.clone().lerp(innerCol, t / 0.15)
      : innerCol.clone().lerp(outerCol, (t - 0.15) / 0.85);

    // 極暗：靠疊加累積亮度，而非單顆亮
    const dim = rr(0.03, 0.10);
    col[i3]     = c.r * dim;
    col[i3 + 1] = c.g * dim;
    col[i3 + 2] = c.b * dim;

    // 小尺寸：減少單顆面積、降低核心飽和速度
    siz[i] = (0.7 - t * 0.4) * rr(0.2, 0.9);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
  return geo;
}

// ── 星雲氣體（大顆但極透明）────────────────────────────────────────────────
function buildClouds() {
  const pos = new Float32Array(CLOUD_N * 3);
  const col = new Float32Array(CLOUD_N * 3);
  const siz = new Float32Array(CLOUD_N);

  for (let i = 0; i < CLOUD_N; i++) {
    const i3  = i * 3;
    const r   = Math.pow(rand(), 0.85) * GAL_R * 0.85;
    const arm = i % ARM_N;
    const base  = (arm / ARM_N) * Math.PI * 2;
    const angle = base + r * SPIN * rr(0.8, 1.2) + rr(-0.5, 0.5);

    pos[i3]     = Math.cos(angle) * r;
    pos[i3 + 2] = Math.sin(angle) * r;
    pos[i3 + 1] = rr(-0.4, 0.4) * DISC_THICK * GAL_R * 0.6;

    const c = nebCol.clone().lerp(innerCol, rr(0, 0.3));
    const dim = rr(0.06, 0.18); // 雲氣稍亮一點點
    col[i3]     = c.r * dim;
    col[i3 + 1] = c.g * dim;
    col[i3 + 2] = c.b * dim;

    siz[i] = rr(2.5, 6.0) * (1 - (r / GAL_R) * 0.4);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
  return geo;
}

// ── Shaders ───────────────────────────────────────────────────────────────────
const vert = /* glsl */`
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (220.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const starFrag = /* glsl */`
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // 中心最亮，邊緣快速衰減 → 點狀感
    float a = pow(1.0 - d * 2.0, 2.5);
    gl_FragColor = vec4(vColor, a);
  }
`;
const cloudFrag = /* glsl */`
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.0, 0.5, d)) * 0.05;
    gl_FragColor = vec4(vColor, a);
  }
`;

const starMat = new THREE.ShaderMaterial({
  vertexShader: vert, fragmentShader: starFrag,
  vertexColors: true, transparent: true,
  depthWrite: false, blending: THREE.AdditiveBlending,
});
const cloudMat = new THREE.ShaderMaterial({
  vertexShader: vert, fragmentShader: cloudFrag,
  vertexColors: true, transparent: true,
  depthWrite: false, blending: THREE.AdditiveBlending,
});

const galaxyGroup = new THREE.Group();
galaxyGroup.add(new THREE.Points(buildClouds(), cloudMat));
galaxyGroup.add(new THREE.Points(buildStars(),  starMat));
scene.add(galaxyGroup);

// ── Post-processing（輕量 bloom，僅讓亮核發光，不爆白）──────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  PAL.bloom.strength,
  PAL.bloom.radius,
  PAL.bloom.threshold,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ── UI ────────────────────────────────────────────────────────────────────────
document.getElementById('meta').textContent =
  `${PAL.name}  ·  ${ARM_N} 臂  ·  ${(STAR_N / 1000).toFixed(0)}k 粒子`;

// ── 鍵盤互動 ─────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'r') { location.reload(); }
  if (k === 's') {
    composer.render();
    renderer.domElement.toBlob(blob => {
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `cosmos-${PAL.name}.png`,
      });
      a.click();
    });
  }
  if (k === 'escape') { camera.position.set(0, 5, 14); controls.reset(); }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ── 動畫 ─────────────────────────────────────────────────────────────────────
let t = 0;
(function animate() {
  requestAnimationFrame(animate);
  t += 0.0003;
  galaxyGroup.rotation.y = t;
  galaxyGroup.rotation.x = Math.sin(t * 0.25) * 0.03;
  controls.update();
  composer.render();
})();
