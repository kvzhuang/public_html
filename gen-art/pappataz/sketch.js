// ============================================
// Psychic Warriors of Pappataz - Generative Art
// Exquisite Corpse style: mix & match character
// parts from original artwork
// Inspired by Psychic Warriors of Pappataz
// ============================================

const rand = fxrand;
const PART_COUNT = 34;

// Background colors extracted from original artworks
const BG_COLORS = [
  '#CA6370', '#F58ED3', '#55C3C2', '#52B876',
  '#ECBE56', '#7B78D5', '#AB96A7', '#FD9B27',
  '#FFF8E2', '#FF6F61', '#4CAF50', '#E75480',
];

let topImgs = [];
let midImgs = [];
let botImgs = [];

let topIdx, midIdx, botIdx;
let bgColor;
let canvasSize;

function preload() {
  for (let i = 0; i < PART_COUNT; i++) {
    const id = String(i).padStart(2, '0');
    topImgs[i] = loadImage(`parts/top/${id}.png`);
    midImgs[i] = loadImage(`parts/mid/${id}.png`);
    botImgs[i] = loadImage(`parts/bot/${id}.png`);
  }
}

function setup() {
  canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);

  pickCharacter();

  window.$fxhashFeatures = {
    "Top": topIdx,
    "Mid": midIdx,
    "Bot": botIdx,
  };

  noLoop();
  setTimeout(() => fxpreview(), 1000);
}

function pickCharacter() {
  topIdx = floor(rand() * PART_COUNT);
  midIdx = floor(rand() * PART_COUNT);
  botIdx = floor(rand() * PART_COUNT);
  bgColor = BG_COLORS[floor(rand() * BG_COLORS.length)];
}

function draw() {
  background(bgColor);

  // Original: 400x400, sliced at 35% and 68%
  const topRatio = 0.35;
  const midRatio = 0.33;
  const botRatio = 0.32;

  const scale = canvasSize / 400;
  const imgW = 400 * scale;
  const topPx = 400 * topRatio * scale;
  const midPx = 400 * midRatio * scale;
  const botPx = 400 * botRatio * scale;

  const x = (canvasSize - imgW) / 2;
  const totalH = topPx + midPx + botPx;
  const y = (canvasSize - totalH) / 2;

  if (topImgs[topIdx]) image(topImgs[topIdx], x, y, imgW, topPx);
  if (midImgs[midIdx]) image(midImgs[midIdx], x, y + topPx, imgW, midPx);
  if (botImgs[botIdx]) image(botImgs[botIdx], x, y + topPx + midPx, imgW, botPx);

  // Credit
  fill(255, 255, 255, 80);
  noStroke();
  textAlign(CENTER);
  textSize(canvasSize * 0.022);
  text('Inspired by Psychic Warriors of Pappataz', canvasSize / 2, canvasSize * 0.97);
}

function windowResized() {
  canvasSize = min(windowWidth, windowHeight);
  resizeCanvas(canvasSize, canvasSize);
  redraw();
}

function keyPressed() {
  if (key === ' ') {
    pickCharacter();
    redraw();
  }
  if (key === 's' || key === 'S') {
    saveCanvas(`pappataz-${fxhash.slice(0, 8)}-${Date.now()}`, 'png');
  }
}

function mousePressed() {
  if (mouseX > 0 && mouseX < canvasSize && mouseY > 0 && mouseY < canvasSize) {
    pickCharacter();
    redraw();
  }
}
