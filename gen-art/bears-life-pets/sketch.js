// =============================================================================
// Bears' Life Pets — 個人寵物小屋（?u=玩家名）
// 室內像素房間（參考 gen-art/neko）：窗外自轉日夜（每屋相位不同）、
// 牆上掛保管區（/craft store）裝備、寵物名字作 seed 配色、
// 投餵真實寫回（api.php → web_feed_queue.db → bot 每 60s 套用）。
// 無 ?u= 時顯示小屋大廳（所有主人門牌）。
// =============================================================================

'use strict';

// ── Canvas / 房間尺寸 ───────────────────────────────────
const W = 960, H = 540;
const FLOOR_Y = 430;
let ROOM_W = 960;               // layout() 依家具動態決定
let cv, ctx;

// ── 日夜（frame 循環，相位由屋主名決定 → 每間小屋窗外時區不同）──
const DAY_CYCLE = 3600;         // 60fps 下約一分鐘一天（屋內時間加快）
let frame = 0, phaseOffset = 0;
function dayPhase() { return ((frame + phaseOffset) % DAY_CYCLE) / DAY_CYCLE; }
function getAmbient() {
  const p = dayPhase();
  let b;
  if (p < 0.2) b = 0.35;
  else if (p < 0.3) b = 0.35 + (p - 0.2) * 6.5;
  else if (p < 0.7) b = 1.0;
  else if (p < 0.8) b = 1.0 - (p - 0.7) * 6.5;
  else b = 0.35;
  const anyOpen = curtains.window1 || (FURN.window2 && curtains.window2) || (FURN.window3 && curtains.window3);
  if (!anyOpen && b > 0.6) b *= 0.78;
  return Math.max(b, 0.55);     // 檯燈常亮：夜裡室內仍看得清
}
function getSkyColor() {
  const p = dayPhase();
  if (p < 0.2) return '#0a1030';
  if (p < 0.28) return lerpHex('#0a1030', '#f8a060', (p - 0.2) / 0.08);
  if (p < 0.35) return lerpHex('#f8a060', '#5cb0e8', (p - 0.28) / 0.07);
  if (p < 0.65) return '#5cb0e8';
  if (p < 0.72) return lerpHex('#5cb0e8', '#f8a060', (p - 0.65) / 0.07);
  if (p < 0.8) return lerpHex('#f8a060', '#0a1030', (p - 0.72) / 0.08);
  return '#0a1030';
}
function lerpHex(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function dimC(hex, ambv) { return ambv >= 1 ? hex : lerpHex('#141018', hex, 0.3 + ambv * 0.7); }

// ── Seed 工具（dorm-life 慣例）───────────────────────────
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ── 遊戲同步常數 ─────────────────────────────────────────
const PET_META = {
  dog:  { emoji: '🐶', cname: '狗狗' }, cat: { emoji: '🐱', cname: '貓咪' },
  bird: { emoji: '🐦', cname: '小鳥' }, fish: { emoji: '🐟', cname: '魚魚' },
  seal: { emoji: '🦭', cname: '海豹' },
};
const PET_SFX = {
  dog:  { pet: ['❤', '蹭蹭', '汪！', '汪汪！'], eat: ['好好吃！', '嗷嗚～', '滿足！'] },
  cat:  { pet: ['❤', '蹭蹭', '呼嚕～', '喵～'], eat: ['好好吃！', '呼嚕～', '滿足！'] },
  bird: { pet: ['❤', '啾！', '叽叽'],           eat: ['啾！', '好好吃！'] },
  fish: { pet: ['❤', '咕嚕', '♡'],              eat: ['滿足！'] },
  seal: { pet: ['❤', '啪！', '啪啪啪', '拍肚皮'], eat: ['好好吃！', '啪啪', '滿足！'] },
};
function petSfx(p, kind) {
  const t = PET_SFX[p && p.type] || PET_SFX.dog;
  return pick(t[kind] || t.pet);
}
const HUNGER_TIER = [[80, '🍖 吃得飽飽'], [50, '🙂 半飽'], [25, '😋 有點餓'], [10, '😰 很餓了'], [0, '💀 快餓扁']];
const MOOD_TIER = [[80, '😻 心情超好'], [55, '😊 心情不錯'], [30, '😐 有點無聊'], [10, '🥺 有點失落'], [0, '😢 好寂寞…']];
function tierOf(table, v) { for (const [th, s] of table) if (v >= th) return s; return table[table.length - 1][1]; }
const RARITY_COL = { normal: '#9aa4ae', fine: '#6ac46a', rare: '#5a9ade', epic: '#b06ade', legend: '#e8a04a', mythic: '#e05a5a', crafted: '#58d8a8' };

// 毛色盤（seed = 屋主名+寵物名 → 穩定且每隻不同）
const COATS = {
  dog:  [['#8a5a2e', '#6e4522', '#f3e2c8'], ['#d9a45a', '#b8853f', '#fff2da'], ['#7a7a80', '#5e5e66', '#e8e8ee'], ['#f0e8da', '#d4c8b4', '#ffffff'], ['#4a3a30', '#362a22', '#c8b8a8']],
  cat:  [['#e08a3c', '#bf6f2a', '#ffffff'], ['#3a3a42', '#28282e', '#e8e8ee'], ['#f0ede4', '#d8d2c2', '#f8b8c8'], ['#b89a6a', '#96784a', '#ffffff'], ['#8a8a92', '#6e6e76', '#f0f0f6']],
  bird: [['#f2d24b', '#d4b232', '#f28a3c'], ['#6aaede', '#4a8ec2', '#f2d24b'], ['#8ac46a', '#68a84c', '#f2d24b'], ['#e88ab0', '#c86890', '#f2d24b'], ['#e0e4ec', '#c0c4cc', '#f2a04b']],
  fish: [['#f08a3c', '#d06a24', '#ffd9a8'], ['#e05a5a', '#c04242', '#ffc8c8'], ['#5a9ade', '#3c7cc2', '#c8e2ff'], ['#f2d24b', '#d4b232', '#fff2c8'], ['#b06ade', '#9048c0', '#e8d0ff']],
  seal: [['#9aa4b2', '#7e8896', '#d8dee8'], ['#c4cad4', '#a8b0bc', '#eef2f8'], ['#a8907a', '#8a7460', '#e2d4c4'], ['#7a92a8', '#5e7690', '#c8dae8']],
};
function coatOf(p) {
  const rng = mulberry32(hashStr(ownerName + '|' + p.name + '|' + p.type));
  return COATS[p.type][Math.floor(rng() * COATS[p.type].length)];
}

// ── 全域狀態 ─────────────────────────────────────────────
let ownerName = '';
let state = null, catalog = null;
let fetchedAt = 0;
let sims = {};
let selectedId = null;
let camX = 0, camTargetX = 0;
let followId = null, nextFollowSwitch = 0, manualCamUntil = 0;
let effects = [];
let nextPairEvent = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function now() { return performance.now() / 1000; }

// ── 家具佈局（依寵物種類動態擺放）────────────────────────
// 固定：書架、沙發、碗區；動態：狗窩/貓跳台/鳥棲架/魚缸/海豹池
let FURN = {};                  // key → {x, w}
let TANK = null, POOL = null, FISHWATER = null, PERCHES = [], TREE_PLATS = [], BOWL_X = 460, LITTER_X = 0;
const curtains = { window1: true, window2: true, window3: true };
const curtainAnim = { window1: 1, window2: 1, window3: 1 };
function layout() {
  const lv = Math.max(1, Math.min(5, state.home_lv || 1));
  const owned = new Set(state.furniture || []);
  const FW = { cattree: 140, litter: 70, kennel: 120, birdstand: 130, tank: 250, pool: 230, bed: 110, plant: 50 };
  const ORDER = ['cattree', 'litter', 'kennel', 'birdstand', 'tank', 'pool', 'bed', 'plant'];
  FURN = {
    bookshelf: { x: 60, w: 110 },
    window1: { x: 210, w: 150 },
    sofa: { x: 300, w: 150 },
    bowls: { x: 440, w: 70 },
    clock: { x: 455, y: 72, r: 34 },   // 窗與裝備牆之間、沙發上方
  };
  let x = 540;
  const put = (k, w) => { FURN[k] = { x, w }; x += w + 36; };
  for (const k of ORDER) if (owned.has(k)) put(k, FW[k]);
  ROOM_W = Math.max(W, x + 50, 960 + (lv - 1) * 280);
  FURN.window2 = lv >= 2 ? { x: Math.max(x + 20, ROOM_W - 190), w: 150 } : null;
  FURN.window3 = lv >= 4 ? { x: Math.min(FURN.window2.x - 180, ROOM_W - 370), w: 150 } : null;
  TANK = FURN.tank ? { x: FURN.tank.x, w: 230, top: FLOOR_Y - 190, bot: FLOOR_Y - 18 } : null;
  POOL = FURN.pool ? { cx: FURN.pool.x + 110, cy: FLOOR_Y + 4, rx: 105, ry: 20 } : null;
  // 魚的水域：優先水族箱；沒水族箱但有泳池 → 魚改在泳池裡游（虛擬水域，不畫玻璃箱）
  // 2026-09-09 用戶回報「魚不進水池」：泳池原本只有海豹會用
  FISHWATER = TANK || (POOL ? { x: POOL.cx - 85, w: 170, top: FLOOR_Y - 30, bot: FLOOR_Y + 10 } : null);
  PERCHES = [];
  TREE_PLATS = [];
  if (FURN.birdstand) {
    const bx = FURN.birdstand.x + 60;
    PERCHES.push([bx - 40, FLOOR_Y - 150], [bx + 40, FLOOR_Y - 118], [bx, FLOOR_Y - 62]);
  }
  if (FURN.cattree) {
    TREE_PLATS.push([FURN.cattree.x + 36, FLOOR_Y - 148]);
    TREE_PLATS.push([FURN.cattree.x + 70, FLOOR_Y - 156]);
    PERCHES.push(...TREE_PLATS);
  }
  PERCHES.push([FURN.bookshelf.x + 55, FLOOR_Y - 208]);
  if (FURN.window2) PERCHES.push([FURN.window2.x + 75, FLOOR_Y - 120]);
  if (FURN.window3) PERCHES.push([FURN.window3.x + 75, FLOOR_Y - 120]);
  BOWL_X = FURN.bowls.x + 30;
  LITTER_X = FURN.litter ? FURN.litter.x + 28 : 0;
}

// ── 即時數值（engine 同款衰減：-1.2/hr；-0.8/hr，餓扁再 -1.5/hr）──
function liveStats(p) {
  const eh = p.age_h + (Date.now() - fetchedAt) / 3.6e6;
  const hunger = Math.max(0, p.hunger - 1.2 * eh);
  const mood = Math.max(0, p.mood - (0.8 + (hunger <= 0 ? 1.5 : 0)) * eh);
  return { hunger, mood };
}

// ── 資料載入 ─────────────────────────────────────────────
async function loadState() {
  try {
    const r = await fetch('api.php?u=' + encodeURIComponent(ownerName) + '&t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    if (!d.ok) { $('ownercard').textContent = '找不到這位玩家。'; return; }
    state = d;
    fetchedAt = Date.now();
    layout();
    for (const p of state.pets) if (!sims[p.id]) spawnSim(p);
    const alive = new Set(state.pets.map(p => p.id));
    for (const id of Object.keys(sims)) if (!alive.has(+id)) delete sims[id];
    if (new URLSearchParams(location.search).has('romtest')) {  // 💘 相框/窗燈預覽
      state.romance = { frames: ['xingli', 'youtao', 'tiya'], window_light: true };
    }
    if (new URLSearchParams(location.search).has('trotest')) {  // 🧭 戰利品預覽（四遺物）
      state.treasure = { done: true, relics: ['compass', 'tidebell', 'everlamp', 'hourglass'] };
    }
    renderSide();
  } catch (e) { /* 保留舊資料 */ }
}
async function loadCatalog() {
  try {
    const r = await fetch('../bears-life-detail/catalog.json', { cache: 'no-store' });
    catalog = await r.json();
    if (state) renderSide();
  } catch (e) { catalog = { items: {}, rarities: {} }; }
}
function petById(id) { return state ? state.pets.find(p => p.id === id) : null; }
function itemOf(id) { return (catalog && catalog.items && catalog.items[String(id)]) || null; }
function stashGear() {
  if (!state) return [];
  return (state.stash || [])
    .map(s => ({ ...s, it: itemOf(s.item_id), source: 'stash' }))
    .filter(s => s.it && (s.it.type === 'weapon' || s.it.type === 'armor'));
}
const TROPHY_ITEM_ID = 903;   // 🧭 古神星圖羅盤：另有專屬展示座，珍藏牆不重複畫
const TROPHY_ITEM_IDS = [903, 904, 905, 906];   // 尋寶奇譚四遺物：都走專屬展示座，不進珍藏清單
function vaultGear() {
  if (!state) return [];
  return (state.vault || [])
    .map(s => ({ ...s, it: itemOf(s.item_id), enh: 0, source: 'vault' }))
    .filter(s => s.it && s.item_id !== TROPHY_ITEM_ID);
}

function spawnSim(p) {
  const s = {
    x: rand(120, ROOM_W - 120), y: FLOOR_Y, dir: Math.random() < 0.5 ? 1 : -1,
    st: 'idle', until: now() + rand(1, 3), tx: 0, ty: 0, phase: Math.random() * 10,
    cdUntil: 0, partner: null,
  };
  if (p.type === 'fish' && FISHWATER) { s.x = rand(FISHWATER.x + 30, FISHWATER.x + FISHWATER.w - 30); s.y = rand(FISHWATER.top + 45, FISHWATER.bot - 25); s.st = 'swim'; }
  if (p.type === 'bird' && PERCHES.length) { const i = p.id % PERCHES.length; [s.x, s.y] = PERCHES[i]; s.st = 'perch'; }
  sims[p.id] = s;
}

// ── 特效 ────────────────────────────────────────────────
function fx(type, x, y, opt) { effects.push(Object.assign({ type, x, y, t: 0, life: 1.2 }, opt || {})); }
function notif(x, y, txt, col) { fx('notif', x, y, { txt, col: col || '#ffe9b0', life: 1.6 }); }

// ── 寵物 AI ─────────────────────────────────────────────
function decideNext(p, s) {
  const t = now();
  const { hunger, mood } = liveStats(p);
  const night = dayPhase() < 0.22 || dayPhase() > 0.78;
  const r = Math.random();
  if (p.type === 'fish') {
    if (!FISHWATER) { s.st = 'idle'; s.until = t + 5; return; }
    if (night && r < 0.4) { s.st = 'rest'; s.until = t + rand(4, 9); return; }
    s.st = 'swim'; s.tx = rand(FISHWATER.x + 25, FISHWATER.x + FISHWATER.w - 25); s.ty = rand(FISHWATER.top + 40, FISHWATER.bot - 22);
    s.until = t + rand(3, 7); return;
  }
  if (p.type === 'bird') {
    if (night && r < 0.6) { s.st = 'sleep'; s.until = t + rand(6, 14); return; }
    if (r < 0.35 && PERCHES.length) { s.st = 'fly'; const i = Math.floor(Math.random() * PERCHES.length); [s.tx, s.ty] = PERCHES[i]; s.until = t + 12; return; }
    if (r < 0.5) { s.st = 'sing'; s.until = t + rand(2, 4); return; }
    s.st = 'perch'; s.until = t + rand(2, 6); return;
  }
  if (night && r < 0.55) { s.st = 'sleep'; s.until = t + rand(8, 18); return; }
  if (hunger < 12 && r < 0.5) { s.st = 'sad'; s.tx = BOWL_X; s.until = t + rand(4, 8); return; }
  if (!night && mood > 55 && r < 0.18) { s.st = 'happy'; s.until = t + rand(1.5, 3); return; }
  if (p.type === 'seal' && !night && r < 0.22) { s.st = 'clap'; s.until = t + rand(2.2, 4); return; }
  if (p.type === 'seal' && POOL && !night && r < 0.35) { s.st = 'pool'; s.tx = POOL.cx + rand(-POOL.rx * 0.55, POOL.rx * 0.55); s.until = t + rand(4, 9); return; }
  if (p.type === 'cat' && TANK && !night && r < 0.28) { s.st = 'watch'; s.tx = TANK.x - 26; s.until = t + rand(4, 8); return; }
  if (['cat', 'dog'].includes(p.type) && TREE_PLATS.length && !night && r < 0.28) {
    const plat = pick(TREE_PLATS);
    s.st = 'tojump'; s.tx = plat[0]; s.jx = plat[0]; s.jy = plat[1]; s.until = t + 12; return;
  }
  if (['cat', 'dog', 'seal'].includes(p.type) && LITTER_X && !night && r < 0.18) {
    s.st = 'tolitter'; s.tx = LITTER_X; s.until = t + 10; return;
  }
  if (FURN.bed && !night && r < 0.12) {
    s.st = 'walk'; s.tx = FURN.bed.x + 40; s.until = t + 8; return;
  }
  if (r < 0.55) { s.st = 'walk'; s.tx = rand(90, ROOM_W - 90); s.until = t + 20; return; }
  s.st = 'idle'; s.until = t + rand(1.5, 4);
}

function updatePet(p, s, dt) {
  const t = now();
  s.phase += dt * 6;
  const speed = { dog: 85, cat: 70, bird: 130, fish: 60, seal: 45 }[p.type];

  if (p.type === 'fish') {
    if (s.st === 'swim') {
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d < 6 || t > s.until) decideNext(p, s);
      else { s.x += dx / d * speed * dt; s.y += dy / d * speed * dt * 0.7; s.dir = dx >= 0 ? 1 : -1; }
      if (Math.random() < 0.01) fx('bubble', s.x + s.dir * 12, s.y - 6);
    } else if (s.st === 'eatf') {
      if (FISHWATER) { s.y += (FISHWATER.top + 22 - s.y) * 4 * dt; s.x += (s.tx - s.x) * 3 * dt; }
      if (t > s.until) { fx('heart', s.x, s.y - 14); decideNext(p, s); }
      if (Math.random() < 0.12) fx('bubble', s.x, s.y - 8);
    } else if (t > s.until) decideNext(p, s);
    return;
  }

  if (p.type === 'bird') {
    if (s.st === 'fly' || s.st === 'eatb') {
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d < 8) { if (s.st === 'eatb') { s.st = 'eat'; s.until = t + 3; } else decideNext(p, s); }
      else { s.x += dx / d * speed * dt; s.y += dy / d * speed * dt + Math.sin(s.phase * 2) * 0.5; s.dir = dx >= 0 ? 1 : -1; }
    } else if (s.st === 'sing') {
      if (Math.random() < 0.08) fx('note', s.x + rand(-6, 6), s.y - 18);
      if (t > s.until) decideNext(p, s);
    } else if (s.st === 'eat') {
      if (Math.random() < 0.1) fx('crumb', s.x + rand(-8, 8), s.y + 6, { col: '#e8d48a' });
      if (t > s.until) { fx('heart', s.x, s.y - 16); notif(s.x, s.y - 30, '啾！'); decideNext(p, s); }
    } else {
      if (s.st === 'sleep' && Math.random() < 0.008) fx('zzz', s.x + 8, s.y - 16);
      if (t > s.until) decideNext(p, s);
    }
    return;
  }

  const walkTo = tx => {
    const dx = tx - s.x;
    if (Math.abs(dx) < 6) return true;
    s.dir = dx >= 0 ? 1 : -1;
    s.x += s.dir * speed * dt;
    return false;
  };
  switch (s.st) {
    case 'walk': if (walkTo(s.tx) || t > s.until) decideNext(p, s); break;
    case 'sad':
      if (walkTo(s.tx)) { if (Math.random() < 0.006) fx('drop', s.x + s.dir * 8, s.y - 24); }
      if (t > s.until) decideNext(p, s); break;
    case 'pool':
      if (walkTo(s.tx) && POOL) { if (Math.random() < 0.02) fx('splash', s.x + rand(-14, 14), POOL.cy - 4); }
      if (t > s.until) decideNext(p, s); break;
    case 'watch':
      if (walkTo(s.tx)) {
        s.dir = 1;
        if (Math.random() < 0.01) for (const q of state.pets) {
          if (q.type === 'fish' && FISHWATER && Math.random() < 0.5) { const qs = sims[q.id]; qs.st = 'swim'; qs.tx = rand(FISHWATER.x + 25, FISHWATER.x + FISHWATER.w - 25); qs.ty = rand(FISHWATER.top + 40, FISHWATER.bot - 22); qs.until = now() + 2; }
        }
      }
      if (t > s.until) decideNext(p, s); break;
    case 'tojump':
      if (walkTo(s.tx)) {
        s.st = 'jump'; s.jx0 = s.x; s.jy0 = FLOOR_Y; s.jprog = 0; s.until = t + 1.1;
      } else if (t > s.until) decideNext(p, s);
      break;
    case 'jump': {
      s.jprog = Math.min(1, s.jprog + dt / 0.7);
      const u = s.jprog;
      s.x = s.jx0 + (s.jx - s.jx0) * u;
      s.y = s.jy0 + (s.jy - s.jy0) * u - Math.sin(u * Math.PI) * 46;
      s.dir = (s.jx - s.jx0) >= 0 ? 1 : -1;
      if (u >= 1) { s.x = s.jx; s.y = s.jy; s.st = 'ontree'; s.until = t + rand(3, 8); }
      break;
    }
    case 'ontree':
      if (t > s.until) {
        s.st = 'jump'; s.jx0 = s.x; s.jy0 = s.y; s.jx = s.x + rand(-20, 20); s.jy = FLOOR_Y; s.jprog = 0; s.until = t + 1.1;
      }
      break;
    case 'tolitter':
      if (walkTo(s.tx)) { s.st = 'litter'; s.until = t + rand(2.2, 4); }
      else if (t > s.until) decideNext(p, s);
      break;
    case 'litter':
      s.y = FLOOR_Y;
      if (Math.random() < 0.12) fx('crumb', s.x + rand(-10, 10), FLOOR_Y - 2, { col: '#e2c48a' });
      if (t > s.until) { fx('heart', s.x, s.y - 28); decideNext(p, s); }
      break;
    case 'eatg':
      if (walkTo(s.tx)) { s.st = 'eat'; s.until = t + 3.2; }
      break;
    case 'eat':
      if (Math.random() < 0.12) fx('crumb', s.x + s.dir * 14 + rand(-4, 4), FLOOR_Y - 4, { col: '#d9a45a' });
      if (t > s.until) { fx('heart', s.x, s.y - 30); notif(s.x, s.y - 44, petSfx(p, 'eat'), '#ffd9a0'); decideNext(p, s); }
      break;
    case 'chase': {
      const q = sims[s.partner];
      if (!q || t > s.until) { notif(s.x, s.y - 40, '汪汪！'); decideNext(p, s); break; }
      walkTo(q.x - 30 * Math.sign(q.x - s.x || 1));
      break;
    }
    case 'flee':
      if (walkTo(s.tx) || t > s.until) { s.st = 'idle'; s.until = t + 2; }
      break;
    case 'cuddle':
      if (walkTo(s.tx)) { if (Math.random() < 0.03) fx('heart', s.x + rand(-10, 10), s.y - 34); }
      if (t > s.until) decideNext(p, s); break;
    case 'clap':
      if (Math.random() < 0.09) notif(s.x + rand(-8, 8), s.y - 40, pick(['啪！', '啪啪', '啪啪啪']), '#ffe9b0');
      if (t > s.until) decideNext(p, s); break;
    case 'happy':
      if (s.st !== 'ontree') s.y = FLOOR_Y - Math.abs(Math.sin(s.phase * 1.6)) * 10;
      if (t > s.until) { if (s.st !== 'ontree') s.y = FLOOR_Y; decideNext(p, s); }
      break;
    case 'sleep':
      if (Math.random() < 0.008) fx('zzz', s.x + 12, s.y - 26);
      if (t > s.until) decideNext(p, s); break;
    default:
      if (t > s.until) decideNext(p, s);
  }
}

function tryPairEvent() {
  if (!state || state.pets.length < 2) return;
  const pets = state.pets;
  const ground = pets.filter(p => ['dog', 'cat', 'seal'].includes(p.type) && ['idle', 'walk'].includes(sims[p.id].st));
  const r = Math.random();
  if (r < 0.3) {
    const dogs = ground.filter(p => p.type === 'dog'), cats = ground.filter(p => p.type === 'cat');
    if (dogs.length && cats.length) {
      const d = pick(dogs), c = pick(cats), ds = sims[d.id], cs = sims[c.id];
      ds.st = 'chase'; ds.partner = c.id; ds.until = now() + 5;
      if (TREE_PLATS.length) {
        const plat = pick(TREE_PLATS);
        cs.st = 'tojump'; cs.tx = plat[0]; cs.jx = plat[0]; cs.jy = plat[1]; cs.until = now() + 8;
      } else {
        cs.st = 'flee'; cs.tx = rand(90, ROOM_W - 90); cs.until = now() + 5;
      }
      notif(cs.x, cs.y - 44, '喵！！', '#ffc8c8');
      return;
    }
  }
  if (r < 0.55 && ground.length >= 2) {   // 同一個家的寵物本就同主人：隨機兩隻依偎
    const [a, b] = [pick(ground), pick(ground)];
    if (a.id !== b.id) {
      const as = sims[a.id], bs = sims[b.id], mid = (as.x + bs.x) / 2;
      as.st = 'cuddle'; as.tx = mid - 16; as.until = now() + 5;
      bs.st = 'cuddle'; bs.tx = mid + 16; bs.until = now() + 5;
      return;
    }
  }
  if (r < 0.75) {
    const seals = pets.filter(p => p.type === 'seal' && ['idle', 'walk', 'pool'].includes(sims[p.id].st));
    if (seals.length) {
      for (const p of seals) { const s = sims[p.id]; s.st = 'clap'; s.until = now() + 3; }
      const s0 = sims[seals[0].id];
      notif(s0.x, s0.y - 44, '啪啪啪', '#ffe9b0');
      return;
    }
  }
  const birds = pets.filter(p => p.type === 'bird' && sims[p.id].st === 'perch');
  const seals2 = pets.filter(p => p.type === 'seal' && ['idle', 'clap'].includes(sims[p.id].st));
  if (birds.length && seals2.length) {
    const b = sims[pick(birds).id], sl = sims[pick(seals2).id];
    b.st = 'fly'; b.tx = sl.x; b.ty = sl.y - 44; b.until = now() + 10;
  }
}

// ── 投餵（真實寫回：POST → 佇列 → bot 套用）──────────────
async function doFeed(id) {
  const p = petById(id), s = sims[id];
  if (!p || !s) return;
  $('feedmsg').textContent = '投餵中…';
  try {
    const r = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=feed&pet_id=' + id,
    });
    const d = await r.json();
    if (d.ok) {
      const live = liveStats(p);
      p.hunger = Math.min(100, live.hunger + (d.gain || 6));
      p.mood = live.mood;
      p.age_h = 0; fetchedAt = Date.now();
      playFeedAnim(p, s);
      $('feedmsg').textContent = d.msg || '投餵成功！';
    } else {
      $('feedmsg').textContent = d.msg || '暫時無法投餵。';
    }
  } catch (e) {
    $('feedmsg').textContent = '連線失敗，稍後再試。';
  }
  updateCard();
}

function playFeedAnim(p, s) {
  if (p.type === 'fish' && FISHWATER) {
    s.st = 'eatf'; s.tx = clamp(s.x, FISHWATER.x + 30, FISHWATER.x + FISHWATER.w - 30); s.until = now() + 3;
    for (let i = 0; i < 8; i++) fx('crumb', s.tx + rand(-18, 18), FISHWATER.top + rand(12, 24), { col: '#e8b86a', life: 2.5 });
  } else if (p.type === 'bird' && FURN.birdstand) {
    s.st = 'eatb'; s.tx = FURN.birdstand.x + 60; s.ty = FLOOR_Y - 90;
    for (let i = 0; i < 8; i++) fx('pour', FURN.birdstand.x + 60 + rand(-8, 8), FLOOR_Y - 116, { col: '#e8d48a' });
  } else if (p.type === 'bird') {
    s.st = 'eat'; s.until = now() + 3;
  } else {
    s.st = 'eatg'; s.tx = BOWL_X + rand(-6, 6);
    for (let i = 0; i < 8; i++) fx('pour', BOWL_X + rand(-8, 8), FLOOR_Y - 40, { col: '#d9a45a' });
  }
  notif(s.x, s.y - 52, '🍽️ 愛心投餵！');
}

// ── 場景繪製 ─────────────────────────────────────────────
function sx(wx) { return wx - camX; }

function drawRoom(ambv) {
  const wall = dimC('#c8a878', ambv), wallDk = dimC('#a88858', ambv);
  const fl = dimC('#9a7248', ambv), flDk = dimC('#7e5c38', ambv);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, FLOOR_Y);
  ctx.fillStyle = fl; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  ctx.strokeStyle = flDk; ctx.lineWidth = 1;
  for (let y = FLOOR_Y + 10; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let wx = Math.floor(camX / 80) * 80; wx < camX + W + 80; wx += 80) {
    const v = sx(wx); ctx.beginPath(); ctx.moveTo(v, FLOOR_Y); ctx.lineTo(v, H); ctx.stroke();
  }
  ctx.fillStyle = dimC('#7a5a30', ambv); ctx.fillRect(0, FLOOR_Y - 5, W, 5);   // 踢腳線
  ctx.strokeStyle = wallDk;
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y - 118); ctx.lineTo(W, FLOOR_Y - 118); ctx.stroke();  // 牆腰線
  // 地毯
  const rug = sx(ROOM_W / 2);
  ctx.fillStyle = dimC('#a85c50', ambv);
  ctx.beginPath(); ctx.ellipse(rug, FLOOR_Y + 42, 150, 26, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = dimC('#8a4640', ambv); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(rug, FLOOR_Y + 42, 122, 19, 0, 0, 7); ctx.stroke();
}

function drawWindow(fx0, key, ambv) {
  const wx = sx(fx0), wy = 96, ww = 150, wh = 130;
  if (wx > W + 10 || wx + ww < -10) return;
  const open = curtains[key] !== false;
  if (open && curtainAnim[key] < 1) curtainAnim[key] = Math.min(1, curtainAnim[key] + 0.04);
  if (!open && curtainAnim[key] > 0) curtainAnim[key] = Math.max(0, curtainAnim[key] - 0.04);
  const p = dayPhase();
  ctx.fillStyle = getSkyColor(); ctx.fillRect(wx, wy, ww, wh);
  // 窗外：星（夜）、太陽/月、雲
  if (p < 0.25 || p > 0.75) {
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 12; i++) ctx.fillRect(wx + (i * 37 + 11) % ww, wy + (i * 23 + 7) % (wh - 30), 2, 2);
    ctx.fillStyle = '#f0ebd2'; ctx.beginPath(); ctx.arc(wx + ww - 34, wy + 28, 11, 0, 7); ctx.fill();
    ctx.fillStyle = getSkyColor(); ctx.beginPath(); ctx.arc(wx + ww - 39, wy + 24, 9, 0, 7); ctx.fill();
  } else {
    const sunT = clamp((p - 0.25) / 0.5, 0, 1);
    ctx.fillStyle = 'rgba(255,236,160,.95)';
    ctx.beginPath(); ctx.arc(wx + 20 + sunT * (ww - 40), wy + 90 - Math.sin(sunT * Math.PI) * 62, 12, 0, 7); ctx.fill();
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();   // 雲只能出現在窗框內
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  const cx0 = (frame * 0.15) % (ww + 60) - 30;
  ctx.beginPath(); ctx.ellipse(wx + cx0, wy + 34, 20, 6, 0, 0, 7); ctx.fill();
  // 💘 青春物語：星璃線 N5+ 且台北夜間——遠山上有一點觀測站的燈（十行的詩意）
  if (state && state.romance && state.romance.window_light) {
    const gl = 0.6 + Math.sin(frame / 25) * 0.3;
    ctx.fillStyle = 'rgba(60,50,80,.9)';
    ctx.beginPath(); ctx.moveTo(wx + 8, wy + wh); ctx.lineTo(wx + 44, wy + wh - 34);
    ctx.lineTo(wx + 80, wy + wh); ctx.fill();                    // 遠山剪影
    ctx.fillStyle = `rgba(255,224,150,${gl})`;
    ctx.fillRect(wx + 42, wy + wh - 38, 4, 4);                   // 觀測站的燈
    ctx.fillStyle = `rgba(255,224,150,${gl * 0.25})`;
    ctx.beginPath(); ctx.arc(wx + 44, wy + wh - 36, 8, 0, 7); ctx.fill();
  }
  ctx.restore();
  // 窗框
  ctx.strokeStyle = dimC('#6a4a2a', ambv); ctx.lineWidth = 6; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  // 窗簾（anim 1=全開露出天空，0=合上）
  const ca = curtainAnim[key] == null ? 1 : curtainAnim[key];
  const cover = (1 - ca) * (ww / 2 - 4);
  ctx.fillStyle = dimC('#c45a5a', ambv);
  ctx.fillRect(wx + 3, wy + 3, 10 + cover, wh - 6);
  ctx.fillRect(wx + ww - 13 - cover, wy + 3, 10 + cover, wh - 6);
  ctx.fillStyle = dimC('#a84848', ambv);
  ctx.fillRect(wx + 3, wy + 3, 6, wh - 6);
  ctx.fillRect(wx + ww - 9, wy + 3, 6, wh - 6);
  // 窗台
  ctx.fillStyle = dimC('#8a6a40', ambv); ctx.fillRect(wx - 8, wy + wh, ww + 16, 7);
}

function drawClock(ambv) {
  const f = FURN.clock;
  if (!f) return;
  const cx = sx(f.x), cy = f.y, r = f.r;
  if (cx < -r - 16 || cx > W + r + 16) return;
  const D = h => dimC(h, ambv);
  // 掛釘 + 細繩
  ctx.strokeStyle = D('#6a4a2a');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - r - 1);
  ctx.lineTo(cx, cy - r - 16);
  ctx.lineTo(cx + 9, cy - r - 1);
  ctx.stroke();
  ctx.fillStyle = D('#4a3220');
  ctx.beginPath(); ctx.arc(cx, cy - r - 16, 2.6, 0, 7); ctx.fill();
  // 外框（深木 + 淺木）
  ctx.fillStyle = D('#5a3c24');
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, 7); ctx.fill();
  ctx.fillStyle = D('#8a6240');
  ctx.beginPath(); ctx.arc(cx, cy, r + 3.5, 0, 7); ctx.fill();
  // 錶面
  ctx.fillStyle = D('#f4ead4');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = D('#c8b490');
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2.5, 0, 7); ctx.stroke();
  // 刻度：12/3/6/9 加長，其餘小點
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 - Math.PI / 2;
    const major = i % 3 === 0;
    if (major) {
      ctx.strokeStyle = D('#3a2818');
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 11), cy + Math.sin(a) * (r - 11));
      ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
      ctx.stroke();
    } else {
      ctx.fillStyle = D('#8a7058');
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6), 1.6, 0, 7);
      ctx.fill();
    }
  }
  // 屋內加速日：跟窗外日夜同一套相位（一天 ≈ 1 分鐘）
  const p = dayPhase();
  const hours24 = p * 24;
  const ha = (hours24 / 12) * Math.PI * 2 - Math.PI / 2;   // 時針：一天兩圈
  const ma = hours24 * Math.PI * 2 - Math.PI / 2;           // 分針：一小時一圈
  const sa = p * 60 * Math.PI * 2 - Math.PI / 2;             // 秒針：一天六十圈（看得見在走）
  ctx.lineCap = 'round';
  // 時針
  ctx.strokeStyle = D('#221510');
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(ha) * 5, cy - Math.sin(ha) * 5);
  ctx.lineTo(cx + Math.cos(ha) * (r * 0.48), cy + Math.sin(ha) * (r * 0.48));
  ctx.stroke();
  // 分針
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(ma) * 6, cy - Math.sin(ma) * 6);
  ctx.lineTo(cx + Math.cos(ma) * (r * 0.72), cy + Math.sin(ma) * (r * 0.72));
  ctx.stroke();
  // 秒針
  ctx.strokeStyle = D('#c05a50');
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(sa) * 8, cy - Math.sin(sa) * 8);
  ctx.lineTo(cx + Math.cos(sa) * (r * 0.84), cy + Math.sin(sa) * (r * 0.84));
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 軸心
  ctx.fillStyle = D('#c05a50');
  ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, 7); ctx.fill();
  ctx.fillStyle = D('#f4ead4');
  ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, 7); ctx.fill();
}

function drawLamp(ambv) {
  const lx = sx(FURN.sofa.x - 40);
  if (lx < -40 || lx > W + 40) return;
  ctx.fillStyle = dimC('#6a4a2a', ambv);
  ctx.fillRect(lx - 2, FLOOR_Y - 150, 5, 150);
  ctx.fillRect(lx - 16, FLOOR_Y - 4, 33, 4);
  if (ambv < 0.85) {   // 夜間暖光暈
    const g = ctx.createRadialGradient(lx, FLOOR_Y - 160, 4, lx, FLOOR_Y - 160, 120);
    g.addColorStop(0, 'rgba(255,214,130,.5)'); g.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, FLOOR_Y - 160, 120, 0, 7); ctx.fill();
  }
  ctx.fillStyle = dimC('#e8b45a', 1);
  ctx.beginPath(); ctx.moveTo(lx - 20, FLOOR_Y - 150); ctx.lineTo(lx + 22, FLOOR_Y - 150); ctx.lineTo(lx + 14, FLOOR_Y - 178); ctx.lineTo(lx - 12, FLOOR_Y - 178); ctx.closePath(); ctx.fill();
}

function drawFurniture(ambv) {
  const D = h => dimC(h, ambv);
  // 書架
  let f = FURN.bookshelf, x = sx(f.x);
  if (x > -f.w - 20 && x < W + 20) {
    ctx.fillStyle = D('#8a6240'); ctx.fillRect(x, FLOOR_Y - 200, f.w, 200);
    ctx.fillStyle = D('#6a4a2e');
    for (const sy of [46, 96, 146]) ctx.fillRect(x + 6, FLOOR_Y - 200 + sy, f.w - 12, 6);
    const rng = mulberry32(hashStr(ownerName + '|books'));
    const cols = ['#c05a50', '#5a80b8', '#6aa060', '#c8a04a', '#8a62a8'];
    for (let sh = 0; sh < 3; sh++) for (let b = 0; b < 7; b++) {
      if (rng() < 0.25) continue;
      ctx.fillStyle = D(cols[Math.floor(rng() * cols.length)]);
      ctx.fillRect(x + 10 + b * 13, FLOOR_Y - 194 + sh * 50, 10, 40 - rng() * 8);
    }
  }
  // 沙發
  f = FURN.sofa; x = sx(f.x);
  if (x > -f.w - 20 && x < W + 20) {
    ctx.fillStyle = D('#7a8a5a');
    ctx.fillRect(x, FLOOR_Y - 62, f.w, 30);
    ctx.fillRect(x, FLOOR_Y - 90, 22, 60); ctx.fillRect(x + f.w - 22, FLOOR_Y - 90, 22, 60);
    ctx.fillStyle = D('#697a4c'); ctx.fillRect(x + 20, FLOOR_Y - 34, f.w - 40, 34);
    ctx.fillStyle = D('#8a9a6a'); ctx.fillRect(x + 24, FLOOR_Y - 58, (f.w - 48) / 2 - 3, 24); ctx.fillRect(x + f.w / 2 + 3, FLOOR_Y - 58, (f.w - 48) / 2 - 3, 24);
  }
  // 碗區（狗貓海豹通用）
  f = FURN.bowls; x = sx(f.x);
  if (x > -f.w - 20 && x < W + 20) {
    ctx.fillStyle = D('#8a5a2e'); ctx.fillRect(x, FLOOR_Y - 9, 28, 9);
    ctx.fillStyle = D('#d9a45a'); ctx.fillRect(x + 4, FLOOR_Y - 12, 20, 4);
    ctx.fillStyle = D('#5a80b8'); ctx.fillRect(x + 40, FLOOR_Y - 9, 26, 9);
    ctx.fillStyle = D('#a8cae8'); ctx.fillRect(x + 44, FLOOR_Y - 11, 18, 3);
  }
  // 狗窩
  if (FURN.kennel) {
    f = FURN.kennel; x = sx(f.x);
    if (x > -f.w - 20 && x < W + 20) {
      ctx.fillStyle = D('#a8703c'); ctx.fillRect(x, FLOOR_Y - 66, f.w - 20, 66);
      ctx.fillStyle = D('#8a5a2e');
      ctx.beginPath(); ctx.moveTo(x - 8, FLOOR_Y - 62); ctx.lineTo(x + (f.w - 20) / 2, FLOOR_Y - 94); ctx.lineTo(x + f.w - 12, FLOOR_Y - 62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = D('#3a2818');
      ctx.beginPath(); ctx.arc(x + (f.w - 20) / 2, FLOOR_Y - 26, 20, Math.PI, 0); ctx.fill();
      ctx.fillRect(x + (f.w - 20) / 2 - 20, FLOOR_Y - 26, 40, 26);
    }
  }
  // 小床
  if (FURN.bed) {
    f = FURN.bed; x = sx(f.x);
    if (x > -f.w - 20 && x < W + 20) {
      ctx.fillStyle = D('#a04040'); ctx.fillRect(x, FLOOR_Y - 18, f.w, 18);
      ctx.fillStyle = D('#e8c898'); ctx.fillRect(x + 8, FLOOR_Y - 14, f.w - 16, 10);
      ctx.fillStyle = D('#f8e4b8'); ctx.fillRect(x + 14, FLOOR_Y - 18, 22, 7);
    }
  }
  // 大型盆栽
  if (FURN.plant) {
    f = FURN.plant; x = sx(f.x);
    if (x > -f.w - 20 && x < W + 20) {
      ctx.fillStyle = D('#8a5a2e'); ctx.fillRect(x + 12, FLOOR_Y - 16, 26, 16);
      ctx.fillStyle = D('#308020'); ctx.fillRect(x + 22, FLOOR_Y - 52, 6, 36);
      ctx.fillStyle = D('#48a030');
      ctx.beginPath(); ctx.ellipse(x + 16, FLOOR_Y - 48, 12, 8, -0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 34, FLOOR_Y - 52, 12, 8, 0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 25, FLOOR_Y - 62, 10, 9, 0, 0, 7); ctx.fill();
    }
  }
  // 貓跳台
  if (FURN.cattree) {
    f = FURN.cattree; x = sx(f.x);
    if (x > -f.w - 20 && x < W + 20) {
      ctx.fillStyle = D('#bca878');
      ctx.fillRect(x + 28, FLOOR_Y - 170, 12, 170);
      ctx.strokeStyle = D('#a08858'); ctx.lineWidth = 1;
      for (let y = FLOOR_Y - 168; y < FLOOR_Y; y += 6) { ctx.beginPath(); ctx.moveTo(x + 28, y); ctx.lineTo(x + 40, y); ctx.stroke(); }
      ctx.fillStyle = D('#8a6a40');
      ctx.fillRect(x - 6, FLOOR_Y - 8, 64, 8);
      ctx.fillRect(x - 2, FLOOR_Y - 104, 54, 8);
      ctx.fillRect(x - 10, FLOOR_Y - 156, 68, 8);
      ctx.fillStyle = D('#a08858');
      ctx.fillRect(x - 6, FLOOR_Y - 10, 64, 4);
      ctx.fillRect(x - 2, FLOOR_Y - 106, 54, 4);
      ctx.fillRect(x - 10, FLOOR_Y - 158, 68, 4);
      const ts = Math.sin(frame * 0.08) * 6;
      ctx.strokeStyle = D('#888'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 52, FLOOR_Y - 158); ctx.lineTo(x + 52 + ts, FLOOR_Y - 136); ctx.stroke();
      ctx.fillStyle = D('#e83030'); ctx.beginPath(); ctx.arc(x + 52 + ts, FLOOR_Y - 134, 4, 0, 7); ctx.fill();
    }
  }
  // 地上沙坑
  if (FURN.litter) {
    f = FURN.litter; x = sx(f.x);
    if (x > -f.w - 20 && x < W + 20) {
      ctx.fillStyle = D('#8a6a40'); ctx.fillRect(x, FLOOR_Y - 10, f.w, 12);
      ctx.fillStyle = D('#e8d4a0'); ctx.fillRect(x + 4, FLOOR_Y - 8, f.w - 8, 8);
      ctx.fillStyle = D('#d4bc84');
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + i * 9, FLOOR_Y - 6, 4, 3);
    }
  }
  // 鳥棲架
  if (FURN.birdstand) {
    f = FURN.birdstand; x = sx(f.x + 60);
    if (x > -160 && x < W + 160) {
      ctx.fillStyle = D('#8a6a44');
      ctx.fillRect(x - 4, FLOOR_Y - 182, 8, 182);
      ctx.fillRect(x - 40 - 42, FLOOR_Y - 150 + 8, 84, 5);
      ctx.fillRect(x + 40 - 42, FLOOR_Y - 118 + 8, 84, 5);
      ctx.fillRect(x - 34, FLOOR_Y - 62 + 8, 68, 5);
      ctx.fillStyle = D('#c9b183'); ctx.fillRect(x - 20, FLOOR_Y - 86, 40, 6);   // 飼料盤
    }
  }
  // 魚缸
  if (TANK) {
    x = sx(TANK.x);
    if (x > -TANK.w - 30 && x < W + 30) {
      ctx.fillStyle = D('#6a5636'); ctx.fillRect(x - 8, FLOOR_Y - 18, TANK.w + 16, 18);
      ctx.fillStyle = 'rgba(120,190,230,.30)'; ctx.fillRect(x, TANK.top, TANK.w, TANK.bot - TANK.top);
      ctx.fillStyle = 'rgba(90,160,210,.45)'; ctx.fillRect(x, TANK.top + 10, TANK.w, 5);
      ctx.strokeStyle = 'rgba(220,240,255,.5)'; ctx.lineWidth = 3; ctx.strokeRect(x, TANK.top, TANK.w, TANK.bot - TANK.top);
      ctx.fillStyle = D('#4c743c');
      for (const gx of [26, 90, 170]) for (let i = 0; i < 3; i++)
        ctx.fillRect(x + gx + i * 7, TANK.bot - 34 - Math.sin(frame / 30 + gx + i) * 5 - i * 7, 4, 34 + i * 7);
      ctx.fillStyle = D('#c9b183'); ctx.fillRect(x, TANK.bot - 7, TANK.w, 7);
    }
  }
  // 海豹池
  if (POOL) {
    x = sx(POOL.cx);
    if (x > -POOL.rx - 50 && x < W + POOL.rx + 50) {
      ctx.fillStyle = D('#7fa8b8'); ctx.beginPath(); ctx.ellipse(x, POOL.cy, POOL.rx + 10, POOL.ry + 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(110,190,230,.85)'; ctx.beginPath(); ctx.ellipse(x, POOL.cy, POOL.rx, POOL.ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.ellipse(x - 30 + Math.sin(frame / 40) * 10, POOL.cy - 3, 22, 3, 0, 0, 7); ctx.fill();
    }
  }
}

function drawGearRow(gear, startX, y0, ambv, perRow, maxShow) {
  ctx.textAlign = 'center';
  // 珍藏無上限（2026-09-08）：掛不下的用「＋N」小牌表示，全清單看側欄
  if (gear.length > maxShow) {
    const n = gear.length - (maxShow - 1);
    const i = maxShow - 1;
    const gx = sx(startX + (i % perRow) * 66), gy = y0 + Math.floor(i / perRow) * 64;
    if (gx > -60 && gx < W + 60) {
      ctx.fillStyle = dimC('#2e2416', ambv); ctx.fillRect(gx, gy, 48, 48);
      ctx.strokeStyle = dimC('#8a6a3a', Math.max(ambv, 0.8)); ctx.lineWidth = 2; ctx.strokeRect(gx, gy, 48, 48);
      ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = dimC('#d9b877', Math.max(ambv, 0.85));
      ctx.fillText('+' + n, gx + 24, gy + 30);
    }
    maxShow = maxShow - 1;
  }
  gear.slice(0, maxShow).forEach((g, i) => {
    const gx = sx(startX + (i % perRow) * 66), gy = y0 + Math.floor(i / perRow) * 64;
    if (gx < -60 || gx > W + 60) return;
    const col = RARITY_COL[g.it.r] || '#9aa4ae';
    ctx.fillStyle = dimC('#3a2c1c', ambv); ctx.fillRect(gx, gy, 48, 48);
    ctx.strokeStyle = dimC(col, Math.max(ambv, 0.8)); ctx.lineWidth = 2.5; ctx.strokeRect(gx, gy, 48, 48);
    ctx.font = '22px sans-serif'; ctx.fillText(g.it.e || '❔', gx + 24, gy + 32);
    if (g.enh > 0) { ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#ffd97a'; ctx.fillText('+' + g.enh, gx + 38, gy + 12); }
    if (g.qty > 1) { ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#e8ddc8'; ctx.fillText('×' + g.qty, gx + 38, gy + 44); }
    ctx.strokeStyle = dimC('#6a4a2a', ambv); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx + 24, gy); ctx.lineTo(gx + 24, gy - 8); ctx.stroke();
  });
}

function drawGearWall(ambv) {
  const lv = state.home_lv || 1;
  const startX = 540, perRow = 6 + Math.max(0, lv - 1);
  const maxShow = perRow * 2;
  const vault = vaultGear();
  const stash = stashGear();
  const yVault = FLOOR_Y - 300;
  const yStash = FLOOR_Y - 232;
  if (!vault.length && !stash.length) {
    const x = sx(startX);
    if (x > -220 && x < W + 20) {
      ctx.font = '11px "Noto Sans TC", sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(90,64,40,.55)';
      ctx.fillText('（牆上空空的——/store 珍藏會掛上排，/craft store 保管區掛下排）', x, yVault + 34);
    }
    return;
  }
  if (vault.length) {
    ctx.font = '10px "Noto Sans TC", sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = dimC('#6a4a2a', ambv);
    ctx.fillText('珍藏', sx(startX), yVault - 10);
    // 保管區有東西時珍藏只掛一排，避免第二排（y+64）壓到保管區那排
    drawGearRow(vault, startX, yVault, ambv, perRow, stash.length ? perRow : maxShow);
  }
  if (stash.length) {
    ctx.font = '10px "Noto Sans TC", sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = dimC('#6a4a2a', ambv);
    ctx.fillText('保管區', sx(startX), yStash - 10);
    drawGearRow(stash, startX, yStash, ambv, perRow, maxShow);
  }
}

// ── 寵物繪製（像素塊風，與樂園版同款）────────────────────
// 💘 羈絆相框：走完誰的十章，客廳牆上就多一格她的小相框（/lovehide 時 api 不回傳）
const ROMANCE_META = { xingli: ['🔭', '星璃'], youtao: ['🎀', '柚桃'], tiya: ['💎', '緹亞'] };
function drawRomanceFrames(ambv) {
  const frames = (state && state.romance && state.romance.frames) || [];
  if (!frames.length) return;
  const x0 = 380, y0 = 270;                    // 窗台右下方的空牆（避開窗、時鐘與裝備牆）
  ctx.textAlign = 'center';
  frames.forEach((k, i) => {
    const meta = ROMANCE_META[k];
    if (!meta) return;
    const gx = sx(x0 + i * 58);
    if (gx < -60 || gx > W + 60) return;
    ctx.strokeStyle = dimC('#6a4a2a', ambv); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx + 22, y0); ctx.lineTo(gx + 22, y0 - 8); ctx.stroke();  // 掛繩
    ctx.fillStyle = dimC('#fdf6e8', ambv); ctx.fillRect(gx, y0, 44, 50);
    ctx.strokeStyle = dimC('#c9a24a', ambv); ctx.lineWidth = 3; ctx.strokeRect(gx, y0, 44, 50);
    ctx.font = '20px sans-serif'; ctx.fillText(meta[0], gx + 22, y0 + 27);
    ctx.font = '9px "Noto Sans TC", sans-serif'; ctx.fillStyle = dimC('#8a6a40', ambv);
    ctx.fillText(meta[1], gx + 22, y0 + 44);
  });
}

// 🧭 尋寶奇譚戰利品：通關後客廳牆上的展示座（相框左側的空牆）。
// 第一部羅盤(compass) + 第二部三線各一件，依已通關的 relics 沿牆一字排開。
const TROPHY_INFO = {
  compass:   { emoji: '🧭', name: '星圖羅盤', glow: '#9fd8ff' },
  tidebell:  { emoji: '🐚', name: '潮鳴螺鐘', glow: '#7fd8ff' },
  everlamp:  { emoji: '🏮', name: '不熄螢燈', glow: '#9bffb0' },
  hourglass: { emoji: '⏳', name: '星砂逆漏', glow: '#ffd489' },
};
function drawTrophyShelf(ambv) {
  if (!(state && state.treasure)) return;
  let relics = state.treasure.relics;
  if (!(relics && relics.length)) relics = state.treasure.done ? ['compass'] : [];  // 舊資料相容
  if (!relics.length) return;
  const x0 = 306, y0 = 268, STEP = 62;         // 窗與相框之間的空牆，每件間距 62
  ctx.textAlign = 'center';
  relics.forEach((key, i) => {
    const info = TROPHY_INFO[key];
    if (!info) return;
    const gx = sx(x0 + i * STEP);
    if (gx < -80 || gx > W + 80) return;
    // 木托座＋掛繩
    ctx.strokeStyle = dimC('#6a4a2a', ambv); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx + 26, y0); ctx.lineTo(gx + 26, y0 - 8); ctx.stroke();
    ctx.fillStyle = dimC('#4a3320', ambv); ctx.fillRect(gx, y0 + 40, 52, 8);
    // 底板（深色絨面）＋金框
    ctx.fillStyle = dimC('#2a2038', ambv); ctx.fillRect(gx + 2, y0, 48, 42);
    ctx.strokeStyle = dimC('#c9a24a', ambv); ctx.lineWidth = 3; ctx.strokeRect(gx + 2, y0, 48, 42);
    // 星屑微光（呼吸；每件相位錯開）
    const glow = 0.35 + 0.25 * Math.sin(Date.now() / 700 + i * 1.3);
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = dimC(info.glow, ambv);
    ctx.beginPath(); ctx.arc(gx + 26, y0 + 19, 16, 0, 7); ctx.fill();
    ctx.restore();
    ctx.font = '22px sans-serif'; ctx.fillText(info.emoji, gx + 26, y0 + 27);
    // 銘牌
    ctx.fillStyle = dimC('#c9a24a', ambv); ctx.fillRect(gx + 8, y0 + 50, 36, 10);
    ctx.font = '7px "Noto Sans TC", sans-serif'; ctx.fillStyle = dimC('#3a2a10', ambv);
    ctx.fillText(info.name, gx + 26, y0 + 58);
  });
}

function drawPet(p, s, ambv) {
  const x = sx(s.x);
  if (x < -80 || x > W + 80) return;
  const [c1, c2, c3] = coatOf(p).map(h => dimC(h, ambv));
  const dark = dimC('#221510', ambv);
  const sleeping = s.st === 'sleep';
  const eating = s.st === 'eat';
  const walking = ['walk', 'chase', 'flee', 'cuddle', 'sad', 'eatg', 'pool', 'watch', 'tojump', 'tolitter', 'jump'].includes(s.st);
  const bob = walking ? Math.sin(s.phase) * 2 : 0;
  ctx.save();
  ctx.translate(x, s.y);
  if (s.dir < 0) ctx.scale(-1, 1);

  if (p.type === 'dog') {
    if (sleeping) {
      ctx.fillStyle = c1; ctx.fillRect(-22, -14, 44, 14);
      ctx.fillStyle = c2; ctx.fillRect(10, -20, 18, 12);
      ctx.fillStyle = c2; ctx.fillRect(-26, -12, 8, 6);
    } else {
      const hd = eating ? 8 : 0;
      ctx.fillStyle = c1; ctx.fillRect(-20, -30 + bob, 34, 20);
      ctx.fillStyle = c2;
      ctx.fillRect(-18, -10 + (walking ? Math.sin(s.phase) * 2 : 0), 7, 10);
      ctx.fillRect(6, -10 - (walking ? Math.sin(s.phase) * 2 : 0), 7, 10);
      ctx.fillStyle = c1; ctx.fillRect(8, -44 + bob + hd, 22, 18);
      ctx.fillStyle = c2; ctx.fillRect(8, -48 + bob + hd, 7, 10);
      ctx.fillRect(24, -48 + bob + hd, 7, 10);
      ctx.fillStyle = c3; ctx.fillRect(24, -34 + bob + hd, 8, 8);
      ctx.fillStyle = dark; ctx.fillRect(29, -32 + bob + hd, 3, 3);
      ctx.fillRect(15, -40 + bob + hd, 3, 3);
      const wag = Math.sin(s.phase * (s.st === 'happy' || s.st === 'chase' ? 4 : 1.5)) * 6;
      ctx.fillStyle = c2; ctx.fillRect(-27, -32 + bob + wag, 8, 6);
    }
  } else if (p.type === 'cat') {
    if (sleeping) {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, -10, 20, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(6, -18, 14, 10);
      ctx.fillStyle = c1; ctx.fillRect(6, -22, 5, 6); ctx.fillRect(15, -22, 5, 6);
    } else {
      const hd = eating ? 8 : 0;
      ctx.fillStyle = c1; ctx.fillRect(-18, -26 + bob, 30, 16);
      ctx.fillStyle = c2;
      ctx.fillRect(-16, -10 + (walking ? Math.sin(s.phase) * 2 : 0), 6, 10);
      ctx.fillRect(4, -10 - (walking ? Math.sin(s.phase) * 2 : 0), 6, 10);
      ctx.fillStyle = c1; ctx.fillRect(6, -40 + bob + hd, 18, 16);
      ctx.beginPath(); ctx.moveTo(7, -40 + bob + hd); ctx.lineTo(11, -48 + bob + hd); ctx.lineTo(15, -40 + bob + hd); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, -40 + bob + hd); ctx.lineTo(20, -48 + bob + hd); ctx.lineTo(24, -40 + bob + hd); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(12, -34 + bob + hd, 3, 3); ctx.fillRect(20, -34 + bob + hd, 3, 3);
      ctx.fillStyle = c3; ctx.fillRect(15, -29 + bob + hd, 4, 3);
      const tw = Math.sin(s.phase) * 4;
      ctx.fillStyle = c2; ctx.fillRect(-24, -34 + bob + tw, 7, 14);
    }
  } else if (p.type === 'bird') {
    const flying = s.st === 'fly' || s.st === 'eatb';
    const flap = flying ? Math.sin(s.phase * 3) * 8 : 0;
    if (sleeping) {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, -8, 10, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(-2, -12, 8, 6);
    } else {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, -10, 11, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(-3, -12 - flap / 2, 8, 5 + Math.abs(flap) / 2, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(8, -17, 6, 0, 7); ctx.fill();
      ctx.fillStyle = c3; ctx.beginPath(); ctx.moveTo(13, -18); ctx.lineTo(19, -16 + (s.st === 'sing' ? 2 : 0)); ctx.lineTo(13, -14); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(9, -19, 2, 2);
      ctx.fillStyle = c2; ctx.fillRect(-13, -12, 6, 4);
      if (!flying) { ctx.strokeStyle = c3; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-2, 2); ctx.moveTo(3, -2); ctx.lineTo(3, 2); ctx.stroke(); }
    }
  } else if (p.type === 'fish') {
    const wig = Math.sin(s.phase * 1.5) * 3;
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-21, -6 + wig); ctx.lineTo(-21, 6 + wig); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4, -12); ctx.lineTo(7, -7); ctx.fill();
    ctx.fillStyle = c3; ctx.beginPath(); ctx.ellipse(3, 2, 6, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(8, -3, 3, 3);
  } else if (p.type === 'seal') {
    const inPool = s.st === 'pool';
    const clap = s.st === 'clap' ? Math.abs(Math.sin(s.phase * 4.2)) : 0;
    const yo = inPool ? 8 : 0;
    if (sleeping) {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, -10, 26, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c3; ctx.beginPath(); ctx.ellipse(16, -12, 8, 6, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.ellipse(-4, -14 + yo + clap, 22 + clap * 3, 14 - clap * 2, -0.15, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -30 + yo + (eating ? 6 : 0), 11, 0, 7); ctx.fill();
      ctx.fillStyle = c3; ctx.beginPath(); ctx.ellipse(17, -26 + yo + (eating ? 6 : 0), 6, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(16, -33 + yo, 3, 3); ctx.fillRect(21, -28 + yo, 2, 2);
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(-22, -10 + yo); ctx.lineTo(-32, -18 + yo); ctx.lineTo(-30, -4 + yo); ctx.fill();
      // 兩隻鰭拍肚皮：抬起再拍回去
      const flp = clap * 11;
      ctx.beginPath(); ctx.ellipse(0, -7 + yo - flp, 8, 4 + clap * 2, 0.75 - clap * 1.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, -9 + yo - flp * 0.9, 7, 3.5 + clap * 2, -0.55 + clap, 0, 7); ctx.fill();
      if (inPool && POOL && Math.random() < 0.06) fx('splash', s.x + rand(-10, 10), POOL.cy - 2);
    }
  }
  ctx.restore();

  const { hunger } = liveStats(p);
  ctx.font = '10px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
  const tagY = s.y - ({ dog: 56, cat: 54, bird: 34, fish: 22, seal: 48 }[p.type]) - (p.id % 3) * 11;
  if (p.id === selectedId) {
    ctx.fillStyle = '#ffd97a'; ctx.fillText('▼', x, tagY - 12);
    ctx.fillStyle = '#ffe9b0';
  } else ctx.fillStyle = 'rgba(60,40,24,.85)';
  ctx.fillText(p.name + (hunger < 10 ? ' 💧' : ''), x, tagY);
}

function drawEffects() {
  const dead = [];
  ctx.textAlign = 'center';
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    e.t += 1 / 60;
    if (e.t > e.life) { dead.push(i); continue; }
    const k = e.t / e.life, x = sx(e.x);
    if (x < -40 || x > W + 40) continue;
    ctx.globalAlpha = 1 - k;
    if (e.type === 'heart') { ctx.font = '13px sans-serif'; ctx.fillText('❤️', x, e.y - k * 26); }
    else if (e.type === 'note') { ctx.font = '12px sans-serif'; ctx.fillText('♪', x + Math.sin(e.t * 6) * 5, e.y - k * 24); }
    else if (e.type === 'zzz') { ctx.font = '12px sans-serif'; ctx.fillStyle = '#5a4a6a'; ctx.fillText('z', x + k * 8, e.y - k * 18); }
    else if (e.type === 'drop') { ctx.font = '11px sans-serif'; ctx.fillText('💧', x, e.y + k * 8); }
    else if (e.type === 'splash') { ctx.fillStyle = '#cfeaff'; ctx.fillRect(x, e.y - k * 14, 3, 3); ctx.fillRect(x + 5, e.y - k * 10, 2, 2); }
    else if (e.type === 'bubble') { ctx.strokeStyle = 'rgba(220,240,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, e.y - k * 30, 2.5, 0, 7); ctx.stroke(); }
    else if (e.type === 'crumb') { ctx.fillStyle = e.col || '#e8d48a'; ctx.fillRect(x, e.y + k * 10, 3, 3); }
    else if (e.type === 'pour') { ctx.fillStyle = e.col || '#d9a45a'; ctx.fillRect(x, e.y + k * 36, 3, 4); }
    else if (e.type === 'notif') {
      ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#000'; ctx.globalAlpha = (1 - k) * 0.5; ctx.fillText(e.txt, x + 1, e.y - k * 22 + 1);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = e.col; ctx.fillText(e.txt, x, e.y - k * 22);
    }
    ctx.globalAlpha = 1;
  }
  for (let i = dead.length - 1; i >= 0; i--) effects.splice(dead[i], 1);
}

// ── 鏡頭 ────────────────────────────────────────────────
function updateCamera(dt) {
  if (ROOM_W <= W) { camX = camTargetX = 0; return; }
  const t = now();
  const ids = state.pets.map(p => p.id);
  if (Date.now() > manualCamUntil && ids.length) {
    if (selectedId && ids.includes(selectedId)) followId = selectedId;
    else if (!followId || !ids.includes(followId) || t > nextFollowSwitch) {
      followId = pick(ids); nextFollowSwitch = t + 9;
    }
    const s = sims[followId];
    if (s) camTargetX = clamp(s.x - W / 2, 0, ROOM_W - W);
  }
  camX += (camTargetX - camX) * Math.min(1, dt * 2.5);
}

// ── 主迴圈 ──────────────────────────────────────────────
let lastT = 0;
function tick(ms) {
  const dt = Math.min(0.05, (ms - lastT) / 1000 || 0.016);
  lastT = ms; frame++;
  const ambv = getAmbient();
  if (state) {
    for (const p of state.pets) updatePet(p, sims[p.id], dt);
    if (now() > nextPairEvent) { tryPairEvent(); nextPairEvent = now() + rand(4, 9); }
    updateCamera(dt);
  }
  drawRoom(ambv);
  drawWindow(FURN.window1 ? FURN.window1.x : 210, 'window1', ambv);
  if (FURN.window2) drawWindow(FURN.window2.x, 'window2', ambv);
  if (FURN.window3) drawWindow(FURN.window3.x, 'window3', ambv);
  if (state) {
    drawGearWall(ambv);
    drawRomanceFrames(ambv);
    drawTrophyShelf(ambv);
    drawClock(ambv);
    drawLamp(ambv);
    drawFurniture(ambv);
  }
  if (state) {
    for (const p of state.pets) if (p.type === 'fish') drawPet(p, sims[p.id], ambv);
    for (const p of state.pets) if (p.type !== 'fish') drawPet(p, sims[p.id], ambv);
  }
  drawEffects();
  if (!state) {
    ctx.font = '14px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#5a4028'; ctx.fillText('載入小屋中…', W / 2, H / 2);
  }
  requestAnimationFrame(tick);
}

// ── 輸入 ────────────────────────────────────────────────
let dragStart = null;
function canvasPos(ev) {
  const r = cv.getBoundingClientRect();
  const p = ev.touches ? ev.touches[0] : ev;
  return { x: (p.clientX - r.left) * (W / r.width), y: (p.clientY - r.top) * (H / r.height) };
}
function onDown(ev) { dragStart = Object.assign(canvasPos(ev), { camX, moved: false }); }
function onMove(ev) {
  if (!dragStart || ROOM_W <= W) return;
  const p = canvasPos(ev);
  if (Math.abs(p.x - dragStart.x) > 6) dragStart.moved = true;
  if (dragStart.moved) {
    camX = camTargetX = clamp(dragStart.camX - (p.x - dragStart.x), 0, ROOM_W - W);
    manualCamUntil = Date.now() + 12000;
    ev.preventDefault();
  }
}
function hitWindow(px, py, f, key) {
  if (!f) return false;
  const wy = 96, ww = 150, wh = 130;
  return px > f.x - 8 && px < f.x + ww + 8 && py > wy - 8 && py < wy + wh + 16 && key;
}
function onUp() {
  if (!dragStart) return;
  if (!dragStart.moved && state) {
    const px = dragStart.x + camX, py = dragStart.y;
    let best = null, bd = 55;
    for (const p of state.pets) {
      const s = sims[p.id];
      const d = Math.hypot(s.x - px, (s.y - 24) - py);
      if (d < bd) { bd = d; best = p.id; }
    }
    if (best) {
      const s = sims[best];
      const pet = state.pets.find(p => p.id === best);
      for (let k = 0; k < 3; k++) fx('heart', s.x + rand(-8, 8), s.y - 20);
      if (pet && pet.type === 'seal' && s.st !== 'sleep') {
        s.st = 'clap'; s.until = now() + 2.4;
      }
      notif(s.x, s.y - 48, petSfx(pet, 'pet'), '#ffd9a0');
      selectPet(best);
    } else if (hitWindow(px, py, FURN.window1, 'window1') || (FURN.window2 && hitWindow(px, py, FURN.window2, 'window2')) || (FURN.window3 && hitWindow(px, py, FURN.window3, 'window3'))) {
      const key = hitWindow(px, py, FURN.window1, 'window1') ? 'window1'
        : (FURN.window2 && hitWindow(px, py, FURN.window2, 'window2')) ? 'window2' : 'window3';
      curtains[key] = !curtains[key];
      const fx0 = FURN[key].x + 75;
      notif(fx0, 88, curtains[key] ? '窗簾拉開' : '窗簾放下', '#c8d8f0');
    } else if (FURN.bowls && px > FURN.bowls.x && px < FURN.bowls.x + FURN.bowls.w + 20 && py > FLOOR_Y - 40) {
      const id = selectedId || (state.pets[0] && state.pets[0].id);
      if (id) doFeed(id);
    } else if (FURN.cattree && px > FURN.cattree.x - 10 && px < FURN.cattree.x + 140 && py > FLOOR_Y - 180 && py < FLOOR_Y) {
      const jumper = state.pets.find(p => ['cat', 'dog'].includes(p.type) && sims[p.id] && !['jump', 'tojump'].includes(sims[p.id].st));
      if (jumper && TREE_PLATS.length) {
        const plat = pick(TREE_PLATS), s = sims[jumper.id];
        s.st = 'tojump'; s.tx = plat[0]; s.jx = plat[0]; s.jy = plat[1]; s.until = now() + 12;
        notif(s.x, s.y - 40, '上跳台！', '#ffe9b0');
      }
    } else if (FURN.litter && px > FURN.litter.x && px < FURN.litter.x + FURN.litter.w + 8 && py > FLOOR_Y - 30) {
      const digger = state.pets.find(p => ['cat', 'dog', 'seal'].includes(p.type) && sims[p.id]);
      if (digger) {
        const s = sims[digger.id];
        s.st = 'tolitter'; s.tx = LITTER_X; s.until = now() + 10;
        notif(s.x, s.y - 40, '沙坑！', '#e8d4a0');
      }
    } else if (selectedId) {
      selectedId = null; followId = null; nextFollowSwitch = 0;
      document.querySelectorAll('.pt').forEach(e => e.classList.remove('sel'));
      updateCard();
    }
  }
  dragStart = null;
}

// ── DOM ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function renderSide() {
  const o = state.owner;
  $('housename').textContent = `🏠 ${o.name} 的寵物小屋`;
  document.title = `萬熊之熊 — ${o.name} 的寵物小屋`;
  const cap = state.pet_cap || 3, lv = state.home_lv || 1;
  $('ownercard').innerHTML =
    `<span class="on">${escapeHtml(o.name)}</span><br>` +
    `${escapeHtml(o.class)}　Lv${o.level}<br>` +
    `🏡 房屋 Lv${lv}　寵物 ${state.pets.length}/${cap}<br>` +
    `🖼️ 珍藏 ${(state.vault || []).length}　保管區 ${(state.stash || []).length}`;
  // 寵物清單
  const box = $('petlist');
  box.innerHTML = '';
  if (!state.pets.length) box.innerHTML = '<span style="font-size:12px;color:#9a8a6a">這個家還沒有寵物，去遊戲裡 /adopt 領養一隻吧。</span>';
  for (const p of state.pets) {
    const row = document.createElement('div');
    row.className = 'pt' + (p.id === selectedId ? ' sel' : '');
    row.dataset.pid = p.id;
    const { hunger } = liveStats(p);
    row.innerHTML = `<span>${PET_META[p.type].emoji}</span><span class="nm">${escapeHtml(p.name)}</span>` +
      `<span class="st">${tierOf(HUNGER_TIER, hunger).slice(0, 2)} ❤Lv${p.bond_lv}</span>`;
    row.onclick = () => selectPet(p.id);
    box.appendChild(row);
  }
  // 牆上珍藏
  const gl = $('gearlist');
  if (!catalog) { gl.textContent = '讀取圖鑑中…'; }
  else if (!(state.vault && state.vault.length) && !state.stash.length) {
    gl.innerHTML = '<span style="color:#9a8a6a">牆上是空的。遊戲裡 /store 珍藏會掛上排，/craft store 保管區掛下排。</span>';
  } else {
    const rar = catalog.rarities || {};
    const block = (title, rows) => rows.length ? `<div style="color:#d9b877;margin:4px 0 2px">${title}</div>` + rows.map(s => {
      const it = itemOf(s.item_id);
      if (!it) return '';
      const tag = (rar[it.r] || {}).tag || '';
      const enh = (s.enh || 0) > 0 ? ` <span style="color:#ffd97a">+${s.enh}</span>` : '';
      const qty = s.qty > 1 ? ` <span style="color:#9a8a6a">×${s.qty}</span>` : '';
      return `<div class="gr"><span class="ge">${it.e || '❔'}</span>` +
        `<span class="gn">${tag}${escapeHtml(it.n)}${enh}</span><span class="gq">${qty}</span></div>`;
    }).join('') : '';
    gl.innerHTML = block('珍藏 /store', (state.vault || []).filter(s => !TROPHY_ITEM_IDS.includes(s.item_id)))
      + block('保管區 /craft store', state.stash || []);
  }
  // 🏆 戰利品（尋寶奇譚通關才顯示；第一部＋第二部三線各一件）
  const tb = $('trophybox');
  if (tb) {
    let relics = (state.treasure && state.treasure.relics) || [];
    if (!relics.length && state.treasure && state.treasure.done) relics = ['compass'];  // 舊資料相容
    const LORE = {
      compass:   ['🧭', '古神星圖羅盤', '盤面映著星星墜落之前的天空。'],
      tidebell:  ['🐚', '潮鳴螺鐘', '滿潮夜自己低鳴一聲，替回不了岸的人應「我在」。'],
      everlamp:  ['🏮', '不熄螢燈', '入夜自亮暖光——只要家還有人記得回家，它就不熄。'],
      hourglass: ['⏳', '星砂逆漏', '沙無聲往上飄——有些沙值得逆著流，比如回家那趟。'],
    };
    tb.style.display = relics.length ? '' : 'none';
    if (relics.length) {
      $('trophylist').innerHTML = relics.map(k => {
        const L = LORE[k]; if (!L) return '';
        return `<div class="gr"><span class="ge">${L[0]}</span><span class="gn">${L[1]}</span></div>` +
          `<span style="color:#9a8a6a">${L[2]}</span>`;
      }).join('<br>');
    }
  }
  updateCard();
}

function selectPet(id) {
  selectedId = id;
  followId = id; manualCamUntil = 0; nextFollowSwitch = now() + 15;
  document.querySelectorAll('.pt').forEach(e => e.classList.toggle('sel', +e.dataset.pid === id));
  updateCard();
}

function updateCard() {
  const card = $('card'), btn = $('feedbtn');
  const p = petById(selectedId);
  if (!p) { card.textContent = '點畫面上的寵物或下方名單看詳情。'; btn.style.display = 'none'; $('feedmsg').textContent = ''; return; }
  const { hunger, mood } = liveStats(p);
  const hearts = p.bond_lv ? '❤'.repeat(Math.min(5, p.bond_lv)) : '·';
  const since = (p.created_at || '').slice(0, 10);
  card.innerHTML =
    `<div class="pname">${PET_META[p.type].emoji} ${escapeHtml(p.name)}<span style="font-weight:400;color:#9a8a6a">（${PET_META[p.type].cname}）</span></div>` +
    `親密：Lv${p.bond_lv} ${hearts}<br>` +
    `<span class="tiers">${tierOf(HUNGER_TIER, hunger)} ${Math.round(hunger)}/100<br>` +
    `${tierOf(MOOD_TIER, mood)} ${Math.round(mood)}/100</span>` +
    (since ? `<br><span style="color:#8a7a5a">入園日 ${since}</span>` : '');
  btn.style.display = '';
  btn.disabled = false;
  btn.textContent = '🍽️ 投餵愛心飼料（隨時都能餵）';
}

// ── 大廳（無 ?u=）───────────────────────────────────────
async function showLobby() {
  $('housename').textContent = '🏠 寵物小屋大廳';
  const lobby = $('lobby');
  lobby.style.display = 'grid';
  try {
    const r = await fetch('api.php?t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    if (!d.ok) { lobby.textContent = '載入失敗。'; return; }
    lobby.innerHTML =
      `<a class="playcta" href="https://t.me/bearOfBearsBot" target="_blank" rel="noopener">` +
      `✈️ 在 Telegram 開始遊戲　<span>@bearOfBearsBot</span></a>` +
      d.owners.map(o =>
        `<a class="door" href="?u=${encodeURIComponent(o.name)}">` +
        `<div class="dn">${escapeHtml(o.name)}</div>` +
        `<div class="dm">${escapeHtml(o.class)}　Lv${o.level}</div>` +
        `<div class="dp">${o.types.map(t => (PET_META[t] || { emoji: '🐾' }).emoji).join(' ')}</div></a>`
      ).join('');
  } catch (e) { lobby.textContent = '載入失敗。'; }
}

// ── 啟動 ────────────────────────────────────────────────
function init() {
  const q = new URLSearchParams(location.search);
  ownerName = (q.get('u') || '').trim();
  if (!ownerName) { showLobby(); return; }
  phaseOffset = hashStr(ownerName) % DAY_CYCLE;   // 每間小屋窗外的「時區」不同
  cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  $('park-container').appendChild(cv);
  ctx = cv.getContext('2d');
  $('side').style.display = 'flex';
  cv.addEventListener('mousedown', onDown);
  cv.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  cv.addEventListener('touchstart', onDown, { passive: true });
  cv.addEventListener('touchmove', onMove, { passive: false });
  cv.addEventListener('touchend', onUp);
  cv.style.touchAction = 'pan-y';
  $('feedbtn').onclick = () => { if (selectedId) doFeed(selectedId); };
  loadState();
  loadCatalog();
  setInterval(loadState, 60000);
  setInterval(() => { if (state) updateCard(); }, 1000);
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
