/* Pong Wars 領地爭奪 — 兩顆彈跳球各屬一方，撞到對方格子就反彈並翻成自己的顏色。
   Canvas 2D · 無限對戰 · localStorage 存設定 */
(function () {
  'use strict';

  // ── 顏色（取自參考圖：薄荷白 × 深海藍綠）──
  var MINT = '#e6f0ea';       // 薄荷（淺方）領地
  var TEAL = '#1c4a54';       // 深海（深方）領地
  var BALL_ON_MINT = '#123138'; // 薄荷方的球（畫在淺區→深色點）
  var BALL_ON_TEAL = '#eef6f2'; // 深海方的球（畫在深區→白點）
  var LIGHT = 0, DARK = 1;      // grid 值：0=薄荷 1=深海

  var STORE = 'pong-wars-settings-v1';

  var cv = document.getElementById('board');
  var ctx = cv.getContext('2d');
  var el = {
    scoreFill: document.getElementById('scoreFill'),
    mintText: document.getElementById('mintText'),
    tealText: document.getElementById('tealText'),
    leadText: document.getElementById('leadText'),
    pauseBtn: document.getElementById('pauseBtn'),
    speed: document.getElementById('speed'),
    spdText: document.getElementById('spdText'),
    balls: document.getElementById('balls'),
    grid: document.getElementById('grid'),
    launch: document.getElementById('launch'),
    trailBtn: document.getElementById('trailBtn'),
    resetBtn: document.getElementById('resetBtn')
  };

  // ── 狀態 ──
  var N = 20;                 // 每邊格數
  var boardSize = 560;       // 邏輯尺寸(CSS px)
  var sq = boardSize / N;     // 單格邊長
  var R = sq * 0.6;           // 球半徑
  var dpr = 1;
  var grid = [];              // grid[i][j] = LIGHT|DARK
  var balls = [];
  var speedMult = 1, paused = false, trailOn = true, ballsPerSide = 1;
  var launchDir = 'v';       // 發球方向：'v'=直向(上下) 'h'=橫向(左右)
  var raf = 0, last = 0;

  function baseSpeed() { return sq * 0.24 * speedMult; }

  // ── 設定存取 ──
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!s) return;
      if (s.speed) speedMult = s.speed;
      if (s.balls) ballsPerSide = s.balls;
      if (s.grid) N = s.grid;
      if (typeof s.trail === 'boolean') trailOn = s.trail;
      if (s.launch === 'v' || s.launch === 'h') launchDir = s.launch;
    } catch (e) {}
  }
  function saveSettings() {
    try {
      localStorage.setItem(STORE, JSON.stringify(
        { speed: speedMult, balls: ballsPerSide, grid: N, trail: trailOn, launch: launchDir }));
    } catch (e) {}
  }

  // ── 尺寸 / 高解析度 ──
  function fit() {
    var css = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.62, 620);
    css = Math.max(280, Math.floor(css));
    var ratio = css / boardSize;
    boardSize = css; sq = boardSize / N; R = sq * 0.6;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(boardSize * dpr);
    cv.height = Math.round(boardSize * dpr);
    cv.style.width = boardSize + 'px';
    cv.style.height = boardSize + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 依比例移動球位置
    if (ratio && isFinite(ratio) && ratio !== 1) {
      balls.forEach(function (b) { b.x *= ratio; b.y *= ratio; });
    }
  }

  // ── 世界生成 ──
  function buildGrid() {
    grid = [];
    for (var i = 0; i < N; i++) {
      grid[i] = [];
      for (var j = 0; j < N; j++) grid[i][j] = i < N / 2 ? LIGHT : DARK;
    }
  }

  function makeBalls() {
    balls = [];
    var spd = baseSpeed();
    for (var k = 0; k < ballsPerSide; k++) {
      // 薄荷方（LIGHT）：起在左半，畫成深色點
      balls.push(newBall(LIGHT,
        boardSize * (k === 0 ? 0.25 : (0.12 + Math.random() * 0.26)),
        boardSize * (k === 0 ? 0.5 : Math.random()), spd));
      // 深海方（DARK）：起在右半，畫成白點
      balls.push(newBall(DARK,
        boardSize * (k === 0 ? 0.75 : (0.62 + Math.random() * 0.26)),
        boardSize * (k === 0 ? 0.5 : Math.random()), spd));
    }
  }
  function newBall(team, x, y, spd) {
    var dir = team === LIGHT ? 1 : -1;   // 薄荷往右(+)、深海往左(-)：朝敵方前線
    var dx, dy, a;
    if (launchDir === 'h') {
      // 橫向：主要左右（朝對方領地），帶一點上下
      a = (Math.random() * 0.5 - 0.25) * Math.PI;        // -45°..45°
      dx = Math.cos(a) * dir;
      dy = Math.sin(a);
    } else {
      // 直向（預設）：主要上下，帶一點左右
      a = (Math.random() * 0.5 + 0.25) * Math.PI;        // 45°..135°
      dx = Math.cos(a) * dir;
      dy = Math.sin(a) * (Math.random() < 0.5 ? 1 : -1);
    }
    var b = { team: team, x: x, y: y, dx: dx, dy: dy, trail: [] };
    setSpeed(b, spd);
    return b;
  }
  function setSpeed(b, spd) {
    var m = Math.hypot(b.dx, b.dy) || 1;
    b.dx = b.dx / m * spd; b.dy = b.dy / m * spd;
  }

  // ── 核心：撞到對方格子 → 翻面 + 反彈 ──
  function bounceAndPaint(b) {
    var step = 12;
    for (var a = 0; a < 360; a += step) {
      var rad = a * Math.PI / 180;
      var cx = b.x + Math.cos(rad) * (R + sq * 0.02);
      var cy = b.y + Math.sin(rad) * (R + sq * 0.02);
      var i = Math.floor(cx / sq), j = Math.floor(cy / sq);
      if (i < 0 || i >= N || j < 0 || j >= N) continue;
      if (grid[i][j] !== b.team) {
        grid[i][j] = b.team;                       // 翻成自己的顏色（擴張領地）
        if (Math.abs(Math.cos(rad)) > Math.abs(Math.sin(rad))) b.dx = -b.dx;
        else b.dy = -b.dy;                          // 依碰撞方向反彈（物理）
      }
    }
  }

  function stepBall(b, spd) {
    bounceAndPaint(b);
    // 牆壁反彈
    if (b.x + b.dx > boardSize - R || b.x + b.dx < R) b.dx = -b.dx;
    if (b.y + b.dy > boardSize - R || b.y + b.dy < R) b.dy = -b.dy;
    // 微小抖動避免鎖死成直線循環
    b.dx += (Math.random() - 0.5) * 0.08 * spd;
    b.dy += (Math.random() - 0.5) * 0.08 * spd;
    setSpeed(b, spd);
    b.x += b.dx; b.y += b.dy;
    b.x = Math.max(R, Math.min(boardSize - R, b.x));
    b.y = Math.max(R, Math.min(boardSize - R, b.y));
    if (trailOn) {
      b.trail.push([b.x, b.y]);
      if (b.trail.length > 14) b.trail.shift();
    } else if (b.trail.length) b.trail.length = 0;
  }

  function step() {
    var spd = baseSpeed();
    for (var k = 0; k < balls.length; k++) stepBall(balls[k], spd);
  }

  // ── 計分 ──
  function score() {
    var light = 0;
    for (var i = 0; i < N; i++)
      for (var j = 0; j < N; j++)
        if (grid[i][j] === LIGHT) light++;
    return { light: light, dark: N * N - light, total: N * N };
  }

  // ── 繪製 ──
  function render() {
    // 領地方格
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        ctx.fillStyle = grid[i][j] === LIGHT ? MINT : TEAL;
        ctx.fillRect(Math.floor(i * sq), Math.floor(j * sq),
          Math.ceil(sq) + 1, Math.ceil(sq) + 1);
      }
    }
    // 拖尾
    if (trailOn) {
      for (var t = 0; t < balls.length; t++) {
        var b = balls[t];
        var col = b.team === LIGHT ? BALL_ON_MINT : BALL_ON_TEAL;
        for (var p = 0; p < b.trail.length; p++) {
          var al = (p + 1) / b.trail.length * 0.28;
          ctx.globalAlpha = al;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(b.trail[p][0], b.trail[p][1], R * (0.4 + 0.5 * p / b.trail.length), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    // 球
    for (var k = 0; k < balls.length; k++) {
      var bb = balls[k];
      ctx.fillStyle = bb.team === LIGHT ? BALL_ON_MINT : BALL_ON_TEAL;
      ctx.shadowColor = 'rgba(0,0,0,.28)';
      ctx.shadowBlur = R * 0.5; ctx.shadowOffsetY = R * 0.18;
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
  }

  function updateHUD() {
    var s = score();
    var pctMint = s.light / s.total * 100;
    el.scoreFill.style.width = pctMint.toFixed(2) + '%';
    el.mintText.textContent = s.light;
    el.tealText.textContent = s.dark;
    el.leadText.textContent =
      s.light === s.dark ? '平手' :
      (s.light > s.dark ? '🌱 薄荷 +' + (s.light - s.dark) : '🌊 深海 +' + (s.dark - s.light));
  }

  // ── 主迴圈 ──
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!paused) step();
    render();
    updateHUD();
  }

  // ── 重置 ──
  function reset() {
    fit();
    buildGrid();
    makeBalls();
  }

  // ── 輸入 ──
  el.pauseBtn.addEventListener('click', function () {
    paused = !paused;
    el.pauseBtn.textContent = paused ? '▶ 繼續' : '⏸ 暫停';
  });
  el.speed.addEventListener('input', function () {
    speedMult = parseFloat(el.speed.value);
    el.spdText.textContent = speedMult + 'x';
    saveSettings();
  });
  el.balls.addEventListener('change', function () {
    ballsPerSide = parseInt(el.balls.value, 10);
    makeBalls(); saveSettings();
  });
  el.grid.addEventListener('change', function () {
    N = parseInt(el.grid.value, 10);
    reset(); saveSettings();
  });
  el.launch.addEventListener('change', function () {
    launchDir = el.launch.value === 'h' ? 'h' : 'v';
    makeBalls();            // 依新發球方向重新發球（不清空領地）
    saveSettings();
  });
  el.trailBtn.addEventListener('click', function () {
    trailOn = !trailOn;
    el.trailBtn.textContent = '✨ 拖尾：' + (trailOn ? '開' : '關');
    saveSettings();
  });
  el.resetBtn.addEventListener('click', reset);
  window.addEventListener('resize', function () { fit(); });

  // ── 啟動 ──
  loadSettings();
  el.speed.value = speedMult; el.spdText.textContent = speedMult + 'x';
  el.balls.value = String(ballsPerSide);
  el.grid.value = String(N);
  el.launch.value = launchDir;
  el.trailBtn.textContent = '✨ 拖尾：' + (trailOn ? '開' : '關');
  reset();
  frame();

  // ── 除錯鉤子（無頭測試用；正常執行不影響）──
  window.__pong = {
    state: function () { return score(); },
    step: function (n) { for (var k = 0; k < (n || 1); k++) step(); return score(); },
    balls: function () { return balls.map(function (b) { return { team: b.team, x: Math.round(b.x), y: Math.round(b.y), dx: +b.dx.toFixed(2), dy: +b.dy.toFixed(2) }; }); },
    setLaunch: function (d) { launchDir = (d === 'h' ? 'h' : 'v'); if (el.launch) el.launch.value = launchDir; makeBalls(); },
    reset: reset
  };
})();
