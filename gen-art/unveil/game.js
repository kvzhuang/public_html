'use strict';
/* ============================================================
   描線揭圖 · Unveil — Qix/Xonix（天蠶變）風：方向鍵拉線圈地揭圖
   ============================================================ */

// ───────── 純邏輯核心（可 node 測試）─────────
// 格子值：0 空(未揭) / 1 已佔(揭圖) / 2 目前線(trail)
function makeGrid(cols, rows) {
  const cells = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) cells[y * cols + x] = 1; // 外框已佔
  }
  return { cols, rows, cells };
}
const gi = (g, x, y) => y * g.cols + x;
const gv = (g, x, y) => (x < 0 || y < 0 || x >= g.cols || y >= g.rows) ? 1 : g.cells[y * g.cols + x];

// 封閉：把 trail 變已佔，再從敵人位置在「空格」洪水；未被敵人到達的空格 → 佔領
function closeTrail(g, enemyCells) {
  const { cols, rows, cells } = g;
  for (let i = 0; i < cells.length; i++) if (cells[i] === 2) cells[i] = 1;
  const reach = new Uint8Array(cells.length);
  const stack = [];
  for (const [ex, ey] of enemyCells) {
    const cx = Math.max(0, Math.min(cols - 1, ex | 0)), cy = Math.max(0, Math.min(rows - 1, ey | 0));
    const id = cy * cols + cx; if (cells[id] === 0 && !reach[id]) { reach[id] = 1; stack.push(id); }
  }
  while (stack.length) {
    const id = stack.pop(), x = id % cols, y = (id / cols) | 0;
    const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nid = ny * cols + nx; if (cells[nid] === 0 && !reach[nid]) { reach[nid] = 1; stack.push(nid); }
    }
  }
  let gained = 0;
  for (let i = 0; i < cells.length; i++) if (cells[i] === 0 && !reach[i]) { cells[i] = 1; gained++; }
  return gained;
}
function percentClaimed(g) {
  const { cols, rows, cells } = g;
  let total = 0, filled = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) { total++; if (cells[y * cols + x] === 1) filled++; }
  return total ? filled / total : 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGrid, closeTrail, percentClaimed, gi, gv };
}

/* ============================================================
                        UI（瀏覽器）
   ============================================================ */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  const COLS = 34, ROWS = 64, TARGET = 0.75;    // 更細的格子＝更細緻的框線
  const IMGS = []; for (let i = 180; i <= 198; i++) IMGS.push('generated-image-' + i);
  const IMG_BASE = '../mahjong/assets/med/';

  let g, cell, cv, ctx, img, imgReady;
  let player, dir, drawing, enemies, lives, level, imgIdx, claimed, won, mode = 'title';
  let last = 0, stepAcc = 0, moveT = 0, STEP = 42;   // 玩家每 STEP ms 走一格（配上補間平滑滑動）
  let playerPrev = { x: 0, y: 0 }, bullets = [], trailPath = [], enterArmed = false;

  function pickImg() { imgIdx = IMGS[Math.floor(Math.random() * IMGS.length)]; }
  function loadImg(cb) {
    img = new Image(); imgReady = false;
    img.onload = () => { imgReady = true; cb && cb(); };
    img.onerror = () => { imgReady = false; cb && cb(); };
    img.src = IMG_BASE + imgIdx + '.jpg?v=1';
  }

  function setup() {
    cv = $('cv'); ctx = cv.getContext('2d');
    fit();
    addEventListener('resize', fit);
    bindInput();
    requestAnimationFrame(loop);
    title();
  }
  function fit() {
    // 依畫面決定 cell 大小（維持格子比例）
    const maxW = Math.min(360, innerWidth - 24), maxH = innerHeight - 210;
    cell = Math.max(5, Math.floor(Math.min(maxW / COLS, maxH / ROWS)));
    cv.width = COLS * cell; cv.height = ROWS * cell;
    if (mode === 'play') drawAll();
  }

  function startLevel() {
    g = makeGrid(COLS, ROWS);
    player = { x: 0, y: 0 }; playerPrev = { x: 0, y: 0 }; dir = null; drawing = false; claimed = 0; won = false;
    trailPath = []; bullets = []; stepAcc = 0; moveT = 0; enterArmed = false;
    const n = Math.min(4, 1 + level);
    enemies = [];
    for (let i = 0; i < n; i++) {
      const ex = 4 + Math.random() * (COLS - 8), ey = 6 + Math.random() * (ROWS - 12);
      const ang = Math.random() * Math.PI * 2, sp = 0.14 + level * 0.018;
      enemies.push({ x: ex, y: ey, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, spd: sp, stuck: 0, fireCd: 1600 + Math.random() * 2600 });
    }
    mode = 'play'; hideOverlay(); fit(); drawAll(); updateHud();
  }

  // ───────── 迴圈 ─────────
  function loop(t) {
    const dt = Math.min(50, t - last); last = t;
    if (mode === 'play') {
      stepAcc += dt;
      if (stepAcc >= STEP) { stepAcc -= STEP; if (stepAcc > STEP) stepAcc = 0; playerPrev = { x: player.x, y: player.y }; stepPlayer(); }
      moveT = Math.min(1, stepAcc / STEP);
      updateEnemies(dt); updateBullets(dt);
      drawDynamic();
    }
    requestAnimationFrame(loop);
  }
  // 玩家視覺插值位置（平滑滑動）
  function pvis() { return { x: playerPrev.x + (player.x - playerPrev.x) * moveT, y: playerPrev.y + (player.y - playerPrev.y) * moveT }; }

  function stepPlayer() {
    if (!dir) return;
    const dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const nx = player.x + dv[0], ny = player.y + dv[1];
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { if (!drawing) dir = null; return; }
    const next = g.cells[gi(g, nx, ny)];
    if (!drawing) {
      if (next === 1) { player.x = nx; player.y = ny; enterArmed = false; }   // 沿邊移動
      else if (enterArmed) {                                       // 刻意按向黑幕 → 起線
        trailPath = [{ x: player.x, y: player.y }, { x: nx, y: ny }]; g.cells[gi(g, nx, ny)] = 2; player.x = nx; player.y = ny; drawing = true; enterArmed = false;
      } else { dir = null; }                                       // 前方是黑幕但非刻意 → 停在邊框等指令
    } else {
      if (next === 0) { g.cells[gi(g, nx, ny)] = 2; trailPath.push({ x: nx, y: ny }); player.x = nx; player.y = ny; }
      else if (next === 1) { trailPath.push({ x: nx, y: ny }); player.x = nx; player.y = ny; finishTrail(); }  // 回到已佔 → 封閉
      else { die(); }                                              // 撞到自己的線
    }
  }
  function finishTrail() {
    closeTrail(g, enemies.map(e => [e.x | 0, e.y | 0]));
    drawing = false; dir = null; trailPath = [];
    claimed = percentClaimed(g);
    drawAll(); updateHud();
    if (claimed >= TARGET) return stageClear();
  }
  function die(reason) {
    // 清掉目前的線與彈幕，扣命，回到最近的邊
    for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === 2) g.cells[i] = 0;
    trailPath = []; bullets = [];
    drawing = false; dir = null; enterArmed = false; lives--;
    player.x = 0; player.y = 0; playerPrev = { x: 0, y: 0 }; stepAcc = 0; moveT = 0;
    drawAll(); updateHud();
    toast(reason === 'line' ? '框線被彈幕打斷了！' : reason === 'bullet' ? '中彈了！' : '被撞到了！');
    if (lives <= 0) return gameOver();
  }

  // 敵人：等速反彈（永不停下）＋ 卡住偵測 ＋ 偶爾放彈幕
  function updateEnemies(dt) {
    const k = dt / 16;
    for (const e of enemies) {
      const ox = e.x, oy = e.y;
      let nx = e.x + e.vx * k;
      if (gv(g, Math.floor(nx), Math.floor(e.y)) !== 0) { e.vx = -e.vx; nx = e.x; }
      let ny = e.y + e.vy * k;
      if (gv(g, Math.floor(e.x), Math.floor(ny)) !== 0) { e.vy = -e.vy; ny = e.y; }
      e.x = Math.max(1, Math.min(COLS - 1 - 1e-3, nx)); e.y = Math.max(1, Math.min(ROWS - 1 - 1e-3, ny));
      // 速度正規化，避免累積誤差變慢或停下
      const m = Math.hypot(e.vx, e.vy) || 1; e.vx = e.vx / m * e.spd; e.vy = e.vy / m * e.spd;
      // 卡住偵測：位移過小 → 重新給方向；連續卡住 → 搬到隨機空格
      if (Math.abs(e.x - ox) + Math.abs(e.y - oy) < e.spd * 0.25 * k) { e.stuck++; if (e.stuck === 20) reseedDir(e); else if (e.stuck > 60) relocate(e); }
      else e.stuck = 0;
      if (drawing && g.cells[gi(g, e.x | 0, e.y | 0)] === 2) return die();
      // 彈幕
      e.fireCd -= dt;
      if (e.fireCd <= 0) { fireBarrage(e); e.fireCd = Math.max(1400, 3600 - level * 250) + Math.random() * 1800; }
    }
  }
  function reseedDir(e) { const a = Math.random() * Math.PI * 2; e.vx = Math.cos(a) * e.spd; e.vy = Math.sin(a) * e.spd; e.stuck = 0; }
  function relocate(e) {
    const empties = [];
    for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === 0) empties.push(i);
    if (!empties.length) { e.stuck = 0; return; }
    const id = empties[Math.floor(Math.random() * empties.length)];
    e.x = (id % COLS) + 0.5; e.y = ((id / COLS) | 0) + 0.5; reseedDir(e);
  }
  function fireBarrage(e) {
    if (bullets.length > 90) return;
    const n = 6 + Math.min(6, level);            // 高關卡子彈更多
    const sp = 0.10 + level * 0.006;
    const off = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = off + i / n * Math.PI * 2;
      bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4200 });
    }
    if (Math.random() < 0.5) toast('⚠️ 彈幕來襲！');
  }
  function updateBullets(dt) {
    const k = dt / 16, p = pvis(), pr = 0.85;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; b.x += b.vx * k; b.y += b.vy * k; b.life -= dt;
      if (b.life <= 0 || b.x < 0.5 || b.y < 0.5 || b.x > COLS - 0.5 || b.y > ROWS - 0.5) { bullets.splice(i, 1); continue; }
      if (!drawing) continue;                                       // 沒拉線＝安全，子彈穿過不受傷
      if (Math.abs(b.x - p.x) < pr && Math.abs(b.y - p.y) < pr) { bullets.splice(i, 1); return die('bullet'); }   // 拉線中打中玩家
      const cx = b.x | 0, cy = b.y | 0; if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && g.cells[gi(g, cx, cy)] === 2) { bullets.splice(i, 1); return die('line'); }   // 打中框線
    }
  }

  // ───────── 繪圖（靜態底圖快取到 offscreen，每幀只 blit + 疊線/角色）─────────
  let ob, obx;
  function rebuildBase() {
    if (!ob) ob = document.createElement('canvas');
    if (ob.width !== cv.width || ob.height !== cv.height) { ob.width = cv.width; ob.height = cv.height; obx = ob.getContext('2d'); }
    obx.clearRect(0, 0, ob.width, ob.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const v = g.cells[gi(g, x, y)], px = x * cell, py = y * cell;
      if (v === 1) {
        if (imgReady) obx.drawImage(img, x / COLS * img.width, y / ROWS * img.height, img.width / COLS, img.height / ROWS, px, py, cell, cell);
        else { obx.fillStyle = '#2e4a3a'; obx.fillRect(px, py, cell, cell); }
      } else if (v === 0) {
        obx.fillStyle = '#141c2b'; obx.fillRect(px, py, cell, cell);
        if ((x + y) % 2) { obx.fillStyle = 'rgba(255,255,255,.03)'; obx.fillRect(px, py, cell, cell); }
      }   // v===2（線）不進底圖，逐幀畫
    }
  }
  function drawAll() { rebuildBase(); drawDynamic(); }
  function drawDynamic() {
    if (!ob) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(ob, 0, 0);
    drawTrail();
    drawBullets();
    drawEntities();
  }
  const cc = (v) => v * cell + cell / 2;   // 格→畫布中心
  function drawTrail() {
    if (!drawing || trailPath.length < 1) return;
    const p = pvis();
    const pts = trailPath.map(t => [cc(t.x), cc(t.y)]);
    pts[pts.length - 1] = [cc(p.x), cc(p.y)];   // 末端跟著平滑滑動的游標
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffcf4a'; ctx.shadowColor = '#ffbe2e'; ctx.shadowBlur = cell * 1.3; ctx.lineWidth = cell * 0.72;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff2c4'; ctx.lineWidth = cell * 0.26;   // 內芯高光
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.restore();
  }
  function drawBullets() {
    if (!bullets.length) return;
    const r = cell * 0.34;
    for (const b of bullets) {
      const x = cc(b.x), y = cc(b.y);
      ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill();
    }
  }
  function drawEntities() {
    // 玩家（平滑插值位置）
    const p = pvis(), px = cc(p.x), py = cc(p.y), pr = cell * 0.5;
    ctx.fillStyle = drawing ? '#ffd45e' : '#fff';
    ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
    // 敵人
    for (const e of enemies) {
      const cx = cc(e.x), cy = cc(e.y), r = cell * 0.8;
      ctx.fillStyle = '#e5403a'; ctx.shadowColor = '#ff5a4a'; ctx.shadowBlur = cell * 0.7; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.22, 0, 7); ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.22, 0, 7); ctx.fill();
      ctx.fillStyle = '#1c1c22'; ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.05, r * 0.1, 0, 7); ctx.arc(cx + r * 0.32, cy - r * 0.05, r * 0.1, 0, 7); ctx.fill();
    }
  }

  // ───────── 過關 / 結束 ─────────
  function stageClear() {
    mode = 'clear'; won = true;
    // 完整顯示整張圖
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (imgReady) ctx.drawImage(img, 0, 0, cv.width, cv.height);
    setTimeout(() => overlay('🎉 過關！', `揭開 <b>${Math.round(claimed * 100)}%</b>，圖片現形！<br>進入下一關（更多敵人、更快）。`,
      [{ t: '下一關 →', f: () => { level++; pickImg(); loadImg(() => startLevel()); } }, { t: '看完整圖', f: showFull }]), 700);
  }
  function showFull() { overlay('🖼️ 完整立繪', `<img class="fullart" src="${IMG_BASE + imgIdx}.jpg">`, [{ t: '下一關 →', f: () => { hideOverlay(); level++; pickImg(); loadImg(() => startLevel()); } }]); }
  function gameOver() {
    mode = 'over';
    overlay('💀 遊戲結束', `你到達第 <b>${level}</b> 關，最後揭開 <b>${Math.round(claimed * 100)}%</b>。`, [{ t: '再玩一次', f: () => { level = 1; lives = 3; pickImg(); loadImg(() => startLevel()); } }]);
  }

  // ───────── HUD / 標題 ─────────
  function updateHud() {
    $('hud').innerHTML = `<span class="pill">關卡 ${level}</span>
      <span class="pill">❤️ ${lives}</span>
      <span class="pill">揭開 <b>${Math.round(claimed * 100)}%</b> / ${Math.round(TARGET * 100)}%</span>`;
  }
  function title() {
    mode = 'title'; level = 1; lives = 3;
    overlay('🖼️ 描線揭圖 Unveil', `Qix／天蠶變 風：用<b>方向鍵</b>把游標拉進黑幕拉線,回到邊界圍出封閉區,該區就<b>揭開底圖</b>。<br>避開<b>紅色敵人</b>——碰到你正在拉的線就出局。揭開達 <b>${Math.round(TARGET * 100)}%</b> 過關,看完整立繪!`,
      [{ t: '▶ 開始', f: () => { level = 1; lives = 3; pickImg(); loadImg(() => startLevel()); } }, { t: '📖 操作', f: rules }]);
  }
  function rules() {
    overlay('📖 操作', `<div style="text-align:left;font-size:14px;line-height:1.9">
      • <b>方向鍵／WASD</b> 或畫面方向鍵移動。<br>
      • 站在<b>已揭開區(含外框)</b>可自由走;走進<b>黑幕</b>會開始拉線。<br>
      • 拉線回到已揭開區 → 圍住的一側(沒有敵人的那側)<b>揭開</b>。<br>
      • <b>紅敵</b>在黑幕裡亂彈;碰到你<b>正在拉的線</b>就<b>扣一命</b>並清掉線。<br>
      • 揭開 ${Math.round(TARGET * 100)}% 過關,越高關敵人越多越快。</div>`, [{ t: '返回', f: title }]);
  }

  // ───────── overlay / toast / 輸入 ─────────
  function overlay(t, b, acts) {
    $('ov-title').innerHTML = t; $('ov-body').innerHTML = b;
    const box = $('ov-actions'); box.innerHTML = '';
    acts.forEach(a => { const x = el('button', 'ovbtn', a.t); x.onclick = a.f; box.appendChild(x); });
    $('overlay').classList.add('show');
  }
  function hideOverlay() { $('overlay').classList.remove('show'); }
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 1400); }

  // fresh=刻意新按（非按著不放的自動重複）；只有刻意新按才「武裝」進入黑幕
  function setDir(d, fresh) {
    if (mode !== 'play') return;
    const opp = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (drawing && d === opp[dir]) return;   // 拉線時不能反向撞自己
    dir = d;
    if (fresh) enterArmed = true;
  }
  function bindInput() {
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      const map = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
      if (map[k]) { setDir(map[k], !e.repeat); e.preventDefault(); }   // e.repeat=按著不放的重複 → 非刻意
    });
    [['du', 'up'], ['dd', 'down'], ['dl', 'left'], ['dr', 'right']].forEach(([id, d]) => {
      const b = $(id); if (!b) return;
      const go = ev => { ev.preventDefault(); setDir(d, true); };     // 每次點 dpad ＝刻意新按
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('mousedown', go);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
