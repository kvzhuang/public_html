// ============================================================
// 小丑對決 Joker Duel — Balatro 風 roguelike run（對電腦競速）
//   Ante/盲注(小·大·Boss) × 星球牌升級牌型 × 塔羅消耗品 ×
//   Boss 特殊規則 × 商店經濟 × 更多小丑 × 難度 × localStorage 存檔
//   規格參考 Balatro Wiki（牌型底分/每級增量、卡牌籌碼、僅計分牌計籌碼、盲注門檻曲線）
// ============================================================

const SUITS = ['♠', '♥', '♦', '♣'];
const RED = new Set(['♥', '♦']);
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const EVEN = new Set(['2', '4', '6', '8', '10']);
const rankVal = r => (r === 'A' ? 14 : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : parseInt(r, 10));
const chipVal = r => (r === 'A' ? 11 : (r === 'K' || r === 'Q' || r === 'J') ? 10 : parseInt(r, 10));
const isFace = c => c.rank === 'J' || c.rank === 'Q' || c.rank === 'K';
const isOdd = c => ['A', '3', '5', '7', '9'].includes(c.rank);
const cnt = (cards, suit) => cards.filter(c => c.suit === suit).length;

const HANDS = {
  'High Card': { chips: 5, mult: 1 }, 'Pair': { chips: 10, mult: 2 },
  'Two Pair': { chips: 20, mult: 2 }, 'Three of a Kind': { chips: 30, mult: 3 },
  'Straight': { chips: 30, mult: 4 }, 'Flush': { chips: 35, mult: 4 },
  'Full House': { chips: 40, mult: 4 }, 'Four of a Kind': { chips: 60, mult: 7 },
  'Straight Flush': { chips: 100, mult: 8 },
};
// 每升 1 級的增量（星球牌）
const HAND_INC = {
  'High Card': { c: 10, m: 1 }, 'Pair': { c: 15, m: 1 }, 'Two Pair': { c: 20, m: 1 },
  'Three of a Kind': { c: 20, m: 2 }, 'Straight': { c: 30, m: 3 }, 'Flush': { c: 15, m: 2 },
  'Full House': { c: 25, m: 2 }, 'Four of a Kind': { c: 30, m: 3 }, 'Straight Flush': { c: 40, m: 4 },
};
const HAND_ZH = {
  'High Card': '高牌', 'Pair': '一對', 'Two Pair': '兩對', 'Three of a Kind': '三條',
  'Straight': '順子', 'Flush': '同花', 'Full House': '葫蘆', 'Four of a Kind': '四條', 'Straight Flush': '同花順',
};
// 星球牌：名稱 → 對應牌型
const PLANETS = {
  '水星': 'Pair', '金星': 'Three of a Kind', '地球': 'Full House', '火星': 'Four of a Kind',
  '木星': 'Flush', '土星': 'Straight', '天王星': 'Two Pair', '海王星': 'Straight Flush', '冥王星': 'High Card',
};
const HAS_PAIR = new Set(['Pair', 'Two Pair', 'Three of a Kind', 'Full House', 'Four of a Kind']);

function makeDeck() { const d = []; let id = 0; for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s, enh: null, cid: id++ }); return d; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = a => a[Math.floor(Math.random() * a.length)];

function evaluateHand(cards) {
  const n = cards.length, byRank = {};
  for (const c of cards) (byRank[c.rank] = byRank[c.rank] || []).push(c);
  const groups = Object.values(byRank).sort((a, b) => b.length - a.length || rankVal(b[0].rank) - rankVal(a[0].rank));
  const flush = n === 5 && cards.every(c => c.suit === cards[0].suit);
  let straight = false;
  if (n === 5) {
    const vs = [...new Set(cards.map(c => rankVal(c.rank)))].sort((a, b) => a - b);
    if (vs.length === 5) { if (vs[4] - vs[0] === 4) straight = true; else if (vs[0] === 2 && vs[4] === 14 && vs[1] === 3 && vs[2] === 4 && vs[3] === 5) straight = true; }
  }
  const all = () => cards.slice();
  const hi = () => [cards.slice().sort((a, b) => chipVal(b.rank) - chipVal(a.rank))[0]];
  if (flush && straight) return { type: 'Straight Flush', cards: all() };
  if (groups[0].length === 4) return { type: 'Four of a Kind', cards: groups[0] };
  if (groups[0].length === 3 && groups[1] && groups[1].length === 2) return { type: 'Full House', cards: all() };
  if (flush) return { type: 'Flush', cards: all() };
  if (straight) return { type: 'Straight', cards: all() };
  if (groups[0].length === 3) return { type: 'Three of a Kind', cards: groups[0] };
  if (groups[0].length === 2 && groups[1] && groups[1].length === 2) return { type: 'Two Pair', cards: [...groups[0], ...groups[1]] };
  if (groups[0].length === 2) return { type: 'Pair', cards: groups[0] };
  return { type: 'High Card', cards: hi() };
}

// Boss 是否讓某張牌失效（不計分）
function debuffed(boss, c) {
  if (!boss) return false;
  if (boss.debuffSuit && c.suit === boss.debuffSuit) return true;
  if (boss.debuffFace && isFace(c)) return true;
  if (boss.debuffEven && EVEN.has(c.rank)) return true;
  return false;
}

const JOKERS = [
  { id: 'chips', name: '籌碼丑', desc: '+30 籌碼', ap: () => ({ chips: 30 }) },
  { id: 'mult', name: '倍率丑', desc: '+4 倍率', ap: () => ({ mult: 4 }) },
  { id: 'x15', name: '貪婪丑', desc: '×1.5 倍率', ap: () => ({ x: 1.5 }) },
  { id: 'flush', name: '同花丑', desc: '同花/同花順 +4 倍率', ap: e => (['Flush', 'Straight Flush'].includes(e.type) ? { mult: 4 } : {}) },
  { id: 'straight', name: '順子丑', desc: '順子/同花順 +40 籌碼', ap: e => (['Straight', 'Straight Flush'].includes(e.type) ? { chips: 40 } : {}) },
  { id: 'pair', name: '對子丑', desc: '含對子 +25 籌碼', ap: e => (HAS_PAIR.has(e.type) ? { chips: 25 } : {}) },
  { id: 'heart', name: '紅心丑', desc: '每張♥計分牌 +3 倍率', ap: e => ({ mult: 3 * cnt(e.cards, '♥') }) },
  { id: 'diamond', name: '方塊丑', desc: '每張♦計分牌 +25 籌碼', ap: e => ({ chips: 25 * cnt(e.cards, '♦') }) },
  { id: 'club', name: '梅花丑', desc: '每張♣計分牌 +2 倍率', ap: e => ({ mult: 2 * cnt(e.cards, '♣') }) },
  { id: 'spade', name: '黑桃丑', desc: '每張♠計分牌 +20 籌碼', ap: e => ({ chips: 20 * cnt(e.cards, '♠') }) },
  { id: 'face', name: '貴族丑', desc: '每張 J/Q/K 計分牌 +18 籌碼', ap: e => ({ chips: 18 * e.cards.filter(isFace).length }) },
  { id: 'odd', name: '奇數丑', desc: '每張 A/3/5/7/9 計分牌 +4 倍率', ap: e => ({ mult: 4 * e.cards.filter(isOdd).length }) },
  { id: 'even', name: '偶數丑', desc: '每張 2/4/6/8/10 計分牌 +15 籌碼', ap: e => ({ chips: 15 * e.cards.filter(c => EVEN.has(c.rank)).length }) },
  { id: 'first', name: '先攻丑', desc: '該盲注第一手 ×2 倍率', ap: (e, i) => (i === 0 ? { x: 2 } : {}) },
  { id: 'lone', name: '獨行丑', desc: '高牌/一對 +50 籌碼', ap: e => (['High Card', 'Pair'].includes(e.type) ? { chips: 50 } : {}) },
  { id: 'fourfold', name: '暴擊丑', desc: '四條/同花順 ×3 倍率', ap: e => (['Four of a Kind', 'Straight Flush'].includes(e.type) ? { x: 3 } : {}) },
  { id: 'twopair', name: '雙對丑', desc: '兩對/葫蘆 +40 籌碼', ap: e => (['Two Pair', 'Full House'].includes(e.type) ? { chips: 40 } : {}) },
  { id: 'rich', name: '財迷丑', desc: '每持有 $5 +1 倍率', ap: (e, i, ctx) => ({ mult: Math.floor((ctx && ctx.money || 0) / 5) }) },
  { id: 'big', name: '巨物丑', desc: '每張 10/J/Q/K/A 計分牌 +2 倍率', ap: e => ({ mult: 2 * e.cards.filter(c => ['10', 'J', 'Q', 'K', 'A'].includes(c.rank)).length }) },
  { id: 'steel', name: '鋼鐵丑', desc: '×1.25 倍率', ap: () => ({ x: 1.25 }) },
  // ── 罕見 uncommon ──
  { id: 'lowcard', name: '低張丑', desc: '每張 2/3/4 計分牌 +30 籌碼', ap: e => ({ chips: 30 * e.cards.filter(c => ['2', '3', '4'].includes(c.rank)).length }) },
  { id: 'flushx', name: '花色丑', desc: '同花/同花順 ×2 倍率', ap: e => (['Flush', 'Straight Flush'].includes(e.type) ? { x: 2 } : {}) },
  { id: 'straightx', name: '蛇行丑', desc: '順子/同花順 ×2 倍率', ap: e => (['Straight', 'Straight Flush'].includes(e.type) ? { x: 2 } : {}) },
  { id: 'fullx', name: '滿堂丑', desc: '葫蘆 ×2.5 倍率', ap: e => (e.type === 'Full House' ? { x: 2.5 } : {}) },
  { id: 'balance', name: '均衡丑', desc: '+30 籌碼 且 +3 倍率', ap: () => ({ chips: 30, mult: 3 }) },
  { id: 'lucky7', name: '幸運七', desc: '每張 7 計分牌 +7 倍率', ap: e => ({ mult: 7 * e.cards.filter(c => c.rank === '7').length }) },
  { id: 'threekind', name: '聚合丑', desc: '三條/四條 +60 籌碼', ap: e => (['Three of a Kind', 'Four of a Kind'].includes(e.type) ? { chips: 60 } : {}) },
  // ── 稀有 rare（強力）──
  { id: 'chaos', name: '混沌丑', desc: '×3 倍率', ap: () => ({ x: 3 }) },
  { id: 'grand', name: '宗師丑', desc: '+9 倍率', ap: () => ({ mult: 9 }) },
  { id: 'bigchips', name: '金山丑', desc: '+150 籌碼', ap: () => ({ chips: 150 }) },
  { id: 'royal', name: '王室丑', desc: '每張 J/Q/K 計分牌 +4 倍率', ap: e => ({ mult: 4 * e.cards.filter(isFace).length }) },
  { id: 'tycoon', name: '富豪丑', desc: '每持有 $4 +2 倍率', ap: (e, i, ctx) => ({ mult: 2 * Math.floor((ctx && ctx.money || 0) / 4) }) },
  { id: 'crit', name: '致命丑', desc: '四條/同花順 ×5 倍率', ap: e => (['Four of a Kind', 'Straight Flush'].includes(e.type) ? { x: 5 } : {}) },
  { id: 'dragon', name: '龍脈丑', desc: '同花順 ×8 倍率', ap: e => (e.type === 'Straight Flush' ? { x: 8 } : {}) },
];
const jokerById = id => JOKERS.find(j => j.id === id);
// 稀有度：普通 common / 罕見 uncommon / 稀有 rare（未列者為普通）
const RARITY = {
  x15: 'uncommon', first: 'uncommon', fourfold: 'uncommon', big: 'uncommon', rich: 'uncommon',
  lowcard: 'uncommon', flushx: 'uncommon', straightx: 'uncommon', fullx: 'uncommon', balance: 'uncommon', lucky7: 'uncommon', threekind: 'uncommon',
  chaos: 'rare', grand: 'rare', bigchips: 'rare', royal: 'rare', tycoon: 'rare', crit: 'rare', dragon: 'rare',
};
const rarityOf = id => RARITY[id] || 'common';
const RARITY_ZH = { common: '普通', uncommon: '罕見', rare: '稀有' };
const RARITY_W = { common: 10, uncommon: 4, rare: 1.4 };            // 商店/選牌加權（稀有較少見）
const rarityPrice = id => ({ common: 4 + Math.floor(Math.random() * 3), uncommon: 7 + Math.floor(Math.random() * 2), rare: 9 + Math.floor(Math.random() * 3) })[rarityOf(id)];
function weightedJoker(pool) {
  let tot = 0; for (const j of pool) tot += RARITY_W[rarityOf(j.id)];
  let r = Math.random() * tot;
  for (const j of pool) { r -= RARITY_W[rarityOf(j.id)]; if (r <= 0) return j; }
  return pool[pool.length - 1];
}

function scoreHand(cards, jokers, handIndex, ctx = {}) {
  const levels = ctx.levels || {}, boss = ctx.boss || null;
  const ev = evaluateHand(cards);
  const base = HANDS[ev.type], inc = HAND_INC[ev.type], lv = levels[ev.type] || 1;
  let chips = base.chips + (lv - 1) * inc.c;
  let mult = base.mult + (lv - 1) * inc.m;
  const xs = [];
  for (const c of ev.cards) {
    if (debuffed(boss, c)) continue;                 // Boss 使該牌失效
    chips += chipVal(c.rank);
    if (c.enh === 'bonus') chips += 30;
    else if (c.enh === 'mult') mult += 4;
    else if (c.enh === 'glass') xs.push(2);
  }
  for (const j of (jokers || [])) { const r = j.ap(ev, handIndex, ctx) || {}; if (r.chips) chips += r.chips; if (r.mult) mult += r.mult; if (r.x) xs.push(r.x); }
  for (const x of xs) mult *= x;
  let total = Math.round(chips * mult);
  if (boss && boss.firstHalf && handIndex === 0) total = Math.floor(total / 2);
  return { type: ev.type, chips, mult: Math.round(mult * 100) / 100, total, scoring: ev.cards };
}

function bestPlay(hand, jokers, handIndex, ctx) {
  let best = null; const idx = hand.map((_, i) => i);
  const combos = (arr, k) => { const out = []; const rec = (s, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = s; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } }; rec(0, []); return out; };
  for (let k = 1; k <= 5; k++) for (const cmb of combos(idx, k)) {
    const cards = cmb.map(i => hand[i]); const sc = scoreHand(cards, jokers, handIndex, ctx);
    if (!best || sc.total > best.total) best = { indices: cmb, cards, ...sc };
  }
  return best;
}

if (typeof module !== 'undefined') module.exports = { makeDeck, shuffle, evaluateHand, scoreHand, bestPlay, JOKERS, chipVal, HANDS, HAND_INC, PLANETS, debuffed };

// ════════════════ UI / RUN（僅瀏覽器）════════════════
if (typeof document !== 'undefined') {
  const HAND_SIZE = 8, MAX_JOKERS = 12, MAX_CONS = 2, GOAL_ANTE = 8;
  const DIFF_HAND = { easy: 12, normal: 10, hard: 8 };   // 依難度的基礎手牌數
  const ANTE_BASE = [0, 300, 800, 2000, 5000, 11000, 20000, 35000, 50000];
  const BLIND_MULT = [1, 1.5, 2], BLIND_ZH = ['小盲注', '大盲注', 'Boss 盲注'], BLIND_REWARD = [3, 4, 5];
  const BOSSES = [
    { name: '梅花詛咒', desc: '♣ 花色的牌失效（不計分）', debuffSuit: '♣' },
    { name: '紅心詛咒', desc: '♥ 花色的牌失效', debuffSuit: '♥' },
    { name: '人頭封印', desc: 'J/Q/K 失效', debuffFace: true },
    { name: '偶數封印', desc: '2/4/6/8/10 失效', debuffEven: true },
    { name: '短手', desc: '手牌 -2 張', handMinus: 2 },
    { name: '節儉', desc: '棄牌只有 1 次', discards: 1 },
    { name: '疲軟', desc: '第一手分數減半', firstHalf: true },
    { name: '完美主義', desc: '只能一次打滿 5 張牌', need5: true },
  ];
  const ENH_LABEL = { bonus: '+30 籌碼', mult: '+4 倍率', glass: '玻璃（×2 倍率）', gold: '金卡（計分時 +$3）' };
  // need:需選手牌的塔羅（作用在你選中的牌上）；沒有 need 的則是即用型
  const TAROTS = [
    { id: 'magician', name: '魔術師', desc: '選 1–2 張手牌 +30 籌碼強化', need: 2, enh: 'bonus' },
    { id: 'empress', name: '女皇', desc: '選 1–2 張手牌 +4 倍率強化', need: 2, enh: 'mult' },
    { id: 'hermit', name: '隱者', desc: '金錢翻倍（上限 +$20）', use: R => { const g = Math.min(20, R.money); R.money += g; return { kind: 'money', amount: g }; } },
    { id: 'strength', name: '力量', desc: '隨機一種牌型 +1 等', use: R => { const t = pick(Object.keys(HANDS)); R.levels[t] = (R.levels[t] || 1) + 1; return { kind: 'level', hand: t, lv: R.levels[t] }; } },
    { id: 'star', name: '星星', desc: '選 1–3 張手牌變 ♦', need: 3, suit: '♦' },
    { id: 'sun', name: '太陽', desc: '選 1–3 張手牌變 ♥', need: 3, suit: '♥' },
    { id: 'glass', name: '塔', desc: '選 1 張手牌變玻璃（×2 倍率）', need: 1, enh: 'glass' },
  ];
  const tarotById = id => TAROTS.find(t => t.id === id);
  // 增幅牌（短暫）：在牌局中使用，本盲注內該牌型 +BOOST_LV 等，盲注結束失效
  const BOOST_LV = 2;
  const BOOSTS = [
    { id: 'b_pair', hand: 'Pair' }, { id: 'b_two', hand: 'Two Pair' }, { id: 'b_three', hand: 'Three of a Kind' },
    { id: 'b_straight', hand: 'Straight' }, { id: 'b_flush', hand: 'Flush' }, { id: 'b_full', hand: 'Full House' },
    { id: 'b_four', hand: 'Four of a Kind' },
  ];
  const boostById = id => BOOSTS.find(b => b.id === id);
  const boostInfo = id => { const b = boostById(id); return { n: `🔥 ${HAND_ZH[b.hand]}增幅`, d: `本盲注內 ${HAND_ZH[b.hand]} +${BOOST_LV} 等（結束失效）` }; };

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  let R = null, meta = { best: 0, wins: 0, runs: 0 }, B = null;   // R=run, B=blind runtime

  // ── 存檔 ──
  const RUN_KEY = 'jokerduel_run_v2', META_KEY = 'jokerduel_meta_v2';
  function save() { try { if (R) localStorage.setItem(RUN_KEY, JSON.stringify(R)); localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
  function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
  function loadMeta() { try { const m = JSON.parse(localStorage.getItem(META_KEY)); if (m) meta = m; } catch (e) {} }
  function loadRun() { try { return JSON.parse(localStorage.getItem(RUN_KEY)); } catch (e) { return null; } }
  function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }

  // ── 新 run ──
  function newRun(diff) {
    R = {
      ante: 1, blindIdx: 0, money: 4, diff,
      levels: {}, jokers: shuffle(JOKERS.slice()).slice(0, 2).map(j => j.id),
      cons: [], deck: makeDeck(),
      handsPer: 4, discPer: 3,
      cpuBlinds: 0, rerollCost: 5, phase: 'blind',
    };
    meta.runs++; save(); startBlind();
  }

  const diffMul = () => (R.diff === 'hard' ? 1.5 : R.diff === 'easy' ? 0.75 : 1);
  const blindTarget = () => Math.round(ANTE_BASE[R.ante] * BLIND_MULT[R.blindIdx] * diffMul());
  const cpuAnte = () => Math.floor(R.cpuBlinds / 3) + 1;

  // ── 開始盲注 ──
  function startBlind() {
    R.phase = 'blind';
    const boss = R.blindIdx === 2 ? BOSSES[(R.ante - 1) % BOSSES.length] : null;
    B = {
      boss, target: blindTarget(), score: 0,
      handsLeft: R.handsPer, discLeft: boss && boss.discards ? boss.discards : R.discPer,
      handSize: (DIFF_HAND[R.diff] || HAND_SIZE) - (boss && boss.handMinus ? boss.handMinus : 0),
      deck: shuffle(R.deck.map(c => ({ ...c }))), hand: [], sel: new Set(), handIdx: 0, busy: false,
      tempLv: {},   // 本盲注內的暫時牌型加等（增幅牌），盲注結束即失效
    };
    drawUp(); save(); renderBlind();
  }
  const drawUp = () => { while (B.hand.length < B.handSize && B.deck.length) B.hand.push(B.deck.pop()); };
  // 等效等級 = 持續（R.levels，星球牌）＋ 短暫（B.tempLv，增幅牌）
  function effLevels() { const m = { ...R.levels }; if (B && B.tempLv) for (const k in B.tempLv) m[k] = (m[k] || 1) + B.tempLv[k]; return m; }
  const ctx = () => ({ levels: effLevels(), boss: B.boss, money: R.money });

  // ── 盲注畫面 ──
  function renderBlind() {
    const g = $('game'); g.innerHTML = '';
    g.appendChild(topBar());
    if (B.boss) g.appendChild(el('div', 'boss', `☠️ Boss：<b>${B.boss.name}</b> — ${B.boss.desc}`));
    g.appendChild(progressBar());
    g.appendChild(jokerRow());
    g.appendChild(consRow(true));
    g.appendChild(levelRow());
    g.appendChild(previewRow());
    g.appendChild(handRow());
    g.appendChild(controlRow());
    g.appendChild(hintRow());
  }
  // 牌型等級面板：顯示已升級（持續）與本盲注增幅（短暫）
  function levelRow() {
    const eff = effLevels();
    const shown = Object.keys(HANDS).filter(h => (eff[h] || 1) > 1);
    const d = el('div', 'row levels');
    d.appendChild(el('span', 'lbl', '📈 牌型等級'));
    if (!shown.length) { d.appendChild(el('i', '', '（皆 Lv1）')); return d; }
    shown.forEach(h => {
      const base = R.levels[h] || 1, temp = (B.tempLv && B.tempLv[h]) || 0;
      const chip = el('div', 'lv', `<b>${HAND_ZH[h]}</b> Lv${eff[h]}` + (temp ? `<span class="tmp">🔥+${temp}</span>` : ''));
      d.appendChild(chip);
    });
    return d;
  }
  function topBar() {
    const t = el('div', 'top');
    t.innerHTML = `<span class="tag">Ante ${R.ante}/${GOAL_ANTE}　<b>${BLIND_ZH[R.blindIdx]}</b></span>
      <span class="tag">💰 <b>$${R.money}</b></span>
      <span class="tag">🤖 對手 Ante <b>${Math.min(GOAL_ANTE, cpuAnte())}</b></span>
      <span class="sp"></span>
      <button id="menu">選單</button>`;
    t.querySelector('#menu').onclick = menu;
    return t;
  }
  function progressBar() {
    const pct = Math.min(100, B.score / B.target * 100);
    const d = el('div', 'prog');
    d.innerHTML = `<div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
      <div class="pnum">目標 <b>${B.target}</b>　本盲注得分 <b class="tot">${B.score}</b></div>`;
    return d;
  }
  function jokerRow(sellable) {
    const d = el('div', 'row jokers');
    d.appendChild(el('span', 'lbl', `🃏 小丑 ${R.jokers.length}/${MAX_JOKERS}`));
    if (!R.jokers.length) d.appendChild(el('i', '', '（無）'));
    R.jokers.forEach((id, i) => {
      const j = jokerById(id); if (!j) return;
      const chip = el('div', 'jk rar-b-' + rarityOf(id), `<span class="jn">${i + 1}</span><b>${j.name}</b><span>${j.desc}</span>`);
      if (sellable) { const s = el('button', 'selljk', '賣 $3'); s.onclick = () => sellJoker(i); chip.appendChild(s); }
      d.appendChild(chip);
    });
    return d;
  }
  function sellJoker(i) { R.jokers.splice(i, 1); R.money += 3; save(); renderShop(); }
  // 小丑已滿時：選一張舊的換成新的。onPick(i)=選定要換掉的索引；onCancel=取消
  function replaceJoker(newId, onPick, onCancel) {
    const nj = jokerById(newId);
    $('ov-title').innerHTML = `🔁 換成 ${nj.name}`;
    $('ov-body').innerHTML = `${nj.desc}<br>小丑已滿，點一張換掉：`;
    const box = $('ov-actions'); box.innerHTML = '';
    R.jokers.forEach((id, i) => {
      const oj = jokerById(id); if (!oj) return;
      const b = el('button', 'draft', `<b>${oj.name}</b><br><span style="font-size:11px;color:#c7d3e6">${oj.desc}</span>`);
      b.onclick = () => onPick(i);
      box.appendChild(b);
    });
    const c = el('button', 'draft', '取消（不換）'); c.onclick = onCancel; box.appendChild(c);
    $('overlay').classList.add('show');
  }
  function consRow(useable) {
    const d = el('div', 'row cons');
    d.appendChild(el('span', 'lbl', `🎴 消耗品 ${R.cons.length}/${MAX_CONS}`));
    if (!R.cons.length) d.appendChild(el('i', '', '（無）'));
    R.cons.forEach((cs, i) => {
      const info = cs.type === 'planet' ? { n: `星球·${cs.id}`, dsc: `${HAND_ZH[PLANETS[cs.id]]} +1 等` } : cs.type === 'boost' ? { n: boostInfo(cs.id).n, dsc: boostInfo(cs.id).d } : { n: tarotById(cs.id).name, dsc: tarotById(cs.id).desc };
      const c = el('div', 'cs', `<b>${info.n}</b><span>${info.dsc}</span>`);
      const b = el('button', 'usebtn', '使用'); b.onclick = () => useCons(i);
      c.appendChild(b); d.appendChild(c);
    });
    return d;
  }
  function previewRow() {
    const d = el('div', 'preview', '（未選牌）');
    d.id = 'preview'; return d;
  }
  function updatePreview() {
    const sel = [...B.sel].map(i => B.hand[i]);
    const p = $('preview'); if (!p) return;
    if (!sel.length) { p.innerHTML = '（未選牌）'; return; }
    const sc = scoreHand(sel, R.jokers.map(jokerById), B.handIdx, ctx());
    p.innerHTML = `${HAND_ZH[sc.type]}　<b>${sc.chips}</b> × <b>${sc.mult}</b> = <b class="tot">${sc.total}</b>`;
  }
  function handRow() {
    const d = el('div', 'hand'); d.id = 'hand';
    B.hand.forEach((c, i) => {
      const e = el('div', 'card' + (B.sel.has(i) ? ' sel' : '') + (RED.has(c.suit) ? ' red' : '') + (debuffed(B.boss, c) ? ' deb' : ''));
      e.innerHTML = `<span class="r">${c.rank}</span><span class="s">${c.suit}</span>` + (c.enh ? `<span class="enh">${enhZH(c.enh)}</span>` : '');
      e.onclick = () => { if (B.busy) return; if (B.sel.has(i)) B.sel.delete(i); else { if (B.sel.size >= 5) return; B.sel.add(i); } refreshHand(); };
      d.appendChild(e);
    });
    return d;
  }
  const enhZH = e => ({ bonus: '籌', mult: '倍', glass: '玻', gold: '金' }[e] || '');
  function refreshHand() { const old = $('hand'); if (old) old.replaceWith(handRow()); updatePreview(); refreshControls(); }
  function controlRow() {
    const d = el('div', 'controls'); d.id = 'controls';
    const play = el('button', 'play', '出牌'); play.id = 'play'; play.onclick = playHand;
    const disc = el('button', 'discard', '棄牌'); disc.id = 'discard'; disc.onclick = discard;
    const sr = el('button', 'sort', '依點數'); sr.onclick = () => { B.hand.sort((a, b) => rankVal(b.rank) - rankVal(a.rank)); B.sel.clear(); refreshHand(); };
    const ss = el('button', 'sort', '依花色'); ss.onclick = () => { B.hand.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || rankVal(b.rank) - rankVal(a.rank)); B.sel.clear(); refreshHand(); };
    const cnts = el('span', 'cnts'); cnts.id = 'cnts';
    d.append(play, disc, sr, ss, cnts); setTimeout(refreshControls, 0); return d;
  }
  function refreshControls() {
    const c = $('cnts'); if (c) c.textContent = `出牌 ${B.handsLeft}　棄牌 ${B.discLeft}`;
    const need5 = B.boss && B.boss.need5, sel = B.sel.size;
    const p = $('play'), d = $('discard');
    if (p) p.disabled = B.busy || sel === 0 || B.handsLeft === 0 || (need5 && sel !== 5);
    if (d) d.disabled = B.busy || sel === 0 || B.discLeft === 0;
  }
  function hintRow() { return el('div', 'hint', '選 1~5 張組牌型 → <b>籌碼×倍率</b>。達到目標即過關；出牌用完仍未達標則落敗。'); }

  const takeSel = () => { const s = [...B.sel].sort((a, b) => b - a); const cards = s.map(i => B.hand[i]); s.forEach(i => B.hand.splice(i, 1)); B.sel.clear(); return cards; };

  async function playHand() {
    const need5 = B.boss && B.boss.need5;
    if (B.busy || !B.sel.size || B.handsLeft === 0 || (need5 && B.sel.size !== 5)) return;
    const cards = takeSel();
    const sc = scoreHand(cards, R.jokers.map(jokerById), B.handIdx, ctx());
    B.score += sc.total; B.handsLeft--; B.handIdx++;
    cards.forEach(c => { if (c.enh === 'gold') R.money += 3; });   // 金卡：計分時 +$3
    const done = B.score >= B.target, bust = B.handsLeft === 0;
    if (!done && !bust) drawUp();
    renderBlind();
    flash(`打出 <b>${HAND_ZH[sc.type]}</b>：${sc.chips} × ${sc.mult} = <b class="tot">+${sc.total}</b>`);
    if (done) { await sleep(650); winBlind(); return; }
    if (bust) { await sleep(650); loseRun(); return; }
  }
  function discard() {
    if (B.busy || !B.sel.size || B.discLeft === 0) return;
    takeSel(); B.discLeft--; drawUp(); renderBlind(); flash('已棄牌並補牌。');
  }
  function flash(html) { const g = $('game'); let f = $('flash'); if (!f) { f = el('div', 'flash', ''); f.id = 'flash'; g.appendChild(f); } f.innerHTML = html; }

  function useCons(i) {
    const cs = R.cons[i];
    let res;
    if (cs.type === 'planet') { const t = PLANETS[cs.id]; R.levels[t] = (R.levels[t] || 1) + 1; res = { kind: 'level', hand: t, lv: R.levels[t] }; }
    else if (cs.type === 'boost') {   // 短暫增幅：本盲注內生效
      const b = boostById(cs.id);
      if (R.phase !== 'blind' || !B) {   // 不在牌局中 → 取消，不消耗
        overlay('要在牌局中使用', `「${HAND_ZH[b.hand]}增幅」只在牌局中生效（本盲注內）。<br>請進入牌局後再使用。`,
          [{ t: '知道了', f: () => { hideOverlay(); renderShop(); } }]);
        return;
      }
      B.tempLv[b.hand] = (B.tempLv[b.hand] || 0) + BOOST_LV;
      res = { kind: 'temp', hand: b.hand, lv: BOOST_LV, cur: (R.levels[b.hand] || 1) + B.tempLv[b.hand] };
    }
    else {
      const t = tarotById(cs.id);
      if (t.need) {   // 需選手牌的塔羅
        if (R.phase !== 'blind' || !B || B.sel.size === 0) {   // 未選牌 → 取消使用，不消耗
          overlay('先選手牌再使用', `「${t.name}」要作用在你選中的手牌上。<br>請在牌局中先點選 1${t.need > 1 ? `–${t.need}` : ''} 張手牌，再按「使用」。`,
            [{ t: '知道了', f: () => { hideOverlay(); if (R.phase === 'blind') renderBlind(); else renderShop(); } }]);
          return;   // 道具保留在欄位
        }
        const idxs = [...B.sel].slice(0, t.need);
        const cards = idxs.map(k => B.hand[k]);
        cards.forEach(c => { if (t.enh) c.enh = t.enh; else c.suit = t.suit; const dc = R.deck.find(x => x.cid === c.cid); if (dc) { if (t.enh) dc.enh = t.enh; else dc.suit = t.suit; } });
        B.sel.clear();
        res = t.enh ? { kind: 'enh', enh: t.enh, cards } : { kind: 'suit', suit: t.suit, cards };
      } else res = t.use(R);
    }
    R.cons.splice(i, 1); save();
    showConsResult(cs, res);   // 遮照顯示這次的變化
  }
  const miniCard = c => `<span class="mini${RED.has(c.suit) ? ' red' : ''}">${c.rank}${c.suit}${c.enh ? `<span class="enh">${enhZH(c.enh)}</span>` : ''}</span>`;
  function showConsResult(cs, res) {
    const nm = cs.type === 'planet' ? `🪐 星球·${cs.id}` : cs.type === 'boost' ? boostInfo(cs.id).n : `🎴 ${tarotById(cs.id).name}`;
    let body = '';
    if (res.kind === 'enh') {
      body = res.cards.length
        ? `這 <b>${res.cards.length}</b> 張牌獲得 <b>${ENH_LABEL[res.enh]}</b> 強化：<div class="cardshow">${res.cards.map(miniCard).join('')}</div>`
        : '（牌組已無可強化的牌）';
    } else if (res.kind === 'suit') {
      body = res.cards.length
        ? `這 <b>${res.cards.length}</b> 張牌變為 <b>${res.suit}</b>：<div class="cardshow">${res.cards.map(miniCard).join('')}</div>`
        : '（沒有變化）';
    } else if (res.kind === 'money') {
      body = `金錢 <b>+$${res.amount}</b>　目前 <b>$${R.money}</b>`;
    } else if (res.kind === 'level') {
      body = `<b>${HAND_ZH[res.hand]}</b> 升級到 <b>Lv${res.lv}</b>（該牌型底分提升）`;
    } else if (res.kind === 'temp') {
      body = `本盲注內 <b>${HAND_ZH[res.hand]}</b> 暫時 +${res.lv} 等（目前等效 <b>Lv${res.cur}</b>）<br><span style="font-size:12px;color:#9fb6a9">⏳ 本盲注結束後失效</span>`;
    }
    overlay(`使用 ${nm}`, body, [{ t: '完成', f: () => { hideOverlay(); if (R.phase === 'blind') { drawUp(); renderBlind(); } else renderShop(); } }]);
  }

  // ── 過盲注 → 獎金 → 對手推進 → 商店 ──
  function winBlind() {
    const unused = B.handsLeft;
    const interest = Math.min(5, Math.floor(R.money / 5));
    const reward = BLIND_REWARD[R.blindIdx] + unused + interest;
    R.money += reward;
    R.cpuBlinds += pick(R.diff === 'hard' ? [1, 1, 2, 2] : R.diff === 'easy' ? [0, 1, 1] : [0, 1, 1, 2]);
    // Boss 過關（一個 ante 完成）？
    const clearedBoss = R.blindIdx === 2;
    if (clearedBoss && R.ante >= GOAL_ANTE) { winRun(); return; }
    R.phase = 'shop'; R.shop = genShop(); save();
    overlay('🎉 過關！', `本盲注達標 ${B.score} / ${B.target}<br>獎金 $${reward}（基本 $${BLIND_REWARD[R.blindIdx]}＋剩餘出牌 $${unused}＋利息 $${interest}）`,
      [{ t: '選一張小丑加強 →', f: () => draftJoker(() => { hideOverlay(); renderShop(); }) }]);
  }

  // 過關獎勵：選一張小丑加入牌組
  function draftJoker(next) {
    let pool = JOKERS.filter(j => !R.jokers.includes(j.id));
    if (pool.length < 3) pool = JOKERS.slice();
    const offer = []; const tmp = pool.slice();     // 依稀有度加權抽 3 張不重複
    while (offer.length < 3 && tmp.length) { const j = weightedJoker(tmp); offer.push(j); tmp.splice(tmp.indexOf(j), 1); }
    const full = R.jokers.length >= MAX_JOKERS;
    $('ov-title').innerHTML = '🃏 過關獎勵 — 選一張小丑';
    $('ov-body').innerHTML = full ? `小丑已滿（${MAX_JOKERS}/${MAX_JOKERS}）：選新小丑後可換掉一張舊的。` : `目前 ${R.jokers.length}/${MAX_JOKERS}　（免費）`;
    const box = $('ov-actions'); box.innerHTML = '';
    offer.forEach(j => {
      const b = el('button', 'draft rar-b-' + rarityOf(j.id), `<b>${j.name}</b> <span class="rar rar-${rarityOf(j.id)}">${RARITY_ZH[rarityOf(j.id)]}</span><br><span style="font-size:11px;color:#c7d3e6">${j.desc}</span>`);
      b.onclick = () => { if (R.jokers.length < MAX_JOKERS) { R.jokers.push(j.id); save(); next(); } else replaceJoker(j.id, (idx) => { R.jokers[idx] = j.id; save(); next(); }, next); };
      box.appendChild(b);
    });
    const sk = el('button', 'draft', '略過');
    sk.onclick = next; box.appendChild(sk);
    $('overlay').classList.add('show');
  }
  function advanceBlind() {
    if (R.blindIdx < 2) R.blindIdx++; else { R.blindIdx = 0; R.ante++; }
    R.rerollCost = 5; startBlind();
  }

  // ── 商店 ──
  function genShop() {
    const items = [], keys = new Set();
    let guard = 0;
    while (items.length < 3 && guard++ < 60) {
      const it = genShopItem();
      const k = it.kind + ':' + it.id;          // 同店不重複同一品項
      if (keys.has(k)) continue;
      keys.add(k); items.push(it);
    }
    return { items, boughtPack: false };
  }
  function genShopItem() {
    const roll = Math.random();
    if (roll < 0.42) { const owned = new Set(R.jokers); const avail = JOKERS.filter(j => !owned.has(j.id)); const j = weightedJoker(avail.length ? avail : JOKERS); return { kind: 'joker', id: j.id, price: rarityPrice(j.id) }; }
    if (roll < 0.65) { const name = pick(Object.keys(PLANETS)); return { kind: 'planet', id: name, price: 3 }; }   // 持續升級
    if (roll < 0.82) { const b = pick(BOOSTS); return { kind: 'boost', id: b.id, price: 2 }; }                    // 短暫增幅（便宜）
    const t = pick(TAROTS); return { kind: 'tarot', id: t.id, price: 4 };
  }
  function shopItemInfo(it) {
    if (it.kind === 'joker') { const j = jokerById(it.id); return { n: `🃏 ${j.name} <span class="rar rar-${rarityOf(j.id)}">${RARITY_ZH[rarityOf(j.id)]}</span>`, d: j.desc }; }
    if (it.kind === 'planet') return { n: `🪐 ${it.id}`, d: `${HAND_ZH[PLANETS[it.id]]} +1 等（持續）` };
    if (it.kind === 'boost') return boostInfo(it.id);
    const t = tarotById(it.id); return { n: `🎴 ${t.name}`, d: t.desc };
  }
  function renderShop() {
    R.phase = 'shop';
    const g = $('game'); g.innerHTML = '';
    g.appendChild(topBar());
    g.appendChild(el('div', 'shop-title', '🛒 商店'));
    g.appendChild(jokerRow(true));   // 商店可賣小丑騰位
    g.appendChild(consRow(true));
    const grid = el('div', 'shop-grid');
    R.shop.items.forEach((it, i) => {
      if (it.sold) { grid.appendChild(el('div', 'shop-item sold', '已售出')); return; }
      const info = shopItemInfo(it);
      const card = el('div', 'shop-item', `<div class="si-n">${info.n}</div><div class="si-d">${info.d}</div><div class="si-p">$${it.price}</div>`);
      const b = el('button', 'buy', '購買'); b.disabled = R.money < it.price || !canBuy(it); b.onclick = () => buy(i);
      card.appendChild(b); grid.appendChild(card);
    });
    g.appendChild(grid);
    const bar = el('div', 'shop-bar');
    const rr = el('button', 'reroll', `🔄 重抽 $${R.rerollCost}`); rr.disabled = R.money < R.rerollCost; rr.onclick = reroll;
    const nx = el('button', 'next', '下一個盲注 →'); nx.onclick = () => advanceBlind();
    bar.append(rr, nx); g.appendChild(bar);
    g.appendChild(el('div', 'hint', '用打怪賺的錢買小丑、星球牌(升級牌型)、塔羅(強化牌組)。消耗品可留著到牌局中再使用。'));
    save();
  }
  function canBuy(it) {
    if (it.kind === 'joker') return true;          // 滿了也能買（買後可換）
    return R.cons.length < MAX_CONS;               // planet/tarot 進消耗品欄
  }
  function buy(i) {
    const it = R.shop.items[i]; if (it.sold || R.money < it.price || !canBuy(it)) return;
    const charge = () => { R.money -= it.price; it.sold = true; };
    if (it.kind === 'joker' && R.jokers.length >= MAX_JOKERS) {
      // 滿了：換牌確認後才扣款；取消則完全不動
      replaceJoker(it.id,
        (idx) => { charge(); R.jokers[idx] = it.id; save(); hideOverlay(); renderShop(); },
        () => { hideOverlay(); renderShop(); });
      return;
    }
    charge();
    if (it.kind === 'joker') R.jokers.push(it.id);
    else R.cons.push({ type: it.kind, id: it.id });
    save(); renderShop();
  }
  function reroll() { if (R.money < R.rerollCost) return; R.money -= R.rerollCost; R.rerollCost += 1; R.shop = genShop(); save(); renderShop(); }

  // ── 結束 ──
  function loseRun() {
    meta.best = Math.max(meta.best, R.ante); clearRun(); R = null; saveMeta();
    overlay('💀 落敗', `你在 Ante ${R.ante} ${BLIND_ZH[R.blindIdx]} 未達標。<br>本 run 最遠 Ante ${R.ante}（歷史最佳 Ante ${meta.best}）。`,
      [{ t: '新遊戲', f: startScreen }]);
  }
  function winRun() {
    meta.best = Math.max(meta.best, GOAL_ANTE); meta.wins++;
    const beatCpu = cpuAnte() < GOAL_ANTE;
    clearRun(); R = null; saveMeta();
    overlay('👑 通關！', `你擊敗了 Ante ${GOAL_ANTE} 的最終 Boss！${beatCpu ? '而且比電腦更快攻頂 🎉' : '電腦也已攻頂，平分秋色。'}<br>累計通關 ${meta.wins} 次。`,
      [{ t: '再玩一局', f: startScreen }]);
  }
  function menu() {
    overlay('選單', `歷史最佳 Ante <b>${meta.best}</b>　通關 <b>${meta.wins}</b> 次`, [
      { t: '繼續', f: hideOverlay },
      { t: '📖 教學', f: () => tutorial(menu) },
      { t: '放棄本局並重新開始', f: () => { clearRun(); R = null; startScreen(); } },
    ]);
  }

  // ── 教學引導（分頁）──
  const TUTORIAL = [
    { t: '🎯 目標', h: '每個「盲注」有一個<b>目標分數</b>，在有限的<b>出牌次數</b>內達到目標就過關。<br>一個 Ante 有小盲注 → 大盲注 → <b>Boss 盲注</b>三關；一路打到 <b>Ante 8</b> 擊敗最終 Boss 即通關，並和電腦競速誰先攻頂。' },
    { t: '🃏 出牌與計分', h: '從手牌選 <b>1~5 張</b>組成撲克牌型（對子、順子、同花…）按<b>出牌</b>。<br>分數 = <b class="tot">籌碼 × 倍率</b>。<br>・只有「計分牌」計籌碼：K/Q/J = 10、A = 11、數字 = 點數。<br>・牌型越大底分越高（一對 10×2、同花 35×4、同花順 100×8…）。' },
    { t: '♻️ 出牌 / 棄牌', h: '每個盲注有 <b>4 次出牌</b> 與 <b>3 次棄牌</b>。<br><b>棄牌</b>可丟掉選中的爛牌重抽、不消耗出牌次數，用來湊更好的牌型。<br>出牌用完仍未達標 → <b>落敗</b>（會記錄你的最佳進度）。' },
    { t: '🃏 小丑 · 🪐 星球 · 🎴 塔羅', h: '・<b>小丑</b>：常駐加成（+籌碼、+倍率、×倍率、依花色/牌型觸發…），最多 5 張、會疊加。<br>・<b>星球牌</b>：永久升級某個<b>牌型</b>的底分。<br>・<b>塔羅</b>：強化牌組（讓牌 +籌/+倍、改花色…）。<br>星球與塔羅放在<b>消耗品欄</b>，按「使用」發動。' },
    { t: '🛒 商店 · ☠️ Boss', h: '每過一關先<b>免費選一張小丑</b>加入牌組（3 選 1），再進<b>商店</b>，用打牌賺的 <b>$</b> 買小丑/星球/塔羅，或花錢<b>重抽</b>。<br>賺錢 = 基本獎金＋剩餘出牌＋利息（持有金錢每 $5 生 $1）。<br><b>Boss 盲注</b>有特殊規則（某花色失效、人頭失效、只能棄 1 次…）；手牌上<b>灰掉</b>的牌代表失效、不計分。' },
    { t: '💾 存檔', h: '進度<b>自動存檔</b>：Ante、金錢、小丑、星球等級、牌組強化都會記錄。<br>下次進來可從起始畫面<b>繼續上次</b>；選單可查歷史最佳 Ante 與通關次數。<br><br>準備好了嗎？祝你好運 🍀' },
  ];
  function tutorial(back) {
    let i = 0;
    const draw = () => {
      const s = TUTORIAL[i];
      $('ov-title').innerHTML = `📖 教學 <span style="font-size:14px;color:#9fb6a9">(${i + 1}/${TUTORIAL.length})</span>　${s.t}`;
      $('ov-body').innerHTML = `<div style="text-align:left;line-height:1.75">${s.h}</div>`;
      const box = $('ov-actions'); box.innerHTML = '';
      if (i > 0) { const b = el('button', 'draft', '← 上一步'); b.onclick = () => { i--; draw(); }; box.appendChild(b); }
      if (i < TUTORIAL.length - 1) { const b = el('button', 'draft', '下一步 →'); b.onclick = () => { i++; draw(); }; box.appendChild(b); }
      else { const b = el('button', 'draft', '完成 ✔'); b.onclick = back || hideOverlay; box.appendChild(b); }
    };
    $('overlay').classList.add('show'); draw();
  }

  // ── overlay ──
  function overlay(title, body, actions) {
    $('ov-title').innerHTML = title; $('ov-body').innerHTML = body; const box = $('ov-actions'); box.innerHTML = '';
    (actions || []).forEach(a => { const b = el('button', 'draft', a.t); b.onclick = a.f; box.appendChild(b); });
    $('overlay').classList.add('show');
  }
  const hideOverlay = () => $('overlay').classList.remove('show');

  // ── 起始畫面 ──
  function startScreen() {
    hideOverlay();
    const saved = loadRun();
    const g = $('game'); g.innerHTML = '';
    g.appendChild(el('div', 'start-title', '🃏 小丑對決 · Balatro 風 run'));
    g.appendChild(el('div', 'start-sub', `對電腦競速攻頂 Ante ${GOAL_ANTE}　·　歷史最佳 Ante ${meta.best}　·　通關 ${meta.wins} 次`));
    const box = el('div', 'start-box');
    if (saved) { const b = el('button', 'draft', `▶ 繼續上次（Ante ${saved.ante} ${BLIND_ZH[saved.blindIdx]}）`); b.onclick = () => { R = saved; if (R.phase === 'shop') renderShop(); else startBlind(); }; box.appendChild(b); }
    ['easy', 'normal', 'hard'].forEach(d => { const b = el('button', 'draft', { easy: '🟢 簡單（手牌 12）', normal: '🟡 普通（手牌 10）', hard: '🔴 困難（手牌 8）' }[d]); b.onclick = () => newRun(d); box.appendChild(b); });
    const tb = el('button', 'draft', '📖 教學'); tb.onclick = () => tutorial(startScreen); box.appendChild(tb);
    g.appendChild(box);
    g.appendChild(el('div', 'hint', '規則：組 poker 牌型(籌碼×倍率)在有限出牌內達到盲注目標。星球牌升級牌型、塔羅強化牌組、小丑疊加加成；每過一關逛商店。進度自動存檔。'));
  }

  function init() {
    loadMeta(); startScreen();
    if (!meta.seenTut) { meta.seenTut = true; saveMeta(); tutorial(startScreen); }   // 首次自動開教學
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();   // 動態注入（已過 DOMContentLoaded）時直接啟動
}
