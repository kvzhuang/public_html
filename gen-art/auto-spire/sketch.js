// ==========================================
// Auto Slay the Spire — Canvas 渲染
// ==========================================

const PW = 1280, PH = 840;
let canvas, ctx, game;
let speed = 1;
let paused = false;
let stepInterval = 520;   // ms per engine step at 1x
let lastStep = 0;
let floats = [];          // 漂浮數字/文字
let shake = 0;
let cardAnim = null;      // 出牌動畫
let bannerText = '', bannerTime = 0;
let showInfo = false;

function fitCanvas() {
  const ratio = PW / PH;
  const dw = Math.min(window.innerWidth * 0.94, window.innerHeight * 0.94 * ratio);
  canvas.style.width = dw + 'px';
  canvas.style.height = (dw / ratio) + 'px';
}

// ── 事件消化 ──
function consumeEvents() {
  for (const e of game.events) {
    if (e.t === 'dmg') {
      floats.push({ x: enemyX(e.target), y: enemyY(e.target) - 40, txt: `${e.tag || ''}-${e.amt}`, col: '#FF5544', life: 1 });
      if (e.amt >= 20) shake = 5;   // 只有大傷害才輕微震動
    }
    if (e.t === 'playerDmg') {
      floats.push({ x: PW * 0.22, y: PH * 0.45, txt: `-${e.amt}`, col: '#FF3333', life: 1 });
      if (e.amt >= 12) shake = 6;   // 玩家挨重擊才震動
    }
    if (e.t === 'blocked') floats.push({ x: PW * 0.22, y: PH * 0.45, txt: `🛡️${e.amt}`, col: '#88BBFF', life: 1 });
    if (e.t === 'die') floats.push({ x: enemyX(e.target), y: enemyY(e.target), txt: '💀', col: '#FFFFFF', life: 1.4 });
    if (e.t === 'play') {
      cardAnim = { card: e.card, start: performance.now(), dur: 380 / speed };
    }
    if (e.t === 'stance') banner(e.stance === 'wrath' ? '🔥 憤怒姿態' : e.stance === 'calm' ? '🌊 平靜姿態' : e.stance === 'divinity' ? '✨ 神聖姿態' : '姿態解除');
    if (e.t === 'turnStart') banner(`第 ${e.turn} 回合`);
    if (e.t === 'battleStart') banner(`⚔️ ${e.enemies.join('、')}`);
    if (e.t === 'battleWin') banner('✅ 勝利！');
    if (e.t === 'cardReward') banner(`🃏 ${e.card}`);
    if (e.t === 'relicReward') banner(`🏺 ${RELICS[e.relic].n}`);
    if (e.t === 'potion') banner(`🧪 ${e.name}`);
    if (e.t === 'upgrade') banner(`⬆️ ${e.card}`);
    if (e.t === 'rest') banner(`🔥 休息 +${e.heal} HP`);
    if (e.t === 'shop') banner(e.bought.length ? `🛒 ${e.bought.join('、')}` : '🛒 什麼都買不起…');
    if (e.t === 'actClear') banner(`🌆 進入 Act ${e.act}！`);
    if (e.t === 'defeat') banner('💀 敗北…');
    if (e.t === 'newrun') banner(`⚔️ ${game.ch.name} 開始爬塔`);
  }
  game.events = [];
}

function banner(txt) { bannerText = txt; bannerTime = performance.now(); }

function enemyX(e) {
  const b = game.battle;
  if (!b) return PW * 0.7;
  const idx = b.enemies.indexOf(e);
  const n = b.enemies.length;
  return PW * (0.52 + (idx + 0.5) / n * 0.42);
}
function enemyY() { return PH * 0.42; }

// ── 主迴圈 ──
function loop(now) {
  requestAnimationFrame(loop);
  if (!paused && now - lastStep > stepInterval / speed) {
    lastStep = now;
    const st = game.state;
    if (st === 'victory' || st === 'defeat') {
      game.stateTimer++;
      if (game.stateTimer > 6) game.step();
    } else {
      game.step();
    }
    consumeEvents();
  }
  render(now);
}

// ── 渲染 ──
function render(now) {
  ctx.save();
  if (shake > 0.5) { ctx.translate(rr3(-shake, shake), rr3(-shake, shake)); shake *= 0.72; } else shake = 0;

  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, PH);
  grad.addColorStop(0, '#1a1626');
  grad.addColorStop(0.55, '#241d33');
  grad.addColorStop(1, '#181220');
  ctx.fillStyle = grad;
  ctx.fillRect(-20, -20, PW + 40, PH + 40);

  drawTopBar();
  if (game.state === 'battle' && game.battle) drawBattle(now);
  else drawInterlude(now);
  drawLog();
  drawBanner(now);
  drawFloats();
  if (showInfo) drawInfoPanel();

  ctx.restore();
}

// ── 遺物 / 藥水資訊面板 ──
function drawInfoPanel() {
  ctx.fillStyle = 'rgba(8,6,16,0.92)';
  ctx.fillRect(0, 92, PW, PH - 92);
  ctx.textBaseline = 'middle';

  // 遺物區
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#FFD860';
  ctx.fillText(`🏺 遺物（${game.relics.length}）`, 40, 130);
  const colW = (PW - 80) / 2;
  let i = 0;
  for (const r of game.relics) {
    const rd = RELICS[r];
    if (!rd) continue;
    const col = Math.floor(i / 12);
    const x = 40 + col * colW;
    const y = 168 + (i % 12) * 40;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(rd.icon, x, y);
    ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#E8D8B0';
    ctx.fillText(rd.n, x + 36, y);
    ctx.font = '13px "Noto Sans TC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(rd.desc, x + 150, y);
    i++;
    if (i >= 24) break;
  }

  // 藥水區
  const py = 168 + Math.min(12, Math.max(1, i)) * 40 + 24;
  ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#8FD4FF';
  ctx.fillText('🧪 藥水', 40, py);
  for (let s = 0; s < 3; s++) {
    const y = py + 40 + s * 38;
    const p = game.potions[s];
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    if (p) {
      const pd = POTIONS[p];
      ctx.fillText(pd.icon, 40, y);
      ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#E8D8B0';
      ctx.fillText(pd.n, 76, y);
      ctx.font = '13px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(pd.desc, 190, y);
    } else {
      ctx.font = '14px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(`（第 ${s + 1} 格：空）`, 40, y);
    }
  }

  ctx.font = '14px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('按 I 或點擊頂欄關閉（遊戲繼續進行中）', PW / 2, PH - 28);
}

const rr3 = (a, b) => a + Math.random() * (b - a);

function drawTopBar() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, PW, 92);
  // 角色與 HP
  ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
  ctx.fillStyle = game.ch.color;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${game.ch.name}`, 18, 24);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#E8D8B0';
  ctx.fillText(`💰${game.gold}`, 160, 24);
  ctx.fillText(`🃏${game.deck.length}`, 235, 24);
  const cs = game.charStats(game.chKey);
  ctx.fillText(`本角色 ${cs.w}勝${cs.l}敗`, 300, 24);
  ctx.fillText(`生涯 ${game.stats.won}勝${game.stats.lost}敗（${game.stats.totalRuns}場）`, 430, 24);
  // HP 條
  const hpw = 240;
  ctx.fillStyle = '#3a1010';
  ctx.fillRect(18, 42, hpw, 16);
  ctx.fillStyle = '#C03030';
  ctx.fillRect(18, 42, hpw * Math.max(0, game.hp / game.maxHP), 16);
  ctx.strokeStyle = '#000'; ctx.strokeRect(18, 42, hpw, 16);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.max(0, game.hp)} / ${game.maxHP}`, 18 + hpw / 2, 51);
  // 藥水欄（放大、置中、空格提示）
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    const px = 285 + i * 42, py2 = 40, sz = 34;
    ctx.fillStyle = 'rgba(140,200,255,0.12)';
    ctx.fillRect(px, py2, sz, sz);
    ctx.strokeStyle = game.potions[i] ? '#7FB8E8' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = game.potions[i] ? 1.8 : 1;
    ctx.strokeRect(px, py2, sz, sz);
    ctx.lineWidth = 1;
    if (game.potions[i]) {
      ctx.font = '26px sans-serif';
      ctx.fillText(POTIONS[game.potions[i]].icon, px + sz / 2, py2 + sz / 2 + 1);
    } else {
      ctx.font = '18px sans-serif';
      ctx.globalAlpha = 0.18;
      ctx.fillText('🧪', px + sz / 2, py2 + sz / 2 + 1);
      ctx.globalAlpha = 1;
    }
  }
  // 遺物列（放大）
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  let rx = 30;
  for (const r of game.relics.slice(0, 20)) {
    ctx.fillText(RELICS[r].icon, rx, 78);
    rx += 32;
  }
  ctx.textAlign = 'left';
  // 樓層地圖
  const mapX = PW - 480, mapW = 460;
  ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i < game.map.length; i++) {
    const node = game.map[i];
    const nx = mapX + (i + 0.5) / game.map.length * mapW;
    const icon = node.type === 'M' ? '👾' : node.type === 'E' ? '💀' : node.type === 'R' ? '🔥' : node.type === 'S' ? '🛒' : '👑';
    ctx.globalAlpha = node.done ? 0.35 : i === game.floor ? 1 : 0.7;
    if (i === game.floor) {
      ctx.fillStyle = '#FFD86080';
      ctx.beginPath(); ctx.arc(nx, 40, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillText(icon, nx, 40);
    ctx.globalAlpha = 1;
    if (i < game.map.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.moveTo(nx + 10, 40); ctx.lineTo(nx + mapW / game.map.length - 10, 40); ctx.stroke();
    }
  }
  ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif';
  ctx.fillText(`Act ${game.act} — 第 ${game.floor + 1} 層（總 ${(game.act - 1) * 15 + game.floor + 1}/45）`, mapX + mapW / 2, 66);
}

function drawBattle(now) {
  const b = game.battle;
  drawPlayer(now);
  for (const e of b.enemies) drawEnemy(e, now);
  drawHand(now);
  drawEnergyAndPiles();
  drawStatusRow();
  if (cardAnim) drawCardAnim(now);
}

function drawPlayer(now) {
  const b = game.battle;
  const x = PW * 0.22, y = PH * 0.5;
  const bob = Math.sin(now * 0.002) * 5;
  // 姿態光環
  if (b.stance === 'wrath') { ctx.fillStyle = 'rgba(255,60,20,0.15)'; ctx.beginPath(); ctx.arc(x, y + bob, 85, 0, Math.PI * 2); ctx.fill(); }
  if (b.stance === 'calm') { ctx.fillStyle = 'rgba(60,140,255,0.15)'; ctx.beginPath(); ctx.arc(x, y + bob, 85, 0, Math.PI * 2); ctx.fill(); }
  if (b.stance === 'divinity') { ctx.fillStyle = 'rgba(255,220,80,0.25)'; ctx.beginPath(); ctx.arc(x, y + bob, 95, 0, Math.PI * 2); ctx.fill(); }
  // 幾何角色
  ctx.save();
  ctx.translate(x, y + bob);
  const c = game.ch;
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(0, 20, 34, 46, 0, 0, Math.PI * 2); ctx.fill();   // 身體
  ctx.beginPath(); ctx.arc(0, -40, 24, 0, Math.PI * 2); ctx.fill();             // 頭
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 78, 40, 10, 0, 0, Math.PI * 2); ctx.fill();   // 影子
  // 角色特徵
  ctx.fillStyle = '#fff';
  if (game.chKey === 'ironclad') { ctx.fillRect(-30, -8, 14, 42); }             // 劍
  if (game.chKey === 'silent') { ctx.fillRect(-34, 4, 22, 5); ctx.fillRect(16, 4, 22, 5); } // 雙刀
  if (game.chKey === 'defect') { ctx.fillStyle = '#7FD4FF'; ctx.beginPath(); ctx.arc(0, -40, 8, 0, Math.PI * 2); ctx.fill(); } // 核心眼
  if (game.chKey === 'watcher') { ctx.fillStyle = '#FFD860'; ctx.beginPath(); ctx.arc(0, -52, 6, 0, Math.PI * 2); ctx.fill(); } // 天眼
  ctx.restore();
  // 格擋
  if (b.block > 0) {
    ctx.fillStyle = '#6FA8DC';
    ctx.beginPath(); ctx.arc(x - 55, y + 50, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(b.block, x - 55, y + 51);
  }
  // 球體（機器人）
  if (game.chKey === 'defect') {
    for (let i = 0; i < b.orbSlots; i++) {
      const ox = x - 40 + i * 32, oy = y - 105;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(ox, oy, 13, 0, Math.PI * 2); ctx.stroke();
      const orb = b.orbs[i];
      if (orb) {
        ctx.fillStyle = orb.type === 'lightning' ? '#FFE060' : orb.type === 'frost' ? '#8FDFFF' : orb.type === 'dark' ? '#8060A0' : '#FF9060';
        ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // 真言（觀者）
  if (game.chKey === 'watcher' && b.mantra > 0) {
    ctx.fillStyle = '#FFD860'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`🙏 真言 ${b.mantra}/10`, x, y - 110);
  }
}

function drawEnemy(e, now) {
  if (e.hp <= 0) return;
  const x = enemyX(e), y = enemyY(e);
  const bob = Math.sin(now * 0.0018 + x) * 4;
  const size = e.w * 0.55;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e.emoji, x, y + bob);
  // HP 條
  const hw = Math.max(70, size);
  ctx.fillStyle = '#3a1010'; ctx.fillRect(x - hw / 2, y + size * 0.62, hw, 10);
  ctx.fillStyle = '#C03030'; ctx.fillRect(x - hw / 2, y + size * 0.62, hw * (e.hp / e.maxHP), 10);
  ctx.strokeStyle = '#000'; ctx.strokeRect(x - hw / 2, y + size * 0.62, hw, 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`${e.hp}/${e.maxHP}`, x, y + size * 0.62 + 5);
  ctx.font = '13px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#D8C8A8';
  ctx.fillText(e.n, x, y + size * 0.62 + 24);
  // 格擋
  if (e.block > 0) {
    ctx.fillStyle = '#6FA8DC';
    ctx.beginPath(); ctx.arc(x - hw / 2 - 14, y + size * 0.62 + 5, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(e.block, x - hw / 2 - 14, y + size * 0.62 + 6);
  }
  // 意圖
  if (e.intent) {
    const it = e.intent;
    let txt = '';
    if (it.t === 'atk') {
      let d = it.dmg + e.str;
      if (e.weak > 0) d = Math.floor(d * 0.75);
      txt = `⚔️${d}${it.hits ? '×' + it.hits : ''}`;
    }
    else if (it.t === 'block') txt = `🛡️${it.block}`;
    else if (it.t === 'buff') txt = '💪';
    else if (it.t === 'debuff') txt = '🌀';
    ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = '#FFCC55';
    ctx.fillText((it.label ? it.label + ' ' : '') + txt, x, y - size * 0.72 - 8);
  }
  // 狀態
  let st = [];
  if (e.poison > 0) st.push(`☠️${e.poison}`);
  if (e.vuln > 0) st.push(`💔${e.vuln}`);
  if (e.weak > 0) st.push(`💫${e.weak}`);
  if (e.str !== 0) st.push(`💪${e.str}`);
  if (st.length) {
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#ccc';
    ctx.fillText(st.join(' '), x, y + size * 0.62 + 40);
  }
}

function drawHand(now) {
  const b = game.battle;
  const n = b.hand.length;
  if (!n) return;
  const cw = 108, chh = 150;
  const totalW = Math.min(PW * 0.72, n * (cw * 0.82));
  const x0 = PW / 2 - totalW / 2;
  for (let i = 0; i < n; i++) {
    const c = b.hand[i];
    const x = x0 + (i + 0.5) / n * totalW;
    const y = PH - 96 + Math.abs(i - (n - 1) / 2) * 6;
    const rot = (i - (n - 1) / 2) * 0.035;
    drawCard(c, x, y, cw, chh, rot, game.canPlay(c));
  }
}

function drawCard(c, x, y, w, h, rot, playable) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot || 0);
  const typeCol = c.t === 'a' ? '#7A2828' : c.t === 's' ? '#28522A' : '#28406A';
  ctx.fillStyle = typeCol;
  roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill();
  ctx.strokeStyle = playable ? '#FFD860' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = playable ? 2.5 : 1.2;
  roundRect(-w / 2, -h / 2, w, h, 8); ctx.stroke();
  ctx.lineWidth = 1;
  // 費用寶石
  ctx.fillStyle = '#E8B830';
  ctx.beginPath(); ctx.arc(-w / 2 + 13, -h / 2 + 13, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(c.c < 0 ? 'X' : c.c, -w / 2 + 13, -h / 2 + 14);
  // 卡名
  ctx.fillStyle = c.up ? '#8FE88F' : '#fff';
  ctx.font = `bold ${c.n.length > 5 ? 11 : 13}px "Noto Sans TC", sans-serif`;
  ctx.fillText(c.n, 0, -h / 2 + 16);
  // 效果簡述
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '11px "Noto Sans TC", sans-serif';
  const lines = descLines(c);
  lines.forEach((ln, i) => ctx.fillText(ln, 0, -6 + i * 15));
  // 類型
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px sans-serif';
  ctx.fillText(c.t === 'a' ? '攻擊' : c.t === 's' ? '技能' : '能力', 0, h / 2 - 12);
  ctx.restore();
}

function descLines(c) {
  const f = c.fx, out = [];
  if (f.dmg !== undefined) out.push(`傷害 ${f.dmg}${f.hits ? '×' + f.hits : ''}${f.aoe ? ' 全體' : ''}`);
  if (f.blockAsDmg) out.push('格擋值傷害');
  if (f.block) out.push(`格擋 ${f.block}`);
  if (f.poison) out.push(`中毒 ${f.poison}`);
  if (f.poisonAll) out.push(`全體中毒 ${f.poisonAll}`);
  if (f.vuln && f.vuln < 90) out.push(`易傷 ${f.vuln}`);
  if (f.vuln >= 90) out.push('無限易傷');
  if (f.weak) out.push(`虛弱 ${f.weak}`);
  if (f.str) out.push(`力量 +${f.str}`);
  if (f.dex) out.push(`敏捷 +${f.dex}`);
  if (f.draw) out.push(`抽 ${f.draw} 張`);
  if (f.energy) out.push(`能量 +${f.energy}`);
  if (f.channel) out.push(`充能${f.channel === 'lightning' ? '⚡' : f.channel === 'frost' ? '❄️' : f.channel === 'dark' ? '🌑' : '🔥'}`);
  if (f.stance) out.push(f.stance === 'wrath' ? '入憤怒' : '入平靜');
  if (f.mantra) out.push(`真言 +${f.mantra}`);
  if (f.demonForm) out.push(`每回合力量+${f.demonForm}`);
  if (f.shiv) out.push(`小刀 ×${f.shiv}`);
  if (f.exhaust) out.push('消耗');
  return out.slice(0, 4);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCardAnim(now) {
  const t = (now - cardAnim.start) / cardAnim.dur;
  if (t > 1) { cardAnim = null; return; }
  const ease = 1 - Math.pow(1 - t, 3);
  const x = PW / 2, y = PH - 140 - ease * 220;
  ctx.globalAlpha = 1 - t * 0.6;
  drawCard(cardAnim.card, x, y, 120, 165, 0, false);
  ctx.globalAlpha = 1;
}

function drawEnergyAndPiles() {
  const b = game.battle;
  // 能量球
  const x = 84, y = PH - 108;
  ctx.fillStyle = '#B03030';
  ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#E8B830'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${b.energy}/${b.maxEnergy}`, x, y);
  // 抽牌/棄牌堆
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`🂠 ${b.draw.length}`, x, y + 56);
  ctx.textAlign = 'right';
  ctx.fillText(`🗑️ ${b.discard.length}　☁️ ${b.exhaustPile.length}`, PW - 24, PH - 30);
}

function drawStatusRow() {
  const b = game.battle;
  const st = [];
  if (b.str !== 0) st.push(`💪力量${b.str}`);
  if (b.dex !== 0) st.push(`🌀敏捷${b.dex}`);
  if (b.thorns) st.push(`🌵反傷${b.thorns}`);
  if (b.metallicize) st.push(`⚙️金屬化${b.metallicize}`);
  if (b.weak) st.push(`💫虛弱${b.weak}`);
  if (b.vuln) st.push(`💔易傷${b.vuln}`);
  if (b.intangible) st.push(`👻虛無${b.intangible}`);
  if (b.buffer) st.push(`🛡️緩衝${b.buffer}`);
  if (b.focus) st.push(`🔷集中${b.focus}`);
  for (const k in b.powers) {
    const names = { demonForm:'惡魔化', barricade:'壁壘', juggernaut:'主宰', feelNoPain:'無痛', darkEmbrace:'黑暗擁抱',
                    combust:'自燃', corruption:'腐化', noxiousFumes:'毒霧', envenom:'淬毒', thousandCuts:'千刀',
                    afterImage:'殘像', accuracy:'精準', infiniteBlades:'無限刀刃', electrodynamics:'電動力學',
                    echoForm:'回音', loop:'迴圈', helloWorld:'你好世界', mentalFortress:'心靈堡壘', rushdown:'速攻',
                    likeWater:'上善若水', nirvana:'涅槃', devotion:'奉獻', battleHymn:'聖歌', selfRepair:'自我修復' };
    if (names[k]) st.push(`✦${names[k]}`);
  }
  if (st.length) {
    ctx.font = '13px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#B8D8A8'; ctx.textAlign = 'left';
    ctx.fillText(st.join('　'), 20, PH * 0.72);
  }
}

function drawInterlude(now) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const st = game.state;
  if (st === 'victory') {
    ctx.font = 'bold 52px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#FFD860';
    ctx.fillText('🏆 通關全三幕！', PW / 2, PH * 0.4);
    ctx.font = '22px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`${game.ch.name} 登上了尖塔之頂`, PW / 2, PH * 0.5);
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#999';
    ctx.fillText('即將開始新的爬塔…', PW / 2, PH * 0.58);
  } else if (st === 'defeat') {
    ctx.font = 'bold 52px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#C04040';
    ctx.fillText('💀 敗北', PW / 2, PH * 0.4);
    ctx.font = '20px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#ccc';
    ctx.fillText(`${game.ch.name} 止步於 Act ${game.act} 第 ${game.floor + 1} 層（總第 ${(game.act - 1) * 15 + game.floor + 1} 層）`, PW / 2, PH * 0.5);
    const cs = game.charStats(game.chKey);
    ctx.font = '15px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#888';
    ctx.fillText(`此角色最佳紀錄：第 ${cs.bestFloor} 層　生涯 ${game.stats.won}勝${game.stats.lost}敗`, PW / 2, PH * 0.565);
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#999';
    ctx.fillText('即將開始新的爬塔…', PW / 2, PH * 0.63);
  } else {
    ctx.font = '26px "Noto Sans TC", sans-serif'; ctx.fillStyle = '#ccc';
    const node = game.map[game.floor];
    const label = node ? (node.type === 'R' ? '🔥 營火' : node.type === 'B' ? '👑 Boss' : node.type === 'E' ? '💀 精英' : node.type === 'S' ? '🛒 商店' : '👾 敵人') : '';
    ctx.fillText(`前進中… ${label}`, PW / 2, PH * 0.45);
  }
}

function drawLog() {
  ctx.font = '13px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  game.log.slice(-5).forEach((ln, i) => ctx.fillText(ln, 20, PH * 0.14 + i * 19));
}

function drawBanner(now) {
  const dt = now - bannerTime;
  if (dt > 1600 || !bannerText) return;
  const alpha = dt < 200 ? dt / 200 : dt > 1200 ? 1 - (dt - 1200) / 400 : 1;
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 30px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(bannerText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(PW / 2 - w / 2 - 24, PH * 0.26 - 26, w + 48, 52);
  ctx.fillStyle = '#FFE8A0';
  ctx.fillText(bannerText, PW / 2, PH * 0.26);
  ctx.globalAlpha = 1;
}

function drawFloats() {
  for (const f of floats) {
    f.y -= 1.1; f.life -= 0.016;
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = f.col;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  floats = floats.filter(f => f.life > 0);
}

// ── 初始化 ──
function init() {
  canvas = document.createElement('canvas');
  canvas.width = PW; canvas.height = PH;
  document.getElementById('holder').appendChild(canvas);
  ctx = canvas.getContext('2d');
  fitCanvas();
  game = new Game();
  consumeEvents();

  canvas.addEventListener('click', (ev) => {
    // 點頂欄 → 開關資訊面板；點其他區域 → 切換速度
    const rect = canvas.getBoundingClientRect();
    const y = (ev.clientY - rect.top) / rect.height * PH;
    if (y < 92 || showInfo) {
      showInfo = !showInfo;
      return;
    }
    speed = speed >= 4 ? 1 : speed * 2;
    banner(`⏩ ${speed}x 速度`);
  });
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('keydown', e => {
    if (e.key === ' ') { paused = !paused; banner(paused ? '⏸️ 暫停' : '▶️ 繼續'); e.preventDefault(); }
    if (e.key === 's' || e.key === 'S') {
      const a = document.createElement('a');
      a.download = 'auto-spire-' + Date.now() + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    if (e.key === 'r' || e.key === 'R') { game.newRun(); consumeEvents(); }
    if (e.key === 'c' || e.key === 'C') { game.clearMemory(); banner('🗑️ 遊戲記錄已重置'); }
    if (e.key === 'i' || e.key === 'I') { showInfo = !showInfo; }
  });
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
