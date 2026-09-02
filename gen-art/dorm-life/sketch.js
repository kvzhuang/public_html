// ==========================================
// Dorm Life 宿舍人生 — Gather Town 風自動人生模擬
// 六位角色（三男三女）住大學宿舍：各自寢室＋衛浴，共用客廳／廚房／書房
//   上課、用餐、讀書、睡覺、社交對話（對話記錄）
// 確定性世界：一切為「伺服器時間 + 當日種子」的純函數
//   → 所有訪客看到相同角色位置、行程與對話（PHP time.php 提供標準時鐘）
// ==========================================

const TILE = 16, MAPW = 40, MAPH = 28;      // 建築內部網格（sim 座標）
const OX = 6, OY = 5;                        // 戶外庭院邊界（tiles）
const FW = MAPW + OX * 2, FH = MAPH + OY * 2;
const BOX = OX * TILE, BOY = OY * TILE;      // 建築像素偏移
const CW = FW * TILE, CH = FH * TILE;        // 畫布含庭院
const DAY_SCALE = 240;          // 1 真實秒 = 240 模擬秒 → 一天約 6 分鐘
const DAY_SEC = 86400;

// ── 確定性 RNG ──
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(...parts) { return mulberry32(hashStr(parts.join('|'))); }
function pickR(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// ── 角色（含人設）──
// persona: gamer 電競宅 / athlete 運動咖 / foodie 廚神吃貨 / bookworm 文青書蟲 / social 社交花 / artist 音樂藝術
const CHARS = [
  { name: '子軒', g: 'm', body: '#4a7ac0', hair: '#2a2620', skin: '#e8c8a0', persona: 'gamer',    tag: '電競宅', wake: 0.6, sleepLate: 0.8 },
  { name: '大維', g: 'm', body: '#3aa06a', hair: '#1a1814', skin: '#d8b088', persona: 'athlete',  tag: '運動咖', wake: -1.2, sleepLate: -0.8 },
  { name: '阿哲', g: 'm', body: '#c07a3a', hair: '#3a2a1a', skin: '#e8c8a0', persona: 'foodie',   tag: '廚神吃貨', wake: -0.3, sleepLate: 0.2 },
  { name: '小雨', g: 'f', body: '#d85a8a', hair: '#4a2a30', skin: '#f0d0b0', persona: 'bookworm', tag: '文青書蟲', wake: 0.2, sleepLate: 0.4 },
  { name: '佳穎', g: 'f', body: '#9a6ad0', hair: '#2a1a24', skin: '#e8c8a0', persona: 'social',   tag: '社交花', wake: 0.3, sleepLate: 0.6 },
  { name: '思妤', g: 'f', body: '#d0a83a', hair: '#5a3020', skin: '#f0d0b0', persona: 'artist',   tag: '音樂藝術', wake: 0.7, sleepLate: 0.7 },
];

// 人設描述（點擊人像時顯示）
const PERSONA_DESC = {
  gamer:    { title: '電競宅', desc: '沉迷電競與寫程式的夜貓子，嘴上說「再一場」其實已經第五場。房間有電競桌與海報。', traits: ['熬夜', '手速快', '團戰狂'] },
  athlete:  { title: '運動咖', desc: '陽光型運動狂，早睡早起，相信流汗能解決一切煩惱。房裡擺著啞鈴與獎盃。', traits: ['早起', '健身', '晨跑'] },
  foodie:   { title: '廚神吃貨', desc: '宿舍裡的廚神兼冰箱守護者，人生大事就是下一餐吃什麼。房間藏著小冰箱與鍋具。', traits: ['會煮', '揪吃', '愛宵夜'] },
  bookworm: { title: '文青書蟲', desc: '安靜的文青，隨身帶著書與詩，偏愛雨天與咖啡香。床邊總堆著看不完的書。', traits: ['愛讀', '寫詩', '安靜'] },
  social:   { title: '社交花', desc: '宿舍的社交中心，八卦與揪團的發起人，限動更新從不間斷。房裡有化妝鏡與拍立得。', traits: ['健談', '揪團', '追劇'] },
  artist:   { title: '音樂藝術', desc: '音樂與繪畫的靈魂，夜裡最有創作慾，看什麼都想畫下來。房內有畫架與吉他。', traits: ['彈唱', '畫畫', '慵懶'] },
};

// ── 世界（房間、牆、定位點）建構 ──
// 格局：上排六寢室（不含衛浴）→ 走廊 → 底層四區：客廳｜共用衛浴（3廁所＋2淋浴，輪流使用）｜廚房餐廳｜書房
let blocked, rooms, spot;
function buildWorld() {
  blocked = Array.from({ length: MAPH }, () => new Array(MAPW).fill(0));
  rooms = [];
  spot = { bed: [], toilet: [], shower: [], desk: [], dine: [], sofa: [], sink: [], kitchen: null, tv: null, exit: null, wait: null };

  const wallRect = (x0, y0, x1, y1, doors) => {
    for (let x = x0; x <= x1; x++) { setW(x, y0); setW(x, y1); }
    for (let y = y0; y <= y1; y++) { setW(x0, y); setW(x1, y); }
    (doors || []).forEach(d => { blocked[d.y][d.x] = 0; });
  };
  const setW = (x, y) => { if (y >= 0 && y < MAPH && x >= 0 && x < MAPW) blocked[y][x] = 1; };

  // 外牆
  wallRect(0, 0, MAPW - 1, MAPH - 1, []);

  // 六間寢室（上排）；不再含私人衛浴，空間留給床＋書桌＋個人裝飾
  for (let i = 0; i < 6; i++) {
    const x0 = 1 + i * 6, x1 = x0 + 5, y0 = 1, y1 = 8;
    wallRect(x0, y0, x1, y1, [{ x: x0 + 2, y: y1 }]);
    rooms.push({ x0, y0, x1, y1, type: 'bed', label: CHARS[i].name });
    spot.bed.push({ x: x0 + 1, y: y0 + 2, fx: x0 + 1, fy: y0 + 1 });
  }

  // 走廊 y=9..10
  rooms.push({ x0: 1, y0: 9, x1: MAPW - 2, y1: 10, type: 'hall' });

  const Y0 = 11, Y1 = MAPH - 2;   // 底層房間上下邊

  // 客廳（左 x1..10）；門開在 x7（避開電視櫃 x3.4-6.8 與書架 x8.6）
  wallRect(1, Y0, 10, Y1, [{ x: 7, y: Y0 }]);
  rooms.push({ x0: 1, y0: Y0, x1: 10, y1: Y1, type: 'living', label: '客廳' });
  spot.tv = { x: 5, y: 13 };
  spot.sofa = [{ x: 3, y: 22, fx: 3, fy: 21 }, { x: 5, y: 22, fx: 5, fy: 21 }, { x: 7, y: 22, fx: 7, fy: 21 }, { x: 9, y: 22, fx: 9, fy: 21 }];

  // 共用衛浴（x11..18）：3 間廁所（上）＋2 間淋浴（下）＋洗手台（中）；門開在 x15（避開馬桶）
  wallRect(11, Y0, 18, Y1, [{ x: 15, y: Y0 }]);
  rooms.push({ x0: 11, y0: Y0, x1: 18, y1: Y1, type: 'bath', label: '衛浴' });
  spot.toilet = [{ x: 12, y: 13, fx: 12, fy: 14 }, { x: 14, y: 13, fx: 14, fy: 14 }, { x: 16, y: 13, fx: 16, fy: 14 }];
  spot.shower = [{ x: 13, y: 22, fx: 13, fy: 23 }, { x: 16, y: 22, fx: 16, fy: 23 }];
  spot.sink = [{ x: 12, y: 17 }, { x: 14, y: 17 }, { x: 16, y: 17 }];
  spot.wait = { x: 15, y: 19, fx: 15, fy: 19 };   // 排隊等候點（中央走道）

  // 廚房＋餐廳（x19..28）；門與出口都在 x20，留出 x20-21 直通走道，家具靠右 x22+
  wallRect(19, Y0, 28, Y1, [{ x: 20, y: Y0 }]);
  rooms.push({ x0: 19, y0: Y0, x1: 28, y1: Y1, type: 'kitchen', label: '廚房餐廳' });
  spot.kitchen = { x: 22, y: 14, fx: 22, fy: 15 };
  const dseats = [[22, 18], [24, 18], [26, 18], [22, 22], [24, 22], [26, 22]];
  dseats.forEach(([x, y]) => spot.dine.push({ x, y, fx: x, fy: y }));

  // 書房（右 x29..38）；門開在 x33（書架在此留缺口）
  wallRect(29, Y0, 38, Y1, [{ x: 33, y: Y0 }]);
  rooms.push({ x0: 29, y0: Y0, x1: 38, y1: Y1, type: 'study', label: '書房' });
  const desks = [[31, 14], [35, 14], [31, 18], [35, 18], [31, 22], [35, 22]];
  desks.forEach(([x, y]) => spot.desk.push({ x, y, fx: x, fy: y + 1 }));

  // 大門：廚房底牆開口通往庭院（對齊戶外中線引道 x20）
  blocked[MAPH - 2][20] = 0;
  blocked[MAPH - 1][20] = 0;
  spot.exit = { x: 20, y: MAPH - 2, fx: 20, fy: MAPH - 2 };
}

// ── BFS 路徑 ──
function bfs(sx, sy, tx, ty) {
  sx = Math.round(sx); sy = Math.round(sy); tx = Math.round(tx); ty = Math.round(ty);
  if (sx === tx && sy === ty) return [{ x: sx, y: sy }];
  const key = (x, y) => y * MAPW + x;
  const prev = new Map(); const q = [[sx, sy]]; prev.set(key(sx, sy), -1);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    if (x === tx && y === ty) break;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= MAPW || ny < 0 || ny >= MAPH) continue;
      if (blocked[ny][nx]) continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      prev.set(k, key(x, y)); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return [{ x: sx, y: sy }, { x: tx, y: ty }];
  const path = []; let cur = key(tx, ty);
  while (cur !== -1) { path.push({ x: cur % MAPW, y: Math.floor(cur / MAPW) }); cur = prev.get(cur); }
  path.reverse(); return path;
}

// ── 共用衛浴排程：3 馬桶＋2 淋浴，一次一人 → 依抵達時間排隊、輪流使用（確定性）──
let sanCache = {};
function sanitationSlots(day) {
  if (sanCache.day === day) return sanCache.res;
  const NT = spot.toilet.length, NS = spot.shower.length;
  const T_DUR = 0.35, S_DUR = 0.55;            // 佔用時間（sim 小時）
  const want = [];
  for (let ci = 0; ci < 6; ci++) {
    const c = CHARS[ci], rng = seeded('san', day, ci);
    want.push({ ci, mt: 6.9 + c.wake + (rng() - 0.5) * 0.4, shower: rng() < 0.8, nt: 22.5 + c.sleepLate + (rng() - 0.5) * 0.4 });
  }
  const res = {}; for (let ci = 0; ci < 6; ci++) res[ci] = {};
  const earliest = (arr) => { let k = 0; for (let i = 1; i < arr.length; i++) if (arr[i] < arr[k]) k = i; return k; };
  // 早晨：先馬桶，(多數)再淋浴 → 各設施最早可用者接客，晚到就排隊
  const tf = new Array(NT).fill(-99), sf = new Array(NS).fill(-99);
  want.slice().sort((a, b) => a.mt - b.mt).forEach(w => {
    const st = earliest(tf), start = Math.max(w.mt, tf[st]);
    tf[st] = start + T_DUR;
    res[w.ci].tStall = st; res[w.ci].tStart = start; res[w.ci].tEnd = start + T_DUR;
    if (w.shower) {
      const ss = earliest(sf), s0 = Math.max(res[w.ci].tEnd, sf[ss]);
      sf[ss] = s0 + S_DUR;
      res[w.ci].sStall = ss; res[w.ci].sStart = s0; res[w.ci].sEnd = s0 + S_DUR;
    }
  });
  // 睡前：馬桶輪流
  const nf = new Array(NT).fill(-99);
  want.slice().sort((a, b) => a.nt - b.nt).forEach(w => {
    const st = earliest(nf), start = Math.max(w.nt, nf[st]);
    nf[st] = start + T_DUR;
    res[w.ci].ntStall = st; res[w.ci].ntStart = start;
  });
  sanCache = { day, res };
  return res;
}

// ── 每日行程（每角色 sim-hour 段落）──
// 依人設有不同的生活節奏；OUT(...) 表示外出（上課／健身／聚會等，離開宿舍）
function scheduleFor(day, ci) {
  const rng = seeded('sched', day, ci);
  const j = () => (rng() - 0.5) * 0.5;   // 個人時間微差
  const c = CHARS[ci];
  const w = c.wake, sl = c.sleepLate;    // 人設偏移：運動咖早起、電競宅晚睡
  const p = c.persona;
  const OUT = (act) => ({ out: true, act });
  const bed = spot.bed[ci], dine = spot.dine[ci],
        desk = spot.desk[ci], sofa = spot.sofa[ci % 4], kitchen = spot.kitchen;
  const san = sanitationSlots(day)[ci];
  const home = { gamer: desk, athlete: sofa, foodie: kitchen, bookworm: desk, social: sofa, artist: desk }[p];

  // 是否賴床（夜貓子常睡到中午）
  const sleepIn = (p === 'gamer' && rng() < 0.5) || (p === 'artist' && rng() < 0.25);

  // 各時段去向：OUT(...) 代表外出（只離開一小段就回家），否則待在室內定點
  let morning, afternoon, eve1, eve2;
  if (p === 'gamer') {
    morning = desk; afternoon = rng() < 0.4 ? OUT('上課') : desk; eve1 = sofa; eve2 = desk;
  } else if (p === 'athlete') {
    morning = OUT('上課'); afternoon = desk; eve1 = OUT('健身房'); eve2 = sofa;
  } else if (p === 'foodie') {
    morning = rng() < 0.35 ? OUT('買菜') : kitchen; afternoon = kitchen; eve1 = kitchen; eve2 = kitchen;
  } else if (p === 'bookworm') {
    morning = desk; afternoon = rng() < 0.45 ? OUT('上課') : desk; eve1 = desk; eve2 = desk;
  } else if (p === 'social') {
    morning = OUT('上課'); afternoon = sofa; eve1 = sofa; eve2 = rng() < 0.4 ? OUT('聚會') : sofa;
  } else {
    morning = desk; afternoon = rng() < 0.45 ? OUT('上課') : sofa; eve1 = sofa; eve2 = desk;
  }

  const seg = [{ h: 0.0, s: bed }];
  const block = (start, end, choice) => {
    if (choice && choice.out) {
      seg.push({ h: start + j(), s: choice });
      seg.push({ h: Math.min(end - 0.4, start + 1.6) + j(), s: home });
    } else {
      seg.push({ h: start + j(), s: choice || home });
    }
  };
  if (sleepIn) {                // 睡到中午 → 用中午空檔盥洗（此時多半沒人排隊）
    seg.push({ h: 11.2, s: spot.toilet[ci % spot.toilet.length] });
    seg.push({ h: 11.7, s: dine });
  } else {
    // 盥洗：依排程去指定的馬桶／淋浴（輪流），完成後吃早餐
    seg.push({ h: san.tStart, s: spot.toilet[san.tStall] });
    let done = san.tEnd;
    if (san.sStall != null) { seg.push({ h: san.sStart, s: spot.shower[san.sStall] }); done = san.sEnd; }
    const bfast = Math.min(8.4, Math.max(7.7 + w, done + 0.1));
    seg.push({ h: bfast, s: dine });               // 早餐
    block(8.7, 11.9, morning);                      // 上午
    seg.push({ h: 12.0 + j(), s: dine });           // 午餐
  }
  block(13.3, 17.0, afternoon);                     // 下午
  block(17.2, 18.8, eve1);                          // 傍晚
  seg.push({ h: 19.0 + j(), s: dine });             // 晚餐
  block(20.3, 22.4, eve2);                          // 夜間活動
  seg.push({ h: san.ntStart, s: spot.toilet[san.ntStall] });   // 睡前如廁（輪流）
  seg.push({ h: Math.max(san.ntStart + 0.4, 23.1 + sl), s: bed });
  seg.sort((a, b) => a.h - b.h);                    // 保險：確保時間單調遞增
  return seg;
}

// 路徑快取：pathCache[day][ci][segIndex]
let pathCache = {};
function pathsForDay(day) {
  if (pathCache[day]) return pathCache[day];
  const all = [];
  for (let ci = 0; ci < 6; ci++) {
    const seg = scheduleFor(day, ci);
    const paths = [];
    const xy = s => (s && s.out) ? spot.exit : s;   // 外出者的實體座標＝大門
    for (let i = 0; i < seg.length; i++) {
      const from = xy(i === 0 ? seg[seg.length - 1].s : seg[i - 1].s);
      const to = xy(seg[i].s);
      paths.push(bfs(from.fx ?? from.x, from.fy ?? from.y, to.fx ?? to.x, to.fy ?? to.y));
    }
    all.push({ seg, paths });
  }
  pathCache = { [day]: all };   // 只留當天
  return all;
}

const TRAVEL = 150;   // 移動耗時（模擬秒）
function positionAt(day, ci, secOfDay) {
  const { seg, paths } = pathsForDay(day)[ci];
  const hf = secOfDay / 3600;
  let i = 0;
  for (let k = 0; k < seg.length; k++) if (seg[k].h <= hf) i = k;
  const segStartSec = seg[i].h * 3600;
  const dt = secOfDay - segStartSec;
  const path = paths[i];
  const dest = seg[i].s;
  const isOut = !!(dest && dest.out);
  const target = isOut ? spot.exit : dest;      // 外出者走到大門
  const fx = target.fx ?? target.x, fy = target.fy ?? target.y;
  if (dt >= TRAVEL || path.length < 2) {
    // 抵達後：外出者離開宿舍（out=true → 不繪製）；其餘靜止定點
    return isOut ? { x: fx, y: fy, dir: 0, moving: false, out: true, act: dest.act }
                 : { x: fx, y: fy, dir: 0, moving: false };
  }
  // 沿路徑內插（外出者此時正走向大門，仍會被繪製）
  const frac = dt / TRAVEL, fp = frac * (path.length - 1);
  const a = path[Math.floor(fp)], b = path[Math.min(path.length - 1, Math.floor(fp) + 1)];
  const t = fp - Math.floor(fp);
  const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
  let dir = 0;
  if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) dir = b.x > a.x ? 1 : 3; else dir = b.y > a.y ? 0 : 2;
  return { x, y, dir, moving: true, act: isOut ? dest.act : undefined };
}

// ── 對話（確定性事件，含人設專屬台詞）──
// 共用台詞（大家都可能講）— 擴充版
const DLG = {
  meal: ['今天輪到誰洗碗','冰箱那杯優格是誰的？','幫我留一點湯','鹽在哪裡啊','吃太飽了走不動','多喝點水啦','這個好好吃','等我一下馬上來','誰要幫忙擺碗筷','外面那攤要不要一起買','醬油沒了誰去買','這味道也太香','慢慢吃不要噎到','餐廳今天人好多','我這份給你吃一口','飯有點不夠了','熱湯小心燙','吃完換我洗','誰把最後一塊雞排吃了','這辣度剛剛好','再幫我盛半碗','筷子好像少一雙','桌上那盤還有人要嗎','今天菜色不錯欸','飯鍋還有嗎','湯匙拿給我一下','吃飽再讀書比較有力','這道有點鹹','冰箱的飲料喝一半是誰','紙巾用完了','要不要加點辣','我先開動囉','剩這些打包起來','蛋煎得剛好','碗我先泡水','誰要一起叫下午茶','這家便當份量好大','吃太快會胃痛喔','幫我夾那個','今天誰請客啊','鍋子我等下刷','醬料在冰箱門邊','熱一下再吃比較好','這口感絕了','留一點給還沒回來的','水果要不要切一切','飯粒黏在鍋底了','再一碗就好','桌子擦一下','我不太餓少盛點','這搭配意外地讚','吃完記得關瓦斯','誰的湯還沒喝','今天份量剛好'],
  study: ['這題怎麼解啊','借我看一下你的筆記','圖書館快關了','報告分工一下吧','明天要小考欸','這章有夠難','進度整個落後','老師講義放哪','要不要一起讀','我先去印資料','咖啡再一杯','截止日是禮拜幾','這公式我背不起來','分組名單出來了嗎','幫我看這段對不對','讀不下去了休息一下','參考書借我','報告格式要照規定喔','這門課點名超嚴','小組報告誰負責前言','我筆記借你拍','考古題有人有嗎','這老師講超快','投影片下載了沒','明天八點的課好痛苦','這段公式我卡住','圖書館三樓比較安靜','咖啡因救我一命','進度表拉一下','這作業要交紙本嗎','參考文獻格式好煩','我先去借書','報告口頭還是書面','這章跳過應該沒差吧','期中快到了緊張','幫我看看這句翻譯','讀書計畫又崩了','這題答案是 B 吧','老師信箱是哪個','分數怎麼算的','要不要組讀書會','我先預習明天的','這本原文書好厚','劃重點劃到手痠','等等一起去上課','教室改到哪間了','這概念我懂了','借我一張計算紙','早八根本反人類','報告我先做我那部分','這科好像會被當','午休先睡一下再讀','網路課程還沒補','筆記整理完分你'],
  social: ['週末有人要回家嗎','冷氣好像又怪怪的','要不要一起訂手搖','客廳燈壞了要報修','剛剛樓下超吵','大家最近好嗎','熱水器又壞了','誰的包裹到了','wifi 是不是變慢','要不要一起追劇','宿舍網速好卡','這週大掃除排一下','門口鞋子太多了','有人要拼團嗎','電費帳單來了','明天記得倒垃圾','冰箱清一清吧','週末要不要出去走走','週末天氣好像不錯','要不要揪火鍋','樓下那家新開的','包裹放在櫃檯喔','群組訊息看一下','這週輪誰掃廁所','陽台的衣服收了嗎','有人的鬧鐘一直響','插座不夠用了','要不要團購衛生紙','冷氣濾網該洗了','隔壁在辦趴好吵','公共區域燈壞了','誰腳踏車擋門口','週末要不要打掃','飲水機沒水了','電視遙控器咧','有人養的植物要澆水','門禁卡又忘了帶','宿網又斷線了','垃圾車幾點來','走廊燈一直閃','要不要一起看電影','這箱回收誰的','假日有人留宿嗎','洗衣機可以用了嗎','熱水要等一下才熱','大掃除訂禮拜六','有人要一起追新番嗎','公佈欄有新公告','鑰匙有人看到嗎','週末回家的舉手','冰箱貼了誰的便條','要不要辦個交換禮物','樓上裝潢好吵','網購的到了沒'],
  night: ['你怎麼還沒睡','小聲一點啦','明天幾點的課','晚安～','燈幫我關一下','我先躺了','記得鎖門','窗戶關了嗎','手機拿去充','別聊太晚','明天見','早點休息','鬧鐘設好了嗎','水喝一下再睡','今天好累先睡了','明天別叫我起床','燈關了喔','手機調靜音','棉被要蓋好','外面在下雨欸','走廊安靜一點','我明天沒課爽','夜衝要不要','失眠睡不著','喝杯熱牛奶再睡','明天記得帶傘','窗簾拉一下','冷氣定時了嗎','刷牙去囉','明早誰負責買早餐','再滑一下手機就睡','夢到記得跟我說','門有沒有反鎖','插頭拔一下','枕頭好舒服','明天加油','早點睡別當熊貓','宵夜的味道好香','誰還在客廳','電腦幫我關','明天見啦','安安睡了'],
};
// 人設專屬台詞（更能表現個性）— 每情境擴充約 3 倍
const PDLG = {
  gamer: {   // 子軒 電競宅
    meal: ['邊吃邊看攻略順便啦','外送到了幫我拿一下','這餐配影片剛好','吃快一點等等要開排','手把先放旁邊吃','泡麵是宵夜之王','手殘了先補血包（喝水）','便當我叫好了','先存個檔再吃','這局結束就吃','鍵盤別沾到油','吃完馬上回歸','宵夜配直播剛好','能量飲代替湯','外送 App 又推播','手機邊充邊吃','一手滑鼠一手筷子','速食最省時間','吃飯也要開著遊戲','等下有比賽轉播','泡麵加蛋才完整','薯條分我幾根','邊吃邊看電競賽事','吃飽血條回滿'],
    study: ['報告等等啦我這場先打完','熬夜寫程式其實蠻爽的','這 bug 卡我三小時了','編譯過了爽','版本控制不要亂 push','這演算法有夠繞','我 debug 到懷疑人生','截圖存一下等下研究','這需求單看不懂','git 又衝突了','編譯要三分鐘好久','演算法作業好硬','我在寫外掛不是分心','報告用 markdown 排','熬夜效率其實不錯','這 API 文件有夠爛','等我跑完測試','資料結構好抽象','程式跑不動先重開','stackoverflow 救我','變數命名好難','明天 demo 先睡個覺','這 bug 是環境問題啦','commit 訊息亂打'],
    social: ['等下要不要來一場？','我天梯又上分了欸','新版本改動有夠爛','誰要一起打副本','這隻角色被砍好慘','開黑語音開一下','週末通宵團一波','我電腦顯卡想升級','電競椅坐起來真的差很多','新遊戲首發要一起衝','伺服器維修中好無聊','我抽到 SSR 了','段位掉下去了','這隊友雷到爆','語音頻道進來','週末排位衝一波','顯示卡降價沒','手把要不要團購','電競賽事開打了','我這帳號練好久','外設想換新的','網咖包夜要不要','這版本英雄好強','抽卡歐氣爆發','直播主超好笑','排到高端局緊張','鍵盤軸體你喜歡哪種'],
    night: ['再一場就睡，真的','凌晨團戰最刺激','等等這波很關鍵先不睡','贏這場就關機','肝到三點是基本','排到隊了先不睡','明天的課先當備用','這波打完真的睡','日出前一定睡','排位掉分心情差','再刷一場副本','肝到天亮明天補眠','語音掛著別吵我','等隊友上線先不睡','存檔完就關機','明天中午再起床','夜深手速反而快','這關 boss 差一點','雙倍經驗不能睡','明天課翹一節補眠','關機前再看個攻略'],
  },
  athlete: {  // 大維 運動咖
    meal: ['我要多一份蛋白質','雞胸肉吃起來','早餐一定要吃飽','乳清泡好了','碳水要抓好','這餐熱量剛好','多吃點才有肌肉','水要喝夠兩千毫升','今天加練所以多吃','蛋白粉別忘了','燕麥是早餐首選','增肌就是要吃','香蕉補鉀很重要','水煮餐雖然無聊但健康','賽前要控醣','這份熱量我算過','多一份地瓜','蛋白質先吃','訓練後半小時進食最好','少油少鹽才行','喝無糖的','便當我加點菜','宵夜對身體不好','補給品放我這'],
    study: ['讀一下就去健身房','坐太久腰痠','念完書去跑個五公里','站著讀比較不會睡','讀書也要動一動','拉筋一下再繼續','等等去操場跑步','讀完這章去操場','久坐要起來動動','邊背書邊深蹲','站著讀比較清醒','番茄鐘配拉筋','讀累了做組伏地挺身','明天有體育課','報告寫完去跑步','大腦也需要有氧','讀書配運動最讚','等等去游泳放鬆','核心訓練不能停','考完試去爬山','念書姿勢要正確'],
    social: ['早上六點要不要晨跑','週末揪打籃球啦','我核心又進步了','多動一動精神會好','一起去健身房啦','深蹲重量又加了','報名了路跑要不要','打球缺一個','拉單槓比賽誰要來','晨跑五點半集合','球場我約好了','系上要辦運動會','一起報名馬拉松','健身房辦卡有優惠','今天練胸要不要來','重訓菜單我排好了','打球記得帶護具','週末爬山揪一波','游泳池開放了','拉筋伸展一起做','我 PR 又破了','要不要比賽伏地挺身','球隊缺人快來','慢跑河濱好舒服','飛盤要不要玩','有氧課超累但爽','運動完喝乳清'],
    night: ['我先睡了明天要早起','早睡早起身體好','別熬夜傷身啦','睡飽才長肌肉','明天晨操見','拉個筋就睡','早睡才有好體能','明天晨跑別遲到','拉筋完泡個熱水澡','睡眠也是訓練一環','鬧鐘設五點半','肌肉要休息才長','明天練腿好期待','睡前放鬆一下','別熬夜代謝會差','早點睡明天有球賽','喝點溫水就寢','護膝記得放門口'],
  },
  foodie: {   // 阿哲 廚神吃貨
    meal: ['我今天燉了湯要不要喝','火候要抓好才嫩','這醬是我自己調的','宵夜煮個麵？','試吃一下鹹淡','這食譜我改良過','擺盤也是一種尊重','剩菜我來做成炒飯','高湯熬了三小時','這鍋我燉了兩小時','醬汁是靈魂','刀工練好久了','食材新鮮最重要','擺盤再撒點蔥花','火侯差一點就焦','這配色我很滿意','嘗一口給點意見','鹽再一點點','收汁收得剛好','這食譜是阿嬤傳的','高湯要慢慢熬','甜點烤箱顧一下','剩飯做成粥','醃了一晚更入味','蒜爆香整間都香','這刀我保養很勤','明天試新菜色'],
    study: ['念完書來做甜點','邊吃邊念比較有動力','我在查食譜不是分心','讀累了來塊蛋糕','筆記寫得像菜單','讀書配下午茶最搭','筆記畫成食物圖','念完犒賞自己一餐','邊燉湯邊背書','食品科學好有趣','營養學筆記記滿','讀累了泡壺茶','明天報告主題是美食','查資料查到菜譜','書桌上放零食才有動力'],
    social: ['發現一家超好吃的欸','週末我下廚請大家','冰箱該補貨了','要不要團購食材','那家排隊很久但值得','夜市美食地圖我有','來辦火鍋趴啦','我想開一間小店','這季節就要吃鍋','發現隱藏版小吃','週末辦桌請大家','食材團購揪一下','那家甜點必吃','夜市我熟門熟路','冰箱補貨清單列好','火鍋趴這週辦','我想擺攤試水溫','季節限定要快吃','排隊名店我陪你','手搖第二杯半價','宵夜攤老闆認識我','美食社團推爆','來我房間吃甜點','試吃團缺人嗎','這醬料好搭','週末市場逛一圈','便當菜色我來配'],
    night: ['餓了想煮宵夜','明天早餐我來弄','消夜配劇最讚','半夜的泡麵最香','明天做鬆餅','冰箱還有布丁誰要','宵夜煮個餛飩麵','明天早餐做蛋餅','半夜嘴饞怎麼辦','冰箱那塊蛋糕留給我','熱可可助眠','明天燉個湯','消夜熱量先不管','鬆餅粉還有嗎','夜市買的滷味分你','半夜廚房別太吵','明早煎培根','睡前一杯牛奶'],
  },
  bookworm: {  // 小雨 文青書蟲
    meal: ['我配著書慢慢吃','安靜吃飯也很好','今天食堂好吵','邊吃邊想剛看的情節','喝湯配散文剛好','配著詩集吃最愜意','安靜的餐桌真好','這湯讓我想起故事情節','邊吃邊寫讀後感','食物也有它的文學','慢食才嚐得出味道','今天帶了本新書','喝茶配散文','用餐也是種儀式','吃完想去圖書館'],
    study: ['這本小說比課本好看','剛寫了一首詩','圖書館是我的主場','借你這本，很讚','做筆記是種享受','這段落寫得真好','我在抄佳句','手寫比較有溫度','安靜才讀得進去','這句翻譯好美','書籤夾到哪了','冷門書更有味道','抄書法讓我靜心','這作者文筆真好','讀到入迷忘了時間','借閱清單又變長','詩集比課本療癒','手帳寫滿心得','安靜角落最適合','這段落想背下來','鋼筆寫字最舒服','讀書會選這本好嗎','圖書館的味道好安心','劃線太多整頁都是','讀完想寫篇心得','絕版書終於借到','邊聽古典樂邊讀'],
    social: ['最近在讀村上春樹','有人想去逛書店嗎','咖啡廳寫稿最療癒','雨天適合看書','二手書店挖到寶','這句話好戳我','週末去圖書館坐一天','想辦個讀書會','借閱期限快到了','新書分享會要去嗎','書店咖啡廳好療癒','推薦你這本散文','讀書會地點訂哪','二手書市集擺攤','這句話想抄下來給你','雨天最適合窩著讀','文學獎公布了','詩社招新看看','借書證借你用','週末圖書館見','手寫明信片給你','獨立書店快倒了好可惜','電子書還是紙本好','這作者要來簽書','借閱排隊好久','安靜咖啡廳推薦','讀劇本也很有趣'],
    night: ['再看一章就睡','夜深了字特別有味道','晚安，好夢','睡前讀點詩','檯燈下最安心','日記寫完就睡','讀到欲罷不能','夜燈下字句更溫柔','睡前寫一頁日記','這章結局太揪心','安靜的夜屬於書','再一頁就好','檯燈調暗一點','夢裡想繼續讀','詩讀完才睡得著','明天還書別忘','枕邊放本書安心','夜深了輕聲點'],
  },
  social: {   // 佳穎 社交花
    meal: ['欸欸跟你們說個八卦','這家我 IG 有拍','一起吃比較香啦','幫我拍一張美食照','聽說隔壁棟有活動','分你一半來嘗嘗','這家我拍給你看','聚餐地點我訂好','邊吃邊聊最開心','美食照先拍再吃','分你一口這超好吃','限動發了記得看','聚會名單我統計','這攤是網紅推薦','拍個合照啦','點餐我來就好','這家氣氛超好','要不要續攤'],
    study: ['讀書會要不要辦','誰陪我去圖書館','邊念邊聊才不無聊','借我筆記人最好','一起念比較有動力','等等揪人去咖啡廳念','一起念比較有動力喔','咖啡廳讀書揪一下','筆記共享給大家','讀書會我來揪','邊念邊八卦','借我抄一下重點','小組討論來我房間','念累了聊個天','考前衝刺一起','誰要當讀書夥伴','線上一起自習','幫大家買咖啡'],
    social: ['週末揪團出去玩啦','那部劇我追完了超好哭','你們有看到那則限動嗎','來辦個宿舍聚餐','系上要辦聯誼欸','這週生日壽星是誰','我約好餐廳了','拍團體照啦','要不要一起報名活動','聽說那對在一起了','系上聯誼報名了','這週生日趴誰來','限動追蹤一下','那對是不是曖昧','拍團體照排位置','週末出遊路線我排','新開的店要去嗎','八卦聽我娓娓道來','社團成發要看','約好周末唱歌','這梗你看了沒','大家感情要維繫','聚餐我訂七點','誰單身舉手','限動互相按讚','出去玩分帳用 App','班遊地點投票','拍照濾鏡我有','跨年要一起嗎','群組再拉個人進來'],
    night: ['聊到欲罷不能欸','晚安啦愛你們','明天約幾點','限動再滑一下','跟你們聊天好開心','明天記得起床','聊到不想睡','晚安愛你們喔','明天約幾點集合','再滑一下限動','今天超開心的','明天記得起床啦','睡前八卦一則','group call 一下','夜聊時間到','別熬夜會爆痘','明天見寶貝們','關燈囉晚安'],
  },
  artist: {   // 思妤 音樂藝術
    meal: ['慢慢吃才有靈感','這擺盤好美我拍一下','邊哼歌邊吃','食物的顏色好療癒','配點音樂更好吃','這光線好適合拍照','食物顏色像調色盤','邊吃邊構圖','配爵士樂更好吃','擺盤本身就是藝術','慢慢品嘗有靈感','這餐想畫下來','聞香也是享受','餐桌的靜物好美','吃飽來創作'],
    study: ['我在畫畫不是發呆','這旋律卡在腦裡','靈感來了先記下來','手稿又畫滿一頁','和弦接不起來','邊聽歌邊念比較順','速寫一下窗外','旋律又卡住了','速寫本畫滿了','這和弦好難壓','靈感稍縱即逝','邊聽歌邊念最順','素描窗外的雲','手稿越畫越多','調色調到入迷','這段旋律哼給你聽','創作比作業有趣','水彩暈染好療癒','譜還沒寫完','光影變化好美','燈光暗一點有氣氛'],
    social: ['我寫了首新歌要聽嗎','週末去看展好不好','誰的吉他借我彈','光影好美想畫下來','最近迷上水彩','來合唱一首啦','美術館新展開了','幫我聽聽這段旋律','想拍一組底片','新歌 demo 想給你聽','聯展作品準備好沒','借我彈一下吉他','這展覽必看','水彩顏料缺色了','合唱團缺聲部','街頭表演要不要來','底片沖出來了','美術社招新','這攝影構圖絕了','畫室週末開放','樂團練團揪一下','速寫聚會來嗎','這旋律你覺得如何','展場燈光好講究','素描模特兒缺人','黑膠唱片借你聽','手作市集擺攤嗎'],
    night: ['夜晚最有創作慾','再彈一下就睡','安靜的深夜最舒服','月光下想畫畫','錄完這段就睡','戴耳機聽到天亮','夜裡靈感最多','再彈一首就睡','月光下想素描','錄音到深夜','戴耳機到天亮','安靜夜晚適合創作','這段旋律睡前完成','畫到手痠才停','夜色本身就是畫','明天靈感再繼續','關燈點蠟燭有氛圍','輕音樂助眠'],
  },
};
// 你來我往的回應 — 擴充版
const REPLY = ['真的假的','哈哈哈','對啊','我也是','蛤','+1','笑死','好喔','是喔😂','別鬧了','有道理','哦哦','了解','蛤真的嗎','讚啦','好啊好啊','認真？','傻眼','原來如此','我懂我懂','太扯了吧','可以喔','等我一下','再說啦','好想睡','欸不錯','真假啦','安可','算你厲害','不會吧','超正常','我就爛','聽起來讚','改天啦','包在我身上','沒問題','有夠可以','就決定是你了','笑死我了','蛤好啦','欸真的','是喔','哈哈對','超同意','有可能','說得也是','哇賽','天啊','沒差啦','隨便你','我不信','怎麼可能','太神啦','服了你','認同','好像也對','再想想','等等喔','沒問題啦','交給我','別這樣','算了啦','嗯嗯','喔喔懂','蛤怎樣','笑爛','太可愛','有點扯','我也想','好羨慕','慘了','加油好嗎','我先閃','等一下下','真的欸','就是說啊','哈哈哈哈','傻眼貓咪','無言','我也覺得','沒錯沒錯','超讚der','可以喔可以','要不要啦','好啦好啦','你贏了','別鬧啦','講得好','中肯','太狠了','蛤不要','沒力了','好想吃','等我五分鐘','絕了','笑死人','真假的啦','蛤好扯','okok','是在哈囉','沒在跟你開玩笑','秒懂','超快','我先睡','好誒好誒','再約','等下聊','有夠猛','太扯','嗯有道理','蛤好喔','哈哈可以','就這樣','別想太多','我懂啦','超好笑','認真的嗎','沒問題der','包在我','好想躺'];
function personaLine(ci, ctx, rng) {
  const pool = PDLG[CHARS[ci].persona][ctx] || [];
  const shared = DLG[ctx] || [];
  // 70% 說人設專屬、30% 說共用 → 有個性又不重複
  const use = (pool.length && rng() < 0.7) ? pool : shared;
  return pickR(rng, use.length ? use : shared);
}
// ── 使用者互動（本機即時層，不影響確定性世界）──
// 依輸入語意分類 → 相關人設角色優先回應，並附通用回應
const USER_INTENTS = [
  { keys: ['嗨','哈囉','哈嘍','你好','安安','嘿','喲','早安','午安','hi','hello','hey'],
    by: { gamer: ['喔嗨，等我打完這場','嗨，開個語音？'], social: ['嗨嗨！最近好嗎～','來啦來啦，坐坐'], athlete: ['嗨！要不要動一動'], foodie: ['來得剛好，要吃嗎'], bookworm: ['嗨…（小聲）','你好，來看書嗎'], artist: ['嗨～今天靈感不錯'] },
    any: ['嗨嗨～','哈囉！','欸你來啦','安安','喲，來坐','嗨，今天好嗎','歡迎歡迎','來啦來啦'] },
  { keys: ['掰','再見','拜拜','bye','先走','先閃','下次','走了'],
    any: ['掰掰～','下次再來喔','路上小心','再聊！','有空常來','慢走不送啦','記得再來玩'] },
  { keys: ['讚','厲害','很棒','好棒','加油','愛你','好可愛','佩服','你們好棒','喜歡你們','抱抱'],
    any: ['謝謝你～','嘿嘿被稱讚了','你人真好','我們也喜歡你！','害羞…','愛你喔','聽到好開心','互相互相啦'] },
  { keys: ['喜歡','告白','暗戀','戀愛','曖昧','女朋友','男朋友','單身','脫單','心動'],
    by: { social: ['欸這個我有興趣！說來聽聽','要不要幫你牽線～'] },
    any: ['喔喔戀愛的味道','加油我挺你','別緊張啦','祝你順利','青春真好','勇敢一點！'] },
  { keys: ['吃','餓','飯','宵夜','煮','菜','美食','好吃','便當','手搖','喝','零食','甜點','火鍋'],
    by: { foodie: ['餓了？我煮給你吃！','冰箱還有料，想吃什麼','正好在備料，一起？','宵夜我最拿手'], gamer: ['叫個外送一起吃啊'], social: ['揪團吃啦！我找餐廳'] },
    any: ['說到吃我就餓了','要不要一起去覓食','聽起來好好吃','宵夜是罪惡但快樂','等下一起吃吧','阿哲最懂吃'] },
  { keys: ['功課','報告','考試','讀書','作業','期中','期末','唸書','念書','筆記','上課','小考','複習'],
    by: { bookworm: ['這題我可以教你','借你我的筆記','一起去書房吧','安靜念最有效率'], gamer: ['報告？等我這場…好啦幫你'], athlete: ['念累了去動一動'], social: ['揪個讀書會啦'] },
    any: ['加油！快考試了','一起念比較有動力','別拖到最後一天','需要幫忙儘管說','小雨很會教喔'] },
  { keys: ['遊戲','電動','打怪','排位','天梯','副本','電競','gg','lol','steam','手遊','開黑'],
    by: { gamer: ['要一起來一場嗎！','我天梯剛上分欸','缺一個快進來','這版本超好玩'], social: ['我雖然不強但陪你玩'] },
    any: ['子軒最懂這個','聽起來很好玩','別玩太晚喔','贏了請喝手搖'] },
  { keys: ['運動','健身','跑步','球','籃球','重訓','深蹲','晨跑','游泳','肌肉','爬山','路跑'],
    by: { athlete: ['一起去運動啊！','晨跑六點集合喔','健身房走起','菜單我排給你'], foodie: ['運動完我煮蛋白餐'] },
    any: ['大維超愛這個','動一動精神好','我先暖身一下','改天一起運動'] },
  { keys: ['音樂','畫','歌','吉他','展','創作','水彩','旋律','唱','底片','樂團','素描','攝影'],
    by: { artist: ['我彈給你聽！','來看我的新畫','一起去看展嗎','這旋律你覺得如何'], social: ['一起去唱歌啦'] },
    any: ['思妤很有才華','聽起來好文青','改天分享一下','好有氣氛'] },
  { keys: ['天氣','下雨','晴','冷','熱','颱風','雲','太陽','溫度'],
    by: { bookworm: ['雨天最適合看書'], athlete: ['天氣好就該去跑步'] },
    any: ['今天天氣還不錯','下雨就待在宿舍','記得帶傘喔','這種天氣最想睡','冷的話多穿點'] },
  { keys: ['累','睏','睡','晚安','休息','好想躺','疲勞','睏了'],
    by: { gamer: ['我還能再撐一場'], athlete: ['早點睡對身體好'], bookworm: ['睡前讀點詩吧'] },
    any: ['辛苦了早點休息','去躺一下吧','晚安好夢','喝杯熱的再睡'] },
  { keys: ['出去','玩','聚會','八卦','約','週末','唱歌','逛街','旅行','出遊','聯誼'],
    by: { social: ['揪團！我來排行程','週末出去玩啦','八卦快說給我聽','算大家一份！'] },
    any: ['好耶去哪','找佳穎準沒錯','算我一個','聽起來好好玩'] },
  { keys: ['怎麼','如何','可以嗎','幫我','求助','問一下','哪裡','為什麼','?','？'],
    any: ['我看看能不能幫上忙','這個要問對人喔','你說說看','讓我想想','嗯…好問題'] },
];
const USER_FALLBACK = {
  by: { gamer: ['嗯…等我打完這場再想'], bookworm: ['（若有所思）嗯…'], social: ['欸這個可以聊！'], artist: ['聽起來很有畫面'], foodie: ['嗯嗯，先吃再說'], athlete: ['先動一動再聊！'] },
  any: ['喔喔這樣啊','哈哈有意思','原來如此','真的假的','我懂你意思','嗯嗯繼續說','有道理欸','是喔～','笑死','好特別的想法'],
};
function classifyIntent(text) {
  const t = text.toLowerCase();
  for (const intent of USER_INTENTS) if (intent.keys.some(k => t.includes(k))) return intent;
  return USER_FALLBACK;
}
function respondLine(ci, intent) {
  const per = CHARS[ci].persona;
  const pool = (intent.by && intent.by[per]) ? intent.by[per].concat(intent.any) : intent.any;
  return pool[Math.floor(Math.random() * pool.length)];
}
// 資安：輸入清理（長度上限、去控制字元/零寬字元、壓縮空白）
function sanitizeInput(s) {
  if (typeof s !== 'string') return '';
  s = s.replace(/[\x00-\x1F\x7F]/g, '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');   // 控制＋零寬字元
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 40) s = s.slice(0, 40);
  return s;
}
// 資安：輸出到 DOM 前一律 HTML escape，杜絕 XSS/標記注入
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// 使用者互動狀態（本機、短暫；不進入確定性世界，也不與他人同步）
let liveBubbles = [], userLog = [], userSay = null, lastUserSend = -1e9;
function addUserLog(ts, ci, text) { userLog.push({ ts, ci, text }); if (userLog.length > 30) userLog.shift(); }
function handleUserMessage(raw) {
  const now = performance.now();
  if (now - lastUserSend < 700) return { ok: false };        // 節流：防洗版
  const text = sanitizeInput(raw);
  if (!text) return { ok: false };
  lastUserSend = now;
  const { day, sec } = simTime();
  addUserLog(sec, -1, text);                                  // 訪客發言（已清理）
  userSay = { text, born: now };
  // 可回應者：在宿舍、未睡、未外出
  const avail = [];
  for (let ci = 0; ci < 6; ci++) { const p = positionAt(day, ci, sec); if (!p.out && !atBedNow(ci, p)) avail.push(ci); }
  if (!avail.length) { addUserLog(sec, -2, '（大家都不在或睡了，沒有人回應…）'); return { ok: true }; }
  const intent = classifyIntent(text);
  const rel = avail.filter(ci => intent.by && intent.by[CHARS[ci].persona]);   // 相關人設優先
  const chosen = [];
  if (rel.length) chosen.push(rel[Math.floor(Math.random() * rel.length)]);
  const rest = avail.filter(ci => !chosen.includes(ci));
  if (rest.length && (chosen.length === 0 || Math.random() < 0.6)) chosen.push(rest[Math.floor(Math.random() * rest.length)]);
  chosen.forEach((ci, i) => {
    const line = respondLine(ci, intent);
    liveBubbles.push({ ci, text: line, born: now + 400 + i * 750, ttl: 4200 });
    addUserLog(sec + 1 + i, ci, line);
    bumpUserAffinity(ci, 4);                 // 回應你 → 好感度上升
  });
  // 稱讚／示好類話語額外加分給在場者
  if (intent.keys && intent.keys.some(k => ['讚', '愛你', '喜歡'].includes(k))) avail.forEach(ci => bumpUserAffinity(ci, 2));
  return { ok: true };
}
function whichWindow(hf) {
  if (hf >= 7.7 && hf < 8.7) return 'meal';
  if (hf >= 12.0 && hf < 13.3) return 'meal';
  if (hf >= 19.0 && hf < 20.3) return 'meal';
  if (hf >= 8.7 && hf < 12.0) return 'study';
  if (hf >= 13.3 && hf < 17.2) return 'study';
  if (hf >= 17.2 && hf < 19.0) return 'social';
  if (hf >= 20.3 && hf < 22.6) return 'social';
  if (hf >= 22.6 || hf < 0.5) return 'night';
  return null;
}
// 誰在同一空間（用 spot 群組近似）
function roomOf(day, ci, secOfDay) {
  const p = positionAt(day, ci, secOfDay);
  if (p.y <= 10) return 'room';                 // 寢室/走廊，不聊
  if (p.x >= 11 && p.x <= 18) return 'room';    // 衛浴，不聊
  if (p.x <= 10) return 'living';
  if (p.x <= 28) return 'kitchen';
  return 'study';
}
const SLOT = 480;   // 每 8 模擬分鐘一句
let convCache = { day: -1, slot: -1, events: [] };
function conversationsUpTo(day, secOfDay) {
  const curSlot = Math.floor(secOfDay / SLOT);
  if (convCache.day === day && convCache.slot === curSlot) return convCache.events;
  const events = computeConversations(day, curSlot * SLOT);
  convCache = { day, slot: curSlot, events };
  return events;
}
function computeConversations(day, secOfDay) {
  const events = [];
  for (let ts = 0; ts <= secOfDay; ts += SLOT) {
    const hf = ts / 3600;
    const win = whichWindow(hf);
    if (!win) continue;
    // 找此刻在「會聊天空間」且靜止的人
    const present = {};
    for (let ci = 0; ci < 6; ci++) {
      const rm = roomOf(day, ci, ts);
      const p = positionAt(day, ci, ts);
      if (rm !== 'room' && !p.moving && !p.out) (present[rm] = present[rm] || []).push(ci);
    }
    for (const rm in present) {
      const grp = present[rm];
      if (grp.length < 2) continue;
      const rng = seeded('talk', day, Math.floor(ts / SLOT), rm);
      if (rng() > 0.78) continue;               // 大多數格有對話
      const sp = grp[Math.floor(rng() * grp.length)];
      events.push({ ts, ci: sp, text: personaLine(sp, win, rng), rm, grp: grp.slice() });
      // 你來我往：其他在場者接話
      if (grp.length >= 2 && rng() < 0.6) {
        let sj = grp[Math.floor(rng() * grp.length)];
        if (sj === sp) sj = grp[(grp.indexOf(sp) + 1) % grp.length];
        const reply = rng() < 0.55 ? pickR(rng, REPLY) : personaLine(sj, win, rng);
        events.push({ ts: ts + 90, ci: sj, text: reply, rm, grp: grp.slice(), to: sp });   // 回應 sp
      }
    }
  }
  events.sort((a, b) => a.ts - b.ts);
  return events;
}

// ── 好感度系統 ──
// 角色間：基礎契合度（每對固定，seeded）＋當日同場對話累積 → 0..100
function baseCompat(a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return 24 + Math.floor(seeded('compat', lo, hi)() * 40);   // 24..63
}
function affinityScores(day, sec, ci) {
  const events = conversationsUpTo(day, sec);
  const cnt = new Array(6).fill(0);
  for (const e of events) if (e.ts <= sec && e.grp && e.grp.indexOf(ci) >= 0) for (const g of e.grp) if (g !== ci) cnt[g]++;
  const out = [];
  for (let j = 0; j < 6; j++) { if (j === ci) continue; out.push({ ci: j, score: Math.min(100, baseCompat(ci, j) + cnt[j] * 3), cnt: cnt[j] }); }
  out.sort((a, b) => b.score - a.score);
  return out;
}
function affinityLevel(s) { return s >= 80 ? '❤ 麻吉' : s >= 62 ? '💛 好友' : s >= 42 ? '🙂 熟識' : '· 點頭之交'; }
// 與使用者（訪客）的好感度：本機累積，存 localStorage
let userAffinity = (() => {
  try { const v = JSON.parse(localStorage.getItem('dorm_useraff') || '[]'); if (Array.isArray(v) && v.length === 6) return v; } catch (e) {}
  return [30, 30, 30, 30, 30, 30];
})();
function bumpUserAffinity(ci, d) {
  userAffinity[ci] = Math.max(0, Math.min(100, (userAffinity[ci] ?? 30) + d));
  try { localStorage.setItem('dorm_useraff', JSON.stringify(userAffinity)); } catch (e) {}
}

// ── 天氣與天空（確定性）──
function weatherOf(day) {
  const r = seeded('weather', day)();
  return r < 0.55 ? 'sunny' : r < 0.80 ? 'cloudy' : 'rainy';
}
function lerpC(a, b, t) { return `rgb(${(a[0]+(b[0]-a[0])*t)|0},${(a[1]+(b[1]-a[1])*t)|0},${(a[2]+(b[2]-a[2])*t)|0})`; }
// 依 sim-hour 給天空上下漸層色（黎明/白天/黃昏/夜）
function skyColors(hf, weather) {
  const night = [14, 20, 46], dawn = [232, 140, 90], day = [126, 178, 224], dusk = [220, 110, 70], dayCloud = [150, 158, 168];
  let top, bot;
  const dayC = weather === 'sunny' ? day : dayCloud;
  if (hf < 5) { top = night; bot = night; }
  else if (hf < 7) { const t = (hf - 5) / 2; top = lerpA(night, dawn, t); bot = lerpA(night, dayC, t); }
  else if (hf < 17) { top = dayC; bot = lerpA(dayC, [200, 214, 224], 0.5); }
  else if (hf < 19) { const t = (hf - 17) / 2; top = lerpA(dayC, dusk, t); bot = lerpA(dayC, [90, 60, 80], t); }
  else if (hf < 20.5) { const t = (hf - 19) / 1.5; top = lerpA(dusk, night, t); bot = lerpA([90, 60, 80], night, t); }
  else { top = night; bot = night; }
  return { top, bot };
}
function lerpA(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgbStr(a) { return `rgb(${a[0]|0},${a[1]|0},${a[2]|0})`; }

// ── 渲染 ──
let canvas, ctx, serverOffset = 0, lastSync = 0;

const FLOOR = { bed: [90, 63, 40], bath: [58, 70, 80], hall: [74, 58, 44], living: [94, 66, 48], kitchen: [78, 70, 54], study: [74, 60, 48], out: [26, 22, 34] };
function roomAt(x, y) {
  let found = 'out';
  for (const r of rooms) if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) found = r.type;
  return found;
}

// 像素工具：以整數像素填色（FF6 風清晰塊）
function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
const isWall = (x, y) => (x >= 0 && x < MAPW && y >= 0 && y < MAPH && blocked[y][x]);

// 各房型地板調色（base / 深縫 / 亮點）
const FLOORPAL = {
  bed:   ['#8a5e38', '#7a5230', '#9a6c44'],   // 木
  hall:  ['#7c5836', '#6e4e30', '#8a6440'],
  living:['#926644', '#82583a', '#a2764e'],
  study: ['#7e5c3c', '#6e5032', '#8e6a46'],
  kitchen:['#c9c3b0', '#b8b2a0', '#d6d0be'],  // 磁磚
  bath:  ['#9fb0bc', '#8ea0ac', '#b2c2ce'],
  out:   ['#161320', '#161320', '#161320'],
};
function drawMap() {
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const rt = roomAt(x, y), pal = FLOORPAL[rt] || FLOORPAL.out, X = x * TILE, Y = y * TILE;
    px(X, Y, TILE, TILE, pal[0]);
    if (rt === 'kitchen' || rt === 'bath') {
      // 磁磚：棋盤 + 格縫
      if ((x + y) % 2) px(X, Y, TILE, TILE, pal[2]);
      px(X, Y, TILE, 1, pal[1]); px(X, Y, 1, TILE, pal[1]);
    } else if (rt !== 'out') {
      // 木地板：橫向木條 + 交錯板縫 + 點畫
      px(X, Y + TILE - 1, TILE, 1, pal[1]);
      px(X, Y, TILE, 1, pal[2]);
      const seam = ((x * 5 + y * 3) % TILE);
      px(X + seam, Y, 1, TILE, pal[1]);
      if ((x * 3 + y * 7) % 5 === 0) px(X + ((x * 11) % (TILE - 2)) + 1, Y + ((y * 7) % (TILE - 3)) + 2, 1, 1, pal[1]);
    }
  }
  // 牆：立體厚度（頂蓋 + 朝房間正面 + 描邊 + 落地陰影）
  const capH = 5, faceH = 6;
  for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) if (blocked[y][x]) {
    const X = x * TILE, Y = y * TILE;
    // 牆身（磚）
    px(X, Y, TILE, TILE, '#6e3a2c');
    for (let by = 0; by < TILE; by += 5) {
      const off = ((y + (by / 5 | 0)) % 2) ? TILE / 2 : 0;
      px(X, Y + by + 4, TILE, 1, '#3a1e16');                 // 磚橫縫
      px(X + off, Y + by, 1, 4, '#3a1e16');                  // 磚豎縫
      px(X + ((off + TILE / 2) % TILE), Y + by, 1, 4, '#3a1e16');
    }
    // 頂蓋（受光淺色）
    px(X, Y, TILE, capH, '#9a5a44'); px(X, Y, TILE, 1, '#b46a50');
    // 描邊（與地板相鄰的邊加深，強化塊感）
    if (!isWall(x - 1, y)) px(X, Y, 1, TILE, '#2a1610');
    if (!isWall(x + 1, y)) px(X + TILE - 1, Y, 1, TILE, '#2a1610');
    if (!isWall(x, y - 1)) px(X, Y, TILE, 1, '#2a1610');
    // 朝向房間的正面 + 落地陰影（下方是地板時）
    if (!isWall(x, y + 1)) {
      px(X, Y + TILE, TILE, faceH, '#5a2e22');              // 正面（較暗，像牆的側面）
      px(X, Y + TILE, TILE, 1, '#7a4230');                 // 正面頂緣受光
      px(X, Y + TILE + faceH, TILE, 2, 'rgba(0,0,0,0.28)'); // 落地陰影
      px(X, Y + TILE + faceH - 1, TILE, 1, '#2a1610');      // 正面底描邊
    }
  }
  drawSkyWindows();
  drawWallDecor();
  drawFurniture();
}

// 頂排寢室窗戶：看得到外面天空（太陽月亮、晴陰雨、日夜）
let curHF = 12, curWeather = 'sunny';
function drawSkyWindows() {
  const beds = rooms.filter(r => r.type === 'bed');
  const sk = skyColors(curHF, curWeather);
  const stripL = 2 * TILE, stripR = (MAPW - 3) * TILE;
  const sunFrac = (curHF - 5.5) / 13.0;             // 5.5→19 白天弧
  const sunVisible = sunFrac >= 0 && sunFrac <= 1;
  const sunX = stripL + sunFrac * (stripR - stripL);
  const sunY = (t) => 6 + Math.sin(t * Math.PI) * -10 + 10;   // 拱形高度（值越小越高）
  const moonFrac = ((curHF + 12 - 5.5) / 13.0) % 2;           // 夜晚弧（18→6）
  const moonVisible = curHF >= 19 || curHF < 6;
  const mFrac = curHF >= 19 ? (curHF - 19) / 11 : (curHF + 5) / 11;
  const moonX = stripL + mFrac * (stripR - stripL);

  for (const b of beds) {
    const wx = (b.x0 + 1) * TILE, wy = 2, ww = (b.x1 - b.x0 - 3) * TILE, wh = TILE * 1.6;
    ctx.save();
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    // 天空漸層
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, rgbStr(sk.top)); g.addColorStop(1, rgbStr(sk.bot));
    ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    // 星星（夜）
    if (curHF >= 20 || curHF < 5) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const rng = seeded('stars', b.x0);
      for (let s = 0; s < 5; s++) ctx.fillRect(wx + rng() * ww, wy + rng() * wh * 0.7, 1, 1);
    }
    // 太陽
    if (sunVisible && sunX >= wx - 8 && sunX <= wx + ww + 8) {
      const yy = wy + sunY(sunFrac);
      ctx.fillStyle = curWeather === 'sunny' ? '#ffe28a' : '#e8e0c0';
      ctx.beginPath(); ctx.arc(sunX, yy, 5, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,160,0.3)'; ctx.beginPath(); ctx.arc(sunX, yy, 8, 0, 6.28); ctx.fill();
    }
    // 月亮
    if (moonVisible && moonX >= wx - 8 && moonX <= wx + ww + 8) {
      const yy = wy + 6 + Math.sin(mFrac * Math.PI) * -8;
      ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.arc(moonX, yy, 4.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = rgbStr(sk.top); ctx.beginPath(); ctx.arc(moonX + 2, yy - 1, 4, 0, 6.28); ctx.fill();
    }
    // 雲
    if (curWeather !== 'sunny') {
      ctx.fillStyle = 'rgba(230,232,236,0.5)';
      const cr = seeded('cloud', b.x0);
      for (let cI = 0; cI < 2; cI++) {
        const cxp = wx + ((cr() * ww + performance.now() * 0.004) % (ww + 20)) - 10, cyp = wy + 4 + cr() * 6;
        ctx.beginPath(); ctx.ellipse(cxp, cyp, 7, 3, 0, 0, 6.28); ctx.ellipse(cxp + 5, cyp + 1, 5, 2.5, 0, 0, 6.28); ctx.fill();
      }
    }
    // 雨
    if (curWeather === 'rainy') {
      ctx.strokeStyle = 'rgba(170,190,220,0.5)'; ctx.lineWidth = 1;
      for (let d = 0; d < 14; d++) {
        const rx = wx + (d * 37 + performance.now() * 0.25) % ww;
        const ry = wy + (d * 53 + performance.now() * 0.5) % wh;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 5); ctx.stroke();
      }
    }
    ctx.restore();
    // 窗框
    ctx.strokeStyle = '#5a3020'; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  }
}

// 顏色明暗工具
function shade(hex, f) {
  const h = hex[0] === '#' ? hex.slice(1) : hex;
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const t = c => Math.max(0, Math.min(255, Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f))));
  return `rgb(${t(r)},${t(g)},${t(b)})`;
}
const OL = '#241610';   // 統一描邊色
// 立體家具：描邊 + 頂面 + 朝下前緣（假高度）+ 落地陰影（tile 座標）
function box3(x, y, w, h, top, side, lift) {
  lift = lift || 0.28;
  const X = x * TILE, Y = y * TILE, W = w * TILE, H = h * TILE, lp = lift * TILE;
  px(X + 2, Y + H, W - 2, 3, 'rgba(0,0,0,0.28)');       // 落地陰影
  px(X - 1, Y - 1, W + 2, H + 2, OL);                   // 描邊
  px(X, Y + H - lp, W, lp, side);                       // 前緣（側面）
  px(X, Y, W, H - lp, top);                             // 頂面
  px(X, Y, W, 1, shade(top, 0.28));                     // 頂緣受光
  px(X, Y + H - lp, W, 1, shade(side, 0.22));           // 前緣受光邊
}

// 蒸氣：從 (x,y) 往上飄的半透明小團（做菜／熱飯／熱飲）
function drawSteam(x, y, n, seed) {
  const t = performance.now() * 0.001;
  for (let i = 0; i < n; i++) {
    const life = (t * 11 + i * 6.3 + seed * 3) % 16;
    const a = 0.30 * (1 - life / 16);
    if (a <= 0) continue;
    const xx = x + Math.sin(t * 2.2 + i * 2.1 + seed) * 3 + (i - n / 2) * 2.4;
    ctx.fillStyle = `rgba(242,244,250,${a.toFixed(3)})`;
    ctx.fillRect(xx | 0, (y - life) | 0, 2, 2);
  }
}
// 電視／螢幕播放效果：每隔約 2 秒換「節目畫面」，加掃描線與移動亮帶
function drawTVScreen(X, Y, W, H, on, seed) {
  if (!on) { px(X, Y, W, H, '#1c2229'); px(X + 1, Y + 1, 2, 1, '#2a3a44'); return; }   // 待機（左上小紅點感）
  const t = performance.now();
  const scene = (Math.floor(t / 2200) + seed) >>> 0;
  const sr = mulberry32(scene);
  const base = [[38, 66, 116], [122, 58, 58], [56, 108, 78], [128, 108, 48], [78, 58, 116]][scene % 5];
  px(X, Y, W, H, `rgb(${base[0]},${base[1]},${base[2]})`);
  for (let k = 0; k < 3; k++) {                              // 隨場景的內容色塊
    const bw = W * (0.25 + sr() * 0.5), bx = X + sr() * (W - bw);
    const bh = H * (0.2 + sr() * 0.45), by = Y + sr() * (H - bh);
    ctx.fillStyle = `rgba(${sr() * 255 | 0},${sr() * 255 | 0},${sr() * 255 | 0},0.5)`;
    ctx.fillRect(bx | 0, by | 0, bw | 0, bh | 0);
  }
  for (let yy = Y; yy < Y + H; yy += 2) { ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(X, yy, W, 1); } // 掃描線
  const band = Y + ((t * 0.03) % H);                         // 移動亮帶
  ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(X, band | 0, W, 3);
}
function drawWallDecor() {
  // 掛畫（寢室與客廳上牆）
  const paint = (x, y, c1, c2) => {
    ctx.fillStyle = '#3a2418'; ctx.fillRect(x * TILE, y * TILE, TILE * 0.9, TILE * 0.7);
    ctx.fillStyle = c1; ctx.fillRect(x * TILE + 1.5, y * TILE + 1.5, TILE * 0.9 - 3, TILE * 0.35);
    ctx.fillStyle = c2; ctx.fillRect(x * TILE + 1.5, y * TILE + 1.5 + TILE * 0.35, TILE * 0.9 - 3, TILE * 0.3 - 1.5);
  };
  paint(3, 11.15, '#8fb0d8', '#5a8a5a'); paint(8, 11.15, '#d8a860', '#a05840');   // 客廳掛畫
  paint(30, 11.15, '#b090d0', '#6a80c0'); paint(35, 11.15, '#7ac0a0', '#c88060'); // 書房掛畫
  // 衛浴標示牌
  ctx.fillStyle = '#3a5a6a'; ctx.fillRect(13.4 * TILE, 11.1 * TILE, 1.4 * TILE, 0.5 * TILE);
  ctx.fillStyle = '#cfe4ee'; ctx.font = 'bold 7px "Noto Sans TC"'; ctx.textAlign = 'center'; ctx.fillText('衛浴', 14.1 * TILE, 11.5 * TILE);
  // 時鐘（廚房/餐廳上牆）
  const cx = 25 * TILE + 8, cy = 12 * TILE - 2;
  ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.28); ctx.stroke();
  const ang = (curHF / 12) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#2a2620'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4); ctx.stroke();
  const angM = (curHF % 1) * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angM) * 5, cy + Math.sin(angM) * 5); ctx.stroke();
}

// 人設專屬寢室佈置（畫在寢室下方空地／內牆）
function drawBedDecor(ci) {
  const room = rooms.filter(rr => rr.type === 'bed')[ci];
  const bx = (room.x0 + 1) * TILE, wy = (room.y0) * TILE;        // 內牆基準
  const fx = (room.x0 + 1) * TILE, fy = (room.y0 + 5) * TILE;    // 下方空地
  const r = (x, y, w, h, c) => px(x, y, w, h, c);
  const c = CHARS[ci];
  switch (c.persona) {
    case 'gamer': {   // 電腦桌＋發光螢幕＋海報
      r(fx - 1, fy - 1, 2.4 * TILE + 2, 1.1 * TILE + 2, OL);
      r(fx, fy, 2.4 * TILE, 1.1 * TILE, '#3a3a44');
      r(fx + 3, fy + 2, 1.4 * TILE, 0.7 * TILE, '#101018');       // 螢幕框
      drawTVScreen(fx + 5, fy + 4, 1.1 * TILE, 0.45 * TILE, true, ci + 7);   // 遊戲畫面播放中
      r(bx + 2.6 * TILE, wy + 6, 0.9 * TILE, 1.1 * TILE, OL); r(bx + 2.6 * TILE + 1, wy + 7, 0.9 * TILE - 2, 1.1 * TILE - 2, '#b04a5a'); // 海報
      break;
    }
    case 'athlete': {  // 啞鈴＋籃球＋獎盃
      r(fx, fy + 0.6 * TILE, 1.3 * TILE, 3, '#3a3a40'); r(fx - 2, fy + 0.5 * TILE, 4, 0.5 * TILE, '#2a2a30'); r(fx + 1.3 * TILE - 2, fy + 0.5 * TILE, 4, 0.5 * TILE, '#2a2a30'); // 啞鈴
      r(fx + 1.7 * TILE, fy + 0.3 * TILE, 0.8 * TILE, 0.8 * TILE, '#d87a30'); r(fx + 1.7 * TILE, fy + 0.65 * TILE, 0.8 * TILE, 1, '#6a3a18'); // 籃球
      r(bx + 2.7 * TILE, wy + 8, 0.7 * TILE, 0.9 * TILE, '#e8c84a'); r(bx + 2.75 * TILE, wy + 6, 0.6 * TILE, 3, '#e8c84a'); // 獎盃
      break;
    }
    case 'foodie': {   // 小冰箱＋鍋＋零食堆
      r(fx - 1, fy - 1, 1 * TILE + 2, 1.4 * TILE + 2, OL); r(fx, fy, 1 * TILE, 1.4 * TILE, '#dfe4e8'); r(fx + 2, fy + 0.7 * TILE, 1 * TILE - 4, 1, '#a8aeb2'); // 小冰箱
      r(fx + 1.3 * TILE, fy + 0.5 * TILE, 1 * TILE, 0.6 * TILE, '#4a4a52'); r(fx + 1.3 * TILE + 2, fy + 0.4 * TILE, 1 * TILE - 4, 3, '#6a6a72'); // 鍋
      r(fx + 1.5 * TILE, fy + 1.15 * TILE, 0.5 * TILE, 0.4 * TILE, '#d8a850'); // 零食
      break;
    }
    case 'bookworm': {  // 書堆＋窗邊小盆
      const cols = ['#b0483a', '#3a6a9a', '#4a8a5a', '#c8a040'];
      for (let k = 0; k < 4; k++) r(fx + k * 3, fy + 0.9 * TILE - k * 2, 0.9 * TILE, 0.28 * TILE, cols[k]); // 疊書
      r(fx + 1.5 * TILE, fy + 0.4 * TILE, 0.5 * TILE, 0.7 * TILE, '#a05a3a'); r(fx + 1.45 * TILE, fy + 0.1 * TILE, 0.6 * TILE, 0.4 * TILE, '#3a7a44'); // 小盆栽
      break;
    }
    case 'social': {   // 化妝鏡＋掛衣＋拍立得
      r(fx - 1, fy - 1, 1.1 * TILE + 2, 1.2 * TILE + 2, OL); r(fx, fy, 1.1 * TILE, 1.2 * TILE, '#c8b0d0'); r(fx + 2, fy + 2, 1.1 * TILE - 4, 0.8 * TILE, '#e8e0f0'); // 鏡子
      r(fx + 1.4 * TILE, fy, 0.5 * TILE, 1.3 * TILE, '#d85a8a'); r(fx + 1.35 * TILE, fy, 0.6 * TILE, 3, '#8a5aa0'); // 掛衣
      r(bx + 2.6 * TILE, wy + 7, 0.6 * TILE, 0.7 * TILE, '#f0f0f0'); // 拍立得
      break;
    }
    case 'artist': {   // 畫架＋吉他
      r(fx - 1, fy - 1, 1.2 * TILE + 2, 1.4 * TILE + 2, OL); r(fx, fy, 1.2 * TILE, 1.4 * TILE, '#e8e2d4'); r(fx + 2, fy + 2, 1.2 * TILE - 4, 1 * TILE, '#88b0d8'); r(fx + 3, fy + 3, 0.5 * TILE, 0.4 * TILE, '#d8a850'); // 畫布
      r(fx + 1.5 * TILE, fy + 0.2 * TILE, 0.5 * TILE, 1.1 * TILE, '#a0602a'); r(fx + 1.55 * TILE, fy + 0.9 * TILE, 0.4 * TILE, 0.4 * TILE, '#c88040'); r(fx + 1.68 * TILE, fy - 0.2 * TILE, 3, 0.6 * TILE, '#6a3a18'); // 吉他
      break;
    }
  }
}

function drawFurniture() {
  const r = (x, y, w, h, c) => px(x, y, w, h, c);   // 像素矩形捷徑
  // 寢室：床（木框＋床頭板＋枕頭＋角色色棉被）＋床頭櫃＋檯燈
  for (let i = 0; i < 6; i++) {
    const b = spot.bed[i], bx = (b.fx - 0.1) * TILE, by = (b.fy - 0.7) * TILE, bw = 1.8 * TILE, bh = 2.6 * TILE;
    r(bx - 1, by - 1, bw + 2, bh + 2, OL);                       // 描邊
    r(bx, by, bw, bh, '#6e4632');                                // 木床框
    r(bx + 2, by + 2, bw - 4, 0.7 * TILE, '#f2ece2');            // 枕頭
    r(bx + 2, by + 2, bw - 4, 2, shade('#f2ece2', -0.12));
    const quilt = CHARS[i].body;
    r(bx + 2, by + 0.85 * TILE, bw - 4, bh - 0.95 * TILE - 2, quilt);   // 棉被
    r(bx + 2, by + 0.85 * TILE, bw - 4, 2, shade(quilt, 0.25));
    r(bx + 2, by + 1.5 * TILE, bw - 4, 1, shade(quilt, -0.25));  // 被摺
    box3(b.fx + 2.5, b.fy - 0.5, 1.2, 1.2, '#9a7450', '#5c4028'); // 床頭櫃
    r((b.fx + 2.85) * TILE, (b.fy - 0.75) * TILE, 4, 5, '#ffe08a'); r((b.fx + 2.9) * TILE, (b.fy - 0.9) * TILE, 3, 3, '#fff4c0'); // 檯燈
    drawBedDecor(i);   // 人設專屬寢室佈置
  }
  // ── 共用衛浴（x11..18）：3 廁所（上）＋洗手台鏡（中）＋2 淋浴間（下）──
  const plumb = '#e8eef0', plumbSh = '#c2ccd0';
  // 廁所隔間矮牆（視覺用，不擋路）；避開門的中央走道 x15
  for (const dxp of [13, 17]) r(dxp * TILE - 1, 12 * TILE, 2, 2.3 * TILE, '#9aa8ae');
  spot.toilet.forEach((t, i) => {                              // 3 間馬桶（置中於格子，不吃牆）
    const tx = t.x * TILE + TILE / 2 - 5, ty = 12 * TILE + 2;
    r(tx - 1, ty - 1, 11, 1.5 * TILE + 2, OL);
    r(tx, ty, 10, 0.55 * TILE, plumb);                          // 水箱
    r(tx + 1, ty + 0.55 * TILE, 8, 0.8 * TILE, plumb);          // 座
    r(tx + 2, ty + 0.62 * TILE, 6, 3, plumbSh);
    r(tx, ty, 10, 1, '#ffffff');
  });
  spot.sink.forEach((s, i) => {                                // 洗手台＋鏡子（置中）
    const sx = s.x * TILE + TILE / 2 - 5, sy = s.y * TILE;
    r(sx - 1, sy - 1, 11, 0.7 * TILE + 2, OL);
    r(sx, sy, 10, 0.65 * TILE, plumb); r(sx + 3, sy + 3, 4, 3, '#7fb0c8');   // 台＋盆
    r(sx + 1, sy - 0.7 * TILE, 8, 0.55 * TILE, '#bfe0ee'); r(sx + 1, sy - 0.7 * TILE, 8, 0.55 * TILE, 'rgba(255,255,255,0.18)'); // 鏡
    r(sx + 1, sy - 0.7 * TILE - 1, 8, 1, OL);
  });
  spot.shower.forEach((s, i) => {                              // 2 間淋浴（磁磚＋簾＋蓮蓬頭；置中於牆內）
    const X = (s.x - 0.7) * TILE, Y = (s.y - 1.6) * TILE, W = 2.4 * TILE, H = 3.4 * TILE;
    r(X - 1, Y - 1, W + 2, H + 2, OL);
    r(X, Y, W, H, '#b8ccd4');
    for (let ty2 = 0; ty2 < H; ty2 += 5) r(X, Y + ty2, W, 1, '#9fb4bd');       // 磁磚縫
    for (let tx2 = 0; tx2 < W; tx2 += 5) r(X + tx2, Y, 1, H, '#9fb4bd');
    r(X + W * 0.5 - 2, Y + 1, 4, 3, '#8a9298');                                 // 蓮蓬頭
    r(X + 2, Y + 2, W - 4, 0.5 * TILE, 'rgba(180,215,230,0.5)');                // 簾（半透）
    r(X + 2, Y + 2, W - 4, 1, '#cfe4ee');
  });

  // ── 客廳（x1..10）：地毯、沙發、茶几、電視櫃＋電視＋遊戲機、書架、盆栽、立燈 ──
  r(2.6 * TILE, 15 * TILE, 6.8 * TILE, 4.6 * TILE, 'rgba(150,96,64,0.30)');    // 地毯
  for (let s = 15.3; s < 19.4; s += 0.5) r(2.6 * TILE, s * TILE, 6.8 * TILE, 1, 'rgba(255,220,180,0.06)');
  r(2.6 * TILE, 15 * TILE, 6.8 * TILE, 1, 'rgba(255,235,200,0.12)');
  box3(2.6, 20.4, 7, 2.4, '#5a6fb0', '#3d4c82', 0.32);        // 沙發座
  for (let k = 0; k < 3; k++) r((3 + k * 2.1) * TILE, 20.6 * TILE, 1.9 * TILE, 1.2 * TILE, shade('#5a6fb0', 0.14)); // 坐墊
  r(2.4 * TILE, 20.1 * TILE, 0.7 * TILE, 2.2 * TILE, '#4a5c96'); r(9 * TILE, 20.1 * TILE, 0.7 * TILE, 2.2 * TILE, '#4a5c96'); // 扶手
  r(2.4 * TILE - 1, 20.1 * TILE - 1, 0.7 * TILE + 2, 2.2 * TILE + 2, OL); r(9 * TILE - 1, 20.1 * TILE - 1, 0.7 * TILE + 2, 2.2 * TILE + 2, OL);
  r(3 * TILE, 19.6 * TILE, 1.4 * TILE, 0.6 * TILE, '#6a4a8a'); r(7 * TILE, 19.7 * TILE, 1.1 * TILE, 0.5 * TILE, '#c86a6a'); // 抱枕
  box3(4.4, 17.6, 2.8, 1.4, '#8a6238', '#523a24', 0.28);      // 茶几
  r(5.2 * TILE, 18 * TILE, 0.7 * TILE, 0.4 * TILE, '#d8e0e4'); // 茶几上馬克杯/遙控
  r(6.1 * TILE, 18.1 * TILE, 0.5 * TILE, 0.3 * TILE, '#2a2a30');
  box3(3.4, 12.2, 3.4, 1.4, '#3a3a42', '#1c1c22', 0.32);      // 電視櫃
  r(4 * TILE - 1, 12.05 * TILE - 1, 2.2 * TILE + 2, 1.15 * TILE + 2, OL);
  r(4 * TILE, 12.05 * TILE, 2.2 * TILE, 1.15 * TILE, '#111116'); // 電視
  const tvOn = (curHF >= 16 || curHF < 1) || (curHF >= 7 && curHF < 9);
  drawTVScreen(4.15 * TILE, 12.2 * TILE, 1.9 * TILE, 0.85 * TILE, tvOn, 3);
  if (tvOn) {   // 螢幕投射到地板的閃爍光暈
    const fl = 0.10 + Math.sin(performance.now() * 0.02) * 0.03;
    ctx.fillStyle = `rgba(120,170,230,${fl.toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(4.2 * TILE, 13.2 * TILE); ctx.lineTo(6 * TILE, 13.2 * TILE); ctx.lineTo(7.2 * TILE, 16 * TILE); ctx.lineTo(3 * TILE, 16 * TILE); ctx.closePath(); ctx.fill();
  }
  r(6.6 * TILE, 12.7 * TILE, 0.8 * TILE, 0.5 * TILE, '#26262e'); r(6.7 * TILE, 12.8 * TILE, 0.6 * TILE, 2, (curHF >= 16 || curHF < 1) ? '#5aa0e0' : '#33343c'); // 遊戲機
  box3(8.6, 12.1, 1.4, 2.6, '#7a5230', '#3f2c1a', 0.3);       // 書架
  const lbCols = ['#b0483a', '#3a6a9a', '#4a8a5a', '#c8a040', '#8a5aa0'];
  for (let k = 0; k < 6; k++) r((8.7 + (k % 3) * 0.42) * TILE, (12.3 + ((k / 3) | 0) * 1.1) * TILE, 0.34 * TILE, 0.95 * TILE, lbCols[k % lbCols.length]);
  r(2.4 * TILE, 23.6 * TILE, 0.7 * TILE, 0.6 * TILE, '#a05a3a'); r(2.2 * TILE, 22.7 * TILE, 1.1 * TILE, 1 * TILE, '#3a7a44'); r(2.5 * TILE, 22.5 * TILE, 0.5 * TILE, 0.6 * TILE, '#4a9a54'); // 盆栽
  r(9.1 * TILE, 20 * TILE, 0.2 * TILE, 2.2 * TILE, '#3a3038'); r(8.7 * TILE, 19.4 * TILE, 1 * TILE, 0.7 * TILE, '#ffe6a8'); // 立燈

  // ── 廚房餐廳（x19..28）：門與出口在 x20，留 x20-21 直通走道；家具全在 x22+ ──
  box3(22, 12.2, 5.6, 1.4, '#cfd3d6', '#8a8f92', 0.32);        // 流理台面（x22-27.6）
  for (let k = 0; k < 5; k++) r((22.2 + k) * TILE, 13.2 * TILE, 1, 0.5 * TILE, '#9aa0a4'); // 櫃門縫
  r(22.1 * TILE, 12.3 * TILE, 1.1 * TILE, 0.9 * TILE, '#242428');   // 瓦斯爐面
  r(22 * TILE, 11.15 * TILE, 1.4 * TILE, 0.5 * TILE, '#3a3a42'); r(22 * TILE, 11.6 * TILE, 1.4 * TILE, 2, '#55555e'); // 抽油煙機
  const cooking = (curHF >= 7.3 && curHF < 8.5) || (curHF >= 11.6 && curHF < 13) || (curHF >= 18.6 && curHF < 20);
  if (cooking) {
    r(22.45 * TILE, 12.6 * TILE, 4, 3, '#ff9a3a'); r(22.55 * TILE, 12.64 * TILE, 2, 2, '#ffe0a0');   // 爐火
    r(22.15 * TILE, 12.28 * TILE, 1 * TILE, 0.45 * TILE, '#3a3a44'); r(22.12 * TILE, 12.26 * TILE, 1.05 * TILE, 3, '#5a5a64'); // 鍋
    drawSteam(22.65 * TILE, 12.25 * TILE, 4, 2);
  }
  r(23.6 * TILE, 12.4 * TILE, 1 * TILE, 0.65 * TILE, '#9aa4aa'); r(23.7 * TILE, 12.5 * TILE, 0.8 * TILE, 0.45 * TILE, '#5a6268'); // 水槽
  r(24 * TILE, 12.2 * TILE, 2, 0.35 * TILE, '#8890a0');                                                // 水龍頭
  r(25 * TILE, 12.35 * TILE, 1 * TILE, 0.7 * TILE, '#2e2e36'); r(25.1 * TILE, 12.45 * TILE, 0.8 * TILE, 0.5 * TILE, '#4a4a54'); r(25.15 * TILE, 12.5 * TILE, 0.5 * TILE, 0.4 * TILE, (cooking ? '#ffb44a' : '#20202a')); // 微波爐
  r(26.3 * TILE, 12.4 * TILE, 0.6 * TILE, 0.5 * TILE, '#c0c6ca'); // 刀架/砧板
  // 牆上掛廚具
  for (let k = 0; k < 3; k++) { r((26.4 + k * 0.5) * TILE, 11.15 * TILE, 2, 0.6 * TILE, '#8a8f96'); r((26.4 + k * 0.5) * TILE, 11.7 * TILE, 3, 2, '#6a6f76'); }
  box3(26.1, 14.2, 1.7, 2.3, '#e2e7ea', '#a8aeb2', 0.3);      // 冰箱（移到爐台下方靠右牆）
  r(26.3 * TILE, 14.6 * TILE, 0.22 * TILE, 1.4 * TILE, '#8890a0'); r(26.1 * TILE, 15.2 * TILE, 1.7 * TILE, 1, '#b8bec2'); // 把手＋門縫
  r(26.4 * TILE, 14.4 * TILE, 0.5 * TILE, 3, '#d84a4a');       // 冰箱磁鐵便條
  box3(22, 19, 4.6, 2.3, '#9a6c3e', '#5c3f22', 0.3);          // 餐桌（x22-26.6，避開 x20-21 走道）
  const chairPos = [[22, 18.3], [24, 18.3], [26, 18.3], [22, 21.6], [24, 21.6], [26, 21.6]];
  for (const [cxp, cyp] of chairPos) box3(cxp, cyp, 1, 0.7, '#7a5432', '#4a3220', 0.25);
  // 餐桌菜餚（用餐時段）
  const mealNow = (curHF >= 7.4 && curHF < 8.8) || (curHF >= 11.8 && curHF < 13.2) || (curHF >= 18.8 && curHF < 20.3);
  if (mealNow) {
    const cd = 24.3 * TILE, cdy = 20.1 * TILE;
    r(cd - 0.6 * TILE - 1, cdy - 0.4 * TILE - 1, 1.2 * TILE + 2, 0.8 * TILE + 2, OL);
    r(cd - 0.6 * TILE, cdy - 0.4 * TILE, 1.2 * TILE, 0.8 * TILE, '#e8e2d6');
    r(cd - 0.45 * TILE, cdy - 0.3 * TILE, 0.9 * TILE, 0.55 * TILE, '#c86a3a');
    r(cd - 0.3 * TILE, cdy - 0.22 * TILE, 0.5 * TILE, 0.25 * TILE, '#e89a4a');
    drawSteam(cd, cdy - 0.4 * TILE, 4, 5);
    const settings = [[22.4, 19.4], [24.3, 19.4], [26.2, 19.4], [22.4, 21.0], [24.3, 21.0], [26.2, 21.0]];
    settings.forEach(([sx, sy], k) => {
      const X = sx * TILE, Y = sy * TILE;
      r(X - 4, Y - 4, 11, 8, OL);
      r(X - 3, Y - 3, 9, 6, '#ded6c8');
      r(X - 2, Y - 2, 7, 3, '#f0f0f0'); r(X - 1, Y - 1, 5, 2, '#eec072');
      r(X + 5, Y - 2, 1, 5, '#c8c0b2');
      if (k % 2 === 0) drawSteam(X + 1, Y - 3, 2, k + 1);
    });
  }

  // ── 書房（x29..38）：書桌＋椅＋筆電、整面書架、盆栽、閱讀椅 ──
  spot.desk.forEach((d, di) => {
    box3(d.x - 0.75, d.y - 0.45, 1.8, 1.2, '#9a7448', '#5c4526', 0.3);
    r((d.x - 0.4) * TILE, (d.y - 0.3) * TILE, 0.9 * TILE, 0.55 * TILE, '#3a4650'); // 筆電
    drawTVScreen((d.x - 0.35) * TILE, (d.y - 0.25) * TILE, 0.8 * TILE, 0.4 * TILE, (curHF >= 8 && curHF < 23.5), di + 20);
    r((d.x + 0.55) * TILE, (d.y - 0.05) * TILE, 0.28 * TILE, 0.34 * TILE, '#e8e2d6'); // 書本
    r((d.x + 0.55) * TILE, (d.y - 0.05) * TILE, 0.28 * TILE, 2, '#c0402e');
    const mugX = (d.x + 0.62) * TILE, mugY = (d.y + 0.35) * TILE;
    r(mugX - 1, mugY - 1, 6, 7, OL); r(mugX, mugY, 4, 5, '#d8d0c4'); r(mugX + 4, mugY + 1, 2, 3, '#d8d0c4');
    if (curHF >= 8 && curHF < 23.5) drawSteam(mugX + 2, mugY, 2, di + 30);
    box3(d.x - 0.55, d.y + 0.7, 1.4, 0.6, '#7a5432', '#4a3220', 0.3); // 椅
  });
  // 書架分兩段，中間 x32-34 留給房門 x33
  const bookCols = ['#b0483a', '#3a6a9a', '#4a8a5a', '#c8a040', '#8a5aa0', '#c86a4a', '#5a8ac0'];
  const shelfSeg = (x0, w) => {
    box3(x0, 11.9, w, 1.7, '#7a5230', '#3f2c1a', 0.4);
    const n = Math.floor(w / 0.23) - 1;
    for (let bx = 0; bx < n; bx++) { const bh = [0.75, 0.85, 0.7, 0.9][bx % 4]; const c0 = bookCols[(bx * 3) % bookCols.length]; const X = (x0 + 0.25 + bx * 0.23) * TILE, Y = (12.05 + (0.9 - bh)) * TILE; r(X, Y, 0.18 * TILE, bh * TILE, c0); r(X, Y, 0.18 * TILE, 1, shade(c0, 0.3)); }
    r(x0 * TILE, 12.9 * TILE, w * TILE, 1, OL);               // 層板縫
  };
  shelfSeg(29.5, 2.5); shelfSeg(34, 3.5);
  r(36.4 * TILE, 24 * TILE, 0.8 * TILE, 0.7 * TILE, '#a05a3a'); r(36.2 * TILE, 23.2 * TILE, 1.2 * TILE, 1 * TILE, '#3a7a44'); r(36.4 * TILE, 23 * TILE, 0.5 * TILE, 0.6 * TILE, '#4a9a54'); // 盆栽
  box3(32.8, 23.4, 1.4, 1.3, '#8a5a6a', '#5c3a46', 0.3);      // 閱讀懶骨頭（中央走道底、避開書桌）

  // 房名標籤
  ctx.fillStyle = 'rgba(255,240,220,0.42)'; ctx.font = 'bold 9px "Noto Sans TC"'; ctx.textAlign = 'left';
  for (const [t, x, y] of [['客廳', 3, 25.5], ['衛浴', 13, 25.5], ['廚房・餐廳', 20, 25.5], ['書房', 32, 25.5]]) ctx.fillText(t, x * TILE, y * TILE);
}

const SLEEP_H = { start: 23.1, end: 7.0 };
// 是否真的在自己床上（躺下條件；不看時間，避免熬夜者在書桌被放倒）
function atBedNow(ci, p) {
  const b = spot.bed[ci];
  return !p.moving && Math.hypot(p.x - (b.fx ?? b.x), p.y - (b.fy ?? b.y)) < 1.3;
}
// FF6 風 chibi：大頭 + 深色描邊 + 明暗；四向面向、走路交替
function drawChar(ci, p, hf) {
  const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2;
  const c = CHARS[ci];
  const walking = p.moving;
  const step = walking ? (Math.sin(performance.now() * 0.014 + ci * 2) > 0 ? 1 : -1) : 0;
  const bob = walking ? (Math.floor(performance.now() * 0.008 + ci) % 2) : 0;
  const sleeping = atBedNow(ci, p);        // 只有真的躺在床上才是睡覺姿勢
  const pants = shade(c.body, -0.42), sleeve = shade(c.body, -0.12), hairHi = shade(c.hair, 0.28), skinSh = shade(c.skin, -0.16);
  const r = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(cx, cy + 9, 6.5, 2.4, 0, 0, 6.28); ctx.fill();

  ctx.save(); ctx.translate(cx, cy - bob);
  if (sleeping && !walking) { ctx.rotate(Math.PI / 2); ctx.globalAlpha = 0.92; }
  const dir = p.dir;   // 0下 1右 2上 3左

  // 腿（走路交替；描邊）
  const l1 = step, l2 = -step;
  r(-4, 6 + Math.max(0, -l1), 3, 4 - Math.abs(l1), OL); r(1, 6 + Math.max(0, -l2), 3, 4 - Math.abs(l2), OL);
  r(-3.4, 6 + Math.max(0, -l1), 1.8, 3 - Math.abs(l1) * 0.5, pants); r(1.6, 6 + Math.max(0, -l2), 1.8, 3 - Math.abs(l2) * 0.5, pants);
  // 鞋
  r(-4, 9, 3, 1.4, '#2a2018'); r(1, 9, 3, 1.4, '#2a2018');
  // 身體（上衣 + 描邊 + 側光）
  r(-5, -2, 10, 9, OL);
  r(-4, -1, 8, 7, c.body);
  r(-4, -1, 8, 1.4, shade(c.body, 0.22));        // 肩部受光
  r(-4, -1, 2, 7, sleeve); r(2, -1, 2, 7, sleeve); // 袖
  // 手
  r(-5, 3, 2, 2.4, OL); r(3, 3, 2, 2.4, OL); r(-4.6, 3.3, 1.4, 1.8, c.skin); r(3.2, 3.3, 1.4, 1.8, c.skin);
  // 頭（大頭 + 描邊）
  r(-5, -11, 10, 10, OL);
  r(-4, -10, 8, 8, c.skin);
  r(2, -10, 2, 8, skinSh);                        // 臉側陰影
  // 頭髮（依性別/角色/面向）
  r(-4, -10, 8, 3, c.hair);                       // 頂
  r(-4, -10, 8, 1, hairHi);
  if (dir === 2) { r(-4, -10, 8, 7, c.hair); r(-4, -10, 8, 1, hairHi); }   // 背面：整頭髮
  else {
    if (c.g === 'f') { r(-5, -10, 1.6, 8, c.hair); r(3.4, -10, 1.6, 8, c.hair); if (ci === 5) { r(-5, -2, 1.4, 3, c.hair); r(3.6, -2, 1.4, 3, c.hair); } }
    else { if (ci === 0) r(-4, -10, 8, 2, c.hair); if (ci === 1) { r(-4, -11, 8, 2, c.hair); r(-1, -11.5, 3, 1, c.hair); } if (ci === 2) { r(-4.6, -9, 1.4, 4, c.hair); r(3.2, -9, 1.4, 4, c.hair); } }
  }
  // 臉（依面向）
  if (!sleeping && dir !== 2) {
    const ex = dir === 1 ? 1.3 : dir === 3 ? -1.3 : 0;
    r(-2.4 + ex, -6.4, 1.6, 1.8, '#2a2018'); r(0.9 + ex, -6.4, 1.6, 1.8, '#2a2018');   // 眼
    r(-2.1 + ex, -6.1, 0.7, 0.7, '#fff');       r(1.2 + ex, -6.1, 0.7, 0.7, '#fff');    // 眼高光
    r(-3 + ex, -4.2, 1.4, 1, 'rgba(220,120,110,0.45)'); r(1.8 + ex, -4.2, 1.4, 1, 'rgba(220,120,110,0.45)'); // 腮紅
  } else if (sleeping) { r(-2.4, -6, 1.8, 1, '#2a2018'); r(0.8, -6, 1.8, 1, '#2a2018'); }
  ctx.restore();

  // 唸書思考：在書房定點且清醒時，偶爾冒出思考小雲（含動態點點）
  const studying = !walking && !sleeping && p.x >= 29 && p.y >= 11;
  if (studying) {
    const tt = performance.now() * 0.001;
    if ((tt + ci * 1.3) % 4 < 2.4) {              // 週期性出現（約一半時間）
      const tbx = cx + 8, tby = cy - 15;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(tbx - 4, tby + 4, 1.3, 0, 6.28); ctx.arc(tbx - 2, tby + 2, 1.8, 0, 6.28); ctx.arc(tbx + 2, tby, 3.4, 0, 6.28); ctx.fill();
      ctx.strokeStyle = 'rgba(120,110,100,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      const dots = 1 + (Math.floor(tt * 2) % 3);
      ctx.fillStyle = 'rgba(90,80,70,0.95)';
      for (let d = 0; d < dots; d++) ctx.fillRect(tbx - 2 + d * 2.2, tby - 0.7, 1.3, 1.3);
    }
  }

  // 頭頂：綠點 + 名字膠囊（Gather 風）
  if (!(sleeping && !walking)) {
    const label = c.name;
    ctx.font = 'bold 8px "Noto Sans TC"'; ctx.textAlign = 'left';
    const tw = ctx.measureText(label).width, cap = tw + 16, capX = cx - cap / 2, capY = cy - 24;
    ctx.fillStyle = 'rgba(20,18,28,0.82)'; roundRect(capX, capY, cap, 11, 5.5); ctx.fill();
    ctx.fillStyle = '#4ad86a'; ctx.beginPath(); ctx.arc(capX + 6, capY + 5.5, 2.4, 0, 6.28); ctx.fill();   // 綠點
    ctx.fillStyle = '#f4f0ff'; ctx.fillText(label, capX + 11, capY + 8);
  }
}

function drawBubble(ci, p, text) {
  const px = p.x * TILE + TILE / 2, py = p.y * TILE + TILE / 2;
  ctx.font = '9px "Noto Sans TC", monospace'; ctx.textAlign = 'left';
  const w = ctx.measureText(text).width + 10;
  const bx = Math.max(2, Math.min(CW - w - 2, px - w / 2)), by = py - 34;
  ctx.fillStyle = 'rgba(250,250,252,0.96)';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  roundRect(bx, by, w, 15, 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(px - 3, by + 15); ctx.lineTo(px + 3, by + 15); ctx.lineTo(px, by + 20); ctx.closePath(); ctx.fillStyle = 'rgba(250,250,252,0.96)'; ctx.fill();
  ctx.fillStyle = '#1a1a26'; ctx.fillText(text, bx + 5, by + 11);
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ── 主迴圈 ──
let curDay = -1, roster = [];

// 夜間加速：全員熟睡的深夜壓縮真實時間（純函數 → 所有訪客一致）
// 白天每模擬小時維持原速，深夜約 6× 快轉
function nightCost(h) {
  const fast = 0.16;                     // 深夜真實時間成本（≈6× 加速）
  const a = 0.3, b = 5.6, ramp = 0.6;    // 加速窗（全員入睡）＋平滑過渡
  if (h >= a + ramp && h <= b - ramp) return fast;
  if (h > a && h < a + ramp) return 1 - (1 - fast) * ((h - a) / ramp);
  if (h > b - ramp && h < b) return 1 - (1 - fast) * ((b - h) / ramp);
  return 1;
}
const WARP_N = 480, WARP_DH = 24 / WARP_N;
let warpCum = null, warpTotal = 0, realPerDay = 0;
function buildWarp() {
  warpCum = new Float64Array(WARP_N + 1);
  let acc = 0;
  for (let i = 0; i < WARP_N; i++) { acc += nightCost((i + 0.5) * WARP_DH) * WARP_DH; warpCum[i + 1] = acc; }
  warpTotal = acc;
  realPerDay = warpTotal * (3600 / DAY_SCALE);   // 白天保持原速；整日略短（深夜被壓縮）
}
function warpPhaseToSec(p) {                       // 當日線性進度 p∈[0,1) → 模擬秒（夜快日常）
  const target = p * warpTotal;
  let lo = 0, hi = WARP_N;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (warpCum[mid + 1] < target) lo = mid + 1; else hi = mid; }
  const seg = warpCum[lo + 1] - warpCum[lo];
  const t = seg > 0 ? (target - warpCum[lo]) / seg : 0;
  return Math.min(DAY_SEC - 1, (lo + t) * WARP_DH * 3600);
}
function simTime() {
  if (!warpCum) buildWarp();
  const real = (performance.now() / 1000) + serverOffset;
  const dayF = real / realPerDay;
  const day = Math.floor(dayF);
  return { day, sec: warpPhaseToSec(dayF - day) };
}

// 日夜色調覆蓋（模擬光照）
function timeTint(hf) {
  if (hf >= 7.5 && hf < 16.5) return null;                          // 白天不上色
  let col, a;
  if (hf < 5) { col = [12, 20, 52]; a = 0.5; }
  else if (hf < 7.5) { const t = (hf - 5) / 2.5; col = [12, 20, 52]; a = 0.5 - t * 0.5; if (hf > 6) { col = [255, 160, 90]; a = (hf - 6) / 1.5 * 0.12; } }
  else if (hf < 18.5) { const t = (hf - 16.5) / 2; col = [255, 140, 70]; a = t * 0.16; }
  else if (hf < 20.5) { const t = (hf - 18.5) / 2; col = [30, 30, 70]; a = 0.18 + t * 0.3; }
  else { col = [12, 20, 52]; a = 0.5; }
  return { col, a };
}

const NARR = {
  morning: ['人生 是關於你所遇見的人，以及你與他們一起創造的事', '新的一天，宿舍又醒過來了', '早晨的光灑進每個房間'],
  day: ['專注的時光，也是彼此陪伴的時光', '書桌前的沙沙聲，是青春的注腳', '窗外的日子一天天過去'],
  evening: ['傍晚，大家聚在客廳分享今天', '一起吃飯的時候，話總是特別多', '燈亮起，這裡就是家'],
  night: ['夜深了，道聲晚安', '關上燈，明天見', '安靜的宿舍，各自的夢'],
};
function narrationOf(day, hf) {
  const seg = hf < 5 || hf >= 22.5 ? 'night' : hf < 10 ? 'morning' : hf < 17 ? 'day' : hf < 22.5 ? 'evening' : 'night';
  const pool = NARR[seg];
  return pool[Math.floor(seeded('narr', day, seg)() * pool.length)];
}

// ── 戶外庭院 ──
let lampPosts = [], trees = [], benches = [], pondRect = null;
function buildGrounds() {
  const bx0 = BOX, by0 = BOY, bx1 = BOX + MAPW * TILE, by1 = BOY + MAPH * TILE, pad = TILE * 2.4;
  lampPosts = [
    { x: bx0 - pad, y: by0 - pad }, { x: bx1 + pad, y: by0 - pad },
    { x: bx0 - pad, y: by1 + pad }, { x: bx1 + pad, y: by1 + pad },
    { x: (bx0 + bx1) / 2 - TILE * 3, y: by1 + pad }, { x: (bx0 + bx1) / 2 + TILE * 3, y: by1 + pad },
  ];
  trees = [
    { x: TILE * 3, y: TILE * 2.5, r: 18 }, { x: CW - TILE * 3, y: TILE * 2.5, r: 20 },
    { x: TILE * 2.5, y: CH - TILE * 4, r: 16 }, { x: CW - TILE * 2.6, y: CH - TILE * 5, r: 19 },
    { x: CW - TILE * 3.2, y: TILE * 6, r: 14 },
  ];
  benches = [{ x: TILE * 2.4, y: CH / 2, v: 1 }, { x: CW - TILE * 3.4, y: CH / 2 + TILE * 2, v: 1 }];
  pondRect = { x: TILE * 1.2, y: TILE * 1.2, w: TILE * 3.6, h: TILE * 2.6 };
}

function drawGrounds(hf, day) {
  const g1 = '#4c7c3e', g2 = '#446f37', g3 = '#568a46';
  // 草地 + 點畫
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    px(x * TILE, y * TILE, TILE, TILE, (x + y) % 2 ? g1 : g2);
    if ((x * 7 + y * 13) % 6 === 0) px(x * TILE + ((x * 5) % 12) + 2, y * TILE + ((y * 3) % 12) + 2, 2, 1, g3);
  }
  // 圍籬（外環樹籬）
  const hedge = '#2f5a2a', hedgeHi = '#3f7236';
  for (let x = 0; x < FW; x++) { px(x * TILE, 0, TILE, TILE * 0.9, hedge); px(x * TILE, 0, TILE, 2, hedgeHi); px(x * TILE, (FH - 1) * TILE + TILE * 0.1, TILE, TILE * 0.9, hedge); px(x * TILE, (FH - 1) * TILE + TILE * 0.1, TILE, 2, hedgeHi); }
  for (let y = 0; y < FH; y++) { px(0, y * TILE, TILE * 0.9, TILE, hedge); px((FW - 1) * TILE + TILE * 0.1, y * TILE, TILE * 0.9, TILE, hedge); }

  // 環繞走道（建築外圈石板）+ 前門引道
  const stone = '#b9ad90', stoneD = '#9c9078';
  const rx0 = OX - 1, ry0 = OY - 1, rx1 = OX + MAPW, ry1 = OY + MAPH;
  for (let x = rx0; x <= rx1; x++) for (let y = ry0; y <= ry1; y++) {
    if (x > rx0 && x < rx1 && y > ry0 && y < ry1) continue;   // 只畫外圈環帶
    px(x * TILE, y * TILE, TILE, TILE, (x + y) % 2 ? stone : stoneD);
    px(x * TILE, y * TILE, TILE, 1, 'rgba(255,255,255,0.06)'); px(x * TILE, y * TILE, 1, TILE, 'rgba(0,0,0,0.10)');
  }
  const cxp = (OX + MAPW / 2) | 0;   // 前門引道（往下到圍籬）
  for (let y = ry1; y < FH - 1; y++) for (let x = cxp - 1; x <= cxp + 1; x++) { px(x * TILE, y * TILE, TILE, TILE, (x + y) % 2 ? stone : stoneD); }

  // 花圃（前庭兩側）
  const beds = [[cxp - 5, ry1 + 1], [cxp + 3, ry1 + 1]];
  const flowerC = ['#e05a6a', '#e8c84a', '#d06ad0', '#f08a3a', '#7aa0e0'];
  for (const [bx, by] of beds) {
    px(bx * TILE, by * TILE, 2 * TILE, 1.4 * TILE, '#5a3e28'); px(bx * TILE, by * TILE, 2 * TILE, 2, '#6e4c32');
    for (let k = 0; k < 8; k++) { const fx = bx * TILE + 3 + (k % 4) * 7, fy = by * TILE + 4 + ((k / 4) | 0) * 9; px(fx, fy, 3, 3, flowerC[(k + bx) % flowerC.length]); px(fx + 1, fy + 1, 1, 1, '#fff6c0'); }
  }

  // 水池（動態水面 + 石緣 + 天空倒影）
  if (pondRect) {
    const p = pondRect, sk = skyColors(hf, curWeather);
    px(p.x - 3, p.y - 3, p.w + 6, p.h + 6, '#8a8470');            // 石緣
    px(p.x - 2, p.y - 2, p.w + 4, p.h + 4, '#6e685a');
    const water = shade(rgbStr(sk.bot), -0.1);
    px(p.x, p.y, p.w, p.h, water);
    px(p.x, p.y, p.w, p.h * 0.4, shade(rgbStr(sk.top), 0.05));    // 上半倒影天空
    // 波光
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let s = 0; s < 4; s++) { const wy = p.y + 4 + s * 6 + Math.sin(performance.now() * 0.002 + s) * 1.5; ctx.fillRect(p.x + 3 + (s % 2) * 6, wy, 8, 1); }
    if (curWeather === 'rainy') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let s = 0; s < 5; s++) { const rx = p.x + (s * 13 + performance.now() * 0.05) % p.w; ctx.beginPath(); ctx.arc(rx, p.y + (s * 7) % p.h, 2 + (performance.now() * 0.006 + s) % 3, 0, 6.28); ctx.stroke(); } }
  }

  // 樹（樹幹 + 圓冠 + 陰影）：樹冠隨風搖擺，陰影反向微動
  const now = performance.now();
  const gust = 1 + Math.sin(now * 0.0004) * 0.6;                    // 陣風強弱起伏
  for (const t of trees) {
    const sway = Math.sin(now * 0.0016 + t.x * 0.05) * (t.r * 0.14) * gust;   // 樹冠水平位移
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(t.x + sway * 0.3, t.y + t.r * 0.7, t.r * 0.9, t.r * 0.35, 0, 0, 6.28); ctx.fill();
    px(t.x - 2, t.y, 4, t.r, '#5a3a22');                            // 樹幹（不動）
    ctx.fillStyle = '#2f6a2c'; ctx.beginPath(); ctx.arc(t.x + sway * 0.5, t.y - t.r * 0.3, t.r, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#3f8236'; ctx.beginPath(); ctx.arc(t.x - t.r * 0.3 + sway * 0.8, t.y - t.r * 0.5, t.r * 0.6, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#4f9642'; ctx.beginPath(); ctx.arc(t.x - t.r * 0.4 + sway, t.y - t.r * 0.6, t.r * 0.3, 0, 6.28); ctx.fill();
    // 飄落的葉片（少量，隨風向右下飄）
    ctx.fillStyle = 'rgba(90,150,70,0.55)';
    for (let lf = 0; lf < 3; lf++) {
      const lp = (now * 0.02 + lf * 60 + t.x) % 90;
      const lx = t.x + sway + lp * 0.5 + Math.sin(now * 0.003 + lf) * 4;
      const ly = t.y - t.r * 0.4 + lp;
      if (ly < t.y + t.r) ctx.fillRect(lx | 0, ly | 0, 2, 2);
    }
  }
  // 長椅
  for (const b of benches) { px(b.x - 1, b.y - 1, TILE + 2, 0.6 * TILE + 2, OL); px(b.x, b.y, TILE, 0.6 * TILE, '#8a5a34'); px(b.x, b.y, TILE, 2, '#a06a3e'); px(b.x + 1, b.y + 0.6 * TILE, 2, 4, '#5a3a20'); px(b.x + TILE - 3, b.y + 0.6 * TILE, 2, 4, '#5a3a20'); }
  // 路燈（燈柱 + 燈頭；夜晚在 frame() 疊光暈）
  for (const L of lampPosts) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(L.x, L.y + 10, 6, 2, 0, 0, 6.28); ctx.fill();
    px(L.x - 1, L.y - 10, 2, 20, '#3a3630');
    px(L.x - 3, L.y - 14, 6, 5, '#4a4640');
    px(L.x - 2, L.y - 13, 4, 3, (hf >= 17.5 || hf < 7) ? '#ffe6a0' : '#8a8674');
  }
}

function frame() {
  requestAnimationFrame(frame);
  const { day, sec } = simTime();
  const hf = sec / 3600;
  curHF = hf; curWeather = weatherOf(day);

  ctx.clearRect(0, 0, CW, CH);
  drawGrounds(hf, day);                    // 戶外庭院（絕對座標）

  ctx.save(); ctx.translate(BOX, BOY);     // 建築內縮進庭院
  drawMap();
  const ppl = [];
  for (let ci = 0; ci < 6; ci++) ppl.push({ ci, p: positionAt(day, ci, sec) });
  ppl.sort((a, b) => a.p.y - b.p.y);
  for (const { ci, p } of ppl) if (!p.out) drawChar(ci, p, hf);   // 外出者不在宿舍裡
  ctx.restore();

  // 日夜色調覆蓋（整片畫布，庭院也一起變暗）
  const tt = timeTint(hf);
  if (tt) { ctx.fillStyle = `rgba(${tt.col[0]},${tt.col[1]},${tt.col[2]},${tt.a})`; ctx.fillRect(0, 0, CW, CH); }
  if (curWeather === 'rainy') { ctx.fillStyle = 'rgba(70,80,100,0.12)'; ctx.fillRect(0, 0, CW, CH); }

  // 燈光（色調之上，用 lighter 打亮）：室內暖光 + 戶外路燈
  if (hf >= 17.5 || hf < 7) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const { ci, p } of ppl) {
      if (p.out || atBedNow(ci, p)) continue;   // 外出或睡床上都不點燈
      const px = BOX + p.x * TILE + TILE / 2, py = BOY + p.y * TILE + TILE / 2;
      const g = ctx.createRadialGradient(px, py, 4, px, py, 42);
      g.addColorStop(0, 'rgba(255,210,130,0.30)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 42, 0, 6.28); ctx.fill();
    }
    for (const L of lampPosts) {
      const g = ctx.createRadialGradient(L.x, L.y, 3, L.x, L.y, 34);
      g.addColorStop(0, 'rgba(255,220,150,0.5)'); g.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.x, L.y, 34, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  // 雨（整片庭院＋建築）
  if (curWeather === 'rainy') {
    ctx.strokeStyle = 'rgba(180,200,230,0.35)'; ctx.lineWidth = 1;
    for (let d = 0; d < 90; d++) {
      const rx = (d * 137 + performance.now() * 0.4) % CW, ry = (d * 197 + performance.now() * 0.9) % CH;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 6); ctx.stroke();
    }
  }

  // 對話泡泡（建築座標偏移）
  const events = conversationsUpTo(day, sec);
  const BUBBLE = 260;
  ctx.save(); ctx.translate(BOX, BOY);
  for (const { ci, p } of ppl) {
    if (p.out) continue;                     // 外出者沒有泡泡
    const ev = events.filter(e => e.ci === ci && sec - e.ts < BUBBLE && sec - e.ts >= 0).pop();
    if (ev) drawBubble(ci, p, ev.text);
  }
  // 使用者互動的即時回應泡泡（本機、短暫）
  const nowP = performance.now();
  for (const b of liveBubbles) {
    const age = nowP - b.born;
    if (age < 0 || age > b.ttl) continue;
    const p = positionAt(day, b.ci, sec);
    if (p.out) continue;
    drawBubble(b.ci, p, b.text);
  }
  if (liveBubbles.length) liveBubbles = liveBubbles.filter(b => nowP - b.born <= b.ttl);
  ctx.restore();

  // 頂部旁白字幕
  const narr = narrationOf(day, hf);
  ctx.font = '11px "Noto Sans TC", serif'; ctx.textAlign = 'center';
  const nw = ctx.measureText(narr).width;
  ctx.fillStyle = 'rgba(10,8,16,0.6)'; ctx.fillRect(CW / 2 - nw / 2 - 8, 4, nw + 16, 16);
  ctx.fillStyle = 'rgba(245,235,210,0.94)'; ctx.fillText(narr, CW / 2, 16);

  // 使用者剛說的話（本機短暫字幕；文字已清理，canvas fillText 不會執行標記）
  if (userSay && performance.now() - userSay.born < 3500) {
    const s = '你說：' + userSay.text;
    ctx.font = '11px "Noto Sans TC"'; ctx.textAlign = 'center';
    const sw = ctx.measureText(s).width;
    ctx.fillStyle = 'rgba(40,30,60,0.74)'; ctx.fillRect(CW / 2 - sw / 2 - 8, 23, sw + 16, 16);
    ctx.fillStyle = 'rgba(224,214,255,0.96)'; ctx.fillText(s, CW / 2, 35);
  }

  // 時鐘（含天氣圖示）
  const hh = String(Math.floor(hf)).padStart(2, '0'), mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const wIcon = curWeather === 'sunny' ? (hf >= 6 && hf < 18 ? '☀' : '🌙') : curWeather === 'cloudy' ? '☁' : '🌧';
  document.getElementById('clock').textContent = `Day ${day} ・ ${hh}:${mm} ${wIcon}`;

  if (day !== curDay || performance.now() - lastRoster > 500) {
    if (day !== curDay) { liveBubbles = []; userLog = []; userSay = null; }   // 換日清空本機互動
    updateSide(day, sec, events, ppl); if (selectedChar >= 0) refreshCard(); lastRoster = performance.now(); curDay = day;
  }
}

let lastRoster = 0;
// 依角色實際位置／外出狀態給即時標籤（各人設行為不同 → 標籤也不同）
function statusLabel(day, ci, sec) {
  const pos = positionAt(day, ci, sec);
  if (pos.out) return '外出・' + (pos.act || '');
  const near = (s) => s && Math.hypot(pos.x - (s.fx ?? s.x), pos.y - (s.fy ?? s.y)) < 1.3;
  if (near(spot.bed[ci])) return '睡覺';
  if (pos.moving) return '移動中';
  if (pos.x >= 11 && pos.x <= 18 && pos.y >= 11) {          // 衛浴區
    if (spot.shower.some(near)) return '洗澡';
    if (spot.toilet.some(near)) return '如廁';
    return '排隊等盥洗';
  }
  if (near(spot.dine[ci])) return '用餐';
  if (pos.x >= 19 && pos.x <= 28 && pos.y >= 11) return '在廚房';
  if (pos.x <= 10 && pos.y >= 11) return '在客廳';
  if (pos.x >= 29 && pos.y >= 11) return '在書房';
  return '休息';
}
function updateSide(day, sec, events, ppl) {
  let rh = '';
  for (let ci = 0; ci < 6; ci++) {
    rh += `<div class="who"><span class="dot" style="background:${CHARS[ci].body}"></span>${CHARS[ci].name}<span style="color:#8a82a0;font-size:10px;margin-left:5px">${CHARS[ci].tag}</span><span class="act">${statusLabel(day, ci, sec)}</span></div>`;
  }
  document.getElementById('rosterbody').innerHTML = rh;
  // 合併確定性對話與使用者互動（後者含訪客發言＋角色回應），依 ts 排序取最近 40 則
  const evLines = events.slice(-40).map(e => ({ ts: e.ts, ci: e.ci, text: e.text }));
  const merged = evLines.concat(userLog).sort((a, b) => a.ts - b.ts).slice(-40);
  let lh = '';
  for (const e of merged) {
    const th = String(Math.floor(e.ts / 3600)).padStart(2, '0'), tm = String(Math.floor((e.ts % 3600) / 60)).padStart(2, '0');
    let nm, col;
    if (e.ci === -1) { nm = '訪客（你）'; col = '#7ad0ff'; }
    else if (e.ci === -2) { nm = ''; col = '#7a7290'; }
    else { nm = CHARS[e.ci].name; col = CHARS[e.ci].body; }
    // 所有動態文字一律 escape，杜絕 DOM 注入
    const nmHtml = nm ? `<span class="nm" style="color:${col}">${escapeHtml(nm)}</span>：` : '';
    lh += `<div class="line"><span class="t">${th}:${tm}</span> ${nmHtml}${e.ci === -2 ? `<span style="color:#7a7290">${escapeHtml(e.text)}</span>` : escapeHtml(e.text)}</div>`;
  }
  const lb = document.getElementById('logbody');
  // 更新前記住是否已在底部：只有貼底時才自動捲動，避免打斷使用者往上翻閱
  const atBottom = lb.scrollHeight - lb.scrollTop - lb.clientHeight < 24;
  lb.innerHTML = lh || '<div class="line" style="color:#7a7290">（夜深了，大家都睡了）</div>';
  if (atBottom) lb.scrollTop = lb.scrollHeight;
}

async function syncTime() {
  try {
    const r = await fetch('time.php', { cache: 'no-store' });
    const j = await r.json();
    serverOffset = j.now - performance.now() / 1000;
  } catch (e) { serverOffset = Date.now() / 1000 - performance.now() / 1000; }
  lastSync = performance.now();
}

async function init() {
  canvas = document.getElementById('game');
  canvas.width = CW; canvas.height = CH;
  // 顯示尺寸交給 CSS（height:100% 維持比例），不再以 JS 撐寬導致失真
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  buildWorld();
  buildGrounds();
  await syncTime();
  setInterval(syncTime, 60000);   // 每分鐘重新對時

  // 點擊人像 → 選取角色顯示卡片
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const ix = (ev.clientX - rect.left) / rect.width * CW;
    const iy = (ev.clientY - rect.top) / rect.height * CH;
    const { day, sec } = simTime();
    let best = -1, bd = 1.6;
    for (let ci = 0; ci < 6; ci++) {
      const p = positionAt(day, ci, sec);
      const cxp = BOX + p.x * TILE + TILE / 2, cyp = BOY + p.y * TILE + TILE / 2 - 4;
      const d = Math.hypot((ix - cxp) / TILE, (iy - cyp) / TILE);
      if (d < bd) { bd = d; best = ci; }
    }
    if (best >= 0) { selectedChar = best; showCard(ev.clientX, ev.clientY); }
    else hideCard();
  });
  document.getElementById('charcard').addEventListener('click', (e) => {
    if (e.target.classList.contains('cc-close')) hideCard();
    e.stopPropagation();
  });

  // 對話輸入框：送出後宿舍小人即時回應（本機層）
  const cin = document.getElementById('chatinput'), csend = document.getElementById('chatsend');
  if (cin && csend) {
    cin.setAttribute('maxlength', '40');
    const send = () => { const r = handleUserMessage(cin.value); if (r.ok) cin.value = ''; };
    csend.addEventListener('click', send);
    cin.addEventListener('keydown', (e) => {
      // 中文輸入法組字中按 Enter 是「確認選字」，不送出（避免誤送半成品）
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  requestAnimationFrame(frame);
}

// ── 角色卡片：個性 + 最近互動 ──
let selectedChar = -1;
function showCard(clientX, clientY) {
  const card = document.getElementById('charcard');
  card.style.display = 'block';
  // 靠滑鼠但不超出視窗
  const w = 260, h = 320;
  card.style.left = Math.min(window.innerWidth - w - 12, Math.max(8, clientX + 14)) + 'px';
  card.style.top = Math.min(window.innerHeight - h - 12, Math.max(8, clientY - 40)) + 'px';
  refreshCard();
}
function hideCard() { selectedChar = -1; document.getElementById('charcard').style.display = 'none'; }
function refreshCard() {
  if (selectedChar < 0) return;
  const ci = selectedChar, c = CHARS[ci], pd = PERSONA_DESC[c.persona];
  const { day, sec } = simTime();
  const events = conversationsUpTo(day, sec);
  // 該角色參與的對話（在場即算），最近 12 則
  const mine = events.filter(e => e.ts <= sec && e.grp && e.grp.indexOf(ci) >= 0).slice(-12);
  // 好感度：對其他室友的好感排名（基礎契合＋當日互動）
  const bar = (score, col) => `<span class="cc-bar"><span style="width:${score}%;background:${col}"></span></span>`;
  const aff = affinityScores(day, sec, ci);
  const affHtml = aff.map(a =>
    `<div class="cc-aff"><span style="color:${CHARS[a.ci].body}">${escapeHtml(CHARS[a.ci].name)}</span>` +
    `${bar(a.score, CHARS[a.ci].body)}<span class="cc-lv">${affinityLevel(a.score)} ${a.score}</span></div>`
  ).join('');
  // 與你（訪客）的好感度
  const ua = userAffinity[ci] ?? 30;
  const userHtml = `<div class="cc-aff"><span style="color:#7ad0ff">你</span>${bar(ua, '#7ad0ff')}<span class="cc-lv">${affinityLevel(ua)} ${ua}</span></div>`;
  let log = '';
  for (const e of mine.slice(-10)) {
    const th = String(Math.floor(e.ts / 3600)).padStart(2, '0'), tm = String(Math.floor((e.ts % 3600) / 60)).padStart(2, '0');
    const rmName = { living: '客廳', kitchen: '廚房', study: '書房' }[e.rm] || '';
    log += `<div class="cc-line"><span class="cc-t">${th}:${tm} ${rmName}</span> <b style="color:${CHARS[e.ci].body}">${CHARS[e.ci].name}</b>：${e.text}</div>`;
  }
  if (!log) log = '<div class="cc-line cc-t">目前獨處中，稍後就會有互動～</div>';
  document.getElementById('charcard').innerHTML =
    `<div class="cc-head"><span class="cc-av" style="background:${c.body}"></span>` +
    `<span><div class="cc-name">${c.name}</div><div class="cc-tag">${pd.title}・${statusLabel(day, ci, sec)}</div></span>` +
    `<span class="cc-close">✕</span></div>` +
    `<div class="cc-body"><div class="cc-desc">${pd.desc}</div>` +
    `<div class="cc-traits">${pd.traits.map(t => `<span>#${t}</span>`).join('')}</div>` +
    `<h4>好感度</h4><div class="cc-affs">${userHtml}${affHtml}</div>` +
    `<h4>最近互動</h4><div class="cc-log">${log}</div></div>`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
