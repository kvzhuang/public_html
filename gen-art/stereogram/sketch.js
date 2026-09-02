// ==========================================
// Stereogram 立體視覺圖 — Generative Art
// 隱藏式 3D 圖（Autostereogram / Magic Eye）
// 演算法：Thimbleby–Inglis–Witten 像素連結法
//   + 隱藏面檢查 + 紋理條帶 / 亂點著色
// 觀看：平行眼讓上方兩點融合成三點
// ==========================================

const PW = 1200, PH = 800;
const E  = 240;        // 眼距（像素），遠平面視差 = E/2 = 120px
const MU = 1/3;        // 深度縮放係數

let canvas, ctx;
let baseImage = null;      // 完成的立體圖（供答案覆蓋重繪）
let answer = '', styleName = '', showAnswer = false;

const rr   = (a,b)=>a+Math.random()*(b-a);
const ri   = (a,b)=>Math.floor(rr(a,b+1));
const pick = a=>a[Math.floor(Math.random()*a.length)];

function sep(z){ return Math.round((1-MU*z)*E/(2-MU*z)); }
const SEP_FAR = Math.round((1)*E/2);   // sep(0)=E/2

// ── 小型 value noise（免依賴 p5）──
function makeValueNoise(seed){
  const rand2=(ix,iy)=>{
    const s=Math.sin(ix*127.1+iy*311.7+seed*74.7)*43758.5453;
    return s-Math.floor(s);
  };
  return function(x,y){
    const ix=Math.floor(x),iy=Math.floor(y);
    const fx=x-ix,fy=y-iy;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const a=rand2(ix,iy),b=rand2(ix+1,iy),c=rand2(ix,iy+1),d=rand2(ix+1,iy+1);
    return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;
  };
}

function hslRGB(h,s,l){
  h=((h%360)+360)%360/360;
  const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  const f=t=>{
    t=((t%1)+1)%1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  return [Math.round(f(h+1/3)*255),Math.round(f(h)*255),Math.round(f(h-1/3)*255)];
}

// ════════════ 深度圖（0=最遠, 1=最近）════════════

function newZ(){ return new Float32Array(PW*PH); }

function zSpheres(){
  const Z=newZ();
  const n=ri(1,4);
  for(let s=0;s<n;s++){
    const cx=rr(PW*0.2,PW*0.8), cy=rr(PH*0.25,PH*0.75);
    const R=rr(90,220), zTop=rr(0.45,0.7);
    for(let y=Math.max(0,Math.floor(cy-R));y<Math.min(PH,cy+R);y++){
      for(let x=Math.max(0,Math.floor(cx-R));x<Math.min(PW,cx+R);x++){
        const d=Math.hypot(x-cx,y-cy);
        if(d<R){
          const z=Math.sqrt(1-(d/R)*(d/R))*zTop;
          const i=y*PW+x;
          if(z>Z[i])Z[i]=z;
        }
      }
    }
  }
  return [Z, n===1?'球體':`${n} 顆球體`];
}

function zTorus(){
  const Z=newZ();
  const cx=PW/2+rr(-60,60), cy=PH/2+rr(-40,40);
  const R1=rr(180,260), R2=rr(60,100), zTop=rr(0.5,0.68);
  for(let y=0;y<PH;y++){
    for(let x=0;x<PW;x++){
      const d=Math.hypot(x-cx,y-cy);
      const dd=Math.abs(d-R1);
      if(dd<R2){
        Z[y*PW+x]=Math.sqrt(1-(dd/R2)*(dd/R2))*zTop;
      }
    }
  }
  return [Z,'甜甜圈'];
}

function zWaves(){
  const Z=newZ();
  const f1=rr(0.008,0.016), f2=rr(0.008,0.016), p1=rr(0,6), p2=rr(0,6);
  const zTop=rr(0.45,0.6);
  for(let y=0;y<PH;y++){
    for(let x=0;x<PW;x++){
      Z[y*PW+x]=(Math.sin(x*f1+p1)*Math.cos(y*f2+p2)*0.5+0.5)*zTop;
    }
  }
  return [Z,'波浪曲面'];
}

function zRipples(){
  const Z=newZ();
  const cx=PW/2+rr(-100,100), cy=PH/2+rr(-60,60);
  const k=rr(0.03,0.05), decay=rr(350,550), zTop=rr(0.5,0.65);
  for(let y=0;y<PH;y++){
    for(let x=0;x<PW;x++){
      const r=Math.hypot(x-cx,y-cy);
      Z[y*PW+x]=(Math.sin(r*k)*Math.exp(-r/decay)*0.5+0.5)*zTop;
    }
  }
  return [Z,'水面漣漪'];
}

function zPyramid(){
  const Z=newZ();
  const n=ri(1,2);
  for(let p=0;p<n;p++){
    const cx=n===1?PW/2:PW*(0.3+p*0.4), cy=PH/2+rr(-40,40);
    const W2=rr(180,300), H2=rr(140,220), zTop=rr(0.5,0.68);
    for(let y=Math.max(0,Math.floor(cy-H2));y<Math.min(PH,cy+H2);y++){
      for(let x=Math.max(0,Math.floor(cx-W2));x<Math.min(PW,cx+W2);x++){
        const z=(1-Math.max(Math.abs(x-cx)/W2,Math.abs(y-cy)/H2))*zTop;
        const i=y*PW+x;
        if(z>Z[i])Z[i]=z;
      }
    }
  }
  return [Z, n===1?'金字塔':'雙金字塔'];
}

function zTerrain(){
  const Z=newZ();
  const n1=makeValueNoise(rr(0,100)), n2=makeValueNoise(rr(100,200));
  const zTop=rr(0.5,0.65);
  for(let y=0;y<PH;y++){
    for(let x=0;x<PW;x++){
      const v=n1(x*0.004,y*0.004)*0.65+n2(x*0.012,y*0.012)*0.35;
      Z[y*PW+x]=Math.pow(v,1.3)*zTop;
    }
  }
  return [Z,'山丘地形'];
}

function zBoxes(){
  const Z=newZ();
  const n=ri(3,6);
  for(let b=0;b<n;b++){
    const w=rr(100,260), h=rr(80,200);
    const x0=rr(PW*0.05,PW*0.95-w), y0=rr(PH*0.08,PH*0.92-h);
    const z=rr(0.25,0.65);
    for(let y=Math.floor(y0);y<y0+h;y++){
      for(let x=Math.floor(x0);x<x0+w;x++){
        const i=y*PW+x;
        if(z>Z[i])Z[i]=z;
      }
    }
  }
  return [Z,'浮空方塊'];
}

// canvas 路徑形狀 → 深度（模糊邊緣＝深度斜坡）
function shapeDepth(drawFn, zMax){
  const oc=document.createElement('canvas');
  oc.width=PW; oc.height=PH;
  const c2=oc.getContext('2d');
  c2.fillStyle='#000'; c2.fillRect(0,0,PW,PH);
  c2.fillStyle='#fff';
  c2.filter='blur(14px)';
  drawFn(c2);
  c2.filter='none';
  drawFn(c2);
  const img=c2.getImageData(0,0,PW,PH).data;
  const Z=newZ();
  for(let i=0;i<PW*PH;i++) Z[i]=img[i*4]/255*zMax;
  return Z;
}

function zHeart(){
  const s=rr(14,20);
  const Z=shapeDepth(c2=>{
    c2.save();
    c2.translate(PW/2,PH/2+s*2);
    c2.scale(s,-s);
    c2.beginPath();
    for(let t=0;t<=Math.PI*2+0.05;t+=0.05){
      const hx=16*Math.pow(Math.sin(t),3);
      const hy=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
      if(t===0)c2.moveTo(hx,hy);else c2.lineTo(hx,hy);
    }
    c2.closePath(); c2.fill();
    c2.restore();
  }, rr(0.5,0.68));
  return [Z,'愛心'];
}

function zStar(){
  const R=rr(200,280), r2=R*rr(0.38,0.5), n=pick([5,6]);
  const Z=shapeDepth(c2=>{
    c2.save();
    c2.translate(PW/2,PH/2);
    c2.rotate(rr(0,Math.PI));
    c2.beginPath();
    for(let i=0;i<n*2;i++){
      const a=(i/(n*2))*Math.PI*2-Math.PI/2;
      const rad=i%2===0?R:r2;
      const px=Math.cos(a)*rad, py=Math.sin(a)*rad;
      if(i===0)c2.moveTo(px,py);else c2.lineTo(px,py);
    }
    c2.closePath(); c2.fill();
    c2.restore();
  }, rr(0.5,0.68));
  return [Z, n===5?'五角星':'六角星'];
}

function zText(){
  const word=pick(['3D','LOVE','熊','夢','花','LUCK','雲','山']);
  const Z=shapeDepth(c2=>{
    c2.font=`900 ${word.length>2?300:word.length>1?380:520}px "Noto Sans TC", sans-serif`;
    c2.textAlign='center'; c2.textBaseline='middle';
    c2.fillText(word,PW/2,PH/2+20);
  }, rr(0.52,0.68));
  return [Z,`文字「${word}」`];
}

const SHAPES=[zSpheres,zTorus,zWaves,zRipples,zPyramid,zTerrain,zBoxes,zHeart,zStar,zText];

// ════════════ 紋理條帶 ════════════

function makeStrip(style){
  const W=SEP_FAR;
  const strip=new Uint8ClampedArray(W*PH*3);
  if(style==='織紋'){
    const n1=makeValueNoise(rr(0,100)), n2=makeValueNoise(rr(100,200));
    const baseH=rr(0,360);
    for(let y=0;y<PH;y++){
      for(let x=0;x<W;x++){
        const v=n1(x*0.045,y*0.045)*0.6+n2(x*0.16,y*0.16)*0.4;
        const rgb=hslRGB(baseH+v*140, 0.5+n2(x*0.08,y*0.08)*0.4, 0.3+v*0.45);
        const i=(y*W+x)*3;
        strip[i]=rgb[0];strip[i+1]=rgb[1];strip[i+2]=rgb[2];
      }
    }
  } else {  // 斜紋
    const baseH=rr(0,360);
    const nPal=ri(4,7);
    const pal=[];
    for(let i=0;i<nPal;i++)pal.push(hslRGB(baseH+i*rr(30,55),rr(0.5,0.85),rr(0.35,0.7)));
    const nj=makeValueNoise(rr(0,50));
    const slope=rr(0.4,1.2)*(Math.random()<0.5?1:-1);
    const bandW=rr(9,13);
    for(let y=0;y<PH;y++){
      for(let x=0;x<W;x++){
        const band=Math.floor((x+y*slope)/bandW+nj(x*0.1,y*0.1)*2.2);
        const c=pal[((band%nPal)+nPal)%nPal];
        const j=(Math.random()-0.5)*36;
        const i=(y*W+x)*3;
        strip[i]=Math.max(0,Math.min(255,c[0]+j));
        strip[i+1]=Math.max(0,Math.min(255,c[1]+j));
        strip[i+2]=Math.max(0,Math.min(255,c[2]+j));
      }
    }
  }
  return strip;
}

// ════════════ 立體圖核心 ════════════

function renderStereogram(Z, style){
  const img=ctx.createImageData(PW,PH);
  const data=img.data;
  const useStrip=(style==='織紋'||style==='斜紋');
  const strip=useStrip?makeStrip(style):null;
  const W=SEP_FAR;
  const baseH=rr(0,360);   // 彩點用

  const rowR=new Uint8ClampedArray(PW),
        rowG=new Uint8ClampedArray(PW),
        rowB=new Uint8ClampedArray(PW);

  for(let y=0;y<PH;y++){
    const same=new Int32Array(PW);
    for(let x=0;x<PW;x++)same[x]=x;

    for(let x=0;x<PW;x++){
      const z=Z[y*PW+x];
      const s=sep(z);
      let left=x-(s>>1), right=left+s;
      if(left>=0&&right<PW){
        // 隱藏面檢查
        let visible=true,t=1,zt;
        do{
          zt=z+2*(2-MU*z)*t/(MU*E);
          const xl=x-t,xr=x+t;
          visible=(xl<0||Z[y*PW+xl]<zt)&&(xr>=PW||Z[y*PW+xr]<zt);
          t++;
        }while(visible&&zt<1);
        if(visible){
          let l=same[left];
          while(l!==left&&l!==right){
            if(l<right){left=l;l=same[left];}
            else{same[left]=right;left=right;right=l;l=same[left];}
          }
          same[left]=right;
        }
      }
    }

    for(let x=PW-1;x>=0;x--){
      if(same[x]===x){
        if(style==='彩色亂點'){
          const c=hslRGB(baseH+rr(-40,40)+Math.random()*80,rr(0.5,0.9),rr(0.25,0.75));
          rowR[x]=c[0];rowG[x]=c[1];rowB[x]=c[2];
        } else if(style==='黑白亂點'){
          const v=Math.random()<0.5?18:235;
          rowR[x]=v;rowG[x]=v;rowB[x]=v;
        } else {
          const i=(y*W+(x%W))*3;
          rowR[x]=strip[i];rowG[x]=strip[i+1];rowB[x]=strip[i+2];
        }
      } else {
        rowR[x]=rowR[same[x]];rowG[x]=rowG[same[x]];rowB[x]=rowB[same[x]];
      }
      const di=(y*PW+x)*4;
      data[di]=rowR[x];data[di+1]=rowG[x];data[di+2]=rowB[x];data[di+3]=255;
    }
  }
  ctx.putImageData(img,0,0);

  // 觀看輔助點：間距 = 遠平面視差，融合成三點即成功
  const gy=26, half=SEP_FAR/2;
  ctx.fillStyle='rgba(0,0,0,0.75)';
  ctx.beginPath();ctx.arc(PW/2-half,gy,8,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(PW/2+half,gy,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.92)';
  ctx.beginPath();ctx.arc(PW/2-half,gy,5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(PW/2+half,gy,5,0,Math.PI*2);ctx.fill();

  baseImage=ctx.getImageData(0,0,PW,PH);
}

function drawAnswer(){
  if(!baseImage)return;
  ctx.putImageData(baseImage,0,0);
  if(showAnswer){
    ctx.font='bold 26px "Noto Sans TC", sans-serif';
    const label=`隱藏圖案：${answer}　紋理：${styleName}`;
    const tw=ctx.measureText(label).width;
    ctx.fillStyle='rgba(0,0,0,0.72)';
    ctx.fillRect(PW/2-tw/2-18,PH-64,tw+36,44);
    ctx.fillStyle='#fff';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(label,PW/2,PH-42);
  }
}

// ════════════ 主流程 ════════════

function generate(){
  showAnswer=false;
  const [Z,name]=pick(SHAPES)();
  answer=name;
  styleName=pick(['彩色亂點','黑白亂點','織紋','斜紋']);
  renderStereogram(Z,styleName);
  console.log('隱藏圖案：',answer,'| 紋理：',styleName);
}

function fitCanvas(){
  const ratio=PW/PH;
  const dw=Math.min(window.innerWidth*0.92,window.innerHeight*0.92*ratio);
  canvas.style.width=dw+'px';
  canvas.style.height=(dw/ratio)+'px';
}

function init(){
  canvas=document.createElement('canvas');
  canvas.width=PW;canvas.height=PH;
  document.getElementById('holder').appendChild(canvas);
  ctx=canvas.getContext('2d');
  fitCanvas();
  generate();

  canvas.addEventListener('click',generate);
  window.addEventListener('resize',fitCanvas);
  window.addEventListener('keydown',e=>{
    if(e.key==='s'||e.key==='S'){
      const a=document.createElement('a');
      a.download='stereogram-'+Date.now()+'.png';
      a.href=canvas.toDataURL('image/png');
      a.click();
      e.preventDefault();
    }
    if(e.key==='r'||e.key==='R')generate();
    if(e.key==='a'||e.key==='A'){
      showAnswer=!showAnswer;
      drawAnswer();
    }
  });
}

// 此腳本為動態載入，執行時 DOMContentLoaded 可能已觸發
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
} else {
  init();
}
