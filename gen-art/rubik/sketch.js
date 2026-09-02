import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Sticker colors ────────────────────────────────────────────────────────────
// Face group order in BoxGeometry: +x, -x, +y, -y, +z, -z
// Face map: R(+x)=red  O(-x)=orange  W(+y)=white  Y(-y)=yellow  B(+z)=blue  G(-z)=green
const COLOR = {
  W: 0xf5f2ec,   // white  (U top)
  Y: 0xffd600,   // yellow (D bottom)
  R: 0xcc1500,   // red    (R right)
  O: 0xff6600,   // orange (L left)
  B: 0x0052cc,   // blue   (F front)
  G: 0x009922,   // green  (B back)
  X: 0x111111,   // inner
};
const MAT = {};
for (const [k, v] of Object.entries(COLOR))
  MAT[k] = new THREE.MeshStandardMaterial({ color: v, roughness: 0.55, metalness: 0.02 });

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
scene.background = new THREE.Color('#0a0a0a');

const camera = new THREE.PerspectiveCamera(36, innerWidth/innerHeight, 0.1, 100);
camera.position.set(5.2, 4.0, 6.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// Subtle floor grid
const grid = new THREE.GridHelper(24, 24, '#1a1a1a', '#151515');
grid.position.y = -2.8; scene.add(grid);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(6, 10, 8); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
sun.shadow.camera.left = sun.shadow.camera.bottom = -5;
sun.shadow.camera.right = sun.shadow.camera.top = 5;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x7788cc, 0.4);
rim.position.set(-6, -4, -7); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(-3, 5, -4); scene.add(fill);

// ── Pieces (27 cubies) ────────────────────────────────────────────────────────
const PIECE = 0.920;  // cubie size (< 1 gives inter-piece gap)
const pieces = [];
const geo = new THREE.BoxGeometry(PIECE, PIECE, PIECE);

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      // BoxGeometry group order: +x=0  -x=1  +y=2  -y=3  +z=4  -z=5
      const mats = [
        MAT[x === 1  ? 'R' : 'X'],
        MAT[x === -1 ? 'O' : 'X'],
        MAT[y === 1  ? 'W' : 'X'],
        MAT[y === -1 ? 'Y' : 'X'],
        MAT[z === 1  ? 'B' : 'X'],
        MAT[z === -1 ? 'G' : 'X'],
      ];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      pieces.push(mesh);
    }
  }
}

// ── Move definitions ──────────────────────────────────────────────────────────
// Rotation derivation (right-hand rule):
// U CW from top  = -90° around Y   → (x,y,z)→(z,y,-x)
// D CW from bot  = +90° around Y   → (x,y,z)→(-z,y,x)
// R CW from right= -90° around X   → (x,y,z)→(x,z,-y)
// L CW from left = +90° around X   → (x,y,z)→(x,-z,y)
// F CW from front= -90° around Z   → (x,y,z)→(y,-x,z)
// B CW from back = +90° around Z   → (x,y,z)→(-y,x,z)
const AX = {
  Y: new THREE.Vector3(0,1,0),
  X: new THREE.Vector3(1,0,0),
  Z: new THREE.Vector3(0,0,1),
};
const MOVES = {
  'U':  { ax:AX.Y, coord:'y', val:1,  angle:-Math.PI/2 },
  "U'": { ax:AX.Y, coord:'y', val:1,  angle:Math.PI/2  },
  'U2': { ax:AX.Y, coord:'y', val:1,  angle:-Math.PI   },
  'D':  { ax:AX.Y, coord:'y', val:-1, angle:Math.PI/2  },
  "D'": { ax:AX.Y, coord:'y', val:-1, angle:-Math.PI/2 },
  'D2': { ax:AX.Y, coord:'y', val:-1, angle:Math.PI    },
  'R':  { ax:AX.X, coord:'x', val:1,  angle:-Math.PI/2 },
  "R'": { ax:AX.X, coord:'x', val:1,  angle:Math.PI/2  },
  'R2': { ax:AX.X, coord:'x', val:1,  angle:-Math.PI   },
  'L':  { ax:AX.X, coord:'x', val:-1, angle:Math.PI/2  },
  "L'": { ax:AX.X, coord:'x', val:-1, angle:-Math.PI/2 },
  'L2': { ax:AX.X, coord:'x', val:-1, angle:Math.PI    },
  'F':  { ax:AX.Z, coord:'z', val:1,  angle:-Math.PI/2 },
  "F'": { ax:AX.Z, coord:'z', val:1,  angle:Math.PI/2  },
  'F2': { ax:AX.Z, coord:'z', val:1,  angle:-Math.PI   },
  'B':  { ax:AX.Z, coord:'z', val:-1, angle:Math.PI/2  },
  "B'": { ax:AX.Z, coord:'z', val:-1, angle:-Math.PI/2 },
  'B2': { ax:AX.Z, coord:'z', val:-1, angle:Math.PI    },
};
const ALL_MOVE_NAMES = Object.keys(MOVES);

// ── Scramble / Solve helpers ──────────────────────────────────────────────────
function generateScramble(n = 22) {
  const seq = []; let lastFace = '';
  while (seq.length < n) {
    const m = ALL_MOVE_NAMES[Math.floor(Math.random() * ALL_MOVE_NAMES.length)];
    if (m[0] !== lastFace) { seq.push(m); lastFace = m[0]; }
  }
  return seq;
}

function invertMove(m) {
  if (m.length === 2 && m[1] === '2') return m;       // 180° is self-inverse
  if (m.length === 2 && m[1] === "'") return m[0];    // X' → X
  return m + "'";                                      // X  → X'
}

// ── Easing ────────────────────────────────────────────────────────────────────
const easeInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

// ── Animate a single move ─────────────────────────────────────────────────────
let isAnimating = false;

function animateMove(moveName, duration) {
  return new Promise(resolve => {
    const { ax, coord, val, angle } = MOVES[moveName];

    // Collect the 9 pieces in this layer
    const layer = pieces.filter(p => Math.round(p.position[coord]) === val);

    // Pivot group at origin
    const pivot = new THREE.Group();
    scene.add(pivot);
    layer.forEach(p => pivot.attach(p));  // preserves world transform

    const startTime = performance.now();

    function tick() {
      const raw = (performance.now() - startTime) / duration;
      const t   = easeInOut(Math.min(raw, 1.0));
      pivot.setRotationFromAxisAngle(ax, angle * t);

      if (raw < 1.0) {
        requestAnimationFrame(tick);
      } else {
        // Finalize: detach pieces, snap positions to integer grid
        layer.forEach(p => {
          scene.attach(p);
          p.position.set(
            Math.round(p.position.x),
            Math.round(p.position.y),
            Math.round(p.position.z),
          );
        });
        scene.remove(pivot);
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

// ── Move queue & sequencer ────────────────────────────────────────────────────
const moveQueue = [];   // { name, duration, gap }
let onQueueEmpty = null;

function enqueue(moves, duration, gap) {
  moves.forEach(name => moveQueue.push({ name, duration, gap }));
}

function processQueue() {
  if (isAnimating || moveQueue.length === 0) {
    if (!isAnimating && moveQueue.length === 0 && onQueueEmpty) {
      const cb = onQueueEmpty; onQueueEmpty = null;
      cb();
    }
    return;
  }
  isAnimating = true;
  const { name, duration, gap } = moveQueue.shift();
  advanceChip(name);
  animateMove(name, duration).then(() => {
    isAnimating = false;
    setTimeout(processQueue, gap);
  });
}

// ── UI elements ───────────────────────────────────────────────────────────────
const seqBar      = document.getElementById('seq-bar');
const phaseLabel  = document.getElementById('phase-label');
const moveInfo    = document.getElementById('move-info');
const moveCounter = document.getElementById('move-counter');
const solvedFlash = document.getElementById('solved-flash');

let chipEls   = [];
let chipIndex = 0;

function buildChips(moves) {
  seqBar.innerHTML = '';
  chipEls = moves.map(m => {
    const el = document.createElement('span');
    el.className = 'chip';
    el.textContent = m;
    seqBar.appendChild(el);
    return el;
  });
  chipIndex = 0;
}

function advanceChip(name) {
  // Mark previous as done
  if (chipIndex > 0) chipEls[chipIndex-1]?.classList.replace('current', 'done');
  if (chipIndex < chipEls.length) {
    chipEls[chipIndex].classList.add('current');
    moveInfo.textContent = chipEls[chipIndex].textContent;
    moveCounter.textContent = `${chipIndex + 1} / ${chipEls.length}`;
    chipIndex++;
  }
}

function flashSolved() {
  solvedFlash.style.background = 'rgba(255,255,255,0.18)';
  setTimeout(() => solvedFlash.style.background = 'rgba(255,255,255,0)', 350);
}

// ── Phase control ─────────────────────────────────────────────────────────────
let scramble = [];

function runScramble() {
  scramble = generateScramble(22);
  buildChips(scramble);
  phaseLabel.textContent = 'SCRAMBLING';
  moveInfo.textContent = '';
  moveCounter.textContent = '';
  controls.autoRotate = false;

  enqueue(scramble, 240, 20);
  onQueueEmpty = () => {
    // Mark last chip done
    if (chipEls.length) chipEls[chipEls.length-1].classList.replace('current', 'done');
    phaseLabel.textContent = 'ANALYZING . . .';
    moveInfo.textContent = '';
    moveCounter.textContent = '';
    controls.autoRotate = true;
    setTimeout(runSolve, 1600);
  };
  processQueue();
}

function runSolve() {
  const solution = scramble.slice().reverse().map(invertMove);
  buildChips(solution);
  phaseLabel.textContent = 'SOLVING';
  moveInfo.textContent = '';
  moveCounter.textContent = '';
  controls.autoRotate = false;

  enqueue(solution, 320, 40);
  onQueueEmpty = () => {
    if (chipEls.length) chipEls[chipEls.length-1].classList.replace('current', 'done');
    phaseLabel.textContent = 'SOLVED ✓';
    moveInfo.textContent = '';
    moveCounter.textContent = '';
    flashSolved();
    controls.autoRotate = true;
    seqBar.innerHTML = '';
    setTimeout(runScramble, 3200);
  };
  processQueue();
}

// ── OrbitControls ─────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.55;
controls.minDistance     = 4;
controls.maxDistance     = 18;
controls.enablePan       = false;
controls.target.set(0, 0, 0);

renderer.domElement.addEventListener('pointerdown', () => {
  if (!isAnimating) controls.autoRotate = false;
});
renderer.domElement.addEventListener('pointerup', () => {
  if (!isAnimating) controls.autoRotate = true;
});

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Keyboard: S saves screenshot ──────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 's') {
    renderer.domElement.toBlob(blob =>
      Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob), download: 'auto-rubik.png',
      }).click()
    );
  }
});

// ── Render loop ───────────────────────────────────────────────────────────────
(function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
})();

// ── Start ─────────────────────────────────────────────────────────────────────
setTimeout(runScramble, 600);
