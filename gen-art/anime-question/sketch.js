// ============================================
// Question Storm — anime.js 重現「滿頭問號」貼圖
// 5 階段升級劇場：1 → 3 → ~12 → ~150 個問號 → 爆散 → loop
// ============================================

var PALETTES = [
  { name: "Mono",     bg: "#f0eee6", colors: ["#1a1a1a", "#2a2a2a", "#444"] },
  { name: "Comic",    bg: "#fff9dd", colors: ["#0a0a0a", "#e63946", "#1976d2"] },
  { name: "Crimson",  bg: "#fdf4f3", colors: ["#9d0208", "#dc2f02", "#1a1a1a"] },
  { name: "Vapor",    bg: "#1a0a2e", colors: ["#FF6AD5", "#C774E8", "#94D0FF", "#AD8CFF"] },
  { name: "Neon",     bg: "#0a0a0f", colors: ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC"] },
  { name: "Ink",      bg: "#ffffff", colors: ["#000000"] },
  { name: "Synthwave",bg: "#1a0033", colors: ["#FF0A54", "#48BFE3", "#80FFDB"] },
  { name: "Sketch",   bg: "#fdfbf4", colors: ["#1a1a1a", "#555", "#888"] },
];

var GLYPHS = ["?", "¿", "⁇", "⁈", "⁉"];

var stage = document.getElementById("stage");
var titleEl = document.getElementById("title");
var currentTL = null;
var wanderActive = false;

function rand() { return Math.random(); }
function pickFrom(arr) { return arr[Math.floor(rand() * arr.length)]; }
function pickPalette() { return PALETTES[Math.floor(rand() * PALETTES.length)]; }

// wrapper 負責定位（CSS 靜態 translate -50%），inner 給 anime 動畫
// 初始 opacity:0 + scale:0 完全靠 CSS class 設定，不用 anime.set，避開 anime 內部 cache 怪癖
function makeMark(opts) {
  var wrap = document.createElement("div");
  wrap.className = "qwrap";
  wrap.style.left = opts.x + "%";
  wrap.style.top = opts.y + "%";

  var el = document.createElement("div");
  el.className = "qmark";
  el.textContent = opts.glyph || "?";
  el.style.fontSize = opts.size + "vmin";
  el.style.color = opts.color;
  el.dataset.rot = opts.rot || 0;

  wrap.appendChild(el);
  stage.appendChild(wrap);
  return el;
}

// 取出 element 的初始 rotation（給 anime function-based value 用）
function getRot(el) { return parseFloat(el.dataset.rot) || 0; }

function play() {
  if (currentTL) currentTL.pause();
  wanderActive = false;  // 停掉舊的漫遊（每個 wander tick 會自行偵測旗標退出）
  stage.innerHTML = "";

  var pal = pickPalette();
  document.body.style.background = pal.bg;
  titleEl.style.color = pal.colors[0];
  titleEl.textContent = "QUESTION STORM · " + pal.name.toUpperCase();
  document.getElementById("btn-new").style.background = pal.colors[0];

  // 跑完進入永久漫遊模式（complete callback 啟動 wander）
  var tl = anime.timeline({
    autoplay: true,
    complete: startWander
  });

  // ── Stage 1：單一問號淡入 ──────────────────────────────────────────
  var m1 = makeMark({
    x: 50, y: 50, size: 22, rot: (rand() - 0.5) * 14,
    color: pickFrom(pal.colors), glyph: "?"
  });
  tl.add({
    targets: m1,
    opacity: [0, 1],
    scale: [0, 1],
    rotate: getRot,
    duration: 600,
    easing: "easeOutBack"
  });
  tl.add({ duration: 300 });

  // ── Stage 2：兩側 ¿ 出現，中央 ? 同步放大到 1.3 ────────────────────
  var s2 = [
    makeMark({ x: 28, y: 50, size: 14, rot: -10, color: pickFrom(pal.colors), glyph: "¿" }),
    makeMark({ x: 72, y: 50, size: 14, rot: 10, color: pickFrom(pal.colors), glyph: "¿" })
  ];
  tl.add({
    targets: s2,
    opacity: [0, 1],
    scale: [0, 1],
    rotate: getRot,
    delay: anime.stagger(120),
    duration: 500,
    easing: "easeOutBack"
  });
  tl.add({
    targets: m1,
    scale: 1.3,
    rotate: getRot,
    duration: 400,
    easing: "easeOutQuad"
  }, "-=400");
  tl.add({ duration: 350 });

  // ── Stage 3：~12 個問號散布、帶 motion blur 進場 ────────────────────
  var s3 = [];
  for (var i = 0; i < 12; i++) {
    s3.push(makeMark({
      x: 15 + rand() * 70,
      y: 15 + rand() * 70,
      size: 6 + rand() * 8,
      rot: (rand() - 0.5) * 60,
      color: pickFrom(pal.colors),
      glyph: pickFrom(GLYPHS)
    }));
  }
  tl.add({
    targets: s3,
    opacity: [0, 0.92],
    scale: [0, 1],
    rotate: getRot,
    filter: ["blur(6px)", "blur(0px)"],
    delay: anime.stagger(45, { from: "random" }),
    duration: 380,
    easing: "easeOutBack"
  });
  tl.add({ duration: 300 });

  // ── Stage 4：海嘯級 150 個問號淹沒畫面 ──────────────────────────────
  var s4 = [];
  for (var j = 0; j < 150; j++) {
    s4.push(makeMark({
      x: rand() * 100,
      y: rand() * 100,
      size: 3 + Math.pow(rand(), 1.5) * 12,
      rot: (rand() - 0.5) * 100,
      color: pickFrom(pal.colors),
      glyph: pickFrom(GLYPHS)
    }));
  }
  tl.add({
    targets: s4,
    opacity: [0, 0.85],
    scale: [0, 1],
    rotate: getRot,
    filter: ["blur(4px)", "blur(0px)"],
    delay: anime.stagger(5, { from: "center" }),
    duration: 280,
    easing: "easeOutQuad"
  });

  currentTL = tl;
}

// 漫遊模式：每個問號獨立漂移到隨機位置，完成後再走下一段，無限循環
// 視覺像一群水母 / 螢火蟲在各自飄動，呼應 anime-motion 那種自由路徑感
function startWander() {
  wanderActive = true;
  var marks = document.querySelectorAll(".qmark");
  for (var i = 0; i < marks.length; i++) {
    // 每個問號錯開 100~600ms 才開始，避免大家同步起步
    (function(el, delay) {
      setTimeout(function() { wander(el); }, delay);
    })(marks[i], Math.random() * 500);
  }
}

function wander(el) {
  // 停止條件：flag 關了或元素已被移除（下一輪 play()）
  if (!wanderActive || !stage.contains(el)) return;
  var baseRot = parseFloat(el.dataset.rot) || 0;
  anime({
    targets: el,
    translateX: (Math.random() - 0.5) * 35,
    translateY: (Math.random() - 0.5) * 35,
    rotate: baseRot + (Math.random() - 0.5) * 30,
    scale: 0.85 + Math.random() * 0.3,
    duration: 1500 + Math.random() * 2500,
    easing: "easeInOutSine",
    complete: function() { wander(el); }
  });
}

document.getElementById("btn-new").onclick = play;
document.getElementById("btn-new").ontouchend = function(e) { e.preventDefault(); play(); };
document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "n" || e.key === "N" || e.key === "r" || e.key === "R") {
    e.preventDefault(); play();
  }
});

play();
