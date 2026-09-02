const rand = typeof fxrand === "function" ? fxrand : Math.random;

const SCENES = [
  {
    family: "Ridges",
    bg: ["#020713", "#07213a", "#123447"],
    colors: ["#55d6ff", "#86f1ff", "#d8f7ff", "#f7dfb5", "#74a99c", "#2f6f68"],
    glow: "#76d7d2",
    density: 1.22,
  },
  {
    family: "Mist",
    bg: ["#071827", "#123456", "#6fa9d3"],
    colors: ["#e7efe9", "#d5e7ef", "#b7d4e8", "#f1c7bd", "#f7eee0", "#5f9ecb"],
    glow: "#e8f8ff",
    density: 0.9,
  },
  {
    family: "Current",
    bg: ["#061716", "#0e2f31", "#163f45"],
    colors: ["#093a3e", "#146c72", "#2a9d8f", "#7cc8b8", "#d9c7a3", "#f3f7ec"],
    glow: "#9ff3e5",
    density: 1.06,
  },
  {
    family: "Tide",
    bg: ["#020b1a", "#06305b", "#0b6b82"],
    colors: ["#03045e", "#0077b6", "#00b4d8", "#48cae4", "#caf0f8", "#f7e7c6"],
    glow: "#7ee8ff",
    density: 1.12,
  },
  {
    family: "Curtain",
    bg: ["#030711", "#0a1430", "#112947"],
    colors: ["#88d9e6", "#5aa9e6", "#7fdbb6", "#b8f04a", "#8b8bae", "#e9f7ff"],
    glow: "#a5ffd6",
    density: 0.96,
  },
];

let scene;
let particles = [];
let pointer = { x: -9999, y: -9999, px: -9999, py: -9999, active: false, force: 0 };
let fieldSeed = 1;
let offscreen;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  colorMode(RGB, 255, 255, 255, 255);
  offscreen = createGraphics(width, height);
  offscreen.pixelDensity(pixelDensity());
  chooseScene();
  buildScene();
  setTimeout(function() {
    if (typeof fxpreview === "function") fxpreview();
  }, 900);
}

function chooseScene() {
  const base = pick(SCENES);
  fieldSeed = Math.floor(rand() * 1000000000) + 1;
  scene = {
    family: base.family,
    bg: jitterPalette(base.bg, 8),
    colors: jitterPalette(base.colors, 16),
    glow: base.glow,
    density: base.density * range(0.86, 1.28),
    particleScale: range(0.82, 1.34),
    veilCount: Math.floor(range(3, 8)),
    drift: range(0.7, 1.55),
    turbulence: range(0.75, 1.8),
    horizon: range(0.32, 0.58),
    curve: range(-0.22, 0.22),
    grain: rand() < 0.62 ? "Fine" : "Sparse",
  };

  window.$fxhashFeatures = {
    "Particle Field": scene.family,
    "Density": scene.density > 1.18 ? "High" : scene.density < 0.96 ? "Low" : "Medium",
    "Glow": scene.veilCount > 5 ? "Layered" : "Quiet",
    "Grain": scene.grain,
  };
}

function draw() {
  drawBackground();
  drawingContext.globalCompositeOperation = "lighter";
  updatePointer();

  const ctx = drawingContext;
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.update();
    p.draw(ctx);
  }

  ctx.globalCompositeOperation = "source-over";
  if (pointer.active) drawWake();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  offscreen = createGraphics(width, height);
  offscreen.pixelDensity(pixelDensity());
  buildScene();
}

function buildScene() {
  noiseSeed(fieldSeed);
  randomSeed(fieldSeed);
  particles = [];

  const baseCount = Math.max(2600, width * height / 225);
  const target = Math.floor(Math.min(7200, baseCount * scene.density));
  for (let i = 0; i < target; i += 1) {
    const home = sampleHome(i / target);
    if (home) particles.push(new Particle(home.x, home.y, home.c, home.size, home.depth));
  }
  drawTexture();
}

function sampleHome(t) {
  if (scene.family === "Ridges") return sampleRidges(t);
  if (scene.family === "Mist") return sampleMist(t);
  if (scene.family === "Current") return sampleCurrent(t);
  if (scene.family === "Tide") return sampleTide(t);
  return sampleCurtain(t);
}

function sampleRidges() {
  const x = random(width);
  const ridge = height * (0.58 + scene.curve) - noise(x * 0.0022, fieldSeed) * height * 0.26;
  const lightBand = height * 0.74 + sin(x * 0.006 + fieldSeed) * 30 + noise(x * 0.004, 9) * 55;
  const mist = random() < 0.46;
  const y = mist
    ? lightBand + randomGaussian(0, 28)
    : ridge + pow(random(), 1.7) * height * 0.38 + randomGaussian(0, 12);
  const snow = random() < 0.2 && y < height * 0.52;
  return {
    x,
    y,
    c: snow ? "#f8f1df" : random(scene.colors),
    size: random(1.8, mist ? 5.8 : 3.8) * scene.particleScale * rareScale(),
    depth: map(y, 0, height, 0.45, 1.4),
  };
}

function sampleMist() {
  const band = random([0.34, 0.46, 0.58, 0.68]);
  const x = random(width);
  const wave = sin(x * 0.006 + fieldSeed) * 28 + noise(x * 0.004, band * 8) * 80;
  const y = height * band + wave + randomGaussian(0, 34 + scene.turbulence * 12);
  return {
    x,
    y,
    c: random(scene.colors),
    size: random(1.4, 4.8) * scene.particleScale * (random() < 0.08 ? 2.4 : 1),
    depth: random(0.55, 1.35),
  };
}

function sampleCurrent() {
  const y = random(height * 0.18, height * 0.94);
  const center = width * 0.5 + sin(y * 0.009 + fieldSeed) * width * 0.18 + noise(y * 0.004) * width * 0.18 - width * 0.09;
  const widthAtY = map(y, height * 0.18, height, width * 0.05, width * 0.34);
  const x = center + randomGaussian(0, widthAtY);
  const bank = abs(x - center) > widthAtY * 0.72;
  return {
    x,
    y,
    c: bank ? random(["#d9c7a3", "#8aa08e", "#173b32"]) : random(scene.colors),
    size: random(0.9, bank ? 2.2 : 3.0) * scene.particleScale,
    depth: map(y, 0, height, 0.55, 1.5),
  };
}

function sampleTide() {
  const x = random(width);
  const horizon = height * scene.horizon;
  const layer = floor(random(8));
  const y = horizon + layer * height * 0.075 + sin(x * 0.01 + layer * 0.8 + fieldSeed) * (10 + layer * 3) + randomGaussian(0, 18 + layer * 5);
  const foam = random() < 0.19 || (layer > 5 && random() < 0.28);
  return {
    x,
    y,
    c: foam ? random(["#caf0f8", "#f7e7c6", "#ffffff"]) : random(scene.colors),
    size: random(0.8, foam ? 3.4 : 2.6) * scene.particleScale,
    depth: 0.55 + layer * 0.18,
  };
}

function sampleCurtain() {
  const x = random(width);
  const curtain = random([0.26, 0.38, 0.5]);
  const ribbon = height * curtain + sin(x * 0.008 + fieldSeed * 0.2) * 90 + noise(x * 0.003, curtain * 11) * 120;
  const y = ribbon + randomGaussian(0, 45 + random(60));
  return {
    x,
    y,
    c: random(scene.colors),
    size: random(0.9, 3.8) * scene.particleScale,
    depth: random(0.45, 1.25),
  };
}

class Particle {
  constructor(x, y, c, size, depth) {
    this.home = createVector(x, y);
    this.pos = createVector(x + randomGaussian(0, 18), y + randomGaussian(0, 18));
    this.vel = p5.Vector.random2D().mult(random(0.1, 0.8));
    this.rgb = hexToRgb(c);
    this.size = size;
    this.depth = depth;
    this.phase = random(TAU);
    this.alpha = random(165, 255);
  }

  update() {
    const homeForce = p5.Vector.sub(this.home, this.pos).mult(0.018 / this.depth);
    this.vel.add(homeForce);

    const d = dist(this.pos.x, this.pos.y, pointer.x, pointer.y);
    const radius = pointer.active ? 45 : 22;
    if (d < radius) {
      const away = p5.Vector.sub(this.pos, createVector(pointer.x, pointer.y));
      const strength = pow(1 - d / radius, 2) * (pointer.force + 5.5) * this.depth;
      away.setMag(strength);
      this.vel.add(away);

      const sweep = createVector(pointer.x - pointer.px, pointer.y - pointer.py).mult(0.018 * (1 - d / radius));
      this.vel.add(sweep);
    }

    const drift = noise(this.home.x * 0.004, this.home.y * 0.004, frameCount * 0.006 + fieldSeed) - 0.5;
    this.vel.x += drift * 0.035 * scene.drift;
    this.vel.y += sin(frameCount * 0.014 + this.phase) * 0.006 * scene.turbulence;
    this.vel.mult(0.91);
    this.pos.add(this.vel);
  }

  draw(ctx) {
    const twinkle = 0.72 + sin(frameCount * 0.035 + this.phase) * 0.28;
    const d = this.size * this.depth * (0.95 + twinkle * 0.45);
    ctx.fillStyle = `rgba(${this.rgb[0]},${this.rgb[1]},${this.rgb[2]},${(this.alpha * twinkle) / 255})`;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, d * 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (d > 3.8 || random() < 0.008) {
      ctx.fillStyle = `rgba(${this.rgb[0]},${this.rgb[1]},${this.rgb[2]},${(34 * twinkle) / 255})`;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, d * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function updatePointer() {
  pointer.force *= 0.88;
  if (!pointer.active) return;
  const speed = dist(pointer.x, pointer.y, pointer.px, pointer.py);
  pointer.force = min(18, 4 + speed * 0.42);
}

function mouseMoved() {
  setPointer(mouseX, mouseY, true);
}

function mouseDragged() {
  setPointer(mouseX, mouseY, true);
}

function touchStarted() {
  if (touches.length) setPointer(touches[0].x, touches[0].y, true);
  return false;
}

function touchMoved() {
  if (touches.length) setPointer(touches[0].x, touches[0].y, true);
  return false;
}

function touchEnded() {
  pointer.active = false;
  return false;
}

function setPointer(x, y, active) {
  pointer.px = pointer.x;
  pointer.py = pointer.y;
  pointer.x = x;
  pointer.y = y;
  pointer.active = active;
}

function drawBackground() {
  const ctx = drawingContext;
  ctx.globalCompositeOperation = "source-over";
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, scene.bg[0]);
  gradient.addColorStop(0.55, scene.bg[1]);
  gradient.addColorStop(1, scene.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  image(offscreen, 0, 0);
}

function drawWake() {
  const glow = hexToRgb(scene.glow);
  noFill();
  for (let i = 0; i < 3; i += 1) {
    stroke(glow[0], glow[1], glow[2], 34 - i * 9);
    strokeWeight(1);
    circle(pointer.x, pointer.y, 72 + i * 48 + pointer.force * 6);
  }
}

function drawTexture() {
  offscreen.clear();
  offscreen.noStroke();
  const count = scene.grain === "Fine" ? 1150 : 620;
  for (let i = 0; i < count; i += 1) {
    offscreen.fill(255, random(2, 7));
    offscreen.circle(random(width), random(height), random(0.5, 2.2));
  }
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveCanvas(`nature-particles-${fxhash.slice(0, 8)}-${Date.now()}`, "png");
  }
}

function pick(items) {
  return items[Math.floor(rand() * items.length)];
}

function range(minValue, maxValue) {
  return minValue + rand() * (maxValue - minValue);
}

function rareScale() {
  return random() < 0.035 ? random(2.4, 4.8) : 1;
}

function jitterPalette(colors, amount) {
  return colors.map(function(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHex(
      clampColor(rgb[0] + Math.floor(range(-amount, amount))),
      clampColor(rgb[1] + Math.floor(range(-amount, amount))),
      clampColor(rgb[2] + Math.floor(range(-amount, amount)))
    );
  });
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(function(value) {
    return value.toString(16).padStart(2, "0");
  }).join("");
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}
