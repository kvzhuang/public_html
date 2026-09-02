// ============================================
// Anime Fireworks — 自動連續煙火秀
// anime.js 負責火箭升空 ease curve 與爆炸 flash 環擴張
// p5.js 渲染粒子（重力 / 空阻 / 軌跡 / 火花 / additive glow）
// 8 種爆炸樣式 + 多段子爆 + 城市剪影 + 星空
// ============================================

var particles = [];
var rockets = [];
var flashes = [];
var smokeTrails = [];
var stars = [];
var skylineHeights = [];

var lastLaunchTime = 0;
var nextLaunchDelay = 500;
var finaleMode = false;
var finaleEndTime = 0;

// 16 種爆炸樣式
var BURST_TYPES = [
  "peony", "chrysanthemum", "willow", "ring", "palm", "heart", "spiral", "crossette",
  "star", "pistil", "brocade", "comet", "strobe", "spider", "lemniscate", "bouquet"
];

// 配色：每個 palette 給 burst 用，主色 + 點綴
var PALETTES = [
  // 暖色系
  ["#ffeb3b", "#ff9800", "#ff5722", "#ffffff"],
  // 紅金
  ["#ff1744", "#ffea00", "#ffc107", "#ffffff"],
  // 紫粉
  ["#e040fb", "#ff4081", "#ff80ab", "#ffffff"],
  // 藍綠
  ["#00e5ff", "#1de9b6", "#76ff03", "#ffffff"],
  // 翡翠
  ["#00e676", "#69f0ae", "#b9f6ca", "#ffffff"],
  // 紫藍
  ["#7c4dff", "#536dfe", "#448aff", "#ffffff"],
  // 珊瑚
  ["#ff6e40", "#ff9100", "#ffab40", "#ffffff"],
  // 銀河
  ["#82b1ff", "#b388ff", "#ea80fc", "#ffffff"],
  // 經典
  ["#f44336", "#ffeb3b", "#4caf50", "#2196f3"],
];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  var w = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var h = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var cnv = createCanvas(w, h);
  cnv.parent("fireworks-container");
  pixelDensity(1);

  initBackground();

  document.getElementById("btn-boom").onclick = manualLaunch;
  document.getElementById("btn-finale").onclick = triggerFinale;
  document.getElementById("btn-boom").ontouchend = function(e){ e.preventDefault(); manualLaunch(); };
  document.getElementById("btn-finale").ontouchend = function(e){ e.preventDefault(); triggerFinale(); };
}

function windowResized() {
  var w = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var h = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  resizeCanvas(w, h);
  initBackground();
}

function initBackground() {
  // 星空
  stars = [];
  for (var i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.7,
      r: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.04
    });
  }
  // 城市剪影：用 perlin-ish 隨機高度
  skylineHeights = [];
  var n = Math.floor(width / 18);
  var y = height * 0.85;
  for (var j = 0; j < n; j++) {
    if (Math.random() < 0.4) y += (Math.random() - 0.5) * 40;
    y = Math.max(height * 0.78, Math.min(height * 0.95, y));
    skylineHeights.push(y);
  }
}

// ── Color helpers ──────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function pickPaletteRGB() {
  var pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  return pal.map(hexRGB);
}

function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Launch & burst ─────────────────────────────────────────────────────────

function launchFirework(opts) {
  opts = opts || {};
  var startX = opts.startX != null ? opts.startX : width * 0.15 + Math.random() * width * 0.7;
  var apexX = opts.apexX != null ? opts.apexX : startX + (Math.random() - 0.5) * 60;
  var apexY = opts.apexY != null ? opts.apexY : height * 0.15 + Math.random() * height * 0.35;
  var ascendTime = opts.ascendTime != null ? opts.ascendTime : 1100 + Math.random() * 700;
  var palette = opts.palette || pickPaletteRGB();
  var type = opts.type || pickFrom(BURST_TYPES);

  var rocket = {
    x: startX, y: height - 10,
    color: [255, 230, 180],
    sparkles: [],
    headSize: 3
  };
  rockets.push(rocket);

  // anime.js：火箭升空，easeOutQuad（先快後慢，到頂點時減速）
  anime({
    targets: rocket,
    x: apexX,
    y: apexY,
    duration: ascendTime,
    easing: "easeOutQuad",
    update: function() {
      // 留下 sparkle 軌跡
      for (var i = 0; i < 2; i++) {
        rocket.sparkles.push({
          x: rocket.x + (Math.random() - 0.5) * 2,
          y: rocket.y + (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 0.3,
          vy: Math.random() * 0.5 + 0.2,
          life: 25 + Math.random() * 20,
          maxLife: 35
        });
      }
    },
    complete: function() {
      var idx = rockets.indexOf(rocket);
      if (idx >= 0) rockets.splice(idx, 1);
      flash(rocket.x, rocket.y);
      explode(rocket.x, rocket.y, type, palette);
      // 偶爾多段：再炸幾個小爆
      if (Math.random() < 0.15) scheduleMultiStage(rocket.x, rocket.y, palette);
    }
  });
}

function scheduleMultiStage(x, y, palette) {
  setTimeout(function() {
    var n = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      var dist = 30 + Math.random() * 50;
      var sx = x + Math.cos(ang) * dist;
      var sy = y + Math.sin(ang) * dist;
      flash(sx, sy, 0.5);
      explode(sx, sy, pickFrom(["peony", "ring", "chrysanthemum"]), palette);
    }
  }, 700 + Math.random() * 400);
}

// 爆炸 flash 環：anime.js 動 scale + opacity
function flash(x, y, scaleMul) {
  scaleMul = scaleMul || 1;
  var obj = { scale: 0.1, opacity: 1 };
  var f = { obj: obj, x: x, y: y, baseR: 40 * scaleMul };
  flashes.push(f);
  anime({
    targets: obj,
    scale: 5 * scaleMul,
    opacity: 0,
    duration: 500,
    easing: "easeOutQuart",
    complete: function() {
      var idx = flashes.indexOf(f);
      if (idx >= 0) flashes.splice(idx, 1);
    }
  });
}

function explode(x, y, type, palette) {
  switch (type) {
    case "peony":         spawnPeony(x, y, palette); break;
    case "chrysanthemum": spawnChrys(x, y, palette); break;
    case "willow":        spawnWillow(x, y, palette); break;
    case "ring":          spawnRing(x, y, palette); break;
    case "palm":          spawnPalm(x, y, palette); break;
    case "heart":         spawnHeart(x, y, palette); break;
    case "spiral":        spawnSpiral(x, y, palette); break;
    case "crossette":     spawnCrossette(x, y, palette); break;
    case "star":          spawnStar(x, y, palette); break;
    case "pistil":        spawnPistil(x, y, palette); break;
    case "brocade":       spawnBrocade(x, y, palette); break;
    case "comet":         spawnComet(x, y, palette); break;
    case "strobe":        spawnStrobe(x, y, palette); break;
    case "spider":        spawnSpider(x, y, palette); break;
    case "lemniscate":    spawnLemniscate(x, y, palette); break;
    case "bouquet":       spawnBouquet(x, y, palette); break;
    default:              spawnPeony(x, y, palette);
  }
  // 額外的閃爍火花
  spawnCrackle(x, y, 20 + Math.floor(Math.random() * 20));
}

function newParticle(x, y, vx, vy, color, opts) {
  opts = opts || {};
  return {
    x: x, y: y, prevX: x, prevY: y,
    vx: vx, vy: vy,
    color: color,
    life: opts.life || (90 + Math.random() * 30),
    maxLife: opts.maxLife || 110,
    size: opts.size || 1.6,
    gravity: opts.gravity != null ? opts.gravity : 0.045,
    drag: opts.drag != null ? opts.drag : 0.985,
    sparkle: opts.sparkle || false,
    trail: opts.trail !== false,
    fadeIn: opts.fadeIn || 0,
    splitAt: opts.splitAt,
    splitPalette: opts.splitPalette
  };
}

// ── Burst patterns ─────────────────────────────────────────────────────────

function spawnPeony(x, y, palette) {
  var N = 70 + Math.floor(Math.random() * 30);
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
    var sp = 2.4 + Math.random() * 2.2;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col));
  }
}

function spawnChrys(x, y, palette) {
  var N = 80;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var sp = 1.8 + Math.random() * 1.5;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 130 + Math.random() * 30, maxLife: 150, size: 2.2, sparkle: true
    }));
  }
}

function spawnWillow(x, y, palette) {
  var N = 55;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var sp = 1.6 + Math.random() * 1.4;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 180 + Math.random() * 40, maxLife: 220,
      gravity: 0.07, drag: 0.99, sparkle: true, size: 1.8
    }));
  }
}

function spawnRing(x, y, palette) {
  var N = 60;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var sp = 3.6 + (Math.random() - 0.5) * 0.2;  // 速度幾乎一致 → 環狀
    var col = palette[Math.floor(Math.random() * (palette.length - 1))];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      size: 2.0
    }));
  }
}

function spawnPalm(x, y, palette) {
  var N = 55;
  for (var i = 0; i < N; i++) {
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;  // 主要朝上、有錐角
    var sp = 3 + Math.random() * 3;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 140, maxLife: 160, sparkle: true, size: 2.0
    }));
  }
}

function spawnHeart(x, y, palette) {
  var N = 80;
  for (var i = 0; i < N; i++) {
    var t = (i / N) * Math.PI * 2;
    var vx =  16 * Math.pow(Math.sin(t), 3) * 0.20;
    var vy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * 0.20;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, vx, vy, col, { life: 130 }));
  }
}

function spawnSpiral(x, y, palette) {
  var N = 80;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 5;
    var sp = 0.6 + (i / N) * 4.5;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 120, sparkle: i % 4 === 0
    }));
  }
}

function spawnCrossette(x, y, palette) {
  var N = 30;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var sp = 3 + Math.random() * 1.5;
    var col = palette[Math.floor(Math.random() * (palette.length - 1))];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 60, maxLife: 60,
      splitAt: 30 + Math.random() * 10,
      splitPalette: palette
    }));
  }
}

function spawnCrackle(x, y, n) {
  for (var i = 0; i < n; i++) {
    var ang = Math.random() * Math.PI * 2;
    var sp = 0.5 + Math.random() * 1.5;
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, [255, 250, 230], {
      life: 30 + Math.random() * 20, maxLife: 40, size: 1.2, gravity: 0.02, trail: false, sparkle: true
    }));
  }
}

// Star ★：5 角星，用 5-fold 對稱調變半徑
function spawnStar(x, y, palette) {
  var N = 110;
  for (var i = 0; i < N; i++) {
    var t = (i / N) * Math.PI * 2;
    // r 在 t 的方向上隨 cos(5t) 變化 → 5 個 lobes
    var r = (1 + 0.55 * Math.cos(5 * t)) * (3 + Math.random() * 1.3);
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(t) * r, Math.sin(t) * r, col, {
      life: 110, sparkle: i % 3 === 0
    }));
  }
}

// Pistil：peony 外層 + 對比色內環（雙層結構）
function spawnPistil(x, y, palette) {
  // 外層大爆
  var N = 75;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var sp = 3 + Math.random() * 2;
    var col = palette[Math.floor(Math.random() * (palette.length - 1))];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, { life: 100 }));
  }
  // 內環（pistil 花蕊）— 用 palette 最後一色（通常是白）
  var inner = palette[palette.length - 1];
  var Ni = 28;
  for (var j = 0; j < Ni; j++) {
    var a = (j / Ni) * Math.PI * 2;
    var sp2 = 1.4;
    particles.push(newParticle(x, y, Math.cos(a) * sp2, Math.sin(a) * sp2, inner, {
      life: 75, size: 2, sparkle: true
    }));
  }
}

// Brocade 錦緞：peony + 大量火花，再分兩波 crackle
function spawnBrocade(x, y, palette) {
  spawnPeony(x, y, palette);
  spawnCrackle(x, y, 70);
  setTimeout(function() { spawnCrackle(x, y, 50); }, 200);
  setTimeout(function() { spawnCrackle(x, y, 30); }, 420);
}

// Comet 彗星：少量、長壽命、超長軌跡
function spawnComet(x, y, palette) {
  var N = 22;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2 + Math.random() * 0.2;
    var sp = 0.8 + Math.random() * 1.4;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 200, maxLife: 260, size: 2.6, drag: 0.992, gravity: 0.025, sparkle: true
    }));
  }
}

// Strobe 閃光：高頻 strobe 顆粒 + 中等密度散開
function spawnStrobe(x, y, palette) {
  var N = 65;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var sp = 2 + Math.random() * 2.5;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, {
      life: 130, size: 1.8, strobe: true, trail: false
    }));
  }
}

// Spider 蜘蛛：8 條粗放射狀 spokes
function spawnSpider(x, y, palette) {
  var spokes = 8;
  for (var s = 0; s < spokes; s++) {
    var baseAng = (s / spokes) * Math.PI * 2;
    var col = palette[s % palette.length];
    var perSpoke = 14;
    for (var i = 0; i < perSpoke; i++) {
      var sp = 0.8 + (i / (perSpoke - 1)) * 4.5;
      var jitter = (Math.random() - 0.5) * 0.08;
      particles.push(newParticle(x, y,
        Math.cos(baseAng + jitter) * sp,
        Math.sin(baseAng + jitter) * sp,
        col,
        { life: 105, size: 2, sparkle: i % 3 === 0, gravity: 0.03 }
      ));
    }
  }
}

// Lemniscate 雙紐線 ∞
function spawnLemniscate(x, y, palette) {
  var N = 90;
  // 整體做隨機朝向（不一定水平）
  var rotAng = Math.random() * Math.PI * 2;
  var cr = Math.cos(rotAng), sr = Math.sin(rotAng);
  for (var i = 0; i < N; i++) {
    var t = (i / N) * Math.PI * 2;
    var s = Math.sin(t), c = Math.cos(t);
    var k = 1 + s * s;
    var rx = c / k * 4;
    var ry = s * c / k * 4;
    // rotate
    var vx = rx * cr - ry * sr;
    var vy = rx * sr + ry * cr;
    var col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(newParticle(x, y, vx, vy, col, { life: 115, sparkle: i % 4 === 0 }));
  }
}

// Bouquet 花束：多個小爆團串在一起，多彩
function spawnBouquet(x, y, palette) {
  var puffs = 5;
  for (var p = 0; p < puffs; p++) {
    var offX = (Math.random() - 0.5) * 36;
    var offY = (Math.random() - 0.5) * 36;
    var col = palette[p % palette.length];
    var Nsub = 22;
    for (var j = 0; j < Nsub; j++) {
      var ang = (j / Nsub) * Math.PI * 2 + Math.random() * 0.15;
      var sp = 1.2 + Math.random() * 1.6;
      particles.push(newParticle(x + offX, y + offY,
        Math.cos(ang) * sp, Math.sin(ang) * sp,
        col,
        { life: 90, size: 1.6 }
      ));
    }
  }
}

// Crossette 中途分裂：每顆飛行中再爆 6 個小粒
function splitParticle(p) {
  var sub = 6;
  for (var i = 0; i < sub; i++) {
    var ang = (i / sub) * Math.PI * 2 + Math.random() * 0.3;
    var sp = 1 + Math.random() * 1;
    var col = p.splitPalette[Math.floor(Math.random() * p.splitPalette.length)];
    particles.push(newParticle(p.x, p.y,
      p.vx * 0.3 + Math.cos(ang) * sp,
      p.vy * 0.3 + Math.sin(ang) * sp,
      col,
      { life: 35, size: 1.2, gravity: 0.05 }
    ));
  }
}

// ── Manual / finale ───────────────────────────────────────────────────────

function manualLaunch() {
  launchFirework();
}

function triggerFinale() {
  finaleMode = true;
  finaleEndTime = millis() + 5000;
}

// ── Draw ───────────────────────────────────────────────────────────────────

function draw() {
  // Trail fade overlay（軌跡淡出）
  blendMode(BLEND);
  noStroke();
  fill(2, 4, 10, 35);
  rect(0, 0, width, height);

  // 背景星空 & 剪影（每幀重畫以維持可見）
  drawStars();
  drawSkyline();

  // 切到 additive 畫煙火
  blendMode(ADD);

  // 火箭
  drawRockets();

  // 粒子
  updateAndDrawParticles();

  // Flash 環
  drawFlashes();

  blendMode(BLEND);

  // 自動發射時機
  scheduleLaunches();
}

function drawStars() {
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    s.phase += s.speed;
    var twinkle = 0.5 + 0.5 * Math.sin(s.phase);
    noStroke();
    fill(255, 240, 220, 180 * twinkle);
    ellipse(s.x, s.y, s.r * 2, s.r * 2);
  }
}

function drawSkyline() {
  noStroke();
  fill(2, 6, 14);
  beginShape();
  vertex(0, height);
  var step = width / skylineHeights.length;
  for (var i = 0; i < skylineHeights.length; i++) {
    vertex(i * step, skylineHeights[i]);
    vertex((i + 1) * step, skylineHeights[i]);
  }
  vertex(width, height);
  endShape(CLOSE);
  // 微弱窗光
  for (var j = 0; j < skylineHeights.length; j += 1) {
    if (Math.random() < 0.04) {
      var wx = j * step + Math.random() * step;
      var wy = skylineHeights[j] + Math.random() * (height - skylineHeights[j]) * 0.6;
      fill(255, 220, 120, 35 + Math.random() * 40);
      rect(wx, wy, 1.5, 1.5);
    }
  }
}

function drawRockets() {
  for (var i = 0; i < rockets.length; i++) {
    var r = rockets[i];
    // sparkle 軌跡
    for (var j = r.sparkles.length - 1; j >= 0; j--) {
      var s = r.sparkles[j];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 1;
      if (s.life <= 0) { r.sparkles.splice(j, 1); continue; }
      var a = s.life / s.maxLife;
      noStroke();
      fill(255, 200 + 50 * a, 80 + 100 * a, 220 * a);
      ellipse(s.x, s.y, 1.6 * a + 0.6, 1.6 * a + 0.6);
    }
    // 火箭頭
    noStroke();
    fill(255, 240, 200);
    ellipse(r.x, r.y, r.headSize, r.headSize);
    // 外暈
    fill(255, 230, 170, 80);
    ellipse(r.x, r.y, r.headSize * 3, r.headSize * 3);
  }
}

function updateAndDrawParticles() {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.prevX = p.x; p.prevY = p.y;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.life -= 1;

    // Crossette: 分裂
    if (p.splitAt != null && p.life <= p.maxLife - p.splitAt && p.splitPalette) {
      splitParticle(p);
      particles.splice(i, 1);
      continue;
    }

    if (p.life <= 0) { particles.splice(i, 1); continue; }

    var a = p.life / p.maxLife;
    var col = p.color;

    // Strobe：高頻 on/off
    var alphaMul = 1;
    if (p.strobe) {
      alphaMul = (Math.sin(millis() * 0.04 + p.x * 0.5 + p.y * 0.3) > 0) ? 1 : 0.12;
    }

    // 軌跡線
    if (p.trail) {
      stroke(col[0], col[1], col[2], 180 * a * alphaMul);
      strokeWeight(p.size);
      line(p.prevX, p.prevY, p.x, p.y);
    }

    // 核心發光
    noStroke();
    fill(col[0], col[1], col[2], 220 * a * alphaMul);
    ellipse(p.x, p.y, p.size * 2, p.size * 2);
    // 外暈
    fill(col[0], col[1], col[2], 80 * a * alphaMul);
    ellipse(p.x, p.y, p.size * 6, p.size * 6);
    // 火花閃爍
    if (p.sparkle && Math.random() < 0.15) {
      fill(255, 255, 255, 220 * a);
      ellipse(p.x, p.y, p.size * 1.5, p.size * 1.5);
    }
  }
}

function drawFlashes() {
  for (var i = 0; i < flashes.length; i++) {
    var f = flashes[i];
    var op = f.obj.opacity;
    var sc = f.obj.scale;
    noFill();
    stroke(255, 240, 220, op * 220);
    strokeWeight(3);
    ellipse(f.x, f.y, f.baseR * sc, f.baseR * sc);
    // 內白光
    stroke(255, 255, 255, op * 120);
    strokeWeight(1);
    ellipse(f.x, f.y, f.baseR * sc * 0.6, f.baseR * sc * 0.6);
    // 中心強光
    if (op > 0.6) {
      noStroke();
      fill(255, 255, 255, op * 200);
      ellipse(f.x, f.y, 8, 8);
    }
  }
}

// ── Auto-launch scheduling ──────────────────────────────────────────────────

function scheduleLaunches() {
  var now = millis();
  if (finaleMode) {
    // 終曲：短間隔狂炸 5 秒
    if (now - lastLaunchTime > 60 + Math.random() * 80) {
      launchFirework();
      if (Math.random() < 0.4) launchFirework({ ascendTime: 800 + Math.random() * 400 });
      lastLaunchTime = now;
    }
    if (now > finaleEndTime) finaleMode = false;
    return;
  }
  if (now - lastLaunchTime > nextLaunchDelay) {
    launchFirework();
    lastLaunchTime = now;
    nextLaunchDelay = 400 + Math.random() * 1400;
    // 偶爾雙發
    if (Math.random() < 0.18) {
      setTimeout(launchFirework, 150 + Math.random() * 250);
    }
  }
}

function keyPressed() {
  if (key === " ") manualLaunch();
  if (key === "f" || key === "F") triggerFinale();
}
