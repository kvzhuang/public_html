// ============================================
// Auto City — Isometric (45°) gen-art
// 區塊偵測 → 區塊內統一分區 → 大型建案 → 道路車流 → 持續進化
// ============================================

var COLS = 22, ROWS = 28;
var ISO_W, ISO_H;
var cellSize;
var originX, originY, canvasW, canvasH;
var grid = [];
var blocks = [];               // { id, cells, zone, size }
var phase = "running";         // "building" → "evolving"
var phaseStart = 0;
var cityStart = 0;
var revealIdx = 0;
var revealOrder = [];
var growthList = [];
var growthIdx = 0;
var lastTickTime = 0;
var tickInterval = 35;
var lastEvolveTime = 0;
var evolveInterval = 800;      // ms：進化（升級 / 翻新）週期
var lastCarSpawn = 0;
var carSpawnInterval = 700;
var stats = {
  roads: 0, zones: 0, services: 0, builds: 0, megas: 0, cities: 1,
  population: 0, income: 0, spending: 0, tax: 0, expense: 0,
  demos: 0,
};
var cars = [];
var MAX_CARS = 28;

// ── 天氣 ────────────────────────────────────────────────────────────────────
var WEATHERS = ["SUNNY", "CLOUDY", "RAIN", "SUNNY", "CLOUDY", "NIGHT"];
var weather = "SUNNY";
var prevWeather = null;
var weatherIdx = 0;
var weatherStart = 0;
var weatherDur = 14000;        // 每種天氣維持 14 秒
var weatherFade = 1500;        // 切換時 1.5 秒淡入淡出
var rainDrops = [];
var stars = [];
var lightnings = [];           // [{ at: ms, x }]
var currentSky = "#a8d8f0";
var currentAmbient = null;     // 全幕半透明覆色（null 表示不蓋）
var currentWindowCol = "#cfe2ff";
var currentGrass = "#5d8c4a";
var currentRoad = "#3a3a42";

var WEATHER_INFO = {
  SUNNY:  { sky: "#a8d8f0", ambient: null,                        win: "#cfe2ff", grass: "#5d8c4a", road: "#3a3a42", emoji: "☀️" },
  CLOUDY: { sky: "#8294a8", ambient: "rgba(170,180,200,0.18)",    win: "#b5c8e0", grass: "#557e44", road: "#36363e", emoji: "☁️" },
  RAIN:   { sky: "#4e6378", ambient: "rgba(70, 95, 130, 0.32)",   win: "#d8b46a", grass: "#456b3a", road: "#2c2c34", emoji: "🌧️" },
  NIGHT:  { sky: "#0c1a30", ambient: "rgba(8, 18, 48, 0.58)",     win: "#ffd07a", grass: "#2e4a30", road: "#1f1f25", emoji: "🌙" },
};

// Cell types
var T_EMPTY = 0, T_GRASS = 1, T_ROAD = 2, T_PARK = 3,
    T_RES = 10, T_COM = 11, T_IND = 12,
    T_POLICE = 20, T_FIRE = 21, T_HOSPITAL = 22, T_SCHOOL = 23,
    T_CITY_HALL = 24, T_POWER = 25, T_GARBAGE = 26;

var SERVICE_INFO = {};
SERVICE_INFO[T_POLICE]    = { bg: "#1f4e8c", emoji: "👮" };
SERVICE_INFO[T_FIRE]      = { bg: "#c0392b", emoji: "🚒" };
SERVICE_INFO[T_HOSPITAL]  = { bg: "#ecf0f1", emoji: "🏥" };
SERVICE_INFO[T_SCHOOL]    = { bg: "#d4a44b", emoji: "🏫" };
SERVICE_INFO[T_CITY_HALL] = { bg: "#e8d8a0", emoji: "🏛️" };
SERVICE_INFO[T_POWER]     = { bg: "#2c3e50", emoji: "⚡" };
SERVICE_INFO[T_GARBAGE]   = { bg: "#7f8c8d", emoji: "♻️" };

var PALETTE = {
  bgSky: "#0d1117",
  grass: "#5d8c4a",
  grassDark: "#4d7a3a",
  road: "#3a3a42",
  roadEdge: "#2a2a30",
  roadLine: "#dcdcb8",
  resWalls: ["#e7d3a8", "#d8b794", "#c9a07a", "#dcc4a3"],
  resRoofs: ["#a83232", "#8c2828", "#6b4226", "#3e5641"],
  comWalls: ["#a8c4e0", "#8ab4d6", "#6a99c4", "#5c8db8"],
  comGlass: ["#3a6ca0", "#4080b8", "#5fa2d8"],
  comRoofs: ["#1a2a3a", "#243446"],
  indWalls: ["#9c8870", "#a89880", "#8a7860"],
  indRoofs: ["#5c4f3e", "#48402e"],
  parkBase: "#76c043",
  treeDark: "#2e7a2e",
  treeMed:  "#56a056",
  // 大型建案專屬色（更亮 / 更冷）
  megaResWall: "#c8c8d4", megaResRoof: "#4c4d6e",
  megaComWall: "#3f5266", megaComGlass: "#7cc8ff", megaComRoof: "#1a242e",
  megaIndWall: "#9aa1ad", megaIndRoof: "#3a3f48",
};

var CAR_COLORS = [
  "#ff6b6b", "#4ecdc4", "#ffe66d", "#ff9f43", "#5fa2d8",
  "#a3e635", "#f472b6", "#fbbf24", "#e2e8f0", "#94a3b8",
];

// ── Setup ──────────────────────────────────────────────────────────────────

function setup() {
  applyDims();
  var cnv = createCanvas(canvasW, canvasH);
  cnv.parent("city-container");
  document.getElementById("btn-new").onclick = newCity;
  document.getElementById("btn-speed").onclick = toggleSpeed;
  document.getElementById("btn-new").ontouchend = function(e){ e.preventDefault(); newCity(); };
  document.getElementById("btn-speed").ontouchend = function(e){ e.preventDefault(); toggleSpeed(); };
  newCity();
}

function applyDims() {
  var ctrlH = document.getElementById("controls").offsetHeight || 60;
  var availH = Math.min(window.innerHeight, document.documentElement.clientHeight) - ctrlH - 10;
  var availW = Math.min(window.innerWidth, document.documentElement.clientWidth) - 10;

  var margin = 16;
  var maxBuildH = 2.2;        // 最高（大型建案）約 2.2 倍 ISO_W
  var hudTop = 28, hudBot = 64;     // 三行底部 HUD

  var tileFromW = (availW - 2 * margin) / ((COLS + ROWS) / 2);
  var tileFromH = (availH - hudTop - hudBot - 2 * margin) / ((COLS + ROWS) / 4 + maxBuildH);
  var tileW = Math.floor(Math.min(tileFromW, tileFromH));
  if (tileW < 18) tileW = 18;
  ISO_W = tileW;
  ISO_H = Math.floor(ISO_W / 2);
  cellSize = ISO_W;

  canvasW = Math.ceil((COLS + ROWS) * ISO_W / 2 + 2 * margin);
  canvasH = Math.ceil((COLS + ROWS - 1) * ISO_H / 2 + ISO_H + maxBuildH * ISO_W + 2 * margin + hudTop + hudBot);
  originX = margin + Math.ceil(ROWS * ISO_W / 2);
  originY = margin + hudTop + Math.ceil(maxBuildH * ISO_W + ISO_H / 2);
}

function windowResized() { applyDims(); resizeCanvas(canvasW, canvasH); }

function toggleSpeed() {
  if (tickInterval >= 120) tickInterval = 10;
  else if (tickInterval >= 60) tickInterval = 120;
  else if (tickInterval >= 35) tickInterval = 60;
  else tickInterval = 35;
  var btn = document.getElementById("btn-speed");
  btn.textContent = "Speed " + (tickInterval >= 120 ? "Slow" : tickInterval >= 60 ? "Normal" : tickInterval >= 35 ? "Fast" : "Turbo");
}

function newCity() {
  grid = [];
  for (var r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (var c = 0; c < COLS; c++) {
      grid[r][c] = {
        type: T_GRASS, level: 0, variant: 0, hue: 0,
        revealAt: -1, builtAt: -1, targetLevel: 0,
        blockId: -1, megaId: null, megaAnchor: false,
        megaW: 0, megaH: 0, megaR0: 0, megaC0: 0,
        demolishedAt: -1,        // 最近被拆遷的時間（用來畫拆遷動畫）
      };
    }
  }
  stats.roads = stats.zones = stats.services = stats.builds = stats.megas = 0;
  stats.population = 0; stats.income = 0; stats.spending = 0;
  stats.tax = 0; stats.expense = 0; stats.demos = 0;
  cars = [];
  // 重設天氣
  weatherIdx = 0;
  weather = WEATHERS[0];
  prevWeather = null;
  weatherStart = millis();
  rainDrops = [];
  lightnings = [];
  initStars();
  applyWeatherVisuals(1);

  planCity();

  // Reveal order
  revealOrder = [];
  for (var r1 = 0; r1 < ROWS; r1++) for (var c1 = 0; c1 < COLS; c1++)
    if (grid[r1][c1].type === T_ROAD) revealOrder.push({ r: r1, c: c1, kind: "road" });
  shuffleInPlace(revealOrder);

  var svc = [];
  for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
    var t = grid[r2][c2].type;
    if (t >= 20 && t <= 26) svc.push({ r: r2, c: c2, kind: "service" });
  }
  shuffleInPlace(svc);
  revealOrder = revealOrder.concat(svc);

  var cr = ROWS / 2, cc = COLS / 2;
  var zonesArr = [];
  for (var r3 = 0; r3 < ROWS; r3++) for (var c3 = 0; c3 < COLS; c3++) {
    var t3 = grid[r3][c3].type;
    if (t3 === T_RES || t3 === T_COM || t3 === T_IND || t3 === T_PARK) {
      zonesArr.push({ r: r3, c: c3, kind: "zone", d: (r3 - cr) * (r3 - cr) + (c3 - cc) * (c3 - cc) });
    }
  }
  zonesArr.sort(function(a, b) { return a.d - b.d; });
  revealOrder = revealOrder.concat(zonesArr);

  for (var i = 0; i < revealOrder.length; i++) {
    var item = revealOrder[i];
    grid[item.r][item.c].revealAt = i;
  }

  revealIdx = 0;
  growthList = [];
  growthIdx = 0;
  cityStart = millis();
  phase = "building";
  phaseStart = millis();
  lastTickTime = millis();
  lastEvolveTime = millis();
  lastCarSpawn = millis();
}

// ── City planner ──────────────────────────────────────────────────────────

function planCity() {
  // 1) 主道路（井字網格）
  var colStep = 5, rowStep = 5;
  for (var c = 0; c < COLS; c += colStep) {
    for (var r = 0; r < ROWS; r++) grid[r][c].type = T_ROAD;
  }
  for (var r2 = 0; r2 < ROWS; r2 += rowStep) {
    for (var c2 = 0; c2 < COLS; c2++) grid[r2][c2].type = T_ROAD;
  }

  // 2) 二級路 / 街廓分割（在主路之間切短路 — 不貫穿整列）
  var bisects = 4 + Math.floor(Math.random() * 5);
  for (var b = 0; b < bisects; b++) {
    if (Math.random() < 0.5) {
      // 橫向短路：在主橫路之間隨機一列、跨度 1～2 個 5-cell 區段
      var ri = Math.floor(Math.random() * Math.ceil(ROWS / rowStep)) * rowStep;
      var off = 2 + Math.floor(Math.random() * 2);   // 偏移 2 或 3
      var br = ri + off;
      if (br <= 0 || br >= ROWS - 1) continue;
      var span = 1 + Math.floor(Math.random() * 2);
      var c0 = Math.floor(Math.random() * Math.ceil(COLS / colStep)) * colStep;
      var c1 = Math.min(COLS - 1, c0 + span * colStep);
      for (var cc = c0; cc <= c1; cc++) grid[br][cc].type = T_ROAD;
    } else {
      var ci = Math.floor(Math.random() * Math.ceil(COLS / colStep)) * colStep;
      var off2 = 2 + Math.floor(Math.random() * 2);
      var bc = ci + off2;
      if (bc <= 0 || bc >= COLS - 1) continue;
      var span2 = 1 + Math.floor(Math.random() * 2);
      var r0 = Math.floor(Math.random() * Math.ceil(ROWS / rowStep)) * rowStep;
      var r1 = Math.min(ROWS - 1, r0 + span2 * rowStep);
      for (var rr = r0; rr <= r1; rr++) grid[rr][bc].type = T_ROAD;
    }
  }

  // 3) Cul-de-sacs（從主路伸出的短死巷）
  var cdsCount = 4 + Math.floor(Math.random() * 5);
  for (var k = 0; k < cdsCount; k++) {
    var sR = Math.floor(Math.random() * ROWS);
    var sC = Math.floor(Math.random() * COLS);
    if (grid[sR][sC].type !== T_ROAD) continue;
    var ddirs = [[-1,0],[1,0],[0,-1],[0,1]];
    var d = ddirs[Math.floor(Math.random() * 4)];
    var len = 1 + Math.floor(Math.random() * 3);
    for (var step = 1; step <= len; step++) {
      var nr = sR + d[0] * step;
      var nc = sC + d[1] * step;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
      if (grid[nr][nc].type === T_ROAD) break;
      grid[nr][nc].type = T_ROAD;
    }
  }

  // 4) 公家單位（道路畫完後）
  var services = [T_POLICE, T_FIRE, T_HOSPITAL, T_SCHOOL, T_CITY_HALL, T_POWER, T_GARBAGE];
  shuffleInPlace(services);
  for (var s = 0; s < services.length; s++) {
    var attempts = 0;
    while (attempts < 80) {
      attempts++;
      var rr2 = 1 + Math.floor(Math.random() * (ROWS - 2));
      var cc2 = 1 + Math.floor(Math.random() * (COLS - 2));
      if (grid[rr2][cc2].type !== T_GRASS) continue;
      if (!adjToRoad(rr2, cc2)) continue;
      grid[rr2][cc2].type = services[s];
      grid[rr2][cc2].variant = Math.floor(Math.random() * 4);
      break;
    }
  }

  // 5) 公園
  var parks = 4 + Math.floor(Math.random() * 4);
  for (var p = 0; p < parks; p++) {
    var pr = 1 + Math.floor(Math.random() * (ROWS - 2));
    var pc = 1 + Math.floor(Math.random() * (COLS - 2));
    if (grid[pr][pc].type === T_GRASS) {
      grid[pr][pc].type = T_PARK;
      grid[pr][pc].variant = Math.floor(Math.random() * 4);
    }
  }

  // 6) 偵測街廓
  blocks = detectBlocks();

  // 7) 區塊內統一分區
  zoneBlocks();

  // 8) 大型建案（在較大的單一區塊內）
  placeMegaProjects();
}

function detectBlocks() {
  var idMap = [];
  for (var r = 0; r < ROWS; r++) {
    idMap[r] = [];
    for (var c = 0; c < COLS; c++) idMap[r][c] = -1;
  }
  var result = [];
  for (var rr = 0; rr < ROWS; rr++) {
    for (var cc = 0; cc < COLS; cc++) {
      if (grid[rr][cc].type === T_ROAD) continue;
      if (idMap[rr][cc] !== -1) continue;
      var id = result.length;
      idMap[rr][cc] = id;
      var stack = [[rr, cc]];
      var cells = [];
      while (stack.length) {
        var pop = stack.pop();
        var cr = pop[0], cl = pop[1];
        cells.push({ r: cr, c: cl });
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (var d = 0; d < 4; d++) {
          var nr = cr + dirs[d][0], nc = cl + dirs[d][1];
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          if (grid[nr][nc].type === T_ROAD) continue;
          if (idMap[nr][nc] !== -1) continue;
          idMap[nr][nc] = id;
          stack.push([nr, nc]);
        }
      }
      result.push({ id: id, cells: cells, size: cells.length, zone: 0 });
    }
  }
  for (var rrr = 0; rrr < ROWS; rrr++)
    for (var ccc = 0; ccc < COLS; ccc++)
      grid[rrr][ccc].blockId = idMap[rrr][ccc];
  return result;
}

function zoneBlocks() {
  var cr = ROWS / 2, cc = COLS / 2;
  var maxD = Math.sqrt((ROWS/2)*(ROWS/2) + (COLS/2)*(COLS/2));
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    // 蒐集 grass 格 + 平均位置
    var grassCells = [];
    var sr = 0, sc = 0, total = 0;
    for (var j = 0; j < b.cells.length; j++) {
      var p = b.cells[j];
      sr += p.r; sc += p.c; total++;
      if (grid[p.r][p.c].type === T_GRASS) grassCells.push(p);
    }
    if (total === 0) continue;
    sr /= total; sc /= total;
    var d = Math.sqrt((sr - cr) * (sr - cr) + (sc - cc) * (sc - cc));
    var dr = d / maxD;
    var rnd = Math.random();
    var zone;
    // 區塊大小也影響：大區塊偏向商業 / 工業；小區塊偏向住宅
    var bigPref = b.size >= 8;
    if (dr < 0.32) {
      zone = (bigPref && rnd < 0.7) || rnd < 0.62 ? T_COM : T_RES;
    } else if (dr < 0.65) {
      if (bigPref) zone = rnd < 0.45 ? T_COM : (rnd < 0.85 ? T_RES : T_IND);
      else zone = rnd < 0.6 ? T_RES : (rnd < 0.85 ? T_COM : T_IND);
    } else {
      if (bigPref) zone = rnd < 0.55 ? T_IND : T_RES;
      else zone = rnd < 0.55 ? T_RES : T_IND;
    }
    b.zone = zone;

    // 整個區塊（包含內部不貼路的）都標成同一個 zone
    // 但只有貼路的格子預設可長單戶住宅／商店；內部留給大型建案
    for (var k = 0; k < grassCells.length; k++) {
      var pp = grassCells[k];
      grid[pp.r][pp.c].type = zone;
      grid[pp.r][pp.c].variant = Math.floor(Math.random() * 6);
      grid[pp.r][pp.c].hue = (Math.random() - 0.5) * 30;
      grid[pp.r][pp.c].level = 0;
      if (adjToRoad(pp.r, pp.c)) {
        var tgt = 1 + Math.floor(Math.random() * 3);
        if (dr < 0.4 && zone === T_COM) tgt = 2 + Math.floor(Math.random() * 2);
        grid[pp.r][pp.c].targetLevel = tgt;
      } else {
        grid[pp.r][pp.c].targetLevel = 0; // 內部格：留給大型建案
      }
    }
  }
}

function placeMegaProjects() {
  // 較大的區塊（≥ 8 格）有機會放 2×2 或 2×3 大型建案
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.size < 8) continue;
    if (!b.zone) continue;
    // 嘗試放 1～2 個 mega
    var maxMegas = b.size >= 14 ? 2 : 1;
    for (var m = 0; m < maxMegas; m++) {
      placeOneMega(b);
    }
  }
}

function placeOneMega(b) {
  for (var tries = 0; tries < 40; tries++) {
    // 大小：2x2 / 2x3 / 3x2
    var roll = Math.random();
    var w, h;
    if (roll < 0.45) { w = 2; h = 2; }
    else if (roll < 0.75) { w = 2; h = 3; }
    else { w = 3; h = 2; }
    // 隨機選一個起始格（從 block.cells 中）
    var anchor = b.cells[Math.floor(Math.random() * b.cells.length)];
    var r0 = anchor.r, c0 = anchor.c;
    if (r0 + h - 1 >= ROWS || c0 + w - 1 >= COLS) continue;
    var ok = true;
    for (var dr = 0; dr < h && ok; dr++) {
      for (var dc = 0; dc < w && ok; dc++) {
        var rr = r0 + dr, cc = c0 + dc;
        var cell = grid[rr][cc];
        if (cell.type !== b.zone) { ok = false; break; }
        if (cell.megaId) { ok = false; break; }
      }
    }
    if (!ok) continue;
    // 標記
    var megaId = "M" + b.id + "_" + r0 + "_" + c0;
    for (var dr2 = 0; dr2 < h; dr2++) {
      for (var dc2 = 0; dc2 < w; dc2++) {
        grid[r0+dr2][c0+dc2].megaId = megaId;
        grid[r0+dr2][c0+dc2].megaAnchor = false;
        grid[r0+dr2][c0+dc2].targetLevel = 0;
      }
    }
    // Anchor 設在 (r0+h-1, c0+w-1) — 最前面那格
    var aR = r0 + h - 1, aC = c0 + w - 1;
    var aCell = grid[aR][aC];
    aCell.megaAnchor = true;
    aCell.megaW = w; aCell.megaH = h;
    aCell.megaR0 = r0; aCell.megaC0 = c0;
    aCell.variant = Math.floor(Math.random() * 4);
    aCell.hue = (Math.random() - 0.5) * 20;
    aCell.level = 0;
    aCell.targetLevel = b.zone === T_COM ? 3 : 2 + Math.floor(Math.random() * 2);
    stats.megas++;
    return true;
  }
  return false;
}

function adjToRoad(r, c) {
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (var i = 0; i < 4; i++) {
    var nr = r + dirs[i][0], nc = c + dirs[i][1];
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    if (grid[nr][nc].type === T_ROAD) return true;
  }
  return false;
}

function shuffleInPlace(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
}

// ── Tick ───────────────────────────────────────────────────────────────────

function tick() {
  if (revealIdx < revealOrder.length) {
    var item = revealOrder[revealIdx];
    var c = grid[item.r][item.c];
    c.builtAt = millis();
    if (item.kind === "road") stats.roads++;
    else if (item.kind === "service") stats.services++;
    else if (item.kind === "zone") {
      stats.zones++;
      // 加入 growthList：單戶（非 mega 且 targetLevel>0）或 mega anchor
      if ((c.type === T_RES || c.type === T_COM || c.type === T_IND)) {
        if (!c.megaId && c.targetLevel > 0) {
          growthList.push({ r: item.r, c: item.c });
        } else if (c.megaAnchor) {
          growthList.push({ r: item.r, c: item.c });
        }
      }
    }
    revealIdx++;
    return;
  }
  if (growthIdx < growthList.length) {
    var gi = growthList[growthIdx];
    var cell = grid[gi.r][gi.c];
    if (cell.level < cell.targetLevel) {
      cell.level++;
      stats.builds++;
      cell.builtAt = millis();
    }
    growthIdx++;
    if (growthIdx >= growthList.length) {
      var stillGrowing = false;
      for (var kk = 0; kk < growthList.length; kk++) {
        var c2 = grid[growthList[kk].r][growthList[kk].c];
        if (c2.level < c2.targetLevel) { stillGrowing = true; break; }
      }
      if (stillGrowing) growthIdx = 0;
      else {
        phase = "evolving";
        phaseStart = millis();
      }
    }
    return;
  }
}

function evolveTick() {
  // 1. 升級未滿的建築 / 2. 老舊拆遷 / 3. 翻新外觀
  if (growthList.length === 0) return;
  var tries = 24;
  while (tries-- > 0) {
    var idx = Math.floor(Math.random() * growthList.length);
    var gi = growthList[idx];
    var cell = grid[gi.r][gi.c];

    // (a) 還沒到目標 → 升級
    if (cell.level < cell.targetLevel) {
      cell.level++;
      cell.builtAt = millis();
      stats.builds++;
      return;
    }

    // (b) 拆遷重蓋：建築存在夠久（>14 秒），有機率被拆
    //     大型建案維護成本高 → 更易拆；單戶機率低
    var age = millis() - cell.builtAt;
    if (age > 14000) {
      var demoChance = cell.megaAnchor ? 0.18 : 0.06;
      if (Math.random() < demoChance) {
        cell.demolishedAt = millis();
        cell.level = 0;
        cell.targetLevel = cell.megaAnchor
          ? (cell.type === T_COM ? 3 : 2 + Math.floor(Math.random() * 2))
          : (1 + Math.floor(Math.random() * 3));
        cell.variant = Math.floor(Math.random() * 6);
        cell.hue = (Math.random() - 0.5) * 30;
        cell.builtAt = millis();
        stats.demos++;
        return;
      }
    }

    // (c) 翻新外觀（不拆，換 variant）
    if (Math.random() < 0.10) {
      cell.variant = Math.floor(Math.random() * 6);
      cell.hue = (Math.random() - 0.5) * 30;
      cell.builtAt = millis();
      return;
    }
  }
}

function recomputeEconomy() {
  // 人口 / 稅收 / 政府支出
  var pop = 0, income = 0, spending = 0;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var cell = grid[r][c];
      // 道路 / 公園 / 公家單位也有維護成本（與 level 無關）
      if (cell.revealAt >= 0 && cell.revealAt < revealIdx) {
        if (cell.type === T_ROAD) spending += 0.4;
        else if (cell.type === T_POLICE)    spending += 9;
        else if (cell.type === T_FIRE)      spending += 9;
        else if (cell.type === T_HOSPITAL)  spending += 14;
        else if (cell.type === T_SCHOOL)    spending += 7;
        else if (cell.type === T_CITY_HALL) spending += 6;
        else if (cell.type === T_POWER)     spending += 11;
        else if (cell.type === T_GARBAGE)   spending += 8;
        else if (cell.type === T_PARK)      spending += 2.5;
      }
      if (cell.megaId && !cell.megaAnchor) continue;
      if (cell.level <= 0) continue;
      var multiplier = 1;
      if (cell.megaAnchor) multiplier = cell.megaW * cell.megaH * 1.5;
      var lvl = cell.level;
      if (cell.type === T_RES) {
        var popPer = lvl === 1 ? 6 : lvl === 2 ? 18 : 48;
        pop += popPer * multiplier;
        income += (lvl * 0.5) * multiplier;
      } else if (cell.type === T_COM) {
        var taxPer = lvl === 1 ? 3 : lvl === 2 ? 11 : 32;
        income += taxPer * multiplier;
      } else if (cell.type === T_IND) {
        var taxPerI = lvl === 1 ? 4 : lvl === 2 ? 13 : 28;
        income += taxPerI * multiplier;
      }
    }
  }
  // 民眾福利 / 警消每千人成本
  spending += pop * 0.012;
  stats.population = Math.floor(pop);
  stats.income = Math.max(0, Math.floor(income));
  stats.spending = Math.max(0, Math.floor(spending));
}

// ── 天氣 / 日夜 ─────────────────────────────────────────────────────────────

function weatherTick() {
  var now = millis();
  var elapsed = now - weatherStart;
  if (elapsed >= weatherDur) {
    prevWeather = weather;
    weatherIdx = (weatherIdx + 1) % WEATHERS.length;
    weather = WEATHERS[weatherIdx];
    weatherStart = now;
    if (weather === "NIGHT") initStars();
    if (weather !== "RAIN") rainDrops = [];
    elapsed = 0;
  }
  // 切換後的前 weatherFade ms 從前一個天氣 lerp 過來
  var fade = prevWeather ? Math.min(1, elapsed / weatherFade) : 1;
  applyWeatherVisuals(fade, prevWeather);
}

function applyWeatherVisuals(fade, prevW) {
  var cur = WEATHER_INFO[weather];
  if (!prevW || fade >= 1) {
    currentSky = cur.sky;
    currentAmbient = cur.ambient;
    currentWindowCol = cur.win;
    currentGrass = cur.grass;
    currentRoad = cur.road;
    return;
  }
  var prev = WEATHER_INFO[prevW];
  currentSky = lerpHex(prev.sky, cur.sky, fade);
  currentAmbient = lerpAmbient(prev.ambient, cur.ambient, fade);
  currentWindowCol = lerpHex(prev.win, cur.win, fade);
  currentGrass = lerpHex(prev.grass, cur.grass, fade);
  currentRoad = lerpHex(prev.road, cur.road, fade);
}

function lerpHex(a, b, t) {
  var ar = parseColor(a), br = parseColor(b);
  var r = Math.round(ar[0] + (br[0] - ar[0]) * t);
  var g = Math.round(ar[1] + (br[1] - ar[1]) * t);
  var bb = Math.round(ar[2] + (br[2] - ar[2]) * t);
  return "rgb(" + r + "," + g + "," + bb + ")";
}

function parseColor(col) {
  if (col.charAt(0) === "#") return hexRGB(col);
  var m = col.match(/(\d+)/g);
  return [+m[0], +m[1], +m[2]];
}

function lerpAmbient(a, b, t) {
  if (!a && !b) return null;
  var pa = a ? parseRGBA(a) : [0,0,0,0];
  var pb = b ? parseRGBA(b) : [0,0,0,0];
  var r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  var g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  var bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  var aa = pa[3] + (pb[3] - pa[3]) * t;
  return "rgba(" + r + "," + g + "," + bl + "," + aa.toFixed(3) + ")";
}

function parseRGBA(s) {
  var m = s.match(/(\d+(?:\.\d+)?)/g);
  return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1];
}

function drawSky() {
  // 先用 currentSky 鋪整個 canvas，避免邊緣留白
  noStroke();
  fill(currentSky);
  rect(0, 0, canvasW, canvasH);
  // 漸層條：上深下淺
  var top = shade(currentSky, 0.7);
  var bot = shade(currentSky, 1.05);
  for (var y = 0; y < canvasH; y += 6) {
    var t = y / canvasH;
    fill(lerpHex(top, bot, t));
    rect(0, y, canvasW, 7);
  }
  // 太陽 / 月亮
  drawCelestial();
}

function drawCelestial() {
  if (weather === "NIGHT") {
    // 月亮
    var mx = canvasW - 56, my = 56;
    noStroke();
    fill(255, 245, 200, 60); ellipse(mx, my, 56, 56);
    fill(255, 245, 200, 100); ellipse(mx, my, 40, 40);
    fill(255, 248, 215); ellipse(mx, my, 28, 28);
    fill(220, 218, 195);
    ellipse(mx - 5, my - 4, 6, 6);
    ellipse(mx + 4, my + 5, 4, 4);
    // 星星
    drawStars();
  } else if (weather === "SUNNY") {
    var sx = canvasW - 56, sy = 50;
    noStroke();
    fill(255, 235, 150, 60); ellipse(sx, sy, 60, 60);
    fill(255, 230, 130, 100); ellipse(sx, sy, 44, 44);
    fill(255, 220, 100); ellipse(sx, sy, 30, 30);
  } else if (weather === "CLOUDY" || weather === "RAIN") {
    // 雲
    var baseY = 50;
    fill(weather === "RAIN" ? "rgba(60,70,85,0.85)" : "rgba(220,225,235,0.85)");
    noStroke();
    drawCloud(canvasW - 100, baseY, 50);
    drawCloud(canvasW - 40, baseY + 10, 38);
    drawCloud(canvasW - 170, baseY + 18, 32);
    if (weather === "RAIN") {
      fill("rgba(45,55,70,0.85)");
      drawCloud(60, baseY + 5, 42);
      drawCloud(140, baseY + 18, 32);
    }
  }
}

function drawCloud(cx, cy, w) {
  ellipse(cx - w * 0.4, cy + 3, w * 0.7, w * 0.55);
  ellipse(cx, cy, w, w * 0.7);
  ellipse(cx + w * 0.45, cy + 5, w * 0.65, w * 0.55);
}

function initStars() {
  stars = [];
  for (var i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * canvasW,
      y: Math.random() * (canvasH * 0.45),
      sz: 0.8 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function drawStars() {
  for (var i = 0; i < stars.length; i++) {
    var st = stars[i];
    var tw = 0.5 + 0.5 * Math.sin(millis() * 0.003 + st.phase);
    noStroke();
    fill(255, 255, 220, 100 + tw * 130);
    ellipse(st.x, st.y, st.sz, st.sz);
  }
}

function drawWeatherOverlay() {
  if (!currentAmbient) return;
  noStroke();
  fill(currentAmbient);
  rect(0, 0, canvasW, canvasH);
}

function updateRain() {
  // 每幀生成幾滴
  var add = 5 + Math.floor(Math.random() * 4);
  for (var i = 0; i < add; i++) {
    rainDrops.push({
      x: Math.random() * (canvasW + 100),
      y: -10,
      vx: -2.2,
      vy: 9 + Math.random() * 4,
      len: 7 + Math.random() * 6,
    });
  }
  for (var j = rainDrops.length - 1; j >= 0; j--) {
    var d = rainDrops[j];
    d.x += d.vx; d.y += d.vy;
    if (d.y > canvasH || d.x < -20) rainDrops.splice(j, 1);
  }
}

function drawRain() {
  stroke(190, 215, 245, 170);
  strokeWeight(1.2);
  for (var i = 0; i < rainDrops.length; i++) {
    var d = rainDrops[i];
    line(d.x, d.y, d.x - d.vx * 0.6, d.y - d.len);
  }
  noStroke();
}

function maybeLightning() {
  // 偶爾閃電：螢幕短暫變亮
  if (Math.random() < 0.0025) {
    lightnings.push({ at: millis(), alpha: 180 });
  }
  for (var i = lightnings.length - 1; i >= 0; i--) {
    var l = lightnings[i];
    var elapsed = millis() - l.at;
    if (elapsed > 180) { lightnings.splice(i, 1); continue; }
    var a = l.alpha * (1 - elapsed / 180);
    noStroke(); fill(255, 255, 240, a);
    rect(0, 0, canvasW, canvasH);
  }
}

// ── Iso projection helpers ─────────────────────────────────────────────────

function cellPx(r, c) {
  return {
    x: originX + (c - r) * ISO_W / 2,
    y: originY + (c + r) * ISO_H / 2,
  };
}

function quadPts(a, b, c, d) {
  beginShape();
  vertex(a.x, a.y); vertex(b.x, b.y); vertex(c.x, c.y); vertex(d.x, d.y);
  endShape(CLOSE);
}

function drawIsoTile(p, w, h, color, edgeColor) {
  var hw = w / 2, hh = h / 2;
  noStroke();
  fill(color);
  beginShape();
  vertex(p.x, p.y - hh);
  vertex(p.x + hw, p.y);
  vertex(p.x, p.y + hh);
  vertex(p.x - hw, p.y);
  endShape(CLOSE);
  if (edgeColor) {
    stroke(edgeColor); strokeWeight(1); noFill();
    beginShape();
    vertex(p.x, p.y - hh);
    vertex(p.x + hw, p.y);
    vertex(p.x, p.y + hh);
    vertex(p.x - hw, p.y);
    endShape(CLOSE);
    noStroke();
  }
}

function drawIsoBox(p, w, h, hgt, topCol, rightCol, leftCol) {
  var hw = w / 2, hh = h / 2;
  var bTop = { x: p.x, y: p.y - hh };
  var bRgt = { x: p.x + hw, y: p.y };
  var bBot = { x: p.x, y: p.y + hh };
  var bLft = { x: p.x - hw, y: p.y };
  var uTop = { x: bTop.x, y: bTop.y - hgt };
  var uRgt = { x: bRgt.x, y: bRgt.y - hgt };
  var uBot = { x: bBot.x, y: bBot.y - hgt };
  var uLft = { x: bLft.x, y: bLft.y - hgt };
  noStroke();
  fill(rightCol);  quadPts(bRgt, bBot, uBot, uRgt);
  fill(leftCol);   quadPts(bLft, bBot, uBot, uLft);
  fill(topCol);    quadPts(uTop, uRgt, uBot, uLft);
  return { bTop: bTop, bRgt: bRgt, bBot: bBot, bLft: bLft, uTop: uTop, uRgt: uRgt, uBot: uBot, uLft: uLft };
}

// 大型建案：rectangular footprint spanning w*h cells (in grid space)
function drawIsoMegaBox(r0, c0, w, h, hgt, topCol, rightCol, leftCol, inset) {
  var pTL = cellPx(r0, c0);
  var pTR = cellPx(r0, c0 + w - 1);
  var pBR = cellPx(r0 + h - 1, c0 + w - 1);
  var pBL = cellPx(r0 + h - 1, c0);
  var bTop = { x: pTL.x, y: pTL.y - ISO_H / 2 };
  var bRgt = { x: pTR.x + ISO_W / 2, y: pTR.y };
  var bBot = { x: pBR.x, y: pBR.y + ISO_H / 2 };
  var bLft = { x: pBL.x - ISO_W / 2, y: pBL.y };
  if (typeof inset === "undefined") inset = 0.10;
  var cx = (bTop.x + bBot.x) / 2;
  var cy = (bTop.y + bBot.y) / 2;
  function ins(pt) {
    return { x: pt.x + (cx - pt.x) * inset, y: pt.y + (cy - pt.y) * inset };
  }
  bTop = ins(bTop); bRgt = ins(bRgt); bBot = ins(bBot); bLft = ins(bLft);
  var uTop = { x: bTop.x, y: bTop.y - hgt };
  var uRgt = { x: bRgt.x, y: bRgt.y - hgt };
  var uBot = { x: bBot.x, y: bBot.y - hgt };
  var uLft = { x: bLft.x, y: bLft.y - hgt };
  noStroke();
  fill(rightCol);  quadPts(bRgt, bBot, uBot, uRgt);
  fill(leftCol);   quadPts(bLft, bBot, uBot, uLft);
  fill(topCol);    quadPts(uTop, uRgt, uBot, uLft);
  return { bTop: bTop, bRgt: bRgt, bBot: bBot, bLft: bLft, uTop: uTop, uRgt: uRgt, uBot: uBot, uLft: uLft };
}

function drawFaceWindows(box, face, cols, rows, winCol) {
  if (cols <= 0 || rows <= 0) return;
  var p0, u, v;
  if (face === "R") {
    p0 = box.bRgt;
    u = { x: box.bBot.x - box.bRgt.x, y: box.bBot.y - box.bRgt.y };
    v = { x: box.uRgt.x - box.bRgt.x, y: box.uRgt.y - box.bRgt.y };
  } else {
    p0 = box.bLft;
    u = { x: box.bBot.x - box.bLft.x, y: box.bBot.y - box.bLft.y };
    v = { x: box.uLft.x - box.bLft.x, y: box.uLft.y - box.bLft.y };
  }
  var padU = 0.10, padV = 0.08;
  var stepU = (1 - 2 * padU) / cols;
  var stepV = (1 - 2 * padV) / rows;
  var winW = stepU * 0.66;
  var winH = stepV * 0.62;
  fill(winCol);
  noStroke();
  for (var rr = 0; rr < rows; rr++) {
    for (var cc = 0; cc < cols; cc++) {
      var uu = padU + cc * stepU + (stepU - winW) / 2;
      var vv = padV + rr * stepV + (stepV - winH) / 2;
      var p1 = { x: p0.x + uu * u.x + vv * v.x, y: p0.y + uu * u.y + vv * v.y };
      var p2 = { x: p1.x + winW * u.x, y: p1.y + winW * u.y };
      var p3 = { x: p2.x + winH * v.x, y: p2.y + winH * v.y };
      var p4 = { x: p1.x + winH * v.x, y: p1.y + winH * v.y };
      quadPts(p1, p2, p3, p4);
    }
  }
}

function drawRoofBox(box, ou, ov, sizeU, sizeV, hgt, topCol, rightCol, leftCol) {
  var p0 = box.uTop;
  var ru = { x: box.uRgt.x - box.uTop.x, y: box.uRgt.y - box.uTop.y };
  var rv = { x: box.uLft.x - box.uTop.x, y: box.uLft.y - box.uTop.y };
  function pt(uu, vv) { return { x: p0.x + uu * ru.x + vv * rv.x, y: p0.y + uu * ru.y + vv * rv.y }; }
  var bTop = pt(ou, ov);
  var bRgt = pt(ou + sizeU, ov);
  var bBot = pt(ou + sizeU, ov + sizeV);
  var bLft = pt(ou, ov + sizeV);
  var uTop = { x: bTop.x, y: bTop.y - hgt };
  var uRgt = { x: bRgt.x, y: bRgt.y - hgt };
  var uBot = { x: bBot.x, y: bBot.y - hgt };
  var uLft = { x: bLft.x, y: bLft.y - hgt };
  noStroke();
  fill(rightCol); quadPts(bRgt, bBot, uBot, uRgt);
  fill(leftCol);  quadPts(bLft, bBot, uBot, uLft);
  fill(topCol);   quadPts(uTop, uRgt, uBot, uLft);
  return { bRgt: bRgt, bBot: bBot, bLft: bLft, uTop: uTop, uRgt: uRgt, uBot: uBot, uLft: uLft };
}

// ── Draw main ──────────────────────────────────────────────────────────────

function draw() {
  // 天氣切換 / 視覺漸層
  weatherTick();

  // 漸層天空背景
  drawSky();

  if (phase === "building") {
    while (millis() - lastTickTime > tickInterval) {
      tick();
      lastTickTime += tickInterval;
      if (phase === "evolving") break;
    }
  } else if (phase === "evolving") {
    while (millis() - lastEvolveTime > evolveInterval) {
      evolveTick();
      lastEvolveTime += evolveInterval;
    }
  }

  // 經濟 / 稅收：每幀累加（用 deltaTime / 1000 縮放成每秒）
  recomputeEconomy();
  var dt = deltaTime / 1000;
  stats.tax += stats.income * dt;
  stats.expense += stats.spending * dt;

  // 車流
  updateCars();
  if (revealIdx > revealOrder.length * 0.2) {
    if (millis() - lastCarSpawn > carSpawnInterval) {
      spawnCar();
      lastCarSpawn = millis();
    }
  }

  drawGrassBackground();

  // 把車子依「最前面那格」分到對應的 diagonal，與 tile 在同一條對角線上交錯繪製，
  // 後方車流→道路→車子→更前面的建築 順序，車子才不會蓋過大樓
  var carsByDiag = {};
  for (var ci = 0; ci < cars.length; ci++) {
    var dep = Math.max(cars[ci].r + cars[ci].c, cars[ci].nr + cars[ci].nc);
    if (!carsByDiag[dep]) carsByDiag[dep] = [];
    carsByDiag[dep].push(cars[ci]);
  }

  // 依 (r+c) 由小到大 back-to-front
  for (var s = 0; s <= ROWS + COLS - 2; s++) {
    var rMin = Math.max(0, s - (COLS - 1));
    var rMax = Math.min(ROWS - 1, s);
    for (var r = rMin; r <= rMax; r++) {
      var c = s - r;
      var cell = grid[r][c];
      if (cell.revealAt < 0 || cell.revealAt >= revealIdx) continue;
      var t = cell.type;
      // 非 anchor 的 mega 格：跳過
      if (cell.megaId && !cell.megaAnchor) continue;

      if (t === T_ROAD) drawRoad(r, c);
      else if (t === T_PARK) drawPark(r, c, cell);
      else if (t >= 20 && t <= 26) drawService(r, c, cell);
      else if (cell.megaAnchor) drawMega(r, c, cell);
      else if (t === T_RES) drawResidential(r, c, cell);
      else if (t === T_COM) drawCommercial(r, c, cell);
      else if (t === T_IND) drawIndustrial(r, c, cell);
    }
    // 同一條對角線上的所有 tile 畫完後，畫該對角線上的車子
    // → 後續更前面 diagonal 的建築會在車子之上繪製，正確覆蓋
    var carsHere = carsByDiag[s];
    if (carsHere) {
      for (var k = 0; k < carsHere.length; k++) drawCar(carsHere[k]);
    }
  }

  // 天氣覆蓋層（夜晚色調 / 雨幕 / 烏雲 tint）
  drawWeatherOverlay();
  // 雨滴 / 閃電（在覆蓋層之上，hud 之下）
  if (weather === "RAIN") { updateRain(); drawRain(); maybeLightning(); }

  drawHud();
}

function drawGrassBackground() {
  var pTL = cellPx(0, 0);
  var pTR = cellPx(0, COLS - 1);
  var pBL = cellPx(ROWS - 1, 0);
  var pBR = cellPx(ROWS - 1, COLS - 1);
  var vTop = { x: pTL.x, y: pTL.y - ISO_H / 2 };
  var vRgt = { x: pTR.x + ISO_W / 2, y: pTR.y };
  var vBot = { x: pBR.x, y: pBR.y + ISO_H / 2 };
  var vLft = { x: pBL.x - ISO_W / 2, y: pBL.y };
  noStroke();
  // 陰影
  fill(0, 0, 0, 50);
  quadPts(
    { x: vTop.x + 3, y: vTop.y + 4 },
    { x: vRgt.x + 3, y: vRgt.y + 4 },
    { x: vBot.x + 3, y: vBot.y + 4 },
    { x: vLft.x + 3, y: vLft.y + 4 }
  );
  fill(currentGrass);
  quadPts(vTop, vRgt, vBot, vLft);
  fill(shade(currentGrass, 0.82));
  for (var i = 0; i < 60; i++) {
    var rr = Math.random() * ROWS;
    var cc = Math.random() * COLS;
    var pp = cellPx(rr, cc);
    rect(pp.x, pp.y, 2, 1);
  }
}

// ── Roads ──────────────────────────────────────────────────────────────────

function isRoad(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  if (grid[r][c].revealAt < 0 || grid[r][c].revealAt >= revealIdx) return false;
  return grid[r][c].type === T_ROAD;
}

function drawRoad(r, c) {
  var p = cellPx(r, c);
  drawIsoTile(p, ISO_W, ISO_H, currentRoad, null);
  var nN = isRoad(r - 1, c), nS = isRoad(r + 1, c), nE = isRoad(r, c + 1), nW = isRoad(r, c - 1);
  var lw = Math.max(1, ISO_H * 0.10);
  if (nN || nS) drawRoadStripe(p, "NS", lw);
  if (nE || nW) drawRoadStripe(p, "EW", lw);
}

function drawRoadStripe(p, axis, lw) {
  push();
  translate(p.x, p.y);
  var ang = axis === "NS" ? Math.atan2(ISO_H, -ISO_W) : Math.atan2(ISO_H, ISO_W);
  rotate(ang);
  var halfLen = Math.sqrt(ISO_W * ISO_W + ISO_H * ISO_H) / 2;
  noStroke();
  fill(PALETTE.roadLine);
  var dashes = 3;
  var dashStep = (2 * halfLen) / dashes;
  for (var i = 0; i < dashes; i++) {
    var x0 = -halfLen + i * dashStep + dashStep * 0.2;
    rect(x0, -lw / 2, dashStep * 0.6, lw);
  }
  pop();
}

// ── Cars / Traffic ─────────────────────────────────────────────────────────

function roadNeighbors(r, c) {
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  var ns = [];
  for (var i = 0; i < 4; i++) {
    var nr = r + dirs[i][0], nc = c + dirs[i][1];
    if (isRoad(nr, nc)) ns.push({ r: nr, c: nc });
  }
  return ns;
}

function spawnCar() {
  if (cars.length >= MAX_CARS) return;
  var attempts = 0;
  while (attempts < 30) {
    attempts++;
    var r = Math.floor(Math.random() * ROWS);
    var c = Math.floor(Math.random() * COLS);
    if (!isRoad(r, c)) continue;
    var ns = roadNeighbors(r, c);
    if (ns.length === 0) continue;
    var nb = ns[Math.floor(Math.random() * ns.length)];
    cars.push({
      r: r, c: c, nr: nb.r, nc: nb.c, progress: 0,
      speed: 0.018 + Math.random() * 0.018,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    });
    break;
  }
}

function updateCars() {
  for (var i = cars.length - 1; i >= 0; i--) {
    var car = cars[i];
    car.progress += car.speed;
    if (car.progress >= 1) {
      car.progress -= 1;
      var dr = car.nr - car.r;
      var dc = car.nc - car.c;
      car.r = car.nr;
      car.c = car.nc;
      // 試圖直行
      var sr = car.r + dr, sc = car.c + dc;
      if (isRoad(sr, sc)) {
        car.nr = sr; car.nc = sc;
      } else {
        // 換方向（不 U-turn）
        var ns = roadNeighbors(car.r, car.c).filter(function(n) {
          return !(n.r === car.r - dr && n.c === car.c - dc);
        });
        if (ns.length === 0) {
          // 死巷 → U-turn
          car.nr = car.r - dr; car.nc = car.c - dc;
        } else {
          var pick = ns[Math.floor(Math.random() * ns.length)];
          car.nr = pick.r; car.nc = pick.c;
        }
      }
    }
  }
}

function drawCar(car) {
  var p1 = cellPx(car.r, car.c);
  var p2 = cellPx(car.nr, car.nc);
  var t = car.progress;
  var x = p1.x + (p2.x - p1.x) * t;
  var y = p1.y + (p2.y - p1.y) * t;
  var dx = p2.x - p1.x, dy = p2.y - p1.y;
  var ang = Math.atan2(dy, dx);
  push();
  translate(x, y);
  rotate(ang);
  noStroke();
  var bodyW = ISO_W * 0.32, bodyH = ISO_W * 0.16;
  fill(0, 0, 0, 90);
  rect(-bodyW / 2 + 1, -bodyH / 2 + 2, bodyW, bodyH, 2);
  fill(car.color);
  rect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 2);
  fill("#1a1a1a");
  rect(bodyW * 0.05, -bodyH * 0.35, bodyW * 0.32, bodyH * 0.70, 1);
  // 頭燈（前方兩個小亮點）
  fill("#fff7c2");
  ellipse(bodyW * 0.42, -bodyH * 0.28, 2, 2);
  ellipse(bodyW * 0.42,  bodyH * 0.28, 2, 2);
  pop();
}

// ── Buildings ──────────────────────────────────────────────────────────────

function drawShadowTile(p, sx, sy) {
  noStroke();
  fill(0, 0, 0, 70);
  var hw = ISO_W * 0.42, hh = ISO_H * 0.42;
  var cx = p.x + sx, cy = p.y + sy;
  beginShape();
  vertex(cx, cy - hh); vertex(cx + hw, cy); vertex(cx, cy + hh); vertex(cx - hw, cy);
  endShape(CLOSE);
}

function drawPlot(p, color, demolishedAt) {
  var w = ISO_W * 0.85, h = ISO_H * 0.85;
  drawIsoTile(p, w, h, color, "rgba(0,0,0,0.5)");
  stroke(255, 255, 255, 90); strokeWeight(1);
  var hw = w / 2, hh = h / 2;
  line(p.x - hw * 0.7, p.y, p.x + hw * 0.7, p.y);
  line(p.x, p.y - hh * 0.7, p.x, p.y + hh * 0.7);
  noStroke();
  // 拆遷工地：黃黑警戒帶 + 灰塵
  if (demolishedAt && millis() - demolishedAt < 5000) {
    var age = (millis() - demolishedAt) / 5000;
    // 黃黑斜紋
    var alpha = 220 * (1 - age);
    var stripes = 5;
    for (var i = 0; i < stripes; i++) {
      fill(i % 2 === 0 ? [240, 200, 30, alpha] : [20, 20, 20, alpha]);
      noStroke();
      var t = i / stripes;
      var t2 = (i + 1) / stripes;
      var y1 = p.y - hh + t * (2 * hh);
      var y2 = p.y - hh + t2 * (2 * hh);
      rect(p.x - hw * 0.3, y1, hw * 0.6, y2 - y1);
    }
    // 灰塵粒子
    fill(220, 215, 200, 180 * (1 - age));
    for (var d = 0; d < 8; d++) {
      var dx = (Math.random() - 0.5) * w * 0.8;
      var dy = (Math.random() - 0.5) * h * 0.8;
      ellipse(p.x + dx, p.y + dy - age * 8, 4, 3);
    }
  }
}

function drawResidential(r, c, cell) {
  var p = cellPx(r, c);
  var lvl = cell.level;
  if (lvl === 0) { drawPlot(p, "#a8b878", cell.demolishedAt); return; }
  drawShadowTile(p, ISO_W * 0.10, ISO_H * 0.10);
  var wall = PALETTE.resWalls[cell.variant % PALETTE.resWalls.length];
  var roof = PALETTE.resRoofs[cell.variant % PALETTE.resRoofs.length];
  wall = hueShift(wall, cell.hue);
  var fw = ISO_W * 0.82, fh = ISO_H * 0.82;
  var hgt = ISO_W * (lvl === 1 ? 0.45 : lvl === 2 ? 0.90 : 1.40);
  var box = drawIsoBox(p, fw, fh, hgt, roof, shade(wall, 0.92), shade(wall, 0.66));
  drawRoofBox(box, 0.0, 0.0, 1.0, 1.0, 0, roof, shade(roof, 0.85), shade(roof, 0.62));
  var winCol = currentWindowCol;
  if (lvl === 1) {
    drawFaceWindows(box, "R", 2, 1, winCol);
    drawFaceWindows(box, "L", 2, 1, winCol);
  } else if (lvl === 2) {
    drawFaceWindows(box, "R", 2, 2, winCol);
    drawFaceWindows(box, "L", 2, 2, winCol);
  } else {
    drawFaceWindows(box, "R", 3, 4, winCol);
    drawFaceWindows(box, "L", 3, 4, winCol);
  }
  if (lvl === 1) {
    drawRoofBox(box, 0.62, 0.18, 0.18, 0.18, ISO_W * 0.22,
                shade(roof, 0.5), shade(roof, 0.4), shade(roof, 0.28));
  }
  if (lvl === 3) {
    drawRoofBox(box, 0.30, 0.30, 0.30, 0.30, ISO_W * 0.16,
                "#bdc3c7", "#95a5a6", "#7f8c8d");
  }
}

function drawCommercial(r, c, cell) {
  var p = cellPx(r, c);
  var lvl = cell.level;
  if (lvl === 0) { drawPlot(p, "#a8c4d8", cell.demolishedAt); return; }
  drawShadowTile(p, ISO_W * 0.10, ISO_H * 0.10);
  var wall = PALETTE.comWalls[cell.variant % PALETTE.comWalls.length];
  var glass = PALETTE.comGlass[cell.variant % PALETTE.comGlass.length];
  var roof = PALETTE.comRoofs[cell.variant % PALETTE.comRoofs.length];
  wall = hueShift(wall, cell.hue);
  var fw = ISO_W * 0.82, fh = ISO_H * 0.82;
  var hgt = ISO_W * (lvl === 1 ? 0.50 : lvl === 2 ? 1.10 : 1.55);
  if (lvl === 3) { fw = ISO_W * 0.72; fh = ISO_H * 0.72; }
  var box = drawIsoBox(p, fw, fh, hgt, roof, shade(wall, 0.92), shade(wall, 0.66));
  var gwin = weather === "NIGHT" ? currentWindowCol : glass;
  if (lvl === 1) {
    drawFaceWindows(box, "R", 3, 1, gwin);
    drawFaceWindows(box, "L", 3, 1, gwin);
    drawRoofBox(box, 0.05, 0.05, 0.9, 0.9, ISO_W * 0.10, glass, shade(glass, 0.85), shade(glass, 0.6));
  } else if (lvl === 2) {
    drawFaceWindows(box, "R", 3, 4, gwin);
    drawFaceWindows(box, "L", 3, 4, gwin);
  } else {
    drawFaceWindows(box, "R", 3, 6, gwin);
    drawFaceWindows(box, "L", 3, 6, gwin);
    drawRoofBox(box, 0.40, 0.40, 0.15, 0.15, ISO_W * 0.35, "#aaa", "#888", "#666");
  }
}

function drawIndustrial(r, c, cell) {
  var p = cellPx(r, c);
  var lvl = cell.level;
  if (lvl === 0) { drawPlot(p, "#a89880", cell.demolishedAt); return; }
  drawShadowTile(p, ISO_W * 0.10, ISO_H * 0.10);
  var wall = PALETTE.indWalls[cell.variant % PALETTE.indWalls.length];
  var roof = PALETTE.indRoofs[cell.variant % PALETTE.indRoofs.length];
  wall = hueShift(wall, cell.hue);
  var fw = ISO_W * 0.86, fh = ISO_H * 0.86;
  var hgt = ISO_W * (lvl === 1 ? 0.42 : lvl === 2 ? 0.62 : 0.85);
  var box = drawIsoBox(p, fw, fh, hgt, roof, shade(wall, 0.90), shade(wall, 0.64));
  drawFaceWindows(box, "R", 4, 1, currentWindowCol);
  drawFaceWindows(box, "L", 4, 1, currentWindowCol);
  if (lvl >= 1) {
    var chmH = ISO_W * (lvl === 1 ? 0.30 : lvl === 2 ? 0.40 : 0.65);
    drawRoofBox(box, 0.65, 0.15, 0.14, 0.14, chmH, "#3e342a", "#2c241c", "#1e1812");
    var ou = 0.72, ov = 0.22;
    var smkX = box.uTop.x + (box.uRgt.x - box.uTop.x) * ou + (box.uLft.x - box.uTop.x) * ov;
    var smkY = box.uTop.y + (box.uRgt.y - box.uTop.y) * ou + (box.uLft.y - box.uTop.y) * ov - chmH;
    fill(255, 255, 255, 150); noStroke();
    ellipse(smkX, smkY - ISO_W * 0.06, ISO_W * 0.18, ISO_W * 0.12);
    ellipse(smkX + ISO_W * 0.06, smkY - ISO_W * 0.16, ISO_W * 0.14, ISO_W * 0.10);
  }
  if (lvl === 3) {
    var tnk = drawRoofBox(box, 0.20, 0.55, 0.32, 0.32, ISO_W * 0.32, "#aaa", "#888", "#666");
    fill("#999"); noStroke();
    ellipse(
      tnk.uTop.x + (tnk.uRgt.x - tnk.uTop.x) * 0.5 + (tnk.uLft.x - tnk.uTop.x) * 0.5,
      tnk.uTop.y + (tnk.uRgt.y - tnk.uTop.y) * 0.5 + (tnk.uLft.y - tnk.uTop.y) * 0.5,
      ISO_W * 0.20, ISO_H * 0.18
    );
  }
}

// 大型建案：依 zone 分派
function drawMega(r, c, cell) {
  var r0 = cell.megaR0, c0 = cell.megaC0;
  var w = cell.megaW, h = cell.megaH;
  if (cell.level === 0) {
    // mega 工地：畫一個 large flat plot
    drawMegaPlot(r0, c0, w, h, cell.type === T_COM ? "#a8c4d8" : cell.type === T_IND ? "#a89880" : "#a8b878", cell.demolishedAt);
    return;
  }
  // 大型建案陰影
  drawMegaShadow(r0, c0, w, h);
  if (cell.type === T_RES) drawMegaResidential(r0, c0, w, h, cell);
  else if (cell.type === T_COM) drawMegaCommercial(r0, c0, w, h, cell);
  else if (cell.type === T_IND) drawMegaIndustrial(r0, c0, w, h, cell);
}

function drawMegaPlot(r0, c0, w, h, color, demolishedAt) {
  // 直接畫一個大菱形
  var box = drawIsoMegaBox(r0, c0, w, h, 0, color, color, color, 0.06);
  // 工地線條
  stroke(255, 255, 255, 110); strokeWeight(1);
  line(box.bLft.x, box.bLft.y, box.bRgt.x, box.bRgt.y);
  line(box.bTop.x, box.bTop.y, box.bBot.x, box.bBot.y);
  noStroke();
  // 拆遷工地：黃黑警戒帶 + 粉塵
  if (demolishedAt && millis() - demolishedAt < 6000) {
    var age = (millis() - demolishedAt) / 6000;
    var alpha = 220 * (1 - age);
    // 中心位置（用 box 對角線中心）
    var cx = (box.bLft.x + box.bRgt.x) / 2;
    var cy = (box.bTop.y + box.bBot.y) / 2;
    // 黃黑斜紋
    var dxAxis = (box.bRgt.x - box.bLft.x) / 6;
    var dyAxis = (box.bRgt.y - box.bLft.y) / 6;
    for (var i = -2; i <= 2; i++) {
      fill(i % 2 === 0 ? [240, 200, 30, alpha] : [20, 20, 20, alpha]);
      noStroke();
      var sx = cx + dxAxis * i, sy = cy + dyAxis * i;
      var sz = ISO_W * 0.18;
      ellipse(sx, sy, sz, sz * 0.5);
    }
    // 灰塵
    fill(220, 215, 200, 180 * (1 - age));
    for (var d = 0; d < 16; d++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = Math.random() * ISO_W * 0.6;
      ellipse(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.5 - age * 12, 5, 4);
    }
  }
}

function drawMegaShadow(r0, c0, w, h) {
  var pTL = cellPx(r0, c0);
  var pTR = cellPx(r0, c0 + w - 1);
  var pBR = cellPx(r0 + h - 1, c0 + w - 1);
  var pBL = cellPx(r0 + h - 1, c0);
  var off = ISO_W * 0.08;
  var bTop = { x: pTL.x + off, y: pTL.y - ISO_H / 2 + off };
  var bRgt = { x: pTR.x + ISO_W / 2 + off, y: pTR.y + off };
  var bBot = { x: pBR.x + off, y: pBR.y + ISO_H / 2 + off };
  var bLft = { x: pBL.x - ISO_W / 2 + off, y: pBL.y + off };
  noStroke(); fill(0, 0, 0, 70);
  quadPts(bTop, bRgt, bBot, bLft);
}

function drawMegaResidential(r0, c0, w, h, cell) {
  var wall = PALETTE.megaResWall;
  var roof = PALETTE.megaResRoof;
  wall = hueShift(wall, cell.hue);
  var hgt = ISO_W * (cell.level === 1 ? 0.7 : cell.level === 2 ? 1.4 : 2.2);
  var box = drawIsoMegaBox(r0, c0, w, h, hgt, roof, shade(wall, 0.95), shade(wall, 0.70), 0.08);
  // 多層窗戶 grid
  var winCol = currentWindowCol;
  var rowsR = Math.max(2, Math.min(8, Math.floor(cell.level * 2 + 1)));
  drawFaceWindows(box, "R", w * 2, rowsR, winCol);
  drawFaceWindows(box, "L", h * 2, rowsR, winCol);
  // 頂部裝飾：水塔 + 通風口
  if (cell.level >= 2) {
    drawRoofBox(box, 0.18, 0.18, 0.22, 0.22, ISO_W * 0.18, "#bdc3c7", "#95a5a6", "#7f8c8d");
    drawRoofBox(box, 0.58, 0.58, 0.16, 0.16, ISO_W * 0.12, "#7f8c8d", "#5d6c7d", "#4a5666");
  }
}

function drawMegaCommercial(r0, c0, w, h, cell) {
  var wall = PALETTE.megaComWall;
  var glass = PALETTE.megaComGlass;
  var roof = PALETTE.megaComRoof;
  wall = hueShift(wall, cell.hue);
  var hgt = ISO_W * (cell.level === 1 ? 0.9 : cell.level === 2 ? 1.6 : 2.4);
  var box = drawIsoMegaBox(r0, c0, w, h, hgt, roof, shade(wall, 0.95), shade(wall, 0.70), 0.12);
  // 玻璃帷幕（密集）；晚上轉成暖色玻璃
  var rowsC = Math.max(3, Math.min(12, Math.floor(cell.level * 3)));
  var gw = weather === "NIGHT" ? currentWindowCol : glass;
  drawFaceWindows(box, "R", w * 2, rowsC, gw);
  drawFaceWindows(box, "L", h * 2, rowsC, gw);
  // 頂部尖塔 / 直升機坪
  if (cell.level === 3) {
    drawRoofBox(box, 0.40, 0.40, 0.20, 0.20, ISO_W * 0.50, "#888", "#666", "#444");
    // 直升機坪：紅圈白 H（簡化：用兩層菱形）
    var hp = drawRoofBox(box, 0.08, 0.08, 0.32, 0.32, ISO_W * 0.02, "#bdc3c7", "#95a5a6", "#7f8c8d");
    fill("#e74c3c"); noStroke();
    var ccx = hp.uTop.x + (hp.uRgt.x - hp.uTop.x) * 0.5 + (hp.uLft.x - hp.uTop.x) * 0.5;
    var ccy = hp.uTop.y + (hp.uRgt.y - hp.uTop.y) * 0.5 + (hp.uLft.y - hp.uTop.y) * 0.5;
    ellipse(ccx, ccy, ISO_W * 0.18, ISO_H * 0.18);
    fill("#fff");
    textAlign(CENTER, CENTER);
    textSize(ISO_W * 0.16);
    textStyle(BOLD);
    text("H", ccx, ccy);
    textStyle(NORMAL);
  } else if (cell.level === 2) {
    drawRoofBox(box, 0.30, 0.30, 0.40, 0.20, ISO_W * 0.06, glass, shade(glass, 0.85), shade(glass, 0.6));
  }
}

function drawMegaIndustrial(r0, c0, w, h, cell) {
  var wall = PALETTE.megaIndWall;
  var roof = PALETTE.megaIndRoof;
  wall = hueShift(wall, cell.hue);
  var hgt = ISO_W * (cell.level === 1 ? 0.5 : cell.level === 2 ? 0.85 : 1.15);
  var box = drawIsoMegaBox(r0, c0, w, h, hgt, roof, shade(wall, 0.92), shade(wall, 0.66), 0.06);
  // 一排小窗
  drawFaceWindows(box, "R", w * 3, 1, currentWindowCol);
  drawFaceWindows(box, "L", h * 3, 1, currentWindowCol);
  // 多煙囪 + 儲油槽
  var chmH = ISO_W * (cell.level === 1 ? 0.40 : cell.level === 2 ? 0.70 : 1.10);
  drawRoofBox(box, 0.18, 0.18, 0.10, 0.10, chmH, "#3e342a", "#2c241c", "#1e1812");
  drawRoofBox(box, 0.70, 0.18, 0.10, 0.10, chmH * 0.85, "#3e342a", "#2c241c", "#1e1812");
  drawRoofBox(box, 0.18, 0.70, 0.10, 0.10, chmH * 0.85, "#3e342a", "#2c241c", "#1e1812");
  // 煙
  for (var ci = 0; ci < 2; ci++) {
    var ou = 0.23, ov = 0.23;
    var smkX = box.uTop.x + (box.uRgt.x - box.uTop.x) * ou + (box.uLft.x - box.uTop.x) * ov;
    var smkY = box.uTop.y + (box.uRgt.y - box.uTop.y) * ou + (box.uLft.y - box.uTop.y) * ov - chmH;
    fill(255, 255, 255, 130); noStroke();
    ellipse(smkX, smkY - ISO_W * 0.04, ISO_W * 0.22, ISO_W * 0.14);
  }
  // 儲油槽
  if (cell.level >= 2) {
    var tnk = drawRoofBox(box, 0.55, 0.55, 0.30, 0.30, ISO_W * 0.28, "#aaa", "#888", "#666");
    fill("#999"); noStroke();
    ellipse(
      tnk.uTop.x + (tnk.uRgt.x - tnk.uTop.x) * 0.5 + (tnk.uLft.x - tnk.uTop.x) * 0.5,
      tnk.uTop.y + (tnk.uRgt.y - tnk.uTop.y) * 0.5 + (tnk.uLft.y - tnk.uTop.y) * 0.5,
      ISO_W * 0.22, ISO_H * 0.20
    );
  }
}

function drawService(r, c, cell) {
  var p = cellPx(r, c);
  var info = SERVICE_INFO[cell.type];
  drawShadowTile(p, ISO_W * 0.10, ISO_H * 0.10);
  var fw = ISO_W * 0.80, fh = ISO_H * 0.80;
  var hgt = ISO_W * 0.50;
  var bg = info.bg;
  var box = drawIsoBox(p, fw, fh, hgt, bg, shade(bg, 0.92), shade(bg, 0.66));
  drawRoofBox(box, 0.0, 0.0, 1.0, 0.18, 0, shade(bg, 0.55), shade(bg, 0.42), shade(bg, 0.32));
  // 大門（右側面）
  noStroke(); fill("#222");
  var u = { x: box.bBot.x - box.bRgt.x, y: box.bBot.y - box.bRgt.y };
  var v = { x: box.uRgt.x - box.bRgt.x, y: box.uRgt.y - box.bRgt.y };
  var p0 = box.bRgt;
  function fp(uu, vv) { return { x: p0.x + uu * u.x + vv * v.x, y: p0.y + uu * u.y + vv * v.y }; }
  quadPts(fp(0.36, 0.0), fp(0.64, 0.0), fp(0.64, 0.35), fp(0.36, 0.35));
  // emoji
  var topCx = (box.uTop.x + box.uBot.x) / 2;
  var topCy = (box.uTop.y + box.uBot.y) / 2;
  textAlign(CENTER, CENTER);
  textSize(ISO_W * 0.42);
  text(info.emoji, topCx, topCy);
}

function drawPark(r, c, cell) {
  var p = cellPx(r, c);
  drawIsoTile(p, ISO_W * 0.92, ISO_H * 0.92, PALETTE.parkBase, null);
  var trees = [
    { u: 0.25, v: 0.30, h: 0.22 },
    { u: 0.65, v: 0.25, h: 0.20 },
    { u: 0.30, v: 0.70, h: 0.22 },
    { u: 0.70, v: 0.65, h: 0.20 },
    { u: 0.50, v: 0.50, h: 0.26 },
  ];
  var t = { x: p.x, y: p.y - ISO_H / 2 };
  var rg = { x: p.x + ISO_W / 2, y: p.y };
  var bV = { x: p.x, y: p.y + ISO_H / 2 };
  var lf = { x: p.x - ISO_W / 2, y: p.y };
  function pt(uu, vv) {
    return {
      x: lf.x + uu * (rg.x - lf.x) + vv * ((t.x + uu * (bV.x - t.x)) - (lf.x + uu * (rg.x - lf.x))),
      y: lf.y + uu * (rg.y - lf.y) + vv * ((t.y + uu * (bV.y - t.y)) - (lf.y + uu * (rg.y - lf.y))),
    };
  }
  for (var i = 0; i < trees.length; i++) {
    var tr = trees[i];
    var gp = pt(tr.u, tr.v);
    var th = ISO_W * tr.h;
    noStroke(); fill("#5a3a1a");
    rect(gp.x - 1.5, gp.y - th * 0.6, 3, th * 0.6);
    fill(PALETTE.treeDark);
    ellipse(gp.x, gp.y - th * 0.6, ISO_W * 0.26, ISO_W * 0.26);
    fill(PALETTE.treeMed);
    ellipse(gp.x - ISO_W * 0.04, gp.y - th * 0.68, ISO_W * 0.14, ISO_W * 0.14);
  }
}

// ── HUD ────────────────────────────────────────────────────────────────────

function drawHud() {
  noStroke();
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  var fs = Math.max(11, ISO_W * 0.55);
  textSize(fs);
  fill(255);
  text("AUTO CITY", 16, 6);

  textStyle(NORMAL);
  textSize(fs * 0.7);
  fill(180);
  var phaseTxt = phase === "building" ? "BUILDING" : "EVOLVING";
  var winfo = WEATHER_INFO[weather];
  text("CITY #" + stats.cities + " · " + phaseTxt + "  " + winfo.emoji + " " + weather,
       16 + textWidth("AUTO CITY") + 12, 10);

  // 底部三行
  var by1 = canvasH - 58;
  var by2 = canvasH - 38;
  var by3 = canvasH - 18;
  textStyle(NORMAL);
  textSize(fs * 0.58);
  fill(200);
  text("ROADS " + stats.roads + "  ZONES " + stats.zones +
       "  SERVICES " + stats.services + "  BUILDS " + stats.builds +
       "  MEGAS " + stats.megas + "  DEMOS " + stats.demos, 16, by1);
  fill(232, 226, 110);
  text("POP " + fmtNum(stats.population) +
       "   INCOME $" + fmtNum(stats.income) + "/s" +
       "   SPENDING $" + fmtNum(stats.spending) + "/s",
       16, by2);
  // 預算 = 累計稅收 - 累計支出（正綠負紅）
  var budget = Math.floor(stats.tax - stats.expense);
  var netRate = stats.income - stats.spending;
  if (budget >= 0) fill(116, 220, 130);
  else fill(240, 100, 100);
  text("TAX $" + fmtNum(Math.floor(stats.tax)) +
       "   EXP $" + fmtNum(Math.floor(stats.expense)) +
       "   BUDGET " + (budget >= 0 ? "+$" : "-$") + fmtNum(Math.abs(budget)) +
       "   NET " + (netRate >= 0 ? "+$" : "-$") + fmtNum(Math.abs(netRate)) + "/s",
       16, by3);
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 10000) return (n / 1000).toFixed(1) + "k";
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexRGB(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function hueShift(hex, deg) {
  if (!deg) return hex;
  var rgb;
  if (hex.charAt(0) === "#") rgb = hexRGB(hex);
  else if (hex.indexOf("rgb") === 0) {
    var m = hex.match(/(\d+)/g);
    rgb = [+m[0], +m[1], +m[2]];
  } else return hex;
  var d = deg / 30;
  var r = Math.max(0, Math.min(255, rgb[0] + d * 5));
  var g = Math.max(0, Math.min(255, rgb[1] - d * 2));
  var b = Math.max(0, Math.min(255, rgb[2] + d * 3));
  return "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
}

function shade(col, factor) {
  var r, g, b;
  if (col.charAt(0) === "#") {
    var rgb = hexRGB(col); r = rgb[0]; g = rgb[1]; b = rgb[2];
  } else if (col.indexOf("rgb") === 0) {
    var m = col.match(/(\d+)/g);
    r = +m[0]; g = +m[1]; b = +m[2];
  } else return col;
  r = Math.max(0, Math.min(255, Math.round(r * factor)));
  g = Math.max(0, Math.min(255, Math.round(g * factor)));
  b = Math.max(0, Math.min(255, Math.round(b * factor)));
  return "rgb(" + r + "," + g + "," + b + ")";
}

function keyPressed() {
  if (key === " " || key === "n" || key === "N") newCity();
  if (key === "+" || key === "=") toggleSpeed();
}
