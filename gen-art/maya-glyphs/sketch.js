// ============================================================
// Maya Glyph 馬雅頭像字 — Generative Art (p5.js + fxhash)
// 靈感：J.E.S. Thompson《A Catalog of Maya Hieroglyphs》(1962) 的圖版。
// 為了「不同一化」，字符分多種骨架，程序生成一整版仿圖錄字錄：
//   ● 頭像 head：側臉輪廓「參數化」(額凸/鼻長/下顎/高矮/後腦) → 千變萬化，
//     再分 人 human / 神 deity / 骷髏 skull / 老神 oldgod / 怪 monster 五型眼嘴
//   ● 動物 animal：獸 jaguar / 鳥 bird / 蛇 serpent，長吻＋立耳
//   ● 手掌 hand：手掌字(如 T1028)
//   ● 幾何綴字 abstract：同心橢圓/帶紋/渦捲對/交叉線/十字，無臉
// 零件：圓角字框、眼(杏仁/骷髏窩/神眼渦捲)、鼻渦捲、耳栓、頭冠、獠牙/齒列、
//   點刻 stipple / 交叉線 hatch(clip 收邊)。黑字・灰字、白底或米色/牛皮紙底。
// 純原創繪製，非臨摹真實字符。 CLICK 重生 · S 存圖。
// ============================================================

const rr = (a, b) => a + fxrand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(fxrand() * a.length)];
const chance = p => fxrand() < p;
const U = 100;
const PW = 780, PH = 1040;

const PALETTES = [
  { name: '象牙白', bg: '#f7f4ea', ink: '#17130c', gray: '#8d8577' },
  { name: '米黃紙', bg: '#ece1c8', ink: '#211a0f', gray: '#9a8c6f' },
  { name: '灰白', bg: '#f4f2ec', ink: '#26221b', gray: '#a9a294' },
  { name: '老紙', bg: '#e5d6b8', ink: '#241a0e', gray: '#8b795a' },
  { name: '牛皮', bg: '#dcc9a4', ink: '#201709', gray: '#7f6c4c' },
];

let P, LW, DW, INK, GRY, PAPER;
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const setStroke = (rgb, w) => { stroke(rgb[0], rgb[1], rgb[2]); strokeWeight(w); };
const setFill = rgb => fill(rgb[0], rgb[1], rgb[2]);

function setup() {
  createCanvas(PW, PH);
  pixelDensity(2);
  strokeCap(ROUND); strokeJoin(ROUND);
  noLoop();
  generate();
}
function draw() {}
function mousePressed() { generate(); }
function keyPressed() { if (key === 's' || key === 'S') save('maya-glyphs-' + (fxhash ? fxhash.slice(2, 10) : 'art') + '.png'); }

function generate() {
  P = pick(PALETTES);
  PAPER = hx(P.bg); INK = hx(P.ink); GRY = hx(P.gray);
  background(PAPER[0], PAPER[1], PAPER[2]);

  const cols = pick([7, 8, 8, 9]);
  const M = 44, titleH = 40, footH = 26;
  const gridW = PW - 2 * M;
  const cellW = gridW / cols;
  const labelH = 20, glyphH = cellW * 1.04, cellH = glyphH + labelH;
  const gridTop = M + titleH;
  const rows = Math.floor((PH - gridTop - footH - M) / cellH);

  window.$fxhashFeatures = { '色盤': P.name, '欄數': cols, '列數': rows, '字符數': cols * rows };

  const scale = (cellW * 0.84) / U;
  LW = 3.0 * scale; DW = 1.9 * scale;

  const baseNo = 1000 + ri(0, 60) * 5;
  drawTitle(M, M + 22, gridW, baseNo, cols * rows);

  let no = baseNo, letterIdx = 0;
  const LETTERS = 'abcdefghijklm';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = M + c * cellW, cy = gridTop + r * cellH;
      drawGlyphBlock(cx, cy, cellW, glyphH, makeSpec());
      let label;
      if (chance(0.45)) { label = '' + no; no += 5; letterIdx = 0; }
      else { label = no + LETTERS[Math.min(letterIdx, 12)]; letterIdx++; if (letterIdx > ri(1, 4)) { no += 5; letterIdx = 0; } }
      drawLabel(cx + cellW / 2, cy + glyphH + 13, label);
    }
  }
  drawFooter(PW - M, PH - M + 4);
  if (window.fxpreview) { try { fxpreview(); } catch (e) {} }
}

// ── 字符規格 ──
function makeSpec() {
  const r = fxrand();
  const kind = r < 0.58 ? 'head' : r < 0.76 ? 'animal' : r < 0.87 ? 'hand' : 'abstract';
  return {
    kind,
    headVar: pick(['human', 'human', 'deity', 'skull', 'oldgod', 'monster']),
    animalVar: pick(['jaguar', 'bird', 'serpent']),
    faceLeft: chance(0.5),
    ink: chance(0.22) ? 'gray' : 'ink',
    frame: pick(['round', 'round', 'square', 'soft']),
    doubleFrame: chance(0.3),
    ear: pick(['spool', 'spool', 'pointed', 'none']),
    crest: pick(['scroll', 'feather', 'dots', 'knot', 'none', 'none']),
    frontAffix: chance(0.42),
    fillMain: chance(0.26),
    texture: pick(['stipple', 'hatch', 'none', 'none']),
    hp: { fore: rr(-3, 7), nose: rr(-3, 12), jaw: rr(-4, 7), tall: rr(-6, 6), back: rr(-2, 7) },
    seed: Array.from({ length: 8 }, () => rr(-2.5, 2.5)),
  };
}

function drawGlyphBlock(cx, cy, cellW, glyphH, spec) {
  const gW = cellW * 0.84, gH = glyphH * 0.9;
  const ox = cx + (cellW - gW) / 2, oy = cy + (glyphH - gH) / 2;
  push();
  translate(ox, oy);
  scale(gW / U, gH / U);
  if (spec.faceLeft && spec.kind !== 'abstract') { translate(U, 0); scale(-1, 1); }
  drawGlyph(spec);
  pop();
}

function drawGlyph(spec) {
  const col = spec.ink === 'gray' ? GRY : INK;
  drawCartouche(spec, col);
  if (spec.kind === 'head') drawHeadGlyph(spec, col);
  else if (spec.kind === 'animal') drawAnimalGlyph(spec, col);
  else if (spec.kind === 'hand') drawHandGlyph(spec, col);
  else drawAbstractGlyph(spec, col);
}

function drawCartouche(spec, col) {
  const s = spec.seed;
  setStroke(col, LW * 1.15); setFill(PAPER);
  if (spec.frame === 'square') roundRectPath(4, 4, 92, 92, 8 + s[0], 8 + s[1]);
  else if (spec.frame === 'soft') roundRectPath(5, 5, 90, 90, 30 + s[0], 30 + s[1]);
  else roundRectPath(4, 4, 92, 92, 16 + s[0], 16 + s[1]);
  if (spec.doubleFrame) { noFill(); setStroke(col, DW * 0.8); roundRectPath(9, 9, 82, 82, 12, 12); }
}

// ═══════════════ 頭像 head（參數化側臉）═══════════════
function headOutline(hp) {
  beginShape();
  vertex(20, 18 - hp.tall * 0.4);
  bezierVertex(30, 9 - hp.tall * 0.5, 54, 7 - hp.tall * 0.5, 66, 12);
  bezierVertex(78 + hp.fore, 16, 81 + hp.fore, 26, 78, 32);
  bezierVertex(73, 38, 70, 40, 72, 44);
  bezierVertex(80, 47, 88 + hp.nose, 49, 85 + hp.nose, 54);
  bezierVertex(82, 58, 74, 57, 71, 61);
  bezierVertex(77, 64, 82 + hp.nose * 0.4, 66, 78, 70);
  bezierVertex(74, 75, 68, 76, 66 + hp.jaw, 82);
  bezierVertex(62, 88 + hp.tall * 0.3, 50, 91 + hp.tall * 0.35, 38, 90 + hp.tall * 0.35);
  bezierVertex(26, 89, 15, 85, 12, 73);
  bezierVertex(9 - hp.back, 61, 8 - hp.back, 34, 12, 27);
  bezierVertex(14, 21, 16, 19, 20, 18 - hp.tall * 0.4);
  endShape(CLOSE);
}

function drawHeadGlyph(spec, col) {
  const hp = spec.hp, V = spec.headVar;
  const EX = 56, EY = 31 - hp.tall * 0.28;
  const NX = 84 + hp.nose, NY = 53;
  const MX = 73 + hp.nose * 0.4, MY = 68;

  if (spec.fillMain) { noStroke(); fill(GRY[0], GRY[1], GRY[2], 55); headOutline(hp); }
  noFill(); setStroke(col, LW); headOutline(hp);

  drawCrest(spec, col);
  if (spec.ear !== 'none' && V !== 'skull') drawEar(spec, col);

  // 眼
  noFill();
  if (V === 'skull') {
    setStroke(col, LW * 0.9); setFill(PAPER); circle(EX, EY + 1, 15);
    setFill(col); noStroke(); circle(EX, EY + 1, 6);
  } else if (V === 'deity') {
    setStroke(col, DW); setFill(PAPER); almond(EX, EY, 15, 9);
    setFill(col); noStroke(); circle(EX + 2, EY, 5.5);
    setStroke(col, DW); noFill(); scroll(EX - 5, EY - 7, 6, 1.3, -1);
  } else if (V === 'oldgod') {
    setStroke(col, DW); setFill(PAPER); rectPath(EX - 7, EY - 5, 14, 11, 2);
    setFill(col); noStroke(); circle(EX, EY, 5);
    setStroke(col, DW); noFill(); arc(EX, EY - 8, 16, 8, PI, TWO_PI);   // 眉
  } else if (V === 'monster') {
    setStroke(col, LW * 0.85); setFill(PAPER); circle(EX, EY, 17);
    setFill(col); noStroke(); circle(EX + 1, EY, 7);
  } else {
    setStroke(col, DW); setFill(PAPER); almond(EX, EY, 13, 8);
    setFill(col); noStroke(); circle(EX + 2, EY, 5);
  }

  // 鼻
  noFill(); setStroke(col, DW);
  if (V === 'skull') scroll(NX - 4, NY - 1, 3.4, 1.2, 1);
  else if (V === 'oldgod') { push(); translate(NX - 2, NY); arc(0, 0, 12, 12, HALF_PI * 0.2, PI); pop(); }  // 大鉤鼻
  else { push(); translate(NX - 5, NY - 1); arc(0, 0, 8, 8, HALF_PI * 0.4, PI); pop(); }

  // 嘴
  setStroke(col, LW * 0.9);
  if (V === 'skull') { line(MX - 4, MY - 2, NX - 2, MY - 2); teeth(MX - 3, NX - 2, MY - 2, 5, col); }
  else if (V === 'monster') {
    setFill(PAPER); setStroke(col, LW * 0.85);
    beginShape(); vertex(MX - 6, MY - 4); vertex(NX, MY - 4); vertex(NX - 2, MY + 6); vertex(MX - 4, MY + 5); endShape(CLOSE);
    teeth(MX - 5, NX - 2, MY - 4, 4, col); triFang(MX - 3, MY + 5, col, -1); triFang(NX - 4, MY - 4, col, 1);
  } else if (V === 'deity') { scrollMouth(MX, MY, col); triFang(MX + 4, MY, col, 1); }
  else if (V === 'oldgod') { noFill(); setStroke(col, LW * 0.9); arc(MX + 2, MY - 2, 16, 12, HALF_PI * 0.6, PI - HALF_PI * 0.2); }  // 無齒下垂嘴
  else { line(MX - 2, MY, NX - 2, MY + 1); noFill(); scroll(MX - 2, MY, 3, 0.9, 1); }

  // 老神臉紋 / 骷髏死斑
  if (V === 'oldgod') { noFill(); setStroke(col, DW * 0.8); arc(46, 52, 14, 10, -HALF_PI * 0.5, HALF_PI * 0.7); arc(44, 62, 12, 8, -HALF_PI * 0.5, HALF_PI * 0.7); }
  if (V === 'skull') { setFill(col); noStroke(); for (let i = 0; i < 3; i++) circle(30 + i * 8, 80, 3); }

  if (spec.frontAffix) drawFrontAffix(spec, col);
  drawTexture(spec, col, 20, 6, 40, 16);
}

// ═══════════════ 動物 animal ═══════════════
function drawAnimalGlyph(spec, col) {
  const s = spec.seed, A = spec.animalVar;
  const beak = A === 'bird';
  if (spec.fillMain) { noStroke(); fill(GRY[0], GRY[1], GRY[2], 55); animalOutline(s, beak); }
  noFill(); setStroke(col, LW); animalOutline(s, beak);

  // 耳
  if (A === 'jaguar') { setStroke(col, LW * 0.85); setFill(PAPER); circle(33, 16, 15); noFill(); setStroke(col, DW); circle(33, 16, 7); }
  else if (A !== 'bird') { noFill(); setStroke(col, LW * 0.85); beginShape(); vertex(28, 20); vertex(24, 6); vertex(40, 16); endShape(); }

  // 眼
  setStroke(col, DW); setFill(PAPER); circle(56, 34, 12);
  setFill(col); noStroke(); circle(57, 34, 5);

  // 吻 / 喙
  noFill(); setStroke(col, DW);
  if (beak) { line(72, 46, 92, 44); line(72, 52, 90, 52); }
  else {
    scroll(86, 46, 3, 1.1, 1);                        // 鼻孔渦捲
    setStroke(col, LW * 0.85); line(70, 55, 90, 55);  // 口
    triFang(85, 55, col, 1); if (A === 'jaguar') triFang(74, 55, col, 1);
  }
  // 蛇：分岔舌 + 鱗紋 hatch
  if (A === 'serpent') { setStroke(col, DW); line(90, 55, 98, 52); line(90, 55, 98, 58); drawTexture({ texture: 'hatch' }, col, 24, 40, 26, 22); }
  // 豹：頰斑
  if (A === 'jaguar') { setFill(col); noStroke(); for (let i = 0; i < 3; i++) circle(40 + i * 7, 44 + (i % 2) * 6, 3); }

  drawCrest(spec, col);
  if (spec.frontAffix) drawFrontAffix(spec, col);
}
function animalOutline(s, beak) {
  beginShape();
  vertex(28, 16);
  bezierVertex(40, 8, 58, 9, 68, 20);
  bezierVertex(72, 26, 70, 30, 74, 34);
  if (beak) { vertex(94, 40); vertex(94, 48); vertex(76, 50); }
  else { bezierVertex(84, 38, 94, 42, 92, 50); bezierVertex(90, 55, 80, 55, 74, 56); }
  bezierVertex(70, 62, 68, 70, 62, 76);
  bezierVertex(54, 86, 34, 90, 22, 80);
  bezierVertex(14, 72, 15, 60, 16, 48);
  bezierVertex(17, 34, 18, 24, 28, 16);
  endShape(CLOSE);
}

// ═══════════════ 手掌 hand ═══════════════
function drawHandGlyph(spec, col) {
  // 手掌
  setStroke(col, LW); setFill(PAPER); rectPath(29, 50, 44, 33, 12);
  // 四指
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = 35 + i * 9.3, top = 18 + (i === 0 || i === n - 1 ? 8 : 2);
    setStroke(col, LW * 0.9); setFill(PAPER); rectPath(x - 3.6, top, 7.2, 52 - top, 3.5);
  }
  // 拇指（斜）
  push(); translate(28, 56); rotate(-0.7);
  setStroke(col, LW * 0.9); setFill(PAPER); rectPath(-4, -18, 8, 20, 3.5);
  pop();
  // 掌心渦捲 + 腕珠 + 袖點
  noFill(); setStroke(col, DW); scroll(51, 66, 6, 1.2, 1);
  setFill(col); noStroke(); circle(51, 87, 5);
  for (let i = 0; i < 4; i++) circle(35 + i * 8, 82, 2.6);
  drawCrest(spec, col);
}

// ═══════════════ 幾何綴字 abstract ═══════════════
function drawAbstractGlyph(spec, col) {
  const all = ['oval', 'band', 'scrollpair', 'hatch', 'quatre', 'dots'];
  const bag = all.slice();
  const n = ri(2, 3), rowH = 84 / n;
  for (let r = 0; r < n; r++) {
    const m = bag.splice(Math.floor(fxrand() * bag.length), 1)[0];
    const cy = 12 + rowH * (r + 0.5), y = 8 + rowH * r + 4;
    if (m === 'oval') concentricOval(50, cy, 44 - r * 4, rowH - 8, ri(2, 3), col);
    else if (m === 'band') band(14, cy - (rowH - 12) / 2, 72, rowH - 12, col, chance(0.7));
    else if (m === 'scrollpair') { noFill(); setStroke(col, DW); scroll(34, cy, 8, 1.4, 1); scroll(66, cy, 8, 1.4, -1); line(42, cy, 58, cy); }
    else if (m === 'hatch') { noFill(); setStroke(col, LW * 0.8); rectPath(16, y, 68, rowH - 12, 6); drawTexture({ texture: 'hatch' }, col, 18, y + 2, 64, rowH - 16); }
    else if (m === 'quatre') quatrefoil(50, cy, Math.min(rowH * 0.7, 18), col);
    else { setFill(col); noStroke(); const k = ri(4, 7); for (let i = 0; i < k; i++) circle(18 + i * (64 / (k - 1)), cy, 5); }
  }
}

// ── 共用零件 ──
function drawCrest(spec, col) {
  if (!spec.crest || spec.crest === 'none') return;
  noFill(); setStroke(col, DW);
  const x0 = 24;
  if (spec.crest === 'scroll') { scroll(x0 + 4, 12, 6, 1.4, 1); scroll(x0 + 30, 11, 5, 1.2, -1); }
  else if (spec.crest === 'feather') { for (let i = 0; i < 5; i++) { const x = x0 + i * 8.5; line(x, 16, x - 3, 3); } }
  else if (spec.crest === 'dots') { setFill(col); noStroke(); for (let i = 0; i < 6; i++) circle(x0 + i * 7.5, 11 + (i % 2) * 3, 4.2); }
  else if (spec.crest === 'knot') { setStroke(col, DW); noFill(); rectPath(x0 + 4, 6, 20, 12, 5); line(x0 + 10, 6, x0 + 10, 18); line(x0 + 18, 6, x0 + 18, 18); }
}
function drawEar(spec, col) {
  const ex = 21, ey = 58;
  if (spec.ear === 'pointed') { noFill(); setStroke(col, LW * 0.9); beginShape(); vertex(18, 44); vertex(12, 28); vertex(27, 40); endShape(); }
  else {
    setStroke(col, LW * 0.8); setFill(PAPER); circle(ex, ey, 14);
    noFill(); setStroke(col, DW); circle(ex, ey, 7.5);
    setFill(col); noStroke(); circle(ex, ey, 3.2);
    if (chance(0.55)) { setStroke(col, DW); setFill(PAPER); rectPath(ex - 3, ey + 7, 6, 8, 2); }
  }
}
function drawFrontAffix(spec, col) {
  const x = 92, n = ri(2, 4);
  setFill(col); noStroke();
  for (let i = 0; i < n; i++) circle(x, 30 + i * (44 / n), 4);
  noFill(); setStroke(col, DW);
  for (let i = 0; i < n - 1; i++) line(x - 2, 30 + i * (44 / n) + 22 / n, x + 2, 30 + i * (44 / n) + 22 / n);
}
function drawTexture(spec, col, x, y, w, h) {
  if (!spec.texture || spec.texture === 'none') return;
  drawingContext.save();
  drawingContext.beginPath(); drawingContext.rect(x, y, w, h); drawingContext.clip();
  if (spec.texture === 'stipple') {
    setFill(GRY); noStroke();
    for (let i = 0; i < 24; i++) circle(x + rr(0, w), y + rr(0, h), rr(1.3, 2.4));
  } else {
    stroke(GRY[0], GRY[1], GRY[2], 160); strokeWeight(DW * 0.7);
    for (let i = -h; i < w; i += 5) line(x + i, y + h, x + i + h, y);
  }
  drawingContext.restore();
}

// ── 低階繪圖 ──
function roundRectPath(x, y, w, h, rx, ry) {
  rx = Math.max(2, rx); ry = Math.max(2, ry === undefined ? rx : ry);
  beginShape();
  vertex(x + rx, y);
  vertex(x + w - rx, y); quadraticVertex(x + w, y, x + w, y + ry);
  vertex(x + w, y + h - ry); quadraticVertex(x + w, y + h, x + w - rx, y + h);
  vertex(x + rx, y + h); quadraticVertex(x, y + h, x, y + h - ry);
  vertex(x, y + ry); quadraticVertex(x, y, x + rx, y);
  endShape(CLOSE);
}
function rectPath(x, y, w, h, r) { roundRectPath(x, y, w, h, r, r); }
function almond(cx, cy, w, h) {
  beginShape();
  vertex(cx - w / 2, cy);
  quadraticVertex(cx, cy - h, cx + w / 2, cy);
  quadraticVertex(cx, cy + h, cx - w / 2, cy);
  endShape(CLOSE);
}
function scroll(cx, cy, r0, turns, dir) {
  const steps = Math.floor(turns * 26);
  beginShape();
  for (let i = 0; i <= steps; i++) { const a = dir * i * 0.24, rad = r0 * (1 - (i / steps) * 0.82); vertex(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
  endShape();
}
function scrollMouth(x, y, col) { noFill(); setStroke(col, LW * 0.9); line(x, y, x + 12, y + 1); scroll(x, y, 3.2, 1, 1); }
function teeth(x0, x1, y, n, col) {
  setStroke(col, DW); setFill(PAPER);
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) rectPath(x0 + i * w + 0.6, y, w - 1.2, 6, 1.5);
}
function triFang(x, y, col, dir) {
  setFill(PAPER); setStroke(col, DW);
  beginShape(); vertex(x - 3, y); vertex(x + 3, y); vertex(x, y + 6 * (dir || 1)); endShape(CLOSE);
}
function concentricOval(cx, cy, w, h, rings, col) {
  noFill(); setStroke(col, DW);
  for (let k = 0; k < rings; k++) ellipse(cx, cy, w * (1 - k * 0.32), h * (1 - k * 0.32));
  setFill(col); noStroke(); circle(cx, cy, Math.min(w, h) * 0.18);
}
function band(x, y, w, h, col, dots) {
  noFill(); setStroke(col, LW * 0.8); rectPath(x, y, w, h, h * 0.45);
  if (dots) { setFill(col); noStroke(); const n = Math.max(3, Math.floor(w / 9)); for (let i = 0; i < n; i++) circle(x + (i + 0.5) * w / n, y + h / 2, 3.2); }
}
function quatrefoil(cx, cy, r, col) {
  noFill(); setStroke(col, DW);
  const d = r * 0.75;
  circle(cx - d, cy, r); circle(cx + d, cy, r); circle(cx, cy - d, r); circle(cx, cy + d, r);
  setFill(PAPER); circle(cx, cy, r * 0.9);
  setFill(col); noStroke(); circle(cx, cy, r * 0.3);
}

// ── 版面文字 ──
function drawTitle(x, y, w, baseNo, count) {
  setFill(INK); noStroke();
  textFont('Georgia'); textStyle(ITALIC); textAlign(CENTER, BASELINE); textSize(19);
  text('Portraits ' + baseNo + 'a–' + (baseNo + Math.floor(count / 3) * 5) + 'm', x + w / 2, y);
  textStyle(NORMAL);
}
function drawLabel(cx, y, s) {
  setFill(INK); noStroke();
  textFont('Georgia'); textStyle(NORMAL); textAlign(CENTER, BASELINE); textSize(11);
  text(s, cx, y);
}
function drawFooter(xr, y) {
  setFill(INK[0], INK[1], INK[2], 160); noStroke();
  textFont('Georgia'); textStyle(ITALIC); textAlign(RIGHT, BASELINE); textSize(10);
  text('© generative · after Thompson', xr, y);
  textStyle(NORMAL);
}
