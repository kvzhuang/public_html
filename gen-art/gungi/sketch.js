// Gungi (軍儀棋) - Human (White/下方) vs AI (Black/上方)
// =============================================================

// === CONSTANTS & CONFIG ===
const CANVAS_W = 700, CANVAS_H = 760;
const BOARD_X = 80, BOARD_Y = 70, CELL = 60, COLS = 9, ROWS = 9;
const MAX_TIER = 2;
const HAND_Y = 690;
const HAND_RADIUS = 20;

const PIECE_VALUE = {
  '帅':1000,'大':9,'中':9,'小':5,'兵':2,
  '槍':6,'侍':3,'馬':5,'忍':6,'砦':4,
  '弓':7,'砲':8,'筒':8,'謀':8
};

const STARTING_HAND = {
  '帅':1,'大':1,'中':1,'小':2,'兵':7,
  '槍':1,'侍':2,'馬':2,'忍':2,'砦':2,
  '弓':1,'砲':1,'筒':1,'謀':1
};

// === GAME STATE ===
let board = [];
let phase = 'deploy';   // 'deploy' | 'play'
let currentTurn = 'w';  // 'w' | 'b'
let whiteDone = false;
let blackDone = false;
let selectedCell = null; // {r,c}
let validMoves = [];     // [{r,c,moveType}]
let whiteHand = {};
let blackHand = {};
let handSelectedType = null; // for deploy & play-new
let newMode = false;         // true while player is in play-phase "新" placement mode
let gameOver = false;
let message = '';
let aiThinking = false;

const canvas = document.getElementById('c');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');
const msgEl  = document.getElementById('msg');
const btnDone    = document.getElementById('btnDone');
const btnAuto    = document.getElementById('btnAuto');
const btnNew     = document.getElementById('btnNew');
const btnBattle  = document.getElementById('btnBattle');
const btnRestart = document.getElementById('btnRestart');

// === AUTO-BATTLE CONFIG ===
let autoBattle = false;
let abTimer = null;
const AB_SHOW_MS = 650;  // 亮出攻擊範圍的停留時間
const AB_MOVE_MS = 750;  // 執行移動後等待下一手的時間

// === INIT ===
function initBoard() {
  board = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) board[r][c] = [];
  }
}

function copyHand(h) {
  const out = {};
  for (const k in h) out[k] = h[k];
  return out;
}

function setupGame() {
  // 停止自動對戰
  if (autoBattle) { autoBattle = false; if (abTimer) { clearTimeout(abTimer); abTimer = null; } }
  initBoard();
  phase = 'deploy';
  currentTurn = 'w';
  whiteDone = false;
  blackDone = false;
  selectedCell = null;
  validMoves = [];
  whiteHand = copyHand(STARTING_HAND);
  blackHand  = copyHand(STARTING_HAND);
  handSelectedType = null;
  newMode = false;
  gameOver = false;
  message = '';
  aiThinking = false;

  aiDeploy();
  blackDone = true;

  setMessage('部署階段：點選下方手牌，再點綠色格放置（先放 帅）');
  updateButtons();
  render();
}

// === AI DEPLOYMENT ===
function aiDeploy() {
  const placements = [
    {r:0,c:4,t:'帅'},{r:0,c:3,t:'大'},{r:0,c:5,t:'中'},{r:0,c:2,t:'謀'},
    {r:0,c:6,t:'馬'},{r:0,c:7,t:'馬'},
    {r:1,c:0,t:'兵'},{r:1,c:1,t:'兵'},{r:1,c:2,t:'兵'},{r:1,c:3,t:'兵'},
    {r:1,c:4,t:'兵'},{r:1,c:5,t:'兵'},{r:1,c:6,t:'兵'},
    {r:2,c:4,t:'槍'},{r:2,c:2,t:'忍'},{r:2,c:6,t:'忍'},
    {r:2,c:1,t:'侍'},{r:2,c:5,t:'侍'},{r:2,c:0,t:'砦'},{r:2,c:8,t:'砦'},
    {r:2,c:3,t:'小'},{r:2,c:7,t:'小'},{r:0,c:1,t:'弓'},
    {r:0,c:8,t:'砲'},{r:0,c:0,t:'筒'}
  ];
  for (const p of placements) {
    board[p.r][p.c].push({type: p.t, owner: 'b'});
    if (blackHand[p.t] > 0) {
      blackHand[p.t]--;
      if (blackHand[p.t] === 0) delete blackHand[p.t];
    }
  }
}

// === HELPERS ===
function getTop(r, c)  { const s = board[r][c]; return s.length ? s[s.length-1] : null; }
function getTier(r, c) { return board[r][c].length; }
function inBounds(r, c){ return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function forward(owner){ return owner === 'w' ? -1 : 1; }

function totalHand(owner) {
  const h = owner === 'w' ? whiteHand : blackHand;
  return Object.values(h).reduce((a,b) => a+b, 0);
}

// === PIECE MOVEMENT FUNCTIONS ===

// Core sliding helper: up to maxSteps in direction (dr,dc)
function slideDirSafe(moves, r, c, dr, dc, owner, myTier, maxSteps) {
  for (let i = 1; i <= maxSteps; i++) {
    const tr = r + dr * i, tc = c + dc * i;
    if (!inBounds(tr, tc)) break;
    const stack = board[tr][tc];
    if (stack.length === 0) {
      moves.push({r: tr, c: tc, moveType: 'move'});
      continue; // keep sliding
    }
    const top = stack[stack.length - 1];
    if (top.owner === owner) {
      // Can stack on own piece (not on 帅, not if full)
      if (stack.length < MAX_TIER && top.type !== '帅') {
        moves.push({r: tr, c: tc, moveType: 'stack'});
      }
      break; // stop at own piece
    } else {
      // Enemy: can capture/control if their stack ≤ our tier
      if (stack.length <= myTier) {
        moves.push({r: tr, c: tc, moveType: stack.length === 1 ? 'capture' : 'control'});
      }
      break; // stop at enemy
    }
  }
}

// Jump helper (no sliding stop — used by 忍)
function addJumpTarget(moves, tr, tc, owner, myTier) {
  if (!inBounds(tr, tc)) return;
  const stack = board[tr][tc];
  if (stack.length === 0) {
    moves.push({r: tr, c: tc, moveType: 'move'});
  } else {
    const top = stack[stack.length - 1];
    if (top.owner === owner) {
      if (stack.length < MAX_TIER && top.type !== '帅') {
        moves.push({r: tr, c: tc, moveType: 'stack'});
      }
    } else {
      if (stack.length <= myTier) {
        moves.push({r: tr, c: tc, moveType: stack.length === 1 ? 'capture' : 'control'});
      }
    }
  }
}

function getMoves(r, c) {
  const piece = getTop(r, c);
  if (!piece) return [];
  const tier  = getTier(r, c);
  const owner = piece.owner;
  const fwd   = forward(owner);
  switch (piece.type) {
    case '帅': return movesKing(r, c, owner);
    case '大':  return movesDai(r, c, owner, tier);
    case '中':  return movesChu(r, c, owner, tier);
    case '小':  return movesSho(r, c, owner, tier);
    case '兵':  return movesPawn(r, c, owner, tier, fwd);
    case '槍':  return movesSpear(r, c, owner, tier, fwd);
    case '侍':  return movesSamurai(r, c, owner, tier);
    case '馬':  return movesHorse(r, c, owner, tier, fwd);
    case '忍':  return movesNinja(r, c, owner, tier);
    case '砦':  return movesFort(r, c, owner, tier, fwd);
    case '弓':  return movesBow(r, c, owner, tier);
    case '砲':  return movesCannon(r, c, owner, tier, fwd);
    case '筒':  return movesTube(r, c, owner, tier, fwd);
    case '謀':  return movesSpy(r, c, owner, tier, fwd);
    default: return [];
  }
}

// 帅: 1 step all 8 dirs, cannot stack
function movesKing(r, c, owner) {
  const moves = [];
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const tr = r+dr, tc = c+dc;
    if (!inBounds(tr, tc)) continue;
    const stack = board[tr][tc];
    if (stack.length === 0) {
      moves.push({r:tr, c:tc, moveType:'move'});
    } else {
      const top = stack[stack.length-1];
      if (top.owner !== owner && stack.length <= 1) {
        moves.push({r:tr, c:tc, moveType:'capture'});
      }
      // 帅 cannot stack
    }
  }
  return moves;
}

// 大: orthogonal unlimited, diagonal 1+(tier-1) = tier steps
function movesDai(r, c, owner, tier) {
  const moves = [];
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, 99);
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, tier); // 1 + (tier-1)
  return moves;
}

// 中: diagonal unlimited, orthogonal tier steps
function movesChu(r, c, owner, tier) {
  const moves = [];
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, 99);
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, tier);
  return moves;
}

// 小: all 8 dirs, tier steps
function movesSho(r, c, owner, tier) {
  const moves = [];
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, tier);
  return moves;
}

// 兵: forward tier steps, backward tier steps
function movesPawn(r, c, owner, tier, fwd) {
  const moves = [];
  slideDirSafe(moves, r, c, fwd,  0, owner, tier, tier);
  slideDirSafe(moves, r, c, -fwd, 0, owner, tier, tier);
  return moves;
}

// 槍: forward unlimited, backward tier steps
function movesSpear(r, c, owner, tier, fwd) {
  const moves = [];
  slideDirSafe(moves, r, c, fwd,  0, owner, tier, 99);
  slideDirSafe(moves, r, c, -fwd, 0, owner, tier, tier);
  return moves;
}

// 侍: all 8 dirs, tier steps
function movesSamurai(r, c, owner, tier) {
  const moves = [];
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, tier);
  return moves;
}

// 馬: L-shape — forward (1+tier) then ±1 side, can jump
function movesHorse(r, c, owner, tier, fwd) {
  const moves = [];
  const fwdSteps = 1 + tier; // tier1→2, tier2→3
  for (const dc of [-1, 1]) {
    const tr = r + fwd * fwdSteps;
    const tc = c + dc;
    addJumpTarget(moves, tr, tc, owner, tier);
  }
  return moves;
}

// 忍: all 8 dirs, 1 to (tier+1) steps, CAN JUMP over everything
function movesNinja(r, c, owner, tier) {
  const moves = [];
  const maxSteps = tier + 1;
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    for (let s = 1; s <= maxSteps; s++) {
      addJumpTarget(moves, r + dr*s, c + dc*s, owner, tier);
    }
  }
  return moves;
}

// 砦: forward diagonals only, unlimited
function movesFort(r, c, owner, tier, fwd) {
  const moves = [];
  for (const dc of [-1, 1])
    slideDirSafe(moves, r, c, fwd, dc, owner, tier, 99);
  return moves;
}

// 弓: orthogonal unlimited; can jump over a cell if cell stack.length <= tier
function movesBow(r, c, owner, tier) {
  const moves = [];
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    for (let s = 1; s < 99; s++) {
      const tr = r + dr*s, tc = c + dc*s;
      if (!inBounds(tr, tc)) break;
      const stack = board[tr][tc];
      if (stack.length === 0) {
        moves.push({r:tr, c:tc, moveType:'move'});
        continue; // keep going
      }
      const top = stack[stack.length-1];
      if (top.owner === owner) {
        // Jump over own piece if stack.length <= tier, otherwise stack/stop
        if (stack.length <= tier) {
          // jump over (don't add as destination unless it's stackable)
          if (stack.length < MAX_TIER && top.type !== '帅') {
            moves.push({r:tr, c:tc, moveType:'stack'});
          }
          continue; // jump
        } else {
          if (stack.length < MAX_TIER && top.type !== '帅') {
            moves.push({r:tr, c:tc, moveType:'stack'});
          }
          break;
        }
      } else {
        // Jump over enemy if stack.length <= tier
        if (stack.length <= tier) {
          moves.push({r:tr, c:tc, moveType: stack.length === 1 ? 'capture' : 'control'});
          continue; // jump over
        } else {
          break; // blocked
        }
      }
    }
  }
  return moves;
}

// 砲: forward only; jump over exactly (tier+1) cells, land at (tier+2) ahead
// Intermediate cells must each have stack.length <= tier
function movesCannon(r, c, owner, tier, fwd) {
  const moves = [];
  const jumpCount = tier + 1; // cells to jump over
  const landDist  = tier + 2; // landing distance

  let ok = true;
  for (let i = 1; i <= jumpCount; i++) {
    const ir = r + fwd * i;
    if (!inBounds(ir, c) || board[ir][c].length > tier) { ok = false; break; }
  }
  if (!ok) return moves;

  const lr = r + fwd * landDist;
  if (!inBounds(lr, c)) return moves;

  const stack = board[lr][c];
  if (stack.length === 0) {
    moves.push({r:lr, c, moveType:'move'});
  } else {
    const top = stack[stack.length-1];
    if (top.owner === owner) {
      if (stack.length < MAX_TIER && top.type !== '帅') moves.push({r:lr, c, moveType:'stack'});
    } else {
      if (stack.length <= tier) moves.push({r:lr, c, moveType: stack.length===1?'capture':'control'});
    }
  }
  return moves;
}

// 筒: forward diagonals, same jump rule as 砲
function movesTube(r, c, owner, tier, fwd) {
  const moves = [];
  const jumpCount = tier + 1;
  const landDist  = tier + 2;

  for (const dc of [-1, 1]) {
    let ok = true;
    for (let i = 1; i <= jumpCount; i++) {
      const ir = r + fwd*i, ic = c + dc*i;
      if (!inBounds(ir, ic) || board[ir][ic].length > tier) { ok = false; break; }
    }
    if (!ok) continue;

    const lr = r + fwd*landDist, lc = c + dc*landDist;
    if (!inBounds(lr, lc)) continue;

    const stack = board[lr][lc];
    if (stack.length === 0) {
      moves.push({r:lr, c:lc, moveType:'move'});
    } else {
      const top = stack[stack.length-1];
      if (top.owner === owner) {
        if (stack.length < MAX_TIER && top.type !== '帅') moves.push({r:lr, c:lc, moveType:'stack'});
      } else {
        if (stack.length <= tier) moves.push({r:lr, c:lc, moveType: stack.length===1?'capture':'control'});
      }
    }
  }
  return moves;
}

// 謀: 1-3 steps forward (sliding) OR 1-3 steps any diagonal (sliding)
function movesSpy(r, c, owner, tier, fwd) {
  const moves = [];
  slideDirSafe(moves, r, c, fwd, 0, owner, tier, 3);
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])
    slideDirSafe(moves, r, c, dr, dc, owner, tier, 3);
  return moves;
}

// === DEPLOY VALID CELLS ===
function getDeployValidCells(owner) {
  const cells = [];
  const rows = owner === 'w' ? [6,7,8] : [0,1,2];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) {
      const stack = board[r][c];
      if (stack.length === 0) {
        cells.push({r, c, moveType:'move'});
      } else if (stack.length < MAX_TIER) {
        const top = stack[stack.length-1];
        if (top.owner === owner && top.type !== '帅') {
          cells.push({r, c, moveType:'stack'});
        }
      }
    }
  }
  return cells;
}

// play-phase 新: valid cells for placing from hand
function getNewValidCells(owner) {
  const cells = [];
  // white can place in rows 3-8, black in rows 0-5
  const rMin = owner === 'w' ? 3 : 0;
  const rMax = owner === 'w' ? 8 : 5;
  for (let r = rMin; r <= rMax; r++) {
    for (let c = 0; c < COLS; c++) {
      const stack = board[r][c];
      if (stack.length === 0) {
        cells.push({r, c, moveType:'move'});
      } else if (stack.length < MAX_TIER) {
        const top = stack[stack.length-1];
        if (top.owner === owner && top.type !== '帅') {
          cells.push({r, c, moveType:'stack'});
        }
      }
    }
  }
  return cells;
}

// === WIN CHECK ===
function findKing(owner) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      for (const p of board[r][c])
        if (p.type === '帅' && p.owner === owner) return {r, c};
  return null;
}

function checkWin() {
  if (!findKing('w')) { gameOver = true; setMessage('黑方勝！(Black wins!)'); return true; }
  if (!findKing('b')) { gameOver = true; setMessage('白方勝！(White wins!)'); return true; }
  return false;
}

// === CORE GAME LOGIC ===
function executeMove(fromR, fromC, toR, toC, moveType) {
  const piece = board[fromR][fromC].pop();
  if (moveType === 'capture') {
    board[toR][toC] = [piece];
  } else {
    // 'move', 'stack', 'control'
    board[toR][toC].push(piece);
  }
}

function deployPiece(owner, type, r, c) {
  board[r][c].push({type, owner});
  const hand = owner === 'w' ? whiteHand : blackHand;
  if (hand[type] !== undefined) {
    hand[type]--;
    if (hand[type] <= 0) delete hand[type];
  }
}

// === HAND DISPLAY ===
function getHandSlots(owner) {
  const hand = owner === 'w' ? whiteHand : blackHand;
  const types = Object.keys(hand).filter(t => hand[t] > 0);
  if (types.length === 0) return [];
  const spacing = 46;
  const totalW = (types.length - 1) * spacing;
  const startX = CANVAS_W / 2 - totalW / 2;
  return types.map((t, i) => ({
    type: t,
    count: hand[t],
    x: startX + i * spacing,
    y: HAND_Y
  }));
}

// === AI ===
function getAllMovesForOwner(owner) {
  const all = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const top = getTop(r, c);
      if (top && top.owner === owner) {
        for (const m of getMoves(r, c))
          all.push({fromR:r, fromC:c, toR:m.r, toC:m.c, moveType:m.moveType});
      }
    }
  return all;
}

// 雙方通用評分（白方朝 row0 前進，黑方朝 row8 前進）
function scoreMoveForOwner(move, owner) {
  const {toR, toC} = move;
  const enemy = owner === 'w' ? 'b' : 'w';
  const stack = board[toR][toC];
  if (stack.length > 0 && stack[stack.length-1].owner === enemy) {
    const t = stack[stack.length-1].type;
    if (t === '帅') return 100000;
    return (PIECE_VALUE[t] || 1) * 10;
  }
  const fwd  = owner === 'w' ? (8 - toR) : toR;
  const ctr  = (4 - Math.abs(toC - 4)) * 0.3;
  return fwd * 0.5 + ctr + Math.random() * 0.4;
}
// 向下相容舊呼叫
function scoreMove(move) { return scoreMoveForOwner(move, 'b'); }

function aiMove() {
  if (gameOver) return;
  const moves = getAllMovesForOwner('b');

  // Also consider placing from hand (新)
  const bHandTotal = totalHand('b');
  if (moves.length === 0 && bHandTotal === 0) {
    setMessage('黑方無子可動！白方勝！');
    gameOver = true;
    render();
    return;
  }

  let best = null, bestScore = -Infinity;

  for (const m of moves) {
    const s = scoreMove(m);
    // Massive bonus for capturing 帅
    const stack = board[m.toR][m.toC];
    if (stack.length && stack[stack.length-1].type === '帅' && stack[stack.length-1].owner === 'w') {
      best = m; break; // immediate win
    }
    if (s > bestScore) { bestScore = s; best = m; }
  }

  if (!best) {
    // Try hand placement
    if (bHandTotal > 0) {
      const newCells = getNewValidCells('b');
      if (newCells.length > 0) {
        const types = Object.keys(blackHand).filter(t => blackHand[t] > 0);
        const chosenType = types[Math.floor(Math.random() * types.length)];
        // Place near middle rows
        newCells.sort((a,b) => Math.abs(a.r-4)-Math.abs(b.r-4));
        const cell = newCells[0];
        deployPiece('b', chosenType, cell.r, cell.c);
        currentTurn = 'w';
        aiThinking = false;
        setMessage('你的回合 (White\'s turn)');
        render();
        return;
      }
    }
    setMessage('黑方無子可動！白方勝！');
    gameOver = true;
    render();
    return;
  }

  executeMove(best.fromR, best.fromC, best.toR, best.toC, best.moveType);
  if (checkWin()) { render(); return; }

  currentTurn = 'w';
  aiThinking = false;
  setMessage('你的回合 (White\'s turn)');
  render();
}

// === AUTO-BATTLE LOGIC ===
function pickBestMove(owner) {
  const moves = getAllMovesForOwner(owner);
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMoveForOwner(m, owner);
    if (s >= 100000) return m; // 直接吃帅，立即返回
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

function startAutoBattle() {
  if (autoBattle) { stopAutoBattle(); return; }

  // 若還在部署階段，先自動部署雙方
  if (phase === 'deploy') {
    if (!whiteDone) autoDeploy();
    if (!blackDone) { blackDone = true; } // aiDeploy 已在 setupGame 呼叫
    if (!whiteDone) whiteDone = true;
    if (phase === 'deploy') startPlayPhase();
  }

  if (gameOver) return;
  autoBattle = true;
  updateButtons();
  abSchedule(AB_MOVE_MS);
}

function stopAutoBattle() {
  autoBattle = false;
  if (abTimer) { clearTimeout(abTimer); abTimer = null; }
  selectedCell = null;
  validMoves = [];
  updateButtons();
  render();
}

function abSchedule(ms) {
  if (!autoBattle || gameOver) return;
  abTimer = setTimeout(abStep, ms);
}

function abStep() {
  if (!autoBattle || gameOver) return;

  const owner = currentTurn;
  const best = pickBestMove(owner);

  if (!best) {
    // 嘗試從手牌出棋
    const hand = owner === 'w' ? whiteHand : blackHand;
    const handTotal = totalHand(owner);
    if (handTotal > 0) {
      const cells = getNewValidCells(owner);
      if (cells.length > 0) {
        const type = Object.keys(hand).find(t => hand[t] > 0);
        cells.sort((a,b) => Math.abs(a.c-4)-Math.abs(b.c-4));
        deployPiece(owner, type, cells[0].r, cells[0].c);
        currentTurn = owner === 'w' ? 'b' : 'w';
        render();
        abSchedule(AB_MOVE_MS);
        return;
      }
    }
    const loser = owner === 'w' ? '白' : '黑';
    const winner = owner === 'w' ? '黑' : '白';
    setMessage(`${loser}方無子可動！${winner}方勝！`);
    gameOver = true;
    autoBattle = false;
    updateButtons();
    render();
    return;
  }

  // 第一階段：亮出攻擊範圍
  selectedCell = {r: best.fromR, c: best.fromC};
  validMoves = getMoves(best.fromR, best.fromC);
  const top = getTop(best.fromR, best.fromC);
  const who = owner === 'w' ? '白' : '黑';
  setMessage(`${who} ${top ? top.type : ''} (${best.fromR+1},${best.fromC+1}) → (${best.toR+1},${best.toC+1})`);
  render();

  // 第二階段：延遲後執行移動
  abTimer = setTimeout(() => {
    if (!autoBattle || gameOver) return;
    executeMove(best.fromR, best.fromC, best.toR, best.toC, best.moveType);
    selectedCell = null;
    validMoves = [];
    if (checkWin()) { autoBattle = false; updateButtons(); render(); return; }
    currentTurn = owner === 'w' ? 'b' : 'w';
    render();
    abSchedule(AB_MOVE_MS);
  }, AB_SHOW_MS);
}

// === EVENT HANDLING ===
function cellFromXY(x, y) {
  const c = Math.floor((x - BOARD_X) / CELL);
  const r = Math.floor((y - BOARD_Y) / CELL);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return {r, c};
  return null;
}

function handSlotFromXY(x, y, owner) {
  const slots = getHandSlots(owner);
  for (const s of slots) {
    const dx = x - s.x, dy = y - s.y;
    if (dx*dx + dy*dy <= (HAND_RADIUS+4)*(HAND_RADIUS+4)) return s;
  }
  return null;
}

canvas.addEventListener('click', function(e) {
  if (gameOver || aiThinking || autoBattle) return;
  if (currentTurn !== 'w') return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  const y = (e.clientY - rect.top)  * (CANVAS_H / rect.height);

  if (phase === 'deploy') {
    handleDeployClick(x, y);
  } else {
    handlePlayClick(x, y);
  }
});

function handleDeployClick(x, y) {
  if (whiteDone) return;

  // Check hand area (below board)
  const boardBottom = BOARD_Y + ROWS * CELL;
  if (y > boardBottom + 5) {
    const slot = handSlotFromXY(x, y, 'w');
    if (slot) {
      if (!findKing('w') && slot.type !== '帅') {
        setMessage('必須先放置 帅！');
        return;
      }
      handSelectedType = slot.type;
      validMoves = getDeployValidCells('w');
      setMessage(`已選 ${slot.type}，點選綠色格放置`);
      render();
      return;
    }
  }

  // Check board click
  const cell = cellFromXY(x, y);
  if (!cell) {
    if (handSelectedType) { handSelectedType = null; validMoves = []; render(); }
    return;
  }

  if (handSelectedType) {
    const valid = validMoves.find(m => m.r === cell.r && m.c === cell.c);
    if (valid) {
      deployPiece('w', handSelectedType, cell.r, cell.c);
      handSelectedType = null;
      validMoves = [];
      const rem = totalHand('w');
      setMessage(rem > 0
        ? `已放置。剩餘 ${rem} 枚手牌，繼續或按「結束部署」`
        : '手牌已空，可按「結束部署」');
    } else {
      setMessage('此格無法放置，請選綠色格');
    }
    render();
  }
}

function handlePlayClick(x, y) {
  const boardBottom = BOARD_Y + ROWS * CELL;

  // If in new-mode, check hand area first
  if (newMode && y > boardBottom + 5) {
    const slot = handSlotFromXY(x, y, 'w');
    if (slot) {
      handSelectedType = slot.type;
      validMoves = getNewValidCells('w');
      setMessage(`已選 ${slot.type}，點選綠色格（前6行）放置`);
      render();
      return;
    }
  }

  const cell = cellFromXY(x, y);
  if (!cell) {
    // Click outside board — cancel selection
    selectedCell = null;
    validMoves = [];
    if (newMode) { handSelectedType = null; }
    render();
    return;
  }

  // new-mode: place hand piece
  if (newMode && handSelectedType) {
    const valid = validMoves.find(m => m.r === cell.r && m.c === cell.c);
    if (valid) {
      deployPiece('w', handSelectedType, cell.r, cell.c);
      handSelectedType = null;
      validMoves = [];
      newMode = false;
      if (checkWin()) { render(); return; }
      currentTurn = 'b';
      setMessage('AI 思考中...');
      updateButtons();
      render();
      aiThinking = true;
      setTimeout(aiMove, 500);
      return;
    } else {
      setMessage('此格無法放置');
      render();
      return;
    }
  }

  // Normal play: move selected piece
  if (selectedCell) {
    const valid = validMoves.find(m => m.r === cell.r && m.c === cell.c);
    if (valid) {
      executeMove(selectedCell.r, selectedCell.c, cell.r, cell.c, valid.moveType);
      selectedCell = null;
      validMoves = [];
      if (checkWin()) { render(); return; }
      currentTurn = 'b';
      setMessage('AI 思考中...');
      updateButtons();
      render();
      aiThinking = true;
      setTimeout(aiMove, 500);
      return;
    }
  }

  // Select own piece
  const top = getTop(cell.r, cell.c);
  if (top && top.owner === 'w') {
    selectedCell = cell;
    validMoves = getMoves(cell.r, cell.c);
    setMessage(`選中 ${top.type}（第${getTier(cell.r,cell.c)}層）， ${validMoves.length} 個合法移動`);
  } else {
    selectedCell = null;
    validMoves = [];
    setMessage(top ? '不可選敵方棋子' : '此格無棋子');
  }
  render();
}

// === BUTTONS ===
btnDone.addEventListener('click', () => {
  if (phase !== 'deploy' || whiteDone) return;
  if (!findKing('w')) { setMessage('必須先放置 帅！'); return; }
  whiteDone = true;
  handSelectedType = null;
  validMoves = [];
  if (blackDone) {
    startPlayPhase();
  } else {
    setMessage('等待黑方部署完成...');
  }
  updateButtons();
  render();
});

// === AUTO-DEPLOY (白方一鍵自動佈陣) ===
function autoDeploy() {
  if (phase !== 'deploy') { setMessage('自動部署：非部署階段'); return; }
  if (whiteDone) { setMessage('白方已完成部署'); return; }

  setMessage('自動部署中…');

  const formation = [
    {r:8,c:0,t:'砲'},{r:8,c:1,t:'馬'},{r:8,c:2,t:'謀'},{r:8,c:3,t:'大'},
    {r:8,c:4,t:'帅'},{r:8,c:5,t:'中'},{r:8,c:6,t:'馬'},{r:8,c:7,t:'筒'},{r:8,c:8,t:'弓'},
    {r:7,c:0,t:'小'},{r:7,c:1,t:'侍'},{r:7,c:2,t:'忍'},{r:7,c:3,t:'砦'},
    {r:7,c:4,t:'槍'},{r:7,c:5,t:'砦'},{r:7,c:6,t:'忍'},{r:7,c:7,t:'侍'},{r:7,c:8,t:'小'},
    {r:6,c:1,t:'兵'},{r:6,c:2,t:'兵'},{r:6,c:3,t:'兵'},{r:6,c:4,t:'兵'},
    {r:6,c:5,t:'兵'},{r:6,c:6,t:'兵'},{r:6,c:7,t:'兵'},
  ];

  for (const {r,c,t} of formation) {
    if (whiteHand[t] && whiteHand[t] > 0 && board[r][c].length === 0) {
      deployPiece('w', t, r, c);
    }
  }

  // 防呆：若手牌還有剩餘，塞到剩餘空格
  for (const t of Object.keys(whiteHand)) {
    while (whiteHand[t] > 0) {
      const cells = getDeployValidCells('w').filter(m => m.moveType === 'move');
      if (!cells.length) break;
      deployPiece('w', t, cells[0].r, cells[0].c);
    }
  }

  whiteDone = true;
  handSelectedType = null;
  validMoves = [];
  updateButtons();
  if (blackDone) {
    startPlayPhase();
  } else {
    setMessage('自動部署完成！等待黑方…');
  }
  render();
}

btnAuto.addEventListener('click', autoDeploy);
btnBattle.addEventListener('click', startAutoBattle);

btnNew.addEventListener('click', () => {
  if (phase !== 'play' || currentTurn !== 'w' || aiThinking || gameOver) return;
  if (totalHand('w') === 0) { setMessage('手牌已空'); return; }
  newMode = true;
  selectedCell = null;
  validMoves = [];
  handSelectedType = null;
  setMessage('新：點選下方手牌選棋，再點綠色格（前6行）放置');
  updateButtons();
  render();
});

btnRestart.addEventListener('click', setupGame);

function startPlayPhase() {
  phase = 'play';
  currentTurn = 'w';
  newMode = false;
  setMessage('對局開始！白方先手 — 點選自己的棋子移動');
  updateButtons();
}

function updateButtons() {
  const inDeploy = phase === 'deploy';
  btnDone.style.display = inDeploy ? '' : 'none';
  btnAuto.style.display = inDeploy ? '' : 'none';
  btnNew.style.display  = phase === 'play' && !autoBattle ? '' : 'none';
  if (inDeploy) {
    btnDone.disabled = whiteDone;
    btnAuto.disabled = whiteDone;
  }
  if (phase === 'play') {
    btnNew.disabled = (currentTurn !== 'w' || aiThinking || gameOver || totalHand('w') === 0);
  }
  // 自動對戰按鈕：部署/對局階段皆可用
  btnBattle.textContent = autoBattle ? '⏸ 暫停對戰' : '⚔ 自動對戰';
  btnBattle.disabled = gameOver;
  btnBattle.style.background = autoBattle ? '#4a1a2a' : '';
  btnBattle.style.borderColor = autoBattle ? '#c84' : '';
}

function setMessage(msg) {
  message = msg;
  if (msgEl) msgEl.textContent = msg;
}

// === RENDERING ===
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBoard();
  drawValidMoves();
  drawPieces();
  drawHand();
  drawUI();
}

function drawBoard() {
  // Canvas background
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Board background
  ctx.fillStyle = '#4a2c0a';
  ctx.fillRect(BOARD_X, BOARD_Y, CELL*COLS, CELL*ROWS);

  // Alternating cells
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r+c)%2===0 ? '#5a3510' : '#4a2c0a';
      ctx.fillRect(BOARD_X + c*CELL, BOARD_Y + r*CELL, CELL, CELL);
    }

  // Grid lines
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 0.7;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X + i*CELL, BOARD_Y);
    ctx.lineTo(BOARD_X + i*CELL, BOARD_Y + ROWS*CELL);
    ctx.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y + j*CELL);
    ctx.lineTo(BOARD_X + COLS*CELL, BOARD_Y + j*CELL);
    ctx.stroke();
  }

  // Column labels A–I
  ctx.fillStyle = '#c8a96e';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let c = 0; c < COLS; c++) {
    const lbl = String.fromCharCode(65+c);
    ctx.fillText(lbl, BOARD_X + c*CELL + CELL/2, BOARD_Y - 6);
    ctx.fillText(lbl, BOARD_X + c*CELL + CELL/2, BOARD_Y + ROWS*CELL + 16);
  }

  // Row labels 1–9
  ctx.textAlign = 'right';
  for (let r = 0; r < ROWS; r++) {
    ctx.fillText(String(r+1), BOARD_X - 6, BOARD_Y + r*CELL + CELL/2 + 4);
  }

  // Deploy zone highlight
  if (phase === 'deploy') {
    ctx.strokeStyle = 'rgba(200,160,60,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X+1, BOARD_Y+1, COLS*CELL-2, 3*CELL-2); // black zone
    ctx.strokeStyle = 'rgba(100,180,255,0.4)';
    ctx.strokeRect(BOARD_X+1, BOARD_Y+6*CELL+1, COLS*CELL-2, 3*CELL-2); // white zone
  }
}

function drawValidMoves() {
  for (const m of validMoves) {
    const x = BOARD_X + m.c*CELL, y = BOARD_Y + m.r*CELL;
    if      (m.moveType === 'capture') ctx.fillStyle = 'rgba(220,50,50,0.45)';
    else if (m.moveType === 'control') ctx.fillStyle = 'rgba(200,100,0,0.45)';
    else if (m.moveType === 'stack')   ctx.fillStyle = 'rgba(0,100,220,0.45)';
    else                               ctx.fillStyle = 'rgba(0,180,70,0.4)';
    ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
  }
}

function drawOnePiece(x, y, piece, stackSize, isTop, isSelected) {
  const isWhite = piece.owner === 'w';
  const R = 24;
  ctx.save();
  ctx.translate(x, y);

  if (isSelected) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 14;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI*2);
  ctx.fillStyle = isWhite
    ? (isSelected ? '#fffde0' : '#f5f0e0')
    : (isSelected ? '#555'   : '#1a1a1a');
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = isSelected ? '#FFD700' : (isWhite ? '#8B6914' : '#c8a96e');
  ctx.lineWidth   = isSelected ? 3 : 1.5;
  ctx.stroke();

  // Tier-2 indicator dot
  if (stackSize === 2 && isTop) {
    ctx.fillStyle = isWhite ? '#8B6914' : '#c8a96e';
    ctx.beginPath();
    ctx.arc(R-7, -R+7, 4, 0, Math.PI*2);
    ctx.fill();
  }

  // Piece character
  ctx.fillStyle = isWhite ? '#1a0f0a' : '#f0e8d0';
  ctx.font = 'bold 17px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(piece.type, 0, 1);

  ctx.restore();
}

function drawPieces() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const stack = board[r][c];
      if (!stack.length) continue;
      const cx = BOARD_X + c*CELL + CELL/2;
      const cy = BOARD_Y + r*CELL + CELL/2;
      const isSel = selectedCell && selectedCell.r===r && selectedCell.c===c;

      if (stack.length === 1) {
        drawOnePiece(cx, cy, stack[0], 1, true, isSel);
      } else {
        drawOnePiece(cx+4, cy+4, stack[0], 2, false, false);
        drawOnePiece(cx-3, cy-3, stack[1], 2, true,  isSel);
      }
    }
  }
}

function drawHand() {
  // Always show white hand (deploy) or in new-mode (play)
  const showHand = (phase === 'deploy' && !whiteDone) || (phase === 'play' && newMode);
  if (!showHand) return;

  const slots = getHandSlots('w');
  const labelY = HAND_Y - 26;

  ctx.fillStyle = '#c8a96e';
  ctx.font = '13px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (slots.length === 0) {
    ctx.fillText('手牌已空', CANVAS_W/2, labelY);
    return;
  }

  ctx.fillText(phase === 'deploy' ? '手牌（點選放置）' : '手牌（新-點選放置）', CANVAS_W/2, labelY);

  for (const s of slots) {
    const isSel = handSelectedType === s.type;

    ctx.save();
    if (isSel) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, HAND_RADIUS, 0, Math.PI*2);
    ctx.fillStyle = isSel ? '#fffde0' : '#f5f0e0';
    ctx.fill();
    ctx.strokeStyle = isSel ? '#FFD700' : '#8B6914';
    ctx.lineWidth   = isSel ? 2.5 : 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#1a0f0a';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.type, s.x, s.y);

    if (s.count > 1) {
      ctx.beginPath();
      ctx.arc(s.x + HAND_RADIUS - 4, s.y - HAND_RADIUS + 4, 7, 0, Math.PI*2);
      ctx.fillStyle = '#c8302a';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.count), s.x + HAND_RADIUS - 4, s.y - HAND_RADIUS + 4);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

function drawUI() {
  const turnText  = currentTurn === 'w' ? '白方（你）' : '黑方（AI）';
  const phaseText = phase === 'deploy' ? '部署' : '對局';

  ctx.fillStyle = '#c8a96e';
  ctx.font = '13px serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${phaseText} | 輪次：${turnText}`, 8, 18);

  if (phase === 'play') {
    const wH = totalHand('w'), bH = totalHand('b');
    ctx.textAlign = 'right';
    ctx.fillText(`手牌：白${wH} 黑${bH}`, CANVAS_W - 8, 18);
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, CANVAS_H/2 - 65, CANVAS_W, 130);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 30px serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, CANVAS_W/2, CANVAS_H/2 + 5);
    ctx.fillStyle = '#c8a96e';
    ctx.font = '17px serif';
    ctx.fillText('按「重新開始」再玩一局', CANVAS_W/2, CANVAS_H/2 + 42);
  } else if (aiThinking) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(BOARD_X, CANVAS_H/2-25, COLS*CELL, 50);
    ctx.fillStyle = '#c8a96e';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI 思考中…', BOARD_X + COLS*CELL/2, CANVAS_H/2 + 7);
  }

  ctx.textBaseline = 'alphabetic';
}

// === START ===
setupGame();
