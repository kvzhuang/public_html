/* Pandemic 瘟疫危機 · gen-art 版（第一期核心）
   合作型：單人控多角色；蜂巢六角世界地圖；即時 localStorage 存檔。 */
(function () {
  'use strict';

  // ── 48 城資料：英文名、中文、顏色、格座標(col,row)、鄰接 ──────────────
  var C = 'blue', Y = 'yellow', K = 'black', R = 'red';
  var CITIES = [
    // 藍：北美 + 歐洲
    ['San Francisco', '舊金山', C, 3, 5, ['Tokyo', 'Manila', 'Los Angeles', 'Chicago']],
    ['Chicago', '芝加哥', C, 6, 4, ['San Francisco', 'Los Angeles', 'Mexico City', 'Atlanta', 'Montreal']],
    ['Atlanta', '亞特蘭大', C, 7, 6, ['Chicago', 'Washington', 'Miami']],
    ['Montreal', '蒙特婁', C, 8, 3, ['Chicago', 'New York', 'Washington']],
    ['New York', '紐約', C, 10, 4, ['Montreal', 'Washington', 'London', 'Madrid']],
    ['Washington', '華盛頓', C, 8, 6, ['Atlanta', 'Montreal', 'New York', 'Miami']],
    ['London', '倫敦', C, 14, 3, ['New York', 'Madrid', 'Paris', 'Essen']],
    ['Madrid', '馬德里', C, 14, 6, ['New York', 'London', 'Paris', 'Algiers', 'Sao Paulo']],
    ['Paris', '巴黎', C, 16, 4, ['London', 'Madrid', 'Essen', 'Milan', 'Algiers']],
    ['Essen', '埃森', C, 16, 2, ['London', 'Paris', 'Milan', 'St Petersburg']],
    ['Milan', '米蘭', C, 17, 5, ['Paris', 'Essen', 'Istanbul']],
    ['St Petersburg', '聖彼得堡', C, 18, 2, ['Essen', 'Moscow', 'Istanbul']],
    // 黃：中南美 + 非洲
    ['Los Angeles', '洛杉磯', Y, 3, 7, ['San Francisco', 'Chicago', 'Mexico City', 'Sydney']],
    ['Mexico City', '墨西哥城', Y, 5, 8, ['Los Angeles', 'Chicago', 'Miami', 'Bogota', 'Lima']],
    ['Miami', '邁阿密', Y, 8, 8, ['Atlanta', 'Washington', 'Mexico City', 'Bogota']],
    ['Bogota', '波哥大', Y, 8, 10, ['Mexico City', 'Miami', 'Lima', 'Sao Paulo', 'Buenos Aires']],
    ['Lima', '利馬', Y, 7, 12, ['Mexico City', 'Bogota', 'Santiago']],
    ['Santiago', '聖地牙哥', Y, 7, 14, ['Lima']],
    ['Sao Paulo', '聖保羅', Y, 10, 12, ['Bogota', 'Buenos Aires', 'Madrid', 'Lagos']],
    ['Buenos Aires', '布宜諾斯艾利斯', Y, 9, 14, ['Bogota', 'Sao Paulo']],
    ['Lagos', '拉哥斯', Y, 15, 10, ['Sao Paulo', 'Khartoum', 'Kinshasa']],
    ['Kinshasa', '金夏沙', Y, 16, 12, ['Lagos', 'Khartoum', 'Johannesburg']],
    ['Khartoum', '喀土穆', Y, 17, 9, ['Lagos', 'Kinshasa', 'Johannesburg', 'Cairo']],
    ['Johannesburg', '約翰尼斯堡', Y, 17, 14, ['Kinshasa', 'Khartoum']],
    // 黑：北非 + 中東 + 南亞
    ['Algiers', '阿爾及爾', K, 15, 8, ['Madrid', 'Paris', 'Istanbul', 'Cairo']],
    ['Istanbul', '伊斯坦堡', K, 18, 6, ['Milan', 'St Petersburg', 'Algiers', 'Cairo', 'Baghdad', 'Moscow']],
    ['Cairo', '開羅', K, 17, 7, ['Algiers', 'Istanbul', 'Khartoum', 'Baghdad', 'Riyadh']],
    ['Moscow', '莫斯科', K, 20, 3, ['St Petersburg', 'Istanbul', 'Tehran']],
    ['Baghdad', '巴格達', K, 20, 6, ['Istanbul', 'Cairo', 'Riyadh', 'Tehran', 'Karachi']],
    ['Riyadh', '利雅德', K, 20, 8, ['Cairo', 'Baghdad', 'Karachi']],
    ['Tehran', '德黑蘭', K, 22, 4, ['Moscow', 'Baghdad', 'Karachi', 'Delhi']],
    ['Karachi', '喀拉蚩', K, 22, 6, ['Baghdad', 'Riyadh', 'Tehran', 'Delhi', 'Mumbai']],
    ['Delhi', '德里', K, 24, 5, ['Tehran', 'Karachi', 'Mumbai', 'Kolkata', 'Chennai']],
    ['Mumbai', '孟買', K, 23, 8, ['Karachi', 'Delhi', 'Chennai']],
    ['Kolkata', '加爾各答', K, 25, 6, ['Delhi', 'Chennai', 'Bangkok', 'Hong Kong']],
    ['Chennai', '清奈', K, 24, 8, ['Mumbai', 'Delhi', 'Kolkata', 'Bangkok', 'Jakarta']],
    // 紅：東亞 + 大洋洲
    ['Beijing', '北京', R, 27, 4, ['Shanghai', 'Seoul']],
    ['Seoul', '首爾', R, 29, 3, ['Beijing', 'Shanghai', 'Tokyo']],
    ['Tokyo', '東京', R, 31, 4, ['Seoul', 'Shanghai', 'Osaka', 'San Francisco']],
    ['Shanghai', '上海', R, 28, 5, ['Beijing', 'Seoul', 'Tokyo', 'Hong Kong', 'Taipei']],
    ['Hong Kong', '香港', R, 28, 7, ['Shanghai', 'Taipei', 'Kolkata', 'Bangkok', 'Ho Chi Minh City', 'Manila']],
    ['Taipei', '台北', R, 29, 6, ['Shanghai', 'Hong Kong', 'Osaka', 'Manila']],
    ['Osaka', '大阪', R, 31, 5, ['Tokyo', 'Taipei']],
    ['Bangkok', '曼谷', R, 26, 8, ['Kolkata', 'Chennai', 'Hong Kong', 'Ho Chi Minh City', 'Jakarta']],
    ['Ho Chi Minh City', '胡志明市', R, 27, 9, ['Bangkok', 'Hong Kong', 'Manila', 'Jakarta']],
    ['Manila', '馬尼拉', R, 30, 8, ['San Francisco', 'Hong Kong', 'Taipei', 'Ho Chi Minh City', 'Sydney']],
    ['Jakarta', '雅加達', R, 28, 10, ['Chennai', 'Bangkok', 'Ho Chi Minh City', 'Sydney']],
    ['Sydney', '雪梨', R, 31, 13, ['Los Angeles', 'Manila', 'Jakarta']]
  ];

  var CITY = {};   // name -> {name,zh,color,col,row,adj,x,y}
  CITIES.forEach(function (c) {
    CITY[c[0]] = { name: c[0], zh: c[1], color: c[2], col: c[3], row: c[4], adj: c[5], x: 0, y: 0 };
  });
  // 對稱化鄰接（保險）
  Object.keys(CITY).forEach(function (n) {
    CITY[n].adj.forEach(function (m) {
      if (CITY[m] && CITY[m].adj.indexOf(n) < 0) CITY[m].adj.push(n);
    });
  });
  // 高解析度：座標系 ×2（六角細分、海岸線更平滑）；遮罩沿用 1× 值於 buildHexField 內 ×2
  var GRID = 2;
  Object.keys(CITY).forEach(function (n) { CITY[n].col *= GRID; CITY[n].row *= GRID; });

  var COLORS = { blue: '#3aa0e0', yellow: '#e8c341', black: '#8a8f98', red: '#e2574c' };
  var CUBE_COLS = ['blue', 'yellow', 'black', 'red'];
  // 手工大陸遮罩：[洲色, row, colStart, colEnd]（含端點）→ 畫出各洲輪廓
  var LANDSPANS = [
    // ── 北美（藍）：阿拉斯加勾 + 加拿大 + 美國本土 ──
    [C, 2, 6, 9], [C, 2, 14, 17],
    [C, 3, 4, 20],
    [C, 4, 3, 21],
    [C, 5, 3, 21],
    [C, 6, 2, 21],
    [C, 7, 3, 21],
    [C, 8, 4, 21],
    [C, 9, 4, 20],
    [C, 10, 5, 19],
    [C, 11, 6, 18],
    [C, 12, 8, 18],
    [C, 13, 10, 16],
    // ── 中美 + 墨西哥（黃）→ 收成地峽 ──
    [Y, 13, 5, 8],
    [Y, 14, 5, 9],
    [Y, 15, 7, 11],
    [Y, 16, 9, 13],
    [Y, 17, 12, 15],
    [Y, 18, 14, 16],
    // ── 南美（黃）：加勒比→巴西鼓出→巴塔哥尼亞收尖 ──
    [Y, 16, 15, 17],
    [Y, 17, 15, 18],
    [Y, 18, 15, 20],
    [Y, 19, 14, 21],
    [Y, 20, 13, 22],
    [Y, 21, 13, 22],
    [Y, 22, 13, 22],
    [Y, 23, 13, 21],
    [Y, 24, 13, 21],
    [Y, 25, 14, 20],
    [Y, 26, 14, 19],
    [Y, 27, 15, 18],
    [Y, 28, 14, 18],
    [Y, 29, 15, 16],
    // ── 歐洲（藍）：與非洲以地中海(第13列)分隔，東接亞洲 ──
    [C, 3, 31, 37],
    [C, 4, 30, 38],
    [C, 5, 28, 38],
    [C, 6, 27, 37],
    [C, 7, 27, 36],
    [C, 8, 28, 36],
    [C, 9, 29, 36],
    [C, 10, 29, 35],
    [C, 11, 28, 33],
    [C, 12, 27, 31],
    // ── 北非（黑，地中海南岸）──
    [K, 14, 29, 36],
    [K, 15, 29, 36],
    [K, 16, 29, 35],
    // ── 撒哈拉以南非洲（黃）：往南收 + 東非之角 ──
    [Y, 17, 30, 37],
    [Y, 18, 29, 38],
    [Y, 19, 29, 38],
    [Y, 20, 29, 37],
    [Y, 21, 30, 37],
    [Y, 22, 30, 36],
    [Y, 23, 31, 36],
    [Y, 24, 31, 35],
    [Y, 25, 32, 35],
    [Y, 26, 32, 35],
    [Y, 27, 33, 35],
    [Y, 28, 33, 35],
    [Y, 29, 33, 34],
    // ── 中東 + 中亞（黑）：接歐洲/俄羅斯/中國 ──
    [K, 5, 38, 45],
    [K, 6, 38, 48],
    [K, 7, 38, 50],
    [K, 8, 38, 51],
    [K, 9, 38, 51],
    [K, 10, 38, 51],
    [K, 11, 37, 51],
    [K, 12, 36, 51],
    [K, 13, 38, 51],
    // ── 阿拉伯半島（黑）→ 收尖 ──
    [K, 14, 38, 43],
    [K, 15, 38, 42],
    [K, 16, 39, 42],
    [K, 17, 40, 41],
    // ── 印度（黑）倒三角 ──
    [K, 14, 45, 50],
    [K, 15, 45, 49],
    [K, 16, 46, 48],
    [K, 17, 47, 48],
    [K, 18, 47, 47],
    // ── 東亞大陸（紅）：西伯利亞/蒙古/中國/中南半島 ──
    [R, 4, 52, 60],
    [R, 5, 51, 61],
    [R, 6, 51, 61],
    [R, 7, 51, 60],
    [R, 8, 51, 60],
    [R, 9, 51, 59],
    [R, 10, 51, 58],
    [R, 11, 51, 57],
    [R, 12, 51, 58],
    [R, 13, 51, 57],
    [R, 14, 52, 57],
    [R, 15, 52, 56],
    [R, 16, 52, 55],
    [R, 17, 53, 55],
    [R, 18, 53, 55],
    // ── 日本（紅，離島；col62-64，與大陸隔日本海）──
    [R, 5, 63, 64],
    [R, 6, 63, 64],
    [R, 7, 62, 63],
    [R, 8, 62, 63],
    [R, 9, 62, 63],
    [R, 10, 62, 63],
    // ── 菲律賓（紅，小島）──
    [R, 15, 60, 61],
    [R, 16, 60, 61],
    [R, 17, 60, 60],
    // ── 印尼群島（紅）──
    [R, 19, 55, 59],
    [R, 20, 55, 59],
    [R, 21, 57, 60],
    // ── 澳洲（紅，離島）──
    [R, 24, 59, 65],
    [R, 25, 58, 66],
    [R, 26, 58, 66],
    [R, 27, 59, 65],
    [R, 28, 60, 64]
  ];
  var LAND_MASK = null;   // "col,row" -> color
  var ROLES = [
    { id: 'medic', name: '醫生', color: '#ff8c42', abil: '治療移除全部同色方塊；已解藥的病自動清除' },
    { id: 'scientist', name: '科學家', color: '#c9a0ff', abil: '只要 4 張同色卡即可研發解藥' },
    { id: 'researcher', name: '研究員', color: '#5ec8a0', abil: '給卡不受「所在城市」限制，可給任一張城市卡' },
    { id: 'ops', name: '行動專家', color: '#7ab8ff', abil: '免棄卡建研究站；每回合一次可從研究站棄任一城市卡飛往任意城市' },
    { id: 'dispatcher', name: '調度員', color: '#e07ab0', abil: '可移動任一棋子；或把任一棋子移到「有其他棋子」的城市' },
    { id: 'quarantine', name: '檢疫員', color: '#9ad06a', abil: '所在與相鄰城市不會被放方塊（含爆發蔓延）' }
  ];
  var EVENTS = [
    { ev: 'airlift', name: '空運', desc: '把任一棋子移到任意城市' },
    { ev: 'grant', name: '政府補助', desc: '在任意城市免費建研究站' },
    { ev: 'quiet', name: '平靜夜晚', desc: '跳過下一次感染階段' },
    { ev: 'forecast', name: '疫情預測', desc: '查看並重洗感染牌堆頂 6 張' },
    { ev: 'resilient', name: '堅韌人口', desc: '將感染棄牌中一張城市永久移出遊戲' }
  ];
  var INFECT_RATE = [2, 2, 2, 3, 3, 4, 4];
  var CUBES_PER_COLOR = 24, MAX_STATIONS = 6, HAND_LIMIT = 7, MAX_OUTBREAKS = 8;

  // ── 狀態 ──────────────────────────────────────────────
  var S = null;                 // 遊戲狀態
  var SAVE_KEY = 'pandemic.save.v1';
  var cv, ctx, DPR = 1, HEX = 17, hexCells = null, originX = 0, originY = 0;
  var sel = -1;                 // 選取的玩家 index（目前操作者＝S.turn）
  var mode = null;              // 行動模式：null / 'direct' / 'charter' / 'shuttle' / 'treat' / 'share'
  var onChange = function () {};// UI 綁定：每次狀態變動→render+save
  var undoStack = [];           // 本回合行動的還原快照（只在行動階段可悔棋）

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function log(m) { if (S) { S.log.push(m); if (S.log.length > 60) S.log.shift(); } }

  // ── 建立新局 ──────────────────────────────────────────
  function setup(numPlayers, epidemics, roleIds) {
    undoStack = [];
    var cubes = {};
    Object.keys(CITY).forEach(function (n) { cubes[n] = { blue: 0, yellow: 0, black: 0, red: 0 }; });
    S = {
      numPlayers: numPlayers, epidemics: epidemics,
      players: [], turn: 0, actionsLeft: 4, phase: 'actions',
      cubes: cubes, stations: ['Atlanta'],
      left: { blue: CUBES_PER_COLOR, yellow: CUBES_PER_COLOR, black: CUBES_PER_COLOR, red: CUBES_PER_COLOR },
      rateIdx: 0, outbreaks: 0,
      cures: { blue: false, yellow: false, black: false, red: false },
      eradicated: { blue: false, yellow: false, black: false, red: false },
      playerDeck: [], playerDiscard: [], infDeck: [], infDiscard: [], infRemoved: [],
      status: 'playing', mustDiscard: -1, log: [],
      skipNextInfect: false, opsMoveUsed: false, lastOut: []
    };
    // 角色
    var rids = roleIds && roleIds.length >= numPlayers ? roleIds.slice(0, numPlayers)
      : shuffle(ROLES.map(function (r) { return r.id; })).slice(0, numPlayers);
    rids.forEach(function (rid) { S.players.push({ role: rid, city: 'Atlanta', hand: [] }); });

    // 感染牌堆：48 城；抽 9 張放初始方塊（3×3, 3×2, 3×1）
    S.infDeck = shuffle(Object.keys(CITY).slice());
    for (var n = 3; n >= 1; n--) {
      for (var k = 0; k < 3; k++) {
        var city = S.infDeck.pop(); S.infDiscard.push(city);
        for (var q = 0; q < n; q++) placeCube(city, CITY[city].color, null, true);
      }
    }
    // 玩家牌堆：48 城卡 ＋ 5 張特殊事件卡 → 先發手牌
    var pdeck = Object.keys(CITY).map(function (n2) { return { t: 'city', city: n2, color: CITY[n2].color }; });
    EVENTS.forEach(function (e) { pdeck.push({ t: 'event', ev: e.ev, name: e.name }); });
    shuffle(pdeck);
    var startHand = numPlayers === 2 ? 4 : numPlayers === 3 ? 3 : 2;
    S.players.forEach(function (p) { for (var i = 0; i < startHand; i++) p.hand.push(pdeck.pop()); });
    // 插入疫情卡：把剩餘牌均分 epidemics 疊，每疊塞一張 epidemic 再疊回
    var piles = [], per = Math.floor(pdeck.length / epidemics), extra = pdeck.length % epidemics, idx = 0;
    for (var e = 0; e < epidemics; e++) {
      var sz = per + (e < extra ? 1 : 0);
      var pile = pdeck.slice(idx, idx + sz); idx += sz;
      pile.push({ t: 'epidemic' }); shuffle(pile);
      piles = piles.concat(pile);
    }
    S.playerDeck = piles;
    log('新局：' + numPlayers + ' 人 / ' + epidemics + ' 疫情卡');
    return S;
  }

  // ── 方塊 / 爆發 ───────────────────────────────────────
  function isProtected(city) {  // 檢疫員：所在及相鄰城市不被放方塊
    return S.players.some(function (p) {
      return p.role === 'quarantine' && (p.city === city || CITY[city].adj.indexOf(p.city) >= 0);
    });
  }
  function medicAutoClear(pi) {  // 醫生進城→自動清除已解藥顏色的方塊
    var p = S.players[pi]; if (p.role !== 'medic') return;
    CUBE_COLS.forEach(function (col) {
      if (S.cures[col] && S.cubes[p.city][col]) {
        S.left[col] += S.cubes[p.city][col]; S.cubes[p.city][col] = 0;
        if (allCubesGone(col)) S.eradicated[col] = true;
      }
    });
  }

  function placeCube(city, color, chain, silent) {
    if (S.eradicated[color]) return;
    if (!silent && isProtected(city)) { log('🛡️ 檢疫員擋下 ' + CITY[city].zh + ' 的感染'); return; }
    var cur = S.cubes[city][color];
    if (cur >= 3) { outbreak(city, color, chain || {}); return; }
    if (S.left[color] <= 0) { S.status = 'lost'; S.lostReason = color + ' 方塊用盡'; return; }
    S.cubes[city][color] = cur + 1; S.left[color]--;
    if (!silent) log('🦠 ' + CITY[city].zh + ' +1 ' + color);
  }

  function outbreak(city, color, chain) {
    if (chain[city]) return;         // 本次連鎖此城已爆過
    chain[city] = true;
    S.outbreaks++;
    log('💥 ' + CITY[city].zh + ' 爆發！(' + S.outbreaks + '/' + MAX_OUTBREAKS + ')');
    if (S.outbreaks >= MAX_OUTBREAKS) { S.status = 'lost'; S.lostReason = '爆發達 8 次'; return; }
    if (!S.lastOut) S.lastOut = [];
    S.lastOut.push(city);
    CITY[city].adj.forEach(function (nb) {
      if (isProtected(nb)) return;                 // 檢疫員擋下連鎖擴散
      var cur = S.cubes[nb][color];
      if (cur >= 3) outbreak(nb, color, chain);
      else if (S.left[color] > 0) { S.cubes[nb][color] = cur + 1; S.left[color]--; }
      else { S.status = 'lost'; S.lostReason = color + ' 方塊用盡'; }
    });
  }

  // ── 感染階段 ──────────────────────────────────────────
  function infectStep() {
    if (S.skipNextInfect) { S.skipNextInfect = false; log('🌙 平靜夜晚：本次感染跳過'); return; }
    var rate = INFECT_RATE[S.rateIdx];
    for (var i = 0; i < rate && S.status === 'playing'; i++) {
      if (!S.infDeck.length) { S.status = 'lost'; S.lostReason = '感染牌抽盡'; return; }
      var city = S.infDeck.pop(); S.infDiscard.push(city);
      placeCube(city, CITY[city].color, null, false);
    }
  }

  function resolveEpidemic() {
    log('☣️ 疫情爆發！');
    if (S.rateIdx < INFECT_RATE.length - 1) S.rateIdx++;      // 1) 感染率+1
    if (S.infDeck.length) {                                    // 2) 抽最底 ×3
      var city = S.infDeck.shift(); S.infDiscard.push(city);
      log('☣️ 最底：' + CITY[city].zh + ' ×3');
      for (var q = 0; q < 3; q++) placeCube(city, CITY[city].color, null, false);
    }
    shuffle(S.infDiscard);                                     // 3) 洗棄牌疊回頂
    S.infDeck = S.infDeck.concat(S.infDiscard);
    S.infDiscard = [];
  }

  // ── 行動 ──────────────────────────────────────────────
  function P() { return S.players[S.turn]; }
  function needAction() { return S.phase === 'actions' && S.actionsLeft > 0 && S.status === 'playing'; }
  function handHas(pi, cityName) { return S.players[pi].hand.findIndex(function (c) { return c.t === 'city' && c.city === cityName; }); }
  function discardFromHand(pi, cityName) {
    var i = handHas(pi, cityName); if (i < 0) return false;
    S.playerDiscard.push(S.players[pi].hand.splice(i, 1)[0]); return true;
  }

  // 解析移動對象：一般人只能動自己；調度員可動任何人
  function moverIdx(m) {
    if (m == null) m = S.turn;
    if (m !== S.turn && P().role !== 'dispatcher') return -1;
    return m;
  }
  function arrive(mi, dest, verb) { S.players[mi].city = dest; medicAutoClear(mi); spend(verb + ' ' + CITY[dest].zh + (mi !== S.turn ? '（' + roleName(S.players[mi].role) + '）' : '')); }

  function actMoveDrive(dest, mover) {
    if (!needAction()) return err('沒有行動次數');
    var mi = moverIdx(mover); if (mi < 0) return err('只有調度員能移動他人');
    if (CITY[S.players[mi].city].adj.indexOf(dest) < 0) return err('不相鄰');
    arrive(mi, dest, '走到'); return ok();
  }
  function actDirectFlight(dest, mover) {
    if (!needAction()) return err('沒有行動次數');
    var mi = moverIdx(mover); if (mi < 0) return err('只有調度員能移動他人');
    if (!discardFromHand(S.turn, dest)) return err('手上沒有 ' + CITY[dest].zh + ' 卡');
    arrive(mi, dest, '直飛'); return ok();
  }
  function actCharter(dest, mover) {
    if (!needAction()) return err('沒有行動次數');
    var mi = moverIdx(mover); if (mi < 0) return err('只有調度員能移動他人');
    if (!discardFromHand(S.turn, S.players[mi].city)) return err('需棄「所在城市」卡');
    arrive(mi, dest, '包機到'); return ok();
  }
  function actShuttle(dest, mover) {
    if (!needAction()) return err('沒有行動次數');
    var mi = moverIdx(mover); if (mi < 0) return err('只有調度員能移動他人');
    if (S.stations.indexOf(S.players[mi].city) < 0 || S.stations.indexOf(dest) < 0) return err('需研究站互跳');
    arrive(mi, dest, '跳站到'); return ok();
  }
  // 調度員：把任一棋子移到「有其他棋子」的城市（免卡）
  function actRendezvous(movePi, dest) {
    if (!needAction()) return err('沒有行動次數');
    if (P().role !== 'dispatcher') return err('只有調度員可會合移動');
    if (!S.players.some(function (p, i) { return i !== movePi && p.city === dest; })) return err('目標城需有其他棋子');
    arrive(movePi, dest, '會合至'); return ok();
  }
  // 行動專家：每回合一次，從研究站棄任一城市卡→移動到任一城
  function actOpsMove(dest, discardCity) {
    if (!needAction()) return err('沒有行動次數');
    var p = P();
    if (p.role !== 'ops') return err('僅行動專家可用');
    if (S.opsMoveUsed) return err('本回合已用過專送');
    if (S.stations.indexOf(p.city) < 0) return err('需從研究站出發');
    if (!discardFromHand(S.turn, discardCity)) return err('需棄一張城市卡');
    S.opsMoveUsed = true; arrive(S.turn, dest, '專送到'); return ok();
  }
  function actBuild() {
    if (!needAction()) return err('沒有行動次數');
    var p = P();
    if (S.stations.indexOf(p.city) >= 0) return err('已有研究站');
    if (S.stations.length >= MAX_STATIONS) return err('研究站已達上限');
    if (p.role !== 'ops' && !discardFromHand(S.turn, p.city)) return err('需棄「所在城市」卡');
    S.stations.push(p.city); spend('在 ' + CITY[p.city].zh + ' 建研究站'); return ok();
  }
  function actTreat(color) {
    if (!needAction()) return err('沒有行動次數');
    var p = P(), cell = S.cubes[p.city];
    if (!cell[color]) return err('該城沒有 ' + color + ' 方塊');
    if (p.role === 'medic' || S.cures[color]) {      // 醫生或已解藥→一次清光
      S.left[color] += cell[color]; cell[color] = 0;
    } else { cell[color]--; S.left[color]++; }
    if (S.cures[color] && allCubesGone(color)) S.eradicated[color] = true;
    spend('治療 ' + CITY[p.city].zh + ' 的 ' + color); return ok();
  }
  function actShare(targetPi, give, cityName) {
    if (!needAction()) return err('沒有行動次數');
    var p = P(), t = S.players[targetPi];
    if (p.city !== t.city) return err('需同城');
    var giver = give ? S.turn : targetPi, taker = give ? targetPi : S.turn;
    var here = p.city, card = cityName || here;
    if (S.players[giver].role !== 'researcher' && card !== here)
      return err('只能交換所在城市卡（研究員例外）');
    if (!discardShareMove(giver, taker, card)) return err('對方/你沒有該卡');
    spend('交換 ' + CITY[card].zh + ' 卡'); return ok();
  }
  function discardShareMove(giver, taker, cityName) {
    var i = handHas(giver, cityName); if (i < 0) return false;
    var card = S.players[giver].hand.splice(i, 1)[0];
    S.players[taker].hand.push(card);
    if (S.players[taker].hand.length > HAND_LIMIT) S.mustDiscard = taker;
    return true;
  }
  function actCure(color) {
    if (!needAction()) return err('沒有行動次數');
    var p = P();
    if (S.stations.indexOf(p.city) < 0) return err('需在研究站');
    if (S.cures[color]) return err('已研發過');
    var need = p.role === 'scientist' ? 4 : 5;
    var same = p.hand.filter(function (c) { return c.t === 'city' && c.color === color; });
    if (same.length < need) return err(color + ' 卡不足（需 ' + need + '）');
    for (var i = 0; i < need; i++) discardFromHand(S.turn, same[i].city);
    S.cures[color] = true;
    log('💊 研發出 ' + color + ' 解藥！');
    if (allCubesGone(color)) S.eradicated[color] = true;
    if (S.cures.blue && S.cures.yellow && S.cures.black && S.cures.red) { S.status = 'won'; }
    spend('研發 ' + color + ' 解藥'); return ok();
  }
  function allCubesGone(color) {
    return Object.keys(S.cubes).every(function (n) { return S.cubes[n][color] === 0; });
  }

  function spend(msg) { S.actionsLeft--; log('▸ ' + msg + '（剩 ' + S.actionsLeft + ' 行動）'); if (S.actionsLeft <= 0 && S.status === 'playing') S.phase = 'ready-draw'; }
  function ok() { return { ok: true }; }
  function err(m) { return { ok: false, msg: m }; }

  // 結束行動 → 抽 2 張 → (疫情) → 手牌上限 → 感染 → 換人
  function endActions() {
    if (S.status !== 'playing') return;
    if (S.phase === 'actions') S.phase = 'ready-draw';
    // 抽 2
    for (var i = 0; i < 2; i++) {
      if (!S.playerDeck.length) { S.status = 'lost'; S.lostReason = '玩家牌庫抽盡'; onChange(); return; }
      var card = S.playerDeck.pop();
      if (card.t === 'epidemic') { resolveEpidemic(); if (S.status !== 'playing') { onChange(); return; } }
      else { P().hand.push(card); log('抽到 ' + (card.t === 'event' ? '事件【' + card.name + '】' : CITY[card.city].zh + ' 卡')); }
    }
    // 手牌上限
    if (P().hand.length > HAND_LIMIT) { S.mustDiscard = S.turn; S.phase = 'discard'; onChange(); return; }
    infectAndNext();
  }
  function infectAndNext() {
    S.phase = 'infect';
    infectStep();
    if (S.status !== 'playing') { onChange(); return; }
    S.turn = (S.turn + 1) % S.numPlayers;
    S.actionsLeft = 4; S.phase = 'actions'; sel = S.turn; mode = null;
    S.opsMoveUsed = false;                 // 行動專家每回合可再用一次專送
    S.lastOut = [];                        // 清掉上一輪爆發高亮
    undoStack = [];                        // 新回合清空悔棋堆
    log('— 換 ' + roleName(P().role) + ' 的回合 —');
    onChange();
  }

  // ── 特殊事件卡（隨時可打，不花行動）──
  function playEvent(pi, idx, args) {
    args = args || {};
    if (S.status !== 'playing') return err('遊戲已結束');
    if (S.mustDiscard >= 0) return err('請先處理手牌上限');
    var p = S.players[pi], c = p.hand[idx];
    if (!c || c.t !== 'event') return err('不是事件卡');
    switch (c.ev) {
      case 'airlift':
        if (args.movePi == null || !CITY[args.city]) return err('需選棋子與目的城市');
        S.players[args.movePi].city = args.city; medicAutoClear(args.movePi);
        log('✈️ 空運：' + roleName(S.players[args.movePi].role) + ' → ' + CITY[args.city].zh); break;
      case 'grant':
        if (!CITY[args.city]) return err('需選城市');
        if (S.stations.indexOf(args.city) >= 0) return err('該城已有研究站');
        if (S.stations.length >= MAX_STATIONS) return err('研究站已達上限');
        S.stations.push(args.city); log('🏥 政府補助：' + CITY[args.city].zh + ' 建研究站'); break;
      case 'quiet':
        S.skipNextInfect = true; log('🌙 平靜夜晚：下一次感染將跳過'); break;
      case 'forecast':
        var top = S.infDeck.slice(-6); shuffle(top);
        S.infDeck = S.infDeck.slice(0, S.infDeck.length - top.length).concat(top);
        log('🔮 疫情預測：重洗牌堆頂 ' + top.length + ' 張'); break;
      case 'resilient':
        var di = S.infDiscard.indexOf(args.city);
        if (di < 0) return err('感染棄牌中沒有此城');
        S.infDiscard.splice(di, 1); S.infRemoved.push(args.city);
        log('🧬 堅韌人口：' + CITY[args.city].zh + ' 永久移出遊戲'); break;
      default: return err('未知事件');
    }
    p.hand.splice(idx, 1); S.playerDiscard.push(c);
    onChange(); return ok();
  }
  function discardCard(pi, idx) {
    if (S.mustDiscard !== pi) return err('現在不需棄牌');
    if (idx < 0 || idx >= S.players[pi].hand.length) return err('編號錯');
    var c = S.players[pi].hand.splice(idx, 1)[0];
    if (c.t === 'city') S.playerDiscard.push(c);
    if (S.players[pi].hand.length <= HAND_LIMIT) {
      S.mustDiscard = -1;
      if (S.phase === 'discard') infectAndNext(); else onChange();
    } else onChange();
    return ok();
  }

  function roleName(rid) { var r = ROLES.find(function (x) { return x.id === rid; }); return r ? r.name : rid; }
  function roleColor(rid) { var r = ROLES.find(function (x) { return x.id === rid; }); return r ? r.color : '#fff'; }

  // ── 存檔 ──────────────────────────────────────────────
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.players) { S = s; return true; } } catch (e) {}
    return false;
  }

  // ── 幾何 / 蜂巢地圖 ───────────────────────────────────
  function hexC(col, row) {
    return { x: originX + HEX * Math.sqrt(3) * (col + 0.5 * (row & 1)), y: originY + HEX * 1.5 * row };
  }
  function computePositions() {
    Object.keys(CITY).forEach(function (n) { var c = CITY[n]; var p = hexC(c.col, c.row); c.x = p.x; c.y = p.y; });
  }
  function buildLandMask() {
    var m = {};
    LANDSPANS.forEach(function (s) {
      for (var c = s[2]; c <= s[3]; c++) m[c + ',' + s[1]] = s[0];
    });
    // 確保每座城市都在陸地上（用該城顏色補上該格）
    Object.keys(CITY).forEach(function (n) { var c = CITY[n]; m[c.col + ',' + c.row] = c.color; });
    LAND_MASK = m;
  }
  function buildHexField() {
    if (!LAND_MASK) buildLandMask();
    var cells = [];
    var maxCol = 72, maxRow = 36;
    for (var row = -1; row <= maxRow; row++) {
      for (var col = -1; col <= maxCol; col++) {
        var p = hexC(col, row), color = LAND_MASK[col + ',' + row];
        cells.push({ col: col, row: row, x: p.x, y: p.y, color: color || 'sea', land: !!color });
      }
    }
    hexCells = cells;
  }

  function layout(hex) {
    HEX = Math.max(7, Math.round((hex || 16) / GRID));   // ×2 座標→半徑減半，板面尺寸不變
    originX = 0; originY = 0; computePositions(); buildHexField();
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    hexCells.forEach(function (c) { minx = Math.min(minx, c.x); maxx = Math.max(maxx, c.x); miny = Math.min(miny, c.y); maxy = Math.max(maxy, c.y); });
    var pad = HEX * 1.6;
    originX = pad - minx; originY = pad - miny;
    computePositions(); buildHexField();
    return { cells: hexCells, w: (maxx - minx) + pad * 2, h: (maxy - miny) + pad * 2, hex: HEX };
  }

  function roleAbil(rid) { var r = ROLES.find(function (x) { return x.id === rid; }); return r ? r.abil : ''; }

  // ── 悔棋：成功的行動前把狀態壓入 undoStack，可還原到行動前 ──
  function wrapUndo(fn) {
    return function () {
      var pre = JSON.stringify(S);
      var r = fn.apply(null, arguments);
      if (r && r.ok) { undoStack.push(pre); if (undoStack.length > 60) undoStack.shift(); }
      return r;
    };
  }
  function canUndo() { return undoStack.length > 0 && S && S.phase === 'actions' && S.status === 'playing'; }
  function undoAction() {
    if (!canUndo()) return false;
    S = JSON.parse(undoStack.pop()); onChange(); return true;
  }

  // ── 情勢提示（啟發式，非精算勝率）──
  function computeHints() {
    if (!S) return [];
    var h = [], onBoard = { blue: 0, yellow: 0, black: 0, red: 0 }, danger = [];
    Object.keys(S.cubes).forEach(function (n) {
      CUBE_COLS.forEach(function (c) { onBoard[c] += S.cubes[n][c]; });
      if (CUBE_COLS.some(function (c) { return S.cubes[n][c] === 3; })) danger.push(CITY[n].zh);
    });
    // 解藥進度：全體手牌各色最多集中數
    var maxSame = { blue: 0, yellow: 0, black: 0, red: 0 };
    S.players.forEach(function (p) {
      var cnt = { blue: 0, yellow: 0, black: 0, red: 0 };
      p.hand.forEach(function (c) { if (c.t === 'city') cnt[c.color]++; });
      CUBE_COLS.forEach(function (c) { if (cnt[c] > maxSame[c]) maxSame[c] = cnt[c]; });
    });
    CUBE_COLS.forEach(function (c) {
      if (S.cures[c]) return;
      var need = 5 - maxSame[c];
      if (maxSame[c] >= 3) h.push('💊 ' + colZh(c) + '色解藥進度：某人已握 ' + maxSame[c] + ' 張，差 ' + Math.max(0, need) + ' 張（科學家 -1）。');
    });
    if (danger.length) h.push('⚠️ 已 3 方塊(再感染就爆發)：' + danger.slice(0, 6).join('、') + (danger.length > 6 ? ' 等' : ''));
    var hot = CUBE_COLS.filter(function (c) { return !S.cures[c]; }).sort(function (a, b) { return onBoard[b] - onBoard[a]; })[0];
    if (hot && onBoard[hot] >= 10) h.push('🔥 ' + colZh(hot) + '色場上方塊最多(' + onBoard[hot] + ')，注意連鎖爆發。');
    h.push('📈 感染率 ' + INFECT_RATE[S.rateIdx] + '／回合，爆發 ' + S.outbreaks + '/8，玩家牌庫剩 ' + S.playerDeck.length + ' 張。');
    if (S.outbreaks >= 5) h.push('🚨 爆發已達 ' + S.outbreaks + '/8，接近落敗，優先治療高危城市！');
    return h;
  }
  function colZh(c) { return { blue: '藍', yellow: '黃', black: '黑', red: '紅' }[c]; }

  window.__pandemic = {
    CITY: CITY, CITIES: CITIES, ROLES: ROLES, COLORS: COLORS, EVENTS: EVENTS,
    roleName: roleName, roleColor: roleColor, roleAbil: roleAbil, layout: layout,
    setup: setup, state: function () { return S; }, load: load, save: save, clearSave: clearSave,
    actMoveDrive: wrapUndo(actMoveDrive), actDirectFlight: wrapUndo(actDirectFlight), actCharter: wrapUndo(actCharter),
    actShuttle: wrapUndo(actShuttle), actRendezvous: wrapUndo(actRendezvous), actOpsMove: wrapUndo(actOpsMove),
    actBuild: wrapUndo(actBuild), actTreat: wrapUndo(actTreat), actShare: wrapUndo(actShare), actCure: wrapUndo(actCure),
    playEvent: wrapUndo(playEvent), endActions: endActions, discardCard: discardCard,
    undoAction: undoAction, canUndo: canUndo, computeHints: computeHints,
    resolveEpidemic: resolveEpidemic, infectStep: infectStep, placeCube: placeCube, allCubesGone: allCubesGone,
    setOnChange: function (f) { onChange = f; },
    _internal: { computePositions: computePositions, buildHexField: buildHexField }
  };
})();
