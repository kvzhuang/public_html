// ============================================
// Domino — 多米諾骨牌生成藝術 (俯瞰視角)
// Top-down view with thousands of colorful
// dominoes in spiral/filled patterns
// ============================================

var rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────

var PALETTES = [
  // 原有 8 組
  { name:"Rainbow",  bg:"#E8DCC8", colors:["#E63946","#F4A261","#E9C46A","#2A9D8F","#264653","#457B9D","#F77F00","#D62828","#06D6A0","#118AB2"] },
  { name:"Ocean",    bg:"#D8E8F0", colors:["#03045E","#023E8A","#0077B6","#0096C7","#00B4D8","#48CAE4","#90E0EF","#ADE8F4","#CAF0F8","#FFFFFF"] },
  { name:"Sunset",   bg:"#F0E0D0", colors:["#F94144","#F3722C","#F8961E","#F9C74F","#90BE6D","#43AA8B","#577590","#F9844A","#FF006E"] },
  { name:"Forest",   bg:"#D8E8D4", colors:["#1B4332","#2D6A4F","#40916C","#52B788","#74C69D","#95D5B2","#B7E4C7","#D8F3DC","#183618"] },
  { name:"Berry",    bg:"#E8D8E8", colors:["#7B2D8E","#9B3D9E","#BB4DAE","#DB5DBE","#8B1E3F","#D4447E","#FF6B9D","#C44569","#6C3483"] },
  { name:"Fire",     bg:"#F0DCC8", colors:["#FF0000","#FF4500","#FF6347","#FF7F50","#FFA500","#FFD700","#FF8C00","#DC143C","#B22222"] },
  { name:"Candy",    bg:"#F5F0E8", colors:["#FF69B4","#FF85A2","#FFA07A","#FFB6C1","#FF6B6B","#E75480","#FF5F7E","#FFD700","#87CEEB"] },
  { name:"Earth",    bg:"#E0D8C8", colors:["#6B4423","#8B5A2B","#CD853F","#DEB887","#D2691E","#A0522D","#F4A460","#8B7355","#BC8F8F"] },
  // 新增 10 組
  { name:"Neon",     bg:"#0A0A18", colors:["#FF006E","#FB5607","#FFBE0B","#3A86FF","#8338EC","#06D6A0","#FF70A6","#E0AAFF","#05D9E8","#01FFC3"] },
  { name:"Pastel",   bg:"#F8F4F0", colors:["#FEC8C1","#A8E6CF","#FFD3B6","#DCEDC1","#FF8B94","#C7CEEA","#F3B4C4","#B5EAD7","#E2F0CB","#FFDAC1"] },
  { name:"Sakura",   bg:"#F5EAE8", colors:["#FFB7C5","#FF69B4","#FFC0CB","#DB7093","#FF1493","#E8A0BF","#F8E8EE","#C71585","#FFD4E8","#FFFFFF"] },
  { name:"Arctic",   bg:"#E4ECF0", colors:["#A5F3FC","#67E8F9","#22D3EE","#06B6D4","#0891B2","#0E7490","#155E75","#CFFAFE","#ECFEFF","#FFFFFF"] },
  { name:"Lava",     bg:"#1A0A0A", colors:["#FF0000","#FF4500","#FF6600","#FF8C00","#FFA500","#FFD700","#FFFF00","#CC0000","#990000","#660000"] },
  { name:"Emerald",  bg:"#E0F0E4", colors:["#064E3B","#065F46","#047857","#059669","#10B981","#34D399","#6EE7B7","#A7F3D0","#D1FAE5","#022C22"] },
  { name:"Coral",    bg:"#F0E8E4", colors:["#FF6B6B","#FFA07A","#FF7F50","#FF6347","#E9967A","#FA8072","#F08080","#CD5C5C","#FFE4E1","#FFDAB9"] },
  { name:"Galaxy",   bg:"#080818", colors:["#667EEA","#764BA2","#F093FB","#F5576C","#4FACFE","#00F2FE","#43E97B","#FA709A","#FEE140","#A18CD1"] },
  { name:"Vintage",  bg:"#E8E0D0", colors:["#E07A5F","#3D405B","#81B29A","#F2CC8F","#5F797B","#9A8C98","#C9ADA7","#4A4E69","#22223B","#F4F1DE"] },
  { name:"Tropical", bg:"#E8F0D8", colors:["#FF6B6B","#FFA07A","#FFD93D","#6BCB77","#4D96FF","#FF8FB1","#845EC2","#00C9A7","#FFC75F","#FF9671"] },
];

var pal, sz;
var dominoes = [];
var animTimer = null;
var fallWave = -1; // index of the current falling front
var pattern; // 'doubleSpiral', 'spiral', 'concentricFill', 'radialBurst'

var PATTERNS = ['doubleSpiral','spiral','concentricFill','radialBurst','flower','diamond','zigzagFill','vortex','mosaic'];

function setup() {
  sz = min(windowWidth, windowHeight);
  createCanvas(sz, sz);
  noLoop();
  generate();
}

function generate() {
  pal = PALETTES[Math.floor(rand() * PALETTES.length)];
  pattern = PATTERNS[Math.floor(rand() * PATTERNS.length)];
  dominoes = [];
  fallWave = -1;

  var cx = sz / 2, cy = sz / 2;
  var maxR = sz * 0.46;

  switch (pattern) {
    case 'doubleSpiral': genDoubleSpiral(cx, cy, maxR); break;
    case 'spiral':       genFilledSpiral(cx, cy, maxR); break;
    case 'concentricFill': genConcentricFill(cx, cy, maxR); break;
    case 'radialBurst': genRadialBurst(cx, cy, maxR); break;
    case 'flower':      genFlower(cx, cy, maxR); break;
    case 'diamond':     genDiamond(cx, cy, maxR); break;
    case 'zigzagFill':  genZigzagFill(cx, cy, maxR); break;
    case 'vortex':      genVortex(cx, cy, maxR); break;
    case 'mosaic':      genMosaic(cx, cy, maxR); break;
  }

  // Sort by distance from center (for wave animation)
  var center = { x: cx, y: cy };
  for (var i = 0; i < dominoes.length; i++) {
    var dx = dominoes[i].x - center.x;
    var dy = dominoes[i].y - center.y;
    dominoes[i].distFromCenter = Math.sqrt(dx * dx + dy * dy);
  }
  dominoes.sort(function(a, b) { return a.distFromCenter - b.distFromCenter; });

  // Assign wave index based on distance bands
  var maxDist = 0;
  for (var i = 0; i < dominoes.length; i++) {
    if (dominoes[i].distFromCenter > maxDist) maxDist = dominoes[i].distFromCenter;
  }
  for (var i = 0; i < dominoes.length; i++) {
    var d = dominoes[i];
    d.waveBand = Math.floor(d.distFromCenter / maxDist * 80);
    d.fallAngle = 0;
    d.fallen = false;
  }

  window.$fxhashFeatures = { "Palette": pal.name, "Pattern": pattern, "Count": dominoes.length };

  redraw();
  if (animTimer) clearTimeout(animTimer);
  animTimer = setTimeout(function() {
    fallWave = 0;
    tick();
  }, 800);
}

// ── Pattern generators ──────────────────────────────────────────────────────

function addDomino(x, y, angle, colorIdx) {
  if (x < sz * 0.02 || x > sz * 0.98 || y < sz * 0.02 || y > sz * 0.98) return;
  dominoes.push({
    x: x, y: y,
    angle: angle,
    color: pal.colors[colorIdx % pal.colors.length],
    w: sz * 0.008,
    h: sz * 0.018,
  });
}

function genDoubleSpiral(cx, cy, maxR) {
  // Two interleaved spirals with fill between paths
  for (var arm = 0; arm < 2; arm++) {
    var startAngle = arm * PI;
    var turns = rand() * 1.5 + 2.5;
    var count = Math.floor(rand() * 200) + 400;

    for (var i = 0; i < count; i++) {
      var t = i / count;
      var angle = startAngle + t * turns * TWO_PI;
      var r = sz * 0.03 + t * (maxR - sz * 0.03);

      // Main path domino
      addDomino(
        cx + cos(angle) * r,
        cy + sin(angle) * r,
        angle + HALF_PI,
        Math.floor(t * pal.colors.length * 2) + arm * 3
      );

      // Fill dominoes between spiral arms (offset inward)
      for (var f = 1; f <= 3; f++) {
        var fr = r - f * sz * 0.022;
        if (fr > sz * 0.02) {
          var fangle = angle + f * 0.02;
          addDomino(
            cx + cos(fangle) * fr,
            cy + sin(fangle) * fr,
            fangle + HALF_PI + (f % 2) * 0.3,
            Math.floor(t * pal.colors.length * 2) + f + arm * 2
          );
        }
      }
    }
  }
}

function genFilledSpiral(cx, cy, maxR) {
  var turns = rand() * 2 + 3;
  var armWidth = sz * 0.08;
  var spacing = sz * 0.014;

  for (var r = sz * 0.03; r < maxR; r += spacing) {
    var circumference = TWO_PI * r;
    var count = Math.floor(circumference / spacing);
    var baseAngle = (r / maxR) * turns * TWO_PI;

    for (var i = 0; i < count; i++) {
      var a = baseAngle + TWO_PI * i / count;
      var t = r / maxR;
      var colorShift = Math.floor((a / TWO_PI + t) * pal.colors.length * 1.5);

      addDomino(
        cx + cos(a) * r,
        cy + sin(a) * r,
        a + HALF_PI + sin(a * 3 + r * 0.1) * 0.2,
        colorShift
      );
    }
  }
}

function genConcentricFill(cx, cy, maxR) {
  var spacing = sz * 0.013;

  for (var r = spacing; r < maxR; r += spacing) {
    var count = Math.floor(TWO_PI * r / spacing);
    var ringIdx = Math.floor(r / spacing);

    for (var i = 0; i < count; i++) {
      var a = TWO_PI * i / count + ringIdx * 0.1;
      var t = r / maxR;
      // Alternate ring directions
      var dir = ringIdx % 2 === 0 ? 1 : -1;

      addDomino(
        cx + cos(a) * r,
        cy + sin(a) * r,
        a + HALF_PI * dir,
        Math.floor(t * pal.colors.length) + (i % 3)
      );
    }
  }
}

function genRadialBurst(cx, cy, maxR) {
  var rays = Math.floor(rand() * 8) + 12;
  var spacing = sz * 0.013;

  for (var ray = 0; ray < rays; ray++) {
    var baseAngle = TWO_PI * ray / rays;
    var spread = PI / rays * 0.8;

    for (var r = sz * 0.04; r < maxR; r += spacing) {
      var count = Math.floor(spread * r / spacing) + 1;
      for (var i = 0; i < count; i++) {
        var offset = (i - (count - 1) / 2) * spacing / r;
        var a = baseAngle + offset;
        var t = r / maxR;

        addDomino(
          cx + cos(a) * r,
          cy + sin(a) * r,
          a + HALF_PI,
          ray % pal.colors.length + Math.floor(t * 3)
        );
      }
    }
  }
}

function genFlower(cx, cy, maxR) {
  var petals = Math.floor(rand() * 4) + 5;
  var spacing = sz * 0.013;

  for (var r = sz * 0.03; r < maxR; r += spacing) {
    var count = Math.floor(TWO_PI * r / spacing);
    for (var i = 0; i < count; i++) {
      var a = TWO_PI * i / count;
      var t = r / maxR;
      // Flower shape: radius varies by angle
      var petalR = maxR * (0.5 + 0.5 * Math.pow(Math.abs(cos(a * petals / 2)), 0.6));
      if (r > petalR) continue;
      var colorIdx = Math.floor(a / TWO_PI * petals) % pal.colors.length + Math.floor(t * 2);
      addDomino(cx + cos(a) * r, cy + sin(a) * r, a + HALF_PI, colorIdx);
    }
  }
}

function genDiamond(cx, cy, maxR) {
  var spacing = sz * 0.013;
  var size = maxR * 0.85;

  for (var gx = -size; gx < size; gx += spacing) {
    for (var gy = -size; gy < size; gy += spacing) {
      // Diamond shape: |x| + |y| < size
      if (Math.abs(gx) + Math.abs(gy) > size) continue;
      var t = (Math.abs(gx) + Math.abs(gy)) / size;
      var angle = atan2(gy, gx);
      var colorIdx = Math.floor(t * pal.colors.length) + Math.floor((angle + PI) / TWO_PI * 3);
      // Alternate angles for texture
      var domAngle = ((Math.floor(gx / spacing) + Math.floor(gy / spacing)) % 2 === 0) ? 0 : HALF_PI;
      addDomino(cx + gx, cy + gy, domAngle, colorIdx);
    }
  }
}

function genZigzagFill(cx, cy, maxR) {
  var spacing = sz * 0.013;
  var amplitude = sz * 0.06;
  var freq = rand() * 3 + 4;

  for (var r = sz * 0.03; r < maxR; r += spacing) {
    var count = Math.floor(TWO_PI * r / spacing);
    for (var i = 0; i < count; i++) {
      var a = TWO_PI * i / count;
      var t = r / maxR;
      // Zigzag offset on radius
      var zigzag = sin(a * freq + r * 0.05) * amplitude * t;
      var actualR = r + zigzag;
      if (actualR > maxR || actualR < sz * 0.02) continue;
      var colorIdx = Math.floor((a * freq + r * 0.02) * 0.5) % pal.colors.length;
      addDomino(cx + cos(a) * actualR, cy + sin(a) * actualR, a + HALF_PI, colorIdx);
    }
  }
}

function genVortex(cx, cy, maxR) {
  var arms = Math.floor(rand() * 3) + 3;
  var spacing = sz * 0.013;
  var twist = rand() * 3 + 2;

  for (var r = sz * 0.03; r < maxR; r += spacing) {
    var count = Math.floor(TWO_PI * r / spacing);
    for (var i = 0; i < count; i++) {
      var a = TWO_PI * i / count;
      var t = r / maxR;
      // Vortex twist: angle offset increases with radius
      var twistedA = a + t * twist;
      // Only fill near arm centers
      var armPhase = (twistedA * arms / TWO_PI) % 1;
      if (armPhase > 0.6) continue;
      var colorIdx = Math.floor(twistedA / TWO_PI * arms) % pal.colors.length + Math.floor(t * 2);
      addDomino(cx + cos(a) * r, cy + sin(a) * r, a + t * twist * 0.5, colorIdx);
    }
  }
}

function genMosaic(cx, cy, maxR) {
  var spacing = sz * 0.013;
  var blockSz = sz * (rand() * 0.04 + 0.04);

  for (var gx = -maxR; gx < maxR; gx += spacing) {
    for (var gy = -maxR; gy < maxR; gy += spacing) {
      if (gx * gx + gy * gy > maxR * maxR) continue;
      // Block-based coloring
      var bx = Math.floor((gx + maxR) / blockSz);
      var by = Math.floor((gy + maxR) / blockSz);
      var blockColor = (bx * 7 + by * 13) % pal.colors.length;
      // Alternate domino direction per block
      var angle = ((bx + by) % 2 === 0) ? 0 : HALF_PI;
      angle += ((bx + by) % 4 < 2) ? 0 : PI * 0.25;
      addDomino(cx + gx, cy + gy, angle, blockColor);
    }
  }
}

// ── Animation ───────────────────────────────────────────────────────────────

function tick() {
  var anyActive = false;

  for (var i = 0; i < dominoes.length; i++) {
    var d = dominoes[i];
    if (d.fallen) continue;

    if (d.waveBand <= fallWave) {
      d.fallAngle += 0.12 + d.fallAngle * 0.05;
      if (d.fallAngle >= HALF_PI) {
        d.fallAngle = HALF_PI;
        d.fallen = true;
      } else {
        anyActive = true;
      }
    }
  }

  fallWave += 1;
  redraw();

  if (anyActive || fallWave < 85) {
    animTimer = setTimeout(tick, 30);
  } else {
    animTimer = null;
    setTimeout(generate, 2500);
  }
}

// ── Draw ────────────────────────────────────────────────────────────────────

function draw() {
  background(pal.bg);

  for (var i = 0; i < dominoes.length; i++) {
    var d = dominoes[i];
    drawDominoTopDown(d);
  }
}

function drawDominoTopDown(d) {
  push();
  translate(d.x, d.y);
  rotate(d.angle);

  var w = d.w;
  var h = d.h;
  var fall = d.fallAngle;

  // Top-down view:
  // Standing: tall narrow rectangle (w × h, h is the "height" = thin edge)
  // Falling: gets wider (shows the face), shorter (compressed perspective)
  // Fallen: wide flat rectangle (shows full face)

  var visW = w + (h - w) * sin(fall); // widens as falls
  var visH = h * cos(fall) * 0.4 + h * 0.6; // slightly shorter
  var bright = 1 - fall / HALF_PI * 0.25; // darken slightly when fallen

  // Shadow (grows as domino falls)
  if (fall > 0.1) {
    noStroke();
    fill(0, 0, 0, 15 + fall * 10);
    var shadowOff = fall * h * 0.3;
    ellipse(shadowOff * 0.5, shadowOff * 0.3, visW * 1.3, visH * 0.5);
  }

  // Domino body
  rectMode(CENTER);
  var c = color(d.color);
  var r = red(c) * bright, g = green(c) * bright, b = blue(c) * bright;
  fill(r, g, b);
  stroke(r * 0.5, g * 0.5, b * 0.5);
  strokeWeight(max(0.5, sz * 0.001));
  rect(0, 0, visW, visH, visW * 0.1);

  // Highlight edge (light reflection on top)
  if (fall < HALF_PI * 0.8) {
    noStroke();
    fill(255, 255, 255, 40 - fall * 20);
    rect(-visW * 0.1, 0, visW * 0.15, visH * 0.8, visW * 0.05);
  }

  rectMode(CORNER);
  pop();
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  sz = min(windowWidth, windowHeight);
  resizeCanvas(sz, sz);
}

function keyPressed() {
  if (key === ' ') { if (animTimer) clearTimeout(animTimer); generate(); }
  if (key === 's' || key === 'S') saveCanvas('domino-' + Date.now(), 'png');
}

function mousePressed() {
  if (animTimer) clearTimeout(animTimer);
  generate();
}
