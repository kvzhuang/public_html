// ============================================
// Starry Night 星夜 - Generative Art
// 以演算法重現梵谷《星夜》(1889) 的厚塗筆觸與漩渦夜空
// 引擎移植自 gen-art/sunflowers（本身移植自 oil-paint）：
//   厚塗筆觸（bezier/流場板狀筆觸 + 鬃毛紋 + 高光/陰影稜線）
//   + 漩渦流場（旋轉星雲）+ 光源提亮（月暈、星光）
// 場景：漩渦夜空 → 月 → 星 → 遠山 → 山村教堂 → 前景絲柏
// ============================================

const rand = fxrand;

// 畫布內部解析度（原作 92×73cm 橫幅比例）
const PW = 1160, PH = 920;

// ════════════════ 顏料盤 ════════════════
const SKY_BLUES   = ['#0E2246','#12315C','#183A6B','#1E4374','#264F86','#15335F','#1B3D6E'];
const SKY_MID     = ['#2E63A6','#3A72B4','#265696','#3468A8','#2A5C9C'];
const SKY_LIGHT   = ['#6E9BD0','#8FB4DE','#B7D2ED','#5786C0','#A0C1E4']; // 漩渦亮帶
const SKY_ACCENT  = ['#3E3C78','#4A4488','#5B5296','#6E5F9C','#7C6BA0','#8A6E9C']; // 靛紫夢幻點綴
const SKY_PINK    = ['#B98AAE','#C99AB5','#A87FA0']; // 極少量粉紫
const STAR_YELLOW = ['#F4D66A','#F8E58C','#FBEEA8','#EFC94E','#F2D262'];
const STAR_CORE   = ['#FDF3C0','#FCEEA6','#FBE58C'];
const MOON_GLOW   = ['#F2A93C','#E89A2E','#EFB44E','#DF9028'];
const MOON_YEL    = ['#F8D66A','#FBE58C','#F4C84E'];
const HILL_DARK   = ['#15303A','#123640','#1C4048','#0E2830','#204A48'];
const HILL_LIGHT  = ['#2E5A5A','#356A64','#274E50'];
const WALL_COLS   = ['#2A2E3E','#343A4E','#3E3830','#4A4436','#2E3646','#43392E'];
const ROOF_COLS   = ['#1E2230','#262A38','#3A2E26','#442E22'];
const WINDOW_LIT  = ['#F7DA70','#FBE896','#F2C74E'];
const CYPRESS     = ['#0C1712','#12211A','#0A1410','#1C2E24','#16261E'];
const CYPRESS_HI  = ['#2A4030','#22381E','#1E3A2C'];
const CHURCH_WALL = ['#2C3444','#343C4E','#283040'];
const SPIRE_COL   = ['#20283A','#28324A'];

let tasks = [], taskIdx = 0, perFrame = 40, pg, finished = false;
let vortices = [];
let stars = [], moon = null;
let horizonY = 0;
let skyGlows = [];   // {x,y,r,g} 供 sky 筆觸提亮（月、星）

// ════════════════ 工具 ════════════════
function weightedPick(items, weights){
  const total = weights.reduce((a,b)=>a+b,0);
  let r = rand()*total;
  for(let i=0;i<items.length;i++){ r -= weights[i]; if(r<0) return items[i]; }
  return items[items.length-1];
}
const rr = (a,b)=>a+rand()*(b-a);
const ri = (a,b)=>Math.floor(rr(a,b+1));
const pick = arr=>arr[Math.floor(rand()*arr.length)];

function hexRGB(hex){ return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]; }
function lighten(rgb,t){ return [Math.round(rgb[0]+(255-rgb[0])*t), Math.round(rgb[1]+(255-rgb[1])*t), Math.round(rgb[2]+(255-rgb[2])*t)]; }
function darken(rgb,t){ return [Math.round(rgb[0]*(1-t)), Math.round(rgb[1]*(1-t)), Math.round(rgb[2]*(1-t))]; }
function mixRGB(a,b,t){ return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)]; }
function clamp255(x){ return Math.max(0, Math.min(255, Math.round(x))); }
function jitterCol(rgb,amt){ const d=()=>(rand()-0.5)*2*amt*255; return [clamp255(rgb[0]+d()), clamp255(rgb[1]+d()), clamp255(rgb[2]+d())]; }

// ════════════════ 厚塗筆觸引擎（移植）════════════════
function bezPt(s,t){
  const u = 1-t;
  return {
    x: u*u*u*s.x1 + 3*u*u*t*s.cpx1 + 3*u*t*t*s.cpx2 + t*t*t*s.x2,
    y: u*u*u*s.y1 + 3*u*u*t*s.cpy1 + 3*u*t*t*s.cpy2 + t*t*t*s.y2,
  };
}
function widthProfile(profile, w){
  if(profile==='taper'){
    return t=>{ const u=Math.max(0.001,Math.min(0.999,t)); const ramp=u<0.06?0.7+0.3*(u/0.06):1; return w*ramp*(1-0.72*Math.pow(u,1.25)); };
  }
  if(profile==='flame'){ // 絲柏／火焰：中段飽滿、兩端收尖
    return t=>{ const u=Math.max(0.001,Math.min(0.999,t)); return w*(0.34+0.72*Math.pow(Math.sin(u*Math.PI),0.75)); };
  }
  // square：方頭起筆、漸窄收筆
  return t=>{
    const u=Math.max(0.001,Math.min(0.999,t));
    let startRamp=u<0.08?0.62+0.40*(u/0.08):1; if(startRamp>1) startRamp=1;
    const endTaper=u<0.7?1:1-Math.pow((u-0.7)/0.3,1.1)*0.58;
    return w*startRamp*endTaper;
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
    const prev=samples[Math.max(0,i-1)], nxt=samples[Math.min(N,i+1)];
    const dx=nxt.x-prev.x, dy=nxt.y-prev.y; const l=Math.hypot(dx,dy)||1;
    perps.push({ x:-dy/l, y:dx/l });
  }
  const col = s.col;
  const widthAt = widthProfile(s.profile, s.width);
  const edgeJ = Math.max(1.2, s.width*0.06);
  pg.noStroke();
  if(s.simple){
    const lo0=darken(col,0.22); pg.fill(lo0[0],lo0[1],lo0[2],255);
    drawSlab(samples,perps,t=>widthAt(t)*1.02, 0,0, edgeJ);
    const jc0=jitterCol(col,0.05); pg.fill(jc0[0],jc0[1],jc0[2],255);
    drawSlab(samples,perps,t=>widthAt(t)*0.9, 0,0, edgeJ*0.9);
    return;
  }
  if(s.shadow!==false){ pg.fill(6,8,16,60); drawSlab(samples,perps,widthAt, s.width*0.14+1, s.width*0.18+1.2, edgeJ); }
  const lo=darken(col,0.30); pg.fill(lo[0],lo[1],lo[2],255);
  drawSlab(samples,perps,t=>widthAt(t)*1.02, 0,0, edgeJ);
  const jc=jitterCol(col,0.05); pg.fill(jc[0],jc[1],jc[2],255);
  drawSlab(samples,perps,t=>widthAt(t)*0.92, 0,0, edgeJ*0.9);
  const bristleCount = Math.max(3, Math.min(10, Math.floor(s.width/3.2)));
  for(let b=0;b<bristleCount;b++) drawBristle(samples,perps,(b+0.5)/bristleCount-0.5, col, widthAt);
  if(N>=10){
    const hi=lighten(col, s.hi!==undefined?s.hi:0.55);
    drawRim(samples,perps, 0.36, hi, 200, widthAt, Math.max(1.1, s.width*0.07));
    const deep=darken(col,0.55);
    drawRim(samples,perps,-0.40, deep, 175, widthAt, Math.max(1.0, s.width*0.06));
    drawCenterBand(samples,perps,col,widthAt, Math.max(1.2, s.width*0.09), s.hi);
  }
  if(s.flecks!==false && rand()<0.55) edgeFlecks(samples,perps,col,s.width,widthAt);
}
function drawSlab(samples,perps,widthFn,ox,oy,edgeJ){
  const N=samples.length-1, capSteps=6;
  pg.beginShape();
  for(let i=0;i<=N;i++){ const w=widthFn(i/N)*0.5;
    pg.vertex(samples[i].x+perps[i].x*w+(rand()-0.5)*edgeJ+ox, samples[i].y+perps[i].y*w+(rand()-0.5)*edgeJ+oy); }
  const rE=widthFn(1)*0.5, pE=perps[N], tE={x:pE.y,y:-pE.x};
  for(let c=1;c<capSteps;c++){ const th=(c/capSteps)*Math.PI, ct=Math.cos(th), st=Math.sin(th);
    pg.vertex(samples[N].x+rE*(pE.x*ct+tE.x*st)+ox, samples[N].y+rE*(pE.y*ct+tE.y*st)+oy); }
  for(let i=N;i>=0;i--){ const w=widthFn(i/N)*0.5;
    pg.vertex(samples[i].x-perps[i].x*w+(rand()-0.5)*edgeJ+ox, samples[i].y-perps[i].y*w+(rand()-0.5)*edgeJ+oy); }
  const rS=widthFn(0)*0.5, pS=perps[0], tS={x:pS.y,y:-pS.x};
  for(let c=1;c<capSteps;c++){ const th=(c/capSteps)*Math.PI, ct=Math.cos(th), st=Math.sin(th);
    pg.vertex(samples[0].x+rS*(-pS.x*ct-tS.x*st)+ox, samples[0].y+rS*(-pS.y*ct-tS.y*st)+oy); }
  pg.endShape(CLOSE);
}
function drawBristle(samples,perps,offFrac,baseCol,widthFn){
  const N=samples.length-1;
  let jc=jitterCol(baseCol,0.14);
  const blend=Math.max(-1,Math.min(1,-offFrac*2));
  jc=mixRGB(jc, blend>0?lighten(baseCol,0.45):darken(baseCol,0.45), Math.abs(blend)*0.4);
  const alpha=180+Math.floor(rand()*55);
  const wt=Math.max(0.7, 1.0+(rand()-0.5)*0.7);
  const wobble=(rand()-0.5)*0.08;
  pg.noFill(); pg.stroke(jc[0],jc[1],jc[2],alpha); pg.strokeWeight(wt); pg.strokeCap(ROUND);
  let inShape=false, skipUntil=-1;
  for(let i=0;i<=N;i++){
    if(i<=skipUntil) continue;
    const t=i/N;
    if(t>0.15 && t<0.85 && rand()<0.02){ if(inShape){pg.endShape();inShape=false;} skipUntil=i+1+Math.floor(rand()*3); continue; }
    const w=widthFn(t); const off=(offFrac+wobble)*w*0.78;
    if(!inShape){ pg.beginShape(); inShape=true; }
    pg.vertex(samples[i].x+perps[i].x*off+(rand()-0.5)*w*0.07, samples[i].y+perps[i].y*off+(rand()-0.5)*w*0.07);
  }
  if(inShape) pg.endShape();
  pg.noStroke();
}
function drawRim(samples,perps,offFrac,col,alpha,widthFn,weight){
  const N=samples.length-1;
  pg.noFill(); pg.stroke(col[0],col[1],col[2],alpha); pg.strokeWeight(weight); pg.strokeCap(ROUND);
  pg.beginShape();
  for(let i=2;i<=N-2;i++){ const w=widthFn(i/N); pg.vertex(samples[i].x+perps[i].x*offFrac*w, samples[i].y+perps[i].y*offFrac*w); }
  pg.endShape(); pg.noStroke();
}
function drawCenterBand(samples,perps,baseCol,widthFn,weight,hi){
  const N=samples.length-1;
  const band=lighten(baseCol, hi!==undefined?hi*0.8:0.42);
  pg.noFill(); pg.stroke(band[0],band[1],band[2],185); pg.strokeWeight(weight); pg.strokeCap(ROUND);
  pg.beginShape();
  const i0=Math.floor(N*0.1), i1=Math.floor(N*0.9);
  for(let i=i0;i<=i1;i++){ const w=widthFn(i/N);
    pg.vertex(samples[i].x+perps[i].x*w*0.08+(rand()-0.5)*w*0.04, samples[i].y+perps[i].y*w*0.08+(rand()-0.5)*w*0.04); }
  pg.endShape(); pg.noStroke();
}
function edgeFlecks(samples,perps,col,baseW,widthFn){
  const N=samples.length-1; pg.noStroke();
  for(let i=1;i<N;i++){
    if(rand()>0.18) continue;
    const t=i/N, w=widthFn(t); const side=rand()<0.5?1:-1; const off=w*0.5*(1+rand()*0.4)*side;
    const x=samples[i].x+perps[i].x*off+(rand()-0.5)*w*0.25, y=samples[i].y+perps[i].y*off+(rand()-0.5)*w*0.25;
    const r=baseW*0.1*Math.pow(rand(),1.5);
    pg.push(); pg.translate(x,y); pg.rotate(rand()*Math.PI*2);
    pg.fill(col[0],col[1],col[2],210);
    pg.ellipse(0,0,Math.max(0.5,r*(0.7+rand()*0.7)),Math.max(0.4,r*(0.3+rand()*0.5)));
    pg.pop();
  }
}

// ════════════════ 漩渦流場（旋轉夜空）════════════════
function blendAngle(a, b, t){ const d=Math.atan2(Math.sin(b-a), Math.cos(b-a)); return a + d*t; }

function flowAngle(x, y){
  // 基底：近水平、緩慢起伏的亂流（夜空的橫向流動）
  let a = (noise(x*0.0019, y*0.0021)-0.5)*1.7;
  // 漩渦（星雲旋轉）
  for(const v of vortices){
    const dx=x-v.x, dy=y-v.y, d=Math.hypot(dx,dy);
    if(d < v.r){
      const t = Math.atan2(dy, dx) + (Math.PI/2)*v.s;
      const w = Math.pow(1 - d/v.r, 0.6);
      a = blendAngle(a, t, w*0.95);
    }
  }
  return a;
}
// 漩渦權重（提亮漩渦內的筆觸）
function vortexGlow(x, y){
  let g=0;
  for(const v of vortices){ const d=Math.hypot(x-v.x,y-v.y); if(d<v.r) g=Math.max(g, Math.pow(1-d/v.r,0.85)); }
  return g;
}
// 光源提亮（月、星附近的夜空更亮）
function lightGlow(x, y){
  let g=0;
  for(const s of skyGlows){ const d=Math.hypot(x-s.x,y-s.y); if(d<s.r) g=Math.max(g, s.g*Math.pow(1-d/s.r,1.1)); }
  return g;
}
function traceFlow(x0, y0, steps, stepLen, yMax){
  const pts=[{x:x0,y:y0}]; let x=x0,y=y0; let pa=flowAngle(x,y);
  for(let i=0;i<steps;i++){
    const a=blendAngle(pa, flowAngle(x,y), 0.55);
    const nx=x+Math.cos(a)*stepLen+rr(-1.2,1.2), ny=y+Math.sin(a)*stepLen+rr(-1.2,1.2);
    if(yMax!==undefined && ny>yMax) break;
    x=nx; y=ny; pts.push({x,y}); pa=a;
  }
  return pts;
}
function addFlowStroke(x0, y0, opts){
  const o=opts||{};
  const pts=traceFlow(x0,y0, o.steps||ri(6,10), o.stepLen||rr(9,13), o.yMax);
  if(pts.length<4) return;
  const s={ width:o.w||10, col:Array.isArray(o.col)?o.col:hexRGB(o.col||'#264F86'),
    profile:o.profile||'square', shadow:o.shadow, flecks:o.flecks, simple:o.simple, hi:o.hi };
  tasks.push(()=>impastoLayers(pts, s));
}
function addPaint(x1,y1,x2,y2,opts){
  const o=opts||{}; const dx=x2-x1, dy=y2-y1; const len=Math.hypot(dx,dy)||1;
  const nx=-dy/len, ny=dx/len;
  const bend=o.bend!==undefined?o.bend:(rand()-0.5)*len*0.25;
  const bend2=o.bend2!==undefined?o.bend2:bend*rr(0.3,0.8)*(rand()<0.3?-1:1);
  const s={ x1,y1,x2,y2,
    cpx1:x1+dx*0.3+nx*bend2, cpy1:y1+dy*0.3+ny*bend2,
    cpx2:x1+dx*0.7+nx*bend,  cpy2:y1+dy*0.7+ny*bend,
    width:o.w||10, col:Array.isArray(o.col)?o.col:hexRGB(o.col||'#264F86'),
    profile:o.profile||'square', shadow:o.shadow, flecks:o.flecks, hi:o.hi };
  tasks.push(()=>renderImpasto(s));
}

// ════════════════ 場景生成 ════════════════
function generateScene(){
  tasks=[]; taskIdx=0; finished=false;
  vortices=[]; stars=[]; skyGlows=[]; moon=null;

  horizonY = PH*rr(0.66, 0.71);

  // ── 主漩渦：星夜招牌的雙渦（中偏左），一順一逆 ──
  const swirlCx = PW*rr(0.40,0.50), swirlCy = PH*rr(0.30,0.38);
  vortices.push({ x:swirlCx, y:swirlCy, r:PW*rr(0.24,0.30), s:(rand()<0.5?1:-1) });
  vortices.push({ x:swirlCx+PW*rr(0.10,0.16), y:swirlCy-PH*rr(0.02,0.06),
                  r:PW*rr(0.14,0.19), s:-vortices[0].s });
  // 額外幾個小渦點綴
  for(let i=0;i<ri(2,4);i++){
    vortices.push({ x:rr(PW*0.15,PW*0.9), y:rr(PH*0.08, horizonY*0.72),
                    r:PW*rr(0.06,0.12), s:(rand()<0.5?1:-1) });
  }

  // ── 月：右上，橘色光暈 + 黃色弦月 ──
  moon = { x:PW*rr(0.80,0.9), y:PH*rr(0.12,0.20), r:PW*rr(0.05,0.065),
           phase:rr(0.35,0.62)*(rand()<0.5?1:-1) };
  skyGlows.push({ x:moon.x, y:moon.y, r:moon.r*6.5, g:0.9 });
  vortices.push({ x:moon.x, y:moon.y, r:moon.r*4.2, s:(moon.phase>0?1:-1) });

  const nSwirl = vortices.length;  // 記錄「結構性」漩渦數（供 feature 顯示）

  // ── 晨星（金星）：左中偏上，最大最亮，原畫的視覺焦點 ──
  const msx=PW*rr(0.30,0.42), msy=PH*rr(0.26,0.40), msr=PW*rr(0.020,0.027), mss=rand()<0.5?1:-1;
  stars.push({ x:msx, y:msy, r:msr, s:mss, morning:true });
  skyGlows.push({ x:msx, y:msy, r:msr*6.5, g:0.98 });
  vortices.push({ x:msx, y:msy, r:msr*rr(6,8), s:mss });

  // ── 星：共約 11 顆（星夜有 11 顆星），散佈於天空、避開絲柏與月 ──
  const nStars = ri(9,12);
  let tries=0;
  while(stars.length<nStars && tries<400){
    tries++;
    const sx=rr(PW*0.20, PW*0.97), sy=rr(PH*0.05, horizonY-PH*0.05);
    const r=rr(PW*0.007, PW*0.016);
    if(Math.hypot(sx-moon.x, sy-moon.y) < moon.r*4) continue;      // 離月遠一點
    if(stars.some(o=>Math.hypot(o.x-sx,o.y-sy) < (o.r+r)*3.2)) continue; // 別擠一起
    const s = rand()<0.5?1:-1;                       // 這顆星的旋向
    stars.push({ x:sx, y:sy, r, s });
    skyGlows.push({ x:sx, y:sy, r:r*5.5, g:rr(0.5,0.8) });
    // 在星的位置放一個小漩渦，讓夜空流場繞著它捲 → 天空與星暈連成一體
    vortices.push({ x:sx, y:sy, r:r*rr(5.5,7.5), s });
  }

  genUnderpaint();
  genSky();
  genMoon();
  stars.forEach(genStar);
  genHills();
  genVillage();
  genCypress();
  genGrain();

  window.$fxhashFeatures = {
    '星數': stars.length,
    '漩渦': nSwirl,
    '月相': moon.phase>0 ? '右弦' : '左弦',
    '主渦向': vortices[0].s>0 ? '順時' : '逆時',
    '地平線': (horizonY/PH<0.68 ? '高' : '低'),
  };
  console.log('fxhash:', fxhash);
  console.log('features:', window.$fxhashFeatures);
  perFrame = Math.ceil(tasks.length/240);   // 約 4 秒畫完
}

// ── 打底：抖動網格 + 肥筆，保證覆蓋（間距 < 筆寬 → 無縫）──
function genUnderpaint(){
  tasks.push(()=>{
    pg.noStroke();
    pg.fill(14,28,58); pg.rect(0,0,PW,horizonY+40);
    pg.fill(16,26,32); pg.rect(0,horizonY+30,PW,PH-horizonY-30);
  });
  // 天空打底（順著流場的肥筆）
  for(let gy=-30; gy<horizonY; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x=gx+rr(-5,5), y=Math.min(gy+rr(-5,5), horizonY-4);
      const g=vortexGlow(x,y)*0.5 + lightGlow(x,y);
      let base = hexRGB(pick(SKY_BLUES));
      if(g>0.15) base = mixRGB(base, hexRGB(pick(SKY_MID)), Math.min(0.7,g));
      addFlowStroke(x, y, { w:rr(24,32), col:jitterCol(base,0.05),
        steps:ri(5,7), stepLen:rr(11,14), yMax:horizonY-2, shadow:false, flecks:false, simple:true });
    }
  }
  // 地面打底（平塗肥筆）
  for(let gy=horizonY-4; gy<PH+20; gy+=18){
    for(let gx=-30; gx<PW+30; gx+=18){
      const x=gx+rr(-5,5), y=gy+rr(-4,4);
      addPaint(x-rr(14,20), y, x+rr(14,20), y+rr(-3,3),
        { w:rr(24,30), col:jitterCol(hexRGB(pick(HILL_DARK)),0.05), profile:'square', shadow:false, flecks:false });
    }
  }
}

// ── 夜空：流場驅動的旋轉筆觸（星夜手法：短、密、捲）──
function genSky(){
  for(let gy=-14; gy<horizonY; gy+=10){
    for(let gx=-14; gx<PW+14; gx+=10){
      const x=gx+rr(-5,5), y=Math.min(gy+rr(-5,5), horizonY-6);
      const vg=vortexGlow(x,y), lg=lightGlow(x,y);
      const bright=Math.min(1, vg*0.85 + lg*1.1);
      let col;
      if(bright>0.62)      col = hexRGB(pick(SKY_LIGHT));
      else if(bright>0.34) col = mixRGB(hexRGB(pick(SKY_MID)), hexRGB(pick(SKY_LIGHT)), (bright-0.34)/0.28);
      else if(bright>0.14) col = mixRGB(hexRGB(pick(SKY_BLUES)), hexRGB(pick(SKY_MID)), (bright-0.14)/0.20);
      else                 col = hexRGB(pick(SKY_BLUES));
      // 靛紫夢幻點綴（中段亮度、渦內較常見），粉紫極少量
      if(bright>0.2 && bright<0.75 && rand()<0.14)
        col = mixRGB(col, hexRGB(pick(SKY_ACCENT)), rr(0.25,0.55));
      else if(rand()<0.015)
        col = mixRGB(col, hexRGB(pick(SKY_PINK)), rr(0.2,0.4));
      // 光暈邊緣帶點暖黃
      if(lg>0.3 && rand()<0.4) col = mixRGB(col, hexRGB(pick(STAR_YELLOW)), Math.min(0.5, lg*0.5));
      const w = rr(8,13) * (1 + bright*0.25);
      // 短而捲的筆觸：步數少、步長短
      addFlowStroke(x, y, { w, col:jitterCol(col,0.04),
        steps:ri(4,7), stepLen:rr(7,10.5), yMax:horizonY-2,
        hi: bright>0.4 ? 0.62 : 0.5 });
    }
  }
}

// ── 柔光暈：疊多層低透明度圓，讓光「發散」而非硬邊 ──
function softGlow(cx, cy, rad, rgb, maxAlpha){
  tasks.push(()=>{
    pg.noStroke();
    const layers=16;
    for(let i=layers;i>=1;i--){
      const t=i/layers;                 // 1 外 → 0 內
      const a=maxAlpha*Math.pow(1-t,2.0);
      pg.fill(rgb[0],rgb[1],rgb[2], a);
      pg.ellipse(cx,cy, rad*t*2, rad*t*2);
    }
  });
}

// ── 旋轉光暈：由核心向外螺旋的臂（取代死板的同心圓）──
function glowSwirl(cx, cy, rInner, rOuter, cols, opts){
  const o = opts || {};
  const arms = o.arms || ri(7,10);
  const spin = o.spin!==undefined ? o.spin : (rand()<0.5?1:-1);
  const wBase = o.w || 10;
  const hi = o.hi!==undefined ? o.hi : 0.55;
  for(let k=0;k<arms;k++){
    const a0 = (k/arms)*Math.PI*2 + rr(-0.30,0.30);
    const turn = (o.turns!==undefined ? o.turns : rr(0.4,0.7)) * (0.7+rand()*0.6);
    const steps = ri(9,14);
    const pts = [];
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const rad = rInner + (rOuter-rInner)*Math.pow(t, o.rpow||0.82) + rr(-2.5,2.5);
      const ang = a0 + spin*turn*Math.PI*2*t + rr(-0.05,0.05);
      pts.push({ x: cx+Math.cos(ang)*rad, y: cy+Math.sin(ang)*rad });
    }
    const col = jitterCol(hexRGB(pick(cols)), 0.06);
    const width = wBase * (0.7 + rand()*0.55);
    tasks.push(()=>impastoLayers(pts, { width, col, profile:'square', shadow:false, flecks:false, hi }));
  }
}

// ── 月：旋轉光暈 + 胖弦月（新月，非圓盤）──
function genMoon(){
  const {x,y,r} = moon;
  const lit = moon.phase>0 ? 1 : -1;     // 受光側：右弦 / 左弦
  const phi = lit>0 ? 0 : Math.PI;       // 受光belly 的方向
  const spin = lit;
  // 月暈：用「與夜空同一套流場」的筆觸環繞 → 月的流動接上背景
  // （flowAngle 已含月亮漩渦，故每一撇都跟天空一起繞月轉）
  const rings = [
    { rad:r*1.28, cols:MOON_YEL,  wl:[7,11], hi:0.6 },
    { rad:r*1.75, cols:MOON_GLOW, wl:[7,11], hi:0.55 },
    { rad:r*2.35, cols:MOON_GLOW, wl:[6,10], hi:0.5 },
    { rad:r*3.05, cols:SKY_LIGHT, wl:[6,10], hi:0.5 },
    { rad:r*3.85, cols:SKY_MID,   wl:[6,9],  hi:0.45 },
  ];
  for(const rg of rings){
    const n = Math.max(10, Math.floor(rg.rad*0.16));
    for(let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2 + rr(-0.16,0.16);
      const px = x+Math.cos(a)*rg.rad + rr(-3,3);
      const py = y+Math.sin(a)*rg.rad + rr(-3,3);
      addFlowStroke(px, py, { w:rr(rg.wl[0],rg.wl[1]), col:jitterCol(hexRGB(pick(rg.cols)),0.05),
        steps:ri(4,7), stepLen:rr(7,11), hi:rg.hi });
    }
  }

  // 弦月幾何：以受光方向 phi 為中心的胖新月，belly 最厚、兩角(horn)收尖
  const Amax = rr(1.95,2.25);            // 半張角（弧展約 224~258°）
  const rin = a => r - r*0.92*Math.pow(Math.cos(a*(Math.PI/2)/Amax), 0.7); // 內緣半徑
  // ① 底層實心弦月：先填滿，避免透背景
  const STEPS=40;
  tasks.push(()=>{
    const c = hexRGB(MOON_GLOW[0]);
    pg.noStroke(); pg.fill(c[0],c[1],c[2],255);
    pg.beginShape();
    for(let i=0;i<=STEPS;i++){ const a=-Amax+2*Amax*(i/STEPS), ang=phi+a;
      pg.vertex(x+Math.cos(ang)*r, y+Math.sin(ang)*r); }            // 外緣（滿圓弧）
    for(let i=STEPS;i>=0;i--){ const a=-Amax+2*Amax*(i/STEPS), ang=phi+a;
      pg.vertex(x+Math.cos(ang)*rin(a), y+Math.sin(ang)*rin(a)); }  // 內緣（弦）
    pg.endShape(CLOSE);
  });
  // ② 放射彎撇：由內緣刷向外緣，鋪滿當厚塗紋理
  const nRay = ri(34,46);
  for(let k=0;k<=nRay;k++){
    const a = -Amax + 2*Amax*(k/nRay), ang = phi+a;
    const ri0 = rin(a);
    const x0=x+Math.cos(ang)*ri0, y0=y+Math.sin(ang)*ri0;
    const x1=x+Math.cos(ang)*(r+r*0.02), y1=y+Math.sin(ang)*(r+r*0.02);
    // 內緣(belly)偏亮黃，horn 偏橘
    const near = Math.pow(Math.cos(a*(Math.PI/2)/Amax),0.5);
    const col = jitterCol(near>0.6? hexRGB(pick(MOON_YEL)) : hexRGB(pick(MOON_GLOW)), 0.05);
    addPaint(x0,y0,x1,y1, { w:rr(6,10), col, profile:'square', bend:r*0.10*spin*(rand()<0.5?1:-1),
      hi:0.7, shadow:false, flecks:false });
  }
  // ③ 沿 belly 內緣補一道近白亮弧（受光最強處）
  const bx0=x+Math.cos(phi)*rin(0), by0=y+Math.sin(phi)*rin(0);
  addPaint(bx0-Math.sin(phi)*r*0.4, by0+Math.cos(phi)*r*0.4,
           bx0+Math.sin(phi)*r*0.4, by0-Math.cos(phi)*r*0.4,
    { w:r*0.5, col:jitterCol(hexRGB(pick(MOON_YEL)),0.03), profile:'square', bend:r*0.3*lit, hi:0.9,
      shadow:false, flecks:false });
}

// ── 星：柔光暈 + 細緻旋芯 ──
function genStar(st){
  const {x,y,r}=st;
  const spin = st.s!==undefined ? st.s : (rand()<0.5?1:-1);  // 與該星的夜空漩渦同向
  const boost = st.morning ? 1 : 0;                          // 晨星更亮
  // 底層柔光：先鋪一圈發散的暖光，星才會「亮」而非硬邊（晨星熾白核心）
  softGlow(x,y, r*(2.6+boost*0.5), hexRGB(pick(STAR_YELLOW)), 30+boost*14);
  softGlow(x,y, r*1.35,            hexRGB(pick(STAR_CORE)),   52+boost*20);
  // 外暈：藍調(偶帶靛紫)螺旋，細而多、融入夜空
  glowSwirl(x,y, r*1.0, r*2.3, rand()<0.22?SKY_ACCENT:SKY_LIGHT, { arms:ri(10,14), turns:rr(0.6,1.0), w:rr(2.5,4.5), hi:0.5, spin });
  // 內暈：黃色螺旋，細絲纏繞
  glowSwirl(x,y, r*0.4, r*1.35, STAR_YELLOW, { arms:ri(10,14), turns:rr(0.7,1.1), w:rr(2.5,4.5), hi:0.6, spin });
  // 星芯（亮黃 → 近白，小而柔的彎撇）
  addPaint(x-r*0.35,y+r*0.12, x+r*0.35,y-r*0.12, { w:r*0.9, col:jitterCol(hexRGB(pick(STAR_YELLOW)),0.03),
    profile:'square', bend:r*0.35*spin, hi:0.75, shadow:false, flecks:false });
  addPaint(x-r*0.16,y, x+r*0.16,y, { w:r*(0.5+boost*0.12), col:jitterCol(hexRGB(pick(STAR_CORE)),0.02),
    profile:'square', bend:r*0.2*spin, hi:0.92, shadow:false, flecks:false });
  // 熾白亮點（晨星最強）
  if(st.morning || rand()<0.5)
    softGlow(x,y, r*0.55, [255,252,232], 120+boost*60);
}

// ── 遠山：起伏的深藍綠稜線 ──
function genHills(){
  const bands = ri(2,3);
  for(let b=0;b<bands;b++){
    const baseY = horizonY + b*PH*0.03;
    const amp = PH*rr(0.02,0.05);
    const cols = b%2===0 ? HILL_DARK : HILL_LIGHT;
    // 山脊輪廓點
    const pts=[]; let phase=rr(0,6);
    for(let x=-20; x<=PW+20; x+=rr(26,40)){
      const yy = baseY - amp*(0.5+0.5*Math.sin(phase)) + rr(-6,6);
      pts.push({x, y:yy}); phase += rr(0.3,0.7);
    }
    // 沿稜線鋪橫向筆觸，並往下填滿到地平帶
    for(let i=0;i<pts.length-1;i++){
      const p=pts[i], q=pts[i+1];
      for(let yy=Math.min(p.y,q.y); yy<baseY+PH*0.05; yy+=rr(10,15)){
        const t=rand(); const cx=p.x+(q.x-p.x)*t, cy=p.y+(q.y-p.y)*t + (yy-Math.min(p.y,q.y));
        addPaint(cx-rr(16,26), cy, cx+rr(16,26), cy+rr(-4,4),
          { w:rr(11,17), col:jitterCol(hexRGB(pick(cols)),0.06), profile:'square', bend:rr(-8,8), flecks:false, hi:0.4 });
      }
    }
  }
}

// ── 山村：一排小屋 + 中央高教堂尖塔 + 亮窗 ──
function genVillage(){
  const groundTop = horizonY + PH*0.015;
  const cxV = PW*rr(0.42,0.56);
  // 教堂（尖塔刺入夜空）
  const chW = PW*rr(0.03,0.045), chH = PH*rr(0.09,0.12);
  const chx = cxV, chTop = groundTop - chH;
  drawHouse(chx, groundTop, chW, chH, pick(CHURCH_WALL), pick(ROOF_COLS), true);
  // 尖塔
  const spSway = rr(-chW*0.4, chW*0.4);
  const spx=chx, spBase=chTop, spTop=chTop - PH*rr(0.10,0.14);
  addPaint(spx, spBase, spx+spSway, spTop, { w:chW*rr(0.5,0.7), col:jitterCol(hexRGB(pick(SPIRE_COL)),0.05), profile:'taper', bend:chW*rr(-0.55,0.55), hi:0.35 });
  addPaint(spx+spSway, spTop, spx+spSway+rr(-4,4), spTop-PH*0.02, { w:chW*0.25, col:jitterCol(hexRGB(pick(SPIRE_COL)),0.05), profile:'taper', bend:rr(-3,3), hi:0.35 });

  // 兩側小屋（高度隨機、疊出村落感）
  let x = chx - chW*0.8;
  while(x > PW*0.06){
    const w=PW*rr(0.028,0.05), h=PH*rr(0.035,0.075);
    drawHouse(x, groundTop-rr(0,PH*0.01), w, h, pick(WALL_COLS), pick(ROOF_COLS), rand()<0.7);
    x -= w*rr(1.05,1.5);
  }
  x = chx + chW*0.8;
  while(x < PW*0.9){
    const w=PW*rr(0.028,0.05), h=PH*rr(0.035,0.075);
    drawHouse(x, groundTop-rr(0,PH*0.01), w, h, pick(WALL_COLS), pick(ROOF_COLS), rand()<0.7);
    x += w*rr(1.05,1.5);
  }
}
function drawHouse(cx, baseY, w, h, wallHex, roofHex, lit){
  const wall=hexRGB(wallHex), roof=hexRGB(roofHex);
  const lean = rr(-0.11,0.11);            // 整棟微傾（手繪不正）
  // 牆（幾道微彎、微傾的垂直厚塗）
  const cols=Math.max(2, Math.floor(w/10));
  for(let i=0;i<cols;i++){
    const px=cx-w/2 + (i+0.5)/cols*w;
    const topX=px + h*lean + rr(-2,2);
    addPaint(px, baseY, topX, baseY-h, { w:w/cols*1.25, col:jitterCol(wall,0.05),
      profile:'square', bend:rr(-1,1)*h*0.09, bend2:rr(-1,1)*h*0.05, hi:0.35 });
  }
  // 屋頂（微彎斜筆）
  const apexX=cx + h*lean, apexY=baseY-h*1.55;
  addPaint(cx-w*0.6, baseY-h, apexX, apexY, { w:h*0.18, col:jitterCol(roof,0.05), profile:'square', bend:h*0.14, hi:0.3 });
  addPaint(cx+w*0.6, baseY-h, apexX, apexY, { w:h*0.18, col:jitterCol(roof,0.05), profile:'square', bend:-h*0.14, hi:0.3 });
  // 亮窗（微彎）
  if(lit){
    for(let k=0;k<ri(1,2);k++){
      const wx=cx+rr(-w*0.28,w*0.28), wy=baseY-h*rr(0.35,0.65);
      addPaint(wx, wy, wx+h*lean*0.3, wy-h*0.14, { w:w*rr(0.14,0.22), col:jitterCol(hexRGB(pick(WINDOW_LIT)),0.04),
        profile:'square', bend:rr(-1.5,1.5), shadow:false, flecks:false, hi:0.7 });
    }
  }
}

// ── 前景絲柏：高聳如尖塔、細密火焰筆觸 ──
function genCypress(){
  const baseY = PH*1.02;
  const topY = PH*rr(0.04,0.12);          // 樹尖（高聳入天）
  const totalH = baseY - topY;
  const bx = PW*rr(0.09,0.16);            // 樹幹底部 x
  const baseW = PW*rr(0.065,0.09);        // 底部半寬
  const lean = rr(-0.035,0.035);          // 整體微傾
  const swayP = rr(0,6.28);               // 樹身擺動相位
  // 輪廓：底寬、頂收成尖（尖塔感）；中軸帶蛇行擺動
  const halfW = t => baseW*Math.pow(1-t,1.28)*(0.82+0.32*Math.sin(t*Math.PI*3+swayP));
  const axisX = t => bx + lean*totalH*t + Math.sin(t*Math.PI*1.7+swayP)*baseW*0.22*(1-t*0.35);
  // ① 底層實心輪廓：先把框線內填滿，避免露出背景
  const darkBase = hexRGB(CYPRESS[0]);
  const STEPS=48;
  tasks.push(()=>{
    // 陰影底 + 主體，兩層
    for(const [shade,ox] of [[0.45,2],[1,0]]){
      const c = shade<1 ? [Math.round(darkBase[0]*0.5),Math.round(darkBase[1]*0.5),Math.round(darkBase[2]*0.5)] : darkBase;
      pg.noStroke(); pg.fill(c[0],c[1],c[2],255);
      pg.beginShape();
      for(let i=0;i<=STEPS;i++){ const t=i/STEPS; pg.vertex(axisX(t)-halfW(t)+(rand()-0.5)*3+ox, baseY-totalH*t); }
      for(let i=STEPS;i>=0;i--){ const t=i/STEPS; pg.vertex(axisX(t)+halfW(t)+(rand()-0.5)*3+ox, baseY-totalH*t); }
      pg.endShape(CLOSE);
    }
  });
  // ② 主體：密集向上彎撇，鋪滿輪廓當紋理（筆觸細）
  const nFlame = ri(120,160);
  for(let i=0;i<nFlame;i++){
    const t0 = Math.pow(rand(),0.7);       // 偏下較密
    const t1 = Math.min(1, t0 + rr(0.10,0.24));
    const off = rr(-1,1);                   // 輪廓內水平位置
    const x0 = axisX(t0) + off*halfW(t0)*0.9;
    const x1 = axisX(t1) + off*halfW(t1)*0.55 + rr(-1,1)*halfW(t1)*0.3; // 頂端往中軸收
    const y0 = baseY - totalH*t0, y1 = baseY - totalH*t1;
    const lick = rr(-1,1)*baseW*0.16*(1-t0);
    addPaint(x0,y0,x1,y1, { w:rr(2.6,5.5)*(0.7+(1-t0)*0.6),
      col:jitterCol(hexRGB(pick(CYPRESS)),0.05), profile:'flame', bend:lick, bend2:-lick*0.5,
      shadow:false, flecks:false, hi:0.24 });
  }
  // 右緣迎星光的細高光
  for(let i=0;i<ri(22,34);i++){
    const t0=rr(0.05,0.78), t1=Math.min(1,t0+rr(0.08,0.18));
    const x0=axisX(t0)+halfW(t0)*0.7+rr(-3,3), y0=baseY-totalH*t0;
    const x1=axisX(t1)+halfW(t1)*0.55+rr(-4,4), y1=baseY-totalH*t1;
    addPaint(x0,y0,x1,y1, { w:rr(1.8,3.6), col:jitterCol(hexRGB(pick(CYPRESS_HI)),0.06),
      profile:'flame', bend:rr(-6,6), shadow:false, flecks:false, hi:0.5 });
  }
  // 樹尖火苗：幾撇細長收尖，強化尖塔
  for(let i=0;i<ri(4,7);i++){
    const tt=rr(0.85,0.98); const x0=axisX(tt), y0=baseY-totalH*tt;
    const x1=axisX(1)+rr(-5,5), y1=topY-rr(0,PH*0.03);
    addPaint(x0,y0,x1,y1, { w:rr(2.2,4.5), col:jitterCol(hexRGB(pick(CYPRESS)),0.05),
      profile:'flame', bend:rr(-8,8), shadow:false, flecks:false, hi:0.32 });
  }
}

function genGrain(){
  tasks.push(()=>{
    pg.noStroke();
    const n=Math.floor(PW*PH*0.0035);
    for(let i=0;i<n;i++){
      const gx=rand()*PW, gy=rand()*PH; const t=(rand()-0.5)*40;
      pg.fill(clamp255(80+t), clamp255(100+t), clamp255(140+t), 8);
      pg.rect(gx,gy, rr(1,2.2), rr(1,2.2));
    }
  });
}

// ════════════════ p5 主流程 ════════════════
function setup(){
  const ratio=PW/PH;
  let dw=Math.min(windowWidth*0.94, (windowHeight*0.9)*ratio);
  createCanvas(dw, dw/ratio);
  pg=createGraphics(PW, PH);
  pg.noStroke();
  pg.background(12, 24, 50);
  noiseSeed(Math.floor(rand()*1e9));
  generateScene();
}
function draw(){
  if(!finished){
    const end=Math.min(tasks.length, taskIdx+perFrame);
    for(; taskIdx<end; taskIdx++) tasks[taskIdx]();
    if(taskIdx>=tasks.length){ finished=true; fxpreview(); }
  }
  image(pg, 0, 0, width, height);
  if(finished) noLoop();
}
function windowResized(){
  const ratio=PW/PH;
  let dw=Math.min(windowWidth*0.94, (windowHeight*0.9)*ratio);
  createCanvas(dw, dw/ratio);
  image(pg, 0, 0, width, height);
}
function mousePressed(){ location.reload(); }
function keyPressed(){
  if(key==='s' || key==='S'){ save(pg, `starry-night-${fxhash.slice(2,10)}`, 'png'); return false; }
  if(key==='r' || key==='R'){ location.reload(); }
}
