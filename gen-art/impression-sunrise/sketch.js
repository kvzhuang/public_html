// ============================================
// Impression Sunrise 印象・日出 - Generative Art
// 以演算法重現莫內《印象・日出》(1872)
// 筆觸引擎沿用 gen-art/sunflowers 的厚塗 impasto：
//   bezier 板狀筆觸 + 鬃毛紋 + 高光/陰影稜線
//   + 流場驅動的天空與水面 + 碎筆倒影
// ============================================

const rand = fxrand;

// --- 畫布內部解析度（原作 48×63cm 橫幅比例）---
const PW = 1160, PH = 880;

// --- 色調變體（晨霧的不同時刻）---
const TONES = [
  { name: '經典藍灰', w: 30,                       // 原作的勒阿弗爾晨霧
    sky:   ['#8C9BA8','#9AA9B5','#7E8E9E','#A8B5BE','#90A0AC'],
    warm:  ['#C9907A','#D8A088','#B87E6E','#E0AC90'],
    water: ['#6E8290','#7A8E9A','#5E7282','#8698A2','#64788A'],
    waterAccent: ['#6E8A86','#5E7A78','#7E9690'],
    sil:   '#56667A', boat: '#2A3642',
    sun:   '#F26B2A', sun2: '#FF8C42', sun3: '#E05818',
    refl:  ['#E87838','#F08848','#D86830','#F49858','#E89060'] },
  { name: '紫霧', w: 12,                           // 偏紫的破曉
    sky:   ['#988FA8','#A89EB5','#8A7F9C','#B5ACC0','#9E94AC'],
    warm:  ['#C98A86','#D89A92','#B87878','#E0A89E'],
    water: ['#766F8E','#827A9A','#665E80','#8E86A4','#6E6688'],
    waterAccent: ['#7A7290','#6A7A8E','#8E7E96'],
    sil:   '#5A5470', boat: '#2E2A3E',
    sun:   '#F2602A', sun2: '#FF7E42', sun3: '#E04E18',
    refl:  ['#E86E3C','#F08048','#D86034','#F48E5C','#E88468'] },
  { name: '玫瑰晨光', w: 10,                       // 偏粉的清晨
    sky:   ['#B59A98','#C2A8A4','#A88C8C','#CEB6B0','#BAA09C'],
    warm:  ['#D88E72','#E8A082','#C87C64','#F0B494'],
    water: ['#8E8290','#9A8E9A','#7E7282','#A698A2','#86788A'],
    waterAccent: ['#8E8A78','#7E8A86','#9E8E80'],
    sil:   '#6E5E6A', boat: '#362E36',
    sun:   '#F25E2A', sun2: '#FF7E3E', sun3: '#E04C16',
    refl:  ['#E87038','#F08244','#D8602E','#F49254','#E88860'] },
];

let tone;
let tasks = [];
let taskIdx = 0;
let perFrame = 40;
let pg;
let finished = false;
let horizonY, sun, boats = [], mastClusters = 0;
let vortices = [];
let shore;   // 河口岸線：一側碼頭斜向後退，另一側開闊水面

// ── 岸線幾何 ──
function setupShore(){
  const side = rand()<0.5 ? 'left' : 'right';
  const nearX = side==='left' ? PW*rr(0, 0.04)   : PW*rr(0.96, 1.0);
  const farX  = side==='left' ? PW*rr(0.55, 0.78) : PW*rr(0.22, 0.45);
  shore = { side, nearX, farX, drop: PH*rr(0.06, 0.12) };
}
function shoreFrac(x){   // 0 = 最近端（畫面邊緣）→ 1 = 岸線遠端（沒入地平線）
  const t = (x - shore.nearX) / (shore.farX - shore.nearX);
  return Math.max(0, Math.min(1, t));
}
function shoreBaseY(x){ return horizonY + (1 - shoreFrac(x)) * shore.drop; }
function shoreScale(x){ return 1.45 - 0.85 * shoreFrac(x); }
function shoreHaze(x){  return 0.30 + 0.34 * shoreFrac(x); }

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

// ════════════════ 厚塗筆觸引擎（sunflowers 移植版）════════════════
function bezPt(s,t){
  const u = 1-t;
  return {
    x: u*u*u*s.x1 + 3*u*u*t*s.cpx1 + 3*u*t*t*s.cpx2 + t*t*t*s.x2,
    y: u*u*u*s.y1 + 3*u*u*t*s.cpy1 + 3*u*t*t*s.cpy2 + t*t*t*s.y2,
  };
}

function widthProfile(profile, w){
  if(profile==='taper'){
    return t=>{
      const u = Math.max(0.001, Math.min(0.999, t));
      const ramp = u<0.06 ? 0.7+0.3*(u/0.06) : 1;
      return w * ramp * (1 - 0.72*Math.pow(u,1.25));
    };
  }
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
  if(s.simple){
    const lo0 = darken(col,0.16);
    pg.fill(lo0[0],lo0[1],lo0[2],255);
    drawSlab(samples,perps,t=>widthAt(t)*1.02, 0,0, edgeJ);
    const jc0 = jitterCol(col,0.05);
    pg.fill(jc0[0],jc0[1],jc0[2],255);
    drawSlab(samples,perps,t=>widthAt(t)*0.9, 0,0, edgeJ*0.9);
    return;
  }
  if(s.shadow!==false){
    pg.fill(15,15,15,60);
    drawSlab(samples,perps,widthAt, s.width*0.16+1, s.width*0.2+1.2, edgeJ);
  }
  const lo = darken(col,0.22);
  pg.fill(lo[0],lo[1],lo[2],255);
  drawSlab(samples,perps,t=>widthAt(t)*1.02, 0,0, edgeJ);
  const jc = jitterCol(col,0.05);
  pg.fill(jc[0],jc[1],jc[2],255);
  drawSlab(samples,perps,t=>widthAt(t)*0.92, 0,0, edgeJ*0.9);
  const bristleCount = Math.max(3, Math.min(10, Math.floor(s.width/3.2)));
  for(let b=0;b<bristleCount;b++){
    drawBristle(samples,perps,(b+0.5)/bristleCount-0.5, col, widthAt);
  }
  if(N>=10){
    const hi = lighten(col,0.5);
    drawRim(samples,perps, 0.36, hi, 190, widthAt, Math.max(1.1, s.width*0.07));
    const deep = darken(col,0.5);
    drawRim(samples,perps,-0.40, deep, 165, widthAt, Math.max(1.0, s.width*0.06));
    drawCenterBand(samples,perps,col,widthAt, Math.max(1.2, s.width*0.09));
  }
  if(s.flecks!==false && rand()<0.5) edgeFlecks(samples,perps,col,s.width,widthAt);
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
  let jc = jitterCol(baseCol,0.12);
  const blend = Math.max(-1, Math.min(1, -offFrac*2));
  jc = mixRGB(jc, blend>0 ? lighten(baseCol,0.4) : darken(baseCol,0.4), Math.abs(blend)*0.4);

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
  const band = lighten(baseCol,0.36);
  pg.noFill();
  pg.stroke(band[0],band[1],band[2],175);
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
    if(rand()>0.15) continue;
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

// ════════════════ 流場 ════════════════
function blendAngle(a, b, t){
  const d = Math.atan2(Math.sin(b-a), Math.cos(b-a));
  return a + d*t;
}

function flowAngle(x, y){
  if(y > horizonY){
    // 水面：近水平、細微波動
    return (noise(x*0.004, y*0.006)-0.5)*0.36;
  }
  // 天空：柔緩的霧氣亂流
  let a = (noise(x*0.0018, y*0.0022)-0.5)*1.6;
  // 太陽周圍的微環流
  const dx = x-sun.x, dy = y-sun.y;
  const d = Math.hypot(dx,dy);
  if(d < sun.glowR){
    const t = Math.atan2(dy,dx) + (Math.PI/2)*sun.swirl;
    a = blendAngle(a, t, Math.pow(1-d/sun.glowR,1.2)*0.45);
  }
  // 霧渦（微弱）
  for(const v of vortices){
    const vdx = x-v.x, vdy = y-v.y;
    const vd = Math.hypot(vdx,vdy);
    if(vd < v.r){
      const t = Math.atan2(vdy,vdx) + (Math.PI/2)*v.s;
      a = blendAngle(a, t, Math.pow(1-vd/v.r,0.7)*0.45);
    }
  }
  return a;
}

function traceFlow(x0, y0, steps, stepLen, yMin=-1e9, yMax=1e9){
  const pts = [{x:x0, y:y0}];
  let x = x0, y = y0;
  let pa = flowAngle(x, y);
  for(let i=0;i<steps;i++){
    const a = blendAngle(pa, flowAngle(x, y), 0.55);
    const nx2 = x + Math.cos(a)*stepLen + rr(-1.2,1.2);
    const ny2 = y + Math.sin(a)*stepLen + rr(-1.2,1.2);
    if(ny2 < yMin || ny2 > yMax) break;
    x = nx2; y = ny2;
    pts.push({x, y});
    pa = a;
  }
  return pts;
}

function addFlowStroke(x0, y0, opts){
  const o = opts||{};
  const pts = traceFlow(x0, y0, o.steps||ri(5,9), o.stepLen||rr(9,13),
                        o.yMin!==undefined?o.yMin:-1e9, o.yMax!==undefined?o.yMax:1e9);
  if(pts.length < 4) return;
  const s = {
    width: o.w||10,
    col: Array.isArray(o.col) ? o.col : hexRGB(o.col||'#8C9BA8'),
    profile: o.profile||'square',
    shadow: o.shadow,
    flecks: o.flecks,
    simple: o.simple,
  };
  tasks.push(()=>impastoLayers(pts, s));
}

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
    col: Array.isArray(o.col) ? o.col : hexRGB(o.col||'#8C9BA8'),
    profile: o.profile||'square',
    shadow: o.shadow,
    flecks: o.flecks,
    simple: o.simple,
  };
  tasks.push(()=>renderImpasto(s));
}

// ════════════════ 場景生成 ════════════════
function generateScene(){
  tasks = []; taskIdx = 0; finished = false;
  tone = weightedPick(TONES, TONES.map(t=>t.w));

  horizonY = PH*rr(0.40,0.45);
  setupShore();
  // 太陽放在岸線對側的開闊水面上方（河口出海口方向）
  sun = {
    x: shore.side==='left' ? PW*rr(0.58,0.78) : PW*rr(0.22,0.42),
    y: PH*rr(0.16,0.28),
    r: rr(26,34),
    glowR: PW*rr(0.18,0.26),
    swirl: rand()<0.5?1:-1,
  };
  // 霧渦 0-2 個
  vortices = [];
  const nV = ri(0,2);
  for(let i=0;i<nV;i++){
    const x = rr(PW*0.08, PW*0.92);
    const y = rr(PH*0.06, horizonY*0.7);
    if(Math.hypot(x-sun.x, y-sun.y) < sun.glowR*0.8) continue;
    vortices.push({ x, y, r: rr(80,150), s: rand()<0.5?1:-1 });
  }

  genUnderpaint();
  genSky();
  genSun();
  genWater();
  genReflection();
  genBuildings();   // 岸線建築延伸到水面下緣，須疊在水面筆觸之上
  genHarbor();
  genBoats();
  genGrain();

  window.$fxhashFeatures = {
    '色調': tone.name,
    '小船': boats.length,
    '桅杆群': mastClusters,
    '建築群': buildingClusters,
    '霧渦': vortices.length,
    '岸線': shore.side==='left' ? '左岸' : '右岸',
    '朝陽': sun.x < PW*0.58 ? '偏中' : '偏右',
  };
  console.log('fxhash:', fxhash);
  console.log('features:', window.$fxhashFeatures);

  perFrame = Math.ceil(tasks.length/230);
}

// ── 打底：天空與水面的不透明厚塗層 ──
function genUnderpaint(){
  const skyBase = darken(hexRGB(tone.sky[0]), 0.06);
  const waterBase = darken(hexRGB(tone.water[0]), 0.08);
  tasks.push(()=>{
    pg.noStroke();
    pg.fill(skyBase[0], skyBase[1], skyBase[2]);
    pg.rect(0, 0, PW, horizonY);
    pg.fill(waterBase[0], waterBase[1], waterBase[2]);
    pg.rect(0, horizonY, PW, PH-horizonY);
  });
  for(let gy=-30; gy<horizonY-4; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x = gx+rr(-5,5), y = Math.min(gy+rr(-5,5), horizonY-5);
      addFlowStroke(x, y, {
        w: rr(24,32),
        col: jitterCol(darken(hexRGB(pick(tone.sky)), rr(0.02,0.1)), 0.04),
        steps: ri(4,6), stepLen: rr(11,14),
        yMax: horizonY-2,
        shadow:false, flecks:false, simple:true,
      });
    }
  }
  for(let gy=horizonY-2; gy<PH+20; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x = gx+rr(-5,5), y = Math.max(gy+rr(-5,5), horizonY-2);
      addFlowStroke(x, y, {
        w: rr(24,32),
        col: jitterCol(darken(hexRGB(pick(tone.water)), rr(0.02,0.1)), 0.04),
        steps: ri(4,6), stepLen: rr(11,14),
        yMin: horizonY-4,
        shadow:false, flecks:false, simple:true,
      });
    }
  }
}

// ── 天空：流場筆觸 + 太陽周圍的暖色渲染 ──
function genSky(){
  const n = 1250;
  for(let i=0;i<n;i++){
    const x = rr(-20, PW+20);
    const y = rr(-20, horizonY-6);
    let col = hexRGB(pick(tone.sky));
    // 接近太陽 → 混入暖色（晨光暈染）
    const d = Math.hypot(x-sun.x, y-sun.y);
    if(d < sun.glowR){
      col = mixRGB(col, hexRGB(pick(tone.warm)), (1-d/sun.glowR)*0.55+rr(-0.05,0.05));
    }
    // 靠近地平線略暖略亮（霧氣透光）
    const hFrac = y/horizonY;
    if(hFrac > 0.6) col = mixRGB(col, hexRGB(tone.warm[0]), (hFrac-0.6)*0.3);
    addFlowStroke(x, y, {
      w: rr(8,13), col: jitterCol(col,0.05),
      steps: ri(5,9), stepLen: rr(9,13),
      yMax: horizonY-2,
      shadow:false, flecks:false,
    });
  }
  // 太陽附近的暖色橫掃筆（莫內在天空抹的幾道粉橘）
  const nW = ri(14,22);
  for(let i=0;i<nW;i++){
    const y = sun.y + rr(-sun.glowR*0.5, sun.glowR*0.8);
    if(y > horizonY-12 || y < 8) continue;
    const x = sun.x + rr(-sun.glowR, sun.glowR)*0.8;
    const len = rr(50,120);
    addPaint(x-len/2, y, x+len/2, y+rr(-6,6),
      { w: rr(7,11),
        col: jitterCol(mixRGB(hexRGB(pick(tone.warm)), hexRGB(tone.sun2), rr(0.1,0.35)), 0.06),
        bend: rr(-8,8), shadow:false, flecks:false });
  }
}

// ── 朝陽：不透明橘紅圓盤 ──
function genSun(){
  const { x, y, r } = sun;
  const core = hexRGB(tone.sun);
  const hi = hexRGB(tone.sun2);
  const dp = hexRGB(tone.sun3);
  tasks.push(()=>{
    pg.noStroke();
    // 外暈（半透明暖圈）
    for(let i=4;i>=1;i--){
      pg.fill(core[0], core[1], core[2], 26);
      pg.ellipse(x, y, r*2 + i*14, r*2 + i*13);
    }
    // 不透明日盤 + 不規則邊緣
    pg.fill(core[0], core[1], core[2], 255);
    pg.ellipse(x, y, r*2, r*1.96);
    for(let i=0;i<16;i++){
      const a = (i/16)*Math.PI*2;
      pg.fill(i%3===0?dp[0]:core[0], i%3===0?dp[1]:core[1], i%3===0?dp[2]:core[2], 255);
      pg.ellipse(x+Math.cos(a)*r*0.92, y+Math.sin(a)*r*0.88, r*rr(0.2,0.34), r*rr(0.18,0.3));
    }
    // 盤面顏料肌理
    for(let i=0;i<14;i++){
      const a = rand()*Math.PI*2, dd = Math.sqrt(rand())*r*0.7;
      const c = rand()<0.4 ? hi : (rand()<0.5 ? core : dp);
      pg.push();
      pg.translate(x+Math.cos(a)*dd, y+Math.sin(a)*dd);
      pg.rotate(rand()*Math.PI);
      pg.fill(c[0], c[1], c[2], 255);
      pg.ellipse(0, 0, r*rr(0.3,0.55), r*rr(0.16,0.3));
      pg.pop();
    }
  });
}

// ── 港口建築剪影：沿河口岸線斜向後退的廠房、屋頂、煙囪與巨型吊臂 ──
let buildingClusters = 0;
function genBuildings(){
  const skyHaze = hexRGB(tone.sky[1]);
  const sil = hexRGB(tone.sil);
  buildingClusters = ri(3,5);
  for(let c=0;c<buildingClusters;c++){
    // 沿岸線均勻分布（帶抖動）：近端大而清楚，遠端小而霧
    const t = (c + rr(0.15,0.85)) / buildingClusters;
    const cx = shore.nearX + t*(shore.farX - shore.nearX);
    const sc = shoreScale(cx);
    const baseY = shoreBaseY(cx);
    const col = mixRGB(sil, skyHaze, shoreHaze(cx) + rr(-0.05,0.05));
    const clusterW = rr(150,300)*sc;
    let bx = cx - clusterW/2;
    // 一排高低錯落的廠房／倉庫量體
    while(bx < cx + clusterW/2){
      const bw = rr(45,105)*sc;
      const bh = rr(26,80)*sc;
      const topY = baseY - bh;
      // 主體：混合筆觸——橫筆打底、直筆與斜筆疊出牆面肌理
      for(let yy=topY; yy<baseY-1; yy+=rr(6,9)){
        addPaint(bx+rr(-2,2), yy, bx+bw+rr(-2,2), yy+rr(-1.5,1.5),
          { w: rr(7,10)*sc, col: jitterCol(col,0.04), bend: rr(-2,2),
            shadow:false, flecks:false, simple:true });
      }
      const nVert = Math.floor(bw/rr(10,16));
      for(let v=0;v<nVert;v++){
        const vx = bx + bw*rr(0.05,0.95);
        const vy = rr(topY+3, baseY-8);
        const vlen = rr(bh*0.25, bh*0.6);
        addPaint(vx, vy, vx+rr(-2,2), Math.min(baseY-2, vy+vlen),
          { w: rr(4,7)*sc, col: jitterCol(rand()<0.3?darken(col,0.08):col,0.05), bend: rr(-2,2),
            shadow:false, flecks:false, simple:true });
      }
      const nDab = ri(3,6);
      for(let d2=0;d2<nDab;d2++){
        const dx2 = bx + bw*rr(0.1,0.9);
        const dy2 = rr(topY+2, baseY-6);
        const dlen = rr(8,18)*sc;
        const da = rr(-0.6,0.6);
        const dabCol = rand()<0.4 ? mixRGB(col, skyHaze, rr(0.15,0.35)) : darken(col, rr(0.05,0.12));
        addPaint(dx2, dy2, dx2+Math.cos(da)*dlen, dy2+Math.sin(da)*dlen,
          { w: rr(3.5,6)*sc, col: jitterCol(dabCol,0.05), bend: rr(-2,2),
            shadow:false, flecks:false, simple:true });
      }
      // 屋頂：一半機率山形頂
      if(rand()<0.5){
        const peak = topY - rr(10,22)*sc;
        addPaint(bx-2, topY, bx+bw*0.5, peak,
          { w: rr(5,8)*sc, col: jitterCol(col,0.05), bend: rr(-1,1), shadow:false, flecks:false, simple:true });
        addPaint(bx+bw*0.5, peak, bx+bw+2, topY,
          { w: rr(5,8)*sc, col: jitterCol(col,0.05), bend: rr(-1,1), shadow:false, flecks:false, simple:true });
      }
      // 工廠煙囪
      if(rand()<0.5){
        const chx = bx + bw*rr(0.2,0.8);
        const chh = rr(30,68)*sc;
        addPaint(chx, topY, chx+rr(-3,3), topY-chh,
          { w: rr(5,8)*sc, col: jitterCol(darken(col,0.06),0.05), bend: rr(-2,2),
            shadow:false, flecks:false, simple:true });
        if(rand()<0.6){
          const smokeCol = mixRGB(lighten(sil,0.3), skyHaze, 0.55);
          const drift = rand()<0.5?-1:1;
          addPaint(chx, topY-chh, chx+drift*rr(20,45)*sc, topY-chh-rr(10,26)*sc,
            { w: rr(7,12)*sc, col: jitterCol(smokeCol,0.05), bend: rr(-10,10),
              shadow:false, flecks:false, simple:true });
        }
      }
      bx += bw + rr(4,18)*sc;
    }
    // 岸邊倒影：建築下方的深色碎橫筆（碼頭貼水的感覺）
    const reflCol = mixRGB(col, hexRGB(tone.water[1]), 0.45);
    for(let i2=0;i2<ri(3,5);i2++){
      const ry = baseY + (4+i2*7)*sc;
      const rl = clusterW*(0.5-i2*0.09);
      if(rl<12) break;
      addPaint(cx-rl/2+rr(-8,8), ry, cx+rl/2+rr(-8,8), ry+rr(-2,2),
        { w: rr(4,6)*sc, col: jitterCol(reflCol,0.05), bend: rr(-3,3), shadow:false, flecks:false, simple:true });
    }
    // 巨型港口吊臂：近端必出、遠端機率出（原作背景的標誌性剪影）
    const giantProb = t<0.45 ? 0.95 : 0.45;
    if(rand()<giantProb){
      const kx = cx + rr(-clusterW*0.35, clusterW*0.35);
      const kh = (t<0.45 ? rr(130,200) : rr(80,130))*sc;
      const kw = rr(5,7)*sc;
      // 直塔
      addPaint(kx, baseY, kx+rr(-4,4), baseY-kh,
        { w: kw, col: jitterCol(col,0.05), bend: rr(-2,2), shadow:false, flecks:false, simple:true });
      // 巨大水平吊臂（比塔更搶眼的長橫桁）
      const dir = (cx < PW*0.5) ? 1 : -1;   // 吊臂伸向開闊水面
      const armL = (t<0.45 ? rr(110,180) : rr(60,110))*sc;
      const armY = baseY-kh;
      addPaint(kx-dir*armL*0.18, armY+rr(-3,3), kx+dir*armL, armY+rr(6,18),
        { w: rr(4.5,6)*sc, col: jitterCol(col,0.05), bend: rr(-3,3), shadow:false, flecks:false, simple:true });
      // 桁架斜桿 ×2（塔身連吊臂，形成大三角結構）
      addPaint(kx+rr(-2,2), baseY-kh*rr(0.4,0.55), kx+dir*armL*rr(0.4,0.6), armY+rr(4,14),
        { w: rr(3,4)*sc, col: jitterCol(col,0.05), bend: rr(-1,1), shadow:false, flecks:false, simple:true });
      addPaint(kx+rr(-2,2), baseY-kh*rr(0.65,0.8), kx+dir*armL*rr(0.7,0.9), armY+rr(6,16),
        { w: rr(2.5,3.5)*sc, col: jitterCol(col,0.05), bend: rr(-1,1), shadow:false, flecks:false, simple:true });
      // 吊索 1-2 條垂到水線
      const nCable = ri(1,2);
      for(let cb=0;cb<nCable;cb++){
        const hx = kx+dir*armL*rr(0.5,0.95);
        addPaint(hx, armY+rr(8,18), hx+rr(-1,1), baseY-rr(6,22)*sc,
          { w: rr(2.5,3.5)*sc, col: jitterCol(col,0.05), bend: 0, shadow:false, flecks:false, simple:true });
      }
    }
  }
}

// ── 港口剪影：桅杆、起重機、煙囪與煙 ──
function genHarbor(){
  const skyHaze = hexRGB(tone.sky[1]);
  const sil = hexRGB(tone.sil);
  mastClusters = ri(3,5);
  for(let c=0;c<mastClusters;c++){
    // 大多沿岸線停泊，少數漂在開闊水面近地平線處
    let cx, baseY, msc;
    if(rand()<0.7){
      const t = rr(0.05,0.95);
      cx = shore.nearX + t*(shore.farX - shore.nearX);
      baseY = shoreBaseY(cx) - rr(0,4);
      msc = 0.75 + 0.5*(1-t);
    } else {
      cx = rr(PW*0.06, PW*0.94);
      baseY = horizonY - rr(0,6);
      msc = rr(0.7,0.95);
    }
    const haze = rr(0.3,0.55);                       // 越霧越融入天空
    const col = mixRGB(sil, skyHaze, haze);
    // 船體／碼頭塊
    const hullW = rr(40,90)*msc;
    addPaint(cx-hullW/2, baseY-rr(2,8), cx+hullW/2, baseY-rr(0,6),
      { w: rr(9,14), col: jitterCol(col,0.04), bend: rr(-4,4), shadow:false, flecks:false });
    // 桅杆 2-4 支
    const nM = ri(2,4);
    for(let m=0;m<nM;m++){
      const mx = cx + rr(-hullW*0.45, hullW*0.45);
      const mh = rr(28,68);
      addPaint(mx, baseY-4, mx+rr(-4,4), baseY-4-mh,
        { w: rr(3,4.5), col: jitterCol(col,0.05), bend: rr(-3,3), shadow:false, flecks:false });
      // 橫桁／吊臂
      if(rand()<0.7){
        const by = baseY-4-mh*rr(0.5,0.85);
        const bl = rr(14,34);
        const ba = rr(-0.45,0.45);
        addPaint(mx-Math.cos(ba)*bl*0.3, by-Math.sin(ba)*bl*0.3,
                 mx+Math.cos(ba)*bl*0.7, by+Math.sin(ba)*bl*0.7,
          { w: rr(2.5,3.5), col: jitterCol(col,0.05), bend: rr(-2,2), shadow:false, flecks:false });
      }
    }
    // 煙囪與飄煙
    if(rand()<0.55){
      const sx2 = cx + rr(-hullW*0.3, hullW*0.3);
      const sh = rr(18,34);
      addPaint(sx2, baseY-4, sx2, baseY-4-sh,
        { w: rr(5,7), col: jitterCol(darken(col,0.1),0.04), bend: rr(-2,2), shadow:false, flecks:false });
      const smokeCol = mixRGB(lighten(sil,0.3), skyHaze, 0.5);
      let px2 = sx2, py2 = baseY-6-sh;
      const drift = rand()<0.5?-1:1;
      for(let k=0;k<ri(3,5);k++){
        const nx2 = px2 + drift*rr(14,30);
        const ny2 = py2 - rr(6,16);
        if(ny2 < 8) break;
        addPaint(px2, py2, nx2, ny2,
          { w: rr(6,10)*(1+k*0.18), col: jitterCol(smokeCol,0.05),
            bend: rr(-8,8), shadow:false, flecks:false });
        px2 = nx2; py2 = ny2;
      }
    }
  }
}

// ── 水面：橫向碎筆 + noise 色域 + 深度漸層 ──
function genWater(){
  const n = 950;
  for(let i=0;i<n;i++){
    const x = rr(-20, PW+20);
    const y = rr(horizonY, PH+14);
    let col;
    if(rand() < 0.1){
      col = hexRGB(pick(tone.waterAccent));
    } else {
      const zone = noise(x*0.005, y*0.007);
      const idx = Math.max(0, Math.min(tone.water.length-1,
        Math.floor(zone*tone.water.length + rr(-0.6,0.6))));
      col = hexRGB(tone.water[idx]);
    }
    // 深度：近處深、近地平線亮（反天光）
    const depth = (y-horizonY)/(PH-horizonY);
    col = depth>0.45 ? darken(col, (depth-0.45)*0.3) : lighten(col, (0.45-depth)*0.22);
    // 地平線附近混一點暖色（晨光照在遠水）
    if(depth<0.25 && Math.abs(x-sun.x)<sun.glowR){
      col = mixRGB(col, hexRGB(pick(tone.warm)), (0.25-depth)*0.9*(1-Math.abs(x-sun.x)/sun.glowR));
    }
    const isLong = rand()<0.3;
    addFlowStroke(x, y, {
      w: isLong ? rr(7,11) : rr(9,15),
      col: jitterCol(col,0.05),
      steps: isLong ? ri(8,13) : ri(3,6),
      stepLen: rr(9,14),
      yMin: horizonY-2,
      shadow:false, flecks:false,
    });
  }
}

// ── 太陽倒影：水面上的橘紅碎筆（原作的靈魂）──
function genReflection(){
  const endY = PH*rr(0.72,0.82);
  let y = horizonY + rr(4,10);
  while(y < endY){
    const depth = (y-horizonY)/(endY-horizonY);
    // 倒影柱左右搖擺、越近越散
    const sway = Math.sin(y*0.045)*10*depth + rr(-1,1);
    const spread = 8 + depth*46;
    const x = sun.x + sway + rr(-spread, spread)*0.6;
    const len = rr(16,44)*(0.7+depth*0.6);
    const col = jitterCol(hexRGB(pick(tone.refl)), 0.06);
    addPaint(x-len/2, y, x+len/2, y+rr(-2,2),
      { w: rr(6,10), col, bend: rr(-4,4), shadow:false, flecks:false });
    // 偶有一筆亮橘高光
    if(rand()<0.22){
      addPaint(x-len*0.3, y+rr(-3,3), x+len*0.3, y+rr(-3,3),
        { w: rr(4,6), col: jitterCol(hexRGB(tone.sun2),0.05), bend: rr(-3,3), shadow:false, flecks:false });
    }
    y += rr(8,18);
  }
  // 散落在別處的零星橘色波光
  const nG = ri(5,9);
  for(let i=0;i<nG;i++){
    const gx = rr(PW*0.08, PW*0.92);
    const gy = rr(horizonY+10, PH*0.6);
    if(Math.abs(gx-sun.x) < 60) continue;
    const len = rr(10,24);
    addPaint(gx-len/2, gy, gx+len/2, gy+rr(-2,2),
      { w: rr(4,6), col: jitterCol(mixRGB(hexRGB(pick(tone.refl)), hexRGB(tone.water[1]), 0.4),0.05),
        bend: rr(-3,3), shadow:false, flecks:false });
  }
}

// ── 小船：黑色剪影 1-3 艘，隨機抽深度槽，各有遠近深淺 ──
function genBoats(){
  boats = [];
  const nB = ri(1,3);
  // 三個深度槽：近景（大而深）、中景、遠景（小而霧）
  const depthSlots = [
    { y: PH*rr(0.62,0.74), s: rr(0.9,1.15),  fog: rr(0,0.08)  },   // 近景
    { y: PH*rr(0.53,0.60), s: rr(0.52,0.7),  fog: rr(0.2,0.35) },  // 中景
    { y: PH*rr(0.46,0.51), s: rr(0.3,0.45),  fog: rr(0.42,0.58) }, // 遠景
  ];
  // 隨機抽 nB 個不重複的深度槽（1 艘也可能是中景或遠景船）
  const chosen = [0,1,2].sort(()=>rand()-0.5).slice(0,nB);
  for(const si of chosen){
    const slot = depthSlots[si];
    // 近景船靠太陽倒影柱（原作構圖），中遠景船在開闊水面側漂散
    let x;
    if(si===0){
      x = sun.x + PW*rr(-0.14,0.14);
    } else {
      x = shore.side==='left' ? PW*rr(0.42,0.88) : PW*rr(0.12,0.58);
      x += rr(-30,30);
    }
    x = Math.max(PW*0.08, Math.min(PW*0.92, x));
    boats.push({ x, y: slot.y, s: slot.s });
    genBoat(x, slot.y, slot.s, slot.fog);
  }
}

function genBoat(bx, by, s, fog){
  const waterHaze = hexRGB(tone.water[1]);
  let dark = hexRGB(tone.boat);
  dark = mixRGB(dark, waterHaze, fog);               // 越遠越霧越淺
  const len = 130*s;

  // 船身：弧形厚筆
  addPaint(bx-len/2, by, bx+len/2, by-3*s,
    { w: 14*s, col: jitterCol(dark,0.04), bend: 11*s, shadow:false });
  addPaint(bx-len*0.32, by+7*s, bx+len*0.36, by+6*s,
    { w: 8*s, col: jitterCol(darken(dark,0.12),0.04), bend: 7*s, shadow:false, flecks:false });

  // 船上人影 1-2 個
  const nF = ri(1,2);
  for(let f=0;f<nF;f++){
    const fx = bx + (f===0 ? -len*rr(0.1,0.2) : len*rr(0.12,0.26));
    const fh = rr(20,28)*s;
    addPaint(fx, by-4*s, fx+rr(-3,3)*s, by-4*s-fh,
      { w: 6.5*s, col: jitterCol(dark,0.05), bend: rr(-3,3), profile:'taper', shadow:false, flecks:false });
    tasks.push(()=>{                                  // 頭
      pg.noStroke();
      pg.fill(dark[0],dark[1],dark[2],255);
      pg.ellipse(fx+rr(-1,1), by-4*s-fh-2*s, 7*s, 7*s);
    });
  }
  // 船槳
  if(rand()<0.8){
    const oside = rand()<0.5?-1:1;
    addPaint(bx+oside*len*0.18, by-2*s, bx+oside*len*0.5, by+16*s,
      { w: 3.5*s, col: jitterCol(dark,0.05), bend: rr(-3,3), shadow:false, flecks:false });
  }
  // 船的倒影：船底下方的深色碎橫筆
  for(let i=0;i<4;i++){
    const ry = by + (10+i*9)*s;
    const rl = len*(0.55-i*0.1);
    if(rl<10) break;
    addPaint(bx-rl/2+rr(-6,6), ry, bx+rl/2+rr(-6,6), ry+rr(-2,2),
      { w: rr(5,7)*s, col: jitterCol(mixRGB(dark, waterHaze, 0.3+i*0.14),0.05),
        bend: rr(-4,4), shadow:false, flecks:false });
  }
}

// ── 畫布顆粒 ──
function genGrain(){
  tasks.push(()=>{
    pg.noStroke();
    const n = Math.floor(PW*PH*0.004);
    for(let i=0;i<n;i++){
      const gx = rand()*PW, gy = rand()*PH;
      const t = (rand()-0.5)*40;
      pg.fill(clamp255(120+t), clamp255(124+t), clamp255(130+t), 9);
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
  pg.background(140, 150, 160);
  noiseSeed(Math.floor(rand()*1e9));
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
    save(pg, `impression-sunrise-${fxhash.slice(2,10)}`, 'png');
    return false;
  }
  if(key==='r' || key==='R'){
    location.reload();
  }
}
