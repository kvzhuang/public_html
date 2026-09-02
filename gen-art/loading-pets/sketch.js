// ============================================
// Loading Pets — 可愛動物 Loading 動畫矩陣
// Kawaii cat & dog spinners in a grid
// ============================================

const rand = fxrand;

const PET_TYPES = [
  'catFace',     // 貓臉眨眼
  'dogFace',     // 狗臉搖舌
  'sleepyCat',   // 打瞌睡貓
  'wagTail',     // 搖尾巴
  'catTail',     // 貓尾擺動
  'pawPrint',    // 肉球踩踏
  'yarnBall',    // 毛線球滾動
  'fishChase',   // 追魚
  'boneSpin',    // 骨頭旋轉
  'catStretch',  // 貓伸懶腰
  'puppyBounce', // 小狗跳躍
  'catCurl',     // 貓咪蜷縮呼吸
];

const BG_COLORS = [
  '#0a0a1a', '#0d1117', '#1a1a2e', '#16213e',
  '#0f0f23', '#1b1b2f', '#121212', '#0a192f',
  '#F5F5F5', '#FAFAFA', '#E8E8E8', '#F0EDE5',
];

const FUR_PALETTES = [
  ['#F5A623','#FFF5E0','#FF8A8A'],  // 橘貓
  ['#4A4A4A','#E8E8E8','#FFB3B3'],  // 灰貓
  ['#FFFFFF','#FFD4E8','#FFB3C1'],   // 白貓
  ['#2C1810','#E8C9A0','#FF9B9B'],   // 棕狗
  ['#1A1A1A','#F5F5F5','#FFAAAA'],   // 黑白貓
  ['#D4A373','#FFF3E0','#FFB7B7'],   // 奶茶色
  ['#8B5E3C','#FFE4C4','#FFA0A0'],   // 柴犬色
  ['#A0A0B0','#E8E8F0','#FFB8B8'],   // 藍灰貓
  ['#FF9F43','#FFECD2','#FF8A8A'],   // 金毛色
  ['#3D3D3D','#D4A373','#FFB3B3'],   // 三花貓
];

let bgColor, isLightBg, cols, rows, cellSize, canvasSize, pets = [];

function checkLightBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
}

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);
  initPets();
  window.$fxhashFeatures = { "Grid": cols+"x"+rows, "Background": bgColor };
}

function initPets() {
  bgColor = BG_COLORS[floor(rand() * BG_COLORS.length)];
  isLightBg = checkLightBg(bgColor);
  cols = floor(rand() * 4) + 3;
  rows = floor(rand() * 4) + 3;
  cellSize = canvasSize / max(cols, rows);

  // Filter fur colors that have enough contrast with background
  const bgBright = getBrightness(bgColor);
  const goodFurs = FUR_PALETTES.filter(fur => {
    const furBright = getBrightness(fur[0]);
    return abs(furBright - bgBright) > 60;
  });
  // Fallback: if too few, use all
  const usableFurs = goodFurs.length >= 4 ? goodFurs : FUR_PALETTES;

  pets = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fur = usableFurs[floor(rand() * usableFurs.length)];
      pets.push({
        col: c,
        row: r,
        type: PET_TYPES[floor(rand() * PET_TYPES.length)],
        body: fur[0], accent: fur[1], blush: fur[2],
        speed: (rand() * 1.5 + 0.5) * (rand() < 0.3 ? -1 : 1),
        phase: rand() * TWO_PI,
        flip: rand() < 0.5 ? 1 : -1,
      });
    }
  }
}

function getBrightness(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function draw() {
  background(bgColor);
  const mx = (canvasSize - cols * cellSize) / 2;
  const my = (canvasSize - rows * cellSize) / 2;

  for (const p of pets) {
    const cx = mx + p.col * cellSize + cellSize / 2;
    const cy = my + p.row * cellSize + cellSize / 2;
    const sz = cellSize * 0.38;

    // Soft backdrop circle for visibility
    noStroke();
    if (isLightBg) {
      fill(255, 255, 255, 50);
    } else {
      fill(255, 255, 255, 18);
    }
    ellipse(cx, cy, cellSize * 0.82, cellSize * 0.82);

    push();
    translate(cx, cy);
    scale(p.flip, 1);
    drawPet(p, sz);
    pop();
  }
}

function drawPet(p, sz) {
  const t = millis() * 0.001 * p.speed + p.phase;
  switch (p.type) {
    case 'catFace':     drawCatFace(t, sz, p); break;
    case 'dogFace':     drawDogFace(t, sz, p); break;
    case 'sleepyCat':   drawSleepyCat(t, sz, p); break;
    case 'wagTail':     drawWagTail(t, sz, p); break;
    case 'catTail':     drawCatTail(t, sz, p); break;
    case 'pawPrint':    drawPawPrint(t, sz, p); break;
    case 'yarnBall':    drawYarnBall(t, sz, p); break;
    case 'fishChase':   drawFishChase(t, sz, p); break;
    case 'boneSpin':    drawBoneSpin(t, sz, p); break;
    case 'catStretch':  drawCatStretch(t, sz, p); break;
    case 'puppyBounce': drawPuppyBounce(t, sz, p); break;
    case 'catCurl':     drawCatCurl(t, sz, p); break;
  }
}

// ── Cat Face (blinking) ─────────────────────────────────────────────────────

function drawCatFace(t, sz, p) {
  noStroke();
  fill(p.body);
  triangle(-sz*0.7, -sz*0.3, -sz*0.35, -sz*1.1, -sz*0.05, -sz*0.5);
  triangle(sz*0.7, -sz*0.3, sz*0.35, -sz*1.1, sz*0.05, -sz*0.5);
  fill(p.blush);
  triangle(-sz*0.55, -sz*0.35, -sz*0.38, -sz*0.9, -sz*0.15, -sz*0.5);
  triangle(sz*0.55, -sz*0.35, sz*0.38, -sz*0.9, sz*0.15, -sz*0.5);
  fill(p.body);
  ellipse(0, 0, sz*1.7, sz*1.5);
  fill(p.blush);
  ellipse(-sz*0.45, sz*0.2, sz*0.35, sz*0.25);
  ellipse(sz*0.45, sz*0.2, sz*0.35, sz*0.25);
  const blink = (t * 2) % 6;
  fill(isLightBg ? '#333' : '#222');
  if (blink < 0.15 || (blink > 3 && blink < 3.15)) {
    stroke(isLightBg ? '#333' : '#222');
    strokeWeight(sz * 0.06);
    noFill();
    arc(-sz*0.3, -sz*0.05, sz*0.3, sz*0.15, 0, PI);
    arc(sz*0.3, -sz*0.05, sz*0.3, sz*0.15, 0, PI);
    noStroke();
  } else {
    ellipse(-sz*0.3, -sz*0.08, sz*0.22, sz*0.28);
    ellipse(sz*0.3, -sz*0.08, sz*0.22, sz*0.28);
    fill(255);
    ellipse(-sz*0.24, -sz*0.14, sz*0.08, sz*0.08);
    ellipse(sz*0.36, -sz*0.14, sz*0.08, sz*0.08);
  }
  fill(p.blush);
  ellipse(0, sz*0.12, sz*0.12, sz*0.09);
  noFill();
  stroke(isLightBg ? '#555' : '#333');
  strokeWeight(sz * 0.04);
  arc(-sz*0.08, sz*0.18, sz*0.15, sz*0.12, -PI*0.1, PI*0.7);
  arc(sz*0.08, sz*0.18, sz*0.15, sz*0.12, PI*0.3, PI*1.1);
  stroke(isLightBg ? '#888' : '#777');
  strokeWeight(sz * 0.02);
  const wh = sin(t * 3) * sz * 0.03;
  line(-sz*0.2, sz*0.15, -sz*0.8, sz*0.05 + wh);
  line(-sz*0.2, sz*0.2, -sz*0.8, sz*0.22 - wh);
  line(sz*0.2, sz*0.15, sz*0.8, sz*0.05 - wh);
  line(sz*0.2, sz*0.2, sz*0.8, sz*0.22 + wh);
  noStroke();
}

// ── Dog Face (panting tongue) ───────────────────────────────────────────────

function drawDogFace(t, sz, p) {
  noStroke();
  fill(p.body);
  const earFlap = sin(t * 2) * sz * 0.05;
  ellipse(-sz*0.65, -sz*0.15 + earFlap, sz*0.45, sz*0.8);
  ellipse(sz*0.65, -sz*0.15 - earFlap, sz*0.45, sz*0.8);
  fill(p.accent);
  ellipse(0, 0, sz*1.7, sz*1.5);
  fill(p.body);
  ellipse(0, -sz*0.35, sz*1.0, sz*0.7);
  fill(isLightBg ? '#333' : '#222');
  ellipse(-sz*0.3, -sz*0.1, sz*0.2, sz*0.24);
  ellipse(sz*0.3, -sz*0.1, sz*0.2, sz*0.24);
  fill(255);
  ellipse(-sz*0.25, -sz*0.15, sz*0.08, sz*0.08);
  ellipse(sz*0.35, -sz*0.15, sz*0.08, sz*0.08);
  fill(p.accent);
  ellipse(0, sz*0.22, sz*0.7, sz*0.5);
  fill('#333');
  ellipse(0, sz*0.1, sz*0.2, sz*0.15);
  const tongueLen = sz * (0.15 + 0.12 * abs(sin(t * 3)));
  fill('#FF8A8A');
  ellipse(0, sz*0.35 + tongueLen * 0.3, sz*0.18, tongueLen);
  noFill();
  stroke(isLightBg ? '#555' : '#444');
  strokeWeight(sz * 0.03);
  arc(0, sz*0.22, sz*0.3, sz*0.2, 0, PI);
  noStroke();
  fill(p.blush);
  ellipse(-sz*0.5, sz*0.15, sz*0.2, sz*0.15);
  ellipse(sz*0.5, sz*0.15, sz*0.2, sz*0.15);
}

// ── Sleepy Cat (zzz) ────────────────────────────────────────────────────────

function drawSleepyCat(t, sz, p) {
  noStroke();
  fill(p.body);
  ellipse(0, sz*0.15, sz*1.6, sz*1.1);
  ellipse(-sz*0.35, -sz*0.25, sz*0.9, sz*0.8);
  triangle(-sz*0.7, -sz*0.45, -sz*0.6, -sz*0.85, -sz*0.35, -sz*0.55);
  triangle(-sz*0.15, -sz*0.5, -sz*0.1, -sz*0.85, sz*0.1, -sz*0.55);
  stroke(isLightBg ? '#555' : '#444');
  strokeWeight(sz * 0.05);
  noFill();
  arc(-sz*0.5, -sz*0.22, sz*0.22, sz*0.12, PI, TWO_PI);
  arc(-sz*0.2, -sz*0.22, sz*0.22, sz*0.12, PI, TWO_PI);
  noStroke();
  fill(p.blush);
  ellipse(-sz*0.6, -sz*0.12, sz*0.18, sz*0.12);
  ellipse(-sz*0.08, -sz*0.12, sz*0.18, sz*0.12);
  noFill();
  stroke(p.body);
  strokeWeight(sz * 0.15);
  strokeCap(ROUND);
  const tailWave = sin(t * 0.8) * 0.2;
  arc(sz*0.4, sz*0.1, sz*0.8, sz*0.6, -PI*0.3 + tailWave, PI*0.5 + tailWave);
  noStroke();
  const zPhase = (t * 1.5) % 3;
  const zCol = isLightBg ? color(136) : color(170);
  textAlign(CENTER, CENTER);
  textSize(sz * 0.25);
  zCol.setAlpha(min(zPhase, 1) * 255);
  fill(zCol);
  text('z', sz*0.3, -sz*0.5 - zPhase * sz*0.15);
  if (zPhase > 0.5) {
    textSize(sz * 0.3);
    zCol.setAlpha(min((zPhase-0.5)*2, 1) * 200);
    fill(zCol);
    text('Z', sz*0.55, -sz*0.7 - (zPhase-0.5) * sz*0.15);
  }
}

// ── Wagging Tail ────────────────────────────────────────────────────────────

function drawWagTail(t, sz, p) {
  noStroke();
  fill(p.body);
  ellipse(0, sz*0.2, sz*1.5, sz*1.3);
  fill(p.accent);
  ellipse(0, sz*0.15, sz*0.7, sz*0.5);
  fill(p.body);
  ellipse(-sz*0.4, sz*0.7, sz*0.25, sz*0.4);
  ellipse(sz*0.4, sz*0.7, sz*0.25, sz*0.4);
  noFill();
  stroke(p.body);
  strokeWeight(sz * 0.15);
  strokeCap(ROUND);
  const wag = sin(t * 6) * 0.8;
  const tx = sin(wag) * sz * 0.5;
  const ty = -sz * 0.5;
  bezier(0, -sz*0.1, tx*0.3, ty*0.3, tx*0.7, ty*0.7, tx, ty - sz*0.2);
  noStroke();
}

// ── Cat Tail (swish) ────────────────────────────────────────────────────────

function drawCatTail(t, sz, p) {
  noStroke();
  fill(p.body);
  ellipse(0, sz*0.15, sz*1.4, sz*0.9);
  ellipse(-sz*0.55, -sz*0.2, sz*0.7, sz*0.65);
  triangle(-sz*0.85, -sz*0.35, -sz*0.78, -sz*0.7, -sz*0.55, -sz*0.45);
  triangle(-sz*0.45, -sz*0.4, -sz*0.38, -sz*0.72, -sz*0.2, -sz*0.42);
  noFill();
  stroke(p.body);
  strokeWeight(sz * 0.12);
  strokeCap(ROUND);
  const sw = sin(t * 3) * sz * 0.4;
  bezier(sz*0.5, sz*0.05, sz*0.8, -sz*0.2, sz*0.6+sw, -sz*0.6, sz*0.8+sw*0.5, -sz*0.9);
  noStroke();
  fill(isLightBg ? '#333' : '#222');
  ellipse(-sz*0.65, -sz*0.22, sz*0.12, sz*0.15);
  ellipse(-sz*0.45, -sz*0.22, sz*0.12, sz*0.15);
  fill(p.body);
  rect(-sz*0.35, sz*0.4, sz*0.15, sz*0.35, sz*0.05);
  rect(-sz*0.05, sz*0.4, sz*0.15, sz*0.35, sz*0.05);
  rect(sz*0.15, sz*0.4, sz*0.15, sz*0.35, sz*0.05);
}

// ── Paw Print (stepping) ────────────────────────────────────────────────────

function drawPawPrint(t, sz, p) {
  const phase = (t * 1.5) % 4;
  noStroke();
  for (let i = 0; i < 4; i++) {
    const active = (phase > i && phase < i + 1.2);
    const a = active ? 255 : 60;
    const ox = (i % 2 === 0 ? -1 : 1) * sz * 0.35;
    const oy = (i < 2 ? -1 : 1) * sz * 0.35;
    push();
    translate(ox, oy);
    fill(red(color(p.body)), green(color(p.body)), blue(color(p.body)), a);
    ellipse(0, sz*0.08, sz*0.35, sz*0.3);
    const toeR = sz * 0.1;
    ellipse(-sz*0.1, -sz*0.1, toeR, toeR);
    ellipse(sz*0.1, -sz*0.1, toeR, toeR);
    ellipse(0, -sz*0.16, toeR * 0.9, toeR * 0.9);
    pop();
  }
}

// ── Yarn Ball (rolling) ─────────────────────────────────────────────────────

function drawYarnBall(t, sz, p) {
  const rollX = sin(t * 2) * sz * 0.3;
  push();
  translate(rollX, 0);
  rotate(t * 3);
  noStroke();
  fill(p.blush);
  ellipse(0, 0, sz*1.2, sz*1.2);
  noFill();
  stroke(p.body);
  strokeWeight(sz * 0.04);
  arc(0, 0, sz*0.8, sz*0.5, 0, PI*1.5);
  arc(sz*0.05, sz*0.1, sz*0.5, sz*0.9, PI*0.5, PI*2);
  arc(-sz*0.1, -sz*0.05, sz*0.9, sz*0.4, PI*0.3, PI*1.8);
  noStroke();
  pop();
  noFill();
  stroke(p.blush);
  strokeWeight(sz * 0.03);
  strokeCap(ROUND);
  const stringWave = sin(t * 4) * sz * 0.1;
  bezier(rollX + sz*0.5, 0, rollX + sz*0.7, stringWave, sz*0.8, -stringWave, sz*0.9, sz*0.2);
  noStroke();
}

// ── Fish Chase ──────────────────────────────────────────────────────────────

function drawFishChase(t, sz, p) {
  const n = 3;
  noStroke();
  for (let i = 0; i < n; i++) {
    const angle = t * 2 + (TWO_PI / n) * i;
    const orbitR = sz * 0.5;
    const fx = cos(angle) * orbitR;
    const fy = sin(angle) * orbitR;
    const fishSz = sz * (0.35 - i * 0.05);
    const a = map(i, 0, n-1, 255, 100);
    push();
    translate(fx, fy);
    rotate(angle + HALF_PI);
    fill(red(color(p.body)), green(color(p.body)), blue(color(p.body)), a);
    ellipse(0, 0, fishSz*0.6, fishSz);
    triangle(0, fishSz*0.4, -fishSz*0.3, fishSz*0.7, fishSz*0.3, fishSz*0.7);
    fill(255, 255, 255, a);
    ellipse(-fishSz*0.1, -fishSz*0.2, fishSz*0.15, fishSz*0.15);
    fill(0, 0, 0, a);
    ellipse(-fishSz*0.1, -fishSz*0.2, fishSz*0.08, fishSz*0.08);
    pop();
  }
}

// ── Bone Spin ───────────────────────────────────────────────────────────────

function drawBoneSpin(t, sz, p) {
  push();
  rotate(t * 2.5);
  noStroke();
  fill(p.accent);
  rectMode(CENTER);
  rect(0, 0, sz*1.2, sz*0.25, sz*0.1);
  ellipse(-sz*0.55, -sz*0.12, sz*0.3, sz*0.3);
  ellipse(-sz*0.55, sz*0.12, sz*0.3, sz*0.3);
  ellipse(sz*0.55, -sz*0.12, sz*0.3, sz*0.3);
  ellipse(sz*0.55, sz*0.12, sz*0.3, sz*0.3);
  rectMode(CORNER);
  pop();
}

// ── Cat Stretch ─────────────────────────────────────────────────────────────

function drawCatStretch(t, sz, p) {
  const stretch = sin(t * 1.5) * 0.5 + 0.5;
  noStroke();
  fill(p.body);
  const bodyW = sz * (1.2 + stretch * 0.6);
  const bodyH = sz * (0.6 - stretch * 0.15);
  ellipse(0, sz*0.15, bodyW, bodyH);
  const headX = -bodyW * 0.38;
  ellipse(headX, -sz*0.1, sz*0.55, sz*0.5);
  triangle(headX-sz*0.25, -sz*0.2, headX-sz*0.2, -sz*0.5, headX-sz*0.05, -sz*0.25);
  triangle(headX+sz*0.05, -sz*0.25, headX+sz*0.12, -sz*0.5, headX+sz*0.25, -sz*0.2);
  fill(isLightBg ? '#333' : '#222');
  ellipse(headX-sz*0.1, -sz*0.1, sz*0.08, sz*0.1);
  ellipse(headX+sz*0.08, -sz*0.1, sz*0.08, sz*0.1);
  fill(p.body);
  noFill();
  stroke(p.body);
  strokeWeight(sz * 0.1);
  strokeCap(ROUND);
  const tailX = bodyW * 0.38;
  const tw = sin(t * 3) * sz * 0.2;
  bezier(tailX, sz*0.1, tailX+sz*0.2, -sz*0.1, tailX+sz*0.3+tw, -sz*0.4, tailX+sz*0.2+tw, -sz*0.6);
  noStroke();
  fill(p.body);
  rect(headX-sz*0.1, sz*0.2, sz*0.12, sz*0.35 + stretch*sz*0.15, sz*0.04);
  rect(headX+sz*0.1, sz*0.2, sz*0.12, sz*0.35 + stretch*sz*0.15, sz*0.04);
}

// ── Puppy Bounce ────────────────────────────────────────────────────────────

function drawPuppyBounce(t, sz, p) {
  const bounceY = -abs(sin(t * 3)) * sz * 0.4;
  push();
  translate(0, bounceY);
  noStroke();
  fill(p.body);
  ellipse(0, sz*0.1, sz*1.0, sz*0.8);
  ellipse(0, -sz*0.35, sz*0.8, sz*0.7);
  fill(p.body);
  ellipse(-sz*0.4, -sz*0.2, sz*0.25, sz*0.45);
  ellipse(sz*0.4, -sz*0.2, sz*0.25, sz*0.45);
  fill(p.accent);
  ellipse(0, -sz*0.15, sz*0.4, sz*0.3);
  fill('#333');
  ellipse(0, -sz*0.22, sz*0.12, sz*0.09);
  fill(isLightBg ? '#333' : '#222');
  ellipse(-sz*0.18, -sz*0.38, sz*0.12, sz*0.15);
  ellipse(sz*0.18, -sz*0.38, sz*0.12, sz*0.15);
  fill(255);
  ellipse(-sz*0.15, -sz*0.42, sz*0.05, sz*0.05);
  ellipse(sz*0.21, -sz*0.42, sz*0.05, sz*0.05);
  fill(p.blush);
  ellipse(-sz*0.3, -sz*0.2, sz*0.15, sz*0.1);
  ellipse(sz*0.3, -sz*0.2, sz*0.15, sz*0.1);
  fill(p.body);
  rect(-sz*0.25, sz*0.35, sz*0.15, sz*0.3, sz*0.05);
  rect(sz*0.1, sz*0.35, sz*0.15, sz*0.3, sz*0.05);
  pop();
  noStroke();
  fill(0, 0, 0, 30);
  ellipse(0, sz*0.75, sz*(0.6 + bounceY*0.002), sz*0.12);
}

// ── Cat Curl (breathing) ────────────────────────────────────────────────────

function drawCatCurl(t, sz, p) {
  const breath = sin(t * 1.8) * sz * 0.05;
  noStroke();
  fill(p.body);
  ellipse(0, sz*0.1, sz*1.4 + breath, sz*1.0 + breath*0.5);
  ellipse(-sz*0.3, -sz*0.2, sz*0.65, sz*0.6);
  triangle(-sz*0.55, -sz*0.35, -sz*0.52, -sz*0.65, -sz*0.32, -sz*0.42);
  triangle(-sz*0.15, -sz*0.4, -sz*0.08, -sz*0.65, sz*0.05, -sz*0.38);
  noFill();
  stroke(p.body);
  strokeWeight(sz * 0.13);
  strokeCap(ROUND);
  arc(sz*0.1, sz*0.2, sz*0.9, sz*0.7, -PI*0.3, PI*0.8);
  noStroke();
  fill(p.accent);
  const tipAngle = PI * 0.8;
  ellipse(sz*0.1 + cos(tipAngle)*sz*0.45, sz*0.2 + sin(tipAngle)*sz*0.35, sz*0.15, sz*0.12);
  stroke(isLightBg ? '#555' : '#444');
  strokeWeight(sz * 0.04);
  noFill();
  arc(-sz*0.42, -sz*0.18, sz*0.15, sz*0.08, PI, TWO_PI);
  arc(-sz*0.2, -sz*0.18, sz*0.15, sz*0.08, PI, TWO_PI);
  noStroke();
  fill(p.blush);
  ellipse(-sz*0.52, -sz*0.08, sz*0.12, sz*0.08);
  ellipse(-sz*0.08, -sz*0.08, sz*0.12, sz*0.08);
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  cellSize = canvasSize / max(cols, rows);
}

function keyPressed() {
  if (key === ' ') initPets();
  if (key === 's' || key === 'S') saveCanvas('loading-pets-' + Date.now(), 'png');
}
