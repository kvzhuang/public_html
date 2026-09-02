// ============================================
// Sunflowers 向日葵 - Generative Art
// 以演算法重現梵谷《向日葵》(1888) 的厚塗筆觸
// 筆觸引擎移植自 gen-art/oil-paint：
//   bezier 板狀筆觸 + 鬃毛紋 + 高光/陰影稜線
//   + 中央反光帶 + 邊緣碎屑
// ============================================

const rand = fxrand;

// --- 畫布內部解析度（原作 92×73cm 直幅比例）---
const PW = 920, PH = 1160;

// --- 色調變體（梵谷向日葵系列的不同背景版本）---
const TONES = [
  { name: '鉻黃', w: 28,                               // 倫敦國家美術館版
    wall:  ['#E6CC5C','#EDD877','#DCBE4A','#F0E08C','#E2C654'],
    table: ['#D9A64A','#CE9A3E','#E2B45C','#C4923C'],
    tableAccent: ['#8A7A30','#A45A30','#6E7C3A','#B5764A'],   // 橄欖、鏽紅、苔綠
    line:  '#8A5A22' },
  { name: '土耳其藍', w: 12,                           // 慕尼黑新繪畫陳列館版
    wall:  ['#3E8F8C','#4FA3A0','#2F7B79','#5FB0AC','#469994'],
    table: ['#C9973F','#D8A84E','#B9883A','#D2A148'],
    tableAccent: ['#7A8C4A','#A45A30','#8C6E3A','#5E7A6A'],
    line:  '#1E4A4A' },
  { name: '淡青綠', w: 10,                             // 早期習作的灰綠底
    wall:  ['#CFD9B8','#DCE5C8','#C2CFA8','#E5EDD5','#D5DfC0'],
    table: ['#C2945C','#B58950','#D0A468','#BA8C54'],
    tableAccent: ['#8C9A5A','#A8704A','#7A8848','#96845E'],
    line:  '#6E5A30' },
];

// --- 顏料盤 ---
const PETAL_YELLOWS = ['#F2C12E','#E8A317','#F8D74A','#D98E1B','#F5B82E','#EEC93F'];
const PETAL_DEEP    = ['#B96F14','#C67914','#A86310'];
const INNER_ORANGE  = ['#D98E1B','#C67914','#E8A317','#CC8418'];
const DISC_BROWNS   = ['#6B4216','#54300F','#7E5520','#3F2408','#8B5E2A'];
const GREENS        = ['#5A7A2E','#48652A','#6E8C3A','#3E5722','#62803A'];
const VASE_UPPER    = ['#E8D48C','#EFDFA4','#DEC677','#E5CF8E'];
const VASE_LOWER    = ['#C9913B','#B97F30','#D6A14E','#C28A38'];
const VASE_CONTOUR  = '#7A4E1C';

// 花瓶釉色（隨機挑選）
const VASE_STYLES = [
  { name:'米黃陶', w:34, upper:VASE_UPPER, lower:VASE_LOWER, accent:'#5A6E9E' },
  { name:'青瓷',   w:22, upper:['#BFD8C8','#CDE2D4','#AECDBA'], lower:['#8FB89E','#7DA88C','#9FC4AC'], accent:'#3E6450' },
  { name:'藍灰釉', w:22, upper:['#A8B8C8','#B8C8D8','#98AABC'], lower:['#6E8298','#5E7288','#7E92A8'], accent:'#2E4258' },
  { name:'赤陶',   w:22, upper:['#D8956A','#E2A578','#CC8A5E'], lower:['#B06A40','#A05E38','#C07A4C'], accent:'#5E3018' },
];
// 瓶形
const VASE_SHAPES = [
  { key:'ginger', name:'薑罐', w:30 },
  { key:'round',  name:'圓罐', w:28 },
  { key:'tall',   name:'高瓶', w:22 },
  { key:'jug',    name:'闊口壺', w:20 },
];

// --- 花朵型態 ---
const KINDS = ['full', 'shaggy', 'droop', 'seed'];
const KIND_W = [42, 25, 15, 18];

let tone;
let flowers = [];
let tasks = [];
let taskIdx = 0;
let perFrame = 40;
let pg;
let finished = false;
let vase, tableY;
const BOUQUET = { cx: 0, cy: 0, rx: 0, ry: 0 };

// ════════════════ 工具 ════════════════
function weightedPick(items, weights){
  const total = weights.reduce((a,b)=>a+b,0);
  let r = rand()*total;
  for(let i=0;i<items.length;i++){
    r -= weights[i];
    if(r<0) return items[i];
  }
  return items[items.length-1];
}
const rr = (a,b)=>a+rand()*(b-a);
const ri = (a,b)=>Math.floor(rr(a,b+1));
const pick = arr=>arr[Math.floor(rand()*arr.length)];

// ── 色彩（RGB，移植自 oil-paint）──
function hexRGB(hex){
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function lighten(rgb,t){
  return [Math.round(rgb[0]+(255-rgb[0])*t), Math.round(rgb[1]+(255-rgb[1])*t), Math.round(rgb[2]+(255-rgb[2])*t)];
}
function darken(rgb,t){
  return [Math.round(rgb[0]*(1-t)), Math.round(rgb[1]*(1-t)), Math.round(rgb[2]*(1-t))];
}
function mixRGB(a,b,t){
  return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
}
function jitterCol(rgb,amt){
  const d = ()=>(rand()-0.5)*2*amt*255;
  return [clamp255(rgb[0]+d()), clamp255(rgb[1]+d()), clamp255(rgb[2]+d())];
}
function clamp255(x){ return Math.max(0, Math.min(255, Math.round(x))); }

// ════════════════ 厚塗筆觸引擎（oil-paint 移植版）════════════════
// 一筆 = 陰影板 → 暗底板 → 主體板 → 鬃毛紋 → 高光稜 → 暗稜 → 中央反光帶 → 邊緣碎屑

function bezPt(s,t){
  const u = 1-t;
  return {
    x: u*u*u*s.x1 + 3*u*u*t*s.cpx1 + 3*u*t*t*s.cpx2 + t*t*t*s.x2,
    y: u*u*u*s.y1 + 3*u*u*t*s.cpy1 + 3*u*t*t*s.cpy2 + t*t*t*s.y2,
  };
}

// 寬度輪廓
function widthProfile(profile, w){
  if(profile==='taper'){
    // 細長葉／莖：基部寬 → 尖端細
    return t=>{
      const u = Math.max(0.001, Math.min(0.999, t));
      const ramp = u<0.06 ? 0.7+0.3*(u/0.06) : 1;
      return w * ramp * (1 - 0.72*Math.pow(u,1.25));
    };
  }
  if(profile==='petal'){
    // 花瓣：杏仁形 — 基部略窄 → 中段最飽滿 → 尖端收尖
    return t=>{
      const u = Math.max(0.001, Math.min(0.999, t));
      const env = Math.pow(Math.sin(Math.min(1, u*1.06)*Math.PI), 0.7);
      const tip = u>0.85 ? 1-(u-0.85)/0.15*0.72 : 1;
      return w * (0.30 + 0.78*env) * tip;
    };
  }
  // square：方頭起筆、漸窄收筆（oil-paint 原版）
  return t=>{
    const u = Math.max(0.001, Math.min(0.999, t));
    let startRamp = u<0.08 ? 0.62+0.40*(u/0.08) : 1;
    if(startRamp>1) startRamp = 1;
    const endTaper = u<0.7 ? 1 : 1-Math.pow((u-0.7)/0.3,1.1)*0.58;
    return w*0.95*startRamp*Math.max(0.30,endTaper);
  };
}

function renderImpasto(s){
  const len = Math.hypot(s.x2-s.x1, s.y2-s.y1);
  const N = Math.max(8, Math.min(28, Math.floor(len/6)));
  const samples = [];
  for(let i=0;i<=N;i++) samples.push(bezPt(s, i/N));
  impastoLayers(samples, s);
}

// 共用的八層 impasto 繪製；samples 可以來自 bezier 或流場路徑
function impastoLayers(samples, s){
  const N = samples.length-1;
  if(N<3) return;
  const perps = [];
  for(let i=0;i<=N;i++){
    const prev = samples[Math.max(0,i-1)], nxt = samples[Math.min(N,i+1)];
    const dx = nxt.x-prev.x, dy = nxt.y-prev.y;
    const l = Math.hypot(dx,dy)||1;
    perps.push({ x:-dy/l, y:dx/l });
  }

  const col = s.col;
  const widthAt = widthProfile(s.profile, s.width);
  const edgeJ = Math.max(1.2, s.width*0.06);

  pg.noStroke();
  // 簡化模式（打底用）：只畫暗底 + 主體兩層色板
  if(s.simple){
    const lo0 = darken(col,0.22);
    pg.fill(lo0[0],lo0[1],lo0[2],255);
    drawSlab(samples,perps,t=>widthAt(t)*1.02, 0,0, edgeJ);
    const jc0 = jitterCol(col,0.05);
    pg.fill(jc0[0],jc0[1],jc0[2],255);
    drawSlab(samples,perps,t=>widthAt(t)*0.9, 0,0, edgeJ*0.9);
    return;
  }
  // (1) 投影
  if(s.shadow!==false){
    pg.fill(15,15,15,60);
    drawSlab(samples,perps,widthAt, s.width*0.16+1, s.width*0.2+1.2, edgeJ);
  }
  // (2) 暗底
  const lo = darken(col,0.28);
  pg.fill(lo[0],lo[1],lo[2],255);
  drawSlab(samples,perps,t=>widthAt(t)*1.02, 0,0, edgeJ);
  // (3) 主體
  const jc = jitterCol(col,0.05);
  pg.fill(jc[0],jc[1],jc[2],255);
  drawSlab(samples,perps,t=>widthAt(t)*0.92, 0,0, edgeJ*0.9);
  // (4) 鬃毛紋
  const bristleCount = Math.max(3, Math.min(10, Math.floor(s.width/3.2)));
  for(let b=0;b<bristleCount;b++){
    drawBristle(samples,perps,(b+0.5)/bristleCount-0.5, col, widthAt);
  }
  // (5)(6) 高光稜 + 暗稜
  if(N>=10){
    const hi = lighten(col,0.55);
    drawRim(samples,perps, 0.36, hi, 200, widthAt, Math.max(1.1, s.width*0.07));
    const deep = darken(col,0.55);
    drawRim(samples,perps,-0.40, deep, 175, widthAt, Math.max(1.0, s.width*0.06));
    // (6.5) 中央反光帶
    drawCenterBand(samples,perps,col,widthAt, Math.max(1.2, s.width*0.09));
  }
  // (7) 邊緣碎屑
  if(s.flecks!==false && rand()<0.6) edgeFlecks(samples,perps,col,s.width,widthAt);
}

function drawSlab(samples,perps,widthFn,ox,oy,edgeJ){
  const N = samples.length-1;
  const capSteps = 6;
  pg.beginShape();
  for(let i=0;i<=N;i++){
    const w = widthFn(i/N)*0.5;
    pg.vertex(samples[i].x+perps[i].x*w+(rand()-0.5)*edgeJ+ox,
              samples[i].y+perps[i].y*w+(rand()-0.5)*edgeJ+oy);
  }
  const rE = widthFn(1)*0.5, pE = perps[N], tE = {x:pE.y, y:-pE.x};
  for(let c=1;c<capSteps;c++){
    const th = (c/capSteps)*Math.PI, ct = Math.cos(th), st = Math.sin(th);
    pg.vertex(samples[N].x+rE*(pE.x*ct+tE.x*st)+ox, samples[N].y+rE*(pE.y*ct+tE.y*st)+oy);
  }
  for(let i=N;i>=0;i--){
    const w = widthFn(i/N)*0.5;
    pg.vertex(samples[i].x-perps[i].x*w+(rand()-0.5)*edgeJ+ox,
              samples[i].y-perps[i].y*w+(rand()-0.5)*edgeJ+oy);
  }
  const rS = widthFn(0)*0.5, pS = perps[0], tS = {x:pS.y, y:-pS.x};
  for(let c=1;c<capSteps;c++){
    const th = (c/capSteps)*Math.PI, ct = Math.cos(th), st = Math.sin(th);
    pg.vertex(samples[0].x+rS*(-pS.x*ct-tS.x*st)+ox, samples[0].y+rS*(-pS.y*ct-tS.y*st)+oy);
  }
  pg.endShape(CLOSE);
}

function drawBristle(samples,perps,offFrac,baseCol,widthFn){
  const N = samples.length-1;
  let jc = jitterCol(baseCol,0.14);
  const blend = Math.max(-1, Math.min(1, -offFrac*2));
  jc = mixRGB(jc, blend>0 ? lighten(baseCol,0.45) : darken(baseCol,0.45), Math.abs(blend)*0.4);

  const alpha = 180 + Math.floor(rand()*55);
  const wt = Math.max(0.7, 1.0+(rand()-0.5)*0.7);
  const wobble = (rand()-0.5)*0.08;

  pg.noFill();
  pg.stroke(jc[0],jc[1],jc[2],alpha);
  pg.strokeWeight(wt);
  pg.strokeCap(ROUND);

  let inShape = false, skipUntil = -1;
  for(let i=0;i<=N;i++){
    if(i<=skipUntil) continue;
    const t = i/N;
    if(t>0.15 && t<0.85 && rand()<0.02){
      if(inShape){ pg.endShape(); inShape = false; }
      skipUntil = i+1+Math.floor(rand()*3);
      continue;
    }
    const w = widthFn(t);
    const off = (offFrac+wobble)*w*0.78;
    if(!inShape){ pg.beginShape(); inShape = true; }
    pg.vertex(samples[i].x+perps[i].x*off+(rand()-0.5)*w*0.07,
              samples[i].y+perps[i].y*off+(rand()-0.5)*w*0.07);
  }
  if(inShape) pg.endShape();
  pg.noStroke();
}

function drawRim(samples,perps,offFrac,col,alpha,widthFn,weight){
  const N = samples.length-1;
  pg.noFill();
  pg.stroke(col[0],col[1],col[2],alpha);
  pg.strokeWeight(weight);
  pg.strokeCap(ROUND);
  pg.beginShape();
  for(let i=2;i<=N-2;i++){
    const w = widthFn(i/N);
    pg.vertex(samples[i].x+perps[i].x*offFrac*w, samples[i].y+perps[i].y*offFrac*w);
  }
  pg.endShape();
  pg.noStroke();
}

function drawCenterBand(samples,perps,baseCol,widthFn,weight){
  const N = samples.length-1;
  const band = lighten(baseCol,0.42);
  pg.noFill();
  pg.stroke(band[0],band[1],band[2],185);
  pg.strokeWeight(weight);
  pg.strokeCap(ROUND);
  pg.beginShape();
  const i0 = Math.floor(N*0.1), i1 = Math.floor(N*0.9);
  for(let i=i0;i<=i1;i++){
    const w = widthFn(i/N);
    pg.vertex(samples[i].x+perps[i].x*w*0.08+(rand()-0.5)*w*0.04,
              samples[i].y+perps[i].y*w*0.08+(rand()-0.5)*w*0.04);
  }
  pg.endShape();
  pg.noStroke();
}

function edgeFlecks(samples,perps,col,baseW,widthFn){
  const N = samples.length-1;
  pg.noStroke();
  for(let i=1;i<N;i++){
    if(rand()>0.18) continue;
    const t = i/N, w = widthFn(t);
    const side = rand()<0.5?1:-1;
    const off = w*0.5*(1+rand()*0.4)*side;
    const x = samples[i].x+perps[i].x*off+(rand()-0.5)*w*0.25;
    const y = samples[i].y+perps[i].y*off+(rand()-0.5)*w*0.25;
    const r = baseW*0.1*Math.pow(rand(),1.5);
    pg.push();
    pg.translate(x,y); pg.rotate(rand()*Math.PI*2);
    pg.fill(col[0],col[1],col[2],210);
    pg.ellipse(0,0,Math.max(0.5,r*(0.7+rand()*0.7)),Math.max(0.4,r*(0.3+rand()*0.5)));
    pg.pop();
  }
}

// ════════════════ 流場（星夜的流動感）════════════════
// 筆觸方向 = noise 基底亂流 + 漩渦切線 + 花束輪廓繞流
let vortices = [];

function blendAngle(a, b, t){
  const d = Math.atan2(Math.sin(b-a), Math.cos(b-a));
  return a + d*t;
}

function flowAngle(x, y){
  if(y > tableY){
    // 桌面：近水平、輕微波動
    return (noise(x*0.004, y*0.004)-0.5)*0.5;
  }
  // 牆面基底：緩慢起伏的亂流
  let a = (noise(x*0.0016, y*0.0016)-0.5)*3.2;
  // 花束輪廓繞流：靠近花束時轉向切線方向（光暈效果）
  const ddx = (x-BOUQUET.cx)/(BOUQUET.rx*1.35);
  const ddy = (y-BOUQUET.cy)/(BOUQUET.ry*1.35);
  const dd = Math.hypot(ddx, ddy);
  if(dd < 1.8){
    const tangent = Math.atan2(ddy, ddx) + Math.PI/2;
    const w = Math.max(0, 1 - Math.abs(dd-1.05)/0.75);
    a = blendAngle(a, tangent, w*0.8);
  }
  // 漩渦
  for(const v of vortices){
    const dx = x-v.x, dy = y-v.y;
    const d = Math.hypot(dx, dy);
    if(d < v.r){
      const t = Math.atan2(dy, dx) + (Math.PI/2)*v.s;
      const w = Math.pow(1 - d/v.r, 0.65);
      a = blendAngle(a, t, w*0.92);
    }
  }
  return a;
}

// 漩渦影響權重（用來提亮漩渦內的筆觸，做出星夜的亮帶）
function vortexGlow(x, y){
  let g = 0;
  for(const v of vortices){
    const d = Math.hypot(x-v.x, y-v.y);
    if(d < v.r) g = Math.max(g, Math.pow(1-d/v.r, 0.8));
  }
  return g;
}

// 沿流場追蹤一條路徑（yMin/yMax：不可跨越的區域邊界，例如牆/桌分界）
function traceFlow(x0, y0, steps, stepLen, yMin=-1e9, yMax=1e9){
  const pts = [{x:x0, y:y0}];
  let x = x0, y = y0;
  let pa = flowAngle(x, y);
  for(let i=0;i<steps;i++){
    const a = blendAngle(pa, flowAngle(x, y), 0.55);  // 平滑轉向避免折角
    const nx2 = x + Math.cos(a)*stepLen + rr(-1.2,1.2);
    const ny2 = y + Math.sin(a)*stepLen + rr(-1.2,1.2);
    if(ny2 < yMin || ny2 > yMax) break;   // 碰到邊界就收筆
    x = nx2; y = ny2;
    pts.push({x, y});
    pa = a;
  }
  return pts;
}

// 流場筆觸任務
function addFlowStroke(x0, y0, opts){
  const o = opts||{};
  const pts = traceFlow(x0, y0, o.steps||ri(5,9), o.stepLen||rr(9,13),
                        o.yMin!==undefined?o.yMin:-1e9, o.yMax!==undefined?o.yMax:1e9);
  if(pts.length < 4) return;   // 被邊界截太短的就不畫
  const s = {
    width: o.w||10,
    col: Array.isArray(o.col) ? o.col : hexRGB(o.col||'#E8A317'),
    profile: o.profile||'square',
    shadow: o.shadow,
    flecks: o.flecks,
    simple: o.simple,
  };
  tasks.push(()=>impastoLayers(pts, s));
}

// ── 筆觸任務工廠 ──
// bend 為彎曲量；bend2 不給則自動衍生（S 形微扭）
function addPaint(x1,y1,x2,y2,opts){
  const o = opts||{};
  const dx = x2-x1, dy = y2-y1;
  const len = Math.hypot(dx,dy)||1;
  const nx = -dy/len, ny = dx/len;
  const bend = o.bend!==undefined ? o.bend : (rand()-0.5)*len*0.25;
  const bend2 = o.bend2!==undefined ? o.bend2 : bend*rr(0.3,0.8)*(rand()<0.3?-1:1);
  const s = {
    x1,y1,x2,y2,
    cpx1: x1+dx*0.3+nx*bend2, cpy1: y1+dy*0.3+ny*bend2,
    cpx2: x1+dx*0.7+nx*bend,  cpy2: y1+dy*0.7+ny*bend,
    width: o.w||10,
    col: Array.isArray(o.col) ? o.col : hexRGB(o.col||'#E8A317'),
    profile: o.profile||'square',
    shadow: o.shadow,
    flecks: o.flecks,
  };
  tasks.push(()=>renderImpasto(s));
}

// ════════════════ 場景生成 ════════════════
function generateScene(){
  tasks = []; taskIdx = 0; finished = false;
  tone = weightedPick(TONES, TONES.map(t=>t.w));

  tableY = PH*rr(0.78,0.82);

  // 花瓶：瓶形 × 釉色 × 裝飾 隨機組合
  const shape = weightedPick(VASE_SHAPES, VASE_SHAPES.map(s=>s.w));
  const style = weightedPick(VASE_STYLES, VASE_STYLES.map(s=>s.w));
  const dims = {
    ginger: { neck:[0.15,0.18], belly:[0.27,0.32] },
    round:  { neck:[0.20,0.24], belly:[0.30,0.36] },
    tall:   { neck:[0.16,0.20], belly:[0.21,0.26] },
    jug:    { neck:[0.16,0.20], belly:[0.26,0.31] },   // jug: belly=口寬、neck=足寬
  }[shape.key];
  vase = {
    shape: shape.key, shapeName: shape.name, style,
    cx: PW*0.5 + rr(-14,14),
    top: PH*rr(0.60,0.63),
    bot: PH*rr(0.875,0.895),
    neckW: PW*rr(dims.neck[0], dims.neck[1]),
    bellyW: PW*rr(dims.belly[0], dims.belly[1]),
    midT: rand()<0.75 ? rr(0.38,0.58) : null,           // 兩段式釉色分界（25% 單色）
    deco: weightedPick(['none','bands','wave','dots'], [25,30,25,20]),
  };
  vase.mouthW = 2*vaseR(0);

  BOUQUET.cx = PW*0.5; BOUQUET.cy = PH*0.37;
  BOUQUET.rx = PW*0.375; BOUQUET.ry = PH*0.27;

  genUnderpaint();
  genBackground();
  genTable();
  genFlowers();
  genStems();
  genVase();
  genFlowerStrokes();
  genGrain();

  const counts = { full:0, shaggy:0, droop:0, seed:0 };
  flowers.forEach(f=>counts[f.kind]++);
  window.$fxhashFeatures = {
    '色調': tone.name,
    '花朵數': flowers.length,
    '滿開': counts.full + counts.shaggy,
    '垂首': counts.droop,
    '結籽': counts.seed,
    '漩渦': vortices.length,
    '瓶形': vase.shapeName,
    '瓶釉': vase.style.name + (vase.deco!=='none' ? `（${{bands:'橫帶',wave:'波紋',dots:'圓點'}[vase.deco]}）` : ''),
  };
  console.log('fxhash:', fxhash);
  console.log('features:', window.$fxhashFeatures);

  perFrame = Math.ceil(tasks.length/230);   // 約 4 秒畫完
}

// ── 打底厚塗層：抖動網格佈點 + 超寬筆觸，保證畫面被顏料完全覆蓋 ──
// （網格間距 < 筆觸寬度，數學上不可能露出畫布）
function genUnderpaint(){
  // 最底層保險：先以打底色平塗（會被筆觸完全蓋掉，僅防極端縫隙）
  const wallBase = darken(hexRGB(tone.wall[0]), 0.08);
  const tableBase = darken(hexRGB(tone.table[0]), 0.10);
  const ty = tableY;
  tasks.push(()=>{
    pg.noStroke();
    pg.fill(wallBase[0], wallBase[1], wallBase[2]);
    pg.rect(0, 0, PW, ty);
    pg.fill(tableBase[0], tableBase[1], tableBase[2]);
    pg.rect(0, ty, PW, PH-ty);
  });
  // 牆面打底筆觸：18px 抖動網格、寬 24-32 肥筆（間距 < 筆寬 → 必定無縫）
  // 不越過牆/桌分界（yMax）
  for(let gy=-30; gy<ty-4; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x = gx+rr(-5,5), y = Math.min(gy+rr(-5,5), ty-5);
      addFlowStroke(x, y, {
        w: rr(24,32),
        col: jitterCol(darken(hexRGB(pick(tone.wall)), rr(0.04,0.12)), 0.04),
        steps: ri(4,6), stepLen: rr(11,14),
        yMax: ty-2,
        shadow:false, flecks:false, simple:true,
      });
    }
  }
  // 桌面打底（不越過分界往上）
  for(let gy=ty-2; gy<PH+20; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x = gx+rr(-5,5), y = Math.max(gy+rr(-5,5), ty-2);
      addFlowStroke(x, y, {
        w: rr(24,32),
        col: jitterCol(darken(hexRGB(pick(tone.table)), rr(0.04,0.12)), 0.04),
        steps: ri(4,6), stepLen: rr(11,14),
        yMin: ty-4,
        shadow:false, flecks:false, simple:true,
      });
    }
  }
}

// ── 背景牆面：流場驅動的蜿蜒筆觸（星夜手法）──
function genBackground(){
  // 放 2-4 個漩渦在牆面（避開花束正中央）
  vortices = [];
  const nV = ri(2,4);
  let guard = 0;
  while(vortices.length<nV && guard<80){
    guard++;
    const x = rr(PW*0.06, PW*0.94);
    const y = rr(PH*0.05, tableY*0.72);
    const dB = Math.hypot((x-BOUQUET.cx)/BOUQUET.rx, (y-BOUQUET.cy)/BOUQUET.ry);
    if(dB < 0.85) continue;   // 太靠近花束中心
    vortices.push({ x, y, r: rr(95,185), s: rand()<0.5?1:-1 });
  }

  // 主層：覆蓋整個牆面的流場筆觸（yMax 擋在分界線上）
  const n = 1500;
  for(let i=0;i<n;i++){
    const x = rr(-20, PW+20);
    const y = rr(-20, tableY-6);
    let col = jitterCol(hexRGB(pick(tone.wall)), 0.05);
    // 漩渦內側提亮 → 星夜的發光感
    const g = vortexGlow(x, y);
    if(g > 0.25) col = lighten(col, g*0.22);
    addFlowStroke(x, y, {
      w: rr(8,13), col,
      steps: ri(5,9), stepLen: rr(9,13),
      yMax: tableY-2,
      shadow:false, flecks:false,
    });
  }
  // 亮色細streak層：跟著場線的高光短筆，畫龍點睛
  const nA = ri(120,170);
  for(let i=0;i<nA;i++){
    const x = rr(0, PW), y = rr(0, tableY-8);
    const g = vortexGlow(x, y);
    if(g < 0.15 && rand()<0.6) continue;   // 偏好畫在漩渦帶上
    addFlowStroke(x, y, {
      w: rr(4,6.5),
      col: lighten(jitterCol(hexRGB(pick(tone.wall)),0.06), 0.3+g*0.2),
      steps: ri(4,7), stepLen: rr(8,11),
      yMax: tableY-2,
      shadow:false, flecks:false,
    });
  }
}

// ── 桌面：近水平流場 ──
function genTable(){
  const n = 560;
  for(let i=0;i<n;i++){
    const x = rr(-20, PW+20);
    const y = rr(tableY, PH+14);
    // noise 色域：相鄰區域用相近顏料 → 色斑成片，不是均勻雜訊
    let col;
    if(rand() < 0.13){
      col = hexRGB(pick(tone.tableAccent));        // 點綴色：橄欖綠、鏽紅
    } else {
      const zone = noise(x*0.006, y*0.008);
      const idx = Math.max(0, Math.min(tone.table.length-1,
        Math.floor(zone*tone.table.length + rr(-0.6,0.6))));
      col = hexRGB(tone.table[idx]);
    }
    // 深度漸層：近處（下緣）漸深、靠分界線略亮
    const depth = (y-tableY)/(PH-tableY);
    col = depth>0.5 ? darken(col, (depth-0.5)*0.28) : lighten(col, (0.5-depth)*0.16);
    // 長短筆混合：35% 長掃筆、其餘短抹
    const isLong = rand()<0.35;
    addFlowStroke(x, y, {
      w: isLong ? rr(8,12) : rr(10,16),
      col: jitterCol(col,0.06),
      steps: isLong ? ri(9,14) : ri(3,6),
      stepLen: rr(9,14),
      yMin: tableY-2,
      shadow:false, flecks:false,
    });
  }
  // 花瓶投影：瓶底斜向擴散的深色橫筆，把瓶子「壓」在桌上
  const shadowSide = rand()<0.5 ? -1 : 1;
  const nSh = ri(14,20);
  for(let i=0;i<nSh;i++){
    const sy = vase.bot + rr(0, 34);
    const spread = 0.35 + (sy-vase.bot)/34*0.55;
    const sx = vase.cx + shadowSide*rr(0, vase.bellyW*spread) - shadowSide*rr(0,20);
    const len = rr(30,70)*(1-(sy-vase.bot)/40*0.4);
    addPaint(sx-len/2, sy+rr(-2,2), sx+len/2, sy+rr(-3,3),
      { w: rr(8,13),
        col: darken(jitterCol(hexRGB(pick(tone.table)),0.05), rr(0.3,0.48)),
        bend: rr(-5,5), shadow:false, flecks:false });
  }
  // 桌沿分界：厚實的雙層油彩色帶
  // 下層：寬深色帶（顏料厚抹）
  let x = -14;
  while(x<PW+14){
    const len = rr(80,140);
    addPaint(x, tableY+rr(-3,3), x+len, tableY+rr(-4,4),
      { w: rr(11,16), col: jitterCol(hexRGB(tone.line),0.06),
        bend: rr(-7,7), shadow:false });
    x += len*rr(0.6,0.85);
  }
  // 上層：略亮的窄帶疊在上緣，做出顏料堆疊的稜
  x = -10;
  while(x<PW+10){
    const len = rr(60,110);
    addPaint(x, tableY-rr(4,7), x+len, tableY-rr(3,7),
      { w: rr(6,9), col: lighten(jitterCol(hexRGB(tone.line),0.06),0.25),
        bend: rr(-5,5), shadow:false, flecks:false });
    x += len*rr(0.75,1.05);
  }
}

// ── 花瓶輪廓：依瓶形回傳 t(0頂→1底) 處的半寬 ──
function vaseR(t){
  const neck = vase.neckW/2, belly = vase.bellyW/2;
  switch(vase.shape){
    case 'round': {   // 圓罐：寬口、渾圓鼓腹
      const k = Math.min(1, t*1.1);
      return neck + (belly-neck)*Math.pow(Math.sin(k*Math.PI*0.62), 1.1);
    }
    case 'tall': {    // 高瓶：近直筒、微鼓
      return neck + (belly-neck)*Math.sin(Math.min(1,t*1.3)*Math.PI*0.5);
    }
    case 'jug': {     // 闊口壺：上寬下窄、底部微外翻
      const base = belly - (belly-neck)*Math.pow(t,1.15);
      const flare = t>0.9 ? (t-0.9)/0.1*neck*0.18 : 0;
      return base + flare;
    }
    default: {        // 薑罐（原版）：窄頸鼓腹
      if(t<0.18) return neck*(1-t*0.5);
      const k = (t-0.18)/0.82;
      return neck*0.91 + (belly-neck*0.91)*Math.sin(Math.min(1,k*1.25)*Math.PI*0.62);
    }
  }
}

function genVase(){
  const h = vase.bot-vase.top;
  const st = vase.style;
  const contourCol = darken(hexRGB(st.lower[0]), 0.45);
  const midT = vase.midT;
  // 瓶形打底：沿輪廓的實心多邊形（深釉色），筆觸縫隙不會露出背景
  const baseSteps = 30;
  const drawVaseBase = (tA, tB, col)=>{
    pg.noStroke();
    pg.fill(col[0], col[1], col[2], 255);
    pg.beginShape();
    for(let i=0;i<=baseSteps;i++){
      const t = tA + (tB-tA)*(i/baseSteps);
      pg.vertex(vase.cx - vaseR(t)*0.99, vase.top+h*t);
    }
    for(let i=baseSteps;i>=0;i--){
      const t = tA + (tB-tA)*(i/baseSteps);
      pg.vertex(vase.cx + vaseR(t)*0.99, vase.top+h*t);
    }
    pg.endShape(CLOSE);
  };
  {
    const upBase = darken(hexRGB(st.upper[0]), 0.14);
    const loBase = darken(hexRGB(st.lower[0]), 0.14);
    tasks.push(()=>{
      if(midT!==null){
        drawVaseBase(0, midT, upBase);
        drawVaseBase(midT, 1, loBase);
      } else {
        drawVaseBase(0, 1, loBase);
      }
    });
  }

  // 形體填色：短弧筆觸層層交疊，邊緣漸暗做出圓潤形體
  // （取代整齊的長直筆觸——每筆長度、位置、角度都不同）
  for(let pass=0; pass<2; pass++){
    for(let fx=-1; fx<=1.001; fx+=0.13){
      let t = rr(-0.05, 0.05);
      while(t < 1){
        const t1 = Math.min(1, Math.max(t,0) + rr(0.18, 0.38));
        const t0 = Math.max(0, t);
        const w = rr(11,17);
        // 中心線上限依筆寬動態收斂：中心線 + 半筆寬不得超出輪廓
        const rAvg = (vaseR(t0)+vaseR(t1))/2;
        const maxFx = Math.max(0.2, 1 - (w*0.7)/rAvg);
        const fxj = Math.max(-maxFx, Math.min(maxFx, fx + rr(-0.06,0.06)));
        const y0 = vase.top+h*t0, y1 = vase.top+h*t1;
        const x0 = vase.cx+vaseR(t0)*fxj;
        const x1 = vase.cx+vaseR(t1)*fxj;
        // 用筆觸中點決定釉色段 → 分界處自然參差
        const palSeg = (midT!==null && (t0+t1)/2 < midT) ? st.upper : st.lower;
        let col = hexRGB(pick(palSeg));
        // 左受光、右陰影
        if(fxj<-0.25) col = lighten(col, 0.16*(-fxj));
        else if(fxj>0.3) col = darken(col, 0.2*fxj);
        // 越靠輪廓越深 → 形體陰影與勾邊自然融合
        const edge = Math.abs(fxj);
        if(edge>0.66) col = darken(col, (edge-0.66)*0.85);
        // 彎度整體乘上邊緣收斂係數：靠輪廓的筆觸幾乎打直，不會凸出
        const bendRange = (1-edge*0.7);
        addPaint(x0,y0,x1,y1,
          { w, col: jitterCol(col,0.05),
            bend: (fxj*-7 + rr(-4,4)) * bendRange, shadow:false });
        if(t1 >= 1) break;
        t = t1 - rr(0, 0.06);
      }
    }
  }
  // 兩段式分界橫線：粗筆厚抹
  if(midT!==null){
    const yMid = vase.top+h*midT;
    addPaint(vase.cx-vaseR(midT)*0.9, yMid, vase.cx+vaseR(midT)*0.9, yMid+rr(-3,3),
      { w: rr(9,13), col: contourCol, bend: rr(3,8), shadow:false });
  }
  // 裝飾紋樣
  genVaseDeco(contourCol);
  // 瓶口：厚實的一抹
  addPaint(vase.cx-vase.mouthW/2, vase.top, vase.cx+vase.mouthW/2, vase.top+rr(-2,2),
    { w: rr(10,14), col: jitterCol(hexRGB(pick(st.upper)),0.05), bend: rr(-7,-3), shadow:false });
  addPaint(vase.cx-vase.mouthW/2*0.85, vase.top+5, vase.cx+vase.mouthW/2*0.85, vase.top+5+rr(-2,2),
    { w: rr(5,8), col: darken(hexRGB(pick(st.upper)),0.3), bend: rr(-5,-2), shadow:false, flecks:false });
  // 軟勾邊：斷續、寬度不一、顏色混入瓶身色、略偏內側
  // （不是一圈均勻的硬線，而是和填色融在一起的厚邊）
  for(let side=-1; side<=1; side+=2){
    let t = rr(0, 0.12);
    while(t < 1){
      const t1 = Math.min(1, t + rr(0.12, 0.28));
      if(rand() < 0.8){          // 兩成留空隙，讓填色露出來
        const w = rr(6,13);
        // 內縮量依筆寬動態計算，整支筆（含寬度）都收在輪廓內
        const rAvg = (vaseR(t)+vaseR(t1))/2;
        const inset = Math.min(0.96, 1 - (w*0.65)/rAvg) * rr(0.96,1.0);
        const palSeg = (midT!==null && (t+t1)/2 < midT) ? st.upper : st.lower;
        const fillCol = hexRGB(pick(palSeg));
        const col = mixRGB(contourCol, darken(fillCol,0.3), rr(0.25,0.5));
        addPaint(
          vase.cx+vaseR(t)*side*inset,  vase.top+h*t,
          vase.cx+vaseR(t1)*side*inset, vase.top+h*t1,
          { w, col: jitterCol(col,0.06),
            bend: side*rr(-4,1), shadow:false });   // 貼著輪廓的微弧（≤4px）
      }
      if(t1 >= 1) break;
      t = t1 - rr(0, 0.04);
    }
  }
  // 底部陰影：寬筆
  for(let i=0;i<3;i++){
    addPaint(vase.cx-vase.bellyW*0.3, vase.bot+4+i*5,
             vase.cx+vase.bellyW*rr(0.2,0.32), vase.bot+5+i*5,
      { w: rr(9,13), col: darken(hexRGB(pick(tone.table)),0.35), bend: rr(2,7), shadow:false, flecks:false });
  }
}

// ── 花瓶裝飾紋樣：橫帶 / 波浪線 / 圓點 ──
function genVaseDeco(contourCol){
  const h = vase.bot-vase.top;
  const accent = hexRGB(vase.style.accent);
  if(vase.deco==='bands'){
    const nB = ri(1,3);
    for(let i=0;i<nB;i++){
      const tb = rr(0.52,0.85);
      const yb = vase.top+h*tb;
      const w2 = vaseR(tb)*0.88;
      addPaint(vase.cx-w2, yb, vase.cx+w2, yb+rr(-3,3),
        { w: rr(8,12), col: jitterCol(rand()<0.6?accent:contourCol,0.06),
          bend: rr(3,8), shadow:false });
    }
  } else if(vase.deco==='wave'){
    const tb = rr(0.5,0.72);
    const yb = vase.top+h*tb;
    const w2 = vaseR(tb)*0.85;
    const segN = 6;
    for(let i=0;i<segN;i++){
      const xa = vase.cx-w2 + (i/segN)*w2*2;
      const xb = vase.cx-w2 + ((i+1)/segN)*w2*2;
      const dir = i%2===0?-1:1;
      addPaint(xa, yb+dir*rr(3,6), xb, yb-dir*rr(3,6),
        { w: rr(6,9), col: jitterCol(accent,0.06),
          bend: dir*rr(5,10), shadow:false, flecks:false });
    }
  } else if(vase.deco==='dots'){
    const tb = rr(0.55,0.78);
    const yb = vase.top+h*tb;
    const w2 = vaseR(tb)*0.75;
    const nD = ri(4,7);
    tasks.push(()=>{
      pg.noStroke();
      for(let i=0;i<nD;i++){
        const dx = vase.cx-w2 + ((i+0.5)/nD)*w2*2;
        const sz = rr(7,11);
        pg.fill(accent[0],accent[1],accent[2],235);
        pg.ellipse(dx+rr(-2,2), yb+rr(-4,4), sz, sz*rr(0.85,1));
        pg.fill(Math.min(255,accent[0]+50),Math.min(255,accent[1]+50),Math.min(255,accent[2]+50),180);
        pg.ellipse(dx-sz*0.18, yb-sz*0.18, sz*0.35, sz*0.3);
      }
    });
  }
}

// ── 花朵佈局：更大、更滿的花頭 ──
function genFlowers(){
  flowers = [];
  const n = ri(9,12);
  let guard = 0;
  while(flowers.length<n && guard<1200){
    guard++;
    const a = rand()*Math.PI*2;
    const d = Math.sqrt(rand());
    const x = BOUQUET.cx + Math.cos(a)*BOUQUET.rx*d;
    const y = BOUQUET.cy + Math.sin(a)*BOUQUET.ry*d;
    const cent = 1 - d*0.5;
    const r = rr(52,86)*cent + rr(0,12);
    if(flowers.some(f=>Math.hypot(f.x-x,f.y-y) < (f.r+r)*0.58)) continue;
    let kind = weightedPick(KINDS, KIND_W);
    if(kind==='droop' && y < BOUQUET.cy) kind = 'full';
    flowers.push({ x, y, r, kind, face: rand()<0.5?-1:1 });
  }
  // 趴在瓶口的垂首花（原作的經典元素），蓋住瓶口
  if(rand()<0.65){
    flowers.push({
      x: vase.cx + rr(-0.45,0.45)*vase.mouthW,
      y: vase.top + rr(-8,28),
      r: rr(52,72),
      kind: 'droop',
      face: rand()<0.5?-1:1,
    });
  }
  flowers.sort((a,b)=>a.y-b.y);
}

// ── 莖與葉 ──
function genStems(){
  const mouthY = vase.top+6;
  const stemPaths = [];   // 每條莖的取樣點，供葉子錨定
  for(const f of flowers){
    const sx = vase.cx + rr(-vase.mouthW*0.35, vase.mouthW*0.35);
    const col = hexRGB(pick(GREENS));
    // 主莖：二次曲線取樣（明確路徑，不交給 addPaint 內部隨機）
    const bend = (f.x-sx)*rr(-0.3,-0.12);
    const dx = f.x-sx, dy = f.y-mouthY;
    const len = Math.hypot(dx,dy)||1;
    const nx = -dy/len, ny = dx/len;
    const cpx = (sx+f.x)/2+nx*bend, cpy = (mouthY+f.y)/2+ny*bend;
    const steps = Math.max(6, Math.floor(len/14));
    const pts = [];
    for(let i=0;i<=steps;i++){
      const t = i/steps, u = 1-t;
      pts.push({
        x: u*u*sx + 2*u*t*cpx + t*t*f.x + rr(-1,1),
        y: u*u*mouthY + 2*u*t*cpy + t*t*f.y + rr(-1,1),
      });
    }
    tasks.push(()=>impastoLayers(pts, { width: rr(6,8), col, profile:'square', shadow:false }));
    // 淡色伴隨筆觸
    if(rand()<0.6){
      const ox = rr(-5,5), oy = rr(2,8);
      const pts2 = pts.map(p=>({x:p.x+ox, y:p.y+oy}));
      tasks.push(()=>impastoLayers(pts2,
        { width: rr(3.5,5), col: lighten(col,0.2), profile:'square', shadow:false, flecks:false }));
    }
    if(len > 60) stemPaths.push(pts);
  }
  // 鋸齒葉：錨定在莖上，從莖的某一點斜著長出
  const nLeaf = ri(4,7);
  for(let i=0;i<nLeaf && stemPaths.length>0;i++){
    const pts = pick(stemPaths);
    const k = ri(Math.floor(pts.length*0.25), Math.floor(pts.length*0.7));
    const p = pts[k];
    const pn = pts[Math.min(pts.length-1, k+1)];
    const stemA = Math.atan2(pn.y-p.y, pn.x-p.x);   // 莖的走向（朝花）
    const side = rand()<0.5?1:-1;
    const la = stemA + side*rr(0.6,1.2);            // 斜出莖身
    const llen = rr(36,68);
    const col = hexRGB(pick(GREENS));
    for(let j=0;j<3;j++){
      const sp = (j-1)*0.22;
      addPaint(p.x, p.y,
        p.x+Math.cos(la+sp)*llen*(1-Math.abs(sp)*0.7),
        p.y+Math.sin(la+sp)*llen*(1-Math.abs(sp)*0.7),
        { w: rr(7,11)*(1-Math.abs(sp)*0.5), col: jitterCol(col,0.08),
          bend: rr(10,24)*(j===0?-1:1), profile:'taper', shadow:false });
    }
  }
}

// ── 花朵 ──
function genFlowerStrokes(){
  for(const f of flowers){
    if(f.kind==='droop') genDroop(f);
    else genHead(f);
  }
}

// 一片飽滿的花瓣（杏仁形寬筆觸）
function petalStroke(cx, cy, base, a, len, w, col, bendMul=1){
  const tipA = a + rr(-0.15,0.15);
  addPaint(
    cx+Math.cos(a)*base, cy+Math.sin(a)*base,
    cx+Math.cos(tipA)*(base+len), cy+Math.sin(tipA)*(base+len),
    { w, col: jitterCol(col,0.05),
      bend: len*rr(0.08,0.3)*(rand()<0.5?-1:1)*bendMul,
      profile:'petal', shadow:false }
  );
}

function genHead(f){
  const { x, y, r, kind } = f;
  const discR = r*(kind==='seed'? 0.58 : 0.42);
  const shaggy = kind==='shaggy';

  if(kind!=='seed' || rand()<0.5){
    const base = discR*0.8;
    // (a) 底層暗瓣：半步錯位的深赭色瓣，墊出花頭的厚度
    const nU = ri(14,18);
    const phase0 = rand()*Math.PI*2;
    for(let i=0;i<nU;i++){
      const a = phase0 + ((i+0.5)/nU)*Math.PI*2 + rr(-0.1,0.1);
      const len = r*rr(1.0,1.35)*(shaggy?rr(1.1,1.5):1);
      const col = darken(hexRGB(pick(rand()<0.5?PETAL_DEEP:PETAL_YELLOWS)), rr(0.12,0.28));
      petalStroke(x, y, base, a, len, r*rr(0.28,0.36), col, shaggy?1.5:1);
    }
    // (b) 主層亮瓣：飽滿的杏仁形大瓣
    const nP = ri(18,24);
    const phase = phase0 + Math.PI/nP;
    for(let i=0;i<nP;i++){
      const a = phase + (i/nP)*Math.PI*2 + rr(-0.1,0.1);
      const lenMul = shaggy? rr(1.35,1.9) : rr(1.1,1.5);
      const len = r*lenMul*rr(0.9,1.1);
      const col = hexRGB(rand()<0.18 ? pick(PETAL_DEEP) : pick(PETAL_YELLOWS));
      petalStroke(x, y, base, a, len, r*rr(0.32,0.44), col, shaggy?1.4:1);
    }
    // (c) 內圈短橙瓣：寬厚、貼著花心
    const nI = ri(12,16);
    for(let i=0;i<nI;i++){
      const a = (i/nI)*Math.PI*2+rr(-0.15,0.15);
      petalStroke(x, y, discR*0.68, a, r*rr(0.4,0.62), r*rr(0.16,0.22),
        hexRGB(pick(INNER_ORANGE)));
    }
  } else {
    // 純結籽頭：外緣綠色苞片（也用飽滿的瓣形）
    const nB = ri(13,18);
    for(let i=0;i<nB;i++){
      const a = (i/nB)*Math.PI*2+rr(-0.12,0.12);
      petalStroke(x, y, discR*0.82, a, r*rr(0.32,0.58), r*rr(0.14,0.2),
        hexRGB(pick(GREENS)));
    }
  }

  // 花心：不透明底盤 + 多種筆觸、大小不一的籽粒
  const golden = Math.PI*(3-Math.sqrt(5));
  const nDots = Math.floor(discR*discR*0.16);
  const spin = rand()*Math.PI*2;
  const discBase = darken(hexRGB(pick(DISC_BROWNS)), rr(0.1,0.25));
  tasks.push(()=>{
    pg.noStroke();
    // (1) 不透明底盤：實心圓 + 不規則邊緣
    pg.fill(discBase[0],discBase[1],discBase[2],255);
    pg.ellipse(x, y, discR*2.04, discR*1.96);
    for(let i=0;i<26;i++){
      const a = (i/26)*Math.PI*2;
      pg.ellipse(x+Math.cos(a)*discR*0.96, y+Math.sin(a)*discR*0.92,
                 discR*rr(0.16,0.3), discR*rr(0.14,0.26));
    }
    // (2) 內部不透明大色斑：做出深淺區塊的顏料感
    for(let i=0;i<22;i++){
      const a = rand()*Math.PI*2, d = Math.pow(rand(),0.7);
      const col = i%3===0
        ? lighten(hexRGB(pick(DISC_BROWNS)), rr(0.05,0.2))
        : darken(hexRGB(pick(DISC_BROWNS)), rr(0,0.25));
      pg.push();
      pg.translate(x+Math.cos(a)*discR*0.72*d, y+Math.sin(a)*discR*0.68*d);
      pg.rotate(rand()*Math.PI);
      pg.fill(col[0],col[1],col[2],255);
      pg.ellipse(0,0, discR*rr(0.25,0.5), discR*rr(0.18,0.35));
      pg.pop();
    }
    // (3) 籽粒：phyllotaxis 排列，三種筆觸混合、外緣較大
    for(let i=0;i<nDots;i++){
      const t = i/nDots;
      const a = spin + i*golden;
      const rad = discR*Math.sqrt(t)*0.95;
      const dx = x+Math.cos(a)*rad+rr(-1.5,1.5), dy = y+Math.sin(a)*rad+rr(-1.5,1.5);
      let col = hexRGB(pick(DISC_BROWNS));
      col = t>0.78 ? darken(col,0.3) : lighten(col, t*0.35+rr(-0.05,0.05));
      const sz = discR*(0.07+0.1*Math.pow(rand(),1.4))*(0.8+0.5*t);
      const kind = rand();
      pg.push();
      pg.translate(dx,dy);
      if(kind<0.45){
        // 圓點籽
        pg.rotate(a+rr(-0.4,0.4));
        pg.fill(col[0],col[1],col[2],255);
        pg.ellipse(0,0,sz,sz*rr(0.6,0.95));
      } else if(kind<0.8){
        // 切線方向短刷（同心圓筆觸）
        pg.rotate(a+Math.PI/2+rr(-0.25,0.25));
        pg.fill(col[0],col[1],col[2],255);
        pg.ellipse(0,0,sz*rr(1.4,2.2),sz*rr(0.45,0.65));
      } else {
        // 雙色籽：深色籽體 + 亮端點
        pg.rotate(a+rr(-0.3,0.3));
        const dk = darken(col,0.3);
        pg.fill(dk[0],dk[1],dk[2],255);
        pg.ellipse(0,0,sz*1.2,sz*0.8);
        const lt = lighten(col,0.45);
        pg.fill(lt[0],lt[1],lt[2],255);
        pg.ellipse(sz*0.3,-sz*0.15,sz*0.45,sz*0.35);
      }
      pg.pop();
      if(rand()<0.04){
        pg.fill(225,180,90,220);
        pg.ellipse(dx+rr(-1,1),dy+rr(-1,1),sz*0.4,sz*0.35);
      }
    }
    // (4) 外緣一圈切線深色短刷收邊
    const nR = Math.max(14, Math.floor(discR*0.9));
    for(let i=0;i<nR;i++){
      const a = (i/nR)*Math.PI*2+rr(-0.1,0.1);
      const col = darken(hexRGB(pick(DISC_BROWNS)),rr(0.25,0.45));
      pg.push();
      pg.translate(x+Math.cos(a)*discR*rr(0.9,1.0), y+Math.sin(a)*discR*rr(0.87,0.97));
      pg.rotate(a+Math.PI/2+rr(-0.2,0.2));
      pg.fill(col[0],col[1],col[2],255);
      pg.ellipse(0,0,discR*rr(0.14,0.22),discR*rr(0.05,0.09));
      pg.pop();
    }
  });
  // 花心邊緣的弧形深色筆觸（收攏輪廓）
  const nArc = ri(3,5);
  for(let i=0;i<nArc;i++){
    const a0 = rand()*Math.PI*2;
    const a1 = a0+rr(0.7,1.3);
    addPaint(
      x+Math.cos(a0)*discR*0.95, y+Math.sin(a0)*discR*0.95,
      x+Math.cos(a1)*discR*0.95, y+Math.sin(a1)*discR*0.95,
      { w: discR*rr(0.13,0.18), col: darken(hexRGB(pick(DISC_BROWNS)),0.2),
        bend: -discR*rr(0.25,0.4), shadow:false, flecks:false }
    );
  }
}

// 垂首花（側面）
function genDroop(f){
  const { x, y, r, face } = f;
  const baseA = Math.PI/2 + face*rr(0.3,0.7);
  // 花托苞片
  for(let i=0;i<6;i++){
    const a = baseA + Math.PI + rr(-0.7,0.7);
    addPaint(x, y, x+Math.cos(a)*r*rr(0.5,0.85), y+Math.sin(a)*r*rr(0.5,0.85),
      { w: r*rr(0.13,0.18), col: jitterCol(hexRGB(pick(GREENS)),0.08),
        bend: r*rr(-0.2,0.2), profile:'taper', shadow:false, flecks:false });
  }
  // 下垂花瓣扇形：底層暗瓣 + 主層亮瓣，飽滿下垂
  const nU = ri(8,11);
  for(let i=0;i<nU;i++){
    const sp = ((i+0.5)/nU-0.5)*2.4;
    const a = baseA + sp*rr(0.9,1.1);
    const len = r*rr(0.9,1.5)*(1-Math.abs(sp)*0.18);
    const col = darken(hexRGB(pick(rand()<0.5?PETAL_DEEP:PETAL_YELLOWS)), rr(0.12,0.28));
    addPaint(
      x+Math.cos(a)*r*0.2, y+Math.sin(a)*r*0.2,
      x+Math.cos(a)*(r*0.2+len), y+Math.sin(a)*(r*0.2+len)+len*0.22,
      { w: r*rr(0.2,0.27), col: jitterCol(col,0.05),
        bend: face*len*rr(0.15,0.4), profile:'petal', shadow:false }
    );
  }
  const nP = ri(12,16);
  for(let i=0;i<nP;i++){
    const sp = (i/(nP-1)-0.5)*2.4;
    const a = baseA + sp*rr(0.85,1.1);
    const len = r*rr(0.95,1.7)*(1-Math.abs(sp)*0.18);
    const col = hexRGB(rand()<0.25 ? pick(PETAL_DEEP) : pick(PETAL_YELLOWS));
    addPaint(
      x+Math.cos(a)*r*0.22, y+Math.sin(a)*r*0.22,
      x+Math.cos(a)*(r*0.22+len), y+Math.sin(a)*(r*0.22+len)+len*0.22,
      { w: r*rr(0.22,0.3), col: jitterCol(col,0.06),
        bend: face*len*rr(0.15,0.4), profile:'petal', shadow:false }
    );
  }
  // 側視小花心：不透明底盤 + 變化籽粒
  const discBase = darken(hexRGB(pick(DISC_BROWNS)), rr(0.1,0.25));
  tasks.push(()=>{
    pg.noStroke();
    // 不透明側視底盤（壓扁橢圓）
    pg.push();
    pg.translate(x, y+r*0.1);
    pg.rotate(face*rr(0.08,0.2));
    pg.fill(discBase[0],discBase[1],discBase[2],255);
    pg.ellipse(0,0, r*0.68, r*0.46);
    for(let i=0;i<12;i++){
      const a = (i/12)*Math.PI*2;
      pg.ellipse(Math.cos(a)*r*0.3, Math.sin(a)*r*0.19, r*rr(0.07,0.13), r*rr(0.05,0.1));
    }
    pg.pop();
    // 籽粒：大小與筆觸變化
    for(let i=0;i<70;i++){
      const a = rand()*Math.PI*2, d = Math.sqrt(rand());
      let col = hexRGB(pick(DISC_BROWNS));
      col = d>0.75 ? darken(col,0.25) : lighten(col, rr(0,0.25));
      const sz = r*(0.05+0.07*Math.pow(rand(),1.4));
      pg.push();
      pg.translate(x+Math.cos(a)*r*0.3*d, y+Math.sin(a)*r*0.19*d + r*0.1);
      pg.rotate(rand()<0.5 ? a+Math.PI/2+rr(-0.3,0.3) : rand()*Math.PI);
      pg.fill(col[0],col[1],col[2],255);
      if(rand()<0.5) pg.ellipse(0,0,sz,sz*rr(0.6,0.9));
      else           pg.ellipse(0,0,sz*rr(1.4,2.0),sz*rr(0.45,0.65));
      pg.pop();
    }
  });
}

// ── 最後一層：畫布顆粒（統一質感）──
function genGrain(){
  tasks.push(()=>{
    pg.noStroke();
    const n = Math.floor(PW*PH*0.004);
    for(let i=0;i<n;i++){
      const gx = rand()*PW, gy = rand()*PH;
      const t = (rand()-0.5)*40;
      pg.fill(clamp255(128+t), clamp255(120+t), clamp255(100+t), 9);
      pg.rect(gx, gy, rr(1,2.2), rr(1,2.2));
    }
  });
}

// ════════════════ p5 主流程 ════════════════
function setup(){
  const ratio = PW/PH;
  let dw = Math.min(windowWidth*0.92, (windowHeight*0.92)*ratio);
  createCanvas(dw, dw/ratio);
  pg = createGraphics(PW, PH);
  pg.noStroke();
  pg.background(228, 208, 140);
  noiseSeed(Math.floor(rand()*1e9));   // 流場 noise 也由 fxhash 決定
  generateScene();
}

function draw(){
  if(!finished){
    const end = Math.min(tasks.length, taskIdx+perFrame);
    for(; taskIdx<end; taskIdx++) tasks[taskIdx]();
    if(taskIdx>=tasks.length){
      finished = true;
      fxpreview();
    }
  }
  image(pg, 0, 0, width, height);
  if(finished) noLoop();
}

function windowResized(){
  const ratio = PW/PH;
  let dw = Math.min(windowWidth*0.92, (windowHeight*0.92)*ratio);
  createCanvas(dw, dw/ratio);
  image(pg, 0, 0, width, height);
}

function mousePressed(){
  location.reload();
}

function keyPressed(){
  if(key==='s' || key==='S'){
    save(pg, `sunflowers-${fxhash.slice(2,10)}`, 'png');
    return false;
  }
  if(key==='r' || key==='R'){
    location.reload();
  }
}
