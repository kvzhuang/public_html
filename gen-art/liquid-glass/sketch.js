// ============================================
// Liquid Glass — iOS 風格 (DOM + backdrop-filter)
// 背景畫真實 iOS 桌面（app grid + dock + 漸層 wallpaper）
// 玻璃形狀只保留 4 邊形（squircle / card / pill）
// ============================================

var canvasW, canvasH;
var bgOrbs = [];
var shapes = [];
var glassLayer;
var palette;
var modes = ["lozenges", "cards", "mixed"];   // 拿掉 bubbles（圓形）
var modeIdx = 2;

// 真實 iOS app 列表（emoji + 背景色）
var IOS_APPS = [
  { name: "Phone",    bg: "#34C759", icon: "📞" },
  { name: "Messages", bg: "#5AC8FA", icon: "💬" },
  { name: "FaceTime", bg: "#34C759", icon: "📹" },
  { name: "Mail",     bg: "#1FA0FF", icon: "✉️" },
  { name: "Safari",   bg: "#F2F2F7", icon: "🧭" },
  { name: "Music",    bg: "#FA253D", icon: "🎵" },
  { name: "Photos",   bg: "#FFFFFF", icon: "🌈" },
  { name: "Camera",   bg: "#3A3A3C", icon: "📷" },
  { name: "Maps",     bg: "#A0DA9F", icon: "🗺️" },
  { name: "Calendar", bg: "#FFFFFF", icon: "📅" },
  { name: "Clock",    bg: "#000000", icon: "🕐" },
  { name: "Weather",  bg: "#54A2FF", icon: "☀️" },
  { name: "App Store",bg: "#0079FF", icon: "🛒" },
  { name: "Notes",    bg: "#FCE475", icon: "📝" },
  { name: "Reminders",bg: "#FFFFFF", icon: "✅" },
  { name: "Wallet",   bg: "#1C1C1E", icon: "💳" },
  { name: "Fitness",  bg: "#000000", icon: "🏃" },
  { name: "Books",    bg: "#FF9500", icon: "📚" },
  { name: "Translate",bg: "#0050FF", icon: "🌐" },
  { name: "Stocks",   bg: "#1C1C1E", icon: "📈" },
  { name: "Calculator",bg:"#1C1C1E", icon: "🧮" },
  { name: "News",     bg: "#FFFFFF", icon: "📰" },
  { name: "Tips",     bg: "#FFCC00", icon: "💡" },
  { name: "Voice",    bg: "#1C1C1E", icon: "🎤" },
  // Dock 4 個
  { name: "Phone",    bg: "#34C759", icon: "📞" },
  { name: "Safari",   bg: "#F2F2F7", icon: "🧭" },
  { name: "Messages", bg: "#5AC8FA", icon: "💬" },
  { name: "Music",    bg: "#FA253D", icon: "🎵" },
];

// 桌布配色（多種 iOS 風格漸層）
var PALETTES = [
  { name: "Sunset",  bg: ["#FF9D6E", "#FF6B9D", "#9D5CFF"], orbs: ["#FFC371","#FF5F6D","#C158DC"] },
  { name: "Ocean",   bg: ["#1E3C72", "#2A5298", "#4DA8DA"], orbs: ["#3A86FF","#48BFE3","#5390D9"] },
  { name: "Aurora",  bg: ["#0F2027", "#203A43", "#2C5364"], orbs: ["#06D6A0","#3A86FF","#7400B8"] },
  { name: "Coral",   bg: ["#FF6B6B", "#FFA07A", "#FFD93D"], orbs: ["#FF6B9D","#FFC371","#FFD93D"] },
  { name: "Forest",  bg: ["#134E5E", "#2E8B57", "#71B280"], orbs: ["#06D6A0","#7FB069","#52B788"] },
  { name: "Vapor",   bg: ["#7F00FF", "#E100FF", "#FF6AD5"], orbs: ["#FF6AD5","#C774E8","#94D0FF"] },
];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("stage");
  pixelDensity(1);

  glassLayer = document.createElement("div");
  glassLayer.id = "glass-layer";
  document.getElementById("stage").appendChild(glassLayer);

  document.getElementById("btn-add").onclick = function() { addShape(); };
  document.getElementById("btn-shuffle").onclick = newScene;
  document.getElementById("btn-mode").onclick = cycleMode;
  ["btn-add","btn-shuffle","btn-mode"].forEach(function(id){
    document.getElementById(id).ontouchend = function(e){
      e.preventDefault();
      document.getElementById(id).click();
    };
  });

  newScene();
}

function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  canvasW = availW;
  canvasH = availH;
}

function windowResized() {
  applyDims();
  resizeCanvas(canvasW, canvasH);
}

function newScene() {
  palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  // 桌布上的少量大色塊（讓玻璃下面有顏色變化）
  bgOrbs = [];
  var n = 3 + Math.floor(Math.random() * 3);
  for (var i = 0; i < n; i++) {
    bgOrbs.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 250 + Math.random() * 200,
      color: palette.orbs[i % palette.orbs.length]
    });
  }
  // 清掉現有玻璃 + 重生
  for (var k = 0; k < shapes.length; k++) {
    if (shapes[k].el && shapes[k].el.parentNode) shapes[k].el.parentNode.removeChild(shapes[k].el);
  }
  shapes = [];
  var m = 3 + Math.floor(Math.random() * 3);
  for (var j = 0; j < m; j++) addShape();
}

function addShape() {
  var s = makeShape();
  var el = document.createElement("div");
  el.className = "glass glass-" + s.type;
  el.style.width = s.w + "px";
  el.style.height = s.h + "px";
  glassLayer.appendChild(el);
  s.el = el;
  shapes.push(s);
  while (shapes.length > 10) {
    var first = shapes.shift();
    if (first.el && first.el.parentNode) first.el.parentNode.removeChild(first.el);
  }
}

function cycleMode() {
  modeIdx = (modeIdx + 1) % modes.length;
  for (var k = 0; k < shapes.length; k++) {
    if (shapes[k].el && shapes[k].el.parentNode) shapes[k].el.parentNode.removeChild(shapes[k].el);
  }
  shapes = [];
  for (var j = 0; j < 4; j++) addShape();
}

function pickShapeType() {
  var mode = modes[modeIdx];
  var pool;
  // 只 4 邊形：pill / squircle / card
  if (mode === "lozenges") pool = ["pill", "pill", "squircle"];
  else if (mode === "cards") pool = ["card", "card", "squircle"];
  else pool = ["pill", "squircle", "card"];   // mixed
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeShape() {
  var type = pickShapeType();
  var w, h;
  if (type === "pill") {
    w = 150 + Math.random() * 120;
    h = 50 + Math.random() * 30;
  } else if (type === "squircle") {
    w = h = 110 + Math.random() * 70;
  } else {
    w = 140 + Math.random() * 130;
    h = 100 + Math.random() * 90;
  }
  return {
    type: type,
    x: Math.random() * (canvasW - w),
    y: Math.random() * (canvasH - h),
    w: w, h: h,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    phase: Math.random() * Math.PI * 2,
    breathSpeed: 0.003 + Math.random() * 0.004,
    el: null
  };
}

// ── Draw ───────────────────────────────────────────────────────────────────

function draw() {
  drawIOSHomeScreen();
  for (var i = 0; i < shapes.length; i++) {
    updateShape(shapes[i]);
    var s = shapes[i];
    s.phase += s.breathSpeed;
    var br = 1 + Math.sin(s.phase) * 0.012;
    s.el.style.transform =
      "translate(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px) " +
      "scale(" + br.toFixed(3) + ")";
  }
}

function drawIOSHomeScreen() {
  var ctx = drawingContext;

  // 1. 漸層 wallpaper
  var grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
  grad.addColorStop(0, palette.bg[0]);
  grad.addColorStop(0.5, palette.bg[1]);
  grad.addColorStop(1, palette.bg[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. 大色塊浮動讓玻璃下面有顏色變化
  for (var i = 0; i < bgOrbs.length; i++) {
    var o = bgOrbs[i];
    o.x += o.vx;
    o.y += o.vy;
    if (o.x < -o.r * 0.5 || o.x > canvasW + o.r * 0.5) o.vx *= -1;
    if (o.y < -o.r * 0.5 || o.y > canvasH + o.r * 0.5) o.vy *= -1;
    var rgb = hexRGB(o.color);
    var og = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    og.addColorStop(0,    "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.55)");
    og.addColorStop(0.4,  "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.20)");
    og.addColorStop(1,    "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
    ctx.fillStyle = og;
    ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
  }

  // 3. App icons grid + Dock
  drawAppGrid(ctx);
}

function drawAppGrid(ctx) {
  var sidePad = canvasW * 0.05;
  var topPad = canvasH * 0.04;
  var dockH = Math.min(canvasH * 0.13, 110);
  var dockY = canvasH - dockH - canvasH * 0.025;

  var cols = 4, rows = 6;
  var iconSize = (canvasW - sidePad * 2 - (cols - 1) * canvasW * 0.04) / cols;
  iconSize = Math.min(iconSize, 76);
  var hGap = (canvasW - sidePad * 2 - cols * iconSize) / (cols - 1);
  var nameSpace = iconSize * 0.28;
  var totalGridH = dockY - topPad - canvasH * 0.04;
  var vGap = (totalGridH - rows * (iconSize + nameSpace)) / (rows - 1);
  if (vGap < 4) vGap = 4;

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var idx = r * cols + c;
      if (idx >= 24) break;
      var x = sidePad + c * (iconSize + hGap);
      var y = topPad + r * (iconSize + nameSpace + vGap);
      drawAppIcon(ctx, x, y, iconSize, IOS_APPS[idx]);
    }
  }

  // Dock
  drawDock(ctx, dockY, dockH, iconSize);
}

function drawAppIcon(ctx, x, y, size, app) {
  // 圓角方形背景
  var r = size * 0.225;
  ctx.fillStyle = app.bg;
  roundRectPath(ctx, x, y, size, size, r);
  ctx.fill();
  // emoji icon
  ctx.font = (size * 0.62) + "px 'Apple Color Emoji','Segoe UI Emoji',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(app.icon, x + size / 2, y + size / 2 + size * 0.04);
  // 名稱（白字 + 細陰影）
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "600 " + Math.max(9, size * 0.17) + "px -apple-system,'SF Pro Text',Helvetica,sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 2;
  ctx.fillText(app.name, x + size / 2, y + size + size * 0.16);
  ctx.shadowBlur = 0;
}

function drawDock(ctx, y, h, iconSize) {
  // dock 也是半透明 frosted glass 感
  var dockMargin = canvasW * 0.05;
  var dockX = dockMargin;
  var dockW = canvasW - dockMargin * 2;
  var dockR = h * 0.32;

  // dock 底層：半透明白 + 模糊（直接畫不能 backdrop-filter；用半透明 fill 模擬）
  roundRectPath(ctx, dockX, y, dockW, h, dockR);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  // dock 邊光
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, dockX + 0.5, y + 0.5, dockW - 1, h - 1, dockR);
  ctx.stroke();

  // 4 個 dock app
  var ds = Math.min(iconSize * 0.92, h * 0.78);
  var dockGap = (dockW - 4 * ds) / 5;
  for (var i = 0; i < 4; i++) {
    var ax = dockX + dockGap + i * (ds + dockGap);
    var ay = y + (h - ds) / 2;
    drawDockIcon(ctx, ax, ay, ds, IOS_APPS[24 + i]);
  }
}

function drawDockIcon(ctx, x, y, size, app) {
  var r = size * 0.225;
  ctx.fillStyle = app.bg;
  roundRectPath(ctx, x, y, size, size, r);
  ctx.fill();
  ctx.font = (size * 0.62) + "px 'Apple Color Emoji','Segoe UI Emoji',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(app.icon, x + size / 2, y + size / 2 + size * 0.04);
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Physics ────────────────────────────────────────────────────────────────

function updateShape(s) {
  s.x += s.vx;
  s.y += s.vy;
  if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
  if (s.x > canvasW - s.w) { s.x = canvasW - s.w; s.vx = -Math.abs(s.vx); }
  if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
  if (s.y > canvasH - s.h) { s.y = canvasH - s.h; s.vy = -Math.abs(s.vy); }
  for (var i = 0; i < shapes.length; i++) {
    var o = shapes[i];
    if (o === s) continue;
    var cx1 = s.x + s.w / 2, cy1 = s.y + s.h / 2;
    var cx2 = o.x + o.w / 2, cy2 = o.y + o.h / 2;
    var dx = cx1 - cx2, dy = cy1 - cy2;
    var d2 = dx * dx + dy * dy;
    var minD = (Math.max(s.w, s.h) + Math.max(o.w, o.h)) * 0.55;
    if (d2 < minD * minD && d2 > 0.01) {
      var d = Math.sqrt(d2);
      var push = (minD - d) * 0.006;
      s.vx += (dx / d) * push;
      s.vy += (dy / d) * push;
    }
  }
  s.vx *= 0.998;
  s.vy *= 0.998;
  var minV = 0.10;
  var v2 = s.vx * s.vx + s.vy * s.vy;
  if (v2 < minV * minV) {
    var ang = Math.random() * Math.PI * 2;
    s.vx = Math.cos(ang) * minV;
    s.vy = Math.sin(ang) * minV;
  }
}

// ── Interaction ─────────────────────────────────────────────────────────────

function mousePressed() {
  var mx = mouseX, my = mouseY;
  for (var i = shapes.length - 1; i >= 0; i--) {
    var s = shapes[i];
    if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
      var ang = Math.atan2(
        (s.y + s.h / 2) - my,
        (s.x + s.w / 2) - mx
      );
      var f = 5;
      s.vx += Math.cos(ang) * f;
      s.vy += Math.sin(ang) * f;
      return false;
    }
  }
  addShape();
  var ns = shapes[shapes.length - 1];
  ns.x = Math.max(0, Math.min(canvasW - ns.w, mx - ns.w / 2));
  ns.y = Math.max(0, Math.min(canvasH - ns.h, my - ns.h / 2));
  return false;
}

function keyPressed() {
  if (key === " ") newScene();
  if (key === "a" || key === "A") addShape();
  if (key === "m" || key === "M") cycleMode();
}

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
