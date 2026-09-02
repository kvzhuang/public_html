// ============================================
// Anime Grid — anime.js stagger demo
// N×N 圓點，5 種錯位動畫場景循環播放
// ============================================

var PALETTES = [
  { name: "Neon",      colors: ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC"] },
  { name: "Tropical",  colors: ["#06D6A0", "#118AB2", "#FFD166", "#EF476F", "#073B4C"] },
  { name: "Citrus",    colors: ["#FF9F1C", "#FFBF69", "#2EC4B6", "#CBF3F0", "#E71D36"] },
  { name: "Synthwave", colors: ["#7400B8", "#5390D9", "#48BFE3", "#80FFDB", "#FF0A54"] },
  { name: "Berry",     colors: ["#FF477E", "#FF7096", "#FF85A1", "#FFAEBC", "#A0E7E5"] },
  { name: "Ocean",     colors: ["#03045E", "#023E8A", "#0077B6", "#00B4D8", "#90E0EF"] },
  { name: "Forest",    colors: ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"] },
  { name: "Vapor",     colors: ["#FF6AD5", "#C774E8", "#AD8CFF", "#8795E8", "#94D0FF"] },
];

var N = 16;
var gridEl = document.getElementById("grid");
var sceneNameEl = document.getElementById("scene-name");
gridEl.style.gridTemplateColumns = "repeat(" + N + ", 1fr)";

// 生成 N×N 圓點
var dots = [];
for (var i = 0; i < N * N; i++) {
  var d = document.createElement("div");
  d.className = "dot";
  gridEl.appendChild(d);
  dots.push(d);
}

var currentAnim = null;
var lastSceneIdx = -1;

function pickPalette() {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

function paintColors(pal, mode) {
  // mode: 'random' | 'gradient' | 'stripes'
  for (var i = 0; i < dots.length; i++) {
    var c;
    if (mode === "gradient") {
      var r = Math.floor(i / N), col = i % N;
      var t = (r + col) / (2 * N - 2);
      var idx = Math.floor(t * (pal.colors.length - 1));
      c = pal.colors[idx];
    } else if (mode === "stripes") {
      c = pal.colors[Math.floor(i / N) % pal.colors.length];
    } else {
      c = pal.colors[Math.floor(Math.random() * pal.colors.length)];
    }
    dots[i].style.background = c;
  }
}

// ── Scenes ─────────────────────────────────────────────────────────────────

function sceneRadialWave(pal) {
  sceneNameEl.textContent = "RADIAL WAVE · " + pal.name.toUpperCase();
  paintColors(pal, "random");
  return anime({
    targets: ".dot",
    scale: [
      { value: 0.3, duration: 0 },
      { value: 1.3 },
      { value: 0.6 }
    ],
    rotate: [0, 180],
    delay: anime.stagger(35, { grid: [N, N], from: "center" }),
    duration: 1600,
    easing: "easeInOutSine",
    loop: true,
    direction: "alternate"
  });
}

function sceneLinearSweep(pal) {
  sceneNameEl.textContent = "LINEAR SWEEP · " + pal.name.toUpperCase();
  paintColors(pal, "stripes");
  return anime({
    targets: ".dot",
    scale: [{ value: 0.2 }, { value: 1.1 }],
    opacity: [{ value: 0.3 }, { value: 1 }],
    borderRadius: ["50%", "20%"],
    delay: anime.stagger(40, { grid: [N, N], from: "first" }),
    duration: 1200,
    easing: "easeInOutCubic",
    loop: true,
    direction: "alternate"
  });
}

function sceneRandomScatter(pal) {
  sceneNameEl.textContent = "RANDOM SCATTER · " + pal.name.toUpperCase();
  paintColors(pal, "random");
  return anime({
    targets: ".dot",
    scale: [{ value: 0 }, { value: 1.3 }, { value: 0.7 }],
    rotate: function() { return anime.random(-360, 360); },
    delay: anime.stagger(20, { from: "random" }),
    duration: 1400,
    easing: "easeOutElastic(1, 0.6)",
    loop: true,
    direction: "alternate"
  });
}

function sceneDiagonal(pal) {
  sceneNameEl.textContent = "DIAGONAL CASCADE · " + pal.name.toUpperCase();
  paintColors(pal, "gradient");
  return anime({
    targets: ".dot",
    scale: [{ value: 0.1 }, { value: 1.15 }, { value: 0.5 }],
    rotate: [0, 90],
    delay: anime.stagger(30, { grid: [N, N], from: 0 }),  // 左上角為起點
    duration: 1500,
    easing: "easeInOutQuad",
    loop: true,
    direction: "alternate"
  });
}

function sceneSineFlow(pal) {
  sceneNameEl.textContent = "SINE FLOW · " + pal.name.toUpperCase();
  paintColors(pal, "stripes");
  return anime({
    targets: ".dot",
    translateY: anime.stagger(["-30px", "30px"], { grid: [N, N], from: "center", axis: "x" }),
    scale: [{ value: 0.5 }, { value: 1.1 }, { value: 0.5 }],
    delay: anime.stagger(55, { grid: [N, N], from: "center", axis: "x" }),
    duration: 1800,
    easing: "easeInOutSine",
    loop: true,
    direction: "alternate"
  });
}

function sceneRipple(pal) {
  sceneNameEl.textContent = "RIPPLE · " + pal.name.toUpperCase();
  paintColors(pal, "random");
  return anime({
    targets: ".dot",
    scale: [
      { value: 0.2, duration: 200 },
      { value: 1.4, duration: 600 },
      { value: 0.8, duration: 600 }
    ],
    opacity: [
      { value: 0.4, duration: 200 },
      { value: 1, duration: 600 },
      { value: 0.6, duration: 600 }
    ],
    delay: anime.stagger(50, { grid: [N, N], from: "edges" }),
    duration: 1400,
    easing: "easeInOutQuart",
    loop: true,
    direction: "alternate"
  });
}

function sceneCornerBurst(pal) {
  sceneNameEl.textContent = "CORNER BURST · " + pal.name.toUpperCase();
  paintColors(pal, "random");
  var corners = ["last"];  // 4 corners aren't directly supported; we'll use last
  return anime({
    targets: ".dot",
    scale: [{ value: 0 }, { value: 1.2 }],
    rotate: 360,
    borderRadius: ["50%", "0%", "50%"],
    delay: anime.stagger(25, { grid: [N, N], from: "last" }),
    duration: 1500,
    easing: "easeInOutBack",
    loop: true,
    direction: "alternate"
  });
}

var SCENES = [sceneRadialWave, sceneLinearSweep, sceneRandomScatter, sceneDiagonal, sceneSineFlow, sceneRipple, sceneCornerBurst];

function playScene() {
  if (currentAnim) {
    currentAnim.pause();
    // 重置 transform / opacity 避免殘留
    anime.set(".dot", { scale: 1, rotate: 0, translateY: 0, opacity: 1, borderRadius: "50%" });
  }
  // 不重複上次場景
  var idx;
  do { idx = Math.floor(Math.random() * SCENES.length); } while (idx === lastSceneIdx && SCENES.length > 1);
  lastSceneIdx = idx;
  var pal = pickPalette();
  currentAnim = SCENES[idx](pal);
}

document.getElementById("btn-new").onclick = playScene;
document.getElementById("btn-new").ontouchend = function(e) { e.preventDefault(); playScene(); };

// 鍵盤快捷鍵
document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "n" || e.key === "N") {
    e.preventDefault();
    playScene();
  }
});

playScene();
