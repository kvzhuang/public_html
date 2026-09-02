// Anime Constellation
// DOM + SVG gen-art driven by anime.js timeline, stagger and path helpers.

var PALETTES = [
  { name: "Aurora", bg: "#071018", colors: ["#7ef9d3", "#44c7f4", "#f6f06d", "#f56f9b"] },
  { name: "Ember", bg: "#120b09", colors: ["#ffcf70", "#f36b3d", "#e7386f", "#6ed3ff"] },
  { name: "Mineral", bg: "#07100d", colors: ["#c7f9cc", "#80ed99", "#57cc99", "#38a3a5", "#f8ffe5"] },
  { name: "Signal", bg: "#080812", colors: ["#f72585", "#4cc9f0", "#b8f7d4", "#ffd166"] },
  { name: "Paper Night", bg: "#0d0e13", colors: ["#f4f1de", "#e07a5f", "#81b29a", "#f2cc8f"] },
  { name: "Arcade", bg: "#09090f", colors: ["#00f5d4", "#fee440", "#f15bb5", "#9b5de5"] }
];

var MODES = ["radial", "rings", "lattice"];
var stage = document.getElementById("stage");
var orbits = document.getElementById("orbits");
var chords = document.getElementById("chords");
var readout = document.getElementById("readout");
var btnGenerate = document.getElementById("btn-generate");
var btnMode = document.getElementById("btn-mode");
var btnPause = document.getElementById("btn-pause");
var running = true;
var modeIndex = 0;
var timeline = null;
var motionAnimations = [];
var seed = Date.now() % 100000;

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

function clearScene() {
  if (timeline) timeline.pause();
  for (var i = 0; i < motionAnimations.length; i++) motionAnimations[i].pause();
  motionAnimations = [];
  orbits.innerHTML = "";
  chords.innerHTML = "";
  var old = stage.querySelectorAll(".node, .traveler, .cell");
  for (var j = 0; j < old.length; j++) old[j].remove();
}

function makePath(cx, cy, rx, ry, wobble, petals, phase) {
  var steps = 96;
  var d = "";
  for (var i = 0; i <= steps; i++) {
    var a = phase + Math.PI * 2 * i / steps;
    var pulse = 1 + wobble * Math.sin(a * petals + phase * 1.7);
    var x = cx + Math.cos(a) * rx * pulse;
    var y = cy + Math.sin(a) * ry * pulse;
    d += (i === 0 ? "M " : " L ") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d + " Z";
}

function createSvgPath(d, className) {
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("class", className);
  return path;
}

function createNode(x, y, color, size) {
  var node = document.createElement("div");
  node.className = "node";
  node.style.left = x + "px";
  node.style.top = y + "px";
  node.style.setProperty("--c", color);
  node.style.width = size + "px";
  stage.appendChild(node);
  return node;
}

function createCell(x, y, color) {
  var cell = document.createElement("div");
  cell.className = "cell";
  cell.style.left = x + "px";
  cell.style.top = y + "px";
  cell.style.background = color;
  stage.appendChild(cell);
  return cell;
}

function line(x1, y1, x2, y2, color) {
  var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l.setAttribute("class", "chord");
  l.setAttribute("x1", x1);
  l.setAttribute("y1", y1);
  l.setAttribute("x2", x2);
  l.setAttribute("y2", y2);
  l.setAttribute("stroke", color);
  chords.appendChild(l);
  return l;
}

function generate() {
  seed = Math.floor(Math.random() * 999999);
  draw();
}

function draw() {
  clearScene();
  var w = Math.max(320, stage.clientWidth);
  var h = Math.max(320, stage.clientHeight);
  var unit = Math.min(w, h);
  document.getElementById("sky").setAttribute("viewBox", "0 0 " + w + " " + h);
  var rnd = mulberry32(seed);
  var palette = pick(PALETTES, rnd);
  var mode = MODES[modeIndex];
  document.body.style.background = palette.bg;
  var nodeCount = mode === "lattice" ? 81 : 42 + Math.floor(rnd() * 18);
  var orbitCount = 4 + Math.floor(rnd() * 4);
  var nodes = [];
  var cells = [];
  var paths = [];
  var centerX = w * 0.5 + (rnd() - 0.5) * unit * 0.12;
  var centerY = h * 0.52 + (rnd() - 0.5) * unit * 0.12;

  for (var i = 0; i < orbitCount; i++) {
    var rx = unit * (0.14 + i * (0.045 + rnd() * 0.022));
    var ry = rx * (0.48 + rnd() * 0.35);
    var d = makePath(centerX, centerY, rx, ry, 0.05 + rnd() * 0.13, 3 + Math.floor(rnd() * 5), rnd() * 6.28);
    var path = createSvgPath(d, "orbit");
    path.style.stroke = palette.colors[i % palette.colors.length];
    path.style.opacity = 0.18 + rnd() * 0.22;
    orbits.appendChild(path);
    paths.push(path);
  }

  if (mode === "lattice") {
    var side = 9;
    var spacing = unit * 0.072;
    var startX = centerX - spacing * (side - 1) / 2;
    var startY = centerY - spacing * (side - 1) / 2;
    for (var r = 0; r < side; r++) {
      for (var c = 0; c < side; c++) {
        var gx = startX + c * spacing + (rnd() - 0.5) * spacing * 0.28;
        var gy = startY + r * spacing + (rnd() - 0.5) * spacing * 0.28;
        cells.push(createCell(gx, gy, palette.colors[(r + c) % palette.colors.length]));
      }
    }
  } else {
    for (var n = 0; n < nodeCount; n++) {
      var angle = rnd() * Math.PI * 2;
      var ring = mode === "rings" ? unit * (0.16 + (n % 5) * 0.055) : unit * (0.07 + Math.pow(rnd(), 0.55) * 0.36);
      var x = centerX + Math.cos(angle) * ring * (0.82 + rnd() * 0.32);
      var y = centerY + Math.sin(angle) * ring * (0.58 + rnd() * 0.36);
      var color = palette.colors[n % palette.colors.length];
      nodes.push({ x: x, y: y, el: createNode(x, y, color, 5 + rnd() * 8), c: color });
    }
    for (var k = 0; k < nodes.length; k++) {
      var next = nodes[(k + 3 + Math.floor(rnd() * 8)) % nodes.length];
      if (rnd() > 0.43) line(nodes[k].x, nodes[k].y, next.x, next.y, nodes[k].c);
    }
  }

  for (var p = 0; p < paths.length; p++) {
    var traveler = document.createElement("div");
    traveler.className = "traveler";
    traveler.style.setProperty("--c", palette.colors[p % palette.colors.length]);
    stage.appendChild(traveler);
    var motion = anime.path(paths[p]);
    motionAnimations.push(anime({
      targets: traveler,
      translateX: motion("x"),
      translateY: motion("y"),
      rotate: motion("angle"),
      easing: "linear",
      duration: 7000 + p * 1100,
      delay: p * 260,
      loop: true
    }));
  }

  anime.set(".orbit", { opacity: 0, scale: 0.86, transformOrigin: centerX + "px " + centerY + "px" });
  anime.set(".node", { scale: 0, opacity: 0 });
  anime.set(".cell", { scale: 0, opacity: 0, rotate: 0 });
  anime.set(".chord", { opacity: 0, scale: 0.6 });

  timeline = anime.timeline({ autoplay: true })
    .add({
      targets: ".orbit",
      opacity: [0, 0.55],
      scale: [0.86, 1],
      rotate: function() { return anime.random(-18, 18); },
      delay: anime.stagger(120),
      duration: 1100,
      easing: "easeOutExpo"
    })
    .add({
      targets: mode === "lattice" ? ".cell" : ".node",
      opacity: [0, 1],
      scale: [0, 1],
      borderRadius: mode === "lattice" ? ["2px", "50%", "2px"] : undefined,
      rotate: mode === "lattice" ? anime.stagger([0, 180], { grid: [9, 9], from: "center" }) : undefined,
      delay: mode === "lattice" ? anime.stagger(22, { grid: [9, 9], from: "center" }) : anime.stagger(18, { from: "center" }),
      duration: 900,
      easing: "easeOutElastic(1, .65)"
    }, "-=520")
    .add({
      targets: ".chord",
      opacity: [0, 0.72],
      scale: [0.6, 1],
      delay: anime.stagger(16, { from: "center" }),
      duration: 800,
      easing: "easeOutSine"
    }, "-=540");

  anime({
    targets: ".orbit",
    strokeDashoffset: [anime.setDashoffset, 0],
    easing: "linear",
    duration: 5200,
    delay: anime.stagger(300),
    loop: true
  });

  if (mode === "lattice") {
    motionAnimations.push(anime({
      targets: ".cell",
      translateX: anime.stagger([-18, 18], { grid: [9, 9], from: "center", axis: "x" }),
      translateY: anime.stagger([-18, 18], { grid: [9, 9], from: "center", axis: "y" }),
      scale: [{ value: 0.5 }, { value: 1.35 }, { value: 0.8 }],
      delay: anime.stagger(38, { grid: [9, 9], from: "center" }),
      duration: 2200,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine"
    }));
  } else {
    motionAnimations.push(anime({
      targets: ".node",
      scale: [{ value: 0.72 }, { value: 1.42 }, { value: 0.95 }],
      opacity: [{ value: 0.52 }, { value: 1 }],
      delay: anime.stagger(34, { from: "center" }),
      duration: 2100,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine"
    }));
  }

  readout.innerHTML = [
    "SEED " + seed,
    "MODE " + mode.toUpperCase(),
    "PALETTE " + palette.name.toUpperCase()
  ].join("<br>");
  btnMode.textContent = "Mode: " + mode;
  running = true;
  btnPause.textContent = "Pause";
}

function togglePause() {
  running = !running;
  var action = running ? "play" : "pause";
  if (timeline) timeline[action]();
  for (var i = 0; i < motionAnimations.length; i++) motionAnimations[i][action]();
  btnPause.textContent = running ? "Pause" : "Play";
}

btnGenerate.addEventListener("click", generate);
btnMode.addEventListener("click", function() {
  modeIndex = (modeIndex + 1) % MODES.length;
  generate();
});
btnPause.addEventListener("click", togglePause);

var resizeTimer = null;
window.addEventListener("resize", function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(draw, 180);
});

document.addEventListener("keydown", function(e) {
  if (e.key === " " || e.key === "n" || e.key === "N") {
    e.preventDefault();
    generate();
  }
  if (e.key === "m" || e.key === "M") {
    modeIndex = (modeIndex + 1) % MODES.length;
    generate();
  }
  if (e.key === "p" || e.key === "P") togglePause();
});

draw();
