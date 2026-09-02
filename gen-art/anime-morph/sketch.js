// ============================================
// Anime Path Morph — 程式生成 blob 變形
// 3 個 blob layer 各自循環變形 + 旋轉 + 配色
// 每個 blob path 都用相同的 1 M + 8 C + Z 結構，anime.js 才能線性 morph
// ============================================

var PALETTES = [
  { name: "Neon",      colors: ["#FF006E", "#FB5607", "#FFBE0B"] },
  { name: "Forest",    colors: ["#2A9D8F", "#264653", "#E9C46A"] },
  { name: "Synthwave", colors: ["#7400B8", "#48BFE3", "#FF0A54"] },
  { name: "Ocean",     colors: ["#0077B6", "#00B4D8", "#90E0EF"] },
  { name: "Citrus",    colors: ["#FF9F1C", "#2EC4B6", "#E71D36"] },
  { name: "Vapor",     colors: ["#FF6AD5", "#94D0FF", "#AD8CFF"] },
  { name: "Berry",     colors: ["#A4133C", "#FF477E", "#FFAEBC"] },
];

var CENTER = 400;
var POINTS = 8;
var sceneNameEl = document.getElementById("scene-name");
var anims = [];

// 產生一個 blob path，結構固定（同樣 8 個 cubic bezier 段）才能 morph
function blobPath(baseR, irregularity, seedOffset) {
  var pts = [];
  for (var i = 0; i < POINTS; i++) {
    var a = (i / POINTS) * Math.PI * 2 + seedOffset;
    var r = baseR * (1 + (Math.random() - 0.5) * irregularity);
    pts.push({ x: CENTER + Math.cos(a) * r, y: CENTER + Math.sin(a) * r });
  }

  // 為每個點計算前後切線方向控制點（讓曲線平滑）
  function ctrl(i, dir) {
    var prev = pts[(i - 1 + POINTS) % POINTS];
    var next = pts[(i + 1) % POINTS];
    var dx = next.x - prev.x;
    var dy = next.y - prev.y;
    var len = Math.hypot(dx, dy) || 1;
    var k = len / 4 * dir;
    return { x: pts[i].x + dx / len * k, y: pts[i].y + dy / len * k };
  }

  var d = "M " + pts[0].x.toFixed(2) + " " + pts[0].y.toFixed(2);
  for (var j = 0; j < POINTS; j++) {
    var from = j;
    var to = (j + 1) % POINTS;
    var c1 = ctrl(from, +1);
    var c2 = ctrl(to, -1);
    d += " C " + c1.x.toFixed(2) + " " + c1.y.toFixed(2) +
         " "  + c2.x.toFixed(2) + " " + c2.y.toFixed(2) +
         " "  + pts[to].x.toFixed(2) + " " + pts[to].y.toFixed(2);
  }
  d += " Z";
  return d;
}

function genPaths(n, baseR, irregularity) {
  var arr = [];
  for (var i = 0; i < n; i++) {
    arr.push({ value: blobPath(baseR, irregularity, Math.random() * Math.PI * 2) });
  }
  return arr;
}

function play() {
  anims.forEach(function(a) { a.pause(); });
  anims = [];

  var pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  sceneNameEl.textContent = "PATH MORPH · " + pal.name.toUpperCase();

  var layers = [
    { id: "#blob-a", groupId: "#blob-group-a", radius: 280, irreg: 0.6, color: pal.colors[0], alpha: 0.85, dur: 4200, rotDir: 1 },
    { id: "#blob-b", groupId: "#blob-group-b", radius: 220, irreg: 0.5, color: pal.colors[1], alpha: 0.75, dur: 3600, rotDir: -1 },
    { id: "#blob-c", groupId: "#blob-group-c", radius: 160, irreg: 0.4, color: pal.colors[2], alpha: 0.85, dur: 3000, rotDir: 1 },
  ];

  layers.forEach(function(L) {
    var pathEl = document.querySelector(L.id);
    pathEl.setAttribute("fill", L.color);
    pathEl.setAttribute("fill-opacity", L.alpha);
    pathEl.setAttribute("stroke", "none");

    // 初始化形狀
    pathEl.setAttribute("d", blobPath(L.radius, L.irreg, Math.random() * Math.PI * 2));

    // 形變動畫
    anims.push(anime({
      targets: L.id,
      d: genPaths(5, L.radius, L.irreg),
      duration: L.dur,
      easing: "easeInOutSine",
      loop: true,
      direction: "alternate"
    }));

    // 整層旋轉
    anims.push(anime({
      targets: L.groupId,
      rotate: 360 * L.rotDir,
      duration: L.dur * 5,
      easing: "linear",
      loop: true
    }));
  });
}

document.getElementById("btn-new").onclick = play;
document.getElementById("btn-new").ontouchend = function(e) { e.preventDefault(); play(); };
document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "n" || e.key === "N") { e.preventDefault(); play(); }
});

play();
