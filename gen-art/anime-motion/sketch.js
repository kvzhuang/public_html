// ============================================
// Anime Motion Path — 粒子沿 SVG path 流動
// 5 種程式生成的路徑（lissajous / sine / spiral / infinity / heart）
// N 個粒子用 stagger 錯位、沿 path 走，循環
// ============================================

var PALETTES = [
  { name: "Neon",      colors: ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC"] },
  { name: "Tropical",  colors: ["#EF476F", "#FFD166", "#06D6A0", "#118AB2", "#073B4C"] },
  { name: "Synthwave", colors: ["#7400B8", "#5390D9", "#48BFE3", "#80FFDB", "#FF0A54"] },
  { name: "Citrus",    colors: ["#FF9F1C", "#FFBF69", "#2EC4B6", "#CBF3F0", "#E71D36"] },
  { name: "Vapor",     colors: ["#FF6AD5", "#C774E8", "#AD8CFF", "#8795E8", "#94D0FF"] },
];

var W = 800, H = 800, CX = W / 2, CY = H / 2;
var pathEl = document.getElementById("path");
var particlesEl = document.getElementById("particles");
var nameEl = document.getElementById("path-name");
var anims = [];

// ── 路徑產生器：每種都用 N=200 個取樣點 polyline，視覺差不多平滑 ─────────
var SAMPLES = 200;

function lissajous() {
  var a = 3 + Math.floor(Math.random() * 3);
  var b = 2 + Math.floor(Math.random() * 3);
  var phase = Math.random() * Math.PI * 2;
  var R = 280;
  var pts = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var t = (i / SAMPLES) * Math.PI * 2;
    pts.push({ x: CX + R * Math.sin(a * t + phase), y: CY + R * Math.sin(b * t) });
  }
  return { name: "LISSAJOUS " + a + ":" + b, d: ptsToPath(pts), close: true };
}

function sineWave() {
  var amp = 120 + Math.random() * 80;
  var freq = 2 + Math.random() * 2;
  var pts = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var t = i / SAMPLES;
    pts.push({ x: 100 + t * 600, y: CY + Math.sin(t * Math.PI * 2 * freq) * amp });
  }
  return { name: "SINE WAVE", d: ptsToPath(pts), close: false };
}

function spiral() {
  var turns = 3 + Math.random() * 2;
  var maxR = 280;
  var pts = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var t = i / SAMPLES;
    var a = t * Math.PI * 2 * turns;
    var r = t * maxR;
    pts.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
  }
  return { name: "SPIRAL", d: ptsToPath(pts), close: false };
}

function infinity() {
  var R = 260;
  var pts = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var t = (i / SAMPLES) * Math.PI * 2;
    var s = Math.sin(t), c = Math.cos(t);
    var k = 1 + s * s;
    pts.push({ x: CX + R * c / k, y: CY + R * s * c / k });
  }
  return { name: "INFINITY", d: ptsToPath(pts), close: true };
}

function heart() {
  var k = 14;
  var pts = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var t = (i / SAMPLES) * Math.PI * 2;
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: CX + x * k, y: CY - y * k });
  }
  return { name: "HEART", d: ptsToPath(pts), close: true };
}

function rose() {
  var k = 3 + Math.floor(Math.random() * 4); // 花瓣數
  var R = 260;
  var pts = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var t = (i / SAMPLES) * Math.PI * 2;
    var r = R * Math.cos(k * t);
    pts.push({ x: CX + r * Math.cos(t), y: CY + r * Math.sin(t) });
  }
  return { name: "ROSE k=" + k, d: ptsToPath(pts), close: true };
}

function ptsToPath(pts) {
  var d = "M " + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
  for (var i = 1; i < pts.length; i++) {
    d += " L " + pts[i].x.toFixed(1) + " " + pts[i].y.toFixed(1);
  }
  return d;
}

var GENERATORS = [lissajous, sineWave, spiral, infinity, heart, rose];

// ── 主流程 ───────────────────────────────────────────────────────────────

function play() {
  anims.forEach(function(a) { a.pause(); });
  anims = [];

  var pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  var route = GENERATORS[Math.floor(Math.random() * GENERATORS.length)]();
  nameEl.textContent = route.name + " · " + pal.name.toUpperCase();

  pathEl.setAttribute("d", route.d);

  // 清掉舊粒子，建新的
  particlesEl.innerHTML = "";
  var N = 14;
  for (var i = 0; i < N; i++) {
    var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 14);
    c.setAttribute("fill", pal.colors[i % pal.colors.length]);
    c.setAttribute("class", "particle");
    particlesEl.appendChild(c);
  }

  var motion = anime.path("#path");

  anims.push(anime({
    targets: ".particle",
    translateX: motion("x"),
    translateY: motion("y"),
    rotate: motion("angle"),
    scale: [
      { value: 1.3, duration: 1500 },
      { value: 0.7, duration: 1500 },
      { value: 1, duration: 1500 }
    ],
    delay: anime.stagger(220),
    duration: 5500,
    loop: true,
    easing: route.close ? "linear" : "easeInOutSine",
    direction: route.close ? "normal" : "alternate"
  }));
}

document.getElementById("btn-new").onclick = play;
document.getElementById("btn-new").ontouchend = function(e) { e.preventDefault(); play(); };
document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "n" || e.key === "N") { e.preventDefault(); play(); }
});

play();
