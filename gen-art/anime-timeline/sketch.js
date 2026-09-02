// ============================================
// Anime Timeline — 多階段編排動畫
// 5x5 方塊 6 階段：登場 → 旋轉 → 脈動 → 波動 → 爆炸 → 收回
// ============================================

var PALETTES = [
  ["#FF006E", "#FB5607", "#FFBE0B", "#8338EC", "#3A86FF"],
  ["#EF476F", "#FFD166", "#06D6A0", "#118AB2", "#073B4C"],
  ["#7400B8", "#5390D9", "#48BFE3", "#80FFDB", "#FF0A54"],
  ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"],
  ["#FF6AD5", "#C774E8", "#AD8CFF", "#8795E8", "#94D0FF"],
  ["#011627", "#FDFFFC", "#2EC4B6", "#E71D36", "#FF9F1C"],
];

var N = 5;
var total = N * N;
var gridEl = document.getElementById("grid");
var phaseEl = document.getElementById("phase");
gridEl.style.gridTemplateColumns = "repeat(" + N + ", 1fr)";

for (var i = 0; i < total; i++) {
  var d = document.createElement("div");
  d.className = "box";
  gridEl.appendChild(d);
}

var currentTL = null;

function pickPalette() {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

function play() {
  if (currentTL) currentTL.pause();

  var pal = pickPalette();
  anime.set(".box", {
    scale: 0,
    rotate: 0,
    translateX: 0,
    translateY: 0,
    backgroundColor: pal[0],
    borderRadius: "20%"
  });

  var tl = anime.timeline({
    loop: true,
    autoplay: true
  });

  // Phase 1: 從中心展開
  tl.add({
    targets: ".box",
    scale: [0, 1],
    delay: anime.stagger(35, { grid: [N, N], from: "center" }),
    duration: 900,
    easing: "easeOutBack",
    begin: function() { phaseEl.textContent = "1 · APPEAR"; }
  });

  // Phase 2: 旋轉 + 換色
  tl.add({
    targets: ".box",
    rotate: 180,
    backgroundColor: pal[1],
    delay: anime.stagger(20, { grid: [N, N], from: "first" }),
    duration: 700,
    easing: "easeInOutQuad",
    begin: function() { phaseEl.textContent = "2 · ROTATE"; }
  });

  // Phase 3: 脈動
  tl.add({
    targets: ".box",
    scale: [
      { value: 1.4, duration: 350 },
      { value: 0.7, duration: 350 }
    ],
    backgroundColor: pal[2],
    borderRadius: ["20%", "50%"],
    delay: anime.stagger(18, { grid: [N, N], from: "center" }),
    easing: "easeInOutSine",
    begin: function() { phaseEl.textContent = "3 · PULSE"; }
  });

  // Phase 4: 波動
  tl.add({
    targets: ".box",
    translateY: anime.stagger([-25, 25], { grid: [N, N], from: "center", axis: "x" }),
    rotate: 360,
    backgroundColor: pal[3],
    duration: 800,
    easing: "easeInOutSine",
    begin: function() { phaseEl.textContent = "4 · WAVE"; }
  });

  // Phase 5: 向外爆炸
  tl.add({
    targets: ".box",
    translateX: function(_, i) {
      var col = i % N;
      return (col - (N - 1) / 2) * 60;
    },
    translateY: function(_, i) {
      var row = Math.floor(i / N);
      return (row - (N - 1) / 2) * 60;
    },
    scale: 0.5,
    rotate: 540,
    backgroundColor: pal[4],
    duration: 850,
    easing: "easeOutExpo",
    begin: function() { phaseEl.textContent = "5 · EXPLODE"; }
  });

  // Phase 6: 收回原位
  tl.add({
    targets: ".box",
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotate: 0,
    backgroundColor: pal[0],
    borderRadius: "20%",
    delay: anime.stagger(15, { grid: [N, N], from: "last" }),
    duration: 700,
    easing: "easeInOutQuart",
    begin: function() { phaseEl.textContent = "6 · COLLAPSE"; }
  });

  currentTL = tl;
}

document.getElementById("btn-new").onclick = play;
document.getElementById("btn-new").ontouchend = function(e) { e.preventDefault(); play(); };
document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "r" || e.key === "R") { e.preventDefault(); play(); }
});

play();
