// ============================================================
// Truchet v4 格點變形 — Generative Art (p5.js + fxhash)
// 承接 v1(扁平曲線)、v2(圓管套色)、v3(墨壓彩)，v4 的差異化主軸：
//   ① 格點變形：在維持邊中點對接的前提下，用漩渦／波浪／鼓脹／擠壓
//      把方形晶格擰彎，四分弧改成二次貝茲，仍是連續 Truchet 迴路
//   ② 迴路著色：沿著邊中點圖走完整條 path，同一迴路同一色
//      （v1 是每格各自上色），閉合迴路與邊界開路分開處理
//   ③ 兩種風貌：night 流光（暗底霓虹管 + 沿路徑流動的光點）
//                paper 紙上墨（亮底描邊 + 迴路色帶）
// 點畫面重生、S 鍵存圖
// ============================================================

const rr = (a, b) => a + fxrand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = a => a[Math.floor(fxrand() * a.length)];
const chance = p => fxrand() < p;
const TAU = Math.PI * 2;

const PALETTES = [
  // ── night 流光 ──
  { name: '普普夜', look: 'night', bg: '#0c0c12', cols: ['#FFE800', '#FF48B0', '#3aa6e0', '#A4DC30'] },
  { name: '螢光黑', look: 'night', bg: '#110e16', cols: ['#FF48B0', '#FFE800', '#A4DC30', '#5ec8e5'] },
  { name: '蒸氣波', look: 'night', bg: '#160a2c', cols: ['#FF48B0', '#5ec8e5', '#FF6E40', '#A4DC30'] },
  { name: '賽博', look: 'night', bg: '#050612', cols: ['#FF2A6D', '#05D9E8', '#7B61FF', '#D1F7FF'] },
  { name: '銀河', look: 'night', bg: '#0b1020', cols: ['#667EEA', '#F093FB', '#4FACFE', '#F5576C'] },
  { name: '龍珠夜', look: 'night', bg: '#120808', cols: ['#FF9500', '#FA0011', '#FFCB05', '#3D7DCA'] },
  { name: '鼠尾草夜', look: 'night', bg: '#141612', cols: ['#b7c9c7', '#8fa3a0', '#d9d2bf', '#5b6b6a'] },
  { name: '赤陶夜', look: 'night', bg: '#16110e', cols: ['#c36f4e', '#d9c2a3', '#7a7c4e', '#e8d5b7'] },
  { name: '金黑', look: 'night', bg: '#0c0b09', cols: ['#FFD700', '#E6BE8A', '#DAA520', '#F4C430'] },
  { name: '極光', look: 'night', bg: '#07141c', cols: ['#88D9E6', '#5AA9E6', '#A8E6CF', '#F6CD61'] },
  // ── paper 紙上墨 ──
  { name: '包豪斯', look: 'paper', bg: '#f4efda', cols: ['#BE1E2D', '#21409A', '#FFDE17', '#00A878', '#E85D04'] },
  { name: '蒙德里安', look: 'paper', bg: '#f7f3e6', cols: ['#D40920', '#1356A2', '#F7D842', '#1A1A1A'] },
  { name: '三色riso', look: 'paper', bg: '#f6f2df', cols: ['#FFE100', '#7ec8ec', '#1c5fc0'] },
  { name: '普普紙', look: 'paper', bg: '#f3efe4', cols: ['#FF6E40', '#FFE800', '#0078BF', '#FF48B0'] },
  { name: '森綠橘', look: 'paper', bg: '#f4f1e8', cols: ['#3D8E84', '#A4DC30', '#FF6E40', '#FFE800'] },
  { name: '學院海軍', look: 'paper', bg: '#efece3', cols: ['#25324a', '#3D5588', '#6F8DCE', '#FF6E40'] },
  { name: '赤陶紙', look: 'paper', bg: '#f5f1e8', cols: ['#c36f4e', '#7a7c4e', '#d9c2a3', '#3a3a38'] },
  { name: '青花', look: 'paper', bg: '#f0ece0', cols: ['#1f3f8f', '#2f6fb0', '#7ec8ec', '#c9a24a'] },
  { name: '馬諦斯', look: 'paper', bg: '#f6f1ea', cols: ['#E63946', '#F4A261', '#2A9D8F', '#264653', '#E9C46A'] },
  { name: '櫻', look: 'paper', bg: '#f7eef2', cols: ['#FF69B4', '#C71585', '#DB7093', '#FFB7C5', '#3A3A3A'] },
];

const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

let CFG, GRID, PATHS, LAYER, previewed = false;

function canvasSize() { return Math.min(windowWidth, windowHeight); }

function setup() {
  const S = canvasSize();
  createCanvas(S, S);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  angleMode(RADIANS);
  strokeCap(ROUND); strokeJoin(ROUND);
  generate();
  loop();
}

function windowResized() {
  const S = canvasSize();
  resizeCanvas(S, S);
  rebuild();
}

function mousePressed() { generate(); }
function keyPressed() {
  if (key === 's' || key === 'S') {
    save('truchet-v4-' + (fxhash ? fxhash.slice(2, 10) : 'art') + '.png');
  }
}

function generate() {
  const P = pick(PALETTES);
  const N = pick([6, 7, 8, 8, 9, 9, 10, 11, 12]);
  const sym = pick(['none', 'none', 'mirror', 'mirror', 'quad']);
  const warpKind = pick(['swirl', 'swirl', 'wave', 'wave', 'bulge', 'pinch', 'none']);
  CFG = {
    P, N, sym, warpKind,
    lwRatio: P.look === 'night' ? rr(0.20, 0.30) : rr(0.16, 0.26),
    warpAmp: warpKind === 'none' ? 0 : rr(0.45, 1.05),
    warpFall: rr(0.42, 0.78),
    warpFreq: rr(0.008, 0.018),
    warpPhase: rr(0, TAU),
    grain: P.look === 'paper' && chance(0.7),
    nodes: chance(0.55),
    beadCount: P.look === 'night' ? ri(2, 4) : ri(1, 2),
    beadSpeed: rr(0.018, 0.042),
    streamSeed: Math.floor(fxrand() * 1e9),
  };
  GRID = makeGrid(N, sym);
  window.$fxhashFeatures = {
    '色盤': P.name,
    '風格': P.look === 'night' ? '流光' : '紙上墨',
    '格數': N,
    '變形': { swirl: '漩渦', wave: '波浪', bulge: '鼓脹', pinch: '擠壓', none: '無' }[warpKind],
    '對稱': { none: '無', mirror: '左右', quad: '四象' }[sym],
  };
  rebuild();
  if (!previewed && window.fxpreview) {
    previewed = true;
    try { fxpreview(); } catch (e) {}
  }
}

function makeGrid(N, sym) {
  const grid = Array.from({ length: N }, () => new Array(N).fill(0));
  const roll = () => {
    const t = fxrand();
    return t < 0.84 ? (chance(0.5) ? 0 : 1) : (t < 0.92 ? 2 : 3);
  };
  const mirH = t => (t === 0 ? 1 : t === 1 ? 0 : t);
  if (sym === 'none') {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = roll();
  } else if (sym === 'mirror') {
    for (let r = 0; r < N; r++) for (let c = 0; c < Math.ceil(N / 2); c++) {
      const t = roll(); grid[r][c] = t; grid[r][N - 1 - c] = mirH(t);
    }
  } else {
    for (let r = 0; r < Math.ceil(N / 2); r++) for (let c = 0; c < Math.ceil(N / 2); c++) {
      const t = roll();
      grid[r][c] = t; grid[r][N - 1 - c] = mirH(t);
      grid[N - 1 - r][c] = t; grid[N - 1 - r][N - 1 - c] = mirH(t);
    }
  }
  return grid;
}

// ── 變形場：先位移，再把結果縮放進畫面邊距 ──
function rawWarp(x, y, S, C) {
  const cx = S / 2, cy = S / 2;
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);
  const kind = C.warpKind;
  if (kind === 'none' || C.warpAmp === 0) return { x, y };
  if (kind === 'swirl') {
    const t = C.warpAmp * 1.15 * Math.exp(-d / (S * C.warpFall));
    const c = Math.cos(t), s = Math.sin(t);
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }
  if (kind === 'bulge') {
    const k = 1 + C.warpAmp * 0.38 * Math.exp(-(d * d) / (S * S * C.warpFall * C.warpFall));
    return { x: cx + dx * k, y: cy + dy * k };
  }
  if (kind === 'pinch') {
    const k = 1 - C.warpAmp * 0.32 * Math.exp(-(d * d) / (S * S * C.warpFall * C.warpFall));
    return { x: cx + dx * k, y: cy + dy * k };
  }
  // wave
  const a = C.warpAmp * S * 0.034;
  return {
    x: x + a * Math.sin(y * C.warpFreq * S * 0.012 + C.warpPhase),
    y: y + a * Math.sin(x * C.warpFreq * S * 0.012 + C.warpPhase * 1.7),
  };
}

function makeMapper(S, N, margin, C) {
  const gap = (S - 2 * margin) / N;
  const pts = [];
  for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
    pts.push(rawWarp(margin + c * gap, margin + r * gap, S, C));
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  const pad = margin * 0.92;
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const sc = Math.min((S - 2 * pad) / bw, (S - 2 * pad) / bh);
  const ox = (S - bw * sc) / 2 - minX * sc;
  const oy = (S - bh * sc) / 2 - minY * sc;
  return (x, y) => {
    const p = rawWarp(x, y, S, C);
    return { x: p.x * sc + ox, y: p.y * sc + oy };
  };
}

function qbez(a, c, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function makeRng(seed) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 13), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 4294967296;
  };
}

function rebuild() {
  const S = width, C = CFG, N = C.N;
  const rnd = makeRng(C.streamSeed);
  const rrn = (a, b) => a + rnd() * (b - a);
  const ch = p => rnd() < p;
  const margin = S * 0.08;
  const gap = (S - 2 * margin) / N;
  const map = makeMapper(S, N, margin, C);
  const lw = gap * C.lwRatio;

  const mid = {
    h: (r, c) => map(margin + (c + 0.5) * gap, margin + r * gap),
    v: (r, c) => map(margin + c * gap, margin + (r + 0.5) * gap),
  };
  const corner = (r, c) => map(margin + c * gap, margin + r * gap);

  const segs = [];
  const adj = new Map();
  const add = (ka, kb, ctrl) => {
    const id = segs.length;
    segs.push({ id, ka, kb, ctrl });
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(id);
    adj.get(kb).push(id);
  };
  const HK = (r, c) => 'h:' + r + ':' + c;
  const VK = (r, c) => 'v:' + r + ':' + c;

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const t = GRID[r][c];
    const n = HK(r, c), s = HK(r + 1, c), w = VK(r, c), e = VK(r, c + 1);
    if (t === 0) {
      add(w, s, corner(r + 1, c));
      add(n, e, corner(r, c + 1));
    } else if (t === 1) {
      add(n, w, corner(r, c));
      add(e, s, corner(r + 1, c + 1));
    } else if (t === 2) {
      add(n, s, null);
    } else {
      add(w, e, null);
    }
  }

  const posOf = k => {
    const p = k.split(':');
    return p[0] === 'h' ? mid.h(+p[1], +p[2]) : mid.v(+p[1], +p[2]);
  };

  const used = new Set();
  const unusedAt = k => (adj.get(k) || []).filter(id => !used.has(id));
  const walk = (k0, sid0) => {
    const steps = [];
    let k = k0, sid = sid0;
    while (sid != null && !used.has(sid)) {
      used.add(sid);
      const sg = segs[sid];
      const k2 = sg.ka === k ? sg.kb : sg.ka;
      steps.push({ from: k, to: k2, ctrl: sg.ctrl });
      k = k2;
      const nxt = unusedAt(k);
      sid = nxt.length ? nxt[0] : null;
    }
    return { steps, closed: k === k0 && steps.length > 2 };
  };

  const rawPaths = [];
  const keys = [...adj.keys()];
  for (const k of keys) {
    if ((adj.get(k) || []).length !== 1) continue;
    const u = unusedAt(k);
    if (u.length) rawPaths.push(walk(k, u[0]));
  }
  for (const k of keys) {
    const u = unusedAt(k);
    if (u.length) rawPaths.push(walk(k, u[0]));
  }

  const STEPS = 18;
  PATHS = rawPaths.map((rp, i) => {
    const pts = [];
    for (const st of rp.steps) {
      const a = posOf(st.from), b = posOf(st.to);
      if (st.ctrl) {
        for (let s = 0; s < STEPS; s++) pts.push(qbez(a, st.ctrl, b, s / STEPS));
      } else {
        for (let s = 0; s < STEPS; s++) {
          const t = s / STEPS;
          pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
    }
    if (rp.closed && pts.length) pts.push({ x: pts[0].x, y: pts[0].y });
    else if (rp.steps.length) pts.push(posOf(rp.steps[rp.steps.length - 1].to));

    let len = 0;
    const acc = [0];
    for (let i2 = 1; i2 < pts.length; i2++) {
      len += Math.hypot(pts[i2].x - pts[i2 - 1].x, pts[i2].y - pts[i2 - 1].y);
      acc.push(len);
    }
    const col = C.P.cols[i % C.P.cols.length];
    const thick = lw * (rp.closed ? rrn(0.92, 1.12) : rrn(0.78, 0.98));
    const phase = rnd();
    return { pts, acc, len, col, thick, closed: rp.closed, phase };
  }).filter(p => p.pts.length > 2 && p.len > 2);

  if (LAYER) LAYER.remove();
  LAYER = createGraphics(S, S);
  LAYER.pixelDensity(pixelDensity());
  renderStatic(LAYER, S, C, N, margin, gap, map, lw, rnd, rrn, ch);

  CFG._lw = lw;
}

function renderStatic(g, S, C, N, margin, gap, map, lw, rnd, rrn, ch) {
  const P = C.P;
  const bg = hx(P.bg);
  g.background(bg[0], bg[1], bg[2]);
  g.strokeCap(ROUND); g.strokeJoin(ROUND);

  if (C.grain) {
    g.noStroke();
    const n = Math.floor(S * S * 0.012);
    for (let i = 0; i < n; i++) {
      const a = 10 + rnd() * 18;
      g.fill(0, 0, 0, a);
      g.circle(rnd() * S, rnd() * S, 1 + rnd() * 1.4);
    }
  }

  const night = P.look === 'night';
  for (const p of PATHS) {
    const col = hx(p.col);
    g.noFill();
    if (night) {
      g.stroke(col[0], col[1], col[2], 42);
      g.strokeWeight(p.thick * 2.4);
      drawPoly(g, p.pts);
    } else {
      const ink = bg[0] + bg[1] + bg[2] > 400 ? [22, 20, 18] : [240, 236, 220];
      g.stroke(ink[0], ink[1], ink[2], 220);
      g.strokeWeight(p.thick * 1.22);
      drawPoly(g, p.pts);
    }
    g.stroke(col[0], col[1], col[2], night ? 230 : 245);
    g.strokeWeight(p.thick);
    drawPoly(g, p.pts);
    if (night) {
      g.stroke(255, 255, 255, 55);
      g.strokeWeight(p.thick * 0.22);
      drawPoly(g, p.pts);
    }
  }

  if (C.nodes) {
    g.noStroke();
    const V = N + 1;
    for (let r = 0; r < V; r++) for (let c = 0; c < V; c++) {
      if (!ch(0.18)) continue;
      const p = map(margin + c * gap, margin + r * gap);
      const R = lw * rrn(0.28, 0.48);
      if (night) {
        const col = hx(P.cols[Math.floor(rnd() * P.cols.length)]);
        g.fill(col[0], col[1], col[2], 230);
        g.circle(p.x, p.y, R * 2);
        g.fill(bg[0], bg[1], bg[2], 240);
        g.circle(p.x, p.y, R * 0.7);
      } else {
        g.fill(30, 28, 24, 230);
        g.circle(p.x, p.y, R * 2);
        g.fill(bg[0], bg[1], bg[2]);
        g.circle(p.x, p.y, R * 0.85);
      }
    }
  }
}

function drawPoly(g, pts) {
  g.beginShape();
  for (const p of pts) g.vertex(p.x, p.y);
  g.endShape();
}

function pointAt(path, d) {
  if (path.len <= 0) return path.pts[0];
  let dist = ((d % path.len) + path.len) % path.len;
  const acc = path.acc;
  let lo = 0, hi = acc.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (acc[mid] < dist) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, lo);
  const d0 = acc[i - 1], d1 = acc[i];
  const t = d1 === d0 ? 0 : (dist - d0) / (d1 - d0);
  const a = path.pts[i - 1], b = path.pts[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function draw() {
  if (LAYER) image(LAYER, 0, 0);
  if (!PATHS || !CFG) return;
  const night = CFG.P.look === 'night';
  const t = millis() * 0.001;
  noStroke();
  for (const p of PATHS) {
    const n = CFG.beadCount + (p.closed ? 1 : 0);
    const col = hx(p.col);
    for (let i = 0; i < n; i++) {
      const d = (p.phase + t * CFG.beadSpeed * p.len + i / n) * p.len;
      const q = pointAt(p, d);
      const R = p.thick * (night ? 0.42 : 0.28);
      if (night) {
        fill(col[0], col[1], col[2], 50);
        circle(q.x, q.y, R * 4.2);
        fill(255, 255, 255, 230);
        circle(q.x, q.y, R * 1.15);
      } else {
        fill(col[0], col[1], col[2], 220);
        circle(q.x, q.y, R * 1.6);
      }
    }
  }
}
