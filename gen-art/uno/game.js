'use strict';
/* ============================================================
   UNO · 一人對三電腦（原創實作，規則為通用 UNO 玩法）
   牌：{c,k}  c=R/Y/G/B/W(萬用)  k='0'..'9' | skip | rev | d2 | wild | wd4
   ============================================================ */

const COLORS = ['R', 'Y', 'G', 'B'];
function buildDeck() {
  const d = [];
  for (const c of COLORS) {
    d.push({ c, k: '0' });
    for (let n = 1; n <= 9; n++) { d.push({ c, k: '' + n }); d.push({ c, k: '' + n }); }
    for (const a of ['skip', 'rev', 'd2']) { d.push({ c, k: a }); d.push({ c, k: a }); }
  }
  for (let i = 0; i < 4; i++) { d.push({ c: 'W', k: 'wild' }); d.push({ c: 'W', k: 'wd4' }); }
  return d;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function cardPoints(card) {
  if (card.c === 'W') return 50;
  if (['skip', 'rev', 'd2'].includes(card.k)) return 20;
  return parseInt(card.k, 10);
}
function canPlay(card, color, kind) {
  if (card.c === 'W') return true;              // 萬用牌隨時可出
  return card.c === color || card.k === kind;   // 同色 或 同數字/同符號
}

// ── 局狀態 ──
function newState() {
  const deck = shuffle(buildDeck());
  const hands = [[], [], [], []];
  for (let r = 0; r < 7; r++) for (let p = 0; p < 4; p++) hands[p].push(deck.pop());
  // 起始翻牌：抽到數字牌才當底（避免第一張就是動作/萬用的處理）
  let start;
  while (deck.length) { const c = deck.pop(); if (c.c !== 'W' && !['skip', 'rev', 'd2'].includes(c.k)) { start = c; break; } deck.unshift(c); }
  const discard = [start];
  return { hands, draw: deck, discard, color: start.c, kind: start.k, dir: 1, turn: 0, over: false, winner: -1 };
}
const nextIdx = (s, p) => ((p + s.dir) % 4 + 4) % 4;
const advance = (s, from, steps) => ((from + s.dir * steps) % 4 + 4) % 4;
function ensureDraw(s) {
  if (s.draw.length === 0 && s.discard.length > 1) {
    const top = s.discard.pop();
    s.draw = shuffle(s.discard);
    s.discard = [top];
  }
}
function drawN(s, p, n) { for (let i = 0; i < n; i++) { ensureDraw(s); if (!s.draw.length) break; s.hands[p].push(s.draw.pop()); } }
function drawOne(s, p) { ensureDraw(s); if (!s.draw.length) return null; const c = s.draw.pop(); s.hands[p].push(c); return c; }
function legalMoves(s, p) { const out = []; s.hands[p].forEach((c, i) => { if (canPlay(c, s.color, s.kind)) out.push(i); }); return out; }

// 出牌：回傳效果資訊；chosenColor 用於萬用牌
function applyPlay(s, p, idx, chosenColor) {
  const card = s.hands[p].splice(idx, 1)[0];
  s.discard.push(card);
  s.color = card.c === 'W' ? (chosenColor || 'R') : card.c;
  s.kind = card.k;
  const info = { card, drew: 0, drewBy: -1, skipped: false, reversed: false };
  if (s.hands[p].length === 0) { s.over = true; s.winner = p; return info; }
  let skip = 0;
  if (card.k === 'skip') { skip = 1; info.skipped = true; }
  else if (card.k === 'rev') { s.dir *= -1; info.reversed = true; }
  else if (card.k === 'd2') { const n = nextIdx(s, p); drawN(s, n, 2); skip = 1; info.drew = 2; info.drewBy = n; info.skipped = true; }
  else if (card.k === 'wd4') { const n = nextIdx(s, p); drawN(s, n, 4); skip = 1; info.drew = 4; info.drewBy = n; info.skipped = true; }
  s.turn = advance(s, p, 1 + skip);
  return info;
}
function passTurn(s, p) { s.turn = advance(s, p, 1); }

// ── AI ──
function aiColor(hand) {
  const cnt = { R: 0, Y: 0, G: 0, B: 0 };
  for (const c of hand) if (c.c !== 'W') cnt[c.c]++;
  return COLORS.reduce((a, b) => cnt[b] > cnt[a] ? b : a, 'R');
}
function aiChoosePlay(s, p) {   // 回傳 {idx, color} 或 null（表示要抽牌）
  const hand = s.hands[p], moves = legalMoves(s, p);
  if (!moves.length) return null;
  const nonwild = moves.filter(i => hand[i].c !== 'W');
  let idx;
  if (nonwild.length) {
    const nxt = nextIdx(s, p), lowNext = s.hands[nxt].length <= 2;
    const actions = nonwild.filter(i => ['skip', 'rev', 'd2'].includes(hand[i].k));
    if (lowNext && actions.length) idx = actions[0];
    else idx = nonwild.slice().sort((a, b) => cardPoints(hand[b]) - cardPoints(hand[a]))[0];
  } else idx = moves[0];   // 只剩萬用牌
  return { idx, color: hand[idx].c === 'W' ? aiColor(hand) : null };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COLORS, buildDeck, shuffle, cardPoints, canPlay, newState, legalMoves, applyPlay, passTurn, drawOne, aiChoosePlay, aiColor, nextIdx, advance };
}

/* ============================================================
                        UI（瀏覽器）
   ============================================================ */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const CNAME = { R: '紅', Y: '黃', G: '綠', B: '藍' };
  const SEAT = ['你', '右家', '對家', '左家'];
  let S, scores = [0, 0, 0, 0], busy = false, drewThisTurn = false;
  let swapLeft = 3, swapMode = false;     // 人類專屬：一局最多換 3 次指定手牌
  const GOAL = 500;

  function cardLabel(c) {
    if (c.k === 'wild') return '🌈'; if (c.k === 'wd4') return '+4';
    if (c.k === 'skip') return '⊘'; if (c.k === 'rev') return '⇄'; if (c.k === 'd2') return '+2';
    return c.k;
  }

  function newRound() {
    S = newState(); busy = false; drewThisTurn = false;
    swapLeft = 3; swapMode = false;
    render();
    if (S.turn !== 0) scheduleAI();
  }

  // ── 換牌（人類專屬）：把指定手牌洗回牌庫、抽一張新的（隨機），不消耗回合 ──
  function humanSwap(idx) {
    if (busy || S.turn !== 0 || S.over || !swapMode || swapLeft <= 0) return;
    const [card] = S.hands[0].splice(idx, 1);
    S.draw.push(card); shuffle(S.draw);
    const nc = drawOne(S, 0);
    swapLeft--; swapMode = false;
    toast('換掉 ' + (card.c === 'W' ? '' : CNAME[card.c]) + cardLabel(card) +
      (nc ? ('，抽到 ' + (nc.c === 'W' ? '' : CNAME[nc.c]) + cardLabel(nc)) : '') +
      '（剩 ' + swapLeft + ' 次）');
    render();
  }

  // ── 出牌流程 ──
  function humanPlay(idx) {
    if (busy || S.turn !== 0 || S.over) return;
    const card = S.hands[0][idx];
    if (!canPlay(card, S.color, S.kind)) { toast('這張不能出'); return; }
    if (card.c === 'W') { chooseColor(color => doPlay(0, idx, color)); return; }
    doPlay(0, idx, null);
  }
  function doPlay(p, idx, color) {
    const info = applyPlay(S, p, idx, color);
    drewThisTurn = false;
    flashInfo(p, info);
    render();
    if (S.over) return endRound();
    if (S.turn !== 0) scheduleAI(); else humanPrompt();
  }
  function humanDraw() {
    if (busy || S.turn !== 0 || S.over || drewThisTurn) return;
    const c = drawOne(S, 0); drewThisTurn = true;
    if (!c) { passTurn(S, 0); render(); return scheduleAI(); }
    toast('抽到 ' + (c.c === 'W' ? '' : CNAME[c.c]) + cardLabel(c));
    render();
    if (!canPlay(c, S.color, S.kind)) { toast('不能出，跳過'); setTimeout(() => { if (!S.over && S.turn === 0 && drewThisTurn) { passTurn(S, 0); drewThisTurn = false; render(); scheduleAI(); } }, 900); }
    else humanPrompt();   // 抽到可出的牌，讓玩家選擇出或跳過
  }
  function humanPass() { if (busy || S.turn !== 0 || !drewThisTurn) return; passTurn(S, 0); drewThisTurn = false; render(); scheduleAI(); }

  async function scheduleAI() {
    busy = true;
    while (!S.over && S.turn !== 0) {
      await wait(850);
      const p = S.turn, mv = aiChoosePlay(S, p);
      if (mv) { const info = applyPlay(S, p, mv.idx, mv.color); flashInfo(p, info); }
      else {
        const c = drawOne(S, p);
        if (c && canPlay(c, S.color, S.kind)) { const info = applyPlay(S, p, S.hands[p].length - 1, c.c === 'W' ? aiColor(S.hands[p]) : null); flashInfo(p, info); }
        else { passTurn(S, p); flash(`${SEAT[p]} 抽牌`); }
      }
      render();
      if (S.over) { busy = false; return endRound(); }
    }
    busy = false;
    humanPrompt();
  }
  function humanPrompt() { const mv = legalMoves(S, 0); flash(mv.length ? '輪到你——點可出的牌' : (drewThisTurn ? '沒得出，按「跳過」' : '沒得出，按「抽牌」')); render(); }
  function flashInfo(p, info) {
    if (!info || !info.card) return;
    let m = `${SEAT[p]} 出 ${info.card.c === 'W' ? '' : CNAME[info.card.c]}${cardLabel(info.card)}`;
    if (info.card.c === 'W') m += `（選${CNAME[S.color]}）`;
    if (info.reversed) m += ' · 反轉';
    if (info.skipped && !info.drew) m += ' · 跳過';
    if (info.drew) m += ` · ${SEAT[info.drewBy]} 抽${info.drew}並跳過`;
    flash(m);
  }

  // ── 回合結束 / 計分 ──
  function endRound() {
    const w = S.winner;
    let pts = 0; for (let i = 0; i < 4; i++) if (i !== w) pts += S.hands[i].reduce((a, c) => a + cardPoints(c), 0);
    scores[w] += pts;
    const rows = [0, 1, 2, 3].map(i => `<div>${SEAT[i]}：本局手牌 ${i === w ? '0（勝）' : S.hands[i].reduce((a, c) => a + cardPoints(c), 0) + ' 分'}　累計 <b>${scores[i]}</b></div>`).join('');
    const done = scores.some(s => s >= GOAL);
    overlay(`🎉 ${SEAT[w]} 贏了這局！`, `${SEAT[w]} 得 <b>${pts}</b> 分（對手手牌總和）<br><div class="rows">${rows}</div>` + (done ? `<br><b>${SEAT[scores.indexOf(Math.max(...scores))]}</b> 率先達 ${GOAL} 分，全場勝出！` : ''),
      done ? [{ t: '重新開始', f: () => { scores = [0, 0, 0, 0]; hideOverlay(); newRound(); } }] : [{ t: '下一局 →', f: () => { hideOverlay(); newRound(); } }]);
  }

  // ── 顏色選擇 ──
  function chooseColor(cb) {
    $('ov-title').innerHTML = '選擇顏色';
    $('ov-body').innerHTML = '';
    const box = $('ov-actions'); box.innerHTML = '';
    COLORS.forEach(c => { const b = el('button', 'colbtn c-' + c, CNAME[c]); b.onclick = () => { hideOverlay(); cb(c); }; box.appendChild(b); });
    $('overlay').classList.add('show');
  }

  // ── 畫面 ──
  function render() {
    const g = $('table'); g.innerHTML = '';
    // 對手
    const opps = el('div', 'opps');
    [3, 2, 1].forEach(p => {
      const pl = el('div', 'opp' + (S.turn === p ? ' turn' : ''));
      let backs = ''; const n = S.hands[p].length; for (let i = 0; i < Math.min(n, 12); i++) backs += '<span class="uc back mini"></span>';
      pl.innerHTML = `<div class="ohead">${SEAT[p]}${n === 1 ? ' <span class="uno">UNO!</span>' : ''} · ${n} 張<br><span class="sc">累計 ${scores[p]}</span></div><div class="obacks">${backs}</div>`;
      opps.appendChild(pl);
    });
    g.appendChild(opps);
    // 中央
    const mid = el('div', 'mid');
    const top = S.discard[S.discard.length - 1];
    mid.innerHTML =
      `<div class="pile"><div class="lbl">抽牌堆 ${S.draw.length}</div><div class="uc back big" id="drawpile"></div></div>` +
      `<div class="midinfo"><div class="dir">${S.dir === 1 ? '↻ 順時針' : '↺ 逆時針'}</div><div class="curcol c-${S.color}">目前顏色：${CNAME[S.color] || '—'}</div></div>` +
      `<div class="pile"><div class="lbl">棄牌堆</div>${ucHTML(top, 'big')}</div>`;
    g.appendChild(mid);
    // 玩家手牌
    const meWrap = el('div', 'mewrap');
    meWrap.appendChild(el('div', 'meinfo', `${SEAT[0]}（你）· ${S.hands[0].length} 張${S.hands[0].length === 1 ? ' <span class="uno">UNO!</span>' : ''} · 累計 ${scores[0]}`));
    const hand = el('div', 'hand');
    if (S.turn !== 0 || S.over) swapMode = false;     // 非你的回合強制退出換牌模式
    const canAny = S.turn === 0 && !S.over;
    S.hands[0].forEach((c, i) => {
      if (swapMode && canAny) {                        // 換牌模式：任一張都可點來換
        const e = el('div', 'uc c-' + c.c + ' swap', ucInner(c));
        e.onclick = () => humanSwap(i);
        hand.appendChild(e);
        return;
      }
      const playable = canAny && canPlay(c, S.color, S.kind);
      const e = el('div', 'uc c-' + c.c + (playable ? ' ok' : (canAny ? ' no' : '')), ucInner(c));
      if (playable) e.onclick = () => humanPlay(i);
      hand.appendChild(e);
    });
    meWrap.appendChild(hand);
    g.appendChild(meWrap);
    // 操作鈕
    const ctrl = $('controls'); ctrl.innerHTML = '';
    if (S.turn === 0 && !S.over) {
      if (!drewThisTurn) { const b = el('button', 'ubtn draw', '🃏 抽牌'); b.onclick = humanDraw; ctrl.appendChild(b); }
      else { const b = el('button', 'ubtn pass', '⏭ 跳過'); b.onclick = humanPass; ctrl.appendChild(b); }
      if (swapLeft > 0 && S.hands[0].length > 0) {
        const sb = el('button', 'ubtn swap' + (swapMode ? ' on' : ''), swapMode ? '✖ 取消換牌' : ('🔄 換牌 (剩 ' + swapLeft + ')'));
        sb.onclick = () => { swapMode = !swapMode; if (swapMode) flash('換牌模式：點手中任一張，換成一張隨機新牌（剩 ' + swapLeft + ' 次）'); render(); };
        ctrl.appendChild(sb);
      }
    }
    const dp = $('drawpile'); if (dp && S.turn === 0 && !S.over && !drewThisTurn) dp.onclick = humanDraw;
  }
  function ucInner(c) { return `<span class="k">${cardLabel(c)}</span>`; }
  function ucHTML(c, sz) { return `<div class="uc c-${c.c} ${sz || ''}">${ucInner(c)}</div>`; }

  // ── overlay / toast ──
  function overlay(t, b, acts) {
    $('ov-title').innerHTML = t; $('ov-body').innerHTML = b;
    const box = $('ov-actions'); box.innerHTML = '';
    acts.forEach(a => { const x = el('button', 'ovbtn', a.t); x.onclick = a.f; box.appendChild(x); });
    $('overlay').classList.add('show');
  }
  function hideOverlay() { $('overlay').classList.remove('show'); }
  function flash(t) { $('msg').innerHTML = t; }
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 1400); }

  window.__uno = { S: () => S, swapLeft: () => swapLeft, swapMode: () => swapMode };  // 測試/除錯用

  function boot() {
    $('rules').onclick = () => overlay('玩法', `<div class="rulestxt">
      • 一人對 3 電腦。輪到你,出一張<b>同色</b>或<b>同數字/同符號</b>的牌,或出<b>萬用牌</b>(可指定顏色)。<br>
      • 沒得出就<b>抽一張</b>,抽到能出可選擇出或跳過。<br>
      • ⊘跳過、⇄反轉、+2 下家抽兩張並跳過、🌈萬用選色、+4 萬用選色且下家抽四張跳過。<br>
      • 先出完手牌者贏該局,得對手手牌分數;累計先達 ${GOAL} 分者全場勝出。<br>
      • 剩 1 張會顯示 UNO!(本版不罰漏喊)。<br>
      • 🔄 <b>換牌(玩家專屬)</b>:每局最多 <b>3 次</b>,按「換牌」後點手中任一張,把它洗回牌庫並抽一張隨機新牌,<b>不消耗回合</b>——卡牌時用來救急。</div>`, [{ t: '開始', f: () => { hideOverlay(); scores = [0, 0, 0, 0]; newRound(); } }]);
    $('newgame').onclick = () => { scores = [0, 0, 0, 0]; newRound(); };
    newRound();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
