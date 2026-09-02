// Impossible Staircase - fxhash / p5.js generative art

const rand = () => (typeof $fx !== "undefined" && $fx.rand ? $fx.rand() : Math.random());
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const range = (a, b) => a + rand() * (b - a);
const chance = (p) => rand() < p;

const palettes = [
  {
    name: "Graphite",
    bg: "#d4d4cf",
    paper: "#c9c9c4",
    top: "#deded9",
    left: "#b8b8b2",
    right: "#ababA5",
    ink: "#3b3b38",
    pale: "#eeeeea",
    ribbon: "#393936",
    ribbonSide: "#252522",
  },
  {
    name: "Blueprint Ash",
    bg: "#c8ced0",
    paper: "#d7dcdd",
    top: "#e8ecec",
    left: "#b4bdc0",
    right: "#9fa9ad",
    ink: "#344048",
    pale: "#f4f6f6",
    ribbon: "#2f3940",
    ribbonSide: "#20272c",
  },
  {
    name: "Concrete",
    bg: "#bebdb7",
    paper: "#d2d0c8",
    top: "#e0ded6",
    left: "#aaa8a1",
    right: "#96948e",
    ink: "#363633",
    pale: "#efede5",
    ribbon: "#3f3e39",
    ribbonSide: "#292824",
  },
  {
    name: "Silver Print",
    bg: "#e4e3df",
    paper: "#d7d6d0",
    top: "#f1f0eb",
    left: "#c4c3bd",
    right: "#b0afa9",
    ink: "#4a4a46",
    pale: "#fbfaf5",
    ribbon: "#454540",
    ribbonSide: "#30302c",
  },
];

const densities = [
  { name: "Open", cell: 3.85, span: 18, detail: 0.78 },
  { name: "Dense", cell: 3.2, span: 23, detail: 1.0 },
  { name: "Labyrinth", cell: 2.75, span: 28, detail: 1.22 },
];

const ribbonCounts = [4, 5];
const palette = pick(palettes);
const density = pick(densities);
const ribbonCount = pick(ribbonCounts);
const stairBias = pick(["Clockwise", "Counter-clockwise", "Crossed"]);
const voidStyle = pick(["Round Wells", "Arches", "Silent Blocks"]);

if (typeof $fx !== "undefined" && $fx.features) {
  $fx.features({
    "Palette": palette.name,
    "Density": density.name,
    "Ribbon Paths": ribbonCount,
    "Stair Bias": stairBias,
    "Voids": voidStyle,
  });
}

let pg;
let W = 900;
let H = 1350;
let S = 26;
let ux;
let uy;
let camX;
let camY;
let modules = [];
let ribbons = [];
let previewDone = false;

function setup() {
  setCanvasSize();
  createCanvas(W, H);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  pg = createGraphics(W, H);
  pg.pixelDensity(pixelDensity());
  noLoop();
  buildScene();
}

function draw() {
  renderScene();
  image(pg, 0, 0);
  if (!previewDone) {
    previewDone = true;
    setTimeout(() => {
      if (typeof $fx !== "undefined" && $fx.preview) $fx.preview();
      else if (typeof fxpreview === "function") fxpreview();
    }, 250);
  }
}

function windowResized() {
  setCanvasSize();
  resizeCanvas(W, H);
  pg = createGraphics(W, H);
  pg.pixelDensity(pixelDensity());
  buildScene();
  redraw();
}

function keyPressed() {
  if (key === "s" || key === "S") saveCanvas("impossible-staircase", "png");
}

function setCanvasSize() {
  const ratio = 2 / 3;
  const byWidth = windowWidth;
  const byHeight = windowHeight * ratio;
  W = Math.floor(Math.min(byWidth, byHeight));
  H = Math.floor(W / ratio);
}

function isoSetup() {
  S = W / 34;
  ux = Math.cos(Math.PI / 6) * S;
  uy = Math.sin(Math.PI / 6) * S;
  camX = W * 0.5;
  camY = H * 0.18;
}

function P(x, y, z) {
  return createVector(camX + (x - y) * ux, camY + (x + y) * uy - z * S);
}

function buildScene() {
  isoSetup();
  modules = [];
  ribbons = [];

  for (let gy = -density.span; gy <= density.span; gy++) {
    for (let gx = -density.span; gx <= density.span; gx++) {
      const x = gx * density.cell;
      const y = gy * density.cell;
      const center = P(x + 1.5, y + 1.5, 0);
      if (center.x < -W * 0.16 || center.x > W * 1.16 || center.y < -H * 0.1 || center.y > H * 1.08) continue;
      if (noiseLike(gx, gy) < 0.12) continue;

      const d = Math.abs(gx) + Math.abs(gy);
      const baseZ = Math.floor((Math.sin((gx - gy) * 0.65) + 1) * 0.9 + rand() * 2.5) * 0.45;
      const roll = rand();
      const sum = gx + gy;
      const salt = rand();

      if (roll < 0.47 * density.detail) {
        const dir = chooseStairDir(gx, gy);
        const n = Math.floor(range(3, 7));
        const w = range(1.05, 1.85);
        modules.push({ sum, z: baseZ, draw: () => drawStairs(x, y, baseZ, dir, n, w, salt) });
      } else if (roll < 0.68) {
        const a = range(1.7, 3.2);
        const b = range(1.7, 3.2);
        const h = range(0.7, 2.4);
        modules.push({ sum, z: baseZ + h, draw: () => cuboid(x, y, baseZ + h, a, b, h, {
          hole: voidStyle === "Round Wells" && chance(0.28),
          arch: voidStyle === "Arches" && chance(0.34) ? pick(["left", "right"]) : null,
          hatch: chance(0.35),
        }) });
      } else if (roll < 0.85) {
        modules.push({ sum, z: baseZ, draw: () => drawTerrace(x, y, baseZ, range(2.2, 3.4), salt) });
      } else {
        modules.push({ sum, z: baseZ, draw: () => drawTower(x, y, baseZ, salt) });
      }
    }
  }

  modules.sort((a, b) => (a.sum - b.sum) || (a.z - b.z));
  buildRibbons();
}

function chooseStairDir(gx, gy) {
  if (stairBias === "Clockwise") return gx + gy > 0 ? "x" : "y";
  if (stairBias === "Counter-clockwise") return gx - gy > 0 ? "y" : "x";
  return Math.abs(gx) % 2 === Math.abs(gy) % 2 ? "x" : "y";
}

function noiseLike(a, b) {
  return fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
}

function fract(v) {
  return v - Math.floor(v);
}

function renderScene() {
  pg.background(palette.bg);
  drawPaperGrain();
  drawBorderGrid();

  for (const m of modules) m.draw();
  for (const ribbon of ribbons) drawRibbon(ribbon);
  drawImpossibleLoops();
  drawVignette();
}

function drawPaperGrain() {
  pg.noStroke();
  for (let i = 0; i < W * H / 950; i++) {
    const a = range(10, 28);
    pg.fill(chance(0.5) ? 255 : 40, a);
    pg.circle(range(0, W), range(0, H), range(0.4, 1.2));
  }
}

function drawBorderGrid() {
  pg.stroke(palette.ink + "22");
  pg.strokeWeight(Math.max(0.6, W / 900));
  for (let i = -20; i <= 20; i++) {
    const a = P(i * 3, -60, 0);
    const b = P(i * 3, 60, 0);
    pg.line(a.x, a.y, b.x, b.y);
    const c = P(-60, i * 3, 0);
    const d = P(60, i * 3, 0);
    pg.line(c.x, c.y, d.x, d.y);
  }
}

function poly(points, fillColor, strokeColor = palette.ink) {
  if (fillColor) {
    pg.fill(fillColor);
    pg.noStroke();
    pg.beginShape();
    for (const p of points) pg.vertex(p.x, p.y);
    pg.endShape(CLOSE);
  }
  if (strokeColor) {
    pg.noFill();
    pg.stroke(strokeColor);
    pg.strokeWeight(Math.max(1, W / 760));
    pg.beginShape();
    for (const p of points) pg.vertex(p.x, p.y);
    pg.endShape(CLOSE);
  }
}

function cuboid(x, y, z, a, b, h, opts = {}) {
  const top = [P(x, y, z), P(x + a, y, z), P(x + a, y + b, z), P(x, y + b, z)];
  const right = [P(x + a, y, z), P(x + a, y + b, z), P(x + a, y + b, z - h), P(x + a, y, z - h)];
  const left = [P(x, y + b, z), P(x + a, y + b, z), P(x + a, y + b, z - h), P(x, y + b, z - h)];
  poly(left, palette.left);
  poly(right, palette.right);
  poly(top, palette.top);
  if (opts.hole) drawHole(x, y, z, a, b);
  if (opts.arch) drawArch(x, y, z, a, b, h, opts.arch);
  if (opts.hatch) drawHatching(top, chance(0.5));
}

function drawStairs(x, y, z, dir, n, w, salt) {
  for (let k = 0; k < n; k++) {
    const rise = (k + 1) * 0.43;
    const offset = Math.sin(salt * 9 + k) * 0.04;
    if (dir === "x") cuboid(x + k + offset, y, z + rise, 1, w, rise + 0.02, { hatch: k % 2 === 0 && chance(0.5) });
    else cuboid(x, y + k + offset, z + rise, w, 1, rise + 0.02, { hatch: k % 2 === 0 && chance(0.5) });
  }
}

function drawTerrace(x, y, z, base, salt) {
  for (let k = 0; k < 3; k++) {
    const s = base - k * 0.55;
    const off = k * 0.28;
    cuboid(x + off, y + off, z + (k + 1) * 0.42, s, s, 0.42, {
      hole: k === 2 && voidStyle === "Round Wells" && salt > 0.54,
    });
  }
}

function drawTower(x, y, z, salt) {
  const a = range(1.25, 2.1);
  const b = range(1.25, 2.1);
  const h = range(1.8, 3.7);
  cuboid(x, y, z + h, a, b, h, {
    arch: voidStyle === "Arches" && salt > 0.45 ? pick(["left", "right"]) : null,
    hatch: true,
  });
  if (salt > 0.58) cuboid(x + a * 0.23, y + b * 0.23, z + h + 0.5, a * 0.54, b * 0.54, 0.5);
}

function drawHole(x, y, z, a, b) {
  const c = P(x + a * 0.5, y + b * 0.5, z + 0.01);
  pg.push();
  pg.translate(c.x, c.y);
  pg.rotate(Math.PI / 4);
  pg.fill(palette.ink);
  pg.stroke(palette.ink);
  pg.strokeWeight(Math.max(1, W / 850));
  pg.ellipse(0, 0, Math.min(a, b) * S * 0.75, Math.min(a, b) * S * 0.34);
  pg.pop();
}

function drawArch(x, y, z, a, b, h, side) {
  const pts = [];
  const w = Math.min(a, b) * 0.62;
  const archH = h * 0.62;
  if (side === "right") {
    const yy = y + b * 0.5 - w * 0.5;
    pts.push(P(x + a + 0.01, yy, z - h));
    pts.push(P(x + a + 0.01, yy, z - h + archH * 0.55));
    for (let t = 0; t <= 1; t += 0.12) {
      const th = Math.PI * (1 - t);
      pts.push(P(x + a + 0.01, yy + w * 0.5 + Math.cos(th) * w * 0.5, z - h + archH * 0.55 + Math.sin(th) * archH * 0.45));
    }
    pts.push(P(x + a + 0.01, yy + w, z - h));
  } else {
    const xx = x + a * 0.5 - w * 0.5;
    pts.push(P(xx, y + b + 0.01, z - h));
    pts.push(P(xx, y + b + 0.01, z - h + archH * 0.55));
    for (let t = 0; t <= 1; t += 0.12) {
      const th = Math.PI * (1 - t);
      pts.push(P(xx + w * 0.5 + Math.cos(th) * w * 0.5, y + b + 0.01, z - h + archH * 0.55 + Math.sin(th) * archH * 0.45));
    }
    pts.push(P(xx + w, y + b + 0.01, z - h));
  }
  poly(pts, palette.ink, palette.ink);
}

function drawHatching(face, flip) {
  pg.stroke(palette.ink + "55");
  pg.strokeWeight(Math.max(0.55, W / 1500));
  const steps = 4;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const a = p5.Vector.lerp(face[flip ? 0 : 1], face[flip ? 3 : 2], t);
    const b = p5.Vector.lerp(face[flip ? 1 : 0], face[flip ? 2 : 3], t);
    pg.line(a.x, a.y, b.x, b.y);
  }
}

function buildRibbons() {
  const routes = [
    { x: -14, y: -4, z: 5.6, steps: [["x", 1, 8], ["y", 1, 6], ["x", -1, 5], ["y", 1, 5], ["x", 1, 5]] },
    { x: 5, y: -14, z: 6.2, steps: [["y", 1, 8], ["x", -1, 6], ["y", 1, 6], ["x", 1, 4], ["y", 1, 4]] },
    { x: -11, y: 9, z: 5.2, steps: [["x", 1, 8], ["y", -1, 5], ["x", 1, 6], ["y", 1, 6], ["x", -1, 4]] },
    { x: 13, y: 2, z: 6.0, steps: [["x", -1, 9], ["y", 1, 6], ["x", 1, 5], ["y", 1, 5], ["x", -1, 5]] },
    { x: -3, y: 17, z: 5.5, steps: [["x", 1, 8], ["y", -1, 6], ["x", -1, 5], ["y", 1, 5], ["x", 1, 4]] },
  ];
  for (let i = 0; i < ribbonCount; i++) {
    let { x, y, z, steps } = routes[i];
    const path = [];
    for (let k = 0; k < steps.length; k++) {
      const [axis, sign, len] = steps[k];
      for (let j = 0; j < len; j++) {
        path.push({ x, y, z: z + Math.sin((i + 1) * 0.9 + j * 0.45) * 0.18 });
        if (axis === "x") x += sign;
        else y += sign;
      }
      z += k % 2 === 0 ? 0.48 : -0.26;
    }
    ribbons.push(path);
  }
}

function drawRibbon(path) {
  const widthU = 0.88;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    let p1;
    let p2;
    let p3;
    let p4;
    if (dx !== 0) {
      p1 = P(a.x, a.y - widthU, a.z + 0.05);
      p2 = P(b.x, b.y - widthU, b.z + 0.05);
      p3 = P(b.x, b.y + widthU, b.z + 0.05);
      p4 = P(a.x, a.y + widthU, a.z + 0.05);
    } else {
      p1 = P(a.x - widthU, a.y, a.z + 0.05);
      p2 = P(b.x - widthU, b.y, b.z + 0.05);
      p3 = P(b.x + widthU, b.y, b.z + 0.05);
      p4 = P(a.x + widthU, a.y, a.z + 0.05);
    }
    poly([p1, p2, p3, p4], i % 5 === 0 ? palette.ribbonSide : palette.ribbon, palette.ink);
    if (i % 3 === 0) {
      pg.stroke(palette.pale + "66");
      pg.strokeWeight(Math.max(0.8, W / 900));
      const c1 = p5.Vector.lerp(p1, p4, 0.34);
      const c2 = p5.Vector.lerp(p2, p3, 0.34);
      pg.line(c1.x, c1.y, c2.x, c2.y);
    }
  }
}

function drawImpossibleLoops() {
  pg.noFill();
  pg.stroke(palette.ink);
  pg.strokeWeight(Math.max(1.2, W / 700));
  for (let k = 0; k < 3; k++) {
    const r = 4.5 + k * 3.1;
    const z = 3.5 + k * 0.8;
    const pts = [
      P(-r, -r, z),
      P(r, -r, z + 1.3),
      P(r, r, z + 0.2),
      P(-r, r, z + 1.5),
      P(-r, -r, z),
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      pg.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
  }
}

function drawVignette() {
  pg.noFill();
  for (let i = 0; i < 28; i++) {
    pg.stroke(0, 3);
    pg.strokeWeight(W * 0.015);
    pg.rect(i * 2, i * 2, W - i * 4, H - i * 4);
  }
  pg.stroke(palette.ink);
  pg.strokeWeight(Math.max(2, W / 360));
  pg.noFill();
  pg.rect(W * 0.035, H * 0.035, W * 0.93, H * 0.93);
}
