// =============================================================================
// Neko — 自動養貓 gen-art
// 移植自 ESP32-2432S028 (CYD) 上的 neko.ino，擴張成生成藝術版本。
// 2~4 隻隨機毛色像素貓、寬廣房間、自動互動、日夜循環。
// =============================================================================

// ── Canvas / Layout ─────────────────────────────────────
var W = 960, H = 540;
var ROOM_W = 1400;
var FLOOR_Y;
var SCALE = 1;

// ── Speed / Zoom ────────────────────────────────────────
var speedIdx = 1;
var SPEEDS = [0.5, 1, 2, 4];
var zoomIdx = 0;
var ZOOMS = [1, 1.5, 2];

// ── Camera ──────────────────────────────────────────────
var camX = 0;
var camFollow = 0;
var nextCamSwitch = 0;
function sx(wx) { return wx - camX; }

// ── World seed (URL ?seed= or random) ───────────────────
var worldSeed = 0;
function rng() {
  worldSeed = (worldSeed * 9301 + 49297) % 233280;
  return worldSeed / 233280;
}
function rngRange(lo, hi) { return lo + rng() * (hi - lo); }
function rngInt(lo, hi) { return Math.floor(rngRange(lo, hi + 1)); }
function rngPick(arr) { return arr[Math.floor(rng() * arr.length)]; }

// ── Day cycle ───────────────────────────────────────────
var DAY_CYCLE = 3600;
var frame = 0;
var dayPhase = 0;

// ── Window / Curtains ───────────────────────────────────
var winX = 110, winY = 50, winW = 130, winH = 110;
var clouds = [];
var curtainOpen = true, curtainAnim = 1.0;

// ── Lamp ────────────────────────────────────────────────
var lampOn = true;

// ── Resources ───────────────────────────────────────────
var FOOD_MAX = 6, LITTER_MAX = 5;
var foodLevel = FOOD_MAX, waterLevel = FOOD_MAX;
var litterDirty = 0;
var happiness = 80;

// ── Furniture positions (set in buildRoom) ──────────────
var fx = {};

// ── Platforms ───────────────────────────────────────────
var plats = [];
var jumpRoutes = [];

// ── Cats ────────────────────────────────────────────────
var cats = [];
var NUM_CATS = 3;

// ── Effects ─────────────────────────────────────────────
var hearts = [], notifs = [], pourP = [], zzzPool = [];
var MAX_HEARTS = 12, MAX_NOTIF = 8, MAX_POUR = 16;

// ── Colors ──────────────────────────────────────────────
var C = {
  wall:    '#f0e6d5',
  wallDk:  '#d8c8b0',
  floor:   '#b89968',
  floorDk: '#8c6f48',
  floorLt: '#c8a878',
};

// ── Auto interaction ────────────────────────────────────
var lastUserInteract = 0;
var nextAutoAct = 0;

// ============================================================================
// Cat colour schemes
// ============================================================================
var COAT_TYPES = [
  // tabby (棕虎斑)
  { name: 'tabby',   body: '#bd8a55', dark: '#956a3b', belly: '#d8a878',
    eye: '#3a8c3a', earIn: '#f0867c', nose: '#f0867c', stripes: true },
  // calico (三花)
  { name: 'calico',  body: '#fef6e8', dark: '#d5c8b0', belly: '#ffffff',
    eye: '#2a8acf', earIn: '#f0867c', nose: '#f0867c',
    patchA: '#f5a040', patchB: '#403030' },
  // black (純黑)
  { name: 'black',   body: '#2a2730', dark: '#1a1820', belly: '#403745',
    eye: '#f5c948', earIn: '#a04848', nose: '#202020' },
  // white (純白)
  { name: 'white',   body: '#f8f4ec', dark: '#d8d0c0', belly: '#ffffff',
    eye: '#54a0d0', earIn: '#f0867c', nose: '#e8a098' },
  // grey (灰)
  { name: 'grey',    body: '#8a8a92', dark: '#5a5a64', belly: '#b8b8c0',
    eye: '#f0c040', earIn: '#e0807c', nose: '#5a3a3a', stripes: true },
  // orange (橘子)
  { name: 'orange',  body: '#e89048', dark: '#b86820', belly: '#f8c890',
    eye: '#5a9a3a', earIn: '#f0867c', nose: '#c04848', stripes: true },
  // siamese (暹羅)
  { name: 'siamese', body: '#e8dcc0', dark: '#5a3a30', belly: '#f0e8d0',
    eye: '#4090e0', earIn: '#e8807c', nose: '#403028' },
  // tuxedo (賓士)
  { name: 'tuxedo',  body: '#1a1820', dark: '#0a0810', belly: '#ffffff',
    eye: '#48c848', earIn: '#a04848', nose: '#101010' }
];

// ============================================================================
// Build room layout
// ============================================================================
function buildRoom() {
  ROOM_W = rngInt(1200, 1700);
  FLOOR_Y = Math.floor(H * 0.78);

  // Furniture positions (procedurally placed across the room)
  fx = {};
  fx.bookshelf = rngInt(20, 60);
  fx.plant1    = fx.bookshelf + rngInt(140, 200);
  fx.bed       = fx.plant1    + rngInt(40, 80);
  fx.sofa      = fx.bed       + rngInt(110, 160);
  fx.clock     = fx.sofa      + rngInt(60, 100);
  fx.desk      = fx.clock     + rngInt(40, 80);
  fx.bowls     = fx.desk      + rngInt(110, 150);
  fx.fishtank  = fx.bowls     + rngInt(50, 90);
  fx.tree      = fx.fishtank  + rngInt(60, 120);
  fx.litter    = fx.tree      + rngInt(70, 110);
  // Ensure litter stays inside ROOM_W
  if (fx.litter > ROOM_W - 50) fx.litter = ROOM_W - 50;

  // Optional second plant near the right end
  fx.plant2 = (fx.litter > ROOM_W - 120) ? -1 : rngInt(ROOM_W - 100, ROOM_W - 60);

  // Wall shelves
  fx.wshelf1X = fx.desk + rngInt(0, 30);
  fx.wshelf1Y = rngInt(190, 230);
  fx.wshelf1W = rngInt(70, 100);
  fx.wshelf2X = fx.wshelf1X + rngInt(100, 160);
  fx.wshelf2Y = rngInt(130, 170);
  fx.wshelf2W = rngInt(70, 110);

  // Y heights
  fx.bedY      = FLOOR_Y - 10;
  fx.deskY     = FLOOR_Y - 110;
  fx.sofaY     = FLOOR_Y - 30;
  fx.bowlY     = FLOOR_Y - 8;
  fx.litterY   = FLOOR_Y - 14;
  fx.treeBase  = FLOOR_Y - 6;
  fx.treeMid   = FLOOR_Y - 90;
  fx.treeTop   = FLOOR_Y - 170;

  // Clouds
  clouds = [];
  for (var i = 0; i < 4; i++) clouds.push({ x: rng() * winW, y: 12 + rng() * (winH - 30) });

  // Build platforms — index meaning:
  // 0=floor, 1=desk, 2=wshelf1, 3=wshelf2, 4=tree-mid, 5=tree-top,
  // 6=sofa, 7=bed
  plats = [
    { y: FLOOR_Y,        x1: 8,             x2: ROOM_W - 8 },
    { y: fx.deskY - 4,   x1: fx.desk - 6,   x2: fx.desk + 70 },
    { y: fx.wshelf1Y - 4, x1: fx.wshelf1X,  x2: fx.wshelf1X + fx.wshelf1W },
    { y: fx.wshelf2Y - 4, x1: fx.wshelf2X,  x2: fx.wshelf2X + fx.wshelf2W },
    { y: fx.treeMid - 4, x1: fx.tree - 8,   x2: fx.tree + 50 },
    { y: fx.treeTop - 4, x1: fx.tree - 14,  x2: fx.tree + 58 },
    { y: fx.sofaY - 4,   x1: fx.sofa - 6,   x2: fx.sofa + 70 },
    { y: fx.bedY + 2,    x1: fx.bed - 6,    x2: fx.bed + 50 }
  ];

  // Jump routes (bidirectional pairs)
  function addJump(a, b, axw, bxw) {
    jumpRoutes.push({ from: a, to: b, fromX: axw, toX: bxw });
    jumpRoutes.push({ from: b, to: a, fromX: bxw, toX: axw });
  }
  jumpRoutes = [];
  addJump(0, 1, fx.desk + 10, fx.desk + 10);
  addJump(0, 4, fx.tree + 10, fx.tree + 10);
  addJump(4, 5, fx.tree + 15, fx.tree + 15);
  addJump(1, 2, fx.desk + 40, fx.wshelf1X + 20);
  addJump(2, 3, fx.wshelf1X + fx.wshelf1W - 8, fx.wshelf2X + 12);
  addJump(0, 6, fx.sofa + 25, fx.sofa + 25);
  addJump(6, 1, fx.sofa + 60, fx.desk + 5);
  addJump(0, 7, fx.bed + 12, fx.bed + 12);
  // Floor at bookshelf -- side decoration only, no jump

  // Window placement: near left, above bookshelf area
  winX = fx.bookshelf + 60 + rngInt(0, 30);
  winY = 40 + rngInt(0, 20);
  winW = rngInt(110, 150);
  winH = rngInt(100, 130);
}

// ============================================================================
// Spawn cats
// ============================================================================
function spawnCats() {
  NUM_CATS = rngInt(2, 4);
  cats = [];
  var picks = [];
  // Pick distinct coats
  var pool = COAT_TYPES.slice();
  for (var i = 0; i < NUM_CATS; i++) {
    if (pool.length === 0) pool = COAT_TYPES.slice();
    var idx = Math.floor(rng() * pool.length);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  for (var i = 0; i < NUM_CATS; i++) {
    var x = (ROOM_W / (NUM_CATS + 1)) * (i + 1);
    cats.push({
      coat: picks[i],
      seed: rngInt(0, 9999),
      state: 'idle',
      x: x, y: FLOOR_Y,
      targetX: x, destX: x, destPlatform: 0,
      dir: (rng() < 0.5) ? 1 : -1,
      anim: 0, platform: 0,
      stateEndTime: 0,
      jSX: 0, jSY: 0, jEX: 0, jEY: 0, jProg: 0, jTPlat: 0,
      purrT: 0, angryT: 0,
      interactCooldown: 0
    });
  }
  camFollow = 0;
  nextCamSwitch = millis() + 8000 + rng() * 8000;
}

// ============================================================================
// Color utils
// ============================================================================
function dimC(hex, amb) {
  var c = color(hex);
  return color(red(c) * amb, green(c) * amb, blue(c) * amb);
}
function lerpHex(a, b, t) {
  return lerpColor(color(a), color(b), constrain(t, 0, 1));
}

function getAmbient() {
  var p = dayPhase, b;
  if (p < 0.2) b = 0.35;
  else if (p < 0.3) b = 0.35 + (p - 0.2) * 6.5;
  else if (p < 0.7) b = 1.0;
  else if (p < 0.8) b = 1.0 - (p - 0.7) * 6.5;
  else b = 0.35;
  if (lampOn && b < 0.7) b = max(b, 0.55);
  if (!curtainOpen && b > 0.6) b *= 0.78;
  return b;
}

function getSkyColor() {
  var p = dayPhase;
  if (p < 0.2)   return color('#0a1030');
  if (p < 0.28)  return lerpHex('#0a1030', '#f8a060', (p - 0.2) / 0.08);
  if (p < 0.35)  return lerpHex('#f8a060', '#5cb0e8', (p - 0.28) / 0.07);
  if (p < 0.65)  return color('#5cb0e8');
  if (p < 0.72)  return lerpHex('#5cb0e8', '#f8a060', (p - 0.65) / 0.07);
  if (p < 0.8)   return lerpHex('#f8a060', '#0a1030', (p - 0.72) / 0.08);
  return color('#0a1030');
}

// ============================================================================
// Effects
// ============================================================================
function spawnNotif(x, y, text, col) {
  if (notifs.length >= MAX_NOTIF) notifs.shift();
  notifs.push({ x: x, y: y, life: 50, text: text, color: col });
}
function spawnHeart(x, y) {
  if (hearts.length >= MAX_HEARTS) hearts.shift();
  hearts.push({ x: x + random(-8, 8), y: y - 20, vy: -0.8 - random(0.5), life: 36 });
}
function spawnPour(x, y, col) {
  if (pourP.length >= MAX_POUR) pourP.shift();
  pourP.push({ x: x + random(-3, 3), y: y, vy: 1.6 + random(1), life: 14, color: col });
}
function spawnZzz(catIdx, x, y) {
  zzzPool.push({ catIdx: catIdx, x: x, y: y, life: 28 });
}

// ============================================================================
// Draw: Room
// ============================================================================
function drawRoom(amb) {
  var wall   = dimC(C.wall, amb);
  var wallDk = dimC(C.wallDk, amb);
  var fl     = dimC(C.floor, amb);
  var flDk   = dimC(C.floorDk, amb);
  noStroke();
  fill(wall);   rect(0, 0, W, FLOOR_Y);
  fill(fl);     rect(0, FLOOR_Y, W, H - FLOOR_Y);
  // Floor lines
  stroke(flDk); strokeWeight(1);
  for (var y = FLOOR_Y + 8; y < H; y += 12) line(0, y, W, y);
  // Vertical floor seams
  var ix = Math.floor(camX / 80) * 80;
  for (var x = ix; x < camX + W + 80; x += 80) {
    var sxv = sx(x);
    line(sxv, FLOOR_Y, sxv, H);
  }
  noStroke();
  // Skirting
  fill(dimC('#7a5a30', amb));
  rect(0, FLOOR_Y - 4, W, 4);
  // Wall trim
  stroke(wallDk); strokeWeight(1);
  line(0, FLOOR_Y - 100, W, FLOOR_Y - 100);
  // Wall panels
  noFill();
  var px = Math.floor(camX / 60) * 60;
  for (var x = px; x < camX + W + 60; x += 60) {
    var sxv = sx(x); if (sxv > -50 && sxv < W + 10)
      rect(sxv + 2, FLOOR_Y - 98, 56, 88);
  }
  noStroke();
}

// ============================================================================
// Draw: Window
// ============================================================================
function drawWindow(amb) {
  var wx = sx(winX);
  if (wx > W + 10 || wx + winW + 20 < -10) return;
  var sky = getSkyColor();
  if (curtainOpen  && curtainAnim < 1) curtainAnim = min(curtainAnim + 0.03, 1);
  if (!curtainOpen && curtainAnim > 0) curtainAnim = max(curtainAnim - 0.03, 0);

  // Frame outer
  noStroke();
  fill(dimC('#ffffff', amb));
  rect(wx - 4, winY - 4, winW + 8, winH + 8);
  // Sky
  fill(sky);
  rect(wx, winY, winW, winH);

  var p = dayPhase;
  // Sun / Moon
  if (p > 0.25 && p < 0.75) {
    var sp = (p - 0.25) / 0.5;
    var sxn = wx + 15 + sp * (winW - 30);
    var syn = winY + 15 + sin(sp * PI) * -18 + 35;
    fill(255, 230, 80);
    circle(sxn, syn, 18);
    for (var a = 0; a < 8; a++) {
      var an = a * PI / 4 + frame * 0.02;
      stroke(255, 240, 120, 200);
      strokeWeight(2);
      line(sxn, syn, sxn + cos(an) * 16, syn + sin(an) * 16);
    }
    noStroke();
  } else {
    var mp = (p >= 0.75) ? (p - 0.75) / 0.5 : (p + 0.25) / 0.5;
    var mxn = wx + 18 + mp * (winW - 36);
    var myn = winY + 25;
    fill(240, 240, 220);
    circle(mxn, myn, 14);
    fill(sky);
    circle(mxn + 4, myn - 3, 11);
    // Stars
    if (getAmbient() < 0.6) {
      fill(255);
      for (var i = 0; i < 5; i++) {
        var sx2 = wx + 10 + ((i * 31 + worldSeed) % (winW - 20));
        var sy2 = winY + 10 + ((i * 23 + worldSeed) % 30);
        rect(sx2, sy2, 1.5, 1.5);
      }
    }
  }

  // Clouds (drift)
  var cc = lerpColor(sky, color(255), 0.5);
  fill(cc);
  for (var i = 0; i < clouds.length; i++) {
    var cx = wx + clouds[i].x, cy = winY + clouds[i].y;
    if (cx + 30 > wx && cx < wx + winW) {
      // Clip ovals against window manually
      var w1 = constrain(cx + 30, wx, wx + winW) - max(cx, wx);
      var x1 = max(cx, wx);
      if (w1 > 0) rect(x1, cy, w1, 8, 4);
      var tx = cx + 8, ty = cy - 5;
      var w2 = constrain(tx + 18, wx, wx + winW) - max(tx, wx);
      var x2 = max(tx, wx);
      if (w2 > 0) rect(x2, ty, w2, 8, 4);
    }
  }

  // Cross frame
  fill(dimC('#ffffff', amb));
  rect(wx + winW / 2 - 1.5, winY, 3, winH);
  rect(wx, winY + winH / 2 - 1.5, winW, 3);
  // Sill
  fill(dimC('#9aa090', amb));
  rect(wx - 12, winY - 10, winW + 24, 4);

  // Curtains
  var ct = dimC('#f4b878', amb);
  var ctD = dimC('#d09040', amb);
  var cWopen = 12, cWclose = winW / 2 + 8;
  var cw = cWopen + (cWclose - cWopen) * (1 - curtainAnim);
  // Left curtain
  fill(ct);
  rect(wx - 8, winY - 6, cw, winH + 12);
  fill(ctD);
  rect(wx - 8, winY - 6, 3, winH + 12);
  for (var i = 4; i < cw; i += 8) {
    rect(wx - 8 + i, winY - 4, 1.5, winH + 8);
  }
  // Right curtain
  var rX = wx + winW + 8 - cw;
  fill(ct);
  rect(rX, winY - 6, cw, winH + 12);
  fill(ctD);
  rect(wx + winW + 5, winY - 6, 3, winH + 12);
  for (var i = 3; i < cw; i += 8) {
    rect(rX + i, winY - 4, 1.5, winH + 8);
  }

  // Sunbeam on floor
  if (curtainAnim > 0.3 && dayPhase > 0.3 && dayPhase < 0.7) {
    var ins = 1 - abs(dayPhase - 0.5) / 0.2;
    ins = constrain(ins, 0, 1) * 0.18 * curtainAnim;
    var bm = lerpColor(color(0, 0, 0, 0), color(255, 230, 80, 255 * ins), 1);
    var shift = (dayPhase - 0.3) / 0.4 * 50;
    for (var y = winY + winH; y < FLOOR_Y; y += 2) {
      var r = (y - winY - winH) / (FLOOR_Y - winY - winH);
      fill(red(bm), green(bm), blue(bm), alpha(bm));
      rect(wx + r * shift, y, (winW + r * 40) * curtainAnim, 2);
    }
  }
}

// ============================================================================
// Furniture
// ============================================================================
function drawBookshelf(amb) {
  var x = sx(fx.bookshelf);
  if (x > W + 10 || x + 56 < -10) return;
  var wd = dimC('#7a4a18', amb), lt = dimC('#a8682a', amb);
  fill(wd); rect(x, FLOOR_Y - 150, 56, 150);
  fill(dimC('#d8c0a0', amb)); rect(x + 3, FLOOR_Y - 147, 50, 144);
  var bks = ['#c83030', '#3030c8', '#30a830', '#e8d020', '#c830a8', '#30c8c8', '#a05828'];
  var bi = Math.floor(fx.bookshelf) % 7;
  for (var sy = FLOOR_Y - 122; sy < FLOOR_Y; sy += 36) {
    fill(lt); rect(x, sy, 56, 3);
    for (var b = 0; b < 6; b++) {
      var bw = 6 + ((bi * 7 + b * 13 + worldSeed) % 4);
      var bh = 22 + ((bi * 3 + b * 11 + worldSeed) % 8);
      fill(dimC(bks[(bi + b) % bks.length], amb));
      rect(x + 4 + b * 8, sy - bh, bw, bh);
      bi++;
    }
  }
}

function drawFloorPlant(amb, baseX) {
  var x = sx(baseX);
  if (x > W + 10 || x + 30 < -10) return;
  fill(dimC('#a8682a', amb)); rect(x + 5, FLOOR_Y - 22, 22, 22);
  fill(dimC('#c08040', amb)); rect(x + 3, FLOOR_Y - 24, 26, 4);
  var lf = dimC('#3a8030', amb), lf2 = dimC('#48a040', amb);
  fill(lf);  circle(x + 16, FLOOR_Y - 38, 18);
  fill(lf2); circle(x + 10, FLOOR_Y - 44, 14);
  fill(lf2); circle(x + 22, FLOOR_Y - 42, 14);
  fill(lf);  circle(x + 16, FLOOR_Y - 50, 12);
  stroke(dimC('#3a4020', amb)); strokeWeight(2);
  line(x + 16, FLOOR_Y - 35, x + 16, FLOOR_Y - 24);
  noStroke();
}

function drawSofa(amb) {
  var x = sx(fx.sofa);
  if (x > W + 10 || x + 80 < -10) return;
  var sf = dimC('#5a6878', amb), sfD = dimC('#384858', amb), sfL = dimC('#7888a0', amb);
  fill(sfD); rect(x - 4, fx.sofaY - 30, 78, 18, 5);
  fill(sf);  rect(x - 6, fx.sofaY - 15, 82, 22, 7);
  fill(sfL); rect(x + 2, fx.sofaY - 13, 32, 12, 4);
  fill(sfL); rect(x + 38, fx.sofaY - 13, 32, 12, 4);
  fill(sfD); rect(x - 10, fx.sofaY - 22, 10, 28, 4);
  fill(sfD); rect(x + 70, fx.sofaY - 22, 10, 28, 4);
  fill(dimC('#202830', amb));
  rect(x - 4, fx.sofaY + 5, 5, FLOOR_Y - fx.sofaY - 4);
  rect(x + 70, fx.sofaY + 5, 5, FLOOR_Y - fx.sofaY - 4);
  // Cushion
  fill(dimC('#f0b860', amb));
  rect(x + 10, fx.sofaY - 25, 18, 12, 4);
}

function drawDesk(amb) {
  var x = sx(fx.desk);
  if (x > W + 10 || x + 80 < -10) return;
  var dk = dimC('#9a8050', amb), lt = dimC('#b89860', amb);
  // Legs
  fill(dk);
  rect(x + 2, fx.deskY + 4, 5, FLOOR_Y - fx.deskY - 4);
  rect(x + 70, fx.deskY + 4, 5, FLOOR_Y - fx.deskY - 4);
  // Surface
  fill(lt); rect(x - 2, fx.deskY, 80, 6);
  fill(dk); rect(x - 2, fx.deskY + 4, 80, 2);
  // Drawer
  fill(dk); noFill(); stroke(dk); strokeWeight(1);
  rect(x + 12, fx.deskY + 10, 36, 14);
  fill(dimC('#c8c8c8', amb)); noStroke();
  rect(x + 28, fx.deskY + 14, 6, 3);
  // Lamp
  var lx = x + 60, ly = fx.deskY - 2;
  fill(dimC('#88a0b0', amb)); rect(lx, ly - 24, 3, 24);
  fill(dimC('#c8c8c8', amb));
  triangle(lx - 10, ly - 24, lx + 13, ly - 24, lx + 2, ly - 32);
  if (lampOn) {
    fill(255, 240, 80); circle(lx + 2, ly - 22, 4);
    if (getAmbient() < 0.7) {
      fill(255, 240, 80, 40);
      triangle(lx - 18, ly + 8, lx + 22, ly + 8, lx + 2, ly - 22);
    }
  } else {
    fill(dimC('#404040', amb)); circle(lx + 2, ly - 22, 4);
  }
  // Computer monitor
  fill(dimC('#101020', amb)); rect(x + 6, fx.deskY - 22, 28, 20);
  fill(dimC('#3060a0', amb)); rect(x + 8, fx.deskY - 20, 24, 16);
  fill(dimC('#88a0c0', amb)); rect(x + 18, fx.deskY - 2, 4, 2);
  // Mug
  fill(dimC('#88a888', amb)); rect(x + 40, fx.deskY - 10, 10, 8);
  fill(dimC('#3a5030', amb)); ellipse(x + 45, fx.deskY - 10, 10, 3);
}

function drawFishTank(amb) {
  var x = sx(fx.fishtank);
  if (x > W + 10 || x + 50 < -10) return;
  // Stand
  fill(dimC('#88a8b8', amb)); rect(x + 4, FLOOR_Y - 35, 38, 35);
  fill(dimC('#a8c0d0', amb)); rect(x, FLOOR_Y - 38, 46, 4);
  // Glass
  fill(127, 200, 220, 200); rect(x, FLOOR_Y - 80, 46, 46);
  // Water
  fill(dimC('#a0d8ff', amb)); rect(x + 2, FLOOR_Y - 78, 42, 42);
  // Fish 1
  var f1x = x + 22 + sin(frame * 0.06) * 12;
  f1x = constrain(f1x, x + 10, x + 36);
  var fishY = FLOOR_Y - 62;
  fill(dimC('#f0a060', amb));
  circle(f1x, fishY, 8);
  triangle(f1x - 6, fishY, f1x - 3, fishY - 3, f1x - 3, fishY + 3);
  // Fish 2
  var f2x = x + 24 + cos(frame * 0.05) * 10;
  f2x = constrain(f2x, x + 8, x + 38);
  fill(dimC('#e84040', amb));
  circle(f2x, fishY + 12, 6);
  triangle(f2x + 4, fishY + 12, f2x + 6, fishY + 9, f2x + 6, fishY + 15);
  // Gravel + plant
  fill(dimC('#d0b888', amb)); rect(x + 2, FLOOR_Y - 42, 42, 4);
  fill(dimC('#308020', amb)); rect(x + 28, FLOOR_Y - 56, 3, 14);
  fill(dimC('#48a030', amb)); circle(x + 30, FLOOR_Y - 60, 6);
}

function drawCatTree(amb) {
  var x = sx(fx.tree);
  if (x > W + 10 || x + 60 < -10) return;
  var pole = dimC('#bca878', amb), pl = dimC('#8a6a40', amb), pt = dimC('#a08858', amb);
  var cp = dimC('#48a030', amb);
  // Pole
  fill(pole); rect(x + 18, fx.treeTop - 8, 12, fx.treeBase - fx.treeTop + 8);
  for (var y = fx.treeTop; y < fx.treeBase; y += 6) {
    stroke(dimC('#a08858', amb)); strokeWeight(1);
    line(x + 18, y, x + 30, y);
  }
  noStroke();
  // Base platform
  fill(pl); rect(x - 8, fx.treeBase - 4, 60, 6);
  fill(pt); rect(x - 8, fx.treeBase - 6, 60, 4);
  // Mid platform
  fill(pl); rect(x - 4, fx.treeMid - 4, 50, 6);
  fill(pt); rect(x - 4, fx.treeMid - 6, 50, 4);
  fill(cp); rect(x + 4, fx.treeMid - 8, 22, 3);
  // Top platform
  fill(pl); rect(x - 12, fx.treeTop - 4, 64, 6);
  fill(pt); rect(x - 12, fx.treeTop - 6, 64, 4);
  fill(cp); rect(x - 4, fx.treeTop - 8, 32, 3);
  // Dangling toy
  var ts = sin(frame * 0.08) * 6;
  stroke(dimC('#888888', amb)); strokeWeight(1);
  line(x + 46, fx.treeTop - 4, x + 46 + ts, fx.treeTop + 18);
  noStroke();
  fill(dimC('#e83030', amb));
  circle(x + 46 + ts, fx.treeTop + 20, 6);
}

function drawCatBed(amb) {
  var x = sx(fx.bed);
  if (x > W + 10 || x + 60 < -10) return;
  fill(dimC('#a04040', amb));
  rect(x - 6, fx.bedY, 56, 18, 8);
  fill(dimC('#e8c898', amb));
  rect(x - 2, fx.bedY + 3, 48, 12, 6);
  fill(dimC('#f8e4b8', amb));
  rect(x + 6, fx.bedY - 1, 18, 7, 4);
}

function drawBowls(amb) {
  var x = sx(fx.bowls);
  if (x > W + 10 || x + 60 < -10) return;
  // Food bowl
  fill(dimC('#f0a040', amb)); rect(x, fx.bowlY, 22, 10, 5);
  fill(dimC('#f8b860', amb)); rect(x + 2, fx.bowlY + 1, 18, 4, 2);
  if (foodLevel > 0) {
    var fh = foodLevel * 5 / FOOD_MAX;
    fill(dimC('#885020', amb));
    rect(x + 3, fx.bowlY + 6 - fh, 16, fh);
  } else {
    fill(dimC('#404040', amb)); circle(x + 11, fx.bowlY + 6, 1.5);
  }
  // Water bowl
  fill(dimC('#5cb0e8', amb)); rect(x + 30, fx.bowlY, 22, 10, 5);
  fill(dimC('#a0d8f0', amb)); rect(x + 32, fx.bowlY + 1, 18, 4, 2);
  if (waterLevel > 0) {
    var wh = waterLevel * 5 / FOOD_MAX;
    fill(dimC('#48d0e8', amb));
    rect(x + 33, fx.bowlY + 6 - wh, 16, wh);
  }
}

function drawLitterBox(amb) {
  var x = sx(fx.litter);
  if (x > W + 10 || x + 36 < -10) return;
  fill(dimC('#a0a8b0', amb)); rect(x, fx.litterY, 36, 14);
  fill(dimC('#d8c898', amb)); rect(x + 2, fx.litterY + 2, 32, 9);
  fill(dimC('#c0c8d0', amb)); rect(x, fx.litterY, 36, 3);
  fill(dimC('#806030', amb));
  if (litterDirty >= 1) rect(x + 6, fx.litterY + 5, 3, 2);
  if (litterDirty >= 2) rect(x + 16, fx.litterY + 6, 3, 2);
  if (litterDirty >= 3) rect(x + 24, fx.litterY + 4, 3, 3);
  if (litterDirty >= 4) rect(x + 10, fx.litterY + 8, 2, 2);
  // Stink lines
  if (litterDirty >= 4) {
    stroke(dimC('#a0a0a0', amb)); strokeWeight(1);
    line(x + 10, fx.litterY - 5, x + 12, fx.litterY - 10);
    line(x + 20, fx.litterY - 4, x + 18, fx.litterY - 9);
    noStroke();
  }
}

function drawWallShelves(amb) {
  var wd = dimC('#a8884c', amb), tp = dimC('#c0a060', amb);
  var cp = dimC('#48a030', amb), br = dimC('#888888', amb);
  // Shelf 1
  var x1 = sx(fx.wshelf1X);
  if (x1 < W + 10 && x1 + fx.wshelf1W > -10) {
    fill(tp); rect(x1, fx.wshelf1Y, fx.wshelf1W, 4);
    fill(wd); rect(x1, fx.wshelf1Y + 3, fx.wshelf1W, 3);
    fill(cp); rect(x1 + 4, fx.wshelf1Y - 3, fx.wshelf1W - 8, 3);
    fill(br); rect(x1 + 6, fx.wshelf1Y + 6, 3, 12);
    fill(br); rect(x1 + fx.wshelf1W - 9, fx.wshelf1Y + 6, 3, 12);
    fill(dimC('#e84040', amb)); circle(x1 + fx.wshelf1W - 14, fx.wshelf1Y - 5, 5);
  }
  // Shelf 2
  var x2 = sx(fx.wshelf2X);
  if (x2 < W + 10 && x2 + fx.wshelf2W > -10) {
    fill(tp); rect(x2, fx.wshelf2Y, fx.wshelf2W, 4);
    fill(wd); rect(x2, fx.wshelf2Y + 3, fx.wshelf2W, 3);
    fill(cp); rect(x2 + 4, fx.wshelf2Y - 3, fx.wshelf2W - 8, 3);
    fill(br); rect(x2 + 6, fx.wshelf2Y + 6, 3, 12);
    fill(br); rect(x2 + fx.wshelf2W - 9, fx.wshelf2Y + 6, 3, 12);
    fill(dimC('#f0a040', amb));
    rect(x2 + 14, fx.wshelf2Y - 5, 20, 5, 2);
  }
}

function drawWallDecor(amb) {
  // Clock
  var cx = sx(fx.clock), cy = 80;
  if (cx > -20 && cx < W + 20) {
    fill(dimC('#ffffff', amb)); circle(cx, cy, 26);
    noFill(); stroke(dimC('#888888', amb)); strokeWeight(2); circle(cx, cy, 26);
    fill(dimC('#000000', amb)); noStroke();
    for (var i = 0; i < 12; i++) {
      var a = i * PI / 6;
      circle(cx + cos(a) * 11, cy + sin(a) * 11, 1.5);
    }
    // Hands
    var ha = dayPhase * TWO_PI - HALF_PI;
    var ma = dayPhase * 24 * TWO_PI - HALF_PI;
    stroke(dimC('#000000', amb)); strokeWeight(2);
    line(cx, cy, cx + cos(ha) * 7, cy + sin(ha) * 7);
    strokeWeight(1); stroke(dimC('#888888', amb));
    line(cx, cy, cx + cos(ma) * 10, cy + sin(ma) * 10);
    noStroke();
  }
  // Framed picture above bookshelf
  var px = sx(fx.bookshelf + 12);
  if (px > -30 && px < W + 10) {
    fill(dimC('#c8c8c8', amb)); rect(px, 50, 34, 28);
    fill(dimC('#88a0c0', amb)); rect(px + 2, 52, 30, 24);
    fill(dimC('#f0d878', amb)); circle(px + 24, 60, 8);
    fill(dimC('#3a8030', amb)); rect(px + 2, 67, 30, 9);
  }
}

function drawRug(amb) {
  var rugX = (fx.sofa + fx.bowls) / 2 - 40;
  var x = sx(rugX);
  if (x > W + 10 || x + 100 < -10) return;
  fill(dimC('#a04030', amb)); rect(x, FLOOR_Y + 4, 100, 16, 8);
  fill(dimC('#e83030', amb)); rect(x + 4, FLOOR_Y + 5, 92, 14, 6);
  stroke(dimC('#f8d050', amb)); strokeWeight(1);
  line(x + 14, FLOOR_Y + 11, x + 86, FLOOR_Y + 11);
  noStroke();
}

// ============================================================================
// Draw Cat
// ============================================================================
function drawCat(ci, amb) {
  var c = cats[ci];
  var x = sx(c.x), y = c.y, d = c.dir;
  if (x < -40 || x > W + 40) return;

  var t = c.coat;
  var bd = dimC(t.body, amb);
  var dk = dimC(t.dark, amb);
  var bl = dimC(t.belly, amb);
  var ey = dimC(t.eye, amb);
  var ei = dimC(t.earIn, amb);
  var ns = dimC(t.nose, amb);
  var pA = t.patchA ? dimC(t.patchA, amb) : null;
  var pB = t.patchB ? dimC(t.patchB, amb) : null;

  // SLEEP
  if (c.state === 'sleep') {
    fill(bd); rect(x - 12, y - 9, 26, 11, 5);
    fill(dk); rect(x - 10, y - 7, 9, 7, 3);
    fill(bd); circle(x + d * 9, y - 6, 12);
    fill(bd); triangle(x + d * 5, y - 13, x + d * 4, y - 7, x + d * 9, y - 8);
    fill(dk); rect(x - 14, y - 4, 9, 5, 3);
    stroke(ey); strokeWeight(1.5);
    line(x + d * 6, y - 6, x + d * 9, y - 6);
    noStroke();
    if (pA) { fill(pA); rect(x - 9, y - 6, 5, 3); }
    if (pB) { fill(pB); rect(x + 3, y - 7, 3, 3); }
    return;
  }
  // GROOM
  if (c.state === 'groom') {
    fill(bd); rect(x - 7, y - 20, 16, 18, 5);
    fill(bd); rect(x - 5, y - 5, 12, 7);
    fill(bd); circle(x + d * 2, y - 20, 14);
    fill(dk); rect(x - 3, y - 18, 5, 12);
    fill(bd);
    triangle(x + d * 2 - 4, y - 28, x + d * 2 - 2, y - 22, x + d * 2 + 4, y - 24);
    triangle(x + d * 2 + 2, y - 28, x + d * 2, y - 22, x + d * 2 + 5, y - 24);
    fill(bl); rect(x + d * 6, y - 18, 5, 4);
    stroke(ey); strokeWeight(1.5);
    line(x + d * 1, y - 21, x + d * 3, y - 21);
    noStroke();
    if (pA) { fill(pA); rect(x - 4, y - 16, 5, 5); }
    return;
  }
  // EAT
  if (c.state === 'eat') {
    fill(bd); rect(x - 8, y - 16, 18, 14, 5);
    fill(bd); circle(x + d * 11, y - 5, 12);
    fill(bd); triangle(x + d * 9, y - 14, x + d * 8, y - 7, x + d * 12, y - 8);
    fill(bd); rect(x - 4, y - 3, 5, 5); rect(x + 4, y - 3, 5, 5);
    if (pA) { fill(pA); rect(x - 5, y - 14, 5, 5); }
    return;
  }
  // LITTER
  if (c.state === 'litter') {
    fill(bd); rect(x - 8, y - 16, 18, 14, 5);
    fill(bd); circle(x + d * 9, y - 16, 12);
    stroke(ey); strokeWeight(1.5);
    line(x + d * 7, y - 17, x + d * 9, y - 17);
    noStroke();
    var dg = (c.anim / 6) | 0;
    dg = dg % 2;
    fill(bd); rect(x + d * 4, y - 4 + dg, 5, 5 - dg);
    fill(bd); rect(x - d * 3, y - 3, 5, 5);
    if (pA) { fill(pA); rect(x - 5, y - 14, 5, 4); }
    return;
  }
  // STRETCH
  if (c.state === 'stretch') {
    fill(bd); rect(x - 6, y - 20, 16, 10, 4);
    fill(bd); rect(x - 4, y - 14, 14, 8);
    fill(bd); circle(x + d * 12, y - 5, 12);
    stroke(ey); strokeWeight(1.5);
    line(x + d * 9, y - 6, x + d * 11, y - 6);
    noStroke();
    fill(bd); rect(x - 4, y - 3, 5, 5);
    fill(bd); rect(x + d * 6, y - 1, 10, 3);
    stroke(dk); strokeWeight(2);
    line(x - d * 7, y - 19, x - d * 9, y - 30);
    noStroke();
    if (pA) { fill(pA); rect(x - 3, y - 18, 5, 4); }
    if (pB) { fill(pB); rect(x + 3, y - 13, 3, 3); }
    return;
  }
  // JUMP
  if (c.state === 'jump') {
    fill(bd); rect(x - 9, y - 18, 20, 13, 5);
    fill(bl); rect(x - 6, y - 10, 14, 5);
    var hx = x + d * 12, hy = y - 18;
    fill(bd); circle(hx, hy, 14);
    fill(bd);
    triangle(hx - 5, hy - 11, hx - 2, hy - 4, hx + 1, hy - 7);
    triangle(hx + 5, hy - 11, hx + 2, hy - 4, hx - 1, hy - 7);
    fill(ey); rect(hx + d * 2, hy - 2, 2.5, 3);
    fill(ns); rect(hx + d * 5, hy + 1, 2, 2);
    fill(bd); rect(x + d * 4, y - 6, 5, 5);
    fill(bd); rect(x - d * 5, y - 6, 5, 5);
    var tw = sin(frame * 0.2) * 3;
    stroke(dk); strokeWeight(2);
    line(x - d * 10, y - 14, x - d * 18, y - 9 + tw);
    noStroke();
    if (pA) { fill(pA); rect(x - 7, y - 16, 5, 5); }
    if (pB) { fill(pB); rect(x + 1, y - 15, 4, 4); }
    return;
  }
  // SIT_HIGH
  if (c.state === 'sit_high') {
    fill(bd); rect(x - 7, y - 23, 16, 16, 5);
    fill(bd); rect(x - 5, y - 9, 12, 10);
    fill(bl); rect(x - 6, y - 9, 14, 5);
    var hx2 = x + d * 2, hy2 = y - 25;
    fill(bd); circle(hx2, hy2, 13);
    fill(bd);
    triangle(hx2 - 5, hy2 - 10, hx2 - 2, hy2 - 3, hx2 + 1, hy2 - 6);
    triangle(hx2 + 5, hy2 - 10, hx2 + 2, hy2 - 3, hx2 - 1, hy2 - 6);
    fill(ei);
    triangle(hx2 - 4, hy2 - 8, hx2 - 1, hy2 - 4, hx2 + 0, hy2 - 6);
    triangle(hx2 + 4, hy2 - 8, hx2 + 1, hy2 - 4, hx2 + 0, hy2 - 6);
    var ld = (((c.anim / 60) | 0) % 2 === 0) ? 1 : -1;
    fill(ey); rect(hx2 + ld * 3, hy2 - 1, 2.5, 3);
    fill(ns); rect(hx2 + ld * 5, hy2 + 2, 2, 2);
    stroke(dimC('#c8c8c8', amb)); strokeWeight(1);
    line(hx2 + ld * 4, hy2 + 1, hx2 + ld * 9, hy2 + 1);
    noStroke();
    fill(bl); rect(x - 3, y - 1, 6, 3); rect(x + 3, y - 1, 6, 3);
    fill(dk); rect(x - d * 9, y - 4, 9, 4, 2);
    if (c.purrT > 0 && (frame % 6 < 3)) {
      fill(bl); rect(x - 9, y - 16, 2, 2); rect(x + 9, y - 16, 2, 2);
    }
    if (pA) { fill(pA); rect(x - 4, y - 19, 5, 5); }
    if (pB) { fill(pB); rect(x + 2, y - 17, 4, 4); }
    return;
  }

  // Default: idle / walk
  fill(bd); rect(x - 9, y - 18, 20, 13, 5);
  fill(bl); rect(x - 6, y - 10, 14, 5);
  fill(dk); rect(x - 5, y - 17, 4, 7); rect(x + 2, y - 17, 4, 7);
  if (t.stripes) {
    // Tabby stripes
    fill(dk);
    rect(x - 7, y - 16, 14, 2);
    rect(x - 5, y - 12, 10, 2);
  }
  var hx3 = x + d * 12, hy3 = y - 18;
  fill(bd); circle(hx3, hy3, 14);
  fill(bd);
  triangle(hx3 - 5, hy3 - 10, hx3 - 2, hy3 - 4, hx3 + 1, hy3 - 7);
  triangle(hx3 + 5, hy3 - 10, hx3 + 2, hy3 - 4, hx3 - 1, hy3 - 7);
  if (pA && pB) {
    // Calico: orange + dark ears asymmetric
    fill(pA); triangle(hx3 - 4, hy3 - 9, hx3 - 1, hy3 - 4, hx3 + 0, hy3 - 6);
    fill(pB); triangle(hx3 + 4, hy3 - 9, hx3 + 1, hy3 - 4, hx3 + 0, hy3 - 6);
  } else {
    fill(ei);
    triangle(hx3 - 4, hy3 - 9, hx3 - 1, hy3 - 4, hx3 + 0, hy3 - 6);
    triangle(hx3 + 4, hy3 - 9, hx3 + 1, hy3 - 4, hx3 + 0, hy3 - 6);
  }
  // Blink
  if (c.state === 'idle' && c.anim % 80 < 3) {
    stroke(ey); strokeWeight(1.5);
    line(hx3 + d * 1, hy3 - 1, hx3 + d * 3, hy3 - 1);
    noStroke();
  } else {
    fill(ey); rect(hx3 + d * 2, hy3 - 2, 2.5, 3);
    fill(t.stripes ? dimC('#88e088', amb) : dimC('#3060c0', amb));
    rect(hx3 + d * 2 + (d > 0 ? 1 : 0), hy3 - 1, 1, 1);
  }
  fill(ns); rect(hx3 + d * 5, hy3 + 1, 2, 2);
  stroke(dimC('#c8c8c8', amb)); strokeWeight(1);
  line(hx3 + d * 4, hy3, hx3 + d * 10, hy3);
  line(hx3 + d * 4, hy3 + 2, hx3 + d * 10, hy3 + 2);
  noStroke();
  // Legs (walk animation)
  var la = 0;
  if (c.state === 'walk') la = ((c.anim / 4) | 0) % 4;
  var loArr = [0, 2, 0, -2];
  fill(bd);
  rect(x + d * 4, y - 6 + loArr[la], 4, 7 - loArr[la]);
  rect(x - d * 4, y - 6 - loArr[la], 4, 7 + loArr[la]);
  fill(dk);
  rect(x + d * 2, y - 6 + loArr[(la + 2) % 4], 4, 7 - loArr[(la + 2) % 4]);
  rect(x - d * 6, y - 6 - loArr[(la + 2) % 4], 4, 7 + loArr[(la + 2) % 4]);
  // Feet
  fill(bl);
  rect(x + d * 4 - 1, y + 1, 6, 3); rect(x - d * 4 - 1, y + 1, 6, 3);
  // Tail
  var tw2 = sin(frame * 0.1 + ci * 1.5) * 4;
  stroke(dk); strokeWeight(2);
  if (c.state === 'play') {
    line(x - d * 10, y - 15, x - d * 13, y - 26 + tw2);
  } else {
    line(x - d * 10, y - 15, x - d * 16, y - 5 + tw2);
  }
  noStroke();
  // Calico body patches
  if (pA) {
    fill(pA); rect(x - 7, y - 15, 5, 5);
    fill(pA); circle(hx3 - 3, hy3 + 2, 4);
  }
  if (pB) {
    fill(pB); rect(x + 2, y - 14, 4, 4);
  }
  // Angry mark
  if (c.angryT > 0) {
    stroke(dimC('#e83030', amb)); strokeWeight(2);
    var ax = hx3 - d * 3, ay = hy3 - 16;
    line(ax - 4, ay - 4, ax + 4, ay + 4);
    line(ax + 4, ay - 4, ax - 4, ay + 4);
    noStroke();
  }
}

// ============================================================================
// Effects draw
// ============================================================================
function drawEffects(amb) {
  for (var i = 0; i < hearts.length; i++) {
    var h = hearts[i];
    var hx = sx(h.x), hy = h.y;
    var a = (h.life < 8) ? 255 * h.life / 8 : 255;
    fill(232, 48, 48, a);
    circle(hx - 3, hy, 6); circle(hx + 3, hy, 6);
    triangle(hx - 6, hy + 1, hx + 6, hy + 1, hx, hy + 8);
  }
  for (var i = 0; i < pourP.length; i++) {
    var p = pourP[i];
    fill(p.color);
    rect(sx(p.x), p.y, 3, 3);
  }
  for (var i = 0; i < notifs.length; i++) {
    var n = notifs[i];
    var a = (n.life < 12) ? 255 * n.life / 12 : 255;
    var col = color(n.color);
    fill(red(col), green(col), blue(col), a);
    textSize(12); textAlign(CENTER, CENTER);
    text(n.text, sx(n.x), n.y);
  }
  for (var i = 0; i < zzzPool.length; i++) {
    var z = zzzPool[i];
    var a = (z.life < 14) ? 255 * z.life / 14 : 255;
    fill(200, 220, 255, a);
    textSize(11 + (28 - z.life) * 0.2); textAlign(LEFT, TOP);
    text(z.life > 18 ? 'z' : (z.life > 8 ? 'z' : 'Z'),
         sx(z.x) + (28 - z.life) * 0.5, z.y - (28 - z.life) * 0.6);
  }
}

// ============================================================================
// Platform routing
// ============================================================================
function findNextHop(fp, tp) {
  if (fp === tp) return -1;
  for (var i = 0; i < jumpRoutes.length; i++)
    if (jumpRoutes[i].from === fp && jumpRoutes[i].to === tp) return tp;
  for (var i = 0; i < jumpRoutes.length; i++) {
    if (jumpRoutes[i].from !== fp) continue;
    var m = jumpRoutes[i].to;
    for (var j = 0; j < jumpRoutes.length; j++)
      if (jumpRoutes[j].from === m && jumpRoutes[j].to === tp) return m;
  }
  for (var i = 0; i < jumpRoutes.length; i++) {
    if (jumpRoutes[i].from !== fp) continue;
    var m1 = jumpRoutes[i].to;
    for (var j = 0; j < jumpRoutes.length; j++) {
      if (jumpRoutes[j].from !== m1) continue;
      var m2 = jumpRoutes[j].to;
      for (var k = 0; k < jumpRoutes.length; k++)
        if (jumpRoutes[k].from === m2 && jumpRoutes[k].to === tp) return m1;
    }
  }
  if (fp !== 0) {
    for (var i = 0; i < jumpRoutes.length; i++)
      if (jumpRoutes[i].from === fp) return jumpRoutes[i].to;
  }
  return -1;
}
function getJumpXY(fp, tp) {
  for (var i = 0; i < jumpRoutes.length; i++)
    if (jumpRoutes[i].from === fp && jumpRoutes[i].to === tp)
      return { fx: jumpRoutes[i].fromX, tx: jumpRoutes[i].toX };
  return null;
}
function startJumpTo(ci, tp) {
  var c = cats[ci];
  var j = getJumpXY(c.platform, tp);
  if (!j) return;
  c.jSX = c.x; c.jSY = c.y;
  c.jEX = j.tx; c.jEY = plats[tp].y;
  c.jProg = 0; c.jTPlat = tp;
  c.dir = (c.jEX > c.jSX) ? 1 : -1;
  c.state = 'jump';
}

// ============================================================================
// Spot conflict checks
// ============================================================================
function spotTakenBy(self, plat, wx) {
  for (var i = 0; i < cats.length; i++) {
    if (i === self) continue;
    var o = cats[i];
    if (o.state === 'walk' || o.state === 'jump' || o.state === 'idle') continue;
    if (plat >= 1 && plat <= 7) { if (o.platform === plat) return true; }
    if (plat === 0 && o.platform === 0 && abs(o.x - wx) < 30) return true;
  }
  return false;
}

// ============================================================================
// Cat AI: decide next + arrived
// ============================================================================
function catDecideNext(ci) {
  var c = cats[ci];
  var now = millis();
  var r = random(100);

  // Hungry
  if (foodLevel <= 1 && r < 40 && !spotTakenBy(ci, 0, fx.bowls + 10)) {
    c.destPlatform = 0; c.destX = fx.bowls + 10;
    if (c.platform !== 0) {
      var h = findNextHop(c.platform, 0);
      if (h >= 0) { startJumpTo(ci, h); return; }
    }
    c.state = 'walk'; c.targetX = fx.bowls + 10; c.stateEndTime = 0;
    return;
  }

  // ~10% — approach another cat (if multi)
  if (cats.length > 1 && r < 5 && now > c.interactCooldown) {
    var oi = (ci + 1 + Math.floor(random(cats.length - 1))) % cats.length;
    var o = cats[oi];
    if (o.state !== 'sleep' && o.state !== 'litter' && o.state !== 'jump') {
      c.destPlatform = o.platform;
      c.destX = o.x + ((random(2) | 0) ? 25 : -25);
      c.destX = constrain(c.destX,
        plats[o.platform].x1 + 6, plats[o.platform].x2 - 6);
      if (c.platform === c.destPlatform) {
        c.state = 'walk'; c.targetX = c.destX; c.stateEndTime = 0;
      } else {
        var hop = findNextHop(c.platform, c.destPlatform);
        if (hop >= 0) {
          var j = getJumpXY(c.platform, hop);
          if (j) {
            c.state = 'walk';
            c.targetX = constrain(j.fx,
              plats[c.platform].x1 + 4, plats[c.platform].x2 - 4);
            c.stateEndTime = 0;
          } else { c.state = 'idle'; c.stateEndTime = now + 2000; }
        } else { c.state = 'idle'; c.stateEndTime = now + 2000; }
      }
      return;
    }
  }

  // Normal options
  var attempts = 0;
  while (attempts < 6) {
    attempts++;
    var r2 = random(100);
    var dp = -1, dx = 0;
    if      (r2 < 6)  { dp = 3; dx = fx.wshelf2X + 20; }
    else if (r2 < 12) { dp = 2; dx = fx.wshelf1X + 20; }
    else if (r2 < 22) { dp = 5; dx = fx.tree + 15; }
    else if (r2 < 32) { dp = 4; dx = fx.tree + 15; }
    else if (r2 < 40) { dp = 1; dx = fx.desk + 30; }
    else if (r2 < 50) { dp = 6; dx = fx.sofa + 30; }
    else if (r2 < 58) { dp = 0; dx = fx.bed + 12; }
    else if (r2 < 66) { dp = 0; dx = fx.bowls + 10; }
    else if (r2 < 72) { c.state = 'groom'; c.stateEndTime = now + random(3000, 6000); return; }
    else if (r2 < 78) { c.state = 'stretch'; c.stateEndTime = now + random(1500, 3000); return; }
    else if (r2 < 84) { dp = 0; dx = fx.litter + 12; }
    else if (r2 < 90) { dp = 0; dx = fx.fishtank + 18; }
    else if (r2 < 96) { dp = 0; dx = fx.bookshelf + 28; }
    else { c.state = 'idle'; c.stateEndTime = now + random(2000, 5000); return; }

    if (dp < 0) continue;
    if (spotTakenBy(ci, dp, dx)) continue;
    if (dp === 0 && abs(dx - (fx.bed + 12)) < 20 && spotTakenBy(ci, 7, fx.bed + 12)) continue;
    if (dp === 6 && spotTakenBy(ci, 6, fx.sofa + 30)) continue;

    c.destPlatform = dp; c.destX = dx;
    if (c.platform === dp) {
      c.state = 'walk';
      c.targetX = constrain(dx, plats[dp].x1 + 6, plats[dp].x2 - 6);
      c.stateEndTime = 0;
    } else {
      var hop = findNextHop(c.platform, dp);
      if (hop >= 0) {
        var j = getJumpXY(c.platform, hop);
        if (j) {
          c.state = 'walk';
          c.targetX = constrain(j.fx,
            plats[c.platform].x1 + 4, plats[c.platform].x2 - 4);
          c.stateEndTime = 0;
        } else { c.state = 'idle'; c.stateEndTime = now + 2000; }
      } else { c.state = 'idle'; c.stateEndTime = now + 2000; }
    }
    return;
  }
  c.state = 'idle'; c.stateEndTime = now + random(2000, 5000);
}

function catArrived(ci) {
  var c = cats[ci];
  var now = millis();

  if (c.platform !== c.destPlatform) {
    var h = findNextHop(c.platform, c.destPlatform);
    if (h >= 0) { startJumpTo(ci, h); return; }
  }

  // Floor destinations
  if (c.platform === 0) {
    if (abs(c.x - (fx.bed + 12)) < 15) {
      if (!spotTakenBy(ci, 7, fx.bed + 12)) {
        c.state = 'sleep'; c.x = fx.bed + 14; c.y = fx.bedY + 4; c.platform = 7;
        c.stateEndTime = now + random(6000, 14000); return;
      }
      catDecideNext(ci); return;
    }
    if (abs(c.x - (fx.bowls + 10)) < 15) {
      if (foodLevel > 0 && !spotTakenBy(ci, 0, fx.bowls + 10)) {
        c.state = 'eat'; c.dir = 1; c.stateEndTime = now + random(2000, 5000); return;
      }
      catDecideNext(ci); return;
    }
    if (abs(c.x - (fx.tree + 14)) < 18) {
      c.state = 'play'; c.destX = fx.tree + 14;
      c.stateEndTime = now + random(3000, 6000); return;
    }
    if (abs(c.x - (fx.litter + 12)) < 15) {
      if (litterDirty < LITTER_MAX && !spotTakenBy(ci, 0, fx.litter + 12)) {
        c.state = 'litter'; c.stateEndTime = now + random(2000, 4000);
      } else {
        c.angryT = 24; catDecideNext(ci);
      }
      return;
    }
    if (abs(c.x - (fx.fishtank + 18)) < 15) {
      if (!spotTakenBy(ci, 0, fx.fishtank + 18)) {
        c.state = 'sit_high'; c.stateEndTime = now + random(3000, 7000); return;
      }
      catDecideNext(ci); return;
    }
  } else if (c.platform === 6) {
    if (!spotTakenBy(ci, 6, fx.sofa + 30)) {
      c.state = 'sleep'; c.y = plats[6].y; c.stateEndTime = now + random(5000, 12000); return;
    }
    catDecideNext(ci); return;
  } else if (c.platform === 7) {
    c.state = 'sleep'; c.y = fx.bedY + 4;
    c.stateEndTime = now + random(6000, 14000); return;
  } else {
    if (c.platform === 4 || c.platform === 5) {
      if (random(2) | 0) {
        c.state = 'play'; c.destX = c.x; c.stateEndTime = now + random(3000, 6000);
      } else {
        c.state = 'sit_high'; c.stateEndTime = now + random(4000, 10000);
      }
      return;
    }
    c.state = 'sit_high'; c.stateEndTime = now + random(4000, 11000); return;
  }
  c.state = 'idle'; c.stateEndTime = now + random(2000, 4000);
}

function updateCat(ci) {
  var c = cats[ci];
  var now = millis();
  c.anim++;
  var spd = SPEEDS[speedIdx];

  // Anti-stick: nearby other cat on same platform → redirect
  if (c.state === 'walk') {
    for (var k = 0; k < cats.length; k++) {
      if (k === ci) continue;
      var o = cats[k];
      if (c.platform === o.platform &&
          o.state !== 'jump' && o.state !== 'play' && o.state !== 'walk') {
        var gap = c.x - o.x;
        if (abs(gap) < 22) {
          var away = (gap >= 0) ? 40 : -40;
          if (abs(gap) < 3) away = (ci < k) ? -40 : 40;
          var nt = constrain(o.x + away,
            plats[c.platform].x1 + 10, plats[c.platform].x2 - 10);
          c.targetX = nt; c.destX = nt; c.destPlatform = c.platform;
        }
      }
    }
  }

  switch (c.state) {
    case 'walk':
      var dx = c.targetX - c.x;
      c.dir = (dx > 0) ? 1 : -1;
      if (abs(dx) < 1) { c.x = c.targetX; catArrived(ci); }
      else c.x += c.dir * 0.9 * spd;
      break;
    case 'jump':
      c.jProg += 0.04 * spd;
      if (c.jProg >= 1) {
        c.platform = c.jTPlat; c.x = c.jEX; c.y = c.jEY;
        if (c.platform === c.destPlatform) {
          c.state = 'walk';
          c.targetX = constrain(c.destX,
            plats[c.platform].x1 + 4, plats[c.platform].x2 - 4);
          c.stateEndTime = 0;
        } else {
          var h = findNextHop(c.platform, c.destPlatform);
          if (h >= 0) {
            var j = getJumpXY(c.platform, h);
            if (j) {
              c.state = 'walk';
              c.targetX = constrain(j.fx,
                plats[c.platform].x1 + 4, plats[c.platform].x2 - 4);
              c.stateEndTime = 0;
            } else catArrived(ci);
          } else catArrived(ci);
        }
      } else {
        var t = c.jProg;
        c.x = c.jSX + (c.jEX - c.jSX) * t;
        c.y = c.jSY + (c.jEY - c.jSY) * t - sin(t * PI) * 44;
        c.dir = (c.jEX > c.jSX) ? 1 : -1;
      }
      break;
    case 'sleep':
      if (c.anim % 40 === 0) spawnZzz(ci, c.x + 8, c.y - 16);
      if (now > c.stateEndTime) catDecideNext(ci);
      break;
    case 'eat':
      if (c.anim % 20 < 10) c.y = fx.bowlY; else c.y = fx.bowlY - 1;
      if (c.anim % 60 === 0 && foodLevel > 0) foodLevel--;
      if (c.anim % 80 === 0 && waterLevel > 0) waterLevel--;
      if (now > c.stateEndTime || foodLevel <= 0) {
        c.y = FLOOR_Y; catDecideNext(ci);
      }
      break;
    case 'play':
      var center = c.destX;
      c.x = center + sin(c.anim * 0.15 + ci * 1.57) * 14;
      c.dir = (sin(c.anim * 0.15 + ci * 1.57) > 0) ? 1 : -1;
      if (now > c.stateEndTime) {
        c.interactCooldown = now + 8000;
        var sep = (ci % 2 === 0) ? -60 : 60;
        var awayX = constrain(c.x + sep,
          plats[c.platform].x1 + 10, plats[c.platform].x2 - 10);
        c.state = 'walk'; c.targetX = awayX; c.destX = awayX;
        c.destPlatform = c.platform; c.stateEndTime = 0;
      }
      break;
    case 'sit_high': case 'groom': case 'stretch': case 'idle':
      if (now > c.stateEndTime) catDecideNext(ci);
      break;
    case 'litter':
      if (now > c.stateEndTime) {
        litterDirty = min(litterDirty + 1, LITTER_MAX);
        catDecideNext(ci);
      }
      break;
  }
}

// ============================================================================
// Tick effects + resources
// ============================================================================
function updateEffects() {
  for (var i = hearts.length - 1; i >= 0; i--) {
    var h = hearts[i];
    h.y += h.vy; h.x += sin(h.life * 0.3) * 0.5;
    h.life--; if (h.life <= 0) hearts.splice(i, 1);
  }
  for (var i = pourP.length - 1; i >= 0; i--) {
    var p = pourP[i];
    p.y += p.vy; p.life--;
    if (p.life <= 0) pourP.splice(i, 1);
  }
  for (var i = notifs.length - 1; i >= 0; i--) {
    var n = notifs[i]; n.y -= 0.5; n.life--;
    if (n.life <= 0) notifs.splice(i, 1);
  }
  for (var i = zzzPool.length - 1; i >= 0; i--) {
    var z = zzzPool[i]; z.y -= 0.4; z.life--;
    if (z.life <= 0) zzzPool.splice(i, 1);
  }
  for (var i = 0; i < clouds.length; i++) {
    clouds[i].x -= 0.12 * SPEEDS[speedIdx];
    if (clouds[i].x < -30) clouds[i].x = winW + 5 + random(20);
  }
  for (var ci = 0; ci < cats.length; ci++) {
    if (cats[ci].purrT > 0) cats[ci].purrT--;
    if (cats[ci].angryT > 0) cats[ci].angryT--;
  }

  // Resource decay (scaled by speed)
  var fdec = Math.floor(600 / SPEEDS[speedIdx]);
  var wdec = Math.floor(800 / SPEEDS[speedIdx]);
  if (frame % fdec === 0 && foodLevel > 0) foodLevel--;
  if (frame % wdec === 0 && waterLevel > 0) waterLevel--;
  // Auto refill
  if (foodLevel === 0 && frame % 300 === 0) {
    foodLevel = FOOD_MAX;
    spawnNotif(fx.bowls + 10, fx.bowlY - 18, 'Auto', '#f8b860');
  }
  if (waterLevel === 0 && frame % 300 === 0) {
    waterLevel = FOOD_MAX;
    spawnNotif(fx.bowls + 40, fx.bowlY - 18, 'Auto', '#5cb0e8');
  }

  // Happiness
  var h = 50;
  if (foodLevel >= 3) h += 15; else if (foodLevel === 0) h -= 20;
  if (waterLevel >= 3) h += 10; else if (waterLevel === 0) h -= 15;
  if (litterDirty <= 1) h += 10; else if (litterDirty >= 4) h -= 15;
  var anyPurr = false;
  for (var i = 0; i < cats.length; i++) if (cats[i].purrT > 0) anyPurr = true;
  if (anyPurr) h += 15;
  happiness = constrain(h, 0, 100);
}

// ============================================================================
// Auto interaction (when no user input)
// ============================================================================
function maybeAutoAct() {
  var now = millis();
  // Only kick in after no user input for 6s
  if (now - lastUserInteract < 6000) return;
  if (now < nextAutoAct) return;
  nextAutoAct = now + 8000 + random(8000);

  var pick = floor(random(5));
  switch (pick) {
    case 0:
      if (litterDirty > 0) {
        litterDirty = 0;
        spawnNotif(fx.litter + 18, fx.litterY - 15, 'Clean', '#3ac848');
      }
      break;
    case 1:
      if (foodLevel < FOOD_MAX) {
        foodLevel = FOOD_MAX;
        for (var i = 0; i < 5; i++) spawnPour(fx.bowls + 12, fx.bowlY - 8, color('#885020'));
        spawnNotif(fx.bowls + 12, fx.bowlY - 18, 'Refill', '#f8b860');
      }
      break;
    case 2:
      if (waterLevel < FOOD_MAX) {
        waterLevel = FOOD_MAX;
        for (var i = 0; i < 5; i++) spawnPour(fx.bowls + 40, fx.bowlY - 8, color('#48d0e8'));
        spawnNotif(fx.bowls + 40, fx.bowlY - 18, 'Fresh', '#5cb0e8');
      }
      break;
    case 3:
      curtainOpen = !curtainOpen;
      spawnNotif(winX + winW / 2, winY - 8, curtainOpen ? 'Open' : 'Close', '#c8d8f0');
      break;
    case 4:
      lampOn = !lampOn;
      spawnNotif(fx.desk + 62, fx.deskY - 32, lampOn ? 'On' : 'Off', '#f8e448');
      break;
  }
}

// ============================================================================
// HUD
// ============================================================================
function drawHUD(amb) {
  noStroke();
  fill(20, 20, 30, 220);
  rect(0, H - 28, W, 28);
  // Happiness icon
  var bx = 10, by = H - 22;
  fill(dimC('#ffe048', amb));
  noFill();
  stroke(dimC('#ffe048', amb)); strokeWeight(1.5);
  circle(bx + 8, by + 8, 14);
  fill(dimC('#ffe048', amb));
  noStroke();
  rect(bx + 5, by + 5, 2, 2); rect(bx + 11, by + 5, 2, 2);
  if (happiness >= 70) {
    stroke(dimC('#ffe048', amb)); strokeWeight(1.5); noFill();
    arc(bx + 8, by + 9, 9, 7, 0.1, PI - 0.1);
  } else if (happiness >= 40) {
    stroke(dimC('#ffe048', amb)); strokeWeight(1.5);
    line(bx + 5, by + 12, bx + 11, by + 12);
  } else {
    stroke(dimC('#ffe048', amb)); strokeWeight(1.5); noFill();
    arc(bx + 8, by + 13, 9, 7, PI + 0.1, TWO_PI - 0.1);
  }
  noStroke();

  // Focus cat label
  var cc = cats[camFollow];
  var mood = ({
    sleep: 'Sleeping..', eat: 'Eating', play: 'Playing!',
    groom: 'Grooming', walk: 'Walking', litter: 'Litter',
    stretch: 'Stretch~', jump: 'Jump!', sit_high: 'Perching'
  })[cc.state] || 'Relaxing';
  fill(200, 220, 255);
  textAlign(LEFT, CENTER); textSize(12);
  // Cat color dot
  var dotC = color(cc.coat.body);
  fill(red(dotC) * amb, green(dotC) * amb, blue(dotC) * amb);
  rect(34, H - 19, 10, 10, 2);
  fill(220, 230, 255);
  text(cc.coat.name + ' · ' + mood, 50, H - 14);

  // Time
  var hr = (Math.floor(dayPhase * 24) + 6) % 24;
  var mn = Math.floor((dayPhase * 24 * 60) % 60);
  var tStr = (hr < 10 ? '0' : '') + hr + ':' + (mn < 10 ? '0' : '') + mn;
  textAlign(CENTER, CENTER);
  fill(180, 200, 240);
  text(tStr, W / 2, H - 14);
  // Cat count
  text(cats.length + ' cats', W / 2 + 70, H - 14);

  // Food/water
  textAlign(RIGHT, CENTER);
  fill(248, 180, 100); text('F', W - 132, H - 14);
  for (var i = 0; i < FOOD_MAX; i++) {
    fill((i < foodLevel) ? color('#f8b860') : color('#404040'));
    rect(W - 128 + i * 10, H - 19, 8, 10, 2);
  }
  fill(92, 176, 232); text('W', W - 62, H - 14);
  for (var i = 0; i < FOOD_MAX; i++) {
    fill((i < waterLevel) ? color('#5cb0e8') : color('#404040'));
    rect(W - 58 + i * 10, H - 19, 8, 10, 2);
  }
}

// ============================================================================
// Touch / mouse
// ============================================================================
function handleTouch(scrX, scrY) {
  lastUserInteract = millis();
  // Convert screen → world, undoing zoom
  var z = ZOOMS[zoomIdx];
  var localX = scrX / z, localY = scrY / z;
  var wx = camX + localX, wy = localY;

  // Cats
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    if (abs(wx - c.x) < 22 && abs(wy - (c.y - 12)) < 22) {
      if (c.state === 'sleep') {
        c.angryT = 30; c.state = 'idle'; c.stateEndTime = millis() + 2000;
        spawnNotif(c.x, c.y - 30, 'Meow!', '#e83030');
      } else {
        for (var k = 0; k < 3; k++) spawnHeart(c.x, c.y);
        c.purrT = 90;
        spawnNotif(c.x, c.y - 30, 'Purr~', '#f8b860');
      }
      return;
    }
  }
  // Window / curtain
  if (wx > winX - 10 && wx < winX + winW + 10 &&
      wy > winY - 10 && wy < winY + winH + 10) {
    curtainOpen = !curtainOpen;
    spawnNotif(winX + winW / 2, winY - 8, curtainOpen ? 'Open' : 'Close', '#c8d8f0');
    return;
  }
  // Food bowl
  if (wx > fx.bowls && wx < fx.bowls + 22 &&
      wy > fx.bowlY - 15 && wy < fx.bowlY + 15) {
    if (foodLevel < FOOD_MAX) {
      foodLevel = FOOD_MAX;
      for (var i = 0; i < 6; i++) spawnPour(fx.bowls + 12, fx.bowlY - 8, color('#885020'));
      spawnNotif(fx.bowls + 12, fx.bowlY - 18, 'Refill', '#f8b860');
    }
    return;
  }
  // Water bowl
  if (wx > fx.bowls + 28 && wx < fx.bowls + 52 &&
      wy > fx.bowlY - 15 && wy < fx.bowlY + 15) {
    if (waterLevel < FOOD_MAX) {
      waterLevel = FOOD_MAX;
      for (var i = 0; i < 6; i++) spawnPour(fx.bowls + 40, fx.bowlY - 8, color('#48d0e8'));
      spawnNotif(fx.bowls + 40, fx.bowlY - 18, 'Fresh', '#5cb0e8');
    }
    return;
  }
  // Litter
  if (wx > fx.litter - 5 && wx < fx.litter + 40 &&
      wy > fx.litterY - 10 && wy < fx.litterY + 18) {
    if (litterDirty > 0) {
      litterDirty = 0;
      spawnNotif(fx.litter + 18, fx.litterY - 15, 'Clean', '#3ac848');
    }
    return;
  }
  // Lamp
  if (wx > fx.desk + 50 && wx < fx.desk + 75 &&
      wy > fx.deskY - 35 && wy < fx.deskY + 5) {
    lampOn = !lampOn;
    spawnNotif(fx.desk + 62, fx.deskY - 32, lampOn ? 'On' : 'Off', '#f8e448');
    return;
  }
  // Floor tap: direct focus cat
  var fc = cats[camFollow];
  if (fc.state !== 'sleep' && fc.state !== 'litter' && fc.state !== 'jump') {
    fc.destPlatform = 0;
    fc.destX = constrain(wx, 18, ROOM_W - 18);
    if (fc.platform !== 0) {
      var hop = findNextHop(fc.platform, 0);
      if (hop >= 0) startJumpTo(camFollow, hop);
    } else {
      fc.state = 'walk'; fc.targetX = fc.destX; fc.stateEndTime = 0;
    }
  }
}

// ============================================================================
// p5 setup / draw
// ============================================================================
function setup() {
  var canvas = createCanvas(W, H);
  canvas.parent('neko-container');
  noSmooth();
  pixelDensity(1);
  textFont('monospace');

  // Seed from URL
  var m = location.search.match(/[?&]seed=(\d+)/);
  worldSeed = m ? parseInt(m[1], 10) : Math.floor(Math.random() * 99999);
  newRoom();

  // Button wiring
  document.getElementById('btn-new').onclick = function () {
    worldSeed = Math.floor(Math.random() * 99999);
    newRoom();
  };
  document.getElementById('btn-speed').onclick = function () {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    spawnNotif(camX + W / (2 * ZOOMS[zoomIdx]), 60, 'x' + SPEEDS[speedIdx], '#ff9500');
  };
  document.getElementById('btn-zoom').onclick = function () {
    zoomIdx = (zoomIdx + 1) % ZOOMS.length;
    spawnNotif(camX + W / (2 * ZOOMS[zoomIdx]), 60,
               'Zoom x' + ZOOMS[zoomIdx], '#5856d6');
  };

  // Resize canvas to fit container (mobile-friendly)
  windowResized();
}

function newRoom() {
  // Reset seed-driven state
  var seedSnapshot = worldSeed;
  buildRoom();
  worldSeed = seedSnapshot;
  spawnCats();
  foodLevel = FOOD_MAX; waterLevel = FOOD_MAX;
  litterDirty = 0; happiness = 80;
  hearts = []; notifs = []; pourP = []; zzzPool = [];
  frame = 0;
  curtainOpen = true; curtainAnim = 1;
  lampOn = true;
  lastUserInteract = millis();
  nextAutoAct = millis() + 6000;
}

function windowResized() {
  var container = document.getElementById('neko-container');
  var availW = container.clientWidth;
  var availH = container.clientHeight;
  var ratio = W / H;
  var w = availW, h = availW / ratio;
  if (h > availH) { h = availH; w = availH * ratio; }
  var canvasEl = document.querySelector('#neko-container canvas');
  if (canvasEl) {
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
  }
}

function draw() {
  frame++;
  dayPhase = (frame / DAY_CYCLE) % 1;
  var amb = getAmbient();
  var spd = SPEEDS[speedIdx];

  // Camera switching
  var now = millis();
  if (now > nextCamSwitch) {
    var next = camFollow;
    while (cats.length > 1 && next === camFollow) next = floor(random(cats.length));
    camFollow = next;
    nextCamSwitch = now + 8000 + random(10000);
  }

  // Camera follow with zoom-aware viewport width
  var z = ZOOMS[zoomIdx];
  var viewW = W / z;
  var targetCam = cats[camFollow].x - viewW / 2;
  targetCam = constrain(targetCam, 0, max(0, ROOM_W - viewW));
  camX += (targetCam - camX) * 0.05 * spd;

  // Update (multiple ticks per frame at higher speeds for smoothness)
  var subSteps = (spd > 1) ? 1 : 1; // already speed-scaled inside
  for (var s = 0; s < subSteps; s++) {
    for (var i = 0; i < cats.length; i++) updateCat(i);
    updateEffects();
  }
  maybeAutoAct();

  // Draw with zoom transform
  push();
  scale(z);
  drawRoom(amb);
  drawWindow(amb);
  drawWallDecor(amb);
  drawWallShelves(amb);
  drawBookshelf(amb);
  drawFloorPlant(amb, fx.plant1);
  if (fx.plant2 > 0) drawFloorPlant(amb, fx.plant2);
  drawSofa(amb);
  drawDesk(amb);
  drawCatTree(amb);
  drawCatBed(amb);
  drawBowls(amb);
  drawFishTank(amb);
  drawLitterBox(amb);
  drawRug(amb);

  // Cats sorted by x for correct overlap
  var order = cats.map(function (_, i) { return i; });
  order.sort(function (a, b) { return cats[a].x - cats[b].x; });
  for (var i = 0; i < order.length; i++) drawCat(order[i], amb);

  drawEffects(amb);
  pop();

  drawHUD(amb);
}

function mousePressed() {
  if (mouseY < 0 || mouseY > H) return;
  if (mouseX < 0 || mouseX > W) return;
  handleTouch(mouseX, mouseY);
  return false;
}
function touchStarted() {
  if (touches.length > 0) {
    var t = touches[0];
    if (t.y >= 0 && t.y <= H && t.x >= 0 && t.x <= W) {
      handleTouch(t.x, t.y);
      return false;
    }
  }
}
