// ============================================
// Google Trends Word Cloud
// ============================================

let words = [];
let placed = [];
let currentRegion = "all";
let canvas, ctx;
let hoveredWord = null;

const COLORS = [
  "#4285F4", "#EA4335", "#FBBC05", "#34A853", // Google colors
  "#FF6D01", "#46BDC6", "#7BAAF7", "#F07B72",
  "#FCD04F", "#57BB8A", "#AC8AF8", "#FF8BCB",
  "#36C5F0", "#E01E5A", "#ECB22E", "#2EB67D",
];

async function init() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", () => { resizeCanvas(); layoutWords(); });

  await loadData();
  setupRegionButtons();
  setupTooltip();
  layoutWords();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

async function loadData() {
  try {
    const resp = await fetch("trends.json?t=" + Date.now());
    const data = await resp.json();
    words = data.words || [];
    const info = document.getElementById("info");
    if (data.updated) {
      info.textContent = "Updated: " + data.updated;
    }
  } catch (e) {
    words = [];
    document.getElementById("info").textContent = "Failed to load data";
  }
}

function setupRegionButtons() {
  document.querySelectorAll(".region-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".region-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRegion = btn.dataset.region;
      layoutWords();
    });
  });
}

function getFilteredWords() {
  let filtered = currentRegion === "all"
    ? words
    : words.filter(w => w.region === currentRegion);

  // Deduplicate by text (keep highest weight)
  const map = new Map();
  filtered.forEach(w => {
    const key = w.text.toLowerCase();
    if (!map.has(key) || map.get(key).weight < w.weight) {
      map.set(key, w);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
}

function layoutWords() {
  placed = [];
  const filtered = getFilteredWords();
  if (filtered.length === 0) { render(); return; }

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  // Size range based on weights
  const maxWeight = filtered[0].weight;
  const minWeight = filtered[filtered.length - 1].weight;
  const minFont = Math.max(14, W * 0.015);
  const maxFont = Math.max(36, W * 0.06);

  filtered.forEach((word, i) => {
    const t = maxWeight === minWeight ? 0.5 : (word.weight - minWeight) / (maxWeight - minWeight);
    const fontSize = minFont + t * (maxFont - minFont);
    const color = COLORS[i % COLORS.length];

    ctx.font = `bold ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
    const metrics = ctx.measureText(word.text);
    const textW = metrics.width + 10;
    const textH = fontSize * 1.3;

    // Spiral placement
    let px, py;
    let found = false;

    for (let r = 0; r < Math.max(W, H) * 0.7; r += 2) {
      for (let a = 0; a < TWO_PI; a += 0.3) {
        px = cx + r * Math.cos(a) - textW / 2;
        py = cy + r * Math.sin(a) - textH / 2;

        // Check bounds
        if (px < 5 || py < 40 || px + textW > W - 5 || py + textH > H - 50) continue;

        // Check overlap
        if (!overlaps(px, py, textW, textH)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      placed.push({
        text: word.text,
        region: word.region,
        x: px,
        y: py,
        w: textW,
        h: textH,
        fontSize,
        color,
      });
    }
  });

  render();
}

const TWO_PI = Math.PI * 2;
const PAD = 4;

function overlaps(x, y, w, h) {
  for (const p of placed) {
    if (x < p.x + p.w + PAD && x + w + PAD > p.x &&
        y < p.y + p.h + PAD && y + h + PAD > p.y) {
      return true;
    }
  }
  return false;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  placed.forEach(p => {
    ctx.font = `bold ${p.fontSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = hoveredWord === p ? "#fff" : p.color;
    ctx.globalAlpha = hoveredWord && hoveredWord !== p ? 0.3 : 1;
    ctx.fillText(p.text, p.x + 5, p.y + p.fontSize);
  });

  ctx.globalAlpha = 1;
}

// --- Tooltip ---
function setupTooltip() {
  const tooltip = document.getElementById("tooltip");

  canvas.addEventListener("mousemove", (e) => {
    const mx = e.clientX;
    const my = e.clientY;
    let found = null;

    for (const p of placed) {
      if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) {
        found = p;
        break;
      }
    }

    if (found) {
      hoveredWord = found;
      tooltip.style.display = "block";
      tooltip.style.left = (mx + 12) + "px";
      tooltip.style.top = (my - 30) + "px";
      tooltip.textContent = `${found.text}  [${found.region}]`;
      canvas.style.cursor = "pointer";
    } else {
      hoveredWord = null;
      tooltip.style.display = "none";
      canvas.style.cursor = "default";
    }

    render();
  });

  canvas.addEventListener("mouseleave", () => {
    hoveredWord = null;
    tooltip.style.display = "none";
    render();
  });
}

init();
