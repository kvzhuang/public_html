// ============================================
// Particle Explosion — anime.js 粒子動畫
// ============================================

const PALETTES = [
  { name: "Neon", colors: ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC"] },
  { name: "Galaxy", colors: ["#667EEA", "#764BA2", "#F093FB", "#F5576C", "#4FACFE"] },
  { name: "Sunset", colors: ["#FF6B35", "#FF8C42", "#FFA07A", "#FF9F1C", "#E71D36"] },
  { name: "Ocean", colors: ["#03045E", "#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8"] },
  { name: "Forest", colors: ["#2D6A4F", "#40916C", "#52B788", "#74C69D", "#95D5B2"] },
  { name: "Fire", colors: ["#FF0000", "#FF4500", "#FF6347", "#FF7F50", "#FFA500"] },
  { name: "Cyber", colors: ["#FF2A6D", "#05D9E8", "#D1F7FF", "#7B61FF", "#B537F2"] },
  { name: "Candy", colors: ["#FF69B4", "#FF85A2", "#FFA07A", "#FFB6C1", "#FF8FB1"] },
];

let container = document.getElementById("container");
let modeNameEl = document.getElementById("mode-name");
let currentMode = "explosion";
let particleCount = 0;
let maxParticles = 500; // 最大粒子數限制

// 按鈕事件
document.getElementById("btn-explosion").addEventListener("click", () => setMode("explosion"));
document.getElementById("btn-ripple").addEventListener("click", () => setMode("ripple"));
document.getElementById("btn-spiral").addEventListener("click", () => setMode("spiral"));
document.getElementById("btn-fountain").addEventListener("click", () => setMode("fountain"));
document.getElementById("btn-clear").addEventListener("click", clearAll);

// 點擊畫面觸發效果
container.addEventListener("click", (e) => {
  const x = e.clientX;
  const y = e.clientY;
  
  switch(currentMode) {
    case "explosion":
      createExplosion(x, y);
      break;
    case "ripple":
      createRipple(x, y);
      break;
    case "spiral":
      createSpiral(x, y);
      break;
    case "fountain":
      createFountain(x, y);
      break;
  }
});

function setMode(mode) {
  currentMode = mode;
  const modeNames = {
    "explosion": "💥 EXPLOSION MODE",
    "ripple": "〰️ RIPPLE MODE",
    "spiral": "🌀 SPIRAL MODE",
    "fountain": "⛲ FOUNTAIN MODE"
  };
  modeNameEl.textContent = modeNames[mode];
  
  // 按鈕高亮效果
  document.querySelectorAll("#controls button").forEach(btn => {
    btn.style.transform = "scale(1)";
    btn.style.opacity = "1";
  });
}

function pickPalette() {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

function pickColor(palette) {
  return palette.colors[Math.floor(Math.random() * palette.colors.length)];
}

// 清理過多粒子
function cleanupParticles() {
  const particles = document.querySelectorAll(".particle");
  if (particles.length > maxParticles) {
    const toRemove = particles.length - maxParticles;
    for (let i = 0; i < toRemove; i++) {
      if (particles[i]) particles[i].remove();
    }
  }
}

// ========================================
// 爆炸效果
// ========================================
function createExplosion(x, y) {
  const palette = pickPalette();
  const numParticles = Math.floor(Math.random() * 30) + 30; // 30-60 粒子
  const particles = [];

  for (let i = 0; i < numParticles; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.width = (Math.random() * 8 + 4) + "px";
    p.style.height = p.style.width;
    p.style.background = pickColor(palette);
    container.appendChild(p);
    particles.push(p);
  }

  anime({
    targets: particles,
    translateX: () => anime.random(-250, 250),
    translateY: () => anime.random(-250, 250),
    scale: [
      { value: 1.5, duration: 100 },
      { value: 0, duration: 800 }
    ],
    opacity: [
      { value: 1, duration: 100 },
      { value: 0, duration: 700 }
    ],
    easing: "easeOutCubic",
    duration: 900,
    delay: anime.stagger(8),
    complete: () => particles.forEach(p => p.remove())
  });

  cleanupParticles();
}

// ========================================
// 波紋效果
// ========================================
function createRipple(x, y) {
  const palette = pickPalette();
  const numRings = Math.floor(Math.random() * 3) + 4; // 4-6 圈
  const rings = [];

  for (let i = 0; i < numRings; i++) {
    const ring = document.createElement("div");
    ring.className = "particle";
    ring.style.left = x + "px";
    ring.style.top = y + "px";
    ring.style.width = "10px";
    ring.style.height = "10px";
    ring.style.background = "transparent";
    ring.style.border = `3px solid ${pickColor(palette)}`;
    ring.style.transform = "translate(-50%, -50%)";
    container.appendChild(ring);
    rings.push(ring);
  }

  anime({
    targets: rings,
    width: ["10px", "300px"],
    height: ["10px", "300px"],
    opacity: [1, 0],
    easing: "easeOutQuad",
    duration: 1500,
    delay: anime.stagger(120),
    complete: () => rings.forEach(r => r.remove())
  });

  cleanupParticles();
}

// ========================================
// 螺旋效果
// ========================================
function createSpiral(x, y) {
  const palette = pickPalette();
  const numParticles = 50;
  const particles = [];

  for (let i = 0; i < numParticles; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.width = (Math.random() * 6 + 3) + "px";
    p.style.height = p.style.width;
    p.style.background = pickColor(palette);
    container.appendChild(p);
    particles.push({ el: p, index: i });
  }

  particles.forEach(({ el, index }) => {
    const angle = (index / numParticles) * Math.PI * 4; // 2圈螺旋
    const radius = (index / numParticles) * 250;
    
    anime({
      targets: el,
      translateX: Math.cos(angle) * radius,
      translateY: Math.sin(angle) * radius,
      scale: [
        { value: 1.2, duration: 200 },
        { value: 0, duration: 600 }
      ],
      opacity: [1, 0],
      rotate: angle * (180 / Math.PI),
      easing: "easeOutCubic",
      duration: 1200,
      delay: index * 15,
      complete: () => el.remove()
    });
  });

  cleanupParticles();
}

// ========================================
// 噴泉效果
// ========================================
function createFountain(x, y) {
  const palette = pickPalette();
  const numParticles = Math.floor(Math.random() * 20) + 40; // 40-60 粒子
  const particles = [];

  for (let i = 0; i < numParticles; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.width = (Math.random() * 6 + 4) + "px";
    p.style.height = p.style.width;
    p.style.background = pickColor(palette);
    container.appendChild(p);
    particles.push(p);
  }

  anime({
    targets: particles,
    translateX: () => anime.random(-100, 100),
    translateY: [
      { value: () => anime.random(-350, -150), duration: 600, easing: "easeOutQuad" },
      { value: 400, duration: 800, easing: "easeInQuad" }
    ],
    scale: [
      { value: 1.3, duration: 100 },
      { value: 0.5, duration: 1300 }
    ],
    opacity: [
      { value: 1, duration: 300 },
      { value: 0, duration: 800 }
    ],
    rotate: () => anime.random(-180, 180),
    delay: anime.stagger(10),
    duration: 1400,
    complete: () => particles.forEach(p => p.remove())
  });

  cleanupParticles();
}

// ========================================
// 清空所有粒子
// ========================================
function clearAll() {
  const particles = document.querySelectorAll(".particle");
  anime({
    targets: particles,
    scale: 0,
    opacity: 0,
    duration: 300,
    easing: "easeInCubic",
    complete: () => particles.forEach(p => p.remove())
  });
}

// 自動演示（頁面載入後）
window.addEventListener("load", () => {
  setTimeout(() => {
    createExplosion(window.innerWidth / 2, window.innerHeight / 2);
  }, 500);
  
  setTimeout(() => {
    createRipple(window.innerWidth / 3, window.innerHeight / 2);
  }, 1500);
  
  setTimeout(() => {
    createSpiral(window.innerWidth * 2 / 3, window.innerHeight / 2);
  }, 2500);
});
