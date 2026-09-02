// ============================================
// Fractal Mountain — 碎形山水
// Midpoint displacement algorithm generates
// multi-layered mountain ridgelines with
// ink wash / atmospheric depth effects.
// ============================================

const rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────

const PALETTES = [
  {
    name: "水墨",
    sky: ["#E8E0D5", "#D5CCBF"],
    layers: [
      { fill: [60,75,60], stroke: [40,55,40] },
      { fill: [75,90,72], stroke: [50,65,48] },
      { fill: [90,105,82], stroke: [60,78,55] },
      { fill: [105,118,92], stroke: [70,88,62] },
      { fill: [125,135,108], stroke: [85,100,75] },
      { fill: [150,158,132], stroke: [110,120,95] },
      { fill: [175,180,160], stroke: [140,148,128] },
    ],
    fog: [228, 224, 213],
    water: [180, 195, 185],
    moon: null,
  },
  {
    name: "暮色",
    sky: ["#1a0533", "#3d1a66"],
    layers: [
      { fill: [15,10,30], stroke: [10,5,25] },
      { fill: [25,18,48], stroke: [18,12,38] },
      { fill: [38,28,65], stroke: [28,20,50] },
      { fill: [52,38,80], stroke: [38,28,62] },
      { fill: [68,50,98], stroke: [48,38,75] },
      { fill: [88,65,115], stroke: [62,48,88] },
      { fill: [110,82,135], stroke: [80,62,105] },
    ],
    fog: [45, 30, 72],
    water: [20, 15, 40],
    moon: "#FFE4B5",
  },
  {
    name: "晨曦",
    sky: ["#FF9A76", "#FFECD2"],
    layers: [
      { fill: [50,45,55], stroke: [35,30,40] },
      { fill: [65,55,62], stroke: [45,38,48] },
      { fill: [82,68,70], stroke: [58,48,52] },
      { fill: [100,80,78], stroke: [72,58,58] },
      { fill: [120,95,88], stroke: [88,70,65] },
      { fill: [145,112,100], stroke: [108,85,78] },
      { fill: [170,135,118], stroke: [130,102,90] },
    ],
    fog: [255, 200, 170],
    water: [180, 120, 100],
    moon: null,
  },
  {
    name: "深冬",
    sky: ["#C8D8E4", "#E8EEF2"],
    layers: [
      { fill: [55,65,78], stroke: [38,48,60] },
      { fill: [70,82,95], stroke: [50,60,72] },
      { fill: [88,98,112], stroke: [62,72,85] },
      { fill: [105,115,128], stroke: [78,88,100] },
      { fill: [125,135,148], stroke: [95,105,118] },
      { fill: [148,158,168], stroke: [115,125,135] },
      { fill: [172,180,188], stroke: [138,148,155] },
    ],
    fog: [200, 212, 225],
    water: [140, 160, 178],
    moon: null,
  },
  {
    name: "翠嶺",
    sky: ["#D4E6D0", "#F0F5EE"],
    layers: [
      { fill: [28,58,32], stroke: [18,42,22] },
      { fill: [38,72,40], stroke: [25,52,28] },
      { fill: [50,88,50], stroke: [35,65,35] },
      { fill: [65,105,62], stroke: [45,78,42] },
      { fill: [82,122,75], stroke: [58,92,52] },
      { fill: [102,142,90], stroke: [72,108,65] },
      { fill: [128,162,112], stroke: [92,128,82] },
    ],
    fog: [210, 230, 208],
    water: [100, 145, 105],
    moon: null,
  },
  {
    name: "月夜",
    sky: ["#0a0e1a", "#1a2040"],
    layers: [
      { fill: [8,12,22], stroke: [5,8,15] },
      { fill: [12,18,32], stroke: [8,12,22] },
      { fill: [18,25,42], stroke: [12,18,30] },
      { fill: [25,35,55], stroke: [18,25,40] },
      { fill: [32,45,68], stroke: [22,32,50] },
      { fill: [42,58,82], stroke: [28,42,62] },
      { fill: [55,72,98], stroke: [38,55,75] },
    ],
    fog: [15, 20, 38],
    water: [8, 12, 28],
    moon: "#FFFDE7",
  },
  {
    name: "赤壁",
    sky: ["#2A0A0A", "#5C1A1A"],
    layers: [
      { fill: [40,12,10], stroke: [28,8,5] },
      { fill: [55,18,15], stroke: [38,12,10] },
      { fill: [72,25,20], stroke: [50,18,15] },
      { fill: [90,35,28], stroke: [65,25,20] },
      { fill: [110,45,35], stroke: [80,32,25] },
      { fill: [130,58,42], stroke: [98,42,32] },
      { fill: [155,72,52], stroke: [118,55,40] },
    ],
    fog: [80, 30, 25],
    water: [30, 10, 8],
    moon: "#FFD0A0",
  },
];

// ── State ───────────────────────────────────────────────────────────────────

let pal;
let sz;
let layerCount;     // 5-7 mountain layers
let iterations;     // 6-8 fractal iterations
let ridgelines = []; // array of {points[], layerIdx}
let hasWater;
let hasMoon;
let moonX, moonY, moonR;

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  sz = min(windowWidth, windowHeight);
  createCanvas(sz, sz);
  generate();
  noLoop();
  setTimeout(fxpreview, 1000);
}

function generate() {
  pal = PALETTES[floor(rand() * PALETTES.length)];
  layerCount = floor(rand() * 3) + 5; // 5-7
  iterations = floor(rand() * 3) + 6; // 6-8
  hasWater = rand() < 0.6;
  hasMoon = pal.moon !== null && rand() < 0.7;
  moonR = sz * (rand() * 0.03 + 0.025);

  generateRidgelines();

  // Position moon well ABOVE the highest mountain peak (including glow radius)
  var highestY = sz;
  for (var li = 0; li < ridgelines.length; li++) {
    for (var pi = 0; pi < ridgelines[li].points.length; pi++) {
      if (ridgelines[li].points[pi].y < highestY) {
        highestY = ridgelines[li].points[pi].y;
      }
    }
  }
  // Moon + full glow must clear the highest peak
  var glowRadius = moonR * 2.5;
  var moonMaxY = highestY - glowRadius - sz * 0.02;
  var moonMinY = sz * 0.04;
  if (moonMaxY < moonMinY) moonMaxY = moonMinY;
  moonX = sz * (rand() * 0.5 + 0.25);
  moonY = moonMinY + rand() * max(moonMaxY - moonMinY, 0);

  window.$fxhashFeatures = {
    "Palette": pal.name,
    "Layers": layerCount,
    "Iterations": iterations,
    "Water": hasWater ? "Yes" : "No",
    "Moon": hasMoon ? "Yes" : "No",
  };
}

// ── Midpoint Displacement ───────────────────────────────────────────────────

function midpointDisplace(y1, y2, roughness, depth) {
  if (depth <= 0) return [y1, y2];

  var mid = (y1 + y2) / 2 + (rand() - 0.5) * roughness;
  var left = midpointDisplace(y1, mid, roughness * 0.55, depth - 1);
  var right = midpointDisplace(mid, y2, roughness * 0.55, depth - 1);

  // Merge: left includes endpoint, right starts from mid
  left.pop(); // remove duplicate mid
  return left.concat(right);
}

function generateRidgeline(baseY, roughness, heightRange) {
  // Start and end y positions (slightly different for asymmetry)
  var yL = baseY + (rand() - 0.5) * heightRange * 0.3;
  var yR = baseY + (rand() - 0.5) * heightRange * 0.3;

  var points = midpointDisplace(yL, yR, roughness, iterations);

  // Map to x positions across the canvas (with some overshoot)
  var result = [];
  var overX = sz * 0.05;
  for (var i = 0; i < points.length; i++) {
    var x = map(i, 0, points.length - 1, -overX, sz + overX);
    result.push({ x: x, y: points[i] });
  }

  return result;
}

function generateRidgelines() {
  ridgelines = [];

  for (var i = 0; i < layerCount; i++) {
    // Back layers are higher (smaller y), front layers are lower (larger y)
    var t = i / (layerCount - 1); // 0 = back, 1 = front
    var baseY = map(t, 0, 1, sz * 0.2, sz * (hasWater ? 0.58 : 0.72));

    // Front layers are rougher and taller
    var roughness = sz * (0.08 + t * 0.18);
    var heightRange = sz * (0.05 + t * 0.12);

    // Add some major peaks
    var pts = generateRidgeline(baseY, roughness, heightRange);

    // Add 1-3 major peaks
    var peakCount = floor(rand() * 3) + 1;
    for (var p = 0; p < peakCount; p++) {
      var peakIdx = floor(rand() * pts.length * 0.6 + pts.length * 0.2);
      var peakH = sz * (0.05 + t * 0.08) * (rand() * 0.5 + 0.75);
      var peakW = floor(pts.length * (rand() * 0.15 + 0.1));

      for (var j = -peakW; j <= peakW; j++) {
        var idx = peakIdx + j;
        if (idx >= 0 && idx < pts.length) {
          var influence = 1 - abs(j) / peakW;
          influence = influence * influence; // smooth falloff
          pts[idx].y -= peakH * influence;
        }
      }
    }

    ridgelines.push({ points: pts, layerIdx: i });
  }
}

// ── Draw ────────────────────────────────────────────────────────────────────

function draw() {
  // Sky gradient
  drawSky();

  // Moon (behind mountains)
  if (hasMoon) {
    drawMoon();
  }

  // Distant fog/haze (soft gradient, no hard edges)
  noStroke();
  var hazeY = sz * 0.15;
  var hazeH = sz * 0.5;
  for (var y = 0; y < hazeH; y++) {
    var a = 30 * sin((y / hazeH) * PI);
    fill(pal.fog[0], pal.fog[1], pal.fog[2], a);
    rect(0, hazeY + y, sz, 2);
  }

  // Draw mountain layers (back to front)
  for (var i = 0; i < ridgelines.length; i++) {
    drawMountainLayer(ridgelines[i], i);
  }

  // Water reflection
  if (hasWater) {
    drawWater();
  }

  // Atmospheric haze overlay (subtle)
  drawAtmosphere();
}

function drawSky() {
  var c1 = color(pal.sky[0]);
  var c2 = color(pal.sky[1]);
  noStroke();
  var skyH = sz * (hasWater ? 0.6 : 0.75);
  for (var y = 0; y < skyH; y++) {
    var t = y / skyH;
    var c = lerpColor(c1, c2, t);
    stroke(c);
    line(0, y, sz, y);
  }
  // Fill rest with bottom sky color
  noStroke();
  fill(c2);
  rect(0, skyH, sz, sz - skyH);
}

function drawMoon() {
  noStroke();
  // Glow (smaller radius to avoid bleeding into mountains)
  for (var r = moonR * 2.5; r > moonR; r -= moonR * 0.15) {
    var a = map(r, moonR, moonR * 2.5, 25, 0);
    var mc = color(pal.moon);
    fill(red(mc), green(mc), blue(mc), a);
    ellipse(moonX, moonY, r * 2, r * 2);
  }
  // Moon body
  fill(pal.moon);
  ellipse(moonX, moonY, moonR * 2, moonR * 2);
}

function drawMountainLayer(layer, idx) {
  var pts = layer.points;
  var t = idx / (layerCount - 1); // 0=back, 1=front
  var layerDef = pal.layers[min(idx, pal.layers.length - 1)];

  // Fog alpha: back layers more transparent
  var fogAlpha = map(t, 0, 1, 120, 0);

  // Mountain fill (solid shape from ridgeline to bottom)
  noStroke();
  fill(layerDef.fill[0], layerDef.fill[1], layerDef.fill[2]);

  beginShape();
  // Start from bottom-left
  vertex(-sz * 0.05, sz);
  // Ridgeline
  for (var i = 0; i < pts.length; i++) {
    vertex(pts[i].x, pts[i].y);
  }
  // End at bottom-right
  vertex(sz * 1.05, sz);
  endShape(CLOSE);

  // Ridge detail: darker stroke along the top edge with texture
  stroke(layerDef.stroke[0], layerDef.stroke[1], layerDef.stroke[2], 180);
  strokeWeight(max(1, sz * 0.001 * (1 + t)));
  noFill();
  beginShape();
  for (var i = 0; i < pts.length; i++) {
    vertex(pts[i].x, pts[i].y);
  }
  endShape();

  // Vertical texture lines (ink wash style)
  var texDensity = floor(sz * 0.15 * (0.3 + t * 0.7));
  for (var j = 0; j < texDensity; j++) {
    var xi = floor(rand() * pts.length);
    var px = pts[xi].x;
    var py = pts[xi].y;
    var lineH = sz * (rand() * 0.06 + 0.01) * (1 + t * 0.5);

    var ta = map(t, 0, 1, 15, 50);
    stroke(layerDef.stroke[0], layerDef.stroke[1], layerDef.stroke[2], ta);
    strokeWeight(rand() * 1.5 + 0.3);

    var drift = (rand() - 0.5) * sz * 0.005;
    line(px, py, px + drift, py + lineH);
  }

  // Soft fog between layers (gradient, no hard edges)
  if (fogAlpha > 5) {
    noStroke();
    var fogBaseY = 0;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].y > fogBaseY) fogBaseY = pts[i].y;
    }
    var fogH = sz * 0.1;
    for (var fy = 0; fy < fogH; fy++) {
      var fa = fogAlpha * sin((fy / fogH) * PI) * 0.7;
      fill(pal.fog[0], pal.fog[1], pal.fog[2], fa);
      rect(-sz * 0.05, fogBaseY - fogH * 0.5 + fy, sz * 1.1, 1.5);
    }
  }
}

function drawWater() {
  var waterY = sz * 0.62;
  var waterH = sz - waterY;

  // Water base
  noStroke();
  fill(pal.water[0], pal.water[1], pal.water[2], 80);
  rect(0, waterY, sz, waterH);

  // Reflected mountains (flipped, faded)
  push();
  translate(0, waterY * 2);
  scale(1, -1);

  for (var i = ridgelines.length - 1; i >= 0; i--) {
    var pts = ridgelines[i].points;
    var layerDef = pal.layers[min(i, pal.layers.length - 1)];
    var t = i / (layerCount - 1);

    noStroke();
    fill(layerDef.fill[0], layerDef.fill[1], layerDef.fill[2], 35 + t * 25);
    beginShape();
    vertex(-sz * 0.05, sz);
    for (var j = 0; j < pts.length; j++) {
      // Add slight wave distortion
      var waveOff = sin(pts[j].x * 0.02 + i) * sz * 0.005;
      vertex(pts[j].x, pts[j].y + waveOff);
    }
    vertex(sz * 1.05, sz);
    endShape(CLOSE);
  }

  pop();

  // Moon reflection (drawn OUTSIDE the flip transform, directly on water surface)
  if (hasMoon) {
    noStroke();
    var refBaseY = waterY + (waterY - moonY); // mirror position
    var refAlpha = 40;
    for (var w = 0; w < 5; w++) {
      var ry = refBaseY + w * sz * 0.01;
      var rw = moonR * (1.5 + w * 0.3);
      fill(red(color(pal.moon)), green(color(pal.moon)), blue(color(pal.moon)), refAlpha - w * 6);
      ellipse(moonX + sin(w * 1.5) * sz * 0.005, ry, rw * 2, moonR * 0.5);
    }
  }

  // Water surface ripples
  stroke(255, 255, 255, 15);
  strokeWeight(0.5);
  for (var r = 0; r < 30; r++) {
    var ry = waterY + rand() * waterH;
    var rx = rand() * sz;
    var rw = rand() * sz * 0.08 + sz * 0.02;
    line(rx, ry, rx + rw, ry);
  }

  // Soft gradient fade at water edge (no hard line)
  noStroke();
  var fadeH = sz * 0.06;
  for (var y = 0; y < fadeH; y++) {
    var a = map(y, 0, fadeH, 40, 0);
    fill(pal.fog[0], pal.fog[1], pal.fog[2], a);
    rect(0, waterY - fadeH * 0.3 + y, sz, 1.5);
  }
}

function drawAtmosphere() {
  // Subtle noise grain
  loadPixels();
  var d = pixelDensity();
  var total = 4 * (width * d) * (height * d);
  for (var i = 0; i < total; i += 4) {
    var n = (rand() - 0.5) * 12;
    pixels[i]     = constrain(pixels[i] + n, 0, 255);
    pixels[i + 1] = constrain(pixels[i + 1] + n, 0, 255);
    pixels[i + 2] = constrain(pixels[i + 2] + n, 0, 255);
  }
  updatePixels();
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  sz = min(windowWidth, windowHeight);
  resizeCanvas(sz, sz);
  generate();
  redraw();
}

function keyPressed() {
  if (key === ' ') { generate(); redraw(); }
  if (key === 's' || key === 'S') saveCanvas('fractal-mountain-' + Date.now(), 'png');
}
