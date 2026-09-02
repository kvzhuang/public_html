// ============================================
// fxhash Generative Art — Pointillism 點描印象
// --------------------------------------------
// 用數萬顆圓點、以光學混色（相鄰互補色點並置）的點描手法，
// 「概念式」重現印象派／後印象派名作（33 幅）。每個 fxhash 種子
// 挑一幅畫，依該畫的知名代表色盤生成一張確定性構圖，再以圓點鋪滿。
// 引擎原語：垂直漸層 stops、柔邊色塊 blobs、漩渦流光 swirl、水面流紋 streaks。
// ============================================

const rand = fxrand;
function rnd(a = 1, b) { return b === undefined ? rand() * a : a + rand() * (b - a); }
function rint(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function chance(p) { return rand() < p; }

// ── 色彩小工具（以 [r,g,b] 陣列運算）──
function hx(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerpC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// blob：柔邊橢圓色塊 {x,y,rx,ry,c,s(強度),sp(邊緣次方)}
function B(x, y, rx, ry, c, s, sp) { return { x, y, rx, ry, c: hx(c), s: s === undefined ? 1 : s, sp: sp || 1 }; }
// 建立 scene 骨架：stops 傳 [[v,"#hex"]...]，accents 傳 hex 字串陣列
function SC(name, artist, palette, bg, stops, accents, opt) {
  const s = { name, artist, palette, bg: hx(bg), stops: stops.map(o => ({ v: o[0], c: hx(o[1]) })), blobs: [], accents };
  if (opt) {
    if (opt.swirl) { const w = opt.swirl; s.swirl = { amp: w.amp, scale: w.scale, vmax: w.vmax == null ? 1 : w.vmax, c: hx(w.c) }; }
    if (opt.streaks) s.streaks = opt.streaks;
  }
  return s;
}

// ── 33 幅名作構圖生成器 ──
const SCENES = [
  // 1 莫內《日出印象》
  () => { const x = rnd(0.36, 0.46); const s = SC("Impression, Sunrise", "Monet", "Harbour Dawn", "#8092a2",
      [[0, "#b7a6ac"], [0.34, "#c9a68d"], [0.46, "#d7a07f"], [0.48, "#7f93a3"], [1, "#59708a"]],
      ["#e8a06a", "#8fa6bf", "#d79070"], { streaks: { v0: 0.48, freq: 90, amp: 0.16 } });
    s.blobs.push(B(x, 0.33, 0.11, 0.11, "#e8814a", 0.4, 1.6), B(x, 0.33, 0.05, 0.05, "#ec5a26", 1, 2), B(x, 0.72, 0.045, 0.26, "#e8642a", 0.32, 1.1),
      B(rnd(0.55, 0.7), 0.62, 0.06, 0.02, "#2c3742", 0.7, 1.2), B(rnd(0.2, 0.32), 0.7, 0.05, 0.018, "#333f4b", 0.6, 1.2)); return s; },
  // 2 莫內《睡蓮》
  () => { const s = SC("Water Lilies", "Monet", "Pond Reflections", "#2f6172",
      [[0, "#356f78"], [0.5, "#3a6f92"], [1, "#23485f"]], ["#8fbf9a", "#c3a0e0", "#f0b9d0"],
      { swirl: { amp: 0.4, scale: 2.4, vmax: 1, c: "#6a5a9c" } });
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0.1, 0.9), 0.5, rnd(0.04, 0.09), 0.6, chance(0.5) ? "#8aa6c8" : "#6a5a9c", 0.22, 1));
    for (let i = 0; i < rint(9, 14); i++) { const x = rnd(0.08, 0.92), y = rnd(0.1, 0.9); s.blobs.push(B(x, y, rnd(0.06, 0.1), rnd(0.03, 0.05), chance(0.5) ? "#3f7a4a" : "#4f8a58", 0.8, 1.3));
      if (chance(0.7)) { const fc = chance(0.5) ? "#f0b9d0" : "#f4eef0"; for (let k = 0; k < 4; k++) s.blobs.push(B(x + rnd(-0.02, 0.02), y + rnd(-0.015, 0.015), 0.014, 0.012, fc, 0.9, 2)); } } return s; },
  // 3 莫內《罌粟花田》
  () => { const s = SC("Poppy Field", "Monet", "Meadow Summer", "#7ea25a",
      [[0, "#a7c9e8"], [0.3, "#cfe0ef"], [0.42, "#c6d3bd"], [0.45, "#82a758"], [1, "#4d7838"]], ["#8fae5c", "#eef2d6", "#c98f7a"]);
    for (let i = 0; i < 4; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.08, 0.26), rnd(0.1, 0.18), rnd(0.05, 0.08), "#f2f5fb", 0.5, 1.3));
    for (let i = 0; i < 7; i++) s.blobs.push(B(rnd(0, 1), 0.43, rnd(0.06, 0.12), 0.05, "#4f6f3a", 0.75, 1.1));
    for (let i = 0; i < rint(140, 200); i++) { const bias = rnd() * rnd(), x = rnd(0, 1), y = 0.46 + bias * 0.5 + (x < 0.5 ? -0.02 : 0.03); if (y > 0.99) continue;
      const sz = rnd(0.006, 0.014) * (1.2 - bias * 0.5); s.blobs.push(B(x, y, sz, sz, chance(0.15) ? "#f26a52" : "#d5342a", 0.92, 2)); } return s; },
  // 4 秀拉《大碗島的星期日下午》
  () => { const s = SC("La Grande Jatte", "Seurat", "Park Afternoon", "#8a9a54",
      [[0, "#cfe0ea"], [0.22, "#b8d2df"], [0.24, "#4f6f3a"], [0.34, "#5f7f45"], [0.36, "#86a6bc"], [0.44, "#7f9db4"], [0.46, "#c2cc66"], [0.64, "#a9b657"], [0.67, "#6f8a3f"], [1, "#415a34"]],
      ["#c8cf6a", "#5f7f9a", "#e6d68a"]);
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0, 1), 0.28, rnd(0.05, 0.1), 0.06, "#3f5a30", 0.7, 1.1));
    s.blobs.push(B(0.32, 0.72, 0.5, 0.16, "#5f7a3a", 0.35, 1), B(0.72, 0.6, 0.05, 0.16, "#2b2620", 0.85, 0.9), B(0.72, 0.48, 0.09, 0.05, "#d9a24a", 0.85, 1.4), B(0.6, 0.62, 0.035, 0.13, "#22201a", 0.8, 0.9));
    for (let i = 0; i < 3; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.55, 0.8), 0.03, 0.09, chance(0.5) ? "#2b2822" : "#4a3a2a", 0.75, 0.9)); return s; },
  // 5 梵谷《星夜》
  () => { const s = SC("The Starry Night", "Van Gogh", "Nocturne Blue", "#0c1c40",
      [[0, "#0a1836"], [0.5, "#123a72"], [0.7, "#0f2b57"], [0.78, "#0a1122"], [1, "#07101f"]],
      ["#ffe58f", "#6fb0e0", "#1c3f7a"], { swirl: { amp: 0.55, scale: 3.2, vmax: 0.76, c: "#5a93c8" } });
    s.blobs.push(B(0.82, 0.15, 0.13, 0.13, "#e7b74a", 0.45, 1.6), B(0.82, 0.15, 0.05, 0.05, "#ffe07a", 0.95, 2));
    for (let i = 0; i < rint(8, 11); i++) { const x = rnd(0.06, 0.94), y = rnd(0.05, 0.62); s.blobs.push(B(x, y, 0.05, 0.05, "#f3d36a", 0.4, 1.7), B(x, y, 0.016, 0.016, "#fff0b0", 0.95, 2)); }
    s.blobs.push(B(0.13, 0.66, 0.07, 0.46, "#0a1810", 0.96, 0.7), B(0.11, 0.62, 0.04, 0.4, "#122a1a", 0.7, 0.8));
    for (let i = 0; i < 6; i++) s.blobs.push(B(rnd(0.35, 0.85), rnd(0.82, 0.9), 0.012, 0.01, "#ffcf6b", 0.85, 2)); return s; },
  // 6 莫內《乾草堆・日落》
  () => { const s = SC("Grainstacks, Sunset", "Monet", "Harvest Glow", "#c99a5a",
      [[0, "#efc98a"], [0.34, "#e6a45a"], [0.5, "#c98a5a"], [0.53, "#9a7a58"], [1, "#6a5638"]], ["#f0c46a", "#c98a5a", "#8a6a9a"]);
    s.blobs.push(B(rnd(0.15, 0.35), 0.62, 0.1, 0.16, "#5a4030", 0.92, 0.9), B(rnd(0.55, 0.75), 0.66, 0.12, 0.18, "#4a3526", 0.92, 0.9));
    s.blobs.push(B(0.28, 0.55, 0.06, 0.05, "#f0b46a", 0.5, 1.5), B(0.66, 0.58, 0.07, 0.05, "#f0b46a", 0.5, 1.5)); return s; },
  // 7 莫內《盧昂大教堂》
  () => { const s = SC("Rouen Cathedral", "Monet", "Gilded Stone", "#8a7a68",
      [[0, "#c2a86a"], [0.5, "#a89478"], [1, "#7a6a5c"]], ["#f0d488", "#b0a0c0", "#8a6a4a"]);
    const cols = ["#e8cf8a", "#d0b878", "#c0a888", "#e0c890", "#b8a078"];
    for (let i = 0; i < 6; i++) s.blobs.push(B(0.12 + i * 0.13, 0.5, 0.055, 0.55, cols[i % cols.length], 0.4, 0.9));
    s.blobs.push(B(0.5, 0.86, 0.13, 0.14, "#3a2f28", 0.7, 1), B(0.2, 0.2, 0.08, 0.1, "#4a3f34", 0.4, 1.2)); return s; },
  // 8 莫內《睡蓮池・日本橋》
  () => { const s = SC("The Water Lily Pond", "Monet", "Willow Green", "#3f6f4a",
      [[0, "#5a8a4a"], [0.35, "#4a7a52"], [0.55, "#3f6f52"], [1, "#2f5a44"]], ["#8fbf6a", "#c9a6d0", "#e0e8c0"],
      { swirl: { amp: 0.3, scale: 2.6, vmax: 1, c: "#8fbf7a" } });
    for (let i = 0; i <= 18; i++) { const t = i / 18, x = 0.1 + t * 0.8, y = 0.34 - Math.sin(t * Math.PI) * 0.16; s.blobs.push(B(x, y, 0.03, 0.02, "#7fae8a", 0.55, 1.2)); }
    for (let i = 0; i < 12; i++) { const x = rnd(0.1, 0.9), y = rnd(0.55, 0.95); s.blobs.push(B(x, y, rnd(0.05, 0.08), rnd(0.02, 0.035), "#3f7a4a", 0.7, 1.3));
      if (chance(0.6)) s.blobs.push(B(x, y, 0.02, 0.016, chance(0.5) ? "#e6a6c8" : "#f0e8f0", 0.85, 2)); } return s; },
  // 9 莫內《撐陽傘的女人》
  () => { const s = SC("Woman with a Parasol", "Monet", "Breezy Sky", "#9fc0e0",
      [[0, "#8fb4e0"], [0.5, "#cfe0f2"], [0.58, "#9aba6a"], [1, "#6f9a48"]], ["#eef2f0", "#8fb0d0", "#a7c060"]);
    for (let i = 0; i < 4; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.1, 0.35), rnd(0.1, 0.16), rnd(0.05, 0.08), "#f4f8fc", 0.5, 1.3));
    s.blobs.push(B(0.44, 0.62, 0.06, 0.18, "#eae6da", 0.75, 0.9), B(0.44, 0.44, 0.09, 0.055, "#cfd8c0", 0.85, 1.3), B(0.46, 0.5, 0.02, 0.03, "#5a6a7a", 0.6, 1.2)); return s; },
  // 10 莫內《威尼斯・聖喬治教堂黃昏》
  () => { const s = SC("San Giorgio at Dusk", "Monet", "Venetian Dusk", "#5a6a86",
      [[0, "#e6a86a"], [0.38, "#e8886a"], [0.54, "#7a6a8a"], [0.57, "#5a6a8a"], [1, "#3f5a7a"]], ["#e8a06a", "#8f7aa0", "#4a6a9a"],
      { streaks: { v0: 0.57, freq: 80, amp: 0.14 } });
    s.blobs.push(B(0.3, 0.34, 0.07, 0.07, "#f0b06a", 0.5, 1.6), B(0.62, 0.5, 0.045, 0.2, "#463f5a", 0.75, 0.9), B(0.6, 0.4, 0.035, 0.06, "#4a4260", 0.8, 1.1), B(0.62, 0.78, 0.03, 0.16, "#463f5a", 0.3, 1)); return s; },
  // 11 莫內《霧中國會大廈》
  () => { const s = SC("Houses of Parliament", "Monet", "London Fog", "#7a6a8a",
      [[0, "#8a7a9a"], [0.5, "#9a7a8a"], [1, "#6a6a86"]], ["#e88a5a", "#b0a0c0", "#5a5a7a"],
      { streaks: { v0: 0.6, freq: 70, amp: 0.14 } });
    s.blobs.push(B(0.62, 0.4, 0.06, 0.06, "#e8895a", 0.9, 2), B(0.62, 0.4, 0.13, 0.13, "#e8a06a", 0.35, 1.6), B(0.62, 0.7, 0.04, 0.18, "#e8895a", 0.25, 1));
    for (let i = 0; i < 4; i++) s.blobs.push(B(0.2 + i * 0.12, 0.6, 0.05, rnd(0.16, 0.26), "#463f5a", 0.65, 0.9)); return s; },
  // 12 莫內《喜鵲》雪景
  () => { const s = SC("The Magpie", "Monet", "Winter Blue", "#d8e2ea",
      [[0, "#cfe0ea"], [0.4, "#e8eef2"], [0.5, "#eef3f6"], [1, "#d6e2ea"]], ["#bcd0e0", "#eef2f5", "#8a9aa8"]);
    s.blobs.push(B(0.5, 0.56, 0.55, 0.05, "#d4dce0", 0.55, 1));
    for (let i = 0; i < 6; i++) s.blobs.push(B(rnd(0, 1), 0.42, 0.012, rnd(0.08, 0.16), "#5a5a4a", 0.55, 0.9));
    s.blobs.push(B(0.44, 0.52, 0.012, 0.02, "#20242a", 0.95, 2)); return s; },
  // 13 梵谷《隆河上的星夜》
  () => { const s = SC("Starry Night / Rhône", "Van Gogh", "River Night", "#16305f",
      [[0, "#1a2f6a"], [0.45, "#22407a"], [0.55, "#1a2f5a"], [1, "#12203f"]], ["#f0d86a", "#5a8ad0", "#1c2f6a"],
      { swirl: { amp: 0.3, scale: 3, vmax: 0.45, c: "#3a5a9a" } });
    for (let i = 0; i < 9; i++) { const x = rnd(0.05, 0.95), y = rnd(0.05, 0.4); s.blobs.push(B(x, y, 0.03, 0.03, "#f3d36a", 0.4, 1.7), B(x, y, 0.012, 0.012, "#fff0b0", 0.95, 2)); }
    for (let i = 0; i < 8; i++) { const x = rnd(0.15, 0.85); s.blobs.push(B(x, 0.52, 0.012, 0.012, "#f0d86a", 0.9, 2), B(x, 0.66, 0.01, 0.14, "#e8c85a", 0.3, 1)); } return s; },
  // 14 梵谷《麥田與絲柏》
  () => { const s = SC("Wheatfield with Cypresses", "Van Gogh", "Golden Field", "#9aae5a",
      [[0, "#8fb0d0"], [0.35, "#c0d4e4"], [0.42, "#7a9a5a"], [0.55, "#9aae4a"], [1, "#c9b24a"]], ["#e0c84a", "#8fae5c", "#6a8ad0"],
      { swirl: { amp: 0.5, scale: 3.4, vmax: 0.4, c: "#eef2f8" } });
    s.blobs.push(B(0.8, 0.55, 0.06, 0.35, "#2a3f2a", 0.9, 0.7), B(0.78, 0.5, 0.04, 0.28, "#33502f", 0.6, 0.8));
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0, 0.7), 0.46, rnd(0.06, 0.12), 0.05, "#5f7a3a", 0.6, 1.1)); return s; },
  // 15 梵谷《夜間咖啡館露台》
  () => { const s = SC("Café Terrace at Night", "Van Gogh", "Gaslit Night", "#22305a",
      [[0, "#12306a"], [0.35, "#1a3f7a"], [0.45, "#2a2f4a"], [1, "#3a3020"]], ["#f0c23a", "#5a8ad0", "#e0a86a"]);
    s.blobs.push(B(0.35, 0.5, 0.28, 0.18, "#f0c23a", 0.85, 1.1), B(0.35, 0.5, 0.2, 0.12, "#f6d45a", 0.4, 1.4));
    for (let i = 0; i < 8; i++) s.blobs.push(B(rnd(0.05, 0.95), rnd(0.05, 0.3), 0.012, 0.012, "#fff0b0", 0.9, 2));
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0.55, 0.95), rnd(0.55, 0.8), 0.03, 0.1, "#2a2620", 0.6, 0.9)); return s; },
  // 16 梵谷《鳶尾花》
  () => { const s = SC("Irises", "Van Gogh", "Iris Field", "#6f8f38",
      [[0, "#7a9a3a"], [0.5, "#6f8f38"], [1, "#5a7a30"]], ["#4a4f9a", "#8fae4a", "#e0a03a"]);
    for (let i = 0; i < 60; i++) { const x = rnd(0, 1), y = rnd(0.2, 0.95); s.blobs.push(B(x, y - 0.04, 0.008, 0.06, "#4a7a3a", 0.6, 1)); s.blobs.push(B(x, y, 0.02, 0.025, chance(0.5) ? "#3a3f8a" : "#5a4a9a", 0.85, 1.6)); }
    s.blobs.push(B(0.14, 0.5, 0.025, 0.03, "#f0f0f0", 0.9, 1.8));
    for (let i = 0; i < 6; i++) s.blobs.push(B(rnd(0, 1), rnd(0.85, 0.98), 0.015, 0.015, "#e0a83a", 0.7, 2)); return s; },
  // 17 梵谷《橄欖樹》
  () => { const s = SC("The Olive Trees", "Van Gogh", "Olive Grove", "#8a9a6a",
      [[0, "#a8c0c0"], [0.3, "#8fb0a8"], [0.4, "#7a9a6a"], [1, "#a88a4a"]], ["#6a9a7a", "#c9a84a", "#8fb0c0"],
      { swirl: { amp: 0.4, scale: 3, vmax: 0.42, c: "#cfe0e0" } });
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0.05, 0.95), rnd(0.34, 0.42), rnd(0.05, 0.09), 0.04, "#cfe0ec", 0.4, 1.2));
    for (let i = 0; i < 7; i++) { const x = rnd(0.1, 0.9), y = rnd(0.5, 0.75); s.blobs.push(B(x, y, rnd(0.07, 0.11), rnd(0.06, 0.09), "#4a7a4a", 0.75, 1.2), B(x, y + 0.06, 0.02, 0.06, "#5a4a2a", 0.6, 1)); } return s; },
  // 18 梵谷《盛開的杏花》
  () => { const s = SC("Almond Blossom", "Van Gogh", "Turquoise Spring", "#4fa8b0",
      [[0, "#5ab0b8"], [1, "#4aa0a8"]], ["#f4f4f4", "#f0c8d0", "#3a2a1a"]);
    for (let i = 0; i < 6; i++) { let x = rnd(0.1, 0.5), y = rnd(0.2, 0.8); for (let k = 0; k < 10; k++) { x += rnd(0.03, 0.08); y += rnd(-0.05, 0.05); s.blobs.push(B(x, y, 0.03, 0.012, "#3a2a1a", 0.8, 0.8)); if (x > 1) break; } }
    for (let i = 0; i < 90; i++) s.blobs.push(B(rnd(0, 1), rnd(0.1, 0.9), 0.015, 0.014, chance(0.3) ? "#f0cfd6" : "#f6f4f0", 0.85, 2)); return s; },
  // 19 秀拉《阿尼埃爾的浴場》
  () => { const s = SC("Bathers at Asnières", "Seurat", "Riverbank Noon", "#7f9db4",
      [[0, "#bcd0e0"], [0.3, "#a8c0d0"], [0.4, "#8fae5c"], [0.6, "#7a9a4a"], [0.62, "#7f9db4"], [1, "#5f7d94"]], ["#e0d0a0", "#7f9db4", "#c9a86a"]);
    for (let i = 0; i < 4; i++) s.blobs.push(B(rnd(0, 1), 0.26, rnd(0.05, 0.1), 0.05, "#8a9aa0", 0.4, 1.1));
    s.blobs.push(B(0.68, 0.5, 0.07, 0.09, "#e0c8a0", 0.8, 1.1), B(0.3, 0.55, 0.06, 0.08, "#d8b890", 0.8, 1.1), B(0.5, 0.52, 0.04, 0.06, "#c8a878", 0.75, 1.1), B(0.68, 0.44, 0.03, 0.03, "#c9502a", 0.8, 1.6)); return s; },
  // 20 席涅克《聖特羅佩港》
  () => { const s = SC("Port of Saint-Tropez", "Signac", "Riviera Bright", "#5a8aa0",
      [[0, "#cfe0e8"], [0.4, "#e4dcc0"], [0.5, "#8fb0c0"], [1, "#4f86a0"]], ["#e06a4a", "#4a8ad0", "#f0c84a", "#8f5aa0"]);
    for (let i = 0; i < 5; i++) { const x = rnd(0.15, 0.85); s.blobs.push(B(x, 0.4, 0.008, rnd(0.1, 0.2), "#3a3020", 0.6, 0.9), B(x, 0.48, 0.04, 0.03, chance(0.5) ? "#e8e0d0" : "#c85a4a", 0.75, 1.3)); }
    for (let i = 0; i < 30; i++) s.blobs.push(B(rnd(0, 1), rnd(0.55, 0.98), 0.02, 0.018, pick(["#e06a4a", "#4a8ad0", "#f0c84a", "#8f5aa0", "#e0d0b0"]), 0.4, 1.4)); return s; },
  // 21 席涅克《亞維儂教皇宮》
  () => { const s = SC("Papal Palace, Avignon", "Signac", "Provence Violet", "#6a5a86",
      [[0, "#e6a86a"], [0.34, "#e88a8a"], [0.5, "#7a6a9a"], [0.74, "#6a5a8a"], [0.76, "#5a7a9a"], [1, "#3f6a8a"]], ["#e88a6a", "#8f6ac0", "#4a8ac0"]);
    s.blobs.push(B(0.5, 0.6, 0.36, 0.17, "#6a5a8a", 0.6, 1), B(0.36, 0.5, 0.05, 0.16, "#5a4a7a", 0.7, 0.9), B(0.6, 0.48, 0.05, 0.2, "#5a4a7a", 0.7, 0.9));
    for (let i = 0; i < 20; i++) s.blobs.push(B(rnd(0, 1), rnd(0.78, 0.98), 0.02, 0.016, pick(["#8f6ac0", "#4a8ac0", "#e88a6a", "#c8a0e0"]), 0.4, 1.4)); return s; },
  // 22 雷諾瓦《青蛙潭》
  () => { const s = SC("La Grenouillère", "Renoir", "Summer River", "#5f7f8a",
      [[0, "#8fae7a"], [0.3, "#7a9a6a"], [0.4, "#6f8a9a"], [1, "#5a7a8a"]], ["#e0e0d0", "#5a7a8a", "#8fae6a"]);
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0, 1), 0.2, rnd(0.08, 0.14), 0.1, "#5f7a4a", 0.6, 1.2));
    for (let i = 0; i < 4; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.42, 0.55), rnd(0.04, 0.08), 0.02, "#2f2a24", 0.6, 1));
    for (let i = 0; i < 24; i++) s.blobs.push(B(rnd(0, 1), rnd(0.5, 0.98), 0.02, 0.015, chance(0.4) ? "#eef0e0" : "#6f8ea0", 0.4, 1.4)); return s; },
  // 23 雷諾瓦《煎餅磨坊的舞會》
  () => { const s = SC("Le Moulin de la Galette", "Renoir", "Dappled Warmth", "#9a7a68",
      [[0, "#b89a7a"], [0.5, "#a8886a"], [1, "#8a6a5a"]], ["#e0c8a0", "#6a6a9a", "#d0a0a0"]);
    for (let i = 0; i < 40; i++) s.blobs.push(B(rnd(0, 1), rnd(0.1, 0.9), rnd(0.02, 0.05), rnd(0.02, 0.05), chance(0.5) ? "#e8d0a8" : "#6a6a9a", 0.35, 1.4));
    for (let i = 0; i < 10; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.45, 0.85), 0.03, 0.09, chance(0.5) ? "#3a2f2a" : "#5a4a4a", 0.6, 0.9)); return s; },
  // 24 雷諾瓦《船上的午宴》
  () => { const s = SC("Luncheon of the Boating Party", "Renoir", "Terrace Lunch", "#9a8a76",
      [[0, "#8fae8a"], [0.25, "#a8b89a"], [0.32, "#dcccb2"], [1, "#9a8a76"]], ["#e0d0b0", "#c05a4a", "#5a7a6a"]);
    s.blobs.push(B(0.5, 0.9, 0.6, 0.14, "#eae0cc", 0.6, 1));
    for (let i = 0; i < 6; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.4, 0.7), 0.05, 0.12, chance(0.4) ? "#efe6d6" : "#4a3a30", 0.7, 0.95));
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0.2, 0.8), 0.82, 0.015, 0.04, chance(0.5) ? "#c85a4a" : "#d8c8a0", 0.8, 1.4)); return s; },
  // 25 畢沙羅《蒙馬特大道》
  () => { const s = SC("Boulevard Montmartre", "Pissarro", "City Boulevard", "#7a766e",
      [[0, "#c0ccd8"], [0.3, "#b0b8c0"], [0.35, "#8a8a86"], [0.68, "#6a6a66"], [0.7, "#9a9690"], [1, "#7a766e"]], ["#a86a5a", "#6a6a86", "#c0b8a8"]);
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0, 0.35), 0.5, rnd(0.06, 0.12), 0.3, "#7a746a", 0.5, 0.9));
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0.65, 1), 0.5, rnd(0.06, 0.12), 0.3, "#847e74", 0.5, 0.9));
    for (let i = 0; i < 40; i++) s.blobs.push(B(rnd(0.35, 0.65), rnd(0.72, 0.98), 0.012, 0.02, chance(0.5) ? "#3a3630" : "#8a7a6a", 0.6, 1.1)); return s; },
  // 26 畢沙羅《紅屋頂》
  () => { const s = SC("The Red Roofs", "Pissarro", "Village Autumn", "#6a7a4a",
      [[0, "#b8c8d0"], [0.3, "#a8b0a0"], [0.4, "#8a9a6a"], [1, "#6a7a4a"]], ["#b0503a", "#8a9a5a", "#c8b0a0"]);
    for (let i = 0; i < 14; i++) s.blobs.push(B(rnd(0.15, 0.85), rnd(0.42, 0.62), rnd(0.03, 0.06), rnd(0.02, 0.035), "#b0503a", 0.8, 1.2));
    for (let i = 0; i < 10; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.35, 0.6), 0.012, rnd(0.1, 0.2), "#4a3a2a", 0.5, 0.9)); return s; },
  // 27 希斯里《馬爾利港的洪水》
  () => { const s = SC("Flood at Port-Marly", "Sisley", "Grey Flood", "#8298a8",
      [[0, "#b0bcc8"], [0.4, "#c0c8ce"], [0.5, "#a8b0b8"], [0.55, "#9aa8b4"], [1, "#8298a8"]], ["#c8b8a0", "#8298a8", "#a0a8b0"],
      { streaks: { v0: 0.55, freq: 60, amp: 0.1 } });
    s.blobs.push(B(0.28, 0.42, 0.13, 0.14, "#cdbca0", 0.8, 1), B(0.28, 0.66, 0.11, 0.14, "#cdbca0", 0.3, 1));
    for (let i = 0; i < 4; i++) s.blobs.push(B(rnd(0.55, 0.95), 0.4, 0.01, rnd(0.1, 0.16), "#5a6a5a", 0.5, 0.9)); return s; },
  // 28 希斯里《魯弗申的雪》
  () => { const s = SC("Snow at Louveciennes", "Sisley", "Muted Snow", "#c0ccd4",
      [[0, "#c8d0d8"], [0.4, "#dbe1e5"], [1, "#c0ccd4"]], ["#bcc8d4", "#e4e8ec", "#8a7a6a"]);
    for (let i = 0; i < 8; i++) s.blobs.push(B(rnd(0, 1), rnd(0.25, 0.5), 0.012, rnd(0.08, 0.18), "#5a5a52", 0.5, 0.9));
    s.blobs.push(B(0.7, 0.45, 0.12, 0.12, "#b0a48c", 0.6, 1), B(0.4, 0.62, 0.02, 0.05, "#4a4038", 0.7, 1)); return s; },
  // 29 塞尚《聖維克多山》
  () => { const s = SC("Mont Sainte-Victoire", "Cézanne", "Provence Patchwork", "#8a8a5a",
      [[0, "#9fbcd0"], [0.35, "#c0d4dc"], [0.45, "#8fae8a"], [0.6, "#a8ae6a"], [1, "#8a8a5a"]], ["#c9b26a", "#7a9a8a", "#a8b0bc"]);
    s.blobs.push(B(0.62, 0.36, 0.34, 0.14, "#93a0b6", 0.82, 1.2), B(0.62, 0.3, 0.16, 0.07, "#a8b6cc", 0.5, 1.3), B(0.62, 0.44, 0.34, 0.03, "#7f8ca6", 0.55, 1));
    for (let i = 0; i < 22; i++) s.blobs.push(B(rnd(0, 1), rnd(0.5, 0.95), rnd(0.05, 0.1), rnd(0.03, 0.06), pick(["#8a9a5a", "#c9b26a", "#6a8a5a", "#b0a060"]), 0.5, 1.1));
    for (let i = 0; i < 6; i++) s.blobs.push(B(rnd(0, 1), rnd(0.55, 0.8), 0.03, 0.07, "#4a6a4a", 0.55, 1.1)); return s; },
  // 30 竇加《舞蹈課》
  () => { const s = SC("The Ballet Class", "Degas", "Rehearsal Pastel", "#a89478",
      [[0, "#b0a898"], [0.45, "#c8c0b0"], [0.5, "#c8b89a"], [1, "#a89478"]], ["#f0eef0", "#c0a0b0", "#8aa0c0"]);
    for (let i = 0; i < 7; i++) { const x = rnd(0.1, 0.9), y = rnd(0.45, 0.8); s.blobs.push(B(x, y, rnd(0.05, 0.08), rnd(0.04, 0.06), "#f0eef0", 0.85, 1.6), B(x, y - 0.05, 0.02, 0.04, "#e0c0b8", 0.8, 1.4));
      if (chance(0.5)) s.blobs.push(B(x, y - 0.02, 0.03, 0.012, chance(0.5) ? "#8aa0c0" : "#c88aa0", 0.7, 1.6)); } return s; },
  // 31 卡玉伯特《巴黎街道・雨天》
  () => { const s = SC("Paris Street, Rainy Day", "Caillebotte", "Rainy Grey", "#888890",
      [[0, "#c0c4c8"], [0.35, "#b0b4b8"], [0.4, "#9a9a9a"], [0.62, "#8a8a8a"], [0.64, "#a2a2a6"], [1, "#888890"]], ["#5a5f66", "#a8acb0", "#7a7a86"]);
    for (let i = 0; i < 6; i++) { const x = rnd(0.1, 0.9), y = rnd(0.5, 0.75); s.blobs.push(B(x, y + 0.06, 0.02, 0.08, "#2f3238", 0.7, 0.9), B(x, y, 0.045, 0.03, "#3a3f44", 0.75, 1.3)); }
    s.blobs.push(B(0.8, 0.42, 0.2, 0.14, "#33383e", 0.82, 1.2), B(0.8, 0.6, 0.03, 0.16, "#2a2e33", 0.8, 0.9)); return s; },
  // 32 莫內《普維爾的懸崖步道》
  () => { const s = SC("Cliff Walk at Pourville", "Monet", "Coastal Breeze", "#6f9a58",
      [[0, "#a8c8e0"], [0.3, "#c8dcec"], [0.4, "#8fb4c8"], [0.6, "#7aa8c0"], [0.62, "#8fae5c"], [1, "#6f9a48"]], ["#eef0e0", "#7aa8c0", "#8fae5c"]);
    for (let i = 0; i < 5; i++) s.blobs.push(B(rnd(0.1, 0.9), rnd(0.45, 0.58), 0.008, 0.006, "#f4f8fc", 0.8, 2));
    s.blobs.push(B(0.44, 0.6, 0.03, 0.08, "#e8e8dc", 0.75, 1.1), B(0.44, 0.53, 0.045, 0.03, "#d8dcc8", 0.8, 1.4), B(0.56, 0.62, 0.028, 0.07, "#e0e0d0", 0.72, 1.1)); return s; },
  // 33 莫內《吉維尼花園小徑》
  () => { const s = SC("Garden Path at Giverny", "Monet", "Blooming Path", "#5f7f40",
      [[0, "#9fc0d0"], [0.25, "#8fb06a"], [0.3, "#7a9a4a"], [1, "#5f7f38"]], ["#e06a9a", "#f0c84a", "#8f5ac0", "#e05a4a"]);
    s.blobs.push(B(0.5, 0.7, 0.1, 0.4, "#d6ccae", 0.5, 1));
    for (let i = 0; i < 120; i++) { const side = chance(0.5) ? rnd(0.02, 0.4) : rnd(0.6, 0.98); const y = rnd(0.32, 0.98); s.blobs.push(B(side, y, rnd(0.01, 0.02), rnd(0.01, 0.02), pick(["#e06a9a", "#f0c84a", "#8f5ac0", "#e05a4a", "#f0f0e0"]), 0.85, 2)); } return s; },
];

function buildScene() { return pick(SCENES)(); }

// ── 場景取色：某座標 (u,v) 的「底畫」顏色 ──
function sampleScene(scene, u, v, x, y) {
  const st = scene.stops;
  let base;
  if (v <= st[0].v) base = st[0].c.slice();
  else if (v >= st[st.length - 1].v) base = st[st.length - 1].c.slice();
  else {
    for (let i = 0; i < st.length - 1; i++) {
      if (v >= st[i].v && v <= st[i + 1].v) {
        const t = (v - st[i].v) / (st[i + 1].v - st[i].v || 1);
        base = lerpC(st[i].c, st[i + 1].c, t);
        break;
      }
    }
  }
  if (scene.swirl && v < scene.swirl.vmax) {
    const sw = scene.swirl;
    const n = noise(u * sw.scale, v * sw.scale + u * 1.5, 3.7);
    const m = Math.max(0, (n - 0.45) * 2) * sw.amp * (1 - v / sw.vmax);
    base = lerpC(base, sw.c, m);
  }
  if (scene.streaks && v > scene.streaks.v0) {
    const s = scene.streaks;
    const n = noise(u * 4, y * 0.03);
    const mod = Math.sin(y * s.freq * 0.01 + n * 6) * s.amp;
    base = [base[0] + mod * 40, base[1] + mod * 40, base[2] + mod * 40];
  }
  const bl = scene.blobs;
  for (let i = 0; i < bl.length; i++) {
    const b = bl[i];
    const dx = (u - b.x) / b.rx, dy = (v - b.y) / b.ry;
    const dd = dx * dx + dy * dy;
    if (dd < 1) base = lerpC(base, b.c, Math.pow(1 - dd, b.sp) * b.s);
  }
  return base;
}

// ── 全域 ──
let scene, S, dotStep, previewed = false;

function setup() {
  S = Math.min(windowWidth, windowHeight);
  const c = createCanvas(S, S);
  c.parent(document.body);
  pixelDensity(1);
  noStroke();
  scene = buildScene();
  updateFeatures();
  noLoop();
}

function windowResized() {
  S = Math.min(windowWidth, windowHeight);
  resizeCanvas(S, S);
  redraw();
}

function draw() {
  noiseSeed(Math.floor(rand() * 1e9));
  background(scene.bg[0], scene.bg[1], scene.bg[2]);

  dotStep = Math.max(4, S / 160);
  const jit = dotStep * 0.42;
  const acc = scene.accents.map(hx);

  for (let pass = 0; pass < 2; pass++) {
    for (let gy = -1; gy * dotStep < S + dotStep; gy++) {
      for (let gx = -1; gx * dotStep < S + dotStep; gx++) {
        const x = gx * dotStep + dotStep * 0.5 + rnd(-jit, jit);
        const y = gy * dotStep + dotStep * 0.5 + rnd(-jit, jit);
        if (x < -dotStep || y < -dotStep || x > S + dotStep || y > S + dotStep) continue;
        let col = sampleScene(scene, x / S, y / S, x, y);
        const tex = (noise(x * 0.02, y * 0.02) - 0.5) * 26;
        col = [col[0] + tex + rnd(-14, 14), col[1] + tex + rnd(-14, 14), col[2] + tex + rnd(-14, 14)];
        if (pass === 1 && chance(0.16)) { const a = pick(acc); col = lerpC(col, a, rnd(0.4, 0.7)); }
        const r = clamp255(col[0]), g = clamp255(col[1]), b = clamp255(col[2]);
        if (pass === 0) { fill(r, g, b, 150); circle(x, y, dotStep * rnd(1.5, 1.9)); }
        else { fill(r, g, b, 235); circle(x, y, dotStep * rnd(0.72, 1.05)); }
      }
    }
  }

  drawLabel();
  if (!previewed) { previewed = true; fxpreview(); }
}

// 左下角美術館式標籤
function drawLabel() {
  push();
  const pad = S * 0.03;
  textFont("Georgia, 'Times New Roman', serif");
  textAlign(LEFT, BOTTOM);
  const fs = Math.max(10, S * 0.018);
  noStroke();
  fill(20, 18, 14, 120);
  rect(0, S - fs * 2.6, S * 0.62 + pad, fs * 2.6);
  fill(245, 240, 230, 235);
  textSize(fs);
  textStyle(ITALIC);
  text(scene.name, pad, S - fs * 1.5);
  textStyle(NORMAL);
  textSize(fs * 0.82);
  fill(230, 224, 210, 200);
  text(scene.artist + " · pointillist study", pad, S - fs * 0.35);
  pop();
}

function updateFeatures() {
  window.$fxhashFeatures = {
    "Painting": scene.name,
    "Artist": scene.artist,
    "Palette": scene.palette,
  };
}

function mousePressed() { reseed(); }
function keyPressed() {
  if (key === ' ') reseed();
  if (key === 's' || key === 'S') saveCanvas("pointillism", "png");
}
function reseed() {
  for (let i = 0, n = Math.floor(millis()) % 97 + 1; i < n; i++) rand();
  scene = buildScene();
  updateFeatures();
  previewed = true;
  redraw();
}

window.$fxhashFeatures = {};
