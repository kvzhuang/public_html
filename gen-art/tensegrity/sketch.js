// ============================================
// Tensegrity — 張拉整體生成藝術
// Clean style: light bg, cylindrical struts,
// thin cables, ground shadow
// ============================================

const rand = fxrand;

// ── Palettes (clean / light backgrounds) ────────────────────────────────────

const PALETTES = [
  { name:"Natural",    bg:"#F0E8DC", strut:"#E8A050", strutDark:"#C47830", cable:"#999999", joint:"#333333" },
  { name:"Bamboo",     bg:"#EDE8D8", strut:"#8DB860", strutDark:"#6A9040", cable:"#888888", joint:"#3A3A3A" },
  { name:"Steel",      bg:"#E8ECF0", strut:"#8899AA", strutDark:"#607080", cable:"#AAAAAA", joint:"#444444" },
  { name:"Copper",     bg:"#F0E6DC", strut:"#CC7744", strutDark:"#AA5522", cable:"#999988", joint:"#443322" },
  { name:"Cherry",     bg:"#F2E8E8", strut:"#CC5555", strutDark:"#993333", cable:"#AA9999", joint:"#442222" },
  { name:"Ocean",      bg:"#E4ECF0", strut:"#4488AA", strutDark:"#336688", cable:"#8899AA", joint:"#223344" },
  { name:"Plum",       bg:"#EDE4EE", strut:"#9966AA", strutDark:"#774488", cable:"#998899", joint:"#332244" },
  { name:"Charcoal",   bg:"#E8E8E5", strut:"#555555", strutDark:"#333333", cable:"#AAAAAA", joint:"#222222" },
  { name:"Gold",       bg:"#F0EBD8", strut:"#D4A840", strutDark:"#B08820", cable:"#AAA088", joint:"#554422" },
  { name:"Teal",       bg:"#E0EDE8", strut:"#448877", strutDark:"#226655", cable:"#88AA99", joint:"#224433" },
  { name:"Midnight",   bg:"#121220", strut:"#88AADD", strutDark:"#5577AA", cable:"#445566", joint:"#AABBCC" },
  { name:"Dark Wood",  bg:"#1A1410", strut:"#CC9955", strutDark:"#AA7733", cable:"#555544", joint:"#DDBB88" },
];

let pal, sz;
let structures = [];
let viewRotX, viewRotY, rotSpeedX;
let layout;

function setup() {
  sz = min(windowWidth, windowHeight);
  createCanvas(sz, sz);
  generate();
}

function generate() {
  pal = PALETTES[floor(rand() * PALETTES.length)];
  viewRotX = rand() * TWO_PI;
  viewRotY = rand() * 0.4 + 0.25;
  rotSpeedX = (rand() * 0.2 + 0.08) * (rand() < 0.5 ? 1 : -1);

  layout = 'single';
  structures = [createStructure(0, 0, 0, sz*0.35, floor(rand()*3)+3)];

  window.$fxhashFeatures = { "Palette":pal.name, "Struts":structures[0].nStruts };
}

function createStructure(cx, cy, cz, scale, nStruts) {
  const height = scale * 1.5;
  const radius = scale * 0.6;
  const twist = PI/nStruts + rand()*0.3;

  const topV = [], botV = [];
  for (let i = 0; i < nStruts; i++) {
    const a1 = TWO_PI*i/nStruts;
    topV.push({ x:cos(a1)*radius, y:-height/2, z:sin(a1)*radius });
    const a2 = TWO_PI*i/nStruts + twist;
    botV.push({ x:cos(a2)*radius, y:height/2, z:sin(a2)*radius });
  }

  const struts = [], cables = [];
  for (let i = 0; i < nStruts; i++) {
    struts.push({ a:topV[i], b:botV[i] });
    cables.push({ a:topV[i], b:topV[(i+1)%nStruts] });
    cables.push({ a:botV[i], b:botV[(i+1)%nStruts] });
    cables.push({ a:topV[i], b:botV[(i+1)%nStruts] });
  }

  return {
    cx, cy, cz, scale, nStruts, topV, botV, struts, cables,
    swaySpeed: rand()*0.4+0.2, swayAmp: rand()*0.1+0.03,
    swayPhase: rand()*TWO_PI,
    ownRot: rand()*TWO_PI, ownRotSpeed: (rand()*0.15+0.03)*(rand()<0.5?1:-1),
  };
}

function project(x, y, z, rX, rY) {
  let x1 = x*cos(rX) - z*sin(rX);
  let z1 = x*sin(rX) + z*cos(rX);
  let y1 = y*cos(rY) - z1*sin(rY);
  let z2 = y*sin(rY) + z1*cos(rY);
  const persp = 800;
  const s = persp/(persp+z2);
  return { x:x1*s, y:y1*s, z:z2, scale:s };
}

function draw() {
  background(pal.bg);
  const t = millis()*0.001;
  const grX = viewRotX + t*rotSpeedX;
  const grY = viewRotY + sin(t*0.3)*0.1;

  push();
  translate(sz/2, sz/2);

  // Sort by depth
  const sorted = structures.map(s => {
    const cp = project(s.cx, s.cy, s.cz, grX, grY);
    return { s, depth:cp.z };
  }).sort((a,b) => a.depth-b.depth);

  for (const item of sorted) {
    drawShadow(item.s, t, grX, grY);
  }
  for (const item of sorted) {
    drawStructure(item.s, t, grX, grY);
  }

  pop();
}

// ── Ground shadow ───────────────────────────────────────────────────────────

function drawShadow(s, t, grX, grY) {
  const sway = sin(t*s.swaySpeed+s.swayPhase)*s.swayAmp;
  const lrX = grX+s.ownRot+t*s.ownRotSpeed;
  const lrY = grY+sway;

  // Project bottom vertices to find shadow center
  let sumX = 0, sumY = 0;
  const allV = s.topV.concat(s.botV);
  for (const v of allV) {
    const p = project(v.x+s.cx, v.y+s.cy, v.z+s.cz, lrX, lrY);
    sumX += p.x; sumY += p.y;
  }
  const cx = sumX / allV.length;
  // Shadow sits at bottom
  const shadowY = s.scale * 0.9 * sz * 0.12 + sz * 0.08;

  noStroke();
  fill(0, 0, 0, 15);
  ellipse(cx, shadowY, s.scale*1.8, s.scale*0.4);
  fill(0, 0, 0, 8);
  ellipse(cx, shadowY, s.scale*2.5, s.scale*0.6);
}

// ── Draw structure ──────────────────────────────────────────────────────────

function drawStructure(s, t, grX, grY) {
  const sway = sin(t*s.swaySpeed+s.swayPhase)*s.swayAmp;
  const lrX = grX+s.ownRot+t*s.ownRotSpeed;
  const lrY = grY+sway;

  function proj(v) {
    return project(v.x+s.cx, v.y+s.cy, v.z+s.cz, lrX, lrY);
  }

  // ── Cables (thin, subtle) ──
  stroke(pal.cable);
  strokeWeight(max(sz*0.002, 0.5));
  strokeCap(ROUND);
  for (const c of s.cables) {
    const pa = proj(c.a), pb = proj(c.b);
    line(pa.x, pa.y, pb.x, pb.y);
  }

  // ── Struts (cylindrical bars with shading) ──
  for (const strut of s.struts) {
    const pa = proj(strut.a), pb = proj(strut.b);
    const avgScale = (pa.scale+pb.scale)/2;
    const barW = max(avgScale * 8, 3);

    // Calculate perpendicular direction for cylinder shading
    const dx = pb.x-pa.x, dy = pb.y-pa.y;
    const len = sqrt(dx*dx+dy*dy);
    if (len < 1) continue;
    const nx = -dy/len, ny = dx/len; // normal

    // Draw cylinder with 3 layers: dark edge → main color → highlight
    // Dark outline
    stroke(pal.strutDark);
    strokeWeight(barW + 2);
    strokeCap(ROUND);
    line(pa.x, pa.y, pb.x, pb.y);

    // Main body
    stroke(pal.strut);
    strokeWeight(barW);
    line(pa.x, pa.y, pb.x, pb.y);

    // Highlight (offset toward light)
    const hlOff = barW * 0.2;
    const hlCol = color(pal.strut);
    const bgCol = color(pal.bg);
    const highlight = lerpColor(hlCol, color(255), 0.4);
    highlight.setAlpha(120);
    stroke(highlight);
    strokeWeight(barW * 0.35);
    line(pa.x+nx*hlOff, pa.y+ny*hlOff, pb.x+nx*hlOff, pb.y+ny*hlOff);
  }

  // ── Joints (dark dots at endpoints) ──
  noStroke();
  fill(pal.joint);
  const allV = s.topV.concat(s.botV);
  for (const v of allV) {
    const p = proj(v);
    const dotSz = max(p.scale * 8, 3);
    ellipse(p.x, p.y, dotSz, dotSz);
  }
}

// ── Interaction ─────────────────────────────────────────────────────────────

function windowResized() {
  sz = min(windowWidth, windowHeight);
  resizeCanvas(sz, sz);
}

function keyPressed() {
  if (key === ' ') generate();
  if (key === 's' || key === 'S') saveCanvas('tensegrity-'+Date.now(), 'png');
}
