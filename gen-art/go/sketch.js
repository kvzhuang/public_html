// ============================================================
//  圍棋 Go — vanilla JS + Canvas API
// ============================================================

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const infoEl = document.getElementById('info');

// ── polyfill ctx.roundRect for older browsers ─────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

// ── game state ───────────────────────────────────────────────
let N            = 13;
let board        = [];          // board[r][c] = 0|1|2
let turn         = 1;           // 1=black, 2=white
let captures     = {1: 0, 2: 0};
let koPoint      = null;        // {r,c}
let prevBoardHash = '';
let passes       = 0;
let gameOver     = false;
let territory    = null;        // {black:[], white:[], neutral:[]}
let lastMove     = null;        // {r,c}
let hoverCell    = null;        // {r,c}
let aiThinking   = false;

// ── komi table ───────────────────────────────────────────────
const KOMI = {5: 0.5, 7: 2.5, 11: 5.5, 13: 6.5};

// ── canvas & board geometry ──────────────────────────────────
let CW, CH;         // canvas width/height
let CELL;           // cell size in px
let OX, OY;         // board origin (top-left intersection) in px

function setupGeometry() {
  // Responsive: fit canvas within the viewport (minus 32px for body padding)
  const availW = Math.min(window.innerWidth - 32, 680);
  // pad=44 guarantees board bg (CELL*0.6) + labels always fit for CELL≤70
  const pad = 44;
  CELL = Math.min(70, Math.floor((availW - 2 * pad) / (N - 1)));
  CW = CELL * (N - 1) + 2 * pad;
  CH = CW;   // square canvas
  canvas.width  = CW;
  canvas.height = CH;
  OX = pad;
  OY = pad;
}

// ── star point definitions ───────────────────────────────────
const HOSHI = {
  5:  [[2,2]],
  7:  [[2,2],[2,4],[4,2],[4,4],[3,3]],
  11: [[2,2],[2,8],[8,2],[8,8],[5,5]],
  13: [[3,3],[3,6],[3,9],[6,3],[6,6],[6,9],[9,3],[9,6],[9,9]]
};

// ── column labels (skip I) ───────────────────────────────────
const COL_LABELS = 'ABCDEFGHJKLMN';

// ── initialise ───────────────────────────────────────────────
function setupGame(n) {
  N = n;
  board = Array.from({length: N}, () => new Array(N).fill(0));
  turn  = 1;
  captures = {1: 0, 2: 0};
  koPoint  = null;
  prevBoardHash = '';
  passes   = 0;
  gameOver = false;
  territory = null;
  lastMove  = null;
  hoverCell = null;
  aiThinking = false;
  setupGeometry();
  updateInfo();
  draw();
}

// ── board hash ───────────────────────────────────────────────
function boardHash() {
  return board.map(row => row.join('')).join('|');
}

// ── group / liberty helpers ──────────────────────────────────
function getGroup(r, c) {
  const color = board[r][c];
  if (!color) return null;
  const visited = new Set();
  const stack   = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const key = cr * N + cc;
    if (visited.has(key)) continue;
    if (board[cr][cc] !== color) continue;
    visited.add(key);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) stack.push([nr, nc]);
    }
  }
  return visited;  // Set of (r*N+c) keys
}

function getLiberties(group) {
  const libs = new Set();
  for (const key of group) {
    const r = Math.floor(key / N), c = key % N;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === 0)
        libs.add(nr * N + nc);
    }
  }
  return libs;
}

// ── legality check ───────────────────────────────────────────
function isLegal(r, c, color) {
  if (r < 0 || r >= N || c < 0 || c >= N) return false;
  if (board[r][c] !== 0) return false;
  if (koPoint && koPoint.r === r && koPoint.c === c) return false;

  board[r][c] = color;
  const enemy = 3 - color;

  let capturesEnemy = false;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === enemy) {
      const eGroup = getGroup(nr, nc);
      if (getLiberties(eGroup).size === 0) { capturesEnemy = true; break; }
    }
  }

  const ownGroup = getGroup(r, c);
  const ownLibs  = getLiberties(ownGroup).size;
  board[r][c] = 0;  // restore

  if (ownLibs === 0 && !capturesEnemy) return false;  // suicide

  // Ko: simulate and check hash
  if (!capturesEnemy) {
    // quick check: if no capture, board won't revert to prev
    return true;
  }
  // Full hash check for ko
  const saved = board[r][c];
  board[r][c] = color;
  // remove captures temporarily
  const removed = [];
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === enemy) {
      const eGroup = getGroup(nr, nc);
      if (getLiberties(eGroup).size === 0) {
        for (const key of eGroup) {
          const er = Math.floor(key / N), ec = key % N;
          removed.push({r: er, c: ec, v: board[er][ec]});
          board[er][ec] = 0;
        }
      }
    }
  }
  const newHash = boardHash();
  // restore
  for (const s of removed) board[s.r][s.c] = s.v;
  board[r][c] = saved;

  if (newHash === prevBoardHash) return false;  // ko violation

  return true;
}

// ── place stone ──────────────────────────────────────────────
function placeStone(r, c) {
  const color = turn;
  const enemy = 3 - color;

  const oldHash = boardHash();

  board[r][c] = color;

  let capturedCount = 0;
  const capturedPositions = [];

  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === enemy) {
      const eGroup = getGroup(nr, nc);
      if (getLiberties(eGroup).size === 0) {
        for (const key of eGroup) {
          const er = Math.floor(key / N), ec = key % N;
          capturedPositions.push({r: er, c: ec});
          board[er][ec] = 0;
          capturedCount++;
        }
      }
    }
  }

  captures[color] += capturedCount;

  if (capturedCount === 1) {
    koPoint = capturedPositions[0];
  } else {
    koPoint = null;
  }

  prevBoardHash = oldHash;
  lastMove = {r, c};
  passes   = 0;
  turn     = enemy;
}

// ── pass ─────────────────────────────────────────────────────
function doPass(fromAI) {
  passes++;
  koPoint = null;
  lastMove = null;
  turn = 3 - turn;

  if (passes >= 2) {
    endGame();
    return;
  }

  if (!fromAI && !gameOver && turn === 2) {
    scheduleAI();
  }
}

// ── territory calculation ────────────────────────────────────
function calcTerritory() {
  const visited = new Set();
  const blackT = [], whiteT = [], neutralT = [];

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 0 && !visited.has(r * N + c)) {
        const region = [];
        const stack  = [[r, c]];
        let touchB = false, touchW = false;
        while (stack.length) {
          const [cr, cc] = stack.pop();
          const key = cr * N + cc;
          if (visited.has(key)) continue;
          if (cr < 0 || cr >= N || cc < 0 || cc >= N) continue;
          if (board[cr][cc] === 1) { touchB = true; continue; }
          if (board[cr][cc] === 2) { touchW = true; continue; }
          visited.add(key);
          region.push({r: cr, c: cc});
          stack.push([cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]);
        }
        if      (touchB && !touchW) blackT.push(...region);
        else if (touchW && !touchB) whiteT.push(...region);
        else                        neutralT.push(...region);
      }
    }
  }

  return {black: blackT, white: whiteT, neutral: neutralT};
}

// ── end game ─────────────────────────────────────────────────
function endGame() {
  gameOver  = true;
  territory = calcTerritory();
  updateInfo();
  draw();
}

// ── info panel ───────────────────────────────────────────────
function updateInfo() {
  const passBtn = document.getElementById('btnPass');

  if (gameOver && territory) {
    infoEl.style.borderColor = '';
    infoEl.style.background  = '';
    passBtn.classList.remove('pass-urgent');
    const bScore = territory.black.length + captures[1];
    const wScore = territory.white.length + captures[2] + KOMI[N];
    const winner = bScore > wScore ? '黑方勝' : '白方勝';
    const diff   = Math.abs(bScore - wScore).toFixed(1);
    infoEl.innerHTML =
      `<div class="winner">🏆 ${winner}（差 ${diff} 目）</div>` +
      `<div class="score-detail">` +
        `黑方：領地 ${territory.black.length} + 提子 ${captures[1]} = <strong>${bScore}</strong><br>` +
        `白方：領地 ${territory.white.length} + 提子 ${captures[2]} + 貼目 ${KOMI[N]} = <strong>${wScore.toFixed(1)}</strong>` +
      `</div>`;
  } else if (turn === 1 && passes === 1 && !gameOver) {
    // AI just passed — urge player to pass too
    infoEl.style.borderColor = '#e8c850';
    infoEl.style.background  = 'rgba(232,200,80,0.10)';
    passBtn.classList.add('pass-urgent');
    infoEl.innerHTML =
      `<div style="color:#f4c842;font-size:1.05rem;font-weight:600">⚠ AI 已虛手</div>` +
      `<div style="margin-top:4px;font-size:0.92rem">` +
        `收官完畢請按【虛手 (Pass)】結束對局，否則繼續落子。` +
      `</div>` +
      `<div style="margin-top:6px;color:#a08060;font-size:0.85rem">` +
        `黑提子: ${captures[1]}　白提子: ${captures[2]}` +
      `</div>`;
  } else {
    infoEl.style.borderColor = '';
    infoEl.style.background  = '';
    passBtn.classList.remove('pass-urgent');
    const turnLabel = turn === 1
      ? '<span style="color:#222">●</span> 黑方落子'
      : '<span style="color:#eee">○</span> 白方落子' + (aiThinking ? '（思考中…）' : '');
    infoEl.innerHTML =
      `<span style="font-size:1.05rem">${turnLabel}</span>` +
      `<span style="margin-left:24px;color:#a08060">黑方提子: ${captures[1]}</span>` +
      `<span style="margin-left:16px;color:#a08060">白方提子: ${captures[2]}</span>`;
  }
}

// ============================================================
//  AI Logic
// ============================================================

function getAllLegalMoves(color) {
  const moves = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (isLegal(r, c, color)) moves.push({r, c});
  return moves;
}

function scoreMove(r, c, color) {
  let score = 0;
  const enemy = 3 - color;

  // Simulate placement
  board[r][c] = color;

  // Count captured enemy stones
  let captured = 0;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === enemy) {
      const eg = getGroup(nr, nc);
      if (getLiberties(eg).size === 0) {
        captured += eg.size;
        score += 50 + eg.size * 8;
      }
    }
  }

  // Check own group liberties after placement
  const ownGroup = getGroup(r, c);
  const ownLibs  = getLiberties(ownGroup).size;

  // Check if we rescue an own group from atari (1 lib → more)
  board[r][c] = 0;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === color) {
      const og = getGroup(nr, nc);
      if (getLiberties(og).size === 1) { score += 30; break; }
    }
  }
  board[r][c] = color;

  // Adjacency bonuses
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      if (board[nr][nc] === color) score += 5;
      else if (board[nr][nc] === enemy) score += 3;
    }
  }

  // Corner / edge bonus (opening)
  const stoneCount = board.flat().filter(x => x !== 0).length;
  if (stoneCount < N * 2) {
    const isCorner = (r <= 2 || r >= N-3) && (c <= 2 || c >= N-3);
    const isEdge   = r <= 1 || r >= N-2 || c <= 1 || c >= N-2;
    if (isCorner) score += 8;
    else if (isEdge) score += 4;
  }

  // Penalise filling own territory
  let touchColor = false, touchEnemy = false;
  const visited = new Set();
  const stack   = [[r, c]];
  board[r][c] = 0;  // temporarily empty for region check
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const key = cr * N + cc;
    if (visited.has(key)) continue;
    if (cr < 0 || cr >= N || cc < 0 || cc >= N) continue;
    if (board[cr][cc] === color) { touchColor = true; continue; }
    if (board[cr][cc] === enemy) { touchEnemy = true; continue; }
    visited.add(key);
    stack.push([cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]);
  }
  board[r][c] = color;
  if (touchColor && !touchEnemy && captured === 0) score -= 10;

  // Prefer moves that put enemy in atari
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === enemy) {
      const eg = getGroup(nr, nc);
      if (getLiberties(eg).size === 1) score += 12;
    }
  }

  board[r][c] = 0;  // restore

  // Small noise
  score += Math.random() * 2;
  return score;
}

function estimateScore(color) {
  // Quick estimate: own stones + territory
  let stones = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (board[r][c] === color) stones++;
  const t = calcTerritory();
  const terr = color === 1 ? t.black.length : t.white.length;
  const opp  = color === 1 ? captures[1]   : captures[2];
  const komi = color === 2 ? KOMI[N] : 0;
  return stones + terr + opp + komi;
}

function aiMove() {
  if (gameOver || turn !== 2) return;

  const legalMoves = getAllLegalMoves(2);

  if (legalMoves.length === 0) {
    aiThinking = false;
    doPass(true);
    updateInfo();
    draw();
    return;
  }

  // Score all legal moves first
  const scored = legalMoves.map(m => ({...m, s: scoreMove(m.r, m.c, 2)}));
  scored.sort((a, b) => b.s - a.s);
  const bestScore = scored[0].s;

  // Pass if no meaningful move remains:
  // score < 14 means only dame / territory-filling left (captures/atari score ≥ 12+adjacency)
  const totalStones = board.flat().filter(x => x !== 0).length;
  if (bestScore < 14 && totalStones > N * 2) {
    aiThinking = false;
    doPass(true);
    updateInfo();
    draw();
    return;
  }

  // Also pass when very few moves remain and AI is winning
  if (legalMoves.length < 8) {
    const aiScore  = estimateScore(2);
    const oppScore = estimateScore(1);
    if (aiScore - oppScore > 5) {
      aiThinking = false;
      doPass(true);
      updateInfo();
      draw();
      return;
    }
  }

  // Pick from top 3
  const topN  = Math.min(3, scored.length);
  const pick  = scored[Math.floor(Math.random() * topN)];

  aiThinking = false;
  placeStone(pick.r, pick.c);
  updateInfo();
  draw();
}

function scheduleAI() {
  if (gameOver || turn !== 2) return;
  aiThinking = true;
  updateInfo();
  draw();
  setTimeout(() => {
    aiMove();
  }, 500);
}

// ============================================================
//  Rendering
// ============================================================

function px(c) { return OX + c * CELL; }
function py(r) { return OY + r * CELL; }

function drawBoard() {
  // Board background
  const bx = OX - CELL * 0.6;
  const by = OY - CELL * 0.6;
  const bw = CELL * (N - 1) + CELL * 1.2;
  const bh = CELL * (N - 1) + CELL * 1.2;

  // Wood grain gradient
  const woodGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  woodGrad.addColorStop(0,   '#C9983A');
  woodGrad.addColorStop(0.3, '#D4A847');
  woodGrad.addColorStop(0.7, '#C99030');
  woodGrad.addColorStop(1,   '#B8851E');
  ctx.fillStyle = woodGrad;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();

  // Subtle wood grain lines
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#5a3000';
  ctx.lineWidth = 1;
  for (let i = 0; i < bw; i += 6) {
    ctx.beginPath();
    ctx.moveTo(bx + i, by);
    ctx.lineTo(bx + i + 12, by + bh);
    ctx.stroke();
  }
  ctx.restore();

  // Board border/shadow
  ctx.strokeStyle = '#8B6014';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.stroke();

  // Grid lines
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1;
  for (let i = 0; i < N; i++) {
    // horizontal
    ctx.beginPath();
    ctx.moveTo(px(0), py(i));
    ctx.lineTo(px(N-1), py(i));
    ctx.stroke();
    // vertical
    ctx.beginPath();
    ctx.moveTo(px(i), py(0));
    ctx.lineTo(px(i), py(N-1));
    ctx.stroke();
  }

  // Star points
  const hoshi = HOSHI[N] || [];
  for (const [hr, hc] of hoshi) {
    ctx.beginPath();
    ctx.arc(px(hc), py(hr), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#5a3a00';
    ctx.fill();
  }
}

function drawCoordinates() {
  const fontSize = Math.max(9, Math.min(13, Math.round(CELL * 0.42)));
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#7a5a20';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let c = 0; c < N; c++) {
    const label = COL_LABELS[c];
    ctx.fillText(label, px(c), OY - CELL * 0.55);
    ctx.fillText(label, px(c), py(N-1) + CELL * 0.55);
  }

  ctx.textAlign = 'right';
  for (let r = 0; r < N; r++) {
    const label = String(N - r);
    ctx.fillText(label, px(0) - CELL * 0.42, py(r));
    ctx.textAlign = 'left';
    ctx.fillText(label, px(N-1) + CELL * 0.42, py(r));
    ctx.textAlign = 'right';
  }
}

function drawStone(x, y, color, alpha) {
  const radius = CELL * 0.44;
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;

  const grad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1,
    x, y, radius
  );

  if (color === 1) {
    grad.addColorStop(0, '#666');
    grad.addColorStop(1, '#000');
  } else {
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#ccc');
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle rim
  ctx.strokeStyle = color === 1 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.18)';
  ctx.lineWidth   = 0.8;
  ctx.stroke();

  ctx.restore();
}

function drawStones() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] !== 0) {
        drawStone(px(c), py(r), board[r][c]);

        // Last move marker
        if (lastMove && lastMove.r === r && lastMove.c === c) {
          ctx.beginPath();
          ctx.arc(px(c), py(r), 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#e03030';
          ctx.fill();
        }
      }
    }
  }
}

function drawHover() {
  if (!hoverCell || gameOver || turn !== 1) return;
  const {r, c} = hoverCell;
  if (board[r][c] !== 0) return;
  if (!isLegal(r, c, 1)) return;
  drawStone(px(c), py(r), 1, 0.35);
}

function drawTerritory() {
  if (!territory) return;
  for (const pt of territory.black) {
    ctx.beginPath();
    ctx.arc(px(pt.c), py(pt.r), CELL * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fill();
  }
  for (const pt of territory.white) {
    ctx.beginPath();
    ctx.arc(px(pt.c), py(pt.r), CELL * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function draw() {
  // Clear
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, CW, CH);

  drawBoard();
  drawCoordinates();
  drawStones();
  if (gameOver) drawTerritory();
  drawHover();
}

// ============================================================
//  Input handling
// ============================================================

function canvasPosToCell(x, y) {
  // Find nearest intersection
  const c = Math.round((x - OX) / CELL);
  const r = Math.round((y - OY) / CELL);
  if (r < 0 || r >= N || c < 0 || c >= N) return null;
  // Only snap if within half a cell
  const dx = x - px(c);
  const dy = y - py(r);
  if (Math.abs(dx) > CELL * 0.5 || Math.abs(dy) > CELL * 0.5) return null;
  return {r, c};
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CW / rect.width;
  const scaleY = CH / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;
  const cell = canvasPosToCell(mx, my);
  const prev = hoverCell;
  hoverCell = cell;
  if (!gameOver && turn === 1 &&
      JSON.stringify(prev) !== JSON.stringify(cell)) {
    draw();
  }
});

canvas.addEventListener('mouseleave', () => {
  hoverCell = null;
  if (!gameOver && turn === 1) draw();
});

canvas.addEventListener('click', e => {
  if (gameOver || turn !== 1 || aiThinking) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = CW / rect.width;
  const scaleY = CH / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;
  const cell = canvasPosToCell(mx, my);
  if (!cell) return;
  const {r, c} = cell;
  if (!isLegal(r, c, 1)) return;
  placeStone(r, c);
  hoverCell = null;
  updateInfo();
  draw();
  if (!gameOver) scheduleAI();
});

// Touch support
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (gameOver || turn !== 1 || aiThinking) return;
  const touch = e.changedTouches[0];
  const rect  = canvas.getBoundingClientRect();
  const scaleX = CW / rect.width;
  const scaleY = CH / rect.height;
  const mx = (touch.clientX - rect.left) * scaleX;
  const my = (touch.clientY - rect.top)  * scaleY;
  const cell = canvasPosToCell(mx, my);
  if (!cell) return;
  const {r, c} = cell;
  if (!isLegal(r, c, 1)) return;
  placeStone(r, c);
  updateInfo();
  draw();
  if (!gameOver) scheduleAI();
}, {passive: false});

// ── buttons ──────────────────────────────────────────────────
document.querySelectorAll('.sizeBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sizeBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setupGame(parseInt(btn.dataset.n, 10));
  });
});

document.getElementById('btnPass').addEventListener('click', () => {
  if (gameOver || turn !== 1 || aiThinking) return;
  doPass(false);
  updateInfo();
  draw();
});

document.getElementById('btnRestart').addEventListener('click', () => {
  const activeBtn = document.querySelector('.sizeBtn.active');
  const n = activeBtn ? parseInt(activeBtn.dataset.n, 10) : 13;
  setupGame(n);
});

// ── kick off ─────────────────────────────────────────────────
setupGame(13);

// Redraw on orientation / window resize
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => setupGame(N), 150);
});
