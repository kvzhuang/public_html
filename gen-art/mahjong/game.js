'use strict';
/* ============================================================
   日本立直麻將（13 張）· 一人對三電腦 · 門清簡化版 v1
   牌編碼 0-33：
     0-8   一~九萬(m)   9-17 一~九筒(p)   18-26 一~九索(s)
     27-33 東 南 西 北 白 發 中(z)
   ============================================================ */

// ───────────────── 牌與工具 ─────────────────
const N_TYPES = 34;
const HONORS = { EAST: 27, SOUTH: 28, WEST: 29, NORTH: 30, WHITE: 31, GREEN: 32, RED: 33 };
const DRAGONS = [31, 32, 33];
const TERMINALS = new Set([0, 8, 9, 17, 18, 26]);            // 老頭牌（1/9 數牌）
const YAOCHU = new Set([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]); // 么九（含字牌）
const KOKUSHI_TILES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

function isHonor(t) { return t >= 27; }
function suitOf(t) { return t < 9 ? 0 : t < 18 ? 1 : t < 27 ? 2 : 3; } // 0m 1p 2s 3z
function numOf(t) { return isHonor(t) ? 0 : (t % 9) + 1; }

function makeWall() {
  const w = [];
  for (let t = 0; t < N_TYPES; t++) for (let k = 0; k < 4; k++) w.push(t);
  // 洗牌
  for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[w[i], w[j]] = [w[j], w[i]]; }
  return w;
}
function toCounts(tiles) { const c = new Array(N_TYPES).fill(0); for (const t of tiles) c[t]++; return c; }
function doraFromIndicator(ind) {                            // 指示牌 → 寶牌
  if (ind < 27) { const base = Math.floor(ind / 9) * 9; return base + (ind - base + 1) % 9; }
  if (ind <= 30) return 27 + (ind - 27 + 1) % 4;             // 風：東南西北環
  return 31 + (ind - 31 + 1) % 3;                            // 三元：白發中環
}

// ───────────────── 和牌判定 ─────────────────
function canMelds(c) {
  let i = 0; while (i < N_TYPES && c[i] === 0) i++;
  if (i === N_TYPES) return true;
  if (c[i] >= 3) { c[i] -= 3; if (canMelds(c)) { c[i] += 3; return true; } c[i] += 3; }
  if (i < 27 && (i % 9) <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--; c[i + 1]--; c[i + 2]--; if (canMelds(c)) { c[i]++; c[i + 1]++; c[i + 2]++; return true; } c[i]++; c[i + 1]++; c[i + 2]++;
  }
  return false;
}
function isStdAgari(cnt) {
  for (let i = 0; i < N_TYPES; i++) if (cnt[i] >= 2) { cnt[i] -= 2; const ok = canMelds(cnt.slice()); cnt[i] += 2; if (ok) return true; }
  return false;
}
function isChiitoi(cnt) { let pairs = 0; for (let i = 0; i < N_TYPES; i++) { if (cnt[i] === 2) pairs++; else if (cnt[i] !== 0) return false; } return pairs === 7; }
function isKokushi(cnt) { let pair = false; for (const t of KOKUSHI_TILES) { if (cnt[t] === 0) return false; if (cnt[t] === 2) pair = true; else if (cnt[t] !== 1) return false; } return pair; }
function isAgari(tiles14) {
  const c = toCounts(tiles14);
  return isStdAgari(c.slice()) || isChiitoi(c) || isKokushi(c);
}
// 13 張的聽牌：回傳可和的牌 id 陣列
function waits(tiles13) {
  const c = toCounts(tiles13); const out = [];
  for (let t = 0; t < N_TYPES; t++) { if (c[t] >= 4) continue; c[t]++; if (isStdAgari(c.slice()) || isChiitoi(c) || isKokushi(c)) out.push(t); c[t]--; }
  return out;
}
function isTenpai(tiles13) { return waits(tiles13).length > 0; }

// 含副露的和牌／聽牌：concealed=暗牌，meldCount=已副露(含槓)面子數
function agariConcealed(concealed, meldCount) {
  if (!meldCount) return isAgari(concealed);
  return isStdAgari(toCounts(concealed));   // 需湊成 (4-meldCount) 面子 + 雀頭
}
function waitsConcealed(concealed, meldCount) {
  const out = [];
  for (let t = 0; t < N_TYPES; t++) { if (agariConcealed(concealed.concat(t), meldCount)) out.push(t); }
  return out;
}
function tenpaiConcealed(concealed, meldCount) { return waitsConcealed(concealed, meldCount).length > 0; }

// 標準型全部分解（4 面子 + 1 雀頭），供役種與符數判定
function stdDecomps(cnt) {
  const res = [];
  for (let p = 0; p < N_TYPES; p++) if (cnt[p] >= 2) { const c = cnt.slice(); c[p] -= 2; meldRec(c, [], res, p); }
  return res;
}
function meldRec(c, melds, res, pair) {
  let i = 0; while (i < N_TYPES && c[i] === 0) i++;
  if (i === N_TYPES) { res.push({ pair, melds: melds.map(m => ({ ...m })) }); return; }
  if (c[i] >= 3) { c[i] -= 3; melds.push({ t: i, seq: false }); meldRec(c, melds, res, pair); melds.pop(); c[i] += 3; }
  if (i < 27 && (i % 9) <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--; c[i + 1]--; c[i + 2]--; melds.push({ t: i, seq: true }); meldRec(c, melds, res, pair); melds.pop(); c[i]++; c[i + 1]++; c[i + 2]++;
  }
}

// ───────────────── 副露（鳴牌）工具 ─────────────────
// 鳴牌物件：{ t:基底牌, seq:bool, open:bool, kan:bool }
function meldTiles(m) {
  if (m.seq) return [m.t, m.t + 1, m.t + 2];
  return m.kan ? [m.t, m.t, m.t, m.t] : [m.t, m.t, m.t];
}
function ponOptions(cnt, tile) { return cnt[tile] >= 2; }
function kanOptions(cnt, tile) { return cnt[tile] >= 3; }
function ankanOptions(cnt) { const out = []; for (let t = 0; t < N_TYPES; t++) if (cnt[t] === 4) out.push(t); return out; }
function chiOptions(cnt, tile) {           // 只有數牌可吃；回傳可組成的順子基底牌陣列
  if (tile >= 27) return [];
  const n = tile % 9, base = tile - n, out = [];
  if (n >= 2 && cnt[tile - 2] > 0 && cnt[tile - 1] > 0) out.push(tile - 2);   // t-2,t-1,t
  if (n >= 1 && n <= 7 && cnt[tile - 1] > 0 && cnt[tile + 1] > 0) out.push(tile - 1); // t-1,t,t+1
  if (n <= 6 && cnt[tile + 1] > 0 && cnt[tile + 2] > 0) out.push(tile);       // t,t+1,t+2
  return out;
}

// ───────────────── 役種與計分 ─────────────────
// concealed：暗牌（含和了牌）。ctx.melds：已副露/槓的面子；ctx.menzen：是否門前清
// ctx: { winTile, tsumo, riichi, ippatsu, haitei, houtei, rinshan, seatWind, roundWind, doras[], uras[], melds[], menzen }
function evalWin(concealed, ctx) {
  const melds = ctx.melds || [];
  const menzen = ctx.menzen !== false;
  const cnt = toCounts(concealed);
  const allTiles = concealed.concat(...melds.map(meldTiles));
  const allCnt = toCounts(allTiles);
  const doraHan = countDora(allTiles, ctx.doras) + (ctx.riichi ? countDora(allTiles, ctx.uras) : 0);
  // 儲存的鳴牌：{t, seq, kan, concealed(僅暗槓)} → 正規化
  const called = melds.map(m => ({ t: m.t, seq: !!m.seq, kan: !!m.kan, open: !m.concealed }));
  let best = null;
  // 國士無雙 / 七對子 僅限完全門清且無副露
  if (melds.length === 0) {
    if (isKokushi(cnt)) return finalize([{ n: '國士無雙', han: 13 }], 25, ctx, true, 0);
    if (isChiitoi(cnt)) {
      const y = [{ n: '七對子', han: 2 }];
      addUniversal(y, ctx, menzen);
      if (allTanyao(allCnt)) y.push({ n: '斷么九', han: 1 });
      const flush = suitFlush(allCnt); if (flush === 'chin') y.push({ n: '清一色', han: 6 }); else if (flush === 'hon') y.push({ n: '混一色', han: 3 });
      best = pick(best, finalize(y, 25, ctx, false, doraHan));
    }
  }
  // 標準型：把暗牌分解成 (4 - 副露數) 面子 + 雀頭，再與副露合併評役
  for (const d of stdDecomps(cnt)) {
    if (d.melds.length + called.length !== 4) continue;
    const combined = { pair: d.pair, melds: d.melds.map(m => ({ t: m.t, seq: m.seq, open: false, kan: false, minkan: false })).concat(called) };
    const y = evalStd(combined, d, allCnt, ctx, menzen);
    best = pick(best, finalize(y, fuOf(combined, d, ctx, menzen), ctx, isYakuman(y), doraHan));
  }
  return best;
}
function pick(a, b) { if (!a) return b; if (!b) return a; return b.points > a.points ? b : a; }
function isYakuman(y) { return y.some(x => x.han >= 13); }
function addUniversal(y, ctx, menzen) {
  if (ctx.riichi) y.push({ n: '立直', han: 1 });
  if (ctx.ippatsu) y.push({ n: '一發', han: 1 });
  if (ctx.tsumo && menzen) y.push({ n: '門前清自摸', han: 1 });
  if (ctx.rinshan) y.push({ n: '嶺上開花', han: 1 });
  if (ctx.haitei) y.push({ n: '海底摸月', han: 1 });
  if (ctx.houtei) y.push({ n: '河底撈魚', han: 1 });
}
function allTanyao(cnt) { for (let t = 0; t < N_TYPES; t++) if (cnt[t] && YAOCHU.has(t)) return false; return true; }
function suitFlush(cnt) { // 'chin' 清一色 / 'hon' 混一色 / null
  const suits = new Set(); let honor = false;
  for (let t = 0; t < N_TYPES; t++) if (cnt[t]) { if (isHonor(t)) honor = true; else suits.add(suitOf(t)); }
  if (suits.size !== 1) return null;
  return honor ? 'hon' : 'chin';
}
function countDora(tiles, doras) { if (!doras || !doras.length) return 0; let n = 0; for (const t of tiles) for (const d of doras) if (t === d) n++; return n; }

// cb：合併後（暗+副露）的面子與雀頭；d：暗牌分解（判聽型/暗刻）；cnt：全部牌計數
function evalStd(cb, d, cnt, ctx, menzen) {
  const y = [];
  addUniversal(y, ctx, menzen);
  const melds = cb.melds, pair = cb.pair;
  const seqs = melds.filter(m => m.seq), trips = melds.filter(m => !m.seq);
  const openReduce = menzen ? 0 : 1;         // 鳴牌降 1 番
  // 斷么九（喰い斷么亦計）
  if (allTanyao(cnt)) y.push({ n: '斷么九', han: 1 });
  // 役牌（三元 + 自風 + 場風）
  for (const m of trips) {
    if (DRAGONS.includes(m.t)) y.push({ n: '役牌 ' + tileZH(m.t), han: 1 });
    if (m.t === ctx.seatWind) y.push({ n: '自風 ' + tileZH(m.t), han: 1 });
    if (m.t === ctx.roundWind) y.push({ n: '場風 ' + tileZH(m.t), han: 1 });
  }
  const pairYakuhai = DRAGONS.includes(pair) || pair === ctx.seatWind || pair === ctx.roundWind;
  // 平和（門清）
  if (menzen && seqs.length === 4 && !pairYakuhai && waitType(d, ctx.winTile) === 'ryanmen') y.push({ n: '平和', han: 1 });
  // 一盃口（門清）
  if (menzen) { const sk = seqs.map(m => m.t).sort((a, b) => a - b); for (let i = 0; i + 1 < sk.length; i++) if (sk[i] === sk[i + 1]) { y.push({ n: '一盃口', han: 1 }); break; } }
  // 三色同順
  const seqNums = {}; for (const m of seqs) { const n = m.t % 9; (seqNums[n] = seqNums[n] || new Set()).add(suitOf(m.t)); }
  for (const n in seqNums) if (seqNums[n].size === 3) { y.push({ n: '三色同順', han: 2 - openReduce }); break; }
  // 一氣通貫
  for (let s = 0; s < 3; s++) { const b = s * 9; if (seqs.some(m => m.t === b) && seqs.some(m => m.t === b + 3) && seqs.some(m => m.t === b + 6)) { y.push({ n: '一氣通貫', han: 2 - openReduce }); break; } }
  // 對對和
  if (trips.length === 4) y.push({ n: '對對和', han: 2 });
  // 暗刻數 → 三/四暗刻（暗槓算暗刻；榮和完成的雙碰刻視為明刻）
  let ankou = d.melds.filter(m => !m.seq).length + cb.melds.filter(m => m.kan && !m.open).length;
  if (!ctx.tsumo && waitType(d, ctx.winTile) === 'shanpon') ankou--;
  if (ankou >= 4) y.push({ n: '四暗刻', han: 13 });
  else if (ankou === 3) y.push({ n: '三暗刻', han: 2 });
  // 三元
  const dragTrip = trips.filter(m => DRAGONS.includes(m.t)).length;
  if (dragTrip === 3) y.push({ n: '大三元', han: 13 });
  else if (dragTrip === 2 && DRAGONS.includes(pair)) y.push({ n: '小三元', han: 2 });
  // 全帶么九 / 純全帶
  const setHasYao = m => m.seq ? (m.t % 9 === 0 || m.t % 9 === 6) : YAOCHU.has(m.t);
  if (melds.every(setHasYao) && YAOCHU.has(pair)) { const hasHonor = melds.some(m => isHonor(m.t)) || isHonor(pair); y.push(hasHonor ? { n: '混全帶么九', han: 2 - openReduce } : { n: '純全帶么九', han: 3 - openReduce }); }
  // 混一色 / 清一色
  const flush = suitFlush(cnt); if (flush === 'chin') y.push({ n: '清一色', han: 6 - openReduce }); else if (flush === 'hon') y.push({ n: '混一色', han: 3 - openReduce });
  return y;
}
function waitType(d, winTile) {
  // 判斷和了牌在此分解中的聽型
  if (d.pair === winTile) return 'tanki';
  for (const m of d.melds) {
    if (!m.seq) { if (m.t === winTile) return 'shanpon'; continue; }
    const a = m.t, b = m.t + 1, c = m.t + 2;
    if (winTile === b) return 'kanchan';
    if (winTile === a) return (a % 9 === 6) ? 'penchan' : 'ryanmen'; // 789 等 7 → 邊張
    if (winTile === c) return (a % 9 === 0) ? 'penchan' : 'ryanmen'; // 123 等 3 → 邊張
  }
  return 'ryanmen';
}
function fuOf(cb, d, ctx, menzen) {
  const pair = cb.pair, melds = cb.melds;
  const pairYakuhai = DRAGONS.includes(pair) || pair === ctx.seatWind || pair === ctx.roundWind;
  const allSeq = melds.every(m => m.seq);
  const wt = waitType(d, ctx.winTile);
  const pinfuShape = allSeq && !pairYakuhai && wt === 'ryanmen';
  if (menzen && pinfuShape) return ctx.tsumo ? 20 : 30;    // 門清平和
  let fu = 20;
  if (menzen && !ctx.tsumo) fu += 10;                       // 門前清榮和
  if (ctx.tsumo && !pinfuShape) fu += 2;                    // 自摸符
  if (pairYakuhai) fu += 2;
  if (wt === 'kanchan' || wt === 'penchan' || wt === 'tanki') fu += 2;
  for (const m of melds) {
    if (m.seq) continue;
    const yao = YAOCHU.has(m.t);
    if (m.kan) { fu += m.open ? (yao ? 16 : 8) : (yao ? 32 : 16); continue; }  // 明槓/暗槓
    // 刻子：暗刻/明刻。榮和以雙碰完成的那副視為明刻
    const minko = m.open || (!ctx.tsumo && m.t === ctx.winTile && wt === 'shanpon');
    fu += minko ? (yao ? 4 : 2) : (yao ? 8 : 4);
  }
  fu = Math.ceil(fu / 10) * 10;
  if (!menzen && fu < 30) fu = 30;                          // 喰い平和形榮和 → 30 符
  return fu;
}
function finalize(yaku, fu, ctx, yakuman, doraHan) {
  let han = yaku.reduce((s, x) => s + x.han, 0);
  const hasYaku = han > 0;               // 不含寶牌
  if (!yakuman) { if (doraHan) yaku.push({ n: '寶牌', han: doraHan }); han += doraHan; }
  const points = scorePoints(han, fu, ctx.dealer, ctx.tsumo, yakuman);
  return { yaku, han, fu, points, hasYaku, yakuman };
}
function scorePoints(han, fu, dealer, tsumo, yakuman) {
  let base;
  if (yakuman) base = 8000 * Math.floor(han / 13);
  else if (han >= 13) base = 8000; else if (han >= 11) base = 6000; else if (han >= 8) base = 4000;
  else if (han >= 6) base = 3000; else if (han >= 5) base = 2000;
  else base = Math.min(2000, fu * Math.pow(2, 2 + han));
  const ceil100 = x => Math.ceil(x / 100) * 100;
  if (tsumo) {
    if (dealer) { const each = ceil100(base * 2); return { total: each * 3, each, ron: 0, dealerPay: 0, tsumo: true, dealer: true }; }
    const other = ceil100(base), dp = ceil100(base * 2); return { total: other * 2 + dp, each: other, dealerPay: dp, ron: 0, tsumo: true, dealer: false };
  }
  const ron = ceil100(base * (dealer ? 6 : 4));
  return { total: ron, ron, tsumo: false, dealer };
}

// ───────────────── 顯示名 ─────────────────
function tileZH(t) {
  if (t < 9) return (t + 1) + '萬';
  if (t < 18) return (t - 9 + 1) + '筒';
  if (t < 27) return (t - 18 + 1) + '索';
  return ['東', '南', '西', '北', '白', '發', '中'][t - 27];
}

// ── node 匯出（供測試）──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makeWall, toCounts, isAgari, waits, isTenpai, isStdAgari, isChiitoi, isKokushi,
    stdDecomps, evalWin, doraFromIndicator, tileZH, suitOf, numOf, isHonor, HONORS,
    meldTiles, ponOptions, kanOptions, ankanOptions, chiOptions,
    agariConcealed, waitsConcealed, tenpaiConcealed,
  };
}

/* ============================================================
                        UI（瀏覽器）
   ============================================================ */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const WINDS_ZH = ['東', '南', '西', '北'];
  const SEAT_LABEL = ['你（下家自己）', '右家', '對家', '左家']; // 相對座位
  const POS = ['bottom', 'right', 'top', 'left'];

  let G = null; // 對局狀態

  // 對手立繪（assets/ 下的檔名，不含副檔名；大頭用 thumb/xxx.jpg，原圖 xxx.png）
  const AVATARS = []; for (let i = 180; i <= 198; i++) AVATARS.push('generated-image-' + i);
  function pickAvatars() {
    const pool = AVATARS.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
    return [null, pool[0], pool[1], pool[2]];   // 座位 0 是玩家
  }

  function newGame() {
    G = { scores: [25000, 25000, 25000, 25000], roundWind: 27, dealer: 0, handNo: 1, honba: 0, riichiSticks: 0, over: false, avatars: pickAvatars() };
    startHand();
  }
  function startHand() {
    const wall = makeWall();
    const deadwall = wall.splice(wall.length - 14, 14); // 王牌 14 張
    const P = [];
    for (let i = 0; i < 4; i++) P.push({
      hand: wall.splice(0, 13).sort((a, b) => a - b), discards: [], melds: [], menzen: true,
      riichi: false, riichiIdx: -1, ippatsu: false, drawn: -1, seatWind: 27 + ((i - G.dealer + 4) % 4), furitenTemp: false,
    });
    // 王牌 14 張：嶺上 [0..3]、寶牌指示 [5..8]、裏寶牌 [9..12]
    G.P = P; G.wall = wall; G.deadwall = deadwall; G.rinshanPtr = 0; G.rinshan = false;
    G.doraInd = [deadwall[5]]; G.uraInd = [deadwall[9]];
    G.doras = [doraFromIndicator(deadwall[5])]; G.uras = [doraFromIndicator(deadwall[9])];
    G.turn = G.dealer; G.phase = 'play'; G.lastDiscard = -1; G.lastDiscardFrom = -1;
    G.msg = `${WINDS_ZH[(G.roundWind - 27)]}${G.handNo} 局　莊家：${SEAT_LABEL[G.dealer]}`;
    render(); step();
  }

  // 抽牌 → 出牌 的推進
  async function step() {
    if (G.phase !== 'play') return;
    const p = G.turn, pl = G.P[p];
    if (G.wall.length === 0) { return exhaustiveDraw(); }
    pl.drawn = G.wall.shift(); G.rinshan = false;
    render();                      // 玩家：render 內會呼叫 updatePlayerActions
    if (p !== 0) { await wait(650); aiTurn(p); }
  }

  function handPlus(pl) { return pl.drawn >= 0 ? pl.hand.concat(pl.drawn) : pl.hand.slice(); }

  // ── 玩家操作（自己回合，摸牌後）──
  function updatePlayerActions() {
    const pl = G.P[0];
    const full = handPlus(pl);
    const canTsumo = pl.drawn >= 0 && agariConcealed(full, pl.melds.length) && !!evalContext(0, pl.drawn, true).res.hasYaku;
    const acts = $('actions'); acts.innerHTML = '';
    if (riichiMode) { acts.appendChild(el('span', 'hint2', '🔔 立直：點【綠框】的牌切出（灰色會破壞聽牌）')); return; }
    if (canTsumo) { const b = el('button', 'act win', '🀄 自摸'); b.onclick = () => declareWin(0, pl.drawn, true); acts.appendChild(b); }
    // 槓（自己回合、已摸牌、非立直）
    if (pl.drawn >= 0 && !pl.riichi && !riichiMode) {
      ankanOptions(toCounts(full)).forEach(t => { const b = el('button', 'act kan', '暗槓 ' + tileZH(t)); b.onclick = () => execAnkan(t); acts.appendChild(b); });
      pl.melds.filter(m => !m.seq && !m.kan).forEach(m => { if (full.includes(m.t)) { const b = el('button', 'act kan', '加槓 ' + tileZH(m.t)); b.onclick = () => execShouminkan(m.t); acts.appendChild(b); } });
    }
    // 立直（門清、聽牌、牌山足夠、分數足夠）
    if (!pl.riichi && pl.menzen && pl.drawn >= 0 && G.wall.length >= 4 && G.scores[0] >= 1000 && tenpaiAfterDiscard(pl)) {
      const b = el('button', 'act riichi', '🔔 立直'); b.onclick = () => enterRiichi(); acts.appendChild(b);
    }
    if (pl.riichi) { // 立直後自動摸切（可自摸則等玩家決定）
      if (canTsumo) { const b = el('button', 'act pass', '摸切（不和）'); b.onclick = () => discard(0, G.P[0].hand.length); acts.appendChild(b); }
      else { acts.appendChild(el('span', 'hint2', '立直中：自動摸切…')); setTimeout(() => { if (G.phase === 'play' && G.turn === 0 && G.P[0].drawn >= 0) discard(0, G.P[0].hand.length); }, 750); }
    }
  }
  // 立直可行：丟掉某張後仍聽牌（門清無副露）
  function tenpaiAfterDiscard(pl) { const full = handPlus(pl); for (let i = 0; i < full.length; i++) { const rest = full.slice(0, i).concat(full.slice(i + 1)); if (tenpaiConcealed(rest, pl.melds.length)) return true; } return false; }

  let riichiMode = false;
  function enterRiichi() { riichiMode = true; G.msg = '🔔 立直宣告：綠框=切了仍聽牌可選；灰色=會破壞聽牌'; render(); }

  // 玩家點擊手牌出牌；idx 指 hand 陣列位置，或 = hand.length 表示切摸到的牌
  function onTileClick(idx) {
    if (G.phase !== 'play' || G.turn !== 0) return;
    const pl = G.P[0];
    if (riichiMode) {
      const full = handPlus(pl); const rest = full.slice(0, idx).concat(full.slice(idx + 1));
      if (!tenpaiConcealed(rest, pl.melds.length)) { flash('這樣切出後沒有聽牌，換一張'); return; }
      pl.riichi = true; pl.ippatsu = true; pl.riichiIdx = pl.discards.length; G.scores[0] -= 1000; G.riichiSticks++;
      riichiMode = false;
      doDiscard(0, idx, true);
      return;
    }
    doDiscard(0, idx, false);
  }
  function discard(p, idx) { doDiscard(p, idx, false); }

  function doDiscard(p, idx, riichiDeclare) {
    const pl = G.P[p]; const full = handPlus(pl);
    const tile = full[idx];
    // 重建手牌（移除該張，把摸到的牌併入）
    const nf = full.slice(0, idx).concat(full.slice(idx + 1));
    pl.hand = nf.sort((a, b) => a - b); pl.drawn = -1;
    pl.discards.push({ t: tile, riichi: riichiDeclare, tsumogiri: idx === full.length - 1 });
    G.lastDiscard = tile; G.lastDiscardFrom = p; G.rinshan = false;
    // 立直者在宣言之後的下一次捨牌，一發窗口結束
    if (pl.riichi && !riichiDeclare) pl.ippatsu = false;
    render();
    resolveDiscard(tile, p);
  }

  // ── 捨牌後：解決 榮和 / 碰 / 槓 / 吃（優先序：榮和 > 碰槓 > 吃）──
  function canRon(p, tile) {
    const pl = G.P[p];
    if (!waitsConcealed(pl.hand, pl.melds.length).includes(tile)) return false;
    if (!agariConcealed(pl.hand.concat(tile), pl.melds.length)) return false;
    if (isFuriten(p)) return false;
    return evalContext(p, tile, false).res.hasYaku;
  }
  const chiSeatOf = p => (p + 3) % 4;              // p 只能吃其上家（chiSeatOf(p)）打出的牌
  function humanOptions(tile, from) {
    const o = { ron: false, pon: false, kan: false, chis: [] };
    if (from === 0) return o;
    const pl = G.P[0], cnt = toCounts(pl.hand);
    if (canRon(0, tile)) o.ron = true;
    if (!pl.riichi) {                               // 立直中不可鳴牌
      if (ponOptions(cnt, tile)) o.pon = true;
      if (kanOptions(cnt, tile)) o.kan = true;
      if (chiSeatOf(0) === from) o.chis = chiOptions(cnt, tile);
    }
    return o;
  }
  function resolveDiscard(tile, from) {
    const o = humanOptions(tile, from);
    if (o.ron || o.pon || o.kan || o.chis.length) return promptHumanCalls(tile, from, o);
    aiResolve(tile, from);
  }
  function promptHumanCalls(tile, from, o) {
    const acts = $('actions'); acts.innerHTML = '';
    if (o.ron) { const b = el('button', 'act win', '🀄 榮和'); b.onclick = () => declareWin(0, tile, false, from); acts.appendChild(b); }
    if (o.pon) { const b = el('button', 'act call', '碰'); b.onclick = () => execPon(0, tile, from); acts.appendChild(b); }
    if (o.kan) { const b = el('button', 'act call', '槓'); b.onclick = () => execDaiminkan(0, tile, from); acts.appendChild(b); }
    o.chis.forEach(base => { const b = el('button', 'act call', '吃 ' + tileZH(base) + tileZH(base + 1) + tileZH(base + 2)); b.onclick = () => execChi(0, tile, from, base); acts.appendChild(b); });
    const s = el('button', 'act pass', '略過'); s.onclick = () => { if (o.ron) G.P[0].furitenTemp = true; acts.innerHTML = ''; aiResolve(tile, from); }; acts.appendChild(s);
    G.msg = '可以鳴牌／榮和！'; renderMsg();
  }
  function aiResolve(tile, from) {
    // AI 榮和（依巡序最近者）
    for (let d = 1; d <= 3; d++) { const p = (from + d) % 4; if (p === 0 || p === from) continue; if (canRon(p, tile)) return declareWin(p, tile, false, from); }
    // AI 碰（僅碰役牌：三元／自風／場風，用來成役）
    for (let d = 1; d <= 3; d++) {
      const p = (from + d) % 4; if (p === 0 || p === from) continue; const pl = G.P[p];
      if (pl.riichi) continue;
      const cnt = toCounts(pl.hand);
      if (ponOptions(cnt, tile) && isYakuhaiTile(p, tile)) return execPon(p, tile, from);
    }
    advanceTurn();
  }
  function isYakuhaiTile(p, tile) { return DRAGONS.includes(tile) || tile === G.P[p].seatWind || tile === G.roundWind; }

  function advanceTurn() {
    G.turn = (G.lastDiscardFrom + 1) % 4;
    G.P[G.turn].furitenTemp = false;   // 輪到自己摸牌前，解除臨時振聽
    step();
  }

  // ── 鳴牌執行 ──
  function removeFromHand(pl, tile, n) { for (let k = 0; k < n; k++) { const i = pl.hand.indexOf(tile); if (i >= 0) pl.hand.splice(i, 1); } }
  function takeDiscard(from) { G.P[from].discards.pop(); }               // 被鳴走的牌移出河
  function breakIppatsu() { for (const pl of G.P) pl.ippatsu = false; }
  function execPon(p, tile, from) {
    const pl = G.P[p]; removeFromHand(pl, tile, 2);
    pl.melds.push({ t: tile, seq: false, kan: false, concealed: false, from }); pl.menzen = false;
    takeDiscard(from); breakIppatsu(); G.lastDiscardFrom = p; G.turn = p; afterCallDiscard(p, '碰');
  }
  function execChi(p, tile, from, base) {
    const pl = G.P[p];[base, base + 1, base + 2].forEach(t => { if (t !== tile) removeFromHand(pl, t, 1); });
    pl.melds.push({ t: base, seq: true, kan: false, concealed: false, from }); pl.menzen = false;
    takeDiscard(from); breakIppatsu(); G.lastDiscardFrom = p; G.turn = p; afterCallDiscard(p, '吃');
  }
  function execDaiminkan(p, tile, from) {
    const pl = G.P[p]; removeFromHand(pl, tile, 3);
    pl.melds.push({ t: tile, seq: false, kan: true, concealed: false, from }); pl.menzen = false;
    takeDiscard(from); breakIppatsu(); G.lastDiscardFrom = p; G.turn = p; kanDraw(p);
  }
  function execAnkan(t) {
    const p = 0, pl = G.P[p]; mergeDrawn(pl); removeFromHand(pl, t, 4);
    pl.melds.push({ t, seq: false, kan: true, concealed: true, from: p }); breakIppatsu(); G.turn = p; kanDraw(p);
  }
  function execShouminkan(t) {
    const p = 0, pl = G.P[p]; mergeDrawn(pl); removeFromHand(pl, t, 1);
    const m = pl.melds.find(x => !x.seq && !x.kan && x.t === t); if (m) { m.kan = true; }
    breakIppatsu(); G.turn = p; kanDraw(p);
  }
  function mergeDrawn(pl) { if (pl.drawn >= 0) { pl.hand.push(pl.drawn); pl.drawn = -1; pl.hand.sort((a, b) => a - b); } }
  function kanDraw(p) {
    // 翻新寶牌／裏寶牌
    const di = G.deadwall[5 + G.doraInd.length]; G.doraInd.push(di); G.doras.push(doraFromIndicator(di));
    const ui = G.deadwall[9 + G.uraInd.length]; G.uraInd.push(ui); G.uras.push(doraFromIndicator(ui));
    const rt = G.deadwall[G.rinshanPtr++];        // 嶺上牌
    if (G.wall.length) G.wall.pop();               // 補王牌 → 可摸張數 -1
    G.P[p].drawn = rt; G.rinshan = true;
    render();
    if (p === 0) updatePlayerActions(); else setTimeout(() => aiTurn(p), 550);
  }
  function afterCallDiscard(p, how) {
    G.rinshan = false; render();
    if (p === 0) { G.msg = `已${how}，請出一張牌`; renderMsg(); }
    else { G.msg = `${SEAT_LABEL[p]} ${how}`; renderMsg(); setTimeout(() => aiDiscardOnly(p), 550); }
  }
  function aiDiscardOnly(p) {
    if (G.phase !== 'play') return;
    const pl = G.P[p], full = pl.hand.slice(); const c = toCounts(full);
    let worst = 0, wv = 1e9; for (let i = 0; i < full.length; i++) { const v = tileUseful(full[i], c); if (v < wv) { wv = v; worst = i; } }
    doDiscard(p, worst, false);
  }

  // ── AI ──
  function aiTurn(p) {
    if (G.phase !== 'play') return;
    const pl = G.P[p]; const full = handPlus(pl);
    // 自摸（含嶺上開花）
    if (agariConcealed(full, pl.melds.length) && evalContext(p, pl.drawn, true).res.hasYaku) return declareWin(p, pl.drawn, true);
    // 立直宣言（僅門清）
    if (!pl.riichi && pl.menzen && G.wall.length >= 4 && G.scores[p] >= 1000) {
      for (let i = 0; i < full.length; i++) { const rest = full.slice(0, i).concat(full.slice(i + 1)); if (tenpaiConcealed(rest, pl.melds.length)) { pl.riichi = true; pl.ippatsu = true; pl.riichiIdx = pl.discards.length; G.scores[p] -= 1000; G.riichiSticks++; return doDiscard(p, i, true); } }
    }
    if (pl.riichi) { return doDiscard(p, full.length - 1, false); } // 摸切
    // 一般：挑最沒用的牌切
    let worst = 0, worstV = 1e9;
    const c = toCounts(full);
    for (let i = 0; i < full.length; i++) { const t = full[i]; const v = tileUseful(t, c); if (v < worstV) { worstV = v; worst = i; } }
    doDiscard(p, worst, false);
  }
  function tileUseful(t, c) {
    let v = (c[t] - 1) * 30;                       // 對子/刻子價值
    if (isHonor(t)) return v;                      // 孤張字牌最沒用
    const n = t % 9, base = t - n;
    for (const dd of [-2, -1, 1, 2]) { const nn = n + dd; if (nn >= 0 && nn < 9) v += (c[base + nn] > 0 ? (Math.abs(dd) === 1 ? 12 : 6) : 0); }
    v += (n >= 2 && n <= 6) ? 3 : 0;               // 中張略優
    return v;
  }

  // ── 情境與計分 ──
  function evalContext(p, winTile, tsumo, from) {
    const pl = G.P[p];
    const concealed = tsumo ? handPlus(pl) : pl.hand.concat(winTile);
    const melds = pl.melds.map(m => ({ t: m.t, seq: m.seq, kan: m.kan, concealed: m.concealed }));
    const ctx = {
      winTile, tsumo, riichi: pl.riichi, ippatsu: pl.ippatsu, rinshan: G.rinshan && tsumo,
      haitei: tsumo && G.wall.length === 0, houtei: !tsumo && G.wall.length === 0,
      seatWind: pl.seatWind, roundWind: G.roundWind, doras: G.doras, uras: G.uras,
      dealer: p === G.dealer, melds, menzen: pl.menzen,
    };
    const res = evalWin(concealed, ctx) || { yaku: [], han: 0, fu: 20, hasYaku: false, points: { total: 0 } };
    return { ctx, res, concealed };
  }
  function isFuriten(p) {
    const pl = G.P[p]; const w = waitsConcealed(pl.hand, pl.melds.length);
    if (pl.furitenTemp) return true;
    for (const d of pl.discards) if (w.includes(d.t)) return true;   // 自家捨牌振聽
    return false;
  }

  function declareWin(p, tile, tsumo, from) {
    G.phase = 'end';
    const { res, concealed, ctx } = evalContext(p, tile, tsumo, from);
    // 分數結算
    const pts = res.points; let delta = new Array(4).fill(0);
    if (tsumo) {
      if (ctx.dealer) { for (let i = 0; i < 4; i++) if (i !== p) { delta[i] -= pts.each; delta[p] += pts.each; } }
      else { for (let i = 0; i < 4; i++) if (i !== p) { const pay = (i === G.dealer) ? pts.dealerPay : pts.each; delta[i] -= pay; delta[p] += pay; } }
    } else { delta[from] -= pts.ron; delta[p] += pts.ron; }
    // 本場（每家 +100/-100 依和法）
    const honbaPts = G.honba * (tsumo ? 100 : 300);
    if (tsumo) { for (let i = 0; i < 4; i++) if (i !== p) { delta[i] -= G.honba * 100; delta[p] += G.honba * 100; } }
    else { delta[from] -= honbaPts; delta[p] += honbaPts; }
    // 立直棒
    delta[p] += G.riichiSticks * 1000; G.riichiSticks = 0;
    for (let i = 0; i < 4; i++) G.scores[i] += delta[i];
    showResult(p, tsumo, from, res, concealed, G.P[p].melds, delta);
  }

  function exhaustiveDraw() {
    G.phase = 'end';
    const tenpai = G.P.map(pl => tenpaiConcealed(pl.hand, pl.melds.length));
    const nT = tenpai.filter(Boolean).length;
    let delta = new Array(4).fill(0);
    if (nT > 0 && nT < 4) { const gain = 3000 / nT, lose = 3000 / (4 - nT); for (let i = 0; i < 4; i++) delta[i] += tenpai[i] ? gain : -lose; }
    for (let i = 0; i < 4; i++) G.scores[i] += Math.round(delta[i]);
    showDraw(tenpai, delta);
  }

  // ── 局間推進 ──
  function nextHand(dealerKeeps) {
    if (G.scores.some(s => s < 0)) { return gameOver(); }
    if (dealerKeeps) { G.honba++; }
    else {
      G.honba = 0; G.dealer = (G.dealer + 1) % 4; G.handNo++;
      if (G.handNo > 4) { // 東風戰結束
        if (G.roundWind === 27) { return gameOver(); }
      }
    }
    startHand();
  }
  function gameOver() {
    G.over = true;
    const order = [0, 1, 2, 3].sort((a, b) => G.scores[b] - G.scores[a]);
    const rows = order.map((p, i) => `<div class="rk"><b>${i + 1} 位</b>　${SEAT_LABEL[p]}　<span class="tot">${G.scores[p]}</span></div>`).join('');
    overlay('🏁 對局結束', `<div class="ranks">${rows}</div>`, [{ t: '再來一局', f: () => { hideOverlay(); newGame(); } }]);
  }

  // ───────────── 畫面（堆疊式）─────────────
  function render() {
    const g = $('table'); g.innerHTML = '';
    const opps = el('div', 'opps');
    [3, 2, 1].forEach(p => opps.appendChild(oppPanel(p)));   // 左家 / 對家 / 右家
    g.appendChild(opps);
    g.appendChild(centerInfo());
    g.appendChild(playerArea());
    renderMsg();
    if (G.turn === 0 && G.phase === 'play') updatePlayerActions();
  }
  function renderMsg() { $('msg').innerHTML = G.msg || ''; }
  function flash(t) { $('msg').innerHTML = t; }

  function oppPanel(p) {
    const pl = G.P[p];
    const a = el('div', 'opp' + (p === G.dealer ? ' dealer' : '') + (G.turn === p ? ' turn' : ''));
    const n = pl.hand.length + (pl.drawn >= 0 ? 1 : 0);
    let backs = ''; for (let i = 0; i < n; i++) backs += '<span class="tile back sm"></span>';
    const top = el('div', 'otop');
    const av = G.avatars && G.avatars[p];
    if (av) { const d = el('div', 'avatar', `<img src="assets/thumb/${av}.jpg" alt="${SEAT_LABEL[p]}">`); d.title = '點擊看立繪'; d.onclick = () => showAvatar(p); top.appendChild(d); }
    top.appendChild(el('div', 'ohead', `${p === G.dealer ? '🀫莊 ' : ''}${WINDS_ZH[pl.seatWind - 27]}家 · ${SEAT_LABEL[p]}${pl.riichi ? ' 🔔' : ''}<br><b>${G.scores[p]}</b>`));
    a.appendChild(top);
    const hb = el('div', 'obacks', backs);
    if (pl.melds.length) hb.innerHTML += meldsHTML(pl);
    a.appendChild(hb);
    const river = el('div', 'river');
    pl.discards.forEach(d => { river.innerHTML += `<span class="tile sm ${['m', 'p', 's', 'z'][suitOf(d.t)]}${d.riichi ? ' riichi' : ''}">${tileFace(d.t)}</span>`; });
    a.appendChild(river);
    return a;
  }
  function meldsHTML(pl) {
    return pl.melds.map(m => {
      const ts = meldTiles(m);
      const inner = ts.map((t, i) => {
        const hidden = m.kan && m.concealed && (i === 0 || i === 3);   // 暗槓兩端蓋牌
        return `<span class="tile sm ${hidden ? 'back' : ['m', 'p', 's', 'z'][suitOf(t)]}">${hidden ? '' : tileFace(t)}</span>`;
      }).join('');
      return `<span class="meld">${inner}</span>`;
    }).join('');
  }
  function showAvatar(p) {
    if (!G.avatars || !G.avatars[p]) return;
    overlay(`🀄 ${SEAT_LABEL[p]}`, `<img class="fullart" src="assets/${G.avatars[p]}.png" alt="${SEAT_LABEL[p]}">`, [{ t: '關閉', f: () => hideOverlay() }]);
  }
  function centerInfo() {
    const c = el('div', 'center');
    c.innerHTML = `<span class="cb">${WINDS_ZH[G.roundWind - 27]}${G.handNo}局${G.honba ? '·' + G.honba + '本' : ''}</span>
      <span class="cb">🀫 牌山 ${G.wall.length}</span>
      <span class="cb">立直棒 ${G.riichiSticks}</span>
      <span class="cb doraw">寶牌 ${G.doraInd.map(tileHTML).join('')}</span>`;
    return c;
  }
  function playerArea() {
    const pl = G.P[0];
    const a = el('div', 'me' + (G.turn === 0 ? ' turn' : '') + (G.dealer === 0 ? ' dealer' : ''));
    const river = el('div', 'river myriver');
    pl.discards.forEach(d => { const e = tileNode(d.t, false, 'sm'); if (d.riichi) e.classList.add('riichi'); river.appendChild(e); });
    a.appendChild(river);
    a.appendChild(el('div', 'meinfo', `${G.dealer === 0 ? '🀫莊 ' : ''}${WINDS_ZH[pl.seatWind - 27]}家（你）· ${G.scores[0]} 點${pl.riichi ? ' · 🔔 立直中' : ''}${pl.menzen ? '' : ' · 已鳴牌'}`));
    const hand = el('div', 'hand myhand' + (riichiMode ? ' picking' : ''));
    const full = handPlus(pl);
    const okAt = idx => { const rest = full.slice(0, idx).concat(full.slice(idx + 1)); return tenpaiConcealed(rest, pl.melds.length); };
    pl.hand.forEach((t, i) => {
      const e = tileNode(t, false);
      if (riichiMode) e.classList.add(okAt(i) ? 'rok' : 'rno');
      e.onclick = () => onTileClick(i); hand.appendChild(e);
    });
    if (pl.drawn >= 0) {
      const e = tileNode(pl.drawn, true);
      if (riichiMode) e.classList.add(okAt(pl.hand.length) ? 'rok' : 'rno');
      e.onclick = () => onTileClick(pl.hand.length); hand.appendChild(e);
    }
    if (pl.melds.length) { const md = el('div', 'mymelds'); md.innerHTML = meldsHTML(pl); hand.appendChild(md); }
    a.appendChild(hand);
    return a;
  }
  function tileNode(t, drawn, extra) {
    const s = suitOf(t);
    const cls = 'tile ' + ['m', 'p', 's', 'z'][s] + (drawn ? ' drawn' : '') + (extra ? ' ' + extra : '');
    return el('div', cls, tileFace(t));
  }
  function tileHTML(t) { return `<span class="${'tile sm ' + ['m', 'p', 's', 'z'][suitOf(t)]}">${tileFace(t)}</span>`; }
  // 花色 icon：筒=圓錢圈、索=竹節（用 currentColor 沿用牌色）
  const SI_PIN = '<svg class="si" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="12" cy="12" r="2.7" fill="currentColor"/></svg>';
  const SI_SOU = '<svg class="si" viewBox="0 0 24 24"><rect x="8.3" y="3" width="7.4" height="18" rx="3.7" fill="none" stroke="currentColor" stroke-width="2.4"/><line x1="8.3" y1="12" x2="15.7" y2="12" stroke="currentColor" stroke-width="2.4"/></svg>';
  function tileFace(t) {
    if (t < 27) {
      const n = (t % 9) + 1, s = suitOf(t);           // 0 萬 / 1 筒 / 2 索
      const ico = s === 0 ? '<span class="mk">萬</span>' : (s === 1 ? SI_PIN : SI_SOU);
      return `<span class="n">${n}</span>${ico}`;
    }
    const z = ['東', '南', '西', '北', '白', '發', '中'][t - 27];
    const col = { 31: '#2673c0', 32: '#1f9d4d', 33: '#c0392b' }[t] || '#2b2b2b'; // 白藍 發綠 中紅 風黑
    return `<span class="z" style="color:${col}">${z}</span>`;
  }

  // ── 結果視窗 ──
  function yakuList(res) {
    if (res.yakuman) return res.yaku.map(y => `<div class="yk"><span>${y.n}</span><b>役滿</b></div>`).join('');
    return res.yaku.map(y => `<div class="yk"><span>${y.n}</span><b>${y.han} 番</b></div>`).join('');
  }
  function showResult(p, tsumo, from, res, concealed, melds, delta) {
    const pts = res.points;
    const handHTML = concealed.slice().sort((a, b) => a - b).map(t => tileHTML(t)).join('')
      + (melds && melds.length ? '　' + meldsHTML({ melds }) : '');
    const scoreLine = res.yakuman ? '役滿' : `${res.han} 番 ${res.fu} 符　<b>${pts.total}</b> 點`;
    const deltas = [0, 1, 2, 3].map(i => `${SEAT_LABEL[i]} <b class="${delta[i] >= 0 ? 'up' : 'dn'}">${delta[i] >= 0 ? '+' : ''}${delta[i]}</b>`).join('　');
    const title = tsumo ? `${SEAT_LABEL[p]} 自摸！` : `${SEAT_LABEL[p]} 榮和（放銃：${SEAT_LABEL[from]}）`;
    overlay('🀄 ' + title,
      `<div class="reshand">${handHTML}</div>
       <div class="yakubox">${yakuList(res)}</div>
       <div class="resline">${scoreLine}</div>
       <div class="deltas">${deltas}</div>`,
      [{ t: '下一局 →', f: () => { hideOverlay(); nextHand(p === G.dealer); } }]);
  }
  function showDraw(tenpai, delta) {
    const rows = [0, 1, 2, 3].map(i => `<div>${SEAT_LABEL[i]}：${tenpai[i] ? '聽牌' : '未聽'}　<b class="${delta[i] >= 0 ? 'up' : 'dn'}">${delta[i] >= 0 ? '+' : ''}${Math.round(delta[i])}</b></div>`).join('');
    overlay('流局', `<div class="drawbox">${rows}</div>`, [{ t: '下一局 →', f: () => { hideOverlay(); nextHand(tenpai[G.dealer]); } }]);
  }

  // ── overlay ──
  function overlay(title, body, actions) {
    $('ov-title').innerHTML = title; $('ov-body').innerHTML = body;
    const box = $('ov-actions'); box.innerHTML = '';
    actions.forEach(a => { const b = el('button', 'ovbtn', a.t); b.onclick = a.f; box.appendChild(b); });
    $('overlay').classList.add('show');
  }
  function hideOverlay() { $('overlay').classList.remove('show'); }

  // 動態注入大頭相關 CSS（保證不受 index.html 快取影響）
  function injectCSS() {
    if (document.getElementById('mj-dyn-css')) return;
    const s = document.createElement('style'); s.id = 'mj-dyn-css';
    s.textContent = `
      .otop{ display:flex; align-items:center; gap:8px; margin-bottom:4px; }
      .otop .ohead{ flex:1; }
      .avatar{ width:46px; height:46px; border-radius:50%; overflow:hidden; border:2px solid #e9c46a; cursor:pointer; flex:0 0 auto; box-shadow:0 2px 6px #0007; transition:transform .1s; }
      .avatar:hover{ transform:scale(1.08); }
      .avatar img{ width:100%; height:100%; object-fit:cover; object-position:50% 28%; display:block; }
      .opp.turn .avatar{ border-color:#7fd9a6; }
      .fullart{ max-width:100%; max-height:72vh; border-radius:12px; box-shadow:0 12px 44px #000b; }
      .meld{ display:inline-flex; gap:1px; margin:2px 3px 0 0; padding:2px; background:#00000030; border-radius:5px; vertical-align:middle; }
      .mymelds{ display:flex; gap:8px; align-items:flex-end; margin-left:10px; }
      .act.call{ background:#4c8bf5; color:#fff; }
      .act.kan{ background:#8a63d2; color:#fff; }`;
    document.head.appendChild(s);
  }

  // ── 啟動 ──
  function boot() {
    injectCSS();
    $('newgame').onclick = () => newGame();
    $('rules').onclick = () => overlay('玩法說明',
      `<div class="rules">
        <p>日本立直麻將：你（下家自己）對 3 位電腦。東風戰 4 局。</p>
        <p>• 每巡輪到你會自動<b>摸一張</b>並幫你<b>排序</b>，點手牌即可<b>切出</b>。</p>
        <p>• 他家打牌時可 <b>吃</b>（僅上家）／<b>碰</b>／<b>槓</b>／<b>榮和</b>，按鈕會出現；不要就按「略過」。自己回合可 <b>暗槓／加槓</b>。</p>
        <p>• 聽牌且<b>門清</b>時可 <b>立直</b>（付 1000 點，之後自動摸切）。鳴牌後不能立直。</p>
        <p>• 湊成 4 面子 + 1 雀頭（或七對子／國士無雙）且<b>有役</b>即可 <b>自摸／榮和</b>。</p>
        <p>• 有役才能和；振聽不能榮和。寶牌／裏寶牌加番。鳴牌會失去門清、部分役降 1 番。</p>
        <p>• 電腦目前只碰役牌（保守），吃／槓由你主導。</p>
      </div>`, [{ t: '開始', f: () => { hideOverlay(); newGame(); } }]);
    newGame();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
