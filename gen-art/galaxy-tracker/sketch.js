const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d", { alpha: false });
const rand = typeof fxrand === "function" ? fxrand : Math.random;

const PALETTES = [
  {
    name: "Ion",
    bg: ["#020308", "#07111f", "#0a2132"],
    colors: ["#f8fbff", "#9bf6ff", "#3a86ff", "#76f7c8", "#f6d365"],
    halo: "#73f7ff",
  },
  {
    name: "Ember",
    bg: ["#050203", "#1d0709", "#35120a"],
    colors: ["#fff5d6", "#ffcf70", "#ff7a3d", "#f94144", "#6ef3d6"],
    halo: "#ffb85c",
  },
  {
    name: "Violet",
    bg: ["#05030b", "#111029", "#241447"],
    colors: ["#f6eaff", "#c77dff", "#7b2cff", "#55d6ff", "#ffd6a5"],
    halo: "#bd8cff",
  },
  {
    name: "Chlorine",
    bg: ["#010503", "#071912", "#0d2b23"],
    colors: ["#f8ffe5", "#b8f35d", "#5ee4a6", "#37c2ff", "#ffe08a"],
    halo: "#8effb7",
  },
  {
    name: "Mono",
    bg: ["#030303", "#0d0e12", "#1d2129"],
    colors: ["#ffffff", "#d7e3f4", "#8ca0bd", "#f2c879", "#8ff0e3"],
    halo: "#e8f2ff",
  },
];

let W = 0;
let H = 0;
let DPR = 1;
let config;
let particles = [];
let rings = [];
let spokes = [];
let started = false;

// 拖動狀態
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let rotationAngle = 0;
let tiltAngle = 0; // 傾斜角度（垂直方向）
let dragStartRotation = 0;
let dragStartTilt = 0;
let cameraYaw = 0;
let cameraPitch = 0;
let targetYaw = 0;
let targetPitch = 0;
let travel = 0;
let cameraZoom = 1;
let targetZoom = 1;
const MIN_ZOOM = 0.56;
const MAX_ZOOM = 2.45;
const ZOOM_STEP = 1.18;
const DEPTH_STREAM_SPAN = 1400;
const activePointers = new Map();
let pinchStartDistance = 0;
let pinchStartZoom = 1;

function setup() {
  config = makeConfig();
  resize();
  window.addEventListener("resize", resize);
  
  // 拖動事件 - 確保 canvas 存在
  if (canvas) {
    // Pointer 事件（包括滑鼠和觸控）
    canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
    canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
    canvas.addEventListener("pointerup", handlePointerUp, { passive: true });
    canvas.addEventListener("pointercancel", handlePointerUp, { passive: true });
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    
    // Touch 事件作為備用
    canvas.addEventListener("touchstart", function(e) {
      if (e.touches.length === 2) {
        startTouchPinch(e);
        e.preventDefault();
        return;
      }
      handlePointerDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: function() { e.preventDefault(); } });
    }, { passive: false });
    canvas.addEventListener("touchmove", function(e) {
      if (e.touches.length === 2) {
        handleTouchPinch(e);
        e.preventDefault();
        return;
      }
      handlePointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: function() { e.preventDefault(); } });
    }, { passive: false });
    canvas.addEventListener("touchend", handlePointerUp, { passive: true });
    canvas.addEventListener("touchcancel", handlePointerUp, { passive: true });
    
    canvas.style.cursor = "grab";
  }

  window.addEventListener("keydown", handleKeyDown);
  
  requestAnimationFrame(draw);
  setTimeout(function() {
    if (typeof fxpreview === "function") fxpreview();
  }, 700);
}

function makeConfig() {
  const palette = pick(PALETTES);
  const mode = pick(["Pulse", "Orbit", "Bloom", "Spiral"]);
  const originBias = pick(["Centered", "Low", "High", "Off Axis"]);
  const density = range(0.84, 1.28);
  const twist = signedRange(0.16, 0.74);
  const filamentCount = Math.floor(range(42, 92));

  window.$fxhashFeatures = {
    "Spectrum": palette.name,
    "Motion": mode,
    "Origin": originBias,
    "Density": density > 1.12 ? "High" : density < 0.94 ? "Low" : "Medium",
    "Filaments": filamentCount > 70 ? "Many" : "Quiet",
  };

  return {
    palette,
    mode,
    originBias,
    density,
    twist,
    filamentCount,
    ringCount: Math.floor(range(5, 10)),
    drift: range(0.45, 1.35),
    pulse: range(0.55, 1.4),
    grain: rand() < 0.65,
    seedPhase: range(0, Math.PI * 2),
  };
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  build();
}

function build() {
  particles = [];
  rings = [];
  spokes = [];

  const origin = getOrigin();
  const maxR = Math.hypot(Math.max(origin.x, W - origin.x), Math.max(origin.y, H - origin.y));
  const count = Math.floor(Math.min(7600, Math.max(2400, W * H / 170) * config.density));

  for (let i = 0; i < count; i += 1) {
    particles.push(makeParticle(origin, maxR, i / count));
  }

  for (let i = 0; i < config.ringCount; i += 1) {
    rings.push({
      r: maxR * range(0.08, 0.9),
      width: range(0.5, 2.4),
      speed: range(0.08, 0.3),
      alpha: range(0.08, 0.24),
      wobble: range(0.008, 0.026),
    });
  }

  for (let i = 0; i < config.filamentCount; i += 1) {
    spokes.push({
      a: range(0, Math.PI * 2),
      len: maxR * range(0.32, 1.02),
      curl: signedRange(0.12, 0.68),
      color: pick(config.palette.colors),
      alpha: range(0.12, 0.46),
      width: range(0.35, 1.35),
    });
  }
}

function makeParticle(origin, maxR, t) {
  const arm = Math.floor(range(0, 9));
  const radius = maxR * Math.pow(rand(), config.mode === "Bloom" ? 1.85 : 1.28);
  const base = arm * Math.PI * 2 / 9 + config.seedPhase;
  const angle = base + radius * 0.006 * config.twist + signedRange(0, 0.55);
  const depth = range(0.35, 1.45);
  return {
    homeA: angle,
    homeR: radius,
    a: angle + signedRange(0, 0.2),
    r: radius * range(0.96, 1.04),
    size: range(0.45, 2.3) * (rand() < 0.045 ? range(1.8, 3.8) : 1),
    color: pick(config.palette.colors),
    alpha: range(0.34, 0.94),
    phase: range(0, Math.PI * 2),
    speed: range(0.08, 0.8) / depth,
    depth,
    ox: signedRange(0, 16),
    oy: signedRange(0, 16),
    t,
  };
}

function draw(now) {
  const time = now * 0.001;
  updateCamera(time);
  const origin = getOrigin(time);
  drawBackground(origin, time);
  drawDepthStreams(origin, time);
  drawRings(origin, time);
  drawFilaments(origin, time);
  drawParticles(origin, time);
  drawCore(origin, time);
  if (config.grain) drawGrain(time);

  if (!started) {
    started = true;
    if (typeof fxpreview === "function") fxpreview();
  }
  requestAnimationFrame(draw);
}

function updateCamera(time) {
  if (!isDragging) {
    targetYaw += Math.sin(time * 0.31 + config.seedPhase) * 0.0007;
    targetPitch += (Math.sin(time * 0.23 + config.seedPhase) * 0.16 - targetPitch) * 0.012;
  }
  cameraYaw += (targetYaw - cameraYaw) * 0.12;
  cameraPitch += (targetPitch - cameraPitch) * 0.12;
  cameraZoom += (targetZoom - cameraZoom) * 0.14;
  rotationAngle = cameraYaw;
  tiltAngle = cameraPitch;
  travel = time * (120 + config.drift * 90);
}

function drawBackground(origin, time) {
  const g = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, Math.max(W, H));
  g.addColorStop(0, config.palette.bg[2]);
  g.addColorStop(0.46, config.palette.bg[1]);
  g.addColorStop(1, config.palette.bg[0]);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W * 0.5, H * 0.48, Math.min(W, H) * 0.08, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = config.palette.halo;
  ctx.lineWidth = 1;
  const scanGap = Math.max(18, Math.min(W, H) / 34);
  for (let y = (time * 8) % scanGap; y < H; y += scanGap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + Math.sin(time + y * 0.03) * 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function projectPoint(x, y, z, origin) {
  const cy = Math.cos(cameraYaw);
  const sy = Math.sin(cameraYaw);
  const cp = Math.cos(cameraPitch);
  const sp = Math.sin(cameraPitch);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const y1 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const focal = Math.max(W, H) * 0.78 * cameraZoom;
  const cameraDistance = Math.max(W, H) * 0.92 / Math.sqrt(cameraZoom);
  const denom = cameraDistance + z2;
  if (denom < 90) return null;
  const scale = focal / denom;
  return {
    x: origin.x + x1 * scale,
    y: origin.y + y1 * scale,
    scale,
    depth: z2,
  };
}

function drawProjectedPath(points, color, alpha, width) {
  let drawing = false;
  ctx.beginPath();
  for (const p of points) {
    if (!p || p.x < -W * 0.35 || p.x > W * 1.35 || p.y < -H * 0.35 || p.y > H * 1.35) {
      drawing = false;
      continue;
    }
    if (!drawing) {
      ctx.moveTo(p.x, p.y);
      drawing = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawDepthStreams(origin, time) {
  ctx.globalCompositeOperation = "lighter";
  const lanes = 28;
  const span = Math.max(W, H) * 0.58;
  for (let i = 0; i < lanes; i += 1) {
    const seed = i * 97;
    const baseA = randHash(seed) * Math.PI * 2 + cameraYaw * 0.45;
    const radius = span * (0.38 + randHash(seed + 1) * 0.82);
    const wrappedTravel = ((travel % DEPTH_STREAM_SPAN) + DEPTH_STREAM_SPAN) % DEPTH_STREAM_SPAN;
    const zOffset = ((randHash(seed + 2) * DEPTH_STREAM_SPAN - wrappedTravel + DEPTH_STREAM_SPAN) % DEPTH_STREAM_SPAN) - DEPTH_STREAM_SPAN * 0.5;
    const points = [];
    for (let j = 0; j < 18; j += 1) {
      const t = j / 17;
      const a = baseA + t * 0.85 * config.twist + Math.sin(time * 0.45 + i) * 0.05;
      const z = zOffset + (t - 0.5) * 420;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius * (0.62 + randHash(seed + 3) * 0.34);
      points.push(projectPoint(x, y, z, origin));
    }
    const near = Math.max(0, 1 - Math.abs(zOffset + 120) / 760);
    drawProjectedPath(points, pick(config.palette.colors), 0.05 + near * 0.18, 0.45 + near * 1.4);
  }
}

function drawRings(origin, time) {
  ctx.globalCompositeOperation = "lighter";
  
  for (const ring of rings) {
    const pulse = Math.sin(time * config.pulse + ring.r * ring.wobble) * 10;
    const radius = Math.max(2, ring.r + pulse + time * ring.speed * 24 % 36);
    const plane = ring.r * 0.002 + config.seedPhase;
    const points = [];
    for (let i = 0; i <= 96; i += 1) {
      const t = i / 96;
      const a = t * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius * Math.cos(plane) * 0.78;
      const z = Math.sin(a) * radius * Math.sin(plane) * 0.78 - Math.sin(time * ring.speed + ring.r) * 120;
      points.push(projectPoint(x, y, z, origin));
    }
    drawProjectedPath(points, config.palette.halo, ring.alpha * 1.2, ring.width);
  }
}

function drawFilaments(origin, time) {
  ctx.globalCompositeOperation = "lighter";
  for (const s of spokes) {
    const a = s.a + Math.sin(time * 0.18 + s.a * 3) * 0.07;
    const points = [];
    const steps = 7;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const r = s.len * t;
      const curl = a + s.curl * t * t + Math.sin(time * 0.35 + t * 8 + s.a) * 0.05;
      const baseX = Math.cos(curl) * r;
      const baseY = Math.sin(curl) * r;
      const z = Math.sin(curl * 1.7 + s.a) * r * 0.34 + Math.cos(time * 0.22 + s.a) * 160;
      points.push(projectPoint(baseX, baseY, z, origin));
    }
    drawProjectedPath(points, s.color, s.alpha, s.width);
  }
}

function drawParticles(origin, time) {
  ctx.globalCompositeOperation = "lighter";
  
  for (const p of particles) {
    const orbit = config.mode === "Orbit" ? time * 0.1 * p.speed : time * 0.022 * p.speed;
    const breathing = Math.sin(time * config.pulse + p.phase) * 8 * p.depth;
    const angle = p.homeA + orbit + Math.sin(time * 0.19 + p.phase) * 0.035;
    const radius = p.homeR + breathing + Math.sin(time * 0.41 + p.homeR * 0.016) * 5;
    
    const baseX = Math.cos(angle) * radius;
    const baseY = Math.sin(angle) * radius;
    const floatDepth = Math.sin(time * 0.16 * config.drift + p.phase) * 170 + Math.cos(time * 0.09 + p.homeA) * 80;
    const z = Math.sin(angle * 1.6 + p.phase) * radius * 0.42 + (p.depth - 1) * 360 + floatDepth;
    const projected = projectPoint(baseX + p.ox, baseY + p.oy, z, origin);
    if (!projected) continue;
    
    const flicker = 0.72 + Math.sin(time * p.speed * 2.2 + p.phase) * 0.28;
    const nearBoost = Math.min(2.6, Math.max(0.38, projected.scale * 1.12));
    const fade = Math.max(0.22, Math.min(1, 1.22 - Math.abs(projected.depth) / Math.max(W, H)));
    const adjustedAlpha = p.alpha * flicker * fade;
    const adjustedSize = p.size * nearBoost;

    ctx.beginPath();
    ctx.fillStyle = rgba(p.color, adjustedAlpha);
    ctx.arc(projected.x, projected.y, adjustedSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCore(origin, time) {
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, Math.min(W, H) * 0.22);
  glow.addColorStop(0, rgba("#ffffff", 0.9));
  glow.addColorStop(0.12, rgba(config.palette.halo, 0.48));
  glow.addColorStop(0.58, rgba(config.palette.halo, 0.1));
  glow.addColorStop(1, rgba(config.palette.halo, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, Math.min(W, H) * (0.16 + Math.sin(time * 1.7) * 0.012), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 2.5 + Math.sin(time * 4) * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrain(time) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  const count = Math.floor(W * H / 5200);
  for (let i = 0; i < count; i += 1) {
    const x = (randHash(i * 17 + Math.floor(time * 12)) * W) | 0;
    const y = (randHash(i * 43 + Math.floor(time * 9)) * H) | 0;
    ctx.fillRect(x, y, 1, 1);
  }
}

function getOrigin(time = 0) {
  let x = W * 0.5;
  let y = H * 0.5;
  if (config.originBias === "Low") y = H * 0.62;
  if (config.originBias === "High") y = H * 0.38;
  if (config.originBias === "Off Axis") {
    x = W * (randHash(101) < 0.5 ? 0.42 : 0.58);
    y = H * (0.45 + (randHash(202) - 0.5) * 0.16);
  }
  return {
    x: x + Math.sin(time * 0.19 + config.seedPhase) * Math.min(W, H) * 0.018,
    y: y + Math.cos(time * 0.16 + config.seedPhase) * Math.min(W, H) * 0.018,
  };
}

function disturb(event) {
  const x = event.clientX;
  const y = event.clientY;
  const origin = getOrigin();
  const a = Math.atan2(y - origin.y, x - origin.x);
  for (let i = 0; i < 26; i += 1) {
    particles[(rand() * particles.length) | 0].homeA += Math.sin(a + i) * 0.01;
  }
}

function handlePointerDown(event) {
  if (event.pointerId !== undefined) {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  if (activePointers.size >= 2) {
    const pair = getPointerPair();
    pinchStartDistance = distance(pair[0], pair[1]);
    pinchStartZoom = targetZoom;
    isDragging = false;
    event.preventDefault();
    return;
  }
  isDragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartRotation = targetYaw;
  dragStartTilt = targetPitch;
  if (canvas.setPointerCapture && event.pointerId !== undefined) {
    canvas.setPointerCapture(event.pointerId);
  }
  canvas.style.cursor = "grabbing";
  event.preventDefault();
}

function handlePointerMove(event) {
  if (event.pointerId !== undefined && activePointers.has(event.pointerId)) {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  if (activePointers.size >= 2) {
    const pair = getPointerPair();
    const currentDistance = distance(pair[0], pair[1]);
    if (pinchStartDistance > 0) {
      setZoom(pinchStartZoom * currentDistance / pinchStartDistance);
    }
    event.preventDefault();
    return;
  }
  if (isDragging) {
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    // 水平拖動轉換為旋轉角度
    targetYaw = dragStartRotation + (dx / Math.max(W, H)) * Math.PI * 2.35;
    // 垂直拖動轉換為傾斜角度（限制在 -60° 到 60°）
    targetPitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, dragStartTilt + (dy / Math.max(W, H)) * Math.PI * 1.4));
    event.preventDefault();
  } else {
    canvas.style.cursor = "grab";
  }
}

function handlePointerUp(event) {
  if (event && event.pointerId !== undefined) {
    activePointers.delete(event.pointerId);
  } else {
    activePointers.clear();
  }
  if (activePointers.size < 2) {
    pinchStartDistance = 0;
  }
  isDragging = false;
  if (canvas.releasePointerCapture && event && event.pointerId !== undefined) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already be released by the browser.
    }
  }
  canvas.style.cursor = "grab";
}

function handleWheel(event) {
  const direction = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
  zoomBy(direction);
  event.preventDefault();
}

function handleKeyDown(event) {
  if (event.key === "+" || event.key === "=") {
    zoomBy(ZOOM_STEP);
  }
  if (event.key === "-" || event.key === "_") {
    zoomBy(1 / ZOOM_STEP);
  }
  if (event.key === "0") {
    setZoom(1);
  }
}

function startTouchPinch(event) {
  const a = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  const b = { x: event.touches[1].clientX, y: event.touches[1].clientY };
  pinchStartDistance = distance(a, b);
  pinchStartZoom = targetZoom;
  isDragging = false;
}

function handleTouchPinch(event) {
  const a = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  const b = { x: event.touches[1].clientX, y: event.touches[1].clientY };
  if (pinchStartDistance > 0) {
    setZoom(pinchStartZoom * distance(a, b) / pinchStartDistance);
  }
}

function zoomBy(multiplier) {
  setZoom(targetZoom * multiplier);
}

function setZoom(value) {
  targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function getPointerPair() {
  return Array.from(activePointers.values()).slice(0, 2);
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pick(items) {
  return items[(rand() * items.length) | 0];
}

function range(min, max) {
  return min + (max - min) * rand();
}

function signedRange(min, max) {
  const v = range(min, max);
  return rand() < 0.5 ? -v : v;
}

function rgba(hex, alpha) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function randHash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

setup();
