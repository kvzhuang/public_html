// ============================================
// Loading Gen — 生成藝術風格 Loader 矩陣
// 12 types: Moiré, Perlin Flow, Lissajous,
// Lorenz, Particles, Voronoi, Pendulum,
// Recursive Squares, Amoeba, Grid Distortion,
// Fermat Spiral, Polygon Morphing
// ============================================

const rand = fxrand;

const LOADER_TYPES = [
  'moire','perlinFlow','lissajous','lorenz',
  'particles','voronoi','pendulum','recursive',
  'amoeba','gridDistort','fermat','polyMorph',
];

const COLORS_DARK = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD',
  '#FF9FF3','#54A0FF','#5F27CD','#01A3A4','#F368E0','#FF6348',
  '#7BED9F','#70A1FF','#FFA502','#2ED573','#1E90FF','#FF4757',
];
const COLORS_LIGHT = [
  '#E53935','#D81B60','#8E24AA','#5E35B1','#3949AB','#1E88E5',
  '#00897B','#2E7D32','#EF6C00','#D84315','#4E342E','#37474F',
];

const BG_COLORS = [
  '#0a0a1a','#0d1117','#1a1a2e','#16213e','#0f0f23',
  '#F5F5F5','#FAFAFA','#E8E8E8',
];

let bgColor, isLight, cols, rows, cellSz, canvasSz, loaders = [];

function setup() {
  canvasSz = min(windowWidth, windowHeight);
  createCanvas(canvasSz, canvasSz);
  initLoaders();
}

function initLoaders() {
  bgColor = BG_COLORS[floor(rand() * BG_COLORS.length)];
  const r = parseInt(bgColor.slice(1,3),16), g = parseInt(bgColor.slice(3,5),16), b = parseInt(bgColor.slice(5,7),16);
  isLight = (r*0.299+g*0.587+b*0.114) > 150;

  cols = floor(rand() * 4) + 3;
  rows = floor(rand() * 4) + 3;
  cellSz = canvasSz / max(cols, rows);

  const pal = isLight ? COLORS_LIGHT : COLORS_DARK;
  loaders = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const c1 = pal[floor(rand()*pal.length)];
      let c2 = pal[floor(rand()*pal.length)];
      while (c2 === c1) c2 = pal[floor(rand()*pal.length)];
      loaders.push({
        col, row,
        type: LOADER_TYPES[floor(rand()*LOADER_TYPES.length)],
        c1, c2,
        speed: rand()*1.2+0.5,
        phase: rand()*TWO_PI,
        param1: rand()*3+1,
        param2: rand()*3+1,
        param3: floor(rand()*4)+3,
      });
    }
  }
  window.$fxhashFeatures = { "Grid": cols+"x"+rows, "Background": isLight?"Light":"Dark" };
}

function draw() {
  background(bgColor);
  const mx = (canvasSz - cols*cellSz)/2;
  const my = (canvasSz - rows*cellSz)/2;

  for (const L of loaders) {
    const cx = mx + L.col*cellSz + cellSz/2;
    const cy = my + L.row*cellSz + cellSz/2;
    const sz = cellSz * 0.42;
    push();
    translate(cx, cy);
    drawLoader(L, sz);
    pop();
  }
}

function drawLoader(L, sz) {
  const t = millis()*0.001*L.speed + L.phase;
  const c1 = color(L.c1), c2 = color(L.c2);

  switch (L.type) {
    case 'moire':       drawMoire(t, sz, L, c1, c2); break;
    case 'perlinFlow':  drawPerlinFlow(t, sz, L, c1, c2); break;
    case 'lissajous':   drawLissajous(t, sz, L, c1, c2); break;
    case 'lorenz':      drawLorenz(t, sz, L, c1, c2); break;
    case 'particles':   drawParticles(t, sz, L, c1, c2); break;
    case 'voronoi':     drawVoronoi(t, sz, L, c1, c2); break;
    case 'pendulum':    drawPendulum(t, sz, L, c1, c2); break;
    case 'recursive':   drawRecursive(t, sz, L, c1, c2); break;
    case 'amoeba':      drawAmoeba(t, sz, L, c1, c2); break;
    case 'gridDistort': drawGridDistort(t, sz, L, c1, c2); break;
    case 'fermat':      drawFermat(t, sz, L, c1, c2); break;
    case 'polyMorph':   drawPolyMorph(t, sz, L, c1, c2); break;
  }
}

// ── 1. Dynamic Moiré ────────────────────────────────────────────────────────

function drawMoire(t, sz, L, c1, c2) {
  noFill();
  strokeWeight(max(sz*0.015, 0.5));
  const n = 12;
  // Grid 1: circles with breathing radius
  stroke(red(c1),green(c1),blue(c1),120);
  for (let i = 0; i < n; i++) {
    const breathe = 1 + 0.08 * sin(t * 2 + i * 0.5);
    const r = sz * (i+1)/n * breathe;
    push(); rotate(t*0.5);
    ellipse(0, 0, r*2, r*2);
    pop();
  }
  // Grid 2: offset + wave distortion
  stroke(red(c2),green(c2),blue(c2),120);
  for (let i = 0; i < n; i++) {
    const wave = 1 + 0.1 * sin(t * 2.3 - i * 0.4);
    const r = sz * (i+1)/n * wave;
    const ox = sin(t * 1.5 + i) * sz * 0.03;
    const oy = cos(t * 1.2 + i) * sz * 0.03;
    push(); rotate(-t*0.53);
    ellipse(ox, oy, r*2, r*1.9);
    pop();
  }
}

// ── 2. Perlin Noise Flow ────────────────────────────────────────────────────

function drawPerlinFlow(t, sz, L, c1, c2) {
  noFill();
  strokeWeight(max(sz*0.02, 0.5));
  const lines = 8;
  for (let l = 0; l < lines; l++) {
    const c = lerpColor(c1, c2, l/lines);
    c.setAlpha(180);
    stroke(c);
    beginShape();
    for (let i = 0; i <= 30; i++) {
      const px = map(i, 0, 30, -sz, sz);
      const n = noise(i*0.15 + l*10, t*0.8 + L.phase);
      const py = map(n, 0, 1, -sz*0.6, sz*0.6) + (l-lines/2)*sz*0.08;
      curveVertex(px, py);
    }
    endShape();
  }
}

// ── 3. Lissajous Curves ─────────────────────────────────────────────────────

function drawLissajous(t, sz, L, c1, c2) {
  noFill();
  const a = L.param1;
  const b = L.param2;
  const delta = t * 0.5;
  const pts = 200;

  // Outer curve with wave thickness
  stroke(c1);
  beginShape();
  for (let i = 0; i <= pts; i++) {
    const angle = TWO_PI * i / pts;
    const wave = 1 + 0.15 * sin(t * 3 + angle * 5);
    const x = sz * 0.85 * wave * sin(a * angle + delta);
    const y = sz * 0.85 * wave * sin(b * angle + sin(t*0.7)*0.5);
    strokeWeight(max(sz*(0.01 + 0.015*sin(t*2+i*0.1)), 0.5));
    vertex(x, y);
  }
  endShape();

  // Inner curve: pulsating size
  const pulse = 0.55 + 0.2 * sin(t * 1.8);
  const c2a = lerpColor(c1, c2, 0.5);
  c2a.setAlpha(150);
  stroke(c2a);
  strokeWeight(max(sz*0.018, 0.6));
  beginShape();
  for (let i = 0; i <= pts; i++) {
    const angle = TWO_PI * i / pts;
    const x = sz * pulse * sin(a * angle + delta + sin(t)*0.8);
    const y = sz * pulse * sin(b * angle + cos(t*0.5)*0.6);
    vertex(x, y);
  }
  endShape();
}

// ── 4. Lorenz Attractor ─────────────────────────────────────────────────────

function drawLorenz(t, sz, L, c1, c2) {
  // Pre-compute Lorenz path
  let x = 0.1, y = 0, z = 0;
  const sigma = 10, rho = 28, beta = 8/3;
  const dt = 0.005;
  const steps = 600;
  const scale = sz * 0.028;

  noFill();
  strokeWeight(max(sz*0.012, 0.5));

  beginShape();
  for (let i = 0; i < steps; i++) {
    const dx = sigma*(y-x)*dt;
    const dy = (x*(rho-z)-y)*dt;
    const dz = (x*y-beta*z)*dt;
    x+=dx; y+=dy; z+=dz;
    const progress = i/steps;
    const c = lerpColor(c1, c2, progress);
    c.setAlpha(50 + progress*200);
    stroke(c);
    // Rotate the attractor over time
    const px = (x*cos(t*0.3) - y*sin(t*0.3)) * scale;
    const py = (z - 25) * scale;
    vertex(px, py);
  }
  endShape();
}

// ── 5. Particle Trails ──────────────────────────────────────────────────────

function drawParticles(t, sz, L, c1, c2) {
  noStroke();
  const n = 40;
  for (let i = 0; i < n; i++) {
    const baseA = L.phase + TWO_PI*i/n;
    const speed = 0.8 + (i%5)*0.15;
    const angle = baseA + t * speed;
    // Orbit radius pulses per particle
    const orbitPulse = 1 + 0.2 * sin(t * 1.5 + i * 0.7);
    const orbitR = sz * (0.2 + (i%7)*0.1) * orbitPulse;
    // Orbit shape wobbles between circle and ellipse
    const eccentric = 0.6 + 0.3 * sin(t * 0.8 + i * 0.3);
    const x = cos(angle) * orbitR;
    const y = sin(angle) * orbitR * eccentric;
    const dotSz = sz * (0.03 + 0.03*sin(t*3+i*0.8));
    const c = lerpColor(c1, c2, (i%10)/10);
    const a = 80 + 170 * (0.5+0.5*sin(t*1.5+i*0.5));
    c.setAlpha(a);
    fill(c);
    ellipse(x, y, dotSz*2, dotSz*2);
  }
}

// ── 6. Voronoi Tessellation ─────────────────────────────────────────────────

function drawVoronoi(t, sz, L, c1, c2) {
  // Moving seed points
  const n = 6;
  const seeds = [];
  for (let i = 0; i < n; i++) {
    const a = TWO_PI*i/n + t*(0.3+i*0.05);
    const r = sz*(0.25+0.2*sin(t*0.7+i*2));
    seeds.push({ x: cos(a)*r, y: sin(a)*r });
  }

  // Draw edges by checking closest seed transitions
  strokeWeight(max(sz*0.015, 0.5));
  const step = sz * 0.04;
  for (let px = -sz; px <= sz; px += step) {
    for (let py = -sz; py <= sz; py += step) {
      // Find two closest seeds
      let d1 = Infinity, d2 = Infinity, i1 = 0;
      for (let i = 0; i < n; i++) {
        const d = dist(px, py, seeds[i].x, seeds[i].y);
        if (d < d1) { d2=d1; d1=d; i1=i; }
        else if (d < d2) { d2=d; }
      }
      // Near edge: small difference between closest two
      const edgeness = 1 - min((d2-d1)/(step*3), 1);
      if (edgeness > 0.3) {
        const c = lerpColor(c1, c2, i1/n);
        c.setAlpha(edgeness * 200);
        stroke(c);
        point(px, py);
      }
    }
  }

  // Seed dots
  noStroke();
  for (let i = 0; i < n; i++) {
    fill(lerpColor(c1, c2, i/n));
    ellipse(seeds[i].x, seeds[i].y, sz*0.06, sz*0.06);
  }
}

// ── 7. Double Pendulum ──────────────────────────────────────────────────────

function drawPendulum(t, sz, L, c1, c2) {
  const l1 = sz*0.35, l2 = sz*0.35;
  const a1 = PI*0.8*sin(t*1.3 + L.phase);
  const a2 = PI*0.6*sin(t*2.1 + L.phase*1.7);

  const x1 = l1*sin(a1);
  const y1 = l1*cos(a1);
  const x2 = x1 + l2*sin(a2);
  const y2 = y1 + l2*cos(a2);

  // Trail
  noFill();
  strokeWeight(max(sz*0.015, 0.5));
  const trail = 60;
  beginShape();
  for (let i = 0; i < trail; i++) {
    const tt = t - i*0.02;
    const ta1 = PI*0.8*sin(tt*1.3 + L.phase);
    const ta2 = PI*0.6*sin(tt*2.1 + L.phase*1.7);
    const tx = l1*sin(ta1) + l2*sin(ta2);
    const ty = l1*cos(ta1) + l2*cos(ta2);
    const c = lerpColor(c1, c2, i/trail);
    c.setAlpha(255 - i*4);
    stroke(c);
    vertex(tx, ty);
  }
  endShape();

  // Arms
  stroke(c1);
  strokeWeight(max(sz*0.025, 1));
  line(0, 0, x1, y1);
  stroke(c2);
  line(x1, y1, x2, y2);

  // Joints
  noStroke();
  fill(c1);
  ellipse(0, 0, sz*0.05, sz*0.05);
  ellipse(x1, y1, sz*0.04, sz*0.04);
  fill(c2);
  ellipse(x2, y2, sz*0.06, sz*0.06);
}

// ── 8. Recursive Squares ────────────────────────────────────────────────────

function drawRecursive(t, sz, L, c1, c2) {
  noFill();
  const depth = 8;
  rectMode(CENTER);

  for (let i = 0; i < depth; i++) {
    // Breathing size per layer
    const breathe = 1 + 0.1 * sin(t * 2.5 + i * 0.8);
    const s = sz * 1.8 * pow(0.78, i) * breathe;
    const rot = t * (0.5 + i*0.15) * (i%2===0 ? 1 : -1);
    // Pulsating corner radius
    const cornerR = s * (0.05 + 0.1 * (0.5 + 0.5*sin(t*1.5 + i)));
    // Wave stroke weight
    const sw = max(sz*(0.015 + 0.01*sin(t*3+i*0.6)), 0.5);
    const c = lerpColor(c1, c2, (i + sin(t+i)*0.5)/depth);
    c.setAlpha(200 - i*15);
    stroke(c);
    strokeWeight(sw);
    push();
    rotate(rot);
    rect(0, 0, s, s, cornerR);
    pop();
  }
  rectMode(CORNER);
}

// ── 9. Amoeba Blob ──────────────────────────────────────────────────────────

function drawAmoeba(t, sz, L, c1, c2) {
  const pts = 80;
  const baseR = sz * 0.6;

  // Outer blob
  noStroke();
  const fc1 = color(red(c1),green(c1),blue(c1),60);
  fill(fc1);
  beginShape();
  for (let i = 0; i <= pts; i++) {
    const a = TWO_PI * i / pts;
    const n = noise(cos(a)*2+10, sin(a)*2+10, t*0.5);
    const r = baseR * (0.5 + n*0.6);
    vertex(cos(a)*r, sin(a)*r);
  }
  endShape(CLOSE);

  // Inner blob
  fill(c1);
  beginShape();
  for (let i = 0; i <= pts; i++) {
    const a = TWO_PI * i / pts;
    const n = noise(cos(a)*2, sin(a)*2, t*0.5+100);
    const r = baseR * (0.2 + n*0.3);
    vertex(cos(a)*r, sin(a)*r);
  }
  endShape(CLOSE);

  // Edge stroke
  noFill();
  stroke(c2);
  strokeWeight(max(sz*0.02, 0.8));
  beginShape();
  for (let i = 0; i <= pts; i++) {
    const a = TWO_PI * i / pts;
    const n = noise(cos(a)*2+10, sin(a)*2+10, t*0.5);
    const r = baseR * (0.5 + n*0.6);
    vertex(cos(a)*r, sin(a)*r);
  }
  endShape(CLOSE);
}

// ── 10. Grid Distortion ─────────────────────────────────────────────────────

function drawGridDistort(t, sz, L, c1, c2) {
  noFill();
  strokeWeight(max(sz*0.012, 0.5));
  const n = 7;
  const spacing = sz*1.8 / n;

  // Gravity point moves in circle
  const gx = cos(t*1.2) * sz*0.3;
  const gy = sin(t*1.2) * sz*0.3;
  const strength = sz * 0.4;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let px = (c - n/2 + 0.5) * spacing;
      let py = (r - n/2 + 0.5) * spacing;

      // Distort toward gravity point
      const d = dist(px, py, gx, gy);
      const force = strength / (d + sz*0.3);
      px += (gx - px) * force * 0.3;
      py += (gy - py) * force * 0.3;

      const dotSz = sz*0.04 + force*sz*0.06;
      const cl = lerpColor(c1, c2, force*2);
      fill(cl);
      noStroke();
      ellipse(px, py, dotSz, dotSz);
    }
  }
}

// ── 11. Fermat Spiral ───────────────────────────────────────────────────────

function drawFermat(t, sz, L, c1, c2) {
  noStroke();
  const golden = (1 + sqrt(5)) / 2;
  const n = 80;

  for (let i = 0; i < n; i++) {
    const angle = i * golden * TWO_PI + t * 0.3;
    const r = sz * 0.1 * sqrt(i);
    const x = cos(angle) * r;
    const y = sin(angle) * r;

    const appearing = (t * 8 + L.phase * 10) % (n * 1.5);
    const visible = i < appearing;
    if (!visible) continue;

    const dotSz = sz * (0.03 + 0.02 * sin(t*2 + i*0.3));
    const c = lerpColor(c1, c2, (i%15)/15);
    const a = 100 + 155 * (0.5 + 0.5*sin(t + i*0.2));
    c.setAlpha(a);
    fill(c);
    ellipse(x, y, dotSz*2, dotSz*2);
  }
}

// ── 12. Polygon Morphing ────────────────────────────────────────────────────

function drawPolyMorph(t, sz, L, c1, c2) {
  noFill();
  strokeJoin(ROUND);

  const sides1 = L.param3;
  const sides2 = L.param3 + 2;
  const currentSides = lerp(sides1, sides2, 0.5+0.5*sin(t*1.5));

  // Draw 3 nested morphing polygons with wave effects
  for (let layer = 0; layer < 3; layer++) {
    // Breathing radius
    const breathe = 1 + 0.12 * sin(t * 2 + layer * 1.5);
    const baseR = sz * (0.85 - layer*0.22) * breathe;
    const rot = t * (0.6 + layer*0.2) * (layer%2===0 ? 1 : -1);
    const c = lerpColor(c1, c2, (layer + 0.5*sin(t+layer))/3);
    c.setAlpha(220 - layer*40);
    stroke(c);
    // Pulsating stroke
    strokeWeight(max(sz*(0.02 + 0.01*sin(t*3+layer*2)), 0.8));

    beginShape();
    const pts = 60;
    for (let i = 0; i <= pts; i++) {
      const a = TWO_PI * i / pts + rot;
      const floorS = floor(currentSides);
      const frac = currentSides - floorS;
      const r1 = polyRadius(a, floorS) * baseR;
      const r2 = polyRadius(a, floorS + 1) * baseR;
      // Add ripple to radius
      const ripple = 1 + 0.06 * sin(a * 8 + t * 4 - layer * 2);
      const radius = lerp(r1, r2, frac) * ripple;
      vertex(cos(a)*radius, sin(a)*radius);
    }
    endShape(CLOSE);
  }
}

function polyRadius(angle, sides) {
  const a = TWO_PI / sides;
  const halfA = a / 2;
  const mod = ((angle % a) + a) % a;
  return cos(halfA) / cos(halfA - abs(mod - halfA));
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  canvasSz = min(windowWidth, windowHeight);
  resizeCanvas(canvasSz, canvasSz);
  cellSz = canvasSz / max(cols, rows);
}

function keyPressed() {
  if (key === ' ') initLoaders();
  if (key === 's' || key === 'S') saveCanvas('loading-gen-'+Date.now(), 'png');
}
