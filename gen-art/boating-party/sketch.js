// ============================================
// Boating Party 船上的午宴 - Generative Art
// 以演算法重現雷諾瓦《船上的午宴》(1881)
// 筆觸引擎沿用 gen-art/sunflowers 的厚塗 impasto：
//   bezier 板狀筆觸 + 鬃毛紋 + 高光/陰影稜線
//   條紋遮陽棚 + 河景綠蔭 + 印象派人物群像 + 餐桌靜物
// ============================================

const rand = fxrand;

// --- 畫布內部解析度（原作 130×173cm 橫幅比例）---
const PW = 1160, PH = 880;

// --- 色調變體（午後光線的不同時刻）---
const TONES = [
  { name: '經典暖陽', w: 30,
    awning:  ['#E8833C','#DD7530','#F09048'],          // 遮陽棚橘
    awning2: ['#F2E8D4','#EDE0C8','#F8F0DE'],          // 遮陽棚米白
    foliage: ['#5A8A4E','#48763E','#6E9E5A','#3E6636','#7AAA62'],
    river:   ['#8FB0B8','#7CA0AC','#A4C2C6','#6E929E'],
    cloth:   ['#F2EEE2','#EAE6D8','#F8F4EA','#E2DECE'],
    clothShade: ['#C8C4D0','#B8B8C8'],
    shirt:   ['#EEEAE0','#E4E2D8','#DCD8CC'],
    vest:    '#32405E',
    dress:   ['#5A6E94','#C46470','#8C5E78','#E0D8CC','#4E5E80'],
    rail:    '#5E4426' },
  { name: '金黃午後', w: 12,
    awning:  ['#E89240','#DD8434','#F0A050'],
    awning2: ['#F4ECD0','#EFE4C0','#FAF4DA'],
    foliage: ['#6E8A42','#5C7636','#82A04E','#4E662E','#92AA58'],
    river:   ['#A0B0A0','#8EA092','#B4C2B0','#7E9286'],
    cloth:   ['#F4EEDA','#ECE6D0','#FAF4E2','#E4DEC6'],
    clothShade: ['#CCC4B8','#BCB8AC'],
    shirt:   ['#F0EAD8','#E6E2D0','#DED8C4'],
    vest:    '#3E4252',
    dress:   ['#6E6E8C','#C87060','#96625E','#E2D8C0','#5A6270'],
    rail:    '#66482A' },
  { name: '涼爽河風', w: 10,
    awning:  ['#D87840','#CC6A34','#E0864C'],
    awning2: ['#ECEAE0','#E4E4D8','#F4F2E8'],
    foliage: ['#4E8258','#3E7048','#609666','#345E3C','#70A276'],
    river:   ['#8AAAC0','#78A0B4','#9EBACC','#6A90A8'],
    cloth:   ['#EEEEE6','#E6E6DE','#F6F6EE','#DEDED2'],
    clothShade: ['#BCC2D2','#ACB4C8'],
    shirt:   ['#EAEAE4','#E0E2DC','#D8DAD2'],
    vest:    '#2E3A52',
    dress:   ['#52689A','#B85C70','#7E5680','#DCD8D0','#46587E'],
    rail:    '#54422A' },
];

// 共用顏料
const SKIN       = ['#E8B894','#F0C4A0','#DCA886','#F4CCAC'];
const HAIR       = ['#5E4426','#3A2C1E','#6E5430','#2A2420','#8A6838'];
const HAT_STRAW  = ['#E8C868','#D9B554','#F0D480'];
const HAT_DARK   = '#2E2A28';
const FLOWER_DAB = ['#D84848','#E8E4DC','#E89048','#C86088'];
const BOTTLE_G   = ['#2E4A30','#1E3622','#3A5A3C'];
const FRUIT      = ['#E89040','#C84840','#7A4E78','#D8C050','#B83A50'];

let tone;
let tasks = [];
let taskIdx = 0;
let perFrame = 40;
let pg;
let finished = false;
let awn, tableTopY, figures = [], strawCount = 0, bottleCount = 0, sailCount = 0;

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
  if(y > tableTopY){
    // 桌布：柔和的斜向波動
    return -0.12 + (noise(x*0.004, y*0.005)-0.5)*0.5;
  }
  // 中景樹葉與河面：較活潑的渦旋亂流
  return (noise(x*0.0024, y*0.0028)-0.5)*2.8;
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
    col: Array.isArray(o.col) ? o.col : hexRGB(o.col||'#8FB0B8'),
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
    col: Array.isArray(o.col) ? o.col : hexRGB(o.col||'#8FB0B8'),
    profile: o.profile||'square',
    shadow: o.shadow,
    flecks: o.flecks,
  };
  tasks.push(()=>renderImpasto(s));
}

// ════════════════ 場景 ════════════════
// 遮陽棚下緣（斜線 + 微波）
function awnYat(x){
  return awn.yl + (awn.yr-awn.yl)*(x/PW) + Math.sin(x*0.02)*3;
}

function generateScene(){
  tasks = []; taskIdx = 0; finished = false;
  figures = []; strawCount = 0; bottleCount = 0; sailCount = 0;
  tone = weightedPick(TONES, TONES.map(t=>t.w));

  // 遮陽棚：右高左低或左高右低
  const flip = rand()<0.5;
  awn = {
    yl: PH*(flip ? rr(0.17,0.22) : rr(0.26,0.32)),
    yr: PH*(flip ? rr(0.26,0.32) : rr(0.17,0.22)),
    stripeW: rr(30,42),
    lean: rr(-0.16,-0.06),
  };
  tableTopY = PH*(0.695 + rr(-0.012,0.01));

  genUnderpaint();
  genBackground();   // 河景與綠蔭
  genRailing();
  genFiguresBack();  // 後排賓客
  genAwning();       // 遮陽棚蓋在最上緣
  genPoles();
  genTablecloth();
  genTableItems();   // 桌上酒瓶、杯盤先落位，避免與人物糊成一團
  genFiguresFront(); // 前景人物與手臂壓在桌緣上
  genGrain();

  window.$fxhashFeatures = {
    '色調': tone.name,
    '賓客': figures.length,
    '草帽': strawCount,
    '酒瓶': bottleCount,
    '帆船': sailCount,
  };
  console.log('fxhash:', fxhash);
  console.log('features:', window.$fxhashFeatures);

  perFrame = Math.ceil(tasks.length/230);
}

// ── 打底 ──
function genUnderpaint(){
  const folBase = darken(hexRGB(tone.foliage[0]), 0.08);
  const clothBase = darken(hexRGB(tone.cloth[0]), 0.08);
  tasks.push(()=>{
    pg.noStroke();
    pg.fill(folBase[0], folBase[1], folBase[2]);
    pg.rect(0, 0, PW, tableTopY);
    pg.fill(clothBase[0], clothBase[1], clothBase[2]);
    pg.rect(0, tableTopY, PW, PH-tableTopY);
  });
  // 中景打底（樹蔭色肥筆）
  for(let gy=-30; gy<tableTopY-4; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x = gx+rr(-5,5), y = Math.min(gy+rr(-5,5), tableTopY-5);
      addFlowStroke(x, y, {
        w: rr(24,32),
        col: jitterCol(darken(hexRGB(pick(tone.foliage)), rr(0.02,0.12)), 0.04),
        steps: ri(4,6), stepLen: rr(11,14),
        yMax: tableTopY-2,
        shadow:false, flecks:false, simple:true,
      });
    }
  }
  // 桌布打底
  for(let gy=tableTopY-2; gy<PH+20; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x = gx+rr(-5,5), y = Math.max(gy+rr(-5,5), tableTopY-2);
      addFlowStroke(x, y, {
        w: rr(24,32),
        col: jitterCol(darken(hexRGB(pick(tone.cloth)), rr(0.02,0.08)), 0.03),
        steps: ri(4,6), stepLen: rr(11,14),
        yMin: tableTopY-4,
        shadow:false, flecks:false, simple:true,
      });
    }
  }
}

// ── 中景：塞納河 + 綠蔭 ──
function genBackground(){
  const n = 1100;
  for(let i=0;i<n;i++){
    const x = rr(-20, PW+20);
    const y = rr(-20, tableTopY-6);
    // 上半偏樹蔭、河面帶在中段偏右露出
    const riverBand = y > PH*0.32 && y < PH*0.52 && x > PW*0.3;
    let col;
    if(riverBand && rand()<0.6){
      col = hexRGB(pick(tone.river));
    } else {
      const zone = noise(x*0.004, y*0.004);
      const idx = Math.max(0, Math.min(tone.foliage.length-1,
        Math.floor(zone*tone.foliage.length + rr(-0.6,0.6))));
      col = hexRGB(tone.foliage[idx]);
      // 透光的亮葉
      if(rand()<0.12) col = lighten(col, rr(0.15,0.35));
    }
    addFlowStroke(x, y, {
      w: rr(8,13), col: jitterCol(col,0.06),
      steps: ri(4,8), stepLen: rr(8,12),
      yMax: tableTopY-2,
      shadow:false, flecks:false,
    });
  }
  // 遠處帆船 0-2
  sailCount = ri(0,2);
  for(let i=0;i<sailCount;i++){
    const sx = PW*rr(0.42,0.85);
    const sy = PH*rr(0.34,0.44);
    const sh = rr(22,38);
    const sailCol = lighten(hexRGB(pick(tone.cloth)), 0.15);
    addPaint(sx, sy, sx+rr(-4,4), sy-sh,
      { w: rr(8,12), col: sailCol, bend: rr(3,8), profile:'taper', shadow:false, flecks:false });
    addPaint(sx-2, sy+2, sx+rr(10,18), sy+rr(0,4),
      { w: rr(4,6), col: darken(hexRGB(pick(tone.river)),0.3), bend: rr(-3,3), shadow:false, flecks:false });
  }
}

// ── 欄杆 ──
function genRailing(){
  const railCol = hexRGB(tone.rail);
  const x0 = -10, y0 = PH*rr(0.58,0.62);
  const x1 = PW*rr(0.52,0.6), y1 = PH*rr(0.40,0.44);
  // 上下兩道橫桿
  for(let k=0;k<2;k++){
    const oy = k*rr(16,22);
    let t = 0;
    while(t<1){
      const t2 = Math.min(1, t+rr(0.15,0.3));
      addPaint(x0+(x1-x0)*t, y0+(y1-y0)*t+oy, x0+(x1-x0)*t2, y0+(y1-y0)*t2+oy,
        { w: k===0?rr(9,12):rr(6,8), col: jitterCol(railCol,0.06),
          bend: rr(-4,4), shadow:false });
      if(t2>=1) break;
      t = t2 - rr(0,0.03);
    }
  }
  // 直柱
  const nP = ri(4,6);
  for(let i=0;i<nP;i++){
    const t = (i+0.5)/nP + rr(-0.05,0.05);
    const px2 = x0+(x1-x0)*t, py2 = y0+(y1-y0)*t;
    addPaint(px2, py2, px2+rr(-3,3), py2+rr(26,38),
      { w: rr(6,9), col: jitterCol(darken(railCol,0.1),0.05), bend: rr(-3,3), shadow:false, flecks:false });
  }
}

// ── 遮陽棚：橘白條紋 + 扇貝邊 ──
function genAwning(){
  // 打底（不透明斜面多邊形）
  const base = darken(hexRGB(tone.awning2[0]), 0.1);
  tasks.push(()=>{
    pg.noStroke();
    pg.fill(base[0], base[1], base[2], 255);
    pg.beginShape();
    pg.vertex(-4, -4);
    pg.vertex(PW+4, -4);
    pg.vertex(PW+4, awn.yr);
    for(let x=PW; x>=0; x-=24) pg.vertex(x, awnYat(x)+2);
    pg.vertex(-4, awn.yl);
    pg.endShape(CLOSE);
  });
  // 條紋筆觸：沿棚面斜向
  for(let x=-30; x<PW+50; x+=13){
    const stripeIdx = Math.floor(x/awn.stripeW);
    const isOrange = stripeIdx%2===0;
    const col = hexRGB(pick(isOrange ? tone.awning : tone.awning2));
    const yb = awnYat(Math.max(0,Math.min(PW,x)));
    addPaint(x, -8, x + yb*awn.lean, yb+3,
      { w: rr(15,19), col: jitterCol(col,0.05),
        bend: rr(-5,5), shadow:false, flecks:false });
  }
  // 扇貝邊：沿下緣的半圓帽
  tasks.push(()=>{
    pg.noStroke();
    for(let x=8; x<PW; x+=26){
      const stripeIdx = Math.floor(x/awn.stripeW);
      const isOrange = stripeIdx%2===0;
      const col = jitterCol(hexRGB(pick(isOrange ? tone.awning : tone.awning2)), 0.05);
      const y = awnYat(x);
      pg.fill(col[0],col[1],col[2],255);
      pg.arc ? pg.arc(x, y+2, 27, 24, 0, Math.PI) : pg.ellipse(x, y+6, 27, 18);
    }
  });
  // 下緣陰影線
  let x = -5;
  while(x<PW){
    const len = rr(60,110);
    const y1 = awnYat(x), y2 = awnYat(Math.min(PW,x+len));
    addPaint(x, y1+14, x+len, y2+14,
      { w: rr(5,7), col: darken(hexRGB(tone.awning[0]),0.35), bend: rr(-3,3), shadow:false, flecks:false });
    x += len*rr(0.9,1.2);
  }
}

// ── 棚柱 ──
function genPoles(){
  const poleCol = darken(hexRGB(tone.rail), 0.1);
  const xs = [PW*rr(0.06,0.1), PW*rr(0.6,0.68)];
  for(const px2 of xs){
    const yTop = awnYat(px2)+6;
    const yBot = tableTopY + rr(10,40);
    addPaint(px2, yTop, px2+rr(-4,4), yBot,
      { w: rr(9,12), col: jitterCol(poleCol,0.05), bend: rr(-4,4), shadow:false });
    // 柱頭亮緣
    addPaint(px2-3, yTop+4, px2-3, yBot-6,
      { w: rr(3,4), col: lighten(poleCol,0.3), bend: rr(-3,3), shadow:false, flecks:false });
  }
}

// ── 桌布 ──
function genTablecloth(){
  const n = 420;
  for(let i=0;i<n;i++){
    const x = rr(-20, PW+20);
    const y = rr(tableTopY, PH+14);
    let col;
    if(rand()<0.16){
      col = hexRGB(pick(tone.clothShade));   // 布褶的藍紫陰影
    } else {
      col = hexRGB(pick(tone.cloth));
    }
    const depth = (y-tableTopY)/(PH-tableTopY);
    col = depth>0.55 ? darken(col, (depth-0.55)*0.16) : lighten(col, (0.55-depth)*0.12);
    const isLong = rand()<0.35;
    addFlowStroke(x, y, {
      w: isLong ? rr(8,12) : rr(10,16),
      col: jitterCol(col,0.04),
      steps: isLong ? ri(8,13) : ri(3,6),
      stepLen: rr(9,14),
      yMin: tableTopY-2,
      shadow:false, flecks:false,
    });
  }
  // 桌沿
  let x = -10;
  while(x<PW+10){
    const len = rr(70,120);
    addPaint(x, tableTopY+rr(-2,2), x+len, tableTopY+rr(-3,3),
      { w: rr(7,10), col: jitterCol(hexRGB(pick(tone.clothShade)),0.05),
        bend: rr(-4,4), shadow:false, flecks:false });
    x += len*rr(0.7,1.0);
  }
}

// ── 餐桌靜物：酒瓶、玻璃杯、水果盤 ──
function genTableItems(){
  const bottleSlots = [
    {x:PW*0.36, y:tableTopY+52, h:72},
    {x:PW*0.48, y:tableTopY+38, h:82},
    {x:PW*0.56, y:tableTopY+62, h:64},
    {x:PW*0.65, y:tableTopY+44, h:58},
  ];
  bottleCount = bottleSlots.length;
  for(const b of bottleSlots){
    const bx = b.x + rr(-8,8);
    const by = b.y + rr(-5,5);
    const h = b.h + rr(-5,5);
    const col = hexRGB(pick(BOTTLE_G));
    addPaint(bx, by, bx+rr(-2,2), by-h*0.62,
      { w: rr(14,18), col: jitterCol(col,0.05), bend: rr(-3,3), shadow:false });
    addPaint(bx, by-h*0.58, bx+rr(-2,2), by-h,
      { w: rr(6,7.5), col: jitterCol(darken(col,0.1),0.05), bend: rr(-2,2), shadow:false, flecks:false });
    addPaint(bx-4, by-6, bx-4, by-h*0.55,
      { w: rr(2.5,3.5), col: lighten(col,0.45), bend: rr(-2,2), shadow:false, flecks:false });
    addPaint(bx-14, by+5, bx+16, by+6,
      { w: rr(5,7), col: darken(hexRGB(pick(tone.cloth)),0.25), bend: rr(-2,2), shadow:false, flecks:false });
  }
  const glasses = [
    [PW*0.22, tableTopY+92, 36], [PW*0.31, tableTopY+78, 24],
    [PW*0.43, tableTopY+88, 30], [PW*0.59, tableTopY+82, 34],
    [PW*0.71, tableTopY+72, 26], [PW*0.78, tableTopY+104, 36],
  ];
  for(const g of glasses){
    const gx = g[0] + rr(-7,7);
    const gy = g[1] + rr(-5,5);
    const gh = g[2] + rr(-3,3);
    const glass = lighten(hexRGB(pick(tone.cloth)), 0.2);
    addPaint(gx, gy, gx+rr(-1,1), gy-gh,
      { w: rr(8,11), col: jitterCol(glass,0.04), bend: rr(-2,2), shadow:false, flecks:false });
    if(rand()<0.55) tasks.push(()=>{
      pg.noStroke();
      pg.fill(150, 40, 60, 235);
      pg.ellipse(gx, gy-gh*0.35, 8, gh*0.4);
    });
    tasks.push(()=>{
      pg.noStroke();
      pg.fill(255,255,255,160);
      pg.ellipse(gx-2, gy-gh, 5, 2.5);
    });
  }
  const bowls = [
    [PW*0.40, tableTopY+112, 34],
    [PW*0.54, tableTopY+100, 28],
  ];
  for(const bowl of bowls){
    const fx = bowl[0] + rr(-8,8);
    const fy = bowl[1] + rr(-5,5);
    addPaint(fx-30, fy, fx+30, fy+rr(-2,2),
      { w: rr(8,11), col: jitterCol(lighten(hexRGB(pick(tone.cloth)),0.1),0.04),
        bend: rr(2,5), shadow:false, flecks:false });
    tasks.push(()=>{
      pg.noStroke();
      const nF = ri(10,16);
      for(let f=0;f<nF;f++){
        const col = hexRGB(pick(FRUIT));
        const a = rand()*Math.PI*2, d = Math.sqrt(rand());
        const fx2 = fx + Math.cos(a)*22*d;
        const fy2 = fy - 6 - Math.abs(Math.sin(a))*10*d - rr(0,6);
        pg.fill(col[0],col[1],col[2],255);
        pg.ellipse(fx2, fy2, rr(9,14), rr(8,12));
        pg.fill(255,255,255,90);
        pg.ellipse(fx2-2, fy2-2, 3.5, 3);
      }
    });
  }
  // 散落餐具與餐巾，讓白桌面更像午宴而不是空白桌布。
  for(const p of [[0.28,126], [0.47,132], [0.62,118], [0.72,112]]){
    const cx = PW*p[0] + rr(-10,10), cy = tableTopY+p[1]+rr(-6,6);
    addPaint(cx-22, cy, cx+24, cy+rr(-4,4),
      { w: rr(4,6), col: lighten(hexRGB(pick(tone.cloth)),0.25), bend: rr(-4,4), shadow:false, flecks:false });
    addPaint(cx-18, cy+10, cx+20, cy+12,
      { w: rr(2,3), col: darken(hexRGB(pick(tone.clothShade)),0.1), bend: rr(-2,2), shadow:false, flecks:false });
  }
}

// ── 印象派人物 ──
function drawFace(hx, headY, headR, dir, skin, hairCol, female, profile){
  tasks.push(()=>{
    pg.noStroke();
    const sh = darken(skin,0.16);
    pg.fill(sh[0],sh[1],sh[2],255);
    pg.ellipse(hx+headR*0.16, headY+headR*0.1, headR*2.05, headR*2.1);
    pg.fill(skin[0],skin[1],skin[2],255);
    if(profile){
      pg.ellipse(hx, headY, headR*1.78, headR*2.05);
      pg.ellipse(hx+dir*headR*0.78, headY+headR*0.08, headR*0.6, headR*0.52);
    } else {
      pg.ellipse(hx, headY, headR*2, headR*2.05);
    }
    pg.fill(hairCol[0],hairCol[1],hairCol[2],255);
    pg.ellipse(hx-dir*headR*0.08, headY-headR*0.62, headR*1.9, headR*1.02);
    if(female){
      pg.ellipse(hx-dir*headR*0.82, headY-headR*0.1, headR*0.7, headR*1.1);
      pg.ellipse(hx+dir*headR*0.78, headY, headR*0.52, headR*0.9);
    }
    pg.fill(70,45,38,210);
    pg.ellipse(hx+dir*headR*0.36, headY-headR*0.08, headR*0.18, headR*0.13);
    if(!profile) pg.ellipse(hx-dir*headR*0.34, headY-headR*0.08, headR*0.16, headR*0.12);
    pg.fill(130,68,62,160);
    pg.ellipse(hx+dir*headR*0.18, headY+headR*0.52, headR*0.48, headR*0.16);
    pg.fill(224,130,110,80);
    pg.ellipse(hx-dir*headR*0.38, headY+headR*0.32, headR*0.62, headR*0.45);
  });
}

function drawHat(hx, headY, headR, kind, dir){
  if(kind==='none') return;
  if(kind==='straw' || kind==='wide-straw' || kind==='flower'){
    strawCount++;
    const straw = hexRGB(pick(HAT_STRAW));
    tasks.push(()=>{
      pg.noStroke();
      pg.push();
      pg.translate(hx, headY-headR*0.88);
      pg.rotate(dir*rr(0.04,0.14));
      const d = darken(straw,0.25);
      pg.fill(d[0],d[1],d[2],255);
      pg.ellipse(0, headR*0.15, headR*(kind==='wide-straw'?3.7:3.0), headR*0.8);
      pg.fill(straw[0],straw[1],straw[2],255);
      pg.ellipse(0, 0, headR*(kind==='wide-straw'?3.55:2.9), headR*0.72);
      pg.ellipse(-dir*headR*0.08, -headR*0.35, headR*1.65, headR*0.95);
      pg.fill(40,38,48,245);
      pg.ellipse(-dir*headR*0.08, -headR*0.18, headR*1.72, headR*0.26);
      if(kind==='flower'){
        for(let f=0;f<5;f++){
          const fc = hexRGB(pick(FLOWER_DAB));
          pg.fill(fc[0],fc[1],fc[2],255);
          pg.ellipse(-headR*0.45+rr(-5,5), -headR*0.15+rr(-4,4), headR*0.45, headR*0.38);
        }
      }
      pg.pop();
    });
    return;
  }
  tasks.push(()=>{
    pg.noStroke();
    pg.fill(46,42,40,255);
    pg.ellipse(hx, headY-headR*0.75, headR*2.35, headR*0.6);
    pg.ellipse(hx-dir*headR*0.08, headY-headR*1.1, headR*1.5, headR*0.9);
  });
}

function genFigure(x, y, s, opts){
  const o = opts || {};
  const female = o.female !== undefined ? o.female : rand()<0.45;
  const dir = o.dir || (rand()<0.5 ? -1 : 1);
  figures.push({x, y, s, female});
  const skin = hexRGB(pick(SKIN));
  const coat = female
    ? hexRGB(o.coat || pick(tone.dress))
    : hexRGB(o.coat || (rand()<0.55 ? pick(tone.shirt) : tone.vest));

  const torsoH = (o.torsoH || 60)*s, torsoW = (o.torsoW || 42)*s;
  addPaint(x-torsoW*0.18, y, x-dir*torsoW*0.04, y-torsoH*0.96,
    { w: torsoW*0.64, col: jitterCol(coat,0.05), bend: dir*rr(4,10)*s, shadow:false });
  addPaint(x+torsoW*0.25, y-4*s, x+dir*torsoW*0.16, y-torsoH*0.9,
    { w: torsoW*0.48, col: jitterCol(darken(coat,0.14),0.05), bend: -dir*rr(4,9)*s, shadow:false, flecks:false });
  addPaint(x-torsoW*0.52, y-torsoH*0.82, x+torsoW*0.52, y-torsoH*0.86,
    { w: 16*s, col: jitterCol(coat,0.05), bend: dir*rr(2,7)*s, shadow:false, flecks:false });
  const shirt = lighten(hexRGB(pick(tone.shirt)),0.08);
  if(!female || o.whiteFront){
    addPaint(x-dir*8*s, y-torsoH*0.83, x+dir*3*s, y-torsoH*0.42,
      { w: 12*s, col: shirt, bend: dir*rr(1,4)*s, shadow:false, flecks:false });
  }
  const armCol = o.bareArms ? skin : coat;
  const armY = o.armY || tableTopY + 58;
  if(o.armTo){
    addPaint(x+dir*torsoW*0.36, y-torsoH*0.55, o.armTo.x, o.armTo.y,
      { w: (o.bareArms?12:10)*s, col: jitterCol(armCol,0.05), bend: dir*rr(12,26)*s, profile:'taper', shadow:false, flecks:false });
  } else if(o.front || rand()<0.75){
    addPaint(x+dir*torsoW*0.38, y-torsoH*0.66, x+dir*torsoW*rr(0.75,1.05), armY,
      { w: (o.bareArms?12:10)*s, col: jitterCol(armCol,0.05), bend: dir*rr(8,18)*s, profile:'taper', shadow:false, flecks:false });
  }

  const headR = 12*s;
  const headY = y - torsoH - headR*0.7;
  const hx = x + (o.headDx || 0)*s + rr(-1.5,1.5)*s;
  const hairCol = hexRGB(pick(HAIR));
  drawFace(hx, headY, headR, dir, skin, hairCol, female, !!o.profile);
  if(!female && (o.beard || rand()<0.32)){
    tasks.push(()=>{
      pg.noStroke();
      pg.fill(hairCol[0],hairCol[1],hairCol[2],235);
      pg.ellipse(hx+dir*headR*0.18, headY+headR*0.62, headR*1.05, headR*0.52);
    });
  }
  drawHat(hx, headY, headR, o.hat || (female ? (rand()<0.7?'flower':'none') : (rand()<0.62?'straw':'dark')), dir);
}

// ── 後排賓客（沿欄杆）──
function genFiguresBack(){
  genFigure(PW*0.08, tableTopY-46, 2.35, {
    female:false, dir:1, profile:true, hat:'wide-straw', coat:'#EEEAE0',
    torsoH:78, torsoW:46, bareArms:true, front:false, beard:true,
  });
  const guests = [
    {x:0.32, y:-58, s:1.35, female:true,  dir:1, hat:'wide-straw', coat:'#E2D8CC', armTo:{x:PW*0.38,y:tableTopY-22}},
    {x:0.52, y:-76, s:1.16, female:false, dir:-1, hat:'dark', coat:'#8A5A38'},
    {x:0.63, y:-64, s:1.22, female:false, dir:1, profile:true, hat:'dark', coat:'#25324E'},
    {x:0.72, y:-28, s:1.25, female:true,  dir:-1, hat:'straw', coat:'#EEEAE0', armTo:{x:PW*0.70,y:tableTopY+8}},
    {x:0.84, y:-42, s:1.42, female:false, dir:1, profile:true, hat:'dark', coat:'#5A3E2E', beard:true},
    {x:0.93, y:-30, s:1.25, female:true,  dir:-1, hat:'flower', coat:'#C46470'},
  ];
  for(const g of guests){
    genFigure(PW*g.x+rr(-8,8), tableTopY+g.y+rr(-6,6), g.s, g);
  }
}

// ── 前排賓客（圍著餐桌，最大）──
function genFiguresFront(){
  genFigure(PW*0.16, tableTopY+160, 2.35, {
    female:true, dir:1, profile:true, hat:'flower', coat:'#2E4568',
    torsoH:74, torsoW:48, front:true, armTo:{x:PW*0.24,y:tableTopY+80},
  });
  tasks.push(()=>{
    pg.noStroke();
    const fur = hexRGB('#2D2B26');
    pg.fill(fur[0],fur[1],fur[2],245);
    pg.ellipse(PW*0.245, tableTopY+71, 48, 34);
    pg.fill(235,230,220,230);
    pg.ellipse(PW*0.232, tableTopY+62, 22, 20);
  });
  genFigure(PW*0.50, tableTopY+120, 2.08, {
    female:false, dir:-1, profile:true, hat:'dark', coat:'#5A3E2E',
    torsoH:78, torsoW:54, front:true, armTo:{x:PW*0.44,y:tableTopY+68},
  });
  genFigure(PW*0.70, tableTopY+130, 2.05, {
    female:true, dir:1, profile:true, hat:'none', coat:'#4E6D96',
    torsoH:70, torsoW:48, front:true, armTo:{x:PW*0.76,y:tableTopY+91},
  });
  genFigure(PW*0.86, tableTopY+205, 2.55, {
    female:false, dir:-1, profile:true, hat:'wide-straw', coat:'#EEEAE0',
    torsoH:82, torsoW:54, bareArms:true, front:true, armTo:{x:PW*0.75,y:tableTopY+126},
  });
  genFigure(PW*0.78, tableTopY+70, 1.82, {
    female:false, dir:-1, profile:true, hat:'none', coat:'#EEEAE0',
    torsoH:62, torsoW:44, whiteFront:true, front:true, armTo:{x:PW*0.72,y:tableTopY+54},
  });
}

// ── 畫布顆粒 ──
function genGrain(){
  tasks.push(()=>{
    pg.noStroke();
    const n = Math.floor(PW*PH*0.004);
    for(let i=0;i<n;i++){
      const gx = rand()*PW, gy = rand()*PH;
      const t = (rand()-0.5)*40;
      pg.fill(clamp255(132+t), clamp255(126+t), clamp255(112+t), 9);
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
  pg.background(180, 175, 160);
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
    save(pg, `boating-party-${fxhash.slice(2,10)}`, 'png');
    return false;
  }
  if(key==='r' || key==='R'){
    location.reload();
  }
}
