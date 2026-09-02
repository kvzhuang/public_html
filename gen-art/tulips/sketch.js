// ==========================================
// Tulips 鬱金香花海 — Generative Art
// 油畫風格室外鬱金香花海，四種場景
// 天空：梵谷星夜流場漩渦筆觸
// 花朵：open / halfopen / bud / droop / blown 五型，每朵獨特
// ==========================================

const PW = 1200, PH = 810;

const rr  = (a,b) => a + Math.random()*(b-a);
const ri  = (a,b) => Math.floor(rr(a, b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// ── 色彩工具 ──
function hexRGB(hex){
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
}
function lighten(rgb,t){
  return [Math.round(rgb[0]+(255-rgb[0])*t),Math.round(rgb[1]+(255-rgb[1])*t),Math.round(rgb[2]+(255-rgb[2])*t)];
}
function darken(rgb,t){
  return [Math.round(rgb[0]*(1-t)),Math.round(rgb[1]*(1-t)),Math.round(rgb[2]*(1-t))];
}
function mixRGB(a,b,t){
  return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)];
}
function jitterCol(rgb,amt){
  const d=()=>(Math.random()-0.5)*2*amt*255;
  return [clamp255(rgb[0]+d()),clamp255(rgb[1]+d()),clamp255(rgb[2]+d())];
}
function clamp255(x){ return Math.max(0,Math.min(255,Math.round(x))); }

// 大氣透視：越接近地平線越融入霧色（真實花海遠景的褪色感）
function fogMix(rgb,y){
  const fieldH=PH-horizonY;
  const t=Math.max(0,Math.min(1,1-(y-horizonY)/fieldH));
  return mixRGB(rgb,SKY[scene].fog,Math.pow(t,1.6)*0.45);
}

function sceneColor(rgb,sc){
  const g=Math.round((rgb[0]+rgb[1]+rgb[2])/3);
  if(sc==='sunny') return rgb;
  if(sc==='cloudy'){ const r=mixRGB(rgb,[g,g,g],0.06); return [clamp255(r[0]),clamp255(r[1]),clamp255(r[2]+6)]; }
  if(sc==='rainy'){  const r=darken(rgb,0.10); return [clamp255(r[0]),clamp255(r[1]),clamp255(r[2]+14)]; }
  if(sc==='night'){  const r=darken(rgb,0.38); return [clamp255(r[0]-6),clamp255(r[1]-2),clamp255(r[2]+34)]; }
  return rgb;
}

// ════════════ 油畫筆觸引擎 ════════════

function bezPt(s,t){
  const u=1-t;
  return{
    x:u*u*u*s.x1+3*u*u*t*s.cpx1+3*u*t*t*s.cpx2+t*t*t*s.x2,
    y:u*u*u*s.y1+3*u*u*t*s.cpy1+3*u*t*t*s.cpy2+t*t*t*s.y2,
  };
}
function widthProfile(profile,w){
  if(profile==='taper'){
    return t=>{const u=Math.max(0.001,Math.min(0.999,t)),rp=u<0.06?0.7+0.3*(u/0.06):1;return w*rp*(1-0.72*Math.pow(u,1.25));};
  }
  if(profile==='petal'){
    return t=>{const u=Math.max(0.001,Math.min(0.999,t)),env=Math.pow(Math.sin(Math.min(1,u*1.06)*Math.PI),0.7),tip=u>0.85?1-(u-0.85)/0.15*0.72:1;return w*(0.30+0.78*env)*tip;};
  }
  return t=>{const u=Math.max(0.001,Math.min(0.999,t));let sr=u<0.08?0.62+0.40*(u/0.08):1;if(sr>1)sr=1;const et=u<0.7?1:1-Math.pow((u-0.7)/0.3,1.1)*0.58;return w*0.95*sr*Math.max(0.30,et);};
}
function renderImpasto(s){
  const len=Math.hypot(s.x2-s.x1,s.y2-s.y1),N=Math.max(8,Math.min(28,Math.floor(len/6)));
  const samples=[];for(let i=0;i<=N;i++)samples.push(bezPt(s,i/N));
  impastoLayers(samples,s);
}
function impastoLayers(samples,s){
  const N=samples.length-1;if(N<3)return;
  const perps=[];
  for(let i=0;i<=N;i++){
    const prev=samples[Math.max(0,i-1)],nxt=samples[Math.min(N,i+1)];
    const dx=nxt.x-prev.x,dy=nxt.y-prev.y,l=Math.hypot(dx,dy)||1;
    perps.push({x:-dy/l,y:dx/l});
  }
  const col=s.col,widthAt=widthProfile(s.profile,s.width),edgeJ=Math.max(1.2,s.width*0.06);
  pg.noStroke();
  if(s.simple){
    const lo=darken(col,0.22);pg.fill(lo[0],lo[1],lo[2],255);drawSlab(samples,perps,t=>widthAt(t)*1.02,0,0,edgeJ);
    const jc=jitterCol(col,0.05);pg.fill(jc[0],jc[1],jc[2],255);drawSlab(samples,perps,t=>widthAt(t)*0.9,0,0,edgeJ*0.9);
    return;
  }
  if(s.shadow!==false){pg.fill(15,15,15,60);drawSlab(samples,perps,widthAt,s.width*0.16+1,s.width*0.2+1.2,edgeJ);}
  const lo=darken(col,0.28);pg.fill(lo[0],lo[1],lo[2],255);drawSlab(samples,perps,t=>widthAt(t)*1.02,0,0,edgeJ);
  const jc=jitterCol(col,0.05);pg.fill(jc[0],jc[1],jc[2],255);drawSlab(samples,perps,t=>widthAt(t)*0.92,0,0,edgeJ*0.9);
  const bc=Math.max(3,Math.min(10,Math.floor(s.width/3.2)));
  for(let b=0;b<bc;b++)drawBristle(samples,perps,(b+0.5)/bc-0.5,col,widthAt);
  if(N>=10){
    const hi=lighten(col,0.55);drawRim(samples,perps,0.36,hi,200,widthAt,Math.max(1.1,s.width*0.07));
    const dp=darken(col,0.55);drawRim(samples,perps,-0.40,dp,175,widthAt,Math.max(1.0,s.width*0.06));
    drawCenterBand(samples,perps,col,widthAt,Math.max(1.2,s.width*0.09));
  }
  if(s.flecks!==false&&Math.random()<0.6)edgeFlecks(samples,perps,col,s.width,widthAt);
}
function drawSlab(samples,perps,wFn,ox,oy,ej){
  const N=samples.length-1,cap=6;
  pg.beginShape();
  for(let i=0;i<=N;i++){const w=wFn(i/N)*0.5;pg.vertex(samples[i].x+perps[i].x*w+(Math.random()-0.5)*ej+ox,samples[i].y+perps[i].y*w+(Math.random()-0.5)*ej+oy);}
  const rE=wFn(1)*0.5,pE=perps[N],tE={x:pE.y,y:-pE.x};
  for(let c=1;c<cap;c++){const th=(c/cap)*Math.PI,ct=Math.cos(th),st=Math.sin(th);pg.vertex(samples[N].x+rE*(pE.x*ct+tE.x*st)+ox,samples[N].y+rE*(pE.y*ct+tE.y*st)+oy);}
  for(let i=N;i>=0;i--){const w=wFn(i/N)*0.5;pg.vertex(samples[i].x-perps[i].x*w+(Math.random()-0.5)*ej+ox,samples[i].y-perps[i].y*w+(Math.random()-0.5)*ej+oy);}
  const rS=wFn(0)*0.5,pS=perps[0],tS={x:pS.y,y:-pS.x};
  for(let c=1;c<cap;c++){const th=(c/cap)*Math.PI,ct=Math.cos(th),st=Math.sin(th);pg.vertex(samples[0].x+rS*(-pS.x*ct-tS.x*st)+ox,samples[0].y+rS*(-pS.y*ct-tS.y*st)+oy);}
  pg.endShape(CLOSE);
}
function drawBristle(samples,perps,offFrac,baseCol,wFn){
  const N=samples.length-1;
  let jc=jitterCol(baseCol,0.14);
  const blend=Math.max(-1,Math.min(1,-offFrac*2));
  jc=mixRGB(jc,blend>0?lighten(baseCol,0.45):darken(baseCol,0.45),Math.abs(blend)*0.4);
  pg.noFill();pg.stroke(jc[0],jc[1],jc[2],180+Math.floor(Math.random()*55));
  pg.strokeWeight(Math.max(0.7,1.0+(Math.random()-0.5)*0.7));pg.strokeCap(ROUND);
  const wobble=(Math.random()-0.5)*0.08;
  let inS=false,skip=-1;
  for(let i=0;i<=N;i++){
    if(i<=skip)continue;
    const t=i/N;
    if(t>0.15&&t<0.85&&Math.random()<0.02){if(inS){pg.endShape();inS=false;}skip=i+1+Math.floor(Math.random()*3);continue;}
    const w=wFn(t),off=(offFrac+wobble)*w*0.78;
    if(!inS){pg.beginShape();inS=true;}
    pg.vertex(samples[i].x+perps[i].x*off+(Math.random()-0.5)*w*0.07,samples[i].y+perps[i].y*off+(Math.random()-0.5)*w*0.07);
  }
  if(inS)pg.endShape();pg.noStroke();
}
function drawRim(samples,perps,offFrac,col,alpha,wFn,weight){
  const N=samples.length-1;pg.noFill();pg.stroke(col[0],col[1],col[2],alpha);pg.strokeWeight(weight);pg.strokeCap(ROUND);
  pg.beginShape();for(let i=2;i<=N-2;i++){const w=wFn(i/N);pg.vertex(samples[i].x+perps[i].x*offFrac*w,samples[i].y+perps[i].y*offFrac*w);}
  pg.endShape();pg.noStroke();
}
function drawCenterBand(samples,perps,baseCol,wFn,weight){
  const N=samples.length-1,band=lighten(baseCol,0.42);
  pg.noFill();pg.stroke(band[0],band[1],band[2],185);pg.strokeWeight(weight);pg.strokeCap(ROUND);
  pg.beginShape();const i0=Math.floor(N*0.1),i1=Math.floor(N*0.9);
  for(let i=i0;i<=i1;i++){const w=wFn(i/N);pg.vertex(samples[i].x+perps[i].x*w*0.08+(Math.random()-0.5)*w*0.04,samples[i].y+perps[i].y*w*0.08+(Math.random()-0.5)*w*0.04);}
  pg.endShape();pg.noStroke();
}
function edgeFlecks(samples,perps,col,baseW,wFn){
  const N=samples.length-1;pg.noStroke();
  for(let i=1;i<N;i++){
    if(Math.random()>0.18)continue;
    const t=i/N,w=wFn(t),side=Math.random()<0.5?1:-1;
    const x=samples[i].x+perps[i].x*w*0.5*(1+Math.random()*0.4)*side+(Math.random()-0.5)*w*0.25;
    const y=samples[i].y+perps[i].y*w*0.5*(1+Math.random()*0.4)*side+(Math.random()-0.5)*w*0.25;
    const r=baseW*0.1*Math.pow(Math.random(),1.5);
    pg.push();pg.translate(x,y);pg.rotate(Math.random()*Math.PI*2);
    pg.fill(col[0],col[1],col[2],210);
    pg.ellipse(0,0,Math.max(0.5,r*(0.7+Math.random()*0.7)),Math.max(0.4,r*(0.3+Math.random()*0.5)));
    pg.pop();
  }
}
function addPaint(x1,y1,x2,y2,opts){
  const o=opts||{},dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  const bend=o.bend!==undefined?o.bend:(Math.random()-0.5)*len*0.25;
  const bend2=o.bend2!==undefined?o.bend2:bend*rr(0.3,0.8)*(Math.random()<0.3?-1:1);
  const s={x1,y1,x2,y2,cpx1:x1+dx*0.3+nx*bend2,cpy1:y1+dy*0.3+ny*bend2,cpx2:x1+dx*0.7+nx*bend,cpy2:y1+dy*0.7+ny*bend,
    width:o.w||10,col:Array.isArray(o.col)?o.col:hexRGB(o.col||'#888888'),profile:o.profile||'square',shadow:o.shadow,flecks:o.flecks,simple:o.simple};
  if(o.skyClip){
    tasks.push(()=>{
      const c=pg.drawingContext;
      c.save();c.beginPath();c.rect(0,0,PW,horizonY);c.clip();
      renderImpasto(s);
      c.restore();
    });
  } else {
    tasks.push(()=>renderImpasto(s));
  }
}

// ════════════ 星夜流場（梵谷天空）════════════

let skyVortices=[];

function blendAngle(a,b,t){
  const d=Math.atan2(Math.sin(b-a),Math.cos(b-a));
  return a+d*t;
}
function skyFlowAngle(x,y){
  // 基底：柔和擾動場
  let a=(noise(x*0.0017,y*0.0017)-0.5)*3.0;
  // 疊加漩渦
  for(const v of skyVortices){
    const dx=x-v.x,dy=y-v.y,d=Math.hypot(dx,dy);
    if(d<v.r){
      const t=Math.atan2(dy,dx)+(Math.PI/2)*v.s;
      const w=Math.pow(1-d/v.r,0.65);
      a=blendAngle(a,t,w*0.92);
    }
  }
  return a;
}
function vortexGlow(x,y){
  let g=0;
  for(const v of skyVortices){const d=Math.hypot(x-v.x,y-v.y);if(d<v.r)g=Math.max(g,Math.pow(1-d/v.r,0.8));}
  return g;
}
function traceSkyFlow(x0,y0,steps,stepLen,yMin){
  const pts=[{x:x0,y:y0}];let x=x0,y=y0;
  if(yMin===undefined)yMin=-12;
  if(y0<yMin)return pts;
  let pa=skyFlowAngle(x,y);
  for(let i=0;i<steps;i++){
    const a=blendAngle(pa,skyFlowAngle(x,y),0.55);
    const nx=x+Math.cos(a)*stepLen+rr(-1.3,1.3);
    const ny=y+Math.sin(a)*stepLen+rr(-1.3,1.3);
    if(ny<yMin||ny>horizonY+18)break;  // 底部越界由 clip 硬裁；頂部由 yMin 保證完整筆觸不跨頂緣
    x=nx;y=ny;pts.push({x,y});pa=a;
  }
  return pts;
}
function addSkyFlowStroke(x0,y0,opts){
  const o=opts||{};
  // 完整厚塗筆觸若被畫布頂緣切半，會露出深色打底層形成「黑葉片」瑕疵；
  // 故 full 筆觸保持離頂緣 12px 以上，頂帶另由 simple 筆觸補滿
  const yMin=o.yMin!==undefined?o.yMin:(o.simple?-30:12);
  const pts=traceSkyFlow(x0,y0,o.steps||ri(5,9),o.stepLen||rr(9,13),yMin);
  if(pts.length<4)return;
  // canvas clip 硬裁切：天空筆觸（含寬度與邊緣抖動）絕不越過地平線
  tasks.push(()=>{
    const c=pg.drawingContext;
    c.save();c.beginPath();c.rect(0,0,PW,horizonY);c.clip();
    impastoLayers(pts,{width:o.w||10,col:Array.isArray(o.col)?o.col:hexRGB(o.col),profile:'square',shadow:false,flecks:false,simple:o.simple});
    c.restore();
  });
}

// ════════════ 色彩配置 ════════════

const GREENS=['#5A9C30','#4C8628','#68B038','#589230','#497E28','#64B038','#529032','#5C9A2E'];

const TULIP={
  red:    ['#CC1515','#E01A1A','#B80F0F','#D41212','#C81414','#DC1818'],
  pink:   ['#E87B9E','#F09CBB','#D4678A','#EE88AA','#E070A0','#F285B0'],
  yellow: ['#F5D020','#F0C010','#FFDE30','#ECC800','#F8D828','#F2CA18'],
  orange: ['#F07020','#E86010','#FF8530','#E87028','#FA7C30','#EF6820'],
  purple: ['#8B3FA0','#7A2D8F','#9B50B0','#852E98','#9040AA','#7E2A8A'],
  white:  ['#F5F2EC','#E8E4DC','#EDEAE0','#F0EDE5','#EEEBE3','#F3F0E8'],
  darkred:['#8B1010','#7A0D0D','#9B1515','#801010','#920E0E','#8E1212'],
  cream:  ['#F0DCA0','#E8D490','#F5E4A8','#ECD898','#F2E0A8','#EED898'],
};
const COLOR_NAMES=Object.keys(TULIP);

const SKY={
  sunny: {
    top:['#1A74CC','#2284DC','#1468C4','#2A8AE8','#1E7CD8'],
    bot:['#5CBEEE','#66C8F6','#54B6E8','#6CCAF8','#62C2F2'],
    fog:[205,228,250], nVortex:[1,2], vortexR:[70,130], glow:false,
  },
  cloudy:{
    top:['#9AACB8','#A2B4C2','#92A4B4','#A8BAC8','#9EB0BE'],
    bot:['#CAD8E2','#D4E0EA','#C4D4DE','#D8E2EC','#CEDAE4'],
    fog:[200,214,228], nVortex:[2,3], vortexR:[80,150], glow:false,
  },
  rainy:{
    top:['#68727E','#646E7C','#6C7682','#66707C','#687278'],
    bot:['#909AA6','#96A0AC','#8A929A','#9AA2AA','#929CAA'],
    fog:[145,158,172], nVortex:[1,2], vortexR:[60,110], glow:false,
  },
  night:{
    top:['#0A0A22','#0C0C30','#101038','#0A0A20','#0C0C2C'],
    bot:['#1C1C44','#20204C','#242454','#1A1A44','#1E1E4A'],
    fog:[32,35,64], nVortex:[4,6], vortexR:[100,220], glow:true,
  },
};
const GROUND={
  sunny: ['#649840','#588838','#70A846','#628E3C','#568236'],
  cloudy:['#527A2E','#4A6C28','#587632','#4E682A','#52722C'],
  rainy: ['#40602A','#3A5A24','#465C28','#3E5824','#405E24'],
  night: ['#20300F','#1A2A0C','#243212','#1C260F','#222E0D'],
};

let tasks=[],taskIdx=0,perFrame=40,pg,finished=false,horizonY;
let scene='', layoutType='';
let tulipQueue=[];  // 深度排序暫存區
let hillSeed=0, hillAmp=0;  // 地勢起伏

// 地形垂直偏移：噪聲丘陵，近景振幅大、地平線處歸零（維持透視）
function terrainOff(x,y){
  const depth=Math.max(0,Math.min(1,(y-horizonY)/(PH-horizonY)));
  return (noise(x*0.0028,hillSeed)-0.5)*2*hillAmp*depth;
}
// 地形坡度（供受光面明暗用）
function terrainSlope(x,y){
  return terrainOff(x+16,y)-terrainOff(x-16,y);
}

// ════════════ 漩渦初始化（在所有生成函式前呼叫）════════════

function setupSkyVortices(){
  const cfg=SKY[scene];
  skyVortices=[];
  const nV=ri(cfg.nVortex[0],cfg.nVortex[1]);
  for(let i=0;i<nV*4&&skyVortices.length<nV;i++){
    const vx=rr(PW*0.06,PW*0.94),vy=rr(horizonY*0.04,horizonY*0.82);
    skyVortices.push({x:vx,y:vy,r:rr(cfg.vortexR[0],cfg.vortexR[1]),s:Math.random()<0.5?1:-1});
  }
}

// ════════════ 打底厚塗層（保證畫面被完整覆蓋）════════════
// 邏輯同 sunflowers/genUnderpaint：
//   grid step 18px < 筆觸寬度 24-32px → 數學上不可能露出畫布底色
function genUnderpaint(){
  const cfg=SKY[scene];
  // 最底層保險：天空用 top→bot 垂直漸層平塗（與流場筆觸同色系，露出也不突兀）
  const skyTop=hexRGB(cfg.top[0]),skyBot=hexRGB(cfg.bot[0]);
  const gndBase=hexRGB(GROUND[scene][0]);
  tasks.push(()=>{
    pg.noStroke();
    const bands=24;
    for(let i=0;i<bands;i++){
      const c=mixRGB(skyTop,skyBot,i/(bands-1));
      pg.fill(c[0],c[1],c[2]);
      pg.rect(0,(i/bands)*horizonY,PW,horizonY/bands+2);
    }
    pg.fill(gndBase[0],gndBase[1],gndBase[2]);pg.rect(0,horizonY-2,PW,PH-horizonY+4);
  });
  // 天空打底：近水平 simple 筆觸，顏色隨高度 top→bot 混色（跟最終漸層一致，clip 保證不越界）
  for(let gy=-20;gy<horizonY;gy+=14){
    for(let gx=-20;gx<PW+20;gx+=14){
      const x=gx+rr(-3,3),y=Math.min(gy+rr(-3,3),horizonY-3);
      const t=Math.max(0,Math.min(1,y/horizonY));
      const col=jitterCol(mixRGB(hexRGB(pick(cfg.top)),hexRGB(pick(cfg.bot)),Math.pow(t,0.7)),0.04);
      addPaint(x,y,x+rr(20,34),y+rr(-4,4),{w:rr(28,38),col,bend:rr(-3,3),shadow:false,flecks:false,simple:true,skyClip:true});
    }
  }
  // 地面打底：近水平密格 simple 筆觸（格距14保證無縫）
  for(let gy=horizonY;gy<PH+20;gy+=14){
    for(let gx=-20;gx<PW+20;gx+=14){
      const x=gx+rr(-3,3),y=Math.max(gy+rr(-3,3),horizonY+1);
      const col=jitterCol(hexRGB(pick(GROUND[scene])),0.05);
      addPaint(x,y,x+rr(20,36),y+rr(-3,3),{w:rr(28,38),col,bend:rr(-3,3),shadow:false,flecks:false,simple:true});
    }
  }
}

// ════════════ 天空（星夜流場）════════════

function genSky(){
  const cfg=SKY[scene];
  // 不再整片平塗：底色交給 genUnderpaint 的漸層，避免蓋掉背景
  // skyVortices 已在 setupSkyVortices() 建立，不再此處設定
  // 主流場筆觸層
  const nMain=scene==='night'?1800:scene==='rainy'?900:1300;
  for(let i=0;i<nMain;i++){
    const x=rr(-20,PW+20),y=rr(-18,horizonY-4);
    const t=1-(y/horizonY);
    const cTop=hexRGB(pick(cfg.top)),cBot=hexRGB(pick(cfg.bot));
    let col=jitterCol(mixRGB(cTop,cBot,Math.pow(1-t,0.7)),0.05);
    if(cfg.glow){const g=vortexGlow(x,y);if(g>0.2)col=lighten(col,g*0.30);}
    addSkyFlowStroke(x,y,{w:rr(8,13),col,steps:ri(5,9),stepLen:rr(9,13)});
  }
  // 頂緣補強層：simple 筆觸（淺打底、無深稜線）貼著畫布頂緣鋪滿，
  // 覆蓋被 yMin 擋掉的區域，也蓋掉任何殘留的深色邊緣
  for(let gx=-20;gx<PW+20;gx+=22){
    const x=gx+rr(-6,6),y=rr(0,22);
    const col=jitterCol(hexRGB(pick(cfg.top)),0.05);
    addSkyFlowStroke(x,y,{w:rr(18,26),col,steps:ri(4,6),stepLen:rr(9,12),simple:true,yMin:-30});
  }
  // 地平線附近天空補強層——確保底部覆蓋完整，不露出打底色
  const nHor=ri(200,280);
  for(let i=0;i<nHor;i++){
    const x=rr(-15,PW+15);
    const y=horizonY*rr(0.80,0.99);  // 集中在天空下方20%
    const cB=hexRGB(pick(cfg.bot));
    const col=jitterCol(mixRGB(cB,hexRGB(pick(cfg.top)),rr(0,0.3)),0.04);
    addSkyFlowStroke(x,y,{w:rr(9,16),col,steps:ri(4,7),stepLen:rr(8,12)});
  }
  // 亮色細線層（漩渦帶 highlight）
  const nAcc=scene==='night'?180:scene==='sunny'?90:55;
  for(let i=0;i<nAcc;i++){
    const x=rr(0,PW),y=rr(0,horizonY-6);
    const g=vortexGlow(x,y);
    if(g<0.12&&Math.random()<0.68)continue;
    let accentCol;
    if(cfg.glow){
      accentCol=lighten(jitterCol(hexRGB(pick(cfg.top)),0.06),0.38+g*0.28);
    } else {
      accentCol=lighten(jitterCol(hexRGB(pick(cfg.bot)),0.06),0.22+g*0.15);
    }
    addSkyFlowStroke(x,y,{w:rr(3.5,6),col:accentCol,steps:ri(4,7),stepLen:rr(8,11)});
  }
  if(scene==='sunny')  genSun();
  if(scene==='night')  {genMoon();genStars();}
  if(scene==='cloudy'||scene==='rainy') genClouds();
}

function genSun(){
  const sx=rr(PW*0.60,PW*0.84),sy=rr(horizonY*0.10,horizonY*0.30),sr=rr(40,58);
  tasks.push(()=>{
    pg.noStroke();
    for(let r=sr*3.8;r>sr;r-=7){const t=(r-sr)/(sr*2.8);pg.fill(255,246,175,Math.floor((1-t)*(1-t)*90));pg.ellipse(sx,sy,r*2,r*2);}
    pg.fill(255,250,175,255);pg.ellipse(sx,sy,sr*2,sr*2);
    pg.fill(255,255,225,200);pg.ellipse(sx-sr*0.18,sy-sr*0.2,sr*0.88,sr*0.78);
  });
  for(let i=0;i<10;i++){
    const a=(i/10)*Math.PI*2+rr(-0.2,0.2);
    addPaint(sx+Math.cos(a)*sr*1.35,sy+Math.sin(a)*sr*1.35,sx+Math.cos(a)*sr*rr(1.9,2.9),sy+Math.sin(a)*sr*rr(1.9,2.9),
      {w:rr(2.5,5.5),col:[255,245,158],bend:rr(-4,4),shadow:false,flecks:false});
  }
}
function genMoon(){
  const mx=rr(PW*0.62,PW*0.84),my=rr(horizonY*0.08,horizonY*0.28),mr=rr(28,44);
  // 柔光暈圈（保留漸層光暈，不影響手繪感）
  tasks.push(()=>{
    pg.noStroke();
    for(let r=mr*3.4;r>mr*1.1;r-=4){
      const t=(r-mr)/(mr*2.3);
      pg.fill(185,198,255,Math.floor((1-t)*(1-t)*48));
      pg.ellipse(mx,my,r*2,r*2);
    }
  });
  // 打底：略深的冷調底色圓（讓邊緣有暗部過渡）
  tasks.push(()=>{pg.noStroke();pg.fill(168,182,228);pg.ellipse(mx,my,mr*2.08,mr*2.08);});
  // 手繪筆觸：在月面上隨機鋪短筆，左上受光偏亮、右下偏暗
  const nS=62+Math.floor(mr);
  for(let i=0;i<nS;i++){
    const ang=Math.random()*Math.PI*2;
    const dist=Math.sqrt(Math.random())*mr*0.97;
    const sx=mx+Math.cos(ang)*dist,sy=my+Math.sin(ang)*dist;
    // 光源方向：左上偏亮 (+lf)，右下偏暗 (-lf)
    const lf=(-(sx-mx)/mr)*0.30+(-(sy-my)/mr)*0.30;
    const bri=Math.min(250,Math.max(162,216+Math.round(lf*28+rr(-10,10))));
    const col=[Math.max(0,bri-6),Math.max(0,bri+2),Math.min(255,bri+22)];
    const sa=rr(0,Math.PI*2),slen=rr(6,16);
    addPaint(sx,sy,sx+Math.cos(sa)*slen,sy+Math.sin(sa)*slen,
      {w:rr(4,8),col,bend:rr(-2,2),shadow:false,flecks:false,simple:true});
  }
  // 最亮高光（月面反光，幾個柔和橢圓光斑）
  tasks.push(()=>{
    pg.noStroke();
    for(let i=0;i<5;i++){
      const hx=mx+rr(-mr*0.44,mr*0.08),hy=my+rr(-mr*0.44,mr*0.06);
      pg.fill(248,252,255,Math.floor(rr(50,145)));
      pg.ellipse(hx,hy,mr*rr(0.10,0.26),mr*rr(0.08,0.18));
    }
  });
}
function genStars(){
  const n=ri(200,300);
  tasks.push(()=>{
    pg.noStroke();
    for(let i=0;i<n;i++){
      const sx=rr(0,PW),sy=rr(0,horizonY*0.94);
      const sr=rr(0.5,2.4),bright=Math.floor(rr(160,255)),a=Math.floor(rr(110,240));
      pg.fill(bright,bright,Math.min(255,bright+28),a);pg.ellipse(sx,sy,sr,sr);
    }
  });
}
function genClouds(){
  const n=scene==='rainy'?ri(7,11):ri(4,7);
  for(let i=0;i<n;i++){
    const cx=rr(-50,PW+50),cy=rr(horizonY*0.06,horizonY*0.58);
    const cw=rr(100,260),nPuffs=ri(3,6);
    const dark=scene==='rainy';
    for(let j=0;j<nPuffs;j++){
      const px=cx+rr(-cw*0.4,cw*0.4),py=cy+rr(-16,16),pw=rr(cw*0.28,cw*0.52),ph=pw*rr(0.52,0.78);
      const bg=dark?ri(55,90):ri(205,240);
      addPaint(px-pw*0.38,py,px+pw*0.38,py+rr(-8,8),{
        w:ph,col:jitterCol([bg,bg,Math.min(255,bg+(dark?6:20))],0.06),bend:rr(-18,18),shadow:false,flecks:false,simple:true,skyClip:true,
      });
    }
  }
}

// ════════════ 地面 ════════════

function genGround(){
  const gCols=GROUND[scene].map(hexRGB);
  const fieldH=PH-horizonY;
  // 打底色平塗（防縫隙）
  tasks.push(()=>{pg.noStroke();const c=darken(gCols[0],0.03);pg.fill(c[0],c[1],c[2]);pg.rect(0,horizonY,PW,PH-horizonY+5);});
  // 油畫筆觸：前景寬長、後景窄短，方向近水平帶少許傾斜
  const nStrokes=scene==='night'?1600:2200;
  for(let i=0;i<nStrokes;i++){
    const x=rr(-20,PW+20),y0=rr(horizonY,PH+12);
    const y=y0+terrainOff(x,y0);   // 筆觸貼著地勢
    const depth=Math.max(0,(y0-horizonY)/fieldH);
    const w=Math.max(4,rr(5,9)+depth*11);
    const len=rr(18,44)+depth*30;
    // 筆觸方向順著坡面
    const slope=terrainSlope(x,y0);
    const angle=rr(-0.28,0.28)+Math.atan2(slope,32)*0.6;
    const x2=x+Math.cos(angle)*len,y2=y+Math.sin(angle)*len*0.25+rr(-2,2);
    let col=jitterCol(pick(gCols),0.07);
    if(depth<0.22) col=lighten(col,rr(0.06,0.16));
    if(depth>0.60&&Math.random()<0.20) col=darken(col,rr(0.12,0.28));
    // 坡面明暗：向光坡（左側）亮、背光坡暗
    if(slope<-2) col=lighten(col,Math.min(0.14,-slope*0.008));
    else if(slope>2) col=darken(col,Math.min(0.16,slope*0.008));
    addPaint(x,y,x2,y2,{w,col,bend:rr(-5,5)*depth,shadow:false,flecks:depth>0.50&&Math.random()<0.38});
  }
}
// 遠方丘陵：地平線上緣起伏的淡色稜線（重霧化，融入天際）
function genDistantHills(){
  if(hillAmp<10) return;   // 平原場景不畫
  const hCol=fogMix(sceneColor(hexRGB(pick(GROUND[scene])),scene),horizonY+1);
  for(let x=-20;x<PW+20;x+=9){
    const h=Math.max(0,(noise(x*0.004,hillSeed+55)-0.42))*hillAmp*3.4;
    if(h<3)continue;
    for(let yy=horizonY-h;yy<horizonY+2;yy+=6){
      addPaint(x+rr(-3,3),yy,x+rr(12,22),yy+rr(-2,2),
        {w:rr(6,9),col:jitterCol(hCol,0.05),bend:rr(-2,2),shadow:false,flecks:false,simple:true});
    }
  }
}

function genHorizonHaze(){
  // 大氣透視：用天空底色極淡覆蓋地平線下方地面，不用白色，不畫超過40px
  const skyBotCol=hexRGB(pick(SKY[scene].bot));
  tasks.push(()=>{
    pg.noStroke();
    for(let i=0;i<14;i++){
      const y=horizonY+i*4;
      const a=Math.floor(38*Math.pow(1-i/14,1.6));
      if(a<2)break;
      pg.fill(skyBotCol[0],skyBotCol[1],skyBotCol[2],a);
      pg.rect(0,y,PW,6);
    }
  });
}

// ════════════ 鬱金香（五型，每朵獨特）════════════

// 花型配置：open/halfopen/bud/blown/droop
const PETAL_CFG={
  open:[
    {fx:-0.54,fy:0.11,bm:-0.30,wm:0.70,lm:0.88},
    {fx:-0.25,fy:0.04,bm:-0.14,wm:0.85,lm:0.93},
    {fx: 0.00,fy:0.00,bm: 0.00,wm:0.94,lm:1.00},
    {fx: 0.25,fy:0.04,bm: 0.14,wm:0.85,lm:0.93},
    {fx: 0.54,fy:0.11,bm: 0.30,wm:0.70,lm:0.88},
  ],
  halfopen:[
    {fx:-0.34,fy:0.06,bm:-0.14,wm:0.68,lm:0.85},
    {fx:-0.15,fy:0.02,bm:-0.06,wm:0.82,lm:0.91},
    {fx: 0.00,fy:0.00,bm: 0.00,wm:0.90,lm:1.00},
    {fx: 0.15,fy:0.02,bm: 0.06,wm:0.82,lm:0.91},
    {fx: 0.34,fy:0.06,bm: 0.14,wm:0.68,lm:0.85},
  ],
  bud:[
    {fx:-0.14,fy:0.04,bm:-0.05,wm:0.62,lm:0.82},
    {fx: 0.00,fy:0.00,bm: 0.00,wm:0.80,lm:1.00},
    {fx: 0.14,fy:0.04,bm: 0.05,wm:0.62,lm:0.82},
  ],
  blown:[
    {fx:-0.70,fy:0.18,bm:-0.48,wm:0.60,lm:0.78},
    {fx:-0.40,fy:0.09,bm:-0.24,wm:0.74,lm:0.88},
    {fx:-0.15,fy:0.03,bm:-0.09,wm:0.88,lm:0.95},
    {fx: 0.00,fy:0.00,bm: 0.00,wm:0.96,lm:1.00},
    {fx: 0.15,fy:0.03,bm: 0.09,wm:0.88,lm:0.95},
    {fx: 0.40,fy:0.09,bm: 0.24,wm:0.74,lm:0.88},
    {fx: 0.70,fy:0.18,bm: 0.48,wm:0.60,lm:0.78},
  ],
};

function pickFlowerType(scale){
  if(scale<0.18) return Math.random()<0.55?'open':'halfopen';
  const r=Math.random();
  if(r<0.42) return 'open';
  if(r<0.62) return 'halfopen';
  if(r<0.74) return 'bud';
  if(r<0.87) return 'blown';
  return 'droop';
}

function addTulip(cx,baseY,scale,colorArr,lean){
  if(scale<0.04)return;
  if(Math.random()<0.04) colorArr=TULIP[pick(COLOR_NAMES)];  // 偶有異色株（真實花田常見的混種）
  const type=pickFlowerType(scale);
  const stemH=scale*(type==='bud'?94:type==='blown'?84:88);
  const stemW=Math.max(1.2,scale*5.2);
  const stemTopY=baseY-stemH;
  // 莖自然彎曲
  const stemCurve=rr(-0.12,0.12);
  const leanX=(lean||0)*scale*9+stemCurve*stemH*0.5;
  const topX=cx+leanX;

  // 遠景只畫色塊（帶大氣霧化）
  if(scale<0.11){
    tasks.push(()=>{
      const fc=jitterCol(fogMix(sceneColor(hexRGB(pick(colorArr)),scene),baseY),0.08);
      pg.noStroke();pg.fill(fc[0],fc[1],fc[2],225);
      if(type==='bud') pg.ellipse(topX,stemTopY,scale*13,scale*24);
      else pg.ellipse(topX,stemTopY-scale*8,scale*20,scale*22);
      // 莖色條
      const gc=jitterCol(fogMix(sceneColor(hexRGB(pick(GREENS)),scene),baseY),0.06);
      pg.fill(gc[0],gc[1],gc[2],210);pg.rect(cx-scale*2,stemTopY,scale*4,stemH*0.85);
    });
    return;
  }

  const greenBase=fogMix(sceneColor(hexRGB(pick(GREENS)),scene),baseY);

  // 莖（帶自然彎曲）
  addPaint(cx,baseY,topX,stemTopY+getFlH(type,scale)*0.30,{
    w:stemW,col:jitterCol(greenBase,0.07),profile:'taper',
    bend:stemCurve*stemH*0.25,shadow:false,flecks:false,
  });
  // 伴隨細莖
  if(Math.random()<0.5){
    addPaint(cx+rr(-3,3),baseY,topX+rr(-4,4),stemTopY+getFlH(type,scale)*0.35+rr(-5,5),{
      w:stemW*rr(0.45,0.65),col:jitterCol(lighten(greenBase,0.18),0.07),profile:'taper',shadow:false,flecks:false,
    });
  }

  // 葉子（隨機數量、位置、角度）
  if(scale>0.14){
    const nLeaves=scale>0.55?ri(2,3):scale>0.28?ri(1,2):1;
    for(let l=0;l<nLeaves;l++){
      const side=l===0?(Math.random()<0.5?1:-1):(l%2===1?-1:1);
      const lh=stemH*rr(0.28,0.58);
      const lx=cx+leanX*(lh/stemH);
      const ly=baseY-lh;
      const llen=scale*rr(26,52);
      const langle=rr(0.55,1.15);
      const lw=Math.max(1.4,scale*rr(6.5,9.5));
      const leafCol=jitterCol(sceneColor(hexRGB(pick(GREENS)),scene),0.10);
      addPaint(lx,ly,lx+side*Math.cos(langle)*llen,ly-Math.sin(langle)*llen,{
        w:lw,col:leafCol,bend:side*llen*rr(0.18,0.38),profile:'taper',shadow:false,flecks:false,
      });
    }
  }

  // 花朵
  if(type==='droop') drawTulipDroop(cx,topX,stemTopY,scale,colorArr);
  else drawTulipCup(topX,stemTopY,scale,colorArr,type);
}

function getFlH(type,scale){
  if(type==='bud')  return scale*30;
  if(type==='blown')return scale*46;
  return scale*40;
}

function drawTulipCup(topX,stemTopY,scale,colorArr,type){
  const flH=getFlH(type,scale);
  const flW=scale*(type==='bud'?18:type==='blown'?32:26);
  const cfg=PETAL_CFG[type];
  const flBaseY=stemTopY+flH*0.16;
  const tipY=stemTopY-flH*0.78;

  // 為這朵花隨機選一個主色，中間花瓣可能略不同（增加變化）
  const mainHex=pick(colorArr);
  const accentHex=Math.random()<0.25?pick(colorArr):mainHex; // 偶爾中間花瓣換色

  for(let pi=0;pi<cfg.length;pi++){
    const po=cfg[pi];
    const px1=topX+po.fx*flW*0.5;
    const py1=flBaseY+po.fy*flH;
    const px2=topX+po.fx*flW*0.28;
    const py2=tipY+(1-po.lm)*flH*0.4;
    const pw=Math.max(1.5,flW*po.wm*(0.34+Math.max(0,(1-Math.abs(po.fx)))*0.32));
    // 隨機筆觸顏色——同一朵花的花瓣之間有輕微色差
    const isCenter=pi===Math.floor(cfg.length/2);
    const baseHex=isCenter?accentHex:mainHex;
    let petalCol=fogMix(sceneColor(hexRGB(baseHex),scene),flBaseY);
    if(isCenter) petalCol=lighten(petalCol,rr(0.05,0.15)); // 中間花瓣略亮
    const finalCol=jitterCol(petalCol,0.07+Math.random()*0.04);
    addPaint(px1,py1,px2,py2,{
      w:pw,col:finalCol,
      bend:po.bm*flH*(0.38+Math.random()*0.22),
      profile:'petal',shadow:false,
    });
  }
  // 花杯基部陰影
  if(scale>0.18){
    tasks.push(()=>{
      pg.noStroke();
      const sc=darken(sceneColor(hexRGB(mainHex),scene),0.42);
      pg.fill(sc[0],sc[1],sc[2],185);pg.ellipse(topX,flBaseY+flH*0.08,flW*0.52,flH*0.20);
    });
  }
  // 花心（blown/open 才有）
  if((type==='open'||type==='blown')&&scale>0.30){
    const innerW=flW*(type==='blown'?0.30:0.22);
    const innerCol=darken(sceneColor(hexRGB(mainHex),scene),0.28);
    tasks.push(()=>{pg.noStroke();pg.fill(innerCol[0],innerCol[1],innerCol[2],200);pg.ellipse(topX,flBaseY+flH*0.04,innerW,innerW*0.6);});
  }
}

function drawTulipDroop(cx,topX,stemTopY,scale,colorArr){
  const flH=scale*40,flW=scale*28;
  const faceDir=Math.random()<0.5?1:-1;
  const baseAngle=Math.PI/2+faceDir*rr(0.55,0.95);
  const n=ri(4,6);
  const mainHex=pick(colorArr);
  for(let i=0;i<n;i++){
    const sp=((i+0.5)/n-0.5)*2.2;
    const a=baseAngle+sp*rr(0.85,1.10);
    const len=flH*rr(0.88,1.35)*(1-Math.abs(sp)*0.16);
    const pw=Math.max(1.4,flW*0.33*(1-Math.abs(sp)*0.18));
    const baseCol=fogMix(sceneColor(hexRGB(i===Math.floor(n/2)?mainHex:pick(colorArr)),scene),stemTopY);
    const petalCol=i===Math.floor(n/2)?lighten(jitterCol(baseCol,0.06),0.08):jitterCol(baseCol,0.07);
    addPaint(
      topX+Math.cos(a)*flW*0.14, stemTopY+Math.sin(a)*flH*0.10,
      topX+Math.cos(a)*(flW*0.14+len), stemTopY+Math.sin(a)*flH*0.10+len*rr(0.55,0.85),
      {w:pw,col:petalCol,bend:faceDir*len*rr(0.12,0.28),profile:'petal',shadow:false}
    );
  }
  // 花萼（綠色苞片）
  if(scale>0.22){
    for(let i=0;i<4;i++){
      const a=baseAngle+Math.PI+rr(-0.55,0.55);
      addPaint(topX,stemTopY,topX+Math.cos(a)*flH*rr(0.30,0.52),stemTopY+Math.sin(a)*flH*rr(0.30,0.52),{
        w:Math.max(1.5,scale*5),col:jitterCol(sceneColor(hexRGB(pick(GREENS)),scene),0.08),profile:'taper',shadow:false,flecks:false,
      });
    }
  }
}

// ════════════ 佈局與行列 ════════════

function makeColorBands(){
  const n=ri(6,10);const order=[];let last='';
  for(let i=0;i<n;i++){const f=COLOR_NAMES.filter(c=>c!==last);const c=pick(f);order.push(c);last=c;}
  return order;
}

// 先收集，不直接畫；等排序後再畫（統一套上地形起伏）
function queueTulip(cx,baseY,scale,colorArr,lean){
  tulipQueue.push({cx,baseY:baseY+terrainOff(cx,baseY),scale,colorArr,lean});
}

function genTulips(){
  tulipQueue=[];
  const fieldH=PH-horizonY;
  const bands=makeColorBands();
  if(layoutType==='diagonal')         genDiagonalLayout(bands,fieldH);
  else if(layoutType==='perspective') genPerspectiveLayout(bands,fieldH);
  else                                genHorizontalLayout(bands,fieldH);
  // Painter's Algorithm：baseY 小（遠景）先畫，大（近景）後畫 → 近花自然蓋住遠花
  tulipQueue.sort((a,b)=>a.baseY-b.baseY);
  for(const t of tulipQueue) addTulip(t.cx,t.baseY,t.scale,t.colorArr,t.lean);
}

function genHorizontalLayout(bands,fieldH){
  const n=bands.length;
  const edges=[0];let acc=0;
  for(let i=0;i<n;i++){acc+=Math.pow((i+1)/n,0.68);edges.push(acc);}
  const total=acc;
  for(let b=0;b<n;b++){
    const yTop=horizonY+edges[b]/total*fieldH;
    const yBot=horizonY+edges[b+1]/total*fieldH;
    const colorArr=TULIP[bands[b]];
    genFieldBandColor(yTop,yBot,colorArr);
    // 田壟：中近景花行間隱約的深色土溝（農田感）
    if((yTop-horizonY)/fieldH>0.15){
      const soilBase=darken(mixRGB(hexRGB(pick(GROUND[scene])),[88,64,44],0.45),0.2);
      const nF=ri(1,2);
      for(let f=0;f<nF;f++){
        const fy=rr(yTop,yBot);
        const fPhase=rr(0,Math.PI*2);
        for(let fx=-20;fx<PW+20;fx+=rr(70,130)){
          const y1=fy+Math.sin(fx*0.005+fPhase)*5+terrainOff(fx,fy);
          addPaint(fx,y1,fx+rr(50,100),y1+rr(-3,3)+terrainSlope(fx,fy)*0.4,
            {w:rr(4,7),col:jitterCol(fogMix(soilBase,fy),0.06),bend:rr(-3,3),shadow:false,flecks:false,simple:true});
        }
      }
    }
    const nRows=Math.max(2,Math.min(6,Math.floor((yBot-yTop)/Math.max(1,(yTop-horizonY)/fieldH*scale_at(yTop,fieldH)*42+6))));
    for(let r=0;r<nRows;r++){
      const rowY=yTop+(r+0.5)/nRows*(yBot-yTop)+rr(-4,4);
      const sc=scale_at(rowY,fieldH);
      const spacing=Math.max(5,sc*28);
      const cnt=Math.floor(PW/spacing)+2;
      const off=rr(0,spacing);
      const camberPhase=rr(0,Math.PI*2);
      for(let t=0;t<cnt;t++){
        const px=-spacing+off+t*spacing+rr(-spacing*0.22,spacing*0.22);
        if(noise(px*0.012,rowY*0.012)<0.30)continue;   // 疏密叢聚：花海有自然的稀疏塊
        const py=rowY+Math.sin(px*0.006+camberPhase)*4*sc+rr(-5,5)*sc;  // 行列隨地形微彎
        queueTulip(px,py,sc*rr(0.82,1.18),colorArr,rr(-1,1));
      }
    }
  }
}

function genDiagonalLayout(bands,fieldH){
  const n=bands.length;
  const angle=rr(22,52)*(Math.random()<0.5?1:-1);
  const ar=angle*Math.PI/180;
  const ca=Math.cos(ar),sa=Math.abs(Math.sin(ar));
  const bandW=(PW*sa+fieldH*ca)/n;
  for(let b=0;b<n;b++){
    const colorArr=TULIP[bands[b]];
    const dMin=b*bandW,dMax=(b+1)*bandW;
    genFieldBandColorDiag(colorArr,dMin,bandW,sa,ca);
    // 在帶內系統性放置鬱金香（格點採樣，符合帶範圍才畫）
    const sc0=0.10,step=22;
    for(let tx=-20;tx<PW+20;tx+=step){
      for(let ty=horizonY;ty<PH+20;ty+=step*1.2){
        const d=tx*sa+(ty-horizonY)*ca;
        if(d<dMin||d>=dMax)continue;
        if(noise(tx*0.012,ty*0.012)<0.30)continue;   // 疏密叢聚
        const sc=scale_at(ty,fieldH);
        queueTulip(tx+rr(-step*0.3,step*0.3),ty+rr(-step*0.2,step*0.2),sc*rr(0.82,1.18),colorArr,rr(-1,1));
      }
    }
    // 遠中景補花：上半場加密一輪（小花便宜，直接畫色塊）
    const farLimit=horizonY+fieldH*0.5;
    for(let tx=-20;tx<PW+20;tx+=12){
      for(let ty=horizonY+3;ty<farLimit;ty+=10){
        const d=tx*sa+(ty-horizonY)*ca;
        if(d<dMin||d>=dMax)continue;
        if(Math.random()<0.3)continue;
        if(noise(tx*0.012,ty*0.012)<0.28)continue;
        const sc=scale_at(ty,fieldH);
        queueTulip(tx+rr(-4,4),ty+rr(-3,3),sc*rr(0.85,1.15),colorArr,rr(-1,1));
      }
    }
  }
}

function genPerspectiveLayout(bands,fieldH){
  const n=bands.length;
  const vx=PW*rr(0.42,0.58),vy=horizonY;
  const totalA=Math.PI*0.74,startA=Math.PI/2-totalA/2,bAW=totalA/n;
  for(let b=0;b<n;b++){
    const colorArr=TULIP[bands[b]];
    const aMin=startA+b*bAW,aMax=aMin+bAW;
    // 帶底色
    tasks.push(()=>{
      pg.noStroke();
      const c=darken(sceneColor(hexRGB(pick(GROUND[scene])),scene),0.06);
      pg.fill(c[0],c[1],c[2],170);
      pg.beginShape();pg.vertex(vx,vy);
      const r2=PH*1.6;
      for(let i=0;i<=8;i++){const a=aMin+(aMax-aMin)*(i/8);pg.vertex(vx+Math.cos(a)*r2,vy+Math.sin(a)*r2);}
      pg.endShape(CLOSE);
    });
    // 在帶內放置鬱金香（沿射線方向均勻間距）
    const nCols=ri(5,8);
    for(let c=0;c<nCols;c++){
      const a=aMin+(c+0.5)/nCols*(aMax-aMin)+rr(-bAW*0.08,bAW*0.08);
      let dist=rr(15,45);
      while(dist<PH*1.4){
        const tx=vx+Math.cos(a)*dist,ty=vy+Math.sin(a)*dist;
        if(tx>=-20&&tx<=PW+20&&ty>=horizonY&&ty<=PH+30){
          const sc=scale_at(ty,fieldH);
          queueTulip(tx+rr(-8,8)*sc,ty,sc*rr(0.82,1.18),colorArr,rr(-0.8,0.8));
        }
        dist+=Math.max(10,scale_at(ty,fieldH)*30+rr(-4,4));
      }
    }
    // 遠中景補花：帶內密格掃描，填滿射線之間的縫隙
    const farLimit=horizonY+fieldH*0.55;
    for(let ty=horizonY+3;ty<farLimit;ty+=11){
      const stepX=Math.max(9,scale_at(ty,fieldH)*26);
      for(let tx=-20;tx<PW+20;tx+=stepX){
        const a=Math.atan2(ty-vy,tx-vx);
        if(a<aMin||a>=aMax)continue;
        if(Math.random()<0.25)continue;  // 保留少許自然留白
        if(noise(tx*0.012,ty*0.012)<0.28)continue;   // 疏密叢聚
        const sc=scale_at(ty,fieldH);
        queueTulip(tx+rr(-4,4),ty+rr(-3,3),sc*rr(0.85,1.15),colorArr,rr(-1,1));
      }
    }
  }
}

function scale_at(y,fieldH){
  return Math.min(1.0, 0.08+0.92*Math.pow(Math.max(0,(y-horizonY)/fieldH),0.80));
}

function genFieldBandColor(yTop,yBot,colorArr){
  const gCols=GROUND[scene].map(hexRGB),fCol=hexRGB(pick(colorArr));
  const bCol=mixRGB(sceneColor(fCol,scene),pick(gCols),0.35);   // 以花色為主的地毯底
  const fieldH=PH-horizonY;
  const n=Math.max(12,Math.ceil((yBot-yTop)/13)*3);
  for(let s=0;s<n;s++){
    const sy0=rr(yTop,yBot),sx=rr(-15,PW+15);
    const sy=sy0+terrainOff(sx,sy0);
    const depth=Math.max(0,(sy0-horizonY)/fieldH);
    const len=rr(28,80)+depth*20;
    const w=Math.max(4,rr(5,9)+depth*6);
    let col=jitterCol(mixRGB(bCol,sceneColor(hexRGB(pick(GREENS)),scene),rr(0.15,0.45)),0.07);
    col=fogMix(col,sy0);
    const slope=terrainSlope(sx,sy0);
    if(slope<-2) col=lighten(col,Math.min(0.12,-slope*0.007));
    else if(slope>2) col=darken(col,Math.min(0.14,slope*0.007));
    addPaint(sx,sy,sx+len,sy+rr(-4,4)+terrainSlope(sx,sy0)*0.4,{w,col,bend:rr(-5,5),shadow:false,flecks:false});
  }
}
function genFieldBandColorDiag(colorArr,dMin,bandW,sa,ca){
  const col=sceneColor(hexRGB(pick(colorArr)),scene),mix=mixRGB(col,hexRGB(pick(GROUND[scene])),0.4);
  const fieldH=PH-horizonY;
  for(let s=0;s<60;s++){
    const tx=rr(-10,PW+10),ty=rr(horizonY,PH);
    const d=tx*sa+(ty-horizonY)*ca;
    if(d<dMin||d>=dMin+bandW)continue;
    const depth=Math.max(0,(ty-horizonY)/fieldH);
    const jc=fogMix(jitterCol(mix,0.08),ty);
    const len=rr(25,65)+depth*15;
    const w=Math.max(4,rr(5,9)+depth*5);
    const tyT=ty+terrainOff(tx,ty);
    addPaint(tx,tyT,tx+len,tyT+rr(-3,3),{w,col:jc,bend:rr(-4,4),shadow:false,flecks:false});
  }
}

// ════════════ 雨與顆粒 ════════════

function genRain(){
  if(scene!=='rainy')return;
  tasks.push(()=>{
    pg.noFill();
    for(let i=0;i<ri(1200,1900);i++){
      const rx=rr(0,PW),ry=rr(0,PH),rlen=rr(12,28),a=Math.floor(rr(38,105));
      pg.stroke(200,215,232,a);pg.strokeWeight(rr(0.35,0.85));
      pg.line(rx,ry,rx-rlen*0.18,ry+rlen);
    }
    pg.noStroke();
  });
}
function genGrain(){
  tasks.push(()=>{
    pg.noStroke();const n=Math.floor(PW*PH*0.0034);
    for(let i=0;i<n;i++){
      const gx=Math.random()*PW,gy=Math.random()*PH,t=(Math.random()-0.5)*38;
      pg.fill(clamp255(128+t),clamp255(122+t),clamp255(108+t),8);pg.rect(gx,gy,rr(1,2.1),rr(1,2.1));
    }
  });
}

// ════════════ 場景生成 ════════════

const SCENE_NAMES=['sunny','cloudy','rainy','night'];

function generateScene(){
  tasks=[];taskIdx=0;finished=false;
  scene=SCENE_NAMES[Math.floor(Math.random()*SCENE_NAMES.length)];
  layoutType=['horizontal','horizontal','diagonal','perspective'][Math.floor(Math.random()*4)];
  horizonY=PH*rr(0.48,0.56);
  noiseSeed(Math.floor(Math.random()*1e9));
  // 地勢：25% 近乎平原，其餘緩坡到明顯丘陵
  hillSeed=rr(0,1000);
  hillAmp=Math.random()<0.25?rr(3,8):rr(14,38);
  setupSkyVortices();    // 漩渦先建立，供 underpaint + genSky 共用
  pg.background(8,10,6);
  genUnderpaint();       // 密格底層，保證整個畫面被覆蓋
  genSky();
  genDistantHills();     // 地平線上緣的丘陵稜線
  genGround();
  genHorizonHaze();
  genTulips();
  genRain();
  genGrain();
  perFrame=Math.ceil(tasks.length/220);
}

// ════════════ p5 主流程 ════════════

function setup(){
  const ratio=PW/PH;
  let dw=Math.min(windowWidth*0.92,windowHeight*0.92*ratio);
  createCanvas(dw,dw/ratio);
  pg=createGraphics(PW,PH);
  generateScene();
}
function draw(){
  if(!finished){
    const end=Math.min(tasks.length,taskIdx+perFrame);
    for(;taskIdx<end;taskIdx++)tasks[taskIdx]();
    if(taskIdx>=tasks.length)finished=true;
  }
  image(pg,0,0,width,height);
  if(finished)noLoop();
}
function windowResized(){
  const ratio=PW/PH;let dw=Math.min(windowWidth*0.92,windowHeight*0.92*ratio);
  resizeCanvas(dw,dw/ratio);image(pg,0,0,width,height);
}
function mousePressed(){loop();pg.clear();generateScene();}
function keyPressed(){
  if(key==='s'||key==='S'){save(pg,'tulips-'+Date.now(),'png');return false;}
  if(key==='r'||key==='R'){loop();pg.clear();generateScene();}
}
