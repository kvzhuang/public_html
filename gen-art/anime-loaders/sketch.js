// ============================================
// Anime Loaders — 4x3 grid of randomly-assigned loading spinners
// 16 種 loading 類型，從 pool 抽 12 個（不重複）；每個各有 anime.js 動畫
// ============================================

var PALETTES = [
  { name: "Neon",      colors: ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC"] },
  { name: "Tropical",  colors: ["#EF476F", "#FFD166", "#06D6A0", "#118AB2", "#073B4C"] },
  { name: "Synthwave", colors: ["#7400B8", "#5390D9", "#48BFE3", "#80FFDB", "#FF0A54"] },
  { name: "Citrus",    colors: ["#FF9F1C", "#FFBF69", "#2EC4B6", "#CBF3F0", "#E71D36"] },
  { name: "Vapor",     colors: ["#FF6AD5", "#C774E8", "#AD8CFF", "#8795E8", "#94D0FF"] },
  { name: "Forest",    colors: ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"] },
  { name: "Mono",      colors: ["#F8F9FA", "#DEE2E6", "#ADB5BD", "#6C757D", "#495057"] },
  { name: "Berry",     colors: ["#A4133C", "#FF477E", "#FF85A1", "#FFAEBC", "#A0E7E5"] },
];

function pickColor(pal) { return pal.colors[Math.floor(Math.random() * pal.colors.length)]; }
function pickColors(pal, n) { var r = []; for (var i = 0; i < n; i++) r.push(pickColor(pal)); return r; }

// ── Loader pool ────────────────────────────────────────────────────────────

var LOADERS = [
  {
    name: "PULSE DOTS",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-row">' +
        '<div class="lr-dot" style="background:'+c+'"></div>' +
        '<div class="lr-dot" style="background:'+c+'"></div>' +
        '<div class="lr-dot" style="background:'+c+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-dot"),
        scale: [{ value: 0.4 }, { value: 1 }],
        delay: anime.stagger(150),
        duration: 600, loop: true, direction: "alternate", easing: "easeInOutSine"
      });
    }
  },
  {
    name: "FADE DOTS",
    build: function(cell, pal) {
      var cs = pickColors(pal, 3);
      cell.innerHTML = '<div class="lr-row">' +
        '<div class="lr-dot" style="background:'+cs[0]+'"></div>' +
        '<div class="lr-dot" style="background:'+cs[1]+'"></div>' +
        '<div class="lr-dot" style="background:'+cs[2]+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-dot"),
        opacity: [{ value: 0.2 }, { value: 1 }],
        delay: anime.stagger(180),
        duration: 700, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "BARS",
    build: function(cell, pal) {
      var c = pickColor(pal);
      var h = '<div class="lr-row">';
      for (var i = 0; i < 5; i++) h += '<div class="lr-bar" style="background:'+c+'"></div>';
      cell.innerHTML = h + '</div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-bar"),
        scaleY: [{ value: 0.3 }, { value: 1 }],
        delay: anime.stagger(90),
        duration: 500, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "SPINNER",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<svg class="lr-svg" viewBox="0 0 50 50">' +
        '<circle cx="25" cy="25" r="20" stroke="'+c+'" stroke-width="4" fill="none" stroke-dasharray="80 50" stroke-linecap="round"/></svg>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-svg"),
        rotate: 360,
        duration: 1100, loop: true, easing: "linear"
      });
    }
  },
  {
    name: "DUAL RING",
    build: function(cell, pal) {
      var c1 = pickColor(pal), c2 = pickColor(pal);
      cell.innerHTML = '<svg class="lr-svg" viewBox="0 0 50 50">' +
        '<circle cx="25" cy="25" r="20" stroke="'+c1+'" stroke-width="3" fill="none" stroke-dasharray="50 80"/>' +
        '<circle cx="25" cy="25" r="14" stroke="'+c2+'" stroke-width="3" fill="none" stroke-dasharray="40 50"/></svg>';
    },
    animate: function(cell) {
      var circles = cell.querySelectorAll("circle");
      var a1 = anime({ targets: circles[0], rotate: 360, duration: 1500, loop: true, easing: "linear" });
      var a2 = anime({ targets: circles[1], rotate: -360, duration: 1100, loop: true, easing: "linear" });
      circles[0].style.transformOrigin = "25px 25px";
      circles[1].style.transformOrigin = "25px 25px";
      return [a1, a2];
    }
  },
  {
    name: "BOUNCE",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-ball" style="background:'+c+'"></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-ball"),
        translateY: [{ value: "-40%" }, { value: "40%" }],
        scaleX: [{ value: 1, duration: 200 }, { value: 1.2, duration: 100 }, { value: 1, duration: 200 }],
        duration: 700, loop: true, direction: "alternate", easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "ORBIT",
    build: function(cell, pal) {
      var cs = pickColors(pal, 2);
      cell.innerHTML = '<div class="lr-orbit-wrap">' +
        '<div class="lr-orbit-dot" style="background:'+cs[0]+'"></div>' +
        '<div class="lr-orbit-dot lr-orbit-dot-b" style="background:'+cs[1]+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-orbit-wrap"),
        rotate: 360,
        duration: 1400, loop: true, easing: "linear"
      });
    }
  },
  {
    name: "QUAD ORBIT",
    build: function(cell, pal) {
      var cs = pickColors(pal, 4);
      cell.innerHTML = '<div class="lr-orbit-wrap">' +
        '<div class="lr-orbit-dot" style="background:'+cs[0]+'"></div>' +
        '<div class="lr-orbit-dot lr-orbit-dot-b" style="background:'+cs[1]+'"></div>' +
        '<div class="lr-orbit-dot lr-orbit-dot-c" style="background:'+cs[2]+'"></div>' +
        '<div class="lr-orbit-dot lr-orbit-dot-d" style="background:'+cs[3]+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-orbit-wrap"),
        rotate: -360,
        duration: 2000, loop: true, easing: "linear"
      });
    }
  },
  {
    name: "WAVE",
    build: function(cell, pal) {
      var c = pickColor(pal);
      var h = '<div class="lr-row">';
      for (var i = 0; i < 5; i++) h += '<div class="lr-dot" style="background:'+c+'; width:12%"></div>';
      cell.innerHTML = h + '</div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-dot"),
        translateY: [{ value: -15 }, { value: 15 }],
        delay: anime.stagger(100),
        duration: 700, loop: true, direction: "alternate", easing: "easeInOutSine"
      });
    }
  },
  {
    name: "SPIN SQUARE",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-square" style="background:'+c+'"></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-square"),
        rotate: 360,
        scale: [{ value: 0.5 }, { value: 1 }, { value: 0.5 }],
        duration: 1400, loop: true, easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "CROSS",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div style="position:relative; width:60%; aspect-ratio:1;">' +
        '<div class="lr-cross-bar lr-cross-h" style="background:'+c+'"></div>' +
        '<div class="lr-cross-bar lr-cross-v" style="background:'+c+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector("div > div").parentNode,
        rotate: [0, 180, 360],
        scale: [{ value: 1 }, { value: 0.6 }, { value: 1 }],
        duration: 1600, loop: true, easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "SNAKE",
    build: function(cell, pal) {
      var c = pickColor(pal);
      var h = '<div class="lr-snake">';
      for (var i = 0; i < 8; i++) h += '<div class="lr-snake-dot" style="background:'+c+'"></div>';
      cell.innerHTML = h + '</div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-snake-dot"),
        opacity: [{ value: 0.2 }, { value: 1 }],
        scale: [{ value: 0.6 }, { value: 1.1 }],
        delay: anime.stagger(70),
        duration: 350, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "IRIS",
    build: function(cell, pal) {
      var cs = pickColors(pal, 3);
      cell.innerHTML = '<div class="lr-iris-wrap">' +
        '<div class="lr-iris-ring lr-iris-ring-1" style="background:'+cs[0]+'"></div>' +
        '<div class="lr-iris-ring lr-iris-ring-2" style="background:'+cs[1]+'"></div>' +
        '<div class="lr-iris-ring lr-iris-ring-3" style="background:'+cs[2]+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-iris-ring"),
        scale: [{ value: 0 }, { value: 1 }],
        delay: anime.stagger(180),
        duration: 1100, loop: true, direction: "alternate", easing: "easeInOutQuart"
      });
    }
  },
  {
    name: "BAR FILL",
    build: function(cell, pal) {
      var cs = pickColors(pal, 2);
      cell.innerHTML = '<div class="lr-bar-track" style="background:'+cs[1]+'33">' +
        '<div class="lr-bar-fill" style="background:'+cs[0]+'; width:0%"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-bar-fill"),
        width: ["0%", "100%"],
        duration: 1500, loop: true, easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "HEARTBEAT",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-square" style="background:'+c+'; border-radius:50%"></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-square"),
        scale: [
          { value: 1, duration: 100 },
          { value: 1.4, duration: 180 },
          { value: 1, duration: 180 },
          { value: 1.25, duration: 180 },
          { value: 1, duration: 760 }
        ],
        loop: true, easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "DOT TRAIL",
    build: function(cell, pal) {
      var c = pickColor(pal);
      var N = 10;
      var h = '<div class="lr-trail-wrap">';
      for (var i = 0; i < N; i++) {
        var ang = (i / N) * 360;
        h += '<div class="lr-trail-dot" style="background:'+c+'; transform: rotate('+ang+'deg) translateY(-180%); transform-origin: center;"></div>';
      }
      cell.innerHTML = h + '</div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-trail-dot"),
        opacity: [{ value: 0.15 }, { value: 1 }],
        delay: anime.stagger(80),
        duration: 400, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "RIPPLE",
    build: function(cell, pal) {
      var cs = pickColors(pal, 2);
      cell.innerHTML = '<div style="position:relative; width:60%; aspect-ratio:1;">' +
        '<div class="lr-ripple" style="border-color:'+cs[0]+'; width: 100%; height: 100%; margin: -50% 0 0 -50%;"></div>' +
        '<div class="lr-ripple" style="border-color:'+cs[1]+'; width: 100%; height: 100%; margin: -50% 0 0 -50%;"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-ripple"),
        scale: [{ value: 0, duration: 0 }, { value: 1.4 }],
        opacity: [{ value: 1 }, { value: 0 }],
        delay: anime.stagger(700),
        duration: 1400, loop: true, easing: "easeOutQuad"
      });
    }
  },
  {
    name: "DIAMOND",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-square" style="background:'+c+'"></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-square"),
        rotate: [45, 405],
        scale: [{ value: 0.6 }, { value: 1.1 }, { value: 0.6 }],
        duration: 1800, loop: true, easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "STAR",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<svg class="lr-svg" viewBox="0 0 50 50"><polygon points="25,4 30,18 45,18 33,28 38,43 25,34 12,43 17,28 5,18 20,18" fill="'+c+'"/></svg>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-svg"),
        rotate: 360,
        scale: [{ value: 0.7 }, { value: 1.15 }, { value: 0.7 }],
        duration: 2200, loop: true, easing: "easeInOutSine"
      });
    }
  },
  {
    name: "3X3 MATRIX",
    build: function(cell, pal) {
      var c = pickColor(pal);
      var h = '<div class="lr-matrix-wrap">';
      for (var i = 0; i < 9; i++) h += '<div class="lr-matrix-dot" style="background:'+c+'"></div>';
      cell.innerHTML = h + '</div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-matrix-dot"),
        scale: [{ value: 0.3 }, { value: 1 }],
        delay: anime.stagger(80, { grid: [3, 3], from: "center" }),
        duration: 500, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "COLOR CYCLE",
    build: function(cell, pal) {
      cell.dataset.cycleColors = pal.colors.join(",");
      cell.innerHTML = '<div class="lr-square" style="background:'+pal.colors[0]+'; border-radius: 50%;"></div>';
    },
    animate: function(cell) {
      var colors = cell.dataset.cycleColors.split(",");
      var kf = colors.map(function(c){ return { value: c }; });
      kf.push({ value: colors[0] });
      return anime({
        targets: cell.querySelector(".lr-square"),
        backgroundColor: kf,
        scale: [{ value: 1 }, { value: 1.18 }, { value: 1 }],
        duration: colors.length * 500, loop: true, easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "PLUS X",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-plusx-wrap">' +
        '<div class="lr-cross-bar lr-cross-h" style="background:'+c+'"></div>' +
        '<div class="lr-cross-bar lr-cross-v" style="background:'+c+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-plusx-wrap"),
        rotate: [0, 45, 90, 135, 180],
        scale: [{ value: 1 }, { value: 0.75 }, { value: 1 }, { value: 0.75 }, { value: 1 }],
        duration: 1800, loop: true, easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "HEXAGON",
    build: function(cell, pal) {
      var cs = pickColors(pal, 6);
      var h = '<svg class="lr-svg" viewBox="0 0 50 50">';
      for (var i = 0; i < 6; i++) {
        var a1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
        var a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
        var x1 = 25 + Math.cos(a1) * 20;
        var y1 = 25 + Math.sin(a1) * 20;
        var x2 = 25 + Math.cos(a2) * 20;
        var y2 = 25 + Math.sin(a2) * 20;
        h += '<polygon class="lr-hex-tri" points="25,25 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1) + '" fill="' + cs[i] + '"/>';
      }
      h += '</svg>';
      cell.innerHTML = h;
    },
    animate: function(cell) {
      var rotAnim = anime({
        targets: cell.querySelector(".lr-svg"),
        rotate: 360,
        duration: 3000, loop: true, easing: "linear"
      });
      var triAnim = anime({
        targets: cell.querySelectorAll(".lr-hex-tri"),
        opacity: [{ value: 0.3 }, { value: 1 }],
        delay: anime.stagger(120),
        duration: 600, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
      return [rotAnim, triAnim];
    }
  },
  {
    name: "PENDULUM",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-pendulum-wrap"><div class="lr-pendulum-arm"><div class="lr-pendulum-bob" style="background:'+c+'"></div></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-pendulum-arm"),
        rotate: [-45, 45],
        duration: 1100, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  },
  {
    name: "FLIP",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-square" style="background:'+c+'"></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-square"),
        rotateY: [0, 180, 360],
        scale: [{ value: 1 }, { value: 0.7 }, { value: 1 }, { value: 0.7 }, { value: 1 }],
        duration: 1800, loop: true, easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "PETALS",
    build: function(cell, pal) {
      var c = pickColor(pal);
      var h = '<div class="lr-petal-wrap">';
      for (var i = 0; i < 6; i++) {
        var ang = (i / 6) * 360;
        h += '<div class="lr-petal" style="background:' + c + '; transform: rotate(' + ang + 'deg);"></div>';
      }
      cell.innerHTML = h + '</div>';
    },
    animate: function(cell) {
      var petals = cell.querySelectorAll(".lr-petal");
      var wrap = cell.querySelector(".lr-petal-wrap");
      var fadeAnim = anime({
        targets: petals,
        opacity: [{ value: 0.18 }, { value: 1 }],
        delay: anime.stagger(120),
        duration: 600, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
      var rotAnim = anime({
        targets: wrap,
        rotate: 360,
        duration: 4000, loop: true, easing: "linear"
      });
      return [fadeAnim, rotAnim];
    }
  },
  {
    name: "VIBRATE",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-square" style="background:'+c+'"></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelector(".lr-square"),
        translateX: [
          { value: -10, duration: 80 },
          { value: 10, duration: 80 },
          { value: -8, duration: 80 },
          { value: 8, duration: 80 },
          { value: 0, duration: 80 },
          { value: 0, duration: 700 }
        ],
        rotate: [
          { value: -8, duration: 80 },
          { value: 8, duration: 80 },
          { value: 0, duration: 80 },
          { value: 0, duration: 860 }
        ],
        loop: true, easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "TWIN BOUNCE",
    build: function(cell, pal) {
      var cs = pickColors(pal, 2);
      cell.innerHTML = '<div class="lr-row">' +
        '<div class="lr-ball" style="background:'+cs[0]+'; width:22%"></div>' +
        '<div class="lr-ball" style="background:'+cs[1]+'; width:22%"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-ball"),
        translateY: [{ value: "-45%" }, { value: "45%" }],
        delay: anime.stagger(400),
        duration: 750, loop: true, direction: "alternate", easing: "easeInOutCubic"
      });
    }
  },
  {
    name: "SLIDE BARS",
    build: function(cell, pal) {
      var c = pickColor(pal);
      cell.innerHTML = '<div class="lr-col">' +
        '<div class="lr-slide-bar" style="background:'+c+'"></div>' +
        '<div class="lr-slide-bar" style="background:'+c+'"></div>' +
        '<div class="lr-slide-bar" style="background:'+c+'"></div></div>';
    },
    animate: function(cell) {
      return anime({
        targets: cell.querySelectorAll(".lr-slide-bar"),
        translateX: [{ value: "-25%" }, { value: "25%" }],
        delay: anime.stagger(160),
        duration: 900, loop: true, direction: "alternate", easing: "easeInOutQuad"
      });
    }
  }
];

// ── Main ───────────────────────────────────────────────────────────────────

var gridEl = document.getElementById("grid");
var titleEl = document.getElementById("title");
var anims = [];

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function play() {
  // 暫停舊動畫
  anims.forEach(function(a) {
    if (Array.isArray(a)) a.forEach(function(x){ x.pause && x.pause(); });
    else a.pause && a.pause();
  });
  anims = [];
  gridEl.innerHTML = "";

  var pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  titleEl.textContent = "ANIME LOADERS · " + pal.name.toUpperCase();

  // 從 16 種類型隨機抽 12 種（不重複，若不足則允許重複）
  var picked;
  if (LOADERS.length >= 12) picked = shuffle(LOADERS).slice(0, 12);
  else {
    picked = [];
    for (var k = 0; k < 12; k++) picked.push(LOADERS[Math.floor(Math.random() * LOADERS.length)]);
  }

  picked.forEach(function(loader) {
    var cell = document.createElement("div");
    cell.className = "cell";
    var inner = document.createElement("div");
    inner.style.cssText = "width:100%; height:100%; display:flex; align-items:center; justify-content:center; position:relative;";
    cell.appendChild(inner);
    var label = document.createElement("div");
    label.className = "cell-label";
    label.textContent = loader.name;
    cell.appendChild(label);
    gridEl.appendChild(cell);

    loader.build(inner, pal);
    var a = loader.animate(inner);
    anims.push(a);
  });
}

document.getElementById("btn-new").onclick = play;
document.getElementById("btn-new").ontouchend = function(e) { e.preventDefault(); play(); };
document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "n" || e.key === "N") { e.preventDefault(); play(); }
});

play();
