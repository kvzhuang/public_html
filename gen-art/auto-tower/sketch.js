// ============================================
// Auto Tower — Yoot Tower / SimTower 風自動建築
// 樓層 B10~20F、電梯（高速 skip-stop / 一般）、電扶梯、辦公室、
// 地下街、地鐵站、電影院、商城、旅店、SPA、垃圾清運、監控室、行人 AI
// ============================================

// ── i18n（PHP 透過 window.I18N inject；中文 fallback 用 key 本身）──────────
function t(s) {
  var d = (typeof window !== 'undefined') ? window.I18N : null;
  if (d && Object.prototype.hasOwnProperty.call(d, s)) return d[s];
  return s;
}

// ── 樓層尺寸 ───────────────────────────────────────────────────────────────
var FLOOR_BOTTOM = -10;         // 最低樓層 B10
var FLOOR_TOP    = 20;          // 最高樓層 20F
var FLOOR_COUNT  = FLOOR_TOP - FLOOR_BOTTOM + 1;   // 31 層
var COLS = 22;                  // 大樓寬度（格）
var CELL_W = 26;                // 每格寬
var CELL_H = 38;                // 每層樓高度
var TOWER_W, TOWER_H;
var TOWER_X, TOWER_Y;           // 大樓左上角畫面座標
var canvasW, canvasH;
var HUD_H = 158;

// ── 樓層核心（電梯井位置） ──────────────────────────────────────────────
// 大樓中央保留 6 格給電梯井 + 電扶梯
// 0..COLS-1 共 22 格，core 從 col 8 ~ 13
var CORE_START = 8;
var CORE_END   = 13;            // 含
var CORE_WIDTH = CORE_END - CORE_START + 1;  // 6
// 電梯井配置：每井三車共用、視覺重疊
// col 8 / 9 : 一般電梯井（B2 ~ 8F），各 3 車
// col 10/11: 高速電梯井（B6 ~ 20F），各 3 車
// col 12-13: 電扶梯
var ELEV_COLS = [
  // col 8 — 一般 4 車（範圍延伸至 B10 ~ 20F）：-3 / 1F / 12F / B10
  { col: 8,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#74b9e8", startFloor: -3,  carNum: 1, homeFloor: -3 },
  { col: 8,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#4a90e2", startFloor:  1,  carNum: 2, homeFloor:  1 },
  { col: 8,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#2c70c0", startFloor: 12,  carNum: 3, homeFloor: 12 },
  { col: 8,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#1a4d8c", startFloor: -10, carNum: 4, homeFloor: -10 },
  // col 9 — 一般 4 車（範圍延伸至 B10 ~ 20F）：B8 / 1F / 15F / B10
  { col: 9,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#74b9e8", startFloor: -8,  carNum: 1, homeFloor: -8 },
  { col: 9,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#4a90e2", startFloor:  1,  carNum: 2, homeFloor:  1 },
  { col: 9,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#2c70c0", startFloor: 15,  carNum: 3, homeFloor: 15 },
  { col: 9,  type: "local",   minFloor: -10, maxFloor: 20, carColor: "#1a4d8c", startFloor: -10, carNum: 4, homeFloor: -10 },
  // 高速電梯通通跳過 1F~9F、B1、B2（中段交給 local）
  // 服務樓層：B10~B3 + GF + 10F~20F
  // col 10 — 高速 4 車：deep basement / GF / mid-high / top
  { col: 10, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#ff7e54", startFloor: -10, carNum: 1, homeFloor: -10 },
  { col: 10, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#e74c3c", startFloor:   0, carNum: 2, homeFloor:   0 },
  { col: 10, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#c0392b", startFloor:  15, carNum: 3, homeFloor:  15 },
  { col: 10, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#8b0000", startFloor:  20, carNum: 4, homeFloor:  20 },
  // col 11 — 高速 4 車：補位（B7 / GF / 10F / 18F）
  { col: 11, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#ff7e54", startFloor:  -7, carNum: 1, homeFloor:  -7 },
  { col: 11, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#e74c3c", startFloor:   0, carNum: 2, homeFloor:   0 },
  { col: 11, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#c0392b", startFloor:  10, carNum: 3, homeFloor:  10 },
  { col: 11, type: "express", minFloor: -10, maxFloor: 20, skipFloors: [-2,-1,1,2,3,4,5,6,7,8,9], carColor: "#8b0000", startFloor:  18, carNum: 4, homeFloor:  18 },
];
var ESCALATOR_COL_UP   = 12;
var ESCALATOR_COL_DOWN = 13;
var ESCALATOR_MIN = -10;        // 電扶梯範圍 B10 停車 ~ 10F
var ESCALATOR_MAX = 10;

// ── 設施類型 ──────────────────────────────────────────────────────────────
var T_EMPTY    = 0;
var T_OFFICE   = 1;
var T_SHOP     = 2;             // 商城店面
var T_UGSHOP   = 3;             // 地下街商店
var T_CINEMA   = 4;
var T_SUBWAY   = 5;             // 地鐵站
var T_GARBAGE  = 6;             // 垃圾清運中心
var T_SECURITY = 7;             // 大樓監控室
var T_LOBBY    = 8;             // 大廳
var T_RESTAURANT = 9;
var T_GYM      = 10;
var T_PARKING  = 11;
var T_MECH     = 12;            // 機房
// 擴充服務（共 5 種）
var T_HOTEL    = 13;            // 旅店客房
var T_RECEPTION= 14;            // 飯店接待櫃台
var T_LAUNDRY  = 15;            // 洗衣店
var T_POOL     = 16;            // 游泳池
var T_SPA      = 17;            // SPA 中心

var UNIT_INFO = {};
UNIT_INFO[T_OFFICE]     = { name: "辦公室", emoji: "💼", bg: "#3a4f6b", trim: "#7ba8d8", cap: 8,  visitTime: [4*60*60, 9*60*60] }; // 4~9 小時
UNIT_INFO[T_SHOP]       = { name: "商店",   emoji: "🛍️", bg: "#a8516e", trim: "#ffd1dc", cap: 12, visitTime: [30*60, 80*60] };
UNIT_INFO[T_UGSHOP]     = { name: "地下街", emoji: "🛒", bg: "#6b4a8a", trim: "#d8b4ff", cap: 10, visitTime: [25*60, 60*60] };
UNIT_INFO[T_CINEMA]     = { name: "電影院", emoji: "🎬", bg: "#2a2a3e", trim: "#ffd700", cap: 60, visitTime: [90*60, 130*60] };
UNIT_INFO[T_SUBWAY]     = { name: "地鐵站", emoji: "🚇", bg: "#1c2833", trim: "#5fa2d8", cap: 100,visitTime: [30, 90] }; // 路過
UNIT_INFO[T_GARBAGE]    = { name: "清運中心", emoji: "♻️", bg: "#4a4a3a", trim: "#90a04a", cap: 4, visitTime: [6*60*60, 10*60*60] };
UNIT_INFO[T_SECURITY]   = { name: "監控室", emoji: "📹", bg: "#2d3436", trim: "#74b9ff", cap: 4, visitTime: [6*60*60, 10*60*60] };
UNIT_INFO[T_LOBBY]      = { name: "大廳",   emoji: "🏢", bg: "#5a4a3a", trim: "#e8d8a0", cap: 50, visitTime: [10, 30] };
UNIT_INFO[T_RESTAURANT] = { name: "餐廳",   emoji: "🍽️", bg: "#8b3a3a", trim: "#ffd07a", cap: 18, visitTime: [50*60, 100*60] };
UNIT_INFO[T_GYM]        = { name: "健身房", emoji: "🏋️", bg: "#3a8b6b", trim: "#a0e8c8", cap: 15, visitTime: [40*60, 80*60] };
UNIT_INFO[T_PARKING]    = { name: "停車場", emoji: "🅿️", bg: "#444",    trim: "#aaa",    cap: 30, visitTime: [60, 180] };
UNIT_INFO[T_MECH]       = { name: "機房",   emoji: "⚙️", bg: "#333",    trim: "#888",    cap: 0,  visitTime: [0,0] };
UNIT_INFO[T_HOTEL]      = { name: "旅店客房", emoji: "🛏️", bg: "#5e4565", trim: "#d4a4d8", cap: 4,  visitTime: [8*60*60, 14*60*60] };
UNIT_INFO[T_RECEPTION]  = { name: "飯店接待", emoji: "🛎️", bg: "#3a4a6a", trim: "#f0d090", cap: 6,  visitTime: [6*60*60, 10*60*60] };
UNIT_INFO[T_LAUNDRY]    = { name: "洗衣店",  emoji: "🧺", bg: "#3a5d6a", trim: "#a0d4e8", cap: 6,  visitTime: [50*60, 90*60] };
UNIT_INFO[T_POOL]       = { name: "游泳池",  emoji: "🏊", bg: "#2a6a8a", trim: "#a8e0f0", cap: 16, visitTime: [60*60, 120*60] };
UNIT_INFO[T_SPA]        = { name: "SPA 中心", emoji: "💆", bg: "#6a3a4a", trim: "#f0c4d4", cap: 10, visitTime: [60*60, 120*60] };

// ── 各房型營收 / 費用 ─────────────────────────────────────────────────────
// perVisit: [min,max] NT$，每位訪客貢獻一次（at_unit 時計入）
// perHour:  正值 = 自動收租 / 服務費；負值 = 經營成本（每模擬小時計）
// desc:     點擊房間時顯示的說明
var REVENUE_INFO = {};
REVENUE_INFO[T_OFFICE]     = { perVisit: [4000, 12000], perHour: 0,     desc: "出租給企業，租金每月以工作時數核算" };
REVENUE_INFO[T_SHOP]       = { perVisit: [300, 800],    perHour: 0,     desc: "商城店面，依來客消費賺取營業額" };
REVENUE_INFO[T_UGSHOP]     = { perVisit: [200, 500],    perHour: 0,     desc: "地下街小店，平均單客消費低但流量大" };
REVENUE_INFO[T_CINEMA]     = { perVisit: [280, 320],    perHour: 0,     desc: "電影院，票價約 NT$280 / 人" };
REVENUE_INFO[T_RESTAURANT] = { perVisit: [350, 900],    perHour: 0,     desc: "餐廳，正餐 / 簡餐視時段而異" };
REVENUE_INFO[T_GYM]        = { perVisit: [200, 500],    perHour: 0,     desc: "健身房，依會員 / 單次入場計費" };
REVENUE_INFO[T_PARKING]    = { perVisit: [50, 200],     perHour: 0,     desc: "停車場，以停車時數計費" };
REVENUE_INFO[T_SUBWAY]     = { perVisit: [25, 50],      perHour: 0,     desc: "地鐵站，車站轉乘人潮的進出通道" };
REVENUE_INFO[T_LOBBY]      = { perVisit: [0, 0],        perHour: 0,     desc: "大廳，建築主要出入口，不直接產生收入" };
REVENUE_INFO[T_SECURITY]   = { perVisit: [0, 0],        perHour: -300,  desc: "大樓監控中心，每小時固定人事 / 設備支出" };
REVENUE_INFO[T_GARBAGE]    = { perVisit: [0, 0],        perHour: -200,  desc: "垃圾清運處理中心，每小時固定處理成本" };
REVENUE_INFO[T_MECH]       = { perVisit: [0, 0],        perHour: -1000, desc: "機房（電力、空調），每小時耗能成本" };
REVENUE_INFO[T_HOTEL]      = { perVisit: [3500, 8000],  perHour: 0,    desc: "旅店客房，含早餐，過夜停留 8-14 小時計費" };
REVENUE_INFO[T_RECEPTION]  = { perVisit: [0, 0],        perHour: -250, desc: "飯店接待櫃台，24 小時人事支出" };
REVENUE_INFO[T_LAUNDRY]    = { perVisit: [120, 280],    perHour: 0,    desc: "洗衣店，依秤重計費 + 烘乾機代幣" };
REVENUE_INFO[T_POOL]       = { perVisit: [250, 500],    perHour: 0,    desc: "游泳池，單次入場 / 月票會員可入水" };
REVENUE_INFO[T_SPA]        = { perVisit: [800, 2000],   perHour: 0,    desc: "SPA 中心，按摩 / 護膚 / 三溫暖" };

// ── 全域狀態 ──────────────────────────────────────────────────────────────
var grid = [];                  // grid[floorIdx][col] = unitId 或 0
var units = [];                 // 所有租戶單位
var elevators = [];             // 電梯實體
var escalator = null;           // 電扶梯
var people = [];                // 在大樓內的人
var stats = {
  population: 0,                // 目前大樓內人數
  workers: 0, shoppers: 0, moviegoers: 0, commuters: 0, staff: 0,
  units: 0, towers: 1,
  totalSpawned: 0,
  satisfaction: 100,
};
var phase = "building";         // building → running
var phaseStart = 0;
var selectedUnit = null;        // 點擊後顯示資訊的 unit
var buildQueue = [];            // 等待蓋的單位
var buildIdx = 0;
var lastBuildTime = 0;
var buildInterval = 200;        // 蓋一個單位的間隔（ms）
var simTime = 8 * 3600;         // 模擬時鐘（秒），從早上 8 點開始
var lastTick = 0;
var TICK_MS = 50;
var timeSpeed = 60;             // 1 秒實時 = 60 模擬秒
var speedMul = 1;
var SPEED_LEVELS = [1, 2, 4];

// ── 縮放 / 平移 ──────────────────────────────────────────────────────────
var zoom = 1;
var panX = 0, panY = 0;
var ZOOM_LEVELS = [1, 1.5, 2, 3];

// ── 儲存 ──────────────────────────────────────────────────────────────────
var SAVE_KEY = "autoTower_state_v1";
var lastSaveAt = 0;

// ── 線上人數 ──────────────────────────────────────────────────────────────
var PRESENCE_URL = "/api/presence.php";
var presenceId = (function () {
  // 用 sessionStorage 維持，同分頁刷新算同一人
  try {
    var k = "at_presence_id";
    var v = sessionStorage.getItem(k);
    if (!v) {
      v = "";
      for (var i = 0; i < 16; i++) v += "0123456789abcdef"[(Math.random() * 16) | 0];
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch (e) {
    var v2 = "";
    for (var i = 0; i < 16; i++) v2 += "0123456789abcdef"[(Math.random() * 16) | 0];
    return v2;
  }
})();
var onlineCount = 0;
function pingPresence() {
  if (!fetch) return;
  fetch(PRESENCE_URL + "?app=autotower&id=" + presenceId, { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && typeof d.online === "number") onlineCount = d.online; })
    .catch(function () { /* 靜默 */ });
}
var zoomIdx = 0;
var pressStart = null;          // 觸控/滑鼠按下時的狀態
var pinch = null;               // 雙指縮放狀態

// ── 天氣 ──────────────────────────────────────────────────────────────────
var weather = "SUNNY";
var weatherChangeAt = 0;          // 上次切換的 simTime
var weatherFadeT = 1;             // 0..1 過場進度
var WEATHER_POOL = ["SUNNY","SUNNY","SUNNY","CLOUDY","CLOUDY","RAIN"];  // 多晴少雨
var WEATHER_INFO = {
  SUNNY:  { emoji: "☀️", ambient: null,                        winRefl: "#cfe2ff", duration: 4 * 3600 },
  CLOUDY: { emoji: "☁️", ambient: "rgba(170,180,200,0.20)",    winRefl: "#b5c8e0", duration: 3 * 3600 },
  RAIN:   { emoji: "🌧️", ambient: "rgba(60, 85, 120, 0.30)",   winRefl: "#7a8a96", duration: 2 * 3600 },
};
var rainDrops = [];
var cloudsArr = [];
var lightnings = [];              // [{ at: millis, x: ... }]

// ── Palette ───────────────────────────────────────────────────────────────
var PALETTE = {
  daySky:   ["#fcd9a8", "#a8d8f0", "#7ec4e8"],
  noonSky:  ["#a8d8f0", "#7ec4e8", "#a8d8f0"],
  duskSky:  ["#ffb887", "#e88a6e", "#5a4a7e"],
  nightSky: ["#0a1838", "#0c1e3e", "#1a2a4e"],
  ground:   "#5d8c4a",
  groundDk: "#3a5d2e",
  street:   "#3a3a42",
  streetLn: "#dcdcb8",
  towerWall:"#e2dcc8",
  towerEdge:"#8a8270",
  shaft:    "#1c1c22",
  shaftEdge:"#0a0a0e",
  windowOn: "#ffd87a",
  windowOff:"#3a4660",
  hudBg:    "rgba(15, 18, 26, 0.96)",
  hudText:  "#e2e8ed",
  hudDim:   "#9aa4b2",
};

// ── 工具 ──────────────────────────────────────────────────────────────────
function fIdx(floor)    { return floor - FLOOR_BOTTOM; }    // 樓層轉 index
function iFloor(idx)    { return idx + FLOOR_BOTTOM; }
function floorY(floor)  { return TOWER_Y + (FLOOR_TOP - floor) * CELL_H; }
function colX(col)      { return TOWER_X + col * CELL_W; }
function inRange(v,a,b) { return v >= a && v <= b; }
function pick(arr)      { return arr[floor(random(arr.length))]; }
function clamp(v,a,b)   { return v < a ? a : (v > b ? b : v); }
function lerpCol(c1, c2, t) { return lerpColor(color(c1), color(c2), t); }

// ============================================================================
// SETUP / RESIZE
// ============================================================================
function setup() {
  computeCanvas();
  var c = createCanvas(canvasW, canvasH);
  c.parent("tower-container");
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  noSmooth();
  textFont("-apple-system, Helvetica Neue, sans-serif");

  document.getElementById("btn-new").onclick = function () {
    clearTowerSave();
    newTower();
  };
  document.getElementById("btn-speed").onclick = function () {
    var i = SPEED_LEVELS.indexOf(speedMul);
    speedMul = SPEED_LEVELS[(i + 1) % SPEED_LEVELS.length];
  };
  document.getElementById("btn-zoom").onclick = function () {
    var oldZoom = zoom;
    zoomIdx = (zoomIdx + 1) % ZOOM_LEVELS.length;
    zoom = ZOOM_LEVELS[zoomIdx];
    var cx = canvasW / 2, cy = canvasH / 2;
    panX = cx - (cx - panX) * (zoom / oldZoom);
    panY = cy - (cy - panY) * (zoom / oldZoom);
  };

  // 先嘗試載入存檔，沒檔再蓋新棟
  if (!loadTowerState()) newTower();

  // 5 秒自動存檔 + 視窗關閉時也存
  setInterval(saveTowerState, 5000);
  window.addEventListener("beforeunload", saveTowerState);

  // 線上人數心跳：開站立刻 ping 一次，每 10 秒更新
  pingPresence();
  setInterval(pingPresence, 10000);
}

function computeCanvas() {
  // 動態配置 cell 大小
  var sidePad   = 60;
  var topPad    = HUD_H + 6;
  var bottomPad = 40;
  var ctrlsH    = 60;
  var maxW      = min(window.innerWidth - 4, 720);
  var maxH      = window.innerHeight - ctrlsH;

  var availW = max(maxW - sidePad * 2, COLS * 14);
  var availH = max(maxH - topPad - bottomPad, FLOOR_COUNT * 20);

  // 提高最小 cell：手機上不再讓 cell 縮太小造成硬編碼像素占比過大
  CELL_W = min(26, max(14, floor(availW / COLS)));
  CELL_H = min(38, max(20, floor(availH / FLOOR_COUNT)));

  TOWER_W = COLS * CELL_W;
  TOWER_H = FLOOR_COUNT * CELL_H;
  canvasW = TOWER_W + sidePad * 2;
  canvasH = TOWER_H + topPad + bottomPad;
  TOWER_X = sidePad;
  TOWER_Y = topPad;
}

function windowResized() {
  // 重設尺寸（保留遊戲狀態）
  computeCanvas();
  resizeCanvas(canvasW, canvasH);
}

// ============================================================================
// 新大樓初始化
// ============================================================================
function newTower() {
  grid = [];
  for (var f = 0; f < FLOOR_COUNT; f++) {
    grid.push(new Array(COLS).fill(0));
  }
  units = [];
  elevators = [];
  people = [];
  buildQueue = [];
  buildIdx = 0;
  phase = "building";
  phaseStart = millis();
  simTime = 8 * 3600;
  stats.population = 0;
  stats.workers = stats.shoppers = stats.moviegoers = stats.commuters = stats.staff = stats.guests = 0;
  stats.units = 0;
  stats.totalSpawned = 0;
  stats.satisfaction = 100;
  stats.day = 1;
  stats.towers++;
  selectedUnit = null;
  zoom = 1; panX = 0; panY = 0; zoomIdx = 0;

  initElevators();
  initEscalator();
  initWeather();
  planConstruction();
}

function initWeather() {
  weather = "SUNNY";
  weatherChangeAt = simTime;
  weatherFadeT = 1;
  rainDrops = [];
  lightnings = [];
  cloudsArr = [];
  for (var i = 0; i < 8; i++) {
    cloudsArr.push({
      x: random(-80, canvasW + 80),
      y: random(20, max(50, HUD_H + 60)),
      w: random(45, 95),
      h: random(14, 24),
      speed: random(0.12, 0.35),
      shade: random(0.85, 1.0),
    });
  }
}

// ── 存檔 ──────────────────────────────────────────────────────────────────
function saveTowerState() {
  if (phase !== "running") return;       // 建造中先不存
  try {
    var data = {
      version: 1,
      ts: Date.now(),
      simTime: simTime,
      phase: phase,
      buildIdx: buildIdx,
      weather: weather,
      weatherChangeAt: weatherChangeAt,
      stats: {
        totalSpawned: stats.totalSpawned,
        day: stats.day || 1,
        towers: stats.towers,
        satisfaction: stats.satisfaction,
      },
      units: units.map(function (u) {
        return {
          type: u.type, floor: u.floor,
          colStart: u.colStart, colEnd: u.colEnd,
          revenue: u.revenue, todayRevenue: u.todayRevenue,
          visitorsToday: u.visitorsToday, totalVisitors: u.totalVisitors,
          windowSeed: u.windowSeed,
          ratings: u.ratings ? u.ratings.slice(-20) : null,
          comments: u.comments ? u.comments.slice(-8) : null,
          slots: u.slots ? u.slots.map(function (s) {
            return { state: s.state, color: s.color, animT: s.animT, fromLeft: s.fromLeft };
          }) : null,
        };
      }),
      elevators: elevators.map(function (e) {
        return {
          col: e.col, carNum: e.carNum,
          currentFloor: e.currentFloor, yPos: e.yPos,
          targetFloor: e.targetFloor, direction: e.direction,
          state: e.state, doorTimer: e.doorTimer, idleTicks: e.idleTicks,
        };
      }),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    lastSaveAt = millis();
  } catch (e) { /* 安靜失敗 */ }
}

function loadTowerState() {
  var raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  var data;
  try { data = JSON.parse(raw); } catch (e) { return false; }
  if (!data || data.version !== 1) return false;

  // 重設陣列與 grid
  grid = [];
  for (var f = 0; f < FLOOR_COUNT; f++) grid.push(new Array(COLS).fill(0));
  units = []; elevators = []; people = []; buildQueue = []; buildIdx = 0;

  // 套用標量
  simTime = data.simTime;
  phase   = data.phase || "running";
  stats.totalSpawned  = data.stats.totalSpawned || 0;
  stats.day           = data.stats.day || 1;
  stats.towers        = data.stats.towers || 1;
  stats.satisfaction  = data.stats.satisfaction || 100;
  stats.population    = 0;
  stats.units         = 0;
  stats.workers = stats.shoppers = stats.moviegoers = stats.commuters = stats.staff = stats.guests = 0;
  zoom = 1; panX = 0; panY = 0; zoomIdx = 0;
  selectedUnit = null;

  // 重建 units（沿用 placeUnit，再覆寫狀態欄位）
  for (var i = 0; i < data.units.length; i++) {
    var sv = data.units[i];
    placeUnit({ type: sv.type, floor: sv.floor, colStart: sv.colStart, colEnd: sv.colEnd });
    var u = units[units.length - 1];
    u.revenue       = sv.revenue       || 0;
    u.todayRevenue  = sv.todayRevenue  || 0;
    u.visitorsToday = sv.visitorsToday || 0;
    u.totalVisitors = sv.totalVisitors || 0;
    if (typeof sv.windowSeed === "number") {
      u.windowSeed = sv.windowSeed;
      buildLayout(u);   // 用回存的 seed 重新生成 layout
    }
    if (sv.slots && u.slots)               u.slots = sv.slots;
    if (Array.isArray(sv.ratings))         u.ratings = sv.ratings;
    if (Array.isArray(sv.comments))        u.comments = sv.comments;
  }

  // 電梯：先 init，再覆寫位置
  initElevators();
  for (var i = 0; i < data.elevators.length; i++) {
    var sv = data.elevators[i];
    for (var j = 0; j < elevators.length; j++) {
      if (elevators[j].col === sv.col && elevators[j].carNum === sv.carNum) {
        var el = elevators[j];
        el.currentFloor = sv.currentFloor;
        el.yPos         = sv.yPos;
        el.targetFloor  = sv.targetFloor;
        el.direction    = sv.direction;
        el.state        = sv.state;
        el.doorTimer    = sv.doorTimer;
        el.idleTicks    = sv.idleTicks || 0;
        break;
      }
    }
  }

  initEscalator();
  initWeather();                       // 初始化雲 / 預設天氣
  weather         = data.weather || "SUNNY";
  weatherChangeAt = data.weatherChangeAt || simTime;
  weatherFadeT    = 1;

  return true;
}

function clearTowerSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// ── 滑鼠 / 觸控：tap、拖曳 pan、滾輪/雙指 zoom ────────────────────────────
function mousePressed() {
  // 滑鼠在 canvas 外（例如下方的按鈕區）→ 不接管
  if (mouseX < 0 || mouseX > canvasW || mouseY < 0 || mouseY > canvasH) return;
  if (mouseY < HUD_H) return;
  pressStart = { x: mouseX, y: mouseY, time: millis(), dragged: false };
}

function mouseDragged() {
  if (!pressStart) return;
  if (zoom > 1.02) {
    panX += movedX;
    panY += movedY;
    pressStart.dragged = true;
  }
}

function mouseReleased() {
  if (!pressStart) return;
  if (!pressStart.dragged) handleTap(pressStart.x, pressStart.y);
  pressStart = null;
}

function mouseWheel(event) {
  if (mouseY < HUD_H) return;
  var oldZoom = zoom;
  var delta = -event.delta * 0.0015;
  zoom = constrain(zoom + delta, 0.5, 5);
  panX = mouseX - (mouseX - panX) * (zoom / oldZoom);
  panY = mouseY - (mouseY - panY) * (zoom / oldZoom);
  return false;
}

// 只有事件目標是 canvas 時才接管（避免吃掉下方按鈕的 click）
function isCanvasTarget(event) {
  return event && event.target && event.target.tagName === "CANVAS";
}

function touchStarted(event) {
  if (!isCanvasTarget(event)) return;     // 讓 button click 正常運作
  if (touches.length === 1) {
    if (touches[0].y < HUD_H) return false;
    pressStart = { x: touches[0].x, y: touches[0].y, time: millis(), dragged: false };
    pinch = null;
  } else if (touches.length === 2) {
    pinch = {
      d:    dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y),
      cx:   (touches[0].x + touches[1].x) / 2,
      cy:   (touches[0].y + touches[1].y) / 2,
      zoom: zoom, panX: panX, panY: panY,
    };
    pressStart = null;
  }
  return false;
}

function touchMoved(event) {
  if (!isCanvasTarget(event)) return;
  if (touches.length === 2 && pinch) {
    var nd = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
    var nz = constrain(pinch.zoom * (nd / pinch.d), 0.5, 5);
    var ncx = (touches[0].x + touches[1].x) / 2;
    var ncy = (touches[0].y + touches[1].y) / 2;
    var s = nz / pinch.zoom;
    panX = ncx - (pinch.cx - pinch.panX) * s;
    panY = ncy - (pinch.cy - pinch.panY) * s;
    zoom = nz;
  } else if (touches.length === 1 && pressStart && zoom > 1.02) {
    var t = touches[0];
    panX += t.x - pressStart.x;
    panY += t.y - pressStart.y;
    pressStart.x = t.x;
    pressStart.y = t.y;
    pressStart.dragged = true;
  }
  return false;
}

function touchEnded(event) {
  if (!isCanvasTarget(event)) {
    // 不是 canvas → 重置追蹤狀態避免殘留，但不擋 click
    pressStart = null;
    pinch = null;
    return;
  }
  if (touches.length === 0 && pressStart) {
    if (!pressStart.dragged) handleTap(pressStart.x, pressStart.y);
    pressStart = null;
  }
  if (touches.length < 2) pinch = null;
  return false;
}

function handleTap(mx, my) {
  if (my < HUD_H) return;
  if (selectedUnit && isInsideInfoPanel(mx, my)) return;
  // 螢幕 → 世界座標（要除回縮放與平移）
  var wx = (mx - panX) / zoom;
  var wy = (my - panY) / zoom;
  var u = getUnitAtScreenPos(wx, wy);
  selectedUnit = u || null;
}

function isInsideInfoPanel(mx, my) {
  var pw = min(280, canvasW - 20);
  var ph = 168;
  var px = (canvasW - pw) / 2;
  var py = HUD_H + 6;
  return mx >= px && mx <= px + pw && my >= py && my <= py + ph;
}

function getUnitAtScreenPos(mx, my) {
  if (mx < TOWER_X || mx >= TOWER_X + TOWER_W) return null;
  if (my < floorY(FLOOR_TOP) || my >= floorY(FLOOR_BOTTOM) + CELL_H) return null;
  var col = floor((mx - TOWER_X) / CELL_W);
  if (col < 0 || col >= COLS) return null;
  var row = floor((my - floorY(FLOOR_TOP)) / CELL_H);
  var f = FLOOR_TOP - row;
  var fi = fIdx(f);
  if (fi < 0 || fi >= FLOOR_COUNT) return null;
  var uid = grid[fi][col];
  if (!uid) return null;
  return units[uid - 1];
}

function initElevators() {
  for (var i = 0; i < ELEV_COLS.length; i++) {
    var e = ELEV_COLS[i];
    var startF = (typeof e.startFloor === "number") ? e.startFloor : 0;
    elevators.push({
      id: i,
      col: e.col,
      shaft: "s" + e.col,
      carNum: e.carNum || 0,
      homeFloor: (typeof e.homeFloor === "number") ? e.homeFloor : null,
      type: e.type,
      minFloor: e.minFloor,
      maxFloor: e.maxFloor,
      carColor: e.carColor,
      currentFloor: startF,
      targetFloor: startF,
      yPos: startF,
      direction: 0,
      state: "idle",
      doorTimer: 0,
      idleTicks: 0,
      blockedTicks: 0,
      passengers: [],
      queue: [],
      speed: (e.type === "express" ? 0.12 : 0.07),  // 兩倍速以消化排隊
      capacity: 12,
    });
  }
}

// 同電梯井內，前方是否有其他車擋住
function isShaftBlocked(el, elIdx, nextY) {
  var gap = 1.2;
  for (var j = 0; j < elevators.length; j++) {
    if (j === elIdx) continue;
    var other = elevators[j];
    if (other.shaft !== el.shaft) continue;
    if (el.direction > 0) {
      if (other.yPos > el.yPos && nextY > other.yPos - gap) return true;
    } else if (el.direction < 0) {
      if (other.yPos < el.yPos && nextY < other.yPos + gap) return true;
    }
  }
  return false;
}

// 強制擋住的車讓位（deadlock breaker）。若對方任務比 el 重就 return false 由 el 自己讓開
function forceShaftYield(el, elIdx) {
  var elLoad = el.passengers.length + el.queue.length;
  for (var j = 0; j < elevators.length; j++) {
    if (j === elIdx) continue;
    var other = elevators[j];
    if (other.shaft !== el.shaft) continue;
    var inWay = (el.direction > 0 && other.yPos > el.yPos) ||
                (el.direction < 0 && other.yPos < el.yPos);
    if (!inWay) continue;

    var otherLoad = other.passengers.length + other.queue.length;
    if (otherLoad > elLoad) continue;                        // 對方任務重 → 不能命令
    if (otherLoad === elLoad && other.id < el.id) continue;  // 平手時 id 小的不讓

    // 對方讓位：推到 el 反方向 4 樓
    var yieldTarget = (el.direction > 0)
      ? min(other.yPos + 4, other.maxFloor)
      : max(other.yPos - 4, other.minFloor);
    other.targetFloor = yieldTarget;
    other.direction = (yieldTarget > other.currentFloor) ? 1 : -1;
    other.state = "moving";
    other.idleTicks = 0;
    other.blockedTicks = 0;
    return true;
  }
  return false;
}

function initEscalator() {
  escalator = {
    minFloor: ESCALATOR_MIN,
    maxFloor: ESCALATOR_MAX,
    colUp: ESCALATOR_COL_UP,
    colDown: ESCALATOR_COL_DOWN,
    speed: 0.012,                  // 樓層/tick
  };
}

// ── 建造計畫 ──────────────────────────────────────────────────────────────
function planConstruction() {
  // 大樓中央 col 8~13 是電梯井 + 電扶梯，不放單位
  // 兩側可用空間：col 0-7（左 8 格）與 col 14-21（右 8 格）

  var leftL = 0, leftR = CORE_START - 1;        // 0~7
  var rightL = CORE_END + 1, rightR = COLS - 1; // 14~21

  // ── 地下 ─────────────────────────────────────────
  // B10 ~ B7：四層停車場（左右整層）
  for (var f = -10; f <= -7; f++) {
    pushUnit(T_PARKING, f, leftL, leftR);
    pushUnit(T_PARKING, f, rightL, rightR);
  }
  pushUnit(T_MECH,    -6, 0, COLS - 1);             // B6 機房
  pushUnit(T_MECH,    -5, 0, COLS - 1);             // B5 機房（含水塔/變壓）
  pushUnit(T_SUBWAY,  -4, 0, COLS - 1);             // B4 地鐵站
  // B3 停車場 + 垃圾清運中心
  pushUnit(T_PARKING, -3, leftL, leftR);
  pushUnit(T_GARBAGE, -3, rightL, rightR);
  // B2 地下街 + 洗衣店
  pushUnit(T_UGSHOP,  -2, leftL,     leftL + 3);
  pushUnit(T_UGSHOP,  -2, leftL + 4, leftR);
  pushUnit(T_UGSHOP,  -2, rightL,    rightL + 3);
  pushUnit(T_LAUNDRY, -2, rightL + 4, rightR);
  // B1 地下街全層
  pushUnit(T_UGSHOP,  -1, leftL,     leftL + 3);
  pushUnit(T_UGSHOP,  -1, leftL + 4, leftR);
  pushUnit(T_UGSHOP,  -1, rightL,    rightL + 3);
  pushUnit(T_UGSHOP,  -1, rightL + 4, rightR);

  // ── 地面 ─────────────────────────────────────────
  pushUnit(T_LOBBY,    0, leftL,  leftR);           // GF 大廳
  pushUnit(T_SECURITY, 0, rightL, rightR);          // GF 監控室

  // 1F：左側為大廳挑高（與 GF 大廳貫通的中庭），右側商店
  pushUnit(T_LOBBY, 1, leftL, leftR);
  pushUnit(T_SHOP,  1, rightL,    rightL + 3);
  pushUnit(T_SHOP,  1, rightL + 4, rightR);
  // 2F 全層商店
  pushUnit(T_SHOP, 2, leftL,     leftL + 3);
  pushUnit(T_SHOP, 2, leftL + 4, leftR);
  pushUnit(T_SHOP, 2, rightL,    rightL + 3);
  pushUnit(T_SHOP, 2, rightL + 4, rightR);
  // 3F 餐廳
  pushUnit(T_RESTAURANT, 3, leftL, leftR);
  pushUnit(T_RESTAURANT, 3, rightL, rightR);
  // 4F 健身房 + 商店
  pushUnit(T_GYM,  4, leftL, leftR);
  pushUnit(T_SHOP, 4, rightL,     rightL + 3);
  pushUnit(T_SHOP, 4, rightL + 4, rightR);

  // 5F ~ 9F 辦公室
  for (var f = 5; f <= 9; f++) {
    pushUnit(T_OFFICE, f, leftL,     leftL + 3);
    pushUnit(T_OFFICE, f, leftL + 4, leftR);
    pushUnit(T_OFFICE, f, rightL,    rightL + 3);
    pushUnit(T_OFFICE, f, rightL + 4, rightR);
  }

  // 10F 飯店接待櫃台（左右兩個）
  pushUnit(T_RECEPTION, 10, leftL, leftR);
  pushUnit(T_RECEPTION, 10, rightL, rightR);

  // 11F ~ 15F 旅店客房（每層 4 間）
  for (var f = 11; f <= 15; f++) {
    pushUnit(T_HOTEL, f, leftL,     leftL + 3);
    pushUnit(T_HOTEL, f, leftL + 4, leftR);
    pushUnit(T_HOTEL, f, rightL,    rightL + 3);
    pushUnit(T_HOTEL, f, rightL + 4, rightR);
  }

  // 16F SPA 中心
  pushUnit(T_SPA, 16, leftL,  leftR);
  pushUnit(T_SPA, 16, rightL, rightR);

  // 17F 游泳池
  pushUnit(T_POOL, 17, leftL,  leftR);
  pushUnit(T_POOL, 17, rightL, rightR);

  // 18F 景觀餐廳
  pushUnit(T_RESTAURANT, 18, leftL,  leftR);
  pushUnit(T_RESTAURANT, 18, rightL, rightR);

  // 19F ~ 20F 電影院
  for (var f = 19; f <= 20; f++) {
    pushUnit(T_CINEMA, f, leftL,  leftR);
    pushUnit(T_CINEMA, f, rightL, rightR);
  }

  // 由低樓往上蓋
  buildQueue.sort(function (a, b) { return a.floor - b.floor; });
}

function pushUnit(type, floor, colStart, colEnd) {
  buildQueue.push({ type: type, floor: floor, colStart: colStart, colEnd: colEnd });
}

function placeUnit(b) {
  var u = {
    id: units.length,
    type: b.type,
    floor: b.floor,
    colStart: b.colStart,
    colEnd: b.colEnd,
    width: b.colEnd - b.colStart + 1,
    cap: UNIT_INFO[b.type].cap,
    occupants: [],
    revenue: 0,
    todayRevenue: 0,
    visitorsToday: 0,
    totalVisitors: 0,
    openedAt: simTime,
    windowSeed: random(1000),
  };
  // 停車場：每格 2 個車位，初始隨機填一些
  if (b.type === T_PARKING) {
    u.slots = [];
    var totalSlots = u.width * 2;
    var CAR_PALETTE = ["#ff6b6b","#4ecdc4","#ffe66d","#ff9f43","#5fa2d8",
                        "#a3e635","#f472b6","#fbbf24","#e2e8f0","#94a3b8"];
    for (var s = 0; s < totalSlots; s++) {
      var occupied = random() < 0.4;
      u.slots.push({
        state: occupied ? "parked" : "empty",
        color: occupied ? pick(CAR_PALETTE) : null,
        animT: 0,
        fromLeft: random() < 0.5,    // 進出方向
      });
    }
  }
  units.push(u);
  var fi = fIdx(b.floor);
  for (var c = b.colStart; c <= b.colEnd; c++) grid[fi][c] = u.id + 1;
  stats.units++;
  buildLayout(u);
}

// 依 windowSeed 為辦公室 / 客房產生各自的內部 layout（傢俱、裝飾不重複）
function buildLayout(u) {
  if (u.type === T_OFFICE) u.layout = genOfficeLayout(u);
  else if (u.type === T_HOTEL)    u.layout = genHotelLayout(u);
  else if (u.type === T_MECH)     u.layout = genMechLayout(u);
  else if (u.type === T_SECURITY) u.layout = genSecurityLayout(u);
  else if (u.type === T_SHOP || u.type === T_UGSHOP) u.layout = genShopLayout(u);
}

function unitRng(seed) {
  // 簡易 LCG，給定 seed 返回 [0,1) 偽隨機；同 seed 取多次需自行 + salt
  return function (salt) {
    var s = ((seed | 0) * 9301 + (salt | 0) * 49297 + 7) % 233280;
    if (s < 0) s += 233280;
    return s / 233280;
  };
}

function genOfficeLayout(u) {
  var rng = unitRng((u.windowSeed || u.id) * 1000);
  var TYPES = ["desk", "desk_plant", "meeting", "sofa", "cabinet"];
  var cells = [];
  for (var i = 0; i < u.width; i++) {
    var r = rng(i);
    var type = TYPES[floor(r * TYPES.length)];
    cells.push({
      type: type,
      blindsOpen: rng(i + 73) > 0.35,                                   // 65% 開窗
      deskCol:   rng(i + 91) > 0.5 ? "#5a3e2a" : "#6b4d3a",
      accentCol: ["#8b3a3a","#3a5d6a","#3a6a4a","#6a4d3a"][floor(rng(i + 137) * 4)],
    });
  }
  return { cells: cells };
}

function genHotelLayout(u) {
  var rng = unitRng((u.windowSeed || u.id) * 1000 + 17);
  var DECORS = ["picture", "mirror", "tv"];
  var cells = [];
  for (var i = 0; i < u.width; i++) {
    cells.push({
      bedSide:      rng(i + 11) > 0.5 ? "left" : "right",
      hasNightstand:rng(i + 23) > 0.25,
      decor:        DECORS[floor(rng(i + 47) * DECORS.length)],
      curtainOpen:  rng(i + 59) > 0.45,
      bedColor:     ["#d4a4d8","#c4d4a4","#a4c4d8","#d8c4a4"][floor(rng(i + 79) * 4)],
    });
  }
  return { cells: cells };
}

function genMechLayout(u) {
  var rng = unitRng((u.windowSeed || u.id) * 1000 + 23);
  var TYPES = ["server", "ac", "pipes", "control", "boiler", "server", "ac"];
  var cells = [];
  for (var i = 0; i < u.width; i++) {
    cells.push({
      type: TYPES[floor(rng(i) * TYPES.length)],
      ledSeed: floor(rng(i + 31) * 9999),
      pipeCol: ["#5fa2d8","#d8a042","#ffd700","#888"][floor(rng(i + 53) * 4)],
    });
  }
  return { cells: cells };
}

function genSecurityLayout(u) {
  var rng = unitRng((u.windowSeed || u.id) * 1000 + 29);
  var cells = [];
  for (var i = 0; i < u.width; i++) {
    cells.push({
      feedType:  floor(rng(i) * 5),               // 0~4 種畫面
      ledSeed:   floor(rng(i + 17) * 999),
      hasGuard:  rng(i + 31) > 0.25,              // 約 75% 桌前有警衛
      hasCoffee: rng(i + 53) > 0.45,
      hasFiles:  rng(i + 79) > 0.5,
    });
  }
  return { cells: cells };
}

function genShopLayout(u) {
  var rng = unitRng((u.windowSeed || u.id) * 1000 + 41);
  var TYPES = ["clothing","books","bakery","convenience","electronics","cosmetics","flowers"];
  var SIGN  = ["#ff6b6b","#4ecdc4","#ffe66d","#ff9f43","#a3e635","#f472b6","#fbbf24","#5fa2d8"];
  var type  = TYPES[floor(rng(0) * TYPES.length)];
  var cells = [];
  for (var i = 0; i < u.width; i++) {
    cells.push({
      productSeed: floor(rng(i + 17) * 999),
      tvAd:        floor(rng(i + 53) * 4),    // electronics 用
    });
  }
  return {
    type: type,
    signColor: SIGN[floor(rng(1) * SIGN.length)],
    hasClerk:  rng(2) > 0.08,                 // ~92% 有店員
    cells: cells,
  };
}

// ── 評價系統 ──────────────────────────────────────────────────────────────
// 訪客抵達房間時依其體驗給分，房間維護最近 20 筆 rolling
function recordVisitorRating(u, p) {
  var sat = 4.2;                                 // baseline
  // 等電梯時間
  if (p.waitedTicks > 400)      sat -= 1.8;
  else if (p.waitedTicks > 200) sat -= 1.0;
  else if (p.waitedTicks > 120) sat -= 0.4;
  else if (p.waitedTicks < 40)  sat += 0.3;
  // 中途換工具的人
  if (p.switchedElev)  sat -= 0.4;
  if (p.switchedToEsc) sat -= 0.2;
  // 抵達時擁擠度
  if (u.cap > 0) {
    var ratio = u.occupants.length / u.cap;
    if (ratio > 0.9)      sat -= 0.6;
    else if (ratio > 0.7) sat -= 0.2;
    else if (ratio > 0.3) sat += 0.2;
    else if (ratio < 0.1) sat -= 0.3;            // 太冷清也不討喜
  }
  // 天氣
  if (weather === "RAIN") {
    if (u.type === T_CINEMA || u.type === T_SHOP || u.type === T_UGSHOP) sat += 0.3;
    if (u.type === T_POOL) sat -= 0.5;
  }
  if (weather === "SUNNY" && u.type === T_POOL) sat += 0.3;
  // 隨機個人偏好誤差
  sat += random(-0.3, 0.3);
  sat = constrain(sat, 1, 5);

  if (!u.ratings)  u.ratings = [];
  if (!u.comments) u.comments = [];
  u.ratings.push(sat);
  if (u.ratings.length > 20) u.ratings.shift();

  // 抽一句留言
  var comment = pickVisitorComment(u, sat, p);
  u.comments.push({ rating: sat, text: comment, at: simTime });
  if (u.comments.length > 8) u.comments.shift();
}

// 計算房間目前平均評分（無資料回 0）
function getUnitRating(u) {
  if (!u.ratings || u.ratings.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < u.ratings.length; i++) sum += u.ratings[i];
  return sum / u.ratings.length;
}

// 每種房型的專屬評論池
var COMMENT_BANK = {};
COMMENT_BANK[T_RESTAURANT] = {
  high:  ["餐點超好吃", "食材新鮮", "廚師手藝讚", "氣氛佳", "服務週到", "CP 值高", "下次帶朋友來", "甜點驚艷"],
  mid:   ["餐點還可以", "中規中矩", "沒特別驚喜", "一般水準", "味道普普"],
  low:   ["餐點冷掉", "份量太少", "太鹹了", "難吃", "上錯菜", "等太久才上桌"],
  extras:["上菜慢", "桌位很擠", "結帳排隊", "菜單看不懂", "酒單有點貴"]
};
COMMENT_BANK[T_HOTEL] = {
  high:  ["房間很舒服", "床好睡", "浴室寬敞", "view 漂亮", "員工貼心", "枕頭超讚"],
  mid:   ["一般水準", "符合預期", "中規中矩"],
  low:   ["隔音超差", "床太硬", "房間很悶", "枕頭不好睡", "毛巾粗糙"],
  extras:["早餐普通", "WIFI 慢", "電視訊號弱", "鄰房太吵", "冷氣聲音大"]
};
COMMENT_BANK[T_RECEPTION] = {
  high:  ["接待親切", "入住快速", "回答清楚", "升等了房間"],
  mid:   ["普通"],
  low:   ["等了很久", "態度冷淡"],
  extras:["要排隊", "文件填很多", "電話接不通"]
};
COMMENT_BANK[T_SHOP] = {
  high:  ["商品齊全", "店員親切", "找到想要的", "價格實在", "陳列好看"],
  mid:   ["普通逛逛", "選擇不多", "沒特別"],
  low:   ["店員愛理不理", "缺貨太多", "標價有點貴", "找不到要的"],
  extras:["結帳排隊", "試衣間排隊", "音樂太大聲"]
};
COMMENT_BANK[T_UGSHOP] = {
  high:  ["地下街便宜", "好挖寶", "店家有特色", "夠多元", "意外好逛"],
  mid:   ["普普通通", "沒亮點"],
  low:   ["通道太暗", "招牌看不清", "走道擠"],
  extras:["很難找路", "通風差", "地圖看不懂"]
};
COMMENT_BANK[T_CINEMA] = {
  high:  ["大螢幕震撼", "音效爆棚", "座位很舒服", "畫質清晰", "杜比超讚"],
  mid:   ["看看就好", "普通片"],
  low:   ["座位太硬", "冷氣超強", "音量過大"],
  extras:["隔壁人講話", "爆米花太貴", "票難買", "預告太多"]
};
COMMENT_BANK[T_GYM] = {
  high:  ["器材齊全", "教練專業", "音樂帶勁", "空間夠大", "毛巾很乾淨"],
  mid:   ["普通練"],
  low:   ["器材壞了", "太多人", "更衣間擠"],
  extras:["跑步機嘎吱響", "啞鈴都被佔走", "教練不在"]
};
COMMENT_BANK[T_POOL] = {
  high:  ["水質乾淨", "水道夠用", "救生員專業", "水溫剛好", "夜泳超棒"],
  mid:   ["普通泳"],
  low:   ["水太冷", "人太多", "氯味重", "池底滑"],
  extras:["更衣間擠", "毛巾不夠", "蓮蓬頭沒熱水"]
};
COMMENT_BANK[T_SPA] = {
  high:  ["按摩師厲害", "全身放鬆", "環境舒適", "香氛超棒", "蒸氣房舒服"],
  mid:   ["一般", "中等"],
  low:   ["技師力道不對", "蒸氣不夠熱", "等很久"],
  extras:["預約難搶", "更衣室小", "音樂太吵"]
};
COMMENT_BANK[T_OFFICE] = {
  high:  ["環境舒適", "採光好", "空調剛好", "同事融洽", "茶水間齊全"],
  mid:   ["上班嘛", "還可以"],
  low:   ["太悶熱", "印表機又壞了", "鄰桌很吵", "WIFI 不穩"],
  extras:["會議室難訂", "茶水間遠", "椅子不舒服"]
};
COMMENT_BANK[T_LAUNDRY] = {
  high:  ["機器多不用等", "洗得很乾淨", "烘乾快"],
  mid:   ["普通洗"],
  low:   ["機器壞掉", "代幣機沒紙鈔", "烘不乾"],
  extras:["等烘乾 1 小時", "標示不清", "洗劑用完"]
};
COMMENT_BANK[T_SECURITY] = {
  high:  ["同事不錯", "輪班合理", "設備齊全", "茶水間夠"],
  mid:   ["上班發呆"],
  low:   ["夜班好累", "監控太多", "電腦超慢"],
  extras:["咖啡喝完了", "對講機沒電", "螢幕閃爍"]
};
COMMENT_BANK[T_GARBAGE] = {
  high:  ["設備齊全", "團隊不錯", "壓縮機好用"],
  mid:   ["普通上班"],
  low:   ["味道太重", "工作量大", "手套用完"],
  extras:["回收分類繁瑣", "卡車卡住", "雨天髒亂"]
};

function pickVisitorComment(u, rating, p) {
  var bank = COMMENT_BANK[u.type];
  var tier;
  if (bank) {
    if (rating >= 4.0)      tier = bank.high;
    else if (rating >= 3.0) tier = bank.mid;
    else                    tier = bank.low;
  } else {
    // fallback 通用
    if (rating >= 4.5)      tier = ["太棒了！", "非常滿意", "完美"];
    else if (rating >= 3.8) tier = ["整體不錯", "還算滿意", "OK"];
    else if (rating >= 2.8) tier = ["普普通通", "尚可"];
    else if (rating >= 2.0) tier = ["有點失望", "不太理想"];
    else                    tier = ["很糟糕", "體驗很差"];
  }

  // 條件性附加片段（電梯體驗 + 擁擠 + 天氣）
  var extras = [];
  if (p && p.waitedTicks > 300) extras.push("電梯等好久");
  else if (p && p.waitedTicks > 150) extras.push("等了一下");
  if (p && (p.elevSwitchCount || 0) > 0) extras.push("中途換了電梯");
  if (p && p.switchedToEsc) extras.push("改走電扶梯");
  if (u.cap > 0 && u.occupants.length / u.cap > 0.85) extras.push("人有點擠");
  else if (u.cap > 0 && u.occupants.length / u.cap < 0.15) extras.push("有點冷清");
  if (weather === "RAIN") extras.push("外面在下雨");

  // 房型專屬附加片段
  if (bank && bank.extras && random() < 0.35) {
    extras.push(bank.extras[floor(random(bank.extras.length))]);
  }

  var main = tier[floor(random(tier.length))];
  if (extras.length > 0 && random() < 0.7) {
    main += "，" + extras[floor(random(extras.length))];
  }
  return main;
}

// ============================================================================
// 主迴圈：update + draw
// ============================================================================
function draw() {
  // 每幀執行 speedMul 個 tick
  for (var s = 0; s < speedMul; s++) tick();
  renderAll();
}

function tick() {
  // 推進時間
  var prev = simTime;
  simTime += TICK_MS / 1000 * timeSpeed;
  if (simTime >= 24 * 3600) {
    simTime -= 24 * 3600;
    onNewDay();
  }

  if (phase === "building") tickBuilding();
  tickElevators();
  tickPeople();
  spawnPeople();
  tickRevenue(simTime - prev < 0 ? simTime + 24*3600 - prev : simTime - prev);
  tickWeather();
  tickParking();
  recomputeStats();
}

// 停車場：依大樓人潮調整佔用率、車輛動畫
function tickParking() {
  if (phase !== "running") return;
  // 大樓總人數比例（0~1），決定停車場目標佔有率
  var targetRatio = constrain(stats.population / 200, 0.1, 0.95);
  var CAR_PALETTE = ["#ff6b6b","#4ecdc4","#ffe66d","#ff9f43","#5fa2d8",
                      "#a3e635","#f472b6","#fbbf24","#e2e8f0","#94a3b8"];
  for (var i = 0; i < units.length; i++) {
    var u = units[i];
    if (u.type !== T_PARKING || !u.slots) continue;
    // 計算目前佔有率
    var parked = 0;
    for (var s = 0; s < u.slots.length; s++) {
      if (u.slots[s].state !== "empty") parked++;
    }
    var nowRatio = parked / u.slots.length;
    // 動畫推進
    for (var s = 0; s < u.slots.length; s++) {
      var slot = u.slots[s];
      if (slot.state === "entering") {
        slot.animT += 0.04;
        if (slot.animT >= 1) { slot.state = "parked"; slot.animT = 0; }
      } else if (slot.state === "leaving") {
        slot.animT += 0.04;
        if (slot.animT >= 1) {
          slot.state = "empty"; slot.animT = 0; slot.color = null;
        }
      }
    }
    // 機率事件：往目標佔有率靠攏
    if (random() < 0.04) {     // 約 0.8/秒 觸發一次
      if (nowRatio < targetRatio - 0.05) {
        // 找一個 empty 進場
        var emptyIdxs = [];
        for (var s = 0; s < u.slots.length; s++)
          if (u.slots[s].state === "empty") emptyIdxs.push(s);
        if (emptyIdxs.length > 0) {
          var pickIdx = emptyIdxs[floor(random(emptyIdxs.length))];
          u.slots[pickIdx].state = "entering";
          u.slots[pickIdx].color = pick(CAR_PALETTE);
          u.slots[pickIdx].animT = 0;
          u.slots[pickIdx].fromLeft = random() < 0.5;
        }
      } else if (nowRatio > targetRatio + 0.05) {
        // 找一個 parked 離場
        var parkedIdxs = [];
        for (var s = 0; s < u.slots.length; s++)
          if (u.slots[s].state === "parked") parkedIdxs.push(s);
        if (parkedIdxs.length > 0) {
          var pickIdx = parkedIdxs[floor(random(parkedIdxs.length))];
          u.slots[pickIdx].state = "leaving";
          u.slots[pickIdx].animT = 0;
        }
      }
    }
  }
}

function tickWeather() {
  var elapsed = (simTime - weatherChangeAt + 86400) % 86400;
  var dur = WEATHER_INFO[weather].duration;
  if (elapsed > dur) {
    weather = pick(WEATHER_POOL);
    weatherChangeAt = simTime;
    weatherFadeT = 0;
  }
  if (weatherFadeT < 1) weatherFadeT = min(1, weatherFadeT + 0.01);
}

// 每模擬秒推進 dt 秒：處理「每小時固定費用」的房型
function tickRevenue(dtSec) {
  if (phase !== "running" || dtSec <= 0) return;
  var dtHr = dtSec / 3600;
  for (var i = 0; i < units.length; i++) {
    var u = units[i];
    var rev = REVENUE_INFO[u.type];
    if (!rev || rev.perHour === 0) continue;
    var amt = rev.perHour * dtHr;     // 正/負
    u.revenue += amt;
    u.todayRevenue += amt;
  }
}

// 跨日：每個 unit 的 todayRevenue / visitorsToday 重置；同時記錄天數
function onNewDay() {
  stats.day = (stats.day || 0) + 1;
  for (var i = 0; i < units.length; i++) {
    units[i].todayRevenue = 0;
    units[i].visitorsToday = 0;
  }
}

function tickBuilding() {
  var now = millis();
  if (now - lastBuildTime < buildInterval) return;
  if (buildIdx >= buildQueue.length) {
    phase = "running";
    return;
  }
  placeUnit(buildQueue[buildIdx]);
  buildIdx++;
  lastBuildTime = now;
}

// ============================================================================
// 電梯系統
// ============================================================================
function tickElevators() {
  for (var i = 0; i < elevators.length; i++) {
    var el = elevators[i];

    if (el.state === "idle") {
      el.idleTicks++;
      var next = nextElevatorTask(el);
      if (next !== null) {
        el.idleTicks = 0; el.blockedTicks = 0;
        el.targetFloor = next;
        el.direction = (next > el.currentFloor) ? 1 : (next < el.currentFloor ? -1 : 0);
        if (el.direction === 0) {
          el.state = "loading"; el.doorTimer = 24;
        } else {
          el.state = "moving";
        }
      } else if (el.homeFloor !== null && el.idleTicks > 60 &&
                 abs(el.yPos - el.homeFloor) > 0.5) {
        // 直接進 moving 即可（即使被擋，moving 的 breaker 會處理）
        el.targetFloor = el.homeFloor;
        el.direction = (el.homeFloor > el.yPos) ? 1 : -1;
        el.state = "moving";
        el.idleTicks = 0;
        el.blockedTicks = 0;
      }
    } else if (el.state === "moving") {
      // 同井多車視覺重疊：各自獨立，不檢查碰撞
      var prevFloor = el.currentFloor;
      el.yPos += el.direction * el.speed;

      if (el.direction > 0 && el.yPos >= el.targetFloor) {
        el.yPos = el.targetFloor;
        el.currentFloor = el.targetFloor;
        el.state = "loading"; el.doorTimer = 22;
      } else if (el.direction < 0 && el.yPos <= el.targetFloor) {
        el.yPos = el.targetFloor;
        el.currentFloor = el.targetFloor;
        el.state = "loading"; el.doorTimer = 22;
      } else {
        el.currentFloor = round(el.yPos);
        // SCAN：路過樓層 + 有同方向待客 + 還有空位 → 順路停靠
        if (el.currentFloor !== prevFloor && el.passengers.length < el.capacity) {
          var here = el.currentFloor;
          for (var q = 0; q < el.queue.length; q++) {
            var item = el.queue[q];
            if (item.fromFloor !== here) continue;
            var sameDir = (el.direction > 0 && item.toFloor > here) ||
                          (el.direction < 0 && item.toFloor < here);
            if (sameDir) {
              // 截停：這層下車門接這位同方向的乘客
              el.yPos = here;
              el.state = "loading"; el.doorTimer = 22;
              break;
            }
          }
        }
      }
    } else if (el.state === "loading") {
      // 卸客：到達目的地的人下車
      for (var p = el.passengers.length - 1; p >= 0; p--) {
        var ps = el.passengers[p];
        if (ps.toFloor === el.currentFloor) {
          ps.person.floor = el.currentFloor;
          ps.person.x = colX(el.col) + CELL_W / 2;
          ps.person._unitTarget = null;
          ps.person.inElevator = null;
          if (ps.person.returning) {
            // 回到入口樓層 → 走出大樓
            ps.person.state = "leaving";
            ps.person.targetX = leaveTargetX(ps.person);
          } else {
            ps.person.state = "walking_to_unit";
          }
          el.passengers.splice(p, 1);
        }
      }
      // 載客：若車廂空了則允許重設方向
      var effectiveDir = (el.passengers.length === 0) ? 0 : el.direction;
      for (var q = el.queue.length - 1; q >= 0; q--) {
        var item = el.queue[q];
        if (item.fromFloor !== el.currentFloor) continue;
        if (el.passengers.length >= el.capacity) break;
        var sameDir = (effectiveDir === 0) ||
                      (effectiveDir > 0 && item.toFloor > el.currentFloor) ||
                      (effectiveDir < 0 && item.toFloor < el.currentFloor);
        if (!sameDir) continue;
        item.person.state = "in_elevator";
        item.person.inElevator = el.id;
        item.person.toFloor = item.toFloor;
        el.passengers.push({ person: item.person, toFloor: item.toFloor });
        el.queue.splice(q, 1);
        // 第一位乘客上車後鎖定方向
        if (effectiveDir === 0) {
          effectiveDir = (item.toFloor > el.currentFloor) ? 1 : -1;
          el.direction = effectiveDir;
        }
      }
      el.doorTimer--;
      if (el.doorTimer <= 0) {
        // 決定下個目標
        var nxt = nextElevatorTask(el);
        if (nxt === null) {
          el.state = "idle"; el.direction = 0;
        } else {
          el.targetFloor = nxt;
          el.direction = (nxt > el.currentFloor) ? 1 : (nxt < el.currentFloor ? -1 : 0);
          el.state = el.direction === 0 ? "loading" : "moving";
        }
      }
    }
  }
}

function nextElevatorTask(el) {
  // 1) 車內乘客的目的地
  var dests = el.passengers.map(function (p) { return p.toFloor; });
  // 2) queue 內的呼叫樓層
  var calls = el.queue.map(function (q) { return q.fromFloor; });
  var all = dests.concat(calls);
  if (all.length === 0) return null;
  // 同方向優先：找比 currentFloor 高/低 的最近
  if (el.direction >= 0) {
    var up = all.filter(function (f) { return f > el.currentFloor; });
    if (up.length) return min(up);
    var dn = all.filter(function (f) { return f < el.currentFloor; });
    if (dn.length) return max(dn);
  } else {
    var dn2 = all.filter(function (f) { return f < el.currentFloor; });
    if (dn2.length) return max(dn2);
    var up2 = all.filter(function (f) { return f > el.currentFloor; });
    if (up2.length) return min(up2);
  }
  // 同樓層
  if (all.indexOf(el.currentFloor) >= 0) return el.currentFloor;
  return null;
}

function callElevator(person, fromFloor, toFloor, excludeId) {
  // 挑能服務這兩個樓層 + 隊伍最短的電梯（excludeId 可指定排除某部）
  var tripDist = abs(toFloor - fromFloor);
  var best = null, bestScore = Infinity;
  for (var i = 0; i < elevators.length; i++) {
    var el = elevators[i];
    if (excludeId !== undefined && excludeId !== null && el.id === excludeId) continue;
    if (fromFloor < el.minFloor || fromFloor > el.maxFloor) continue;
    if (toFloor   < el.minFloor || toFloor   > el.maxFloor) continue;
    // 跳層電梯：起點或終點在 skip 名單內就不服務
    if (el.skipFloors &&
        (el.skipFloors.indexOf(fromFloor) >= 0 ||
         el.skipFloors.indexOf(toFloor)   >= 0)) continue;
    var dist = abs(el.currentFloor - fromFloor);
    var load = el.queue.length + el.passengers.length;
    var score = dist + load * 3;
    // 高速電梯：≥3 樓的趟給更強偏好；地下層上下也偏好高速
    if (el.type === "express") {
      if (tripDist >= 3) score -= 6;
      else score -= 2;
      if (fromFloor < 0 || toFloor < 0) score -= 2;
    }
    // 多車共井分區：同 zone 的趟強偏好、跨 zone 的罰分
    if (el.homeFloor !== null) {
      var radius = 8;
      var zoneMin = el.homeFloor - radius;
      var zoneMax = el.homeFloor + radius;
      var bothInZone = (fromFloor >= zoneMin && fromFloor <= zoneMax &&
                        toFloor   >= zoneMin && toFloor   <= zoneMax);
      if (bothInZone) {
        score -= 5;
      } else {
        var center = (fromFloor + toFloor) / 2;
        if (abs(center - el.homeFloor) > radius) score += 5;
      }
    }
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (!best) return false;
  best.queue.push({ person: person, fromFloor: fromFloor, toFloor: toFloor });
  return best;
}

// 判斷某趟行程能否用電扶梯（兩端皆在 B4 ~ 3F 範圍內、距離 ≤ 4 樓）
function canUseEscalator(fromFloor, toFloor) {
  if (!escalator) return false;
  if (fromFloor === toFloor) return false;
  var lo = min(fromFloor, toFloor), hi = max(fromFloor, toFloor);
  if (lo < escalator.minFloor || hi > escalator.maxFloor) return false;
  if (hi - lo > 10) return false;      // 超過 10 樓的差還是用電梯
  return true;
}

// ============================================================================
// 人流系統
// ============================================================================
// 人的狀態：
//   spawning → walking_to_elev → waiting_elev → in_elevator
//   → walking_to_unit → at_unit → leaving → done

function spawnPeople() {
  var hour = simTime / 3600;
  var baseRate, popCap;

  if (phase === "building") {
    // 建造期：依工程進度逐漸放行人潮
    var progress = buildIdx / max(1, buildQueue.length);
    baseRate = progress * 0.30;             // 0% → 0; 100% → 0.30
    popCap   = floor(30 + progress * 320);  // 30 → 350
  } else {
    // 營運期：全時段加碼，整體人潮拉高
    baseRate = 0.12;
    if      (hour >= 7  && hour <= 9 ) baseRate = 0.55;   // 早上上班潮
    else if (hour >= 11 && hour <= 13) baseRate = 0.50;   // 午餐 + 商街
    else if (hour >= 14 && hour <= 16) baseRate = 0.35;   // 下午購物
    else if (hour >= 17 && hour <= 20) baseRate = 0.55;   // 傍晚下班 + 晚餐 + 電影
    else if (hour >= 20 && hour <= 22) baseRate = 0.20;
    else if (hour >= 22 || hour <  6 ) baseRate = 0.06;
    popCap = 380;
  }
  baseRate *= speedMul;

  if (random() < baseRate && people.length < popCap) {
    spawnOnePerson();
  }
}

function spawnOnePerson() {
  // 決定入口：地鐵 55%（觀光 / 通勤）/ 大廳 25% / 停車場 20%
  var entryRand = random();
  var entryFloor;
  if (entryRand < 0.55) {
    entryFloor = -4;                        // 地鐵
  } else if (entryRand < 0.80) {
    entryFloor = 0;                         // 大廳
  } else {
    var parkingFloors = [-3, -7, -8, -9, -10];
    entryFloor = pick(parkingFloors);       // 停車場
  }
  // 決定目的：根據時間挑類型
  var hour = simTime / 3600;
  var pool = [];
  // 員工常駐池（每個時段都加，保證有人值班）
  var STAFF = [T_SECURITY, T_GARBAGE, T_RECEPTION];

  if (hour >= 7 && hour <= 10) {
    // 早上：上班族 + 員工換班 + 早餐 / 早市購物
    pool = [T_OFFICE, T_OFFICE, T_OFFICE, T_OFFICE,
            T_SECURITY, T_GARBAGE, T_RECEPTION, T_RECEPTION,
            T_SHOP, T_SHOP, T_UGSHOP, T_UGSHOP,
            T_RESTAURANT, T_LAUNDRY, T_POOL];
  } else if (hour >= 11 && hour <= 14) {
    pool = [T_RESTAURANT, T_RESTAURANT, T_RESTAURANT, T_RESTAURANT, T_RESTAURANT,
            T_SHOP, T_SHOP, T_SHOP, T_SHOP,
            T_UGSHOP, T_UGSHOP, T_UGSHOP, T_UGSHOP,
            T_OFFICE, T_GYM, T_SPA, T_LAUNDRY,
            T_SECURITY, T_RECEPTION];                          // 加員工
  } else if (hour >= 14 && hour <= 17) {
    pool = [T_SHOP, T_SHOP, T_SHOP, T_SHOP, T_SHOP,
            T_UGSHOP, T_UGSHOP, T_UGSHOP, T_UGSHOP,
            T_RESTAURANT, T_RESTAURANT,
            T_OFFICE, T_GYM, T_CINEMA, T_SPA, T_POOL, T_HOTEL,
            T_SECURITY, T_GARBAGE, T_RECEPTION];                // 加員工
  } else if (hour >= 17 && hour <= 21) {
    pool = [T_RESTAURANT, T_RESTAURANT, T_RESTAURANT, T_RESTAURANT, T_RESTAURANT,
            T_CINEMA, T_CINEMA, T_CINEMA,
            T_SHOP, T_SHOP, T_SHOP, T_SHOP,
            T_UGSHOP, T_UGSHOP, T_UGSHOP,
            T_OFFICE, T_HOTEL, T_HOTEL, T_POOL, T_SPA,
            T_SECURITY, T_RECEPTION];                           // 加員工（晚班換班）
  } else {
    pool = [T_CINEMA, T_CINEMA, T_RESTAURANT, T_RESTAURANT,
            T_HOTEL, T_HOTEL, T_UGSHOP,
            T_RECEPTION, T_RECEPTION, T_SECURITY, T_SECURITY];  // 夜班加重
  }
  var targetType = pick(pool);
  // 預估每個 unit「現有 occupants + 在路上」的人數，避免超量
  var expectedMap = {};
  for (var i = 0; i < people.length; i++) {
    var pp = people[i];
    if (pp.targetUnit &&
        pp.state !== "at_unit" && pp.state !== "leaving" && pp.state !== "done") {
      var key = pp.targetUnit.id;
      expectedMap[key] = (expectedMap[key] || 0) + 1;
    }
  }
  function hasRoom(u) {
    return (u.occupants.length + (expectedMap[u.id] || 0)) < u.cap;
  }
  var candidates = units.filter(function (u) {
    return u.type === targetType && hasRoom(u);
  });
  if (candidates.length === 0) {
    // fallback：訪客可進入的單位（排除員工專用房 + 機房/停車/地鐵/大廳）
    candidates = units.filter(function (u) {
      if (u.type === T_MECH || u.type === T_PARKING || u.type === T_SUBWAY ||
          u.type === T_LOBBY) return false;
      // 員工專用，不收訪客
      if (u.type === T_SECURITY || u.type === T_GARBAGE || u.type === T_RECEPTION) return false;
      return hasRoom(u);
    });
  }
  if (candidates.length === 0) return;
  var unit = pick(candidates);

  // 地下層（地鐵、停車場）從大樓邊緣冒出；地面層從馬路走進來
  var fromLeft = random() < 0.5;
  var spawnX;
  if (entryFloor < 0) {
    spawnX = fromLeft ? TOWER_X + 4 : TOWER_X + TOWER_W - 4;
  } else {
    spawnX = fromLeft ? TOWER_X - 14 : TOWER_X + TOWER_W + 14;
  }
  var p = {
    id: stats.totalSpawned++,
    floor: entryFloor,
    x: spawnX,
    targetX: 0,
    state: "spawning",
    enterFloor: entryFloor,
    targetUnit: unit,
    toFloor: unit.floor,
    color: pick(["#ff6b6b","#4ecdc4","#ffe66d","#ff9f43","#5fa2d8","#a3e635","#f472b6","#fbbf24"]),
    visitDuration: random(UNIT_INFO[unit.type].visitTime[0], UNIT_INFO[unit.type].visitTime[1]),
    visitStart: 0,
    speed: random(0.55, 0.9),
    inElevator: null,
    waitedTicks: 0,
    height: max(4, random(CELL_H * 0.22, CELL_H * 0.30)),  // 跟 cell 高度成比例
    spawnedAt: simTime,           // 安全網用：超時強制 done
  };
  // 走到大樓入口後變成 walking_to_elev
  // 入口位置：地鐵走 col 0 或 21（連通隧道），大廳走 中間靠左
  p.targetX = colX(CORE_START) + CELL_W;  // 走到電梯區
  people.push(p);

  // 若由停車場入場，計入該層停車單位的累計訪客
  if (entryFloor < 0 && entryFloor !== -4) {
    var pkUnits = units.filter(function (u) { return u.type === T_PARKING && u.floor === entryFloor; });
    if (pkUnits.length > 0) {
      var pk = pick(pkUnits);
      pk.totalVisitors = (pk.totalVisitors || 0) + 1;
      pk.visitorsToday = (pk.visitorsToday || 0) + 1;
      p.entryParkingUnit = pk.id;  // 記錄出處
    }
  }
}

// 每 tick 從 people 重算 stats（不再用增減同步避免 drift）
function recomputeStats() {
  stats.population = people.length;
  stats.workers = 0;
  stats.shoppers = 0;
  stats.moviegoers = 0;
  stats.staff = 0;
  stats.commuters = 0;
  stats.guests = 0;
  stats.complaining = 0;
  // 停車單位重設「現場人數」
  for (var i = 0; i < units.length; i++) {
    if (units[i].type === T_PARKING) units[i].transient = 0;
  }
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    var t = p.targetUnit ? p.targetUnit.type : 0;
    if (t === T_OFFICE) stats.workers++;
    else if (t === T_SHOP || t === T_UGSHOP) stats.shoppers++;
    else if (t === T_CINEMA || t === T_RESTAURANT || t === T_GYM ||
             t === T_POOL || t === T_SPA) stats.moviegoers++;
    else if (t === T_SECURITY || t === T_GARBAGE ||
             t === T_LAUNDRY || t === T_RECEPTION) stats.staff++;
    else if (t === T_HOTEL) stats.guests++;
    else stats.commuters++;
    if (p.state === "waiting_elev" && p.waitedTicks > 120) stats.complaining++;
    // 統計現在站在停車場單位內的人
    if (p.state !== "in_elevator" && p.state !== "on_escalator") {
      for (var j = 0; j < units.length; j++) {
        var u = units[j];
        if (u.type !== T_PARKING) continue;
        if (u.floor !== p.floor) continue;
        if (p.x >= colX(u.colStart) && p.x <= colX(u.colEnd + 1)) {
          u.transient++;
          break;
        }
      }
    }
  }
}

function tickPeople() {
  for (var i = people.length - 1; i >= 0; i--) {
    var p = people[i];
    // 安全網：在大樓內超過 20 模擬小時 → 強制離場
    var alive = (simTime - (p.spawnedAt || 0) + 86400) % 86400;
    if (alive > 20 * 3600) p.state = "done";
    updatePerson(p);
    if (p.state === "done") {
      people.splice(i, 1);
    }
  }
}

function updatePerson(p) {
  var speedScale = speedMul;

  if (p.state === "spawning") {
    // 走進大樓
    p.x += (p.targetX > p.x ? 1 : -1) * p.speed * speedScale;
    if (abs(p.x - p.targetX) < 1.5) {
      dispatchToDestination(p);
    }
  } else if (p.state === "walking_to_escalator") {
    // 走到電扶梯前
    if (abs(p.x - p.targetX) > 1) {
      p.x += (p.targetX > p.x ? 1 : -1) * p.speed * speedScale;
    } else {
      // 跨上電扶梯：依方向設 colUp / colDown
      var goUp = p.toFloor > p.floor;
      p.state = "on_escalator";
      p.escDir = goUp ? 1 : -1;
      p.escCol = goUp ? escalator.colUp : escalator.colDown;
      p.escY  = p.floor;     // 浮點，從目前樓層開始
    }
  } else if (p.state === "on_escalator") {
    // 隨電扶梯往上 / 往下移動，每 tick 走一小段
    p.escY += p.escDir * escalator.speed * speedScale;
    // 人保持在電扶梯欄位中央
    p.x = colX(p.escCol) + CELL_W / 2;
    p.floor = round(p.escY);
    // 抵達目標樓層
    if ((p.escDir > 0 && p.escY >= p.toFloor) || (p.escDir < 0 && p.escY <= p.toFloor)) {
      p.floor = p.toFloor;
      p.escY = p.toFloor;
      p.x = colX(p.escCol) + CELL_W / 2;
      if (p.returning) {
        p.state = "leaving";
        p.targetX = leaveTargetX(p);
      } else {
        p.state = "walking_to_unit";
      }
    }
  } else if (p.state === "waiting_elev") {
    // 走到對應電梯位置等
    if (abs(p.x - p.targetX) > 1) {
      p.x += (p.targetX > p.x ? 1 : -1) * p.speed * speedScale;
    } else {
      p.waitedTicks++;

      // 1) 140 ticks (~7 秒) → 改走電扶梯（若路線在範圍內）
      if (p.waitedTicks > 140 && !p.switchedToEsc &&
          canUseEscalator(p.floor, p.toFloor)) {
        var elOld1 = elevators[p.inElevator];
        if (elOld1) {
          for (var k = elOld1.queue.length - 1; k >= 0; k--) {
            if (elOld1.queue[k].person === p) elOld1.queue.splice(k, 1);
          }
        }
        p.switchedToEsc = true;
        p.inElevator = null;
        var goUp = p.toFloor > p.floor;
        var escC = goUp ? escalator.colUp : escalator.colDown;
        p.targetX = colX(escC) + CELL_W / 2;
        p.state = "walking_to_escalator";
        p.waitedTicks = 0;
      }
      // 2) 170 ticks (~8.5 秒) → 改搭其他電梯（排除原本那部）
      else if (p.waitedTicks > 170 && (p.elevSwitchCount || 0) < 2) {
        var oldId = p.inElevator;
        var elOld2 = elevators[oldId];
        if (elOld2) {
          for (var k = elOld2.queue.length - 1; k >= 0; k--) {
            if (elOld2.queue[k].person === p) elOld2.queue.splice(k, 1);
          }
        }
        var ok2 = callElevator(p, p.floor, p.toFloor, oldId);
        if (ok2) {
          p.inElevator = ok2.id;
          p.elevatorCol = ok2.col;
          p.targetX = colX(ok2.col) + CELL_W / 2;
          p.elevSwitchCount = (p.elevSwitchCount || 0) + 1;
          p.waitedTicks = 0;
          p.recallTried = false;
        } else {
          p.elevSwitchCount = 99;    // 沒別台可選 → 鎖死
        }
      }
      // 3) 350 ticks (~17 秒) → 最後手段：強制重新呼叫
      else if (p.waitedTicks > 350 && !p.recallTried) {
        p.recallTried = true;
        var el = elevators[p.inElevator];
        var inQ = el && el.queue.some(function (q) { return q.person === p; });
        if (!inQ) {
          var ok = callElevator(p, p.floor, p.toFloor);
          if (ok) { p.inElevator = ok.id; p.elevatorCol = ok.col; p.targetX = colX(ok.col)+CELL_W/2; }
        }
      }
    }
  } else if (p.state === "in_elevator") {
    // 跟隨電梯
    var el = elevators[p.inElevator];
    if (el) {
      p.floor = el.currentFloor;
      p.x = colX(el.col) + CELL_W / 2;
    }
    // 卸客由電梯 tickElevators 完成（改成 walking_to_unit）
  } else if (p.state === "walking_to_unit") {
    var u = p.targetUnit;
    if (!p._unitTarget) {
      p._unitTarget = colX(u.colStart) + random(CELL_W * 0.3, CELL_W * (u.width - 0.3));
    }
    if (abs(p.x - p._unitTarget) > 1.5) {
      p.x += (p._unitTarget > p.x ? 1 : -1) * p.speed * speedScale;
    } else {
      p.state = "at_unit";
      p.visitStart = simTime;
      if (u.occupants.indexOf(p) < 0) {
        u.occupants.push(p);
        // 一次性收入
        var rev = REVENUE_INFO[u.type];
        if (rev && rev.perVisit[1] > 0) {
          var amt = random(rev.perVisit[0], rev.perVisit[1]);
          u.revenue += amt;
          u.todayRevenue += amt;
        }
        u.totalVisitors++;
        u.visitorsToday++;
        // 計算這次訪客的滿意度（依電梯等待、是否轉乘、擁擠度、天氣等）
        recordVisitorRating(u, p);
      }
    }
  } else if (p.state === "at_unit") {
    var elapsed = (simTime - p.visitStart + 24*3600) % (24*3600);
    if (elapsed > p.visitDuration) {
      // 離開
      var u = p.targetUnit;
      var idx = u.occupants.indexOf(p);
      if (idx >= 0) u.occupants.splice(idx, 1);
      p._unitTarget = null;
      p.returning = true;
      // 目的地：回原進入樓層
      p.toFloor = p.enterFloor;
      if (p.floor === p.toFloor) {
        // 已在原樓層，走出大樓
        p.state = "leaving";
        p.targetX = leaveTargetX(p);
      } else {
        dispatchToDestination(p);
      }
    } else {
      // 小幅遊走
      if (random() < 0.02) {
        var u2 = p.targetUnit;
        p.x = constrain(p.x + random(-CELL_W*0.5, CELL_W*0.5),
                        colX(u2.colStart) + 4,
                        colX(u2.colEnd + 1) - 4);
      }
    }
  } else if (p.state === "leaving") {
    p.x += (p.targetX > p.x ? 1 : -1) * p.speed * speedScale * 1.5;
    if (abs(p.x - p.targetX) < 2) p.state = "done";
  }
}

// 統一的分派：決定該走電扶梯還是電梯
function dispatchToDestination(p) {
  // 重設等待 / 切換狀態，避免上一段行程的累積殘留導致剛叫車就冒紅泡泡
  p.waitedTicks    = 0;
  p.recallTried    = false;
  p.switchedToEsc  = false;
  p.switchedElev   = false;
  p.elevSwitchCount = 0;

  if (p.floor === p.toFloor) {
    if (p.returning) {
      p.state = "leaving";
      p.targetX = leaveTargetX(p);
    } else {
      p.state = "walking_to_unit";
    }
    return;
  }
  // 優先電扶梯（範圍內、距離夠近）
  if (canUseEscalator(p.floor, p.toFloor)) {
    var goUp = p.toFloor > p.floor;
    var col = goUp ? escalator.colUp : escalator.colDown;
    p.targetX = colX(col) + CELL_W / 2;
    p.state = "walking_to_escalator";
    p.useEscalator = true;
    return;
  }
  // 不行就叫電梯
  var ok = callElevator(p, p.floor, p.toFloor);
  if (ok) {
    p.inElevator = ok.id;
    p.elevatorCol = ok.col;
    p.targetX = colX(ok.col) + CELL_W / 2;
    p.state = "waiting_elev";
  } else {
    p.state = "done";
  }
}

// 計算離開大樓的目標位置（地下層留在大樓邊緣）
function leaveTargetX(p) {
  var fromLeft = p.x < TOWER_X + TOWER_W / 2;
  // 地下層（地鐵、停車場）→ 留在大樓邊緣
  if (p.enterFloor < 0) {
    return fromLeft ? TOWER_X + 4 : TOWER_X + TOWER_W - 4;
  }
  return fromLeft ? TOWER_X - 30 : TOWER_X + TOWER_W + 30;
}

function unitCenterX(u) {
  return colX(u.colStart) + (u.colEnd - u.colStart + 1) * CELL_W / 2;
}

// ============================================================================
// 渲染
// ============================================================================
function renderAll() {
  // 螢幕座標：天空、雲、天氣覆色（不跟著縮放）
  drawSky();
  drawClouds();
  drawWeatherAmbient();

  // 世界座標：套用 zoom + pan
  push();
  translate(panX, panY);
  scale(zoom);
  drawGround();
  drawTower();
  drawUnits();
  drawShafts();
  drawElevatorCars();
  drawEscalator();
  drawPeople();
  drawTowerOutline();
  drawSelectedHighlight();
  pop();

  // 螢幕座標：雨/閃電/HUD/資訊面板
  drawRain();
  drawLightning();
  drawHUD();
  drawInfoPanel();
}

// 天空 + 太陽/月亮
function drawSky() {
  var hour = simTime / 3600;
  var c1, c2, c3;
  if (hour >= 6 && hour < 8) {
    // 日出
    var t = (hour - 6) / 2;
    c1 = lerpCol("#241a3a", "#fcd9a8", t);
    c2 = lerpCol("#3a2a5a", "#ffb887", t);
    c3 = lerpCol("#4a3a6e", "#a8d8f0", t);
  } else if (hour >= 8 && hour < 17) {
    c1 = "#a8d8f0"; c2 = "#7ec4e8"; c3 = "#cfe2ff";
  } else if (hour >= 17 && hour < 20) {
    var t = (hour - 17) / 3;
    c1 = lerpCol("#7ec4e8", "#5a4a7e", t);
    c2 = lerpCol("#a8d8f0", "#e88a6e", t);
    c3 = lerpCol("#cfe2ff", "#ffb887", t);
  } else {
    c1 = "#0a1838"; c2 = "#0c1e3e"; c3 = "#1a2a4e";
  }
  // 直線漸層
  for (var y = 0; y < canvasH; y++) {
    var t = y / canvasH;
    var col;
    if (t < 0.5) col = lerpCol(c1, c2, t * 2);
    else         col = lerpCol(c2, c3, (t - 0.5) * 2);
    stroke(col); line(0, y, canvasW, y);
  }
  // 太陽/月亮
  var celestialT = ((hour - 6 + 24) % 24) / 12;       // 0~1 = 日；1~2 = 夜
  var cx, cy, isNight = (hour < 6 || hour >= 18);
  var arcT = isNight ? (((hour - 18 + 24) % 24) / 12) : ((hour - 6) / 12);
  cx = lerp(40, canvasW - 40, arcT);
  cy = 80 + sin(arcT * PI) * -50 + 30;
  noStroke();
  if (isNight) {
    fill("#f4f4f4"); ellipse(cx, cy, 38, 38);
    fill("#e0e0e0"); ellipse(cx + 6, cy - 4, 8, 8);
    fill("#e0e0e0"); ellipse(cx - 4, cy + 6, 6, 6);
    // 星星
    randomSeed(42);
    for (var i = 0; i < 60; i++) {
      var sx = random(canvasW), sy = random(canvasH * 0.6);
      fill(255, 255, 255, 120 + sin(millis()*0.001 + i)*80);
      ellipse(sx, sy, 2, 2);
    }
    randomSeed(millis());
  } else {
    // 太陽：雨天藏起來、陰天霧化
    if (weather === "SUNNY") {
      // 光暈
      fill(255, 244, 160, 90); ellipse(cx, cy, 70, 70);
      fill("#fff4a0"); ellipse(cx, cy, 46, 46);
      fill("#ffd870"); ellipse(cx, cy, 36, 36);
      // 光芒（slow rotation）
      stroke(255, 220, 120, 100); strokeWeight(2);
      var rotT = millis() * 0.0003;
      for (var r = 0; r < 8; r++) {
        var ang = rotT + r * (PI / 4);
        line(cx + cos(ang) * 24, cy + sin(ang) * 24,
             cx + cos(ang) * 30, cy + sin(ang) * 30);
      }
      noStroke();
    } else if (weather === "CLOUDY") {
      fill(255, 244, 180, 90); ellipse(cx, cy, 38, 38);
      fill(255, 230, 160, 130); ellipse(cx, cy, 30, 30);
    }
    // RAIN：太陽完全藏在雲後
  }
}

// 雲朵漂動（晴天少且白，陰雨天多且灰）
function drawClouds() {
  var density;
  if (weather === "SUNNY") density = 0.35;
  else if (weather === "CLOUDY") density = 1.0;
  else density = 1.0; // RAIN
  var greyMix = (weather === "RAIN") ? 0.6 : (weather === "CLOUDY" ? 0.3 : 0);
  noStroke();
  for (var i = 0; i < cloudsArr.length; i++) {
    var c = cloudsArr[i];
    c.x += c.speed * (weather === "RAIN" ? 1.4 : 1);
    if (c.x > canvasW + c.w) c.x = -c.w;
    if (i / cloudsArr.length > density) continue;
    var base = 255 * c.shade;
    var grey = lerp(base, 130, greyMix);
    var alpha = (weather === "SUNNY") ? 180 : 230;
    fill(grey, grey, grey + 5, alpha);
    ellipse(c.x, c.y, c.w, c.h);
    ellipse(c.x - c.w * 0.25, c.y + 3, c.w * 0.7, c.h * 0.85);
    ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.7, c.h * 0.85);
    ellipse(c.x,             c.y - 3, c.w * 0.55, c.h * 0.7);
    // 雲底陰影（雨天較深）
    if (weather !== "SUNNY") {
      fill(grey * 0.7, grey * 0.7, grey * 0.75, alpha);
      ellipse(c.x, c.y + c.h * 0.3, c.w * 0.85, c.h * 0.4);
    }
  }
}

// 整幕半透明覆色（陰雨灰、夜更暗）
function drawWeatherAmbient() {
  var info = WEATHER_INFO[weather];
  if (!info.ambient) return;
  noStroke();
  fill(info.ambient);
  rect(0, 0, canvasW, canvasH);
}

// 雨滴
function drawRain() {
  if (weather !== "RAIN") return;
  // 補新雨滴
  while (rainDrops.length < 90) {
    rainDrops.push({
      x: random(-20, canvasW),
      y: random(-canvasH, 0),
      speed: random(9, 14),
      length: random(7, 14),
    });
  }
  stroke(180, 210, 235, 200); strokeWeight(1);
  for (var i = rainDrops.length - 1; i >= 0; i--) {
    var d = rainDrops[i];
    line(d.x, d.y, d.x - 2, d.y + d.length);
    d.x -= 1.5;
    d.y += d.speed;
    if (d.y > canvasH || d.x < -20) rainDrops.splice(i, 1);
  }
  strokeWeight(1); noStroke();
  // 地面水花
  var groundY = floorY(0) + CELL_H;
  for (var i = 0; i < 8; i++) {
    if (random() > 0.4) continue;
    var sx = random(canvasW);
    fill(200, 220, 240, 120);
    ellipse(sx, groundY + 4, random(2, 4), 1);
  }
}

// 閃電
function drawLightning() {
  if (weather !== "RAIN") return;
  if (random() < 0.004) {
    lightnings.push({ at: millis(), x: random(canvasW * 0.2, canvasW * 0.8) });
  }
  for (var i = lightnings.length - 1; i >= 0; i--) {
    var l = lightnings[i];
    var age = millis() - l.at;
    if (age > 250) { lightnings.splice(i, 1); continue; }
    var alpha = (250 - age) / 250 * 200;
    // 全幕亮閃
    noStroke();
    fill(255, 255, 220, alpha * 0.4);
    rect(0, 0, canvasW, canvasH);
    // 閃電線
    stroke(255, 255, 220, alpha);
    strokeWeight(2);
    var sx = l.x, sy = 0;
    var segs = 6;
    for (var k = 0; k < segs; k++) {
      var ny = sy + canvasH * 0.5 / segs;
      var nx = sx + random(-18, 18);
      line(sx, sy, nx, ny);
      sx = nx; sy = ny;
    }
    strokeWeight(1); noStroke();
  }
}

function drawGround() {
  var groundY = floorY(0) + CELL_H;       // 1F 底 = 地表
  noStroke();
  // 地下泥土（大樓兩側、從地表往下到 canvas 底）
  fill("#3d2e1e");
  rect(0, groundY, TOWER_X, canvasH - groundY);
  rect(TOWER_X + TOWER_W, groundY, canvasW - (TOWER_X + TOWER_W), canvasH - groundY);
  // 地表草地（路兩側）
  fill(PALETTE.ground);
  rect(0, groundY - 4, TOWER_X, 4);
  rect(TOWER_X + TOWER_W, groundY - 4, canvasW - (TOWER_X + TOWER_W), 4);
  // 路面（從大樓兩側往外延伸）
  fill(PALETTE.street);
  rect(0, groundY, TOWER_X, 22);
  rect(TOWER_X + TOWER_W, groundY, canvasW - (TOWER_X + TOWER_W), 22);
  // 路面分隔線
  fill(PALETTE.streetLn);
  for (var x = 4; x < TOWER_X - 10; x += 22) rect(x, groundY + 10, 12, 2);
  for (var x = TOWER_X + TOWER_W + 4; x < canvasW; x += 22) rect(x, groundY + 10, 12, 2);
}

// 大樓主結構（背景牆）
function drawTower() {
  // 地基（B5~0）：深灰
  for (var fi = 0; fi < FLOOR_COUNT; fi++) {
    var floor = iFloor(fi);
    var y = floorY(floor);
    var bg;
    if (floor < 0) {
      // 地下：階段性顏色
      bg = (floor <= -3) ? "#1f2024" : "#2a2a32";
    } else {
      bg = "#e8e0c8";
    }
    noStroke();
    fill(bg);
    rect(TOWER_X, y, TOWER_W, CELL_H);
    // 樓地板線
    stroke(floor < 0 ? "#10101a" : "#a89c80");
    line(TOWER_X, y + CELL_H, TOWER_X + TOWER_W, y + CELL_H);
  }
  // 地鐵層 (B4) 軌道區
  var ty = floorY(-4) + CELL_H - 8;
  noStroke();
  fill("#101418");
  rect(TOWER_X - 60, floorY(-4), TOWER_W + 120, CELL_H);
  // 軌道
  stroke("#444"); strokeWeight(2);
  line(TOWER_X - 60, ty,     TOWER_X + TOWER_W + 60, ty);
  line(TOWER_X - 60, ty + 5, TOWER_X + TOWER_W + 60, ty + 5);
  strokeWeight(1);
  for (var x = TOWER_X - 60; x < TOWER_X + TOWER_W + 60; x += 8) {
    stroke("#5a3e2a"); line(x, ty - 2, x + 4, ty - 2);
  }
}

function drawUnits() {
  for (var i = 0; i < units.length; i++) {
    drawUnit(units[i]);
  }
}

function drawUnit(u) {
  var info = UNIT_INFO[u.type];
  var x0 = colX(u.colStart);
  var y0 = floorY(u.floor);
  var w = u.width * CELL_W;
  var h = CELL_H;
  noStroke();
  // 底色
  fill(info.bg);
  rect(x0 + 1, y0 + 2, w - 2, h - 3);

  // 上緣裝飾
  fill(info.trim);
  rect(x0 + 2, y0 + 2, w - 4, 2);
  // 下緣
  fill(0, 0, 0, 40);
  rect(x0 + 2, y0 + h - 4, w - 4, 2);

  // 內部：依類型不同
  if (u.type === T_OFFICE) drawOffice(u, x0, y0, w, h);
  else if (u.type === T_SHOP || u.type === T_UGSHOP) drawShop(u, x0, y0, w, h);
  else if (u.type === T_CINEMA)     drawCinema(u, x0, y0, w, h);
  else if (u.type === T_SUBWAY)     drawSubway(u, x0, y0, w, h);
  else if (u.type === T_LOBBY)      drawLobby(u, x0, y0, w, h);
  else if (u.type === T_RESTAURANT) drawRestaurant(u, x0, y0, w, h);
  else if (u.type === T_GYM)        drawGym(u, x0, y0, w, h);
  else if (u.type === T_SECURITY)   drawSecurity(u, x0, y0, w, h);
  else if (u.type === T_GARBAGE)    drawGarbage(u, x0, y0, w, h);
  else if (u.type === T_PARKING)    drawParking(u, x0, y0, w, h);
  else if (u.type === T_MECH)       drawMech(u, x0, y0, w, h);
  else if (u.type === T_HOTEL)      drawHotel(u, x0, y0, w, h);
  else if (u.type === T_RECEPTION)  drawReception(u, x0, y0, w, h);
  else if (u.type === T_LAUNDRY)    drawLaundry(u, x0, y0, w, h);
  else if (u.type === T_POOL)       drawPool(u, x0, y0, w, h);
  else if (u.type === T_SPA)        drawSpa(u, x0, y0, w, h);

  // 名稱 emoji（單位最左格）
  if (u.width >= 2) {
    textAlign(LEFT, TOP); textSize(8);
    fill(255, 255, 255, 110);
    text(info.emoji, x0 + 3, y0 + 3);
  }

  // 高人氣 → 喧嘩泡泡
  drawCrowdNoise(u, x0, y0, w, h);
}

// 占用比例高的場所會冒出對話泡泡（喧嘩感）
function drawCrowdNoise(u, x, y, w, h) {
  // 不適合喧嘩的房型直接跳過
  if (u.type === T_OFFICE || u.type === T_HOTEL || u.type === T_SPA ||
      u.type === T_MECH || u.type === T_GARBAGE || u.type === T_SECURITY ||
      u.type === T_PARKING) return;
  var ratio = u.cap > 0 ? (u.occupants.length / u.cap) : 0;
  if (ratio < 0.4 && u.type !== T_SUBWAY) return;        // 地鐵特例：固定有人潮
  // 地鐵額外用一個假人氣
  if (u.type === T_SUBWAY) {
    var hour = simTime / 3600;
    var rushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
    ratio = rushHour ? 0.9 : 0.5;
  }
  var nBubbles = floor(ratio * 4) + 1;
  var t = millis();
  for (var i = 0; i < nBubbles; i++) {
    var period = 1400 + i * 230;
    var phase = ((t + i * 500) % period) / period;        // 0..1（上升）
    if (phase > 0.85) continue;                            // 後半段消失
    var bx = x + 12 + (i * 17) % (w - 24) + sin(t * 0.003 + i) * 2;
    var by = y + 4 + (1 - phase) * (h * 0.55);
    var alpha = sin(phase * PI) * 220;
    // 泡泡
    fill(255, 255, 255, alpha);
    ellipse(bx, by, 5, 4);
    // 內側陰影
    fill(150, 150, 160, alpha * 0.4);
    ellipse(bx - 1, by, 3, 2);
    // 三個小點代表喧鬧
    fill(60, 60, 70, alpha);
    rect(bx - 1.5, by, 1, 1);
    rect(bx,        by, 1, 1);
    rect(bx + 1.5,  by, 1, 1);
  }
}

function drawOffice(u, x, y, w, h) {
  var hour = simTime / 3600;
  var lightOn = (hour >= 8 && hour <= 19) || (u.occupants.length > 0);
  var layout = u.layout || { cells: [] };
  noStroke();

  // 以 cell 高度做比例定位，確保在任何 CELL_H 都不超出格子
  var winTop    = y + h * 0.15;                 // 窗戶上緣
  var winH      = max(3, h * 0.35);             // 窗戶高（35%）
  var deskY     = y + h * 0.68;                 // 桌面 y
  var deskH     = max(2, h * 0.08);
  var chairY    = y + h * 0.75;
  var chairH    = max(3, h * 0.20);
  var screenY   = y + h * 0.50;                 // 螢幕（桌上方）
  var screenH   = max(2, h * 0.13);
  var floorBot  = y + h - 2;                    // 留 2px 給樓地板線

  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + 4;
    var cell = layout.cells[i] || { type: "desk", blindsOpen: true, deskCol: "#5a3e2a", accentCol: "#8b3a3a" };

    // 窗戶
    if (cell.blindsOpen) {
      fill(lightOn ? "#ffd87a" : "#3a4660");
      rect(cx, winTop, CELL_W - 8, winH);
    } else {
      fill(lightOn ? "#a88a5a" : "#1c2434");
      rect(cx, winTop, CELL_W - 8, winH);
      stroke(lightOn ? "#7a6030" : "#0a1226"); strokeWeight(1);
      var lines = 3;
      for (var k = 0; k < lines; k++) {
        var ly = winTop + 1 + (winH - 2) * k / max(1, lines - 1);
        line(cx + 1, ly, cx + CELL_W - 9, ly);
      }
      noStroke();
    }

    // 內部設施
    if (cell.type === "desk") {
      fill(cell.deskCol); rect(cx + 2, deskY, CELL_W - 14, deskH);
      fill("#2a2a2a");    rect(cx + CELL_W - 8, chairY, 3, chairH);
      fill("#5fa2d8");    rect(cx + 3, screenY, 4, screenH);
    } else if (cell.type === "desk_plant") {
      fill(cell.deskCol); rect(cx + 2, deskY, CELL_W - 16, deskH);
      fill("#2a2a2a");    rect(cx + CELL_W - 12, chairY, 3, chairH);
      fill("#3a8b3a");    ellipse(cx + CELL_W - 6, deskY - max(1, h * 0.06), 4, 3);
      fill("#6a5040");    rect(cx + CELL_W - 8, deskY + deskH, 4, 2);
    } else if (cell.type === "meeting") {
      fill(cell.deskCol); rect(cx + 2, deskY, CELL_W - 12, max(3, h * 0.12));
      fill("#2a2a2a");
      rect(cx + 1,           deskY - 3, 2, 2);
      rect(cx + CELL_W - 12, deskY - 3, 2, 2);
      rect(cx + 1,           floorBot - 3, 2, 2);
    } else if (cell.type === "sofa") {
      var sofaH = max(3, h * 0.18);
      fill(cell.accentCol); rect(cx + 2, floorBot - sofaH, CELL_W - 14, sofaH);
      fill("#3a1a1a");      rect(cx + 2, floorBot - sofaH - 1, CELL_W - 14, 1);
      fill("#3a2a1a");      rect(cx + CELL_W - 10, floorBot - 2, 4, 2);
    } else if (cell.type === "cabinet") {
      var plantCy = deskY - max(2, h * 0.08);
      fill("#3a8b3a"); ellipse(cx + 5, plantCy, 7, 6);
      fill("#2e7a2e"); ellipse(cx + 5, plantCy - 2, 5, 4);
      fill("#6a5040"); rect(cx + 3, plantCy + 3, 5, 3);
      var cabH = max(5, h * 0.40);
      fill("#6b4d3a"); rect(cx + CELL_W - 12, floorBot - cabH, 6, cabH);
      fill("#5a3e2a"); rect(cx + CELL_W - 12, floorBot - cabH * 0.66, 6, 1);
      fill("#5a3e2a"); rect(cx + CELL_W - 12, floorBot - cabH * 0.33, 6, 1);
    }
  }
}

function drawShop(u, x, y, w, h) {
  var hour = simTime / 3600;
  var open = (u.type === T_UGSHOP) || (hour >= 10 && hour <= 22);
  var layout = u.layout || { type: "convenience", signColor: "#ff6b6b", cells: [], hasClerk: true };

  noStroke();
  // 招牌
  fill(layout.signColor);
  rect(x + 3, y + 4, w - 6, 6);
  // 招牌底邊陰影
  fill(0, 0, 0, 80);
  rect(x + 3, y + 9, w - 6, 1);

  // 店家類型 emoji 在招牌
  var EMOJI = {
    clothing: "👕", books: "📚", bakery: "🥐", convenience: "🏪",
    electronics: "📱", cosmetics: "💄", flowers: "💐"
  };
  textAlign(LEFT, TOP); textSize(6);
  fill(255, 255, 255, 220);
  text(EMOJI[layout.type] || "🛍️", x + 5, y + 4);

  // 店內背景
  fill(open ? "#fff4d8" : "#0a0a14");
  rect(x + 4, y + 12, w - 8, h - 18);

  // 地板
  fill(open ? "#e8d8a0" : "#2a2a32");
  rect(x + 4, y + h - 8, w - 8, 2);

  if (!open) {
    // 打烊：暗 + CLOSED
    fill(255, 80, 80, 120);
    textAlign(CENTER, CENTER); textSize(5);
    text("CLOSED", x + w / 2, y + h / 2);
    return;
  }

  // 商品
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + 3;
    var cell = layout.cells[i] || { productSeed: 0, tvAd: 0 };
    // 留收銀台位置
    if (layout.hasClerk && i === u.width - 1 && u.width >= 2) continue;
    drawShopProducts(cx, y, h, layout.type, cell);
  }

  // 收銀台 + 店員
  if (layout.hasClerk && u.width >= 2) {
    drawShopClerk(x + (u.width - 1) * CELL_W, y, h);
  }
}

function drawShopProducts(cx, y, h, type, cell) {
  var seed = cell.productSeed || 0;
  var sw   = CELL_W - 4;            // 內部寬

  if (type === "clothing") {
    // 衣架掛桿
    fill("#5a3e2a"); rect(cx, y + 14, sw, 1);
    var TS = ["#5fa2d8","#ff6b6b","#ffe66d","#3a8b3a","#f472b6","#ff9f43"];
    for (var k = 0; k < 4; k++) {
      var hx = cx + 1 + k * 5;
      if (hx + 4 > cx + sw) break;
      fill("#888"); rect(hx + 2, y + 14, 1, 1);   // 衣架
      fill(TS[(seed + k) % TS.length]);
      rect(hx, y + 15, 4, 5);                      // 衣身
      fill(0,0,0,50); rect(hx + 1, y + 15, 2, 1); // 領
    }
    // 人形模特
    fill("#cfd8e0"); ellipse(cx + 4, y + h - 17, 3, 3);
    fill("#cfd8e0"); rect(cx + 3, y + h - 15, 3, 6);
    fill("#a83a3a"); rect(cx + 3, y + h - 14, 3, 4);   // 模特衣
    fill("#cfd8e0"); rect(cx + 3, y + h - 10, 3, 2);

  } else if (type === "books") {
    var BC = ["#a83a3a","#3a8b3a","#3a5d6a","#d4a44b","#5a3a7a","#a83a8b","#3a3a8b","#8b5a3a"];
    for (var row = 0; row < 3; row++) {
      var ry = y + 14 + row * 5;
      if (ry + 5 > y + h - 8) break;
      fill("#5a3e2a"); rect(cx, ry + 4, sw, 0.5);   // 層板
      for (var b = 0; b < 10; b++) {
        var bx = cx + b * 1.4;
        if (bx + 1 > cx + sw) break;
        fill(BC[(seed + row * 5 + b) % BC.length]);
        rect(bx, ry, 1.2, 4);
      }
    }

  } else if (type === "bakery") {
    // 蛋糕展示櫃（上）
    fill("#cfd8e0"); rect(cx, y + 14, sw, 5);
    fill("#fff");    rect(cx + 0.5, y + 14.5, sw - 1, 0.5);  // 玻璃反光
    var CK = ["#fff8e0","#f4d6a8","#d4a44b","#c8843a"];
    for (var c = 0; c < 3; c++) {
      var cxk = cx + 1 + c * 4;
      if (cxk + 3 > cx + sw) break;
      fill(CK[(seed + c) % 4]); ellipse(cxk + 1.5, y + 17, 3, 2.5);
      fill("#a83a3a"); ellipse(cxk + 1.5, y + 16, 1, 0.6);   // 草莓
      fill("#3a8b3a"); rect(cxk + 1, y + 15.5, 1, 0.5);      // 葉
    }
    // 麵包架（下）
    fill("#5a3e2a"); rect(cx, y + h - 12, sw, 5);
    fill("#3a2a1a"); rect(cx, y + h - 8, sw, 1);
    var BR = ["#d4a44b","#c8843a","#b8662a","#e8c870"];
    for (var b = 0; b < 4; b++) {
      var bx = cx + 1 + b * 3;
      if (bx + 2 > cx + sw) break;
      fill(BR[(seed + b) % 4]);
      ellipse(bx + 1, y + h - 13, 2.5, 2);
      fill(0,0,0,60); rect(bx + 0.7, y + h - 13, 1.6, 0.4);  // 切口
    }

  } else if (type === "electronics") {
    // 平板 / 手機展示（上）
    fill("#1a1a1a"); rect(cx, y + 14, sw, 5);
    for (var p = 0; p < 4; p++) {
      var px = cx + 1 + p * 3;
      if (px + 2 > cx + sw) break;
      fill("#3a3a3a"); rect(px, y + 15, 2, 3);
      fill((p + seed) % 2 === 0 ? "#5fa2d8" : "#3aff5a");
      rect(px + 0.3, y + 15.3, 1.4, 2.2);
    }
    // 大電視（下）— 固定畫面，不閃
    fill("#222"); rect(cx + 1, y + h - 15, sw - 2, 7);
    var TVC = ["#5fa2d8","#ff6b6b","#3aff5a","#ffd700","#a83a8b"];
    var ad = TVC[(cell.tvAd || 0) % TVC.length];
    fill(ad);       rect(cx + 2, y + h - 14, sw - 4, 5);
    fill(255,255,255,80); rect(cx + 2, y + h - 14, sw - 4, 1);   // 顯示反光（亮邊）
    fill(0,0,0,60); rect(cx + 2, y + h - 10, sw - 4, 1);         // 顯示反光（暗邊）

  } else if (type === "cosmetics") {
    var BC2 = ["#f0c4d4","#d4a44b","#a8d4e0","#cfd8e0","#f4d6a8","#fff","#ffd1dc"];
    for (var row = 0; row < 3; row++) {
      var ry = y + 14 + row * 5;
      if (ry + 4 > y + h - 8) break;
      fill("#fff8e0"); rect(cx, ry + 3.5, sw, 0.5);
      for (var b = 0; b < 5; b++) {
        var bx = cx + 1 + b * 2.5;
        if (bx + 2 > cx + sw) break;
        fill(BC2[(seed + row * 4 + b) % BC2.length]);
        rect(bx, ry + 0.5, 1.6, 3);
        fill("#222"); rect(bx + 0.2, ry, 1.2, 0.6);   // 蓋子
        // 標籤
        fill(255,255,255,150); rect(bx + 0.3, ry + 1.5, 1, 0.4);
      }
    }

  } else if (type === "flowers") {
    fill("#5a3e2a"); rect(cx, y + h - 11, sw, 1);
    var FC = ["#ff6b6b","#f472b6","#ffd700","#d4a4d8","#fff","#a83a3a","#ffaa00"];
    for (var f = 0; f < 5; f++) {
      var fx = cx + 1 + f * 2.5;
      if (fx + 2 > cx + sw) break;
      // 花瓶
      fill(["#5fa2d8","#a8d4e0","#cfd8e0"][f % 3]);
      rect(fx, y + h - 13, 2, 3);
      // 花球（多瓣）
      var col = FC[(seed + f) % FC.length];
      fill(col);
      ellipse(fx + 1, y + h - 15, 2.5, 2);
      fill(col); ellipse(fx + 0.3, y + h - 14, 1.5, 1.2);
      fill(col); ellipse(fx + 1.7, y + h - 14, 1.5, 1.2);
      // 葉子
      fill("#3a8b3a"); rect(fx + 0.7, y + h - 13, 0.6, 0.8);
    }
    // 上方掛花環
    fill("#3a8b3a"); ellipse(cx + sw / 2, y + 16, sw * 0.7, 3);
    fill("#ff6b6b"); ellipse(cx + sw / 2 - 4, y + 16, 2, 1.5);
    fill("#ffe66d"); ellipse(cx + sw / 2 + 4, y + 16, 2, 1.5);

  } else {
    // convenience：通用貨架
    var SC = ["#ff6b6b","#5fa2d8","#ffe66d","#3a8b3a","#fff","#a83a3a","#ff9f43"];
    for (var row = 0; row < 4; row++) {
      var ry = y + 14 + row * 4;
      if (ry + 3 > y + h - 8) break;
      fill("#e0d4a8"); rect(cx, ry + 3, sw, 0.5);   // 層板
      for (var b = 0; b < 6; b++) {
        var bx = cx + b * 1.7;
        if (bx + 1.4 > cx + sw) break;
        fill(SC[(seed + row * 4 + b) % SC.length]);
        rect(bx, ry, 1.5, 3);
        fill(0,0,0,40); rect(bx, ry + 1.2, 1.5, 0.3);   // 商品標籤
      }
    }
  }
}

function drawShopClerk(cx, y, h) {
  var sw = CELL_W - 4;
  // 收銀台
  fill("#3a2a1a"); rect(cx + 2, y + h - 14, sw - 1, 6);
  fill("#5a3e2a"); rect(cx + 2, y + h - 14, sw - 1, 1);
  fill("#1a0d08"); rect(cx + 2, y + h - 9, sw - 1, 1);
  // 收銀機
  fill("#1a1a1a"); rect(cx + 3, y + h - 19, 6, 5);
  fill("#3aff5a"); rect(cx + 4, y + h - 18, 4, 1);    // 螢幕
  fill("#444"); rect(cx + 3, y + h - 14, 6, 0.6);     // 鍵盤
  // 商品掃描槍
  fill("#1a1a1a"); rect(cx + 9, y + h - 16, 2, 1);
  fill("#ff3b30"); rect(cx + 8, y + h - 15.5, 1, 0.4);   // 雷射
  // 店員
  fill("#f4d6a8"); ellipse(cx + sw - 4, y + h - 18, 3, 3);   // 頭
  fill("#3a4a6a"); rect(cx + sw - 6, y + h - 15, 4, 3);      // 制服
  fill("#fff");    rect(cx + sw - 6, y + h - 15, 4, 0.5);    // 領
  fill("#ffd700"); rect(cx + sw - 5, y + h - 14, 1, 0.6);    // 名牌
  // 結帳袋
  fill("#fff"); rect(cx + sw - 7, y + h - 11, 3, 2);
  fill("#ffd700"); rect(cx + sw - 7, y + h - 11, 3, 0.5);
}

function drawCinema(u, x, y, w, h) {
  noStroke();

  // 螢幕：亮度與顏色快速變化模擬影片播放
  var fr = 200 + sin(millis() * 0.018 + u.id) * 40;
  var fg = 170 + sin(millis() * 0.013 + u.id * 1.3) * 60;
  var fb = 130 + sin(millis() * 0.021 + u.id * 0.7) * 80;
  fill(fr, fg, fb);
  rect(x + 3, y + 4, w - 6, 7);
  // 螢幕黑邊框
  fill("#000"); rect(x + 4, y + 5, w - 8, 5);
  // 隨機色塊（影片內容像素）
  var pixT = (millis() / 70) | 0;
  for (var i = 0; i < u.width * 5; i++) {
    var sx = x + 5 + i * 3;
    if (sx > x + w - 6) break;
    var seed = pixT * 7 + i * 31 + u.id * 13;
    fill((seed * 41) % 240, (seed * 67) % 200, (seed * 89) % 220, 180);
    rect(sx, y + 5, 2, 4);
  }
  // 螢幕反光
  fill(255, 255, 255, 60);
  rect(x + 5, y + 5, w - 10, 1);

  // 觀眾席：室內光線隨螢幕忽明忽暗
  var roomLight = 0.4 + sin(millis() * 0.006 + u.id * 0.5) * 0.25;
  var seatBaseR = 35 + roomLight * 60;
  var seatBaseG = 18 + roomLight * 30;
  var seatBaseB = 18 + roomLight * 30;
  fill(seatBaseR, seatBaseG, seatBaseB);
  rect(x + 4, y + 12, w - 8, h - 18);

  // 階梯座位排（顏色稍亮）
  fill(seatBaseR + 20, seatBaseG + 15, seatBaseB + 15);
  for (var i = 0; i < 3; i++) {
    rect(x + 5, y + 14 + i * 4, w - 10, 2);
  }

  // 觀眾頭部剪影（每排）
  var nViewers = max(4, min(u.occupants.length || 0, u.width * 3));
  var seatRows = 3;
  for (var i = 0; i < nViewers; i++) {
    var row = i % seatRows;
    var rowIdx = floor(i / seatRows);
    var vx = x + 7 + rowIdx * 6;
    var vy = y + 14 + row * 4;
    if (vx > x + w - 6) continue;
    // 暗黑剪影
    fill(10, 5, 5, 220);
    ellipse(vx, vy, 2.8, 2.8);
    // 頭髮頂端反射螢幕光
    if (row === 0) {
      fill(fr * 0.3, fg * 0.3, fb * 0.3);
      ellipse(vx, vy - 1, 2, 1);
    }
  }

  // 投影光柱（從螢幕方向往觀眾席投射）
  fill(fr, fg, fb, 25);
  triangle(x + w/2 - 3, y + 11, x + w/2 + 3, y + 11,
           x + w - 6,   y + h - 8);
  triangle(x + w/2 - 3, y + 11, x + w/2 + 3, y + 11,
           x + 6,       y + h - 8);

  // EXIT 標示（綠色）
  fill("#3aff5a");
  rect(x + w - 8, y + h - 8, 4, 3);
  fill("#000"); textSize(4); textAlign(CENTER, TOP);
  text("E", x + w - 6, y + h - 8);

  // 售票員 / 引座員（左下角）
  var ux = x + 6;
  var uy = y + h - 12;
  // 售票口檯子
  fill("#3a2a1a"); rect(ux, uy + 2, 12, 4);
  fill("#5a3e2a"); rect(ux, uy + 2, 12, 1);
  // POS 螢幕
  fill("#1a1a1a"); rect(ux + 1, uy - 2, 4, 3);
  fill("#5fa2d8"); rect(ux + 1.5, uy - 1.5, 3, 1.5);
  // 票（黃色）
  fill("#ffd700"); rect(ux + 6, uy + 1, 3, 1);
  // 售票員
  fill("#a83a3a"); rect(ux + 8, uy - 4, 3, 1);                 // 紅色制服帽
  fill("#f4d6a8"); ellipse(ux + 9.5, uy - 3, 3, 3);            // 頭
  fill("#a83a3a"); rect(ux + 8, uy, 3, 3);                     // 紅色制服
  fill("#ffd700"); rect(ux + 9, uy + 1, 1, 1);                 // 金扣

  // 跑馬燈燈泡
  for (var i = 0; i < u.width * 3; i++) {
    var bx = x + 4 + i * 7;
    if (bx > x + w - 4) break;
    fill(((millis()/200 + i) | 0) % 2 === 0 ? "#ffd700" : "#ff6b00");
    ellipse(bx, y + 2, 2, 2);
  }
}

function drawSubway(u, x, y, w, h) {
  // 月台 + 隧道 + 列車
  noStroke();
  fill("#1c2833"); rect(x, y, w, h);
  // 月台磁磚
  fill("#d8d2b8");
  rect(x + 2, y + h - 10, w - 4, 4);
  // 邊緣警示線
  fill("#ffd700");
  rect(x + 2, y + h - 12, w - 4, 2);
  // 列車（每幾秒進站）
  var t = (millis() / 1000) % 12;
  if (t >= 2 && t <= 9) {
    var tx;
    if (t < 4) tx = lerp(x - w, x + 2, (t - 2) / 2);
    else if (t < 7) tx = x + 2;
    else tx = lerp(x + 2, x + w + 10, (t - 7) / 2);
    fill("#5fa2d8");
    rect(tx, y + 12, w - 4, h - 26);
    fill("#2c3e50");
    // 車窗
    for (var i = 0; i < u.width * 2; i++) {
      var wx = tx + 4 + i * 12;
      if (wx > tx + w - 8) break;
      rect(wx, y + 16, 8, 4);
    }
    // 車頭燈
    fill("#fff");
    rect(tx + w - 6, y + h - 18, 2, 4);
  }
  // 標示燈
  fill("#5fa2d8");
  ellipse(x + 8, y + 8, 4, 4);
}

function drawLobby(u, x, y, w, h) {
  if (u.floor === 0) drawLobbyLower(u, x, y, w, h);
  else               drawLobbyUpper(u, x, y, w, h);
}

// GF 大廳（下半部）：玻璃幕牆、接待櫃台、沙發、棕櫚樹幹、旋轉門、雕塑
function drawLobbyLower(u, x, y, w, h) {
  noStroke();
  // 大玻璃幕牆背景
  fill("#cfe4f0"); rect(x + 4, y + 4, w - 8, h - 10);
  // 窗外綠地
  fill("#5d8c4a"); rect(x + 4, y + h - 14, w - 8, 4);
  // 玻璃格直線
  stroke("#9aa4ad"); strokeWeight(1);
  for (var i = 1; i < u.width; i++) {
    line(x + i * CELL_W, y + 4, x + i * CELL_W, y + h - 7);
  }
  strokeWeight(1); noStroke();
  // 大理石地磚
  fill("#d4c490"); rect(x + 2, y + h - 7, w - 4, 5);
  // 地磚紋
  stroke("#a89c70"); strokeWeight(1);
  for (var i = 0; i < u.width * 2; i++) {
    line(x + 4 + i * 13, y + h - 6, x + 4 + i * 13, y + h - 3);
  }
  noStroke();

  // 棕櫚樹（兩棵）— 樹幹（從地板往上）
  var palm1x = x + CELL_W - 2;
  var palm2x = x + w - CELL_W - 2;
  fill("#5a3e2a");
  rect(palm1x, y + 4, 3, h - 11);
  rect(palm2x, y + 4, 3, h - 11);
  fill("#3a2818");
  for (var k = 0; k < 5; k++) {
    rect(palm1x, y + 8 + k * 4, 3, 1);
    rect(palm2x, y + 8 + k * 4, 3, 1);
  }
  // 樹底花盆
  fill("#7a5a40"); rect(palm1x - 4, y + h - 11, 11, 4);
  fill("#7a5a40"); rect(palm2x - 4, y + h - 11, 11, 4);

  // 接待櫃台（中央偏左）
  var deskX = x + w / 2 - 18;
  fill("#8b6b3a"); rect(deskX, y + h - 14, 22, 8);
  fill("#5a3e2a"); rect(deskX, y + h - 8, 22, 1);
  // 櫃台後人員
  fill("#f4d6a8"); ellipse(deskX + 11, y + h - 18, 3, 3);
  fill("#3a4a6a"); rect(deskX + 10, y + h - 16, 3, 3);
  // 桌面立牌
  fill("#fff"); rect(deskX + 2, y + h - 11, 5, 2);

  // 沙發 / 等候區（右側偏中）
  fill("#8b3a3a"); rect(x + w / 2 + 6, y + h - 13, 16, 5);
  fill("#a82a2a"); rect(x + w / 2 + 6, y + h - 14, 16, 1);
  // 沙發座位區隔
  fill("#5a1a1a"); rect(x + w / 2 + 14, y + h - 12, 1, 4);
  // 茶几
  fill("#6a5040"); rect(x + w / 2 + 24, y + h - 10, 6, 2);

  // 抽象雕塑（左側）
  fill("#d4a44b"); rect(x + 6, y + h - 18, 4, 12);
  fill("#e8c870"); rect(x + 7, y + h - 17, 2, 10);
  fill("#a8842a"); rect(x + 6, y + h - 7, 6, 2);  // 底座

  // 旋轉門（右側）
  var doorX = x + w - 16;
  fill("#5fa2d8"); rect(doorX, y + h - 14, 10, 10);
  fill("#444");
  rect(doorX - 1, y + h - 14, 1, 10);
  rect(doorX + 10, y + h - 14, 1, 10);
  stroke("#222"); strokeWeight(1);
  line(doorX + 5, y + h - 14, doorX + 5, y + h - 4);
  noStroke();
}

// 1F 大廳（上半部 / 中庭）：吊燈、棕櫚葉、懸掛盆栽、玻璃欄杆、藝術畫
function drawLobbyUpper(u, x, y, w, h) {
  noStroke();
  // 天花裝飾線
  fill("#e8d8a0"); rect(x + 2, y + 2, w - 4, 3);

  // 中央大吊燈
  var cx = x + w / 2;
  stroke("#888"); strokeWeight(1);
  line(cx, y + 4, cx, y + 13);
  noStroke();
  fill("#c0a060"); ellipse(cx, y + 13, 16, 4);
  fill("#ffd700"); ellipse(cx, y + 15, 12, 8);
  fill("#fff4a0"); ellipse(cx - 4, y + 17, 3, 3);
  fill("#fff4a0"); ellipse(cx + 4, y + 17, 3, 3);
  fill("#fff4a0"); ellipse(cx,     y + 19, 3, 3);

  // 棕櫚樹頂（葉子展開）
  var palm1x = x + CELL_W - 2;
  var palm2x = x + w - CELL_W - 2;
  // 樹幹從下方延伸進來
  fill("#5a3e2a");
  rect(palm1x, y + h - 12, 3, 12);
  rect(palm2x, y + h - 12, 3, 12);
  // 葉子（兩棵各 4 片）
  function palmLeaves(px, py) {
    fill("#2e7a3e");
    ellipse(px - 6, py,     12, 4);
    ellipse(px + 7, py,     12, 4);
    fill("#3a8b4a");
    ellipse(px - 4, py - 4,  10, 3);
    ellipse(px + 5, py - 4,  10, 3);
    fill("#56a056");
    ellipse(px,     py - 7,  8, 3);
  }
  palmLeaves(palm1x + 1, y + h - 12);
  palmLeaves(palm2x + 1, y + h - 12);

  // 懸掛盆栽（從天花板垂下，避開吊燈位置）
  for (var i = 2; i < u.width - 1; i += 3) {
    var hx = x + i * CELL_W + CELL_W / 2;
    if (abs(hx - cx) < 30) continue;
    if (abs(hx - palm1x) < CELL_W) continue;
    if (abs(hx - palm2x) < CELL_W) continue;
    stroke("#666"); strokeWeight(1);
    line(hx, y + 4, hx, y + 11);
    noStroke();
    fill("#6a5040"); rect(hx - 3, y + 11, 7, 3);
    fill("#3a8b4a"); ellipse(hx, y + 15, 9, 4);
    // 垂藤
    stroke("#3a8b4a"); strokeWeight(1);
    line(hx - 2, y + 15, hx - 2, y + 20);
    line(hx + 2, y + 15, hx + 2, y + 20);
    noStroke();
  }

  // 牆面藝術畫（左側）
  fill("#3a5d6a"); rect(x + 4, y + 10, 12, 9);
  fill("#d4a44b"); rect(x + 5, y + 11, 10, 7);
  fill("#a82a2a"); rect(x + 7, y + 12, 4, 5);
  fill("#5fa2d8"); rect(x + 11, y + 14, 3, 3);
  fill("#3a2a1a"); rect(x + 4, y + 19, 12, 1);   // 畫框下緣

  // 玻璃欄杆基座（往下延伸覆蓋 GF / 1F 樓地板線，視覺上中庭貫通）
  fill("#1a1a22"); rect(x + 2, y + h - 3, w - 4, 4);
  // 玻璃面
  noFill(); stroke(168, 216, 240, 180); strokeWeight(2);
  rect(x + 4, y + h - 7, w - 8, 4);
  // 欄杆立柱
  stroke("#888"); strokeWeight(1);
  for (var i = 1; i < u.width * 2; i++) {
    var lx = x + 4 + i * 13;
    if (lx < x + w - 4) line(lx, y + h - 7, lx, y + h - 3);
  }
  // 扶手
  stroke("#cfd8e0"); strokeWeight(2);
  line(x + 4, y + h - 7, x + w - 4, y + h - 7);
  strokeWeight(1); noStroke();
}

function drawRestaurant(u, x, y, w, h) {
  noStroke();
  // 牆面 / 地板
  fill("#3a2a1a"); rect(x + 3, y + 4, w - 6, h - 8);
  // 木地板紋
  fill("#241510");
  rect(x + 3, y + h - 5, w - 6, 1);

  // 飽和度依占用率：人多時更暖
  var ratio = u.cap > 0 ? min(1, u.occupants.length / u.cap) : 0;
  // 牆面裝飾 / 酒架（最頂）
  for (var i = 0; i < u.width; i++) {
    var fx = x + i * CELL_W + 4;
    fill("#2a1810"); rect(fx, y + 6, CELL_W - 8, 4);
    // 牆掛畫
    fill("#5a3a3a"); rect(fx + 2, y + 7, 4, 3);
    fill("#d4a44b"); rect(fx + 3, y + 7, 2, 2);
  }

  var hasPodium = u.width >= 3;
  var hasBar    = u.width >= 3;
  var firstTableIdx = hasPodium ? 1 : 0;
  var lastTableIdx  = hasBar ? u.width - 2 : u.width - 1;

  // 接待櫃台（最左 cell）
  if (hasPodium) {
    var px = x + 4;
    // 木櫃
    fill("#6b4a30"); rect(px, y + h - 16, CELL_W - 10, 10);
    fill("#8b6a40"); rect(px, y + h - 16, CELL_W - 10, 2);
    fill("#4a3020"); rect(px, y + h - 7, CELL_W - 10, 1);
    // 預約簿
    fill("#d4a44b"); rect(px + 3, y + h - 18, 5, 2);
    fill("#a8842a"); rect(px + 3, y + h - 18, 5, 1);
    // 服務鈴
    fill("#ffd700"); ellipse(px + CELL_W - 14, y + h - 17, 2.5, 2);
    fill("#fff4a0"); ellipse(px + CELL_W - 14, y + h - 17, 1, 1);
    // 接待員
    fill("#f4d6a8"); ellipse(px + 1, y + h - 20, 3, 3);   // 頭
    fill("#1a1a1a"); rect(px,     y + h - 17, 3, 4);      // 黑制服
    fill("#a83a3a"); rect(px,     y + h - 16, 3, 1);      // 領結
  }

  // 酒吧（最右 cell）
  if (hasBar) {
    var bx = x + (u.width - 1) * CELL_W + 4;
    var bw = CELL_W - 10;
    // 吧檯
    fill("#3a2418"); rect(bx, y + h - 14, bw, 8);
    fill("#5a3624"); rect(bx, y + h - 14, bw, 2);
    // 後吧台層架
    fill("#1a0d08"); rect(bx, y + 12, bw, 12);
    // 酒瓶
    var bottleCols = ["#3a8b3a","#3a3a8b","#8b3a3a","#d4a44b","#3a8b8b","#8b3a8b"];
    for (var bi = 0; bi < 6; bi++) {
      var bbx = bx + 1 + bi * 3;
      if (bbx > bx + bw - 2) break;
      fill(bottleCols[bi]);
      rect(bbx, y + 16, 2, 7);
      fill("#1a1a1a"); rect(bbx, y + 15, 2, 1);
    }
    // 倒掛高腳杯架
    stroke("#9aa4ad"); strokeWeight(1);
    line(bx, y + 26, bx + bw, y + 26);
    noStroke();
    for (var gi = 0; gi < 4; gi++) {
      var gx = bx + 2 + gi * 4;
      if (gx > bx + bw - 3) break;
      fill("#cfe2ff");
      triangle(gx, y + 26, gx + 3, y + 26, gx + 1.5, y + 30);
    }
    // 調酒師
    fill("#f4d6a8"); ellipse(bx + bw - 4, y + h - 18, 3, 3);
    fill("#1a1a1a"); rect(bx + bw - 6, y + h - 15, 4, 3);
    fill("#fff");    rect(bx + bw - 6, y + h - 13, 4, 1); // 圍裙
    // 雞尾酒杯
    fill("#a82a2a"); ellipse(bx + bw - 7, y + h - 19, 2, 1);
  }

  // 中間每格一張餐桌
  for (var i = firstTableIdx; i <= lastTableIdx; i++) {
    var cx = x + i * CELL_W;
    drawDiningTable(u, cx, y, h, i, ratio);
    // 吊燈
    var lcx = cx + CELL_W / 2;
    stroke("#a88c5a"); strokeWeight(1);
    line(lcx, y + 4, lcx, y + 11);
    noStroke();
    fill("#3a3a3a"); rect(lcx - 3, y + 10, 6, 1);
    fill("#ffd07a"); ellipse(lcx, y + 13, 6, 5);
    fill("#fff4a0"); ellipse(lcx, y + 13, 3, 3);
  }

  // 服務員走動：多人
  var nTables = max(1, lastTableIdx - firstTableIdx + 1);
  if (nTables > 0) {
    var t = millis() / 1000;
    var rangeMin = x + (firstTableIdx * CELL_W) + 4;
    var rangeMax = x + ((lastTableIdx + 1) * CELL_W) - 4;
    var w1 = rangeMin + ((sin(t * 0.6) + 1) / 2) * (rangeMax - rangeMin);
    drawWaiter(w1, y + h - 8, t);
    var w2 = rangeMin + ((sin(t * 0.5 + PI) + 1) / 2) * (rangeMax - rangeMin);
    drawWaiter(w2, y + h - 8, t + 1);
    if (u.width >= 4) {
      var w3 = rangeMin + ((cos(t * 0.45) + 1) / 2) * (rangeMax - rangeMin);
      drawWaiter(w3, y + h - 8, t + 2.3);
    }
    if (u.width >= 6) {
      var w4 = rangeMin + ((cos(t * 0.4 + PI / 2) + 1) / 2) * (rangeMax - rangeMin);
      drawWaiter(w4, y + h - 8, t + 3.7);
    }
  }
}

function drawDiningTable(u, cellX, y, h, idx, ratio) {
  // 一格一桌：桌寬 CELL_W - 12，置中
  var tw = max(10, CELL_W - 12);
  var tx = cellX + (CELL_W - tw) / 2;
  var ty = y + h - 11;

  // 椅背（左右各一）
  fill("#6a4a30");
  rect(tx - 3, ty - 2, 1, 6);
  rect(tx + tw + 2, ty - 2, 1, 6);

  // 桌面
  fill("#8b6b3a"); rect(tx, ty, tw, 2);
  // 白色桌布
  fill("#fffaea"); rect(tx + 1, ty + 2, tw - 2, 4);
  fill("#f4ecd8"); rect(tx + 1, ty + 5, tw - 2, 1);

  // 桌腳
  fill("#4a3020");
  rect(tx + 1,        ty + 6, 1, 3);
  rect(tx + tw - 2,   ty + 6, 1, 3);

  // 餐盤 × 2 + 玻璃杯 × 2
  fill("#fff"); ellipse(tx + tw / 2 - 3, ty + 1, 3, 1.5);
  fill("#fff"); ellipse(tx + tw / 2 + 3, ty + 1, 3, 1.5);
  // 餐盤上的食物（紅 / 綠 隨機）
  fill((idx % 2 === 0) ? "#c93232" : "#3a8b3a");
  ellipse(tx + tw / 2 - 3, ty + 0.5, 1.5, 1);
  fill("#d4a44b");
  ellipse(tx + tw / 2 + 3, ty + 0.5, 1.5, 1);
  // 紅酒杯
  fill("#a82a2a"); rect(tx + 2,        ty - 2, 1, 2);
  fill("#a82a2a"); rect(tx + tw - 3,   ty - 2, 1, 2);
  // 桌中央蠟燭
  stroke("#fff4a0"); strokeWeight(1);
  line(tx + tw / 2, ty - 3, tx + tw / 2, ty - 1);
  noStroke();
  fill("#ffd07a"); ellipse(tx + tw / 2, ty - 3, 1.5, 2);

  // 顧客：依占用率出現（idx 越前越先填）
  var widthM2 = max(1, u.width - 2);
  var threshold = (idx - 1) / widthM2;
  if (ratio > threshold) {
    // 兩位用餐客
    fill("#f4d6a8"); ellipse(tx,         ty - 3, 3, 3);   // 左客頭
    fill("#3a4a6a"); rect(tx - 1,        ty,     3, 2);
    fill("#f4d6a8"); ellipse(tx + tw,    ty - 3, 3, 3);   // 右客頭
    fill("#a83a3a"); rect(tx + tw - 1,   ty,     3, 2);
  }
}

function drawWaiter(x, y, t) {
  // 走路動畫
  var step = (t * 4) | 0;
  // 黑色背心
  fill("#1a1a1a"); rect(x - 2, y, 4, 4);
  // 白圍裙
  fill("#fff");    rect(x - 2, y + 2, 4, 2);
  // 頭
  fill("#f4d6a8"); ellipse(x, y - 1, 3, 3);
  // 端的托盤
  fill("#a8a8a8"); rect(x - 4, y, 3, 1);
  fill("#fff4a0"); ellipse(x - 3, y - 1, 2, 1);
  // 腿
  fill("#1a1a1a");
  rect(x - 2 + (step % 2), y + 4, 1, 2);
  rect(x + 1 - (step % 2), y + 4, 1, 2);
}

function drawGym(u, x, y, w, h) {
  noStroke();
  fill("#3a8b6b"); rect(x + 3, y + 4, w - 6, h - 8);
  // 鏡面牆
  fill("#5fa2c8"); rect(x + 3, y + 5, w - 6, 4);
  fill(255, 255, 255, 60); rect(x + 4, y + 5, w - 8, 1);

  // 跑步機 / 槓鈴
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + 4;
    // 跑步機底座
    fill("#a0e8c8"); rect(cx, y + h - 10, CELL_W - 10, 3);
    fill("#3a5a4a"); rect(cx, y + h - 10, CELL_W - 10, 1);
    // 把手
    fill("#222"); rect(cx + 4, y + h - 14, 3, 6);
    fill("#444"); rect(cx + 3, y + h - 14, 5, 1);
    // 螢幕
    fill("#1a1a1a"); rect(cx + 2, y + h - 17, 4, 3);
    fill("#3aff5a"); rect(cx + 2.5, y + h - 16.5, 3, 1);
  }

  // 教練（穿運動服 + 計時器）
  var trainerX = x + w - 14;
  var trainerY = y + h - 14;
  fill("#1a1a1a"); rect(trainerX - 2, trainerY - 5, 4, 1);     // 帽簷
  fill("#a83a3a"); ellipse(trainerX, trainerY - 5, 4, 2);       // 紅帽
  fill("#f4d6a8"); ellipse(trainerX, trainerY - 3, 3, 3);       // 頭
  fill("#fff");    rect(trainerX - 2, trainerY, 4, 4);          // 白 T 恤
  fill("#3aff5a"); rect(trainerX - 2, trainerY + 1, 4, 0.6);    // 綠色 logo 條
  fill("#222");    rect(trainerX - 2, trainerY + 4, 4, 1);      // 短褲
  // 哨子
  fill("#ffd700"); ellipse(trainerX + 2, trainerY + 1, 1.5, 1);
  // 計時碼錶（手中）
  fill("#1a1a1a"); rect(trainerX - 4, trainerY + 1, 2, 2);
  fill("#3aff5a"); rect(trainerX - 4, trainerY + 1, 2, 0.8);

  // 走動的會員 / 助教（左側）
  if (u.width >= 3) {
    var t = millis() / 1000;
    var ax = x + 5 + ((sin(t * 0.4) + 1) / 2) * (w - 30);
    // 簡易跑步者
    fill("#5fa2d8"); rect(ax - 1, y + h - 11, 2, 3);    // 上衣
    fill("#1a1a1a"); rect(ax - 1, y + h - 8, 2, 1);     // 短褲
    fill("#f4d6a8"); ellipse(ax, y + h - 13, 2, 2);     // 頭
  }
}

function drawSecurity(u, x, y, w, h) {
  noStroke();
  // 暗色機房牆
  fill("#15151c"); rect(x + 3, y + 4, w - 6, h - 8);
  // 地板
  fill("#0a0a10"); rect(x + 3, y + h - 5, w - 6, 1);

  var layout = u.layout || { cells: [] };
  var t = (millis() / 80) | 0;

  // 上半部：CCTV 螢幕牆（每格 2 個監視器）
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W;
    var cell = layout.cells[i] || { feedType: i % 5, ledSeed: i };
    drawCCTVColumn(cx, y, cell, t);
  }

  // 中間：細燈條 / 標籤
  fill("#3a3a4a"); rect(x + 3, y + 17, w - 6, 1);
  fill("#1a1a22"); rect(x + 3, y + 18, w - 6, 2);

  // 下半部：工作站 + 桌椅 + 坐班警衛
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W;
    var cell = layout.cells[i] || {};
    drawSecurityDesk(cx, y, h, i, cell, t);
  }

  // 巡邏警衛走動：多人
  var t2 = millis() / 1000;
  var px = x + 5 + ((sin(t2 * 0.4) + 1) / 2) * (w - 14);
  drawSecurityGuard(px, y + h - 8, t2, false);
  if (u.width >= 4) {
    var px2 = x + 5 + ((sin(t2 * 0.32 + PI) + 1) / 2) * (w - 14);
    drawSecurityGuard(px2, y + h - 8, t2 + 1.5, true);
  }
  if (u.width >= 7) {
    var px3 = x + 5 + ((cos(t2 * 0.28) + 1) / 2) * (w - 14);
    drawSecurityGuard(px3, y + h - 8, t2 + 3.2, false);
  }
}

// CCTV：每格疊 2 個監視器，呈現不同畫面
function drawCCTVColumn(cx, y, cell, t) {
  var sw = CELL_W - 6;
  var sh = 5;
  for (var s = 0; s < 2; s++) {
    var sy = y + 5 + s * 6;
    // 外框
    fill("#1a1a1a"); rect(cx + 2, sy, sw + 2, sh + 2);
    fill("#3a3a3a"); rect(cx + 3, sy + 1, sw, sh);
    // 畫面內容
    drawCCTVFeed(cx + 3, sy + 1, sw, sh, (cell.feedType + s) % 5, (cell.ledSeed + s * 7) | 0, t);
    // 監視器邊框反光
    stroke("#5a5a5a"); strokeWeight(1);
    line(cx + 3, sy + 1, cx + 3 + sw, sy + 1);
    noStroke();
    // 狀態 LED（左下角）
    fill(((t / 5 + s) | 0) % 4 === 0 ? "#ff6b6b" : "#3aff5a");
    rect(cx + 2, sy + sh + 1, 1, 1);
  }
}

function drawCCTVFeed(sx, sy, sw, sh, type, seed, t) {
  if (type === 0) {
    // 大廳：暖色 + 人影走過
    fill("#3a2a18"); rect(sx, sy, sw, sh);
    fill("#5a3a22"); rect(sx, sy + sh - 1, sw, 1);
    // 移動人影
    var mx = sx + (((t / 4 + seed) % (sw * 2)) % sw);
    fill("#2a2a2a"); ellipse(mx, sy + sh - 2, 1.5, 2);
  } else if (type === 1) {
    // 走廊：透視冷色
    fill("#1a2a3a"); rect(sx, sy, sw, sh);
    stroke("#3a5a7a"); strokeWeight(1);
    line(sx, sy,           sx + sw / 2, sy + sh - 2);
    line(sx + sw, sy,      sx + sw / 2, sy + sh - 2);
    line(sx, sy + sh - 1,  sx + sw / 2, sy + sh - 2);
    line(sx + sw, sy + sh - 1, sx + sw / 2, sy + sh - 2);
    noStroke();
    // 遠處人影
    if ((t + seed) % 12 < 6) {
      fill("#5a5a5a"); rect(sx + sw / 2 - 0.5, sy + sh - 3, 1, 1.5);
    }
  } else if (type === 2) {
    // 戶外：天空 + 街景
    fill("#3a5a7a"); rect(sx, sy, sw, sh - 1);
    fill("#1a3a1a"); rect(sx, sy + sh - 1, sw, 1);
    fill("#1a1a1a"); rect(sx + 1, sy + 1, 1, sh - 2);
    fill("#2a2a2a"); rect(sx + sw - 2, sy + 2, 1, sh - 3);
    // 雲
    fill(255, 255, 255, 120);
    ellipse(sx + ((t / 8 + seed) % sw), sy + 1, 2, 1);
  } else if (type === 3) {
    // 信號雜訊
    for (var k = 0; k < sw; k++) {
      var noise = ((k * 7 + seed * 3 + t) | 0) % 5;
      fill(noise < 2 ? "#1a1a1a" : noise < 4 ? "#4a4a4a" : "#aaa");
      rect(sx + k, sy, 1, sh);
    }
    // 紅色 NO SIGNAL
    fill("#ff3b30"); rect(sx + 1, sy + sh / 2 - 0.5, sw - 2, 1);
  } else {
    // 電梯內：垂直線條 + 偶爾人影
    fill("#252535"); rect(sx, sy, sw, sh);
    stroke("#3a3a4a"); strokeWeight(1);
    line(sx, sy + sh - 1, sx + sw, sy + sh - 1);
    noStroke();
    if ((t + seed) % 10 < 5) {
      fill("#5a5a5a"); ellipse(sx + sw / 2, sy + sh - 2, 1.5, 2);
    }
    // 樓層號碼
    fill("#ffd700"); rect(sx + sw - 3, sy + 1, 2, 1);
  }
}

function drawSecurityDesk(cx, y, h, idx, cell, t) {
  var dx = cx + 3;
  var dw = CELL_W - 6;
  var dy = y + h - 11;

  // 工作桌
  fill("#2a1a10"); rect(dx, dy + 3, dw, 2);
  fill("#3a2418"); rect(dx, dy + 3, dw, 1);
  // 桌腳
  fill("#1a0d08"); rect(dx + 1,      dy + 5, 1, 4);
  fill("#1a0d08"); rect(dx + dw - 2, dy + 5, 1, 4);

  // 桌上電腦螢幕
  var monX = dx + 1, monY = dy - 3;
  fill("#0a0a0a"); rect(monX, monY, 7, 5);
  // 螢幕內容（綠色終端機 / 藍色監控介面交替）
  var screenT = (millis() / 200 + idx * 7) | 0;
  if (idx % 2 === 0) {
    // 綠色終端機
    fill("#0a1a0a"); rect(monX + 0.5, monY + 0.5, 6, 4);
    fill("#3aff5a");
    textSize(3); textAlign(LEFT, TOP);
    text((10 + (screenT % 90)) + "%", monX + 1, monY + 0.5);
    rect(monX + 1, monY + 3, (screenT % 5) + 1, 0.5);
  } else {
    // 藍色監控介面 + 移動的紅點
    fill("#0a1a2a"); rect(monX + 0.5, monY + 0.5, 6, 4);
    fill("#5fa2d8"); rect(monX + 1, monY + 1, 5, 0.5);
    fill("#ff3b30"); rect(monX + 1 + ((screenT % 6)), monY + 2, 1, 1);
  }
  // 螢幕支架
  fill("#444"); rect(monX + 3, monY + 5, 1, 1);
  fill("#666"); rect(monX + 2, monY + 6, 3, 0.5);

  // 鍵盤
  fill("#1a1a1a"); rect(dx + 1, dy + 1, 7, 1.5);
  // 鍵盤按鍵紋
  fill("#2a2a2a");
  for (var k = 0; k < 6; k++) rect(dx + 1.5 + k, dy + 1.3, 0.6, 1);

  // 滑鼠
  fill("#1a1a1a"); ellipse(dx + 9, dy + 2, 2, 1.5);

  // 椅子靠背
  fill("#1a1a1a"); rect(dx + dw - 4, dy - 1, 2, 7);
  // 椅子輪
  fill("#444"); ellipse(dx + dw - 3, dy + 8, 2, 1);

  // 坐班警衛（若有）
  if (cell.hasGuard) {
    // 帽
    fill("#1a4d8c"); ellipse(dx + dw - 4, dy - 4, 4, 2);
    fill("#0a3a7c"); rect(dx + dw - 6, dy - 4, 4, 1);
    // 頭
    fill("#f4d6a8"); ellipse(dx + dw - 4, dy - 2, 3, 3);
    // 制服
    fill("#1a4d8c"); rect(dx + dw - 5, dy + 1, 3, 3);
    fill("#ffd700"); rect(dx + dw - 4, dy + 2, 1, 1);   // 徽章

    // 看著螢幕
    fill("#222"); rect(dx + dw - 5, dy - 1, 1, 0.5);    // 眼睛
  }

  // 咖啡杯（部分桌）
  if (cell.hasCoffee) {
    fill("#fff"); rect(dx + dw - 9, dy + 1, 2, 2);
    fill("#4a2a10"); rect(dx + dw - 9, dy + 1, 2, 1);
    fill("#fff"); rect(dx + dw - 7, dy + 1.5, 1, 1);     // 杯耳
    // 蒸氣
    var sh = ((millis() / 100) + idx) % 5;
    fill(255, 255, 255, 100);
    ellipse(dx + dw - 8, dy - sh, 1, 1);
  }

  // 文件 / 筆筒（部分桌）
  if (cell.hasFiles) {
    fill("#fff"); rect(dx + 9, dy + 1, 2, 2);
    fill("#d4a44b"); rect(dx + 9, dy + 1, 2, 0.6);
    // 筆筒
    fill("#5a3a1a"); rect(dx + 9, dy - 2, 1.5, 3);
    fill("#1a1a1a"); rect(dx + 9.3, dy - 3, 0.4, 1);  // 筆
    fill("#a83a3a"); rect(dx + 9.8, dy - 3, 0.4, 1);
  }
}

function drawSecurityGuard(x, y, t, alt) {
  // 帽
  fill(alt ? "#0a3a7c" : "#1a4d8c"); rect(x - 2, y - 4, 4, 1);
  fill(alt ? "#0a3a7c" : "#1a4d8c"); ellipse(x, y - 4, 4, 2);
  fill("#ffd700"); rect(x - 1, y - 4, 0.5, 0.5);   // 帽徽
  // 頭
  fill("#f4d6a8"); ellipse(x, y - 2, 3, 3);
  // 制服深藍
  fill(alt ? "#3a5a8a" : "#1a4d8c"); rect(x - 2, y, 4, 4);
  fill("#ffd700"); rect(x - 1, y + 1, 1, 1);  // 徽章
  // 腰帶
  fill("#1a0d08"); rect(x - 2, y + 3, 4, 0.6);
  // 對講機
  fill("#1a1a1a"); rect(x + 2, y + 1, 1, 2);
  // 手電筒 + 黃光（其中一位）
  if (alt) {
    fill("#1a1a1a"); rect(x - 3, y + 1, 1, 2);
    fill("#ffd700"); ellipse(x - 4, y + 2, 2, 2);
    fill(255, 244, 100, 80); ellipse(x - 5, y + 2, 4, 2);
  }
  // 走路動畫
  var step = (t * 4) | 0;
  fill("#1a1a1a");
  rect(x - 1 + (step % 2), y + 4, 1, 2);
  rect(x + (step % 2 ? -1 : 0), y + 4, 1, 2);
}

function drawGarbage(u, x, y, w, h) {
  noStroke();
  fill("#4a4a3a"); rect(x + 3, y + 4, w - 6, h - 8);

  // 90 秒一個清運週期：前 80 秒堆積、最後 10 秒卡車進站清運
  var cycle = (millis() / 90000) % 1;
  var pileLevel = cycle < 0.88 ? (cycle / 0.88) : (1 - (cycle - 0.88) / 0.12);
  pileLevel = constrain(pileLevel, 0, 1);

  // 累積垃圾袋（黑/綠色，數量隨時間增長）
  var maxBags = u.width * 3;
  var bagCount = floor(pileLevel * maxBags);
  for (var i = 0; i < bagCount; i++) {
    var row = floor(i / u.width);
    var col = i % u.width;
    var bx = x + 5 + col * 8 + (row % 2) * 2;
    var by = y + h - 9 - row * 4;
    fill(((i * 7) % 2 === 0) ? "#1f1f24" : "#2a3a24");
    rect(bx, by, 7, 4);
    fill("#4a4a3a"); rect(bx + 1, by, 5, 1);  // 高光
    // 綁口
    fill("#1a1a1a"); rect(bx + 2, by - 1, 3, 1);
  }

  // 大型垃圾桶（角落）
  fill("#3a4a2a"); rect(x + w - 14, y + h - 14, 8, 10);
  fill("#222");    rect(x + w - 14, y + h - 15, 8, 1);
  fill("#1a1a1a"); rect(x + w - 13, y + h - 13, 6, 1);  // 蓋縫

  // 壓縮機（靠右）
  fill("#7a8a3a"); rect(x + w - 24, y + 6, 8, h - 14);
  fill("#222");    rect(x + w - 22, y + 8, 4, 3);       // 螢幕
  // 螢幕亮燈
  fill(((millis()/400)|0)%2===0 ? "#5fff5f" : "#3a8b3a");
  rect(x + w - 21, y + 9, 1, 1);

  // 蒼蠅圍繞（堆積多時）
  if (pileLevel > 0.4) {
    var nFlies = floor(pileLevel * 4);
    var t = millis() / 200;
    for (var i = 0; i < nFlies; i++) {
      var fx = x + 8 + sin(t + i * 1.3) * 6 + i * 6;
      var fy = y + h - 14 + cos(t * 1.5 + i) * 3 - i;
      if (fx > x + w - 16) continue;
      fill("#1a1a1a");
      ellipse(fx, fy, 1.5, 1);
    }
  }

  // 清運卡車（cycle 0.78~0.95 進站、0.95~1.0 載走）
  if (cycle > 0.78 && cycle < 0.99) {
    var tx;
    if (cycle < 0.85) {
      tx = lerp(x + w + 30, x + 4, (cycle - 0.78) / 0.07);     // 從右側滑入
    } else if (cycle < 0.92) {
      tx = x + 4;                                                // 停車裝載
    } else {
      tx = lerp(x + 4, x - 40, (cycle - 0.92) / 0.07);          // 從左側離開
    }
    // 車體
    fill("#6a4030"); rect(tx, y + h - 13, 26, 9);
    fill("#3a2020"); rect(tx, y + h - 13, 26, 1);
    // 駕駛室
    fill("#8a5a40"); rect(tx + 18, y + h - 16, 8, 4);
    fill("#a8d4e0"); rect(tx + 20, y + h - 15, 5, 2);   // 車窗
    // 載貨斗
    fill("#3a2818"); rect(tx + 2, y + h - 13, 14, 6);
    // 輪子
    fill("#222");
    ellipse(tx + 4,  y + h - 3, 3.5, 3.5);
    ellipse(tx + 20, y + h - 3, 3.5, 3.5);
    fill("#888");
    ellipse(tx + 4,  y + h - 3, 1.5, 1.5);
    ellipse(tx + 20, y + h - 3, 1.5, 1.5);
    // 車頭燈
    fill("#fff4a0"); ellipse(tx + 26, y + h - 11, 2, 2);
    // 警示燈（閃爍）
    fill(((millis()/300)|0)%2===0 ? "#ff6b00" : "#5a2a00");
    rect(tx + 18, y + h - 17, 2, 1);
  }
}

function drawParking(u, x, y, w, h) {
  noStroke();
  // 地坪
  fill("#2c2c30"); rect(x + 3, y + 4, w - 6, h - 8);
  // 黃色斜紋警示帶（地面邊緣，靜態）
  for (var i = 0; i < u.width * 4; i++) {
    var sx = x + 4 + i * 6;
    if (sx > x + w - 8) break;
    fill((i % 2 === 0) ? "#c8a82a" : "#222");
    rect(sx, y + h - 6, 5, 2);
  }
  // 停車格線（每半格一條）
  stroke("#888"); strokeWeight(1);
  for (var i = 0; i <= u.width * 2; i++) {
    var lx = x + i * (CELL_W / 2);
    line(lx, y + 12, lx, y + h - 8);
  }
  // 後牆白漆
  stroke("#cfd8e0"); strokeWeight(1);
  line(x + 3, y + 11, x + w - 3, y + 11);
  noStroke();

  // 車位
  if (!u.slots) return;
  var slotW = (CELL_W / 2) - 2;
  var slotH = 7;
  for (var s = 0; s < u.slots.length; s++) {
    var slot = u.slots[s];
    if (slot.state === "empty") continue;
    var slotX = x + s * (CELL_W / 2) + 1;
    var slotY = y + h - slotH - 8;

    var carX, opacity = 255;
    if (slot.state === "entering") {
      var startX = slot.fromLeft ? x - 20 : x + w + 5;
      carX = lerp(startX, slotX, slot.animT);
      opacity = 200;
    } else if (slot.state === "leaving") {
      var endX = slot.fromLeft ? x - 20 : x + w + 5;
      carX = lerp(slotX, endX, slot.animT);
      opacity = 200;
    } else {
      carX = slotX;
    }

    // 車體
    var c = color(slot.color);
    c.setAlpha(opacity);
    fill(c);
    rect(carX, slotY, slotW, slotH);
    // 車頂高光
    fill(255, 255, 255, opacity * 0.3);
    rect(carX + 1, slotY, slotW - 2, 1);
    // 車窗
    fill(40, 50, 60, opacity);
    rect(carX + 1, slotY + 1, slotW - 2, 2);
    // 輪子
    fill(20, 20, 20, opacity);
    rect(carX,            slotY + slotH - 2, 2, 2);
    rect(carX + slotW - 2, slotY + slotH - 2, 2, 2);
    // 移動中：紅色尾燈閃 / 車燈
    if (slot.state === "entering" || slot.state === "leaving") {
      var movingRight = (slot.fromLeft && slot.state === "entering") ||
                        (!slot.fromLeft && slot.state === "leaving");
      if (movingRight) {
        fill(255, 255, 200, opacity); rect(carX + slotW - 1, slotY + 2, 1, 1);  // 前燈
        fill(255, 60, 40, opacity);   rect(carX,             slotY + 2, 1, 1);  // 後燈
      } else {
        fill(255, 255, 200, opacity); rect(carX, slotY + 2, 1, 1);
        fill(255, 60, 40, opacity);   rect(carX + slotW - 1, slotY + 2, 1, 1);
      }
    }
  }

  // 入口箭頭（左下角，提示車流方向）
  fill("#ffd700");
  triangle(x + 4, y + h - 4, x + 8, y + h - 4, x + 6, y + h - 7);

  // 佔有率指示燈（角落）
  var parked = 0;
  for (var s = 0; s < u.slots.length; s++)
    if (u.slots[s].state === "parked" || u.slots[s].state === "entering") parked++;
  var ratio = parked / u.slots.length;
  fill(ratio > 0.85 ? "#ff3333" : ratio > 0.5 ? "#ffaa00" : "#34c759");
  ellipse(x + w - 6, y + 7, 3, 3);
  fill(255, 255, 255, 180);
  textAlign(LEFT, TOP); textSize(6);
  text(parked + "/" + u.slots.length, x + 4, y + 5);
}

function drawMech(u, x, y, w, h) {
  noStroke();
  // 機房地板 / 牆面
  fill("#1c1c20"); rect(x + 3, y + 4, w - 6, h - 8);
  // 鋼板地紋
  fill("#0f0f12");
  for (var i = 0; i < u.width * 2; i++) {
    var lx = x + 4 + i * 13;
    if (lx > x + w - 4) break;
    rect(lx, y + h - 4, 12, 1);
  }
  // 地面警示斜紋
  for (var i = 0; i < u.width * 2; i++) {
    var sx = x + 4 + i * 7;
    if (sx > x + w - 5) break;
    fill((i % 2 === 0) ? "#c8a82a" : "#1c1c20");
    rect(sx, y + h - 6, 6, 2);
  }

  var layout = u.layout || { cells: [] };
  for (var i = 0; i < u.width; i++) {
    var cell = layout.cells[i] || { type: "pipes", ledSeed: i, pipeCol: "#5fa2d8" };
    var cx = x + i * CELL_W;
    if      (cell.type === "server")  drawMechServerRack(cx, y, h, cell.ledSeed);
    else if (cell.type === "ac")      drawMechAC(cx, y, h, cell.ledSeed);
    else if (cell.type === "pipes")   drawMechPipes(cx, y, h, i, cell.pipeCol);
    else if (cell.type === "control") drawMechControl(cx, y, h, cell.ledSeed);
    else if (cell.type === "boiler")  drawMechBoiler(cx, y, h);
  }

  // 維修員巡邏：多人
  var t = millis() / 1000;
  var wx1 = x + 5 + ((sin(t * 0.3) + 1) / 2) * (w - 14);
  drawMechWorker(wx1, y + h - 8, t);
  if (u.width >= 4) {
    var wx2 = x + 5 + ((sin(t * 0.22 + PI) + 1) / 2) * (w - 14);
    drawMechWorker(wx2, y + h - 8, t + 1, true);
  }
  if (u.width >= 8) {
    var wx3 = x + 5 + ((cos(t * 0.25) + 1) / 2) * (w - 14);
    drawMechWorker(wx3, y + h - 8, t + 2.7, false);
  }
  if (u.width >= 14) {
    var wx4 = x + 5 + ((cos(t * 0.18 + PI / 2) + 1) / 2) * (w - 14);
    drawMechWorker(wx4, y + h - 8, t + 4.5, true);
  }
}

function drawMechServerRack(cx, y, h, seed) {
  // 機櫃外殼
  fill("#0d0d0e"); rect(cx + 3, y + 5, CELL_W - 6, h - 12);
  fill("#1a1a1a"); rect(cx + 4, y + 6, CELL_W - 8, h - 14);
  // 1U 機架單元（橫條 + LED）
  var rowCount = floor((h - 16) / 2);
  for (var r = 0; r < rowCount; r++) {
    var ry = y + 7 + r * 2;
    fill("#2a2a2a"); rect(cx + 5, ry, CELL_W - 10, 1.5);
    // 雙色 LED
    var t = (millis() / 250 + seed + r) | 0;
    fill((t % 5) !== 0 ? "#3aff5a" : "#1a4d1a");
    rect(cx + 6, ry + 0.5, 1, 1);
    fill((t % 7) !== 0 ? "#5fa2d8" : "#1a2a4a");
    rect(cx + 8, ry + 0.5, 1, 1);
    // 散熱孔
    fill("#0a0a0a"); rect(cx + CELL_W - 9, ry, 3, 1.5);
  }
  // 機架門框
  stroke("#3a3a3a"); strokeWeight(1);
  noFill();
  rect(cx + 3, y + 5, CELL_W - 6, h - 12);
  noStroke();
  // 把手
  fill("#6a6a6a"); rect(cx + CELL_W - 6, y + 11, 1, 4);
}

function drawMechAC(cx, y, h, seed) {
  // 冷氣主機（上半）
  fill("#3a3a40"); rect(cx + 3, y + 5, CELL_W - 6, 10);
  fill("#2a2a30"); rect(cx + 3, y + 5, CELL_W - 6, 2);
  // 通風百葉
  for (var i = 0; i < 5; i++) {
    fill("#0a0a0e");
    rect(cx + 5, y + 8 + i * 1.4, CELL_W - 10, 0.8);
  }
  // 狀態 LED
  fill("#3aff5a"); ellipse(cx + CELL_W - 7, y + 7, 1.5, 1.5);
  // 品牌條
  fill("#888"); rect(cx + 5, y + 13, CELL_W - 10, 1);

  // 冷氣支架
  fill("#5a5a5a");
  rect(cx + 5, y + 15, 1, h - 22);
  rect(cx + CELL_W - 6, y + 15, 1, h - 22);

  // 氣流動畫（往下）
  var t = (millis() / 60) % 14;
  fill(180, 220, 240, 100); ellipse(cx + CELL_W / 2 - 3, y + 16 + t, 4, 2);
  fill(180, 220, 240, 100); ellipse(cx + CELL_W / 2 + 3, y + 16 + t, 4, 2);
  fill(180, 220, 240, 60);  ellipse(cx + CELL_W / 2,     y + 18 + (t + 5) % 14, 3, 2);
  // 冷氣機底部排水盤
  fill("#3a3a3a"); rect(cx + 4, y + h - 10, CELL_W - 8, 1);
}

function drawMechPipes(cx, y, h, idx, baseCol) {
  // 多色管線 + 流動標記
  var cols = [baseCol, "#d8a042", "#888"];
  for (var p = 0; p < 3; p++) {
    var px = cx + 4 + p * 5;
    if (px > cx + CELL_W - 4) break;
    fill(cols[p]); rect(px, y + 5, 2.5, h - 12);
    // 接頭法蘭
    fill("#444"); rect(px - 1, y + 10, 4.5, 1.5);
    fill("#444"); rect(px - 1, y + h - 14, 4.5, 1.5);
    // 閥門
    fill("#aaa"); ellipse(px + 1.2, y + h - 11, 3, 2);
    fill("#666"); rect(px + 0.6, y + h - 12, 1.5, 2);
    // 流動指示（圓點下沉動畫）
    var flow = ((millis() / 200 + p * 2 + idx) | 0) % 5;
    fill(cols[p]);
    ellipse(px + 1.2, y + 7 + flow * 3, 1.5, 1.5);
  }
  // 牆面標籤
  fill("#222"); rect(cx + 4, y + 5, 14, 3);
  fill("#ffd700"); textAlign(LEFT, TOP); textSize(4);
  text("H₂O", cx + 5, y + 5);
}

function drawMechControl(cx, y, h, seed) {
  // 控制台外殼
  fill("#1a1a22"); rect(cx + 3, y + 5, CELL_W - 6, h - 11);
  fill("#2a2a32"); rect(cx + 3, y + 5, CELL_W - 6, 2);
  // 主螢幕
  fill("#0a1a2a"); rect(cx + 4, y + 7, CELL_W - 8, 7);
  // 螢幕內容（綠色數字 + 藍色波形）
  var t = (millis() / 200) | 0;
  fill("#3aff5a"); textSize(4); textAlign(LEFT, TOP);
  text("CPU " + (50 + (t * 3 + seed) % 50) + "%", cx + 5, y + 8);
  text("MEM " + (40 + (t * 5 + seed) % 50) + "%", cx + 5, y + 11);
  // 波形線
  stroke("#5fa2d8"); strokeWeight(1);
  for (var k = 0; k < 6; k++) {
    var sx1 = cx + 4 + k * 2;
    var sx2 = sx1 + 2;
    var hh1 = sin((t + k + seed) * 0.7) * 1;
    var hh2 = sin((t + k + seed + 1) * 0.7) * 1;
    line(sx1, y + 13 + hh1, sx2, y + 13 + hh2);
  }
  noStroke();
  // 按鈕陣列
  for (var row = 0; row < 3; row++) {
    for (var col = 0; col < 5; col++) {
      var bx = cx + 4 + col * 3;
      var by = y + 16 + row * 3;
      if (bx > cx + CELL_W - 5) break;
      var on = ((row * 5 + col + (t / 8) + seed) | 0) % 4 === 0;
      fill(on ? "#ff6b6b" : "#3a1a1a");
      rect(bx, by, 2, 2);
    }
  }
  // 急停大按鈕
  fill("#1a0a0a"); ellipse(cx + CELL_W - 7, y + h - 11, 6, 6);
  fill("#c93232"); ellipse(cx + CELL_W - 7, y + h - 11, 5, 5);
  fill("#ff6b6b"); ellipse(cx + CELL_W - 7, y + h - 12, 2.5, 2.5);
}

function drawMechBoiler(cx, y, h) {
  // 鍋爐圓筒
  fill("#5a4a3a"); rect(cx + 4, y + 8, CELL_W - 8, h - 16);
  // 圓頂蓋
  fill("#5a4a3a"); ellipse(cx + CELL_W / 2, y + 8, CELL_W - 8, 4);
  fill("#3a2a1a"); ellipse(cx + CELL_W / 2, y + 8, CELL_W - 12, 3);
  // 鉚釘
  for (var k = 0; k < 4; k++) {
    fill("#888"); ellipse(cx + 6 + k * 4, y + 11, 1, 1);
  }
  // 警示燈閃爍
  var on = ((millis() / 500) | 0) % 2 === 0;
  fill(on ? "#ffd700" : "#5a4500");
  ellipse(cx + 7, y + 14, 2, 2);
  // 壓力錶
  var gx = cx + CELL_W - 8, gy = y + 15;
  fill("#cfd8e0"); ellipse(gx, gy, 5, 5);
  fill("#fff");    ellipse(gx, gy, 4, 4);
  stroke("#222"); strokeWeight(1);
  var angle = sin(millis() / 1200) * 1.2 + 0.2;
  line(gx, gy, gx + cos(angle - HALF_PI) * 1.8, gy + sin(angle - HALF_PI) * 1.8);
  noStroke();
  // 排氣管
  fill("#666"); rect(cx + CELL_W / 2 - 1, y + 4, 2, 4);
  // 蒸氣
  for (var k = 0; k < 2; k++) {
    var sh = ((millis() / 70) + k * 4) % 10;
    fill(255, 255, 255, 130 - sh * 10);
    ellipse(cx + CELL_W / 2 + k - 1, y + 4 - sh, 2 + sh * 0.2, 2 + sh * 0.2);
  }
  // 火焰指示（底部）
  fill(((millis()/200)|0)%2===0 ? "#ff6b00" : "#ff9500");
  rect(cx + CELL_W / 2 - 2, y + h - 10, 4, 1);
}

function drawMechWorker(x, y, t, alt) {
  // 安全帽
  fill(alt ? "#5fa2d8" : "#ffd700");
  ellipse(x, y - 3, 4, 3);
  fill("#222"); rect(x - 2, y - 2, 4, 1);   // 帽簷
  // 臉
  fill("#f4d6a8"); ellipse(x, y - 1, 3, 3);
  // 橘色 / 藍色工作服
  fill(alt ? "#3a5a8a" : "#ff8a3a");
  rect(x - 2, y, 4, 4);
  // 反光條（亮黃）
  fill("#fff4a0"); rect(x - 2, y + 2, 4, 0.6);
  // 工具帶
  fill("#3a2418"); rect(x - 2, y + 3, 4, 1);
  // 走路動畫
  var step = (t * 4) | 0;
  fill("#1a1a1a");
  rect(x - 2 + (step % 2), y + 4, 1, 2);
  rect(x + 1 - (step % 2), y + 4, 1, 2);
  // 工具（扳手 / 板手）
  fill("#888"); rect(x + 2, y + 1, 2, 1);
  fill("#5a5a5a"); rect(x + 3, y + 1, 1, 2);
}

function drawHotel(u, x, y, w, h) {
  noStroke();
  fill("#5e4565"); rect(x + 3, y + 4, w - 6, h - 8);
  var hour = simTime / 3600;
  var lampOn = (hour < 7 || hour >= 18);
  var layout = u.layout || { cells: [] };

  // 比例化定位（cell 高度小時也不會跑出格子）
  var winTop   = y + h * 0.15;
  var winH     = max(3, h * 0.30);              // 窗戶高度
  var decorTop = y + h * 0.35;
  var decorH   = max(3, h * 0.25);              // 裝飾高度
  var headY    = y + h * 0.55;                  // 床頭板上緣
  var bedTop   = y + h * 0.66;                  // 床面 (枕頭上方)
  var pillowH  = max(1, h * 0.06);
  var mattH    = max(2, h * 0.12);              // 床墊高
  var nightY   = y + h * 0.66;                  // 床頭櫃上緣
  var nightH   = max(3, h * 0.20);
  var lampCy   = y + h * 0.50;                  // 燈泡中心
  var lampSize = max(2, h * 0.08);

  // 床 / 床頭櫃寬度也依 CELL_W 自適應
  var innerW = CELL_W - 2;
  var bedW   = max(6, min(10, innerW * 0.55));
  var nightW = max(3, min(5, innerW * 0.20));

  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + 4;
    var cell = layout.cells[i] || { bedSide: "left", hasNightstand: true, decor: "picture", curtainOpen: true, bedColor: "#d4a4d8" };

    // 窗戶
    var winW = max(4, CELL_W * 0.30);
    if (cell.curtainOpen) {
      fill(lampOn ? "#1a1428" : "#a8c4d8");
      rect(cx + 2, winTop, winW, winH);
    } else {
      fill(lampOn ? "#8a6a4a" : "#c4a8a8");
      rect(cx + 2, winTop, winW, winH);
      stroke(lampOn ? "#5a4a3a" : "#9a7878"); strokeWeight(1);
      line(cx + 2 + winW / 2, winTop, cx + 2 + winW / 2, winTop + winH);
      noStroke();
    }

    // 床位置：left / right
    var bedX, nightX;
    if (cell.bedSide === "left") {
      bedX = cx + 1;
      nightX = cx + CELL_W - nightW - 3;
    } else {
      bedX = cx + CELL_W - bedW - 3;
      nightX = cx + 1;
    }

    // 床（床墊 + 枕頭）
    fill(cell.bedColor || "#d4a4d8");
    rect(bedX, bedTop, bedW, mattH);
    fill("#fff8dc");
    rect(bedX, bedTop - pillowH, bedW, pillowH);
    // 床頭板
    fill("#6b4d3a");
    rect(bedX + (cell.bedSide === "left" ? 0 : bedW - 2), headY, 2, max(3, h * 0.13));

    // 床頭櫃 + 燈
    if (cell.hasNightstand) {
      fill("#6a4d3a"); rect(nightX, nightY, nightW, nightH);
      fill(lampOn ? "#fff4a0" : "#403040");
      ellipse(nightX + nightW / 2, lampCy, lampSize, lampSize);
      // 燈罩
      fill("#8a6a4a");
      rect(nightX + nightW * 0.2, lampCy + lampSize / 2, nightW * 0.6, max(1, h * 0.03));
    }

    // 牆面裝飾（圖畫 / 鏡子 / 電視），都靠近房間中段
    var decorX = cx + CELL_W * 0.45;
    var decorW = max(4, CELL_W * 0.35);
    if (cell.decor === "picture") {
      fill("#5a3a3a"); rect(decorX, decorTop, decorW, decorH);
      fill("#d4a44b"); rect(decorX + 1, decorTop + 1, decorW - 2, decorH - 2);
    } else if (cell.decor === "mirror") {
      fill("#cfd8e0"); rect(decorX, decorTop, decorW * 0.7, decorH + 2);
      fill("#a8c4d8"); rect(decorX + 1, decorTop + 1, decorW * 0.7 - 2, decorH);
    } else if (cell.decor === "tv") {
      fill("#1a1a1a"); rect(decorX, decorTop, decorW, decorH);
      var screenCol = lampOn ? "#5fa2d8" : "#2a2a2a";
      fill(screenCol);
      rect(decorX + 1, decorTop + 1, decorW - 2, decorH - 2);
    }
  }
}

function drawReception(u, x, y, w, h) {
  // 飯店接待：木製櫃台 + 燈 + 鈴鐺
  noStroke();
  fill("#3a4a6a"); rect(x + 3, y + 4, w - 6, h - 8);
  // 招牌色條
  fill("#f0d090"); rect(x + 3, y + 4, w - 6, 3);
  // 櫃台
  fill("#8b6b3a"); rect(x + 6, y + h - 12, w - 12, 6);
  fill("#5a3e2a"); rect(x + 6, y + h - 7, w - 12, 1);
  // 吊燈
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + CELL_W / 2;
    stroke("#ffd07a"); strokeWeight(1);
    line(cx, y + 8, cx, y + 14);
    noStroke();
    fill("#fff4a0"); ellipse(cx, y + 15, 4, 4);
  }
  // 鈴鐺（中央）
  fill("#ffd700");
  ellipse(x + w / 2, y + h - 14, 4, 3);
}

function drawLaundry(u, x, y, w, h) {
  // 洗衣店：洗衣機 + 旋轉中
  noStroke();
  fill("#3a5d6a"); rect(x + 3, y + 4, w - 6, h - 8);
  var spin = (millis() / 60) | 0;
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + CELL_W / 2;
    // 機身
    fill("#cfd8e0"); rect(cx - 8, y + h - 18, 16, 14);
    // 圓窗
    fill("#1a2a3a"); ellipse(cx, y + h - 12, 9, 9);
    // 旋轉條紋
    stroke("#5fa2d8"); strokeWeight(1);
    var ang = spin * 0.5 + i;
    line(cx + cos(ang) * 3, y + h - 12 + sin(ang) * 3,
         cx - cos(ang) * 3, y + h - 12 - sin(ang) * 3);
    noStroke();
    // 按鈕
    fill("#5fa2d8"); ellipse(cx - 5, y + h - 18, 2, 2);
    fill("#ff6b6b"); ellipse(cx + 5, y + h - 18, 2, 2);
  }
}

function drawPool(u, x, y, w, h) {
  noStroke();
  // 池邊磁磚
  fill("#cfd8e0"); rect(x + 3, y + 4, w - 6, h - 8);
  // 水池
  fill("#1f5a78"); rect(x + 6, y + 10, w - 12, h - 18);
  fill("#3a8ab0"); rect(x + 6, y + 10, w - 12, 3);
  // 池底磁磚紋
  stroke("#1a4868"); strokeWeight(1);
  for (var k = 0; k < 3; k++) {
    var ly = y + 14 + k * 5;
    if (ly > y + h - 10) break;
    line(x + 6, ly, x + w - 6, ly);
  }
  noStroke();
  // 水道分隔線
  fill("#fff");
  for (var i = 0; i < u.width * 2; i++) {
    var dx = x + 8 + i * 11;
    if (dx > x + w - 8) break;
    rect(dx, y + 12, 4, 1);
    rect(dx, y + 18, 4, 1);
  }

  // 泳客：每位來回游，依占用人數
  var nSwim = min(u.occupants.length || 0, 6);
  // 沒占用時也來幾個讓畫面不空（demo）
  if (nSwim < 2) nSwim = 2;
  for (var i = 0; i < nSwim; i++) {
    var period = 2400 + i * 350;
    var phase = ((millis() + i * 700) % period) / period;        // 0..1
    var goingRight = phase < 0.5;
    var prog = goingRight ? phase * 2 : (1 - phase) * 2;          // 0..1 沿水道
    var sx = lerp(x + 9, x + w - 11, prog);
    var lane = i % 3;
    var sy = y + 14 + lane * 5;
    if (sy > y + h - 9) continue;
    // 頭
    fill("#f4d6a8"); ellipse(sx, sy, 3, 3);
    // 蛙鏡
    fill("#222"); rect(sx - 1, sy - 1, 2, 1);
    // 划水水花（交替顯示）
    if (((millis()/180 + i)|0) % 2 === 0) {
      var dx = goingRight ? -3 : 3;
      fill(255, 255, 255, 220); ellipse(sx + dx, sy + 1, 3, 1.5);
      fill(255, 255, 255, 150); ellipse(sx + dx * 1.6, sy + 1, 2, 1);
    }
    // 身體尾跡（淡白）
    fill(255, 255, 255, 60);
    var trailDx = goingRight ? -5 : 5;
    ellipse(sx + trailDx, sy + 1, 7, 2);
  }

  // 漣漪（隨機點點）
  stroke("#a8e0f0"); strokeWeight(1);
  var t = millis() / 500;
  for (var i = 0; i < u.width * 2; i++) {
    var wx1 = x + 8 + ((i * 12 + t * 8) % (w - 16));
    var wy = y + 14 + (i % 3) * 4;
    line(wx1, wy, wx1 + 6, wy);
  }
  strokeWeight(1); noStroke();

  // 救生員高腳座椅（右側）
  var lx = x + w - 14;
  var lty = y + 6;
  // 座椅支柱
  fill("#c8a82a"); rect(lx + 2, lty + 3, 1, h - 14);
  fill("#c8a82a"); rect(lx + 7, lty + 3, 1, h - 14);
  // 椅面
  fill("#a8842a"); rect(lx, lty + 2, 10, 2);
  // 椅背
  fill("#a8842a"); rect(lx, lty - 5, 1, 8);
  // 救生員
  fill("#fff8e0"); ellipse(lx + 5, lty - 4, 4, 4);              // 頭 + 帽
  fill("#ff3b30"); rect(lx + 3, lty - 6, 4, 1.5);                // 紅帽
  fill("#f4d6a8"); ellipse(lx + 5, lty - 3, 3, 3);              // 臉
  fill("#ff3b30"); rect(lx + 3, lty - 1, 4, 4);                  // 紅泳衣
  fill("#fff");    rect(lx + 4, lty,     2, 1);                  // 白十字
  fill("#fff");    rect(lx + 5, lty - 0.5, 0.5, 2);
  // 哨子（脖子上）
  fill("#ffd700"); ellipse(lx + 6, lty - 1, 1.5, 1);
  stroke("#fff"); strokeWeight(0.5);
  line(lx + 5, lty - 1.5, lx + 6, lty - 1);
  noStroke();
  // 手中救生圈
  fill("#c9362a"); ellipse(lx + 9, lty + 1, 4, 4);
  fill("#1a1a1a"); ellipse(lx + 9, lty + 1, 2, 2);

  // 泳池燈
  fill("#ffd700");
  for (var i = 0; i < u.width; i++) {
    ellipse(x + i * CELL_W + CELL_W / 2, y + 6, 2, 2);
  }
}

function drawSpa(u, x, y, w, h) {
  // SPA：浴缸 + 蒸氣 + 蠟燭
  noStroke();
  fill("#6a3a4a"); rect(x + 3, y + 4, w - 6, h - 8);
  // 浴缸
  for (var i = 0; i < u.width; i++) {
    var cx = x + i * CELL_W + 4;
    fill("#f0c4d4"); rect(cx, y + h - 14, CELL_W - 10, 10);
    fill("#a8d4e0"); rect(cx + 1, y + h - 13, CELL_W - 12, 6); // 水
    // 蠟燭
    stroke("#ffd07a"); strokeWeight(1);
    line(cx + CELL_W - 12, y + 8, cx + CELL_W - 12, y + 12);
    noStroke();
    fill("#fff4a0"); ellipse(cx + CELL_W - 12, y + 7, 2, 3);
  }

  // 休息中的客人（躺椅 + 浴巾 + 黃瓜眼罩 + Z 字）
  var nResting = max(2, min(u.occupants.length || 0, u.width));
  for (var i = 0; i < nResting; i++) {
    var rx = x + 4 + i * 18;
    if (rx + 14 > x + w - 4) break;
    var ry = y + h - 18;
    // 躺椅本體
    fill("#6a4a3a"); rect(rx, ry + 6, 14, 2);
    fill("#3a2818"); rect(rx, ry + 8, 1, 3);
    fill("#3a2818"); rect(rx + 13, ry + 8, 1, 3);
    // 浴巾蓋住身體
    fill("#fff8e0"); rect(rx + 1, ry + 3, 12, 4);
    fill("#f4e0c0"); rect(rx + 1, ry + 3, 12, 1);
    // 頭
    fill("#f4d6a8"); ellipse(rx + 2, ry + 4, 4, 4);
    // 黃瓜眼罩
    fill("#3a8b4a"); ellipse(rx + 1.5, ry + 3.5, 1.5, 1);
    fill("#3a8b4a"); ellipse(rx + 3,   ry + 3.5, 1.5, 1);
    // 飄浮的 z
    var zPh = (millis()/700 + i) % 1;
    fill(255, 255, 255, (1 - zPh) * 220);
    textAlign(LEFT, TOP); textSize(7);
    text("z", rx + 6, ry - 4 - zPh * 6);
  }

  // 蒸氣（往上飄）
  for (var i = 0; i < u.width * 2; i++) {
    var sx = x + 6 + i * 6;
    if (sx > x + w - 4) break;
    var ph = ((millis() / 60) + i * 17) % 18;
    fill(255, 255, 255, 120 - ph * 6);
    ellipse(sx, y + 12 - ph, 3 + ph * 0.1, 3 + ph * 0.1);
  }

  // 香氛精油瓶（角落）
  fill("#7a3a4a"); rect(x + w - 8, y + h - 10, 3, 4);
  fill("#c47084"); rect(x + w - 8, y + h - 11, 3, 1);
  fill("#fff"); rect(x + w - 7, y + h - 9, 1, 1);
}

// 電梯井（背景）
function drawShafts() {
  var drawn = {};
  for (var i = 0; i < elevators.length; i++) {
    var el = elevators[i];
    if (drawn[el.shaft]) continue;     // 同井只畫一次
    drawn[el.shaft] = true;
    var sx = colX(el.col);
    // 同井內取所有車的最大範圍
    var minF = el.minFloor, maxF = el.maxFloor;
    var carCount = 1;
    for (var j = 0; j < elevators.length; j++) {
      if (j === i) continue;
      var o = elevators[j];
      if (o.shaft !== el.shaft) continue;
      if (o.minFloor < minF) minF = o.minFloor;
      if (o.maxFloor > maxF) maxF = o.maxFloor;
      carCount++;
    }
    var topY = floorY(maxF);
    var botY = floorY(minF) + CELL_H;
    noStroke();
    fill(PALETTE.shaft);
    rect(sx + 2, topY, CELL_W - 4, botY - topY);
    // 井壁
    stroke(PALETTE.shaftEdge); strokeWeight(1);
    line(sx + 2,           topY, sx + 2,           botY);
    line(sx + CELL_W - 2,  topY, sx + CELL_W - 2,  botY);
    // 樓層線
    for (var f = minF; f <= maxF; f++) {
      var fy = floorY(f) + CELL_H;
      stroke("#2a2a30");
      line(sx + 2, fy, sx + CELL_W - 2, fy);
    }
    // 頂端標示色條（多車井用亮色）
    noStroke();
    fill(el.type === "express" ? "#e74c3c" : "#4a90e2");
    rect(sx + 4, topY - 4, CELL_W - 8, 3);
    // 多車井標記：頂端「×N」表示車數
    if (carCount > 1) {
      fill("#ffd700");
      textSize(7); textAlign(CENTER, BOTTOM);
      text("×" + carCount, sx + CELL_W / 2, topY - 4);
    }
  }
}

function drawElevatorCars() {
  for (var i = 0; i < elevators.length; i++) {
    var el = elevators[i];
    // 同井多車：依車號做 x 微錯位 & 縮窄，重疊時仍可辨識
    // 現在每井 4 車：carW 14、step 3 →  span 2..25（在 CELL_W=26 內）
    var multiCar = el.carNum > 0;
    var carW = max(6, multiCar ? CELL_W - 12 : CELL_W - 4);   // 防止小 cell 下變負數
    var sx   = colX(el.col) + 2 + (multiCar ? (el.carNum - 1) * 3 : 0);
    var fy = floorY(el.yPos);
    var carH = CELL_H - 4;
    noStroke();
    // 車廂
    fill(el.carColor);
    rect(sx, fy + 2, carW, carH);
    // 門
    if (el.state === "loading") {
      var t = constrain(1 - el.doorTimer / 30, 0, 1);
      fill("#222");
      rect(sx + 1, fy + 4, carW * 0.5 * (1 - t), carH - 4);
      rect(sx + carW - carW * 0.5 * (1 - t) - 1, fy + 4, carW * 0.5 * (1 - t), carH - 4);
      // 內部光
      fill("#fff4a0");
      rect(sx + carW * 0.5 * (1 - t) + 1, fy + 4, carW * (1 - (1 - t)), carH - 4);
    } else {
      fill("#1a1a1a");
      rect(sx + 1, fy + 4, carW - 2, carH - 4);
    }
    // 車內乘客（簡化：點點）
    for (var p = 0; p < el.passengers.length; p++) {
      var px = sx + 3 + (p % 4) * 3;
      var py = fy + carH - 5 - floor(p / 4) * 4;
      fill(el.passengers[p].person.color);
      rect(px, py, 2, 3);
    }
    // 標示樓層數字（小）
    fill("#fff");
    textSize(6); textAlign(CENTER, TOP);
    var lbl = (el.currentFloor === 0) ? "GF" :
              (el.currentFloor > 0 ? el.currentFloor + "F" : "B" + (-el.currentFloor));
    text(lbl, sx + carW/2, fy + 2);
    // 方向
    if (el.direction !== 0) {
      fill(el.direction > 0 ? "#34C759" : "#FF3B30");
      triangle(sx + carW - 6, fy + 10, sx + carW - 2, fy + 10,
               sx + carW - 4, fy + 10 + (el.direction > 0 ? -4 : 4));
    }
    // 多車井：左下角顯示車號 1/2/3
    if (el.carNum > 0) {
      fill("#000"); rect(sx + 1, fy + carH - 8, 8, 7);
      fill("#ffd700"); textSize(6); textAlign(CENTER, TOP);
      text(el.carNum, sx + 5, fy + carH - 8);
    }
  }
}

function drawEscalator() {
  if (!escalator) return;
  var topY = floorY(escalator.maxFloor);
  var botY = floorY(escalator.minFloor) + CELL_H;
  var ux1 = colX(escalator.colUp), ux2 = ux1 + CELL_W;
  var dx1 = colX(escalator.colDown), dx2 = dx1 + CELL_W;

  noStroke();
  // 機械結構背景（兩格合併視覺感）
  fill("#1a2030"); rect(ux1, topY, CELL_W * 2, botY - topY);
  // 隔板（區隔上下行）
  fill("#2a3144"); rect(ux2 - 1, topY, 2, botY - topY);

  // 每一層樓的斜向階梯帶
  var t = (millis() / 1000) % 1;
  for (var f = escalator.minFloor; f < escalator.maxFloor; f++) {
    var y1 = floorY(f) + CELL_H;        // 下層樓地板
    var y2 = floorY(f + 1) + CELL_H;    // 上層樓地板（screen y 較小）

    // 上行帶（綠色斜帶，左下→右上）
    drawEscalatorBelt(ux1, ux2, y1, y2, "#3aa66a", "#2a8a5a", true, t);
    // 下行帶（橘紅色斜帶，右上→左下）
    drawEscalatorBelt(dx1, dx2, y1, y2, "#d96b3a", "#b8552a", false, t);
  }

  // 上下緣的方向指示燈板
  drawDirectionPanel(ux1, ux2, topY,        "▲", "#3aa66a"); // 頂端上行
  drawDirectionPanel(ux1, ux2, botY - 10,   "▲", "#3aa66a"); // 底端上行入口
  drawDirectionPanel(dx1, dx2, topY,        "▼", "#d96b3a");
  drawDirectionPanel(dx1, dx2, botY - 10,   "▼", "#d96b3a");

  // 扶手（兩條垂直線，覆蓋整段）
  stroke("#888"); strokeWeight(2);
  line(ux1 + 2,           topY + 4, ux1 + 2,           botY - 4);
  line(ux2 - 2,           topY + 4, ux2 - 2,           botY - 4);
  line(dx1 + 2,           topY + 4, dx1 + 2,           botY - 4);
  line(dx2 - 2,           topY + 4, dx2 - 2,           botY - 4);
  strokeWeight(1);
  noStroke();
}

function drawEscalatorBelt(x1, x2, y1, y2, colMain, colShade, goingUp, t) {
  // 階梯傾斜帶：每段樓間畫一條從一角到對角的「階梯條」
  // 上行: 從 (x1, y1) -> (x2, y2)  （左下到右上，y2 < y1 因為樓層越高 y 越小）
  // 下行: 從 (x2, y1) -> (x1, y2)
  var ax, ay, bx, by;
  if (goingUp) {
    ax = x1; ay = y1; bx = x2; by = y2;
  } else {
    ax = x2; ay = y1; bx = x1; by = y2;
  }
  // 帶狀本體（粗線）
  stroke(colShade); strokeWeight(8);
  line(ax, ay, bx, by);
  stroke(colMain); strokeWeight(4);
  line(ax, ay, bx, by);
  strokeWeight(1);
  noStroke();

  // 階梯小段動畫
  var n = 6;
  for (var i = 0; i < n; i++) {
    var pp = ((i / n) + t) % 1;
    var px = lerp(ax, bx, pp);
    var py = lerp(ay, by, pp);
    fill("#fff8dc"); rect(px - 2, py - 1, 4, 2);
  }
}

function drawDirectionPanel(x1, x2, y, glyph, col) {
  noStroke();
  fill(col);
  rect(x1 + 2, y + 1, (x2 - x1) - 4, 8);
  fill("#fff");
  textAlign(CENTER, CENTER); textSize(7);
  text(glyph, (x1 + x2) / 2, y + 5);
}

function drawPeople() {
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    var x = p.x;
    var y;
    if (p.state === "in_elevator") {
      continue;          // 電梯內由 drawElevatorCars 一併畫
    } else if (p.state === "on_escalator") {
      // 用浮點 escY 平滑插值
      y = floorY(p.escY) + CELL_H - p.height - 2;
    } else {
      y = floorY(p.floor) + CELL_H - p.height - 2;
    }
    // 影子
    noStroke();
    fill(0, 0, 0, 60);
    ellipse(x, y + p.height + 1, p.height * 0.8, 2);
    // 身體
    fill(p.color);
    rect(x - 2, y + 3, 4, p.height - 3);
    // 頭
    fill(blendColors(p.color, "#f4d6a8", 0.7));
    ellipse(x, y + 2, 3, 3);
    // 腳（動畫）
    var leg = (((millis()/100) + i) | 0) % 2;
    fill("#222");
    rect(x - 2, y + p.height - 1, 1, 2);
    rect(x + 1, y + p.height - 1, 1, 2);

    // 等電梯太久 → 抱怨泡泡（紅）
    if (p.state === "waiting_elev" && p.waitedTicks > 120) {
      drawWaitComplaint(p, x, y, i);
    }
  }
}

// 等電梯過久的抱怨提示（紅色冒泡 + 跳動 + 強度升級）
function drawWaitComplaint(p, x, y, idx) {
  var t = millis() / 200;
  var intensity = min(1, (p.waitedTicks - 120) / 320);    // 0..1（120~440 ticks 區間）
  var bob = sin(t + idx * 0.5) * 1.5;
  var bx = x + 4;
  var by = y - 5 + bob;

  // 強度高 → 額外的閃爍光環
  if (intensity > 0.5) {
    var pulse = 0.5 + 0.5 * sin(t * 6);
    noFill();
    stroke(255, 40, 40, 100 + pulse * 120);
    strokeWeight(1);
    ellipse(bx, by, 11 + pulse * 2, 11 + pulse * 2);
    noStroke();
  }

  // 主泡泡（紅）— 隨強度更鮮紅
  var r = 255;
  var g = 100 - intensity * 60;
  var b = 80 - intensity * 60;
  fill(r, g, b, 240);
  ellipse(bx, by, 8, 8);
  // 內側暗紅
  fill(160, 0, 0, 180);
  ellipse(bx + 0.5, by + 0.5, 5, 5);
  // 白「!」
  fill(255);
  textAlign(CENTER, CENTER); textSize(6);
  text("!", bx, by + 0.5);

  // 強度極高 → 旁邊多冒一個小驚嘆
  if (intensity > 0.75) {
    var bob2 = sin(t * 1.5 + idx) * 1.2;
    fill(255, 50, 50, 220);
    ellipse(bx + 5, by - 3 + bob2, 4, 4);
    fill(255);
    textSize(4);
    text("!", bx + 5, by - 2.5 + bob2);
  }
}

function blendColors(a, b, t) {
  return lerpColor(color(a), color(b), t).toString();
}

function drawTowerOutline() {
  // 外框
  noFill();
  stroke(PALETTE.towerEdge); strokeWeight(2);
  rect(TOWER_X, floorY(FLOOR_TOP), TOWER_W, FLOOR_COUNT * CELL_H);
  strokeWeight(1);
  // 樓層編號（左側）
  noStroke();
  fill(PALETTE.hudDim);
  textSize(8); textAlign(RIGHT, CENTER);
  for (var f = FLOOR_BOTTOM; f <= FLOOR_TOP; f++) {
    if (f % 2 !== 0 && f !== 0) continue;
    var lbl = (f === 0) ? "GF" : (f > 0 ? f + "F" : "B" + (-f));
    text(lbl, TOWER_X - 4, floorY(f) + CELL_H / 2);
  }
  // 屋頂
  fill("#8a8270");
  rect(TOWER_X - 4, floorY(FLOOR_TOP) - 6, TOWER_W + 8, 6);
  fill("#aaa");
  rect(TOWER_X + TOWER_W/2 - 2, floorY(FLOOR_TOP) - 22, 4, 18);
  // 屋頂閃燈
  var on = ((millis()/500) | 0) % 2 === 0;
  fill(on ? "#ff3333" : "#660000");
  ellipse(TOWER_X + TOWER_W/2, floorY(FLOOR_TOP) - 24, 4, 4);
}

// ============================================================================
// 點擊高亮 + 資訊面板
// ============================================================================
function drawSelectedHighlight() {
  if (!selectedUnit) return;
  var u = selectedUnit;
  var x0 = colX(u.colStart);
  var y0 = floorY(u.floor);
  var w  = u.width * CELL_W;
  var h  = CELL_H;
  noFill();
  // 黃色閃爍邊框
  var pulse = 1 + sin(millis() * 0.006) * 0.4;
  stroke(255, 215, 0, 200 + pulse * 40);
  strokeWeight(2);
  rect(x0 + 1, y0 + 2, w - 2, h - 3);
  strokeWeight(1);
  noStroke();
}

function drawInfoPanel() {
  if (!selectedUnit) return;
  var u = selectedUnit;
  var info = UNIT_INFO[u.type];
  var rev = REVENUE_INFO[u.type];
  if (!info) return;

  // 面板尺寸與位置（HUD 下方居中）
  var pw = min(290, canvasW - 20);
  var hasRating = (u.type !== T_MECH && u.type !== T_PARKING &&
                   u.type !== T_SUBWAY && u.type !== T_LOBBY);
  var ph = hasRating ? 230 : 168;
  var px = (canvasW - pw) / 2;
  var py = HUD_H + 6;

  // 背景
  noStroke();
  fill(15, 18, 25, 235);
  rect(px, py, pw, ph, 8);
  // 上邊裝飾色條（依房型色）
  fill(info.trim);
  rect(px, py, pw, 3, 8);

  // 標題列
  var floorLbl = (u.floor === 0) ? "GF" : (u.floor > 0 ? u.floor + "F" : "B" + (-u.floor));
  fill("#fff");
  textAlign(LEFT, TOP); textSize(14);
  text(info.emoji + " " + t(info.name), px + 12, py + 10);
  textAlign(RIGHT, TOP); textSize(11);
  fill(PALETTE.hudDim);
  text(floorLbl + " · " + u.width + " " + t("格"), px + pw - 12, py + 13);

  // 關閉按鈕（虛擬，點擊面板外即可關，這裡只是提示）
  textAlign(RIGHT, TOP); textSize(10);
  fill("#888");
  text(t("× 點外面關閉"), px + pw - 12, py + ph - 16);

  // 說明（手動折行）
  if (rev && rev.desc) {
    textAlign(LEFT, TOP); textSize(10);
    fill(PALETTE.hudDim);
    var lines = wrapText(rev.desc, 36);
    for (var i = 0; i < lines.length && i < 2; i++) {
      text(lines[i], px + 12, py + 33 + i * 13);
    }
  }

  // 資料表（左欄標籤、右欄值）
  var rowY = py + 70;
  var rowH = 17;
  var labelX = px + 14, valueX = px + pw - 14;
  textAlign(LEFT, TOP);  textSize(11); fill(PALETTE.hudDim);

  if (u.type === T_PARKING) {
    // 停車場：車位、現場人數、進出統計
    var parked = 0, total = u.slots ? u.slots.length : 0;
    if (u.slots) {
      for (var k = 0; k < u.slots.length; k++) {
        if (u.slots[k].state === "parked" || u.slots[k].state === "entering") parked++;
      }
    }
    text(t("車位佔用"), labelX, rowY);
    text(t("目前在內"), labelX, rowY + rowH);
    text(t("今日進出"), labelX, rowY + rowH * 2);
    text(t("累計人次"), labelX, rowY + rowH * 3);
    text(t("累計營收"), labelX, rowY + rowH * 4);
    textAlign(RIGHT, TOP); fill("#fff");
    text(parked + " / " + total + " " + t("車"), valueX, rowY);
    text((u.transient || 0) + " " + t("人"), valueX, rowY + rowH);
    text(u.visitorsToday + " " + t("人"), valueX, rowY + rowH * 2);
    text(u.totalVisitors + " " + t("人"), valueX, rowY + rowH * 3);
    var totalCol = u.revenue >= 0 ? "#34C759" : "#FF453A";
    fill(totalCol);
    text(formatMoney(u.revenue), valueX, rowY + rowH * 4);
  } else {
    text(t("容量"), labelX, rowY);
    text(t("今日訪客"), labelX, rowY + rowH);
    text(t("累計訪客"), labelX, rowY + rowH * 2);
    text(t("今日營收"), labelX, rowY + rowH * 3);
    text(t("累計營收"), labelX, rowY + rowH * 4);
    textAlign(RIGHT, TOP); fill("#fff");
    text(u.occupants.length + " / " + u.cap + " " + t("人"), valueX, rowY);
    text(u.visitorsToday + " " + t("人"), valueX, rowY + rowH);
    text(u.totalVisitors + " " + t("人"), valueX, rowY + rowH * 2);
    var trCol = u.todayRevenue >= 0 ? "#34C759" : "#FF453A";
    fill(trCol);
    text(formatMoney(u.todayRevenue), valueX, rowY + rowH * 3);
    var totalCol2 = u.revenue >= 0 ? "#34C759" : "#FF453A";
    fill(totalCol2);
    text(formatMoney(u.revenue), valueX, rowY + rowH * 4);
  }

  // ── 評價區塊（停車場 / 機房 / 大廳 / 地鐵不顯示）──
  if (hasRating) {
    var sectY = py + 160;
    // 分隔線
    fill(80, 90, 110, 80);
    rect(px + 12, sectY - 3, pw - 24, 1);
    // 標題
    fill("#fff"); textAlign(LEFT, TOP); textSize(11);
    text(t("顧客評價"), px + 14, sectY);

    var rating = getUnitRating(u);
    var count = u.ratings ? u.ratings.length : 0;
    // 星等
    drawRatingStars(px + pw - 14, sectY + 1, rating);
    fill(PALETTE.hudDim); textSize(9); textAlign(RIGHT, TOP);
    text((count > 0 ? rating.toFixed(1) + " / 5.0  ·  " + count + " " + t("則") : t("暫無評價")),
         px + pw - 14, sectY + 13);

    // 最近兩則留言
    if (u.comments && u.comments.length > 0) {
      textAlign(LEFT, TOP); textSize(9);
      var n = min(2, u.comments.length);
      for (var ci = 0; ci < n; ci++) {
        var c = u.comments[u.comments.length - 1 - ci];
        // 評分顏色
        var rCol = c.rating >= 4 ? "#34C759" :
                   c.rating >= 3 ? "#ffd700" :
                   c.rating >= 2 ? "#ff9500" : "#FF453A";
        fill(rCol);
        text("●", px + 14, sectY + 28 + ci * 14);
        fill("#dcdcdc");
        var commentText = c.text.length > 26 ? c.text.slice(0, 25) + "…" : c.text;
        text(commentText, px + 22, sectY + 28 + ci * 14);
      }
    } else {
      fill(PALETTE.hudDim); textSize(9); textAlign(LEFT, TOP);
      text(t("（還沒有訪客留下感想）"), px + 14, sectY + 28);
    }
  }
}

// 星等繪製（金色填星 + 灰色空星）右對齊到 rightX
function drawRatingStars(rightX, y, rating) {
  textSize(11);
  var starW = 9;
  var startX = rightX - 5 * starW;
  textAlign(LEFT, TOP);
  for (var i = 0; i < 5; i++) {
    var xi = startX + i * starW;
    if (rating - i >= 0.5) fill("#ffd700");
    else                   fill("#444");
    text("★", xi, y);
  }
}

function formatMoney(n) {
  var sign = n < 0 ? "-" : "";
  var v = floor(abs(n));
  var s = "" + v;
  // 加千位逗號
  var parts = [];
  while (s.length > 3) { parts.unshift(s.slice(-3)); s = s.slice(0, -3); }
  parts.unshift(s);
  return sign + "NT$ " + parts.join(",");
}

function wrapText(s, maxChars) {
  if (s.length <= maxChars) return [s];
  // 簡易：在 maxChars 處硬切（中文每字算 2 寬度）
  var lines = [];
  var line = "";
  var width = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    var w = (ch.charCodeAt(0) > 127) ? 2 : 1;
    if (width + w > maxChars) {
      lines.push(line);
      line = ch; width = w;
    } else {
      line += ch; width += w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ============================================================================
// HUD
// ============================================================================
function drawHUD() {
  // 背景
  noStroke();
  fill(PALETTE.hudBg);
  rect(0, 0, canvasW, HUD_H);

  // 時鐘
  var hh = floor(simTime / 3600);
  var mm = floor((simTime % 3600) / 60);
  var clockStr = nf(hh, 2) + ":" + nf(mm, 2);
  fill(PALETTE.hudText);
  textAlign(LEFT, TOP); textSize(14);
  text("🕐 " + clockStr + " " + WEATHER_INFO[weather].emoji, 10, 8);
  textSize(9); fill(PALETTE.hudDim);
  text(timeSlotName(hh), 10, 26);

  // 人數
  textAlign(LEFT, TOP); textSize(11); fill(PALETTE.hudText);
  text("👥 " + t("在樓人數") + " " + stats.population, 100, 8);
  textSize(9); fill(PALETTE.hudDim);
  // 分兩行避免擠到右側
  text(t("辦公") + " " + stats.workers + " · " + t("購物") + " " + stats.shoppers +
       " · " + t("娛樂") + " " + stats.moviegoers, 100, 24);
  text(t("住客") + " " + (stats.guests||0) + " · " + t("員工") + " " + stats.staff, 100, 38);

  // 電梯狀態：分兩行（一般井 / 高速井）
  textSize(9); fill(PALETTE.hudDim);
  var byCol = {};
  for (var i = 0; i < elevators.length; i++) {
    var e = elevators[i];
    if (!byCol[e.col]) byCol[e.col] = { type: e.type, cars: [] };
    byCol[e.col].cars.push(e);
  }
  var colKeys = Object.keys(byCol).sort(function(a,b){return +a - +b;});
  var locParts = [], expParts = [];
  for (var k = 0; k < colKeys.length; k++) {
    var grp = byCol[colKeys[k]];
    grp.cars.sort(function(a,b){return (a.carNum||0)-(b.carNum||0);});
    var floors = grp.cars.map(function(c){
      var f = c.currentFloor;
      return f === 0 ? "G" : f > 0 ? f + "" : "B" + (-f);
    }).join("·");
    var label = (grp.type === "express" ? "🚀" : "🛗") + floors;
    if (grp.type === "express") expParts.push(label);
    else locParts.push(label);
  }
  text(locParts.join("  "), 100, 74);
  text(expParts.join("  "), 100, 90);

  // 階段
  var phaseLbl = phase === "building" ?
      ("🚧 " + t("建造中") + " " + buildIdx + "/" + buildQueue.length) :
      ("🏙️ " + t("營運中"));
  fill(PALETTE.hudText);
  textAlign(RIGHT, TOP); textSize(11);
  text(phaseLbl, canvasW - 10, 8);
  textSize(9); fill(PALETTE.hudDim);
  text(t("速度") + " ×" + speedMul, canvasW - 10, 28);
  text(t("累計入場") + " " + stats.totalSpawned, canvasW - 10, 44);
  // 線上人數
  if (onlineCount > 0) {
    fill("#34c759");
    text("🟢 " + t("線上") + " " + onlineCount, canvasW - 10, 60);
    fill(PALETTE.hudDim);
  }

  // 抱怨統計（左側、進度條上一行）
  var comp = stats.complaining || 0;
  var pct = stats.population > 0 ? floor(comp * 100 / stats.population) : 0;
  if (comp > 0) {
    fill(pct >= 10 ? "#ff3b30" : (pct >= 5 ? "#ff9500" : "#ffd700"));
  } else {
    fill("#34c759");
  }
  textAlign(LEFT, TOP); textSize(9);
  text("🚨 " + t("抱怨") + " " + comp + " / " + stats.population + " (" + pct + "%)", 10, 122);

  // 進度條 / 最熱樓層
  if (phase === "building") {
    var pw = canvasW - 220;
    var px = 110, py = 138;
    noStroke();
    fill("#2a2a32"); rect(px, py, pw, 6);
    fill("#34C759");
    rect(px, py, pw * (buildIdx / max(1, buildQueue.length)), 6);
  } else {
    var pw = canvasW - 220;
    var px = 110, py = 138;
    fill("#2a2a32"); rect(px, py, pw, 6);
    var perFloor = {};
    for (var i = 0; i < people.length; i++) {
      perFloor[people[i].floor] = (perFloor[people[i].floor] || 0) + 1;
    }
    var maxFloorPop = 0;
    for (var k in perFloor) maxFloorPop = max(maxFloorPop, perFloor[k]);
    if (maxFloorPop > 0) {
      var hot = -1, hotN = 0;
      for (var k in perFloor) {
        if (perFloor[k] > hotN) { hotN = perFloor[k]; hot = +k; }
      }
      var hotLbl = hot === 0 ? "GF" : hot > 0 ? hot + "F" : "B" + (-hot);
      fill(PALETTE.hudDim); textAlign(LEFT, TOP); textSize(9);
      text(t("最熱樓層") + " " + hotLbl + " (" + hotN + t("人") + ")", px, py - 12);
      fill("#5fa2d8");
      rect(px, py, pw * min(1, hotN / 30), 6);
    }
  }
}

function timeSlotName(h) {
  if (h >= 5 && h < 8)   return t("清晨");
  if (h >= 8 && h < 12)  return t("上午");
  if (h >= 12 && h < 14) return t("午餐時段");
  if (h >= 14 && h < 17) return t("下午");
  if (h >= 17 && h < 20) return t("傍晚下班");
  if (h >= 20 && h < 23) return t("夜間");
  return t("深夜");
}
