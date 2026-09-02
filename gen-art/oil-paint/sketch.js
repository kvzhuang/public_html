// ============================================
// Oil Paint — generative impasto
// 弧形 bezier 筆觸 + 鬃毛紋 + 假光影 + 噴濺 + 紙底紋
// ============================================

var rand = fxrand;

// ── Palettes ────────────────────────────────────────────────────────────────
// bg = 紙底；colors = 可用顏料盤
var PALETTES = [
  { name:"Vivid",         w:4, bg:"#EBE4D6", colors:["#1F4FB0","#E97C2A","#F2C13E","#622C8E","#D74E8E","#0D0D0D","#1F2BA6"] },
  { name:"Sunset",        w:4, bg:"#FFF3E6", colors:["#E63946","#F4A261","#F6BD60","#E76F51","#264653","#9D4F2A","#FFEDD8"] },
  { name:"Mediterranean", w:4, bg:"#F3EAD3", colors:["#0077B6","#00B4D8","#FFB703","#FB8500","#023E8A","#D8C18A","#FFF1D6"] },
  { name:"Fauvist",       w:4, bg:"#F4ECDA", colors:["#D62828","#F77F00","#FCBF49","#003049","#588157","#9D0208","#0D0D0D"] },
  { name:"VanGogh",       w:3, bg:"#F2E5C8", colors:["#1B3A5C","#E5B100","#3D7C47","#C04000","#19171A","#4A6E8A","#F8C56A"] },
  { name:"Berry",         w:3, bg:"#F2E6E1", colors:["#6A1B4D","#A4133C","#C9184A","#FFB4A2","#440D26","#3F3A56","#E5989B"] },
  { name:"Ocean",         w:2, bg:"#E8EEF4", colors:["#0B3D8C","#1976D2","#4FC3F7","#0D2A4E","#80DEEA","#F4A261","#FFFFFF"] },
  { name:"Botanical",     w:2, bg:"#F0EDDF", colors:["#264E36","#4A7C59","#9CC4A7","#C8B273","#7B3F00","#1F2F1A","#D9CDB1"] },
  { name:"Earth",         w:1, bg:"#EFE7D4", colors:["#8B4513","#C75B3A","#E0A95F","#3E5E3A","#1F1A14","#7A2E2E","#D8C18A"] },
  { name:"Pastel",        w:1, bg:"#FAF1E4", colors:["#F4ACB7","#9D8189","#A1C181","#FCD5CE","#5E548E","#B5838D","#E8A87C"] },
];

// ── State ───────────────────────────────────────────────────────────────────

var pal;
var sz, cw;
var paperGfx;  // cached canvas-grain background

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  sz = calcSz();
  var cnv = createCanvas(sz, sz);
  cnv.parent("paint-container");
  cw = sz;

  document.getElementById("btn-new").onclick = newPainting;
  document.getElementById("btn-save").onclick = doSave;
  document.getElementById("btn-new").ontouchend = function(e){ e.preventDefault(); newPainting(); };
  document.getElementById("btn-save").ontouchend = function(e){ e.preventDefault(); doSave(); };

  noLoop();
  render();
}

function doSave() {
  saveCanvas("oil-paint-" + Date.now(), "png");
}

function calcSz() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;
  var s = Math.floor(Math.min(availW, availH));
  if (s < 200) s = 200;
  return s;
}

function newPainting() {
  // reseed so each click is fresh
  fxrand = sfc32New();
  rand = fxrand;
  sz = calcSz();
  resizeCanvas(sz, sz);
  cw = sz;
  render();
}

function windowResized() {
  sz = calcSz();
  resizeCanvas(sz, sz);
  cw = sz;
  render();
}

// Re-roll an sfc32 generator from random seeds (used for "New Painting")
function sfc32New() {
  var a = (Math.random()*4294967296) >>> 0;
  var b = (Math.random()*4294967296) >>> 0;
  var c = (Math.random()*4294967296) >>> 0;
  var d = (Math.random()*4294967296) >>> 0;
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    var t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ (b >>> 9);
    b = c + (c << 3) | 0;
    c = (c << 21) | (c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

// ── Render entry ────────────────────────────────────────────────────────────

function pickPalette() {
  var total = 0;
  for (var i = 0; i < PALETTES.length; i++) total += (PALETTES[i].w || 1);
  var r = rand() * total;
  var acc = 0;
  for (var j = 0; j < PALETTES.length; j++) {
    acc += (PALETTES[j].w || 1);
    if (r < acc) return PALETTES[j];
  }
  return PALETTES[0];
}

function render() {
  pal = pickPalette();

  // 防禦：把 p5 繪圖狀態 reset 回乾淨，避免上一輪殘留
  noStroke();
  noFill();
  fill(255);
  resetMatrix();

  drawPaper();

  var nStrokes = 4 + Math.floor(rand() * 3); // 4..6
  var cx = cw / 2 + (rand() - 0.5) * cw * 0.04;
  var cy = cw / 2 + (rand() - 0.5) * cw * 0.04;

  var picked = shuffle(pal.colors.slice()).slice(0, nStrokes);
  var rotOffset = rand() * Math.PI * 2;

  // 輕度模糊：只在筆觸繪製階段套用，紙底纖維與全域噴濺保持銳利
  // 用 drawingContext.filter 自行控制（避開 p5 filter() 的狀態洩漏）
  var hadFilter = false;
  try {
    drawingContext.filter = 'blur(' + Math.max(0.8, cw * 0.0015).toFixed(2) + 'px)';
    hadFilter = true;
  } catch (e) {}

  for (var i = 0; i < nStrokes; i++) {
    var ang = rotOffset + (i / nStrokes) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    paintRadialStroke(cx, cy, ang, picked[i % picked.length], i, nStrokes);
  }

  if (rand() < 0.85) {
    var blackAng = rotOffset + rand() * Math.PI * 2;
    var blackColor = pal.colors.indexOf("#0D0D0D") >= 0 ? "#0D0D0D" : darkestOf(pal.colors);
    paintRadialStroke(cx, cy, blackAng, blackColor, -1, nStrokes, cw * (0.18 + rand() * 0.08));
  }

  // 解除模糊，後續繪圖保持銳利
  if (hadFilter) {
    try { drawingContext.filter = 'none'; } catch (e) {}
  }

  globalSplatter(cx, cy, picked);
}

function globalSplatter(cx, cy, palCols) {
  var n = Math.floor(80 + rand() * 60);
  for (var i = 0; i < n; i++) {
    var hex = palCols[Math.floor(rand() * palCols.length)];
    var rgb = hexRGB(hex);
    var ang = rand() * Math.PI * 2;
    var dist = cw * (0.10 + Math.pow(rand(), 1.6) * 0.35);
    var x = cx + Math.cos(ang) * dist + (rand() - 0.5) * cw * 0.08;
    var y = cy + Math.sin(ang) * dist + (rand() - 0.5) * cw * 0.08;
    if (x < 0 || x > cw || y < 0 || y > cw) continue;
    var r = cw * 0.005 * Math.pow(rand(), 1.7);
    var rotAng = rand() * Math.PI * 2;
    splat(x, y, r * (0.8 + rand() * 0.9), r * (0.35 + rand() * 0.45), rotAng, rgb, 200);
    if (rand() < 0.10) {
      var dir = rand() * Math.PI * 2;
      var len = r * (2 + rand() * 2.5);
      splat(x + Math.cos(dir) * len * 0.5, y + Math.sin(dir) * len * 0.5, len, r * 0.45, dir, rgb, 200);
    }
  }
}

// ── Paper background with subtle grain ─────────────────────────────────────

function drawPaper() {
  background(pal.bg);

  var bgRGB = hexRGB(pal.bg);

  // 加密紙底顆粒（密度翻倍）
  noStroke();
  var grainAlpha = 22;
  var grainCount = Math.floor(cw * cw * 0.005);
  for (var i = 0; i < grainCount; i++) {
    var gx = rand() * cw;
    var gy = rand() * cw;
    var t = (rand() - 0.5) * 35;
    fill(clamp(bgRGB[0]+t), clamp(bgRGB[1]+t), clamp(bgRGB[2]+t), grainAlpha);
    rect(gx, gy, 1, 1);
  }

  // 加一層極淡的短橫線（紙張纖維紋）
  strokeWeight(0.6);
  var lineN = Math.floor(cw * 0.6);
  for (var k = 0; k < lineN; k++) {
    var ly = rand() * cw;
    var lx1 = rand() * cw;
    var lx2 = lx1 + cw * (0.02 + rand() * 0.10);
    var dt = (rand() - 0.5) * 25;
    stroke(clamp(bgRGB[0]+dt-10), clamp(bgRGB[1]+dt-10), clamp(bgRGB[2]+dt-10), 14);
    line(lx1, ly, lx2, ly);
  }
  noStroke();
}

// ── Stroke generator ───────────────────────────────────────────────────────

function paintRadialStroke(cx, cy, baseAng, hex, idx, total, overrideLen) {
  // 「短而胖」的筆觸：長度短、寬度寬，更像顏料厚塗一抹
  var innerR = cw * (0.01 + rand() * 0.04);
  var outerR = overrideLen != null ? overrideLen : cw * (0.16 + rand() * 0.10);

  var x1 = cx + Math.cos(baseAng) * innerR;
  var y1 = cy + Math.sin(baseAng) * innerR;
  var x2 = cx + Math.cos(baseAng) * outerR;
  var y2 = cy + Math.sin(baseAng) * outerR;

  // 拉直 bezier — 弧度減小，鬃毛紋會比較像直線而非西瓜紋
  var perpAng = baseAng + Math.PI / 2;
  var curveAmt = (rand() - 0.5) * cw * 0.03;
  var cpx = (x1 + x2) / 2 + Math.cos(perpAng) * curveAmt;
  var cpy = (y1 + y2) / 2 + Math.sin(perpAng) * curveAmt;

  var curveAmt2 = (rand() - 0.5) * cw * 0.02;
  var cpx2 = (x1 * 0.7 + x2 * 0.3) + Math.cos(perpAng) * curveAmt2;
  var cpy2 = (y1 * 0.7 + y2 * 0.3) + Math.sin(perpAng) * curveAmt2;

  var width = cw * (0.13 + rand() * 0.06);
  if (idx === -1) width *= 0.65; // black accent thinner

  var stroke = { x1:x1, y1:y1, x2:x2, y2:y2, cpx1:cpx2, cpy1:cpy2, cpx2:cpx, cpy2:cpy, width:width, color:hex };
  renderImpastoStroke(stroke);
}

// Sample a cubic bezier
function bezPt(s, t) {
  var u = 1 - t;
  var x = u*u*u*s.x1 + 3*u*u*t*s.cpx1 + 3*u*t*t*s.cpx2 + t*t*t*s.x2;
  var y = u*u*u*s.y1 + 3*u*u*t*s.cpy1 + 3*u*t*t*s.cpy2 + t*t*t*s.y2;
  return { x:x, y:y };
}

function renderImpastoStroke(s) {
  var N = 50;
  var samples = [];
  var perps = [];
  var i;

  for (i = 0; i <= N; i++) {
    var t = i / N;
    samples.push(bezPt(s, t));
  }
  for (i = 0; i <= N; i++) {
    var prev = samples[Math.max(0, i - 1)];
    var next = samples[Math.min(N, i + 1)];
    var dx = next.x - prev.x;
    var dy = next.y - prev.y;
    var len = Math.hypot(dx, dy) || 1;
    perps.push({ x: -dy / len, y: dx / len });
  }

  var col = hexRGB(s.color);

  // 方頭起筆、漸窄收筆 — 不對稱才有方向感
  // 0..0.08: 從 ~60% 升到 95%（圓潤的方頭，不是刀切）
  // 0.08..0.7: 平台保持 ~95% 寬度
  // 0.7..1.0: 緩降到 ~40% 寬度（收筆漸提）
  var widthAt = function(t) {
    var u = Math.max(0.001, Math.min(0.999, t));
    var startRamp = u < 0.08 ? 0.62 + 0.40 * (u / 0.08) : 1;
    if (startRamp > 1) startRamp = 1;
    var endTaper = u < 0.7 ? 1 : 1 - Math.pow((u - 0.7) / 0.3, 1.1) * 0.58;
    return s.width * 0.95 * startRamp * Math.max(0.30, endTaper);
  };

  var edgeJ = Math.max(1.5, s.width * 0.05);

  // (1) Drop shadow polygon — 偏移下右
  noStroke();
  fill(15, 15, 15, 75);
  drawSlab(samples, perps, widthAt, cw * 0.010, cw * 0.014, edgeJ);

  // (2) Dark under-paint — 邊緣陰影襯底
  var lo = darken(col, 0.28);
  fill(lo[0], lo[1], lo[2], 255);
  drawSlab(samples, perps, function(t){ return widthAt(t) * 1.02; }, 0, 0, edgeJ);

  // (3) Body — 主色 polygon，邊緣 jagged
  var jc = jitter(col, 0.05);
  fill(jc[0], jc[1], jc[2], 255);
  drawSlab(samples, perps, function(t){ return widthAt(t) * 0.92; }, 0, 0, edgeJ * 0.9);

  // (4) Bristle striations — 真的細線，每條沿筆觸方向走
  var bristleCount = Math.max(8, Math.floor(s.width / (cw * 0.008)));
  for (var b = 0; b < bristleCount; b++) {
    var offFrac = (b + 0.5) / bristleCount - 0.5; // -0.5..+0.5
    drawBristleLine(samples, perps, offFrac, col, widthAt);
  }

  // (5) Highlight rim — 一側細亮線
  var hi = lighten(col, 0.55);
  drawRimLine(samples, perps, 0.36, hi, 215, widthAt, cw * 0.0045);

  // (6) Deep shadow rim — 另一側細暗線
  var deep = darken(col, 0.55);
  drawRimLine(samples, perps, -0.40, deep, 185, widthAt, cw * 0.0040);

  // (6.5) 中央亮帶 — 顏料隆起的反光帶，往 highlight 那一側微偏
  drawCenterBand(samples, perps, col, widthAt);

  // (7) Edge flecks — 邊緣散出的小屑
  edgeFlecks(samples, perps, col, s.width, widthAt);

  // (8) End splatter — 兩端噴濺
  splatterAt(samples[N], col, s.width, 10);
  splatterAt(samples[0], col, s.width, 5);
}

// 用 beginShape/endShape 畫一個沿 path 的「板狀」polygon，兩端用半圓帽收尾
function drawSlab(samples, perps, widthFn, ox, oy, edgeJ) {
  var N = samples.length - 1;
  var i, w;
  var capSteps = 8;

  beginShape();
  // 上側：i=0 → N
  for (i = 0; i <= N; i++) {
    w = widthFn(i / N) * 0.5;
    vertex(
      samples[i].x + perps[i].x * w + (rand() - 0.5) * edgeJ + ox,
      samples[i].y + perps[i].y * w + (rand() - 0.5) * edgeJ + oy
    );
  }
  // 末端半圓帽（從上端繞外側到下端，往切線前向凸出）
  var rE = widthFn(1) * 0.5;
  var pE = perps[N];
  var tE = { x: pE.y, y: -pE.x };  // tangent forward
  for (var c = 1; c < capSteps; c++) {
    var th = (c / capSteps) * Math.PI;
    var ct = Math.cos(th), st = Math.sin(th);
    vertex(
      samples[N].x + rE * (pE.x * ct + tE.x * st) + ox,
      samples[N].y + rE * (pE.y * ct + tE.y * st) + oy
    );
  }
  // 下側：i=N → 0
  for (i = N; i >= 0; i--) {
    w = widthFn(i / N) * 0.5;
    vertex(
      samples[i].x - perps[i].x * w + (rand() - 0.5) * edgeJ + ox,
      samples[i].y - perps[i].y * w + (rand() - 0.5) * edgeJ + oy
    );
  }
  // 起端半圓帽（從下端繞外側到上端，往切線後向凸出 — 方頭也圓潤）
  var rS = widthFn(0) * 0.5;
  var pS = perps[0];
  var tS = { x: pS.y, y: -pS.x };
  for (var c2 = 1; c2 < capSteps; c2++) {
    var th2 = (c2 / capSteps) * Math.PI;
    var ct2 = Math.cos(th2), st2 = Math.sin(th2);
    vertex(
      samples[0].x + rS * (-pS.x * ct2 - tS.x * st2) + ox,
      samples[0].y + rS * (-pS.y * ct2 - tS.y * st2) + oy
    );
  }
  endShape(CLOSE);
}

function drawBristleLine(samples, perps, offFrac, baseCol, widthFn) {
  var N = samples.length - 1;
  var jc = jitter(baseCol, 0.14);
  // 上側偏亮、下側偏暗
  var blend = Math.max(-1, Math.min(1, -offFrac * 2));
  jc = mixRGB(jc, blend > 0 ? lighten(baseCol, 0.45) : darken(baseCol, 0.45), Math.abs(blend) * 0.4);

  // 每根鬃毛獨立變化：alpha、粗細、額外側向 wobble
  var alpha = 190 + Math.floor(rand() * 50);
  var wt = cw * 0.0030 * (0.75 + rand() * 0.6);
  var wobble = (rand() - 0.5) * 0.08; // 額外 ±4% 寬度的側向漂移

  noFill();
  stroke(jc[0], jc[1], jc[2], alpha);
  strokeWeight(Math.max(0.8, wt));
  strokeCap(ROUND);

  // 隨機中斷：用多段 beginShape/endShape 模擬斷續鬃毛
  var inShape = false;
  var skipUntil = -1;
  for (var i = 0; i <= N; i++) {
    if (i <= skipUntil) continue;
    var t = i / N;
    // 中段 15-85% 有 0.7% 機率斷裂
    if (t > 0.15 && t < 0.85 && rand() < 0.007) {
      if (inShape) { endShape(); inShape = false; }
      skipUntil = i + 2 + Math.floor(rand() * 4);
      continue;
    }
    var w = widthFn(t);
    var off = (offFrac + wobble) * w * 0.78;
    var jx = (rand() - 0.5) * w * 0.07;
    var jy = (rand() - 0.5) * w * 0.07;
    if (!inShape) { beginShape(); inShape = true; }
    vertex(samples[i].x + perps[i].x * off + jx, samples[i].y + perps[i].y * off + jy);
  }
  if (inShape) endShape();
}

function drawRimLine(samples, perps, offFrac, col, alpha, widthFn, weight) {
  var N = samples.length - 1;
  noFill();
  stroke(col[0], col[1], col[2], alpha);
  strokeWeight(Math.max(1.2, weight));
  strokeCap(ROUND);
  beginShape();
  for (var i = 4; i <= N - 4; i++) {
    var t = i / N;
    var w = widthFn(t);
    var off = offFrac * w;
    vertex(samples[i].x + perps[i].x * off, samples[i].y + perps[i].y * off);
  }
  endShape();
}

// 中央亮帶：模擬顏料隆起時中央那條最亮的反光，是「立體感」最有效的單一技巧
function drawCenterBand(samples, perps, baseCol, widthFn) {
  var N = samples.length - 1;
  var bandCol = lighten(baseCol, 0.42);
  noFill();
  stroke(bandCol[0], bandCol[1], bandCol[2], 195);
  strokeWeight(Math.max(1.5, cw * 0.0055));
  strokeCap(ROUND);
  beginShape();
  // 從 8% 開始、92% 結束，避開兩端的半圓帽
  var iStart = Math.floor(N * 0.08);
  var iEnd = Math.floor(N * 0.92);
  for (var i = iStart; i <= iEnd; i++) {
    var t = i / N;
    var w = widthFn(t);
    // 微偏向 highlight 那一側（+perp 方向偏移 8%），呼應 rim
    var off = w * 0.08;
    var jx = (rand() - 0.5) * w * 0.04;
    var jy = (rand() - 0.5) * w * 0.04;
    vertex(samples[i].x + perps[i].x * off + jx, samples[i].y + perps[i].y * off + jy);
  }
  endShape();
}

function edgeFlecks(samples, perps, col, baseW, widthFn) {
  var N = samples.length - 1;
  noStroke();
  for (var i = 1; i < N; i += 1) {
    if (rand() > 0.35) continue;
    var t = i / N;
    var w = widthFn(t);
    var side = rand() < 0.5 ? 1 : -1;
    var off = w * 0.5 * (1 + rand() * 0.4) * side;
    var jx = (rand() - 0.5) * w * 0.25;
    var jy = (rand() - 0.5) * w * 0.25;
    var x = samples[i].x + perps[i].x * off + jx;
    var y = samples[i].y + perps[i].y * off + jy;
    var r = baseW * 0.08 * Math.pow(rand(), 1.5);
    splat(x, y, r * (0.7 + rand()*0.7), r * (0.3 + rand()*0.45), rand() * Math.PI * 2, col, 220);
  }
}

// 旋轉橢圓「顏料漬」：寬高比/角度都隨機，看起來像潑出
function splat(x, y, w, h, ang, col, alpha) {
  push();
  translate(x, y);
  rotate(ang);
  noStroke();
  fill(col[0], col[1], col[2], alpha);
  ellipse(0, 0, Math.max(0.5, w), Math.max(0.4, h));
  pop();
}

function splatterAt(p, col, baseW, count) {
  for (var i = 0; i < count; i++) {
    var ang = rand() * Math.PI * 2;
    var dist = baseW * (0.6 + Math.pow(rand(), 1.5) * 2.6);
    var r = baseW * 0.08 * Math.pow(rand(), 1.6);
    var x = p.x + Math.cos(ang) * dist;
    var y = p.y + Math.sin(ang) * dist;
    var rotAng = rand() * Math.PI * 2;
    splat(x, y, r * (0.8 + rand() * 0.9), r * (0.35 + rand() * 0.45), rotAng, col, 200);
    // 偶爾畫一條拉長的飛濺（長度上限收緊，避免變鉛筆刮屑）
    if (rand() < 0.18) {
      var dir = rand() * Math.PI * 2;
      var len = r * (1.5 + rand() * 2);
      splat(x + Math.cos(dir) * len * 0.5, y + Math.sin(dir) * len * 0.5, len, r * 0.4, dir, col, 200);
    }
  }
}

// ── Color helpers ───────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function lighten(rgb, t) {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * t),
    Math.round(rgb[1] + (255 - rgb[1]) * t),
    Math.round(rgb[2] + (255 - rgb[2]) * t)
  ];
}

function darken(rgb, t) {
  return [
    Math.round(rgb[0] * (1 - t)),
    Math.round(rgb[1] * (1 - t)),
    Math.round(rgb[2] * (1 - t))
  ];
}

function mixRGB(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function jitter(rgb, amt) {
  var d = function(){ return (rand() - 0.5) * 2 * amt * 255; };
  return [clamp(rgb[0] + d()), clamp(rgb[1] + d()), clamp(rgb[2] + d())];
}

function clamp(x) { return Math.max(0, Math.min(255, Math.round(x))); }

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function darkestOf(hexes) {
  var best = hexes[0], bestL = 9999;
  for (var i = 0; i < hexes.length; i++) {
    var r = hexRGB(hexes[i]);
    var l = r[0] + r[1] + r[2];
    if (l < bestL) { bestL = l; best = hexes[i]; }
  }
  return best;
}

function keyPressed() {
  if (key === " ") newPainting();
  if (key === "s" || key === "S") doSave();
}
